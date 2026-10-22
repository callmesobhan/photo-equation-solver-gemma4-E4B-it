// ======================================================================
// 26. Convergence of series (term test, geometric, ratio, root, comparison with p-series, integral test, bounded factors, alternating
//     series) and the radius / interval of convergence of power series.  The tests are evaluated in log scale (so n!, n^n and 2^n
//     cause no overflow) at very large n; a verdict is only given when the numbers are stable and clearly on one side.
// ======================================================================
const SER_NS = [100, 1000, 10000, 100000];
/** { l: log|e|, s: sign } of an expression at env, or null when it is undefined. */
function serLog(e, env) {
  switch (e.k) {
    case 'n': {
      const v = e.q.toNumber();
      return v === 0 ? { l: -Infinity, s: 0 } : { l: Math.log(Math.abs(v)), s: v < 0 ? -1 : 1 };
    }
    case 'v': {
      const v = env[e.name];
      if (v === undefined) return null;
      return v === 0 ? { l: -Infinity, s: 0 } : { l: Math.log(Math.abs(v)), s: v < 0 ? -1 : 1 };
    }
    case 'c': {
      const v = e.name === 'pi' ? Math.PI : e.name === 'e' ? Math.E : NaN;
      return isNaN(v) ? null : { l: Math.log(v), s: 1 };
    }
    case '*': {
      let l = 0;
      let s = 1;
      for (const t of e.a) {
        const r = serLog(t, env);
        if (!r) return null;
        if (r.s === 0) return { l: -Infinity, s: 0 };
        l += r.l;
        s *= r.s;
      }
      return { l, s };
    }
    case '+': {
      const parts = [];
      for (const t of e.a) {
        const r = serLog(t, env);
        if (!r) return null;
        parts.push(r);
      }
      const live = parts.filter((p) => p.s !== 0);
      if (!live.length) return { l: -Infinity, s: 0 };
      const m = Math.max(...live.map((p) => p.l));
      if (!isFinite(m)) return null;
      const sum = live.reduce((acc, p) => acc + p.s * Math.exp(p.l - m), 0);
      if (sum === 0) return { l: -Infinity, s: 0 };
      return { l: m + Math.log(Math.abs(sum)), s: sum < 0 ? -1 : 1 };
    }
    case '^': {
      const b = serLog(e.b, env);
      const x = serLog(e.e, env);
      if (!b || !x) return null;
      const ex = x.s === 0 ? 0 : x.s * Math.exp(x.l);
      if (!isFinite(ex)) return null;
      if (b.s === 0) return ex > 0 ? { l: -Infinity, s: 0 } : null;
      let s = 1;
      if (b.s < 0) {
        if (Math.abs(ex - Math.round(ex)) > 1e-9 * Math.max(1, Math.abs(ex))) return null;
        s = Math.round(ex) % 2 === 0 ? 1 : -1;
      }
      return { l: ex * b.l, s };
    }
    default: {
      if (e.fn === 'fact') {
        const r = serLog(e.a[0], env);
        if (!r || r.s < 0) return null;
        return { l: r.s === 0 ? 0 : lgamma(Math.exp(r.l) + 1), s: 1 };
      }
      const args = [];
      for (const t of e.a) {
        const r = serLog(t, env);
        if (!r) return null;
        args.push(r.s === 0 ? 0 : r.s * Math.exp(r.l));
      }
      let v;
      try {
        v = callNum(e.fn, args);
      } catch (err) {
        return null;
      }
      if (!isFinite(v)) return null;
      return v === 0 ? { l: -Infinity, s: 0 } : { l: Math.log(Math.abs(v)), s: v < 0 ? -1 : 1 };
    }
  }
}
const serTerm = (S, k) => (n) => serLog(S, { [k]: n });
const serFmt = (x) => fmtNum(Number(x.toPrecision(6)));
/** Simplest fraction p/q (q <= maxDen) within a relative tolerance of x, or null. */
function serFraction(x, maxDen, tol) {
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
    if (Math.abs(v - h1 / k1) <= tol * Math.max(1, v)) return { p: sgn * h1, q: k1 };
    const f = b - a;
    if (f < 1e-14) break;
    b = 1 / f;
  }
  return null;
}
/** Text for a limit value: exact when it is a simple rational or a rational multiple of e, π, ... (from the decimal expansion). */
function serNice(v) {
  if (Math.abs(v - Math.round(v)) < 2e-4 * Math.max(1, Math.abs(v))) return String(Math.round(v));
  const tryRec = (x, wrap) => {
    const r = recognizeLoose(x);
    return r && r.text && Math.abs(r.value === undefined ? x : x - (r.value || x)) < 1 ? wrap(r.text) : null;
  };
  void tryRec;
  const cands = [[v, (s) => s], [v * Math.E, (s) => (s === '1' ? '1/e' : s + '/e')], [v / Math.E, (s) => (s === '1' ? 'e' : s + 'e')], [v * Math.E * Math.E, (s) => (s === '1' ? '1/e²' : s + '/e²')], [v * Math.PI, (s) => (s === '1' ? '1/π' : s + '/π')], [v / Math.PI, (s) => (s === '1' ? 'π' : s + 'π')]];
  for (const [x, wrap] of cands) {
    const fr = serFraction(x, 40, 5e-5);
    if (fr && fr.p !== 0) {
      const frText = fr.q === 1 ? String(fr.p) : fr.p + '/' + fr.q;
      return wrap(frText) + (wrap(frText) === frText ? '' : ' (≈ ' + serFmt(v) + ')');
    }
  }
  const r = recognizeLoose(v);
  if (r && r.text) return r.text + ' (≈ ' + serFmt(v) + ')';
  return serFmt(v);
}
/** lim |a(n+1)/a(n)|: { kind: 'value' | 'zero' | 'inf' | 'unstable', rho }; windows of consecutive indices reject oscillating terms. */
function serRatio(S, k) {
  const at = (n) => {
    const x = serLog(S, { [k]: n });
    const y = serLog(S, { [k]: n + 1 });
    return x && y && x.s !== 0 && y.s !== 0 ? Math.exp(y.l - x.l) : NaN;
  };
  const win = (n0) => Array.from({ length: 12 }, (_, i) => at(n0 + i));
  const w = [1000, 10000, 100000].map(win);
  if (w.some((a) => a.some((v) => !isFinite(v)))) return { kind: 'unstable' };
  const mn = (a) => Math.min(...a);
  const mx = (a) => Math.max(...a);
  if (mx(w[2]) < 1e-3 && mx(w[2]) < mn(w[1])) return { kind: 'zero' };
  if (mn(w[2]) > 50 && mn(w[2]) > mx(w[1])) return { kind: 'inf' };
  const tight = (a) => mx(a) - mn(a) <= 2e-3 * Math.max(1, mx(a));
  if (!tight(w[0]) || !tight(w[1]) || !tight(w[2])) return { kind: 'unstable' };
  const e1 = 2 * at(2000) - at(1000);
  const e2 = 2 * at(20000) - at(10000);
  if (Math.abs(e2 - e1) <= 2e-3 * Math.max(1, Math.abs(e2))) return { kind: 'value', rho: e2 };
  return { kind: 'unstable' };
}
/** lim |a(n)|^(1/n) */
function serRoot(S, k) {
  const at = (n) => {
    const x = serLog(S, { [k]: n });
    return x && x.s !== 0 ? Math.exp(x.l / n) : NaN;
  };
  const win = (n0) => Array.from({ length: 10 }, (_, i) => at(n0 + i));
  const w = [100000, 1000000].map(win);
  if (w.some((a) => a.some((v) => !isFinite(v)))) return { kind: 'unstable' };
  const spread = (a) => Math.max(...a) - Math.min(...a);
  const r = w[1][0];
  if (spread(w[0]) > 2e-3 * Math.max(1, r) || spread(w[1]) > 2e-3 * Math.max(1, r)) return { kind: 'unstable' };
  if (r < 1e-3) return { kind: 'zero' };
  if (r > 50) return { kind: 'inf' };
  if (Math.abs(r - w[0][0]) <= 2e-3 * Math.max(1, r)) return { kind: 'value', rho: r };
  return { kind: 'unstable' };
}
/** Direction of sign changes of the terms: 'pos', 'neg', 'alt' (regularly alternating) or 'mixed'. */
function serSigns(S, k, a) {
  const f = serTerm(S, k);
  const ss = [];
  for (let n = a; n < a + 60; n++) {
    const r = f(n);
    if (!r) return { kind: 'undefined', at: n };
    ss.push(r.s);
  }
  for (let n = 1000; n < 1060; n++) {
    const r = f(n);
    if (!r) return { kind: 'undefined', at: n };
    ss.push(r.s);
  }
  const tail = ss.slice(60);
  if (tail.every((s) => s > 0)) return { kind: 'pos' };
  if (tail.every((s) => s < 0)) return { kind: 'neg' };
  if (tail.every((s, i) => i === 0 || s * tail[i - 1] < 0)) return { kind: 'alt' };
  return { kind: 'mixed' };
}
/** The tests on |a_n|; returns { v: 'conv' | 'div' | 'unknown', lines } (absolute convergence). */
function serAbsTests(S, k, a, depth) {
  const f = serTerm(S, k);
  const lines = [];
  const L = (n) => {
    const r = f(n);
    return r ? r.l : NaN;
  };
  // 1. terms must tend to 0
  const top = (n0) => Math.max(...Array.from({ length: 50 }, (_, i) => L(n0 + i)).filter((v) => !isNaN(v)));
  const m5 = top(100000);
  const m6 = top(1000000);
  if (isFinite(m5) && isFinite(m6) && m6 > Math.log(1e-3) && m6 - m5 > -0.015) {
    lines.push('Term test: |a(n)| does not tend to 0 (|a(n)| reaches ≈ ' + serFmt(Math.exp(m6)) + ' for n near 10⁶)');
    return { v: 'div', lines, test: 'term test' };
  }
  lines.push('Term test: a(n) → 0 (passes, but this alone proves nothing)');
  // 2. geometric: constant ratio
  try {
    const ratio = simp(sDiv(subsS(S, k, sAdd([sV(k), S1])), S));
    if (!varsOfS(ratio).has(k)) {
      const rv = Math.abs(numS(ratio, {}));
      lines.push('Geometric series with ratio r = ' + fmtS(ratio) + ': ' + (rv < 1 ? '|r| < 1, converges' : '|r| ≥ 1, diverges'));
      return { v: rv < 1 ? 'conv' : 'div', lines, test: 'geometric series', ratio };
    }
  } catch (e) {
    if (!(e instanceof MathError) && !(e instanceof NotAlgebraic)) throw e;
  }
  // 3. ratio test
  const rr = serRatio(S, k);
  if (rr.kind === 'value') {
    if (rr.rho < 0.995) {
      lines.push('Ratio test: lim |a(n+1)/a(n)| = ' + serNice(rr.rho) + ' < 1, so the series converges absolutely');
      return { v: 'conv', lines, test: 'ratio test' };
    }
    if (rr.rho > 1.005) {
      lines.push('Ratio test: lim |a(n+1)/a(n)| = ' + serNice(rr.rho) + ' > 1, so the series diverges');
      return { v: 'div', lines, test: 'ratio test' };
    }
    lines.push('Ratio test: lim |a(n+1)/a(n)| = 1 (inconclusive)');
  } else if (rr.kind === 'inf') {
    lines.push('Ratio test: |a(n+1)/a(n)| grows without bound (> 1), so the series diverges');
    return { v: 'div', lines, test: 'ratio test' };
  } else if (rr.kind === 'zero') {
    lines.push('Ratio test: |a(n+1)/a(n)| → 0 < 1, so the series converges absolutely');
    return { v: 'conv', lines, test: 'ratio test' };
  } else lines.push('Ratio test: the ratios do not settle down (inconclusive)');
  // 4. root test
  const rt = serRoot(S, k);
  if (rt.kind === 'value') {
    if (rt.rho < 0.995 || rt.rho > 1.005) {
      lines.push('Root test: lim |a(n)|^(1/n) = ' + serNice(rt.rho) + (rt.rho < 1 ? ' < 1, so the series converges absolutely' : ' > 1, so the series diverges'));
      return { v: rt.rho < 1 ? 'conv' : 'div', lines, test: 'root test' };
    }
    lines.push('Root test: lim |a(n)|^(1/n) = 1 (inconclusive)');
  } else if (rt.kind === 'zero') {
    lines.push('Root test: |a(n)|^(1/n) → 0 < 1, so the series converges absolutely');
    return { v: 'conv', lines, test: 'root test' };
  } else if (rt.kind === 'inf') {
    lines.push('Root test: |a(n)|^(1/n) grows without bound (> 1), so the series diverges');
    return { v: 'div', lines, test: 'root test' };
  }
  // 5. limit comparison with a p-series: |a(n)| ~ c / n^p
  const pAt = (n) => -(L(2 * n) - L(n)) / Math.LN2;
  const pHat = [1000, 10000, 100000, 1000000].map(pAt);
  const pWin = [pAt(1000000), pAt(1000001), pAt(1000002), pAt(1000003)];
  if (Math.max(...pWin) - Math.min(...pWin) > 1e-3) pHat.push(NaN);
  if (pHat.every(isFinite) && Math.max(...pHat) - Math.min(...pHat.slice(1)) < 6e-3 && Math.abs(pHat[3] - pHat[2]) < 2e-3) {
    const p = pHat[3];
    const near = Math.round(p * 12) / 12;
    if (Math.abs(p - near) < 4e-3) {
      const c = Math.exp(L(1000000) + near * Math.log(1000000));
      const cOld = Math.exp(L(100000) + near * Math.log(100000));
      if (Math.abs(c - cOld) <= 5e-3 * c) {
        const pText = Number.isInteger(near) ? String(near) : serNice(near);
        lines.push('Limit comparison with the p-series Σ 1/n^p, p = ' + pText + ': |a(n)|·n^p → ' + serNice(c) + ' (a positive finite number), and ' + (near > 1 ? 'p > 1, so the series converges absolutely' : 'p ≤ 1, so the series diverges'));
        return { v: near > 1 ? 'conv' : 'div', lines, test: 'comparison with a p-series', p: near };
      }
    }
  }
  // 6. comparison with bounded factors:  |sin n|, |cos n|, arctan n, ... times something simpler
  if (depth < 2 && S.k === '*') {
    const bounded = (t) => (t.k === 'f' && ['sin', 'cos', 'atan'].includes(t.fn)) || (t.k === '^' && t.e.k === 'n' && t.e.q.isInt() && t.e.q.sign() > 0 && t.b.k === 'f' && ['sin', 'cos', 'atan'].includes(t.b.fn));
    const keep = S.a.filter((t) => !bounded(t));
    if (keep.length && keep.length < S.a.length) {
      const sub = serAbsTests(simp(sMul(keep)), k, a, depth + 1);
      if (sub.v === 'conv') {
        lines.push('The factor ' + fmtS(sMul(S.a.filter(bounded))) + ' is bounded, and Σ ' + fmtS(simp(sMul(keep))) + ' converges absolutely (' + sub.test + '), so by direct comparison this series converges absolutely');
        return { v: 'conv', lines, test: 'direct comparison', };
      }
      lines.push('The factor ' + fmtS(sMul(S.a.filter(bounded))) + ' is bounded, but the comparison series Σ ' + fmtS(simp(sMul(keep))) + ' does not converge, so this gives no conclusion');
    }
  }
  // 7. integral test (positive, eventually decreasing terms)
  const positive = serSigns(S, k, a).kind === 'pos';
  const dec = (() => {
    for (let n = 1000; n < 1050; n++) if (!(L(n + 1) <= L(n) + 1e-12)) return false;
    return true;
  })();
  if (positive && dec && depth < 3) {
    try {
      const res = ser2Integral(S, k, Math.max(a, 2));
      if (res) {
        lines.push('Integral test: ∫ from ' + Math.max(a, 2) + ' to ∞ of ' + fmtS(S).replace(new RegExp('\\b' + k + '\\b', 'g'), 'x') + ' dx ' + (res.conv ? 'converges' : 'diverges') + ', so the series ' + (res.conv ? 'converges absolutely' : 'diverges'));
        return { v: res.conv ? 'conv' : 'div', lines, test: 'integral test' };
      }
    } catch (e) {
      if (!(e instanceof MathError) && !(e instanceof NotAlgebraic)) throw e;
    }
    // a(n) >= c/n with c > 0: compare with the harmonic series
    if ([1000, 10000, 100000, 1000000].every((n) => isFinite(L(n)) && L(n) + Math.log(n) >= -0.01) && L(1000000) + Math.log(1000000) >= L(1000) + Math.log(1000) - 0.01) {
      lines.push('n·a(n) stays above 1 (a(n) ≥ 1/n), so by comparison with the harmonic series Σ 1/n the series diverges');
      return { v: 'div', lines, test: 'comparison with the harmonic series' };
    }
  }
  return { v: 'unknown', lines, test: null };
}
/** Improper integral of the term (as a function of x) from lo to infinity: { conv } or null when the integrator cannot decide. */
function ser2Integral(S, k, lo) {
  const g = subsS(S, k, sV('$x'));
  const text = 'integrate(' + fmtS(g, true).replace(/\$x/g, 'x') + ', x, ' + lo + ', oo)';
  let out;
  try {
    out = evalCommandNode(parseExpression(text));
  } catch (e) {
    if (e instanceof MathError) return null;
    throw e;
  }
  const ans = out.answer.join(' ');
  if (/diverges/.test(ans)) return { conv: false };
  if (/does not exist|could not/.test(ans)) return null;
  return { conv: true };
}
/** Full analysis of sum_{k >= a} S: { verdict, absolute, lines } */
function serAnalyze(S, k, a) {
  const sg = serSigns(S, k, a);
  if (sg.kind === 'undefined') throw new MathError('the term is undefined at ' + k + ' = ' + sg.at + ' (check where the series starts)');
  const absRes = serAbsTests(S, k, a, 0);
  const lines = absRes.lines.slice();
  if (absRes.v === 'conv') return { verdict: 'converges', absolute: true, lines, test: absRes.test, ratio: absRes.ratio };
  if (absRes.v === 'div' && /Term test/.test(absRes.lines[absRes.lines.length - 1])) return { verdict: 'diverges', absolute: null, lines, test: absRes.test };
  if (sg.kind === 'alt') {
    // alternating series test: |a(n)| decreasing to 0
    const f = serTerm(S, k);
    let dec = true;
    for (const n0 of [50, 500, 5000]) for (let n = n0; n < n0 + 50; n++) if (!(f(n + 1).l < f(n).l)) dec = false;
    if (dec) {
      lines.push('Alternating series test: the terms alternate in sign, |a(n)| decreases and tends to 0, so the series converges' + (absRes.v === 'div' ? ', but Σ|a(n)| diverges, so only conditionally' : ''));
      return { verdict: 'converges', absolute: false, lines, test: 'alternating series test' };
    }
    lines.push('Alternating series test: |a(n)| is not decreasing, so the test does not apply');
  }
  if (absRes.v === 'div') {
    if (sg.kind === 'pos' || sg.kind === 'neg') return { verdict: 'diverges', absolute: null, lines, test: absRes.test };
    lines.push('(the terms change sign, so Σ|a(n)| diverging does not prove that the series diverges)');
    return { verdict: 'unknown', absolute: null, lines, test: null };
  }
  return { verdict: 'unknown', absolute: null, lines, test: null };
}
function serBodyAndIndex(n, what) {
  const S = fromAst(n.args[0]);
  const k = n.args[1] && n.args[1].t === 'var' ? n.args[1].name : singleVarOf(S, 'n');
  const rest = n.args.slice(n.args[1] && n.args[1].t === 'var' ? 2 : 1);
  const aQ = rest[0] ? constQ(rest[0]) : Q1;
  if (!aQ.isInt()) throw new MathError('the series must start at a whole number');
  void what;
  return { S, k, a: Number(aQ.n) };
}
defCmd('convergence converge seriestest', (n) => {
  needArgs(n, 1, 3, 'the general term, the index and optionally the first index, e.g. convergence(n^2/2^n, n, 1)');
  const { S, k, a } = serBodyAndIndex(n, 'convergence');
  const extra = Array.from(varsOfS(S)).filter((v) => v !== k);
  if (extra.length) throw new MathError('the term contains other letters (' + extra.join(', ') + '); for a power series use radius(term, n, x)');
  const res = serAnalyze(S, k, a);
  const out = newOut();
  out.work.push('Series Σ ' + fmtS(S) + ' for ' + k + ' ≥ ' + a);
  res.lines.forEach((l) => out.work.push(l));
  if (res.verdict === 'converges') out.answer.push(res.absolute ? 'converges absolutely' : 'converges conditionally (the series of absolute values diverges)');
  else if (res.verdict === 'diverges') out.answer.push('diverges');
  else out.answer.push('the standard tests (term, geometric, ratio, root, comparison, integral, alternating) do not decide this series');
  if (res.verdict === 'converges') {
    // an exact sum when the sum engine knows one, else a numeric value
    try {
      const o2 = evalCommandNode(parseExpression('sum(' + fmtS(S, true) + ', ' + k + ', ' + a + ', oo)'));
      if (o2.answer.length && !/diverges|could not|error/.test(o2.answer[0])) out.work.push('sum = ' + o2.answer[0]);
    } catch (e) {
      if (!(e instanceof MathError) && !(e instanceof NotAlgebraic)) throw e;
    }
  }
  out.value = { text: out.answer[0] };
  return out;
});
COMMANDS.convergence.show = (n) => 'does Σ ' + showRaw(n.args[0]) + ' converge?';

