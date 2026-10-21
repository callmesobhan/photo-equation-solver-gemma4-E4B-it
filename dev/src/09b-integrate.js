
// ======================================================================
// 9b. Symbolic integration (antiderivatives)
//     table + linear substitution, polynomials, rational functions (partial fractions),
//     exp*trig, trig powers/products, sqrt of quadratics, u-substitution, integration by parts.
//     Every answer is verified by differentiating it and comparing with the integrand.
// ======================================================================
let FRESH_N = 0;
const freshVar = () => '$u' + ++FRESH_N;
const FRESH = '$u'; // used by sums and other callers that substitute once
class GiveUp extends Error {}
let IB = { steps: 0, deadline: 0 };
function tick() {
  if (++IB.steps > 4000 || Date.now() > IB.deadline) throw new GiveUp('budget');
}

function replaceS(e, k, rep) {
  if (key(e) === k) return rep;
  if (e.k === '+' || e.k === '*' || e.k === '^' || e.k === 'f') return mapS(e, (t) => replaceS(t, k, rep));
  return e;
}
/** Replace u by W; if u = b^(L(x)), also b^(r*L(x)) -> W^r. */
function replaceExpS(e, u, W, x) {
  if (key(e) === key(u)) return W;
  if (e.k === '^' && u.k === '^' && key(e.b) === key(u.b) && freeOf(u.b, x) && !freeOf(e.e, x)) {
    const ratio = simp(sDiv(e.e, u.e));
    if (freeOf(ratio, x)) return sPow(W, ratio);
  }
  if (e.k === '+' || e.k === '*' || e.k === '^' || e.k === 'f') return mapS(e, (t) => replaceExpS(t, u, W, x));
  return e;
}
/** u = a*x + b with a, b free of x  ->  {a, b}; else null */
function linearIn(u, x) {
  if (freeOf(u, x)) return null;
  const c = polyCoeffsS(u, x);
  if (!c || c.length !== 2) return null;
  return { a: c[1], b: c[0] };
}
const sLnAbs = (u) => sFn('ln', [sFn('abs', [u])]);
const verifyAnti = (F, f, x) => {
  try {
    return sameFunction(diffS(F, x), f);
  } catch (e) {
    return false;
  }
};

