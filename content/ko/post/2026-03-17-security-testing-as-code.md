---
title: "보안 진단 보고서는 발행되면 죽는다"
date: 2026-03-17
draft: false
featured: true
tags: ["DevSecOps", "Security Testing", "취약점 진단", "PoC", "자동화", "의무기록", "Code"]
categories: ["보안 연구", "보안 운영"]
description: "기존 보안 진단 보고서의 한계를 짚어보고, 진단 결과를 '문서'가 아닌 '실행 가능한 코드(PoC)'로 관리하는 Security Testing as Code의 필요성과 실무 적용 사례를 공유합니다."
image: "/images/pdf-previews/Security_Testing_as_Code_p1.webp"
---

## 관련 영상

{{< youtube hHSVsvAjy8g >}}

## PDF

- **Open (new tab):** [`/pdf/Security_Testing_as_Code.pdf`](/pdf/Security_Testing_as_Code.pdf)

<iframe
  id="pdfjs-stac-ko"
  src="/pdfjs/single.html?file=/pdf/Security_Testing_as_Code.pdf#page=1"
  width="100%"
  height="560"
  style="border: 1px solid #e5e7eb; border-radius: 8px;"
></iframe>

<script>
  (function () {
    const iframe = document.getElementById("pdfjs-stac-ko");
    if (!iframe) return;
    window.addEventListener("message", function (e) {
      if (e.origin !== window.location.origin) return;
      const data = e.data || {};
      if (data.type !== "pdfjs-resize") return;
      if (typeof data.height !== "number") return;
      iframe.style.height = Math.max(420, Math.min(data.height, 980)) + "px";
    });
  })();
</script>

> PDF가 보이지 않으면 여기로 열어보세요: [`/pdf/Security_Testing_as_Code.pdf`](/pdf/Security_Testing_as_Code.pdf)


보안 진단을 오래 하다 보면 이상한 딜레마에 빠진다.

진단은 잘 했다. 취약점도 찾았다. 그런데 보고서를 넘기고 나면 그 지식이 어딘가로 사라진다. 고객은 보고서를 받고, 파일을 닫고, 끝이다. 다음 진단자는 처음부터 다시 시작한다. 내가 6개월 전에 본 것을 또 본다.

나는 오래 고민했다. 보고서가 문제인가, 형식이 문제인가. 둘 다 아니었다.

## Word: 내용보다 분량이 먼저였다

처음엔 다들 그렇듯 Word 보고서를 썼다.

문제는 금방 드러났다. 실제 취약점보다 일반 가이드라인이 더 많았다. OWASP Top 10을 복붙하고, 조치 방안은 "입력값을 검증하세요"로 끝났다. 페이지는 두꺼워지는데 실질적인 내용은 얇아졌다. "Critical 3건, High 7건"을 어떤 기준으로 셌는지 물으면 답하기 곤란했다.

## Excel: 나아졌지만 금방 한계에 부딪혔다

Excel로 바꾸니 정량화는 됐다. 필터도 걸리고, 심각도별로 정렬도 됐다.

그런데 시간이 지나면서 파일이 사람마다 달라지기 시작했다. 누군가는 열을 추가했고, 누군가는 탭을 새로 팠다. 프로젝트가 끝나면 결과가 여러 파일에 흩어졌다. 6개월 전 진단 결과를 찾으려면 메일함을 뒤져야 했다. 진단 과정은 여전히 어디에도 없었다. 결과만 있고 맥락은 없었다.

## 포털 시스템: 일관성은 생겼지만 경직됐다

Excel 데이터를 DB로 옮겨 포털을 만들었다. 형식은 통일됐다. 그런데 새로운 진단 유형이 나올 때마다 개발이 필요했다. 유연성이 없었다. 그리고 여전히 근본 문제는 해결되지 않았다. 진단 결과만 저장했다. 왜 이 취약점이 위험한지, 어떤 경로로 발견했는지, 다음 진단자가 뭘 더 봐야 하는지 — 그런 맥락은 포털 어디에도 들어갈 자리가 없었다.

## 문제의 본질

Word든 Excel이든 포털이든, 전부 같은 전제에서 출발했다.

**진단은 문서다.**

병원으로 치면, 지금까지의 보안 진단 보고서는 모두 진단서였다. 그 순간의 결과만 있다. 하지만 진짜 필요한 건 의무기록이다. 경과, 검사 수치, 처방, 다음 의사가 맥락을 끊김 없이 이어받을 수 있는 전부. 문서는 발행되면 죽는다. 의무기록은 다음 사람이 이어받는다.

## 진단을 프로젝트로 바꾸면 어떻게 되나

최근 나는 진단을 처음부터 Git 프로젝트로 구성해봤다.

```text
assessment/
├── README.md              ← 전체 맥락, 진행 상태, 고위험 항목 요약
├── handoff-plan.md        ← 갭 분석, 다음 진단자가 이어받을 명세
├── analysis/
│   └── attack-surface/    ← 엔드포인트 인벤토리, 외부 연동 인벤토리
├── artifacts/
│   ├── poc/               ← 재현 가능한 PoC 코드와 실행 환경
│   └── runtime/           ← 실제 HTTP 요청/응답 증적 파일
└── inputs/
    └── threat-intel/      ← 사전 리서치 입력물
```

구조 자체보다 각 폴더 안에 무엇이 들어가는지가 핵심이다.

## artifacts/poc/ — 주장 대신 실행 가능한 코드

### 사례 1: XSSStringSerializer 퍼징

