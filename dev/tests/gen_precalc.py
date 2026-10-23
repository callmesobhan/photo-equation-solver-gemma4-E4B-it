# Oracle cases for the precalculus helpers: sinusoids (closed formulas), linear independence / span / nullity (sympy), rational zeros (roots
# chosen in advance), end behaviour (sympy limits), even / odd (sympy), coefficients (sympy Poly) and the range of a function (ranges known by construction).
import json, sys, random, math
import sympy as sp
from fractions import Fraction

seed = int(sys.argv[1]) if len(sys.argv) > 1 else 1
rnd = random.Random(seed)
cases = []
x = sp.symbols('x')
def add(kind, cmd, **kw): cases.append(dict(kind=kind, cmd=cmd, **kw))
def txt(v): return '[' + ', '.join(str(a) for a in v) + ']'
def ex(e): return str(e).replace('**', '^')
# ---- sinusoids
for _ in range(16):
    fn = rnd.choice(['sin', 'cos', 'sin', 'cos', 'tan'])
    A = rnd.choice([1, 2, 3, -1, -2, 0.5, 4]); B = rnd.choice([1, 2, 3, -1, -2, 0.5, 4, 3])
    C = rnd.choice([0, 1, -1, 2, 'pi', '-pi/2', 'pi/3', '2*pi']); D = rnd.choice([0, 1, -2, 3])
    Cn = float(sp.sympify(str(C).replace('pi', 'pi')).evalf()) if C != 0 else 0.0
    arg = '%s*x' % B + ('' if C == 0 else (' + %s' % C if not str(C).startswith('-') else ' - %s' % str(C)[1:]))
    f = '%s*%s(%s)%s' % (A, fn, arg, '' if D == 0 else (' + %d' % D if D > 0 else ' - %d' % -D))
    per = (math.pi if fn == 'tan' else 2 * math.pi) / abs(B)
    add('sinusoid', 'sinusoid(%s)' % f, fn=fn, amp=abs(A), period=per, shift=-Cn / B, D=D)
# ---- independence / span / nullity
for _ in range(14):
    n = rnd.randint(2, 4); k = rnd.randint(2, 4)
    vs = [[rnd.randint(-3, 3) for _ in range(n)] for _ in range(k)]
    if rnd.random() < 0.5 and k >= 3:
        c = [rnd.randint(-2, 2) for _ in range(k - 1)]
        vs[-1] = [sum(c[j] * vs[j][i] for j in range(k - 1)) for i in range(n)]
    M = sp.Matrix(vs).T
    add('indep', 'independent(%s)' % ', '.join(txt(v) for v in vs), indep=(M.rank() == k), rank=M.rank())
for _ in range(14):
    n = rnd.randint(2, 4); k = rnd.randint(1, 3)
    gens = [[rnd.randint(-3, 3) for _ in range(n)] for _ in range(k)]
    if rnd.random() < 0.6:
        c = [rnd.randint(-3, 3) for _ in range(k)]
        target = [sum(c[j] * gens[j][i] for j in range(k)) for i in range(n)]
    else: target = [rnd.randint(-3, 3) for _ in range(n)]
    M = sp.Matrix(gens).T; aug = M.row_join(sp.Matrix(target))
    add('span', 'inspan(%s, %s)' % (txt(target), ', '.join(txt(g) for g in gens)), inspan=(aug.rank() == M.rank()), gens=gens, target=target)
for _ in range(8):
    r, c = rnd.randint(1, 4), rnd.randint(2, 5)
    A = [[rnd.randint(-2, 2) for _ in range(c)] for _ in range(r)]
    if rnd.random() < 0.5 and r >= 2: A[-1] = [2 * v for v in A[0]]
    add('nullity', 'nullity(%s)' % json.dumps(A), nullity=c - sp.Matrix(A).rank(), rank=sp.Matrix(A).rank())
# ---- rational zeros
for _ in range(12):
    roots = [sp.Rational(rnd.randint(-6, 6), rnd.choice([1, 1, 2, 3])) for _ in range(rnd.randint(1, 3))]
    poly = sp.Integer(1)
    for r in roots: poly = poly * (x - r)
    if rnd.random() < 0.5: poly = poly * (x ** 2 + rnd.randint(1, 4))   # a factor without rational zeros
    if rnd.random() < 0.4: poly = poly * (x - roots[0])               # a double root
    P = sp.Poly(sp.expand(poly * sp.ilcm(*[sp.fraction(c)[1] for c in sp.Poly(sp.expand(poly), x).all_coeffs()])), x)
    exp = sorted(set(sp.roots(P, filter='Q').keys()))
    add('ratroots', 'ratroots(%s)' % ex(P.as_expr()), roots=[float(r) for r in exp])
# ---- end behaviour
FUNCS = []
for _ in range(10):
    deg = rnd.randint(1, 5); c = [rnd.randint(-4, 4) for _ in range(deg)] + [rnd.choice([-3, -2, -1, 1, 2, 3])]
    FUNCS.append(sum(c[i] * x ** i for i in range(deg + 1)))
for _ in range(6):
    p = rnd.randint(0, 3); q = rnd.randint(1, 3)
    num = sum(rnd.randint(-3, 3) * x ** i for i in range(p)) + rnd.choice([1, 2, -2, 3]) * x ** p
    den = sum(rnd.randint(-3, 3) * x ** i for i in range(q)) + rnd.choice([1, 2, -1, 3]) * x ** q
    FUNCS.append(num / den)
