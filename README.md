# Photo Math Solver - an offline skill for Google AI Edge Gallery

Take a photo of a math problem and get an **exact** answer from the on-device
**Gemma 4 E4B** model - no internet, no cloud, no API key.

The model uses its vision to *read* the math; a self-contained solver bundled in the
skill does all the *calculating* (exact fractions and symbolic expressions), and echoes
how the picture was read so a misread digit is easy to spot.

It covers equations, systems and inequalities, calculus (integrals, derivatives, limits,
series, tangent lines, curve study, areas and volumes), several-variable calculus, linear
programming, differential equations (first order of the usual textbook types, linear of any
order, Euler equations, systems) and Laplace transforms, matrices, complex numbers, number
theory and counting, statistics and probability, geometry (triangles, conic sections), unit
conversion, finance, chemistry (molar mass, balancing equations), physics formulas and graphs.

| | |
|---|---|
| Skill folder | [`photo-equation-solver/`](photo-equation-solver) - `SKILL.md`, `scripts/index.html`, `README.md` |
| Full docs (what it can do, install, notation, limits) | [`photo-equation-solver/README.md`](photo-equation-solver/README.md) |
| Source, build and tests | [`dev/`](dev) |

## Install in AI Edge Gallery

For fully offline use, install the skill so the app copies it into its own storage
(**Import local skill**, or paste it into the in-app skill editor). Skills added with
**Load skill from URL** only remember the URL and re-download `scripts/index.html` on every run.

To use the URL route, make this repository public, enable GitHub Pages (deploy from the
`main` branch, root), and enter `https://callmesobhan.github.io/photo-equation-solver-gemma4-e4b-it/photo-equation-solver`
in *Skills → (+) → Load skill from URL*. Check that `<that url>/SKILL.md` shows plain text.
The empty `.nojekyll` file in this repo keeps Pages from rewriting the Markdown.

## Develop

```bash
cd dev
./run-all.sh      # rebuilds photo-equation-solver/scripts/index.html and runs every test
```

Edit `dev/src/*.js`, never the generated `index.html`. See [`dev/README.md`](dev/README.md).

## Status

Tested on a desktop against independent oracles (sympy, scipy, numpy, pint, periodictable,
numpy-financial), with fuzzing, and with the page loaded in offline Chromium exactly as the
app calls it (details in the skill README).
**Not yet tested** on a phone with Gemma 4 E4B reading real photos, nor the iOS install menus.
