---
title: "MCP는 RPC 보안의 역사를 반복하고 있다"
date: 2026-05-07
draft: false
featured: true
tags: ["Code", "MCP", "AI Security", "RPC", "Supply Chain", "DevSecOps", "보안운영"]
categories: ["Security", "Supply Chain"]
description: "MCP 보안 문제를 프롬프트 인젝션이 아니라 RPC, 로컬 실행 경계, 설정 승격, 공급망 거버넌스 관점에서 분석합니다."
summary: "MCP는 단순한 AI 플러그인 규격이 아니라 외부 입력을 내부 실행으로 연결하는 새로운 RPC 경계다. 이 글은 MCP 취약점을 설정-실행 승격, localhost trust, runtime exposure, tunnel exposure, 공급망 거버넌스 관점에서 분석한다."
image: "/images/post/mcp-rpc-security-history.webp"
---

MCP(Model Context Protocol)는 단순한 AI 플러그인 규격처럼 보인다.

그러나 보안 관점에서 보면 MCP는 더 오래된 질문을 다시 꺼낸다.

> 원격 입력을 어디까지 내부 실행 권한으로 믿을 것인가?

이 질문은 XML-RPC, Java RMI, OpenStack RPC, 브라우저 확장, 로컬 보안 프로그램, CI/CD 자동화에서 반복되어 왔다. MCP는 그 질문을 AI IDE와 agent 개발 환경으로 가져왔다.

그래서 MCP 보안은 단순히 “프롬프트 인젝션을 막는 문제”가 아니다. 더 본질적인 문제는 외부 입력이 설정으로 바뀌고, 설정이 도구 호출로 바뀌며, 도구 호출이 로컬 또는 내부 시스템 실행 권한으로 이어지는 구조다.

한 문장으로 줄이면 이렇다.

> MCP의 진짜 공격면은 프롬프트가 아니라, 추천과 실행 사이의 신뢰 경계다.

---

## 1. MCP는 기능 추가가 아니라 권한 위임이다

MCP 서버는 AI 애플리케이션에 외부 도구와 데이터를 연결한다. 표면적으로는 생산성 기능이다. IDE가 파일을 읽고, 이슈를 조회하고, 내부 문서를 검색하고, 테스트를 실행하고, 데이터베이스에 질의할 수 있게 된다.

하지만 이 연결은 단순 조회에서 끝나지 않는다.

MCP 서버는 다음과 같은 권한을 가질 수 있다.

- 파일 읽기와 쓰기
- shell 또는 subprocess 실행
- 환경 변수와 API key 접근
- 내부 HTTP API 호출
- 데이터베이스 조회와 변경
- 빌드, 테스트, 배포 자동화 연동
- 로컬 개발 환경의 상태 수집

즉 MCP는 “AI에게 기능을 붙이는 규격”이면서 동시에 “외부 입력을 내부 실행 권한으로 연결하는 위임 계층”이다.

보안 모델은 여기서 출발해야 한다.

---

## 2. 문제는 설정이 실행으로 승격되는 순간이다

많은 개발자는 설정 파일을 코드보다 덜 위험하게 느낀다.

`mcp.json`, tool config, connector 설정, transport 설정은 겉으로는 단순한 환경 구성처럼 보인다. 하지만 MCP 환경에서는 설정이 곧 실행 경로가 될 수 있다.

```text
외부 입력
→ AI 또는 사용자 승인
→ MCP 설정(JSON)
→ command / args / transport / endpoint
→ tool invocation
→ 로컬 또는 서버 실행
```

여기서 핵심은 프롬프트 인젝션 자체가 아니다.

프롬프트 인젝션은 입력 경로 중 하나일 뿐이다. 더 넓은 문제는 configuration escalation이다. 외부에서 온 내용이 설정으로 승격되고, 설정이 실행으로 승격되는 순간 보안 경계가 바뀐다.

MCP의 위험은 바로 이 지점에 있다.

---

## 3. RPC 보안 역사와 닮은 점

