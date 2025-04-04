sed -n 's:.*<loc>\(.*\)</loc>.*:\1:p' public/en/sitemap.xml | sed 's|http://localhost:1313|https://windshock.github.io|' > url-list.txt
sed -n 's:.*<loc>\(.*\)</loc>.*:\1:p' public/ko/sitemap.xml | sed 's|http://localhost:1313|https://windshock.github.io|' >> url-list.txt

cat <<EOF > indexnow-payload.json
{
  "host": "windshock.github.io",
  "key": "dfe21f7dfa274411bbcb32eea70322e5",
  "keyLocation": "https://windshock.github.io/dfe21f7dfa274411bbcb32eea70322e5.txt",
  "urlList": [
$(sed 's/^/    "/; s/$/",/' url-list.txt)
  ]
}
EOF

curl -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json" \
  -d @indexnow-payload.json
