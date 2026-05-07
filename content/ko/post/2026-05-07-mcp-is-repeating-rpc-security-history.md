---
title: "MCP는 RPC 보안의 역사를 반복하고 있다"
date: 2026-05-07
draft: false
featured: true
tags: ["Code", "MCP", "AI Security", "RPC", "Supply Chain", "DevSecOps", "보안운영"]
categories: ["Security", "Supply Chain"]
description: "MCP 보안 문제를 프롬프트 인젝션이 아니라 RPC, 로컬 실행 경계, 설정 승격, 공급망 거버넌스 관점에서 분석합니다."
summary: "MCP는 단순한 AI 플러그인 규격이 아니라 외부 입력을 내부 실행으로 연결하는 새로운 RPC 경계다. 이 글은 MCP 취약점을 설정-실행 승격, localhost trust, runtime exposure, tunnel exposure, 공급망 거버넌스 관점에서 분석한다."
image: "/images/post/mcp-config-to-exec.svg"
---

MCP(Model Context Protocol)의 보안 위험은 프롬프트 인젝션이 아니라, 설정이 실행 권한으로 승격되는 구조 자체에 있다. 이 패턴은 XML-RPC부터 CI/CD까지 수십 년간 반복된 RPC 보안 문제와 정확히 같다.

![MCP configuration-to-execution 흐름](/images/post/mcp-config-to-exec.svg)

MCP는 단순한 AI 플러그인 규격처럼 보인다.

그러나 보안 관점에서 보면 MCP는 더 오래된 질문을 다시 꺼낸다.

> 원격 입력을 어디까지 내부 실행 권한으로 믿을 것인가?

이 질문은 XML-RPC, Java RMI, OpenStack RPC, 브라우저 확장, 로컬 보안 프로그램, CI/CD 자동화에서 반복되어 왔다. MCP는 그 질문을 AI IDE와 agent 개발 환경으로 가져왔다.

그래서 MCP 보안은 단순히 "프롬프트 인젝션을 막는 문제"가 아니다. 더 본질적인 문제는 외부 입력이 설정으로 바뀌고, 설정이 도구 호출로 바뀌며, 도구 호출이 로컬 또는 내부 시스템 실행 권한으로 이어지는 구조다.

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

즉 MCP는 "AI에게 기능을 붙이는 규격"이면서 동시에 "외부 입력을 내부 실행 권한으로 연결하는 위임 계층"이다.

---

## 2. 문제는 설정이 실행으로 승격되는 순간이다

대부분의 개발자는 설정 파일을 코드보다 덜 위험하게 느낀다.

`mcp.json`, tool config, connector 설정, transport 설정은 겉으로는 단순한 환경 구성처럼 보인다. 하지만 MCP 환경에서는 설정이 곧 실행 경로가 된다.

```text
외부 입력
  → AI 추천 / 사용자 승인
  → MCP 설정 (mcp.json)
  → command / args / endpoint
  → 도구 호출
  → 로컬 실행
```

이것은 프롬프트 인젝션이 아니다. **설정 승격(configuration escalation)**이다.

> 외부 입력이 설정이 되고, 설정이 실행이 된다. 이것이 진짜 공격면이다.

---

## 3. RPC 보안 역사와 닮은 점

RPC의 문제는 "원격 호출" 자체가 아니었다. 항상 **신뢰 경계**의 문제였다.

| RPC 세계 | MCP 세계 |
|---|---|
| 원격 호출 (remote invocation) | 도구 호출 (tool invocation) |
| 직렬화된 객체 (serialized object) | 설정 JSON / 인자 |
| 신뢰된 역직렬화 (trusted deserialization) | 신뢰된 설정 (trusted configuration) |
| 노출된 엔드포인트 | 노출된 MCP 엔드포인트 |
| localhost 신뢰 | 로컬 MCP 신뢰 |
| gadget chain | config-to-exec chain |

MCP가 반복하고 있는 패턴은 새로운 것이 아니다. 신뢰 경계 없이 원격 입력을 로컬에서 실행하는 구조 — 그것이 RPC 보안이 수십 년간 실패해 온 정확한 이유다.

---

## 4. 로컬 보안 소프트웨어 실패의 교훈

이 패턴은 이미 검증된 실패 사례가 있다.

로컬 보안 소프트웨어(SSO 에이전트, 인증서 관리 도구, DRM, 업데이트 에이전트)는 반복적으로 같은 방식으로 실패해 왔다.

```text
외부 입력
  → 로컬 API 호출
  → 업데이트 / 설정 변경
  → 다운로드 / 설치
  → 코드 실행
```

문제는 "업데이트 기능"이 아니다. 문제는 다음과 같다.

