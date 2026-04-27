---
title: "Security Controls Aren't Lacking — They're Inconvenient: Why Security Needs Customer Context"
date: 2026-05-11
draft: false
featured: true
tags: ["Mind", "Adaptive Security", "Risk-Based Authentication", "Customer Context", "MFA", "CAPTCHA", "Fraud", "Security Operations"]
categories: ["Security Research", "Security Operations"]
description: "Security controls already exist. The real problem is that we cannot decide which customer, at which moment, deserves how much friction. As the closing chapter of the CAPTCHA·ATO series, this post is about moving from quantity of controls to context of controls — adaptive security as an operational discipline."
image: "/images/pdf-previews/Adaptive_Friction_Design_p1.webp"
---

> This is part 3 of the Account Defense series.
>
> - Part 1: [The CAPTCHA That Became a Free Automatic Door for Hackers](/en/post/2026-03-30-captcha-bypass-poc-defense-strategy/)
> - Part 2: [Why Account Takeover Never Ends — Dismantling the ATO Supply Chain](/en/post/2026-04-07-dismantling-ato-supply-chain/)
> - Part 3: **Security Controls Aren't Lacking — They're Inconvenient**

{{< pdfembed file="/files/Adaptive_Friction_Design.pdf" lang="en" id="pdfjs-adaptive-friction-design-en" >}}

---

## Where Parts 1 and 2 Left Us

[Part 1](/en/post/2026-03-30-captcha-bypass-poc-defense-strategy/) showed how a CAPTCHA falls in zero seconds, at zero cost. [Part 2](/en/post/2026-04-07-dismantling-ato-supply-chain/) dissected how the ATO supply chain reproduces itself through points, gift cards, and crypto.

Both posts pointed in the same direction.

**Individual controls keep weakening, and attacks don't stop.**

So what's the answer? Build more controls? Apply them harder? The CAPTCHA post's mid-term roadmap landed on a single phrase: **Risk-Based Authentication**. That's where this post begins.

This article is about why risk-based, adaptive authentication isn't a feature you install — it's an operational system. And it's why no security team can do this alone.

---

## 1. Security Controls Aren't Lacking — They're Inconvenient

Back in 2012, when SK Planet was newly spun off and on a strong upswing, the company was building a DMP-based data platform. A DMP (Data Management Platform) consolidates scattered customer data and turns it into segments that marketing and product teams can act on. The grand goal at the time was **Curation** — understand each customer based on vast behavioral data, and deliver the right service to the right person.

Looking back now, that vision mostly survived as targeting ads or audience-segment marketing. But viewed from a security angle, the customer-understanding capability the DMP imagined still matters.

Because security, too, eventually needs per-customer controls.

CAPTCHA, SMS verification, MFA, transaction thresholds, bot detection scripts, account limits — all of these already exist. The problem isn't a shortage of controls.

The real problem is that these controls are **inconvenient**.

Apply the same intensity of control to every customer at every moment, and security goes up — but the experience collapses. Loosen the controls to spare normal users, and attackers exploit the weakest spot, repeatedly.

So the next task in security is not building more controls.

The core question is this:

**When, to whom, at what moment, and at what intensity should we apply a control?**

- Who gets shown a CAPTCHA?
- Who is required to do SMS verification?
- Which transactions trigger a threshold?
- Which customers must do MFA?
- When should bot detection be tightened?

Answering these requires customer behavior data and transaction context.

The security industry calls this **Risk-Based Authentication** or **Adaptive Authentication**. Instead of giving every user the same friction every time, you look at how far the device, location, time, session, or transaction pattern has drifted from the user's baseline — and only then decide whether to add friction or block.

The important point: this is not a new control feature.

It's a different way to *deploy* the controls you already have — CAPTCHA, MFA, SMS, transaction limits, account locks — based on risk context.

Friction itself isn't the enemy. Security friction is sometimes necessary. It pauses the user, raises the attacker's cost, and forces a re-confirmation of a risky action.

The problem appears when you cannot tell which customer needs the friction and which one does not.

---

## 2. Marketing Segments to Sell. Security Segments to Protect.

This is where marketing segments and security segments part ways.

Customer-segment analysis for ad targeting is fundamentally a business function. The business looks for cohorts likely to respond to a specific product or campaign. So it doesn't try to map the entire normal-behavior topography of all customers — it focuses on the target cohort it needs.

Security operates differently.

Security doesn't ask, "who will respond to this product?"

Security asks:

**Is this customer's current behavior different from their normal pattern?**
**Is this transaction natural for this customer?**
**Has this account drifted away from the normal cohort it belongs to?**

To answer these, you need a baseline of normal behavior across the entire customer base — not a campaign-specific target.

In short:

**Marketing divides customers to sell. Security divides customers to protect.**

Both use customer data. Both talk in segments. But the goal and scope are different. Marketing needs cohorts likely to respond. Security needs a per-customer and per-cohort topography of normal behavior.

In DMP/CDP language, a *trait* is a small unit that turns a customer's attribute or behavior into a model input — think "weekend payment ratio," "primary device type," or "average transaction size over the last 30 days."

