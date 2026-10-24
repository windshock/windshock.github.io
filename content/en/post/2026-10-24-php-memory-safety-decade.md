---
title: "A Decade of PHP Memory-Safety Bugs: Why Do the Same Failures Keep Returning?"
date: 2026-10-24
draft: false
featured: true
translationKey: "php-memory-safety-decade"
tags: ["Mind", "PHP", "Memory Safety", "PHP2Shell", "Vulnerability Research"]
categories: ["Vulnerability Research", "Software Security"]
description: "A technical retrospective on a decade of PHP memory-safety research, crediting original discoverers and maintainers while examining failure atomicity, re-entrancy, bailout recovery, and cross-request ownership."
image: "/images/post/php-memory-safety-decade/research-timeline-acknowledgments-en.svg"
cover:
  image: "/images/post/php-memory-safety-decade/research-timeline-acknowledgments-en.svg"
  alt: "English timeline of PHP memory-safety research 2016–2026, original researchers, contributors, and acknowledgments"
---

Looking back over a decade of publicly documented PHP memory-safety bugs, I keep returning to the same question: **When user code re-enters the engine, an allocation fails, or a request ends, can PHP still maintain the invariants of the state it owns?** This essay is a technical retrospective on that question—and an acknowledgment of the researchers and PHP maintainers whose work made it possible to ask it.

