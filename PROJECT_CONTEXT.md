# PROJECT_CONTEXT.md

이 파일은 **새 채팅/새 세션에서 AI에게 프로젝트 구조를 한 번에 설명**하기 위한 “컨텍스트 시드”입니다.

- 루트의 `AGENTS.md`가 있으면, 해당 파일의 간단한 작업 규칙을 먼저 따르고 이 문서를 상세 참조로 사용합니다.

- 시작할 때 이렇게만 말하면 됩니다: `@PROJECT_CONTEXT.md 이 기준으로 작업하자. 오늘 할 일: ...`

---

## 프로젝트 개요

- **정적 사이트**: Hugo
- **테마**: PaperMod (서브모듈)
- **배포**: GitHub Pages 스타일로 `docs/` 디렉토리에 빌드 산출물을 생성해 푸시
- **멀티 언어**: `en` / `ko` (각각 `content/en`, `content/ko`)
- **블로그 소스 글 구조**: `content/en/post/`와 `content/ko/post/`를 기본 작업 대상으로 사용
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

레포의 `static/legacy/`에는 과거 GitHub Pages에서 직접 호스팅하던 보안 PoC/exploit 파일이 보관되어 있습니다. 현재 Hugo 기준의 소스는 **`content/`**를 사용합니다.

---

## 포스트 작성 규칙 (권장)

- **경로**: `content/<lang>/post/<YYYY-MM-DD>-<slug>.md`
- **Frontmatter**: YAML `---` 블록 사용
  - 자주 쓰는 필드(예시):
    - `title`, `date`, `draft`
    - `featured`, `tags`, `categories`, `description`
    - `image`: 대표 이미지(썸네일/OG 등) 경로 (예: `/images/...`)
  - **`description`은 모든 포스트에 필수.** 없으면 홈페이지 목록에서 본문 내용(PDF shortcode 텍스트 등)이 발췌로 노출됨.
- **리드 문장 규칙**:
  - 본문 **첫 1~2문장**을 검색/공유 맥락에서 보이는 핵심 요약으로 취급합니다.
  - Google은 `description` 대신 본문 첫 문단의 visible text를 스니펫으로 사용할 수 있으므로, 첫 문장에 핵심 주장과 검색 의도를 직접 넣습니다.
  - LinkedIn/X 등에 링크를 붙이거나 글을 인용할 때도 첫 문장 요약이 그대로 재사용되기 쉬우므로, 글의 punch line을 서두에 둡니다.
  - 운영 원칙: **`description`만 다듬고 첫 문장을 약하게 두지 말 것.**
- **새 글 기본 뼈대**: `archetypes/post.md`

---

## 홈 화면 “3분류(🔥)” 큐레이션 규칙

이 레포의 홈 화면 상단 3개 섹션(예: *A Mind That Dissects Systems*, *Trust and Culture Beyond Technology*, *Code That Fixes, Not Just Runs*)은
일반 `categories`가 아니라 **frontmatter의 `featured` + `tags` 토큰**으로 분류됩니다.

- **전제 조건**: `featured: true` 인 글만 후보가 됩니다.
- **중요**: `featured: true`를 켠 글은 내용을 읽고 아래 3개 중 맞는 **대표 분류 태그를 반드시 넣어야** 합니다.
- `featured`만 켜고 분류 태그를 넣지 않으면 첫 페이지 상단 3개 섹션에 정상적으로 잡히지 않습니다.
- **분류 토큰(정확히 이 문자열이어야 함)**:
  - **A Mind That Dissects Systems**: `tags`에 `"Mind"`
  - **Trust and Culture Beyond Technology**: `tags`에 `"TrustAndCulture"`
  - **Code That Fixes, Not Just Runs**: `tags`에 `"Code"`
- **실무 분류 기준**:
  - **`Mind`**: 구조 분석, 기술 해부, 공격/방어 메커니즘 해석, 시스템 동작 원리
  - **`TrustAndCulture`**: 정책, 신뢰, 조직 문화, 거버넌스, 사회적/제도적 관점
  - **`Code`**: 구현, 자동화, 도구, PoC, 엔지니어링 실행과 개선
- 기본적으로 위 3개 중 **대표 분류 1개를 우선 선택**합니다.

참고: 구현은 `layouts/_default/list.html`에 있습니다.

---

## 이중 언어 자산 관리 규칙

EN/KO 포스트는 **완전히 다른 자산**을 사용합니다.

한 언어 버전을 수정할 때 반드시 아래 4개를 모두 확인합니다:

| # | 항목 | 확인 내용 |
|---|---|---|
| 1 | YouTube shortcode | 해당 언어 전용 영상 ID |
| 2 | pdfembed / PDF 링크 | 해당 언어 전용 PDF 파일 경로 |
| 3 | frontmatter `image` | 해당 언어 PDF의 첫 페이지 프리뷰 이미지 |
| 4 | frontmatter `description` | 해당 언어에 맞는 설명 |

