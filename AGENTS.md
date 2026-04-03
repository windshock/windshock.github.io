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
- **`description`은 모든 포스트에 필수입니다.** 없으면 홈페이지 목록에서 PDF shortcode 텍스트 등 본문 내용이 발췌로 노출됩니다.
- 홈 상단 3분류 큐레이션은 일반 `categories`가 아니라 `featured: true`와 `tags`의 `Mind`, `TrustAndCulture`, `Code` 토큰으로 결정됩니다.
- **`featured: true`를 켰다면 글 내용을 직접 분석해서 위 3개 중 가장 맞는 분류 태그를 반드시 넣습니다.** `featured`만 켜고 분류 태그를 넣지 않으면 첫 페이지 3개 섹션에 정상 노출되지 않습니다.
- 분류 기준 기본값:
  - `Mind`: 구조 분석, 취약점/시스템 해부, 기술 메커니즘 설명
  - `TrustAndCulture`: 정책, 거버넌스, 조직 문화, 신뢰, 사회적 영향
  - `Code`: 구현, 자동화, 도구, 실전 코드/PoC, 엔지니어링 실행
- 기본적으로 한 글에는 위 3개 중 **대표 분류 1개를 우선 선택**합니다.
- base64 인라인 이미지는 지양하고 `static/images/...`에 파일로 둔 뒤 경로로 참조합니다.
- 새 글의 기본 골격은 `archetypes/post.md`를 참고합니다.

## 이중 언어 자산 체크리스트 (필수)

EN/KO 포스트는 **완전히 다른 자산**을 사용합니다. 한 언어 버전을 수정할 때 반드시 아래 4개 항목을 모두 확인합니다:

1. **YouTube shortcode** — 해당 언어 전용 영상 ID인지 확인 (en/ko 영상이 다를 수 있음)
2. **pdfembed / PDF 링크** — 해당 언어 전용 PDF 파일인지 확인
3. **frontmatter `image`** — 해당 언어 PDF의 첫 페이지 프리뷰 이미지인지 확인
4. **frontmatter `description`** — 해당 언어에 맞는 설명인지 확인

- 한쪽 언어 글을 복사해서 다른 언어 글을 만들 때, 위 4개를 반드시 전부 교체합니다.
- 다른 언어 글의 YouTube ID, PDF 경로, 이미지가 남아 있으면 **잘못된 것**입니다.
- PDF 프리뷰 이미지 생성: `pdftoppm -png -r 300 -f 1 -l 1 <pdf> <prefix>` → `magick <png> -resize 1200x -quality 80 <webp>`

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

## 배포 규칙

- 기본 배포 절차는 clean working tree에서 `./deploy.sh "commit message"`를 사용하는 것입니다.
- working tree가 이미 dirty하면 수동 배포: Hugo 빌드 → robots fix → `git add -A` → `git commit -m` → `git push origin master`.
- `deploy.sh`는 `docs/index.html`(루트 리다이렉트)의 `noindex`를 유지합니다. 이 파일은 빈 리다이렉트 페이지이므로 검색엔진 색인 대상이 아닙니다.
- 사용자가 명시적으로 요청하지 않으면 임의로 커밋/푸시하지 않습니다.

## SEO 규칙

- **사이트맵**: `/sitemap.xml`(sitemapindex) → `/en/sitemap.xml` + `/ko/sitemap.xml` 구조. Search Console에는 **`/sitemap.xml` 하나만** 제출.
- **robots.txt**: `Allow: /`로 전체 허용. 사이트맵 3개를 선언하지만 Search Console 제출은 루트 1개로 충분.
- **루트 `/` 페이지**: Hugo가 생성하는 언어 리다이렉트 페이지. `noindex` 유지 (콘텐츠 없음).
- **`/en/index.xml`, `/ko/index.xml`**: RSS 피드임. 사이트맵이 아니므로 Search Console에 제출하지 않음.
- `layouts/_default/sitemap.xml`에서 `.RegularPages`를 사용해 현재 언어 페이지만 포함. `range .Sites`는 사용 금지 (언어 혼합됨).

## GitHub 반영 규칙

- 사용자가 GitHub 반영을 요청하면 변경 범위를 먼저 확인하고, unrelated change를 섞지 않습니다.
- 사용자가 명시적으로 요청하지 않으면 임의로 커밋/푸시하지 않습니다.

## 새 채팅/새 세션

- 사용자가 새 채팅에서 빠르게 시작하고 싶다면 `@PROJECT_CONTEXT.md 이 기준으로 작업`처럼 지시하면 됩니다.
