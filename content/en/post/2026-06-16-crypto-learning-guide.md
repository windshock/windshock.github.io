---
title: "Cryptography Guide for Practical Security Professionals"
date: 2026-06-16
draft: false
featured: true
tags: ["Mind", "Cryptography", "Security Assessment", "Reversing", "RSA", "AEAD", "Key Management"]
categories: ["Security Research", "Cryptography"]
description: "In practical cryptography, failures often occur in the design—combining randomness, key management, operating modes, error handling, and authentication—rather than in the algorithms themselves. This post outlines criteria for auditing cryptographic implementations from the perspective of security assessors and reversers."
image: ""
---

In practical cryptography, failures often occur in the design—combining randomness, key management, operating modes, error handling, and authentication—rather than in the algorithms themselves. This post summarizes what to suspect and verify when examining cryptographic implementations from the perspective of security assessors and reversers.

> Audience: Security operators, assessors, reversers  
> Perspective: Implementation errors and design failures  
> Version: Restored/Expanded Merged Version 2026

## Document Flow

- 0. Cryptography is Design, Not Just Mathematics
- 1. Randomness and Entropy
- 2. Integrity, Authenticity, and Password Storage
- 3. Key Management and KDF
- 4. CBC / CTR / GCM Operating Modes
- 5. RSA, PKCS#1 v1.5, and OAEP
- 6. Cryptographic Reversing
- 7. Vulnerability Analysis Patterns
- 8. Transitioning to Quantum Resistance
- 9. Audit Checklist

## 0. Introduction: Why is Cryptography "Design" rather than "Math"?

Many security professionals distance themselves from cryptography, thinking of it as a collection of complex mathematical formulas. However, in practical security, failures more frequently occur not in the mathematical security of the algorithm, but in **how the algorithms are assembled and operated**.

Using a strong algorithm is just the starting point. The practical question isn't "What algorithm?" but rather "With what key, in what mode, with what randomness, and with what error handling and authentication verification is it used?"

Therefore, this document focuses on what a security assessor should suspect when looking at actual code, binaries, protocols, and operating environments, rather than mathematical proofs.

## 1. Randomness and Entropy: The Danger of Predictability

The core of encryption is unpredictability. Values that constitute security boundaries—such as keys, IVs, nonces, salts, challenges, and session tokens—must be such that an attacker cannot predict future values or reconstruct past ones.

#### Analysis Case: Narrow-Range Seeds

Suppose a module uses the `gettimeofday().tv_usec` value as a seed when creating a session key. Since the microsecond value ranges from 0 to 999,999, there are at most 1,000,000 possibilities. If an attacker roughly knows the request time, the actual search space becomes much narrower.

**Dangerous Patterns**

- Generating keys using `rand()`, `rand_r()`, or `Math.random()` families.
- Using time, PID, counters, or user IDs as seeds.
- Outputting random values to logs or debug screens.
- Using fixed test seeds directly in production.

**Secure Principles**

- Use the operating system's or a verified library's CSPRNG.
- Do not leave the responsibility for key and nonce generation to arbitrary application logic.
- In distributed systems, eliminate the possibility of collisions at the design stage.
- Separate the purposes of long-term secrets and one-time random values.

#### Expert's Eye: CSPRNG

Cryptographic keys, IVs, nonces, and salts must be generated using an OS-level CSPRNG or verified cryptographic library APIs. The key is not just a "random-looking value," but a value where **an attacker cannot predict the next output without knowing the internal state**.

## 2. Integrity, Authenticity, and Password Storage

### Integrity and Authenticity are Different

**General Hash → Integrity**

Hashes like SHA-256 act as fingerprints to check if data has changed. However, since anyone can recalculate them, if an attacker changes the data and the hash together, the verification is bypassed.

**MAC / AEAD Tag → Authenticity**

HMAC or AEAD authentication tags can only be created by an entity that knows the secret key. Thus, they verify not only that the message hasn't changed but also **that it was created by an authorized entity**.

