---
title: "진단 워크플로우는 미스 케이스를 흡수할 때만 살아남는다 — sec-audit-static v2.0의 여덟 번 보강"
date: 2026-05-19
draft: false
featured: true
tags: ["보안 자동화", "정적 분석", "Joern", "Semgrep", "구조 설계", "Code"]
categories: ["보안 연구"]
description: "오픈소스 sec-audit-static 워크플로우 v2.0을 설계하고, 실제 인증 서버 진단에 돌렸다가 두 가지를 놓쳤다. 그 미스를 도구로 역반영해 v2.8까지 보강한 기록."
---

한 인증 백엔드를 진단했다. 메인 서비스 모듈만 스캔하고 끝낸 워크플로우는 sibling 모듈(같은 저장소에 나란히 있는 형제 모듈)의 controller 하나가 `/appserver/0002.json` 응답에 AES key와 iv를 그대로 실어 보내고 있다는 사실을 보지 못했다. 같은 저장소의 cipher 유틸 클래스에는 그 key/iv가 하드코딩되어 있었다. 두 파일을 같이 보지 않으면 도달할 수 없는 결론이었고, v2.0의 기본 snapshot scope는 sibling 모듈을 보지 않는다.

이번 글은 그 부서짐의 기록이다 — 어디가 부서졌고, 무엇을 다시 짰는지. v2.0으로 시작한 `sec-audit-static` 워크플로우는 그 진단 한 번에 v2.1~v2.8까지의 보강을 받았다.

> **oh-my-secuaudit 시리즈** ([3편](/ko/post/2026-04-15-security-code-clustering/)에서는 228개 엔드포인트를 5개 클러스터로 줄인 구조의 실체를 보여줬다. 이번 4편은 그 구조가 다음 진단에서 부서진 자리에 대한 글이다.)
> 1. [Security Testing as Code — 진단을 코드로 구조화하는 실험](/ko/post/2026-03-17-security-testing-as-code/)
> 2. [취약점을 잘 찾는 사람보다, 구조를 만드는 사람이 남는다](/ko/post/2026-04-02-security-from-sense-to-structure/)
> 3. [228개 엔드포인트를 5개 클러스터로 줄인 이야기](/ko/post/2026-04-15-security-code-clustering/)
> 4. **진단 워크플로우는 미스 케이스를 흡수할 때만 살아남는다** ← 현재 글
> 5. [소형 LLM용 보안 개발 스펙에서 회귀 테스트와 퍼징 검증까지](/ko/post/2026-06-08-security-spec-test-repair-fuzzing/)

이 글의 결론은 단순하다.

> **진단 도구의 신뢰는 도구가 자기 자신을 어떻게 기록하느냐에서 나온다.**
> **그 기록은 미스 케이스가 만든다.**

*본문은 익명화된 `api-svc`(주 서비스 모듈) / `data-svc`(sibling DB-side 모듈)를 일관되게 사용한다. 인용한 JSON 메타데이터도 같은 이름으로 치환했고, 실제 운영 메타데이터는 다른 내부 모듈명을 가진다.*

---

## 0. v2.0 이전 — 워크플로우는 자기 자신을 기억하지 못했다

`sec-audit-static`은 처음부터 v2.0이 아니었다.

[3편](/ko/post/2026-04-15-security-code-clustering/)의 클러스터링은 "어디를 볼지"는 잘 줄여줬다. 228개 엔드포인트가 5개 클러스터로 정리되면 사람이 손댈 자리가 분명해진다. 그런데 클러스터에 들어간 후보 하나를 골라 "여기에 source→sink 도달 경로가 진짜 있는가"를 검증하는 단계로 내려가면, 워크플로우가 부서지고 있었다.

초기 sec-audit-static은 도구들의 느슨한 연결이었다.

