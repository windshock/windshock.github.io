---
title: "암호 알고리즘만 확인해서는 외부 SDK의 보안성을 평가할 수 없다"
date: 2026-08-24
draft: false
featured: true
tags: ["Mind", "AI 보안", "SDK 보안", "암호학", "공급망보안", "결제 보안"]
categories: ["보안 연구", "암호학"]
description: "AES-256이나 TLS 같은 알고리즘 이름은 키가 어떻게 생성되는지, 접속 대상을 누가 정하는지, 응답이 실제 거래와 묶이는지를 말해주지 않는다. 외부 SDK와 네이티브 바이너리를 위한 증거 기반 평가 모델."
image: "/images/post/external-sdk-security-assessment/cover.webp"
cover:
  image: "/images/post/external-sdk-security-assessment/cover.webp"
  alt: "암호 알고리즘 확인만으로는 외부 SDK 보안성을 평가할 수 없다"
---

외부 결제 SDK나 네이티브 바이너리를 검토하다 보면 매뉴얼에서 가장 먼저 보게 되는 내용은 대개 비슷합니다.

> “대칭키 128bit를 사용합니다.”  
> “AES-256을 사용합니다.”  
> “RSA 기반으로 키를 보호합니다.”  
> “TLS로 통신합니다.”

처음에는 저도 이런 항목을 중심으로 확인했습니다.

사용 중인 암호 알고리즘과 키 길이를 확인하고, KISA 암호 가이드에 대입해 적절한지를 판단하는 방식입니다.

그런데 실제 외부 결제 SDK와 바이너리를 분석하면서 생각이 조금 바뀌었습니다.

**취약점은 알고리즘 이름보다 그 아래에 있는 구현과 신뢰 경계에서 더 자주 발견됐습니다.**

128bit 세션키를 사용하지만 키가 충분한 entropy에서 생성되지 않을 수도 있습니다.

암호화는 되어 있지만 메시지를 인증하는 MAC이 없을 수도 있습니다.

TLS를 사용하지만 접속할 서버가 외부 입력에 의해 변경될 수도 있습니다.

정상적인 서버만 상대할 것이라고 가정해서 서버가 보내는 길이 값을 그대로 믿다가 native client의 메모리 안전성 문제가 발생할 수도 있습니다.

그리고 모든 암호 검증이 정상이어도 결제 성공 응답의 **주문번호·금액·수취인·거래 상태**가 실제 업무 원장과 제대로 묶여 있지 않다면 잘못된 거래를 성공으로 처리할 수도 있습니다.

이 경험이 외부 SDK·바이너리를 위한 별도의 보안 평가 흐름이 필요하다고 생각하게 된 계기였습니다.

제가 이 과정을 정리해 만든 것이 다음 프로젝트입니다.

**Crypto Protocol Supply-chain Assessment**  
https://github.com/windshock/crypto-protocol-supply-chain-assessment

---

## 기존 KISA 가이드가 잘못됐다는 이야기는 아니다

여기서 한 가지는 분명히 하고 싶습니다.

**기존 KISA 암호 가이드나 개발보안 가이드가 잘못됐다는 이야기는 아닙니다.**

KISA의 암호 관련 자료는 알고리즘, 키 길이, 키 관리, 난수 생성과 같은 중요한 기준을 제공하고 있고, 개발보안·보안약점 진단 가이드 역시 입력값 검증, 정수형 오류, 메모리 접근, 명령어 삽입, 신뢰되지 않은 URL 접속, 인증서 검증, 오류 처리 등 폭넓은 보안 문제를 이미 다루고 있습니다.

