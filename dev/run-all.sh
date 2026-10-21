#!/usr/bin/env bash
# Rebuilds the skill page and runs every test.
#   needs:    node >= 18
#   optional: python3 with the packages in tests/requirements.txt (oracle batteries; set PY=/path/to/python to choose one)
#             playwright + chromium (real-browser test)
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
skill="$here/../photo-equation-solver/scripts/index.html"
docs="$here/../photo-equation-solver/SKILL.md"
tmp="$(mktemp -d)"
PY="${PY:-python3}"
export PY

echo "== build"; node "$here/build.mjs"
node "$here/build.mjs" "$tmp/test-index.html" --expose >/dev/null   # same code + an internals hook for the tests that need it

cd "$here/tests"
echo; echo "== 1. hand-written cases (against the shipped file)"; node run-cases.mjs "$skill"
echo; echo "== 2. documentation: SKILL.md examples run, every command is in the built-in help"; node doc-test.mjs "$tmp/test-index.html" "$docs"
echo; echo "== 3. property tests (Fraction + numpy oracles)";     node props.mjs "$tmp/test-index.html"
echo; echo "== 4. fuzz: random garbage must never crash or hang"; node fuzz.mjs "$skill" 1 4000
echo; echo "== 5. fuzz: every command with random arguments";     node fuzz-cmds.mjs "$tmp/test-index.html" 5 30000

if "$PY" -c "import numpy, sympy, scipy" 2>/dev/null; then
  echo; echo "== 6. symbolic core vs sympy (random expressions, derivatives, expansion)"; node cas-props.mjs "$tmp/test-index.html"
  echo; echo "== 7. calculus battery: integrals, limits, sums vs sympy / scipy";          node calc-battery.mjs "$skill"
  echo; echo "== 8. discrete maths and statistics vs sympy / scipy / numpy";             for s in 7 11; do node disc-battery.mjs "$skill" $s; done
  echo; echo "== 9. linear algebra vs sympy";                                            for s in 1 2; do node linalg-battery.mjs "$skill" $s; done
else
  echo; echo "== 6-9. skipped (python3 with numpy, sympy, scipy not found; see tests/requirements.txt)"
fi
if "$PY" -c "import pint, periodictable, numpy_financial" 2>/dev/null; then
  echo; echo "== 10. geometry, units, chemistry, finance, complex numbers vs pint / periodictable / numpy-financial"; for s in 3 4; do node applied-battery.mjs "$skill" $s; done
else
  echo; echo "== 10. skipped (pint, periodictable, numpy-financial not installed)"
fi
if node -e "require('playwright')" 2>/dev/null; then
  echo; echo "== 11. real Chromium, offline, using the app's call sequence (incl. graphs)"; node browser-test.cjs "$skill"
else
  echo; echo "== 11. skipped (playwright not installed)"
fi
echo; echo "ALL GOOD"
