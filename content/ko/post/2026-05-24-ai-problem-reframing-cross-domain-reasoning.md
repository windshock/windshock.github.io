---
title: "AI가 진짜 새로워지는 순간: 답을 찾을 때가 아니라 문제를 다시 쓸 때"
date: 2026-05-24
draft: false
featured: true
tags: ["TrustAndCulture", "AI", "LLM", "Cross-Domain Reasoning", "사이버보안", "Exploit Reasoning", "구조적 사고"]
categories: ["Security", "AI", "Policy"]
description: "나이팅게일 신화, 화이트해커 담론, Sterbenz lemma, 브라우저 exploit reasoning을 통해 LLM의 진짜 변화가 지식 검색이 아니라 문제 재정의에 있음을 살펴본다."
summary: "LLM이 정말 흥미로워지는 순간은 정답을 찾아낼 때가 아니라 한 도메인의 실패를 다른 도메인의 해결 가능한 문제로 다시 쓸 때다. 나이팅게일-화이트해커 서사와 Sterbenz-exploit reasoning은 모두 cross-domain problem reframing이라는 같은 질문으로 연결된다."
image: ""
---

> AI가 진짜 새로워지는 순간은 답을 찾을 때가 아니다.  
> **문제를 다시 쓸 때다.**

처음에는 전혀 다른 두 이야기가 있었다.

하나는 플로렌스 나이팅게일과 화이트해커에 관한 이야기였다. 사회는 왜 제도 실패를 개인의 헌신과 윤리로 번역하는가. 왜 구조의 문제는 자주 영웅 서사로 바뀌는가.

다른 하나는 LLM과 exploit reasoning에 관한 이야기였다. 여기서 exploit reasoning은 취약점을 실제 공격 흐름으로 이어 붙일 수 있는지 따져보는 사고 과정을 말한다. LLM이 Sterbenz lemma를 알고 있다는 사실이 중요한가, 아니면 exploit chain, 즉 취약점에서 실제 효과까지 이어지는 여러 단계가 실패하는 이유를 `precision loss`(숫자를 담거나 계산하는 과정에서 정보가 잘리는 현상)와 `numeric representation`(컴퓨터가 숫자를 어떤 형식으로 담는가)의 문제로 다시 프레이밍했다는 점이 중요한가.

둘은 멀어 보인다.

하나는 사회적 서사와 정책 윤리의 문제이고, 다른 하나는 브라우저 exploit, floating-point arithmetic, GPU observable, Sterbenz lemma의 문제다. 브라우저 exploit은 브라우저 취약점을 실제 공격 흐름으로 연결하는 작업이고, floating-point arithmetic은 컴퓨터가 실수를 근사해 계산하는 방식이다. GPU observable은 GPU 계산의 결과가 화면, 시간 차이, 렌더링 차이처럼 밖에서 관찰 가능한 흔적으로 남는 경우를 뜻한다.

그런데 둘은 같은 질문으로 연결된다.

```text
표면적으로 무관해 보이는 도메인 사이에서,
숨은 구조적 병목을 찾아내고,
그 문제를 다른 도메인의 언어로 다시 쓸 수 있는가?
```

나는 이것을 **cross-domain problem reframing**, 즉 **분야를 건너 문제를 다시 쓰는 일**이라고 부르고 싶다.

이 글의 평가 기준은 “LLM이 답을 맞혔는가”가 아니다. 더 중요한 질문은 **누가 먼저 문제의 프레임을 바꾸었는가**이다. 그래서 마지막에는 결과물보다 timeline, 즉 누가 어느 시점에 어떤 전환을 먼저 했는지를 보는 기준으로 돌아온다.

---

## 1. 지식 검색과 문제 재정의는 다르다

LLM을 볼 때 우리는 자주 “무엇을 알고 있는가”에 집중한다.

- 이 모델은 어떤 논문을 아는가?
- 어떤 취약점 이름을 기억하는가?
- 어떤 수학 정리를 떠올리는가?
- 어떤 API 사용법을 설명할 수 있는가?

물론 중요하다. 하지만 더 중요한 순간은 따로 있다.

