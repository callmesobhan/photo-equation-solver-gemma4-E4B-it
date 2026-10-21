# photo-equation-solver - development files

The skill itself is in [`../photo-equation-solver`](../photo-equation-solver).
That folder contains only what the app needs (`SKILL.md`, `scripts/index.html`, `README.md`).

This folder holds what is *not* shipped to the phone:

| Path | What |
|------|------|
| `src/*.js` | The solver, split by concern, concatenated in file-name order by `build.mjs` |
| `build.mjs` | Builds the single self-contained `scripts/index.html` (pure ASCII, no external resources) |
| `tests/` | Hand-written cases, property tests, fuzzing, and a real-browser test |
| `run-all.sh` | Build + run everything |

Edit `src/`, then run `./run-all.sh`. Never edit the generated `index.html` by hand.

| File | Purpose |
|------|---------|
| `src/01-core.js` | BigInt rationals, rational polynomials / rational functions |
| `src/02-parse.js` | Text clean-up (unicode, LaTeX-ish), tokenizer, parser, pretty printer |
| `src/03-eval.js` | Exact and floating-point evaluators, number recognition (1/2, pi/6, sqrt(2), ln 5) |
| `src/04-poly.js` | Polynomial roots: rational-root theorem, exact quadratics, Aberth iteration |
| `src/05-solve.js` | Equations, systems, inequalities, plain arithmetic |
| `src/06-main.js` | `window.ai_edge_gallery_get_result` entry point and request parsing |