#### Practical Error: "Ciphertext + SHA-256"

Attaching a simple SHA-256 hash next to ciphertext is not authentication. This is because an attacker can also recalculate the hash after tampering with the ciphertext. To achieve authenticity, HMAC or AEAD must be used.

### Passwords Should be Hashed, Not Encrypted

A password is not data that the system ever needs to know in its plaintext form. Therefore, storing it in a "decryptable form" using symmetric key encryption like AES is fundamentally inappropriate.

- Use dedicated password hashing algorithms like **Argon2id, bcrypt, scrypt, or PBKDF2** for password storage.
- Apply per-user salts so that the same password results in different stored values.
- Set sufficient cost parameters to slow down offline brute-force attacks.
- Simple SHA-256, MD5, Base64, or "custom encryption" are not valid password storage methods.

## 3. Key Management: Strength is Determined by Operations

Even if a cryptographic algorithm is strong, the entire system can easily collapse if keys are incorrectly generated, stored, shared, or rotated. The first thing to look for in a practical audit is not "What algorithm was used?" but **"Where does the key come from and where does it go?"**

### KDF and Key Separation

When multiple keys for different purposes are needed from a single master secret, simply cutting strings or performing a single hash is dangerous. In such cases, a KDF like HKDF should be used to separate keys by purpose.

**Why use HKDF? The Juice Extraction Analogy**

- **Extract:** Filter out biases and impurities that might be mixed in the original secret (e.g., the result of a key exchange) and extract a pseudorandom key that is cryptographically easy to handle.
- **Expand:** Input a purpose string (info/context) to pour keys into different "cups" for encryption, MAC, per-session use, outgoing direction, incoming direction, etc.

This achieves **Key Separation**. Using a single key simultaneously for encryption and authentication, sending and receiving, or file encryption and token signing can increase interactions between algorithms or the scope of key exposure. HKDF separates secrets from the same root into independent keys for each purpose, reducing the risk of a problem in one area spreading to another.

### Key Storage and Operation

**Storage Location**

Check that keys are not left in source code, Git history, Docker images, plaintext configuration files, or logs. Since environment variables can also be exposed through `/proc/self/environ`, debug dumps, or runtime diagnostic tools, separate production secrets into KMS, HSM, or Secret Managers whenever possible.

**Access Permissions**

Use dedicated systems like KMS, HSM, or Secret Managers and apply the principle of least privilege.

**Lifecycle**

Confirm that policies for key rotation, revocation, re-issuance upon incidents, and re-encryption of legacy data exist.

## 4. Understanding Operating Modes and Vulnerabilities: CBC / CTR / GCM

### CBC Mode and IV

In CBC, the IV does not need to be secret. It can generally be transmitted along with the ciphertext. What's important is that the IV must be **unpredictable** at the time of encryption and must be included in the **integrity protection scope**.

If the IV is tampered with, the first plaintext block can be changed in a way intended by the attacker. Therefore, when using CBC, "encryption only" is insufficient; it must be accompanied by MAC or AEAD-level authentication.

    P_1 = D_k(C_1) XOR IV
    P_n = D_k(C_n) XOR C_{n-1}

From an analyst's perspective, even in special situations where the symmetric key is obtained but the IV is unknown, the remaining blocks except for the first one can be decrypted using the previous ciphertext block due to the CBC structure.

### CTR Mode and Nonce

#### Nonce Reuse is a Structural Disaster

In CTR/GCM families, the nonce is not a secret. The key is not whether the attacker knows the nonce, but **whether the nonce was reused with the same key**. If the same key and nonce combination is repeated, the same keystream is generated, and XORing the two ciphertexts reveals the XOR relationship between the plaintexts.

    C1 = P1 XOR Stream(K, Nonce)
    C2 = P2 XOR Stream(K, Nonce)
    C1 XOR C2 = P1 XOR P2

