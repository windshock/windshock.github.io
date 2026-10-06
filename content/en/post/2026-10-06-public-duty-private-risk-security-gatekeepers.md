---
title: "Why Are the Costs and Risks of Cybersecurity So Widely Distributed Across the Private Sector?"
date: 2026-10-06
draft: false
featured: true
tags: ["TrustAndCulture", "CISO", "CPO", "Security Research", "Security Economics", "CVD", "Responsibilization", "Gatekeeper", "Privacy", "Cybersecurity Policy", "Governance"]
categories: ["Security Governance", "Policy"]
description: "Starting from the debate over criminal liability for CISOs, this post traces Internet commercialization, information asymmetry, responsibilization, security externalities, CVD, NIS2, the CRA, and Korea's 2026 reforms to ask how cybersecurity responsibility has been distributed—and why it is now being rebalanced."
---

**Why have the costs and risks of protecting the public interest in cybersecurity been distributed so widely across private companies and individuals?** Following the recent debate over criminal liability for CISOs led me to a question much older than the treatment of any single security role. It is a question about the institutional, economic, and historical structure of cybersecurity itself.

I initially looked at the issue this way: if society expects CISOs, CPOs, and security researchers to carry public-interest duties, should it not provide legal protection commensurate with those duties? That is not wrong, but it is almost too obvious to be interesting.

Looking deeper, a more important structure appears.

> **Modern cybersecurity operates on a model in which private actors discover risks the state cannot directly see, private actors control many of those risks, and private actors are expected to make those risks visible again to the state and society.**

The central question, then, is not simply whether "too much responsibility" has been imposed. It is **why this distributed structure emerged, who bears its costs and captures its benefits, and why recent policy increasingly appears to be relocating responsibility within that structure.**

---

## 1. The starting point: infrastructure with public consequences is largely in private hands

The first reason cybersecurity differs from many other areas of public safety is that **the state does not own much of the digital environment it is expected to protect.**

The history of NSFNET in the United States is a useful illustration. The NSF-funded research network served as an important backbone for Internet growth in the 1980s and early 1990s. As commercial Internet providers expanded, NSF retired its dedicated backbone in 1995 and described the transition of backbone functions to the private sector as a success. NSFNET alone cannot explain the entire history of today's Internet, but it captures an important shift: **the center of gravity moved from publicly funded research infrastructure toward networks operated by private providers.**

What subsequently moved onto those networks was not merely a collection of websites.

Finance, telecommunications, healthcare, retail, energy, public administration, personal life, and core corporate operations all became dependent on digital infrastructure.

That creates a structural asymmetry.

> **The systems may be privately owned and operated, but the costs of their failure can spread across society.**

An outage at a bank is not only the bank's problem. A telecommunications breach is not only the carrier's problem. When the personal data of millions of people is exposed, the resulting costs do not remain inside one company's financial statements.

The original 2014 NIST Cybersecurity Framework also reflected this public-private structure. Rather than creating a new set of direct regulatory obligations, it began as a **voluntary, risk-based framework** developed through collaboration between government and industry. Critical infrastructure may be vital to national and economic security, but much of the actual risk management still has to be performed by the owners and operators of that infrastructure.

So private dependence in cybersecurity cannot be explained simply as government "offloading" its responsibilities. A deeper historical condition came first: **cyberspace itself developed around infrastructure increasingly owned and operated by private actors.**

---

## 2. The second reason: the state cannot directly see inside the systems

Ownership is only part of the story.

The more important problem is **observability**.

A government cannot continuously know which company's servers are missing MFA, which development team is delaying a patch, which SaaS permissions are excessive, or which third-party SDK contains a weak cryptographic protocol.

Unknown vulnerabilities are even harder.

If an intrusion is not detected internally—or is detected but never disclosed—a regulator may not even know that the incident exists.

Cybersecurity therefore contains a profound **information asymmetry**.

- Vendors and developers usually know the product internals best.
- Operators and security teams know the production environment best.
- CISOs, CPOs, and executives are positioned to connect organizational risk with resource allocation.
- In some cases, an external security researcher discovers an unknown vulnerability before the vendor does.

It is not realistic for the state to continuously inspect every system directly. Regulation therefore tends to evolve by **connecting private actors who occupy privileged positions of visibility to the governance system.**

