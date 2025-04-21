---
title: "Is Your Data in the Cat's Paws?"
date: 2025-04-21
draft: false
tags: ["Privacy Protection", "Policy", "Civic Participation", "KakaoPay", "Data Democracy", "AI"]
categories: ["Security", "Policy"]
summary: "The 2025 KakaoPay case exposed the limits of formal consent and self-regulation. Data democracy must be achieved through AI-based DPIA verification and civic oversight."
---

![KakaoPay Case and Personal Data Protection](/images/post/kakaopay-privacy-structure.webp)

# Is Your Data in the Cat's Paws?
## The 2025 KakaoPay Case and the Structural Limitations of Korea’s Data Protection System

### Introduction

In January 2025, Korea's Personal Information Protection Commission (PIPC) imposed a fine of KRW 6 billion (approximately USD 5.8 million) on KakaoPay ([MLex, 2025](https://www.mlex.com/mlex/data-privacy-security/articles/2287755/kakaopay-apple-fined-in-south-korea-over-illegal-alipay-data-transfers)). Roughly 40 million users' data had been transferred to China’s Alipay without explicit consent and used to build a Non-Financial Score (NSF) model. NSF is a credit-like index that can significantly influence one’s life—insurance rates, loan approvals, or job prospects.

This incident is not merely about a data leak—it reveals the structural flaws of formal consent and corporate self-regulation. We would never entrust a cat to guard a fish market, so why do we hand over our personal data to corporations so easily? This report analyzes the KakaoPay case from legal, technical, and societal perspectives and proposes AI-based DPIA verification tools and citizen monitoring to realize data democracy.

---

### 1. The KakaoPay Case: Details and Legal Violations

#### Case Summary

