---
title: "Race Condition(TOCTOU) 대응: 실제 스택에서 무엇이 정말 막았나"
date: 2026-08-25
draft: false
featured: true
tags: ["Code", "레이스컨디션", "TOCTOU", "동시성", "데이터베이스", "Spring"]
categories: ["보안 연구", "백엔드"]
description: "구매 횟수 제한 우회, 뽑기 1회를 여러 요청이 동시 사용, 쿠폰 취소 중복 처리, 일일 리워드 초과 — 같은 check-then-act 레이스가 서비스마다 반복된다. 실제 스택(nginx + Tomcat×2 + 공유 Postgres + Redis)을 만들어 어떤 대응이 실제로 막는지 실측했다. 대부분은 Redis 락 없이 DB 조건부 UPDATE와 affected rows 확인만으로 충분하다."
image: "/images/post/race-condition-toctou-mitigation/cover.webp"
cover:
  image: "/images/post/race-condition-toctou-mitigation/cover.webp"
  alt: "TOCTOU 레이스가 발생하는 방식: 동시 요청이 모두 같은 이전 상태를 읽고 모두 CHECK를 통과한다"
---

같은 결함이 서비스마다 반복해서 나온다.

- 사용자별 구매 횟수 제한 우회
- 뽑기 기회 1개를 여러 요청이 동시에 소비
- 쿠폰 취소 요청 중복 처리
- 일일 응모권 발급 한도 초과
- 일일 포인트 리워드 횟수 초과

전부 모양이 같다. "현재 상태 조회 → 제한 CHECK → 업무 처리 → 상태 UPDATE"가 **하나의 원자적 동작으로
묶여 있지 않아서**, 같은 사용자에게 여러 요청이 동시에 들어오면 모두 같은 이전 상태를 보고 통과한다.

```java
int count = repository.getTodayCount(memberId);
if (count < limit) {              // A, B, C 모두 count = 4, limit = 5 를 읽음
    rewardService.givePoint(memberId);
    repository.insertHistory(memberId);   // → 5회 제한인데 7회 처리
}
```

보안팀 입장에서 가장 쉬운 요구는 "전부 Redis 분산락 거세요"다. 하지만 그건 모든 팀에 Redis 의존성,
lock timeout, 소유권 관리, fail-open/fail-close 정책, 다중 인스턴스 고려, 코드 복잡도라는 실제 비용을
떠넘긴다. 그래서 특정 구현을 강제하는 대신 요구사항은 이렇게 잡아야 한다.

> **동시 요청에서도 횟수·기회·포인트 제한이 초과되지 않도록 원자성을 보장한다** — 그리고 가능하면
> DB 자체의 원자적 처리를 우선한다.

이걸 실행 가능한 랩으로 만들어, 현실적인 토폴로지(nginx + Tomcat×2 + 공유 Postgres + Redis, 라운드로빈
뒤 2개 WAS)에서 어떤 대응이 실제로 막는지 **실측**했다. 아래 내용은 전부 그 랩으로 뒷받침된다.

**저장소(코드 + 재현 랩):** https://github.com/windshock/race-condition-lab

먼저 한 장으로, 그다음 상세.

[![레이스 컨디션 대응 가이드 한 장 요약](/images/post/race-condition-toctou-mitigation/overview.webp)](/images/post/race-condition-toctou-mitigation/overview.webp)

*가이드 전체 요약: TOCTOU란 무엇인가, 실제 스택 테스트가 증명한 것, 대응 선택법, 조건부 UPDATE가 왜 통하는가, 외부 부수효과는 어떻게 다루는가.*

---

## 0. 랩이 "증명한 것"과 "권고에 그치는 것"

정직하게 구분한다. 과대 해석하면 잘못된 안심으로 이어진다.

| 구분 | 내용 |
|---|---|
| **랩으로 증명함** | 단일 DB 안의 한도(발급권 1개 / 일일 카운터 1회)는 조건부 UPDATE·`FOR UPDATE`·UNIQUE로 동시 20요청에서도 **정확히 1건만** 통과함. JVM-local 락은 인스턴스 수만큼 누수함. 비원자 Redis 락은 여전히 누수함. |
| **권고에 그침(랩 밖)** | 부수효과가 **DB 밖**에 있는 경우(외부 포인트 지급·결제·쿠폰 취소)의 정합성. 단일 트랜잭션으로 증명 불가 → 예약·멱등키·outbox·보상 트랜잭션 같은 **아키텍처**로 다뤄야 함(4번). |

