
// ======================================================================
// 8. Algebra: big-integer number theory, polynomial factoring over Q,
//    partial fractions, and the commands built on them
// ======================================================================

// ---- helpers shared by all command modules -------------------------------------------------
function needArgs(n, lo, hi, usage) {
  if (n.args.length < lo || n.args.length > hi) throw new MathError(n.fn + '(...) needs ' + usage);
}
function varOfArg(node) {
  if (node.t === 'var') return node.name;
  throw new MathError('a variable name such as x is needed here');
}
function constQ(node) {
  try {
    return rfConstQ(evalRF(node, new Map(), []));
  } catch (e) {
    if (e instanceof NotAlgebraic) throw new MathError('a plain number is needed here');
    throw e;
  }
}
function intArg(node) {
  const q = constQ(node);
  if (!q.isInt()) throw new MathError('a whole number is needed here');
  return q.n;
}
const sAst = (S) => parseExpression(fmtS(S, true));
function singleVarOf(S, hint) {
  const vs = Array.from(varsOfS(S));
  if (hint && vs.includes(hint)) return hint;
  if (vs.length === 1) return vs[0];
  if (!vs.length) return hint || 'x';
  throw new MathError('this has several variables (' + vs.sort().join(', ') + '); say which one to use');
}

// ---- BigInt number theory -------------------------------------------------------------------
function modPow(b, e, m) {
  let r = 1n;
  b %= m;
  if (b < 0n) b += m;
  while (e > 0n) {
    if (e & 1n) r = (r * b) % m;
    e >>= 1n;
    b = (b * b) % m;
  }
  return r;
}
function egcd(a, b) {
  let [or, r] = [a, b];
  let [os, s] = [1n, 0n];
  let [ot, t] = [0n, 1n];
  while (r !== 0n) {
    const q = or / r;
    [or, r] = [r, or - q * r];
    [os, s] = [s, os - q * s];
    [ot, t] = [t, ot - q * t];
  }
  return [or, os, ot];
}
function modInv(a, m) {
  const [g, x] = egcd(((a % m) + m) % m, m);
  return g !== 1n ? null : ((x % m) + m) % m;
}
const SMALL_PRIMES = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n, 41n];
function isProbablePrime(n) {
  if (n < 2n) return false;
  for (const p of SMALL_PRIMES) {
    if (n === p) return true;
    if (n % p === 0n) return false;
  }
  let d = n - 1n;
  let r = 0;
  while ((d & 1n) === 0n) {
    d >>= 1n;
    r++;
  }
  for (const a of SMALL_PRIMES) {
    let x = modPow(a, d, n);
    if (x === 1n || x === n - 1n) continue;
    let composite = true;
    for (let i = 1; i < r; i++) {
      x = (x * x) % n;
      if (x === n - 1n) {
        composite = false;
        break;
      }
    }
    if (composite) return false;
  }
  return true;
}
function pollardRho(n) {
  if (n % 2n === 0n) return 2n;
  for (let c = 1n; c < 40n; c++) {
    let x = 2n;
    let y = 2n;
    let d = 1n;
    let iter = 0;
    while (d === 1n && iter < 300000) {
      x = (x * x + c) % n;
      y = (y * y + c) % n;
      y = (y * y + c) % n;
      d = bgcd(x > y ? x - y : y - x, n);
      iter++;
    }
    if (d !== 1n && d !== n) return d;
  }
  return null;
}
/** Prime factorisation of n >= 2 as Map(prime -> exponent), or null when it takes too long. */
function factorBig(n) {
  const f = new Map();
  const add = (p) => f.set(p, (f.get(p) || 0) + 1);
  let m = n;
  for (let p = 2n; p < 20000n && p * p <= m; p += p === 2n ? 1n : 2n) {
    while (m % p === 0n) {
      add(p);
      m /= p;
    }
  }
  const stack = [m];
  while (stack.length) {
    const v = stack.pop();
    if (v === 1n) continue;
    if (isProbablePrime(v)) {
      add(v);
      continue;
    }
    const d = pollardRho(v);
    if (!d) return null;
    stack.push(d, v / d);
  }
  return new Map([...f.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)));
}
function factorizationText(f) {
  return [...f.entries()].map(([p, e]) => p + (e === 1 ? '' : e <= 99 ? toSup(String(e)) : '^' + e)).join('·');
}

