# Photo Equation Solver - an offline skill for Google AI Edge Gallery

Take a photo of an equation (or system, inequality, or arithmetic) and get an **exact**
answer from the on-device **Gemma 4 E4B** model - no internet, no cloud, no API key.

The model uses its vision to *read* the math; a self-contained solver bundled in the
skill does all the *calculating* with exact fractions, and echoes how the picture was
read so a misread digit is easy to spot.

| | |
|---|---|
| Skill folder | [`photo-equation-solver/`](photo-equation-solver) - `SKILL.md`, `scripts/index.html`, `README.md` |
| Full docs (install, notation, limits) | [`photo-equation-solver/README.md`](photo-equation-solver/README.md) |
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

Edit `dev/src/*.js`, never the generated `index.html`.

## Status

Tested on a desktop: 236 hand-written cases, property tests against Python `Fraction` and
`numpy.roots`, fuzzing, and the page loaded in offline Chromium exactly as the app calls it.
**Not yet tested** on a phone with Gemma 4 E4B reading real photos, nor the iOS install menus.
