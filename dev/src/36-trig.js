// ======================================================================
// 36. Trigonometric simplification and expansion
//     Every rational function of sin and cos of one angle b lives in the field Q(g)[h]/(h^2 = 1 - g^2)
//     (g = cos b, h = sin b, or the other way round); an element is a pair of rational functions (A, B) meaning A + h B.
//     The pair is a canonical form, so equal functions give equal pairs; readable candidates are built from it and
//     the shortest one that is numerically the same function wins.
// ======================================================================
class TrigBail extends Error {}

const TR_FNS = new Set(['sin', 'cos', 'tan', 'cot', 'sec', 'csc']);
const TR_PH = '_g';
const trU = rf([Q1, Q0, qInt(-1)], [Q1]); // 1 - g^2
const rfIsZero = (r) => !r.n.length;
const teConst = (q) => ({ A: rfConst(q), B: rfConst(Q0) });
const teAdd = (x, y) => ({ A: rfAdd(x.A, y.A), B: rfAdd(x.B, y.B) });
const teNeg = (x) => ({ A: rfNeg(x.A), B: rfNeg(x.B) });
const teSize = (x) => Math.max(x.A.n.length, x.A.d.length, x.B.n.length, x.B.d.length);
function teMul(x, y) {
  const r = {
    A: rfAdd(rfMul(x.A, y.A), rfMul(trU, rfMul(x.B, y.B))),
    B: rfAdd(rfMul(x.A, y.B), rfMul(x.B, y.A)),
  };
  if (teSize(r) > 160) throw new TrigBail('too large');
  return r;
}
function teInv(x) {
  const delta = rfSub(rfMul(x.A, x.A), rfMul(trU, rfMul(x.B, x.B)));
  if (rfIsZero(delta)) throw new MathError('division by zero');
  const dom = [];
  return { A: rfDiv(x.A, delta, dom), B: rfNeg(rfDiv(x.B, delta, dom)) };
}
function tePow(x, n) {
  if (n < 0) return tePow(teInv(x), -n);
  let r = teConst(Q1);
  let b = x;
  while (n) {
    if (n & 1) r = teMul(r, b);
    n = Math.floor(n / 2);
    if (n) b = teMul(b, b);
  }
  return r;
}

