---
title: "An Audit Workflow Survives Only When It Absorbs Misses — Eight Reinforcements to sec-audit-static v2.0"
date: 2026-05-19
draft: false
featured: true
tags: ["Security Automation", "Static Analysis", "Joern", "Semgrep", "Process Design", "Code"]
categories: ["Security Research"]
description: "I designed sec-audit-static workflow v2.0, ran it against a real auth-server codebase, and missed two things. This is the record of how those misses were folded back into the tool — through v2.8."
---

I audited an authentication backend. The workflow scanned only the primary service module and never noticed that a sibling module (a peer module sitting next to it in the same repository) had a controller returning AES key and iv directly in the `/appserver/0002.json` response. The same repository contained a cipher utility class with that key and iv hard-coded. You could not reach the conclusion "the key is exposed" without seeing both files together — and v2.0's default snapshot scope does not see the sibling module.

This post is the record of that breakage — what broke, what I rewrote. The `sec-audit-static` workflow that started as v2.0 received reinforcements all the way to v2.8 after a single real-world run.

> **oh-my-secuaudit series** ([post 3](/en/post/2026-04-15-security-code-clustering/) showed the concrete structure — 228 endpoints reduced to 5 clusters. This post is about the place where that structure broke on the next audit.)
> 1. [Security Testing as Code — Structuring Assessment as Code](/en/post/2026-03-17-security-testing-as-code/)
> 2. [Structure Builders Will Outlast Vulnerability Finders](/en/post/2026-04-02-security-from-sense-to-structure/)
> 3. [How I Turned 228 Endpoints into 5 Clusters](/en/post/2026-04-15-security-code-clustering/)
> 4. **An Audit Workflow Survives Only When It Absorbs Misses** ← current post

The takeaway is simple.

> **Trust in an audit tool comes from how the tool records itself.**
> **That record is built by miss cases.**

*Module names in this post are anonymized as `api-svc` (primary service module) and `data-svc` (sibling DB-side module), used consistently throughout. Quoted JSON metadata has been renamed to match. The real operational metadata uses different internal names.*

---

## 0. Before v2.0 — The Workflow Didn't Remember Itself

`sec-audit-static` didn't start at v2.0.

The clustering from [post 3](/en/post/2026-04-15-security-code-clustering/) cut down *where* to look. 228 endpoints folded into 5 clusters makes the human entry point obvious. But pick one candidate inside a cluster, drop down to "does source→sink reachability actually exist here?" — and the workflow was breaking.

Early sec-audit-static was a loose chain of tools.

- **Humans stitched results.** Semgrep for pattern matching, Zoekt/rg for retrieval, Joern for call graphs — each run separately, results merged in someone's head. Run the same analysis two weeks later and the merge shape differed.
- **Edge provenance wasn't recorded.** When a candidate came back "reachable," no one could tell whether the call came from Joern's call graph or from a plain grep hit. Treating grep and Joern as equals piles up false positives.
- **"Unknown" was one bucket.** Every blocked finding got the same label — context shortage? Dynamic dispatch? Tooling error? You couldn't tell what to fix first.
- **LLM context was whole-function copy.** Code unrelated to the taint flow got dragged in, blowing the token budget or causing the model to read the wrong branch and answer wrong.
- **Decompiled output lived in a parallel world.** CFR results were analyzed in a separate tree, with no link back to source. The same function present on both sides didn't propagate verdicts across.

In short: **the workflow worked, but it didn't remember itself.** The same candidate received different verdicts each run, and no one could show the basis from a single place.

v2.0 was the response. Almost the same tool stack. What changed was the contract for *where to record results and how to link them.*

---

## 1. What v2.0 Promised

`sec-audit-static` is a workflow for confirming source→sink reachability across large codebases that mix source and decompiled artifacts. v2.0 folded the five problems above into five promises.

