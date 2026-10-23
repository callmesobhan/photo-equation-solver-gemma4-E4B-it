# Oracle cases for the textbook helpers: linear approximation, the mean value / Rolle / intermediate value theorems, sums of patterned
# series, means and variances of the standard distributions, conditional probability sentences, counting phrases, radian conversions,
# fractions combined into one, sums with factorials. Oracles: sympy / mpmath / scipy / math / fractions.
import json, sys, random, math
from fractions import Fraction
import sympy as sp
import mpmath as mp
from scipy.optimize import brentq

seed = int(sys.argv[1]) if len(sys.argv) > 1 else 1
rnd = random.Random(seed)
cases = []
x = sp.symbols('x')
def add(kind, cmd, **kw): cases.append(dict(kind=kind, cmd=cmd, **kw))
def ex(e): return str(e).replace('**', '^')

# ---- linear approximation
FUN = [('sqrt(x)', sp.sqrt(x), [1, 4, 9, 16, 25, 2]), ('sin(x)', sp.sin(x), [0, 1, 2, 3]), ('cos(x)', sp.cos(x), [0, 1, 2]), ('exp(x)', sp.exp(x), [0, 1, 2, -1]),
       ('ln(x)', sp.log(x), [1, 2, 3, 5]), ('x^3', x**3, [1, 2, -1, 3]), ('1/x', 1 / x, [1, 2, 4, -2]), ('atan(x)', sp.atan(x), [0, 1, 2]), ('tan(x)', sp.tan(x), [0, 1])]
for _ in range(24):
    s, f, pts = rnd.choice(FUN); a = rnd.choice(pts)
    fa = float(f.subs(x, a)); da = float(sp.diff(f, x).subs(x, a))
    if rnd.random() < 0.5:
        x0 = round(a + rnd.choice([-0.3, -0.1, 0.1, 0.2, 0.05]), 3)
        if s in ('ln(x)', 'sqrt(x)') and x0 <= 0: continue
        add('linapprox', 'linapprox(%s, x, %s, %s)' % (s, a, x0), fa=fa, da=da, a=a, x0=x0, actual=float(f.subs(x, x0)))
    else:
        add('linapprox', 'linapprox(%s, x, %s)' % (s, a), fa=fa, da=da, a=a)

# ---- mean value, Rolle, intermediate value theorem
def roots_in(expr, lo, hi):
    g = sp.lambdify(x, expr, 'math')
    xs = [lo + (hi - lo) * i / 4000 for i in range(1, 4000)]
    out = []
    prev = None
    for t in xs:
        try: v = g(t)
        except Exception: prev = None; continue
        if prev is not None and prev[1] * v < 0:
            try: out.append(brentq(g, prev[0], t))
            except Exception: pass
        elif v == 0: out.append(t)
        prev = (t, v)
    return out
POLY = ['x^2', 'x^3 - x', 'x^3 - 3*x', 'x^4 - 2*x^2', 'x^2 - 4*x + 1', '2*x^3 - 6*x', 'x^3 + x^2', 'x^4 - 4*x']
OTHER = ['sin(x)', 'exp(x)', 'sqrt(x)', 'ln(x)', 'x*exp(-x)', 'cos(x)']
for _ in range(16):
    f = sp.sympify(rnd.choice(POLY).replace('^', '**') if rnd.random() < 0.7 else rnd.choice(OTHER))
    s = ex(f).replace('log', 'ln')
    a, b = sorted(rnd.sample(range(1, 6) if 'sqrt' in s or 'ln' in s else range(-3, 5), 2))
    if 'sin' in s or 'cos' in s: a, b = 0, rnd.choice([2, 3, 5, 6])
    rate = (f.subs(x, b) - f.subs(x, a)) / (b - a)
    cs = roots_in(sp.diff(f, x) - rate, a, b)
    add('mvt', 'mvt(%s, x, %s, %s)' % (s, a, b), f=s, a=a, b=b, rate=float(rate), cs=cs)
for _ in range(10):
    a, b = sorted(rnd.sample(range(-4, 5), 2))
    g = rnd.choice(['1', '2', 'x + 5', '3'])
    f = sp.expand((x - a) * (x - b) * sp.sympify(g))
    cs = roots_in(sp.diff(f, x), a, b)
    add('rolle', 'rolle(%s, x, %s, %s)' % (ex(f), a, b), a=a, b=b, cs=cs, applies=True)
