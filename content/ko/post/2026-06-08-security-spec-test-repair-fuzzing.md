---
title: "소형 LLM용 보안 개발 스펙에서 회귀 테스트와 퍼징 검증까지"
date: 2026-06-08
draft: false
featured: true
tags: ["AI", "LLM", "DevSecOps", "보안 자동화", "구조 설계", "Fuzzing", "Jazzer", "Jest", "JUnit", "Software Testing", "Code"]
categories: ["보안 연구", "AI"]
description: "소형 로컬 모델에서도 동작하는 XSS 보안 개발 스펙을 core/verify/dev/test 오버레이로 나누고, LLM 판정을 회귀 테스트 생성과 Jazzer/Jazzer.js 퍼징 서버의 seed로 연결하는 과정에서 얻은 설계 교훈과 한계를 정리한다."
---

<!--
이미지 제안:
![LLM security spec to test repair and fuzzing workflow](/images/post/llm-security-spec-test-repair-fuzzing.webp)
-->

> **oh-my-secuaudit 시리즈** ([4편](/ko/post/2026-05-19-sec-audit-static-feedback-loop/)이 진단 워크플로우가 미스를 흡수하며 살아남는 이야기였다면, 이번 5편은 그 판정 기준 자체를 회귀 테스트와 퍼징 seed로 바꿔 실행 가능하게 만드는 이야기다.)
> 1. [Security Testing as Code — 진단을 코드로 구조화하는 실험](/ko/post/2026-03-17-security-testing-as-code/)
> 2. [취약점을 잘 찾는 사람보다, 구조를 만드는 사람이 남는다](/ko/post/2026-04-02-security-from-sense-to-structure/)
> 3. [228개 엔드포인트를 5개 클러스터로 줄인 이야기](/ko/post/2026-04-15-security-code-clustering/)
> 4. [진단 워크플로우는 미스 케이스를 흡수할 때만 살아남는다](/ko/post/2026-05-19-sec-audit-static-feedback-loop/)
> 5. **소형 LLM용 보안 개발 스펙에서 회귀 테스트와 퍼징 검증까지** ← 현재 글

## 1. 출발점: 취약점을 많이 찾는 모델이 아니라, 같은 기준으로 판단하는 모델

최근 나는 소형 로컬 모델에서도 동작할 수 있는 보안 개발 스펙을 만들고 있었다. 목표는 LLM에게 단순히 "이 코드가 XSS에 취약한가?"라고 묻는 것이 아니었다. 더 정확한 목표는 개발자와 AI가 같은 XSS 합격/불합격 기준을 쓰도록 만들고, 여러 모델이 같은 코드 조각을 보고 취약, 안전, 증거 부족을 얼마나 일관되게 판정하는지 비교하는 것이었다.

이 프로젝트에서 중요한 것은 "취약점을 많이 찾는 모델"이 아니었다. 오히려 핵심은 "보이지 않는 코드를 추정하지 않고, 제한된 컨텍스트 안에서 일관되게 판정하는 모델"을 찾는 것이었다. 실제 보안 리뷰에서는 보이지 않는 sanitizer, validator, middleware, template, Content-Type, 호출 경로를 모델이 상상해서 채우면 안 된다. 그런 모델은 그럴듯한 설명은 잘하지만, 보안 판단의 재현성은 낮다.

처음에는 XSS 보안 표준이 하나의 큰 문서 안에 모두 섞여 있었다. 개발자가 읽어야 하는 가이드, 보안 진단자가 쓰는 검증 루브릭, LLM 평가에 필요한 판정 규칙이 한 파일 안에 같이 들어 있었다. 사람에게는 어느 정도 읽힐 수 있지만, 소형 모델에게는 부담이 컸다. 전체 스펙을 그대로 판정 프롬프트에 넣으면 작은 모델은 쉽게 무너졌고, 반대로 판정에 필요한 규칙만 압축해 주면 훨씬 안정적으로 동작했다.

그래서 XSS 스펙을 다음과 같이 나누었다.

```text
spec/
  core/xss-core.md          ← SSOT: 프레임워크 무관 XSS 규범 규칙
  verify/xss-judge.md       ← 검증 오버레이: 판정 절차, verdict, 증거 규율
  dev/nextjs-vercel.md      ← 개발 오버레이: Next.js/Vercel 안전 작성 패턴
  dev/spring.md             ← 개발 오버레이: Spring 안전 작성 패턴
  test/intent-schema.md     ← 테스트 생성 오버레이: LLM이 출력할 intent JSON
  test/junit5-xss.md        ← JUnit5/MockMvc 테스트 작성 규칙
```

이 구조에서 가장 중요한 원칙은 **규칙의 본문은 core에만 존재한다**는 것이다. 개발 오버레이, 검증 오버레이, 테스트 생성 오버레이(core 규칙을 용도별로 덧씌우는 얇은 문서 층)는 core의 규칙 ID를 인용한다. 이렇게 하면 개발 문서와 판정 문서가 따로 진화하면서 서로 어긋나는 drift를 줄일 수 있다.

이것은 단순히 문서를 줄이는 작업이 아니었다. 같은 보안 표준을 사람이 읽을 때, 모델이 판정할 때, 개발자가 코드를 작성할 때, 그리고 테스트 생성기가 실행 가능한 검증으로 바꿀 때 서로 다른 형태로 사용할 수 있게 나누는 작업이었다.

## 2. Core, Verify, Dev, Test의 역할

`core/xss-core.md`는 XSS 방어의 단일 진실 원천(SSOT)이다. 예를 들어 query string, path variable, request body, form field, header, cookie, 외부 API, webhook, message queue, file upload, batch import 데이터는 모두 신뢰할 수 없는 값으로 본다. 이 값들은 출력 시점에 컨텍스트별 방어를 거쳐야 한다.

또한 core는 입력 검증과 XSS 방어를 명확히 구분한다. 입력 검증은 형태 제한일 뿐이며, XSS 방어는 출력 시점의 컨텍스트별 인코딩 또는 검증된 sanitizer로 완료되어야 한다. HTML 본문, HTML 속성, URL 속성, JavaScript 문자열, CSS 값, HTML 조각, JSON 응답, redirect는 서로 다른 출력 컨텍스트이며, 각각 필요한 방어가 다르다.

