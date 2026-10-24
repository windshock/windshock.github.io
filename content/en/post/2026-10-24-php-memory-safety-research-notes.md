---
title: "PHP Memory-Safety Research Notes (2016–2026): Discoverers, Root Causes, Fixes and Evidence"
date: 2026-10-24
draft: false
featured: false
translationKey: "php-memory-safety-research-notes"
tags: ["PHP", "Memory Safety", "PHP2Shell", "Research Notes", "Vulnerability Research"]
categories: ["Vulnerability Research", "Research Notes"]
description: "A source-based provenance map of PHP memory-safety findings from 2016 to 2026, crediting original researchers and maintainers while separating issue status, reproducibility, exploitability, and patch verification."
---

These notes document sources and evidence behind [A Decade of PHP Memory-Safety Bugs](/en/post/2026-10-24-php-memory-safety-decade/). Their purpose is to **credit prior work accurately, connect discoveries to root-cause families and fixes, and avoid conflating a report with confirmed impact or verified patch effectiveness**. The source-review cutoff is **October 24, 2026**; live issue and pull-request states may have changed.

The underlying research surveyed original security write-ups, PHP's public bug database and GitHub issues, security advisories, PHP Foundation reports, core developer discussions, and the FlowFusion paper. A selected set of 58 historical records is maintained in [windshock/php2shell's corpus work](https://github.com/windshock/php2shell/blob/main/docs/historical-corpus.md). **Fifty-eight records do not mean 58 independently verified, still-vulnerable bugs**, and the examples below are not a statistically representative sample of all PHP vulnerabilities.

## Evidence vocabulary

| Level | What it establishes | Required provenance |
|---|---|---|
| Reported | A researcher filed a report or published a technical account | Original author, date, source URL |
| Reached | Execution reached a relevant site or transition | Coverage, breakpoint, state event |
| Triggered | The relevant failure condition or invariant violation occurred | Fault-site or state-transition record |
| Detected | A sanitizer, debugger, assertion, or equivalent observer detected a problem | Tool output, version, PID, build provenance |
| Attackability assessed | Attack conditions and impact were evaluated | Original research or official advisory, SAPI/context |
| Patch verified | The same path was contrasted before and after a validated fix | Exact commit/release and two valid executions |

**Open does not establish that the latest supported release remains exploitable. Closed does not, by itself, establish that all maintained branches contain a fix.** Likewise, a crash under a locally executed PHP program does not necessarily imply a remotely exploitable HTTP vulnerability.

## Selected primary research and issue records

| Period | Original work and credit | Technical subject | Research caveat |
|---|---|---|---|
| 2016 | [#72530](https://bugs.php.net/bug.php?id=72530) · Taoguang Chen, subsequent PHP developer analysis | GC, destructors, lifetime | Distinguish initial report from later fix |
| 2016 | [#73092](https://bugs.php.net/bug.php?id=73092) · [Check Point research](https://blog.checkpoint.com/research/check-point-discovers-three-zero-day-vulnerabilities-web-programming-language-php-7/) | PHP 7 unserialize and HashTable references | Evaluate original exploitability claims separately |
| 2016 | [#73147](https://bugs.php.net/bug.php?id=73147) · Taoguang Chen | Unserialization and re-entrancy | Verify issue/CVE/fix mapping |
| 2017 | [#74103](https://bugs.php.net/bug.php?id=74103) · Chris Young | Unserialize UAF | Preserve USE_ZEND_ALLOC and ASan/MSan settings |
| 2018 | [#76167](https://bugs.php.net/bug.php?id=76167) | Cross-request mbstring stale pointer | Same-worker GDB/watchpoint evidence |
| 2018 | [#76846](https://bugs.php.net/bug.php?id=76846) · subsequent Nikita Popov analysis | Object-store allocation and partial state | Fixed historical positive control |
| 2019 | [CVE-2019-11043](https://bugs.php.net/bug.php?id=78599) · [neex research](https://github.com/neex/phuip-fpizdam) · [Orange Tsai analysis](https://blog.orange.tw/posts/2019-10-an-analysis-and-thought-about-recently/) | FPM path calculation and memory corruption | Specific nginx/FPM configuration required |
| 2019 | [#78793](https://bugs.php.net/bug.php?id=78793) · Nikita Popov | EXIF and MemorySanitizer | ASan-negative does not imply fixed |
| 2019 | [#78876](https://bugs.php.net/bug.php?id=78876) | Multipart/OOM cleanup | Distinguish resource retention/DoS from UAF |
| 2020 | [#79760](https://bugs.php.net/bug.php?id=79760) · Nikita Popov | GC/refcount lifetime under OOM | Not proof of current RCE |
| 2021 | [PR #6903](https://github.com/php/php-src/pull/6903) · Nikita Popov | Deferred error handlers and VM safepoints | Prototype does not mean merged fix |
| 2022 | [#10026](https://github.com/php/php-src/issues/10026) | SOAP caught bailout and GC protection | Invariant violation is not itself proof of exploit |
| 2023 | [#12073](https://github.com/php/php-src/issues/12073) | Partial closure initialization on OOM | Compare exact pre- and post-fix versions |
| 2024 | [#14083](https://github.com/php/php-src/issues/14083) | Allocator hardening proposals | Design discussion rather than CVE |
| 2024 | [#16726](https://github.com/php/php-src/issues/16726) | Error-handler re-entrancy and ASan UAF | Related to umbrella issue #20018 |
| 2024–25 | [CVE-2024-11235 official advisory](https://github.com/php/php-src/security/advisories/GHSA-rwp7-7vc6-8477) | UAF during request shutdown | Established fixed-version comparator |
| 2024–25 | [Quarkslab audit results](https://thephp.foundation/blog/2025/04/10/php-core-security-audit-results/) | PHP core security review | Audit findings are not automatically later CVEs |
| 2025 | [FlowFusion paper](https://www.usenix.org/conference/usenixsecurity25/presentation/jiang-yuancheng) · [repository](https://github.com/php/flowfusion) | Dataflow-guided PHP test generation | Reported research performance, not replicated here |
| 2025 | [#20018](https://github.com/php/php-src/issues/20018) | Umbrella discussion of delayed error handlers | Issue count is not distinct root-cause count |
| 2026 | [#22061](https://github.com/php/php-src/issues/22061) · [PR #22710](https://github.com/php/php-src/pull/22710) | Destructor bailout during HashTable cleanup | Distinguish proposal from merged release |
| 2026 | [Calif PHP UAF research](https://calif.io/research/php-uaf) | Serializable re-entrancy | Remote applicability depends on application context |
| 2026 | [#24361](https://github.com/php/php-src/issues/24361) · [SOAP PR #24366](https://github.com/php/php-src/pull/24366) | Opcache caught bailout/GC protection | PR #24366 addresses SOAP paths; unmerged on review date |
| 2026 | [PHP2Shell advisory 109618](https://github.com/php/php-src/security/advisories/GHSA-w8hw-w9fx-j79w), [109619](https://github.com/php/php-src/security/advisories/GHSA-6wmf-4rv5-p3rp) · [Wiz analysis](https://www.wiz.io/blog/php2shell-php-rce) | OOM/bailout and cross-request lifetime | Separate official impact from independent claims |

New reports [#24481](https://github.com/php/php-src/issues/24481) and [#24532](https://github.com/php/php-src/issues/24532) (unserialization re-entrancy/teardown), and [#24492](https://github.com/php/php-src/issues/24492) (hard-memory-limit termination regression) were useful **triage candidates** on the review date. Their existence does not establish independent, unpatched RCEs.

## Recognizing researchers and maintainers accurately

[Taoguang Chen](https://bugs.php.net/bug.php?id=72530), [Yannay Livneh and Check Point](https://blog.checkpoint.com/research/check-point-discovers-three-zero-day-vulnerabilities-web-programming-language-php-7/), and [Chris Young](https://bugs.php.net/bug.php?id=74103) made important early public records available. [Emil Lerner (neex)](https://github.com/neex/phuip-fpizdam) disclosed a specific PHP-FPM finding; [Orange Tsai](https://blog.orange.tw/posts/2019-10-an-analysis-and-thought-about-recently/) contributed an independent technical explanation. **Original discovery, reduction, follow-up analysis, exploitation research, and patch design are distinct contributions**.

The public record also matters because PHP core contributors published difficult cases that remained unresolved. [Nikita Popov's PR #6903](https://github.com/php/php-src/pull/6903) is valuable partly because it explains the structural problem and the limitations of an attempted repair. [#20018](https://github.com/php/php-src/issues/20018) aggregates ongoing design challenges. Reducing this history to a claim that maintainers were simply unaware or indifferent would erase important technical context.

The [Quarkslab audit researchers and their supporting organizations](https://thephp.foundation/blog/2025/04/10/php-core-security-audit-results/), [Yuancheng Jiang and the FlowFusion coauthors](https://www.usenix.org/conference/usenixsecurity25/presentation/jiang-yuancheng), [Calif](https://calif.io/research/php-uaf), [Wiz Research](https://www.wiz.io/blog/php2shell-php-rce), and all contributors who reviewed and shipped PHP fixes merit acknowledgment. This is not a complete credit list; missing names do not diminish their work.

## The Quarkslab audit and the later 2026 security response

The [PHP Foundation's 2025 audit summary](https://thephp.foundation/blog/2025/04/10/php-core-security-audit-results/) describes the Quarkslab core review. Secondary summaries, including [OSTIF's publication](https://ostif.org/php-audit-complete/), may categorize severities somewhat differently. Before republishing a precise severity breakdown, it is better to reconcile individual findings against the final audit revision.

The [Foundation's October 2026 account](https://thephp.foundation/blog/2026/10/21/todays-php-security-release-and-how-were-strengthening-php-security/) describes compatibility, ecosystem impact, availability, and decision-process difficulties in reaching an OOM-related security fix. An earlier audit finding, a warning signal recognized during remediation, and a later concrete CVE should not be collapsed into the same discovery.

## From historical records to falsifiable experiments

A research corpus becomes more valuable when each historical record contains:

- **Fix lineage:** original source and report date, fix PR/commit, affected versions, and release branches carrying the fix.
- **Execution prerequisites:** PHP version, build/allocator, SAPI, extensions, and whether same-worker execution matters.
- **An appropriate observer:** ASan, MSan, GDB/watchpoint, Valgrind, or a PHP-level GC invariant, along with whether that observer actually ran.
- **Independent evidence levels:** reached, triggered, detected, attackability assessed, and patch verified.
- **Evaluation independence:** a public regression set for already-understood defects versus a separate, preselected, tool-frozen blind hold-out set.

For instance, [#78793](https://bugs.php.net/bug.php?id=78793) motivates an MSan-positive comparator, [#76167](https://bugs.php.net/bug.php?id=76167) a worker-lifetime watchpoint, [#10026](https://github.com/php/php-src/issues/10026) a GC-invariant test, and [#76846](https://bugs.php.net/bug.php?id=76846) / [#12073](https://github.com/php/php-src/issues/12073) a failure-atomicity before/after comparison. An observer that was never executed cannot contribute a negative test result.

The [Magma benchmark](https://doi.org/10.1145/3428334) motivates separating reach, trigger, and detection; [StateAFL](https://link.springer.com/article/10.1007/s10664-022-10233-3) motivates internal server-state observations; and [FuzzBench](https://google.github.io/fuzzbench/) motivates controlled comparisons and independent repetitions. These are **methodological references**, not third-party confirmations of a particular php2shell result.

## Scope, limitations, and related resources

These notes are a **source-based research map**, not a claim that all 58 corpus entries have been independently reproduced on every release or that an open issue proves current exploitability. They distinguish public-source interpretation from observations already documented in the laboratory; no additional full PHP-FPM/ASan campaign was run solely for this article.

[Main essay](/en/post/2026-10-24-php-memory-safety-decade/) · [php2shell repository](https://github.com/windshock/php2shell) · [Fuzzing #2](https://github.com/windshock/php2shell/issues/2) · [CoreGuard #3](https://github.com/windshock/php2shell/issues/3) · [Corpus #4](https://github.com/windshock/php2shell/issues/4) · [Verdicts #5](https://github.com/windshock/php2shell/issues/5)

Potentially new, nonpublic PHP vulnerabilities should be disclosed responsibly to the PHP security team before publishing exploitation details. **Corrections to sourcing, attribution, and technical interpretation are welcome.**