// ---- method: table of standard integrals with a linear inner function -----------------------------
function mTable(f, x) {
  if (f.k === 'f' && f.a.length === 1) {
    const u = f.a[0];
    const L = linearIn(u, x);
    if (!L) return null;
    let F;
    switch (f.fn) {
      case 'sin': F = sNeg(sFn('cos', [u])); break;
      case 'cos': F = sFn('sin', [u]); break;
      case 'tan': F = sNeg(sLnAbs(sFn('cos', [u]))); break;
      case 'cot': F = sLnAbs(sFn('sin', [u])); break;
      case 'sec': F = sLnAbs(sAdd([sFn('sec', [u]), sFn('tan', [u])])); break;
      case 'csc': F = sNeg(sLnAbs(sAdd([sFn('csc', [u]), sFn('cot', [u])]))); break;
      case 'sinh': F = sFn('cosh', [u]); break;
      case 'cosh': F = sFn('sinh', [u]); break;
      case 'tanh': F = sFn('ln', [sFn('cosh', [u])]); break;
      case 'ln': F = sSub(sMul([u, sFn('ln', [u])]), u); break;
      case 'asin': F = sAdd([sMul([u, sFn('asin', [u])]), sSqrt(sSub(S1, sPow(u, sI(2))))]); break;
      case 'acos': F = sSub(sMul([u, sFn('acos', [u])]), sSqrt(sSub(S1, sPow(u, sI(2))))); break;
      case 'atan': F = sSub(sMul([u, sFn('atan', [u])]), half(sFn('ln', [sAdd([S1, sPow(u, sI(2))])]))); break;
      case 'abs': F = half(sMul([u, sFn('abs', [u])])); break;
      case 'erf': F = sAdd([sMul([u, sFn('erf', [u])]), sDiv(sExp(sNeg(sPow(u, sI(2)))), sSqrt(S_PI))]); break;
      default: return null;
    }
    return sDiv(F, L.a);
  }
  if (f.k === '^') {
    const { b, e } = f;
    if (freeOf(e, x)) {
      const L = linearIn(b, x);
      if (L && e.k === 'n') {
        if (e.q.eq(qInt(-1))) return sDiv(sLnAbs(b), L.a);
        return sDiv(sPow(b, sAdd([e, S1])), sMul([L.a, sAdd([e, S1])]));
      }
      if (b.k === 'f' && b.a.length === 1 && e.k === 'n' && e.q.isInt()) {
        const u = b.a[0];
        const L2 = linearIn(u, x);
        if (L2) {
          const m = Number(e.q.n);
          let F = null;
          if (b.fn === 'cos' && m === -2) F = sFn('tan', [u]);
          else if (b.fn === 'sin' && m === -2) F = sNeg(sFn('cot', [u]));
          else if (b.fn === 'cosh' && m === -2) F = sFn('tanh', [u]);
          else if (b.fn === 'cos' && m === -1) F = sLnAbs(sAdd([sFn('sec', [u]), sFn('tan', [u])]));
          else if (b.fn === 'sin' && m === -1) F = sNeg(sLnAbs(sAdd([sFn('csc', [u]), sFn('cot', [u])])));
          if (F) return sDiv(F, L2.a);
        }
      }
    }
    if (freeOf(b, x) && !freeOf(e, x)) {
      const L = linearIn(e, x);
      if (L) return sDiv(f, sMul([L.a, isConstE(b) ? S1 : sFn('ln', [b])]));
    }
  }
  if (f.k === '*' && f.a.length === 2) {
    const [p, q] = f.a;
    const fnOf = (t, name) => (t.k === 'f' && t.fn === name && t.a.length === 1 ? t.a[0] : null);
    for (const [A, B] of [[p, q], [q, p]]) {
      const us = fnOf(A, 'sec');
      const ut = fnOf(B, 'tan');
      if (us && ut && key(us) === key(ut)) {
        const L = linearIn(us, x);
        if (L) return sDiv(sFn('sec', [us]), L.a);
      }
      const uc = fnOf(A, 'csc');
      const uo = fnOf(B, 'cot');
      if (uc && uo && key(uc) === key(uo)) {
        const L = linearIn(uc, x);
        if (L) return sNeg(sDiv(sFn('csc', [uc]), L.a));
      }
    }
  }
  return null;
}

// ---- method: polynomials -----------------------------------------------------------------------------
function mPoly(f, x) {
  const c = polyCoeffsS(f, x);
  if (!c) return null;
  return sAdd(c.map((co, k) => sMul([co, sPow(sV(x), sI(k + 1)), sN(new Q(1n, BigInt(k + 1)))])));
}

// ---- method: rational functions (partial fractions) ----------------------------------------------------
function integrateRationalTerm(t, x) {
  const fac = t.fac;
  const k = t.power;
  if (fac.length === 2) {
    const a = fac[1];
    const c = t.num[0] || Q0;
    const u = polyToS(fac, x);
    if (k === 1) return sMul([sN(c.div(a)), sLnAbs(u)]);
    return sMul([sN(c.div(a).div(qInt(1 - k))), sPow(u, sI(1 - k))]);
  }
  if (fac.length === 3) {
    const a = fac[2];
    const b = fac[1];
    const c0 = fac[0];
    const n1 = t.num[1] || Q0;
    const n0 = t.num[0] || Q0;
    const h = b.div(a.mul(qInt(2)));
    const D = c0.div(a).sub(h.mul(h));
    if (D.sign() <= 0) return null;
    const U = sAdd([sV(x), sN(h)]);
    const m = n0.sub(n1.mul(h));
    const s = sSqrt(sN(D));
    const W = sAdd([sPow(U, sI(2)), sN(D)]);
    const q = polyToS(fac, x);
    let total = S0;
    if (!n1.isZero()) {
      total = sAdd([total, k === 1
        ? sMul([sN(n1.div(a.mul(qInt(2)))), sFn('ln', [q])])
        : sMul([sN(n1.div(a.mul(qInt(2)).mul(qInt(1 - k)))), sPow(q, sI(1 - k))])]);
    }
    if (!m.isZero()) {
      const J = (kk) => {
        if (kk === 1) return sDiv(sFn('atan', [sDiv(U, s)]), s);
        const den = D.mul(qInt(2 * (kk - 1)));
        return sAdd([sMul([U, sPow(W, sI(1 - kk)), sN(den.inv())]), sMul([sN(qInt(2 * kk - 3).div(den)), J(kk - 1)])]);
      };
      total = sAdd([total, sMul([sN(m), sPow(sN(a), sI(-k)), J(k)])]);
    }
    return total;
  }
  return null;
}
function mRational(f, x) {
  let r;
  try {
    r = toRFS(f, x);
  } catch (e) {
    if (e instanceof NotAlgebraic) return null;
    throw e;
  }
  if (r.d.length === 1) return null;
  let ap;
  try {
    ap = apartRF(r);
  } catch (e) {
    return null;
  }
  const parts = [];
  if (ap.poly.length) parts.push(mPoly(polyToS(ap.poly, x), x));
  for (const t of ap.terms) {
    const g = integrateRationalTerm(t, x);
    if (!g) return null;
    parts.push(g);
  }
  return sAdd(parts);
}

