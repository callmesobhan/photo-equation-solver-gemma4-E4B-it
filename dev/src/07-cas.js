
// ======================================================================
// 7. Small computer-algebra core: canonical symbolic expressions
//    k: 'n' number (Q) | 'v' variable | 'c' constant (pi, e) | '+' sum | '*' product
//       '^' power | 'f' function application
// ======================================================================
const sN = (q) => ({ k: 'n', q });
const sI = (n) => sN(qInt(n));
const S0 = sI(0);
const S1 = sI(1);
const SM1 = sI(-1);
const sV = (name) => ({ k: 'v', name });
const sC = (name) => ({ k: 'c', name });
const S_PI = sC('pi');
const S_E = sC('e');
const isN = (e) => e.k === 'n';
const isNumVal = (e, n) => e.k === 'n' && e.q.eq(qInt(n));
const isConstE = (e) => e.k === 'c' && e.name === 'e';

function key(e) {
  if (e._k !== undefined) return e._k;
  let s;
  switch (e.k) {
    case 'n': s = e.q.toString(); break;
    case 'v': s = e.name; break;
    case 'c': s = '#' + e.name; break;
    case '+': s = '(' + e.a.map(key).join('+') + ')'; break;
    case '*': s = '(' + e.a.map(key).join('*') + ')'; break;
    case '^': s = '(' + key(e.b) + '^' + key(e.e) + ')'; break;
    default: s = e.fn + '[' + e.a.map(key).join(',') + ']';
  }
  e._k = s;
  return s;
}

function degOf(e) {
  switch (e.k) {
    case 'v': return 1;
    case '^': return e.e.k === 'n' ? degOf(e.b) * e.e.q.toNumber() : 0;
    case '*': return e.a.reduce((s, f) => s + degOf(f), 0);
    case '+': return Math.max(...e.a.map(degOf));
    default: return 0;
  }
}
/** Exponents of the plain variable powers of a product term, e.g. 3*x^2*y -> {x: 2, y: 1}. */
function monoOf(t) {
  const m = new Map();
  for (const f of t.k === '*' ? t.a : [t]) {
    if (f.k === 'v') m.set(f.name, (m.get(f.name) || 0) + 1);
    else if (f.k === '^' && f.b.k === 'v' && f.e.k === 'n') m.set(f.b.name, (m.get(f.b.name) || 0) + f.e.q.toNumber());
  }
  return m;
}
function termCmp(a, b) {
  const da = degOf(a);
  const db = degOf(b);
  if (da !== db) return db - da;
  const A = monoOf(a);
  const B = monoOf(b);
  for (const nm of Array.from(new Set([...A.keys(), ...B.keys()])).sort()) {
    const ea = A.get(nm) || 0;
    const eb = B.get(nm) || 0;
    if (ea !== eb) return eb - ea;
  }
  const fa = fnCount(a);
  const fb = fnCount(b);
  if (fa !== fb) return fb - fa;
  const ka = key(a);
  const kb = key(b);
  return ka < kb ? -1 : ka > kb ? 1 : 0;
}
function fnCount(e) {
  if (e.k === 'f') return 1;
  if (e.k === '*' || e.k === '+') return e.a.reduce((s, t) => s + fnCount(t), 0);
  if (e.k === '^') return fnCount(e.b) + fnCount(e.e);
  return 0;
}
function factorRank(f) {
  if (f.k === 'c') return 1;
  if (f.k === 'v' || (f.k === '^' && f.b.k === 'v')) return 2;
  return 3;
}
function factorCmp(a, b) {
  const ra = factorRank(a);
  const rb = factorRank(b);
  if (ra !== rb) return ra - rb;
  if (ra === 2) {
    const va = a.k === 'v' ? a.name : a.b.name;
    const vb = b.k === 'v' ? b.name : b.b.name;
    if (va !== vb) return va < vb ? -1 : 1;
  }
  const ka = key(a);
  const kb = key(b);
  return ka < kb ? -1 : ka > kb ? 1 : 0;
}

function splitCoef(t) {
  if (t.k === '*' && t.a[0].k === 'n') return [t.a[0].q, t.a.length === 2 ? t.a[1] : { k: '*', a: t.a.slice(1) }];
  return [Q1, t];
}
function mulRaw(coef, rest) {
  if (coef.eq(Q1)) return rest;
  return rest.k === '*' ? { k: '*', a: [sN(coef)].concat(rest.a) } : { k: '*', a: [sN(coef), rest] };
}

function sAdd(terms) {
  const flat = [];
  const push = (t) => {
    if (t.k === '+') t.a.forEach(push);
    else flat.push(t);
  };
  terms.forEach(push);
  let c = Q0;
  const map = new Map();
  for (const t of flat) {
    if (t.k === 'n') {
      c = c.add(t.q);
      continue;
    }
    const [coef, rest] = splitCoef(t);
    const k = key(rest);
    const ex = map.get(k);
    if (ex) ex.coef = ex.coef.add(coef);
    else map.set(k, { coef, rest });
  }
  const out = [];
  for (const { coef, rest } of map.values()) {
    if (!coef.isZero()) out.push(mulRaw(coef, rest));
  }
  out.sort(termCmp);
  if (!c.isZero()) out.push(sN(c));
  if (!out.length) return S0;
  return out.length === 1 ? out[0] : { k: '+', a: out };
}

