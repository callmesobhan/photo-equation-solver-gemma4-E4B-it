// Textbook helpers: linear approximation, MVT / Rolle / IVT, patterned series, distribution moments, probability sentences, counting
// phrases, radian conversions, combined fractions and sums with factorials.
import { spawnSync } from 'node:child_process';
import { load } from './harness.mjs';
import { compile } from './mathexpr.mjs';
const call = load(process.argv[2]);
const PY = process.env.PY || 'python3';
const r = spawnSync(PY, ['gen_textbook.py', process.argv[3] || '1'], { encoding: 'utf8', maxBuffer: 1 << 28 });
if (r.status) { console.log(r.stderr); process.exit(1); }
const cases = JSON.parse(r.stdout);
let bad = 0;
const counts = {};
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * (1 + Math.abs(b));
let seed = 7;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const evalText = (t) => { try { return compile(t.trim().replace(/≈/g, ''))({}); } catch (e) { return NaN; } };
/** the number a text starts with: "2/5 (= 0.4)" -> 0.4, "π²/6 (≈ 1.64)" -> 1.64, "108 degrees" -> 108 */
function lead(t) {
  const ap = /\((?:≈|=) (-?[\d.]+(?:e[+-]?\d+)?)\)/.exec(t);
  if (ap) return Number(ap[1]);
  return evalText(t.replace(/\s*\(.*$/, '').replace(/[a-z]+$/i, ''));
}
for (const c of cases) {
  counts[c.kind] = (counts[c.kind] || 0) + 1;
  const res = await call({ equation: c.cmd });
  const fail = (why) => { bad++; console.log('FAIL ' + c.cmd.slice(0, 200) + '\n   ' + why + '\n   ' + String(res.result ?? res.error).split('\n').slice(0, 7).join(' | ').slice(0, 500)); };
  if (res.error !== undefined) { fail('error: ' + res.error); continue; }
  const t = res.result;
  const answer = (/^Answer:\s*([\s\S]*?)(?:\n(?:Working|Check|Note):|(?![\s\S]))/m.exec(t) || [])[1] || '';
  if (c.kind === 'linapprox') {
    const L = /L\(x\) = (.*)/.exec(answer);
    if (!L) { fail('no L(x)'); continue; }
    const g = compile(L[1]);
    for (const tt of [-1.3, 0.4, 2.2]) if (!near(g({ x: tt }), c.fa + c.da * (tt - c.a), 1e-8)) { fail('L(' + tt + ') = ' + g({ x: tt }) + ' vs ' + (c.fa + c.da * (tt - c.a))); break; }
    if (c.x0 !== undefined) {
      const est = /estimate: f\([^)]*\) ≈ L\([^)]*\) = (.*)/.exec(answer);
      const act = /actual f\([^)]*\) = ([-\d.e+]+)/.exec(answer);
      if (!est || !near(lead(est[1]), c.fa + c.da * (c.x0 - c.a), 1e-6)) fail('estimate');
      if (!act || !near(Number(act[1]), c.actual, 1e-6)) fail('actual value');
    }
  } else if (c.kind === 'mvt' || c.kind === 'rolle') {
    const cs = [...answer.matchAll(/c = ([^,\n]*?)(?:\s*\(≈ ([-\d.]+)\))?,\s+f'\(c\)/g)].map((m) => (m[2] !== undefined ? Number(m[2]) : evalText(m[1])));
    if (c.kind === 'rolle' && /does not apply/.test(answer) === c.applies) fail('Rolle applicability');
    if (cs.length !== c.cs.length) { fail('found ' + cs.length + ' values of c, expected ' + c.cs.length + ' (' + c.cs.map((v) => v.toFixed(4)).join(', ') + ')'); continue; }
    const want = c.cs.slice().sort((a, b) => a - b);
    cs.sort((a, b) => a - b).forEach((v, i) => { if (!near(v, want[i], 1e-6)) fail('c = ' + v + ' vs ' + want[i]); });
  } else if (c.kind === 'ivt') {
    const says = /lies between/.test(answer);
    if (says !== c.inside) { fail('applicability ' + says + ' vs ' + c.inside); continue; }
    if (says) {
      const f = compile(c.f);
      const cs = [...answer.matchAll(/^\s*c = ([^\n(]*?)(?:\s*\(≈ ([-\d.]+)\))?$/gm)].map((m) => (m[2] !== undefined ? Number(m[2]) : evalText(m[1])));
      if (!cs.length) fail('no c');
      cs.forEach((v) => { if (!near(f({ x: v }), c.k, 1e-5) || v < c.a - 1e-9 || v > c.b + 1e-9) fail('f(' + v + ') = ' + f({ x: v }) + ' vs ' + c.k); });
    }
  } else if (c.kind === 'seriessum' || c.kind === 'factsum') {
    const v = lead(/sum = (.*)/.exec(answer) ? /sum = (.*)/.exec(answer)[1] : answer);
    if (!near(v, c.val, 1e-6)) fail('sum ' + v + ' vs ' + c.val);
  } else if (c.kind === 'dist') {
    const m = /mean = ([^,]*?),\s+variance = ([^,]*?),/.exec(answer);
    if (!m) { fail('no moments'); continue; }
    if (!near(lead(m[1]), c.mean, 1e-6) || !near(lead(m[2]), c.var, 1e-6)) fail('moments ' + lead(m[1]) + ', ' + lead(m[2]) + ' vs ' + c.mean + ', ' + c.var);
  } else if (c.kind === 'prob' || c.kind === 'count') {
    if (!near(lead(answer), c.val, 1e-6)) fail('value ' + lead(answer) + ' vs ' + c.val);
  } else if (c.kind === 'conv') {
    const m = /= (.*?) (degrees|radians|deg|rad)\b/.exec(answer);
    if (!m || !m[2].startsWith(c.unit.slice(0, 3)) || !near(lead(m[1]), c.val, 1e-6)) fail('conversion ' + (m ? m[1] : answer) + ' vs ' + c.val);
  } else if (c.kind === 'combine') {
    const f = compile(c.expr);
    const g = compile(answer.trim());
    let good = 0;
    for (let i = 0; i < 30 && good < 6; i++) {
      const env = { x: (rnd() - 0.5) * 12 };
      const a = f(env);
      if (!isFinite(a) || Math.abs(a) > 1e5) continue;
      if (!near(g(env), a, 1e-8)) { fail('differs at ' + env.x + ': ' + g(env) + ' vs ' + a + ' (answer ' + answer + ')'); good = -99; break; }
      good++;
    }
    if (!good) fail('no usable point');
  }
}
console.log(cases.length + ' textbook checks (' + Object.entries(counts).map(([k, v]) => v + ' ' + k).join(', ') + '), ' + bad + ' WRONG');
process.exit(bad ? 1 : 0);
