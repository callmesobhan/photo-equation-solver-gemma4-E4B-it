// Random equations and inequalities (rational, radical, exponential, logarithmic, absolute value, polynomial) checked with an
// independent numerical scan of f = lhs - rhs, using the evaluator in mathexpr.mjs:
//   equations     every printed solution must satisfy the equation, and every sign change of f found by the scan must be
//                 matched by a printed solution (nothing is missed)
//   inequalities  at many random points the printed solution set must agree with the inequality itself
//   usage: node eq-battery.mjs <index.html> [seed] [count]
import { load } from './harness.mjs';
import { compile } from './mathexpr.mjs';

const call = load(process.argv[2]);
let seed = Number(process.argv[3] || 1) >>> 0;
const COUNT = Number(process.argv[4] || 80);
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
const lin = (a, b) => '(' + a + '*x + ' + b + ')';
let total = 0, bad = 0, declined = 0, unparsed = 0;
const fail = (kind, input, why, got) => { bad++; console.log('FAIL [' + kind + '] ' + input + '\n   ' + why + '\n   got ' + String(got).split('\n').slice(0, 6).join(' | ')); };

const EQ = [
  () => { const [a, b, c, d, e, f, g, h] = Array.from({ length: 8 }, () => nz(-4, 4)); return lin(a, b) + '/' + lin(c, d) + ' = ' + lin(e, f) + '/' + lin(g, h); },
  () => { const [a, b, c, d] = [nz(1, 4), ri(-3, 6), nz(-3, 3), ri(-4, 4)]; return 'sqrt(' + a + '*x + ' + b + ') = ' + c + '*x + ' + d; },
  () => { const [a, b, c] = [ri(0, 5), ri(0, 5), ri(3, 8)]; return 'sqrt(x + ' + a + ') + sqrt(x + ' + b + ') = ' + c; },
  () => { const [a, b, c] = [pick([2, 3, 5]), pick([2, 3, 7]), ri(-2, 2)]; return a + '^x = ' + b + '^(x + ' + c + ')'; },
  () => { const [a, b, c] = [nz(1, 3), nz(1, 3), ri(2, 9)]; return a + '*2^x + ' + b + '*2^(-x) = ' + c; },
  () => { const [a, b, c] = [ri(0, 4), ri(0, 4), ri(0, 3)]; return 'ln(x + ' + a + ') + ln(x + ' + b + ') = ' + c; },
  () => { const [a, b] = [ri(1, 6), ri(1, 5)]; return 'log2(x) + log2(x + ' + a + ') = ' + b; },
  () => { const [a, b, c, d] = [nz(-3, 3), ri(-5, 5), nz(-3, 3), ri(-5, 5)]; return 'abs(' + a + '*x + ' + b + ') = ' + c + '*x + ' + d; },
  () => { const [a, b, c] = [ri(-4, 4), ri(-4, 4), ri(3, 12)]; return 'abs(x - ' + a + ') + abs(x - ' + b + ') = ' + c; },
  () => { const [a, b, c, d] = [nz(1, 3), nz(-3, 3), nz(-4, 4), nz(-6, 6)]; return a + '*x^3 + ' + b + '*x^2 + ' + c + '*x + ' + d + ' = 0'; },
  () => { const [a, b, c] = [nz(1, 3), nz(-4, 4), nz(-5, 5)]; return 'x^4 + ' + a + '*x^2 + ' + b + '*x = ' + c; },
  () => { const [a, b, c] = [nz(1, 3), nz(-4, 4), nz(1, 5)]; return a + '/x + ' + b + '/(x + 1) = ' + c; },
  () => { const [a, b, c] = [nz(1, 3), ri(1, 4), nz(1, 6)]; return 'x + ' + a + '/(x - ' + b + ') = ' + c; },
  () => { const [a, b] = [ri(1, 5), ri(-3, 3)]; return 'e^x + ' + a + '*e^(-x) = ' + (a + 3) + '+' + b; },
  () => { const [a, b] = [nz(1, 3), ri(1, 6)]; return 'x*ln(x) = ' + a + '*x - ' + b; },
  () => { const [a, b] = [nz(1, 3), ri(1, 6)]; return 'x^' + pick([2, 3]) + ' = ' + a + '^x + ' + b; },
];
const refRoots = (f, lo, hi, n) => {
  const roots = [];
  let xp = lo, fp = f({ x: xp });
  for (let i = 1; i <= n; i++) {
    const x = lo + ((hi - lo) * i) / n;
    const fx = f({ x });
    if (isFinite(fp) && isFinite(fx) && fp * fx < 0) {
      let a = xp, b = x, fa = fp;
      for (let it = 0; it < 100; it++) {
        const m = (a + b) / 2, fm = f({ x: m });
        if (!isFinite(fm)) break;
        if (fa * fm <= 0) b = m; else { a = m; fa = fm; }
      }
      const r = (a + b) / 2;
      const scale = Math.max(1, Math.abs(fp), Math.abs(fx));
      if (Math.abs(f({ x: r })) < 1e-6 * scale) roots.push(r); // a genuine root, not a pole
    } else if (isFinite(fx) && fx === 0) roots.push(x);
    xp = x; fp = fx;
  }
  return roots;
};
for (let i = 0; i < COUNT; i++) {
  const text = pick(EQ)();
  total++;
  const r = await call({ equation: text });
  if (r.error !== undefined) { declined++; continue; }
  const [l, rr] = text.split('=').map((s) => s.trim());
  let f;
  try { const L = compile(l), R = compile(rr); f = (e) => L(e) - R(e); } catch (e) { fail('equation', text, 'harness cannot read the equation: ' + e.message, r.result); continue; }
  const lines = r.result.split('\n').filter((ln) => /^\s*x\s*[=≈]|^Answer: x\s*[=≈]/.test(ln));
  const sols = [];
  let readable = true;
  for (const ln of lines) {
    const mm = /x\s*[=≈]\s*(.*)$/.exec(ln.replace(/^Answer:\s*/, ''));
    const m1 = /\((?:≈|=)\s*([-0-9.e+]+)\)/.exec(mm[1]);
    try { sols.push(m1 ? parseFloat(m1[1]) : /≈/.test(ln) ? parseFloat(mm[1]) : compile(mm[1])({})); } catch (e) { readable = false; }
  }
  if (!readable) { unparsed++; console.log('UNPARSED ' + text + '\n   ' + r.result.split('\n').slice(0, 4).join(' | ')); continue; }
  if (/true for every|identical|every real|all real numbers/i.test(r.result)) { total--; continue; }
  const noSol = /no (real )?solution/i.test(r.result);
  // 1. each printed solution satisfies the equation
  for (const s of sols) {
    const v = f({ x: s });
    const scale = 1 + Math.abs(compile(l)({ x: s })) + Math.abs(compile(rr)({ x: s }));
    if (!isFinite(v) || Math.abs(v) > 1e-5 * scale) fail('equation', text, 'x = ' + s + ' does not satisfy it (f = ' + v + ')', r.result);
  }
  // 2. nothing is missed
  const ref = refRoots(f, -60, 60, 60000);
  if (ref.length > 25) { total--; continue; } // not a finite solution set
  for (const q of ref) {
    if (Math.abs(q) > 55) continue;
    if (!sols.some((s) => Math.abs(s - q) < 1e-5 * (1 + Math.abs(q)))) { fail('equation', text, 'missed the solution x = ' + q, r.result); break; }
  }
  if (noSol && ref.length && ref.some((q) => Math.abs(q) < 55)) fail('equation', text, 'says there is no solution but x = ' + ref[0] + ' works', r.result);
}