function sMul(factors) {
  let list = factors;
  for (let round = 0; round < 6; round++) {
    const flat = [];
    const push = (t) => {
      if (t.k === '*') t.a.forEach(push);
      else flat.push(t);
    };
    list.forEach(push);
    let c = Q1;
    const bases = new Map();
    const order = [];
    for (const f of flat) {
      if (f.k === 'n') {
        if (f.q.isZero()) return S0;
        c = c.mul(f.q);
        continue;
      }
      let b = f;
      let e = S1;
      if (f.k === '^') {
        b = f.b;
        e = f.e;
      }
      const k = key(b);
      if (bases.has(k)) bases.get(k).exps.push(e);
      else {
        bases.set(k, { base: b, exps: [e] });
        order.push(k);
      }
    }
    const items = [];
    let again = false;
    for (const k of order) {
      const { base, exps } = bases.get(k);
      const p = sPow(base, exps.length === 1 ? exps[0] : sAdd(exps));
      if (p.k === 'n') c = c.mul(p.q);
      else if (p.k === '*') {
        again = true;
        p.a.forEach((x) => (x.k === 'n' ? (c = c.mul(x.q)) : items.push(x)));
      } else items.push(p);
    }
    if (c.isZero()) return S0;
    if (again) {
      list = (c.eq(Q1) ? [] : [sN(c)]).concat(items);
      continue;
    }
    // radicals of rational numbers with the same index merge:  √2·√3 = √6,  √2·√8 = 4
    const radIdx = items.map((it, i) => (it.k === '^' && it.b.k === 'n' && it.b.q.sign() > 0 && it.e.k === 'n' && !it.e.q.isInt() && it.e.q.d < 13n && babs(it.e.q.n) < 50n ? i : -1)).filter((i) => i >= 0);
    if (radIdx.length >= 2) {
      const byIndex = new Map();
      radIdx.forEach((i) => {
        const d = items[i].e.q.d.toString();
        if (!byIndex.has(d)) byIndex.set(d, []);
        byIndex.get(d).push(i);
      });
      const drop = new Set();
      const added = [];
      let merged = false;
      for (const [d, idxs] of byIndex) {
        if (idxs.length < 2) continue;
        let P = Q1;
        idxs.forEach((i) => {
          const p = Number(items[i].e.q.n);
          P = P.mul(p >= 0 ? items[i].b.q.pow(p) : items[i].b.q.inv().pow(-p));
        });
        const r = numPowFrac(P, new Q(1n, BigInt(d)));
        if (!r) continue;
        merged = true;
        idxs.forEach((i) => drop.add(i));
        c = c.mul(r.coef);
        if (r.radicand) added.push(sPowRaw(sN(r.radicand), sN(new Q(1n, BigInt(r.index)))));
      }
      if (merged) {
        list = (c.eq(Q1) ? [] : [sN(c)]).concat(items.filter((_, i) => !drop.has(i)), added);
        continue;
      }
    }
    items.sort(factorCmp);
    if (!items.length) return sN(c);
    if (items.length === 1 && c.eq(Q1)) return items[0];
    // a numeric coefficient is distributed over a sum: 2(x+1) -> 2x + 2, -(a-b) -> b - a
    if (items.length === 1 && items[0].k === '+') return sAdd(items[0].a.map((t) => sMul([sN(c), t])));
    return { k: '*', a: (c.eq(Q1) ? [] : [sN(c)]).concat(items) };
  }
  throw new MathError('expression too complicated');
}

function primeFactors(n) {
  // n: BigInt > 1 (moderate size) -> Map prime(BigInt) -> exponent(number); null when too large
  if (bitLen(n) > 62) return null;
  const f = new Map();
  let m = n;
  for (let p = 2n; p * p <= m; p += p === 2n ? 1n : 2n) {
    while (m % p === 0n) {
      f.set(p, (f.get(p) || 0) + 1);
      m /= p;
    }
    if (p > 4000000n) return null;
  }
  if (m > 1n) f.set(m, (f.get(m) || 0) + 1);
  return f;
}

/** q^(r) for positive rational q and rational r (non-integer): extract perfect powers. */
function numPowFrac(q, r) {
  if (q.sign() < 0 || q.isZero()) return null;
  const rn = r.n;
  const rd = Number(r.d);
  const num = primeFactors(q.n);
  const den = primeFactors(q.d);
  if (!num || !den) return null;
  const outside = [];
  let coef = Q1;
  let inside = Q1;
  const handle = (primes, sgn) => {
    for (const [p, a] of primes) {
      const tot = BigInt(a) * rn * BigInt(sgn); // exponent of p is a * r  (r = rn/rd)
      let whole = tot / BigInt(rd);
      let rem = tot % BigInt(rd);
      if (rem < 0n) {
        rem += BigInt(rd);
        whole -= 1n;
      }
      if (whole !== 0n) coef = coef.mul(new Q(p).pow(Number(whole)));
      if (rem !== 0n) outside.push([p, rem]);
    }
  };
  handle(num, 1);
  handle(den, -1);
  // rationalise the common case sqrt(p/q) style: keep leftover primes as (prod p^rem)^(1/rd)
  if (outside.length) {
    // combine into one radicand when all share the same denominator rd
    let rad = Q1;
    for (const [p, rem] of outside) rad = rad.mul(new Q(p).pow(Number(rem)));
    inside = rad;
    return { coef, radicand: inside, index: rd };
  }
  return { coef, radicand: null, index: rd };
}

