// ======================================================================
// 9f. Applications of calculus: tangent lines, critical points, full function analysis,
//     area between curves, volumes of revolution, arc length, Newton's method,
//     implicit differentiation, inverse functions, composition, domain.
// ======================================================================
const bpText = (b) => (b.S ? fmtS(simp(b.S)) : fmtNum(b.val));
const bpVal = (b) => b.val;
function rootS(r) {
  if (r.q) return sN(r.q);
  if (r.text) {
    try {
      return simp(fromAst(parseExpression(normalizeText(r.text))));
    } catch (e) {
      return null;
    }
  }
  return null;
}
/** Real zeros of S(x) as {S (exact when known), val}; exact for rational functions, scanned numerically on [lo, hi] otherwise. */
function realRootsOf(S, x, lo, hi) {
  let rf = null;
  try {
    rf = toRFS(expandS(S), x);
  } catch (e) {
    if (!(e instanceof NotAlgebraic)) throw e;
  }
  if (rf && rf.n.length <= 14) {
    if (rf.n.length === 1) return [];
    const pr = polyRoots(rf.n);
    const dr = rf.d.length > 1 ? polyRoots(rf.d).real.map((r) => r.val) : [];
    return pr.real.filter((r) => !dr.some((d) => Math.abs(d - r.val) < 1e-9)).map((r) => ({ S: rootS(r), val: r.val })).filter((r) => (lo === undefined || r.val >= lo - 1e-9) && (hi === undefined || r.val <= hi + 1e-9));
  }
  const a = lo === undefined ? -10 : lo;
  const b = hi === undefined ? 10 : hi;
  const f = (t) => {
    try {
      return numS(S, { [x]: t });
    } catch (e) {
      return NaN;
    }
  };
  const N = 6000;
  const xs = [];
  const ys = [];
  for (let i = 0; i <= N; i++) {
    const t = a + ((b - a) * i) / N;
    xs.push(t);
    ys.push(f(t));
  }
  const scale = Math.max(1e-12, ...ys.filter(isFinite).map(Math.abs).sort((p, q) => p - q).slice(0, Math.floor(ys.length * 0.98) || 1));
  const roots = [];
  for (let i = 0; i < N; i++) {
    const y0 = ys[i];
    const y1 = ys[i + 1];
    if (!isFinite(y0) || !isFinite(y1)) continue;
    if (y0 === 0) {
      if (i === 0 || ys[i - 1] !== 0) roots.push(xs[i]);
    } else if (y0 * y1 < 0 && Math.abs(y0) + Math.abs(y1) < scale * 4) roots.push(bisectRoot(f, xs[i], xs[i + 1]));
    if (roots.length > 120) break;
  }
  // touching zeros (even multiplicity): local extrema with |value| ~ 0
  for (let i = 1; i < N; i++) {
    if (!isFinite(ys[i - 1]) || !isFinite(ys[i]) || !isFinite(ys[i + 1])) continue;
    const m = Math.abs(ys[i]);
    if (ys[i - 1] === 0 && ys[i] === 0 && ys[i + 1] === 0) continue; // a flat stretch of zeros is not a touching zero
    if (roots.length > 120) break;
    if (m < scale * 1e-7 && m <= Math.abs(ys[i - 1]) && m <= Math.abs(ys[i + 1]) && ys[i - 1] * ys[i + 1] >= 0) {
      let l = xs[i - 1];
      let h = xs[i + 1];
      for (let it = 0; it < 60; it++) {
        const c1 = l + (h - l) / 3;
        const c2 = h - (h - l) / 3;
        if (Math.abs(f(c1)) < Math.abs(f(c2))) h = c2;
        else l = c1;
      }
      const t = (l + h) / 2;
      if (Math.abs(f(t)) < scale * 1e-9) roots.push(t);
    }
  }
  roots.sort((p, q) => p - q);
  const uniq = roots.filter((r, k) => k === 0 || Math.abs(r - roots[k - 1]) > (b - a) * 1e-7);
  return uniq.map((val) => {
    const rec = recognize(val);
    let S2 = null;
    if (rec && Math.abs(rec.val - val) < 1e-9 * Math.max(1, Math.abs(val))) {
      try {
        S2 = simp(fromAst(parseExpression(normalizeText(rec.text))));
        if (Math.abs(numS(S2, {}) - val) > 1e-9 * Math.max(1, Math.abs(val))) S2 = null;
      } catch (e) {
        S2 = null;
      }
    }
    return { S: S2, val: S2 ? numS(S2, {}) : val };
  });
}
const valueAt = (S, x, b) => {
  try {
    if (b.S) {
      let s = simp(subsS(S, x, b.S));
      try {
        s = simp(expandS(s));
      } catch (e) {
        // keep the unexpanded form
      }
      if (isFinite(numS(s, {}))) return { S: s, val: numS(s, {}) };
    }
    const v = numS(S, { [x]: b.val });
    return isFinite(v) ? { S: null, val: v } : null;
  } catch (e) {
    return null;
  }
};
const valText = (v) => (v.S ? fmtS(simp(v.S)) : fmtNum(v.val));
const pointText = (b, v) => '(' + bpText(b) + ', ' + valText(v) + ')' + (b.S && b.S.k !== 'n' ? ' ≈ (' + fmtNum(b.val) + ', ' + fmtNum(v.val) + ')' : v.S && v.S.k !== 'n' ? ' ≈ (' + fmtNum(b.val) + ', ' + fmtNum(v.val) + ')' : '');
function evalAt(S, x, t) {
  try {
    return numS(S, { [x]: t });
  } catch (e) {
    return NaN;
  }
}
/** Signs of g on the intervals between the sorted breakpoints (sampled at midpoints). */
function signIntervals(g, x, bps) {
  const vals = bps.map(bpVal);
  const pts = [-Infinity].concat(vals, [Infinity]);
  const res = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const lo = pts[i];
    const hi = pts[i + 1];
    const mid = lo === -Infinity ? (hi === Infinity ? 0 : hi - 1 - Math.abs(hi) * 0.5) : hi === Infinity ? lo + 1 + Math.abs(lo) * 0.5 : (lo + hi) / 2;
    const v = evalAt(g, x, mid);
    res.push({ lo, hi, loB: i === 0 ? null : bps[i - 1], hiB: i === pts.length - 2 ? null : bps[i], sign: v > 1e-12 ? 1 : v < -1e-12 ? -1 : 0 });
  }
  return res;
}
const ivText = (iv) => '(' + (iv.loB ? bpText(iv.loB) : '-∞') + ', ' + (iv.hiB ? bpText(iv.hiB) : '∞') + ')';
const joinIv = (ivs, sign) => {
  const list = ivs.filter((i) => i.sign === sign);
  return list.length ? list.map(ivText).join(' ∪ ') : 'none';
};
/** Merge neighbouring intervals with the same sign whose shared breakpoint is not a break of the function. */
function mergeIv(ivs, skip) {
  const out = [];
  ivs.forEach((iv) => {
    const last = out[out.length - 1];
    if (last && last.sign === iv.sign && iv.loB && !skip(iv.loB)) {
      last.hi = iv.hi;
      last.hiB = iv.hiB;
    } else out.push({ ...iv });
  });
  return out;
}
function funcArgs(n, lo, hi, usage) {
  needArgs(n, lo, hi, usage);
  const S = fromAst(n.args[0]);
  const v = n.args[1] && n.args[1].t === 'var' ? varOfArg(n.args[1]) : singleVarOf(S);
  return { S, v };
}
/** Poles of S: zeros of the denominator that are not cancelled (rational functions only). */
function polesOf(S, x) {
  try {
    const rf = toRFS(expandS(S), x);
    if (rf.d.length <= 1) return [];
    return polyRoots(rf.d).real.map((r) => ({ S: rootS(r), val: r.val }));
  } catch (e) {
    if (e instanceof NotAlgebraic) return [];
    throw e;
  }
}

