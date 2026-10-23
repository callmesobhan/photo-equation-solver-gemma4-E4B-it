# Oracle cases for regression inference and the rank / exact tests (scipy.stats).
import json, sys, random, math
import numpy as np
from scipy import stats

seed = int(sys.argv[1]) if len(sys.argv) > 1 else 1
rnd = random.Random(seed)
cases = []
def add(kind, cmd, **kw): cases.append(dict(kind=kind, cmd=cmd, **kw))
def txt(v): return '[' + ', '.join(str(x) for x in v) + ']'
# ---- regression inference
for _ in range(12):
    n = rnd.randint(5, 12)
    xs = [rnd.randint(0, 20) for _ in range(n)]
    if len(set(xs)) < 3: continue
    b0, b1 = rnd.randint(-5, 5), rnd.choice([-3, -1, 0.5, 2, 4])
    ys = [round(b0 + b1 * x + rnd.gauss(0, 3), 1) for x in xs]
    conf = rnd.choice([0.9, 0.95, 0.99]); x0 = rnd.randint(0, 20)
    r = stats.linregress(xs, ys)
    df = n - 2
    t = stats.t.ppf((1 + conf) / 2, df)
    xm = np.mean(xs); sxx = np.sum((np.array(xs) - xm) ** 2)
    resid = np.array(ys) - (r.intercept + r.slope * np.array(xs))
    s = math.sqrt(np.sum(resid ** 2) / df)
    yh = r.intercept + r.slope * x0
    sm = s * math.sqrt(1 / n + (x0 - xm) ** 2 / sxx); sp_ = s * math.sqrt(1 + 1 / n + (x0 - xm) ** 2 / sxx)
    add('reginf', 'reginf(%s, %s, %s, %d)' % (txt(xs), txt(ys), conf, x0), slope=r.slope, seb=r.stderr, pb=r.pvalue, tb=r.slope / r.stderr,
        cib=[r.slope - t * r.stderr, r.slope + t * r.stderr], a=r.intercept, sea=r.intercept_stderr, pa=2 * stats.t.sf(abs(r.intercept / r.intercept_stderr), df),
        cia=[r.intercept - t * r.intercept_stderr, r.intercept + t * r.intercept_stderr], r2=r.rvalue ** 2, s=s, yh=yh, cim=[yh - t * sm, yh + t * sm], pi=[yh - t * sp_, yh + t * sp_])
# ---- Mann-Whitney
for _ in range(24):
    n1, n2 = rnd.randint(3, 14), rnd.randint(3, 14)
    hi = rnd.choice([15, 40, 200])
    x = [rnd.randint(0, hi) for _ in range(n1)]; y = [rnd.randint(0, hi) + rnd.choice([0, 0, 3]) for _ in range(n2)]
    ties = len(set(x + y)) < len(x + y)
    method = 'asymptotic' if ((n1 > 8 and n2 > 8) or ties) else 'exact'
    res = {a: stats.mannwhitneyu(x, y, use_continuity=True, alternative=a, method=method) for a in ('two-sided', 'greater', 'less')}
    add('mwu', 'mannwhitney(%s, %s)' % (txt(x), txt(y)), U1=float(res['two-sided'].statistic), U2=n1 * n2 - float(res['two-sided'].statistic),
        p2=float(res['two-sided'].pvalue), pr=float(res['greater'].pvalue), pl=float(res['less'].pvalue), method=method)
# ---- Wilcoxon
for _ in range(24):
    n = rnd.randint(5, 30)
    hi = rnd.choice([10, 40, 500])
    d = [rnd.randint(-hi // 3, hi) for _ in range(n)]
    nz = [v for v in d if v != 0]
    if len(nz) < 4: continue
    absvals = [abs(v) for v in nz]
    ties = len(set(absvals)) < len(absvals)
    method = 'exact' if (not ties and len(nz) == len(d) and len(d) <= 50) else 'asymptotic'
    form = rnd.choice(['one', 'two'])
    if form == 'one':
        cmd = 'wilcoxon(%s)' % txt(d); xs, ys = d, None
    else:
        ys = [rnd.randint(0, 60) for _ in d]; xs = [a + b for a, b in zip(d, ys)]
        cmd = 'wilcoxon(%s, %s)' % (txt(xs), txt(ys))
    kw = dict(method=method, correction=True, zero_method='wilcox')
    res = {a: stats.wilcoxon(xs, ys, alternative=a, **kw) for a in ('two-sided', 'greater', 'less')}
    dd = np.array(d)
    wp = float(np.sum(stats.rankdata(np.abs(dd[dd != 0]))[dd[dd != 0] > 0])); wm = float(np.sum(stats.rankdata(np.abs(dd[dd != 0]))[dd[dd != 0] < 0]))
    add('wilcoxon', cmd, wp=wp, wm=wm, p2=float(res['two-sided'].pvalue), pr=float(res['greater'].pvalue), pl=float(res['less'].pvalue), method=method)
# ---- Kruskal-Wallis
for _ in range(14):
    k = rnd.randint(2, 4)
    hi = rnd.choice([12, 30, 100])
    groups = [[rnd.randint(0, hi) + g * rnd.choice([0, 2]) for _ in range(rnd.randint(3, 9))] for g in range(k)]
    r = stats.kruskal(*groups)
    add('kruskal', 'kruskalwallis(%s)' % ', '.join(txt(g) for g in groups), H=float(r.statistic), p=float(r.pvalue), df=k - 1)
# ---- sign test
for _ in range(12):
    n = rnd.randint(5, 25); m0 = rnd.randint(2, 8)
    xs = [rnd.randint(0, 12) for _ in range(n)]
    d = [v - m0 for v in xs]
    pos = sum(1 for v in d if v > 0); tot = sum(1 for v in d if v != 0)
    if tot < 3: continue
    add('sign', 'signtest(%s, %d)' % (txt(xs), m0), pos=pos, neg=tot - pos, p2=stats.binomtest(pos, tot, 0.5).pvalue,
        pr=stats.binomtest(pos, tot, 0.5, alternative='greater').pvalue, pl=stats.binomtest(pos, tot, 0.5, alternative='less').pvalue)
# ---- Fisher exact
for _ in range(16):
    t = [[rnd.randint(0, 12) for _ in range(2)] for _ in range(2)]
    if sum(t[0]) == 0 or sum(t[1]) == 0 or t[0][0] + t[1][0] == 0 or t[0][1] + t[1][1] == 0: continue
    o, p2 = stats.fisher_exact(t)
    add('fisher', 'fisherexact(%s)' % json.dumps(t), odds=(None if o in (float('inf'), 0) and (t[0][1] * t[1][0] == 0) else float(o)), p2=p2,
        pr=stats.fisher_exact(t, alternative='greater')[1], pl=stats.fisher_exact(t, alternative='less')[1], inf=bool(t[0][1] * t[1][0] == 0 and t[0][0] * t[1][1] > 0))
# ---- McNemar
for _ in range(10):
    a, b, c, d = [rnd.randint(1, 60) for _ in range(4)]
    chi = (abs(b - c) - 1) ** 2 / (b + c)
    pe = min(1.0, 2 * stats.binom.cdf(min(b, c), b + c, 0.5))
    add('mcnemar', 'mcnemar(%s)' % json.dumps([[a, b], [c, d]]), chi=chi, pchi=stats.chi2.sf(chi, 1), pexact=pe)
print(json.dumps(cases))
