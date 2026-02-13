#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./deploy.sh "commit message" [--no-webp] [--no-robots-fix] [--no-push] [--yes]

What this script does (safe defaults):
  - Requires a clean git working tree before running (prevents accidental mixed commits)
  - Builds Hugo outputs:
      - default output to ./public
      - production output to ./docs (GitHub Pages publish dir)
  - Optionally runs ./img2webp.sh
  - Optionally replaces meta robots "noindex" -> "index" in generated HTML
  - Stages ONLY known project paths (avoids adding random/unrelated files)
  - Commits with the provided message
  - Pushes to origin/master unless --no-push is provided

Notes:
  - This script intentionally does NOT run: git config --global ...
EOF
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

COMMIT_MSG="$1"
shift

RUN_WEBP=1
RUN_ROBOTS_FIX=1
DO_PUSH=1
ASSUME_YES=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-webp) RUN_WEBP=0 ;;
    --no-robots-fix) RUN_ROBOTS_FIX=0 ;;
    --no-push) DO_PUSH=0 ;;
    --yes) ASSUME_YES=1 ;;
    -h|--help) usage; exit 0 ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
  shift
done

if [[ -z "${COMMIT_MSG// }" ]]; then
  echo "❌ 커밋 메시지를 입력해주세요. 예: ./deploy.sh \"update site\""
  exit 1
fi

if ! command -v hugo >/dev/null 2>&1; then
  echo "❌ hugo not found in PATH"
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "❌ not a git repository"
  exit 1
fi

# Safety: avoid mixing unrelated edits into a deploy commit.
if [[ -n "$(git status --porcelain)" ]]; then
  echo "❌ Working tree is not clean. Commit/stash changes first."
  git status --porcelain
  exit 1
fi

branch="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$branch" != "master" ]]; then
  echo "❌ Current branch is '$branch' (expected 'master')."
  echo "   Switch branches or adjust the script if needed."
  exit 1
fi

echo "✅ Building site..."
hugo --gc --cleanDestinationDir
hugo --gc --minify --cleanDestinationDir -d docs --environment production

if [[ "$RUN_WEBP" -eq 1 ]]; then
  if [[ -x "./img2webp.sh" ]]; then
    echo "✅ Running img2webp.sh..."
    ./img2webp.sh
  else
    echo "⚠️  img2webp.sh not found or not executable; skipping"
  fi
fi

if [[ "$RUN_ROBOTS_FIX" -eq 1 ]]; then
  # Only touches generated outputs. If you intentionally keep noindex somewhere,
  # run with --no-robots-fix.
  echo "✅ Fixing meta robots in generated HTML..."
  find docs/ -type f -name "*.html" -exec sed -i '' 's/content="noindex"/content="index"/g' {} +
  find public/ -type f -name "*.html" -exec sed -i '' 's/content="noindex"/content="index"/g' {} +
fi

echo "✅ Staging known project paths..."
git add -A \
  config.toml \
  layouts \
  content \
  static \
  docs \
  public \
  PROJECT_CONTEXT.md \
  .cursor \
  2>/dev/null || true

echo "✅ Creating commit..."
git commit -m "$COMMIT_MSG"

if [[ "$DO_PUSH" -eq 1 ]]; then
  if [[ "$ASSUME_YES" -ne 1 ]]; then
    echo "About to push to origin/master."
    read -r -p "Proceed? [y/N] " ans
    case "$ans" in
      y|Y|yes|YES) ;;
      *) echo "Aborted (no push)."; exit 0 ;;
    esac
  fi
  echo "✅ Pushing..."
  git push origin master
else
  echo "ℹ️  Skipping push (--no-push)."
fi
