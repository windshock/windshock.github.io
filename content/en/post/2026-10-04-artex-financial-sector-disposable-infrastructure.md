---
title: "Re-reading the ARTEX Attacks on Korea's Financial Sector: AI Agents, Disposable VPS Infrastructure, and Non-Customer-Facing Systems"
date: 2026-10-04
lastmod: 2026-10-06
draft: false
featured: true
tags: ["Mind", "AI Security", "ARTEX", "Threat Intelligence", "Anonymous VPS", "Financial Security", "AI Pentest", "API Security"]
categories: ["Security Research", "AI Security"]
description: "A detailed analysis of the ARTEX-linked attacks on Korea's financial sector using public reporting, Shodan/Censys exposure data, anonymous-vps cross-checks, and observed IoCs. The focus is not just the AI tool itself, but disposable infrastructure, non-customer-facing business systems, LLM credential theft, and the defensive changes likely to follow."
---

The most important change in the recent AI-agent attacks against Korea's financial sector is not the headline that “AI hacked a bank.” The more meaningful shift is this: **AI agents reduce the cost of reconnaissance and repeated validation, while disposable VPS/proxy infrastructure reduces the cost of rotating attack egress. Together, they make previously under-prioritized business and partner systems economically attractive targets.**

This post combines public reporting available as of October 4, 2026 with infrastructure observations I have been tracking separately. I will walk through the case as a chain:

**tooling → exposed ARTEX infrastructure → incident IoCs → attacker operating economics → likely defensive changes.**

> **Evidence boundaries first**
>
> - An ARTEX instance exposed on the Internet is not automatically malicious infrastructure.
> - An ARTEX-exposed host and a financial-sector attack IoC appearing in the same VPS/hosting provider does not prove they belong to the same operator.
> - Public reporting supports ARTEX usage traces and AI-agent-based attack activity, but does not prove that ARTEX autonomously executed every phase of the intrusion without human direction.
> - The forward-looking sections in this post are my assessment, not official regulatory guidance.

## Executive summary

