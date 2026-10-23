// ======================================================================
// 31. Regression inference (slope / intercept tests and intervals, F test, predictions) and rank / exact tests:
//     Mann-Whitney U, Wilcoxon signed-rank, Kruskal-Wallis, sign test, Fisher's exact test, McNemar's test.
// ======================================================================
const ni2Float = (q) => q.toNumber();
const ni2P = (p) => fmtNum(Math.min(1, Math.max(0, p)));
const ni2Sf = (z) => normCdf(-z); // upper tail of the standard normal
const ni2BinHalf = (nn, k) => Math.exp(lgamma(nn + 1) - lgamma(k + 1) - lgamma(nn - k + 1) - nn * Math.LN2);
/** average ranks (ties share the mean rank) and the sizes of the tie groups; values are exact rationals */
function ni2Ranks(vals) {
  const idx = vals.map((v, i) => i).sort((a, b) => vals[a].sub(vals[b]).sign());
  const ranks = new Array(vals.length);
  const ties = [];
  for (let i = 0; i < idx.length;) {
    let j = i;
    while (j + 1 < idx.length && vals[idx[j + 1]].eq(vals[idx[i]])) j++;
    const r = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[idx[k]] = r;
    ties.push(j - i + 1);
    i = j + 1;
  }
  return { ranks, ties };
}
const ni2TieSum = (ties) => ties.reduce((s, t) => s + t * t * t - t, 0);

// ---- regression inference -----------------------------------------------------------------------------------------------------------
defCmd('reginf regressioninference slopetest', (n) => {
  if (n.args.length < 2 || n.args[0].t !== 'list' || n.args[1].t !== 'list') throw new MathError('reginf needs two lists: reginf([1,2,3,4,5], [2,4,5,4,6])  (optionally the confidence level and an x0 for a prediction)');
  const { xs, ys } = twoLists(n, 'reginf');
  const nn = xs.length;
  if (nn < 3) throw new MathError('at least 3 points are needed for inference on the slope');
  const { mx, my, sxx, syy, sxy } = sums2(xs, ys);
  if (sxx.isZero()) throw new MathError('all the x values are equal, so there is no regression line');
  const conf = n.args[2] ? levelOf(n.args[2]) : 0.95;
  const b = sxy.div(sxx);
  const a = my.sub(b.mul(mx));
  const sse = syy.sub(b.mul(sxy));
  const df = nn - 2;
  const out = newOut();
  const bf = ni2Float(b);
  const af = ni2Float(a);
  const sseF = Math.max(0, ni2Float(sse));
  const s = Math.sqrt(sseF / df);
  const sxxF = ni2Float(sxx);
  const mxF = ni2Float(mx);
  const seB = s / Math.sqrt(sxxF);
  const seA = s * Math.sqrt(1 / nn + (mxF * mxF) / sxxF);
  const tcrit = invCdf((x) => tCdf(x, df), (1 + conf) / 2, -5, 5);
  const r2 = syy.isZero() ? 1 : ni2Float(sxy.mul(sxy).div(sxx.mul(syy)));
  out.answer.push('y = ' + fmtNum(af) + (bf < 0 ? ' − ' : ' + ') + fmtNum(Math.abs(bf)) + 'x');
  if (seB === 0) {
    out.answer.push('the points lie exactly on the line: the standard errors are 0, so no test is needed (r² = 1)');
    return out;
  }
  const tB = bf / seB;
  const tA = af / seA;
  const pB = 2 * (1 - tCdf(Math.abs(tB), df));
  const pA = 2 * (1 - tCdf(Math.abs(tA), df));
  out.answer.push('slope: b = ' + fmtNum(bf) + ',  SE = ' + fmtNum(seB) + ',  t = ' + fmtNum(tB) + ' (df = ' + df + '),  p-value (two-tailed) = ' + ni2P(pB));
  out.answer.push(fmtNum(conf * 100) + '% confidence interval for the slope: (' + fmtNum(bf - tcrit * seB) + ', ' + fmtNum(bf + tcrit * seB) + ')');
  out.answer.push('intercept: a = ' + fmtNum(af) + ',  SE = ' + fmtNum(seA) + ',  t = ' + fmtNum(tA) + ',  p-value = ' + ni2P(pA) + ';  ' + fmtNum(conf * 100) + '% CI (' + fmtNum(af - tcrit * seA) + ', ' + fmtNum(af + tcrit * seA) + ')');
  out.answer.push('r² = ' + fmtNum(r2) + ',  r = ' + fmtNum(Math.sign(bf) * Math.sqrt(r2)) + ',  residual standard error s = ' + fmtNum(s) + ' (df = ' + df + ')');
  const ssr = ni2Float(sxy.mul(sxy).div(sxx));
  const F = ssr / (sseF / df);
  out.work.push('Sxx = ' + qText(sxx) + ',  Syy = ' + qText(syy) + ',  Sxy = ' + qText(sxy) + ';  SSE = Syy − b·Sxy = ' + fmtNum(sseF) + ',  s = √(SSE/(n − 2))');
  out.work.push('ANOVA: SSR = ' + fmtNum(ssr) + ',  SSE = ' + fmtNum(sseF) + ',  SST = ' + fmtNum(ni2Float(syy)) + ';  F = SSR/(SSE/' + df + ') = ' + fmtNum(F) + ' (= t² for the slope),  p = ' + ni2P(pB));
  out.work.push('SE(b) = s/√Sxx,  SE(a) = s·√(1/n + x̄²/Sxx);  critical value t* = ' + fmtNum(tcrit) + ' for ' + fmtNum(conf * 100) + '% confidence');
  if (n.args[3]) {
    const x0 = ni2Float(constQ(n.args[3]));
    const yh = af + bf * x0;
    const seMean = s * Math.sqrt(1 / nn + ((x0 - mxF) ** 2) / sxxF);
    const sePred = s * Math.sqrt(1 + 1 / nn + ((x0 - mxF) ** 2) / sxxF);
    out.answer.push('at x = ' + fmtNum(x0) + ': ŷ = ' + fmtNum(yh) + ';  ' + fmtNum(conf * 100) + '% CI for the mean response (' + fmtNum(yh - tcrit * seMean) + ', ' + fmtNum(yh + tcrit * seMean) + ');  prediction interval for a new observation (' + fmtNum(yh - tcrit * sePred) + ', ' + fmtNum(yh + tcrit * sePred) + ')');
  }
  out.value = { num: pB };
  return out;
});

