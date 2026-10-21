# Oracle for the discrete-math and statistics commands: sympy / scipy / numpy / Fractions.
# Prints a JSON list of {cmd, t, v, tol?} - the command to run and what the answer must be.
import json, random, math, statistics, itertools, sys
from fractions import Fraction
import numpy as np
import sympy as sp
from sympy import ntheory
from sympy.functions.combinatorial.numbers import stirling, bell, catalan, lucas as sp_lucas, subfactorial
from sympy.ntheory import npartitions
from scipy import stats as st

random.seed(int(sys.argv[1]) if len(sys.argv) > 1 else 7)
T = []
def add(cmd, t, v, **kw): T.append(dict(cmd=cmd, t=t, v=v, **kw))
def frac(x): return str(Fraction(x))
R = random.randint

# ---------------- number theory
for _ in range(40):
    n = R(2, 10**R(2, 9))
    add(f'isprime({n})', 'has', 'is prime' if sp.isprime(n) else 'is not prime')
    add(f'nextprime({n})', 'int', str(sp.nextprime(n)))
    add(f'totient({n})', 'int', str(sp.totient(n)))
    add(f'numdivisors({n})', 'int', str(sp.divisor_count(n)))
    add(f'sigma({n})', 'int', str(sp.divisor_sigma(n)))
    add(f'mobius({n})', 'int', str(sp.mobius(n)))
    add(f'radical({n})', 'int', str(math.prod(sp.primefactors(n))))
    if n > 2: add(f'prevprime({n})', 'int', str(sp.prevprime(n)))
for _ in range(30):
    a, m = R(-500, 500), R(2, 300)
    add(f'mod({a}, {m})', 'int', str(a % m))
    if math.gcd(a, m) == 1:
        add(f'modinv({a}, {m})', 'int', str(pow(a, -1, m)))
        add(f'orderof({a}, {m})', 'int', str(sp.n_order(a % m, m) if m > 1 else 1))
    b, e = R(1, 10**R(1, 20)), R(0, 10**R(1, 20))
    add(f'modpow({b}, {e}, {m})', 'int', str(pow(b, e, m)))
for p in [3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 97, 101, 1009]:
    add(f'primitiveroot({p})', 'int', str(sp.primitive_root(p)))
    a = R(1, p - 1)
    add(f'legendre({a}, {p})', 'int', str(sp.legendre_symbol(a, p)))
for _ in range(25):
    k = R(2, 4)
    ms = [R(2, 40) for _ in range(k)]
    rs = [R(0, 60) for _ in range(k)]
    r = ntheory.modular.solve_congruence(*[(rr, mm) for rr, mm in zip(rs, ms)])
    cmd = 'crt([' + ', '.join(map(str, rs)) + '], [' + ', '.join(map(str, ms)) + '])'
    if r is None: add(cmd, 'has', 'No solution')
    else: add(cmd, 'has', f'x ≡ {r[0]} (mod {r[1]})')
for _ in range(30):
    a, b, m = R(1, 60), R(0, 60), R(2, 60)
    sols = [x for x in range(m) if (a * x - b) % m == 0]
    g = math.gcd(a, m)
    cmd = f'congruence({a}x, {b}, {m})'
    if not sols: add(cmd, 'has', 'No solution')
    else:
        m2 = m // g
        add(cmd, 'has', f'x ≡ {sols[0] % m2} (mod {m2})')
for _ in range(25):
    a, b, c = R(1, 40), R(1, 40), R(-60, 60)
    add(f'diophantine({a}x + {b}y, {c})', 'dioph', [a, b, c, math.gcd(a, b)])
