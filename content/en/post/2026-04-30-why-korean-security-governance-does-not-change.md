---
title: "Why Korean Security Governance Does Not Change"
date: 2026-04-30
draft: false
description: "A game-theoretic analysis of why Korean security governance stays stuck when NIS, KISA, the Board of Audit, the security industry, CISOs, and policy agencies are each acting rationally."
tags: ["AI", "Security", "Governance", "Game Theory", "Policy", "Cybersecurity"]
categories: ["Security", "Policy"]
summary: "Korean security governance does not change not because of simple incompetence but because of a multi-actor equilibrium. No one publicly opposes change, yet no one moves first."
---

![Multi-actor equilibrium and change paths](/images/post/governance-series-01-overview.svg)

> This is Part 2 of the AI-era Korean security governance series. Part 1 addressed the problem that evaluation rewards the wrong behavior. This part looks, from a game-theoretic perspective, at why that evaluation system does not change easily.
>
> - Part 1: [Korean security governance is accelerating in the wrong direction in the AI era](/en/post/2026-04-26-ai-security-governance-korea/)
> - Part 2: **Why Korean security governance does not change**
> - Part 3: [How do we measure adaptive capability?](/en/post/2026-05-04-adaptive-security-metrics-and-ciso-template/)
> - Part 4: [Can the market move governance?](/en/post/2026-05-07-market-can-move-security-governance/)
> - Part 5: [The Real Battleground of National AI Strategy Is Not Just GPU Count](/en/post/2026-05-24-ai-national-strategy-control-plane/)

## The problem is not incompetence — it is equilibrium

In Part 1, I argued that Korean security governance is accelerating in the wrong direction in the AI era. That leaves a follow-up question.

> Why does this structure not change?

The easy answer involves words like incompetence, inertia, and bureaucracy. But that answer is not accurate. The more accurate answer is this.

> **Because each actor behaves rationally from their own position, the overall structure stays still.**

That is, the problem is structure more than malice, and equilibrium more than mistake.

## Cast of characters: who has what incentive

Reduced, this structure has six actors.

- **Intelligence agency**: holds threat intelligence and security framing as resources.
- **Certification operators and policy agencies**: prioritize the stability of the evaluation regime and institutional continuity.
- **Audit agencies**: prefer after-the-fact judgability and clarity of standards.
- **Security industry**: evaluation complexity and new items are markets.
- **Front-line CISO**: standards compliance functions as personal indemnity.
- **Political actors**: feel the need for change but bear both information asymmetry and accountability load.

These actors use different languages publicly, but their actual utility structures are surprisingly consistent. **None has strong incentive to move first.**

This equilibrium is not static. If one actor tries to take a territory at once, conflict explodes; but if it moves one step at a time via "let's coordinate," "joint guidance," "joint hosting," other actors avoid the decisive-rejection cost each time. So in Korean security governance, territorial restructuring almost always happens by gradual encroachment, and at the macro level you end up with an outcome where no one lost but no one looks like they won either.

## Thought experiment: three short scenes

The scenes below are not actual quotes from specific individuals. They are **synthetic scenarios** built from publicly observable institutional incentives. The goal is not gossip; it is structure.

### Scene 1: Certification body and security industry

The certification body has to operate the evaluation regime stably. The security consulting and audit market draws demand from the regime's complexity. Publicly the two sit in different positions — public-interest and market — but in practice they share interests.

- If evaluation gets simpler, both lose.
- If more items get added, both gain.
- Bolting new checklists onto the existing frame is far safer than shifting paradigms.

Why does this matter? Because it explains **why AI-era change is likely to be absorbed as "add AI items" rather than "evaluate adaptive capability."**

### Scene 2: Policy agency and audit agency

The policy agency says: hard to change unless the Board of Audit accepts autonomous judgment. The audit agency says: we can accept it if a basis is supplied, but supplying that basis is not our job.

Both sides are partially right. And precisely because both are partially right, the structure freezes.

- Policy agency: moving first carries political cost.
- Audit agency: cannot accept without a standard.
- Result: **a no-first-mover equilibrium**.

