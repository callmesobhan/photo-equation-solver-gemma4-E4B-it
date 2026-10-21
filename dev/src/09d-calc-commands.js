
// ======================================================================
// 9d. Calculus commands: diff, integrate, limit, taylor, sum, product
// ======================================================================
const SUB_DIGITS = '₀₁₂₃₄₅₆₇₈₉';
const withValue = (out, S) => {
  out.value = { S };
  return out;
};

// ---- derivative ----------------------------------------------------------------------------------------------
function rulesUsed(S, x) {
  const rules = new Set();
  const walk = (e) => {
    if (freeOf(e, x)) return;
    if (e.k === '*' && e.a.filter((t) => !freeOf(t, x)).length > 1) rules.add('product rule');
    if (e.k === '^') {
      if (e.e.k === 'n' && e.e.q.sign() < 0) rules.add('quotient rule');
      if (e.e.k === 'n' && !(e.b.k === 'v')) rules.add('chain rule');
      if (!freeOf(e.e, x)) rules.add('exponential / logarithmic differentiation');
      if (e.e.k === 'n' && e.b.k === 'v') rules.add('power rule');
    }
    if (e.k === 'f' && !(e.a[0].k === 'v')) rules.add('chain rule');
    if (e.k === '+' || e.k === '*' || e.k === 'f') e.a.forEach(walk);
    else if (e.k === '^') {
      walk(e.b);
      walk(e.e);
    }
  };
  walk(S);
  return Array.from(rules);
}
defCmd('diff derivative', (n) => {
  needArgs(n, 1, 4, 'an expression, the variable, and optionally the order');
  const out = newOut();
  const S = fromAst(n.args[0]);
  const v = n.args[1] ? varOfArg(n.args[1]) : singleVarOf(S);
  const order = n.args[2] ? Number(intArg(n.args[2])) : 1;
  if (order < 1 || order > 12) throw new MathError('the order of the derivative must be between 1 and 12');
  let d = S;
  for (let i = 0; i < order; i++) d = diffS(d, v);
  out.answer.push(fmtS(d));
  const rules = rulesUsed(S, v);
  out.work.push('d' + (order > 1 ? toSup(String(order)) : '') + '/d' + v + (order > 1 ? toSup(String(order)) : '') + ' of ' + fmtS(S));
  if (rules.length) out.work.push('Rules used: ' + rules.join(', '));
  if (order === 1) {
    // numerical check with a central difference
    const p = 0.7;
    const h = 1e-5;
    const others = {};
    Array.from(varsOfS(S)).forEach((u) => { if (u !== v) others[u] = 1.3; });
    try {
      const num = (numS(S, { ...others, [v]: p + h }) - numS(S, { ...others, [v]: p - h })) / (2 * h);
      const ex = numS(d, { ...others, [v]: p });
      if (isFinite(num) && isFinite(ex) && Math.abs(num - ex) < 1e-5 * (1 + Math.abs(ex))) out.check = 'a numerical difference quotient at ' + v + ' = ' + p + ' agrees with the result';
    } catch (e) {
      // no check
    }
  }
  return withValue(out, d);
});
COMMANDS.diff.show = (n) => {
  const ord = n.args[2] ? showRaw(n.args[2]) : '1';
  const v = n.args[1] ? showRaw(n.args[1]) : 'x';
  return 'd' + (ord !== '1' ? '^' + ord : '') + '/d' + v + (ord !== '1' ? '^' + ord : '') + ' [' + showRaw(n.args[0]) + ']';
};