- **Timeline**: April to July 2018 — data transfers occurred in three phases ([Businesskorea, 2025](https://www.businesskorea.co.kr/news/articleView.html?idxno=234309)).
- **Data Transferred**: 5.42 billion records, including 24 types of sensitive information such as user names, phone numbers, emails, and account balances.
- **Purpose**: Alipay used the data to train its NSF score model. NSF is a non-financial credit index affecting insurance rates, loan decisions, and employment opportunities.
- **Sanctions**: In January 2025, the PIPC fined KakaoPay KRW 6 billion and Apple KRW 2.45 billion. Alipay was ordered to dismantle the NSF model.

#### Legal Breaches

KakaoPay violated the following clauses of the **Personal Information Protection Act (PIPA)**:

- **Article 20 (Third-Party Consent Requirement)**: Explicit and specific user consent is required before data is shared with third parties. The consent form failed to mention NSF usage.
- **Article 28 (Cross-Border Data Transfers)**: Cross-border data transfers require separate consent and additional protection measures. KakaoPay did not comply.

> “Users gave consent, but had no idea what they were consenting to.”  
> — *Korea Bizwire, 2025*

---

### 2. Structural Flaws in Korea’s Personal Information Protection Act (PIPA)

#### Summary of Key Provisions

- **Article 20**: Requires explicit consent for third-party provision.
- **Article 28**: Mandates separate consent and protection for international data transfers.
- **Article 33**: Requires a Data Protection Impact Assessment (DPIA) for high-risk data processing.

#### Recent Amendments

- **2023**: A major revision introduced the principle of “same activity, same regulation,” eliminating special exemptions for Online Service Providers (OSPs). Effective from September 15, 2023 ([Data Protection Laws of the World](https://www.dlapiperdataprotection.com/index.html?t=law&c=KR)).
- **2024 Presidential Decree**: Introduced the right to explanation for automated decisions, strengthened qualifications for Chief Privacy Officers (CPO), and made data breach insurance mandatory.

#### Problems with Self-Regulation

- **Non-Public DPIA**: DPIAs are internally authored and not required to be disclosed, creating a lack of transparency and room for evasion of responsibility.
- **Lack of Oversight**: PIPC’s enforcement focuses on post-violation penalties, not proactive prevention.

> Korea’s PIPA structure where companies self-author DPIAs has been likened to letting a cat guard the fish. DLA Piper criticized the non-disclosure of DPIA reports as a lack of transparency.  
> — *DLA Piper – South Korea Data Protection*

---

### 3. AI-Based DPIA Verification: A Technological Opportunity

AI can enhance the objectivity and transparency of DPIAs. AI-based DPIA verification tools can analyze data flows, detect potential risks, and auto-generate reports. In Europe, the "Privacy-Aware AI" framework is used to assess GDPR compliance. Similar approaches can be adopted in Korea ([Fieldfisher, 2023](https://www.fieldfisher.com/en/insights/ai-privacy-compliance-getting-data-protection-impact-assessments-right)).

#### Examples of AI-Based DPIA Tools

Several platforms have begun to integrate AI in supporting DPIA processes:

- **[Ketch](https://www.ketch.com/blog/posts/pia-automation)** offers AI-powered recommendations for automated Privacy Impact Assessments (PIAs), helping improve DPIA accuracy and risk identification.
- **[Securiti](https://securiti.ai/products/assessment-automation/)** provides global DPIA automation capabilities. Although it does not overtly advertise AI functionality, its framework implies AI-driven assessments.
- **[Clarip](https://www.clarip.com/data-privacy/gdpr-impact-assessments/)** markets its DPIA automation software with phrases like “Hybrid AI Rocks!” suggesting AI assistance, though specific AI features are not fully detailed.

These platforms primarily aim to automate privacy risk assessments, supporting the DPIA process by detecting overlooked vulnerabilities and ensuring comprehensive reviews. However, most are not designed as standalone DPIA *verification* engines, and the transparency of AI components varies.

#### Academic and Industry Research

While research directly targeting AI-based DPIA verification is still scarce, there are valuable resources on conducting DPIAs for AI systems and integrating AI into DPIA processes:

- **[Fieldfisher’s guide](https://www.fieldfisher.com/en/insights/ai-privacy-compliance-getting-data-protection-impact-assessments-right)** outlines best practices for DPIAs in AI contexts and explains how AI technologies can support privacy compliance.
- **[Mansi’s blog](https://mlalgo.dev/blogs/DPIA_with_AI)** explores AI-assisted methods in DPIA, such as automated classification, predictive risk analysis, monitoring, and documentation.
- The academic paper **["Proposing a Data Privacy Impact Assessment (DPIA) Model for AI Projects under U.S. Privacy Regulations"](https://www.researchgate.net/publication/388783819_Proposing_a_Data_Privacy_Impact_Assessment_DPIA_Model_for_AI_Projects_under_US_Privacy_Regulations)** (ResearchGate, 2025) proposes a DPIA framework tailored to AI projects, highlighting the need for structured, AI-integrated assessment models.

These sources build the foundation for evolving AI-enhanced DPIA tools and models that combine legal compliance with technical precision.

#### Challenges and Outlook

Currently, AI-based DPIA verification tools remain limited. They often function as compliance support tools rather than dedicated verification engines. However, they offer significant potential to improve DPIA processes in terms of efficiency, comprehensiveness, and objectivity. As research advances and regulatory demand increases, more sophisticated and transparent AI-driven DPIA tools are expected to emerge in the near future.


---

### 4. The Role and Effectiveness of Civic Monitoring

Citizen oversight is critical for effective privacy protection. The 2022 Future of Privacy Forum (FPF) report criticized the limits of consent-based frameworks and emphasized risk-based approaches and civic engagement ([FPF, 2022](https://fpf.org/blog/new-report-on-limits-of-consent-in-south-koreas-data-protection-law/)). Studies in the ACM Digital Library support citizen-centered governance, especially in smart city contexts ([DGOV, 2023](https://dl.acm.org/journal/dgov/calls-for-papers)).

In fact, the KakaoPay case was initiated by a citizen group’s report, which led to a police investigation—highlighting the power of civic monitoring ([MLex, 2024](https://www.mlex.com/mlex/articles/2091442/kakaopay-faces-police-probe-in-south-korea-over-alleged-unauthorized-data-transfer-to-alipay)).

---

### 5. Institutional Proposals for Data Democracy

The KakaoPay case exposed systemic vulnerabilities in data protection. Institutional reform combining AI verification and civic oversight is essential:

1. **Introduce AI-Based DPIA Verification**  
   - Led by the PIPC, use AI tools to verify the objectivity of DPIA reports.

2. **Mandate DPIA Transparency**  
   - Require public summaries of DPIAs and establish independent review committees including experts and citizens.

3. **Establish a Right to Data Location APIs**  
   - Expand PIPA Article 18 (Data Portability Rights) to mandate APIs that track data storage and movement paths.

4. **Strengthen Explanations for Automated Decisions**  
   - Mandate clear explanations for decisions like NSF scores and impose penalties for non-compliance.

5. **Institutionalize Public Citizen Auditing Teams**  
   - Legalize citizen-led audits involving civil society, academia, and professionals to inspect data processing practices.

6. **Democratize the PIPA Revision Process**  
   - Mandate public hearings and formal inclusion of consumer advocacy groups in legislative procedures.

---

### Conclusion

The 2025 KakaoPay case laid bare the limits of formal consent and self-regulation. Though PIPA is a strong framework, without oversight and civic engagement, it remains hollow. AI-powered DPIA verification tools offer a technological solution for transparency and objectivity, while civic monitoring is the social engine that sustains it. It is time to open the gates of corporate data control and realize data democracy through collaboration between citizens and experts.

---

### References

- [MLex, 2025](https://www.mlex.com/mlex/data-privacy-security/articles/2287755/kakaopay-apple-fined-in-south-korea-over-illegal-alipay-data-transfers)
- [Businesskorea, 2025](https://www.businesskorea.co.kr/news/articleView.html?idxno=234309)
- [Data Protection Laws of the World](https://www.dlapiperdataprotection.com/index.html?t=law&c=KR)
- [Fieldfisher, 2023](https://www.fieldfisher.com/en/insights/ai-privacy-compliance-getting-data-protection-impact-assessments-right)
- [FPF, 2022](https://fpf.org/blog/new-report-on-limits-of-consent-in-south-koreas-data-protection-law/)
- [DGOV, 2023](https://dl.acm.org/journal/dgov/calls-for-papers)
- [MLex, 2024](https://www.mlex.com/mlex/articles/2091442/kakaopay-faces-police-probe-in-south-korea-over-alleged-unauthorized-data-transfer-to-alipay)
