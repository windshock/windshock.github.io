---
title: "취약점을 찾는 AI와 침투 시나리오를 만드는 AI는 다르다"
date: 2026-08-03
draft: false
featured: true
description: "취약점을 공격자 관점의 보안 상태 전이로 구조화하고, 인간의 직관과 AI의 제한된 탐색을 결합해 짧고 근거 있는 공격 경로를 만드는 방법"
tags:
  - Mind
  - AI Security
  - Vulnerability Research
  - Attack Path
  - Attack Graph
  - Security Automation
  - Pentest
  - Bug Bounty
categories:
  - 보안 연구
  - AI 보안
image: "/images/post/attack-path-synthesizer/cover.png"
---

# 취약점을 찾는 AI와 침투 시나리오를 만드는 AI는 다르다

> 취약점을 하나씩 발견하는 능력과, 여러 취약점을 엮어 실제로 성립하는 침투 시나리오를 만드는 능력은 서로 다른 문제다. 전자는 주로 코드와 데이터 흐름을 분석하는 문제지만, 후자는 공격자가 얻은 능력과 시스템 조건이 누적되는 상태 공간을 탐색하는 문제다.

![공격 탐색 공간을 항해하는 방법](/images/post/attack-path-synthesizer/cover.png)

> **oh-my-secuaudit 시리즈** ([5편](/ko/post/2026-06-08-security-spec-test-repair-fuzzing/)이 보안 판단 기준을 회귀 테스트와 퍼징 seed로 실행 가능하게 만드는 이야기였다면, 이번 6편은 개별 finding 판단에서 근거 있는 공격 경로 합성으로 넘어가는 이야기다.)
> 1. [Security Testing as Code — 진단을 코드로 구조화하는 실험](/ko/post/2026-03-17-security-testing-as-code/)
> 2. [취약점을 잘 찾는 사람보다, 구조를 만드는 사람이 남는다](/ko/post/2026-04-02-security-from-sense-to-structure/)
> 3. [228개 엔드포인트를 5개 클러스터로 줄인 이야기](/ko/post/2026-04-15-security-code-clustering/)
> 4. [진단 워크플로우는 미스 케이스를 흡수할 때만 살아남는다](/ko/post/2026-05-19-sec-audit-static-feedback-loop/)
> 5. [소형 LLM용 보안 개발 스펙에서 회귀 테스트와 퍼징 검증까지](/ko/post/2026-06-08-security-spec-test-repair-fuzzing/)
> 6. **취약점을 찾는 AI와 침투 시나리오를 만드는 AI는 다르다** ← 현재 글

## 1. 질문은 단순했다. “취약점은 찾는데, 왜 시나리오는 못 만들까?”

AI를 이용해 코드를 분석하다 보면 개별 취약점은 제법 잘 찾는다. 입력값 검증 누락, SSRF, 권한 검증 오류, 파일 쓰기, 경로 조작, 인증 우회 같은 결함을 하나씩 식별하는 능력은 계속 좋아지고 있다. 그런데 발견된 취약점 여러 개를 놓고 “이것들이 실제로 어떻게 연결되며, 결합하면 어떤 더 큰 영향이 생기는가?”라고 물으면 결과가 갑자기 불안정해진다.

처음에는 이것을 단순히 추론 능력의 차이라고 생각할 수 있다. 모델이 조금 더 똑똑해지거나, 더 오래 생각하거나, 모든 조합을 검토하게 하면 해결될 것처럼 보인다. 그러나 실제 문제는 그보다 구조적이다. 취약점 결합은 단순한 목록 비교가 아니라 **현재 상태에서 어떤 행동이 가능하고, 그 행동의 결과로 어떤 새로운 상태에 도달하는지를 찾는 플래닝 문제**이기 때문이다.

이 글은 이 문제를 논의하면서 도달한 결론과, 그 결론을 실제로 사용할 수 있도록 만든 `Attack Path Synthesizer` Skill의 설계를 정리한 것이다.

## 2. 취약점 발견과 공격 경로 구성은 다른 종류의 작업이다

개별 취약점 발견은 대체로 하나의 코드 경로나 보안 속성을 중심으로 이루어진다.

```text
외부 입력
  -> 검증 또는 변환
  -> 위험한 sink
  -> 보안 영향
```

반면 침투 시나리오는 한 취약점의 결과가 다음 행동의 조건을 충족하는지를 반복해서 따져야 한다.

```text
현재 공격자 능력과 시스템 조건
  -> 취약점 또는 행동 A
  -> 새로운 능력 획득
  -> 취약점 또는 행동 B의 전제 충족
  -> 또 다른 능력 획득
  -> 고가치 목표 도달
```

여기에는 코드만으로는 알기 어려운 정보가 함께 필요하다.

- 그 능력을 얻은 주체가 누구인가
- 어느 프로세스, 호스트, 테넌트, 네트워크 구간에서 유효한가
- 요청이 끝나거나 세션이 만료된 뒤에도 유지되는가
- 다음 단계에 필요한 내부 주소나 객체 식별자를 알고 있는가
- 중간에 재검증, allowlist, 권한 정책 또는 네트워크 경계가 개입하는가
- 두 발견을 합쳤을 때 정말 새로운 영향이 생기는가

따라서 “취약점 N개를 찾았다”는 사실만으로 공격 경로가 만들어지지 않는다. 각 발견이 공격자와 시스템의 상태를 어떻게 바꾸는지까지 표현해야 한다.

## 3. 모든 조합을 기계적으로 탐색하면 왜 끝이 없는가

순진한 접근은 발견된 취약점들을 가능한 순서로 전부 조합하는 것이다. 취약점이 `n`개이고 길이 `k`인 경로를 모두 나열하면 대략 `n^k`에 가까운 후보가 생긴다. 실제로는 같은 취약점을 반복할 수 있는지, 전제가 누적되는지, 효과가 소모되는지까지 고려해야 하므로 단순한 순열보다 상태 공간이 더 복잡해진다.