FUNCS += [sp.exp(x), sp.exp(-x) + 1, sp.atan(x), 1 / x]
for f in FUNCS:
    lp, lm = sp.limit(f, x, sp.oo), sp.limit(f, x, -sp.oo)
    conv = lambda v: 'inf' if v == sp.oo else '-inf' if v == -sp.oo else float(v)
    add('endbeh', 'endbehavior(%s)' % ex(sp.expand(f) if f.is_polynomial() else f), plus=conv(lp), minus=conv(lm))
# ---- even / odd
EVEN = ['x^2', 'cos(x)', 'abs(x)', 'x^4 + x^2', 'x*sin(x)', 'x^2*cos(x)', 'exp(x) + exp(-x)', 'x^2/(x^2+1)', '3']
ODD = ['x^3', 'sin(x)', 'x*cos(x)', 'x/(x^2+1)', 'x^3 - x', 'x^5 + 2*x', 'tan(x)', 'x*abs(x)']
NEITHER = ['x^2 + x', 'exp(x)', 'x + 1', 'sin(x) + 1', 'x^3 + x^2', '(x+1)^2', 'x*exp(x)']
for f in rnd.sample(EVEN, 5): add('parity', 'evenodd(%s)' % f, par='even')
for f in rnd.sample(ODD, 5): add('parity', 'evenodd(%s)' % f, par='odd')
for f in rnd.sample(NEITHER, 4): add('parity', 'evenodd(%s)' % f, par='neither')
# ---- coefficients
for _ in range(14):
    a, b = rnd.randint(-3, 3) or 1, rnd.randint(-3, 3) or 2; n = rnd.randint(2, 7)
    kind = rnd.choice(['bin', 'prod'])
    if kind == 'bin': f = (a + b * x) ** n
    else: f = (x + a) ** rnd.randint(1, 4) * (x ** 2 + b)
    P = sp.Poly(sp.expand(f), x); k = rnd.randint(0, P.degree())
    add('coeff', 'coeff(%s, x, %d)' % (ex(f), k), value=int(P.coeff_monomial(x ** k)))
# ---- range of a function (known by construction)
def rng(lo, hi, lo_o=True, hi_o=True): return dict(lo=lo, hi=hi, lo_o=lo_o, hi_o=hi_o)
RNGS = []
for _ in range(3):
    a = rnd.choice([1, 2, -1, -3, 0.5]); h = rnd.randint(-3, 3); k = rnd.randint(-4, 4)
    f = '%s*(x - %s)^2 + %s' % (a, h, k)
    RNGS.append((f, [rng(k, 'inf', False, True)] if a > 0 else [rng('-inf', k, True, False)]))
for _ in range(2): RNGS.append(('x^3 - %d*x + %d' % (rnd.randint(1, 4), rnd.randint(-3, 3)), [rng('-inf', 'inf')]))
for _ in range(2):
    c = rnd.randint(1, 4); RNGS.append(('1/(x^2 + %d)' % c, [rng(0, 1.0 / c, True, False)]))
for _ in range(3):
    a, b, c, d = [rnd.randint(1, 4) for _ in range(4)]
    if a * d == b * c: d += 1
    RNGS.append(('(%d*x + %d)/(%d*x + %d)' % (a, b, c, d), [rng('-inf', a / c), rng(a / c, 'inf')]))
for _ in range(2):
    a, b, k = rnd.randint(1, 4), rnd.randint(-5, 5), rnd.randint(-3, 3); RNGS.append(('sqrt(%d*x + %d) + %d' % (a, b, k), [rng(k, 'inf', False, True)]))
for _ in range(2):
    h, k = rnd.randint(-4, 4), rnd.randint(-3, 3); RNGS.append(('abs(x - %d) + %d' % (h, k), [rng(k, 'inf', False, True)]))
for _ in range(2):
    A, B, D = rnd.choice([1, 2, 3, 4]), rnd.choice([1, 2, 3]), rnd.randint(-3, 3); RNGS.append(('%d*sin(%d*x) + %d' % (A, B, D), [rng(D - A, D + A, False, False)]))
for _ in range(2):
    a, c = rnd.choice([1, 2, -1]), rnd.randint(-3, 3); RNGS.append(('exp(%d*x) + %d' % (a, c), [rng(c, 'inf', True, True)]))
RNGS.append(('ln(x - %d) + %d' % (rnd.randint(-2, 3), rnd.randint(-3, 3)), [rng('-inf', 'inf')]))
for _ in range(2):
    a, b = rnd.randint(1, 4), rnd.randint(1, 4); m = 2 * math.sqrt(a * b); RNGS.append(('%d*x + %d/x' % (a, b), [rng('-inf', -m, True, False), rng(m, 'inf', False, True)]))
RNGS.append(('sqrt(%d - x^2)' % (rr := rnd.choice([1, 4, 9, 16])), [rng(0, math.sqrt(rr), False, False)]))
RNGS.append(('x^2/(x^2 + %d)' % rnd.randint(1, 5), [rng(0, 1, False, True)]))
RNGS.append(('tan(%d*x)' % rnd.randint(1, 3), [rng('-inf', 'inf')]))
for f, r in RNGS: add('range', 'rangeof(%s)' % f, ranges=r)
print(json.dumps(cases))
