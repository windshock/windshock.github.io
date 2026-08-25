---
title: "레이스 컨디션(TOCTOU) 대응: 실제 스택에서 어떤 방법이 효과가 있었나"
date: 2026-08-25
draft: false
featured: true
tags: ["Code", "레이스컨디션", "TOCTOU", "동시성", "데이터베이스", "Spring"]
categories: ["보안 연구", "백엔드"]
description: "구매 횟수 제한 우회, 1회뿐인 뽑기 기회의 중복 소비, 쿠폰 취소 중복 처리, 일일 리워드 한도 초과처럼 같은 check-then-act 레이스가 여러 서비스에서 반복된다. nginx + Tomcat×2 + 공유 Postgres + Redis로 실제와 비슷한 스택을 구성해 어떤 대응이 효과가 있는지 실측했다. 대부분의 단일 DB 한도 문제는 Redis 락 없이도 DB 조건부 UPDATE와 affected rows 확인만으로 막을 수 있었다."
image: "/images/post/race-condition-toctou-mitigation/cover.webp"
cover:
  image: "/images/post/race-condition-toctou-mitigation/cover.webp"
  alt: "TOCTOU 레이스 발생 구조: 여러 동시 요청이 같은 이전 상태를 읽고 모두 CHECK를 통과한다"
---

서비스는 달라도 같은 유형의 결함이 반복해서 발견된다.

- 사용자별 구매 횟수 제한 우회
- 1회뿐인 뽑기 기회를 여러 요청이 동시에 소비
- 쿠폰 취소 요청 중복 처리
- 일일 응모권 발급 한도 초과
- 일일 포인트 리워드 횟수 초과

원인은 모두 비슷하다. "현재 상태 조회 → 제한 CHECK → 업무 처리 → 상태 UPDATE"가 **하나의 원자적 동작으로
묶여 있지 않기 때문에**, 같은 사용자에게 여러 요청이 동시에 들어오면 각 요청이 같은 이전 상태를 읽고 모두
CHECK를 통과할 수 있다.

```java
int count = repository.getTodayCount(memberId);
if (count < limit) {              // A, B, C 모두 count = 4, limit = 5 를 읽음
    rewardService.givePoint(memberId);
    repository.insertHistory(memberId);   // → 5회 제한인데 7회 처리
}
```

보안팀에서 가장 간단하게 요구하려면 "전부 Redis 분산 락을 거세요"라고 할 수 있다. 하지만 그렇게 하면 모든
팀이 Redis 의존성, lock timeout, 락 소유권 관리, fail-open/fail-close 정책, 다중 인스턴스 환경, 추가 코드
복잡도를 함께 떠안아야 한다. 따라서 특정 구현을 일괄 강제하기보다, 보안 요구사항 자체를 다음처럼 정의하는 편이
낫다.

> **동시 요청이 들어와도 횟수·기회·포인트 등의 한도가 초과되지 않도록 원자성을 보장한다.** 가능하면
> DB 자체의 원자적 처리를 우선한다.

이를 실행 가능한 랩으로 만들고, nginx 뒤에 Tomcat 2대가 라운드로빈으로 동작하며 Postgres와 Redis를 공유하는
현실적인 토폴로지에서 각 대응이 실제로 레이스를 막는지 **실측**했다. 아래 결과는 모두 이 랩에서 직접 확인한
내용이다.

**저장소(코드 + 재현 랩):** <https://github.com/windshock/race-condition-lab>

먼저 한 장으로 요약하고, 뒤에서 세부 내용을 설명한다.

[![레이스 컨디션 대응 가이드 한 장 요약](/images/post/race-condition-toctou-mitigation/overview.webp)](/images/post/race-condition-toctou-mitigation/overview.webp)

*전체 요약: TOCTOU가 어떻게 발생하는지, 실제 스택 테스트에서 무엇을 확인했는지, 상황별 대응을 어떻게 고를지, 조건부 UPDATE가 왜 효과가 있는지, DB 밖의 부수효과는 어떻게 다뤄야 하는지를 한 장에 정리했다.*

---

## 직접 재현하기

아래 결과는 모두 실측이며, 다음처럼 처음부터 끝까지 그대로 재현할 수 있다.

```bash
git clone https://github.com/windshock/race-condition-lab
cd race-condition-lab/realstack
./run_all.sh 20   # 스택 기동 + 두 시나리오 × 전 모드 A/B + PASS/FAIL (완화 모드 누수 시 exit 1)
```

- **전체 가이드(영문/한글)**와 전체 코드: <https://github.com/windshock/race-condition-lab>
- 취약 코어와 완화 모드: `realstack/app/src/main/java/com/example/claim/ClaimTxService.java`
- 모드 라우팅과 트랜잭션 밖 예외 변환: `.../ClaimService.java`

비교를 위해 랩에는 취약 모드와 비원자 락 모드를 의도적으로 남겨두었다. 실제 스택에서 레이스가 발생하는 모습과,
이후 DB 네이티브 수정으로 차단되는 모습을 Redis 락 없이 직접 확인할 수 있다.

---

## 용어 정리

본문에 나오는 주요 용어를 짧게 정리한다.

