# Oracle cases for exact surds and trigonometry: exact values of the six functions at multiples of pi/n, arithmetic with square roots
# (rationalised, denested), trigonometric simplification / expansion / product-to-sum, and trig functions of inverse trig functions.
# The expected numbers come from Python's math module; the solver's printed exact forms are evaluated by the battery and compared.
import json, sys, random, math
from fractions import Fraction

seed = int(sys.argv[1]) if len(sys.argv) > 1 else 1
rnd = random.Random(seed)
cases = []
def add(kind, cmd, **kw): cases.append(dict(kind=kind, cmd=cmd, **kw))
FN = {'sin': math.sin, 'cos': math.cos, 'tan': math.tan,
      'cot': lambda t: 1 / math.tan(t), 'sec': lambda t: 1 / math.cos(t), 'csc': lambda t: 1 / math.sin(t)}
def undefined(fn, t):
    s, c = math.sin(t), math.cos(t)
    return (fn in ('tan', 'sec') and abs(c) < 1e-9) or (fn in ('cot', 'csc') and abs(s) < 1e-9)

# ---- exact values
for _ in range(120):
    den = rnd.choice([1, 2, 3, 4, 5, 6, 8, 10, 12, 5, 8, 10, 12])
    num = rnd.randint(-3 * den, 3 * den)
    fn = rnd.choice(list(FN))
    t = math.pi * num / den
    if num == 0 and rnd.random() < 0.5: continue
    add('exact', '%s(%d*pi/%d)' % (fn, num, den), val=None if undefined(fn, t) else FN[fn](t), undefined=undefined(fn, t))
for _ in range(30):
    deg = Fraction(rnd.choice([15, 18, 36, 45, 54, 72, 75, 105, 135, 165, 22.5, 67.5, 30, 60, 120, 150, 210, 225, 300]) * rnd.choice([1, 1, -1, 3]))
    fn = rnd.choice(list(FN))
    t = math.radians(float(deg))
    add('exact', '%s(%s°)' % (fn, (str(float(deg)) if deg.denominator != 1 else str(int(deg)))), val=None if undefined(fn, t) else FN[fn](t), undefined=undefined(fn, t))

# ---- arithmetic with square roots
RAD = [2, 3, 5, 6, 7, 8, 10, 12, 18, 20, 24, 27, 45, 50, 72]
def leaf():
    r = rnd.random()
    if r < 0.45:
        k = rnd.choice(RAD)
        return ('sqrt(%d)' % k, math.sqrt(k))
    k = rnd.randint(1, 9)
    return (str(k), float(k))
def build(depth):
    if depth == 0: return leaf()
    op = rnd.choice(['+', '-', '*', '/', '+', '*', '^'])
    a = build(depth - 1)
    if op == '^':
        e = rnd.choice([2, 3])
        return ('(%s)^%d' % (a[0], e), a[1] ** e)
    b = build(depth - 1) if rnd.random() < 0.8 else leaf()
    if op == '/' and abs(b[1]) < 0.3: op = '*'
    v = a[1] + b[1] if op == '+' else a[1] - b[1] if op == '-' else a[1] * b[1] if op == '*' else a[1] / b[1]
    return ('(%s%s%s)' % (a[0], op, b[0]), v)
n = 0
while n < 90:
    s, v = build(rnd.choice([1, 2, 2, 3]))
    if abs(v) > 1e5 or abs(v) < 1e-6 or len(s) > 90: continue
    # a denominator that is (numerically) zero would be a division by zero
    add('surd', s, val=v); n += 1
for _ in range(24):
    u, v = rnd.sample(range(1, 13), 2)
    if math.isqrt(u * v) ** 2 == u * v: continue
    k = rnd.choice([1, 1, 2, 3])
    sign = rnd.choice(['+', '-'])
    # sqrt(k*(u+v) +/- 2k sqrt(uv)) is sqrt(k) * |sqrt(u) +/- sqrt(v)|
    val = math.sqrt(k * (u + v) + (1 if sign == '+' else -1) * 2 * k * math.sqrt(u * v))
    add('denest', 'sqrt(%d %s %d*sqrt(%d))' % (k * (u + v), sign, 2 * k, u * v), val=val, nested=(k == 1))

