hugo --gc --cleanDestinationDir
hugo --gc --minify --cleanDestinationDir -d docs --environment production
git config --global http.postBuffer 524288000
git add .
git commit -m "Replace Jekyll with Hugo"
git push origin master