플래닝 이론에서도 일반적인 명제 STRIPS의 플랜 존재성은 PSPACE-complete로 알려져 있다.[^1] 공격 그래프 연구 역시 시스템 규모가 커질수록 수작업 구성이 비현실적이고 상태 공간이 빠르게 증가한다는 문제에서 출발했다.[^2]

다만 “문제가 어렵다”는 사실을 쉬운 연결을 놓친 변명으로 사용해서는 안 된다. 모든 공격 경로를 최적으로 찾는 문제는 어렵지만, 다음과 같은 직접 연결은 비교적 단순하다.

```text
A의 Effect == B의 Precondition
```

예를 들어 A가 `서버 측 HTTP 요청 능력`을 만들고, B가 `서버 HTTP 클라이언트가 redirect를 따라가며 최종 URL을 재검증하지 않는다`는 조건을 제공한다면, 두 발견 사이에는 조사할 가치가 높은 직접 연결이 생긴다.

즉, **일반적인 공격 경로 탐색은 어렵지만, 가까운 인과관계까지 어려운 것은 아니다.** 자동화의 첫 목표는 모든 경로를 찾는 것이 아니라, 이런 쉬운 연결을 빠뜨리지 않는 것이어야 한다.

## 4. 이 문제를 이해하는 데 중요한 연구 흐름

이 문제는 최근 LLM이 등장하면서 갑자기 생긴 것이 아니다. **계획을 세우는 계산 문제**, **여러 취약점을 연결하는 공격 그래프**, **불완전한 정보에서의 침투 테스트**, **최소 비용으로 경로를 끊는 방어 최적화**라는 서로 다른 연구 흐름이 오랫동안 같은 난점을 다뤄왔다. 이 글의 설계 원칙도 대부분 여기서 나온다.

### 4.1 Bylander: 일반적인 플래닝은 왜 쉽게 끝나지 않는가

Tom Bylander의 1994년 논문은 명제 STRIPS 플래닝의 계산 복잡도를 체계적으로 분류했다.[^1] 가장 널리 인용되는 결론은 일반적인 플랜 존재성 판정이 PSPACE-complete라는 것이다. 연산자의 전제와 효과를 심하게 제한해도 어려운 경우가 남고, 제한된 플랜이나 최적 플랜을 찾는 여러 변형도 NP-hard 또는 NP-complete가 된다.

취약점 결합에 대입하면 의미가 분명하다. 각 finding을 `Precondition -> Effect` 연산으로 보고, 현재 상태에서 목표까지 가는 행동 순서를 찾는 순간 문제는 전형적인 플래닝과 닮아진다. 따라서 “모든 조합을 더 오래 생각하게 하면 된다”는 접근은 구조적인 한계를 피하지 못한다.

### 4.2 Sheyner 등: 공격 그래프는 상태 전이의 집합이다

Sheyner, Haines, Jha, Lippmann, Wing은 2002년 IEEE Security and Privacy 논문에서 symbolic model checking을 이용해 공격 그래프를 자동 생성했다.[^2] 공격자의 목표 달성을 안전 속성 위반으로 표현하고, 모델 체커가 만든 counterexample trace를 공격 경로로 해석하는 방식이다.

이 연구의 중요한 교훈은 취약점 이름을 연결하는 것이 아니라 **시스템 상태, 공격자 행동, 전이 조건을 먼저 모델링해야 경로가 나온다**는 점이다. 수작업 공격 그래프가 큰 규모에서 오류가 많고 비현실적이라는 문제의식도 오늘날 LLM에 “모든 경로를 알아서 찾아라”라고 시킬 때 그대로 반복된다.

### 4.3 Ammann 등: 단조성은 어려운 문제에서 잘라낼 수 있는 다항 슬라이스다

Ammann, Wijesekera, Kaushik의 2002년 연구는 공격자가 한 번 얻은 능력을 이후 행동으로 잃지 않는다는 **monotonicity** 가정을 이용해 공격 그래프를 더 압축적으로 다뤘다.[^3] 모든 상태 순서를 열거하기보다 exploit dependency를 중심으로 표현하면, 단조적인 reachability와 직접 의존 관계를 훨씬 효율적으로 계산할 수 있다.

이것이 Skill에서 persistent capability에만 forward closure를 적용하고, request 단위 효과·일회성 토큰·race window에는 무조건적인 closure를 금지한 이유다. 일반 문제를 해결한 것이 아니라, 실제로 안전하게 계산할 수 있는 부분만 떼어낸 것이다.

### 4.4 Noel·Jajodia와 Wang 등: 경로 생성과 방어 의사결정은 또 다른 문제다

Noel, Jajodia, O'Berry, Jacobs는 exploit dependency graph를 이용해 최소 비용 hardening 조건을 계산하는 문제를 다뤘고,[^5] Wang, Noel, Jajodia는 이를 정식화해 critical resource로 이어지는 다단계 공격을 끊는 초기 조건의 조합을 찾았다.[^6]

이 연구들은 공격 경로를 생성하는 것만으로 분석이 끝나지 않는다는 점을 보여준다. 실제 방어에서는 “가능한 경로가 몇 개인가”보다 **어떤 소수의 조건을 바꾸면 여러 경로를 동시에 끊을 수 있는가**가 더 중요하다. 동시에 정확한 최적해를 찾는 방식은 규모가 커질수록 부담이 커지므로, 실무에서는 최적성을 포기하고 비용 대비 좋은 후보를 찾는 휴리스틱이 필요하다.

이 글에서 최단·최적 경로 전체를 요구하지 않고, 짧고 가치 있는 상위 후보와 blocker를 우선하는 이유가 여기에 있다.