/** The angle in a trig argument  p v + r pi  (p, r rational), or null. */
function trLinear(arg, v) {
  let p = Q0;
  let r = Q0;
  for (const t of termsOf(expandS(arg))) {
    if (t.k === 'v' && t.name === v) p = p.add(Q1);
    else if (t.k === 'c' && t.name === 'pi') r = r.add(Q1);
    else if (t.k === '*' && t.a.length === 2 && t.a[0].k === 'n' && t.a[1].k === 'v' && t.a[1].name === v) p = p.add(t.a[0].q);
    else if (t.k === '*' && t.a.length === 2 && t.a[0].k === 'n' && t.a[1].k === 'c' && t.a[1].name === 'pi') r = r.add(t.a[0].q);
    else if (t.k === 'n' && t.q.isZero()) continue;
    else return null;
  }
  return { p, r };
}
function trAtoms(S, out) {
  if (S.k === 'f' && TR_FNS.has(S.fn)) out.push(S);
  else if (S.k === 'f') throw new TrigBail('other function');
  if (S.k === '+' || S.k === '*' || S.k === 'f') S.a.forEach((x) => trAtoms(x, out));
  else if (S.k === '^') {
    trAtoms(S.b, out);
    trAtoms(S.e, out);
  } else if (S.k === 'c' && S.name !== 'pi') throw new TrigBail('constant');
}
/** Elements of sin(k b) and cos(k b) (b the base angle) in a view: 'c' has g = cos b, 's' has g = sin b. */
function trScFactory(view) {
  const X = rf([Q0, Q1], [Q1]);
  const zero = teConst(Q0);
  const one = teConst(Q1);
  const gEl = { A: X, B: rfConst(Q0) }; // the base variable g itself
  const hEl = { A: rfConst(Q0), B: rfConst(Q1) }; // the other one
  const sinB = view === 'c' ? hEl : gEl;
  const cosB = view === 'c' ? gEl : hEl;
  const cache = new Map([[0, [zero, one]]]);
  const sc = (k) => {
    if (k < 0) {
      const [s, c] = sc(-k);
      return [teNeg(s), c];
    }
    if (cache.has(k)) return cache.get(k);
    if (k > 60) throw new TrigBail('angle too large');
    const [s0, c0] = sc(k - 1);
    const r = [teAdd(teMul(s0, cosB), teMul(c0, sinB)), teAdd(teMul(c0, cosB), teNeg(teMul(s0, sinB)))];
    cache.set(k, r);
    return r;
  };
  return sc;
}
/** Context for one expression: the variable, the base angle b = v / n and the element of sin(k b), cos(k b) in a view. */
function trContext(S, view) {
  const vs = Array.from(varsOfS(S));
  if (vs.length !== 1) throw new TrigBail('one variable only');
  const v = vs[0];
  const atoms = [];
  trAtoms(S, atoms);
  if (!atoms.length) throw new TrigBail('no trig');
  let n = 1n;
  const lins = new Map();
  for (const a of atoms) {
    const L = trLinear(a.a[0], v);
    if (!L || !L.r.mul(qInt(2)).isInt()) throw new TrigBail('angle');
    lins.set(key(a.a[0]), L);
    n = (n * L.p.d) / bgcd(n, L.p.d);
  }
  if (n > 24n) throw new TrigBail('angle');
  const sc = trScFactory(view);
  return { v, n: Number(n), view, lins, sc };
}
function trToElem(S, ctx) {
  switch (S.k) {
    case 'n': return teConst(S.q);
    case '+': return S.a.map((t) => trToElem(t, ctx)).reduce(teAdd);
    case '*': return S.a.map((t) => trToElem(t, ctx)).reduce(teMul);
    case '^': {
      if (S.e.k !== 'n' || !S.e.q.isInt() || babs(S.e.q.n) > 40n) throw new TrigBail('exponent');
      return tePow(trToElem(S.b, ctx), Number(S.e.q.n));
    }
    case 'f': {
      const L = ctx.lins.get(key(S.a[0]));
      if (!L) throw new TrigBail('angle');
      const kq = L.p.mul(qInt(ctx.n));
      if (!kq.isInt()) throw new TrigBail('angle');
      let [s, c] = ctx.sc(Number(kq.n));
      const j = (((Number(L.r.mul(qInt(2)).n) % 4) + 4) % 4);
      for (let i = 0; i < j; i++) [s, c] = [c, teNeg(s)]; // add a quarter turn: sin -> cos, cos -> -sin
      switch (S.fn) {
        case 'sin': return s;
        case 'cos': return c;
        case 'tan': return teMul(s, teInv(c));
        case 'cot': return teMul(c, teInv(s));
        case 'sec': return teInv(c);
        default: return teInv(s);
      }
    }
    default: throw new TrigBail('unsupported');
  }
}

