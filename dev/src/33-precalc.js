// ======================================================================
// 33. Precalculus and linear-algebra helpers: amplitude / period / phase shift of a sinusoid, linear independence, span, nullity,
//     rational zeros, end behaviour, even / odd, coefficient of a power, the range of a function.
// ======================================================================
const pcName = (S) => fmtS(S);

// ---- sinusoids ---------------------------------------------------------------------------------------------------------------------------
defCmd('sinusoid trigprops', (n) => {
  needArgs(n, 1, 2, 'a function such as 3 sin(2x - pi) + 1, and optionally the variable');
  const S = expandS(fromAst(n.args[0]));
  const v = n.args[1] ? varOfArg(n.args[1]) : singleVarOf(S);
  let D = S0;
  let term = null;
  for (const t of termsOf(S)) {
    if (freeOf(t, v)) D = sAdd([D, t]);
    else if (term) throw new MathError('the function must have the form A·sin(Bx + C) + D with one trigonometric term');
    else term = t;
  }
  if (!term) throw new MathError('there is no trigonometric term in ' + v);
  const fs = term.k === '*' ? term.a : [term];
  const tr = fs.filter((f) => !freeOf(f, v));
  const kinds = ['sin', 'cos', 'tan', 'cot', 'sec', 'csc'];
  if (tr.length !== 1 || tr[0].k !== 'f' || !kinds.includes(tr[0].fn) || tr[0].a.length !== 1) throw new MathError('the function must have the form A·sin(Bx + C) + D (sin, cos, tan, cot, sec or csc)');
  let A = fs.filter((f) => freeOf(f, v)).length ? simp(sMul(fs.filter((f) => freeOf(f, v)))) : S1;
  const lin = linearIn_(tr[0].a[0], v);
  if (!lin || zeroS(simp(lin.a1))) throw new MathError('the argument must be a linear expression in ' + v + ' such as 2x - pi');
  let B = simp(lin.a1);
  let C = simp(lin.a0);
  const fn = tr[0].fn;
  const flip = numS(B, {}) < 0;
  let reflected = numS(A, {}) < 0;
  if (flip) {
    B = simp(sNeg(B));
    C = simp(sNeg(C));
    if (fn !== 'cos' && fn !== 'sec') A = simp(sNeg(A));
  }
  reflected = numS(A, {}) < 0;
  const periodic = fn === 'sin' || fn === 'cos' || fn === 'sec' || fn === 'csc';
  const period = simp(sDiv(periodic ? sMul([sI(2), S_PI]) : S_PI, B));
  const h = simp(sDiv(sNeg(C), B));
  const out = newOut();
  const absA = numS(A, {}) < 0 ? simp(sNeg(A)) : A;
  if (fn === 'sin' || fn === 'cos') {
    out.answer.push('amplitude |A| = ' + symText(absA) + (reflected ? '   (A < 0: the graph is reflected in the midline)' : ''));
    out.answer.push('period = 2π/|B| = ' + symText(period) + ',  frequency = ' + symText(simp(sDiv(B, sMul([sI(2), S_PI])))));
    out.answer.push('phase shift = −C/B = ' + symText(h) + (zeroS(h) ? '' : numS(h, {}) > 0 ? ' (to the right)' : ' (to the left)'));
    out.answer.push('vertical shift D = ' + symText(D) + ',  midline y = ' + symText(D));
    out.answer.push('maximum = ' + symText(simp(sAdd([D, absA]))) + ',  minimum = ' + symText(simp(sSub(D, absA))) + ',  range [' + symText(simp(sSub(D, absA))) + ', ' + symText(simp(sAdd([D, absA]))) + ']');
    out.work.push(fmtS(simp(sAdd([sMul([A, sFn(fn, [simp(sAdd([sMul([B, sV(v)]), C]))])]), D]))) + ' = A ' + fn + '(B(' + v + ' − h)) + D with A = ' + symText(A) + ', B = ' + symText(B) + ', h = ' + symText(h) + ', D = ' + symText(D));
    const starts = fn === 'sin' ? 'a sine wave starts a cycle at ' + v + ' = ' + symText(h) : 'a cosine wave has its maximum (for A > 0) at ' + v + ' = ' + symText(h);
    out.work.push(starts + ' and repeats every ' + symText(period));
  } else {
    out.answer.push('no amplitude (' + fn + ' is unbounded);  period = ' + (periodic ? '2π/|B|' : 'π/|B|') + ' = ' + symText(period));
    out.answer.push('phase shift = −C/B = ' + symText(h) + (zeroS(h) ? '' : numS(h, {}) > 0 ? ' (to the right)' : ' (to the left)') + ',  vertical shift D = ' + symText(D));
    // vertical asymptotes: argument = pi/2 + k pi (tan, sec) or k pi (cot, csc)
    const base = fn === 'tan' || fn === 'sec' ? simp(sDiv(sSub(sDiv(S_PI, sI(2)), C), B)) : simp(sDiv(sNeg(C), B));
    const step = simp(sDiv(S_PI, B));
    out.answer.push('vertical asymptotes ' + v + ' = ' + symText(base) + ' + k·' + symText(step) + '  (k any integer)');
    if (fn === 'sec' || fn === 'csc') out.work.push('the graph never enters the strip between ' + symText(simp(sAdd([D, S1.k ? absA : absA]))) + ' and ' + symText(simp(sSub(D, absA))) + ' (|A| above and below the midline y = ' + symText(D) + ')');
  }
  out.value = { S: period };
  return out;
});

