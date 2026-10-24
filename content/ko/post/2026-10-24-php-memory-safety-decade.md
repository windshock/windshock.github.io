---
title: "PHP 메모리 안전성의 10년: 왜 같은 실패는 반복되는가?"
date: 2026-10-24
draft: false
featured: true
translationKey: "php-memory-safety-decade"
tags: ["Mind", "PHP", "Memory Safety", "PHP2Shell", "Vulnerability Research"]
categories: ["취약점 연구", "소프트웨어 보안"]
description: "2016~2026년 PHP 메모리 안전성 연구를 원 발견자와 코어 개발자의 공개 기록으로 되짚는다. 재진입, 실패 원자성, bailout 복구, 요청 간 수명이라는 반복 패턴과 PHP2Shell 연구의 한계를 살펴본다."
image: "/images/post/php-memory-safety-decade/research-timeline-acknowledgments-en.svg"
cover:
  image: "/images/post/php-memory-safety-decade/research-timeline-acknowledgments-en.svg"
  alt: "PHP 메모리 안전성 연구의 2016~2026년 연대표, 주요 연구자·기여자와 감사문"
---

PHP의 메모리 안전성 문제를 지난 10년의 공개 기록으로 따라가 보면, 서로 다른 취약점들이 놀랄 만큼 비슷한 질문으로 돌아온다. **사용자 코드가 다시 실행되거나, 메모리 할당이 실패하거나, 요청이 끝났을 때, PHP 엔진은 자신이 관리하던 상태를 여전히 일관되게 유지할 수 있는가?** 이 글은 이 질문을 밝히는 데 기여한 취약점 발견자와 PHP 코어 개발자들의 연구를 돌아보고, 그들에게 감사를 전하기 위한 기술적 회고다.

