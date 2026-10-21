
// ======================================================================
// 9c. Limits (symbolic where possible, always cross-checked numerically)
// ======================================================================

/** A bound as S, or +/-Infinity marker.  bound: {S} or {inf: 1|-1} */
function boundOf(node) {
  if (node.t === 'const' && node.name === 'oo') return { inf: 1 };
  if (node.t === 'neg' && node.a.t === 'const' && node.a.name === 'oo') return { inf: -1 };
  if (node.t === 'call' && node.fn === 'neg') return null;
  return { S: fromAst(node) };
}
const boundNum = (b) => (b.inf ? b.inf * Infinity : numS(b.S, {}));
const boundText = (b) => (b.inf ? (b.inf > 0 ? '∞' : '-∞') : fmtS(b.S));

/** Does substituting x = a make any denominator, logarithm or tangent blow up? */
function singularAt(f, x, a) {
  const env = { [x]: a };
  let bad = false;
  const walk = (e) => {
    if (bad) return;
    if (e.k === '^') {
      if (e.e.k === 'n' && e.e.q.sign() < 0) {
        const v = freeOf(e.b, x) ? numS(e.b, env) : numS(e.b, env);
        if (!isFinite(v) || Math.abs(v) < 1e-12) bad = true;
      } else if (!freeOf(e.e, x)) {
        const v = numS(e.b, env);
        if (v === 0) bad = true;
      }
    } else if (e.k === 'f' && e.a.length === 1) {
      const v = numS(e.a[0], env);
      if (e.fn === 'ln' && !(v > 0)) bad = true;
      if (['tan', 'sec'].includes(e.fn) && Math.abs(Math.cos(v)) < 1e-12) bad = true;
      if (['cot', 'csc'].includes(e.fn) && Math.abs(Math.sin(v)) < 1e-12) bad = true;
      if ((e.fn === 'asin' || e.fn === 'acos') && Math.abs(v) > 1) bad = true;
    }
    if (e.k === '+' || e.k === '*' || e.k === 'f') e.a.forEach(walk);
    else if (e.k === '^') {
      walk(e.b);
      walk(e.e);
    }
  };
  walk(f);
  return bad;
}

function limitNumericSeq(g, side) {
  // g(t): value at distance t from the point on the given side; t -> 0+
  const ts = [];
  const ys = [];
  for (let k = 2; k <= 13; k++) {
    const t = 0.5 * Math.pow(2, -k);
    const y = g(t);
    if (isFinite(y)) {
      ts.push(t);
      ys.push(y);
    }
  }
  if (ys.length < 6) return { kind: 'dne', why: 'undefined near the point' };
  const last = ys[ys.length - 1];
  // unbounded growth: differences between successive values do not shrink
  const d = [];
  for (let i = ys.length - 6; i + 1 < ys.length; i++) d.push(ys[i + 1] - ys[i]);
  const sameSign = d.every((v) => Math.sign(v) === Math.sign(d[0]) && v !== 0);
  const notShrinking = d.every((v, i) => i === 0 || Math.abs(v) >= 0.9 * Math.abs(d[i - 1]));
  if (sameSign && notShrinking && Math.abs(last) > 5 && Math.abs(last) > Math.abs(ys[ys.length - 6])) {
    return { kind: 'inf', sign: Math.sign(last) };
  }
  // Neville / Richardson extrapolation of the 8 smallest t
  const m = Math.min(8, ts.length);
  const T = ts.slice(-m);
  let P = ys.slice(-m);
  for (let level = 1; level < m; level++) {
    const nxt = [];
    for (let i = 0; i + level < m; i++) nxt.push((T[i + level] * P[i] - T[i] * P[i + 1]) / (T[i + level] - T[i]));
    P = nxt;
  }
  const neville = P[0];
  const mid = g(1e-5);
  const tiny = g(1e-9);
  const tiny2 = g(1e-11);
  const spread = Math.max(...ys.slice(-4)) - Math.min(...ys.slice(-4));
  // The extrapolation is not hurt by cancellation; the tiny steps are not hurt by slow convergence (x^x).
  if (isFinite(neville) && isFinite(mid) && Math.abs(neville - mid) <= 1e-4 * (1 + Math.abs(mid))) return { kind: 'value', value: neville, neville };
  if (isFinite(tiny2) && isFinite(tiny) && Math.abs(tiny - tiny2) < 1e-6 * (1 + Math.abs(tiny2))) return { kind: 'value', value: tiny2, approx: true, neville };
  if (spread < 1e-4 * (1 + Math.abs(last)) && isFinite(neville)) return { kind: 'value', value: neville, neville };
  return { kind: 'dne', why: 'oscillates without settling' };
}