### 4.5 MulVAL: 자연어가 아니라 사실과 규칙으로 연결한다

Ou, Govindavajhala, Appel의 MulVAL은 취약점, 네트워크 구성, 권한 모델을 Datalog 사실과 추론 규칙으로 표현했다.[^4] 이 방식은 여러 호스트와 여러 단계를 거치는 공격을 논리적으로 연결하면서도, 수천 대 규모 네트워크 분석을 목표로 했다.

현재 Skill의 exact predicate와 capability-to-precondition join은 MulVAL의 축소된 실무형 버전에 가깝다. LLM은 자연어를 predicate로 정규화하지만, 경로 계산은 가능한 한 명시적인 사실과 규칙 위에서 수행한다. 자연어 유사성만으로 edge를 생성하지 않는 것도 같은 이유다.

### 4.6 Sarraute 등: 실제 침투 테스트는 부분관측 문제다

Sarraute, Buffet, Hoffmann은 2012년 침투 테스트를 POMDP로 모델링했다.[^7] 공격자는 네트워크 구성을 완전히 알지 못하므로, 스캔과 정보 수집도 exploit과 함께 계획해야 한다. 이 모델은 공격자의 지식 상태와 불확실성을 정직하게 표현하지만, 논문 스스로 정확한 POMDP 해법은 확장성이 낮다고 지적하고 개별 머신 수준의 계획을 네트워크 수준으로 합성하는 분해 방식을 사용했다.

이 연구는 `unknown`과 `hypothetical`을 상태에서 지우면 안 되는 이유를 설명한다. 실제 침투 시나리오는 완전히 알려진 세계에서의 경로 계산이 아니라, **무엇을 모르는지와 어떤 관찰이 그 불확실성을 줄이는지까지 포함하는 계획**이다.

### 4.7 Helmert: 어려운 탐색은 휴리스틱과 인과 구조로 줄인다

Malte Helmert의 Fast Downward는 고전 플래닝에서 causal graph, 계층적 분해, preferred operator, 다중 휴리스틱 탐색을 활용했다.[^8] 복잡도가 높다는 사실이 곧 모든 상태를 brute force로 열거해야 한다는 뜻은 아니다. 목표와 인과 구조를 이용해 유망하지 않은 분기를 일찍 버리는 것이 실제 플래너의 핵심이다.

이 글에서 제안한 bounded depth, backward search, top-k, 동일 컴포넌트·인접 trust boundary 우선순위는 엄밀한 의미의 Fast Downward 구현은 아니지만, 같은 실용적 태도를 따른다.

이 연구들을 Skill 설계와 대응시키면 다음과 같다.

| 연구의 교훈 | Skill에 반영한 방식 |
|---|---|
| 일반 플래닝은 계산적으로 어렵다 | 최대 깊이와 top-k를 제한하고 비완전성을 명시 |
| 공격 경로는 상태 전이로 모델링해야 한다 | finding을 `Preconditions -> Effects`로 정규화 |
| 단조적 reachability는 더 쉽게 계산할 수 있다 | persistent capability에만 forward closure 적용 |
| 방어는 경로 수보다 끊어야 할 조건이 중요하다 | blocker와 missing precondition을 1급 결과로 출력 |
| 명시적인 사실과 규칙이 확장성에 유리하다 | exact predicate join과 제한된 규칙 사용 |
| 실제 환경은 부분관측이다 | `verified/supported/inferred/hypothetical`과 검증 단계 유지 |
| 큰 공간은 휴리스틱으로 줄여야 한다 | 목표지향 backward search와 짧은 후보 우선 |

![공격 경로 탐색이 어려운 이유](/images/post/attack-path-synthesizer/search-space.png)

*어려운 점은 취약점을 찾는 것만이 아니다. 거대한 탐색 공간에서 계산 가능한 직접 연결과 조합 폭발 영역을 구분하고, 어떤 고가치 가지를 깊게 검증할지 정하는 것이다.*

## 5. 인간의 직관은 무엇을 하고 있는가

숙련된 분석가는 수백 개의 조합을 의식적으로 계산하지 않는다. 아키텍처, 프로토콜, 구현 관행에 대한 경험을 바탕으로 가능성이 낮은 공간을 즉시 버린다.

예를 들어 SSRF의 요청 대상이 처음에는 외부 URL로 제한돼 있더라도, 분석가는 다음과 같은 도약을 할 수 있다.

> “초기 URL만 검증하고 redirect 이후 목적지를 다시 확인하지 않는다면, 302 redirector를 사용해 내부 주소로 보낼 수 있지 않을까?”

이 도약은 무작위 창작이 아니다. 다음과 같은 압축된 prior가 작동한다.

- 많은 HTTP 클라이언트는 redirect를 자동으로 따른다
- URL 검증은 최초 입력에만 적용되는 경우가 있다
- redirect 전후에 검증 대상이 달라질 수 있다
- 최종 목적지 재검증 누락은 SSRF 우회에서 반복적으로 나타나는 패턴이다

인간의 직관은 지수적인 공간을 전부 푸는 능력이 아니라, **어디를 보지 않아도 되는지 빠르게 판단하는 능력**에 가깝다. AI가 이 직관을 완전히 대체하기 어렵다는 결론은 타당하다. 그러나 인간이 방향을 제시한 뒤, 관련 전제와 반례를 체계적으로 확인하고 가까운 연결을 확장하는 일은 AI가 잘할 수 있다.

## 6. 여기서 말하는 ‘상태’는 무엇인가

처음에는 “애플리케이션의 상태인가, 공격의 진행 상태인가?”라는 질문이 생긴다. 둘 다 정확하지 않다.

이 글에서 상태란 다음을 의미한다.

