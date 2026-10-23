# Oracle cases for "equation with an interval for the unknown": roots found by a fine scan + brentq (numpy / scipy), and polynomials with
# integer roots chosen in advance (so the expected set is known by construction, double roots included).
import json, sys, random, math
import numpy as np
from scipy.optimize import brentq

seed = int(sys.argv[1]) if len(sys.argv) > 1 else 1
rnd = random.Random(seed)
cases = []
def roots_of(f, lo, hi, lo_inc=True, hi_inc=True, n=400000):
    xs = np.linspace(lo, hi, n + 1)
    with np.errstate(all='ignore'):
        ys = f(xs)
    out = []
    for i in range(n):
        a, b = ys[i], ys[i + 1]
        if not (np.isfinite(a) and np.isfinite(b)): continue
        if a == 0: out.append(xs[i])
        elif a * b < 0:
            out.append(brentq(lambda t: float(f(np.array([t]))[0]), xs[i], xs[i + 1], xtol=1e-14))
    if abs(float(f(np.array([hi]))[0])) < 1e-12: out.append(hi)
    if abs(float(f(np.array([lo]))[0])) < 1e-12: out.append(lo)
    out = sorted(set(round(r, 9) for r in out))
    res = []
    for r in out:
        if r < lo - 1e-9 or r > hi + 1e-9: continue
        if abs(r - lo) < 1e-9 and not lo_inc: continue
        if abs(r - hi) < 1e-9 and not hi_inc: continue
        res.append(r)
    return res
def bound(v):
    for k in (1, 2, 3, 4, 6):
        for m in range(-24, 25):
            if abs(v - m * math.pi / k) < 1e-12 and m != 0: return ('%d*pi/%d' % (m, k) if k != 1 else '%d*pi' % m)
    return str(v)
def add(eq, lo, hi, loi, hii, f, form, exact=None):
    if form == 'rel': tx = '%s, %s %s x %s %s' % (eq, lo, '<=' if loi else '<', '<=' if hii else '<', hi)
    elif form == 'in': tx = '%s for x in %s%s, %s%s' % (eq, '[' if loi else '(', lo, hi, ']' if hii else ')')
    else: tx = 'solve %s for %s %s x %s %s' % (eq, lo, '<=' if loi else '<', '<=' if hii else '<', hi)
    lov = float(eval(lo.replace('pi', 'math.pi'))); hiv = float(eval(hi.replace('pi', 'math.pi')))
    r = exact if exact is not None else roots_of(f, lov, hiv, loi, hii)
    cases.append(dict(text=tx, roots=r))
FORMS = ['rel', 'in', 'solve']
for _ in range(20):
    a = rnd.choice([1, 2, 3]); b = rnd.choice([1, 2, 3]); c = rnd.choice([0, 0.5, 1, -1]); d = rnd.choice([-0.5, 0, 0.5, 1, 0.25]) * a
    fn = rnd.choice(['sin', 'cos'])
    eq = '%s*%s(%s*x + %s) = %s' % (a, fn, b, c, d)
    ff = (lambda t, a=a, b=b, c=c, d=d, fn=fn: a * (np.sin if fn == 'sin' else np.cos)(b * t + c) - d)
    lo = rnd.choice(['0', '-pi', '-2*pi', '1']); hi = rnd.choice(['2*pi', 'pi', '3*pi', '6'])
    if float(eval(lo.replace('pi', 'math.pi'))) >= float(eval(hi.replace('pi', 'math.pi'))): continue
    loi, hii = rnd.random() < 0.5, rnd.random() < 0.5
    ex = None
    if abs(d) == abs(a):                # touching roots: the sign-change scan cannot see them, so list them from the closed form
        base = (math.pi / 2 if (fn == 'sin') == (d > 0) else 0.0) if fn == 'sin' or d > 0 else math.pi
        if fn == 'sin': base = math.pi / 2 if d > 0 else -math.pi / 2
        else: base = 0.0 if d > 0 else math.pi
        lov = float(eval(lo.replace('pi', 'math.pi'))); hiv = float(eval(hi.replace('pi', 'math.pi')))
        ex = []
        for k in range(-60, 61):
            xr = (base + 2 * math.pi * k - c) / b
            if (lov < xr < hiv) or (abs(xr - lov) < 1e-12 and loi) or (abs(xr - hiv) < 1e-12 and hii): ex.append(round(xr, 9))
        ex = sorted(ex)
    add(eq, lo, hi, loi, hii, ff, rnd.choice(FORMS), exact=ex)
for _ in range(10):
    k = rnd.choice([0.5, 1, 1.5, 2, 3])
    eq = 'e^x = %s*x + %s' % (k, rnd.choice([1, 2, 3]))
    c0 = float(eq.split('+')[1]); 
    ff = (lambda t, k=k, c0=c0: np.exp(t) - k * t - c0)
    lo_, hi_ = rnd.choice([-3, -2, 0]), rnd.choice([2, 4])
    add(eq, str(lo_), str(hi_), True, True, ff, rnd.choice(FORMS), exact=([0.0] if (k == 1 and c0 == 1 and lo_ <= 0 <= hi_) else None))
for _ in range(15):
    n = rnd.randint(2, 4)
    rts = [rnd.randint(-5, 5) for _ in range(n)]
    pol = np.poly1d([1.0])
    for r in rts: pol = pol * np.poly1d([1, -r])
    coeffs = [int(round(c)) for c in pol.coeffs]
    eq = ' + '.join('%d*x^%d' % (c, len(coeffs) - 1 - i) for i, c in enumerate(coeffs) if c) + ' = 0'
    lo = rnd.randint(-6, 2); hi = lo + rnd.randint(2, 9)
    loi, hii = rnd.random() < 0.5, rnd.random() < 0.5
    ex = sorted(set(float(r) for r in rts if (lo < r < hi) or (r == lo and loi) or (r == hi and hii)))
    add(eq, str(lo), str(hi), loi, hii, None, rnd.choice(FORMS), exact=ex)
for _ in range(6):
    c = rnd.choice([1, 2, 3]); d = rnd.choice([0, 1, 2])
    eq = 'ln(x) = %s - x' % c if d == 0 else 'x*ln(x) = %d' % d
    if d == 0: ff = (lambda t, c=c: np.log(t) - c + t)
    else: ff = (lambda t, d=d: t * np.log(t) - d)
    add(eq, '0.5', '6', True, True, ff, rnd.choice(FORMS))
print(json.dumps(cases))
