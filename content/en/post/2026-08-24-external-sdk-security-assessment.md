---
title: "You Cannot Assess the Security of External SDKs by Checking Cryptographic Algorithms Alone"
date: 2026-08-24
draft: false
featured: true
tags: ["Mind", "AI Security", "SDK Security", "Cryptography", "Supply Chain", "Payment Security"]
categories: ["Security Research", "Cryptography"]
description: "Algorithm names like AES-256 or TLS reveal nothing about how keys are generated, who controls the endpoint, or whether a response binds to the real transaction. A broader, evidence-based assessment model for external SDKs and native binaries."
image: "/images/post/external-sdk-security-assessment/cover.webp"
cover:
  image: "/images/post/external-sdk-security-assessment/cover.webp"
  alt: "Checking cryptographic algorithms alone cannot assess external SDK security"
---

When reviewing an external payment SDK or native binary, the first things you usually find in the integration manual look familiar:

> “Uses a 128-bit symmetric key.”  
> “Uses AES-256.”  
> “Protects keys with RSA.”  
> “Communicates over TLS.”

I used to start from the same place.

Check the cryptographic algorithms and key lengths, compare them against KISA guidance, and determine whether they were acceptable.

But after analyzing real-world third-party payment SDKs and binaries, my view changed.

**The vulnerabilities were often not in the algorithm names themselves, but in the implementation and trust boundaries underneath them.**

A system may use a 128-bit session key, but generate it from insufficient entropy.

The payload may be encrypted, but lack a real message authentication mechanism.

The SDK may use TLS, but still allow an externally controlled value to determine the destination server.

A native client may assume that the remote server is always well-behaved and trust a response length without validation, turning a malformed response into a memory-safety issue.

And even if every cryptographic check succeeds, a payment can still be processed incorrectly if the returned transaction result is not properly bound to the merchant’s actual order, amount, payee, and ledger state.

That experience convinced me that external SDKs and native binaries need a broader security-assessment model.

I eventually turned that work into this project:

**Crypto Protocol Supply-chain Assessment**  
https://github.com/windshock/crypto-protocol-supply-chain-assessment

---

## This does not mean the existing KISA guidance is wrong

One point is worth making clear.

**The existing KISA cryptographic and secure-development guidance is not wrong.**

KISA guidance already covers important areas such as cryptographic algorithms, key lengths, key management, random-number generation, input validation, integer errors, memory access, command injection, untrusted URL access, certificate validation, and error handling.

- KISA Cryptography Guidance  
  https://www.kisa.or.kr/2060305

- KISA Secure Software Development Resources  
  https://www.kisa.or.kr/2060204

The issue is that many of the cryptographic and secure-development documents I originally relied on were published between roughly 2012 and 2021, while the way software is supplied and operated has changed significantly since then.

Organizations today do not only deploy software they develop themselves.

They also deploy externally supplied artifacts such as:

- executables, DLLs, SOs, JARs, SDKs, agents, and daemons;
- payment, authentication, settlement, account-verification, and cryptographic communication protocols;
- integration manuals, source code, binaries, packet captures, configuration files, SBOMs, repositories, and release evidence;
- modules involving key management, request/response integrity, TLS, ledger reconciliation, and multi-tenant authorization.

KISA itself has also expanded into this area, including its 2024 **Software Supply Chain Security Guideline 1.0**:

https://www.kisa.or.kr/2060204/form?lang_type=KO&postSeq=15

So the argument is not that the older cryptographic or secure-development guidance should be discarded.

The point is that **those controls need to be connected and extended for a different assessment unit: externally supplied SDKs, native binaries, and their surrounding software supply chain.**

---

## What should we ask after “Does it use AES-256?”

There is often a large gap between what a manual tells us and what we actually need to verify.

[![What manuals say versus what must actually be verified](/images/post/external-sdk-security-assessment/algorithm-names.webp)](/images/post/external-sdk-security-assessment/algorithm-names.webp)

*Figure 1. Algorithm names are necessary but incomplete: key generation, IV/nonce handling, MAC/AEAD coverage, endpoint control, and ledger reconciliation are what must actually be verified.*

