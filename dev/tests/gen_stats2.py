# Oracle cases for the extra statistics commands (scipy.stats / numpy). Each case: cmd + checks [(regex with one group, expected number)].
import json, sys, random, math
import numpy as np
from scipy import stats as st

seed = int(sys.argv[1]) if len(sys.argv) > 1 else 1
rnd = random.Random(seed)
cases = []
NUM = r'(-?[0-9.]+(?:e[+-]?[0-9]+)?)'
def add(cmd, *checks): cases.append({'cmd': cmd, 'checks': [[r, float(v)] for r, v in checks]})
def L(xs): return '[' + ', '.join(str(v) for v in xs) + ']'

# distributions
for _ in range(6):
    a = rnd.randint(-3, 2); b = a + rnd.randint(1, 5); x = round(rnd.uniform(a - 1, b + 1), 2)
    add('unifcdf(%s, %d, %d)' % (x, a, b), (r'P\(X ≤ [^)]*\) = ' + NUM, st.uniform.cdf(x, a, b - a)))
    add('unifpdf(%s, %d, %d)' % (x, a, b), (r'density at [^=]* = ' + NUM, st.uniform.pdf(x, a, b - a)))
for _ in range(6):
    lam = rnd.choice([0.5, 1, 2, 3]); x = round(rnd.uniform(0, 4), 2)
    add('exppdf(%s, %s)' % (x, lam), (r'density at [^=]* = ' + NUM, st.expon.pdf(x, scale=1 / lam)))
    p = round(rnd.uniform(0.05, 0.95), 2)
    add('invexp(%s, %s)' % (p, lam), (r'x = ' + NUM, st.expon.ppf(p, scale=1 / lam)))
for _ in range(8):
    k = rnd.choice([1, 2, 3.5, 5]); th = rnd.choice([0.5, 1, 2]); x = round(rnd.uniform(0.2, 8), 2); p = round(rnd.uniform(0.05, 0.95), 2)
    add('gammapdf(%s, %s, %s)' % (x, k, th), (r'density at [^=]* = ' + NUM, st.gamma.pdf(x, k, scale=th)))
    add('gammacdf(%s, %s, %s)' % (x, k, th), (r'P\(X ≤ [^)]*\) = ' + NUM, st.gamma.cdf(x, k, scale=th)))
    add('invgamma(%s, %s, %s)' % (p, k, th), (r'x = ' + NUM, st.gamma.ppf(p, k, scale=th)))
for _ in range(8):
    a = rnd.choice([0.5, 1, 2, 3]); b = rnd.choice([0.5, 1, 2, 5]); x = round(rnd.uniform(0.05, 0.95), 2); p = round(rnd.uniform(0.05, 0.95), 2)
    add('betapdf(%s, %s, %s)' % (x, a, b), (r'density at [^=]* = ' + NUM, st.beta.pdf(x, a, b)))
    add('betacdf(%s, %s, %s)' % (x, a, b), (r'P\(X ≤ [^)]*\) = ' + NUM, st.beta.cdf(x, a, b)))
    add('invbeta(%s, %s, %s)' % (p, a, b), (r'x = ' + NUM, st.beta.ppf(p, a, b)))
for _ in range(6):
    k = rnd.choice([0.8, 1.5, 2, 3]); lam = rnd.choice([1, 2, 5]); x = round(rnd.uniform(0.2, 6), 2)
    add('weibullcdf(%s, %s, %s)' % (x, k, lam), (r'P\(X ≤ [^)]*\) = ' + NUM, st.weibull_min.cdf(x, k, scale=lam)))
    add('weibullpdf(%s, %s, %s)' % (x, k, lam), (r'density at [^=]* = ' + NUM, st.weibull_min.pdf(x, k, scale=lam)))
