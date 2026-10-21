// ======================================================================
// 8c. Complex numbers: exact arithmetic with a + b i (a and b are symbolic reals),
//     polar form, roots, and equations with complex coefficients (degree 1 and 2).
// ======================================================================
const CX_COMMANDS = ['conj', 'conjugate', 're', 'im', 'arg', 'polar', 'cis', 'nthroots', 'croots', 'unityroots', 'rect'];
const cx = (re, im) => ({ re, im });
const CX0 = cx(S0, S0);
const CX1 = cx(S1, S0);
const CXI = cx(S0, S1);
const cxReal = (S) => cx(S, S0);
const exS = (e) => simp(expandS(e));
const zeroS = (e) => e.k === 'n' && e.q.isZero();
const cxIsReal = (z) => zeroS(z.im);
const cAdd = (a, b) => cx(exS(sAdd([a.re, b.re])), exS(sAdd([a.im, b.im])));
const cSub = (a, b) => cx(exS(sSub(a.re, b.re)), exS(sSub(a.im, b.im)));
const cNeg = (a) => cx(sNeg(a.re), sNeg(a.im));
const cConj = (a) => cx(a.re, sNeg(a.im));
const cMul = (a, b) => cx(exS(sSub(sMul([a.re, b.re]), sMul([a.im, b.im]))), exS(sAdd([sMul([a.re, b.im]), sMul([a.im, b.re])])));
const cAbs2 = (a) => exS(sAdd([sMul([a.re, a.re]), sMul([a.im, a.im])]));
function cDiv(a, b) {
  const n2 = cAbs2(b);
  if (zeroS(n2)) throw new MathError('division by zero');
  const t = cMul(a, cConj(b));
  return cx(exS(sDiv(t.re, n2)), exS(sDiv(t.im, n2)));
}
function cAbs(a) {
  if (zeroS(a.im)) return sgnNum(a.re) < 0 ? simp(sNeg(a.re)) : a.re;
  if (zeroS(a.re)) return sgnNum(a.im) < 0 ? simp(sNeg(a.im)) : a.im;
  return simp(sSqrt(cAbs2(a)));
}
const sgnNum = (S) => {
  const v = numS(S, {});
  return v > 1e-12 ? 1 : v < -1e-12 ? -1 : 0;
};

