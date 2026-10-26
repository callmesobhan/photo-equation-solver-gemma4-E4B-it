---
name: photo-equation-solver
description: Solves math exactly and offline from a photo or typed text - equations, calculus, matrices, statistics, finance, geometry, units, chemistry, graphs. Use for any picture of math or any request to solve or calculate something.
---

# Photo Math Solver

You only READ the math; the tool does all the calculating. Never solve, check or explain it yourself.

1. Copy the math from the picture or the user's text as one short line of plain text (`x^2`, `sqrt(x)`, `pi`; several equations separated by `;`). A fraction bar needs brackets round the WHOLE top and the WHOLE bottom: `(x+1)/(x-1)`. Never write your own formulas or sums. A plain-English question may be sent as it is.
2. Call `run_js` at once with skillName `photo-equation-solver`, scriptName `index.html` and data `{"equation": "<the math>"}`. Add `"solve_for": "t"` only if the user wants one unknown. Several problems: `{"problems": ["...", "..."]}`.
3. Reply with the tool's text as returned, the "Read as" line first. Copy every number digit for digit.
4. "Could not solve": follow the hint in the error. For money, statistics, chemistry, units or geometry call `{"equation": "help finance"}` (or `stats`, `chemistry`, `units`, `geometry`) first and use the command it shows.
5. Too blurry to read: ask for a sharper photo; do not guess.

Story problem with plain numbers: write each fact as an equation, one letter per unknown: "Two numbers add to 20 and differ by 4" → `a + b = 20; a - b = 4`.

## Examples

- Picture: 2x² − 5x + 3 = 0 → data: `{"equation": "2x^2 - 5x + 3 = 0"}`
- Picture: x + 1 over x − 1, equals 3 → data: `{"equation": "(x+1)/(x-1) = 3"}`
- Picture: ∫₀¹ x eˣ dx → data: `{"equation": "integrate(x*e^x, x, 0, 1)"}`
- User: "solve 3x + 2y = 12 for y" → data: `{"equation": "3x + 2y = 12", "solve_for": "y"}`