// ---- method: e^(px) * sin/cos(qx) -------------------------------------------------------------------------
function mExpTrig(f, x) {
  if (f.k !== '*' || f.a.length !== 2) return null;
  let ex = null;
  let tr = null;
  for (const t of f.a) {
    if (t.k === '^' && freeOf(t.b, x) && !freeOf(t.e, x) && linearIn(t.e, x)) ex = t;
    else if (t.k === 'f' && (t.fn === 'sin' || t.fn === 'cos') && linearIn(t.a[0], x)) tr = t;
  }
  if (!ex || !tr) return null;
  const lnb = isConstE(ex.b) ? S1 : sFn('ln', [ex.b]);
  const al = sMul([linearIn(ex.e, x).a, lnb]);
  const be = linearIn(tr.a[0], x).a;
  const den = sAdd([sPow(al, sI(2)), sPow(be, sI(2))]);
  const u = tr.a[0];
  const num = tr.fn === 'sin'
    ? sSub(sMul([al, sFn('sin', [u])]), sMul([be, sFn('cos', [u])]))
    : sAdd([sMul([al, sFn('cos', [u])]), sMul([be, sFn('sin', [u])])]);
  return sDiv(sMul([ex, num]), den);
}

// ---- method: trigonometric powers and products --------------------------------------------------------------
function trigParts(f, x) {
  // f = c * prod of sin/cos/tan/cot/sec/csc(u)^n with ONE common linear argument -> {u, m, n, coef}
  const fs = f.k === '*' ? f.a : [f];
  let u = null;
  let m = 0;
  let n = 0;
  const rest = [];
  const NAMES = { sin: [1, 0], cos: [0, 1], tan: [1, -1], cot: [-1, 1], sec: [0, -1], csc: [-1, 0] };
  for (const t of fs) {
    let base = t;
    let e = 1;
    if (t.k === '^' && t.e.k === 'n' && t.e.q.isInt()) {
      base = t.b;
      e = Number(t.e.q.n);
    }
    if (base.k === 'f' && NAMES[base.fn] && base.a.length === 1) {
      const arg = base.a[0];
      if (u && key(u) !== key(arg)) return null;
      u = arg;
      m += NAMES[base.fn][0] * e;
      n += NAMES[base.fn][1] * e;
    } else if (freeOf(t, x)) rest.push(t);
    else return null;
  }
  if (!u || !linearIn(u, x)) return null;
  return { u, m, n, coef: sMul(rest), a: linearIn(u, x).a };
}
function mTrig(f, x, depth) {
  const tp = trigParts(f, x);
  if (tp) {
    const { u, m, n, coef, a } = tp;
    const FV = freshVar();
    const W = sV(FV);
    const finish = (G, back) => sDiv(sMul([coef, subsS(G, FV, back)]), a);
    const integ = (e) => integrateS(e, FV, depth + 1);
    if (m % 2 !== 0 && m > 0) {
      // w = cos u :  -∫ (1-w^2)^((m-1)/2) w^n dw
      const G = integ(sNeg(sMul([sPow(sSub(S1, sPow(W, sI(2))), sI((m - 1) / 2)), sPow(W, sI(n))])));
      return G && finish(G, sFn('cos', [u]));
    }
    if (n % 2 !== 0 && n > 0) {
      const G = integ(sMul([sPow(W, sI(m)), sPow(sSub(S1, sPow(W, sI(2))), sI((n - 1) / 2))]));
      return G && finish(G, sFn('sin', [u]));
    }
    if (m >= 0 && n >= 0 && m % 2 === 0 && n % 2 === 0 && m + n > 0) {
      const C = sFn('cos', [sMul([sI(2), u])]);
      const e = expandS(sMul([sPow(half(sSub(S1, C)), sI(m / 2)), sPow(half(sAdd([S1, C])), sI(n / 2)), coef]));
      const G = integrateS(e, x, depth + 1);
      return G;
    }
    if ((m + n) % 2 === 0 && m + n < 0) {
      // w = tan u :  ∫ w^m (1+w^2)^(-(m+n)/2 - 1) dw
      const G = integ(sMul([sPow(W, sI(m)), sPow(sAdd([S1, sPow(W, sI(2))]), sI(-(m + n) / 2 - 1))]));
      return G && finish(G, sFn('tan', [u]));
    }
    if (m + n === 0 && m >= 2) {
      const tan = sFn('tan', [u]);
      const prev = integrateS(sMul([coef, sPow(tan, sI(m - 2))]), x, depth + 1);
      if (!prev) return null;
      return sSub(sDiv(sMul([coef, sPow(tan, sI(m - 1))]), sMul([a, sI(m - 1)])), prev);
    }
    if (m + n === 0 && m <= -2) {
      const k = -m;
      const cot = sFn('cot', [u]);
      const prev = integrateS(sMul([coef, sPow(cot, sI(k - 2))]), x, depth + 1);
      if (!prev) return null;
      return sSub(sNeg(sDiv(sMul([coef, sPow(cot, sI(k - 1))]), sMul([a, sI(k - 1)]))), prev);
    }
    // reduction formulas for sec^k and csc^k (odd k >= 3)
    if (m === 0 && n <= -3) {
      const k = -n;
      const sec = sFn('sec', [u]);
      const tan = sFn('tan', [u]);
      const prev = integrateS(sMul([coef, sPow(sec, sI(k - 2))]), x, depth + 1);
      if (!prev) return null;
      return sAdd([sDiv(sMul([coef, sPow(sec, sI(k - 2)), tan]), sMul([a, sI(k - 1)])), sMul([sN(new Q(BigInt(k - 2), BigInt(k - 1))), prev])]);
    }
    if (n === 0 && m <= -3) {
      const k = -m;
      const csc = sFn('csc', [u]);
      const cot = sFn('cot', [u]);
      const prev = integrateS(sMul([coef, sPow(csc, sI(k - 2))]), x, depth + 1);
      if (!prev) return null;
      return sAdd([sNeg(sDiv(sMul([coef, sPow(csc, sI(k - 2)), cot]), sMul([a, sI(k - 1)]))), sMul([sN(new Q(BigInt(k - 2), BigInt(k - 1))), prev])]);
    }
    return null;
  }
  // products with different arguments: sin(p)cos(q), sin(p)sin(q), cos(p)cos(q)
  if (f.k === '*') {
    const trig = f.a.filter((t) => t.k === 'f' && (t.fn === 'sin' || t.fn === 'cos') && linearIn(t.a[0], x));
    const others = f.a.filter((t) => !trig.includes(t));
    if (trig.length === 2 && others.every((t) => freeOf(t, x)) && key(trig[0].a[0]) !== key(trig[1].a[0])) {
      const [A, B] = trig;
      const p = A.a[0];
      const q = B.a[0];
      const sumA = sAdd([p, q]);
      const difA = sSub(p, q);
      let e;
      if (A.fn === 'sin' && B.fn === 'cos') e = half(sAdd([sFn('sin', [sumA]), sFn('sin', [difA])]));
      else if (A.fn === 'cos' && B.fn === 'sin') e = half(sSub(sFn('sin', [sumA]), sFn('sin', [difA])));
      else if (A.fn === 'sin' && B.fn === 'sin') e = half(sSub(sFn('cos', [difA]), sFn('cos', [sumA])));
      else e = half(sAdd([sFn('cos', [difA]), sFn('cos', [sumA])]));
      return integrateS(sMul([sMul(others), e]), x, depth + 1);
    }
  }
  return null;
}