// ---- Mann-Whitney U ------------------------------------------------------------------------------------------------------------------
/** counts[u] = number of arrangements of n1 + n2 values with Mann-Whitney statistic u: the coefficients of the Gaussian binomial
 *  [n1 + n2 choose n1]_q = prod_{i=1..m} (1 - q^(k + i)) / (1 - q^i) with m = min(n1, n2), k = max(n1, n2) */
function ni2MwuCounts(n1, n2) {
  const m = Math.min(n1, n2);
  const k = Math.max(n1, n2);
  const maxDeg = m * k;
  const poly = new Float64Array(maxDeg + 1);
  poly[0] = 1;
  for (let i = 1; i <= m; i++) {
    for (let d = maxDeg; d >= k + i; d--) poly[d] -= poly[d - (k + i)];
    for (let d = i; d <= maxDeg; d++) poly[d] += poly[d - i];
  }
  return Array.from(poly);
}
defCmd('mannwhitney ranksum wilcoxonranksum mwu', (n) => {
  needArgs(n, 2, 2, 'two lists: mannwhitney([1,3,5,7], [2,4,6,8,10])');
  const x = listArg(n.args[0], 'mannwhitney');
  const y = listArg(n.args[1], 'mannwhitney');
  const n1 = x.length;
  const n2 = y.length;
  const { ranks, ties } = ni2Ranks(x.concat(y));
  const R1 = ranks.slice(0, n1).reduce((s, r) => s + r, 0);
  const U1 = R1 - (n1 * (n1 + 1)) / 2;
  const U2 = n1 * n2 - U1;
  const hasTies = ties.some((t) => t > 1);
  const comb = Math.exp(lgamma(n1 + n2 + 1) - lgamma(n1 + 1) - lgamma(n2 + 1));
  const exact = !(n1 > 8 && n2 > 8) && !hasTies && n1 * n2 <= 40000 && comb < 9e15;
  const out = newOut();
  let p2;
  let pRight;
  let pLeft;
  let how;
  if (exact) {
    const counts = ni2MwuCounts(n1, n2);
    const total = counts.reduce((s, v) => s + v, 0);
    const sf = (u) => counts.slice(Math.max(0, Math.ceil(u - 1e-9))).reduce((s, v) => s + v, 0) / total;
    pRight = sf(U1);
    pLeft = sf(U2);
    p2 = Math.min(1, 2 * sf(Math.max(U1, U2)));
    how = 'exact distribution of U (no ties, a sample of at most 8)';
  } else {
    const mu = (n1 * n2) / 2;
    const N = n1 + n2;
    const sd = Math.sqrt(((n1 * n2) / 12) * (N + 1 - ni2TieSum(ties) / (N * (N - 1))));
    if (!(sd > 0)) throw new MathError('all the values are equal, so the test is undefined');
    const zOf = (u) => (u - mu - 0.5) / sd;
    pRight = ni2Sf(zOf(U1));
    pLeft = ni2Sf(zOf(U2));
    p2 = Math.min(1, 2 * ni2Sf(zOf(Math.max(U1, U2))));
    how = 'normal approximation with continuity correction' + (hasTies ? ' and tie correction' : '');
  }
  out.answer.push('U₁ = ' + fmtNum(U1) + ' (first sample),  U₂ = ' + fmtNum(U2));
  out.answer.push('p-value: two-tailed ' + ni2P(p2) + ',  first sample larger (right-tailed) ' + ni2P(pRight) + ',  first sample smaller (left-tailed) ' + ni2P(pLeft));
  out.work.push('rank sum of the first sample R₁ = ' + fmtNum(R1) + ',  U₁ = R₁ − n₁(n₁ + 1)/2 with n₁ = ' + n1 + ', n₂ = ' + n2 + ';  U₂ = n₁n₂ − U₁');
  out.work.push('p-value from the ' + how);
  out.notes.push('H0: the two samples come from the same distribution; reject when the p-value is below α.');
  out.value = { num: p2 };
  return out;
});

