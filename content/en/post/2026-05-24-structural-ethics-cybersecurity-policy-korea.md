---
title: "A Critical Reading of Structural Ethics in Cybersecurity Policy: Korea's 2025 Whole-of-Government Information Protection Plan"
date: 2026-05-24
draft: false
featured: true
tags: ["TrustAndCulture", "Cybersecurity", "Policy", "White-hacker", "Structural Ethics", "Governance"]
categories: ["Security", "Policy"]
description: "A reading of Korea's 2025 whole-of-government information protection plan through the structural parallel between the Nightingale myth and the white-hacker discourse. Policy is moving from dependence on individual ethics toward structural accountability, but the transition is not complete."
summary: "Korean cybersecurity policy is moving toward structural accountability — CEO and CISO responsibility, government investigation authority, security disclosure, SBOM. At the same time, it still carries the individual-ethics narrative of training white-hackers. This essay reads that transitional moment through the lens of structural ethics."
image: ""
---

> This essay is a 2026-May reorganization of a draft I first wrote in October 2025.
> The central question of the draft is unchanged.
> **Should security lean on benevolent individuals, or should structure be designed so benevolent choices are possible?**

---

## Abstract

On October 22, 2025, against a backdrop of successive hacking incidents and public anxiety, the Korean government announced a **whole-of-government information protection plan**. The plan includes security inspection of about 1,600 IT systems across the public, financial, and telecom sectors, expanded government investigation authority, the introduction of punitive penalties, a security-rating system, strengthened CEO accountability and CISO authority, expanded security disclosure, the institutionalization of SBOM, and the cultivation of white-hackers.

This essay does not read the plan as a simple security-strengthening policy. It poses this question instead.

> Is Korean cybersecurity policy moving from a structure that depends on individual ethics to a structure that designs organizational and institutional accountability?

To examine this question I compare the Victorian-era "angel in white" myth around Florence Nightingale with today's "white-hacker" discourse. The two narratives belong to completely different times and fields, but they share one thing. **The moment institutional failure is translated into individual dedication and ethics, structure becomes invisible.**

This essay does not deny individual ethics. On the contrary, it argues that when an individual's ethical practice triggers institutional reform, ethics can shift from individual virtue into a property of the system. The question is not whether white-hackers are needed. The question is whether the state and firms can keep operating structures that do not function without white-hacker goodwill.

---

## 1. Why I am taking this essay out again

When I first wrote this essay I was stuck on the strange brightness of the word "white-hacker." A white-hacker is the good hacker, the ethical hacker — finding system vulnerabilities, reporting before exploitation, sometimes moving for honor more than reward.

That phrasing sounds nice. But phrases that sound nice often push away inconvenient questions.

- Why was that vulnerability in the system to begin with?
- Why did the organization not build enough structure to find vulnerabilities itself?
- Why does the institution expect external ethical individuals to discover the problems?
- Why is the cost of security failure so often compensated by individual dedication, overtime, mission, and ethics?

The essay came back to mind while I was working on LLM cross-domain reasoning. The moment an LLM truly becomes new is not when it knows some piece of knowledge but when it rewrites a problem in one domain in the language of another. For example, in exploit development the important moment is not "we have a vulnerability" but "the bottleneck of this exploit chain is numeric representation and precision loss."

The same applies to policy writing.

On the surface, Nightingale and the white-hacker are nothing alike. One is a 19th-century story of nursing and hospital sanitation. The other is a 21st-century story of cybersecurity. But rewrite the problem structurally and the two rhyme.

```text
Failure of the medical system
→ Beautified as Florence Nightingale's individual dedication and morality
→ Institutional failure translated into the language of individual ethics

Failure of the cybersecurity system
→ Beautified as the white-hacker's individual goodwill and capability
→ Organizational and policy failure translated into the language of individual ethics
```

This essay addresses precisely that translation problem.

---

## 2. The Nightingale myth and the white-hacker narrative

Florence Nightingale is usually remembered as "the lady with the lamp" — a symbol of devotion walking between hospital beds. But Nightingale's real importance was not simple devotion. She analyzed mortality, sanitation, hospital structure, and administrative failure with data, and demanded institutional reform.

What society remembered longer, however, was not the reformer but the angel.

Why?

Angels are convenient. An angel does not ask about structure. An angel does not look for who is responsible for institutional failure. An angel casts moral light over corrupt hospital administration, terrible sanitation, missing budget, and state incompetence — uniformly.