### AES-GCM and AES-GCM-SIV

**AES-GCM**

A high-performance AEAD widely used in modern protocols. It provides both confidentiality and authentication but is extremely sensitive to nonce reuse.

**AES-GCM-SIV**

A misuse-resistant AEAD designed so that accidental nonce reuse does not immediately lead to disaster like standard GCM. However, this does not mean nonce reuse is encouraged.

#### The Absolute Rule of AEAD

Plaintext that fails tag verification must be treated as non-existent. Even if the library has generated some plaintext in an internal buffer, the application must never use it.

## 5. RSA Encryption and PKCS#1 v1.5: "Broken" vs. "Dangerous"

When looking at RSA, the first thing to distinguish is **encryption** vs. **signing**. RSAES is for encryption, and RSASSA is for signing. They share the same RSA mathematical structure but have different security conditions and padding methods.

### The Status of PKCS#1 v1.5 Encryption Padding

The padding format for RSAES-PKCS1-v1_5 is roughly as follows:

    EM = 0x00 || 0x02 || PS || 0x00 || M

- `PS` is a non-zero random byte string.
- This structure itself hasn't faced a "new mathematical collapse."
- However, in a chosen-ciphertext scenario, if differences in decryption errors, timing, logs, or responses are visible, it can become a padding oracle.

#### Key Judgment: Oracle Exposure is More Critical than PKCS#1 v1.5 Itself

It is dangerous if external users can repeatedly submit arbitrary ciphertexts and the server shows different padding errors, length errors, key errors, or MAC errors, or exposes timing differences. In this case, an attacker can obtain internal information bit by bit "without directly seeing the decryption result."

<table class="decision">
<thead>
<tr>
<th>Scenario</th>
<th>Judgment</th>
<th>Practical Action</th>
</tr>
</thead>
<tbody>
<tr>
<td>RSA encryption needed for new design</td>
<td>Avoid PKCS#1 v1.5</td>
<td>Use RSA-OAEP or KEM/Hybrid structures</td>
</tr>
<tr>
<td>Maintaining PKCS#1 v1.5 for legacy compatibility</td>
<td>Legacy risk</td>
<td>Minimize decryption API exposure, unify error responses, check timing differences</td>
</tr>
<tr>
<td>For wrapping random CEK/Session keys</td>
<td>Relatively limited risk</td>
<td>Check RNG, key length, oracle defense, failure handling</td>
</tr>
<tr>
<td>Directly encrypting user-input messages with RSA</td>
<td>Inappropriate</td>
<td>Change to a hybrid encryption structure</td>
</tr>
</tbody>
</table>

### RSA-OAEP and RSA-PSS

**Encryption: RSA-OAEP**

For new RSA encryption, OAEP is the default choice. Implementation and parameter selection are still important for OAEP, but it fits modern security models better than PKCS#1 v1.5 encryption.

**Signing: RSA-PSS**

For signatures, RSA-PSS is the modern recommended method over PKCS#1 v1.5 signatures. Do not confuse encryption padding discussions with signature padding discussions.

### RSA-PKCS#1 v1.5 Decryption Audit Points

- Are the causes of decryption failure indistinguishable in external responses?
- Are the processing times for success/failure paths observably different?
- Do padding checks, length checks, and delimiter searches create data-dependent branches?
- Are defenses like random replacement values or implicit rejection applied upon failure?
- Is RSA blinding applied to reduce the risk of side-channel attacks on private key operations?
- is the decryption API directly exposed to the outside or repeatedly callable?

#### Conclusion

To the question, **"Is there a new major collapse in the PKCS#1 v1.5 random padding logic itself?"**, the answer is usually "Not in that sense." However, to the question, **"Is it a secure choice for a new system?"**, the practical answer is "No. You should use OAEP or KEM-based structures."

## 6. Analyst's Eye: Cryptographic Reversing and Protocol Dissection