// ---- method: sqrt of a quadratic -----------------------------------------------------------------------------------
function mSqrtQuad(f, x) {
  const fs = f.k === '*' ? f.a : [f];
  let g = null;
  const rest = [];
  for (const t of fs) {
    if (t.k === '^' && t.e.k === 'n' && t.e.q.d === 2n && !freeOf(t.b, x) && !g) g = t;
    else rest.push(t);
  }
  if (!g) return null;
  const qc = polyCoeffsS(g.b, x);
  if (!qc || qc.length !== 3 || qc.some((c) => c.k !== 'n')) return null;
  const L = polyCoeffsS(sMul(rest), x);
  if (!L || L.length > 2 || L.some((c) => c.k !== 'n')) return null;
  const a = qc[2].q;
  const b = qc[1].q;
  const c = qc[0].q;
  const h = b.div(a.mul(qInt(2)));
  const A = a;
  const B = c.sub(b.mul(b).div(a.mul(qInt(4))));
  if (B.isZero()) return null;
  const U = sAdd([sV(x), sN(h)]);
  const al = (L[1] ? L[1].q : Q0);
  const be = (L[0] ? L[0].q : Q0).sub(al.mul(h));
  const Qs = g.b;
  const sq = sSqrt(Qs);
  const I1 = () => {
    if (A.sign() > 0) return sDiv(sLnAbs(sAdd([sMul([sSqrt(sN(A)), U]), sq])), sSqrt(sN(A)));
    if (B.sign() > 0) return sDiv(sFn('asin', [sDiv(sMul([sSqrt(sN(A.neg())), U]), sSqrt(sN(B)))]), sSqrt(sN(A.neg())));
    return null;
  };
  const r = g.e.q;
  const isH = (n, d) => r.eq(new Q(BigInt(n), BigInt(d)));
  let F;
  if (isH(-1, 2)) {
    const i1 = I1();
    if (!i1 && !be.isZero()) return null;
    F = sAdd([sMul([sN(al), sq, sN(A.inv())]), be.isZero() ? S0 : sMul([sN(be), i1])]);
  } else if (isH(1, 2)) {
    const i1 = I1();
    if (!i1) return null;
    const i2 = sAdd([half(sMul([U, sq])), sMul([sN(B.div(qInt(2))), i1])]);
    F = sAdd([sMul([sN(al), sPow(Qs, sN(new Q(3n, 2n))), sN(A.mul(qInt(3)).inv())]), sMul([sN(be), i2])]);
  } else if (isH(-3, 2)) {
    F = sAdd([sMul([sN(al.neg()), sPow(sMul([sN(A), sq]), SM1)]), sMul([sN(be), U, sPow(sMul([sN(B), sq]), SM1)])]);
  } else return null;
  return F;
}

