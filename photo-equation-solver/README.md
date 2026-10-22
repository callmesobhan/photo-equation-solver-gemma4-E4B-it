# Photo Math Solver

Take a photo of a math problem - an equation, an integral, a matrix, a triangle, a
statistics question, a chemical equation - and get an **exact** answer, with no internet
and no cloud service.

![JS](https://img.shields.io/badge/JS-0a9396) ![Image](https://img.shields.io/badge/Vision-0466c8) ![Offline](https://img.shields.io/badge/Offline-2dc653)

## How it works

```text
 photo ──► Gemma reads the math (vision) ──► plain text ──► run_js ──► exact solver ──► answer
           on-device LLM                     "integrate(x*e^x, x, 0, 1)"  hidden       pure JS, no
                                                                          webview      network
```

Small on-device models are good at *reading* a picture and bad at *calculating*.
So the model only transcribes the math into plain text (or into one of the commands
below), and a deterministic solver bundled in `scripts/index.html` does all the maths
with exact fractions and symbolic expressions. The answer always starts with a
**"Read as"** line that shows how the picture was read, so a misread digit is easy to spot.

Everything runs on the phone. `scripts/index.html` is a single self-contained file
(about 550 KB): no CDN, no `fetch`, no API key, no secret. Ask it for `help` (or
`help calculus`, `help stats`, ...) and it lists every command - offline too - so
`SKILL.md` can stay short.

## What it can do

| Area | Examples (what the model sends) |
|------|---------------------------------|
| **Equations** | linear, quadratic, any polynomial, rational, radical, exponential, logarithmic, trigonometric, absolute value; systems (exact when linear); inequalities; `2x^2 - 5x + 3 = 0`, `x + y = 7; x^2 + y^2 = 25`, `x^2 - 5x + 6 >= 0` |
| **Formulas** | solve for any letter: `v = u + a*t` (t), `d = v*t + a*t^2/2` (t), `1/f = 1/u + 1/v` (v), `A = P*e^(r*t)` (t) |
| **Calculus** | `integrate(f, x)` (checked by differentiating), definite and improper integrals, `diff(f, x, n)`, `limit(f, x, a)` (one-sided, at infinity), `taylor`, `sum` / `product` (finite and infinite, convergence reported); **applications**: `tangent`, `critical` (extrema, absolute max/min on an interval), `analyze` (domain, intercepts, asymptotes, increasing/decreasing, inflection, concavity), `areabetween`, `volumerev`, `shells`, `arclength`, `avgvalue`, `newton`, `implicit`, `inversefunction` |
| **Differential equations** | first order: linear, separable (explicit when possible, e.g. logistic), Bernoulli, homogeneous, exact / integrating factor, `M dx + N dy = 0`; linear with constant coefficients of any order with forcing (undetermined coefficients, or variation of parameters for `tan`, `sec`, `ln`, `1/x`...); Euler–Cauchy `x²y'' + xy' + y = 0`; systems of 2-3 equations (repeated eigenvalues too); initial conditions; **Laplace** `laplace(f, t)`, `ilaplace(F, s)`. Every solution is substituted back into the equation |
| **Curves and vectors** | `paramdiff`, `paramlength`, `paramarea`, `polararea`, `polarlength`, `polarslope`, coordinate conversions (`topolar`, `tospherical`, ...), `velocity`, `curvature`, `tnb` (T, N, B, curvature, torsion), `lineintegral`, `potential` |
| **Numerical methods** | `euler` / `heun` / `rk4` for y' = f(x, y) (exact fractions, compared with the exact solution), `trapezoid` / `simpson` / `midpointrule` / `riemann` with error bounds, `bisection`, `secant`, `falseposition`, `fixedpoint`, `interpolate`, `spline`, `polyfit`, `difftable`, `numdiff` |
| **Several variables** | `grad`, `hessian`, `jacobian`, `divergence`, `curl`, `directional`, `tangentplane`, critical points of `f(x, y)` with the second-derivative test, `lagrange` multipliers, double and triple integrals as nested `integrate(...)` |
| **Linear programming** | `maximize 3x + 2y subject to x + y <= 4, x, y >= 0` (up to 4 variables; exact corner points, unbounded/infeasible detection, integer programs) |
| **Algebra** | `factor`, `expand`, `simplify`, `apart` (partial fractions), `gcd`/`lcm`, polynomial division, exact radicals |
| **Complex numbers** | `(3+4i)(1-2i)`, `sqrt(-4)`, `e^(i*pi)`, `(1+i)^10`, `polar`, `conj`, `nthroots(8, 3)`, `z^2 = 3+4i`, `(2+i)z = 3-i` |
| **Linear algebra** (exact fractions) | `det`, `inv`, `rank`, `rref`, `nullspace`, `charpoly`, `eigen`, `diagonalize`, `lu`, `linsolve`, `gramschmidt`, `A*B`, `A^-1`, `dot`, `cross`, `norm`, `angle`, `qr`, `cholesky`, `definite`, `pinv`, `leastsquares`, `svd`, `expm` (e^(At), exact), `jordan` |
| **Number theory and counting** | `isprime`, `factor(n)`, `divisors`, `totient`, `mod`, `modinv`, `modpow`, `crt`, `x ≡ 2 (mod 3), x ≡ 3 (mod 5)`, `diophantine`, `ncr`, `npr`, `multiset`, `catalan`, `fibonacci`, `partitions`, `sequence(2,6,12,20)` (next terms and formula), base conversion, sets, `dice(3,6,10)`, distinct arrangements of the letters of a word (MISSISSIPPI), `birthday(23)`, `pascal`, `circular` |
| **Logic, graphs, recurrences** | `truth table of p and (q or not r)`, tautology / equivalence checks, normal forms; `graphinfo`, `shortestpath`, `mst`, `maxflow`, `coloring`, `topsort`, `bfs`; linear recurrences from the written form (`a_n = 5a_(n-1) - 6a_(n-2), a_0 = 1, a_1 = 0` gives a closed form); `euclid` (Bézout), `cfrac`, `pell`, `collatz`, `egyptian`, `sum2sq`, `farey`, `hanoi`, `josephus`, `polygonal` |
| **Statistics and probability** | mean/median/mode/variance/stdev/quartiles/`summary`, `correlation`, `linreg`, `multireg`, binomial, Poisson, geometric, hypergeometric, negative binomial, normal, t, chi-square, F, uniform, exponential, gamma, beta, Weibull, lognormal distributions and their inverses, confidence intervals, z/t/proportion/chi-square tests, two-sample and paired t tests, `anova`, `corrtest`, variance tests, sample sizes, `outliers`, `skewness`, `spearman`, `markov`, `bayes`, `expect` |
| **Space geometry** | planes from three points / point and normal / equation, lines (vector, parametric, symmetric form), point-plane and point-line distances, skew lines, line-plane and plane-plane intersections and angles, triple products, tetrahedron volume, spheres (centre and radius, diameter, four points) and **quadric surfaces written as equations** (ellipsoid, hyperboloids, cones, paraboloids, cylinders, plane pairs) |
| **Geometry** | areas, volumes, surface areas of the usual shapes, triangles from any 3 parts (SSS, SAS, ASA, AAS, SSA incl. the ambiguous case), right triangles, distance/midpoint/slope/line, polygon area, **conic sections** (circle, ellipse, parabola, hyperbola: center, radius, foci, vertices, directrix, asymptotes from the equation) |
| **Units** | `convert 5 km to miles`, `72 °F to °C`, `60 mph to km/h`, `2.5 GB to MB` (length, mass, time, area, volume, speed, force, pressure, energy, power, data, angle, temperature) |
| **Finance** | `compound`, `continuous`, `loan` (payment, total interest), `amortization` (schedule), `loanbalance`, `payoff`, `bond` (price, yield, duration), `straightline` / `decliningbalance` / `sumofyears` depreciation, `annuityfv`/`annuitypv`, `npv`, `irr`, `mirr`, `payback`, `cagr`, `rule72`, `realrate`, `breakeven`, `effrate`, `doubletime`, `pctchange` |
| **Chemistry** | `molarmass(Ca(OH)2)`, `percentcomp`, `moles`, `grams`, **`balance H2 + O2 -> H2O`** (a bare reaction is recognised too), `limiting`, `stoich`, `percentyield`, `empirical` (from percentages) and `molecular` formulas, `ph`, `weakacid`, `weakbase`, `buffer`, `dilution`, `molarity`, `idealgas`, `combinedgas`, `halflife`, `decaytime`, `element` (name, mass, period, group, block), `electronconfig` (also ions: Fe3+, O2-) |
| **Physics** | `suvat(u=0, a=9.8, t=3)` (any 3 of s,u,v,a,t), `projectile`, `freefall`; any other formula by solving it for a letter |
| **Graphs** | `plot(sin(x), cos(x), x, -6.28, 6.28)` (up to six curves; zeros, extrema and intercept listed), `plotparam`, `plotpolar`, `plotimplicit(x^2 + y^2 = 4)`, `contour`, `plotregion(y > x^2, x + y < 3)` or simply the inequalities (exact corner points and area), `slopefield` with solution curves, `scatter` with a fitted line or polynomial, `histogram`, `boxplot`, `normalshade` / `tshade` / `chisqshade`; the picture is returned to the chat |

Not supported: word problems (the model has to turn them into an equation or command
first), differential equations beyond the types above (partial differential equations,
non-linear equations of order 2 and up, non-constant coefficients other than the Euler form,
forced or non-constant systems), step and delta functions in Laplace transforms, symbolic
integration of functions with no closed form (the answer says so and gives a numeric value
for definite integrals), 3-D graphs.

## Install

> **Run it offline:** a skill added with *Load skill from URL* only stores the URL.
> In the Android code (`SkillManager.addSkillFromUrl`, `Skill.getJsSkillUrl`) the app
> fetches `scripts/index.html` from that URL **on every run**, so it needs a network
> connection each time. For real offline use, install the skill so that it is copied
> into the app's own storage: *Import local skill*, or create it in the in-app editor.

You need the model **Gemma-4-E4B-it** in the **Agent Skills** task.

1. Get the folder `photo-equation-solver/` (containing `SKILL.md` and `scripts/index.html`)
   onto the phone, for example from the `.zip` via AirDrop, iCloud Drive or the Files app.
   Unzip it there.
2. Open **AI Edge Gallery → Agent Skills**, pick Gemma-4-E4B-it, tap the **Skills** chip.
3. Tap **(+)** and choose one of:
   - **Import local skill** - pick the `photo-equation-solver` folder. *(fully offline)*
   - **Create / edit a skill** (if your version has it) - name `photo-equation-solver`,
     paste the description and the text below the second `---` of `SKILL.md` as the
     instructions, and paste the whole `scripts/index.html` as the script `index.html`.
     *(fully offline; the script is large, so paste from a file rather than retyping)*
   - **Load skill from URL** - host the folder on a real web host (GitHub Pages with an
     empty `.nojekyll` file; not `raw.githubusercontent.com`) and enter the folder URL.
     Check that `<url>/SKILL.md` shows the raw text. *(needs internet at run time)*
4. Make sure the skill is switched on in the Skill Manager.

The menu names above come from the Android app and the repository docs. The iOS app's
source is not in this repository, so its labels may differ slightly.

## Use it

1. In **Agent Skills**, tap the image button and take or choose a photo of the math.
2. Type something short such as *"solve this"*, *"find the determinant"* or *"plot this"*.
3. Check the **Read as** line against your photo. If it is wrong, retake the photo.

Tips for a good photo: fill the frame with the math, hold the phone parallel to the
page, good even light, dark ink on white paper, one problem (or one system) per photo.
Neat handwriting works; cramped or slanted handwriting is where misreads happen.

If you tap the tool-call panel in the chat you can see exactly what text the model sent
to the solver. Typing `help` as the equation shows every command.

## Notation the solver understands

You normally never type this yourself - the model writes it from the picture - but it
helps to know how the text is read:

- `^` power (`x^2`, also `x²`, `x**2`), `sqrt()`, `cbrt()`, `root(n, x)`, `abs()` or `|x|`, `pi`/`π`, `e`, `i`
- `sin cos tan cot sec csc asin acos atan sinh cosh tanh`, `ln`, `log` (base 10), `log2`, `log_b(x)`, `exp`, `n!`, `50%`, `30°`
- implicit multiplication (`2x`, `3(x+1)`, `xy`) and `× · * ÷ /`
- division and multiplication go left to right: `1/2x` means `(1/2)·x`; write `1/(2x)` if you mean that
- letters keep their case, so `F = m*a` and `E = m*c^2` stay as written; subscripts: `R_1`, `x_0`
  (`R1` and `R2` together are read as `R_1`, `R_2`)
- printed notation: `∫_a^b f dx`, `lim_{x→a}`, `Σ_{k=1}^n`, `d/dx`, `dy/dx`, `y''`, `pmatrix` matrices, `\frac{a}{b}`, unicode `− × ÷ √ π ≤ ≥ ≠ ½ ≡`
- commands are written `name(arguments)`; named arguments are allowed: `triangle(a=3, b=4, C=60)`
- systems: separate equations with `;`, a new line, `,` or `and`

## Limits worth knowing

- **Reading the picture is the weak spot, not the maths.** The solver is exact; the model
  can still misread a digit. That is why the answer repeats what it read.
- Numeric searches (trig, exp, log, roots of the unknown) look for real solutions between
  -200 and 200, or one period for trig; a note says so. They stop after about 2.5 seconds.
- Non-linear systems are found numerically from a grid of starting points, so a solution
  far from the origin can be missed (a note says so).
- Polynomial roots of degree 3 and up that have no rational root are numeric (8 digits).
- Normal/t/chi-square probabilities are double-precision numbers (about 8 digits shown).
- A rate written as `5` or `5%` means 5 percent; `0.05` also means 5 percent.
- Quartiles use the "median of the halves" method taught in most textbooks; `percentile`
  interpolates linearly. Other software can differ in the last digit for small samples.
- Unit factors are the exact definitions (1 in = 0.0254 m, 1 lb = 0.45359237 kg, US gallon, ...);
  a "year" is 365.25 days. Without the word "convert", ambiguous short units such as
  `in` or `m` are only read as units when the sentence is clear.
- Capital letters are separate variables from small letters (`R` ≠ `r`), and a lone `e`
  is Euler's number, so use a capital `E` for energy.

## Files

```text
photo-equation-solver/
├── SKILL.md            instructions + examples for the model (kept short on purpose)
├── README.md           this file
└── scripts/
    └── index.html      the solver (generated; source and tests live in the repo's dev/ folder)
```

## Testing status

Automated, on a desktop (`dev/run-all.sh` in the repository runs all of it):

- 640 hand-written cases (equations, calculus, matrices, number theory, statistics, complex numbers,
  geometry, units, chemistry, finance, graphs, differential equations, messy transcriptions, errors)
- calculus against **sympy** and **scipy**: 146 antiderivatives (each also verified by differentiating),
  42 definite/improper integrals, 43 limits, 22 sums, 593 random symbolic expressions
- calculus applications (tangents, extrema, curve study, areas, volumes, arc length) against sympy / scipy: ~380 checks;
  several-variable calculus against sympy: ~280 checks; linear programming against `scipy.optimize.linprog` and
  brute force: 160 problems (incl. infeasible, unbounded and integer ones)
- randomised checks needing no oracle program: ~600 random equations per seed from the textbook ODE families, random rational
  functions with non-monic factors (`apart`, integrals, inverse Laplace), random limits, Taylor polynomials, improper integrals
  and sums, each verified by direct numerical evaluation
- numerical methods against exact fractions / numpy / scipy: ~250 checks; parametric / polar / vector calculus against sympy / scipy: ~300;
  extra statistics against scipy.stats: ~640
- Laplace transforms against sympy: 240 checks; differential equations: 94 equations and systems, every printed
  answer substituted back into its equation by an independent evaluator
- discrete maths and statistics against sympy / scipy / numpy / exact fractions: about 1,800 checks per run; Euclid, Pell, recurrences and graph algorithms against sympy / networkx / brute force: about 400 more
- linear algebra against sympy: about 880 checks per run; QR / Cholesky / pinv / least squares / SVD / matrix exponential / Jordan form against numpy and scipy: about 150 more
- geometry, triangles, units, chemistry, finance and complex numbers against **pint**,
  **periodictable**, **numpy-financial** and Python `complex`: about 1,250 checks per run; elements, electron configurations,
  stoichiometry, acids and bases, gas laws, amortization schedules, bonds and depreciation: about 350 more;
  planes, lines, spheres and quadric surfaces in space against sympy.geometry and numpy: about 160 per seed;
  the numbers behind the new pictures (slope fields, fits, histograms, box plots, shaded areas, regions) against numpy / scipy: about 130 per seed;
  every new picture type decoded in real Chromium and checked to contain its drawing
- property tests against Python `Fraction` and `numpy.roots`; fuzzing with random garbage and with
  every command called with random arguments (tens of thousands of calls): no crash, no hang, no `NaN`
- the page loaded in real Chromium with the network disabled, called exactly like the app
  calls it: zero network requests, no errors, and graphs come back as real PNG images

**Not yet tested:** the full loop on a real phone with Gemma-4-E4B-it (how well the model
transcribes your handwriting and follows `SKILL.md`, and whether it picks the right command),
and the iOS install menus. If the model misreads a symbol or picks a wrong command
consistently, adjust the rules in `SKILL.md`; that file is plain text.