// ---- polynomial factoring over Q ---------------------------------------------------------------
const pderiv = (P) => ptrim(P.slice(1).map((c, i) => c.mul(qInt(i + 1))));

/** Yun's algorithm: P = prod p_i^i with each p_i squarefree. Returns [{p (monic), mult}]. */
function squarefreeDecomp(P) {
  const dP = pderiv(P);
  if (!dP.length) return [{ p: pmonic(P), mult: 1 }];
  const a0 = pgcd(P, dP);
  let b = pdivmod(P, a0)[0];
  let c = pdivmod(dP, a0)[0];
  let d = psub(c, pderiv(b));
  const out = [];
  for (let i = 1; b.length > 1 && i < 200; i++) {
    const g = pgcd(b, d);
    if (g.length > 1) out.push({ p: g, mult: i });
    b = pdivmod(b, g)[0];
    c = pdivmod(d, g)[0];
    d = psub(c, pderiv(b));
  }
  return out;
}

function combinations(n, k, fn) {
  const idx = [];
  const rec = (start) => {
    if (idx.length === k) return fn(idx.slice());
    for (let i = start; i < n; i++) {
      idx.push(i);
      if (rec(i + 1)) return true;
      idx.pop();
    }
    return false;
  };
  rec(0);
}

/** Split a squarefree integer polynomial without rational roots into irreducible factors (subset search on the roots). */
function splitBySubsets(ints) {
  const n = ints.length - 1;
  if (n < 4 || n > 12) return [ints];
  let zs;
  try {
    zs = numericPolyRoots(ints);
  } catch (e) {
    return [ints];
  }
  const partner = zs.map((z) => {
    let best = -1;
    let bd = Infinity;
    zs.forEach((w, j) => {
      const d = Math.hypot(z[0] - w[0], z[1] + w[1]);
      if (d < bd) {
        bd = d;
        best = j;
      }
    });
    return best;
  });
  const lead = babs(ints[n]);
  const leadDivs = divisorsOf(lead) || [1];
  for (let k = 2; k <= Math.floor(n / 2); k++) {
    let found = null;
    combinations(n, k, (idx) => {
      const set = new Set(idx);
      if (!idx.every((i) => set.has(partner[i]))) return false;
      // coefficients of prod (x - z_i)
      let co = [[1, 0]];
      for (const i of idx) {
        const z = zs[i];
        const next = new Array(co.length + 1).fill(0).map(() => [0, 0]);
        co.forEach((c, j) => {
          next[j + 1] = cadd(next[j + 1], c);
          next[j] = csub(next[j], cmul(c, z));
        });
        co = next;
      }
      if (co.some((c) => Math.abs(c[1]) > 1e-6 * (1 + Math.abs(c[0])))) return false;
      for (const cd of leadDivs) {
        const cand = co.map((c) => c[0] * cd);
        if (cand.every((v) => Math.abs(v) < 1e12 && Math.abs(v - Math.round(v)) < 1e-6 * Math.max(1, Math.abs(v)))) {
          const G = toIntPoly(cand.map((v) => qInt(Math.round(v))));
          const [quo, rem] = pdivmod(intsToPoly(ints), intsToPoly(G));
          if (!rem.length) {
            found = { G, rest: toIntPoly(quo) };
            return true;
          }
        }
      }
      return false;
    });
    if (found) return [found.G].concat(splitBySubsets(found.rest));
  }
  return [ints];
}

/** Irreducible factors (integer polynomials, positive lead) of a squarefree primitive integer polynomial. */
function irreducibleFactors(ints) {
  const res = [];
  let cur = ints;
  while (cur.length > 1 && cur[0] === 0n) {
    res.push([0n, 1n]);
    cur = cur.slice(1);
  }
  while (cur.length - 1 >= 1) {
    const r = cur.length - 1 === 1 ? new Q(-cur[0], cur[1]) : findRationalRoot(cur);
    if (!r) break;
    res.push([-r.n, r.d]);
    cur = cur.length - 1 === 1 ? [1n] : toIntPoly(pdivmod(intsToPoly(cur), [new Q(-r.n), new Q(r.d)])[0]);
  }
  if (cur.length - 1 >= 1) splitBySubsets(cur).forEach((f) => res.push(f));
  return res;
}