This resembles the long-standing concept of the **gatekeeper** in law and economics. In 1986, Reinier Kraakman analyzed third-party enforcement strategies in which an actor who did not directly commit the underlying wrongdoing could nevertheless help deter it by withholding cooperation or supplying information.

A CISO or CPO is not identical to a gatekeeper in Kraakman's precise legal sense. But there is a clear functional similarity: **they may see organizational risks before regulators do and can connect that information to decisions, controls, and external reporting.**

---

## 3. The third reason: cybersecurity has long distributed responsibility

Public-administration scholarship offers another useful concept for understanding this structure:

**Responsibilization.**

The basic idea is that government does not attempt to eliminate every risk directly. Instead, it assigns individuals and organizations responsibility for managing risks themselves.

A 2020 study by Karen Renaud and colleagues compared cybersecurity policy approaches across the Five Eyes countries and China. In particular, it examined how Five Eyes governments provide cybersecurity advice to citizens while leaving a significant share of personal cyber-risk management to individuals themselves. The authors questioned whether the assumption that citizens can manage their own risks if given enough advice is realistic.

The study directly concerns **citizens**, not CISOs, CPOs, or corporate regulation. Applying it wholesale to those roles would overstate what the research actually shows.

But the concept is still useful for understanding a long-running feature of cybersecurity policy.

For years, we have heard variations of the same instructions:

- To users: use strong passwords and watch out for phishing.
- To developers: practice secure coding.
- To companies: implement appropriate technical and organizational safeguards.
- To CISOs and CPOs: identify, manage, and report risk.
- To security researchers: minimize harm and disclose vulnerabilities responsibly.

Instead of the state performing every security function itself, **responsibility has been distributed among many private actors, each expected to produce security from their own position.**

---

## 4. Economics explains why this structure repeatedly produces problems

In his 2001 paper *Why Information Security is Hard — An Economic Perspective*, Ross Anderson argued that information-security failures cannot be explained by technical shortcomings alone.

A central issue is **perverse incentives**.

Network externalities, asymmetric information, moral hazard, adverse selection, liability dumping, and the tragedy of the commons all help explain why security can fail even when the technology to improve it exists.

Consider a simple example.

When a software company spends more on security, the company does not capture all of the benefit.

Its customers become safer. Connected businesses become safer. Financial institutions, telecommunications providers, governments, and others may face lower incident-response costs.

But when the company reduces security spending and saves development costs, those savings remain internal while part of the eventual breach cost may be shifted to customers, victims, counterparties, insurers, investigators, and society.

Security research has a similar asymmetry.

A researcher may spend significant time and money discovering a vulnerability and may also accept legal risk in verifying and reporting it. Once the vulnerability is fixed, however, the benefit spreads to the vendor and the entire user population.

For that reason, it is more accurate to describe cybersecurity this way than to call it a pure public good:

> **Cybersecurity is largely a private activity with strong externalities and public-good characteristics.**

The person paying the cost, the actor capable of controlling the risk, and the people harmed when control fails are often different. Markets alone may therefore underproduce the level of security that is socially desirable.

---

## 5. The response to the 1988 Morris Worm illustrates the model

The response to the 1988 Morris Worm is another useful historical example.

After the worm significantly disrupted the early Internet, DARPA did not create an organization that would directly monitor every Internet-connected system. Instead, it funded the creation of the **CERT Coordination Center (CERT/CC)** at Carnegie Mellon University's Software Engineering Institute.

CERT/CC developed a role as a neutral third party between vulnerability discoverers and vendors, coordinating vulnerabilities that affected multiple products and distributing information to the community.

An important model began to emerge.

Rather than the state discovering every vulnerability itself, the process became distributed:

**researcher → coordinator → vendor → user**

Modern Coordinated Vulnerability Disclosure (CVD) is much more sophisticated, but the underlying problem remains similar.

**The state cannot directly produce all of the security information society needs, so it has to connect private discovery capacity to institutional processes.**

---

## 6. What hackers and CISOs/CPOs have in common is not simply "serving the public interest"

This brings together two groups that initially appear very different:

security researchers and CISOs/CPOs.

Their legal status and employment relationships are not the same. A researcher may be an outsider. A CISO or CPO is an internal officer or employee, and the statutory duties of CISOs and CPOs are themselves different.

It would therefore be too loose to say that they belong in the same category simply because "both work for the public interest."

The more precise commonality is this:

