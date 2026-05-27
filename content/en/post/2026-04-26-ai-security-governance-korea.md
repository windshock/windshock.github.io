---
title: "Korean Security Governance Is Accelerating in the Wrong Direction in the AI Era"
date: 2026-04-26
draft: false
description: "Korean security governance in the AI era needs to change not the title of any one agency, but the behavior that evaluation rewards."
tags: ["AI", "Security", "Governance", "ISMS-P", "KISA", "NIS", "Policy", "Cybersecurity"]
categories: ["Security", "Policy"]
summary: "What Korean security governance needs to change in the AI era is not the title of any one agency, but the behavior that evaluation rewards. If a system that only rewards standards compliance and turns autonomous judgment into a personal cost continues, attack accelerates with AI while defense slows further under evidence work and cost cutting."
---

![Multi-actor balance and change paths in Korean security governance](/images/post/governance-series-01-overview.svg)

*— Evaluation is rewarding the wrong behavior*

> This is Part 1 of the AI-era Korean security governance series.
>
> - Part 1: **Korean Security Governance Is Accelerating in the Wrong Direction in the AI Era**
> - Part 2: [Why Korean security governance does not change](/en/post/2026-04-30-why-korean-security-governance-does-not-change/)
> - Part 3: [How do we measure adaptive capability?](/en/post/2026-05-04-adaptive-security-metrics-and-ciso-template/)
> - Part 4: [Can the market move governance?](/en/post/2026-05-07-market-can-move-security-governance/)
> - Part 5: [The Real Battleground of National AI Strategy Is Not Just GPU Count](/en/post/2026-05-24-ai-national-strategy-control-plane/)

## Starting point

This article started with a simple question. **Does it matter whether the National Intelligence Service (NIS) moves from being an "approver" to a "coordinator"?**

The question came from a televised proposal by Prof. Kim Seung-joo (Korea University), who suggested borrowing from the US-style separation-of-governance model, and Yoon Doo-sik's [LinkedIn response](https://www.linkedin.com/feed/update/urn:li:activity:7451078582262702080/) — arguing that, before any legal amendment, changing the operating mode would be more realistic, and offering the phrase "from approver to coordinator." This article starts from agreement with that proposal and then asks how far that proposal actually goes.

I agree with the direction. As AI tooling, agents, MCP, code generation, and automated response accelerate, waiting for central approval and authoritative interpretations every time forces the field into passivity. Moving from approver to standards provider, from controller to coordinator, is reasonable.

But the answer was not enough. Even if the title changes, if information is still locked at the center, the field does not speed up. So I first reframed the problem as one about information disclosure. NIS-held threat intelligence and vulnerability information should be released in forms the field can actually use, I argued.

After several rounds of review, that argument fell apart. Releasing the information does not help if there is nobody who can interpret it or no authority to act. So I expanded to "information, capability, authority, and accountability all together," then was criticized for that being a list rather than a thesis and narrowed back down to accountability alone. Then I hit the criticism that even if accountability is unlocked, that alone does not make anyone move. The argument scattered again.

What ended this oscillation was two realizations.

First, **this is not just an NIS problem.** Second, **this is not just a "standards compliance vs. autonomous judgment" problem — it is a time problem.**

## This is not just an NIS problem

Look at ISMS-P. The control items are fixed, and audited organizations build evidence to fit those items. Adding or modifying controls based on your own threat-environment judgment earns no bonus points in certification. On the contrary, anything outside the standard becomes an explanation burden ("why did you do that?").

That is, the certification system itself makes autonomous judgment a cost.

- Followed the standard items → certification passes
- Self-judged and added controls → unrelated to certification; extra explanation burden at audit
- Self-judged and modified standard items → risk of certification failure

This does not change whether the NIS plays approver or coordinator. KISA's ISMS, the Personal Information Protection Commission's impact assessments, the Ministry of the Interior and Safety's information security management evaluations, and NIS security policy all operate on the same structure. The issue is not one agency's control style. **Korea's national security governance as a whole is designed as a standards-compliance evaluation regime**, and inside that regime autonomous judgment is not institutionally rewarded.

From here comes the key sentence.

> **Evaluation creates behavior.**

If it is not on the evaluation, it does not get done. If it hurts you in evaluation, you avoid it. If evaluation rewards it, it moves. The reason the Korean security field is slow is not that the people in charge are lazy. **The evaluation system makes them behave this way.** Do not go outside the standard; you bear the burden of justifying autonomous judgment; what is not in the evaluation is not rewarded — this message comes through consistently from every certification, audit, law, and guideline.

Inside this structure, not innovating is not irrational. Within the institution, it is the rational choice.

