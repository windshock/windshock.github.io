# PROJECT_CONTEXT.md

이 파일은 **새 채팅/새 세션에서 AI에게 프로젝트 구조를 한 번에 설명**하기 위한 “컨텍스트 시드”입니다.

- 시작할 때 이렇게만 말하면 됩니다: `@PROJECT_CONTEXT.md 이 기준으로 작업하자. 오늘 할 일: ...`

---

## 프로젝트 개요

- **정적 사이트**: Hugo
- **테마**: PaperMod (서브모듈)
- **배포**: GitHub Pages 스타일로 `docs/` 디렉토리에 빌드 산출물을 생성해 푸시
- **멀티 언어**: `en` / `ko` (각각 `content/en`, `content/ko`)
- **HTML 삽입 허용**: `config.toml`에서 Goldmark `unsafe=true` (iframe 등 가능)

---

## 핵심 디렉토리 구조 (실제로 자주 만지는 곳)

- **`content/en/post/`**: 영문 포스트
- **`content/ko/post/`**: 한글 포스트
- **`static/`**: 정적 파일 루트 (사이트에서 `/`로 노출)
  - 예) `static/pdfjs/single.html` → 사이트에서 `/pdfjs/single.html`
  - 예) `static/images/...` → 사이트에서 `/images/...`
  - 예) `static/files/...` → 사이트에서 `/files/...`
- **`layouts/`**: Hugo 템플릿 오버라이드/커스텀
  - `layouts/partials/head.html`: 메타/스타일/스크립트 로딩
  - `layouts/partials/extend_footer.html`: giscus, swiper 등 footer 커스텀 JS
- **`docs/`**: 배포용 빌드 산출물 (GitHub Pages)
- **`public/`**: 로컬 빌드 산출물 (기본 hugo output)

레포에 `_posts/` 같은 과거 구조도 있지만, 현재 Hugo 기준의 소스는 **`content/`**를 사용합니다.

---

## 포스트 작성 규칙 (권장)

- **경로**: `content/<lang>/post/<YYYY-MM-DD>-<slug>.md`
- **Frontmatter**: YAML `---` 블록 사용
  - 자주 쓰는 필드(예시):
    - `title`, `date`, `draft`
    - `tags`, `categories`, `description`
    - `image`: 대표 이미지(썸네일/OG 등) 경로 (예: `/images/...`)

---

## 홈 화면 “3분류(🔥)” 큐레이션 규칙

이 레포의 홈 화면 상단 3개 섹션(예: *A Mind That Dissects Systems*, *Trust and Culture Beyond Technology*, *Code That Fixes, Not Just Runs*)은
일반 `categories`가 아니라 **frontmatter의 `featured` + `tags` 토큰**으로 분류됩니다.

- **전제 조건**: `featured: true` 인 글만 후보가 됩니다.
- **분류 토큰(정확히 이 문자열이어야 함)**:
  - **A Mind That Dissects Systems**: `tags`에 `"Mind"`
  - **Trust and Culture Beyond Technology**: `tags`에 `"TrustAndCulture"`
  - **Code That Fixes, Not Just Runs**: `tags`에 `"Code"`

참고: 구현은 `layouts/_default/list.html`에 있습니다.

---

## PDF 첨부/임베드 규칙 (이 프로젝트 관례)

- **PDF 저장 위치**: `static/files/<name>.pdf`
  - 글에서는 `/files/<name>.pdf`로 링크/참조
- **PDF 뷰어**: `static/pdfjs/single.html`
  - 글에서 iframe으로 사용: `/pdfjs/single.html?file=/files/<name>.pdf#page=1`
- **PDF 대표 이미지(1p 프리뷰)**:
  - 저장 위치: `static/images/pdf-previews/<name>_p1.png`
  - 글 frontmatter의 `image`에 지정: `/images/pdf-previews/<name>_p1.png`

---

## 로컬 실행 / 빌드 / 배포

### 로컬 개발 서버

- `start.sh`는 아래를 한 번에 실행합니다:
  - `hugo --gc --cleanDestinationDir`
  - `hugo -D -d docs`
  - `hugo server -D --environment development`

### 배포

- `deploy.sh "<commit message>"`는 다음을 수행합니다:
  - Hugo 빌드(`docs/`로 production 빌드 포함)
  - `img2webp.sh` 실행(이미지 변환 + 마크다운 링크 치환)
  - `git add . && git commit && git push origin master`

**주의**:
- `deploy.sh` 내부에 `git config --global ...` 변경이 포함되어 있습니다. (개인 환경 전역 설정이 바뀜)
- `deploy.sh`는 `find ... -exec sed ...`로 대량 파일을 수정합니다.
- 따라서 “배포” 목적이 명확할 때만 사용합니다.

---

## 이미지(WebP) 변환 스크립트

- `img2webp.sh`
  - `static/` 아래의 `jpg/jpeg/png`를 `.webp`로 변환(있거나 최신이면 스킵)
  - `content/` 아래의 모든 `*.md`에서 이미지 확장자를 `.webp`로 치환(`sed -i`)

**주의**: 실행하면 마크다운 다수 파일이 변경될 수 있습니다.

---

## 자주 발생하는 이슈 / 주의사항

- **마크다운에 base64 인라인 이미지**를 넣으면 파일이 매우 커져(수십~수백 KB~MB) 관리/리뷰/도구 사용이 어려워집니다.
  - 이 프로젝트에서는 보통 `static/images/...`에 파일로 두고 경로로 링크합니다.
- `docs/`/`public/`는 **생성물**이므로, 소스 수정은 원칙적으로 `content/`, `static/`, `layouts/`, `config.toml`에서 합니다.

---

## “AI에게 빠르게 시키는” 프롬프트 템플릿

아래처럼 시작하면 가장 빠릅니다.

```
@PROJECT_CONTEXT.md

오늘 할 일:
- (1) ...
- (2) ...

제약:
- 배포/커밋은 하지 말 것(또는 해도 됨)
- 파일 경로는 반드시 이 관례를 따를 것
```