> **They can occupy positions from which they see risks that the state and the broader public cannot directly see.**

Functionally, the system looks something like this:

| Actor | Function in cyber governance |
|---|---|
| Security researcher | External sensor that may discover unknown risks outside the organization |
| Developer / security practitioner | Internal sensor that identifies and remediates technical risk inside products and production environments |
| CISO / CPO | Internal gatekeeper connecting risk signals to management decisions, budgets, controls, and external reporting |
| CERT / CSIRT | Coordination layer that receives, validates, and relays signals across multiple actors |
| Executives / board | Decision makers responsible for resource allocation and risk acceptance |
| Manufacturer | Actor controlling product design, patching, and support periods |
| Government / regulator | Coordinator designing society-wide rules, responsibilities, and incentives |

Seen this way, the state has not only distributed **defensive work** to the private sector. It also depends on private actors to **discover risk and make that risk visible to society.**

That is where CVD, incident reporting, and CISO/CPO reporting to boards begin to fit into the same picture.

---

## 7. CVD and safe harbor are not merely "benefits for hackers"

If society relies on external researchers as a kind of distributed sensor network, an obvious problem follows.

**What happens when sending the signal is itself dangerous?**

In 2020, CISA issued Binding Operational Directive 20-01 requiring U.S. federal civilian agencies to develop and publish Vulnerability Disclosure Policies. The premise was straightforward: if the public is expected to contribute to vulnerability discovery, agencies need a formal policy explaining what testing is authorized and where findings should be reported.

In 2022, the U.S. Department of Justice revised its CFAA charging policy and, for the first time, explicitly stated that **good-faith security research meeting the policy's conditions should not be charged**. This is not a universal safe harbor eliminating all civil and criminal exposure, but it is an attempt to reduce the legal uncertainty researchers face.

The EU's NIS2 Directive is even more explicit.

Article 12 requires Member States to designate a CSIRT as a coordinator for CVD and provides for that CSIRT to act as a **trusted intermediary** between vulnerability reporters and manufacturers or service providers. It also provides for anonymous reporting where requested by the reporting party.

Recital 60 goes further by recognizing that vulnerability researchers may face criminal and civil liability in some Member States. It encourages Member States to consider **non-prosecution guidelines and exemptions from civil liability** for information-security researchers. That recital does not itself create an automatic, EU-wide general safe harbor, but the policy concern is explicit.

A similar debate has begun in Korea.

A January 2026 amendment bill to Korea's Information and Communications Network Act (Bill No. **2216276**) proposes a CVD framework and a legal basis for exempting information-security researchers who act in accordance with an established vulnerability-handling policy. As of October 6, 2026, the bill is **still under review by the National Assembly**.

Treating such mechanisms merely as "benefits for hackers" misses the institutional point.

> **If society needs private vulnerability discovery, it must reduce the cost and legal risk of getting those discoveries into legitimate institutional channels.**

---

## 8. Recent policy is not eliminating responsibility; it is reallocating it

This is where recent international policy changes become especially interesting.

The 2023 U.S. *National Cybersecurity Strategy* argued that too much responsibility for cybersecurity had fallen on individual users and small organizations and called for **rebalancing responsibility toward actors with greater capability and resources to reduce risk**.

That document should be read in its historical context as the Biden administration's 2023 strategy. But it clearly captures a policy concern that telling users to "be more careful" is not enough.

The EU's NIS2 Directive pushes responsibility upward toward management.

Article 20 requires the **management bodies of essential and important entities to approve cybersecurity risk-management measures and oversee their implementation**, with accountability linked to national legal frameworks.

The EU Cyber Resilience Act (CRA) extends responsibility toward the makers of products themselves.

Manufacturers of products with digital elements must effectively handle vulnerabilities during the support period and maintain appropriate CVD policies and processes. As a general rule, the support period must be at least five years, unless the product's expected use period is shorter.

Simplified, the direction can look like this:

**user → security practitioner → CISO/CPO → executives/board → manufacturer/supply chain**

But the arrow does not mean that responsibility disappears from the actor on the left and transfers entirely to the actor on the right.

It is better understood as **an accumulation of responsibility in which the center of gravity increasingly shifts toward actors with greater authority, information, and resources to control risk.**

---

## 9. Korea's 2026 reforms can be read in the same direction

Recent Korean reforms provide a useful example of the same movement.