## AI has changed the cost structure

What we have done so far is governance analysis. From here, we move to time analysis.

Foreign security firms and researchers already use AI not just as a document-writing aid but as an auxiliary pipeline for code analysis, fuzzing, vulnerability review, exploit writing, and patch verification. Attackers also use AI for reconnaissance, vulnerability search, and payload generation.

This is not a theoretical observation. With analysis tools I built myself, classifying potentially-vulnerable paths by specific code patterns and bundling similar structures for review, I observed work that would take a general analyst a year, or a skilled expert a month, drop to single-day turnaround. This does not mean every vulnerability analysis is now a one-day job. But for repetitive code-path classification, similar-vulnerability pattern search, and candidate-set narrowing, the time unit is already shifting.

If a change of this scale is possible at the individual level, the speed achievable by foreign security firms and attacker groups with organizational resources is already in a different regime.

I had a similar feeling working on the KISA bug bounty. Vulnerability information was received, but the speed at which that information was converted into executable knowledge on the ground was not fast enough. That was the seed of this argument.

This is where the time-dimension asymmetry shows.

- Attackers and foreign security firms: are moving toward day-level analysis/verification cycles
- Domestic public defense: moves on ISMS renewal cycles, security notice publication cycles, authoritative-interpretation reply cycles

The gap between these two cycles is not single-digit; it is two-to-three-digit. And this gap is not the kind that gets closed. As AI capability improves each year, the attacker side gets faster, and as long as the defender side stays inside standards-compliance governance, its speed stays bound to governance cycles. The problem is not the absolute gap but **the acceleration of the gap.**

This time-gap question is already a serious metric in foreign policy and research. The US CISA Known Exploited Vulnerabilities Catalog and BOD 22-01 require action within a designated deadline on actively exploited vulnerabilities. Beyond mere notice, response time was pulled inside the institution. In the same direction, Google Project Zero's Project Naptime showed that LLM-based vulnerability research frameworks can significantly lift existing benchmark performance, and DARPA's AI Cyber Challenge made AI-based vulnerability finding and patch automation a policy agenda. The point is one. Security evaluation must now ask not "what do you have" but "how fast did you react to a new risk."

## Where it bends most: the private sector

Here comes the most ironic point. The government side, sure. What about the private sector?

- Security teams are not given enough AI — out of concerns about data exfiltration, external SaaS, and accountability
- Nor is it mandated by regulation — the evaluation system does not explicitly require or reward AI-based analysis capability, so the cost of not doing it is small
- And yet executives are already using AI to cut headcount and cost — including in security teams

In the domestic private sector, AI is being **consumed first in the language of cost reduction**, not security capability. If this current is left alone, security teams end up defending a broader attack surface with fewer people and without AI tooling.

This is not a simple management failure. It is what governance produced. Evaluation creates behavior. Firms do not do what is not in evaluation, because not doing it still passes. If AI security usage is not an evaluation item, the private security team has no institutional motive to adopt AI.

At the same time, information control prevents threat awareness from forming. When the center controls and parcels out threat intelligence, private-sector executives do not feel the change in attack speed in the AI era. Because they do not feel it, AI looks only like an efficiency tool, and the security team enters the cost-cutting list.

Even if a security team argues "we have to adopt AI tooling," if that does not give ISMS bonus points, there is no basis to convince leadership. Adopting AI on one's own, then having an incident, brings back the accusation: "why did you use a non-standard tool?"

On the government side, the problem shows up as **moving slowly** inside a standards-compliance evaluation. On the private side, under the same evaluation, it shows up as **AI flowing into cost-cutting only**. Different surfaces, same cause.

## Accelerating in the wrong direction

The four things happening simultaneously in Korea's security ecosystem can be summarized in four lines.

1. Attackers are accelerating with AI.
2. Foreign security firms are accelerating with AI.
3. Domestic public defense is bound to standards-compliance cycles.
4. Domestic private defense has no institutional motive to adopt AI (because it is not in the evaluation), and meanwhile executives consume AI as cost reduction.

Korea is not "a beat late" in entering the AI era of security. **It is accelerating in the wrong direction.** The attack side is getting faster, while the defense side is getting smaller in headcount.

This structure did not arise from one agency's control style. It is the result of certifications, audits, laws, and guidelines all running in the same direction. Inside a governance regime designed so that autonomous judgment becomes an institutional cost, when both government and private sector behave rationally, this is the outcome.

## We have to change the behavior that evaluation rewards

So what is needed? Adjusting the NIS's role is meaningful, but once you arrive here it becomes clear that it cannot be the core agenda.

The real agenda is this.