function sPow(b, e) {
  if (e.k === 'n') {
    const q = e.q;
    if (q.isZero()) return S1;
    if (q.eq(Q1)) return b;
    if (b.k === 'f' && b.fn === 'abs' && b.a.length === 1 && q.isInt() && q.n % 2n === 0n) return sPow(b.a[0], e);
    if (b.k === 'n') {
      if (b.q.eq(Q1)) return S1;
      if (b.q.isZero()) return q.sign() > 0 ? S0 : sPowRaw(b, e);
      if (q.isInt()) {
        if (babs(q.n) > 4000n) throw new MathError('exponent too large');
        return sN(b.q.pow(Number(q.n)));
      }
      if (b.q.sign() > 0) {
        const r = numPowFrac(b.q, q);
        if (r && r.coef.eq(Q1) && r.radicand && r.radicand.eq(b.q) && q.n === 1n) return sPowRaw(b, e);
        if (r) {
          const rad = r.radicand ? sPowRaw(sN(r.radicand), sN(new Q(1n, BigInt(r.index)))) : S1;
          return sMul([sN(r.coef), rad]);
        }
      } else if (q.d % 2n === 1n) {
        const pos = sPow(sN(b.q.neg()), e);
        return q.n % 2n === 0n ? pos : sMul([SM1, pos]);
      }
      return sPowRaw(b, e);
    }
    if (q.isInt()) {
      if (b.k === '^') return sPow(b.b, sMul([b.e, e]));
      if (b.k === '*') return sMul(b.a.map((f) => sPow(f, e)));
    } else if (b.k === '*' && b.a[0].k === 'n' && b.a[0].q.sign() > 0) {
      return sMul([sPow(b.a[0], e), sPow(sMul(b.a.slice(1)), e)]);
    }
    if (b.k === '^' && isConstE(b.b)) return sPow(S_E, sMul([b.e, e]));
  }
  if (b.k === 'n' && b.q.eq(Q1)) return S1;
  if (isConstE(b) && e.k === 'f' && e.fn === 'ln') return e.a[0];
  if (isConstE(b) && (e.k === '+' || e.k === '*')) {
    // e^(a + c ln u) = e^a u^c for rational c
    const lnPart = (t) => {
      if (t.k === 'f' && t.fn === 'ln' && t.a.length === 1) return { c: Q1, u: t.a[0] };
      if (t.k === '*' && t.a.length === 2 && t.a[0].k === 'n' && t.a[1].k === 'f' && t.a[1].fn === 'ln' && t.a[1].a.length === 1) return { c: t.a[0].q, u: t.a[1].a[0] };
      return null;
    };
    const terms = e.k === '+' ? e.a : [e];
    const rest = [];
    const pulled = [];
    terms.forEach((t) => {
      const lp = lnPart(t);
      if (lp) pulled.push(sPow(lp.u, sN(lp.c)));
      else rest.push(t);
    });
    if (pulled.length) return sMul([rest.length ? sPow(S_E, sAdd(rest)) : S1].concat(pulled));
  }
  if (b.k === '^' && isConstE(b.b)) return sPow(S_E, sMul([b.e, e]));
  if (b.k === '^' && b.e.k === 'n' && b.e.q.isInt() && e.k !== 'n') {
    return sPowRaw(b.b, sMul([b.e, e]));
  }
  return sPowRaw(b, e);
}
const sPowRaw = (b, e) => ({ k: '^', b, e });
const sNeg = (a) => sMul([SM1, a]);
const sSub = (a, b) => sAdd([a, sNeg(b)]);
const sDiv = (a, b) => sMul([a, sPow(b, SM1)]);
const sSqrt = (a) => sPow(a, sN(new Q(1n, 2n)));
const sExp = (a) => sPow(S_E, a);

// ---- exact values of trigonometric functions at rational multiples of pi ---------------
const R2 = () => sSqrt(sI(2));
const R3 = () => sSqrt(sI(3));
const half = (x) => sMul([sN(new Q(1n, 2n)), x]);
function trigExact(fn, q) {
  // q: Q, angle = q*pi. returns S or null
  return trigExactAll(fn, q);
}
function floorQ(q) {
  let f = q.n / q.d;
  if (q.n < 0n && q.n % q.d !== 0n) f -= 1n;
  return new Q(f);
}
function trigTable(m) {
  // m in 0..23 (angle = m*pi/12): [sin, cos]
  const sq6 = sSqrt(sI(6));
  const sq2 = R2();
  const base = {
    0: [S0, S1],
    1: [sMul([sN(new Q(1n, 4n)), sSub(sq6, sq2)]), sMul([sN(new Q(1n, 4n)), sAdd([sq6, sq2])])],
    2: [sN(new Q(1n, 2n)), half(R3())],
    3: [half(sq2), half(sq2)],
    4: [half(R3()), sN(new Q(1n, 2n))],
    5: [sMul([sN(new Q(1n, 4n)), sAdd([sq6, sq2])]), sMul([sN(new Q(1n, 4n)), sSub(sq6, sq2)])],
    6: [S1, S0],
  };
  const mm = ((m % 24) + 24) % 24;
  // reduce to the first quadrant with sign changes
  let ang = mm;
  let sgnS = 1;
  let sgnC = 1;
  if (ang > 12) {
    ang = 24 - ang;
    sgnS = -1; // sin(2pi - a) = -sin(a), cos same
  }
  if (ang > 6) {
    ang = 12 - ang;
    sgnC = -sgnC; // sin(pi - a) = sin(a), cos(pi - a) = -cos(a)
  }
  const [s, c] = base[ang];
  return [sgnS < 0 ? sNeg(s) : s, sgnC < 0 ? sNeg(c) : c];
}

