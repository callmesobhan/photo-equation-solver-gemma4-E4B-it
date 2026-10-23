// ======================================================================
// 35. Exact surds: arithmetic in Q(sqrt p1, ..., sqrt pk)
//     rationalise denominators, expand (2 + sqrt 3)^2, denest sqrt(5 + 2 sqrt 6), exact tan / sec / csc / cot
// ======================================================================
class SurdBail extends Error {}

/** An element is a Map(key -> Q) meaning sum of q * sqrt(key); key is a square-free integer written as a string; the empty Map is 0. */
const sdClean = (m) => {
  for (const [k, v] of m) if (v.isZero()) m.delete(k);
  return m;
};
const sdRat = (q) => sdClean(new Map([['1', q]]));
function sdAdd(a, b) {
  const r = new Map(a);
  for (const [k, v] of b) r.set(k, (r.get(k) || Q0).add(v));
  return sdClean(r);
}
const sdScale = (a, q) => sdClean(new Map([...a].map(([k, v]) => [k, v.mul(q)])));
const sdNeg = (a) => sdScale(a, qInt(-1));
function sdMul(a, b) {
  const r = new Map();
  for (const [k1, v1] of a) {
    for (const [k2, v2] of b) {
      const m1 = BigInt(k1);
      const m2 = BigInt(k2);
      const g = bgcd(m1, m2);
      const key = ((m1 / g) * (m2 / g)).toString();
      r.set(key, (r.get(key) || Q0).add(v1.mul(v2).mul(new Q(g))));
    }
  }
  return sdClean(r);
}
const sdIsRat = (a) => a.size === 0 || (a.size === 1 && a.has('1'));
const sdRatQ = (a) => a.get('1') || Q0;
const sdNum = (a) => {
  let s = 0;
  for (const [k, v] of a) s += v.toNumber() * Math.sqrt(Number(k));
  return s;
};
const sdParity = (v) => {
  let c = 0;
  while (v) {
    c ^= v & 1;
    v >>= 1;
  }
  return c;
};
/** s, r with D = s^2 r and r square-free (D a positive integer of moderate size). */
function sdSquareFree(D) {
  if (bitLen(D) > 100) throw new SurdBail();
  if (D === 1n) return { s: 1n, r: 1n };
  const f = factorBig(D);
  if (!f) throw new SurdBail();
  let s = 1n;
  let r = 1n;
  for (const [p, e] of f) {
    s *= p ** BigInt(Math.floor(e / 2));
    if (e % 2) r *= p;
  }
  return { s, r };
}
function sdPrimesOf(a) {
  const ps = [];
  const masks = new Map();
  for (const k of a.keys()) {
    if (k === '1') continue;
    const f = factorBig(BigInt(k));
    if (!f) throw new SurdBail();
    for (const p of f.keys()) if (!ps.includes(p)) ps.push(p);
  }
  for (const k of a.keys()) {
    let mask = 0;
    if (k !== '1') for (const p of factorBig(BigInt(k)).keys()) mask |= 1 << ps.indexOf(p);
    masks.set(k, mask);
  }
  return { ps, masks };
}
/** 1 / a through the product of the Galois conjugates. */
function sdInv(a) {
  if (!a.size) throw new MathError('division by zero');
  if (sdIsRat(a)) return sdRat(sdRatQ(a).inv());
  const { ps, masks } = sdPrimesOf(a);
  if (ps.length > 4) throw new SurdBail();
  let Y = sdRat(Q1);
  for (let e = 1; e < 1 << ps.length; e++) {
    Y = sdMul(Y, sdClean(new Map([...a].map(([k, v]) => [k, sdParity(masks.get(k) & e) ? v.neg() : v]))));
  }
  const N = sdMul(a, Y);
  if (!sdIsRat(N) || !N.size) throw new SurdBail();
  return sdScale(Y, sdRatQ(N).inv());
}
function sdPow(a, n) {
  if (n < 0) return sdPow(sdInv(a), -n);
  let r = sdRat(Q1);
  let b = a;
  while (n) {
    if (n & 1) r = sdMul(r, b);
    n = Math.floor(n / 2);
    if (n) b = sdMul(b, b);
  }
  return r;
}
function sdSqrtRat(q) {
  const { s, r } = sdSquareFree(q.n * q.d);
  return sdClean(new Map([[r.toString(), new Q(s, q.d)]]));
}
/** sqrt of an element when it is again an element (a + b sqrt m with a^2 - b^2 m a rational square), else null. */
function sdSqrt(a) {
  const v = sdNum(a);
  if (v < 0) return null;
  if (sdIsRat(a)) return sdSqrtRat(sdRatQ(a));
  if (a.size !== 2 || !a.has('1')) return null;
  const [mk] = [...a.keys()].filter((k) => k !== '1');
  const A = a.get('1');
  const B = a.get(mk);
  const D = A.mul(A).sub(B.mul(B).mul(new Q(BigInt(mk))));
  if (D.sign() < 0) return null;
  const d = sdSqrtRat(D);
  if (!sdIsRat(d)) return null;
  const dq = sdRatQ(d);
  const u = A.add(dq).div(qInt(2));
  const w = A.sub(dq).div(qInt(2));
  if (u.sign() < 0 || w.sign() < 0) return null;
  const su = sdSqrtRat(u);
  const sw = sdSqrtRat(w);
  const big = sdNum(su) >= sdNum(sw) ? [su, sw] : [sw, su];
  return B.sign() > 0 ? sdAdd(su, sw) : sdAdd(big[0], sdNeg(big[1]));
}
/** The S expression as an element, or null when it is not an algebraic number made of rationals and square roots. */
function sdFromS(S, depth) {
  depth = depth || 0;
  if (depth > 60) return null;
  try {
    return sdFromS_(S, depth);
  } catch (e) {
    if (e instanceof SurdBail) return null;
    throw e;
  }
}
function sdFromS_(S, depth) {
  switch (S.k) {
    case 'n': return sdRat(S.q);
    case '+': {
      let r = new Map();
      for (const t of S.a) {
        const x = sdFromS(t, depth + 1);
        if (!x) return null;
        r = sdAdd(r, x);
      }
      return r;
    }
    case '*': {
      let r = sdRat(Q1);
      for (const t of S.a) {
        const x = sdFromS(t, depth + 1);
        if (!x) return null;
        r = sdMul(r, x);
      }
      return r;
    }
    case '^': {
      if (S.e.k !== 'n') return null;
      const base = sdFromS(S.b, depth + 1);
      if (!base) return null;
      const q = S.e.q;
      if (q.isInt()) {
        if (babs(q.n) > 64n) return null;
        if (q.sign() < 0 && !base.size) return null;
        return sdPow(base, Number(q.n));
      }
      if (q.d !== 2n || babs(q.n) > 64n) return null;
      const r = sdSqrt(base);
      if (!r) return null;
      if (q.sign() < 0 && !r.size) return null;
      return sdPow(r, Number(q.n));
    }
    case 'f': {
      if (S.fn === 'abs' && S.a.length === 1) {
        const x = sdFromS(S.a[0], depth + 1);
        if (!x) return null;
        return sdNum(x) < 0 ? sdNeg(x) : x;
      }
      return null;
    }
    default: return null;
  }
}
function sdToS(a) {
  const terms = [];
  for (const [k, v] of a) terms.push(k === '1' ? sN(v) : sMul([sN(v), sPow(sI(Number(k)), sN(new Q(1n, 2n)))]));
  return sAdd(terms);
}
const sdRadical = (S) => {
  let found = false;
  const walk = (t) => {
    if (t.k === '^' && t.e.k === 'n' && !t.e.q.isInt()) found = true;
    if (t.k === '+' || t.k === '*' || t.k === 'f') t.a.forEach(walk);
    else if (t.k === '^') {
      walk(t.b);
      walk(t.e);
    }
  };
  walk(S);
  return found;
};
/** Textbook text of an element: "7 + 4√3", "(√6 - √2)/4", "√5 - 1", "3√7/7"; null for a rational number or an unwieldy element. */
function sdText(a) {
  if (sdIsRat(a) || a.size > 8) return null;
  let D = 1n;
  for (const v of a.values()) D = (D * v.d) / bgcd(D, v.d);
  const rows = [...a].map(([k, v]) => ({ k: BigInt(k), c: v.n * (D / v.d) }));
  let g = 0n;
  for (const r of rows) g = bgcd(g, r.c);
  g = bgcd(g, D);
  rows.forEach((r) => { r.c /= g; });
  D /= g;
  const rat = rows.find((r) => r.k === 1n);
  const rad = rows.filter((r) => r.k !== 1n).sort((x, y) => ((x.c > 0n) !== (y.c > 0n) ? (x.c > 0n ? -1 : 1) : x.k < y.k ? 1 : -1));
  let order = rat ? [rat].concat(rad) : rad;
  if (order[0].c < 0n) {
    const j = order.findIndex((r) => r.c > 0n);
    if (j > 0) order = [order[j]].concat(order.filter((_, i) => i !== j));
  }
  let body = '';
  order.forEach((r, i) => {
    const mag = babs(r.c);
    const t = r.k === 1n ? String(mag) : (mag === 1n ? '' : String(mag)) + '√' + r.k;
    if (i === 0) body = (r.c < 0n ? '-' : '') + t;
    else body += (r.c < 0n ? ' - ' : ' + ') + t;
  });
  if (D === 1n) return body;
  return order.length > 1 ? '(' + body + ')/' + D : body + '/' + D;
}
/** "text (≈ value)" for a constant made of rationals and square roots, or null when it is not one (or is a plain rational). */
function surdText(S) {
  if (S.k === 'n' || varsOfS(S).size) return null;
  const x = sdFromS(S);
  if (!x) return null;
  const t = sdText(x);
  if (!t) return null;
  const ev = sdNum(x);
  return t + ' (' + approxSym(ev) + ' ' + fmtNum(ev) + ')';
}
/** Replace every constant subtree made of rationals and square roots by its canonical a + b sqrt(m) + ... form. */
function surdNorm(S) {
  if (S.k === 'n' || S.k === 'v' || S.k === 'c') return S;
  if (!varsOfS(S).size) {
    if (!sdRadical(S)) return S.k === 'f' ? mapS(S, surdNorm) : S;
    const x = sdFromS(S);
    if (x) {
      const T = sdToS(x);
      if (x.size <= 6 || fmtS(T).length <= 3 * fmtS(S).length) return T;
    }
    return S;
  }
  return mapS(S, surdNorm);
}

