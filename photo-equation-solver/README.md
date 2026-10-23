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
(about 1.2 MB): no CDN, no `fetch`, no API key, no secret. Ask it for `help` (or
`help calculus`, `help stats`, ...) and it lists every command - offline too - so
`SKILL.md` is kept very short on purpose: about 3 KB (roughly 1,000 tokens). The app reads it again for every question and the on-device model's context window is small (the default "Max tokens" for Gemma-4-E4B-it is 4000, shared by the app's prompt, `SKILL.md`, the tool call and the answer; raising it to about 8000 in the chat's settings helps). Only a few commands are listed there; the rest is found with `help`, or by writing the question in plain English.

**The answer card.** Gallery tells the model to reply with a one-sentence summary, and a small model can copy digits wrongly (seen on a phone: a price of 925.61 came back as "$9.610"). So every ordinary result also comes back as a picture of the exact "Read as" and "Answer" lines, shown in the chat under the model's sentence (graphs come back as graphs, `help` as text). If the sentence and the card differ, the card is right. The chat settings matter too: TopK 1 (always the single most likely word) can send the model into a repetition loop on long text, while a high temperature corrupts digits; the card makes the second harmless.

## What it can do

| Area | Examples (what the model sends) |
|------|---------------------------------|
| **Equations** | linear, quadratic, any polynomial, rational, radical, exponential, logarithmic, trigonometric, absolute value; systems (exact when linear); inequalities; `2x^2 - 5x + 3 = 0`, `x + y = 7; x^2 + y^2 = 25`, `x^2 - 5x + 6 >= 0` |
| **Formulas** | solve for any letter: `v = u + a*t` (t), `d = v*t + a*t^2/2` (t), `1/f = 1/u + 1/v` (v), `A = P*e^(r*t)` (t) |
| **Calculus** | `integrate(f, x)` (checked by differentiating), definite and improper integrals, `diff(f, x, n)`, `limit(f, x, a)` (one-sided, at infinity), `taylor`, `sum` / `product` (finite and infinite, convergence reported); **applications**: `tangent`, `critical` (extrema, absolute max/min on an interval), `analyze` (domain, intercepts, asymptotes, increasing/decreasing, inflection, concavity), `areabetween`, `volumerev`, `shells`, `arclength`, `avgvalue`, `newton`, `implicit`, `inversefunction` |
| **Differential equations** | first order: linear, separable (explicit when possible, e.g. logistic), Bernoulli, homogeneous, exact / integrating factor, `M dx + N dy = 0`; linear with constant coefficients of any order with forcing (undetermined coefficients, or variation of parameters for `tan`, `sec`, `ln`, `1/x`...); Euler–Cauchy `x²y'' + xy' + y = 0`; systems of 2-3 equations (repeated eigenvalues too); initial conditions; **Laplace** `laplace(f, t)`, `ilaplace(F, s)` (also with unit steps `u(t-a)` and impulses `delta(t-a)`, and equations such as `y'' + y = u(t-pi)` with such forcing). Every solution is substituted back into the equation |
| **Curves and vectors** | `paramdiff`, `paramlength`, `paramarea`, `polararea`, `polarlength`, `polarslope`, coordinate conversions (`topolar`, `tospherical`, ...), `velocity`, `curvature`, `tnb` (T, N, B, curvature, torsion), `lineintegral`, `potential` |
| **Numerical methods** | `euler` / `heun` / `rk4` for y' = f(x, y) (exact fractions, compared with the exact solution), `trapezoid` / `simpson` / `midpointrule` / `riemann` with error bounds, `bisection`, `secant`, `falseposition`, `fixedpoint`, `interpolate`, `spline`, `polyfit`, `difftable`, `numdiff` |
| **Series** | `convergence(n^2/2^n, n)`: converges absolutely / conditionally or diverges, with the test that decides (term, geometric, ratio, root, p-series comparison, integral, alternating); `radius((x-2)^n/(n*3^n), n, x, 1)`: radius and interval of convergence with both end points tested; written as sentences too ("Does the series Σ 1/n^2 converge?") |
| **Plain English** | the whole line may be a textbook question in words: "find the derivative of x^3 + 2x", "integrate x^2 from 0 to 1", "limit of sin(x)/x as x approaches 0", "factor x^2 - 5x + 6", "gcd of 12 and 18", "area of a circle with radius 3", "distance between (1,2) and (4,6)", "mean of 2, 4, 6, 8", "determinant of [[1,2],[3,4]]", "let f(x) = 2x + 1 and g(x) = x^2, find f(g(3))"; the asked quantity is listed first. Words that are not maths ("What is the length of a rectangle with area 20...") are refused instead of being read as products of letters (`help words` lists the phrasings) |
| **Plane geometry** | circle through three points / from a diameter / centre and radius, line and circle (secant, tangent, none; exact points), two circles (apart, touching, intersecting, inside; radical axis), tangents from or at a point, perpendicular bisector, parallel and perpendicular lines, intersection and angle, triangle centres (centroid, circumcentre, orthocentre, incentre and radii), rotation / reflection / translation / dilation, section formula, collinearity, convex hull; lines and circles can be written as equations |
| **Equations in an interval** | `cos(x) = 0.5, 0 <= x <= 2pi`, `sin(x) = 1/2 for x in [0, 360°]`, `x^3 - x = 0 on (-2, 2)`: only the solutions inside the interval (exact values and degrees when they are recognised; touching roots are polished); `verify sin(2x) = 2 sin(x) cos(x)` reports an identity |
| **Equilibria / phase portraits** | `equilibria(y*(1-y), y)` (sink / source / semi-stable and the phase line), `phaseplane(x*(1-y), y*(x-1), x, y)` (every equilibrium with its Jacobian, eigenvalues and type: saddle, node, star, spiral, centre; a whole line of equilibria is recognised), `classify([[3,1],[1,3]])` (linear systems, 2×2 and 3×3); a solved linear system also states its phase portrait; sentences work ("classify the equilibria of x' = ..., y' = ...") |
| **Fourier series** | `fourier(x^2, x, -pi, pi)`: a₀/2, the general aₙ and bₙ (shown only when the closed form agrees with the exact coefficients of the first eight harmonics), the first harmonics as a sum; piecewise definitions `fourier(-1, 1, x, -pi, 0, pi)`, `|x − c|` is split automatically, half-range `fouriercos` / `fouriersin`; sentences work ("Fourier series of f(x) = x on (-π, π)") |
| **Regression inference, rank tests** | `reginf(xs, ys)` (slope and intercept: SE, t, p, confidence intervals, r², F; `reginf(xs, ys, 0.9, x0)` adds mean-response and prediction intervals), `mannwhitney`, `wilcoxon` (signed-rank, exact or normal approximation like scipy), `kruskalwallis`, `signtest`, `fisherexact`, `mcnemar` |
| **Precalculus helpers** | `sinusoid` (amplitude, period, phase shift, midline), `rangeof` (the range of a function as intervals: extrema, end values and limits, holes and poles), `endbehavior`, `evenodd`, `ratroots` (rational root theorem), `coeff` (binomial and product expansions), `independent` / `inspan` / `nullity` for vectors, cards / marbles / dice probabilities, and many plain-English phrasings for them |
| **Multiple integrals and vector calculus** | `lamina` / `solid` (mass, centre of mass, moments of inertia), `polarint`, `cylint`, `sphint`, `surfacearea` (graphs and parametric surfaces), `flux`, and the theorems of Green (`green`), Gauss (`divtheorem`) and Stokes (`stokes`); exact whenever the integrator finds antiderivatives, otherwise a Gauss–Legendre decimal |
| **Several variables** | `grad`, `hessian`, `jacobian`, `divergence`, `curl`, `directional`, `tangentplane`, critical points of `f(x, y)` with the second-derivative test, `lagrange` multipliers, double and triple integrals as nested `integrate(...)` |
| **Linear programming** | `maximize 3x + 2y subject to x + y <= 4, x, y >= 0` (up to 4 variables; exact corner points, unbounded/infeasible detection, integer programs) |
| **Quadratics, logs, sets** | `discriminant`, `completesquare`, `vertex` (axis, minimum / maximum), `foci of the ellipse ...` and other conic features, expanding and condensing logarithms (`expand(log(x^2*y))`, `logcondense(2*log(x) + log(y))`), a term of a binomial expansion (`binomterm(x, y, 9, 4)`), sets (`union`, `intersection`, `setdiff`, `symdiff`, `setcomplement`, `cardinality`, `issubset`, `powerset`, `cartesian`; also `A = {1,2,3}, B = {2,3,4}, find A ∪ B`), digits in bases up to 36 (`hexadecimal FF to decimal`), ratios `12:18`, proportions `3:4 = x:12`, scientific notation, confidence intervals from summary numbers |
| **Numbers, decimals, statistics phrasings** | `perfect(28)`, `perfectsq`, `todecimal(1/7)` = 0.(142857), `tofraction`, `0.333... as a fraction`, `nthterm([5,8,11],20)`, rounding "to the nearest hundredth / 2 significant figures", remainders of huge powers, `P(Z < 1.5)`, t / z / chi-square critical values, standard error, "at least one six in 4 rolls", regression line and prediction from two lists, pH of strong acids, annuity and present / future values in words |
| **Messy input** | worksheet labels (`Q3.`, `Problem 2:`, `(a)`, `1)`), bullets, `**bold**`, `$...$`, trailing `=> x = ?` or `(solve for x)` are ignored; a numbered list becomes separate problems; `F = m*a with m = 5 and a = 2, find F`; `Σ k from 1 to 10`; `∫₀^π sin x dx`; `\\det\\begin{bmatrix}...` |
| **Textbook theorems, series, probability** | `linapprox(sqrt(x), x, 4, 4.1)` (L(x), the estimate and its error), `mvt` / `rolle` / `ivt` (conditions checked, every c found), patterned sums written as they are (`1 + 2 + 3 + ... + 100`, `1 + 1/2 + 1/4 + ...`, `1 + 1/4 + 1/9 + ...` = π²/6), infinite sums with factorials (`sum(1/n!, n, 0, oo)` = e), `binomstats` / `poissonstats` / `geomstats` / `diestats`, `condprob`, `bayes` and sentences like "P(A|B) if P(A and B) = 0.2 and P(B) = 0.5", "how many ways can 5 people sit in a row" |
| **Algebra** | `factor`, `expand`, `simplify`, `apart` (partial fractions), `gcd`/`lcm`, polynomial division, exact radicals |
| **Radicals and trigonometry** | exact surds in canonical form (`(2+sqrt(3))^2` = 7 + 4√3, `1/(sqrt(6)-sqrt(2))` = (√6 + √2)/4, `denest(sqrt(5+2*sqrt(6)))` = √3 + √2, `rationalize(x/(sqrt(x)+1))`), exact values of all six trig functions at multiples of π/n for n = 1, 2, 3, 4, 5, 6, 8, 10, 12 (`tan(22.5°)` = √2 − 1, `cos(pi/5)` = (1 + √5)/4, `tan(pi/2)` is reported undefined), trig of inverse trig (`tan(asin(3/5))`, `cos(2*asin(1/3))`, `sin(atan(3)+atan(4))`), `simplify` of trigonometric expressions in one variable (Pythagorean and double-angle identities, tan / cot / sec / csc ratios: `sin(2x)/sin(x)` = 2cos(x)), `trigexpand` / `expand` (sum and multiple-angle formulas), `tosum` (product-to-sum, power reduction) |
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
forced or non-constant systems), symbolic
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

- 1004 hand-written cases (equations, calculus, matrices, number theory, statistics, complex numbers,
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
  every new picture type decoded in real Chromium and checked to contain its drawing;
  series verdicts and power-series intervals for ~190 families per seed whose behaviour is known from theory;
  Laplace transforms and differential equations with unit steps and impulses against quadrature, mpmath and scipy: 117 checks per seed
- property tests against Python `Fraction` and `numpy.roots`; fuzzing with random garbage and with
  every command called with random arguments (tens of thousands of calls): no crash, no hang, no `NaN`
- the page loaded in real Chromium with the network disabled, called exactly like the app
  calls it: zero network requests, no errors, and graphs come back as real PNG images

**Not yet tested:** the full loop on a real phone with Gemma-4-E4B-it (how well the model
transcribes your handwriting and follows `SKILL.md`, and whether it picks the right command),
and the iOS install menus. If the model misreads a symbol or picks a wrong command
consistently, adjust the rules in `SKILL.md`; that file is plain text.