Effective September 11, 2026, Article 30-3 of Korea's Personal Information Protection Act (PIPA) identifies the **business owner or representative as the ultimate person responsible for the safe processing of personal information and the protection of data-subject rights**, and requires effective overall management measures including support for professional personnel and sufficient budgets.

At the same time, Article 31 requires certain personal information controllers to obtain board approval when appointing, changing, or dismissing the CPO and to report the matter to the Personal Information Protection Commission.

The statutory responsibilities of the CPO also include:

- managing professional personnel and securing budgets necessary for personal-information protection;
- reporting major privacy-protection matters and the state of protection to the business owner, representative, and board;
- investigating and improving personal-information processing and protection practices; and
- operating internal controls to prevent leaks, misuse, and abuse.

The law also provides that a CPO should not suffer unjustified disadvantage for performing the role and requires the organization to ensure that the CPO can **perform the duties independently**.

Korea's 2026 amendments to the Information and Communications Network Act strengthened the CISO role in a similar direction. Article 45-3 requires covered information and communications service providers to designate a qualifying **executive** as CISO and includes information-security staffing, budget formulation, and **reporting the state of information security and major issues to the board** among the CISO's responsibilities.

Corporate privacy sanctions were strengthened as well. Korea's 2026 PIPA amendments allow administrative surcharges of up to **10% of total revenue** under specified conditions involving repeated violations or large-scale violations involving intent or gross negligence. At the same time, the framework can take proactive privacy investment and the CEO's fulfillment of responsibility into account as mitigating factors.

Reading these changes simply as "more responsibility for the CISO and CPO" captures only half of what is happening.

> **The system is moving from a model centered on the duties of individual security or privacy officers toward a governance model that also connects CEOs, boards, budgets, and corporate incentives.**

---

## 10. Where does the recent debate over "criminal punishment for CISOs" fit?

On September 30, 2026, President Lee Jae-myung called for **strong criminal punishment and stronger civil compensation** in response to personal-data breaches.

But the public statement alone does not establish whether the intended subject of criminal liability would be a CISO, CPO, CEO, corporation, or some combination of actors, nor does it establish what level of intent or negligence would be required.

It therefore goes beyond the currently public evidence to translate that statement directly into **"the government intends to criminally punish CISOs."**

Korea does, however, have a historical case in which a person responsible for personal-information management was criminally punished.

### The HanaTour case

In the case arising from HanaTour's 2017 data breach, both the company and the person responsible for personal-information management were fined KRW 10 million at the first trial. The fines were maintained on appeal and ultimately upheld by the Supreme Court.

The case is sometimes summarized as "a security officer was punished because the company was hacked," but the meaning changes when the facts are included.

Investigators and courts considered specific security-control failures, including an outsourced worker storing a database administrator ID and password in an unencrypted memo file on a personal laptop, and the absence of an additional authentication mechanism such as OTP, certificates, or security tokens for external access to the personal-information processing system.

And the first-instance sentence was **a KRW 10 million fine—not one year of imprisonment.**

Another legal change is equally important.

The Personal Information Protection Commission's explanation of the major 2023 PIPA amendments explicitly states that Korea **removed criminal punishment tied to personal-data leakage resulting from violations of security-safeguard requirements while strengthening economic sanctions such as administrative surcharges**.

The legal framework that applied to the HanaTour case therefore should not simply be overlaid on the law as it stands in 2026.

---

## 11. Failure to prevent and deliberate concealment are not the same problem

This is where an important boundary in the criminal-liability debate appears.

Not every cybersecurity incident can be prevented.

There is no perfect software, no perfect security organization, and even companies that invest heavily in security can be compromised through new vulnerabilities or sophisticated attacks.

That is why we should distinguish among **the fact that an intrusion occurred**, **a failure to act on a known risk despite a duty and ability to do so**, and **deliberate conduct after an incident to hide the truth or mislead investigators**.

Korea's current PIPA itself reflects part of this distinction.

Although the 2023 amendments removed the criminal provision linking inadequate safeguards and a resulting leak, Article 73 still criminalizes conduct such as **submitting false materials for the purpose of concealing or minimizing a legal violation**, or obstructing an investigation by hiding, destroying, fabricating, or altering materials.

The case of former Uber CSO Joseph Sullivan offers a useful comparison.

