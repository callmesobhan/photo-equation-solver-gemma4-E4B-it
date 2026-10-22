// ======================================================================
// 27. Laplace transforms with unit steps u(t - a) = heaviside(t - a) and impulses delta(t - a) = dirac(t - a): the second shifting
//     theorem in both directions, and initial value problems whose forcing contains such terms (solved with the Laplace transform).
// ======================================================================
const l2IsStep = (f) => f.k === 'f' && f.fn === 'heaviside';
const l2IsImp = (f) => f.k === 'f' && f.fn === 'dirac';
function hasStepOrDelta(e) {
  if (e.k === 'f' && (e.fn === 'heaviside' || e.fn === 'dirac')) return true;
  if (e.k === '+' || e.k === '*') return e.a.some(hasStepOrDelta);
  if (e.k === '^') return hasStepOrDelta(e.b) || hasStepOrDelta(e.e);
  if (e.k === 'f') return e.a.some(hasStepOrDelta);
  return false;
}
const l2HasImpulse = (term, t) => (term.k === '*' ? term.a : [term]).some((f) => (l2IsStep(f) || l2IsImp(f)) && !freeOf(f, t));
/** The argument w t + c of a step or an impulse as { a: the zero, w: the slope }. */
function l2Shift(arg, t, what) {
  const lin = linearIn_(arg, t);
  if (!lin || lin.a1.k !== 'n' || lin.a1.q.isZero()) throw new MathError('the argument of ' + what + ' must be linear in ' + t + ', like ' + t + ' - 2');
  return { a: simp(sDiv(sNeg(lin.a0), lin.a1)), w: lin.a1.q };
}
/** One product term that contains u(t - a) or delta(t - a): c · e^(-a s) ... */
function laplaceImpulseTerm(term, t, s) {
  const fs = term.k === '*' ? term.a : [term];
  const steps = fs.filter((f) => l2IsStep(f) && !freeOf(f, t));
  const dirs = fs.filter((f) => l2IsImp(f) && !freeOf(f, t));
  const rest = fs.filter((f) => !steps.includes(f) && !dirs.includes(f));
  const delay = (a) => sExp(sNeg(sMul([a, sV(s)])));
  if (dirs.length > 1) throw new MathError('a product of two delta functions has no transform');
  if (dirs.length === 1) {
    const { a, w } = l2Shift(dirs[0].a[0], t, 'delta');
    const aNum = a.k === 'n' ? a.q : null;
    if (aNum && aNum.sign() < 0) return S0;
    const val = simp(subsS(sMul(rest.concat(steps)), t, a));
    return sMul([val, sN(w.abs().inv()), delay(a)]);
  }
  const shifts = steps.map((f) => {
    const sh = l2Shift(f.a[0], t, 'u');
    if (sh.w.sign() < 0) throw new MathError('write the step as u(t - a), with t having a positive coefficient');
    return sh.a;
  });
  const live = shifts.filter((a) => !(a.k === 'n' && a.q.sign() <= 0));
  if (live.length > 1 && live.some((a) => a.k !== 'n')) throw new MathError('products of several steps with symbolic positions are not supported');
  const a = live.length ? live.reduce((m, q) => (q.k === 'n' && m.k === 'n' && q.q.sub(m.q).sign() > 0 ? q : m)) : null;
  const base = rest.length ? sMul(rest) : S1;
  if (!a) return laplaceTransformS(base, t, s);
  const shifted = simp(expandS(subsS(base, t, sAdd([sV(t), a]))));
  return sMul([laplaceTransformS(shifted, t, s), delay(a)]);
}