function negCoefArg(a) {
  // if a = -c * rest (c > 0) return rest scaled, else null
  if (a.k === 'n' && a.q.sign() < 0) return sN(a.q.neg());
  if (a.k === '*' && a.a[0].k === 'n' && a.a[0].q.sign() < 0) return sMul([sN(a.a[0].q.neg())].concat(a.a.slice(1)));
  return null;
}
function asPiMultiple(a) {
  // a = q * pi  -> q (Q) else null
  if (a.k === 'n' && a.q.isZero()) return Q0;
  if (a.k === 'c' && a.name === 'pi') return Q1;
  if (a.k === '*' && a.a.length === 2 && a.a[0].k === 'n' && a.a[1].k === 'c' && a.a[1].name === 'pi') return a.a[0].q;
  return null;
}

/** 1 if provably > 0, 0 if provably >= 0, -1 if unknown. */
function signInfo(e) {
  switch (e.k) {
    case 'n': return e.q.sign() > 0 ? 1 : e.q.isZero() ? 0 : -1;
    case 'c': return 1;
    case '^': {
      if (isConstE(e.b)) return 1;
      const sb = signInfo(e.b);
      if (sb === 1) return 1;
      if (e.e.k === 'n' && e.e.q.isInt() && e.e.q.n % 2n === 0n) return 0;
      if (sb === 0 && e.e.k === 'n' && e.e.q.sign() > 0) return 0;
      return -1;
    }
    case '*': {
      const s = e.a.map(signInfo);
      if (s.some((v) => v === -1)) return -1;
      return s.every((v) => v === 1) ? 1 : 0;
    }
    case '+': {
      const s = e.a.map(signInfo);
      if (s.some((v) => v === -1)) return -1;
      return s.some((v) => v === 1) ? 1 : 0;
    }
    case 'f': return e.fn === 'cosh' ? 1 : e.fn === 'abs' ? 0 : -1;
    default: return -1;
  }
}

function sFn(fn, args) {
  const a = args[0];
  const num = a.k === 'n' ? a.q : null;
  if (fn === 'heaviside' || fn === 'dirac' || /^dirac\d+$/.test(fn)) {
    // an argument without letters (2 - 5, π - 3 ...) has a definite sign
    let v = null;
    if (num) v = num.toNumber();
    else if (a.k !== 'v' && !varsOfS(a).size) v = numS(a, {});
    if (v !== null && isFinite(v) && Math.abs(v) > 1e-12) return fn === 'heaviside' ? (v > 0 ? S1 : S0) : S0;
    if (v !== null && num && num.isZero() && fn === 'heaviside') return sN(new Q(1n, 2n));
  }
  switch (fn) {
    case 'sin': case 'tan': case 'cot':
    case 'sinh': case 'tanh': case 'asin': case 'atan': {
      if (num && num.isZero() && fn !== 'cot') return S0;
      const neg = negCoefArg(a);
      if (neg) return sNeg(sFn(fn, [neg]));
      break;
    }
    case 'cos': case 'cosh': case 'abs': {
      if (fn === 'cos' && num && num.isZero()) return S1;
      if (fn === 'cosh' && num && num.isZero()) return S1;
      const neg = negCoefArg(a);
      if (neg) return sFn(fn, [neg]);
      break;
    }
    default: break;
  }
  switch (fn) {
    case 'sin': case 'cos': case 'tan': {
      const q = asPiMultiple(a);
      if (q) {
        const v = trigExact(fn, q);
        if (v) return v;
      }
      if (fn === 'sin' && a.k === 'f' && a.fn === 'asin') return a.a[0];
      if (fn === 'cos' && a.k === 'f' && a.fn === 'acos') return a.a[0];
      if (fn === 'tan' && a.k === 'f' && a.fn === 'atan') return a.a[0];
      if (fn === 'cos' && a.k === 'f' && a.fn === 'asin') return sSqrt(sSub(S1, sPow(a.a[0], sI(2))));
      if (fn === 'sin' && a.k === 'f' && a.fn === 'acos') return sSqrt(sSub(S1, sPow(a.a[0], sI(2))));
      if (fn === 'sin' && a.k === 'f' && a.fn === 'atan') return sDiv(a.a[0], sSqrt(sAdd([S1, sPow(a.a[0], sI(2))])));
      if (fn === 'cos' && a.k === 'f' && a.fn === 'atan') return sDiv(S1, sSqrt(sAdd([S1, sPow(a.a[0], sI(2))])));
      const inv = trigOfInverse(fn, a);
      if (inv) return inv;
      break;
    }
    case 'cot': case 'sec': case 'csc': {
      const q = asPiMultiple(a);
      if (q) {
        const v = trigExact(fn, q);
        if (v) return v;
      }
      const inv = trigOfInverse(fn, a);
      if (inv) return inv;
      break;
    }
    case 'asin': case 'acos': case 'atan': {
      if (isNumVal(a, 1) && fn === 'atan') return sMul([sN(new Q(1n, 4n)), S_PI]);
      if (fn === 'acos' && isNumVal(a, 1)) return S0;
      if (fn === 'acos' && isNumVal(a, 0)) return sMul([sN(new Q(1n, 2n)), S_PI]);
      // look for a special angle with sin/cos/tan equal to a
      const v = varsOfS(a).size ? NaN : numS(a, {});
      if (isFinite(v) && (a.k === 'n' || a.k === '*' || a.k === '^')) {
        const f = fn === 'asin' ? Math.asin(v) : fn === 'acos' ? Math.acos(v) : Math.atan(v);
        const fr = toFraction(f / Math.PI, 12);
        if (fr && [1, 2, 3, 4, 6, 12].includes(fr.q)) {
          const cand = new Q(BigInt(fr.p), BigInt(fr.q));
          const back = trigExact(fn === 'asin' ? 'sin' : fn === 'acos' ? 'cos' : 'tan', cand);
          if (back && key(back) === key(a)) return sMul([sN(cand), S_PI]);
        }
      }
      break;
    }
    case 'ln': {
      if (isNumVal(a, 1)) return S0;
      if (isConstE(a)) return S1;
      if (a.k === '^' && isConstE(a.b)) return a.e;
      if (a.k === '^' && a.e.k === 'n' && a.b.k === 'n' && a.b.q.sign() > 0) return sMul([a.e, sFn('ln', [a.b])]);
      break;
    }
    case 'abs': {
      if (num) return sN(num.abs());
      if (signInfo(a) >= 0) return a;
      if (a.k === '^' && a.e.k === 'n' && a.e.q.isInt() && a.e.q.n % 2n === 0n) return a;
      if (a.k === '^' && isConstE(a.b)) return a;
      if (a.k === 'c') return a;
      break;
    }
    default: break;
  }
  return { k: 'f', fn, a: args };
}

