# Oracle cases for the algebra helpers: discriminant / completing the square / vertex, logarithm laws, sets (Python sets), digits in
# bases up to 36 (int(s, base)), a term of a binomial expansion (sympy), ratios, scientific notation and confidence intervals (scipy).
import json, sys, random, math, itertools
from fractions import Fraction
import sympy as sp
from scipy import stats

seed = int(sys.argv[1]) if len(sys.argv) > 1 else 1
rnd = random.Random(seed)
cases = []
x = sp.symbols('x')
def add(kind, cmd, **kw): cases.append(dict(kind=kind, cmd=cmd, **kw))
def ex(e): return str(e).replace('**', '^')

# ---- quadratics
for _ in range(14):
    a = rnd.choice([1, 1, 2, 3, -1, -2, 4, Fraction(1, 2)]); b = rnd.randint(-9, 9); c = rnd.randint(-9, 9)
    f = ex(sp.expand(sp.nsimplify(a) * x**2 + b * x + c))
    D = b * b - 4 * a * c
    h = Fraction(-b) / (2 * Fraction(a)); k = Fraction(c) - Fraction(b) ** 2 / (4 * Fraction(a))
    add('disc', 'discriminant(%s)' % f, D=float(D))
    add('disc', 'the discriminant of %s = 0' % f, D=float(D))
    add('square', 'completesquare(%s)' % f, f=f, h=float(h), k=float(k), a=float(a))
    add('square', 'complete the square for %s' % f, f=f, h=float(h), k=float(k), a=float(a))
    add('vertex', 'vertex(%s)' % f, h=float(h), k=float(k), up=float(a) > 0)
    add('vertex', 'the vertex of y = %s' % f, h=float(h), k=float(k), up=float(a) > 0)

# ---- logarithm laws
VARS = ['x', 'y', 'z']
def term():
    v = rnd.choice(VARS); e = rnd.choice([1, 2, 3, 2, 'sqrt'])
    return v if e == 1 else ('sqrt(%s)' % v if e == 'sqrt' else '%s^%d' % (v, e))
for _ in range(14):
    fn = rnd.choice(['log', 'ln'])
    num = '*'.join(term() for _ in range(rnd.randint(1, 3))); den = '*'.join(term() for _ in range(rnd.randint(0, 2)))
    if num == den: den = ''
    arg = '(%s)/(%s)' % (num, den) if den else num
    if rnd.random() < 0.3: arg = '%d*%s' % (rnd.choice([2, 3, 5, 100]), arg) if not den else arg
    add('logexpand', 'expand %s(%s)' % (fn, arg), expr='%s(%s)' % (fn, arg))
for _ in range(14):
    fn = rnd.choice(['log', 'ln'])
    terms = []
    for _ in range(rnd.randint(2, 3)):
        c = rnd.choice([1, 2, 3, -1, -2, Fraction(1, 2)])
        terms.append('%s*%s(%s)' % (c, fn, term()))
    add('logcondense', 'condense ' + ' + '.join(terms).replace('+ -', '- '), expr=' + '.join(terms), fn=fn)

# ---- binomial terms
for _ in range(10):
    n = rnd.randint(3, 11); k = rnd.randint(1, n + 1)
    a, b = rnd.choice(['x', '2*x', 'x^2', '3*x']), rnd.choice(['y', '1', '-2', '3', 'y^2'])
    term_ = sp.expand(sp.binomial(n, k - 1) * sp.sympify(a.replace('^', '**'))**(n - k + 1) * sp.sympify(b.replace('^', '**'))**(k - 1))
    add('binomterm', 'binomterm(%s, %s, %d, %d)' % (a, b, n, k), expr=ex(term_))
    add('binomterm', 'the %d%s term of (%s + %s)^%d' % (k, {1: 'st', 2: 'nd', 3: 'rd'}.get(k % 10 if k % 100 not in (11, 12, 13) else 0, 'th'), a, b, n) if not b.startswith('-') else 'binomterm(%s, %s, %d, %d)' % (a, b, n, k), expr=ex(term_))

