# windshock.github.io

Hugo + PaperMod 기반의 이중 언어(`en`, `ko`) 블로그입니다.
배포 산출물은 `docs/`에 생성하며, GitHub Pages 스타일로 운영합니다.

## 핵심 구조

- `content/en/post/`: 영문 글
- `content/ko/post/`: 한글 글
- `static/`: PDF, 이미지, 기타 정적 자산
- `layouts/`: Hugo 오버라이드 및 shortcode/partial
- `docs/`: 배포 산출물
- `public/`: 로컬 빌드 산출물

소스 수정은 원칙적으로 `content/`, `static/`, `layouts/`, `config.toml`에서 합니다.
`docs/`와 `public/`는 생성물이므로 직접 편집하지 않습니다.

## 새 글 작성 규칙

- 경로: `content/<lang>/post/<YYYY-MM-DD>-<slug>.md`
- frontmatter: YAML `---`
- 자주 쓰는 필드:
  - `title`, `date`, `draft`, `featured`
  - `tags`, `categories`, `description`, `image`
- 홈 상단 큐레이션은 `featured: true` + `tags`의 `Mind`, `TrustAndCulture`, `Code`로 분류됩니다.
- `featured: true`를 쓴 글은 내용을 보고 3개 중 맞는 대표 분류 태그를 반드시 넣어야 합니다.
  - `Mind`: 구조 분석, 기술 해부, 메커니즘 설명
  - `TrustAndCulture`: 정책, 신뢰, 문화, 거버넌스
  - `Code`: 구현, 자동화, PoC, 엔지니어링 실행

## YouTube / PDF 규칙

- YouTube는 `{{< youtube VIDEO_ID >}}`를 기본으로 사용합니다.
- PDF 원본은 `static/files/<name>.pdf`에 둡니다.
- PDF 기반 글이면 첫 페이지 프리뷰를 `static/images/pdf-previews/<name>_p1.png` 또는 `.webp`로 만들고, frontmatter `image`에 넣는 것을 기본 규칙으로 사용합니다.
- 글 안의 PDF 임베드는 `{{< pdfembed file="/files/<name>.pdf" lang="en|ko" id="pdfjs-..." >}}` shortcode를 우선 사용합니다.

## 로컬 확인

- 개발 서버: `./start.sh`
- 빠른 빌드 확인:

```bash
tmpdir="$(mktemp -d)"
hugo --gc --cleanDestinationDir --destination "$tmpdir"
```

레이아웃, shortcode, 글 삽입 형식을 바꿨다면 로컬 Hugo로 확인하는 것을 기본으로 합니다.

## SEO / 사이트맵 제출

- 사이트맵은 Hugo가 생성하는 기본 구조를 사용합니다.
  - `/sitemap.xml`: sitemapindex
  - `/en/sitemap.xml`, `/ko/sitemap.xml`: 언어별 URL 목록
- Search Console에는 `/sitemap.xml` 하나만 제출합니다.
- `sitemap.sh`와 `indexnow.sh`는 과거 방식이라 실행하지 않습니다.
- 검색엔진 제출이 필요하면 배포 후 별도로 실행합니다:

```bash
GSC_SITE_URL="https://windshock.github.io/" \
GSC_SERVICE_ACCOUNT_FILE="/path/to/service-account.json" \
node scripts/submit-sitemaps.mjs
```

- Search Console이 Domain property라면 `GSC_SITE_URL="sc-domain:windshock.github.io"`를 사용합니다.
- 서비스계정 이메일은 Search Console 속성 사용자로 추가해야 합니다.
- 서비스계정 추가가 막히면 기존 Search Console 소유자 계정의 OAuth access token을 `GSC_ACCESS_TOKEN`으로 넣어 제출할 수 있습니다.
- CI에서는 `GSC_SERVICE_ACCOUNT_JSON`에 서비스계정 JSON 문자열을 넣을 수 있습니다.
- dry-run 확인:

```bash
node scripts/submit-sitemaps.mjs --dry-run
```

- OAuth token 우회 제출 예:

```bash
GSC_SITE_URL="https://windshock.github.io/" \
GSC_ACCESS_TOKEN="<oauth-access-token-with-webmasters-scope>" \
node scripts/submit-sitemaps.mjs --days 1
```

- 참고:
  - Google Sitemaps API: https://developers.google.com/webmaster-tools/v1/sitemaps/submit
  - Google sitemap ping deprecation: https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping

## GitHub 반영

- 표준 배포 스크립트:

```bash
./deploy.sh "commit message"
```

- 전제:
  - clean working tree
  - `master` 브랜치
  - 필요한 경우 `img2webp.sh` 포함
- 수동으로 할 때는 `hugo` 빌드 후 변경 범위를 확인하고 `git add -A`, `git commit -m`, `git push origin master` 순으로 진행합니다.

## AI 작업 문서

- 에이전트 기본 규칙: `AGENTS.md`
- 상세 프로젝트 컨텍스트: `PROJECT_CONTEXT.md`
- 새 글 기본 골격: `archetypes/post.md`
