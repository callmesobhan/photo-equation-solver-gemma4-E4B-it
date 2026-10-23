// Fourier series coefficients (mean, a_n, b_n for n = 1..4) against adaptive quadrature (scipy.integrate.quad).
import { spawnSync } from 'node:child_process';
import { load } from './harness.mjs';
const call = load(process.argv[2]);
const PY = process.env.PY || 'python3';
const r = spawnSync(PY, ['gen_fourier.py', process.argv[3] || '1'], { encoding: 'utf8', maxBuffer: 1 << 28 });
if (r.status) { console.log(r.stderr); process.exit(1); }
const cases = JSON.parse(r.stdout);
let bad = 0;
const near = (a, b) => Math.abs(a - b) <= 1e-6 * (1 + Math.abs(b)) || Math.abs(a - b) < 1e-9;
for (const c of cases) {
  const res = await call({ equation: c.cmd });
  const fail = (why) => { bad++; console.log('FAIL ' + c.cmd + '\n   ' + why + '\n   ' + String(res.result ?? res.error).split('\n').slice(0, 7).join(' | ').slice(0, 600)); };
  if (res.error !== undefined) { fail('error: ' + res.error); continue; }
  const t = res.result;
  const line = (/a₀\/2 = ([^\n]*?)   \(the average/.exec(t) || [])[1] || '';
  let mean = NaN;
  const ap = /≈ (-?[\d.e+-]+)/.exec(line);
  if (ap) mean = Number(ap[1]);
  else { const fr = /^(-?\d+(?:\.\d+)?)(?:\/(\d+))?/.exec(line.replace(/^\((.*)\)$/, '$1')); if (fr) mean = Number(fr[1]) / Number(fr[2] || 1); }
  if (!near(mean, c.mean)) fail('mean ' + mean + ' vs ' + c.mean);
  const row = /numerical values: ([^\n]*)/.exec(t);
  if (!row) { fail('no numerical row'); continue; }
  const items = [...row[1].matchAll(/n = (\d+): a = (-?[\d.e+-]+), b = (-?[\d.e+-]+)/g)];
  if (items.length < 4) { fail('numerical row too short'); continue; }
  for (const it of items.slice(0, 4)) {
    const k = Number(it[1]) - 1;
    if (!near(Number(it[2]), c.A[k])) fail('a_' + (k + 1) + ' ' + it[2] + ' vs ' + c.A[k]);
    if (!near(Number(it[3]), c.B[k])) fail('b_' + (k + 1) + ' ' + it[3] + ' vs ' + c.B[k]);
  }
}
console.log(cases.length + ' Fourier series checks, ' + bad + ' WRONG');
process.exit(bad ? 1 : 0);
