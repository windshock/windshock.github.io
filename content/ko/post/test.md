---
title: "test"
date: 2025-04-21
draft: true
tags: ["개인정보보호", "정책", "시민참여", "카카오페이", "데이터민주주의", "AI"]
categories: ["Security", "Policy"]
summary: "test"
---
# Solana 및 Polygon RPC의 보안 위협 조사 보고서

## 서론
Solana와 Polygon의 RPC(Remote Procedure Call) 시스템은 블록체인 네트워크와 상호작용하는 핵심 인터페이스로, 각각 Rust와 Go 언어를 기반으로 구현됩니다. 본 보고서는 2025년 4월 21일 기준으로, Solana와 Polygon RPC의 보안 위협을 조사하고, Go와 Rust 언어 및 JSON-RPC 라이브러리 자체의 문제로 발생한 이슈를 분석합니다. 또한, Python 기반 클라이언트 노드의 직렬화/역직렬화 과정과 대표적인 RPC 클라이언트 애플리케이션(웹 애플리케이션, 디앱 백엔드, 데이터 분석 도구, 트랜잭션 서비스)을 포함하여 블록체인 생태계의 보안을 종합적으로 검토합니다. 이는 Web3 인프라의 안정성과 보안을 강화하기 위한 기초 자료로 활용될 수 있습니다.

## 배경: Solana와 Polygon RPC의 언어 및 구조

### Solana RPC
- **주요 언어**: Rust (프로그램 및 노드), JavaScript/TypeScript (클라이언트)
- **구조**: JSON-RPC 2.0, WebSocket 지원, 데이터와 코드 분리, 병렬 처리 및 비동기 이벤트 루프
- **특징**: 초당 65,000 TPS, 초저렴한 수수료, 고성능 클러스터 기반
- **주요 제공자**: QuickNode, Alchemy, Helius
- **테스트 환경**: Devnet, Testnet

### Polygon RPC
- **주요 언어**: Go (노드), Solidity (스마트 컨트랙트), JavaScript/TypeScript (클라이언트)
- **구조**: JSON-RPC 2.0 (Ethereum 호환), EVM 기반, 레이어 2 아키텍처 (Bor 및 Heimdall 노드)
- **특징**: 초당 ~7,000 TPS, Ethereum보다 저렴한 수수료, Ethereum 메인넷과의 체크포인트
- **주요 제공자**: Ankr, dRPC, Alchemy, Infura
- **테스트 환경**: Amoy Testnet

## RPC 클라이언트 애플리케이션 목록
Solana와 Polygon RPC에 접근하는 클라이언트는 주로 서버 노드(예: 디앱 백엔드)로 동작하며, Python, JavaScript, Go 등 다양한 언어로 구현됩니다. 아래는 대표적인 애플리케이션 유형과 사례입니다.

### 웹 애플리케이션
- **설명**: 사용자 인터페이스를 제공하며, 브라우저에서 RPC를 통해 블록체인과 상호작용.
- **대표 사례**:
  - **MetaMask**: 이더리움 호환 지갑으로 Polygon RPC를 통해 트랜잭션 전송 및 계정 관리.
  - **Phantom**: Solana 전용 지갑으로 Solana RPC를 통해 계정 조회 및 디앱 연결.
  - **OpenSea**: Polygon과 Solana를 지원하는 NFT 마켓플레이스로, RPC를 통해 NFT 데이터 조회 및 거래.
  - **Uniswap**: Polygon에서 실행되는 DEX로, RPC를 통해 토큰 스왑 및 유동성 풀 데이터 제공.

### 디앱(DApp) 백엔드
- **설명**: 디앱의 서버 측 로직을 처리하며, RPC를 통해 트랜잭션 생성, 스마트 컨트랙트 호출, 데이터 조회 수행.
- **대표 사례**:
  - **Aave**: Polygon에서 실행되는 DeFi 프로토콜로, RPC를 통해 대출 및 예금 트랜잭션 처리.
  - **Serum**: Solana 기반 DEX로, RPC를 통해 주문서(order book) 관리 및 트랜잭션 실행.
  - **QuickSwap**: Polygon의 AMM 기반 DEX로, RPC를 통해 스왑 및 유동성 제공.
  - **Raydium**: Solana의 AMM 및 유동성 프로토콜로, RPC를 통해 풀 데이터 조회 및 트랜잭션.