/** Exact value of a numeric limit when it is a recognisable constant, else null. */
function recognizeLoose(v) {
  const r = recognize(v);
  if (r) return r;
  for (const [name, c] of [['e', Math.E], ['e²', Math.E * Math.E], ['√e', Math.sqrt(Math.E)], ['π²', Math.PI * Math.PI], ['π³', Math.PI ** 3], ['π⁴', Math.PI ** 4], ['ln(2)', Math.LN2], ['ln(3)', Math.log(3)], ['ln(10)', Math.LN10], ['√π', Math.sqrt(Math.PI)], ['γ', 0.5772156649015329]]) {
    const fr = toFraction(v / c, 24);
    if (fr && fr.p !== 0) {
      const a = Math.abs(fr.p);
      return { text: (fr.p < 0 ? '-' : '') + (a === 1 ? '' : a) + name + (fr.q === 1 ? '' : '/' + fr.q), val: fr.p / fr.q * c };
    }
  }
  const inv = toFraction(v * Math.E, 24);
  if (inv && inv.p > 0 && Math.abs(v * Math.E - inv.p / inv.q) < 1e-9) return { text: (inv.p === 1 ? '1' : inv.p) + (inv.q === 1 ? '' : '/' + inv.q) + '/e', val: v };
  return null;
}

/** (A + B) with a square root in it  ->  (A^2 - B^2)/(A - B), which has no cancellation. */
function conjugateForm(f) {
  const [A, B] = f.a;
  const hasSqrt = (e) => (e.k === '^' && e.e.k === 'n' && e.e.q.d === 2n) || (e.k === '*' && e.a.some(hasSqrt));
  if (!hasSqrt(A) && !hasSqrt(B)) return null;
  try {
    const num = expandS(sSub(sPow(A, sI(2)), sPow(B, sI(2))));
    return sMul([num, sPow(sSub(A, B), SM1)]);
  } catch (e) {
    return null;
  }
}

function limitNumeric(f, x, pointNum, side) {
  const env = {};
  const g = (t) => {
    env[x] = pointNum + side * t;
    return numS(f, env);
  };
  return limitNumericSeq(g, side);
}