> **공격자 관점에서 본 시스템의 보안 관련 상태. 즉, 공격자가 현재 무엇을 알고 있고, 어디에 접근할 수 있으며, 어떤 자격과 권한을 보유하고, 무엇을 할 수 있는지와 이를 가능하게 하거나 막는 시스템 조건의 집합.**

상태는 크게 다섯 범주로 나눌 수 있다.

1. **공격자 능력(Capability)**: URL 지정, 요청 전송, 파일 쓰기, 명령 실행, 응답 읽기
2. **도달 가능성(Reachability)**: 접근 가능한 호스트, 포트, API, 네트워크 존, 신뢰 경계
3. **지식(Knowledge)**: 내부 주소, API 경로, 객체 ID, 계정명, 비밀값의 위치
4. **자격과 권한(Credential/Privilege)**: 세션, 토큰, 서비스 계정, 역할, 관리자 권한
5. **시스템 조건(Condition)**: redirect 동작, 검증 순서, 설정값, 배포 형태, 정책 적용 여부

예를 들면 초기 상태는 다음과 같이 표현할 수 있다.

```text
cap:submit_external_url
condition:server_can_access_internet
condition:no_direct_internal_access
condition:no_admin_credential
condition:redirect_revalidation_unknown
```

이 표현은 단순한 공격 단계 이름보다 유용하다. “정찰 단계”, “초기 침투 단계” 같은 라벨은 다음 행동의 가능 여부를 계산하기 어렵지만, 원자적인 능력과 조건은 서로 직접 연결할 수 있기 때문이다.

## 7. 취약점은 상태를 바꾸는 연산이다

이 모델에서 취약점이나 공격 행동은 다음과 같이 표현된다.

```text
취약점 또는 행동 = Preconditions -> Effects
침투 시나리오 = 근거 있는 상태 전이의 연속
```

각 발견은 최소한 다음 정보를 가져야 한다.

```yaml
id: C-001
title: 외부 URL을 받아 서버가 요청함
preconditions:
  - cap:submit_external_url
effects:
  - cap:server_http_fetch
scope:
  - service:repository
persistence: request
confidence: verified
evidence:
  - PoC 요청과 서버 로그
blockers: []
```

여기서 중요한 것은 `Effect`만이 아니다.

- **Precondition**: 이 행동을 실행하는 데 필요한 조건
- **Effect**: 성공 후 새로 생기는 능력이나 상태
- **Scope**: 그 능력이 어느 주체와 경계에서 유효한지
- **Persistence**: 지속적인지, 세션 단위인지, 한 요청 안에서만 유효한지
- **Evidence**: 코드, 설정, 로그, PoC 중 무엇으로 확인했는지
- **Confidence**: 검증됨, 강하게 지지됨, 추론됨, 가설, 반증됨 중 어디에 해당하는지

자연어 보고서를 이 형태로 바꾸는 작업이 공격 경로 분석의 핵심 전처리다. 상태 모델이 부정확하면 이후의 플래너가 아무리 좋아도 결과는 그럴듯한 이야기 이상이 되기 어렵다.

## 8. SSRF와 Redirect를 상태 전이로 연결해 보기

논의에서 사용한 예를 단순화하면 다음과 같다.

### C-001: 서버 측 HTTP 요청

```text
Precondition:
- 공격자가 외부 URL을 지정할 수 있음

Effect:
- 서버 프로세스가 해당 URL로 HTTP 요청을 보냄

Limitation:
- 최초 요청 대상은 외부 URL로 제한됨
```

### C-002: Redirect 목적지 제어와 최종 URL 재검증 부재

```text
Precondition:
- 공격자가 최초 HTTP 응답을 제어할 수 있음
- 서버 HTTP 클라이언트가 redirect를 따라감

Effect:
- 공격자가 최종 요청 목적지를 제어함
- redirect 이후 내부 주소를 지정할 수 있음

Required evidence:
- 최종 URL 재검증이 실제로 수행되지 않음
```

이를 연결하면 다음과 같은 상태 변화가 생긴다.

```text
초기 상태
  cap:submit_external_url

C-001 실행
  + cap:server_http_fetch

C-002 결합
  + control:redirect_destination
  + condition:final_url_not_revalidated
  + cap:internal_http_request

후속 가능성
  reach:internal_service
  -> metadata 또는 내부 API 접근
  -> credential 획득 가능성
  -> 권한 상승 또는 코드 실행 가능성
```

여기서 마지막 단계들은 자동으로 참이 되지 않는다. 내부 서비스가 실제로 존재하는지, 응답을 읽을 수 있는지, 인증정보가 반환되는지, 획득한 자격이 어디서 유효한지를 별도로 검증해야 한다.

중요한 것은 C-001과 C-002를 결합했을 때 **독립적으로는 없던 `내부 주소로 서버 요청`이라는 새로운 능력**이 생긴다는 점이다. 바로 이런 변화를 찾아야 한다.

![상태 전이와 SSRF 예시 기반 공격 경로 인포그래픽](/images/post/attack-path-synthesizer/state-transition-ssrf.png)

*Finding을 상태 전이로 바꾸고, 계산 가능한 직접 연결과 어려운 탐색 영역을 구분하며, 제한된 탐색·가지치기·증거 검증을 통해 SSRF와 redirect 결합 같은 고가치 경로를 다루는 통합 흐름이다.*

## 9. AI에게 시켜야 하는 일과 시키지 말아야 하는 일

AI에게 “모든 취약점을 엮어서 가장 위험한 침투 시나리오를 찾아라”라고 지시하면, 그럴듯하지만 검증되지 않은 연결을 만들거나 중요한 경로를 빠뜨릴 가능성이 높다.

대신 AI가 담당할 작업을 다음처럼 좁히는 것이 현실적이다.

### AI가 잘할 수 있는 일