/** P = content * prod factor_i^mult_i ;  factors are primitive integer polynomials (low -> high). */
function factorPolyQ(P) {
  if (P.length <= 1) return { content: P[0] || Q0, factors: [] };
  const ints0 = toIntPoly(P);
  const content = P[P.length - 1].div(new Q(ints0[ints0.length - 1]));
  const acc = new Map();
  for (const { p, mult } of squarefreeDecomp(intsToPoly(ints0))) {
    for (const f of irreducibleFactors(toIntPoly(p))) {
      const k = f.join(',');
      const ex = acc.get(k);
      if (ex) ex.mult += mult;
      else acc.set(k, { ints: f, mult });
    }
  }
  const factors = [...acc.values()].sort((a, b) => a.ints.length - b.ints.length || (a.ints.join(',') < b.ints.join(',') ? -1 : 1));
  return { content, factors };
}

function factorPolyText(fp, v) {
  const parts = fp.factors.map(({ ints, mult }) => {
    const t = polyText(intsToPoly(ints), v);
    const single = ints.length === 2 && ints[0] === 0n && ints[1] === 1n;
    const base = single ? t : '(' + t + ')';
    return base + (mult === 1 ? '' : mult <= 99 ? toSup(String(mult)) : '^' + mult);
  });
  let c = '';
  if (fp.content.eq(qInt(-1))) c = '-';
  else if (!fp.content.eq(Q1)) c = fp.content.isInt() ? fp.content.toString() : '(' + fp.content.toString() + ')';
  if (!parts.length) return fp.content.toString();
  return c + parts.join('');
}

// ---- partial fractions -----------------------------------------------------------------------------
/** r = n/d (reduced, d monic). Returns { poly, terms:[{num (Q[]), fac (Q[]), power}] } */
function apartRF(r) {
  const [qpart, rem] = pdivmod(r.n, r.d);
  const fp = factorPolyQ(r.d);
  const facs = fp.factors.map((f) => ({ poly: intsToPoly(f.ints), mult: f.mult }));
  const basis = [];
  for (const f of facs) {
    for (let j = 1; j <= f.mult; j++) {
      let cof = [Q1];
      for (const g of facs) {
        const m = g === f ? f.mult - j : g.mult;
        for (let t = 0; t < m; t++) cof = pmul(cof, g.poly);
      }
      for (let k = 0; k < f.poly.length - 1; k++) {
        basis.push({ f, j, k, col: pmul(new Array(k).fill(Q0).concat([Q1]), cof) });
      }
    }
  }
  const degD = r.d.length - 1;
  if (basis.length !== degD) throw new MathError('partial fractions: unexpected denominator');
  const rows = [];
  for (let i = 0; i < degD; i++) rows.push(basis.map((b) => b.col[i] || Q0).concat([rem[i] || Q0]));
  const { M, pivots, inconsistent } = rrefQ(rows, basis.length);
  if (inconsistent || pivots.length !== basis.length) throw new MathError('partial fractions failed');
  const coefs = new Array(basis.length).fill(Q0);
  pivots.forEach((c, i) => { coefs[c] = M[i][basis.length]; });
  const terms = [];
  for (const f of facs) {
    for (let j = 1; j <= f.mult; j++) {
      const num = new Array(f.poly.length - 1).fill(Q0);
      basis.forEach((b, idx) => {
        if (b.f === f && b.j === j) num[b.k] = coefs[idx];
      });
      // the denominator is content * (product of the primitive factors): n/d = poly + (1/content) * sum
      const nt = ptrim(num.slice().map((c) => c.div(fp.content)));
      if (nt.length) terms.push({ num: nt, fac: f.poly, power: j });
    }
  }
  return { poly: qpart, terms };
}