/** Inverse Laplace transform of F(s) that may contain delays e^(-a s) and improper parts (impulses). */
function inverseLaplaceFull(F, s, t) {
  const g = expandS(F);
  const T = sV(t);
  let total = S0;
  const inv = (rat) => {
    const rf = toRFS(rat, s);
    const ap = apartRF(rf);
    let f = S0;
    ap.terms.forEach((tm) => { f = sAdd([f, ilaplaceTerm(tm, s, t)]); });
    let delta = S0;
    ap.poly.forEach((c, i) => {
      if (c.isZero()) return;
      if (i > 0) throw new MathError('a polynomial in s of degree ≥ 1 would give derivatives of the delta function; this is not supported');
      delta = sN(c);
    });
    return { f, delta };
  };
  for (const tm of termsOf(g)) {
    const fs = tm.k === '*' ? tm.a : [tm];
    let delay = S0;
    const cst = [];
    const rat = [];
    for (const f of fs) {
      if (f.k === '^' && isConstE(f.b) && !freeOf(f.e, s)) {
        const lin = linearIn_(f.e, s);
        if (!lin || !zeroS(simp(lin.a0))) throw new MathError('only delays e^(-a s) can be inverted (no e^(s) or other exponents of s)');
        delay = sSub(delay, lin.a1);
      } else if (freeOf(f, s)) cst.push(f);
      else rat.push(f);
    }
    const a = simp(delay);
    const av = varsOfS(a).size ? NaN : numS(a, {});
    if (isNaN(av) || av < 0) throw new MathError('only delays e^(-a s) with a ≥ 0 (a number such as 2 or π) can be inverted');
    const c = cst.length ? sMul(cst) : S1;
    const zeroDelay = Math.abs(av) < 1e-14;
    if (!rat.length) {
      total = sAdd([total, sMul([c, sFn('dirac', [sSub(T, a)])])]);
      continue;
    }
    const { f, delta } = inv(simp(expandS(sMul(rat))));
    let piece = f;
    if (!zeroDelay) piece = sMul([simp(subsS(f, t, sSub(T, a))), sFn('heaviside', [sSub(T, a)])]);
    total = sAdd([total, sMul([c, piece])]);
    if (!isNumVal(delta, 0)) total = sAdd([total, sMul([c, delta, sFn('dirac', [sSub(T, a)])])]);
  }
  return total;
}
/** Does F(s) contain a delay, or is it an improper rational function? Then the plain inverse cannot be used. */
function needsFullInverse(F, s) {
  const has = (e) => {
    if (e.k === '^' && isConstE(e.b) && !freeOf(e.e, s)) return true;
    if (e.k === '+' || e.k === '*') return e.a.some(has);
    if (e.k === '^') return has(e.b) || has(e.e);
    if (e.k === 'f') return e.a.some(has);
    return false;
  };
  if (has(F)) return true;
  try {
    const rf = toRFS(expandS(F), s);
    return rf.n.length >= rf.d.length;
  } catch (e) {
    return false;
  }
}

/** Constant-coefficient linear ODE  sum c_k y^(k) = rhs(x)  with a step / impulse forcing: general solution with C1 = y(0), C2 = y'(0), ... */
function odeViaLaplace(cs, rhs, x, consts) {
  const n = cs.length - 1;
  const sName = x === 's' ? 'p' : 's';
  const Ps = polyToS(cs, sName);
  let ic = S0;
  for (let k = 1; k <= n; k++) {
    for (let j = 0; j < k; j++) ic = sAdd([ic, sMul([sN(cs[k]), sPow(sV(sName), sI(k - 1 - j)), sV('C' + (j + 1))])]);
  }
  for (let j = 0; j < n; j++) consts.push('C' + (j + 1));
  const G = laplaceTransformS(rhs, x, sName);
  const Y = sDiv(sAdd([G, ic]), Ps);
  return { y: simp(expandS(inverseLaplaceFull(Y, sName, x))), Y, sName };
}

// ---- text pre-pass: u(t - 2), H(t - 2), step(t - 2), delta(t - 2) ------------------------------------------------------------------
/** In a Laplace / differential-equation problem u(...), H(...), θ(...) and step(...) are unit steps and δ(...) / delta(...) are impulses. */
function convertStepNotation(s) {
  if (!/[uHθ]\s*\(|step\s*\(|delta\s*\(|δ\s*\(|heaviside|dirac|unitstep/i.test(s)) return s;
  const context = /laplace|['′]|\bd[a-z]\s*\/\s*d[a-z]|\bode\b|differential/i.test(s);
  s = s.replace(/δ\s*\(/g, 'dirac(').replace(/\bdelta\s*\(/gi, context ? 'dirac(' : 'delta(');
  if (context) s = s.replace(/(^|[^A-Za-z])[uHθ]\s*\(/g, '$1heaviside(').replace(/\b(?:step|unitstep)\s*\(/gi, 'heaviside(');
  return s;
}

/** sin(b t + c) and cos(b t + c) with a constant phase c are rewritten with the angle-sum formulas (so that the table applies). */
function expandPhase(e, t) {
  const walk = (x) => {
    if (x.k === 'f' && (x.fn === 'sin' || x.fn === 'cos') && x.a.length === 1 && !freeOf(x.a[0], t)) {
      const lin = linearIn_(x.a[0], t);
      if (lin && !zeroS(simp(lin.a0)) && !zeroS(simp(lin.a1))) {
        const u = simp(sMul([lin.a1, sV(t)]));
        const c = lin.a0;
        return x.fn === 'sin'
          ? sAdd([sMul([sFn('sin', [u]), sFn('cos', [c])]), sMul([sFn('cos', [u]), sFn('sin', [c])])])
          : sSub(sMul([sFn('cos', [u]), sFn('cos', [c])]), sMul([sFn('sin', [u]), sFn('sin', [c])]));
      }
    }
    if (x.k === '+' || x.k === '*' || x.k === '^' || x.k === 'f') return mapS(x, walk);
    return x;
  };
  return walk(e);
}
