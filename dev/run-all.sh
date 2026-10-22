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
  echo; echo "== 8b. calculus applications vs sympy / scipy";                              for s in 1 2; do node calcapps-battery.mjs "$skill" $s; done
  echo; echo "== 8c. multivariable calculus vs sympy";                                    for s in 1 2; do node multivar-battery.mjs "$skill" $s; done
  echo; echo "== 8d. linear programming vs scipy.optimize.linprog";                         for s in 1 2; do node lp-battery.mjs "$skill" $s; done
  echo; echo "== 8e. Laplace transforms vs sympy / numerical integration";                   for s in 1 2; do node laplace-battery.mjs "$skill" $s; done
  echo; echo "== 9. linear algebra vs sympy";                                            for s in 1 2; do node linalg-battery.mjs "$skill" $s; done
else
  echo; echo "== 6-9. skipped (python3 with numpy, sympy, scipy not found; see tests/requirements.txt)"
fi
echo; echo "== 8f. differential equations: every answer substituted back into its equation"; node ode-battery.mjs "$skill"; for s in 1 2; do node ode-fuzz.mjs "$skill" $s 400; done
echo; echo "== 8j. numerical methods (ODE steppers, quadrature rules, interpolation, splines, root finders) vs exact fractions / numpy / scipy"; for s in 1 2; do node numerical-battery.mjs "$skill" $s; done
echo; echo "== 8k. parametric / polar / vector calculus vs sympy / scipy"; for s in 1 2; do node curves-battery.mjs "$skill" $s; done
echo; echo "== 8l. extra statistics (distributions, two-sample tests, ANOVA, descriptive measures, regressions) vs scipy.stats / numpy"; for s in 1 2; do node stats2-battery.mjs "$skill" $s; done
echo; echo "== 8m. recurrences, continued fractions, Pell, logic, graph theory vs sympy / networkx / brute force"; for s in 1 2; do node discrete2-battery.mjs "$skill" $s; done
echo; echo "== 8n. QR, Cholesky, definiteness, pinv, least squares, SVD, matrix exponential, Jordan form vs numpy / scipy / sympy"; for s in 1 2; do node linalg2-battery.mjs "$skill" $s; done
echo; echo "== 8p. planes, lines, skew lines, spheres and quadric surfaces vs sympy.geometry / numpy (surface types known by construction)"; for s in 1 2; do node geom3d-battery.mjs "$skill" $s; done
echo; echo "== 8q. plot extras (slope fields, fits, histograms, box plots, shaded areas, implicit curves, contours, regions): printed numbers vs numpy / scipy / exact fractions"; for s in 1 2; do node plot2-battery.mjs "$tmp/test-index.html" $s; done
echo; echo "== 8h. random limits, Taylor polynomials, definite integrals (pole detection) and finite sums, checked numerically"; for s in 1 2; do node calc-random-battery.mjs "$skill" $s 80; done
echo; echo "== 8i. random equations (rational, radical, exponential, log, abs, polynomial) and inequalities, checked by a numerical scan"; for s in 1 2; do node eq-battery.mjs "$skill" $s 80; done
echo; echo "== 8g. random rational functions (non-monic factors): apart, integrals, inverse Laplace, checked numerically"; for s in 1 2; do node rational-battery.mjs "$skill" $s 100; done
if "$PY" -c "import pint, periodictable, numpy_financial" 2>/dev/null; then
  echo; echo "== 10. geometry, units, chemistry, finance, complex numbers vs pint / periodictable / numpy-financial"; for s in 3 4; do node applied-battery.mjs "$skill" $s; done
  echo; echo "== 10b. elements, electron configurations, empirical formulas, stoichiometry, acids, gases; amortization, bonds, depreciation vs periodictable / mendeleev data / numpy-financial"; for s in 1 2; do node chemfin-battery.mjs "$skill" $s; done
else
  echo; echo "== 10. skipped (pint, periodictable, numpy-financial not installed)"
fi
if node -e "require('playwright')" 2>/dev/null; then
  echo; echo "== 11. real Chromium, offline, using the app's call sequence (incl. graphs)"; node browser-test.cjs "$skill"
else
  echo; echo "== 11. skipped (playwright not installed)"
fi
echo; echo "ALL GOOD"
