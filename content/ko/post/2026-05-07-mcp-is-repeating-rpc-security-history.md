---
title: "MCP는 RPC 보안의 역사를 반복하고 있다"
date: 2026-05-07
draft: false
featured: true
tags: ["Code", "MCP", "AI Security", "RPC", "Supply Chain", "보안운영"]
categories: ["Security", "Supply Chain"]
description: "MCP 보안 문제를 프롬프트 인젝션이 아니라 RPC·설정 승격·실행 경계 관점에서 분석합니다."
summary: "MCP는 단순 AI 플러그인 규격이 아니라 외부 입력을 내부 실행으로 연결하는 새로운 RPC 경계다. 이 글은 MCP 취약점을 설정-실행 승격, runtime trust, tunnel exposure 관점에서 분석한다."
image: "/images/post/mcp-rpc-security-history.webp"
---

MCP(Model Context Protocol)는 단순한 AI 플러그인 규격처럼 보인다. 하지만 보안 관점에서 보면 MCP는 더 오래된 문제를 다시 꺼낸다.

> 원격 입력을 어디까지 내부 실행 권한으로 믿을 것인가?

이 질문은 XML-RPC, Java RMI, OpenStack RPC, deserialization 문제에서 반복되어 왔다. MCP는 그 질문을 AI 시대의 개발 환경으로 가져왔다.

---

## MCP는 기능이 아니라 실행 경계다

MCP 서버는 단순 조회 기능만 수행하지 않는다.

- 파일 읽기/쓰기
- shell/subprocess 실행
- API key 접근
- 내부 API 호출
- 데이터베이스 접근
- CI/CD 연동

즉 MCP는 외부 입력과 내부 실행 권한을 연결하는 경계다.

문제는 많은 개발자가 `mcp.json` 같은 설정 파일을 코드보다 덜 위험하게 인식한다는 점이다.

하지만 실제 구조는 다음과 같다.

```text
외부 입력
→ AI 또는 사용자 승인
→ MCP 설정(JSON)
→ command / args
→ 로컬 또는 서버 실행
```

여기서 핵심은 프롬프트 인젝션 자체가 아니다.

핵심은 설정이 실행으로 승격된다는 점이다.

---

## RPC 보안 역사와 닮은 점

| 과거 RPC | MCP |
|---|---|
| remote invocation | tool invocation |
| trusted deserialization | trusted configuration |
| hidden method | hidden transport |
| localhost trust | local MCP trust |
| wrapper bypass | allowlist bypass |
| gadget chain | config-to-exec chain |

RPC 계열 기술은 항상 “원격 입력이 실행 의미를 갖는 순간” 위험해졌다.

MCP도 비슷하다.

설정은 단순 JSON처럼 보이지만, `command`, `args`, `transport`가 실행 경로와 연결되는 순간 권한 위임 구조가 된다.

---

## 왜 기존 보안 도구가 놓치는가

MCP 문제는 코드 한 줄의 취약점만으로 설명되지 않는다.

다음 요소가 함께 위험을 만든다.

- runtime-only endpoint
- hidden transport
- authless exposure
- unrestricted filesystem
- tool capability
- tunnel exposure
- AI-mediated configuration

즉 code + config + runtime + operation이 합쳐진 공격면이다.

그래서 단순 static scan만으로는 놓치는 경우가 많다.

최근 공개한 [mcp-guard](https://github.com/windshock/mcpscan) 실험에서도 이런 차이가 보였다.

| Scanner | Recall |
|---|---:|
| MCPScan | 0.0% |
| Cisco mcp-scanner | 4.2% |
| mcp-guard combined | 100% |

이 수치의 핵심은 “누가 더 우수한가”보다 다음 메시지에 있다.

> MCP 보안은 악성 payload 탐지만으로 충분하지 않다.

권한 경계, transport, endpoint, runtime capability까지 함께 봐야 한다.

---

## Tunnel은 편의 기능이 아니라 공격면이다

MCP 개발 과정에서는 ngrok, Cloudflare Tunnel, localtunnel 같은 도구가 자주 사용된다.

문제는 이것이 단순 개발 편의 기능이 아니라는 점이다.

```text
localhost MCP server
→ public tunnel URL
→ 인터넷 노출 endpoint
```

개발자는 임시 테스트라고 생각하지만, 외부 URL이 생기는 순간 로컬 개발 서버는 인터넷-facing asset이 된다.

더 위험한 점은 이런 노출이 자산 관리 체계에 잘 남지 않는다는 점이다.

그래서 MCP 시대에는 tunnel도 보안 점검 대상이 되어야 한다.

---

## 0.0.0.0 Day와의 구조적 유사성

Oligo Security의 “0.0.0.0 Day”는 외부 웹페이지가 localhost 서비스에 접근할 수 있는 구조적 위험을 보여줬다.

MCP와 완전히 같은 취약점은 아니지만 구조는 닮았다.

| 0.0.0.0 Day | MCP |
|---|---|
| 외부 웹페이지 | 외부 문서/README |
| 브라우저가 매개 | AI IDE / MCP client |
| localhost API 접근 | local MCP execution |
| 로컬은 안전하다는 가정 붕괴 | 설정은 안전하다는 가정 붕괴 |

공통 메시지는 같다.

> 외부 입력이 로컬 실행 경계에 닿기 시작했다.

---

## MCP 시대의 핵심 질문

MCP 보안 점검의 핵심 질문은 단순하다.

> 외부 입력이 내부 실행으로 이어질 수 있는가?

이 질문을 실제 운영으로 바꾸면 다음과 같다.

- 외부 노출된 MCP endpoint가 있는가?
- `command` / `args` 실행이 가능한가?
- AI가 설정 변경을 제안하는가?
- tunnel이 localhost를 공개하고 있는가?
- filesystem/env/shell 접근이 가능한가?
- runtime endpoint와 hidden route를 확인했는가?

MCP 보안은 단순한 코드 취약점 분석이 아니다.

실행 아키텍처 전체를 보는 문제다.

---

## 결론

MCP는 위험하다. 하지만 그 이유는 AI를 사용하기 때문만은 아니다.

MCP가 위험한 이유는:

```text
외부 입력
→ 설정 변경
→ tool invocation
→ 내부 실행
```

이 경계를 한 흐름으로 묶기 때문이다.

RPC 보안의 역사는 늘 같은 질문으로 돌아왔다.

> 원격 입력을 내부 실행으로 바꾸는 경계는 어디에 있는가?

MCP는 그 질문을 AI 시대의 개발 환경으로 다시 가져왔다.

한 문장으로 정리하면 이렇다.

> MCP의 진짜 공격면은 프롬프트가 아니라, 추천과 실행 사이의 신뢰 경계다.

## Related Research

- [mcp-guard / MCP Security Lab](https://github.com/windshock/mcpscan)
- [공급망 보안은 SBOM만으로 끝나지 않는다](/ko/post/2026-05-02-ai-development-tools-supply-chain-governance/)
- [보안진단은 외주 업무가 아니라 개발 공정이 된다](/ko/post/2026-05-01-security-assessment-as-development-process/)
- [사이버보안의 SPOF: 역사에서 전략까지, 그래프 기반 분석](/ko/post/2025-05-15-spof-analysis-in-cybersecurity/)
