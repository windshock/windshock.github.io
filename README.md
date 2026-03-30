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
