hugo --gc --minify --cleanDestinationDir -d docs --environment production
git add .
git commit -m "Replace Jekyll with Hugo"
git push origin master