# ---- sets
def sset(): return sorted(rnd.sample(range(1, 13), rnd.randint(0, 6)))
def lst(s): return '[' + ', '.join(str(v) for v in s) + ']'
def br(s): return '{' + ','.join(str(v) for v in s) + '}'
for _ in range(10):
    A, B = sset(), sset()
    for name, res in [('union', set(A) | set(B)), ('intersection', set(A) & set(B)), ('setdiff', set(A) - set(B)), ('symdiff', set(A) ^ set(B))]:
        add('set', '%s(%s, %s)' % (name, lst(A), lst(B)), res=sorted(res))
    add('set', 'A = %s, B = %s, find A union B' % (br(A), br(B)), res=sorted(set(A) | set(B)))
    add('set', 'A = %s, B = %s. What is A ∩ B?' % (br(A), br(B)), res=sorted(set(A) & set(B)))
    add('set', '%s ∪ %s' % (br(A), br(B)), res=sorted(set(A) | set(B)))
    add('set', 'A = %s, B = %s, find A - B' % (br(A), br(B)), res=sorted(set(A) - set(B)))
    U = sorted(set(A) | set(B) | set(sset()))
    add('set', 'setcomplement(%s, %s)' % (lst(A), lst(U)), res=sorted(set(U) - set(A)))
    add('setsize', 'the number of subsets of %s' % br(A), n=2 ** len(A))
    add('setsize', 'cardinality(%s)' % lst(A + A[:1]), n=len(A))
    add('subset', 'issubset(%s, %s)' % (lst(A), lst(B)), res=set(A) <= set(B))
    add('subset', 'is %s a subset of %s' % (br(A), br(B)), res=set(A) <= set(B))
    add('setsize', 'cartesian(%s, %s)' % (lst(A), lst(B)), n=len(A) * len(B))

# ---- digits in other bases
for _ in range(14):
    base = rnd.choice([2, 8, 16, 16, 5, 12, 20, 36]); v = rnd.randint(1, 10**6)
    digs = []
    t = v
    while t: digs.append(t % base); t //= base
    digs.reverse()
    add('frombase', 'frombase([%s], %d)' % (', '.join(str(d) for d in digs), base), val=v)
    if base == 16: add('frombase', 'hexadecimal %s to decimal' % format(v, 'X'), val=v); add('frombase', 'convert 0x%s to decimal' % format(v, 'x'), val=v)