/** One-sided limit of S as x -> a (a finite number as S) using symbolic rules; returns {kind, S|sign} or null. */
function limitSymbolic(f, x, a, side, depth) {
  if (depth > 6) return null;
  const an = numS(a, {});
  // 1. direct substitution
  if (!singularAt(f, x, an)) {
    const v = subsS(f, x, a);
    const nv = numS(v, {});
    if (isFinite(nv)) return { kind: 'value', S: v, how: 'direct substitution' };
  }
  // 2. rational function in x: cancel common factors, then substitute or find the sign of the pole
  if (a.k === 'n') {
    let r = null;
    try {
      r = toRFS(f, x);
    } catch (e) {
      if (!(e instanceof NotAlgebraic)) throw e;
    }
    if (r) {
      const Dv = peval(r.d, a.q);
      const Nv = peval(r.n, a.q);
      if (!Dv.isZero()) return { kind: 'value', S: sN(Nv.div(Dv)), how: 'cancelling common factors, then substituting' };
      // pole: D = (x-a)^m * g(a)  -> sign analysis
      let m = 0;
      let dd = r.d;
      while (peval(dd, a.q).isZero() && m < 50) {
        dd = pderiv(dd);
        m++;
      }
      const sgn = Nv.sign() * peval(dd, a.q).sign() * (side < 0 && m % 2 === 1 ? -1 : 1);
      if (Nv.isZero()) return { kind: 'value', S: S0, how: 'cancelling common factors' };
      return { kind: 'inf', sign: sgn, how: 'denominator vanishes' };
    }
  }
  // 2b. elementary functions of something that tends to 0 or infinity
  if ((f.k === 'f' && f.a.length === 1) || (f.k === '^' && (isConstE(f.b) || (f.e.k === 'n' && f.e.q.sign() > 0)))) {
    const inner = f.k === 'f' ? f.a[0] : isConstE(f.b) ? f.e : f.b;
    const li = limitSymbolic(inner, x, a, side, depth + 1);
    if (li) {
      const isInf = li.kind === 'inf';
      const isZero = li.kind === 'value' && isNumVal(simp(li.S), 0);
      if (f.k === 'f') {
        if (f.fn === 'ln' && isInf && li.sign > 0) return { kind: 'inf', sign: 1, how: 'ln grows without bound' };
        if (f.fn === 'ln' && isZero && numS(inner, { [x]: an + side * 1e-7 }) > 0) return { kind: 'inf', sign: -1, how: 'ln of a quantity tending to 0⁺' };
        if (f.fn === 'atan' && isInf) return { kind: 'value', S: sMul([sN(new Q(BigInt(li.sign), 2n)), S_PI]), how: 'arctan tends to ±π/2' };
        if ((f.fn === 'sinh') && isInf) return { kind: 'inf', sign: li.sign, how: 'sinh grows without bound' };
        if (f.fn === 'cosh' && isInf) return { kind: 'inf', sign: 1, how: 'cosh grows without bound' };
        if (f.fn === 'tanh' && isInf) return { kind: 'value', S: sI(li.sign), how: 'tanh tends to ±1' };
      } else if (isConstE(f.b)) {
        if (isInf) return li.sign > 0 ? { kind: 'inf', sign: 1, how: 'e^u grows without bound' } : { kind: 'value', S: S0, how: 'e^u tends to 0' };
      } else if (isInf && li.sign > 0) {
        return { kind: 'inf', sign: 1, how: 'a positive power of a growing quantity' };
      }
    }
  }
  // 3. quotient: L'Hopital's rule
  const fs = f.k === '*' ? f.a : [f];
  const numF = [];
  const denF = [];
  for (const t of fs) {
    if (t.k === '^' && t.e.k === 'n' && t.e.q.sign() < 0) denF.push(sPow(t.b, sN(t.e.q.neg())));
    else numF.push(t);
  }
  if (denF.length) {
    const N = sMul(numF);
    const D = sMul(denF);
    const ln = limitSymbolic(N, x, a, side, depth + 1);
    const ld = limitSymbolic(D, x, a, side, depth + 1);
    if (ln && ld) {
      const isZero = (l) => l.kind === 'value' && isNumVal(simp(l.S), 0);
      const isInf = (l) => l.kind === 'inf';
      if ((isZero(ln) && isZero(ld)) || (isInf(ln) && isInf(ld))) {
        const g = sMul([diffS(N, x), sPow(diffS(D, x), SM1)]);
        const r = limitSymbolic(g, x, a, side, depth + 1);
        if (r) return { ...r, how: "L'Hôpital's rule" + (r.how && r.how.startsWith("L'H") ? ' (repeated)' : '') };
      }
      if (ln.kind === 'value' && ld.kind === 'value' && !isZero(ld)) return { kind: 'value', S: sDiv(ln.S, ld.S), how: 'quotient of limits' };
      if (ln.kind === 'value' && !isZero(ln) && isZero(ld)) {
        const probe = numS(D, { [x]: an + side * 1e-6 });
        return { kind: 'inf', sign: Math.sign(numS(ln.S, {})) * Math.sign(probe), how: 'denominator tends to 0' };
      }
      if (ln.kind === 'value' && isInf(ld)) return { kind: 'value', S: S0, how: 'denominator grows without bound' };
    }
  }
  // 3b. 0 * infinity  ->  quotient
  if (!denF.length && f.k === '*') {
    const vary = f.a.filter((t) => !freeOf(t, x));
    if (vary.length === 2) {
      const [p, q] = vary;
      const lp = limitSymbolic(p, x, a, side, depth + 1);
      const lq = limitSymbolic(q, x, a, side, depth + 1);
      const zero = (l) => l && l.kind === 'value' && isNumVal(simp(l.S), 0);
      const inf = (l) => l && l.kind === 'inf';
      let small = null;
      let big = null;
      if (zero(lp) && inf(lq)) {
        small = p;
        big = q;
      } else if (zero(lq) && inf(lp)) {
        small = q;
        big = p;
      }
      if (small) {
        const rest = sMul(f.a.filter((t) => freeOf(t, x)));
        const g = sMul([rest, diffS(big, x), sPow(diffS(sPow(small, SM1), x), SM1)]);
        const r = limitSymbolic(g, x, a, side, depth + 1);
        if (r) return { ...r, how: "L'Hôpital's rule (after writing 0·∞ as a quotient)" };
      }
    }
  }
  // 4. power with a variable exponent: u^v -> exp(lim v ln u)
  if (f.k === '^' && !freeOf(f.e, x)) {
    const lg = sMul([f.e, sFn('ln', [f.b])]);
    const r = limitSymbolic(lg, x, a, side, depth + 1);
    if (r && r.kind === 'value') return { kind: 'value', S: sExp(r.S), how: 'taking logarithms' };
    if (r && r.kind === 'inf') return r.sign > 0 ? { kind: 'inf', sign: 1, how: 'taking logarithms' } : { kind: 'value', S: S0, how: 'taking logarithms' };
  }
  return null;
}

