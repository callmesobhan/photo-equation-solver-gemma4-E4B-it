// ======================================================================
// 19. More statistics and probability: further distributions, two-sample / paired / ANOVA / correlation / variance tests,
//     sample sizes, sampling distributions, outliers and other descriptive measures, frequency tables, stem-and-leaf plots,
//     rank correlation, multiple and curve regression, Markov chains.
// ======================================================================
const qFloat = (q) => q.toNumber();
function listArg(node, what) {
  if (node.t !== 'list') throw new MathError(what + ' needs a list of numbers in square brackets');
  return dataOf([node], what);
}
const fmtP = (p) => fmtNum(p);

// ---- more distributions ---------------------------------------------------------------------------------------------------------------
function posArg(v, what) {
  if (!(v > 0)) throw new MathError(what + ' must be positive');
  return v;
}
const gammaPdf = (x, k, th) => (x < 0 ? 0 : x === 0 ? (k === 1 ? 1 / th : k < 1 ? Infinity : 0) : Math.exp((k - 1) * Math.log(x / th) - x / th - lgamma(k)) / th);
const betaPdf = (x, a, b) => (x < 0 || x > 1 ? 0 : Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + (a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x)));
const chi2Pdf = (x, df) => gammaPdf(x, df / 2, 2);
const tPdf = (x, df) => Math.exp(lgamma((df + 1) / 2) - lgamma(df / 2) - 0.5 * Math.log(df * Math.PI) - ((df + 1) / 2) * Math.log(1 + (x * x) / df));
const fPdf = (x, d1, d2) => (x <= 0 ? 0 : Math.exp(0.5 * (d1 * Math.log(d1 * x) + d2 * Math.log(d2) - (d1 + d2) * Math.log(d1 * x + d2)) - Math.log(x) - (lgamma(d1 / 2) + lgamma(d2 / 2) - lgamma((d1 + d2) / 2))));
function distPair(names, usage, nParams, pdf, cdf, label) {
  defCmd(names.pdf, (n) => {
    needArgs(n, 1 + nParams, 1 + nParams, usage);
    const [x, ...p] = n.args.map(numArg);
    return pOut(newOut(), label + ' density at ' + fmtNum(x), pdf(x, ...p));
  });
  if (cdf) {
    defCmd(names.cdf, (n) => {
      needArgs(n, 1 + nParams, 2 + nParams, usage + ' (a second x gives P(x1 ≤ X ≤ x2))');
      const a = n.args.map(numArg);
      if (a.length === 2 + nParams) {
        const p = a.slice(2);
        return pOut(newOut(), 'P(' + fmtNum(a[0]) + ' ≤ X ≤ ' + fmtNum(a[1]) + ')', cdf(a[1], ...p) - cdf(a[0], ...p));
      }
      return pOut(newOut(), 'P(X ≤ ' + fmtNum(a[0]) + ')', cdf(a[0], ...a.slice(1)));
    });
  }
}
distPair({ pdf: 'unifpdf uniformpdf', cdf: 'unifcdf uniformcdf' }, 'x, a, b (uniform on [a, b])', 2, (x, a, b) => (x >= a && x <= b ? 1 / (b - a) : 0), (x, a, b) => (b <= a ? NaN : x <= a ? 0 : x >= b ? 1 : (x - a) / (b - a)), 'uniform');
distPair({ pdf: 'exppdf exponentialpdf', cdf: null }, 'x and the rate λ: exppdf(x, rate)', 1, (x, lam) => (x < 0 ? 0 : posArg(lam, 'λ') * Math.exp(-lam * x)), null, 'exponential');
distPair({ pdf: 'gammapdf', cdf: 'gammacdf' }, 'x, shape k and scale θ (θ = 1/rate)', 2, (x, k, th) => gammaPdf(x, posArg(k, 'the shape'), posArg(th, 'the scale')), (x, k, th) => igammaP(posArg(k, 'the shape'), Math.max(x, 0) / posArg(th, 'the scale')), 'gamma');
distPair({ pdf: 'betapdf', cdf: 'betacdf' }, 'x in [0, 1], a and b', 2, (x, a, b) => betaPdf(x, posArg(a, 'a'), posArg(b, 'b')), (x, a, b) => ibeta(Math.min(Math.max(x, 0), 1), posArg(a, 'a'), posArg(b, 'b')), 'beta');
distPair({ pdf: 'weibullpdf', cdf: 'weibullcdf' }, 'x, shape k and scale λ', 2, (x, k, lam) => (x < 0 ? 0 : (posArg(k, 'k') / lam) * (x / lam) ** (k - 1) * Math.exp(-((x / lam) ** k))), (x, k, lam) => (x <= 0 ? 0 : 1 - Math.exp(-((x / posArg(lam, 'λ')) ** posArg(k, 'k')))), 'Weibull');
distPair({ pdf: 'lognormpdf lognormalpdf', cdf: 'lognormcdf lognormalcdf' }, 'x, μ and σ of ln X', 2, (x, mu, sg) => (x <= 0 ? 0 : normPdf((Math.log(x) - mu) / posArg(sg, 'σ')) / (x * sg)), (x, mu, sg) => (x <= 0 ? 0 : normCdf((Math.log(x) - mu) / posArg(sg, 'σ'))), 'lognormal');
distPair({ pdf: 'tpdf', cdf: null }, 't and the degrees of freedom', 1, (x, df) => tPdf(x, posArg(df, 'df')), null, 't');
distPair({ pdf: 'chi2pdf chisqpdf', cdf: null }, 'x and the degrees of freedom', 1, (x, df) => chi2Pdf(x, posArg(df, 'df')), null, 'chi-square');
distPair({ pdf: 'fpdf', cdf: null }, 'x and the two degrees of freedom', 2, (x, d1, d2) => fPdf(x, posArg(d1, 'df1'), posArg(d2, 'df2')), null, 'F');
defCmd('invf', (n) => {
  needArgs(n, 3, 3, 'the left-tail probability and the two degrees of freedom');
  const [p, d1, d2] = n.args.map(numArg);
  const out = newOut();
  out.work.push('The f with P(F ≤ f) = ' + fmtNum(p) + ' (for a right-tail area α use 1 − α)');
  return numOut(out, invCdf((f) => fCdf(f, d1, d2), p, 0, 5), 'f');
});
defCmd('invgamma', (n) => {
  needArgs(n, 3, 3, 'the left-tail probability, the shape k and the scale θ');
  const [p, k, th] = n.args.map(numArg);
  return numOut(newOut(), invCdf((x) => igammaP(posArg(k, 'k'), Math.max(x, 0) / posArg(th, 'θ')), p, 0, k * th + 5), 'x');
});
defCmd('invbeta', (n) => {
  needArgs(n, 3, 3, 'the left-tail probability, a and b');
  const [p, a, b] = n.args.map(numArg);
  const out = newOut();
  let lo = 0;
  let hi = 1;
  if (!(p > 0 && p < 1)) throw new MathError('the probability must be strictly between 0 and 1');
  for (let i = 0; i < 100; i++) {
    const m = (lo + hi) / 2;
    if (ibeta(m, a, b) < p) lo = m;
    else hi = m;
  }
  return numOut(out, (lo + hi) / 2, 'x');
});
defCmd('invexp invexponential', (n) => {
  needArgs(n, 2, 2, 'the left-tail probability and the rate λ');
  const [p, lam] = n.args.map(numArg);
  if (!(p > 0 && p < 1)) throw new MathError('the probability must be strictly between 0 and 1');
  return numOut(newOut(), -Math.log(1 - p) / posArg(lam, 'λ'), 'x');
});
function negBinPmf(k, r, p) {
  return Math.exp(lgamma(k + r) - lgamma(k + 1) - lgamma(r) + r * Math.log(p) + k * Math.log(1 - p));
}
defCmd('negbinpdf negbinomialpdf', (n) => {
  needArgs(n, 3, 3, 'k (the failures), r (the successes needed) and p: negbinpdf(3, 2, 0.5)');
  const [k, r, p] = n.args.map(numArg);
  if (!Number.isInteger(k) || k < 0 || !Number.isInteger(r) || r < 1 || !(p > 0 && p <= 1)) throw new MathError('k ≥ 0 and r ≥ 1 must be whole numbers and 0 < p ≤ 1');
  const out = newOut();
  out.work.push('P(X = k) = C(k + r − 1, k)·pʳ·(1 − p)ᵏ: k failures before the r-th success;  mean ' + fmtNum((r * (1 - p)) / p) + ', variance ' + fmtNum((r * (1 - p)) / (p * p)));
  return pOut(out, 'P(X = ' + k + ')', negBinPmf(k, r, p));
});
defCmd('negbincdf negbinomialcdf', (n) => {
  needArgs(n, 3, 3, 'k, r and p');
  const [k, r, p] = n.args.map(numArg);
  if (!Number.isInteger(k) || k < 0 || !Number.isInteger(r) || r < 1 || !(p > 0 && p <= 1)) throw new MathError('k ≥ 0 and r ≥ 1 must be whole numbers and 0 < p ≤ 1');
  let s = 0;
  for (let i = 0; i <= k; i++) s += negBinPmf(i, r, p);
  return pOut(newOut(), 'P(X ≤ ' + k + ')', Math.min(s, 1));
});

