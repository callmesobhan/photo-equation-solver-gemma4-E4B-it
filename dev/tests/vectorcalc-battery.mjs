// Applications of multiple integrals against sympy / scipy and, for Green, Stokes and the divergence theorem, an independent
// computation of the other side of the theorem (edge line integrals, six face fluxes).
import { spawnSync } from 'node:child_process';
import { load } from './harness.mjs';
const call = load(process.argv[2]);
const PY = process.env.PY || 'python3';
const r = spawnSync(PY, ['gen_vectorcalc.py', process.argv[3] || '1'], { encoding: 'utf8', maxBuffer: 1 << 28, timeout: 900000 });
if (r.status) { console.log(r.stderr); process.exit(1); }
const cases = JSON.parse(r.stdout);
let bad = 0;
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * (1 + Math.abs(b));
/** first number of "8/3 (≈ 2.6666667)", "4", "≈ 1.86", "-4π (≈ -12.566371)" */
function lead(s) {
  s = s.trim();
  const ap = /\((?:≈|=) (-?[\d.]+(?:e[+-]?\d+)?)\)/.exec(s);
  if (ap) return Number(ap[1]);
  const m = /^(?:≈\s*)?(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)(?:\/(\d+))?\s*$/.exec(s.replace(/\s*\(.*$/, ''));
  return m ? Number(m[1]) / Number(m[2] || 1) : NaN;
}
const after = (t, rx) => { const m = rx.exec(t); return m ? lead(m[1]) : NaN; };
for (const c of cases) {
  const res = await call({ equation: c.cmd });
  const fail = (why) => { bad++; console.log('FAIL ' + c.cmd.slice(0, 170) + '\n   ' + why + '\n   ' + String(res.result ?? res.error).split('\n').slice(0, 9).join(' | ').slice(0, 600)); };
  if (res.error !== undefined) { fail('error: ' + res.error); continue; }
  const t = res.result;
  const chk = (got, want, label, tol) => { if (!near(got, want, tol)) fail(label + ' ' + got + ' vs ' + want); };
  if (c.kind === 'lamina') {
    chk(after(t, /mass M = ∬ ρ dA ([^\n]*)/.source ? /mass M = ∬ ρ dA =?\s*([^\n]*)/ : null), c.M, 'M');
    const cm = /centre of mass \(x̄, ȳ\) = \((.*)\)\n/.exec(t);
    if (!cm) fail('no centre'); else {
      const parts = cm[1].split(/,\s+(?=[-\d≈])/);
      chk(lead(parts[0]), c.cx, 'x̄'); chk(lead(parts[1]), c.cy, 'ȳ');
    }
    chk(after(t, /Mₓ = ∬ y ρ dA =?\s*([^\n]*)/), c.Mx, 'Mx'); chk(after(t, /M_y = ∬ x ρ dA =?\s*([^\n]*)/), c.My, 'My');
    chk(after(t, /Iₓ = ∬ y² ρ dA =?\s*([^\n]*)/), c.Ix, 'Ix'); chk(after(t, /I_y = ∬ x² ρ dA =?\s*([^\n]*)/), c.Iy, 'Iy');
  } else if (c.kind === 'solid') {
    chk(after(t, /mass M = ∭ ρ dV =?\s*([^\n]*)/), c.M, 'M');
    const cm = /centre of mass \(x̄, ȳ, z̄\) = \((.*)\)\n/.exec(t);
    if (!cm) fail('no centre'); else {
      const parts = cm[1].split(/,\s+(?=[-\d≈])/);
      chk(lead(parts[0]), c.c[0], 'x̄'); chk(lead(parts[1]), c.c[1], 'ȳ'); chk(lead(parts[2]), c.c[2], 'z̄');
    }
    chk(after(t, /Iₓ = ∭ \(y² \+ z²\) ρ dV =?\s*([^\n]*)/), c.Ix, 'Ix'); chk(after(t, /I_y = ∭ \(x² \+ z²\) ρ dV =?\s*([^\n]*)/), c.Iy, 'Iy'); chk(after(t, /I_z = ∭ \(x² \+ y²\) ρ dV =?\s*([^\n]*)/), c.Iz, 'Iz');
  } else {
    const line = (/Answer: ([^\n]*)/.exec(t) || [])[1] || '';
    const tail = line.includes('≈') && !/=/.test(line.replace(/\(≈[^)]*\)/g, '')) ? line.slice(line.indexOf('≈')) : line.split(' = ').pop();
    chk(lead(tail), c.val, 'value');
  }
}
console.log(cases.length + ' multiple-integral checks, ' + bad + ' WRONG');
process.exit(bad ? 1 : 0);