// ---- linear independence, span, nullity -------------------------------------------------------------------------------------------------------
function pcVectors(args, what) {
  const vs = args.map((a) => {
    const m = needMat(a, what);
    const flatv = m.length === 1 ? m[0] : m[0].length === 1 ? m.map((r) => r[0]) : null;
    if (!flatv) throw new MathError(what + ' needs vectors such as [1, 2, 3]');
    return flatv;
  });
  if (vs.some((v) => v.length !== vs[0].length)) throw new MathError('all the vectors must have the same number of entries');
  return vs;
}
const pcVecText = (v) => '[' + v.map((q) => q.toString()).join(', ') + ']';
const pcSub = (i) => 'v' + String(i + 1).split('').map((d) => f4Sub[Number(d)]).join('');
defMat('independent linindep', (args, n, out) => {
  if (args.length < 1) throw new MathError('independent needs vectors: independent([1,2,3], [4,5,6], [7,8,9])');
  const vs = pcVectors(args, 'independent');
  const k = vs.length;
  const dim = vs[0].length;
  const M = mT(vs); // columns are the vectors
  const { pivots } = mRref(M);
  const rank = pivots.length;
  if (rank === k) {
    out.answer.push('linearly independent (the ' + k + ' vectors have rank ' + k + ')');
    out.work.push('c₁v₁ + … + c' + f4Idx(k) + 'v' + f4Idx(k) + ' = 0 has only the solution c = 0' + (k === dim ? ';  they form a basis of the whole space of ' + dim + ' entries' : ''));
  } else {
    const rel = mNullspace(M)[0];
    const prim = primitiveVector(rel);
    out.answer.push('linearly dependent (rank ' + rank + ' < ' + k + ')');
    out.work.push('a non-trivial relation: ' + prim.map((c, i) => (c.isZero() ? null : qParen(c) + '·' + pcSub(i))).filter(Boolean).join(' + ') + ' = 0');
    const piv = pivots;
    out.work.push('the vectors ' + pivots.map((c) => pcSub(c)).join(', ') + ' are independent (a basis of their span); the others are combinations of them');
    if (k > dim) out.work.push('more vectors (' + k + ') than entries (' + dim + '): they are always dependent');
    void piv;
  }
  out.__done = true;
  return mat([[Q0]], { __skip: true });
}, [1, 'vectors']);
defMat('inspan span', (args, n, out) => {
  if (args.length < 2) throw new MathError('inspan needs a vector and the spanning vectors: inspan([1,2,3], [1,0,1], [0,1,1])');
  const vs = pcVectors(args, 'inspan');
  const target = vs[0];
  const gens = vs.slice(1);
  const M = mT(gens);
  const aug = M.map((r, i) => r.concat([target[i]]));
  const { R, pivots } = mRref(aug);
  const k = gens.length;
  if (pivots.includes(k)) {
    out.answer.push('the vector ' + pcVecText(target) + ' is NOT in the span of the given vectors');
    out.work.push('A c = v has no solution (the augmented matrix has rank ' + pivots.length + ' but A has rank ' + pivots.filter((c) => c < k).length + ')');
  } else {
    const c = new Array(k).fill(Q0);
    pivots.forEach((pc, i) => { c[pc] = R[i][k]; });
    out.answer.push('the vector ' + pcVecText(target) + ' is in the span: v = ' + c.map((q, i) => qParen(q) + '·u' + f4Idx(i + 1)).join(' + '));
    out.work.push('with ' + gens.map((g, i) => 'u' + f4Idx(i + 1) + ' = ' + pcVecText(g)).join(', '));
    if (pivots.length < k) out.work.push('the spanning vectors are dependent, so the coefficients are not unique (free variables set to 0)');
  }
  out.__done = true;
  return mat([[Q0]], { __skip: true });
}, [2, 'a vector and the vectors that span']);
defMat('nullity', (args, n, out) => {
  const A = needMat(args[0], 'nullity');
  const { pivots } = mRref(A);
  const cols = A[0].length;
  const nul = cols - pivots.length;
  out.answer.push('nullity = ' + nul + ',  rank = ' + pivots.length + '  (rank + nullity = ' + cols + ' columns)');
  const basis = mNullspace(A);
  if (basis.length) out.work.push('basis of the null space: ' + basis.map((b) => pcVecText(primitiveVector(b))).join(', '));
  else out.work.push('only the zero vector solves A x = 0');
  out.__done = true;
  return mat([[Q0]], { __skip: true });
}, [1, 'a matrix']);