// ---- two-sample, paired, ANOVA, correlation, variance tests ---------------------------------------------------------------------------------------
/** Two samples given as 6 numbers (m1, s1, n1, m2, s2, n2) or as two lists. */
function twoSamples(args, label) {
  if (args[0] && args[0].t === 'list') {
    if (!args[1] || args[1].t !== 'list') throw new MathError(label + ' needs two lists, e.g. ' + label + '([1, 2, 3], [2, 4, 7])');
    const mk = (node) => {
      const vs = dataOf([node], label);
      if (vs.length < 2) throw new MathError('each sample needs at least 2 values');
      return { mean: qFloat(sumQ(vs).div(qInt(vs.length))), s: Math.sqrt(qFloat(sampleVar(vs, false))), n: vs.length };
    };
    return { a: mk(args[0]), b: mk(args[1]), rest: args.slice(2) };
  }
  if (args.length < 6) throw new MathError(label + ' needs m1, s1, n1, m2, s2, n2 (or two lists)');
  const v = args.slice(0, 6).map(numArg);
  return { a: { mean: v[0], s: v[1], n: v[2] }, b: { mean: v[3], s: v[4], n: v[5] }, rest: args.slice(6) };
}
function welch(a, b, pooled) {
  const v1 = (a.s * a.s) / a.n;
  const v2 = (b.s * b.s) / b.n;
  if (pooled) {
    const df = a.n + b.n - 2;
    const sp2 = ((a.n - 1) * a.s * a.s + (b.n - 1) * b.s * b.s) / df;
    const se = Math.sqrt(sp2 * (1 / a.n + 1 / b.n));
    return { se, df, sp: Math.sqrt(sp2) };
  }
  return { se: Math.sqrt(v1 + v2), df: (v1 + v2) ** 2 / ((v1 * v1) / (a.n - 1) + (v2 * v2) / (b.n - 1)) };
}
function ttest2Cmd(pooled) {
  return (n) => {
  const { a, b } = twoSamples(n.args, 'ttest2');
  const { se, df, sp } = welch(a, b, pooled);
  const t = (a.mean - b.mean) / se;
  const cdf = tCdf(t, df);
  const out = newOut();
  out.work.push((pooled ? 'Pooled-variance t test: sp = ' + fmtNum(sp) + ', ' : 'Welch t test (unequal variances): ') + 'x̄₁ − x̄₂ = ' + fmtNum(a.mean - b.mean) + ',  SE = ' + fmtNum(se) + ',  df = ' + fmtNum(df) + (pooled ? '' : '  (use ttest2pooled for the equal-variance version)'));
  return testOut(out, t, 't', 2 * (1 - tCdf(Math.abs(t), df)), cdf, 1 - cdf, 't = (x̄₁ − x̄₂)/SE');
  };
}
defCmd('ttest2 twosamplet', ttest2Cmd(false));
defCmd('ttest2pooled', ttest2Cmd(true));
function tinterval2Cmd(pooled) {
  return (n) => {
  const { a, b, rest } = twoSamples(n.args, 'tinterval2');
  if (!rest.length) throw new MathError('tinterval2 also needs the confidence level at the end, e.g. tinterval2([..], [..], 0.95)');
  const c = levelOf(rest[0]);
  const { se, df } = welch(a, b, pooled);
  const t = invCdf((x) => tCdf(x, df), (1 + c) / 2, -5, 5);
  const out = newOut();
  out.work.push((pooled ? 'pooled' : 'Welch') + ' df = ' + fmtNum(df) + ',  SE = ' + fmtNum(se) + ',  difference of means x̄₁ − x̄₂ = ' + fmtNum(a.mean - b.mean));
  return intervalOut(out, a.mean - b.mean, t * se, t, 't*', c);
  };
}
defCmd('tinterval2 twosampleinterval', tinterval2Cmd(false));
defCmd('tinterval2pooled', tinterval2Cmd(true));
defCmd('pairedt ttestpaired pairedttest', (n) => {
  needArgs(n, 2, 2, 'two lists of paired measurements: pairedt([before], [after])');
  const { xs, ys } = twoLists(n, 'pairedt');
  const d = xs.map((x, i) => x.sub(ys[i]));
  const nn = d.length;
  const md = qFloat(sumQ(d).div(qInt(nn)));
  const sd = Math.sqrt(qFloat(sampleVar(d, false)));
  const df = nn - 1;
  if (sd === 0) throw new MathError('all differences are equal, so the standard error is 0');
  const t = md / (sd / Math.sqrt(nn));
  const cdf = tCdf(t, df);
  const out = newOut();
  out.work.push('differences d = first − second: ' + d.map((v) => v.toString()).join(', '));
  out.work.push('mean difference = ' + fmtNum(md) + ',  s_d = ' + fmtNum(sd) + ',  df = ' + df);
  return testOut(out, t, 't', 2 * (1 - tCdf(Math.abs(t), df)), cdf, 1 - cdf, 't = d̄/(s_d/√n)');
});
defCmd('ztest2', (n) => {
  needArgs(n, 6, 6, 'm1, σ1, n1, m2, σ2, n2');
  const [m1, s1, n1, m2, s2, n2] = n.args.map(numArg);
  const z = (m1 - m2) / Math.sqrt((s1 * s1) / n1 + (s2 * s2) / n2);
  return testOut(newOut(), z, 'z', 2 * normCdf(-Math.abs(z)), normCdf(z), 1 - normCdf(z), 'z = (x̄₁ − x̄₂)/√(σ₁²/n₁ + σ₂²/n₂)');
});
defCmd('prop2test twoproptest', (n) => {
  needArgs(n, 4, 4, 'x1, n1, x2, n2');
  const [x1, n1, x2, n2] = n.args.map(numArg);
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const pp = (x1 + x2) / (n1 + n2);
  const z = (p1 - p2) / Math.sqrt(pp * (1 - pp) * (1 / n1 + 1 / n2));
  return testOut(newOut(), z, 'z', 2 * normCdf(-Math.abs(z)), normCdf(z), 1 - normCdf(z), 'p̂₁ = ' + fmtNum(p1) + ', p̂₂ = ' + fmtNum(p2) + ', pooled p̂ = ' + fmtNum(pp) + ';  z = (p̂₁ − p̂₂)/√(p̂(1 − p̂)(1/n₁ + 1/n₂))');
});
defCmd('prop2interval twopropinterval', (n) => {
  needArgs(n, 5, 5, 'x1, n1, x2, n2 and the confidence level');
  const [x1, n1, x2, n2] = n.args.slice(0, 4).map(numArg);
  const c = levelOf(n.args[4]);
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const z = invNorm((1 + c) / 2);
  const out = newOut();
  out.work.push('p̂₁ − p̂₂ = ' + fmtNum(p1 - p2) + ';  margin = z*·√(p̂₁(1 − p̂₁)/n₁ + p̂₂(1 − p̂₂)/n₂)');
  return intervalOut(out, p1 - p2, z * Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2), z, 'z*', c);
});
defCmd('anova onewayanova', (n) => {
  if (n.args.length < 2 || n.args.some((a) => a.t !== 'list')) throw new MathError('anova needs two or more lists, one per group: anova([4,5,6], [7,8,9], [1,2,3])');
  const groups = n.args.map((a) => dataOf([a], 'anova'));
  const k = groups.length;
  const N = groups.reduce((s, g) => s + g.length, 0);
  if (N - k < 1) throw new MathError('the groups need more observations');
  const all = groups.flat();
  const grand = sumQ(all).div(qInt(N));
  const ssb = sumQ(groups.map((g) => {
    const m = sumQ(g).div(qInt(g.length));
    return m.sub(grand).mul(m.sub(grand)).mul(qInt(g.length));
  }));
  const ssw = sumQ(groups.map((g) => {
    const m = sumQ(g).div(qInt(g.length));
    return sumQ(g.map((v) => v.sub(m).mul(v.sub(m))));
  }));
  const dfb = k - 1;
  const dfw = N - k;
  const msb = ssb.div(qInt(dfb));
  const msw = ssw.div(qInt(dfw));
  const out = newOut();
  if (msw.isZero()) throw new MathError('there is no variation inside the groups, so F is undefined');
  const F = qFloat(msb.div(msw));
  const p = 1 - fCdf(F, dfb, dfw);
  out.answer.push('F = ' + fmtNum(F) + ' (df ' + dfb + ', ' + dfw + '),  p-value = ' + fmtP(p));
  out.work.push('source        SS               df    MS               F');
  out.work.push('between       ' + qText(ssb).padEnd(16) + String(dfb).padEnd(6) + qText(msb).padEnd(16) + fmtNum(F));
  out.work.push('within        ' + qText(ssw).padEnd(16) + String(dfw).padEnd(6) + qText(msw));
  out.work.push('total         ' + qText(ssb.add(ssw)).padEnd(16) + String(N - 1));
  out.work.push('group means: ' + groups.map((g) => qText(sumQ(g).div(qInt(g.length)))).join(', ') + ';  grand mean ' + qText(grand));
  out.notes.push('Reject H0 (all group means equal) when the p-value is below the significance level α.');
  out.value = { num: p };
  return out;
});
defCmd('corrtest correlationtest', (n) => {
  const { xs, ys } = twoLists(n, 'corrtest');
  const nn = xs.length;
  if (nn < 3) throw new MathError('at least 3 pairs are needed');
  const { sxx, syy, sxy } = sums2(xs, ys);
  if (sxx.isZero() || syy.isZero()) throw new MathError('one of the lists is constant, so the correlation is undefined');
  const r = (sxy.sign() < 0 ? -1 : 1) * Math.sqrt(qFloat(sxy.mul(sxy).div(sxx.mul(syy))));
  const df = nn - 2;
  const t = (r * Math.sqrt(df)) / Math.sqrt(Math.max(1 - r * r, 1e-300));
  const cdf = tCdf(t, df);
  const out = newOut();
  out.work.push('r = ' + fmtNum(r) + ',  n = ' + nn);
  return testOut(out, t, 't', 2 * (1 - tCdf(Math.abs(t), df)), cdf, 1 - cdf, 't = r√(n − 2)/√(1 − r²),  df = n − 2 = ' + df + ';  H0: ρ = 0');
});
defCmd('varinterval sdinterval', (n) => {
  needArgs(n, 3, 3, 'the sample standard deviation s, n and the confidence level: varinterval(2.5, 20, 0.95)  (or [data] and the level)');
  let s;
  let nn;
  let c;
  if (n.args[0].t === 'list') {
    const vs = dataOf([n.args[0]], 'varinterval');
    s = Math.sqrt(qFloat(sampleVar(vs, false)));
    nn = vs.length;
    c = levelOf(n.args[1]);
  } else {
    s = numArg(n.args[0]);
    nn = numArg(n.args[1]);
    c = levelOf(n.args[2]);
  }
  const df = nn - 1;
  const lo = invCdf((x) => chi2Cdf(x, df), (1 - c) / 2, 0, df + 10);
  const hi = invCdf((x) => chi2Cdf(x, df), (1 + c) / 2, 0, df + 10);
  const out = newOut();
  out.answer.push(fmtNum(c * 100) + '% confidence interval for σ²: (' + fmtNum((df * s * s) / hi) + ', ' + fmtNum((df * s * s) / lo) + ')');
  out.answer.push('for σ: (' + fmtNum(Math.sqrt((df * s * s) / hi)) + ', ' + fmtNum(Math.sqrt((df * s * s) / lo)) + ')');
  out.work.push('df = ' + df + ',  χ²(left) = ' + fmtNum(lo) + ',  χ²(right) = ' + fmtNum(hi) + ';  interval for σ² = ((n − 1)s²/χ²right, (n − 1)s²/χ²left)');
  return out;
});
defCmd('vartest chisqvartest', (n) => {
  needArgs(n, 3, 3, 'the sample standard deviation s, n and the hypothesised σ0: vartest(2.5, 20, 2)');
  const [s, nn, s0] = n.args.map(numArg);
  const df = nn - 1;
  const chi = (df * s * s) / (s0 * s0);
  const cdf = chi2Cdf(chi, df);
  const out = newOut();
  out.answer.push('χ² = ' + fmtNum(chi) + ' (df ' + df + ')');
  out.answer.push('p-value: two-tailed ' + fmtP(2 * Math.min(cdf, 1 - cdf)) + ',  left-tailed ' + fmtP(cdf) + ',  right-tailed ' + fmtP(1 - cdf));
  out.work.push('χ² = (n − 1)s²/σ0²;  H0: σ = ' + fmtNum(s0));
  out.value = { num: 2 * Math.min(cdf, 1 - cdf) };
  return out;
});
defCmd('ftest2 variancetest', (n) => {
  needArgs(n, 4, 4, 'the sample standard deviations and sizes: ftest2(s1, n1, s2, n2)');
  const [s1, n1, s2, n2] = n.args.map(numArg);
  const F = (s1 * s1) / (s2 * s2);
  const cdf = fCdf(F, n1 - 1, n2 - 1);
  const out = newOut();
  out.answer.push('F = s₁²/s₂² = ' + fmtNum(F) + ' (df ' + (n1 - 1) + ', ' + (n2 - 1) + ')');
  out.answer.push('p-value: two-tailed ' + fmtP(2 * Math.min(cdf, 1 - cdf)) + ',  left-tailed ' + fmtP(cdf) + ',  right-tailed ' + fmtP(1 - cdf));
  out.value = { num: 2 * Math.min(cdf, 1 - cdf) };
  return out;
});
defCmd('samplesize samplesizemean', (n) => {
  needArgs(n, 3, 3, 'σ, the margin of error E and the confidence level: samplesize(15, 3, 0.95)');
  const [sg, E] = n.args.slice(0, 2).map(numArg);
  const c = levelOf(n.args[2]);
  const z = invNorm((1 + c) / 2);
  const need = Math.ceil((z * sg / E) ** 2 - 1e-12);
  const out = newOut();
  out.answer.push('n = ' + need + '  (round up)');
  out.work.push('n = (z*·σ/E)² = (' + fmtNum(z) + '·' + fmtNum(sg) + '/' + fmtNum(E) + ')² = ' + fmtNum((z * sg / E) ** 2));
  out.value = { q: qInt(need) };
  return out;
});
defCmd('samplesizeprop', (n) => {
  needArgs(n, 2, 3, 'the margin of error E, the confidence level and optionally an estimate p (default 0.5)');
  const E = numArg(n.args[0]);
  const c = levelOf(n.args[1]);
  const p = n.args[2] ? numArg(n.args[2]) : 0.5;
  const z = invNorm((1 + c) / 2);
  const raw = (z * z * p * (1 - p)) / (E * E);
  const need = Math.ceil(raw - 1e-12);
  const out = newOut();
  out.answer.push('n = ' + need + '  (round up)');
  out.work.push('n = z*²·p(1 − p)/E² = ' + fmtNum(z) + '²·' + fmtNum(p) + '·' + fmtNum(1 - p) + '/' + fmtNum(E) + '² = ' + fmtNum(raw));
  out.value = { q: qInt(need) };
  return out;
});
defCmd('clt samplingdist', (n) => {
  needArgs(n, 4, 5, 'μ, σ, n and x (or a, b): clt(100, 15, 36, 105)');
  const [mu, sg, nn] = n.args.slice(0, 3).map(numArg);
  const rest = n.args.slice(3).map(numArg);
  const se = sg / Math.sqrt(nn);
  const out = newOut();
  out.work.push('The sample mean has mean ' + fmtNum(mu) + ' and standard error σ/√n = ' + fmtNum(se) + ' (normal for large n, or any n if the population is normal)');
  if (rest.length === 1) return pOut(out, 'P(x̄ ≤ ' + fmtNum(rest[0]) + ')', normCdf((rest[0] - mu) / se));
  return pOut(out, 'P(' + fmtNum(rest[0]) + ' ≤ x̄ ≤ ' + fmtNum(rest[1]) + ')', normCdf((rest[1] - mu) / se) - normCdf((rest[0] - mu) / se));
});
defCmd('binomnormal normalapprox', (n) => {
  needArgs(n, 3, 4, 'n, p and k (or a, b) with the continuity correction: binomnormal(100, 0.5, 55)');
  const [nn, p] = n.args.slice(0, 2).map(numArg);
  const ks = n.args.slice(2).map(numArg);
  const mu = nn * p;
  const sg = Math.sqrt(nn * p * (1 - p));
  const out = newOut();
  out.work.push('Normal approximation: mean np = ' + fmtNum(mu) + ', sd √(np(1 − p)) = ' + fmtNum(sg) + (nn * p >= 10 && nn * (1 - p) >= 10 ? '' : '  (warning: np or n(1 − p) is below 10, so the approximation is rough)'));
  if (ks.length === 1) return pOut(out, 'P(X ≤ ' + ks[0] + ') ≈', normCdf((ks[0] + 0.5 - mu) / sg));
  return pOut(out, 'P(' + ks[0] + ' ≤ X ≤ ' + ks[1] + ') ≈', normCdf((ks[1] + 0.5 - mu) / sg) - normCdf((ks[0] - 0.5 - mu) / sg));
});