// ---- integrals -----------------------------------------------------------------------------------------------------
/** Value of F at a bound (limit when the bound is infinite or F blows up there). Returns S or null. */
function endValue(F, v, bound, side) {
  if (!bound.inf) {
    const an = numS(bound.S, {});
    if (!singularAt(F, v, an)) {
      const s = subsS(F, v, bound.S);
      if (isFinite(numS(s, {}))) return s;
    }
  }
  const r = limitOf(F, v, bound.inf ? bound : { S: bound.S }, bound.inf ? 0 : side);
  if (r.kind === 'value') return r.S || (r.num !== undefined ? decimalS(r.num) : null);
  return null;
}
function decimalS(x) {
  const t = String(Number(x.toPrecision(15)));
  if (/e/.test(t)) return sN(new Q(BigInt(Math.round(x * 1e12)), 1000000000000n));
  return sN(qFromLiteral(t.replace(/^-/, '')).mul(x < 0 ? qInt(-1) : Q1));
}
function intLimitsText(lo, hi) {
  return boundText(lo) + ' to ' + boundText(hi);
}
defCmd('integrate integral', (n) => {
  needArgs(n, 1, 4, 'an expression, the variable, and optionally the two limits');
  const out = newOut();
  let args = n.args.slice();
  const S = fromAst(args[0]);
  let v;
  let bounds = null;
  if (args.length === 1) v = singleVarOf(S);
  else if (args.length === 3 && args[1].t !== 'var') {
    v = singleVarOf(S);
    bounds = [args[1], args[2]];
  } else {
    v = varOfArg(args[1]);
    if (args.length === 4) bounds = [args[2], args[3]];
    else if (args.length === 3) throw new MathError('a definite integral needs both limits');
  }
  if (!bounds) {
    const F = antiderivative(S, v);
    if (!F) {
      throw new MathError('I could not find an antiderivative of ' + fmtS(S) + ' with my methods (it may not have an elementary one)');
    }
    out.answer.push(fmtS(F) + ' + C');
    out.check = 'differentiating the result gives back the integrand';
    return withValue(out, F);
  }
  const lo = boundOf(bounds[0]);
  const hi = boundOf(bounds[1]);
  const a = boundNum(lo);
  const b = boundNum(hi);
  const num = integrateNumeric(S, v, a, b);
  out.work.push('Definite integral of ' + fmtS(S) + ' from ' + intLimitsText(lo, hi));
  if (num.diverges) {
    out.answer.push('diverges' + (num.note ? ' (' + num.note + ')' : ''));
    return out;
  }
  const F = antiderivative(S, v);
  let exact = null;
  if (F) {
    try {
      const top = endValue(F, v, hi, -1);
      const bot = endValue(F, v, lo, 1);
      if (top && bot) exact = sSub(top, bot);
    } catch (e) {
      exact = null;
    }
    if (exact) {
      const ev = numS(exact, {});
      if (!isFinite(ev)) exact = null;
      else if (num.ok && Math.abs(ev - num.value) > 1e-6 * (1 + Math.abs(num.value))) exact = null;
    }
    out.work.push('Antiderivative: ' + fmtS(F));
  }
  if (exact) {
    const ev = numS(exact, {});
    const t = fmtS(exact);
    out.answer.push(/^-?\d+$/.test(t) ? t : t + ' (' + approxSym(ev) + ' ' + fmtNum(ev) + ')');
    out.check = num.ok ? 'a numerical integration gives ' + fmtNum(num.value) + ', which agrees' : null;
    if (!num.ok) out.notes.push('The numerical cross-check converged too slowly to confirm the exact value.');
    return withValue(out, exact);
  }
  if (!num.ok) {
    out.answer.push('could not be determined (no closed form was found and the numerical method did not converge)');
    return out;
  }
  const rec = recognizeLoose(num.value);
  out.answer.push(rec && !(rec.rational && !rec.text.includes('/')) ? rec.text + ' (≈ ' + fmtNum(num.value) + ')' : rec ? rec.text : '≈ ' + fmtNum(num.value));
  out.work.push('No closed form was found, so this value comes from numerical integration' + (num.ok ? '' : ' (accuracy is limited)'));
  if (num.note) out.notes.push(num.note);
  out.value = { num: num.value };
  return out;
});
const subSup = (t) => {
  const small = /^-?\d$/.test(t);
  return small ? t : '(' + t + ')';
};
COMMANDS.integrate.show = (n) => {
  const body = showRaw(n.args[0]);
  const v = n.args.length >= 2 && n.args[1].t === 'var' ? n.args[1].name : 'x';
  const bs = n.args.length === 4 ? [n.args[2], n.args[3]] : n.args.length === 3 && n.args[1].t !== 'var' ? [n.args[1], n.args[2]] : null;
  return '∫' + (bs ? ' from ' + showRaw(bs[0]) + ' to ' + showRaw(bs[1]) : '') + ' ' + body + ' d' + v;
};

