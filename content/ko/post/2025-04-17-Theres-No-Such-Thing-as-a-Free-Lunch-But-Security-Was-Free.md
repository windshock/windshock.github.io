---
title: "공짜 점심은 없지만, 보안에는 공짜가 있었다"
date: 2025-04-17
draft: false
tags: ["CVE", "보안", "정책", "오픈소스", "공공재"]
categories: ["Security", "Policy"]
summary: "전 세계 보안 커뮤니티는 수십 년 동안 CVE 시스템에 의존해왔지만, 그 대가를 지불한 적은 거의 없습니다. 이제 이 공공 보안 인프라의 지속 가능성을 위해 누가 비용을 부담해야 할지 물어야 할 때입니다."
---

![CVE public goods crisis](/images/post/cve-free-lunch.webp)

> "공짜 점심은 없다."  
> 하지만 수십 년 동안, 보안은 공짜처럼 느껴졌습니다.

---

## CVE: 단순한 번호가 아니라, 보안의 좌표계

CVE(Common Vulnerabilities and Exposures)는 흔히 단순한 취약점 번호로 오해되지만, 실제로는 **전 세계 보안 툴, 벤더, 리포트가 동일한 취약점을 참조할 수 있게 해주는 기준점**입니다.

[Adam Shostack의 설명](https://shostack.org/blog/thoughts-on-cve/)처럼, 이는 정보보안의 ISBN과도 같습니다.

> “CVE의 가치는 단순한 번호가 아니라, 도구, 데이터베이스, 벤더 패치를 안정적으로 교차 참조할 수 있도록 해주는 기능에 있습니다.”

---

## 우리는 이 시스템을 공짜로 써왔다

CVE는 미국 정부 예산으로 운영되는 비영리기관 MITRE에 의해 유지되어 왔습니다.  
하지만 이 시스템은 사실상 **전 세계의 보안 인프라로 사용되며도 불구하고**,

- 대다수 연구자들은 무보수로 기여했고
- 국제적 재정 분담은 존재하지 않았으며
- 기업과 커뮤니티는 이를 **공짜로 활용**해 왔습니다.

결과적으로, CVE는 **글로벌 공공재**로서 작동하면서도 **단일 국가의 예산과 무급 노동에 의존한 구조**였습니다.

---

## 가까스로 막은 붕괴, 그러나 구조는 여전히 불안정

2025년 4월, MITRE의 CVE 운영 계약이 종료될 위기를 맞았고, CISA가 개입해 **11개월짜리 긴급 연장**을 승인했습니다.

> [Reuters](https://www.reuters.com/technology/us-funding-running-out-critical-cyber-vulnerability-database-manager-says-2025-04-15/), [BleepingComputer](https://www.bleepingcomputer.com/news/security/cisa-extends-funding-to-ensure-no-lapse-in-critical-cve-services/), [The Register](https://www.theregister.com/2025/04/16/cve_program_funding_save/)는 이 사태를 "위기는 피했지만, 구조적 문제는 여전하다"고 분석했습니다.

이는 단기적인 연명일 뿐, **단일 국가가 글로벌 시스템을 유지한다는 구조 자체가 이미 한계에 도달했음을 보여줍니다.**

---

## 보안세? 아직 없지만, 논의는 시작됐다

다음과 같은 상상을 해볼 수 있습니다:

> 사이버 위험이 높은 기업들이 매출의 일부를 보안 기금으로 납부하고,  
> 그 자금으로 CVE 같은 공공 인프라, NGO, 버그 바운티 프로그램, 연구자 보상 체계를 운영하는 구조.

이 아이디어는 [이 글](https://windshock.github.io/en/post/2023-04-18-strengthening-cybersecurity-through-government-ngos-and-bug-bounty-programs/)에서 소개되었으며,

- [BankInfoSecurity](https://www.bankinfosecurity.com/white-house-advisory-team-backs-cybersecurity-tax-incentives-a-24558)는 미국 백악관 자문위원회가 **사이버보안 세액공제 인센티브**를 권고하고 있으며,
- [TechTarget](https://www.techtarget.com/searchitchannel/post/Framing-cybersecurity-as-a-tax-on-businesses)는 **사이버보안을 '기업이 부담해야 할 필수 비용'으로 인식하는 흐름**을 설명합니다.

이는 다음과 같은 인식을 반영합니다:

- 보안 인프라에 무임승차하는 구조는 지속 불가능
- 공공 보안 시스템에는 공동 책임이 필요함
- 기여자는 단순한 명예가 아닌 **정당한 보상**을 받아야 함

---

## 지속 가능한 구조로 전환: 글로벌 협력의 조짐

[CVE는 더 이상 국가의 시스템이 아니라, 전 세계 인터넷의 기반 인프라]라는 인식이 확산되고 있습니다.
이를 반영하여 [Common Good Cyber](https://www.darkreading.com/vulnerabilities-threats/funding-the-organizations-that-secure-the-internet)는 다음과 같은 구조를 제안합니다:

- **공동 기금 조직(Joint Funding Orgs)** — 전염병 대응 구조와 유사한 다자 자금 운영
- **연합 모금(Federated Fundraising)** — 유나이티드웨이처럼 효율적 자원 분배
- **비즈니스 가치 분석** — 각 조직의 영향력을 수치화하여 기금 조성
- **비영리 가속기 허브** — 자원 집중 및 펀딩 기술 지원

이러한 구조는 2025년 RSA 컨퍼런스에서 발표되었으며, [CSIS](https://www.csis.org/analysis/shared-responsibility-public-private-cooperation-cybersecurity)도 유사한 공공-민간 협력 모델의 필요성을 제시하고 있습니다.

---

## 공짜는 아니었다. 이제는 지불할 때다

CVE는 결코 공짜가 아니었습니다.  
**단지 우리가 누군가의 노동과 세금, 헌신에 기대어 살아왔을 뿐입니다.**

이제 우리는 그 공공재가 사라지기 전에,
- 국제 공동 펀딩,
- 산업계의 책임 분담,
- 기여자에 대한 정당한 보상,
- 민관 협력 체계를 함께 설계해야 합니다.

> 보안은 공짜처럼 느껴졌지만,  
> 그 값을 누군가는 항상 지불하고 있었습니다.

---

## 📌 요약

- CVE는 사이버보안의 핵심 공공 인프라입니다.
- 전 세계가 사용하지만, 미국만이 자금을 부담해 왔습니다.
- 2025년, 11개월 간의 유예는 구조적 문제를 해결하지 못합니다.
- 지속 가능성을 위한 글로벌 협력과 새로운 자금 모델이 필요합니다.

> 공짜 점심은 끝났습니다.  
> 이제는 누가 계산서를 들고 있었는지 돌아볼 시간입니다.


