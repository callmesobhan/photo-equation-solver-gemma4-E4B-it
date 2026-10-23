// ======================================================================
// 12. Statistics and probability
//     Data statistics are exact (rational arithmetic); the normal, t, chi-square and F
//     distributions use double-precision special functions.
// ======================================================================
const numArg = (node) => {
  const v = evalNum(node, {});
  if (typeof v !== 'number' || isNaN(v)) throw new MathError('a number is needed here');
  return v;
};
const qText = (q) => (q.isInt() ? q.toString() : q.toString() + ' (' + approxSym(q.toNumber()) + ' ' + fmtNum(q.toNumber()) + ')');
function symText(S) {
  const t = fmtS(S);
  const ev = varsOfS(S).size ? NaN : numS(S, {});
  return /^-?\d+$/.test(t) || !isFinite(ev) ? t : t + ' (' + approxSym(ev) + ' ' + fmtNum(ev) + ')';
}
function sqrtQText(q) {
  if (q.sign() < 0) throw new MathError('negative value under a square root');
  return symText(simp(sSqrt(sN(q))));
}
const qSqrtS = (q) => simp(sSqrt(sN(q)));
const needFinite = (x) => {
  if (typeof x === 'number' && !isFinite(x)) throw new MathError('the result is undefined for these inputs (check the numbers)');
  return x;
};
const numOut = (out, x, label) => {
  needFinite(x);
  out.answer.push((label ? label + ' = ' : '') + fmtNum(x));
  out.value = { num: x };
  return out;
};

// ---- special functions ---------------------------------------------------------------------------------------------------
const LANCZOS = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
function lgamma(x) {
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
  x -= 1;
  let a = LANCZOS[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += LANCZOS[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
function erfPos(x) {
  // erf(x) for 0 <= x < 3 by the all-positive series, stable at both ends
  let term = x;
  let sum = x;
  for (let n = 1; n < 200; n++) {
    term *= (2 * x * x) / (2 * n + 1);
    sum += term;
    if (term < 1e-17 * sum) break;
  }
  return (2 / Math.sqrt(Math.PI)) * Math.exp(-x * x) * sum;
}
function erfcPos(x) {
  if (x < 2.5) return 1 - erfPos(x);
  let f = x;
  for (let k = 80; k >= 1; k--) f = x + k / 2 / f;
  return Math.exp(-x * x) / Math.sqrt(Math.PI) / f;
}
function erfc(x) {
  return x >= 0 ? erfcPos(x) : 2 - erfcPos(-x);
}
const normCdf = (z) => 0.5 * erfc(-z / Math.SQRT2);
const normPdf = (z) => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
function betacf(a, b, x) {
  const FP = 1e-300;
  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < FP) d = FP;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 500; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FP) d = FP;
    c = 1 + aa / c;
    if (Math.abs(c) < FP) c = FP;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d;
    if (Math.abs(d) < FP) d = FP;
    c = 1 + aa / c;
    if (Math.abs(c) < FP) c = FP;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  return h;
}
/** Regularised incomplete beta function I_x(a, b). */
function ibeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b;
}
/** Regularised lower incomplete gamma function P(a, x). */
function igammaP(a, x) {
  if (x <= 0) return 0;
  if (x < a + 1) {
    let ap = a;
    let del = 1 / a;
    let sum = del;
    for (let n = 0; n < 1000; n++) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-16) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - lgamma(a));
  }
  const FP = 1e-300;
  let b = x + 1 - a;
  let c = 1 / FP;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 1000; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < FP) d = FP;
    c = b + an / c;
    if (Math.abs(c) < FP) c = FP;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
}
const tCdf = (t, df) => {
  const p = 0.5 * ibeta(df / (df + t * t), df / 2, 0.5);
  return t > 0 ? 1 - p : p;
};
const chi2Cdf = (x, df) => igammaP(df / 2, x / 2);
const fCdf = (f, d1, d2) => (f <= 0 ? 0 : ibeta((d1 * f) / (d1 * f + d2), d1 / 2, d2 / 2));
/** Inverse of an increasing cdf by bracketing and bisection. */
function invCdf(cdf, p, lo, hi) {
  if (!(p > 0 && p < 1)) throw new MathError('the probability must be strictly between 0 and 1');
  let a = lo;
  let b = hi;
  for (let i = 0; i < 400 && cdf(b) < p; i++) b = b * 2 + 1;
  for (let i = 0; i < 400 && cdf(a) > p; i++) a = a * 2 - 1;
  for (let i = 0; i < 200; i++) {
    const m = (a + b) / 2;
    if (cdf(m) < p) a = m;
    else b = m;
  }
  return (a + b) / 2;
}
const invNorm = (p) => invCdf(normCdf, p, -2, 2);