for _ in range(6):
    mu = rnd.choice([0, 1, 0.5]); sg = rnd.choice([0.5, 1, 2]); x = round(rnd.uniform(0.2, 6), 2)
    add('lognormcdf(%s, %s, %s)' % (x, mu, sg), (r'P\(X ≤ [^)]*\) = ' + NUM, st.lognorm.cdf(x, sg, scale=math.exp(mu))))
    add('lognormpdf(%s, %s, %s)' % (x, mu, sg), (r'density at [^=]* = ' + NUM, st.lognorm.pdf(x, sg, scale=math.exp(mu))))
for _ in range(6):
    df = rnd.choice([2, 5, 10, 30]); x = round(rnd.uniform(-3, 3), 2); d2 = rnd.choice([3, 8, 20]); xf = round(rnd.uniform(0.2, 4), 2); p = round(rnd.uniform(0.05, 0.95), 2)
    add('tpdf(%s, %d)' % (x, df), (r'density at [^=]* = ' + NUM, st.t.pdf(x, df)))
    add('chi2pdf(%s, %d)' % (abs(x) + 0.5, df), (r'density at [^=]* = ' + NUM, st.chi2.pdf(abs(x) + 0.5, df)))
    add('fpdf(%s, %d, %d)' % (xf, df, d2), (r'density at [^=]* = ' + NUM, st.f.pdf(xf, df, d2)))
    add('invf(%s, %d, %d)' % (p, df, d2), (r'f = ' + NUM, st.f.ppf(p, df, d2)))
for _ in range(6):
    r = rnd.randint(1, 5); p = rnd.choice([0.3, 0.5, 0.7]); k = rnd.randint(0, 8)
    add('negbinpdf(%d, %d, %s)' % (k, r, p), (r'P\(X = [0-9]+\) = ' + NUM, st.nbinom.pmf(k, r, p)))
    add('negbincdf(%d, %d, %s)' % (k, r, p), (r'P\(X ≤ [0-9]+\) = ' + NUM, st.nbinom.cdf(k, r, p)))

# tests
def pvals(res_p, tstat, df, dist):
    left = dist.cdf(tstat, df) if df is not None else st.norm.cdf(tstat)
    return left
for _ in range(10):
    a = [rnd.randint(1, 20) for _ in range(rnd.randint(4, 9))]; b = [rnd.randint(1, 20) for _ in range(rnd.randint(4, 9))]
    if len(set(a)) < 2 or len(set(b)) < 2: continue
    for eq, name in [(False, 'ttest2'), (True, 'ttest2pooled')]:
        r = st.ttest_ind(a, b, equal_var=eq)
        add('%s(%s, %s)' % (name, L(a), L(b)), (r't = ' + NUM, r.statistic), (r'two-tailed ' + NUM, r.pvalue))
    r = st.ttest_ind(a, b, equal_var=False)
    ci = r.confidence_interval(0.95) if hasattr(r, 'confidence_interval') else None
    if ci: add('tinterval2(%s, %s, 0.95)' % (L(a), L(b)), (r'interval: \(' + NUM, ci.low), (r'interval: \([^,]*, ' + NUM, ci.high))
for _ in range(6):
    n = rnd.randint(4, 9); a = [rnd.randint(1, 20) for _ in range(n)]; b = [x + rnd.randint(-3, 5) for x in a]
    if len(set(x - y for x, y in zip(a, b))) < 2: continue
    r = st.ttest_rel(a, b)
    add('pairedt(%s, %s)' % (L(a), L(b)), (r't = ' + NUM, r.statistic), (r'two-tailed ' + NUM, r.pvalue))
for _ in range(6):
    groups = [[rnd.randint(1, 15) + 2 * g for _ in range(rnd.randint(3, 6))] for g in range(rnd.randint(2, 4))]
    r = st.f_oneway(*groups)
    add('anova(%s)' % ', '.join(L(g) for g in groups), (r'F = ' + NUM, r.statistic), (r'p-value = ' + NUM, r.pvalue))
