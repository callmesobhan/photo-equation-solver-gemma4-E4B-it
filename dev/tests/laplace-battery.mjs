// Laplace and inverse Laplace transforms against sympy (compared numerically).
import { spawnSync } from 'node:child_process';
import { load } from './harness.mjs';
const call = load(process.argv[2]);
const PY = process.env.PY || 'python3';
const r = spawnSync(PY, ['gen_laplace.py', process.argv[3] || '1'], { encoding: 'utf8', maxBuffer: 1 << 28 });
if (r.status) { console.log(r.stderr); process.exit(1); }
const tests = JSON.parse(r.stdout);
const SUP = { '²': '**2', '³': '**3', '⁴': '**4', '⁵': '**5', '⁶': '**6', '⁷': '**7' };
const fixPow = (t) => t.replace(/([A-Za-z0-9.]+|\([^()]*\))\*\*(\d+)/g, 'Math.pow($1,$2)');
function jsExpr(text, vars) {
  let t = text.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) => '**' + Array.from(m).map((c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c)).join('')).replace(/\^/g, '**').replace(/·/g, '*').replace(/−/g, '-').replace(/√/g, 'Math.sqrt');
  t = t.replace(/(sinh|cosh|sin|cos|tan|exp)(?=\()/g, 'Math.$1').replace(/\be\*\*\(?([^+*\/ ]+)\)?/g, 'Math.exp($1)');
  t = t.replace(/\be\^/g, 'Math.exp');
  t = t.replace(/(\d|\))\s*(?=[a-z(M])/g, '$1*').replace(/\b([ts])\s*(?=[ts(M])/g, '$1*').replace(/\)\s*(?=[ts(M])/g, ')*');
  return new Function(...vars, 'return ' + fixPow(t));
}
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)) + 1e-9;
let bad = 0;
for (const t of tests) {
  const res = await call({ equation: t.cmd });
  const text = res.result ?? 'ERROR ' + res.error;
  let ok = false;
  try {
    const rhs = (/Answer: .*?\} = (.*)/.exec(text) || [])[1];
    if (rhs) {
      const vars = t.t === 'laplace' ? ['s'] : ['t'];
      const fn = jsExpr(rhs.replace(/(?<![A-Za-z])e\^\(([^)]*)\)/g, 'exp($1)').replace(/(?<![A-Za-z])e\^([a-z0-9-]+)/g, 'exp($1)'), vars);
      ok = t.v.every(([x, want]) => near(fn(x), want, t.t === 'laplace' ? 1e-5 : 1e-7));
    }
  } catch (e) { ok = false; }
  if (!ok) { bad++; if (bad <= 20) console.log('FAIL ' + t.cmd + '\n   want ' + JSON.stringify(t.v) + '\n   got  ' + text.split('\n').slice(0, 3).join(' | ')); }
}
console.log(`${tests.length - bad}/${tests.length} agree with sympy`);
process.exit(bad ? 1 : 0);