"조건부 UPDATE가 레이스를 막는다"는 **DB 내부 상태**에 대한 증명이고, "포인트가 정확히 한 번
지급된다"는 **분산 시스템 설계** 문제다. 둘을 섞지 말 것.

---

## 1. TOCTOU 레이스는 실제로 어떻게 나는가

여러 요청이 동시에 돌면, 누구도 UPDATE 하기 전에 모두 같은 상태를 읽는다. READ/CHECK와 UPDATE 사이
구간이 **레이스 윈도우**다(위 대표 이미지가 바로 이것 — 세 요청이 같은 이전 상태를 보고 모두 통과).

전형적 취약 패턴은 `read → check → work → update`이고, 어느 것도 원자적이지 않다. 그리고 이건 대량
요청이 **필요 없다** — 동시 2~3건이면 난다. (HTTP `Transfer-Encoding: chunked`나 HTTP/2 단일 패킷으로
요청 완료 시점을 좁은 윈도우에 정렬하면 재현성이 크게 올라가지만, `chunked`는 정상 기능이고 이를 차단하는
것이 근본 대응은 아니다.)

---

## 2. 실제 스택 테스트가 증명한 것 (동시 20요청)

두 시나리오를 전 모드에 대해 A/B로 돌리고, DB(`grant_log`/`quota`) 기준으로 집계했다. 공유 Postgres를
보는 2개 WAS 위에서.

[![실측 결과: 동시 20요청에서 어떤 대응이 버텼나](/images/post/race-condition-toctou-mitigation/measured-results.webp)](/images/post/race-condition-toctou-mitigation/measured-results.webp)

*실제 스택 실측. DB 조건부 UPDATE와 FOR UPDATE는 레이스를 깔끔히 막고, UNIQUE는 중복 키 케이스의 안전망일 뿐 자유 카운터 해법은 아니다.*

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

`db-unique`는 [B]에서 제외했다. UNIQUE`(member, voucher)`는 "같은 발급권 중복 소비"만 막고 **자유
카운터(일일 N회) 한도는 못 막는다**. 이게 UNIQUE의 핵심 한계다.

결정적 디테일: `db-conditional`에서 20요청 중 1건만 `SUCCESS`, 나머지 19건은 **정상 차단(HTTP 200, 500
아님)**. 조건부 UPDATE의 `affected=0` → 도메인 예외 → 트랜잭션 롤백 → 실패 응답 변환이 응답 단위로
확인됐다.

JVM-local 락이 정확히 인스턴스 수(2개 WAS에서 2/20)만큼 새는 것은 `synchronized`/`ReentrantLock`이
인스턴스 경계를 넘는 한도를 못 지킨다는 실증이다. 비원자 Redis 락이 9~20/20 새는 것은 **원자적으로
획득하지 않은 락**은 동기화된 버스트 앞에서 아무 효과가 없다는 실증이다.

---

## 3. 우선순위는 타당한가? 조건부 UPDATE를 기본으로 권고해도 되나?

제안된 순서 — 조건부 UPDATE → UNIQUE → `FOR UPDATE` → Redis 락 → (보완) rate limit / concurrency guard
— 는 **대체로 타당하다**. 단 "고정된 사다리"가 아니라 **불변식의 모양에 따라 갈라지는 결정 트리**로
써야 한다.

[![결정 트리: 불변식 모양으로 대응을 고른다](/images/post/race-condition-toctou-mitigation/choose-mitigation.webp)](/images/post/race-condition-toctou-mitigation/choose-mitigation.webp)

*고정 순서가 아니라 불변식 모양으로 선택: 단일 DB + 한 문장 표현 가능 → 조건부 UPDATE; 중복 키 → UNIQUE/UPSERT; 여러 행 판단 → FOR UPDATE; 리소스 간 상호배제 → 분산락; 부수효과가 DB 밖 → 아키텍처.*

**그렇다 — `조건부 UPDATE + affected rows`를 1차 방어의 기본값으로 권고해도 된다.** 단 "그냥 WHERE만
붙이면 된다"가 아니라 성립 조건 4가지와 함께:

1. **CHECK가 UPDATE의 WHERE로 표현되어야 한다** — `count < max`, `used = false`, `status = 'ISSUED'`.
2. **승패는 코드에서 affected rows로 판정** — `affected == 1` → 내가 획득; `affected == 0` → 남이 이미
   가져감/한도 초과 → 거절. 이 검사를 빠뜨리면 전부 무의미.
3. **원자적으로 함께 성립해야 하는 부수효과는 같은 트랜잭션**에; DB 밖 부수효과는 빼낸다(4번).
4. **여러 자원 예약 시 실패 롤백을 보장** — 뒤 단계 실패를 트랜잭션 메서드 밖으로 던져 전체 롤백.