If marketing combines traits to find purchase-likely cohorts, security must combine behavior traits and risk signals to find cohorts deviating from their own normal.

Here's the practical reality.

Building a security segment by combining customer behavior traits is not security-team-only work. Security defines the risk, but how that risk surfaces in customer data is something the data and operations teams know better. Customer-context security is therefore not a security feature — it is a control architecture co-designed by Security, Fraud/Risk, Operations, and the data platform.

Recent fraud-detection research is moving the same way. Per-transaction anomaly detection alone isn't enough; you need per-customer long-term behavior, session flow, and transaction context.

The goal of a security segment is not to brand certain customers as "risky." It is to understand the normal range for each customer and each cohort, and to deploy a control only at the moment behavior leaves that range.

---

## 3. Security Solutions Are a Starting Point, Not a Finished Answer

Of course, none of this is achievable purely through security solutions.

IAM, CIAM, Bot Management, FDS, and Fraud Detection products can detect new devices, suspicious IPs, abnormal logins, automated traffic, and high-risk transactions, and can enforce MFA, CAPTCHA, or blocking.

So the technical foundation for scoring risk and enforcing controls is largely already there.

But a solution does not automatically understand *your* service's customer context.

Whether a particular point redemption is normal, whether bulk transactions during a campaign are natural, which customer cohort would churn if forced into extra authentication, which false positives would flood the call center — none of this is knowable from the solution's default rules alone.

A security solution can say:

> "This login looks risky."
> "This request is likely a bot."
> "This account behavior differs from history."
> "MFA could be required here."

But the actually important questions come next:

- Should we block?
- Require MFA?
- Show a CAPTCHA only?
- Hand off to the call center?
- Hold the transaction?
- Treat VIPs differently?
- Loosen the bar during a campaign?

These decisions are not solvable from default rules.

A solution can score risk and enforce a control. But interpreting the meaning of that score, deciding the right intensity between customer experience and loss cost, and feeding false-positive outcomes back into policy and models — that is organizational work.

So security solutions are a starting point for customer-context security, not a finished answer.

**A security solution can execute a control, but it does not own the customer context.**

The customer context has to be built jointly by Data, Operations, Fraud/Risk, the call center, and Security.

---

## 4. The Problem Isn't Data — It's a Broken Feedback Loop

The practical problem starts here.

Security teams aren't usually the organization that understands customer data the best. Their permissions on customer data are limited, and the data platform isn't normally operated by Security.

The business and operations teams, on the other hand, know customers and service flows. They use tools like a DMP or DIC (Data Insight Center — an internal analytics console that lets operators query and visualize customer data to surface anomalies) to spot anomalies and run response actions.

But that doesn't automatically mean the response is *security-grade*.

Operations may be the first to spot an anomaly. Translating that anomaly into a security control, however, requires different capabilities:

- Risk modeling
- A normal-behavior baseline
- Blocking criteria
- False-positive management
- Customer-friction tradeoffs
- Authority to act
- And a feedback loop that pushes results back into the rules and models

So this isn't simply "operations lacks security expertise."

More precisely, it's that **the field's anomaly-detection capability and the security control system are not connected as a single closed loop.**

Operations sees the anomaly.
Security defines the risk.
The data platform shapes the context.
The business understands customer experience.

If those four don't connect, security ends up retreating to flat rules, fixed thresholds, blanket MFA, and blanket blocking.

Customer-context security is not just a detection-model problem. It must weigh the loss from not blocking, the customer pain from blocking, the call-center cost of handling complaints, and the churn risk from false positives — all together.

A good detection isn't one that catches the most risk.

A good detection is one that intervenes only when needed and pushes the result back into the rules and models.

Without that feedback, controls don't get more precise. They just multiply, customer pain grows, and operators burn out on exception handling.

---

## 5. Customer-Data-Based Security Is Not a Security-Team-Only Project

Customer-data-based, personalized security is a worthy direction. Understanding each customer's normal pattern and applying friction only at risky moments is, eventually, where we need to go.

But it's not something the security team can do alone.

Security can define risk scenarios — account takeover, point misuse, abnormal top-ups, gift abuse, voice-phishing suspicion — and model them.

But how to slice customer behavior data, what features to build, which clusters count as normal — those require people who know data and the service context.

- **Business / Operations** knows the customer context.
- **The data platform team** can shape and operate the data.
- **Fraud / Risk** knows the actual patterns of misuse and customer harm.
- **Security** can design risk scenarios and control criteria.

These roles must be wired together.

So what's needed isn't a new algorithm. It's a redefinition of R&R among Security, Fraud/Risk, Business, Operations, and the Data Platform.

- Who finds the anomaly?
- Who declares it a risk?
- Who defines the customer cohort?
- Who decides the control intensity?
- Who absorbs the customer friction?
- Who feeds the result back into rules and models?

Without answers to these, customer-data security stays a slogan.

A risk score is not a policy.
A model output is not a decision.
A data analysis is not a control action.

Finding a risk signal in data, and connecting that signal to a control without breaking customer experience, are two different capabilities.

That is why customer-context security is both an engineering project and an operational design problem.

---

