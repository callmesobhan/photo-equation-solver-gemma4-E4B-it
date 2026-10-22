# Oracle cases for the plot extras: the numbers printed next to the pictures (numpy / scipy / exact fractions).
import json, sys, random, math, itertools
from fractions import Fraction as Fr
import numpy as np
from scipy import stats
from scipy.integrate import solve_ivp
from scipy.optimize import linprog
from scipy.spatial import ConvexHull

seed = int(sys.argv[1]) if len(sys.argv) > 1 else 1
rnd = random.Random(seed)
cases = []
def add(kind, cmd, **kw): cases.append(dict(kind=kind, cmd=cmd, **kw))
def ftxt(v): return repr(float(v))

# slope fields
FIELDS = [('x - y', lambda x, y: x - y, True), ('x*y', lambda x, y: x * y, True), ('y*(1-y)', lambda x, y: y * (1 - y), False),
          ('x^2 - y', lambda x, y: x * x - y, True), ('sin(x) - y', lambda x, y: math.sin(x) - y, True), ('(y-1)*(y+2)', lambda x, y: (y - 1) * (y + 2), False),
          ('y - x', lambda x, y: y - x, True), ('-2*y + x', lambda x, y: -2 * y + x, True), ('y/2 - 1', lambda x, y: y / 2 - 1, False),
          ('cos(x)*y', lambda x, y: math.cos(x) * y, True), ('y^2 - 4', lambda x, y: y * y - 4, False)]
for _ in range(14):
    text, f, dep = rnd.choice(FIELDS)
    a, b = -rnd.randint(1, 4), rnd.randint(1, 4)
    c, d = -rnd.randint(1, 4), rnd.randint(1, 4)
    pts = [(rnd.randint(a, b), rnd.randint(c, d)) for _ in range(rnd.randint(0, 2))]
    exp = []
    ok = True
    for (x0, y0) in pts:
        rs = {}
        for end in (b, a):
            sol = solve_ivp(lambda x, y: [f(x, y[0])], (x0, end), [y0], rtol=1e-12, atol=1e-14, method='DOP853')
            if sol.status != 0 or abs(sol.y[0, -1]) > 1e5: ok = False
            rs[end] = float(sol.y[0, -1])
        exp.append(dict(x0=x0, y0=y0, slope=f(x0, y0), right=rs[b], left=rs[a]))
    if not ok: continue
    eq = []
    if not dep:
        ys = np.linspace(c, d, 20001)
        vals = [f(0, y) for y in ys]
        for i in range(len(ys) - 1):
            if vals[i] == 0: eq.append(float(ys[i]))
            elif vals[i] * vals[i + 1] < 0:
                lo, hi = ys[i], ys[i + 1]
                for _ in range(100):
                    mid = (lo + hi) / 2
                    if f(0, lo) * f(0, mid) <= 0: hi = mid
                    else: lo = mid
                eq.append(float((lo + hi) / 2))
        if vals[-1] == 0: eq.append(float(ys[-1]))
    cmd = 'slopefield(%s, x, %d, %d, y, %d, %d%s)' % (text, a, b, c, d, ''.join(', %d, %d' % p for p in pts))
    add('slope', cmd, a=a, b=b, pts=exp, auto=not dep, eq=eq)
# scatter
for _ in range(12):
    n = rnd.randint(4, 9)
    xs = sorted(rnd.sample(range(-5, 15), n))
    ys = [rnd.randint(-10, 20) for _ in range(n)]
    deg = rnd.choice([1, 1, 2, 3])
    if deg >= n: deg = 1
    co = np.polyfit(xs, ys, deg)[::-1]
    fit = np.polyval(co[::-1], xs)
    sst = float(np.sum((np.array(ys) - np.mean(ys)) ** 2)); sse = float(np.sum((np.array(ys) - fit) ** 2))
    add('scatter', 'scatter(%s, %s%s)' % (json.dumps(xs), json.dumps(ys), '' if deg == 1 and rnd.random() < 0.5 else ', %d' % deg), co=co.tolist(), r2=1 - sse / sst if sst else None, deg=deg, r=float(np.corrcoef(xs, ys)[0, 1]) if deg == 1 else None)