In this frame, individual dedication is beautiful and at the same time dangerous. Dedication can become decoration that hides structural failure.

The white-hacker discourse carries a similar risk.

White-hackers are necessary. They find vulnerabilities, surface risk earlier than attackers, and play an important role in the security ecosystem. But every time policy invokes white-hackers, we have to ask alongside:

> Why did the organization not build enough structure to find and fix its own vulnerabilities?

The moment we call the white-hacker a hero, the organization gets temporary relief. "We need good hackers" is a true statement. But that statement cannot become the alibi "we do not have to fix the structure."

---

## 3. Korea's 2025 whole-of-government information protection plan: policy is actually moving

Fortunately, the 2025 plan did not stop at "let's train more white-hackers." On the contrary, several of its items show Korea's security policy moving from individual-ethics-centered to structural-accountability-centered.

The core of the announcement included:

- Security vulnerability inspection of about 1,600 IT systems closely tied to citizens' lives in public, financial, and telecom sectors
- Realistic, attack-style inspections against telecom providers and others
- Expanded investigation authority so the government can act on signs of hacking even without firm self-reporting
- Higher fines and the introduction of punitive penalties for delayed reporting, failure to prevent recurrence, and repeat data breaches
- Expanded security disclosure obligations to cover all listed companies
- A rating system that publicly grades security capability based on disclosures
- Strengthened CEO accountability and CISO authority
- Phasing out mandatory user-facing security software in finance and the public sector in favor of MFA and AI-based anomaly detection
- Shifting from blanket physical network separation to data-centric security
- Institutionalizing SBOM submission for public IT systems and products
- Cultivating next-generation security firms and strengthening the white-hacker training pipeline

The change is not small.

Past security policy often resembled after-the-fact response. When an incident happened, an investigation followed; fines were imposed; those responsible were censured. That is necessary, but post-hoc punishment alone does not change structure.

What stands out in 2025 is that security has begun to be treated not as a problem of post-incident response but as a problem of **management, disclosure, procurement, supply chain, accountability, and organizational structure.**

The expansion of security disclosure and the introduction of grading matter especially. Firms have long treated security as a cost — investments are hard to see; insufficiencies show only after an incident. Disclosure and grading attempt to reduce that invisibility.

Once security investment is comparable externally, linked to executive accountability, and made subject to market evaluation, security is no longer just a job left to operator mission. Security becomes the firm's accountability — its duty to explain.

---

## 4. The important shift: from "security operator accountability" to "management accountability"

The shift I track most closely is the strengthening of CEO and CISO responsibility.

When a security incident occurs, organizations often blame the operator. Why did they not know? Why was the patch late? Why was the log not checked? Why was the anomaly missed?

But many security failures are not problems of operator diligence.

- Was the security budget adequate?
- Did the CISO actually have decision-making authority?
- Was security headcount sized to the service?
- Was the management structure designed so that vulnerability remediation would not be deprioritized by business schedules?
- Were security risks discussed at the board and CEO level?
- Were recurring vulnerabilities fed back into organizational learning?

These questions cannot be answered by an operator alone.

So strengthening CEO/CISO responsibility is not simple punishment escalation. It should be machinery that pulls security into the organization's decision-making structure. If the CISO carries accountability without authority, it becomes another sacrifice narrative.

Real structural ethics looks more like this state.

```text
Authority where accountability is,
budget where authority is,
measurable security goals where budget is,
and a structure that connects those goals to management decisions.
```

Without this structure, "strengthened CISO responsibility" can end as a phrase that loads heavier burden onto the CISO.

---

## 5. What remains: the bright narrative of "training white-hackers"

Even so, traces of individualized branding remain in the plan. The most visible is white-hacker training.

The direction itself — training 500 white-hackers a year and developing top security experts matched to industry demand — is not wrong. Korea is short on senior security talent, and matching real attacker speed requires expert headcount.

The problem starts the moment talent training replaces structural reform.

Increasing security headcount is necessary. But unless the following questions go alongside, policy returns to the individual.

- What legal protection does that white-hacker receive?
- What duties does the firm bear when a vulnerability is reported?
- Is the reporter rewarded, or only honored?
- Does the government or firm have a procedure to feed discovered vulnerabilities back into structural improvement?
- Does the problem a white-hacker found connect to the CISO/CEO accountability system?
- Do recurring vulnerabilities change procurement, development, operations, and audit standards?

Without these questions, the white-hacker becomes not a "partner in institutional improvement" but a "cushion for institutional failure."

