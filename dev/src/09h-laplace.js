// ======================================================================
// 9h. Laplace transforms:  laplace(f, t, s)  and  ilaplace(F, s, t)
//     Table rules with linearity, the shift theorem and multiplication by t^n; the inverse
//     uses partial fractions (linear and quadratic factors).
// ======================================================================
function rewriteHyperbolic(f) {
  const walk = (e) => {
    if (e.k === 'f' && (e.fn === 'sinh' || e.fn === 'cosh') && e.a.length === 1) {
      const a = walk(e.a[0]);
      const ep = sExp(a);
      const em = sExp(sNeg(a));
      return e.fn === 'sinh' ? sMul([sN(new Q(1n, 2n)), sSub(ep, em)]) : sMul([sN(new Q(1n, 2n)), sAdd([ep, em])]);
    }
    if (e.k === '+' || e.k === '*' || e.k === '^' || e.k === 'f') return mapS(e, walk);
    return e;
  };
  return walk(f);
}
function linearIn_(g, t) {
  // g = a1*t + a0 (a1, a0 free of t)
  const cs = polyCoeffsS(g, t);
  if (!cs || cs.length > 2) return null;
  return { a1: cs.length === 2 ? cs[1] : S0, a0: cs[0] };
}
/** One product term c·t^n·e^(a t)·(trig or nothing) -> its Laplace transform in s. */
function laplaceTerm(term, t, s) {
  const fs = term.k === '*' ? term.a : [term];
  const consts = [];
  let n = 0;
  let a = S0;
  let trig = null;
  for (const f of fs) {
    if (freeOf(f, t)) consts.push(f);
    else if (f.k === 'v' && f.name === t) n += 1;
    else if (f.k === '^' && f.b.k === 'v' && f.b.name === t && f.e.k === 'n' && f.e.q.isInt() && f.e.q.sign() >= 0) n += Number(f.e.q.n);
    else if (f.k === '^' && isConstE(f.b)) {
      const lin = linearIn_(f.e, t);
      if (!lin) throw new MathError('unsupported exponent in the Laplace transform: ' + fmtS(f));
      a = sAdd([a, lin.a1]);
      consts.push(sExp(lin.a0));
    } else if (f.k === 'f' && (f.fn === 'sin' || f.fn === 'cos') && !trig) {
      const lin = linearIn_(f.a[0], t);
      if (!lin || !zeroS(simp(lin.a0)) || zeroS(simp(lin.a1))) throw new MathError('only sin(bt) and cos(bt) are supported (no phase shift); write sin(t + c) as an expanded sum');
      trig = { fn: f.fn, b: lin.a1 };
    } else throw new MathError('I cannot transform the factor ' + fmtS(f) + ' (supported: powers of t, e^(at), sin(bt), cos(bt), sums and constants)');
  }
  const sa = sSub(sV(s), a);
  let G;
  if (!trig) G = sPow(sa, SM1);
  else if (trig.fn === 'sin') G = sDiv(trig.b, sAdd([sq(sa), sq(trig.b)]));
  else G = sDiv(sa, sAdd([sq(sa), sq(trig.b)]));
  for (let i = 0; i < n; i++) G = sNeg(diffS(G, s));
  return sMul(consts.concat([G]));
}
function laplaceTransformS(f, t, s) {
  let g = expandS(rewriteHyperbolic(simp(f)));
  // trig powers / products -> multiple angles when a power or a product of trig functions is present
  const kids = (e) => (e.k === '+' || e.k === '*' || e.k === 'f' ? e.a : e.k === '^' ? [e.b, e.e] : []);
  const isTrig = (x) => x.k === 'f' && (x.fn === 'sin' || x.fn === 'cos');
  const hasTrigPower = (e) => (e.k === '^' && isTrig(e.b)) || (e.k === '*' && e.a.filter(isTrig).length > 1) || kids(e).some(hasTrigPower);
  if (hasTrigPower(g)) {
    g = rewriteTrigProducts(g, t);
    g = expandS(g);
  }
  const parts = termsOf(g).map((tm) => laplaceTerm(tm, t, s));
  return sAdd(parts);
}
/** sin^2(bt) = (1 - cos 2bt)/2, sin·cos = sin(2bt)/2 ... (product-to-sum rules for sin/cos with linear arguments) */
function rewriteTrigProducts(e, t) {
  const walk = (x) => {
    if (x.k === '^' && x.b.k === 'f' && (x.b.fn === 'sin' || x.b.fn === 'cos') && x.e.k === 'n' && x.e.q.isInt() && x.e.q.n >= 2n && x.e.q.n <= 8n) {
      let r = S1;
      const k = Number(x.e.q.n);
      let acc = [x.b];
      for (let i = 1; i < k; i++) acc.push(x.b);
      acc = acc.map((q) => walk(q));
      r = acc.reduce((p, q) => productToSum(p, q), S1);
      return r;
    }
    if (x.k === '*') {
      const trig = x.a.filter((q) => (q.k === 'f' && (q.fn === 'sin' || q.fn === 'cos')) || (q.k === '^' && q.b.k === 'f'));
      if (trig.length > 1 || trig.some((q) => q.k === '^')) {
        const others = x.a.filter((q) => !trig.includes(q));
        const prod = trig.map(walk).reduce((p, q) => productToSum(p, q), S1);
        return expandS(sMul(others.concat([prod])));
      }
    }
    if (x.k === '+' || x.k === '*' || x.k === '^' || x.k === 'f') return mapS(x, walk);
    return x;
  };
  return walk(e);
}
function productToSum(p, q) {
  // p, q are sums of terms c·sin/cos(b t); multiply with the product-to-sum identities
  const pa = termsOf(expandS(p));
  const qa = termsOf(expandS(q));
  const out = [];
  pa.forEach((x) => qa.forEach((y) => out.push(trigPair(x, y))));
  return sAdd(out);
}
function splitTrig(term) {
  const fs = term.k === '*' ? term.a : [term];
  const trig = fs.find((f) => f.k === 'f' && (f.fn === 'sin' || f.fn === 'cos'));
  if (!trig) return { c: term, trig: null };
  return { c: sMul(fs.filter((f) => f !== trig)), trig };
}
function trigPair(x, y) {
  const A = splitTrig(x);
  const B = splitTrig(y);
  if (!A.trig || !B.trig) return sMul([x, y]);
  const c = sMul([A.c, B.c]);
  const u = A.trig.a[0];
  const v = B.trig.a[0];
  const sum = (a, b) => simp(sAdd([a, b]));
  const diff = (a, b) => simp(sSub(a, b));
  const h = sN(new Q(1n, 2n));
  const f = A.trig.fn;
  const g = B.trig.fn;
  if (f === 'sin' && g === 'sin') return sMul([c, h, sSub(sFn('cos', [diff(u, v)]), sFn('cos', [sum(u, v)]))]);
  if (f === 'cos' && g === 'cos') return sMul([c, h, sAdd([sFn('cos', [diff(u, v)]), sFn('cos', [sum(u, v)])])]);
  if (f === 'sin' && g === 'cos') return sMul([c, h, sAdd([sFn('sin', [sum(u, v)]), sFn('sin', [diff(u, v)])])]);
  return sMul([c, h, sAdd([sFn('sin', [sum(u, v)]), sFn('sin', [diff(v, u)])])]);
}