// ---- method: u-substitution ------------------------------------------------------------------------------------------
function subexpressions(e, out) {
  if (e.k === 'f' || e.k === '^' || e.k === '+') out.push(e);
  if (e.k === 'f') e.a.forEach((t) => { out.push(t); subexpressions(t, out); });
  else if (e.k === '+' || e.k === '*') e.a.forEach((t) => subexpressions(t, out));
  else if (e.k === '^') {
    out.push(e.b);
    out.push(e.e);
    subexpressions(e.b, out);
    subexpressions(e.e, out);
  }
  return out;
}
function mUSub(f, x, depth) {
  if (depth > 3) return null;
  const seen = new Set();
  const cands = [];
  for (const c of subexpressions(f, [])) {
    if (c.k === 'v' || c.k === 'n' || c.k === 'c' || freeOf(c, x)) continue;
    const k = key(c);
    if (seen.has(k)) continue;
    seen.add(k);
    cands.push(c);
  }
  cands.sort((p, q) => fmtS(q, true).length - fmtS(p, true).length);
  const FV = freshVar();
  const W = sV(FV);
  for (const u of cands.slice(0, 10)) {
    tick();
    let du;
    try {
      du = diffS(u, x);
    } catch (e) {
      continue;
    }
    if (isNumVal(du, 0)) continue;
    const q = sMul([f, sPow(du, SM1)]);
    const q2 = replaceExpS(q, u, W, x);
    if (!freeOf(q2, x)) continue;
    const G = integrateS(q2, FV, depth + 1);
    if (G) return subsS(G, FV, u);
  }
  return null;
}