// ---- data statistics -------------------------------------------------------------------------------------------------------
function dataOf(args, what) {
  const items = args.length === 1 && args[0].t === 'list' ? args[0].items : args;
  if (!items.length) throw new MathError(what + ' needs some numbers, e.g. ' + what + '(2, 4, 4, 5)');
  if (items.some((it) => it.t === 'list')) throw new MathError(what + ' needs one list of numbers');
  return items.map(constQ);
}
const sortQ = (vs) => vs.slice().sort((a, b) => a.sub(b).sign());
const sumQ = (vs) => vs.reduce((s, v) => s.add(v), Q0);
function medianQ(sorted) {
  const n = sorted.length;
  return n % 2 ? sorted[(n - 1) / 2] : sorted[n / 2 - 1].add(sorted[n / 2]).div(qInt(2));
}
/** Quartiles by the median-of-halves method used in most textbooks. */
function quartiles(sorted) {
  const n = sorted.length;
  const half = Math.floor(n / 2);
  const lower = sorted.slice(0, half);
  const upper = sorted.slice(n % 2 ? half + 1 : half);
  return { q1: lower.length ? medianQ(lower) : sorted[0], q2: medianQ(sorted), q3: upper.length ? medianQ(upper) : sorted[n - 1] };
}
function sampleVar(vs, pop) {
  const n = vs.length;
  const dof = pop ? n : n - 1;
  if (dof < 1) throw new MathError('a sample variance needs at least 2 numbers');
  const m = sumQ(vs).div(qInt(n));
  return sumQ(vs.map((v) => v.sub(m).mul(v.sub(m)))).div(qInt(dof));
}
function modesOf(vs) {
  const counts = new Map();
  vs.forEach((v) => counts.set(v.toString(), (counts.get(v.toString()) || 0) + 1));
  const top = Math.max(...counts.values());
  return { top, modes: sortQ(vs.filter((v, i) => vs.findIndex((w) => w.eq(v)) === i && counts.get(v.toString()) === top)) };
}
const qvOut = (out, q) => {
  out.answer.push(qText(q));
  out.value = { q };
  return out;
};
defCmd('mean average avg', (n) => {
  const vs = dataOf(n.args, 'mean');
  const out = newOut();
  out.work.push('Sum = ' + sumQ(vs).toString() + ' over ' + vs.length + ' values');
  return qvOut(out, sumQ(vs).div(qInt(vs.length)));
});
defCmd('median', (n) => {
  const vs = sortQ(dataOf(n.args, 'median'));
  const out = newOut();
  out.work.push('Sorted: ' + vs.map((v) => v.toString()).join(', '));
  return qvOut(out, medianQ(vs));
});
defCmd('mode', (n) => {
  const vs = dataOf(n.args, 'mode');
  const { top, modes } = modesOf(vs);
  const out = newOut();
  if (top === 1 && vs.length > 1) {
    out.answer.push('no mode (every value occurs once)');
    return out;
  }
  out.answer.push(modes.map((m) => m.toString()).join(', ') + (modes.length > 1 ? '  (bimodal/multimodal)' : ''));
  out.work.push('Occurs ' + top + ' times');
  if (modes.length === 1) out.value = { q: modes[0] };
  return out;
});
defCmd('variance var', (n) => {
  const vs = dataOf(n.args, 'variance');
  const out = newOut();
  out.work.push('Sample variance: Σ(x − mean)² / (n − 1) with n = ' + vs.length + '  (use popvariance for the whole population)');
  return qvOut(out, sampleVar(vs, false));
});
defCmd('popvariance pvar', (n) => {
  const vs = dataOf(n.args, 'popvariance');
  const out = newOut();
  out.work.push('Population variance: Σ(x − mean)² / n with n = ' + vs.length);
  return qvOut(out, sampleVar(vs, true));
});
function sdCmd(pop) {
  return (n) => {
    const vs = dataOf(n.args, 'stdev');
    const v = sampleVar(vs, pop);
    const out = newOut();
    out.work.push((pop ? 'Population' : 'Sample') + ' standard deviation = √variance;  variance = ' + v.toString() + ',  mean = ' + sumQ(vs).div(qInt(vs.length)).toString());
    out.work.push(pop ? '(for a sample use stdev)' : '(for the whole population use popstdev)');
    const S = qSqrtS(v);
    out.answer.push(symText(S));
    out.value = { S };
    return out;
  };
}
defCmd('stdev std sd samplestdev', sdCmd(false));
defCmd('popstdev pstdev psd', sdCmd(true));
defCmd('datarange spread', (n) => {
  const vs = sortQ(dataOf(n.args, 'range'));
  return qvOut(newOut(), vs[vs.length - 1].sub(vs[0]));
});
defCmd('quartiles quartile', (n) => {
  const vs = sortQ(dataOf(n.args, 'quartiles'));
  if (vs.length < 2) throw new MathError('quartiles need at least 2 numbers');
  const { q1, q2, q3 } = quartiles(vs);
  const out = newOut();
  out.answer.push('Q1 = ' + q1.toString() + ',  median = ' + q2.toString() + ',  Q3 = ' + q3.toString() + ',  IQR = ' + q3.sub(q1).toString());
  out.work.push('Median-of-halves method (the median is left out of both halves when n is odd)');
  return out;
});
defCmd('iqr', (n) => {
  const vs = sortQ(dataOf(n.args, 'iqr'));
  const { q1, q3 } = quartiles(vs);
  return qvOut(newOut(), q3.sub(q1));
});
defCmd('percentile', (n) => {
  if (n.args.length !== 2 || n.args[0].t !== 'list') throw new MathError('percentile needs a list and a percentage, e.g. percentile([1, 2, 3, 4], 90)');
  const vs = sortQ(dataOf([n.args[0]], 'percentile'));
  const p = constQ(n.args[1]);
  if (p.sign() < 0 || p.sub(qInt(100)).sign() > 0) throw new MathError('the percentage must be between 0 and 100');
  const pos = p.div(qInt(100)).mul(qInt(vs.length - 1));
  const lo = Number(floorQ(pos).n);
  const frac = pos.sub(qInt(lo));
  const val = lo + 1 < vs.length ? vs[lo].add(vs[lo + 1].sub(vs[lo]).mul(frac)) : vs[lo];
  const out = newOut();
  out.work.push('Linear interpolation between the closest ranks (position ' + pos.toString() + ' counting from 0)');
  return qvOut(out, val);
});
defCmd('summary stats describe', (n) => {
  const vs0 = dataOf(n.args, 'summary');
  const vs = sortQ(vs0);
  const N = vs.length;
  const sum = sumQ(vs);
  const mean = sum.div(qInt(N));
  const out = newOut();
  const { q1, q2, q3 } = quartiles(vs);
  const iqr = q3.sub(q1);
  const lo = q1.sub(iqr.mul(new Q(3n, 2n)));
  const hi = q3.add(iqr.mul(new Q(3n, 2n)));
  const outliers = vs.filter((v) => v.sub(lo).sign() < 0 || v.sub(hi).sign() > 0);
  const { top, modes } = modesOf(vs);
  out.answer.push('n = ' + N + ',  sum = ' + sum.toString());
  out.answer.push('mean = ' + qText(mean));
  out.answer.push('median = ' + q2.toString() + ',  mode = ' + (top === 1 && N > 1 ? 'none' : modes.map((m) => m.toString()).join(', ')));
  out.answer.push('min = ' + vs[0].toString() + ',  max = ' + vs[N - 1].toString() + ',  range = ' + vs[N - 1].sub(vs[0]).toString());
  out.answer.push('Q1 = ' + q1.toString() + ',  Q3 = ' + q3.toString() + ',  IQR = ' + iqr.toString());
  if (N > 1) {
    const sv = sampleVar(vs, false);
    out.answer.push('sample variance = ' + qText(sv) + ',  sample standard deviation = ' + sqrtQText(sv));
  }
  const pv = sampleVar(vs, true);
  out.answer.push('population variance = ' + qText(pv) + ',  population standard deviation = ' + sqrtQText(pv));
  out.answer.push('outliers (beyond 1.5·IQR from the quartiles): ' + (outliers.length ? outliers.map((v) => v.toString()).join(', ') : 'none'));
  return out;
});
defCmd('zscore', (n) => {
  needArgs(n, 3, 3, 'x, the mean and the standard deviation');
  const [x, m, s] = n.args.map(constQ);
  if (s.isZero()) throw new MathError('the standard deviation cannot be 0');
  const z = x.sub(m).div(s);
  const out = newOut();
  out.work.push('z = (x − mean) / sd = (' + x.toString() + ' − ' + m.toString() + ') / ' + s.toString());
  return qvOut(out, z);
});
function twoLists(n, what) {
  if (n.args.length < 2 || n.args[0].t !== 'list' || n.args[1].t !== 'list') throw new MathError(what + ' needs two lists, e.g. ' + what + '([1, 2, 3], [2, 4, 7])');
  const xs = dataOf([n.args[0]], what);
  const ys = dataOf([n.args[1]], what);
  if (xs.length !== ys.length) throw new MathError('the two lists must have the same length');
  if (xs.length < 2) throw new MathError('at least 2 pairs are needed');
  return { xs, ys };
}
function sums2(xs, ys) {
  const N = qInt(xs.length);
  const mx = sumQ(xs).div(N);
  const my = sumQ(ys).div(N);
  const sxx = sumQ(xs.map((x) => x.sub(mx).mul(x.sub(mx))));
  const syy = sumQ(ys.map((y) => y.sub(my).mul(y.sub(my))));
  const sxy = sumQ(xs.map((x, i) => x.sub(mx).mul(ys[i].sub(my))));
  return { mx, my, sxx, syy, sxy };
}
defCmd('correlation corr pearson', (n) => {
  const { xs, ys } = twoLists(n, 'correlation');
  const { sxx, syy, sxy } = sums2(xs, ys);
  if (sxx.isZero() || syy.isZero()) throw new MathError('one of the lists is constant, so the correlation is undefined');
  const r2 = sxy.mul(sxy).div(sxx.mul(syy));
  const out = newOut();
  const S = sxy.sign() < 0 ? sNeg(qSqrtS(r2)) : qSqrtS(r2);
  out.answer.push('r = ' + symText(S));
  out.work.push('r² = ' + qText(r2));
  out.value = { S };
  return out;
});
defCmd('covariance cov', (n) => {
  const { xs, ys } = twoLists(n, 'covariance');
  const { sxy } = sums2(xs, ys);
  const out = newOut();
  out.work.push('Sample covariance = Σ(x − x̄)(y − ȳ) / (n − 1)');
  return qvOut(out, sxy.div(qInt(xs.length - 1)));
});
defCmd('linreg regression linearregression', (n) => {
  const { xs, ys } = twoLists(n, 'linreg');
  const { mx, my, sxx, syy, sxy } = sums2(xs, ys);
  if (sxx.isZero()) throw new MathError('all the x values are equal, so there is no line of best fit');
  const b = sxy.div(sxx);
  const a = my.sub(b.mul(mx));
  const out = newOut();
  const eq = 'y = ' + (b.isZero() ? '' : (b.eq(Q1) ? '' : b.eq(qInt(-1)) ? '-' : qParen(b) + '·') + 'x') + (a.isZero() ? (b.isZero() ? '0' : '') : (b.isZero() || a.sign() < 0 ? ' ' : ' + ') + (a.sign() < 0 && !b.isZero() ? '− ' + a.neg().toString() : a.toString()));
  out.answer.push(eq);
  out.work.push('slope = Sxy/Sxx = ' + qText(b) + ',  intercept = ȳ − slope·x̄ = ' + qText(a));
  if (!syy.isZero()) {
    const r2 = sxy.mul(sxy).div(sxx.mul(syy));
    out.work.push('r = ' + (sxy.sign() < 0 ? '−' : '') + sqrtQText(r2) + ',  r² = ' + qText(r2));
  }
  if (n.args[2]) {
    const x0 = constQ(n.args[2]);
    const yh = a.add(b.mul(x0));
    out.work.push('Prediction at x = ' + x0.toString() + ': y = ' + qText(yh));
    out.value = { q: yh };
  }
  return out;
});
defCmd('expect expectedvalue', (n) => {
  if (n.args.length !== 2 || n.args[0].t !== 'list' || n.args[1].t !== 'list') throw new MathError('expect needs the values and their probabilities, e.g. expect([1, 2, 3], [1/2, 1/3, 1/6])');
  const xs = dataOf([n.args[0]], 'expect');
  const ps = dataOf([n.args[1]], 'expect');
  if (xs.length !== ps.length) throw new MathError('give one probability for each value');
  if (ps.some((p) => p.sign() < 0)) throw new MathError('probabilities cannot be negative');
  const tot = sumQ(ps);
  const out = newOut();
  if (!tot.eq(Q1)) out.notes.push('The probabilities add up to ' + tot.toString() + ', not 1.');
  const m = sumQ(xs.map((x, i) => x.mul(ps[i])));
  const ex2 = sumQ(xs.map((x, i) => x.mul(x).mul(ps[i])));
  const v = ex2.sub(m.mul(m));
  out.answer.push('E[X] = ' + qText(m));
  out.answer.push('Var(X) = ' + qText(v) + ',  SD = ' + sqrtQText(v));
  out.work.push('E[X] = Σ x·p;  Var(X) = E[X²] − E[X]² with E[X²] = ' + qText(ex2));
  out.value = { q: m };
  return out;
});
defCmd('bayes', (n) => {
  needArgs(n, 3, 3, 'P(A), P(B|A) and P(B|not A)');
  const [pa, pba, pbn] = n.args.map(constQ);
  const pb = pba.mul(pa).add(pbn.mul(Q1.sub(pa)));
  if (pb.isZero()) throw new MathError('P(B) is 0, so the conditional probability is undefined');
  const out = newOut();
  out.work.push('P(B) = P(B|A)P(A) + P(B|not A)P(not A) = ' + qText(pb));
  out.work.push('Bayes: P(A|B) = P(B|A)P(A) / P(B)');
  return qvOut(out, pba.mul(pa).div(pb));
});
function extremum(sign) {
  return (n) => {
    const items = n.args.length === 1 && n.args[0].t === 'list' ? n.args[0].items : n.args;
    if (!items.length) throw new MathError(n.fn + ' needs some numbers');
    const vals = items.map(fromAst);
    const nums = vals.map((S) => numS(S, {}));
    let best = 0;
    nums.forEach((x, i) => { if (sign * (x - nums[best]) > 0) best = i; });
    const out = newOut();
    out.answer.push(symText(vals[best]));
    out.value = { S: vals[best] };
    return out;
  };
}
defCmd('max maximum', extremum(1));
defCmd('min minimum', extremum(-1));
defCmd('round', (n) => {
  needArgs(n, 1, 2, 'a number and optionally the number of decimals');
  const S = fromAst(n.args[0]);
  const d = n.args[1] ? Number(intArg(n.args[1])) : 0;
  if (d < -15 || d > 15) throw new MathError('the number of decimals must be between -15 and 15');
  let q;
  try {
    q = S.k === 'n' ? S.q : null;
  } catch (e) {
    q = null;
  }
  const out = newOut();
  if (q) {
    const scale = qInt(10).pow(Math.abs(d));
    const scaled = d >= 0 ? q.mul(scale) : q.div(scale);
    const half = new Q(1n, 2n);
    const r = scaled.sign() >= 0 ? floorQ(scaled.add(half)) : floorQ(scaled.neg().add(half)).neg();
    const res = d >= 0 ? r.div(scale) : r.mul(scale);
    out.answer.push(d > 0 ? decimalText(res, d) : res.toString());
    out.value = { q: res };
    return out;
  }
  const x = numS(S, {});
  const f = Math.pow(10, d);
  const r = Math.sign(x) * Math.round(Math.abs(x) * f + 1e-9) / f;
  out.answer.push(d > 0 ? r.toFixed(d) : String(r));
  out.value = { num: r };
  return out;
});
function decimalText(q, d) {
  const neg = q.sign() < 0;
  const scaled = (neg ? q.neg() : q).mul(qInt(10).pow(d));
  let s = scaled.n.toString().padStart(d + 1, '0');
  s = s.slice(0, s.length - d) + '.' + s.slice(s.length - d);
  return (neg ? '-' : '') + s;
}

