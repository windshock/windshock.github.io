---
title: "ARTEX 금융권 공격을 인프라에서 다시 보기: AI Agent, Disposable VPS, 비대고객 업무채널"
date: 2026-10-04
draft: false
featured: true
tags: ["Mind", "AI 보안", "ARTEX", "Threat Intelligence", "Anonymous VPS", "금융보안", "AI Pentest", "API 보안"]
categories: ["보안 연구", "AI 보안"]
description: "금융권 ARTEX 연계 공격을 공개 보도, Shodan/Censys 노출 분포, anonymous-vps 교차 분석과 실제 IoC 관점에서 다시 본다. 회전형 VPS/Proxy가 왜 유리한지, LLM API 자격증명이 왜 새로운 탈취 자산이 되었는지, 금융권의 다음 통제가 어디로 향할지 정리한다."
---

이번 금융권의 AI Agent 기반 공격에서 중요한 변화는 “AI가 해킹했다”는 문구 자체가 아닙니다. **AI Agent가 탐색과 검증의 비용을 낮추고, Disposable VPS/Proxy가 공격 인프라 교체 비용을 낮추면서, 그동안 상대적으로 덜 주목받던 비대고객 업무·제휴 채널까지 경제적으로 공격할 수 있게 됐다는 점**이 더 중요해 보입니다.

이 글은 2026년 10월 4일 기준 공개자료와 제가 별도로 추적한 인프라 데이터를 합쳐, ARTEX 관련 금융권 공격을 **도구 → 인터넷 노출 인프라 → 실제 IoC → 공격자 운영경제 → 방어 변화** 순서로 다시 정리한 기록입니다.

> **먼저 선을 긋습니다.**
>
> - 인터넷에 ARTEX가 노출돼 있다는 사실만으로 그 서버를 악성 인프라라고 볼 수 없습니다.
> - Shodan/Censys의 ARTEX 노출 서버와 금융권 공격 IoC가 일부 같은 VPS/Hosting 사업자에 있다는 사실만으로 동일 운영자라고 볼 수 없습니다.
> - 공개된 금융권 자료는 ARTEX 활용 흔적과 AI Agent 기반 공격 시도를 뒷받침하지만, 공개자료만으로 ARTEX가 침해의 모든 단계를 사람 개입 없이 자율 수행했다고 단정할 수 없습니다.
> - 아래의 전망은 공식 발표가 아니라, 현재 공개된 사실에서 제가 예상한 방어 측 변화입니다.

## 핵심 요약

