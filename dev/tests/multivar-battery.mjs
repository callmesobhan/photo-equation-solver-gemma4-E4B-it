// Multivariable calculus against sympy.
import { spawnSync } from 'node:child_process';
import { load } from './harness.mjs';
const call = load(process.argv[2]);
const PY = process.env.PY || 'python3';
const r = spawnSync(PY, ['gen_multivar.py', process.argv[3] || '1'], { encoding: 'utf8', maxBuffer: 1 << 28 });
if (r.status) { console.log(r.stderr); process.exit(1); }
const tests = JSON.parse(r.stdout);
const SUP = { '²': '**2', '³': '**3', '⁴': '**4', '⁵': '**5', '⁶': '**6' };
const fixPow = (t) => t.replace(/([A-Za-z0-9.]+|\([^()]*\))\*\*(\d+)/g, 'Math.pow($1,$2)');
const ev2 = (t, x, y) => Function('x', 'y', 'return ' + fixPow(t.replace(/[²³⁴⁵⁶]/g, (c) => SUP[c]).replace(/\^/g, '**').replace(/·/g, '*').replace(/−/g, '-').replace(/(\d|\))\s*(x|y|\()/g, '$1*$2').replace(/(x|y)\s*(x|y|\()/g, '$1*$2').replace(/(x|y)\s*(x|y)/g, '$1*$2')))(x, y);
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)) + 1e-9;
const frac = (s) => { const t = s.trim(); const fr = /^(-?\d+)\/(\d+)/.exec(t); if (fr) return Number(fr[1]) / Number(fr[2]); const m = /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/.exec(t); return m ? parseFloat(m[0]) : NaN; };
const pts2 = [[0.3, 0.7], [-1.1, 0.4], [1.9, -0.6], [0.5, 2.3]];
let bad = 0;
for (const t of tests) {
  const res = await call({ equation: t.cmd });
  const text = res.result ?? 'ERROR ' + res.error;
  const ans = (/Answer:\s*([\s\S]*?)(?:\nWorking:|\nCheck:|\nNote:|\s*$)/.exec(text) || [])[1] || '';
  let ok = false;
  if (t.t === 'gradH') {
    const m = /∇f = \[(.*)\]/.exec(ans);
    if (m) { const parts = splitTop(m[1]); ok = parts.length === 2 && parts.every((p, i) => pts2.every(([a, b]) => near(ev2(p, a, b), ev2(t.v[i].replace(/\*\*/g, '^'), a, b), 1e-9))); }
  } else if (t.t === 'hess') {
    const rows = ans.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('['));
    ok = rows.length === 2 && rows.every((row, i) => { const cells = row.replace(/^\[\s*|\s*\]$/g, '').split(/\s{2,}/); return cells.length === 2 && cells.every((c, j) => pts2.every(([a, b]) => near(ev2(c, a, b), ev2(t.v[i][j], a, b), 1e-9))); });
  } else if (t.t === 'crit2') {
    const lines = ans.split('\n').map((l) => l.trim()).filter((l) => /^\(x [=≈]/.test(l));
    const got = lines.map((l) => { const m = /^\(x [=≈] (.*?), y [=≈] (.*?)\):\s+f [=≈] (.*?),\s+(.*)$/.exec(l); if (!m) return null; const num = (s) => { const a = /\(≈ (-?[\d.e+-]+)\)/.exec(s); return a ? parseFloat(a[1]) : frac(s); }; return [num(m[1]), num(m[2]), num(m[3]), /minimum/.test(m[4]) ? 'min' : /maximum/.test(m[4]) ? 'max' : /saddle/.test(m[4]) ? 'saddle' : 'inconclusive']; });
    ok = got.every(Boolean) && t.v.length === got.length && t.v.every((w) => got.some((g) => near(g[0], w[0], 1e-5) && near(g[1], w[1], 1e-5) && near(g[2], w[2], 1e-5) && g[3] === w[3]));
  } else if (t.t === 'exact') {
    const first = ans.split('\n')[0].trim();
    const wantFrac = /^(-?\d+)(?:\/(\d+))?$/.exec(t.v);
    ok = !!wantFrac && near(frac(first), Number(wantFrac[1]) / Number(wantFrac[2] || 1), 1e-9);
  } else if (t.t === 'lagr') {
    const vals = [...ans.matchAll(/\):\s+f [=≈] (.*?)(?: \(≈ (-?[\d.e+-]+)\)| \(= (-?[\d.e+-]+)\))?,\s+λ/g)].map((m) => (m[2] ? parseFloat(m[2]) : m[3] ? parseFloat(m[3]) : frac(m[1])));
    ok = vals.length >= 1 && near(Math.min(...vals), t.v[0], 1e-6) && near(Math.max(...vals), t.v[1], 1e-6);
  }
  if (!ok) { bad++; if (bad <= 25) console.log('FAIL ' + t.cmd + '\n   want ' + JSON.stringify(t.v).slice(0, 250) + '\n   got  ' + text.split('\n').slice(0, 7).join(' | ')); }
}
function splitTop(s) { const out = []; let d = 0, cur = ''; for (const c of s) { if (c === '(' || c === '[') d++; if (c === ')' || c === ']') d--; if (c === ',' && d === 0) { out.push(cur); cur = ''; } else cur += c; } out.push(cur); return out; }
console.log(`${tests.length - bad}/${tests.length} agree with sympy`);
process.exit(bad ? 1 : 0);
