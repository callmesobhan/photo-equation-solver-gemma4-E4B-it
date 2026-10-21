---
name: photo-equation-solver
description: Solves math from a photo. Reads the equation, system of equations, inequality or arithmetic in the attached picture (or typed text) and computes the exact answer offline. Use for any picture of math or when asked to solve or calculate something.
---

# Photo Equation Solver

You only READ the math. The tool does ALL the calculating. Never solve it yourself.

## Instructions

1. Look carefully at the attached picture (or at the user's text) and copy the math exactly as written.
2. Call the `run_js` tool with the following exact parameters:
   - script name: `index.html`
   - data: A JSON string with the following fields
     - equation: String. The math you read, written in plain text using the rules below.
     - solve_for: String, optional. Only when the user asks for one specific unknown, for example "y".
   - If the picture holds several separate problems, use `problems` (a list of strings) instead of `equation`.
3. Reply with the tool's "Read as" line and its "Answer" lines exactly as returned. Add the "Working" and "Check" lines only if the user wants steps. Never change the numbers.
4. Ask the user to check that "Read as" matches their picture. If it does not, tell them to retake the photo closer and sharper.

## How to write the equation

- One line of plain text. No LaTeX, no backslashes, no dollar signs.
- Power: `x^2`, `2^x`. Square root: `sqrt(x)`. Pi: `pi`. Absolute value: `abs(x)`.
- Fraction: always put brackets around the top and the bottom: `(x+1)/(x-1)`.
- Multiplication: `2x` or `2*x`. Decimals use a dot: `2.5`.
- Keep `=`, `<`, `>`, `<=`, `>=` exactly as in the picture.
- A system of equations: separate the equations with `;`.
- A small raised number is an exponent (x² is `x^2`). A horizontal bar with parts above and below is a fraction. A root sign covers everything under its bar: `sqrt( ... )`.
- Copy every digit and sign. Do not simplify, do not solve, do not add words, no "solve", no "?".

## Examples

- Picture: 2x² − 5x + 3 = 0 → data: `{"equation": "2x^2 - 5x + 3 = 0"}`
- Picture: x + y = 10 and x − y = 2 → data: `{"equation": "x + y = 10; x - y = 2"}`
- Picture: (x+1)/(x−1) = 2 → data: `{"equation": "(x+1)/(x-1) = 2"}`
- Picture: √(x+3) = 5 → data: `{"equation": "sqrt(x+3) = 5"}`
- Picture: 3 + 4 × 2 → data: `{"equation": "3 + 4*2"}`
- Picture: x² − 4 < 0 → data: `{"equation": "x^2 - 4 < 0"}`
- User: "solve 3x + 2y = 12 for y" → data: `{"equation": "3x + 2y = 12", "solve_for": "y"}`

## If something goes wrong

- If the tool result says "Could not solve" (an error), look at the picture again, fix what you wrote (common slips: 1 and l, 0 and O, x and ×, a missing bracket or exponent) and call the tool once more.
- If the picture is too blurry or cut off to read, do not guess. Ask for a sharper, closer photo of just the equation.
- For a word problem, first write the equation(s) it describes, then call the tool.
