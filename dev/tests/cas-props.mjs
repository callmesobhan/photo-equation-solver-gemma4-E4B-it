// Symbolic core vs sympy: value after parsing, derivative, expansion, and print/re-parse round trip.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import vm from 'node:vm';
const html = fs.readFileSync(process.argv[2], 'utf8');
const m = /<script>([\s\S]*)<\/script>/.exec(html);
const window = {};
vm.runInContext(m[1], vm.createContext({ window, console, Math, JSON, BigInt, Number, String, Array, Object, Set, Map, RegExp, Error, RangeError, isFinite, isNaN, parseInt, parseFloat, Date }));
const T = window.__test;
const PY = process.env.PY || 'python3';
const gen = (...a) => JSON.parse(spawnSync(PY, ['gen_cas.py', ...a], { encoding: 'utf8', maxBuffer: 1 << 28 }).stdout);
const close = (a, b) => Math.abs(a - b) <= 1e-7 * (1 + Math.abs(a) + Math.abs(b));
let n = 0, bad = 0;
const fail = (what, c, extra) => { bad++; if (bad <= 25) console.log('✗ [' + what + '] ' + c.text + (extra ? '  ' + extra : '')); };
for (const seed of [1, 2, 3, 4]) {
  for (const c of gen(String(seed), '150')) {
    n++;
    let S;
    try { S = T.fromAst(T.parseExpression(T.normalizeText(c.text))); } catch (e) { fail('parse', c, e.message); continue; }
    const ev = (e, p) => T.numS(e, p);
    // 1. value
    if (!c.pts.every((p, i) => close(ev(S, p), c.val[i]))) { fail('value', c, T.fmtS(S, true)); continue; }
    // 2. derivative
    let D;
    try { D = T.diffS(S, 'x'); } catch (e) { fail('diff-throw', c, e.message); continue; }
    if (!c.pts.every((p, i) => close(ev(D, p), c.dx[i]))) { fail('diff', c, T.fmtS(D, true)); continue; }
    // 3. expand keeps the value
    try {
      const X = T.expandS(S);
      if (!c.pts.every((p, i) => close(ev(X, p), c.val[i]))) fail('expand', c, T.fmtS(X, true));
    } catch (e) { if (!/too large/.test(e.message)) fail('expand-throw', c, e.message); }
    // 4. print -> parse -> same value (both the expression and its derivative)
    for (const [label, E, want] of [['reparse', S, c.val], ['reparse-d', D, c.dx]]) {
      try {
        const R = T.fromAst(T.parseExpression(T.normalizeText(T.fmtS(E, true))));
        if (!c.pts.every((p, i) => close(ev(R, p), want[i]))) fail(label, c, T.fmtS(E, true));
      } catch (e) { fail(label + '-throw', c, e.message + ' :: ' + T.fmtS(E, true)); }
    }
  }
}
console.log(`${n} random expressions: ${bad ? bad + ' FAILURES' : 'all value / derivative / expand / reparse checks pass'}`);
process.exit(bad ? 1 : 0);