The core reason Sullivan was convicted was **not that Uber was hacked**. The case focused on affirmative steps taken to conceal the 2016 breach while the FTC was investigating Uber's data-security practices. A jury convicted him of obstruction and misprision of felony, and the U.S. Court of Appeals for the Ninth Circuit upheld the conviction in 2025.

By contrast, the SEC's civil enforcement case against SolarWinds and its CISO, Timothy Brown, had significant portions dismissed by the court before the SEC voluntarily dismissed the remaining claims **with prejudice** in 2025.

That is why it is difficult to reduce both cases to the sentence "the United States also holds CISOs personally liable."

**What did the person know? What authority did the person have? What decision did the person make? And how did the person report—or conceal—the facts?**

Those questions matter.

---

## 12. Why concealment is different: it disables society's sensors

This returns to the central argument of this post.

If the state depends on distributed private sensors to discover risks it cannot directly observe, the governance system has to accomplish two things at once:

1. **Place preventive responsibility on actors capable of controlling the risk.**
2. **Create incentives for people who discover risk to transmit that information without distortion or concealment.**

From this perspective, it becomes easier to explain why deliberate concealment of a breach is particularly serious.

An incident itself may be a failure of defense.

But intentionally hiding a known incident, submitting false information to a regulator, or destroying evidence can **break the feedback loop through which society becomes aware of the risk at all.**

Victims may not even know that they have been affected.

They lose the opportunity to change passwords, freeze cards, monitor accounts, prepare for phishing, or consider dispute resolution and compensation. If the incident remains hidden, regulators also struggle to understand the scale and propagation of the attack, while other organizations lose information that might help them defend against the same technique.

For that reason, **failure of prevention and suppression of the truth should not be treated as the same policy problem.**

---

## 13. The paradox: does punishing the sensor more heavily make the system safer?

This creates a difficult paradox.

CISOs and CPOs are expected to find organizational risks and escalate them.

Security researchers are expected to discover vulnerabilities from outside and report them to vendors or coordinators.

But if the more aggressively someone looks for risk, the more personal legal and career exposure that person creates, what behavior becomes rational?

- Do not investigate too deeply.
- Delay escalation until certainty is very high.
- Narrow the formal scope of personal responsibility as much as possible.
- Avoid becoming the statutory CISO or CPO.
- As an external researcher, find the vulnerability but choose not to report it.

How much these effects occur in practice is an empirical question requiring separate research. It would therefore be too strong to claim that "punishing CISOs necessarily weakens security."

But the **incentive-design problem** is real.

> **A system that turns the mere existence of a discovered risk back into personal liability for the person expected to discover it may reduce the sensitivity of its own sensors.**

The opposite extreme is also problematic. If individuals can never be held accountable, deliberate concealment and reckless decision-making become harder to control.

The important question is therefore not whether responsibility exists, but **how precisely the conditions for responsibility are designed.**

---

## 14. So where should responsibility sit?

The history above does not mean that cybersecurity responsibility simply moved in one direction:

**user → security practitioner → CISO/CPO → executives/board → manufacturer/supply chain**

Instead, responsibility has accumulated across layers, while policy increasingly appears to emphasize two questions.

### ① Who can control the risk most effectively?

There is a limit to how much phishing awareness can help users if the product itself is insecure.

There is a limit to how much responsibility can be placed on a CISO who does not control the budget or staffing needed to reduce risk.

There is a limit to what an enterprise can do if a critical product is structurally vulnerable and the manufacturer does not provide a patch.

Preventive responsibility should therefore be connected to **the actors who possess meaningful authority, information, and resources to reduce the risk.**

### ② Who can see the risk first?

An external researcher discovers a vulnerability. An internal security practitioner detects signs of compromise. A CISO or CPO escalates the issue to management. The company informs regulators and affected individuals.

That is an **information flow**.

When the flow breaks, the state's ability to govern cyber risk also degrades.

Disclosure and reporting rules can therefore be understood as more than administrative procedure. They are part of the **information infrastructure that makes cyber risk visible to society.**

---

## 15. Answering the original question

Return to the question that started this post:

> **Why have the costs and risks of protecting the public interest in cybersecurity been distributed so widely across private companies and individuals?**

Based on the history and literature I reviewed, I would summarize the answer in five parts.

**First, cyber infrastructure itself developed around private ownership and operation.**