| What the manual tells us | What we still need to verify | What can go wrong |
|---|---|---|
| 128/256-bit symmetric key | How is the session key generated? Does it really have sufficient entropy? | Reduced key space, possible recovery of encrypted messages |
| Hash verification | Is it actually a keyed MAC? Which fields are authenticated? | Message tampering or forged responses |
| AES-CBC | Is the IV predictable or reused? Is there a MAC or AEAD construction? | Loss of confidentiality or integrity |
| TLS | Are certificates properly validated? Who determines the endpoint? | MITM or redirection to an attacker-controlled server |
| Success response code | Does the order, amount, payee, and transaction ID match the authoritative ledger? | Forged or mismatched transactions accepted as successful |
| Native SDK | Does it safely handle malformed responses and abnormal lengths? | Crash, DoS, memory corruption |
| Product version | Which libraries are actually embedded in the binary? | Vulnerable or obsolete dependencies remain deployed |
| Official release file | Which source and build process produced the artifact? | Supply-chain tampering goes undetected |

The core issue is that **selecting a secure cryptographic primitive and building a secure system are not the same problem.**

The string `AES-256` does not tell you how the key was generated.

The string `TLS` does not tell you whether the peer was correctly authenticated.

The presence of a digital signature does not tell you whether the data used by the application is actually the same data that was verified.

And even a cryptographically valid payment-success response does not automatically prove that the response belongs to the exact transaction the merchant is about to mark as paid.

These failure modes have already appeared repeatedly in security research.

[![Common failure patterns in external SDKs and binaries](/images/post/external-sdk-security-assessment/failure-patterns.webp)](/images/post/external-sdk-security-assessment/failure-patterns.webp)

*Figure 2. Typical weaknesses that manuals rarely reveal — from weak key generation and hash-used-as-MAC to unauthenticated responses, attacker-controlled endpoints, and missing ledger reconciliation.*

---

## 1. Transaction binding matters more than a “payment success” message

One of the clearest early examples is the 2011 IEEE Symposium on Security and Privacy paper:

**How to Shop for Free Online: Security Analysis of Cashier-as-a-Service Based Web Stores**

The researchers analyzed real-world e-commerce systems integrating services such as PayPal, Amazon Payments, and Google Checkout.

The core lesson was simple:

**A merchant must not mark an order as paid merely because it receives a payment-success signal.**

A secure checkout workflow has to preserve relationships such as:

- who made the payment;
- which order the payment belongs to;
- who received the money;
- how much was paid;
- whether the same payment has already been associated with another order.

The real security property is therefore not just the integrity of individual fields.

It is the **binding between fields across different messages and different systems**.

The paper demonstrated real cases where those bindings failed, allowing underpayment or even free purchases.

Research:

**How to Shop for Free Online — IEEE S&P 2011**  
https://www.microsoft.com/en-us/research/publication/how-to-shop-for-free-online-security-analysis-of-cashier-as-a-service-based-web-stores/

This directly influenced why my assessment workflow does not stop at a payment success code. It requires the merchant to reconcile order, amount, payee, transaction state, and other business identifiers against an authoritative ledger.

---

## 2. A protocol may look secure while the SDK implementation breaks it

The 2021 ACNS paper:

**Breaking and Fixing Third-Party Payment Service for Mobile Apps**

takes the analysis one layer deeper.

The researchers performed both static and dynamic analysis of real third-party payment services and their SDKs.

One especially interesting observation was that the security problem was often not the choice of cryptographic algorithm, but **how payment messages were constructed and interpreted**.

For example, several payment systems serialized parameters into forms similar to:

```text
key1=value1&key2=value2&key3=value3
```

before computing a signature or HMAC.

If the boundary between keys and values is ambiguous, the same signed string may be interpreted as different parameter structures.

That creates a situation where:

**the signature is valid, but the application interprets the signed data differently.**

The paper also examined payment-notification forgery, authentication-method selection, and backend SDK implementation flaws that could ultimately lead to “shop for free” attacks.

Research:

**Breaking and Fixing Third-Party Payment Service for Mobile Apps — ACNS 2021**  
https://doi.org/10.1007/978-3-030-78375-4_1

This is very close to something I repeatedly encountered in practice:

> The important question is not only “Was the message cryptographically protected?” but also “Exactly what was authenticated, how was it represented, and how was it parsed afterward?”

---

## 3. Security standards need to become executable checks for SDKs