// ---- tangent and normal lines -----------------------------------------------------------------------------------------------
defCmd('tangent tangentline', (n) => {
  needArgs(n, 2, 3, 'f, optionally the variable, and the point');
  const S = fromAst(n.args[0]);
  const hasVar = n.args.length === 3;
  const v = hasVar ? varOfArg(n.args[1]) : singleVarOf(S);
  const aS = geoVal(n.args[hasVar ? 2 : 1]);
  const d = diffS(S, v);
  const y0 = simp(subsS(S, v, aS));
  const m = simp(subsS(d, v, aS));
  if (!isFinite(numS(y0, {})) || !isFinite(numS(m, {}))) throw new MathError('the function or its derivative is not defined at that point');
  const out = newOut();
  const X = sV(v);
  const tl = simp(sAdd([y0, sMul([m, sSub(X, aS)])]));
  out.answer.push('tangent line: y = ' + fmtS(expandS(tl)));
  out.work.push('f(' + fmtS(aS) + ') = ' + symText(y0) + ',  f\'(' + fmtS(aS) + ') = ' + symText(m) + ',  point-slope form: y − ' + wrapNum(y0) + ' = ' + wrapNum(m) + '·(' + v + ' − ' + wrapNum(aS) + ')');
  if (zeroS(m)) out.answer.push('normal line: ' + v + ' = ' + fmtS(aS) + '  (vertical, because the tangent is horizontal)');
  else out.answer.push('normal line: y = ' + fmtS(expandS(simp(sAdd([y0, sMul([sNeg(sDiv(S1, m)), sSub(X, aS)])])))));
  out.value = { S: m };
  return out;
});