예를 들어 URL과 redirect는 단순히 React나 템플릿 엔진이 escape해 준다고 안전해지지 않는다. URL은 렌더링 또는 이동 전에 파싱하고 정규화(canonicalize)한 뒤, 허용 scheme과 host/path를 검증해야 한다. `javascript:`, `data:`, `vbscript:`는 기본 차단하고, protocol-relative URL인 `//evil.example/path` 같은 값도 차단해야 한다.

`verify/xss-judge.md`는 이런 core 규칙을 코드 리뷰 판정 절차로 바꾼다. 이 문서는 모델에게 다음 절차를 요구한다.

```text
1. 값의 출처가 신뢰 불가인지 확인한다.
2. 출력 컨텍스트를 확정한다.
3. 컨텍스트별 MUST 방어가 코드에 보이는지 확인한다.
4. 금지 sink에 신뢰 불가 값이 도달하는지 확인한다.
5. sanitizer나 validator가 있다면 구현과 정책이 보이는지 확인한다.
6. CSP, WAF, 프레임워크 기본 escape만으로 안전하다고 추정하지 않는다.
```

판정 라벨은 세 개로 고정했다.

```text
CONFIRMED_VULNERABLE
FALSIFIED_SAFE
NOT_ENOUGH_EVIDENCE
```

여기서 `NOT_ENOUGH_EVIDENCE`는 실패가 아니다. 오히려 보이지 않는 코드를 추정하지 않는 모델인지 확인하는 중요한 정답이다. 예를 들어 `safeHtml`이라는 변수명이 있어도 sanitizer 구현과 정책이 보이지 않으면 안전하다고 결론내리면 안 된다.

`dev/nextjs-vercel.md`와 `dev/spring.md`는 판정 기준이 아니라 개발자가 처음부터 안전하게 작성하도록 돕는 작성 가이드다. 예를 들어 Next.js/Vercel 오버레이는 신뢰할 수 없는 `searchParams`, `params`, request body, formData, headers, cookies, 외부 API/CMS 콘텐츠, webhook, Edge Config 값을 기본적으로 JSX text interpolation으로 렌더링하라고 안내한다.

```tsx
// Good
<div>{searchParams.q ?? ''}</div>

// Avoid
<div dangerouslySetInnerHTML={{ __html: searchParams.q ?? '' }} />
```

또한 `router.push`, `redirect`, `NextResponse.redirect`에는 `searchParams`, `request.nextUrl.searchParams`, `formData`, cookie 값을 직접 넣지 않고, 정적 경로 또는 allowlist를 통과한 내부 경로만 넣도록 한다.

```ts
const ALLOWED_PATHS = new Set(['/dashboard', '/profile']);

export function toSafeInternalPath(v?: string | null) {
  if (!v || !v.startsWith('/') || v.startsWith('//') || !ALLOWED_PATHS.has(v)) {
    return '/dashboard';
  }
  return v;
}
```

이렇게 core는 규범, verify는 판정, dev는 개발 기본값을 담당한다. 그리고 test overlay는 LLM의 판정을 실행 가능한 회귀 테스트로 연결하는 역할을 맡는다.

## 3. 소형 모델 실험: 스펙을 줄이면 작은 모델도 따라온다

스펙을 나눈 뒤에는 로컬 모델들이 이 구조를 얼마나 잘 따르는지 실험했다. 실행 환경은 Apple M1 Pro 16GB와 MLX-LM이었다. MLX-LM은 Apple Silicon에서 로컬 모델을 반복 호출하기에 적합했고, prompt cache를 이용해 고정된 판정 스펙을 반복 주입하는 비용을 줄일 수 있었다.

실험에서 중요한 관찰은 다음이었다. 작은 모델이 항상 약한 것은 아니었다. 작은 모델이 따라갈 수 있는 형태로 스펙을 바꾸면 꽤 안정적으로 동작했다. 긴 자연어 가이드를 그대로 넣는 것보다, core 규칙과 judge 절차를 분리해 주는 것이 효과적이었다.

특히 `Qwen2.5-Coder-3B`는 코드 취약점 판단용으로 좋은 결과를 보였다. 작은 모델인데도 XSS 판정 스펙을 잘 따라갔고, JSON 출력도 비교적 안정적이었다. 이 지점에서 "소형 모델 기반 보안 판정기"는 충분히 가능해 보였다.

하지만 이것은 어디까지나 판정이었다. 실제 개발 보안 자동화로 가려면 판정 결과가 실행 가능한 검증으로 이어져야 했다.

## 4. 왜 회귀 테스트를 생성하게 했는가

내가 만들고 싶었던 것은 단순한 LLM 보안 판정기가 아니었다. 최종 목표는 **Jazzer/Jazzer.js 기반 중앙 퍼징 서버와 LLM을 결합한 보안 검증 흐름**이었다.

현재 레포에서 검증한 것은 다음이다.

```text
1. XSS 보안 스펙을 core/verify/dev/test 구조로 분리한다.
2. LLM이 core+verify를 이용해 코드 조각을 판정한다.
3. LLM이 테스트 의도(intent)를 JSON으로 출력한다.
4. deterministic renderer가 JUnit5 또는 Jest 회귀 테스트를 생성한다.
5. 생성된 테스트를 취약 구현과 수정 구현에 대해 차등 실행한다.
6. discriminating test와 payload를 Jazzer/Jazzer.js 퍼징 서버의 seed로 넘긴다.
```

여기서 아직 구상 또는 다음 단계인 부분은 중앙 퍼징 서버가 개발 PC나 CI agent로 테스트 bundle을 보내고, 개발 PC에서 regression test와 fuzzing을 실행한 뒤 crash input, corpus, coverage를 다시 중앙 서버로 회수하는 흐름이다. 즉 현재 글에서 설명하는 "중앙 퍼징 서버"는 완성된 구현이라기보다, 지금의 회귀 테스트 생성 실험이 향하는 운영 아키텍처다.