/**
 * Limit of f as x -> point. point: {S} or {inf}. side: 1 (from the right/up), -1 (from the left/down), 0 both.
 * Returns {kind:'value'|'inf'|'dne', S?, sign?, num?, how, left?, right?}
 */
function limitOf(f, x, point, side) {
  if (point.inf) {
    const t = '$t';
    const g = subsS(f, x, sPow(sV(t), SM1));
    const r = limitOf(g, t, { S: S0 }, point.inf > 0 ? 1 : -1);
    return { ...r, how: (r.how ? r.how + ', ' : '') + 'after substituting x = 1/t' };
  }
  const a = point.S;
  if (side === 0) {
    const L = limitOf(f, x, point, -1);
    const R = limitOf(f, x, point, 1);
    const same = L.kind === R.kind && (L.kind === 'dne' ? false
      : L.kind === 'inf' ? L.sign === R.sign
        : Math.abs(limNum(L) - limNum(R)) <= 1e-7 * (1 + Math.abs(limNum(R))));
    if (same) return { ...R, how: R.how };
    if (L.kind === 'dne' && R.kind === 'dne') return { kind: 'dne', why: R.why || L.why, how: 'numerical check' };
    return { kind: 'dne', left: L, right: R, how: 'the one-sided limits differ' };
  }
  const an = numS(a, {});
  let sym = null;
  try {
    sym = limitSymbolic(f, x, a, side, 0);
  } catch (e) {
    if (e instanceof MathError || e instanceof NotAlgebraic) sym = null;
    else throw e;
  }
  let num = limitNumeric(f, x, an, side);
  if (!sym && f.k === '+' && f.a.length === 2 && num.kind !== 'value') {
    const conj = conjugateForm(f);
    if (conj) {
      const n2 = limitNumeric(conj, x, an, side);
      if (n2.kind === 'value') num = { ...n2, viaConjugate: true };
      else if (n2.kind === 'inf') num = n2;
    }
  }
  if (sym && sym.kind === 'value') {
    const sv = numS(sym.S, {});
    const ref = num.kind === 'value' ? (num.neville !== undefined ? num.neville : num.value) : NaN;
    if (num.kind === 'value' && Math.abs(sv - ref) > 1e-4 * (1 + Math.abs(ref))) return { kind: 'value', num: num.value, how: 'numerical extrapolation (the exact rules disagreed with it)' };
    return { ...sym, num: sv };
  }
  if (sym && sym.kind === 'inf') {
    if (num.kind === 'inf' && num.sign === sym.sign) return sym;
    if (num.kind === 'value') return { kind: 'value', num: num.value, how: 'numerical extrapolation' };
    return sym;
  }
  if (num.kind === 'value') {
    const rec = recognizeLoose(num.value);
    return { kind: 'value', num: num.value, rec, how: num.viaConjugate ? 'multiplying by the conjugate, then numerical extrapolation' : 'numerical extrapolation towards the point' };
  }
  if (num.kind === 'inf') return { kind: 'inf', sign: num.sign, how: 'the function grows without bound' };
  return { kind: 'dne', why: num.why, how: 'numerical check' };
}
const limNum = (r) => (r.num !== undefined ? r.num : r.S ? numS(r.S, {}) : NaN);

