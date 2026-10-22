// QR, Cholesky, definiteness, pseudoinverse, least squares, singular values and the matrix exponential against numpy / scipy / sympy.
import { spawnSync } from 'node:child_process';
import { load } from './harness.mjs';
import { compile } from './mathexpr.mjs';
const call = load(process.argv[2]);
const PY = process.env.PY || 'python3';
const r = spawnSync(PY, ['gen_linalg2.py', process.argv[3] || '1'], { encoding: 'utf8', maxBuffer: 1 << 28 });
if (r.status) { console.log(r.stderr); process.exit(1); }
const cases = JSON.parse(r.stdout);
let bad = 0, total = 0;
// numeric value of a printed cell: radicals, fractions, e^..., trig, juxtaposed products
function cellValue(s, env) {
  const sup = { '⁰': 0, '¹': 1, '²': 2, '³': 3, '⁴': 4, '⁵': 5, '⁶': 6, '⁷': 7, '⁸': 8, '⁹': 9 };
  const t = s.trim().replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) => '^' + m.split('').map((c) => sup[c]).join('')).replace(/√(\d+)/g, 'sqrt($1)').replace(/√\(/g, 'sqrt(').replace(/π/g, 'pi').replace(/·/g, '*').replace(/−/g, '-');
  return compile(t)(env);
}
// the cells of a printed matrix block: lines "[ c  c ]" following a header line
function block(lines, header) {
  const k = lines.findIndex((l) => l.replace(/^- /, '').trim() === header);
  if (k < 0) return null;
  const rows = [];
  for (let i = k + 1; i < lines.length; i++) {
    const m = /^[-\s]*\[ (.*) \]\s*$/.exec(lines[i].replace(/^- /, ''));
    if (!m) break;
    rows.push(m[1].trim().split(/\s{2,}/));
  }
  return rows;
}
const toNum = (rows, env) => rows.map((r) => r.map((c) => cellValue(c, env)));
const mul = (A, B) => A.map((r) => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
const tr = (A) => A[0].map((_, j) => A.map((r) => r[j]));
const near = (a, b, tol = 1e-7) => Math.abs(a - b) <= tol * (1 + Math.abs(b));
const mclose = (A, B, tol = 1e-7) => A.length === B.length && A.every((r, i) => r.length === B[i].length && r.every((v, j) => near(v, B[i][j], tol)));
for (const c of cases) {
  total++;
  const res = await call({ equation: c.cmd });
  const text = res.result ?? 'ERROR ' + res.error;
  const fail = (why) => { bad++; console.log('FAIL ' + c.cmd + '\n   ' + why + '\n   ' + text.split('\n').slice(0, 8).join(' | ')); };
  if (c.kind === 'qrdep' || c.kind === 'cholbad') {
    if (res.error === undefined) fail('should have been rejected'); else if (!/dependent|positive definite|symmetric/.test(res.error)) fail('unexpected message ' + res.error);
    continue;
  }
  if (res.error !== undefined) { fail('error: ' + res.error); continue; }
  const lines = text.split('\n');
  try {
    if (c.kind === 'qr') {
      const Q = toNum(block(lines, 'Q ='), {}), R = toNum(block(lines, 'R ='), {});
      if (!mclose(mul(Q, R), c.A)) fail('Q R != A');
      else if (!mclose(mul(tr(Q), Q), c.A[0].map((_, i) => c.A[0].map((__, j) => (i === j ? 1 : 0))))) fail('Q is not orthonormal');
      else if (!mclose(R, c.R)) fail('R differs from numpy (sign-normalised)');
    } else if (c.kind === 'chol') {
      const G = toNum(block(lines, 'G ='), {});
      if (!mclose(G, c.G)) fail('G differs from numpy.linalg.cholesky');
    } else if (c.kind === 'definite') {
      if (!lines.some((l) => l.includes('is ' + c.kindname + ' ('))) fail('expected ' + c.kindname);
      const e = lines.find((l) => /Eigenvalues: /.test(l));
      if (!e || !e.includes(c.pos + ' positive, ' + c.neg + ' negative, ' + c.zero + ' zero')) fail('eigenvalue counts, expected ' + c.pos + '/' + c.neg + '/' + c.zero);
    } else if (c.kind === 'pinv') {
      const rows = [];
      for (const l of lines) { const m = /^\s*\[ (.*) \]\s*$/.exec(l.replace(/^Answer:\s*/, '')); if (m) rows.push(m[1].trim().split(/\s{2,}/)); }
      const P = toNum(rows, {});
      if (!mclose(P, c.P, 1e-8)) fail('pinv differs from numpy');
      if (!lines.some((l) => /^Check:/.test(l))) fail('no self-check printed');
    } else if (c.kind === 'lstsq') {
      const xl = lines.find((l) => /x̂ = \[/.test(l));
      const x = xl.replace(/^.*\[/, '').replace(/\].*$/, '').split(',').map((s) => cellValue(s, {}));
      if (!x.every((v, i) => near(v, c.x[i], 1e-7))) fail('x differs: ' + x + ' vs ' + c.x);
      const rl = lines.find((l) => /‖residual‖ = /.test(l));
      const rn = /‖residual‖ = (.*?) \(squared/.exec(rl);
      if (!near(cellValue(rn[1], {}), c.rnorm, 1e-7)) fail('residual norm');
    } else if (c.kind === 'svd') {
      const sig = lines.filter((l) => /^\s*σ\d+ = /.test(l)).map((l) => { const t = l.replace(/^.*= /, ''); const m = /≈ (.*)$/.exec(t); return m ? Number(m[1]) : Number(t.trim()); });
      if (sig.length !== c.s.length || !sig.every((v, i) => near(v, c.s[i], 1e-7))) fail('singular values ' + sig + ' vs ' + c.s);
      const rk = /rank (\d+)/.exec(text);
      if (!rk || Number(rk[1]) !== c.rank) fail('rank');
      const U = toNum(block(lines, 'U (decimals, ' + c.A.length + '×' + c.s.length + ') ='), {});
      const V = toNum(block(lines, 'V (decimals, ' + c.A[0].length + '×' + c.s.length + ') ='), {});
      const S = c.s.map((s, i) => c.s.map((_, j) => (i === j ? s : 0)));
      if (!mclose(mul(mul(U, S), tr(V)), c.A, 1e-6)) fail('U S Vt != A');
    } else if (c.kind === 'jordan') {
      const J = toNum(block(lines, 'J ='), {});
      const P = toNum(block(lines.map((l) => l.replace(/^\s*P = .*$/, 'P =')), 'P ='), {});
      if (!mclose(mul(c.A, P), mul(P, J))) fail('A P != P J');
      // block structure from J
      const n = J.length, bl = [];
      for (let i = 0; i < n;) { let j = i; while (j + 1 < n && J[j][j + 1] === 1) j++; bl.push([J[i][i], j - i + 1]); i = j + 1; }
      bl.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const want = c.blocks.map((b) => b.slice()).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      if (JSON.stringify(bl) !== JSON.stringify(want)) fail('Jordan blocks ' + JSON.stringify(bl) + ' vs ' + JSON.stringify(want));
    } else if (c.kind === 'expmnum' || c.kind === 'expmsym') {
      const rows = [];
      let on = false;
      for (const l of lines) { if (/^\s*e\^/.test(l) && /=\s*$/.test(l)) { on = true; continue; } if (on) { const m = /^\s*\[ (.*) \]\s*$/.exec(l); if (m) rows.push(m[1].trim().split(/\s{2,}/)); else break; } }
      const ts = c.kind === 'expmsym' ? [0.37, 1.3] : [1];
      for (const tv of ts) {
        const E = toNum(rows, { t: tv });
        const tt = c.kind === 'expmsym' ? tv : c.t;
        const want = c.exp[String(tv)];
        if (!mclose(E, want, 1e-7)) { fail('differs from scipy.linalg.expm at t = ' + tt); break; }
      }
    }
  } catch (e) { fail('could not read the answer: ' + e.message); }
}
console.log(total + ' linear-algebra checks (QR, Cholesky, definiteness, pinv, least squares, SVD, expm), ' + bad + ' WRONG');
process.exit(bad ? 1 : 0);