# ---- ratios and proportions
for _ in range(8):
    a, b = rnd.randint(1, 60), rnd.randint(1, 60); g = math.gcd(a, b)
    add('ratio', 'simplify the ratio %d:%d' % (a, b), res=[a // g, b // g])
    add('ratio', '%d:%d' % (a, b), res=[a // g, b // g])
    c = rnd.randint(2, 40)
    add('proportion', '%d:%d = x:%d' % (a, b, c), x=a * c / b)

# ---- scientific notation
for _ in range(10):
    m = rnd.randint(1, 9999); e = rnd.randint(-8, 9); v = Fraction(m, 1000) * Fraction(10) ** e
    txt = ('%.10f' % float(v)).rstrip('0').rstrip('.') if e < 0 else str(int(v)) if v.denominator == 1 else str(float(v))
    add('sci', 'write %s in scientific notation' % txt, val=float(v))

# ---- confidence intervals from summary numbers
for _ in range(6):
    mean = rnd.choice([50, 12.5, 100, 72]); s = rnd.choice([8, 3.2, 15, 5]); n = rnd.choice([16, 25, 36, 49, 100]); lvl = rnd.choice([90, 95, 99])
    t = stats.t.ppf(1 - (1 - lvl / 100) / 2, n - 1); z = stats.norm.ppf(1 - (1 - lvl / 100) / 2)
    add('ci', 'confidence interval for the mean with sample mean %s, standard deviation %s, n = %d at %d%%' % (mean, s, n, lvl), lo=mean - t * s / math.sqrt(n), hi=mean + t * s / math.sqrt(n))
    add('ci', '%d%% confidence interval for the mean, sample mean %s, population standard deviation %s, n = %d' % (lvl, mean, s, n), lo=mean - z * s / math.sqrt(n), hi=mean + z * s / math.sqrt(n))
    k = rnd.randint(5, n - 3); p = k / n
    add('ci', '%d%% confidence interval for a proportion with %d successes out of %d' % (lvl, k, n), lo=p - z * math.sqrt(p * (1 - p) / n), hi=p + z * math.sqrt(p * (1 - p) / n))
# ---- numbers: perfect numbers, divisors, remainders, rounding, fractions and decimals
PERFECT = {6, 28, 496, 8128}
for _ in range(10):
    v = rnd.choice([6, 28, 496, 12, 18, 20, 8, 9, 15, 100, 945, rnd.randint(2, 3000)])
    ds = [d for d in range(1, v) if v % d == 0]
    add('perfect', 'is %d a perfect number' % v, word='perfect' if sum(ds) == v else 'abundant' if sum(ds) > v else 'deficient')
    add('numval', 'how many factors does %d have' % v, val=len(ds) + 1)
    add('numval', 'sum of the divisors of %d' % v, val=sum(ds) + v)
    r = rnd.randint(1, 200)
    add('perfectsq', 'is %d a perfect square' % (r * r + rnd.choice([0, 0, 1, 2])), yes=None, n=r * r + 0)
for _ in range(8):
    a, b, m = rnd.randint(2, 30), rnd.randint(10, 300), rnd.randint(3, 97)
    add('numval', 'the remainder when %d^%d is divided by %d' % (a, b, m), val=pow(a, b, m))
for _ in range(10):
    v = rnd.uniform(0.1, 9999); k = rnd.randint(1, 4)
    v = round(v, 6)
    from decimal import Decimal, ROUND_HALF_UP
    q = Decimal(str(v)).quantize(Decimal(1).scaleb(-k), rounding=ROUND_HALF_UP)
    if abs(Decimal(str(v)) - q) * 10**k == Decimal('0.5'): continue
    add('numval', 'round %s to %d decimal places' % (v, k), val=float(q))
    sig = rnd.randint(1, 5)
    add('numval', 'round %s to %d significant figures' % (v, sig), val=float('%.*g' % (sig, v)))
    add('numval', 'round %s to the nearest ten' % v, val=float(round(v / 10) * 10) if abs(v / 10 - math.floor(v / 10) - 0.5) > 1e-9 else None)
cases[:] = [c for c in cases if c.get('val', 0) is not None or c['kind'] != 'numval']
for _ in range(10):
    f = Fraction(rnd.randint(1, 400), rnd.choice([2, 4, 5, 8, 10, 20, 25, 100, 3, 7, 9, 11, 12, 13, 6]))
    d = float(f)
    txt = repr(d) if f.denominator in (1, 2, 4, 5, 8, 10, 20, 25, 100) else None
    if txt: add('fracval', 'express %s as a fraction' % txt, val=float(f))
    add('fracval', 'convert %s to a decimal' % f, val=float(f), dec=True)
for _ in range(10):
    p_ = rnd.randint(0, 3); L = rnd.randint(1, 3)
    pre = ''.join(str(rnd.randint(0, 9)) for _ in range(p_)); blk = ''.join(str(rnd.randint(0, 9)) for _ in range(L))
    if len(set(blk)) == 1 and L > 1: continue
    if int(blk) == 0 or blk == '9' * L: continue
    ip = rnd.randint(0, 5)
    val = Fraction(ip) + (Fraction(int(pre or '0'), 10**p_) if p_ else 0) + Fraction(int(blk), (10**L - 1) * 10**p_)
    reps = blk * 3
    add('fracval', 'express %d.%s%s... as a fraction' % (ip, pre, reps), val=float(val))
    add('fracval', 'write %d.%s(%s) as a fraction' % (ip, pre, blk), val=float(val))
for _ in range(8):
    x0, y0, m = rnd.randint(-5, 5), rnd.randint(-5, 5), rnd.randint(-4, 4)
    add('lineslope', 'equation of the line through (%d,%d) with slope %d' % (x0, y0, m), x0=x0, y0=y0, m=m)
for _ in range(6):
    u = [rnd.randint(-5, 5) for _ in range(2)]; v = [rnd.randint(-5, 5) for _ in range(2)]
    add('numval', 'the area of the parallelogram spanned by %s and %s' % (u, v), val=abs(u[0] * v[1] - u[1] * v[0]))
    u3 = [rnd.randint(-4, 4) for _ in range(3)]; v3 = [rnd.randint(-4, 4) for _ in range(3)]; w3 = [rnd.randint(-4, 4) for _ in range(3)]
    cr = [u3[1] * v3[2] - u3[2] * v3[1], u3[2] * v3[0] - u3[0] * v3[2], u3[0] * v3[1] - u3[1] * v3[0]]
    add('numval', 'area of the triangle spanned by %s and %s' % (u3, v3), val=math.sqrt(sum(c * c for c in cr)) / 2)
    add('numval', 'the volume of the parallelepiped spanned by %s, %s and %s' % (u3, v3, w3), val=abs(sum(cr[i] * w3[i] for i in range(3))))
for _ in range(6):
    a, b, c, d = [rnd.randint(-5, 5) for _ in range(4)]
    if a * d - b * c == 0: continue
    x_, y_ = rnd.randint(-6, 6), rnd.randint(-6, 6)
    e, f = a * x_ + b * y_, c * x_ + d * y_
    how = rnd.choice(['using matrices', 'by elimination', 'by substitution'])
    add('system', 'solve the system %sx + %sy = %d, %sx + %sy = %d %s' % (a, b, e, c, d, f, how), x=x_, y=y_)
json.dump(cases, sys.stdout)