**Second, companies and practitioners usually possess far more information about the technical state of individual systems than governments do.**

**Third, because the state cannot directly observe the internal state of every system, it inevitably depends on private gatekeepers and researchers who occupy positions of superior visibility.**

**Fourth, Internet governance and cybersecurity developed with an important role for voluntary norms, public-private collaboration, and market mechanisms rather than relying only on strong ex ante regulation.**

And **the fifth point may be the most important today.**

> **Institutions are now trying to correct the externalities and distorted incentives created by that distributed responsibility.**

That is why describing the recent trend simply as

**"cybersecurity regulation is getting stronger"**

does not seem sufficient.

A better description may be that the costs and responsibilities distributed over decades among users, security practitioners, CISOs/CPOs, and companies are now being reconsidered according to two questions:

**Who is best positioned to control the risk, and who is best positioned to see it first?**

---

## Conclusion: not only a question of punishment, but of making risk visible

The debate began with criminal liability for CISOs, but the question I am left with is not simply whether a CISO should or should not be punished.

The larger question is this:

> **Cybersecurity policy is not only about deciding whom to punish after an incident. It is also about designing institutions and incentives so that the people who first see risks the state cannot directly observe will transmit what they know to society without concealment or distortion.**

Seen this way, several seemingly separate policy mechanisms become connected:

- CISO/CPO independence and reporting to boards;
- ultimate responsibility at the CEO level;
- management responsibility for cybersecurity risk;
- breach notification and notification to affected individuals;
- CVD and safe harbor for security researchers;
- manufacturer vulnerability-handling and security-update obligations; and
- personal liability for deliberate concealment and obstruction.

All of them are, in different ways, about **who sees cyber risk, who can control it, and who must communicate it.**

That leaves two questions.

> **How far should the state rely on private ethics and professional responsibility to produce the public good of cybersecurity?**
>
> And if some degree of that reliance is unavoidable, **how should responsibility, authority, cost, and legal risk be distributed among the actors involved?**

---

## References

### History, institutions, and security economics