Jazzer를 고려한 이유는 명확하다. Jazzer는 JVM용 coverage-guided in-process fuzzer이며, JUnit 5와 통합해 `@FuzzTest`를 실행할 수 있다. 이 특성은 개발자가 기존 테스트 환경 안에서 regression mode와 fuzzing mode를 연결하기 좋다. 그러나 현재 `security-spec` 레포의 검증된 구현은 `@FuzzTest` renderer가 아니라, **JUnit5/MockMvc와 Jest 회귀 테스트 renderer**다. Jazzer/Jazzer.js는 생성 테스트와 payload를 넘겨받는 다음 검증 단계로 보는 것이 정확하다.

## 5. 회귀 테스트 생성 eval: 차등 실행

회귀 테스트 생성 eval은 라벨 일치만 보는 verify eval과 다르다. 생성된 테스트를 실제로 실행해 채점한다. 채점 기준은 차등 실행(differential execution)이다.

```text
취약 구현 → FAIL
수정 구현 → PASS

discriminates = (vuln→fail) ∧ (safe→pass)
```

둘 다 pass하거나 둘 다 fail하면 무가치한 테스트다. Java 트랙에서는 JUnit Platform ConsoleLauncher의 exit code를 사용하고, JS/TSX 트랙에서는 Jest exit code를 사용한다.

Java 트랙은 JUnit5 `@WebMvcTest` 기반이며, jbang과 ConsoleLauncher로 실행한다. Maven 프로젝트 전체를 구성하지 않고도 fixture와 생성 테스트를 주입해 실행할 수 있도록 했다. JS/TSX 트랙은 Jest, jsdom, react-dom/server, Babel 기반 하니스를 사용한다.

대상은 `llm-eval/cases.jsonl` 중 `CONFIRMED_VULNERABLE`과 `FALSIFIED_SAFE`에 해당하는 13개 케이스다. `NOT_ENOUGH_EVIDENCE` 케이스는 정의된 취약/안전 동작이 없기 때문에 test-gen 대상에서 제외하고, verify eval에는 그대로 유지한다.

Java는 7개 케이스이고, JS/TSX는 6개 케이스다. JS/TSX는 `domresult`, `domhref`, `reacthtml`, `reactscript`의 4개 시나리오로 묶인다. 따라서 결과를 설명할 때는 "Java 7 + JS/TSX 6 = 전체 13개 test-gen 대상"과 "JS 4개 시나리오"를 구분해야 한다.

## 6. raw 코드 생성에서 발생한 문제

처음에는 모델에게 Java/JUnit/MockMvc 회귀 테스트 코드를 직접 생성하게 했다. `Qwen2.5-Coder-3B`는 취약점 판단 자체는 꽤 잘했지만, raw 테스트 코드 생성에서는 한계가 보였다. 그래서 7B, 14B로 모델을 올려가며 실험했다.

`Qwen2.5-Coder-14B`는 raw-Java 기준으로 로직은 7/7에 가까웠다. 그러나 표면 결과는 4/7이었다. 실패한 3개는 모두 컴파일 실패였고, 원인은 동일했다. 마지막 `andExpect(content().string(not(containsString(...))))` 구문에서 닫는 괄호 하나가 빠졌다.

문제의 형태는 대략 다음과 같았다.

```java
// 의도는 맞지만 컴파일되지 않는 형태
mockMvc.perform(get("/search").param("q", "<script>alert(1)</script>"))
    .andExpect(status().isOk())
    .andExpect(content().string(containsString("&lt;script&gt;alert(1)&lt;/script&gt;")))
    .andExpect(content().string(not(containsString("<script>alert(1)</script>")));
```

마지막 줄에는 닫는 괄호가 하나 부족하다. 정상 형태는 다음과 같다.

```java
// 컴파일 가능한 형태
mockMvc.perform(get("/search").param("q", "<script>alert(1)</script>"))
    .andExpect(status().isOk())
    .andExpect(content().string(containsString("&lt;script&gt;alert(1)&lt;/script&gt;")))
    .andExpect(content().string(not(containsString("<script>alert(1)</script>"))));
```

중요한 점은 이 실패가 XSS 판단 실패가 아니었다는 것이다. 보안 판단은 맞았다. payload도 맞았다. assertion 의도도 맞았다. 실패의 원인은 Java 테스트 산출물이 컴파일 가능한 형태로 안정적으로 만들어지지 못한 것이었다.

더 흥미로운 점은 1-shot repair loop도 효과가 없었다는 것이다. 여기서 중요한 점은 temperature 0 자체가 아니다. 같은 모델과 같은 프롬프트, 같은 decoding 조건이면 같은 출력이 반복되는 것은 예상 가능한 일이다. 실제로 중요한 관찰은 compile error를 수리 프롬프트에 넣었는데도 raw-code repair만으로는 같은 구조적 오류가 안정적으로 제거되지 않았다는 점이다. 모델은 자신의 오류를 고치기보다 같은 assertion shape을 다시 생성했다.

이 문제는 다음처럼 분리해야 한다.

```text
보안 판단 실패:
- payload가 틀림
- safe fixture와 vulnerable fixture를 구분하지 못함
- 잘못된 expected output을 선택함
- XSS context를 잘못 분류함

산출물 생성 실패:
- 괄호 누락
- import 누락
- Java string escaping 오류
- assertion chain 문법 오류
- test class 구조 오류
- Jest matcher 문법 오류
```

이번 케이스는 두 번째였다. 모델이 보안을 이해하지 못한 것이 아니라, 모델에게 맡기지 않아도 되는, 문법이 까다로운 산출물 생성을 맡기고 있었던 것이다.

## 7. 관련 연구: LLM test generation과 repair

이 문제를 해결하기 위해 관련 연구를 찾아보면, 보안 취약점 분석 논문만으로는 부족하다. 더 가까운 분야는 LLM 기반 unit test generation, test repair, fuzz harness generation이다.

### 7.1 MultiFileTest: multi-file 테스트 생성에서 executability 오류는 핵심 병목이다

