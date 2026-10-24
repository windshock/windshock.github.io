---
title: "PHP 메모리 안전성 연구 노트 (2016–2026): 발견자, 근본 원인, 패치와 검증 수준"
date: 2026-10-24
draft: false
featured: false
translationKey: "php-memory-safety-research-notes"
tags: ["PHP", "Memory Safety", "PHP2Shell", "Research Notes", "Vulnerability Research"]
categories: ["취약점 연구", "연구 자료"]
description: "2016~2026년 PHP 메모리 안전성 관련 원 연구자 글, 공식 이슈, 코어 개발자 패치 논의와 재현 증거를 정리한 출처 기반 연구 노트. 트래커 상태와 실제 수정·악용 가능성을 구분한다."
---

이 문서는 [「PHP 메모리 안전성의 10년」](/ko/post/2026-10-24-php-memory-safety-decade/)에 사용된 원문 자료와 검증 수준을 추적하는 연구 노트다. **기여자들의 선행 연구를 정확히 인정하고, 공개된 사례에서 공통 패턴을 추출하되, 제보·재현·수정·악용 가능성을 섞지 않는 것**이 목적이다. 자료 확인 기준일은 **2026년 10월 24일**이다. 일부 트래커·PR 상태는 이후 바뀔 수 있다.

원본 조사는 2016~2026년 문헌과 실제 취약점 발견자의 기술 글, PHP 공식 소스·보안 권고·버그 트래커, PHP Foundation과 Quarkslab 자료, php-internals, FlowFusion 논문을 대조했다. 상세 기록 58건은 [windshock/php2shell의 역사적 결함 코퍼스](https://github.com/windshock/php2shell/blob/main/docs/historical-corpus.md)에 연결된다. **58개 기록은 '확정된 미수정 취약점 58개'가 아니며**, 아래 목록 역시 전체 PHP 취약점의 통계적 표본이 아니다.

## 사용한 증거 등급과 용어

| 등급 | 의미 | 독자가 확인할 자료 |
|---|---|---|
| Reported | 누군가 문제를 신고하거나 연구 글을 공개함 | 날짜·원문 URL·제보자 |
| Reached | 관련 코드 또는 상태 지점에 실행이 도달함 | coverage·GDB breakpoint·event |
| Triggered | 해당 지점의 실패 조건이나 불변조건 위반이 발생함 | 상태 전이·실패 지점 기록 |
| Detected | ASan·MSan·UBSan·Valgrind·assert 등에서 오류를 검출함 | 진단 로그·PID·빌드 설정 |
| Attackability assessed | 실제 공격 전제와 가능한 영향 범위를 분석함 | 원 보고서·공식 권고·SAPI/환경 |
| Patch verified | 동일한 경로에서 수정 전후 차단점을 실증함 | 정확한 수정 커밋·릴리스·양쪽 실행 기록 |

다음 구분이 특히 중요하다. GitHub 이슈가 **Open**이라는 것은 최신 지원 버전에서 취약점이 재현된다는 증거가 아니고, **Closed**도 패치가 모든 분기에 반영됐다는 증거는 아니다. 원문에 ASan 로그가 첨부됐다고 해서 모든 PHP 설정에서 원격 RCE가 된다는 뜻도 아니다. 경우에 따라 공격자가 서버에서 PHP 코드를 직접 실행할 수 있어야 하거나, 특정 웹서버 설정이나 확장이 필요하다.

## 대표 연구·발견 기록: 2016~2026

| 시기 | 원문 / 공로 | 기술적으로 확인할 주제 | 해석과 주의 |
|---|---|---|---|
| 2016 | [#72530](https://bugs.php.net/bug.php?id=72530) · Taoguang Chen와 후속 PHP 개발자 분석 | GC 도중 소멸자 재진입·객체 수명 | 당시 결함과 후속 수정 경위를 분리 |
| 2016 | [#73092](https://bugs.php.net/bug.php?id=73092) · [Check Point 연구](https://blog.checkpoint.com/research/check-point-discovers-three-zero-day-vulnerabilities-web-programming-language-php-7/) | PHP 7 unserialize·HashTable 참조 | 연구진의 영향 평가와 공식 수정 버전 확인 |
| 2016 | [#73147](https://bugs.php.net/bug.php?id=73147) · Taoguang Chen | unserialize·magic method 재진입 | CVE/수정 PR과 일대일 관계 확인 |
| 2017 | [#74103](https://bugs.php.net/bug.php?id=74103) · Chris Young | unserialize UAF와 계측 환경 | USE_ZEND_ALLOC=0·ASan/MSan 조건 |
| 2018 | [#76167](https://bugs.php.net/bug.php?id=76167) | mbstring의 요청 간 stale pointer | 동일 워커 GDB watchpoint·수정 전후 |
| 2018 | [#76846](https://bugs.php.net/bug.php?id=76846) · Nikita Popov 등 후속 원인 분석 | OOM 이후 불완전한 object-store 크기 | 실패 원자성의 고정 양성 대조군 |
| 2019 | [CVE-2019-11043](https://bugs.php.net/bug.php?id=78599) · [neex](https://github.com/neex/phuip-fpizdam) · [Orange Tsai 분석](https://blog.orange.tw/posts/2019-10-an-analysis-and-thought-about-recently/) | FPM 경로 계산과 메모리 손상 | 공격 조건에는 nginx/FPM 설정이 포함됨 |
| 2019 | [#78793](https://bugs.php.net/bug.php?id=78793) · Nikita Popov | EXIF 및 MSan 기반 발견 | ASan 음성만으로 수정 성공 판정 불가 |
| 2019 | [#78876](https://bugs.php.net/bug.php?id=78876) | multipart/OOM의 요청 정리 실패 | 파일 잔류·가용성 영향과 메모리 오류 구분 |
| 2020 | [#79760](https://bugs.php.net/bug.php?id=79760) · Nikita Popov | OOM 중 GC와 refcount 수명 | 공개 신고가 현재 RCE 확정은 아님 |
| 2021 | [PR #6903](https://github.com/php/php-src/pull/6903) · Nikita Popov | 지연 error handler·opcode 안전 지점 | 실험적 PR, 구조적 해결의 난점 |
| 2022 | [#10026](https://github.com/php/php-src/issues/10026) | SOAP 오류를 잡은 뒤 GC protection 잔류 | 불변조건 이상 ≠ 메모리 손상 입증 |
| 2023 | [#12073](https://github.com/php/php-src/issues/12073) | OOM 시 부분 초기화 closure 정리 | 수정 전후 버전과 fault site 고정 |
| 2024 | [#14083](https://github.com/php/php-src/issues/14083) | PHP allocator 하드닝 논의 | 설계 제안이지 CVE 아님 |
| 2024 | [#16726](https://github.com/php/php-src/issues/16726) | error-handler 재진입 UAF·OSS-Fuzz/ASan | #20018 부류의 한 사례로 분류 |
| 2024~25 | [CVE-2024-11235 GHSA](https://github.com/php/php-src/security/advisories/GHSA-rwp7-7vc6-8477) | request shutdown에서의 UAF | 공식 수정 기준선 확보 |
| 2024~25 | [Quarkslab/PHP Foundation 감사 결과](https://thephp.foundation/blog/2025/04/10/php-core-security-audit-results/) | PHP 코어 전반 정적·동적 점검 | 감사 finding과 그 후 OOM 위험 신호 분리 |
| 2025 | [FlowFusion](https://www.usenix.org/conference/usenixsecurity25/presentation/jiang-yuancheng) · [공개 코드](https://github.com/php/flowfusion) | PHP PHPT의 dataflow 기반 생성 | 연구진 보고 성과와 내 랩 실험을 구분 |
| 2025 | [#20018](https://github.com/php/php-src/issues/20018) | 오류 핸들러 재진입의 통합 논의 | 합쳐진 이슈 수는 고유 root cause 수가 아님 |
| 2026 | [#22061](https://github.com/php/php-src/issues/22061) · [PR #22710](https://github.com/php/php-src/pull/22710) | destructor+bailout 중 HashTable 정리 | PR 제안과 실제 병합 여부 분리 |
| 2026 | [Calif PHP UAF](https://calif.io/research/php-uaf) | Serializable 재진입 연구 | 원격 적용에는 애플리케이션 전제조건 |
| 2026 | [#24361](https://github.com/php/php-src/issues/24361) · [SOAP PR #24366](https://github.com/php/php-src/pull/24366) | Opcache의 caught bailout·GC 보호 | PR #24366은 SOAP 경로; 2026-10-24 미병합 |
| 2026 | [PHP2Shell 공식 보안 권고 109618](https://github.com/php/php-src/security/advisories/GHSA-w8hw-w9fx-j79w), [109619](https://github.com/php/php-src/security/advisories/GHSA-6wmf-4rv5-p3rp) · [Wiz 분석](https://www.wiz.io/blog/php2shell-php-rce) | OOM/bailout·요청 간 메모리 수명 | 공식 확인 범위와 외부 연구진 주장을 분리 |

최근 신고된 [#24481](https://github.com/php/php-src/issues/24481)·[#24532](https://github.com/php/php-src/issues/24532)의 직렬화 해제 재진입/정리 사례, [#24492](https://github.com/php/php-src/issues/24492)의 hard-memory-limit 종료 회귀는 2026년 10월 24일 기준 검토할 만한 **triage 자료**다. 신고와 PoC 주장만으로 최신 지원 버전의 확정 RCE나 서로 독립된 고유 취약점이라고 판단하지 않는다.

## 연구자와 유지보수자: 발견 외에 기억할 기여

공로를 정확히 기록하기 위해 **최초 발견 / 독립 분석 / 코드 수정 / 감사 / 퍼징 연구 / 책임 있는 공개 / 후원·조정**을 구분한다. 이 명단은 선별된 자료의 연구자 소개이지 PHP의 모든 기여자를 망라하지 않는다.

| 분야 | 이름 또는 조직 | 확인 가능한 공로와 원문 |
|---|---|---|
| 초기 메모리 안전성 연구 | **Taoguang Chen** | [GC/destructor 관련 공개 신고 #72530](https://bugs.php.net/bug.php?id=72530) 등 |
| PHP 7 직렬화 연구 | **Yannay Livneh 및 Check Point 팀** | [2016년 PHP 7 취약점 연구](https://blog.checkpoint.com/research/check-point-discovers-three-zero-day-vulnerabilities-web-programming-language-php-7/) |
| 독립 버그 신고 | **Chris Young** | [PHP #74103](https://bugs.php.net/bug.php?id=74103) |
| PHP-FPM 최초 연구 | **Emil Lerner(neex)** | [CVE-2019-11043 연구·재현 자료](https://github.com/neex/phuip-fpizdam) |
| PHP-FPM 별도 해설 | **Orange Tsai** | [후속 PHP-FPM 기술 분석](https://blog.orange.tw/posts/2019-10-an-analysis-and-thought-about-recently/) — 최초 발견과 별도 |
| PHP 메모리 할당기 | **Charles Fol(cfreal)** | [Black Alps 2022 PHP allocator 연구](https://blackalps.ch/ba-22/talk/generic-remote-exploit-techniques-for-the-php-allocator-and-0days) |
| 코어 설계와 버그 수정 | **Nikita Popov** | [오류 핸들러 지연 실행 시도 #6903](https://github.com/php/php-src/pull/6903) 및 엔진 기여 |
| 2024 코어 감사 PHP 측 기여자 | **Jakub Zelenka, Arnaud Le Blanc, Niels Dossche, Ilija Tovilo, Stas Malyshev, Dmitry Stogov, Derick Rethans, Roman Pronskiy** | [PHP Foundation의 공식 2024 감사 결과 감사 명단](https://thephp.foundation/blog/2025/04/10/php-core-security-audit-results/) — 전원을 같은 2026년 패치 작성자로 표시하지 않음 |
| 2024 Quarkslab 감사 | **Angèle Bossuat, Julio Loayza Meneses, Mihail Kirov, Sébastien Rolland, Ramtine Tofighi Shirazi** | [Quarkslab 연구 원문 공동 저자 5명](https://blog.quarkslab.com/security-audit-of-php-src.html) |
| 2025 FlowFusion | **Yuancheng Jiang, Chuqi Zhang, Bonan Ruan, Jiahao Liu, Manuel Rigger, Roland H. C. Yap, Zhenkai Liang** | [USENIX Security 논문 공동 저자 7명](https://www.usenix.org/conference/usenixsecurity25/presentation/jiang-yuancheng) |
| 2026 Calif / PHP2Shell | **Ryan A** | [PHP Foundation의 8월 11일 신고 경위 및 공식 감사](https://thephp.foundation/blog/2026/10/21/todays-php-security-release-and-how-were-strengthening-php-security/) |
| 2026 OpenAI Codex Security | **Amy Burnett** | [PHP Foundation이 특별히 언급한 연구·공개 기여](https://thephp.foundation/blog/2026/10/21/todays-php-security-release-and-how-were-strengthening-php-security/) — 개인 최초 발견 또는 패치 작성자로 단정하지 않음 |
| 2026 Wiz Research | **Sagi Tzadik, Shir Tamari, Nir Ohfeld, Tomer Schwartz** | [Wiz PHP2Shell 연구 글 저자 4명](https://www.wiz.io/blog/php2shell-php-rce) |
| 2026 보안 운영·하드닝 | **Volker Dusch, Alexandre Daubois, Daniel Scherzer** 및 PHP 보안팀 | [PHP Foundation의 조직·대응 경위](https://thephp.foundation/blog/2026/10/21/todays-php-security-release-and-how-were-strengthening-php-security/) — 연구자 최초 발견과는 다른 기여 |
| 감사의 조직·지원 | **OSTIF, Sovereign Tech Agency** | [PHP Foundation 공식 설명](https://thephp.foundation/blog/2025/04/10/php-core-security-audit-results/). OSTIF는 **Amir Montazery, Derek Zimmer, Helen Woeste**, STA는 **Abigail Garner**에게도 감사 |
| 긴급 패치 배포·연구 지원 | **PHP 릴리스 관리자, 패키지/LTS 유지보수자, 후원자, Alpha-Omega, OpenAI, Anthropic** 등 | [PHP Foundation의 2026년 감사문](https://thephp.foundation/blog/2026/10/21/todays-php-security-release-and-how-were-strengthening-php-security/) — 후원·도구 제공을 최초 취약점 발견 공로로 바꾸지 않음 |

[Stefan Esser의 Hardened-PHP·Suhosin 연구](https://www.blackhat.com/presentations/bh-usa-09/ESSER/BHUSA09-Esser-PostExploitationPHP-SLIDES.pdf)처럼 **2016년 이전의 PHP 하드닝 연구**도 이 연대기의 중요한 배경이다. 다만 2016~2026년의 사건인 것처럼 임의의 연도를 붙이지 않는다.

2026년에는 Calif의 8월 11일 신고, OpenAI의 독립 보고와 추가 분석, Wiz의 8월 24일 보고처럼 연구 경위가 다르다. 공로를 한 사람이나 하나의 회사에 독점적으로 귀속시키지 않는다. 이 목록에 이름이 없더라도 기여가 작다는 뜻은 아니며, 어느 연구자·유지보수자가 이 블로그를 공식적으로 승인한다는 의미도 아니다.

## Quarkslab 감사, 2026년 수정 경위, 그 사이의 차이

[2025년 PHP Foundation 발표](https://thephp.foundation/blog/2025/04/10/php-core-security-audit-results/)는 Quarkslab의 PHP 코어 감사를 공개했다. [OSTIF 발표](https://ostif.org/php-audit-complete/) 등에서 심각도 요약 수치의 표기가 다를 수 있으므로, 단일 severity 분포를 확정해 다시 인용하기보다 **원 감사 보고서의 finding별 번호와 최종 판본**을 기준으로 재집계하는 것이 맞다.

[2026년 10월 PHP Foundation 회고](https://thephp.foundation/blog/2026/10/21/todays-php-security-release-and-how-were-strengthening-php-security/)는 OOM 관련 위험 신호를 인지한 뒤 근본 수정까지의 과정에서 호환성, 확장, 가용성, 의사결정의 어려움이 있었다고 밝혔다. 따라서 감사에서 바로 최종 PHP2Shell 익스플로잇이 발견됐다고 서술하거나, 당시 공개되지 않았던 코어 문제를 하나의 미수정 finding으로 단정해서는 안 된다.

## 어떤 실험으로 계보를 검증할 것인가

역사적 결함 코퍼스를 연구 도구로 바꾸기 위해서는 기록별로 다음 조건을 채워야 한다.

- **출처와 수정 계보:** original issue/논문, 신고자, 패치 PR·커밋, 어떤 release에 포함됐는지, 영향 버전.
- **환경:** 재현에 필요한 PHP 버전, 확장, SAPI, 빌드·할당기 조건, 실행 중인 워커 동일성.
- **관측:** ASan, MSan, GDB/watchpoint, Valgrind, PHP GC 불변조건처럼 사례별로 적합한 오라클과 그 실행 성공 여부.
- **증거 수준:** 도달, 오류 유발, 탐지, 공격 전제 분석, 수정 차단의 독립 검증. 하나라도 실패하면 그 단계의 증거를 주장하지 않는다.
- **독립성:** 이미 연구자가 알고 입력 생성기에 반영한 사례는 공개 회귀 세트로 분류하고, 도구 동결 후 별도 평가자가 선정한 사례만 제한적인 blind hold-out으로 다룬다.

예를 들어 [#78793](https://bugs.php.net/bug.php?id=78793)는 MSan 대조, [#76167](https://bugs.php.net/bug.php?id=76167)은 워커 수명 GDB 대조, [#10026](https://github.com/php/php-src/issues/10026)은 GC 보호 상태 대조, [#76846](https://bugs.php.net/bug.php?id=76846)과 [#12073](https://github.com/php/php-src/issues/12073)은 failure atomicity의 수정 전후 대조군이 된다. **어떤 오라클을 실행하지 않았다는 사실을 음성 결과로 해석해서는 안 된다.**

평가 방법론에는 [Magma](https://doi.org/10.1145/3428334)의 reached/triggered/detected 분리, [StateAFL](https://link.springer.com/article/10.1007/s10664-022-10233-3)의 서버 내부 상태 계측, [FuzzBench](https://google.github.io/fuzzbench/)의 반복 실험·비교 조건 통제가 참고가 된다. 이 자료들은 PHP2Shell 취약점을 별도로 검증해 준 보고서가 아니라, **검증 방법을 설계할 때 참고한 선행 연구**다.

## 공개 상태·한계·관련 자료

이 노트는 원 연구자와 PHP 코어 개발자의 공개 자료를 정리한 **출처 기반 연구 목록**이다. 58개 원기록 전체를 모든 버전에서 직접 재현했다는 주장이 아니며, 연구자 개인이 특정 exploitability 평가를 주장한 것과 공식 보안 권고에서 확인한 범위를 동일시하지 않는다. 재현 실험의 일부는 기존 PHP2Shell 분석 랩의 기록에 근거하며, 이 글을 작성하면서 별도의 PHP-FPM/ASan 전수 실행을 하지는 않았다.

[대표 글](/ko/post/2026-10-24-php-memory-safety-decade/) · [php2shell 저장소](https://github.com/windshock/php2shell) · [Issue #2 퍼징](https://github.com/windshock/php2shell/issues/2) · [#3 CoreGuard](https://github.com/windshock/php2shell/issues/3) · [#4 코퍼스](https://github.com/windshock/php2shell/issues/4) · [#5 판정 신뢰성](https://github.com/windshock/php2shell/issues/5)

미공개로 확인되는 새로운 결함은 상세 공격 절차를 블로그에 쓰기보다 PHP 보안팀에 먼저 책임 신고한다. **연구자·개발자의 기여나 출처에 대한 정정은 언제든 환영한다.**
