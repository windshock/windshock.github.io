---
title: "In-Depth Report on Telecommunication Security: SKT Breach and Global Case Studies"
date: 2025-04-28
draft: false
tags: ["Telecom Security", "SKT Breach", "SIM Security", "5G Security", "APT Attacks", "SS7 Vulnerability"]
categories: ["Security Research", "Telecom Security"]
summary: "An in-depth analysis focusing on the 2025 SKT breach, the core security structures of telecom infrastructure, and historical global incidents (Gemalto, APT10, Circles). Also covers subscriber authentication (Ki, SUPI/SUCI) and security differences between 5G SA and NSA."
---

# In-Depth Report on Telecommunication Security

---

# 1. The Heart of Telecom Infrastructure: Ki and Subscriber Authentication Architecture

## What is Ki?

- **Ki (Key)** is the absolute secret key used to identify and authenticate mobile subscribers.
- It is stored securely within the USIM card and the carrier’s core authentication servers (HLR/HSS/5GC), never exposed externally.
- Authentication is performed by exchanging a random number (RAND) and a response (SRES) based on the Ki.

**If Ki is leaked:**  
→ Attackers could create a "fake USIM" and successfully authenticate to the network.  
→ This leads to risks like call interception, location tracking, and data theft.

## Subscriber Authentication Flow

- **2G (GSM):** RAND → Generate and send SRES → Carrier verifies
- **3G (UMTS) / 4G (LTE):** Authentication using AKA protocol and RES response comparison
- **5G (SA structure):** Protect SUPI → Only send encrypted SUCI over the network