defCmd('laplace laplacetransform', (n) => {
  needArgs(n, 1, 3, 'f(t), and optionally the variables t and s');
  const f = fromAst(n.args[0]);
  const t = n.args[1] ? varOfArg(n.args[1]) : singleVarOf(f, 't');
  const s = n.args[2] ? varOfArg(n.args[2]) : t === 's' ? 'p' : 's';
  const out = newOut();
  const F = laplaceTransformS(f, t, s);
  let shown = simp(F);
  try {
    const tog = simp(togetherDeep(shown));
    if (fmtS(tog).length <= fmtS(shown).length * 1.5) shown = tog;
  } catch (e) {
    // keep the sum of fractions
  }
  out.answer.push('L{' + fmtS(f) + '} = ' + fmtS(shown));
  out.work.push('Linearity, L{tⁿ eᵃᵗ sin bt} etc. from the table, and multiplication by t as −d/ds');
  // numerical check of the defining integral at a safe value of s
  try {
    const s0 = 9;
    const lhs = integrateNumeric(simp(sMul([f, sExp(sMul([sI(-s0), sV(t)]))])), t, 0, 60);
    const rhs = numS(F, { [s]: s0 });
    if (lhs.ok && Math.abs(lhs.value - rhs) < 1e-6 * (1 + Math.abs(rhs))) out.check = 'the defining integral ∫₀^∞ f(t)·e^(−st) dt at s = ' + s0 + ' equals ' + fmtNum(rhs);
  } catch (e) {
    // no numerical check
  }
  out.notes.push('Valid for s larger than the largest exponent of e^(at) in f.');
  out.value = { S: shown };
  return out;
});
COMMANDS.laplace.show = (n) => 'L{' + showRaw(n.args[0]) + '}';