I did not discover the historical vulnerabilities discussed here. My aim is to connect the original reports, patches, research papers, and developer discussions, and to distinguish those contributions from the limited independent observations and still-open hypotheses in my [php2shell research repository](https://github.com/windshock/php2shell). Sources were reviewed as of **October 24, 2026**.

## Where the questions started: serialization and garbage collection

In 2016, [Taoguang Chen's PHP bug #72530](https://bugs.php.net/bug.php?id=72530) demonstrated how destructors and cyclic references could disrupt assumptions about object lifetime. Its lasting value is not merely the triggering input. A destructor can execute user code while the collector is already restructuring references. Once that happens, a data structure the engine expected to remain stable may have changed under its feet.

[Yannay Livneh and Check Point's PHP 7 vulnerability research](https://blog.checkpoint.com/research/check-point-discovers-three-zero-day-vulnerabilities-web-programming-language-php-7/) likewise examined the relationships among unserialization, references, and internal data structures. Their original findings, historical reproductions, and fixes provide essential groundwork for testing how the engine manages ownership under re-entrancy.

A different lesson emerged from [Emil Lerner's discovery of CVE-2019-11043](https://github.com/neex/phuip-fpizdam) and [Orange Tsai's subsequent technical analysis](https://blog.orange.tw/posts/2019-10-an-analysis-and-thought-about-recently/): an engine-level memory error may become a remotely reachable vulnerability under particular web-server and PHP-FPM configurations. The qualifying conditions matter. Not every PHP-FPM deployment shares the relevant nginx/PATH_INFO configuration.

## Four recurring classes of broken invariants

These incidents are not all the same bug. Yet they suggest four related questions that can be tested rather than assumed.

| Failure class | Invariant to test | Public examples |
| --- | --- | --- |
| **Failure atomicity** | Is a visible object or container complete even when an allocation fails? | [#76846](https://bugs.php.net/bug.php?id=76846), [#12073](https://github.com/php/php-src/issues/12073) |
| **Re-entrancy safety** | Can callbacks, destructors, or error handlers revisit a data structure safely? | [#72530](https://bugs.php.net/bug.php?id=72530), [#16726](https://github.com/php/php-src/issues/16726), [#20018](https://github.com/php/php-src/issues/20018) |
| **Recovery after bailout** | If a caller catches an exceptional engine exit, does it restore GC and other invariants before continuing? | [#79760](https://bugs.php.net/bug.php?id=79760), [#10026](https://github.com/php/php-src/issues/10026), [#24361](https://github.com/php/php-src/issues/24361) |
| **Cross-request ownership** | Can a persistent worker still reference memory released with an earlier request? | [#76167](https://bugs.php.net/bug.php?id=76167), [CVE-2026-109619](https://github.com/php/php-src/security/advisories/GHSA-6wmf-4rv5-p3rp) |

The first class concerns publishing partially constructed state. [Bug #76846](https://bugs.php.net/bug.php?id=76846) involved allocation failure and an object-store size inconsistency; [#12073](https://github.com/php/php-src/issues/12073) concerned an incompletely initialized closure becoming visible to later cleanup. Their concrete failure paths differ, but both ask whether teardown might mistake an unfinished object for a valid one.

The second and third classes reach into engine semantics. [Nikita Popov's delayed error-handler prototype, PR #6903](https://github.com/php/php-src/pull/6903), and the later [umbrella issue #20018](https://github.com/php/php-src/issues/20018) frame error-handler re-entrancy as a design problem, not merely a list of isolated crash signatures. The [SOAP GC issue #10026](https://github.com/php/php-src/issues/10026) and [Opcache issue #24361](https://github.com/php/php-src/issues/24361) illustrate why catching a bailout and returning to user code does not necessarily restore the engine's prior invariants.

Cross-request ownership is distinct again. [The older mbstring lifetime issue #76167](https://bugs.php.net/bug.php?id=76167) and [the official 2026 PHP2Shell advisory](https://github.com/php/php-src/security/advisories/GHSA-6wmf-4rv5-p3rp) concern different defects. Both demonstrate why tracing a pointer's lifetime within a single request can be insufficient when its surrounding process survives subsequent requests.

**This taxonomy does not imply that there are only four types of memory bugs, or that a single global guard would repair all of them.** It is a way to formulate falsifiable questions across distinct historical cases.

## The tradeoffs PHP maintainers had to confront

It would be misleading to conclude that recurring failures mean the PHP developers simply ignored known problems. Moving error handlers to safer points affects execution semantics, JIT behavior, extensions, and backwards compatibility. Unconditionally clearing GC protection after a fatal out-of-memory state might itself be unsafe.

The discussion around [#10026](https://github.com/php/php-src/issues/10026) and [the follow-up SOAP PR #24366](https://github.com/php/php-src/pull/24366) makes that tension visible. Instead of forcing a global reset, the proposed direction is to avoid certain unnecessary bailouts and return through a more controlled error path. As of the review date, **PR #24366 remained open and unmerged**.

The [PHP Foundation's report on the Quarkslab audit](https://thephp.foundation/blog/2025/04/10/php-core-security-audit-results/) and its [October 2026 security response retrospective](https://thephp.foundation/blog/2026/10/21/todays-php-security-release-and-how-were-strengthening-php-security/) also highlight how technical remediation intersects with compatibility, extension ecosystems, availability, and decision-making. An audit finding, a warning signal identified during remediation, and a later CVE should not automatically be counted as the same discovery.

## Research methods have evolved, too

Reduced test cases and careful debugging remain indispensable. But [Quarkslab's 2024 core audit](https://thephp.foundation/blog/2025/04/10/php-core-security-audit-results/) combined static and dynamic examination with fuzzing, while [FlowFusion, from the National University of Singapore](https://www.usenix.org/conference/usenixsecurity25/presentation/jiang-yuancheng), used dataflow-guided combinations of PHP tests to synthesize more complex programs. Its authors reported discovering 158 previously unknown PHP interpreter bugs. That is the paper's reported outcome, not an independently replicated number from my lab.

No single observer covers every case. The original account of [EXIF bug #78793](https://bugs.php.net/bug.php?id=78793) points to MemorySanitizer; [cross-request issue #76167](https://bugs.php.net/bug.php?id=76167) called for GDB watchpoint evidence. A lingering GC-protected state in SOAP or Opcache can be visible through PHP-level invariants before any sanitizer detects an invalid access. **The absence of an AddressSanitizer report alone cannot establish that a defect is absent or a patch works.**

The distinction between *reached*, *triggered*, *detected*, and *patch verified* therefore matters. The [Magma ground-truth fuzzing benchmark](https://doi.org/10.1145/3428334) offers a useful methodological analogy: counting crashes is not the same as measuring how reliably a fuzzer exercises genuine bugs.

## What php2shell does—and what it has not shown

My [windshock/php2shell repository](https://github.com/windshock/php2shell) records a controlled lab investigation of the official PHP patch, request-to-request state transitions, and sanitizer/GDB observations. It has since grown to include historical test cases, input generation, execution-integrity checks, and an experimental core-hardening effort called CoreGuard.

Yet implementing a guard does not establish that it prevents memory corruption. The [CoreGuard evaluation report](https://github.com/windshock/php2shell/blob/main/docs/coreguard/evaluation-report.md) records **zero cases of preventing invalid access while preserving a valid request** across its three designated hold-out cases. Some scenarios were detected or terminated before a later harmful operation, but termination is not the same as preserving safe execution. The report also describes limitations in hold-out independence, PHP-FPM worker recovery verification, and broader compatibility.

I am not claiming to have built a superior general-purpose PHP fuzzer, independently rediscovered every historical vulnerability, or found a new undisclosed RCE. The narrower—and more useful—goal is to ask whether historical root-cause patterns, lifecycle observations, and explicit failure oracles can make it easier to distinguish and eventually prevent classes of PHP engine failures.

That remains an open research question. Answering it responsibly requires separating other researchers' original discoveries from my interpretation, and verified observations from hypotheses that have not yet survived independent testing.

## Research Credits & Acknowledgments

This retrospective would not exist without a decade of public vulnerability reports, reproductions, root-cause analyses, patch discussions, and difficult maintenance work. **Original discovery, follow-up analysis, core remediation, security auditing, and coordination are distinct contributions** and deserve accurate credit.

**Early vulnerability research and analysis.** I thank [Taoguang Chen](https://bugs.php.net/bug.php?id=72530), [Yannay Livneh and the Check Point researchers](https://blog.checkpoint.com/research/check-point-discovers-three-zero-day-vulnerabilities-web-programming-language-php-7/), and [Chris Young](https://bugs.php.net/bug.php?id=74103) for public work on PHP serialization, GC, and re-entrancy. [Emil Lerner (neex)](https://github.com/neex/phuip-fpizdam) deserves credit for the PHP-FPM vulnerability discovery, [Orange Tsai](https://blog.orange.tw/posts/2019-10-an-analysis-and-thought-about-recently/) for a separate technical analysis, and [Charles Fol (cfreal)](https://blackalps.ch/ba-22/talk/generic-remote-exploit-techniques-for-the-php-allocator-and-0days) for his research into PHP's memory allocator.

**Core development, repair, and review.** I am grateful to [Nikita Popov](https://github.com/php/php-src/pull/6903) and the many PHP core developers who have examined memory lifetime, GC, and error-handling problems while publishing the limitations of proposed remedies. The [PHP Foundation's 2024 audit acknowledgment](https://thephp.foundation/blog/2025/04/10/php-core-security-audit-results/) names **Arnaud Le Blanc, Ilija Tovilo, Jakub Zelenka, and Niels Dossche** among contributors and maintainers. This does **not** attribute authorship of a single October 2026 patch to each of them.

**Auditing and fuzzing research.** I thank the five authors of the [Quarkslab PHP-SRC audit](https://blog.quarkslab.com/security-audit-of-php-src.html): **Angèle Bossuat, Julio Loayza Meneses, Mihail Kirov, Sébastien Rolland, and Ramtine Tofighi Shirazi**. Credit also belongs to all seven authors of the [FlowFusion paper](https://www.usenix.org/conference/usenixsecurity25/presentation/jiang-yuancheng): **Yuancheng Jiang, Chuqi Zhang, Bonan Ruan, Jiahao Liu, Manuel Rigger, Roland H. C. Yap, and Zhenkai Liang**.

**The 2026 PHP2Shell disclosures.** The [PHP Foundation's official acknowledgment](https://thephp.foundation/blog/2026/10/21/todays-php-security-release-and-how-were-strengthening-php-security/) explicitly thanks **Ryan A (Calif)** and **Amy Burnett (OpenAI Codex Security)**, alongside Calif, OpenAI, and Wiz for their research, responsible disclosure, and coordination. The four named authors of [Wiz Research's PHP2Shell analysis](https://www.wiz.io/blog/php2shell-php-rce) are **Sagi Tzadik, Shir Tamari, Nir Ohfeld, and Tomer Schwartz**. The teams' initial reports, independent findings, exploitability analysis, and patch validation should not be collapsed into a single discovery credit.

Finally, my thanks go to the **PHP Foundation, OSTIF, Sovereign Tech Agency, PHP security team, release managers, distribution and LTS package maintainers, volunteers, and sponsors** who enabled the work. This is a **selected, non-exhaustive acknowledgment**, not an endorsement of this blog or [php2shell](https://github.com/windshock/php2shell) by the contributors named. Corrections to names, roles, or sourcing are welcome.

---

A more detailed provenance map, reproduction prerequisites, developer discussions, and source bibliography appear in the companion [PHP Memory-Safety Research Notes (2016–2026)](/en/post/2026-10-24-php-memory-safety-research-notes/). An issue being **Open** is not evidence that the latest release remains exploitable. The experiment code and its limitations are documented in [php2shell on GitHub](https://github.com/windshock/php2shell).