// ---- descriptive statistics ---------------------------------------------------------------------------------------------------------------------------------
defCmd('outliers outlier', (n) => {
  const vs = sortQ(dataOf(n.args, 'outliers'));
  const { q1, q3 } = quartiles(vs);
  const iqr = q3.sub(q1);
  const k = qFloat(iqr);
  const lo = q1.sub(iqr.mul(new Q(3n, 2n)));
  const hi = q3.add(iqr.mul(new Q(3n, 2n)));
  const out = newOut();
  const outs = vs.filter((v) => v.sub(lo).sign() < 0 || v.sub(hi).sign() > 0);
  out.answer.push(outs.length ? 'outliers: ' + outs.map((v) => v.toString()).join(', ') : 'no outliers');
  out.work.push('Q1 = ' + qText(q1) + ', Q3 = ' + qText(q3) + ', IQR = ' + qText(iqr) + ';  fences: Q1 − 1.5·IQR = ' + qText(lo) + ',  Q3 + 1.5·IQR = ' + qText(hi));
  void k;
  return out;
});
defCmd('fivenum fivenumber', (n) => {
  const vs = sortQ(dataOf(n.args, 'fivenum'));
  const { q1, q2, q3 } = quartiles(vs);
  const out = newOut();
  out.answer.push('min ' + vs[0].toString() + ',  Q1 ' + qText(q1) + ',  median ' + qText(q2) + ',  Q3 ' + qText(q3) + ',  max ' + vs[vs.length - 1].toString());
  return out;
});
defCmd('mad meanabsdev', (n) => {
  const vs = dataOf(n.args, 'mad');
  const m = sumQ(vs).div(qInt(vs.length));
  const mean = sumQ(vs.map((v) => v.sub(m).abs())).div(qInt(vs.length));
  const med = medianQ(sortQ(vs));
  const medAbs = medianQ(sortQ(vs.map((v) => v.sub(med).abs())));
  const out = newOut();
  out.answer.push('mean absolute deviation = ' + qText(mean));
  out.answer.push('median absolute deviation = ' + qText(medAbs));
  out.work.push('mean absolute deviation = Σ|x − mean|/n (mean = ' + qText(m) + ');  median absolute deviation = median of |x − median| (median = ' + qText(med) + ')');
  out.value = { q: mean };
  return out;
});
defCmd('skewness kurtosis moments', (n) => {
  const vs = dataOf(n.args, n.fn);
  const N = vs.length;
  if (N < 3) throw new MathError('at least 3 values are needed');
  const m = sumQ(vs).div(qInt(N));
  const mk = (k) => sumQ(vs.map((v) => v.sub(m).pow(k))).div(qInt(N));
  const m2 = mk(2);
  if (m2.isZero()) throw new MathError('all values are equal');
  const g1 = qFloat(mk(3)) / qFloat(m2) ** 1.5;
  const g2 = qFloat(mk(4)) / qFloat(m2) ** 2 - 3;
  const out = newOut();
  const G1 = (g1 * Math.sqrt(N * (N - 1))) / (N - 2);
  out.answer.push('skewness g₁ = ' + fmtNum(g1) + '  (sample-adjusted G₁ = ' + fmtNum(G1) + ')');
  if (N >= 4) out.answer.push('excess kurtosis g₂ = ' + fmtNum(g2) + '  (sample-adjusted G₂ = ' + fmtNum((((N - 1) / ((N - 2) * (N - 3))) * ((N + 1) * g2 + 6))) + ')');
  out.work.push('g₁ = m₃/m₂^(3/2),  g₂ = m₄/m₂² − 3 with mₖ = Σ(x − mean)ᵏ/n');
  out.value = { num: g1 };
  return out;
});
defCmd('geomean geometricmean', (n) => {
  const vs = dataOf(n.args, 'geomean');
  if (vs.some((v) => v.sign() <= 0)) throw new MathError('the geometric mean needs positive numbers');
  const prod = vs.reduce((s, v) => s.mul(v), Q1);
  const S = simp(sPow(sN(prod), sN(new Q(1n, BigInt(vs.length)))));
  const out = newOut();
  out.answer.push(symText(S));
  out.work.push('(product of the ' + vs.length + ' values)^(1/' + vs.length + ') with product ' + prod.toString());
  out.value = { S };
  return out;
});
defCmd('harmean harmonicmean', (n) => {
  const vs = dataOf(n.args, 'harmean');
  if (vs.some((v) => v.isZero())) throw new MathError('the harmonic mean needs non-zero numbers');
  const out = newOut();
  out.work.push('n / Σ(1/x)');
  return qvOut(out, qInt(vs.length).div(sumQ(vs.map((v) => v.inv()))));
});
defCmd('rms rootmeansquare', (n) => {
  const vs = dataOf(n.args, 'rms');
  const q = sumQ(vs.map((v) => v.mul(v))).div(qInt(vs.length));
  const S = qSqrtS(q);
  const out = newOut();
  out.answer.push(symText(S));
  out.work.push('√(Σx²/n) with mean of squares ' + qText(q));
  out.value = { S };
  return out;
});
defCmd('cv coefficientofvariation', (n) => {
  const vs = dataOf(n.args, 'cv');
  const m = sumQ(vs).div(qInt(vs.length));
  if (m.isZero()) throw new MathError('the mean is 0, so the coefficient of variation is undefined');
  const s = Math.sqrt(qFloat(sampleVar(vs, false)));
  const out = newOut();
  out.answer.push('CV = s/mean = ' + fmtNum((s / qFloat(m)) * 100) + ' %');
  out.work.push('mean = ' + qText(m) + ', sample standard deviation s = ' + fmtNum(s));
  return out;
});
defCmd('wmean weightedmean', (n) => {
  needArgs(n, 2, 2, 'the values and the weights: wmean([80, 90], [1, 3])');
  const xs = listArg(n.args[0], 'wmean');
  const ws = listArg(n.args[1], 'wmean');
  if (xs.length !== ws.length) throw new MathError('give one weight for each value');
  const tw = sumQ(ws);
  if (tw.isZero()) throw new MathError('the weights add up to 0');
  const out = newOut();
  out.work.push('Σ(w·x)/Σw = ' + sumQ(xs.map((x, i) => x.mul(ws[i]))).toString() + '/' + tw.toString());
  return qvOut(out, sumQ(xs.map((x, i) => x.mul(ws[i]))).div(tw));
});
defCmd('zscores', (n) => {
  const vs = dataOf(n.args, 'zscores');
  const m = sumQ(vs).div(qInt(vs.length));
  const v = sampleVar(vs, false);
  if (v.isZero()) throw new MathError('all values are equal');
  const sd = qSqrtS(v);
  const out = newOut();
  out.answer.push(vs.map((x) => fmtS(simp(sDiv(sN(x.sub(m)), sd)))).join(',  '));
  out.work.push('z = (x − mean)/s with mean ' + qText(m) + ' and s = ' + symText(sd) + ' (sample standard deviation)');
  return out;
});
defCmd('percentrank', (n) => {
  needArgs(n, 2, 2, 'the data list and a value: percentrank([2,4,4,5,9], 5)');
  const vs = listArg(n.args[0], 'percentrank');
  const x = constQ(n.args[1]);
  const below = vs.filter((v) => v.sub(x).sign() < 0).length;
  const equal = vs.filter((v) => v.eq(x)).length;
  const out = newOut();
  out.answer.push('percentile rank of ' + x.toString() + ' = ' + fmtNum(((below + equal / 2) / vs.length) * 100) + ' %   (' + below + ' below, ' + equal + ' equal, of ' + vs.length + ')');
  out.work.push('(number below + ½·number equal)/n × 100');
  return out;
});
defCmd('freqtable frequencytable', (n) => {
  needArgs(n, 2, 3, 'the data list and the class width (and optionally the first class start): freqtable([..], 5)');
  const vs = sortQ(listArg(n.args[0], 'freqtable'));
  const w = constQ(n.args[1]);
  if (w.sign() <= 0) throw new MathError('the class width must be positive');
  const start = n.args[2] ? constQ(n.args[2]) : floorQ(vs[0].div(w)).mul(w);
  const classes = [];
  for (let lo = start; lo.sub(vs[vs.length - 1]).sign() <= 0; lo = lo.add(w)) {
    if (classes.length > 60) throw new MathError('too many classes: choose a larger class width');
    classes.push({ lo, hi: lo.add(w), f: 0 });
  }
  vs.forEach((v) => {
    const c = classes.find((k) => v.sub(k.lo).sign() >= 0 && v.sub(k.hi).sign() < 0);
    if (c) c.f++;
  });
  const out = newOut();
  let cum = 0;
  out.answer.push('class            freq   rel.freq   cum.freq');
  classes.forEach((k) => {
    cum += k.f;
    out.answer.push((k.lo.toString() + ' – <' + k.hi.toString()).padEnd(17) + String(k.f).padEnd(7) + fmtNum(k.f / vs.length).padEnd(11) + cum);
  });
  out.work.push('n = ' + vs.length + ' values; each class includes its lower limit and excludes its upper limit');
  return out;
});
defCmd('stemleaf stemandleaf', (n) => {
  const vs = sortQ(dataOf(n.args, 'stemleaf'));
  if (vs.some((v) => !v.isInt() || v.sign() < 0)) throw new MathError('stem-and-leaf plots here need whole numbers that are not negative');
  const stems = new Map();
  vs.forEach((v) => {
    const s = (v.n / 10n).toString();
    stems.set(s, (stems.get(s) || []).concat([(v.n % 10n).toString()]));
  });
  const first = Number(vs[0].n / 10n);
  const last = Number(vs[vs.length - 1].n / 10n);
  const out = newOut();
  out.answer.push('stem | leaves');
  for (let s = first; s <= last; s++) out.answer.push(String(s).padStart(4) + ' | ' + (stems.get(String(s)) || []).join(' '));
  out.work.push('key: 3 | 4 means 34;  n = ' + vs.length);
  return out;
});
defCmd('grouped groupeddata', (n) => {
  needArgs(n, 2, 2, 'the class midpoints and the frequencies: grouped([5, 15, 25], [3, 7, 2])');
  const xs = listArg(n.args[0], 'grouped');
  const fs = listArg(n.args[1], 'grouped');
  if (xs.length !== fs.length) throw new MathError('give one frequency for each midpoint');
  const N = sumQ(fs);
  const m = sumQ(xs.map((x, i) => x.mul(fs[i]))).div(N);
  const ss = sumQ(xs.map((x, i) => x.sub(m).mul(x.sub(m)).mul(fs[i])));
  const out = newOut();
  out.answer.push('mean = ' + qText(m));
  if (N.sub(Q1).sign() > 0) out.answer.push('sample variance = ' + qText(ss.div(N.sub(Q1))) + ',  sample sd = ' + sqrtQText(ss.div(N.sub(Q1))));
  out.answer.push('population variance = ' + qText(ss.div(N)) + ',  population sd = ' + sqrtQText(ss.div(N)));
  out.work.push('N = Σf = ' + N.toString() + ';  mean = Σ(f·x)/N;  variance = Σ f(x − mean)²/(N or N − 1)');
  out.value = { q: m };
  return out;
});
function ranksOf(vs) {
  const idx = vs.map((v, i) => ({ v, i })).sort((a, b) => a.v.sub(b.v).sign());
  const r = new Array(vs.length);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1].v.eq(idx[i].v)) j++;
    const avg = new Q(BigInt(i + j + 2), 2n);
    for (let k = i; k <= j; k++) r[idx[k].i] = avg;
    i = j + 1;
  }
  return r;
}
defCmd('ranks rankdata', (n) => {
  const vs = dataOf(n.args, 'rank');
  const out = newOut();
  out.answer.push(ranksOf(vs).map((r) => r.toString()).join(', '));
  out.work.push('rank 1 = smallest; tied values share the average of their ranks');
  return out;
});
defCmd('spearman spearmanrho', (n) => {
  const { xs, ys } = twoLists(n, 'spearman');
  const rx = ranksOf(xs);
  const ry = ranksOf(ys);
  const { sxx, syy, sxy } = sums2(rx, ry);
  if (sxx.isZero() || syy.isZero()) throw new MathError('one of the lists is constant');
  const r2 = sxy.mul(sxy).div(sxx.mul(syy));
  const S = sxy.sign() < 0 ? sNeg(qSqrtS(r2)) : qSqrtS(r2);
  const out = newOut();
  out.answer.push('ρ = ' + symText(S));
  out.work.push('Pearson correlation of the ranks: x ranks ' + rx.map((r) => r.toString()).join(', ') + ';  y ranks ' + ry.map((r) => r.toString()).join(', '));
  out.value = { S };
  return out;
});
defCmd('kendall kendalltau', (n) => {
  const { xs, ys } = twoLists(n, 'kendall');
  let conc = 0;
  let disc = 0;
  let tx = 0;
  let ty = 0;
  for (let i = 0; i < xs.length; i++) {
    for (let j = i + 1; j < xs.length; j++) {
      const a = xs[i].sub(xs[j]).sign();
      const b = ys[i].sub(ys[j]).sign();
      if (a === 0 && b === 0) continue;
      if (a === 0) tx++;
      else if (b === 0) ty++;
      else if (a === b) conc++;
      else disc++;
    }
  }
  const denom = Math.sqrt((conc + disc + tx) * (conc + disc + ty));
  if (!denom) throw new MathError('Kendall\'s tau is undefined for these lists');
  const out = newOut();
  out.answer.push('τ_b = ' + fmtNum((conc - disc) / denom));
  out.work.push(conc + ' concordant pairs, ' + disc + ' discordant pairs (ties handled by τ_b)');
  return out;
});

