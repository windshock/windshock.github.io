find static -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) | while read img; do
  out="${img%.*}.webp"
  echo "Converting $img -> $out"
  cwebp -q 75 "$img" -o "$out"
done

find content -type f -name "*.md" | while read file; do
  echo "Updating $file"
  sed -i '' -E 's/\.(jpg|jpeg|png)/.webp/g' "$file"
done