우선순위 목록이 못 박아야 할 두 가지:

- **UNIQUE는 "중복 키" 불변식**(같은 발급권/쿠폰/1회 응모)만 막는다. 자유 카운터(하루 5회)는 못
  막는다 — 랩 [B]가 증거. UNIQUE는 조건부 UPDATE를 대체하지 않고, 잘못된 상태가 *저장*되는 것을 막는
  최종선이다.
- **Redis 락은 상호배제이지 트랜잭션 원자성이 아니다.** 락을 잡아도 임계구역 중간에 죽으면 부분 커밋이
  남는다. 원자성은 여전히 DB 트랜잭션의 몫.

---

## 4. 조건부 UPDATE는 왜 통하는가 (DB 안에서의 원자적 판정)

UPDATE 자체가 조건을 다시 확인하기 때문에, 오직 한 요청만 행을 바꿀 수 있다.

[![조건부 UPDATE가 통하는 이유: UPDATE 조건이 실행 시점에 재평가되고, 코드의 affected rows 검사가 승자를 정한다](/images/post/race-condition-toctou-mitigation/conditional-update.webp)](/images/post/race-condition-toctou-mitigation/conditional-update.webp)

*방어는 SELECT가 아니다. 방어는 실행 시점에 재평가되는 UPDATE 조건 + 애플리케이션의 affected rows 검사다. 일부러 50ms 지연을 줘도 승자는 하나뿐이다.*

`SELECT → 판단 → 조건부 UPDATE`에 SELECT가 있어도 왜 안전한가? READ COMMITTED(PG/MySQL 기본)에서
**UPDATE는 실행 시점의 최신 커밋본을 다시 읽고 WHERE를 재평가**하기 때문이다. 방어의 핵심은 SELECT가
아니라 UPDATE의 WHERE + affected rows다. 랩은 일부러 후보를 `FOR UPDATE` 없이 읽고 50ms 레이스 윈도우를
넣었지만, 승자는 정확히 하나였다.

실제 취약 코드와 수정을 나란히:

```java
// AS-IS (취약): CHECK와 USE가 분리 → 모두 같은 이전 상태를 보고 통과
Long seq = jdbc.query("SELECT seq FROM voucher WHERE member_id=? AND used=false ORDER BY seq LIMIT 1", ...);
jdbc.update("UPDATE voucher SET used=true WHERE seq=?", seq);          // 조건 없음 → N번 소모

// TO-BE (조건부 UPDATE): 조건 확인 + 상태 변경을 한 문장에, affected로 판정
int affected = jdbc.update(
    "UPDATE voucher SET used=true, used_at=now() WHERE seq=? AND used=false", seq);
if (affected != 1) throw new AlreadyUsedException();                    // 승자만 진행
```

자유 카운터도 같은 아이디어:

```java
int affected = jdbc.update(
    "UPDATE user_daily_counter SET count = count + 1 " +
    "WHERE member_id=? AND business_date=? AND count < ?", memberId, today, maxCount);
if (affected != 1) throw new LimitExceededException();
```

---

## 5. 조건부 UPDATE가 안 맞는 경우 — 그리고 무엇을 쓸까

- **여러 행에 걸친 집계 한도**(장바구니 총액, 그룹 합산) → 카운터/집계 행, 또는 관련 행에 `FOR UPDATE`.
- **CHECK 대상 ≠ UPDATE 대상**(조건은 A테이블, 변경은 B테이블) → 트랜잭션 + `FOR UPDATE`, 또는 카운터.
- **자유 카운터를 UNIQUE로** → 카운터 행 조건부 UPDATE로.
- **삽입 자체가 업무(중복 방지)** → 조건부 UPDATE가 아니라 **UNIQUE + UPSERT / `ON CONFLICT`**.
- **DB 밖 부수효과가 원자적이어야 함** → 6번.
- **카운터 리셋 경계(일자 롤오버)** 로 "오늘 카운터" 행이 없을 때 → UNIQUE`(member, business_date)` +
  UPSERT로 0행을 원자적으로 만든 뒤 조건부 UPDATE.

### `SELECT … FOR UPDATE`: 흔한 함정

강력하지만 발을 잘 밟는다:

- **트랜잭션 안 외부 호출/느린 작업** → 네트워크 왕복 내내 락/커넥션 점유 → 풀 고갈. 외부 호출은 밖으로.
- **락 대기 상한 미설정** → `lock_timeout`(PG) / `innodb_lock_wait_timeout`(MySQL) 설정. (랩은
  `SET LOCAL lock_timeout='10s'`.)
