
// ======================================================================
// 3. Evaluators (exact + floating point) and number presentation
// ======================================================================

/** Exact evaluation into a rational function of the variables bound in env (Map name -> rf). */
function evalRF(n, env, dom) {
  switch (n.t) {
    case 'num': return rfConst(n.q);
    case 'var': {
      const v = env.get(n.name);
      if (!v) throw new NotAlgebraic('variable ' + n.name);
      return v;
    }
    case 'const': throw new NotAlgebraic('constant');
    case 'neg': return rfNeg(evalRF(n.a, env, dom));
    case 'pct': return rfDiv(evalRF(n.a, env, dom), rfConst(qInt(100)), dom);
    case 'fact': {
      const a = evalRF(n.a, env, dom);
      if (!rfIsConst(a)) throw new NotAlgebraic('factorial of a variable');
      const q = rfConstQ(a);
      if (!q.isInt() || q.sign() < 0 || q.n > 400n) throw new NotAlgebraic('factorial');
      let r = 1n;
      for (let k = 2n; k <= q.n; k++) r *= k;
      return rfConst(new Q(r));
    }
    case 'bin': {
      const a = evalRF(n.a, env, dom);
      const b = evalRF(n.b, env, dom);
      switch (n.op) {
        case '+': return rfAdd(a, b);
        case '-': return rfSub(a, b);
        case '*': return rfMul(a, b);
        case '/': return rfDiv(a, b, dom);
        default: return rfPowNode(a, b, dom);
      }
    }
    case 'call': return rfCall(n, env, dom);
    default: throw new NotAlgebraic('node');
  }
}

function rfPowNode(a, b, dom) {
  if (!rfIsConst(b)) throw new NotAlgebraic('variable exponent');
  const e = rfConstQ(b);
  if (e.isInt()) {
    if (babs(e.n) > 10000n) throw new MathError('exponent too large');
    const k = Number(e.n);
    if (rfIsConst(a)) {
      const aq = rfConstQ(a);
      if (aq.isZero() && k <= 0) throw new MathError(k === 0 ? '0^0 is undefined' : 'division by zero');
      return rfConst(aq.pow(k));
    }
    return rfPow(a, k, dom);
  }
  if (!rfIsConst(a) || e.d > 12n) throw new NotAlgebraic('fractional power');
  const root = qRoot(rfConstQ(a), Number(e.d));
  if (!root) throw new NotAlgebraic('irrational power');
  if (root.isZero() && e.sign() < 0) throw new MathError('division by zero');
  return rfConst(root.pow(Number(e.n)));
}

function rfCall(n, env, dom) {
  const args = n.args.map((x) => evalRF(x, env, dom));
  if (!args.every(rfIsConst)) throw new NotAlgebraic('function of a variable');
  const q = rfConstQ(args[args.length - 1]);
  let k;
  if (n.fn === 'sqrt') k = 2;
  else if (n.fn === 'cbrt') k = 3;
  else if (n.fn === 'root' && args.length === 2) {
    const kq = rfConstQ(args[0]);
    if (!kq.isInt() || kq.sign() <= 0 || kq.n > 12n) throw new NotAlgebraic('root index');
    k = Number(kq.n);
  } else if (n.fn === 'abs') return rfConst(q.abs());
  else throw new NotAlgebraic('function ' + n.fn);
  const r = qRoot(q, k);
  if (!r) throw new NotAlgebraic('irrational root');
  return rfConst(r);
}

// ---- floating point ----------------------------------------------------------
function toFraction(x, maxDen) {
  if (!isFinite(x)) return null;
  const sgn = x < 0 ? -1 : 1;
  const v = Math.abs(x);
  let h1 = 1;
  let h0 = 0;
  let k1 = 0;
  let k0 = 1;
  let b = v;
  for (let it = 0; it < 40; it++) {
    const a = Math.floor(b);
    const h2 = a * h1 + h0;
    const k2 = a * k1 + k0;
    if (k2 > maxDen || !isFinite(h2)) break;
    h0 = h1; h1 = h2; k0 = k1; k1 = k2;
    if (Math.abs(v - h1 / k1) < 1e-12 * Math.max(1, v)) return { p: sgn * h1, q: k1 };
    const f = b - a;
    if (f < 1e-14) break;
    b = 1 / f;
  }
  return null;
}

