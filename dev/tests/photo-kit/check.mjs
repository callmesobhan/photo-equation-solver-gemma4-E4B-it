// Keeps the README honest: every typed form of the ten items gives the expected answer in the built solver.
// Usage: node check.mjs <index.html>
import { load } from '../harness.mjs';
import { ITEMS } from './expected.mjs';
const call = load(process.argv[2]);
let bad = 0;
for (const it of ITEMS) {
  const r = await call({ equation: it.typed });
  const text = r.result ?? r.error ?? '';
  const miss = it.card.filter((c) => !text.includes(c));
  if (miss.length) { bad++; console.log('✗ ' + it.id + ' (' + it.typed + '): missing ' + JSON.stringify(miss)); }
}
console.log(ITEMS.length - bad + ' of ' + ITEMS.length + ' photo-kit items give the expected answer');
process.exit(bad ? 1 : 0);
