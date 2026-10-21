# Oracle for multivariable calculus: sympy (exact).
import json, random, sys, itertools
import sympy as sp
random.seed(int(sys.argv[1]) if len(sys.argv) > 1 else 1)
x, y, z, lam = sp.symbols('x y z lam')
R = random.randint
T = []
def add(cmd, t, v, **kw): T.append(dict(cmd=cmd, t=t, v=v, **kw))
def ptxt(e): return str(e).replace('**', '^')
def real_solutions(eqs, vars_):
    # numeric real solutions of a polynomial system via a lex Groebner basis and back substitution
    G = sp.groebner(eqs, *vars_, order='lex')
    last = [g for g in G.exprs if g.free_symbols <= {vars_[-1]}]
    if not last: return None
    sols = [()]
    ys = [complex(r) for r in sp.Poly(last[0], vars_[-1]).nroots(n=30)]
    out = []
    for yv in ys:
        if abs(yv.imag) > 1e-9: continue
        yv = yv.real
        cands = [{vars_[-1]: yv}]
        for var in reversed(vars_[:-1]):
            nxt = []
            for c in cands:
                polys = [sp.Poly(g.subs(c), var) for g in G.exprs if var in g.free_symbols and (g.free_symbols - {var}) <= set(c)]
                polys = [q for q in polys if not q.is_zero and q.degree() >= 1]
                if not polys: continue
                q = min(polys, key=lambda t: t.degree())
                for r in q.nroots(n=30):
                    r = complex(r)
                    if abs(r.imag) < 1e-9: nxt.append({**c, var: r.real})
            cands = nxt
        for c in cands:
            if all(abs(float(e.subs(c))) < 1e-7 for e in eqs): out.append(c)
    return out
def rpoly(deg, vars_=(x, y)):
    terms = []
    for i in range(deg + 1):
        for j in range(deg + 1 - i):
            if R(0, 2): terms.append(R(-4, 4) * x ** i * y ** j)
    return sum(terms) if terms else x * y
for _ in range(25):
    f = rpoly(3)
    if f.is_constant(): continue
    gx, gy = sp.diff(f, x), sp.diff(f, y)
    add(f'grad({ptxt(f)}, x, y)', 'gradH', [ptxt(gx), ptxt(gy)])
    Hs = [[sp.diff(f, a, b) for b in (x, y)] for a in (x, y)]
    add(f'hessian({ptxt(f)}, x, y)', 'hess', [[ptxt(e) for e in r] for r in Hs])
# critical points of polynomials
for _ in range(25):
    f = R(1, 3) * x ** 2 + R(-3, 3) * x * y + R(1, 3) * y ** 2 + R(-2, 2) * x ** 3 + R(-2, 2) * y ** 3 + R(-3, 3) * x + R(-3, 3) * y
    gx, gy = sp.diff(f, x), sp.diff(f, y)
    try:
        sols = real_solutions([gx, gy], (x, y))
    except Exception:
        continue
    if sols is None: continue
    pts = []
    for s in sols:
        sx, sy = s[x], s[y]
        if abs(sx) > 8 or abs(sy) > 8: continue
        H = sp.Matrix([[sp.diff(f, a, b).subs({x: sx, y: sy}) for b in (x, y)] for a in (x, y)])
        D = float(H.det()); fxx = float(H[0, 0])
        kind = 'saddle' if D < -1e-9 else ('min' if fxx > 0 else 'max') if D > 1e-9 else 'inconclusive'
        pts.append([sx, sy, float(f.subs({x: sx, y: sy})), kind])
    if len(pts) != len({(round(p[0], 6), round(p[1], 6)) for p in pts}): continue
    add(f'critical({ptxt(f)}, x, y)', 'crit2', pts)
# double integrals
for _ in range(25):
    f = rpoly(2)
    a, b = R(0, 2), R(1, 3)
    add(f'integrate(integrate({ptxt(f)}, y, 0, {b}), x, 0, {a + 1})', 'exact', str(sp.integrate(f, (y, 0, b), (x, 0, a + 1))))
    add(f'integrate(integrate({ptxt(f)}, y, 0, x), x, 0, {b})', 'exact', str(sp.integrate(sp.integrate(f, (y, 0, x)), (x, 0, b))))
# Lagrange
for _ in range(15):
    a, b = R(1, 4), R(1, 4)
    f = a * x + b * y + R(0, 2) * x * y
    g = x ** 2 + y ** 2
    c = R(1, 9)
    try:
        sols = real_solutions([sp.diff(f, x) - lam * sp.diff(g, x), sp.diff(f, y) - lam * sp.diff(g, y), g - c], (x, y, lam))
    except Exception:
        continue
    vals = [float(f.subs({x: s[x], y: s[y]})) for s in (sols or [])]
    if vals: add(f'lagrange({ptxt(f)}, x^2 + y^2, {c}, x, y)', 'lagr', [min(vals), max(vals)])
json.dump(T, sys.stdout)
