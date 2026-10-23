// Worksheet noise must not change the answer: every hand-written case is sent again with a question label ("Q3.", "(a)", "1)",
// "Problem 2:", a bullet) in front and a trailing instruction after it, and must give exactly the same result as the clean text.
// Usage: node noise-battery.mjs <index.html> [seed]
import { load } from './harness.mjs';
import { CASES } from './cases.mjs';
const call = load(process.argv[2]);
let seed = Number(process.argv[3] || 1) * 104729 + 7;
const rng = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const pick = (a) => a[Math.floor(rng() * a.length)];
const PREFIX = ['Q3. ', 'Problem 2: ', '(a) ', '1) ', 'b) ', 'Ex. 5  ', '* ', 'Question 4: ', '(ii) ', '2. '];
const SUFFIX = ['', ' (solve for x)', ' (find the answer)', ' (simplify)'];
let total = 0, bad = 0, skipped = 0;
const strip = (r) => r.result ?? ('ERROR: ' + String(r.error).replace(/"[^"]*"/g, '"…"'));
for (const [input, , opts = {}] of CASES) {
  if (opts.skip || opts.solve_for || opts.err || /^\s*help\b/i.test(input) || /\n/.test(input) || input.length > 120) { skipped++; continue; }
  if (rng() > 0.5) continue; // about half of the cases per seed
  const noisy = pick(PREFIX) + input + (/[a-z]/i.test(input) && !/[a-z]{4}/i.test(input.replace(/\b(?:sin|cos|tan|ln|log|sqrt|abs|exp|pi|det|inv|oo)\b/gi, '')) ? pick(SUFFIX) : '');
  const a = strip(await call({ equation: input }));
  const b = strip(await call({ equation: noisy }));
  total++;
  if (a !== b) {
    bad++;
    if (bad <= 25) console.log('MISMATCH\n  clean: ' + input + '\n  noisy: ' + noisy + '\n  clean result: ' + a.slice(0, 200).replace(/\n/g, ' | ') + '\n  noisy result: ' + b.slice(0, 200).replace(/\n/g, ' | '));
  }
}
console.log(total + ' noisy variants of the hand-written cases (' + skipped + ' cases not eligible), ' + bad + ' differ from the clean answer');
process.exit(bad ? 1 : 0);
