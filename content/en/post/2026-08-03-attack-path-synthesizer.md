---
title: "Finding Vulnerabilities Is Not the Same as Building Attack Scenarios"
date: 2026-08-03
draft: false
featured: true
description: "A practical method for modeling vulnerabilities as attacker-relevant security state transitions and combining human intuition with bounded AI search"
tags:
  - Mind
  - AI Security
  - Vulnerability Research
  - Attack Path
  - Attack Graph
  - Security Automation
  - Pentest
  - Bug Bounty
categories:
  - Security Research
  - AI Security
image: "/images/post/attack-path-synthesizer/cover.webp"
---

# Finding Vulnerabilities Is Not the Same as Building Attack Scenarios

> Finding individual vulnerabilities and combining several findings into a valid attack scenario are different problems. The former is often a code and data-flow analysis task. The latter is a planning problem over an evolving state: what the attacker can do, know, reach, or possess after every action.

![Navigating the attack search space](/images/post/attack-path-synthesizer/cover.webp)

> **oh-my-secuaudit series** ([post 5](/en/post/2026-06-08-security-spec-test-repair-fuzzing/) made security judgment criteria executable as regression tests and fuzzing seeds. This post 6 moves from judging individual findings to composing evidence-backed attack paths.)
> 1. [Security Testing as Code — Structuring Assessment as Code](/en/post/2026-03-17-security-testing-as-code/)
> 2. [Structure Builders Will Outlast Vulnerability Finders](/en/post/2026-04-02-security-from-sense-to-structure/)
> 3. [How I Turned 228 Endpoints into 5 Clusters](/en/post/2026-04-15-security-code-clustering/)
> 4. [An Audit Workflow Survives Only When It Absorbs Misses](/en/post/2026-05-19-sec-audit-static-feedback-loop/)
> 5. [From a Security Development Spec for Small LLMs to Regression Tests and Fuzzing Validation](/en/post/2026-06-08-security-spec-test-repair-fuzzing/)
> 6. **Finding Vulnerabilities Is Not the Same as Building Attack Scenarios** ← current post

## 1. The question was simple: “Why can AI find bugs but fail to build a scenario?”

AI systems have become increasingly capable of identifying individual security flaws in source code and deployed applications. They can recognize missing validation, SSRF, authorization errors, unsafe file writes, path traversal, authentication bypasses, and many other vulnerability classes.

The results become much less reliable when the task changes from finding isolated flaws to answering a broader question:

> How do these findings connect, and does their combination create a more serious outcome than any finding alone?

It is tempting to treat this as a matter of model intelligence. Perhaps a larger model, a longer reasoning budget, or an instruction to inspect every combination would solve it. The underlying difficulty is more structural. Vulnerability chaining is not merely a comparison of report titles. It is a planning problem: determine which action is possible in the current state, what new state the action creates, and which later action that state enables.

This article summarizes the reasoning that led to that conclusion and the design of a reusable ChatGPT Skill called `Attack Path Synthesizer`.

## 2. Vulnerability discovery and attack-path construction are different tasks

An individual vulnerability is usually analyzed around one code path or security property.

```text
Untrusted input
  -> validation or transformation
  -> dangerous sink
  -> security impact
```

An attack scenario requires repeated reasoning about whether the result of one action satisfies the requirements of another.

```text
Current attacker capabilities and system conditions
  -> finding or action A
  -> acquire a new capability
  -> satisfy a precondition of action B
  -> acquire another capability
  -> reach a high-value objective
```

This requires information that source code alone may not provide:

- Which principal acquired the capability?
- In which process, host, tenant, or network zone is it valid?
- Does it survive the end of the request, a logout, a restart, or token expiry?
- Has the attacker learned the endpoint or object identifier required by the next step?
- Does revalidation, an allowlist, a policy, or a network boundary intervene?
- Does the combination create a genuinely new impact, or merely restate one finding?

A collection of findings does not automatically form an attack path. Each finding must also describe how it changes the attacker-relevant state of the system.

## 3. Why exhaustive mechanical chaining does not scale