add('rolle', 'rolle(x^2, x, 0, 2)', a=0, b=2, cs=roots_in(sp.diff(x**2, x) - 2, 0, 2), applies=False)
for _ in range(10):
    c = [rnd.randint(-3, 3) for _ in range(3)] + [rnd.choice([1, 2])]
    f = c[3] * x**3 + c[2] * x**2 + c[1] * x + c[0]
    a, b = sorted(rnd.sample(range(-3, 4), 2))
    fa, fb = float(f.subs(x, a)), float(f.subs(x, b))
    k = rnd.choice([0, 0, round((fa + fb) / 2, 1), fb + 3 * (1 if fb > fa else -1)])
    inside = min(fa, fb) <= k <= max(fa, fb)
    add('ivt', 'ivt(%s, x, %s, %s, %s)' % (ex(f), a, b, k), f=ex(f), a=a, b=b, k=k, inside=inside)

# ---- sums of patterned series
for _ in range(10):
    a1 = rnd.randint(-5, 9); d = rnd.choice([1, 2, 3, 5, -2, -3, Fraction(1, 2)]); n = rnd.randint(4, 40)
    terms = [a1 + d * i for i in range(3)]; last = a1 + d * (n - 1)
    add('seriessum', 'seriessum([%s], %s)' % (', '.join(str(t) for t in terms), last), val=float(n * (a1 + last) / 2))
for _ in range(10):
    a1 = rnd.choice([1, 2, 3, 5, Fraction(1, 2)]); r = rnd.choice([2, 3, -2, Fraction(1, 2), Fraction(1, 3), Fraction(-1, 2)]); n = rnd.randint(4, 10)
    terms = [a1 * r**i for i in range(3)]; last = a1 * r**(n - 1)
    add('seriessum', 'seriessum([%s], %s)' % (', '.join(str(t) for t in terms), last), val=float(a1 * (1 - r**n) / (1 - r)))
    if abs(r) < 1: add('seriessum', 'seriessum([%s], oo)' % ', '.join(str(t) for t in terms), val=float(a1 / (1 - r)))
PAT = [('1/n^2', lambda n: 1 / n**2, 1), ('1/n^4', lambda n: 1 / n**4, 1), ('1/n!', lambda n: 1 / mp.factorial(n), 0), ('(-1)^(n+1)/n', lambda n: (-1)**(n + 1) / n, 1),
       ('(-1)^(n+1)/(2*n-1)', lambda n: (-1)**(n + 1) / (2 * n - 1), 1), ('n/2^n', lambda n: n / 2**n, 1), ('1/(n*(n+1))', lambda n: 1 / (n * (n + 1)), 1), ('(-1)^n/n!', lambda n: (-1)**n / mp.factorial(n), 0)]
for text, fn, start in PAT:
    terms = [mp.mpf(fn(start + i)) for i in range(4)]
    show = []
    for t in terms:
        fr = Fraction(float(t)).limit_denominator(100000)
        show.append(str(fr))
    val = float(mp.nsum(lambda n: fn(n), [start, mp.inf]))
    add('seriessum', 'seriessum([%s], oo)' % ', '.join(show), val=val)
for c in [1, 2, 3, -1, Fraction(1, 2)]:
    add('factsum', 'sum(%s^n/n!, n, 0, oo)' % (('(%s)' % c) if c != 1 else 1), val=float(mp.e**float(c)))

# ---- distributions
for _ in range(6):
    n = rnd.randint(2, 30); p = rnd.choice([0.1, 0.2, 0.25, 0.3, 0.5, 0.75])
    add('dist', 'binomstats(%d, %s)' % (n, p), mean=n * p, var=n * p * (1 - p))
for _ in range(4):
    lam = rnd.choice([1, 2, 3.5, 4, 10]); add('dist', 'poissonstats(%s)' % lam, mean=lam, var=lam)
for _ in range(4):
    p = rnd.choice([0.1, 0.2, 0.25, 0.5]); add('dist', 'geomstats(%s)' % p, mean=1 / p, var=(1 - p) / p**2)
for s in [4, 6, 8, 10, 12, 20]:
    add('dist', 'diestats(%d)' % s, mean=(s + 1) / 2, var=(s * s - 1) / 12)
