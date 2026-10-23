---
name: photo-equation-solver
description: Solves math exactly and offline from a photo or typed text - equations, calculus, matrices, statistics, finance, geometry, units, chemistry, physics, graphs. Use for any picture of math or any request to solve or calculate something.
---

# Photo Math Solver

You only READ the math. The tool does ALL the calculating. Never solve, check, or write out steps or givens yourself.

## Instructions

1. Copy the math from the picture (or the user's text) exactly as written, as plain text (rules below).
2. Call the `run_js` tool at once, every time, with all three parameters:
   - skillName: `photo-equation-solver`
   - scriptName: `index.html`
   - data: a JSON string with `equation` (one short line: the math, a command, or the question in plain English; never your own formulas, sums or explanations) and, only if the user wants one unknown, `solve_for` (for example "t"). Several separate problems: `problems`, a list of strings, instead of `equation`.
3. Your reply is the tool's text, copied as returned: the "Read as: ..." line first, then the "Answer" lines. Never retype or rephrase the equation; copy every number digit for digit. Add "Working" only if the user asks for steps. A graph is shown in the chat.
4. "Could not solve": fix what you wrote and call once more. For anything not listed here, call the tool with `{"equation": "help"}` (it lists the topics), then with `{"equation": "help <topic>"}`, and use the exact syntax it shows.
5. Too blurry or cut off to read: do not guess, ask for a sharper photo of just the math.

## Writing the math

- One line of plain text, no LaTeX. Keep the letters as in the picture. Power `x^2`, root `sqrt(x)`, `pi`, `abs(x)`, `i`, `30°`, fractions with brackets `(x+1)/(x-1)`, `=` `<` `>` `<=` `>=`. Several equations: separate with `;`.
- Do not simplify or solve, and add no words like "solve". Labels like "Q3." or "(a)" may stay.
- A question in plain English can be sent as it is: `find the derivative of x^3 + 2x`, `integrate x^2 from 0 to 1`, `area of a circle with radius 3`, `mean of 2, 4, 6, 8` (more: `help words`).
- Story problem about plain numbers: write each fact as an equation, one letter per unknown, separated by `;`. "Two numbers add to 20 and differ by 4" → `a + b = 20; a - b = 4`. A formula problem: `K = 1/2*m*v^2, m = 2, v = 3`.
- Money (bonds, loans, interest), statistics, chemistry, units, geometry: do NOT set up formulas or sums. Call `{"equation": "help finance"}` (or `stats`, `chemistry`, `units`, `geometry`) first and use the command it shows.

## Some commands

`integrate(x^2, x, 0, 3)` `diff(x^3, x)` `limit(sin(x)/x, x, 0)` `y'' + 4y = 0` `det([[1,2],[3,4]])` `factor(x^4-1)` `ncr(10,3)` `binompdf(10,0.5,3)` `normalcdf(-1, 1, 0, 1)` `convert 5 km to miles` `compound(1000, 5%, 10)` `plot(x^2, x, -5, 5)`

## Examples

- Picture: 2x² − 5x + 3 = 0 → data: `{"equation": "2x^2 - 5x + 3 = 0"}`
- Picture: x + y = 10 and x − y = 2 → data: `{"equation": "x + y = 10; x - y = 2"}`
- Picture: ∫₀¹ x eˣ dx → data: `{"equation": "integrate(x*e^x, x, 0, 1)"}`
- User: "solve 3x + 2y = 12 for y" → data: `{"equation": "3x + 2y = 12", "solve_for": "y"}`
