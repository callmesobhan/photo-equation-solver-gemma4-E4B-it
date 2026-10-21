# Oracle cases for the numerical-methods module (exact Fractions, numpy, scipy).
import json, sys, random, math
from fractions import Fraction as Fr
import numpy as np
from scipy.interpolate import CubicSpline

seed = int(sys.argv[1]) if len(sys.argv) > 1 else 1
rnd = random.Random(seed)
cases = []

def fr(s, d=1): return Fr(s) / d if d != 1 else Fr(s)
def solver_expr(e): return e.replace('**', '^')
def pyeval(e, env): return eval(e, {'__builtins__': {}}, env)

RHS = ['x + y', 'x*y', 'y - x**2', 'x - y', '(x + y)/2', '2*x*y', 'y*(1 - y)', 'x**2 + y**2', '(x + 1)*y', '3*x - 2*y + 1', 'y/(x + 1)', 'x**2 - y']
H = ['0.1', '0.25', '0.2', '0.5', '1/4', '0.05']
for _ in range(34):
    e = rnd.choice(RHS)
    x0 = rnd.choice(['0', '1', '0.5', '-1', '2'])
    y0 = rnd.choice(['1', '0', '2', '0.5', '-1'])
    h = rnd.choice(H)
    steps = rnd.randint(1, 8)
    xe = fr(x0) + steps * fr(h)
    method = rnd.choice(['euler', 'heun', 'rk2', 'rk4'])
    try:
        x, y, hh = fr(x0), fr(y0), fr(h)
        f = lambda a, b: pyeval(e, {'x': a, 'y': b})
        for _i in range(steps):
            if method == 'euler': y1 = y + hh * f(x, y)
            elif method == 'heun':
                k1 = f(x, y); k2 = f(x + hh, y + hh * k1); y1 = y + hh / 2 * (k1 + k2)
            elif method == 'rk2':
                k1 = f(x, y); y1 = y + hh * f(x + hh / 2, y + hh / 2 * k1)
            else:
                k1 = f(x, y); k2 = f(x + hh / 2, y + hh / 2 * k1); k3 = f(x + hh / 2, y + hh / 2 * k2); k4 = f(x + hh, y + hh * k3)
                y1 = y + hh / 6 * (k1 + 2 * k2 + 2 * k3 + k4)
            x += hh; y = y1
            if abs(y) > 10**6 or y.denominator.bit_length() > 250: raise ZeroDivisionError
        if abs(y) > 10**6: continue
    except ZeroDivisionError:
        continue
    xe_s = str(float(xe)) if xe.denominator != 1 else str(int(xe))
    cases.append({'cmd': '%s(%s, %s, %s, %s, %s)' % (method, solver_expr(e), x0, y0, h, xe_s), 'expect_frac': '%d/%d' % (y.numerator, y.denominator), 'expect': float(y), 'line': 0})

# quadrature rules
FP = ['x**2', 'x**3 - x', '1/x', '1/(1 + x**2)', 'x**4', '2*x + 1', '1/(x + 1)']
FN = [('sin(x)', np.sin), ('exp(x)', np.exp), ('sqrt(x)', np.sqrt), ('cos(x)**2', lambda t: np.cos(t) ** 2), ('log(x)', None)]
for _ in range(36):
    kind = rnd.choice(['trapezoid', 'simpson', 'midpointrule', 'leftsum', 'rightsum'])
    n = rnd.choice([2, 4, 6, 8, 10]) if kind == 'simpson' else rnd.randint(1, 10)
    a = rnd.choice(['0', '1', '0.5', '2']); b = str(fr(a) + rnd.choice([1, 2, 3, fr(1, 2)]))
    if rnd.random() < 0.6:
        e = rnd.choice(FP)
        if '1/x' in e or '1/(x + 1)' in e: a = rnd.choice(['1', '0.5', '2']); b = str(fr(a) + rnd.choice([1, 2]))
        A, B = fr(a), fr(b); h = (B - A) / n
        f = lambda t: pyeval(e, {'x': t})
        if kind == 'trapezoid': v = h / 2 * (f(A) + 2 * sum(f(A + i * h) for i in range(1, n)) + f(B))
        elif kind == 'simpson': v = h / 3 * (f(A) + 4 * sum(f(A + i * h) for i in range(1, n, 2)) + 2 * sum(f(A + i * h) for i in range(2, n, 2)) + f(B))
        elif kind == 'midpointrule': v = h * sum(f(A + (i + fr(1, 2)) * h) for i in range(n))
        elif kind == 'leftsum': v = h * sum(f(A + i * h) for i in range(n))
        else: v = h * sum(f(A + i * h) for i in range(1, n + 1))
        bs = str(float(B)) if B.denominator != 1 else str(int(B))
        cases.append({'cmd': '%s(%s, %s, %s, %d)' % (kind, solver_expr(e), a, bs, n), 'expect_frac': '%d/%d' % (v.numerator, v.denominator), 'expect': float(v), 'line': 0})
    else:
        name, fn = rnd.choice(FN[:4])
        a = rnd.choice(['0', '0.5', '1']); b = str(fr(a) + rnd.choice([1, 2]))
        A, B = float(fr(a)), float(fr(b)); h = (B - A) / n
        xs = A + h * np.arange(n + 1)
        if kind == 'trapezoid': v = h / 2 * (fn(xs[0]) + 2 * fn(xs[1:-1]).sum() + fn(xs[-1]))
        elif kind == 'simpson': v = h / 3 * (fn(xs[0]) + 4 * fn(xs[1:-1:2]).sum() + 2 * fn(xs[2:-1:2]).sum() + fn(xs[-1]))
        elif kind == 'midpointrule': v = h * fn(xs[:-1] + h / 2).sum()
        elif kind == 'leftsum': v = h * fn(xs[:-1]).sum()
        else: v = h * fn(xs[1:]).sum()
        cases.append({'cmd': '%s(%s, %s, %s, %d)' % (kind, name.replace('**', '^'), a, b, n), 'expect': float(v), 'line': 0})