One clarification. The Board of Audit already has an "active-administration indemnity" system. The criteria are public benefit, proactive handling, and absence of intent or gross negligence; and a pre-audit consultation (asking for an audit view in advance on an uncertain administrative action) can establish presumed indemnity if you proceed as advised. So it is not that the indemnity system is missing. What is missing in cybersecurity is the *grounds* — laws, professional standards, ministry guidance — that the Board could cite to accept "this was a reasonable judgment," and the *responsibility for producing those grounds* keeps getting punted to other actors. To prescribe precisely, we should say not "we need an indemnity system" but "the distribution of responsibility for producing the grounds that make indemnity operational is empty."

### Scene 3: CISO and the field

Front-line CISOs know it internally: certification does not fully explain defense against real attacks. Even so, standards compliance is hard to drop.

The reason is simple.

- If there is no incident, standards compliance alone passes evaluation.
- If there is an incident, "we followed the standard" is still a strong defense.
- Conversely, autonomous judgment can produce better security, but on failure the accountability concentrates on the individual.

So for the individual CISO, standards compliance is rational. But when every CISO makes the same choice, the system as a whole loses adaptability.

## What does game theory show?

### 1. No-first-mover equilibrium

This structure is a textbook **no-first-mover equilibrium**. No one opposes change in principle, but no one wants to take the first risk.

- The audit agency wants the standard to come first.
- The policy agency wants social consensus to come first.
- The field wants indemnity machinery to come first.
- The industry prefers the existing frame until a new market is visible.

So everyone speaks of the need for change, but the starting point keeps getting pushed elsewhere.

### 2. Symbiotic alliance

Between certification operations and the security industry there is a **complexity symbiosis**. As evaluation grows more complex, training, consulting, audit, and tooling demand grow. In this structure, "a new management item" is far easier to adopt than "a simple adaptive metric."

### 3. Individual rationality, collective irrationality

This resembles the prisoner's dilemma. For an individual CISO, standards compliance is close to a dominant strategy. But when every CISO behaves that way, the collective grows slower and duller.

### 4. Information asymmetry

Political actors appear to have the power to change the structure, but in practice they depend on existing agencies for threat intelligence and operational judgment. This asymmetry strengthens "control preservation" framing over "flexibility."

## So why is change hard?

Change is hard not because anyone is maliciously blocking it. It is hard because five forces operate at the same time.

1. **Accountability avoidance**: the first mover is the most exposed.
2. **Benefit of complexity**: someone makes a living from evaluation being complex.
3. **Indemnity logic**: "we followed the standard" remains the strongest shield.
4. **Information asymmetry**: whoever owns threat framing leads the discussion.
5. **Gradual absorption**: new problems get reduced to new checklists rather than a paradigm shift.

## Where does the force to break this equilibrium come from?

Good proposals alone are not enough. This structure moves on **incentives**, not on **oughts**. The forces that shake it usually come from three places.

- **Language**: a frame that explains what the problem is.
- **Metrics**: data that measures adaptive capability.
- **Market**: external actors — insurers, customers, supply chains, investors — that price the cost.

In other words, change usually comes **from the outside in**, rather than from above down.

One trap to flag, however. The presence of change momentum does not guarantee it goes where we want. Emerging actors — agencies newly empowered or expanding territory — have strong motive to reshape governance, but what they typically push is **adding new guardrails**, not **shifting how guardrails work**. The result is more complex governance without more adaptive capability. The real dilemma facing change agents is not absence of momentum but momentum pointed in the wrong direction.

## Five forces act simultaneously

The three sources above — language, metrics, market — none alone breaks the equilibrium. The five forces from earlier hang together, and if even one survives, the equilibrium snaps back. So when, absent an external shock, governance tilts toward self-preservation, that is not failure — it is equilibrium. Change does not come from good policy proposals alone. External conditions that shake all five simultaneously — a major incident, an international evaluation, a market-priced cost — have to appear before the equilibrium moves.

## In one line

> No one publicly opposes change. But no one moves first.

That is why the next post in this series asks: "If that is the case, what do we measure adaptive capability with?" Stating the problem does not move the equilibrium. **A measurable language** does.