The 2022 ACSAC paper:

**Analysis of Payment Service Provider SDKs in Android**

is particularly interesting from a methodology perspective.

Instead of treating OWASP MASVS as a document to read manually, the researchers translated its natural-language requirements into **28 concrete checks applicable to payment SDKs**.

They then evaluated 50 payment SDKs.

Their checks included areas such as:

- hard-coded or predictable cryptographic keys;
- insufficient key length;
- insecure cipher modes;
- static or predictable IVs;
- deprecated cryptographic algorithms;
- inappropriate RNG usage;
- TLS certificate validation;
- insecure WebView usage.

Research:

**Analysis of Payment Service Provider SDKs in Android — ACSAC 2022**  
https://www.acsac.org/2022/program/final/s169.html

The important point is this:

**Having a good security standard and being able to validate an SDK against that standard are two different problems.**

That is also why I did not simply reproduce the KISA checklist.

I tried to reinterpret it as:

> **What exactly should we inspect when a vendor hands us a binary or SDK?**

---

## 4. TLS does not save a payment protocol if the trust boundary is wrong

The 2026 USENIX Security paper:

**When Authorization Loses Its Meaning: Breaking and Fixing Third-Party Online Payments**

formalizes the problem further.

The researchers modeled six real third-party payment protocols and analyzed three relationships:

- **Order**
- **Authorization**
- **Result**

They showed that when integrity assumptions about external communication channels are weakened, order-tampering attacks can become possible.

They also validated a real Android variant involving implicit Intent misuse in the transfer of payment parameters.

Research:

**When Authorization Loses Its Meaning — USENIX Security 2026**  
https://www.usenix.org/conference/usenixsecurity26/presentation/xiao

The important point is that payment security should not be modeled as:

```text
TLS
+
Signature
=
Secure
```

Instead, we need to ask:

```text
Order selected by the user
        ↓
Order authorized by the payment system
        ↓
Result accepted by the merchant

Do all three still refer to the same transaction?
```

This is why trust boundaries and business state need to be assessed together with cryptography.

---

## 5. Key length is less important than how the key was generated

The same lesson appears in cryptographic implementation research.

In **Mining Your Ps and Qs**, presented at USENIX Security 2012, Heninger et al. analyzed real TLS and SSH keys at Internet scale.

The problem was not RSA itself.

Insufficient entropy during key generation caused unrelated devices to generate cryptographic keys sharing prime factors.

Research:

**Mining Your Ps and Qs: Detection of Widespread Weak Keys in Network Devices — USENIX Security 2012**  
https://www.usenix.org/conference/usenixsecurity12/technical-sessions/presentation/heninger

So this question is not enough:

> “Do you use a 128-bit key?”

The more important question is:

> **Does that 128-bit key actually contain anything close to 128 bits of entropy?**

That is why the assessment treats key, IV, and nonce generation as a separate control.

---

## 6. Encryption and message authentication are different security properties

Encryption alone does not prevent forgery.

Hugo Krawczyk’s classic work:

**The Order of Encryption and Authentication for Protecting Communications**

analyzes how confidentiality and authentication mechanisms should be composed.

Research:

https://eprint.iacr.org/2001/045

Today, AEAD is often the cleanest solution, but legacy SDKs may still use constructions resembling:

```text
AES-CBC(message)
+
hash(message)
```

The important question is not whether a hash exists.

We need to know:

- whether it is actually keyed;
- which fields are authenticated;
- whether the attacker can modify the message and recompute the value;
- whether the authentication result is checked before the message is consumed.

NIST cryptographic guidance likewise treats algorithms, authentication, randomness, and key management as separate concerns:

https://csrc.nist.gov/projects/cryptographic-standards-and-guidelines

---

## 7. “Uses TLS” is still an implementation claim that needs verification

TLS provides another good example.

The famous 2012 CCS paper:

**The Most Dangerous Code in the World: Validating SSL Certificates in Non-Browser Software**

showed how common broken certificate validation was in non-browser software and SDKs.

Merchant SDKs were among the analyzed software.

Research:

**The Most Dangerous Code in the World — CCS 2012**  
https://doi.org/10.1145/2382196.2382204

So a statement such as:

```text
Uses HTTPS/TLS
```

does not automatically prove:

