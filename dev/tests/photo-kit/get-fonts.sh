#!/usr/bin/env bash
# Downloads the four handwriting fonts (SIL Open Font License, from github.com/google/fonts) into fonts/.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p fonts
base=https://raw.githubusercontent.com/google/fonts/main/ofl
curl -fsSL -o fonts/Caveat.ttf "$base/caveat/Caveat%5Bwght%5D.ttf"
curl -fsSL -o fonts/Kalam.ttf "$base/kalam/Kalam-Regular.ttf"
curl -fsSL -o fonts/PatrickHand.ttf "$base/patrickhand/PatrickHand-Regular.ttf"
curl -fsSL -o fonts/IndieFlower.ttf "$base/indieflower/IndieFlower-Regular.ttf"
ls -la fonts
