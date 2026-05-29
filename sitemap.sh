#!/bin/bash

cat >&2 <<'EOF'
ERROR: sitemap.sh is disabled.

This Hugo site already generates the correct sitemap structure:
  /sitemap.xml -> /en/sitemap.xml + /ko/sitemap.xml

Do not flatten or copy sitemap files manually. To notify search engines,
use:
  node scripts/submit-sitemaps.mjs
EOF
exit 1

OUT="public/sitemap.xml"
echo '<?xml version="1.0" encoding="UTF-8"?>' > "$OUT"
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">' >> "$OUT"

for lang in en; do
  FILE="public/$lang/sitemap.xml"
  if [[ -f "$FILE" ]]; then
    # <urlset> 태그 제외하고 <url> 태그만 추출
    grep "<url>" -A 10 "$FILE" | grep -v "<?xml" | grep -v "<urlset" | grep -v "</urlset" >> "$OUT"
  fi
done

echo '</urlset>' >> "$OUT"

cp public/sitemap.xml docs/sitemap.xml
cp public/sitemap.xml docs/ko/sitemap.xml
cp public/sitemap.xml docs/en/sitemap.xml