```text
certificate-chain validation
hostname validation
trust-anchor management
endpoint integrity
safe redirect/proxy handling
```

For external SDKs, **TLS usage and correct peer authentication should therefore be evaluated separately.**

---

## 8. The data that was verified must be the same data the application uses

The 2012 USENIX Security paper:

**On Breaking SAML: Be Whoever You Want to Be**

illustrates another important class of failure through XML Signature Wrapping.

Research:

https://www.usenix.org/conference/usenixsecurity12/technical-sessions/presentation/somorovsky

A signature may successfully verify.

But if the application later consumes a different XML node than the one that was authenticated, the verification becomes meaningless.

The same concept applies to payment protocols.

```text
signature verification
        ↓
parser
        ↓
business object
```

The semantics must remain consistent through all three stages.

That is why an SDK assessment needs to consider parser, serialization, and canonicalization boundaries rather than looking only at cryptographic functions.

---

## 9. Using a secure cryptographic API is not the same as using cryptography securely

The 2013 CCS paper:

**An Empirical Study of Cryptographic Misuse in Android Applications**

analyzed 11,748 Android applications using cryptographic APIs and observed at least one cryptographic misuse in 10,327 of them.

Research:

https://doi.org/10.1145/2508859.2516693

The lesson is straightforward:

> **Using a good cryptographic library does not automatically produce a secure cryptographic system.**

That is why I place more emphasis on how the SDK initializes algorithms, supplies parameters, generates keys and IVs, and authenticates protocol messages than on the algorithm name alone.

---

## 10. Supply-chain security requires asking “What exactly is this binary?”

External SDK assessment does not end with code and protocol analysis.

What organizations eventually deploy is a **release artifact**.

So we also need to ask:

```text
Where did this file come from?
Which version is it?
Which source produced it?
Does its SBOM match the actual binary?
Who released it?
Is it signed?
What build process produced it?
```

The 2019 USENIX Security paper on **in-toto** proposed a way to cryptographically link software supply-chain steps from source to final deployment artifact.

Research:

**in-toto: Providing farm-to-table guarantees for bits and bytes — USENIX Security 2019**  
https://www.usenix.org/conference/usenixsecurity19/presentation/torres-arias

The XZ Utils incident later demonstrated why a SHA-256 value alone is not enough.

A correct hash of a malicious release still describes a malicious release.

A hash proves only:

```text
the file I received
==
the file someone identified
```

What we ultimately want to establish is:

```text
approved source
      ↓
approved build
      ↓
approved release
      ↓
deployed artifact
```

That is why external SDK assessment increasingly needs SBOMs, release signatures, version history, provenance, and artifact identity in addition to traditional vulnerability checks.

KISA has also expanded into this area:

**KISA Software Supply Chain Security Guideline 1.0**  
https://www.kisa.or.kr/2060204/form?lang_type=KO&postSeq=15

---

## The real problem is that all of these security layers are usually assessed separately

One of the most interesting findings from reviewing the related literature was that most of the failure modes I encountered in practice were already well studied somewhere.

[![Assessment workflow for external SDK security](/images/post/external-sdk-security-assessment/workflow.webp)](/images/post/external-sdk-security-assessment/workflow.webp)

*Figure 3. An evidence-based workflow that connects manual, source, native binary, cryptographic implementation, protocol, runtime evidence, parser, SBOM, provenance, and business ledger instead of stopping at the algorithm name.*

Payment-security research is strong at **transaction semantics and state consistency**.

Cryptographic-misuse research is strong at **keys, IVs, RNGs, and cryptographic APIs**.

Protocol research is strong at **authentication and message binding**.

Binary security is strong at **parsers, memory safety, and exploit mitigations**.

Software-supply-chain research is strong at **SBOMs, build integrity, and release provenance**.

The difficult part appears when an enterprise receives a single closed-source SDK or native binary and needs to assess all of those layers together.

Within the literature I reviewed, it was much harder to find a single workflow that connected:

```text
Manual / Documentation
        ↓
Source / Wrapper Code
        ↓
Native Binary
        ↓
Cryptographic Implementation
        ↓
Protocol / Trust Boundary
        ↓
Runtime / Packet Evidence
        ↓
Parser / Memory Safety
        ↓
SBOM / Embedded Libraries
        ↓
Release / Provenance
        ↓
Business Ledger
```

