// ======================================================================
// 38. More algebra: quadratics (discriminant, completing the square, vertex), logarithm laws, more set commands,
//     a term of a binomial expansion
// ======================================================================

// ---- quadratics ------------------------------------------------------------------------------------------------
function quadParts(n, usage) {
  needArgs(n, 1, 2, usage);
  const S = fromAst(n.args[0]);
  const v = n.args[1] ? varOfArg(n.args[1]) : singleVarOf(S);
  const co = polyCoeffsS(expandS(S), v);
  if (!co || co.length !== 3 || co[2].k === 'n' && co[2].q.isZero()) throw new MathError('a quadratic expression in ' + v + ' is needed, e.g. x^2 - 4x + 7');
  return { S, v, a: co[2], b: co[1], c: co[0] };
}
const q2 = (S) => simp(expandS(S));
defCmd('discriminant disc', (n) => {
  const { v, a, b, c } = quadParts(n, 'a quadratic expression');
  const out = newOut();
  const D = q2(sSub(sPow(b, sI(2)), sMul([sI(4), a, c])));
  out.answer.push(varsOfS(D).size ? 'D = ' + fmtS(D) : 'D = b² − 4ac = ' + symText(D));
  if (D.k === 'n' || !varsOfS(D).size) {
    const d = numS(D, {});
    out.answer.push(d > 0 ? 'D > 0: two distinct real roots' : d === 0 ? 'D = 0: one repeated real root (the parabola touches the ' + v + '-axis)' : 'D < 0: no real roots, two complex conjugate roots');
  }
  out.work.push('a = ' + fmtS(a) + ',  b = ' + fmtS(b) + ',  c = ' + fmtS(c));
  out.value = { S: D };
  return out;
});
defCmd('completesquare completethesquare', (n) => {
  const { v, a, b, c } = quadParts(n, 'a quadratic expression');
  const out = newOut();
  const h = q2(sDiv(sNeg(b), sMul([sI(2), a])));
  const k = q2(sSub(c, sDiv(sPow(b, sI(2)), sMul([sI(4), a]))));
  const X = sV(v);
  const form = sAdd([sMul([a, sPow(sSub(X, h), sI(2))]), k]);
  out.answer.push(fmtS(q2(sAdd([sMul([a, sPow(X, sI(2))]), sMul([b, X]), c]))) + ' = ' + fmtS(form));
  out.answer.push('vertex (h, k) = (' + symText(h) + ', ' + symText(k) + ')');
  out.work.push('a(' + v + ' − h)² + k with h = −b/(2a) and k = c − b²/(4a)');
  if (!varsOfS(sAdd([a, b, c])).size) {
    const kk = numS(k, {});
    const aa = numS(a, {});
    // roots of a(x - h)^2 + k = 0:  x = h ± sqrt(-k/a)
    const r = q2(sDiv(sNeg(k), a));
    if (numS(r, {}) >= 0) out.work.push('Setting it to 0: ' + v + ' = ' + fmtS(h) + ' ± ' + fmtS(simp(sSqrt(r))));
    else out.work.push('Setting it to 0 gives ' + v + ' = ' + fmtS(h) + ' ± ' + fmtS(simp(sSqrt(sNeg(r)))) + ' i (no real roots)');
    void kk; void aa;
  }
  return out;
});
defCmd('vertex quadvertex', (n) => {
  const { v, a, b, c } = quadParts(n, 'a quadratic expression');
  const out = newOut();
  const h = q2(sDiv(sNeg(b), sMul([sI(2), a])));
  const k = q2(sSub(c, sDiv(sPow(b, sI(2)), sMul([sI(4), a]))));
  out.answer.push('vertex = (' + symText(h) + ', ' + symText(k) + ')');
  out.answer.push('axis of symmetry: ' + v + ' = ' + fmtS(h));
  if (!varsOfS(a).size) out.answer.push(numS(a, {}) > 0 ? 'opens upward: minimum value ' + symText(k) + ' at ' + v + ' = ' + fmtS(h) : 'opens downward: maximum value ' + symText(k) + ' at ' + v + ' = ' + fmtS(h));
  out.answer.push('y-intercept: (0, ' + fmtS(c) + ')');
  out.work.push('h = −b/(2a), k = f(h)');
  return out;
});

