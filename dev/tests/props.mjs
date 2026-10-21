import { spawnSync } from 'node:child_process';
import { load } from './harness.mjs';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(process.argv[2], 'utf8');
const m = /<script>([\s\S]*)<\/script>/.exec(html);
const window = {};
vm.runInContext(m[1], vm.createContext({ window, console, Math, JSON, BigInt, Number, String, Array, Object, Set, Map, RegExp, Error, RangeError, isFinite, isNaN, parseInt, parseFloat }));
const T = window.__test;
const call = async (payload) => JSON.parse(await window.ai_edge_gallery_get_result(JSON.stringify(payload)));
const py = (script, ...args) => JSON.parse(spawnSync('python3', [script, ...args], { encoding: 'utf8', maxBuffer: 1 << 28 }).stdout);

let failures = 0;
const fail = (name, msg) => { failures++; if (failures <= 40) console.log('✗ [' + name + '] ' + msg); };
const section = (n) => console.log('\n== ' + n);

// ---------------------------------------------------------------- A. exact expressions vs python Fraction
section('A. random arithmetic expressions (exact, Fraction oracle)');
{
  let n = 0;
  for (const seed of [1, 2, 3]) {
    for (const c of py('gen_expr.py', String(seed), '400')) {
      n++;
      const r = await call({ equation: c.text });
      const expected = c.den === '1' ? c.num : c.num + '/' + c.den;
      if (r.error) { fail('expr', c.text + ' -> ' + r.error + ' (expected ' + expected + ')'); continue; }
      const got = /^Answer: (\S+)/m.exec(r.result)[1];
      if (got !== expected) fail('expr', c.text + ' -> ' + got + ' expected ' + expected);
    }
  }
  console.log(n + ' expressions checked');
}

// ---------------------------------------------------------------- B. polynomials built from known rational roots
section('B. polynomials with known rational roots (exact)');
{
  let n = 0;
  let seed = 12345;
  const rnd = (a, b) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return a + (seed % (b - a + 1)); };
  for (let t = 0; t < 400; t++) {
    const deg = rnd(2, 6);
    const roots = [];
    for (let i = 0; i < deg; i++) {
      const q = rnd(1, 4); const p = rnd(-8, 8);
      roots.push([p, q]);
    }
    // product of (q x - p) with BigInt
    let poly = [1n];
    for (const [p, q] of roots) {
      const f = [BigInt(-p), BigInt(q)];
      const r = new Array(poly.length + 1).fill(0n);
      poly.forEach((c, i) => f.forEach((d, j) => { r[i + j] += c * d; }));
      poly = r;
    }
    const k = BigInt(rnd(1, 5) * (rnd(0, 1) ? 1 : -1));
    poly = poly.map((c) => c * k);
    const P = poly.map((c) => T.qInt(Number(c)));
    n++;
    const res = T.polyRoots(P);
    const expected = new Map();
    for (const [p, q] of roots) {
      const g = (a, b) => (b ? g(b, a % b) : Math.abs(a));
      const d = g(p, q) || 1;
      const key = (p / d) + '/' + (q / d);
      expected.set(key, (expected.get(key) || 0) + 1);
    }
    const got = new Map(res.real.map((r) => [r.q.isInt() ? r.q.toString() + '/1' : r.q.toString(), r.mult]));
    const norm = (k) => (k.startsWith('-0/') ? k.replace('-0', '0') : k);
    const exp2 = new Map([...expected].map(([k, v]) => [norm(k), v]));
    const same = exp2.size === got.size && [...exp2].every(([k, v]) => got.get(k) === v);
    if (!same || res.complex.length) fail('rational-roots', 'roots ' + JSON.stringify(roots) + ' poly ' + poly + ' got ' + JSON.stringify([...got]) + ' complex ' + res.complex.length);
  }
  console.log(n + ' polynomials checked');
}

