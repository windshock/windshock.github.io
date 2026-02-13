---
title: "계약과 정보보호 거버넌스의 차이, 그리고 “계약을 잘 안다 = 거버넌스를 안다”라는 착각을 막는 방법"
date: 2026-02-13
draft: false
featured: true
tags: ["거버넌스", "공급망 보안", "C-SCRM", "정책", "리스크 관리", "TrustAndCulture"]
categories: ["거버넌스", "보안문화"]
description: "계약은 집행 수단이고, 정보보호 거버넌스는 리스크·정책·책임·감사를 설계·운영하는 경영 시스템이라는 관점에서, SW 공급망 보안과 예외승인 체계까지 연결해 정리합니다."
image: "/images/pdf-previews/Governance_Not_Contracts_p1.webp"
---

## PDF

- **Open (new tab):** [`/files/Governance_Not_Contracts.pdf`](/files/Governance_Not_Contracts.pdf)

<iframe
  id="pdfjs-governance-not-contracts-ko"
  src="/pdfjs/single.html?file=/files/Governance_Not_Contracts.pdf#page=1"
  width="100%"
  height="560"
  style="border: 1px solid #e5e7eb; border-radius: 8px;"
></iframe>

<script>
  (function () {
    const iframe = document.getElementById("pdfjs-governance-not-contracts-ko");
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

> PDF가 보이지 않으면 여기로 열어보세요: [`/files/Governance_Not_Contracts.pdf`](/files/Governance_Not_Contracts.pdf)

## Executive summary

사업·예산·계약 실무 경험이 많은 보안팀장이 “계약을 잘 안다”고 느끼는 순간, **정보보호 거버넌스(Information Security Governance)**를 “계약 조항의 강약 조절”로 축소해 버리는 함정에 빠지기 쉽습니다. 계약은 거래 성사와 조건 합의의 **법적 도구**인 반면, 정보보호 거버넌스는 조직의 **리스크 아키텍처(무엇을 얼마나 위험으로 볼지), 정책(무엇을 표준으로 강제할지), 책임 배치(누가 무엇을 결정·승인·감사할지)**를 설계·운영하는 **경영 시스템**이기 때문입니다. NIST CSF 2.0은 GOVERN 기능을 통해 거버넌스를 “사이버 리스크 관리 전략·기대치·정책의 수립·전파·모니터링”으로 정의하고, 이를 **전사 ERM(Enterprise Risk Management)과 연결**해야 한다고 명시합니다. [\[1\]](https://csrc.nist.rip/external/nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf)

특히 “SW 공급망 보안” 영역에서 이 차이는 더 커집니다. 국내 **SW 공급망 보안 가이드라인(관계부처 합동, 2024.05)**은 C‑SCRM을 전사 위험관리 체계에 통합하고(레벨‑1/2/3), 조달·법무·HR 등 다양한 이해관계자가 SDLC 전반에 참여해야 한다고 말합니다. [\[2\]](https://www.kisia.or.kr/bucket/uploads/2024/05/13/sw%20%EA%B3%B5%EA%B8%89%EB%A7%9D%20%EB%B3%B4%EC%95%88%20%EA%B0%80%EC%9D%B4%EB%93%9C%EB%9D%BC%EC%9D%B8%20%28%EC%9A%94%EC%95%BD%EB%B3%B8%29.pdf) 즉, 보안 요구사항은 “계약서에 넣을 문장”이 아니라, **회사 리스크 전략과 표준(지주사 표준 포함)**이 먼저 정하고 계약은 그 표준을 **집행**하는 수단이어야 합니다.

이 맥락에서 “보안 담당자가 제안했던 계약 조항이 지주사에서 동일 항목으로 강화 지시”된 사례는, 개인 역량의 문제가 아니라 **거버넌스 신호(상위 표준의 리스크 허용치가 낮아졌다)**입니다. 보안팀장이 해야 할 의사결정은 “이번 딜만 성사”가 아니라 “표준·규제·사후 책임을 포함한 조직 리스크를 일관되게 관리”하는 쪽에 가까웠습니다. KISA는 정보통신망법 제47조의4에서 소프트웨어사업자의 취약점 보완 프로그램 제작 시 **KISA 통지 및 사용자 1개월 내 2회 이상 통지** 등을 제시하고 있어(법령 근거) ‘사후 책임’은 계약 밖에서도 발생합니다. [\[3\]](https://knvd.krcert.or.kr/law.do)

본 보고서는 (1) 계약 vs 거버넌스의 정의와 핵심 속성 비교, (2) 국내 법·가이드 및 지주사 표준이 만들어내는 우선순위, (3) 단기 딜 vs 중장기 규제·책임을 함께 보는 실무 질문, (4) 리더십 역량 모델(평가·육성 포함), (5) 국내외 사례(성공/실패·미확인 포함), (6) 조직·프로세스·문서 실행안을 제공합니다.

## 계약과 정보보호 거버넌스의 본질적 차이

계약(Contract)은 “거래를 성사시키기 위해 당사자 간 권리·의무·대가·책임을 문서로 확정”하는 행위입니다. 정보보호 거버넌스는 그보다 상위에서 “조직이 어떤 사이버 리스크를 어떤 수준으로 수용할지(리스크 허용치/선호), 그 결정을 누가 어떤 근거로 내릴지(책임·권한·보고라인), 그리고 정책·표준·감사로 이를 어떻게 지속 운영할지”를 설계하는 체계입니다. NIST CSF 2.0은 GOVERN이 다른 5개 기능을 “미션·이해관계자 기대” 맥락에서 우선순위화하고, 사이버를 ERM에 포함시키며, 역할·책임·권한·정책·감독을 다룬다고 분명히 말합니다. [\[1\]](https://csrc.nist.rip/external/nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf)

### 핵심 속성 비교 표

| 구분 | 계약(거래·조건 협상) | 정보보호 거버넌스(리스크 아키텍처·정책·책임 배치) |
| :---- | :---- | :---- |
| 1차 목적 | 딜 성사, 분쟁 예방, 비용·범위·일정 확정 | 리스크 허용치·우선순위·책임·통제의 **지속 운영** |
| 시간축 | 계약 체결\~종료(프로젝트/서비스 단위) | **상시**(조직 단위), 정책·표준은 계약보다 오래감 |
| 성공지표(대표) | 계약 체결 속도, 비용 절감, 분쟁 최소화 | 사고·규제 리스크 감소, 통제 준수율, 감사 적합성, 복원력 |
| 결정의 기준 | 협상력·시장 관행·상대방 수용성 | 법·규제·상위표준·리스크 선호·중장기 비용(벌금·손해·신뢰) |
| 산출물 | 계약서, SLA, 부속 합의서, 면책·손해배상 조항 | 보안정책/표준, RACI, 예외승인, 위험평가, 감사/모니터링 체계 |
| 주 이해관계자 | 영업/사업, 구매, 법무, 재무, 공급사 | 이사회/경영진, CISO, 리스크/컴플라이언스, IT/개발, 구매·법무(포함) |
| “실패”의 형태 | 미체결, 마진 악화, 분쟁/소송 | 사고 은폐·지연, 규제 위반, 내부통제 실패, 반복 사고(구조적) |
| 변경의 리듬 | 재계약/변경계약 중심(건별) | 위협·규제 변화에 따라 정책/표준을 지속 업데이트(포트폴리오) |
| 핵심 질문 | “이 조항을 상대가 받을까?” | “이 요구는 우리 리스크 전략·법·표준과 일치하나? 예외면 누가 책임지나?” |
| 계약과의 관계 | 거버넌스의 결과물을 “문장”으로 반영 | 계약을 **통제 집행 수단**으로 사용(필수조항·예외·감사권·통지의무 등) |

핵심은, **계약은 거버넌스의 ‘하위 구현물’**이라는 점입니다. 거버넌스가 없으면 계약 조항은 “지금 딜을 위한 타협의 산물”로 흔들리고, 시간이 지나 지주사/규제/사고가 닥치면 “왜 그때 예외를 줬냐”는 질문에 답할 구조가 남지 않습니다. 반대로 거버넌스가 있으면, 계약 담당자가 아무리 강한 협상가라도 ‘표준·예외 승인·감사’ 틀 안에서 움직이게 됩니다. CSF 2.0의 GV.OC는 조직의 사이버 의사결정이 **법·규제·계약상 요구사항**을 이해·관리해야 한다고 명시하는데, 이는 “계약을 잘 쓰라”가 아니라 “거버넌스가 계약 요구까지 포함해 통합 관리하라”는 뜻에 가깝습니다. [\[4\]](https://csrc.nist.rip/external/nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf)

## 국내 규제·가이드와 지주사 표준이 만드는 ‘거버넌스 압력’

### 국내: SW 공급망 보안 가이드라인이 말하는 “계약 이전의 거버넌스”

관계부처 합동 **SW 공급망 보안 가이드라인(2024.05)**은 공급망 사이버보안 위험관리(C‑SCRM)를 “공급망 전체에서 위험을 관리하고 대응 정책·전략을 개발하기 위한 체계적 프로세스”로 정의하고, SDLC 전반에 통합되어야 하며, 정보보안/개인정보, 개발·엔지니어, **조달·법무·HR 등 다양한 이해관계자가 참여**해야 한다고 적시합니다. [\[2\]](https://www.kisia.or.kr/bucket/uploads/2024/05/13/sw%20%EA%B3%B5%EA%B8%89%EB%A7%9D%20%EB%B3%B4%EC%95%88%20%EA%B0%80%EC%9D%B4%EB%93%9C%EB%9D%BC%EC%9D%B8%20%28%EC%9A%94%EC%95%BD%EB%B3%B8%29.pdf) 또한 C‑SCRM은 전사적 위험관리 체계(ERM)에 통합돼야 하며, 그 실행을 **레벨‑1(전사)·레벨‑2(프로세스)·레벨‑3(운영)**의 다단계 모델로 구분합니다. [\[2\]](https://www.kisia.or.kr/bucket/uploads/2024/05/13/sw%20%EA%B3%B5%EA%B8%89%EB%A7%9D%20%EB%B3%B4%EC%95%88%20%EA%B0%80%EC%9D%B4%EB%93%9C%EB%9D%BC%EC%9D%B8%20%28%EC%9A%94%EC%95%BD%EB%B3%B8%29.pdf)

이 구조는 “특정 계약 조항을 세게 넣자/빼자”가 아니라, 먼저 **전사 레벨(레벨‑1)에서 표준·경계·거버넌스 구조를 정하고**, 이후 개별 사업·조달·운영(레벨‑2/3)에서 이를 조정·적용해야 한다는 의미입니다. 즉, 지주사에서 동일 항목을 강화 지시했다면 이는 레벨‑1 표준의 업데이트 신호로 읽어야 합니다.

### 국내: 정보통신망법 등 ‘계약 밖’에서 발생하는 의무

KISA 보안 취약점 정보 포털은 정보통신망법 제47조의4를 인용하며, **소프트웨어 진흥법 제2조의 소프트웨어사업자**가 보안 취약점을 보완하는 프로그램을 제작했을 때 **KISA에 알리고, 사용자에게 제작일로부터 1개월 이내 2회 이상 알려야 한다**는 취지(조문)를 제시합니다. [\[3\]](https://knvd.krcert.or.kr/law.do) 같은 페이지는 침해사고 대응(제48조의2)의 법적 근거도 함께 정리합니다. [\[3\]](https://knvd.krcert.or.kr/law.do)

이 지점이 “계약 vs 거버넌스”의 분기점입니다. 계약으로 SLA/면책을 아무리 정교하게 해도, **법령·감독·통지 의무**는 계약 밖에서 강제됩니다. 거버넌스는 그래서 계약 문구만이 아니라 “우리가 그 의무를 실제로 이행할 조직·프로세스·증적이 있는가”를 묻습니다.

### 지주사 표준 사례: 계약 조항이 ‘거버넌스 집행 도구’가 되는 방식

사용자 제공 「SW 공급망 보안 계약 일반조건(2026.01.02)」에는 공급사 의무를 **SAST, SBOM, CVSS 기준, 신규 취약점(CVE) 모니터링, 패치 무상 제공, 배포채널 보안(서명검증·암호화 전송), 인증 유지(ISMS/ISO 27001\)** 등으로 구체화하고, 특히 “계약서류 전체에 적용되며 제출된 확인서/점검결과서도 계약 효력을 가진다”는 구조를 취합니다(내부 문서 기반, 공개 출처로 교차검증 불가 → 일부는 ‘미확인’ 표기).

이 표준의 핵심은 **‘계약서 한 장’이 아니라 ‘표준+증적+운영 의무’**를 패키지로 묶는 설계입니다. 이는 NIST CSF 2.0에서 GOVERN이 ‘공급망 사이버 리스크 관리 프로그램·정책·프로세스’를 이해관계자 합의로 수립해야 한다는 관점과 정합적입니다. [\[5\]](https://csrc.nist.rip/external/nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf) 또한 SBOM의 정의·효과는 EO 14028의 정의를 인용한 NIST 설명(“구성요소 및 공급망 관계를 담은 공식 기록”)과도 연결됩니다. [\[6\]](https://www.nist.gov/itl/executive-order-14028-improving-nations-cybersecurity/software-security-supply-chains-software-1)

### 국제·지주사 표준이 빠르게 변한다는 점 자체가 ‘거버넌스 과제’

미국의 경우, 2024년 CISA는 연방정부 납품 소프트웨어에 대해 SSDF 기반 **Secure Software Development Attestation Form**을 공개하며 EO 14028 및 OMB M‑22‑18/M‑23‑16의 흐름을 설명했습니다. [\[7\]](https://www.cisa.gov/secure-software-attestation-form) 그런데 2026.01.23 OMB는 M‑26‑05에서 “M‑22‑18/M‑23‑16을 rescind(철회)”하고, 기관별 **리스크 기반 접근**과 “요청 시 SBOM 제출을 요구하는 계약조건 채택 가능”을 명시했습니다. [\[8\]](https://www.whitehouse.gov/wp-content/uploads/2026/01/M-26-05-Adopting-a-Risk-based-Approach-to-Software-and-Hardware-Security.pdf)  
즉, 거버넌스는 단지 한 번의 계약 협상이 아니라, **규제·표준의 변화를 지속 추적하고 내부 표준(지주사 포함)을 업데이트**하는 기능을 포함합니다.

## 의사결정 프레임과 실무 체크리스트

계약 중심 의사결정(단기)은 보통 “딜 성사/비용/일정” 최적화로 수렴합니다. 반면 거버넌스 중심 의사결정(중장기)은 “규제·사후 책임·반복 리스크·감사·증적”을 함께 봅니다. CSF 2.0은 GOVERN이 조직 맥락, 리스크 선호/허용치, 역할·책임, 정책, 감독뿐 아니라 **공급망 리스크 관리(GV.SC)**까지 포함한다고 분명히 밝힙니다. [\[1\]](https://csrc.nist.rip/external/nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf)

아래 체크리스트는 “계약 문구를 고치는 회의”가 아니라 “거버넌스 관점에서 계약을 승인/예외 승인하는 회의”를 만들기 위한 질문입니다.

### 실무용 질문 체크리스트 표

| 질문(10개 이상) | 단기(딜) 관점에서 흔한 답 | 중장기(거버넌스) 관점에서 확인할 것 | 증적/오너(예시) |
| :---- | :---- | :---- | :---- |
| 이 요구는 **상위 표준(지주사/본사 정책)**의 필수조항인가? | “협상으로 빼보자” | 필수면 ‘협상 대상’이 아니라 ‘예외 프로세스 대상’ | 정책/표준 문서, CISO/컴플 |
| 요구를 완화하면 **리스크 허용치(Risk appetite/tolerance)**를 누가 책임지는가? | “사업이 책임” | 예외 승인권자(경영진/리스크위원회)와 RACI 필요 | GV.RM/GV.RR 관점 [\[5\]](https://csrc.nist.rip/external/nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf) |
| 사고 발생 시 **통지·보고 의무(법령/계약)**는 무엇인가? | “계약에 없으면…” | 법은 계약 밖에서도 의무 부과(예: 취약점 통지 근거) | KISA 법령 정리 [\[3\]](https://knvd.krcert.or.kr/law.do) |
| 공급사 업데이트/패치가 늦으면 우리 서비스는 어떻게 되는가? | “SLA로 벌금” | 장애·안전·규제 리스크(BCP/DR 포함)까지 시나리오화 | 운영/BCP 오너 |
| SBOM/SAST 요구는 “지금” 가능한가? | “중소기업이라 어려움” | 어렵다면 대체통제(검증·제3자 테스트·범위 제한)와 기한을 공식화 | 공급망 가이드의 단계적 도입 취지 [\[2\]](https://www.kisia.or.kr/bucket/uploads/2024/05/13/sw%20%EA%B3%B5%EA%B8%89%EB%A7%9D%20%EB%B3%B4%EC%95%88%20%EA%B0%80%EC%9D%B4%EB%93%9C%EB%9D%BC%EC%9D%B8%20%28%EC%9A%94%EC%95%BD%EB%B3%B8%29.pdf) |
| CVSS 기준(예: 7.0+)을 왜 그 수치로 두는가? | “그냥 표준이라” | 위험 분류·우선순위 체계(표준화된 계산·문서화) 필요 | GV.RM-06 취지 [\[5\]](https://csrc.nist.rip/external/nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf) |
| 계약서에 넣은 보안조항을 **감사/점검**할 권한과 절차가 있는가? | “넣어두면 되지” | 조항 집행 프로세스(증적 제출, 샘플링, 제재) 없으면 무력 | 감사계획/구매 |
| 공급사 하청/재위탁(서브티어)까지 통제되는가? | “1차 벤더만” | 공급망은 다층 구조. SBOM·서브티어 요구가 핵심 | SBOM 정의/목적 [\[6\]](https://www.nist.gov/itl/executive-order-14028-improving-nations-cybersecurity/software-security-supply-chains-software-1) |
| 예외를 줬을 때 **재평가 시점(기한)**이 있는가? | “이번만” | “이번만”은 항상 다음에도 반복. Sunset clause 필수 | 예외승인서 |
| 계약 체결 후 ‘운영 단계’에서 누가 모니터링하는가? | “보안팀이…” | 운영 RACI, KPI, 정례 리뷰(레벨‑3 운영) 명확화 | C‑SCRM 레벨‑3 [\[2\]](https://www.kisia.or.kr/bucket/uploads/2024/05/13/sw%20%EA%B3%B5%EA%B8%89%EB%A7%9D%20%EB%B3%B4%EC%95%88%20%EA%B0%80%EC%9D%B4%EB%93%9C%EB%9D%BC%EC%9D%B8%20%28%EC%9A%94%EC%95%BD%EB%B3%B8%29.pdf) |
| 보안요구를 완화한 대가로 얻는 사업 이익이 **정량화**되어 있는가? | “매출이니까” | 이익(매출) vs 비용(벌금·손해·신뢰) 동등한 모델 필요 | 재무/리스크 |
| 사고/규제 이슈가 발생하면 개인에게 법적 책임이 전가될 수 있는가? | “회사가 막아주겠지” | 공시·내부통제·은폐는 개인 리스크로 비화 가능 | SEC SolarWinds, Uber 사례 [\[9\]](https://www.sec.gov/newsroom/press-releases/2023-227) |

이 표의 목적은 “보안이 더 세게 요구한다”가 아니라, **‘결정 구조’를 바꾸는 것**입니다. 즉, 보안팀장이 “계약 전문가”일수록 더 빨리 해야 하는 것은 문구 수정이 아니라, **예외 승인·책임·증적·재평가**의 거버넌스 루프를 만드는 일입니다.

## 리더십 역량 모델: 계약능력 vs 거버넌스 역량

NIST CSF 2.0은 GOVERN에서 “리스크 선호/허용치, 역할·책임·권한, 정책, 감독, 공급망 리스크 관리”를 반복적으로 강조합니다. [\[10\]](https://csrc.nist.rip/external/nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf) 이를 역량 모델로 바꾸면, 계약 역량은 거버넌스 역량의 일부일 뿐이며, 거버넌스는 “조직 설계 \+ 운영”입니다.

### 역량 항목, 평가 지표, 육성 방안 표

| 역량 영역 | 계약 역량(강점) | 거버넌스 역량(필수) | 평가 지표(예시) | 육성 방안(예시) |
| :---- | :---- | :---- | :---- | :---- |
| 목표 설정 | 가격·범위·납기 최적화 | 리스크 허용치/우선순위·정책 목표 설정 | 예외 승인율, 반복 예외 감소, 감사 적발률 | ERM/리스크 워크숍, CSF 프로파일링 [\[4\]](https://csrc.nist.rip/external/nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf) |
| 이해관계자 | 법무·구매·공급사 협상 | 이사회/경영진/리스크/개발/운영까지 조정 | 레벨‑2/3 참여도, 의사결정 리드타임 | C‑SCRM 다자 협의체 운영 [\[2\]](https://www.kisia.or.kr/bucket/uploads/2024/05/13/sw%20%EA%B3%B5%EA%B8%89%EB%A7%9D%20%EB%B3%B4%EC%95%88%20%EA%B0%80%EC%9D%B4%EB%93%9C%EB%9D%BC%EC%9D%B8%20%28%EC%9A%94%EC%95%BD%EB%B3%B8%29.pdf) |
| 기준/표준화 | 템플릿·조항 라이브러리 | 정책·표준·예외·감사 루프 설계 | 표준 준수율, 정책 업데이트 주기 | 정책관리(PoM), 내부 통제 설계 |
| 실행/집행 | 계약 체결로 끝나기 쉬움 | 계약 이후 집행(증적, 점검, 제재)까지 운영 | 증적 제출 적시율, 개선조치 완료율 | 공급사 평가·정기 점검 루틴 |
| 리스크 커뮤니케이션 | 손해배상·면책 중심 | 조직 리스크(정량/정성)로 경영진 설득 | 경영진 리스크 리뷰 정례화 | 리스크 스토리텔링, 보드 리포팅 |
| 공급망 보안 | 납품 조건으로 요구 | 공급망 프로그램(GV.SC) 운영 | 서브티어 가시성, SBOM 커버리지 | SBOM/취약점 관리 체계 도입 [\[11\]](https://www.nist.gov/itl/executive-order-14028-improving-nations-cybersecurity/software-security-supply-chains-software-1) |
| 사고·사후 책임 | 분쟁 대응 | 통지·조사·교훈 반영(피드백 루프) | 사고 은폐 리스크 감소, 대응시간 | Tabletop, 법무·IR 연동 |
| 개인 리스크 인식 | “회사 리스크”로 환원 | 공시·내부통제·은폐 등 개인책임 인지 | 위기 시 보고라인 준수 | 사례 학습(SEC/DOJ) [\[9\]](https://www.sec.gov/newsroom/press-releases/2023-227) |

핵심 메시지: **계약을 잘 아는 보안리더는 ‘거버넌스의 한 기능(집행 수단)’을 잘 아는 것**입니다. 그러나 거버넌스는 그보다 위에서 “무엇을 필수로 강제하고, 예외를 누가 승인하며, 운영·감사로 어떻게 되돌릴지”를 결정합니다. GOVERN이 “중앙”인 이유도 여기에 있습니다. [\[12\]](https://csrc.nist.rip/external/nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf)

## 사례연구로 보는 ‘계약 중심 사고’의 함정

SW 공급망 가이드 요약본은 SolarWinds·Log4j·Kaseya 등 공급망 공격이 매해 반복되고, Log4j는 취약점 제거·업데이트에 “10년”이 걸릴 수 있다고 언급합니다(미 CSRB 인용). [\[2\]](https://www.kisia.or.kr/bucket/uploads/2024/05/13/sw%20%EA%B3%B5%EA%B8%89%EB%A7%9D%20%EB%B3%B4%EC%95%88%20%EA%B0%80%EC%9D%B4%EB%93%9C%EB%9D%BC%EC%9D%B8%20%28%EC%9A%94%EC%95%BD%EB%B3%B8%29.pdf) 즉, “계약 체결 순간의 타협”은 10년짜리 부채가 될 수 있습니다.

### 국내외 5개 사례 요약 표

| 사례 | 사건/상황 | 계약 관점에서 흔한 대응 | 거버넌스 실패/성공 포인트 | 결과/교훈 |
| :---- | :---- | :---- | :---- | :---- |
| 해외: SolarWinds & 규제 | SEC는 SolarWinds 및 CISO를 “사이버 리스크·통제 미흡 공시” 문제로 제소(2023) [\[13\]](https://www.sec.gov/newsroom/press-releases/2023-227) | “공시 문구를 일반적으로 쓰면 된다” | 내부 평가와 외부 공시/통제의 불일치(거버넌스·내부통제 이슈) | 보안은 기술이 아니라 내부통제·공시·책임 구조 문제로 확장 |
| 해외: Log4j | DHS는 CSRB 첫 보고서로 Log4j에 대한 19개 권고 발표 [\[14\]](https://www.dhs.gov/archive/news/2022/07/14/cyber-safety-review-board-releases-report-its-review-log4j-vulnerabilities-and) | “패치하면 끝” | 자산가시성·구성요소 투명성 부재가 대응을 지연 | “어디에 쓰였는지 모르면 패치도 못한다” → SBOM·자산관리·프로세스 성숙 |
| 해외: Uber 은폐 사건 | Uber 전 CSO는 침해사고 은폐로 유죄→보호관찰/벌금(2023) [\[15\]](https://www.justice.gov/usao-ndca/pr/former-chief-security-officer-uber-sentenced-three-years-probation-covering-data) | “합의서/NDA로 조용히 해결” | 규제기관 조사 상황에서 은폐는 거버넌스 위반(보고·윤리·법적 리스크) | 계약(합의)로 ‘거버넌스 실패’를 덮을 수 없고, 오히려 개인 리스크로 전이 |
| 국내·정책: 공급망 위협의 상시화 | 국내 가이드라인은 공급망 위험관리(C‑SCRM)의 전사 통합·다단계 수행을 권고 [\[2\]](https://www.kisia.or.kr/bucket/uploads/2024/05/13/sw%20%EA%B3%B5%EA%B8%89%EB%A7%9D%20%EB%B3%B4%EC%95%88%20%EA%B0%80%EC%9D%B4%EB%93%9C%EB%9D%BC%EC%9D%B8%20%28%EC%9A%94%EC%95%BD%EB%B3%B8%29.pdf) | “조달 계약에 항목 추가” | 레벨‑1(전사) 표준 없이 계약만 강화하면 현장 충돌·예외 남발 | 지주사 표준·정책·예외승인 체계가 먼저, 계약은 그 다음 |
| 사내(가명) 사례: 사업·예산 출신 보안팀장 | 보안 실무 검토로 제한했던 항목이 지주사에서 동일하게 ‘강화’로 하달(사용자 서술 기반) | “딜/관계 때문에 완화” | **예외 승인 체계 부재**, 리스크 허용치·책임 소재 불명확(미확인) | 리더의 ‘계약 자신감’이 거버넌스 공백을 가리는 착시가 됨 → 예외·승인·증적이 실력 |

이 사례들이 공통으로 말하는 것은 간단합니다. **계약은 ‘리스크를 제거’하지 못합니다.** 거버넌스가 리스크를 “정의·측정·승인·감사”하고, 계약은 그 결과를 “외부(공급사)로 확장”하는 도구입니다.

## 권고안과 커뮤니케이션 산출물

### 권고안: 조직·프로세스·문서의 실행안

조직(채용·승진·교육)은 “계약형 리더”를 배제하자는 것이 아니라, **계약 강점을 거버넌스 역량으로 확장시키는 장치**를 두자는 제안입니다. 특히 CSF Tiers가 말하듯 성숙한 조직은 ‘비공식·ad hoc’에서 ‘repeatable·adaptive’로 이동합니다. [\[16\]](https://csrc.nist.rip/external/nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf)

**조직 실행안**  
보안팀장/부서장 직무기술서에 “계약 협상”과 별도로 **GV.RM(리스크 선호/허용치), GV.RR(역할·책임·권한), GV.SC(공급망 리스크 관리 프로그램)** 책임을 명시하고, 평가에 예외 승인 품질(근거·기한·대체통제)과 감사 적발률을 포함합니다. [\[5\]](https://csrc.nist.rip/external/nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf) 또한 공급망 보안은 조달·법무·보안·개발·운영이 참여해야 한다는 국내 가이드 권고를 정례위원회 형태로 구조화합니다. [\[2\]](https://www.kisia.or.kr/bucket/uploads/2024/05/13/sw%20%EA%B3%B5%EA%B8%89%EB%A7%9D%20%EB%B3%B4%EC%95%88%20%EA%B0%80%EC%9D%B4%EB%93%9C%EB%9D%BC%EC%9D%B8%20%28%EC%9A%94%EC%95%BD%EB%B3%B8%29.pdf)

**프로세스 실행안(검토 루틴·승인 기준)**  
“보안조항 협상”을 ‘개별 딜 회의’가 아니라 **표준/예외 심의**로 바꿉니다. 필수조항(지주사·법규·내부 표준)은 협상 대상이 아니라 **예외 승인 대상**으로 분류하고, 예외는 (1) 리스크 설명, (2) 대체 통제, (3) 종료 기한, (4) 책임자 서명을 포함해야 승인되도록 합니다. 또한 공급망은 SDLC 전반에 걸쳐야 하므로(국내 가이드), 계약 체결 후 운영 단계에서 증적 제출·샘플 점검·시정조치 트래킹을 “분기 1회” 같은 리듬으로 강제합니다. [\[2\]](https://www.kisia.or.kr/bucket/uploads/2024/05/13/sw%20%EA%B3%B5%EA%B8%89%EB%A7%9D%20%EB%B3%B4%EC%95%88%20%EA%B0%80%EC%9D%B4%EB%93%9C%EB%9D%BC%EC%9D%B8%20%28%EC%9A%94%EC%95%BD%EB%B3%B8%29.pdf)

**문서 실행안(템플릿·체크리스트)**  
지주사 표준과 같은 “SW 공급망 보안 일반조건”을 **모듈화**해 (A) 자체개발 위탁, (B) 상용 SW/패키지, (C) Appliance/장비, (D) 유지보수/업데이트로 분리하고, SBOM·SAST·취약점 모니터링·배포채널 보안처럼 핵심 통제는 “필수 조항”으로 유지합니다. SBOM은 NIST가 EO 14028 정의(공식 기록)를 인용하며 표준 포맷(SPDX, CycloneDX 등)과 최소요건을 권고하므로, ‘표준 포맷’ 요구는 협상 대상이 아니라 구현 방식의 문제로 다뤄야 합니다. [\[17\]](https://www.nist.gov/itl/executive-order-14028-improving-nations-cybersecurity/software-security-supply-chains-software-1)

---

[\[1\]](https://csrc.nist.rip/external/nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf) [\[4\]](https://csrc.nist.rip/external/nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf) [\[5\]](https://csrc.nist.rip/external/nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf) [\[10\]](https://csrc.nist.rip/external/nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf) [\[12\]](https://csrc.nist.rip/external/nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf) [\[16\]](https://csrc.nist.rip/external/nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf) [\[19\]](https://csrc.nist.rip/external/nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf) [\[22\]](https://csrc.nist.rip/external/nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf) https://csrc.nist.rip/external/nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf

[https://csrc.nist.rip/external/nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf](https://csrc.nist.rip/external/nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf)

[\[2\]](https://www.kisia.or.kr/bucket/uploads/2024/05/13/sw%20%EA%B3%B5%EA%B8%89%EB%A7%9D%20%EB%B3%B4%EC%95%88%20%EA%B0%80%EC%9D%B4%EB%93%9C%EB%9D%BC%EC%9D%B8%20%28%EC%9A%94%EC%95%BD%EB%B3%B8%29.pdf) [\[21\]](https://www.kisia.or.kr/bucket/uploads/2024/05/13/sw%20%EA%B3%B5%EA%B8%89%EB%A7%9D%20%EB%B3%B4%EC%95%88%20%EA%B0%80%EC%9D%B4%EB%93%9C%EB%9D%BC%EC%9D%B8%20%28%EC%9A%94%EC%95%BD%EB%B3%B8%29.pdf) https://www.kisia.or.kr/bucket/uploads/2024/05/13/sw%20%EA%B3%B5%EA%B8%89%EB%A7%9D%20%EB%B3%B4%EC%95%88%20%EA%B0%80%EC%9D%B4%EB%93%9C%EB%9D%BC%EC%9D%B8%20%28%EC%9A%94%EC%95%BD%EB%B3%B8%29.pdf

[https://www.kisia.or.kr/bucket/uploads/2024/05/13/sw%20%EA%B3%B5%EA%B8%89%EB%A7%9D%20%EB%B3%B4%EC%95%88%20%EA%B0%80%EC%9D%B4%EB%93%9C%EB%9D%BC%EC%9D%B8%20%28%EC%9A%94%EC%95%BD%EB%B3%B8%29.pdf](https://www.kisia.or.kr/bucket/uploads/2024/05/13/sw%20%EA%B3%B5%EA%B8%89%EB%A7%9D%20%EB%B3%B4%EC%95%88%20%EA%B0%80%EC%9D%B4%EB%93%9C%EB%9D%BC%EC%9D%B8%20%28%EC%9A%94%EC%95%BD%EB%B3%B8%29.pdf)

[\[3\]](https://knvd.krcert.or.kr/law.do) https://knvd.krcert.or.kr/law.do

[https://knvd.krcert.or.kr/law.do](https://knvd.krcert.or.kr/law.do)

[\[6\]](https://www.nist.gov/itl/executive-order-14028-improving-nations-cybersecurity/software-security-supply-chains-software-1) [\[11\]](https://www.nist.gov/itl/executive-order-14028-improving-nations-cybersecurity/software-security-supply-chains-software-1) [\[17\]](https://www.nist.gov/itl/executive-order-14028-improving-nations-cybersecurity/software-security-supply-chains-software-1) [\[25\]](https://www.nist.gov/itl/executive-order-14028-improving-nations-cybersecurity/software-security-supply-chains-software-1) https://www.nist.gov/itl/executive-order-14028-improving-nations-cybersecurity/software-security-supply-chains-software-1

[https://www.nist.gov/itl/executive-order-14028-improving-nations-cybersecurity/software-security-supply-chains-software-1](https://www.nist.gov/itl/executive-order-14028-improving-nations-cybersecurity/software-security-supply-chains-software-1)

[\[7\]](https://www.cisa.gov/secure-software-attestation-form) https://www.cisa.gov/secure-software-attestation-form

[https://www.cisa.gov/secure-software-attestation-form](https://www.cisa.gov/secure-software-attestation-form)

[\[8\]](https://www.whitehouse.gov/wp-content/uploads/2026/01/M-26-05-Adopting-a-Risk-based-Approach-to-Software-and-Hardware-Security.pdf) https://www.whitehouse.gov/wp-content/uploads/2026/01/M-26-05-Adopting-a-Risk-based-Approach-to-Software-and-Hardware-Security.pdf

[https://www.whitehouse.gov/wp-content/uploads/2026/01/M-26-05-Adopting-a-Risk-based-Approach-to-Software-and-Hardware-Security.pdf](https://www.whitehouse.gov/wp-content/uploads/2026/01/M-26-05-Adopting-a-Risk-based-Approach-to-Software-and-Hardware-Security.pdf)

[\[9\]](https://www.sec.gov/newsroom/press-releases/2023-227) [\[13\]](https://www.sec.gov/newsroom/press-releases/2023-227) https://www.sec.gov/newsroom/press-releases/2023-227

[https://www.sec.gov/newsroom/press-releases/2023-227](https://www.sec.gov/newsroom/press-releases/2023-227)

[\[14\]](https://www.dhs.gov/archive/news/2022/07/14/cyber-safety-review-board-releases-report-its-review-log4j-vulnerabilities-and) [\[24\]](https://www.dhs.gov/archive/news/2022/07/14/cyber-safety-review-board-releases-report-its-review-log4j-vulnerabilities-and) https://www.dhs.gov/archive/news/2022/07/14/cyber-safety-review-board-releases-report-its-review-log4j-vulnerabilities-and

[https://www.dhs.gov/archive/news/2022/07/14/cyber-safety-review-board-releases-report-its-review-log4j-vulnerabilities-and](https://www.dhs.gov/archive/news/2022/07/14/cyber-safety-review-board-releases-report-its-review-log4j-vulnerabilities-and)

[\[15\]](https://www.justice.gov/usao-ndca/pr/former-chief-security-officer-uber-sentenced-three-years-probation-covering-data) [\[23\]](https://www.justice.gov/usao-ndca/pr/former-chief-security-officer-uber-sentenced-three-years-probation-covering-data) https://www.justice.gov/usao-ndca/pr/former-chief-security-officer-uber-sentenced-three-years-probation-covering-data

[https://www.justice.gov/usao-ndca/pr/former-chief-security-officer-uber-sentenced-three-years-probation-covering-data](https://www.justice.gov/usao-ndca/pr/former-chief-security-officer-uber-sentenced-three-years-probation-covering-data)

[\[18\]](https://www.nist.gov/itl/executive-order-14028-improving-nations-cybersecurity) https://www.nist.gov/itl/executive-order-14028-improving-nations-cybersecurity

[https://www.nist.gov/itl/executive-order-14028-improving-nations-cybersecurity](https://www.nist.gov/itl/executive-order-14028-improving-nations-cybersecurity)

[\[20\]](https://www.kisia.or.kr/announcement/relative/421/) https://www.kisia.or.kr/announcement/relative/421/

[https://www.kisia.or.kr/announcement/relative/421/](https://www.kisia.or.kr/announcement/relative/421/)