**1) State Store** — every candidate gets a single ID. Operational metadata (run, snapshot scope, provenance log) lives in a single SQLite file; per-candidate evidence (slices, coverage JSON, finding report) lives as files in the same state directory. SQLite + the state directory sit in one folder, cross-referenced by candidate ID. ("Everything in one DB" is overstating it — "metadata in DB, evidence in files, same folder, same ID" is closer to truth, and this distinction reappears in §4.)

**2) Edge tier — handling the call-graph gap** — call-graph edges record their source in three tiers.

| Source | Default confidence | When used |
|--------|--------------------|-----------|
| Joern CPG snapshot | 0.9 | Primary |
| LSP | 0.6 | Secondary fallback |
| rg / ctags / grep-family | 0.3 | Tertiary; cannot promote to report alone |

Why multiple tiers, though? Mix Spring MVC, DI, annotation routing, Kotlin/Java + decompiled artifacts, and the high-confidence graph fails to draw some of the real paths. Reading "no edge" as "unreachable" produces false negatives — and promoting a finding off a bare rg hit produces false positives. So lower tiers fill in the gaps, but cannot promote a finding on their own.

**3) Program slicing** — the plan promised "backward/forward slicing around taint-relevant variables, with a 3-level fallback (same-function → data-only → 2-hop)." The implementation is a smaller promise — sink-line-centered window slicing with budget auto-tune (defaults: 120 lines / 1.5k tokens, max 200 lines). §3 covers why it retreated this way.

**4) Facet schema — turning candidates into sortable events** — every candidate must carry three tags: `layer` (controller/service/dao/util), `boundary` (external/network/file/deserialization), `sink_class` (exec/eval/sql/fs/net/deserialize). Use explicit `unknown_*` when uncertain.

The reason is simple. The same "key exposure" reads very differently depending on where it sits: at a controller returning an external response (Miss 1's `/appserver/0002.json`) versus as a constant inside a util class (`AesCipherUtil.java`'s hard-coded key/iv). Priority and verification path diverge. Forcing the three tags turns a candidate from a "matched string" into a sortable event — "at which layer, crossing what boundary, into which sink_class is this dangerous" — and that sortability is what feeds the report, the priority queue, and the rerun trigger.

**5) Unknown taxonomy** — don't bucket `unknown` into one pile.

- `unknown_no_edges`
- `unknown_dynamic_dispatch`
- `unknown_context_budget`
- `unknown_needs_runtime`
- `unknown_tooling_error`

Goal: make "why it got stuck" queryable.

On paper it was clean. It worked. Until I ran it on one auth-server codebase.

---

## 2. The Real Audit: I Missed Two Things

The target was a mobile-wallet auth backend. Spring MVC + Kotlin/Java WAR modules built by Maven — a primary service module (`api-svc`) and a separate DB-side module (`data-svc`) sitting as siblings in the same repository. Around 500 source files, dozens of numbered interface units (`IF5xxx.kt` style).

I ran v2.0 as-is. `snapshot_scope` defaulted to `module`, scoped to `api-svc`. Joern snapshot, Zoekt index, Semgrep rules — all green. The report looked clean.

The next day I realized I had missed two things.

### Miss 1 — Auth-Key Exposure: The Module Scope Hid It

The built-in `sec-audit-static` ruleset catches auth bypass (`@Certification(false)`), authKey TTL, whitelisted command codes. But the truly dangerous endpoint lived in a sibling module.

```
api-svc/...  ← what v2.0 looked at
data-svc/src/main/java/.../common/controller/CommonController.java
  └─ POST /appserver/0002.json (getAuthkeyInfo)
       returned AES key/iv directly in the response
```

A scanner that only sees `api-svc` cannot put `data-svc`'s `getAuthkeyInfo` endpoint in scope. Worse, `data-svc/src/main/java/.../util/AesCipherUtil.java` contained the same key/iv hard-coded. Without seeing both files together, you cannot reach the conclusion "the key is exposed."

Three causes:

1. **Scope trap**: `snapshot_scope=module` is good for confidence and reproducibility, but it structurally cannot see sibling-module exposure.
2. **Ruleset blind spot**: there were rules for auth-bypass and TTL, but no dedicated detector for the *combination* "key-info endpoint + hard-coded key/iv."
3. **Evidence-to-structure gap**: a human verified the runtime response contained the key, but there was no deterministic step that promoted that observation into a structured task finding.

### Miss 2 — Mixed-Category Report: Task-Level Classification Collapsed

On a different task, a single task file produced findings spanning both Data Protection (section 4) and Auth/Authorization (section 6). That's natural — auth weakness *caused* the information leak, so they belong in one task.

The problem was `generate_finding_report.py`. It inferred category at **task-file level** (`task_id`/filename). When 4-x and 6-x findings shared a task, they were flattened into one section. A first-time reader of the report would ask, "why is a data-protection finding sitting under auth?"

Separately, one finding narrative said "without authentication" based on a static signal (`@Certification(false)`), while the runtime evidence labeled it `*_with_auth` (reached *after* authentication). Text and evidence contradicted each other in the published report.

These two misses are different in kind from v2.0's promises. v2.0 explicitly set `snapshot_scope=module` as the default and stated that sibling modules belong to *separate runs* — so Miss 1 is not *outside* the promise, it is **the intended limitation of the module-scoped default surfacing as a real-world miss**. Miss 2 is simpler — it broke in report category classification, a place the plan does not touch at all. **The promises themselves aren't wrong, but new misses start at the boundary of a promise or in places the promise never reached.**

---

## 3. v2.1 – v2.8: Rewriting the Tool from the Result

v2.1 through v2.5 are batches of ten review items each — fifty total — that read more like thought experiments about how the promises break in operation than like code changes. CI fail-fast, SLOs, rollback policies, snapshot.hash, edge confidence thresholds, slice budget auto-tune, plan-vs-implementation lint, and so on. v2.6 is where the seven highest-priority items actually went into code. v2.7 and v2.8 are misses that a single real-world run created.

Pared down to what actually landed in code, the table is three rows.

| Version | What landed | Trigger |
|---------|-------------|---------|
| v2.6 | edge rebuild + logging, slice auto-tune, fuzz gate execution, report surfacing, CI summary contract, decompile parity gate, unknown evidence autopopulate | Executing the v2.1 – v2.5 thought experiments |
| **v2.7** | `scan_authkey_exposure.py` + sibling auto-inclusion | **This audit's Miss 1 (key exposure)** |
| **v2.8** | Per-finding category reclassification + `check_finding_consistency.py` | **This audit's Miss 2 (mixed-category report)** |