// ---- Wilcoxon signed-rank -------------------------------------------------------------------------------------------------------------
/** counts[w] = number of subsets of {1..n} with sum w */
function ni2SignedRankCounts(n) {
  const max = (n * (n + 1)) / 2;
  const c = new Array(max + 1).fill(0);
  c[0] = 1;
  for (let k = 1; k <= n; k++) for (let w = max; w >= k; w--) c[w] += c[w - k];
  return c;
}
defCmd('wilcoxon signedrank wilcoxonsigned', (n) => {
  if (!n.args.length || n.args[0].t !== 'list') throw new MathError('wilcoxon needs a list of differences, or two paired lists: wilcoxon([1.5,-0.5,2,3.1,-1]) or wilcoxon([125,115,130], [110,122,125])');
  let d;
  if (n.args[1] && n.args[1].t === 'list') {
    const { xs, ys } = twoLists(n, 'wilcoxon');
    d = xs.map((v, i) => v.sub(ys[i]));
  } else {
    const xs = listArg(n.args[0], 'wilcoxon');
    const m0 = n.args[1] ? constQ(n.args[1]) : Q0;
    d = xs.map((v) => v.sub(m0));
  }
  const nAll = d.length;
  const nz = d.filter((v) => !v.isZero());
  const zeros = nAll - nz.length;
  const nn = nz.length;
  if (nn < 1) throw new MathError('all the differences are zero, so there is nothing to rank');
  const { ranks, ties } = ni2Ranks(nz.map((v) => v.abs()));
  let rPlus = 0;
  let rMinus = 0;
  nz.forEach((v, i) => { if (v.sign() > 0) rPlus += ranks[i]; else rMinus += ranks[i]; });
  const hasTies = ties.some((t) => t > 1);
  const exact = !hasTies && zeros === 0 && nAll <= 50;
  const W = Math.min(rPlus, rMinus);
  let p2;
  let pRight;
  let pLeft;
  let how;
  if (exact) {
    const counts = ni2SignedRankCounts(nn);
    const total = 2 ** nn;
    const cdf = (w) => counts.slice(0, Math.floor(w + 1e-9) + 1).reduce((s, v) => s + v, 0) / total;
    const sf = (w) => counts.slice(Math.ceil(w - 1e-9)).reduce((s, v) => s + v, 0) / total;
    pLeft = cdf(rPlus);
    pRight = sf(rPlus);
    p2 = Math.min(1, 2 * Math.min(pLeft, pRight));
    how = 'exact distribution of W⁺ (no ties or zero differences)';
  } else {
    const mn = (nn * (nn + 1)) / 4;
    const se = Math.sqrt((nn * (nn + 1) * (2 * nn + 1)) / 24 - ni2TieSum(ties) / 48);
    if (!(se > 0)) throw new MathError('the differences are all equal in size, so the test is undefined');
    const z = (rPlus - mn) / se;
    const zc = (zz, sign) => zz - (sign * 0.5) / se;
    p2 = Math.min(1, 2 * ni2Sf(Math.abs(zc(z, Math.sign(z)))));
    pRight = ni2Sf(zc(z, 1));
    pLeft = normCdf(zc(z, -1));
    how = 'normal approximation with continuity correction' + (hasTies ? ' and tie correction' : '') + (zeros ? ' (zero differences are dropped)' : '');
  }
  const out = newOut();
  out.answer.push('W⁺ = ' + fmtNum(rPlus) + ',  W⁻ = ' + fmtNum(rMinus) + ',  W = min = ' + fmtNum(W));
  out.answer.push('p-value: two-tailed ' + ni2P(p2) + ',  right-tailed (median > 0) ' + ni2P(pRight) + ',  left-tailed (median < 0) ' + ni2P(pLeft));
  out.work.push('n = ' + nn + ' non-zero differences' + (zeros ? ' (' + zeros + ' zero dropped)' : '') + ';  W⁺ = sum of the ranks of |d| for d > 0;  p-value from the ' + how);
  out.notes.push('H0: the median difference is 0; reject when the p-value is below α.');
  out.value = { num: p2 };
  return out;
});

