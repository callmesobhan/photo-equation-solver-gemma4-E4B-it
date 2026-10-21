
// ======================================================================
// 9e. Ordinary differential equations
//     first-order linear, separable, and linear with constant coefficients (any order,
//     forcing terms by undetermined coefficients), with initial conditions.
//     Every answer is checked by substituting it back into the equation.
// ======================================================================
const ysymName = (y, k) => y + "'".repeat(k);
/** Solution text with the terms ordered C1, C2, ..., then the particular solution. */
function fmtODE(sol) {
  const idx = (t) => {
    const m = Array.from(varsOfS(t)).find((v) => /^C\d+$/.test(v));
    return m ? Number(m.slice(1)) : 1e6;
  };
  const terms = termsOf(sol).slice().sort((p, q) => idx(p) - idx(q));
  return fmtS(terms.length > 1 ? { k: '+', a: terms } : sol);
}
function odeVars(node, y, set) {
  if (node.t === 'dvar') {
    set.add(node.order);
    return;
  }
  if (node.t === 'neg' || node.t === 'fact' || node.t === 'pct' || node.t === 'named') odeVars(node.a, y, set);
  else if (node.t === 'bin') {
    odeVars(node.a, y, set);
    odeVars(node.b, y, set);
  } else if (node.t === 'call') node.args.forEach((a) => odeVars(a, y, set));
}
function isConstantAst(n) {
  return collectVars(n, new Set()).size === 0 && !hasNode(n, ['dvar', 'list']);
}
/** y(a) = b  or  y'(a) = b  ->  {order, point (S), value (S)} */
function parseInitialCondition(st, y) {
  if (st.kind !== 'eq') return null;
  const l = st.lhs;
  if (l.t === 'bin' && l.op === '*' && (l.a.t === 'var' || l.a.t === 'dvar') && l.a.name === y && isConstantAst(l.b) && isConstantAst(st.rhs)) {
    return { order: l.a.t === 'dvar' ? l.a.order : 0, point: fromAst(l.b), value: fromAst(st.rhs) };
  }
  return null;
}

function odeResidualOk(F, y, x, sol) {
  // substitute y(x) = sol into F = 0 and test at sample points
  const orders = new Set();
  const walk = (e) => {
    if (e.k === 'v' && e.name.startsWith(y + "'")) orders.add(e.name.length - y.length);
    if (e.k === '+' || e.k === '*' || e.k === 'f') e.a.forEach(walk);
    else if (e.k === '^') {
      walk(e.b);
      walk(e.e);
    }
  };
  walk(F);
  const map = new Map([[y, sol]]);
  let d = sol;
  const maxO = Math.max(0, ...orders);
  for (let k = 1; k <= maxO; k++) {
    d = diffS(d, x);
    map.set(ysymName(y, k), d);
  }
  const R = subsMany(F, map);
  const consts = Array.from(varsOfS(sol)).filter((v) => /^C\d/.test(v));
  let good = 0;
  // several magnitudes for the constants, so that square roots and logarithms are defined at enough sample points
  for (const base of [0.7, 6, 45, -0.7, -6]) {
    for (let t = 0; t < 10; t++) {
      const env = { [x]: 0.3 + 0.37 * t };
      consts.forEach((c, i) => { env[c] = base * (1 + 1.3 * i) - 0.03 * t; });
      try {
        const r = numS(R, env);
        if (!isFinite(r)) continue;
        if (Math.abs(r) > 1e-6 * (1 + Math.abs(numS(sol, env)))) return false;
        good++;
      } catch (e) {
        continue;
      }
    }
  }
  return good >= 3;
}

function solveLinearS(rows, rhs) {
  // Gaussian elimination over S (small systems); returns array of S or null
  const n = rhs.length;
  const M = rows.map((r, i) => r.concat([rhs[i]]));
  for (let c = 0; c < n; c++) {
    let p = -1;
    for (let i = c; i < n; i++) {
      const v = numS(M[i][c], {});
      if (!isNumVal(M[i][c], 0) && Math.abs(v) > 1e-12) {
        p = i;
        break;
      }
    }
    if (p < 0) return null;
    [M[c], M[p]] = [M[p], M[c]];
    const inv = sPow(M[c][c], SM1);
    M[c] = M[c].map((v) => simp(sMul([v, inv])));
    for (let i = 0; i < n; i++) {
      if (i === c) continue;
      const f = M[i][c];
      if (isNumVal(f, 0)) continue;
      M[i] = M[i].map((v, k) => simp(sSub(v, sMul([f, M[c][k]]))));
    }
  }
  return M.map((r) => r[n]);
}