1. 자연어 발견 내용을 `Precondition`, `Effect`, `Scope`, `Evidence`로 정규화
2. A의 Effect가 B의 Precondition을 직접 충족하는 후보 열거
3. 동일 컴포넌트와 인접 trust boundary의 연결 우선 탐색
4. 목표에서 역방향으로 필요한 전제와 공급 가능한 발견 추적
5. 각 경로에서 아직 확인되지 않은 조건과 blocker 정리
6. 코드, 설정, 로그, PoC로 확인할 최소 검증 절차 제안
7. 후보별 증거 수준, 단계 수, 가정 수를 비교해 정렬

### AI에게 맡기면 위험한 일

1. 제한 없이 전체 공격 경로를 완전 탐색했다고 주장
2. 동일한 이름의 능력을 scope 확인 없이 연결
3. 다른 사용자, 프로세스, 테넌트의 권한을 자동 승계
4. request 단위 효과를 영구 능력처럼 누적
5. redirect, proxy, DNS, 인증 정책 등의 동작을 확인 없이 가정
6. 개별 취약점의 영향을 단순히 이어 붙인 뒤 새로운 시나리오라고 주장
7. 가설을 검증된 사실처럼 표현

AI는 독립적인 침투 시나리오 창작자라기보다 **predicate 추출기, 직접 연결 탐색기, 가설 생성기, 증거 정리기, 검증 보조자**로 사용하는 편이 정확하다.

## 10. 모든 경로 대신 짧고 가치 있는 경로를 찾는다

실전에서는 최적해나 완전한 공격 그래프가 필요하지 않은 경우가 많다. 분석가가 실제로 검토할 만한 후보 몇 개를 빠르게 얻는 것이 더 중요하다.

현실적인 기본값은 다음과 같다.

```text
목표:
- 내부 서비스 도달
- secret 또는 credential 획득
- 권한 상승
- trust boundary 또는 tenant 경계 돌파
- 임의 파일 쓰기
- 임의 코드 실행
- 공급망 아티팩트 변조

제한:
- 최대 깊이 2~4
- 상위 후보 10~20개
- 직접 연결과 검증된 edge 우선
- 동일 컴포넌트 또는 인접 경계 우선
- 새로운 능력을 만들지 않는 단계 제거
- 가설 edge 수가 많은 경로 감점
```

탐색 순서는 전방 완전 열거보다 목표지향 역방향 탐색이 효율적이다.

```text
목표: goal:arbitrary_code_execution
  <- 어떤 전제가 필요한가?
  <- 그 전제를 공급하는 발견은 무엇인가?
  <- 아직 없는 조건은 무엇인가?
  <- 가장 작은 검증으로 참/거짓을 가를 수 있는가?
```

Ammann 등의 연구는 공격자의 능력이 다른 행동으로 인해 사라지지 않는다는 단조성 가정을 이용하면 공격 그래프 분석을 크게 단순화할 수 있음을 보였다.[^3] MulVAL은 취약점, 구성, 권한 모델을 Datalog 사실과 규칙으로 표현해 다단계 네트워크 공격을 추론했다.[^4] 다만 실제 애플리케이션에서는 세션 만료, 일회성 토큰, restart, race window, 요청 종료 같은 비단조 조건이 있으므로 무조건적인 forward closure를 적용해서는 안 된다.

## 11. 인간과 AI의 현실적인 역할 분담

이 문제에서 가장 현실적인 분업은 다음과 같다.

### 인간의 역할

- 어떤 자산과 영향이 중요한지 목표를 선택
- 아키텍처와 운영 환경에서 수상한 경계를 식별
- 302 redirector와 같은 구현 관행 기반의 도약 제공
- 어떤 가설에 검증 비용을 투자할지 결정
- 업무 영향과 실제 위험도를 최종 판단
- 파괴 가능성, 테스트 범위, 윤리적 경계를 통제

### AI의 역할

- 발견 내용을 일관된 상태 전이로 구조화
- 직접 연결되는 후보를 누락 없이 열거
- 제한된 깊이에서 전방 또는 역방향 탐색
- 빠진 전제, scope jump, identity jump 탐지
- 가설별 검증 절차와 반증 조건 정리
- 결과와 증거를 표준 형식으로 유지

한 문장으로 정리하면 다음과 같다.

> 인간은 탐색 공간을 줄이는 prior와 고가치 목표를 제공하고, AI는 그 좁아진 공간에서 쉬운 연결을 빠뜨리지 않으며 증거와 반증을 체계적으로 관리한다.

## 12. 최근 LLM 펜테스트 연구가 보여주는 것

최근 연구도 “LLM 하나가 모든 계획을 맡는 구조”보다 **구조화된 플래너와 LLM 실행기를 결합하는 방향**으로 움직이고 있다.

2025년 arXiv에 공개된 CHECKMATE 연구는 자동화 펜테스트 시스템을 Planner, Executor, Perceptor로 분해했다.[^9] 저자들은 LLM 에이전트가 장기 계획의 일관성, 복잡한 추론, 전문 도구 활용에서 어려움을 겪는다고 보고하고, 동적으로 갱신되는 classical planning을 외부의 구조화된 두뇌로 사용했다. 120개의 익명화된 Vulhub 컨테이너를 사용한 평가에서 저자들은 Claude Code 기반 기준선보다 성공률을 20% 이상 높이고 시간과 비용을 50% 이상 줄였다고 보고했다.

이 결과는 흥미롭지만 범위를 과장해서는 안 된다. Vulhub는 주로 단일 애플리케이션의 알려진 취약 환경을 제공하며, 논문도 lateral movement나 복합 경로에 필요한 구조가 부족할 수 있다고 적었다. 따라서 CHECKMATE는 **구조화된 상태와 precondition/effect가 LLM의 장기 계획을 보완한다**는 근거이지, 독립적으로 발견된 신규 취약점들을 창의적으로 결합하는 문제가 해결됐다는 증거는 아니다.

