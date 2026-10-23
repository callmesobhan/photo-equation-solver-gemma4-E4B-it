# Oracle cases for statistics sentences: probabilities of binomial / Poisson / geometric / normal variables with <, <=, =, >, >= and
# ranges, percentiles of a normal, one-sample t / z tests, a proportion test, chi-square on a table, two-sample t (scipy.stats),
# ordered draws without replacement (exact fractions).
import json, sys, random, math
from fractions import Fraction
import numpy as np
from scipy import stats

seed = int(sys.argv[1]) if len(sys.argv) > 1 else 1
rnd = random.Random(seed)
cases = []
def add(kind, cmd, **kw): cases.append(dict(kind=kind, cmd=cmd, **kw))
OPS = ['=', '<', '<=', '>', '>=']
def disc(dist, k, op):
    if op == '=': return dist.pmf(k)
    if op == '<': return dist.cdf(k - 1)
    if op == '<=': return dist.cdf(k)
    if op == '>': return dist.sf(k)
    return dist.sf(k - 1)
for _ in range(14):
    n = rnd.randint(4, 25); p = rnd.choice([0.1, 0.2, 0.25, 0.3, 0.5, 0.6, 0.75]); k = rnd.randint(0, n); op = rnd.choice(OPS)
    d = stats.binom(n, p)
    add('prob', rnd.choice(['P(X %s %d) for a binomial with n = %d and p = %s', 'binomial n = %d, p = %s: P(X %s %d)', 'X ~ Binomial(%d, %s), find P(X %s %d)'][0:1]) % (op, k, n, p) if False else 'P(X %s %d) for a binomial with n = %d and p = %s' % (op, k, n, p), val=float(disc(d, k, op)))
    add('prob', 'X ~ Binomial(%d, %s), find P(X %s %d)' % (n, p, op, k), val=float(disc(d, k, op)))
    a = rnd.randint(0, n - 1); b = rnd.randint(a + 1, n)
    la, lb = rnd.choice(['<', '<=']), rnd.choice(['<', '<='])
    aa = a + (1 if la == '<' else 0); bb = b - (1 if lb == '<' else 0)
    if aa <= bb: add('prob', 'binomial n = %d, p = %s: P(%d %s X %s %d)' % (n, p, a, la, lb, b), val=float(d.cdf(bb) - d.cdf(aa - 1)))
for _ in range(10):
    lam = rnd.choice([1, 2, 3, 4, 5.5, 8]); k = rnd.randint(0, 9); op = rnd.choice(OPS)
    d = stats.poisson(lam)
    add('prob', 'Poisson with mean %s, P(X %s %d)' % (lam, op, k), val=float(disc(d, k, op)))
    add('prob', 'X follows a Poisson distribution with lambda %s, find P(X %s %d)' % (lam, op, k), val=float(disc(d, k, op)))
for _ in range(8):
    p = rnd.choice([0.1, 0.2, 0.25, 0.4, 0.5]); k = rnd.randint(1, 8)
    add('prob', 'geometric distribution with p = %s, probability the first success is on trial %d' % (p, k), val=float(stats.geom(p).pmf(k)))
    add('prob', 'geometric with p = %s, P(X = %d)' % (p, k), val=float(stats.geom(p).pmf(k)))
for _ in range(14):
    mu = rnd.choice([0, 50, 100, 70, 12.5]); sd = rnd.choice([1, 5, 10, 15, 2.5]); a = mu + sd * rnd.choice([-1.5, -1, -0.5, 0.5, 1, 2]); b = a + sd * rnd.choice([0.5, 1, 2])
    d = stats.norm(mu, sd)
    add('prob', 'X is normal with mean %s and sd %s, find P(X < %s)' % (mu, sd, a), val=float(d.cdf(a)))
    add('prob', 'X is normal with mean %s and sd %s, find P(X > %s)' % (mu, sd, a), val=float(d.sf(a)))
    add('prob', 'X is normal with mean %s and sd %s, find P(%s < X < %s)' % (mu, sd, a, b), val=float(d.cdf(b) - d.cdf(a)))
    q = rnd.choice([0.5, 0.75, 0.9, 0.95, 0.99, 0.1])
    add('value', 'find the %dth percentile of a normal distribution with mean %s and sd %s' % (round(q * 100), mu, sd), val=float(d.ppf(q)))
    z = rnd.choice([-2, -1.5, -0.5, 0.5, 1.5, 2.25])
    add('prob', 'P(Z < %s)' % z, val=float(stats.norm.cdf(z)))
    add('prob', 'P(Z > %s)' % z, val=float(stats.norm.sf(z)))
for _ in range(8):
    m = rnd.choice([52, 48.5, 103, 7.2]); mu0 = rnd.choice([50, 50, 100, 7]); s = rnd.choice([4, 5, 12, 1.5]); n = rnd.choice([16, 25, 36, 49, 100])
    t = (m - mu0) / (s / math.sqrt(n)); p2 = 2 * stats.t.sf(abs(t), n - 1)
    add('stat', 'one-sample t test with sample mean %s, hypothesized mean %s, sd %s, n = %d' % (m, mu0, s, n), stat=t, p2=p2)
    zz = (m - mu0) / (s / math.sqrt(n))
    add('stat', 'z test with sample mean %s, mu0 = %s, sigma = %s, n = %d' % (m, mu0, s, n), stat=zz, p2=2 * stats.norm.sf(abs(zz)))
    x = rnd.randint(5, n - 3); p0 = rnd.choice([0.3, 0.5, 0.4]); ph = x / n; zp = (ph - p0) / math.sqrt(p0 * (1 - p0) / n)
    add('stat', 'test whether the proportion is %s given %d successes in %d trials' % (p0, x, n), stat=zp, p2=2 * stats.norm.sf(abs(zp)))
for _ in range(5):
    T = [[rnd.randint(5, 40) for _ in range(rnd.choice([2, 3]))] for _ in range(2)]
    T[1] = (T[1] + [rnd.randint(5, 40)] * 3)[:len(T[0])]
    chi, p, dof, _ = stats.chi2_contingency(np.array(T), correction=False)
    add('stat', 'chi-square test for the table %s' % json.dumps(T).replace(' ', ''), stat=chi, p2=None)
    a = [rnd.randint(2, 12) for _ in range(rnd.randint(4, 7))]; b = [rnd.randint(2, 12) for _ in range(rnd.randint(4, 7))]
    t2 = stats.ttest_ind(a, b, equal_var=False)
    add('stat', 'two-sample t test for %s and %s' % (a, b), stat=float(t2.statistic), p2=None)
for _ in range(8):
    r1, b1 = rnd.randint(3, 8), rnd.randint(2, 8)
    k1, k2, k3 = rnd.randint(1, min(3, r1)), rnd.randint(1, min(2, b1)), 0
    seq = ['red'] * k1 + ['blue'] * k2
    tot = r1 + b1; left = {'red': r1, 'blue': b1}; pr = Fraction(1)
    for c in seq:
        pr *= Fraction(left[c], tot); left[c] -= 1; tot -= 1
    add('prob', 'probability of drawing %d red then %d blue from %d red and %d blue without replacement' % (k1, k2, r1, b1), val=float(pr))
json.dump(cases, sys.stdout)