/** Principal argument in (−π, π] as an expression. */
function cArg(a) {
  const sr = sgnNum(a.re);
  const si = sgnNum(a.im);
  if (si === 0) {
    if (sr === 0) throw new MathError('the argument of 0 is undefined');
    return sr > 0 ? S0 : S_PI;
  }
  if (sr === 0) return si > 0 ? sMul([sN(new Q(1n, 2n)), S_PI]) : sMul([sN(new Q(-1n, 2n)), S_PI]);
  const th = Math.atan2(numS(a.im, {}), numS(a.re, {}));
  const fr = toFraction(th / Math.PI, 24);
  if (fr && Math.abs(th - (fr.p / fr.q) * Math.PI) < 1e-12) return sMul([sN(new Q(BigInt(fr.p), BigInt(fr.q))), S_PI]);
  const at = sFn('atan', [exS(sDiv(a.im, a.re))]);
  if (sr > 0) return at;
  return si > 0 ? sAdd([at, S_PI]) : sSub(at, S_PI);
}
const cCis = (theta) => cx(sFn('cos', [theta]), sFn('sin', [theta]));
function cExp(a) {
  const m = sExp(a.re);
  const c = cCis(a.im);
  return cx(exS(sMul([m, c.re])), exS(sMul([m, c.im])));
}
function cLn(a) {
  if (zeroS(a.re) && zeroS(a.im)) throw new MathError('ln(0) is undefined');
  return cx(sFn('ln', [cAbs(a)]), cArg(a));
}
function cSqrt(a) {
  if (cxIsReal(a)) {
    const s = sgnNum(a.re);
    return s >= 0 ? cxReal(simp(sSqrt(a.re))) : cx(S0, simp(sSqrt(sNeg(a.re))));
  }
  const m = cAbs(a);
  const x = simp(sSqrt(exS(half(sAdd([m, a.re])))));
  const y = simp(sSqrt(exS(half(sSub(m, a.re)))));
  return cx(x, sgnNum(a.im) < 0 ? sNeg(y) : y);
}
function cPowInt(a, n) {
  if (n < 0) return cDiv(CX1, cPowInt(a, -n));
  let result = CX1;
  let base = a;
  let e = n;
  while (e > 0) {
    if (e & 1) result = cMul(result, base);
    e >>= 1;
    if (e) base = cMul(base, base);
  }
  return result;
}
function cPow(a, w) {
  if (cxIsReal(w) && w.re.k === 'n' && w.re.q.isInt() && w.re.q.n >= -400n && w.re.q.n <= 400n) return cPowInt(a, Number(w.re.q.n));
  if (cxIsReal(a) && cxIsReal(w) && sgnNum(a.re) > 0) return cxReal(simp(sPow(a.re, w.re)));
  if (zeroS(a.re) && zeroS(a.im)) {
    if (cxIsReal(w) && sgnNum(w.re) > 0) return CX0;
    throw new MathError('0 cannot be raised to this power');
  }
  if (cxIsReal(w) && w.re.k === 'n' && w.re.q.eq(new Q(1n, 2n))) return cSqrt(a);
  if (cxIsReal(w) && w.re.k === 'n') {
    // z^(p/q) = |z|^(p/q) · cis(p/q · arg z): the principal value
    const r = simp(sPow(cAbs(a), w.re));
    const c = cCis(exS(sMul([w.re, cArg(a)])));
    return cx(exS(sMul([r, c.re])), exS(sMul([r, c.im])));
  }
  return cExp(cMul(w, cLn(a)));
}
const cSin = (a) => cx(exS(sMul([sFn('sin', [a.re]), sFn('cosh', [a.im])])), exS(sMul([sFn('cos', [a.re]), sFn('sinh', [a.im])])));
const cCos = (a) => cx(exS(sMul([sFn('cos', [a.re]), sFn('cosh', [a.im])])), exS(sNeg(sMul([sFn('sin', [a.re]), sFn('sinh', [a.im])]))));
const cSinh = (a) => cx(exS(sMul([sFn('sinh', [a.re]), sFn('cos', [a.im])])), exS(sMul([sFn('cosh', [a.re]), sFn('sin', [a.im])])));
const cCosh = (a) => cx(exS(sMul([sFn('cosh', [a.re]), sFn('cos', [a.im])])), exS(sMul([sFn('sinh', [a.re]), sFn('sin', [a.im])])));

// ---- polynomials in one variable with complex coefficients ---------------------------------------------------
const cpConst = (z) => [z];
function cpTrim(p) {
  const r = p.slice();
  while (r.length > 1 && zeroS(r[r.length - 1].re) && zeroS(r[r.length - 1].im)) r.pop();
  return r;
}
function cpAdd(p, q, sign) {
  const n = Math.max(p.length, q.length);
  return cpTrim(Array.from({ length: n }, (_, k) => {
    const a = p[k] || CX0;
    const b = q[k] || CX0;
    return sign > 0 ? cAdd(a, b) : cSub(a, b);
  }));
}
function cpMul(p, q) {
  const r = Array.from({ length: p.length + q.length - 1 }, () => CX0);
  p.forEach((a, i) => q.forEach((b, j) => { r[i + j] = cAdd(r[i + j], cMul(a, b)); }));
  return cpTrim(r);
}
const isConstCP = (p) => p.length === 1;

