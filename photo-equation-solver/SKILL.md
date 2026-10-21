---
name: photo-equation-solver
description: Solves math from a photo or typed text, offline and exactly - equations, systems, inequalities, calculus (integrals, derivatives, limits, series, differential equations), matrices, complex numbers, number theory, probability and statistics, geometry and triangles, unit conversion, finance, chemistry, physics formulas and graphs. Use for any picture of math or when asked to solve or calculate something.
---

# Photo Math Solver

You only READ the math. The tool does ALL the calculating. Never solve it yourself.

## Instructions

1. Look carefully at the attached picture (or at the user's text) and copy the math exactly as written, in plain text, using the rules below.
2. Call the `run_js` tool with the following exact parameters:
   - script name: `index.html`
   - data: A JSON string with the following fields
     - equation: String. The math you read: ordinary notation, or one of the commands below.
     - solve_for: String, optional. Only when the user wants one specific unknown or letter, for example "t".
   - If the picture holds several separate problems, use `problems` (a list of strings) instead of `equation`.
3. Reply with the tool's "Read as" line and its "Answer" lines exactly as returned. Add the "Working" and "Check" lines only if the user wants steps. Never change the numbers. If the result comes with a picture (a graph), say that it is shown in the chat.
4. Ask the user to check that "Read as" matches their picture. If it does not, tell them to retake the photo closer and sharper.
5. Unsure how to write a command? Call the tool with `{"equation": "help"}` (topics: `help syntax`, `equations`, `calculus`, `ode`, `numerical`, `curves`, `logic`, `multivar`, `optimize`, `algebra`, `matrix`, `number`, `stats`, `geometry`, `units`, `plot`) and use what it says.

## Writing ordinary math

- One line of plain text. No LaTeX, no backslashes, no dollar signs.
- Power `x^2`, root `sqrt(x)`, pi `pi`, absolute value `abs(x)`, imaginary unit `i`, degrees `30°`.
- Fraction: put brackets around the top and the bottom: `(x+1)/(x-1)`.
- Multiplication `2x` or `2*x`. Decimals use a dot. Keep `=`, `<`, `>`, `<=`, `>=` as in the picture.
- Several equations or problems: separate them with `;`.
- Keep the letters exactly as in the picture, capitals too (`F = m*a`, `E = m*c^2`). Subscripts: `R_1`, `x_0`.
- Do not simplify, do not solve, do not add words like "solve" or "?".

## Commands - write them as name(arguments)

| Topic | What to write |
|-------|---------------|
| Calculus | `integrate(f, x)`, `integrate(f, x, a, b)` (`oo` = infinity), `diff(f, x)`, `diff(f, x, 2)`, `limit(f, x, a)`, `taylor(f, x, 0, 5)`, `sum(f, k, 1, oo)` |
| Calculus uses | `tangent(f, x, a)`, `critical(f, x)`, `analyze(f, x)` (full function study), `areabetween(f, g, x)`, `volumerev(f, x, a, b)`, `arclength(f, x, a, b)`, `newton(f, x, x0)`, `implicit(x^2 + y^2 - 25)` |
| Differential equations | write them as they are, initial conditions after a comma: `y' + 2y = e^x`, `y'' - 3y' + 2y = 0, y(0) = 1, y'(0) = 0`, `(x + y) dx + (x - y) dy = 0`, systems `x' = 3x + y; y' = x + 3y`; Laplace: `laplace(sin(2t), t)`, `ilaplace(1/(s^2+1), s)` |
| Curves and vectors | parametric `paramdiff(t^2, t^3, t, 2)`, `paramlength(cos(t), sin(t), t, 0, 2*pi)`; polar `polararea(1 + cos(t), t, 0, 2*pi)`, `polarlength(...)`; `curvature([t, t^2, t^3], t, 1)`, `velocity(...)`, `tnb(...)`, `lineintegral([y, x], [cos(t), sin(t)], t, 0, pi)`, `potential([2*x*y, x^2])`, `tospherical(1, 1, sqrt(2))` |
| Numerical methods | `euler(x + y, 0, 1, 0.1, 0.5)`, `rk4(...)`, `simpson(sin(x), 0, pi, 4)`, `trapezoid(x^2, 0, 1, 4)`, `bisection(x^3 - x - 2, 1, 2, 6)`, `secant(...)`, `interpolate([0,1,2], [1,3,7], 1.5)`, `polyfit([0,1,2,3], [1,2,5,10], 2)`, `spline(...)` |
| Several variables | `grad(f, x, y)`, `hessian(f, x, y)`, `critical(f, x, y)`, `lagrange(f, g, c, x, y)`, double integral `integrate(integrate(x*y, y, 0, x), x, 0, 2)` |
| Optimization | `maximize 3x + 2y subject to x + y <= 4, x, y >= 0` (linear programming) |
| Algebra | `factor(x^4-1)`, `expand((x+1)^5)`, `simplify(...)`, `apart(...)`, `gcd(12, 18)`, complex: `(3+4i)(1-2i)`, `sqrt(-4)`, `z^2 = 3+4i`, `polar(1+i)` |
| Formulas | write the equation and set `solve_for`: `v = u + a*t` with `"solve_for": "t"` |
| Matrices | `[[1,2],[3,4]]` with `det()`, `inv()`, `rank()`, `rref()`, `eigen()`, `linsolve(A, b)`, `A*B`, `A^-1`; vectors `dot([1,2,3],[4,5,6])`, `cross(...)`, `gramschmidt([1,1,0],[1,0,1])` |
| Numbers | `isprime(97)`, `factor(360)`, `divisors(36)`, `17 mod 5`, `3x ≡ 4 (mod 7)`, `ncr(10,3)`, `npr(10,3)`, `factorial(8)`, `sequence(2,6,12,20)`, `binary(10)`, `dice(2,6,7)`, `birthday(23)`, `arrangements of MISSISSIPPI` |
| Logic and graphs | `truth table of p and (q or not r)`, `not (p and q) equivalent to (not p) or (not q)`, `graphinfo([[1,2],[2,3],[3,1]])`, `shortestpath([[a,b,4],[a,c,1],[c,b,2]], a, b)`, `mst(...)`, `maxflow(...)`; recurrences `a_n = 5a_(n-1) - 6a_(n-2), a_0 = 1, a_1 = 0`; `euclid(252, 105)`, `cfrac(sqrt(7))`, `pell(61)` |
| Statistics | `mean(2,4,4,5)`, `stdev(...)`, `linreg([1,2,3],[2,4,7])`, `binompdf(10,0.5,3)`, `normalcdf(a, b, mean, sd)`, `invnorm(0.975)`, `tinterval(52,4,25,0.95)`, `ttest(...)`, `chisqtest(...)` |
| More statistics | `ttest2([5,6,7,8,9],[3,4,5,6,9])`, `pairedt([10,12,9],[8,11,9])`, `anova([4,5,6],[7,8,9],[1,2,3])`, `prop2test(45,100,30,90)`, `corrtest([1,2,3,4,5],[2,4,5,4,6])`, `outliers([1,2,3,50])`, `multireg([[1,2],[2,1],[3,5],[4,3],[5,6]], [3,4,9,8,12])`, `markov([[0.9,0.1],[0.5,0.5]])`, `gammacdf(2, 3, 1)` |
| Geometry | `circle(5)`, `cone(3,4)`, `triangle(a=3, b=4, C=60)`, `distance([1,2],[4,6])`; a conic is just written: `x^2 + y^2 - 6x + 4y - 12 = 0` |
| Other | `convert 5 km to miles`, `compound(1000, 5%, 10)`, `loan(200000, 6.5, 30)`, `molarmass(Ca(OH)2)`, `balance H2 + O2 -> H2O`, `suvat(u=0, a=9.8, t=3)` |
| Graphs | `plot(x^2, x, -5, 5)`, `plot(sin(x), cos(x), x, -6.28, 6.28)` |

Commands can be mixed with arithmetic: `ncr(5,2) * 3 + 1`.

## Examples

- Picture: 2x² − 5x + 3 = 0 → data: `{"equation": "2x^2 - 5x + 3 = 0"}`
- Picture: x + y = 10 and x − y = 2 → data: `{"equation": "x + y = 10; x - y = 2"}`
- Picture: ∫₀¹ x eˣ dx → data: `{"equation": "integrate(x*e^x, x, 0, 1)"}`
- Picture: lim x→0 sin x / x → data: `{"equation": "limit(sin(x)/x, x, 0)"}`
- Picture: a 2×2 matrix and "find the determinant" → data: `{"equation": "det([[1,2],[3,4]])"}`
- Picture: y″ + 4y = 0 → data: `{"equation": "y'' + 4y = 0"}`
- Picture: "How many ways can 3 of 10 people be chosen?" → data: `{"equation": "ncr(10,3)"}`
- Picture: maximize P = 3x + 2y subject to x + y ≤ 4, x ≥ 0, y ≥ 0 → data: `{"equation": "maximize 3x + 2y subject to x + y <= 4, x >= 0, y >= 0"}`
- Picture: find the critical points of f(x, y) = x³ − 3xy + y³ → data: `{"equation": "critical(x^3 - 3*x*y + y^3, x, y)"}`
- Picture: x² − 4 < 0 → data: `{"equation": "x^2 - 4 < 0"}`
- User: "solve 3x + 2y = 12 for y" → data: `{"equation": "3x + 2y = 12", "solve_for": "y"}`

## If something goes wrong

- If the tool result says "Could not solve" (an error), look at the picture again, fix what you wrote (common slips: 1 and l, 0 and O, x and ×, a missing bracket or exponent) and call the tool once more. If it complains about a command, call it with `help` for that topic.
- If the picture is too blurry or cut off to read, do not guess. Ask for a sharper, closer photo of just the math.
- For a word problem, first write the equation or the command it describes, then call the tool.
