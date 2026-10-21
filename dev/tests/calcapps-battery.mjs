// Calculus applications against sympy / scipy.
import { spawnSync } from 'node:child_process';
import { load } from './harness.mjs';
const call = load(process.argv[2]);
const PY = process.env.PY || 'python3';
const r = spawnSync(PY, ['gen_calcapps.py', process.argv[3] || '1'], { encoding: 'utf8', maxBuffer: 1 << 28 });
if (r.status) { console.log(r.stderr); process.exit(1); }
const tests = JSON.parse(r.stdout);
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)) + 1e-9;
const numIn = (s) => { const fr = /^\s*=?\s*(-?\d+)\/(\d+)\s*$/.exec(s); if (fr) return Number(fr[1]) / Number(fr[2]); const a = /\((?:≈|=) (-?[\d.]+(?:e[+-]?\d+)?)\)/.exec(s); if (a) return parseFloat(a[1]); const m = /(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)/.exec(s.replace(/^[^=≈]*[=≈]\s*/, '')); return m ? parseFloat(m[1]) : NaN; };
const SUP = { '²': '**2', '³': '**3', '⁴': '**4', '⁵': '**5', '⁶': '**6' };
const evalText = (t, xv) => Function('x', 'return ' + t.replace(/[²³⁴⁵⁶]/g, (c) => SUP[c]).replace(/\^/g, '**').replace(/(\d)\s*x/g, '$1*x').replace(/\)\s*\(/g, ')*(').replace(/(\d|\))\s*\(/g, '$1*('))(xv);
let bad = 0;
for (const t of tests) {
  const res = await call({ equation: t.cmd });
  const text = res.result ?? 'ERROR ' + res.error;
  const ans = (/Answer:\s*([\s\S]*?)(?:\nWorking:|\nCheck:|\nNote:|\s*$)/.exec(text) || [])[1] || '';
  let ok = false;
  if (t.t === 'num') ok = near(numIn(ans.split('\n')[0]), t.v, t.tol);
  else if (t.t === 'critical') {
    const lines = ans.split('\n').map((l) => l.trim()).filter((l) => /^x = /.test(l) && /local|neither/.test(l));
    const got = lines.map((l) => { const m = /^x = (.*?)(?: \(≈ (-?[\d.e+-]+)\))?:\s+f = (.*?)(?: \(≈ (-?[\d.e+-]+)\))?,\s+(.*)$/.exec(l); return m ? [m[2] !== undefined ? parseFloat(m[2]) : evalTextSafe(m[1]), m[4] !== undefined ? parseFloat(m[4]) : evalTextSafe(m[3]), /minimum/.test(m[5]) ? 'min' : /maximum/.test(m[5]) ? 'max' : 'neither'] : null; });
    ok = got.length === t.v.length && got.every(Boolean) && t.v.every((w) => got.some((g) => near(g[0], w[0], 1e-6) && near(g[1], w[1], 1e-6) && g[2] === w[2]));
  } else if (t.t === 'absext') {
    const mx = /absolute maximum[^=]*= (.*)$/m.exec(ans); const mn = /absolute minimum[^=]*= (.*)$/m.exec(ans);
    ok = !!mx && !!mn && near(numIn('= ' + mx[1]), t.v[0], 1e-6) && near(numIn('= ' + mn[1]), t.v[1], 1e-6);
  } else if (t.t === 'tangent') {
    const m = /tangent line: y = (.*)/.exec(ans);
    if (m) { const f = (xv) => evalText(m[1].replace(/·/g, '*').replace(/−/g, '-'), xv); const b0 = f(0); const slope = f(1) - b0; ok = near(slope, t.v[0], 1e-6) && near(b0, t.v[1], 1e-6); }
  } else if (t.t === 'inflection') {
    const pts = [...ans.matchAll(/inflection point at \((.*?), (.*?)\)(?: ≈ \((.*?), (.*?)\))?\s+\(/g)].map((m) => [m[3] !== undefined ? parseFloat(m[3]) : evalTextSafe(m[1]), m[4] !== undefined ? parseFloat(m[4]) : evalTextSafe(m[2])]);
    ok = pts.length === t.v.length && t.v.every((w) => pts.some((g) => near(g[0], w[0]) && near(g[1], w[1])));
  } else if (t.t === 'inv') {
    const m = /f⁻¹\(x\) = (.*)/.exec(ans);
    if (m) { const g = (xv) => evalText(m[1].replace(/·/g, '*').replace(/−/g, '-'), xv); const f = (xv) => evalText(t.v, xv); ok = [0.3, 1.7, -2.2, 5.1].every((p) => { const y = g(p); return !isFinite(y) || near(f(y), p, 1e-7); }); }
  } else if (t.t === 'compose') {
    const m = /\(f∘g\)\(x\) = .*? = (.*)/.exec(ans);
    if (m) { const h = (xv) => evalText(m[1].replace(/·/g, '*'), xv); const f = (xv) => evalText(t.v[0], xv); ok = [0.3, 1.7, -2.2].every((p) => near(h(p), f(p * p), 1e-9)); }
  }
  if (!ok) { bad++; if (bad <= 25) console.log('FAIL ' + t.cmd + '\n   want ' + JSON.stringify(t.v).slice(0, 220) + '\n   got  ' + text.split('\n').slice(0, 8).join(' | ')); }
}
function evalTextSafe(s) { try { return evalText(s.replace(/√/g, 'Math.sqrt').replace(/π/g, 'Math.PI').replace(/·/g, '*').replace(/−/g, '-'), 0); } catch (e) { return NaN; } }
console.log(`${tests.length - bad}/${tests.length} agree with sympy/scipy`);
process.exit(bad ? 1 : 0);