function applyInitialConditions(sol, y, x, ics, consts, out) {
  if (ics.length !== consts.length) throw new MathError('this equation needs ' + consts.length + ' initial condition' + (consts.length === 1 ? '' : 's') + ' (for example y(0) = 1) but ' + ics.length + ' were given');
  const zero = new Map(consts.map((c) => [c, S0]));
  const rows = [];
  const rhs = [];
  for (const ic of ics) {
    let d = sol;
    for (let k = 0; k < ic.order; k++) d = diffS(d, x);
    const at = subsS(d, x, ic.point);
    rows.push(consts.map((c) => simp(diffS(at, c))));
    rhs.push(simp(sSub(ic.value, subsMany(at, zero))));
  }
  if (consts.length === 1 && varsOfS(rows[0][0]).has(consts[0])) {
    // the constant enters non-linearly (for example y = K/(K - 1) with K = C1 e^x): solve  y(point) = value  for it
    let d = sol;
    for (let k = 0; k < ics[0].order; k++) d = diffS(d, x);
    const at = subsS(d, x, ics[0].point);
    const roots = solveLiteralFor(at, ics[0].value, consts[0]) || [];
    const good = roots.filter((r) => !Array.from(varsOfS(r)).length);
    if (!good.length) throw new MathError('the initial condition does not determine the constant');
    return subsMany(sol, new Map([[consts[0], good[0]]]));
  }
  const vals = solveLinearS(rows, rhs);
  if (!vals) throw new MathError('the initial conditions do not determine the constants');
  return subsMany(sol, new Map(consts.map((c, i) => [c, vals[i]])));
}

