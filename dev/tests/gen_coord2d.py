# Oracle cases for the coordinate geometry of the plane (sympy.geometry): circles, lines, tangents, triangle centres, transformations,
# convex hulls.  Tangency and incidence are known by construction (Pythagorean directions), the rest comes from sympy.
import json, sys, random, math
from fractions import Fraction
import sympy as sp
from sympy import Point, Line, Circle, Segment, Triangle, Rational, sqrt, pi, cos, sin

seed = int(sys.argv[1]) if len(sys.argv) > 1 else 1
rnd = random.Random(seed)
cases = []
def add(kind, cmd, **kw): cases.append(dict(kind=kind, cmd=cmd, **kw))
def P2(lo=-7, hi=7): return [rnd.randint(lo, hi) for _ in range(2)]
def txt(v): return '[' + ', '.join(str(x) for x in v) + ']'
def f(x): return float(sp.N(x, 30))
def pts(L): return [[f(p.x), f(p.y)] for p in L]
def normline(c):
    c = [Fraction(int(x.p), int(x.q)) if hasattr(x, 'p') else Fraction(x) for x in c]
    L = 1
    for x in c: L = L * x.denominator // math.gcd(L, x.denominator)
    ints = [int(x * L) for x in c]
    g = 0
    for v in ints: g = math.gcd(g, abs(v))
    ints = [v // g for v in ints]
    first = next(v for v in ints if v != 0)
    if first < 0: ints = [-v for v in ints]
    return ints
def leq(a, b, c):
    s = ''
    for v, n in ((a, 'x'), (b, 'y')):
        if v == 0: continue
        term = ('' if abs(v) == 1 else str(abs(v))) + n
        s += (term if v > 0 else '-' + term) if not s else (' + ' if v > 0 else ' - ') + term
    return s + ' = ' + str(c)
def rline():
    while True:
        a, b = rnd.randint(-4, 4), rnd.randint(-4, 4)
        if a or b: return [a, b, rnd.randint(-9, 9)]
def line_of(l):
    a, b, c = l
    return Line(sp.Eq(a * sp.Symbol('x') + b * sp.Symbol('y'), c).lhs - c, None) if False else sp.Line(*((Point(0, Rational(c, b)), Point(1, Rational(c - a, b))) if b else (Point(Rational(c, a), 0), Point(Rational(c, a), 1))))
def lcoef(L):
    a, b, c = L.coefficients  # ax + by + c = 0
    return normline([a, b, -c])
def circ_eq(h, k, r2):
    x, y = sp.symbols('x y')
    return sp.expand((x - h) ** 2 + (y - k) ** 2 - r2)
def ceq_txt(h, k, r2):
    # x^2 + y^2 + Dx + Ey + F = 0 written the way a student would
    return '(x - %s)^2 + (y - %s)^2 = %s' % (h if h >= 0 else '(' + str(h) + ')', k if k >= 0 else '(' + str(k) + ')', r2)

# ---- circles
for _ in range(8):
    while True:
        A, B, C = P2(), P2(), P2()
        if (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]) != 0: break
    ci = Circle(Point(*A), Point(*B), Point(*C))
    add('circle', 'circle(%s, %s, %s)' % (txt(A), txt(B), txt(C)), c=[f(ci.center.x), f(ci.center.y)], r=f(ci.radius))
for _ in range(4):
    A, B = P2(), P2()
    if A == B: continue
    ci = Circle(Point(*A), Point(*B)) if False else Circle(Segment(Point(*A), Point(*B)).midpoint, Segment(Point(*A), Point(*B)).length / 2)
    add('circle', 'circle(%s, %s)' % (txt(A), txt(B)), c=[f(ci.center.x), f(ci.center.y)], r=f(ci.radius))
for _ in range(4):
    C, r = P2(), rnd.randint(1, 9)
    add('circle', 'circle(%s, %d)' % (txt(C), r), c=C, r=float(r))

# ---- line and circle: secant, tangent (by construction), none
TRIPLES = [(3, 4, 5), (5, 12, 13), (8, 15, 17), (6, 8, 10), (20, 21, 29)]
for _ in range(10):
    h, k, r = rnd.randint(-5, 5), rnd.randint(-5, 5), rnd.randint(1, 9)
    L = rline()
    ci = Circle(Point(h, k), r)
    inter = line_of(L).intersection(ci)
    cat = {0: 'none', 1: 'tangent', 2: 'secant'}[len(inter)]
    form = rnd.choice(['eq', 'eq', 'list'])
    ctxt = ceq_txt(h, k, r * r) if form == 'eq' else '[%d, %d, %d]' % (h, k, r * r)
    add('linecircle', 'linecircle(%s, %s)' % (leq(*L) if form == 'eq' else txt(L), ctxt), cat=cat, pts=pts(inter))
