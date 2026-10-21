# photo-equation-solver - development files

The skill itself is in [`../photo-equation-solver`](../photo-equation-solver).
That folder contains only what the app needs (`SKILL.md`, `scripts/index.html`, `README.md`).

This folder holds what is *not* shipped to the phone:

| Path | What |
|------|------|
| `src/*.js` | The solver, split by concern, concatenated in file-name order by `build.mjs` |
| `build.mjs` | Builds the single self-contained `scripts/index.html` (pure ASCII, no external resources; duplicate top-level names are rejected; `--expose` adds a test hook) |
| `tests/` | Hand-written cases, oracle batteries, property tests, fuzzers, a documentation test and a real-browser test |
| `run-all.sh` | Build + run everything (`PY=/path/to/python ./run-all.sh` to choose the Python with the oracle packages) |

Edit `src/`, then run `./run-all.sh`. Never edit the generated `index.html` by hand.

## Source modules

| File | Purpose |
|------|---------|
| `01-core.js` | BigInt rationals, rational polynomials / rational functions |
| `02-parse.js` | Text clean-up (unicode, LaTeX-ish, capital letters, subscripts), tokenizer, parser, printer |
| `02b-notation.js` | Command registry; printed notation (∫, lim, Σ, d/dx, ...) to command syntax |
| `03-eval.js` | Exact and floating-point evaluators, number recognition (1/2, pi/6, sqrt(2), ln 5) |
| `04-poly.js` | Polynomial roots: rational-root theorem, exact quadratics, Aberth iteration |
| `05-solve.js` | Equations, systems, inequalities, plain arithmetic, `solveProblem` |
| `07-cas.js` | Small computer-algebra core: canonical expressions, simplification, derivatives, expansion |
| `08-algebra.js` | Number theory helpers, polynomial factoring over Q, partial fractions, `factor` / `gcd` / ... |
| `08b-literal.js` | Solving formulas for a letter ("solve for t") |
| `08c-complex.js` | Complex numbers with exact components, polar form, roots, complex equations |
| `09a-quad.js` ... `09e-ode.js` | Numeric quadrature, integration (rule-based + verification), limits, calculus commands, ODEs |
| `10-linalg.js` | Exact linear algebra |
| `11-discrete.js` | Number theory, modular arithmetic, counting, sequences, sets, number bases |
| `12-stats.js` | Statistics, distributions (special functions), intervals and tests |
| `13a-geometry.js` | Shapes, triangles, coordinates, conic sections |
| `13b-applied.js` | Units, chemistry, finance, physics |
| `14-plot.js` | Graphs drawn on a canvas and returned as a PNG |
| `15-help.js` | Built-in `help` text (checked by the documentation test) |
| `90-dispatch.js` | Routing of command statements |
| `99-main.js` | `window.ai_edge_gallery_get_result` entry point and request parsing |

## Tests (`tests/`)

| File | What it checks |
|------|----------------|
| `cases.mjs` + `run-cases.mjs` | 468 hand-written input → expected output cases |
| `doc-test.mjs` | every example in `SKILL.md` runs; every command appears in the built-in help |
| `props.mjs`, `gen_expr.py`, `gen_poly.py` | random expressions / polynomials / systems against Fraction and numpy |
| `cas-props.mjs`, `gen_cas.py` | the symbolic core against sympy |
| `calc-battery.mjs`, `calc_oracle.py` | integrals, limits and sums against sympy / scipy |
| `disc-battery.mjs`, `gen_disc.py` | number theory, counting, sequences, statistics, distributions against sympy / scipy / numpy |
| `linalg-battery.mjs`, `gen_linalg.py` | linear algebra against sympy |
| `applied-battery.mjs`, `gen_applied.py` | geometry, triangles, units, chemistry, finance, complex numbers against pint / periodictable / numpy-financial / Python `complex` |
| `fuzz.mjs`, `fuzz-cmds.mjs` | random garbage text, and every command with random arguments: never crash, hang or print `NaN` |
| `browser-test.cjs` | the built page in real Chromium, offline, called the way the app calls it (needs Playwright) |

`pip install -r tests/requirements.txt` installs the Python oracles; the batteries are skipped when they are missing.
