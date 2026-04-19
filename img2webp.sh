if command -v cwebp >/dev/null 2>&1; then
  CWEBP_BIN="cwebp"
elif [ -x "/opt/homebrew/bin/cwebp" ]; then
  CWEBP_BIN="/opt/homebrew/bin/cwebp"
else
  echo "cwebp not found. Install with: brew install webp"
  exit 1
fi

find static -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) | while read img; do
  out="${img%.*}.webp"

  # Convert only when needed:
  # - output doesn't exist, or
  # - source is newer than output
  if [ ! -f "$out" ] || [ "$img" -nt "$out" ]; then
    echo "Converting $img -> $out"
    "$CWEBP_BIN" -q 75 "$img" -o "$out"
  else
    echo "Skipping (up-to-date) $img"
  fi
done

find content -type f -name "*.md" | while read file; do
  echo "Updating $file"
  # Replace ONLY image references that point into local /images/ paths, inside
  # markdown image syntax `](...)` or frontmatter quoted strings `"..."`/`'...'`.
  # This avoids corrupting body text that merely mentions .jpg/.png as extensions
  # (e.g. enumerations like ".css, .jpg, .png, .txt"). It also ignores remote URLs.
  sed -i '' -E \
    -e 's#(\]\()(/images/[^)[:space:]]+)\.(jpg|jpeg|png)(\))#\1\2.webp\4#g' \
    -e 's#(image:[[:space:]]*"[^"]*)\.(jpg|jpeg|png)"#\1.webp"#g' \
    -e "s#(image:[[:space:]]*'[^']*)\.(jpg|jpeg|png)'#\\1.webp'#g" \
    "$file"
done