모델이 이미 주어진 질문에 답하는 것이 아니라, 질문 자체를 다른 형태로 바꾸는 순간이다.

예를 들어 “Sterbenz lemma가 뭐야?”라고 물었을 때 모델이 다음처럼 답하는 것은 그렇게 놀랍지 않다.

```text
Sterbenz lemma는 부동소수점 산술에서 일정 조건을 만족하는 두 수의 차가 정확히 계산될 수 있다는 정리다.
```

이것은 retrieval, 즉 지식 검색에 가깝다.

하지만 다음과 같은 흐름은 다르다.

아래에서 `primitive`는 공격 전체가 아니라 공격에 재사용할 수 있는 작은 기능 조각을 뜻한다. `leak primitive`는 그중에서도 주소나 내부 값 같은 정보를 조금 새게 만드는 기능 조각이다. `pointer-like information`은 실제 메모리 주소 그 자체가 아니라 주소처럼 다뤄질 수 있는 값이나 단서를 말한다.

```text
exploit chain이 실패한다
→ 단순히 leak primitive가 부족한 것이 아니다
→ 문제는 pointer-like information이 현재 계산 모델에서 보존되는가이다
→ 이것은 numeric representation / precision loss 문제다
→ 이 문제는 floating-point exact subtraction 문제로 바꿔 볼 수 있다
→ 그러면 Sterbenz lemma가 후보가 된다
```

여기서 중요한 것은 Sterbenz lemma라는 이름을 안다는 사실이 아니다. 중요한 것은 exploit 실패를 수치해석, 즉 컴퓨터가 수를 어떻게 근사하고 계산하는지 다루는 분야의 언어로 다시 썼다는 점이다.

이 차이를 놓치면 LLM의 능력을 잘못 평가하게 된다.

---

## 2. 첫 번째 사례: 나이팅게일과 화이트해커

플로렌스 나이팅게일은 흔히 “등불을 든 여인”으로 기억된다. 병상 사이를 걸으며 병사들을 돌본 헌신의 상징이다. 하지만 나이팅게일은 단순한 헌신의 인물이 아니었다. 그녀는 위생, 사망률, 병원 행정, 전쟁 의료 체계의 실패를 데이터로 읽고 개혁을 요구한 인물이었다.

그런데 사회가 더 오래 기억한 것은 개혁가의 모습보다 천사의 이미지였다.

왜 그럴까?

천사는 편하다. 천사는 제도 실패를 묻지 않는다. 천사는 누구의 책임인지 따지지 않는다. 천사는 구조를 고치라고 요구하기보다, 무너진 구조 위에서 빛나는 개인의 헌신을 보여준다.

이 구조는 오늘날 사이버보안에서도 반복된다.

화이트해커는 필요하다. 취약점을 발견하고, 악용하기 전에 알리고, 공격자보다 먼저 위험을 드러낸다. 하지만 “화이트해커”라는 밝은 이름은 때로 불편한 질문을 밀어낸다.

- 왜 그 취약점은 처음부터 시스템 안에 있었는가?
- 왜 기업은 스스로 발견하고 조치할 구조를 충분히 갖추지 못했는가?
- 왜 보안 실패의 비용은 개인의 윤리, 사명감, 야근, 명예로 보상되는가?
- 왜 제도는 취약점 발견을 외부의 선한 개인에게 기대는가?

이것은 화이트해커 개인을 비판하는 말이 아니다.

오히려 반대다. 화이트해커의 윤리적 실천은 중요하다. 그러나 그 실천이 제도 개혁으로 이어지지 않고, 제도 실패를 메우는 완충재로만 소비된다면 문제가 된다.

문제는 이렇게 다시 써야 한다.

```text
화이트해커가 충분한가?
```

이 질문보다 더 중요한 질문은 이것이다.

```text
왜 보안 시스템은 화이트해커의 선의 없이는 충분히 작동하지 않는가?
```

이것이 첫 번째 problem reframing이다.

표면 질문은 “좋은 해커를 어떻게 키울 것인가”였지만, 구조적 질문은 “조직과 국가는 왜 책임을 개인 윤리로 번역하는가”가 된다.

---