- **결과를 사람이 stitch했다.** Semgrep으로 패턴 매칭, Zoekt/rg로 검색, Joern으로 호출 그래프 — 각각 따로 돌리고 결과를 사람이 머리로 합쳤다. 같은 분석을 2주 뒤에 다시 하면 합쳐지는 모양이 달랐다.
- **엣지 출처가 안 남았다.** 후보 하나가 reachable로 판정됐을 때, 그게 Joern의 call-graph에서 나온 결과인지, 단순 grep hit인지 구분할 방법이 없었다. grep과 Joern을 동급으로 취급하면 false positive가 산처럼 쌓인다.
- **"Unknown"이 한 덩어리였다.** 막힌 finding은 전부 한 라벨로 묶였다. context가 부족해서 막혔는지, 동적 dispatch라 추적이 끊겼는지, 그냥 도구 에러였는지 — 다음 사람이 어디부터 손댈지 정할 수 없었다.
- **LLM 컨텍스트는 함수 통째로 복사였다.** taint 흐름과 무관한 코드까지 같이 들어가 토큰이 폭주하거나, 정작 sink로 가는 분기를 모델이 못 보고 잘못된 결론을 냈다.
- **디컴파일 산출물은 별세계였다.** 소스가 없어서 CFR로 디컴파일한 결과는 소스 코드와 연결되지 않은 채 별도 트리에서만 분석됐다. 같은 함수가 양쪽에 다 있어도 한쪽 검증이 다른 쪽으로 전파되지 않았다.

요약하면, **워크플로우는 동작했지만 자기 자신을 기억하지 못했다.** 같은 후보가 매번 다른 결론을 받았고, 결론의 근거를 누구도 한 곳에서 보여줄 수 없었다.

v2.0은 그걸 고치려고 설계했다. 사용한 도구의 조합은 거의 같다. 바뀐 건 "결과를 어디에 적고, 어떻게 연결할지"에 대한 규약이었다.

---

## 1. v2.0이 약속한 것

`sec-audit-static`은 소스 코드 + 디컴파일 산출물이 섞인 대규모 코드베이스에서 source→sink 도달 가능성을 빠르게 확인하는 워크플로우다. v2.0 설계 단계에서 위 다섯 가지 문제를 다섯 가지 약속으로 묶었다.

**1) State Store** — 모든 후보(candidate)를 단일 ID로 묶고, 운영 메타데이터(run, snapshot scope, provenance log)는 SQLite 한 파일에, candidate별 산출물(슬라이스, 커버리지 JSON, finding report)은 같은 state 디렉터리의 파일로 저장한다. SQLite + state 디렉터리가 같은 자리에 묶여 있어 candidate ID로 둘을 cross-reference한다. ("DB 하나에 다 들어간다"가 아니라 "메타데이터는 DB, 증적은 파일, 같은 디렉터리에서 같은 ID로 연결" — 이 차이가 §4에서 다시 나온다.)

**2) Edge tier — call graph의 빈칸을 다루는 안전장치** — call graph 엣지의 출처를 3단계로 기록한다.

| 출처 | 신뢰도 기본값 | 사용 시점 |
|------|---------------|-----------|
| Joern CPG snapshot | 0.9 | 1차 |
| LSP | 0.6 | 2차 폴백 |
| rg / ctags / grep-family | 0.3 | 3차 폴백, 단독으로 리포트 promote 불가 |

왜 굳이 여러 단계가 필요한가. Spring MVC, DI, annotation routing, Kotlin/Java + 디컴파일 산출물이 섞이면 high-confidence graph가 일부 경로를 못 그린다. edge가 없다는 사실을 곧장 "도달 불가"로 해석하면 false negative가 된다 — 반대로 rg hit 하나로 finding을 승격하면 false positive다. 그래서 낮은 tier로 보완하되, 낮은 tier 단독으로는 리포트 승격을 막는다.

**3) Program slicing** — 계획서는 "taint-relevant 변수 기준 backward/forward slicing + 3단계 fallback (same-function → data-only → 2-hop)"을 약속했다. 실제 구현은 더 작은 약속이다 — sink 라인 중심의 line-window + budget auto-tune (기본 120라인 / 1.5k 토큰, 최대 200라인). 왜 그렇게 후퇴했는지는 §3에서 다룬다.

