---
title: "기업 네트워크 보안을 위한 ECH 차단 및 DoH 대응 전략"
date: 2025-03-31
description: "dnsmasq를 사용하여 SVCB와 HTTPS 레코드를 필터링함으로써 ECH를 비활성화하고 중앙 DNS 정책을 적용하는 실습 가이드. DoH 차단은 별도의 네트워크 정책이 필요함을 함께 안내합니다."
tags: ["DNS", "DoH", "ECH", "ESNI", "dnsmasq", "기업보안"]
---

![DNSMASQ-block background](/images/post/dnsmasq-ech-doh-block.png)

## 배경

최근 들어 Cloudflare(1.1.1.1), Google(8.8.8.8) 등 공개 DNS 서비스가 악성코드의 C2 통신 경로로 악용되는 사례가 늘고 있습니다.  
특히, DoH (DNS over HTTPS), ECH (Encrypted Client Hello)와 같은 프로토콜은 DNS 트래픽 및 SNI 필드를 암호화하여 보안 솔루션이 이를 식별하지 못하게 만듭니다.

> **참고**: ESNI(Encrypted SNI)는 더 이상 사용되지 않으며, 현재는 **ECH**가 공식적인 표준입니다. 이 글에서는 ESNI 대신 ECH에 초점을 맞춥니다.

---

## 위협 요소

- **보안 정책 우회**: 사용자가 Cloudflare, Google 등의 DoH 주소를 수동 설정하면 기업 DNS 정책이 무력화됩니다.  
- **C2 통신 은폐**: ECH는 TLS 연결 시 SNI 필드를 암호화하여 도메인 기반 탐지를 어렵게 만듭니다.  
- **데이터 유출**: 암호화된 DNS 경로를 통해 기업 내부 정보가 외부로 전송될 수 있습니다.

---

## 핵심 요점: DoH와 ECH는 별개이며, 각각에 맞는 대응 필요

- 이 글에서 설명하는 **dnsmasq 기반 설정은 ECH 차단**에 해당합니다.
- **DoH는 차단되지 않습니다**. DoH는 DNS 쿼리를 HTTPS로 전송하므로, **네트워크 계층의 방화벽 규칙 또는 IP 차단** 등의 별도 조치가 필요합니다.
  - 예: Cloudflare DoH(1.1.1.1:443), Google DoH(8.8.8.8:443) 등 차단
  - 참고: [Cisco Umbrella의 DoH 우회 방지 가이드](https://support.umbrella.com/hc/en-us/articles/230904088-How-to-Prevent-Users-from-Circumventing-Cisco-Umbrella-with-Firewall-Rules)

---

## 해결책: 중앙 DNS 서버에서 ECH 제어

사용자 단에서 ECH 설정을 변경해도 다시 활성화될 수 있으므로, **기업 DNS 서버에서 직접 SVCB(65), HTTPS(64) 레코드를 필터링**하는 방식이 효과적입니다.  
이를 통해 클라이언트가 ECH 기능을 활용할 수 없도록 제한할 수 있습니다.

---

## 실습: macOS에서 dnsmasq를 이용한 ECH 필터링 구성

> 다른 운영체제(Windows, Linux 등) 사용자는 별도 설정이 필요하며, `dnsmasq`는 플랫폼에 따라 설치 방법이 다를 수 있습니다.

### 1. dnsmasq 설치

```bash
brew install dnsmasq
```

### 2. 설정 파일 수정

```bash
sudo nano /opt/homebrew/etc/dnsmasq.conf
```

다음 내용을 추가합니다:

```conf
# 외부 DNS 서버 설정
server=8.8.8.8

# SVCB(65), HTTPS(64) 레코드 필터링
filter-rr=SVCB,HTTPS
```

### 3. dnsmasq 실행

```bash
sudo dnsmasq --conf-file=/opt/homebrew/etc/dnsmasq.conf
```

### 4. 시스템 DNS 서버 변경

```bash
networksetup -setdnsservers Wi-Fi 127.0.0.1
```

> Ethernet 인터페이스는 `Wi-Fi` 대신 `Ethernet`으로 설정해야 합니다.

---

## ECH 차단 확인 방법

Cloudflare의 `https://crypto.cloudflare.com/cdn-cgi/trace` 페이지에 접속하면 현재 연결에서 ECH가 활성화되었는지 확인할 수 있습니다.

### 예시 화면:
![Cloudflare-trace image](/images/post/crypto.cloudflare.com-cdn-cgi-trace.jpeg)

- `sni=encrypted` 또는 `sni=plaintext`으로 표시됩니다.

---

## 결론

- dnsmasq를 통해 SVCB, HTTPS 레코드를 필터링함으로써 ECH 기능은 효과적으로 차단할 수 있습니다.
- DoH는 이 방법으로 차단되지 않으며, 별도의 네트워크 계층 보안 설정이 필요합니다.
- macOS 외 운영체제 사용자는 별도 설정 가이드를 참조하거나 방화벽 정책 기반 대응을 고려해야 합니다.
- ECH 차단은 보안을 강화하지만, 프라이버시 기능을 제한할 수 있는 트레이드오프도 있습니다.

---

## 참고 자료

- [Cloudflare의 ECH 설명](https://blog.cloudflare.com/encrypted-client-hello/)
- [dnsmasq 공식 문서](http://www.thekelleys.org.uk/dnsmasq/doc.html)
- [Cisco Umbrella의 DoH 우회 방지 가이드](https://support.umbrella.com/hc/en-us/articles/230904088-How-to-Prevent-Users-from-Circumventing-Cisco-Umbrella-with-Firewall-Rules)
- [Broadcom의 다양한 운영체제 기반 DoH 차단 방법](https://knowledge.broadcom.com/external/article/369322/how-to-block-dns-over-https-doh-traffic.html)