// ---- power series: radius and interval of convergence -----------------------------------------------------------------------------------
/** Factors of the term that are powers with a base containing x and an exponent that is linear in k: [{ base, m }] and the rest. */
function serSplitPower(S, k, x) {
  const factors = S.k === '*' ? S.a : [S];
  const pw = [];
  const rest = [];
  factors.forEach((t) => {
    if (t.k === '^' && varsOfS(t.b).has(x) && !varsOfS(t.b).has(k) && varsOfS(t.e).has(k) && !varsOfS(t.e).has(x)) pw.push(t);
    else if (varsOfS(t).has(x)) pw.push(null);
    else rest.push(t);
  });
  if (pw.includes(null)) return null;
  return { pw, rest };
}
defCmd('radius radiusofconvergence intervalofconvergence', (n) => {
  needArgs(n, 3, 4, 'the general term of the power series, the index and the variable, e.g. radius((x-2)^n/(n*3^n), n, x)');
  const S = fromAst(n.args[0]);
  const k = varOfArg(n.args[1]);
  const x = varOfArg(n.args[2]);
  const a = n.args[3] ? Number(intArg(n.args[3])) : 0;
  const parts = serSplitPower(S, k, x);
  if (!parts || !parts.pw.length) throw new MathError('write the term as (coefficient) × (linear in ' + x + ')^' + k + ', e.g. (x-2)^n/(n*3^n) or n!*x^n');
  // all the x-dependent factors must have the same base up to the exponent: base^(m k + s)
  const base = parts.pw[0].b;
  let m = 0;
  for (const t of parts.pw) {
    if (!sameFunction(t.b, base, [x], 3)) {
      // the same base up to a power: treat each as base_i ^ (m_i k) with the first base as reference through the ratio of logs
      throw new MathError('the power series has several different bases in ' + x + '; only one base (x − c) or (a·x + b) is supported');
    }
    const slope = simp(sSub(subsS(t.e, k, sI(1)), subsS(t.e, k, sI(0))));
    if (slope.k !== 'n') throw new MathError('the exponent of the power of ' + x + ' must be linear in ' + k);
    m += slope.q.toNumber();
  }
  if (m === 0) throw new MathError('the power of ' + x + ' does not grow with ' + k);
  // base = alpha x + beta
  const b0 = simp(subsS(base, x, S0));
  const b1 = simp(sSub(subsS(base, x, S1), b0));
  const b2 = simp(subsS(base, x, sI(2)));
  if (b0.k !== 'n' || b1.k !== 'n' || !simp(sSub(b2, sAdd([b0, sMul([b1, sI(2)])]))).k === 'n' || !simp(sSub(b2, sAdd([b0, sMul([b1, sI(2)])]))).q.isZero()) throw new MathError('the base of the power must be linear in ' + x + ', like (2x - 1)');
  const alpha = b1.q;
  const beta = b0.q;
  if (alpha.isZero()) throw new MathError('the base does not depend on ' + x);
  const centre = beta.neg().div(alpha);
  // coefficient part: everything without x, with the base powers removed
  const c = simp(sMul(parts.rest));
  const out = newOut();
  out.work.push('Power series Σ ' + fmtS(S) + ' (n ≥ ' + a + '):  ratio test on the coefficients ' + fmtS(c) + ' and the factor |' + fmtS(base) + '|' + (Math.abs(m) === 1 ? '' : '^' + fmtNum(Math.abs(m))));
  // rho0 = lim |c(n+1)/c(n)|; fall back to the root test
  let rho;
  const rr = serRatio(c, k);
  if (rr.kind === 'value') rho = rr.rho;
  else if (rr.kind === 'zero') rho = 0;
  else if (rr.kind === 'inf') rho = Infinity;
  else {
    const rt = serRoot(c, k);
    if (rt.kind === 'value') rho = rt.rho;
    else if (rt.kind === 'zero') rho = 0;
    else if (rt.kind === 'inf') rho = Infinity;
    else throw new MathError('I could not determine the limit of the coefficient ratios for this power series');
  }
  if (rho === 0) {
    out.answer.push('radius of convergence R = ∞: converges for every ' + x);
    out.work.push('the ratio |c(n+1)/c(n)| tends to 0');
    out.value = { text: 'R = infinity' };
    return out;
  }
  if (rho === Infinity) {
    out.answer.push('radius of convergence R = 0: converges only at ' + x + ' = ' + centre.toString());
    out.work.push('the ratio |c(n+1)/c(n)| grows without bound');
    out.value = { text: 'R = 0' };
    return out;
  }
  const Rb = Math.pow(1 / rho, 1 / Math.abs(m));
  const alphaAbs = Math.abs(alpha.toNumber());
  const R = Rb / alphaAbs;
  out.work.push('lim |c(n+1)/c(n)| = ' + serNice(rho) + (Math.abs(m) === 1 ? '' : '; the base is raised to the power ' + fmtNum(Math.abs(m)) + ' per step') + ', so the series converges where |' + fmtS(base) + '| < ' + serNice(Rb));
  // exact radius from an exact limit: R = (1/rho)^(1/|m|) / |alpha|
  const frho = serFraction(rho, 40, 1e-4);
  let Rs = null;
  let Rtext;
  if (frho && frho.p > 0 && Number.isInteger(m)) {
    Rs = simp(sDiv(sPow(sN(new Q(BigInt(frho.q), BigInt(frho.p))), sN(new Q(1n, BigInt(Math.abs(m))))), sN(alpha.abs())));
    Rtext = fmtS(Rs) + (/^-?\d+(\/\d+)?$/.test(fmtS(Rs)) ? '' : ' (≈ ' + serFmt(R) + ')');
  } else Rtext = serFmt(R);
  out.answer.push('radius of convergence R = ' + Rtext + ', centre ' + x + ' = ' + centre.toString());
  const ends = [centre.toNumber() - R, centre.toNumber() + R];
  const endS = Rs ? [simp(sSub(sN(centre), Rs)), simp(sAdd([sN(centre), Rs]))] : null;
  const endText = (i) => (endS ? fmtS(endS[i]) : serFmt(ends[i]));
  if (!endS) {
    out.work.push('the radius is not a simple number here, so the end points were not tested');
    out.answer.push('interval of convergence: between ' + endText(0) + ' and ' + endText(1) + ' (end points not tested)');
    out.value = { num: R };
    return out;
  }
  const verdicts = endS.map((e) => {
    const sub = simp(subsS(S, x, e));
    try {
      return serAnalyze(sub, k, Math.max(a, 1));
    } catch (err) {
      if (err instanceof MathError || err instanceof NotAlgebraic) return { verdict: 'unknown', lines: [] };
      throw err;
    }
  });
  const word = (v) => (v.verdict === 'converges' ? (v.absolute ? 'converges (absolutely)' : 'converges (conditionally)') : v.verdict === 'diverges' ? 'diverges' : 'could not be decided');
  verdicts.forEach((v, i) => out.work.push('at ' + x + ' = ' + endText(i) + ' (' + (i ? 'right' : 'left') + ' end): ' + word(v) + (v.test ? ' by the ' + v.test : '')));
  const lo = verdicts[0].verdict;
  const hi = verdicts[1].verdict;
  if (lo === 'unknown' || hi === 'unknown') out.answer.push('interval of convergence: from ' + endText(0) + ' to ' + endText(1) + ' (an end point could not be decided)');
  else out.answer.push('interval of convergence: ' + (lo === 'converges' ? '[' : '(') + endText(0) + ', ' + endText(1) + (hi === 'converges' ? ']' : ')'));
  out.value = { num: R };
  return out;
});