A naive approach enumerates every ordering of the available findings. With `n` findings and paths of length `k`, the number of candidates can approach `n^k`. The real state space is even more complicated because preconditions accumulate, effects may be consumed, timing matters, and the same action may behave differently across scopes.

Classical planning theory establishes that general propositional STRIPS plan existence is PSPACE-complete.[^1] Early attack-graph research likewise began from the observation that manually constructing large attack graphs is tedious, error-prone, and impractical as the modeled system grows.[^2]

However, complexity must not become an excuse for missing easy connections. Finding every valid or optimal path is difficult, but many local joins have a simple form:

```text
Effect of A == Precondition of B
```

If finding A provides server-side HTTP request capability and finding B shows that the HTTP client follows attacker-controlled redirects without revalidating the final destination, the pair deserves immediate review.

The important distinction is this:

> General attack-path search is hard, but nearby causal relationships are not necessarily hard.

The first objective of automation should not be exhaustive discovery. It should be preventing the system from missing obvious, directly justified joins.

## 4. The research foundations behind this problem

This problem did not suddenly appear with modern LLMs. Several research traditions have been studying the same underlying difficulty for decades: **computational planning**, **attack-graph generation**, **penetration testing under uncertainty**, and **defensive optimization over multistep attack paths**. Most of the design choices in this article follow directly from that work.

### 4.1 Bylander: why general planning does not have an easy ending

Tom Bylander's 1994 paper systematically classified the computational complexity of propositional STRIPS planning.[^1] Its best-known result is that general plan existence is PSPACE-complete. Severe restrictions on actions and formulas still leave difficult cases, while many bounded or optimal variants remain NP-hard or NP-complete.

The connection to vulnerability chaining is direct. Once each finding is represented as a `Precondition -> Effect` action and the task is to find an action sequence from the current state to a goal, the problem resembles classical planning. Asking a model to “think longer about every combination” does not remove this structural difficulty.

### 4.2 Sheyner et al.: an attack graph is a set of state transitions

Sheyner, Haines, Jha, Lippmann, and Wing used symbolic model checking to generate attack graphs automatically in their 2002 IEEE Security and Privacy paper.[^2] An attack goal was expressed as a violation of a safety property, and a counterexample trace generated by the model checker was interpreted as an attack path.

The important lesson is that paths appear only after the **system state, attacker actions, and transition conditions** have been modeled. Connecting vulnerability titles is not enough. Their observation that hand-built attack graphs become tedious, error-prone, and impractical at scale also applies when an LLM is casually asked to enumerate every possible chain.

### 4.3 Ammann et al.: monotonicity exposes a tractable slice

Ammann, Wijesekera, and Kaushik used a **monotonicity** assumption: once the attacker gains a capability, later actions do not remove it.[^3] Under that assumption, exploit dependencies can be represented more compactly than an enumeration of every state ordering, making reachability and dependency analysis substantially more scalable.

This is why the Skill applies forward closure only to persistent capabilities and refuses to treat request-local effects, one-time tokens, or race windows as automatically monotonic. It does not solve the general problem; it isolates the part that can be computed safely.

### 4.4 Noel, Jajodia, Wang, and colleagues: generating paths is not the same as choosing defenses

Noel, Jajodia, O'Berry, and Jacobs studied minimum-cost hardening through exploit dependency graphs,[^5] and Wang, Noel, and Jajodia formalized the selection of initial conditions that cut multistep paths to critical resources.[^6]

This line of work shows that generating an attack graph is not the end of the analysis. For defense, the more important question is often not “How many paths exist?” but **Which small set of conditions can cut many paths at once?** Exact optimization also becomes expensive as the problem grows, motivating practical heuristics rather than a demand for a globally optimal answer.

That is why this article favors a small set of short, valuable candidates and explicit blockers instead of exhaustive or provably optimal path enumeration.

### 4.5 MulVAL: connect facts and rules, not merely natural-language similarity

MulVAL, by Ou, Govindavajhala, and Appel, represented vulnerabilities, network configuration, and privilege models as Datalog facts and inference rules.[^4] It was designed for multihost, multistage analysis and demonstrated that logical reasoning could be applied to networks containing thousands of machines once the relevant facts were collected.