Standard documents explain the mathematical specifications of algorithms, but the actual data flow of an implementation must be verified through binary and dynamic analysis. Commercial modules, in particular, often layer custom wrapping, encoding, endian conversion, and key schedule caching on top of standard algorithms.

**Step 1. Engine Identification**

Identify AES, SEED, ARIA, DES, RSA, etc., through S-Boxes, round constants, initial vectors, constant tables, and function call patterns.

**Step 2. Mode Identification**

Identify operating modes like CBC, CTR, GCM, or ECB. Even with the same block cipher, security properties change completely if the mode is different.

**Step 3. Wrapping Verification**

Check padding, custom Base64, string substitution, endianness handling, header insertion, and the order of MAC combination.

### Master Keys and Round Subkeys

If you see multiple values that look like keys in GDB or Frida during reversing, it might be due to the Key Schedule. For example, block ciphers generate round subkeys from a single master key. For analysis purposes, dumping the entire key schedule array can sometimes allow for the reproduction of encryption/decryption without having to interpret the complex key generation logic to the end.

### Cryptographic DNA in Binaries: S-Box, Constants, and Rotations

The S-Boxes, round constants, and rotation operations encountered when reversing cryptographic algorithms are not just implementation noise; they are strong clues that reveal the design intent of the algorithm.

#### 1. S-Box: The Secret Menu and Confusion

An S-Box is a substitution table that creates a **non-linear** relationship between input and output. If the structure only repeats simple additions or XORs, it could be modeled with linear equations. S-Boxes, however, make inputs jump to unexpected outputs, increasing the cost of mathematical inversion.

- **Identification Clues:** 256-byte tables, fixed substitution tables, constant arrays for AES/SEED/ARIA families.
- **Analysis Significance:** A core component that makes linear and differential cryptanalysis difficult, acting as a fingerprint to identify algorithms in a binary.

By analogy, a linear relationship is a predictable map like `1→2, 2→4`, while a non-linear relationship is a device that intentionally twists rules like `1→9, 2→0` so they don't fold into a single formula.

#### 2. Publicly Verifiable Constants: Nothing-up-my-sleeve

Constants based on Pi, square roots, or specific polynomials provide **public verifiability that the designer did not hide a backdoor by choosing arbitrary numbers**, rather than being sources of randomness. Trust in the algorithm design comes from being able to explain "where the numbers were sourced from."

- **Round Constants:** Prevent the repeating structure from overlapping with itself and make structural attacks like slide attacks difficult.
- **Lottery Analogy:** If the constants are winning numbers, public verifiability is the live broadcast of the drawing. It is evidence that the designer did not determine the numbers in a back room.

#### 3. Rotations and Bitwise Operations: Butterfly Effect and Diffusion

Bitwise operations like rotate, shift, XOR, AND, and OR frequently appear in cryptographic implementations. These are operations that the CPU can process quickly while helping a small change in input spread throughout the entire output across multiple rounds.

- **Avalanche Effect:** When a single input bit changes, many output bits must change.
- **Ink Drop Analogy:** Just as stirring a single drop of ink into clear water changes the color of the entire volume, rotations and XORs act as agitators that diffuse small differences into the entire state.
- **Reversing Clues:** If consistent rotate-left/rotate-right patterns, structures XORed with per-round constants, and repeated word-level endian conversions are found, certain families of block ciphers or hash functions can be suspected.

#### What is a Mathematical Backdoor? The Rigged Lock Analogy

If a typical backdoor is planting a secret password, a mathematical backdoor is closer to **subtly shaving the internal pins of a lock**. It may look sturdy, but if there are specific relationships, constants, curve parameters, or random number generation structures known only to the designer, a computational shortcut might exist.

Thus, in reversing and design review, one must check not only "what the constants are" but also **why those constants were chosen**, **whether the selection process is publicly verifiable**, and **whether the test vectors and standard documents are consistent**.