// ---- limits --------------------------------------------------------------------------------------------------------------
defCmd('limit lim', (n) => {
  needArgs(n, 3, 4, 'an expression, a variable, the value it approaches, and optionally a direction');
  const out = newOut();
  const S = fromAst(n.args[0]);
  const v = varOfArg(n.args[1]);
  const point = boundOf(n.args[2]);
  let side = 0;
  if (n.args[3]) {
    const q = constQ(n.args[3]);
    side = q.sign() < 0 ? -1 : 1;
  }
  const r = limitOf(S, v, point, side);
  out.answer.push(limitText(r));
  out.work.push('lim as ' + v + ' → ' + boundText(point) + (side > 0 ? '⁺' : side < 0 ? '⁻' : '') + ' of ' + fmtS(S));
  if (r.how) out.work.push('Method: ' + r.how);
  if (r.kind === 'value') {
    out.value = r.S ? { S: r.S } : { num: r.num };
  }
  return out;
});
COMMANDS.limit.show = (n) => 'lim ' + showRaw(n.args[1]) + ' → ' + showRaw(n.args[2]) + (n.args[3] ? (constQ(n.args[3]).sign() < 0 ? '⁻' : '⁺') : '') + ' of ' + showRaw(n.args[0]);

// ---- Taylor series ----------------------------------------------------------------------------------------------------------
defCmd('taylor series maclaurin', (n) => {
  needArgs(n, 1, 4, 'an expression, the variable, the centre, and the number of terms');
  const out = newOut();
  const S = fromAst(n.args[0]);
  const v = n.args[1] ? varOfArg(n.args[1]) : singleVarOf(S);
  const a = n.args[2] ? fromAst(n.args[2]) : S0;
  const order = n.args[3] ? Number(intArg(n.args[3])) : 5;
  if (order < 0 || order > 20) throw new MathError('the order must be between 0 and 20');
  const T = taylorS(S, v, a, order);
  const base = isNumVal(a, 0) ? v : '(' + fmtS(sSub(sV(v), a)) + ')';
  out.answer.push(taylorText(S, v, a, order) + ' + O(' + base + toSup(String(order + 1)) + ')');
  out.work.push('Taylor polynomial of degree ' + order + ' about ' + v + ' = ' + fmtS(a));
  out.work.push('Coefficients are f^(k)(' + fmtS(a) + ')/k!');
  return withValue(out, T);
});