**4) Facet schema — 후보를 정렬 가능한 사건으로 만들기** — 모든 후보는 `layer` (controller/service/dao/util), `boundary` (external/network/file/deserialization), `sink_class` (exec/eval/sql/fs/net/deserialize) 세 태그를 반드시 가진다. 모르면 `unknown_*`로 명시 기록.

이유는 단순하다. 같은 "키 노출"이라도 controller에서 외부 응답으로 나가는 경우(Miss 1의 `/appserver/0002.json`)와 util 내부에 상수로 남아 있는 경우(`AesCipherUtil.java`의 하드코딩 key/iv)는 우선순위와 검증 경로가 다르다. 세 태그를 강제하면 후보가 "발견된 문자열"이 아니라 "어디(layer)에서, 어떤 경계(boundary)를 지나, 어떤 sink_class로 위험해지는가"라는 정렬 가능한 사건이 되고, 그 정렬이 곧 리포트·우선순위·재실행 조건으로 이어진다.

**5) Unknown taxonomy** — `unknown`을 한 덩어리로 두지 않는다.

- `unknown_no_edges`
- `unknown_dynamic_dispatch`
- `unknown_context_budget`
- `unknown_needs_runtime`
- `unknown_tooling_error`

목표는 "왜 막혔는지"를 쿼리 가능하게 만드는 것이다.

설계 시점에는 깔끔했다. 동작도 했다. 인증 서버 한 곳에 돌리기 전까지는.

---

## 2. 실전 진단: 두 가지를 놓쳤다

대상은 모바일 지갑/인증 백엔드였다. Spring MVC + Kotlin/Java WAR 모듈 구조 — 메인 서비스 모듈(`api-svc`)과 별도의 DB-side 모듈(`data-svc`)이 한 저장소 안에 sibling으로 들어 있고, Maven으로 빌드된다. 총 500여 개 소스 파일, 수십 개의 인터페이스 코드(`IF5xxx.kt` 형식).

v2.0 워크플로우를 그대로 돌렸다. snapshot_scope는 `module` 기본값으로 `api-svc`만. Joern 스냅샷, Zoekt 인덱스, Semgrep 룰 다 통과. 리포트가 깔끔하게 나왔다.

그리고 다음 날, 두 가지를 놓쳤다는 걸 알았다.

### Miss 1 — 인증 키 노출: 모듈 스코프가 시야를 가렸다

`sec-audit-static` 자동 룰셋은 인증 우회(`@Certification(false)`), authKey TTL, whitelist 명령어 같은 패턴은 검출한다. 하지만 진짜 위험한 엔드포인트는 sibling 모듈에 있었다.

```
api-svc/...  ← v2.0이 본 곳
data-svc/src/main/java/.../common/controller/CommonController.java
  └─ POST /appserver/0002.json (getAuthkeyInfo)
       응답에 AES key/iv를 그대로 실어 보냄
```

`api-svc`만 본 스캐너는 `data-svc`의 `getAuthkeyInfo` 엔드포인트를 시야에 넣지 못했다. 게다가 같은 저장소의 `data-svc/src/main/java/.../util/AesCipherUtil.java`에는 key/iv가 하드코딩되어 있었다. 두 파일을 같이 보지 않으면, "키가 노출된다"는 결론까지 도달할 수 없었다.

원인을 셋으로 정리했다.

1. **스코프 함정**: snapshot_scope=`module`은 신뢰도/재현성에는 좋지만, sibling 모듈 노출은 본질적으로 못 본다.
2. **룰셋 사각지대**: 인증 우회/TTL 룰은 있어도 "key info 엔드포인트 + 하드코딩 key/iv 조합"을 묶는 전용 detector가 없었다.
3. **수동 증적 → 구조화 갭**: 런타임 응답에 key가 들어 있다는 사실은 사람이 곧바로 확인했지만, 그 사실을 task finding으로 promote하는 결정론적 단계가 없었다.

### Miss 2 — 혼합 카테고리 리포트: task 단위 분류가 충돌했다