// ---- rational zeros -------------------------------------------------------------------------------------------------------------------------
function pcDivisors(nn) {
  const ds = [];
  for (let d = 1n; d * d <= nn; d++) if (nn % d === 0n) { ds.push(d); if (d * d !== nn) ds.push(nn / d); }
  return ds.sort((a, b) => (a < b ? -1 : 1));
}
defCmd('ratroots rationalroots ratzeros', (n) => {
  needArgs(n, 1, 2, 'a polynomial such as 2x^3 - 3x^2 - 8x - 3');
  const S = expandS(fromAst(n.args[0]));
  const v = n.args[1] ? varOfArg(n.args[1]) : singleVarOf(S);
  const cs = polyCoeffsS(S, v);
  if (!cs || cs.some((c) => c.k !== 'n')) throw new MathError('the polynomial needs rational coefficients');
  let L = 1n;
  cs.forEach((c) => { L = (L * c.q.d) / bgcd(L, c.q.d); });
  let ints = cs.map((c) => c.q.n * (L / c.q.d));
  let zeros = 0;
  while (ints.length > 1 && ints[0] === 0n) { ints = ints.slice(1); zeros++; }
  if (ints.length < 2) throw new MathError('the polynomial must have degree at least 1');
  const lead = babs(ints[ints.length - 1]);
  const cst = babs(ints[0]);
  const ps = pcDivisors(cst);
  const qs = pcDivisors(lead);
  const cand = [];
  ps.forEach((p) => qs.forEach((q) => { if (bgcd(p, q) === 1n) cand.push([p, q]); }));
  cand.sort((a, b) => Number(a[0]) / Number(a[1]) - Number(b[0]) / Number(b[1]));
  const out = newOut();
  out.answer.push('possible rational zeros ±p/q with p | ' + cst + ' and q | ' + lead + ':  ' + (cand.length > 40 ? cand.length * 2 + ' candidates' : cand.map(([p, q]) => '±' + (q === 1n ? p.toString() : p + '/' + q)).join(', ')));
  const roots = polyRoots(intsToPoly(ints)).real.filter((r) => r.q);
  if (zeros) roots.unshift({ q: Q0, mult: zeros });
  if (!roots.length) out.answer.push('no rational zero: the polynomial has no linear factor with rational coefficients');
  else out.answer.push('rational zeros: ' + roots.map((r) => r.q.toString() + (r.mult > 1 ? ' (multiplicity ' + r.mult + ')' : '')).join(', '));
  try {
    const f = runCommandCall(parseExpression('factor(' + fmtS(S, true) + ')'));
    out.work.push('factored: ' + f.answer[0]);
  } catch (e) {
    if (!(e instanceof MathError)) throw e;
  }
  out.work.push('rational root theorem: every rational zero p/q in lowest terms has p dividing the constant term and q dividing the leading coefficient;  each candidate is tested with the remainder theorem');
  return out;
});

