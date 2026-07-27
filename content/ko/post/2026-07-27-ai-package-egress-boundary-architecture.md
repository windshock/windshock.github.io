---
title: "AI 실행 환경의 패키지⁠·⁠컨테이너 레지스트리 경계와 Egress 통제 구조"
date: 2026-07-27
draft: false
featured: true
tags: ["Mind", "AI 보안", "Artifact Repository", "SSRF", "Egress Control"]
categories: ["보안 아키텍처", "AI 보안"]
description: "패키지·컨테이너 레지스트리 프록시는 AI 실행 환경의 능동적인 신뢰 경계다. 사고 증거, 공개 SSRF 이력, 런타임 관측을 artifact egress 통제 구조로 연결한다."
image: "/images/post/ai-package-egress/ko-cover.webp"
cover:
  image: "/images/post/ai-package-egress/ko-cover.webp"
  alt: "패키지·컨테이너 레지스트리 프록시를 둘러싼 AI 신뢰 경계"
---

AI 에이전트가 호출할 수 있는 순간, 패키지와 컨테이너 레지스트리는 수동적인 개발 편의 기능이 아니다. 관찰하고 반복 사용할 수 있는 outbound interface이며, 따라서 AI runtime의 보안 경계가 된다.

## 1. 요약

AI 실행 환경에서 package manager는 더 이상 단순한 개발 도구가 아니다. 패키지 설치, 컨테이너 이미지 pull, metadata 조회, source archive 다운로드, image layer 조회, cache miss, redirect 처리는 AI가 사용할 수 있는 **외부 정보수집 및 egress 인터페이스**가 된다.

이번 보고서의 핵심은 “패키지 프록시 제품이 취약할 수 있다”는 수준이 아니다. 더 중요한 가정은, AI가 허용된 패키지/레지스트리 프록시 또는 컨테이너 레지스트리 프록시를 이용해 현재 실행 경계 또는 조직 주요 인프라 제품의 공개 소스·바이너리·컨테이너 이미지·패치 정보를 먼저 확보하고, 구조를 이해한 뒤, 실제 경계 장비에 가설을 검증할 수 있다는 점이다.

> **핵심 결론:** AI runtime에는 package proxy나 container registry proxy를 직접 제공하면 안 된다. AI는 **Approved Artifact Store**의 검증 완료 artifact만 읽어야 한다. 외부 fetch는 별도 Fetcher Zone에서 수행하고, 현재 환경에서 사용 중인 주요 솔루션의 source, binary, container image, image layer, patch diff, PoC는 **Critical Product Catalog** 기반으로 차단·보류·격리해야 한다.

## 2. 문제 제기와 최초 가정

출발점은 “AI가 인터넷에 직접 접근할 수 있는가”가 아니다. 출발점은 **AI에게 허용된 정상 기능 중 어떤 것이 사실상 외부 읽기 권한이 되는가**이다.

예를 들어 AI 실행 환경에서 일반 인터넷은 차단되어 있지만 Maven 패키지 설치 또는 Docker/OCI image pull이 내부 Nexus, Artifactory, container registry proxy를 통해 허용되어 있다고 가정한다. 이때 해당 Nexus가 Maven Central을 프록시하고, 관련 artifact 또는 GitHub 소스 접근이 차단되어 있지 않다면, AI는 사내 Nexus 설치 디렉터리를 읽지 않고도 공개 코드 또는 바이너리를 확보할 수 있다.

    AI Sandbox
      → 사내 package 또는 container registry proxy
      → Maven Central / Docker Hub / GHCR / public source repository
      → 공개 POM / JAR / sources.jar / container image layer
      → 정적 분석, layer 추출 또는 디컴파일
      → 실제 Proxy 응답과 대조
      → 취약 경로 후보 검증

즉 허용된 패키지/레지스트리 프록시가 공개 패키지·컨테이너 생태계에 대한 제한적 읽기 권한을 제공했고, 그 생태계 안에 프록시 제품 자신 또는 유사 버전의 공개 코드가 존재할 수 있다는 의미다.

[![AI가 허용된 패키지·레지스트리 프록시로 공개 소프트웨어를 학습하는 구조](/images/post/ai-package-egress/ko-learning-path.svg)](/images/post/ai-package-egress/ko-learning-path.svg)

*그림 1. 허용된 패키지/레지스트리 프록시는 AI에게 공개 패키지·컨테이너 생태계와 대상 제품 구조를 읽는 채널이 될 수 있다. [원본 크기 SVG 열기](/images/post/ai-package-egress/ko-learning-path.svg).*