- 한쪽 언어 글을 복사해서 다른 언어 글을 만들 때, 위 4개를 **전부 교체**합니다.
- 다른 언어의 YouTube ID, PDF 경로, 이미지가 남아 있으면 잘못된 것입니다.

---

## SEO 구조

- **사이트맵**: `/sitemap.xml`(sitemapindex) → `/en/sitemap.xml` + `/ko/sitemap.xml`
- **Search Console**: `/sitemap.xml` 하나만 제출. `/en/index.xml` 등 RSS는 제출하지 않음.
- **루트 `/`**: 언어 리다이렉트 페이지. `noindex` 유지 (콘텐츠 없음).
- **robots.txt**: `Allow: /`, 사이트맵 3개 선언.
- `layouts/_default/sitemap.xml`은 `.RegularPages`만 순회 (`range .Sites` 사용 금지).

---

## YouTube 삽입 규칙 (이 프로젝트 관례)

- **기본 방식**: Hugo shortcode 사용
  - 예) `{{< youtube VIDEO_ID >}}`
- **입력값**: 전체 URL보다 **YouTube video ID**만 넣는 것을 기본 규칙으로 사용
  - 예) `https://www.youtube.com/watch?v=kqTopBJcDv0` 전체를 넣는 대신 `kqTopBJcDv0`
- **기본 정책**: 새 글에서는 raw iframe보다 shortcode를 우선 사용

---

## PDF 첨부/임베드 규칙 (이 프로젝트 관례)

- **PDF 저장 위치**: `static/files/<name>.pdf`
  - 글에서는 `/files/<name>.pdf`로 링크/참조
- **PDF 뷰어**: `static/pdfjs/single.html`
  - 글에서 iframe으로 사용: `/pdfjs/single.html?file=/files/<name>.pdf#page=1`
- **PDF 대표 이미지(1p 프리뷰)**:
  - 저장 위치: `static/images/pdf-previews/<name>_p1.png`
  - 또는 `static/images/pdf-previews/<name>_p1.webp`
  - 글 frontmatter의 `image`에 지정: `/images/pdf-previews/<name>_p1.png` 또는 `.webp`
  - **새 PDF 기반 글은 첫 페이지 프리뷰 이미지를 frontmatter `image`로 연결하는 것을 기본 규칙으로 사용**
- **글 본문 기본 패턴**:
  - 새 글에서는 raw iframe 대신 `pdfembed` shortcode를 우선 사용
  - 예) `{{< pdfembed file="/files/example.pdf" lang="ko" id="pdfjs-example-ko" >}}`
  - shortcode를 쓰지 않을 때는 `Open (new tab)` 링크, iframe, `pdfjs-resize` script 순서를 유지
  - iframe id는 보통 `pdfjs-<slug>-<lang>` 형태 사용
- **레거시 경로**:
  - 기존 글에는 `/pdf/...` 경로가 일부 남아 있음
  - **새 글/새 작업은 `/files/...` 경로를 기본값**으로 사용

---

## 로컬 실행 / 빌드 / 배포

### 로컬 개발 서버

- `start.sh`는 아래를 한 번에 실행합니다:
  - `hugo --gc --cleanDestinationDir`
  - `hugo -D -d docs`
  - `hugo server -D --environment development`
- 레이아웃, shortcode, 임베드, 포스트 구조를 수정했다면 로컬 Hugo로 확인하는 것을 기본 규칙으로 사용합니다.
- 빠른 빌드 검증은 임시 디렉터리 대상으로 수행할 수 있습니다:
  - `tmpdir="$(mktemp -d)"`
  - `hugo --gc --cleanDestinationDir --destination "$tmpdir"`

### 배포

이 레포의 기본 배포 방식은 **수동 루틴**을 표준으로 합니다. (전역 Git 설정 변경을 피하고, 커밋 내용을 통제하기 위함)

- **수동 배포 루틴(표준)**:
  - `hugo --gc --cleanDestinationDir`
  - `hugo --gc --minify --cleanDestinationDir -d docs --environment production`
  - (필요 시) `./img2webp.sh`
  - `find docs -type f -name "*.html" -not -path "docs/index.html" -exec sed -i '' 's/content="noindex"/content="index"/g' {} +`
  - `git add -A`
  - `git commit -m "<message>"`
  - `git push origin master`
- **스크립트 배포(권장 자동화)**:
  - clean working tree 상태에서 `./deploy.sh "commit message"` 실행
  - 이 스크립트는 Hugo 빌드, 선택적 WebP 변환, `docs/`/`public/` 스테이징, 커밋, 푸시를 처리합니다.

#### `deploy.sh`

`deploy.sh "<commit message>"`는 표준 배포 방법입니다.

- clean working tree를 요구합니다.
- Hugo 빌드 → WebP 변환 → robots fix → 스테이징 → 커밋 → 푸시 순서로 실행.
- `docs/index.html`(루트 리다이렉트)은 `noindex` 유지 (robots fix에서 제외).
- working tree가 이미 dirty하면 수동 배포를 사용합니다.

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
