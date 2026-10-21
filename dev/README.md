# photo-equation-solver - development files

The skill itself is in [`../photo-equation-solver`](../photo-equation-solver).
That folder contains only what the app needs (`SKILL.md`, `scripts/index.html`, `README.md`).

This folder holds what is *not* shipped to the phone:

| Path | What |
|------|------|
| `src/*.js` | The solver, split by concern, concatenated in file-name order by `build.mjs` |
| `build.mjs` | Builds the single self-contained `scripts/index.html` (pure ASCII, no external resources; duplicate top-level names are rejected; `--expose` adds a test hook) |
| `tests/` | Hand-written cases, oracle batteries, property tests, fuzzers, a documentation test and a real-browser test |
| `run-all.sh` | Build + run everything (`PY=/path/to/python ./run-all.sh` to choose the Python with the oracle packages) |

Edit `src/`, then run `./run-all.sh`. Never edit the generated `index.html` by hand.

## Source modules

| File | Purpose |
|------|---------|
| `01-core.js` | BigInt rationals, rational polynomials / rational functions |
| `02-parse.js` | Text clean-up (unicode, LaTeX-ish, capital letters, subscripts), tokenizer, parser, printer |
| `02b-notation.js` | Command registry; printed notation (∫, lim, Σ, d/dx, ...) to command syntax |
| `03-eval.js` | Exact and floating-point evaluators, number recognition (1/2, pi/6, sqrt(2), ln 5) |
| `04-poly.js` | Polynomial roots: rational-root theorem, exact quadratics, Aberth iteration |
| `05-solve.js` | Equations, systems, inequalities, plain arithmetic, `solveProblem` |
| `07-cas.js` | Small computer-algebra core: canonical expressions, simplification, derivatives, expansion |
| `08-algebra.js` | Number theory helpers, polynomial factoring over Q, partial fractions, `factor` / `gcd` / ... |
| `08b-literal.js` | Solving formulas for a letter ("solve for t") |
| `08c-complex.js` | Complex numbers with exact components, polar form, roots, complex equations |
| `09a-quad.js` ... `09e-ode.js` | Numeric quadrature, integration (rule-based + verification), limits, calculus commands, ODEs (linear of any order, separable, first-order linear) |
| `09f-applications.js` | Tangents, critical points, function analysis, area/volume/arc length, Newton, implicit differentiation, inverse functions |
| `09g-multivar.js` | Gradient, Hessian, vector calculus, critical points of f(x, y), Lagrange multipliers |
| `09h-laplace.js` | Laplace and inverse Laplace transforms |
| `09i-ode2.js` | More ODE methods: Bernoulli, homogeneous, exact / integrating factor, `M dx + N dy = 0`, Euler–Cauchy, variation of parameters, linear systems (eigen / Jordan chains) |
| `10-linalg.js` | Exact linear algebra (incl. Gram–Schmidt) |
| `11-discrete.js` | Number theory, modular arithmetic, counting, sequences, sets, number bases |
| `11b-counting.js` | Dice distributions, arrangements of the letters of a word, birthday problem, Pascal rows, circular arrangements |
| `12-stats.js` | Statistics, distributions (special functions), intervals and tests |
| `13a-geometry.js` | Shapes, triangles, coordinates, conic sections |
| `13b-applied.js` | Units, chemistry, finance, physics |
| `14-plot.js` | Graphs drawn on a canvas and returned as a PNG |
| `15-help.js` | Built-in `help` text (checked by the documentation test) |
| `16-linprog.js` | Linear programming by exact corner-point enumeration |
| `17-numerical.js` | Euler / Heun / Runge-Kutta steppers, Riemann / trapezoid / midpoint / Simpson rules with error bounds, bisection / secant / false position / fixed point, interpolation, splines, least-squares polynomials |
| `18-curves.js` | Parametric and polar curves, coordinate systems, velocity / curvature / TNB frame, line integrals, potential functions |
| `19-stats2.js` | More distributions, two-sample / paired / ANOVA / correlation / variance tests, sample sizes, descriptive measures, rank correlation, multiple and curve regression, Markov chains |
| `90-dispatch.js` | Routing of command statements |
| `99-main.js` | `window.ai_edge_gallery_get_result` entry point and request parsing |

## Tests (`tests/`)

| File | What it checks |
|------|----------------|
| `cases.mjs` + `run-cases.mjs` | 568 hand-written input → expected output cases |
| `doc-test.mjs` | every example in `SKILL.md` runs; every command appears in the built-in help |
| `props.mjs`, `gen_expr.py`, `gen_poly.py` | random expressions / polynomials / systems against Fraction and numpy |
| `cas-props.mjs`, `gen_cas.py` | the symbolic core against sympy |
| `calc-battery.mjs`, `calc_oracle.py` | integrals, limits and sums against sympy / scipy |
| `disc-battery.mjs`, `gen_disc.py` | number theory, counting, sequences, statistics, distributions against sympy / scipy / numpy |
| `calcapps-battery.mjs`, `gen_calcapps.py` | calculus applications against sympy / scipy |
| `multivar-battery.mjs`, `gen_multivar.py` | gradient, Hessian, critical points, double integrals, Lagrange against sympy |
| `lp-battery.mjs`, `gen_lp.py` | linear programming against scipy.optimize.linprog and brute force |
| `laplace-battery.mjs`, `gen_laplace.py` | Laplace and inverse Laplace transforms against sympy (numerical comparison) |
| `ode-battery.mjs`, `ode-verify.mjs`, `mathexpr.mjs` | 94 differential equations and systems: every printed answer is parsed by an independent evaluator (`mathexpr.mjs`) and substituted back into the equation with numerical derivatives (implicit answers by implicit differentiation) |
| `ode-fuzz.mjs` | ~600 random equations per seed from the textbook families (linear, separable, Bernoulli, homogeneous, exact, constant-coefficient order 2-3, Euler, variation of parameters): any answer that fails the substitution is a bug |
| `calc-random-battery.mjs` | random limits, Taylor polynomials, definite integrals of rational functions (with rational and irrational poles: "diverges" must be reported exactly when a pole lies inside) and finite sums, checked by direct numerical evaluation |
| `numerical-battery.mjs`, `gen_numerical.py` | ODE steppers, quadrature rules, interpolation, splines, least squares and root finders against exact fractions / numpy / scipy |
| `curves-battery.mjs`, `gen_curves.py` | parametric / polar / vector calculus against sympy and scipy.integrate |
| `stats2-battery.mjs`, `gen_stats2.py` | extra distributions, tests, descriptive measures and regressions against scipy.stats / numpy |
| `eq-battery.mjs` | random rational / radical / exponential / logarithmic / absolute-value / polynomial equations (every solution substituted, no sign change of lhs − rhs missed) and inequalities (the printed set agrees with the inequality at hundreds of random points) |
| `rational-battery.mjs` | random rational functions with non-monic and repeated factors: `apart`, `integrate` and `ilaplace` answers are checked numerically |
| `linalg-battery.mjs`, `gen_linalg.py` | linear algebra against sympy |
| `applied-battery.mjs`, `gen_applied.py` | geometry, triangles, units, chemistry, finance, complex numbers against pint / periodictable / numpy-financial / Python `complex` |
| `fuzz.mjs`, `fuzz-cmds.mjs` | random garbage text, and every command with random arguments: never crash, hang or print `NaN` |
| `browser-test.cjs` | the built page in real Chromium, offline, called the way the app calls it (needs Playwright) |

`pip install -r tests/requirements.txt` installs the Python oracles; the batteries are skipped when they are missing.