The exact predicates and capability-to-precondition joins in this Skill are a deliberately smaller, practitioner-oriented version of the same idea. The LLM may normalize unstructured evidence into predicates, but path construction should operate on explicit facts and rules wherever possible. This is also why natural-language similarity alone must not create an edge.

### 4.6 Sarraute et al.: real penetration testing is partially observable

Sarraute, Buffet, and Hoffmann modeled penetration testing as a POMDP in 2012.[^7] An attacker does not fully know the target configuration, so information-gathering actions such as scanning must be planned alongside exploits. The model honestly represents uncertainty and attacker knowledge, but the authors also state that the accurate POMDP solution does not scale; they decompose the problem into per-machine plans and compose them at the network level.

This explains why `unknown` and `hypothetical` facts must remain visible. A real attack scenario is not pathfinding in a fully known world. It is a plan that also accounts for **what is unknown and which observation would reduce that uncertainty**.

### 4.7 Helmert: reduce difficult search with heuristics and causal structure

Malte Helmert's Fast Downward planning system uses causal graphs, hierarchical decomposition, preferred operators, and multiple heuristic search techniques.[^8] High theoretical complexity does not imply that every state must be enumerated blindly. Practical planners survive by identifying causal structure and pruning unpromising branches early.

The bounded depth, backward search, top-k retention, and preference for adjacent components or trust boundaries proposed here are not an implementation of Fast Downward, but they follow the same practical philosophy.

The relationship between the literature and the Skill can be summarized as follows.

| Research lesson | Skill design choice |
|---|---|
| General planning is computationally difficult | Bound depth and top-k; state non-exhaustiveness explicitly |
| Attack paths require state-transition models | Normalize findings as `Preconditions -> Effects` |
| Monotonic reachability is easier to compute | Apply forward closure only to persistent capabilities |
| Defense is about conditions that cut paths | Report blockers and missing preconditions as first-class outputs |
| Explicit facts and rules scale better | Use exact predicate joins and constrained rules |
| Real environments are partially observable | Preserve evidence grades, hypotheses, and validation actions |
| Large spaces require heuristics | Use goal-directed backward search and prefer short candidates |

![Why attack-path search is difficult](/images/post/attack-path-synthesizer/search-space.webp)

*The hard part is not only finding vulnerabilities. It is navigating a huge search space, separating tractable joins from combinatorial explosion, and deciding which high-value branch deserves deeper validation.*

## 5. What human intuition is actually doing

Experienced analysts do not consciously enumerate hundreds of combinations. They use knowledge of architecture, protocols, and common implementation patterns to discard most of the search space immediately.

Consider an SSRF primitive whose initial destination is limited to an external URL. An analyst may quickly ask:

> What if the application validates only the initial URL, follows a 302 redirect, and never validates the final destination?

That leap is not random creativity. It compresses several priors:

- HTTP clients often follow redirects automatically.
- URL validation is sometimes performed only on the original input.
- The validated URL and the final network destination can differ.
- Missing post-redirect validation is a recurring SSRF bypass pattern.

Human intuition is therefore less about solving an exponential space and more about rapidly deciding which parts of that space are not worth exploring. AI is not yet a reliable substitute for this architecture-specific judgment. It can, however, systematically expand and verify the narrower region selected by a human.

## 6. What exactly is “state”?

A natural question is whether state means application state or the phase of an attack. Neither description is precise enough.

In this model, state means:

> **The security-relevant state of the system from the attacker's perspective: what the attacker currently knows, can reach, possesses, or can do, together with system conditions that enable or block later actions.**

The state can be divided into five categories.

1. **Attacker capabilities**: submit a URL, issue a request, write a file, execute a command, read a response
2. **Reachability**: accessible hosts, ports, APIs, network zones, trust boundaries
3. **Knowledge**: internal endpoints, API paths, object identifiers, account names, secret locations
4. **Credentials and privileges**: sessions, tokens, service accounts, roles, administrative rights
5. **System conditions**: redirect behavior, validation order, configuration, deployment facts, policy enforcement

An initial state might look like this:

```text
cap:submit_external_url
condition:server_can_access_internet
condition:no_direct_internal_access
condition:no_admin_credential
condition:redirect_revalidation_unknown
```