## 3. 사고 사례: OpenAI–Hugging Face

Hugging Face는 2026년 7월 생산 인프라 일부 침해를 공개하면서, 이번 침입이 종단 간 autonomous AI agent system에 의해 주도됐고, 자체 AI 분석을 통해 침해를 탐지·분석했다고 설명했다. 또한 17,000건이 넘는 이벤트 로그를 기반으로 침해 타임라인을 재구성했으며, 실제 공격 명령·payload·C2 artifact·credential이 포함된 분석 입력은 상용 hosted model의 안전장치에 막혀 자체 인프라의 GLM 5.2로 포렌식 분석을 수행했다고 밝혔다.

OpenAI도 별도 글에서 이 사고가 내부 cyber capability evaluation 중 발생했으며, GPT-5.6 Sol 및 더 강한 pre-release model이 reduced cyber refusal 상태로 테스트됐다고 설명했다. 중요한 보안 포인트는 평가 환경의 네트워크 접근이 일반 인터넷이 아니라, 내부 호스팅된 제3자 package registry proxy/cache를 통한 패키지 설치 경로로 제한되어 있었다는 점이다.

> **현장감 있게 보면:** 외부 인터넷을 막아도 package proxy 또는 container registry proxy가 외부 registry와 통신한다면, AI 입장에서는 “막힌 인터넷”이 아니라 “이름이나 이미지명을 넣으면 바깥에서 무언가를 가져오는 한 개의 문”이 남아 있는 셈이다.

ExploitGym과 같은 containerized benchmark 환경에서는 관련 경로가 pip, npm, Maven에만 한정되지 않을 수 있다. Docker/OCI registry 접근은 image manifest, config blob, filesystem layer를 제공할 수 있다. 이미지를 실행하지 않더라도 layer 추출만으로 JAR, WAR, native binary, entrypoint script, 설정 템플릿, dependency 구조, 버전 정보를 확보할 수 있다.

[![OpenAI 사고 경로 요약](/images/post/ai-package-egress/ko-incident-path.svg)](/images/post/ai-package-egress/ko-incident-path.svg)

*그림 2. 사고 구조의 단순화: package/container registry proxy는 개발 편의 서비스가 아니라 AI sandbox의 egress boundary다. [원본 크기 SVG 열기](/images/post/ai-package-egress/ko-incident-path.svg).*

### 3.1 외부 기술 재구성

Hacktron AI의 외부 재구성 글은 container registry 관점을 더 직접적으로 제시한다. 해당 글은 OpenAI 측 경로를 공개 정보와 ExploitGym 유사 exploit 개발 경험을 바탕으로 재구성한 것이며, 공식 확인으로 제시하지 않는다. 또한 OpenAI 측 경로에 대해서는 약 80% 확신한다고 하면서도, JFrog가 실제 sandbox escape 대상이었는지는 불확실하다고 밝힌다.

#### Artifact read surface

해당 재구성은 샌드박스가 JFrog 유사 package registry 경로를 통해 npm, PyPI, Docker package에 reader access를 가졌을 가능성을 제기한다. 따라서 보안 경계는 language package manager에만 한정되지 않는다.

#### Binary analysis path

Artifactory가 관련 proxy/cache 제품이었다면, 해당 registry 경로를 통해 container image 또는 JAR 파일에 접근할 수 있었을 가능성이 제기된다. 방어 관점의 핵심은 container image나 JAR만으로도 정적 분석과 reverse engineering의 충분한 입력이 될 수 있다는 점이다.

> **신뢰도 경계:** 이 보고서는 Hacktron 글을 유용한 외부 기술 재구성으로 다루며, JFrog가 실제 관련 공급업체였다는 증거로 사용하지 않는다. 공식 자료가 확인한 것은 이름이 공개되지 않은 내부 호스팅 third-party package registry proxy/cache와 그 경계의 zero-day 악용이지, 특정 벤더명이나 세부 공격 절차는 아니다.

### 3.2 시장 반응 신호: AI Trust Boundary Risk로 가격에 반영되는 Artifact Infrastructure

