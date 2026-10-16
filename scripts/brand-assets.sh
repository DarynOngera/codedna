#!/usr/bin/env bash
# Rebuilds the favicon sets and the social cover image from the original brand
# source (assets/logo.png). Requires ImageMagick (magick).
#
# Outputs are committed to public/ so the static build needs no runtime tooling.
set -euo pipefail
cd "$(dirname "$0")/.."

SRC="assets/logo.png"
OUT="public"

command -v magick >/dev/null 2>&1 || { echo "ImageMagick (magick) is required" >&2; exit 1; }
command -v tesseract >/dev/null 2>&1 && HAS_TESS=1 || HAS_TESS=0

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# The full two-line glyph lockup (used for the social cover):
# measured extents 560x218 @ +481+343, padded 1px to avoid edge fringe.
GLYPH="${GLYPH:-562x220+480+342}"
# Favicon source: the compact "C" monogram from the left of the large wordmark,
# so the mark reads clearly at 16px.
MARK="126x145+481+343"

# Make the paper white transparent so the marks sit on any background.
magick "$SRC" -crop "$GLYPH" +repage -colorspace sRGB -alpha on -fuzz 6% \
  -transparent white -strip "png32:$TMP/glyph.png"
magick "$SRC" -crop "$MARK" +repage -colorspace sRGB -alpha on -fuzz 6% \
  -transparent white -strip "png32:$TMP/mark.png"

# Keep the mark square/padded for favicon tiles.
magick "$TMP/mark.png" -background none -alpha on -gravity center \
  -extent 512x512 "png32:$TMP/mark_sq.png"

# PNG icons (Android / general).
magick "$TMP/mark_sq.png" -resize 192x192 "png32:$OUT/icon-192.png"
magick "$TMP/mark_sq.png" -resize 512x512 "png32:$OUT/icon-512.png"

# Apple touch icon: white tile + mark (Apple itself rounds the corners).
magick "$TMP/mark.png" \
  -background white -alpha background -gravity center -extent 180x180 \
  -resize 180x180 "png32:$OUT/apple-touch-icon.png"

# Classic ICO with 16/32/48 sizes (ICO carries its own alpha; no explicit
# format prefix here — a "png32:" prefix would split frames into favicon-N.ico).
magick "$TMP/mark_sq.png" \
  \( -clone 0 -resize 16x16 \) \
  \( -clone 0 -resize 32x32 \) \
  \( -clone 0 -resize 48x48 \) \
  -delete 0 -colors 256 -strip "$OUT/favicon.ico"

# SVG favicon with an embedded data-URI raster (kept tiny at 32px).
magick "$TMP/mark_sq.png" -resize 32x32 "png32:$TMP/mark32.png"
B64="$(base64 -w0 "$TMP/mark32.png")"
cat > "$OUT/favicon.svg" <<EOF
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <image width="32" height="32" href="data:image/png;base64,$B64" />
</svg>
EOF

# Social cover 1200x630: white ground + centered full glyph.
magick -size 1200x630 xc:white "$TMP/canvas.png"
magick "$TMP/glyph.png" -resize 760x "$TMP/glyph_sized.png"
magick "$TMP/canvas.png" "$TMP/glyph_sized.png" \
  -gravity center -composite "$OUT/og-cover.png"

# Structured-data logo (canonical absolute URL): keep a PNG for maximum
# scraper compatibility. Sized to ~2x the largest on-screen use (hero caps
# at 32rem = 512px wide) and quantized — it is a monochrome wordmark, so a
# small palette keeps the bytes down. No "png32:" prefix so ImageMagick may
# write an indexed (palette) PNG.
magick "$TMP/glyph.png" -resize 1024x -colors 64 "$OUT/logo.png"

# Inverted lockup for the dark hero background: WebP keeps the
# anti-aliased alpha at a fraction of the RGBA-PNG byte count.
magick "$TMP/glyph.png" -channel RGB -negate +channel \
  -resize 1024x -define webp:method=6 "webp:$OUT/logo-inverse.webp"

# Header wordmark: the big CODEDNA line only (no trailing small line).
# Measured extents 560x146 @ +481+343, padded 1px to avoid edge fringe.
# Displayed at 1.625rem (~26px) tall, so 78px tall covers 3x retina.
WORD="562x148+480+342"
magick "$SRC" -crop "$WORD" +repage -colorspace sRGB -alpha on -fuzz 6% \
  -transparent white -strip "png32:$TMP/word.png"
magick "$TMP/word.png" -resize x78 -define webp:method=6 "webp:$OUT/logo-mark.webp"

echo "brand assets written to $OUT/"
ls -1 "$OUT/og-cover.png" "$OUT/favicon.ico" "$OUT/favicon.svg" \
  "$OUT/icon-192.png" "$OUT/icon-512.png" "$OUT/apple-touch-icon.png" \
  "$OUT/logo.png" "$OUT/logo-inverse.webp" "$OUT/logo-mark.webp"