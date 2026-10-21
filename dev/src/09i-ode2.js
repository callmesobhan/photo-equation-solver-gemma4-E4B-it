// ======================================================================
// 9i. More differential equations: Bernoulli, homogeneous (y/x), exact (with an integrating
//     factor), Euler-Cauchy, variation of parameters, systems of linear equations,
//     and the differential form  M dx + N dy = 0.
// ======================================================================

// ---- the form  M dx + N dy = 0  ->  N y' + M = 0 ---------------------------------------------------------------------------------
function convertDifferentialForm(s) {
  if (!/\bd[a-z]\b/.test(s) || !/=/.test(s)) return s;
  return s.split(/([;\n])/).map((part) => convertDiffPart(part)).join('');
}
function convertDiffPart(part) {
  const eq = /^(.*?)=\s*0\s*$/.exec(part.trim());
  if (!eq) return part;
  const body = eq[1];
  const hits = [];
  const re = /(^|[^a-z0-9_])d([a-z])(?![a-z0-9_(])/g;
  let m;
  while ((m = re.exec(body))) hits.push({ idx: m.index + m[1].length, end: re.lastIndex, v: m[2] });
  if (hits.length !== 2 || hits[0].v === hits[1].v) return part;
  const cut = (a, b) => body.slice(a, b).replace(/^[\s*]+|[\s*]+$/g, '').replace(/^\+\s*/, '');
  const first = cut(0, hits[0].idx) || '1';
  const second = cut(hits[0].end, hits[1].idx) || '1';
  const [uA, uB] = [hits[0].v, hits[1].v]; // first * d(uA) + second * d(uB) = 0
  // uB depends on uA: second * uB' + first = 0
  return '(' + second + ')*' + uB + "' + (" + first + ') = 0';
}

// ---- first-order special equations ----------------------------------------------------------------------------------------------
const yPower = (t, y) => {
  // t = coef(x) * y^k  ->  {k (Q), coef (S)} or null
  const fs = t.k === '*' ? t.a : [t];
  let k = Q0;
  const coef = [];
  for (const f of fs) {
    if (f.k === 'v' && f.name === y) k = k.add(Q1);
    else if (f.k === '^' && f.b.k === 'v' && f.b.name === y && f.e.k === 'n') k = k.add(f.e.q);
    else if (Array.from(varsOfS(f)).includes(y)) return null;
    else coef.push(f);
  }
  return { k, coef: sMul(coef) };
}
function bernoulliSolve(h, y, x, consts, out) {
  const terms = termsOf(expandS(h));
  const parts = terms.map((t) => yPower(t, y));
  if (parts.some((p) => !p)) return null;
  const exps = Array.from(new Set(parts.map((p) => p.k.toString())));
  if (exps.length !== 2 || !exps.includes('1')) return null;
  const nStr = exps.find((e) => e !== '1');
  const nq = parts.find((p) => p.k.toString() === nStr).k;
  if (nq.isZero()) return null;
  const sum = (kStr) => sAdd(parts.filter((p) => p.k.toString() === kStr).map((p) => p.coef));
  const a = simp(sum('1'));
  const b = simp(sum(nStr));
  const m = Q1.sub(nq); // 1 - n
  // v = y^(1-n):  v' = (1-n) a v + (1-n) b
  const pcoef = simp(sMul([sN(m.neg()), a]));
  const P = antiderivative(pcoef, x) || (freeOf(pcoef, x) ? sMul([pcoef, sV(x)]) : null);
  if (!P) return null;
  const mu = sExp(P);
  const integrand = simp(sMul([mu, sN(m), b]));
  const I = isNumVal(integrand, 0) ? S0 : antiderivative(integrand, x);
  if (!I) return null;
  consts.push('C1');
  const v = expandS(sMul([sPow(mu, SM1), sAdd([I, sV('C1')])]));
  out.work.push('Bernoulli equation y\' = a(x)·y + b(x)·yⁿ with n = ' + nq.toString() + ': substitute v = y^' + m.toString() + ' to get the linear equation v\' ' + (a.k === 'n' && a.q.sign() >= 0 ? '− ' : '+ ') + '… (integrating factor μ = ' + fmtS(mu) + ')');
  const root = Q1.div(m);
  return { sol: simp(sPow(simp(v), sN(root))) };
}
function isHomogeneousDegree0(h, y, x) {
  const pts = [[1.3, 0.7], [2.1, -1.2], [0.6, 1.9], [-1.4, 0.8]];
  const f = (a, b) => {
    try {
      return numS(h, { [x]: a, [y]: b });
    } catch (e) {
      return NaN;
    }
  };
  return pts.every(([a, b]) => {
    const v = f(a, b);
    const w = f(3.7 * a, 3.7 * b);
    return isFinite(v) && isFinite(w) && Math.abs(v - w) < 1e-9 * (1 + Math.abs(v));
  });
}
function homogeneousFirstOrder(F, h, y, x, consts, out) {
  if (!isHomogeneousDegree0(h, y, x)) return null;
  const U = '$u';
  const Fu = simp(subsMany(h, new Map([[x, S1], [y, sV(U)]])));
  const den = simp(sSub(Fu, sV(U)));
  if (isNumVal(den, 0)) {
    consts.push('C1');
    out.work.push('Homogeneous equation with F(u) = u: y = C1·x');
    return { sol: sMul([sV('C1'), sV(x)]) };
  }
  const G = antiderivative(simp(sPow(den, SM1)), U);
  if (!G) return null;
  consts.push('C1');
  out.work.push('Homogeneous equation y\' = F(y/x): put y = x·u, then x·u\' = F(u) − u is separable: ∫ du/(F(u) − u) = ln|x| + C1');
  const lnx = sFn('ln', [sFn('abs', [sV(x)])]);
  const R = sAdd([lnx, sV('C1')]);
  const cands = solveSeparable(G, R, U, x, lnx).map((c) => simp(sMul([sV(x), c]))).filter((c) => odeResidualOk(F, y, x, c));
  if (cands.length) return { sol: cands[0], alt: cands.slice(1) };
  const implicit = subsS(G, U, sDiv(sV(y), sV(x)));
  out.answer.push(fmtS(simp(implicit)) + ' = ' + fmtS(R));
  out.notes.push('The solution is given implicitly in y/x.');
  return { implicit: true };
}
function exactFirstOrder(F, cp, rest, y, x, consts, out) {
  let M = simp(rest);
  let N = simp(cp);
  const exactDiff = (m, n2) => simp(sSub(diffS(m, y), diffS(n2, x)));
  let d = exactDiff(M, N);
  let how = 'exact equation';
  if (!isNumVal(expandS(d), 0)) {
    // integrating factor depending on x only or on y only
    const t1 = simp(sDiv(d, N));
    const t2 = simp(sDiv(sNeg(d), M));
    let mu = null;
    if (freeOf(t1, y)) {
      const I = antiderivative(t1, x);
      if (I) mu = sExp(stripLnAbs(I));
    }
    if (!mu && freeOf(t2, x)) {
      const I = antiderivative(t2, y);
      if (I) mu = sExp(stripLnAbs(I));
    }
    if (!mu) return null;
    M = simp(sMul([mu, M]));
    N = simp(sMul([mu, N]));
    d = exactDiff(M, N);
    if (!isNumVal(expandS(d), 0) && !sameFunction(simp(diffS(M, y)), simp(diffS(N, x)), [x, y], 6)) return null;
    how = 'integrating factor μ = ' + fmtS(simp(mu));
  } else how = 'exact equation (∂M/∂y = ∂N/∂x)';
  const Psi0 = antiderivative(M, x) || (freeOf(M, x) ? sMul([M, sV(x)]) : null);
  if (!Psi0) return null;
  const rem = simp(sSub(N, diffS(Psi0, y)));
  if (!freeOf(rem, x)) return null;
  const phi = isNumVal(rem, 0) ? S0 : antiderivative(rem, y) || (freeOf(rem, y) ? sMul([rem, sV(y)]) : null);
  if (phi === null) return null;
  const Psi = simp(expandS(sAdd([Psi0, phi])));
  consts.push('C1');
  out.work.push('Written as M dx + N dy = 0 with M = ' + fmtS(M) + ', N = ' + fmtS(N) + ' (' + how + '): ψ(x, y) = ∫M dx + g(y) with ψ = C1');
  let sols = null;
  try {
    sols = solveLiteralFor(Psi, sV('C1'), y);
  } catch (e) {
    sols = null;
  }
  const good = (sols || []).map((s) => simp(s)).filter((s) => odeResidualOk(F, y, x, s));
  if (good.length) return { sol: good[0], alt: good.slice(1) };
  out.answer.push(fmtS(Psi) + ' = C1');
  out.notes.push('The solution is given implicitly.');
  return { implicit: true };
}
/** Try the special first-order methods; returns {sol, alt} | {implicit: true} | null. */
function firstOrderSpecial(F, cp, rest, h, y, x, consts, out) {
  let r = null;
  try {
    r = bernoulliSolve(h, y, x, consts, out);
    if (r && !odeResidualOk(F, y, x, r.sol)) {
      consts.length = 0;
      r = null;
    }
  } catch (e) {
    if (!(e instanceof MathError) && !(e instanceof NotAlgebraic)) throw e;
    r = null;
  }
  if (r) return r;
  const tries = [
    () => exactFirstOrder(F, cp, rest, y, x, consts, out),
    () => homogeneousFirstOrder(F, h, y, x, consts, out),
  ];
  for (const t of tries) {
    consts.length = 0;
    try {
      r = t();
    } catch (e) {
      if (!(e instanceof MathError) && !(e instanceof NotAlgebraic)) throw e;
      r = null;
    }
    if (r) return r;
  }
  return null;
}

// ---- variation of parameters and Euler-Cauchy equations -----------------------------------------------------------------------------
/** y_p for y'' + p y' + q y = g given a basis y1, y2 (g already divided by the leading coefficient). */
const tanToSinCos = (e) => {
  const walk = (t) => {
    if (t.k === 'f' && t.fn === 'ln') return t; // keep ln|sec x + tan x| readable
    if (t.k === 'f' && t.fn === 'tan') return sDiv(sFn('sin', t.a.map(walk)), sFn('cos', t.a.map(walk)));
    if (t.k === 'f' && t.fn === 'cot') return sDiv(sFn('cos', t.a.map(walk)), sFn('sin', t.a.map(walk)));
    if (t.k === 'f' && t.fn === 'sec') return sDiv(S1, sFn('cos', t.a.map(walk)));
    if (t.k === 'f' && t.fn === 'csc') return sDiv(S1, sFn('sin', t.a.map(walk)));
    if (t.k === '+' || t.k === '*' || t.k === '^' || t.k === 'f') return mapS(t, walk);
    return t;
  };
  return walk(e);
};
/** The shorter of the expression and its trig-simplified rewrite. */
function tidyTrig(e) {
  let best = simp(e);
  try {
    const alt = simplifyTrigS(simp(expandS(tanToSinCos(best))));
    if (fmtS(alt).length < fmtS(best).length) best = alt;
  } catch (err) {
    // keep the original
  }
  return best;
}
function variationOfParameters(y1, y2, g, x) {
  let W = simp(expandS(sSub(sMul([y1, diffS(y2, x)]), sMul([diffS(y1, x), y2]))));
  W = tidyTrig(W);
  if (isNumVal(W, 0)) return null;
  const i1 = simp(expandS(sDiv(sMul([y2, g]), W)));
  const i2 = simp(expandS(sDiv(sMul([y1, g]), W)));
  const A = antiderivative(i1, x);
  const B = antiderivative(i2, x);
  if (!A || !B) return null;
  return tidyTrig(expandS(sAdd([sNeg(sMul([y1, A])), sMul([y2, B])])));
}
function eulerBasis(A, B, Cc, x) {
  // A x^2 y'' + B x y' + Cc y = 0  ->  A r(r-1) + B r + Cc = 0
  const cs = [Cc, B.sub(A), A];
  const { basis, roots } = homogeneousBasisX(cs, x);
  return { basis, roots };
}
/** Like homogeneousBasis but in x^r: real roots -> x^r (x^r ln x for repeats), complex a ± bi -> x^a cos(b ln x), x^a sin(b ln x). */
function homogeneousBasisX(cs, x) {
  const roots = charRootsS(cs);
  const X = sV(x);
  const lx = sFn('ln', [X]);
  const basis = [];
  roots.forEach((r) => {
    for (let m = 0; m < r.mult; m++) {
      const pow = sPow(X, r.re);
      const lp = m ? sPow(lx, sI(m)) : S1;
      if (!r.im) basis.push(sMul([pow, lp]));
      else {
        basis.push(sMul([pow, lp, sFn('cos', [sMul([r.im, lx])])]));
        basis.push(sMul([pow, lp, sFn('sin', [sMul([r.im, lx])])]));
      }
    }
  });
  return { basis, roots };
}
function eulerCauchy(cks, g, x, consts, out) {
  if (cks.length !== 3) return null;
  const X2 = sq(sV(x));
  const A = simp(sDiv(cks[2], X2));
  const B = simp(sDiv(cks[1], sV(x)));
  const Cc = cks[0];
  if (![A, B, Cc].every((e) => e.k === 'n')) return null;
  if (A.q.isZero()) return null;
  const { basis, roots } = eulerBasis(A.q, B.q, Cc.q, x);
  if (basis.length !== 2) return null;
  let yh = S0;
  basis.forEach((b, i) => {
    yh = sAdd([yh, sMul([sV('C' + (i + 1)), b])]);
    consts.push('C' + (i + 1));
  });
  out.work.push('Euler–Cauchy equation (x² y\'\' + … with y = xʳ): characteristic equation ' + polyText([Cc.q, B.q.sub(A.q), A.q], 'r') + ' = 0, roots ' + roots.map((r) => (r.im ? fmtS(r.re) + ' ± ' + fmtS(r.im) + 'i' : fmtS(r.re)) + (r.mult > 1 ? ' (×' + r.mult + ')' : '')).join(', ') + ';  valid for x > 0');
  let yp = S0;
  if (!isNumVal(simp(g), 0)) {
    // x = e^t turns  A x² y'' + B x y' + C y = R(x)  into  A y_tt + (B − A) y_t + C y = R(e^t)  with constant coefficients
    const T = '$t';
    let ypT = null;
    try {
      ypT = undeterminedCoefficients([Cc.q, B.q.sub(A.q), A.q], simp(subsS(simp(sNeg(g)), x, sExp(sV(T)))), T);
    } catch (e) {
      if (!(e instanceof MathError) && !(e instanceof NotAlgebraic)) throw e;
    }
    if (ypT) {
      yp = simp(subsS(ypT, T, sFn('ln', [sV(x)])));
      out.work.push('Particular solution (x = e^t gives constant coefficients, then undetermined coefficients): ' + fmtS(yp));
    } else {
      const gStd = simp(sDiv(sNeg(g), cks[2]));
      yp = variationOfParameters(basis[0], basis[1], gStd, x);
      if (!yp) throw new MathError('I could not integrate the terms needed for variation of parameters');
      out.work.push('Particular solution by variation of parameters: ' + fmtS(yp));
    }
  }
  return { sol: sAdd([yh, yp]) };
}

// ---- systems of linear equations with constant coefficients -----------------------------------------------------------------------------
/** u_i' = sum_j M_ij u_j + g_i(t) for a list of first-order equations: {M (Q matrix), names, indep, forcing[]} */
function parseODESystem(odes, depNames) {
  const names = depNames.slice().sort();
  const n = names.length;
  const eqs = new Map();
  const vars = new Set();
  odes.forEach((st) => {
    const Fq = simp(sSub(fromAst(st.lhs), fromAst(st.rhs)));
    const dv = Array.from(varsOfS(Fq)).filter((v) => /'$/.test(v));
    if (dv.length !== 1 || dv[0].length !== 2) throw new MathError('a system must consist of first-order equations such as x\' = 3x + y');
    eqs.set(dv[0].slice(0, -1), Fq);
    varsOfS(Fq).forEach((v) => vars.add(v));
  });
  if (eqs.size !== n) throw new MathError('give one first-order equation for each unknown function');
  const others = Array.from(vars).filter((v) => !names.includes(v) && !/'$/.test(v));
  if (others.length > 1) throw new MathError('the system has more than one independent variable (' + others.join(', ') + ')');
  const indep = others[0] || 't';
  const zero = new Map(names.map((nm) => [nm, S0]));
  const M = [];
  const forcing = [];
  names.forEach((nm) => {
    const Fq = eqs.get(nm);
    const k = simp(diffS(Fq, nm + "'"));
    if (k.k !== 'n' || k.q.isZero()) throw new MathError('each equation must contain ' + nm + '\' with a constant coefficient');
    const rest = simp(sSub(Fq, sMul([k, sV(nm + "'")])));
    M.push(names.map((c) => {
      const e = simp(sNeg(sDiv(diffS(rest, c), k)));
      if (e.k !== 'n') throw new MathError('only constant coefficients are supported in systems');
      return e.q;
    }));
    forcing.push(simp(sNeg(sDiv(subsMany(rest, zero), k))));
  });
  return { M, names, indep, forcing };
}
/** x(0) = 1  ->  {name, point, value} for one of the unknown functions */
function parseSystemIC(st, deps) {
  if (st.kind !== 'eq') return null;
  const l = st.lhs;
  if (l.t === 'bin' && l.op === '*' && l.a.t === 'var' && deps.includes(l.a.name) && isConstantAst(l.b) && isConstantAst(st.rhs)) return { name: l.a.name, point: fromAst(l.b), value: fromAst(st.rhs) };
  return null;
}
/** Solutions of x' = M x for a rational eigenvalue lam of algebraic multiplicity mult (Jordan chains):
 *  for each v in the generalised eigenspace ker (M - lam I)^mult:  e^(lam t) (v + t N v + t^2/2 N^2 v + ...) */
function jordanSolutions(M, lam, mult, T, addSolution) {
  const n = M.length;
  const N = M.map((row, i) => row.map((v, j) => (i === j ? v.sub(lam) : v)));
  const pw = [mIdent(n)];
  for (let k = 1; k <= mult; k++) pw.push(mMul(pw[k - 1], N));
  const basis = mNullspace(pw[mult]).map(primitiveVector);
  const E = sExp(sMul([sN(lam), T]));
  basis.forEach((v) => {
    const terms = [];
    let fact = 1;
    for (let k = 0; k < mult; k++) {
      if (k > 0) fact *= k;
      const Nv = mMul(pw[k], v.map((x) => [x])).map((r) => r[0]);
      if (Nv.every((x) => x.isZero())) break;
      terms.push({ k, Nv, fact });
    }
    addSolution(Array.from({ length: n }, (_, i) => simp(expandS(sMul([sAdd(terms.map(({ k, Nv, fact: f }) => sMul([sN(Nv[i].div(qInt(f))), sPow(T, sN(qInt(k)))]))), E])))));
  });
}
function odeSystemSolve(sts, odes, ics, out) {
  const deps = [];
  odes.forEach((st) => {
    const find = (n) => {
      if (n.t === 'dvar' && !deps.includes(n.name)) deps.push(n.name);
      else if (n.t === 'neg' || n.t === 'fact' || n.t === 'pct' || n.t === 'named') find(n.a);
      else if (n.t === 'bin') {
        find(n.a);
        find(n.b);
      } else if (n.t === 'call') n.args.forEach(find);
    };
    find(st.lhs);
    find(st.rhs);
  });
  const sys = parseODESystem(odes, deps);
  const { M, names, indep } = sys;
  const n = names.length;
  if (n < 2 || n > 3) throw new MathError('systems of 2 or 3 equations are supported');
  if (sys.forcing.some((g) => !isNumVal(simp(g), 0))) throw new MathError('only homogeneous systems (no extra terms in t) are supported');
  const T = sV(indep);
  const consts = [];
  const comps = names.map(() => S0);
  let cIdx = 0;
  const addSolution = (vec) => {
    cIdx++;
    consts.push('C' + cIdx);
    vec.forEach((e, i) => { comps[i] = sAdd([comps[i], sMul([sV('C' + cIdx), e])]); });
  };
  // eigenvalues of M
  const charp = charPoly(M);
  const rootsI = polyRoots(charp);
  const q2 = (q) => sN(q);
  out.work.push('Matrix A = ' + JSON.stringify(M.map((r) => r.map((q) => q.toString()))).replace(/"/g, '') + ';  characteristic polynomial ' + polyText(charp, 'λ') + ' = 0');
  const evS = [];
  rootsI.real.forEach((r) => {
    const S = rootS(r) || null;
    if (!S) throw new MathError('the eigenvalues must be rational or quadratic surds');
    evS.push({ S, q: r.q || null, mult: r.mult, val: r.val });
  });
  const cplx = rootsI.complex.filter((z) => z.im > 0);
  if (n === 2) {
    const [[a, b], [c, d]] = M;
    const tr = a.add(d);
    const det = a.mul(d).sub(b.mul(c));
    const disc = tr.mul(tr).sub(qInt(4).mul(det));
    const half = new Q(1n, 2n);
    if (disc.sign() > 0) {
      const sq_ = simp(sSqrt(q2(disc)));
      [1, -1].forEach((sg) => {
        const lam = simp(sMul([q2(half), sAdd([q2(tr), sg > 0 ? sq_ : sNeg(sq_)])]));
        let vec;
        if (!b.isZero()) vec = [q2(b), simp(sSub(lam, q2(a)))];
        else if (!c.isZero()) vec = [simp(sSub(lam, q2(d))), q2(c)];
        else vec = a.eq(Q0) && sg < 0 ? [S0, S1] : (Math.abs(numS(lam, {}) - a.toNumber()) < 1e-9 ? [S1, S0] : [S0, S1]);
        addSolution(vec.map((e) => simp(sMul([e, sExp(sMul([lam, T]))]))));
      });
    } else if (disc.isZero()) {
      const lam = q2(tr.mul(half));
      const E = sExp(sMul([lam, T]));
      if (b.isZero() && c.isZero() && a.eq(d)) {
        addSolution([E, S0]);
        addSolution([S0, E]);
      } else {
        jordanSolutions(M, tr.mul(half), 2, T, addSolution);
      }
    } else {
      const alpha = q2(tr.mul(half));
      const beta = simp(sSqrt(q2(disc.neg().div(qInt(4)))));
      const E = sExp(sMul([alpha, T]));
      const cs = sFn('cos', [sMul([beta, T])]);
      const sn = sFn('sin', [sMul([beta, T])]);
      // λ = α + iβ, eigenvector (b, λ - a) = p + i q with p = (b, α - a), q = (0, β)  (or (λ - d, c) when b = 0)
      let p;
      let qv;
      if (!b.isZero()) {
        p = [q2(b), simp(sSub(alpha, q2(a)))];
        qv = [S0, beta];
      } else {
        p = [simp(sSub(alpha, q2(d))), q2(c)];
        qv = [beta, S0];
      }
      addSolution(p.map((pi, i) => simp(expandS(sMul([E, sSub(sMul([pi, cs]), sMul([qv[i], sn]))])))));
      addSolution(p.map((pi, i) => simp(expandS(sMul([E, sAdd([sMul([pi, sn]), sMul([qv[i], cs])])])))));
    }
  } else {
    // 3x3: rational eigenvalues with a full set of eigenvectors
    if (cplx.length || evS.some((e) => !e.q)) throw new MathError('for 3 equations the eigenvalues must all be rational');
    let total = 0;
    evS.forEach((e) => {
      const B = M.map((row, i) => row.map((v, j) => (i === j ? v.sub(e.q) : v)));
      const vecs = mNullspace(B);
      total += Math.max(vecs.length, e.mult);
      if (vecs.length < e.mult) {
        jordanSolutions(M, e.q, e.mult, T, addSolution);
        return;
      }
      vecs.forEach((v0) => {
        const v = primitiveVector(v0);
        addSolution(v.map((c) => simp(sMul([q2(c), sExp(sMul([q2(e.q), T]))]))));
      });
    });
    if (total !== 3) throw new MathError('this system could not be solved');
  }
  // initial conditions x(0) = a, y(0) = b
  const sol = new Map(names.map((nm, i) => [nm, comps[i]]));
  if (ics.length) {
    if (ics.length !== consts.length) throw new MathError('this system needs ' + consts.length + ' initial conditions (for example x(0) = 1, y(0) = 2)');
    const rowsA = [];
    const rhsA = [];
    ics.forEach((ic) => {
      const e = sol.get(ic.name);
      const at = subsS(e, indep, ic.point);
      rowsA.push(consts.map((c) => simp(diffS(at, c))));
      rhsA.push(simp(ic.value));
    });
    const vals = solveLinearS(rowsA, rhsA);
    if (!vals) throw new MathError('the initial conditions do not determine the constants');
    names.forEach((nm) => sol.set(nm, simp(expandS(subsMany(sol.get(nm), new Map(consts.map((c, i) => [c, vals[i]])))))));
  }
  // check by substitution
  let ok = true;
  names.forEach((nm, i) => {
    const lhs = diffS(sol.get(nm), indep);
    const rhs = sAdd(names.map((c, j) => sMul([q2(M[i][j]), sol.get(c)])));
    if (!sameFunction(simp(lhs), simp(rhs), [indep, ...consts].filter((v) => varsOfS(lhs).has(v) || varsOfS(rhs).has(v)), 6)) ok = false;
  });
  names.forEach((nm) => out.answer.push(nm + '(' + indep + ') = ' + fmtODE(simp(sol.get(nm)))));
  out.check = ok ? 'substituting the solution back into every equation gives equal sides' : null;
  if (!ics.length) out.notes.push(consts.join(', ').replace(/, ([^,]*)$/, ' and $1') + ' are arbitrary constants; initial conditions such as x(0) = 1, y(0) = 0 fix them.');
  return out;
}
