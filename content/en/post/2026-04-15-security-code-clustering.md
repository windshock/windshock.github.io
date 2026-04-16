---
title: "How I Turned 228 Endpoints into 5 Clusters"
date: 2026-04-15
draft: false
featured: true
presentation: true
tags: ["Code", "Security Automation", "Static Analysis", "Semgrep", "Process Design"]
categories: ["Security Research"]
description: "A practical account of applying dataflow-based clustering to a real codebase — reducing 228 endpoints to 5 reviewable clusters, and finding an RCE chain in the cross-section."
image: "/images/pdf-previews/Precision_Security_Clustering_p1.webp"
presentationInfographic: "/images/post/Precision_Security_Clustering_infographic.webp"
---

This is the third post in a series documenting the process of building [oh-my-secuaudit](https://github.com/windshock/oh-my-secuaudit).

> **oh-my-secuaudit series**
> 1. [Security Testing as Code — Structuring Assessment as Code](/en/post/2026-03-17-security-testing-as-code/)
> 2. [Structure Builders Will Outlast Vulnerability Finders](/en/post/2026-04-02-security-from-sense-to-structure/)
> 3. **How I Turned 228 Endpoints into 5 Clusters** ← current post

In the [previous post](/en/post/2026-04-02-security-from-sense-to-structure/), I wrote about the shift from instinct to structure — and why AI works best inside that structure.

This time I want to show the concrete implementation.

Not theory. Not slides. The actual thing I built and ran against a live codebase.

---

## 1. The problem AI left behind

After running AI-assisted security assessment on a mid-size e-commerce platform, I had results. Too many results.

The system had 12 modules, 228 endpoints, and 73 controllers. The AI agents — each scoped to a security domain — produced hundreds of findings. Some accurate. Some overstated. Some reporting the same issue under three different names.

The detection phase was solved. What remained was interpretation.

Which of these 228 endpoints actually need manual review? If I find a vulnerability in one, how many siblings share the same pattern? When the codebase changes, which findings do I need to re-check?

These aren't questions that more scanning answers. They require **structure**.

---

## 2. Clustering by security meaning, not code similarity

The approach I landed on was clustering — but not the kind you'd think.

### Why code similarity clustering fails

Code similarity clustering groups files that look alike. That's useful for refactoring. It's useless for security.

Here's a concrete example. Say you have an order approval controller and a coupon dispatch controller. Both are `@RestController`, both extend `BaseController`, both use `@PostMapping` to receive requests and call into the service layer. Their code structure is 90%+ identical.

Code similarity clustering puts them in the same cluster.

But the order approval controller has an auth interceptor registered in `WebConfig`. The coupon dispatch controller doesn't. One requires authenticated access. The other is open to anyone. Apply the same review strategy to both because "the code looks similar," and you miss the missing auth.

**Code looking alike and security posture being alike are entirely different things.**

### Five elements that define security meaning

So instead of code shape, I focused on how data flows through the system. A security-relevant flow decomposes into five elements:

| Element | Meaning | Examples |
|---|---|---|
| **Source** | Data entry point | HTTP parameter, request body, external API response |
| **Transformation** | Processing logic | String manipulation, parsing, object conversion |
| **Validation / Sanitization** | Filtering / encoding | HTML escaping, SQL parameter binding, allowlist |
| **Sink** | Final output point | DB query execution, HTML response, log output, deserialization |
| **Context** | Security context | Auth state, data sensitivity, network boundary |

Same Source, different Sink — different threat. Same Sink, but Validation present in one path and absent in another — different vulnerability verdict. Same code, different Context (auth applied vs. not) — safe in one case, critical in another.

### Why (Endpoint, Sink) is the minimum unit

Based on these five elements, I defined the clustering unit:

**(Endpoint, Sink) — the source-to-sink dataflow path.**

Why not just endpoints? A single endpoint can write to a database, emit a log, and call an external API. Each needs a different security review.

Why not just sinks? The same `log.info()` sink called from an authenticated internal admin page and from a publicly exposed API carries different risk.

Concretely, it looks like this:

| Endpoint | Sink | Analysis unit |
|---|---|---|
| Order approval API | DB state change | Auth/authz review (C1) |
| Order approval API | `log.info(orderNo)` | Sensitive data logging review (C4) |
| Order receiving API | `XStream.fromXML()` | Deserialization review (C5) |
| PG integration module | `HttpsURLConnection` | SSL verification review (C3) |

The same "order approval API" lands in two different clusters — because the sinks differ. That's why the (Endpoint, Sink) pair is the minimum unit.

### The core principle

> A cluster does not guarantee identical results.
> A cluster provides the possibility of applying the same review strategy.

You don't trust clusters. You verify them. But verification of 5 representative samples is radically cheaper than reviewing 228 endpoints individually.

---

## 3. Five clusters emerged

I restructured 228 endpoints by (Endpoint, Sink) pairs and grouped paths with similar security meaning. The result: 5 clusters. The largest (C1) starts with 5 representative samples; the smallest (C2) gets full review of all 5 items. Instead of reviewing 228 endpoints individually, the initial verification scope drops to roughly 20.

Here's what each cluster means in practice and why it qualifies for clustering.

### C1: Missing endpoint-level authentication

The platform had an auth gateway (AuthGW) **assumed** to sit in front of all API modules. But many controllers had no authentication of their own — no `@PreAuthorize`, no `@Secured`, no interceptor in `WebConfig`. They relied entirely on the network topology being correct. AuthGW is a network-level control; if that assumption breaks, high-value APIs like coupon approval, order cancellation, and refund processing are wide open.

**Why cluster this?** Even when a common auth module exists, the question is whether each endpoint **actually invokes it**. Verifying 228 endpoints individually without clustering makes review cost explode.

Initial estimate: ~120 endpoints across 10+ modules.

### C2: Hardcoded shared secrets

Some controllers handled authentication in a different way entirely. They extracted a specific field from the request body and compared it against a string literal hardcoded in the source using `String.equals()`. If it matched, the operation proceeded. If not, the method returned `true` anyway — it didn't even block the request.

```java
// Actual pattern (anonymized)
if (request.getPromisedValue().equals("serviceManualProcessing1111")) {
    // execute manual processing
}
```

The same pattern repeated across 5 controllers serving different external partners. Only the password literal changed per partner — the structure was identical.

**Why cluster this?** The pattern is perfectly uniform, so verifying 1 representative sample automatically covers the remaining 4 (4x reduction). And it's fully detectable by static pattern matching — a single Semgrep rule handles it.

Semgrep result: 10 matches across 2 modules.

### C3: SSL/hostname verification bypass

This platform communicated with several external PG (payment gateway) providers over HTTPS. The problem was in the code that established those HTTPS connections.

In Java, when creating an HTTPS connection, a `TrustManager` validates the server's certificate, and a `HostnameVerifier` confirms that the certificate's hostname matches the actual target. Both verifications were disabled repeatedly:

```java
// TrustManager — trusts every certificate unconditionally
public void checkServerTrusted(X509Certificate[] chain, String authType) {
    // empty — no verification
}

// HostnameVerifier — accepts every hostname unconditionally
public boolean verify(String hostname, SSLSession session) {
    return true;
}
```

With these in place, the HTTPS connection is defenseless against man-in-the-middle attacks. An attacker positioned between the platform and a PG provider can intercept and forge responses. Forged payment responses translate directly to financial loss.

**Why cluster this?** Each PG integration had its own class, but the SSL bypass pattern was identical across all of them. Verifying one integration class means the same conclusion applies to the rest.

Initial estimate: 10+ sites across 3 modules.
Semgrep result: **56 matches across 4 modules** — 5x the initial estimate. There were far more PG integration classes than expected.

### C4: Sensitive data logging

Sensitive data logging appeared in three layers: **repetitive per-controller patterns + global AOP configuration impact + credential exposure.**

**C4-a: Direct identifier logging.** Coupon numbers, order IDs, and company IDs written to `log.info()` at controller method entry. Repeated across individual controllers.

**C4-b: Global request/response body logging.** Spring's `RequestBodyAdviceAdapter` or AOP `@Around` advice capturing entire request and response bodies. **Every endpoint in the module** was automatically affected — even without explicit logging code in the controller.

**C4-c: Authentication credential logging.** Partner API `Authorization` header Basic auth keys written to logs.

**Why cluster this?** C4-a is a repetitive pattern coverable by representative samples. C4-b: reviewing 1 AOP class covers all endpoints in the module. C4-c: individual case, but same review strategy applies.

Initial estimate: 4+ modules.
Semgrep result: **90 matches across 9 modules** — 10x the initial estimate. The reach of AOP-based global logging was vastly underestimated.

### C5: Unsafe XML deserialization (XXE / no allowlist)

This platform exchanged data with external partner systems in XML format. It used the `XStream` library to convert XML into Java objects, but two critical security settings were missing.

First, **no allowlist.** `XStream.fromXML()` instantiates whatever Java class is specified in the XML. Without `setupDefaultSecurity()` or `allowTypes()` to restrict which classes are allowed, an attacker can specify dangerous classes (e.g., gadget chains that invoke `Runtime.exec()`) and achieve arbitrary command execution on the server.

Second, **no XXE protection.** `DocumentBuilderFactory.parse()` was used without disabling external entity loading. An attacker embedding an external entity reference in XML could make the server read internal files or send requests to internal network hosts.

The more serious issue: a vulnerable `XStreamUtil.java` utility class had been **copy-pasted** across multiple modules. Fixing one copy left the others still vulnerable.

**Why cluster this?** The copied utility classes share an identical pattern, so verifying the original and diffing against copies covers the full scope. Pattern-based Semgrep rules can automatically detect all usage sites.

Semgrep result: 2 matches in the API layer — but backend modules hadn't been scanned yet. The actual scope is likely larger.

---

## 4. Mapping clusters to attack scenarios

Five clusters defined. What's the next step?

Reviewing each cluster individually has value. But real attacks often don't rely on a single vulnerability — attackers **combine** weaknesses. An unauthenticated endpoint (C1) and a deserialization flaw (C5) live in separate clusters, but if they meet at the same endpoint, they form an attack chain.

To systematically check for this, I built a matrix crossing clusters against attack scenarios. The major attack scenarios identified for this platform (coupon approval/cancellation tampering, order hijacking, manual processing abuse, partner integration forgery, etc.) went into rows. The 5 clusters went into columns. Each cell marks whether that cluster is involved in that scenario.

| Attack scenario | C1 | C2 | C3 | C4 | C5 |
|---|:-:|:-:|:-:|:-:|:-:|
| High-value state change (approval/cancel) | ● | | | | |
| Order receiving/resend/refund | ● | | | | ● |
| Manual processing abuse | | ● | | | |
| Account takeover → operator abuse | ● | | | ● | |
| Partner integration SSL bypass | | | ● | | ● |
| Partner credential log exposure | | | | ● | |
| AuthGW bypass | ● | | | | |
| POS/realtime approval direct call | ● | | | | ● |

Two things jump out immediately.

**First, C1 spans more than half the scenarios.** Missing auth/authz is dangerous on its own, but it also **amplifies** vulnerabilities in other clusters. C1 representative sample review yields the highest risk reduction.

**Second, some rows have two or more clusters marked ● simultaneously.** "Order receiving/resend/refund" involves both C1 and C5. "POS/realtime approval direct call" does too. These intersections are exactly where **compound attack chains** can form.

Reviewing each cluster independently would miss these intersections. But with the matrix built, "which clusters are simultaneously involved in this scenario?" becomes visible at a glance.

The most dangerous finding came directly from this matrix.

---

## 5. The RCE chain found at the intersection

I traced the row where C1 and C5 were both marked. The "order receiving" scenario.

One endpoint — the B2C order receiver from an external partner — had:

- **No authentication** (C1: no interceptor, relied on AuthGW assumption)
- **XStream deserialization without allowlist** (C5: `fromXML()` on untrusted XML)

Let's look at each in isolation.

**C1 alone — no authentication?**
An attacker can call the endpoint. But all they can do is submit a normal order request. The XML gets processed through the standard order handling logic. Uncomfortable, but not an immediate system takeover. A security report would typically classify this as "Medium."

**C5 alone — unsafe deserialization?**
`XStream.fromXML()` converts XML into Java objects. Without an allowlist, an attacker can specify arbitrary Java classes inside the XML, and the server will actually instantiate them. This can be leveraged to execute operating system commands on the server — so-called Remote Code Execution (RCE).

But if authentication exists? The attacker must first obtain valid credentials, which significantly raises the attack difficulty. A security report might classify this as "High, but with preconditions."

**C1 x C5 — combined?**
No authentication means anyone can reach the endpoint. No deserialization allowlist means arbitrary classes can be instantiated. The two conditions together:

1. Attacker reaches the endpoint over the network (no auth → possible)
2. Sends crafted XML (same format as a legitimate request)
3. `XStream.fromXML()` parses the XML and instantiates the attacker-specified Java class
4. That class's constructor or method executes an operating system command

**Remote Code Execution with zero preconditions.** The most critical severity in security.

When reviewing C1 individually, you might conclude "auth gateway sits in front, risk is low." When reviewing C5 individually, you might conclude "internal communication only, access is restricted." Each judgment is reasonable on its own. But cross them, and the premise of both judgments collapses simultaneously.

This is why clustering matters beyond efficiency. When you map clusters against attack scenarios, you see **interaction effects** that individual findings miss. A vulnerability matrix that checks each cell in isolation will never find this. The cross-section is where the real danger lives.

---

## 6. Verifying the clusters

A common objection to clustering is: "How do you know the clusters are correct?"

You don't. Not at first.

A cluster is a hypothesis. Bootstrapping is the process of verifying that hypothesis through representative sample review. Along the way, you confirm cluster validity — and sometimes find vulnerabilities you didn't expect.

### Found during review: the one-line bug

When I started reviewing C1 representative samples, I wasn't just checking "does an auth interceptor exist or not." To verify the Context element in the cluster's feature table — auth state, AuthGW routing assumptions — I had to read how the actual auth mechanism **behaved**.

The AuthGW module had an IP allowlist check for POS API endpoints. The method computed a boolean `permIpCheck` — whether the requesting IP was in the allowed list — and then, at the very end:

```java
return true;  // should be: return permIpCheck;
```

One line. The entire IP allowlist for 5 POS endpoints was disabled.

This wasn't a sophisticated vulnerability. It was a typo that had survived every code review. It would have been invisible in a per-endpoint scan — you'd need to read the auth utility code, which isn't something an endpoint-level checklist directs you to do.

Clustering directed me there. The C1 representative sample review required examining the actual auth mechanism, not just checking if one exists. This wasn't a finding planned during cluster definition — it was a byproduct of the bootstrapping process.

### Staged verification

I adopted a staged verification approach. Instead of trusting clusters from the start, you build confidence incrementally through manual review.

| Stage | Condition | Sampling | Practical example |
|---|---|---|---|
| **Stage 1 (Initial)** | No cluster confidence | 50%+ manual review | C2 (5 items): full review. C1 (120+): top 5 representatives first |
| **Stage 2 (Stabilization)** | Intra-cluster consistency >= 80% | Reduce to 30% | C3: all 5 samples showed identical pattern → reduce to 30% |
| **Stage 3 (Operational)** | Miss rate < 5% for 2 consecutive cycles | Representative sample only | C2: full review done → representative 1 going forward |

For small clusters (under 10 items, like C2's 5), full manual review from the start — the cost is trivial anyway. For large clusters like C1 (100+ endpoints), start with the 5 highest-risk representative samples and expand based on what you find.

### The key metric: intra-cluster consistency

The key metric is **intra-cluster consistency**: within a cluster, what percentage of samples share the same vulnerability verdict?

Say you review 5 samples in C3. All 5 have `HostnameVerifier` returning `return true` — the same pattern. Consistency is 100%. You can move to stage 2.

But if 2 out of 5 actually have proper TLS verification? Consistency is 60%. That's a signal the cluster definition is wrong. Split it — for example, "C3-a: full bypass" and "C3-b: partial mitigation exists" — and apply different review strategies to each.

When 2+ reviewers are involved, **Cohen's Kappa** (inter-reviewer agreement) is also measured. Low Kappa doesn't mean the cluster is bad — it means the reviewers disagree on criteria. This distinction matters: you align review standards, not split the cluster.

### When clustering fails

Not all code is amenable to clustering. The following conditions make static dataflow tracking impossible, which renders clustering meaningless:

| Condition | Why it fails | Example |
|---|---|---|
| **Reflection / dynamic dispatch** | Actual call target determined at runtime, invisible to static analysis | `Class.forName(className).newInstance()` |
| **AOP / Proxy-based flows** | Security logic injected via runtime proxies, not visible in code | Spring AOP `@Around` advice |
| **Framework internal hidden flows** | Dataflow breaks inside framework internals | Spring Security filter chain |
| **Runtime config-dependent sanitizers** | Same code behaves differently depending on config files | Per-environment encryption settings |
| **Template engine internals** | Auto-escaping behavior can't be determined statically | Thymeleaf `th:utext` vs `th:text` |

Code matching these conditions is **excluded from clusters and managed in a separate list.** Review priority: paths directly connected to external input → paths with auth bypass potential → everything else. Individual manual review, but if the same failure condition repeats, a checklist is created for consistency.

In this project, C4's AOP-based global logging (C4-b) hit this case. The `@Around` advice's pointcut declaration determines affected targets at runtime, so static dataflow alone couldn't fully enumerate impacted endpoints. A fallback procedure — exhaustive manual inspection of AOP targets — was applied.

### Re-verification triggers

A cluster reaching stage 3 (operational) doesn't stay valid forever. The following changes reset the affected cluster back to stage 1:

- **Major codebase changes**: module addition/removal, framework version upgrade
- **Auth/security config changes**: `WebConfig`, `SecurityConfig`, `web.xml` modifications
- **New partner integrations**: affects C3 (SSL), C5 (XML parsing)
- **New logging AOP/interceptors**: affects C4
- **Missed vulnerability discovered**: direct evidence that the cluster's assumptions were wrong

---

## 7. From fortify_ml to sec-cluster

This clustering approach has a prehistory.

### fortify_ml: the starting point

A few years ago I built [fortify_ml](https://github.com/windshock/fortify_ml) — a tool that takes Fortify SAST scan results as input and automatically clusters them by dataflow path.

Here's how it works. Fortify scans source code and outputs vulnerability candidates as `TraceNodes` — source-to-sink paths. fortify_ml extracts these TraceNodes, converts each path into a TF-IDF vector, and groups similar paths together using K-means clustering.

The result: hundreds of Fortify findings compressed into K clusters. A reviewer only needs to check representative samples per cluster, drastically reducing review time.

fortify_ml worked. But its limitations were clear.

### Limitations and the evolution to sec-cluster

fortify_ml had three clear limitations: **Fortify license lock-in** (no Fortify, no clustering), **no workflow** (clustering only — verification, sampling, record-keeping, re-verification all manual each time), and **no C1 coverage** (Fortify doesn't detect "is authentication applied to this endpoint?", so the most important cluster was invisible).

Based on this, the v4 strategy defines a dataflow extraction priority:

| Priority | Tool | Characteristics |
|---|---|---|
| 1st | **Fortify + fortify_ml** | Most accurate, but commercial license required |
| 2nd | **Semgrep (taint tracking)** | Free, open-source, easy customization |
| 3rd | **CodeQL / Joern** | Deep analysis possible, but build setup required |

For this project, no Fortify license was available, so Semgrep was primary. C1 was handled via a separate shell script (`auth_enum.sh`).

### sec-cluster: the generalized workflow

Where fortify_ml was "a tool that groups findings," sec-cluster is **not a tool but a workflow**. A skill in the [oh-my-secuaudit](https://github.com/windshock/oh-my-secuaudit) toolkit, it takes source code directly as input — no vendor dependency.

| Aspect | fortify_ml | sec-cluster |
|---|---|---|
| Input | Fortify scan results | Source code (tool-agnostic) |
| Scope | Clustering only | Full 6-phase workflow |
| Deliverables | Cluster groups | CLUSTERS.md, review checklists, Semgrep rules |

The 6-phase workflow:

1. **Scope** — Separate clustering targets from static pattern matching targets
2. **Semgrep sweep** — Adapt 4 template rules to project, batch-execute via `sweep.sh`
3. **Auth enumeration** — `auth_enum.sh` maps per-controller auth coverage (C1-specific)
4. **Cluster definition** — Define (Endpoint, Sink) groups with feature tables
5. **Bootstrapping review** — Staged sampling, verdict recording, consistency measurement
6. **Output** — Generate `CLUSTERS.md`, `REVIEW_CHECKLIST.md`, `SUMMARY.md`

Running the Semgrep sweep on this project revealed a significant gap between initial instinct and actual detection scope: C3 (SSL bypass) expanded 5x, C4 (sensitive logging) expanded 10x beyond estimates. Instinct provides the cluster hypothesis; tooling validates the boundary. Without automated detection, cluster scope would have been underestimated by an order of magnitude.

Process encoded as artifacts, so the next person — or the next AI agent — doesn't start from scratch.

---

## 8. What Semgrep found vs. what I expected

The gap between estimate and measurement was the biggest lesson.

| Cluster | Initial estimate | Semgrep result | Ratio |
|---|---|---|---|
| C2 | 5 endpoints / 2 modules | 10 / 2 modules | 2x |
| C3 | 10+ sites / 3 modules | 56 / 4 modules | **5x** |
| C4 | 4+ modules | 90 / 9 modules | **10x** |
| C5 | 7+ sites / 7 modules | 2 (API only, backend not scanned) | Partial |

C3 and C4 expanded dramatically once Semgrep ran across the full codebase. The AOP-based logging (C4) was particularly surprising — global interceptors meant that every endpoint in those modules was affected, not just the handful I'd manually identified.

The lesson: **instinct provides the cluster hypothesis. Tooling validates the boundary.** Without automated detection, I would have underestimated C3 and C4 by an order of magnitude.

---

## 9. Where this fits in the bigger picture

This post is a direct continuation of the argument I made before:

- **Instinct** tells you where to look.
- **Structure** tells you how to organize what you find.
- **AI** scales the detection.
- **Clustering** makes the output actionable.

The security industry has largely solved the "find more" problem. What remains is the "understand and act" problem. Clustering is one concrete answer to that — not the only one, but a proven one.

The `sec-cluster` skill, the strategy document, and the Semgrep templates are all open source. If you're doing code-level security assessment at scale, I hope they save you the months of iteration they cost me.