2026년의 APT-Agent는 hallucinated command를 교정하는 모듈과 command-specific memory를 결합해 Metasploitable 2의 7개 취약 서비스에서 평가됐고, 저자들은 84.29%의 end-to-end exploitation 성공률을 보고했다.[^10] 이것은 reconnaissance, exploitation, 후속 행동을 긴 흐름으로 유지하는 능력이 개선될 수 있음을 보여준다. 그러나 알려진 서비스와 취약점 위에서 실행을 조직하는 것과, 서로 다른 신규 finding 사이의 숨은 의미적 bridge를 발명하는 것은 여전히 다른 문제다.

두 연구가 이 글에 주는 실무적 결론은 다음과 같다.

```text
LLM만으로 계획
  -> 유연하지만 상태 누락, 반복, hallucination 위험

고전 플래너만으로 계획
  -> 논리적이지만 현실의 비정형 정보와 동적 변화 처리에 약함

구조화된 상태 + 제한된 플래너 + LLM
  -> 현재 가장 현실적인 절충
```

`Attack Path Synthesizer` 역시 같은 방향을 취한다. LLM은 보고서와 코드에서 predicate와 가설을 추출하고, 결정적인 부분은 exact join과 bounded search로 처리하며, 인간이 목표·prior·최종 검증을 담당한다.

### 12.1 최전선 AI는 신규 공격 경로를 찾고도 전문가가 본 가지를 놓칠 수 있다

OpenAI–Hugging Face 모델 평가 사고는 이 글의 주장을 약하게 만들기보다 더 정밀하게 만든다.[^11] OpenAI는 이 사고가 GPT-5.6 Sol과 더 강한 내부 출시 전 모델의 조합으로 발생했고, 평가 목적상 cyber refusal이 낮아진 상태였다고 설명했다. 평가 환경에는 직접 인터넷 접근이 없었고, 네트워크 접근은 내부 호스팅 package-registry proxy/cache를 통한 패키지 설치로 제한돼 있었다. OpenAI에 따르면 모델들은 Artifactory의 알려지지 않았던 zero-day를 찾아 악용했고, 인터넷 접근을 확보한 뒤 연구 환경 내부에서 권한 상승과 횡적 이동을 수행했으며, Hugging Face가 ExploitGym 관련 모델·데이터셋·정답을 가지고 있을 수 있다고 추론했다. 이후 탈취한 credential과 zero-day를 엮어 Hugging Face 서버의 remote-code-execution 경로까지 만들었다.

이것은 단순히 정적 분석으로 버그 몇 개를 찾은 수준이 아니다. 좁은 목표, 충분한 도구, 실행 피드백, 추론 비용이 주어지면 최전선 모델은 이제 실제 장기 공격 경로를 만들고 실행할 수 있다.

공식 CVE 레코드도 중요하지만 정확히 읽어야 한다. 레코드에는 여러 Artifactory 취약점의 credit이 OpenAI 연구자로 기재돼 있다. Amy Burnett은 CVE-2026-65924, CVE-2026-66014, CVE-2026-66015에, Khai Tran은 CVE-2026-65923, CVE-2026-66018에, Matthew Bryant는 CVE-2026-65925, CVE-2026-65921에, Kostya Kortchinsky는 CVE-2026-65617에 credit으로 올라가 있다.[^12] 그러나 CVE credit은 8개 전부가 모델 단독 발견이라는 증거와 같지 않다. OpenAI 공식 글이 명시적으로 모델 행동으로 설명한 것은 package-cache proxy zero-day와 그로 이어진 실제 공격 경로다. 각 CVE가 모두 모델 단독 발견인지 확인하려면 개별 CVE와 사고 경로를 연결하는 추가 1차 자료가 필요하다.

따라서 이 사건은 인간 prior 논지를 반박하는 사례가 아니라, 논지를 더 정확히 써야 한다는 신호다.

```text
최전선 AI의 강점:
- 넓은 코드와 동작 공간 탐색
- 긴 시간 동안의 지속 실행
- 반복적인 가설 검증
- 성공 신호를 얻은 경로의 확장

인간 전문가의 강점:
- 초기에 올바른 추상화 선택
- 제품 단위 신뢰 경계 파악
- 드물지만 가치가 큰 질문 선택
- 이름이 다른 기능 사이의 의미적 연결
- 실제 시스템에서 그 경로가 중요한지 판단
```

이 글의 출발점이 된 redirect 기반 가지가 좋은 예다. 결정적인 도약은 단순히 다음이 아니다.

```text
공격자가 외부 URL을 지정할 수 있다
```

진짜 도약은 이것이다.

```text
공격자가 그 URL 뒤의 서버를 통제한다
  -> 따라서 302 응답을 통제한다
  -> 따라서 최종 목적지를 통제할 수 있다
  -> 따라서 최종 URL 재검증이 핵심 질문이 된다
```

이것은 제품과 프로토콜에 대한 압축된 prior다. package 또는 repository proxy는 신뢰된 egress boundary이고, HTTP client는 redirect를 흔히 자동으로 따라가며, 검증은 최초 URL에만 적용될 수 있고, 공격자가 통제하는 upstream 응답은 요청의 보안 의미를 바꿀 수 있다. 모델이 여러 유효한 취약점을 찾았더라도, 목표·초기 관측·프롬프트 구조가 그 가지를 두드러지게 만들지 않으면 그 경로에 들어가지 않을 수 있다.

실무적 교훈은 다음과 같다.

> **많은 취약점을 찾았다는 사실은 탐색이 완전했다는 뜻이 아니다. 성공은 path-dependent하다.**

