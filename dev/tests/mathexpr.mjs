// A small, independent evaluator for the solver's printed answers (used by the test batteries, not shipped).
// Reads text such as  "C1 e^(-x/2) cos(x√3/2) + ln(|x|)/4"  and returns a JS function of the named variables.
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const FUNCS = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, sec: (v) => 1 / Math.cos(v), csc: (v) => 1 / Math.sin(v), cot: (v) => 1 / Math.tan(v),
  asin: Math.asin, acos: Math.acos, atan: Math.atan, arcsin: Math.asin, arccos: Math.acos, arctan: Math.atan,
  erf, sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, ln: Math.log, log: Math.log10, log2: Math.log2, log10: Math.log10, exp: Math.exp, sqrt: Math.sqrt, abs: Math.abs, cbrt: Math.cbrt,
};
function erf(x) {
  const ax = Math.abs(x);
  if (ax < 3) {
    let sum = 0, term = ax;
    for (let n = 0; n < 80; n++) {
      sum += term / (2 * n + 1);
      term *= -(ax * ax) / (n + 1);
    }
    return Math.sign(x) * 2 / Math.sqrt(Math.PI) * sum;
  }
  let f = 0;
  for (let k = 80; k >= 1; k--) f = (k / 2) / (ax + f);
  const erfc = Math.exp(-ax * ax) / Math.sqrt(Math.PI) / (ax + f);
  return Math.sign(x) * (1 - erfc);
}
function tokenize(s) {
  const toks = [];
  let i = 0;
  s = s.replace(/−/g, '-').replace(/·/g, '*').replace(/×/g, '*').replace(/÷/g, '/').replace(/π/g, 'pi');
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    let m;
    if ((m = /^\d+(?:\.\d+)?(?:e[+-]?\d+)?/.exec(s.slice(i))) && !/^\d+(?:\.\d+)?e[a-z]/i.test(s.slice(i))) { toks.push({ t: 'num', v: parseFloat(m[0]) }); i += m[0].length; continue; }
    if ((m = /^\d+(?:\.\d+)?/.exec(s.slice(i)))) { toks.push({ t: 'num', v: parseFloat(m[0]) }); i += m[0].length; continue; }
    if (SUP.includes(c)) { let j = i; let d = ''; while (j < s.length && SUP.includes(s[j])) d += SUP.indexOf(s[j++]); toks.push({ t: 'op', v: '^' }); toks.push({ t: 'num', v: parseInt(d, 10) }); i = j; continue; }
    if (/[A-Za-z]/.test(c)) {
      m = /^[A-Za-z]+\d*/.exec(s.slice(i))[0];
      // split a run of letters into a known function name, or single letters
      const fn = Object.keys(FUNCS).sort((a, b) => b.length - a.length).find((f) => m.startsWith(f) && /^\(/.test(s.slice(i + f.length).trim()));
      if (fn) { toks.push({ t: 'fn', v: fn }); i += fn.length; continue; }
      if (m.startsWith('pi')) { toks.push({ t: 'id', v: 'pi' }); i += 2; continue; }
      const cm = /^C\d+/.exec(s.slice(i));
      if (cm) { toks.push({ t: 'id', v: cm[0] }); i += cm[0].length; continue; }
      toks.push({ t: 'id', v: c }); i++; continue;
    }
    if ('+-*/^(),|=√'.includes(c)) { toks.push({ t: 'op', v: c }); i++; continue; }
    if (c === '\'' ) { i++; continue; }
    throw new Error('cannot read "' + c + '" in ' + s);
  }
  return toks;
}
export function compile(text) {
  const toks = tokenize(text);
  let p = 0;
  let inAbs = false;
  const peek = () => toks[p];
  const isOp = (v) => peek() && peek().t === 'op' && peek().v === v;
  function expr() {
    let a = term();
    while (isOp('+') || isOp('-')) { const op = toks[p++].v; const b = term(); const x = a; a = op === '+' ? (e) => x(e) + b(e) : (e) => x(e) - b(e); }
    return a;
  }
  function startsAtom() {
    const t = peek();
    return t && (t.t === 'num' || t.t === 'id' || t.t === 'fn' || (t.t === 'op' && (t.v === '(' || t.v === '√' || (t.v === '|' && !inAbs))));
  }
  function term() {
    let a = unary();
    for (;;) {
      if (isOp('*')) { p++; const b = unary(); const x = a; a = (e) => x(e) * b(e); }
      else if (isOp('/')) { p++; const b = unary(); const x = a; a = (e) => x(e) / b(e); }
      else if (startsAtom()) { const b = power(); const x = a; a = (e) => x(e) * b(e); }
      else return a;
    }
  }
  function unary() {
    if (isOp('-')) { p++; const a = unary(); return (e) => -a(e); }
    if (isOp('+')) { p++; return unary(); }
    return power();
  }
  function power() {
    const base = atom();
    if (isOp('^')) { p++; const ex = unary(); return (e) => Math.pow(base(e), ex(e)); }
    return base;
  }
  function atom() {
    const t = toks[p++];
    if (!t) throw new Error('unexpected end');
    if (t.t === 'num') { const v = t.v; return () => v; }
    if (t.t === 'id') {
      const n = t.v;
      if (n === 'pi') return () => Math.PI;
      if (n === 'e') return () => Math.E;
      return (env) => { if (!(n in env)) throw new Error(n + ' is not defined'); return env[n]; };
    }
    if (t.t === 'fn') {
      if (!isOp('(')) throw new Error('( expected after ' + t.v);
      p++;
      const saved = inAbs; inAbs = false;
      const a = expr();
      inAbs = saved;
      if (!isOp(')')) throw new Error(') expected');
      p++;
      const f = FUNCS[t.v];
      return (env) => f(a(env));
    }
    if (t.t === 'op' && t.v === '(') { const saved = inAbs; inAbs = false; const a = expr(); inAbs = saved; if (!isOp(')')) throw new Error(') expected'); p++; return a; }
    if (t.t === 'op' && t.v === '|') { const saved = inAbs; inAbs = true; const a = expr(); inAbs = saved; if (!isOp('|')) throw new Error('| expected'); p++; return (e) => Math.abs(a(e)); }
    if (t.t === 'op' && t.v === '√') { const a = power(); return (e) => Math.sqrt(a(e)); }
    throw new Error('unexpected ' + JSON.stringify(t.v));
  }
  const f = expr();
  if (p < toks.length) throw new Error('unexpected "' + toks[p].v + '"');
  return f;
}
// "lhs = rhs"  ->  function(env) = lhs - rhs
export function compileRelation(text) {
  const i = text.indexOf('=');
  if (i < 0) return compile(text);
  const l = compile(text.slice(0, i)), r = compile(text.slice(i + 1));
  return (e) => l(e) - r(e);
}