// ---- critical points, extrema and full analysis --------------------------------------------------------------------------------
function classifyCritical(f1, f2, x, b) {
  const s2 = valueAt(f2, x, b);
  if (s2 && s2.val > 1e-9) return 'local minimum';
  if (s2 && s2.val < -1e-9) return 'local maximum';
  const h = 1e-4 * Math.max(1, Math.abs(b.val));
  const l = evalAt(f1, x, b.val - h);
  const r = evalAt(f1, x, b.val + h);
  if (l < 0 && r > 0) return 'local minimum';
  if (l > 0 && r < 0) return 'local maximum';
  return 'neither a maximum nor a minimum (the slope keeps its sign)';
}
function criticalReport(S, x, lo, hi, out) {
  const f1 = diffS(S, x);
  const f2 = diffS(f1, x);
  const bounded = lo !== undefined;
  const roots = realRootsOf(f1, x, lo, hi);
  out.work.push("f'(" + x + ') = ' + fmtS(simp(f1)));
  if (!roots.length) out.answer.push('no critical points' + (bounded ? ' inside the interval' : ' (f\' = 0 has no real solution)'));
  const rows = roots.map((b) => ({ b, v: valueAt(S, x, b) })).filter((r) => r.v);
  rows.forEach(({ b, v }) => {
    out.answer.push(x + ' = ' + bpText(b) + (b.S && b.S.k !== 'n' ? ' (≈ ' + fmtNum(b.val) + ')' : '') + ':  f = ' + valText(v) + (v.S && v.S.k !== 'n' ? ' (≈ ' + fmtNum(v.val) + ')' : '') + ',  ' + classifyCritical(f1, f2, x, b));
  });
  if (bounded) {
    const ends = [lo, hi].map((t) => ({ b: { S: null, val: t }, v: valueAt(S, x, { S: sN(qFromDecimalNumber(t)), val: t }) })).filter((r) => r.v);
    const all = rows.concat(ends);
    if (all.length) {
      const mx = all.reduce((p, q) => (q.v.val > p.v.val ? q : p));
      const mn = all.reduce((p, q) => (q.v.val < p.v.val ? q : p));
      const approx = (v) => (v.S && v.S.k !== 'n' ? ' (≈ ' + fmtNum(v.val) + ')' : '');
      out.answer.push('absolute maximum on [' + fmtNum(lo) + ', ' + fmtNum(hi) + ']: f(' + bpText(mx.b) + ') = ' + valText(mx.v) + approx(mx.v));
      out.answer.push('absolute minimum on [' + fmtNum(lo) + ', ' + fmtNum(hi) + ']: f(' + bpText(mn.b) + ') = ' + valText(mn.v) + approx(mn.v));
      out.work.push('Compared f at the critical points and at the endpoints ' + fmtNum(lo) + ' and ' + fmtNum(hi));
    }
  }
  return { f1, f2, rows };
}
function qFromDecimalNumber(t) {
  const fr = toFraction(t, 1000000);
  return fr ? new Q(BigInt(fr.p), BigInt(fr.q)) : qFromLiteral(String(Math.abs(t))).mul(t < 0 ? qInt(-1) : Q1);
}
defCmd('critical criticalpoints extrema maxmin', (n) => {
  if (n.args.length >= 3 && n.args[1].t === 'var' && n.args[2].t === 'var') return multiCritical(n);
  const { S, v } = funcArgs(n, 1, 4, 'f, optionally the variable and an interval [a, b]');
  let lo;
  let hi;
  if (n.args.length === 4) {
    lo = numArg(n.args[2]);
    hi = numArg(n.args[3]);
    if (!(hi > lo)) throw new MathError('the interval must be [a, b] with a < b');
  } else if (n.args.length === 3 && n.args[1].t !== 'var') {
    lo = numArg(n.args[1]);
    hi = numArg(n.args[2]);
  }
  const out = newOut();
  out.work.push('Type: critical points of f(' + v + ') = ' + fmtS(S) + (lo === undefined ? '' : ' on [' + fmtNum(lo) + ', ' + fmtNum(hi) + ']'));
  criticalReport(S, v, lo, hi, out);
  if (lo === undefined && !varsOfS(S).has(v)) throw new MathError('the function does not contain ' + v);
  return out;
});
defCmd('inflection inflectionpoints', (n) => {
  const { S, v } = funcArgs(n, 1, 2, 'f and optionally the variable');
  const f2 = diffS(diffS(S, v), v);
  const f3 = diffS(f2, v);
  const out = newOut();
  const roots = realRootsOf(f2, v);
  out.work.push("f''(" + v + ') = ' + fmtS(simp(f2)));
  let found = 0;
  roots.forEach((b) => {
    const val = valueAt(S, v, b);
    if (!val) return;
    const h = 1e-4 * Math.max(1, Math.abs(b.val));
    const l = evalAt(f2, v, b.val - h);
    const r = evalAt(f2, v, b.val + h);
    if (l * r < 0) {
      found++;
      out.answer.push('inflection point at ' + pointText(b, val) + '  (concavity changes from ' + (l > 0 ? 'up to down' : 'down to up') + ')');
    }
  });
  if (!found) out.answer.push('no inflection points');
  return out;
});
defCmd('analyze analysis studyfunction', (n) => {
  const { S, v } = funcArgs(n, 1, 2, 'f and optionally the variable');
  const out = newOut();
  out.answer.push('f(' + v + ') = ' + fmtS(S));
  const poles = polesOf(S, v);
  let rational = true;
  try {
    toRFS(expandS(S), v);
  } catch (e) {
    rational = false;
  }
  // domain
  const dom = domainOf(S, v);
  out.answer.push('domain: ' + dom);
  // intercepts
  const y0 = valueAt(S, v, { S: S0, val: 0 });
  out.answer.push('y-intercept: ' + (y0 ? '(0, ' + valText(y0) + ')' : 'none (not defined at 0)'));
  const zeros = realRootsOf(S, v, rational ? undefined : -50, rational ? undefined : 50);
  out.answer.push('x-intercepts: ' + (zeros.length ? zeros.slice(0, 10).map((b) => '(' + bpText(b) + ', 0)').join(', ') : 'none') + (rational ? '' : '  (searched between -50 and 50)'));
  // asymptotes
  const asy = [];
  poles.forEach((b) => {
    const L = limitOf(S, v, { S: b.S || decimalS(b.val) }, -1);
    const R = limitOf(S, v, { S: b.S || decimalS(b.val) }, 1);
    asy.push('vertical: ' + v + ' = ' + bpText(b) + ' (from the left ' + limitText(L).replace(/ \(.*/, '') + ', from the right ' + limitText(R).replace(/ \(.*/, '') + ')');
  });
  ['+', '-'].forEach((sg) => {
    const r = limitOf(S, v, { inf: sg === '+' ? 1 : -1 }, 0);
    if (r.kind === 'value') asy.push('horizontal: y = ' + limitText(r).replace(/ \(.*/, '') + '  (as ' + v + ' → ' + (sg === '+' ? '∞' : '-∞') + ')');
  });
  try {
    const rf = toRFS(expandS(S), v);
    if (rf.n.length - rf.d.length === 1 && rf.d.length > 1) {
      const [q] = pdivmod(rf.n, rf.d);
      asy.push('slant: y = ' + polyText(q, v));
    }
  } catch (e) {
    // not a rational function
  }
  out.answer.push('asymptotes: ' + (asy.length ? asy.join(';  ') : 'none'));
  // critical points
  const f1 = diffS(S, v);
  const f2 = diffS(f1, v);
  const crit = realRootsOf(f1, v, rational ? undefined : -50, rational ? undefined : 50);
  const critRows = crit.map((b) => ({ b, v: valueAt(S, v, b) })).filter((r) => r.v);
  const polesNum = poles.map((p) => p);
  const ivsRaw = signIntervals(f1, v, critRows.map((r) => r.b).concat(polesNum).sort((p, q) => p.val - q.val));
  const isPole = (b) => polesNum.some((p) => Math.abs(p.val - b.val) < 1e-9);
  critRows.forEach(({ b, v: val }) => out.answer.push('critical point ' + pointText(b, val) + ': ' + classifyCritical(f1, f2, v, b)));
  if (!critRows.length) out.answer.push('critical points: none');
  const mergedInc = mergeSame(ivsRaw, 1, (b) => isPole(b));
  const mergedDec = mergeSame(ivsRaw, -1, (b) => isPole(b));
  out.answer.push('increasing on: ' + (mergedInc.length ? mergedInc.join(' ∪ ') : 'nowhere'));
  out.answer.push('decreasing on: ' + (mergedDec.length ? mergedDec.join(' ∪ ') : 'nowhere'));
  // inflection and concavity
  const infl = realRootsOf(f2, v, rational ? undefined : -50, rational ? undefined : 50);
  const inflRows = [];
  infl.forEach((b) => {
    const val = valueAt(S, v, b);
    if (!val) return;
    const h = 1e-4 * Math.max(1, Math.abs(b.val));
    if (evalAt(f2, v, b.val - h) * evalAt(f2, v, b.val + h) < 0) inflRows.push({ b, v: val });
  });
  out.answer.push('inflection points: ' + (inflRows.length ? inflRows.map((r) => pointText(r.b, r.v)).join(', ') : 'none'));
  const cBps = inflRows.map((r) => r.b).concat(polesNum).sort((p, q) => p.val - q.val);
  const cIv = signIntervals(f2, v, cBps);
  const isBreak = (b) => isPole(b);
  out.answer.push('concave up on: ' + (mergeSame(cIv, 1, isBreak).join(' ∪ ') || 'nowhere'));
  out.answer.push('concave down on: ' + (mergeSame(cIv, -1, isBreak).join(' ∪ ') || 'nowhere'));
  out.work.push("f'(" + v + ') = ' + fmtS(simp(f1)) + ";  f''(" + v + ') = ' + fmtS(simp(f2)));
  if (!rational) out.notes.push('For this kind of function zeros, extrema and inflection points were searched numerically between -50 and 50.');
  return out;
});
/** Text of the intervals with the given sign; neighbours with the same sign merge unless a break (pole) lies between them. */
function mergeSame(ivs, sign, isBreak) {
  const groups = [];
  let cur = null;
  ivs.forEach((iv) => {
    if (iv.sign === sign) {
      if (cur && iv.loB && !isBreak(iv.loB) && cur.hiB === iv.loB) {
        cur.hiB = iv.hiB;
      } else {
        cur = { loB: iv.loB, hiB: iv.hiB };
        groups.push(cur);
      }
    } else cur = null;
  });
  return groups.map((g) => '(' + (g.loB ? bpText(g.loB) : '-∞') + ', ' + (g.hiB ? bpText(g.hiB) : '∞') + ')');
}

// ---- domain -------------------------------------------------------------------------------------------------------------------------
/** Restrictions from denominators, even roots, logarithms and inverse trig functions. */
function domainConditions(S, x, acc) {
  const walk = (e) => {
    if (freeOf(e, x)) return;
    if (e.k === '^') {
      if (e.e.k === 'n' && e.e.q.sign() < 0 && !freeOf(e.b, x)) acc.push({ expr: e.b, op: '!=' });
      if (e.e.k === 'n' && !e.e.q.isInt() && e.e.q.d % 2n === 0n && !freeOf(e.b, x)) acc.push({ expr: e.b, op: e.e.q.sign() < 0 ? '>' : '>=' });
      if (!freeOf(e.e, x)) {
        // a^g(x): a > 0 is needed only when a is symbolic; ignored for numeric bases
      }
      walk(e.b);
      walk(e.e);
    } else if (e.k === 'f') {
      const a = e.a[0];
      if (e.fn === 'ln' && !freeOf(a, x)) acc.push({ expr: a, op: '>' });
      if ((e.fn === 'asin' || e.fn === 'acos') && !freeOf(a, x)) {
        acc.push({ expr: sSub(S1, a), op: '>=' });
        acc.push({ expr: sAdd([S1, a]), op: '>=' });
      }
      if (e.fn === 'tan' && !freeOf(a, x)) acc.push({ expr: sFn('cos', [a]), op: '!=' });
      e.a.forEach(walk);
    } else if (e.k === '+' || e.k === '*') e.a.forEach(walk);
  };
  walk(S);
  return acc;
}
function domainOf(S, x) {
  const conds = domainConditions(S, x, []);
  if (!conds.length) return 'all real numbers';
  const seen = new Set();
  const uniq = conds.filter((c) => {
    const k = c.op + '|' + key(c.expr);
    return seen.has(k) ? false : seen.add(k);
  });
  if (uniq.some((c) => c.expr.k === 'f')) return 'all real numbers except where ' + uniq.map((c) => fmtS(c.expr) + ' ' + c.op + ' 0').join(' and ') + ' fails';
  try {
    const parsed = uniq.map((c) => ({ lhs: sAst(simp(c.expr)), op: c.op, rhs: { t: 'num', q: Q0, f: 0, text: '0' } }));
    const res = solveInequalities(parsed, x);
    const line = res.answer.find((a) => /∈/.test(a));
    const text = line ? line.replace(/^.*?∈\s*/, '').replace(/\s*\(interval notation\)\s*$/, '') : res.answer.join('  ');
    return text || 'all real numbers';
  } catch (e) {
    if (e instanceof MathError) return 'where ' + uniq.map((c) => fmtS(simp(c.expr)) + ' ' + c.op + ' 0').join(' and ');
    throw e;
  }
}
defCmd('domain', (n) => {
  const { S, v } = funcArgs(n, 1, 2, 'f and optionally the variable');
  const out = newOut();
  out.answer.push('domain: ' + domainOf(S, v));
  out.work.push('Conditions: denominators ≠ 0, even roots ≥ 0, logarithms > 0, arcsin/arccos arguments in [-1, 1]');
  return out;
});

// ---- integrals as applications ----------------------------------------------------------------------------------------------------
/** ∫ S dv from lo to hi (S objects, or {inf}); {S} when exact, {num} otherwise. */
function integralValue(S, v, lo, hi) {
  const a = boundNum(lo);
  const b = boundNum(hi);
  const num = integrateNumeric(S, v, a, b);
  if (num.diverges) return { diverges: true };
  const F = antiderivative(S, v);
  let exact = null;
  if (F) {
    try {
      const top = endValue(F, v, hi, -1);
      const bot = endValue(F, v, lo, 1);
      if (top && bot) exact = simp(sSub(top, bot));
    } catch (e) {
      exact = null;
    }
    if (exact) {
      const ev = numS(exact, {});
      if (!isFinite(ev) || (num.ok && Math.abs(ev - num.value) > 1e-6 * (1 + Math.abs(num.value)))) exact = null;
    }
  }
  if (exact) return { S: exact, num: numS(exact, {}) };
  if (num.ok) return { num: num.value };
  return { failed: true };
}
function integralLine(label, r) {
  if (r.diverges) return label + ' = ∞ (the integral diverges)';
  if (r.failed) throw new MathError('the integral could not be evaluated');
  if (r.S) return label + ' = ' + symText(r.S);
  const rec = recognizeLoose(r.num);
  return label + ' = ' + (rec && !(rec.rational && !rec.text.includes('/')) ? rec.text + ' (≈ ' + fmtNum(r.num) + ')' : '≈ ' + fmtNum(r.num));
}
const bnd = (node) => boundOf(node);
defCmd('areabetween area_between', (n) => {
  needArgs(n, 3, 5, 'f, g, the variable and optionally the limits a, b');
  const f = fromAst(n.args[0]);
  const g = fromAst(n.args[1]);
  const v = varOfArg(n.args[2]);
  const out = newOut();
  let breakpoints;
  if (n.args.length === 5) breakpoints = [{ S: geoVal(n.args[3]) }, { S: geoVal(n.args[4]) }].map((b) => ({ S: b.S, val: numS(b.S, {}) }));
  else {
    const roots = realRootsOf(sSub(f, g), v);
    if (roots.length < 2) throw new MathError('the two curves meet at fewer than two points; give the limits: areabetween(f, g, ' + v + ', a, b)');
    breakpoints = roots;
    out.work.push('The curves meet at ' + v + ' = ' + roots.map(bpText).join(', '));
  }
  const diff = sSub(f, g);
  // split the interval at every crossing so that |f − g| can be integrated piece by piece
  const lo = breakpoints[0].val;
  const hi = breakpoints[breakpoints.length - 1].val;
  const inner = realRootsOf(diff, v, lo, hi).filter((b) => b.val > lo + 1e-9 && b.val < hi - 1e-9);
  const cuts = [breakpoints[0]].concat(breakpoints.length > 2 && n.args.length < 5 ? breakpoints.slice(1, -1) : inner, [breakpoints[breakpoints.length - 1]]).sort((p, q) => p.val - q.val).filter((b, k, arr) => k === 0 || Math.abs(b.val - arr[k - 1].val) > 1e-9);
  let total = S0;
  let totalNum = 0;
  let exact = true;
  for (let i = 0; i < cuts.length - 1; i++) {
    const mid = (cuts[i].val + cuts[i + 1].val) / 2;
    const sgn = evalAt(diff, v, mid) >= 0 ? 1 : -1;
    const piece = integralValue(sgn > 0 ? diff : sNeg(diff), v, { S: cuts[i].S || decimalS(cuts[i].val) }, { S: cuts[i + 1].S || decimalS(cuts[i + 1].val) });
    if (piece.diverges || piece.failed) throw new MathError('the area could not be computed');
    totalNum += piece.num;
    if (piece.S && exact) total = sAdd([total, piece.S]);
    else exact = false;
    out.work.push('On [' + bpText(cuts[i]) + ', ' + bpText(cuts[i + 1]) + '] the ' + (sgn > 0 ? 'first' : 'second') + ' curve is on top');
  }
  out.answer.push(integralLine('area', exact ? { S: simp(total), num: totalNum } : { num: totalNum }));
  out.work.push('Area = ∫ |f − g| dx between the meeting points');
  out.value = exact ? { S: simp(total) } : { num: totalNum };
  return out;
});
function revolveCmd(label, build) {
  return (n) => {
    const out = newOut();
    const r = build(n, out);
    out.answer.push(integralLine(label, r));
    if (r.S) out.value = { S: r.S };
    else if (r.num !== undefined) out.value = { num: r.num };
    return out;
  };
}
defCmd('volumerev volumeofrevolution', revolveCmd('volume', (n, out) => {
  needArgs(n, 4, 5, 'f, the variable, a, b (about the x-axis), or f, g, the variable, a, b for a washer');
  const washer = n.args.length === 5;
  const f = fromAst(n.args[0]);
  const g = washer ? fromAst(n.args[1]) : S0;
  const v = varOfArg(n.args[washer ? 2 : 1]);
  const a = bnd(n.args[washer ? 3 : 2]);
  const b = bnd(n.args[washer ? 4 : 3]);
  const body = washer ? sSub(sq(f), sq(g)) : sq(f);
  out.work.push('V = π ∫ ' + (washer ? '(f² − g²)' : 'f²') + ' d' + v + ' from ' + intLimitsText(a, b) + '   (disk/washer method, rotating about the x-axis)');
  const r = integralValue(body, v, a, b);
  return r.S ? { S: simp(sMul([S_PI, r.S])), num: Math.PI * r.num } : r.num !== undefined ? { num: Math.PI * r.num } : r;
}));
defCmd('shells shellmethod', revolveCmd('volume', (n, out) => {
  needArgs(n, 4, 4, 'f, the variable, a, b (rotating about the y-axis)');
  const f = fromAst(n.args[0]);
  const v = varOfArg(n.args[1]);
  const a = bnd(n.args[2]);
  const b = bnd(n.args[3]);
  out.work.push('V = 2π ∫ x·f(x) dx from ' + intLimitsText(a, b) + '   (cylindrical shells, rotating about the y-axis)');
  const r = integralValue(sMul([sV(v), f]), v, a, b);
  return r.S ? { S: simp(sMul([sI(2), S_PI, r.S])), num: 2 * Math.PI * r.num } : r.num !== undefined ? { num: 2 * Math.PI * r.num } : r;
}));
defCmd('arclength', revolveCmd('arc length', (n, out) => {
  needArgs(n, 4, 4, 'f, the variable, a, b');
  const f = fromAst(n.args[0]);
  const v = varOfArg(n.args[1]);
  const a = bnd(n.args[2]);
  const b = bnd(n.args[3]);
  const d = diffS(f, v);
  out.work.push('L = ∫ √(1 + f\'(' + v + ')²) d' + v + ' from ' + intLimitsText(a, b) + ',  f\' = ' + fmtS(simp(d)));
  return integralValue(sSqrt(sAdd([S1, sq(d)])), v, a, b);
}));
defCmd('surfacearearev surfaceofrevolution', revolveCmd('surface area', (n, out) => {
  needArgs(n, 4, 4, 'f, the variable, a, b (rotating about the x-axis)');
  const f = fromAst(n.args[0]);
  const v = varOfArg(n.args[1]);
  const a = bnd(n.args[2]);
  const b = bnd(n.args[3]);
  const d = diffS(f, v);
  out.work.push('S = 2π ∫ f·√(1 + f\'²) d' + v + ' from ' + intLimitsText(a, b));
  const r = integralValue(sMul([f, sSqrt(sAdd([S1, sq(d)]))]), v, a, b);
  return r.S ? { S: simp(sMul([sI(2), S_PI, r.S])), num: 2 * Math.PI * r.num } : r.num !== undefined ? { num: 2 * Math.PI * r.num } : r;
}));
defCmd('avgvalue averagevalue meanvalue', (n) => {
  needArgs(n, 4, 4, 'f, the variable, a, b');
  const f = fromAst(n.args[0]);
  const v = varOfArg(n.args[1]);
  const a = bnd(n.args[2]);
  const b = bnd(n.args[3]);
  if (a.inf || b.inf) throw new MathError('the interval must be finite');
  const r = integralValue(f, v, a, b);
  if (r.diverges || r.failed) throw new MathError('the integral could not be evaluated');
  const width = simp(sSub(b.S, a.S));
  const out = newOut();
  const avg = r.S ? simp(sDiv(r.S, width)) : null;
  out.answer.push('average value = ' + (avg ? symText(avg) : '≈ ' + fmtNum(r.num / numS(width, {}))));
  out.work.push('f_avg = (1/(b − a)) ∫ f dx = (1/' + fmtS(width) + ')·' + (r.S ? wrapNum(r.S) : fmtNum(r.num)));
  out.value = avg ? { S: avg } : { num: r.num / numS(width, {}) };
  return out;
});

// ---- Newton's method ------------------------------------------------------------------------------------------------------------------
defCmd('newton newtonmethod', (n) => {
  needArgs(n, 3, 5, 'f, the variable, a starting value and optionally the number of steps');
  const S = fromAst(n.args[0]);
  const v = varOfArg(n.args[1]);
  let x = numArg(n.args[2]);
  const steps = n.args[3] ? Math.min(30, Number(intArg(n.args[3]))) : 8;
  const d = diffS(S, v);
  const out = newOut();
  const rows = ['n    x_n               f(x_n)'];
  let converged = false;
  for (let k = 0; k <= steps; k++) {
    const fx = evalAt(S, v, x);
    rows.push(String(k).padEnd(5) + fmtNum(x).padEnd(18) + fmtNum(fx));
    if (Math.abs(fx) < 1e-13) {
      converged = true;
      break;
    }
    const dx = evalAt(d, v, x);
    if (!isFinite(dx) || dx === 0) throw new MathError('the derivative is 0 or undefined at ' + fmtNum(x) + '; choose another starting value');
    const nx = x - fx / dx;
    if (!isFinite(nx)) throw new MathError('the iteration left the domain of f');
    x = nx;
  }
  out.answer.push('x ≈ ' + fmtNum(x) + (converged ? '  (converged)' : '  (after ' + steps + ' steps)'));
  rows.forEach((r) => out.work.push(r));
  out.work.push('x_(n+1) = x_n − f(x_n)/f\'(x_n),  f\' = ' + fmtS(simp(d)));
  out.value = { num: x };
  return out;
});

// ---- implicit differentiation, inverse functions, composition ---------------------------------------------------------------------------
defCmd('implicit implicitdiff', (n) => {
  needArgs(n, 1, 4, 'F(x, y) (meaning F = 0) or F and G for F = G');
  const two = n.args.length >= 2 && n.args[1].t !== 'var';
  const F = two ? sSub(fromAst(n.args[0]), fromAst(n.args[1])) : fromAst(n.args[0]);
  const names = n.args.slice(two ? 2 : 1).filter((a) => a.t === 'var').map((a) => a.name);
  const xN = names[0] || 'x';
  const yN = names[1] || 'y';
  if (!varsOfS(F).has(yN)) throw new MathError('the equation does not contain ' + yN);
  const Fx = diffS(F, xN);
  const Fy = diffS(F, yN);
  const y1 = simp(sDiv(sNeg(Fx), Fy));
  const out = newOut();
  out.answer.push('d' + yN + '/d' + xN + ' = ' + fmtS(y1));
  out.work.push('Differentiated both sides with respect to ' + xN + ' (y depends on ' + xN + '):  d' + yN + '/d' + xN + ' = −F_' + xN + ' / F_' + yN + ' = −(' + fmtS(simp(Fx)) + ')/(' + fmtS(simp(Fy)) + ')');
  try {
    const total = simp(sAdd([diffS(y1, xN), sMul([diffS(y1, yN), y1])]));
    const t = fmtS(total);
    if (t.length < 160) out.answer.push('d²' + yN + '/d' + xN + '² = ' + t + '   (y\' replaced by the expression above; the original equation can simplify it further)');
  } catch (e) {
    // second derivative is optional
  }
  out.value = { S: y1 };
  return out;
});
defCmd('inversefunction finverse inverse_function', (n) => {
  const { S, v } = funcArgs(n, 1, 2, 'f and optionally the variable');
  const Y = sV('$y');
  let sols = isolateVar(S, Y, v, 0);
  if (!sols) sols = polynomialSolutions(S, Y, v);
  if (!sols) throw new MathError('I could not solve y = ' + fmtS(S) + ' for ' + v);
  const out = newOut();
  const rename = (e) => simp(subsS(e, '$y', sV(v)));
  const uniq = [];
  sols.forEach((s) => {
    const r = rename(simp(s));
    if (!uniq.some((u) => key(u) === key(r))) uniq.push(r);
  });
  uniq.forEach((r) => out.answer.push('f⁻¹(' + v + ') = ' + fmtS(r)));
  if (uniq.length > 1) out.notes.push('The function is not one-to-one, so there are several branches; restrict the domain to choose one.');
  out.work.push('Swap: y = ' + fmtS(S) + ' and solve for ' + v + ', then rename y as ' + v);
  return out;
});
defCmd('compose composition', (n) => {
  needArgs(n, 2, 3, 'f, g and optionally the variable');
  const f = fromAst(n.args[0]);
  const g = fromAst(n.args[1]);
  const v = n.args[2] ? varOfArg(n.args[2]) : singleVarOf(sAdd([f, g]));
  const out = newOut();
  const fg = simp(subsS(f, v, g));
  const gf = simp(subsS(g, v, f));
  out.answer.push('(f∘g)(' + v + ') = f(g(' + v + ')) = ' + fmtS(expandS(fg)));
  out.answer.push('(g∘f)(' + v + ') = g(f(' + v + ')) = ' + fmtS(expandS(gf)));
  return out;
});
