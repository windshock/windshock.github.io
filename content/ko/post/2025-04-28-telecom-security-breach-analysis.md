---
title: "통신 보안 심층 분석 리포트: SKT 해킹 사건과 글로벌 사례 분석"
date: 2025-04-28
draft: false
tags: ["통신 보안", "SKT 해킹", "SIM 보안", "5G 보안", "APT 공격", "SS7 취약점"]
categories: ["Security Research", "Telecom Security"]
summary: "2025년 SKT 해킹 사건을 중심으로, 통신 인프라의 핵심 보안 구조와 과거 글로벌 해킹 사례(Gemalto, APT10, Circles)를 심층 분석한 보고서입니다. 가입자 인증 시스템(Ki, SUPI/SUCI)과 5G SA/NSA 차이점까지 다루었습니다."
---

# 통신 보안 심층 분석 리포트

---

# 1. 통신 인프라의 심장: Ki와 가입자 인증 구조

## Ki란 무엇인가

- **Ki(Key)**는 이동통신 가입자를 식별하고 인증하는 절대 비밀키이다.
- USIM 카드 내부와 통신사 코어 인증 서버(HLR/HSS/5GC)에 저장되며, 외부로 절대 노출되지 않는다.
- Ki 기반으로 난수(RAND) 및 응답(SRES)을 교환하여 통신 인증이 이루어진다.

**만약 Ki가 유출되면?**  
→ 공격자가 "가짜 USIM"을 제작해 통신사 인증을 통과할 수 있다.  
→ 통화 가로채기, 위치 추적, 데이터 탈취 등 심각한 피해로 이어진다.

## 가입자 인증 흐름

- **2G (GSM)**: RAND → SRES 생성 및 전송 → 통신사 검증
- **3G (UMTS) / 4G (LTE)**: AKA 프로토콜 사용, RES 응답 비교
- **5G (SA 구조)**: SUPI 보호 → SUCI(암호화된 ID)만 네트워크에 전송

