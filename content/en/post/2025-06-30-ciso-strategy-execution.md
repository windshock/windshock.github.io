---
title: "The Gap Between CISO Strategy and Execution: The WAF Debate and Field Leadership Report"
date: 2025-06-30
draft: false
categories: [CISO, Security Strategy, Execution, WAF, Leadership, Strategy Execution]
tags: [Mind, CISO, WAF, Execution, Strategy Failure, Leadership, Field-Oriented, Security Operations, Improvement Roadmap]
featured: true
description: "A comprehensive report presenting a roadmap for practical security improvement and field leadership, centered around the debate on WAF and the gap between philosophy and execution."
image: "/images/post/strategyVSexecutionGapDiagram.webp"
---

## Preface: The Crack Between Philosophy and Execution

First half of 202x.
When the group’s penetration test report stated, “SQL Injection possible in WAF-unprotected section,” the CISO was silent for a while.
The report was blunt, the attack was classic, and there was no defense.

> "Was I wrong? Or did they misunderstand my intention...?"

The CISO was a **leader of strong conviction**.
He believed that with a strategy of “IPS + security by design,” it was possible to build a system robust enough to forgo WAF deployment. In fact, **for years, this strategy contributed to the organization’s threat detection and incident prevention**.

But external economic crises and internal restructuring changed the landscape.
Company-wide budget cuts followed, and **security assessment budgets that were less visible and not directly linked to incidents** became the easiest target.
The CISO chose to **reduce the overall security budget by a set percentage**, and slashed the assessment budget to a fraction.

After that, vulnerability metrics were no longer raised.
He went so far as to **prohibit the quantification of vulnerability metrics**, shifting to a system where only 'assessment plans' were reported.
It was a declaration of faith in philosophy over data.

But **there was no longer a system to verify if that philosophy worked**.
And now, a single SQL Injection was toppling **philosophy, execution, and trust**.

---

## Leadership Diagnosis: The Triple Gap Between Philosophy, Reality, and Execution

### 1. Philosophical Conviction: The Strategy that IPS Alone Is Enough

The CISO believed that, through Snort-based IPS rule tuning and secure development processes, most of the functions offered by a WAF could be **replaced by the organization’s own technical execution**. In the short term, this did yield positive results in terms of efficiency and cost.

But reality was different. Encrypted HTTPS traffic, HTTP parameter tampering, and L7 dynamic requests **left attack surfaces that IPS could not structurally cover**, creating not a replacement for WAF, but a gap.

---

### 2. Real-World Constraints: Budget Cuts and Strategic Choices

From the second half of 202x, **a corporate management crisis** forced the CISO to make tough choices. The overall security budget was hard to touch, so **assessment budgets, seen as low risk, became the first to be cut**.

* External assessments → switched to internal checks
* Assessment frequency → limited to once a year or on exception basis
* Vulnerability metrics → stopped collecting quantitative data, focused on plans only

These measures brought short-term cost savings but cut off systematic risk measurement and remediation.

---

### 3. The Illusion of Execution: Failure of Security Embedding

Security guides were distributed and some automated tools deployed, but **security by design never truly took root**. There was no integration with CI/CD pipelines, training was one-off, and developers still saw security as **“someone else’s problem.”**

In short, there was an **SDLC only on paper**, but no organizational consensus to drive execution.

---

## Conclusion: Philosophy Was Not Wrong, But Philosophy Without Execution Is Not Strategy

The CISO built a strategy on security philosophy, but failed to fully consider what was needed for that strategy to work in reality—organizational capability, execution systems, and cultural foundation. In the end, philosophy without execution cannot be strategy, and that gap becomes a real security risk.

* Philosophy must **persuade reality**.
* Strategy must **be measurable**.
* Execution must **align with organizational culture**.

> **What’s needed now is not to abandon the philosophy, but to revive the conditions for it to work.**

---

## Report: Assessment of Web Application Defense Strategy and Recommendations

### 1. Introduction

The recent penetration test that uncovered a web application vulnerability raises important questions about the real-world suitability of our defense strategy. The CISO has long maintained the philosophy that “we can defend without specific WAF solutions.” This was based on careful judgment of the limitations and cost-effectiveness of such solutions. However, this exposure suggests the strategy was not fully implemented or operationalized in practice. This report re-examines the issue from a field perspective and proposes ways to improve our web security strategy, serving as a comprehensive response to the CISO’s inquiry.