const CX_FN_ARITY = { sqrt: 1, cbrt: 1, exp: 1, ln: 1, abs: 1, sin: 1, cos: 1, tan: 1, sinh: 1, cosh: 1, tanh: 1, conj: 1, conjugate: 1, re: 1, im: 1, arg: 1, cis: 1 };
function cpEval(n, v) {
  switch (n.t) {
    case 'num': return cpConst(cxReal(sN(n.q)));
    case 'var':
      if (n.name === v) return [CX0, CX1];
      if (n.name === 'i') return cpConst(CXI);
      throw new MathError('the unknown ' + n.name + ' cannot be used here');
    case 'const':
      if (n.name === 'oo') throw new MathError('infinity cannot be used here');
      return cpConst(cxReal(sC(n.name)));
    case 'neg': return cpEval(n.a, v).map(cNeg);
    case 'pct': return cpEval(n.a, v).map((c) => cMul(c, cxReal(sN(new Q(1n, 100n)))));
    case 'fact': {
      const a = cpEval(n.a, v);
      if (isConstCP(a) && cxIsReal(a[0]) && a[0].re.k === 'n' && a[0].re.q.isInt() && a[0].re.q.sign() >= 0 && a[0].re.q.n <= 400n) {
        let r = 1n;
        for (let k = 2n; k <= a[0].re.q.n; k++) r *= k;
        return cpConst(cxReal(sN(new Q(r))));
      }
      throw new MathError('a factorial needs a whole number');
    }
    case 'bin': {
      const a = cpEval(n.a, v);
      const b = cpEval(n.b, v);
      switch (n.op) {
        case '+': return cpAdd(a, b, 1);
        case '-': return cpAdd(a, b, -1);
        case '*': return cpMul(a, b);
        case '/':
          if (!isConstCP(b)) throw new MathError('dividing by an expression with the unknown is not supported for complex numbers');
          return a.map((c) => cDiv(c, b[0]));
        default: {
          if (!isConstCP(b)) throw new MathError('the unknown cannot be in an exponent here');
          if (isConstCP(a)) return cpConst(cPow(a[0], b[0]));
          if (cxIsReal(b[0]) && b[0].re.k === 'n' && b[0].re.q.isInt() && b[0].re.q.sign() >= 0 && b[0].re.q.n <= 12n) {
            let r = [CX1];
            for (let k = 0; k < Number(b[0].re.q.n); k++) r = cpMul(r, a);
            return r;
          }
          throw new MathError('powers of the unknown must be whole numbers from 0 to 12');
        }
      }
    }
    case 'call': {
      const args = n.args.map((x) => cpEval(x, v));
      if (args.some((p) => !isConstCP(p))) throw new MathError('functions of the unknown are not supported with complex numbers');
      const z = args[0] && args[0][0];
      const fn = n.fn;
      if (!z) throw new MathError(fn + ' needs an argument');
      switch (fn) {
        case 'sqrt': return cpConst(cSqrt(z));
        case 'cbrt': return cpConst(cPow(z, cxReal(sN(new Q(1n, 3n)))));
        case 'root': return cpConst(cPow(args[1][0], cDiv(CX1, z)));
        case 'exp': return cpConst(cExp(z));
        case 'ln': return cpConst(cLn(z));
        case 'log': return cpConst(args.length > 1 ? cDiv(cLn(z), cLn(args[1][0])) : cDiv(cLn(z), cxReal(sFn('ln', [sI(10)]))));
        case 'log10': return cpConst(cDiv(cLn(z), cxReal(sFn('ln', [sI(10)]))));
        case 'log2': return cpConst(cDiv(cLn(z), cxReal(sFn('ln', [sI(2)]))));
        case 'abs': return cpConst(cxReal(cAbs(z)));
        case 'sin': return cpConst(cSin(z));
        case 'cos': return cpConst(cCos(z));
        case 'tan': return cpConst(cDiv(cSin(z), cCos(z)));
        case 'sinh': return cpConst(cSinh(z));
        case 'cosh': return cpConst(cCosh(z));
        case 'tanh': return cpConst(cDiv(cSinh(z), cCosh(z)));
        case 'conj': case 'conjugate': return cpConst(cConj(z));
        case 're': return cpConst(cxReal(z.re));
        case 'im': return cpConst(cxReal(z.im));
        case 'arg': return cpConst(cxReal(cArg(z)));
        case 'cis': return cpConst(cCis(z.re));
        default: throw new MathError('"' + fn + '" cannot be used with complex numbers');
      }
    }
    default: throw new MathError('this cannot be used with complex numbers');
  }
}

