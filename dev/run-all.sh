#!/usr/bin/env bash
# Rebuilds the skill page and runs every test against the file that ships in the skill folder.
# Needs: node >= 18, python3 with numpy (property tests); playwright + chromium for the browser test (optional).
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
skill="$here/../photo-equation-solver/scripts/index.html"
tmp="$(mktemp -d)"

echo "== build"; node "$here/build.mjs"
node "$here/build.mjs" "$tmp/test-index.html" --expose >/dev/null   # same code + an internals hook for the property tests

cd "$here/tests"
echo; echo "== 1. hand-written cases (against the shipped file)"; node run-cases.mjs "$skill"
echo; echo "== 2. property tests (Fraction + numpy oracles)";     node props.mjs "$tmp/test-index.html"
echo; echo "== 3. fuzz: random garbage must never crash or hang"; node fuzz.mjs "$skill" 1 4000
if node -e "require('playwright')" 2>/dev/null; then
  echo; echo "== 4. real Chromium, offline, using the app's call sequence"; node browser-test.cjs "$skill"
else
  echo; echo "== 4. skipped (playwright not installed)"
fi
echo; echo "ALL GOOD"