As former Seongnam Mayor (now President) Lee Jae-myung’s leadership motto goes, **“The answer is in the field.”** No matter how great the strategy or philosophy, if it doesn’t block real attacks, it’s useless. This incident shows how our security philosophy is tested by real-world attack scenarios, providing a chance to recognize and learn from the gap between strategy and reality. Below, we analyze the background and intent of the strategy, review current operational limitations, and suggest future responses.

---

### 2. Philosophy and Intent of the Web Application Defense Strategy

There were several philosophical and practical reasons for the CISO’s reluctance to adopt a specific web application firewall solution:

* **Pursuit of Security Fundamentals:** The belief that raising the security level of the application itself and eliminating vulnerabilities during development is the fundamental solution, rather than relying on specific security appliances. Signature-based solutions can create a **false sense of security** and may be powerless against new or obfuscated attacks. The CISO’s philosophy was to focus on root causes by strengthening secure development.
* **Alternative Controls:** Instead of deploying a specific WAF, the strategy was to block malicious traffic at the network level (firewall, IPS) and address application security through secure coding guidelines and **regular code vulnerability analysis (SAST)**. Additional measures included secure server/database configurations (e.g., stored procedures, ORM). The aim was to offset the lack of a WAF by reinforcing Secure SDLC and fostering a DevSecOps culture.
* **Cost and Operational Efficiency:** Commercial WAFs were seen as having uncertain ROI, with high initial and operational costs, and often being poorly tuned or left in monitoring mode due to false positives. With limited budget, the organization prioritized core security infrastructure and secure development training over WAFs.

In summary, the CISO’s strategy was a bold attempt to secure the system **without relying on a specific WAF solution**. This philosophy is echoed by parts of the industry, such as OWASP, which stresses secure coding and input validation as more fundamental than WAFs (see OWASP SQL Injection Prevention Cheat Sheet). The intent was not neglect, but to strengthen defense by other means.

---

### 3. Current Security Operations: The Gap Between Strategy and Reality

Despite the ideal strategy, a review of real-world operations reveals shortcomings in the implementation of the CISO’s philosophy. Key points:

* **Network-Perimeter Focus:** Firewalls and Snort-based IPS are deployed to block known attacks, but without a web application firewall, there is limited filtering of HTTP/S payloads. Snort IPS rules cover basic web attack patterns, but are weak against obfuscated or novel attacks.
* **Insufficient Application Security Checks:** Secure coding guides were distributed, but Secure SDLC was not strictly followed, and code reviews/static analysis were inconsistent. Regular vulnerability assessments were limited to a few key services, with many web services rarely tested, leaving potential vulnerabilities exposed.
* **Lack of Monitoring and Response:** There is no SIEM or centralized log monitoring, so abnormal web app activity is not detected in real time. No EDR or behavior-based detection means slow response to incidents. There is a lack of **visibility** and response capability.
* **Limited Security Personnel:** Security staff are few, with 24×7 monitoring outsourced to an MSSP. There is a lack of web app specialists and digital forensics skills, limiting advanced attack detection and analysis.
* **Patch and Management Process:** Security patching is done quarterly, making rapid response to zero-day or urgent issues difficult and increasing exposure time.

Overall, operations are focused on the network perimeter, with insufficient application-level defense. The promised compensating controls for not having a WAF—stronger development security, improved monitoring—have not been fully realized. In short, there is a **gap** between strategy and execution.

Reviewing the SQL Injection scenario: the attacker injected malicious payloads into input fields, using encoding to bypass filters. The system failed to block these, and sensitive data was extracted from the database. Application-level filtering (WAF or input validation) could have blocked this. Snort IPS did not detect the attack, and no alerts were raised. This shows the *missing link* in our security chain.

---

### 4. Penetration Test Results: Validating the Strategy Hypothesis

The vulnerability exposed by the recent penetration test highlighted the weaknesses of our security strategy. Key findings:

* **Impact of Missing WAF:** Malicious input reached the server unimpeded. A WAF could have blocked or alerted on basic web attack patterns. Cloud-based WAAP services can quickly update rules for new attacks. In our case, the lack of a web-level defense allowed easy webshell upload and database access—like leaving the door unlocked.
* **Limits of Network Security Devices:** Snort IPS did not detect the attack, likely due to obfuscated payloads or use of HTTPS. IPS relies on known signatures, which can be bypassed by splitting keywords, changing case, or using special characters. IPS alone cannot cover all web attacks.
* **Weak Input Validation:** There was no server-side validation or parameter binding in the code. Secure coding was not enforced, and vulnerabilities were not caught in development.
* **Delayed Response Due to Lack of Monitoring:** The attack went unnoticed until the penetration test report. With SIEM or monitoring, abnormal queries or access patterns could have triggered alerts. The lack of such systems left us exposed for too long.