// ---------------------------------------------------------------------------------------------------- inequalities
const INEQ = [
  () => { const rts = [ri(-5, 5), ri(-5, 5), ri(-5, 5)]; return '(x - ' + rts[0] + ')*(x - ' + rts[1] + ')*(x - ' + rts[2] + ')'; },
  () => '(' + lin(nz(-3, 3), ri(-6, 6)) + ')*(x^2 + ' + ri(1, 4) + ')',
  () => lin(nz(-3, 3), ri(-6, 6)) + '/' + lin(nz(-3, 3), ri(-6, 6)),
  () => '(x^2 - ' + ri(1, 9) + ')/(x - ' + ri(-3, 3) + ')',
  () => 'abs(' + lin(nz(-3, 3), ri(-6, 6)) + ') - ' + ri(0, 6),
  () => 'x^4 - ' + nz(1, 6) + '*x^2 + ' + ri(0, 6),
  () => 'x^2 + ' + nz(-5, 5) + '*x + ' + ri(-6, 6),
  () => lin(nz(-3, 3), ri(-6, 6)) + '/(x^2 + ' + ri(1, 4) + ') - ' + ri(0, 1) + '/' + ri(1, 5),
];
const OPS = ['<', '<=', '>', '>='];
const parseSet = (lines) => {
  // returns (x) => boolean, from  "x ∈ (-∞, -1] ∪ (2, ∞)"  or  "all real numbers" / "no solution"
  const txt = lines.join('\n');
  if (/all real numbers|every real/i.test(txt)) return () => true;
  if (/no solution|no real solution|empty/i.test(txt)) return () => false;
  const m = /x\s*∈\s*(.*?)\s*\(interval notation\)/.exec(txt) || /x\s*∈\s*(.*)$/m.exec(txt);
  if (!m) return null;
  const parts = m[1].split('∪').map((s) => s.trim());
  const sets = [];
  for (const p of parts) {
    const pt = /^\{(.*)\}$/.exec(p);
    if (pt) { const v = compile(pt[1])({}); sets.push((x) => Math.abs(x - v) < 1e-9); continue; }
    const iv = /^([(\[])\s*(.*?)\s*,\s*(.*?)\s*([)\]])$/.exec(p);
    if (!iv) return null;
    const val = (s) => (s === '∞' ? Infinity : s === '-∞' ? -Infinity : compile(s.replace(/≈/g, ''))({}));
    const lo = val(iv[2]), hi = val(iv[3]);
    sets.push((x) => (iv[1] === '(' ? x > lo : x >= lo) && (iv[4] === ')' ? x < hi : x <= hi));
  }
  return (x) => sets.some((s) => s(x));
};
for (let i = 0; i < COUNT; i++) {
  const expr = pick(INEQ)();
  const op = pick(OPS);
  const text = expr + ' ' + op + ' 0';
  total++;
  const r = await call({ equation: text });
  if (r.error !== undefined) { declined++; continue; }
  let inSet;
  try { inSet = parseSet(r.result.split('\n')); } catch (e) { inSet = null; }
  if (!inSet) { unparsed++; console.log('UNPARSED ' + text + '\n   ' + r.result.split('\n').slice(0, 5).join(' | ')); continue; }
  const g = compile(expr);
  const holds = (x) => { const v = g({ x }); return op === '<' ? v < 0 : op === '<=' ? v <= 0 : op === '>' ? v > 0 : v >= 0; };
  let wrong = null;
  for (let k = 0; k < 400 && !wrong; k++) {
    const x = (rnd() - 0.5) * 24 + 0.0123;
    const v = g({ x });
    if (!isFinite(v) || Math.abs(v) < 1e-6) continue; // on a boundary or a pole
    if (holds(x) !== inSet(x)) wrong = x;
  }
  if (wrong !== null) fail('inequality', text, 'at x = ' + wrong + ' the inequality is ' + holds(wrong) + ' but the answer says ' + inSet(wrong), r.result);
}
console.log(total + ' random equations and inequalities (' + declined + ' politely declined, ' + unparsed + ' answers the checker could not read), ' + bad + ' WRONG');
process.exit(bad ? 1 : 0);
