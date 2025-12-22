---
title: "2025년 공격 표면 관리(ASM): 왜 지속적 가시성이 필수인가"
date: 2025-12-22
draft: false
tags: ["Attack Surface Management", "ASM", "지속적 모니터링", "EASM", "CAASM", "공격 표면 가시성", "자산 발견", "섀도우 IT", "서드파티 리스크", "제로 트러스트"]
categories: ["보안", "보안 운영"]
description: "2025년 공격 표면 관리(ASM)에서 ‘지속적 가시성’이 왜 필수인지, 주요 트렌드/설문 인사이트/실무 포인트를 정리합니다."
---

<a href="/files/ASM_Promise_Reality_Behavior.pdf" target="_blank" rel="noopener">
  <img
    src="/images/pdf-previews/ASM_Promise_Reality_Behavior_p1.webp"
    alt="ASM_Promise_Reality_Behavior.pdf - 첫 페이지 미리보기"
    style="width: 100%; max-width: 1000px; border: 1px solid #e5e7eb; border-radius: 8px;"
  />
</a>

<iframe
  src="/files/ASM_Promise_Reality_Behavior.pdf"
  width="100%"
  height="900"
  style="border: 1px solid #e5e7eb; border-radius: 8px;"
></iframe>

> PDF가 보이지 않으면 여기로 열어보세요: [`/files/ASM_Promise_Reality_Behavior.pdf`](/files/ASM_Promise_Reality_Behavior.pdf)

## 관련 영상

{{< youtube QeRBhrse_K8 >}}

# 2025년 공격 표면 관리(ASM): 왜 지속적 가시성이 필수인가

