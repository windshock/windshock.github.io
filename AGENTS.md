# AGENTS.md

이 저장소는 Hugo + PaperMod 기반 블로그입니다.

작업 시작 전 우선 `README.md`와 [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md)를 읽고, 아래 규칙을 기본값으로 따릅니다.
명시적인 사용자 요청이 있으면 그 요청이 우선입니다.

## 기본 작업 규칙

- 소스는 주로 `content/`, `static/`, `layouts/`, `config.toml`에서 수정합니다.
- `docs/`와 `public/`는 생성물이므로 직접 수정하지 않습니다. 필요하면 Hugo 빌드로 재생성합니다.
- 이 블로그는 **이중 언어 구조**입니다. 소스 글은 `content/en/post/`와 `content/ko/post/`에 위치합니다.
- 새 포스트 경로는 `content/<lang>/post/<YYYY-MM-DD>-<slug>.md`를 기본으로 합니다.
- Frontmatter는 YAML `---` 블록을 사용합니다.

## 포스트 작성 관례

- 자주 쓰는 frontmatter 필드는 `title`, `date`, `draft`, `featured`, `tags`, `categories`, `description`, `image`입니다.
- 홈 상단 3분류 큐레이션은 일반 `categories`가 아니라 `featured: true`와 `tags`의 `Mind`, `TrustAndCulture`, `Code` 토큰으로 결정됩니다.
- **`featured: true`를 켰다면 글 내용을 직접 분석해서 위 3개 중 가장 맞는 분류 태그를 반드시 넣습니다.** `featured`만 켜고 분류 태그를 넣지 않으면 첫 페이지 3개 섹션에 정상 노출되지 않습니다.
- 분류 기준 기본값:
  - `Mind`: 구조 분석, 취약점/시스템 해부, 기술 메커니즘 설명
  - `TrustAndCulture`: 정책, 거버넌스, 조직 문화, 신뢰, 사회적 영향
  - `Code`: 구현, 자동화, 도구, 실전 코드/PoC, 엔지니어링 실행
- 기본적으로 한 글에는 위 3개 중 **대표 분류 1개를 우선 선택**합니다.
- base64 인라인 이미지는 지양하고 `static/images/...`에 파일로 둔 뒤 경로로 참조합니다.
- 새 글의 기본 골격은 `archetypes/post.md`를 참고합니다.

## YouTube / PDF 삽입 관례

- YouTube는 원칙적으로 Hugo shortcode `{{< youtube VIDEO_ID >}}`를 사용합니다.
- 전체 YouTube URL이나 raw iframe은 사용자가 따로 요구하지 않는 한 새 글에 기본값으로 쓰지 않습니다.
- PDF 원본은 `static/files/<name>.pdf`에 둡니다.
- **PDF 기반 글이면 첫 페이지 프리뷰 이미지를 반드시** `static/images/pdf-previews/<name>_p1.png` 또는 `.webp`에 두고, frontmatter `image`에 연결합니다.
- 글 안의 PDF 링크는 `/files/<name>.pdf`를 기본으로 사용합니다.
- 새 글의 PDF 섹션은 `{{< pdfembed file="/files/<name>.pdf" lang="en|ko" id="pdfjs-..." >}}` shortcode를 우선 사용합니다.
- iframe id는 `pdfjs-<slug>-<lang>` 형태를 우선 사용합니다.
- 기존 글에 남아 있는 legacy `/pdf/...` 경로는 유지할 수 있지만, 새 작업에는 `/files/...`를 우선합니다.

## 확인 규칙

- `content/`, `layouts/`, `static/`, `config.toml`을 수정했다면 기본적으로 Hugo 빌드 확인을 수행합니다.
- 빠른 확인은 `hugo --gc --cleanDestinationDir --destination <tmpdir>`로 하고, 시각 확인이 필요하면 `./start.sh` 또는 `hugo server -D --environment development`를 사용합니다.
- layout/shortcode/embed 변경은 가능하면 로컬 Hugo로 직접 확인합니다.

## GitHub 반영 규칙

- 사용자가 GitHub 반영을 요청하면 변경 범위를 먼저 확인하고, unrelated change를 섞지 않습니다.
- 기본 배포 절차는 clean working tree에서 `./deploy.sh "commit message"`를 사용하는 것입니다.
- 수동 반영 시에는 Hugo 빌드, `git status` 확인, `git add -A`, `git commit -m`, `git push origin master` 순서를 기본으로 합니다.
- 사용자가 명시적으로 요청하지 않으면 임의로 커밋/푸시하지 않습니다.

## 새 채팅/새 세션

- 사용자가 새 채팅에서 빠르게 시작하고 싶다면 `@PROJECT_CONTEXT.md 이 기준으로 작업`처럼 지시하면 됩니다.