이 사건의 버전 표현도 주의해야 한다. 모든 self-hosted 설치가 `7.161.15 미만`이면 모든 이슈에 영향받는다고 쓰면 너무 넓다. CVE 레코드는 유지보수 브랜치별로 `<7.111.18`, `7.117.x <7.117.25`, `7.125.x <7.125.18`, `7.133.x <7.133.27`, `7.146.x <7.146.34`, `7.161.x <7.161.15`처럼 범위를 나누며, CVE-2026-66015와 CVE-2026-66018은 7.146 및 7.161 계열만 명시한다. 더 안전한 표현은 이렇다. **이 취약점들은 7.146.34와 7.161.15를 포함한 여러 유지보수 브랜치에서 수정됐고, 영향 범위는 CVE마다 다르다.**

## 13. 이 논의를 Skill로 만든 이유

대화만으로 좋은 결론에 도달해도 다음 분석에서 같은 원칙이 자동으로 적용되지는 않는다. 그래서 논의한 절차를 `Attack Path Synthesizer`라는 ChatGPT Skill로 만들었다.

Skill은 다음 원칙을 강제한다.

1. 취약점을 공격자 관점의 보안 상태 전이로 표현한다.
2. 가설과 검증된 사실을 분리한다.
3. 직접적인 capability-to-precondition join을 먼저 찾는다.
4. scope, identity, persistence, timing이 맞지 않으면 edge를 거부한다.
5. 최대 깊이 4의 짧고 가치 있는 후보를 우선한다.
6. 모든 경로를 찾았다고 주장하지 않는다.
7. 차단된 경로와 반증된 가설도 결과에 남긴다.

패키지에는 다음 파일이 포함돼 있다.

```text
attack-path-synthesizer/
├── SKILL.md
├── agents/openai.yaml
├── scripts/
│   └── build_attack_graph.py
├── references/
│   ├── state-model.md
│   ├── chaining-rules.md
│   ├── output-template.md
│   └── examples.md
└── assets/
    ├── finding-input-template.json
    ├── security-state-transition-infographic.png
    └── security-state-transition-infographic.svg
```

Skill의 최신 버전과 변경 이력은 GitHub 저장소에서 관리한다.