- **락 순서 불일치 → 데드락** → 항상 같은 순서로; 랩은 회원별 단일 앵커 행만 잠근다.
- **없는 행은 못 잠근다** → 삽입 레이스는 UNIQUE + UPSERT.
- **인덱스 없는 조건** → 광범위/갭 락; 랩은 후보 조회용 부분 인덱스를 둔다.
- **ORM 함정** → `@Lock` 없이 읽으면 락 안 걸림; 지연 로딩/2차 캐시 주의.
- **`SKIP LOCKED` 오용** → 조용히 건너뜀; "큐에서 서로 다른 항목 집기"엔 맞고 "한 자원 상호배제"엔 아님.

---

## 6. 외부 API가 포함될 때 (포인트 지급 / 결제 / 쿠폰 취소)

**핵심 원칙: DB 트랜잭션 안에서는 권리를 *원자적으로 예약*만 하고, 외부 호출은 트랜잭션 *밖*에서
*멱등하게* 한다.** 외부 호출을 트랜잭션 안에 넣으면 네트워크 시간만큼 락을 잡고, DB 커밋과 원자적이지도
않다(둘 중 하나만 성공 가능).

[![DB 트랜잭션 안에서 예약하고, 외부 API는 트랜잭션 밖에서 호출한 뒤 확정한다](/images/post/race-condition-toctou-mitigation/external-api.webp)](/images/post/race-condition-toctou-mitigation/external-api.webp)

*예약 → 커밋 → 외부 호출 → 확정. 느린 외부 호출을 DB 트랜잭션 안에 절대 넣지 말 것. 멱등키 + Outbox + 보상이 "정확히 1회" 효과를 아키텍처로 보장한다(단일 SQL이 아니라).*

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

- **멱등키** — 정확히-한-번 효과의 근본 장치. 외부가 지원 안 하면 우리 "지급 시도" 테이블의
  UNIQUE(idempotency_key)로 중복 전송을 거른다.
- **Outbox 패턴** — 예약과 "보낼 메시지"를 *같은 트랜잭션*으로 남기고 워커가 전송. dual-write 문제 해결.
- **상태 머신 + 보상** — `PENDING → CONFIRMED/FAILED`; 확정 불가면 예약 원복(사가).
- **재조정(reconciliation)** — 외부와 주기적으로 대사; 최후의 안전망.

**쿠폰 취소 중복**은 특수 케이스: 취소는 상태 전이 CAS
(`UPDATE coupon SET status='CANCELED' WHERE coupon_id=:id AND status='ISSUED'`). `affected==1`인 요청만
실제 취소·환불 API 호출(+ 멱등키). `db-conditional`과 같은 패턴이다.

---

## 7. Redis 락 필요 vs 과잉; 그리고 rate limit vs concurrency guard

**필요:** 원자적으로 함께 바뀌어야 하는 상태가 여러 리소스/DB/캐시/외부에 걸쳐 단일 트랜잭션으로 못
묶일 때; DB 쓰기 전 단계에서 회원 단위 직렬화가 필요할 때; 아주 뜨거운 키의 DB 행 락 경합을 앞단에서
줄일 때(정합성 본질은 여전히 DB).

**과잉:** 단일 DB 단일 행/카운터인데 조건부 UPDATE로 충분한 경우; Redis 락을 *정합성 보장*으로 착각;
비원자 획득(랩 `distributed-naive`, 9~20/20 누수). 쓸 거면 반드시 원자적 획득(`SET key <token> NX PX
<ttl>`) + 소유자 토큰 해제 + TTL + 명시적 실패 정책.

rate limit vs concurrency guard — 둘 다 근본 해법이 아니다:

| 통제 | 계층 | 용도 | 정합성 도구? |
|---|---|---|---|
| **Rate limit** (10 req/s) | 엣지/게이트웨이 | 남용·DoS·비용 보호 | ❌ — 동시 2~3건으로도 레이스 |
| **Concurrency guard** (동일 사용자+동일 객체 → 동시 1) | 애플리케이션 | 레이스 증폭 완화, 뒷단 부하 감소 | △ 보완만 |
| **원자적 처리** (조건부 UPDATE) | DB/트랜잭션 | **정합성 보장** | ✅ 근본 |

배치: **엣지 = rate limit(정책/비용) · 앱 = DB 원자성(근본) · 선택적 앱 앞단 concurrency guard(완충).**
순서가 바뀌면 안 된다.

---

## 8. 반복 버그를 패치 더미가 아니라 표준으로