// ---- presentation -----------------------------------------------------------------------------------------------
function imagTerm(coef) {
  const t = fmtS(coef);
  if (t === '1') return 'i';
  if (/^[0-9]+$/.test(t) || /^[a-zA-Zπ]$/.test(t)) return t + 'i';
  if (!/[\s/]/.test(t)) return t + '·i';
  return '(' + t + ')i';
}
function cxText(z) {
  const imZ = zeroS(z.im);
  const reZ = zeroS(z.re);
  if (imZ) return fmtS(z.re);
  const neg = sgnNum(z.im) < 0;
  const imT = imagTerm(neg ? exS(sNeg(z.im)) : z.im);
  if (reZ) return (neg ? '-' : '') + imT;
  return fmtS(z.re) + (neg ? ' - ' : ' + ') + imT;
}
function cxApprox(z) {
  const a = numS(z.re, {});
  const b = numS(z.im, {});
  if (!isFinite(a) || !isFinite(b)) return '';
  if (Math.abs(b) < 1e-13) return fmtNum(a);
  const bt = Math.abs(Math.abs(b) - 1) < 1e-13 ? '' : fmtNum(Math.abs(b));
  return (Math.abs(a) < 1e-13 ? '' : fmtNum(a) + (b < 0 ? ' - ' : ' + ')) + (Math.abs(a) < 1e-13 && b < 0 ? '-' : '') + bt + 'i';
}
/** Exact text, followed by a decimal version unless both parts are whole numbers or simple fractions. */
function cxLabel(z) {
  const t = cxText(z);
  const exactRational = z.re.k === 'n' && z.im.k === 'n' && z.re.q.isInt() && z.im.q.isInt();
  if (exactRational) return t;
  let ap = '';
  try {
    ap = cxApprox(z);
  } catch (e) {
    ap = '';
  }
  if (!ap || ap === t) return t;
  const bothRational = z.re.k === 'n' && z.im.k === 'n';
  return t + (bothRational ? ' (= ' : ' (≈ ') + ap + ')';
}
function polarWork(z) {
  const r = cAbs(z);
  const th = cArg(z);
  const deg = (numS(th, {}) * 180) / Math.PI;
  return 'Modulus |z| = ' + symText(r) + ';  argument = ' + symText(th) + ' rad (' + fmtNum(deg) + '°)';
}
function showComplexResult(z, out) {
  out.answer.push(cxLabel(z));
  if (!cxIsReal(z)) {
    try {
      out.work.push(polarWork(z));
    } catch (e) {
      // no polar form for 0
    }
  }
  out.value = cxIsReal(z) ? { S: z.re } : undefined;
  if (!out.value) delete out.value;
  return out;
}