## 3. 두 번째 사례: Sterbenz lemma와 exploit reasoning

이번에는 전혀 다른 영역으로 가보자.

브라우저 exploit 개발에서는 단순히 취약점을 trigger하는 것만으로 충분하지 않다. 여기서 trigger는 취약점이 실제로 발동하게 만드는 일을 뜻한다. 취약점이 만들어낸 값을 어떤 형태로 다룰 수 있는지가 중요하다.

값은 있을 수 있다. 그러나 그 값이 원하는 방식으로 계산 가능한지는 별개의 문제다.

예를 들어 JavaScript의 일반 숫자 `Number`는 IEEE 754 double이다. 이것은 자바스크립트가 실수를 담을 때 쓰는 표준 숫자 형식이다. 일반 bitwise 연산, 즉 비트 단위 연산은 값을 32-bit signed integer(32비트 부호 있는 정수)로 강제 변환한다. 브라우저 내부의 주소, offset(기준점에서 떨어진 위치값), compressed pointer(압축된 주소), tagged value(값의 종류 표시가 섞인 값), NaN-boxed value(NaN 영역에 다른 정보를 넣는 표현) 같은 것들은 단순한 `uint64_t`(64비트 부호 없는 정수) 세계에 있지 않다.

그래서 exploit 개발자는 자주 이런 문제를 만난다.

```text
값은 있다.
하지만 그 값을 원하는 정밀도와 표현으로 보존할 수 없다.
```

GPU/WebGL/WebGPU 같은 경로로 가면 제약은 더 달라진다. shader pipeline은 그래픽 카드가 그리기 계산을 처리하는 단계들이고, 역사적으로 float 중심이다. float32는 32비트 부동소수점 숫자이며, 제한된 mantissa를 가진다. mantissa는 float 안에서 실제 숫자 정보를 담는 유효 자릿수 부분이다. 어떤 상황에서는 정수 bit extraction, 즉 비트 조각을 직접 꺼내는 일보다 float arithmetic 안에서 정보를 얼마나 보존할 수 있는지가 더 중요해진다.

이때 등장할 수 있는 개념이 Sterbenz lemma다.

Sterbenz lemma는 대략 다음 조건에서 두 floating-point 수의 차가 rounding 없이 정확하게 계산될 수 있음을 말한다. floating-point는 아주 크거나 작은 수를 근사해서 담는 숫자 형식이고, rounding은 그 근사 과정에서 일어나는 반올림 또는 잘림이다.

```text
y / 2 <= x <= 2y 이면, x - y는 exact하게 계산될 수 있다.
```

여기서 `exact`는 근사 오차 없이 정확하다는 뜻이다.

물론 이것은 새로운 수학 정리가 아니다. 1970년대부터 알려진 부동소수점 산술의 정리다. 중요한 것은 정리 자체가 아니라, 그것이 exploit reasoning에서 어떤 문제로 재해석되느냐다.

덜 놀라운 흐름은 이것이다.

```text
exact subtraction
→ floating-point exactness
→ Sterbenz lemma
```

이것은 의미적 검색에 가깝다.

정말 흥미로운 흐름은 이것이다.

```text
exploit primitive가 있다
→ 그런데 exploit chain으로 이어지지 않는다
→ 병목은 leak 자체가 아니라 numeric representation / precision loss다
→ 현재 허용된 계산 모델 안에서 address-related information이 보존되는가가 핵심이다
→ 이 문제는 numerical analysis 문제로 바꿀 수 있다
→ rounding-free subtraction 조건을 찾는다
→ Sterbenz lemma가 후보가 된다
→ pixel / rendering / timing observable로 encode할 가능성을 검토한다
```

이것은 단순 retrieval이 아니다. 문제를 다른 도메인의 언어로 다시 쓰는 것이다.

---

## 4. 픽셀은 화면 점이 아니라 observable surface가 될 수 있다

이 절의 흐름은 실제 관찰된 LLM trace를 단정하는 것이 아니라, reframing 능력이 어떤 모양을 가질 수 있는지를 보여주기 위한 구성된 예시다. LLM trace는 모델이 답을 만들어 가는 중간 기록이나 대화 흐름을 뜻한다.

