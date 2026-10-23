// Equilibria and phase portraits against sympy (exact trace / determinant / discriminant signs, sympy.solve) and sign analysis of f.
import { spawnSync } from 'node:child_process';
import { load } from './harness.mjs';
const call = load(process.argv[2]);
const PY = process.env.PY || 'python3';
const r = spawnSync(PY, ['gen_phase.py', process.argv[3] || '1'], { encoding: 'utf8', maxBuffer: 1 << 28 });
if (r.status) { console.log(r.stderr); process.exit(1); }
const cases = JSON.parse(r.stdout);
let bad = 0;
const near = (a, b) => Math.abs(a - b) <= 1e-6 * (1 + Math.abs(b));
const frac = (s) => { const m = /^(-?\d+)(?:\/(\d+))?$/.exec(s.trim()); return m ? Number(m[1]) / Number(m[2] || 1) : NaN; };
function catOf(label) {
  if (/borderline/.test(label) && !/^(star|degenerate|centre)/.test(label)) label = label.replace(/\(borderline.*$/, '');
  if (/^saddle/.test(label)) return 'saddle';
  if (/^node \(sink\)/.test(label)) return 'sink';
  if (/^node \(source\)/.test(label)) return 'source';
  if (/^spiral \(sink\)/.test(label)) return 'spiral-sink';
  if (/^spiral \(source\)/.test(label)) return 'spiral-source';
  if (/^star node/.test(label)) return 'star';
  if (/^degenerate \(improper\)/.test(label)) return 'degenerate';
  if (/^centre|^linearization is a centre/.test(label)) return 'centre';
  if (/^degenerate:/.test(label)) return 'zero';
  return '?';
}
for (const c of cases) {
  const res = await call({ equation: c.cmd });
  const fail = (why) => { bad++; console.log('FAIL ' + c.cmd + '\n   ' + why + '\n   ' + String(res.result ?? res.error).split('\n').slice(0, 8).join(' | ')); };
  if (res.error !== undefined) { fail('error: ' + res.error); continue; }
  const lines = res.result.split('\n');
  const ai = lines.findIndex((l) => /^Answer:/.test(l));
  const ans = lines.slice(ai).filter((l, i) => i === 0 || /^\s/.test(l)).map((l) => l.replace(/^Answer:\s*/, '').trim()).filter(Boolean);
  if (c.kind === 'classify') {
    const cat = catOf(ans[0]);
    if (cat !== c.cat) fail('category ' + cat + ' vs ' + c.cat);
    const tr = /trace = (-?\d+)/.exec(res.result);
    const det = /determinant = (-?\d+)/.exec(res.result);
    if (!tr || Number(tr[1]) !== c.tr || !det || Number(det[1]) !== c.det) fail('trace/determinant');
    if (c.eig) {
      const ev = (ans.find((l) => /^eigenvalues/.test(l)) || '').replace(/^eigenvalues /, '').replace(/ \(double\)/, '').split(', ').map(frac).filter((v) => !isNaN(v));
      const got = c.eig[0] === c.eig[1] ? [ev[0], ev[0]] : ev.slice().sort((p, q) => p - q);
      if (got.length !== 2 || got.some((v, i) => !near(v, c.eig[i]))) { // eigenvalues may be surds: compare with the decimals
        const dec = [...(ans.find((l) => /^eigenvalues/.test(l)) || '').matchAll(/≈ (-?[\d.]+)/g)].map((m) => Number(m[1])).concat(ev).sort((p, q) => p - q);
        if (dec.length < 2 || !near(dec[0], c.eig[0]) || !near(dec[dec.length - 1], c.eig[1])) fail('eigenvalues ' + JSON.stringify(dec) + ' vs ' + JSON.stringify(c.eig));
      }
    }
  } else if (c.kind === 'line1') {
    const got = ans.filter((l) => /^y = /.test(l)).map((l) => {
      const ap = /^y = [^:]*?\(≈ (-?[\d.]+)\)/.exec(l);
      const m = /^y = (-?\d+(?:\/\d+)?):/.exec(l);
      const val = ap ? Number(ap[1]) : m ? frac(m[1]) : NaN;
      const type = /stable \(sink\)/.test(l) ? 'stable' : /unstable \(source\)/.test(l) ? 'unstable' : /semi-stable/.test(l) ? 'semi' : '?';
      return { root: val, type };
    });
    if (got.length !== c.eq.length || got.some((g, i) => !near(g.root, c.eq[i].root) || g.type !== c.eq[i].type)) fail('equilibria ' + JSON.stringify(got) + ' vs ' + JSON.stringify(c.eq));
  } else if (c.kind === 'plane') {
    const got = ans.filter((l) => /^\(x, y\) = /.test(l)).map((l) => {
      const m = /^\(x, y\) = \((.*?)\): (.*)$/.exec(l);
      if (!m) return null;
      const coords = [];
      let depth = 0; let cur = '';
      for (const ch of m[1]) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && depth === 0) { coords.push(cur); cur = ''; } else cur += ch; }
      coords.push(cur);
      const val = (t) => { const ap = /\((?:≈|=) (-?[\d.]+(?:e[+-]?\d+)?)\)/.exec(t); if (ap) return Number(ap[1]); const f = frac(t.trim()); return isNaN(f) ? Number(t.trim()) : f; };
      return { x: val(coords[0]), y: val(coords[1]), cat: catOf(m[2]) };
    });
    const miss = c.eq.filter((e) => !got.some((g) => g && near(g.x, e.x) && near(g.y, e.y) && g.cat === e.cat));
    const extra = got.filter((g) => !g || !c.eq.some((e) => near(g.x, e.x) && near(g.y, e.y)));
    if (miss.length || extra.length) fail('missing/mismatched ' + JSON.stringify(miss) + ' extra ' + JSON.stringify(extra));
  }
}
console.log(cases.length + ' phase-portrait checks, ' + bad + ' WRONG');
process.exit(bad ? 1 : 0);
