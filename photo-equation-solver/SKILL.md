---
name: photo-equation-solver
description: Solves math from a photo or typed text, offline and exactly - equations, systems, inequalities, calculus (integrals, derivatives, limits, series, differential equations), matrices, complex numbers, number theory, probability and statistics, geometry and triangles, unit conversion, finance, chemistry, physics formulas and graphs. Use for any picture of math or when asked to solve or calculate something.
---

# Photo Math Solver

You only READ the math. The tool does ALL the calculating. Never solve it yourself, not even to check.

## Instructions

1. Look carefully at the picture (or the user's text) and copy the math exactly as written, in plain text, using the rules below.
2. Call the `run_js` tool with the following exact parameters:
   - script name: `index.html`
   - data: A JSON string with the following fields
     - equation: String. The math you read: ordinary notation, a command from the table, or the question in plain English.
     - solve_for: String, optional. Only when the user wants one specific unknown, for example "t".
   - Several separate problems: use `problems` (a list of strings) instead of `equation`.
3. Reply with the tool's "Read as" line and "Answer" lines exactly as returned. Add "Working" and "Check" only if the user wants steps. Never change the numbers. If a graph comes back, say it is shown in the chat.
4. Ask the user to check that "Read as" matches the picture; if not, ask for a closer, sharper photo.
5. Not sure how to write something? Call the tool with `{"equation": "help"}` or `{"equation": "help calculus"}` (topics: `syntax`, `words`, `equations`, `calculus`, `ode`, `numerical`, `curves`, `logic`, `multivar`, `optimize`, `algebra`, `matrix`, `number`, `stats`, `geometry`, `units`, `chemistry`, `finance`, `plot`) and use what it says.

## Writing the math

- One line of plain text; no LaTeX or dollar signs. Keep letters as in the picture (`F = m*a`).
- Power `x^2`, root `sqrt(x)`, `pi`, `abs(x)`, imaginary `i`, degrees `30°`, fractions with brackets `(x+1)/(x-1)`, decimals with a dot. Keep `=`, `<`, `>`, `<=`, `>=`. Several equations: separate with `;`.
- Do not simplify or solve, and add no words like "solve". Labels like "Q3." or "(a)" may stay.
- A question typed in plain English can be sent as it is: `find the derivative of x^3 + 2x`, `integrate x^2 from 0 to 1`, `area of a circle with radius 3`, `mean of 2, 4, 6, 8`, `1 + 2 + 3 + ... + 100` (more: `help words`).
- Story problem with no equation printed: do not calculate; give each unknown one letter and write each fact as an equation, separated by `;` (decimals for percentages). "Two numbers add to 20 and differ by 4" → `a + b = 20; a - b = 4`.
- Physics or other formula problem: write the formula, then the given values: "A 2 kg ball moves at 3 m/s; its kinetic energy?" → `K = 1/2*m*v^2, m = 2, v = 3`.

## Commands - name(arguments); `help` shows many more

| Topic | What to write |
|-------|---------------|
| Calculus | `integrate(f, x, a, b)` (`oo` = infinity), `diff(f, x, 2)`, `limit(f, x, a)`, `taylor(f, x, 0, 5)`, `sum(f, k, 1, oo)`, `tangent(f, x, a)`, `critical(f, x)`, `analyze(f, x)`, `areabetween(f, g, x)`, `newton(f, x, x0)` |
| Differential equations, series | as written, conditions after a comma: `y'' - 3y' + 2y = 0, y(0) = 1, y'(0) = 0`; `x' = 3x + y; y' = x + 3y`; `laplace(sin(2t), t)`; `convergence(n^2/2^n, n)`; `fourier(x^2, x, -pi, pi)` |
| Several variables | `grad(f, x, y)`, `critical(f, x, y)`, `lagrange(f, g, c, x, y)`, `integrate(integrate(x*y, y, 0, x), x, 0, 2)`, `polarint(...)`, `flux(...)` (`help multivar`) |
| Algebra | `factor(x^4-1)`, `expand((x+1)^5)`, `simplify(sin(2x)/sin(x))`, `apart(...)`, `rationalize(1/(sqrt(3)+1))`, `trigexpand(cos(3x))`, `discriminant(x^2 - 4x + 7)`, `(3+4i)(1-2i)`; exact `tan(22.5°)` |
| Equations | in an interval `cos(x) = 0.5, 0 <= x <= 2pi`; a formula with `"solve_for"`; `maximize 3x + 2y subject to x + y <= 4, x, y >= 0`; a conic or surface just written `x^2/4 + y^2/9 = 1` |
| Matrices, vectors | `det([[1,2],[3,4]])`, `inv(A)`, `eigen(A)`, `linsolve(A, b)`, `A*B`, `dot([1,2,3],[4,5,6])`, `cross(u, v)` |
| Numbers, counting, sets | `isprime(97)`, `factor(360)`, `17 mod 5`, `3x ≡ 4 (mod 7)`, `ncr(10,3)`, `factorial(8)`, `sequence(2,6,12,20)`, `union([1,2,3],[2,3,4])`, `truth table of p and (q or not r)` |
| Statistics, probability | `mean(2,4,4,5)`, `linreg([1,2,3],[2,4,7])`, `binompdf(10,0.5,3)`, `normalcdf(a, b, mean, sd)`, `tinterval(52,4,25,0.95)`, `ttest(...)`, `bayes(0.3, 0.8, 0.1)` |
| Geometry | `circle(5)`, `triangle(a=3, b=4, C=60)`, `distance([1,2],[4,6])`, `linecircle(y = x + 1, x^2 + y^2 = 25)`, `plane([1,0,0],[0,1,0],[0,0,1])` |
| Chemistry, finance, units | `molarmass(Ca(OH)2)`, `balance H2 + O2 -> H2O`, `compound(1000, 5%, 10)`, `loan(200000, 6.5, 30)`, `convert 5 km to miles`, `suvat(u=0, a=9.8, t=3)` |
| Graphs | `plot(x^2, x, -5, 5)`, `plotimplicit(x^2 + y^2 = 4)`, `histogram([2,3,3,4,5,7,8,9], 2)`, `scatter([1,2,3,4],[2,4,5,8])` |

Commands can be mixed with arithmetic: `ncr(5,2) * 3 + 1`.

## Examples

- Picture: 2x² − 5x + 3 = 0 → data: `{"equation": "2x^2 - 5x + 3 = 0"}`
- Picture: x + y = 10 and x − y = 2 → data: `{"equation": "x + y = 10; x - y = 2"}`
- Picture: ∫₀¹ x eˣ dx → data: `{"equation": "integrate(x*e^x, x, 0, 1)"}`
- Picture: lim x→0 sin x / x → data: `{"equation": "limit(sin(x)/x, x, 0)"}`
- Picture: y″ + 4y = 0 → data: `{"equation": "y'' + 4y = 0"}`
- Picture: "A 2 kg ball moves at 3 m/s. Find its kinetic energy." → data: `{"equation": "K = 1/2*m*v^2, m = 2, v = 3"}`
- User: "solve 3x + 2y = 12 for y" → data: `{"equation": "3x + 2y = 12", "solve_for": "y"}`

## If something goes wrong

- "Could not solve": look at the picture again, fix what you wrote (common slips: 1 and l, 0 and O, x and ×, a missing bracket or exponent) and call once more; if it names a command, call `help` for that topic.
- Too blurry or cut off to read: do not guess; ask for a sharper, closer photo of just the math.
