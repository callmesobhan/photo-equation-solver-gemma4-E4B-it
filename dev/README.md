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
| `20-discrete2.js` | Euclid with Bézout coefficients, continued fractions, Pell equations, Collatz, Egyptian fractions, sums of two squares, Farey sequences, Hanoi, Josephus, figurate numbers, linear recurrences with closed forms (also from the written `a_n = 5a_(n-1) - 6a_(n-2)` form) |
| `21-logic-graphs.js` | Propositional logic (truth tables, tautology / equivalence / normal forms, Quine–McCluskey), graph properties, shortest paths, minimum spanning trees, maximum flow, colouring, topological order, BFS / DFS |
| `22-linalg2.js` | QR, Cholesky / LDLᵀ, definiteness, exact pseudoinverse, least squares, singular values, matrix exponential (exact for rational eigenvalues and 2×2 complex pairs), Jordan form |
| `23-chem-fin.js` | Elements and electron configurations, empirical / molecular formulas, stoichiometry and limiting reagent, weak acids / bases, buffers, dilution, gas laws, half-life; amortization, loan balance, bonds, depreciation, CAGR, MIRR, payback, break-even |
| `24-geometry3d.js` | Planes, lines, distances, angles, skew lines, triple products, spheres and classification of quadric surfaces (exact, from the inertia of the quadratic form) |
| `25-plot2.js` | Slope fields, scatter plots with a fitted polynomial, histograms, box plots, shaded normal / t / chi-square curves, implicit curves, contour maps, regions of inequalities (marching squares, exact corner points for linear boundaries) |
| `26-series.js` | Convergence of series (term, geometric, ratio, root, p-series, integral, bounded-factor and alternating tests, evaluated in log scale at very large n) and the radius / interval of convergence of power series; the sentence forms ("does the series ... converge?") |
| `27-laplace2.js` | Laplace transforms with unit steps `u(t - a)` and impulses `delta(t - a)`: second shifting theorem both ways, linear ODEs with such forcing solved by the Laplace transform |
| `90-dispatch.js` | Routing of command statements |
| `99-main.js` | `window.ai_edge_gallery_get_result` entry point and request parsing |

## Tests (`tests/`)