MultiFileTest는 기존 LLM unit test generation benchmark가 주로 function, class, single-file 수준에 머문다는 한계를 지적하고, Python, Java, JavaScript의 multi-file 프로젝트를 대상으로 평가하는 benchmark를 제안한다. 이 논문은 여러 최신 대형 모델(frontier LLM)을 평가했고, 대부분의 모델이 multi-file setting에서 제한적인 성능을 보였으며, Java가 세 언어 중 가장 어렵다고 설명한다. 특히 advanced model도 executability error와 연쇄 오류(cascade error)를 낸다고 보고하고, 이를 manual fixing과 LLM self-fixing 시나리오로 다시 평가한다. (세부 수치는 출처 판본에 따라 달라질 수 있어 본문에서는 구체적 수치를 인용하지 않는다.) [2]

이 연구는 내 문제와 가깝다. 내 실험에서도 모델은 보안 의도는 맞췄지만, 실제 Java 테스트 산출물은 컴파일되지 않았다. 즉 "모델이 XSS 판단을 못했다"가 아니라 "프로젝트에서 실행 가능한 테스트 artifact를 안정적으로 만들지 못했다"는 설명이 더 정확했다. MultiFileTest의 error analysis가 보여주는 Java의 syntax-heavy executability error, JavaScript의 mismatched parentheses, missing imports, Jest framework compliance 문제는 내가 JUnit/Jest test-gen에서 만난 실패와 같은 계열의 문제다.

### 7.2 YATE: 잘못된 테스트를 버리지 말고 repair하라

YATE는 LLM이 생성한 unit test가 syntax와 semantics 양쪽에서 잘못되는 경우가 많다고 지적한다. 하지만 그런 테스트를 바로 버리면 좋은 기회를 놓치는 셈이 된다. 잘못된 테스트라도 underlying program logic을 겨냥하고 있는 경우가 많고, 고치면 실제 테스트 가치가 있기 때문이다. YATE는 rule-based static analysis와 re-prompting을 결합해 일부 잘못된 테스트를 repair하는 방식을 제안한다. [3]

내 케이스에서도 실패한 테스트는 버릴 대상이 아니었다. assertion 의도와 payload가 맞았기 때문에, 괄호 하나만 고치면 discriminating test로 사용할 수 있었다. 따라서 이 실패는 모델 성능 실패로 집계하기보다 repair 가능한 artifact 오류로 분리하는 것이 맞았다.

### 7.3 TestART: template-based repair와 반복 수리 실패

TestART는 LLM 기반 unit test generation의 문제로 compilation/runtime error, coverage feedback 부족, 반복적인 repair 실패를 든다. 이 논문은 generation과 repair iteration을 함께 개선하는 구조를 제안하며, template-based repair strategy를 사용해 LLM이 만든 test case의 오류를 고친다고 설명한다. [4]

내 실험에서 compile error를 수리 프롬프트에 넣었는데도 raw-code repair만으로는 같은 구조적 오류가 안정적으로 제거되지 않은 것은 이 문제와 닮아 있다. LLM에게 계속 "고쳐라"라고 시키는 것이 항상 답은 아니다. 알려진 문법 오류, 반복되는 assertion chain 오류, import 누락 같은 문제는 rule이나 template 기반으로 고치는 것이 더 안정적이다.

### 7.4 SecureCode v2.0: 보안 코딩 지식을 multi-turn dataset으로 구조화하는 흐름

SecureCode v2.0도 관련 배경으로 볼 수 있다. 이 논문은 security-aware code generation model을 학습시키기 위한 production-grade dataset을 제안한다. 공개 초록 기준으로 데이터셋은 다수의 security-focused coding example로 구성되며, train/validation/test로 분할된다. 또한 여러 프로그래밍 언어와 다수의 vulnerability category를 다룬다. 각 예제는 기본 구현에서 고급 보안 고려와 defense-in-depth guidance로 이어지는 multi-turn conversational structure를 사용한다. (구체적 예제 수·언어 수는 출처 판본에 따라 다를 수 있어 본문에서는 인용하지 않는다.) [5]

이 방향은 보안 개발 지식이 단순한 vulnerable/secure snippet pair만으로 충분하지 않다는 점을 보여준다. 개발자의 요구, 취약한 구현, 안전한 구현, 공격 시나리오, 운영 방어까지 이어지는 흐름이 중요하다는 것이다.

다만 SecureCode v2.0은 주로 security-aware code generation model을 학습시키기 위한 dataset이다. 내가 다루는 문제는 조금 다르다. 나는 보안 개발 스펙을 소형 로컬 모델이 판정할 수 있는 core/verify 구조로 나누고, 그 판단을 회귀 테스트와 Jazzer/Jazzer.js 퍼징 seed로 연결하려고 했다. 따라서 SecureCode v2.0은 중요한 관련 흐름이지만, 실행 가능한 test artifact의 compile reliability 문제를 직접 해결하는 연구는 아니다.

### 7.5 LLM 기반 fuzz harness 생성 연구와의 연결

Java library fuzzing harness generation 연구도 연결된다. coverage-guided fuzzing은 효과적이지만, library code를 fuzzing하려면 유효한 API 호출로 fuzzer input을 변환하는 harness가 필요하고, 이를 수동으로 작성하려면 많은 지식이 필요하다. 관련 연구들은 LLM-powered agent를 research, synthesis, compilation repair, coverage analysis, refinement 같은 단계로 나누고, coverage feedback을 사용해 harness를 개선한다. [6]

또 다른 Java 취약점 발견 연구인 GONDAR는 sink-centric fuzzing 구조를 제안한다. 먼저 CWE-specific scanning과 LLM-assisted static filtering으로 reachable/exploitable sink를 찾고, coverage-guided fuzzer와 agent가 함께 target call site와 exploit condition을 만족하는 입력을 탐색한다. [7]

이 연구들은 내가 구상한 중앙 퍼징 서버 + LLM 구조와 맞닿아 있다. LLM이 모든 것을 직접 해결하는 것이 아니라, fuzzer, compiler, static analysis, coverage feedback, repair agent가 각자의 역할을 맡고, LLM은 그 사이의 의도 생성과 해석을 담당한다.

## 8. 적용한 설계: LLM은 intent만 만들고, 코드는 renderer가 만든다