1. 금융보안원은 2026년 9월 21일 금융권을 겨냥한 **AI Agent 기반 공격 시도가 실제 확인됐다**고 공식 발표했고, 9월 17일 이미 금융회사 보안담당자 약 160명을 대상으로 공격기법과 대응방법을 공유했습니다.
2. 10월 3일 헤럴드경제 보도에서는 금융보안원 관계자가 신한은행 로그와 공격 IP를 역추적한 결과 **ARTEX 활용 흔적이 확인됐다**고 설명했습니다. 동시에 “AI가 독자적으로 공격한 것이 아니라 해커가 AI 도구를 이용한 것”이라고 선을 그었습니다.
3. 별도의 ARTEX 인터넷 노출 분석에서는 9월 23일~10월 3일 사이 359개 고유 IP가 관측됐습니다. 그러나 이는 **공격 서버 359대가 아니라 인터넷에 노출된 ARTEX 관련 서비스의 관측치**입니다.
4. 제가 확보한 Shodan/Censys snapshot을 [anonymous-vps](https://github.com/windshock/anonymous-vps)와 교차하면 ARTEX 노출 인프라에서 CTG Server, Cloudie, Vultr, HostEONS, ServerPoint가 겹칩니다.
5. 공유받은 금융권 IoC에서는 ARISK, InterServer, Vultr가 anonymous-vps provider range와 직접 교차합니다. AS215748은 Westeros 소유이므로 ARISK 자체로 분류하지 않고, ARISK/Light Cloud와의 관계만 candidate로 유지했습니다.
6. 특히 129.212.181.253:8443은 여러 공개 proxy 목록에서 실제 HTTPS/TLS proxy로 관측됩니다. 반면 모든 IoC가 proxy인 것은 아니며, 대형 public cloud·통신사·일반 hosting도 섞여 있습니다.
7. 핵심은 “완벽히 숨는 IP”보다 **평판이 나빠지기 전에 버릴 수 있는 짧은 수명의 egress**일 수 있습니다.
8. Microsoft는 2026년 8월 AI 인프라 침해에서 LLM provider API key와 gateway credential 탈취, XMRig cryptomining이 함께 관찰됐다고 공개했습니다. LLM API 사용권한 자체가 새로운 탈취 자산이 된 것입니다.
9. 앞으로 금융권은 해외 VPS/Hosting/Proxy 접근통제를 더 보수적으로 적용하고, 비대고객 업무·제휴 채널을 전수 재평가하며, AI 기반 선제 점검 구매를 늘릴 가능성이 있습니다.
10. 동시에 AI Pentest 사업자는 “어떤 모델을 쓰는가”뿐 아니라 **실제 pentest/exploit 능력에 정식으로 접근할 수 있는가**가 공급망 리스크가 될 수 있습니다.

---

## 1. 지금까지 확인된 사실: “AI가 혼자 해킹했다”와는 다르다

가장 먼저 구분해야 할 것은 **AI Agent 기반 공격이 현실화됐다는 사실**과 **ARTEX가 전 과정을 완전자율로 수행했다는 주장**입니다.

금융보안원은 2026년 9월 21일 공식 보도자료 [금융권 AI Agent 공격 현실화, 선제적 대응 강화 필요](https://www.fsec.or.kr/bbs/detail?bbsNo=12062&menuNo=69)에서 최근 금융권을 겨냥한 AI Agent 기반 공격 시도를 실제 확인했다고 밝혔습니다. 9월 17일 열린 세미나에서는 약 160명의 금융회사 보안담당자에게 최근 공격 사례, AI 기반 소스코드 점검, AI 기반 블랙박스 점검, 보안 목적 AI/SaaS 활용 시 고려사항을 공유했습니다.

여기서 금융보안원이 특히 지적한 부분은 API입니다. AI Agent가 데이터와 시스템을 연결하는 API를 주요 공격표적으로 삼을 수 있으므로 **보안키 노출 여부와 API 보안관리 강화가 필요하다**고 설명했습니다.

10월 2일 [데일리시큐](https://www.dailysecu.com/news/articleView.html?idxno=208718)는 금융권 권고 내용을 인용하며 ARTEX와 CLIProxyAPI를 연계한 자동화 구조, 해외 임대 proxy의 지속적 교체, 외부 노출 API의 인증·인가 문제를 보도했습니다.

그리고 10월 3일 [헤럴드경제 보도](https://v.daum.net/v/20261003123315260)에서는 한 단계 더 구체적인 설명이 나왔습니다. 금융보안원 관계자는 신한은행 로그와 공격자 IP를 역추적한 결과 ARTEX를 활용한 흔적이 나왔다고 설명했습니다. 은행별 공격 IP 중 2~3개가 겹치고, IP를 차단하면 다른 IP로 바꾸면서도 공격 수법과 노리는 취약점은 같았다고 했습니다. 공격 데이터에는 ARTEX에서 발신되는 특징적인 데이터가 공통적으로 관측됐다는 설명도 나왔습니다.

하지만 같은 인터뷰에서 금융보안원 관계자는 **“AI가 스스로 공격한 것이 아니라 해커가 AI 도구를 이용한 것”**이라고 설명했습니다.

이 구분이 중요합니다.

현재 공개자료로 말할 수 있는 것은 대략 여기까지입니다.

- 금융권 대상 AI Agent 기반 공격 시도는 실제 확인됐다.
- 신한은행 로그와 공격 인프라 역추적 과정에서 ARTEX 활용 흔적이 확인됐다는 금융보안원 관계자 설명이 있다.
- 공격자들은 여러 IP를 바꾸어 사용했다.
- 여러 금융사에서 공격 기법과 대상 취약점이 유사했다.
- 정확한 ARTEX task/session, prompt/response, tool command history, 사용 LLM, CLIProxyAPI endpoint, 어느 공격 단계가 ARTEX로 수행됐는지는 공개되지 않았다.

따라서 이 글에서는 **“ARTEX 연계/활용 흔적이 확인된 금융권 공격”**이라고 표현하되, “AI가 완전자율로 금융권을 해킹했다”라고 확대하지 않습니다.

---

## 2. ARTEX는 인터넷에서 어디에 노출돼 있나

ARTEX 자체의 인터넷 노출 분포를 보면 VPS/Hosting 환경에 쉽게 배포되는 도구라는 특성이 보입니다.

2026년 10월 4일 [데일리시큐가 소개한 OASIS Security/AGATHA 분석](https://www.dailysecu.com/news/articleView.html?idxno=208724)에 따르면, 9월 23일부터 10월 3일까지 ARTEX 관련 인프라는 총 500회 관측됐고 중복을 제거한 고유 IP는 359개였습니다. IP+port 조합은 392개였으며, 359개 중 334개, 약 93%에서 ARTEX 기본 웹서비스 포트 TCP/8787이 한 차례 이상 관측됐습니다.

국가·지역별로는 미국 236개(65.7%), 중국 53개(14.8%), 홍콩 39개(10.9%), 싱가포르 12개(3.3%), 일본 5개(1.4%), 한국 4개(1.1%) 순이었습니다. 미국·중국·홍콩이 328개, 91.4%를 차지했습니다. 네트워크별로는 PEG TECH INC의 AS54600에서 196개가 관측돼 전체의 약 54.6%를 차지했습니다.

다시 강조하지만 이 숫자는 **공격자 수, 공격 서버 수, 피해기관 수가 아닙니다.**

연구용·테스트용·개인 설치·재사용 서버가 함께 포함될 수 있습니다. 서버 위치 역시 운영자의 실제 위치나 국적을 의미하지 않습니다.

### 제가 별도로 본 Shodan snapshot

아래 표는 2026년 10월 4일 분석 시점에 Shodan에서 HTML title **ARTEX — 自主渗透测试控制台**을 기준으로 본 Network/Org facet 상위 20개를, 현재 [anonymous-vps](https://github.com/windshock/anonymous-vps) provider inventory와 교차한 결과입니다.

표시는 다음과 같습니다.

- ✅: anonymous-vps provider range에 직접 포함
- ⚠️: 관계성은 기록돼 있지만 직접 provider range로 넣지 않은 candidate
- —: 현재 anonymous-vps 범위에는 직접 포함되지 않음

> Shodan/Censys는 시점에 따라 결과가 달라집니다. 아래 숫자는 재현 가능한 영구 통계가 아니라 **2026-10-04 point-in-time OSINT snapshot**입니다.

| # | Shodan Network / Org | ARTEX 관측 | anonymous-vps | 연결 ASN / Provider | repo 생성 대역 수 |
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

Shodan 상위 20개 Network/Org 가운데 현재 anonymous-vps와 직접 교차하는 것은 **CTG Server / Cloudie / Vultr** 세 곳입니다.

이것이 “나머지는 안전하다”는 뜻은 아닙니다. anonymous-vps는 인터넷의 모든 hosting/cloud ASN을 수집하는 범용 분류기가 아닙니다. privacy/crypto/no-KYC 또는 공격 인프라 hunting 관점에서 추적 가치가 높은 사업자와 대역을 관리하는 별도 프로젝트입니다. AWS, GCP, Tencent 같은 대형 public cloud가 미포함이라고 해서 hosting이 아니라는 의미가 아닙니다.

---

## 3. Censys snapshot도 같은 그림인가

같은 HTML title을 Censys Organization facet에서 본 snapshot은 다음과 같습니다.

| Organization | 관측 | anonymous-vps | 매핑 |
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

Censys snapshot에서는 **HostEONS / ServerPoint / Vultr**가 현재 anonymous-vps와 교차합니다.

Shodan과 Censys 모두에서 반복해서 보이는 메시지는 비슷합니다.

**ARTEX는 특정 단일 C2 사업자에 종속된 도구가 아니라, 다양한 cloud/VPS/hosting 환경에 쉽게 올릴 수 있는 애플리케이션**입니다.

이 점 때문에 인터넷에 노출된 ARTEX를 단순 blocklist로 바꾸는 것은 위험합니다. 연구자와 보안팀의 합법적 인스턴스까지 섞일 수 있고, 공격자는 애초에 ARTEX 콘솔을 인터넷에 노출하지 않을 수도 있습니다.

---

## 4. 실제 금융권 IoC와 anonymous-vps를 교차해보면

이번에 공유받아 검토한 금융권 관련 IoC를 [anonymous-vps의 provider range](https://github.com/windshock/anonymous-vps/blob/main/generated/detection/provider-ranges.csv)와 대조한 결과는 다음과 같습니다.

| 사건 IoC | anonymous-vps 결과 | 해석 |
|---|---|---|
| 38.244.50.120 | — | 현재 repo 직접 매칭 없음 |
| 103.248.148.84 | ✅ ARISK / AS395793 / 103.248.148.0/23 | VPS/hosting inventory 직접 교차 |
| 129.212.181.253 | — | repo 미매칭, 그러나 8443이 공개 HTTPS/TLS proxy 목록에 별도 관측 |
| 124.155.252.63 | — | AS9304 HGC Global Communications 대역 |
| 134.185.91.25 | — | 현재 repo 직접 매칭 없음 |
| 203.160.133.172 | — | 현재 repo 직접 매칭 없음 |
| 23.158.220.98 | — | 현재 repo 직접 매칭 없음 |
| 64.20.39.190 | ✅ InterServer / AS19318 / 64.20.32.0/19 | VPS/hosting inventory 직접 교차 |
| 209.209.85.38 | ⚠️ AS215748 → ARISK candidate_link | Westeros 소유, ARISK/Light Cloud 관계만 candidate |
| 128.247.245.204 | — | 현재 repo 직접 매칭 없음 |
| 52.199.104.217 | — | public cloud 계열, anonymous-vps 목적상 직접 매칭 아님 |
| 34.143.224.40 | — | public cloud 계열, anonymous-vps 목적상 직접 매칭 아님 |
| 18.141.198.40 | — | public cloud 계열, anonymous-vps 목적상 직접 매칭 아님 |
| 8.166.138.183 | — | public cloud 계열, anonymous-vps 목적상 직접 매칭 아님 |
| 156.229.166.79 | — | hosting 계열 정황, repo 직접 매칭 없음 |
| 141.11.132.101 | — | AS151338 POLONETWORK, repo 직접 매칭 없음 |
| 61.224.69.212 | — | 통신사/동적 가입자 계열 정황 |
| 212.135.39.55 | — | 현재 AS61112 AkileCloud Network로 관측 |
| 158.247.245.204 | ✅ Vultr / AS20473 / 158.247.192.0/18 | Vultr, GeoLite2 기준 KR 위치 |
| 34.153.224.40 | — | public cloud 계열, anonymous-vps 목적상 직접 매칭 아님 |
| 23.158.136.31 | — | AS61112 AkileCloud, repo 직접 매칭 없음 |
| 54.249.223.154 | — | public cloud 계열, anonymous-vps 목적상 직접 매칭 아님 |

여기서 **repo에 직접 걸리는 IP가 3개뿐이다**라는 식으로 해석하면 안 됩니다.

이 저장소는 모든 데이터센터 IP를 악성으로 판정하기 위한 데이터베이스가 아닙니다. 예를 들어 AWS나 GCP 같은 대형 cloud 대역은 공격에도 쓰일 수 있지만 정상 사용량이 압도적으로 많기 때문에, 단순 ASN blocklist로 취급하는 것은 탐지 품질이 나쁩니다.

따라서 여기서 의미 있는 것은 숫자 자체가 아니라 **인프라 유형이 섞여 있다는 것**입니다.

- privacy/crypto-friendly VPS/hosting provider inventory와 직접 교차하는 IP
- 대형 public cloud IP
- 일반 hosting/IDC 대역
- 실제 public proxy
- 통신사 또는 dynamic access 성격의 대역

이 구성은 “공격자가 하나의 고정 C2를 오래 유지했다”는 모델보다는 **여러 종류의 egress를 짧게 사용하고 교체할 수 있는 구조**와 더 잘 맞습니다.

---

## 5. 가장 명확한 public proxy 증거: 129.212.181.253:8443

모든 IoC를 public proxy라고 부를 수는 없습니다.

현재 공개정보에서 가장 명확하게 proxy로 확인되는 것은 **129.212.181.253:8443**입니다.

[Intrude Live Proxy Intelligence](https://www.intrude.io/)는 이 endpoint를 현재 **TLS / ANONYMOUS / LIVE** proxy로 표시하고 있습니다.

GitHub의 [Proxifly free-proxy-list](https://github.com/proxifly/free-proxy-list)에도 동일 endpoint가 HTTPS proxy로 올라와 있습니다. 예를 들어 [HTTPS data.txt](https://github.com/proxifly/free-proxy-list/blob/main/proxies/protocols/https/data.txt)와 [미국 proxy 목록](https://github.com/proxifly/free-proxy-list/blob/main/proxies/countries/US/data.txt)에서 129.212.181.253:8443을 확인할 수 있습니다.

이것은 상당히 유용한 독립 정황입니다.

하지만 여기서도 한 단계 더 나가면 안 됩니다.

- 이 proxy를 누가 운영했는지는 별도 문제입니다.
- 금융권 공격자가 이 IP를 어느 구간에서 어떻게 사용했는지는 공개자료만으로 확정할 수 없습니다.
- proxy 목록에 있다는 사실은 endpoint의 기능을 설명하지만, 소유자 attribution을 제공하지 않습니다.

즉 이 IP에서 확인되는 것은 **“실제 public egress/proxy로 사용 가능한 endpoint였다”**는 점까지입니다.

---

## 6. 한국 대역은 정말 없었나: “한국 사업자”와 “한국에 위치한 해외 VPS”를 나눠야 한다

공유받은 IoC에서 한국 위치로 확인되는 것은 **158.247.245.204**입니다.

이 IP는 Vultr / AS20473의 **158.247.192.0/18**에 속하며, anonymous-vps의 [kr-localized-cidrs.csv](https://github.com/windshock/anonymous-vps/blob/main/generated/context/kr-localized-cidrs.csv)에서도 GeoLite2 기준 KR로 분류됩니다.

따라서 정확한 표현은 다음입니다.

- 한국 통신사/한국 사업자가 소유한 대역: 이 목록에서 뚜렷한 직접 매칭은 확인하지 못함
- 한국에 위치한 해외 VPS/Cloud 대역: Vultr 158.247.192.0/18 포함
- 사건 IoC: 158.247.245.204가 해당 대역에 포함

즉 **“국내 사업자 대역은 확인되지 않았지만, 한국에 호스팅된 해외 VPS IP는 하나 있다”**가 더 정확합니다.

이 차이는 방어정책에서도 중요합니다. 단순 GeoIP KR allow 정책만으로는 해외 사업자의 서울 리전 VPS를 정상 국내 접속과 구분할 수 없습니다.

---

## 7. AS215748은 왜 ARISK로 바로 넣지 않았나

209.209.85.38이 속한 **209.209.85.0/24**는 현재 AS215748, Westeros Communications (THAILAND) CO., LTD.로 라우팅됩니다.

그런데 공개 WHOIS/BGP 정보에는 이 대역과 ARISK/Light Cloud 사이의 관계를 시사하는 흔적이 있습니다. 일부 등록정보에는 Light Cloud customer 용도라는 설명과 ARISK geofeed가 나타납니다.

그렇다고 **AS215748 전체를 ARISK 소유로 간주하면 과장**입니다.

그래서 [anonymous-vps의 data/asns.yml](https://github.com/windshock/anonymous-vps/blob/main/data/asns.yml)에서는 이 관계를 다음 원칙으로 다룹니다.

- owner: Westeros Communications
- status: candidate
- ARISK/Light Cloud와 선택적 prefix 관계는 조사 단서로 기록
- AS215748 전체를 ARISK-owned로 취급하지 않음
- provider range export에는 넣지 않음

이런 종류의 경계가 CTI 데이터에서 중요합니다.

**“관계가 있다”와 “소유한다”는 다르고, “hosting 인프라다”와 “악성 인프라다”도 다릅니다.**

---

## 8. 왜 추적하기 쉬운 VPS를 쓰는가

여기서 가장 재미있는 질문이 생깁니다.

Vultr, InterServer, AWS, GCP 같은 IP는 ASN을 조회하면 사업자가 금방 나옵니다. 그렇다면 공격자는 왜 이런 **추적 가능한 인프라**를 사용할까요?

제 생각에 핵심은 **완벽한 익명성이 아니라 운영경제**입니다.

### 8.1 IP reputation이 나빠지기 전에 버린다

공격 IP는 시간이 지나면 비용이 커집니다.

- 피해기관 blocklist
- 금융권 IoC 공유
- WAF/IPS reputation
- AbuseIPDB 같은 공개 평판
- CTI feed
- 수사기관 자료요청

한 IP를 오래 사용할수록 탐지와 차단 확률은 올라갑니다.

반대로 새 VPS를 만들고 새로운 IP를 받으면, 그 IP는 과거 악성 이력이 거의 없을 수 있습니다.

공격자에게 필요한 것은 반드시 **“누구도 추적할 수 없는 IP”**가 아닙니다.

**“차단되기 전에 충분히 일하고, 평판이 나빠지면 버릴 수 있는 IP”**면 충분할 수 있습니다.

### 8.2 IP를 바꾸어도 Agent가 같은 작업을 계속한다

전통적으로 인프라를 자주 바꾸면 운영자에게도 비용이 있었습니다.

새 서버를 만들고, 도구를 설치하고, 타깃을 다시 넣고, 상태를 관리해야 합니다.

하지만 orchestration이 자동화돼 있다면 이야기가 달라집니다.

개념적으로는 다음과 같은 형태가 가능합니다.

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

이 구조에서는 egress IP가 바뀌어도 Agent의 task, 공격 논리, tool chain은 유지할 수 있습니다.

실제로 금융보안원 관계자 설명에서도 **IP가 바뀌어도 공격 수법과 노리는 취약점은 동일했다**고 했습니다.

### 8.3 삭제된 VPS는 guest-level forensic artifact를 없애는 효과가 있다

VPS를 폐기하면 적어도 피해기관이 원격에서 볼 수 있는 대상은 사라집니다.

그리고 해당 VM 내부에만 있던 다음 자료를 확보하기 어려워질 수 있습니다.

- ARTEX task/session DB
- prompt/response 기록
- shell history
- exploit/test scripts
- target list
- CLIProxyAPI 설정
- API key
- local tool output
- temporary logs

다만 이것을 **“VPS를 삭제하면 포렌식이 불가능하다”**고 표현하면 틀립니다.

사업자에게는 별도로 다음이 남아 있을 수 있습니다.

- 가입 계정
- 결제정보
- 로그인 IP
- API 호출
- VM 생성/삭제 시각
- control-plane audit log
- snapshot/backup
- abuse ticket
- 네트워크 로그

문제는 그 자료가 피해기관 손에 바로 있지 않다는 것입니다.

### 8.4 해외 사업자는 attribution에 시간 장벽을 추가한다

해외 사업자가 한국의 조사 요청을 무조건 거부한다고 일반화할 수는 없습니다.

사업자와 국가, 요청 주체, 법적 근거, 보존기간에 따라 대응이 다릅니다.

그러나 분명한 것은 **국경을 넘는 순간 절차와 시간이 추가된다**는 점입니다.

공격자는 몇 시간 또는 며칠만 인프라가 살아 있으면 충분할 수 있지만, 수사·사법공조·사업자 자료요청은 그보다 훨씬 느릴 수 있습니다.

그래서 Disposable VPS의 가장 중요한 장점을 한 문장으로 정리하면 저는 이렇게 봅니다.

> **Disposable VPS의 장점은 완벽한 익명성보다 짧은 수명이다.**

---

## 9. 공격자의 경제성도 AI 때문에 달라진다

AI Agent의 의미를 “AI가 새로운 0-day를 발명한다”에만 두면 핵심을 놓칠 수 있습니다.

더 현실적인 변화는 **기존 공격의 단위비용 감소**입니다.

예전에는 수많은 업무서비스를 하나씩 열어보고, 기능을 파악하고, 파라미터를 비교하고, 권한검증이 빠진 endpoint를 찾고, 응답 차이를 검증하는 작업에 사람 시간이 많이 들었습니다.

Agent가 이 반복을 일부 자동화하면 공격자는 더 많은 서비스를 같은 시간에 확인할 수 있습니다.

~~~text
서비스 발견
   ↓
기능/endpoint 분석
   ↓
요청 파라미터 비교
   ↓
인증·인가 경계 테스트
   ↓
응답 차이 평가
   ↓
다음 후보 선택
   ↓
반복
~~~

새로운 exploit이 없어도 **속도와 규모**가 달라질 수 있습니다.

10월 4일 공개된 ARTEX 노출 분석에서도 연구진은 “중요한 것은 서버 숫자 자체가 아니라, AI를 이용해 침투 과정의 상당 부분을 자동화할 수 있는 시스템이 상당한 규모로 관측된다는 점”을 강조했습니다.

---

## 10. 왜 대고객 서비스보다 비대고객 업무·제휴 채널이 중요해졌나

이번 금융권 사고에서 제일 중요한 구조적 포인트 중 하나입니다.

공개 보도에 따르면 공격·유출이 확인된 시스템에는 다음과 같은 것들이 포함됐습니다.

- 신한은행: 대출모집인용 조회 서비스
- KB국민은행: 직원용 모바일 업무지원 시스템
- 하나은행: 직원 영업지원 시스템(ODS)
- BNK부산은행: 외주 개발직원 관련 웹페이지
- 현대캐피탈: 주택대출 모집인 조회 페이지

10월 4일 [연합뉴스 보도](https://www.yna.co.kr/view/AKR20261003042451002)는 금융권 공격이 은행·저축은행·캐피털·상호금융까지 확대됐으며 직원용 시스템의 빈틈이 주요 문제로 지적됐다고 전했습니다.

이 영역을 단순히 **백오피스**라고 부르기에는 조금 좁습니다.

금융사는 고객뿐 아니라 직원, 상담사, 대출모집인, 보험설계사, 대리점, 제휴사, 외주개발사, 협력업체 등 다양한 외부·준외부 주체와 연결돼야 합니다.

그래서 저는 이 범주를 이 글에서 **비대고객 업무·제휴 채널(non-customer-facing business and partner channels)**이라고 부르겠습니다.

예를 들면 다음과 같습니다.

- 직원 업무지원 웹/모바일
- 모집인·설계사 포털
- 파트너/제휴사 포털
- 외주/협력업체 지원 시스템
- 내부 업무를 위해 외부에 노출된 API
- 특정 직군만 쓰는 조회/신청 서비스
- 오래된 위성 사이트와 별도 도메인
- 본 서비스와 분리된 운영·지원 UI

이 서비스들이 법이나 규제를 전혀 받지 않았다는 의미의 **규제 사각지대**라고 단정하는 것은 적절하지 않습니다.

오히려 **보안 우선순위와 통제 강도의 사각지대**라고 보는 편이 정확합니다.

대고객 인터넷뱅킹/모바일뱅킹은 공격표면이 잘 알려져 있고 보안투자도 집중됩니다.

반면 수많은 업무지원·제휴 채널은 다음과 같은 이유로 관리가 더 어렵습니다.

- 시스템 수가 많다.
- 담당 조직과 개발사가 분산돼 있다.
- 실제 사용자는 제한적이라 트래픽이 적다.
- 오래된 시스템이 남기 쉽다.
- 제휴사/모집인 편의를 위해 외부 접근이 필요하다.
- “고객이 직접 쓰는 핵심 서비스가 아니다”라는 이유로 우선순위가 낮아질 수 있다.
- 인증은 있어도 object-level authorization이 약할 수 있다.
- 파라미터를 바꿨을 때 다른 사용자의 데이터가 조회되는지 같은 로직 취약점은 단순 WAF로 잡기 어렵다.

Agent가 이런 서비스를 빠르게 찾아 반복 검증할 수 있다면, 과거에는 경제성이 낮았던 작은 서비스까지 공격표면이 됩니다.

---

## 11. IP 차단만으로는 부족한 이유

금융보안원 관계자의 설명처럼 IP 차단은 응급조치로는 필요하지만 장기적으로 충분하지 않습니다.

Disposable infrastructure를 전제로 하면 방어의 관측 단위를 바꿔야 합니다.

### IP 중심 탐지

~~~text
IP A → 차단
IP B → 차단
IP C → 차단
...
~~~

공격자가 IP를 바꾸는 비용이 매우 낮다면 방어자가 계속 뒤쫓는 구조가 됩니다.

### 행위 중심 탐지

반면 다음과 같은 공통점을 묶으면 IP보다 수명이 길 수 있습니다.

- endpoint 접근 순서
- request method와 URI 조합
- parameter mutation pattern
- 비정상적인 object ID 순회
- 인증 성공 직후의 권한 밖 조회
- 일정한 retry/timeout cadence
- HTTP header 조합
- User-Agent
- JSON field ordering 또는 tool-generated request 특징
- 동일 취약점에 대한 반복적인 validation sequence
- 짧은 시간에 여러 관련 서비스로 이동하는 탐색 패턴

금융보안원 관계자가 말한 **“ARTEX에서 발신되는 특정한 데이터”**가 공개된다면 바로 이런 detection engineering에 매우 유용할 수 있습니다.

제가 가장 보고 싶은 공개자료도 IP 목록보다 이쪽입니다.

1. ARTEX 특유 HTTP/header/body fingerprint
2. task/session 원본 또는 일부 redacted transcript
3. tool command history
4. CLIProxyAPI 통신 흔적
5. 동일 공격자의 IP 교체 타임라인
6. 각 금융사에서 공통으로 관측된 request pattern

---

## 12. 이제 서버에서 훔쳐갈 자산에 LLM API Key가 추가됐다

이 변화는 ARTEX 사건과 직접 동일 캠페인이라는 의미는 아니지만, 공격자의 수익화 방향을 이해하는 데 중요합니다.

Microsoft Security Research는 2026년 8월 26일 [When AI infrastructure becomes the target: Securing gateways and control points](https://www.microsoft.com/en-us/security/blog/2026/08/26/when-ai-infrastructure-becomes-target-securing-gateways-control-points/)에서 LiteLLM, RAGFlow, Kestra 침해 사례를 공개했습니다.

세 제품의 initial access 방식은 달랐지만 공격자의 목표는 상당히 일관됐습니다.

### LiteLLM

공격자는 gateway runtime에서 다음과 같은 secret을 수집했습니다.

- model provider API key
- LiteLLM master/proxy key
- database connection string
- environment variable

### RAGFlow

공격자는 LLM 설정 로직을 변조해 이후 새로 등록되는 provider credential을 가로채도록 만들었습니다.

Microsoft가 명시한 대상에는 다음 provider가 포함됩니다.

- OpenAI
- Azure
- Anthropic
- Gemini

즉 “현재 저장돼 있는 key를 훔친다”를 넘어 **향후 사용자가 입력하는 key까지 지속적으로 탈취하는 persistence**가 구성됐습니다.

### Kestra

Kestra에서는 Docker socket과 container environment 등을 통해 secret을 수집하는 행위와 함께 **XMRig v6.26.0**을 이용한 Monero cryptomining도 관찰됐습니다.

이 점 때문에 표현은 정확해야 합니다.

**“공격자가 이제 코인마이너 대신 LLM API를 노린다”는 것은 과장입니다.**

더 정확한 변화는:

> **공격자가 돈으로 바꿀 수 있는 자산 목록에 LLM API credential과 AI gateway access가 추가됐다.**

CPU를 훔쳐 XMRig를 돌릴 수도 있고, LLM provider key를 훔쳐 모델 호출비용을 피해자에게 전가할 수도 있으며, gateway가 가진 다른 cloud/database secret까지 노릴 수도 있습니다.

Microsoft가 AI gateway를 사실상 **Tier-0 secret store**처럼 다루라고 권고한 이유도 여기에 있습니다.

---

## 13. 앞으로의 대응 예상 1: 해외 VPS/Hosting 접근은 더 보수적으로 볼 가능성이 높다

여기부터는 제 전망입니다.

금융권은 이미 여러 서비스에서 해외 IP를 제한하거나 위험도 기반으로 통제합니다. 그러나 모든 서비스에 동일한 정책을 적용할 수는 없습니다.

특히 제휴사·모집인·출장자·SaaS 연동 등이 있으면 외부 접근 자체를 막을 수 없습니다.

그래도 이번 사건 이후에는 질문이 달라질 가능성이 높습니다.

기존 질문:

> “이 IP가 AbuseIPDB에서 악성인가?”

앞으로의 질문:

> **“이 업무서비스에 해외 VPS/Hosting/공개 Proxy에서 정상 사용자가 접근할 이유가 있는가?”**

정상 사용 이유가 거의 없는 서비스라면 다음을 조합한 정책이 더 늘어날 수 있습니다.

- 국가 기반 접근제어
- Hosting/VPS ASN intelligence
- public proxy/VPN reputation
- known corporate egress allowlist
- 파트너사 고정 egress 등록
- mTLS 또는 device-bound authentication
- 비정상 ASN 접근 시 step-up authentication
- 신규/저평판 IP에 대한 추가 검증
- session과 사용자 행위 기반 탐지

여기서 **모든 cloud IP를 blanket block하는 방식은 현실적이지 않습니다.**

AWS, Azure, GCP 같은 대형 cloud는 정상 SaaS, 개발, 연동 트래픽도 많기 때문입니다.

따라서 “해외 차단”에서 한 단계 더 나아가 **서비스별 정상 접근모델**을 정의하는 쪽으로 가야 합니다.

---

## 14. 앞으로의 대응 예상 2: AI Pentest 수요는 크게 늘 가능성이 높다

공격자가 AI Agent로 외부 서비스를 빠르게 탐색한다면 방어자는 자연스럽게 같은 질문을 하게 됩니다.

> **“공격자가 보기 전에 우리가 AI로 먼저 전수 점검할 수 없을까?”**

이 변화는 이미 정책적으로도 시작됐습니다.

금융위원회는 2026년 9월 3일 [제2차 망분리 규제 긴급 완화 조치](https://www.fsc.go.kr/po010104/87646)를 발표하며 보안 목적 Frontier AI 활용 대상을 확대했습니다. 1차 테스트 중간점검에서는 Frontier AI가 수백만~수천만 라인의 소스코드를 수시간 내 분석하고, 기존 취약점을 넓은 범위에서 일관되게 탐색하는 데 강점을 보였다고 설명했습니다.

금융보안원 역시 9월 세미나에서 **AI 기반 소스코드 점검과 AI 기반 블랙박스 점검** 방법을 금융회사와 공유했습니다.

따라서 AI Pentest, agentic security testing, external attack-surface validation, 자동화된 authorization testing에 대한 구매와 자체 구축 수요가 증가하는 것은 자연스러운 흐름으로 보입니다.

하지만 공급 측에는 별도의 문제가 있습니다.

---

## 15. AI Pentest의 공급망 리스크: 모델 성능보다 “정상적인 접근권”이 중요할 수 있다

한국에서 Claude 자체를 쓸 수 없다는 의미는 아닙니다.

Anthropic의 [Supported Regions Policy](https://www.anthropic.com/supported-countries)에 South Korea는 Claude.ai와 commercial API 지원지역으로 포함돼 있습니다.

문제는 **일반 모델 접근**과 **고위험 pentest/exploit capability 접근**이 같지 않다는 점입니다.

Anthropic은 2026년 9월 [Claude Fable 5.1 and Claude Mythos 5.1](https://www.anthropic.com/claude-fable-and-mythos-5-1)을 공개하면서 두 모델이 같은 기반 모델이지만 safeguard 수준이 다르다고 설명했습니다.

일반 제공되는 Fable 5.1은 소스코드 취약점 발견을 허용하도록 cyber safeguard의 false positive를 줄였지만, Anthropic 설명상 다음과 같은 dual-use 작업에는 여전히 제한이 있습니다.

- penetration testing
- exploit generation
- binary-based vulnerability scanning

반면 [Claude Mythos 5.1](https://www.anthropic.com/claude/mythos)은 cybersecurity와 life sciences를 위해 더 permissive한 safeguard를 제공하지만 trusted-access 프로그램을 통한 vetted organization에만 제한적으로 제공됩니다. 2026년 10월 4일 기준 Anthropic은 Mythos 접근이 아직 소수의 검증된 조직에 제한돼 있고, 현재 일부 미국 조직에만 제공할 수 있다고 설명하고 있습니다.

이 구조는 AI Pentest 사업에 중요한 질문을 만듭니다.

서비스 소개서에 “Claude 기반 AI Pentest”라고 쓰여 있는 것만으로는 충분하지 않을 수 있습니다.

확인해야 할 것은:

1. 어떤 모델/등급을 쓰는가?
2. 실제 pentest/exploit 검증 capability가 공식적으로 허용되는 접근인가?
3. 자체 tool execution이 핵심인가, 모델 자체의 cyber capability가 핵심인가?
4. 모델 provider의 safeguard 변경 후에도 동일한 서비스를 제공할 수 있는가?
5. jailbreak 또는 safeguard 우회에 핵심 기능이 의존하고 있지는 않은가?
6. API relay/proxy를 사용한다면 data handling과 credential boundary는 어떻게 되는가?
7. 모델이 차단되거나 정책이 바뀌었을 때 대체 공급망이 있는가?

일부 업체가 safeguard 우회에 의존해 고위험 공격기능을 구현한다면, 그것은 단순 기술 트릭이 아니라 **사업 연속성 리스크**입니다.

오늘 동작하던 기능이 내일 provider safeguard 업데이트로 막힐 수 있습니다.

그래서 AI Pentest 시장에서는 모델 benchmark만큼이나 **authorized model access, policy stability, toolchain independence**가 중요한 평가항목이 될 수 있습니다.

---

## 16. 앞으로의 대응 예상 3: 비대고객 업무·제휴 채널이 전수 재평가될 가능성이 높다

이번 사건이 남길 가장 직접적인 변화는 이쪽일 수 있습니다.

금융권이 앞으로 다시 보게 될 대상은 인터넷뱅킹과 모바일뱅킹만이 아닙니다.

오히려 지금까지 상대적으로 관리가 분산돼 있던 다음 영역이 우선순위로 올라올 가능성이 큽니다.

- 직원용 web/mobile 업무지원 서비스
- 모집인/설계사 portal
- 제휴사/대리점 portal
- partner API
- 외주사 접근용 사이트
- 오래된 별도 domain
- 인터넷에 노출된 admin/support endpoint
- 소수 사용자만 쓰는 조회 서비스
- 별도 vendor가 개발·운영하는 satellite service

평가 기준도 **“대고객 서비스인가?”**에서 다음 질문으로 이동할 가능성이 높습니다.

- 인터넷에 노출돼 있는가?
- 개인정보를 조회할 수 있는가?
- object-level authorization이 서버 측에서 강제되는가?
- 사용자 역할과 조회대상이 binding돼 있는가?
- 로그인 후 파라미터만 바꾸면 다른 사용자의 object에 접근할 수 있는가?
- API가 client-supplied identity를 신뢰하는가?
- 외부 접근이 정말 필요한가?
- 정상 사용자의 ASN/country/device profile을 정의할 수 있는가?
- 과거에 만들어지고 owner가 불분명해진 서비스는 없는가?

이것은 단순 취약점 점검보다 **Attack Surface Management + Authorization Review + Identity Architecture** 문제에 가깝습니다.

---

## 17. 제가 금융사라면 먼저 바꿀 것

이번 사건을 기준으로 방어조치를 우선순위화하면 다음과 같습니다.

| 우선순위 | 조치 | 이유 |
|---|---|---|
| P0 | 외부 노출 업무·제휴 서비스 전수 inventory | 모르는 서비스는 보호할 수 없음 |
| P0 | 개인정보/권한 API의 server-side authorization 재검증 | parameter tampering과 object-level access control 문제에 직접 대응 |
| P0 | 공격 IoC + hosting/VPS/proxy intelligence 임시 통제 | 진행 중 공격에 대한 즉시 containment |
| P0 | 관련 HTTP request/body/header 원본 보존 | IP가 교체돼도 agent/tool fingerprint를 찾기 위한 증거 |
| P1 | 서비스별 정상 국가/ASN/device 모델 정의 | blanket block 대신 정상행위 기반 통제 |
| P1 | 모집인·직원·파트너 계정에 MFA/step-up/device binding 강화 | 비대고객 계정의 탈취·재사용 위험 축소 |
| P1 | object enumeration/rate anomaly 탐지 | 정상 로그인 이후 데이터 수집형 공격 탐지 |
| P1 | AI 기반 black-box authorization test | 공격자보다 먼저 반복 가능한 취약점 탐색 |
| P2 | VPS/provider abuse escalation playbook | 해외 사업자 로그 보존 요청을 사고 초기에 시작 |
| P2 | LLM/API secret inventory와 rotation | AI 인프라 침해 시 provider credential 탈취 대비 |
| P2 | pentest AI 공급망 검토 | 모델 access/safeguard 변경에 따른 서비스 중단 위험 관리 |

특히 **로그 보존**은 중요합니다.

IP가 계속 바뀌는 공격에서는 source IP만 남겨두면 나중에 할 수 있는 일이 적습니다.

가능하다면 다음을 함께 보존해야 합니다.

- reverse proxy/WAF raw log
- application access log
- request body의 안전한 forensic copy
- HTTP header
- authentication event
- authorization decision
- object ID/accessed resource
- response status/size
- device/session identifier
- upstream proxy/load balancer metadata

그래야 “IP는 다르지만 같은 Agent/tool이 반복한 요청”을 뒤늦게라도 묶을 수 있습니다.

---

## 18. Blocklist보다 중요한 것: Agent fingerprint

이번 사건에서 방어자가 가장 얻고 싶은 데이터는 새로운 IP 100개가 아닐 수 있습니다.

IP는 계속 바뀔 수 있습니다.

더 오래가는 것은 **자동화가 만들어내는 습관**입니다.

예를 들어 다음과 같은 특징입니다.

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

Agent도 결국 소프트웨어입니다.

Prompt가 달라도 tool wrapper, request builder, retry policy, concurrency model, JSON serializer, default headers, exception handling, timing은 흔적을 남길 수 있습니다.

그래서 앞으로 CTI에서 중요한 것은 **“이 IP가 악성인가?”**에 더해 다음이 될 수 있습니다.

> **“이 요청 묶음이 같은 자동화 도구에서 나왔는가?”**

---

## 19. 이번 IoC에서 읽을 수 있는 것과 읽으면 안 되는 것

### 읽을 수 있는 것

- 여러 종류의 cloud/VPS/hosting egress가 섞여 있다.
- 일부는 anonymous-vps provider inventory와 직접 교차한다.
- 일부는 실제 public proxy로 확인된다.
- 한국 위치의 해외 VPS도 포함돼 있다.
- IP reputation만으로는 초기 차단이 어려운 인프라가 존재할 수 있다.
- 금융보안원 관계자 설명과 같이 IP 교체형 공격에 적합한 구조다.

### 읽으면 안 되는 것

- anonymous-vps에 들어있으니 그 provider가 악성이다.
- Shodan에 ARTEX가 있으니 해당 서버가 금융권 공격자다.
- ARTEX 서버가 미국에 있으니 공격자는 미국인이다.
- repo에 안 걸리니 proxy/VPS가 아니다.
- AbuseIPDB가 깨끗하니 안전하다.
- 129.212.181.253이 public proxy이므로 공격자가 그 proxy를 소유한다.
- 359개 ARTEX 노출 서버가 모두 같은 캠페인이다.
- ARTEX가 사람의 개입 없이 전체 침해를 자율 수행했다.

CTI에서 **관측(observation), 관계(relationship), 판단(assessment), attribution**은 서로 다른 단계입니다.

그 경계를 섞지 않는 것이 중요합니다.

---

## 20. 결론: AI가 바꾼 것은 exploit보다 공격의 경제성일 수 있다

이번 사건을 “AI 해커가 금융권을 공격했다” 정도로만 보면 앞으로의 변화를 놓칠 수 있습니다.

제가 더 중요하게 보는 변화는 다음입니다.

~~~text
AI Agent
  ↓
탐색·분석·반복검증 비용 감소
  ↓
더 많은 외부 서비스가 경제적인 공격 대상이 됨
  ↓
Disposable VPS / Proxy
  ↓
egress 교체 비용 감소
  ↓
IP reputation 기반 방어의 수명 단축
  ↓
비대고객 업무·제휴 채널까지 공격표면 확대
~~~

동시에 서버 안에는 과거에 없던 고가치 자산도 생겼습니다.

**LLM API key, AI gateway credential, model access.**

그래서 방어도 자연스럽게 다음 방향으로 갈 가능성이 높습니다.

**행위 패턴 + Agent fingerprint + VPS/Proxy intelligence + 서버 측 authorization + 비대고객 Attack Surface + AI 기반 선제 점검**

IP는 버리고 바꾸면 됩니다.

하지만 **공격자가 반복하는 행위, 자동화 도구의 구현 습관, 그리고 서버 측의 잘못된 권한검증 구조까지 매번 바꾸기는 훨씬 어렵습니다.**

AI 시대의 방어는 아마 그쪽을 봐야 할 것 같습니다.

---

## Appendix A. ARTEX 인터넷 노출과 anonymous-vps 교차 요약

| 데이터셋 | anonymous-vps 직접 교차 |
|---|---|
| Shodan ARTEX Network/Org snapshot | CTG Server / Cloudie / Vultr |
| Censys ARTEX Organization snapshot | HostEONS / ServerPoint / Vultr |
| 금융권 사건 IoC | ARISK / InterServer / Vultr |
| 관계만 candidate | AS215748 Westeros ↔ ARISK/Light Cloud |

이 교차는 **provider/infrastructure context**일 뿐, 해당 provider 또는 대역 전체에 대한 malicious verdict가 아닙니다.

---

## Appendix B. 조사 시점에 아직 공개되지 않은 핵심 데이터

현재 공개자료에서 가장 아쉬운 부분은 다음입니다.

- 전체 공격 IoC와 IP별 역할
- ARTEX task/session 원본
- 실제 prompt/response
- tool command history
- ARTEX version/build identifier
- CLIProxyAPI endpoint와 configuration
- 사용 LLM/provider
- ARTEX가 생성한 것으로 판단한 HTTP fingerprint의 구체값
- 동일 공격자가 IP를 교체한 전체 timeline
- 서비스별 공격 HTTP request/response
- 개별 금융사에서 ARTEX가 관여한 정확한 공격 단계

이 중 특히 **공통 HTTP/JSON fingerprint**가 공개되면 금융권 탐지 룰을 만드는 데 IP 목록보다 더 오래가는 정보가 될 수 있습니다.

---

## References

### 금융권 사건 및 정책

1. 금융보안원, [금융권 AI Agent 공격 현실화, 선제적 대응 강화 필요](https://www.fsec.or.kr/bbs/detail?bbsNo=12062&menuNo=69), 2026-09-21.
2. 금융위원회, [보다 다양한 금융회사들이 AI 보안위협에 철저히 대비할 수 있도록 제2차 망분리 규제 긴급 완화 조치를 추진합니다](https://www.fsc.go.kr/po010104/87646), 2026-09-03.
3. 데일리시큐, [ARTEX로 금융권 광범위 공격…AI가 파고든 API 권한검증 허점](https://www.dailysecu.com/news/articleView.html?idxno=208718), 2026-10-02.
4. 헤럴드경제, [은행 연쇄 해킹 도구는 중국 ‘아르텍스 AI’…해커가 사용했다](https://v.daum.net/v/20261003123315260), 2026-10-03.
5. 데일리시큐, [ARTEX 관련 고유 IP 359개 분석](https://www.dailysecu.com/news/articleView.html?idxno=208724), 2026-10-04.
6. 연합뉴스, [AI로 상호금융까지 광범위 공격…“해킹 시도 훨씬 많을 수도”](https://www.yna.co.kr/view/AKR20261003042451002), 2026-10-04.

### AI 인프라와 credential theft

7. Microsoft Security Research, [When AI infrastructure becomes the target: Securing gateways and control points](https://www.microsoft.com/en-us/security/blog/2026/08/26/when-ai-infrastructure-becomes-target-securing-gateways-control-points/), 2026-08-26.

### AI Pentest 모델 접근과 safeguards

8. Anthropic, [Introducing Claude Fable 5.1 and Claude Mythos 5.1](https://www.anthropic.com/claude-fable-and-mythos-5-1), 2026-09.
9. Anthropic, [Claude Mythos](https://www.anthropic.com/claude/mythos), accessed 2026-10-04.
10. Anthropic, [Supported countries and regions](https://www.anthropic.com/supported-countries), accessed 2026-10-04.

### Infrastructure / proxy / provider context

11. windshock, [anonymous-vps](https://github.com/windshock/anonymous-vps).
12. anonymous-vps, [generated provider ranges](https://github.com/windshock/anonymous-vps/blob/main/generated/detection/provider-ranges.csv).
13. anonymous-vps, [KR-localized CIDRs](https://github.com/windshock/anonymous-vps/blob/main/generated/context/kr-localized-cidrs.csv).
14. anonymous-vps, [ASN relationship data](https://github.com/windshock/anonymous-vps/blob/main/data/asns.yml).
15. Intrude, [Live Proxy Intelligence](https://www.intrude.io/).
16. Proxifly, [free-proxy-list](https://github.com/proxifly/free-proxy-list).
17. IPinfo, [103.248.148.0/24 — AS395793 Arisk Communications](https://ipinfo.io/ips/103.248.148.0/24).
18. IPinfo, [64.20.39.0/24 — AS19318 InterServer](https://ipinfo.io/ips/64.20.39.0/24).
19. IPinfo, [209.209.85.0/24 — AS215748 Westeros Communications](https://ipinfo.io/ips/209.209.85.0/24).
20. IPinfo, [124.155.252.0/24 — AS9304 HGC Global Communications](https://ipinfo.io/ips/124.155.252.0/24).
21. IPinfo, [212.135.39.0/24 — AS61112 AkileCloud Network](https://ipinfo.io/ips/212.135.39.0/24).
22. Shodan, [Search](https://www.shodan.io/).
23. Censys, [Search](https://search.censys.io/).

---

### Snapshot / reproducibility note

- 작성 기준시각: **2026-10-04 KST**
- Shodan/Censys의 검색결과와 facet count는 지속적으로 변할 수 있습니다.
- anonymous-vps의 provider range 역시 repository update에 따라 변합니다.
- 이 글의 ✅ 표시는 **해당 시점 repository inventory와의 교차**를 의미하며 악성 판정을 의미하지 않습니다.
- 이 글은 공개정보와 point-in-time OSINT를 분석한 것이며 공격자 attribution을 목적으로 하지 않습니다.
