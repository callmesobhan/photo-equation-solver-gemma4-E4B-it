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
5. Unsure how to write a command? Call the tool with `{"equation": "help"}` (topics: `help syntax`, `equations`, `calculus`, `ode`, `numerical`, `curves`, `logic`, `multivar`, `optimize`, `algebra`, `matrix`, `number`, `stats`, `geometry`, `units`, `chemistry`, `finance`, `plot`, `words`) and use what it says.

## Writing ordinary math

- One line of plain text. No LaTeX, no backslashes, no dollar signs.
- Power `x^2`, root `sqrt(x)`, pi `pi`, absolute value `abs(x)`, imaginary unit `i`, degrees `30°`.
- Fraction: put brackets around the top and the bottom: `(x+1)/(x-1)`.
- Multiplication `2x` or `2*x`. Decimals use a dot. Keep `=`, `<`, `>`, `<=`, `>=` as in the picture.
- Several equations or problems: separate them with `;`.
- Keep the letters exactly as in the picture, capitals too (`F = m*a`, `E = m*c^2`). Subscripts: `R_1`, `x_0`.
- Do not simplify, do not solve, do not add words like "solve" or "?". Exception: a question the user typed in plain English (last row of the table) can be sent as it is.

## Story problems (no equation is printed)

Do not calculate. Give every unknown one single letter, write each fact as an equation, and send them together separated by `;`. Make rates and percentages decimals (`0.25*x`). The tool solves the system exactly, also when it is not linear.

- "Two numbers add to 20 and differ by 4" → `a + b = 20; a - b = 4`
- "A rectangle has area 24 and perimeter 20" → `l*w = 24; 2*(l+w) = 20`
- "A car at 60 km/h is caught by one at 80 km/h that leaves 0.5 h later" → `d = 60*t; d = 80*(t-0.5)`
- "15 coins, nickels and dimes, worth 1.00 in all" → `n + d = 15; 0.05*n + 0.10*d = 1`
- "A number plus its half plus its third is 10" → `x + x/2 + x/3 = 10`

If the question asks for one thing only, add `"solve_for"`. If the problem is really a formula or a command (interest, loan, triangle, chemistry, unit conversion), use that row of the table instead.

## Commands - write them as name(arguments)

`help` lists many more. A few of the most useful per topic:

| Topic | What to write |
|-------|---------------|
| Calculus | `integrate(f, x)`, `integrate(f, x, a, b)` (`oo` = infinity), `diff(f, x)`, `diff(f, x, 2)`, `limit(f, x, a)`, `taylor(f, x, 0, 5)`, `sum(f, k, 1, oo)` |
| Calculus uses | `tangent(f, x, a)`, `critical(f, x)`, `analyze(f, x)` (full function study), `areabetween(f, g, x)`, `volumerev(f, x, a, b)`, `arclength(f, x, a, b)`, `newton(f, x, x0)`, `implicit(x^2 + y^2 - 25)` |
| Series, Fourier | `convergence(n^2/2^n, n)`, `radius((x-2)^n/(n*3^n), n, x, 1)`, `fourier(x^2, x, -pi, pi)`, `fouriercos(x, x, pi)`; a sentence works too: `Does the series sum of 1/n^2 converge?` |
| Differential equations | write them as they are, initial conditions after a comma: `y' + 2y = e^x`, `y'' - 3y' + 2y = 0, y(0) = 1, y'(0) = 0`, `(x + y) dx + (x - y) dy = 0`, systems `x' = 3x + y; y' = x + 3y`; `laplace(sin(2t), t)`, `ilaplace(1/(s^2+1), s)`, with steps `u(t-a)` and impulses `delta(t-a)` |
| Equilibria | `equilibria(y*(1-y), y)`, `phaseplane(x*(1-y), y*(x-1), x, y)`, `classify([[3,1],[1,3]])` |
| Curves and vectors | `paramdiff(t^2, t^3, t, 2)`, `paramlength(cos(t), sin(t), t, 0, 2*pi)`, `polararea(1 + cos(t), t, 0, 2*pi)`, `curvature([t, t^2, t^3], t, 1)`, `lineintegral([y, x], [cos(t), sin(t)], t, 0, pi)`, `potential([2*x*y, x^2])` |
| Numerical methods | `euler(x + y, 0, 1, 0.1, 0.5)`, `rk4(...)`, `simpson(sin(x), 0, pi, 4)`, `bisection(x^3 - x - 2, 1, 2, 6)`, `interpolate([0,1,2], [1,3,7], 1.5)`, `polyfit([0,1,2,3], [1,2,5,10], 2)` |
| Several variables | `grad(f, x, y)`, `hessian(f, x, y)`, `critical(f, x, y)`, `lagrange(f, g, c, x, y)`, `integrate(integrate(x*y, y, 0, x), x, 0, 2)`, `polarint(x^2 + y^2, t, 0, 2*pi, r, 0, 1)`, `surfacearea(x^2 + y^2, x, 0, 1, y, 0, 1)`, `flux(...)`, `green(...)`, `stokes(...)` (`help multivar`) |
| Optimization | `maximize 3x + 2y subject to x + y <= 4, x, y >= 0` (linear programming) |
| Algebra | `factor(x^4-1)`, `expand((x+1)^5)`, `simplify(...)`, `apart(...)`, `gcd(12, 18)`, `ratroots(2x^3 - 3x^2 - 8x - 3)`, `rangeof(1/(x^2+1))`, `coeff((1 + 2x)^6, x, 3)`, `sinusoid(3*sin(2x - pi) + 1)`; complex: `(3+4i)(1-2i)`, `sqrt(-4)`, `z^2 = 3+4i`, `polar(1+i)` |
| Radicals and trig | `rationalize(1/(sqrt(3)+1))`, `denest(sqrt(5+2*sqrt(6)))`, `simplify(sin(2x)/sin(x))`, `trigexpand(cos(3x))` (also `expand(sin(a+b))`), `tosum(sin(x)*cos(3x))`; exact values `tan(22.5°)`, `cos(2*asin(1/3))` |
| Equation in an interval | add the interval after a comma: `cos(x) = 0.5, 0 <= x <= 2pi` |
| Formulas | write the equation and set `solve_for`: `v = u + a*t` with `"solve_for": "t"` |
| Matrices | `[[1,2],[3,4]]` with `det()`, `inv()`, `rank()`, `rref()`, `eigen()`, `linsolve(A, b)`, `A*B`, `A^-1`; `dot([1,2,3],[4,5,6])`, `cross(...)`, `svd([[3,0],[4,5]])`, `expm([[0,1],[-2,-3]], t)`, `independent([1,2,3],[4,5,6],[7,8,9])`, `leastsquares(A, b)` |
| Numbers | `isprime(97)`, `factor(360)`, `divisors(36)`, `17 mod 5`, `3x ≡ 4 (mod 7)`, `ncr(10,3)`, `npr(10,3)`, `factorial(8)`, `sequence(2,6,12,20)`, `dice(2,6,7)`, `birthday(23)`, `arrangements of MISSISSIPPI` |
| Logic and graphs | `truth table of p and (q or not r)`, `graphinfo([[1,2],[2,3],[3,1]])`, `shortestpath([[a,b,4],[a,c,1],[c,b,2]], a, b)`, `mst(...)`, `maxflow(...)`; recurrences `a_n = 5a_(n-1) - 6a_(n-2), a_0 = 1, a_1 = 0`; `euclid(252, 105)`, `pell(61)` |
| Statistics | `mean(2,4,4,5)`, `stdev(...)`, `linreg([1,2,3],[2,4,7])`, `binompdf(10,0.5,3)`, `normalcdf(a, b, mean, sd)`, `invnorm(0.975)`, `tinterval(52,4,25,0.95)`, `ttest(...)`, `chisqtest(...)`, `ttest2([5,6,7,8,9],[3,4,5,6,9])`, `anova([4,5,6],[7,8,9],[1,2,3])`, `corrtest(...)`, `reginf(...)`, `mannwhitney(...)`, `fisherexact([[8,2],[1,5]])`, `markov([[0.9,0.1],[0.5,0.5]])` |
| Geometry | `circle(5)`, `cone(3,4)`, `triangle(a=3, b=4, C=60)`, `distance([1,2],[4,6])`; a conic is just written: `x^2 + y^2 - 6x + 4y - 12 = 0` |
| Plane geometry | `circle([0,0],[4,0],[0,3])` (through 3 points), `linecircle(y = x + 1, x^2 + y^2 = 25)`, `tangentcircle(x^2 + y^2 = 25, [7,1])`, `lineintersect(y = 2x + 1, x + y = 7)`, `triangle2d(P, Q, R)`, `rotate([1,2], 90)`, `reflect([1,2], y = x)`, `hull(P1, P2, ...)` |
| Space (3-D) | `plane([1,0,0],[0,1,0],[0,0,1])`, `pointplane([1,2,3], 2x+3y-z=5)`, `skewlines([0,0,0],[1,0,0],[0,1,1],[0,1,0])`, `sphere([1,2,3], 5)`; a surface is just written: `x^2/4 + y^2/9 + z^2 = 1` |
| Chemistry | `molarmass(Ca(OH)2)`, `balance H2 + O2 -> H2O`, `limiting(H2 + O2 -> H2O, 4 g H2, 32 g O2)`, `empirical(C 40, H 6.7, O 53.3)`, `weakacid(1.8e-5, 0.10)`, `buffer(4.76, 0.20, 0.10)`, `electronconfig(Fe3+)`, `halflife(5730, 10000, 100)` |
| Finance | `compound(1000, 5%, 10)`, `loan(200000, 6.5, 30)`, `amortization(200000, 6%, 30)`, `bond(1000, 5%, 6%, 10, 2)`, `mirr([-1000, 300, 400, 500], 10%, 12%)`, `cagr(1000, 1800, 5)` |
| Other | `convert 5 km to miles`, `suvat(u=0, a=9.8, t=3)` |
| Graphs | `plot(x^2, x, -5, 5)`, `plot(sin(x), cos(x), x, -6.28, 6.28)`, `plotimplicit(x^2 + y^2 = 4)`, `contour(x^2 - y^2, x, -3, 3, y, -3, 3)`, `plotregion(y > x^2, x + y < 3)`, `slopefield(x - y, x, -3, 3, y, -3, 3, 0, 1)`, `scatter([1,2,3,4],[2,4,5,8])`, `histogram([2,3,3,4,5,7,8,9], 2)`, `boxplot([2,3,3,4,5,7,40])` |
| Plain English | the user's own wording works when the whole line is the question: `find the derivative of x^3 + 2x`, `integrate x^2 from 0 to 1`, `limit of sin(x)/x as x approaches 0`, `factor x^2 - 5x + 6`, `gcd of 12 and 18`, `area of a circle with radius 3`, `distance between (1,2) and (4,6)`, `mean of 2, 4, 6, 8`, `determinant of [[1,2],[3,4]]` (more: `help words`) |

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
- Picture: "The sum of two numbers is 20 and their difference is 4." → data: `{"equation": "a + b = 20; a - b = 4"}`

## If something goes wrong

- If the tool result says "Could not solve" (an error), look at the picture again, fix what you wrote (common slips: 1 and l, 0 and O, x and ×, a missing bracket or exponent) and call the tool once more. If it complains about a command, call it with `help` for that topic.
- If the picture is too blurry or cut off to read, do not guess. Ask for a sharper, closer photo of just the math.
- Do not do the arithmetic yourself, not even to check. Only what the tool returns is the answer.