// ---- roots ------------------------------------------------------------------------------------------------------------------
function nthRoots(z, k) {
  if (k < 1 || k > 64) throw new MathError('the root order must be between 1 and 64');
  if (zeroS(z.re) && zeroS(z.im)) return [CX0];
  const r = simp(sPow(cAbs(z), sN(new Q(1n, BigInt(k)))));
  const th = cArg(z);
  const roots = [];
  for (let j = 0; j < k; j++) {
    const phi = exS(sDiv(sAdd([th, sMul([sI(2 * j), S_PI])]), sI(k)));
    const c = cCis(phi);
    roots.push(cx(exS(sMul([r, c.re])), exS(sMul([r, c.im]))));
  }
  return roots;
}
function constArg(n) {
  const p = cpEval(n, null);
  if (!isConstCP(p)) throw new MathError('a number is needed here');
  return p[0];
}
function rootsOut(roots, label) {
  const out = newOut();
  roots.forEach((r, j) => out.answer.push((label || 'z') + (roots.length > 1 ? '_' + j : '') + ' = ' + cxLabel(r)));
  return out;
}
defCmd('conj conjugate', (n) => {
  needArgs(n, 1, 1, 'one complex number');
  const out = newOut();
  return showComplexResult(cConj(constArg(n.args[0])), out);
});
defCmd('re', (n) => {
  needArgs(n, 1, 1, 'one complex number');
  return showComplexResult(cxReal(constArg(n.args[0]).re), newOut());
});
defCmd('im', (n) => {
  needArgs(n, 1, 1, 'one complex number');
  return showComplexResult(cxReal(constArg(n.args[0]).im), newOut());
});
defCmd('arg', (n) => {
  needArgs(n, 1, 1, 'one complex number');
  const th = cArg(constArg(n.args[0]));
  const out = newOut();
  out.answer.push(symText(th) + ' rad (' + fmtNum((numS(th, {}) * 180) / Math.PI) + '°)');
  out.value = { S: th };
  return out;
});
defCmd('cis', (n) => {
  needArgs(n, 1, 1, 'an angle in radians');
  return showComplexResult(cCis(constArg(n.args[0]).re), newOut());
});
defCmd('rect', (n) => {
  needArgs(n, 2, 2, 'the modulus r and the angle θ in radians');
  const r = constArg(n.args[0]).re;
  const c = cCis(constArg(n.args[1]).re);
  return showComplexResult(cx(exS(sMul([r, c.re])), exS(sMul([r, c.im]))), newOut());
});
defCmd('polar', (n) => {
  needArgs(n, 1, 1, 'one complex number');
  const z = constArg(n.args[0]);
  const out = newOut();
  const r = cAbs(z);
  const th = cArg(z);
  const deg = (numS(th, {}) * 180) / Math.PI;
  out.answer.push('z = ' + fmtS(r) + '·(cos θ + i sin θ)  with θ = ' + fmtS(th) + ' rad (' + fmtNum(deg) + '°)');
  out.answer.push('z = ' + fmtS(r) + '·e^(iθ)');
  out.work.push('Modulus ≈ ' + fmtNum(numS(r, {})) + ',  argument ≈ ' + fmtNum(numS(th, {})) + ' rad');
  out.work.push('Rectangular form: ' + cxLabel(z));
  return out;
});
defCmd('nthroots croots', (n) => {
  needArgs(n, 2, 2, 'a complex number and the order n');
  const z = constArg(n.args[0]);
  const k = Number(intArg(n.args[1]));
  const out = rootsOut(nthRoots(z, k));
  out.work.push('The ' + k + ' roots of ' + cxText(z) + ' are equally spaced on a circle of radius |z|^(1/' + k + ')');
  return out;
});
defCmd('unityroots', (n) => {
  needArgs(n, 1, 1, 'the order n');
  const k = Number(intArg(n.args[0]));
  const out = rootsOut(nthRoots(CX1, k), 'ω');
  out.work.push('The ' + k + ' solutions of z^' + k + ' = 1');
  return out;
});

// ---- dispatch -----------------------------------------------------------------------------------------------------------------
function commandsIn(n, acc) {
  if (!n || typeof n !== 'object') return acc;
  if (n.t === 'call') {
    if (n.cmd) acc.push(n.fn);
    n.args.forEach((a) => commandsIn(a, acc));
  } else if (n.t === 'list') n.items.forEach((a) => commandsIn(a, acc));
  else {
    commandsIn(n.a, acc);
    commandsIn(n.b, acc);
  }
  return acc;
}
function nodeOf(st) {
  return st.kind === 'expr' ? [st.node] : st.kind === 'eq' ? [st.lhs, st.rhs] : [];
}
/** Statements that use i (the imaginary unit) or complex commands, with no other kind of command. */
function wantsComplex(sts) {
  if (!sts.length) return false;
  if (!sts.every((s) => s.kind === 'expr' || s.kind === 'eq')) return false;
  let hasI = false;
  let hasCxFn = false;
  for (const st of sts) {
    for (const nd of nodeOf(st)) {
      const cmds = commandsIn(nd, []);
      if (cmds.some((c) => !CX_COMMANDS.includes(c))) return false;
      if (cmds.length) hasCxFn = true;
      const vars = collectVars(nd, new Set());
      if (vars.has('i')) hasI = true;
    }
  }
  return hasI || hasCxFn;
}