In short, the test disproved the assumption that **“we can be safe without a specific WAF solution”** under current conditions. The compensating controls were not implemented, and the absence of a WAF left a gap. This is a meaningful finding, as it was a real-world test of our defenses.

This is not a rare case—web app vulnerabilities remain common and dangerous. For example, the 2024 Edgescan Vulnerability Statistics Report found that **19.47% of critical web app vulnerabilities were SQL Injection (CWE-89)**. Attackers use automation to target many sites, and those without proper defenses are easy prey. This is an industry-wide risk, not just our problem.

---

### 5. Re-evaluating the WAF: Its Role and Limitations

As the CISO noted, a WAF is not a panacea. But current trends show that WAFs (and their evolution, WAAP) remain an important defense layer. Key points:

* **Value of a WAF:** WAFs can immediately block common attacks (SQLi, XSS, file uploads). Vendors provide urgent rule updates for new threats, and custom rules can be tuned to the application. Cloud WAFs/WAAPs leverage threat intelligence to cover new attack trends. WAFs serve as the last line of defense for vulnerabilities missed in development.
* **Realistic Limitations:** Signature-based WAFs can be bypassed by clever attackers using encoding, splitting, or mimicking normal traffic. Tuning and maintenance are required, with risks of false positives and service disruption. WAFs are not “perfect shields” and must be used alongside other controls.
* **Evolution to WAAP:** Modern WAAP solutions integrate WAF, API security, bot mitigation, and DDoS protection as cloud services, suitable for API-driven architectures. WAAPs offer flexible, ML-based defenses and can be adopted selectively, without heavy initial investment.
* **Cases Without WAF:** Some global firms operate successfully without a WAF, but only with strong security teams, behavior-based detection, and custom tools. Our organization lacks such resources, so a balanced approach is needed.

In summary, WAFs are essential for broad web services, but are only effective when combined with secure coding, vulnerability management, and monitoring. We must avoid both distrust and overreliance on WAFs, and seek optimal use for our environment.

---

### 6. Leadership Perspective: Improving Strategy Through Field Validation

The security strategy under the CISO’s leadership was meaningful and ambitious. Now, it’s time to improve it with field validation and feedback. As President Lee Jae-myung said, **“The answer is in the field.”** The success or failure of our strategy depends on execution in the field.

* **Listening to the Field:** Security and development staff expressed regret during the test—"If only we had a WAF..." Developers wondered why such mistakes remained in the code. Their voices should be reflected in strategy adjustments.
* **Flexible Adjustment:** Philosophy is important, but must not become rigid dogma. The CISO’s philosophy can be preserved while addressing weaknesses exposed by this incident—by adopting new approaches or services that do not violate core principles.
* **Raising Awareness:** This incident should raise security awareness among developers and operators. The CISO’s philosophy must be shared, and the reasons for not adopting a WAF, and what must be done instead, should be explained. Security training and sharing recent attack cases are key leadership roles.
* **Continuous Improvement Cycle:** Strategy, operation, feedback, and improvement must cycle rapidly. Even minor incidents should be analyzed and addressed quickly. Regular tabletop exercises and penetration tests should be led by the CISO to find and fix weaknesses.

Ultimately, leadership is about realizing philosophy in reality. If the CISO’s philosophy is right, leadership means building the execution roadmap and organizational capabilities to support it. Field feedback should be used as a compass for strategy development.

---

### 7. Strategy Supplementation: Realistic Alternatives and Reinforcements

To continue a security strategy without a specific WAF, compensating measures are essential. Considering the CISO’s reluctance to adopt WAAP, RASP, or a specific WAF, here are some possible alternatives and reinforcements:

* **1. Use Cloud-Based Security Services (Selective Functions):** Instead of traditional on-prem WAFs, consider partial adoption of Cloud WAAP, which can filter attacks by routing traffic through the cloud, allowing selection of only needed functions. Start in monitoring mode, tune, then switch to blocking mode for high-risk attacks. This approach is OPEX-based, with flexible contracts, reducing CISO’s burden.
* **2. Open-Source WAF Tools (e.g., ModSecurity):** ModSecurity can be deployed in front of web servers, using the OWASP Core Rule Set. Skilled engineers can tune it to near-commercial effectiveness. If lacking expertise, start with a pilot and evaluate results.
* **3. Application Security Reinforcement (WAF Alternatives):** Instead of a WAF, use runtime security and code hardening (e.g., RASP, live patching, allow-list validation for DB queries). These methods may impact performance or development workload, but solve problems internally without external appliances.
* **4. Security Architecture Redesign (Long-Term):** Modernize web architecture (e.g., microservices, API gateways, Zero Trust), and leverage cloud provider security features. This is a long-term project, but can realize the security philosophy in a more sophisticated way.
* **5. Maintain Current Strategy + Minor Improvements (Passive):** Simply reinforcing developer training, IPS rules, and patch cycles is not enough. This is not recommended, as it amounts to accepting risk and may cause accountability issues in future incidents.

In summary, combine lightweight measures (1–3) in the short term, and pursue structural improvements (4) over the long term. The goal is to respect the CISO’s philosophy while reducing real-world risks.

---

### 8. Stepwise Execution Roadmap

Here is a proposed stepwise roadmap for implementing the above alternatives. Immediate, mid-term, and long-term actions are separated:

**Short Term (Immediate ~ 3 months):**

* **Urgent Web Application Patch:** Patch the newly found vulnerability. Parameterize all DB queries, use ORM, and block queries with malicious characters. Audit other pages for similar issues.
* **Cloud WAAP Pilot:** Adopt a cloud WAAP service for major web traffic. Operate in monitoring mode for 1–2 months, collect data, tune rules, then gradually switch to blocking mode for critical attacks.
* **Log Monitoring Enhancement:** Build a temporary dashboard (e.g., ELK Stack) to unify logs from web servers, DB, and IPS, and monitor for missed patterns or future attacks.

Goal: Quickly restore confidence that **“no more data leaks”** will occur.

**Mid Term (3–6 months):**

* **Build Secure SDLC:** Add security gates to the development process. Run SAST in the code management pipeline, block builds for critical findings, and require secure coding training for new developers. Run DAST quarterly on key services.
* **Enhance Monitoring and Response:** Deploy SIEM or, if budget is tight, at least aggregate logs for correlation. Refine SOC service SLAs and establish an **incident response playbook**.
* **Pilot New Technologies:** Test RASP or ModSecurity on small-scale services, measure performance impact, and evaluate suitability before broader adoption.

Goal: Ensure **“vulnerabilities are filtered in development and remaining threats are detected and blocked in operation.”**

**Long Term (6+ months):**

* **Modernize Architecture and Infrastructure:** Move toward microservices, apply least privilege, centralize authentication, and leverage cloud-native security features. Establish DevSecOps culture.
* **Secure Talent:** Hire or train web security architects and incident responders. If hiring is difficult, seek regular external consulting.
* **Continuous Testing:** Regularly run red team/blue team exercises and annual external penetration tests.

Goal: Achieve **“security regardless of whether a specific WAF solution is in place,”** and build true cyber resilience.

---

## References & Further Reading

📷 **Leadership in Action:**  
Lee Jae-myung’s open-door mayoral office — a symbolic gesture of field-first leadership  
→ [https://x.com/Jaemyung_Lee/status/1451461913288724483](https://x.com/Jaemyung_Lee/status/1451461913288724483)

📖 **Theoretical Foundation:**  
“Defining the Strategic Role of the Chief Information Security Officer”  
— Sean B. Maynard et al. (2018)  
→ [https://www.researchgate.net/publication/331168444_Defining_the_Strategic_Role_of_the_Chief_Information_Security_Officer](https://www.researchgate.net/publication/331168444_Defining_the_Strategic_Role_of_the_Chief_Information_Security_Officer)

> As Onibere et al. insightfully noted:  
> **“Strategic failure in cybersecurity often stems not from ignorance, but from the mismatch between vision and operational reality.”**

🔬 **Technical Reference:**  
“Comparative approach to web application firewalls” — Z. Ghanbari et al. (2015)  
→ [https://www.researchgate.net/publication/304416570_Comparative_approach_to_web_application_firewalls](https://www.researchgate.net/publication/304416570_Comparative_approach_to_web_application_firewalls)
