# Oracle cases for parametric / polar / vector calculus (sympy + scipy.integrate.quad).
import json, sys, random, math
import sympy as sp
from scipy import integrate

seed = int(sys.argv[1]) if len(sys.argv) > 1 else 1
rnd = random.Random(seed)
t = sp.symbols('t')
x, y, z = sp.symbols('x y z')
cases = []
def s(e): return str(e).replace('**', '^').replace('log(', 'ln(')
def quad(f, a, b): return integrate.quad(f, a, b, epsabs=1e-11, epsrel=1e-11, limit=200)[0]

PAR = [
    (lambda a, b: a * t**2 + b * t, lambda a, b: t**3 - a),
    (lambda a, b: sp.cos(a * t), lambda a, b: sp.sin(b * t)),
    (lambda a, b: sp.exp(t), lambda a, b: a * t**2 + 1),
    (lambda a, b: t - sp.sin(t), lambda a, b: 1 - sp.cos(t)),
    (lambda a, b: a * t, lambda a, b: sp.sin(t) + b),
    (lambda a, b: t**2 + 1, lambda a, b: t**3 - 3 * t),
    (lambda a, b: sp.exp(-t) * a, lambda a, b: sp.exp(t)),
    (lambda a, b: sp.cos(t)**3, lambda a, b: sp.sin(t)**3),
]
for _ in range(14):
    xf, yf = rnd.choice(PAR); a = rnd.randint(1, 3); b = rnd.randint(1, 3)
    X, Y = xf(a, b), yf(a, b)
    t0 = rnd.choice([0.5, 1, 1.5, 2, sp.Rational(1, 2)])
    dx, dy = sp.diff(X, t), sp.diff(Y, t)
    if abs(float(dx.subs(t, t0))) < 1e-3: continue
    sl = float((dy / dx).subs(t, t0)); d2 = float((sp.diff(dy / dx, t) / dx).subs(t, t0))
    cases.append({'cmd': 'paramdiff(%s, %s, t, %s)' % (s(X), s(Y), s(t0)), 'kind': 'slope', 'expect': sl, 'expect2': d2})
for _ in range(14):
    xf, yf = rnd.choice(PAR); a = rnd.randint(1, 3); b = rnd.randint(1, 3)
    X, Y = xf(a, b), yf(a, b)
    lo = rnd.choice([0, 0, 1]); hi = lo + rnd.choice([1, 2, 3])
    fx = sp.lambdify(t, sp.diff(X, t)); fy = sp.lambdify(t, sp.diff(Y, t))
    L = quad(lambda u: math.hypot(fx(u), fy(u)), lo, hi)
    cases.append({'cmd': 'paramlength(%s, %s, t, %d, %d)' % (s(X), s(Y), lo, hi), 'kind': 'value', 'expect': L})
    fa = sp.lambdify(t, Y * sp.diff(X, t))
    cases.append({'cmd': 'paramarea(%s, %s, t, %d, %d)' % (s(X), s(Y), lo, hi), 'kind': 'value', 'expect': quad(fa, lo, hi)})
POL = [lambda a: 1 + a * sp.cos(t), lambda a: a * sp.sin(2 * t), lambda a: a * sp.cos(3 * t), lambda a: a + sp.sin(t), lambda a: t, lambda a: a * sp.sin(t), lambda a: sp.exp(t / 4) * a, lambda a: 2 + a * sp.cos(t)]
for _ in range(14):
    r = rnd.choice(POL)(rnd.randint(1, 3))
    lo = rnd.choice([0, 0]); hi = rnd.choice([sp.pi, 2 * sp.pi, sp.pi / 2, 1, 2])
    fr = sp.lambdify(t, r); fd = sp.lambdify(t, sp.diff(r, t))
    h = float(hi)
    cases.append({'cmd': 'polararea(%s, t, 0, %s)' % (s(r), s(hi)), 'kind': 'value', 'expect': quad(lambda u: fr(u) ** 2 / 2, 0, h)})
    cases.append({'cmd': 'polarlength(%s, t, 0, %s)' % (s(r), s(hi)), 'kind': 'value', 'expect': quad(lambda u: math.hypot(fr(u), fd(u)), 0, h)})