1. U.S. National Science Foundation, [Birth of the Commercial Internet](https://www.nsf.gov/impacts/internet) — NSFNET and the transition toward the commercial Internet in 1995.
2. U.S. National Science Foundation, [The Internet: Changing the Way We Communicate](https://www.nsf.gov/about/history/nsf0050/pdf/internet.pdf) — historical material on the retirement and privatization of the NSFNET backbone.
3. NIST, [Framework for Improving Critical Infrastructure Cybersecurity, Version 1.0](https://csrc.nist.gov/pubs/cswp/1/cybersecurity-framework-v10/final), 2014.
4. Reinier H. Kraakman, [Gatekeepers: The Anatomy of a Third-Party Enforcement Strategy](https://academic.oup.com/jleo/article-abstract/2/1/53/873299), *The Journal of Law, Economics, and Organization*, 1986.
5. Karen Renaud, Craig Orgeron, Merrill Warkentin, P. Edward French, [Cyber Security Responsibilization: An Evaluation of the Intervention Approaches Adopted by the Five Eyes Countries and China](https://onlinelibrary.wiley.com/doi/10.1111/puar.13210), *Public Administration Review*, 2020.
6. Ross Anderson, [Why Information Security is Hard — An Economic Perspective](https://www.acsac.org/2001/abstracts/thu-1530-b-anderson.html), ACSAC 2001. [Full paper](https://www.cl.cam.ac.uk/ftp/users/rja14/econ.pdf).
7. CMU Software Engineering Institute, [Fostering Growth in Professional Cyber Incident Management](https://www.sei.cmu.edu/history-of-innovation/fostering-growth-in-professional-cyber-incident-management/) — history of CERT/CC after the Morris Worm and the evolution of vulnerability coordination.

### CVD and protections for security researchers

8. CISA, [Binding Operational Directive 20-01: Develop and Publish a Vulnerability Disclosure Policy](https://www.cisa.gov/news-events/news/cisa-issues-final-vulnerability-disclosure-policy-directive-federal-agencies), 2020.
9. U.S. Department of Justice, [New Policy for Charging Cases under the Computer Fraud and Abuse Act](https://www.justice.gov/archives/opa/pr/department-justice-announces-new-policy-charging-cases-under-computer-fraud-and-abuse-act), 2022.
10. European Union, [Directive (EU) 2022/2555 — NIS2](https://eur-lex.europa.eu/eli/dir/2022/2555/oj/eng) — Article 12 (CVD), Article 20 (management bodies), Recital 60 (vulnerability researchers).
11. European Union, [Regulation (EU) 2024/2847 — Cyber Resilience Act](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R2847) — manufacturer vulnerability handling, support periods, and CVD policies.
12. Korea Ministry of Government Legislation, [Proposed Amendment to the Act on Promotion of Information and Communications Network Utilization and Information Protection — Bill No. 2216276](https://opinion.lawmaking.go.kr/gcom/nsmLmSts/out/2216276/detailRP), January 23, 2026 — proposal for vulnerability-handling policies, CVD, and a legal basis for protections for information-security researchers. Under National Assembly review as of the publication date.

### Rebalancing responsibility and Korea's 2026 framework

13. The White House, [National Cybersecurity Strategy](https://www.whitehouse.gov/wp-content/uploads/2023/03/National-Cybersecurity-Strategy-2023.pdf), March 2023 — the U.S. policy of rebalancing cybersecurity responsibility at the time.
14. Personal Information Protection Commission, [What Changed in the 2023 Comprehensive Amendment to the Personal Information Protection Act](https://pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS074&nttId=9819), December 29, 2023 — removal of criminal punishment tied to data leakage caused by security-safeguard violations and strengthening of economic sanctions.
15. Personal Information Protection Commission, [Amended Personal Information Protection Act, Enforcement Decree, and Notices Take Effect September 11 to Strengthen Prevention and Victim Remedies](https://pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS074&mCode=C020010000&nttId=12459), September 10, 2026.
16. Korean Law Information Center, [Personal Information Protection Act, Articles 30-3 and 31](https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=283839) — CEO/representative ultimate responsibility, board involvement in CPO appointment, reporting, and independence.
17. Korean Law Information Center, [Personal Information Protection Act, Article 73](https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0073&lsiSeq=283839&urlMode=lsScJoRltInfoR) — criminal penalties for false submissions intended to conceal or minimize violations and for obstruction of investigations.
18. Korean Law Information Center, [Information and Communications Network Act, Article 45-3](https://www.law.go.kr/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=1017113157) — executive-level CISO designation, staffing and budget responsibilities, and board reporting.
19. News1 Korea, [President Lee Calls for Strong Punishment over Personal-Data Leaks](https://www.news1.kr/politics/president/6306424), September 30, 2026.

### Individual criminal liability and concealment cases

20. Supreme Court of Korea, [HanaTour Fined KRW 10 Million over Customer-Data Breach](https://www.scourt.go.kr/portal/news/NewsViewAction.work?gubun=2&searchOption=&searchWord=&seqnum=4593), July 25, 2022, Case 2020Do11409.
21. Yonhap News Agency, [HanaTour Fined KRW 10 Million over Leak of Customer Information](https://www.yna.co.kr/view/AKR20200106065600004), January 6, 2020 — first-instance ruling and details of the security-control failures.
22. U.S. Department of Justice, [Former Chief Security Officer of Uber Convicted of Federal Charges for Covering Up Data Breach](https://www.justice.gov/usao-ndca/pr/former-chief-security-officer-uber-convicted-federal-charges-covering-data-breach), October 5, 2022.
23. U.S. Court of Appeals for the Ninth Circuit, [United States v. Sullivan](https://cdn.ca9.uscourts.gov/datastore/opinions/2025/11/12/23-927.pdf), November 12, 2025 — conviction affirmed.
24. U.S. SEC, [SolarWinds Corp. and Timothy G. Brown — SEC Dismisses Civil Enforcement Action](https://www.sec.gov/enforcement-litigation/litigation-releases/lr-26423), November 20, 2025.

---

### Editorial notes

- Information and legal status checked as of **October 6, 2026 KST**.
- This post is an institutional analysis based on public statutes, court decisions, policy materials, and academic literature. It is not legal advice.
- **Gatekeeper**, **sensor**, and **feedback loop** are analytical metaphors describing information and control functions in cyber governance. They do not imply that CISOs, CPOs, and security researchers share the same legal status.
- President Lee's September 30, 2026 remarks did not define the specific targets or legal elements of any future criminal-liability regime. This post therefore does not infer personal criminal liability for CISOs or CPOs beyond what is publicly established.
