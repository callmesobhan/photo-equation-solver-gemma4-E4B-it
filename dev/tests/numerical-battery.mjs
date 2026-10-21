// Numerical methods (Euler / Heun / RK, quadrature rules, interpolation, splines, least squares, root finding) against
// exact Fractions, numpy and scipy.
import { spawnSync } from 'node:child_process';
import { load } from './harness.mjs';
const call = load(process.argv[2]);
const PY = process.env.PY || 'python3';
const r = spawnSync(PY, ['gen_numerical.py', process.argv[3] || '1'], { encoding: 'utf8', maxBuffer: 1 << 28 });
if (r.status) { console.log(r.stderr); process.exit(1); }
const cases = JSON.parse(r.stdout);
const NUM = '(-?\\d+\\/\\d+|-?\\d+(?:\\.\\d+)?(?:e[+-]?\\d+)?)';
function valueOf(line) {
  const at = line.search(/[=≈]/);
  if (at < 0) return null;
  const m = new RegExp('^[=≈]\\s*' + NUM).exec(line.slice(at).replace(/^≈\s*≈/, '≈'));
  return m ? m[1] : null;
}
let bad = 0, total = 0;
for (const c of cases) {
  total++;
  const res = await call({ equation: c.cmd });
  if (res.error !== undefined) { bad++; console.log('FAIL ' + c.cmd + '\n   error: ' + res.error); continue; }
  const ans = res.result.split('\n').filter((l) => /^Answer:/.test(l) || /^\s+\S/.test(l)).map((l) => l.replace(/^Answer:\s*/, '').trim()).filter(Boolean);
  const idx = c.line < 0 ? ans.length + c.line : c.line;
  const line = ans[idx] || '';
  const v = valueOf(line);
  if (v === null) { bad++; console.log('FAIL ' + c.cmd + '\n   cannot read a value from "' + line + '"'); continue; }
  const got = v.includes('/') ? Number(v.split('/')[0]) / Number(v.split('/')[1]) : Number(v);
  let ok = Math.abs(got - c.expect) <= 2e-7 * (1 + Math.abs(c.expect));
  if (ok && c.expect_frac && v.includes('/') && v !== c.expect_frac) ok = false;
  if (ok && c.expect_frac && !v.includes('/') && !/\./.test(v) && c.expect_frac.split('/')[1] !== '1' && c.expect_frac !== v + '/1') ok = false;
  if (!ok) { bad++; console.log('FAIL ' + c.cmd + '\n   got ' + v + ' (' + got + '), expected ' + (c.expect_frac || c.expect) + ' (' + c.expect + ')\n   ' + line); }
}
console.log(`${total - bad}/${total} agree with exact fractions / numpy / scipy`);
process.exit(bad ? 1 : 0);