여기서 중요한 오해를 하나 줄여야 한다.

GPU가 pointer를 직접 읽는다는 뜻이 아니다. pointer는 메모리 위치를 가리키는 값이고, dereference는 그 위치의 실제 메모리를 읽는 동작이다. 브라우저 exploit에서 GPU나 pixel이 언급된다고 해서 GPU가 메모리 주소를 그대로 dereference한다는 의미는 아니다.

더 정확한 구조는 이렇다.

```text
exploit primitive가 만든 pointer-like value / offset / corrupted numeric value
→ JS Number, TypedArray, DataView, WebGL/WebGPU input 같은 제한된 표현으로 전달
→ 가능한 연산이 float arithmetic, coordinate transform, rendering/timing observable 등으로 제한됨
→ pixel position, rendering difference, timing, cache behavior 같은 간접 observable로 encode
→ side-channel-like information recovery 가능성 검토
```

TypedArray와 DataView는 자바스크립트에서 메모리 안의 숫자 배열을 더 직접 다룰 때 쓰는 도구다. side-channel-like information recovery는 값을 직접 읽는 대신, 시간 차이·캐시 동작·화면 변화 같은 우회 신호로 정보를 추정하는 방식을 말한다.

여기서 pixel은 단순한 화면 점이 아니다. 계산 결과를 외부에서 관찰 가능한 형태로 바꾸는 encoding surface가 될 수 있다. encoding surface는 내부 값을 색, 위치, 시간 차이처럼 관찰 가능한 흔적으로 바꾸는 표면 또는 경로라는 뜻이다.

보안 연구에서는 이미 rendering difference, canvas, WebGL, GPU cache/timing, SVG filter leakage 같은 경로가 정보 채널이 될 수 있다는 관점이 존재한다. 쉽게 말해 색, 위치, 렌더링 결과, 시간 차이 같은 겉으로 보이는 변화가 내부 계산의 단서가 될 수 있다는 뜻이다. 다만 이 글의 목적은 특정 exploit 절차를 설명하는 것이 아니다. 오히려 반대다. 여기서 중요한 것은 공격 절차가 아니라 사고 구조다.

```text
값을 얻었다
```

와

```text
그 값을 현재 runtime / representation / precision 제약 안에서 exploit primitive로 바꿀 수 있다
```

는 다르다.

여기서 runtime은 프로그램이 실제로 실행되는 환경이고, representation과 precision은 각각 값의 표현 방식과 정밀도다.

이 차이는 modern browser exploitation writeup, 즉 최신 브라우저 exploit 분석 글을 읽을 때 반복적으로 등장하는 중요한 관찰점이다.

---

## 5. 두 사례는 왜 닮았는가

이제 두 이야기를 다시 나란히 놓아보자.

```text
나이팅게일 / 화이트해커 사례

제도 실패
→ 개인의 헌신과 윤리로 번역됨
→ 구조 책임이 흐려짐
→ 질문을 다시 써야 함
→ 개인이 선한가가 아니라, 왜 구조가 개인 선의에 의존하는가
```

```text
Sterbenz / exploit reasoning 사례

exploit chain 실패
→ 단순 취약점 부족이나 leak 부족으로 보임
→ 실제 병목은 numeric representation / precision loss일 수 있음
→ 질문을 다시 써야 함
→ 값이 있는가가 아니라, 그 값이 현재 계산 모델 안에서 보존되는가
```

둘은 전혀 다른 분야지만 같은 구조를 가진다.

```text
표면 질문
→ 숨은 병목
→ 다른 도메인의 언어로 재정의
→ 새로운 해결 후보 또는 평가 기준 등장
```

이것이 cross-domain problem reframing이다.

단순한 비유와도 다르다. 비유는 “A는 B와 비슷하다”고 말한다. 그러나 problem reframing은 한 단계 더 간다.

```text
A에서 막힌 문제를 B의 언어로 다시 쓰면,
A에서 보이지 않던 병목과 해결 후보가 보인다.
```

나이팅게일-화이트해커 연결은 사회적·제도적 reframing이다.

Sterbenz-exploit 연결은 기술적·수학적 reframing이다.