function powNum(a, b) {
  if (a < 0 && !Number.isInteger(b)) {
    const fr = toFraction(b, 99);
    if (fr && fr.q % 2 === 1) {
      const r = Math.pow(-a, b);
      return fr.p % 2 === 0 ? r : -r;
    }
    return NaN;
  }
  return Math.pow(a, b);
}
function factorial(x) {
  if (!Number.isInteger(x) || x < 0 || x > 170) return NaN;
  let r = 1;
  for (let k = 2; k <= x; k++) r *= k;
  return r;
}
function callNum(fn, a) {
  const x = a[0];
  switch (fn) {
    case 'sin': return Math.sin(x);
    case 'cos': return Math.cos(x);
    case 'tan': return Math.tan(x);
    case 'cot': return 1 / Math.tan(x);
    case 'sec': return 1 / Math.cos(x);
    case 'csc': return 1 / Math.sin(x);
    case 'asin': return Math.asin(x);
    case 'acos': return Math.acos(x);
    case 'atan': return Math.atan(x);
    case 'sinh': return Math.sinh(x);
    case 'cosh': return Math.cosh(x);
    case 'tanh': return Math.tanh(x);
    case 'exp': return Math.exp(x);
    case 'ln': return Math.log(x);
    case 'log10': return Math.log10(x);
    case 'log2': return Math.log2(x);
    case 'log': return a.length > 1 ? Math.log(x) / Math.log(a[1]) : Math.log10(x);
    case 'sqrt': return Math.sqrt(x);
    case 'cbrt': return Math.cbrt(x);
    case 'root': return a.length > 1 ? powNum(a[1], 1 / x) : NaN;
    case 'zeta': {
      if (!(x > 1)) return NaN;
      const N = 24;
      let s = 0;
      for (let k = 1; k < N; k++) s += Math.pow(k, -x);
      return s + Math.pow(N, 1 - x) / (x - 1) + 0.5 * Math.pow(N, -x) + (x * Math.pow(N, -x - 1)) / 12 - (x * (x + 1) * (x + 2) * Math.pow(N, -x - 3)) / 720;
    }
    case 'fact': return factorial(x);
    case 'abs': return Math.abs(x);
    case 'floor': return Math.floor(x);
    case 'ceil': return Math.ceil(x);
    case 'heaviside': return x > 0 ? 1 : x < 0 ? 0 : 0.5;
    case 'dirac': return x === 0 ? Infinity : 0;
    case 'dirac1': case 'dirac2': case 'dirac3': return x === 0 ? Infinity : 0;
    default: throw new MathError('unknown function ' + fn);
  }
}
function evalNum(n, env) {
  switch (n.t) {
    case 'num': return n.f;
    case 'var': {
      const v = env[n.name];
      if (v === undefined) throw new MathError('unknown variable ' + n.name);
      return v;
    }
    case 'const': return n.name === 'pi' ? Math.PI : n.name === 'oo' ? Infinity : Math.E;
    case 'neg': return -evalNum(n.a, env);
    case 'list': case 'named': case 'dvar': throw new MathError('this cannot be used as a number here');
    case 'pct': return evalNum(n.a, env) / 100;
    case 'fact': return factorial(evalNum(n.a, env));
    case 'call': return n.cmd ? commandNumber(n, env) : callNum(n.fn, n.args.map((x) => evalNum(x, env)));
    default: {
      const a = evalNum(n.a, env);
      const b = evalNum(n.b, env);
      switch (n.op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return a / b;
        default: return powNum(a, b);
      }
    }
  }
}

// ---- presentation of numbers ----------------------------------------------------
/** ~8 significant digits, no trailing zeros. */
function fmtNum(x) {
  if (x === 0 || Object.is(x, -0)) return '0';
  if (!isFinite(x)) return String(x);
  return String(Number(x.toPrecision(8)));
}