이 문제를 해결하기 위해 적용한 구조는 단순하다. LLM에게 JUnit이나 Jest 테스트 전체를 직접 쓰게 하지 않는다. LLM은 테스트 의도만 JSON으로 출력한다. JUnit/MockMvc나 Jest 코드의 문법은 deterministic renderer(같은 입력이면 늘 같은 코드를 만드는 고정 템플릿)가 생성한다.

현재 레포의 intent schema는 일부러 작게 유지한다. 모델이 요청 경로, HTTP method, controller class, component 이름, import, annotation, matcher chain까지 모두 출력하지 않는다. 이 값들은 시나리오에 고정되어 있고, renderer가 알고 있다. 모델의 역할은 구분력 있는 payload와 올바른 check type을 고르는 것이다.

이 선택에는 분명한 대가가 있다. 모델이 구조를 만들지 않는 대신, 누군가는 scenario metadata를 미리 작성해야 한다. endpoint, method, parameter name, component prop, fixture binding은 자동으로 생기지 않는다. 현재 실험은 이 정보를 사람이 작성한 fixture와 scenario contract가 제공하는 조건에서 성립한다.

```json
{
  "payload": "요청 파라미터에 넣을 공격 문자열",
  "check_type": "html_escaped | raw_absent | redirect_blocked | json_content_type",
  "safe_target": "/dashboard"
}
```

`safe_target`은 `redirect_blocked`일 때만 필요하다.

### 8.1 HTML 본문/조각: html_escaped

HTML 본문이나 HTML 조각에 입력이 반영되는 케이스에서는 `html_escaped`를 사용한다. 현재 renderer는 원본 payload가 응답에 그대로 없어야 하고, fixture가 기대하는 HTML escape 형태가 있어야 한다는 assertion을 만든다. 이 assertion은 현재 fixture pair를 구분하기 위한 회귀 검증 기준(regression oracle)이지, 모든 안전한 HTML 인코딩 표현을 허용하는 범용 정합성 기준(conformance oracle)은 아니다. 여기서 oracle은 테스트의 합격/불합격을 판정하는 기준을 뜻한다.

```json
{
  "payload": "<script>alert(1)</script>",
  "check_type": "html_escaped"
}
```

renderer는 시나리오별 endpoint를 알고 있으므로, 예를 들어 `GET /search?q=`에 payload를 넣고 다음과 같은 JUnit assertion을 생성할 수 있다.

```java
mockMvc.perform(get("/search").param("q", "<script>alert(1)</script>"))
    .andExpect(status().isOk())
    .andExpect(content().string(not(containsString("<script>alert(1)</script>"))))
    .andExpect(content().string(containsString("&lt;script&gt;alert(1)&lt;/script&gt;")));
```

여기서 괄호, import, `@WebMvcTest`, `MockMvc` 주입, endpoint 바인딩은 모델이 만들지 않는다. renderer가 만든다.

### 8.2 JavaScript 실행 컨텍스트: raw_absent

값이 `<script>` 본문, JavaScript 문자열, inline event handler 같은 실행 컨텍스트에 들어갈 때는 `html_escaped`가 아니라 `raw_absent`를 사용한다. HTML entity encoding은 JavaScript 실행 컨텍스트의 방어가 아니기 때문이다.

```json
{
  "payload": "</script><script>alert(1)</script>",
  "check_type": "raw_absent"
}
```

renderer는 원본 공격 문자열이 응답에 그대로 없어야 한다는 assertion을 만든다.

```java
mockMvc.perform(get("/search").param("q", "</script><script>alert(1)</script>"))
    .andExpect(status().isOk())
    .andExpect(content().string(not(containsString("</script><script>alert(1)</script>"))));
```

이렇게 check type을 분리하면 모델이 "HTML escaping이 되어 있으니 JS context도 안전하다"는 잘못된 일반화를 줄일 수 있다.

### 8.3 Redirect: redirect_blocked

redirect 대상 검증에서는 `redirect_blocked`를 사용한다. 현재 fixture에서는 위험한 redirect target을 넣었을 때 안전 기본 경로로 이동하도록 작성되어 있으므로, renderer는 그 remediation 동작을 regression oracle로 사용한다.

```json
{
  "payload": "//evil.example/path",
  "check_type": "redirect_blocked",
  "safe_target": "/dashboard"
}
```

renderer는 시나리오별로 정해진 redirect endpoint를 호출하고, Location header가 `safe_target`인지 확인한다.

```java
mockMvc.perform(post("/login").param("next", "//evil.example/path"))
    .andExpect(status().is3xxRedirection())
    .andExpect(header().string("Location", "/dashboard"));
```

### 8.4 JSON 응답: json_content_type

JSON 응답이 HTML 페이지로 잘못 렌더링되면 XSS 위험이 생길 수 있다. 이런 경우에는 `json_content_type`을 사용한다. 다만 이 check는 JSON 응답이 HTML로 오용되지 않도록 보는 최소 회귀 조건이며, `X-Content-Type-Options: nosniff`나 호출 경로 전체의 안전성을 대신 증명하지 않는다.

```json
{
  "payload": "<svg/onload=alert(1)>",
  "check_type": "json_content_type"
}
```

renderer는 Content-Type이 `application/json`인지 확인한다.

```java
mockMvc.perform(get("/api/search").param("q", "<svg/onload=alert(1)>"))
    .andExpect(status().isOk())
    .andExpect(content().contentTypeCompatibleWith("application/json"));
```

## 9. Deterministic renderer 예시

Deterministic renderer는 같은 intent와 같은 scenario metadata를 넣으면 항상 같은 테스트 코드를 생성하는 고정 템플릿이다. 여기서 scenario metadata는 endpoint, method, parameter name, test class, fixture binding 같은 정보를 말한다. 이 정보는 모델이 출력하지 않는다.

다음은 단순화한 Python renderer 예시다.