다만 둘을 완전히 같은 작업으로 만들 필요는 없다. 나이팅게일-화이트해커 사례에서는 문제 위에 쌓인 사회적 의미 레이어, 즉 사회가 덧씌운 상징과 해석을 먼저 걷어야 구조가 드러난다. Sterbenz-exploit 사례에서는 그런 의미 레이어가 상대적으로 얇고, 기술 병목을 곧장 다른 도메인의 좌표계, 다시 말해 다른 분야의 기준과 언어로 옮긴다.

둘 다 LLM을 이해하는 데 중요하다.

---

## 6. LLM의 능력은 세 단계로 나눠 봐야 한다

LLM이 어떤 연결을 했다고 해서 모두 같은 의미는 아니다. 최소한 세 단계로 나눠야 한다.

| 단계 | 설명 | 예시 |
|---|---|---|
| 지식 검색(Semantic retrieval) | 이미 주어진 단서에서 관련 지식을 찾음 | `exact subtraction`에서 `Sterbenz lemma`를 떠올림 |
| 닮은 구조 찾기(Analogy generation) | 두 영역이 어떤 점에서 비슷한지 설명함 | 나이팅게일 신화와 화이트해커 영웅화가 닮았다고 말함 |
| 문제 다시 쓰기(Problem reframing) | 한 영역의 막힌 문제를 다른 영역의 해결 가능한 문제로 바꿈 | exploit 실패를 precision loss 문제로 다시 정의함 |

첫 번째는 검색에 가깝다. 두 번째는 닮은 점을 찾는 일이다. 세 번째는 문제를 새로 정의하는 전략이다.

보안에서 위험하거나 흥미로운 것은 세 번째다.

LLM이 단순히 exploit code를 생성할 수 있는가보다 더 중요한 질문은 이것이다.

```text
LLM은 실패한 exploit chain의 병목을 다른 도메인의 constraint, 즉 제약 조건으로 바꿀 수 있는가?
```

예를 들어 다음 질문들이 중요해진다.

- 왜 이 primitive는 exploit으로 이어지지 않는가?
- 값은 있는데 왜 원하는 방식으로 계산하거나 출력할 수 없는가?
- 이 병목은 컴파일러 이론, 수치해석, OS 내부 구조, 브라우저의 값 표현, 사이드채널 공학 중 어느 언어로 다시 쓸 수 있는가?
- 이 전환을 사람이 먼저 제공했는가, 모델이 먼저 제안했는가?
- 제안된 bridge, 즉 두 분야를 잇는 연결이 실제 대상 환경의 제약에서 검증되었는가?

여기서부터 LLM은 단순한 code generator(코드 생성기)가 아니라 strategy assistant(전략 보조자)가 된다.

---

## 7. “LLM이 했다”를 평가하는 기준

AI-assisted exploit research나 AI-assisted vulnerability discovery를 평가할 때 가장 위험한 착각은 인간의 framing과 모델의 retrieval을 섞는 것이다. 이 두 표현은 각각 AI를 보조 도구로 쓰는 exploit 연구와 취약점 발견 연구를 뜻한다.

예를 들어 인간이 이미 이렇게 말했다고 하자.

```text
이 문제는 precision loss 때문인 것 같아.
rounding 없이 subtraction할 수 있는 조건이 있을까?
```

그다음 LLM이 Sterbenz lemma를 찾았다면, 그것은 유용하지만 놀라운 일은 아니다. 인간이 핵심 프레임을 이미 제공했기 때문이다.

반대로 모델이 먼저 다음 흐름을 만들었다면 의미가 커진다.

```text
이 exploit chain은 leak이 부족한 것이 아니라,
현재 representation에서 정보가 손실되는 것이 병목입니다.
이를 floating-point exactness 문제로 바꿔 볼 수 있습니다.
```

그래서 평가 기준은 결과물이 아니라 timeline이어야 한다.

- 누가 먼저 병목을 정의했는가?
- 누가 핵심 도메인 전환을 제안했는가?
- 인간이 어떤 단어를 먼저 제공했는가?
- 모델이 어느 시점에 다른 분야의 theorem(정리)이나 engineering trick(구현 기법)을 가져왔는가?
- 그 제안은 실제 target constraint, 즉 대상 환경의 제약과 맞았는가?