We need more white-hackers. But more important than that is the path by which the vulnerabilities they find lead to organizational learning and institutional change.

Ethics can start in a person. It must not end there.

---

## 6. What does "structural ethics" mean?

I use "structural ethics" here in the following sense.

> Ethics is not the character of good individuals, but the system design that makes good choices repeatable.

Individual ethics matters in security. Choosing to report rather than exploit a discovered vulnerability, choosing not to look away from organizational risk, choosing to surface inconvenient facts to reduce customer harm — these are all ethical acts.

But individual ethics alone is not sustainable.

Good individuals get tired. They leave. They go silent. They fear punishment. They are not rewarded. They are blocked by office politics. They get deprioritized by leadership.

So ethics has to become structure.

Structural ethics includes:

- Vulnerability reporter protection
- Responsible disclosure procedures
- Bug bounty and reward systems
- Guaranteed CISO authority
- Security accountability at CEO and board level
- Security disclosure and external verification
- Supply chain transparency
- Incident investigation authority and independent oversight
- Structural recurrence prevention for repeated incidents
- Sustainable working conditions for security professionals

Some of these are present in the 2025 plan. Some are still missing.

Independent ethical oversight, reporter protection, a legal safe harbor for vulnerability disclosure, and ongoing governance partnership with the hacker community deserve sharper design.

---

## 7. What the policy shift means: a half transition, but an important one

Even with a critical reading, the significance of the 2025 plan should not be underestimated. Policy is actually moving.

Previous Korean security discourse leaned toward "the security operator must do well," "we need ethical hackers," "firms should manage this voluntarily." Today is somewhat different.

Government investigation authority, security disclosure, grading, CEO/CISO accountability, SBOM, the move away from blanket network separation, MFA and AI-based anomaly detection, and supply-chain management in public procurement appear together. This is an attempt to rewrite security in the **language of institutions and markets, procurement and management** — not the language of individual attitude or technical capability.

That said, the transition is not complete.

A more precise read is this.

> Korean security policy is moving from dependence on individual ethics to structural accountability. But the transition is not complete. We are in an intermediate state where structural machinery and individual-capability narratives coexist.

I want to call this state a "half transition."

"Half" is not a criticism. It is important. A half transition means a direction has been set. It also means we still have to look at the other half.

---

## 8. The direction of law and politics: from outsourced accountability to located accountability

Korean political and legal policy has started to treat cybersecurity as a question of **locating accountability**.

In the past, when an incident happened, accountability scattered. Operators, vendors, security solutions, user negligence, hackers, missing regulation — all got mixed in. Everyone seemed slightly responsible, and so no one bore enough responsibility.

Recent policy direction tries to reduce that fog.

- The government is strengthening investigation authority so it does not depend only on voluntary firm reporting.
- Firms are moving toward publicly disclosing security investment and headcount through security disclosure.
- CEOs and CISOs have to accept security failure as a management responsibility, not just a technical-department problem.
- Public procurement is beginning to ask about supply-chain components via SBOM.
- Network separation is moving from physical separation — an old symbol — toward data-centric security.

The direction can be summarized in one line.

```text
From asking individuals about accountability,
to clarifying the structure and location where accountability arises.
```

This shift matters. But if law locates accountability while leaving out authority, budget, reward, and procedure, accountability lands back on the individual.

The CISO is the focal point and the risk point of this transition. If the CISO reports directly to the CEO, can adjust budget and headcount, and can translate security risk into business risk, structural accountability emerges. If the CISO is used only as a name tag bearing post-incident responsibility, that is just a new form of sacrifice narrative.

---

## 9. Relocating the white-hacker

A white-hacker is not a hero, not a mercenary, not free outsourced labor. The healthiest position is **a partner in structural reform.**

A few transitions are needed for that.

First, vulnerability reporting must be an institutional procedure, not a reliance on goodwill. Report channels, processing deadlines, reward criteria, legal safe-harbor scope, and dispute procedures should be clear.

Second, white-hacker findings must connect to organizational learning, not be one-off events. Beyond patching a single vulnerability, the work should return to development process, deployment structure, test regime, and procurement criteria — to ask why the vulnerability arose.

Third, white-hacker training policy must include diversity and sustainability. Building the security talent pool only around the "genius hacker" image narrows the community. Women, non-CS majors, regional talent, operations veterans, policy experts, developers, and auditors all have to enter. Modern security does not run on exploits alone. People who can see structure are needed.

