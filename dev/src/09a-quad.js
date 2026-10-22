
// ======================================================================
// 9a. Numerical integration (tanh-sinh), used for definite integrals and as a cross-check
// ======================================================================

/** Integral of f over [a, b] (finite) with tanh-sinh quadrature. Returns {value, error, ok}. */
function tanhSinh(f, a, b) {
  const c = (a + b) / 2;
  const h = (b - a) / 2;
  const T = 3.6;
  const pt = (t) => {
    const u = (Math.PI / 2) * Math.sinh(t);
    const d = (h * 2) / (Math.exp(2 * Math.abs(u)) + 1); // distance to the nearest endpoint
    const x = t >= 0 ? b - d : a + d;
    const w = (h * (Math.PI / 2) * Math.cosh(t)) / (Math.cosh(u) * Math.cosh(u));
    return { x, w };
  };
  const term = (t) => {
    const { x, w } = pt(t);
    if (!(x > a && x < b)) return 0;
    const v = f(x);
    return isFinite(v) ? v * w : 0;
  };
  let step = 1;
  let sum = term(0);
  for (let t = step; t <= T; t += step) sum += term(t) + term(-t);
  let est = sum * step;
  let err = Infinity;
  for (let level = 1; level <= 9; level++) {
    step /= 2;
    let add = 0;
    for (let t = step; t <= T; t += 2 * step) add += term(t) + term(-t);
    sum += add;
    const next = sum * step;
    err = Math.abs(next - est);
    est = next;
    if (err <= 1e-13 * Math.max(1, Math.abs(est)) && level >= 3) return { value: est, error: err, ok: true };
  }
  return { value: est, error: err, ok: err <= 1e-8 * Math.max(1, Math.abs(est)) };
}

/** Points inside (a,b) where an abs() argument changes sign (kinks of the integrand). */
function kinkPoints(S, x, a, b) {
  const pts = [];
  const walk = (e) => {
    if (e.k === 'f' && e.fn === 'abs') {
      const g = (t) => numS(e.a[0], { [x]: t });
      const N = 400;
      let prev = g(a);
      for (let i = 1; i <= N; i++) {
        const t = a + ((b - a) * i) / N;
        const cur = g(t);
        if (isFinite(prev) && isFinite(cur) && prev !== 0 && (prev < 0) !== (cur < 0)) {
          let lo = t - (b - a) / N;
          let hi = t;
          for (let k = 0; k < 80; k++) {
            const m = (lo + hi) / 2;
            if ((g(m) < 0) === (g(lo) < 0)) lo = m;
            else hi = m;
          }
          pts.push((lo + hi) / 2);
        }
        prev = cur;
      }
    }
    if (e.k === '+' || e.k === '*' || e.k === 'f') e.a.forEach(walk);
    else if (e.k === '^') {
      walk(e.b);
      walk(e.e);
    }
  };
  walk(S);
  return pts.sort((p, q) => p - q);
}

/** Does |f| blow up like d^-p (p >= 1) when approaching a finite endpoint? */
function endpointDiverges(f, a, b) {
  const probe = (e, dir) => {
    const v = [1e-3, 1e-6, 1e-9].map((d) => Math.abs(f(e + dir * d)));
    if (!v.every(isFinite)) return false;
    if (!(v[2] > v[1] && v[1] > v[0] && v[2] > 1e3)) return false;
    return Math.log(v[2] / v[1]) / Math.log(1000) >= 0.97;
  };
  return probe(a, 1) || probe(b, -1);
}

/**
 * Definite integral of S over [a, b] (a, b may be +-Infinity). Returns
 * { value, ok, diverges, inconclusive, note }.
 */