**Reference:** [3GPP TS 33.102](https://portal.3gpp.org/desktopmodules/Specifications/SpecificationDetails.aspx?specificationId=227)

---

# 2. 5G NSA vs. 5G SA: Structural Differences and Security Comparison

## NSA Architecture (Non-Standalone)

- Adds 5G radio (NR) to the existing LTE Core (EPC).
- Subscriber authentication and session management still rely on LTE procedures.
- IMSI plaintext exposure risk remains.

## SA Architecture (Standalone)

- Fully independent 5G Core (5GC) deployment.
- Enhanced protection through public key encryption → SUPI is encrypted and transmitted as SUCI.

**SUCI (SUPI Concealment):**
- Subscriber devices encrypt SUPI using the carrier's public key, sending SUCI instead.
- The carrier decrypts SUCI to retrieve SUPI for authentication.

**Reference:** [3GPP TS 33.501](https://portal.3gpp.org/desktopmodules/Specifications/SpecificationDetails.aspx?specificationId=3169)

---

# 3. Technical Analysis of the SKT 2025 Breach

## Incident Overview

- On April 19, 2025, SK Telecom detected signs of a breach in its core network servers.
- Potential leakage of USIM information affecting approximately 23 million subscribers.

## Technical Issues

- Plaintext transmission risks under NSA-based architecture.
- Ki leakage enables USIM cloning and SIM swapping attacks.

## Potential Attack Scenario

- Core server infiltration → Access to subscriber database → Create cloned USIM → Hijack personal communications.

**References:**  
- [Yonhap News Report](https://www.yna.co.kr/view/AKR20250422072300017)  
- [SKT Official Announcement](https://news.sktelecom.com/211423)

---

# 4. In-Depth Analysis of Historical Global Cases

## Gemalto Hacking Incident

- 2010–2011: NSA and GCHQ targeted SIM card manufacturer Gemalto.
- Attempted to steal SIM encryption keys (Ki) on a massive scale.

**References:**  
- [The Intercept - The Great SIM Heist](https://theintercept.com/2015/02/19/great-sim-heist/)  
- [WIRED - Gemalto Hacked](https://www.wired.com/2015/02/gemalto-confirms-hacked-insists-nsa-didnt-get-crypto-keys/)

## APT10 Operation Soft Cell

- Chinese APT10 group infiltrated global telecom core networks.
- Mass theft of VIP subscribers' call records and location data.

**Reference:**  
- [Cybereason - Operation Soft Cell](https://www.cybereason.com/blog/research/operation-soft-cell-a-worldwide-campaign-against-telecommunications-providers)

## Circles SS7 Eavesdropping

- Circles, affiliated with NSO Group, sold SS7-based interception systems.
- At least 25 governments purchased this technology for mass surveillance.

**Reference:**  
- [Citizen Lab - Running in Circles](https://citizenlab.ca/2020/12/running-in-circles-uncovering-the-clients-of-cyberespionage-firm-circles/)

---

# 5. Historical Limitations of Telecom Security Architecture: Critique on PKI and HSM Absence

## Why Wasn't PKI Implemented in Early Mobile Networks?

During the 2G/3G era, devices faced critical limitations in CPU performance, battery capacity, and network speed.

- Public key operations like RSA and ECC were impractical with available technology.
- Devices lacked sufficient computational and energy resources for real-time encryption.

**Practical Choice:**  
→ A simple and fast symmetric key-based (Ki) authentication structure was adopted.

---

## However, the Issues Were:

- **IMSI** was transmitted in plaintext, exposing users to **IMSI catcher (fake base station)** attacks.
- If Ki stored in USIMs were stolen, **USIM cloning** and **identity spoofing** attacks became feasible.
- **Supply chain risks** (SIM manufacturers, telecom operators) were underestimated.

Moreover,  
there was a **lack of Hardware Security Modules (HSM)** or equivalent secure hardware protection at that time.

- Core servers (HLR/HSS) also lacked **clear key separation** and **internal cryptographic hardware processing**.
- If a core server was compromised, large-scale Ki leakage could occur.

Thus, early mobile systems prioritized  
**"rapid commercialization" and "low-cost deployment"** over **deep security architecture**, resulting in serious structural vulnerabilities.

---

## Why PKI and HSM Are Now Essential

Today:

- Modern devices can handle public key operations (RSA, ECC) in real time.
- Network latency and performance have improved sufficiently to support encryption.

To strengthen telecom security today, we must implement:

- **SUPI Encryption (SUCI):** Prevent plaintext transmission of subscriber identifiers.
- **TLS Secure Channels:** Ensure end-to-end security across internal and external network boundaries.
- **Network Slice-Specific Security Policies:** Maintain isolation and protection between services.

And on the server side:

- Software-based key protection alone is insufficient.
- **HSM** or equivalent **Secure Environment** must be used to:
  - Prevent key leakage
  - Protect boot integrity
  - Detect and resist physical tampering

**In short:**  
Early mobile networks sacrificed security for rapid rollout,  
whereas today, **trust** is the absolute prerequisite for telecom infrastructure.

---

# 6. Practical Countermeasures for Individual Users

- **Use OpenVPN through a Home Router and Restrict Access to Main Services by IP Address**  
  [OpenVPN Installation Guide](https://openvpn.net/community-resources/how-to/)
- **Adopt OTP Apps**  
  [Google Authenticator Introduction](https://support.google.com/accounts/answer/1066447)
- **Use Hardware Security Keys**  
  [YubiKey Official Site](https://www.yubico.com/products/)
- **Demand 5G SA Infrastructure Upgrades from Carriers and Government**  
  [Qualcomm - 5G SA vs NSA](https://academy.qualcomm.com/blogs/NSA-vs-SA-in-5G)

---

# 7. Conclusion

There is no such thing as a perfect network.  
But daily, proactive efforts to protect ourselves  
remain the only true shield against silent, invisible threats.

---

# Additional Comparative Analysis

- **SKT Breach:** Affected ~23 million users; Ki leakage suspected; no abuse reported yet.
- **Gemalto Breach:** Global SIM supply chain attack; mass key leakage debated.
- **APT10 Operation Soft Cell:** Long-term infiltration of telecom cores by a Chinese APT group.
- **Circles Eavesdropping:** SS7 vulnerabilities exploited for covert surveillance on a global scale.

---

# References

- [SKT Official Newsroom](https://news.sktelecom.com/211423)
- [The Intercept - The Great SIM Heist](https://theintercept.com/2015/02/19/great-sim-heist/)
- [WIRED - Gemalto Hacked](https://www.wired.com/2015/02/gemalto-confirms-hacked-insists-nsa-didnt-get-crypto-keys/)
- [Cybereason - Operation Soft Cell](https://www.cybereason.com/blog/research/operation-soft-cell-a-worldwide-campaign-against-telecommunications-providers)
- [Citizen Lab - Running in Circles](https://citizenlab.ca/2020/12/running-in-circles-uncovering-the-clients-of-cyberespionage-firm-circles/)