// ---- exact values of all six trigonometric functions at rational multiples of pi ----------------
/** First-quadrant values [sin, cos, tan, cot, sec, csc] as S for the angle k*pi/m with m in {5, 8, 10}. */
function trigRefTable(num, den) {
  const r5 = () => sSqrt(sI(5));
  const q = (n, d) => sN(new Q(BigInt(n), BigInt(d)));
  const dv = (e, d) => sMul([q(1, d), e]);
  const sq = (a, b, c) => sSqrt(sAdd([sI(a), sMul([sI(b), sSqrt(sI(c))])]));
  if (den === 10 && num === 1) {
    return [dv(sSub(r5(), S1), 4), dv(sq(10, 2, 5), 4), dv(sq(25, -10, 5), 5), sq(5, 2, 5), dv(sq(50, -10, 5), 5), sAdd([r5(), S1])];
  }
  if (den === 5 && num === 1) {
    return [dv(sq(10, -2, 5), 4), dv(sAdd([S1, r5()]), 4), sq(5, -2, 5), dv(sq(25, 10, 5), 5), sSub(r5(), S1), dv(sq(50, 10, 5), 5)];
  }
  if (den === 10 && num === 3) {
    return [dv(sAdd([S1, r5()]), 4), dv(sq(10, -2, 5), 4), dv(sq(25, 10, 5), 5), sq(5, -2, 5), dv(sq(50, 10, 5), 5), sSub(r5(), S1)];
  }
  if (den === 5 && num === 2) {
    return [dv(sq(10, 2, 5), 4), dv(sSub(r5(), S1), 4), sq(5, 2, 5), dv(sq(25, -10, 5), 5), sAdd([S1, r5()]), dv(sq(50, -10, 5), 5)];
  }
  if (den === 8 && num === 1) {
    const r2 = sSqrt(sI(2));
    return [dv(sq(2, -1, 2), 2), dv(sq(2, 1, 2), 2), sSub(r2, S1), sAdd([r2, S1]), sq(4, -2, 2), sq(4, 2, 2)];
  }
  if (den === 8 && num === 3) {
    const r2 = sSqrt(sI(2));
    return [dv(sq(2, 1, 2), 2), dv(sq(2, -1, 2), 2), sAdd([r2, S1]), sSub(r2, S1), sq(4, 2, 2), sq(4, -2, 2)];
  }
  return null;
}
/** Value of fn (sin cos tan cot sec csc) at q*pi for the denominators handled exactly, as S, or null. */
function trigExactAll(fn, q) {
  const idx = { sin: 0, cos: 1, tan: 2, cot: 3, sec: 4, csc: 5 }[fn];
  if (idx === undefined) return null;
  const t = q.sub(qInt(2).mul(floorQ(q.div(qInt(2))))); // [0, 2)
  const d = Number(t.d);
  if (![1, 2, 3, 4, 5, 6, 8, 10, 12].includes(d)) return null;
  let quad;
  let ref;
  if (t.cmp(new Q(1n, 2n)) <= 0) { quad = 1; ref = t; }
  else if (t.cmp(Q1) <= 0) { quad = 2; ref = Q1.sub(t); }
  else if (t.cmp(new Q(3n, 2n)) <= 0) { quad = 3; ref = t.sub(Q1); }
  else { quad = 4; ref = qInt(2).sub(t); }
  // ref in [0, 1/2]
  const sign = { sin: [1, 1, -1, -1], cos: [1, -1, -1, 1], tan: [1, -1, 1, -1], cot: [1, -1, 1, -1], sec: [1, -1, -1, 1], csc: [1, 1, -1, -1] }[fn][quad - 1];
  let val;
  if (ref.isZero() || ref.eq(new Q(1n, 2n))) {
    const z = ref.isZero();
    const tab = { sin: z ? 0 : 1, cos: z ? 1 : 0 };
    if (fn === 'sin' || fn === 'cos') val = sI(tab[fn]);
    else if (fn === 'tan') { if (!z) return null; val = S0; }
    else if (fn === 'cot') { if (z) return null; val = S0; }
    else if (fn === 'sec') { if (!z) return null; val = S1; }
    else { if (z) return null; val = S1; }
  } else if ([1, 2, 3, 4, 6, 12].includes(Number(ref.d))) {
    const m = Number(ref.n) * (12 / Number(ref.d));
    const [s, c] = trigTable(m);
    let v;
    if (fn === 'sin') v = s;
    else if (fn === 'cos') v = c;
    else {
      const base = fn === 'tan' ? sDiv(s, c) : fn === 'cot' ? sDiv(c, s) : fn === 'sec' ? sDiv(S1, c) : sDiv(S1, s);
      const x = sdFromS(base);
      v = x ? sdToS(x) : base;
    }
    val = v;
  } else {
    const tab = trigRefTable(Number(ref.n), Number(ref.d));
    if (!tab) return null;
    val = tab[idx];
  }
  return sign < 0 ? sNeg(val) : val;
}