// ---- discrete distributions (exact) ---------------------------------------------------------------------------------------------
function probArg(node, what) {
  const p = constQ(node);
  if (p.sign() < 0 || p.sub(Q1).sign() > 0) throw new MathError(what + ': a probability must be between 0 and 1');
  return p;
}
function binomPmf(nn, p, k) {
  if (k < 0n || k > nn) return Q0;
  return new Q(binom(nn, k)).mul(p.pow(Number(k))).mul(Q1.sub(p).pow(Number(nn - k)));
}
function binomCmd(cumulative) {
  return (n) => {
    needArgs(n, 3, 4, cumulative ? 'n, p and k (or n, p, a, b for P(a ≤ X ≤ b))' : 'n, p and k');
    const nn = intArg(n.args[0]);
    if (nn < 0n || nn > 5000n) throw new MathError('n must be between 0 and 5000');
    const p = probArg(n.args[1], n.fn);
    const k = intArg(n.args[2]);
    const out = newOut();
    let res = Q0;
    let label;
    if (!cumulative) {
      res = binomPmf(nn, p, k);
      label = 'P(X = ' + k + ')';
    } else if (n.args[3]) {
      const k2 = intArg(n.args[3]);
      for (let i = k < 0n ? 0n : k; i <= (k2 > nn ? nn : k2); i++) res = res.add(binomPmf(nn, p, i));
      label = 'P(' + k + ' ≤ X ≤ ' + k2 + ')';
    } else {
      for (let i = 0n; i <= (k > nn ? nn : k); i++) res = res.add(binomPmf(nn, p, i));
      label = 'P(X ≤ ' + k + ')';
    }
    out.answer.push(label + ' = ' + qText(res));
    out.work.push('X ~ Binomial(n = ' + nn + ', p = ' + p.toString() + '):  P(X = k) = C(n, k)·pᵏ·(1 − p)ⁿ⁻ᵏ');
    out.work.push('mean = n·p = ' + qText(p.mul(new Q(nn))) + ',  variance = n·p·(1 − p) = ' + qText(p.mul(Q1.sub(p)).mul(new Q(nn))));
    out.value = { q: res };
    return out;
  };
}
defCmd('binompdf binompmf binomialpdf', binomCmd(false));
defCmd('binomcdf binomialcdf', binomCmd(true));
function poissonCmd(cumulative) {
  return (n) => {
    needArgs(n, 2, 2, 'the mean λ and k');
    const lam = constQ(n.args[0]);
    const k = intArg(n.args[1]);
    if (lam.sign() <= 0) throw new MathError('λ must be positive');
    if (k < 0n || k > 3000n) throw new MathError('k must be between 0 and 3000');
    let acc = Q0;
    let term = Q1;
    for (let i = 0n; i <= k; i++) {
      if (i > 0n) term = term.mul(lam).div(new Q(i));
      if (cumulative) acc = acc.add(term);
      else if (i === k) acc = term;
    }
    const S = simp(sMul([sExp(sN(lam.neg())), sN(acc)]));
    const out = newOut();
    out.answer.push((cumulative ? 'P(X ≤ ' + k + ')' : 'P(X = ' + k + ')') + ' = ' + symText(S));
    out.work.push('X ~ Poisson(λ = ' + lam.toString() + '):  P(X = k) = e^(−λ)·λᵏ/k!');
    out.value = { S };
    return out;
  };
}
defCmd('poissonpdf poissonpmf', poissonCmd(false));
defCmd('poissoncdf', poissonCmd(true));
defCmd('geometpdf geometricpmf', (n) => {
  needArgs(n, 2, 2, 'p and k');
  const p = probArg(n.args[0], 'geometpdf');
  const k = intArg(n.args[1]);
  if (k < 1n || k > 5000n) throw new MathError('k must be at least 1');
  const res = Q1.sub(p).pow(Number(k - 1n)).mul(p);
  const out = newOut();
  out.work.push('First success on trial k: P = (1 − p)ᵏ⁻¹·p');
  out.answer.push('P(X = ' + k + ') = ' + qText(res));
  out.value = { q: res };
  return out;
});
defCmd('geometcdf geometriccdf', (n) => {
  needArgs(n, 2, 2, 'p and k');
  const p = probArg(n.args[0], 'geometcdf');
  const k = intArg(n.args[1]);
  if (k < 0n || k > 5000n) throw new MathError('k must be at least 0');
  const res = Q1.sub(Q1.sub(p).pow(Number(k)));
  const out = newOut();
  out.work.push('At least one success within k trials: 1 − (1 − p)ᵏ');
  out.answer.push('P(X ≤ ' + k + ') = ' + qText(res));
  out.value = { q: res };
  return out;
});
defCmd('hyperpdf hypergeometric', (n) => {
  needArgs(n, 4, 4, 'population N, successes K, sample size n and k');
  const [N, K, nn, k] = n.args.map(intArg);
  if (N < 0n || K > N || nn > N || N > 100000n) throw new MathError('check the numbers: need K ≤ N and n ≤ N');
  const den = binom(N, nn);
  const res = new Q(binom(K, k) * binom(N - K, nn - k)).div(new Q(den));
  const out = newOut();
  out.work.push('P = C(K, k)·C(N − K, n − k) / C(N, n)');
  out.answer.push('P(X = ' + k + ') = ' + qText(res));
  out.value = { q: res };
  return out;
});