for _ in range(6):
    n = rnd.randint(5, 10); xs = list(range(n)); ys = [x * rnd.choice([1, 2]) + rnd.randint(-3, 3) for x in xs]
    xs = [rnd.randint(1, 30) for _ in range(n)]
    if len(set(xs)) < 3 or len(set(ys)) < 3: continue
    r = st.pearsonr(xs, ys)
    t = r[0] * math.sqrt(n - 2) / math.sqrt(1 - r[0]**2)
    add('corrtest(%s, %s)' % (L(xs), L(ys)), (r't = ' + NUM, t), (r'two-tailed ' + NUM, r[1]))
for _ in range(5):
    x1, n1 = rnd.randint(20, 60), rnd.randint(70, 120); x2, n2 = rnd.randint(15, 50), rnd.randint(60, 110)
    p1, p2, pp = x1 / n1, x2 / n2, (x1 + x2) / (n1 + n2)
    z = (p1 - p2) / math.sqrt(pp * (1 - pp) * (1 / n1 + 1 / n2))
    add('prop2test(%d, %d, %d, %d)' % (x1, n1, x2, n2), (r'z = ' + NUM, z), (r'two-tailed ' + NUM, 2 * st.norm.sf(abs(z))))
for _ in range(5):
    s = rnd.choice([1.5, 2.5, 4]); n = rnd.randint(8, 30)
    df = n - 1
    lo = st.chi2.ppf(0.025, df); hi = st.chi2.ppf(0.975, df)
    add('varinterval(%s, %d, 0.95)' % (s, n), (r'σ²: \(' + NUM, df * s * s / hi), (r'σ²: \([^,]*, ' + NUM, df * s * s / lo))
    chi = df * s * s / 4
    add('vartest(%s, %d, 2)' % (s, n), (r'χ² = ' + NUM, chi), (r'right-tailed ' + NUM, st.chi2.sf(chi, df)))
    s2, n2 = rnd.choice([1.5, 3]), rnd.randint(8, 25)
    F = s * s / (s2 * s2)
    add('ftest2(%s, %d, %s, %d)' % (s, n, s2, n2), (r'F = s₁²/s₂² = ' + NUM, F), (r'right-tailed ' + NUM, st.f.sf(F, n - 1, n2 - 1)))
for _ in range(5):
    sg, E, c = rnd.choice([10, 15, 4.5]), rnd.choice([1, 2, 3]), rnd.choice([0.9, 0.95, 0.99])
    z = st.norm.ppf((1 + c) / 2)
    add('samplesize(%s, %s, %s)' % (sg, E, c), (r'n = ' + NUM, math.ceil((z * sg / E) ** 2 - 1e-12)))
    pr = rnd.choice([0.3, 0.5, 0.65])
    add('samplesizeprop(%s, %s, %s)' % (0.04, c, pr), (r'n = ' + NUM, math.ceil(z * z * pr * (1 - pr) / 0.04**2 - 1e-12)))
    mu, sd, n, x = 100, rnd.choice([10, 15]), rnd.choice([16, 25, 36]), rnd.randint(95, 108)
    add('clt(%d, %d, %d, %d)' % (mu, sd, n, x), (r'= ' + NUM, st.norm.cdf((x - mu) / (sd / math.sqrt(n)))))