// ---- readable forms of an element ---------------------------------------------------------------------------
function trExpandedS(r) {
  return rfToS(r, TR_PH);
}
function trFactoredS(r) {
  if (rfIsZero(r)) return S0;
  const side = (fp) => sMul([sN(fp.content)].concat(fp.factors.map(({ ints, mult }) => sPow(polyToS(intsToPoly(ints), TR_PH), sI(mult)))));
  const fd = factorPolyQ(r.d);
  const num = side(factorPolyQ(r.n));
  return fd.factors.length ? sDiv(num, side(fd)) : num;
}
function trOrd(p, root) {
  let k = 0;
  let q = p;
  const lin = [root.neg(), Q1];
  while (q.length > 1 && k < 80) {
    const [qt, rem] = pdivmod(q, lin);
    if (rem.length) break;
    q = qt;
    k++;
  }
  return k;
}
/** r = (1 - g^2)^mu * r2 with mu as large (or as negative) as possible. */
function trExtractU(r) {
  if (rfIsZero(r)) return { mu: 0, r2: r };
  const m1 = trOrd(r.n, Q1) - trOrd(r.d, Q1);
  const m2 = trOrd(r.n, qInt(-1)) - trOrd(r.d, qInt(-1));
  const mu = m1 > 0 && m2 > 0 ? Math.min(m1, m2) : m1 < 0 && m2 < 0 ? Math.max(m1, m2) : 0;
  if (!mu) return { mu: 0, r2: r };
  const dom = [];
  const r2 = mu > 0 ? rfDiv(r, rfPow(trU, mu, dom), dom) : rfMul(r, rfPow(trU, -mu, dom));
  return { mu, r2 };
}
const trAtG = (S, gS) => subsS(S, TR_PH, gS);
/** Candidate expressions for the element, with g = gS and h = hS. */
function trCandidates(x, gS, hS, forms) {
  const out = [];
  forms = forms || [trExpandedS, trFactoredS];
  for (const form of forms) {
    const a = trAtG(form(x.A), gS);
    const b = trAtG(form(x.B), gS);
    out.push(sAdd([a, sMul([hS, b])]));
    // powers of h taken out of the factors (1 - g^2) = h^2
    const ea = trExtractU(x.A);
    const eb = trExtractU(x.B);
    const a2 = sMul([trAtG(form(ea.r2), gS), sPow(hS, sI(2 * ea.mu))]);
    const b2 = sMul([trAtG(form(eb.r2), gS), sPow(hS, sI(1 + 2 * eb.mu))]);
    out.push(sAdd([a2, b2]));
  }
  return out;
}
/** Chebyshev polynomials of the first (T) and second (U) kind. */
function trCheb(kind, k) {
  let p0 = [Q1];
  let p1 = kind === 'T' ? [Q0, Q1] : [Q0, qInt(2)];
  if (k === 0) return p0;
  for (let i = 1; i < k; i++) {
    const p2 = psub(pscale(pmul([Q0, Q1], p1), qInt(2)), p0);
    p0 = p1;
    p1 = p2;
  }
  return p1;
}
/** Fourier form  a0 + sum a_k cos(k b) + b_k sin(k b)  of an element with polynomial A and B (view c), or null. */
function trFourier(x, bOf) {
  if (x.A.d.length !== 1 || x.B.d.length !== 1) return null;
  const peel = (poly, kind, shift) => {
    const co = new Map();
    let r = poly.slice();
    while (r.length) {
      const deg = r.length - 1;
      const k = deg + shift;
      const T = trCheb(kind, deg);
      const c = r[deg].div(T[T.length - 1]);
      co.set(k, c);
      r = psub(r, pscale(T, c));
    }
    return co;
  };
  const ca = peel(x.A.n, 'T', 0);
  const cb = peel(x.B.n, 'U', 1);
  const terms = [];
  for (const [k, c] of ca) terms.push(k === 0 ? sN(c) : sMul([sN(c), sFn('cos', [bOf(k)])]));
  for (const [k, c] of cb) terms.push(sMul([sN(c), sFn('sin', [bOf(k)])]));
  return sAdd(terms);
}

