# Photo kit: handwritten test equations for the phone

Ten equations (one image each) for testing the whole chain on a phone: photo -> Gemma reads it -> the skill solves it.
The pictures are **simulated** handwriting: handwriting fonts for letters and digits, hand-drawn strokes for fraction
bars, roots, integral signs, brackets and arrows, then a lined-paper background with tilt, uneven light and noise.
They are tidier than a real hand, so a pass here does not prove a pass on your own writing.

| # | On the picture | The answer card must show |
|---|---|---|
| 1 | 2x² − 5x + 3 = 0 | x = 1, x = 3/2 |
| 2 | ∫₀¹ x eˣ dx | 1 |
| 3 | lim x→∞ (1 + 1/x)ˣ | e (≈ 2.7182818) |
| 4 | the matrix with rows 3 1 / 2 4, "find the determinant" | 10 |
| 5 | √(x + 7) = x + 1 | x = 2 only |
| 6 | (x + 1) over (x − 1) = 3, real fraction bar | x = 2 (`x + 1/x - 1 = 3` would give 2 ± √3: the brackets were lost) |
| 7 | 10x − 3 = 0.5x + 15 | x = 36/19 |
| 8 | log₂(x) + log₂(x − 2) = 3 | x = 4 |
| 9 | x² + y² = 25 and y = x + 1, two lines | (−4, −3) and (3, 4) |
| 10 | a bond: face value $1000, 5% coupon twice a year, 10 years, yield 6% | price 925.61, Macaulay duration 7.8949973 years |

`expected.mjs` holds the same table in code and `node check.mjs <index.html>` runs the typed form of every item
through the built solver (it is part of `dev/run-all.sh`), so this table cannot drift from the solver.

## Included images (`images/`)

Four of the ten, the ones that taught something on the phone:

- `06-fraction.png`: a model that drops the brackets reads this as `x/x + 1 = 3`. (An earlier draft of this image had a
  bug, a denominator of `x` only; this is the corrected one.)
- `08-logs.png`: subscripts.
- `09-system.png`: one system over two lines.
- `10-bond-closeup.png`: the bond problem cropped tight. The same picture with a lot of empty margin made Gemma read
  `bond(10000, 5%, 6%, 1000, 2)` at visual token budget 280; text that fills the frame was read correctly.
  Lesson: take the photo close.

## Making all ten

```
./get-fonts.sh                  # four handwriting fonts (SIL OFL) from github.com/google/fonts -> fonts/
node render.cjs                 # Chromium, needs Playwright; CHROMIUM=/path/to/chromium if needed -> out/raw-*.png
python3 photo.py                # Pillow + numpy: tilt, light, noise -> out/photos/*.png
python3 closeup.py              # the tight crop of the bond problem -> out/photos/10-bond-closeup.png
```

`fonts/` and `out/` are not committed.

## Running a test on the phone

One fresh chat per image; attach the image and type only "solve". Keep the settings fixed between runs and write them
down with the result: TopK 1, Max Tokens 8050, GPU, visual token budget 280. Look at the expanded tool box (the Data
line is what Gemma read) and at the answer card (the exact result). A wrong Data line is a reading error; a wrong card
with a right Data line would be a solver error.
