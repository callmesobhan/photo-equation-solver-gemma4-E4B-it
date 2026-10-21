// Linear algebra battery against sympy (exact).
import { spawnSync } from 'node:child_process';
import { load } from './harness.mjs';
const call = load(process.argv[2]);
const PY = process.env.PY || 'python3';
const r = spawnSync(PY, ['gen_linalg.py', process.argv[3] || '1'], { encoding: 'utf8', maxBuffer: 1 << 28 });
if (r.status) { console.log(r.stderr); process.exit(1); }
const tests = JSON.parse(r.stdout);
const frac = (s) => { const m = /^(-?\d+)(?:\/(\d+))?$/.exec(s.trim()); return m ? Number(m[1]) / Number(m[2] || 1) : NaN; };
const matRows = (ans) => ans.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('[')).map((l) => l.replace(/^\[|\]$/g, '').trim().split(/\s{2,}|,\s*/).map((x) => x.trim()).filter(Boolean));
const parseMatText = (t) => JSON.parse(t.replace(/(-?\d+)/g, '$1'));
let bad = 0;
for (const t of tests) {
  const res = await call({ equation: t.cmd });
  const text = res.result ?? 'ERROR ' + res.error;
  const ans = (/Answer:\s*([\s\S]*?)(?:\nWorking:|\nCheck:|\nNote:|\s*$)/.exec(text) || [])[1] || '';
  let ok = false;
  const first = ans.split('\n')[0].trim();
  if (t.t === 'scalar') ok = frac(first.split(' ')[0]) === frac(t.v);
  else if (t.t === 'num') ok = Math.abs(parseFloat((/\(≈ ([\d.]+)\)/.exec(first) || [, first])[1]) - t.v) < 1e-5 * Math.max(1, t.v);
  else if (t.t === 'error') ok = res.error !== undefined && /singular/.test(res.error);
  else if (t.t === 'matrix') {
    const got = matRows(ans);
    ok = got.length === t.v.length && got.every((row, i) => row.length === t.v[i].length && row.every((c, j) => frac(c.split(' ')[0]) === frac(t.v[i][j])));
  } else if (t.t === 'vec') {
    const row = first.replace(/^x = /, '').replace(/^\[|\]$/g, '').split(',').map((x) => x.trim());
    ok = row.length === t.v.length && row.every((c, j) => frac(c.split(' ')[0]) === frac(t.v[j]));
  } else if (t.t === 'nullspace') {
    const A = JSON.parse(t.v[0]).map((r) => r.map(Number));
    const vecs = ans.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('[')).map((l) => l.replace(/^\[|\]$/g, '').split(',').map((x) => frac(x)));
    const cnt = /Only the zero vector/.test(text) ? 0 : vecs.length;
    ok = cnt === t.v[1] && vecs.every((v) => v.length === A[0].length && A.every((row) => Math.abs(row.reduce((s, a, k) => s + a * v[k], 0)) < 1e-9));
  } else if (t.t === 'eigen') {
    const A = JSON.parse(t.v[0]).map((r) => r.map(Number));
    const lines = ans.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('λ ='));
    const got = [];
    let valid = true;
    lines.forEach((l) => {
      const m = /^λ = (-?\d+)(?:\s+\(multiplicity (\d+)\))?:\s*(.*)$/.exec(l);
      if (!m) { valid = false; return; }
      const lam = Number(m[1]);
      const mult = Number(m[2] || 1);
      for (let k = 0; k < mult; k++) got.push(lam);
      const vecs = [...m[3].matchAll(/\[([^\]]*)\]/g)].map((x) => x[1].split(',').map((y) => frac(y)));
      vecs.forEach((v) => { if (!A.every((row, i) => Math.abs(row.reduce((s, a, k) => s + a * v[k], 0) - lam * v[i]) < 1e-9)) valid = false; });
    });
    ok = valid && got.sort((a, b) => a - b).join(',') === t.v[1].join(',');
  }
  if (!ok) { bad++; if (bad <= 30) console.log('FAIL ' + t.cmd + '\n   want ' + JSON.stringify(t.v).slice(0, 200) + '\n   got  ' + text.split('\n').slice(0, 7).join(' | ')); }
}
console.log(`${tests.length - bad}/${tests.length} agree with sympy`);
process.exit(bad ? 1 : 0);
