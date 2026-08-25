---
title: "Race Condition (TOCTOU) Remediation: What Actually Worked in a Real Stack"
date: 2026-08-25
draft: false
featured: true
tags: ["Code", "Race Condition", "TOCTOU", "Concurrency", "Database", "Spring"]
categories: ["Security Research", "Backend"]
description: "The same check-then-act race keeps appearing across services: purchase-limit bypass, one draw used by many requests, duplicate coupon cancellation, daily-reward overruns. I built a real stack (nginx + Tomcat×2 + shared Postgres + Redis) and measured which fix actually holds. Most of them need no Redis lock — just a DB conditional UPDATE and an affected-rows check."
image: "/images/post/race-condition-toctou-mitigation/cover.webp"
cover:
  image: "/images/post/race-condition-toctou-mitigation/cover.webp"
  alt: "How a TOCTOU race happens: concurrent requests all read the same stale state and all pass the check"
---

The same defect keeps showing up across services:

- per-user purchase-limit bypass
- one draw/opportunity consumed by several concurrent requests
- duplicate coupon-cancellation processing
- daily entry-ticket issuance over the limit
- daily point-reward count exceeded

They all share one shape. "Read current state → CHECK the limit → do the business work → UPDATE the
state" is **not one atomic operation**, so when several requests for the same user arrive together, they all
read the same stale state and all pass the check.

```java
int count = repository.getTodayCount(memberId);
if (count < limit) {              // A, B, C all read count = 4, limit = 5
    rewardService.givePoint(memberId);
    repository.insertHistory(memberId);   // → 3 rewards granted for a 5-limit... but 7 total
}
```

The tempting security ask is "just put a Redis distributed lock on everything." But that pushes real cost
onto every team — Redis dependency, lock timeouts, ownership, fail-open/fail-close policy, multi-instance
concerns, code complexity. So instead of mandating an implementation, the requirement should be:

> **Guarantee atomicity so that counts / opportunities / points are not exceeded even under concurrent
> requests** — and prefer the DB's own atomic operations first.

I turned that into a runnable lab and **measured** which mitigations actually hold on a realistic topology
(nginx + Tomcat×2 + a shared Postgres + Redis, two WAS instances behind a round-robin). Everything below is
backed by that lab.

**Repository (code + reproducible lab):** <https://github.com/windshock/race-condition-lab>

Here is the whole thing in one picture, then the details.

[![One-page overview of the race-condition remediation guide](/images/post/race-condition-toctou-mitigation/overview.webp)](/images/post/race-condition-toctou-mitigation/overview.webp)

*The full guide at a glance: what TOCTOU is, what the real-stack test proved, how to choose an approach, why conditional UPDATE works, and how to handle external side effects.*

---

## 0. What the lab *proves* vs. what is only a *recommendation*

Be honest about the boundary — over-reading the results leads to false confidence.

| Category | Content |
|---|---|
| **Proven by the lab** | Limits *inside a single DB* (1 voucher / 1 daily counter) let **exactly one** of 20 concurrent requests through when using conditional UPDATE, `FOR UPDATE`, or UNIQUE. A JVM-local lock leaks by the number of instances. A non-atomic Redis lock still leaks. |
| **Recommendation only (outside the lab)** | Integrity when the side effect lives **outside the DB** — external point grants, payments, coupon cancellation. This cannot be proven with a single transaction; it needs **architecture** — reservation, idempotency keys, outbox, compensating transactions (section 4). |

"Conditional UPDATE stops the race" is a proof about **DB-internal state**. "The points are granted exactly
once" is a **distributed-systems design** problem. Do not conflate the two.

---

## 1. How a TOCTOU race actually happens

When multiple requests run concurrently, they all read the same state before any of them updates it. The
window between READ/CHECK and UPDATE is the **race window** (the cover image above shows exactly this: three
requests all see the same stale state and all pass).

