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
5. Unsure how to write a command? Call the tool with `{"equation": "help"}` (topics: `help syntax`, `equations`, `calculus`, `algebra`, `matrix`, `number`, `stats`, `geometry`, `units`, `plot`) and use what it says.

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
| Calculus | `integrate(f, x)`, `integrate(f, x, a, b)` (`oo` = infinity), `diff(f, x)`, `diff(f, x, 2)`, `limit(f, x, a)`, `taylor(f, x, 0, 5)`, `sum(f, k, 1, oo)`; a differential equation as it is written: `y'' + y = 0, y(0) = 1` |
| Algebra | `factor(x^4-1)`, `expand((x+1)^5)`, `simplify(...)`, `apart(...)`, `gcd(12, 18)`, complex: `(3+4i)(1-2i)`, `sqrt(-4)`, `z^2 = 3+4i`, `polar(1+i)` |
| Formulas | write the equation and set `solve_for`: `v = u + a*t` with `"solve_for": "t"` |
| Matrices | `[[1,2],[3,4]]` with `det()`, `inv()`, `rank()`, `rref()`, `eigen()`, `linsolve(A, b)`, `A*B`, `A^-1`; vectors `dot([1,2,3],[4,5,6])`, `cross(...)` |
| Numbers | `isprime(97)`, `factor(360)`, `divisors(36)`, `17 mod 5`, `3x ≡ 4 (mod 7)`, `ncr(10,3)`, `npr(10,3)`, `factorial(8)`, `sequence(2,6,12,20)`, `binary(10)` |
| Statistics | `mean(2,4,4,5)`, `stdev(...)`, `linreg([1,2,3],[2,4,7])`, `binompdf(10,0.5,3)`, `normalcdf(a, b, mean, sd)`, `invnorm(0.975)`, `tinterval(52,4,25,0.95)`, `ttest(...)`, `chisqtest(...)` |
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
- Picture: x² − 4 < 0 → data: `{"equation": "x^2 - 4 < 0"}`
- User: "solve 3x + 2y = 12 for y" → data: `{"equation": "3x + 2y = 12", "solve_for": "y"}`

## If something goes wrong

- If the tool result says "Could not solve" (an error), look at the picture again, fix what you wrote (common slips: 1 and l, 0 and O, x and ×, a missing bracket or exponent) and call the tool once more. If it complains about a command, call it with `help` for that topic.
- If the picture is too blurry or cut off to read, do not guess. Ask for a sharper, closer photo of just the math.
- For a word problem, first write the equation or the command it describes, then call the tool.