function apartText(ap, v) {
  const parts = [];
  if (ap.poly.length) parts.push(polyText(ap.poly, v));
  for (const t of ap.terms) {
    const den = polyText(t.fac, v);
    const single = t.fac.length === 2 && t.fac[0].isZero();
    const denS = (single ? den : '(' + den + ')') + (t.power > 1 ? toSup(String(t.power)) : '');
    // clear fractions in the numerator:  (a/b)(...)/den  ->  (integer poly)/(b * den)
    let L = 1n;
    for (const c of t.num) L = (L / bgcd(L, c.d)) * c.d;
    let ints = t.num.map((c) => c.n * (L / c.d));
    let g = 0n;
    for (const c of ints) g = bgcd(g, c);
    if (g > 1n) {
      ints = ints.map((c) => c / g);
      const red = bgcd(g, L);
      L = L / red;
      g = g / red;
      ints = ints.map((c) => c * g);
    }
    const num = intsToPoly(ints);
    const nterms = num.filter((c) => !c.isZero()).length;
    let numS = polyText(num, v);
    const neg = numS[0] === '-' && nterms === 1;
    if (neg) numS = numS.slice(1);
    if (nterms > 1) numS = '(' + numS + ')';
    parts.push((neg ? '-' : '') + numS + '/' + (L === 1n ? denS : '(' + L + denS + ')'));
  }
  let out = '';
  parts.forEach((p, i) => {
    const neg = p[0] === '-';
    if (!i) out = p;
    else out += neg ? ' - ' + p.slice(1) : ' + ' + p;
  });
  return out || '0';
}

// ---- polynomial helpers on S ----------------------------------------------------------------------
/** Coefficients (as S, in the other symbols) of an expression that is a polynomial in x; null if it is not. */
function polyCoeffsS(e, x) {
  const ex = expandS(e);
  const coeffs = new Map();
  for (const term of termsOf(ex)) {
    let deg = 0;
    const rest = [];
    const fs = term.k === '*' ? term.a : [term];
    for (const f of fs) {
      if (f.k === 'v' && f.name === x) deg += 1;
      else if (f.k === '^' && f.b.k === 'v' && f.b.name === x) {
        if (f.e.k === 'n' && f.e.q.isInt() && f.e.q.sign() >= 0) deg += Number(f.e.q.n);
        else return null;
      } else if (!freeOf(f, x)) return null;
      else rest.push(f);
    }
    coeffs.set(deg, sAdd([coeffs.get(deg) || S0, sMul(rest)]));
  }
  const out = [];
  const maxd = Math.max(...coeffs.keys(), 0);
  for (let d = 0; d <= maxd; d++) out.push(coeffs.get(d) || S0);
  return out;
}

// ---- trig simplification: Pythagorean identity, choose the shortest of three forms -------------------
function trigRewrite(e, from, to) {
  // replace fn(u)^2 by 1 - other(u)^2
  const walk = (t) => {
    if (t.k === '^' && t.e.k === 'n' && t.e.q.isInt() && t.e.q.n >= 2n && t.b.k === 'f' && t.b.fn === from && t.b.a.length === 1) {
      const n = Number(t.e.q.n);
      const sq = sSub(S1, sPow(sFn(to, t.b.a), sI(2)));
      return sMul([sPow(sq, sI(Math.floor(n / 2))), n % 2 ? t.b : S1]);
    }
    if (t.k === '+' || t.k === '*' || t.k === '^' || t.k === 'f') return mapS(t, walk);
    return t;
  };
  return walk(e);
}
function simplifyTrigS(e) {
  const base = expandS(e);
  const cands = [e, base, expandS(trigRewrite(base, 'cos', 'sin')), expandS(trigRewrite(base, 'sin', 'cos'))];
  let best = e;
  for (const c of cands) if (fmtS(c, true).length < fmtS(best, true).length && sameFunction(c, e)) best = c;
  return best;
}

// ---- commands ----------------------------------------------------------------------------------------
defCmd('expand', (n) => {
  needArgs(n, 1, 1, 'one expression');
  const out = newOut();
  const S = fromAst(n.args[0]);
  let T = expandS(S);
  if (trigArgsToExpand(T)) {
    const U = expandS(trExpandS(T));
    if (sameFunction(U, T)) T = U;
  }
  out.answer.push((trigArgsToExpand(S) && trTanText(S)) || fmtS(T));
  return out;
});