// ---- regression ---------------------------------------------------------------------------------------------------------------------------------------------------
defCmd('multireg multipleregression multilinreg', (n) => {
  needArgs(n, 2, 3, 'the rows of predictors and the y list: multireg([[1,2],[2,1],[3,5],[4,3]], [3,4,9,8])');
  if (n.args[0].t !== 'list' || !n.args[0].items.length || n.args[0].items.some((r) => r.t !== 'list')) throw new MathError('the first argument is a list of rows, one per observation, e.g. [[1,2],[2,1],[3,5]]');
  const X = n.args[0].items.map((r) => [Q1].concat(dataOf([r], 'multireg')));
  const y = listArg(n.args[1], 'multireg');
  if (X.length !== y.length) throw new MathError('give one y value for each row');
  const p = X[0].length;
  if (X.some((r) => r.length !== p)) throw new MathError('all rows need the same number of predictors');
  if (X.length <= p) throw new MathError('more observations than coefficients are needed (' + X.length + ' rows, ' + p + ' coefficients with the intercept)');
  const A = [];
  const b = [];
  for (let i = 0; i < p; i++) {
    A.push([]);
    for (let j = 0; j < p; j++) A[i].push(sumQ(X.map((r) => r[i].mul(r[j]))));
    b.push(sumQ(X.map((r, k) => r[i].mul(y[k]))));
  }
  const c = solveSquare(A, b);
  if (!c) throw new MathError('the predictors are linearly dependent, so the coefficients are not determined');
  const pred = X.map((r) => sumQ(r.map((v, j) => v.mul(c[j]))));
  const sse = sumQ(y.map((v, k) => v.sub(pred[k]).mul(v.sub(pred[k]))));
  const my = sumQ(y).div(qInt(y.length));
  const sst = sumQ(y.map((v) => v.sub(my).mul(v.sub(my))));
  const out = newOut();
  out.answer.push('y = ' + c.map((v, j) => (j === 0 ? v.toString() : (v.sign() < 0 ? '− ' + v.abs().toString() : '+ ' + v.toString()) + '·x' + j)).join(' '));
  out.work.push('Normal equations (XᵀX)β = Xᵀy solved exactly, with a column of ones for the intercept');
  out.work.push('SSE = ' + qText(sse) + (sst.isZero() ? '' : ',  R² = ' + qText(Q1.sub(sse.div(sst)))));
  out.work.push('fitted values: ' + pred.map((v) => fmtNum(qFloat(v))).join(', '));
  if (n.args[2]) {
    const x0 = dataOf([n.args[2]], 'multireg');
    if (x0.length !== p - 1) throw new MathError('the prediction point needs ' + (p - 1) + ' values');
    const yh = c[0].add(sumQ(x0.map((v, j) => v.mul(c[j + 1]))));
    out.answer.push('prediction at [' + x0.map((v) => v.toString()).join(', ') + '] = ' + qText(yh));
  }
  return out;
});
function linearized(xs, ys, fx, fy, what) {
  const X = xs.map(fx);
  const Y = ys.map(fy);
  const N = X.length;
  const mx = X.reduce((s, v) => s + v, 0) / N;
  const my = Y.reduce((s, v) => s + v, 0) / N;
  const sxx = X.reduce((s, v) => s + (v - mx) ** 2, 0);
  const sxy = X.reduce((s, v, i) => s + (v - mx) * (Y[i] - my), 0);
  const syy = Y.reduce((s, v) => s + (v - my) ** 2, 0);
  if (sxx === 0) throw new MathError(what + ': all the x values are equal');
  const b = sxy / sxx;
  return { a: my - b * mx, b, r2: syy === 0 ? 1 : (sxy * sxy) / (sxx * syy) };
}
function curveFit(kind) {
  return (n) => {
    const { xs, ys } = twoLists(n, kind);
    const X = xs.map(qFloat);
    const Y = ys.map(qFloat);
    const out = newOut();
    let fit;
    if (kind === 'expreg') {
      if (Y.some((v) => v <= 0)) throw new MathError('exponential regression needs positive y values');
      fit = linearized(X, Y, (v) => v, Math.log, kind);
      out.answer.push('y = ' + fmtNum(Math.exp(fit.a)) + ' · ' + fmtNum(Math.exp(fit.b)) + '^x    (= ' + fmtNum(Math.exp(fit.a)) + ' · e^(' + fmtNum(fit.b) + 'x))');
      out.work.push('Fit ln y = ln a + x·ln b by least squares;  R² of the linearised fit = ' + fmtNum(fit.r2));
    } else if (kind === 'powerreg') {
      if (X.some((v) => v <= 0) || Y.some((v) => v <= 0)) throw new MathError('power regression needs positive x and y values');
      fit = linearized(X, Y, Math.log, Math.log, kind);
      out.answer.push('y = ' + fmtNum(Math.exp(fit.a)) + ' · x^' + fmtNum(fit.b));
      out.work.push('Fit ln y = ln a + b·ln x by least squares;  R² of the linearised fit = ' + fmtNum(fit.r2));
    } else {
      if (X.some((v) => v <= 0)) throw new MathError('logarithmic regression needs positive x values');
      fit = linearized(X, Y, Math.log, (v) => v, kind);
      out.answer.push('y = ' + fmtNum(fit.a) + ' + ' + fmtNum(fit.b) + ' · ln(x)');
      out.work.push('Fit y = a + b·ln x by least squares;  R² = ' + fmtNum(fit.r2));
    }
    if (n.args[2]) {
      const x0 = numArg(n.args[2]);
      const yh = kind === 'expreg' ? Math.exp(fit.a + fit.b * x0) : kind === 'powerreg' ? Math.exp(fit.a) * x0 ** fit.b : fit.a + fit.b * Math.log(x0);
      out.answer.push('prediction at x = ' + fmtNum(x0) + ': y ≈ ' + fmtNum(yh));
      out.value = { num: yh };
    }
    return out;
  };
}
defCmd('expreg exponentialregression', curveFit('expreg'));
defCmd('powerreg powerregression', curveFit('powerreg'));
defCmd('logreg logarithmicregression', curveFit('logreg'));