1. On September 21, 2026, the Korea Financial Security Institute (FSI) publicly stated that **AI-agent-based attacks targeting the financial sector had been observed in practice**. It had already briefed roughly 160 financial-company security practitioners on September 17.
2. On October 3, Herald Economy reported an FSI official saying that analysis of Shinhan Bank logs and attacker IPs revealed **traces of ARTEX usage**. The same source emphasized that this was not “AI attacking on its own,” but a human attacker using an AI tool.
3. A separate Internet-exposure study published on October 4 identified 359 unique ARTEX-related IPs between September 23 and October 3. This should be read as **exposed ARTEX-related services**, not “359 attacker servers.”
4. In a point-in-time Shodan/Censys snapshot I reviewed, ARTEX exposure overlapped with several providers already represented in my [anonymous-vps](https://github.com/windshock/anonymous-vps) inventory: CTG Server, Cloudie, Vultr, HostEONS, and ServerPoint.
5. In the financial-sector IoC set shared for this investigation, ARISK, InterServer, and Vultr directly intersected with anonymous-vps provider ranges. AS215748 was kept only as a relationship candidate because it is owned by Westeros Communications, even though selected prefix metadata suggests links to ARISK/Light Cloud infrastructure.
6. One IoC, 129.212.181.253:8443, is independently observable in multiple public HTTPS/TLS proxy lists. Not every IoC is a proxy, however; the list also includes large public cloud, hosting, and access-network addresses.
7. The operational advantage is not necessarily “perfect anonymity.” It may be **short-lived, disposable egress that can be replaced before reputation and blocking catch up**.
8. Microsoft disclosed in August 2026 that attacks against AI infrastructure included theft of LLM provider API keys and gateway credentials alongside XMRig cryptomining. AI access itself has become a monetizable asset.
9. Financial institutions are likely to become more conservative about foreign VPS/hosting/proxy access, reassess non-customer-facing business and partner channels, and increase spending on AI-assisted proactive testing.
10. For AI pentest vendors, the supply-chain question may increasingly become not just “which model do you use?” but **whether you have durable, authorized access to models and capabilities that can perform meaningful offensive validation**.

---

## 1. What is actually confirmed?

The first distinction is between **real AI-agent-assisted attacks** and the stronger claim that **ARTEX autonomously conducted the entire intrusion lifecycle**.

On September 21, 2026, the Korea Financial Security Institute published [금융권 AI Agent 공격 현실화, 선제적 대응 강화 필요](https://www.fsec.or.kr/bbs/detail?bbsNo=12062&menuNo=69), stating that AI-agent-based attack attempts against the financial sector had been confirmed in practice. At a September 17 seminar, FSI briefed approximately 160 financial-company security practitioners on recent attack cases, AI-assisted source-code review, AI-assisted black-box testing, and security considerations for using AI/SaaS tools.

FSI also emphasized API security. Its public message was that AI agents can treat APIs connecting data and systems as prime attack surfaces, so organizations need stronger controls around exposed security keys and API governance.

On October 2, [DailySecu](https://www.dailysecu.com/news/articleView.html?idxno=208718) reported details from financial-sector guidance describing a structure involving ARTEX, CLIProxyAPI, automated vulnerability exploration, and rotating overseas proxy infrastructure.

On October 3, [Herald Economy reporting](https://v.daum.net/v/20261003123315260) added a more specific claim: an FSI official said that analysis of Shinhan Bank logs and attacker IPs revealed traces of ARTEX usage. The same reporting said that two or three attacker IPs overlapped across institutions, that the attackers changed IPs after blocking while maintaining the same attack method and vulnerability targets, and that distinctive ARTEX-originated data patterns were observed across incidents.

But the same FSI official also drew an important line:

**This was not AI independently deciding to attack. It was a hacker using an AI tool.**

That distinction matters.

Based on the public record, it is reasonable to say:

- AI-agent-based attack activity against Korean financial institutions was observed.
- FSI-linked reporting says ARTEX usage traces were found while tracing Shinhan Bank logs and attacker infrastructure.
- Multiple IPs were rotated.
- Similar attack methods and vulnerability targets were observed across multiple institutions.
- Public sources have not released the actual ARTEX task/session data, prompt/response transcripts, tool-command history, the underlying model, CLIProxyAPI endpoint configuration, or a step-by-step mapping of which attack phases were executed by ARTEX.

So throughout this article, I use the wording **“ARTEX-linked” or “ARTEX usage traces”**, not “fully autonomous AI hacking.”

---

## 2. Where is ARTEX exposed on the Internet?

ARTEX exposure patterns are interesting because they show how easily this type of agentic pentest infrastructure can be deployed in commodity hosting environments.

An October 4 [DailySecu report summarizing an OASIS Security/AGATHA analysis](https://www.dailysecu.com/news/articleView.html?idxno=208724) stated that ARTEX-related infrastructure was observed 500 times between September 23 and October 3, corresponding to 359 unique IPs and 392 unique IP+port combinations.

Among those 359 IPs, 334—about 93%—were observed at least once on ARTEX's default web service port, TCP/8787.

The reported geographic distribution was:

- United States: 236 (65.7%)
- China: 53 (14.8%)
- Hong Kong: 39 (10.9%)
- Singapore: 12 (3.3%)
- Japan: 5 (1.4%)
- South Korea: 4 (1.1%)

The United States, China, and Hong Kong together accounted for 328 systems, or 91.4% of the observed set.

At the network level, PEG TECH INC / AS54600 accounted for 196 observed systems, approximately 54.6%.

Again, this does **not** mean:

- 359 attackers,
- 359 malicious C2 servers,
- or 359 systems used against Korean banks.

Research, testing, abandoned, personal, and unrelated installations may all be mixed together. Server location also does not reveal the operator's nationality or physical location.

### My Shodan point-in-time snapshot

The table below is from my October 4, 2026 point-in-time analysis of the Shodan Network/Org facet for the HTML title:

ARTEX — 自主渗透测试控制台

I cross-referenced those organizations against my current [anonymous-vps](https://github.com/windshock/anonymous-vps) provider inventory.

Legend:

- ✅ direct provider-range inclusion in anonymous-vps
- ⚠️ relationship/candidate only
- — no direct inclusion in the current inventory

> Shodan and Censys are live systems. Counts change. This is a **2026-10-04 point-in-time OSINT snapshot**, not a permanent reproducible census.

| # | Shodan Network / Org | ARTEX observations | anonymous-vps | Linked ASN / Provider | Generated ranges in repo |
|---:|---|---:|:---:|---|---:|
| 1 | PEG-SV - PEG TECH INC | 247 | — | - | - |
| 2 | TENCENT-NET-AP - Shenzhen Tencent Computer Systems Company Limited | 38 | — | - | - |
| 3 | LUCID-AS-AP - LUCIDACLOUD LIMITED | 11 | — | - | - |
| 4 | AS-COLOCROSSING - HostPapa | 10 | — | - | - |
| 5 | CTGSERVERLIMITED-AS-AP - CTG Server Limited | 8 | ✅ | AS152194 / CTG Server | 147 |
| 6 | TENCENT-NET-AP-CN - Tencent Building, Kejizhongyi Avenue | 7 | — | - | - |
| 7 | N963-AS-AP - N963 PTE. LTD. | 6 | — | - | - |
| 8 | TRUNKNETWORKS-AS - Trunk Networks LTD | 6 | — | - | - |
| 9 | COGNETCLOUD-2 - cognetcloud INC | 5 | — | - | - |
| 10 | COGNETCLOUD - cognetcloud INC | 4 | — | - | - |
| 11 | ALIBABA-CN-NET - Alibaba (US) Technology Co., Ltd. | 3 | — | - | - |
| 12 | CLOUDIE-AS-AP - Cloudie Limited | 3 | ✅ | AS55933 / Cloudie Limited | 123 |
| 13 | NETLAB-SDN - NetLab Global | 3 | — | - | - |
| 14 | ALIBABA-CN-NET - Hangzhou Alibaba Advertising Co.,Ltd. | 2 | — | - | - |
| 15 | AROSS-AS - AROSSCLOUD INC. | 2 | — | - | - |
| 16 | AS-VULTR - The Constant Company, LLC | 2 | ✅ | AS20473 / Vultr | 688 |
| 17 | BGPNETPTELTD-AS-AP - BGPNET PTE. LTD. | 2 | — | - | - |
| 18 | CCSB-AS-AP - CORENET CLOUD SDN. BHD. | 2 | — | - | - |
| 19 | CHINATELECOM-IDC-BTHBD-AP | 2 | — | - | - |
| 20 | CMNET-Jiangsu-AP - China Mobile | 2 | — | - | - |

Within the Shodan top 20, the current anonymous-vps inventory directly overlaps with:

**CTG Server / Cloudie / Vultr**

That does **not** mean the others are “safe.” anonymous-vps is not a universal database of every cloud or hosting ASN on the Internet. It is a focused provider/range inventory intended for threat hunting around privacy-oriented, crypto-friendly, no-KYC, disposable, and operationally relevant VPS/hosting infrastructure.

A major public cloud not appearing in the project does not mean it is not hosting infrastructure.

---

## 3. Censys shows a similar deployment pattern

A point-in-time Censys Organization facet snapshot for the same ARTEX HTML title produced the following distribution.

| Organization | Observed | anonymous-vps | Mapping |
|---|---:|:---:|---|
| Tencent cloud computing (Beijing) Co., Ltd. | 7 | — | - |
| Cogent Communications, LLC | 3 | — | - |
| Tencent Cloud Computing (Beijing) Co., Ltd | 3 | — | - |
| HostPapa | 2 | — | - |
| Netsec Limited | 2 | — | - |
| 80VPS.com | 1 | — | - |
| ACEVILLE PTE.LTD. | 1 | — | - |
| AROSSCLOUD INC. | 1 | — | - |
| Air Products & Chemicals, Inc. | 1 | — | - |
| Alibaba Cloud - US | 1 | — | - |
| Alibaba Cloud LLC | 1 | — | - |
| Aspire Hosting | 1 | — | - |
| Beijing Baidu Netcom Science and Technology Co., Ltd. | 1 | — | - |
| Brander Group Inc. | 1 | — | - |
| Brown Art | 1 | — | - |
| Cogent Communications | 1 | — | - |
| GOLD IP L.L.C-FZ | 1 | — | - |
| GTT | 1 | — | - |
| Globenet Cabos Submarinos America Inc. | 1 | — | - |
| Hosteons Pte. Ltd. | 1 | ✅ | AS142036 / HostEONS |
| Hosteons.com VPS | 1 | ✅ | HostEONS / AS142036 |
| IPXO | 1 | — | - |
| Inner Mongolia Ruitong Network Technology Co., Ltd | 1 | — | - |
| Internet Utilities NA LLC | 1 | — | - |
| JOGCORP SAS | 1 | — | - |
| Jones Interactive, Inc. | 1 | — | - |
| Kaopu Cloud HK Limited | 1 | — | - |
| LEMON TELECOMMUNICATIONS LIMITED | 1 | — | - |
| Linode | 1 | — | - |
| NTT Singapore Pte Ltd | 1 | — | - |
| NetLab | 1 | — | - |
| NetLab Global - AP | 1 | — | - |
| ServerPoint.com | 1 | ✅ | AS26277 / ServerPoint |
| The Constant Company, LLC | 1 | ✅ | AS20473 / Vultr |
| UAB Host Baltic | 1 | — | - |
| UCLOUD INFORMATION TECHNOLOGY (HK) LIMITED | 1 | — | - |
| VpsQuan L.L.C. | 1 | — | - |
| Vultr Holdings, LLC | 1 | ✅ | Vultr / AS20473 |
| Zhejiang zhi cloud information technology co., LTD | 1 | — | - |
| eleven street, No.18 Institute of Jingdong headquarters | 1 | — | - |

The current anonymous-vps overlaps in this Censys snapshot are:

**HostEONS / ServerPoint / Vultr**

The key message from both Shodan and Censys is the same:

**ARTEX is not tied to one special C2 provider. It is an application that can be deployed across many commodity cloud/VPS/hosting environments.**

That also means turning all Internet-visible ARTEX instances into a blocklist would be a poor defensive strategy. Legitimate research and testing instances may be mixed in, and a real attacker does not need to expose the ARTEX management console publicly at all.

---

## 4. Re-baselining the incident IoCs around the FSS-distributed list

A Financial Supervisory Service (FSS) distribution obtained on October 6 changes the cleanest way to structure the incident IoCs in this article.

The document labels the intrusion type as **“suspected automated attack using an AI Agent”** and distributes 19 IP addresses. The country labels below are reproduced from that document as-is.

| FSS-distributed IoC | Country label in document | Current infrastructure context |
|---|---|---|
| 38.244.50.120 | United States | Needs additional context |
| 103.248.148.84 | Japan | ✅ ARISK / AS395793 / 103.248.148.0/23 |
| 129.212.181.253 | United States | DigitalOcean range; port 8443 independently appears in public HTTPS/TLS proxy lists |
| 124.155.252.63 | Hong Kong | Needs additional context |
| 134.185.91.25 | Singapore | Needs additional context |
| 203.160.133.172 | Vietnam | Needs additional context |
| 23.158.220.98 | Thailand | Needs additional context |
| 64.20.39.190 | United States | ✅ InterServer / AS19318 / 64.20.32.0/19 |
| 209.209.85.38 | Malaysia | ⚠️ AS215748 Westeros; ARISK/Light Cloud relationship kept only as candidate |
| 129.212.181.23 | United States | DigitalOcean / AS14061, 129.212.181.0/24 |
| 101.53.80.20 | South Korea | ✅ ARISK / AS395793 / 101.53.80.0/24, KR-localized |
| 74.82.60.23 | United States | Hurricane Electric / AS6939 |
| 34.175.107.233 | Spain | Google Cloud Platform / AS396982 |
| 18.183.215.124 | Japan | AWS EC2 / AS16509 / ap-northeast-1 |
| 104.28.162.188 | Latvia | Cloudflare / AS13335 |
| 104.28.164.188 | Sweden | Cloudflare / AS13335; some IP-intelligence sources classify it as WARP/proxy |
| 104.28.164.196 | Sweden | Cloudflare / AS13335 |
| 104.28.166.183 | Germany | Cloudflare / AS13335; some IP-intelligence sources classify it as WARP |
| 104.28.155.179 | Germany | Cloudflare / AS13335 |

This list is not identical to the supplemental IoC set I had been analyzing earlier. **The FSS-distributed 19 should be treated as the primary official set; previously shared Vultr and other addresses should be kept as supplemental IoCs rather than mixed into the same table.**

That also changes one earlier statement in this post.

For the **19 FSS-distributed IoCs**, the current direct anonymous-vps provider overlap is:

- `103.248.148.84` → ARISK / AS395793
- `101.53.80.20` → ARISK / AS395793
- `64.20.39.190` → InterServer / AS19318
- `209.209.85.38` → AS215748; ARISK/Light Cloud relationship remains candidate-only

Vultr `158.247.245.204` appeared in a previously shared supplemental set, but it is **not present in this FSS-distributed 19-IP document**. I therefore keep the official and supplemental sets separate from here on.

### What stands out in the 10 newly seen addresses

Compared with the earlier working set, 10 addresses are newly present in the FSS distribution.

Several patterns are notable.

1. **A Korea-localized ARISK prefix now appears directly in the official IoCs**
   - `101.53.80.20`
   - prefix: `101.53.80.0/24`
   - origin: **AS395793 Arisk Communications**
   - already present in the anonymous-vps KR-localized dataset

2. **Two addresses appear in the same DigitalOcean /24**
   - `129.212.181.23`
   - `129.212.181.253`
   - both in `129.212.181.0/24`, AS14061 DigitalOcean
   - `.253:8443` is independently distributed in public HTTPS/TLS proxy lists

3. **Hyperscale public cloud is also represented**
   - `34.175.107.233` → Google Cloud Platform
   - `18.183.215.124` → AWS EC2 Tokyo

4. **Five addresses are in Cloudflare AS13335**
   - `104.28.162.188`
   - `104.28.164.188`
   - `104.28.164.196`
   - `104.28.166.183`
   - `104.28.155.179`

The country labels in the FSS document are GeoIP-style location labels and should **not** be treated as attacker location or nationality, especially for Cloudflare/WARP-like egress. Some third-party IP-intelligence sources classify `104.28.164.188` and `104.28.166.183` as Cloudflare WARP/proxy addresses. That supports the possibility that the victim saw an egress layer rather than the origin host, but it does not prove how each address was used at the exact time of attack.

The official IoCs therefore show a mixed infrastructure model:

- anonymous/crypto-friendly VPS,
- commodity VPS,
- hyperscale public cloud,
- transit/hosting,
- Cloudflare egress,
- and at least one endpoint independently observable as a public proxy.

So **“mixed, replaceable VPS/cloud/proxy egress”** is a more accurate description than “anonymous VPS only.”

---

## 5. The clearest public proxy evidence: 129.212.181.253:8443

It would be an overstatement to call every incident IoC a public proxy.

The clearest public evidence is:

**129.212.181.253:8443**

The same endpoint is present in multiple public GitHub proxy datasets. For example:

- [Proxifly HTTPS proxy list](https://github.com/proxifly/free-proxy-list/blob/main/proxies/protocols/https/data.txt)
- [Proxifly U.S. HTTPS list](https://github.com/proxifly/free-proxy-list/blob/main/proxies/countries/US/data.txt)

Both include 129.212.181.253:8443.

This is useful independent evidence that the endpoint was being distributed as a publicly usable HTTPS proxy/egress point.

But even here, attribution has limits:

- The proxy list does not identify the attacker.
- It does not prove who operated the proxy.
- It does not tell us where in the attack chain the endpoint was used.
- It does not prove the attacker owned the infrastructure.

The defensible conclusion is simply:

**This endpoint was publicly observable as HTTPS proxy infrastructure.**

---

## 6. There was a Korean-labeled IoC — and it maps to an ARISK prefix

This section needs a direct correction after reviewing the FSS distribution.

The official IoC list includes:

**`101.53.80.20 (South Korea)`**

The address is inside `101.53.80.0/24`, currently originated by **AS395793 Arisk Communications**. It is also already present in the anonymous-vps [KR-localized CIDR dataset](https://github.com/windshock/anonymous-vps/blob/main/generated/context/kr-localized-cidrs.csv) as:

- `101.53.80.0/24`
- provider: ARISK
- ASN: AS395793
- GeoLite2 country: KR

So my earlier wording that there was no Korean operator range and only a Korea-located Vultr address is no longer correct.

The more accurate distinction is:

- the FSS-distributed list contains **one South-Korea-labeled IP**, `101.53.80.20`;
- that IP is not best understood as a typical Korean residential/customer IP, but as a **Korea-localized prefix currently originated by ARISK**;
- the previously discussed Vultr Korea address `158.247.245.204` belongs to a supplemental IoC set and is not in the FSS 19-IP distribution.

This matters for access-control design.

**A KR GeoIP result does not automatically mean ordinary domestic-user traffic.** Foreign or globally operated VPS providers can announce Korea-localized prefixes or operate Seoul-region infrastructure.

That is why defensive policy needs **ASN/provider context plus a service-specific normal-access model**, not only country-based filtering.

---

## 7. Why I did not classify AS215748 as ARISK

209.209.85.38 is routed within a prefix associated with AS215748, Westeros Communications (THAILAND) CO., LTD.

Public registry/BGP evidence suggests selected prefixes have relationships to ARISK/Light Cloud infrastructure.

But that is not enough to say:

**AS215748 = ARISK**

So in [anonymous-vps data/asns.yml](https://github.com/windshock/anonymous-vps/blob/main/data/asns.yml), I keep the boundary explicit:

- owner: Westeros Communications
- status: candidate
- selected ARISK/Light Cloud relationship recorded for investigation
- AS215748 is not treated as ARISK-owned
- it is not exported into provider ranges as if the ownership were confirmed

This matters in CTI work.

**Relationship is not ownership. Hosting context is not a malicious verdict.**

---

## 8. Why would an attacker use infrastructure that is easy to identify?

This is the most interesting question.

Vultr, InterServer, AWS, GCP, and similar networks are not hard to classify. ASN lookup quickly tells you who the provider is.

So why use **traceable infrastructure**?

My answer is that the operational benefit may be **economics, not perfect anonymity**.

### 8.1 Burn the IP before its reputation becomes expensive

An attack IP gets more expensive over time:

- victim blocklists,
- shared-sector IoCs,
- WAF/IPS reputation,
- AbuseIPDB and similar reputation sources,
- commercial CTI feeds,
- provider abuse handling,
- law-enforcement preservation requests.

A long-lived IP accumulates defensive value.

A new VPS may begin with little or no bad reputation.

The attacker does not necessarily need:

**“an IP nobody can ever trace.”**

They may only need:

**“an IP that works long enough before defenders and reputation systems catch up.”**

### 8.2 Agent orchestration reduces the cost of moving egress

Historically, infrastructure rotation imposed operational costs on attackers.

New server, reinstall tools, reconfigure targets, resume task state.

Agentic orchestration changes that.

Conceptually:

~~~text
Operator
  |
  +-- ARTEX / Agent orchestration
          |
          +-- LLM / tool calls
          |
          +-- CLIProxyAPI / model gateway
          |
          +-- disposable egress
                +-- VPS A
                +-- VPS B
                +-- public proxy
                +-- cloud instance
          |
          +-- target services
~~~

The egress IP can change while the task logic, tooling, target state, and attack strategy remain the same.

That aligns with the public FSI-linked description that IPs changed while attack methods and targeted vulnerabilities remained consistent.

### 8.3 Destroying the VPS can remove guest-level evidence

If the VPS is deleted, defenders lose direct access to artifacts that may have existed only inside that guest:

- ARTEX task/session databases
- prompt/response records
- shell history
- exploit or test scripts
- target lists
- CLIProxyAPI configuration
- API credentials
- local tool output
- temporary logs

That does **not** mean “deleting a VPS makes forensics impossible.”

The provider may still retain:

- account records,
- billing information,
- login IPs,
- API activity,
- VM create/delete timestamps,
- control-plane audit logs,
- snapshots/backups,
- abuse tickets,
- network telemetry.

But the victim does not directly control that evidence.

### 8.4 Cross-border requests create a time barrier

It would be inaccurate to say foreign VPS providers simply refuse Korean investigations.

Response depends on provider policy, jurisdiction, legal process, retention, and the requesting authority.

What is clearly true is:

**Cross-border evidence requests add procedure and time.**

The attacker may only need an instance for hours or days. Legal requests and provider-side preservation can take longer.

That is why I would summarize the value of disposable VPS infrastructure this way:

> **The key advantage of disposable VPS infrastructure is not perfect anonymity. It is short lifetime.**

---

## 9. AI changes the economics of attack, even without a new exploit

If we define AI's value only as “finding a novel zero-day,” we miss the more immediate operational change:

**reducing the unit cost of repetitive attack work.**

A human analyst historically spent time on:

- discovering obscure services,
- understanding functions and workflows,
- enumerating endpoints,
- comparing parameters,
- testing authorization boundaries,
- validating response differences,
- deciding what to probe next.

If an agent automates even part of that loop, the attacker can evaluate more services per unit of time.

~~~text
Service discovery
   ↓
Endpoint/workflow analysis
   ↓
Parameter comparison
   ↓
Authentication/authorization probing
   ↓
Response-difference evaluation
   ↓
Next-candidate selection
   ↓
Repeat
~~~

No new exploit is required for this to matter.

The change is **scale and speed**.

That is especially important in large financial organizations with many small satellite systems and partner-facing services.

---

## 10. Why non-customer-facing business systems matter more now

This may be the most important structural lesson of the incident.

Public reporting associated several affected systems with services such as loan-agent lookup systems, employee business-support systems, sales-support systems, contractor-facing pages, and other non-primary channels.

An October 4 [Yonhap report](https://www.yna.co.kr/view/AKR20261003042451002) described attacks spreading across multiple parts of the financial sector and highlighted the security gap around employee/business-support systems.

I do not think “back office” is broad enough for this category.

Financial institutions must connect not only to customers, but also to:

- employees,
- call-center staff,
- loan agents,
- insurance planners,
- dealerships,
- partners,
- contractors,
- outsourced developers,
- and vendors.

So I use the term:

**non-customer-facing business and partner channels**

This includes:

- employee web/mobile support systems,
- agent/broker portals,
- partner portals,
- vendor support interfaces,
- externally exposed business APIs,
- specialized lookup/request services,
- satellite domains,
- small operational/support UIs.

Calling these a complete **regulatory blind spot** would be too strong.

A better description is:

**a blind spot in security prioritization and control intensity.**

Customer-facing Internet/mobile banking has long been treated as a critical attack surface.

But a large estate of smaller business-support and partner channels may be harder to govern because:

- there are many of them,
- ownership is distributed,
- vendors and development teams vary,
- traffic is low,
- legacy systems survive longer,
- external access is operationally necessary,
- business criticality may be underestimated,
- authentication may exist while object-level authorization is weak,
- and parameter-based authorization flaws are difficult for traditional WAF signatures to detect.

If agents can cheaply enumerate and test these services at scale, previously “uneconomic” targets become worth attacking.

---

## 11. Why IP blocking alone will not be enough

IP blocking remains useful for containment.

But if the attacker can rotate egress cheaply, the defensive observation unit must change.

### IP-centric response

~~~text
IP A → block
IP B → block
IP C → block
...
~~~

If replacing the IP is cheap, defenders stay one step behind.

### Behavior-centric detection

More durable signals may include:

- endpoint access sequence,
- method/URI combinations,
- parameter mutation strategy,
- object-ID enumeration,
- out-of-scope access after successful authentication,
- retry/timeout cadence,
- header combinations,
- User-Agent patterns,
- JSON serialization quirks,
- repeated validation sequences,
- movement across related services in short intervals.

The FSI-linked reporting about **distinctive ARTEX-originated data** is therefore especially interesting.

If those fingerprints become public, they may be far more useful for detection engineering than another list of IP addresses.

The most valuable future disclosures would be:

1. ARTEX-specific HTTP/header/body fingerprints
2. redacted task/session transcripts
3. tool-command history
4. CLIProxyAPI traffic characteristics
5. egress-rotation timeline
6. common request patterns observed across institutions

---

## 12. LLM API keys are now part of the asset inventory attackers can monetize

This is not evidence that the ARTEX financial-sector campaign and the Microsoft cases are the same operation.

But it is important context for understanding attacker economics.

On August 26, 2026, Microsoft Security Research published [When AI infrastructure becomes the target: Securing gateways and control points](https://www.microsoft.com/en-us/security/blog/2026/08/26/when-ai-infrastructure-becomes-target-securing-gateways-control-points/).

Microsoft described compromises involving LiteLLM, RAGFlow, and Kestra.

The initial access methods differed, but the post-compromise goals were consistent.

### LiteLLM

Attackers collected secrets such as:

- model-provider API keys,
- LiteLLM master/proxy keys,
- database connection strings,
- environment variables.

### RAGFlow

Attackers modified LLM configuration logic so that newly entered provider credentials could be intercepted.

Microsoft explicitly named providers including:

- OpenAI
- Azure
- Anthropic
- Gemini

This is more than stealing what already exists. It creates persistence for **future credential capture**.

### Kestra

Microsoft observed secret collection through Docker/container context and also the deployment of **XMRig v6.26.0** for Monero cryptomining.

This is why the wording matters.

It would be wrong to say:

**“Attackers stopped mining crypto and now only steal LLM API keys.”**

A more accurate statement is:

> **LLM credentials and AI-gateway access have been added to the set of assets attackers can monetize.**

An attacker can still mine crypto, steal provider keys, abuse model spend, or pivot into other cloud/database secrets exposed through the same control plane.

---

## 13. The FSS checklist shows that part of the response has already started

When I first drafted this post, the following sections were framed as forecasts. After reviewing the FSS **IT-security self-inspection checklist for financial institutions**, some of them are no longer merely hypothetical.

The FSS checklist explicitly asks institutions to verify:

- blocking and investigation of attacker IPs shared by FSS/FSI,
- removal of unnecessary externally exposed services, ports, APIs, and admin pages,
- full identification of Internet-exposed IT assets and services,
- coverage not only of customer-facing systems but also **employee, call-center, partner, contractor, and remote-maintenance services**,
- whether information can be accessed through a URL without proper login,
- whether users can access files or data outside their authorization,
- MFA for important services,
- session integrity and controls against **horizontal privilege escalation**,
- Rate Limiting and controls against automated bot attacks,
- monitoring of abnormal URLs/parameters, unauthorized IPs, and off-hours administrator access.

In other words, **Attack Surface, Authorization, Automation Abuse, and Monitoring** became explicit post-incident control items.

### Likely defensive change #1: more conservative controls on overseas VPS/hosting access

Financial institutions already use country- and risk-based access restrictions in many environments.

But they cannot apply one rule everywhere. Partner services, SaaS integration, employees abroad, and outsourced operations create legitimate external access requirements.

Still, this incident changes the question.

Old question:

> “Is this IP already malicious in AbuseIPDB?”

Likely future question:

> **“Is there a legitimate reason for this business service to receive traffic from overseas VPS/hosting/public-proxy networks?”**

Where the answer is “almost never,” we may see more combinations of:

- country-based access policy,
- hosting/VPS ASN intelligence,
- public proxy/VPN reputation,
- corporate-egress allowlists,
- partner fixed-egress registration,
- mTLS,
- device-bound authentication,
- step-up authentication for unusual ASN,
- stricter controls for newly seen / low-reputation IPs,
- user/session behavior analytics.

The answer should **not** be blanket blocking of all cloud infrastructure.

AWS, Azure, GCP, and other clouds carry huge volumes of legitimate SaaS, developer, integration, and operational traffic.

The direction should be:

**service-specific normal-access models**, not simplistic global blocking.

---

## 14. Likely defensive change #2: AI pentest demand will rise

If attackers can use agents to explore externally exposed services at scale, defenders will naturally ask:

> **“Can we use AI to inspect everything before the attacker does?”**

That shift is already visible in policy.

On September 3, 2026, Korea's Financial Services Commission announced a [second emergency relaxation of network-separation rules](https://www.fsc.go.kr/po010104/87646) to broaden security use of Frontier AI.

FSI's September seminar also included AI-assisted source-code review and AI-assisted black-box testing.

So it is reasonable to expect rising demand for:

- AI pentest,
- agentic security testing,
- external attack-surface validation,
- automated authorization testing,
- continuous black-box verification.

But there is a supply-side issue.

---

## 15. AI-pentest supply-chain risk: authorized capability access may matter more than benchmark scores

South Korea is not blocked from Claude generally.

Anthropic's [Supported Countries and Regions](https://www.anthropic.com/supported-countries) includes South Korea for Claude.ai and commercial API use.

The more interesting issue is the difference between:

**general model access**

and

**access to stronger cyber capabilities that can meaningfully perform exploitation/pentest work.**

Anthropic's September 2026 material on [Claude Fable 5.1 and Claude Mythos 5.1](https://www.anthropic.com/claude-fable-and-mythos-5-1) describes two configurations of the same underlying model with different safeguards.

The generally available Fable 5.1 can identify software vulnerabilities in source code, but Anthropic states that its cyber safeguards still prevent or redirect higher-risk dual-use work including:

- penetration testing,
- exploit generation,
- binary-based vulnerability scanning.

[Claude Mythos 5.1](https://www.anthropic.com/claude/mythos) provides more permissive safeguards for vetted cybersecurity and life-sciences work through trusted-access programs rather than unrestricted general availability. As of October 4, Anthropic says access remains limited to a small set of vetted organizations and that it is currently only able to make Mythos 5.1 available to a set of U.S. organizations while working to expand access.

This is not a Korea-wide ban on Claude. It is an **access constraint on a stronger capability tier**.

That creates a new procurement question for AI-pentest services.

“Powered by Claude” is not enough.

Buyers may increasingly need to ask:

1. Which model/tier is actually used?
2. Is the pentest/exploit capability available under an authorized access path?
3. Is the service mostly powered by the vendor's own tools, or does it depend on the model itself performing high-risk cyber work?
4. What happens when the model provider changes safeguards?
5. Does the service depend on jailbreaks or safeguard bypasses?
6. If relays/proxies are used, what are the credential and data boundaries?
7. Is there a viable fallback model or toolchain?

If a vendor's core capability depends on bypassing provider safeguards, that is not just a clever technical implementation.

It is a **business-continuity and supply-chain risk**.

What works today can disappear after a safeguard update tomorrow.

So the AI-pentest market may end up valuing:

**authorized model access + policy stability + toolchain independence**

as much as model benchmark scores.

---

## 16. Defensive change #3: non-customer-facing systems are already being re-baselined

This is no longer only a forecast. The FSS checklist explicitly defines the review scope to include not only customer-facing services but also employee, call-center, partner, contractor, and remote-maintenance services.

That effectively formalizes a shift away from protecting only the most visible customer channels toward inventorying and reassessing the broader Internet-exposed business and partner estate.

Likely targets for re-review include:

- employee support portals,
- loan-agent / insurance-agent systems,
- partner/dealer portals,
- partner APIs,
- contractor-access sites,
- legacy standalone domains,
- externally reachable admin/support endpoints,
- low-volume lookup services,
- satellite applications run by separate vendors.

The key question may shift from:

**“Is this customer-facing?”**

to:

- Is it Internet-exposed?
- Can it access personal information?
- Is object-level authorization enforced on the server?
- Are user role and target object tightly bound?
- Can changing an object ID expose another user's data?
- Does the API trust client-supplied identity or role data?
- Is external access actually necessary?
- Can normal ASN/country/device profiles be defined?
- Are there old services with unclear ownership?

This is no longer only a vulnerability-scanning problem.

It is:

**Attack Surface Management + Authorization Review + Identity Architecture.**

---

## 17. What I would prioritize inside a financial institution

If I were prioritizing controls after this incident, I would start here:

| Priority | Action | Why |
|---|---|---|
| P0 | Inventory every externally exposed business/partner service | You cannot protect what you do not know exists |
| P0 | Revalidate server-side authorization for PII/privileged APIs | Direct response to parameter tampering and object-level access-control failures |
| P0 | Temporary incident-IoC + hosting/VPS/proxy controls | Immediate containment for active campaigns |
| P0 | Preserve raw HTTP request/header/body evidence where lawful and appropriate | Needed to find agent/tool fingerprints after IP rotation |
| P1 | Define normal country/ASN/device models per service | Better than blanket blocking |
| P1 | Strengthen MFA/step-up/device binding for employee/agent/partner accounts | Reduces abuse of non-customer credentials |
| P1 | Detect object enumeration and abnormal access-rate patterns | Finds post-login data-harvesting behavior |
| P1 | Run AI-assisted black-box authorization testing | Lets defenders probe repeatable logic flaws before attackers |
| P2 | Create VPS/provider abuse and evidence-preservation playbooks | Start foreign-provider preservation early |
| P2 | Inventory and rotate LLM/API secrets | Prepare for AI-control-plane compromise |
| P2 | Review AI-pentest vendor supply chain | Model-access and safeguard changes can break service capability |

One area deserves emphasis: **log preservation**.

If an attack rotates source IPs, retaining only source IP and response code is weak evidence.

Useful forensic retention may include:

- reverse proxy/WAF raw logs,
- application access logs,
- safely retained request bodies where legally and operationally appropriate,
- HTTP headers,
- authentication events,
- authorization decisions,
- object identifiers accessed,
- response code/size,
- device/session identifiers,
- upstream proxy/load-balancer metadata.

That is how defenders can later link:

**different IPs, same agent/tool behavior.**

---

## 18. The more durable indicator may be the agent fingerprint, not the IP

The most valuable next disclosure may not be another 100 IPs.

IPs rotate.

Automation habits last longer.

Potentially useful fingerprints include:

~~~text
[Infrastructure]
new VPS / proxy / cloud egress
        ↓
[Recon]
same discovery sequence
        ↓
[Request mutation]
same parameter strategy
        ↓
[Authorization probe]
same object-access pattern
        ↓
[Validation]
same retry / timing / response checks
        ↓
[Agent / tool fingerprint]
headers + JSON + command pattern + sequence
~~~

An agent is still software.

Even if prompts vary, the following can leave repeatable traces:

- tool wrappers,
- request builders,
- retry policies,
- concurrency models,
- JSON serializers,
- default headers,
- exception handling,
- timing behavior.

So threat intelligence may need to evolve from:

> “Is this IP malicious?”

toward:

> **“Did these requests come from the same automation stack?”**

---

## 19. What this IoC set does and does not tell us

### What it does tell us

- multiple kinds of cloud/VPS/hosting egress were involved,
- some IoCs directly overlap with anonymous-vps provider inventories,
- at least one endpoint is independently observable as a public proxy,
- a foreign VPS localized to South Korea appears in the set,
- early reputation may be weak or clean for some infrastructure,
- the structure is operationally compatible with IP rotation.

### What it does not tell us

- a provider listed in anonymous-vps is malicious,
- an ARTEX server seen in Shodan participated in the banking attacks,
- an ARTEX server in the U.S. means the operator was American,
- a non-matching IP is not VPS/proxy/cloud infrastructure,
- a clean AbuseIPDB score means an IP is safe,
- a public proxy endpoint is attacker-owned,
- all 359 ARTEX-exposed systems are one campaign,
- ARTEX autonomously executed the entire intrusion lifecycle.

In CTI work:

**observation, relationship, assessment, and attribution are different stages.**

Mixing them produces bad intelligence.

---

## 20. Conclusion: AI may be changing attack economics more than exploit mechanics

If we reduce this incident to:

**“AI hackers attacked Korean banks”**

we miss the more important shift.

What I see is:

~~~text
AI Agent
  ↓
lower cost of discovery / analysis / repeated validation
  ↓
more external services become economically attackable
  ↓
Disposable VPS / Proxy
  ↓
lower cost of egress rotation
  ↓
shorter lifetime for IP reputation
  ↓
attack surface expands into non-customer-facing business and partner systems
~~~

At the same time, servers now contain a new class of high-value secret:

**LLM API keys, AI gateway credentials, and model access.**

So defensive strategy is likely to move toward a combination of:

**behavior patterns + agent fingerprints + VPS/proxy intelligence + server-side authorization + non-customer-facing attack-surface management + AI-assisted proactive testing.**

IPs can be discarded and replaced.

But **repeated attacker behavior, automation-stack implementation habits, and broken server-side authorization models are much harder to rotate away.**

That is probably where defenders should look next.

---

## Appendix A. Summary of ARTEX exposure vs anonymous-vps overlap

| Dataset | Direct anonymous-vps overlap |
|---|---|
| Shodan ARTEX Network/Org snapshot | CTG Server / Cloudie / Vultr |
| Censys ARTEX Organization snapshot | HostEONS / ServerPoint / Vultr |
| FSS-distributed 19 IoCs | ARISK / InterServer |
| Earlier supplemental IoCs | Vultr and other separately shared addresses |
| Relationship candidate only | AS215748 Westeros ↔ ARISK/Light Cloud |

This is **provider/infrastructure context**, not a malicious-provider verdict.

---

## Appendix B. What is still not public

The most valuable missing data remains:

- full incident IoC set with role attribution,
- ARTEX task/session records,
- actual prompt/response transcripts,
- tool-command history,
- ARTEX version/build identifier,
- CLIProxyAPI endpoint/configuration,
- LLM/model provider used,
- concrete HTTP fingerprint attributed to ARTEX,
- full egress-rotation timeline,
- original HTTP request/response samples,
- precise mapping of which phases in each institution involved ARTEX.

If the shared **HTTP/JSON fingerprint** is eventually published, it may become more operationally useful for detection engineering than the IP list itself.

---

## References

### Financial-sector incident and policy

1. Korea Financial Supervisory Service (FSS), “Request for Financial-Sector IT Security Self-Inspection in Preparation for Security Incidents” and attached checklist, distributed 2026-10-02.
2. Korea Financial Supervisory Service (FSS), distributed suspicious-IP list — intrusion type: “suspected automated attack using an AI Agent,” 2026-10.
3. Korea Financial Security Institute (FSI), [금융권 AI Agent 공격 현실화, 선제적 대응 강화 필요](https://www.fsec.or.kr/bbs/detail?bbsNo=12062&menuNo=69), 2026-09-21.
4. Korea Financial Services Commission (FSC), [Second emergency relaxation of network-separation rules for AI security use](https://www.fsc.go.kr/po010104/87646), 2026-09-03.
7. DailySecu, [ARTEX로 금융권 광범위 공격…AI가 파고든 API 권한검증 허점](https://www.dailysecu.com/news/articleView.html?idxno=208718), 2026-10-02.
6. Herald Economy, [은행 연쇄 해킹 도구는 중국 ‘아르텍스 AI’…해커가 사용했다](https://v.daum.net/v/20261003123315260), 2026-10-03.
5. DailySecu, [ARTEX 관련 고유 IP 359개 분석](https://www.dailysecu.com/news/articleView.html?idxno=208724), 2026-10-04.
8. Yonhap News, [AI로 상호금융까지 광범위 공격…“해킹 시도 훨씬 많을 수도”](https://www.yna.co.kr/view/AKR20261003042451002), 2026-10-04.

### AI infrastructure and credential theft

9. Microsoft Security Research, [When AI infrastructure becomes the target: Securing gateways and control points](https://www.microsoft.com/en-us/security/blog/2026/08/26/when-ai-infrastructure-becomes-target-securing-gateways-control-points/), 2026-08-26.

### AI-pentest model access and safeguards

10. Anthropic, [Introducing Claude Fable 5.1 and Claude Mythos 5.1](https://www.anthropic.com/claude-fable-and-mythos-5-1), 2026-09-01.
9. Anthropic, [Claude Mythos](https://www.anthropic.com/claude/mythos), accessed 2026-10-04.
10. Anthropic, [Supported countries and regions](https://www.anthropic.com/supported-countries), accessed 2026-10-04.
11. Anthropic, [Measuring LLMs' ability to develop exploits](https://www.anthropic.com/research/exploit-evals), 2026-05-22.

### Infrastructure / proxy / provider context

14. windshock, [anonymous-vps](https://github.com/windshock/anonymous-vps).
13. anonymous-vps, [generated provider ranges](https://github.com/windshock/anonymous-vps/blob/main/generated/detection/provider-ranges.csv).
14. anonymous-vps, [KR-localized CIDRs](https://github.com/windshock/anonymous-vps/blob/main/generated/context/kr-localized-cidrs.csv).
15. anonymous-vps, [ASN relationship data](https://github.com/windshock/anonymous-vps/blob/main/data/asns.yml).
16. Proxifly, [free-proxy-list](https://github.com/proxifly/free-proxy-list).
17. IPinfo, [103.248.148.0/24 — AS395793 Arisk Communications](https://ipinfo.io/ips/103.248.148.0/24).
18. IPinfo, [64.20.39.0/24 — AS19318 InterServer](https://ipinfo.io/ips/64.20.39.0/24).
19. IPinfo, [209.209.85.0/24 — AS215748 Westeros Communications](https://ipinfo.io/ips/209.209.85.0/24).
20. Shodan, [Search](https://www.shodan.io/).
21. Censys, [Search](https://search.censys.io/).

---

### Snapshot / reproducibility note

- Analysis timestamp: **2026-10-04 KST**
- Shodan/Censys search results and facet counts can change continuously.
- anonymous-vps provider ranges also evolve as the repository is updated.
- A ✅ mark in this post means **intersection with the repository inventory at the time of analysis**, not a malicious verdict.
- This article is based on public information and point-in-time OSINT. It is not intended as attacker attribution.
