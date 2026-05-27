---
title: "How Do We Measure Adaptive Capability?"
date: 2026-05-04
draft: false
description: "To move from compliance capability to adaptive capability, what do we measure? This post proposes MTTA, MTTP, MTRS, and a minimal execution template for the field."
tags: ["AI", "Security", "Metrics", "CISO", "MTTA", "MTTP", "MTRS", "Policy"]
categories: ["Security", "Policy"]
summary: "Security evaluation must ask not whether you own a tool, but how quickly you judged, protected, re-searched, and learned in response to a new risk."
---

![Mini metrics for adaptive capability](/images/post/governance-series-03-metrics-overview.svg)

> This is Part 3 of the AI-era Korean security governance series. Part 1 addressed the problem of the evaluation system; Part 2 addressed the multi-actor equilibrium that sustains it. This part proposes the minimum language needed to break that equilibrium: **measurable adaptive-capability metrics**.
>
> - Part 1: [Korean security governance is accelerating in the wrong direction in the AI era](/en/post/2026-04-26-ai-security-governance-korea/)
> - Part 2: [Why Korean security governance does not change](/en/post/2026-04-30-why-korean-security-governance-does-not-change/)
> - Part 3: **How do we measure adaptive capability?**
> - Part 4: [Can the market move governance?](/en/post/2026-05-07-market-can-move-security-governance/)
> - Part 5: [The Real Battleground of National AI Strategy Is Not Just GPU Count](/en/post/2026-05-24-ai-national-strategy-control-plane/)

## Why metrics, not tools?

When a new technology appears, many organizations first ask:

- Which product should we buy?
- Which AI tool should we adopt?
- Which checklist do we add?

But this question often misses. Tools are means. What really matters is **how quickly the organization judges, how properly it verifies, and how broadly it re-searches when a new risk arrives.**

What is needed is not a product list but **adaptive-capability metrics.**

## Minimum metric 1: MTTA — Mean Time To Analyze

**Definition:** the time from receiving information about a new vulnerability or threat to completing a first-pass judgment of impact in our environment.

Existing governance mainly asks "does the control exist?" In the AI era, **how fast you interpret a new risk** matters more than whether you own a control.

Operational questions look like:

- Is this vulnerability relevant to our assets?
- Does it apply to externally exposed assets?
- Is the exploitability high?
- Do we need a temporary mitigation?

Measurement can start simply.

- Start: time we received the risk signal — KEV listing, vendor advisory, internal detection, etc.
- End: time we documented impact scope and priority.

## Minimum metric 2: MTTP — Mean Time To Patch / Protect

**Definition:** the time from the end of analysis to applying a patch or a temporary mitigation.

The key here is not to look only at "formal patch completion." This includes realistic protective actions like **adding blocking rules, restricting exposed services, configuration changes, and temporary workarounds.**

In real defense, waiting for the perfect patch often makes you late. Adaptive governance values **fast-enough protection** over **perfect action**.

## Minimum metric 3: MTRS — Mean Time To Re-Scan / Re-Search

**Definition:** the time from confirming a new pattern to re-searching the full environment under the same conditions and reorganizing the candidate set.

This metric is especially important in the AI era because **iterative re-search is exactly where automation and AI apply most powerfully.**

Operational questions look like:

- Is the same library used by other services?
- Does the same vulnerable pattern recur in other codebases?
- Does the same misconfiguration exist in other accounts or clusters?

## Speed alone is not enough: verifiability and learning incorporation

Is speed alone sufficient? No. Wrong automation creates new risk. So adaptive-capability evaluation has to include **verification procedure** alongside speed.

For example:

- Are automated classifications sample-reviewed by a human?
- Do re-search results flow into tickets, exceptions, or follow-up controls?
- Is there a procedure that converts temporary measures into permanent ones?

If the response to a new risk does not flow into the next control, the organization relearns from scratch every time. So adaptive-capability evaluation must also look at **whether learning is incorporated** — not just one-shot response.

## Example: a simple field scorecard

| Item | Question | Example result |
|---|---|---|
| MTTA | When did we understand the new risk? | 8 hours |
| MTTP | When did we apply a temporary mitigation or patch? | 24 hours |
| MTRS | When did we re-search across similar assets? | 6 hours |
| Verification | Who reviewed the automated results? | Responsible engineer + team lead |
| Learning incorporation | What was folded into the next control? | Detection rules, review checklist |

The point is not pretty numbers. The point is to surface **how the organization actually moved when it met a new risk.**

## A minimum execution template for CISOs

![CISO execution template](/images/post/governance-series-03-ciso-workflow.svg)

Even if policy and market do not move immediately, the field can start small. Below is the simplest flow a CISO or security lead can use internally.

1. **Define triggers**: decide which kinds of risk signals start measurement.
2. **Assign analysis owners**: explicitly own the end of MTTA.
3. **Pre-define temporary-response options**: which of blocking, restriction, isolation, or workaround to use.
4. **Define the re-search procedure**: when a new pattern is confirmed, set the automation scope for how far to re-look.
5. **Verification and learning incorporation**: who verifies automation outputs and what goes into the next control.

Even these five steps give the organization the language of "this is how we responded to a new risk," rather than "we bought security tools."

## Why do these metrics matter?

These metrics are not just for internal management. Over time they can extend to:

- Policy agencies: basis for shifting evaluation items.
- Audit agencies: basis for judging the rationality of autonomous action.
- Insurers: variables in risk-based pricing.
- Customers: supply-chain security requirements.
- Investors: auxiliary signal of operational risk.

That is, **adaptive-capability metrics are both a language and a market interface.**

## Three alignment conditions to shake the equilibrium

Metrics alone do not change governance. To break the multi-actor equilibrium described in Part 2, **individual and collective incentives need to align in one direction.** Alignment becomes visible when any one of the following conditions starts to operate.

1. **Reduce the individual accountability load of autonomous judgment** — explicitly assigning which actor is responsible for producing the cybersecurity-domain grounds that activate "active-administration indemnity" lets the audit agency accept after-the-fact that "this was a reasonable judgment."
2. **Weaken the indemnity effect of standards compliance** — at incident time, "we followed the standard" should not be enough on its own; audit, courts, and boards should start asking together "did you take reasonable adaptive action at that point in time."
3. **Reward autonomous judgment with bonus points** — if any one of evaluation, contracts, or insurance pricing converts adaptive-capability metrics into cost, autonomous judgment is no longer a personal loss for the CISO.

If none of these three operates, the other two alone cannot shift the equilibrium. But the three do not have to align at once. A chain where one moves first and the others follow is possible. **Metrics are the first link in that chain.**

## Conclusion

Moving from compliance to adaptation needs more than philosophy. It needs numbers and procedures. There is no perfect metric. But to change a structure that rewards the wrong behavior, we must at least be able to state what we are going to measure.

The next post takes one more step. Even if policy agencies do not move first, **can the market drag governance forward?**