이 질문이 없으면 “LLM이 exploit을 만들었다”와 “사람이 문제를 거의 다 정의했고 모델이 관련 문헌을 찾아줬다”가 뒤섞인다.

두 경우는 완전히 다르다.

---

## 8. 사회가 기록한 연결과 모델이 떠올리는 연결

처음 이 논의를 하면서 나는 이런 문장을 떠올렸다.

> 사회가 기록한 서사의 편향이 곧 모델의 인식 한계가 된다.

방향은 맞지만, 그대로 쓰기에는 너무 강한 표현이다.

더 정확히 말하면 이렇다.

> LLM은 사회가 반복적으로 기록한 연결을 더 쉽게 떠올린다. 반대로 드물게 기록되었거나 명시적으로 연결되지 않은 구조적 유사성은 기본 응답에서 덜 두드러질 수 있다.

나이팅게일은 “천사”로 많이 기록되었다. 화이트해커는 “윤리적 해커”, “사이버 세계의 수호자”, “착한 해커”로 많이 기록된다. 하지만 “제도 실패가 개인 윤리로 번역되는 구조”라는 연결은 훨씬 덜 기록된다.

따라서 모델도 기본적으로는 더 많이 기록된 방향으로 반응하기 쉽다.

이것은 모델이 그런 연결을 만들 수 없다는 뜻이 아니다. 오히려 좋은 모델은 힌트와 맥락, 검증 루프가 있을 때 그런 연결을 구성할 수 있다. 검증 루프는 제안이 실제로 맞는지 반복해서 확인하는 과정이다.

어떤 연결은 권력과 제도가 불편해해서 덜 기록되고, 어떤 연결은 단순히 희소하며, 어떤 연결은 학제 경계 때문에 끊긴다. 모델은 이 차이를 자동으로 구분하지 않는다. 그래서 기록되지 않은 구조는 더 자주 명시적으로 다시 써야 한다.

하지만 중요한 점은 이것이다.

```text
기록된 연결은 쉽게 떠오른다.
기록되지 않은 구조는 문제를 다시 써야 보인다.
```

이것은 인간에게도 마찬가지다.

---

## 9. 방어자는 무엇을 봐야 하는가

AI 보안 논의는 자주 “AI가 exploit을 만들 수 있는가”로 흐른다. 이 질문도 필요하지만 충분하지 않다.

앞으로 더 중요한 질문은 이것이다.

```text
AI가 어떤 병목을 다른 도메인의 해결 가능한 문제로 바꿀 수 있는가?
```

방어자는 다음을 기록해야 한다.

| 관찰 항목 | 의미 |
|---|---|
| 인간이 프레임을 제공했는가(human framing supplied?) | 사람이 핵심 프레임을 먼저 제공했는가 |
| 병목 식별(bottleneck identification) | 모델이 실패 원인을 어떻게 정의했는가 |
| 표현 추론(representation reasoning) | 값의 타입, 정밀도, 표현 제약을 추적했는가 |
| 분야 간 전환(cross-domain transfer) | 다른 도메인의 정리·패턴·기법을 가져왔는가 |
| 기능 조각 연결(primitive composition) | 그 전환을 실제 exploit primitive나 평가 기준으로 연결했는가 |
| 검증 근거(validation evidence) | 실제 target 또는 benchmark에서 검증했는가 |

여기서 validation evidence는 검증 근거를 뜻하며, 최소한 다음 중 하나를 포함해야 한다.

- 실제 대상 환경의 제약과 제안된 bridge가 맞는지 확인한 기록
- benchmark(비교 실험 기준)나 toy harness(작은 실험 장치)에서 병목 재정의가 유효했는지 확인한 결과
- PoC 수준이 아니더라도, 제안된 표현·정밀도·observable 경로가 해당 환경에서 가능한지 검증한 근거

이런 기준이 있어야 AI-assisted security research, 즉 AI를 보조 도구로 쓰는 보안 연구의 진짜 능력을 평가할 수 있다.