I do not claim that this represents an entirely unexplored academic field.

Most of the individual components are already well researched.

What I found missing in practice was **a way to combine those perspectives into one evidence-based workflow for assessing externally supplied SDKs and binaries.**

---

## Improving the guideline is therefore not just about adding more checklist items

If the KISA guidance is extended for this type of assessment, I do not think the main improvement should simply be adding newer algorithm names or key lengths to a table.

The more important change is to broaden **what is being assessed and how evidence is collected.**

[![Extending traditional guidance for external SDK assessment](/images/post/external-sdk-security-assessment/guideline-extension.webp)](/images/post/external-sdk-security-assessment/guideline-extension.webp)

*Figure 4. Existing algorithm, secure-coding, and crypto-hygiene guidance extended toward binary analysis, protocol validation, runtime evidence, SBOM, provenance, and business reconciliation — not replaced, extended.*

| Assessment area | Suggested extension |
|---|---|
| **Assessment target** | Explicitly include external SDKs, DLL/SO/JAR components, agents, daemons, and native executables |
| **Cryptography** | Go beyond algorithm and key length to key/IV/nonce generation, MAC/AEAD coverage, and key lifecycle |
| **Input boundaries** | Trace command-line arguments, SDK APIs, configuration, environment variables, databases, admin interfaces, IPC, and CI/CD variables |
| **Protocol** | Verify both request and response authentication, serialization/parser consistency, replay behavior, and state transitions |
| **Hostile peer** | Stop assuming the server sends only valid responses; include malformed-response handling in the threat model |
| **Binary** | Inspect NX/DEP, Canary, PIE/ASLR, RELRO, and embedded libraries |
| **Supply chain** | Connect SBOMs with artifact hashes, signatures, release history, and provenance |
| **Business validation** | Reconcile order, amount, payee, and transaction state against an authoritative ledger |
| **Evidence quality** | Distinguish documentation claims from source, binary, and runtime evidence |
| **Freshness** | Re-check current KISA, NIST, and IETF final/draft status rather than freezing historical recommendations |

The **evidence-quality** part is especially important.

These statements do not mean the same thing:

```text
The manual says the product uses AES-256.

The source code shows AES-256 initialization.

The deployed binary and packet behavior confirm AES-256,
including the actual key and IV generation path.
```

Yet a conventional checklist can easily collapse all three into:

```text
AES-256: Yes
```

That loses important information about how much we actually know.

---

## “How do we know?” matters as much as “What did we find?”

That is why the Skill separates the assessment into two dimensions.

[![Evidence-based assessment model separating control status from evidence basis](/images/post/external-sdk-security-assessment/evidence-model.webp)](/images/post/external-sdk-security-assessment/evidence-model.webp)

*Figure 5. Every finding carries two axes: the control status (confirmed weakness, confirmed control, not verified, not applicable) and the evidence basis that supports it.*

**Control status**

- `Confirmed weakness`
- `Confirmed control`
- `Not verified`
- `Not applicable`

And separately:

**Evidence basis**

- `Direct artifact`
- `Authorized runtime observation`
- `Target-artifact lab reproduction`
- `Model/synthetic reproduction`
- `Documentation only`
- `Inference`

If a vendor manual claims that a secure random generator is used, that alone is not enough to mark the implementation as a `Confirmed control`.

Likewise, reproducing the same vulnerability mechanism in a synthetic environment does not prove that the vendor’s production implementation is vulnerable.

If the evidence is insufficient, **`Not verified` is a valid and often preferable result.**

This becomes particularly important when AI is used for security assessment.

The goal should not simply be to make the AI produce more findings.

In many cases, a more valuable capability is:

**preventing the model from turning missing evidence into an unsupported conclusion.**

---

## From a guideline to an AI Skill

I first organized these ideas as a security-assessment guideline.

But a real assessment involves more than reading a checklist.

You need to:

- fix the product version and SHA-256;
- inspect manuals and configuration;
- review wrapper source code;
- reverse-engineer the binary if source is unavailable;
- identify embedded libraries and hardening properties;
- reconstruct the protocol and trust boundaries;
- inspect packet and runtime behavior in an authorized environment;
- and finally verify that payment or authentication results match the actual business state.