// ---- Kruskal-Wallis ------------------------------------------------------------------------------------------------------------------
defCmd('kruskalwallis kwtest', (n) => {
  if (n.args.length < 2 || n.args.some((a) => a.t !== 'list')) throw new MathError('kruskalwallis needs two or more lists, one per group: kruskalwallis([1,2,3], [4,5,6], [7,8,9])');
  const groups = n.args.map((a) => listArg(a, 'kruskalwallis'));
  const all = groups.flat();
  const N = all.length;
  const { ranks, ties } = ni2Ranks(all);
  let pos = 0;
  let H = 0;
  const sums = groups.map((g) => {
    let s = 0;
    for (let i = 0; i < g.length; i++) s += ranks[pos + i];
    pos += g.length;
    return s;
  });
  groups.forEach((g, i) => { H += (sums[i] * sums[i]) / g.length; });
  H = (12 / (N * (N + 1))) * H - 3 * (N + 1);
  const corr = 1 - ni2TieSum(ties) / (N ** 3 - N);
  if (!(corr > 0)) throw new MathError('all the values are equal, so the test is undefined');
  H /= corr;
  const df = groups.length - 1;
  const p = 1 - chi2Cdf(H, df);
  const out = newOut();
  out.answer.push('H = ' + fmtNum(H) + ' (df = ' + df + ')');
  out.answer.push('p-value = ' + ni2P(p));
  out.work.push('rank sums ' + sums.map((s, i) => 'R' + (i + 1) + ' = ' + fmtNum(s) + ' (n = ' + groups[i].length + ')').join(', ') + ';  H = 12/(N(N + 1))·Σ Rᵢ²/nᵢ − 3(N + 1)' + (corr < 1 ? ', divided by the tie correction ' + fmtNum(corr) : ''));
  out.work.push('H is compared with the chi-square distribution with k − 1 = ' + df + ' degrees of freedom (best when every group has at least 5 values)');
  out.notes.push('H0: all groups have the same distribution; reject when the p-value is below α.');
  out.value = { num: p };
  return out;
});

// ---- sign test ---------------------------------------------------------------------------------------------------------------------------
defCmd('signtest', (n) => {
  if (!n.args.length || n.args[0].t !== 'list') throw new MathError('signtest needs a list and the hypothesised median, or two paired lists: signtest([5,7,3,9,8], 4) or signtest(before, after)');
  let d;
  if (n.args[1] && n.args[1].t === 'list') {
    const { xs, ys } = twoLists(n, 'signtest');
    d = xs.map((v, i) => v.sub(ys[i]));
  } else {
    if (!n.args[1]) throw new MathError('signtest needs the hypothesised median: signtest([5,7,3,9,8], 4)');
    const m0 = constQ(n.args[1]);
    d = listArg(n.args[0], 'signtest').map((v) => v.sub(m0));
  }
  const pos = d.filter((v) => v.sign() > 0).length;
  const neg = d.filter((v) => v.sign() < 0).length;
  const tot = pos + neg;
  if (!tot) throw new MathError('every difference is zero, so there are no signs to count');
  const cdf = (k) => { let s = 0; for (let i = 0; i <= k; i++) s += ni2BinHalf(tot, i); return Math.min(1, s); };
  const pLeft = cdf(pos);
  const pRight = 1 - cdf(pos - 1);
  const p2 = Math.min(1, 2 * Math.min(pLeft, pRight));
  const out = newOut();
  out.answer.push(pos + ' positive and ' + neg + ' negative differences' + (d.length > tot ? ' (' + (d.length - tot) + ' zero dropped)' : ''));
  out.answer.push('p-value: two-tailed ' + ni2P(p2) + ',  right-tailed ' + ni2P(pRight) + ',  left-tailed ' + ni2P(pLeft));
  out.work.push('under H0 the number of positive signs is Binomial(' + tot + ', 1/2); exact p-values');
  out.value = { num: p2 };
  return out;
});