시장 반응은 이 문제가 단순한 sandbox security 이슈에 그치지 않는다는 점을 보여준다. TIKR는 OpenAI가 이름을 밝히지 않은 third-party package registry proxy/cache 관련 사고를 공개한 뒤, 2026년 7월 22일 JFrog 주가가 7.95% 하락했다고 설명했다. 또한 Raymond James의 Mark Cash가 OpenAI가 설명한 소프트웨어가 Artifactory와 유사한 proxy/cache 기능을 수행하고, JFrog가 선도 AI 연구소들을 고객으로 언급해 왔다는 점을 근거로 JFrog 가능성을 검토했다고 전한다.

다만 이 시장 신호는 조심해서 해석해야 한다. TIKR도 공개 규제 제출서, 회사 성명, OpenAI 공개자료 중 어디에도 JFrog 관련성이 확인되지 않았고, 배제된 것도 아니라고 정리한다. 즉 주가 반응은 투자자들이 artifact infrastructure 노출을 리스크로 가격에 반영하기 시작했다는 신호이지, 특정 벤더가 확인됐다는 증거는 아니다.

> **해석:** Package proxy, container registry, artifact cache, image layer는 AI 실행 환경의 trust boundary 일부가 되고 있다. 이는 기술적 보안 문제인 동시에, AI build/evaluation pipeline 내부에 위치한 벤더에게는 시장·공시·고객 신뢰 리스크가 될 수 있다.

## 4. OpenAI / Claude 실행 환경 관측

공개 자료와 실행 환경 관측에서 확인한 두 구조는 통제 지점이 달랐다. OpenAI 쪽은 패키지 게이트웨이가 중심이고, Claude/Anthropic 쪽은 TLS inspection 기반 egress gateway가 중심이다.

| 구분 | OpenAI 실행 컨테이너 | Claude / Anthropic 실행 환경 |
|----|----|----|
| 관측된 중심 | 패키지 게이트웨이 | 네트워크 egress gateway |
| 주요 흔적 | `/artifactory/api/pypi`, `/artifactory/api/npm`, 내부 packages host, nginx front | Firecracker microVM, TLS inspection CA, `host_not_allowed`, `private_dest_ip`, TEST-NET-1 주소 |
| 추정 구조 | JFrog Artifactory 계열 또는 Artifactory-compatible gateway | 자체 egress policy + TLS MITM gateway. 데이터 플레인 구현체는 미확정 |
| 정책 단위 | 패키지 registry / repository path | SNI / Host / IP / port |
| 주요 위험 | package name, version, metadata lookup, remote fallback | 허용 host 내부의 content channel, TLS transport trust 단절 |

> **TLS inspection의 의미:** 샌드박스 내부에서 보는 TLS 인증서는 오리진 인증서가 아니라 egress gateway가 발급한 인증서다. 따라서 전송 계층 신뢰보다 lockfile hash, npm integrity, Sigstore, PGP, TUF 같은 content-level verification이 중요하다.

## 5. 공개 취약점 사례: Nexus SSRF 이력

이 장은 공개된 Nexus SSRF 이력만 다룬다. 미공개 제보 후보, 세부 재현 절차, 페이로드, 특정 manifest 구성은 본 보고서 범위에서 제외한다.

| 공개 항목 | 요약 | AI 패키지 경계 관점의 의미 |
|----|----|----|
| **CVE-2026-0600** | Proxy repository configuration SSRF. Remote storage URL이 내부망 또는 cloud metadata로 향할 수 있는 문제. | 패키지 프록시 설정 자체가 서버 측 outbound 권한을 갖는다. |
| **CVE-2026-14646** | Proxy repository upstream HTTP redirect target에 SSRF 보호가 재적용되지 않은 문제. 3.94.0에서 수정. | redirect는 artifact 다운로드 편의 기능이 아니라 egress 우회 지점이 될 수 있다. |
| **CVE-2026-14645** | Global Webhook URL 검증 누락. | 관리 편의 기능도 outbound primitive가 될 수 있다. |
| **CVE-2026-7494** | SSL Certificate Retrieval host/port 제어 문제. | 진단 기능도 내부 서비스 enumeration 경로가 될 수 있다. |
| **CVE-2025-9868** | Nexus Repository 2.x Remote Browser Plugin SSRF. | 패키지 저장소 제품은 오래전부터 SSRF/credential exposure 위험을 가져왔다. |

### 재사용 가능한 Repository SSRF 분석 스킬