// ---- method: integration by parts ---------------------------------------------------------------------------------------
function liateRank(g, x) {
  if (g.k === 'f' && ['asin', 'acos', 'atan'].includes(g.fn)) return 0;
  if (g.k === 'f' && g.fn === 'ln') return 1;
  if (g.k === '^' && g.b.k === 'f' && g.b.fn === 'ln') return 1;
  if (g.k === 'v' || (g.k === '^' && freeOf(g.e, x))) return 2;
  if (g.k === 'f') return 3;
  if (g.k === '^' && g.b.k === 'f') return 3;
  return 4;
}
function mParts(f, x, depth) {
  if (depth > 4) return null;
  const fs = f.k === '*' ? f.a : [f];
  const order = fs.map((g, i) => ({ g, i })).sort((p, q) => liateRank(p.g, x) - liateRank(q.g, x));
  for (const { g, i } of order.slice(0, 2)) {
    tick();
    const dv = sMul(fs.filter((_, j) => j !== i).concat(fs.length === 1 ? [S1] : []));
    let v = integrateS(dv, x, depth + 1);
    if (!v) continue;
    let du;
    try {
      du = diffS(g, x);
    } catch (e) {
      continue;
    }
    const next = sMul([v, du]);
    // cyclic case: ∫f = g v - c ∫f
    const ratio = sMul([next, sPow(f, SM1)]);
    const constant = freeOf(ratio, x) ? ratio : isConstantFunction(ratio, x) ? constantValueOf(ratio, x) : null;
    if (constant) {
      const denom = sAdd([S1, constant]);
      if (!isNumVal(denom, 0)) return sDiv(sMul([g, v]), denom);
      continue;
    }
    const rest = integrateS(next, x, depth + 1);
    if (rest) return sSub(sMul([g, v]), rest);
  }
  return null;
}
function isConstantFunction(e, x) {
  const vals = [0.31, 0.83, 1.37, 1.93].map((t) => {
    try {
      return numS(e, { [x]: t });
    } catch (err) {
      return NaN;
    }
  });
  return vals.every((v) => isFinite(v)) && vals.every((v) => Math.abs(v - vals[0]) < 1e-9 * (1 + Math.abs(vals[0])));
}
function constantValueOf(e, x) {
  const v = numS(e, { [x]: 0.31 });
  const fr = toFraction(v, 60);
  return fr ? sN(new Q(BigInt(fr.p), BigInt(fr.q))) : null;
}

// ---- method: expand a product with a sum in it ----------------------------------------------------------------------------
function mExpandProduct(f, x, depth) {
  if (f.k !== '*' || !f.a.some((t) => t.k === '+' || (t.k === '^' && t.b.k === '+' && t.e.k === 'n' && t.e.q.isInt() && t.e.q.sign() > 0))) return null;
  let e;
  try {
    e = expandS(f);
  } catch (err) {
    return null;
  }
  if (key(e) === key(f)) return null;
  return integrateS(e, x, depth + 1);
}

// ---- method: Gaussian  c * e^(a x^2 + b x + d), a < 0  -> erf -----------------------------------------------------------
function mGauss(f, x) {
  const fs = f.k === '*' ? f.a : [f];
  const ex = fs.find((t) => t.k === '^' && isConstE(t.b) && !freeOf(t.e, x));
  if (!ex) return null;
  const rest = fs.filter((t) => t !== ex);
  if (!rest.every((t) => freeOf(t, x))) return null;
  const c = polyCoeffsS(ex.e, x);
  if (!c || c.length !== 3 || c.some((t) => t.k !== 'n')) return null;
  const al = c[2].q;
  const be = c[1].q;
  const ga = c[0].q;
  if (al.sign() >= 0) return null;
  const k = al.neg();
  const h = be.div(al.mul(qInt(2)));
  const g2 = ga.sub(be.mul(be).div(al.mul(qInt(4))));
  const u = sAdd([sV(x), sN(h)]);
  return sMul([sMul(rest), sExp(sN(g2)), sSqrt(S_PI), sPow(sMul([sI(2), sSqrt(sN(k))]), SM1), sFn('erf', [sMul([sSqrt(sN(k)), u])])]);
}