// ---- generic rebuild ---------------------------------------------------------------------
function simp(e) {
  switch (e.k) {
    case '+': return sAdd(e.a.map(simp));
    case '*': return sMul(e.a.map(simp));
    case '^': return sPow(simp(e.b), simp(e.e));
    case 'f': return sFn(e.fn, e.a.map(simp));
    default: return e;
  }
}
function mapS(e, f) {
  switch (e.k) {
    case '+': return sAdd(e.a.map(f));
    case '*': return sMul(e.a.map(f));
    case '^': return sPow(f(e.b), f(e.e));
    case 'f': return sFn(e.fn, e.a.map(f));
    default: return e;
  }
}
function subsS(e, name, val) {
  if (e.k === 'v') return e.name === name ? val : e;
  return mapS(e, (x) => subsS(x, name, val));
}
function subsMany(e, map) {
  if (e.k === 'v') return map.has(e.name) ? map.get(e.name) : e;
  return mapS(e, (x) => subsMany(x, map));
}
function freeOf(e, name) {
  switch (e.k) {
    case 'v': return e.name !== name;
    case '+': case '*': return e.a.every((x) => freeOf(x, name));
    case '^': return freeOf(e.b, name) && freeOf(e.e, name);
    case 'f': return e.a.every((x) => freeOf(x, name));
    default: return true;
  }
}
function varsOfS(e, set) {
  set = set || new Set();
  if (e.k === 'v') set.add(e.name);
  else if (e.k === '+' || e.k === '*' || e.k === 'f') e.a.forEach((x) => varsOfS(x, set));
  else if (e.k === '^') {
    varsOfS(e.b, set);
    varsOfS(e.e, set);
  }
  return set;
}

// ---- expand -------------------------------------------------------------------------------
const MAX_TERMS = 4000;
function termsOf(e) { return e.k === '+' ? e.a : [e]; }
function expandS(e) {
  switch (e.k) {
    case '+': return sAdd(e.a.map(expandS));
    case '*': {
      let acc = [S1];
      for (const f of e.a) {
        const ts = termsOf(expandS(f));
        if (acc.length * ts.length > MAX_TERMS) throw new MathError('the expansion is too large');
        const next = [];
        for (const x of acc) for (const y of ts) next.push(sMul([x, y]));
        acc = next;
      }
      return sAdd(acc);
    }
    case '^': {
      const b = expandS(e.b);
      if (e.e.k === 'n' && e.e.q.isInt() && e.e.q.sign() > 0 && b.k === '+') {
        const n = Number(e.e.q.n);
        if (n > 60) throw new MathError('the exponent is too large to expand');
        let acc = b;
        for (let i = 1; i < n; i++) {
          const A = termsOf(acc);
          const B = termsOf(b);
          if (A.length * B.length > MAX_TERMS) throw new MathError('the expansion is too large');
          const next = [];
          for (const x of A) for (const y of B) next.push(sMul([x, y]));
          acc = sAdd(next);
        }
        return acc;
      }
      return sPow(b, expandS(e.e));
    }
    case 'f': return sFn(e.fn, e.a.map(expandS));
    default: return e;
  }
}