// ---- sums and products ------------------------------------------------------------------------------------------------------------
const ZETA_EVEN = { 2: [1n, 6n, 2], 4: [1n, 90n, 4], 6: [1n, 945n, 6], 8: [1n, 9450n, 8], 10: [1n, 93555n, 10], 12: [691n, 638512875n, 12] };
function zetaS(p) {
  if (ZETA_EVEN[p]) {
    const [num, den, pw] = ZETA_EVEN[p];
    return sMul([sN(new Q(num, den)), sPow(S_PI, sI(pw))]);
  }
  return { k: 'f', fn: 'zeta', a: [sI(p)] };
}
function harmonicQ(n, p) {
  // sum_{j=1}^{n} 1/j^p
  let s = Q0;
  for (let j = 1; j <= n; j++) s = s.add(new Q(1n, BigInt(j)).pow(p));
  return s;
}
function termValue(body, k, kq) {
  const s = subsS(body, k, sN(kq));
  if (s.k === 'n') return s.q;
  const v = numS(s, {});
  if (!isFinite(v)) throw new MathError('a term of the sum is undefined (for ' + k + ' = ' + kq + ')');
  return v;
}
function sumDirect(body, k, a, b) {
  let exact = Q0;
  let flo = 0;
  let isExact = true;
  for (let i = a; i <= b; i++) {
    const t = termValue(body, k, qInt(i));
    if (isExact && t instanceof Q) exact = exact.add(t);
    else {
      if (isExact) {
        flo = exact.toNumber();
        isExact = false;
      }
      flo += t instanceof Q ? t.toNumber() : t;
    }
  }
  return isExact ? { q: exact } : { num: flo };
}
/** Lagrange interpolation of P(N) = sum_{k=a}^{N} p(k) (polynomial p with rational coefficients) as a polynomial in N. */
function polySumPoly(coefs, a) {
  const d = coefs.length - 1;
  const xs = [];
  const ys = [];
  let acc = Q0;
  for (let j = 0; j <= d + 1; j++) {
    const kk = a + j;
    acc = acc.add(peval(coefs, qInt(kk)));
    xs.push(qInt(kk));
    ys.push(acc);
  }
  let total = [];
  for (let j = 0; j < xs.length; j++) {
    let term = [ys[j]];
    for (let m = 0; m < xs.length; m++) {
      if (m === j) continue;
      term = pmul(term, [xs[m].neg().div(xs[j].sub(xs[m])), Q1.div(xs[j].sub(xs[m]))]);
    }
    total = padd(total, term);
  }
  return total;
}
function telescopeTerms(body, k) {
  // sum of A/(k+d) with simple linear factors only -> [{A: Q, d: Q}] or null
  let r;
  try {
    r = toRFS(body, k);
  } catch (e) {
    return null;
  }
  if (r.d.length === 1) return null;
  const ap = apartRF(r);
  if (ap.poly.length) return null;
  const terms = [];
  for (const t of ap.terms) {
    if (t.fac.length !== 2 || t.power !== 1) return { nonSimple: true, ap };
    const lead = t.fac[1];
    terms.push({ A: (t.num[0] || Q0).div(lead), d: t.fac[0].div(lead) });
  }
  return { terms, ap };
}
function seriesNumeric(body, k, a) {
  const f = (i) => numS(body, { [k]: i });
  // convergence: tail blocks must shrink
  const blk = (from, len) => { let s = 0; for (let i = from; i < from + len; i++) s += Math.abs(f(i)); return s; };
  const b1 = blk(a + 1000, 1000);
  const b2 = blk(a + 8000, 1000);
  if (!isFinite(b1) || !isFinite(b2)) return { diverges: true };
  if (b2 > 0.5 * b1 && b2 > 1e-6) return { diverges: true };
  const alt = f(a + 1000) * f(a + 1001) < 0;
  // partial sums at N = 500 * 2^j
  const partial = [];
  let s = 0;
  let i = a;
  let target = 250;
  for (let j = 0; j < 7; j++) {
    for (; i < a + target; i++) s += f(i);
    partial.push({ N: target, S: s });
    target *= 2;
  }
  if (alt) {
    // average successive partial sums repeatedly (Euler-type) on the last values
    let seq = [];
    let t2 = 0;
    for (let q = a; q < a + 400; q++) {
      t2 += f(q);
      if (q >= a + 360) seq.push(t2);
    }
    for (let r = 0; r < 20 && seq.length > 1; r++) seq = seq.slice(1).map((v, idx) => (v + seq[idx]) / 2);
    return { value: seq[0] };
  }
  // Richardson on N, 2N, 4N... assuming an expansion in powers of 1/N
  let P = partial.map((p) => p.S);
  const Ns = partial.map((p) => p.N);
  for (let level = 1; level < P.length; level++) {
    const nxt = [];
    for (let q = 0; q + 1 < P.length; q++) {
      const w = Math.pow(2, level);
      nxt.push((w * P[q + 1] - P[q]) / (w - 1));
    }
    P = nxt;
    if (level >= 5) break;
  }
  return { value: P[P.length - 1], ns: Ns };
}
defCmd('sum summation', (n) => {
  needArgs(n, 4, 4, 'the term, the index variable, the first value and the last value');
  const out = newOut();
  const body = fromAst(n.args[0]);
  const k = varOfArg(n.args[1]);
  const lo = boundOf(n.args[2]);
  const hi = boundOf(n.args[3]);
  if (lo.inf) throw new MathError('the first value of the index must be a number');
  const aQ = constQ(n.args[2]);
  if (!aQ.isInt()) throw new MathError('the first value of the index must be a whole number');
  const a = Number(aQ.n);
  out.work.push('Sum of ' + fmtS(body) + ' for ' + k + ' from ' + fmtS(lo.S) + ' to ' + boundText(hi));
  // finite numeric upper bound
  if (!hi.inf && hi.S.k === 'n') {
    if (!hi.S.q.isInt()) throw new MathError('the last value of the index must be a whole number');
    const b = Number(hi.S.q.n);
    if (b < a) {
      out.answer.push('0 (empty sum)');
      return withValue(out, S0);
    }
    const coefs = polyCoeffsS(body, k);
    if (coefs && coefs.every((c) => c.k === 'n') && b - a > 2000) {
      const poly = polySumPoly(coefs.map((c) => c.q), a);
      const val = peval(poly, qInt(b));
      out.answer.push(qLabel(val));
      out.work.push('Used the closed form of the sum of a polynomial');
      return withValue(out, sN(val));
    }
    if (b - a > 200000) throw new MathError('that sum has too many terms');
    const r = sumDirect(body, k, a, b);
    if (r.q) {
      out.answer.push(qLabel(r.q));
      return withValue(out, sN(r.q));
    }
    out.answer.push('≈ ' + fmtNum(r.num));
    out.value = { num: r.num };
    return out;
  }
  // symbolic upper bound
  if (!hi.inf) {
    const N = hi.S;
    const coefs = polyCoeffsS(body, k);
    if (coefs && coefs.every((c) => c.k === 'n')) {
      const poly = polySumPoly(coefs.map((c) => c.q), a);
      const P = polyToS(poly, FRESH);
      const res = expandS(subsS(P, FRESH, N));
      out.answer.push(fmtS(res));
      const fp = Array.from(varsOfS(N)).length === 1 ? factorPolyQ(poly) : null;
      if (fp && fp.factors.length > 1) out.work.push('Factored in ' + Array.from(varsOfS(N))[0] + ': ' + factorPolyText(fp, Array.from(varsOfS(N))[0]).replace(/\$u/g, 'n'));
      out.work.push('Used the closed form of the sum of a polynomial');
      return withValue(out, res);
    }
    // geometric
    const ratio = simp(sDiv(subsS(body, k, sAdd([sV(k), S1])), body));
    if (freeOf(ratio, k)) {
      const first = subsS(body, k, sI(a));
      const res = sDiv(sMul([first, sSub(sPow(ratio, sAdd([sSub(N, sI(a)), S1])), S1)]), sSub(ratio, S1));
      out.answer.push(fmtS(res));
      out.work.push('Geometric series with ratio ' + fmtS(ratio));
      return withValue(out, res);
    }
    const tel = telescopeTerms(body, k);
    if (tel && tel.terms) {
      const dmax = tel.terms.reduce((m, t) => (t.d.cmp(m) > 0 ? t.d : m), tel.terms[0].d);
      if (tel.terms.every((t) => t.d.isInt()) && tel.terms.reduce((s, t) => s.add(t.A), Q0).isZero()) {
        let res = S0;
        let cst = Q0;
        for (const t of tel.terms) {
          for (let m = Number(t.d.n) + 1; m <= Number(dmax.n); m++) res = sSub(res, sMul([sN(t.A), sPow(sAdd([N, sI(m)]), SM1)]));
          // - A * H_{a + d - 1}
          const top = a + Number(t.d.n) - 1;
          if (top >= 1) cst = cst.sub(t.A.mul(harmonicQ(top, 1)));
        }
        res = sAdd([res, sN(cst)]);
        out.answer.push(fmtS(res));
        out.work.push('Telescoping sum (partial fractions)');
        return withValue(out, res);
      }
    }
    throw new MathError('I could not find a closed form for this sum with a symbolic upper limit');
  }
  // infinite series
  const ratio = simp(sDiv(subsS(body, k, sAdd([sV(k), S1])), body));
  if (freeOf(ratio, k)) {
    const rv = numS(ratio, {});
    if (Math.abs(rv) >= 1) {
      out.answer.push('diverges (geometric series with |ratio| ≥ 1)');
      return out;
    }
    const res = sDiv(subsS(body, k, sI(a)), sSub(S1, ratio));
    const ev = numS(res, {});
    out.answer.push(fmtS(res) + (/^-?\d+$/.test(fmtS(res)) ? '' : ' (' + approxSym(ev) + ' ' + fmtNum(ev) + ')'));
    out.work.push('Geometric series with ratio ' + fmtS(ratio) + ': first term / (1 - ratio)');
    return withValue(out, res);
  }
  // rational terms: telescoping and p-series
  let rat = null;
  try {
    const r = toRFS(body, k);
    if (r.d.length > 1) rat = apartRF(r);
  } catch (e) {
    if (!(e instanceof NotAlgebraic) && !(e instanceof MathError)) throw e;
  }
  if (rat && !rat.poly.length && rat.terms.every((t) => t.fac.length === 2 && t.num.length === 1)) {
    const lin = rat.terms.map((t) => ({ A: t.num[0].div(t.fac[1].pow(t.power)), d: t.fac[0].div(t.fac[1]), p: t.power }));
    const ones = lin.filter((t) => t.p === 1);
    if (lin.every((t) => t.d.isInt()) && ones.reduce((s, t) => s.add(t.A), Q0).isZero()) {
      let res = S0;
      let cst = Q0;
      for (const t of ones) {
        const top = a + Number(t.d.n) - 1;
        if (top >= 1) cst = cst.sub(t.A.mul(harmonicQ(top, 1)));
        else if (top < 0) throw new MathError('a term of the series is undefined');
      }
      let zeta = S0;
      for (const t of lin.filter((q) => q.p >= 2)) {
        const sh = a + Number(t.d.n);
        if (sh < 1) throw new MathError('a term of the series is undefined');
        zeta = sAdd([zeta, sMul([sN(t.A), sSub(zetaS(t.p), sN(harmonicQ(sh - 1, t.p)))])]);
      }
      res = sAdd([sN(cst), zeta]);
      const ev = numS(res.k === 'f' ? res : res, {});
      out.answer.push(fmtS(res) + (/^-?\d+$/.test(fmtS(res)) ? '' : ' (' + approxSym(ev) + ' ' + fmtNum(ev) + ')'));
      out.work.push('Partial fractions: ' + apartText(rat, k) + ' (telescoping / p-series)');
      return withValue(out, res);
    }
    if (ones.length === 0 || !ones.reduce((s, t) => s.add(t.A), Q0).isZero()) {
      if (ones.length) {
        out.answer.push('diverges (it behaves like the harmonic series)');
        return out;
      }
    }
  }
  const r = seriesNumeric(body, k, a);
  if (r.diverges) {
    out.answer.push('diverges (the terms do not shrink fast enough)');
    return out;
  }
  const rec = recognizeLoose(r.value);
  out.answer.push(rec && !(rec.rational && !rec.text.includes('/')) ? rec.text + ' (≈ ' + fmtNum(r.value) + ')' : rec ? rec.text + ' (≈ ' + fmtNum(r.value) + ')' : '≈ ' + fmtNum(r.value));
  out.work.push('No closed form rule applied, so the value was found numerically by extrapolating the partial sums');
  out.value = { num: r.value };
  return out;
});
COMMANDS.sum.show = (n) => 'Σ ' + showRaw(n.args[1]) + ' = ' + showRaw(n.args[2]) + ' to ' + showRaw(n.args[3]) + ' of ' + showRaw(n.args[0]);