다른 task에서는 한 task 파일이 데이터 보호(섹션 4)와 인증·권한(섹션 6)을 동시에 포함하는 finding을 만들었다. 인증 미흡 때문에 정보 누출이 일어나는 케이스라 둘이 한 task에 들어가는 게 자연스럽다.

문제는 `generate_finding_report.py`였다. 이 스크립트는 카테고리를 **task 파일 단위**(`task_id`/파일명)로 추정했다. 그래서 한 task 안에 4-x와 6-x가 섞이면 4-x 섹션 하나로 평탄화돼 합쳐졌다. 보고서를 처음 본 사람은 "왜 인증 항목에 데이터 보호 finding이 끼어있지?"라고 묻게 된다.

또 하나, 정적 시그널(`@Certification(false)`)을 보고 "인증 없음"이라고 narrate한 finding이 있었는데, 런타임 evidence는 `*_with_auth`로 인증 후 도달임을 보여주고 있었다. 텍스트와 증적이 충돌한 채로 리포트가 나갔다.

두 미스는 v2.0의 약속 자체와 다른 종류의 문제다. v2.0은 `snapshot_scope=module`을 default로 정하고 "sibling 모듈은 별도 run으로 분리한다"는 입장을 명시했다 — 즉 Miss 1은 약속의 *바깥*이 아니라 **module-scoped 기본값의 의도된 한계가 실전 미스로 드러난 케이스**다. Miss 2는 더 단순하다 — 리포트 카테고리 분류라는, 계획서가 아예 다루지 않은 자리에서 깨졌다. **약속한 항목 자체가 잘못된 것은 아니지만, 약속의 경계나 약속이 안 닿은 자리에서 새 미스가 시작된다.**

---

## 3. v2.1~v2.8: 미스를 도구로 다시 짜기

v2.1부터 v2.5까지는 각각 10개씩, 총 50개의 review 항목이었다. "약속이 운영에서 어떻게 깨지는지"를 미리 짚는 사고 실험에 가깝다 — CI fail-fast, SLO, rollback, snapshot.hash, edge confidence threshold, slice budget auto-tune, plan-vs-implementation lint 같은 항목들. v2.6에서 그중 우선순위가 높은 일곱 가지가 실제 코드에 박혔다. v2.7과 v2.8은 이번 실전 진단 한 번이 새로 만든 미스다.

실제 코드에 들어간 자리만 추리면 다음 세 줄이다.

| 버전 | 무엇이 들어갔나 | 트리거 |
|------|-----------------|--------|
| v2.6 | edge rebuild + logging, slice auto-tune, fuzz gate execution, report surfacing, CI summary contract, decompile parity gate, unknown evidence autopopulate | v2.1~v2.5의 사고 실험을 실행으로 |
| **v2.7** | `scan_authkey_exposure.py` + sibling 자동 포함 | **이번 진단의 Miss 1 (key 노출)** |
| **v2.8** | per-finding category 재분류 + `check_finding_consistency.py` | **이번 진단의 Miss 2 (혼합 카테고리 report)** |