# descriptive
for _ in range(10):
    xs = [rnd.randint(1, 40) for _ in range(rnd.randint(5, 12))]
    if len(set(xs)) < 3: continue
    arr = np.array(xs, dtype=float)
    add('skewness(%s)' % L(xs), (r'g₁ = ' + NUM, st.skew(arr, bias=True)), (r'G₁ = ' + NUM, st.skew(arr, bias=False)))
    if len(xs) >= 4:
        add('kurtosis(%s)' % L(xs), (r'g₂ = ' + NUM, st.kurtosis(arr, bias=True)), (r'G₂ = ' + NUM, st.kurtosis(arr, bias=False)))
    pos = [x for x in xs]
    add('geomean(%s)' % L(pos), (r'^Answer: ', st.gmean(pos)))
    add('harmean(%s)' % L(pos), (r'^Answer: ', st.hmean(pos)))
    add('mad(%s)' % L(xs), (r'mean absolute deviation = ', float(np.mean(np.abs(arr - arr.mean())))), (r'median absolute deviation = ', float(np.median(np.abs(arr - np.median(arr))))))
    ys = [rnd.randint(1, 40) for _ in xs]
    if len(set(ys)) < 3: continue
    r = st.spearmanr(xs, ys)
    add('spearman(%s, %s)' % (L(xs), L(ys)), (r'ρ = ', r.statistic))
    kt = st.kendalltau(xs, ys)
    add('kendall(%s, %s)' % (L(xs), L(ys)), (r'τ_b = ' + NUM, kt.statistic))
for _ in range(8):
    n = rnd.randint(6, 12); X = [[rnd.randint(1, 9), rnd.randint(1, 9)] for _ in range(n)]
    y = [3 + 2 * a - b + rnd.randint(-2, 2) for a, b in X]
    A = np.array([[1] + r for r in X], dtype=float)
    if np.linalg.matrix_rank(A) < 3: continue
    beta = np.linalg.lstsq(A, np.array(y, dtype=float), rcond=None)[0]
    pred = A @ beta; sse = float(((np.array(y) - pred) ** 2).sum()); sst = float(((np.array(y) - np.mean(y)) ** 2).sum())
    x0 = [rnd.randint(1, 9), rnd.randint(1, 9)]
    add('multireg(%s, %s, %s)' % ('[' + ', '.join(L(r) for r in X) + ']', L(y), L(x0)), (r'SSE = ', sse), (r'prediction at \[[^\]]*\] = ', float(beta[0] + beta[1] * x0[0] + beta[2] * x0[1])))
for _ in range(6):
    xs = [1, 2, 3, 4, 5][:rnd.randint(4, 5)]; ys = [round(rnd.uniform(1, 5) * 1.6 ** x, 2) for x in xs]
    b, a = np.polyfit(xs, np.log(ys), 1)
    add('expreg(%s, %s, 2.5)' % (L(xs), L(ys)), (r'prediction at x = 2.5: y ≈ ' + NUM, math.exp(a + b * 2.5)))
    b2, a2 = np.polyfit(np.log(xs), np.log(ys), 1)
    add('powerreg(%s, %s, 2.5)' % (L(xs), L(ys)), (r'prediction at x = 2.5: y ≈ ' + NUM, math.exp(a2 + b2 * math.log(2.5))))
    b3, a3 = np.polyfit(np.log(xs), ys, 1)
    add('logreg(%s, %s, 2.5)' % (L(xs), L(ys)), (r'prediction at x = 2.5: y ≈ ' + NUM, a3 + b3 * math.log(2.5)))
for _ in range(5):
    m = rnd.randint(2, 4)
    P = np.array([[rnd.randint(1, 9) for _ in range(m)] for _ in range(m)], dtype=float); P = P / P.sum(axis=1, keepdims=True)
    w, v = np.linalg.eig(P.T); k = np.argmin(abs(w - 1)); pi = np.real(v[:, k]); pi = pi / pi.sum()
    Pq = [[round(x, 3) for x in row] for row in P]
    for row in Pq: row[-1] = round(1 - sum(row[:-1]), 3)
    Pn = np.array(Pq); w, v = np.linalg.eig(Pn.T); k = np.argmin(abs(w - 1)); pi = np.real(v[:, k]); pi = pi / pi.sum()
    add('markov(%s)' % ('[' + ', '.join(L(r) for r in Pq) + ']'), *[(r'≈ \[' + (r'[^,\]]*, ' * i) + NUM, pi[i]) for i in range(m)])
for n in [5, 10, 20]:
    add('coupon(%d)' % n, (r'n·Hₙ = ', n * sum(1 / k for k in range(1, n + 1))))
print(json.dumps(cases))