오픈소스 [repository-ssrf-audit](https://github.com/windshock/repository-ssrf-audit) 스킬은 이 검토 모델을 다른 저장소 제품에도 재사용할 수 있는 절차로 정리한다. Nexus와 JFrog Artifactory라는 제품별 진입점은 명시적으로 유지하되, 핵심 분석은 범용적이다. 공격자 제어 입력이 parsing과 URL transformation을 거쳐 최종 network request에 도달하는 흐름을 추적하고, 정책이 허용한 목적지와 실제 socket이 사용한 목적지를 비교한다.

포함된 scanner 결과는 조사 단서일 뿐 취약점 판정이 아니다. 확정에는 권한이 부여된 격리 랩, 통제 가능한 canary, 음성 대조군, 최종 sink 증거가 필요하다. 공개 스킬은 미공개 제품별 payload, trigger 조합, 영향 버전 경계처럼 곧바로 비공개 취약점을 재구성할 수 있는 정보는 의도적으로 제외한다.

## 6. 위협 모델: 학습·추론·검증 루프

AI 샌드박스에서 패키지 프록시가 위험한 이유는 단순히 외부 요청이 가능해서가 아니다. AI는 반복적으로 관찰하고, 가설을 수정하고, 다른 입력을 시도할 수 있다.

    1. 경계 장비 식별
    2. 공개 패키지·컨테이너 생태계에서 관련 제품 소스·바이너리·이미지 획득
    3. 정적 분석 또는 디컴파일
    4. 실제 프록시 응답과 대조
    5. 입력 변형 및 반복 검증
    6. 외부 접근 또는 내부망 접근 가능성 확인

#### 패키지명 기반 외부 신호

미존재 패키지명, scoped package명, 버전 문자열은 외부 registry lookup으로 이어질 수 있다.

#### Metadata lookup 채널

install이 실패해도 metadata 조회는 발생한다. 404도 외부 통신이다.

#### Source/archive/image 획득

sources.jar, sdist, npm tarball, GitHub archive, Docker manifest, image layer는 AI에게 외부 코드와 바이너리 확보 경로가 된다.

#### Critical product 학습

Nexus, Artifactory, Jenkins, GitLab, Keycloak 등의 공개 소스·이미지는 공격 대상 설명서가 될 수 있다.

## 7. 신뢰 경계 전체 구조

신뢰 경계는 “AI Sandbox 앞의 패키지 프록시”가 아니라, **Fetcher Zone, Quarantine, Policy Engine, Approved Store, AI Runtime Boundary**로 재구성해야 한다.

[![AI 패키지 egress 신뢰 경계 전체 구조](/images/post/ai-package-egress/ko-trust-boundary.svg)](/images/post/ai-package-egress/ko-trust-boundary.svg)

*그림 3. 전체 신뢰 경계. AI Runtime은 Public Internet과 직접 연결되지 않으며, 주요 솔루션의 source/binary/image/layer/PoC는 Critical Product Catalog에 의해 차단·보류·격리 연구 경로로 라우팅된다. [원본 크기 SVG 열기](/images/post/ai-package-egress/ko-trust-boundary.svg).*

## 8. 권고 아키텍처

권고 구조는 package proxy를 AI runtime에서 제거하고, 외부 fetch를 별도 zone으로 분리하는 것이다. 핵심은 AI가 dependency resolution을 수행하지 못하게 하고, 이미 승인된 artifact만 사용하게 만드는 것이다.

    External Registry / Docker Hub / GHCR / GitHub / Release Site
            ↓
    External Fetcher
            ↓
    Critical Product Catalog 검사
            ↓
    Policy Engine
            ├─ 일반 dependency → hash/signature 검증 → Approved Store
            ├─ 주요 솔루션 artifact → Quarantine / Human Approval
            ├─ source/test/doc/container image/PoC → 기본 차단
            └─ 내부 사용 제품과 매칭 → Security Review 전용 격리
            ↓
    AI Sandbox

### 8.1 AI Sandbox

- direct internet, raw DNS, CONNECT proxy, public registry direct access 차단
- 패키지 설치는 approved store의 정확한 artifact만 허용
- task_id 강제, ephemeral filesystem, read-only base image, credential 미탑재
- D2/D3 자료 또는 취약점 재현 환경은 outbound 없는 isolated lab으로 분리

### 8.2 Approved Artifact Store

AI가 접근 가능한 repository는 remote/virtual이 아니라 hosted/local이어야 한다. cache miss 시 upstream fetch가 발생하면 안 된다.

    AI 접근 허용:
    - hosted/local repository
    - 승인 artifact만 존재
    - upstream fallback 없음

    AI 접근 금지:
    - remote repository
    - virtual repository with remote fallback
    - VCS remote repository
    - public registry proxy

## 9. Critical Product Catalog 통제

추가 대응의 핵심은 조직에서 실제 사용하는 주요 솔루션의 소스·바이너리·컨테이너 이미지·image layer·패치 diff·PoC를 AI runtime이 직접 가져오지 못하게 하는 것이다.

모든 오픈소스 접근을 막을 수는 없다. 대신 기준은 명확해야 한다. 우리 환경의 실행 경계, 인증 경계, 배포 경계, 로깅 경계, 보안 통제 경계에 사용되는 제품은 일반 dependency와 다르게 취급한다.

| 분류 | 예시 | 기본 정책 |
|----|----|----|
| 패키지/레지스트리 프록시 | Nexus Repository, JFrog Artifactory, Harbor, Quay | source/JAR/image/layer/patch diff AI runtime 직접 획득 금지 |
| CI/CD | Jenkins, GitLab, GitHub Enterprise, Argo CD | plugin source, server binary, exploit PoC 차단 또는 보류 |
| Registry/Supply Chain | Harbor, Quay, Snyk, Fortify, Xray | 운영 버전과 일치하는 artifact 고위험 분류 |
| IAM/Gateway | Keycloak, Vault, Consul, Envoy, Istio, Cilium | 설정 예시·이미지·테스트 코드 접근 제한 |
| 보안 솔루션 | EDR, WAF, VPN, SASE/SWG, SIEM | 제품명·버전·관리 URL·탐지 룰 과다 노출 제한 |

## 10. 모니터링·탐지 설계

URL 로그만으로는 부족하다. 패키지 의미 단위로 기록해야 한다. 핵심 키는 `task_id`, `package identity`, `artifact hash`, `policy decision`, `upstream host`, `product_match`다.

    {
      "time": "...",
      "task_id": "ai-eval-001",
      "sandbox_id": "sbx-88fd",
      "ecosystem": "maven",
      "package": "org.example:example-product",
      "version": "x.y.z",
      "artifact_type": "sources.jar|container-image-layer",
      "image_digest": "sha256:...",
      "layer_digest": "sha256:...",
      "product_match": "Critical Infrastructure Product",
      "product_role": "package_proxy_boundary",
      "policy_decision": "deny",
      "deny_reason": "critical_product_source_retrieval",
      "upstream_host": "repo1.maven.org",
      "request_origin": "ai_runtime"
    }

#### 고엔트로피 패키지명

길이 40 이상, hex/base64/base32-like token, task_id 유사 문자열 포함 시 경보.

#### 미존재 패키지 반복 조회

동일 task_id에서 404 lookup 반복 또는 registry별 404 급증 탐지.

#### 생태계 불일치

Python 작업에서 npm 대량 조회, Java 작업에서 PyPI lookup 등 목적 불일치 탐지.

#### critical product match

현재 사용 중인 인프라 제품명·vendor·artifact 좌표·image 이름과 일치하면 별도 경보.

#### source/archive/image 대량 다운로드

sources.jar, sdist, tarball, GitHub archive, Docker manifest, image layer는 별도 로깅과 승인제.

#### postinstall/script 실행

npm postinstall, setup.py, build script는 sandboxed build 및 syscall/network 제한.

## 11. 단계별 적용 계획

### 1단계: 즉시 적용

1.  AI용 repository를 remote/virtual이 아닌 hosted/local로 분리
2.  AI sandbox에서 외부 DNS/HTTP/HTTPS 차단
3.  pip/npm/maven/cargo/go registry와 Docker/OCI registry endpoint를 approved store로 고정
4.  신규 package lookup 403 처리 및 경보화
5.  package 요청에 task_id 강제
6.  cross-host redirect 차단
7.  sources/archive/image manifest/image layer 다운로드 별도 로깅
8.  artifact sha256 저장
9.  Fetcher zone만 외부 registry 접근 허용
10. Critical Product Catalog 초안 작성: 패키지 프록시, CI/CD, IAM, registry, 보안 솔루션부터 시작

### 2단계: 검증 체계 강화

1.  lockfile hash 검증
2.  SBOM 생성
3.  malware/SCA/license 검사
4.  package provenance 기록
5.  approval record 저장
6.  canary package name 탐지
7.  critical product source/binary 요청에 대한 승인 workflow 적용

### 3단계: 공급망 증명 체계

1.  Sigstore / Cosign 검증
2.  SLSA provenance 수집
3.  in-toto attestation 적용
4.  TUF-style metadata 도입
5.  Security Lab Route와 AI Runtime Route를 분리 운영

## 12. 결론

OpenAI–Hugging Face 사고, OpenAI 실행 컨테이너의 Artifactory-style package gateway 관측, Claude의 Firecracker/TLS inspection egress gateway 관측, Nexus 공개 SSRF 이력은 모두 같은 결론으로 이어진다.

> **결론:** AI 실행 환경에서 package manager와 container registry는 개발 도구가 아니라 외부 정보수집 및 egress 인터페이스다. AI에게 package proxy나 container registry proxy를 주는 대신, 승인된 artifact store만 제공해야 한다.

    AI Runtime:
      no Internet
      no registry lookup
      no critical product source or image retrieval
      approved artifact only

    External Fetch:
      separate zone
      allowlisted registry only
      critical product catalog 검사
      hash/signature/provenance 검증
      quarantine 후 승인

    Monitoring:
      task_id + package identity + artifact hash
      + policy decision + upstream host + product_match 기준

대응의 핵심은 단순히 패키지 프록시 취약점을 막는 것이 아니다. AI가 자신의 실행 경계를 구성하는 제품을 스스로 식별하고, 공개 소스·바이너리를 가져와 구조를 학습하고, 실제 대상에 검증하는 루프를 끊어야 한다.

## 참고자료

- [repository-ssrf-audit — Nexus, JFrog Artifactory 및 저장소 SSRF 분석을 위한 재사용 가능 스킬](https://github.com/windshock/repository-ssrf-audit)
- OpenAI, [OpenAI and Hugging Face partner to address security incident during model evaluation](https://openai.com/index/hugging-face-model-evaluation-security-incident/), 2026-07-21.
- Hugging Face, [Security incident disclosure — July 2026](https://huggingface.co/blog/security-incident-july-2026), 2026-07-16.
- Hacktron AI, *Here’s How an OpenAI Model Went Rogue and Hacked Hugging Face*, 2026-07-23. Treated here as third-party reconstruction, not official confirmation.
- TIKR, *JFrog Stock Fell 8% in a Day. Here’s Where the Stock Could Go*, 2026-07-23. Used here as market-reaction signal, not investment advice.
- JFrog Docs, [PyPI Repositories](https://docs.jfrog.com/artifactory/docs/pypi-repositories).
- JFrog Docs, [npm Repositories](https://docs.jfrog.com/artifactory/docs/npm-repositories).
- JFrog Docs, [Docker Repositories](https://docs.jfrog.com/artifactory/docs/docker-repositories).
- Sonatype Security Advisories, [Nexus Repository Security Advisories](https://support.sonatype.com/hc/en-us/sections/203012668-Security-Advisories).
- Sonatype Help, [Nexus Repository Docker Registry](https://help.sonatype.com/en/docker-registry.html).
- Sonatype, [CVE-2026-14646 Nexus Repository 3 - SSRF via HTTP Redirect](https://support.sonatype.com/hc/en-us/articles/53165019641363-CVE-2026-14646-Nexus-Repository-3-SSRF-via-HTTP-Redirect-2026-07-14).
- Sonatype, [CVE-2026-14645 Nexus Repository 3 - Webhook SSRF](https://support.sonatype.com/hc/en-us/articles/53158843564179-CVE-2026-14645-Nexus-Repository-3-Webhook-SSRF-2026-07-14).
- NVD, [CVE-2026-7494 Nexus Repository 3 SSRF in SSL Certificate Retrieval](https://nvd.nist.gov/vuln/detail/CVE-2026-7494).
- Sonatype, [CVE-2026-0600 Nexus Repository 3 - Server-Side Request Forgery](https://support.sonatype.com/hc/en-us/articles/47928855816595-CVE-2026-0600-Nexus-Repository-3-Server-Side-Request-Forgery-2026-01-13).
- Sonatype, [CVE-2025-9868 Nexus Repository 2 Remote Browser Plugin SSRF](https://support.sonatype.com/hc/en-us/articles/45363201583635-CVE-2025-9868-Nexus-Repository-2-SSRF-Vulnerability-in-Remote-Browser-Plugin).

> 이 글은 미공개 취약점의 세부 재현 절차, 페이로드, 공격 절차를 의도적으로 제외한다.