function solveComplexEquation(st) {
  const vars = new Set();
  collectVars(st.lhs, vars);
  collectVars(st.rhs, vars);
  vars.delete('i');
  if (vars.size !== 1) throw new MathError('complex equations need exactly one unknown besides i');
  const v = Array.from(vars)[0];
  const f = cpAdd(cpEval(st.lhs, v), cpEval(st.rhs, v), -1);
  const out = newOut();
  const deg = f.length - 1;
  const text = (z) => v + ' = ' + cxLabel(z);
  if (deg === 0) {
    out.answer.push(zeroS(f[0].re) && zeroS(f[0].im) ? 'every complex number is a solution' : 'no solution');
    return out;
  }
  if (deg === 1) {
    const z = cDiv(cNeg(f[0]), f[1]);
    out.answer.push(text(z));
    out.work.push('Type: linear equation with complex numbers: ' + v + ' = −(constant term)/(coefficient of ' + v + ')');
    const chk = cAdd(cMul(f[1], z), f[0]);
    if (Math.abs(numS(chk.re, {})) < 1e-9 && Math.abs(numS(chk.im, {})) < 1e-9) out.check = 'substituting back gives 0';
    return out;
  }
  if (deg === 2) {
    const [c, b, a] = f;
    const disc = cSub(cMul(b, b), cMul(cx(sI(4), S0), cMul(a, c)));
    const sq = cSqrt(disc);
    const two = cMul(cx(sI(2), S0), a);
    const z1 = cDiv(cAdd(cNeg(b), sq), two);
    const z2 = cDiv(cSub(cNeg(b), sq), two);
    out.answer.push(text(z1));
    if (!(zeroS(exS(sSub(z1.re, z2.re))) && zeroS(exS(sSub(z1.im, z2.im))))) out.answer.push(text(z2));
    out.work.push('Type: quadratic equation with complex coefficients');
    out.work.push('Discriminant b² − 4ac = ' + cxText(disc));
    const ok = [z1, z2].every((z) => {
      const r = cAdd(cAdd(cMul(a, cMul(z, z)), cMul(b, z)), c);
      return Math.abs(numS(r.re, {})) < 1e-8 && Math.abs(numS(r.im, {})) < 1e-8;
    });
    if (ok) out.check = 'substituting each solution back gives 0';
    return out;
  }
  throw new MathError('complex equations of degree ' + deg + ' are not supported (degree 1 and 2 are)');
}

function tryComplex(sts, force) {
  if (!force && !wantsComplex(sts)) return null;
  if (force && !sts.every((s) => s.kind === 'expr')) return null;
  const readAs = sts.map(showStatement).join(';  ');
  if (sts[0].kind === 'eq') {
    if (sts.length > 1) throw new MathError('one complex equation at a time, please');
    return { readAs, out: solveComplexEquation(sts[0]) };
  }
  const out = newOut();
  const evalOne = (nd) => {
    const top = nd.t === 'call' && nd.cmd ? nd.fn : '';
    if (top === 'polar' || top === 'nthroots' || top === 'croots' || top === 'unityroots') return { cmd: COMMANDS[top](nd) };
    const p = cpEval(nd, null);
    return { z: p[0] };
  };
  if (sts.length === 1) {
    const r = evalOne(sts[0].node);
    if (r.cmd) return { readAs, out: r.cmd };
    out.work.push('Type: complex-number arithmetic (exact; i² = −1)');
    return { readAs, out: showComplexResult(r.z, out) };
  }
  sts.forEach((st) => {
    const r = evalOne(st.node);
    out.answer.push(showRaw(st.node) + ' = ' + (r.cmd ? r.cmd.answer.join('; ') : cxLabel(r.z)));
  });
  out.work.push('Type: complex-number arithmetic (exact; i² = −1)');
  return { readAs, out };
}