/** Does the expression have sin / cos / tan of a sum or of a multiple (something expand can open up)? */
function trigArgsToExpand(S) {
  if (S.k === 'f' && TR_FNS.has(S.fn)) {
    const sp = trSplit(S.a[0]);
    if (sp.parts || sp.k) return true;
  }
  if (S.k === '+' || S.k === '*' || S.k === 'f') return S.a.some(trigArgsToExpand);
  if (S.k === '^') return trigArgsToExpand(S.b);
  return false;
}

defCmd('trigexpand expandtrig', (n) => {
  needArgs(n, 1, 1, 'one expression');
  const out = newOut();
  const S = fromAst(n.args[0]);
  const T = expandS(trExpandS(S));
  if (!sameFunction(T, S)) throw new MathError('I could not expand this trigonometric expression');
  out.answer.push(trTanText(S) || fmtS(T));
  out.work.push('Used the sum and multiple-angle formulas: sin(A+B) = sin A cos B + cos A sin B, cos(A+B) = cos A cos B - sin A sin B, tan(A+B) = (tan A + tan B)/(1 - tan A tan B)');
  return out;
});

defCmd('tosum powerreduce', (n) => {
  needArgs(n, 1, 1, 'one expression');
  const out = newOut();
  const S = fromAst(n.args[0]);
  let T = null;
  try {
    const ctx = trContext(S, 'c');
    const x = trToElem(S, ctx);
    const v = ctx.v;
    T = trFourier(x, (k) => (ctx.n === 1 && k === 1 ? sV(v) : sMul([sN(new Q(BigInt(k), BigInt(ctx.n))), sV(v)])));
  } catch (e) {
    if (!(e instanceof TrigBail)) throw e;
  }
  if (!T || !sameFunction(T, S)) throw new MathError('this needs a product or power of sin and cos of multiples of one angle, e.g. sin(x)*cos(3x) or sin(x)^4');
  out.answer.push(fmtS(T));
  out.work.push('Wrote the products and powers as a sum of sines and cosines of multiples of the angle (product-to-sum and power-reducing formulas)');
  return out;
});

defCmd('factor', (n) => {
  needArgs(n, 1, 2, 'an expression (and optionally the variable)');
  const out = newOut();
  const S = fromAst(n.args[0]);
  if (S.k === 'n' && S.q.isInt()) {
    const v = babs(S.q.n);
    if (v < 2n) {
      out.answer.push(S.q.toString());
      return out;
    }
    const f = factorBig(v);
    if (!f) throw new MathError('that number is too large to factor here');
    out.answer.push((S.q.sign() < 0 ? '-1·' : '') + factorizationText(f) + (f.size === 1 && [...f.values()][0] === 1 ? '  (prime)' : ''));
    out.work.push('Type: prime factorisation');
    return out;
  }
  const vs = Array.from(varsOfS(S)).sort();
  if (!vs.length) throw new MathError('factor() needs a whole number or an expression with a variable');
  const v = n.args[1] ? varOfArg(n.args[1]) : vs.length === 1 ? vs[0] : null;
  if (v === null) return factorMulti(S, vs, out);
  const e0 = expandS(S);
  let r;
  try {
    r = toRFS(e0, v);
  } catch (err) {
    if (err instanceof NotAlgebraic) throw new MathError('I can only factor polynomials and fractions of polynomials');
    throw err;
  }
  const fnum = factorPolyQ(r.n);
  const fden = factorPolyQ(r.d);
  const top = factorPolyText(fnum, v);
  if (r.d.length === 1 && r.d[0].eq(Q1)) out.answer.push(top);
  else {
    const bot = factorPolyText(fden, v);
    out.answer.push((fnum.factors.length > 1 || fnum.content.sign() < 0 ? '(' + top + ')' : top) + '/(' + bot + ')');
  }
  out.work.push('Type: factoring over the rationals');
  out.work.push('Expanded form: ' + polyText(r.n, v) + (r.d.length > 1 ? ' over ' + polyText(r.d, v) : ''));
  const irr = fnum.factors.filter((f) => f.ints.length > 3);
  if (irr.length) out.notes.push('A factor of degree 3 or more that is shown unfactored has no rational roots (it may still split over irrational numbers).');
  return out;
});

