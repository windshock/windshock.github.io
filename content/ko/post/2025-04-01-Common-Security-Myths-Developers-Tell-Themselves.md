---
title: "개발자들 말하는 보안에 대한 흔한 거짓말"
date: 2025-04-01
draft: false
tags: ["TrustAndCulture", "security", "devsecops", "개발 보안", "supply chain", "Rust"]
categories: ["보안"]
featured: true
image: "/images/post/dev-security-myths-cover.webp"
summary: "개발자들이 보안에 대해 자주 믿는 '책임 전가형', '기술 과신형', '보안 과소평가형' 거짓말을 분석하고, 현실적인 대응 방안을 제시합니다."
---

![개발자 보안 거짓말 만화](/images/post/dev-security-myths-cover.webp)

소프트웨어 개발 환경이 복잡해지고 보안 위협이 다양해지면서, 개발자들은 종종 보안과 관련하여 잘못된 믿음이나 오해를 가지게 됩니다. 이는 실제 보안 위협에 효과적으로 대응하는 데 큰 걸림돌이 될 수 있습니다. 본 보고서는 개발자들이 자주 믿는 흔한 보안 관련 거짓말들을 "책임 전가형", "기술 과신형", "보안의 과소평가형"으로 구분하여 명확히 제시하고, 이를 바로잡기 위한 현실적인 접근 방안을 제시합니다.

### 📌 1. 책임 전가형

**거짓말:** "보안은 보안 팀의 책임이지, 내 책임은 아닙니다."  
**현실:** 개발자도 보안의 핵심 역할을 수행하며, DevSecOps 환경에서는 보안이 모든 팀 구성원의 공동 책임입니다. 개발 초기 단계부터 개발자가 보안을 고려하지 않으면 코드에 취약점이 남을 수 있습니다 [(출처)](https://www.computerweekly.com/news/450424614/Developers-lack-skills-needed-for-secure-DevOps-survey-shows).

**거짓말:** "우리는 GitHub, AWS 같은 SaaS를 쓰니까 안전합니다."  
**현실:** SaaS 제공업체가 보안의 일부를 책임지지만, 사용자의 설정 오류나 취약한 타사 통합 등 공급망 공격의 위협은 여전히 존재합니다. 최근 GitHub Actions 공급망 공격 사례(tj-actions/changed-files)는 이러한 위험을 분명히 보여줍니다 [(출처)](https://thehackernews.com/2025/03/github-action-compromise-puts-cicd.html?m=1).

---

### 📌 2. 기술 과신형

**거짓말:** "우리 코드는 Rust와 같은 안전한 언어로 작성되었으니 안전합니다."  
**현실:** Rust는 메모리 안전성과 데이터 경쟁 방지 기능을 통해 버퍼 오버플로우나 메모리 누수 같은 문제는 예방할 수 있지만, SQL 주입이나 크로스 사이트 스크립팅(XSS) 같은 보안 위협까지 자동으로 해결하지 않습니다. 또한 unsafe 블록을 사용하면 메모리 안전성이 손상될 수 있습니다. Carnegie Mellon University(SEI)의 분석에 따르면, Rust가 모든 보안 문제를 해결하지 못하며, 특히 주입 공격이나 타사 라이브러리 오용 같은 문제는 별도의 보안 설계가 필요합니다 [(출처)](https://insights.sei.cmu.edu/blog/rust-software-security-a-current-state-assessment/).

**거짓말:** "최신 프레임워크와 라이브러리를 사용하니 안전합니다."  
**현실:** 최신 기술이라도 올바른 설정과 정기적인 업데이트가 이루어지지 않으면 보안 취약점이 발생할 수 있습니다. 오픈소스 라이브러리 중 86%가 취약점을 포함하고 있다는 연구 결과가 이를 입증합니다 [(출처)](https://www.scworld.com/news/report-86-of-codebases-contain-vulnerable-open-source-components).

**거짓말:** "HTTPS를 쓰니 데이터는 안전합니다."  
**현실:** HTTPS는 데이터 전송 중 암호화를 보장하지만, 서버 측 취약점이나 내부 위협 등 다른 공격을 방어하지 않습니다.

**거짓말:** "방화벽으로 보호되니 외부 공격에서 안전합니다."  
**현실:** 방화벽은 잘못 설정될 수 있고, 내부 공격자나 신뢰된 연결을 통한 공격은 방어하지 못합니다.

---

### 📌 3. 보안의 과소평가형

**거짓말:** "우리의 데이터는 민감하지 않으니 보안 걱정은 필요 없습니다."  
**현실:** 민감하지 않은 데이터라도 공격자가 네트워크 침투의 진입점으로 악용할 수 있습니다.

**거짓말:** "코드 리뷰만으로 모든 보안 문제를 잡을 수 있습니다."  
**현실:** 코드 리뷰는 중요하지만, 전문적인 보안 지식 없이는 모든 보안 문제를 발견하기 어렵습니다. 추가적인 자동화된 보안 도구와 전문가의 정기적 검토가 필요합니다.

**거짓말:** "우리는 이미 테스트를 거쳤으니 안전합니다."  
**현실:** 일반적인 기능 테스트로는 모든 보안 취약점을 찾을 수 없습니다. 보안 테스트는 별도로 수행되어야 하며, 지속적인 점검과 설계 수준의 리뷰가 필요합니다.

---

### 📌 대표적인 실제 사고 사례
- **GitHub Actions 공급망 공격 (2025년)**  
  → 23,000개 이상의 저장소에서 CI/CD 비밀 정보가 유출될 위험이 발생했습니다 [(출처)](https://thehackernews.com/2025/03/github-action-compromise-puts-cicd.html?m=1).
- **Log4Shell 취약점 (2021년)**  
  → Apache Log4j의 원격 코드 실행 취약점으로 전 세계적으로 큰 보안 문제를 야기했습니다 [(출처)](https://www.scworld.com/news/report-86-of-codebases-contain-vulnerable-open-source-components).

---

### 📌 보안을 위한 권장사항

- **정기적 보안 교육 제공**  
  최신 OWASP Top 10을 중심으로 한 개발자 보안 교육을 정기적으로 진행합니다 [(출처)](https://owasp.org/projects/).

- **보안 자동화 도구 도입**  
  SAST(정적 분석), DAST(동적 분석), SBOM(소프트웨어 자재명세서) 같은 도구를 활용하여 지속적으로 보안 문제를 탐지합니다.

- **오픈소스 라이브러리 관리 강화**  
  Dependabot, Renovate 등의 도구로 지속적으로 오픈소스 취약점을 관리하고 업데이트합니다.

- **태그 고정(pinning) 정책 적용**  
  GitHub Actions 사용 시 commit-hash 방식을 통해 버전을 고정하여 공급망 공격을 예방합니다.

이러한 접근을 통해 보다 실질적이고 지속 가능한 보안 문화를 구축할 수 있습니다.