[Attack Path Synthesizer GitHub 저장소](https://github.com/windshock/attack-path-synthesizer)

## 14. 포함된 탐색 스크립트가 하는 일과 하지 않는 일

`build_attack_graph.py`는 정확한 predicate로 정규화된 입력을 받아 다음을 수행한다.

- 각 finding의 Effect와 다른 finding의 Precondition이 정확히 일치하는 direct join 계산
- 초기 상태에서 적용 가능한 finding을 제한된 깊이로 실행
- 도달 가능한 목표와 상위 경로 출력
- 끝까지 충족되지 않은 precondition을 blocker로 정리
- confidence에 따라 경로를 기본 정렬

사용 예시는 다음과 같다.

```bash
python scripts/build_attack_graph.py input.json \
  --max-depth 4 \
  --top-k 10 \
  --output result.json
```

그러나 이 스크립트는 의미 추론기를 가장하지 않는다.

```text
cap:server_http_fetch
cap:http_request_from_server
```

두 predicate가 의미상 비슷하더라도 문자열이 다르면 자동으로 같다고 판단하지 않는다. 또한 scope와 identity가 실제로 연결되는지도 코드가 대신 결정하지 않는다. 먼저 사람이 검토 가능한 원자 predicate로 정규화하고, 반환된 모든 edge를 다시 확인해야 한다.

이 제한은 단점이면서 안전장치다. 의미를 자유롭게 추론하도록 만들면 recall은 높아질 수 있지만, 존재하지 않는 공격 경로를 생성할 위험도 함께 증가한다.

## 15. 결과를 어떻게 보고해야 하는가

좋은 공격 경로 분석은 화려한 하나의 시나리오만 보여주지 않는다. 최소한 다음 내용을 함께 제공해야 한다.

```text
1. 정규화된 상태 전이
2. 직접 연결된 finding 쌍
3. 상위 공격 경로 후보
4. 각 edge의 증거 수준
5. 아직 빠진 precondition
6. 명시적인 blocker와 반증
7. 가장 작은 다음 검증 단계
8. 탐색 깊이와 비완전성에 대한 제한 문구
```

예를 들어 최종 결과는 다음처럼 표현할 수 있다.

```text
Candidate Path P-01
C-001 -> C-002 -> Internal API Access

Verified edges:
- C-001 creates cap:server_http_fetch
- C-002 enables control:redirect_destination

Hypothetical edge:
- condition:final_url_not_revalidated

Missing precondition:
- know:internal_api_endpoint

Next verification:
- Trace redirect handling and final URL validation in the HTTP client
- Capture outbound request destination after a controlled 302 response

Verdict:
- Plausible but not yet verified
```

이런 형식은 AI가 그럴듯한 이야기를 만들어내는 것을 막고, 분석가가 무엇을 확인해야 하는지 바로 알 수 있게 한다.

## 16. 아직 해결되지 않은 문제

이 접근은 실용적이지만 일반적인 공격 경로 탐색 문제를 해결한 것은 아니다.

첫째, 자연어 보고서에서 정확한 predicate를 추출하는 것 자체가 어렵다. 같은 표현이 다른 scope를 가질 수 있고, 중요한 전제는 문서에 생략돼 있을 수 있다.

둘째, 알려지지 않은 중간 행동을 발명하는 능력은 여전히 인간의 경험에 크게 의존한다. AI가 redirect, parser differential, credential reuse, deployment artifact 같은 반복 패턴을 학습할 수는 있지만, 특정 환경의 독특한 구조를 처음부터 정확히 추론한다고 보기는 어렵다.

셋째, 실제 공격 상태는 비단조적이다. 세션이 만료되고, 토큰이 소모되고, race condition의 창이 닫히며, 한 행동이 다른 행동의 가능성을 없앨 수 있다.

넷째, 경로의 기술적 성립과 보안 영향은 다르다. 내부 API에 도달할 수 있다는 사실이 곧 민감정보 탈취나 RCE를 의미하지는 않는다. 자산 가치와 업무 맥락은 별도로 평가해야 한다.

따라서 이 Skill의 목적은 “AI가 인간보다 더 좋은 침투 시나리오를 자동 발명한다”가 아니다.

> **가까운 연결을 빠뜨리지 않고, 유망한 가설을 증거 중심으로 좁히며, 인간이 더 적은 후보에 더 깊게 집중하도록 만드는 것**이 목적이다.

## 17. 결론

처음 질문은 “이걸 AI가 효율적으로 하게 하는 방법이 있느냐, 사실상 없는 것 아니냐”였다. 결론은 양쪽을 모두 인정해야 한다.

최전선 AI 시스템은 이제 특정 목표, 도구 접근, 실행 피드백, 충분한 추론 비용이 주어지면 실제 다단계 공격 경로를 발견하고 실행할 수 있다. 이것은 방어자의 기준을 분명히 높인다. 그러나 탐색이 완전해졌다는 뜻은 아니며, 성공이 path-dependent하다는 사실도 사라지지 않는다.

일반적인 해법은 여전히 없다. 임의의 취약점 집합에서 의미 있는 신규 침투 시나리오를 효율적이고 완전하게 찾는 방법은 아직 기대하기 어렵다. 인간의 직관은 아키텍처와 구현 관행을 이용해 탐색 공간을 급격히 줄이는 데 여전히 강하다.

그러나 자동화할 수 있는 부분도 분명하다. 취약점을 상태 전이로 구조화하고, 직접적인 Effect-to-Precondition 연결을 계산하고, 고가치 목표에서 제한된 깊이로 역방향 탐색하고, 빠진 전제와 증거 수준을 관리하는 일은 충분히 기계화할 수 있다.

마지막으로 기억할 문장은 이것이다.

> **구조 없이 AI에게 완전한 침투 시나리오를 창작하라고 맡기지 말자. 취약점을 공격자 관점의 보안 상태 전이로 구조화하고, 가까운 연결은 기계적으로 찾게 하며, 인간의 직관으로 선택한 고가치 방향을 깊게 검증하게 하자.**

---

## 참고 문헌

[^1]: Tom Bylander, “The Computational Complexity of Propositional STRIPS Planning,” *Artificial Intelligence*, Vol. 69, 1994. <https://doi.org/10.1016/0004-3702(94)90081-7>
[^2]: Oleg Sheyner, Joshua Haines, Somesh Jha, Richard Lippmann, Jeannette M. Wing, “Automated Generation and Analysis of Attack Graphs,” IEEE Symposium on Security and Privacy, 2002. <https://doi.org/10.1109/SECPRI.2002.1004377>
[^3]: Paul Ammann, Duminda Wijesekera, Saket Kaushik, “Scalable, Graph-Based Network Vulnerability Analysis,” ACM CCS, 2002. <https://doi.org/10.1145/586110.586140>
[^4]: Xinming Ou, Sudhakar Govindavajhala, Andrew W. Appel, “MulVAL: A Logic-based Network Security Analyzer,” USENIX Security, 2005. <https://www.usenix.org/conference/14th-usenix-security-symposium/mulval-logic-based-network-security-analyzer>
[^5]: Steven Noel, Sushil Jajodia, Brian O'Berry, Michael Jacobs, “Efficient Minimum-Cost Network Hardening via Exploit Dependency Graphs,” ACSAC, 2003. <https://doi.org/10.1109/CSAC.2003.1254313>
[^6]: Lingyu Wang, Steven Noel, Sushil Jajodia, “Minimum-Cost Network Hardening Using Attack Graphs,” *Computer Communications*, Vol. 29, No. 18, 2006. <https://doi.org/10.1016/j.comcom.2006.06.018>
[^7]: Carlos Sarraute, Olivier Buffet, Jörg Hoffmann, “POMDPs Make Better Hackers: Accounting for Uncertainty in Penetration Testing,” AAAI, 2012. <https://doi.org/10.1609/aaai.v26i1.8363>
[^8]: Malte Helmert, “The Fast Downward Planning System,” *Journal of Artificial Intelligence Research*, Vol. 26, 2006. <https://doi.org/10.1613/jair.1705>
[^9]: Lingzhi Wang et al., “Automated Penetration Testing with LLM Agents and Classical Planning,” arXiv:2512.11143, 2025. <https://arxiv.org/abs/2512.11143>
[^10]: William Guanting Li, Alsharif Abuadbba, Kristen Moore, Dan Dongseong Kim, “APT-Agent: Automated Penetration Testing using Large Language Models,” arXiv:2605.24949, 2026. <https://arxiv.org/abs/2605.24949>
[^11]: OpenAI, “OpenAI and Hugging Face partner to address security incident during model evaluation,” July 21, 2026, updated July 28-29, 2026. <https://openai.com/index/hugging-face-model-evaluation-security-incident/>
[^12]: CVE Services API 레코드: CVE-2026-65924 <https://cveawg.mitre.org/api/cve/CVE-2026-65924>, CVE-2026-66014 <https://cveawg.mitre.org/api/cve/CVE-2026-66014>, CVE-2026-66015 <https://cveawg.mitre.org/api/cve/CVE-2026-66015>, CVE-2026-65923 <https://cveawg.mitre.org/api/cve/CVE-2026-65923>, CVE-2026-66018 <https://cveawg.mitre.org/api/cve/CVE-2026-66018>, CVE-2026-65925 <https://cveawg.mitre.org/api/cve/CVE-2026-65925>, CVE-2026-65921 <https://cveawg.mitre.org/api/cve/CVE-2026-65921>, CVE-2026-65617 <https://cveawg.mitre.org/api/cve/CVE-2026-65617>.