// ---- continuous distributions (numeric) ---------------------------------------------------------------------------------------
function pOut(out, label, p) {
  needFinite(p);
  out.answer.push(label + ' = ' + fmtNum(p));
  out.value = { num: p };
  return out;
}
const fmtArg = (x) => (x === Infinity ? '∞' : x === -Infinity ? '−∞' : fmtNum(x));
defCmd('normalcdf normcdf', (n) => {
  needArgs(n, 1, 4, 'x (or a, b) and optionally the mean and standard deviation');
  const a = n.args.map(numArg);
  let lo = -Infinity;
  let hi;
  let mu = 0;
  let sg = 1;
  if (a.length === 1) hi = a[0];
  else if (a.length === 2) [lo, hi] = a;
  else if (a.length === 3) [hi, mu, sg] = a;
  else [lo, hi, mu, sg] = a;
  if (sg <= 0) throw new MathError('the standard deviation must be positive');
  const zl = (lo - mu) / sg;
  const zh = (hi - mu) / sg;
  const p = (isFinite(zh) ? normCdf(zh) : zh > 0 ? 1 : 0) - (isFinite(zl) ? normCdf(zl) : zl > 0 ? 1 : 0);
  const out = newOut();
  out.work.push('Normal(mean ' + fmtNum(mu) + ', sd ' + fmtNum(sg) + '):  z = (x − mean)/sd' + (lo === -Infinity ? ' = ' + fmtNum(zh) : ' from ' + fmtNum(zl) + ' to ' + fmtNum(zh)));
  return pOut(out, lo === -Infinity ? 'P(X ≤ ' + fmtArg(hi) + ')' : 'P(' + fmtArg(lo) + ' ≤ X ≤ ' + fmtArg(hi) + ')', p);
});
defCmd('normalpdf normpdf', (n) => {
  needArgs(n, 1, 3, 'x and optionally the mean and standard deviation');
  const [x, mu = 0, sg = 1] = n.args.map(numArg);
  if (sg <= 0) throw new MathError('the standard deviation must be positive');
  return pOut(newOut(), 'density at ' + fmtNum(x), normPdf((x - mu) / sg) / sg);
});
defCmd('invnorm invnormal quantile', (n) => {
  needArgs(n, 1, 3, 'the left-tail probability and optionally the mean and standard deviation');
  const [p, mu = 0, sg = 1] = n.args.map(numArg);
  if (sg <= 0) throw new MathError('the standard deviation must be positive');
  const out = newOut();
  out.work.push('The x with P(X ≤ x) = ' + fmtNum(p));
  return numOut(out, mu + sg * invNorm(p), 'x');
});
defCmd('zcrit', (n) => {
  needArgs(n, 1, 1, 'a confidence level such as 0.95');
  let c = numArg(n.args[0]);
  if (c > 1) c /= 100;
  const out = newOut();
  out.work.push('Two-sided critical value for ' + fmtNum(c * 100) + '% confidence: the z with P(−z ≤ Z ≤ z) = ' + fmtNum(c));
  return numOut(out, invNorm((1 + c) / 2), 'z*');
});
defCmd('tcdf', (n) => {
  needArgs(n, 2, 3, 't and the degrees of freedom (or a, b, df)');
  const a = n.args.map(numArg);
  const df = a[a.length - 1];
  if (!(df > 0)) throw new MathError('the degrees of freedom must be positive');
  const out = newOut();
  if (a.length === 3) {
    const cdf = (t) => (t === Infinity ? 1 : t === -Infinity ? 0 : tCdf(t, df));
    return pOut(out, 'P(' + fmtArg(a[0]) + ' ≤ T ≤ ' + fmtArg(a[1]) + ')', cdf(a[1]) - cdf(a[0]));
  }
  return pOut(out, 'P(T ≤ ' + fmtNum(a[0]) + ')', tCdf(a[0], df));
});
defCmd('invt', (n) => {
  needArgs(n, 2, 2, 'the left-tail probability and the degrees of freedom');
  const [p, df] = n.args.map(numArg);
  if (!(df > 0)) throw new MathError('the degrees of freedom must be positive');
  return numOut(newOut(), invCdf((t) => tCdf(t, df), p, -5, 5), 't');
});
defCmd('tcrit', (n) => {
  needArgs(n, 2, 2, 'a confidence level such as 0.95 and the degrees of freedom');
  let [c, df] = n.args.map(numArg);
  if (c > 1) c /= 100;
  const out = newOut();
  out.work.push('Two-sided critical value for ' + fmtNum(c * 100) + '% confidence with ' + fmtNum(df) + ' degrees of freedom');
  return numOut(out, invCdf((t) => tCdf(t, df), (1 + c) / 2, -5, 5), 't*');
});
defCmd('chi2cdf chisqcdf', (n) => {
  needArgs(n, 2, 2, 'x and the degrees of freedom');
  const [x, df] = n.args.map(numArg);
  if (!(df > 0)) throw new MathError('the degrees of freedom must be positive');
  return pOut(newOut(), 'P(χ² ≤ ' + fmtNum(x) + ')', chi2Cdf(x, df));
});
defCmd('invchi2 invchisq chi2crit', (n) => {
  needArgs(n, 2, 2, 'the left-tail probability and the degrees of freedom');
  const [p, df] = n.args.map(numArg);
  if (!(df > 0)) throw new MathError('the degrees of freedom must be positive');
  const out = newOut();
  out.work.push('The x with P(χ² ≤ x) = ' + fmtNum(p) + ' (for a right-tail area α use 1 − α)');
  return numOut(out, invCdf((x) => chi2Cdf(x, df), p, 0, df + 10), 'x');
});
defCmd('fcdf', (n) => {
  needArgs(n, 3, 3, 'f and the two degrees of freedom');
  const [f, d1, d2] = n.args.map(numArg);
  return pOut(newOut(), 'P(F ≤ ' + fmtNum(f) + ')', fCdf(f, d1, d2));
});
defCmd('expcdf exponentialcdf', (n) => {
  needArgs(n, 2, 2, 'the rate λ and x');
  const [lam, x] = n.args.map(numArg);
  if (!(lam > 0)) throw new MathError('λ must be positive');
  return pOut(newOut(), 'P(X ≤ ' + fmtNum(x) + ')', x <= 0 ? 0 : 1 - Math.exp(-lam * x));
});