## 6. Basic Controls Come First

Customer-data-based personalized security is not always the immediate top priority.

In reality, basic controls often need to come before advanced AI clustering — things like FDS rule maintenance, transaction frequency limits, deploying CAPTCHA/MFA criteria, log standardization, JIRA-based response process, and call-center VOC linkage.

Personalized security operates *on top of* this foundation.

Without basic controls, personalization adds complexity instead of precision. Without data-based context, advanced rollouts make criteria fuzzier, raise false positives and customer pain, and inflate operational load.

So the realistic order is this:

**Personalized security is the goal, but basic controls come first. And even basic controls, eventually, must be sharpened on top of data-based context.**

Trying to model every customer's behavior, real-time-score every transaction, and personalize every control from day one is a setup for failure.

What needs to happen first is simple:

- Define which actions count as risky.
- Standardize which logs are needed.
- Establish criteria for when CAPTCHA, MFA, SMS, or transaction limits apply.
- Define how the call center and operations recover from a false positive.
- And make the result visible back to the security and data teams.

Without that foundation, advanced layers don't accumulate.

---

## 7. Customer Context Is Not a Silver Bullet Either

Customer-context security isn't a cure-all.

Device fingerprints, location, behavior patterns — all can be imitated or bypassed. Attackers swap devices, hijack sessions, and mimic behavior to look normal. Part 1's CAPTCHA bypass PoC already showed how a single signal eventually gets imitated.

The more data accumulates, the larger the privacy and fairness questions become. The drive to "understand the customer better" can quietly slide into "track more, retain longer, profile wider."

So customer context must be treated as one of several signals, not a sole basis for judgment.

And the data has to be designed end-to-end: why it's needed, who can access it, how long it's retained.

Customer-context security is not the claim that "we should collect more customer data."

If anything, it's the opposite.

**It's the claim that we should design data to be used only for the right purpose, only for the necessary period, only by the necessary teams, and only for the necessary controls.**

Otherwise, security becomes another surveillance system in the name of protecting customers.

---

## Conclusion — Where the Series Lands

The curation that the DMP imagined back in 2012 wasn't only about ad targeting.

The capability to understand a customer, to interpret their state and behavior context, and to intervene at the right moment — that capability matters in security, too.

What security needs, however, is not a campaign target. It's a baseline of normal behavior across the entire customer base.

The controls already exist.
But the controls are inconvenient.

And that customer context doesn't appear automatically when you buy a security solution.

So the maturity of security is not measured by how many controls you have, but by how well you can apply them in the right customer context, at the right time.

Customer-context security is not "always apply stronger controls."

It's the ability to deploy *precise* friction only when needed.

In its most compressed form:

**Security controls aren't lacking — they're inconvenient.
That's why security needs customer context.
And mature security is not more controls, but more precise friction by design.**

Said more strongly:

**A security solution can execute a control.
But which customer, at which moment, deserves how much friction — only the organization can decide.
Customer-context security is not a product. It is an operating system.**

And finally:

**Security that doesn't know its customers cannot become personal.
Data that doesn't know its security purpose rarely turns into protection.**

---

## Further Reading

- Stephan Wiefling et al., **"Pump Up Password Security! Evaluating and Enhancing Risk-Based Authentication on a Real-World Large-Scale Online Service"**
  → The most direct empirical study of how RBA actually performs on a real, large-scale online service. **The strongest backing for Section 1's claim that you redeploy existing controls by risk context rather than building new ones.**

- Stephan Wiefling et al., **"More Than Just Good Passwords? A Study on Usability and Security Perceptions of Risk-based Authentication"**
  → A usability and perception study of how users actually experience RBA's added prompts. **Shows what the Section 1 split between "customers who need friction" and those who don't looks like from the user side.**

- Philipp Markert et al., **"As soon as it's a risk, I want to require MFA: How Administrators Configure Risk-based Authentication"**
  → Interviews and field observation of how administrators actually configure RBA — what triggers MFA in real deployments. **Field data for the Section 5 question: who decides the control intensity?**

- Verena Distler et al., **"The Framework of Security-Enhancing Friction"**
  → A framework that treats friction not as pure cost but as a security mechanism in its own right. **The academic root of this post's core claim: mature security designs more precise friction, not more friction.**

- Phoebe Jing et al., **"A Customer Level Fraudulent Activity Detection Benchmark for Enhancing Machine Learning Model Research and Evaluation"**
  → A benchmark and dataset that evaluates fraud at the customer level instead of per-transaction. **Concrete grounding for Section 2's claim that long-term per-customer behavior is what security needs.**

- Paolo Vanini et al., **"Online payment fraud: from anomaly detection to risk management"**
  → A synthesis of how anomaly detection has to connect into risk management. **Supports Section 4's argument that detection must close the loop into control and recovery — not stop at scoring.**

- Xu Lin et al., **"Phish in Sheep's Clothing: Exploring the Authentication Pitfalls of Browser Fingerprinting"**
  → Analyzes how browser fingerprinting can be imitated and bypassed. **Direct evidence for the Section 7 guardrail: no single signal stays unique under a determined attacker.**
