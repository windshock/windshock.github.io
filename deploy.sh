hugo --gc --cleanDestinationDir
hugo --gc --minify --cleanDestinationDir -d docs --environment production
git config --global http.postBuffer 524288000
find docs/ -type f -name "*.html" -exec sed -i '' 's/content="noindex"/content="index"/g' {} +
git add .
git commit -m "Replace Jekyll with Hugo"
git push origin master