// ---- confidence intervals and tests ------------------------------------------------------------------------------------------
function levelOf(node) {
  let c = numArg(node);
  if (c > 1) c /= 100;
  if (!(c > 0 && c < 1)) throw new MathError('the confidence level must be between 0 and 1 (e.g. 0.95)');
  return c;
}
function intervalOut(out, center, margin, crit, critLabel, level) {
  [center, margin, crit].forEach(needFinite);
  out.answer.push(fmtNum(level * 100) + '% confidence interval: (' + fmtNum(center - margin) + ', ' + fmtNum(center + margin) + ')');
  out.work.push(critLabel + ' = ' + fmtNum(crit) + ',  margin of error = ' + fmtNum(margin));
  out.work.push('Interval = estimate ± margin = ' + fmtNum(center) + ' ± ' + fmtNum(margin));
  out.value = { num: margin };
  return out;
}
/** Either (mean, s, n, ...) or ([data], ...). */
function sampleSummary(n, label) {
  if (n.args[0] && n.args[0].t === 'list') {
    const vs = dataOf([n.args[0]], label);
    if (vs.length < 2) throw new MathError('at least 2 numbers are needed');
    return { mean: sumQ(vs).div(qInt(vs.length)).toNumber(), s: Math.sqrt(sampleVar(vs, false).toNumber()), n: vs.length, rest: n.args.slice(1) };
  }
  if (n.args.length < 3) throw new MathError(label + ' needs the sample mean, the standard deviation and n');
  return { mean: numArg(n.args[0]), s: numArg(n.args[1]), n: numArg(n.args[2]), rest: n.args.slice(3) };
}
defCmd('zinterval', (n) => {
  needArgs(n, 4, 4, 'the sample mean, σ, n and the confidence level');
  const [m, sg, nn] = n.args.slice(0, 3).map(numArg);
  const c = levelOf(n.args[3]);
  const z = invNorm((1 + c) / 2);
  return intervalOut(newOut(), m, (z * sg) / Math.sqrt(nn), z, 'z*', c);
});
defCmd('tinterval', (n) => {
  const sm = sampleSummary(n, 'tinterval');
  if (!sm.rest.length) throw new MathError('tinterval also needs the confidence level, e.g. tinterval(52, 4, 25, 0.95)');
  const c = levelOf(sm.rest[0]);
  const df = sm.n - 1;
  const t = invCdf((x) => tCdf(x, df), (1 + c) / 2, -5, 5);
  const out = newOut();
  out.work.push('df = n − 1 = ' + df);
  return intervalOut(out, sm.mean, (t * sm.s) / Math.sqrt(sm.n), t, 't*', c);
});
defCmd('propinterval', (n) => {
  needArgs(n, 3, 3, 'successes x (or the proportion), n and the confidence level');
  let x = numArg(n.args[0]);
  const nn = numArg(n.args[1]);
  const c = levelOf(n.args[2]);
  const ph = x < 1 || !Number.isInteger(x) ? x : x / nn;
  const z = invNorm((1 + c) / 2);
  const out = newOut();
  out.work.push('p̂ = ' + fmtNum(ph) + ';  margin = z*·√(p̂(1 − p̂)/n)');
  return intervalOut(out, ph, z * Math.sqrt((ph * (1 - ph)) / nn), z, 'z*', c);
});
function testOut(out, stat, label, p2, pLeft, pRight, extra) {
  [stat, p2, pLeft, pRight].forEach(needFinite);
  out.answer.push(label + ' = ' + fmtNum(stat));
  out.answer.push('p-value: two-tailed ' + fmtNum(p2) + ',  left-tailed ' + fmtNum(pLeft) + ',  right-tailed ' + fmtNum(pRight));
  if (extra) out.work.push(extra);
  out.notes.push('Reject H0 when the p-value of the matching alternative is below the significance level α.');
  out.value = { num: p2 };
  return out;
}
defCmd('ztest', (n) => {
  needArgs(n, 4, 4, 'the sample mean, μ0, σ and n');
  const [m, mu0, sg, nn] = n.args.map(numArg);
  const z = (m - mu0) / (sg / Math.sqrt(nn));
  return testOut(newOut(), z, 'z', 2 * normCdf(-Math.abs(z)), normCdf(z), 1 - normCdf(z), 'z = (x̄ − μ0)/(σ/√n)');
});
defCmd('ttest', (n) => {
  const sm = sampleSummary(n, 'ttest');
  if (!sm.rest.length) {
    if (n.args[0].t === 'list') throw new MathError('ttest([data], μ0) needs the hypothesised mean');
    throw new MathError('ttest(mean, s, n, μ0) needs the hypothesised mean μ0');
  }
  const mu0 = numArg(sm.rest[0]);
  const df = sm.n - 1;
  const t = (sm.mean - mu0) / (sm.s / Math.sqrt(sm.n));
  const cdf = tCdf(t, df);
  return testOut(newOut(), t, 't', 2 * (1 - tCdf(Math.abs(t), df)), cdf, 1 - cdf, 't = (x̄ − μ0)/(s/√n),  df = ' + df + ',  x̄ = ' + fmtNum(sm.mean) + ',  s = ' + fmtNum(sm.s));
});
defCmd('proptest', (n) => {
  needArgs(n, 3, 3, 'successes x, n and the hypothesised proportion p0');
  const [x, nn, p0] = n.args.map(numArg);
  const ph = x / nn;
  const z = (ph - p0) / Math.sqrt((p0 * (1 - p0)) / nn);
  return testOut(newOut(), z, 'z', 2 * normCdf(-Math.abs(z)), normCdf(z), 1 - normCdf(z), 'p̂ = ' + fmtNum(ph) + ',  z = (p̂ − p0)/√(p0(1 − p0)/n)');
});
defCmd('chisqtest chitest', (n) => {
  needArgs(n, 1, 2, 'a table of counts, or observed and expected lists');
  const out = newOut();
  let chi = 0;
  let df;
  if (n.args[0].t === 'list' && n.args[0].items.length && n.args[0].items[0].t === 'list') {
    const T = n.args[0].items.map((r) => dataOf([r], 'chisqtest'));
    if (T.some((r) => r.length !== T[0].length)) throw new MathError('all rows of the table must have the same length');
    const rows = T.map(sumQ);
    const cols = T[0].map((_, j) => sumQ(T.map((r) => r[j])));
    const tot = sumQ(rows);
    if (rows.some((r) => !(r.sign() > 0)) || cols.some((c) => !(c.sign() > 0))) throw new MathError('every row and every column of the table needs a positive total');
    T.forEach((r, i) => r.forEach((o, j) => {
      const e = rows[i].mul(cols[j]).div(tot).toNumber();
      chi += (o.toNumber() - e) ** 2 / e;
    }));
    df = (T.length - 1) * (T[0].length - 1);
    out.work.push('Test of independence: expected = row total × column total / grand total;  df = (rows − 1)(columns − 1) = ' + df);
  } else {
    const obs = dataOf([n.args[0]], 'chisqtest');
    const tot = sumQ(obs);
    const exp = n.args[1] ? dataOf([n.args[1]], 'chisqtest') : obs.map(() => tot.div(qInt(obs.length)));
    if (exp.length !== obs.length) throw new MathError('the observed and expected lists must have the same length');
    if (exp.some((e) => !(e.sign() > 0))) throw new MathError('every expected count must be positive');
    obs.forEach((o, i) => { chi += (o.toNumber() - exp[i].toNumber()) ** 2 / exp[i].toNumber(); });
    df = obs.length - 1;
    out.work.push('Goodness of fit: χ² = Σ (O − E)² / E;  df = categories − 1 = ' + df);
  }
  const pv = 1 - chi2Cdf(chi, df);
  out.answer.push('χ² = ' + fmtNum(chi) + ',  df = ' + df);
  out.answer.push('p-value (right tail) = ' + fmtNum(pv));
  out.notes.push('Reject H0 when the p-value is below the significance level α.');
  out.value = { num: pv };
  return out;
});