// ---- end behaviour -----------------------------------------------------------------------------------------------------------------------------
defCmd('endbehavior endbehaviour', (n) => {
  needArgs(n, 1, 2, 'f and optionally the variable');
  const S = fromAst(n.args[0]);
  const v = n.args[1] ? varOfArg(n.args[1]) : singleVarOf(S);
  const out = newOut();
  const side = (inf) => {
    try {
      const r = runCommandCall(parseExpression('limit(' + fmtS(S, true) + ', ' + v + ', ' + inf + ')'));
      return r.answer[0].replace(/^.*?(?:=|→)\s*/, '');
    } catch (e) {
      if (e instanceof MathError) return null;
      throw e;
    }
  };
  const plus = side('oo');
  const minus = side('-oo');
  const word = (t, dir) => (t === null ? 'could not be determined' : /^-?∞$|infinity|^[-−]?\s*∞/.test(t) ? 'f(' + v + ') → ' + t : 'f(' + v + ') → ' + t + '  (horizontal asymptote y = ' + t + ')');
  out.answer.push('as ' + v + ' → ∞:  ' + word(plus));
  out.answer.push('as ' + v + ' → −∞:  ' + word(minus));
  try {
    const cs = polyCoeffsS(expandS(S), v);
    if (cs && cs.length > 1 && cs.every((c) => c.k === 'n')) {
      const deg = cs.length - 1;
      const lc = cs[deg].q;
      out.work.push('polynomial of degree ' + deg + ' (' + (deg % 2 ? 'odd' : 'even') + ') with leading coefficient ' + lc.toString() + ': the end behaviour follows the leading term ' + (lc.eq(Q1) ? '' : lc.eq(qInt(-1)) ? '−' : lc.toString()) + v + toSup(String(deg)) + ' — ' + (deg % 2 ? (lc.sign() > 0 ? 'falls to the left, rises to the right' : 'rises to the left, falls to the right') : (lc.sign() > 0 ? 'rises on both sides' : 'falls on both sides')));
    }
  } catch (e) {
    if (!(e instanceof NotAlgebraic) && !(e instanceof MathError)) throw e;
  }
  return out;
});

// ---- even / odd ---------------------------------------------------------------------------------------------------------------------------------
defCmd('evenodd parity symmetry', (n) => {
  needArgs(n, 1, 2, 'f and optionally the variable');
  const S = simp(expandS(fromAst(n.args[0])));
  const v = n.args[1] ? varOfArg(n.args[1]) : singleVarOf(S);
  const mirrored = simp(expandS(subsS(S, v, sNeg(sV(v)))));
  const out = newOut();
  const same = zeroS(simp(expandS(sSub(mirrored, S))));
  const neg = zeroS(simp(expandS(sAdd([mirrored, S]))));
  const numCheck = (sign) => {
    for (const x of [0.37, 1.9, -2.6, 0.81]) {
      const a = numS(S, { [v]: x });
      const b = numS(S, { [v]: -x });
      if (isFinite(a) && isFinite(b) && Math.abs(b - sign * a) > 1e-9 * (1 + Math.abs(a))) return false;
    }
    return true;
  };
  let even = same;
  let odd = neg && !same;
  if (!even && !odd) { even = numCheck(1); odd = !even && numCheck(-1); }
  out.answer.push(even ? 'even: f(−' + v + ') = f(' + v + '), the graph is symmetric about the y-axis' : odd ? 'odd: f(−' + v + ') = −f(' + v + '), the graph is symmetric about the origin' : 'neither even nor odd');
  out.work.push('f(' + v + ') = ' + fmtS(S) + ';  f(−' + v + ') = ' + fmtS(mirrored));
  return out;
});