function limitText(r) {
  if (r.kind === 'inf') return r.sign > 0 ? '∞' : '-∞';
  if (r.kind === 'dne') {
    if (r.left && r.right) return 'does not exist (from the left: ' + limitText(r.left) + ', from the right: ' + limitText(r.right) + ')';
    return 'does not exist' + (r.why ? ' (' + r.why + ')' : '');
  }
  if (r.S) {
    const v = numS(r.S, {});
    const t = fmtS(r.S);
    return /^-?\d+$/.test(t) || !isFinite(v) ? t : t + ' (' + approxSym(v) + ' ' + fmtNum(v) + ')';
  }
  const rec = r.rec || recognizeLoose(r.num);
  if (rec && !(rec.rational && !rec.text.includes('/'))) return rec.text + ' (' + approxSym(r.num) + ' ' + fmtNum(r.num) + ')';
  if (rec) return rec.text;
  return '≈ ' + fmtNum(r.num);
}

// ---- Taylor / Maclaurin series ------------------------------------------------------------------------------
function taylorCoeffs(f, x, a, order) {
  let d = f;
  let fact = 1n;
  const out = [];
  for (let k = 0; k <= order; k++) {
    if (k > 0) {
      d = diffS(d, x);
      fact *= BigInt(k);
    }
    const c = subsS(d, x, a);
    const nc = numS(c, {});
    if (!isFinite(nc)) throw new MathError('the function or one of its derivatives is not defined at the expansion point');
    const coef = sMul([c, sN(new Q(1n, fact))]);
    if (!isNumVal(coef, 0)) out.push({ k, coef });
  }
  return out;
}
function taylorS(f, x, a, order) {
  const xa = sSub(sV(x), a);
  return sAdd(taylorCoeffs(f, x, a, order).map(({ k, coef }) => sMul([coef, sPow(xa, sI(k))])));
}
/** Ascending-power text, keeping (x - a)^k intact. */
function taylorText(f, x, a, order) {
  const base = isNumVal(a, 0) ? x : '(' + fmtS(sSub(sV(x), a)) + ')';
  const pw = (k) => (k === 0 ? '' : k === 1 ? base : base + toSup(String(k)));
  let out = '';
  for (const { k, coef } of taylorCoeffs(f, x, a, order)) {
    let sign = '+';
    let body;
    if (coef.k === 'n') {
      if (coef.q.sign() < 0) sign = '-';
      const m = coef.q.abs();
      const num = m.n === 1n && k > 0 ? '' : String(m.n);
      body = num + pw(k) + (m.d === 1n ? '' : '/' + m.d);
    } else {
      const t = fmtS(coef);
      const neg = t[0] === '-';
      if (neg) sign = '-';
      const mag = neg ? t.slice(1) : t;
      body = (/[ +]/.test(mag) ? '(' + mag + ')' : mag) + pw(k);
    }
    out += out ? ' ' + sign + ' ' + body : (sign === '-' ? '-' : '') + body;
  }
  return out || '0';
}