/** Homogeneous polynomials in several variables: dehomogenise, factor, homogenise. */
function factorMulti(S, vs, out) {
  const e = expandS(S);
  const x = vs[0];
  const others = vs.slice(1);
  const terms = termsOf(e);
  const totalDeg = (t) => {
    let d = 0;
    (t.k === '*' ? t.a : [t]).forEach((f) => {
      if (f.k === 'v') d += 1;
      else if (f.k === '^' && f.b.k === 'v' && f.e.k === 'n' && f.e.q.isInt()) d += Number(f.e.q.n);
      else if (!(f.k === 'n')) d = NaN;
    });
    return d;
  };
  const degs = terms.map(totalDeg);
  if (degs.some(isNaN) || new Set(degs).size !== 1 || others.length !== 1) {
    throw new MathError('factoring several variables is supported only for homogeneous polynomials in two variables, e.g. x^2 - y^2');
  }
  const y = others[0];
  const P = polyCoeffsS(subsS(e, y, S1), x);
  const polyQ = P.map((c) => {
    if (c.k !== 'n') throw new MathError('only polynomials with rational coefficients can be factored');
    return c.q;
  });
  const fp = factorPolyQ(ptrim(polyQ));
  const d = degs[0];
  const pieces = fp.factors.map(({ ints, mult }) => {
    const parts = ints.map((c, k) => sMul([sN(new Q(c)), sPow(sV(x), sI(k)), sPow(sV(y), sI(ints.length - 1 - k))]));
    const t = fmtS(sAdd(parts));
    return '(' + t + ')' + (mult > 1 ? toSup(String(mult)) : '');
  });
  const used = fp.factors.reduce((s, f) => s + (f.ints.length - 1) * f.mult, 0);
  const extra = d - used; // powers of y that were lost when setting y = 1
  let c = fp.content.eq(Q1) ? '' : fp.content.eq(qInt(-1)) ? '-' : fp.content.toString();
  out.answer.push(c + pieces.join('') + (extra > 0 ? y + (extra > 1 ? toSup(String(extra)) : '') : ''));
  out.work.push('Type: factoring a homogeneous polynomial');
  return out;
}

/** "(top)/(bottom)" of a reduced rational function, factored or expanded, whichever is shorter. */
function ratioPolyAnswer(r, fn, fd, v) {
  const wrap = (t) => (isWrapped(t) || /^-?[A-Za-z0-9²³⁴⁵⁶⁷⁸⁹⁰¹]+$/.test(t) ? t : '(' + t + ')');
  const factored = wrap(factorPolyText(fn, v)) + '/' + wrap(factorPolyText(fd, v));
  const expanded = wrap(polyText(r.n, v)) + '/' + wrap(polyText(r.d, v));
  return expanded.length + 4 <= factored.length ? expanded : factored;
}

defCmd('simplify trigsimp', (n) => {
  needArgs(n, 1, 1, 'one expression');
  const out = newOut();
  const S = fromAst(n.args[0]);
  const vs = Array.from(varsOfS(S));
  if (vs.length === 1) {
    try {
      const r = toRFS(S, vs[0]);
      const fn = factorPolyQ(r.n);
      const fd = factorPolyQ(r.d);
      const top = factorPolyText(fn, vs[0]);
      let ans;
      if (r.d.length === 1) ans = polyText(r.n.map((c) => c.mul(r.d[0].inv())), vs[0]);
      else ans = ratioPolyAnswer(r, fn, fd, vs[0]);
      out.answer.push(ans);
      if (r.d.length > 1) out.work.push('Expanded: (' + polyText(r.n, vs[0]) + ')/(' + polyText(r.d, vs[0]) + ')');
      out.work.push('Cancelled common factors and combined terms');
      return out;
    } catch (e) {
      if (!(e instanceof NotAlgebraic)) throw e;
    }
  }
  if (!vs.length) {
    const T = surdNorm(S);
    out.answer.push(surdText(T) || symText(T));
    return out;
  }
  const best = trigBest(S);
  out.answer.push(fmtS(surdNorm(best || simplifyTrigS(S))));
  return out;
});

