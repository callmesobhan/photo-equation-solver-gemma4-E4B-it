// Randomised calculus checks that need no oracle program: every answer is compared with a direct numerical evaluation
// done by the independent evaluator in mathexpr.mjs.
//   limits      numeric values at points close to the limit point (and sign / growth for infinite limits)
//   taylor      the error of the printed polynomial must shrink like h^(n+1)
//   integrals   definite integrals of rational functions (rational and irrational poles) against composite Simpson, and
//               "diverges" must be reported exactly when a pole of the integrand lies inside the interval
//   sums        finite sums against direct summation
//   usage: node calc-random-battery.mjs <index.html> [seed] [count]
import { load } from './harness.mjs';
import { compile } from './mathexpr.mjs';

const call = load(process.argv[2]);
let seed = Number(process.argv[3] || 1) >>> 0;
const COUNT = Number(process.argv[4] || 60);
function rnd() {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const nz = (a, b) => { let v = 0; while (!v) v = ri(a, b); return v; };
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const close = (a, b, tol) => Math.abs(a - b) <= tol * (1 + Math.abs(a) + Math.abs(b));
let total = 0, bad = 0, declined = 0;
const fail = (kind, input, why, got) => { bad++; console.log('FAIL [' + kind + '] ' + input + '\n   ' + why + '\n   got ' + String(got).split('\n').slice(0, 3).join(' | ')); };
const answerOf = (res) => (/^Answer: (.*)$/m.exec(res) || [])[1];
// the exact part of an answer such as "2√2 (≈ 2.8284271)"
const valueOf = (ans) => {
  try {
    const exact = compile(ans.replace(/\s+\((?:≈|=)[^()]*\)\s*$/, ''))({});
    if (isFinite(exact)) return exact;
  } catch (e) {
    // fall through to the decimal value
  }
  const m = /\(≈\s*([-0-9.e+]+)\)/.exec(ans) || /\(=\s*([-0-9.e+]+)\)/.exec(ans) || /^≈\s*([-0-9.e+]+)/.exec(ans);
  if (m) return parseFloat(m[1]);
  throw new Error('cannot read the value of "' + ans + '"');
};
const poly = (cs, v) => cs.map((c, k) => (c === 0 ? '' : '(' + c + ')' + (k ? '*' + v + '^' + k : ''))).filter(Boolean).join(' + ') || '0';

// ---------------------------------------------------------------------------------------------------- limits
for (let i = 0; i < COUNT; i++) {
  total++;
  const kind = ri(0, 7);
  let expr, point, side = 0;
  const a = ri(-3, 3), k = nz(-4, 4), m = nz(-4, 4);
  if (kind === 0) { // removable singularity of a rational function
    const p = [ri(-3, 3), nz(-3, 3), ri(-2, 2)], q = [nz(-4, 4), ri(-3, 3), ri(-2, 2)];
    const lin = '(x - ' + a + ')';
    expr = '(' + lin + '*(' + poly(p, 'x') + '))/(' + lin + '*(' + poly(q, 'x') + '))';
    point = String(a);
  } else if (kind === 1) { // rational at infinity
    const dn = ri(1, 3), dd = ri(1, 3);
    const p = Array.from({ length: dn + 1 }, () => ri(-4, 4)); p[dn] = nz(-4, 4);
    const q = Array.from({ length: dd + 1 }, () => ri(-4, 4)); q[dd] = nz(-4, 4);
    expr = '(' + poly(p, 'x') + ')/(' + poly(q, 'x') + ')';
    point = 'oo';
  } else if (kind === 2) { expr = 'sin(' + k + '*x)/(' + m + '*x)'; point = '0'; }
  else if (kind === 3) { expr = '(1 - cos(' + k + '*x))/x^2'; point = '0'; }
  else if (kind === 4) { expr = '(e^(' + k + '*x) - 1)/(' + m + '*x)'; point = '0'; }
  else if (kind === 5) { expr = 'ln(1 + ' + Math.abs(k) + '*x)/(' + m + '*x)'; point = '0'; side = 1; }
  else if (kind === 6) { expr = '(sqrt(1 + ' + Math.abs(k) + '*x) - 1)/(' + m + '*x)'; point = '0'; side = 1; }
  else { expr = '1/(x - ' + a + ')^' + pick([1, 2, 3]); point = String(a); side = pick([1, -1]); }
  const call_ = 'limit(' + expr + ', x, ' + point + (side ? ', ' + side : '') + ')';
  const r = await call({ equation: call_ });
  if (r.error !== undefined) { declined++; continue; }
  const ans = answerOf(r.result);
  if (!ans) { fail('limit', call_, 'no answer', r.result); continue; }
  try {
    const f = compile(expr);
    const pts = point === 'oo' ? [1e4, 1e6, 1e8] : [1e-3, 1e-4, 1e-5].map((h) => Number(point) + (side || 1) * h);
    const vals = pts.map((x) => f({ x }));
    const inf = /∞/.test(ans) && !/does not exist/i.test(ans);
    if (inf) {
      const neg = /^-/.test(ans);
      if (!vals.every((v) => (neg ? v < 0 : v > 0)) || !(Math.abs(vals[2]) > Math.abs(vals[0]))) fail('limit', call_, 'the answer says ' + ans + ' but f = ' + vals.join(', '), r.result);
    } else if (/does not exist|DNE/i.test(ans)) {
      if (side !== 0) fail('limit', call_, 'unexpected "does not exist" for a one-sided limit', r.result);
    } else {
      const L = valueOf(ans);
      if (!isFinite(L) || !close(L, vals[2], 5e-3 * (point === 'oo' ? 1 : 1) + 1e-4)) fail('limit', call_, 'the answer ' + ans + ' differs from f near the point: ' + vals.join(', '), r.result);
    }
  } catch (e) { fail('limit', call_, 'cannot check: ' + e.message, r.result); }
}

// ---------------------------------------------------------------------------------------------------- taylor
const TAYLOR = [
  (k) => 'sin(' + k + '*x)', (k) => 'cos(' + k + '*x)', (k) => 'e^(' + k + '*x)', (k) => 'ln(1 + ' + k + '*x)', (k) => '1/(1 - ' + k + '*x)',
  (k) => 'sqrt(1 + ' + k + '*x)', (k) => 'atan(' + k + '*x)', (k) => 'e^x*sin(' + k + '*x)', (k) => 'cos(x)*e^(' + k + '*x)', (k) => '(1 + x)^(' + k + '/2)',
  (k) => 'tan(' + k + '*x)', (k) => 'sinh(' + k + '*x)', (k) => 'x*e^(' + k + '*x)', (k) => 'ln(cos(x))', (k) => 'asin(' + k + '*x/5)',
];
for (let i = 0; i < COUNT; i++) {
  total++;
  const k = nz(1, 3);
  const f = pick(TAYLOR)(k);
  const n = ri(2, 6);
  const call_ = 'taylor(' + f + ', x, 0, ' + n + ')';
  const r = await call({ equation: call_ });
  if (r.error !== undefined) { declined++; continue; }
  const ans = answerOf(r.result) || (r.result.split('\n').find((l) => /^\s+\S/.test(l)) || '').trim();
  try {
    const fn = compile(f);
    const P = compile(ans.replace(/^.*?=\s*/, '').replace(/\s*\+\s*O\(.*$/, ''));
    const err = (h) => Math.abs(fn({ x: h }) - P({ x: h }));
    const h0 = Math.min(0.1, 10 ** (-9 / (n + 1)));
    const e1 = err(h0), e2 = err(h0 / 2);
    // the error behaves like h^(n+1): the ratio is about 2^(n+1); anything of lower order is a wrong polynomial
    if (e1 > 1e-13 && (e1 / Math.max(e2, 1e-300) < 2 ** (n + 1) * 0.5)) fail('taylor', call_, 'error ' + e1 + ' → ' + e2 + ' does not shrink like h^' + (n + 1), r.result);
  } catch (e) { fail('taylor', call_, 'cannot check: ' + e.message, r.result); }
}

// ---------------------------------------------------------------------------------------------------- definite integrals of rational functions
function simpson(f0, a, b, n = 40000) {
  const f = (x) => { const v = f0(x); return isFinite(v) ? v : f0(x + 1e-9); }; // a removable singularity on the grid
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
}
for (let i = 0; i < COUNT; i++) {
  total++;
  // denominator: product of factors with known real roots (rational or irrational) and irreducible quadratics
  const factors = [];
  const roots = [];
  let den = '';
  const nf = ri(1, 3);
  for (let j = 0; j < nf; j++) {
    const t = ri(0, 2);
    if (t === 0) { const A = nz(1, 3), B = nz(-4, 4); factors.push('(' + A + '*x + ' + B + ')'); roots.push(-B / A); }
    else if (t === 1) { const A = nz(1, 3), B = ri(-3, 3), C = ri(-5, -1); factors.push('(' + A + '*x^2 + ' + B + '*x + ' + C + ')'); const D = B * B - 4 * A * C; roots.push((-B + Math.sqrt(D)) / (2 * A), (-B - Math.sqrt(D)) / (2 * A)); }
    else { const A = nz(1, 3), B = ri(-2, 2), C = ri(3, 6); factors.push('(' + A + '*x^2 + ' + B + '*x + ' + C + ')'); }
  }
  den = factors.join('*');
  const num = poly([ri(-3, 3), nz(-3, 3)], 'x');
  const f = '(' + num + ')/(' + den + ')';
  const lo = ri(-4, 2) + (rnd() < 0.5 ? 0 : 0.5), hi = lo + ri(1, 5) + (rnd() < 0.5 ? 0 : 0.5);
  const call_ = 'integrate(' + f + ', x, ' + lo + ', ' + hi + ')';
  const fn = compile(f);
  const numFn = compile(num);
  const pole = roots.some((p) => p > lo + 1e-9 && p < hi - 1e-9 && Math.abs(numFn({ x: p })) > 1e-9);
  const nearEdge = roots.some((p) => Math.abs(p - lo) < 1e-3 || Math.abs(p - hi) < 1e-3);
  if (nearEdge) { total--; continue; }
  const r = await call({ equation: call_ });
  if (r.error !== undefined) { declined++; continue; }
  const ans = answerOf(r.result);
  if (!ans) { fail('integral', call_, 'no answer', r.result); continue; }
  if (/diverges/.test(ans)) { if (!pole) fail('integral', call_, 'reported divergence but no pole lies inside [' + lo + ', ' + hi + ']', r.result); continue; }
  if (pole) { fail('integral', call_, 'a pole lies inside [' + lo + ', ' + hi + '] but the answer is ' + ans, r.result); continue; }
  try {
    const want = simpson((x) => fn({ x }), lo, hi);
    const got = valueOf(ans);
    if (!close(got, want, 1e-6)) fail('integral', call_, 'answer ' + ans + ' but Simpson gives ' + want, r.result);
  } catch (e) { fail('integral', call_, 'cannot check: ' + e.message, r.result); }
}

// ---------------------------------------------------------------------------------------------------- finite sums
for (let i = 0; i < COUNT; i++) {
  total++;
  const forms = [
    () => { const p = [ri(-3, 3), nz(-3, 3), ri(-2, 2), ri(-1, 1)]; return poly(p, 'k'); },
    () => nz(1, 3) + '*' + pick([2, 3, 5]) + '^k', () => 'k*' + pick([2, 3]) + '^k', () => '1/(k*(k+' + nz(1, 3) + '))',
    () => '1/((' + nz(1, 3) + '*k-1)*(' + nz(1, 3) + '*k+' + nz(1, 3) + '))', () => '(-1)^k*k', () => 'k^2*(-2)^k',
  ];
  const body = pick(forms)();
  const a = ri(0, 3), b = a + ri(3, 14);
  const call_ = 'sum(' + body + ', k, ' + a + ', ' + b + ')';
  const r = await call({ equation: call_ });
  if (r.error !== undefined) { declined++; continue; }
  const ans = answerOf(r.result);
  try {
    const g = compile(body);
    let want = 0;
    let undefinedTerm = false;
    for (let kk = a; kk <= b; kk++) { const v = g({ k: kk }); if (!isFinite(v)) undefinedTerm = true; want += v; }
    if (undefinedTerm) continue;
    const got = valueOf(ans);
    if (!close(got, want, 1e-9)) fail('sum', call_, 'answer ' + ans + ' but direct summation gives ' + want, r.result);
  } catch (e) { fail('sum', call_, 'cannot check: ' + e.message, r.result); }
}
// ---------------------------------------------------------------------------------------------------- infinite sums
for (let i = 0; i < Math.ceil(COUNT / 2); i++) {
  total++;
  const a = ri(1, 3), b = ri(-1, 3), mm = ri(1, 3);
  const forms = [
    () => '1/((' + a + '*k + ' + (b + 5) + ')*(' + a + '*k + ' + (b + 5 + a * mm) + '))',
    () => '1/(' + a + '*k + ' + (b + 5) + ')^2',
    () => '(' + pick(['1/3', '2/3', '1/2', '3/4', '2/5']) + ')^k*k',
    () => '1/(' + a + '^2*k^2 - ' + pick([1, 4, 9]) + ')'.replace('a', ''),
    () => '(-1)^k/(' + a + '*k + ' + (b + 5) + ')^2',
    () => 'k/' + pick([2, 3]) + '^k',
  ];
  const body = pick(forms)();
  const call_ = 'sum(' + body + ', k, 1, oo)';
  const r = await call({ equation: call_ });
  if (r.error !== undefined) { declined++; continue; }
  const ans = answerOf(r.result);
  if (!ans) { fail('series', call_, 'no answer', r.result); continue; }
  try {
    const g = compile(body);
    let want = 0;
    const N = 400000;
    for (let kk = 1; kk <= N; kk++) want += g({ k: kk });
    if (/diverges/.test(ans)) { fail('series', call_, 'reported divergence of a convergent series', r.result); continue; }
    const got = valueOf(ans);
    if (!close(got, want, 3e-5)) fail('series', call_, 'answer ' + ans + ' but the partial sum to ' + N + ' is ' + want, r.result);
  } catch (e) { fail('series', call_, 'cannot check: ' + e.message, r.result); }
}
console.log(total + ' random calculus checks (' + declined + ' politely declined), ' + bad + ' WRONG');
process.exit(bad ? 1 : 0);