(The full fifty review items across v2.1 – v2.5 are in [`workflow_comparison.md`](https://github.com/windshock/oh-my-secuaudit/blob/main/plugins/oh-my-secuaudit/skills/sec-audit-static/references/workflow_comparison.md) in the oh-my-secuaudit repository.)

The rest of this section covers v2.7 and v2.8, with the v2.6 reinforcements grouped between.



### v2.7 — Key-exposure detector + sibling auto-inclusion

Added `tools/scripts/scan_authkey_exposure.py`. It looks at two signals together.

- Path patterns: `/appserver/0002.json`, function names like `getAuthkeyInfo` and isomorphic variants
- Material patterns: hard-coded key/iv in source/test/build/config

Inside `run_static_audit.sh`, step `[6.5] auth/key exposure scan` was inserted. When the primary repo name starts with `api-svc*`, the runner automatically pulls in the sibling `data-svc` via `--extra-repo`. The operator doesn't have to remember.

```bash
echo "[6.5] auth/key exposure scan"
# auto-include sibling data-svc when primary is api-svc*
# ...
python "$ROOT/tools/scripts/scan_authkey_exposure.py" \
  --repos "$REPO" "${EXTRA_REPOS[@]}" \
  --state "$STATE" --run-id "$RUN_ID"
```

The point isn't the detector itself. The point is that **the runner now refuses to let the operator repeat the same miss.**

### v2.8 — Category lives at the finding level

`generate_finding_report.py` was rewritten:

- Category resolution order is now **per-finding `category` field → task-level fallback** (inverted from before).
- After aggregation, display IDs (`4-1`, `4-2`, `6-1`, ...) are reassigned per category. Mixed task files no longer collapse.
- A new `tools/scripts/check_finding_consistency.py` warns on (a) static-narrative vs runtime-evidence contradictions, and (b) mixed-category task files that look flattened.
- The consistency check is wired into the `run_static_audit.sh` enrichment phase, so it runs automatically.

Between v2.7 and v2.8, several smaller reinforcements landed for the same reason. Every gap discovered once must be re-discovered automatically on the next run.

- **Edge rebuild + logging** — `snapshot.hash` is stored; if HEAD changes, Joern/Zoekt caches auto-invalidate. Grep-only edges with confidence < 0.3 cannot promote to the report.
- **Slice auto-tune** — if slicing overflows twice, the budget bumps 120 → 200; if it still overflows, the candidate is closed as `unknown_context_budget` with the cap logged. Here the honest footnote §1 deferred. The plan's "taint-relevant backward/forward + 3-level fallback" retreated, in the implementation (`slice_context.py`), to sink-line-centered windowing with budget auto-tune. This is not laziness, it is a realistic compromise — mix Kotlin coroutines, decompiled Java, Spring DI, and reflection, and Joern's dfg stage breaks routinely. In this audit, CPG had to be rebuilt five times, and the taint output lives in an `_adjusted` sibling because raw results needed manual cleanup. Dropping the dfg dependency in favor of "works as long as you have a file and a line" is a judgment of accuracy-loss < operational-viability. **Recording where the tool falls short of its own spec is *also* part of v2.0.**
- **Fuzz gate execution** — high-risk unknowns get a 10–30 minute fuzz pass; cmd/seed/coverage are written to the State Store.
- **Decompile parity gate** — decompile parity comparison itself was a requirement well before v2.0. What v2.5 / v2.6 added is the *gate* — if the decompile pass is skipped, `decompile_status=skipped` is recorded at run level and the run cannot be marked "complete" without a waiver file. Not a new promise; the existing one given an execution mechanism.
- **CI summary contract** — the runner emits a machine-readable summary JSON; CI parses it to decide pass/fail.

Eight reinforcements in one line:

> **"Anything a human missed once must be blocked automatically the next run."**

---

## 4. What v2.x Looks Like in Operation

Here is the `audit_summary.json` from a fresh run.

```json
{
  "run_id": "8ca340c0-b26d-4ce4-8059-0b148ad70847",
  "run_label": "20260227-api-svc-module-rerun2",
  "snapshot_scope": "module",
  "repo_head": "f42e318a...",
  "fail_count": 0,
  "quarantine": [],
  "skips": [],
  "unknown_count": 0,
  "decompile_status": "done"
}
```

The two lines I care about most are `run_label` and `snapshot_scope`. The label format is enforced as `YYYYMMDD-<repo>-<scope>[-<suffix>]` (regex: `^[0-9]{8}-.+-[A-Za-z0-9_-]+$`) — bad labels never start a run. The `rerun2` suffix above lets a same-day, same-module rerun be distinguished from the first. With labels enforced, two identical runs cannot exist, and comparison becomes possible. The `snapshot_scope` field stores the plan's `module-scoped` / `repo-wide` as the shorter `module` / `repo` (with `decompiled-module` for the decompiled variant).

The slice quality report from the same run:

```json
{
  "total_slices": 8,
  "sample_rate": 0.05,
  "sampled_count": 1,
  "average_score": 100.0
}
```

5% of slices are auto-scored; in this run, one was sampled, with zero truncation markers. This is the artifact added in v2.5 — if quality drops below threshold, an alert fires.

zoekt is the primary code search engine, with rg as fallback. A benchmark on the same repository:

| Case | rg (s) | zoekt (s) | Hits (identical) | Token estimate (identical) |
|------|--------|-----------|------------------|-----------------------------|
| Deserialization patterns | 7.37 | 0.53 | 12640 | 27,283 |
| jsonio type deser | 6.96 | 0.38 | 1507 | 13,478 |
| Padding oracle | 7.17 | 0.37 | 3135 | 23,366 |

Totals: **94.02% time reduction; hit count and slice-token estimate are identical.** The choice of search engine doesn't change *what* is found; it changes whether you can rerun the audit on every commit.

One fuzz gate item (auth-header tampering) ran 5 seeds in 0.764 seconds and bound the result to its candidate ID. Being honest about it — in the same coverage JSON, `covered_functions_count` and `covered_basic_blocks_count` are `null`. HTTP-level fuzzing cannot know function/block coverage without host-side instrumentation. So out of v2.0's minimum evidence set (command / seed / coverage / crash / repro), what this stage actually fills is cmd / seed / time / target URL / request log. **An incomplete record is still a baseline for the next run** — this is the v2.5 / v2.6 compromise that keeps the fuzz gate operationally viable.

---

## 5. The Lesson: Structure Survives Only When It Absorbs Misses

Three takeaways.

**(1) The promises are the starting line for misses.**
The five things v2.0 promised were all correct. But in operation, the real problem was outside the promises. The answer isn't to make fewer promises. The answer is to **name the boundary of each promise**. `snapshot_scope=module` is a *promise* with a known edge — sibling-module exposure — and v2.7 made that edge explicit in the runner.

**(2) Misses must not live in human memory. They must live in the tool.**
"Let's also look at `data-svc` next time" lives in one operator's head, and dies the day that operator takes vacation. Encoded as step `[6.5]`, the check fires for every operator on every run. The state where a miss has not yet been absorbed into the tool — I call that **scope debt**.

**(3) Trust comes from self-recording.**
`run_id`, `snapshot_scope`, `decompile_status`, `edge_source/confidence`, `unknown_*` reason, slice score, decompile waiver — unless all of this is bound together as SQLite metadata plus JSON evidence files inside the same state directory, no one can answer "what did this audit actually look at?" The moment CI parses the summary JSON to decide pass/fail, the audit becomes — for the first time — a **reproducible process**.

In post 3 I wrote that clustering "makes detection actionable." Let me add one more line.

> **A workflow survives only when it can record what it missed.**

---

## 6. Closing

Everything from v2.0 through v2.8 lives in the `sec-audit-static` skill inside [oh-my-secuaudit](https://github.com/windshock/oh-my-secuaudit). The operator-facing entry point is one script — `tools/scripts/run_static_audit.sh`. All eight reinforcements are in there.

The next audit will produce another miss. That's almost certain. When it does, v2.9 will get added. The five promises of v2.0 won't move, but the runner will keep growing by one line at a time.

### A short postscript — the external ecosystem is arriving

While writing this post I looked at two external tools. [Trail of Bits **trailmark**](https://github.com/trailofbits/trailmark) parses 21 languages into a node/edge graph using tree-sitter + rustworkx, with `certain / inferred / uncertain` edge confidence — almost 1:1 with sec-audit-static's edge tier. It can `augment_sarif()` Semgrep findings and `entrypoint_paths_to()` for entrypoint→sink paths. It bypasses, via tree-sitter, the very spot where Joern CPG kept breaking on the Kotlin + decompiled-Java mix. On a different axis, [colbymchenry **codegraph**](https://github.com/colbymchenry/codegraph) is a pre-indexed knowledge graph for AI coding agents — not security-domain, but its benchmark shows a 92% average (94% on specific cases) reduction in agent grep/explore tool calls.

Neither tool solves real per-variable taint backward/forward slicing — the line-window is still the realistic answer there. But it's enough to signal that parts of what v2.0 promised, which I built by hand, are starting to be supplied from outside. **v2.9 might not be a new detector — it might be partially replacing the Joern step with Trailmark**, if that turns out to be the rational call.

That is the definition of an audit tool I have arrived at. **Only the tools that can audit themselves survive into the next audit.** And — thankfully — the parts that make up such a tool are increasingly something you can source from outside.
