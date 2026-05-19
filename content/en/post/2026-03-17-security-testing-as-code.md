---
title: "Security Diagnostics Reports Die Upon Publication"
date: 2026-03-17
draft: false
featured: true
tags: ["DevSecOps", "Security Testing", "Vulnerability Diagnostics", "PoC", "Automation", "Medical Records", "Code"]
categories: ["Security Research", "Security Operations"]
description: "We point out the limitations of traditional security diagnostic reports and share the necessity and practical application cases of 'Security Testing as Code', managing diagnostic results not as 'documents' but as 'executable code (PoC)'."
image: "/images/pdf-previews/Security_Testing_as_Code_en_p1.webp"
---

## Related Video

{{< youtube PfsJWrxjSAg >}}

## PDF

- **Open (new tab):** [`/pdf/Security_Testing_as_Code_en.pdf`](/pdf/Security_Testing_as_Code_en.pdf)

<iframe
  id="pdfjs-stac-en"
  src="/pdfjs/single.html?file=/pdf/Security_Testing_as_Code_en.pdf#page=1"
  width="100%"
  height="560"
  style="border: 1px solid #e5e7eb; border-radius: 8px;"
></iframe>

<script>
  (function () {
    const iframe = document.getElementById("pdfjs-stac-en");
    if (!iframe) return;
    window.addEventListener("message", function (e) {
      if (e.origin !== window.location.origin) return;
      const data = e.data || {};
      if (data.type !== "pdfjs-resize") return;
      if (typeof data.height !== "number") return;
      iframe.style.height = Math.max(420, Math.min(data.height, 980)) + "px";
    });
  })();
</script>

> If you can't view the PDF, open it here: [`/pdf/Security_Testing_as_Code_en.pdf`](/pdf/Security_Testing_as_Code_en.pdf)

> **oh-my-secuaudit series**
> 1. **Security Testing as Code — Structuring Assessment as Code** ← current post
> 2. [Structure Builders Will Outlast Vulnerability Finders](/en/post/2026-04-02-security-from-sense-to-structure/)
> 3. [How I Turned 228 Endpoints into 5 Clusters](/en/post/2026-04-15-security-code-clustering/)
> 4. [An Audit Workflow Survives Only When It Absorbs Misses](/en/post/2026-05-19-sec-audit-static-feedback-loop/)


When you do security diagnostics for a long time, you fall into a strange dilemma.

The diagnosis went well. Vulnerabilities were also found. But the knowledge fades away into the ether once the report is handed over. The customer receives the report, closes the file, and that's it. The next diagnostician starts from scratch again. Trying to find what I saw 6 months ago over again.

I pondered this for a long time. Is the report the problem, or is the format the problem? It was neither.

## Word: Volume over Content

At first, I wrote Word reports like everyone else.

The problem became apparent quickly. There were more general guidelines than actual vulnerabilities. Copy-pasting the OWASP Top 10, the mitigation plan ends with "validate input values". Pages got thicker, but the real content got thinner. When asked on what basis I counted "Critical 3, High 7", it was difficult to answer.

## Excel: Improved, but Quickly Hit Limits

When I switched to Excel, quantifying became possible. Filters could be applied, and sorting by severity was possible.

But over time, the files started varying from person to person. Someone added a column, someone created a new tab. When a project ended, the results were scattered across multiple files. To find the diagnostic results from 6 months ago, I had to rummage through my inbox. The diagnostic process itself was still nowhere to be found. Only the results, but no context.

## Portal System: Consistency but Rigidity

I moved Excel data to a DB and created a portal. The format became standardized. But whenever a new diagnostic type emerged, development was required. There was no flexibility. And the fundamental problem remained unresolved. Only diagnostic results were saved. Why this vulnerability is dangerous, what path led to its discovery, what the next diagnostician should look for—there was no place for such context anywhere in the portal.

## The Essence of the Problem

Be it Word, Excel, or a portal, they all started from the same premise.

**A diagnosis is a document.**

In medical terms, all security diagnostic reports so far have been medical certificates. Containing only the results at that moment in time. However, what's truly needed are the medical records. Progress, test values, prescriptions, everything the next doctor can seamlessly inherit. A document dies upon publication. Medical records are inherited by the next person.

## What Happens When a Diagnosis Becomes a Project?

Recently, I tried structuring a diagnosis as a Git project from the very beginning.

```text
assessment/
├── README.md              ← Overall context, progress status, summary of high-risk items
├── handoff-plan.md        ← Gap analysis, specifications for the next diagnostician to inherit
├── analysis/
│   └── attack-surface/    ← Endpoint inventory, external integration inventory
├── artifacts/
│   ├── poc/               ← Reproducible PoC code and execution environment
│   └── runtime/           ← Actual HTTP request/response evidence files
└── inputs/
    └── threat-intel/      ← Preliminary research inputs
```