Fourth, reward and protection are needed. Ethical action does not sustain on praise alone. Legal risk has to drop, fair compensation must exist, and firms must not be allowed to suppress inconvenient reports.

The white-hacker should not be a hero outside the structure but a sense organ inside it.

---

## 10. This matters more in the AI era

AI makes this problem harder.

When LLMs and automation tools begin assisting vulnerability search, code analysis, exploit reasoning, log interpretation, and policy writing, the speed of finding vulnerabilities increases. Attackers get faster, defenders get faster.

If the state and firms still depend on "a few exceptional individuals" at this point, the structure breaks faster.

AI-era security policy has to ask:

- As discovery speed accelerates, does remediation speed keep up?
- Who validates and prioritizes the risks AI surfaces?
- Do LLM-produced analyses feed into management decisions?
- Can security staff handle more alerts and faster analysis demands?
- Does AI-assisted vulnerability discovery just transfer more unpaid verification labor onto individual white-hackers?

AI can solve the security talent shortage. It can also refine accountability-laundering. The phrases "AI found it," "the white-hacker confirmed it," and "the CISO reported it" must not become covers for organizational structural accountability.

That is why structural ethics matters more in the AI era.

---

## 11. Conclusion: not good individuals, but a structure where good choices are possible

People matter in cybersecurity. That statement is true.

But the statement is often misused. "People matter" must not turn into a justification for the sacrifice of operators, the goodwill of white-hackers, the responsibility-burden of CISOs, and the unpaid labor of researchers.

We have to say it more precisely.

> What matters in cybersecurity is not good individuals, but a structure that makes good choices repeatable.

The 2025 plan is moving in that direction. Government investigation authority, security disclosure, the grading system, CEO/CISO accountability, SBOM, and the shift away from blanket network separation are all attempts to rewrite security in the language of structure.

At the same time, the bright narrative of white-hacker cultivation remains. If that narrative connects to partnership for structural reform, it is positive. If it gets consumed as a hero story that conceals structural failure, we return to the old trap of the Nightingale myth.

Nightingale's greatness was not that she was an angel. It was that she saw the structure.

The white-hacker is the same. What is great is not the image of a benevolent individual but the moment the individual's discovery changes the institution.

In the end, ethics does not live only inside people. Ethics is designed. It enters the budget. It surfaces in disclosure. It is distributed as authority and accountability. It is written into procurement criteria. It works as incident investigation authority. And it becomes a feedback loop that sends repeated failure back into structure.

> Security can start in goodwill.
> But if it stays at goodwill, it does not last.
> Only when goodwill is converted into structure does security become ethics.

---

## Summary

- The 2025 whole-of-government information protection plan shows Korean cybersecurity policy moving from dependence on individual ethics toward structural accountability.
- Government investigation authority, security disclosure, the rating system, CEO/CISO accountability, SBOM, and the shift away from blanket network separation are machinery for rewriting security as an organizational and institutional problem.
- But the bright narrative centered on white-hacker training still carries the risk of individual heroism.
- The white-hacker should be positioned not as a cushion for institutional failure but as a partner in structural reform.
- In the AI era, as discovery speed accelerates, an accountability structure and verification regime that does not depend on individuals matter more.
- Real ethics is not about finding good individuals but designing a system in which good choices are repeatable.

---

## References

- [Whole-of-government information protection plan announced — government can investigate signs of hacking without firm reporting — Korea Policy Briefing, 2025-10-22](https://www.korea.kr/news/policyNewsView.do?newsId=148952831&pWise=main&pWiseMain=L1)
- [The Defiance of Florence Nightingale — Smithsonian Magazine](https://www.smithsonianmag.com/history/the-worlds-most-famous-nurse-florence-nightingale-180974155/)
- [Unravelling the Ethical Web: Navigating the Complexities of Hacking — London School of Cybersecurity](https://lscs.io/ethics-in-hacking/)
- [What Is Ethical Hacking and How Can It Foil Cybercrime? — American Military University](https://www.amu.apus.edu/area-of-study/information-technology/resources/what-is-ethical-hacking-and-how-can-it-foil-cybercrime/)
- [Successive major hacking incidents — government announces whole-of-government information protection plan — Byline Network, 2025-10-22](https://byline.network/2025/10/22-493/)
- [National Security Office leads — public-private whole-of-government information protection plan announced — Boannews, 2025-10-22](https://m.boannews.com/html/detail.html?idx=139881)