같은 `check → act` 레이스가 서비스마다 반복되면, 개별 인스턴스가 아니라 *패턴*을 제거한다:

1. **Secure Coding Rule** — *"한도·기회·카운터·상태 전이는 조회 후 판단 후 변경으로 나누지 말고, CHECK와
   USE를 하나의 원자적 DB 연산으로 처리하고, 성공은 affected rows(또는 UNIQUE 위반)로 판정한다."* 금지:
   `getCount()/findUnused()` → `if` → `insert()/update()`.
2. **공용 추상화** — `affected==1` 검사를 캡슐화한 헬퍼로 재발명 방지.
3. **정적 분석 룰**(Semgrep) — "SELECT/count 결과로 분기 후 같은 엔티티 insert/update"를 PR에서 경고, CI
   게이트로.
4. **스키마 설계 표준** — UNIQUE(중복 키)와 카운터 컬럼(자유 카운터)을 설계 단계에서 스키마에 박기.
5. **동시성 회귀 테스트** — 이 랩의 라스트바이트/단일패킷 러너처럼 동시 요청을 한 시점에 정렬해 쏘고
   불변식(`granted==1`)을 CI에서 검증. 랩 `run_all.sh`는 완화 모드 누수 시 exit 1.
6. **리뷰 체크리스트** — CHECK가 WHERE로 갔나? 성공을 affected rows로 판정하나? 원자적 부수효과가 같은
   트랜잭션이고 외부 호출은 밖인가? 실패 경로가 밖으로 던져 롤백되나? 중복 삽입에 UNIQUE가 있나?

### `@Transactional` 필수(자주 틀림)

- **거절 예외는 트랜잭션 메서드 밖으로 던진다.** 메서드 *안*에서 잡아 정상 응답을 return하면 앞 단계가
  커밋된다(예: 카운터만 차감된 채 "성공"). 던져서 롤백시키고, 트랜잭션 *밖*에서 잡아 사용자 응답으로
  변환한다. (랩의 `ClaimService.guarded()`가 트랜잭션 밖에서 도메인/`DuplicateKeyException`을 잡는다.)
- 기본 롤백은 unchecked 예외에만(아니면 `@Transactional(rollbackFor=…)`).
- self-invocation 주의(내부 호출은 프록시 우회).
- 외부 API 호출을 트랜잭션 안에 두지 말 것.

JPA(`@Modifying @Query` + affected rows 반환)·MyBatis(mapper `update()`가 affected rows 반환)에도
최소 변경 수정이 있다 — 전체 예제는 저장소 가이드에 있다.

---

## 9. 최종 정책 문구 (보안 → 개발)

> **[동시성 정합성 정책]**
> 1. 사용자별 한도·기회·포인트·상태 전이는 "조회 후 판단 후 변경"으로 나누지 말고, **CHECK와 USE를
>    하나의 원자적 DB 연산**으로 처리한다.
> 2. **DB 조건부 UPDATE + affected rows 확인**을 우선 검토한다(권장 1순위). 성공은 `affected==1`로
>    판정하고, 아니면 거절한다.
> 3. 중복 키형 한도는 **UNIQUE 제약을 최종 안전망**으로 둔다. 필요하면 `SELECT … FOR UPDATE`(락 대기
>    상한 필수) 또는 분산락을 선택한다.
> 4. **외부 지급/결제/취소**는 DB에서 원자적 **예약** 후 트랜잭션 밖에서 **멱등키**로 호출한다. Rate
>    limit은 남용 방지용이며 정합성 대책이 아니다.
>
> 특정 구현(예: Redis 락)을 강제하지 않는다. 요구는 "동시 요청에서도 한도가 초과되지 않도록 원자성을
> 보장하라"이며, 방식은 위 우선순위에서 서비스에 맞게 선택한다.

---

## 직접 재현하기

```bash
git clone https://github.com/windshock/race-condition-lab
cd race-condition-lab/realstack
./run_all.sh 20   # 스택 기동 + 두 시나리오 × 전 모드 A/B + PASS/FAIL (완화 모드 누수 시 exit 1)
```

- **전체 가이드(영문/한글)** 와 전체 코드: https://github.com/windshock/race-condition-lab
- 취약 코어와 완화 모드: `realstack/app/src/main/java/com/example/claim/ClaimTxService.java`
- 모드 라우팅과 트랜잭션 밖 예외 변환: `.../ClaimService.java`

랩은 취약/비원자 락 모드를 음성 대조군으로 남겨둔다. 실제 스택이 새는 것을 보고, 이어서 DB 네이티브
수정이 막는 것을 — Redis 락 없이 — 직접 확인할 수 있다.
