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
- **첫 1~2문장(lead sentence)은 매우 중요합니다.** Google 스니펫은 `description`만이 아니라 본문 첫 문단의 visible text를 가져가는 경우가 많고, 사용자가 LinkedIn/X 등에 공유할 때도 첫 문장 요약이 그대로 재사용되기 쉽습니다.
- 따라서 글 서두 첫 문장에는 **이 글의 핵심 주장/문제정의/차별점**을 바로 넣습니다. `description`만 고치고 본문 첫 문장을 약하게 두는 방식은 지양합니다.
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

## Present 모드 (`presentation: true`)

- **공유 링크로 바로 슬라이드**: 글 URL에 쿼리 **`?present=1`** 또는 **`?present`**(값 생략)을 붙이면 첫 로드에서 Present가 열린다. 끄려면 **`?present=0`**(또는 `false` / `no`)이면 `localStorage`가 `present`여도 자동 진입하지 않는다. Read로 돌아가면 주소창에서 `present` 쿼리는 `replaceState`로 제거된다.
- **Present 언어 전환**: 상단 크롬에 **한글 / English**를 둔다. `head`의 `link[rel="alternate"][hreflang]`(Hugo `.AllTranslations`)로 상대 언어 URL을 읽고, 현재 언어는 강조만 하고 번역이 없으면 해당 링크를 생략한다. `?present=…`가 있으면 상대 언어 URL에도 붙인다(`carryPresentSearchParam`).
- **모바일 세로·노치**: `visualViewport`로 논리 크기를 잡고, 폭 540px 미만에서는 Reveal 논리 높이 상한을 1200까지 올려 세로 화면을 쓴다. 상단 **in-flow 크롬 바** 높이만큼(`chromeReservePx`, 현재 56px) 뷰포트 높이에서 빼서 논리 크기와 실제 `.reveal` flex 영역이 맞게 한다. **Reveal 5 기본 `scrollActivationWidth: 435`** 때문에 좁은 폭에서 **스크롤 뷰가 자동 활성화**되어 덱이 화면의 일부만 쓰는 것처럼 보일 수 있으므로, Present 초기화 옵션에서 **`scrollActivationWidth: false`**로 반응형 스크롤 전환을 끈다. 슬라이드 페이지네이션에는 진행바·홈 인디케이터 여유(`viewportHeightReserve`)를 더 준다. `presentation.css`는 `max-width: 36rem`에서 글자·패딩·탭 타깃을 줄이고, `#presentation-deck-host`·크롬에 `safe-area-inset`을 반영한다. 회전·주소창 변화는 `resize` / `orientationchange`에서 Reveal `configure`+`layout`으로 맞춘다(슬라이드 **재분할**은 하지 않음 — 깨지면 Read 후 Present 재진입).
- 글에 frontmatter **`image`**가 있으면 Present **첫 슬라이드**에 그 경로를 표지로 넣습니다(`data-presentation-cover`는 **`absURL` 없이** 루트 상대 `/images/...` 또는 `http(s)`만 — `hugo server`의 localhost 포트가 URL에 박히지 않게). 없으면 본문 첫 슬라이드부터 시작합니다.
- **`presentationInfographic`**(경로 문자열)가 있으면 **둘째 슬라이드**에 전면 인포그래픽 한 장을 넣습니다(`data-presentation-infographic`). 표지(`image`)가 없을 때만 있으면 첫 슬라이드가 인포그래픽이 됩니다.
- **Reveal 테마**: Present 화면 우상단에서 `black` / `league` / `night` / `dracula` 또는 **랜덤**을 고를 수 있으며, 선택은 `localStorage` 키 `presentation-reveal-theme-pref`(`random` 또는 테마명)에 전역 저장된다. `layouts/partials/presentation-head.html`의 `#presentation-reveal-theme-css`가 교체된다([Reveal themes](https://revealjs.com/themes/)).
- **슬라이드 스타일**: 전역은 `static/css/presentation.css`에서 **`#presentation-deck-host`** 아래로만 조정(Read 모드와 분리). 본문 슬라이드 배경은 **고정 연회색을 쓰지 않고** Reveal 테마의 `--r-background-color` / `--r-main-color` 등에 맡긴다(다크·라이트 테마 전환 시 흰 카드·투명 틈으로 깨지지 않게). 장별 톤은 `data-state` 또는 `slide-splitter`의 section 클래스로 확장한다.
- Present는 Reveal 위에 **슬라이드 높이·폭을 기준으로 본문을 자동 페이지네이션**합니다. **문단**은 문장·줄 단위로 **여러 슬라이드로 나뉘는 것이 정상**이며, **몇 번째 슬라이드든** 같은 규칙이 계속 적용됩니다(“4페이지만” 특별히 다르게 동작하지 않음).
- 페이지 나눔 측정은 **`#presentation-deck-host` 안의 전용 셸**에서 실제 Present와 같은 글꼴·크기로 수행합니다. 예전에는 측정이 글 본문(article) 타이포 기준이라 **한 장에 과하게 넣고 `overflow: hidden`으로 잘리는** 경우가 있었습니다(특히 `## 4` 같은 긴 절).
- **표(`table`)·목록(`ul`/`ol`)·코드 블록(`pre`)** 등은 한 블록을 세로로 잘라 슬라이드에 나누 넣지 않고, **가능하면 한 장에 통째로** 두고(들어가면) 넘치면 **축소·스크롤·oversized** 처리합니다. 그래서 표·코드 앞뒤 **문단** 쪽이 먼저 여러 장으로 갈라지는 식으로 보일 수 있습니다.
- **표**는 문단·목록과 **한 가로 슬라이드에 섞지 않고** 표 앞에서 새 슬라이드를 연다(잘림·내부 스크롤 지양). 한 장에 다 안 들어가면 **축소(scale)만** 사용한다(슬라이드 내부 스크롤 없음).
- `@chenglou/pretext`는 **통째로 넣기 어려운 문단**을 줄 단위로 나눌 때 사용합니다. 한글 등 CJK는 `prepareWithSegments`에 **`wordBreak: 'keep-all'`**을 넘겨 어절 단위로 줄을 나눕니다. 모듈이 로드되지 않으면 슬라이드 생성 단계가 실패하는 쪽에 가깝고, “pretext를 안 써서 잘린다”와는 반대입니다.
- **끊기면 안 되는 큰 덩어리 경계**는 마크다운 구조와 shortcode로 잡습니다: `##`(H2)는 씬(큰 묶음) 경계, `{{< slidebreak >}}`는 강제 씬 나눔, `{{< vertical >}}` / `{{< aside >}}`는 세로 스택·옆면 참고용(각 shortcode 파일 참고).
- 같은 `##` 안에서는 **`###`(항·소제목)마다** 가로 슬라이드 묶음을 끊어, 다음 항이 이전 항의 슬라이드 꼬리에 붙지 않게 한다(`slide-splitter.js`의 H3 그룹 분할).
- 한 장에 더 많이 넣고 싶다면 **문단을 짧게 쪼개거나** 표·코드 블록 높이를 줄이는 등 본문 쪽 조정이 우선입니다. 레이아웃·`slide-splitter.js`·`presentation.css`는 전역 기본값만 조정합니다.

## 확인 규칙

- `content/`, `layouts/`, `static/`, `config.toml`을 수정했다면 기본적으로 Hugo 빌드 확인을 수행합니다.
- 빠른 확인은 `hugo --gc --cleanDestinationDir --destination <tmpdir>`로 하고, 시각 확인이 필요하면 `./start.sh` 또는 `hugo server -D --environment development`를 사용합니다.
- Playwright `webServer`는 **`hugo server --renderToMemory`**로 띄운다. 예전처럼 디스크 기본 렌더만 쓰면 `public/index.html` 루트 리다이렉트에 **E2E 포트(13714)** 가 박혀, 로컬에서 `hugo server -p 1313`으로 볼 때 **메타 리프레시로 13714로 튀는** 현상이 난다. 그럴 땐 `rm -rf public` 후 `hugo`로 `public/`을 다시 만들거나 `hugo server … --renderToMemory`를 쓰면 된다.
- 루트 `/`·paginator alias 등은 Hugo **`layouts/alias.html`**로 나가며, **`meta refresh`의 목적지는 `relURL`로 경로만** 둔다(로컬에서 `windshock.github.io`로 튀지 않음). `canonical`은 절대 URL을 유지한다.
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