// ---- trigonometric functions of sums of inverse trigonometric functions ----------------------------
const INV_TRIG = new Set(['asin', 'acos', 'atan']);
function hasInvTrig(a) {
  if (a.k === 'f') return INV_TRIG.has(a.fn);
  if (a.k === '+' || a.k === '*') return a.a.some(hasInvTrig);
  return false;
}
/** sin, cos, tan, cot, sec, csc of  k1 asin(u1) + k2 acos(u2) + ... + (multiples of pi with exact values)  as S, or null. */
function trigOfInverse(fn, a) {
  if (!hasInvTrig(a)) return null;
  const terms = a.k === '+' ? a.a : [a];
  let sn = S0;
  let cs = S1;
  let used = false;
  for (const t of terms) {
    let k = Q1;
    let f = t;
    if (t.k === '*' && t.a.length === 2 && t.a[0].k === 'n') {
      k = t.a[0].q;
      f = t.a[1];
    }
    let sk;
    let ck;
    if (f.k === 'f' && INV_TRIG.has(f.fn) && f.a.length === 1 && k.isInt() && babs(k.n) <= 8n) {
      const u = f.a[0];
      let s1;
      let c1;
      if (f.fn === 'atan') {
        c1 = sPow(sAdd([S1, sPow(u, sI(2))]), sN(new Q(-1n, 2n)));
        s1 = sMul([u, c1]);
      } else {
        const root = sSqrt(sSub(S1, sPow(u, sI(2))));
        s1 = f.fn === 'asin' ? u : root;
        c1 = f.fn === 'asin' ? root : u;
      }
      sk = S0;
      ck = S1;
      for (let i = 0; i < Number(babs(k.n)); i++) {
        const ns = expandS(sAdd([sMul([sk, c1]), sMul([ck, s1])]));
        ck = expandS(sSub(sMul([ck, c1]), sMul([sk, s1])));
        sk = ns;
      }
      if (k.sign() < 0) sk = sNeg(sk);
      used = true;
    } else {
      const q = asPiMultiple(t);
      if (!q) return null;
      sk = trigExactAll('sin', q);
      ck = trigExactAll('cos', q);
      if (!sk || !ck) return null;
    }
    const ns = expandS(sAdd([sMul([sn, ck]), sMul([cs, sk])]));
    cs = expandS(sSub(sMul([cs, ck]), sMul([sn, sk])));
    sn = ns;
  }
  if (!used) return null;
  sn = surdNorm(sn);
  cs = surdNorm(cs);
  const zero = (x) => x.k === 'n' && x.q.isZero();
  switch (fn) {
    case 'sin': return sn;
    case 'cos': return cs;
    case 'tan': return zero(cs) ? null : surdNorm(sDiv(sn, cs));
    case 'cot': return zero(sn) ? null : surdNorm(sDiv(cs, sn));
    case 'sec': return zero(cs) ? null : surdNorm(sDiv(S1, cs));
    case 'csc': return zero(sn) ? null : surdNorm(sDiv(S1, sn));
    default: return null;
  }
}

