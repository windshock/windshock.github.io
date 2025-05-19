---
title: "보안진단 담당자의 흔한 착각"
date: "2024-06-16"
categories:
  - 보안진단
  - 취약점평가
tags:
  - 보안
  - 취약점
  - 보안운영
  - KPI
  - TrustAndCulture
featured: true
image: "/images/post/misconceptions-of-security-assessors.webp"
summary: "사이버 보안 환경이 끊임없이 변화하면서 보안 취약점 평가는 잠재적인 보안 침해에 대한 주요 방어수단으로 자리잡고 있습니다. 그러나 이에 대한 일반적인 오해로 인해 평가의 실효성이 저하되는 경우가 많습니다. 본 글에서는 보안 취약점 평가에 대한 잘못된 인식을 살펴보고, 이를 극복할 수 있는 효과적인 전략을 제시함으로써 조직의 보안 수준 향상을 지원하고자 합니다."
draft: false
---

# 보안진단 담당자의 흔한 착각

![Common Misconceptions Toon](/images/post/misconceptions-of-security-assessors.webp)

## 비효율적인 취약점 평가 구조와 대응 방법

# 서론

사이버 보안 환경이 끊임없이 변화하면서 보안 취약점 평가는 잠재적인 보안 침해에 대한 주요 방어수단으로 자리잡고 있습니다. 그러나 이에 대한 일반적인 오해로 인해 평가의 실효성이 저하되는 경우가 많습니다. 본 글에서는 보안 취약점 평가에 대한 잘못된 인식을 살펴보고, 이를 극복할 수 있는 효과적인 전략을 제시함으로써 조직의 보안 수준 향상을 지원하고자 합니다.

# 보안 취약점 평가에 대한 잘못된 인식

## 1. 모든 취약점을 반드시 찾아내야 한다는 믿음

보안 취약점 평가 담당자들 사이에는 모든 취약점을 반드시 찾아내야 한다는 생각이 팽배합니다. 이는 인간 평가자의 한계를 이해하지 못한 것입니다. Tyma 등(2019)[1]의 연구에 따르면, 광범위한 노력에도 불구하고 일부 취약점만이 발견되었다고 합니다. 또한 회사의 승인 없이 취약점을 분석한 외부인에 대해 배타적인 자세를 보이는 경우도 있습니다. 이러한 인식의 한계는 평가 담당자들에게 좌절감과 불만을 야기할 수 있습니다.

## 2. 보안 점검자의 능력에 대한 과장된 인식

보안 점검 담당자들은 모든 취약점을 반드시 찾아내야 한다고 착각하며, 자신이 발견하지 못한 취약점이 보고되면 화를 내는 경향이 있습니다. 이를 극복하려면 보안 점검자의 능력 한계를 인정하고, 외부 리소스(외부 전문가, 버그바운티 등)[2]를 활용해 취약점을 체계적으로 관리하는 노력이 필요합니다.

## 3. 취약점에 대한 상세한 설명으로 문제가 해결될 것이라는 착각

많은 이들은 개발자에게 취약점에 대한 상세한 정보를 제공하면 보안 문제가 완전히 해결될 것이라고 생각합니다. 그러나 OWASP Top 10[3]에서 볼 수 있듯이, 상세한 이해에도 불구하고 기본적인 보안 문제는 지속적으로 발생합니다. 이는 근본적인 구조적 문제로, 취약점 정보만으로는 이를 해결하기 어렵습니다.

# 실효성 있는 취약점 평가를 위한 전략

## 1. 통합적인 보안 설계 접근

개발자의 업무와 이해관계자의 요구사항을 이해하고, 이를 반영하여 구체적인 보안 설계 사양을 수립해야 합니다[2]. 단순히 취약점을 찾는 것이 아닌, 포괄적인 보안 설계 접근이 필요합니다.

## 2. 체계적인 취약점 관리 프로세스 마련

취약점 발견 프로세스를 체계화하고, 버그 바운티, 침투 테스트 등 외부 자원을 활용해 취약점 발견 범위를 확대하며, 평가의 일관성과 효율성을 높일 수 있습니다(Shostack, 2014)[4].

## 3. 보안 보고 기술 향상

취약점을 실증하지 않고도 효과적으로 보고할 수 있는 기술을 익힘으로써 평가의 효율성과 정확성을 높일 수 있습니다. CVSS(Common Vulnerability Scoring System) 등의 표준화된 도구를 활용하는 것도 도움이 됩니다(Ferrante & Canali, 2012)[5].

# 결론

보안 취약점 평가는 강력한 사이버 보안 전략의 핵심 요소입니다. 일반적인 오해를 해소하고 체계적이며 통합적인 접근법을 구현함으로써 조직은 보안 수준을 높이고 잠재적인 위협의 위험을 줄일 수 있습니다. 인간 평가자의 한계를 인정하고, 보안 설계 중심의 접근, 체계적인 취약점 관리, 보고 기술 향상을 통해 끊임없이 변화하는 사이버 위협에 효과적으로 대응할 수 있을 것입니다.

[1] Tyma, G. et al. (2019). "Limitations of Human Vulnerability Assessors: A Comparative Study." Proceedings of the 34th Annual Computer Security Applications Conference.  
[2] Whitman, M. E., & Mattord, H. J. (2016). Principles of Information Security. Cengage Learning.  
[3] OWASP. (2021). "OWASP Top 10." The Open Web Application Security Project.  
[4] Shostack, A. (2014). Threat Modeling: Designing for Security. Wiley.  
[5] Ferrante, A., & Canali, C. (2012). "A Systematic Approach to the Assessment of Security Vulnerabilities." Journal of Information Security and Applications, 17(6), 318-329.
