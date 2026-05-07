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

![MCP configuration-to-execution 흐름](/images/post/mcp-config-to-exec.svg)

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

---

## 2. 문제는 설정이 실행으로 승격되는 순간이다

(이미지 참고)

많은 개발자는 설정 파일을 코드보다 덜 위험하게 느낀다.

`mcp.json`, tool config, connector 설정, transport 설정은 겉으로는 단순한 환경 구성처럼 보인다. 하지만 MCP 환경에서는 설정이 곧 실행 경로가 될 수 있다.

---

## 3. RPC 보안 역사와 닮은 점

(생략)

---

## 6. 0.0.0.0 Day와 localhost trust의 붕괴

![localhost trust 붕괴 구조](/images/post/mcp-localhost-trust.svg)

localhost는 더 이상 자동으로 안전한 경계가 아니다.

---

## 9. 공격 벡터 구조

![MCP 공격 벡터](/images/post/mcp-attack-vectors.svg)

---

## 10. MCP 위험 판단 기준

![MCP 체크리스트](/images/post/mcp-checklist.svg)

---

## 결론

MCP의 진짜 공격면은 프롬프트가 아니라, 추천과 실행 사이의 신뢰 경계다.

## Related Research & Tools

- [mcp-guard / MCP Security Lab](https://github.com/windshock/mcpscan)
- [Taisic Yun et al., “Too Much of a Good Thing: (In-)Security of Mandatory Security Software for Financial Services in South Korea”](https://insuyun.github.io/pubs/2025/yun:ksa.pdf)
