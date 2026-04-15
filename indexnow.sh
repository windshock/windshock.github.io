sed -n 's:.*<loc>\(.*\)</loc>.*:\1:p' public/en/sitemap.xml | sed 's|http://localhost:1313|https://windshock.github.io|' > url-list.txt
sed -n 's:.*<loc>\(.*\)</loc>.*:\1:p' public/ko/sitemap.xml | sed 's|http://localhost:1313|https://windshock.github.io|' >> url-list.txt

cat <<EOF > indexnow-payload.json
{
  "host": "windshock.github.io",
  "key": "fa6713893a1940afbc8de8beed71690f",
  "keyLocation": "https://windshock.github.io/fa6713893a1940afbc8de8beed71690f.txt",
  "urlList": [
$(sed 's/^/    "/; s/$/"/' url-list.txt | sed '$!s/$/,/')
  ]
}
EOF

curl -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json" \
  -d @indexnow-payload.json
