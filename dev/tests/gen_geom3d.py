# Oracle cases for the analytic geometry in space (sympy.geometry / numpy); quadrics are generated from canonical forms by an
# invertible affine change of variables, so the surface type is known by construction.
import json, sys, random, math
from fractions import Fraction
import numpy as np
import sympy as sp
from sympy import Point3D, Line3D, Plane, Rational

seed = int(sys.argv[1]) if len(sys.argv) > 1 else 1
rnd = random.Random(seed)
cases = []
def add(kind, cmd, **kw): cases.append(dict(kind=kind, cmd=cmd, **kw))
def P3(): return [rnd.randint(-6, 6) for _ in range(3)]
def txt(v): return '[' + ', '.join(str(x) for x in v) + ']'
def normplane(c):
    c = [Fraction(x) for x in c]
    L = 1
    for x in c: L = L * x.denominator // math.gcd(L, x.denominator)
    ints = [int(x * L) for x in c]
    g = 0
    for v in ints: g = math.gcd(g, abs(v))
    ints = [v // g for v in ints]
    first = next(v for v in ints if v != 0)
    if first < 0: ints = [-v for v in ints]
    return ints
def planeeq(coef):
    a, b, c, d = coef
    return '%d*x + %d*y + %d*z = %d' % (a, b, c, d)
def ptxt(coef):
    a, b, c, d = coef
    s = ''
    for v, n in ((a, 'x'), (b, 'y'), (c, 'z')):
        if v == 0: continue
        term = ('' if abs(v) == 1 else str(abs(v))) + n
        s += (term if v > 0 else '-' + term) if not s else (' + ' if v > 0 else ' - ') + term
    return s + ' = ' + str(d)
def rplane():
    while True:
        a = [rnd.randint(-4, 4) for _ in range(3)]
        if any(a): return normplane(a + [rnd.randint(-8, 8)])

for _ in range(8):
    while True:
        A, B, C = P3(), P3(), P3()
        n = np.cross(np.array(B) - A, np.array(C) - A)
        if n.any(): break
    d = int(np.dot(n, A))
    add('plane3', 'plane(%s, %s, %s)' % (txt(A), txt(B), txt(C)), coef=normplane(list(map(int, n)) + [d]))
for _ in range(5):
    P, n = P3(), [rnd.randint(-4, 4) for _ in range(3)]
    if not any(n): n[0] = 1
    add('plane3', 'plane(%s, %s)' % (txt(P), txt(n)), coef=normplane(n + [int(np.dot(n, P))]))
for _ in range(10):
    pl = rplane(); P = P3()
    sp_plane = Plane(Point3D(0, 0, 0), normal_vector=pl[:3]) if False else None
    n = np.array(pl[:3], float)
    dist = abs(np.dot(n, P) - pl[3]) / np.linalg.norm(n)
    foot = np.array(P) - (np.dot(n, P) - pl[3]) / np.dot(n, n) * n
    form = rnd.choice(['list', 'eq'])
    add('pointplane', 'pointplane(%s, %s)' % (txt(P), txt(pl) if form == 'list' else ptxt(pl)), dist=float(dist), foot=foot.tolist())
for _ in range(8):
    P, A, d = P3(), P3(), [rnd.randint(-3, 3) for _ in range(3)]
    if not any(d): d[1] = 2
    line = Line3D(Point3D(*A), direction_ratio=d)
    dist = float(line.distance(Point3D(*P)))
    add('pointline', 'pointline3d(%s, %s, %s)' % (txt(P), txt(A), txt(d)), dist=dist)
for _ in range(14):
    A, B = P3(), P3()
    d1 = [rnd.randint(-3, 3) for _ in range(3)]; d2 = [rnd.randint(-3, 3) for _ in range(3)]
    if not any(d1): d1[0] = 1
    if not any(d2): d2[2] = 1
    if rnd.random() < 0.25:   # force an intersection
        t, s = rnd.randint(-3, 3), rnd.randint(-3, 3)
        B = [A[i] + t * d1[i] - s * d2[i] for i in range(3)]
    if rnd.random() < 0.12:   # parallel
        k = rnd.choice([-2, 1, 3]); d2 = [k * x for x in d1]
    L1 = Line3D(Point3D(*A), direction_ratio=d1); L2 = Line3D(Point3D(*B), direction_ratio=d2)
    dist = float(L1.distance(L2))
    cross = np.cross(d1, d2)
    if not cross.any(): cat = 'coincide' if dist == 0 else 'parallel'
    elif abs(dist) < 1e-12: cat = 'intersect'
    else: cat = 'skew'
    add('skew', 'skewlines(%s, %s, %s, %s)' % (txt(A), txt(d1), txt(B), txt(d2)), dist=dist, cat=cat)
for _ in range(10):
    pl = rplane(); A = P3(); d = [rnd.randint(-3, 3) for _ in range(3)]
    if not any(d): d[0] = 1
    n = np.array(pl[:3], float)
    nd = np.dot(n, d)
    if rnd.random() < 0.15:   # parallel line
        d = list(map(int, np.cross(n, [1, 2, 3]))); 
        if not any(d): d = list(map(int, np.cross(n, [0, 1, 0])))
        if not any(d): d = list(map(int, np.cross(n, [1, 0, 0])))
        nd = 0
    gap = pl[3] - np.dot(n, A)
    if abs(nd) < 1e-12: cat = 'in' if abs(gap) < 1e-12 else 'parallel'; pt = None; ang = None
    else:
        t = gap / nd; pt = (np.array(A) + t * np.array(d)).tolist(); cat = 'point'
        ang = math.degrees(math.asin(min(1, abs(nd) / (np.linalg.norm(n) * np.linalg.norm(d)))))
    add('lineplane', 'lineplane(%s, %s, %s)' % (txt(A), txt(d), txt(pl)), cat=cat, pt=pt, ang=ang)
for _ in range(8):
    p1, p2 = rplane(), rplane()
    n1, n2 = np.array(p1[:3], float), np.array(p2[:3], float)
    cr = np.cross(n1, n2)
    ang = math.degrees(math.acos(min(1, abs(np.dot(n1, n2)) / (np.linalg.norm(n1) * np.linalg.norm(n2)))))
    add('planeangle', 'planeangle(%s, %s)' % (ptxt(p1), ptxt(p2)), ang=ang, parallel=not cr.any())
    if cr.any(): add('planeint', 'planeintersect(%s, %s)' % (txt(p1), ptxt(p2)), p1=p1, p2=p2, dirv=cr.tolist())
for _ in range(8):
    u, v, w = P3(), P3(), P3()
    add('triple', 'triplescalar(%s, %s, %s)' % (txt(u), txt(v), txt(w)), val=int(round(np.linalg.det(np.array([u, v, w], float)))))
    A, B, C, D = P3(), P3(), P3(), P3()
    vol = abs(np.linalg.det(np.array([np.array(B) - A, np.array(C) - A, np.array(D) - A], float))) / 6
    add('tetra', 'tetrahedron(%s, %s, %s, %s)' % (txt(A), txt(B), txt(C), txt(D)), val=float(vol))
    area = np.linalg.norm(np.cross(np.array(B) - A, np.array(C) - A)) / 2
    add('area3', 'trianglearea3d(%s, %s, %s)' % (txt(A), txt(B), txt(C)), val=float(area))
    vv = [rnd.randint(-5, 5) for _ in range(3)]
    if any(vv): add('dircos', 'dircos(%s)' % txt(vv), angs=[math.degrees(math.acos(c / np.linalg.norm(vv))) for c in vv])
for _ in range(6):
    while True:
        Pts = [P3() for _ in range(4)]
        M = np.array([p + [1] for p in Pts], float)
        if abs(np.linalg.det(M)) > 1e-9: break
    rhs = -np.array([p[0] ** 2 + p[1] ** 2 + p[2] ** 2 for p in Pts], float)
    D, E, F, G = np.linalg.solve(M, rhs)
    cen = [-D / 2, -E / 2, -F / 2]
    r = math.sqrt(cen[0] ** 2 + cen[1] ** 2 + cen[2] ** 2 - G)
    add('sphere4', 'sphere(%s)' % ', '.join(txt(p) for p in Pts), cen=cen, r=r)
    c, rr = P3(), rnd.randint(1, 9)
    add('sphere2', 'sphere(%s, %d)' % (txt(c), rr), cen=c, r=rr)
# quadrics from canonical forms
x, y, z = sp.symbols('x y z')
def unimodular():
    while True:
        M = sp.Matrix(3, 3, lambda i, j: rnd.randint(-2, 2))
        if abs(M.det()) == 1: return M
def make(kind):
    a, b, c = [rnd.choice([1, 2, 3, 4, 9]) for _ in range(3)]
    k = rnd.choice([1, 2, 5, 7])
    w1, w2, w3 = sp.symbols('w1 w2 w3')
    forms = {
      'ellipsoid': a * w1**2 + b * w2**2 + c * w3**2 - k,
      'no real points': rnd.choice([a * w1**2 + b * w2**2 + c * w3**2 + k, a * w1**2 + b * w2**2 + k, w1**2 + k]),
      'a single point': a * w1**2 + b * w2**2 + c * w3**2,
      'hyperboloid of one sheet': a * w1**2 + b * w2**2 - c * w3**2 - k,
      'hyperboloid of two sheets': a * w1**2 - b * w2**2 - c * w3**2 - k,
      'elliptic cone': a * w1**2 + b * w2**2 - c * w3**2,
      'elliptic paraboloid': a * w1**2 + b * w2**2 - w3,
      'hyperbolic paraboloid': a * w1**2 - b * w2**2 - w3,
      'elliptic cylinder': a * w1**2 + b * w2**2 - k,
      'hyperbolic cylinder': a * w1**2 - b * w2**2 - k,
      'parabolic cylinder': a * w1**2 - w2,
      'a line': a * w1**2 + b * w2**2,
      'a pair of intersecting planes': a * w1**2 - b * w2**2,
      'a pair of parallel planes': a * w1**2 - k,
      'a single plane': w1**2,
    }
    return forms[kind], (w1, w2, w3)
for kind in ['ellipsoid', 'no real points', 'a single point', 'hyperboloid of one sheet', 'hyperboloid of two sheets', 'elliptic cone', 'elliptic paraboloid', 'hyperbolic paraboloid',
             'elliptic cylinder', 'hyperbolic cylinder', 'parabolic cylinder', 'a line', 'a pair of intersecting planes', 'a pair of parallel planes', 'a single plane']:
    for rep in range(3):
        f, ws = make(kind)
        M = unimodular()
        t = sp.Matrix([rnd.randint(-3, 3) for _ in range(3)])
        sub = M * sp.Matrix([x, y, z]) + t
        g = sp.expand(f.subs(dict(zip(ws, list(sub))), simultaneous=True))
        text = str(g).replace('**', '^')
        if rnd.random() < 0.5: text += ' = 0'
        else:
            # move the constant to the right
            c0 = g.subs({x: 0, y: 0, z: 0})
            text = str(sp.expand(g - c0)).replace('**', '^') + ' = ' + str(-c0)
        if text.startswith('0 ='): continue
        # an equation that lacks one of x, y, z is read as a conic in the other two, so call it through quadric(...)
        if g.free_symbols != {x, y, z} or rnd.random() < 0.3: text = 'quadric(' + text + ')'
        add('quadric', text, want=kind)
print(json.dumps(cases))