```python
def java_string(value: str) -> str:
    return (
        value
        .replace("\\", "\\\\")
        .replace("\"", "\\\"")
        .replace("\n", "\\n")
        .replace("\r", "\\r")
    )

def html_escape_for_assertion(value: str) -> str:
    return (
        value
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )

def render_mockmvc_assertions(intent: dict, scenario: dict) -> str:
    payload = intent["payload"]
    check_type = intent["check_type"]

    method = scenario["method"]
    path = scenario["path"]
    param = scenario["param"]

    if method != "GET":
        raise ValueError("This simplified renderer only shows GET examples.")

    request = f'get("{java_string(path)}").param("{java_string(param)}", "{java_string(payload)}")'

    lines = []
    lines.append(f"mockMvc.perform({request})")
    lines.append("    .andExpect(status().isOk())")

    if check_type == "html_escaped":
        escaped = html_escape_for_assertion(payload)
        lines.append(f'    .andExpect(content().string(not(containsString("{java_string(payload)}"))))')
        lines.append(f'    .andExpect(content().string(containsString("{java_string(escaped)}")))')

    elif check_type == "raw_absent":
        lines.append(f'    .andExpect(content().string(not(containsString("{java_string(payload)}"))))')

    elif check_type == "json_content_type":
        lines.append('    .andExpect(content().contentTypeCompatibleWith("application/json"))')

    else:
        raise ValueError(f"Unsupported check_type: {check_type}")

    lines[-1] += ";"
    return "\n".join(lines)
```

이 방식에서는 `.andExpect(content().string(not(containsString(...))))`의 괄호 개수를 모델이 결정하지 않는다. renderer가 항상 동일한 구조로 만든다. 따라서 raw code generation에서 발생한 괄호 누락, import 누락, annotation 오류 같은 문제를 줄일 수 있다.

Jest에서도 같은 원칙을 적용한다. 모델은 Jest 코드를 직접 쓰지 않고, payload와 check type만 낸다. renderer는 `test()`, `expect()`, `toHaveAttribute()`, `not.toHaveAttribute()`, `toContain()`, `not.toContain()` 같은 제한된 matcher set만 사용한다.

예를 들어 DOM href 시나리오에서 intent가 다음과 같다고 하자.

```json
{
  "payload": "javascript:alert(1)",
  "check_type": "raw_absent"
}
```

renderer는 시나리오 metadata를 이용해 다음과 같은 Jest 테스트를 생성할 수 있다.

```ts
test('domhref blocks unsafe href scheme', () => {
  document.body.innerHTML = '<a id="go"></a>';

  renderLink(document.getElementById('go'), 'javascript:alert(1)');

  const link = document.getElementById('go');
  expect(link?.getAttribute('href')).not.toBe('javascript:alert(1)');
});
```

실제 레포의 JS 하니스는 `test-eval/js/` 아래에서 Jest, jsdom, react-dom/server, Babel for TSX, isomorphic-dompurify를 사용한다. 이 블로그의 코드는 개념을 설명하기 위한 축약 예시다.


## 10. Renderer oracle이 증명하는 것과 증명하지 않는 것

이 구조에서 가장 조심해야 할 점은 renderer가 만드는 assertion 자체도 하나의 oracle이라는 사실이다. Intent와 renderer를 분리했다고 해서 테스트가 곧바로 범용 보안 정합성 증명이 되는 것은 아니다. 현재 renderer는 hand-authored fixture pair와 scenario contract 안에서 취약 구현과 수정 구현을 구분하는 regression oracle을 만든다.

예를 들어 `html_escaped`가 `containsString("&lt;script&gt;...")`를 요구하면, 현재 fixture처럼 `&lt;` 계열 escaping을 사용하는 safe implementation은 통과한다. 하지만 numeric character reference인 `&#60;script&#62;`나 `&#x3c;script&#x3e;`, 또는 DOM text node 기반 렌더링처럼 다른 안전 표현을 쓰는 구현은 실패할 수 있다. 이 경우 테스트는 실제 XSS 안전성을 부정한 것이 아니라, 우리가 정한 특정 remediation 형태와 일치하지 않는다고 판단한 것이다.

`redirect_blocked`도 마찬가지다. `Location == /dashboard`를 요구하면, 400으로 요청을 거부하거나 `/` 같은 다른 허용 내부 경로로 보내는 안전한 구현은 실패할 수 있다. 따라서 이 check는 "외부 redirect가 불가능하다"는 semantic property를 완전히 검증한다기보다, 현재 fixture의 안전 동작을 회귀적으로 고정한다.

`json_content_type` 역시 최소 조건이다. Content-Type이 `application/json`인지 확인하는 것은 HTML 페이지로 잘못 렌더링되는 오용을 막는 데 도움이 되지만, `nosniff` header나 클라이언트 쪽 삽입 경로까지 증명하지는 않는다.

따라서 현재 결과는 다음처럼 해석해야 한다.

```text
과장된 해석:
- 3B 모델이 범용 XSS conformance test를 만들 수 있다.

정확한 해석:
- 현재 정의한 13개 hand-authored fixture/scenario 범위에서는
  3B 모델이 payload와 check_type을 안정적으로 고르고,
  deterministic renderer가 컴파일 가능한 discriminating regression test를 만들 수 있었다.
```

이 한계는 약점이지만, 동시에 다음 작업의 방향을 분명하게 한다. `html_escaped`는 특정 문자열 비교보다 DOM parsing 기반의 textContent 검증으로 확장할 수 있다. `redirect_blocked`는 `Location == safe_target`뿐 아니라 external absolute URL, protocol-relative URL, unsafe scheme 부재를 확인하는 property-based oracle로 넓힐 수 있다. `json_content_type`은 `nosniff`와 클라이언트 삽입 경로 검증을 추가할 수 있다.

즉 현재 renderer는 "보안 의미를 완전히 증명하는 엔진"이 아니라, "정의된 fixture와 scenario 안에서 안정적인 regression oracle을 생성하는 엔진"이다. 이 범위를 명확히 해야 한다.

## 11. Scenario metadata authoring이라는 남은 비용

Intent/renderer 구조가 잘 작동하는 이유는 renderer가 많은 것을 이미 알고 있기 때문이다. 요청 경로, HTTP method, parameter name, controller class, React component prop, fixture binding, vulnerable/safe variant는 모델이 출력하지 않는다. 이 정보는 scenario metadata로 주어진다.