// ---- numeric evaluation ----------------------------------------------------------------------
function numS(e, env) {
  switch (e.k) {
    case 'n': return e.q.toNumber();
    case 'v': {
      const v = env[e.name];
      if (v === undefined) throw new MathError('unknown variable ' + e.name);
      return v;
    }
    case 'c': return e.name === 'pi' ? Math.PI : e.name === 'e' ? Math.E : Infinity;
    case '+': { let s = 0; for (const t of e.a) s += numS(t, env); return s; }
    case '*': { let s = 1; for (const t of e.a) s *= numS(t, env); return s; }
    case '^': return powNum(numS(e.b, env), numS(e.e, env));
    default: return callNum(e.fn, e.a.map((x) => numS(x, env)));
  }
}
/** Are two expressions equal as functions? Tests at pseudo-random points in several ranges (positive, negative, small). */
function sameFunction(a, b, names, minPoints) {
  const vs = names || Array.from(new Set([...varsOfS(a), ...varsOfS(b)]));
  const ranges = [[0.05, 0.95], [0.3, 2.7], [1.2, 4], [-0.95, -0.05], [-3, -0.3], [4, 9]];
  let good = 0;
  let seed = 12345;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let t = 0; t < 60 && good < 10; t++) {
    const [lo, hi] = ranges[t % ranges.length];
    const env = {};
    vs.forEach((v) => { env[v] = lo + rnd() * (hi - lo); });
    let x;
    let y;
    try {
      x = numS(a, env);
      y = numS(b, env);
    } catch (err) {
      continue;
    }
    if (!isFinite(x) || !isFinite(y)) continue;
    if (Math.abs(x - y) > 1e-7 * (1 + Math.abs(x) + Math.abs(y))) return false;
    good++;
  }
  return good >= (minPoints || 3);
}

// ---- differentiation ---------------------------------------------------------------------------
function dfn(fn, u) {
  switch (fn) {
    case 'sin': return sFn('cos', [u]);
    case 'cos': return sNeg(sFn('sin', [u]));
    case 'tan': return sPow(sFn('cos', [u]), sI(-2));
    case 'cot': return sNeg(sPow(sFn('sin', [u]), sI(-2)));
    case 'sec': return sMul([sFn('sec', [u]), sFn('tan', [u])]);
    case 'csc': return sNeg(sMul([sFn('csc', [u]), sFn('cot', [u])]));
    case 'asin': return sPow(sSub(S1, sPow(u, sI(2))), sN(new Q(-1n, 2n)));
    case 'acos': return sNeg(sPow(sSub(S1, sPow(u, sI(2))), sN(new Q(-1n, 2n))));
    case 'atan': return sPow(sAdd([S1, sPow(u, sI(2))]), SM1);
    case 'sinh': return sFn('cosh', [u]);
    case 'cosh': return sFn('sinh', [u]);
    case 'tanh': return sPow(sFn('cosh', [u]), sI(-2));
    case 'ln': return sPow(u, SM1);
    case 'abs': return sDiv(u, sFn('abs', [u]));
    case 'heaviside': return sFn('dirac', [u]);
    case 'erf': return sMul([sDiv(sI(2), sSqrt(S_PI)), sExp(sNeg(sPow(u, sI(2))))]);
    default:
      if (fn === 'dirac' || /^dirac\d+$/.test(fn)) return sFn('dirac' + ((Number(fn.slice(5)) || 0) + 1), [u]);
      throw new MathError('cannot differentiate ' + fn);
  }
}
function diffS(e, x) {
  switch (e.k) {
    case 'n': case 'c': return S0;
    case 'v': return e.name === x ? S1 : S0;
    case '+': return sAdd(e.a.map((t) => diffS(t, x)));
    case '*': {
      const terms = [];
      for (let i = 0; i < e.a.length; i++) {
        const d = diffS(e.a[i], x);
        if (isNumVal(d, 0)) continue;
        terms.push(sMul(e.a.map((f, j) => (j === i ? d : f))));
      }
      return sAdd(terms);
    }
    case '^': {
      const { b, e: ex } = e;
      if (freeOf(ex, x)) {
        const db = diffS(b, x);
        if (isNumVal(db, 0)) return S0;
        return sMul([ex, sPow(b, sSub(ex, S1)), db]);
      }
      if (freeOf(b, x)) {
        const de = diffS(ex, x);
        return sMul([e, sFn('ln', [b]), de]);
      }
      return sMul([e, sAdd([sMul([diffS(ex, x), sFn('ln', [b])]), sMul([ex, diffS(b, x), sPow(b, SM1)])])]);
    }
    default: {
      if (e.a.length !== 1) throw new MathError('cannot differentiate ' + e.fn);
      const du = diffS(e.a[0], x);
      if (isNumVal(du, 0)) return S0;
      return sMul([dfn(e.fn, e.a[0]), du]);
    }
  }
}
function nthDiff(e, x, n) {
  let r = e;
  for (let i = 0; i < n; i++) r = diffS(r, x);
  return r;
}