// ---- method: trigonometric substitution for sqrt(quadratic) -----------------------------------------------------------------
function sqrtQuadBases(e, x, out) {
  if (e.k === '^' && e.e.k === 'n' && e.e.q.d === 2n && !freeOf(e.b, x)) {
    const qc = polyCoeffsS(e.b, x);
    if (qc && qc.length === 3 && qc.every((c) => c.k === 'n') && !out.some((o) => key(o) === key(e.b))) out.push(e.b);
  }
  if (e.k === '+' || e.k === '*' || e.k === 'f') e.a.forEach((t) => sqrtQuadBases(t, x, out));
  else if (e.k === '^') {
    sqrtQuadBases(e.b, x, out);
    sqrtQuadBases(e.e, x, out);
  }
  return out;
}
/** sin(k t), cos(k t) for integer k -> polynomials in sin t and cos t. */
function expandMultiAngles(e, T) {
  const s = sFn('sin', [sV(T)]);
  const c = sFn('cos', [sV(T)]);
  const memo = new Map();
  const sk = (k) => {
    if (k === 0) return S0;
    if (k === 1) return s;
    if (memo.has('s' + k)) return memo.get('s' + k);
    const r = expandS(sSub(sMul([sI(2), c, sk(k - 1)]), sk(k - 2)));
    memo.set('s' + k, r);
    return r;
  };
  const ck = (k) => {
    if (k === 0) return S1;
    if (k === 1) return c;
    if (memo.has('c' + k)) return memo.get('c' + k);
    const r = expandS(sSub(sMul([sI(2), c, ck(k - 1)]), ck(k - 2)));
    memo.set('c' + k, r);
    return r;
  };
  const walk = (t) => {
    if (t.k === 'f' && (t.fn === 'sin' || t.fn === 'cos') && t.a.length === 1) {
      const a = t.a[0];
      const m = a.k === '*' && a.a.length === 2 && a.a[0].k === 'n' && a.a[0].q.isInt() && a.a[1].k === 'v' && a.a[1].name === T ? Number(a.a[0].q.n) : null;
      if (m && Math.abs(m) >= 2 && Math.abs(m) <= 10) {
        const k = Math.abs(m);
        const r = t.fn === 'sin' ? sk(k) : ck(k);
        return t.fn === 'sin' && m < 0 ? sNeg(r) : r;
      }
    }
    if (t.k === '+' || t.k === '*' || t.k === '^' || t.k === 'f') return mapS(t, walk);
    return t;
  };
  return walk(e);
}
function mTrigSub(f, x, depth) {
  if (depth > 2) return null;
  const bases = sqrtQuadBases(f, x, []);
  if (bases.length !== 1) return null;
  const Qb = bases[0];
  const qc = polyCoeffsS(Qb, x).map((c) => c.q);
  const A = qc[2];
  const B2 = qc[0].sub(qc[1].mul(qc[1]).div(A.mul(qInt(4))));
  if (A.isZero() || B2.isZero()) return null;
  const h = qc[1].div(A.mul(qInt(2)));
  const T = freshVar();
  const th = sV(T);
  let kind;
  let sc; // scale s with u = s * trig(theta)
  let sqrtQ; // sqrt(Q) as a function of theta
  let dxdt;
  let xOfT;
  if (A.sign() < 0 && B2.sign() > 0) {
    kind = 'sin';
    sc = sSqrt(sN(B2.div(A.neg())));
    sqrtQ = sMul([sSqrt(sN(B2)), sFn('cos', [th])]);
    xOfT = sSub(sMul([sc, sFn('sin', [th])]), sN(h));
    dxdt = sMul([sc, sFn('cos', [th])]);
  } else if (A.sign() > 0 && B2.sign() > 0) {
    kind = 'tan';
    sc = sSqrt(sN(B2.div(A)));
    sqrtQ = sMul([sSqrt(sN(B2)), sPow(sFn('cos', [th]), SM1)]);
    xOfT = sSub(sMul([sc, sFn('tan', [th])]), sN(h));
    dxdt = sMul([sc, sPow(sFn('cos', [th]), sI(-2))]);
  } else if (A.sign() > 0 && B2.sign() < 0) {
    kind = 'sec';
    sc = sSqrt(sN(B2.neg().div(A)));
    sqrtQ = sMul([sSqrt(sN(B2.neg())), sFn('sin', [th]), sPow(sFn('cos', [th]), SM1)]);
    xOfT = sSub(sMul([sc, sPow(sFn('cos', [th]), SM1)]), sN(h));
    dxdt = sMul([sc, sFn('sin', [th]), sPow(sFn('cos', [th]), sI(-2))]);
  } else return null;
  // rewrite Q^(p/2) as (sqrt Q)^p, integer powers of Q as (sqrt Q)^(2n)
  const swap = (t) => {
    if (t.k === '^' && key(t.b) === key(Qb) && t.e.k === 'n') return sPow(sqrtQ, sMul([sI(2), t.e]));
    if (t.k === '+' || t.k === '*' || t.k === '^' || t.k === 'f') return mapS(t, swap);
    return t;
  };
  const g = sMul([subsS(swap(f), x, xOfT), dxdt]);
  const H0 = integrateS(g, T, depth + 1);
  if (!H0) return null;
  const H = expandMultiAngles(H0, T);
  const U = sAdd([sV(x), sN(h)]);
  const sq = sSqrt(Qb);
  let sinT;
  let cosT;
  let theta;
  if (kind === 'sin') {
    sinT = sDiv(U, sc);
    cosT = sDiv(sq, sSqrt(sN(B2)));
    theta = sFn('asin', [sinT]);
  } else if (kind === 'tan') {
    cosT = sDiv(sSqrt(sN(B2)), sq);
    sinT = sMul([sDiv(U, sc), cosT]);
    theta = sFn('atan', [sDiv(U, sc)]);
  } else {
    cosT = sDiv(sc, U);
    sinT = sDiv(sq, sSqrt(sN(B2.neg())));
    theta = sFn('acos', [sDiv(sc, U)]);
  }
  const tans = (e) => {
    if (e.k === 'f' && e.a.length === 1 && key(e.a[0]) === key(th)) {
      if (e.fn === 'tan') return sDiv(sFn('sin', [th]), sFn('cos', [th]));
      if (e.fn === 'sec') return sPow(sFn('cos', [th]), SM1);
      if (e.fn === 'csc') return sPow(sFn('sin', [th]), SM1);
      if (e.fn === 'cot') return sDiv(sFn('cos', [th]), sFn('sin', [th]));
    }
    if (e.k === '+' || e.k === '*' || e.k === '^' || e.k === 'f') return mapS(e, tans);
    return e;
  };
  let R = tans(H);
  R = replaceS(R, key(sFn('sin', [th])), sinT);
  R = replaceS(R, key(sFn('cos', [th])), cosT);
  R = subsS(R, T, theta);
  return R;
}

