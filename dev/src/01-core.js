// ======================================================================
// 1. Errors and exact arithmetic (BigInt rationals, rational polynomials)
// ======================================================================

/** A problem the user can act on (bad input, undefined result, ...). */
class MathError extends Error {}
/** Internal signal: the expression cannot be handled in exact rational arithmetic. */
class NotAlgebraic extends Error {}

const babs = (a) => (a < 0n ? -a : a);
function bgcd(a, b) {
  a = babs(a);
  b = babs(b);
  while (b) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}
const bitLen = (n) => (n === 0n ? 0 : babs(n).toString(16).length * 4);
const MAX_BITS = 40000;

function isqrt(n) {
  if (n < 2n) return n;
  let x = 1n << BigInt((n.toString(2).length >> 1) + 1);
  for (;;) {
    const y = (x + n / x) >> 1n;
    if (y >= x) return x;
    x = y;
  }
}

/** floor(n^(1/k)) for n >= 0, k >= 1. */
function iroot(n, k) {
  if (k === 1) return n;
  if (n < 2n) return n;
  const K = BigInt(k);
  let x = 1n << BigInt(Math.ceil(n.toString(2).length / k) + 1);
  for (;;) {
    const y = ((K - 1n) * x + n / x ** (K - 1n)) / K;
    if (y >= x) return x;
    x = y;
  }
}