이것은 구조 전체를 떠받치는 핵심 전제다. 모델이 raw 코드를 직접 쓰지 않아도 되는 대신, 시스템은 미리 작성된 scenario contract에 의존한다. 현재 실험에서는 이 조건이 명시적으로 제공된다. 그래서 결과의 의미는 "임의의 실제 코드베이스에서 자동으로 모든 테스트를 만들었다"가 아니라, "사전 정의된 scenario 안에서 소형 모델이 test intent를 안정적으로 고를 수 있었다"에 가깝다.

임의의 실제 코드베이스로 확장하려면 다음 문제가 남는다.

```text
- source/sink/context를 누가 찾는가?
- endpoint, method, parameter name을 누가 추출하는가?
- React component prop이나 route handler 입력을 누가 scenario로 바꾸는가?
- vulnerable/safe fixture pair가 없는 실제 코드에서는 differential oracle을 어떻게 만들 것인가?
- unsafe mutation을 자동 생성할 것인가?
- patch candidate를 만들어 safe counterpart로 삼을 것인가?
- renderer oracle을 특정 remediation이 아니라 semantic property에 가깝게 어떻게 넓힐 것인가?
```

이 부분은 중앙 퍼징 서버의 핵심 연구 과제다. LLM judge, SAST, framework analyzer, route extractor, mutation engine, renderer가 함께 동작해야 실제 코드 일반화가 가능하다.

## 12. Jazzer/Jazzer.js와의 연결: 현재 구현과 다음 단계 구분

현재 레포에서 검증된 것은 `intent JSON → JUnit/Jest deterministic renderer → differential execution`이다. 이 결과로 얻은 discriminating test와 payload는 Jazzer/Jazzer.js 퍼징 서버의 seed로 넘기는 구조를 목표로 한다.

따라서 다음 코드는 현재 레포에 구현된 renderer가 아니라, 다음 단계에서 추가할 수 있는 `@FuzzTest` renderer 설계 예시다.

```java
import com.code_intelligence.jazzer.junit.FuzzTest;

import static org.junit.jupiter.api.Assertions.*;

class SafeRedirectsFuzzTest {
  @FuzzTest
  void safe_redirect_path_should_remain_internal(String input) {
    String result = SafeRedirects.toSafeInternalPath(input);

    assertNotNull(result);
    assertTrue(result.startsWith("/"));
    assertFalse(result.startsWith("//"));
    assertFalse(result.contains(":"));
  }
}
```

이런 `@FuzzTest`는 회귀 테스트 renderer와 같은 방식으로 deterministic하게 만들 수 있다. 하지만 현재 단계에서는 이 예제를 "구현 완료"가 아니라 "확장 설계"로 보는 것이 정확하다. 지금 중요한 검증 결과는 더 단순하다. LLM이 raw Java/Jest 코드를 직접 만들지 않고 intent만 만들게 했을 때, 작은 모델인 `Qwen2.5-Coder-3B`로도 현재 정의한 Java 7개와 JS/TSX 6개, 총 13개 test-gen 대상에서 컴파일 가능한 discriminating regression test를 만들 수 있었다는 점이다.

## 13. 중앙 퍼징 서버 아키텍처

이 구조를 확장하면 다음과 같은 아키텍처가 된다.

```text
[중앙 서버]
  ├─ 보안 스펙 core/verify/dev/test 관리
  ├─ LLM judge 실행
  ├─ test intent 생성
  ├─ JUnit/Jest renderer 실행
  ├─ 테스트 bundle 생성
  └─ 개발 PC 또는 CI agent에 전달

[개발 PC / CI agent]
  ├─ 테스트 bundle 수신
  ├─ JUnit/Jest 회귀 테스트 실행
  ├─ Jazzer/Jazzer.js seed로 payload 전달
  ├─ 필요 시 fuzzing mode 실행
  ├─ crash input / corpus / coverage 수집
  └─ 중앙 서버로 결과 전송

[중앙 서버 + LLM]
  ├─ compile error와 semantic failure 분류
  ├─ test intent 오류와 renderer 오류 분리
  ├─ crash input 의미 분석
  ├─ 새로운 payload 또는 seed 제안
  └─ 다음 regression/fuzzing round 생성
```

이때 중요한 것은 역할 분리다.

```text
LLM:
- 보안 의도 생성
- source/sink/context/defense 해석
- test intent 생성
- crash input 의미 해석
- missing evidence 판단

Renderer:
- JUnit/Jest 코드 생성
- import, 괄호, annotation, matcher 고정
- language/framework-specific boilerplate 처리

Compiler/Test Runner:
- compile_ok 확인
- differential execution 수행
- regression pass/fail 확인

Fuzzer:
- coverage-guided input mutation
- crash input 저장
- corpus 확장
```

이렇게 나누면 LLM이 잘하는 일과 deterministic tool이 잘하는 일이 분리된다. 각 단계가 자신이 가장 잘하는 작업만 맡고, LLM은 그 사이의 의도 생성과 해석에 집중한다.

## 14. Metric도 분리해야 한다

이번 실험에서 얻은 중요한 교훈은 metric도 분리해야 한다는 것이다. compile fail을 그대로 discriminate fail로 섞으면 모델의 보안 판단 능력을 잘못 평가하게 된다.

추천 metric은 다음과 같다.

```text
intent_valid:
  LLM이 올바른 보안 테스트 의도를 생성했는가?

schema_ok:
  LLM이 intent schema를 지켰는가?

render_compile_ok:
  renderer가 생성한 테스트 코드가 현재 하니스에서 컴파일되는가?

discriminate_ok:
  테스트가 vulnerable fixture와 safe fixture를 실제로 구분하는가?

fuzz_seed_ready:
  생성된 payload와 테스트가 Jazzer/Jazzer.js seed로 넘길 수 있는 형태인가?

semantic_fail:
  컴파일은 되지만 assertion 의미가 틀렸는가?

artifact_fail:
  보안 의도는 맞지만 raw code artifact가 깨졌는가?
```

raw Java에서 발생한 괄호 누락 케이스는 다음처럼 분류해야 한다.