// ---- constant-coefficient equations -----------------------------------------------------------------
/** Roots of the characteristic polynomial, exactly where possible: [{re: S, im: S|null, mult}] (im > 0 for complex pairs). */
function charRootsS(cs) {
  const fp = factorPolyQ(ptrim(cs.slice()));
  const out = [];
  for (const { ints, mult } of fp.factors) {
    const P = intsToPoly(ints);
    if (ints.length === 2) out.push({ re: sN(new Q(-ints[0], ints[1])), im: null, mult });
    else if (ints.length === 3) {
      const [c, b, a] = ints;
      const D = b * b - 4n * a * c;
      const den = sI(2);
      const A2 = sN(new Q(2n * a));
      if (D > 0n) {
        const sq = sSqrt(sN(new Q(D)));
        out.push({ re: sDiv(sAdd([sN(new Q(-b)), sq]), A2), im: null, mult });
        out.push({ re: sDiv(sSub(sN(new Q(-b)), sq), A2), im: null, mult });
      } else {
        out.push({ re: sN(new Q(-b, 2n * a)), im: sDiv(sSqrt(sN(new Q(-D))), A2), mult });
      }
    } else {
      const r = polyRoots(P);
      r.real.forEach((z) => out.push({ re: decimalS(z.val), im: null, mult: z.mult * mult }));
      r.complex.filter((z) => z.im > 0).forEach((z) => out.push({ re: decimalS(z.re), im: decimalS(z.im), mult: (z.mult || 1) * mult }));
    }
  }
  return out;
}
function rootText(r) {
  return r.im ? fmtS(sAdd([r.re, sMul([r.im, sV('i')])])).replace(/\b(\d*)i\b/, (m) => m) : fmtS(r.re);
}
function homogeneousBasis(cs, x) {
  const roots = charRootsS(cs);
  const basis = [];
  const X = sV(x);
  for (const r of roots) {
    for (let m = 0; m < r.mult; m++) {
      const env = sMul([sPow(X, sI(m)), sExp(sMul([r.re, X]))]);
      if (!r.im) basis.push(env);
      else {
        basis.push(sMul([env, sFn('cos', [sMul([r.im, X])])]));
        basis.push(sMul([env, sFn('sin', [sMul([r.im, X])])]));
      }
    }
  }
  return { basis, roots };
}
/** Terms of the forcing function:  coef * x^m * e^(a x) * [cos|sin](b x)  -> [{m, a, b}] */
function forcingFamilies(g, x) {
  const fams = new Map();
  const add = (m, a, b) => {
    const k = m + '|' + a + '|' + b;
    if (!fams.has(k)) fams.set(k, { m, a, b });
    else fams.get(k).m = Math.max(fams.get(k).m, m);
  };
  for (const term of termsOf(expandS(g))) {
    let m = 0;
    let a = 0;
    let b = 0;
    for (const f of term.k === '*' ? term.a : [term]) {
      if (freeOf(f, x)) continue;
      if (f.k === 'v') m += 1;
      else if (f.k === '^' && f.b.k === 'v' && f.e.k === 'n' && f.e.q.isInt() && f.e.q.sign() > 0) m += Number(f.e.q.n);
      else if (f.k === '^' && isConstE(f.b) && linearIn(f.e, x) && freeOf(linearIn(f.e, x).b, x)) {
        const L = linearIn(f.e, x);
        if (!isNumVal(L.b, 0)) return null;
        a += numS(L.a, {});
      } else if (f.k === 'f' && (f.fn === 'sin' || f.fn === 'cos') && linearIn(f.a[0], x) && isNumVal(linearIn(f.a[0], x).b, 0)) {
        b = Math.abs(numS(linearIn(f.a[0], x).a, {}));
      } else return null;
    }
    add(m, a, b);
  }
  return Array.from(fams.values());
}
function undeterminedCoefficients(cs, g, x) {
  const fams = forcingFamilies(g, x);
  if (!fams) return null;
  const X = sV(x);
  const charRoots = (re, im) => {
    // multiplicity of re + i*im as a root of the characteristic polynomial
    const roots = polyRoots(ptrim(cs.slice()));
    let mult = 0;
    if (im === 0) roots.real.forEach((r) => { if (Math.abs(r.val - re) < 1e-9) mult += r.mult; });
    else roots.complex.forEach((z) => { if (Math.abs(z.re - re) < 1e-9 && Math.abs(Math.abs(z.im) - im) < 1e-9 && z.im > 0) mult += z.mult || 1; });
    return mult;
  };
  const basis = [];
  for (const { m, a, b } of fams) {
    const s = charRoots(a, b);
    const decA = decimalOrExact(a);
    const env = a === 0 ? S1 : sExp(sMul([decA, X]));
    const bb = decimalOrExact(b);
    for (let j = 0; j <= m; j++) {
      const pw = sPow(X, sI(j + s));
      if (b === 0) basis.push(sMul([pw, env]));
      else {
        basis.push(sMul([pw, env, sFn('cos', [sMul([bb, X])])]));
        basis.push(sMul([pw, env, sFn('sin', [sMul([bb, X])])]));
      }
    }
  }
  const apply = (f) => {
    let r = S0;
    let d = f;
    for (let k = 0; k < cs.length; k++) {
      if (!cs[k].isZero()) r = sAdd([r, sMul([sN(cs[k]), d])]);
      d = diffS(d, x);
    }
    return r;
  };
  const Lb = basis.map(apply);
  const nU = basis.length;
  const pts = [];
  for (let t = 0; t < nU + 6; t++) pts.push(0.21 + 0.31 * t);
  const A = pts.map((p) => Lb.map((e) => numS(e, { [x]: p })));
  const rhs = pts.map((p) => numS(g, { [x]: p }));
  // normal equations
  const AtA = [];
  const Atb = [];
  for (let i = 0; i < nU; i++) {
    AtA.push([]);
    for (let j = 0; j < nU; j++) AtA[i].push(A.reduce((s, row) => s + row[i] * row[j], 0));
    Atb.push(A.reduce((s, row, k) => s + row[i] * rhs[k], 0));
  }
  const sol = solveFloatLinear(AtA, Atb);
  if (!sol) return null;
  const terms = sol.map((v, i) => {
    const fr = toFraction(v, 400);
    if (!fr) return null;
    return sMul([sN(new Q(BigInt(fr.p), BigInt(fr.q))), basis[i]]);
  });
  if (terms.some((t) => t === null)) return null;
  const yp = sAdd(terms);
  return sameFunction(apply(yp), g, [x]) ? yp : null;
}
const decimalOrExact = (v) => {
  const fr = toFraction(v, 200);
  return fr ? sN(new Q(BigInt(fr.p), BigInt(fr.q))) : decimalS(v);
};