// ---- commands ----------------------------------------------------------------------------------------------
/** Move square roots out of the denominator of an expression with letters in it: returns "(top)/(bottom)" text or null. */
function rationalizeSym(S) {
  const factors = S.k === '*' ? S.a : [S];
  const num = [];
  const den = [];
  for (const f of factors) {
    if (f.k === '^' && f.e.k === 'n' && f.e.q.sign() < 0) den.push(sPow(f.b, sN(f.e.q.neg())));
    else num.push(f);
  }
  if (!den.length) return null;
  let N = sMul(num);
  let D = sMul(den);
  const hasRoot = (t) => sdRadical(t);
  for (let round = 0; round < 4 && hasRoot(D); round++) {
    D = expandS(D);
    if (D.k === '+') {
      const conj = sSub(D.a[0], sAdd(D.a.slice(1)));
      N = expandS(sMul([N, conj]));
      D = expandS(sMul([D, conj]));
    } else {
      const rad = (D.k === '*' ? D.a : [D]).filter((t) => t.k === '^' && t.e.k === 'n' && !t.e.q.isInt());
      if (!rad.length) break;
      const m = sMul(rad);
      N = expandS(sMul([N, m]));
      D = expandS(sMul([D, m]));
    }
  }
  if (hasRoot(D)) return null;
  if (!sameFunction(sDiv(N, D), S)) return null;
  // numeric coefficients of a product go to the front of the top and of the bottom, and cancel against each other
  const lead = (t) => (t.k === '*' && t.a[0].k === 'n' ? t.a[0].q : t.k === 'n' ? t.q : Q1);
  const rest = (t) => (t.k === '*' && t.a[0].k === 'n' ? sMul(t.a.slice(1)) : t.k === 'n' ? S1 : t);
  if (N.k !== '+' && D.k !== '+') {
    const r = lead(N).div(lead(D));
    N = sMul([sN(new Q(r.n)), rest(N)]);
    D = sMul([sN(new Q(r.d)), rest(D)]);
  }
  const wrap = (t) => (t.k === 'n' || t.k === 'v' || t.k === 'f' ? fmtS(t) : '(' + fmtS(t) + ')');
  if (D.k === 'n' && D.q.eq(Q1)) return fmtS(N);
  return (N.k === '+' ? '(' + fmtS(N) + ')' : fmtS(N)) + '/' + wrap(D);
}
defCmd('rationalize rationalise radsimp denest', (n) => {
  needArgs(n, 1, 1, 'one expression');
  const out = newOut();
  const S = fromAst(n.args[0]);
  if (!varsOfS(S).size) {
    const x = sdFromS(S);
    if (!x) throw new MathError('this needs whole numbers, fractions and square roots only, e.g. rationalize(1/(sqrt(3)+1)) or denest(sqrt(5+2*sqrt(6)))');
    const t = sdText(x);
    if (t) out.answer.push(t + ' (' + approxSym(sdNum(x)) + ' ' + fmtNum(sdNum(x)) + ')');
    else out.answer.push(describeNumber(sdNum(x)) || String(sdRatQ(x)));
    out.work.push('Wrote the number as a + b√c + ... with no root in a denominator (multiplying by conjugates) and simplified nested roots');
    return out;
  }
  const t = rationalizeSym(S);
  if (t) {
    out.answer.push(t);
    out.work.push('Multiplied top and bottom by the conjugate of the denominator');
    return out;
  }
  out.answer.push(fmtS(surdNorm(simp(S))));
  out.notes.push('There was no square root in a denominator to remove.');
  return out;
});

/** tan or sec at an odd multiple of pi/2, cot or csc at a multiple of pi: these do not exist. */
function trigUndefined(S) {
  if (S.k === 'f' && S.a.length === 1 && ['tan', 'sec', 'cot', 'csc'].includes(S.fn)) {
    const q = asPiMultiple(S.a[0]);
    if (q) {
      const halfOdd = q.d === 2n;
      const integer = q.isInt();
      if (((S.fn === 'tan' || S.fn === 'sec') && halfOdd) || ((S.fn === 'cot' || S.fn === 'csc') && integer)) {
        throw new MathError(S.fn + '(' + fmtS(S.a[0]) + ') is undefined (the function does not exist at this angle)');
      }
    }
  }
  if (S.k === '+' || S.k === '*' || S.k === 'f') S.a.forEach(trigUndefined);
  else if (S.k === '^') {
    trigUndefined(S.b);
    trigUndefined(S.e);
  }
}