// ---------------------------------------------------------------- C. random polynomials vs numpy.roots
section('C. random integer polynomials vs numpy.roots');
{
  let n = 0;
  for (const seed of [1, 2]) {
    for (const c of py('gen_poly.py', String(seed), '400')) {
      n++;
      const high = c.coef_high_to_low;
      const P = high.slice().reverse().map((v) => T.qInt(v));
      let res;
      try { res = T.polyRoots(P); } catch (e) { fail('numpy', 'threw ' + e.message + ' for ' + high); continue; }
      // zero roots are stripped by polyRoots; numpy also reports them
      const ours = [];
      res.real.forEach((r) => { for (let i = 0; i < r.mult; i++) ours.push([r.val, 0]); });
      res.complex.forEach((z) => {
        const mult = z.mult || 1;
        for (let i = 0; i < mult; i++) ours.push([z.re, z.im]);
      });
      // complex entries come from an exact quadratic as +/- pair (two entries) or numeric (both signs listed); sanity on count
      const deg = high.length - 1 - high.slice().reverse().findIndex((v) => v !== 0) * 0;
      const lead0 = high.findIndex((v) => v !== 0);
      const realDeg = high.length - 1 - lead0;
      if (ours.length !== realDeg) { fail('numpy', 'root count ' + ours.length + ' != degree ' + realDeg + ' for ' + high + ' real=' + res.real.map((r) => r.val + 'x' + r.mult) + ' complex=' + res.complex.map((z) => z.re + '+' + z.im + 'i')); continue; }
      // match multisets with tolerance
      const theirs = c.roots.slice();
      let ok = true;
      for (const [re, im] of ours) {
        let best = -1; let bd = Infinity;
        theirs.forEach((t, i) => { const d = Math.hypot(t[0] - re, t[1] - im); if (d < bd) { bd = d; best = i; } });
        if (best < 0 || bd > 2e-3 * (1 + Math.hypot(re, im))) { ok = false; break; }
        theirs.splice(best, 1);
      }
      if (!ok) fail('numpy', 'roots differ for ' + high + '\n   ours=' + JSON.stringify(ours.map((z) => z.map((v) => +v.toFixed(5)))) + '\n   numpy=' + JSON.stringify(c.roots.map((z) => z.map((v) => +v.toFixed(5)))));
    }
  }
  console.log(n + ' polynomials checked');
}

// ---------------------------------------------------------------- D. linear systems with known integer solutions
section('D. random linear systems');
{
  let seed = 777;
  const rnd = (a, b) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return a + (seed % (b - a + 1)); };
  const names = ['x', 'y', 'z', 'w'];
  const det = (M) => { // Fraction-free via floats is fine for small ints
    const A = M.map((r) => r.slice()); let d = 1; const n = A.length;
    for (let c = 0; c < n; c++) {
      let p = c; for (let i = c + 1; i < n; i++) if (Math.abs(A[i][c]) > Math.abs(A[p][c])) p = i;
      if (Math.abs(A[p][c]) < 1e-9) return 0;
      if (p !== c) { [A[p], A[c]] = [A[c], A[p]]; d = -d; }
      d *= A[c][c];
      for (let i = c + 1; i < n; i++) { const f = A[i][c] / A[c][c]; for (let k = c; k < n; k++) A[i][k] -= f * A[c][k]; }
    }
    return d;
  };
  let tested = 0;
  for (let t = 0; t < 400; t++) {
    const n = rnd(2, 4);
    const A = Array.from({ length: n }, () => Array.from({ length: n }, () => rnd(-9, 9)));
    if (Math.abs(det(A)) < 0.5) continue;
    const x = Array.from({ length: n }, () => rnd(-9, 9));
    const eqs = A.map((row) => {
      const b = row.reduce((s, a, j) => s + a * x[j], 0);
      let lhs = '';
      row.forEach((a, j) => { if (a === 0) return; lhs += (lhs ? (a < 0 ? ' - ' : ' + ') : (a < 0 ? '-' : '')) + (Math.abs(a) === 1 ? '' : Math.abs(a)) + names[j]; });
      return (lhs || '0') + ' = ' + b;
    });
    const sep = ['; ', '\n', ', '][rnd(0, 2)];
    const r = await call({ equation: eqs.join(sep) });
    tested++;
    const exp = 'Answer: ' + x.map((v, j) => [names[j], v]).sort((p, q) => (p[0] < q[0] ? -1 : 1)).map(([nm, v]) => nm + ' = ' + v).join(', ');
    if (r.error || !r.result.includes(exp)) fail('linsys', JSON.stringify(eqs) + ' expected "' + exp + '" got ' + (r.error || r.result.split('\n').slice(0, 3).join(' | ')));
  }
  console.log(tested + ' systems checked');
  // singular / inconsistent systems should not crash
  let odd = 0;
  for (let t = 0; t < 200; t++) {
    const n = rnd(2, 3);
    const A = Array.from({ length: n }, () => Array.from({ length: n }, () => rnd(-3, 3)));
    A[n - 1] = A[0].map((v, j) => v * rnd(-2, 2) + (rnd(0, 3) === 0 ? A[1][j] : 0));
    const eqs = A.map((row) => { let lhs = ''; row.forEach((a, j) => { lhs += (lhs ? ' + ' : '') + a + '*' + names[j]; }); return lhs + ' = ' + rnd(-5, 5); });
    const r = await call({ equation: eqs.join('; ') });
    odd++;
    const text = r.result || '';
    if (r.error || !(/no solution|can be any|Answer: [xyzw] = /.test(text))) fail('singular', JSON.stringify(eqs) + ' -> ' + (r.error || text));
  }
  console.log(odd + ' degenerate systems did not crash');
}