단순히 모델이 만든 코드만 보면 늦다. 중요한 변화는 코드 이전에 일어난다. 문제를 다시 쓰는 순간이다.

---

## 10. 정책도 마찬가지다

이 논의는 기술에만 머물지 않는다.

최근 정리한 [사이버보안 정책의 구조적 윤리에 대한 글](/ko/post/2026-05-24-structural-ethics-cybersecurity-policy-korea/)에서도 같은 문제가 등장한다.

정책의 표면 질문은 자주 이렇게 시작한다.

```text
화이트해커를 몇 명 양성할 것인가?
보안 인력을 어떻게 늘릴 것인가?
기업에 어떤 의무를 부과할 것인가?
```

하지만 구조적으로 다시 쓰면 질문은 달라진다.

```text
왜 보안 실패는 반복적으로 개인 윤리와 실무자의 책임감으로 번역되는가?
조직과 국가는 책임이 발생하는 위치를 어떻게 설계해야 하는가?
CISO에게 책임만 줄 것인가, 권한과 예산도 줄 것인가?
화이트해커의 발견은 제도 개선으로 환류되는가?
```

좋은 정책도 좋은 exploit reasoning처럼 문제를 다시 쓴다.

표면 증상이 아니라 병목을 본다. 개인의 선의가 아니라 구조의 반복 가능성을 본다. 영웅담이 아니라 feedback loop, 즉 발견과 조치가 다시 제도 개선으로 돌아오는 흐름을 본다.

---

## 11. 결론: AI의 미래는 정답보다 프레이밍에 있다

AI가 많은 것을 알고 있다는 사실은 이미 익숙해졌다. 이제 중요한 질문은 지식의 양이 아니다.

중요한 것은 이것이다.

> AI는 문제를 어디까지 다시 쓸 수 있는가?

나이팅게일과 화이트해커를 연결하는 것은 단순한 비유가 아니다. 제도 실패가 개인 윤리로 번역되는 구조를 보는 일이다.

Sterbenz lemma와 exploit reasoning을 연결하는 것도 단순한 키워드 검색이 아니다. exploit 실패를 numerical precision, 즉 숫자 정밀도 문제로 다시 쓰는 일이다.

두 사례는 같은 결론을 향하지만, 같은 경로를 지나지는 않는다. 하나는 문제 위에 쌓인 의미 레이어를 걷어내며 구조를 드러내고, 다른 하나는 막힌 기술 병목을 다른 도메인의 좌표계로 옮긴다. 여기서 좌표계는 문제를 바라보는 기준과 언어를 뜻한다. 차이는 reframing 능력의 종류라기보다, 문제 앞에 무엇이 먼저 놓여 있는가에 가깝다.

둘 다 같은 능력을 요구한다.

```text
표면을 보지 않고 구조를 본다.
구조를 다른 도메인의 언어로 다시 쓴다.
그 전환이 실제 문제 해결이나 평가 기준으로 이어지는지 검증한다.
```

AI가 진짜 새로워지는 순간은 여기다.

정답을 찾을 때가 아니다.

문제를 다시 쓸 때다.

그리고 보안에서 그 능력은 양면적이다. 방어자에게는 새로운 분석 능력이지만, 공격자에게는 실패한 exploit chain을 다시 살아나게 하는 전략 능력이 될 수 있다.

그래서 우리는 LLM의 코딩 능력만 볼 것이 아니라, LLM의 **problem reframing 능력**, 즉 문제를 다른 언어로 다시 쓰는 능력을 추적해야 한다.

앞으로의 질문은 이것이다.

> 모델이 무엇을 알고 있는가?  
> 보다,  
> 모델이 무엇을 다른 문제로 바꿔 생각했는가?

---

## 요약