- [KISA 암호 안내서 자료실](https://www.kisa.or.kr/2060305)
- [KISA 안전한 소프트웨어 개발 자료실](https://www.kisa.or.kr/2060204)

다만 제가 참고했던 암호·개발보안 문서의 주요 버전은 2012~2021년에 만들어진 것들이고, 그 이후 소프트웨어를 공급하고 운영하는 방식은 크게 변했습니다.

특히 지금 기업이 실제로 도입하는 것은 단순한 소스 코드만이 아닙니다.

다음과 같은 **외부 공급 아티팩트 전체**가 평가 대상이 됩니다.

- 외부 업체가 제공하는 실행 파일, DLL, SO, JAR, SDK, Agent, Daemon
- 결제·인증·정산·계좌 검증·암호 통신 프로토콜
- 연동 매뉴얼, 소스 코드, 바이너리, 패킷 캡처, 설정, SBOM, 저장소, 릴리스 증적
- 키 관리, 요청·응답 무결성, TLS, 응답 원장 대조, 멀티테넌트 인가

실제로 KISA 역시 이 변화에 맞춰 2024년 **[SW 공급망 보안 가이드라인 1.0](https://www.kisa.or.kr/2060204/form?lang_type=KO&postSeq=15)**을 별도로 발표했습니다.

즉 기존 암호·개발보안 가이드를 폐기해야 한다는 뜻이 아니라,

**기존 기준을 외부 SDK·네이티브 바이너리·공급망이라는 새로운 평가 단위에 맞게 연결하고 확장할 필요가 있다는 의미입니다.**

---

## “AES-256을 쓰는가?” 다음에 물어야 할 것

외부 SDK나 바이너리를 평가할 때 매뉴얼에 적힌 정보와 실제 확인해야 할 정보 사이에는 꽤 큰 차이가 있습니다.

[![매뉴얼이 말하는 것과 실제로 검증해야 하는 것](/images/post/external-sdk-security-assessment/algorithm-names.webp)](/images/post/external-sdk-security-assessment/algorithm-names.webp)

*그림 1. 알고리즘 이름은 필요하지만 충분하지 않다 — 키 생성, IV·nonce 처리, MAC/AEAD 범위, endpoint 통제, 원장 대조까지 실제로 확인해야 한다.*

| 매뉴얼에서 확인되는 것 | 실제로 추가 확인해야 하는 것 | 실패할 경우 |
|---|---|---|
| 대칭키 128/256bit | 세션키가 무엇으로 생성되고 실제 entropy가 충분한가 | 키 후보 공간 축소, 전문 복호 가능성 |
| Hash 검증 | 비밀키 기반 MAC인가, 인증 범위는 어디까지인가 | 전문 변조 및 응답 위조 |
| AES-CBC 사용 | IV가 예측·재사용되는가, MAC/AEAD가 존재하는가 | 기밀성·무결성 붕괴 |
| TLS 사용 | 인증서를 제대로 검증하는가, endpoint를 누가 결정하는가 | MITM 또는 공격자 서버 연결 |
| 성공 응답 코드 | 주문·금액·수취인·거래번호가 실제 원장과 일치하는가 | 위조된 성공 처리 |
| Native SDK | malformed response와 비정상 길이를 안전하게 처리하는가 | Crash, DoS, memory corruption |
| 제품 버전 | 실제 바이너리에 어떤 라이브러리가 포함되어 있는가 | 오래된 취약 라이브러리 잔존 |
| 공식 배포 파일 | 어떤 source와 build 과정에서 만들어진 artifact인가 | 공급망 변조 탐지 실패 |

결국 **암호 primitive를 선택하는 문제와 안전한 시스템을 만드는 문제는 서로 다릅니다.**

AES-256이라는 이름은 키가 어떻게 생성됐는지 알려주지 않습니다.

TLS라는 이름은 통신 상대가 올바르게 검증됐는지 알려주지 않습니다.

전자서명이 있다는 사실은 애플리케이션이 실제로 사용하는 데이터와 서명 검증 대상이 동일한지 보장하지 않습니다.

그리고 암호학적으로 정상적인 결제 성공 응답조차 그 응답이 **지금 처리하려는 주문과 동일한 거래인지**까지 자동으로 보장하지는 않습니다.

이런 문제는 이미 여러 연구에서 반복적으로 확인됐습니다.

[![외부 SDK와 바이너리의 흔한 실패 패턴](/images/post/external-sdk-security-assessment/failure-patterns.webp)](/images/post/external-sdk-security-assessment/failure-patterns.webp)

*그림 2. 매뉴얼이 잘 드러내지 않는 전형적 취약 패턴 — 약한 키 생성과 hash-as-MAC부터 응답 미인증, 외부 입력이 정하는 endpoint, 원장 대조 부재까지.*

---

## 1. 결제 성공 메시지보다 중요한 것은 거래의 binding이다

이 문제를 가장 일찍 명확하게 보여준 연구 중 하나가 IEEE S&P 2011의 **How to Shop for Free Online: Security Analysis of Cashier-as-a-Service Based Web Stores**입니다.

연구진은 PayPal, Amazon Payments, Google Checkout 같은 third-party payment service를 사용하는 실제 전자상거래 시스템을 분석했습니다.

핵심은 단순했습니다.

**“결제 성공”이라는 메시지를 받았다고 주문을 성공 처리하면 안 된다.**

Merchant가 주문을 `PAID` 상태로 변경하려면 최소한 다음 관계가 일치해야 합니다.

- 누가 결제했는가
- 어떤 주문에 대한 결제인가
- 누구에게 돈이 지급됐는가
- 얼마를 결제했는가
- 해당 결제가 이미 다른 주문에서 사용되지 않았는가

즉 개별 필드의 integrity보다 **서로 다른 메시지와 시스템 상태 사이의 binding**이 더 중요합니다.

연구에서는 실제로 이러한 binding이 깨져 임의 금액 결제나 무료 구매가 가능한 사례를 발견했습니다.

**논문:**  
[How to Shop for Free Online — IEEE S&P 2011](https://www.microsoft.com/en-us/research/publication/how-to-shop-for-free-online-security-analysis-of-cashier-as-a-service-based-web-stores/)

이 관점은 제가 만든 assessment에서 **성공 응답을 그대로 신뢰하지 않고 order·amount·payee·transaction status를 authoritative ledger와 다시 대조하도록 한 이유**와 직접 연결됩니다.

---

## 2. 프로토콜이 안전해 보여도 SDK 구현에서 무너질 수 있다

2021년 ACNS에 발표된 **Breaking and Fixing Third-Party Payment Service for Mobile Apps**는 한 단계 더 내려갑니다.

연구진은 5개 대형 third-party payment service의 실제 payment protocol과 SDK를 정적·동적으로 분석했습니다.

특히 흥미로운 부분은 **암호화 알고리즘이 아니라 메시지를 어떻게 조립하고 검증하는지**를 분석했다는 점입니다.

예를 들어 여러 payment system은 다음과 같은 형태로 값을 이어 붙인 후 signature나 HMAC을 계산합니다.

```text
key1=value1&key2=value2&key3=value3
```

그런데 key와 value의 경계를 명확하게 정의하지 않으면 동일한 문자열이 서로 다른 parameter 구조로 해석될 수 있습니다.

즉,

**서명 자체는 정상인데 애플리케이션이 해석하는 데이터는 다른 상황**

이 발생할 수 있습니다.

논문에서는 이런 parser ambiguity뿐 아니라 payment notification forgery, authentication 방식 선택 문제, backend SDK 구현 결함 등을 결합해 실제 “shop for free” 공격을 확인했습니다.

**논문:**  
[Breaking and Fixing Third-Party Payment Service for Mobile Apps — ACNS 2021](https://doi.org/10.1007/978-3-030-78375-4_1)

이 연구는 제가 실제 SDK 분석을 하면서 느꼈던 다음 문제와 상당히 비슷합니다.

> **“암호화했는가?”보다 “무엇을 어떤 표현으로 인증했고, 그 값을 누가 어떻게 파싱하는가?”가 더 중요할 수 있다.**

---

## 3. 보안 표준은 SDK에서 실행 가능한 점검 항목으로 바뀌어야 한다

ACSAC 2022의 **Analysis of Payment Service Provider SDKs in Android**는 방법론적으로 특히 흥미롭습니다.

연구진은 OWASP MASVS라는 기존 보안표준을 그대로 읽고 끝내지 않았습니다.

MASVS의 자연어 요구사항을 **payment SDK에 적용 가능한 28개의 실제 분석 check**로 변환했습니다.

그리고 50개의 payment SDK를 분석했습니다.

검사 항목에는 다음과 같은 것들이 포함됩니다.

- hard-coded 또는 predictable cryptographic key
- insufficient key length
- insecure cipher mode
- static 또는 predictable IV
- deprecated cryptographic algorithm
- 부적절한 RNG
- TLS certificate validation
- insecure WebView 사용

**논문:**  
[Analysis of Payment Service Provider SDKs in Android — ACSAC 2022](https://www.acsac.org/2022/program/final/s169.html)

이 연구가 중요한 이유는 하나입니다.

**좋은 가이드라인이 존재하는 것과 실제 SDK에서 그 가이드라인을 검증할 수 있는 것은 별개의 문제이기 때문입니다.**

이것은 제가 KISA 가이드의 항목을 그대로 복사하지 않고,

**“외부 바이너리를 받았을 때 실제로 무엇을 확인해야 하는가?”**

라는 형태로 다시 구성한 이유와도 같습니다.

---

## 4. TLS가 있어도 trust boundary가 깨지면 결제는 조작될 수 있다

2026년 USENIX Security의 **When Authorization Loses Its Meaning: Breaking and Fixing Third-Party Online Payments**는 이 문제를 더 형식적으로 분석합니다.

연구진은 6개의 실제 third-party payment protocol을 모델링하고 다음 세 가지 관계를 중심으로 검증했습니다.

- **Order**
- **Authorization**
- **Result**

그리고 외부 통신 채널의 integrity가 약해질 경우 기존 payment protocol에서 order tampering이 가능해질 수 있음을 보였습니다.

Android 환경에서는 payment parameter 전달 과정의 implicit Intent 문제를 이용한 실제 공격도 측정했습니다.

**논문:**  
[When Authorization Loses Its Meaning — USENIX Security 2026](https://www.usenix.org/conference/usenixsecurity26/presentation/xiao)

이 연구가 중요한 이유는 payment security를 단순히 다음처럼 보지 않기 때문입니다.

```text
TLS 있음
+ Signature 있음
= 안전
```

대신 다음을 봅니다.

```text
사용자가 승인한 Order
      ↓
Payment System이 처리한 Order
      ↓
Merchant가 성공으로 기록한 Result

이 세 상태가 정말 같은 거래를 의미하는가?
```

이것이 외부 SDK와 protocol을 평가할 때 **trust boundary와 business state까지 함께 봐야 하는 이유**입니다.

---

## 5. 키 길이보다 중요한 것은 키가 어떻게 만들어졌는가

암호 구현 쪽에서도 같은 교훈이 반복됩니다.

Heninger 등이 USENIX Security 2012에서 발표한 **Mining Your Ps and Qs**는 인터넷에서 수집한 실제 TLS/SSH key를 대규모로 분석했습니다.

문제는 RSA라는 알고리즘 자체가 아니었습니다.

충분하지 않은 entropy 때문에 서로 다른 장비에서 prime factor가 공유되는 weak key가 실제로 생성되고 있었습니다.

**논문:**  
[Mining Your Ps and Qs — USENIX Security 2012](https://www.usenix.org/conference/usenixsecurity12/technical-sessions/presentation/heninger)

따라서 다음 질문만으로는 부족합니다.

> “128bit key를 사용합니까?”

더 중요한 질문은 이것입니다.

> **“그 128bit가 실제로 128bit에 가까운 entropy를 가지고 있습니까?”**

제가 assessment에서 key·IV·nonce의 생성 source를 별도 항목으로 둔 것도 이 때문입니다.

---

## 6. 암호화와 메시지 인증은 다른 문제다

암호화되어 있다고 메시지가 위조되지 않는 것은 아닙니다.

Hugo Krawczyk의 고전적인 연구 **The Order of Encryption and Authentication for Protecting Communications**는 encryption과 authentication을 어떻게 구성해야 하는지를 분석합니다.

**논문:**  
[The Order of Encryption and Authentication for Protecting Communications](https://eprint.iacr.org/2001/045)

현대적으로는 AEAD를 사용하는 것이 가장 자연스러운 해법이지만, 여전히 여러 legacy SDK에서는 다음과 같은 형태를 만날 수 있습니다.

```text
AES-CBC(message)
+
hash(message)
```

이때 중요한 것은 “hash가 있느냐”가 아닙니다.

**그 값이 secret에 기반한 MAC인지, 무엇을 인증하는지, 공격자가 메시지를 바꾼 뒤 다시 계산할 수 있는지**를 확인해야 합니다.

NIST의 암호 관련 최신 기준 역시 algorithm뿐 아니라 MAC, random generation, key management를 독립적인 영역으로 다룹니다.

- [NIST Cryptographic Standards and Guidelines](https://csrc.nist.gov/projects/cryptographic-standards-and-guidelines)

---

## 7. “TLS 사용”도 구현을 확인해야 한다

TLS 역시 마찬가지입니다.

CCS 2012의 유명한 연구 **The Most Dangerous Code in the World**는 non-browser software와 SDK에서 잘못된 certificate validation이 얼마나 흔한지를 보여줬습니다.

분석 대상에는 merchant용 SDK도 포함되어 있었습니다.

**논문:**  
[The Most Dangerous Code in the World — CCS 2012](https://doi.org/10.1145/2382196.2382204)

즉 매뉴얼에 다음과 같이 쓰여 있다고 해서,

```text
HTTPS / TLS 사용
```

다음이 자동으로 보장되는 것은 아닙니다.

```text
certificate chain 검증
hostname 검증
trust anchor 관리
endpoint integrity
redirect / proxy 처리
```

따라서 외부 SDK를 평가할 때는 **TLS 사용 여부와 TLS peer authentication을 분리해서 봐야 합니다.**

---

## 8. 서명을 검증한 데이터와 실제 사용하는 데이터가 같아야 한다

USENIX Security 2012의 **On Breaking SAML: Be Whoever You Want to Be**는 XML Signature Wrapping 공격을 통해 이 문제를 잘 보여줍니다.

**논문:**  
[On Breaking SAML — USENIX Security 2012](https://www.usenix.org/conference/usenixsecurity12/technical-sessions/presentation/somorovsky)

서명 검증 자체는 성공합니다.

하지만 애플리케이션이 실제 사용하는 XML node와 서명이 검증된 node가 달라지면 전체 보안 검증은 의미가 없어집니다.

이 문제는 payment protocol에도 그대로 적용할 수 있습니다.

```text
signature verification
        ↓
parser
        ↓
business object
```

이 세 단계에서 **동일한 의미의 데이터가 유지되는지** 확인해야 합니다.

그래서 assessment에는 암호 함수뿐 아니라 parser·serialization·canonicalization 경계까지 포함해야 합니다.

---

## 9. 안전한 암호 API를 사용하는 것과 안전하게 사용하는 것은 다르다

CCS 2013의 **An Empirical Study of Cryptographic Misuse in Android Applications**도 중요한 참고자료입니다.

연구진은 암호 API를 사용하는 11,748개 Android 앱을 분석했고, 10,327개에서 하나 이상의 crypto misuse를 관찰했습니다.

**논문:**  
[An Empirical Study of Cryptographic Misuse in Android Applications — CCS 2013](https://doi.org/10.1145/2508859.2516693)

이 연구가 보여주는 메시지는 명확합니다.

> **좋은 암호 라이브러리를 사용한다고 좋은 암호 시스템이 되는 것은 아니다.**

제가 외부 SDK 평가에서 알고리즘 이름보다 실제 호출 방식, parameter, key/IV 생성과 message authentication을 중요하게 보는 이유도 여기에 있습니다.

---

## 10. 공급망에서는 “이 파일이 무엇인가?”까지 확인해야 한다

외부 SDK 평가에서는 코드와 protocol만 보면 끝나지 않습니다.

우리가 실제 운영에 배포하는 것은 **release artifact**이기 때문입니다.

따라서 다음 질문도 필요합니다.

```text
이 파일은 어디서 받았는가?
어떤 version인가?
어떤 source에서 build됐는가?
SBOM과 실제 binary dependency가 일치하는가?
누가 release했는가?
signature는 있는가?
```

USENIX Security 2019의 **in-toto**는 source에서 최종 deployment artifact까지 software supply-chain의 각 단계를 cryptographic metadata로 연결하는 방법을 제안했습니다.

**논문:**  
[in-toto: Providing farm-to-table guarantees for bits and bytes — USENIX Security 2019](https://www.usenix.org/conference/usenixsecurity19/presentation/torres-arias)

그리고 XZ Utils 사건이 보여줬듯이 단순히 SHA-256이 있다고 공급망이 안전한 것도 아닙니다.

공격자가 만든 악성 release의 SHA-256을 정확히 계산해도 그 파일은 여전히 악성 release입니다.

따라서 hash는 다음만 증명합니다.

```text
내가 받은 파일 == 지정된 파일
```

하지만 우리가 궁극적으로 확인해야 하는 것은 이것입니다.

```text
지정된 파일
    ↓
승인된 source
    ↓
승인된 build
    ↓
승인된 release
    ↓
실제 배포 artifact
```

이 때문에 외부 SDK 평가에는 SBOM뿐 아니라 signature, release evidence, provenance까지 포함될 필요가 있습니다.

국내에서도 이 부분은 이미 별도의 영역으로 확장되고 있습니다.

- [KISA SW 공급망 보안 가이드라인 1.0](https://www.kisa.or.kr/2060204/form?lang_type=KO&postSeq=15)

---

## 결국 문제는 각각의 보안 항목이 따로 존재한다는 것이다

관련 연구를 찾아보면서 흥미로웠던 점은 **제가 실제 분석에서 경험했던 대부분의 실패 패턴이 이미 각각의 연구 분야에서는 상당히 잘 알려져 있었다는 것**입니다.

[![외부 SDK 보안 평가 워크플로](/images/post/external-sdk-security-assessment/workflow.webp)](/images/post/external-sdk-security-assessment/workflow.webp)

*그림 3. 알고리즘 이름에서 멈추지 않고 매뉴얼·소스·바이너리·암호·프로토콜·런타임·파서·SBOM·provenance·업무 원장을 하나로 잇는 증거 기반 워크플로.*

Payment security 연구는 **거래 의미와 상태**를 봅니다.

Crypto misuse 연구는 **key, IV, RNG와 algorithm usage**를 봅니다.

Protocol 연구는 **authentication과 message binding**을 봅니다.

Binary security는 **parser, memory safety, hardening**을 봅니다.

Supply-chain security는 **SBOM, build와 release provenance**를 봅니다.

문제는 실제 기업에서 외부 SDK나 바이너리 하나를 받아 평가할 때입니다.

제가 조사한 문헌 범위에서는 다음을 하나의 흐름으로 묶어 평가하는 방법은 상대적으로 찾기 어려웠습니다.

```text
Manual / Documentation
        ↓
Source / Wrapper Code
        ↓
Native Binary
        ↓
Crypto Implementation
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

이것을 학계 전체에서 전혀 연구되지 않은 새로운 영역이라고 주장할 생각은 없습니다.

오히려 각 영역은 이미 매우 잘 연구돼 있습니다.

제가 필요하다고 느낀 것은 **이 흩어진 검증 관점을 실제 외부 SDK·바이너리의 도입 평가 과정에서 하나의 evidence-based workflow로 연결하는 것**이었습니다.

---

## 그래서 가이드라인 개선의 방향도 “항목 추가”가 아니라고 생각한다

KISA 가이드라인을 개선한다면 단순히 최신 암호 알고리즘이나 키 길이를 표에 추가하는 것만으로는 충분하지 않다고 생각합니다.

더 중요한 변화는 **평가 단위와 평가 방법을 확장하는 것**입니다.

[![외부 SDK 평가를 위한 기존 가이드 확장](/images/post/external-sdk-security-assessment/guideline-extension.webp)](/images/post/external-sdk-security-assessment/guideline-extension.webp)

*그림 4. 기존 알고리즘·시큐어코딩·암호 위생 가이드를 바이너리 분석, 프로토콜 검증, 런타임 증거, SBOM, provenance, 업무 대조로 확장한다 — 폐기가 아니라 확장.*

| 개선 축 | 필요한 변화 |
|---|---|
| **평가 대상** | 애플리케이션뿐 아니라 외부 SDK, DLL/SO/JAR, Agent, Daemon, 네이티브 실행파일을 명시 |
| **암호 평가** | 알고리즘·키 길이뿐 아니라 key/IV/nonce 생성, MAC/AEAD, 인증 범위, key lifecycle 확인 |
| **입력 경계** | 사용자 입력뿐 아니라 실행 인자, SDK API, config, 환경변수, DB, 관리 UI, IPC, CI/CD 변수 추적 |
| **프로토콜** | 요청뿐 아니라 응답 인증, serialization/parser 일관성, replay와 상태 전이 확인 |
| **Hostile Peer** | 상대방이 정상 응답만 보낸다는 가정을 제거하고 malformed response를 threat model에 포함 |
| **바이너리** | NX/DEP, Canary, PIE/ASLR, RELRO와 내장 라이브러리 확인 |
| **공급망** | SBOM, artifact hash, signature, release history와 provenance 연결 |
| **업무 검증** | 성공 코드가 아니라 order·amount·payee·transaction 상태를 authoritative ledger와 대조 |
| **증거 수준** | 문서 주장과 실제 source/binary/runtime observation을 서로 다른 수준으로 관리 |
| **최신성** | KISA·NIST·IETF의 현재 final/draft를 다시 확인 |

특히 **증거 수준**은 중요합니다.

다음 세 문장은 모두 전혀 다른 의미를 가집니다.

```text
매뉴얼에 AES-256을 사용한다고 적혀 있다.

소스 코드에서 AES-256 initialization을 확인했다.

실제 배포 바이너리의 암호 동작과 packet을 분석해
AES-256 사용과 key/IV 생성 경로를 확인했다.
```

그런데 일반적인 체크리스트에서는 이 세 가지가 모두 단순히

```text
AES-256 사용 : Yes
```

가 되어버리기 쉽습니다.

이것은 보안 평가에서 꽤 큰 문제라고 생각합니다.

---

## “무엇을 확인했는가”만큼 “어떻게 확인했는가”도 중요하다

그래서 제가 만든 Skill에서는 판정을 두 축으로 분리했습니다.

[![통제 상태와 증거 수준을 분리한 증거 기반 평가 모델](/images/post/external-sdk-security-assessment/evidence-model.webp)](/images/post/external-sdk-security-assessment/evidence-model.webp)

*그림 5. 모든 판단은 두 축을 가진다 — 통제 상태(취약 확인·통제 확인·미확인·해당없음)와 그 판단을 뒷받침하는 증거 수준.*

**Control status**

- `Confirmed weakness`
- `Confirmed control`
- `Not verified`
- `Not applicable`

그리고 별도로 **Evidence basis**를 기록합니다.

- `Direct artifact`
- `Authorized runtime observation`
- `Target-artifact lab reproduction`
- `Model/synthetic reproduction`
- `Documentation only`
- `Inference`

예를 들어 벤더 매뉴얼에 “안전한 난수 생성기를 사용한다”고 적혀 있어도 그것만으로 실제 구현을 `Confirmed control`로 판정하지 않습니다.

Mock server에서 동일한 취약 메커니즘을 재현했다고 해서 대상 제품이 실제로 취약하다고 확정하지도 않습니다.

증거가 부족하다면 **`Not verified`로 남기는 것이 정상적인 결과**입니다.

이 부분은 AI를 사용한 평가에서 특히 중요합니다.

AI에게 더 많은 취약점을 찾아내라고 하는 것보다,

**증거가 없는 것을 임의로 확정하지 않게 만드는 것이 더 중요할 수 있기 때문입니다.**

---

## 가이드라인에서 AI Skill로

처음에는 이 내용을 체크리스트 형태의 가이드라인으로 만들었습니다.

그런데 실제 평가를 해보면 체크리스트만으로 끝나지 않습니다.

제품 버전과 SHA-256을 고정하고,

매뉴얼을 읽고,

설정과 wrapper source를 보고,

소스가 없으면 바이너리를 분석하고,

내장 라이브러리와 hardening을 확인하고,

protocol과 trust boundary를 모델링하고,

필요하면 승인된 환경에서 packet과 runtime behavior를 검증하고,

마지막에는 payment/authentication 결과가 실제 업무 상태와 일치하는지도 확인해야 합니다.

그래서 이 전체 흐름을 AI가 반복적으로 수행할 수 있도록 Skill로 만들었습니다.

**Crypto Protocol Supply-chain Assessment**  
https://github.com/windshock/crypto-protocol-supply-chain-assessment

목표는 AI에게 단순히 이렇게 묻는 것이 아닙니다.

> “이 SDK 안전해?”

대신 다음의 증거를 서로 대조하도록 하는 것입니다.

```text
매뉴얼
소스 코드
바이너리
패킷
설정
SBOM
저장소
릴리스 증적
업무 상태
```

그리고 최종적으로,

**무엇이 확인됐고, 무엇이 아직 확인되지 않았으며, 각각의 판단을 어떤 증거가 뒷받침하는지 남기는 것**입니다.

---

## 결국 질문이 바뀌어야 한다

예전에는 이렇게 물었습니다.

**“AES-256을 사용합니까?”**

이제는 한 단계 더 물어야 한다고 생각합니다.

**“그 AES-256의 키는 어떻게 만들어집니까?”**

**“IV와 nonce는 어떻게 관리됩니까?”**

**“그 암호문은 누가 만들었다는 것을 어떻게 확인합니까?”**

**“통신 상대는 누가 결정합니까?”**

**“상대방이 악성 응답을 보내도 안전합니까?”**

**“실제로 배포된 바이너리는 어떤 소스와 라이브러리에서 만들어졌습니까?”**

그리고 마지막으로,

**“그 응답을 우리 업무 시스템이 왜 믿어도 됩니까?”**

암호 알고리즘을 확인하는 것은 여전히 필요합니다.

하지만 외부 SDK와 네이티브 바이너리를 사용하는 시대에는 **알고리즘이 안전한지뿐 아니라 그 알고리즘이 실제 시스템에서 어떻게 생성되고, 조립되고, 인증되고, 파싱되고, 배포되고, 최종 업무 판단에 사용되는지까지 평가해야 합니다.**

제가 이 가이드라인과 Skill을 만든 이유도 결국 여기에 있습니다.

---

## 프로젝트

**Crypto Protocol Supply-chain Assessment**

외부 결제 바이너리, PG SDK, 인증·정산 모듈, 암호 통신 라이브러리의 암호 설계·프로토콜·공급망 위험을 증거 기반으로 평가하기 위한 AI Skill입니다.

https://github.com/windshock/crypto-protocol-supply-chain-assessment

---

## 참고 연구 및 가이드

### Third-party Payment / SDK Security

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

### 국내·국제 가이드

11. **KISA 암호 안내서 자료실**  
    https://www.kisa.or.kr/2060305

12. **KISA 안전한 소프트웨어 개발 자료실**  
    https://www.kisa.or.kr/2060204

13. **KISA SW 공급망 보안 가이드라인 1.0**  
    https://www.kisa.or.kr/2060204/form?lang_type=KO&postSeq=15

14. **NIST Cryptographic Standards and Guidelines**  
    https://csrc.nist.gov/projects/cryptographic-standards-and-guidelines