// ---- conversion from the parser's AST ----------------------------------------------------------
const AST_FN = {
  sin: 'sin', cos: 'cos', tan: 'tan', cot: 'cot', sec: 'sec', csc: 'csc', asin: 'asin', acos: 'acos',
  atan: 'atan', sinh: 'sinh', cosh: 'cosh', tanh: 'tanh', ln: 'ln', abs: 'abs', erf: 'erf', heaviside: 'heaviside', dirac: 'dirac',
};
function fromAst(n) {
  switch (n.t) {
    case 'num': return sN(n.q);
    case 'var': return sV(n.name);
    case 'dvar': return sV(n.name + "'".repeat(n.order));
    case 'const':
      if (n.name === 'oo') throw new MathError('infinity cannot be used here');
      return sC(n.name);
    case 'neg': return sNeg(fromAst(n.a));
    case 'pct': return sMul([fromAst(n.a), sN(new Q(1n, 100n))]);
    case 'fact': {
      const a = fromAst(n.a);
      if (a.k === 'n' && a.q.isInt() && a.q.sign() >= 0 && a.q.n <= 400n) {
        let r = 1n;
        for (let k = 2n; k <= a.q.n; k++) r *= k;
        return sN(new Q(r));
      }
      return { k: 'f', fn: 'fact', a: [a] };
    }
    case 'bin': {
      const a = fromAst(n.a);
      const b = fromAst(n.b);
      switch (n.op) {
        case '+': return sAdd([a, b]);
        case '-': return sSub(a, b);
        case '*': return sMul([a, b]);
        case '/': return sDiv(a, b);
        default: return sPow(a, b);
      }
    }
    case 'call': {
      if (n.cmd) return commandValueS(n);
      const args = n.args.map(fromAst);
      switch (n.fn) {
        case 'sqrt': return sSqrt(args[0]);
        case 'cbrt': return sPow(args[0], sN(new Q(1n, 3n)));
        case 'root': return sPow(args[1], sDiv(S1, args[0]));
        case 'exp': return sExp(args[0]);
        case 'log10': return sLogBase(args[0], sI(10));
        case 'log2': return sLogBase(args[0], sI(2));
        case 'log': return args.length > 1 ? sLogBase(args[0], args[1]) : sLogBase(args[0], sI(10));
        default:
          if (AST_FN[n.fn]) return sFn(AST_FN[n.fn], args);
          throw new MathError('"' + n.fn + '" cannot be used inside this kind of expression');
      }
    }
    default: throw new MathError('this expression cannot be used here');
  }
}

/** log of a in base b; a whole or fractional power of b collapses to a number (log(8, 2) = 3). */
function sLogBase(a, b) {
  if (a.k === 'n' && b.k === 'n' && a.q.sign() > 0 && b.q.sign() > 0 && !b.q.eq(Q1)) {
    const f = Math.log(a.q.toNumber()) / Math.log(b.q.toNumber());
    const fr = isFinite(f) ? toFraction(f, 24) : null;
    if (fr && fr.q > 0 && Math.abs(fr.p) <= 200) {
      const p = BigInt(fr.p);
      const qd = BigInt(fr.q);
      const lhs = b.q.pow(Number(p < 0n ? -p : p));
      const rhs = a.q.pow(Number(qd));
      if ((p >= 0n ? lhs.eq(rhs) : lhs.mul(rhs).eq(Q1))) return sN(new Q(p, qd));
    }
  }
  return sDiv(sFn('ln', [a]), sFn('ln', [b]));
}

// ---- bridge to rational functions in one variable ---------------------------------------------------
function toRFS(e, x, dom) {
  dom = dom || [];
  const X = rf([Q0, Q1], [Q1]);
  const go = (t) => {
    switch (t.k) {
      case 'n': return rfConst(t.q);
      case 'v':
        if (t.name === x) return X;
        throw new NotAlgebraic('other variable');
      case '+': return t.a.map(go).reduce((p, q) => rfAdd(p, q));
      case '*': return t.a.map(go).reduce((p, q) => rfMul(p, q));
      case '^': {
        if (t.e.k !== 'n' || !t.e.q.isInt()) throw new NotAlgebraic('exponent');
        const k = Number(t.e.q.n);
        return rfPow(go(t.b), k, dom);
      }
      default: throw new NotAlgebraic('function');
    }
  };
  return go(e);
}
function polyToS(P, x) {
  const v = sV(x);
  return sAdd(P.map((c, k) => sMul([sN(c), sPow(v, sI(k))])));
}
function rfToS(r, x) {
  const n = polyToS(r.n, x);
  if (r.d.length === 1) return r.d[0].eq(Q1) ? n : sMul([n, sN(r.d[0].inv())]);
  return sDiv(n, polyToS(r.d, x));
}