for _ in range(6):
    t = rnd.choice(TRIPLES); a, b, r = t
    sx, sy = rnd.choice([-1, 1]), rnd.choice([-1, 1])
    h, k = rnd.randint(-4, 4), rnd.randint(-4, 4)
    px, py = sx * a, sy * b            # point on the circle of radius r about the origin
    if rnd.random() < 0.5: px, py = py, px
    # tangent: px*x + py*y = r^2 (about the origin), shifted by the centre
    L = [px, py, r * r + px * h + py * k]
    add('linecircle', 'linecircle(%s, %s)' % (leq(*L), ceq_txt(h, k, r * r)), cat='tangent', pts=[[h + px, k + py]])

# ---- circle and circle
for _ in range(14):
    h1, k1, r1 = rnd.randint(-4, 4), rnd.randint(-4, 4), rnd.randint(1, 7)
    h2, k2, r2 = rnd.randint(-4, 4), rnd.randint(-4, 4), rnd.randint(1, 7)
    c1, c2 = Circle(Point(h1, k1), r1), Circle(Point(h2, k2), r2)
    d = sp.sqrt((h1 - h2) ** 2 + (k1 - k2) ** 2)
    if d == 0 and r1 == r2: continue
    if d == 0: cat = 'concentric'
    elif sp.simplify(d - (r1 + r2)) == 0: cat = 'external'
    elif d > r1 + r2: cat = 'apart'
    elif sp.simplify(d - abs(r1 - r2)) == 0: cat = 'internal'
    elif d < abs(r1 - r2): cat = 'inside'
    else: cat = 'two'
    inter = c1.intersection(c2)
    add('circlecircle', 'circlecircle(%s, %s)' % (ceq_txt(h1, k1, r1 * r1), ceq_txt(h2, k2, r2 * r2)), cat=cat, pts=pts(inter))
for _ in range(6):                      # tangent circles by construction
    t = rnd.choice(TRIPLES); a, b, dd = t
    h1, k1, r1 = rnd.randint(-3, 3), rnd.randint(-3, 3), rnd.randint(1, dd - 1)
    if rnd.random() < 0.5:
        r2 = dd - r1; cat = 'external'
    else:
        r2 = dd + r1; cat = 'internal'
    h2, k2 = h1 + rnd.choice([-1, 1]) * a, k1 + rnd.choice([-1, 1]) * b
    c1, c2 = Circle(Point(h1, k1), r1), Circle(Point(h2, k2), r2)
    add('circlecircle', 'circlecircle(%s, %s)' % (ceq_txt(h1, k1, r1 * r1), ceq_txt(h2, k2, r2 * r2)), cat=cat, pts=pts(c1.intersection(c2)))

# ---- tangents from a point
for _ in range(10):
    h, k, r = rnd.randint(-3, 3), rnd.randint(-3, 3), rnd.randint(1, 7)
    P = P2()
    d2 = (P[0] - h) ** 2 + (P[1] - k) ** 2
    cat = 'outside' if d2 > r * r else 'on' if d2 == r * r else 'inside'
    ci = Circle(Point(h, k), r)
    add('tangent', 'tangentcircle(%s, %s)' % (ceq_txt(h, k, r * r), txt(P)), cat=cat, c=[h, k], r=r, P=P)

# ---- lines
for _ in range(8):
    A, B = P2(), P2()
    if A == B: continue
    L = Segment(Point(*A), Point(*B)).perpendicular_bisector()
    add('perpbis', 'perpbisector(%s, %s)' % (txt(A), txt(B)), coef=lcoef(L))
for _ in range(8):
    L = rline(); P = P2()
    pl = line_of(L).parallel_line(Point(*P)); pp = line_of(L).perpendicular_line(Point(*P))
    form = rnd.choice(['eq', 'list'])
    ltxt = leq(*L) if form == 'eq' else txt(L)
    add('parallel', 'parallel(%s, %s)' % (ltxt, txt(P)), coef=lcoef(pl))
    add('parallel', 'perpendicular(%s, %s)' % (ltxt, txt(P)), coef=lcoef(pp))
for _ in range(10):
    L1, L2 = rline(), rline()
    a1, b1, c1 = L1; a2, b2, c2 = L2
    la, lb = line_of(L1), line_of(L2)
    if a1 * b2 - a2 * b1 == 0:
        same = a1 * c2 == a2 * c1 and b1 * c2 == b2 * c1
        add('lineint', 'lineintersect(%s, %s)' % (leq(*L1), leq(*L2)), cat='same' if same else 'parallel', pt=None, ang=0.0)
    else:
        p = la.intersection(lb)[0]
        ang = f(la.angle_between(lb))
        ang = min(ang, math.pi - ang)
        add('lineint', 'lineintersect(%s, %s)' % (leq(*L1), leq(*L2)), cat='point', pt=[f(p.x), f(p.y)], ang=math.degrees(ang))
for _ in range(8):
    L = rline(); P = P2()
    la = line_of(L)
    foot = la.projection(Point(*P))
    add('pointline', 'pointline(%s, %s)' % (txt(P), leq(*L)), dist=f(la.distance(Point(*P))), foot=[f(foot.x), f(foot.y)])