`XSSStringSerializer`라는 클래스가 있었다. 이름만 보면 XSS를 막는 것처럼 보인다. 코드를 열어보니 실제로는 이스케이프된 HTML을 원래대로 복원하고 있었다 — 보호가 아니라 해제였다.

Word 보고서였다면 이렇게 썼을 것이다.

> "XSSStringSerializer가 unescape를 수행하여 XSS 방어가 무력화될 수 있습니다."

대신 Jazzer 기반 Java 퍼저를 작성해서 `artifacts/poc/fuzz-xss/`에 넣었다. 26개 페이로드를 넣었고 결과는 이랬다.

```text
[BYPASS] <script>alert('XSS')</script>
[BYPASS] <img src=x onerror=alert(1)>
[BYPASS] javascript:alert(document.cookie)
[BYPASS] file:///data/data/com.x.y/shared_prefs/auth.xml
...
총 26개 중 23개 우회 — bypass rate 88.4%
```

크래시 파일 7개가 폴더에 남아있다. 누구든 clone해서 아래 명령 하나면 같은 결과를 재현할 수 있다.

```bash
./gradlew fuzz
```

### 사례 2: `@Acl` ACL 검증 우회 PoC

`@Acl` 어노테이션이 배치 API에 붙어있었다. 설계 의도는 IP 화이트리스트 기반 접근통제였다. 그런데 쇼핑탭 배치 컨트롤러는 `HttpServletRequest`를 파라미터로 선언하지 않은 패턴이었다. AOP가 IP를 추출하려면 `HttpServletRequest`가 필요한데, 없으면 `RequestNotFoundException`이 발생하면서 IP 체크 로직 자체에 도달하지 못한다.

Docker + Spring Boot 환경을 `artifacts/poc/acl-bypass-test/`에 구성했다. 시나리오를 두 가지로 나눠 실행했다.

#### 시나리오 A (`HttpServletRequest` 있음)

- HTTP 500 / `"ACL_DENIED: allowedIP=..., realIP=192.168.2.1"`
- IP 검증 수행 ✅
- 거부 사유 로그에 남음 ✅

#### 시나리오 B (`HttpServletRequest` 없음 — 쇼핑탭 배치 패턴)

- HTTP 500 / `"UndeclaredThrowableException: unknown"`
- IP 검증 미수행 ❌
- 거부 사유 불명 ❌

비즈니스 로직은 두 경우 모두 실행되지 않는다. 그러나 `@Acl`이 정상 동작하는 것도 아니다. IP 검증 없이 예외로 막히는 것이어서, 예외 처리 로직이 바뀌는 순간 우회 가능성이 열린다. 재현 방법은 한 줄이다.

```bash
bash test.sh http://localhost:18080
```

이게 "설계와 구현이 불일치합니다"라는 문장과 얼마나 다른지는 설명이 필요 없다.

## artifacts/runtime/ — "확인했다"가 아니라 확인의 증거

상용 Redis가 내부 네트워크에서 TCP로 열려있는지 확인했다. 인증 시도는 하지 않았다 — 비파괴 원칙을 지키면서도 위험을 증명하는 데 인증 시도까지는 필요하지 않았다.

```text
172.29.2.1:7000  OPEN
172.29.2.2:7001  OPEN
172.29.2.3:7000  OPEN
172.29.2.3:7001  OPEN
```

6노드 중 4노드 도달 가능. `spring.redis.password` 미설정. `curl` 명령과 실제 response header가 파일로 남아있다. "확인했다"는 말이 아니라, 확인한 결과 자체가 프로젝트 안에 있다.

## handoff-plan.md — 다음 진단자가 처음부터 시작하지 않도록

어떤 시나리오가 코드에서 확인됐는지, 어떤 것이 동적 검증을 기다리는지, 어떤 것이 이번 범위 밖으로 명시적으로 빠졌는지 매트릭스로 정리돼 있다. 후속 작업은 선행 조건과 예상 산출물과 함께 Phase A / B / C로 나뉜다.

분석 대상 저장소는 커밋 해시로 고정돼 있다. 6개월 후에도 내가 무엇을 보고 판단했는지 재현할 수 있다.

Word 보고서에서 이 모든 것은 텍스트였다. 프로젝트에서는 실행 가능하고, 재현 가능하고, 버전이 관리된다.

## AI가 이걸 가능하게 했다

솔직히 말하면, 이 방식은 AI 없이는 현실적으로 힘들었다.

분석 내용을 구조화된 문서로 정리하고, 취약점 시나리오를 테스트 케이스로 변환하고, PoC 코드 초안을 잡는 것 — 혼자 했다면 보고서 쓰는 시간이 진단 시간을 넘어섰을 것이다. AI는 내 머릿속에 있는 비정형 분석 결과를 프로젝트 구조로 뽑아내는 속도를 완전히 바꿔놨다.

AI를 "보고서 예쁘게 써주는 도구"로 쓰면 Word 보고서보다 약간 나은 Word 보고서가 나온다. 하지만 **진단 지식을 구조화하는 도구**로 쓰면 이야기가 달라진다.

## 결론

보안 진단의 문제는 형식이 아니었다.

Word가 나빠서 Excel로 바꾼 게 아니었다. Excel이 나빠서 포털로 바꾼 게 아니었다. 진단을 문서로 취급하는 한, 형식을 바꿔도 같은 한계에 부딪혔다.

진단 결과는 주장이 아니라 증거여야 한다. 증거는 재현 가능해야 한다. 재현 가능한 증거는 파일이고, 파일은 버전 관리가 된다.

이제 보안 진단은 문서가 아니라 살아있는 코드가 된다. **Security Testing as Code** 시대가 왔다.