(v2.1~v2.5의 50개 review 항목 전체는 [oh-my-secuaudit 저장소의 workflow_comparison.md](https://github.com/windshock/oh-my-secuaudit/blob/main/plugins/oh-my-secuaudit/skills/sec-audit-static/references/workflow_comparison.md)에 있다.)

아래에서는 v2.7과 v2.8을 중심으로, 그 사이에 끼어든 v2.6 보강을 묶어 본다.



### v2.7 — 키 노출 detector + sibling 자동 포함

`tools/scripts/scan_authkey_exposure.py`를 추가했다. 두 가지 신호를 동시에 본다.

- 경로 패턴: `/appserver/0002.json`, 함수명 `getAuthkeyInfo` (그리고 동형 변종)
- 자료 패턴: source/test/build/config에서 key/iv가 하드코딩된 자리

`run_static_audit.sh`에는 step `[6.5] auth/key exposure scan`을 끼워 넣고, primary 저장소 이름이 `api-svc*`로 시작하면 자동으로 sibling `data-svc`를 `--extra-repo`로 끌어들이도록 했다. 운영자가 따로 신경 쓰지 않아도 두 모듈이 같이 스캔된다.

```bash
echo "[6.5] auth/key exposure scan"
# auto-include sibling data-svc when primary is api-svc*
# ...
python "$ROOT/tools/scripts/scan_authkey_exposure.py" \
  --repos "$REPO" "${EXTRA_REPOS[@]}" \
  --state "$STATE" --run-id "$RUN_ID"
```

핵심은 detector가 추가됐다는 사실 자체가 아니라, **운영자가 같은 미스를 다시 만들 수 없게 runner가 강제한다**는 점이다.

### v2.8 — 카테고리는 finding 단위로 본다

`generate_finding_report.py`를 다음과 같이 바꿨다.

- 카테고리 추정 우선순위를 **per-finding `category` 필드 → task 단위 fallback**으로 뒤집었다.
- aggregation 후에 카테고리별 display-ID(`4-1`, `4-2`, `6-1`...)를 재할당한다. 혼합 task 파일도 섹션 충돌 없이 표시된다.
- `tools/scripts/check_finding_consistency.py`를 추가해 (a) 정적 narrative와 런타임 evidence가 충돌하면 경고, (b) 혼합 카테고리 task가 평탄화되지 않았는지 검증한다.
- 이 일관성 검사는 `run_static_audit.sh`의 enrichment 단계에 묶여 자동 실행된다.

여기에 v2.7/v2.8 사이에 끼어 들어간 보강도 작지 않다. 같은 사고 흐름이다 — 한 번 발견한 빈틈은 다음 run에서 다시 발견되도록 runner에 새긴다.

- **Edge rebuild + logging** — `snapshot.hash`를 저장해 HEAD가 바뀌면 Joern/Zoekt 캐시를 자동 무효화. grep-only edge_source인데 confidence가 0.3 미만이면 리포트 promote 차단.
- **Slice auto-tune** — 슬라이스가 두 번 넘치면 한도를 120→200으로 자동 확장하고, 끝까지 안 되면 `unknown_context_budget`을 명시 기록. §1에서 미뤘던 솔직한 단서를 여기서 단다. 계획서의 "taint-relevant backward/forward + 3단계 fallback"이 실제 구현(`slice_context.py`)에서 sink 라인 중심의 line-window + budget auto-tune으로 후퇴했다. 이건 게으름이 아니라 현실적인 타협이다 — Kotlin 코루틴 + 디컴파일 Java + Spring DI + 리플렉션이 섞이면 Joern의 dfg 단계가 자주 깨진다. 이번 진단에서도 CPG를 다섯 번 다시 빌드해야 했고 taint 결과는 `_adjusted` 사본으로 손 후처리됐다. dfg 의존을 빼고 "file + line만 있으면 작동하는" 라인 윈도우로 후퇴한 것은 정확도 손실 < 운영 가능성이라는 판단이다. **도구가 어디서 명세에 못 미치는지를 자기 기록에 남기는 것, 그것도 v2.0의 일부다.**
- **Fuzz gate execution** — high-risk unknown에 대해 10~30분 짧은 fuzz를 돌리고 cmd/seed/coverage를 State Store에 적는다.
- **Decompile parity gate** — 디컴파일 파스 비교 자체는 v2.0 이전부터의 요구사항이었지만, 그걸 "스킵하면 run-level `decompile_status=skipped` + waiver 파일이 없으면 complete로 못 가게 막는" 게이트로 v2.5/v2.6에서 구체화했다. 즉 새 약속이 아니라, 기존 약속을 실행 형태로 박은 자리.
- **CI summary contract** — runner가 machine-readable 요약 JSON을 출력하고, CI가 그걸 파싱해 pass/fail을 결정한다.

여덟 번의 보강(v2.1~v2.8)을 한 줄로 요약하면 이렇다.

> **"한 번이라도 사람이 놓친 것은 다음 run에서 도구가 자동으로 막는다."**

---

## 4. 운영 데이터로 본 v2.x

다시 실전 모듈에 돌렸을 때 나온 `audit_summary.json`이다.

```json
{
  "run_id": "8ca340c0-b26d-4ce4-8059-0b148ad70847",
  "run_label": "20260227-api-svc-module-rerun2",
  "snapshot_scope": "module",
  "repo_head": "f42e318a...",
  "fail_count": 0,
  "quarantine": [],
  "skips": [],
  "unknown_count": 0,
  "decompile_status": "done"
}
```

설계 시점에 가장 신경 쓴 두 줄은 `run_label`과 `snapshot_scope`다. 형식은 `YYYYMMDD-<repo>-<scope>[-<suffix>]`로 강제되고 (runner 정규식: `^[0-9]{8}-.+-[A-Za-z0-9_-]+$`), 다른 포맷이면 시작조차 안 한다. 위 `rerun2`처럼 끝에 식별자를 더 붙여 같은 날 같은 모듈의 재실행을 구분할 수 있다. 라벨이 강제되면 같은 run을 두 번 만들 수 없고, 비교 가능한 단위가 생긴다. `snapshot_scope`는 계획 용어 `module-scoped` / `repo-wide`를 메타데이터에서 짧게 `module` / `repo`로 저장한다 (디컴파일 변종은 `decompiled-module`).

같은 run의 슬라이스 품질 리포트.

```json
{
  "total_slices": 8,
  "sample_rate": 0.05,
  "sampled_count": 1,
  "average_score": 100.0
}
```

5% 샘플로 1개를 자동 채점했고, 잘림(truncation) 마커가 0. v2.5에서 추가한 slice quality audit의 산출물이다. 한 번이라도 score가 임계치 아래로 떨어지면 알람이 뜨도록 묶여 있다.

코드 검색 엔진은 zoekt를 1차로 쓰고 rg를 폴백으로 두는데, 같은 리포지토리에서 둘을 벤치마크한 결과는 다음과 같았다.

| 케이스 | rg 시간(s) | zoekt 시간(s) | 동일 hit 수 | 동일 토큰 추정 |
|--------|------------|----------------|------------|----------------|
| 역직렬화 패턴 | 7.37 | 0.53 | 12640 | 27,283 |
| jsonio type deser | 6.96 | 0.38 | 1507 | 13,478 |
| padding oracle | 7.17 | 0.37 | 3135 | 23,366 |

합계로 **시간 94.02% 단축, hit 수와 슬라이스 토큰 추정치는 동일.** 도구 선택이 *발견되는 것*을 바꾸지는 않지만, 운영 가능성 — 매번 돌릴 수 있느냐 — 을 결정한다.

fuzz gate의 한 항목(인증 헤더 변조)은 5개 seed를 0.764초에 돌리고 결과를 candidate ID에 묶었다. 솔직히 적자면 — 같은 coverage JSON에서 `covered_functions_count`와 `covered_basic_blocks_count`는 `null`이다. HTTP 레벨 fuzz는 호스트 측 instrumentation 없이는 함수/블록 커버리지를 알 수 없기 때문이다. 그래서 v2.0의 "command line / seed / coverage / crash / repro" 최소 evidence 세트 중 이 단계에서 채워지는 건 cmd/seed/time/대상 URL/요청 로그까지다. **불완전한 기록도 기록 자체의 존재가 다음 run의 비교 baseline이 된다** — 이게 fuzz gate를 운영 가능한 자리에 두는 v2.5/v2.6의 절충이다.

---

## 5. 교훈: 구조는 미스를 흡수할 때만 살아남는다

세 가지를 추렸다.

**(1) 약속한 항목은 미스의 출발선이다.**
v2.0이 약속한 다섯 가지는 다 맞는 말이었다. 그런데 막상 운영을 해 보니, 진짜 문제는 약속 밖에 있었다. 약속을 줄이는 게 답은 아니다. 약속의 경계를 명시하는 게 답이다. snapshot_scope=`module`이라는 약속이 sibling 모듈을 못 보게 한다는 걸 이름으로 드러내는 것 — 그게 v2.7이 한 일이다.

**(2) 미스는 사람의 메모로 남기면 안 된다. 도구로 남겨야 한다.**
"다음에는 data-svc도 같이 보자"라고 기억하는 운영자는 한 명뿐이고, 그 사람이 휴가 가면 끝난다. runner의 step `[6.5]`로 새기면 누가 돌려도 같은 검사가 돈다. 미스가 도구에 흡수되지 않은 상태를 나는 "스코프 부채"라고 부른다.

**(3) 도구의 신뢰는 도구의 자기 기록에서 나온다.**
`run_id`, `snapshot_scope`, `decompile_status`, `edge_source/confidence`, `unknown_*` 사유, slice 점수, 디컴파일 waiver — 이 모든 게 같은 state 디렉터리 안의 SQLite 메타데이터 + JSON 증적 파일들로 묶이지 않으면 "이 진단이 무엇을 본 진단인지" 누구도 답할 수 없다. CI가 그 summary JSON을 파싱해 통과 여부를 결정하는 순간, 진단은 처음으로 "재현 가능한 공정"이 된다.

3편에서 나는 클러스터링이 "탐지를 행동 가능하게 만든다"고 썼다. 이번 글에서 한 줄을 더 보태고 싶다.

> **워크플로우는 자신이 무엇을 놓쳤는지 기록할 수 있을 때만 다음에도 살아남는다.**

---

## 6. 끝맺으며

이번 글의 v2.0~v2.8 모두 [oh-my-secuaudit](https://github.com/windshock/oh-my-secuaudit) 저장소의 `sec-audit-static` 스킬 안에 있다. 운영자가 직접 보는 단일 진입점은 하나다 — `tools/scripts/run_static_audit.sh`. 그 안에 8번의 보강이 모두 들어 있다.

다음 진단에서 또 다른 미스가 나올 것이다. 그건 거의 확실하다. 그때 v2.9가 추가될 것이다. 약속한 v2.0의 다섯 가지는 변하지 않겠지만, runner는 한 줄씩 길어질 것이다.

### 짧은 후기 — 외부 생태계가 도착하고 있다

글을 쓰면서 두 개의 외부 도구를 봤다. [Trail of Bits **trailmark**](https://github.com/trailofbits/trailmark)는 tree-sitter + rustworkx로 21개 언어의 코드를 노드/엣지 그래프로 만들고, 엣지에 `certain / inferred / uncertain` 신뢰도를 붙인다 — sec-audit-static의 edge tier와 거의 1:1로 매칭되는 모델이다. `augment_sarif()`로 Semgrep finding을 그래프에 머지하고 `entrypoint_paths_to()`로 진입점→sink 경로를 뽑는다. Joern CPG가 Kotlin/디컴파일 Java 혼합에서 깨지는 자리를 tree-sitter로 우회한다. 별도 트랙의 [colbymchenry **codegraph**](https://github.com/colbymchenry/codegraph)는 AI 코딩 에이전트용 pre-indexed 그래프인데, 보안 도메인은 아니지만 에이전트의 grep/탐색 호출을 평균 92%(특정 케이스에서 94%) 줄인다는 벤치마크가 있다.

두 도구 다 진짜 변수 단위 taint backward/forward slicing은 풀지 않는다 — 거기까진 여전히 line-window가 현실적 답이다. 하지만 v2.0이 약속한 항목 중 손으로 만든 부분의 일부가 외부에서 공급되기 시작했다는 신호로는 충분하다. **다음 v2.9는 새 detector 추가가 아니라 Joern step을 Trailmark로 부분 대체하는 일이 될지도 모른다** — 그게 합리적이라면.

이게 내가 도달한 진단 도구의 정의다. **자기 자신을 진단할 수 있는 도구만 다음 진단까지 살아남는다.** 그리고 그 도구의 부품은 — 다행히 — 점점 더 외부에서 사 올 수 있게 되고 있다.