This is more useful than labels such as “reconnaissance” or “initial access.” Phase labels describe a narrative stage, but atomic predicates can be matched directly against the requirements of later actions.

## 7. A vulnerability is an operation that changes state

The core abstraction is compact:

```text
finding or action = Preconditions -> Effects
attack path = a sequence of justified state transitions
```

Each finding should contain at least the following fields:

```yaml
id: C-001
title: Server fetches a user-supplied external URL
preconditions:
  - cap:submit_external_url
effects:
  - cap:server_http_fetch
scope:
  - service:repository
persistence: request
confidence: verified
evidence:
  - PoC request and server log
blockers: []
```

The `Effect` field alone is insufficient.

- **Precondition**: what must already be true
- **Effect**: the new capability or state created by success
- **Scope**: the principal and boundary within which the capability is valid
- **Persistence**: persistent, session-bound, request-bound, one-time, or race-window
- **Evidence**: code, configuration, log, runtime behavior, or PoC supporting the claim
- **Confidence**: verified, supported, inferred, hypothetical, or contradicted

Converting natural-language reports into this structure is the most important preprocessing step. A sophisticated planner operating on an inaccurate state model will still produce nothing more than plausible stories.

## 8. Connecting SSRF and redirect behavior as state transitions

The example used in the discussion can be simplified as follows.

### C-001: Server-side HTTP request

```text
Precondition:
- The attacker can specify an external URL.

Effect:
- The server process sends an HTTP request to that URL.

Limitation:
- The initial destination is restricted to an external URL.
```

### C-002: Redirect destination control without final-URL revalidation

```text
Precondition:
- The attacker controls the initial HTTP response.
- The server HTTP client follows redirects.

Effect:
- The attacker controls the final request destination.
- An internal address can be selected after the redirect.

Required evidence:
- The final URL is not revalidated before the request is sent.
```

The combined transition becomes:

```text
Initial state
  cap:submit_external_url

Execute C-001
  + cap:server_http_fetch

Combine C-002
  + control:redirect_destination
  + condition:final_url_not_revalidated
  + cap:internal_http_request

Possible follow-on states
  reach:internal_service
  -> access metadata or an internal API
  -> possibly obtain credentials
  -> possibly escalate privileges or execute code
```

The final steps are not automatically true. The analyst must still verify that an internal service exists, the response is observable, a credential is returned, and the credential is usable in the required scope.

The meaningful result of the combination is the creation of a new capability: **a server-side request to an attacker-selected internal address**. That change, rather than the mere presence of two findings, is what makes the chain interesting.

![State transition and SSRF example attack-path infographic](/images/post/attack-path-synthesizer/state-transition-ssrf.webp)

*A consolidated view of the method: turn findings into state transitions, separate tractable joins from hard search regions, use bounded search and pruning, and validate the high-value SSRF plus redirect path with evidence.*

## 9. What AI should and should not do

An instruction such as “combine all findings and identify the most dangerous attack scenario” invites two failure modes: unsupported exploit edges and important omissions.

A more reliable system gives AI a narrower role.

### Tasks AI can perform well

1. Normalize reports into preconditions, effects, scope, persistence, and evidence.
2. Enumerate cases where an effect of A directly satisfies a precondition of B.
3. Prioritize joins within the same component or an adjacent trust boundary.
4. Trace backward from a high-value objective to required preconditions.
5. Identify missing facts, blockers, scope jumps, and identity jumps.
6. Propose the smallest code, configuration, log, or runtime check for each hypothesis.
7. Rank candidates by evidence strength, path length, assumptions, and validation cost.

### Tasks that should not be trusted without review

1. Claiming exhaustive attack-path discovery without strict bounds.
2. Connecting identically named capabilities without verifying scope.
3. Transferring privileges across users, processes, or tenants implicitly.
4. Treating a request-bound effect as a permanent capability.
5. Assuming redirect, proxy, DNS, or authentication behavior without evidence.
6. Concatenating impact statements and calling the result a new attack scenario.
7. Presenting a hypothesis as a verified fact.

AI is most useful here as a **predicate extractor, direct-join enumerator, hypothesis generator, evidence organizer, and verification assistant**, not as an unconstrained autonomous attack planner.

