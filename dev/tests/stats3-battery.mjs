// Statistics sentences (distribution probabilities, percentiles, tests from summary numbers, ordered draws) against scipy.stats.
import { spawnSync } from 'node:child_process';
import { load } from './harness.mjs';
import { compile } from './mathexpr.mjs';
const call = load(process.argv[2]);
const PY = process.env.PY || 'python3';
const r = spawnSync(PY, ['gen_stats3.py', process.argv[3] || '1'], { encoding: 'utf8', maxBuffer: 1 << 28 });
if (r.status) { console.log(r.stderr); process.exit(1); }
const cases = JSON.parse(r.stdout);
let bad = 0;
const counts = {};
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * (1 + Math.abs(b));
const lead = (t) => {
  const ap = /\((?:≈|=) (-?[\d.]+(?:e[+-]?\d+)?)\)/.exec(t);
  if (ap) return Number(ap[1]);
  try { return compile(t.trim().replace(/^[^=]*=\s*/, '').replace(/\s*\(.*$/, ''))({}); } catch (e) { return NaN; }
};
for (const c of cases) {
  counts[c.kind] = (counts[c.kind] || 0) + 1;
  const res = await call({ equation: c.cmd });
  const fail = (why) => { bad++; console.log('FAIL ' + c.cmd.slice(0, 200) + '\n   ' + why + '\n   ' + String(res.result ?? res.error).split('\n').slice(0, 5).join(' | ').slice(0, 400)); };
  if (res.error !== undefined) { fail('error: ' + res.error); continue; }
  const t = res.result;
  const answer = (/^Answer:\s*([\s\S]*?)(?:\n(?:Working|Check|Note):|(?![\s\S]))/m.exec(t) || [])[1] || '';
  if (c.kind === 'prob' || c.kind === 'value') {
    const first = answer.split('\n')[0];
    const v = lead(first.replace(/^P\([^)]*\)\s*=\s*/, '').replace(/^x\s*=\s*/, ''));
    if (!near(v, c.val, 1e-6)) fail('value ' + v + ' vs ' + c.val + ' (' + first + ')');
  } else if (c.kind === 'stat') {
    const m = /(?:t|z|χ²)\s*=\s*(-?[\d.]+(?:e[+-]?\d+)?)/.exec(answer);
    if (!m || !near(Number(m[1]), c.stat, 1e-5)) fail('statistic ' + (m && m[1]) + ' vs ' + c.stat);
    if (c.p2 !== null) {
      const pm = /two-tailed (-?[\d.]+(?:e[+-]?\d+)?)/.exec(answer);
      if (!pm || !near(Number(pm[1]), c.p2, 1e-5)) fail('p-value ' + (pm && pm[1]) + ' vs ' + c.p2);
    }
  }
}
console.log(cases.length + ' statistics-sentence checks (' + Object.entries(counts).map(([k, v]) => v + ' ' + k).join(', ') + '), ' + bad + ' WRONG');
process.exit(bad ? 1 : 0);