// ---------------------------------------------------------------- E. quadratics a x^2 + b x + c
section('E. random quadratics');
{
  let seed = 4242;
  const rnd = (a, b) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return a + (seed % (b - a + 1)); };
  let n = 0;
  for (let t = 0; t < 600; t++) {
    const a = rnd(-12, 12) || 1; const b = rnd(-30, 30); const c = rnd(-30, 30);
    const D = b * b - 4 * a * c;
    const res = T.polyRoots([T.qInt(c), T.qInt(b), T.qInt(a)]);
    n++;
    const vals = [];
    if (D >= 0) { vals.push((-b + Math.sqrt(D)) / (2 * a), (-b - Math.sqrt(D)) / (2 * a)); }
    const got = [];
    res.real.forEach((r) => { for (let i = 0; i < r.mult; i++) got.push(r.val); });
    if (D >= 0) {
      vals.sort((p, q) => p - q); got.sort((p, q) => p - q);
      if (got.length !== 2 || Math.abs(got[0] - vals[0]) > 1e-9 * (1 + Math.abs(vals[0])) || Math.abs(got[1] - vals[1]) > 1e-9 * (1 + Math.abs(vals[1]))) fail('quad', [a, b, c] + ' got ' + got + ' expected ' + vals);
      if (res.complex.length) fail('quad', [a, b, c] + ' unexpected complex');
    } else if (res.real.length || res.complex.length !== 2) fail('quad', [a, b, c] + ' expected two complex roots, got real=' + res.real.length + ' complex=' + res.complex.length);
    // exact text shape, e.g. never "NaN"/"undefined"
    const r = await call({ equation: `${a}x^2 + ${b}x + ${c} = 0`.replace(/\+ -/g, '- ') });
    if (r.error || /NaN|undefined|Infinity/.test(r.result)) fail('quad-text', [a, b, c] + ' ' + (r.error || r.result));
  }
  console.log(n + ' quadratics checked');
}

// ---------------------------------------------------------------- F. trig equations
section('F. trig equations sin/cos/tan(kx) = c');
{
  let n = 0;
  for (const fn of ['sin', 'cos', 'tan']) {
    for (const k of [1, 2, 3, 4]) {
      for (let ci = -10; ci <= 10; ci++) {
        const c = ci / 10;
        if (fn === 'tan' && ci === 0 && k === 0) continue;
        const r = await call({ equation: `${fn}(${k === 1 ? '' : k + '*'}x) = ${c}` });
        n++;
        if (r.error) { fail('trig', fn + k + ' ' + c + ' ' + r.error); continue; }
        const lines = r.result.split('\n').filter((l) => /^  x [=≈] /.test(l) || /^Answer: x [=≈] /.test(l));
        const count = lines.length;
        let expectCount;
        if (fn === 'tan') expectCount = 1;
        else if (Math.abs(c) === 1) expectCount = 1;
        else if (c === 0) expectCount = 1; // sin(kx)=0 / cos(kx)=0: a single family x = a + pi*m/k
        else expectCount = 2;
        if (count !== expectCount || !/Check: substituting back/.test(r.result)) fail('trig', `${fn}(${k}x) = ${c}: ${count} solutions, expected ${expectCount}\n${r.result}`);
      }
    }
  }
  console.log(n + ' trig equations checked');
}

console.log('\n' + (failures ? failures + ' FAILURES' : 'ALL PROPERTY TESTS PASSED'));
process.exit(failures ? 1 : 0);