RPC 계열 기술의 문제는 호출 방식 자체가 아니었다. 문제는 신뢰 경계였다.

| 과거 RPC 세계 | MCP 세계 |
|---|---|
| remote invocation | tool invocation |
| serialized object | tool argument / config JSON |
| trusted deserialization | trusted configuration |
| exposed RPC endpoint | exposed MCP endpoint |
| localhost service trust | local MCP trust |
| hidden method | hidden transport / hidden tool |
| wrapper bypass | allowlist bypass |
| gadget chain | config-to-exec chain |

과거 RPC 취약점에서 직렬화된 객체는 단순 데이터처럼 보였다. 그러나 런타임에 들어가면 생성자, 역직렬화 훅, 예외 처리, 로깅 경로를 통해 실행 의미를 갖게 되었다.

MCP에서도 비슷한 일이 일어난다.

설정은 단순 JSON처럼 보인다. 하지만 `command`, `args`, `transport`, `endpoint`, `tool`이 실행 경로와 연결되는 순간 설정은 권한 위임 구조가 된다.

---

## 4. 보안 소프트웨어 업데이트 취약점이 주는 교훈

이 구조는 MCP만의 문제가 아니다. PC 보안 프로그램, SSO 클라이언트, 인증서 관리 프로그램, 패치 관리 프로그램, NAC, DRM 같은 로컬 보안 소프트웨어에서도 유사한 실패가 반복되어 왔다.

보안 소프트웨어의 업데이트 기능은 원래 신뢰받는 경로다. 사용자는 업데이트가 보안을 강화한다고 믿는다. 그러나 업데이트 서버, 업데이트 설정, 로컬 API, 파일 무결성 검증이 약하면 이 신뢰 경로는 공격 경로가 된다.

일반화하면 흐름은 다음과 같다.

```text
외부 입력 또는 공격자 제어 서버
→ 로컬 보안 프로그램 API 호출
→ 업데이트 설정 또는 파일 경로 변경
→ 다운로드 및 설치
→ DLL side-loading 또는 악성 코드 실행
```

여기서 중요한 것은 특정 제품명이 아니다. 더 중요한 것은 구조다.

- 로컬 API가 인증 없이 호출 가능하다.
- 업데이트 설정이 외부 입력에 의해 바뀔 수 있다.
- 다운로드된 코드의 무결성과 서명이 충분히 검증되지 않는다.
- 파일 경로가 외부에서 제어될 수 있다.
- 보안 프로그램이라는 이유로 사용자가 실행 경로를 신뢰한다.

이 구조는 MCP와 매우 닮았다.

| 보안 소프트웨어 업데이트 | MCP |
|---|---|
| update config | mcp.json / tool config |
| local update API | local MCP endpoint |
| trusted updater | trusted MCP client / AI IDE |
| downloaded executable/DLL | command / tool / server process |
| DLL side-loading | config-to-exec / tool invocation |
| update server trust | registry / README / AI recommendation trust |

즉, 보안 소프트웨어 업데이트 취약점의 본질은 “업데이트 기능이 위험하다”가 아니다.

본질은 신뢰받는 자동화 경로가 외부 입력과 만날 때 실행 경계가 무너진다는 점이다.

MCP도 같은 질문을 던진다.

> 누가 설정을 바꾸고, 그 설정은 어떤 실행 권한으로 이어지는가?

---

## 5. 학술 연구가 보여준 같은 구조

이 문제는 개별 사례에 머물지 않는다.