// ---- inverse transform -------------------------------------------------------------------------------------------------
function ilaplaceTerm(term, s, t) {
  const fac = term.fac;
  const num = term.num;
  const k = term.power;
  const T = sV(t);
  const qS = (q) => sN(q);
  if (fac.length === 2) {
    // (s - a)^k   with fac = s + c0/c1
    const a = fac[0].neg().div(fac[1]);
    const A = num[0].div(fac[1].pow(k));
    const kf = bigFactorial(BigInt(k - 1));
    return sMul([qS(A.div(new Q(kf))), sPow(T, sI(k - 1)), sExp(sMul([qS(a), T]))]);
  }
  if (fac.length === 3) {
    // normalise to s^2 + p s + q
    const c2 = fac[2];
    const p = fac[1].div(c2);
    const q = fac[0].div(c2);
    const a = p.neg().div(qInt(2));
    const w2 = q.sub(p.mul(p).div(qInt(4)));
    const N1 = num.length > 1 ? num[1] : Q0;
    const N0 = num[0];
    const scale = c2.pow(k);
    const L = N1.div(scale);
    const M = N0.div(scale);
    const shiftM = M.add(L.mul(a)); // numerator L (s - a) + (M + L a)
    const e = sExp(sMul([qS(a), T]));
    const root = simp(sSqrt(qS(w2.abs())));
    const rt = sMul([root, T]);
    // f_k = L^-1{1/(u^2 + w2)^k},  g_k = L^-1{u/(u^2 + w2)^k}  (u = s - a), by the recursion
    //   g_k = t f_(k-1) / (2(k-1)),   f_k = (f_(k-1) - g_k') / w2
    let f = w2.sign() > 0 ? sDiv(sFn('sin', [rt]), root) : sDiv(sFn('sinh', [rt]), root);
    let g = w2.sign() > 0 ? sFn('cos', [rt]) : sFn('cosh', [rt]);
    for (let j = 2; j <= k; j++) {
      g = expandS(sMul([T, f, sN(new Q(1n, BigInt(2 * (j - 1))))]));
      f = expandS(sDiv(sSub(f, diffS(g, t)), qS(w2)));
    }
    return sMul([e, sAdd([sMul([qS(L), g]), sMul([qS(shiftM), f])])]);
  }
  throw new MathError('I can invert fractions whose denominators factor into linear terms (any power) and quadratics (any power)');
}
function inverseLaplaceS(F, s, t) {
  const rf = toRFS(expandS(F), s);
  if (rf.n.length >= rf.d.length) throw new MathError('the fraction must be proper (the numerator of lower degree than the denominator); an improper one would need delta functions');
  const ap = apartRF(rf);
  let f = S0;
  ap.terms.forEach((tm) => {
    f = sAdd([f, ilaplaceTerm(tm, s, t)]);
  });
  return f;
}
defCmd('ilaplace inverselaplace', (n) => {
  needArgs(n, 1, 3, 'F(s), and optionally the variables s and t');
  const F = fromAst(n.args[0]);
  const s = n.args[1] ? varOfArg(n.args[1]) : singleVarOf(F, 's');
  const t = n.args[2] ? varOfArg(n.args[2]) : s === 't' ? 'x' : 't';
  const out = newOut();
  const f = simp(expandS(inverseLaplaceS(F, s, t)));
  out.answer.push('L⁻¹{' + fmtS(F) + '} = ' + fmtS(f));
  out.work.push('Partial fractions of F(s), then the table entries 1/(s−a)ⁿ, (s−a)/((s−a)²+b²), b/((s−a)²+b²)');
  try {
    const back = laplaceTransformS(f, t, s);
    if (sameFunction(simp(back), simp(F), [s], 6)) out.check = 'transforming the result back gives F(s)';
  } catch (e) {
    // no check
  }
  out.value = { S: f };
  return out;
});
COMMANDS.ilaplace.show = (n) => 'L⁻¹{' + showRaw(n.args[0]) + '}';