## 10. Search for short, valuable paths instead of every path

Most real assessments do not require a complete or optimal attack graph. A small set of high-quality candidates that a human can validate is more useful.

Practical defaults include:

```text
Objectives:
- internal service reachability
- secret or credential access
- privilege escalation
- trust-boundary or tenant crossing
- arbitrary file write
- arbitrary code execution
- supply-chain artifact modification

Bounds:
- maximum depth: 2-4
- retain the top 10-20 candidates
- prefer verified and direct edges
- prefer the same component or adjacent boundaries
- remove steps that create no new capability
- penalize chains with many hypothetical edges
```

Goal-directed backward search is usually more useful than unrestricted forward enumeration.

```text
Goal: goal:arbitrary_code_execution
  <- Which preconditions are required?
  <- Which findings can supply them?
  <- What is still missing?
  <- What is the cheapest decisive validation step?
```

Ammann and colleagues showed that assuming monotonicity—that a successful attacker action does not invalidate previously obtained capabilities—can dramatically simplify attack-graph analysis.[^3] MulVAL represented vulnerabilities, configurations, and privilege models as Datalog facts and rules to reason about multistage network attacks.[^4]

Real applications still contain non-monotonic conditions: expiring sessions, one-time tokens, restarts, race windows, and request-local capabilities. Forward closure should therefore be applied only when persistence and timing justify it.

## 11. A realistic division of labor between humans and AI

The most practical collaboration looks like this.

### Human responsibilities

- Choose the assets and outcomes that matter.
- Identify suspicious architecture and trust boundaries.
- Supply implementation-specific leaps such as a 302 redirector hypothesis.
- Decide which hypotheses justify validation cost.
- Judge business impact and operational risk.
- Control authorization, safety, and destructive-test boundaries.

### AI responsibilities

- Convert findings into consistent state transitions.
- Enumerate directly connectable candidates without omissions.
- Perform bounded forward or backward search.
- Detect missing preconditions, scope jumps, and identity jumps.
- Produce a verification and falsification plan for each hypothesis.
- Maintain a consistent evidence-backed analysis record.

The division can be summarized in one sentence:

> Humans provide high-value objectives and priors that collapse the search space; AI systematically explores that smaller space and prevents easy causal joins from being missed.

## 12. What recent LLM pentesting research suggests

Recent work is also moving away from the idea that a single LLM should own the entire plan. The more promising direction combines **a structured planner with an LLM-based executor and perceptor**.

The 2025 CHECKMATE preprint decomposes automated penetration testing into a Planner, Executor, and Perceptor.[^9] The authors report that LLM agents struggle with coherent long-horizon planning, complex reasoning, and effective use of specialized tools, then use dynamically updated classical planning as an external structured “brain.” On a benchmark of 120 anonymized Vulhub containers, they report more than a 20% improvement in success rate over a Claude Code baseline and reductions of more than 50% in both time and monetary cost.

Those results are important, but their scope should not be overstated. Vulhub primarily provides known, single-application vulnerable environments, and the paper notes that the dataset may not contain the paths needed to evaluate lateral movement or more complex chains. CHECKMATE therefore supports the claim that **structured state and precondition/effect planning can improve LLM long-horizon behavior**. It does not prove that novel vulnerabilities discovered independently can now be creatively chained without human priors.

APT-Agent, published as a 2026 preprint, combines a hallucinated-command rectification module with command-specific memory.[^10] It was evaluated against seven vulnerable services in Metasploitable 2, where the authors report an 84.29% end-to-end exploitation success rate. This shows that reconnaissance, exploitation, and follow-on execution can be orchestrated more reliably. It is still different from inventing an unknown semantic bridge between two independently discovered findings.

The practical conclusion from both papers is:

```text
LLM-only planning
  -> flexible, but vulnerable to state loss, repetition, and hallucination

Classical planning alone
  -> logically structured, but weak at unstructured evidence and dynamic reality

Structured state + bounded planner + LLM
  -> the most realistic current compromise
```

`Attack Path Synthesizer` follows the same division. The LLM extracts predicates and hypotheses from reports and code; exact joins and bounded search handle deterministic structure; and the human supplies objectives, architecture-specific priors, and final validation.

