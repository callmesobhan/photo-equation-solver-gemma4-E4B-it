// Parametric, polar and vector calculus against sympy + scipy.integrate.quad.
import { spawnSync } from 'node:child_process';
import { load } from './harness.mjs';
import { compile } from './mathexpr.mjs';
const call = load(process.argv[2]);
const PY = process.env.PY || 'python3';
const r = spawnSync(PY, ['gen_curves.py', process.argv[3] || '1'], { encoding: 'utf8', maxBuffer: 1 << 28 });
if (r.status) { console.log(r.stderr); process.exit(1); }
const cases = JSON.parse(r.stdout);
const close = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * (1 + Math.abs(a) + Math.abs(b));
// the number after the first "=" or "≈" of a line: exact text such as 13√13/27 - 8/27 (≈ 1.4397099), or a plain number
function numberIn(line) {
  const dec = /\(≈\s*(-?[0-9.]+(?:e[+-]?\d+)?)\)/.exec(line);
  if (dec) return parseFloat(dec[1]);
  const eq = /(?:=|≈)\s*(.*)$/.exec(line);
  if (!eq) return NaN;
  const body = eq[1].replace(/\s*\(=.*$/, '').replace(/\s+\(.*$/, '').replace(/,.*$/, '').replace(/^≈\s*/, '');
  try { return compile(body)({}); } catch (e) { return NaN; }
}
const afterWord = (txt, word) => { const i = txt.indexOf(word); return i < 0 ? '' : txt.slice(i + word.length); };
let bad = 0, total = 0;
for (const c of cases) {
  total++;
  const res = await call({ equation: c.cmd });
  const text = res.result ?? 'ERROR ' + res.error;
  const fail = (why) => { bad++; console.log('FAIL ' + c.cmd + '\n   ' + why + '\n   ' + text.split('\n').slice(0, 5).join(' | ')); };
  if (res.error !== undefined) { fail('error'); continue; }
  if (c.kind === 'value') {
    const line = text.split('\n').find((l) => /^Answer:/.test(l));
    const v = numberIn(line.replace(/^Answer:\s*[^=≈]*/, ''));
    if (!close(v, c.expect, 1e-6)) fail('got ' + v + ', expected ' + c.expect);
  } else if (c.kind === 'slope') {
    const m = /slope = (.*?),\s*d²y\/dx² = (.*)$/m.exec(text);
    if (!m) { fail('no slope line'); continue; }
    const sl = numberIn('= ' + m[1]), d2 = numberIn('= ' + m[2]);
    if (!close(sl, c.expect, 1e-6) || !close(d2, c.expect2, 1e-6)) fail('slope ' + sl + ' / ' + d2 + ' vs ' + c.expect + ' / ' + c.expect2);
  } else if (c.kind === 'kappa') {
    const m = /at \w = [^:]*: κ = (.*?)(?:,\s*radius.*)?$/m.exec(text);
    if (!m) { fail('no curvature at the point'); continue; }
    const k = numberIn('= ' + m[1]);
    if (!close(k, c.expect, 1e-6)) fail('κ = ' + k + ', expected ' + c.expect);
  } else if (c.kind === 'tnb') {
    const m = /curvature κ = (.*?),\s*torsion τ = (.*)$/m.exec(text);
    if (!m) { fail('no κ, τ line'); continue; }
    const k = numberIn('= ' + m[1]), tau = numberIn('= ' + m[2]);
    if (!close(k, c.expect, 1e-6) || !close(tau, c.expect2, 1e-6)) fail('κ, τ = ' + k + ', ' + tau + ' vs ' + c.expect + ', ' + c.expect2);
  } else if (c.kind === 'speed') {
    const m = /speed = (.*?)$/m.exec(text.split('\n').find((l) => /at \w = .*speed =/.test(l)) || '');
    const sp = m ? numberIn('= ' + m[1]) : NaN;
    if (!close(sp, c.expect, 1e-6)) fail('speed ' + sp + ', expected ' + c.expect);
  } else if (c.kind === 'potential') {
    const line = text.split('\n').find((l) => /^Answer: f = /.test(l));
    if (!line) { fail('no potential found'); continue; }
    const f = compile(line.replace(/^Answer: f = /, '').replace(/\s*\+ C.*$/, ''));
    const F = c.F.map((e) => compile(e));
    const names = ['x', 'y', 'z'].slice(0, c.dim);
    let okAll = true;
    for (let k = 0; k < 6; k++) {
      const env = { x: 0.3 + 0.41 * k, y: 0.7 - 0.2 * k, z: 0.5 + 0.13 * k };
      names.forEach((nm, i) => {
        const h = 1e-5;
        const e1 = { ...env, [nm]: env[nm] + h }, e2 = { ...env, [nm]: env[nm] - h };
        const g = (f(e1) - f(e2)) / (2 * h);
        if (!close(g, F[i](env), 1e-5)) okAll = false;
      });
    }
    if (!okAll) fail('the gradient of the printed potential is not F');
  } else if (c.kind === 'notconservative') {
    if (!/not conservative/.test(text)) fail('should be reported as not conservative');
  }
}
console.log(`${total - bad}/${total} agree with sympy/scipy`);
process.exit(bad ? 1 : 0);
