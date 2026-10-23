// Exact trigonometric values, arithmetic with square roots, trig of inverse trig, and trigonometric simplification / expansion / product-to-sum.
import { spawnSync } from 'node:child_process';
import { load } from './harness.mjs';
import { compile } from './mathexpr.mjs';
const call = load(process.argv[2]);
const PY = process.env.PY || 'python3';
const r = spawnSync(PY, ['gen_trig.py', process.argv[3] || '1'], { encoding: 'utf8', maxBuffer: 1 << 28 });
if (r.status) { console.log(r.stderr); process.exit(1); }
const cases = JSON.parse(r.stdout);
let bad = 0;
const counts = {};
const near = (a, b, tol) => Math.abs(a - b) <= tol * (1 + Math.abs(b));
let seed = 99;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
for (const c of cases) {
  counts[c.kind] = (counts[c.kind] || 0) + 1;
  const res = await call({ equation: c.cmd });
  const fail = (why) => { bad++; console.log('FAIL ' + c.cmd.slice(0, 200) + '\n   ' + why + '\n   ' + String(res.result ?? res.error).split('\n').slice(0, 5).join(' | ').slice(0, 400)); };
  if (c.kind === 'exact' && c.undefined) {
    if (res.error === undefined || !/undefined/.test(res.error)) fail('should be undefined');
    continue;
  }
  if (res.error !== undefined) { fail('error: ' + res.error); continue; }
  const m = /^Answer: (.*)$/m.exec(res.result);
  if (!m) { fail('no answer'); continue; }
  const full = m[1].trim();
  const exact = full.replace(/\s*\((?:≈|=) -?[\d.e+-]+\).*$/, '').trim();
  const val = (text, env) => { try { return compile(text)(env || {}); } catch (e) { return NaN; } };
  if (c.kind === 'exact' || c.kind === 'surd' || c.kind === 'denest' || c.kind === 'invtrig') {
    const v = val(exact);
    if (!near(v, c.val, 1e-9)) { fail('value ' + v + ' vs ' + c.val + ' (exact text "' + exact + '")'); continue; }
    // the printed approximation agrees too
    const ap = /\((?:≈|=) (-?[\d.]+(?:e[+-]?\d+)?)\)/.exec(full);
    if (ap && !near(Number(ap[1]), c.val, 1e-6)) fail('approximation ' + ap[1] + ' vs ' + c.val);
    if (c.kind !== 'exact' && /\/\s*(?!\d+(?:\s|$))/.test(exact.replace(/\([^()]*\)/g, (s) => s.replace(/\//g, '÷')))) fail('root left in a denominator: ' + exact);
    if (c.kind === 'denest' && c.nested && /√\([^)]*√/.test(exact)) fail('nested root left: ' + exact);
  } else {
    // equivalence at random points; poles of the question are skipped
    const vars = c.kind === 'simplify' || c.kind === 'tosum' ? ['x'] : ['a', 'b', 'c'];
    let f; let g;
    try { f = compile(c.expr.replace(/\^/g, '^')); g = compile(exact); } catch (e) { fail('cannot read: ' + e.message + ' [' + exact + ']'); continue; }
    let good = 0;
    for (let t = 0; t < 40 && good < 8; t++) {
      const env = {};
      vars.forEach((v) => { env[v] = (rnd() - 0.5) * 6; });
      const a = f(env); if (!isFinite(a) || Math.abs(a) > 1e6) continue;
      const b = g(env);
      if (!near(b, a, 1e-8)) { fail('differs at ' + JSON.stringify(env) + ': ' + b + ' vs ' + a + '   answer: ' + exact); good = -99; break; }
      good++;
    }
    if (good === 0) fail('no usable test point');
    if (c.kind === 'simplify' && exact.replace(/\s/g, '').length > c.expr.replace(/\s/g, '').length + 8) fail('answer is longer than the question: ' + exact);
    if (c.kind === 'expand') {
      // every trig function is applied to a single letter
      const args = [...exact.matchAll(/(?:sin|cos|tan|cot|sec|csc)\(([^()]*)\)/g)].map((x) => x[1]);
      if (args.some((a) => !/^[abc]$/.test(a.trim()))) fail('not fully expanded: ' + exact);
    }
    if (c.kind === 'tosum') {
      // no product of two trig functions and no trig function to a power
      if (/(?:sin|cos)\([^()]*\)\s*(?:\*|\(|sin|cos|[⁰¹²³⁴⁵⁶⁷⁸⁹])/.test(exact)) fail('not a sum of sines and cosines: ' + exact);
    }
  }
}
console.log(cases.length + ' trig / surd checks (' + Object.entries(counts).map(([k, v]) => v + ' ' + k).join(', ') + '), ' + bad + ' WRONG');
process.exit(bad ? 1 : 0);