### 블록체인 데이터 분석 도구
- **설명**: 블록체인 데이터를 수집, 분석, 시각화하며, RPC를 통해 블록, 트랜잭션, 이벤트 로그 조회.
- **대표 사례**:
  - **Dune Analytics**: Polygon 및 Solana 데이터를 분석하여 대시보드 제공, RPC로 데이터 수집.
  - **The Graph**: Polygon과 Solana의 서브그래프를 통해 인덱싱된 데이터 제공, RPC로 원시 데이터 조회.
  - **Nansen**: 온체인 데이터 분석 플랫폼으로, RPC를 통해 계정 활동 및 트랜잭션 추적.
  - **Solana Explorer**: Solana 블록체인 탐색기로, RPC를 통해 블록 및 트랜잭션 데이터 표시.

### 트랜잭션 생성/전송 서비스
- **설명**: 트랜잭션을 생성하고 블록체인에 전송하는 서비스로, 자동화된 트랜잭션 처리에 사용.
- **대표 사례**:
  - **Alchemy Transfer**: RPC를 통해 대량 트랜잭션 전송 및 모니터링 (Polygon, Solana 지원).
  - **Infura Transactions (ITX)**: Polygon에서 트랜잭션 전송 및 가스 최적화 서비스.
  - **Fireblocks**: 기업용 자산 관리 플랫폼으로, RPC를 통해 트랜잭션 생성 및 서명 (Polygon, Solana 지원).
  - **Helius**: Solana 전용 트랜잭션 서비스로, RPC를 통해 고속 트랜잭션 처리 및 웹훅 제공.

## Python 기반 RPC 클라이언트 노드
Python은 직관적인 문법과 풍부한 라이브러리로 Solana와 Polygon RPC 클라이언트에서 널리 사용됩니다.

### Solana Python 클라이언트
- **라이브러리**: `solana-py`
- **사용 사례**: 잔액 조회, 트랜잭션 생성, 프로그램 호출, 데이터 분석.
- **예제 코드**:
  ```python
  from solana.rpc.api import Client
  from solana.publickey import PublicKey

  client = Client("https://api.devnet.solana.com")
  public_key = PublicKey("83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri")
  balance = client.get_balance(public_key)
  print(f"Balance: {balance['result']['value']} lamports")
  ```

### Polygon Python 클라이언트
- **라이브러리**: `web3.py`
- **사용 사례**: 토큰 전송, 스마트 컨트랙트 호출, 이벤트 로그 수집.
- **예제 코드**:
  ```python
  from web3 import Web3

  w3 = Web3(Web3.HTTPProvider("https://rpc-amoy.polygon.technology"))
  address = "0xYourAddressHere"
  balance = w3.eth.get_balance(address)
  print(f"Balance: {w3.from_wei(balance, 'ether')} MATIC")
  ```

## 직렬화(Serialization)와 역직렬화(Deserialization)

### Solana:
- **직렬화**: Borsh (바이너리), JSON (JSON-RPC).
- **역직렬화**: JSON 응답을 파싱 후 Borsh로 계정 데이터, 트랜잭션 변환.
- **라이브러리**: solana-py, borsh.

### Polygon:
- **직렬화**: RLP, ABI, JSON (JSON-RPC).
- **역직렬화**: JSON 응답을 파싱 후 ABI로 스마트 컨트랙트 데이터 변환.
- **라이브러리**: web3.py, rlp.

## 일반적인 RPC 보안 위협
블록체인 RPC 시스템은 다음과 같은 공통적인 보안 위협에 직면합니다:

- **DoS(서비스 거부) 공격 및 자원 고갈**: 높은 트래픽으로 노드 응답 불가.
- **잘못된 설정**: 민감한 엔드포인트 노출로 데이터 유출 또는 무단 접근.
- **무단 접근**: 손상된 RPC 제공자를 통한 데이터/자산 접근.
- **스마트 컨트랙트 취약점**: RPC를 통한 취약점 악용.
- **중앙화 위험**: 제3자 RPC 제공자 의존으로 인한 단일 실패 지점.
- **공급망 공격**: Python 클라이언트에서 악성 PyPI 패키지 설치.