- **TOCTOU (Time-of-Check to Time-of-Use)** — 값을 *확인한(check)* 시점과 실제로 *사용하는(use)* 시점이
  벌어져, 그 사이에 상태가 바뀌면서 생기는 결함.
- **레이스 윈도우(race window)** — 확인과 변경 사이의 짧은 시간 구간. 이 사이에 다른 요청이 끼어들면 레이스가
  발생한다.
- **원자성(atomicity)** — 여러 단계를 "전부 되거나 전부 안 되게" 묶어, 중간 상태가 밖에서 보이지 않도록 하는
  성질.
- **불변식(invariant)** — 어떤 동시 상황에서도 항상 참이어야 하는 규칙(예: "발급은 1회", "카운터는 음수가 될
  수 없다").
- **CAS (Compare-And-Set)** — "값이 아직 X일 때만 Y로 바꾼다"를 하나의 원자적 연산으로 수행하는 방식. DB에서는
  조건부 UPDATE(`... WHERE used = false`)가 곧 CAS다.
- **affected rows** — UPDATE로 실제 변경된 행 수. 조건부 UPDATE에서 `1`이면 내가 성공한 것이고, `0`이면 이미
  다른 요청이 처리한 것이다.
- **UPSERT / `ON CONFLICT`** — 없으면 INSERT, 이미 있으면 무시하거나 갱신하는 처리를 한 문장으로 원자적으로
  수행하는 구문. 중복 삽입 방지에 쓴다.
- **`SELECT … FOR UPDATE`** — 조회하면서 그 행에 쓰기 잠금을 거는 비관적 잠금. 같은 행을 다루려는 다른
  트랜잭션은 대기한다.
- **멱등키(idempotency key)** — 같은 키로 온 요청은 한 번만 효과가 나도록 하는 식별자. 재시도가 있어도 이중
  지급을 막는다.
- **Outbox 패턴** — DB 변경과 "보낼 메시지"를 *같은 트랜잭션*에 함께 저장하고, 별도 워커가 나중에 전송해 커밋과
  메시지 발행이 어긋나는 문제(dual-write)를 막는 방법.
- **사가(saga) / 보상 트랜잭션(compensating transaction)** — 하나의 큰 작업을 여러 단계로 나눠 진행하다 중간에
  실패하면, 앞서 끝낸 단계를 되돌리는 "보상" 작업으로 전체 정합성을 맞추는 분산 트랜잭션 방식. 여러 서비스·DB에
  걸쳐 하나의 트랜잭션으로 묶을 수 없을 때 쓴다.
- **Redlock** — Redis 기반 분산 락 알고리즘. 락의 획득과 해제를 원자적으로 다뤄야 안전하다.
- **READ COMMITTED** — 커밋된 데이터만 읽는 기본 격리 수준. 이 수준에서도 UPDATE는 실행 시점의 최신 커밋
  상태를 다시 읽어 WHERE 조건을 재평가한다.
- **concurrency guard** — "동일 사용자 + 동일 객체는 동시에 하나만 처리"처럼 동시 처리 개수를 제한하는 보완
  통제.

---

## 0. 랩에서 확인한 것과, 랩 밖의 권고

먼저 실측으로 확인한 범위와 아키텍처 차원의 권고를 분리한다. 이 경계를 섞으면 랩의 결과를 실제 서비스 전체에
과도하게 일반화할 수 있다.

| 구분 | 내용 |
|---|---|
| **랩에서 실측으로 확인** | 단일 DB 안의 한도(발급권 1개 / 일일 카운터 1회)는 조건부 UPDATE·`FOR UPDATE`·UNIQUE를 적용했을 때 동시 요청 20건에서도 **정확히 1건만** 통과했다. JVM-local 락은 인스턴스 수만큼 추가 요청이 통과했고, 비원자 Redis 락도 한도를 지키지 못했다. |
| **랩 범위 밖의 권고** | 부수효과가 **DB 밖**에 있는 경우(외부 포인트 지급·결제·쿠폰 취소)의 정합성은 이 랩만으로 검증할 수 없다. 단일 DB 트랜잭션만으로 해결할 수 있는 문제도 아니므로 예약·멱등키·outbox·보상 트랜잭션 같은 **아키텍처**로 다뤄야 한다(6번). |

즉, "조건부 UPDATE가 레이스를 막는다"는 결론은 **DB 내부 상태**에 대한 것이다. 반면 "포인트가 정확히 한 번만
지급된다"는 문제는 **분산 시스템 설계**의 영역이다. 두 문제를 같은 수준에서 다루면 안 된다.

---

## 1. TOCTOU 레이스는 어떻게 발생하는가

여러 요청이 동시에 처리되면, 아직 어느 요청도 UPDATE를 끝내기 전에 각 요청이 같은 상태를 읽을 수 있다.
READ/CHECK와 UPDATE 사이의 이 구간이 **레이스 윈도우**다. 위 대표 이미지처럼 세 요청이 같은 이전 상태를 읽고
모두 CHECK를 통과하는 식이다.

전형적인 취약 패턴은 `read → check → work → update`다. 이 단계들이 하나의 원자적 연산으로 묶여 있지 않으면
레이스가 생긴다. 대량 요청도 **필요 없다**. 동시 요청 2~3건만으로도 충분히 발생할 수 있다. HTTP
`Transfer-Encoding: chunked`나 [HTTP/2 단일 패킷](https://portswigger.net/research/smashing-the-state-machine)을
이용해 요청 완료 시점을 매우 가깝게 맞추면 재현성은 크게 높아진다. 다만 `chunked` 자체는 정상적인 HTTP 기능이며,
이를 차단하는 것은 근본적인 대응이 아니다.

### 여담: `chunked`는 공격자만의 기술이 아니다 — 프레임워크가 기본으로 만든다

`chunked`를 "공격 기법"으로만 보기 쉽지만, 사실은 최신 프레임워크가 **기본값으로** 만들어내는 정상 트래픽이다.
Spring Framework 6.1은 `RestClient`/`RestTemplate`의 **메모리 사용을 줄이기 위해** 대부분의
`ClientHttpRequestFactory`가 요청 본문을 통째로 버퍼링하지 않도록 바꿨다
([이슈 #30557](https://github.com/spring-projects/spring-framework/issues/30557)). 예전에는 이렇게 동작했다.

```text
Java 객체 → ByteArrayOutputStream에 전체 body 생성 → byte[] → HTTP 클라이언트 → 소켓
```

전체 body를 메모리에 들고 있어야 길이를 알 수 있었고, 그래서 `Content-Length`를 붙일 수 있었다. 6.1부터는
직렬화하면서 곧바로 네트워크 스트림에 쓰기 때문에, JSON처럼 크기를 미리 알 수 없는 콘텐츠는 `Content-Length`
없이 `chunked`로 나간다
([6.1 릴리스 노트](https://github.com/spring-projects/spring-framework/wiki/Spring-Framework-6.1-Release-Notes)).

즉 트레이드오프는 "길이 계산을 포기했다"가 아니라 **"길이를 알려고 body 전체를 먼저 메모리에 만들어 두는
과정을 포기했다"**이다. 340바이트 요청 하나만 보면 메모리 절약은 무의미하지만, 같은 API가 340B부터 300MB까지
모두 처리해야 하므로 프레임워크는 작은 요청을 특별 취급하지 않고 streaming-first를 택했다. `Content-Length`
소실과 `chunked`는 그 설계의 부작용이다.

여기서 두 가지가 중요하다.

- 이건 Spring의 **클라이언트(아웃바운드)** 동작이다. 그래서 "Spring 앱이 자동으로 레이스에 취약해진다"가 아니라,
  **`chunked`가 개발자가 의식하지 않아도 자연스럽게 생기는 정상 트래픽**이라는 뜻이다. 그러니 nginx·WAF·IDS가
  `chunked`를 이상 트래픽으로 취급하거나 `Content-Length`를 전제하면 오히려 오작동한다. 다시 말하지만
  **`chunked`를 막는 것은 근본 대응이 아니다.**
- 다만 프레임워크의 평범한 `chunked` 스트리밍이 곧 공격자의 last-byte/single-packet 동기화는 아니다. 공격자는
  *마지막 바이트/프레임을 일부러 보류*해 레이스 윈도우를 좁힌다. 두 경우의 진짜 공통점은 다른 데 있다 —
  **개발자가 의식하지 않은 저수준 구현 선택이 와이어 레벨 동작을 만든다.** 이건 이 글의 주제, 즉 개발자가
  의식하지 않는 사이에 생기는 TOCTOU 윈도우와 정확히 같은 구조다.

---

## 2. 실제 스택 테스트 결과 (동시 요청 20건)

두 시나리오를 각 모드에서 A/B로 실행하고, 2개 WAS가 함께 사용하는 Postgres의 `grant_log`/`quota` 값을 기준으로
결과를 집계했다.

[![실측 결과: 동시 20요청에서 어떤 대응이 버텼나](/images/post/race-condition-toctou-mitigation/measured-results.webp)](/images/post/race-condition-toctou-mitigation/measured-results.webp)

*실제 스택에서 측정한 결과다. DB 조건부 UPDATE와 `FOR UPDATE`는 레이스를 막았고, UNIQUE는 중복 키 형태의 문제에는 효과가 있었지만 자유 카운터의 일반적인 해법은 아니었다.*

**[A] 발급권(기회) 1개 한도** — 불변식: `granted == 1`

| 모드 | HTTP/1.1 라스트바이트 | HTTP/2 단일패킷 | 판정 |
|---|---|---|---|
| `none` (락 없음, 운영 코드) | 16/20 | **20/20** | ⚠ 레이스 |
| `local` (JVM 락) | 2/20 | 2/20 | ⚠ 인스턴스 수만큼 누수 |
| `distributed-naive` (비원자 락) | 20/20 | 9/20 | ⚠ 여전히 누수 |
| `distributed` (Redisson RLock) | 1/20 | 1/20 | ✅ 차단 |
| **`db-conditional`** (조건부 UPDATE) | **1/20** | **1/20** | ✅ 차단 |
| **`db-for-update`** (`SELECT … FOR UPDATE`) | **1/20** | **1/20** | ✅ 차단 |
| **`db-unique`** (UNIQUE 안전망) | **1/20** | **1/20** | ✅ 중복 차단 |

**[B] 일일 카운터 1회 한도** — 불변식: `granted == 1 AND quota >= 0` (HTTP/2)

| 모드 | 지급 | 최종 quota | 판정 |
|---|---|---|---|
| `none` | 20/20 | **-19** | ⚠ 카운터 언더플로 |
| `local` | 2/20 | -1 | ⚠ 누수 |
| `distributed-naive` | 9/20 | -8 | ⚠ 누수 |
| `distributed` | 1/20 | 0 | ✅ |
| **`db-conditional`** | **1/20** | **0** | ✅ |
| **`db-for-update`** | **1/20** | **0** | ✅ |

`db-unique`는 [B]에서 제외했다. `UNIQUE(member, voucher)`는 "같은 발급권의 중복 소비"는 막을 수 있지만,
**일일 N회 같은 자유 카운터의 한도는 막지 못한다.** 이것이 UNIQUE의 핵심적인 한계다.

한 가지 중요한 점은 `db-conditional`의 실패 처리 방식이다. 동시 요청 20건 중 1건만 `SUCCESS`가 되었고,
나머지 19건은 서버 오류가 아니라 **정상적인 거절(HTTP 200, 500 아님)**로 처리됐다. 조건부 UPDATE에서
`affected=0`이 반환되면 도메인 예외를 발생시키고, 트랜잭션을 롤백한 뒤 실패 응답으로 변환하는 흐름까지 요청
단위로 확인했다.

JVM-local 락은 WAS 인스턴스마다 따로 존재한다. 그래서 WAS가 2대인 환경에서는 정확히 2건이 통과했다.
`synchronized`나 `ReentrantLock`만으로는 인스턴스 경계를 넘어 공유되는 한도를 지킬 수 없다는 뜻이다.
비원자 Redis 락 역시 9~20건이 통과했다. **락 획득 자체가 원자적이지 않으면**, 요청을 같은 시점에 몰아넣었을 때
상호배제가 제대로 동작하지 않는다.

---

## 3. 우선순위는 타당한가? 조건부 UPDATE를 기본값으로 권고할 수 있을까?

제안된 순서 — 조건부 UPDATE → UNIQUE → `FOR UPDATE` → Redis 락 → (보완) rate limit / concurrency guard — 는
**대체로 타당하다.** 다만 일렬로 늘어선 고정 순위라기보다, **지켜야 할 불변식의 형태에 따라 갈리는 결정 트리**로
보는 편이 맞다.

[![결정 트리: 불변식 모양으로 대응을 고른다](/images/post/race-condition-toctou-mitigation/choose-mitigation.webp)](/images/post/race-condition-toctou-mitigation/choose-mitigation.webp)

*대응은 고정 순서가 아니라 불변식의 형태에 따라 고른다. 단일 DB에서 조건을 한 문장으로 표현할 수 있으면 조건부 UPDATE, 중복 키 문제라면 UNIQUE/UPSERT, 여러 행을 함께 판단해야 하면 `FOR UPDATE`, 리소스 간 상호배제가 필요하면 분산 락, 부수효과가 DB 밖에 있으면 아키텍처 차원의 처리가 필요하다.*

결론부터 말하면, **`조건부 UPDATE + affected rows`는 1차 방어의 기본값으로 권고할 만하다.** 다만 "WHERE 절만
붙이면 된다"는 뜻은 아니다. 다음 네 가지 조건이 함께 맞아야 한다.

1. **CHECK 조건을 UPDATE의 WHERE 절로 표현할 수 있어야 한다.** 예: `count < max`, `used = false`, `status = 'ISSUED'`.
2. **성공 여부는 코드에서 affected rows로 판정해야 한다.** `affected == 1`이면 성공, `affected == 0`이면 다른
   요청이 먼저 처리했거나 이미 한도를 초과한 것이므로 거절한다. 이 확인을 빠뜨리면 조건부 UPDATE를 써도 의미가 없다.
3. **원자적으로 함께 반영되어야 하는 DB 부수효과는 같은 트랜잭션 안에 둔다.** DB 밖의 부수효과는 분리한다(6번).
4. **여러 자원을 함께 예약한다면 중간 실패 시 전체 롤백이 보장되어야 한다.** 뒤 단계의 실패를 트랜잭션 경계 밖까지
   전파해 앞 단계까지 함께 롤백시킨다.

이 우선순위를 사용할 때는 두 가지를 특히 명확히 해야 한다.

- **UNIQUE는 "중복 키" 형태의 불변식**(같은 발급권·쿠폰·1회 응모 등)을 지키는 데 적합하다. 하지만 하루 5회처럼
  값이 계속 증가하는 자유 카운터 한도는 막지 못한다. 랩 [B]가 그 차이를 보여준다. UNIQUE는 조건부 UPDATE를
  대체하는 수단이라기보다, 잘못된 중복 상태가 *저장되는 것 자체를 막는 최종 안전망*에 가깝다.
- **Redis 락은 상호배제를 제공하지만 DB 트랜잭션의 원자성을 대신하지는 못한다**
  ([Kleppmann, *How to do distributed locking*](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)).
  락을 잡았더라도 임계구역 처리 중간에 프로세스가 종료되거나 일부 작업만 커밋되면 부분 상태가 남을 수 있다.
  데이터 원자성은 여전히 DB 트랜잭션이 책임져야 한다.

---

## 4. 조건부 UPDATE는 왜 효과가 있는가

핵심은 UPDATE가 실행되는 시점에 조건을 다시 확인한다는 점이다. 같은 행을 여러 요청이 동시에 노리더라도, 조건을
만족해 실제로 상태를 바꾸는 요청은 하나만 남는다.

[![조건부 UPDATE가 통하는 이유: UPDATE 조건이 실행 시점에 재평가되고, 코드의 affected rows 검사가 승자를 정한다](/images/post/race-condition-toctou-mitigation/conditional-update.webp)](/images/post/race-condition-toctou-mitigation/conditional-update.webp)

*방어의 핵심은 SELECT가 아니라, 실행 시점에 다시 평가되는 UPDATE 조건과 애플리케이션의 affected rows 확인이다. 일부러 50ms 지연을 넣어도 최종 성공 요청은 하나뿐이었다.*

그렇다면 `SELECT → 판단 → 조건부 UPDATE`처럼 앞에 SELECT가 남아 있어도 왜 안전할까? READ COMMITTED(PG/MySQL
기본)에서는 **UPDATE가 실행될 때 최신 커밋 상태를 기준으로 WHERE 조건을 다시 평가**하기 때문이다. 따라서
방어의 핵심은 앞선 SELECT가 아니라 UPDATE의 WHERE 조건과 affected rows 확인에 있다. 랩에서도 후보 행을
`FOR UPDATE` 없이 먼저 읽고 일부러 50ms의 레이스 윈도우를 넣었지만, 최종적으로 성공한 요청은 정확히 하나였다.

취약한 코드와 수정 코드를 나란히 보면 차이가 더 분명하다.

```java
// AS-IS (취약): CHECK와 USE가 분리 → 모두 같은 이전 상태를 보고 통과
Long seq = jdbc.query("SELECT seq FROM voucher WHERE member_id=? AND used=false ORDER BY seq LIMIT 1", ...);
jdbc.update("UPDATE voucher SET used=true WHERE seq=?", seq);          // 조건 없음 → N번 소모

// TO-BE (조건부 UPDATE): 조건 확인 + 상태 변경을 한 문장에, affected로 판정
int affected = jdbc.update(
    "UPDATE voucher SET used=true, used_at=now() WHERE seq=? AND used=false", seq);
if (affected != 1) throw new AlreadyUsedException();                    // 승자만 진행
```

일일 N회 같은 자유 카운터도 원리는 같다.

```java
int affected = jdbc.update(
    "UPDATE user_daily_counter SET count = count + 1 " +
    "WHERE member_id=? AND business_date=? AND count < ?", memberId, today, maxCount);
if (affected != 1) throw new LimitExceededException();
```

---

## 5. 조건부 UPDATE만으로 부족한 경우

- **여러 행을 합산해 판단하는 한도**(장바구니 총액, 그룹 합산 등) → 별도의 카운터/집계 행을 두거나 관련 행에
  `FOR UPDATE`를 사용한다.
- **CHECK 대상과 UPDATE 대상이 다른 경우**(조건은 A 테이블, 변경은 B 테이블) → 트랜잭션 + `FOR UPDATE`, 또는
  별도의 카운터 구조를 검토한다.
- **자유 카운터를 UNIQUE로 해결하려는 경우** → UNIQUE가 아니라 카운터 행에 조건부 UPDATE를 적용한다.
- **INSERT 자체가 상태 변화인 중복 방지 문제** → 조건부 UPDATE보다 **UNIQUE + UPSERT / `ON CONFLICT`**가 맞다.
- **DB 밖의 부수효과까지 원자적으로 다뤄야 하는 경우** → 6번처럼 아키텍처 차원에서 처리한다.
- **일자 변경 등 카운터 리셋 시점에 "오늘 카운터" 행이 아직 없는 경우** → `UNIQUE(member, business_date)` +
  UPSERT로 행을 원자적으로 만든 뒤 조건부 UPDATE를 적용한다.

### `SELECT … FOR UPDATE`를 사용할 때 주의할 점

`FOR UPDATE`는 강력하지만 잘못 사용하면 락 경합, 커넥션 고갈, 데드락 같은 운영 문제를 만들기 쉽다.

- **트랜잭션 안에서 외부 API를 호출하거나 느린 작업을 수행하는 경우** → 네트워크 왕복 시간 동안 락과 커넥션을
  계속 점유한다. 외부 호출은 트랜잭션 밖으로 분리한다.
- **락 대기 시간의 상한이 없는 경우** → `lock_timeout`(PG) / `innodb_lock_wait_timeout`(MySQL)을 설정한다.
  랩에서는 `SET LOCAL lock_timeout='10s'`를 사용했다.
- **락 획득 순서가 일관되지 않은 경우** → 데드락이 발생할 수 있다. 항상 같은 순서로 잠그도록 설계한다.
  랩에서는 회원별 단일 앵커 행만 잠갔다.
- **아직 존재하지 않는 행을 잠그려는 경우** → 행 자체가 없으면 행 락을 걸 수 없다. INSERT 레이스는
  UNIQUE + UPSERT로 처리한다.
- **조건에 맞는 인덱스가 없는 경우** → 필요 이상으로 넓은 범위를 잠그거나 갭 락이 발생할 수 있다.
  랩에서는 후보 조회를 위한 부분 인덱스를 두었다.
- **ORM을 사용하는 경우** → `@Lock` 없이 조회하면 의도한 행 락이 걸리지 않을 수 있다. 지연 로딩과 2차 캐시도
  함께 확인해야 한다.
- **`SKIP LOCKED`를 잘못 사용하는 경우** → 이미 잠긴 행을 기다리지 않고 건너뛴다. "큐에서 서로 다른 항목을
  하나씩 가져가는" 용도에는 적합하지만, "하나의 자원에 대한 상호배제" 용도로는 맞지 않는다.

---

## 6. 외부 API가 포함될 때 (포인트 지급 / 결제 / 쿠폰 취소)

**핵심 원칙은 DB 트랜잭션 안에서는 처리 권리나 한도를 *원자적으로 예약*하고, 실제 외부 호출은 트랜잭션 *밖*에서
*멱등하게* 수행하는 것이다.** 외부 호출을 트랜잭션 안에 넣으면 네트워크 대기 시간 동안 락과 커넥션을 점유하게
되고, 그렇다고 DB 커밋과 외부 API의 성공을 하나의 원자적 작업으로 만들 수 있는 것도 아니다.

[![DB 트랜잭션 안에서 예약하고, 외부 API는 트랜잭션 밖에서 호출한 뒤 확정한다](/images/post/race-condition-toctou-mitigation/external-api.webp)](/images/post/race-condition-toctou-mitigation/external-api.webp)

*예약 → 커밋 → 외부 호출 → 확정의 순서로 처리한다. 느린 외부 호출은 DB 트랜잭션 밖으로 분리하고, 멱등키·Outbox·보상 처리를 조합해 중복 실행과 불일치를 다룬다.*

```text
1) [TX 시작]
   조건부 UPDATE로 한도/기회 예약  (affected==1 이어야 진행)
   지급 시도 레코드 INSERT (status=PENDING, idempotency_key=UUID)
   [TX 커밋]              ← 여기까지가 원자적 예약. 실패하면 아무 일도 없음.

2) [TX 밖] 외부 API 호출 (idempotency_key 동봉 → 재시도해도 이중지급 없음)

3) 상태 전이 (조건부 UPDATE):
   성공 → UPDATE ... SET status=CONFIRMED WHERE id=? AND status=PENDING
   실패 → UPDATE ... SET status=FAILED    WHERE id=? AND status=PENDING  + 보상(카운터 원복)
```

- **[멱등키](https://docs.stripe.com/api/idempotent_requests)** — 재시도 상황에서 같은 요청이 중복 처리되지 않도록
  만드는 핵심 장치다. 외부 API가 지원하지 않는다면 우리 쪽 "지급 시도" 테이블의 `UNIQUE(idempotency_key)`로
  중복 전송을 걸러낸다.
- **[Outbox 패턴](https://microservices.io/patterns/data/transactional-outbox.html)** — 예약 상태와 "보낼 메시지"를
  *같은 트랜잭션*에 기록한 뒤 워커가 전송한다. DB 변경과 메시지 발행을 따로 처리할 때 생기는 dual-write 문제를
  다루기 위한 패턴이다.
- **상태 머신 + 보상** — `PENDING → CONFIRMED/FAILED`로 상태를 관리하고, 최종 확정에 실패하면 예약을
  원복한다([사가](https://microservices.io/patterns/data/saga.html)).
- **재조정(reconciliation)** — 내부 상태와 외부 시스템의 결과를 주기적으로 대사한다. 장애나 불일치가 남았을 때의
  최종 안전망이다.

**쿠폰 취소 중복**에도 같은 원리를 적용할 수 있다. 취소 상태 전이는 CAS 형태로 처리한다.
`UPDATE coupon SET status='CANCELED' WHERE coupon_id=:id AND status='ISSUED'`를 수행한 뒤 `affected==1`인 요청만
실제 취소·환불 API를 호출하고 멱등키를 사용한다. `db-conditional`과 같은 패턴이다.

---

## 7. Redis 락은 언제 필요하고, 언제 과한가

**Redis 락이 유용한 경우:** 원자적으로 함께 바뀌어야 할 상태가 여러 리소스·DB·캐시에 걸쳐 있어 단일 DB
트랜잭션으로 묶기 어려울 때, DB에 쓰기 전에 사용자 단위로 요청을 직렬화해야 할 때, 특정 키에 요청이 몰려 DB
행 락 경합이 심해 이를 앞단에서 완화하고 싶을 때다. 다만 최종적인 데이터 정합성 보장은 여전히 DB에 두는 편이
안전하다.

**Redis 락이 과한 경우:** 단일 DB의 단일 행이나 카운터 문제를 조건부 UPDATE만으로 해결할 수 있는데도 분산 락을
추가하는 경우다. Redis 락을 *정합성 자체를 보장하는 장치*로 보는 것도 위험하다. 랩의 `distributed-naive`처럼
락 획득이 원자적이지 않으면 동시 요청 20건 중 9~20건이 통과했다. Redis 락을 쓴다면 최소한 원자적 획득
(`SET key <token> NX PX <ttl>`), 소유자 토큰을 이용한 해제, TTL, 명시적인 실패 정책이 필요하다.

rate limit과 concurrency guard는 역할이 다르며, 둘 다 정합성의 근본 해법은 아니다.

| 통제 | 계층 | 용도 | 정합성 보장? |
|---|---|---|---|
| **Rate limit** (10 req/s) | 엣지/게이트웨이 | 남용·DoS·비용 보호 | ❌ — 동시 2~3건으로도 레이스 발생 가능 |
| **Concurrency guard** (동일 사용자+동일 객체 → 동시 1) | 애플리케이션 | 레이스 증폭 완화, 뒷단 부하 감소 | △ 보완책 |
| **원자적 처리** (조건부 UPDATE) | DB/트랜잭션 | **정합성 보장** | ✅ 근본 대응 |

정리하면 **엣지에서는 rate limit으로 남용과 비용을 제어하고, 애플리케이션에서는 DB 원자성으로 정합성을
보장하며, 필요하면 그 앞에 concurrency guard를 완충 장치로 둔다.** rate limit이나 concurrency guard가 DB
원자성을 대체해서는 안 된다.

---

## 8. 반복되는 버그를 개별 패치로 끝내지 않기

같은 `check → act` 레이스가 여러 서비스에서 반복된다면, 취약점 하나씩 고치는 데서 끝내기보다 개발 표준과
검증 절차로 끌어올리는 편이 낫다.

1. **Secure Coding Rule** — *"한도·기회·카운터·상태 전이는 조회 → 판단 → 변경으로 나누지 말고, CHECK와
   USE를 하나의 원자적 DB 연산으로 처리한다. 성공 여부는 affected rows(또는 UNIQUE 위반)로 판정한다."*
   금지 패턴: `getCount()/findUnused()` → `if` → `insert()/update()`.
2. **공용 추상화** — `affected==1` 확인 로직을 헬퍼로 캡슐화해 각 팀이 같은 로직을 다시 구현하지 않도록 한다.
3. **정적 분석 룰**(Semgrep) — "SELECT/count 결과로 분기한 뒤 같은 엔티티를 insert/update"하는 패턴을 PR에서
   경고하고, 필요하면 CI 게이트로 사용한다.
4. **스키마 설계 표준** — 중복 키에는 UNIQUE, 자유 카운터에는 카운터 컬럼을 두는 원칙을 설계 단계부터 스키마에
   반영한다.
5. **동시성 회귀 테스트** — 이 랩의 라스트바이트/단일 패킷 러너처럼 여러 요청의 완료 시점을 최대한 가깝게 맞춰
   보내고, `granted==1` 같은 불변식을 CI에서 검증한다. 랩의 `run_all.sh`는 완화 모드에서 누수가 발생하면 exit 1로
   종료한다.
6. **리뷰 체크리스트** — CHECK 조건이 WHERE 절로 이동했는가? 성공을 affected rows로 판정하는가? 원자적으로
   처리해야 할 DB 부수효과는 같은 트랜잭션에 있는가? 외부 호출은 트랜잭션 밖에 있는가? 실패가 전체 롤백으로
   이어지는가? 중복 INSERT에는 UNIQUE가 있는가?

### `@Transactional`에서 자주 놓치는 부분

- **거절을 나타내는 예외는 트랜잭션 경계 밖까지 전파시킨다.** 트랜잭션 메서드 *안*에서 예외를 잡고 정상 응답을
  return하면 앞 단계가 그대로 커밋될 수 있다. 예를 들어 카운터는 차감됐는데 응답만 "실패"로 나가는 식이다.
  롤백이 필요한 예외는 밖으로 던지고, 트랜잭션 *밖*에서 잡아 사용자 응답으로 변환한다. 랩의
  `ClaimService.guarded()`도 트랜잭션 밖에서 도메인 예외와 `DuplicateKeyException`을 처리한다.
- Spring의 기본 롤백 대상은 unchecked 예외다. checked 예외까지 롤백해야 한다면
  `@Transactional(rollbackFor=…)`을 명시한다.
- self-invocation에 주의한다. 같은 객체 내부에서 메서드를 직접 호출하면 트랜잭션 프록시를 우회할 수 있다.
- 외부 API 호출은 트랜잭션 안에 두지 않는다.

JPA의 `@Modifying @Query`도 affected rows를 반환할 수 있고, MyBatis의 mapper `update()`도 같은 값을 반환한다.
따라서 기존 코드 구조를 크게 바꾸지 않고도 이 패턴을 적용할 수 있다. 전체 예제는 저장소 가이드에 있다.

---

## 9. 최종 정책 문구 (보안 → 개발)

> **[동시성 정합성 정책]**
> 1. 사용자별 한도·기회·포인트·상태 전이는 "조회 후 판단 후 변경"으로 나누지 않고, **CHECK와 USE를 하나의
>    원자적 DB 연산**으로 처리한다.
> 2. 우선적으로 **DB 조건부 UPDATE + affected rows 확인**을 검토한다. 성공은 `affected==1`일 때만 인정하고,
>    그렇지 않으면 거절한다.
> 3. 중복 키 형태의 한도에는 **UNIQUE 제약을 최종 안전망**으로 둔다. 필요하면 `SELECT … FOR UPDATE`를 사용하되
>    락 대기 시간의 상한을 설정하고, 단일 DB 트랜잭션으로 해결하기 어려운 경우에만 분산 락을 검토한다.
> 4. **외부 지급·결제·취소**는 DB에서 처리 권리를 원자적으로 **예약**한 뒤, 트랜잭션 밖에서 **멱등키**를 사용해
>    호출한다. Rate limit은 남용 방지 수단이며 정합성 대책을 대신할 수 없다.
>
> 특정 구현 방식(예: Redis 락)을 일괄 강제하지 않는다. 요구사항은 "동시 요청에서도 한도가 초과되지 않도록
> 원자성을 보장하라"는 것이며, 구현 방식은 서비스의 불변식과 구조에 맞게 선택한다.

---

## References

### 레이스 컨디션 / TOCTOU
1. **CWE-367 — Time-of-check Time-of-use (TOCTOU) Race Condition.** <https://cwe.mitre.org/data/definitions/367.html>
2. **CWE-362 — Concurrent Execution using Shared Resource with Improper Synchronization.** <https://cwe.mitre.org/data/definitions/362.html>
3. **James Kettle — *Smashing the State Machine: The True Potential of Web Race Conditions*, PortSwigger Research (Black Hat USA / DEF CON 31), 2023.** <https://portswigger.net/research/smashing-the-state-machine>
4. **James Kettle — *Listen to the Whispers: Web Timing Attacks That Actually Work*, PortSwigger Research (Black Hat USA / DEF CON 32), 2024.** <https://portswigger.net/research/listen-to-the-whispers-web-timing-attacks-that-actually-work>
5. **PortSwigger Web Security Academy — Race conditions.** <https://portswigger.net/web-security/race-conditions>
6. **Mohammad Amin Nasiri — *H2SpaceX: HTTP/2 Single Packet Attack (Last Frame Synchronization) library*.** <https://github.com/nxenon/h2spacex> (HTTP/3: <https://github.com/nxenon/h3spacex>)
7. **Federico Loi, Lorenzo Pisu, Leonardo Regano, Davide Maiorca, Giorgio Giacinto — *Race Against Time: Investigating the Factors that Influence Web Race Condition Exploits*, Computers & Security 160 (2026) 104740.** DOI: <https://doi.org/10.1016/j.cose.2025.104740>
8. **Mohammad Amin Nasiri, Efstratios Chatzoglou, Georgios Kambourakis — *QUIC-er Races: HTTP/3 Won't Save You from TOCTOU Vulnerabilities*, Int. J. Information Security 25, 83 (2026).** DOI: <https://doi.org/10.1007/s10207-026-01258-6>

### DB 원자성 · 잠금
9. **PostgreSQL — Transaction Isolation (READ COMMITTED).** <https://www.postgresql.org/docs/current/transaction-iso.html>
10. **PostgreSQL — Explicit Locking (행 잠금, `FOR UPDATE`, 데드락).** <https://www.postgresql.org/docs/current/explicit-locking.html>
11. **PostgreSQL — `SELECT … FOR UPDATE` / `SKIP LOCKED`.** <https://www.postgresql.org/docs/current/sql-select.html>
12. **PostgreSQL — `INSERT … ON CONFLICT` (UPSERT).** <https://www.postgresql.org/docs/current/sql-insert.html>
13. **MySQL — Locking Reads (`SELECT … FOR UPDATE` / `FOR SHARE`).** <https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html>

### 분산 락
14. **Redis — Distributed Locks (Redlock).** <https://redis.io/docs/latest/develop/use/patterns/distributed-locks/>
15. **Martin Kleppmann — *How to do distributed locking*.** <https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html>
16. **Redisson — Distributed locks and synchronizers.** <https://github.com/redisson/redisson/wiki/8.-Distributed-locks-and-synchronizers>

### 외부 부수효과의 신뢰성 있는 처리
17. **Chris Richardson — Transactional Outbox 패턴.** <https://microservices.io/patterns/data/transactional-outbox.html>
18. **Chris Richardson — Saga 패턴.** <https://microservices.io/patterns/data/saga.html>
19. **Chris Richardson — Idempotent Consumer 패턴.** <https://microservices.io/patterns/communication-style/idempotent-consumer.html>
20. **Stripe API — Idempotent requests.** <https://docs.stripe.com/api/idempotent_requests>

### 프레임워크 · 클라이언트 구현
21. **Spring Framework — Declarative transaction management (`@Transactional`).** <https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html>
22. **Spring Framework 6.1 Release Notes — RestClient/RestTemplate의 요청 본문 버퍼링 축소(메모리 사용 감소), 일부 콘텐츠는 `Content-Length` 미설정.** <https://github.com/spring-projects/spring-framework/wiki/Spring-Framework-6.1-Release-Notes>
23. **Spring Framework Issue #30557 — *Remove buffering in ClientHttpRequestFactory implementations*.** <https://github.com/spring-projects/spring-framework/issues/30557>

### 랩
24. **저장소 · 재현 랩(이 글의 코드와 실측).** <https://github.com/windshock/race-condition-lab>
25. **전송/동기화 기법 차용 출처: *waf-ips-ids-retest* TC-24.** <https://github.com/windshock/waf-ips-ids-retest/>