for _ in range(5):
    L = rline(); k = rnd.randint(1, 5)
    L2 = [L[0], L[1], L[2] + rnd.choice([-1, 1]) * rnd.randint(1, 9)]
    add('parlines', 'parallellines(%s, %s)' % (leq(*L), leq(*L2)), dist=f(line_of(L).distance(Point(*(line_of(L2).p1)))))
for _ in range(6):
    L = rline()
    a, b, c = L
    add('lineinfo', 'lineinfo(%s)' % leq(*L), coef=normline(L), slope=None if b == 0 else a / -b if False else (None if b == 0 else float(Fraction(-a, b))))

# ---- triangles
for _ in range(12):
    while True:
        A, B, C = P2(), P2(), P2()
        if (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]) != 0: break
    T = Triangle(Point(*A), Point(*B), Point(*C))
    add('triangle', 'triangle2d(%s, %s, %s)' % (txt(A), txt(B), txt(C)), G=[f(T.centroid.x), f(T.centroid.y)], O=[f(T.circumcenter.x), f(T.circumcenter.y)],
        R=f(T.circumradius), H=[f(T.orthocenter.x), f(T.orthocenter.y)], I=[f(T.incenter.x), f(T.incenter.y)], r=abs(f(T.inradius)), area=abs(f(T.area)),
        per=f(T.perimeter), angles=sorted([math.degrees(f(a)) for a in T.angles.values()]))

# ---- transformations
for _ in range(8):
    P = P2(); ang = rnd.choice([30, 45, 60, 90, 120, 135, 180, 270, -90, -45]); C = P2() if rnd.random() < 0.5 else [0, 0]
    q = Point(*P).rotate(sp.rad(ang), Point(*C))
    add('transform', 'rotate(%s, %d%s)' % (txt(P), ang, '' if C == [0, 0] else ', ' + txt(C)), img=[[f(q.x), f(q.y)]])
for _ in range(6):
    P = P2(); ang = rnd.choice(['pi/2', 'pi/3', 'pi/6', '2*pi/3', 'pi', '3*pi/2'])
    q = Point(*P).rotate(sp.sympify(ang.replace('pi', 'pi')))
    add('transform', 'rotate(%s, %s)' % (txt(P), ang), img=[[f(q.x), f(q.y)]])
for _ in range(8):
    P = P2(); L = rline()
    q = Point(*P).reflect(line_of(L))
    add('transform', 'reflect(%s, %s)' % (txt(P), leq(*L)), img=[[f(q.x), f(q.y)]])
for _ in range(4):
    P = P2(); v = P2()
    add('transform', 'translate(%s, %s)' % (txt(P), txt(v)), img=[[P[0] + v[0], P[1] + v[1]]])
for _ in range(4):
    P = P2(); k = rnd.choice([2, 3, -1, -2]); C = P2()
    add('transform', 'dilate(%s, %d, %s)' % (txt(P), k, txt(C)), img=[[C[0] + k * (P[0] - C[0]), C[1] + k * (P[1] - C[1])]])
for _ in range(4):
    n = rnd.randint(2, 4); L = [P2() for _ in range(n)]; ang = rnd.choice([90, 180, 60])
    imgs = [Point(*p).rotate(sp.rad(ang)) for p in L]
    add('transform', 'rotate([%s], %d)' % (', '.join(txt(p) for p in L), ang), img=[[f(q.x), f(q.y)] for q in imgs])

# ---- section formula, collinearity, hull
for _ in range(6):
    A, B = P2(), P2(); m, n = rnd.randint(1, 5), rnd.choice([1, 2, 3, 4, -1, -2, 5])
    if m + n == 0: continue
    R = [Fraction(n * A[0] + m * B[0], m + n), Fraction(n * A[1] + m * B[1], m + n)]
    add('section', 'section(%s, %s, %d, %d)' % (txt(A), txt(B), m, n), pt=[float(R[0]), float(R[1])])
for _ in range(8):
    A, B = P2(), P2()
    if rnd.random() < 0.5:
        k = rnd.randint(-3, 3); C = [A[0] + k * (B[0] - A[0]), A[1] + k * (B[1] - A[1])]
    else: C = P2()
    add('collinear', 'collinear(%s, %s, %s)' % (txt(A), txt(B), txt(C)), yes=bool(Point(*A).is_collinear(Point(*B), Point(*C))))
for _ in range(8):
    n = rnd.randint(4, 9)
    P = list({tuple(P2(-6, 6)) for _ in range(n)})
    P = [list(p) for p in P]
    hull = sp.convex_hull(*[Point(*p) for p in P])
    if not isinstance(hull, sp.Polygon): continue
    add('hull', 'hull(%s)' % ', '.join(txt(p) for p in P), verts=sorted([[int(v.x), int(v.y)] for v in hull.vertices]), area=abs(f(hull.area)), per=f(hull.perimeter))
print(json.dumps(cases))
