#!/usr/bin/env bash
# Rebuilds the subset Arabic web fonts in src/app/fonts/ (docs/DECISIONS.md, Phase 5).
# Source: the Google Fonts "arabic" subset files (same families/weights as docs/02),
# reduced to the basic Arabic block (U+0600–06FF) + joiners/marks. OpenType layout
# features are kept, so joining, lam-alef and diacritics shape exactly as before; the
# dropped ranges are Persian/Urdu/African extensions and presentation-form code points
# the paper never types. All four families are SIL Open Font License 1.1.
# Needs: curl, python3 with fonttools + brotli (pip install fonttools brotli).
set -euo pipefail
cd "$(dirname "$0")/../.."
out=src/app/fonts
tmp=$(mktemp -d)
ua="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
curl -s -A "$ua" "https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;700&family=Markazi+Text:wght@600;700&family=IBM+Plex+Sans+Arabic:wght@400;600&family=Aref+Ruqaa:wght@700" > "$tmp/g.css"
python3 - "$tmp" <<'PY'
import re, subprocess, sys
tmp = sys.argv[1]
css = open(f"{tmp}/g.css").read()
seen = set()
for sub, block in re.findall(r"/\* (\w[\w-]*) \*/\s*@font-face \{(.*?)\}", css, re.S):
    if sub != 'arabic':
        continue
    fam = re.search(r"font-family: '([^']+)'", block).group(1).replace(' ', '')
    w = re.search(r"font-weight: (\d+)", block).group(1)
    url = re.search(r"url\((.*?)\)", block).group(1)
    if url in seen:  # variable font: one file serves every weight
        continue
    seen.add(url)
    subprocess.run(['curl', '-s', '-o', f"{tmp}/{fam}-{w}.woff2", url], check=True)
PY
for f in "$tmp"/*.woff2; do
  name=$(basename "$f" .woff2)
  # Variable fonts (wght axis) are named without a weight.
  if python3 -c "import sys; from fontTools.ttLib import TTFont; sys.exit(0 if 'fvar' in TTFont(sys.argv[1]) else 1)" "$f"; then
    name="${name%-*}-var"
  fi
  pyftsubset "$f" --unicodes="U+0600-06FF,U+200C-200F,U+2010-2011,U+FD3E-FD3F,U+0020,U+00A0" \
    --layout-features='*' --flavor=woff2 --output-file="$out/$name-ar.woff2"
  echo "$out/$name-ar.woff2 $(( $(stat -c %s "$out/$name-ar.woff2") / 1024 )) KB"
done
rm -rf "$tmp"