## Solana RPC의 보안 위협
Solana의 RPC는 Rust 기반의 고성능 설계로, 다음과 같은 보안 위협이 존재합니다:

### DoS 공격 및 자원 고갈:
- 병렬 처리 설계는 높은 트래픽 공격에 취약.
- 무료 RPC 서비스 악용으로 자발적 DoS 가능.
- 출처: [Protecting Web3 infrastructure - Security insights from RPC providers at Breakpoint 2023 | Solana Compass](https://solanacompass.com/learn/breakpoint-23/breakpoint-2023-security-considerations-from-rpc-providers)

### 잘못된 설정:
- 민감한 엔드포인트 노출로 데이터 조회 또는 악성 트랜잭션 전송.
- 출처: [Blockchain Node Security: Safeguarding RPC and Validator Nodes - comparenodes](https://www.comparenodes.com/blog/blockhain-node-security-rpc-and-validator-nodes/)

### 논리 오류 및 경쟁 조건:
- Rust의 메모리 안전성에도 불구하고 논리 오류나 경쟁 조건으로 서비스 중단.
- 메모리 증폭 공격으로 자원 고갈.
- 출처: [Blockchain RPC Vulnerabilities: Why Memory-Safe Blockchain RPC Nodes are Not Panic-Free | CertiK Skyfall](https://medium.com/certik-skyfall/blockchain-rpc-vulnerabilities-why-memory-safe-blockchain-rpc-nodes-are-not-panic-free-9fbb990115e0)

### 중앙화 위험:
- 제3자 RPC 제공자 의존으로 단일 실패 지점, DeFi 생태계에 시스템적 위험.
- 출처: [Top Solana RPC Providers Compared [2025]](https://drpc.org/blog/top-solana-rpc-providers/)

**사례**: 2024년 8월 Solana는 중요한 취약점을 패치하여 네트워크 보안 강화 ([Solana Patches Critical Vulnerabilities and Secures the Blockchain](https://beincrypto.com/solana-dodged-critical-vulnerability/)).

## Polygon RPC의 보안 위협
Polygon의 RPC는 Go 기반의 노드와 Solidity 스마트 컨트랙트를 포함하며, 다음과 같은 보안 위협이 있습니다:

### DNS 하이재킹 및 무단 접근:
- 2022년 7월 Ankr 공공 RPC 게이트웨이 손상으로 사용자 피싱 사이트 리디렉션.
- PyPI 패키지 "set-utils"를 통한 이더리움 개인 키 탈취.
- 출처: [Breaking: Polygon Under Attack as Ankr's Public RPC Gateway is Compromised - The Layer](https://thelayer.xyz/breaking-polygon-under-attack-as-ankrs-public-rpc-gateway-is-compromised/), [This Malicious PyPI Package Stole Ethereum Private Keys via Polygon RPC Transactions](https://thehackernews.com/2025/03/this-malicious-pypi-package-stole.html)

### 잘못된 설정:
- 민감한 데이터 노출 또는 악성 트랜잭션 허용.
- 출처: [Security Tips for RPC Endpoint Users | Protect Blockchain Data](https://www.quillaudits.com/blog/web3-security/security-tips-for-rpc-endpoint-users)

### Go 기반 취약점:
- 네트워크 요청 처리 취약점, 제3자 라이브러리 취약점.
- 출처: [How to secure Ethereum JSON RPC from Vulnerabilities](https://www.zeeve.io/blog/how-to-secure-ethereum-json-rpc-from-vulnerabilities/)

### 중앙화 위험:
- 제3자 RPC 제공자 의존으로 단일 실패 지점.
- 출처: [Security operations - Polygon Knowledge Layer](https://docs.polygon.technology/innovation-design/security/operations/)

### 스마트 컨트랙트 취약점:
- Solidity 기반 컨트랙트 취약점 RPC를 통해 악용.
- 출처: [Polygon Technology - Bug Bounty Program | HackerOne](https://hackerone.com/polygon-technology)

**사례**: Polygon은 버그 바운티 프로그램과 강력한 인증, 로그 모니터링으로 보안 조치 강화 ([Security operations - Polygon Knowledge Layer](https://docs.polygon.technology/innovation-design/security/operations/)).

## 2022년 Ankr RPC 손상 및 PyPI 패키지 공격 상세 분석

### 2022년 Ankr RPC 손상 (DNS 하이재킹)
- **발생 시기**: 2022년 7월 1일
- **공격 유형**: DNS 하이재킹, 피싱
- **영향받은 대상**: Polygon (polygon-rpc.com), Fantom (rpc.ftm.tools) 사용자
- **공격 방법**:
  - 공격자가 Ankr의 DNS 제공업체(Gandi)를 속여 도메인 등록 계정 이메일을 변경.
  - 손상된 RPC 게이트웨이가 피싱 사이트(polygonapp[.]net)로 리디렉션, 시드 프레이즈 입력 유도.
- **영향**:
  - 서비스 중단 (Ambire Wallet, QuickSwap 등 디앱).
  - 잠재적 자산 도난, Ankr는 자금 손실 없다고 주장.
  - Web3 인프라 신뢰도 하락.
- **대응**:
  - DNS 계정 복구 (6시간 내).
  - 대체 RPC 제공 (https://rpc.ankr.com/polygon, https://rpc.ankr.com/fantom).
  - Polygon의 자체 RPC 및 분산형 대안 연구.
- **원인**: 중앙화된 DNS, Gandi의 취약한 인증 절차, 사회공학.
- **출처**: [Breaking: Polygon Under Attack as Ankr's Public RPC Gateway is Compromised - The Layer](https://thelayer.xyz/breaking-polygon-under-attack-as-ankrs-public-rpc-gateway-is-compromised/)

### PyPI 패키지 공격 (set-utils)
- **발생 시기**: 2025년 1월 29일 ~ 2025년 3월 초
- **공격 유형**: 공급망 공격, 개인 키 도난
- **영향받은 대상**: 이더리움 지갑 개발자, Python 기반 블록체인 애플리케이션
- **공격 방법**:
  - 악성 PyPI 패키지 set-utils가 python-utils, utils와 유사한 이름으로 배포 (1,000회 이상 다운로드).
  - 지갑 생성 함수(from_key, from_mnemonic) 수정, 개인 키를 암호화 후 Polygon RPC(rpc-amoy.polygon.technology)를 통해 유출.
- **영향**:
  - 생성된 지갑 영구 손상.
  - 블록체인 트랜잭션 유출로 탐지 어려움.
  - PyPI 및 Web3 개발자 신뢰 손상.
- **대응**:
  - Socket Research Team의 보고로 패키지 삭제.
  - PyPI의 공급망 보안 강화 권고.
  - RPC 오용 방지를 위한 모니터링 필요.
- **원인**: PyPI의 오픈소스 특성, RPC 오용, 부족한 패키지 검증.
- **출처**: [This Malicious PyPI Package Stole Ethereum Private Keys via Polygon RPC Transactions](https://thehackernews.com/2025/03/this-malicious-pypi-package-stole.html)

## Go/Rust 언어 및 JSON-RPC 라이브러리 관련 이슈
Go와 Rust 언어 또는 JSON-RPC 라이브러리의 문제로 RPC에서 이슈가 발생한 사례는 다음과 같습니다.

### Rust 기반 RPC 이슈
- **취약점**: 논리 오류, 자원 고갈, DoS 공격 가능성.
- **사례**: 2024년 3월 Aptos, StarCoin, Sui의 Rust 기반 RPC 노드 취약점 (서비스 중단, 메모리 증폭 공격).
- **원인**: 경쟁 조건, 무한 루프 등 논리적 설계 오류.
- **출처**: [Blockchain RPC Vulnerabilities: Why Memory-Safe Blockchain RPC Nodes are Not Panic-Free | CertiK Skyfall](https://medium.com/certik-skyfall/blockchain-rpc-vulnerabilities-why-memory-safe-blockchain-rpc-nodes-are-not-panic-free-9fbb990115e0)

### Go 기반 RPC 이슈
- **취약점**: 자원 소진 공격, 인프라 설정 문제.
- **사례**: 
  - 2016년 Ethereum go-ethereum의 RPC 인터페이스 자원 소진 공격 가능성.
  - 2022년 Polygon Ankr RPC 손상 (DNS 하이잭, 언어 자체 문제 아님).
- **원인**: 네트워크 요청 처리 취약점, 잘못된 설정.
- **출처**: [RPC vulnerable? · Issue #3298 · ethereum/go-ethereum](https://github.com/ethereum/go-ethereum/issues/3298)

### JSON-RPC 라이브러리 취약점
- **취약점**: JSON 파싱 오류, 인증 부족, CSRF.
- **사례**:
  - Monero JSON 파서의 스택 오버플로우로 임의 코드 실행 가능성.
  - CryptoNote 지갑의 인증 부족으로 무단 접근 및 CSRF.
- **원인**: 파싱 로직 또는 인증 설정 부족.
- **출처**: [HackProof | Web3 Bug Bounty platform for Crypto Projects](https://hackenproof.com/vulnerabilities/5bd6b03b75fa741539568caf), [Unauthenticated JSON-RPC API allows takeover of CryptoNote RPC wallets · Issue #172 · cryptonotefoundation/cryptonote](https://github.com/cryptonotefoundation/cryptonote/issues/172)

## Python 클라이언트의 보안 고려사항
Python 기반 RPC 클라이언트는 직렬화/역직렬화 과정에서 다음과 같은 보안 위협에 노출됩니다:

- **PyPI 공급망 공격**: set-utils 패키지로 개인 키 유출.
- **JSON 파싱 취약점**: 역직렬화 시 스택 오버플로우.
- **RPC 엔드포인트 손상**: Ankr 사건처럼 손상된 엔드포인트로 악성 데이터 수신.
- **데이터 유출**: 직렬화된 데이터가 MITM 공격으로 노출.

**대응**:
- 패키지 검증, Trusted Publishers 사용.
- 신뢰할 수 있는 RPC 제공자(Alchemy, QuickNode) 및 HTTPS 사용.
- 입력 검증, 환경 격리(Docker), 최신 라이브러리 유지.

## 비교 표

| 특징 | Solana RPC | Polygon RPC |
|------|------------|-------------|
| 주요 언어 | Rust (프로그램 및 노드), JavaScript (클라이언트) | Go (노드), Solidity (스마트 컨트랙트), JavaScript (클라이언트) |
| 구조적 특징 | 병렬 처리, 저지연 설계, JSON-RPC 2.0 | EVM 호환, 레이어 2, Ethereum과의 상호작용, JSON-RPC |
| 주요 보안 위협 | DoS 공격, 논리 오류, 경쟁 조건, 자원 고갈, 중앙화 위험 | DNS 하이재킹, 무단 접근, Go 기반 취약점, 중앙화 위험, 스마트 컨트랙트 취약점 |
| 언어 관련 이슈 | 논리 오류, 자원 고갈 (Aptos, Sui 사례) | 자원 소진 공격 (go-ethereum), 인프라 설정 문제 (Ankr 사건) |
| JSON-RPC 이슈 | 파싱 오류, 인증 부족 가능성 | 파싱 오류, 인증 부족, CSRF (Monero, CryptoNote 사례) |
| 사례 | 2024년 취약점 패치, 자원 고갈 공격 | 2022년 Ankr RPC 손상, PyPI 패키지 공격 |

## 결론 및 권장 사항
Solana와 Polygon의 RPC 시스템은 Rust와 Go 언어를 기반으로 고성능과 안정성을 제공하지만, DoS 공격, DNS 하이재킹, 공급망 공격 등 다양한 보안 위협에 노출됩니다. Python 기반 클라이언트는 직렬화/역직렬화 과정에서 PyPI 패키지 공격과 같은 위협에 취약하며, 대표적인 애플리케이션(MetaMask, Aave, Dune Analytics 등)은 RPC의 안정성에 크게 의존합니다. 언어 및 JSON-RPC 라이브러리 자체의 문제는 논리 오류, 자원 관리, 파싱 취약점으로 나타나지만, 이는 구현과 설정에 더 크게 좌우됩니다.

### 권장 사항:
- **신뢰할 수 있는 RPC 제공자 사용**: Alchemy, QuickNode, Ankr 등 검증된 제공자 활용.
- **자체 RPC 노드 운영**: 중앙화 위험을 줄이기 위해 자체 노드 설정.
- **강력한 인증 및 보안 설정**: API 키, IP 화이트리스트, HTTPS, 2FA 적용.
- **패키지 및 코드 검증**: PyPI 패키지 설치 전 코드 검토, Trusted Publishers 사용.
- **정기 보안 감사**: 코드 검토, 취약점 스캔, 최신 소프트웨어 유지.
- **사용자 교육**: 피싱, 시드 프레이즈 보호, 공급망 공격 인식 제고.

이러한 조치를 통해 Solana와 Polygon RPC 시스템 및 클라이언트 애플리케이션의 보안을 강화할 수 있습니다.

## 전체 인용 링크

- [Blockchain RPC Vulnerabilities: Why Memory-Safe Blockchain RPC Nodes are Not Panic-Free | CertiK Skyfall](https://medium.com/certik-skyfall/blockchain-rpc-vulnerabilities-why-memory-safe-blockchain-rpc-nodes-are-not-panic-free-9fbb990115e0)
- [RPC vulnerable? · Issue #3298 · ethereum/go-ethereum](https://github.com/ethereum/go-ethereum/issues/3298)
- [Breaking: Polygon Under Attack as Ankr's Public RPC Gateway is Compromised - The Layer](https://thelayer.xyz/breaking-polygon-under-attack-as-ankrs-public-rpc-gateway-is-compromised/)
- [This Malicious PyPI Package Stole Ethereum Private Keys via Polygon RPC Transactions](https://thehackernews.com/2025/03/this-malicious-pypi-package-stole.html)
- [Protecting Web3 infrastructure - Security insights from RPC providers at Breakpoint 2023 | Solana Compass](https://solanacompass.com/learn/breakpoint-23/breakpoint-2023-security-considerations-from-rpc-providers)
- [Solana Patches Critical Vulnerabilities and Secures the Blockchain](https://beincrypto.com/solana-dodged-critical-vulnerability/)
- [Blockchain Node Security: Safeguarding RPC and Validator Nodes - comparenodes](https://www.comparenodes.com/blog/blockhain-node-security-rpc-and-validator-nodes/)
- [Security Tips for RPC Endpoint Users | Protect Blockchain Data](https://www.quillaudits.com/blog/web3-security/security-tips-for-rpc-endpoint-users)
- [Security operations - Polygon Knowledge Layer](https://docs.polygon.technology/innovation-design/security/operations/)
- [Polygon Technology - Bug Bounty Program | HackerOne](https://hackerone.com/polygon-technology)
- [HackProof | Web3 Bug Bounty platform for Crypto Projects](https://hackenproof.com/vulnerabilities/5bd6b03b75fa741539568caf)
- [Unauthenticated JSON-RPC API allows takeover of CryptoNote RPC wallets · Issue #172 · cryptonotefoundation/cryptonote](https://github.com/cryptonotefoundation/cryptonote/issues/172)
- [How to secure Ethereum JSON RPC from Vulnerabilities](https://www.zeeve.io/blog/how-to-secure-ethereum-json-rpc-from-vulnerabilities/)
- [Learn how the Solana blockchain works | Solana](https://solana.com/docs)
- [Top Solana RPC Providers Compared [2025]](https://drpc.org/blog/top-solana-rpc-providers/)
- [Breaking: Polygon, Major Blockchains Hit With Network Attack](https://coingape.com/breaking-polygon-major-blockchains-hit-with-network-attack/)
- [Blockchain Security: Common Issues & Vulnerabilities | NordLayer](https://nordlayer.com/blog/blockchain-security-issues/)
- [RPC endpoints | Polygon PoS | Polygon Technology | Documentation](https://docs.polygon.technology/pos/reference/rpc-endpoints/)
