# 첫 번째 인자를 커밋 메시지로 사용
COMMIT_MSG="$1"

# 커밋 메시지가 비어 있는 경우 오류 출력 후 종료
if [ -z "$COMMIT_MSG" ]; then
  echo "❌ 커밋 메시지를 입력해주세요. 예: ./deploy.sh \"update logo\""
  exit 1
fi

hugo --gc --cleanDestinationDir
hugo --gc --minify --cleanDestinationDir -d docs --environment production
#./sitemap.sh
./img2webp.sh
git config --global http.postBuffer 524288000
find docs/ -type f -name "*.html" -exec sed -i '' 's/content="noindex"/content="index"/g' {} +
find public/ -type f -name "*.html" -exec sed -i '' 's/content="noindex"/content="index"/g' {} +
git add .
git commit -m "$COMMIT_MSG"
git push origin master