// ---- 2×2 tables: Fisher's exact test, McNemar ----------------------------------------------------------------------------------------------
function ni2Table(n, what) {
  const A = needMat(evalMat(n.args[0]), what);
  if (A.length !== 2 || A[0].length !== 2 || A.flat().some((q) => !q.isInt() || q.sign() < 0)) throw new MathError(what + ' needs a 2×2 table of counts such as [[8, 2], [1, 5]]');
  return A.map((r) => r.map((q) => Number(q.n)));
}
defCmd('fisherexact fishertest', (n) => {
  needArgs(n, 1, 1, 'a 2×2 table of counts: fisherexact([[8,2],[1,5]])');
  const [[a, b], [c, d]] = ni2Table(n, 'fisher');
  const r1 = a + b;
  const r2 = c + d;
  const c1 = a + c;
  const N = r1 + r2;
  const lc = (nn, k) => lgamma(nn + 1) - lgamma(k + 1) - lgamma(nn - k + 1);
  const prob = (x) => Math.exp(lc(r1, x) + lc(r2, c1 - x) - lc(N, c1));
  const lo = Math.max(0, c1 - r2);
  const hi = Math.min(r1, c1);
  const p0 = prob(a);
  let p2 = 0;
  let pRight = 0;
  let pLeft = 0;
  for (let x = lo; x <= hi; x++) {
    const px = prob(x);
    if (px <= p0 * (1 + 1e-7)) p2 += px;
    if (x >= a) pRight += px;
    if (x <= a) pLeft += px;
  }
  const out = newOut();
  const odds = b * c === 0 ? (a * d === 0 ? NaN : Infinity) : (a * d) / (b * c);
  out.answer.push('sample odds ratio = ' + (isNaN(odds) ? 'undefined' : odds === Infinity ? '∞' : fmtNum(odds)) + ' (ad/bc)');
  out.answer.push('Fisher exact p-value: two-tailed ' + ni2P(p2) + ',  right-tailed (a larger) ' + ni2P(pRight) + ',  left-tailed ' + ni2P(pLeft));
  out.work.push('the count in the first cell is hypergeometric given the margins (' + r1 + ', ' + r2 + ' | ' + c1 + ', ' + (N - c1) + ');  two-tailed p = sum of the probabilities of all tables that are not more likely than the observed one');
  out.value = { num: p2 };
  return out;
});
defCmd('mcnemar', (n) => {
  needArgs(n, 1, 1, 'a 2×2 table of paired counts: mcnemar([[59,6],[16,80]])');
  const [[, b], [c]] = ni2Table(n, 'mcnemar');
  const tot = b + c;
  if (!tot) throw new MathError('there are no discordant pairs (b = c = 0), so the test is undefined');
  const chi = (Math.abs(b - c) - 1) ** 2 / tot;
  const pChi = 1 - chi2Cdf(chi, 1);
  let s = 0;
  for (let i = 0; i <= Math.min(b, c); i++) s += ni2BinHalf(tot, i);
  const pExact = Math.min(1, 2 * s);
  const out = newOut();
  out.answer.push('χ² = ' + fmtNum(chi) + ' (df = 1, with continuity correction),  p-value = ' + ni2P(pChi));
  out.answer.push('exact binomial p-value = ' + ni2P(pExact) + ' (use it when b + c < 25)');
  out.work.push('only the discordant pairs matter: b = ' + b + ', c = ' + c + ';  χ² = (|b − c| − 1)²/(b + c)');
  out.value = { num: tot < 25 ? pExact : pChi };
  return out;
});