```text
intent_valid: true
raw_render_compile_ok: false
repair_by_simple_patch: true
discriminate_ok_after_patch: true
failure_type: artifact_fail
```

이 분류가 있어야 모델을 잘못 평가하지 않는다. 14B 모델이 보안 판단을 못한 것이 아니라, Java artifact 생성에서 문법 오류를 낸 것이다. 반대로 intent+renderer 구조에서는 문법이 까다로운 산출물 생성을 모델에서 제거했기 때문에, 3B 모델로도 더 안정적인 결과를 얻을 수 있었다.

## 15. Cross-domain problem reframing으로 본 의미

이번 경험이 흥미로웠던 이유는 문제를 다른 분야의 언어로 다시 볼 수 있었기 때문이다. 처음에는 XSS 회귀 테스트 실패처럼 보였다. 그러나 생성물을 직접 열어보니 XSS 판단은 맞고, 테스트 코드 문법이 깨진 문제였다. 그래서 관련 문제를 찾을 때 보안 취약점 분석 논문만 볼 것이 아니라, LLM 기반 unit test generation, test repair, fuzz harness generation, coverage-guided fuzzing 연구를 함께 봐야 했다.

이것이 내가 말하는 cross-domain problem reframing이다. 문제를 보안 분야 안에서만 해결하려고 하면 "더 큰 모델이 필요하다"는 결론으로 가기 쉽다. 하지만 테스트 생성 분야의 언어로 보면 "LLM-generated test artifact의 compile error를 어떻게 repair하고, 어떻게 template화할 것인가"라는 문제가 된다. 그러면 해결책은 모델 크기 증가가 아니라, test intent와 executable artifact를 분리하는 구조로 바뀐다.

여기서 intent/renderer 분리 자체가 완전히 새로운 패턴이라는 뜻은 아니다. 구조화 출력, constrained decoding, function calling, template-based code generation은 이미 LLM 엔지니어링에서 널리 쓰이는 패턴이다. 이 사례에서 중요했던 것은 목적지가 아니라 경로였다. 처음에는 XSS 판정 실패처럼 보였던 현상을 LLM-generated unit test artifact의 executability 문제로 다시 분류했고, 그 결과 test repair 문헌의 언어로 해결책을 찾을 수 있었다.

이번 사례의 핵심은 다음 문장으로 요약할 수 있다.

> 모델을 더 똑똑하게 만드는 것보다, 모델이 실수하지 않아도 되는 구간을 시스템 밖으로 빼내는 것이 더 효과적일 때가 있다.

보안 자동화에서도 이 원칙은 중요하다. SAST가 잘하는 일은 SAST에게 맡기고, compiler가 잘하는 일은 compiler에게 맡기며, fuzzer가 잘하는 일은 fuzzer에게 맡기는 것이 낫다. LLM은 판단, 의도 생성, 증거 해석, 그리고 다른 분야의 문제 해결 프레임을 가져오는 데 집중할 때 더 강해진다.

## 16. 결론

소형 로컬 모델에서도 동작하는 보안 개발 스펙을 만들려면, 단순히 프롬프트를 짧게 줄이는 것만으로는 부족하다. 규범의 single source of truth, 판정 오버레이, 개발 오버레이, 테스트 생성 오버레이를 분리해야 한다. 그리고 판정 결과를 실제 검증으로 연결하려면 회귀 테스트와 fuzzing seed 생성까지 이어져야 한다.

하지만 LLM에게 테스트 코드 전체를 직접 쓰게 하면, 보안 의도는 맞아도 컴파일되지 않는 산출물이 나올 수 있다. 이 문제는 보안 판단 실패가 아니라 LLM-generated test artifact reliability 문제다. 관련 연구들은 LLM 테스트 생성에서 compilation error, runtime error, repair loop, template-based repair가 중요한 문제임을 보여준다.

따라서 현재 결론은 "3B면 XSS 테스트 생성이 일반적으로 충분하다"가 아니다. 더 정확히는 "현재 정의한 13개 test-gen fixture와 scenario contract 안에서는, raw code를 생성하는 14B보다 intent만 생성하는 3B가 더 안정적이고 비용 효율적이었다"이다.

요약하면 LLM은 테스트 의도를, renderer는 JUnit/Jest 코드를, compiler와 test runner는 코드 유효성과 차등 실행을, fuzzer는 추가 입력 탐색을 맡고, 그 결과를 다시 LLM이 해석해 다음 round를 설계한다(13절 역할 분리 표). 이 구조의 요점은 LLM 사용량을 줄이는 것이 아니라 LLM을 더 정확한 위치에 배치하는 것이며, 보안 자동화에서 cross-domain problem reframing이 추상적 구호가 아니라 실질적 설계 원칙으로 바뀌는 지점이라고 생각한다.

## References

[1] Code Intelligence, "Jazzer: Coverage-guided, in-process fuzzing for the JVM." GitHub. https://github.com/CodeIntelligenceTesting/jazzer

[2] Yibo Wang et al., "MultiFileTest: A Multi-File-Level LLM Unit Test Generation Benchmark and Impact of Error Fixing Mechanisms." arXiv, 2025. https://arxiv.org/abs/2502.06556

[3] Michael Konstantinou et al., "YATE: The Role of Test Repair in LLM-Based Unit Test Generation." arXiv, 2025. https://arxiv.org/abs/2507.18316

[4] Siqi Gu et al., "TestART: Improving LLM-based Unit Testing via Co-evolution of Automated Generation and Repair Iteration." arXiv, 2024. https://arxiv.org/abs/2408.03095

[5] Scott Thornton, "SecureCode v2.0: A Production-Grade Dataset for Training Security-Aware Code Generation Models." arXiv, 2025. https://arxiv.org/abs/2512.18542

[6] Nils Loose et al., "Coverage-Guided Multi-Agent Harness Generation for Java Library Fuzzing." arXiv, 2026. https://arxiv.org/abs/2603.08616

[7] Fabian Fleischer et al., "Contextualizing Sink Knowledge for Java Vulnerability Discovery." arXiv, 2026. https://arxiv.org/abs/2604.01645