### Reversing Identification Points

<table>
<thead>
<tr>
<th>Target</th>
<th>Identification Clues</th>
<th>Cautions</th>
</tr>
</thead>
<tbody>
<tr>
<td>ECB</td>
<td>The same input block repeats as the same output block without connection between blocks</td>
<td>Pattern leakage in images/structured data</td>
</tr>
<tr>
<td>CBC</td>
<td>XOR of the decryption result and the previous ciphertext block</td>
<td>Check IV integrity, padding oracle</td>
</tr>
<tr>
<td>CTR</td>
<td>XOR of plaintext and an encrypted incrementing counter</td>
<td>Check nonce reuse and malleability</td>
</tr>
<tr>
<td>GCM</td>
<td>CTR flow + GHASH/Galois Field multiplication routine</td>
<td>Check nonce reuse, tag verification failure handling</td>
</tr>
<tr>
<td>RSA</td>
<td>Large integer modular exponentiation, DER key parsing, OAEP/v1.5 depadding</td>
<td>Check decryption oracle, padding check timing</td>
</tr>
</tbody>
</table>

#### Test Vector Verification

If you have implemented an algorithm yourself or restored it through reversing, you must compare it with standard test vectors. Even if the S-Box and round functions look correct, the results can differ completely due to endianness, padding, IV application, or encoding methods.

## 7. Cryptographic Implementation Vulnerability Analysis Patterns

Vulnerabilities in cryptographic implementations mostly arise not from "weak algorithms" but from **boundary conditions, error handling, key management, reuse, and missing authentication**.

<table>
<thead>
<tr>
<th>Pattern</th>
<th>Risk</th>
<th>Analysis Question</th>
</tr>
</thead>
<tbody>
<tr>
<td>Padding Oracle</td>
<td>Decryption info leakage in CBC/RSA v1.5</td>
<td>Are error messages, HTTP status, timing, or logs different?</td>
</tr>
<tr>
<td>Nonce/IV Reuse</td>
<td>Exposure of plaintext relations or auth key info in CTR/GCM</td>
<td>Is collision prevention designed for distributed environments?</td>
</tr>
<tr>
<td>Encrypt-then-Hash</td>
<td>Recalculatable simple hashes</td>
<td>Is it a secret-key-based MAC or AEAD tag?</td>
</tr>
<tr>
<td>Ignoring Tag Verification</td>
<td>Use of tampered plaintext</td>
<td>Does the application swallow verification failure exceptions and continue processing?</td>
</tr>
<tr>
<td>Key/Seed Log Exposure</td>
<td>Post-decryption and session hijacking</td>
<td>Do secrets remain in debug logs, APM, or crash dumps?</td>
</tr>
<tr>
<td>Downgrade/Fallback</td>
<td>Forced transition from strong mode to weak mode</td>
<td>Can an attacker select compatibility options?</td>
</tr>
</tbody>
</table>

#### Practical Diagnostic Statement

The conclusion "It is secure because it uses AES-256" is insufficient. A practically meaningful judgment should be: "It uses AES-256-GCM, keys are generated and managed based on CSPRNG/KMS, nonces are not reused for the same key, and plaintext is discarded upon tag verification failure."

## 8. Future Threats: Hybrid Quantum-Resistant Protocols

Quantum-resistant transition is not simply about "discarding all RSA immediately." The more realistic questions are **"Can the ciphertexts collected now be decrypted in the future?"** and **"What is the transition plan for data requiring long-term confidentiality?"**

#### Harvest Now, Decrypt Later

Attackers can store traffic that cannot be decrypted today. If sufficient quantum computing power or new attack techniques emerge later, past traffic could be at risk. Systems where long-term confidentiality is critical should consider hybrid key exchange and quantum-resistant KEM transitions from now.

**ML-KEM**

A module-lattice-based KEM standardized in NIST FIPS 203. It is frequently discussed in hybrid structures combined with existing ECC/DH key exchanges.