- LLM의 중요한 능력은 단순 지식 검색이 아니라 문제 재정의다.
- 나이팅게일-화이트해커 연결은 사회적·제도적 cross-domain reasoning, 즉 분야를 건너 구조를 읽는 사고의 사례다.
- Sterbenz-exploit 연결은 기술적·수학적 cross-domain reasoning의 사례다.
- 두 사례 모두 표면 질문을 숨은 병목의 언어로 다시 쓰는 과정이지만, 출발점은 다르다. 하나는 의미 레이어를 걷어내고, 다른 하나는 기술 병목을 곧장 다른 좌표계로 옮긴다.
- AI-assisted exploit research를 평가할 때는 인간이 프레임을 먼저 제공했는지, 모델이 병목을 식별했는지, 다른 분야의 개념을 가져왔는지, 검증 근거가 있는지를 분리해서 봐야 한다.
- 방어자는 모델이 어떤 코드를 생성했는가보다, 어떤 병목을 다른 도메인의 해결 가능한 문제로 바꿨는가를 추적해야 한다.

---

## 함께 읽을 글

이 글은 단일 시리즈의 한 편이 아니라, AI 보안 평가와 사회적 서사라는 두 결을 동시에 다룹니다. 다음 글들과 함께 읽으면 cross-domain reframing의 양면이 더 또렷해집니다.

- [AI 국가 전략의 진짜 승부처는 GPU 수량만이 아닙니다](/ko/post/2026-05-24-ai-national-strategy-control-plane/) — 같은 날 발행. control plane·하니스·검증 체계 관점에서 본 AI 평가 인프라.
- [AI Slop의 역설: 취약점을 더 잘 찾는 시대에 triage가 더 어려워지는 이유](/ko/post/2026-04-30-ai-slop-vulnerability-triage/) — AI가 만든 후보를 어떻게 재정의·검증하느냐는 질문에서 이 글의 평가 기준과 직접 연결된다.
- [oh-my-secuaudit 4편: sec-audit-static 피드백 루프](/ko/post/2026-05-19-sec-audit-static-feedback-loop/) — "검증 근거(validation evidence)"가 실제 보안 진단 도구의 v2.0 → v2.7/v2.8 진화에서 어떻게 작동하는지에 대한 실전 사례.
- [CVE 이후 대응만으로는 늦다: AI 시대 취약점은 번호가 붙기 전에 움직인다](/ko/post/2026-04-29-after-cve-response-ai-vulnerability/) — AI-assisted exploit research가 운영 흐름과 만나는 지점.
- [사이버보안 정책의 구조적 윤리에 대한 비판적 평가](/ko/post/2026-05-24-structural-ethics-cybersecurity-policy-korea/) — 나이팅게일-화이트해커 서사가 정책 윤리 차원에서 어떻게 작동하는지 더 깊이 파고든 동반 글.

---

## 참고 자료

- [Security Field Notes: LLM cross-domain exploit reasoning and Sterbenz bridge](https://github.com/windshock/security-field-notes/blob/main/knowledge/ai-security/2026-05-24-llm-cross-domain-exploit-reasoning-sterbenz.md)
- [Security Field Notes: Cross-domain reasoning — narrative bias and exploit bottleneck framing](https://github.com/windshock/security-field-notes/blob/main/knowledge/ai-security/2026-05-24-cross-domain-reasoning-narrative-bias-bridge.md)
- [Project Zero: JITSploitation I — A JIT Bug](https://projectzero.google/2020/09/jitsploitation-one.html)
- [Project Zero: JITSploitation II — Getting Read/Write](https://projectzero.google/2020/09/jitsploitation-two.html)
- [Project Zero: JITSploitation III — Subverting Control Flow](https://projectzero.google/2020/09/jitsploitation-three.html)
- [GitHub Security Lab: Getting RCE in Chrome with incomplete object initialization in the Maglev compiler](https://github.blog/security/vulnerability-research/getting-rce-in-chrome-with-incomplete-object-initialization-in-the-maglev-compiler/)
- [Sterbenz lemma](https://en.wikipedia.org/wiki/Sterbenz_lemma)
- Pat H. Sterbenz, *Floating-Point Computation*, 1974.
- Jean-Michel Muller et al., *Handbook of Floating-Point Arithmetic*, 2018.
- [Smithsonian Magazine: The Defiance of Florence Nightingale](https://www.smithsonianmag.com/history/the-worlds-most-famous-nurse-florence-nightingale-180974155/)
- [Coordinated vulnerability disclosure](https://en.wikipedia.org/wiki/Coordinated_vulnerability_disclosure)