function integrateNumeric(S, x, a, b) {
  const f = (t) => numS(S, { [x]: t });
  if (a === b) return { value: 0, ok: true };
  if (a > b) {
    const r = integrateNumeric(S, x, b, a);
    return { ...r, value: -r.value };
  }
  const infinite = !isFinite(a) || !isFinite(b);
  // kinks (abs): split there, also on infinite ranges
  const winLo = isFinite(a) ? a : Math.min(-200, isFinite(b) ? b - 200 : -200);
  const winHi = isFinite(b) ? b : Math.max(200, isFinite(a) ? a + 200 : 200);
  const ks = kinkPoints(S, x, winLo, winHi).filter((t) => t > a && t < b);
  if (infinite && ks.length) {
    const cuts = [a].concat(ks, [b]);
    let total = 0;
    let ok = true;
    for (let i = 0; i + 1 < cuts.length; i++) {
      const r = integrateNumeric(S, x, cuts[i], cuts[i + 1]);
      if (r.diverges) return r;
      total += r.value;
      ok = ok && r.ok;
    }
    return { value: total, ok, inconclusive: !ok };
  }
  if (infinite) {
    let g;
    let lo;
    let hi;
    if (isFinite(a)) {
      g = (t) => f(a + t / (1 - t)) / ((1 - t) * (1 - t));
      lo = 0;
      hi = 1;
    } else if (isFinite(b)) {
      g = (t) => f(b - t / (1 - t)) / ((1 - t) * (1 - t));
      lo = 0;
      hi = 1;
    } else {
      g = (t) => (f(t / (1 - t * t)) * (1 + t * t)) / ((1 - t * t) * (1 - t * t));
      lo = -1;
      hi = 1;
    }
    const r = tanhSinh(g, lo, hi);
    if (r.ok && isFinite(r.value)) return { value: r.value, ok: true };
    // not converged: is it growing (divergent) or just slowly convergent?
    // A numerical "diverges" is only claimed when the integrand clearly decays more slowly than 1/x (x^(-1/2), constant, growing); slowly
    // convergent tails such as x^(-11/10) or ln(x)^3 x^(-11/10) cannot be told from divergent ones numerically, and the exact
    // antiderivative decides those.
    let grows = false;
    const slope = (sgn, x0) => {
      const f1 = f(sgn * x0);
      const f2 = f(sgn * x0 * 10);
      if ((f1 === Infinity && f2 === Infinity) || (isFinite(f1) && f1 > 0 && f2 === Infinity)) return -1e9; // overflow: grows exponentially
      if (!isFinite(f1) || !isFinite(f2) || f1 === 0 || f2 === 0 || f1 * f2 < 0) return NaN;
      return -(Math.log(Math.abs(f2)) - Math.log(Math.abs(f1))) / Math.LN10;
    };
    const tails = [];
    if (isFinite(a)) tails.push([1, Math.max(1, Math.abs(a))]);
    else if (isFinite(b)) tails.push([-1, Math.max(1, Math.abs(b))]);
    else tails.push([1, 1], [-1, 1]);
    tails.forEach(([sgn, base]) => {
      const sl = [1e5, 1e6, 1e7].map((m) => slope(sgn, base * m));
      if (sl.every((v) => isFinite(v) && v <= 0.7)) grows = true;
    });
    return { value: r.value, ok: false, diverges: grows, inconclusive: !grows, note: grows ? 'the integral grows without bound' : 'the numerical method converged too slowly' };
  }
  if (endpointDiverges(f, a, b)) return { value: Infinity, ok: false, diverges: true, note: 'the integrand is not integrable at an endpoint' };
  // singular points strictly inside (a,b): poles or non-finite samples
  const N = 1200;
  const bad = [];
  const vals = [];
  for (let i = 0; i <= N; i++) vals.push(f(a + ((b - a) * i) / N));
  const med = vals.filter(isFinite).map(Math.abs).sort((p, q) => p - q)[Math.floor(vals.length / 2)] || 1;
  for (let i = 1; i < N; i++) {
    const v = vals[i];
    const nb = (Math.abs(vals[i - 1]) + Math.abs(vals[i + 1])) / 2;
    if (!isFinite(v) || (Math.abs(v) > 1e6 * Math.max(1, med) && Math.abs(v) > 20 * nb && Math.abs(v) > 1e6)) bad.push(a + ((b - a) * i) / N);
  }
  // poles that fall between sample points: a sign change that ends in a huge value (not in zero), or a sharp spike whose peak is huge
  const xAt = (i) => a + ((b - a) * i) / N;
  let brackets = 0;
  for (let i = 0; i < N && brackets < 300; i++) {
    const v0 = vals[i];
    const v1 = vals[i + 1];
    if (!isFinite(v0) || !isFinite(v1) || v0 * v1 >= 0) continue;
    brackets++;
    let l = xAt(i);
    let h = xAt(i + 1);
    const sl = Math.sign(v0);
    for (let it = 0; it < 70; it++) {
      const m = (l + h) / 2;
      const fm = f(m);
      if (!isFinite(fm)) break;
      if (Math.sign(fm) === sl) l = m;
      else h = m;
    }
    const peak = Math.max(Math.abs(f(l)), Math.abs(f(h)));
    if (peak > 1e8 * Math.max(1, med)) bad.push((l + h) / 2);
  }
  for (let i = 1; i < N; i++) {
    const v = Math.abs(vals[i]);
    if (!isFinite(v) || v < 8 * Math.max(1, med) || v < Math.abs(vals[i - 1]) || v < Math.abs(vals[i + 1]) || v < 3 * Math.min(Math.abs(vals[i - 1]), Math.abs(vals[i + 1]))) continue;
    let l = xAt(i - 1);
    let h = xAt(i + 1);
    for (let it = 0; it < 80; it++) {
      const m1 = l + (h - l) / 3;
      const m2 = h - (h - l) / 3;
      if (Math.abs(f(m1)) < Math.abs(f(m2))) l = m1;
      else h = m2;
    }
    if (Math.abs(f((l + h) / 2)) > 1e8 * Math.max(1, med)) bad.push((l + h) / 2);
  }
  bad.sort((p, q) => p - q);
  if (bad.length) {
    // one probe per cluster of suspicious points: how fast does |f| grow when we approach it?
    const clusters = bad.filter((t, i) => i === 0 || t - bad[i - 1] > (b - a) / 200);
    for (const x0 of clusters) {
      const probe = (d) => Math.max(Math.abs(f(x0 + d)), Math.abs(f(x0 - d)));
      const p1 = probe(1e-4);
      const p2 = probe(1e-7);
      const p = Math.log(p2 / p1) / Math.log(1000);
      if (isFinite(p) && p >= 0.95) return { value: Infinity, ok: false, diverges: true, note: 'the integrand has a non-integrable singularity near ' + fmtNum(x0) };
    }
    const x0 = bad[Math.floor(bad.length / 2)];
    const cuts = [a].concat(bad.filter((t, i) => i === 0 || t - bad[i - 1] > (b - a) / 50), [b]);
    let total = 0;
    let ok = true;
    for (let i = 0; i + 1 < cuts.length; i++) {
      const r = tanhSinh(f, cuts[i], cuts[i + 1]);
      total += r.value;
      ok = ok && r.ok;
    }
    return { value: total, ok, note: 'the integrand is unbounded near ' + fmtNum(x0) + ' but the integral converges' };
  }
  const cuts = [a].concat(ks, [b]);
  let total = 0;
  let ok = true;
  let err = 0;
  for (let i = 0; i + 1 < cuts.length; i++) {
    if (cuts[i + 1] - cuts[i] < 1e-12) continue;
    const r = tanhSinh(f, cuts[i], cuts[i + 1]);
    total += r.value;
    err += r.error;
    ok = ok && r.ok;
  }
  return { value: total, ok: ok && isFinite(total), error: err };
}