| File | What it checks |
|------|----------------|
| `cases.mjs` + `run-cases.mjs` | 1013 hand-written input → expected output cases |
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
| `discrete2-battery.mjs`, `gen_discrete2.py` | extended Euclid, continued fractions, Pell, sums of squares, linear recurrences, shortest paths, spanning trees, max flow, colouring and truth tables against sympy / networkx / brute force |
| `chemfin-battery.mjs`, `gen_chemfin.py`, `elements-oracle.json` | elements (name, mass, period, group, block), ground-state electron configurations and unpaired electrons, empirical formulas from rounded percentages, limiting reagents, acids, gases, decay, amortization, bonds, depreciation against periodictable / mendeleev (cached) / numpy-financial |
| `geom3d-battery.mjs`, `gen_geom3d.py` | space geometry against sympy.geometry / numpy; quadric surfaces are built from canonical forms by an invertible affine change of variables, so the surface type is known by construction |
| `plot2-battery.mjs`, `gen_plot2.py` | the numbers printed next to the new pictures (RK4 solutions and equilibria against scipy `solve_ivp`, fits against `numpy.polyfit`, exact histogram counts, box-plot fences, shaded areas against scipy.stats, intercepts, contour ranges, exact region corners and areas against `scipy.optimize.linprog` / `ConvexHull`), and the geometry of the marching-squares curves against the equation (needs the `--expose` build) |
| `series-battery.mjs`, `gen_series.py` | about 190 series per seed whose behaviour is known from theory (p-series, geometric, ratio / root families, alternating, logarithmic, rational and radical terms, radius and end points of power series); a wrong verdict fails, "cannot decide" is allowed |
| `laplace2-battery.mjs`, `gen_laplace2.py` | 117 checks per seed: transforms with steps / impulses against quadrature, inverses against mpmath's inverse Laplace transform, initial value problems against `scipy.solve_ivp` applied piece by piece (impulses as jumps of the derivative) |
| `words-battery.mjs` | about 1,450 plain-English phrasings per seed (derivatives, integrals, limits, algebra, number theory, shapes, points, matrices, data, probability, money, function definitions) with random numbers; each must give exactly the answer of the command it stands for (the commands themselves are checked by the other batteries) |
| `coord2d-battery.mjs`, `gen_coord2d.py` | about 180 plane-geometry checks per seed against `sympy.geometry`: circles (three points, diameter, centre-radius), line-circle and circle-circle relations with intersection points, tangents (points of contact verified on the circle and orthogonal to the radius), perpendicular bisectors, parallels and perpendiculars, intersections and angles, triangle centres and radii, rotations / reflections / translations / dilations, section formula, collinearity, convex hulls (tangency and incidence are built in by Pythagorean construction) |
| `window-battery.mjs`, `gen_window.py` | 51 equations per seed with an interval for the unknown (`sin(x) = 1/2, 0 <= x <= 2pi`, `e^x = 3x on (0, 5)`, polynomials with chosen roots incl. double and triple roots, open and closed ends) against a 400,000-point scan + `scipy.optimize.brentq`; touching roots are listed from their closed form |
| `phase-battery.mjs`, `gen_phase.py` | about 95 checks per seed: 2×2 matrix types (saddle, node, star, degenerate, spiral, centre) from exact trace / determinant / discriminant, phase lines (stable, unstable and semi-stable equilibria of polynomial and trigonometric f(y)) and the equilibria of Lotka–Volterra, competition, pendulum, Duffing and random quadratic systems with the type of each one from sympy's exact Jacobian |
| `inference2-battery.mjs`, `gen_inference2.py` | about 110 checks per seed against `scipy.stats`: regression inference (slope / intercept SE, t, p, confidence intervals, r², prediction and mean-response intervals), Mann–Whitney (exact and normal approximation with tie and continuity corrections, three alternatives), Wilcoxon signed-rank (exact and approximate, zero differences), Kruskal–Wallis with ties, sign test (`binomtest`), Fisher's exact test, McNemar |
| `fourier-battery.mjs`, `gen_fourier.py` | 44 Fourier-series checks per seed: the mean and a₁…a₄, b₁…b₄ of polynomials, exponentials, sines / cosines, |x − c|, piecewise definitions on intervals of different lengths and the half-range cosine / sine series against `scipy.integrate.quad` |
| `precalc-battery.mjs`, `gen_precalc.py` | 136 checks per seed: amplitude / period / phase shift of sinusoids, independence, span and nullity (sympy rank), rational zeros of polynomials with roots chosen in advance, end behaviour (sympy limits), even / odd, coefficients (sympy Poly) and the range of 30 function families whose ranges are known by construction (open and closed ends, unions around poles and holes) |
| `vectorcalc-battery.mjs`, `gen_vectorcalc.py` | 63 checks per seed: mass / centre / moments of laminas and solids, polar, cylindrical and spherical integrals (sympy), surface areas (scipy `dblquad`, spheres / cylinders / cones by formula), flux through graphs and spheres, and Green / divergence / Stokes each compared with the independent other side (edge line integrals, six face fluxes) |
| `trig-battery.mjs`, `gen_trig.py` | ~480 checks per seed: exact values of sin / cos / tan / cot / sec / csc at multiples of π/n (n = 1, 2, 3, 4, 5, 6, 8, 10, 12, also in degrees) against Python's `math`, arithmetic with square roots (rationalised, denested, no root left in a denominator), trig of inverse trig, and `simplify` / `expand` / `trigexpand` / `tosum` checked for equivalence at random points (and for the structure asked: fully expanded, a plain sum of sines and cosines) |
| `textbook-battery.mjs`, `gen_textbook.py` | ~230 checks per seed: linear approximation (against the tangent formula), mean value / Rolle theorems (every c checked against sympy / scipy roots of f' − rate), intermediate value theorem, sums of arithmetic / geometric / famous series (mpmath `nsum`), mean and variance of the binomial, Poisson, geometric and die distributions, probability sentences (exact `fractions` arithmetic), counting phrases (`math.comb`, `math.perm`), radian / degree conversions and combined fractions |
| `algebra2-battery.mjs`, `gen_algebra2.py` | ~490 checks per seed: perfect numbers and divisor counts (sympy / brute force), remainders, rounding, fractions and repeating decimals (`fractions`), lines through a point, spans of vectors, systems "using matrices"; discriminant / completing the square / vertex of random quadratics (exact formulas), expanding and condensing logarithms (equivalence at random positive points and structure), sets (Python `set`, also from sentences with { } and ∪ ∩), digits in bases up to 36 (`int(s, base)`), binomial terms (sympy), ratios and proportions, scientific notation and confidence intervals from summary numbers (scipy `t.ppf`, `norm.ppf`) |
| `stats3-battery.mjs` + `gen_stats3.py` | statistics sentences phrased every way (strict / non-strict bounds, ranges, tails, percentiles, one-sample t / z and proportion tests, ordered draws, geometric first success) compared with scipy.stats and fractions |
| `noise-battery.mjs` | about half of the hand-written cases per seed, sent again with a worksheet label in front (`Q3.`, `Problem 2:`, `(a)`, `1)`, `Ex. 5`, a bullet) and an instruction behind (`(solve for x)`): the result must be identical to the clean text |
| `linalg-battery.mjs`, `gen_linalg.py` | linear algebra against sympy |
| `linalg2-battery.mjs`, `gen_linalg2.py` | QR, Cholesky, definiteness, pinv, least squares, SVD, expm, Jordan form against numpy / scipy.linalg / sympy (printed matrices are parsed back and compared) |
| `applied-battery.mjs`, `gen_applied.py` | geometry, triangles, units, chemistry, finance, complex numbers against pint / periodictable / numpy-financial / Python `complex` |
| `fuzz.mjs`, `fuzz-cmds.mjs` | random garbage text, and every command with random arguments: never crash, hang or print `NaN` |
| `../package.mjs` | not a test: checks the skill folder the way the app needs it (SKILL.md at the folder root with a matching name, `scripts/index.html`, no web references, SKILL.md under 2500 bytes) and writes the zip to import on the phone: `node dev/package.mjs out.zip` |
| `photo-kit/` | ten handwritten-style test pictures for the phone (generator, four finished images, expected answers, how to run them); `photo-kit/check.mjs` checks the expected answers against the solver |
| `browser-test.cjs` | the built page in real Chromium, offline, called the way the app calls it (needs Playwright) |

`pip install -r tests/requirements.txt` installs the Python oracles; the batteries are skipped when they are missing.