defCmd('apart partfrac', (n) => {
  needArgs(n, 1, 2, 'a fraction (and optionally the variable)');
  const out = newOut();
  const S = fromAst(n.args[0]);
  const v = n.args[1] ? varOfArg(n.args[1]) : singleVarOf(S);
  let r;
  try {
    r = toRFS(S, v);
  } catch (e) {
    if (e instanceof NotAlgebraic) throw new MathError('partial fractions need a fraction of polynomials');
    throw e;
  }
  if (r.d.length === 1) throw new MathError('there is no denominator to split');
  const ap = apartRF(r);
  out.answer.push(apartText(ap, v));
  out.work.push('Type: partial fraction decomposition');
  out.work.push('Denominator: ' + factorPolyText(factorPolyQ(r.d), v));
  return out;
});

function polyArgs(n) {
  const a = fromAst(n.args[0]);
  const b = fromAst(n.args[1]);
  const v = singleVarOf(sAdd([a, b]), n.args[2] && varOfArg(n.args[2]));
  return { v, A: toRFS(a, v).n, B: toRFS(b, v).n, a, b };
}
/** All arguments whole numbers? (gcd / lcm of three or more numbers) */
function allIntegerArgs(n) {
  if (n.args.length < 2) return null;
  try {
    const vals = n.args.map(constQ);
    return vals.every((q) => q.isInt()) ? vals.map((q) => q.n) : null;
  } catch (e) {
    return null;
  }
}
defCmd('gcd', (n) => {
  const many = n.args.length > 2 ? allIntegerArgs(n) : null;
  if (many) {
    const out0 = newOut();
    out0.answer.push(String(many.reduce((a, b) => bgcd(a, b), 0n)));
    return out0;
  }
  needArgs(n, 2, 3, 'two numbers or two polynomials');
  const out = newOut();
  const a = fromAst(n.args[0]);
  const b = fromAst(n.args[1]);
  if (a.k === 'n' && b.k === 'n' && a.q.isInt() && b.q.isInt()) {
    const g = bgcd(a.q.n, b.q.n);
    out.answer.push(String(g));
    const [gg, x, y] = egcd(a.q.n, b.q.n);
    out.work.push('Bezout: ' + gg + ' = ' + a.q.n + '·(' + x + ') + ' + b.q.n + '·(' + y + ')');
    return out;
  }
  const { v, A, B } = polyArgs(n);
  out.answer.push(polyText(pgcd(A, B), v));
  return out;
});
defCmd('lcm', (n) => {
  const many = n.args.length > 2 ? allIntegerArgs(n) : null;
  if (many) {
    const out0 = newOut();
    out0.answer.push(String(many.reduce((a, b) => (a === 0n || b === 0n ? 0n : babs(a * b) / bgcd(a, b)), 1n)));
    return out0;
  }
  needArgs(n, 2, 3, 'two numbers or two polynomials');
  const out = newOut();
  const a = fromAst(n.args[0]);
  const b = fromAst(n.args[1]);
  if (a.k === 'n' && b.k === 'n' && a.q.isInt() && b.q.isInt()) {
    const g = bgcd(a.q.n, b.q.n);
    out.answer.push(g === 0n ? '0' : String(babs(a.q.n * b.q.n) / g));
    return out;
  }
  const { v, A, B } = polyArgs(n);
  const g = pgcd(A, B);
  out.answer.push(polyText(pmonic(pmul(pdivmod(A, g)[0], B)), v));
  return out;
});
defCmd('divide polydiv', (n) => {
  needArgs(n, 2, 3, 'a dividend and a divisor');
  const out = newOut();
  const { v, A, B } = polyArgs(n);
  if (!B.length) throw new MathError('division by zero');
  const [qq, rr] = pdivmod(A, B);
  out.answer.push('quotient: ' + polyText(qq, v) + ',  remainder: ' + polyText(rr, v));
  out.check = 'dividend = divisor × quotient + remainder';
  return out;
});