Yun et al.의 논문 [*Too Much of a Good Thing: (In-)Security of Mandatory Security Software for Financial Services in South Korea*](https://insuyun.github.io/pubs/2025/yun:ksa.pdf)는 한국 금융권의 필수 보안 소프트웨어가 브라우저 샌드박스 밖의 로컬 서비스로 동작하면서 웹페이지가 시스템 리소스 접근을 요청하는 구조를 체계적으로 분석했다.

논문은 네 가지 설계 문제를 지적한다.

- 브라우저 threat model과의 불일치
- TLS 보안 모델 오용
- 브라우저 샌드박스 위반
- 사용자 추적 가능성

특히 중요한 부분은 local service 구조다.

웹페이지 JavaScript가 사용자의 PC에 설치된 로컬 보안 프로그램과 HTTPS 또는 WebSocket 같은 웹 프로토콜로 통신하고, 그 프로그램이 파일 읽기/쓰기나 시스템 권한 접근이 필요한 작업을 수행한다. 또한 설치 후 백그라운드에서 포트를 열고 요청을 기다리기 때문에 정상 웹페이지뿐 아니라 악성 주체에도 노출될 수 있다.

이 논문이 MCP 논의에 중요한 이유는 특정 국가나 특정 제품 때문이 아니다.

보안을 위해 도입한 로컬 보조 프로그램이 웹페이지와 IPC 경로를 만들고, 그 경로가 브라우저가 원래 막으려던 시스템 리소스 접근을 다시 열어버린다는 구조 때문이다.

MCP도 비슷한 질문을 만든다.

> 누가 로컬 서비스를 호출할 수 있고, 그 호출은 어떤 시스템 권한으로 이어지는가?

---

## 6. 0.0.0.0 Day와 localhost trust의 붕괴

Oligo Security의 “0.0.0.0 Day”는 외부 웹페이지가 브라우저를 매개로 localhost 서비스에 접근할 수 있는 구조적 위험을 보여줬다.

MCP와 동일한 취약점은 아니다. 하지만 경고는 비슷하다.

| 0.0.0.0 Day | MCP |
|---|---|
| 외부 웹페이지 | 외부 문서, README, 이슈, agent input |
| 브라우저가 매개 계층 | AI IDE / MCP client가 매개 계층 |
| localhost API 접근 | local MCP server / internal endpoint 접근 |
| 로컬은 안전하다는 가정 붕괴 | 설정과 로컬 실행은 안전하다는 가정 붕괴 |

공통 메시지는 같다.

> localhost는 더 이상 자동으로 안전한 경계가 아니다.

브라우저, 로컬 API, updater, AI IDE, MCP client는 서로 다른 기술처럼 보인다. 그러나 공통적으로 외부 입력을 로컬 신뢰 경계 안으로 가져오는 매개 계층이 될 수 있다.

---

## 7. Tunnel은 편의 기능이 아니라 공격면이다

MCP 개발 과정에서는 로컬 서버를 외부 서비스와 연결하기 위해 tunnel을 쓰는 경우가 많다.

- ngrok
- Cloudflare Tunnel
- localtunnel
- bore

문제는 tunnel이 보안 기능이 아니라 노출 기능이라는 점이다.

```text
localhost MCP server
→ public tunnel URL
→ 인터넷 노출 endpoint
```

개발자는 이를 임시 테스트 편의 기능으로 생각한다. 그러나 외부에서 접근 가능한 URL이 생기는 순간 로컬 개발 서버는 internet-facing asset이 된다.

더 위험한 점은 이 노출이 자산 관리 체계에 잘 남지 않는다는 것이다. 방화벽 정책, CMDB, API inventory, ASM에서 빠질 수 있다.

그래서 MCP 시대에는 tunnel도 보안 점검 대상이 되어야 한다.

---

## 8. 기존 보안 도구가 놓치는 이유

MCP 문제는 코드 한 줄의 취약점만으로 설명되지 않는다.

다음 요소가 함께 위험을 만든다.

- runtime-only endpoint
- hidden transport
- authless exposure
- unrestricted filesystem
- environment variable exposure
- tool capability
- public tunnel exposure
- AI-mediated configuration

즉 code + config + runtime + operation이 합쳐진 공격면이다.

그래서 단순 static scan만으로는 놓치는 경우가 많다.

최근 공개한 [mcp-guard](https://github.com/windshock/mcpscan) 실험에서도 이런 차이가 보였다.

| Scanner | TP | FP | FN | Recall | Precision |
|---|---:|---:|---:|---:|---:|
| MCPScan | 0 | 4 | 24 | 0.0% | 0.0% |
| Cisco mcp-scanner | 1 | 1 | 23 | 4.2% | 50.0% |
| mcp-guard combined | 24 | 0 | 0 | 100% | 100% |

이 수치를 “내 도구가 더 좋다”로만 읽으면 핵심을 놓친다.

더 중요한 의미는 이것이다.

> MCP 보안은 악성 payload 탐지만으로 충분하지 않다. 권한 경계, transport, endpoint, runtime capability까지 함께 봐야 한다.

---

## 9. Tool poisoning보다 더 넓은 문제: capability poisoning

MCP 보안 논의는 종종 tool poisoning에 집중한다. tool description이나 prompt를 조작해 AI가 위험한 행동을 하도록 유도하는 문제다.

물론 중요하다.

하지만 더 넓은 문제는 capability poisoning이다.

공격자가 단순히 모델의 문장을 속이는 것이 아니라, 모델이 사용할 수 있는 능력의 범위 자체를 바꾸는 것이다.

예를 들어 다음은 모두 capability poisoning에 가깝다.

- 안전한 tool처럼 보이지만 실제로는 unrestricted file read가 가능하다.
- allowlist가 tool name만 보고 args와 path를 검증하지 않는다.
- UI에는 보이지 않는 hidden transport가 존재한다.
- 인증 없는 endpoint가 내부망 또는 tunnel을 통해 노출된다.
- config 변경으로 subprocess 실행 경로가 추가된다.
- runtime에서만 위험한 tool 목록이 노출된다.

이 경우 prompt 방어만으로는 충분하지 않다. 모델이 아무리 신중해도, 연결된 tool의 권한 경계가 무너지면 결과적으로 위험하다.

---

## 10. MCP 시대의 점검 질문

MCP 보안 점검의 핵심 질문은 단순하다.

> 외부 입력이 내부 실행으로 이어질 수 있는가?

이 질문을 실제 운영 질문으로 바꾸면 다음과 같다.

| 영역 | 질문 |
|---|---|
| 자산 | 어떤 MCP server, client, config, connector가 있는가? |
| 노출 | `/mcp`, `/sse`, HTTP endpoint, tunnel URL이 외부에 열려 있는가? |
| 설정 | `command`, `args`, `transport`, `endpoint`가 실행 의미를 갖는가? |
| 권한 | tool이 파일, env, shell, DB, 내부 API에 접근하는가? |
| 승인 | AI가 제안한 설정 변경을 사람이 이해하고 승인하는가? |
| 검증 | allowlist가 name뿐 아니라 args, path, host까지 검증하는가? |
| runtime | 실제 실행 시 tool 목록, hidden route, auth 상태가 확인되는가? |
| 로그 | tool invocation, command 실행, endpoint 호출이 남는가? |
| 무결성 | 설정, 다운로드, 실행 사이에 서명·해시·승인 단계가 있는가? |
| 경계 | 로컬 서비스가 브라우저 또는 AI client의 보안 모델 밖에서 더 높은 권한을 행사하는가? |

이 질문들은 전통적인 코드 취약점 점검표만으로는 잘 나오지 않는다.

MCP는 code, config, runtime, operation이 합쳐진 공격면이기 때문이다.

---

## 11. 대응 원칙: 설정과 실행을 분리하라

MCP 위험을 줄이려면 몇 가지 원칙이 필요하다.

첫째, 설정과 실행을 분리해야 한다. config가 곧바로 command가 되지 않도록 broker, policy engine, approval gate를 둬야 한다.

둘째, default-deny가 필요하다. filesystem, env, network, shell 접근은 명시적으로 허용된 경우에만 가능해야 한다.

셋째, transport를 숨기면 안 된다. UI에 보이는 tool만이 아니라 실제 endpoint와 hidden route를 함께 점검해야 한다.

넷째, runtime 검증이 필요하다. source scan만으로는 authless endpoint, tunnel exposure, runtime-only tool을 놓칠 수 있다.

다섯째, AI-mediated 설정 변경은 별도 위험으로 봐야 한다. AI가 제안한 config diff는 일반 코드 diff보다 더 엄격히 봐야 할 수 있다. 이유는 그것이 실행 권한 위임일 수 있기 때문이다.

---

## 12. 결론: MCP는 새로운 RPC다

MCP는 새롭다. 하지만 문제는 낯설지 않다.

RPC 보안의 역사는 늘 같은 질문으로 돌아왔다.

> 원격 입력을 내부 실행으로 바꾸는 경계는 어디에 있는가?

보안 소프트웨어 업데이트 취약점도 같은 교훈을 남긴다.

> 신뢰받는 자동화 경로가 외부 입력과 연결되면, 방어 도구도 실행 경계가 된다.

KSA 연구는 이 교훈을 더 넓은 웹 보안 모델의 문제로 확장한다. 표준 브라우저가 막아둔 시스템 리소스 접근을 로컬 보조 프로그램이 다시 열어주는 순간, 보안을 위해 설치한 소프트웨어도 새로운 공격면이 될 수 있다.

MCP는 그 질문을 AI 시대의 개발 환경으로 다시 가져왔다.

이번에는 원격 호출자가 사람이 아닐 수도 있다. README일 수도 있고, 문서일 수도 있고, AI가 읽은 웹페이지일 수도 있고, agent가 가져온 이슈일 수도 있다.

이번에는 실행자가 단일 서버가 아닐 수도 있다. IDE, MCP client, local server, connector, tunnel, container sidecar가 함께 실행 경계를 만든다.

그래서 MCP 보안은 prompt injection 대응만으로 끝나지 않는다. MCP 보안은 설정, 실행, 권한, 노출, runtime, 공급망을 함께 보는 문제다.

한 문장으로 정리하면 이렇다.

> MCP is not dangerous because it uses AI. It is dangerous because it turns configuration into delegated execution.

한국어로 바꾸면 더 직접적이다.

> MCP의 진짜 공격면은 프롬프트가 아니라, 추천과 실행 사이의 신뢰 경계다.

## Related Research & Tools

- [mcp-guard / MCP Security Lab](https://github.com/windshock/mcpscan)
- [Taisic Yun et al., “Too Much of a Good Thing: (In-)Security of Mandatory Security Software for Financial Services in South Korea”](https://insuyun.github.io/pubs/2025/yun:ksa.pdf)
- [공급망 보안은 SBOM만으로 끝나지 않는다](/ko/post/2026-05-02-ai-development-tools-supply-chain-governance/)
- [보안진단은 외주 업무가 아니라 개발 공정이 된다](/ko/post/2026-05-01-security-assessment-as-development-process/)
- [사이버보안의 SPOF: 역사에서 전략까지, 그래프 기반 분석](/ko/post/2025-05-15-spof-analysis-in-cybersecurity/)

## FAQ

### Q1. MCP 보안 문제는 프롬프트 인젝션 문제인가?

일부는 그렇다. 하지만 전체를 프롬프트 인젝션으로만 보면 부족하다. MCP의 핵심 위험은 외부 입력이 설정으로 승격되고, 설정이 실행으로 승격되는 경로다.

### Q2. MCP 서버를 localhost에만 열면 안전한가?

위험은 줄어들지만 충분하지는 않다. AI IDE, agent, 브라우저, 문서 기반 설정 변경, tunnel, 내부 connector가 localhost 신뢰 경계를 흔들 수 있다.

### Q3. static scan으로 MCP 취약점을 잡을 수 있나?

일부는 가능하다. 하지만 authless endpoint, hidden transport, runtime-only tool, tunnel exposure는 runtime 또는 endpoint 검증이 함께 필요하다.

### Q4. 조직은 어디서 시작해야 하나?

먼저 MCP server, client, config, connector, tunnel 사용 현황을 자산으로 식별해야 한다. 그 다음 `command`, `args`, filesystem, env, shell, internal API 접근 권한과 외부 노출 여부를 함께 점검해야 한다.