/** ln|u| -> ln u: an integrating factor only has to be some non-zero multiple of e^(integral), so the sign can go */
const stripLnAbs = (e) => (e.k === 'f' && e.fn === 'ln' && e.a[0].k === 'f' && e.a[0].fn === 'abs' ? sFn('ln', [e.a[0].a[0]]) : e.k === '+' || e.k === '*' || e.k === '^' || e.k === 'f' ? mapS(e, stripLnAbs) : e);

// ---- main entry --------------------------------------------------------------------------------------------
function solveODEStatements(sts) {
  let readAs = sts.map(showStatement).join(';  ');
  if (sts.some((s) => s.kind !== 'eq')) throw new MathError('a differential equation is written with "=" (for example y\' + 2y = x)');
  // dependent variable
  let y = null;
  const findY = (n) => {
    if (n.t === 'dvar') y = y || n.name;
    else if (n.t === 'neg' || n.t === 'fact' || n.t === 'pct' || n.t === 'named') findY(n.a);
    else if (n.t === 'bin') {
      findY(n.a);
      findY(n.b);
    } else if (n.t === 'call') n.args.forEach(findY);
  };
  sts.forEach((s) => {
    findY(s.lhs);
    findY(s.rhs);
  });
  const ics = [];
  const odes = [];
  // several unknown functions: a system
  const depNames = [];
  const findDeps = (n) => {
    if (n.t === 'dvar') {
      if (!depNames.includes(n.name)) depNames.push(n.name);
    } else if (n.t === 'neg' || n.t === 'fact' || n.t === 'pct' || n.t === 'named') findDeps(n.a);
    else if (n.t === 'bin') {
      findDeps(n.a);
      findDeps(n.b);
    } else if (n.t === 'call') n.args.forEach(findDeps);
  };
  sts.forEach((s) => {
    findDeps(s.lhs);
    findDeps(s.rhs);
  });
  if (depNames.length >= 2) {
    const sysIcs = [];
    const sysOdes = [];
    sts.forEach((st) => {
      const ic = parseSystemIC(st, depNames);
      if (ic) sysIcs.push(ic);
      else sysOdes.push(st);
    });
    const sysOut = newOut();
    sysOut.work.push('Type: system of ' + sysOdes.length + ' linear differential equations with constant coefficients (eigenvalues and eigenvectors of the matrix)');
    odeSystemSolve(sts, sysOdes, sysIcs, sysOut);
    return { readAs: sts.map((st) => (parseSystemIC(st, depNames) ? st.lhs.a.name + '(' + showRaw(st.lhs.b) + ') = ' + showRaw(st.rhs) : showStatement(st))).join(';  '), out: sysOut };
  }
  for (const st of sts) {
    const ic = parseInitialCondition(st, y);
    if (ic) ics.push(ic);
    else odes.push(st);
  }
  if (odes.length !== 1) throw new MathError(odes.length ? 'I can solve one differential equation at a time' : 'no differential equation was found');
  const st = odes[0];
  readAs = sts.map((s) => {
    if (s === st) return showStatement(s);
    return showRaw({ t: 'var', name: y + (s.lhs.a.t === 'dvar' ? "'".repeat(s.lhs.a.order) : '') }) + '(' + showRaw(s.lhs.b) + ') = ' + showRaw(s.rhs);
  }).join(';  ');
  const names = new Set();
  collectVars(st.lhs, names);
  collectVars(st.rhs, names);
  names.delete(y);
  const x = names.size === 1 ? Array.from(names)[0] : names.size === 0 ? 'x' : null;
  if (!x) throw new MathError('the equation has more than one independent variable (' + Array.from(names).sort().join(', ') + ')');
  const F = simp(sSub(fromAst(st.lhs), fromAst(st.rhs)));
  const out = newOut();
  // derivative orders present
  const orders = new Set();
  odeVars(st.lhs, y, orders);
  odeVars(st.rhs, y, orders);
  const n = Math.max(...orders);
  if (n > 6) throw new MathError('only equations up to order 6 are supported');
  const ysym = (k) => ysymName(y, k);
  const hasY = (e) => Array.from(varsOfS(e)).some((v) => v === y || v.startsWith(y + "'"));
  // linear in y, y', ... ?
  const cks = [];
  let linear = true;
  for (let k = 0; k <= n; k++) {
    const c = simp(diffS(F, ysym(k)));
    if (hasY(c)) linear = false;
    cks.push(c);
  }
  let g = F;
  if (linear) {
    for (let k = 0; k <= n; k++) g = simp(expandS(sSub(g, sMul([cks[k], sV(ysym(k))]))));
    if (hasY(g)) linear = false;
  }
  const consts = [];
  let sol = null;
  let sepAlt = [];
  const C = (i) => 'C' + i;
  out.work.push('Type: ' + (linear ? 'linear' : 'non-linear') + ' differential equation of order ' + n);
  if (linear) {
    const isConstCoef = cks.every((c) => freeOf(c, x) && c.k === 'n');
    if (n === 1) {
      const a1 = cks[1];
      const p = simp(sDiv(cks[0], a1));
      const q = simp(sDiv(sNeg(g), a1));
      const P = antiderivative(p, x) || (freeOf(p, x) ? sMul([p, sV(x)]) : null);
      if (!P) throw new MathError('I could not integrate the coefficient of y to build the integrating factor');
      const mu = sExp(stripLnAbs(P));
      const integrand = simp(sMul([mu, q]));
      const I = isNumVal(integrand, 0) ? S0 : antiderivative(integrand, x);
      if (!I) throw new MathError('I could not integrate (integrating factor) × (right-hand side)');
      sol = expandS(sMul([sPow(mu, SM1), sAdd([I, sV(C(1))])]));
      consts.push(C(1));
      out.work.push('First-order linear: integrating factor μ = ' + fmtS(mu));
    } else if (isConstCoef) {
      const cs = cks.map((c) => c.q);
      const { basis, roots } = homogeneousBasis(cs, x);
      let yh = S0;
      basis.forEach((b, i) => {
        yh = sAdd([yh, sMul([sV(C(i + 1)), b])]);
        consts.push(C(i + 1));
      });
      out.work.push('Characteristic equation: ' + polyText(cs, 'r') + ' = 0   (roots: ' + roots.map((r) => (r.im ? fmtS(r.re) + ' ± ' + fmtS(r.im) + 'i' : fmtS(r.re)) + (r.mult > 1 ? ' (×' + r.mult + ')' : '')).join(', ') + ')');
      let yp = S0;
      if (!isNumVal(simp(g), 0)) {
        const rhs = simp(expandS(hyperToExp(simp(sNeg(g)))));
        yp = undeterminedCoefficients(cs, rhs, x);
        if (yp) out.work.push('Particular solution (undetermined coefficients): ' + fmtS(yp));
        else if (n === 2) {
          yp = variationOfParameters(basis[0], basis[1], simp(sDiv(rhs, sN(cs[2]))), x);
          if (!yp) throw new MathError('I could not integrate the terms needed for variation of parameters');
          out.work.push('Particular solution (variation of parameters): ' + fmtS(yp));
        } else throw new MathError('I can handle forcing terms made of polynomials, exponentials, sines and cosines (and products of them); order 2 also any forcing whose integrals I can find');
      }
      sol = sAdd([yh, yp]);
    } else if (n === 2) {
      const eu = eulerCauchy(cks, simp(g), x, consts, out);
      if (!eu) throw new MathError('linear equations of order 2 or more need constant coefficients (or the Euler form a·x²·y\'\' + b·x·y\' + c·y = 0)');
      sol = eu.sol;
    } else {
      throw new MathError('linear equations of order 3 or more need constant coefficients here');
    }
  } else if (n === 1) {
    // y' = h(x, y)? separable?
    const cp = simp(diffS(F, ysym(1)));
    const rest = simp(sSub(F, sMul([cp, sV(ysym(1))])));
    let nonSep = hasY(cp) && cp.k !== 'n';
    const h = simp(sDiv(sNeg(rest), cp));
    const fx = [];
    const gy = [];
    for (const f of nonSep ? [] : h.k === '*' ? h.a : [h]) {
      const dx = !freeOf(f, x);
      const dy = Array.from(varsOfS(f)).includes(y);
      if (dx && dy) {
        nonSep = true;
        break;
      }
      if (dy) gy.push(f);
      else fx.push(f);
    }
    if (nonSep) {
      const special = firstOrderSpecial(F, cp, rest, h, y, x, consts, out);
      if (!special) throw new MathError('this equation is not separable, linear, Bernoulli, homogeneous or exact; other methods are not available');
      if (special.implicit) return { readAs, out };
      sol = special.sol;
      sepAlt = special.alt || [];
    } else {
    const fxS = sMul(fx);
    const gyS = sMul(gy);
    const Y = '$y';
    const gyv = subsS(gyS, y, sV(Y));
    const Gy = antiderivative(simp(sPow(gyv, SM1)), Y);
    const Fx = antiderivative(fxS, x) || (freeOf(fxS, x) ? sMul([fxS, sV(x)]) : null);
    // an explicit solution from another method (Bernoulli, ...) is preferred to an implicit one, or to none
    const viaSpecial = () => {
      const keep = [out.answer.length, out.work.length, out.notes.length, consts.slice()];
      const sp = firstOrderSpecial(F, cp, rest, h, y, x, consts, out);
      if (sp && !sp.implicit) return sp;
      out.answer.length = keep[0];
      out.work.length = keep[1];
      out.notes.length = keep[2];
      consts.length = 0;
      keep[3].forEach((c) => consts.push(c));
      return null;
    };
    let special = null;
    if (!Gy || !Fx) {
      special = viaSpecial();
      if (!special) throw new MathError('I could not integrate one side of the separated equation');
    } else {
      consts.push(C(1));
      out.work.push('Separable: ∫ dy/g(y) = ∫ f(x) dx   with g(y) = ' + fmtS(gyS) + ', f(x) = ' + fmtS(fxS));
      // try to solve for y explicitly
      const G = subsS(Gy, Y, sV(y));
      const R = sAdd([Fx, sV(C(1))]);
      const cands = solveSeparable(G, R, y, x, Fx).filter((c) => odeResidualOk(F, y, x, c));
      if (!cands.length) {
        const workKeep = out.work.length;
        special = viaSpecial();
        if (!special) {
          out.work.length = workKeep;
          out.answer.push(fmtS(G) + ' = ' + fmtS(R));
          out.notes.push('The solution is given implicitly; I could not solve it for y in closed form.');
          return { readAs, out };
        }
        const sepAt = out.work.findIndex((w) => /^Separable:/.test(w));
        if (sepAt >= 0) out.work.splice(sepAt, 1);
      } else {
        sol = cands[0];
        sepAlt = cands.slice(1);
      }
    }
    if (special) {
      sol = special.sol;
      sepAlt = special.alt || [];
    }
    }
  } else {
    throw new MathError('I can solve first-order linear or separable equations and linear equations with constant coefficients');
  }
  sol = simp(sol);
  consts.splice(0, consts.length, ...new Set(consts));
  // an arbitrary constant absorbs the sign:  C1*|x|  ->  C1*x
  const dropAbs = (e) => (e.k === 'f' && e.fn === 'abs' ? e.a[0] : e.k === '+' || e.k === '*' || e.k === '^' || e.k === 'f' ? mapS(e, dropAbs) : e);
  const dropAbsInC = (e) => simp(sAdd(termsOf(e).map((t) => (Array.from(varsOfS(t)).some((v) => /^C\d+$/.test(v)) ? dropAbs(t) : t))));
  if (!ics.length) {
    sol = dropAbsInC(sol);
    sepAlt = sepAlt.map((a) => dropAbsInC(simp(a)));
  }
  if (ics.length) {
    if (consts.length !== ics.length) throw new MathError('this equation needs ' + consts.length + ' initial condition' + (consts.length === 1 ? '' : 's') + ' but ' + ics.length + ' were given');
    const options = [sol].concat(sepAlt);
    let chosen = null;
    for (const cand of options) {
      try {
        const s2 = simp(applyInitialConditions(cand, y, x, ics, consts, out));
        const fits = ics.every((ic) => {
          let d = s2;
          for (let k = 0; k < ic.order; k++) d = diffS(d, x);
          const v = numS(subsS(d, x, ic.point), {});
          return isFinite(v) && Math.abs(v - numS(ic.value, {})) < 1e-6 * (1 + Math.abs(v));
        });
        if (fits && odeResidualOk(F, y, x, s2)) {
          chosen = s2;
          break;
        }
      } catch (e) {
        if (!(e instanceof MathError)) throw e;
      }
    }
    if (!chosen) throw new MathError('no solution of this equation satisfies the initial conditions');
    sol = chosen;
    sepAlt = [];
  }
  const ok = odeResidualOk(F, y, x, sol);
  out.answer.push(y + ' = ' + fmtODE(sol));
  sepAlt.forEach((alt) => out.answer.push(y + ' = ' + fmtODE(simp(alt))));
  out.check = ok ? 'substituting the solution back into the equation gives 0' : null;
  if (!ok) out.notes.push('The automatic check of the solution did not pass; please verify it.');
  if (!ics.length) out.notes.push(consts.length === 1 ? 'C1 is an arbitrary constant; an initial condition such as y(0) = 1 fixes it.' : consts.join(', ').replace(/, ([^,]*)$/, ' and $1') + ' are arbitrary constants; initial conditions such as y(0) = 1 and y\'(0) = 0 fix them.');
  return { readAs, out };
}

