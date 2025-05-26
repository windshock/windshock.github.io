---
title: "내 정보, 고양이 손에 맡겼나요?"
date: 2025-04-21
draft: false
tags: ["TrustAndCulture", "개인정보보호", "정책", "시민참여", "카카오페이", "데이터민주주의", "AI"]
categories: ["Privacy", "Security", "Policy"]
featured: true
image: "/images/post/kakaopay-privacy-structure.webp"
summary: "2025년 카카오페이 사건은 형식적 동의와 자율 규제의 한계를 드러냈습니다. AI 기반 DPIA 검증과 시민 감시를 통해 데이터 민주주의를 실현해야 합니다."
---

{{< youtube uScMEuHGDzE >}}

# 내 정보, 고양이 손에 맡겼나요?
## 2025년 카카오페이 사건과 개인정보 보호 체계의 구조적 한계

### 서론

2025년 1월, 한국 개인정보보호위원회(PIPC)는 카카오페이에 60억 원(약 580만 달러)의 과징금을 부과했다([MLex, 2025](https://www.mlex.com/mlex/data-privacy-security/articles/2287755/kakaopay-apple-fined-in-south-korea-over-illegal-alipay-data-transfers)). 약 4,000만 명의 사용자 데이터가 명시적 동의 없이 중국 알리페이로 전송되어 신용 유사 점수(NSF, Non-Financial Score) 모델 개발에 활용된 사건이다. NSF는 보험료, 대출 승인, 취업 기회 등 개인의 삶에 중대한 영향을 미칠 수 있는 비금융 신용 평가 지표다.

이 사건은 단순한 유출을 넘어, 형식적 동의와 기업 자율 규제의 구조적 한계를 드러냈다. 우리는 고양이에게 생선을 맡기지 않지만, 왜 기업에게는 우리의 데이터를 덥석 맡기는 걸까? 본 보고서는 2025년 카카오페이 사건을 법적·기술적·사회적 관점에서 분석하고, AI 기반 DPIA 검증 툴과 시민 감시를 통한 데이터 민주주의를 제안한다.

---

### 1. 카카오페이 사건: 세부사항과 법적 위반

#### 사건 개요

- **발생 시점**: 2018년 4월~7월, 세 차례에 걸쳐 데이터 전송([Businesskorea, 2025](https://www.businesskorea.co.kr/news/articleView.html?idxno=234309)).
- **전송된 데이터**: 사용자명, 전화번호, 이메일 주소, 계좌 잔액 등 24개 항목, 총 54.2억 건의 민감한 정보.
- **활용 목적**: 알리페이는 데이터를 NSF 점수 모델에 활용. NSF는 신용 평가로, 보험료 인상, 대출 거절, 취업 불이익 등에 영향을 미칠 수 있음.
- **제재 조치**: 2025년 1월, PIPC는 카카오페이에 60억 원, 애플에 24.5억 원의 과징금 부과. 알리페이는 NSF 모델 폐기 명령.

#### 법적 위반

카카오페이는 **개인정보 보호법(PIPA)**의 다음 조항을 위반했다:

- **PIPA 제20조 (제3자 제공 동의 요건)**: 개인정보를 제3자에게 제공하려면 명시적이고 구체적인 동의를 받아야 함. 동의서에 NSF 활용 목적 미고지.
- **PIPA 제28조 (국외 이전 동의)**: 개인정보를 국외로 이전할 경우, 데이터 주체의 동의와 추가 보호 조치가 필요. 카카오페이는 이를 준수하지 않음.

> “사용자는 동의했지만, 그 ‘동의’가 무엇에 대한 것인지 알지 못했다.”  
> — *Korea Bizwire, 2025*

---

### 2. 개인정보 보호법(PIPA)의 구조적 한계

#### 주요 조항 요약

- **제20조**: 제3자 제공 시 명시적 동의 필요.
- **제28조**: 국외 이전 시 별도 동의 및 보호 조치 요구.
- **제33조**: 고위험 정보 처리 시 DPIA 필수.

#### 최근 개정

- **2023년**: PIPA 개정으로 ‘동일 행위-동일 규제’ 원칙 도입. 온라인 서비스 제공자(OSPs)에 대한 특별 규정이 폐지됨. 2023년 9월 15일부터 시행([Data Protection Laws of the World](https://www.dlapiperdataprotection.com/index.html?t=law&c=KR)).
- **2024년 시행령**: 자동화된 의사결정 설명 요구권, 개인정보 보호 책임자(CPO) 자격 요건 강화, 데이터 침해 보험 의무화.

#### 자율 규제의 문제

- **DPIA 비공개성**: DPIA는 기업이 자체적으로 작성하며, 외부 공개 의무가 없음. 이는 투명성 부족과 책임 회피로 이어짐.
- **감시 부족**: PIPC의 감독은 사후 제재 중심으로, 사전 예방 효과 미흡.

> 한국의 개인정보 보호법(PIPA)에서 기업이 스스로 DPIA(데이터 보호 영향 평가)를 작성하는 구조는 고양이가 생선 창고를 지키는 것과 유사하다는 비판이 제기되고 있습니다. DLA Piper는 이와 관련해 DPIA 보고서가 외부에 공개되지 않아 투명성이 부족하다고 지적했습니다
> — *DLA Piper – South Korea Data Protection*

---

### 3. AI 기반 DPIA 검증: 기술적 기회

AI는 DPIA(Data Protection Impact Assessment, 데이터 보호 영향 평가)의 **객관성과 투명성**을 높이는 데 기여할 수 있습니다. AI 기반 DPIA 검증 도구는 **데이터 흐름을 분석하고**, **잠재적 위험을 식별하며**, **자동으로 보고서를 생성**할 수 있습니다. 유럽에서는 GDPR 준수를 평가하기 위해 "Privacy-Aware AI" 프레임워크가 활용되고 있으며, 한국에서도 유사한 방식의 도입이 가능할 것입니다 ([Fieldfisher, 2023](https://www.fieldfisher.com/en/insights/ai-privacy-compliance-getting-data-protection-impact-assessments-right)).

#### AI 기반 DPIA 도구의 예시

여러 플랫폼에서 DPIA 프로세스를 지원하기 위해 AI를 점차 통합하고 있습니다:

- **[Ketch](https://www.ketch.com/blog/posts/pia-automation)**  
  AI 기반 추천 기능을 통해 Privacy Impact Assessments(PIAs)를 자동화하고, DPIA의 정확도 향상과 위험 식별에 도움을 줍니다.

- **[Securiti](https://securiti.ai/products/assessment-automation/)**  
  글로벌 DPIA 자동화 기능을 제공하며, 명시적으로 AI 기능을 강조하지는 않지만 AI 기반 평가가 내포되어 있습니다.

- **[Clarip](https://www.clarip.com/data-privacy/gdpr-impact-assessments/)**  
  “Hybrid AI Rocks!”라는 문구로 AI의 활용 가능성을 시사하며 DPIA 자동화 소프트웨어를 홍보합니다. 그러나 구체적인 AI 기능은 상세히 설명되어 있지 않습니다.

이러한 플랫폼은 주로 **개인정보 위험 평가를 자동화**하고, DPIA 프로세스를 지원하여 **간과된 취약점을 감지하고 포괄적 검토**를 가능하게 합니다. 그러나 대부분은 독립적인 DPIA *검증 엔진*으로 설계되지 않았으며, AI 구성 요소의 **투명성 수준도 제각각**입니다.

#### 학계 및 산업계의 연구

AI 기반 DPIA 검증을 직접 다루는 연구는 아직 많지 않지만, AI 시스템에 대한 DPIA 수행 및 AI 통합 방법에 관한 유용한 자료들이 있습니다:

- **[Fieldfisher의 가이드](https://www.fieldfisher.com/en/insights/ai-privacy-compliance-getting-data-protection-impact-assessments-right)**  
  AI 맥락에서 DPIA를 수행할 때의 모범 사례를 제시하며, AI 기술이 개인정보 보호 준수를 어떻게 지원할 수 있는지 설명합니다.

- **[Mansi의 블로그](https://mlalgo.dev/blogs/DPIA_with_AI)**  
  자동 분류, 예측 기반 위험 분석, 모니터링, 자동 문서화 등 AI를 활용한 DPIA 수행 방법을 탐구합니다.

- **["미국 프라이버시 규제 하의 AI 프로젝트용 DPIA 모델 제안"](https://www.researchgate.net/publication/388783819_Proposing_a_Data_Privacy_Impact_Assessment_DPIA_Model_for_AI_Projects_under_US_Privacy_Regulations)** (ResearchGate, 2025)  
  AI 프로젝트에 특화된 DPIA 프레임워크를 제안하며, 구조화된 AI 통합 평가 모델의 필요성을 강조합니다.

이러한 자료들은 **법적 준수와 기술적 정밀성을 결합한 AI 기반 DPIA 도구의 발전**을 위한 기초를 형성하고 있습니다.

#### 과제와 전망

현재의 AI 기반 DPIA 검증 도구는 제한적인 수준이며, 대부분 **검증 도구라기보다는 준수 지원 도구**로 작동합니다. 그럼에도 불구하고 이들은 DPIA 프로세스의 **효율성, 포괄성, 객관성**을 향상시킬 수 있는 큰 가능성을 지니고 있습니다. 연구가 지속되고 규제 수요가 증가함에 따라, 보다 정교하고 투명한 **AI 기반 DPIA 검증 도구**들이 가까운 미래에 등장할 것으로 기대됩니다.

---

### 4. 시민 감시의 실효성과 필요성

시민 감시는 개인정보 보호의 실효성을 높이는 데 필수적이다. 2022년 Future of Privacy Forum(FPF) 보고서에서는 동의 중심 데이터 보호 체계의 한계를 지적하며, 위험 기반 접근법과 시민 참여의 필요성을 강조했다([FPF, 2022](https://fpf.org/blog/new-report-on-limits-of-consent-in-south-koreas-data-protection-law/)). 또한, ACM Digital Library에서는 시민 중심 데이터 거버넌스에 대한 연구가 진행되고 있으며, 특히 스마트 시티에서의 시민 중심 접근이 강조되고 있다([DGOV, 2023](https://pure.tudelft.nl/ws/portalfiles/portal/161150702/3624556.pdf#:~:text=of%20citizen%20centricity%20and%20how,Computing%20methodologies%20%E2%86%92%20Artificial%20intelligence)).

실제 사례로, 카카오페이 사건은 시민 단체의 신고로 경찰 조사가 시작되었으며, 이는 시민 감시의 중요성을 보여준다([MLex, 2024](https://www.mlex.com/mlex/articles/2091442/kakaopay-faces-police-probe-in-south-korea-over-alleged-unauthorized-data-transfer-to-alipay)).

---

### 5. 데이터 민주주의를 위한 제도적 제안

카카오페이 사건은 개인정보 보호의 구조적 취약성을 드러냈으며, AI 기술과 시민 감시를 결합한 제도적 개혁이 필요하다:

1. **AI 기반 DPIA 검증 도입**  
   - PIPC 주도로 AI 툴을 활용해 DPIA 보고서의 객관성 검증.

2. **DPIA 외부 공개 의무화**  
   - DPIA 요약본 공개 및 독립적 리뷰 위원회(전문가·시민 포함) 설립.

3. **데이터 위치 확인 API 권리화**  
   - PIPA 제18조(데이터 이동성 권리) 확장, 데이터 저장·이동 경로 추적 API 제공 의무화.

4. **자동화된 의사결정 설명 의무 강화**  
   - AI 기반 NSF 점수 등 의사결정 과정 설명 의무 명시, 불이행 시 제재 강화.

5. **시민 참여 공적 감사단 제도화**  
   - 시민사회·학계·전문가 참여 감사단 법제화, 데이터 처리 관행 정기 점검.

6. **PIPA 개정 절차 민주화**  
   - 공청회, 시민 의견 청취 의무화, 소비자 단체 공식 참여 보장.

---

### 결론

2025년 카카오페이 사건은 형식적 동의와 자율 규제의 한계를 보여준다. PIPA는 강력한 틀이지만, 감시와 참여 없이는 공허하다. AI 기반 DPIA 검증 툴은 투명성과 객관성을 높이는 기술적 해결책이며, 시민 감시는 이를 뒷받침하는 사회적 동력이다. 이제 기업이 독점하던 데이터 관리의 문을 열고, 시민과 전문가의 협력을 통해 데이터 민주주의를 실현해야 할 때다.

---

### 참고 자료

- [MLex, 2025](https://www.mlex.com/mlex/data-privacy-security/articles/2287755/kakaopay-apple-fined-in-south-korea-over-illegal-alipay-data-transfers)
- [Businesskorea, 2025](https://www.businesskorea.co.kr/news/articleView.html?idxno=234309)
- [Data Protection Laws of the World](https://www.dlapiperdataprotection.com/index.html?t=law&c=KR)
- [Fieldfisher, 2023](https://www.fieldfisher.com/en/insights/ai-privacy-compliance-getting-data-protection-impact-assessments-right)
- [FPF, 2022](https://fpf.org/blog/new-report-on-limits-of-consent-in-south-koreas-data-protection-law/)
- [DGOV, 2023](https://pure.tudelft.nl/ws/portalfiles/portal/161150702/3624556.pdf#:~:text=of%20citizen%20centricity%20and%20how,Computing%20methodologies%20%E2%86%92%20Artificial%20intelligence)
- [MLex, 2024](https://www.mlex.com/mlex/articles/2091442/kakaopay-faces-police-probe-in-south-korea-over-alleged-unauthorized-data-transfer-to-alipay)
