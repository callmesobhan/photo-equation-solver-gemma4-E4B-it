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
echo; echo "== 8r. series: convergence verdicts and radius / interval of convergence for the standard families (truth known from theory)"; for s in 1 2; do node series-battery.mjs "$skill" $s; done
echo; echo "== 8s. Laplace transforms and initial value problems with unit steps and impulses vs quadrature / mpmath / scipy solve_ivp"; for s in 1 2; do node laplace2-battery.mjs "$skill" $s; done
echo; echo "== 8t. plain-English phrasings give exactly the answer of the command they stand for (random numbers, every template)"; for s in 1 2; do node words-battery.mjs "$skill" $s; done
echo; echo "== 8u. plane geometry (circles, tangents, lines, triangle centres, transformations, hulls) vs sympy.geometry"; for s in 1 2; do node coord2d-battery.mjs "$skill" $s; done
echo; echo "== 8v. equations with an interval for the unknown (trig, exponential, polynomial) vs a fine scan + brentq and polynomials with chosen roots"; for s in 1 2; do node window-battery.mjs "$skill" $s; done
echo; echo "== 8w. equilibria and phase portraits (phase lines, Jacobian types of planar systems, linear classification) vs sympy exact trace / determinant signs"; for s in 1 2; do node phase-battery.mjs "$skill" $s; done
echo; echo "== 8x. regression inference and rank / exact tests (Mann-Whitney, Wilcoxon, Kruskal-Wallis, sign, Fisher, McNemar) vs scipy.stats"; for s in 1 2; do node inference2-battery.mjs "$skill" $s; done
echo; echo "== 8y. Fourier series (piecewise, |x - c|, half-range) coefficients vs adaptive quadrature"; for s in 1 2; do node fourier-battery.mjs "$skill" $s; done
echo; echo "== 8z. precalculus helpers (sinusoids, independence / span, rational zeros, end behaviour, parity, coefficients, range of a function) vs closed forms and sympy"; for s in 1 2; do node precalc-battery.mjs "$skill" $s; done
echo; echo "== 8za. applications of multiple integrals (lamina, solid, polar / cylindrical / spherical, surface area, flux) and the theorems of Green, Gauss and Stokes vs sympy / scipy and the other side of each theorem"; for s in 1 2; do node vectorcalc-battery.mjs "$skill" $s; done
echo; echo "== 8zb. exact surds and trigonometry: exact values of the six functions at multiples of pi/n, rationalising / denesting, simplify / expand / product-to-sum, trig of inverse trig (values and equivalence at random points)"; for s in 1 2; do node trig-battery.mjs "$skill" $s; done
echo; echo "== 8zc. textbook helpers (linear approximation, MVT / Rolle / IVT, patterned series, distribution moments, probability sentences, counting phrases, radians, combined fractions) vs sympy / mpmath / scipy / fractions"; for s in 1 2; do node textbook-battery.mjs "$skill" $s; done
echo; echo "== 8zd. algebra helpers (discriminant, completing the square, vertex, logarithm laws, sets, digits in bases up to 36, binomial terms, ratios, scientific notation, confidence intervals from summary numbers) vs sympy / python sets / int(s, base) / scipy"; for s in 1 2; do node algebra2-battery.mjs "$skill" $s; done
echo; echo "== 8zf. statistics sentences (P(a < X < b) for normal / binomial / Poisson / geometric, percentiles, t / z / proportion tests from summary numbers, ordered draws) vs scipy.stats and fractions"; for s in 1 2; do node stats3-battery.mjs "$skill" $s; done
echo; echo "== 8ze. worksheet noise (labels, bullets, trailing instructions) around every hand-written case must not change its answer"; for s in 1 2; do node noise-battery.mjs "$skill" $s; done
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
echo; echo "== 12. packaging: the folder the Gallery app imports (SKILL.md at its root, scripts/index.html, nothing else) and its zip"; node "$here/package.mjs" "$tmp/photo-equation-solver.zip"
echo; echo "ALL GOOD"