# ---------------- counting
for _ in range(30):
    n = R(0, 60); k = R(0, n)
    add(f'ncr({n}, {k})', 'int', str(math.comb(n, k)))
    add(f'npr({n}, {k})', 'int', str(math.perm(n, k)))
    add(f'multiset({max(n,1)}, {k})', 'int', str(math.comb(max(n,1) + k - 1, k)))
    add(f'catalan({k})', 'int', str(catalan(k)))
    add(f'fib({n})', 'int', str(sp.fibonacci(n)))
    add(f'lucas({n})', 'int', str(sp_lucas(n)))
    add(f'derangements({k})', 'int', str(subfactorial(k)))
    add(f'bell({k})', 'int', str(bell(k)))
    add(f'partitions({n})', 'int', str(npartitions(n)))
    if k >= 1: add(f'stirling2({n}, {k})', 'int', str(stirling(n, k, kind=2)) if k <= n else '0')
    if k >= 1: add(f'stirling1({n}, {k})', 'int', str(abs(stirling(n, k, kind=1))))
    add(f'factorial({k})', 'int', str(math.factorial(k)))
    ks = [R(1, 6) for _ in range(R(2, 4))]
    add('multinomial(' + ', '.join(map(str, ks)) + ')', 'int', str(math.factorial(sum(ks)) // math.prod(math.factorial(x) for x in ks)))
for _ in range(20):
    n = R(0, 10**R(1, 12)); b = R(2, 36)
    digs = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    def tb(n, b):
        if n == 0: return '0'
        s = ''
        while n: s = digs[n % b] + s; n //= b
        return s
    add(f'tobase({n}, {b})', 'has', tb(n, b) + ''.join('₀₁₂₃₄₅₆₇₈₉'[int(c)] for c in str(b)))
    b2 = R(2, 9); d = ''.join(str(R(0, b2 - 1)) for _ in range(R(1, 8))); d = d.lstrip('0') or '0'
    add(f'frombase({d}, {b2})', 'int', str(int(d, b2)))
# ---------------- sequences
for _ in range(25):
    deg = R(0, 3)
    co = [R(-4, 4) for _ in range(deg + 1)]
    if co[-1] == 0: co[-1] = 1
    f = lambda n: sum(c * n**i for i, c in enumerate(co))
    N = deg + 3
    add('sequence(' + ', '.join(str(f(i)) for i in range(1, N + 1)) + ')', 'seq', [f(N + 1), f(N + 2), f(N + 3)])
for _ in range(10):
    a, r = R(1, 6), R(2, 4) * random.choice([1, -1])
    N = 5
    add('sequence(' + ', '.join(str(a * r**i) for i in range(N)) + ')', 'seq', [a * r**(N + i) for i in range(3)])
for _ in range(8):
    a, b = R(1, 5), R(1, 5)
    s = [a, b]
    for i in range(7): s.append(s[-1] + s[-2])
    add('sequence(' + ', '.join(map(str, s[:6])) + ')', 'seq', s[6:9])
# ---------------- statistics
def qlist(xs): return '[' + ', '.join(str(x) for x in xs) + ']'
for _ in range(30):
    n = R(3, 12)
    xs = [R(-20, 60) for _ in range(n)]
    add(f'mean({qlist(xs)})', 'frac', frac(Fraction(sum(xs), n)))
    add(f'median({qlist(xs)})', 'frac', frac(Fraction(statistics.median(xs))))
    mean_ = Fraction(sum(xs), n)
    var = sum((Fraction(x) - mean_) ** 2 for x in xs) / (n - 1)
    add(f'variance({qlist(xs)})', 'frac', frac(var))
    add(f'popvariance({qlist(xs)})', 'frac', frac(sum((Fraction(x) - mean_) ** 2 for x in xs) / n))
    add(f'stdev({qlist(xs)})', 'num', float(statistics.stdev(xs)), tol=1e-6)
    add(f'popstdev({qlist(xs)})', 'num', float(statistics.pstdev(xs)), tol=1e-6)
    s = sorted(xs); h = len(s) // 2
    lo, up = s[:h], s[h + (len(s) % 2):]
    q1, q3 = statistics.median(lo), statistics.median(up)
    add(f'iqr({qlist(xs)})', 'frac', frac(Fraction(q3) - Fraction(q1)))
    p = R(0, 100)
    add(f'percentile({qlist(xs)}, {p})', 'num', float(np.percentile(xs, p)), tol=1e-6)
for _ in range(15):
    n = R(4, 10)
    xs = [R(0, 30) for _ in range(n)]; ys = [R(0, 30) for _ in range(n)]
    if len(set(xs)) < 2 or len(set(ys)) < 2: continue
    r = float(np.corrcoef(xs, ys)[0, 1])
    add(f'correlation({qlist(xs)}, {qlist(ys)})', 'num', r, tol=1e-6)
    sl, ic = np.polyfit(xs, ys, 1)
    add(f'linreg({qlist(xs)}, {qlist(ys)}, 7)', 'num', float(sl * 7 + ic), tol=1e-6, which='Prediction')
    add(f'covariance({qlist(xs)}, {qlist(ys)})', 'num', float(np.cov(xs, ys)[0, 1]), tol=1e-6)
for _ in range(25):
    n = R(1, 40); p = Fraction(R(1, 19), 20); k = R(0, n)
    P = float(p)
    add(f'binompdf({n}, {p}, {k})', 'num', float(st.binom.pmf(k, n, P)), tol=1e-6)
    add(f'binomcdf({n}, {p}, {k})', 'num', float(st.binom.cdf(k, n, P)), tol=1e-6)
    lam = R(1, 20) / 2
    add(f'poissonpdf({lam}, {k})', 'num', float(st.poisson.pmf(k, lam)), tol=1e-6)
    add(f'poissoncdf({lam}, {k})', 'num', float(st.poisson.cdf(k, lam)), tol=1e-6)
    add(f'geometpdf({p}, {k+1})', 'num', float(st.geom.pmf(k + 1, P)), tol=1e-6)
    NN = R(10, 60); KK = R(1, NN); nn = R(1, NN); kk = R(0, min(KK, nn))
    add(f'hyperpdf({NN}, {KK}, {nn}, {kk})', 'num', float(st.hypergeom.pmf(kk, NN, KK, nn)), tol=1e-6)
for _ in range(40):
    x = random.uniform(-4, 4); mu = random.uniform(-10, 10); sg = random.uniform(0.2, 9)
    xs = round(x, 3); mus = round(mu, 2); sgs = round(sg, 2)
    add(f'normalcdf({xs}, {mus}, {sgs})', 'num', float(st.norm.cdf(xs, mus, sgs)), tol=1e-6)
    add(f'normalpdf({xs}, {mus}, {sgs})', 'num', float(st.norm.pdf(xs, mus, sgs)), tol=1e-6, which='density')
    p = round(random.uniform(0.0005, 0.9995), 4)
    add(f'invnorm({p}, {mus}, {sgs})', 'num', float(st.norm.ppf(p, mus, sgs)), tol=1e-6)
    df = R(1, 60)
    t = round(random.uniform(-5, 5), 3)
    add(f'tcdf({t}, {df})', 'num', float(st.t.cdf(t, df)), tol=1e-6)
    add(f'invt({p}, {df})', 'num', float(st.t.ppf(p, df)), tol=1e-6)
    c = round(random.uniform(0.01, 40), 3)
    add(f'chi2cdf({c}, {df})', 'num', float(st.chi2.cdf(c, df)), tol=1e-6)
    add(f'invchi2({p}, {df})', 'num', float(st.chi2.ppf(p, df)), tol=1e-6)
    d1, d2 = R(1, 30), R(1, 30); f = round(random.uniform(0.1, 6), 3)
    add(f'fcdf({f}, {d1}, {d2})', 'num', float(st.f.cdf(f, d1, d2)), tol=1e-6)
for _ in range(10):
    m, s, n = round(random.uniform(10, 90), 1), round(random.uniform(1, 12), 1), R(5, 80)
    mu0 = round(m + random.uniform(-4, 4), 1)
    t = (m - mu0) / (s / math.sqrt(n))
    add(f'ttest({m}, {s}, {n}, {mu0})', 'num', float(2 * st.t.sf(abs(t), n - 1)), tol=1e-6, which='two-tailed')
    z = (m - mu0) / (s / math.sqrt(n))
    add(f'ztest({m}, {mu0}, {s}, {n})', 'num', float(2 * st.norm.sf(abs(z))), tol=1e-6, which='two-tailed')
    lv = random.choice([0.9, 0.95, 0.99])
    zc = st.norm.ppf((1 + lv) / 2); tc = st.t.ppf((1 + lv) / 2, n - 1)
    add(f'zinterval({m}, {s}, {n}, {lv})', 'interval', [m - zc * s / math.sqrt(n), m + zc * s / math.sqrt(n)])
    add(f'tinterval({m}, {s}, {n}, {lv})', 'interval', [m - tc * s / math.sqrt(n), m + tc * s / math.sqrt(n)])
for _ in range(6):
    tab = [[R(5, 50) for _ in range(R(2, 4))]]
    cols = len(tab[0]); tab += [[R(5, 50) for _ in range(cols)] for _ in range(R(1, 3))]
    chi, p, dof, _e = st.chi2_contingency(tab, correction=False)
    add('chisqtest([' + ', '.join(qlist(r) for r in tab) + '])', 'num', float(p), tol=1e-5, which='p-value')
    obs = [R(5, 60) for _ in range(R(3, 6))]
    ex = [sum(obs) / len(obs)] * len(obs)
    chi, p = st.chisquare(obs)
    add(f'chisqtest({qlist(obs)})', 'num', float(p), tol=1e-5, which='p-value')
json.dump(T, sys.stdout)