CUR = [lambda a: [sp.cos(t), sp.sin(t), a * t], lambda a: [t, t**2, t**3], lambda a: [sp.exp(t) * sp.cos(t), sp.exp(t) * sp.sin(t), sp.exp(t)], lambda a: [a * t, sp.cos(t), sp.sin(t)], lambda a: [t**2, t, a], lambda a: [sp.cos(a * t), sp.sin(a * t), t**2]]
for _ in range(12):
    rv = sp.Matrix(rnd.choice(CUR)(rnd.randint(1, 3))); t0 = rnd.choice([0.5, 1, 2, sp.Rational(3, 2)])
    v = rv.diff(t); a = v.diff(t); j = a.diff(t)
    cr = v.cross(a)
    nv = float(sp.sqrt(v.dot(v)).subs(t, t0)); nc = float(sp.sqrt(cr.dot(cr)).subs(t, t0))
    if nv < 1e-6 or nc < 1e-6: continue
    kappa = nc / nv**3
    tau = float(cr.dot(j).subs(t, t0)) / nc**2
    cases.append({'cmd': 'curvature(%s, t, %s)' % ('[' + ', '.join(s(c) for c in rv) + ']', s(t0)), 'kind': 'kappa', 'expect': kappa})
    cases.append({'cmd': 'tnb(%s, t, %s)' % ('[' + ', '.join(s(c) for c in rv) + ']', s(t0)), 'kind': 'tnb', 'expect': kappa, 'expect2': tau})
    cases.append({'cmd': 'velocity(%s, t, %s)' % ('[' + ', '.join(s(c) for c in rv) + ']', s(t0)), 'kind': 'speed', 'expect': nv})
FUN = [x**2, sp.sin(x), sp.exp(x), x**3 - x, sp.log(x), 1 / x, sp.sqrt(x)]
for _ in range(8):
    f = rnd.choice(FUN); x0 = rnd.choice([1, 2, sp.Rational(1, 2), 3])
    k = float((abs(sp.diff(f, x, 2)) / (1 + sp.diff(f, x)**2)**sp.Rational(3, 2)).subs(x, x0))
    cases.append({'cmd': 'curvature(%s, x, %s)' % (s(f), s(x0)), 'kind': 'kappa', 'expect': k})
# line integrals
for _ in range(10):
    P = sum(rnd.randint(-2, 2) * m for m in [x, y, x * y, y**2, x**2, 1]); Q = sum(rnd.randint(-2, 2) * m for m in [x, y, x * y, y**2, x**2, 1])
    rx = rnd.choice([t, sp.cos(t), t**2, 2 * t + 1]); ry = rnd.choice([t**2, sp.sin(t), t, 1 - t])
    lo, hi = 0, rnd.choice([1, 2])
    integrand = P.subs({x: rx, y: ry}) * sp.diff(rx, t) + Q.subs({x: rx, y: ry}) * sp.diff(ry, t)
    f = sp.lambdify(t, integrand)
    cases.append({'cmd': 'lineintegral([%s, %s], [%s, %s], t, %d, %d)' % (s(P), s(Q), s(rx), s(ry), lo, hi), 'kind': 'value', 'expect': quad(f, lo, hi)})
    g = sum(rnd.randint(1, 2) * m for m in [x, y, x * y]); gf = sp.lambdify(t, g.subs({x: rx, y: ry}) * sp.sqrt(sp.diff(rx, t)**2 + sp.diff(ry, t)**2))
    cases.append({'cmd': 'lineintegral(%s, [%s, %s], t, %d, %d)' % (s(g), s(rx), s(ry), lo, hi), 'kind': 'value', 'expect': quad(gf, lo, hi)})
# potentials
for _ in range(10):
    f = sum(rnd.randint(-3, 3) * m for m in [x**2 * y, x * y**2, x * y, x**3, y**2, x * y * z, z**2 * x, sp.exp(x) * y])
    dim = 3 if f.has(z) else 2
    vars_ = [x, y, z][:dim]
    F = [sp.diff(f, v) for v in vars_]
    if all(c == 0 for c in F): continue
    cases.append({'cmd': 'potential([%s])' % ', '.join(s(c) for c in F), 'kind': 'potential', 'F': [s(c) for c in F], 'dim': dim})
for _ in range(4):
    P = x * y + rnd.randint(1, 3) * y; Q = rnd.randint(1, 3) * x**2 + y
    cases.append({'cmd': 'potential([%s, %s])' % (s(P), s(Q)), 'kind': 'notconservative'})
print(json.dumps(cases))