# ---- trig of inverse trig
INV = [('asin', math.asin, 'arcsin'), ('acos', math.acos, 'arccos'), ('atan', math.atan, 'arctan')]
def frac():
    p = rnd.choice([1, 2, 3, 4, 5, -1, -2, -3, -4]); q = rnd.choice([2, 3, 4, 5, 6, 7, 9, 10])
    return p, q
for _ in range(60):
    terms = []; total = 0.0
    for _ in range(rnd.choice([1, 1, 2])):
        name, f, _ = rnd.choice(INV)
        p, q = frac()
        if name != 'atan' and abs(p) > q: p = rnd.choice([1, -1]) * rnd.randint(1, q - 1) if q > 1 else 1
        k = rnd.choice([1, 1, 2, 3, -1, -2])
        terms.append('%s*%s(%d/%d)' % (k, name, p, q) if k != 1 else '%s(%d/%d)' % (name, p, q))
        total += k * f(p / q)
    if rnd.random() < 0.25:
        terms.append('pi/2'); total += math.pi / 2
    fn = rnd.choice(list(FN))
    if undefined(fn, total): continue
    add('invtrig', '%s(%s)' % (fn, ' + '.join(terms)), val=FN[fn](total))

# ---- trigonometric simplification / expansion / product-to-sum (checked by equivalence at random points)
def atom(kinds=('sin', 'cos', 'tan', 'cot', 'sec', 'csc'), ks=(1, 1, 2, 3)):
    fn = rnd.choice(kinds); k = rnd.choice(ks)
    shift = rnd.choice(['', '', '', ' + pi/2', ' - pi/2', ' + pi'])
    arg = ('x' if k == 1 else '%d*x' % k) + shift
    a = '%s(%s)' % (fn, arg)
    e = rnd.choice([1, 1, 1, 2, 2, 3])
    return a if e == 1 else '%s^%d' % (a, e)
def prod(m):
    return '*'.join(atom() for _ in range(m))
for _ in range(80):
    r = rnd.random()
    if r < 0.4: e = ' + '.join(rnd.choice(['', '-']) + prod(rnd.randint(1, 2)) for _ in range(rnd.randint(1, 3))).replace('+ -', '- ')
    elif r < 0.8: e = '(%s)/(%s)' % (' + '.join(prod(rnd.randint(1, 2)) for _ in range(rnd.randint(1, 2))), prod(rnd.randint(1, 2)))
    else: e = '(%s)^2 + (%s)^2' % (atom(('sin', 'cos', 'tan')), atom(('sin', 'cos', 'sec')))
    add('simplify', 'simplify(%s)' % e, expr=e)
VARS2 = ['a', 'b']
for _ in range(40):
    fn = rnd.choice(['sin', 'cos', 'tan'] * 2 + ['cot', 'sec', 'csc'])
    r = rnd.random()
    if r < 0.5: arg = 'a %s b' % rnd.choice(['+', '-'])
    elif r < 0.8: arg = '%d*a' % rnd.choice([2, 3, 4]) + rnd.choice(['', ' + b'])
    else: arg = 'a + b + c'
    add('expand', 'expand(%s(%s))' % (fn, arg), expr='%s(%s)' % (fn, arg))
for _ in range(40):
    k1, k2 = rnd.randint(1, 4), rnd.randint(1, 4)
    r = rnd.random()
    if r < 0.4: e = '%s(%d*x)*%s(%d*x)' % (rnd.choice(['sin', 'cos']), k1, rnd.choice(['sin', 'cos']), k2)
    elif r < 0.7: e = '%s(x)^%d' % (rnd.choice(['sin', 'cos']), rnd.randint(2, 5))
    else: e = '%s(x)^%d*%s(x)^%d' % ('sin', rnd.randint(1, 3), 'cos', rnd.randint(1, 3))
    add('tosum', 'tosum(%s)' % e, expr=e)
json.dump(cases, sys.stdout)
