// Random differential equations from the usual textbook families. Whatever the solver answers is substituted back into
// the equation by the independent checker (ode-verify.mjs); an answer that fails the substitution is a bug, an
// error message is fine ("not supported" is allowed, a wrong answer is not).
//   usage: node ode-fuzz.mjs <index.html> [seed] [count]
import { load } from './harness.mjs';
import { compile } from './mathexpr.mjs';
import { verifyODE } from './ode-verify.mjs';

const call = load(process.argv[2]);
let seed = Number(process.argv[3] || 1) >>> 0;
const COUNT = Number(process.argv[4] || 400);
function rnd() { // mulberry32
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const nz = (a, b) => { let v = 0; while (!v) v = ri(a, b); return v; };
const sgn = (n) => (n < 0 ? '- ' + Math.abs(n) : '+ ' + n);
const num = (n) => (n < 0 ? '(' + n + ')' : String(n));

// each family returns { lhs, rhs, order, text?, ics? }  (lhs/rhs in the solver's syntax with y', y'', y''')
const FAMILIES = {
  linear1() {
    const a = nz(-4, 4), b = nz(-4, 4), k = ri(1, 3), c = nz(-2, 2);
    const P = pick([String(a), a + '/x', a + '*x', a + '*x^2']);
    const Q = pick([String(b), b + '*x', b + '*x^' + k, b + '*e^(' + num(c) + '*x)', b + '*sin(x)', b + '*cos(' + k + '*x)', b + '*x*e^x', b + '/x']);
    return { lhs: "y' + (" + P + ")*y", rhs: Q, order: 1 };
  },
  linear1b() {
    const a = nz(-3, 3), b = nz(-3, 3), k = ri(0, 3);
    return { lhs: "x*y' + " + num(a) + '*y', rhs: b + '*x^' + k, order: 1 };
  },
  separable() {
    const f = pick(['x', 'x^2', 'sin(x)', 'e^x', '1/x', '1/(1+x^2)', 'cos(x)', String(nz(1, 3))]);
    const g = pick(['y', 'y^2', '(1+y^2)', 'y*(' + ri(1, 4) + '-y)', 'e^(-y)', 'y^3', 'sqrt(y)', '(y^2-' + ri(1, 4) + ')', 'y*ln(y)']);
    return { lhs: "y'", rhs: '(' + f + ')*(' + g + ')', order: 1 };
  },
  bernoulli() {
    const a = nz(-3, 3), b = nz(-3, 3), n = pick([2, 3, 2, 3, -1, 4]);
    const m = pick(['', '*x', '*x^2', '*e^x', '*sin(x)']);
    return { lhs: "y' + " + num(a) + '*y', rhs: b + m + '*y^' + num(n), order: 1 };
  },
  homogeneous() {
    const [a, b, c, d] = [nz(-3, 3), nz(-3, 3), nz(-3, 3), nz(-3, 3)];
    if (rnd() < 0.7) return { lhs: "y'", rhs: '(' + a + '*x + ' + num(b) + '*y)/(' + c + '*x + ' + num(d) + '*y)', order: 1 };
    return { lhs: "y'", rhs: 'y/x + ' + pick(['(y/x)^2', '(y/x)^3', 'tan(y/x)', 'sin(y/x)', 'e^(y/x)', '(y/x)^2*' + a]), order: 1 };
  },
  exact() {
    const terms = [];
    const n = ri(2, 4);
    for (let t = 0; t < n; t++) terms.push({ c: nz(-3, 3), i: ri(0, 3), j: ri(0, 3) });
    const M = terms.filter((t) => t.i > 0).map((t) => t.c * t.i + '*x^' + (t.i - 1) + '*y^' + t.j).join(' + ') || '0';
    const N = terms.filter((t) => t.j > 0).map((t) => t.c * t.j + '*x^' + t.i + '*y^' + (t.j - 1)).join(' + ') || '0';
    if (M === '0' || N === '0') return null;
    return { text: '(' + M + ') dx + (' + N + ') dy = 0', lhs: '(' + N + ")*y' + (" + M + ')', rhs: '0', order: 1 };
  },
  constcoef2() {
    const r1 = ri(-3, 3), r2 = ri(-3, 3);
    const a = -(r1 + r2), b = r1 * r2;
    const lhs = "y'' " + sgn(a) + "*y' " + sgn(b) + '*y';
    const k = nz(-2, 2), m = ri(1, 3), c = nz(-3, 3);
    const F = pick(['0', String(c), c + '*x', c + '*x^2', c + '*e^(' + num(k) + '*x)', c + '*sin(' + m + '*x)', c + '*cos(' + m + '*x)', c + '*x*e^(' + num(k) + '*x)', c + '*e^(' + num(k) + '*x)*sin(' + m + '*x)', c + '*sinh(x)']);
    return { lhs, rhs: F, order: 2 };
  },
  complexroots2() {
    const al = ri(-2, 2), be = ri(1, 3);
    const a = -2 * al, b = al * al + be * be;
    const F = pick(['0', String(nz(-3, 3)), nz(-3, 3) + '*x', nz(-2, 2) + '*e^x', nz(-2, 2) + '*cos(x)']);
    return { lhs: "y'' " + sgn(a) + "*y' " + sgn(b) + '*y', rhs: F, order: 2 };
  },
  constcoef3() {
    const r = [ri(-2, 2), ri(-2, 2), ri(-2, 2)];
    const c2 = -(r[0] + r[1] + r[2]), c1 = r[0] * r[1] + r[0] * r[2] + r[1] * r[2], c0 = -r[0] * r[1] * r[2];
    const F = pick(['0', String(nz(-3, 3)), nz(-3, 3) + '*x', nz(-3, 3) + '*e^(2*x)', nz(-2, 2) + '*sin(x)']);
    return { lhs: "y''' " + sgn(c2) + "*y'' " + sgn(c1) + "*y' " + sgn(c0) + '*y', rhs: F, order: 3 };
  },
  euler() {
    const a = ri(-3, 4), b = ri(-3, 4);
    const F = pick(['0', 'x^' + ri(0, 3), 'ln(x)', String(nz(-3, 3))]);
    return { lhs: "x^2*y'' + " + num(a) + "*x*y' + " + num(b) + '*y', rhs: F, order: 2 };
  },
  variation() {
    const w = ri(1, 3);
    const F = pick(['tan(' + w + '*x)', 'sec(' + w + '*x)', '1/cos(' + w + '*x)', 'e^x/x', '1/x', 'ln(x)', '1/(1+e^x)']);
    const kind = rnd();
    if (kind < 0.5) return { lhs: "y'' + " + w * w + '*y', rhs: F, order: 2 };
    return { lhs: "y'' - 2*y' + y", rhs: 'e^x/x', order: 2 };
  },
};
const names = Object.keys(FAMILIES);

function residual(lhs, rhs) {
  const prep = (s) => s.replace(/y'''/g, 'r').replace(/y''/g, 'q').replace(/y'/g, 'p');
  const L = compile(prep(lhs)), Rr = compile(prep(rhs));
  return (x, y, p = 0, q = 0, r = 0) => L({ x, y, p, q, r }) - Rr({ x, y, p, q, r });
}
let ok = 0, wrong = 0, polite = 0, unverified = 0, total = 0;
const byFamily = {};
for (let i = 0; i < COUNT; i++) {
  const fam = pick(names);
  const eq = FAMILIES[fam]();
  if (!eq) continue;
  total++;
  const text = eq.text || eq.lhs + ' = ' + eq.rhs;
  const r = await call({ equation: text });
  byFamily[fam] = byFamily[fam] || { ok: 0, err: 0, bad: 0 };
  if (r.error !== undefined) {
    polite++;
    byFamily[fam].err++;
    if (process.argv.includes('-v')) console.log('declined [' + fam + '] ' + text + '   -> ' + r.error.slice(0, 90));
    if (!/Could not solve/.test(r.error)) { wrong++; byFamily[fam].bad++; console.log('NOT POLITE  ' + text + '\n   ' + r.error); }
    continue;
  }
  let resid;
  try { resid = residual(eq.lhs, eq.rhs); } catch (e) { console.log('harness problem for ' + text + ': ' + e.message); continue; }
  const why = verifyODE(r.result, resid, eq.order, null);
  if (!why) { ok++; byFamily[fam].ok++; continue; }
  if (/could not verify/.test(why)) { unverified++; continue; }
  wrong++;
  byFamily[fam].bad++;
  console.log('WRONG  ' + text + '\n   ' + why + '\n   ' + r.result.split('\n').slice(0, 5).join(' | '));
}
console.log('\n' + total + ' random equations: ' + ok + ' answers verified by substitution, ' + polite + ' politely declined, ' + unverified + ' not checkable numerically (domain), ' + wrong + ' WRONG');
console.log(Object.entries(byFamily).map(([k, v]) => k + ' ' + v.ok + '/' + (v.ok + v.err + v.bad)).join('   '));
process.exit(wrong ? 1 : 0);