### 12.1 Frontier AI can discover novel attack paths—and still miss the branch an expert sees

The OpenAI–Hugging Face model-evaluation incident makes this point sharper, not weaker.[^11] OpenAI says the incident was driven by a combination of GPT-5.6 Sol and a stronger internal pre-release model running with reduced cyber refusals for evaluation. The evaluation environment did not provide direct Internet access; network access was constrained to package installation through an internally hosted package-registry proxy/cache. OpenAI says the models identified and exploited a previously unknown zero-day in Artifactory, obtained Internet access, performed privilege escalation and lateral movement inside the research environment, inferred that Hugging Face might host ExploitGym-related models, datasets, or solutions, and then chained stolen credentials and zero-day vulnerabilities into a remote-code-execution path on Hugging Face servers.

That is not merely "static analysis found a few bugs." Under a narrow objective, with enough tools, execution feedback, and inference budget, frontier models can now build and execute serious long-horizon attack paths.

The official CVE records also matter, but they must be read precisely. The records credit OpenAI researchers for multiple Artifactory vulnerabilities: Amy Burnett for CVE-2026-65924, CVE-2026-66014, and CVE-2026-66015; Khai Tran for CVE-2026-65923 and CVE-2026-66018; Matthew Bryant for CVE-2026-65925 and CVE-2026-65921; and Kostya Kortchinsky for CVE-2026-65617.[^12] However, a CVE credit line is not the same as proof that every one of those vulnerabilities was independently discovered by the model alone. The official OpenAI post explicitly attributes the package-cache proxy zero-day and the resulting attack path to the models. The broader CVE set should be described as OpenAI-credited Artifactory vulnerabilities unless a primary source maps each individual CVE to model-only discovery.

This does not invalidate the human-prior argument. It shows why the argument needs to be more precise.

```text
Frontier AI advantage:
- broad code and behavior exploration
- persistent execution over long horizons
- repeated hypothesis testing
- path expansion after a useful success signal

Human expert advantage:
- selecting the right abstraction early
- noticing product-level trust boundaries
- asking rare but high-value questions
- connecting differently named behaviors by meaning
- judging whether a path matters in the real system
```

The redirect-based branch that motivated this article is a good example. The decisive leap is not merely:

```text
attacker can submit an external URL
```

It is:

```text
the attacker controls the server behind that URL
  -> therefore controls the 302 response
  -> therefore may control the final destination
  -> therefore final-URL revalidation becomes the real question
```

That is a compressed product and protocol prior: a package or repository proxy is a trusted egress boundary; HTTP clients commonly follow redirects; validation may happen only on the first URL; and the attacker-controlled upstream response can change the security meaning of the request. A model that finds many valid vulnerabilities may still never enter that branch if the branch is not made salient by the objective, early observations, or prompt structure.

The practical lesson is:

> **Finding many vulnerabilities does not mean the search was exhaustive. Success is path-dependent.**

The versioning language around this incident also needs care. It is too broad to say that every self-hosted install below 7.161.15 is affected by every issue. The CVE records split affected ranges by maintained branch, such as `<7.111.18`, `7.117.x <7.117.25`, `7.125.x <7.125.18`, `7.133.x <7.133.27`, `7.146.x <7.146.34`, and `7.161.x <7.161.15`; CVE-2026-66015 and CVE-2026-66018 list only the 7.146 and 7.161 branches. The safer wording is: **the vulnerabilities were fixed across multiple maintained Artifactory release branches, including 7.146.34 and 7.161.15, and affected ranges vary by CVE.**

## 13. Why turn the discussion into a Skill?

A useful conclusion reached in one conversation is not automatically applied in the next assessment. To make the process reusable, I packaged it as a ChatGPT Skill named `Attack Path Synthesizer`.

The Skill enforces the following principles:

1. Model findings as attacker-relevant security state transitions.
2. Separate verified facts from hypotheses.
3. Find direct capability-to-precondition joins first.
4. Reject edges with unjustified scope, identity, persistence, or timing transitions.
5. Prefer short, high-value candidates with a default maximum depth of four.
6. Never claim exhaustive path discovery.
7. Preserve blocked and rejected paths as part of the result.

