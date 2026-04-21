# Present TTS 구축 계획

## 목표

`presentation: true` 글의 Present 모드에서 브라우저가 **현재 슬라이드 텍스트를 직접 읽는 기능**을 추가한다.

이 계획의 기본 전제는 다음과 같다.

- 서버 TTS API를 호출하지 않는다.
- 브라우저 내장 `speechSynthesis`를 기본 구현으로 삼지 않는다.
- 클라이언트에서 JS + Worker + WASM/WebGPU + 모델 파일 조합으로 추론한다.
- 첫 버전은 **Present 전용**, **수동 재생**, **현재 슬라이드만 낭독**으로 제한한다.

## 왜 이 구조가 맞는가

현재 Present 모드는 이미 클라이언트에서 동적으로 슬라이드를 조립한다.

- 진입/크롬/버튼 생성: `static/js/presentation/mode-switcher.js`
- 슬라이드 생성: `static/js/presentation/slide-splitter.js`
- Present 토글 UI: `layouts/_default/single.html`
- Present 전용 스크립트 로드: `layouts/partials/presentation-footer.html`

즉 TTS도 같은 계층에 붙이는 것이 가장 자연스럽다.

- Present 크롬에 버튼을 추가할 수 있다.
- 현재 활성 Reveal 슬라이드에서 텍스트를 추출할 수 있다.
- 정적 블로그 구조를 유지한 채 기능을 확장할 수 있다.

## 범위

### 포함

- Present 크롬에 `Play`, `Stop`, `Replay` 버튼 추가
- 현재 활성 슬라이드 텍스트 추출
- TTS 엔진 로더/상태 관리
- Worker 기반 추론
- WebGPU 우선, WASM fallback
- 사용자 첫 클릭 시 lazy-load
- 슬라이드 변경 시 재생 중단

### 제외

- Read 모드 TTS
- 전체 글 연속 낭독
- 자동 재생
- 서버 추론
- 저장/다운로드 기능
- 한국어/영어 모두 고품질 보장

## 1차 구현 목표

첫 버전의 성공 기준은 아래와 같다.

1. Present 모드에서 버튼이 보인다.
2. 사용자가 `Play`를 누르면 현재 슬라이드 텍스트만 읽는다.
3. 슬라이드가 바뀌면 기존 재생은 즉시 중단된다.
4. 같은 세션에서 두 번째 재생부터는 초기 로딩 시간이 줄어든다.
5. WebGPU가 안 되면 WASM으로 내려가고, 둘 다 실패하면 명확한 에러 상태를 보여준다.

## 권장 아키텍처

### UI 계층

파일 후보:

- `static/js/presentation/mode-switcher.js`
- `static/css/presentation.css`

역할:

- Present deck chrome에 TTS 제어 버튼 추가
- 로딩/재생/오류 상태 표시
- Reveal 현재 슬라이드 인덱스와 TTS 상태 동기화

### 텍스트 추출 계층

파일 후보:

- `static/js/presentation/tts-text.js`

역할:

- 현재 활성 슬라이드 `section`에서 읽을 텍스트만 추출
- 아래 요소는 읽기 규칙을 별도로 둔다.
  - heading
  - paragraph
  - list
  - blockquote
  - code block
  - image alt/caption

초기 규칙:

- 제목은 읽는다.
- 문단/리스트는 읽는다.
- 코드 블록은 첫 버전에서는 생략하거나 매우 짧게 요약한다.
- `continued` 힌트, 크롬 UI 텍스트, 숨김 요소는 제외한다.

## TTS 엔진 계층

파일 후보:

- `static/js/presentation/tts-engine.js`
- `static/js/presentation/tts-worker.js`

역할:

- 엔진 초기화
- 모델 lazy-load
- 음성 합성 요청
- 취소/중단
- 상태 이벤트 발행

권장 인터페이스:

```js
class PresentationTTS {
  async preload() {}
  async speak(text, opts = {}) {}
  stop() {}
  destroy() {}
  getState() {}
}
```

## 런타임 전략

### 기본 방향

- 메인 스레드에서 직접 추론하지 않는다.
- Worker에서 모델 로드 및 추론을 수행한다.
- 메인 스레드는 UI와 오디오 재생만 담당한다.

### 추론 백엔드

- 1순위: WebGPU
- 2순위: WASM

### 로딩 전략

- Present 진입 시 자동 preload 하지 않는다.
- 첫 `Play` 클릭 시 로드 시작
- 같은 페이지 내 재생은 인스턴스 재사용

## 모델 전략

첫 버전에서는 **엔진 추상화와 UI를 먼저 만들고 모델 결합은 뒤에 한다.**

이유:

- 모델 선택은 바뀔 가능성이 크다.
- 한국어 품질은 별도 검증이 필요하다.
- repo에 대형 모델 파일을 바로 커밋하면 관리가 어려워진다.

### 권장 순서

1. mock 엔진
2. 실제 로컬 추론 엔진
3. 언어별 모델/보이스 선택

### 모델 파일 운영 원칙