// ---- logarithm laws -----------------------------------------------------------------------------------------------
function mapAst(n, f) {
  switch (n.t) {
    case 'neg': case 'pct': case 'fact': return { ...n, a: f(n.a) };
    case 'bin': return { ...n, a: f(n.a), b: f(n.b) };
    case 'call': return { ...n, args: n.args.map(f) };
    case 'list': return { ...n, items: n.items.map(f) };
    case 'named': return { ...n, a: f(n.a) };
    default: return n;
  }
}
/** log(u), log10, lg, log2, log(u, b) become the S functions logbB (B = the base); ln stays ln. */
function rewriteLogs(n) {
  n = mapAst(n, rewriteLogs);
  if (n.t !== 'call' || n.cmd) return n;
  let base = null;
  let args = n.args;
  if ((n.fn === 'log' || n.fn === 'log10' || n.fn === 'lg') && args.length === 1) base = 10;
  else if (n.fn === 'log2') base = 2;
  else if (n.fn === 'log' && args.length === 2) {
    try {
      const b = constQ(args[1]);
      if (b.isInt() && b.n >= 2n && b.n <= 99n) {
        base = Number(b.n);
        args = [args[0]];
      }
    } catch (e) {
      return n;
    }
  }
  if (base === null) return n;
  const name = 'logb' + base;
  AST_FN[name] = name;
  FN_LABEL[name] = base === 10 ? 'log' : 'log' + String(base).split('').map((d) => '₀₁₂₃₄₅₆₇₈₉'[+d]).join('');
  return { ...n, fn: name, args };
}
const isLogS = (t) => t.k === 'f' && t.a.length === 1 && (t.fn === 'ln' || /^logb\d+$/.test(t.fn));
const logBase = (fn) => (fn === 'ln' ? null : Number(fn.slice(4)));
function logOfNumber(q, fn) {
  const base = logBase(fn);
  if (base !== null && q.isInt() && q.sign() > 0) {
    let e = 0;
    let m = q.n;
    const B = BigInt(base);
    while (m > 1n && m % B === 0n) {
      m /= B;
      e++;
    }
    if (m === 1n) return sI(e);
  }
  return sFn(fn, [sN(q)]);
}
function logExpandArg(u, fn) {
  u = simp(u);
  if (u.k === '*') return sAdd(u.a.map((f) => logExpandArg(f, fn)));
  if (u.k === '^' && !isConstE(u.b)) return sMul([u.e, logExpandArg(u.b, fn)]);
  if (u.k === 'n') {
    if (u.q.sign() <= 0) return sFn(fn, [u]);
    if (u.q.isInt()) return logOfNumber(u.q, fn);
    return sSub(logOfNumber(new Q(u.q.n), fn), logOfNumber(new Q(u.q.d), fn));
  }
  return sFn(fn, [u]);
}
function logExpandS(S) {
  const go = (t) => (isLogS(t) ? logExpandArg(go(t.a[0]), t.fn) : mapS(t, go));
  return go(S);
}
function hasLogS(S) {
  if (isLogS(S)) return true;
  if (S.k === '+' || S.k === '*' || S.k === 'f') return S.a.some(hasLogS);
  return S.k === '^' ? hasLogS(S.b) || hasLogS(S.e) : false;
}
/** Sum of c * log(u) terms with the same base -> one log of a product / quotient of powers. */
function logCondenseS(S) {
  const groups = new Map();
  const rest = [];
  for (const t of termsOf(expandS(S))) {
    const fs = t.k === '*' ? t.a : [t];
    const logs = fs.filter(isLogS);
    if (logs.length !== 1) {
      rest.push(t);
      continue;
    }
    const lg = logs[0];
    const coef = sMul(fs.filter((f) => f !== lg));
    if (!groups.has(lg.fn)) groups.set(lg.fn, []);
    groups.get(lg.fn).push(sPow(lg.a[0], coef));
  }
  const out = rest.slice();
  for (const [fn, factors] of groups) out.push(sFn(fn, [simp(sMul(factors))]));
  return sAdd(out);
}
function logCmd(condense) {
  return (n) => {
    needArgs(n, 1, 1, 'one expression with logarithms');
    const S = fromAst(rewriteLogs(n.args[0]));
    const out = newOut();
    if (!hasLogS(S)) throw new MathError('there is no logarithm (log, ln) in this expression');
    const T = condense ? logCondenseS(S) : simp(expandS(logExpandS(S)));
    if (!sameFunctionPositive(S, T)) throw new MathError('I could not ' + (condense ? 'condense' : 'expand') + ' this logarithmic expression');
    out.answer.push(fmtS(T));
    out.work.push(condense ? 'Used c·log(u) = log(uᶜ), log(u) + log(v) = log(uv) and log(u) − log(v) = log(u/v)' : 'Used log(uv) = log(u) + log(v), log(u/v) = log(u) − log(v) and log(uᶜ) = c·log(u)');
    out.notes.push('The variables are taken to be positive.');
    return out;
  };
}
/** Same function at random positive points (logarithms need them). */
function sameFunctionPositive(a, b) {
  const vs = Array.from(new Set([...varsOfS(a), ...varsOfS(b)]));
  let good = 0;
  let seed = 4242;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let t = 0; t < 40 && good < 8; t++) {
    const env = {};
    vs.forEach((v) => { env[v] = 0.3 + rnd() * 6; });
    let x;
    let y;
    try {
      x = numS(a, env);
      y = numS(b, env);
    } catch (e) {
      continue;
    }
    if (!isFinite(x) || !isFinite(y)) continue;
    if (Math.abs(x - y) > 1e-9 * (1 + Math.abs(x))) return false;
    good++;
  }
  return good > 0;
}
defCmd('logexpand expandlog', logCmd(false));
defCmd('logcondense condenselog', logCmd(true));