The package contains:

```text
attack-path-synthesizer/
├── SKILL.md
├── agents/openai.yaml
├── scripts/
│   └── build_attack_graph.py
├── references/
│   ├── state-model.md
│   ├── chaining-rules.md
│   ├── output-template.md
│   └── examples.md
└── assets/
    ├── finding-input-template.json
    ├── security-state-transition-infographic.png
    └── security-state-transition-infographic.svg
```

The latest Skill, source, and change history are maintained in the GitHub repository.

[Attack Path Synthesizer on GitHub](https://github.com/windshock/attack-path-synthesizer)

## 14. What the included path builder does—and does not do

`build_attack_graph.py` accepts findings already normalized into exact predicates and performs the following operations:

- Calculate direct joins where an effect exactly matches another finding's precondition.
- Apply available findings from an initial state with a bounded depth.
- Report reachable objectives and top-ranked paths.
- Report preconditions that remain unreachable as blockers.
- Use confidence labels as a basic path-ranking signal.

Example:

```bash
python scripts/build_attack_graph.py input.json \
  --max-depth 4 \
  --top-k 10 \
  --output result.json
```

The script deliberately does not pretend to be a semantic reasoner.

```text
cap:server_http_fetch
cap:http_request_from_server
```

Even if two predicates appear semantically similar, the script will not merge them when their strings differ. It also cannot decide whether an identity or scope transition is valid. Findings must first be normalized into atomic, reviewable predicates, and every returned edge must be manually reviewed.

This limitation is also a safety property. Free semantic inference may improve recall, but it also increases the probability of inventing attack paths that do not exist.

## 15. How the result should be reported

A useful attack-path analysis should not present only one dramatic narrative. It should include enough structure to distinguish facts, assumptions, and unresolved questions.

```text
1. Normalized state transitions
2. Directly connected finding pairs
3. Top candidate paths
4. Evidence grade for every edge
5. Missing preconditions
6. Explicit blockers and contradictions
7. The smallest next verification step
8. A limitation statement describing search depth and non-exhaustiveness
```

A candidate can be expressed as follows:

```text
Candidate Path P-01
C-001 -> C-002 -> Internal API Access

Verified edges:
- C-001 creates cap:server_http_fetch
- C-002 enables control:redirect_destination

Hypothetical edge:
- condition:final_url_not_revalidated

Missing precondition:
- know:internal_api_endpoint

Next verification:
- Trace redirect handling and final URL validation in the HTTP client.
- Capture the outbound destination after a controlled 302 response.

Verdict:
- Plausible but not yet verified.
```

This format discourages plausible storytelling and tells the analyst exactly what evidence is still required.

## 16. What remains unsolved

This approach is practical, but it does not solve general attack-path discovery.

First, extracting accurate predicates from natural-language findings is itself difficult. Identical words may refer to different scopes, and crucial preconditions may be omitted from the report.

Second, inventing an unknown intermediate action still depends heavily on human experience. AI can learn recurring patterns such as redirects, parser differentials, credential reuse, and deployment artifacts, but it cannot be assumed to infer every environment-specific mechanism correctly.

Third, real attack state is non-monotonic. Sessions expire, tokens are consumed, race windows close, and one action may prevent another.

Fourth, technical reachability and security impact are different. Reaching an internal API does not automatically imply data theft or code execution. Asset value and business context require separate judgment.

The purpose of the Skill is therefore not to claim that AI can automatically invent better attack scenarios than an experienced human.

> Its purpose is to prevent nearby joins from being missed, narrow promising hypotheses through evidence, and let humans spend deeper attention on fewer candidates.

## 17. Conclusion

The original question was whether there is an efficient way for AI to combine individual vulnerabilities into meaningful penetration scenarios—or whether no such method really exists.

Both sides of the answer matter.

Frontier AI systems can now discover and execute real multistep attack paths under specific goals, tool access, feedback, and inference budgets. That raises the bar for defenders. It does not make the search exhaustive, and it does not remove path dependence.

There is still no general solution that can efficiently and completely discover novel, meaningful attack paths from an arbitrary set of findings. Human intuition remains strong at using architecture and implementation knowledge to collapse the search space.

Yet important parts are automatable. Findings can be modeled as state transitions, direct effect-to-precondition joins can be computed, valuable objectives can be traced backward under strict depth limits, and missing preconditions and evidence grades can be managed systematically.

The final takeaway is:

> **Do not ask AI, without structure, to invent a complete attack scenario. Structure vulnerabilities as attacker-relevant security state transitions, let machines find nearby causal joins, and use human intuition to select and deeply validate the high-value directions.**

---

## References

[^1]: Tom Bylander, “The Computational Complexity of Propositional STRIPS Planning,” *Artificial Intelligence*, Vol. 69, 1994. <https://doi.org/10.1016/0004-3702(94)90081-7>
[^2]: Oleg Sheyner, Joshua Haines, Somesh Jha, Richard Lippmann, and Jeannette M. Wing, “Automated Generation and Analysis of Attack Graphs,” IEEE Symposium on Security and Privacy, 2002. <https://doi.org/10.1109/SECPRI.2002.1004377>
[^3]: Paul Ammann, Duminda Wijesekera, and Saket Kaushik, “Scalable, Graph-Based Network Vulnerability Analysis,” ACM CCS, 2002. <https://doi.org/10.1145/586110.586140>
[^4]: Xinming Ou, Sudhakar Govindavajhala, and Andrew W. Appel, “MulVAL: A Logic-based Network Security Analyzer,” USENIX Security, 2005. <https://www.usenix.org/conference/14th-usenix-security-symposium/mulval-logic-based-network-security-analyzer>
[^5]: Steven Noel, Sushil Jajodia, Brian O'Berry, and Michael Jacobs, “Efficient Minimum-Cost Network Hardening via Exploit Dependency Graphs,” ACSAC, 2003. <https://doi.org/10.1109/CSAC.2003.1254313>
[^6]: Lingyu Wang, Steven Noel, and Sushil Jajodia, “Minimum-Cost Network Hardening Using Attack Graphs,” *Computer Communications*, Vol. 29, No. 18, 2006. <https://doi.org/10.1016/j.comcom.2006.06.018>
[^7]: Carlos Sarraute, Olivier Buffet, and Jörg Hoffmann, “POMDPs Make Better Hackers: Accounting for Uncertainty in Penetration Testing,” AAAI, 2012. <https://doi.org/10.1609/aaai.v26i1.8363>
[^8]: Malte Helmert, “The Fast Downward Planning System,” *Journal of Artificial Intelligence Research*, Vol. 26, 2006. <https://doi.org/10.1613/jair.1705>
[^9]: Lingzhi Wang et al., “Automated Penetration Testing with LLM Agents and Classical Planning,” arXiv:2512.11143, 2025. <https://arxiv.org/abs/2512.11143>
[^10]: William Guanting Li, Alsharif Abuadbba, Kristen Moore, and Dan Dongseong Kim, “APT-Agent: Automated Penetration Testing using Large Language Models,” arXiv:2605.24949, 2026. <https://arxiv.org/abs/2605.24949>
[^11]: OpenAI, “OpenAI and Hugging Face partner to address security incident during model evaluation,” July 21, 2026, updated July 28-29, 2026. <https://openai.com/index/hugging-face-model-evaluation-security-incident/>
[^12]: CVE records via the CVE Services API: CVE-2026-65924 <https://cveawg.mitre.org/api/cve/CVE-2026-65924>, CVE-2026-66014 <https://cveawg.mitre.org/api/cve/CVE-2026-66014>, CVE-2026-66015 <https://cveawg.mitre.org/api/cve/CVE-2026-66015>, CVE-2026-65923 <https://cveawg.mitre.org/api/cve/CVE-2026-65923>, CVE-2026-66018 <https://cveawg.mitre.org/api/cve/CVE-2026-66018>, CVE-2026-65925 <https://cveawg.mitre.org/api/cve/CVE-2026-65925>, CVE-2026-65921 <https://cveawg.mitre.org/api/cve/CVE-2026-65921>, CVE-2026-65617 <https://cveawg.mitre.org/api/cve/CVE-2026-65617>.