> **Can the evaluation and certification system be redesigned to reward AI-era speed and autonomous judgment?**

One misreading to head off first. This does not mean standards compliance is unnecessary. **Standards should be the minimum line.** But in today's evaluation system, the minimum line effectively becomes the target. Organizations that make risk judgments beyond the standard are not rewarded for it, and if they deviate from the standard they take on an explanation burden. A rational actor parks exactly at the minimum line. Not above. Not below.

That is the real problem the standards-compliance regime creates. The standard itself is not the problem; **the structure that makes the standard act as a ceiling** is. What the AI era needs is not to discard the standard, but to pull adaptive behavior above the standard into evaluation.

Another likely objection. "If you put AI usage into evaluation items, won't it just become another checklist? Reduced to AI-tool adoption evidence, usage procedure docs, log samples, training certificates — won't it just become another evidence game?"

True. It can. But this is not a reason to give up on redesign.

**Every evaluation eventually gets gamed. The question is not whether it gets gamed but what we get it to game.** The current system rewards exhaustive standard-item matching. The AI era has to reward how quickly you interpreted new threats, judged impact scope, built a temporary mitigation, and folded the result into the next control. Perfect evaluation is impossible. But **evaluation that rewards the wrong behavior can be changed.**

Here AI is the means, not the end. Evaluation should ask not "did you use AI" but "do you have adaptive capability matched to AI-era speed." Once AI usage itself becomes a checklist item, it gets formalized again.

## Three minimum starting points

This redesign will not be finished in one stroke. But the starting point is clear. The evaluation system has to look not at "what do you have" but at "when a new risk arrived, how did you judge and how did you move." From that principle, at least three things follow.

**First, in addition to standard-item compliance, evaluate impact analysis and temporary-response time for new threats.** When an organization receives information about a new vulnerability, how many days did it take to judge impact scope, and how quickly did it apply a temporary mitigation? These have to enter the evaluation. Today, all of this sits outside.

**Second, autonomous actions outside the standard, when backed by rational basis and after-the-fact records, must be recognized as bonus points or best practices, not penalty points.** For the "autonomy is a cost" structure to unwind, autonomy has to be rewarded. Even if an incident occurs, having gone through a rational process should be protective, and autonomous judgments that prevented incidents should be shared as best practices.

**Third, evaluate response systems, verification procedures, and log-based re-search capability that match AI-era analysis speed — not whether you adopted AI tools.** Tool-adoption evidence is meaningless. When a new pattern arrives, can you re-search in your own environment? Is there a procedure to verify the result? Does that flow back into the next control? That is the object of evaluation.

All three share one trait: **they are not new items but time variables.** When did it arrive, when did you judge, when did you apply? Not "do you have an AI analysis tool." Reducing it to an item drops you back into the same trap.

This requires a paradigm shift in security governance. **From compliance capability to adaptive capability.**

This redesign cannot be done by one agency. NIS, KISA, the Personal Information Protection Commission, the Ministry of the Interior and Safety, and even the Board of Audit and Inspection and the legislature are all involved. That is what makes it hard. But hard does not mean we should not. Time is accelerating, and the gap is accelerating.

## A question to policymakers

I want to end with one question.

**Does today's evaluation and certification system reward an organization for discovering and acting on a new risk first, or does it make it explain why it deviated from standard items?**

If we cannot answer this in the AI era, defenders will keep getting slower and attackers will keep getting faster. And in between, many private security teams will face cost-cutting pressure first, before they can use AI as a defense capability.

## Relevant international trends

- [Google Project Zero, Project Naptime](https://projectzero.google/2024/06/project-naptime.html): LLM-based vulnerability research framework
- [DARPA AI Cyber Challenge](https://www.darpa.mil/news/2025/aixcc-results): AI-based vulnerability finding and patch-automation competition
- [CISA Known Exploited Vulnerabilities Catalog / BOD 22-01](https://www.cisa.gov/news-events/directives/bod-22-01-reducing-significant-risk-known-exploited-vulnerabilities): mandated action by deadline on actively exploited vulnerabilities
- [CISA Cybersecurity Performance Goals](https://www.cisa.gov/cybersecurity-performance-goals-cpgs): outcome-focused security goals
- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework): continuous AI risk management on Govern, Map, Measure, Manage

---

## One-line conclusion

> What Korean security governance needs to change in the AI era is not the title of any one agency, but the behavior that evaluation rewards. If a system that rewards only standards compliance and turns autonomous judgment into a personal cost continues, attack accelerates with AI while defense slows further under evidence work and cost cutting. Evaluation must now ask, beyond "did you keep the prescribed items," "how quickly did you judge and improve in the face of new risk."
