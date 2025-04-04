---
title: "How to Block ECH and Mitigate DoH in Enterprise Networks"
date: 2025-03-31
description: "A hands-on guide using dnsmasq to filter SVCB and HTTPS records for disabling ECH and enforcing central DNS policies. Notes that DoH requires separate network-layer policies."
tags: ["DNS", "DoH", "ECH", "ESNI", "dnsmasq", "Enterprise Security"]
---

![DNSMASQ-block background](/images/post/dnsmasq-ech-doh-block.webp)

## Background

Public DNS services like Cloudflare (1.1.1.1) and Google (8.8.8.8) have increasingly been abused as C2 channels for malware.  
Technologies such as DoH (DNS over HTTPS) and ECH (Encrypted Client Hello) encrypt DNS traffic and SNI fields, making it difficult for security solutions to detect and inspect network activity.

> **Note**: ESNI (Encrypted SNI) is deprecated and has been replaced by **ECH** as the current standard. This guide focuses on ECH only.

---

## Threat Factors

- **Policy Bypass**: Users can manually configure public DoH servers like Cloudflare or Google, bypassing enterprise DNS policies.  
- **C2 Evasion**: ECH encrypts the SNI field during TLS handshakes, making domain-based filtering difficult.  
- **Data Exfiltration**: Encrypted DNS channels may be exploited to send internal data outside the organization.

---

## Core Point: ECH and DoH Are Separate – Different Mitigations Required

- The method described in this post using **dnsmasq targets only ECH**.
- **DoH is not blocked** by this method. Since DoH sends DNS queries over HTTPS, separate network-layer actions such as firewall rules or IP blocking are required.
  - Examples: Block Cloudflare DoH (1.1.1.1:443), Google DoH (8.8.8.8:443), etc.
  - Reference: [Cisco Umbrella Guide to Prevent DoH Circumvention](https://support.umbrella.com/hc/en-us/articles/230904088-How-to-Prevent-Users-from-Circumventing-Cisco-Umbrella-with-Firewall-Rules)

---

## Solution: DNS Server-Level Control over ECH

Client-side settings can be easily reverted by users, so it is recommended to **control ECH centrally at the DNS server**.  
By filtering SVCB (65) and HTTPS (64) records using `dnsmasq`, clients can be prevented from advertising or negotiating ECH.

---

## Hands-on: Blocking ECH with dnsmasq on macOS

> For other operating systems (Windows, Linux, etc.), setup steps differ. `dnsmasq` works across platforms but has different installation procedures.

### 1. Install dnsmasq

```bash
brew install dnsmasq
```

### 2. Edit the Configuration File

```bash
sudo nano /opt/homebrew/etc/dnsmasq.conf
```

Add the following lines:

```conf
# Upstream DNS server
server=8.8.8.8

# Filter SVCB (65) and HTTPS (64) records
filter-rr=SVCB,HTTPS
```

### 3. Start dnsmasq

```bash
sudo dnsmasq --conf-file=/opt/homebrew/etc/dnsmasq.conf
```

### 4. Set System DNS to localhost

```bash
networksetup -setdnsservers Wi-Fi 127.0.0.1
```

> For Ethernet connections, replace `Wi-Fi` with `Ethernet`.

---

## Confirming ECH is Disabled

Visit `https://crypto.cloudflare.com/cdn-cgi/trace` to check ECH status.

### Example Output:
![Cloudflare-trace image](/images/post/crypto.cloudflare.com-cdn-cgi-trace.webp)

- Look for `sni=encrypted` or `sni=plaintext`

---

## Conclusion

- Filtering SVCB and HTTPS records using dnsmasq can help block ECH negotiation.
- DoH is not blocked by this approach and requires firewall-based solutions.
- For non-macOS users, refer to OS-specific guides or implement firewall/DNS-layer defenses.
- While blocking ECH improves enterprise visibility, it may reduce user privacy—this trade-off should be acknowledged.

> **Note**: Finally, for readers who are more deeply interested in technologies related to internet censorship, the [net4people/bbs GitHub issues page](https://github.com/net4people/bbs/issues) is a valuable resource where the global community discusses censorship circumvention strategies and the latest research. This forum covers a wide range of topics including the Great Firewall (GFW), Encrypted Client Hello (ECH), DNS encryption, and more, sharing technical insights and solutions.

---

## References

- [Cloudflare on ECH](https://blog.cloudflare.com/encrypted-client-hello/)
- [dnsmasq official documentation](http://www.thekelleys.org.uk/dnsmasq/doc.html)
- [National Security Agency - Adopting Encrypted DNS in Enterprise Environments](https://media.defense.gov/2021/Jan/14/2002564889/-1/-1/0/CSI_ADOPTING_ENCRYPTED_DNS_U_OO_102904_21.PDF)
- [Cisco Umbrella Guide on Preventing DoH Circumvention](https://support.umbrella.com/hc/en-us/articles/230904088-How-to-Prevent-Users-from-Circumventing-Cisco-Umbrella-with-Firewall-Rules)
- [Broadcom's OS-specific DoH blocking strategies](https://knowledge.broadcom.com/external/article/193388)