**Messaging Protocols like PQ3**

This should be viewed from the perspective of protocol design—dealing with key exchange, ratcheting, long-term conversation protection, and post-compromise recovery—rather than just a single algorithm.

## 9. Security Audit Checklist

When analyzing cryptographic modules, protocols, binaries, or server APIs, verify the following items in order.

<table class="checklist">
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<thead>
<tr>
<th>Audit Area</th>
<th>Key Verification Items</th>
</tr>
</thead>
<tbody>
<tr>
<td>Key Generation</td>
<td><ul>
<li>Is CSPRNG used for creating keys, IVs, nonces, and salts?</li>
<li>Are time, PID, counters, or user inputs NOT used as seeds?</li>
<li>Are test keys or fixed keys NOT left in production?</li>
</ul></td>
</tr>
<tr>
<td>Key Management</td>
<td><ul>
<li>Are keys NOT left in code, logs, config files, images, or Git history?</li>
<li>Is there a dedicated secret management system like KMS/HSM/Secret Manager?</li>
<li>Are there procedures for key rotation, revocation, and re-issuance upon compromise?</li>
</ul></td>
</tr>
<tr>
<td>Operating Mode</td>
<td><ul>
<li>Have you checked for the use of ECB?</li>
<li>For CBC, have you checked IV unpredictability and MAC protection?</li>
<li>For CTR/GCM, have you checked the possibility of nonce reuse?</li>
</ul></td>
</tr>
<tr>
<td>Authentication Verification</td>
<td><ul>
<li>Are MAC/AEAD tags used instead of simple hashes?</li>
<li>Is plaintext completely discarded upon tag verification failure?</li>
<li>Are verification failure exceptions NOT swallowed to proceed with subsequent logic?</li>
</ul></td>
</tr>
<tr>
<td>RSA Usage</td>
<td><ul>
<li>Is RSAES-PKCS1-v1_5 NOT used for new encryption?</li>
<li>Does the existing v1.5 decryption API NOT become an oracle?</li>
<li>Are modern recommended methods considered (OAEP for encryption, PSS for signing)?</li>
</ul></td>
</tr>
<tr>
<td>Passwords</td>
<td><ul>
<li>Are passwords NOT stored in a decryptable form?</li>
<li>Are Argon2id/bcrypt/scrypt/PBKDF2 used with per-user salts?</li>
<li>Do cost parameters fit the current system performance and threat model?</li>
</ul></td>
</tr>
<tr>
<td>Reversing/Interoperability</td>
<td><ul>
<li>Have you separately verified the algorithm, mode, padding, encoding, and endian handling?</li>
<li>Have you cross-verified algorithm identification via S-Boxes, round constants, rotations, and key schedule arrays?</li>
<li>Are the grounds for selecting constants and parameters publicly verifiable, and are there no suspected mathematical backdoors?</li>
<li>Do the results match standard test vectors?</li>
<li>Does custom wrapping NOT weaken the security boundary?</li>
</ul></td>
</tr>
</tbody>
</table>

## Reference Standards

- <a href="https://www.rfc-editor.org/info/rfc8017" target="_blank" rel="noopener">RFC 8017: PKCS #1 v2.2</a> — RSA Cryptography Specifications
- <a href="https://datatracker.ietf.org/doc/draft-irtf-cfrg-rsa-guidance/" target="_blank" rel="noopener">IETF CFRG RSA Guidance Draft</a> — Recommendations for RSA implementation and side-channel defense
- <a href="https://csrc.nist.gov/pubs/fips/203/final" target="_blank" rel="noopener">NIST FIPS 203</a> — ML-KEM Standard
- <a href="https://security.apple.com/blog/imessage-pq3/" target="_blank" rel="noopener">Apple PQ3 Blog Post</a> — Example of a hybrid quantum-resistant messaging protocol