add('dist', 'expected value of a fair die', mean=3.5, var=35 / 12)
for _ in range(3):
    n = rnd.randint(5, 40); p = rnd.choice([0.2, 0.3, 0.5])
    add('dist', 'the mean and variance of a binomial distribution with n = %d and p = %s' % (n, p), mean=n * p, var=n * p * (1 - p))
    add('dist', 'expected value of a binomial distribution with %d trials and probability %s' % (n, p), mean=n * p, var=n * p * (1 - p))

# ---- probability sentences (answers computed with exact fractions)
def F(v): return Fraction(v).limit_denominator(1000)
def pr(v): return str(float(v)) if Fraction(v).denominator in (1, 2, 4, 5, 8, 10, 20, 25, 50, 100) else str(Fraction(v))
for _ in range(8):
    pb = F(rnd.choice([0.2, 0.25, 0.4, 0.5, 0.6, 0.8])); pab = pb * F(rnd.choice([0.25, 0.5, 0.75, 0.1]))
    add('prob', 'P(A|B) if P(A and B) = %s and P(B) = %s' % (pr(pab), pr(pb)), val=float(pab / pb))
    pa = F(rnd.choice([0.1, 0.2, 0.3, 0.4, 0.5])); pba = F(rnd.choice([0.5, 0.6, 0.8, 0.9])); pbn = F(rnd.choice([0.05, 0.1, 0.2, 0.3]))
    tot = pba * pa + pbn * (1 - pa)
    add('prob', "Bayes theorem: P(A) = %s, P(B|A) = %s, P(B|not A) = %s, find P(A|B)" % (pr(pa), pr(pba), pr(pbn)), val=float(pba * pa / tot))
    add('prob', 'P(B) if P(A) = %s, P(B|A) = %s and P(B|not A) = %s' % (pr(pa), pr(pba), pr(pbn)), val=float(tot))
    pb2 = F(rnd.choice([0.2, 0.3, 0.4, 0.5])); pab2 = pa * pb2 * F(rnd.choice([0, 1, 1]))
    add('prob', 'P(A or B) if P(A) = %s, P(B) = %s and P(A and B) = %s' % (pr(pa), pr(pb2), pr(pab2)), val=float(pa + pb2 - pab2))
    add('prob', 'P(A or B) for independent events with P(A) = %s and P(B) = %s' % (pr(pa), pr(pb2)), val=float(pa + pb2 - pa * pb2))
    add('prob', 'P(A and B) for independent events A and B with P(A) = %s and P(B) = %s' % (pr(pa), pr(pb2)), val=float(pa * pb2))
    add('prob', 'P(not A) if P(A) = %s' % pr(pa), val=float(1 - pa))

# ---- counting phrases
for _ in range(5):
    n = rnd.randint(3, 9); add('count', 'how many ways can %d people sit in a row' % n, val=math.factorial(n))
    add('count', 'how many ways can %d people sit around a round table' % n, val=math.factorial(n - 1))
    k = rnd.randint(2, n - 1)
    add('count', 'how many ways can a committee of %d be chosen from %d people' % (k, n), val=math.comb(n, k))
    add('count', 'how many ways to choose %d from %d' % (k, n), val=math.comb(n, k))
    add('count', 'how many ways can a president and vice president be chosen from %d people' % n, val=math.perm(n, 2))

# ---- radian / degree conversions
for _ in range(8):
    p, q = rnd.randint(1, 11), rnd.choice([2, 3, 4, 5, 6, 8, 9, 10, 12])
    add('conv', 'convert %dpi/%d radians to degrees' % (p, q), val=180 * p / q, unit='degrees')
    d = rnd.choice([15, 30, 45, 60, 72, 90, 120, 135, 150, 210, 225, 300])
    add('conv', 'convert %d degrees to radians' % d, val=math.radians(d), unit='radians')

# ---- fractions combined into one
for _ in range(8):
    p, q = rnd.sample(range(-4, 5), 2)
    if p == q: continue
    a_, b_ = rnd.randint(1, 5), rnd.randint(-5, 5)
    e = '%d/(x-(%d)) + %d/(x-(%d))' % (a_, p, b_, q)
    add('combine', 'combine ' + e.replace('--', '+'), expr=e)
json.dump(cases, sys.stdout)