# histograms (exact)
def hist_exact(data, lo, w, k, last_closed):
    counts = [0] * k
    for v in data:
        i = int((Fr(v) - lo) // w)
        if i >= k: i = k - 1
        counts[i] += 1
    return counts
for _ in range(14):
    n = rnd.randint(5, 40)
    data = [rnd.randint(0, 60) for _ in range(n)]
    mode = rnd.choice(['width', 'width0', 'default', 'bins'])
    mn, mx = min(data), max(data)
    if mode in ('width', 'width0'):
        w = rnd.choice([2, 3, 5, 10]); start = (mn // w) * w
        if mode == 'width': start = start - rnd.choice([0, 1, 2])
        k = int((Fr(mx) - start) // w) + 1
        counts = hist_exact(data, Fr(start), Fr(w), k, False)
        cmd = 'histogram(%s, %d%s)' % (json.dumps(data), w, ', %d' % start if mode == 'width' else '')
    elif mode == 'default':
        k = math.ceil(math.log2(n)) + 1
        if mx == mn: continue
        counts = hist_exact(data, Fr(mn), Fr(mx - mn, k), k, True); cmd = 'histogram(%s)' % json.dumps(data)
    else:
        k = rnd.randint(2, 9)
        if mx == mn: continue
        counts = hist_exact(data, Fr(mn), Fr(mx - mn, k), k, True); cmd = 'histbins(%s, %d)' % (json.dumps(data), k)
    add('hist', cmd, counts=counts, n=n)
# box plots (median-of-halves quartiles)
def med(v):
    m = len(v)
    return Fr(v[m // 2]) if m % 2 else (Fr(v[m // 2 - 1]) + Fr(v[m // 2])) / 2
for _ in range(14):
    n = rnd.randint(4, 25)
    data = sorted(rnd.randint(0, 50) for _ in range(n))
    if rnd.random() < 0.5: data.append(rnd.randint(80, 150)); data.sort()
    m = len(data)
    lower = data[:m // 2]; upper = data[m // 2:] if m % 2 == 0 else data[m // 2 + 1:]
    q1, q2, q3 = med(lower), med(data), med(upper)
    iqr = q3 - q1
    lo, hi = q1 - Fr(3, 2) * iqr, q3 + Fr(3, 2) * iqr
    inside = [v for v in data if lo <= v <= hi]; outl = [v for v in data if v < lo or v > hi]
    add('box', 'boxplot(%s)' % json.dumps(data), q=[float(q1), float(q2), float(q3)], iqr=float(iqr), fences=[float(lo), float(hi)], whisk=[inside[0], inside[-1]], outl=outl)
# shaded distributions
for _ in range(8):
    mu, sd = round(rnd.uniform(-20, 100), 1), round(rnd.uniform(0.5, 20), 1)
    a, b = round(mu + rnd.uniform(-3, 0) * sd, 2), round(mu + rnd.uniform(0, 3) * sd, 2)
    kind = rnd.choice(['both', 'left', 'right'])
    A = '-oo' if kind == 'left' else str(a); B = 'oo' if kind == 'right' else str(b)
    p = (1 if kind == 'right' else stats.norm.cdf(b, mu, sd)) - (0 if kind == 'left' else stats.norm.cdf(a, mu, sd))
    add('shade', 'normalshade(%s, %s, %s, %s)' % (mu, sd, A, B), p=float(p))
    df = rnd.randint(2, 30)
    a2, b2 = round(rnd.uniform(-3, 0), 2), round(rnd.uniform(0, 3), 2)
    add('shade', 'tshade(%d, %s, %s)' % (df, a2, b2), p=float(stats.t.cdf(b2, df) - stats.t.cdf(a2, df)))
    a3, b3 = round(rnd.uniform(0, 10), 2), round(rnd.uniform(10, 25), 2)
    add('shade', 'chisqshade(%d, %s, %s)' % (df, a3, b3), p=float(stats.chi2.cdf(b3, df) - stats.chi2.cdf(a3, df)))
# implicit curves: intercepts and geometry
CURVES = []
for _ in range(6):
    r = rnd.randint(1, 5); CURVES.append(('x^2 + y^2 = %d' % (r * r), 'x*x + y*y - %d' % (r * r), [-r, r], [-r, r]))
    a, b = rnd.randint(1, 5), rnd.randint(1, 5); CURVES.append(('x^2/%d + y^2/%d = 1' % (a * a, b * b), 'x*x/%d + y*y/%d - 1' % (a * a, b * b), [-a, a], [-b, b]))
    c = rnd.randint(1, 6); CURVES.append(('x^2 - y^2 = %d' % c, 'x*x - y*y - %d' % c, [-math.sqrt(c), math.sqrt(c)], []))
    k = rnd.randint(-4, 4); CURVES.append(('y = x^2 + %d' % k, 'y - x*x - %d' % k, [math.sqrt(-k), -math.sqrt(-k)] if k < 0 else ([0.0] if k == 0 else []), [k]))
    A, B, C = rnd.randint(1, 4), rnd.randint(1, 4), rnd.randint(1, 12); CURVES.append(('%dx + %dy = %d' % (A, B, C), '%d*x + %d*y - %d' % (A, B, C), [C / A], [C / B]))
CURVES.append(('x*y = 1', 'x*y - 1', [], []))
for text, expr, xi, yi in CURVES:
    add('implicit', 'plotimplicit(%s, x, -6, 6, y, -6, 6)' % text, expr=expr, xi=sorted(set(round(v, 9) for v in xi if -6 <= v <= 6)), yi=sorted(set(round(v, 9) for v in yi if -6 <= v <= 6)), win=[-6, 6, -6, 6])
# contour maps: range on the 120 x 90 grid
CF = [('x^2 + y^2', lambda x, y: x * x + y * y), ('x^2 - y^2', lambda x, y: x * x - y * y), ('x*y', lambda x, y: x * y), ('sin(x)*cos(y)', lambda x, y: np.sin(x) * np.cos(y)), ('x + 2*y', lambda x, y: x + 2 * y), ('exp(-x^2 - y^2)', lambda x, y: np.exp(-x * x - y * y)), ('x^3 - 3*x*y^2', lambda x, y: x ** 3 - 3 * x * y * y)]
for _ in range(10):
    text, f = rnd.choice(CF)
    a, b, c, d = -rnd.randint(1, 4), rnd.randint(1, 4), -rnd.randint(1, 4), rnd.randint(1, 4)
    X, Y = np.meshgrid(a + (b - a) * np.arange(121) / 120, c + (d - c) * np.arange(91) / 90)
    Z = f(X, Y)
    add('contour', 'contour(%s, x, %d, %d, y, %d, %d)' % (text, a, b, c, d), mn=float(Z.min()), mx=float(Z.max()), expr=text.replace('^', '**'), win=[a, b, c, d])
# regions of linear inequalities (exact corner points, area, boundedness)
for _ in range(24):
    m = rnd.randint(2, 5)
    cons = []
    for _ in range(m):
        a, b, c = rnd.randint(-4, 4), rnd.randint(-4, 4), rnd.randint(-8, 8)
        if a == 0 and b == 0: continue
        op = rnd.choice(['<=', '>=', '<', '>'])
        cons.append((a, b, op, c))
    if len(cons) < 2: continue
    if rnd.random() < 0.5: cons += [(1, 0, '>=', 0), (0, 1, '>=', 0)]
    # as half-planes  a x + b y <= c
    hp = []
    for a, b, op, c in cons:
        if op in ('<=', '<'): hp.append((a, b, c))
        else: hp.append((-a, -b, -c))
    A = np.array([[a, b] for a, b, c in hp], float); bb = np.array([c for a, b, c in hp], float)
    status = []
    for cobj in ([1, 0], [-1, 0], [0, 1], [0, -1]):
        r = linprog(cobj, A_ub=A, b_ub=bb, bounds=[(None, None), (None, None)], method='highs')
        status.append(r.status)
    if status[0] == 2: continue  # empty (skipped: the wording of the message is checked elsewhere)
    # skip regions whose closure has no interior (a segment, a ray or a point): largest inscribed circle
    norms = np.sqrt((A ** 2).sum(axis=1))
    cheb = linprog([0, 0, -1], A_ub=np.hstack([A, norms[:, None]]), b_ub=bb, bounds=[(None, None), (None, None), (0, 1000)], method='highs')
    if cheb.status == 0 and -cheb.fun < 1e-9: continue
    verts = set()
    for (a1, b1, c1), (a2, b2, c2) in itertools.combinations(hp, 2):
        det = a1 * b2 - a2 * b1
        if det == 0: continue
        x = Fr(c1 * b2 - c2 * b1, det); y = Fr(a1 * c2 - a2 * c1, det)
        if all(a * x + b * y <= c for a, b, c in hp): verts.add((x, y))
    bounded = all(s == 0 for s in status)
    if len(verts) < 3 and bounded: continue
    if bounded:
        pts = np.array([[float(x), float(y)] for x, y in verts])
        try: area = float(ConvexHull(pts).volume)
        except Exception: continue
        if area < 1e-9: continue
    else:
        area = None
        if len(verts) < 1 and not bounded:
            continue
    def ctext(a, b, op, c):
        lhs = ''
        for v, n in ((a, 'x'), (b, 'y')):
            if v == 0: continue
            t = ('' if abs(v) == 1 else str(abs(v))) + n
            lhs += (t if v > 0 else '-' + t) if not lhs else (' + ' if v > 0 else ' - ') + t
        return '%s %s %d' % (lhs, op, c)
    add('region', 'plotregion(%s)' % ', '.join(ctext(*c) for c in cons), verts=sorted((float(x), float(y)) for x, y in verts) if (bounded or True) else [], bounded=bounded, area=area, unbounded_ok=not bounded)
print(json.dumps(cases))