// ---- printing ------------------------------------------------------------------------------------------
const FN_LABEL = { asin: 'arcsin', acos: 'arccos', atan: 'arctan', zeta: 'ζ', heaviside: 'u', dirac: 'δ' };
/** True when the whole string is a single parenthesised group "( ... )". */
function isWrapped(s) {
  if (s[0] !== '(' || s[s.length - 1] !== ')') return false;
  let d = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') d++;
    else if (s[i] === ')' && --d === 0 && i < s.length - 1) return false;
  }
  return true;
}
function fmtS(e, ascii) {
  const U = !ascii;
  const supers = (s) => Array.from(s).map((c) => (c === '-' ? '⁻' : SUP_DIGITS[+c])).join('');
  const prec = (t) => (t.k === '+' ? 1 : t.k === '*' ? 2 : t.k === '^' ? 4 : t.k === 'n' && (t.q.sign() < 0 || !t.q.isInt()) ? 2 : 6);
  const wrap = (t, min) => (prec(t) < min ? '(' + go(t) + ')' : go(t));
  const joinMul = (parts) => {
    let out = '';
    for (const p of parts) {
      if (!out) out = p;
      else if (ascii) out += '*' + p;
      else if (/[0-9]$/.test(out) && /^[0-9]/.test(p)) out += '·' + p;
      else if ((/^[A-Za-z]{2,}/.test(p) || /^e(\^|$)/.test(p) || /^[uδ]\(/.test(p)) && /[A-Za-zπ)²³¹⁰-⁹⁻|]$/.test(out)) out += ' ' + p;
      else if (/[A-Za-z]\d+$/.test(out) && /^[A-Za-z(]/.test(p)) out += ' ' + p;
      else if (/^[A-Za-z]{2,}/.test(p) && /[0-9]$/.test(out)) out += ' ' + p;
      else out += (/[0-9A-Za-zπ)²³¹⁰-⁹⁻|]$/.test(out) && /^[A-Za-zπλθμσφωαβγδ√(|]/.test(p) ? '' : '·') + p;
    }
    return out;
  };
  function go(t) {
    switch (t.k) {
      case 'n': return t.q.toString();
      case 'v': return t.name;
      case 'c': return t.name === 'pi' ? (U ? 'π' : 'pi') : t.name;
      case '+': {
        let out = '';
        let terms = t.a;
        if (terms.length === 2 && splitCoef(terms[0])[1] && (terms[0].k === 'n' ? terms[0].q.sign() < 0 : splitCoef(terms[0])[0].sign() < 0) && !(terms[1].k === 'n' ? terms[1].q.sign() < 0 : splitCoef(terms[1])[0].sign() < 0)) terms = [terms[1], terms[0]];
        terms.forEach((term, i) => {
          const [coef, rest] = splitCoef(term);
          const neg = term.k === 'n' ? term.q.sign() < 0 : coef.sign() < 0;
          const mag = term.k === 'n' ? sN(term.q.abs()) : mulRaw(coef.abs(), rest);
          const s = mag.k === '+' ? '(' + go(mag) + ')' : go(mag);
          if (!i) out = (neg ? '-' : '') + s;
          else out += (neg ? ' - ' : ' + ') + s;
        });
        return out;
      }
      case '*': {
        let coef = Q1;
        const nums = [];
        const dens = [];
        for (const f of t.a) {
          if (f.k === 'n') {
            coef = coef.mul(f.q);
          } else if (f.k === '^' && f.e.k === 'n' && f.e.q.sign() < 0) {
            const pos = sPow(f.b, sN(f.e.q.neg()));
            dens.push(pos);
          } else nums.push(f);
        }
        const neg = coef.sign() < 0;
        const ca = coef.abs();
        const numParts = [];
        if (!(ca.n === 1n && nums.length)) numParts.push(ca.n.toString());
        nums.forEach((f) => numParts.push(wrap(f, 3)));
        const denParts = [];
        if (ca.d !== 1n) denParts.push(ca.d.toString());
        dens.forEach((f) => denParts.push(wrap(f, 3)));
        let s;
        const numS_ = numParts.length ? joinMul(numParts) : '1';
        if (!denParts.length) s = numS_;
        else {
          const d = joinMul(denParts);
          s = numS_ + '/' + (denParts.length === 1 ? d : '(' + d + ')');
        }
        return (neg ? '-' : '') + s;
      }
      case '^': {
        const { b, e: ex } = t;
        if (ex.k === 'n' && ex.q.eq(new Q(1n, 2n))) {
          const inner = go(b);
          return ascii ? 'sqrt(' + inner + ')' : '√' + (b.k === 'n' && b.q.isInt() && b.q.sign() >= 0 || b.k === 'v' || b.k === 'c' ? inner : '(' + inner + ')');
        }
        if (ex.k === 'n' && ex.q.sign() < 0) return '1/' + wrap(sPow(b, sN(ex.q.neg())), 3);
        let es;
        if (ex.k === 'n' && ex.q.isInt() && !ascii && ex.q.n >= 0n && ex.q.n <= 99n) es = supers(ex.q.n.toString());
        else {
          const raw = go(ex);
          es = '^' + (ex.k === 'v' || (ex.k === 'n' && ex.q.isInt() && ex.q.sign() >= 0) || ex.k === 'c' ? raw : '(' + raw + ')');
        }
        const bs = isConstE(b) ? 'e' : wrap(b, 5);
        return bs + es;
      }
      default: {
        if (t.fn === 'abs') return ascii ? 'abs(' + go(t.a[0]) + ')' : '|' + go(t.a[0]) + '|';
        if (t.fn === 'fact') return (t.a[0].k === 'v' || (t.a[0].k === 'n' && t.a[0].q.isInt() && t.a[0].q.sign() >= 0) ? go(t.a[0]) : '(' + go(t.a[0]) + ')') + '!';
        const name = ascii ? t.fn : FN_LABEL[t.fn] || (/^dirac\d+$/.test(t.fn) ? 'δ' + '′'.repeat(Number(t.fn.slice(5))) : t.fn);
        return name + '(' + t.a.map(go).join(', ') + ')';
      }
    }
  }
  return go(e);
}