// ---- coefficient of a power ---------------------------------------------------------------------------------------------------------------------------
defCmd('coeff coefficient', (n) => {
  needArgs(n, 2, 3, 'a polynomial (or a power to expand), the variable and the exponent: coeff((1 + 2x)^6, x, 3)');
  const S = expandS(fromAst(n.args[0]));
  const v = n.args.length === 3 ? varOfArg(n.args[1]) : singleVarOf(S);
  const k = Number(intArg(n.args[n.args.length - 1]));
  const cs = polyCoeffsS(S, v);
  if (!cs) throw new MathError('the expression must be a polynomial in ' + v + ' once expanded');
  const out = newOut();
  const c = k >= 0 && k < cs.length ? cs[k] : S0;
  out.answer.push('coefficient of ' + v + (k === 0 ? '⁰ (the constant term)' : k === 1 ? '' : toSup(String(k))) + ' = ' + symText(simp(c)));
  out.work.push('expanded: ' + fmtS(simp(S)));
  out.value = { S: simp(c) };
  return out;
});

// ---- the range of a function ------------------------------------------------------------------------------------------------------------------------
/** points where the function is excluded or changes form (zeros of denominators, even-root and logarithm arguments): exact breakpoints */
function rgForced(S, v) {
  const pts = [];
  domainConditions(S, v, []).forEach((c) => {
    try {
      realRootsOf(simp(c.expr), v, -1e4, 1e4).forEach((r) => pts.push({ val: Number(r.val.toPrecision(13)), S: r.S }));
    } catch (e) {
      if (!(e instanceof NotAlgebraic) && !(e instanceof MathError)) throw e;
    }
  });
  return pts;
}
/** an exact expression for a number that is a simple fraction, a multiple of pi or a square root of a fraction */
function rgExact(x) {
  const fr = toFraction(x, 1000);
  if (fr && Math.abs(fr.p / fr.q - x) < 1e-10 * (1 + Math.abs(x))) return sN(new Q(BigInt(fr.p), BigInt(fr.q)));
  const pf = toFraction(x / Math.PI, 24);
  if (pf && Math.abs((pf.p * Math.PI) / pf.q - x) < 1e-10 * (1 + Math.abs(x))) return sMul([sN(new Q(BigInt(pf.p), BigInt(pf.q))), S_PI]);
  const f2 = toFraction(x * x, 200);
  if (f2 && f2.p > 0 && Math.abs(Math.sqrt(f2.p / f2.q) - Math.abs(x)) < 1e-10 * (1 + Math.abs(x))) return sMul([sN(new Q(x < 0 ? -1n : 1n)), sSqrt(sN(new Q(BigInt(f2.p), BigInt(f2.q))))]);
  return null;
}
function rgFmt(x) {
  if (x === Infinity) return '∞';
  if (x === -Infinity) return '-∞';
  const rec = recognizeLoose(x);
  if (rec) return rec.text;
  return '≈' + fmtNum(x);
}
/** limit of S at the end e of a piece, approached from inside; { v } or { v: ±Infinity } */
function rgLimit(S, v, e, side, F) {
  const isInf = typeof e === 'number' && !isFinite(e);
  const point = isInf ? { inf: e > 0 ? 1 : -1 } : (() => { const ex = e.S || rgExact(e.val !== undefined ? e.val : e); return ex ? { S: ex } : null; })();
  if (point) {
    try {
      const r = limitOf(S, v, point, point.inf ? 0 : side);
      if (r.kind === 'inf') return { v: r.sign > 0 ? Infinity : -Infinity };
      if (r.kind === 'value') return { v: limNum(r) };
    } catch (err) {
      if (!(err instanceof MathError) && !(err instanceof NotAlgebraic)) throw err;
    }
  }
  // numerical fallback
  const ev = typeof e === 'object' ? e.val : e;
  const probe = isFinite(ev) ? [1e-6, 1e-7, 1e-8].map((h) => F(ev + side * h * (1 + Math.abs(ev)))) : [1e6, 1e8, 1e10].map((h) => F(ev > 0 ? h : -h));
  const last = probe[probe.length - 1];
  if (!isFinite(last)) return { v: Infinity, approx: true };
  if (Math.abs(last) > 1e7) return { v: last > 0 ? Infinity : -Infinity };
  return { v: last, approx: true };
}
defCmd('rangeof functionrange', (n) => {
  const { S, v } = funcArgs(n, 1, 2, 'f and optionally the variable');
  const F = (x) => {
    try {
      const y = numS(S, { [v]: x });
      return isFinite(y) ? y : NaN;
    } catch (e) {
      return NaN;
    }
  };
  // 1. breaks: exact ones and poles of trigonometric functions found on a wide grid (sign change between large values of growing size)
  const forced = rgForced(S, v);
  const breaks = new Map(forced.map((f) => [f.val, f.S]));
  const T = Math.asinh(1e8);
  const grid = [];
  for (let i = 0; i <= 40000; i++) grid.push(0.01 * Math.sinh(-T + (2 * T * i) / 40000));
  let prev = F(grid[0]);
  for (let i = 1; i < grid.length; i++) {
    const cur = F(grid[i]);
    if (isFinite(prev) && isFinite(cur) && prev * cur < 0 && Math.min(Math.abs(prev), Math.abs(cur)) > 5) {
      let a = grid[i - 1];
      let b = grid[i];
      for (let k = 0; k < 80; k++) {
        const m = (a + b) / 2;
        const fm = F(m);
        if (!isFinite(fm)) break;
        if ((fm < 0) === (prev < 0)) a = m; else b = m;
      }
      const p = Number(((a + b) / 2).toPrecision(13));
      if (!isFinite(F(p)) || Math.abs(F(p)) > 1e6) { if (![...breaks.keys()].some((k) => Math.abs(k - p) < 1e-9 * (1 + Math.abs(p)))) breaks.set(p, null); }
    }
    prev = cur;
  }
  const cutList = [...breaks.keys()].sort((a, b) => a - b);
  const cuts = cutList.length ? cutList : [0];
  const bounds = [-Infinity].concat(cuts, [Infinity]);
  const endObj = (x) => (isFinite(x) ? { val: x, S: breaks.get(x) || null } : x);
  const intervals = [];
  for (let bi = 0; bi < bounds.length - 1; bi++) {
    const a = bounds[bi];
    const b = bounds[bi + 1];
    const finite = isFinite(a) && isFinite(b);
    const at = (t) => {
      if (finite) return a + (b - a) * ((1 - Math.cos(Math.PI * t)) / 2);
      if (!isFinite(a) && !isFinite(b)) return 0.01 * Math.sinh(T * (2 * t - 1));
      const h = 0.01 * Math.sinh(T * t);
      return isFinite(a) ? a + h : b - h;
    };
    const M = 6000;
    const xs = [];
    for (let i = 1; i < M; i++) xs.push(at(i / M));
    const ys = xs.map(F);
    const cands = []; // { val, attained }
    // local extrema of the samples, refined
    const ok = ys.map((y) => isFinite(y));
    const golden = (l, r, sign) => {
      const g = (Math.sqrt(5) - 1) / 2;
      let c = r - g * (r - l);
      let d = l + g * (r - l);
      for (let it = 0; it < 100; it++) {
        if (sign * F(c) > sign * F(d)) { r = d; d = c; c = r - g * (r - l); } else { l = c; c = d; d = l + g * (r - l); }
      }
      return F((l + r) / 2);
    };
    for (let i = 1; i < xs.length - 1; i++) {
      if (!(ok[i - 1] && ok[i] && ok[i + 1]) || Math.abs(ys[i]) > 1e6) continue;
      const sig = 1e-13 * (1 + Math.abs(ys[i])); // rounding noise in flat parts must not look like an extremum
      if (ys[i] - ys[i - 1] > sig && ys[i] - ys[i + 1] > sig) cands.push({ val: Math.max(ys[i], golden(xs[i - 1], xs[i + 1], 1)), attained: true });
      if (ys[i - 1] - ys[i] > sig && ys[i + 1] - ys[i] > sig) cands.push({ val: Math.min(ys[i], golden(xs[i - 1], xs[i + 1], -1)), attained: true });
    }
    if (!ok.some(Boolean)) continue;
    // flat pieces (constant function)
    const fin = ys.filter((y) => isFinite(y));
    if (Math.max(...fin) - Math.min(...fin) < 1e-12 * (1 + Math.abs(fin[0]))) cands.push({ val: fin[0], attained: true });
    // the ends
    const ends = [[a, 1], [b, -1]];
    ends.forEach(([e, side]) => {
      if (isFinite(e)) {
        // the value at the end point: exact substitution when the end is an exact number (rounding can turn 0 into -1e-17 under a root)
        let Fe = F(e);
        const eo = endObj(e);
        const exactS = eo.S || rgExact(e);
        if (exactS) {
          try {
            const y = numS(simp(subsS(S, v, exactS)), {});
            if (isFinite(y)) Fe = y;
            else if (!eo.S) Fe = NaN;
          } catch (err) {
            if (!(err instanceof MathError) && !(err instanceof NotAlgebraic)) throw err;
          }
        }
        const L = rgLimit(S, v, eo, side, F);
        // the value at the end counts only when it agrees with the limit (rounding can make a pole look finite)
        const here = isFinite(Fe) && isFinite(L.v) && Math.abs(Fe - L.v) <= 1e-6 * (1 + Math.abs(L.v));
        if (here) cands.push({ val: Fe, attained: true });
        cands.push({ val: L.v, attained: here });
      } else {
        const L = rgLimit(S, v, e, 0, F);
        cands.push({ val: L.v, attained: false });
      }
    });
    const tol = (x) => (isFinite(x) ? 1e-9 * (1 + Math.abs(x)) : 0);
    const pick = (better) => {
      let best = null;
      cands.forEach((c) => {
        if (!isFinite(c.val) && !(c.val === Infinity || c.val === -Infinity)) return;
        if (best === null || better(c.val, best.val)) best = { val: c.val, attained: c.attained };
        else if (Math.abs(c.val - best.val) <= tol(best.val) && c.attained) best.attained = true;
      });
      return best;
    };
    const hi = pick((p, q) => p > q + tol(q));
    const lo = pick((p, q) => p < q - tol(q));
    if (!hi || !lo) continue;
    intervals.push({ lo: lo.val, hi: hi.val, loOpen: !lo.attained, hiOpen: !hi.attained });
  }
  if (!intervals.length) throw new MathError('the function has no real values');
  // 2. union of the intervals
  const eq = (x, y) => (x === y) || (isFinite(x) && isFinite(y) && Math.abs(x - y) <= 1e-9 * (1 + Math.abs(x)));
  intervals.sort((p, q) => (eq(p.lo, q.lo) ? (p.loOpen ? 1 : 0) - (q.loOpen ? 1 : 0) : p.lo - q.lo));
  const merged = [];
  intervals.forEach((r) => {
    const last = merged[merged.length - 1];
    if (last && (r.lo < last.hi && !eq(r.lo, last.hi) || (eq(r.lo, last.hi) && !(last.hiOpen && r.loOpen)))) {
      if (eq(r.hi, last.hi)) last.hiOpen = last.hiOpen && r.hiOpen;
      else if (r.hi > last.hi) { last.hi = r.hi; last.hiOpen = r.hiOpen; }
    } else merged.push({ ...r });
  });
  const text = merged.map((m) => {
    if (eq(m.lo, m.hi) && !m.loOpen && !m.hiOpen) return '{' + rgFmt(m.lo) + '}';
    return (m.loOpen || !isFinite(m.lo) ? '(' : '[') + rgFmt(m.lo) + ', ' + rgFmt(m.hi) + (m.hiOpen || !isFinite(m.hi) ? ')' : ']');
  }).join(' ∪ ');
  const out = newOut();
  out.answer.push('range: ' + text);
  out.work.push('f(' + v + ') = ' + fmtS(S) + ';  the values come from the local extrema, the end values and the limits at the ends of each interval of the domain');
  out.work.push('domain: ' + domainOf(S, v));
  out.notes.push('Found by a numerical search with exact limits; a decimal with ≈ means no simple exact form was recognised.');
  return out;
});
