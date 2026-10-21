---
title: "Before Blaming AI False Positives: The Security Debt of Generalist-Led Organizations"
date: 2026-10-21
draft: false
featured: true
tags: ["TrustAndCulture", "AI Security", "Security Governance", "Organizational Debt", "Vulnerability Detection", "Technical Leadership", "NoHackingNoSecurity", "FollowTheMoney", "FollowThePower"]
categories: ["Security Governance", "AI Security"]
description: "A Korean financial-sector AI code-analysis test reported 40–60% false positives. The deeper question is how technical expertise, validation workflows, budgets, and decision rights shape actual security outcomes."
---

A report of 40–60% false positives in AI-based source-code security analysis prompted me to ask a question before judging the model: **What was the AI allowed to see, what was it asked to verify, and who in the organization had the expertise and authority to act on the result?** Detecting a potential weakness and changing an organization's decisions because of that weakness are two different capabilities.

On October 19, 2026, [Maeil Business Newspaper](https://www.mk.co.kr/news/economy/12179757) reported findings from the Financial Security Institute (FSI), obtained by National Assembly member Kim Hyeong-yeon. Ten financial institutions participating in a temporary network-segmentation regulatory exemption had tested AI-assisted source-code security analysis. The reported false-positive rate was 40–60%. In some cases, the AI treated an internally fixed value as if an external attacker could modify it. In others, it overlooked authentication or input-validation logic implemented elsewhere in the application.

It would be premature to infer that AI is unfit for security work. It would be equally premature to assume that the next model release will solve the problem. I see this as an opportunity to examine something more enduring: **an organization's ability to make sound technical judgments about risk.**

## What the 40–60% figure does not tell us

The published account does not identify the models or versions used, how much repository context they received, whether they could navigate code or invoke static-analysis tools, how findings were adjudicated, or what the false-negative results were. Even the metric needs clarification. *False-positive rate* conventionally means FP/(FP+TN), while practitioners sometimes use the same term for the proportion of alerts that turn out to be false, FP/(TP+FP). Without the evaluation protocol and ground-truth dataset, the reported percentage cannot be compared directly with academic benchmarks.

This limitation matters because the [Financial Services Commission's September 3 update](https://www.fsc.go.kr/no010101/87646) had emphasized the promise of broad and rapid vulnerability discovery using frontier AI. That assessment and the later false-positive report are not necessarily contradictory. Finding suspicious patterns across a large codebase is not the same as establishing whether an attacker can actually exploit them.

To understand an alleged vulnerability, an analyst must trace where an input originates, who controls it, which trust boundary it crosses, which functions can be reached, and which authorization or validation checks apply. But seeing an authentication check somewhere in the repository is not proof that every relevant path is protected. Likewise, a firewall or intrusion-prevention system may mitigate exploitation without removing the underlying source-code flaw. **The existence of a defect, its exploitability, environmental mitigations, and residual risk are distinct judgments.** The [CVSS v4.0 specification](https://www.first.org/cvss/v4-0/specification-document) similarly distinguishes intrinsic vulnerability characteristics from environmental risk considerations.

The point of security analysis is not merely to generate a large number of alerts. It is to connect findings to what an attacker can actually do.

## A model limitation—or a limitation of the analysis system?

Recent research helps explain why this distinction is important. [VulAgent](https://aclanthology.org/2026.findings-acl.928/), published in ACL Findings 2026, begins with security-sensitive operations, formulates vulnerability hypotheses and candidate trigger paths, and validates them against project context. On its evaluated benchmarks, it reported an average accuracy gain of 6.6 percentage points and a **36% relative reduction** in false-positive rate compared with recent LLM-based baselines. [LLMxCPG](https://www.usenix.org/conference/usenixsecurity25/presentation/lekssays), presented at USENIX Security 2025, uses code property graphs to provide cross-function dependencies and execution context to language models.

These findings do not establish that the FSI test could have achieved the same improvements. The datasets, models, tools, and evaluation conditions are different; vulnerability discovery in complex production systems remains unsolved. But the research makes one point difficult to ignore: **the quality of LLM-assisted vulnerability detection is not a fixed property of the model alone.** It depends on what code the model can inspect, what program relationships it can trace, and whether it is required to search for evidence that could disprove its first hypothesis.

[Big Sleep](https://projectzero.google/2024/10/from-naptime-to-big-sleep.html), developed by Google Project Zero and Google DeepMind, offers another illustration. Its 2024 discovery of a real SQLite vulnerability came from a research agent equipped with tools and an investigation process, not a single prompt asking a language model to review a snippet. Google also described the work as research-stage, not as a solved problem.

So the first question should not be only, “Which model did they use?” It should also be: **Could the system test whether an attacker controlled the input? Could it trace a reachable path? Could it inspect authentication, guards, and validation implemented elsewhere? Who could assess the evidence and redesign the workflow when those checks were missing?** Without answers, blaming the model—or declaring that the organization misused it—goes beyond what the evidence shows.

## Security debt can accumulate even when experts are on staff

The organizational problem I have been thinking about is not simply a shortage of experts. It is **the separation between technical judgment and the authority to change decisions.**

In large organizations, careers often reward breadth: rotating across functions, coordinating stakeholders, fulfilling instructions, and producing reports that management can readily act on. Those are legitimate management skills. Yet specialists who spend years understanding software behavior, exploitation paths, or security architectures may be treated as people assigned to technical work rather than candidates for decision-making authority. The expert remains in the field; a manager selected for different competencies decides whether the expert's findings will change the plan.

This is a concern shaped by my observations, not a demonstrated description of every Korean corporation. Nor is there evidence that such a structure caused the false positives in this particular financial-sector test.

Generalists are indispensable. Security leaders need to connect technology with strategy, regulation, budgets, and business operations. The problem arises when the ability to coordinate **substitutes for** the ability to evaluate technical evidence. A leader need not reproduce every exploit or review every line of code, but should understand what would constitute sufficient evidence, what uncertainty remains, and when a specialist's findings justify changing course.

This is consistent with the idea of [absorptive capacity](https://doi.org/10.2307/2393553), developed by Wesley Cohen and Daniel Levinthal in 1990: the ability to recognize, assimilate, and apply valuable external knowledge depends heavily on an organization's existing related knowledge. A stronger AI does not automatically create the institutional competence to recognize when its output is wrong.

An especially relevant study is [*Inexpert Supervision: Field Evidence on Boards' Oversight of Cybersecurity*](https://doi.org/10.1287/mnsc.2023.04147), published in *Management Science*, volume 72, issue 2, in 2026. The researchers found that board directors without cybersecurity expertise could sincerely undertake the same oversight activities as experts while providing oversight that was more symbolic than substantive. The study concerns boards, not Korean security-team managers, so it should not be overgeneralized. Still, its central distinction is compelling: **receiving a security report is not the same as being able to judge its adequacy.**

I use the phrase *security debt in generalist-led organizations* for the cumulative cost of failing to develop, retain, reward, and act on technical expertise. This is my analytical framing, not an established diagnostic label. It echoes research on [organizational debt](https://doi.org/10.1371/journal.pone.0308183): outdated structures, policies, and processes can gradually erode an organization's adaptability. Even with talented specialists on the payroll, that debt grows if they lack access to context, time to validate findings, or authority to change an unsafe plan.

## When administration creates more debt than it retires

Organizations can measure whether they purchased a security product, completed an assessment, closed a finding, or achieved a compliance target. Those measures are useful, but they do not automatically establish whether a critical attack path was examined, a defense worked in practice, or residual risk is acceptable. Checklists and certifications are necessary foundations; they become dangerous when **evidence that a control exists replaces evidence that the control works**.

Imagine two responses to a high false-positive rate. One team categorizes the errors, traces missing data and control flow, expands repository context, and changes the validation pipeline. Another introduces mandatory human re-review, a second approver, and a weekly false-positive report. Additional review may be reasonable, but if that is where the response ends, it leaves the underlying cause untouched. Analysts spend more time processing noise and less time testing attack paths or improving the system.

I am not claiming that the financial institutions in the reported test chose the second approach. We do not know how they responded. The example describes a **plausible failure mechanism**: procedures meant to compensate for a weakness can consume the very expertise needed to fix it.

That is what I mean by deskbound security administration. The issue is not paperwork itself. It is a system optimized to demonstrate that appropriate steps were followed rather than to establish that actual risk was reduced. The measures pile up, the risks remain, and the capacity to investigate those risks erodes. Organizational security debt begins to accrue interest.

## Follow the money—and follow the power

Why might such arrangements persist? Not necessarily because individuals lack integrity or effort. Organizations respond to how budgets, rewards, and authority are distributed.

A concrete reminder comes from an [October 11, 2026 report by *The Hankook Ilbo*](https://www.hankookilbo.com/news/article/A2026101108140005411): South Korea's five major banks had allocated KRW 319.9 billion for information security in 2025 but reportedly spent KRW 214.4 billion, about 67%. These figures alone do **not** prove neglect; the reasons for unspent funds would need investigation. They do, however, justify asking whether approved budgets become operating capability. Purchasing another AI product is not equivalent to giving application-security engineers, reviewers, and red teams enough time and access to validate its outputs and improve its workflow.

That is what **#FollowTheMoney** means here: examine how resources move between procurement, operations, specialist development, and technical verification. It is a question about priorities and incentives, not an accusation of corruption.

**#FollowThePower** asks an even more consequential question. When an expert says, “This code fragment is insufficient to determine exploitability,” who can authorize broader access and a redesigned assessment? Who can delay a release to restore a missing validation step? When evidence conflicts with a management commitment, who can change the commitment? **If responsibility for verification remains with specialists while the power to act on their findings lies elsewhere, the distribution of decision rights deserves scrutiny.**

Good governance should make technically grounded risk assessments consequential. It should not turn expertise into a decorative input to an otherwise predetermined process.

## A change in judgment, not merely a change in generation

People who learned security through university hacking clubs and technical communities often developed a particular habit: doubt the explanation, inspect the behavior, form an attack hypothesis, reproduce it, and revise the hypothesis when the evidence contradicts it. That way of knowing is closely related to the validation-oriented approach now appearing in AI vulnerability research.

Yet a background in offensive security does not automatically make someone a good leader. An exploit written twenty years ago is no guarantee of understanding today's cloud, identity, supply-chain, or AI-agent risks. Technically trained leaders can reproduce the same hierarchy and reporting culture once they obtain authority.

The change we need is therefore **not the promotion of a particular age group**. It is the selection of leaders who can evaluate technical evidence, accept uncomfortable findings, and change organizational decisions accordingly. It also means creating a career path in which researchers and engineers can continue deep technical work while earning influence, recognition, and compensation without becoming general managers. Breadth and depth are complements, not enemies.

Nor is this an argument against governance. Security leadership should look beyond the number of alerts closed toward attack paths actually reproduced, mitigating controls actually validated, unknown paths still awaiting investigation, the root causes of false positives and false negatives, and the design or release decisions changed because of technical evidence. Leaders should be accountable not only for what was approved, but for the risks they chose to defer.

## Remember why security exists

Information security exists because attacks and threats are possible. We write checklists, buy tools, and analyze code **to understand what an attacker can do and reduce that possibility**. When the organization stops asking the attacker's question, security can quietly become the administration of security rather than security itself.

There is no public evidence that generalist-led management caused the reported 40–60% false positives. But the next response belongs to the organizations receiving those results. They can treat the number as proof of a model's limitations and add more layers of review; or they can investigate missing context, rethink the analysis system, and give technical evidence the authority to change decisions. AI may not have created the debt. It may simply have made an older debt more visible.

**Before asking how intelligent the AI is, ask what we allowed it to see, what we asked it to prove, and who had the competence and authority to act on what it found.** That is the question I believe cybersecurity leadership must answer.

#NoHackingNoSecurity #FollowTheMoney #FollowThePower

---

### References

- [Maeil Business Newspaper, report on FSI AI source-code false positives (October 19, 2026, Korean)](https://www.mk.co.kr/news/economy/12179757)
- [Financial Services Commission, security use of frontier AI and interim testing update (September 3, 2026, Korean)](https://www.fsc.go.kr/no010101/87646)
- [Wang et al., VulAgent, ACL Findings (2026)](https://aclanthology.org/2026.findings-acl.928/)
- [Lekssays et al., LLMxCPG, USENIX Security (2025)](https://www.usenix.org/conference/usenixsecurity25/presentation/lekssays)
- [Google Project Zero, Big Sleep (2024)](https://projectzero.google/2024/10/from-naptime-to-big-sleep.html)
- [Cohen and Levinthal, Absorptive Capacity (1990)](https://doi.org/10.2307/2393553)
- [Lowry, Vance and Vance, Inexpert Supervision, Management Science 72(2) (2026)](https://doi.org/10.1287/mnsc.2023.04147)
- [Al-Baik et al., Organizational Debt, PLOS ONE (2024)](https://doi.org/10.1371/journal.pone.0308183)
- [The Hankook Ilbo, spending against security budgets at five Korean banks (October 11, 2026, Korean)](https://www.hankookilbo.com/news/article/A2026101108140005411)
- [FIRST, CVSS v4.0 Specification](https://www.first.org/cvss/v4-0/specification-document)

*The organizational and leadership arguments in this article are the author's interpretation. Without access to the FSI test protocol and underlying evaluation records, the cause of the reported false positives cannot be established.*