이 글에 등장하는 취약점의 최초 발견을 내가 했다는 의미는 아니다. 원 연구자들이 공개한 버그 리포트·코드·논문·패치 논의를 서로 비교하고, 개인 연구 저장소 [php2shell](https://github.com/windshock/php2shell)에서 독립적으로 확인한 사실과 앞으로 검증해야 할 가설을 구분하려는 시도다. 공개 자료 조사 기준일은 **2026년 10월 24일**이다.

## 2016년의 직렬화와 GC에서 시작된 질문

2016년 [Taoguang Chen이 보고한 PHP bug #72530](https://bugs.php.net/bug.php?id=72530)은 소멸자와 순환 참조를 처리하는 도중 객체의 수명이 예상과 달라질 수 있다는 문제를 보여준다. 당시의 재현 입력과 개발자들의 논의를 읽으면, 문제가 단순히 unserialize라는 함수 하나에 있지 않다는 점이 드러난다. GC가 객체와 참조를 정리하는 과정에서 다시 사용자 코드가 실행되면, 정리 중이던 자료구조가 호출 전과 같은 상태라고 가정할 수 없다.

비슷한 시기 [Yannay Livneh와 Check Point 연구진의 PHP 7 분석](https://blog.checkpoint.com/research/check-point-discovers-three-zero-day-vulnerabilities-web-programming-language-php-7/)은 직렬화 해제 중 참조와 내부 자료구조가 어떻게 얽히는지 보여주었다. 발견과 패치, 당시의 공격 가능성 평가까지 공개된 자료가 오늘날에도 유용한 이유는, 취약한 바이트열 자체보다 **엔진 내부의 소유권과 재진입 규칙**을 검증할 출발점을 남겼기 때문이다.

그 후 PHP-FPM에서 [Emil Lerner(neex)가 발견한 CVE-2019-11043](https://github.com/neex/phuip-fpizdam)과 [Orange Tsai의 기술적 분석](https://blog.orange.tw/posts/2019-10-an-analysis-and-thought-about-recently/)은 다른 교훈을 남겼다. PHP 엔진의 메모리 오류가 실제 웹 환경의 원격 공격으로 이어질 수 있지만, 그 판단에는 nginx와 PHP-FPM의 구체적인 설정과 입력 경로가 포함되어야 한다. PHP-FPM을 사용한다는 사실만으로 동일한 공격 전제가 성립하는 것은 아니다.

## 함수 이름은 달라도 반복된 네 가지 실패 패턴

조사한 사례를 하나의 취약점으로 묶을 수는 없다. 다만 그 안에서 반복적으로 검증할 만한 **네 가지 불변조건**을 도출할 수 있다.

| 실패 패턴 | 엔진에 물어야 할 질문 | 공개 사례 |
| --- | --- | --- |
| **실패 원자성 (failure atomicity)** | 할당 실패나 비정상 종료 직전에도 객체·배열의 공개 상태는 완전한가? | [#76846](https://bugs.php.net/bug.php?id=76846), [#12073](https://github.com/php/php-src/issues/12073) |
| **재진입 안전성 (re-entrancy safety)** | 소멸자·오류 핸들러·콜백이 현재 자료구조를 다시 수정해도 안전한가? | [#72530](https://bugs.php.net/bug.php?id=72530), [#16726](https://github.com/php/php-src/issues/16726), [#20018](https://github.com/php/php-src/issues/20018) |
| **bailout 이후 복구** | 예외적인 엔진 중단을 잡고 실행을 계속할 때 GC 및 엔진 상태는 복구되는가? | [#79760](https://bugs.php.net/bug.php?id=79760), [#10026](https://github.com/php/php-src/issues/10026), [#24361](https://github.com/php/php-src/issues/24361) |
| **요청 간 소유권** | 요청 A에서 해제된 메모리를 같은 워커의 요청 B가 다시 참조하지 않는가? | [#76167](https://bugs.php.net/bug.php?id=76167), [CVE-2026-109619](https://github.com/php/php-src/security/advisories/GHSA-6wmf-4rv5-p3rp) |

첫 번째 사례에서는 실패 가능한 연산이 끝나기 전에 자료구조의 크기나 객체 존재 여부가 외부에 공개되는 문제가 나타난다. 2018년 [#76846](https://bugs.php.net/bug.php?id=76846)과 2023년 [#12073](https://github.com/php/php-src/issues/12073)은 그 구체적인 위치와 후속 정리 동작이 다르지만, **부분적으로 완성된 상태를 정리 루틴이 완전한 상태로 취급하면 안 된다**는 질문을 공유한다.

두 번째와 세 번째 패턴은 더 근본적인 실행 의미론의 문제다. [Nikita Popov의 delayed error-handler 실험 PR #6903](https://github.com/php/php-src/pull/6903)과 [PHP의 후속 통합 논의 #20018](https://github.com/php/php-src/issues/20018)은 오류 핸들러가 opcode 실행 중 자료구조를 바꾸는 상황을 개별 버그의 집합이 아니라 설계 문제로 다룬다. [SOAP #10026](https://github.com/php/php-src/issues/10026)과 [Opcache #24361](https://github.com/php/php-src/issues/24361)은 오류를 처리하고 계속 실행한다는 사실이 곧 GC 상태 복구를 뜻하지 않음을 보여준다.

네 번째 패턴은 프로세스보다 짧은 수명의 저장소와 워커보다 오래 지속되는 상태가 만나는 지점이다. [2018년 mbstring 버그 #76167](https://bugs.php.net/bug.php?id=76167)의 요청 경계 포인터 문제와 [2026년 PHP2Shell의 공식 보안 권고](https://github.com/php/php-src/security/advisories/GHSA-6wmf-4rv5-p3rp)는 서로 다른 결함이지만, 둘 모두 요청 수명을 추적하는 도구가 왜 필요한지 설명한다.

**이것은 네 종류의 결함만 존재한다는 주장도, 하나의 수정으로 모두 예방할 수 있다는 주장도 아니다.** 서로 다른 결함을 반증 가능한 연구 질문으로 연결하기 위한 분류다.

## PHP 개발자들은 무엇을 고민했는가

오래된 문제가 다시 등장했다는 이유만으로 개발자들이 그 위험을 모르거나 무시했다고 해석하면 중요한 설계 맥락을 놓친다. 오류 핸들러를 나중에 실행하도록 바꾸면 실행 순서, JIT, 확장 모듈 및 기존 PHP 코드의 동작이 영향을 받을 수 있다. GC 보호를 일괄 해제하는 방식 역시 실제 OOM·fatal 상황에서 안전하다는 보장이 없다.

[PHP #10026](https://github.com/php/php-src/issues/10026)의 논의와 [SOAP 후속 PR #24366](https://github.com/php/php-src/pull/24366)은 그 갈등을 드러낸다. 핵심은 보호 상태를 무조건 원상복구하는 것이 아니라, 어떤 오류 경로에서는 bailout을 피하고 예외 또는 반환값으로 처리를 마칠 수 있는지 검토하는 데 있다. 이 PR은 조사 기준일에 **열린 상태이며 병합된 수정으로 간주하지 않는다.**

[2025년 PHP Foundation의 Quarkslab 감사 공개](https://thephp.foundation/blog/2025/04/10/php-core-security-audit-results/)와 [2026년 10월 보안 대응 회고](https://thephp.foundation/blog/2026/10/21/todays-php-security-release-and-how-were-strengthening-php-security/) 또한 기술적 수정과 의사결정·호환성·서비스 장애 위험이 별개의 과제임을 보여준다. 감사를 통해 보고된 finding, 감사 후 수정 과정에서 포착된 위험 신호, 나중에 공식화된 CVE를 모두 같은 사건으로 세어서는 안 된다.

## 연구 방법도 달라졌다

초기의 개별 재현 코드와 디버깅은 여전히 중요하다. 하지만 [Quarkslab의 2024년 코어 감사](https://thephp.foundation/blog/2025/04/10/php-core-security-audit-results/)는 정적·동적 검토와 퍼징을 결합했고, [NUS의 FlowFusion 연구](https://www.usenix.org/conference/usenixsecurity25/presentation/jiang-yuancheng)는 PHP 테스트 사이의 데이터 흐름을 이용해 복잡한 입력을 자동으로 합성했다. FlowFusion 연구진은 당시 알려지지 않았던 PHP 인터프리터 버그 158건을 발견했다고 보고했다. 이 숫자는 연구진이 발표한 평가 결과이지 내가 같은 조건에서 독립 검증한 실험 결과는 아니다.

계측 방법 역시 문제에 따라 다르다. [EXIF 버그 #78793](https://bugs.php.net/bug.php?id=78793)의 원 보고에는 MSan의 역할이 나타나고, [요청 간 포인터 수명 버그 #76167](https://bugs.php.net/bug.php?id=76167)은 GDB watchpoint가 중요했다. SOAP·Opcache의 GC 보호 잔류는 메모리 접근 오류가 나오기 전에도 PHP 수준의 상태 검사로 관측할 수 있다. 그러므로 **ASan이 조용하다는 이유만으로 결함이 없거나 패치가 성공했다고 판단해서는 안 된다.**

이런 이유로 이번 조사에서는 결함 지점에 *도달했는가(reached)*, 실제 불변조건이 *깨졌는가(triggered)*, 관측기가 이를 *탐지했는가(detected)*, 수정 전후 같은 경로에서 *차단을 확인했는가(patch verified)*를 구분했다. [Magma 연구](https://doi.org/10.1145/3428334)의 평가 원칙도 이러한 구분에 도움이 된다.

## PHP2Shell 연구에서 확인한 것, 아직 확인하지 못한 것

개인 연구 저장소 [windshock/php2shell](https://github.com/windshock/php2shell)에서는 공식 PHP 패치 전후를 비교하고, 메모리 오류·요청 간 상태를 ASan/GDB 및 PHP-FPM 랩으로 관찰했다. 이후 역사적 사례를 코퍼스로 정리하고, 입력 생성기·실행 무결성 판정기·CoreGuard라는 실험적 보호 기능까지 탐색을 확장했다.

하지만 **기능을 구현했다는 사실은 보호 효과를 증명하지 않는다.** [CoreGuard 평가 보고서](https://github.com/windshock/php2shell/blob/main/docs/coreguard/evaluation-report.md)는 개발에 직접 사용하지 않은 것으로 분류한 세 hold-out 사례에서 유효 요청을 유지하며 잘못된 접근을 사전에 막은 경우를 **0건**으로 보고한다. 일부 경로에서는 탐지나 프로세스 종료를 관측했지만 그것은 정상 실행을 유지하는 예방과 다르다. 평가 문서도 hold-out의 지식 독립성, PHP-FPM에서의 워커 교체, 전체 호환성 등에 제약이 있음을 명시한다.

따라서 내가 이 연구를 통해 주장하려는 것은 새로운 범용 퍼저를 완성했다거나 PHP 코어의 미공개 취약점을 입증했다는 것이 아니다. **기존 연구에서 발견된 결함을 원인과 수명 경계로 재분류하고, 어떤 탐색·검증·방어 방법이 그 실패를 실제로 구별하거나 예방하는지 시험할 수 있는 환경을 만들고 있다**는 것이다.

이 질문은 여전히 열려 있다. 그러므로 연구자들의 공개 자료를 비교할 때 그들의 최초 발견과 나의 해석, 저장소에서 재현된 관측과 아직 증거가 필요한 가설을 명확히 분리해야 한다.

## Research Credits & Acknowledgments — 연구자와 개발자들에게 감사하며

지난 10년간 공개된 취약점 제보, 재현 코드, 근본 원인 분석, 설계 논의와 패치가 없었다면 이 글도 작성할 수 없었다. **최초 발견과 후속 분석, PHP 코어 수정, 보안 감사, 배포·연구 지원은 서로 다른 공로**라는 점을 분명히 하며 감사를 전한다.

**초기 취약점 연구와 기술 분석.** [Taoguang Chen](https://bugs.php.net/bug.php?id=72530), [Yannay Livneh 및 Check Point 연구진](https://blog.checkpoint.com/research/check-point-discovers-three-zero-day-vulnerabilities-web-programming-language-php-7/), [Chris Young](https://bugs.php.net/bug.php?id=74103)의 재현과 분석은 PHP의 직렬화·GC·재진입을 이해하는 중요한 출발점이 되었다. [Emil Lerner(neex)](https://github.com/neex/phuip-fpizdam)의 PHP-FPM 취약점 발견과 [Orange Tsai](https://blog.orange.tw/posts/2019-10-an-analysis-and-thought-about-recently/)의 별도 기술 해설, [Charles Fol(cfreal)](https://blackalps.ch/ba-22/talk/generic-remote-exploit-techniques-for-the-php-allocator-and-0days)의 PHP 메모리 할당기 연구에도 감사한다.

**PHP 코어 개발과 검증.** [Nikita Popov](https://github.com/php/php-src/pull/6903)를 비롯해 오류 핸들러·GC·메모리 소유권 문제를 분석하고 수정 방법의 한계까지 공개해 온 개발자들에게 감사한다. [PHP Foundation의 2024년 감사 결과 발표](https://thephp.foundation/blog/2025/04/10/php-core-security-audit-results/)에서 인정한 **Arnaud Le Blanc, Ilija Tovilo, Jakub Zelenka, Niels Dossche**와 다른 PHP 코어 유지보수자·보안팀·리뷰어·테스터들에게도 감사를 전한다. 이는 이 네 명을 동일한 2026년 패치의 공동 작성자로 지목하는 뜻이 아니다.

**감사와 퍼징 연구.** [Quarkslab 감사의 공동 저자](https://blog.quarkslab.com/security-audit-of-php-src.html) **Angèle Bossuat, Julio Loayza Meneses, Mihail Kirov, Sébastien Rolland, Ramtine Tofighi Shirazi**와 [FlowFusion 논문의 공동 저자](https://www.usenix.org/conference/usenixsecurity25/presentation/jiang-yuancheng) **Yuancheng Jiang, Chuqi Zhang, Bonan Ruan, Jiahao Liu, Manuel Rigger, Roland H. C. Yap, Zhenkai Liang**에게 감사한다. 새로운 검증 방법을 공개한 공헌은 개별 취약점 발견과 마찬가지로 중요하다.

**2026년 PHP2Shell 발견·검증·책임 있는 공개.** [PHP Foundation의 공식 감사문](https://thephp.foundation/blog/2026/10/21/todays-php-security-release-and-how-were-strengthening-php-security/)은 **Ryan A(Calif)**와 **Amy Burnett(OpenAI Codex Security)**를 특별히 언급하고 Calif·OpenAI·Wiz의 연구와 신고·조정에 감사를 전한다. [Wiz Research의 원문](https://www.wiz.io/blog/php2shell-php-rce)에 이름이 실린 **Sagi Tzadik, Shir Tamari, Nir Ohfeld, Tomer Schwartz**에게도 감사를 전한다. 서로 다른 팀의 최초 신고, 독립 분석, 악용 가능성 검증, 패치 검증을 하나의 발견 공로로 합치지 않겠다.

이 연구를 가능하게 한 **PHP Foundation, OSTIF, Sovereign Tech Agency, PHP 보안팀, 릴리스 관리자, 배포판과 LTS 패키지 유지보수자, 자원봉사자와 후원자들**도 함께 인정하고 싶다. 이 글은 전체 기여자의 완전한 목록이 아니며, 이름이 나온 연구자들이 내 글이나 [php2shell 프로젝트](https://github.com/windshock/php2shell)를 승인한다는 뜻도 아니다. 이름·역할·출처에 잘못이 있다면 수정하겠다.

---

자세한 근거, 버전·재현 조건, 개발자 논의와 연구자별 참고 문헌은 [PHP 메모리 안전성 연구 노트 (2016–2026)](/ko/post/2026-10-24-php-memory-safety-research-notes/)에 정리했다. 각 사례의 원문과 패치 계보는 계속 검증 중이며, **Open인 이슈를 현재 악용 가능한 취약점이라고 간주하지 않는다.** 실험 절차와 알려진 한계는 [php2shell GitHub 저장소](https://github.com/windshock/php2shell)에서 확인할 수 있다.