**2025년에는 공격 표면이 폭발적으로 커졌습니다.** 클라우드, SaaS, IoT, 원격 근무가 기존 네트워크 경계를 무너뜨리면서, 조직은 웹 앱·API·섀도우 IT·서드파티 서비스까지 포함하는 **방대한 자산 지형도**를 상대하게 됐습니다. 이 모든 것이 공격자의 진입점이 될 수 있습니다[[1]](https://threatmon.io/attack-surface-visibility-in-2025-why-it-matters-more-than-ever/#:~:text=As%20the%20digital%20perimeter%20dissolves%2C,potential%20entry%20point%20for%20adversaries)[[2]](https://threatmon.io/attack-surface-visibility-in-2025-why-it-matters-more-than-ever/#:~:text=The%20rise%20of%20hybrid%20work%2C,even%20know%20those%20assets%20exist). 공격자는 자동화와 AI를 활용해 설정 오류나 잊힌 도메인을 몇 초 만에 스캔하며, 종종 **“방어자가 그 자산의 존재를 알기도 전에”** 약점을 찾아냅니다[[2]](https://threatmon.io/attack-surface-visibility-in-2025-why-it-matters-more-than-ever/#:~:text=The%20rise%20of%20hybrid%20work%2C,even%20know%20those%20assets%20exist). 이런 환경에서 **가시성(visibility)**은 새로운 전장입니다. 결국 **“보이지 않는 것은 방어할 수 없다”**는 말이 더 이상 수사가 아니라 현실이 됐습니다[[3]](https://threatmon.io/attack-surface-visibility-in-2025-why-it-matters-more-than-ever/#:~:text=In%202025%2C%20visibility%20has%20become,defend%20what%20you%20cannot%20see).

## 공격 표면 관리가 더 중요해진 이유

**지속적 공격 표면 관리(Continuous Attack Surface Management, ASM)**는 2025년에 “있으면 좋은 것”이 아니라 **필수 보안 실무**가 됐습니다[[4]](https://fortifydata.com/attack-surface-management-asm-market-size/#:~:text=Because%20of%20this%20growing%20risk%2C,ones%20are%20expanding%20their%20features). 이유는 명확합니다.

- **디지털 확장과 섀도우 자산:** 기업은 빠르게 서비스를 온라인으로 옮기고 새로운 디지털 서비스를 배포합니다. 새로운 클라우드 인스턴스, SaaS 앱, IoT, 벤더 연동이 생길 때마다 공격 표면은 커집니다[[5]](https://threatmon.io/attack-surface-visibility-in-2025-why-it-matters-more-than-ever/#:~:text=Meanwhile%2C%20enterprises%20are%20adding%20new,where%20most%20modern%20breaches%20begin). 많은 자산이 기존 모니터링 바깥에 존재해 *가시성 공백*을 만들고, 이 공백이 침해의 시작점이 되곤 합니다[[5]](https://threatmon.io/attack-surface-visibility-in-2025-why-it-matters-more-than-ever/#:~:text=Meanwhile%2C%20enterprises%20are%20adding%20new,where%20most%20modern%20breaches%20begin). 예를 들어 멀티클라우드는 이미 일반적이며, *기업의 92%가 복수 클라우드를 사용*한다는 통계는 복잡성과 위험이 얼마나 커졌는지 보여줍니다[[6]](https://fortifydata.com/attack-surface-management-asm-market-size/#:~:text=Every%20cloud%20app%20or%20tool,realize%20how%20much%20they%E2%80%99re%20exposing).

- **동적 환경(변화 속도):** 공격 표면은 고정돼 있지 않습니다. 클라우드 워크로드는 매일 생성·삭제되고, 개발자는 새 API/마이크로서비스를 배포하며, 직원은 어디서든 접속합니다. 정기 점검(분기/반기 감사)만으로는 이런 변화를 따라가기 어렵습니다. 공격자는 이 “틈”을 노립니다. *패치되지 않은 테스트 서버, 고아(orphan) 도메인, 유출된 자격증명*은 좋은 표적입니다. **지속적 ASM**은 자산을 실시간으로 발견·모니터링해 노출 창을 줄이고, 공격자가 이용하기 전에 노출을 찾아 수정하게 돕습니다[[7]](https://threatmon.io/attack-surface-visibility-in-2025-why-it-matters-more-than-ever/#:~:text=%2A%20Continuously%20discovering%20every%20internet,translates%20into%20rapid%2C%20automated%20response)[[8]](https://threatmon.io/attack-surface-visibility-in-2025-why-it-matters-more-than-ever/#:~:text=2,positives%20or%20reacting%20too%20late). 또한 한 조사에 따르면 보안팀은 **사후 대응에서 사전 대응으로 이동**하고 있으며, 기업의 70% 이상이 “사후 방어”보다 *실시간 가시성과 지속 모니터링* 도구에 더 많은 비용을 쓰고 있습니다[[9]](https://fortifydata.com/attack-surface-management-asm-market-size/#:~:text=More%20companies%20now%20focus%20on,exploits%20it%20to%20their%20advantage)[[10]](https://fortifydata.com/attack-surface-management-asm-market-size/#:~:text=This%20mindset%20change%20is%20massive,ASM%20fits%20that%20model%20perfectly).

- **고도화된 위협과 AI 기반 공격:** 2025년 공격자는 정찰을 자동화하고 AI로 외부 표면의 “틈”을 더 빠르게 찾습니다[[2]](https://threatmon.io/attack-surface-visibility-in-2025-why-it-matters-more-than-ever/#:~:text=The%20rise%20of%20hybrid%20work%2C,even%20know%20those%20assets%20exist). 공격자는 “약점이 있는가”가 아니라 “어디에 있는가”를 묻습니다. 그래서 **미파악(unknown) 공격 표면을 줄이는 것**이 중요합니다. 특히 API는 대표적인 신흥 공격 벡터입니다. 한 보고서에 따르면 *기업의 99%가 최근 1년 내 최소 한 번의 API 보안 사고를 경험*했으며, 숨겨진/미관리 API가 원인이 되기도 합니다[[11]](https://cybelangel.com/blog/the-api-threat-report-2025/#:~:text=,attacks%20came%20from%20authenticated%20sessions). 이 중 3분의 1 이상은 인젝션 및 인증/인가(authorization) 취약점이었고, **API 공격의 95%는 “유효한 자격증명”을 사용**했습니다(공격자가 인증 세션을 ‘얹는’ 방식)[[12]](https://cybelangel.com/blog/the-api-threat-report-2025/#:~:text=,implement%20one%20within%20a%20year). 즉, 공격자는 방치된 문을 통해 들어옵니다. ASM의 역할은 모든 자산과 취약점을 드러내 **그 문을 잠그는 것**입니다.

- **컴플라이언스와 신뢰:** 규제기관과 이해관계자는 이제 공격 표면을 체계적으로 관리하기를 요구합니다. (예: 미국 SEC 사이버 공시 규정, EU NIS2) **지속적인 자산 모니터링과 신속한 사고 보고**가 요구됩니다[[13]](https://fortifydata.com/attack-surface-management-asm-market-size/#:~:text=5). 디지털 풋프린트를 놓치면 침해뿐 아니라 위반·벌금·평판 훼손으로 이어집니다. 많은 조직이 ASM을 **비즈니스 필수 과제로 격상**시키고 있습니다[[14]](https://threatmon.io/attack-surface-visibility-in-2025-why-it-matters-more-than-ever/#:~:text=2,positives%20or%20reacting%20too%20late). ASM 시장이 2024년 약 **8억 5,650만 달러**에서 2032년 **43억 달러**로 성장(연평균 22.6%)할 것으로 전망되는 것도 이런 흐름을 반영합니다[[15]](https://fortifydata.com/attack-surface-management-asm-market-size/#:~:text=The%20Attack%20Surface%20Management%20market,a%20period%20of%20seven%20years).

## 2025년 ASM 주요 트렌드

공격자를 앞서기 위해서는 ASM의 최신 트렌드에 적응해야 합니다. 2025년 ASM을 형성하는 핵심 트렌드는 다음과 같습니다.

1. **AI 기반 ASM:** AI/ML은 이제 ASM의 핵심 구성요소입니다. 현대 ASM은 자산을 자동으로 발견하고 위험을 우선순위화하며, **노이즈에서 “진짜 위험”을 걸러냅니다**[[16]](https://cyble.com/blog/attack-surface-management-in-2025/#:~:text=1.%20AI). 예컨대 AI 기반 ASM 도구가 글로벌 은행의 클라우드 스토리지 설정 오류 1,000여 건을 수시간 내 찾아 대규모 유출을 막았다는 사례도 있습니다[[17]](https://cyble.com/blog/attack-surface-management-in-2025/#:~:text=AI%20and%20machine%20learning%20,for%20human%20analysts%20to%20detect). 2025년에는 *예측 분석*—공격 경로를 선제적으로 추정—역할이 더 커질 것으로 보입니다[[18]](https://cyble.com/blog/attack-surface-management-in-2025/#:~:text=exposed%20millions%20of%20customer%20records).

2. **제로 트러스트(Zero Trust)와의 통합:** “절대 신뢰하지 말고, 항상 검증하라”는 **제로 트러스트 아키텍처(ZTA)**가 표준 프레임워크가 되면서, ASM도 그 안으로 들어가고 있습니다[[19]](https://cyble.com/blog/attack-surface-management-in-2025/#:~:text=2,Architectures). ASM은 자산 가시성을 제로 트러스트 정책 집행에 연결해, 기기·사용자·서비스가 바뀌어도 **어떤 공격 표면도 방치되지 않도록** 합니다[[20]](https://cyble.com/blog/attack-surface-management-in-2025/#:~:text=Zero%20Trust%20Architecture%20,the%20%2028%20is%20overlooked).

3. **IoT/OT 보안 집중:** IoT/OT 확산은 공격 표면을 “극적으로” 확장했습니다[[21]](https://cyble.com/blog/attack-surface-management-in-2025/#:~:text=3,OT%20Security). 공장 센서, 의료기기 등은 기본 비밀번호, 오래된 펌웨어, 불필요한 포트 노출 같은 문제를 안고 있습니다. 2025년 ASM은 이런 자산을 발견하고 보강하는 기능을 강화합니다[[22]](https://cyble.com/blog/attack-surface-management-in-2025/#:~:text=The%20proliferation%20of%20Internet%20of,unpatched%20firmware%2C%20and%20unsecured%20communications).

4. **클라우드 네이티브/멀티클라우드 커버리지:** 하이브리드·멀티클라우드가 일반화되면서, **클라우드 네이티브 ASM**이 주목받고 있습니다[[23]](https://cyble.com/blog/attack-surface-management-in-2025/#:~:text=4.%20Cloud). AWS/Azure/GCP와 직접 연동해 인스턴스, 버킷, 서버리스 등을 지속적으로 인벤토리화합니다. 멀티클라우드 환경에서 S3 노출을 미리 발견해 대규모 유출을 막은 사례도 언급됩니다[[24]](https://cyble.com/blog/attack-surface-management-in-2025/#:~:text=For%20instance%2C%20a%20global%20e,involving%20millions%20of%20transaction%20records). 멀티클라우드 채택률(92%)[[6]](https://fortifydata.com/attack-surface-management-asm-market-size/#:~:text=Every%20cloud%20app%20or%20tool,realize%20how%20much%20they%E2%80%99re%20exposing)을 고려하면, 전 클라우드를 아우르는 ASM은 필수입니다.

5. **위협 인텔리전스(CTI) 통합:** ASM은 더 이상 고립된 도구가 아니라, **실시간 CTI 피드**와 결합해 취약점의 “문맥”을 제공합니다[[25]](https://cyble.com/blog/attack-surface-management-in-2025/#:~:text=5). 다크웹, 익스플로잇 트렌드와 연동해 ‘지금 실제로 표적이 되는지’를 반영해 우선순위를 정합니다[[26]](https://www.bitsight.com/blog/attack-surface-management-insights-2025-kuppingercole#:~:text=1,CTI)[[27]](https://cyble.com/blog/attack-surface-management-in-2025/#:~:text=identify%20and%20mitigate%20the%20vulnerabilities,in%20the%20attack%20within%20hours).

6. **서드파티 리스크 모니터링:** “우리 보안은 가장 약한 벤더만큼만 강하다”는 교훈이 누적되면서, **TPRM(서드파티 리스크 관리)**이 ASM의 확장으로 자리 잡았습니다[[28]](https://www.bitsight.com/blog/attack-surface-management-insights-2025-kuppingercole#:~:text=2.%20Third,have%20ASM%20capability). 선도 ASM은 벤더/공급망의 보안 상태를 지속적으로 모니터링해, 사실상 *파트너의 공격 표면을 우리 공격 표면의 일부로 관리*합니다[[28]](https://www.bitsight.com/blog/attack-surface-management-insights-2025-kuppingercole#:~:text=2.%20Third,have%20ASM%20capability).

7. **사후 대응에서 사전 방어로:** 전통적인 취약점 관리는 사건 이후의 “수습”이 되기 쉬웠습니다. 2025년 ASM은 **사전 방어**를 강조합니다[[30]](https://cyble.com/blog/attack-surface-management-in-2025/#:~:text=7,Proactive%20ASM). 만료된 인증서, 열려버린 포트 같은 단순 노출도 빠르게 감지·수정해 **노출 시간을 단축**하는 것이 목표입니다. 또한 지연된 대응이 배포 지연과 사고로 이어졌다는 인식이 확산되며, *지속 검증과 빠른 수정 사이클*이 중요해졌습니다[[31]](https://cybelangel.com/blog/the-api-threat-report-2025/#:~:text=suggesting%20that%20simply%20trusting%20access,code%20is%20introducing%20new%20risks).

8. **사람 중심 워크플로우:** 자동화가 늘어도 **사람의 판단은 여전히 핵심**입니다. 좋은 ASM은 수천 건의 결과를 던지는 대신, 중복을 제거하고 ‘무엇이 중요한지’를 분명히 보여주며, 담당자에게 해결 맥락과 함께 이관되도록 설계됩니다[[32]](https://cyble.com/blog/attack-surface-management-in-2025/#:~:text=8.%20Human).

## 조직이 기대하는 ASM (2025 설문 인사이트)

2025년 조직은 ASM에 대한 기대치가 높습니다. SANS Institute 설문(235명 보안 리더)에서 중요한 우선순위가 확인됩니다[[33]](https://netwrix.com/en/resources/guides/sans-2025-attack-surface-management-survey/#:~:text=The%20SANS%202025%20Attack%20Surface,evolution%20of%20proactive%20exposure%20management)[[34]](https://netwrix.com/en/resources/guides/sans-2025-attack-surface-management-survey/#:~:text=%2A%2055,across%20the%20full%20attack%20surface).

- **자산 커버리지 확대:** 55%는 외부(인터넷 노출)뿐 아니라 **내부 자산까지 포함한 커버리지**를 원합니다[[34]](https://netwrix.com/en/resources/guides/sans-2025-attack-surface-management-survey/#:~:text=%2A%2055,across%20the%20full%20attack%20surface). 이는 EASM과 CAASM의 결합 흐름과도 맞닿아 있습니다.

- **리스크 정량화:** 89%는 발견된 자산마다 **리스크 스코어/정량화**를 기대합니다[[35]](https://netwrix.com/en/resources/guides/sans-2025-attack-surface-management-survey/#:~:text=The%20SANS%202025%20Attack%20Surface,evolution%20of%20proactive%20exposure%20management)[[34]](https://netwrix.com/en/resources/guides/sans-2025-attack-surface-management-survey/#:~:text=%2A%2055,across%20the%20full%20attack%20surface).

- **실행 가능한 가이드:** 67%는 특히 공개 익스플로잇이 있는 취약점에 대해 **구체적 완화/대응 가이드**가 내장되길 원합니다[[36]](https://netwrix.com/en/resources/guides/sans-2025-attack-surface-management-survey/#:~:text=assets.%20%2A%2089,across%20the%20full%20attack%20surface).

- **지속 검증(Validation):** 47%는 ASM을 **침투 테스트/레드팀**과 결합해 노출이 진짜로 닫혔는지 지속적으로 검증합니다[[37]](https://netwrix.com/en/resources/guides/sans-2025-attack-surface-management-survey/#:~:text=%2A%2067,testing%20to%20fuel%20continuous%20validation).

- **민감 데이터 인지:** 반면 “민감 데이터 식별”은 아직 격차가 큽니다. ASM 도구 중 **28%만이 민감 데이터를 효과적으로 식별**한다는 지적이 있습니다[[38]](https://netwrix.com/en/resources/guides/sans-2025-attack-surface-management-survey/#:~:text=%2A%2047,across%20the%20full%20attack%20surface).

요약하면, 이제 ASM은 “스캔 결과를 던지는 도구”가 아니라 **지속적·문맥 기반·워크플로우 연계형**으로 기대됩니다.

## 변화하는 ASM 솔루션 생태계

수요가 커지면서 2025년 ASM 시장은 매우 경쟁적입니다[[39]](https://fortifydata.com/attack-surface-management-asm-market-size/#:~:text=How%20competitive%20is%20the%20ASM,vendor%20landscape%20in%202025). 대형 보안 기업과 스타트업 모두가 “완성형 ASM”을 내세웁니다.

- **기존 강자:** 주요 보안 벤더는 ASM에 투자를 확대했습니다. 예를 들어 Palo Alto Networks의 Cortex Xpanse(Expanse 인수 기반), Rapid7의 Insight 플랫폼 통합, IBM의 Randori 인수 등이 언급됩니다[[40]](https://fortifydata.com/attack-surface-management-asm-market-size/#:~:text=insights%2C%20and%20continuous%20monitoring,that%20give%20companies%20better%20visibility)[[41]](https://fortifydata.com/attack-surface-management-asm-market-size/#:~:text=insights%2C%20and%20continuous%20monitoring,that%20give%20companies%20better%20visibility)[[39]](https://fortifydata.com/attack-surface-management-asm-market-size/#:~:text=How%20competitive%20is%20the%20ASM,vendor%20landscape%20in%202025). 또한 Bitsight는 KuppingerCole 2025 리더십 컴퍼스에서 리더로 평가받았고[[42]](https://www.prnewswire.com/news-releases/bitsight-recognized-as-a-leader-in-kuppingercoles-2025-leadership-compass-for-attack-surface-management-302483881.html#:~:text=BOSTON%2C%20June%2017%2C%202025%20%2FPRNewswire%2F,Innovation%20Leadership%2C%20and%20Market%20Leadership)[[43]](https://www.prnewswire.com/news-releases/bitsight-recognized-as-a-leader-in-kuppingercoles-2025-leadership-compass-for-attack-surface-management-302483881.html#:~:text=KuppingerCole%27s%20independent%20analysis%20highlights%20Bitsight%27s,a%20Leader%20across%20all%20categories), EASM/CTI/리스크 스코어링/TPRM 통합이 강점으로 언급됩니다[[44]](https://www.prnewswire.com/news-releases/bitsight-recognized-as-a-leader-in-kuppingercoles-2025-leadership-compass-for-attack-surface-management-302483881.html#:~:text=,the%20report%20states).

- **빠르게 성장하는 스타트업:** CyCognito(외부 관점 정찰로 미발견 자산 탐지), NopSec(익스플로잇 가능성 기반 우선순위), Assetnote(DevOps 친화적 지속 탐지) 등도 언급됩니다[[45]](https://fortifydata.com/attack-surface-management-asm-market-size/#:~:text=New%20players%20are%20shaking%20things,UX%2C%20and%20more%20aggressive%20pricing)[[46]](https://fortifydata.com/attack-surface-management-asm-market-size/#:~:text=New%20players%20are%20shaking%20things,UX%2C%20and%20more%20aggressive%20pricing).

또한 ASM은 독립 제품만이 아니라, 클라우드·취약점 관리·SIEM 등 **기존 플랫폼에 모듈 형태로 흡수**되는 흐름도 있습니다. 조직 규모, 요구사항, 기존 툴 체계에 따라 선택지는 다양해졌습니다.

## 결론

**2025년 공격 표면 관리는 여전히 날카롭고(=위험이 크고) 임무 중심적인 과제입니다.** 디지털 비즈니스의 확장과 공격자의 속도/지능 고도화로, 조직은 더 이상 블라인드 스폿을 감당할 수 없습니다. ASM은 공격자보다 먼저 노출 자산과 취약점을 찾아내는 지속적 “레이더” 역할을 합니다. 최근 트렌드는 ASM이 더 지능적(AI/CTI), 더 포괄적(클라우드/IoT/서드파티), 더 사전적(사고 이전 수정)으로 변하고 있음을 보여줍니다.

이 역량에 투자하는 조직은 노출 시간 단축, 사고 감소, 고객·규제기관 신뢰 향상 등 실질적인 효과를 보고 있습니다. **공격 표면이 분 단위로 변하는 시대에, 지속적으로 관리하는 것만이 안전을 유지하는 방법입니다.** 한 보안 전문가의 말처럼 *“공격 표면은 그 어느 때보다 빠르게 커지고 있다. 보안 리더에게 필요한 것은 노이즈가 아니라 명확성이다.”*[[47]](https://www.prnewswire.com/news-releases/bitsight-recognized-as-a-leader-in-kuppingercoles-2025-leadership-compass-for-attack-surface-management-302483881.html#:~:text=,That%27s%20what%20Bitsight%20delivers) 올바른 ASM은 바로 그 명확성을 제공하며, 방대한 자산 지도를 **우선순위가 있는 실행 계획**으로 바꿔줍니다.

## 참고 자료

- PuppyGraph – *Attack Surface Management: Complete 2025 Guide* (Nov 2025)[[48]](https://www.puppygraph.com/blog/attack-surface-management#:~:text=Every%20organization%20has%20an%20attack,It%20becomes%20hard%20to%20track)[[49]](https://www.puppygraph.com/blog/attack-surface-management#:~:text=ASM%20vs%20Traditional%20Vulnerability%20Management)
- SANS 2025 Survey (via Netwrix) – *Attack Surface & Vulnerability Management Key Takeaways*[[34]](https://netwrix.com/en/resources/guides/sans-2025-attack-surface-management-survey/#:~:text=%2A%2055,across%20the%20full%20attack%20surface)
- CybelAngel – *The API Threat Report: What 2025 Has Taught Us So Far*[[50]](https://cybelangel.com/blog/the-api-threat-report-2025/#:~:text=revealed%20www.prnewswire.com%20%20that%2099,of%20organizations%20had)[[12]](https://cybelangel.com/blog/the-api-threat-report-2025/#:~:text=,implement%20one%20within%20a%20year)
- ThreatMon – *Attack Surface Visibility in 2025: Why It Matters More Than Ever*[[1]](https://threatmon.io/attack-surface-visibility-in-2025-why-it-matters-more-than-ever/#:~:text=As%20the%20digital%20perimeter%20dissolves%2C,potential%20entry%20point%20for%20adversaries)[[3]](https://threatmon.io/attack-surface-visibility-in-2025-why-it-matters-more-than-ever/#:~:text=In%202025%2C%20visibility%20has%20become,defend%20what%20you%20cannot%20see)
- FortifyData – *Attack Surface Management Market Size & Trends 2025*[[15]](https://fortifydata.com/attack-surface-management-asm-market-size/#:~:text=The%20Attack%20Surface%20Management%20market,a%20period%20of%20seven%20years)[[9]](https://fortifydata.com/attack-surface-management-asm-market-size/#:~:text=More%20companies%20now%20focus%20on,exploits%20it%20to%20their%20advantage)
- Cyble – *Top Attack Surface Management Trends for 2025*[[16]](https://cyble.com/blog/attack-surface-management-in-2025/#:~:text=1.%20AI)[[51]](https://cyble.com/blog/attack-surface-management-in-2025/#:~:text=6.%20ASM%20for%20Third,Management)
- Bitsight – *Attack Surface Management Trends in 2025, per KuppingerCole*[[26]](https://www.bitsight.com/blog/attack-surface-management-insights-2025-kuppingercole#:~:text=1,CTI)[[28]](https://www.bitsight.com/blog/attack-surface-management-insights-2025-kuppingercole#:~:text=2.%20Third,have%20ASM%20capability)
- Bitsight Press Release – *Recognized as Leader in 2025 ASM Compass*[[43]](https://www.prnewswire.com/news-releases/bitsight-recognized-as-a-leader-in-kuppingercoles-2025-leadership-compass-for-attack-surface-management-302483881.html#:~:text=KuppingerCole%27s%20independent%20analysis%20highlights%20Bitsight%27s,a%20Leader%20across%20all%20categories)[[44]](https://www.prnewswire.com/news-releases/bitsight-recognized-as-a-leader-in-kuppingercoles-2025-leadership-compass-for-attack-surface-management-302483881.html#:~:text=,the%20report%20states)