// ---- Markov chains, coupon collector --------------------------------------------------------------------------------------------------------------------------
defCmd('markov markovchain', (n) => {
  needArgs(n, 1, 3, 'the transition matrix (rows add up to 1) and optionally the number of steps and a starting distribution: markov([[0.9,0.1],[0.5,0.5]], 3, [1,0])');
  if (n.args[0].t !== 'list' || n.args[0].items.some((r) => r.t !== 'list')) throw new MathError('the transition matrix is written like [[0.9, 0.1], [0.5, 0.5]]');
  const P = n.args[0].items.map((r) => dataOf([r], 'markov'));
  const m = P.length;
  if (m < 2 || m > 10 || P.some((r) => r.length !== m)) throw new MathError('the matrix must be square, between 2×2 and 10×10');
  P.forEach((r, i) => {
    if (r.some((v) => v.sign() < 0)) throw new MathError('probabilities cannot be negative');
    if (!sumQ(r).eq(Q1)) throw new MathError('row ' + (i + 1) + ' adds up to ' + sumQ(r).toString() + ', not 1');
  });
  const out = newOut();
  // stationary distribution: π(P − I) = 0 with Σπ = 1
  const A = [];
  for (let j = 0; j < m; j++) A.push(P.map((r, i) => (i === j ? r[j].sub(Q1) : r[j])).concat([Q0]));
  A.push(new Array(m).fill(Q1).concat([Q1]));
  const { M, pivots, inconsistent } = rrefQ(A, m);
  if (!inconsistent && pivots.length === m) {
    const pi = M.slice(0, m).map((r) => r[m]);
    out.answer.push('stationary distribution π = [' + pi.map((v) => v.toString()).join(', ') + ']  (≈ [' + pi.map((v) => fmtNum(qFloat(v))).join(', ') + '])');
    out.work.push('Solve πP = π with Σπᵢ = 1 exactly');
  } else {
    out.answer.push('no single stationary distribution (the chain has more than one closed class)');
  }
  const absorbing = P.map((r, i) => (r[i].eq(Q1) ? i + 1 : 0)).filter(Boolean);
  if (absorbing.length) out.work.push('absorbing state' + (absorbing.length > 1 ? 's' : '') + ': ' + absorbing.join(', '));
  if (n.args[1]) {
    const steps = Number(intArg(n.args[1]));
    if (steps < 0 || steps > 200) throw new MathError('use between 0 and 200 steps');
    let v = n.args[2] ? listArg(n.args[2], 'markov') : P.map((_, i) => (i === 0 ? Q1 : Q0));
    if (v.length !== m) throw new MathError('the starting distribution needs ' + m + ' entries');
    for (let s = 0; s < steps; s++) v = v.map((_, j) => sumQ(v.map((x, i) => x.mul(P[i][j]))));
    out.answer.push('after ' + steps + ' step' + (steps === 1 ? '' : 's') + ': [' + v.map((x) => x.toString()).join(', ') + ']  (≈ [' + v.map((x) => fmtNum(qFloat(x))).join(', ') + '])');
  }
  return out;
});
defCmd('coupon couponcollector', (n) => {
  needArgs(n, 1, 1, 'the number of different coupons n: coupon(10)');
  const nn = intArg(n.args[0]);
  if (nn < 1n || nn > 2000n) throw new MathError('n must be between 1 and 2000');
  let h = Q0;
  for (let k = 1n; k <= nn; k++) h = h.add(new Q(1n, k));
  const e = h.mul(new Q(nn));
  const out = newOut();
  out.answer.push('expected number of draws = n·Hₙ = ' + (nn <= 60n ? qText(e) : '≈ ' + fmtNum(qFloat(e))));
  out.work.push('n·(1 + 1/2 + … + 1/n) with n = ' + nn);
  out.value = { num: qFloat(e) };
  return out;
});
