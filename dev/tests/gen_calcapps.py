# Oracle for the calculus applications: sympy / scipy.
import json, random, sys, math
import sympy as sp
from scipy import integrate as si
random.seed(int(sys.argv[1]) if len(sys.argv) > 1 else 1)
x = sp.symbols('x')
R = random.randint
T = []
def add(cmd, t, v, **kw): T.append(dict(cmd=cmd, t=t, v=v, **kw))
def poly(deg):
    return sum(R(-5, 5) * x ** k for k in range(deg + 1)) + R(1, 3) * x ** deg
def ptxt(e): return str(e).replace('**', '^')
for _ in range(25):
    f = poly(R(2, 4))
    if f.is_constant(): continue
    fp = sp.diff(f, x)
    crit = [c for c in sp.Poly(fp, x).nroots(n=15) if abs(sp.im(c)) < 1e-9]
    pts = []
    for c in crit:
        c = float(sp.re(c))
        f2 = float(sp.diff(f, x, 2).subs(x, c))
        if abs(f2) > 1e-7: pts.append([c, float(f.subs(x, c)), 'min' if f2 > 0 else 'max'])
        else: pts.append([c, float(f.subs(x, c)), 'neither'])
    add(f'critical({ptxt(f)}, x)', 'critical', pts)
    a, b = R(-4, -1), R(1, 4)
    vals = [float(f.subs(x, t)) for t in [a, b] + [p[0] for p in pts if a <= p[0] <= b]]
    add(f'critical({ptxt(f)}, x, {a}, {b})', 'absext', [max(vals), min(vals)])
    pt = R(-3, 3)
    m = float(fp.subs(x, pt)); y0 = float(f.subs(x, pt))
    add(f'tangent({ptxt(f)}, x, {pt})', 'tangent', [m, y0 - m * pt])
    f3 = sp.diff(f, x, 2)
    infl = [float(sp.re(c)) for c in sp.Poly(f3, x).nroots(n=15) if abs(sp.im(c)) < 1e-9 and sp.Poly(f3, x).degree() >= 1] if not f3.is_constant() else []
    infl = [c for c in infl if abs(float(sp.diff(f, x, 3).subs(x, c))) > 1e-7]
    add(f'inflection({ptxt(f)})', 'inflection', [[c, float(f.subs(x, c))] for c in infl])
for _ in range(20):
    f = poly(2) ; g = poly(1)
    d = sp.Poly(f - g, x)
    rts = sorted(float(sp.re(r)) for r in d.nroots(n=15) if abs(sp.im(r)) < 1e-9)
    if len(rts) < 2 or abs(rts[-1] - rts[0]) < 1e-6: continue
    area = 0
    for lo, hi in zip(rts, rts[1:]):
        area += si.quad(lambda t: abs(float((f - g).subs(x, t))), lo, hi)[0]
    add(f'areabetween({ptxt(f)}, {ptxt(g)}, x)', 'num', area, tol=1e-6)
    lo, hi = 0, R(1, 3)
    add(f'volumerev({ptxt(abs(g) if False else g)}, x, {lo}, {hi})', 'num', math.pi * si.quad(lambda t: float(g.subs(x, t)) ** 2, lo, hi)[0], tol=1e-6)
    add(f'shells({ptxt(f)}, x, 0, {hi})', 'num', 2 * math.pi * si.quad(lambda t: t * float(f.subs(x, t)), 0, hi)[0], tol=1e-6)
    fl = sp.lambdify(x, sp.sqrt(1 + sp.diff(f, x) ** 2))
    add(f'arclength({ptxt(f)}, x, 0, {hi})', 'num', si.quad(fl, 0, hi)[0], tol=1e-6)
    add(f'avgvalue({ptxt(f)}, x, 0, {hi})', 'num', float(sp.integrate(f, (x, 0, hi))) / hi, tol=1e-6)
for _ in range(15):
    a, b, c, d = R(1, 5), R(-5, 5), R(1, 5), R(-5, 5)
    if a * d - b * c == 0: continue
    f = (a * x + b) / (c * x + d)
    inv = (d * x - b) / (-c * x + a)
    add(f'inversefunction({ptxt(f)})', 'inv', ptxt(f))
    add(f'compose({ptxt(f)}, x^2)', 'compose', [ptxt(f), 'x^2'])
for _ in range(10):
    r = R(2, 20)
    add(f'newton(x^2 - {r}, x, {r})', 'num', math.sqrt(r), tol=1e-7)
json.dump(T, sys.stdout)