- 인증 없는 로컬 API
- 외부에서 제어 가능한 설정
- 무결성 검증 부재
- 신뢰된 실행 경로

MCP 서버도 같은 위치에 있다. 로컬에서 돌아가고, 외부 입력을 받으며, 실행 권한을 가진다. 과거 로컬 보안 소프트웨어가 실패한 구조적 조건을 그대로 물려받고 있다.

---

## 5. 0.0.0.0 Day와 localhost trust의 붕괴

![localhost trust 붕괴 구조](/images/post/mcp-localhost-trust.svg)

localhost는 더 이상 자동으로 안전한 경계가 아니다.

`0.0.0.0`에 바인딩된 서비스는 외부 네트워크에서 직접 접근할 수 있다. MCP 서버가 인증 없이 로컬 포트에 바인딩되면, 같은 네트워크의 다른 프로세스나 외부 공격자가 도구 호출을 직접 트리거할 수 있다.

"로컬이니까 안전하다"는 가정은 다음 조건 하에서 이미 무너진다.

- MCP 서버가 `0.0.0.0` 또는 모든 인터페이스에 바인딩
- 인증·인가 없는 JSON-RPC 엔드포인트 노출
- 브라우저 기반 공격(DNS rebinding, SSRF)으로 localhost 접근 가능
- 컨테이너/VM 환경에서 localhost 경계가 모호

> localhost는 더 이상 신뢰 경계가 아니다 — 공격면이다.

---

## 6. 공격 벡터 구조

![MCP 공격 벡터](/images/post/mcp-attack-vectors.svg)

MCP 환경에서 공격이 발생하는 경로는 크게 세 가지다.

1. **사용자 복사-붙여넣기** — 외부에서 가져온 MCP 설정을 검증 없이 프로젝트에 적용
2. **직접 설정 주입** — 공유 저장소, 템플릿, 패키지 매니저를 통해 `mcp.json`이 프로젝트에 포함
3. **AI 매개 설정** — AI가 외부 소스를 기반으로 MCP 도구를 추천하고, 사용자가 승인

세 경로 모두 공통점이 있다. **외부 입력이 설정을 거쳐 실행으로 이어진다는 것이다.**

---

## 7. 기존 스캐너가 놓치는 이유

MCP 위험은 단순한 코드 수준 문제가 아니다.

다음과 같은 영역에서 발생한다.

- **설정**: `mcp.json`의 command, args, endpoint 값
- **런타임 행위**: 실행 시점에 결정되는 도구 호출 대상
- **숨겨진 엔드포인트**: 문서화되지 않은 로컬 API
- **권한 노출**: 도구가 실제로 접근 가능한 시스템 범위

기존 SAST/DAST 도구는 코드의 취약 패턴을 찾는다. 하지만 MCP 위험은 "코드가 아니라 설정이 실행을 결정하는 구조"에서 나온다. 설정 파일 자체에는 취약한 코드 패턴이 없기 때문에, 기존 스캐너의 탐지 범위 밖에 있다.

---

## 8. MCP 위험 판단 기준

![MCP 체크리스트](/images/post/mcp-checklist.svg)

MCP 도구를 도입하거나 운영할 때, 다음을 확인해야 한다.

- [ ] MCP 서버가 바인딩하는 주소와 포트는 무엇인가?
- [ ] 인증·인가 없이 접근 가능한 엔드포인트가 있는가?
- [ ] 설정 파일이 외부 입력(사용자, AI, 패키지)에 의해 변경될 수 있는가?
- [ ] 도구 호출이 shell 실행, 파일 쓰기 등 위험한 작업을 수행하는가?
- [ ] 설정 변경에 대한 감사 로그가 존재하는가?
- [ ] MCP 서버의 출처와 무결성을 검증하는 절차가 있는가?

---

## 결론

MCP가 위험한 이유는 AI를 사용하기 때문이 아니다.

위험한 이유는 **설정을 위임된 실행으로 바꾸는 구조** 때문이다.

> MCP의 진짜 공격면은 프롬프트가 아니라, 추천과 실행 사이의 신뢰 경계다.

이 패턴은 XML-RPC에서 시작해 Java RMI, 로컬 보안 소프트웨어, CI/CD를 거쳐 지금 MCP에 도달했다. 기술 이름만 바뀌었을 뿐, 구조적 문제는 같다.

---

## Related Research & Tools

- [mcp-guard / MCP Security Lab](https://github.com/windshock/mcpscan)
- [Taisic Yun et al., "Too Much of a Good Thing: (In-)Security of Mandatory Security Software for Financial Services in South Korea"](https://insuyun.github.io/pubs/2025/yun:ksa.pdf)