const INTEGRATION_METHODS = [mTable, mGauss, mPoly, mExpTrig, mRational, mTrig, mSqrtQuad, mExpandProduct, mUSub, mTrigSub, mParts];

function integrateS(f, x, depth) {
  depth = depth || 0;
  tick();
  if (depth > 8) return null;
  f = simp(f);
  if (freeOf(f, x)) return sMul([f, sV(x)]);
  if (f.k === '+') {
    const parts = [];
    for (const t of f.a) {
      const r = integrateS(t, x, depth + 1);
      if (!r) {
        parts.length = 0;
        break;
      }
      parts.push(r);
    }
    if (parts.length) return sAdd(parts);
  }
  if (f.k === '*') {
    const cs = f.a.filter((t) => freeOf(t, x));
    if (cs.length) {
      const r = integrateS(sMul(f.a.filter((t) => !freeOf(t, x))), x, depth + 1);
      return r ? sMul(cs.concat([r])) : null;
    }
  }
  for (const m of INTEGRATION_METHODS) {
    let r;
    try {
      r = m(f, x, depth);
    } catch (e) {
      if (e instanceof GiveUp) throw e;
      r = null;
    }
    if (r && verifyAnti(r, f, x)) return r;
  }
  return null;
}

/** Antiderivative of f with respect to x, or null when none is found with these methods. */
function antiderivative(f, x) {
  IB = { steps: 0, deadline: Date.now() + 3500 };
  try {
    return integrateS(f, x, 0);
  } catch (e) {
    if (e instanceof GiveUp) return null;
    throw e;
  }
}
