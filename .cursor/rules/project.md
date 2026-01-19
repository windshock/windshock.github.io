# Cursor project rules (windshock.github.io)

이 파일은 Cursor/AI가 이 레포에서 작업할 때 **항상 지켜야 하는 기본 규칙**을 모아둔 것입니다.

> 권장: 이 내용을 `.cursor/rules/project.md`로도 복사해두면, 새 세션에서도 더 안정적으로 적용됩니다.

## 최우선 기준(중요)

- 작업 시작 시 **항상 `PROJECT_CONTEXT.md`를 우선 참고**해서 디렉토리 구조/관례(포스트 경로, PDF 경로, 배포 흐름)를 따릅니다.
- 불확실하면 먼저 `PROJECT_CONTEXT.md`를 읽고 진행합니다.

## 스택 / 구조

- 이 레포는 **Hugo** + **PaperMod** 기반 정적 사이트입니다.
- 다국어:
  - 영문: `content/en/`
  - 한글: `content/ko/`
- 소스(직접 수정하는 곳):
  - 포스트: `content/<lang>/post/`
  - 정적 자산: `static/` (사이트 루트 `/`로 서빙)
  - 템플릿/오버라이드: `layouts/`
- 생성물(원칙적으로 직접 수정하지 않음):
  - `docs/` (GitHub Pages publish 디렉토리)
  - `public/` (Hugo 기본 output)
  - **특별히 요청받지 않는 한 `docs/`/`public/`을 직접 수정하지 않습니다.**

## 글 작성 규칙(권장)

- 경로: `content/<lang>/post/<YYYY-MM-DD>-<slug>.md`
- Frontmatter: YAML `---` 사용
  - 자주 쓰는 필드: `title`, `date`, `draft`, `tags`, `categories`, `description`, `image`
- 마크다운에 **거대한 base64 인라인 이미지 삽입 금지**
  - 이미지는 `static/images/...`에 파일로 두고 경로로 링크합니다.

## PDF 첨부/임베드 규칙

- PDF 위치: `static/files/<name>.pdf` → 글에서는 `/files/<name>.pdf`
- PDF 뷰어: `static/pdfjs/single.html` → `/pdfjs/single.html`
- iframe 임베드 예:
  - `src="/pdfjs/single.html?file=/files/<name>.pdf#page=1"`
- 1p 프리뷰 이미지(대표 이미지):
  - `static/images/pdf-previews/<name>_p1.png` → `/images/pdf-previews/<name>_p1.png`
  - frontmatter `image`에 지정

## 안전/운영 기본값(중요)

- **커밋/푸시는 사용자가 명시적으로 요청할 때만** 합니다.
- `deploy.sh`는 사용자가 명시적으로 원할 때만 실행합니다.
  - 다량 파일 수정(`sed`), 생성물 빌드, 그리고 `git config --global` 변경이 포함되어 있어 영향이 큽니다.