/** Names of the functions that may appear in an answer: the ones in the question, plus sin and cos. */
function trAllowed(S) {
  const seen = new Set();
  const walk = (t) => {
    if (t.k === 'f') seen.add(t.fn);
    if (t.k === '+' || t.k === '*' || t.k === 'f') t.a.forEach(walk);
    else if (t.k === '^') {
      walk(t.b);
      walk(t.e);
    }
  };
  walk(S);
  const has = (...n) => n.some((x) => seen.has(x));
  return { tan: true, cot: true, sec: has('sec', 'tan'), csc: has('csc', 'cot') };
}
/** Rewrite sin^p cos^q (same angle) as tan, cot, sec, csc where the question already used such functions. */
function trNames(S, allow) {
  const exp = (t) => (t.k === '^' && t.e.k === 'n' && t.e.q.isInt() ? { b: t.b, e: Number(t.e.q.n) } : { b: t, e: 1 });
  const walk = (t) => {
    if (t.k === '+') return sAdd(t.a.map(walk));
    if (t.k !== '*' && t.k !== '^' && t.k !== 'f') return t;
    const factors = t.k === '*' ? t.a : [t];
    const byArg = new Map();
    const rest = [];
    for (const f of factors) {
      const { b, e } = exp(f);
      if (b.k === 'f' && (b.fn === 'sin' || b.fn === 'cos') && b.a.length === 1) {
        const k = key(b.a[0]);
        if (!byArg.has(k)) byArg.set(k, { arg: b.a[0], s: 0, c: 0 });
        byArg.get(k)[b.fn === 'sin' ? 's' : 'c'] += e;
      } else rest.push(f.k === 'f' || f.k === '^' || f.k === '*' ? mapS(f, walk) : f);
    }
    for (const { arg, s, c } of byArg.values()) {
      let ps = s;
      let pc = c;
      const out = [];
      if (allow.tan && ps > 0 && pc < 0) {
        const m = Math.min(ps, -pc);
        out.push(sPow(sFn('tan', [arg]), sI(m)));
        ps -= m;
        pc += m;
      } else if (allow.cot && ps < 0 && pc > 0) {
        const m = Math.min(-ps, pc);
        out.push(sPow(sFn('cot', [arg]), sI(m)));
        ps += m;
        pc -= m;
      }
      if (allow.sec && pc < 0) {
        out.push(sPow(sFn('sec', [arg]), sI(-pc)));
        pc = 0;
      }
      if (allow.csc && ps < 0) {
        out.push(sPow(sFn('csc', [arg]), sI(-ps)));
        ps = 0;
      }
      if (ps) out.push(sPow(sFn('sin', [arg]), sI(ps)));
      if (pc) out.push(sPow(sFn('cos', [arg]), sI(pc)));
      rest.push(...out);
    }
    return sMul(rest);
  };
  return walk(S);
}

/** The shortest equivalent form of an expression in sin / cos / tan ... of one variable, or null when the expression is not of that kind. */
function trigSimplifyS(S) {
  let ctxs;
  try {
    ctxs = ['c', 's'].map((view) => {
      const ctx = trContext(S, view);
      return { ctx, x: trToElem(S, ctx) };
    });
  } catch (e) {
    if (e instanceof TrigBail) return null;
    throw e;
  }
  const { v, n } = ctxs[0].ctx;
  const bS = n === 1 ? sV(v) : sMul([sN(new Q(1n, BigInt(n))), sV(v)]);
  const cands = [];
  const cS = sFn('cos', [bS]);
  const sS = sFn('sin', [bS]);
  cands.push(...trCandidates(ctxs[0].x, cS, sS));
  cands.push(...trCandidates(ctxs[1].x, sS, cS));
  const four = trFourier(ctxs[0].x, (k) => (n === 1 && k === 1 ? sV(v) : sMul([sN(new Q(BigInt(k), BigInt(n))), sV(v)])));
  if (four) cands.push(four);
  const allow = trAllowed(S);
  const all = [];
  for (const c of cands) {
    const base = simp(c);
    all.push(base);
    const named = simp(trNames(base, allow));
    if (key(named) !== key(base)) all.push(named);
  }
  return all;
}
function trigBest(S) {
  const all = trigSimplifyS(S);
  if (!all) return null;
  const len = (t) => fmtS(t, true).length;
  let best = S;
  for (const c of all) if (len(c) < len(best) && sameFunction(c, S)) best = c;
  return best;
}