/** G(y) = R(x) (R contains C1)  ->  candidate solutions y(x); the caller verifies them. */
function solveSeparable(G, R, y, x, Fx) {
  const Y = sV(y);
  const C1 = sV('C1');
  const cands = [];
  // c*ln|y| = R   ->   y = C1 * e^(Fx / c)
  const g0 = simp(G);
  const lnTerm = g0.k === '+' ? null : splitCoef(g0);
  if (lnTerm && lnTerm[1].k === 'f' && lnTerm[1].fn === 'ln') cands.push(sMul([C1, sExp(sDiv(Fx, sN(lnTerm[0])))]));
  // c ln|u1| - c ln|u2| = R with u1, u2 linear in y  ->  u1 = K u2,  K = C1 e^(Fx/c)
  const lnPair = termsOf(g0).map(splitCoef);
  if (lnPair.length === 2 && lnPair.every(([c, t]) => c instanceof Q && t.k === 'f' && t.fn === 'ln') && lnPair[0][0].add(lnPair[1][0]).isZero()) {
    const bare = (t) => (t.a[0].k === 'f' && t.a[0].fn === 'abs' ? t.a[0].a[0] : t.a[0]);
    const p1 = polyCoeffsS(bare(lnPair[0][1]), y);
    const p2 = polyCoeffsS(bare(lnPair[1][1]), y);
    if (p1 && p2 && p1.length <= 2 && p2.length <= 2 && p1.length + p2.length >= 3) {
      const K = sMul([C1, sExp(sDiv(Fx, sN(lnPair[0][0])))]);
      const [b1, a1] = [p1[0], p1[1] || S0];
      const [b2, a2] = [p2[0], p2[1] || S0];
      cands.push(sDiv(sSub(sMul([K, b2]), b1), sSub(a1, sMul([K, a2]))));
    }
  }
  if (lnTerm && lnTerm[0] instanceof Q && lnTerm[1].k === 'f' && lnTerm[1].fn === 'ln') {
    const inner = lnTerm[1].a[0].k === 'f' && lnTerm[1].a[0].fn === 'abs' ? lnTerm[1].a[0].a[0] : lnTerm[1].a[0];
    const pq = polyCoeffsS(inner, y);
    if (pq && pq.length === 3) {
      const E = sMul([C1, sExp(sDiv(Fx, sN(lnTerm[0])))]);
      const disc = sSub(sMul([pq[1], pq[1]]), sMul([sI(4), pq[2], sSub(pq[0], E)]));
      const r = sSqrt(disc);
      cands.push(sDiv(sAdd([sNeg(pq[1]), r]), sMul([sI(2), pq[2]])), sDiv(sSub(sNeg(pq[1]), r), sMul([sI(2), pq[2]])));
    }
  }
  const cf = polyCoeffsS(G, y);
  if (cf && cf.length === 2 && freeOf(cf[1], y)) cands.push(sDiv(sSub(R, cf[0]), cf[1]));
  if (cf && cf.length === 3 && isNumVal(cf[1], 0)) {
    const r = sSqrt(sDiv(sSub(R, cf[0]), cf[2]));
    cands.push(r, sNeg(r));
  }
  if (G.k === 'f' && G.fn === 'atan') cands.push(sFn('tan', [R]));
  const inv = polyCoeffsS(simp(sMul([G, Y])), y);
  if (inv && inv.length === 1) cands.push(sDiv(inv[0], R));
  // G = -ln|1 - y|  and similar: try e^(-R) forms
  if (g0.k === 'f' || (g0.k === '*' && g0.a.some((t) => t.k === 'f' && t.fn === 'ln'))) {
    const c = splitCoef(g0);
    if (c[1].k === 'f' && c[1].fn === 'ln' && c[1].a[0].k === 'f' && c[1].a[0].fn === 'abs') {
      const inner = c[1].a[0].a[0];
      const lin = polyCoeffsS(inner, y);
      if (lin && lin.length === 2) cands.push(sDiv(sSub(sMul([C1, sExp(sDiv(Fx, sN(c[0])))]), lin[0]), lin[1]));
    }
  }
  return cands;
}
