find static -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) | while read img; do
  out="${img%.*}.webp"

  # Convert only when needed:
  # - output doesn't exist, or
  # - source is newer than output
  if [ ! -f "$out" ] || [ "$img" -nt "$out" ]; then
    echo "Converting $img -> $out"
    cwebp -q 75 "$img" -o "$out"
  else
    echo "Skipping (up-to-date) $img"
  fi
done

find content -type f -name "*.md" | while read file; do
  echo "Updating $file"
  sed -i '' -E 's/\.(jpg|jpeg|png)/.webp/g' "$file"
done