defCmd('product', (n) => {
  needArgs(n, 4, 4, 'the term, the index variable, the first value and the last value');
  const out = newOut();
  const body = fromAst(n.args[0]);
  const k = varOfArg(n.args[1]);
  const a = Number(intArg(n.args[2]));
  const hi = boundOf(n.args[3]);
  if (hi.inf || hi.S.k !== 'n') {
    // closed forms for the simple symbolic cases
    if (!hi.inf && body.k === 'v' && body.name === k && a === 1) {
      const res = { k: 'f', fn: 'fact', a: [hi.S] };
      out.answer.push(fmtS(hi.S) + '!');
      return withValue(out, res);
    }
    if (!hi.inf && freeOf(body, k)) {
      const res = sPow(body, sAdd([sSub(hi.S, sI(a)), S1]));
      out.answer.push(fmtS(res));
      return withValue(out, res);
    }
    throw new MathError('I can only multiply up to a whole number (or give n! and c^n for a symbolic last value)');
  }
  const b = Number(hi.S.q.n);
  if (b - a > 3000) throw new MathError('that product has too many factors');
  let exact = Q1;
  let flo = 1;
  let isExact = true;
  for (let i = a; i <= b; i++) {
    const t = termValue(body, k, qInt(i));
    if (isExact && t instanceof Q) exact = exact.mul(t);
    else {
      if (isExact) {
        flo = exact.toNumber();
        isExact = false;
      }
      flo *= t instanceof Q ? t.toNumber() : t;
    }
  }
  if (isExact) {
    out.answer.push(qLabel(exact));
    return withValue(out, sN(exact));
  }
  out.answer.push('≈ ' + fmtNum(flo));
  out.value = { num: flo };
  return out;
});
COMMANDS.product.show = (n) => 'Π ' + showRaw(n.args[1]) + ' = ' + showRaw(n.args[2]) + ' to ' + showRaw(n.args[3]) + ' of ' + showRaw(n.args[0]);