# interpolation, least squares, splines
for _ in range(14):
    m = rnd.randint(2, 6)
    xs = sorted(rnd.sample(range(-5, 8), m))
    ys = [rnd.randint(-6, 9) for _ in range(m)]
    x0 = fr(rnd.randint(-8, 14), rnd.choice([1, 2, 4]))
    # Lagrange value, exact
    v = Fr(0)
    for i in range(m):
        t = Fr(ys[i])
        for j in range(m):
            if i != j: t *= (x0 - xs[j]) / Fr(xs[i] - xs[j])
        v += t
    x0s = str(float(x0)) if x0.denominator != 1 else str(int(x0))
    cases.append({'cmd': 'interpolate(%s, %s, %s)' % (xs, ys, x0s), 'expect_frac': '%d/%d' % (v.numerator, v.denominator), 'expect': float(v), 'line': 1})
for _ in range(10):
    m = rnd.randint(4, 8)
    xs = sorted(rnd.sample(range(-4, 9), m)); ys = [rnd.randint(-5, 9) for _ in range(m)]
    deg = rnd.randint(1, min(3, m - 1)); x0 = rnd.randint(-3, 8)
    c = np.polyfit(xs, ys, deg)
    cases.append({'cmd': 'polyfit(%s, %s, %d, %d)' % (xs, ys, deg, x0), 'expect': float(np.polyval(c, x0)), 'line': 1})
for _ in range(10):
    m = rnd.randint(3, 7)
    xs = sorted(rnd.sample(range(-4, 12), m)); ys = [rnd.randint(-6, 9) for _ in range(m)]
    cs = CubicSpline(xs, ys, bc_type='natural')
    x0 = rnd.uniform(xs[0], xs[-1]); x0 = round(x0 * 4) / 4
    cases.append({'cmd': 'spline(%s, %s, %s)' % (xs, ys, x0), 'expect': float(cs(x0)), 'line': -1})

# root finders (same float iteration as the solver)
def bis(f, a, b, steps):
    fa = f(a); c = a
    for _ in range(steps):
        c = (a + b) / 2; fc = f(c)
        if fc == 0: break
        if fa * fc < 0: b = c
        else: a = c; fa = fc
    return c
for _ in range(8):
    k = rnd.choice([2, 3, 5]); steps = rnd.randint(3, 12)
    cases.append({'cmd': 'bisection(x^3 - %d, 1, 3, %d)' % (k, steps), 'expect': bis(lambda t: t ** 3 - k, 1.0, 3.0, steps), 'line': 0})
for _ in range(6):
    k = rnd.choice([2, 3, 5, 7]); steps = rnd.randint(2, 6)
    f = lambda t: t * t - k
    x0, x1 = 1.0, 3.0
    for _i in range(steps):
        if f(x1) == f(x0): break
        x2 = x1 - f(x1) * (x1 - x0) / (f(x1) - f(x0)); x0, x1 = x1, x2
        if abs(f(x1)) < 1e-14: break
    cases.append({'cmd': 'secant(x^2 - %d, 1, 3, %d)' % (k, steps), 'expect': x1, 'line': 0})
for _ in range(5):
    x = 1.0; steps = rnd.randint(3, 10)
    for _i in range(steps + 1):
        gx = math.cos(x)
        if abs(gx - x) < 1e-12: x = gx; break
        x = gx
    cases.append({'cmd': 'fixedpoint(cos(x), 1, %d)' % steps, 'expect': x, 'line': 0})
for _ in range(6):
    h = rnd.choice([0.1, 0.05, 0.2, 0.01]); x0 = rnd.choice([0.5, 1, 2]); fn = rnd.choice([('sin(x)', math.sin), ('exp(x)', math.exp), ('ln(x)', math.log), ('x^3', lambda t: t ** 3)])
    cases.append({'cmd': 'numdiff(%s, %s, %s)' % (fn[0], x0, h), 'expect': (fn[1](x0 + h) - fn[1](x0 - h)) / (2 * h), 'line': 0})
print(json.dumps(cases))