// ---- text pre-pass: "does the series ... converge?", "interval of convergence of ..." ---------------------------------------------------
/** Set by convertSeriesSentence when a sentence asks about a series written with a sum sign; read at the end of normalizeText. */
const SERIES_FLAG = { v: null };
const SERIES_LEAD = /^\s*(?:please\s+)?(?:for\s+(?:what|which)\s+(?:values\s+of\s+)?x\s+(?:does|do|is|are|will)\s+(?:the\s+)?(?:series\s*)?)?(?:(?:determine|decide|find|test|check|state|say|show|tell\s+me)\s+)?(?:(?:whether|if|out)\s+)?(?:the\s+)?(?:(?:radius|interval)\s+of\s+convergence\s+(?:of|for)\s+|(?:absolute\s+|conditional\s+)?convergence\s+of\s+|(?:does|do|is|are|will)\s+(?:the\s+)?)?(?:infinite\s+)?(?:power\s+)?(?:series\s*)?:?\s*/i;
const SERIES_TAIL = /\s*,?\s*(?:(?:and\s+)?(?:does\s+it\s+|is\s+it\s+|do\s+they\s+)?(?:absolutely\s+|conditionally\s+)?(?:converges?|diverges?|convergent|divergent|converging)(?:\s+(?:or|and)\s+(?:diverges?|converges?|not|divergent|convergent|absolutely|conditionally))*(?:\s+(?:absolutely|conditionally))?|for\s+(?:what|which)\s+(?:values\s+of\s+)?x(?:\s+does\s+it\s+converge)?)\s*[?.!]*\s*$/i;
/** Called at the end of normalizeText (the text is lower case, sums are written sum(term, k, a, oo)). */
function convertConvergenceWords(s) {
  const kind = SERIES_FLAG.v;
  SERIES_FLAG.v = null;
  if (!kind) return s;
  const m = /\bsum\s*\(/.exec(s);
  if (!m) return s;
  const open = m.index + m[0].length - 1;
  const close = matchBracket(s, open, '(', ')');
  if (close < 0) return s;
  const parts = g3SplitArgs(s.slice(open + 1, close)).map((p) => p.trim());
  if (parts.length !== 4 || !/^\+?\s*oo$/.test(parts[3])) return s;
  const letters = (parts[0].match(/\b[a-z]\b/g) || []).filter((c) => c !== parts[1] && c !== 'e');
  if (letters.length === 1 && (kind === 'radius' || letters[0] === 'x')) return 'radius(' + parts[0] + ', ' + parts[1] + ', ' + letters[0] + ', ' + parts[2] + ')';
  if (letters.length) return s;
  return 'convergence(' + parts[0] + ', ' + parts[1] + ', ' + parts[2] + ')';
}
/** "does the series 1/n^2 converge?", "Σ_(n=1)^∞ n/(n^2+1) converges or diverges", "interval of convergence of Σ ...": sentences about series. */
function convertSeriesSentence(s) {
  if (!/converg|diverg|for\s+(?:what|which)\s+(?:values\s+of\s+)?x\b/i.test(s)) return s;
  const kind = /(?:radius|interval)\s+of\s+converg|for\s+what\s+values|for\s+which\s+x|values\s+of\s+x/i.test(s) ? 'radius' : 'conv';
  if (/[∑Σ]|\\sum|\bsum\s*\(/.test(s)) {
    // keep the sum itself, drop the words around it; the sum is turned into convergence(...) / radius(...) at the end of normalizeText
    const stripped = s.replace(SERIES_TAIL, '').replace(SERIES_LEAD, '').trim();
    if (!stripped) return s;
    SERIES_FLAG.v = kind;
    return stripped;
  }
  const rm = /(?:radius|interval)\s+of\s+converg\w*\s+(?:of|for)\s+(?:the\s+)?(?:power\s+)?(?:series\s+)?(?:sum\s+(?:of\s+)?)?(.+?)\s*[?.]*$/i.exec(s);
  const m = rm || /series\s*:?\s*(?:of\s+|with\s+(?:general\s+)?term\s+|whose\s+general\s+term\s+is\s+|a_?n\s*=\s*)?(.+?)\s*,?\s*(?:converges?|diverges?|is\s+(?:absolutely\s+|conditionally\s+)?(?:convergent|divergent)|(?:absolutely\s+|conditionally\s+)?convergent|divergent)\b.*$/i.exec(s);
  if (!m) return s;
  const term = m[1].replace(/^(?:the\s+)?(?:infinite\s+)?(?:series\s+)?(?:sum\s+)?(?:of\s+)?/i, '').replace(/[?.]+$/, '').trim();
  const letters0 = (term.match(/\b[a-z]\b/gi) || []).map((c) => c.toLowerCase());
  const idx = ['n', 'k', 'i', 'j', 'm'].find((c) => letters0.includes(c));
  if (!term || !idx) return s;
  const lo = rm ? '0' : '1';
  const letters = letters0.filter((c) => c !== idx && c !== 'e');
  if (letters.length === 1 && letters[0] === 'x') return 'radius(' + term + ', ' + idx + ', x, ' + lo + ')';
  if (letters.length) return s;
  return 'convergence(' + term + ', ' + idx + ', ' + lo + ')';
}
