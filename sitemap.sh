#!/bin/bash

OUT="public/sitemap.xml"
echo '<?xml version="1.0" encoding="utf-8"?>' > "$OUT"
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' >> "$OUT"

for lang in en; do
  FILE="public/$lang/sitemap.xml"
  if [[ -f "$FILE" ]]; then
    # <urlset> 태그 제외하고 <url> 태그만 추출
    grep "<url>" -A 10 "$FILE" | grep -v "<?xml" | grep -v "<urlset" | grep -v "</urlset" >> "$OUT"
  fi
done

echo '</urlset>' >> "$OUT"

cp public/sitemap.xml docs/sitemap.xml