/** Square-free decomposition D = s^2 * r (for moderately sized D). */
function simplifySqrt(D) {
  let s = 1n;
  let r = D;
  if (bitLen(D) > 56) return { s, r };
  for (let p = 2n; p * p * p <= r; p += p === 2n ? 1n : 2n) {
    const pp = p * p;
    while (r % pp === 0n) {
      r /= pp;
      s *= p;
    }
  }
  const t = isqrt(r);
  if (t * t === r) {
    s *= t;
    r = 1n;
  }
  return { s, r };
}

/** s*sqrt(r)/q text with reduction, sign handled by caller. */
function radicalText(s, r, q) {
  const g = bgcd(s, q);
  s /= g;
  q /= g;
  return (s === 1n ? '' : String(s)) + '√' + r + (q === 1n ? '' : '/' + q);
}

/** Try to give a floating value a short exact name (fraction, multiple of pi, root, ln). */
function recognize(x) {
  if (!isFinite(x)) return null;
  if (Math.abs(x) < 1e-12) return { text: '0', rational: true, val: 0 };
  const fr = toFraction(x, 1000);
  if (fr) return { text: fr.q === 1 ? String(fr.p) : fr.p + '/' + fr.q, rational: true, val: fr.p / fr.q };
  const pf = toFraction(x / Math.PI, 24);
  if (pf) {
    const a = Math.abs(pf.p);
    const body = (a === 1 ? '' : String(a)) + 'π' + (pf.q === 1 ? '' : '/' + pf.q);
    return { text: (pf.p < 0 ? '-' : '') + body, val: (pf.p * Math.PI) / pf.q };
  }
  const f2 = Math.abs(x) < 1000 ? toFraction(x * x, 200) : null;
  if (f2 && f2.p > 0 && f2.p * f2.q <= 100000) {
    const m = BigInt(f2.p) * BigInt(f2.q);
    const { s, r } = simplifySqrt(m);
    if (r > 1n) return { text: (x < 0 ? '-' : '') + radicalText(s, r, BigInt(f2.q)), val: (x < 0 ? -1 : 1) * Math.sqrt(f2.p / f2.q) };
  }
  if (x > 0 && x < 7) {
    const ex = Math.exp(x);
    const ri = Math.round(ex);
    if (ri >= 2 && ri <= 1000 && Math.abs(ex - ri) < 1e-9 * ex) return { text: 'ln(' + ri + ')', val: Math.log(ri) };
  }
  return null;
}

/** "=" when the printed decimal is exact, "≈" otherwise. */
function approxSym(x) {
  const d = fmtNum(x);
  return Math.abs(Number(d) - x) <= 1e-15 * Math.abs(x) ? '=' : '≈';
}

/** "exact (≈ decimal)" style text for a real number. */
function describeNumber(x) {
  const rec = recognize(x);
  if (rec && rec.rational && !rec.text.includes('/')) return rec.text;
  if (rec) return rec.text + ' (' + approxSym(x) + ' ' + fmtNum(x) + ')';
  return '≈ ' + fmtNum(x);
}

// ---- polynomial printing -------------------------------------------------------
function polyText(P, v) {
  if (!P.length) return '0';
  let out = '';
  for (let k = P.length - 1; k >= 0; k--) {
    const c = P[k];
    if (c.isZero()) continue;
    const neg = c.sign() < 0;
    const a = c.abs();
    let mag;
    const varPart = k === 0 ? '' : k === 1 ? v : v + (k <= 9 ? toSup(String(k)) : '^' + k);
    if (k === 0) mag = a.toString();
    else if (a.eq(Q1)) mag = varPart;
    else if (a.isInt()) mag = a.toString() + varPart;
    else mag = '(' + a.toString() + ')' + varPart;
    if (!out) out = (neg ? '-' : '') + mag;
    else out += (neg ? ' - ' : ' + ') + mag;
  }
  return out;
}