class Q {
  constructor(n, d) {
    if (d === undefined) d = 1n;
    if (d === 0n) throw new MathError('division by zero');
    if (d < 0n) {
      n = -n;
      d = -d;
    }
    const g = bgcd(n, d);
    if (g > 1n) {
      n /= g;
      d /= g;
    }
    if (bitLen(n) > MAX_BITS || bitLen(d) > MAX_BITS) throw new MathError('number too large');
    this.n = n;
    this.d = d;
  }
  add(o) { return new Q(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { return new Q(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { return new Q(this.n * o.n, this.d * o.d); }
  div(o) { return new Q(this.n * o.d, this.d * o.n); }
  neg() { return new Q(-this.n, this.d); }
  inv() { return new Q(this.d, this.n); }
  abs() { return new Q(babs(this.n), this.d); }
  isZero() { return this.n === 0n; }
  isInt() { return this.d === 1n; }
  sign() { return this.n > 0n ? 1 : this.n < 0n ? -1 : 0; }
  cmp(o) {
    const l = this.n * o.d;
    const r = o.n * this.d;
    return l < r ? -1 : l > r ? 1 : 0;
  }
  eq(o) { return this.n === o.n && this.d === o.d; }
  /** Integer power (k is a JS integer, may be negative). */
  pow(k) {
    if (k === 0) return Q1;
    const big = Math.max(bitLen(this.n), bitLen(this.d));
    if (big > 4 && big * Math.abs(k) > MAX_BITS) throw new MathError('number too large');
    const e = BigInt(Math.abs(k));
    const r = new Q(this.n ** e, this.d ** e);
    return k < 0 ? r.inv() : r;
  }
  toNumber() {
    const a = Number(this.n);
    const b = Number(this.d);
    if (isFinite(a) && isFinite(b)) return a / b;
    const s = BigInt(Math.max(bitLen(this.n), bitLen(this.d)) - 900);
    return Number(this.n >> s) / Number(this.d >> s);
  }
  toString() { return this.d === 1n ? this.n.toString() : this.n + '/' + this.d; }
}
const Q0 = new Q(0n);
const Q1 = new Q(1n);
const qInt = (n) => new Q(BigInt(n));

/** Exact value of a decimal literal such as "12", "0.25", ".5", "1.5e-3". */
function qFromLiteral(s) {
  const m = /^(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(s);
  if (!m || (!m[1] && !m[2])) throw new MathError('bad number "' + s + '"');
  const frac = m[2] || '';
  const n = BigInt((m[1] || '') + frac || '0');
  const ex = (m[3] ? parseInt(m[3], 10) : 0) - frac.length;
  if (Math.abs(ex) > 300) throw new MathError('exponent too large in "' + s + '"');
  return ex >= 0 ? new Q(n * 10n ** BigInt(ex)) : new Q(n, 10n ** BigInt(-ex));
}

/** Exact k-th root of a rational, or null when it is not a perfect power. */
function qRoot(q, k) {
  const neg = q.sign() < 0;
  if (neg && k % 2 === 0) return null;
  const n = babs(q.n);
  const rn = iroot(n, k);
  const rd = iroot(q.d, k);
  const K = BigInt(k);
  if (rn ** K !== n || rd ** K !== q.d) return null;
  return new Q(neg ? -rn : rn, rd);
}

// ---- polynomials with rational coefficients, index = power ----------------
const ptrim = (p) => {
  while (p.length && p[p.length - 1].isZero()) p.pop();
  return p;
};
function padd(a, b) {
  const r = [];
  for (let i = 0, n = Math.max(a.length, b.length); i < n; i++) r.push((a[i] || Q0).add(b[i] || Q0));
  return ptrim(r);
}
function psub(a, b) {
  const r = [];
  for (let i = 0, n = Math.max(a.length, b.length); i < n; i++) r.push((a[i] || Q0).sub(b[i] || Q0));
  return ptrim(r);
}
function pmul(a, b) {
  if (!a.length || !b.length) return [];
  const r = new Array(a.length + b.length - 1).fill(Q0);
  for (let i = 0; i < a.length; i++) {
    if (a[i].isZero()) continue;
    for (let j = 0; j < b.length; j++) r[i + j] = r[i + j].add(a[i].mul(b[j]));
  }
  return ptrim(r);
}
const pscale = (a, q) => ptrim(a.map((c) => c.mul(q)));
/** Polynomial long division; returns [quotient, remainder]. b must be non-zero. */
function pdivmod(a, b) {
  const r = a.slice();
  const qt = new Array(Math.max(a.length - b.length + 1, 0)).fill(Q0);
  const lb = b[b.length - 1];
  while (r.length >= b.length) {
    const k = r.length - b.length;
    const c = r[r.length - 1].div(lb);
    qt[k] = c;
    for (let i = 0; i < b.length; i++) r[i + k] = r[i + k].sub(c.mul(b[i]));
    ptrim(r);
  }
  return [ptrim(qt), r];
}
const pmonic = (p) => (p.length ? pscale(p, p[p.length - 1].inv()) : p);
function pgcd(a, b) {
  while (b.length) {
    const r = pdivmod(a, b)[1];
    a = b;
    b = r;
  }
  return pmonic(a);
}
function peval(p, x) {
  let r = Q0;
  for (let i = p.length - 1; i >= 0; i--) r = r.mul(x).add(p[i]);
  return r;
}
function pevalNum(p, x) {
  let r = 0;
  for (let i = p.length - 1; i >= 0; i--) r = r * x + p[i].toNumber();
  return r;
}

// ---- rational functions n/d (d monic, gcd removed) --------------------------
function rf(n, d) {
  if (!d.length) throw new MathError('division by zero');
  if (!n.length) return { n: [], d: [Q1] };
  const g = pgcd(n, d);
  if (g.length > 1) {
    n = pdivmod(n, g)[0];
    d = pdivmod(d, g)[0];
  }
  const lc = d[d.length - 1];
  if (!lc.eq(Q1)) {
    const inv = lc.inv();
    n = pscale(n, inv);
    d = pscale(d, inv);
  }
  return { n, d };
}
const rfConst = (q) => ({ n: q.isZero() ? [] : [q], d: [Q1] });
const rfIsConst = (a) => a.n.length <= 1 && a.d.length === 1;
const rfConstQ = (a) => (a.n.length ? a.n[0] : Q0);
const rfAdd = (a, b) => rf(padd(pmul(a.n, b.d), pmul(b.n, a.d)), pmul(a.d, b.d));
const rfSub = (a, b) => rf(psub(pmul(a.n, b.d), pmul(b.n, a.d)), pmul(a.d, b.d));
const rfMul = (a, b) => rf(pmul(a.n, b.n), pmul(a.d, b.d));
const rfNeg = (a) => ({ n: pscale(a.n, qInt(-1)), d: a.d });
/** Division; polynomials we divided by are recorded in dom (their roots are excluded values). */
function rfDiv(a, b, dom) {
  if (!b.n.length) throw new MathError('division by zero');
  if (b.n.length > 1) dom.push(b.n);
  return rf(pmul(a.n, b.d), pmul(a.d, b.n));
}
function rfPow(a, k, dom) {
  if (rfIsConst(a)) return rfConst(rfConstQ(a).pow(k));
  const m = Math.abs(k);
  if (m > 64) throw new MathError('exponent too large');
  let r = rfConst(Q1);
  for (let i = 0; i < m; i++) r = rfMul(r, a);
  return k < 0 ? rfDiv(rfConst(Q1), r, dom) : r;
}
