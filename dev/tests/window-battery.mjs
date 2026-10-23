// Equations with an interval for the unknown ("sin(x) = 1/2, 0 <= x <= 2pi") against a fine numerical scan + brentq (scipy) and
// polynomials whose roots are chosen in advance.
import { spawnSync } from 'node:child_process';
import { load } from './harness.mjs';
const call = load(process.argv[2]);
const PY = process.env.PY || 'python3';
const r = spawnSync(PY, ['gen_window.py', process.argv[3] || '1'], { encoding: 'utf8', maxBuffer: 1 << 28 });
if (r.status) { console.log(r.stderr); process.exit(1); }
const cases = JSON.parse(r.stdout);
let bad = 0;
const near = (a, b) => Math.abs(a - b) <= 1e-6 * (1 + Math.abs(b));
for (const c of cases) {
  const res = await call({ equation: c.text });
  const fail = (why) => { bad++; console.log('FAIL ' + c.text + '\n   ' + why + '\n   ' + String(res.result ?? res.error).split('\n').slice(0, 8).join(' | ')); };
  if (res.error !== undefined) { fail('error: ' + res.error); continue; }
  const lines = res.result.split('\n');
  const ai = lines.findIndex((l) => /^Answer:/.test(l));
  const ans = lines.slice(ai).filter((l, i) => i === 0 || /^\s/.test(l));
  const got = [];
  if (ans.every((l) => /no real solution/.test(l))) { if (c.roots.length) fail('no solution found, expected ' + JSON.stringify(c.roots)); continue; }
  for (const l of ans) {
    const m = /x (?:=|≈) (-?\d+(?:\/\d+)?)(?:\s|$)/.exec(l.replace(/^Answer:\s*/, '').trim() ? l.replace(/^Answer:\s*/, '').trim().replace(/^/, 'x = ').replace(/^x = x /, 'x ') : l) || null;
    const ap = /≈ (-?[\d.]+(?:e[+-]?\d+)?)/.exec(l);
    if (ap) got.push(Number(ap[1]));
    else if (m) { const [n, d] = m[1].split('/'); got.push(Number(n) / Number(d || 1)); }
  }
  if (got.length !== c.roots.length || got.some((g, i) => !near(g, c.roots[i]))) fail('roots ' + JSON.stringify(got) + ' vs ' + JSON.stringify(c.roots));
}
console.log(cases.length + ' interval-restricted equations, ' + bad + ' WRONG');
process.exit(bad ? 1 : 0);
