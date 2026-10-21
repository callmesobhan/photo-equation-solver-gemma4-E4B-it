# Photo Equation Solver

Take a photo of an equation, a system of equations, an inequality or an arithmetic
problem, and get an **exact** answer - with no internet and no cloud service.

![JS](https://img.shields.io/badge/JS-0a9396) ![Image](https://img.shields.io/badge/Vision-0466c8) ![Offline](https://img.shields.io/badge/Offline-2dc653)

## How it works

```text
 photo ──► Gemma reads the math (vision) ──► plain text ──► run_js ──► exact solver ──► answer
           on-device LLM                     "2x^2-5x+3=0"  hidden      pure JS, no
                                                            webview     network
```

Small on-device models are good at *reading* a picture and bad at *calculating*.
So the model only transcribes the math into plain text, and a deterministic solver
bundled in `scripts/index.html` does all the maths with exact fractions. The answer
always starts with a **"Read as"** line that shows how the picture was read, so a
misread digit is easy to spot.

Everything runs on the phone. `scripts/index.html` is a single self-contained file:
no CDN, no `fetch`, no API key, no secret.

## What it can solve

| You send | Example | Answer |
|----------|---------|--------|
| Arithmetic, fractions, roots, powers, `!`, `%` | `3/4 + 5/6` | `19/12 (≈ 1.5833333)` |
| Linear / quadratic / any polynomial equation | `2x^2 - 5x + 3 = 0` | `x = 1`, `x = 3/2`; exact surds `(-1 + √5)/2`; complex roots |
| Equations with fractions (excluded values are rejected) | `(x^2-4)/(x-2) = 4` | `no solution` (x = 2 is not allowed) |
| Systems of linear equations (exact) | `x + y = 10; x - y = 2` | `x = 6, y = 4`; also "no solution" / "infinitely many" |
| Non-linear systems, up to 3 unknowns (numeric) | `x + y = 7; x^2 + y^2 = 25` | `x = 3, y = 4` and `x = 4, y = 3` |
| Trig, exponential, log, root, absolute value | `sin(x) = 1/2` | `x = π/6 + 2πk`, `x = 5π/6 + 2πk` |
| Inequalities, one unknown | `x^2 - 5x + 6 >= 0` | `x ≤ 2 or x ≥ 3`, `(-∞, 2] ∪ [3, ∞)` |
| One equation, several unknowns | `2x + 3y = 12` (`solve_for: y`) | `y = 4 - (2/3)x` |
| Several problems in one photo | `problems: [...]` | answered one by one |

Not supported: calculus (derivatives, integrals), matrices, word problems (the model has
to turn them into equations first), complex-number input, inequalities with trig.

## Install

> **Run it offline:** a skill added with *Load skill from URL* only stores the URL.
> In the Android code (`SkillManager.addSkillFromUrl`, `Skill.getJsSkillUrl`) the app
> fetches `scripts/index.html` from that URL **on every run**, so it needs a network
> connection each time. For real offline use, install the skill so that it is copied
> into the app's own storage: *Import local skill*, or create it in the in-app editor.

You need the model **Gemma-4-E4B-it** in the **Agent Skills** task.

1. Get the folder `photo-equation-solver/` (containing `SKILL.md` and `scripts/index.html`)
   onto the phone, for example from the `.zip` via AirDrop, iCloud Drive or the Files app.
   Unzip it there.
2. Open **AI Edge Gallery → Agent Skills**, pick Gemma-4-E4B-it, tap the **Skills** chip.
3. Tap **(+)** and choose one of:
   - **Import local skill** - pick the `photo-equation-solver` folder. *(fully offline)*
   - **Create / edit a skill** (if your version has it) - name `photo-equation-solver`,
     paste the description and the text below the second `---` of `SKILL.md` as the
     instructions, and paste the whole `scripts/index.html` as the script `index.html`.
     *(fully offline)*
   - **Load skill from URL** - host the folder on a real web host (GitHub Pages with an
     empty `.nojekyll` file; not `raw.githubusercontent.com`) and enter the folder URL.
     Check that `<url>/SKILL.md` shows the raw text. *(needs internet at run time)*
4. Make sure the skill is switched on in the Skill Manager.

The menu names above come from the Android app and the repository docs. The iOS app's
source is not in this repository, so its labels may differ slightly.

## Use it

1. In **Agent Skills**, tap the image button and take or choose a photo of the math.
2. Type something short such as *"solve this"*.
3. Check the **Read as** line against your photo. If it is wrong, retake the photo.

Tips for a good photo: fill the frame with the equation, hold the phone parallel to the
page, good even light, dark ink on white paper, one problem (or one system) per photo.
Neat handwriting works; cramped or slanted handwriting is where misreads happen.

If you tap the tool-call panel in the chat you can see exactly what text the model sent
to the solver, and the console log of the script.

## Notation the solver understands

You normally never type this yourself - the model writes it from the picture - but it
helps to know how the text is read:

- `^` power (`x^2`, also `x²`, `x**2`), `sqrt()`, `cbrt()`, `abs()` or `|x|`, `pi`/`π`, `e`
- `sin cos tan cot sec csc asin acos atan sinh cosh tanh`, `ln`, `log` (base 10), `log2`, `log_b(x)`, `exp`, `n!`, `50%`, `30°`
- implicit multiplication (`2x`, `3(x+1)`, `xy`) and `× · * ÷ /`
- division and multiplication go left to right: `1/2x` means `(1/2)·x`; write `1/(2x)` if you mean that
- LaTeX such as `\frac{a}{b}` and `\sqrt{x}`, unicode `− × ÷ √ π ≤ ≥ ≠ ½`, and mixed numbers `3 1/2` are tolerated
- systems: separate equations with `;`, a new line, `,` or `and`

## Limits worth knowing

- **Reading the picture is the weak spot, not the maths.** The solver is exact; the model
  can still misread a digit. That is why the answer repeats what it read.
- Numeric searches (trig, exp, log, roots of the unknown) look for real solutions between
  -200 and 200, or one period for trig; a note says so. They stop after about 2.5 seconds.
- Non-linear systems are found numerically from a grid of starting points, so a solution
  far from the origin can be missed (a note says so).
- Polynomial roots of degree 3 and up that have no rational root are numeric (8 digits).

## Files

```text
photo-equation-solver/
├── SKILL.md            instructions + examples for the model
├── README.md           this file
└── scripts/
    └── index.html      the solver (generated; source and tests live in the repo's dev/ folder)
```

## Testing status

Automated, on a desktop (see `dev/run-all.sh` in the repository):

- 236 hand-written cases (arithmetic, equations, systems, inequalities, messy transcriptions, errors)
- property tests against independent oracles: 1,200 random expressions vs Python `Fraction`,
  800 random polynomials vs `numpy.roots`, 400 polynomials with known rational roots,
  395 random linear systems, 600 quadratics, 252 trigonometric equations
- fuzzing with thousands of random garbage strings: no crash, no hang, no `NaN` in output
- the page loaded in real Chromium with the network disabled, called exactly like the app
  calls it: zero network requests, no errors

**Not yet tested:** the full loop on a real phone with Gemma-4-E4B-it (how well the model
transcribes your handwriting and follows `SKILL.md`), and the iOS install menus. If the
model misreads a symbol consistently, adjust the "How to write the equation" rules in
`SKILL.md`; that file is plain text.