- 첫 버전에서는 모델 바이너리를 repo에 직접 넣지 않는다.
- 원격 호스팅 또는 별도 배포 경로를 먼저 검토한다.
- 모델 고정이 끝난 뒤에만 `static/` 포함 여부를 판단한다.

## 구현 단계

### Phase 1. 스캐폴딩

- `mode-switcher.js`에 TTS 버튼 슬롯 추가
- TTS 상태 표시 UI 추가
- 현재 슬라이드 텍스트 추출 유틸 추가
- mock 엔진 연결

산출물:

- 버튼 클릭 시 추출 텍스트가 콘솔에 출력되거나 mock 재생 상태로 전환

### Phase 2. 실제 오디오 파이프라인

- Worker 생성
- 엔진 상태 머신 구현
- 합성 결과를 `Blob` 또는 `AudioBuffer`로 받아 재생
- `Play`, `Stop`, `Replay` 동작 연결

산출물:

- 현재 슬라이드 오디오 재생 가능

### Phase 3. Reveal 연동 고도화

- `slidechanged` 이벤트에서 자동 stop
- 재생 중 다른 슬라이드로 이동 시 상태 정리
- cover/infographic 슬라이드는 기본적으로 낭독 제외

산출물:

- 슬라이드 이동과 TTS 상태 불일치 제거

### Phase 4. 품질 개선

- 한국어/영어 언어 감지 또는 페이지 언어 기반 보이스 분기
- 긴 문단 chunking
- 코드 블록/표/인용문 읽기 정책 조정
- preload 힌트/캐시 전략 보정

## 대상 파일

예상 수정 파일:

- `layouts/_default/single.html`
- `static/js/presentation/mode-switcher.js`
- `static/css/presentation.css`

예상 신규 파일:

- `static/js/presentation/tts-engine.js`
- `static/js/presentation/tts-worker.js`
- `static/js/presentation/tts-text.js`

검증 파일 후보:

- `e2e/presentation-mobile.spec.ts`
- 신규 E2E 또는 최소 smoke test 추가 가능

## UX 원칙

- 자동 재생 금지
- 로딩 상태를 숨기지 않음
- 실패 시 조용히 무시하지 않고 명시적 상태 표시
- 모바일에서도 기존 Present chrome을 깨지 않도록 버튼 수 최소화

권장 버튼 구성:

- `Play`
- `Stop`
- `Replay`

첫 버전에서는 속도/보이스 셀렉터를 넣지 않는다.

## 주요 리스크

### 1. 한국어 품질

브라우저 친화적 예시는 영어 중심이 많다. 한국어 품질이 기대에 못 미칠 수 있다.

대응:

- 엔진 인터페이스를 먼저 만들고, 모델은 교체 가능하게 유지

### 2. 초기 로딩 지연

모델 다운로드와 초기화 비용이 크면 Present UX를 해칠 수 있다.

대응:

- 첫 클릭 lazy-load
- 경량 모델/양자화 우선

### 3. UI 정합성

Present는 모바일 대응과 safe-area 조정이 이미 섬세하다. 버튼을 무심코 추가하면 레이아웃이 깨질 수 있다.

대응:

- chromeEnd 또는 chromeStart에 최소 폭 기준으로만 배치
- 좁은 화면에서 텍스트 버튼보다 아이콘+짧은 label 고려

### 4. 본문 텍스트 품질

일부 포스트에는 깨진 인용 문자열이나 비정상 링크 텍스트가 남아 있다. TTS가 이를 그대로 읽으면 품질이 크게 나빠진다.

대응:

- `tts-text.js`에서 노이즈 제거 규칙 추가
- 장기적으로 본문 정리 필요

## 수용 기준

아래를 만족하면 1차 완료로 본다.

- `presentation: true` 글에서 Present 진입 후 TTS 버튼이 보인다.
- 현재 슬라이드 텍스트만 읽는다.
- 슬라이드 이동 시 재생이 멈춘다.
- WebGPU 미지원 환경에서도 기능이 완전히 죽지 않는다.
- 모바일 세로 화면에서 chrome이 기존보다 과도하게 깨지지 않는다.

## 구현 순서 제안

실제 작업은 아래 순서를 권장한다.

1. `mode-switcher.js`에 TTS 컨트롤 자리 만들기
2. `tts-text.js`로 현재 슬라이드 텍스트 추출기 만들기
3. mock 엔진으로 UI/상태 흐름 먼저 검증
4. Worker 기반 실제 엔진 연결
5. 모델/보이스 선택 고도화

## 보류 항목

아래는 첫 릴리스에서 보류한다.

- 전체 글 자동 내레이션
- 슬라이드 자동 넘김과 TTS 동기화
- 문장별 하이라이트
- 파일 저장/공유
- 다중 보이스 선택 UI
- 포스트 frontmatter로 음성별 세부 제어

## 메모

이 기능은 “Present 보조 기능”으로 시작하는 것이 맞다. 이 프로젝트의 핵심은 Hugo 정적 블로그와 Present 모드의 가독성 유지이므로, TTS는 기본 경험을 해치지 않는 범위에서 점진적으로 붙여야 한다.
