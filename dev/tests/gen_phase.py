# Oracle cases for equilibria and phase portraits: the category of every equilibrium is derived from exact trace / determinant /
# discriminant signs (sympy), the real equilibria from sympy.solve; phase lines from the signs of f on both sides of every root.
import json, sys, random, math
import numpy as np
import sympy as sp

seed = int(sys.argv[1]) if len(sys.argv) > 1 else 1
rnd = random.Random(seed)
cases = []
x, y = sp.symbols('x y')
def cat_of(tr, det, disc, star=False):
    s = lambda v: int(sp.sign(sp.nsimplify(v))) if v != 0 else 0
    if s(det) < 0: return 'saddle'
    if s(det) == 0: return 'zero'
    if s(disc) > 0: return 'sink' if s(tr) < 0 else 'source'
    if s(disc) == 0: return 'star' if star else 'degenerate'
    if s(tr) < 0: return 'spiral-sink'
    if s(tr) > 0: return 'spiral-source'
    return 'centre'
def mtxt(M): return '[[%s, %s], [%s, %s]]' % tuple(M)
# ---- linear: classify
for _ in range(30):
    a, b, c, d = [rnd.randint(-4, 4) for _ in range(4)]
    tr, det = a + d, a * d - b * c; disc = tr * tr - 4 * det
    cases.append(dict(kind='classify', cmd='classify(%s)' % mtxt([a, b, c, d]), cat=cat_of(tr, det, disc, star=(b == 0 and c == 0)), tr=tr, det=det,
                      eig=sorted([float(e.real) for e in np.linalg.eigvals(np.array([[a, b], [c, d]], float))]) if disc >= 0 else None))
for _ in range(6):
    b, c = rnd.randint(1, 4), rnd.randint(1, 4)
    cases.append(dict(kind='classify', cmd='classify(%s)' % mtxt([0, b, -c, 0]), cat='centre', tr=0, det=b * c, eig=None))
for _ in range(4):
    a = rnd.choice([-3, -1, 2, 5]); cases.append(dict(kind='classify', cmd='classify(%s)' % mtxt([a, 0, 0, a]), cat='star', tr=2 * a, det=a * a, eig=[a, a]))
for _ in range(4):
    a = rnd.choice([-3, -1, 2, 5]); cases.append(dict(kind='classify', cmd='classify(%s)' % mtxt([a, 1, 0, a]), cat='degenerate', tr=2 * a, det=a * a, eig=[a, a]))
# ---- phase line y' = f(y)
def stab(f, r, delta):
    l, rr = float(f.subs(y, r - delta)), float(f.subs(y, r + delta))
    if l > 0 and rr < 0: return 'stable'
    if l < 0 and rr > 0: return 'unstable'
    return 'semi'
for _ in range(14):
    roots = sorted(rnd.sample(range(-4, 5), rnd.randint(1, 3)))
    mult = [rnd.choice([1, 1, 2]) for _ in roots]
    lead = rnd.choice([1, -1, 2])
    f = lead * sp.prod([(y - r) ** m for r, m in zip(roots, mult)])
    text = str(sp.expand(f)).replace('**', '^')
    exp = [dict(root=float(r), type=stab(f, r, 0.05)) for r in roots]
    cases.append(dict(kind='line1', cmd='equilibria(%s, y)' % text, eq=exp))
for fexp, rts in [('sin(y)', None), ('y*(1-y)', None), ('y - y^3', None), ('cos(y)', None), ('y*(2-y)*(y+1)', None), ('-y*(y-3)', None)]:
    f = sp.sympify(fexp.replace('^', '**'))
    r_all = []
    xs = np.linspace(-10, 10, 200001)
    fv = sp.lambdify(y, f, 'numpy')(xs)
    for i in range(len(xs) - 1):
        if fv[i] == 0 or fv[i] * fv[i + 1] < 0:
            from scipy.optimize import brentq
            r_all.append(brentq(sp.lambdify(y, f, 'numpy'), xs[i], xs[i + 1], xtol=1e-14))
    r_all = [r for j, r in enumerate(sorted(r_all)) if j == 0 or r - sorted(r_all)[j - 1] > 1e-6]
    exp = [dict(root=float(r), type=stab(f, r, 0.05)) for r in r_all]
    cases.append(dict(kind='line1', cmd='equilibria(%s, y)' % fexp, eq=exp))
# ---- planar systems: library of models with random integer parameters
def system(fx, gy, label):
    sols = sp.solve([fx, gy], [x, y], dict=True)
    J = sp.Matrix([fx, gy]).jacobian([x, y])
    eqs = []
    for s in sols:
        px, py = s.get(x), s.get(y)
        if px is None or py is None: continue
        if not (px.is_real and py.is_real): continue
        if abs(float(px)) > 10 or abs(float(py)) > 10: continue
        Js = J.subs({x: px, y: py})
        tr, det = sp.simplify(Js.trace()), sp.simplify(Js.det()); disc = sp.simplify(tr ** 2 - 4 * det)
        star = (Js[0, 1] == 0 and Js[1, 0] == 0 and Js[0, 0] == Js[1, 1])
        eqs.append(dict(x=float(px), y=float(py), cat=cat_of(tr, det, disc, star)))
    return eqs
def txt(e): return str(e).replace('**', '^')
for _ in range(8):
    a, b, c, d = [rnd.randint(1, 4) for _ in range(4)]
    fx, gy = x * (a - b * y), y * (-c + d * x)
    cases.append(dict(kind='plane', cmd='phaseplane(%s, %s, x, y)' % (txt(fx), txt(gy)), eq=system(fx, gy, 'lv')))
for _ in range(8):
    a, c = rnd.randint(2, 5), rnd.randint(2, 5); b, d = rnd.randint(1, 3), rnd.randint(1, 3)
    if b == 1 and d == 1 and a == c: d = 2
    fx, gy = x * (a - x - b * y), y * (c - d * x - y)
    cases.append(dict(kind='plane', cmd='phaseplane(%s, %s, x, y)' % (txt(fx), txt(gy)), eq=system(fx, gy, 'comp')))
for _ in range(4):
    k = rnd.choice([sp.Rational(1, 2), 1, 2, 0]); fx, gy = y, -sp.sin(x) - k * y
    # equilibria x = n pi (|x| <= 10): n = -3..3
    J = lambda n: sp.Matrix([[0, 1], [-sp.cos(n * sp.pi), -k]])
    eqs = []
    for n in range(-3, 4):
        Js = J(n); tr, det = Js.trace(), Js.det(); disc = tr ** 2 - 4 * det
        eqs.append(dict(x=float(n * math.pi), y=0.0, cat=cat_of(tr, det, disc)))
    cases.append(dict(kind='plane', cmd='phaseplane(y, -sin(x) - %s*y, x, y)' % txt(k), eq=eqs))
for _ in range(6):
    dlt = rnd.choice([0, sp.Rational(1, 4), 1, 2]); fx, gy = y, x - x ** 3 - dlt * y
    cases.append(dict(kind='plane', cmd='phaseplane(y, x - x^3 - %s*y, x, y)' % txt(dlt), eq=system(fx, gy, 'duff')))
for _ in range(6):
    a, b, c, d = [rnd.randint(-3, 3) for _ in range(4)]
    if a * d - b * c == 0: continue
    fx, gy = a * x + b * y + x * y, c * x + d * y - x ** 2
    cases.append(dict(kind='plane', cmd='phaseplane(%s, %s, x, y)' % (txt(fx), txt(gy)), eq=system(fx, gy, 'quad')))
print(json.dumps(cases))