**참조:** [3GPP TS 33.102](https://portal.3gpp.org/desktopmodules/Specifications/SpecificationDetails.aspx?specificationId=227)

---

# 2. 5G NSA vs 5G SA: 구조적 차이와 보안성 비교

## NSA 구조 (Non-Standalone)

- LTE Core(EPC)에 5G 무선망(NR)만 추가.
- 가입자 인증 및 세션 관리는 LTE 방식 그대로 유지.
- IMSI 평문 노출 위험 여전히 존재.

## SA 구조 (Standalone)

- 5G Core(5GC) 독립 구축.
- 공개키 기반 보호 강화 → SUPI를 암호화(SUCI)하여 전송.

**SUCI(SUPI Concealment)**:
- 가입자는 SUPI를 통신사 공개키로 암호화한 SUCI로 전송.
- 통신사는 SUCI를 복호화하여 인증 절차 수행.

**참조:** [3GPP TS 33.501](https://portal.3gpp.org/desktopmodules/Specifications/SpecificationDetails.aspx?specificationId=3169)

---

# 3. SKT 2025 해킹 사건: 기술 분석

## 사건 개요

- 2025년 4월 19일, SK텔레콤 코어망 서버에서 해킹 정황 발견.
- 약 2,300만 명의 USIM 정보 유출 가능성.

## 기술적 문제점

- NSA 기반 평문 이동 위험.
- Ki 유출 시 USIM 복제 및 SIM 스와핑 공격 가능.

## 예상 공격 시나리오

- 코어 서버 침투 → 가입자 DB 접근 → 복제 USIM 제작 → 개인정보 탈취.

**참조:**  
- [연합뉴스 보도](https://www.yna.co.kr/view/AKR20250422072300017)  
- [SKT 공식 발표](https://news.sktelecom.com/211423)

---

# 4. 과거 주요 사례 심층 분석

## Gemalto 해킹 사건

- 2010~2011년, NSA & GCHQ가 SIM 제조사 Gemalto 해킹 시도.
- 전 세계 SIM 암호화 키(Ki) 탈취 시도.

**참조:**  
- [The Intercept - Great SIM Heist](https://theintercept.com/2015/02/19/great-sim-heist/)  
- [WIRED - Gemalto Hacked](https://www.wired.com/2015/02/gemalto-confirms-hacked-insists-nsa-didnt-get-crypto-keys/)

## APT10 Operation Soft Cell

- 중국계 해커 그룹 APT10, 글로벌 통신사 코어망 침투.
- VIP 가입자 통화 기록, 위치 정보 대량 탈취.

**참조:**  
- [Cybereason Operation Soft Cell 보고서](https://www.cybereason.com/blog/research/operation-soft-cell-a-worldwide-campaign-against-telecommunications-providers)

## Circles SS7 감청

- NSO Group 계열사 Circles, SS7 취약점을 활용한 감청 시스템 판매.
- 25개국 정부기관이 구매하여 통신 감청 활용.

**참조:**  
- [Citizen Lab - Running in Circles](https://citizenlab.ca/2020/12/running-in-circles-uncovering-the-clients-of-cyberespionage-firm-circles/)

---

# 5. 이동통신 보안 구조의 역사적 한계와 PKI 및 HSM 부재 비판

## 왜 초기 이동통신은 PKI를 적용하지 않았나?

2G/3G 시대에는 단말기의 CPU 성능, 배터리 용량, 그리고 통신 속도 모두 큰 제약이 있었다.

- RSA, ECC 같은 공개키 기반 암호 연산은 당시 기술 수준으로는 현실적으로 적용이 불가능했다.
- 공개키 연산을 위한 충분한 계산 자원도, 전력을 감당할 배터리 용량도 부족했다.

**현실적 선택:**  
→ 대칭키(Ki) 기반의 간단하고 빠른 인증 구조를 채택할 수밖에 없었다.

---

## 그러나 문제점

- 가입자 식별자(IMSI)가 **평문**으로 무선망을 통해 전송되면서,  
  **IMSI Catcher(가짜 기지국)** 공격이 가능해졌다.
- USIM에 저장된 Ki가 탈취될 경우,  
  **USIM 복제**를 통한 통신 사칭 공격이 이론적으로 가능해졌다.
- SIM 제조사, 통신사 등 **공급망**(Supply Chain)에서 발생할 수 있는  
  **키 유출 리스크**가 과소평가되었다.

특히,  
당시에는 장기 키(Ki)를 보호하기 위한 **HSM(Hardware Security Module)** 같은  
**강력한 하드웨어 기반 키 보호 기술의 적용도 이루어지지 않았다.**

- 서버 측 코어 장비(HLR/HSS 등)에서도  
  **명확한 물리적 키 분리**나 **보안 하드웨어 내부 연산** 개념이 부족했다.
- 이로 인해 코어 서버가 침해당할 경우,  
  가입자 인증 키(Ki)가 대규모로 유출될 수 있는 구조적 한계가 존재했다.

결국, 초기 이동통신 시스템은  
**"빠른 상용화"와 "저비용 구현"** 을 우선순위에 두면서  
**보안 아키텍처의 심층 강화는 뒷전으로 밀린 결과**를 낳았다.

---

## 지금은 왜 PKI와 HSM이 필수인가?

오늘날,  
- 현대 단말은 공개키 암호화 연산(RSA, ECC)을 실시간으로 처리할 수 있고,
- 통신 지연도 극복할 수 있을 만큼 네트워크 성능이 발전했다.

**따라서 통신 보안 강화를 위해 필수적으로 적용해야 할 것은:**

- **SUPI 암호화 (SUCI)**: 가입자 영구 식별자의 무선망 평문 전송 차단.
- **TLS 보안 채널**: Core 네트워크 내부와 외부 간 신뢰성을 확보.
- **네트워크 슬라이싱별 보안정책**: 각 서비스별 분리된 보안 도메인 운영.

그리고 서버 측에서는,  
단순한 소프트웨어 기반 키 보호만으로는 부족하며,  
**HSM** 또는 이에 준하는 **Secure Environment**를 통해

- 장기 키 및 세션 키의 외부 노출 방지
- 부트 무결성 보호
- 물리적 공격 탐지 및 대응

을 수행해야 한다.

**즉,**  
초기의 이동통신이 보안보다 상용화를 우선시했다면,  
**현재는 신뢰성(trust)이 통신 인프라의 절대적 전제조건이 된 것이다.**

---

# 6. 개인 사용자 관점 대응 방법

- **OpenVPN으로 집 공유기 경유 설정 및 주요 사용 서비스에 IP 제한 설정**  
  [OpenVPN 설치 가이드](https://openvpn.net/community-resources/how-to/)
- **OTP 앱 사용**  
  [Google Authenticator 소개](https://support.google.com/accounts/answer/1066447)
- **하드웨어 보안 키 사용**  
  [YubiKey 공식 사이트](https://www.yubico.com/products/)
- **통신사 및 정부에 5G SA 로 인프라 업그레이드 요구**  
  [Qualcomm - SA vs NSA](https://academy.qualcomm.com/blogs/NSA-vs-SA-in-5G)

---

# 7. 결론

완벽한 통신망은 없다.  
그러나 매일 조금씩, 스스로를 지키는 노력이  
거대한 침묵 속의 유일한 방패가 될 것이다.

---

# 추가 심층 비교 분석

- **SKT 해킹 사건**: 약 2,300만 명 영향. Ki 유출 의심. 현재까지 악용 사례 미발생.
- **Gemalto 해킹**: 글로벌 SIM 공급망 공격. 대량 키 유출 여부 논란.
- **APT10 Operation Soft Cell**: 중국발 APT 그룹의 장기 통신사 침투.
- **Circles 감청 장비**: SS7 취약점 악용, 통신망 수준의 은밀한 감청.

---

# 주요 인용 및 참고자료

- [SKT 공식 뉴스룸](https://news.sktelecom.com/211423)
- [The Intercept - Great SIM Heist](https://theintercept.com/2015/02/19/great-sim-heist/)
- [WIRED - Gemalto Hacked](https://www.wired.com/2015/02/gemalto-confirms-hacked-insists-nsa-didnt-get-crypto-keys/)
- [Cybereason Operation Soft Cell](https://www.cybereason.com/blog/research/operation-soft-cell-a-worldwide-campaign-against-telecommunications-providers)
- [Citizen Lab - Running in Circles](https://citizenlab.ca/2020/12/running-in-circles-uncovering-the-clients-of-cyberespionage-firm-circles/)

---