The typical vulnerable pattern is `read → check → work → update`, none of it atomic. And it does **not**
require a flood — two or three concurrent requests are enough. (An HTTP `Transfer-Encoding: chunked` or
[HTTP/2 single-packet](https://portswigger.net/research/smashing-the-state-machine) trick can align request
completions into a tiny window and make the race far more reproducible, but `chunked` is a legitimate
feature; blocking it is not the real fix.)

---

## 2. What the real-stack test proved (20 concurrent requests)

Two scenarios, run A/B across every mode, counted from the DB (`grant_log` / `quota`), on two WAS instances
sharing one Postgres.

[![Measured results: which mitigation held under 20 concurrent requests](/images/post/race-condition-toctou-mitigation/measured-results.webp)](/images/post/race-condition-toctou-mitigation/measured-results.webp)

*Measured on a real stack. DB-conditional UPDATE and FOR UPDATE stop the race cleanly; UNIQUE is a safety net for duplicate-key cases, not a free-counter solution.*

**[A] 1-voucher (opportunity) limit** — invariant: `granted == 1`

| Mode | HTTP/1.1 last-byte | HTTP/2 single-packet | Verdict |
|---|---|---|---|
| `none` (no lock, production code) | 16/20 | **20/20** | ⚠ race |
| `local` (JVM lock) | 2/20 | 2/20 | ⚠ leaks by instance count |
| `distributed-naive` (non-atomic lock) | 20/20 | 9/20 | ⚠ still leaks |
| `distributed` (Redisson RLock) | 1/20 | 1/20 | ✅ blocked |
| **`db-conditional`** (conditional UPDATE) | **1/20** | **1/20** | ✅ blocked |
| **`db-for-update`** (`SELECT … FOR UPDATE`) | **1/20** | **1/20** | ✅ blocked |
| **`db-unique`** (UNIQUE safety net) | **1/20** | **1/20** | ✅ duplicate blocked |

**[B] 1-per-day counter limit** — invariant: `granted == 1 AND quota >= 0` (HTTP/2)

| Mode | Granted | Final quota | Verdict |
|---|---|---|---|
| `none` | 20/20 | **-19** | ⚠ counter underflow |
| `local` | 2/20 | -1 | ⚠ leaks |
| `distributed-naive` | 9/20 | -8 | ⚠ leaks |
| `distributed` | 1/20 | 0 | ✅ |
| **`db-conditional`** | **1/20** | **0** | ✅ |
| **`db-for-update`** | **1/20** | **0** | ✅ |

`db-unique` is excluded from [B]: UNIQUE`(member, voucher)` only blocks "consuming the same voucher twice"; it
**cannot cap a free counter** (N-per-day). That is the key limit of UNIQUE.

Decisive detail: with `db-conditional`, out of 20 requests exactly one returned `SUCCESS`, and the other 19
were **cleanly rejected (HTTP 200, not 500)** — the conditional UPDATE's `affected=0` → domain exception →
transaction rollback → failure-response conversion, observed per response.

The JVM-local lock leaking exactly by the instance count (2/20 with two WAS) is the empirical proof that
`synchronized`/`ReentrantLock` cannot protect a limit across instances. The non-atomic Redis lock leaking
9–20/20 is the proof that a lock which is not *atomically acquired* buys you nothing under a synchronized
burst.

---

## 3. Is the priority order sound? And can conditional UPDATE be the default?

The proposed order — conditional UPDATE → UNIQUE → `FOR UPDATE` → Redis lock → (supplement) rate limit /
concurrency guard — is **broadly sound**, but use it as a **decision tree keyed on the shape of the
invariant**, not a fixed ladder.

[![Decision tree: how to choose the right mitigation by invariant shape](/images/post/race-condition-toctou-mitigation/choose-mitigation.webp)](/images/post/race-condition-toctou-mitigation/choose-mitigation.webp)

*Choose by invariant shape, not by a fixed ladder: single-DB + expressible in one statement → conditional UPDATE; duplicate-key → UNIQUE/UPSERT; multi-row decision → FOR UPDATE; cross-resource mutual exclusion → distributed lock; side effects outside the DB → architecture.*

**Yes — recommend `conditional UPDATE + affected rows` as the default first line of defense.** But ship it
with four preconditions, not as "just add a WHERE":

1. **The CHECK must be expressible as the UPDATE's WHERE clause** — `count < max`, `used = false`,
   `status = 'ISSUED'`.
2. **Decide the winner in code via affected rows** — `affected == 1` → I won; `affected == 0` → someone else
   already took it / limit exceeded → reject. Skip this and the whole thing is meaningless.
3. **Put side effects that must be atomic with it in the same transaction**; keep non-DB side effects out
   (section 4).
4. **When reserving multiple resources, guarantee rollback on failure** — throw the later-stage failure out
   of the transactional method so the whole thing rolls back.

Two clarifications the priority list should nail down:

- **UNIQUE only covers "duplicate-key" invariants** (same voucher / coupon / one entry per event). It cannot
  cap a free counter (5-per-day) — the lab's [B] shows this. UNIQUE does not replace conditional UPDATE; it
  is the last line that stops an invalid state from being *persisted*.
- **A Redis lock is mutual exclusion, not transactional atomicity** ([Kleppmann, *How to do distributed
  locking*](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)). Even holding the
  lock, a mid-section crash can leave a partial commit. Atomicity is still the DB transaction's job.

---

## 4. Why conditional UPDATE works (an atomic decision in the DB)

Only one request can change the row, because the UPDATE itself re-checks the condition.

[![Why conditional UPDATE works: the UPDATE condition is re-evaluated at execution time, and the affected-rows check in code decides the winner](/images/post/race-condition-toctou-mitigation/conditional-update.webp)](/images/post/race-condition-toctou-mitigation/conditional-update.webp)

*The SELECT is not the protection. The protection is the UPDATE condition, re-evaluated at execution time, plus the affected-rows check in the application. Even with a deliberate 50ms delay, only one request wins.*

Why is it safe even though a `SELECT → judge → conditional UPDATE` still has a SELECT? Under READ COMMITTED
(the PG/MySQL default), the **UPDATE re-reads the latest committed row at execution time and re-evaluates the
WHERE.** So the defense is the UPDATE's WHERE + the affected-rows check — not the SELECT. The lab deliberately
reads the candidate *without* `FOR UPDATE` and injects a 50ms race window, yet exactly one request wins.

The actual vulnerable code and its fix, side by side:

```java
// AS-IS (vulnerable): CHECK and USE are separated → all see the same stale state and pass
Long seq = jdbc.query("SELECT seq FROM voucher WHERE member_id=? AND used=false ORDER BY seq LIMIT 1", ...);
jdbc.update("UPDATE voucher SET used=true WHERE seq=?", seq);          // no condition → consumed N times

// TO-BE (conditional UPDATE): condition-check + state-change in one statement, decided by affected rows
int affected = jdbc.update(
    "UPDATE voucher SET used=true, used_at=now() WHERE seq=? AND used=false", seq);
if (affected != 1) throw new AlreadyUsedException();                    // only the winner proceeds
```

For a free counter, the same idea:

```java
int affected = jdbc.update(
    "UPDATE user_daily_counter SET count = count + 1 " +
    "WHERE member_id=? AND business_date=? AND count < ?", memberId, today, maxCount);
if (affected != 1) throw new LimitExceededException();
```

---

## 5. Where conditional UPDATE does *not* fit — and what to use instead

- **Aggregate limits spanning multiple rows** (cart total, group-account sum) → a counter/aggregate row, or
  `FOR UPDATE` on the related rows.
- **CHECK target ≠ UPDATE target** (condition on table A, change on table B) → transaction + `FOR UPDATE`, or
  a counter.
- **Free counter via UNIQUE** → use the counter-row conditional UPDATE instead.
- **The insert itself is the business (dedup)** → **UNIQUE + UPSERT / `ON CONFLICT`**, not conditional
  UPDATE.
- **A side effect outside the DB must be atomic with it** → section 6.
- **Counter-reset boundary (day rollover)** where "today's counter" row does not exist yet → UNIQUE`(member,
  business_date)` + UPSERT to create the 0-row atomically, then the conditional UPDATE.

### `SELECT … FOR UPDATE`: common traps

`FOR UPDATE` is powerful but easy to misuse:

- **External calls / slow work inside the transaction** → holds locks/connections for the whole network
  round-trip → connection-pool exhaustion. Keep external calls outside.
- **No lock-wait bound** → set `lock_timeout` (PG) / `innodb_lock_wait_timeout` (MySQL). (The lab uses
  `SET LOCAL lock_timeout='10s'`.)
- **Inconsistent lock ordering → deadlock** → always lock in the same order; the lab locks a single
  per-member anchor row.
- **You cannot lock a row that does not exist** → an insert race needs UNIQUE + UPSERT.
- **Unindexed conditions** → wide-range or gap locks; the lab adds a partial index for candidate selection.
- **ORM pitfalls** → reading without `@Lock` takes no lock; watch lazy loading / 2nd-level cache.
- **`SKIP LOCKED` misuse** → it silently skips rows; fine for "pick distinct items off a queue", wrong for
  "mutual exclusion on one resource".

---

## 6. When an external API is involved (point grant / payment / coupon cancel)

**Core principle: inside the DB transaction, only *atomically reserve the right*; call the external API
*outside* the transaction, *idempotently*.** Putting the external call in the transaction holds locks for the
network round-trip and is not atomic with the DB commit anyway (only one of the two can succeed).

[![Reserve inside the DB transaction, call the external API outside it, then confirm](/images/post/race-condition-toctou-mitigation/external-api.webp)](/images/post/race-condition-toctou-mitigation/external-api.webp)

*Reserve → Commit → External call → Confirm. Never put a slow external call inside the DB transaction. Idempotency key + Outbox + compensation give exactly-once effect through architecture, not one SQL statement.*

```text
1) [TX begin]
   Reserve the limit/opportunity with a conditional UPDATE  (must be affected==1 to proceed)
   INSERT a grant-attempt record (status=PENDING, idempotency_key=UUID)
   [TX commit]             ← this far is the atomic reservation. If it fails, nothing happened.

2) [outside TX] Call the external API (carry idempotency_key → retries do not double-spend)

3) Transition state (conditional UPDATE):
   success → UPDATE ... SET status=CONFIRMED WHERE id=? AND status=PENDING
   failure → UPDATE ... SET status=FAILED    WHERE id=? AND status=PENDING  + compensate (restore counter)
```

- **[Idempotency key](https://docs.stripe.com/api/idempotent_requests)** — the fundamental exactly-once
  device. If the external side doesn't support it, filter duplicates via a UNIQUE(idempotency_key) on our
  "grant attempt" table.
- **[Outbox pattern](https://microservices.io/patterns/data/transactional-outbox.html)** — write the
  reservation and the "message to send" in the *same transaction*; a worker delivers it. Resolves the
  dual-write problem.
- **State machine + compensation** — `PENDING → CONFIRMED/FAILED`; if it cannot be confirmed, restore the
  reservation ([saga](https://microservices.io/patterns/data/saga.html)).
- **Reconciliation** — periodically reconcile with the external system; the final safety net.

**Duplicate coupon cancellation** is a special case: cancellation is a state-transition CAS
(`UPDATE coupon SET status='CANCELED' WHERE coupon_id=:id AND status='ISSUED'`). Only the `affected==1`
request actually cancels and calls the refund API (with an idempotency key). Same pattern as
`db-conditional`.

---

## 7. Redis lock — needed vs. overkill; and rate limit vs. concurrency guard

**Needed:** the state that must change atomically spans multiple resources / DBs / cache / external systems
and cannot be wrapped by a single DB transaction; or you need per-member serialization in a pre-DB-write
stage; or you're reducing DB row-lock contention on a very hot key at the front (integrity still lives in the
DB).

**Overkill:** a single-DB single-row/counter problem where a conditional UPDATE already suffices; treating a
Redis lock as an *integrity guarantee*; non-atomic acquisition (the lab's `distributed-naive`, leaking
9–20/20). If you use it, always do atomic acquisition (`SET key <token> NX PX <ttl>`) + owner-token release +
TTL + an explicit failure policy.

For rate limit vs. concurrency guard — neither is the root fix:

| Control | Layer | Purpose | Integrity tool? |
|---|---|---|---|
| **Rate limit** (10 req/s) | edge / gateway | abuse/DoS/cost protection | ❌ — a race happens with 2–3 concurrent |
| **Concurrency guard** (same user + same object → 1 at a time) | application | dampen race amplification, reduce backend load | △ supplement only |
| **Atomic processing** (conditional UPDATE) | DB / transaction | **guarantees integrity** | ✅ root |

Placement: **edge = rate limit (policy/cost) · app = DB atomicity (root) · optional app-front concurrency
guard (buffer).** The order must not invert.

---

## 8. Turn the recurring bug into a standard, not a pile of patches

If the same `check → act` race recurs across services, eliminate the *pattern*, not each instance:

1. **Secure Coding Rule** — *"For limits / opportunities / counters / state transitions, do not split into
   read-then-judge-then-change; process CHECK and USE as one atomic DB operation, and decide success by
   affected rows (or a UNIQUE violation)."* Forbidden: `getCount()/findUnused()` → `if` → `insert()/update()`.
2. **Shared abstraction** — a helper that encapsulates the `affected==1` check, so teams don't reinvent it.
3. **Static-analysis rule** (Semgrep) — flag "branch on a SELECT/count result, then insert/update the same
   entity" in PRs; wire it into CI.
4. **Schema-design standard** — bake UNIQUE constraints (duplicate-key) and counter columns (free-counter)
   into the schema at design time.
5. **Concurrency regression tests** — fire concurrent requests aligned to one instant (like this lab's
   last-byte / single-packet runners) and assert invariants (`granted==1`) in CI. The lab's `run_all.sh`
   exits 1 when a mitigation leaks.
6. **Review checklist** — CHECK moved into the WHERE? success decided by affected rows? atomic side effects
   in the same transaction, external calls outside? failure path throws out to roll back? dedup-insert has a
   UNIQUE?

### `@Transactional` must-dos (frequently botched)

- **Throw the rejection out of the transactional method.** Catching it *inside* and returning a normal
  response commits the earlier steps (e.g. the counter is decremented but "succeeds"). Throw to roll back;
  catch it *outside* the transaction to convert to a user response. (In the lab, `ClaimService.guarded()`
  catches the domain / `DuplicateKeyException` outside the transaction.)
- Default rollback applies only to unchecked exceptions (else `@Transactional(rollbackFor=…)`).
- Beware self-invocation (an internal call bypasses the proxy).
- Never put external API calls inside the transaction.

Minimal-change fixes exist for JPA (`@Modifying @Query` with an affected-rows return) and MyBatis (mapper
`update()` returns affected rows) too — full examples are in the repo guide.

---

## 9. The final policy statement (security → dev)

> **[Concurrency Integrity Policy]**
> 1. For per-user limits / opportunities / points / state transitions, do not split into read-then-judge-then
>    change — process **CHECK and USE as a single atomic DB operation.**
> 2. Evaluate a **DB conditional UPDATE + affected-rows check first** (recommended #1). Decide success by
>    `affected==1`; otherwise reject.
> 3. Add a **UNIQUE constraint as the last safety net** for duplicate-key limits. If needed, use
>    `SELECT … FOR UPDATE` (lock-wait bound mandatory) or a distributed lock.
> 4. For **external grant / payment / cancellation**, atomically **reserve** in the DB, then call externally
>    **outside** the transaction with an **idempotency key.** Rate limiting is abuse prevention, not an
>    integrity measure.
>
> We do not mandate a specific implementation (e.g. a Redis lock). The requirement is "guarantee atomicity so
> that limits are not exceeded even under concurrent requests," and you choose the method from the priority
> above to fit your service.

---

## Reproduce it yourself

```bash
git clone https://github.com/windshock/race-condition-lab
cd race-condition-lab/realstack
./run_all.sh 20   # boots the stack + two scenarios × all modes A/B + PASS/FAIL (exit 1 if a mitigation leaks)
```

- **Full guide (English / Korean)** and all code: <https://github.com/windshock/race-condition-lab>
- Vulnerable core and mitigation modes: `realstack/app/src/main/java/com/example/claim/ClaimTxService.java`
- Mode routing and out-of-transaction exception conversion: `.../ClaimService.java`

The lab intentionally keeps the vulnerable and naive-lock modes as negative controls, so you can watch a real
stack leak and then watch the DB-native fixes hold — with no Redis lock required.

---

## References

### Race conditions / TOCTOU
1. **CWE-367 — Time-of-check Time-of-use (TOCTOU) Race Condition.** <https://cwe.mitre.org/data/definitions/367.html>
2. **CWE-362 — Concurrent Execution using Shared Resource with Improper Synchronization.** <https://cwe.mitre.org/data/definitions/362.html>
3. **James Kettle — *Smashing the State Machine: The True Potential of Web Race Conditions*, PortSwigger Research (Black Hat USA / DEF CON 31), 2023.** <https://portswigger.net/research/smashing-the-state-machine>
4. **James Kettle — *Listen to the Whispers: Web Timing Attacks That Actually Work*, PortSwigger Research (Black Hat USA / DEF CON 32), 2024.** <https://portswigger.net/research/listen-to-the-whispers-web-timing-attacks-that-actually-work>
5. **PortSwigger Web Security Academy — Race conditions.** <https://portswigger.net/web-security/race-conditions>
6. **Mohammad Amin Nasiri — *H2SpaceX: HTTP/2 Single Packet Attack (Last Frame Synchronization) library*.** <https://github.com/nxenon/h2spacex> (HTTP/3: <https://github.com/nxenon/h3spacex>)
7. **Federico Loi, Lorenzo Pisu, Leonardo Regano, Davide Maiorca, Giorgio Giacinto — *Race Against Time: Investigating the Factors that Influence Web Race Condition Exploits*, Computers & Security 160 (2026) 104740.** DOI: <https://doi.org/10.1016/j.cose.2025.104740>
8. **Mohammad Amin Nasiri, Efstratios Chatzoglou, Georgios Kambourakis — *QUIC-er Races: HTTP/3 Won't Save You from TOCTOU Vulnerabilities*, Int. J. Information Security 25, 83 (2026).** DOI: <https://doi.org/10.1007/s10207-026-01258-6>

### DB atomicity & locking
9. **PostgreSQL — Transaction Isolation (READ COMMITTED).** <https://www.postgresql.org/docs/current/transaction-iso.html>
10. **PostgreSQL — Explicit Locking (row locks, `FOR UPDATE`, deadlocks).** <https://www.postgresql.org/docs/current/explicit-locking.html>
11. **PostgreSQL — `SELECT … FOR UPDATE` / `SKIP LOCKED`.** <https://www.postgresql.org/docs/current/sql-select.html>
12. **PostgreSQL — `INSERT … ON CONFLICT` (UPSERT).** <https://www.postgresql.org/docs/current/sql-insert.html>
13. **MySQL — Locking Reads (`SELECT … FOR UPDATE` / `FOR SHARE`).** <https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html>

### Distributed locks
14. **Redis — Distributed Locks (Redlock).** <https://redis.io/docs/latest/develop/use/patterns/distributed-locks/>
15. **Martin Kleppmann — *How to do distributed locking*.** <https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html>
16. **Redisson — Distributed locks and synchronizers.** <https://github.com/redisson/redisson/wiki/8.-Distributed-locks-and-synchronizers>

### Reliable external side effects
17. **Chris Richardson — Transactional Outbox pattern.** <https://microservices.io/patterns/data/transactional-outbox.html>
18. **Chris Richardson — Saga pattern.** <https://microservices.io/patterns/data/saga.html>
19. **Chris Richardson — Idempotent Consumer pattern.** <https://microservices.io/patterns/communication-style/idempotent-consumer.html>
20. **Stripe API — Idempotent requests.** <https://docs.stripe.com/api/idempotent_requests>

### Framework
21. **Spring Framework — Declarative transaction management (`@Transactional`).** <https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html>

### Lab
22. **Repository & reproducible lab (this article's code and measurements).** <https://github.com/windshock/race-condition-lab>
23. **Transfer/synchronization technique borrowed from *waf-ips-ids-retest* TC-24.** <https://github.com/windshock/waf-ips-ids-retest/>