So I turned the workflow into an AI Skill that can apply the same assessment process repeatedly.

**Crypto Protocol Supply-chain Assessment**

https://github.com/windshock/crypto-protocol-supply-chain-assessment

The goal is not to ask AI:

> “Is this SDK secure?”

The goal is to make it correlate evidence from:

```text
manuals
source code
binaries
packet captures
configuration
SBOMs
repositories
release evidence
business state
```

and then record:

**what has actually been verified, what remains unknown, and what evidence supports each conclusion.**

---

## The question needs to change

Previously, the question was:

**“Does it use AES-256?”**

Now I think we need to continue:

**“How is the AES-256 key generated?”**

**“How are the IV and nonce managed?”**

**“How do we know who created this ciphertext?”**

**“Who controls the remote endpoint?”**

**“Is the client still safe if the peer sends a malicious response?”**

**“Which source code and libraries produced the deployed binary?”**

And finally:

**“Why should our business system trust this response?”**

Checking the cryptographic algorithm is still necessary.

But when evaluating externally supplied SDKs and native binaries, we also need to understand **how that cryptography is generated, composed, authenticated, parsed, distributed, and ultimately used to make business decisions.**

That is the reason I built this guideline and the Skill around it.

---

## Project

**Crypto Protocol Supply-chain Assessment**

An AI Skill for evidence-based assessment of cryptographic design, protocol behavior, and supply-chain risk in external payment binaries, PG SDKs, authentication/settlement modules, and cryptographic communication libraries.

https://github.com/windshock/crypto-protocol-supply-chain-assessment

---

## References

### Third-Party Payment / SDK Security

1. **Wang et al. — How to Shop for Free Online: Security Analysis of Cashier-as-a-Service Based Web Stores, IEEE S&P 2011**  
   https://www.microsoft.com/en-us/research/publication/how-to-shop-for-free-online-security-analysis-of-cashier-as-a-service-based-web-stores/

2. **Shi et al. — Breaking and Fixing Third-Party Payment Service for Mobile Apps, ACNS 2021**  
   https://doi.org/10.1007/978-3-030-78375-4_1

3. **Mahmud et al. — Analysis of Payment Service Provider SDKs in Android, ACSAC 2022**  
   https://www.acsac.org/2022/program/final/s169.html

4. **Xiao et al. — When Authorization Loses Its Meaning: Breaking and Fixing Third-Party Online Payments, USENIX Security 2026**  
   https://www.usenix.org/conference/usenixsecurity26/presentation/xiao

### Cryptographic Implementation / Misuse

5. **Krawczyk — The Order of Encryption and Authentication for Protecting Communications**  
   https://eprint.iacr.org/2001/045

6. **Heninger et al. — Mining Your Ps and Qs: Detection of Widespread Weak Keys in Network Devices, USENIX Security 2012**  
   https://www.usenix.org/conference/usenixsecurity12/technical-sessions/presentation/heninger

7. **Georgiev et al. — The Most Dangerous Code in the World: Validating SSL Certificates in Non-Browser Software, CCS 2012**  
   https://doi.org/10.1145/2382196.2382204

8. **Egele et al. — An Empirical Study of Cryptographic Misuse in Android Applications, CCS 2013**  
   https://doi.org/10.1145/2508859.2516693

### Parser / Signature Binding

9. **Somorovsky et al. — On Breaking SAML: Be Whoever You Want to Be, USENIX Security 2012**  
   https://www.usenix.org/conference/usenixsecurity12/technical-sessions/presentation/somorovsky

### Software Supply Chain

10. **Torres-Arias et al. — in-toto: Providing farm-to-table guarantees for bits and bytes, USENIX Security 2019**  
    https://www.usenix.org/conference/usenixsecurity19/presentation/torres-arias

### Korean and International Guidance

11. **KISA Cryptography Guidance**  
    https://www.kisa.or.kr/2060305

12. **KISA Secure Software Development Resources**  
    https://www.kisa.or.kr/2060204

13. **KISA Software Supply Chain Security Guideline 1.0**  
    https://www.kisa.or.kr/2060204/form?lang_type=KO&postSeq=15

14. **NIST Cryptographic Standards and Guidelines**  
    https://csrc.nist.gov/projects/cryptographic-standards-and-guidelines