// ---- expansion of sums and multiples of angles ---------------------------------------------------------------
/** sin(k a) and cos(k a) as polynomials in sin a and cos a (the shorter of the two ways to write them). */
function trMultiple(k, a) {
  const neg = k < 0;
  k = Math.abs(k);
  const sA = sFn('sin', [a]);
  const cA = sFn('cos', [a]);
  const pick = (idx) => {
    let best = null;
    for (const view of ['c', 's']) {
      const x = trScFactory(view)(k)[idx];
      const [gS, hS] = view === 'c' ? [cA, sA] : [sA, cA];
      const cand = expandS(trCandidates(x, gS, hS, [trExpandedS])[0]);
      if (!best || fmtS(cand, true).length < fmtS(best, true).length) best = cand;
    }
    return best;
  };
  const s = pick(0);
  return { s: neg ? sNeg(s) : s, c: pick(1) };
}
/** tan(k a) as numerator and denominator in tan a (integer coefficients, constant term of the denominator positive). */
function trTanMultiple(k, a) {
  const T = rf([Q0, Q1], [Q1]);
  const dom = [];
  let r = T;
  for (let i = 1; i < Math.abs(k); i++) r = rfDiv(rfAdd(r, T), rfSub(rfConst(Q1), rfMul(r, T)), dom);
  let L = 1n;
  for (const c of r.n.concat(r.d)) L = (L * c.d) / bgcd(L, c.d);
  let m = new Q(L);
  if (r.d[0].mul(m).sign() < 0) m = m.neg();
  const at = (P) => subsS(polyToS(P.map((c) => c.mul(m)), TR_PH), TR_PH, sFn('tan', [a]));
  const n = at(r.n);
  return { n: k < 0 ? sNeg(n) : n, d: at(r.d) };
}
function trSplit(arg) {
  const terms = termsOf(expandS(arg));
  if (terms.length > 1) return { parts: [terms[0], sAdd(terms.slice(1))] };
  const t = terms[0];
  if (t.k === '*' && t.a[0].k === 'n' && t.a[0].q.isInt() && babs(t.a[0].q.n) >= 2n && babs(t.a[0].q.n) <= 12n) {
    return { k: Number(t.a[0].q.n), atom: sMul(t.a.slice(1)) };
  }
  return { atom: t };
}
function trSinCos(arg) {
  const sp = trSplit(arg);
  if (sp.parts) {
    const A = trSinCos(sp.parts[0]);
    const B = trSinCos(sp.parts[1]);
    return { s: expandS(sAdd([sMul([A.s, B.c]), sMul([A.c, B.s])])), c: expandS(sSub(sMul([A.c, B.c]), sMul([A.s, B.s]))) };
  }
  if (sp.k) return trMultiple(sp.k, sp.atom);
  return { s: sFn('sin', [sp.atom]), c: sFn('cos', [sp.atom]) };
}
/** tan of the argument as { n, d } (numerator and denominator, both polynomials in the tangents of the single terms). */
function trTanRatio(arg) {
  const sp = trSplit(arg);
  if (sp.parts) {
    const A = trTanRatio(sp.parts[0]);
    const B = trTanRatio(sp.parts[1]);
    return { n: expandS(sAdd([sMul([A.n, B.d]), sMul([B.n, A.d])])), d: expandS(sSub(sMul([A.d, B.d]), sMul([A.n, B.n]))) };
  }
  if (sp.k) return trTanMultiple(sp.k, sp.atom);
  return { n: sFn('tan', [sp.atom]), d: S1 };
}
const trTan = (arg) => {
  const { n, d } = trTanRatio(arg);
  return sDiv(n, d);
};
/** "(top)/(bottom)" for a tangent expansion at the top of an expression, else null. */
function trTanText(S) {
  if (S.k !== 'f' || (S.fn !== 'tan' && S.fn !== 'cot') || S.a.length !== 1) return null;
  let { n, d } = trTanRatio(S.a[0]);
  if (S.fn === 'cot') [n, d] = [d, n];
  const wrap = (t) => (t.k === 'n' || t.k === 'v' || t.k === 'f' ? fmtS(t) : '(' + fmtS(t) + ')');
  if (d.k === 'n' && d.q.eq(Q1)) return fmtS(n);
  return (n.k === '+' ? '(' + fmtS(n) + ')' : fmtS(n)) + '/' + wrap(d);
}
/** Expand sin, cos, tan, cot, sec, csc of sums and of integer multiples into functions of the single terms. */
function trExpandS(S) {
  const go = (t) => {
    if (t.k === 'f' && TR_FNS.has(t.fn) && t.a.length === 1) {
      const arg = t.a[0];
      switch (t.fn) {
        case 'sin': return trSinCos(arg).s;
        case 'cos': return trSinCos(arg).c;
        case 'tan': return trTan(arg);
        case 'cot': return sDiv(S1, trTan(arg));
        case 'sec': return sDiv(S1, trSinCos(arg).c);
        default: return sDiv(S1, trSinCos(arg).s);
      }
    }
    return mapS(t, go);
  };
  return go(S);
}
