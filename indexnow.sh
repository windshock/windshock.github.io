sed -n 's:.*<loc>\(.*\)</loc>.*:\1:p' public/en/sitemap.xml | sed 's|http://localhost:1313|https://windshock.github.io|' > url-list.txt
sed -n 's:.*<loc>\(.*\)</loc>.*:\1:p' public/ko/sitemap.xml | sed 's|http://localhost:1313|https://windshock.github.io|' >> url-list.txt

cat <<EOF > indexnow-payload.json
{
  "host": "windshock.github.io",
  "key": "2b79d8694cd64ffba5178232d983681f",
  "keyLocation": "https://windshock.github.io/2b79d8694cd64ffba5178232d983681f.txt",
  "urlList": [
$(sed 's/^/    "/; s/$/"/' url-list.txt | sed '$!s/$/,/')
  ]
}
EOF

curl -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json" \
  -d @indexnow-payload.json
