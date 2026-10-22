// Geometry / triangles / units / chemistry / finance / complex numbers against pint, periodictable, numpy-financial, Python complex.
import { spawnSync } from 'node:child_process';
import { load } from './harness.mjs';
const call = load(process.argv[2]);
const PY = process.env.PY || 'python3';
const r = spawnSync(PY, ['gen_applied.py', process.argv[3] || '3'], { encoding: 'utf8', maxBuffer: 1 << 28 });
if (r.status) { console.log(r.stderr); process.exit(1); }
const tests = JSON.parse(r.stdout);
const numAfter = (s) => { const m = /(?:≈|=) (-?\d[\d.]*(?:e[+-]?\d+)?)\)?\s*(?:[a-zA-Z°]|$)/.exec(s) || /(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*(?:[^\d\s.e(][^\n]*)?$/.exec(s); return m ? parseFloat(m[1]) : NaN; };
function lineValue(text, label) {
  const line = text.split('\n').find((l) => l.trim().startsWith(label + ' =') || l.trim().startsWith(label + ' ≈'));
  if (!line) return NaN;
  const rest = line.slice(line.search(/[=≈]/) + 1).trim();
  const approx = /\((?:≈|=) (-?[\d.]+(?:e[+-]?\d+)?)\)/.exec(rest);
  if (approx) return parseFloat(approx[1]);
  const m = /^(-?[\d.]+(?:e[+-]?\d+)?)/.exec(rest);
  return m ? parseFloat(m[1]) : NaN;
}
function parseComplex(s) {
  const approx = /\((?:≈|=) ([^)]*)\)\s*$/.exec(s);
  const t = (approx ? approx[1] : s).replace(/\s+/g, '').replace(/−/g, '-');
  if (/[√π/(]/.test(t) && !approx) return null;
  const m = /^(-?[\d.]+(?:e[+-]?\d+)?)?(?:([+-])([\d.]*(?:e[+-]?\d+)?)i)?$/.exec(t.replace(/^i$/, '0+1i').replace(/^-i$/, '0-1i').replace(/^(-?[\d.]+)i$/, '0+$1i'));
  if (!m) { const m2 = /^(-?[\d.]*)i$/.exec(t); if (m2) return [0, m2[1] === '' ? 1 : m2[1] === '-' ? -1 : parseFloat(m2[1])]; return null; }
  const re = m[1] === undefined ? 0 : parseFloat(m[1]);
  const im = m[2] ? (m[2] === '-' ? -1 : 1) * (m[3] === '' ? 1 : parseFloat(m[3])) : 0;
  return [re, im];
}
let bad = 0;
const near = (a, b, tol) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)) + 1e-9;
for (const t of tests) {
  const res = await call({ equation: t.cmd });
  const text = res.result ?? 'ERROR ' + res.error;
  const ans = (/Answer:\s*([\s\S]*?)(?:\nWorking:|\nCheck:|\nNote:|\s*$)/.exec(text) || [])[1] || '';
  let ok = false;
  if (t.t === 'num') {
    const line = ans.split('\n')[0];
    const approx = /\((?:≈|=) (-?[\d.]+(?:e[+-]?\d+)?)\)/.exec(line);
    const m = /(-?\d[\d.]*(?:e[+-]?\d+)?)\s*(?:%|[a-zA-Z°/²³^]*[a-zA-Z°²³]*)?\s*$/.exec(line.replace(/^.*= /, ''));
    const got = approx ? parseFloat(approx[1]) : m ? parseFloat(m[1]) : NaN;
    ok = near(got, t.v, t.tol || 1e-6);
  } else if (t.t === 'has') ok = ans.includes(t.v);
  else if (t.t === 'labelled') ok = Object.entries(t.v).every(([k, v]) => near(lineValue(ans, k), v, t.tol || 1e-6));
  else if (t.t === 'tri') {
    const sideM = /sides: a = (\S+),\s+b = (\S+),\s+c = (\S+)/g;
    const angM = /angles: A = (\S+)°,\s+B = (\S+)°,\s+C = (\S+)°/g;
    const got = [];
    let ms, ma;
    while ((ms = sideM.exec(ans)) && (ma = angM.exec(ans))) got.push({ a: +ms[1], b: +ms[2], c: +ms[3], A: +ma[1], B: +ma[2], C: +ma[3] });
    const tol = t.tol || 1e-5;
    const matches = (g, w) => ['a', 'b', 'c', 'A', 'B', 'C'].every((k) => near(g[k], w[k], tol));
    if (!t.v.length) ok = /no triangle/.test(ans);
    else if (t.any) ok = t.v.length === got.length && t.v.every((w) => got.some((g) => matches(g, w)));
    else ok = got.length === 1 && matches(got[0], t.v[0]);
  } else if (t.t === 'cplx') {
    const c = parseComplex(ans.split('\n')[0].trim());
    ok = !!c && near(c[0], t.v[0], 1e-6) && near(c[1], t.v[1], 1e-6);
    if (!c) { const m = /\(≈ ([^)]*)\)/.exec(ans); ok = false; }
  } else if (t.t === 'real') {
    const line = ans.split('\n')[0];
    const approx = /\((?:≈|=) (-?[\d.]+(?:e[+-]?\d+)?)\)/.exec(line);
    const plain = /^(-?[\d.]+(?:e[+-]?\d+)?)/.exec(line);
    const got = approx ? parseFloat(approx[1]) : plain ? parseFloat(plain[1]) : NaN;
    ok = near(got, t.v, 1e-6);
  }
  if (!ok) { bad++; if (bad <= 40) console.log('FAIL ' + t.cmd + '\n   want ' + JSON.stringify(t.v).slice(0, 200) + '\n   got  ' + text.split('\n').slice(0, 5).join(' | ')); }
}
console.log(`${tests.length - bad}/${tests.length} agree with the oracles`);
process.exit(bad ? 1 : 0);