// ---- sets ------------------------------------------------------------------------------------------------------------------
function setItemsOf(node) {
  if (node.t !== 'list') throw new MathError('give each set as a list in brackets, e.g. [1, 2, 3]');
  const seen = new Set();
  const items = [];
  for (const it of node.items) {
    const S = simp(fromAst(it));
    const k = key(S);
    if (!seen.has(k)) {
      seen.add(k);
      items.push({ k, S });
    }
  }
  return items;
}
const numericSetItems = (items) => items.every((i) => !varsOfS(i.S).size && isFinite(numS(i.S, {})));
function sortSetItems(items) {
  return numericSetItems(items) ? items.slice().sort((x, y) => numS(x.S, {}) - numS(y.S, {})) : items;
}
const setShow = (items) => (items.length ? '{' + items.map((i) => fmtS(i.S)).join(', ') + '}' : '∅ (the empty set)');
function setArgs(n, lo, hi, usage) {
  needArgs(n, lo, hi, usage);
  return n.args.map(setItemsOf);
}
function setAnswerOut(out, items, label) {
  const s = sortSetItems(items);
  out.answer.push((label ? label + ' = ' : '') + setShow(s) + '   (' + s.length + ' element' + (s.length === 1 ? '' : 's') + ')');
  out.value = { q: qInt(s.length) };
  return out;
}
defCmd('setcomplement', (n) => {
  const [A, U] = setArgs(n, 2, 2, 'the set and the universal set');
  if (!A.every((i) => U.some((j) => j.k === i.k))) throw new MathError('the set is not inside the universal set');
  return setAnswerOut(newOut(), U.filter((i) => !A.some((j) => j.k === i.k)), "A'");
});
defCmd('cardinality setsize', (n) => {
  const [A] = setArgs(n, 1, 1, 'one set');
  const out = newOut();
  out.answer.push('|A| = ' + A.length);
  out.value = { q: qInt(A.length) };
  return out;
});
defCmd('issubset subsetof', (n) => {
  const [A, B] = setArgs(n, 2, 2, 'two sets');
  const sub = A.every((i) => B.some((j) => j.k === i.k));
  const out = newOut();
  out.answer.push(sub ? 'A ⊆ B: every element of A is in B' + (A.length < B.length ? ' (a proper subset)' : ' (the sets are equal)') : 'A is not a subset of B: ' + setShow(A.filter((i) => !B.some((j) => j.k === i.k))) + ' not in B');
  out.value = { q: sub ? Q1 : Q0 };
  return out;
});
defCmd('powerset subsets', (n) => {
  needArgs(n, 1, 1, 'a set or its size');
  const out = newOut();
  if (n.args[0].t !== 'list') {
    const sz = intArg(n.args[0]);
    if (sz < 0n || sz > 5000n) throw new MathError('the size must be between 0 and 5000');
    out.work.push('A set with ' + sz + ' elements has 2^' + sz + ' subsets');
    return intOut(out, 2n ** sz);
  }
  const [A] = setArgs(n, 1, 1, 'one set');
  const s = sortSetItems(A);
  out.answer.push('number of subsets = 2^' + s.length + ' = ' + (2n ** BigInt(s.length)).toString() + (s.length ? '  (' + (2n ** BigInt(s.length) - 1n) + ' non-empty, ' + (2n ** BigInt(s.length) - 2n) + ' proper non-empty)' : ''));
  if (s.length <= 5) {
    const subsets = [];
    for (let m = 0; m < 1 << s.length; m++) subsets.push(s.filter((_, i) => m & (1 << i)));
    subsets.sort((x, y) => x.length - y.length);
    out.answer.push(subsets.map((x) => (x.length ? '{' + x.map((i) => fmtS(i.S)).join(', ') + '}' : '∅')).join(', '));
  }
  out.value = { q: qInt(2).pow(s.length) };
  return out;
});
defCmd('cartesian cartesianproduct', (n) => {
  const [A, B] = setArgs(n, 2, 2, 'two sets');
  const out = newOut();
  const a = sortSetItems(A);
  const b = sortSetItems(B);
  out.answer.push('|A × B| = ' + a.length * b.length);
  if (a.length * b.length <= 40) out.answer.push('{' + a.flatMap((x) => b.map((y) => '(' + fmtS(x.S) + ', ' + fmtS(y.S) + ')')).join(', ') + '}');
  out.value = { q: qInt(a.length * b.length) };
  return out;
});

// ---- a term of a binomial expansion ----------------------------------------------------------------------------------------
defCmd('binomterm', (n) => {
  needArgs(n, 4, 4, 'a, b, the exponent n and the term number k (counting from 1)');
  const A = fromAst(n.args[0]);
  const B = fromAst(n.args[1]);
  const N = Number(intArg(n.args[2]));
  const K = Number(intArg(n.args[3]));
  if (N < 0 || N > 200 || K < 1 || K > N + 1) throw new MathError('the term number must be between 1 and n + 1');
  let c = 1n;
  for (let i = 0; i < K - 1; i++) c = (c * BigInt(N - i)) / BigInt(i + 1);
  const T = simp(expandS(sMul([sN(new Q(c)), sPow(A, sI(N - K + 1)), sPow(B, sI(K - 1))])));
  const out = newOut();
  out.answer.push('term ' + K + ' = ' + fmtS(T));
  out.work.push('T(k+1) = C(n, k) aⁿ⁻ᵏ bᵏ with n = ' + N + ', k = ' + (K - 1) + ': C(' + N + ', ' + (K - 1) + ') = ' + c);
  out.value = { S: T };
  return out;
});