More than the structure itself, what goes inside each folder is key.

## artifacts/poc/ — Executable Code Instead of Claims

### Case 1: XSSStringSerializer Fuzzing

There was a class named `XSSStringSerializer`. By name alone, it seems to prevent XSS. Upon opening the code, it was actually restoring escaped HTML—it was un-protecting, not protecting.

If it were a Word report, it would be written like this:

> "XSS bypass may occur because XSSStringSerializer performs unescape."

Instead, I wrote a Jazzer-based Java fuzzer and placed it in `artifacts/poc/fuzz-xss/`. I inputted 26 payloads, and here was the result.

```text
[BYPASS] <script>alert('XSS')</script>
[BYPASS] <img src=x onerror=alert(1)>
[BYPASS] javascript:alert(document.cookie)
[BYPASS] file:///data/data/com.x.y/shared_prefs/auth.xml
...
23 out of 26 bypassed — bypass rate 88.4%
```

7 crash files remain in the folder. Anyone can clone it and reproduce the exact same results with this single command.

```bash
./gradlew fuzz
```

### Case 2: `@Acl` ACL Verification Bypass PoC

The `@Acl` annotation was attached to a batch API. The design intent was access control based on an IP whitelist. However, the shopping tab batch controller had a pattern where `HttpServletRequest` was not declared as a parameter. For AOP to extract the IP, `HttpServletRequest` is required; without it, a `RequestNotFoundException` occurs, failing to reach the IP check logic itself.

I configured a Docker + Spring Boot environment in `artifacts/poc/acl-bypass-test/`. Executed by splitting the scenario into two.

#### Scenario A (With `HttpServletRequest`)

- HTTP 500 / `"ACL_DENIED: allowedIP=..., realIP=192.168.2.1"`
- IP verification performed ✅
- Denial reason logged ✅

#### Scenario B (Without `HttpServletRequest` — Shopping Tab Batch Pattern)

- HTTP 500 / `"UndeclaredThrowableException: unknown"`
- IP verification NOT performed ❌
- Denial reason unknown ❌

Business logic does not execute in either case. However, `@Acl` is not operating correctly either. It's blocked by an exception without IP verification, opening up bypass possibilities the moment error handling logic changes. The reproduction method is one line.

```bash
bash test.sh http://localhost:18080
```

There's no need to explain how different this is from the sentence "There is a discrepancy between design and implementation".

## artifacts/runtime/ — Evidence of Verification, Not "Verified"

I verified if a commercial Redis was open via TCP internally. I did not attempt authentication—following the non-destructive principle, attempting authentication wasn't necessary to prove risk.

```text
172.29.2.1:7000  OPEN
172.29.2.2:7001  OPEN
172.29.2.3:7000  OPEN
172.29.2.3:7001  OPEN
```

Reachable to 4 out of 6 nodes. `spring.redis.password` unset. The `curl` command and actual response headers are saved as files. The result itself is in the project instead of just the words "I checked".

## handoff-plan.md — So the Next Diagnostician Doesn't Start From Scratch

Organized into a matrix detailing which scenarios were confirmed in code, what awaits dynamic verification, and what was explicitly excluded from this scope. Follow-up tasks are divided into Phase A / B / C, complete with prerequisites and expected outputs.

The target analysis repository is pinned via commit hash. Even 6 months later, I can reproduce exactly what I looked at to make my decision.

In a Word report, all of this was text. In a project, it's executable, reproducible, and version-controlled.

## AI Made This Possible

To be honest, this approach was practically difficult without AI.

Structuring analysis content into documents, converting vulnerability scenarios into test cases, and drafting PoC codes—doing this alone would exceed the time spent on actual diagnostics. AI entirely changed the speed of dumping unstructured analysis results from my head into a project structure.

Using AI merely as a "tool to write pretty reports" results in a Word report slightly better than a normal Word report. However, when used as a **tool to structure diagnostic knowledge**, the story changes.

## Conclusion

The problem with security diagnostics wasn't the format.

It wasn't that we changed to Excel because Word was bad. It wasn't that we changed to a portal because Excel was bad. As long as diagnosis is treated as a document, changing formats invariably hit the same wall.

Diagnostic results must be evidence, not claims. Evidence must be reproducible. Reproducible evidence comes in files, and files are version-controlled.

Now, security diagnostics is becoming living code, not a document. The era of **Security Testing as Code** has arrived.
