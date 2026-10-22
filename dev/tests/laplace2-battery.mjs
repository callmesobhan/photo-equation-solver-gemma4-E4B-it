// Laplace transforms with steps / impulses and initial value problems with such forcing, against numerical quadrature, mpmath's inverse Laplace
// transform and scipy.solve_ivp applied piece by piece.
import { spawnSync } from 'node:child_process';
import { load } from './harness.mjs';
import { compile } from './mathexpr.mjs';
const call = load(process.argv[2]);
const PY = process.env.PY || 'python3';
const r = spawnSync(PY, ['gen_laplace2.py', process.argv[3] || '1'], { encoding: 'utf8', maxBuffer: 1 << 28 });
if (r.status) { console.log(r.stderr); process.exit(1); }
const cases = JSON.parse(r.stdout);
let bad = 0, total = 0, declined = 0;
const near = (a, b, tol) => Math.abs(a - b) <= tol * (1 + Math.abs(b));
for (const c of cases) {
  total++;
  const res = await call({ equation: c.cmd });
  const text = res.result ?? 'ERROR ' + res.error;
  const fail = (why) => { bad++; console.log('FAIL ' + c.cmd + '\n   ' + why + '\n   ' + text.split('\n').slice(0, 6).join(' | ')); };
  if (res.error !== undefined) {
    if (/not supported|cannot be inverted|could not|I could not|only delays|would give derivatives/.test(res.error)) { declined++; continue; }
    fail('error: ' + res.error); continue;
  }
  const lines = text.split('\n');
  const answer = lines.slice(lines.findIndex((l) => /^Answer:/.test(l))).filter((l, i) => i === 0 || /^\s/.test(l)).map((l) => l.replace(/^Answer:\s*/, '').trim()).join('\n').split('\n')[0];
  try {
    if (c.kind === 'forward') {
      const rhs = /\} = (.*)$/.exec(answer)[1];
      const f = compile(rhs);
      c.s.forEach((s, i) => { const v = f({ s }); if (!near(v, c.vals[i], 1e-7)) throw new Error('at s = ' + s + ': ' + v + ' vs ' + c.vals[i]); });
    } else if (c.kind === 'inverse') {
      const rhs = /\} = (.*)$/.exec(answer)[1];
      const f = compile(rhs.replace(/δ′*\([^)]*\)/g, '0'));
      c.t.forEach((t, i) => { const v = f({ t }); if (!near(v, c.vals[i], 1e-6)) throw new Error('at t = ' + t + ': ' + v + ' vs ' + c.vals[i]); });
    } else if (c.kind === 'inverse-delta') {
      const m = /= (\d+)δ\(t - ([^)]*)\)/.exec(answer) || /= (\d+)·?δ\(t - ([^)]*)\)/.exec(answer);
      if (!m || Number(m[1]) !== c.c) throw new Error('expected ' + c.c + ' δ(t - ' + c.a + ')');
    } else if (c.kind === 'ode') {
      const rhs = /^y = (.*)$/.exec(answer)[1];
      const f = compile(rhs);
      c.ts.forEach((t, i) => { const v = f({ t }); if (!near(v, c.ys[i], 1e-6)) throw new Error('y(' + t + ') = ' + v + ' vs ' + c.ys[i]); });
    }
  } catch (e) { fail(e.message); }
}
console.log(total + ' Laplace step / impulse checks (' + declined + ' politely declined), ' + bad + ' WRONG');
process.exit(bad ? 1 : 0);
