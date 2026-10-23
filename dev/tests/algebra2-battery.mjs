// Algebra helpers: discriminant, completing the square, vertex, logarithm laws, sets, digits in other bases, binomial terms, ratios,
// scientific notation and confidence intervals from summary numbers.
import { spawnSync } from 'node:child_process';
import { load } from './harness.mjs';
import { compile } from './mathexpr.mjs';
const call = load(process.argv[2]);
const PY = process.env.PY || 'python3';
const r = spawnSync(PY, ['gen_algebra2.py', process.argv[3] || '1'], { encoding: 'utf8', maxBuffer: 1 << 28 });
if (r.status) { console.log(r.stderr); process.exit(1); }
const cases = JSON.parse(r.stdout);
let bad = 0;
const counts = {};
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * (1 + Math.abs(b));
let seed = 11;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const num = (t) => { try { return compile(t.trim().replace(/−/g, '-'))({}); } catch (e) { return NaN; } };
const setOf = (t) => { if (/∅/.test(t)) return []; const m = /\{([^}]*)\}/.exec(t); return m ? m[1].split(',').map((x) => x.trim()).filter(Boolean).map(Number).sort((a, b) => a - b) : null; };
for (const c of cases) {
  counts[c.kind] = (counts[c.kind] || 0) + 1;
  const res = await call({ equation: c.cmd });
  const fail = (why) => { bad++; console.log('FAIL ' + c.cmd.slice(0, 200) + '\n   ' + why + '\n   ' + String(res.result ?? res.error).split('\n').slice(0, 6).join(' | ').slice(0, 400)); };
  if (res.error !== undefined) { if (c.kind === 'logcondense' && /no logarithm/.test(res.error)) continue; fail('error: ' + res.error); continue; }
  const t = res.result;
  const answer = (/^Answer:\s*([\s\S]*?)(?:\n(?:Working|Check|Note):|(?![\s\S]))/m.exec(t) || [])[1] || '';
  if (c.kind === 'disc') {
    const m = /D = b² − 4ac = (-?[\d./]+)/.exec(answer);
    if (!m || !near(num(m[1]), c.D)) fail('D ' + (m && m[1]) + ' vs ' + c.D);
    else if ((c.D > 0) !== /two distinct real roots/.test(answer) && c.D !== 0) fail('nature');
  } else if (c.kind === 'square') {
    const m = /= (.*)\n/.exec(answer + '\n');
    if (!m) { fail('no form'); continue; }
    const f = compile(c.f.replace(/\^/g, '^')); const g = compile(m[1]);
    for (const xv of [-2.5, 0.7, 3.1]) if (!near(g({ x: xv }), f({ x: xv }), 1e-9)) { fail('not equal at ' + xv + ': ' + g({ x: xv }) + ' vs ' + f({ x: xv }) + ' (' + m[1] + ')'); break; }
    const v = /vertex \(h, k\) = \((-?[\d./]+)(?: \([^)]*\))?, (-?[\d./]+)/.exec(answer);
    if (!v || !near(num(v[1]), c.h) || !near(num(v[2]), c.k)) fail('vertex');
  } else if (c.kind === 'vertex') {
    const v = /vertex = \((-?[\d./]+)(?: \([^)]*\))?, (-?[\d./]+)/.exec(answer);
    if (!v || !near(num(v[1]), c.h) || !near(num(v[2]), c.k)) fail('vertex ' + (v && v[0]));
    if (c.up !== /opens upward/.test(answer)) fail('direction');
  } else if (c.kind === 'logexpand' || c.kind === 'logcondense') {
    const f = compile(c.expr.replace(/\bln\b/g, 'ln').replace(/\^/g, '^'));
    const g = compile(answer.trim());
    let good = 0;
    for (let i = 0; i < 30 && good < 6; i++) {
      const env = { x: 0.4 + rnd() * 5, y: 0.4 + rnd() * 5, z: 0.4 + rnd() * 5 };
      const a = f(env); if (!isFinite(a)) continue;
      if (!near(g(env), a, 1e-8)) { fail('differs: ' + g(env) + ' vs ' + a + ' (' + answer + ')'); good = -99; break; }
      good++;
    }
    if (c.kind === 'logexpand' && /(?:log|ln)\([^()]*[*^/√]|(?:log|ln)\([^()]*\)\(/.test(answer.replace(/(?:log|ln)\([a-z]\)/g, ''))) fail('not fully expanded: ' + answer);
    if (c.kind === 'logcondense' && (answer.match(/\b(?:log|ln)\(/g) || []).length > 1) fail('not condensed: ' + answer);
  } else if (c.kind === 'binomterm') {
    const m = /term \d+ = (.*)/.exec(answer);
    if (!m) { fail('no term'); continue; }
    const f = compile(c.expr); const g = compile(m[1]);
    for (const env of [{ x: 1.3, y: 0.7 }, { x: -0.8, y: 1.9 }]) if (!near(g(env), f(env), 1e-8)) { fail('term ' + g(env) + ' vs ' + f(env)); break; }
  } else if (c.kind === 'set') {
    const s = setOf(answer);
    if (!s || JSON.stringify(s) !== JSON.stringify(c.res)) fail('set ' + JSON.stringify(s) + ' vs ' + JSON.stringify(c.res));
  } else if (c.kind === 'setsize') {
    const m = /(?:= |number of subsets = 2\^\d+ = |\|A × B\| = )(\d+)/.exec(answer) || /^(\d+)$/.exec(answer.trim());
    if (!m || Number(m[1]) !== c.n) fail('count ' + (m && m[1]) + ' vs ' + c.n);
  } else if (c.kind === 'subset') {
    if (/⊆/.test(answer) !== c.res) fail('subset verdict');
  } else if (c.kind === 'frombase') {
    if (Number(answer.trim()) !== c.val) fail('value ' + answer + ' vs ' + c.val);
  } else if (c.kind === 'ratio') {
    const nums = answer.split(':').map((x) => Number(x.trim()));
    if (JSON.stringify(nums) !== JSON.stringify(c.res)) fail('ratio ' + answer);
  } else if (c.kind === 'proportion') {
    const m = /x = (-?[\d./]+)/.exec(answer);
    if (!m || !near(num(m[1]), c.x)) fail('x ' + (m && m[1]) + ' vs ' + c.x);
  } else if (c.kind === 'sci') {
    const m = /^(-?[\d.]+) × 10(⁻?[⁰¹²³⁴⁵⁶⁷⁸⁹]+)/.exec(answer.trim());
    if (!m) { fail('format'); continue; }
    const e = Number(m[2].replace('⁻', '-').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(d)));
    if (!near(Number(m[1]) * Math.pow(10, e), c.val, 1e-9) || Math.abs(Number(m[1])) < 1 || Math.abs(Number(m[1])) >= 10) fail('mantissa/exponent ' + answer);
  } else if (c.kind === 'ci') {
    const m = /\((-?[\d.]+), (-?[\d.]+)\)/.exec(answer);
    if (!m || !near(Number(m[1]), c.lo, 1e-5) || !near(Number(m[2]), c.hi, 1e-5)) fail('interval ' + (m && m[0]) + ' vs ' + c.lo.toFixed(4) + ', ' + c.hi.toFixed(4));
  }
}
console.log(cases.length + ' algebra helper checks (' + Object.entries(counts).map(([k, v]) => v + ' ' + k).join(', ') + '), ' + bad + ' WRONG');
process.exit(bad ? 1 : 0);
