# Oracle cases for the applications of multiple integrals: sympy exact integrals / scipy quadrature, and for the theorems an independent
# computation of the other side (line integrals along the edges for Green and Stokes, six face fluxes for the divergence theorem).
import json, sys, random, math
import sympy as sp
from sympy import pi, sin, cos, sqrt, Rational, integrate
from scipy import integrate as si

seed = int(sys.argv[1]) if len(sys.argv) > 1 else 1
rnd = random.Random(seed)
cases = []
x, y, z, t, r, f, u, v = sp.symbols('x y z t r f u v', real=True)
def add(kind, cmd, **kw): cases.append(dict(kind=kind, cmd=cmd, **kw))
def ex(e): return str(sp.sympify(e)).replace('**', '^')
def fl(e): return float(sp.N(e, 30))
def poly(vars_, deg=2, lo=-2, hi=2):
    terms = [rnd.randint(lo, hi) * sp.prod([vv ** rnd.randint(0, deg) for vv in vars_]) for _ in range(rnd.randint(1, 3))]
    p = sum(terms)
    return p if p != 0 else sp.Integer(1) + vars_[0]
# ---- lamina
for _ in range(8):
    a, b = rnd.randint(-2, 1), rnd.randint(2, 4)
    g1 = rnd.choice([0, x - 5, -x ** 2 - 1, x ** 2 - 9]); g2 = rnd.choice([x ** 2 + 1, x + 10, 3 + x ** 2])
    rho = rnd.choice([1, x + y + 3, x * y + 20, y + 15, 2 + x ** 2])
    rho = sp.sympify(rho)
    M = integrate(integrate(rho, (y, g1, g2)), (x, a, b))
    Mx = integrate(integrate(y * rho, (y, g1, g2)), (x, a, b)); My = integrate(integrate(x * rho, (y, g1, g2)), (x, a, b))
    Ix = integrate(integrate(y ** 2 * rho, (y, g1, g2)), (x, a, b)); Iy = integrate(integrate(x ** 2 * rho, (y, g1, g2)), (x, a, b))
    add('lamina', 'lamina(%s, x, %d, %d, y, %s, %s)' % (ex(rho), a, b, ex(g1), ex(g2)), M=fl(M), cx=fl(My / M), cy=fl(Mx / M), Mx=fl(Mx), My=fl(My), Ix=fl(Ix), Iy=fl(Iy))
# ---- solid
for _ in range(6):
    a, b = 0, rnd.randint(1, 3); c, d = 0, rnd.randint(1, 3)
    top = rnd.choice([x + y + 1, x * y + 1, 2 + x, 3]); rho = sp.sympify(rnd.choice([1, x + 1, y + z + 1, z + 2]))
    I = lambda g: integrate(integrate(integrate(g * rho, (z, 0, top)), (y, c, d)), (x, a, b))
    M = I(1)
    add('solid', 'solid(%s, x, %d, %d, y, %d, %d, z, 0, %s)' % (ex(rho), a, b, c, d, ex(top)), M=fl(M), c=[fl(I(x) / M), fl(I(y) / M), fl(I(z) / M)], Ix=fl(I(y ** 2 + z ** 2)), Iy=fl(I(x ** 2 + z ** 2)), Iz=fl(I(x ** 2 + y ** 2)))
# ---- polar / cylindrical / spherical
for _ in range(6):
    g = poly([x, y], 2); r0, r1 = rnd.choice([(0, 1), (0, 2), (1, 3)]); t0, t1 = rnd.choice([(0, 2 * pi), (0, pi), (0, pi / 2), (-pi / 2, pi / 2)])
    val = integrate(integrate(g.subs({x: r * cos(t), y: r * sin(t)}) * r, (r, r0, r1)), (t, t0, t1))
    add('triple', 'polarint(%s, t, %s, %s, r, %d, %d)' % (ex(g), ex(t0), ex(t1), r0, r1), val=fl(val))
for _ in range(5):
    g = poly([x, y, z], 2); r0, r1 = rnd.choice([(0, 1), (0, 2)]); z0, z1 = rnd.choice([(0, 1), (0, 3), (-1, 2)]); t0, t1 = rnd.choice([(0, 2 * pi), (0, pi)])
    val = integrate(integrate(integrate(g.subs({x: r * cos(t), y: r * sin(t)}) * r, (z, z0, z1)), (r, r0, r1)), (t, t0, t1))
    add('triple', 'cylint(%s, t, %s, %s, r, %d, %d, z, %d, %d)' % (ex(g), ex(t0), ex(t1), r0, r1, z0, z1), val=fl(val))
for _ in range(5):
    g = poly([x, y, z], 2); r0, r1 = rnd.choice([(0, 1), (0, 2), (1, 2)]); p0, p1 = rnd.choice([(0, pi), (0, pi / 2), (pi / 3, 2 * pi / 3)]); t0, t1 = rnd.choice([(0, 2 * pi), (0, pi / 2)])
    sub = {x: r * sin(f) * cos(t), y: r * sin(f) * sin(t), z: r * cos(f)}
    val = integrate(integrate(integrate(sp.expand(g.subs(sub)) * r ** 2 * sin(f), (r, r0, r1)), (f, p0, p1)), (t, t0, t1))
    add('triple', 'sphint(%s, t, %s, %s, f, %s, %s, r, %d, %d)' % (ex(g), ex(t0), ex(t1), ex(p0), ex(p1), r0, r1), val=fl(val))
# ---- surface area (numerical oracle)
for _ in range(5):
    a, b = rnd.choice([-1, 0.5, 2, 1.5]), rnd.choice([1, -2, 0.5, 3])
    gz = rnd.choice([(a * x + b * y), x ** 2 + y ** 2, x * y, x ** 2 - y ** 2, 2 * x + y ** 2])
    gx, gy = sp.diff(gz, x), sp.diff(gz, y)
    fn = sp.lambdify((x, y), sp.sqrt(1 + gx ** 2 + gy ** 2), 'math')
    x1, y1 = rnd.choice([1, 2]), rnd.choice([1, 2])
    val = si.dblquad(lambda yy, xx: fn(xx, yy), 0, x1, 0, y1, epsabs=1e-12, epsrel=1e-12)[0]
    add('area', 'surfacearea(%s, x, 0, %d, y, 0, %d)' % (ex(gz), x1, y1), val=val)
for _ in range(2):
    R = rnd.choice([1, 2, 3]); h = rnd.choice([1, 2, 5]); add('area', 'surfacearea([%d*cos(u), %d*sin(u), v], u, 0, 2*pi, v, 0, %d)' % (R, R, h), val=2 * math.pi * R * h)
add('area', 'surfacearea([sin(f)*cos(t), sin(f)*sin(t), cos(f)], f, 0, pi, t, 0, 2*pi)', val=4 * math.pi)
add('area', 'surfacearea([r*cos(t), r*sin(t), r], r, 0, 2, t, 0, 2*pi)', val=math.sqrt(2) * math.pi * 4)
# ---- flux through graphs (upward) and spheres (outward) -- another way: direct integral with sympy
for _ in range(5):
    P, Q, Rr = [poly([x, y, z], 1) for _ in range(3)]
    gz = rnd.choice([x ** 2 + y ** 2, x + 2 * y, 1 + x * y, 3 - x ** 2])
    N = (-sp.diff(gz, x), -sp.diff(gz, y), 1)
    integrand = (P * N[0] + Q * N[1] + Rr * N[2]).subs(z, gz)
    val = integrate(integrate(integrand, (y, 0, 2)), (x, 0, 1))
    add('flux', 'flux([%s, %s, %s], %s, x, 0, 1, y, 0, 2)' % (ex(P), ex(Q), ex(Rr), ex(gz)), val=fl(val))
for _ in range(3):
    R = rnd.choice([1, 2, 3]); k = rnd.choice([1, 2])
    add('flux', 'flux([%d*x, %d*y, %d*z], [%d*sin(f)*cos(t), %d*sin(f)*sin(t), %d*cos(f)], f, 0, pi, t, 0, 2*pi)' % (k, k, k, R, R, R), val=k * 3 * (4 / 3) * math.pi * R ** 3)
# ---- Green: compare with the direct line integral around the rectangle
for _ in range(6):
    P, Q = poly([x, y], 2), poly([x, y], 2)
    a, b, c, d = rnd.randint(-2, 0), rnd.randint(1, 3), rnd.randint(-2, 0), rnd.randint(1, 3)
    # counter-clockwise: bottom (y=c, x a->b), right (x=b, y c->d), top (y=d, x b->a), left (x=a, y d->c)
    line = integrate(P.subs(y, c), (x, a, b)) + integrate(Q.subs(x, b), (y, c, d)) - integrate(P.subs(y, d), (x, a, b)) - integrate(Q.subs(x, a), (y, c, d))
    add('green', 'green(%s, %s, x, %d, %d, y, %d, %d)' % (ex(P), ex(Q), a, b, c, d), val=fl(line))
# ---- divergence theorem: sum of six face fluxes
for _ in range(5):
    P, Q, Rr = [poly([x, y, z], 2) for _ in range(3)]
    a, b = rnd.randint(-1, 0), rnd.randint(1, 2); c, d = rnd.randint(-1, 0), rnd.randint(1, 2); e, g = rnd.randint(-1, 0), rnd.randint(1, 2)
    flux = (integrate(integrate(P.subs(x, b) - P.subs(x, a), (y, c, d)), (z, e, g)) + integrate(integrate(Q.subs(y, d) - Q.subs(y, c), (x, a, b)), (z, e, g))
            + integrate(integrate(Rr.subs(z, g) - Rr.subs(z, e), (x, a, b)), (y, c, d)))
    add('div', 'divtheorem([%s, %s, %s], x, %d, %d, y, %d, %d, z, %d, %d)' % (ex(P), ex(Q), ex(Rr), a, b, c, d, e, g), val=fl(flux))
# ---- Stokes for a graph over a rectangle: boundary line integral lifted to the surface
for _ in range(5):
    P, Q, Rr = [poly([x, y, z], 1) for _ in range(3)]
    gz = rnd.choice([x ** 2 + y, 1 + x * y, 3 - x ** 2 - y ** 2, x + y])
    a, b, c, d = 0, rnd.randint(1, 2), 0, rnd.randint(1, 2)
    def edge(param, lo, hi, X, Y):
        Z = gz.subs({x: X, y: Y})
        integrand = P.subs({x: X, y: Y, z: Z}) * sp.diff(X, param) + Q.subs({x: X, y: Y, z: Z}) * sp.diff(Y, param) + Rr.subs({x: X, y: Y, z: Z}) * sp.diff(Z, param)
        return integrate(integrand, (param, lo, hi))
    s = sp.symbols('s', real=True)
    line = edge(s, a, b, s, c) + edge(s, c, d, b, s) - edge(s, a, b, s, d) - edge(s, c, d, a, s)
    add('stokes', 'stokes([%s, %s, %s], %s, x, %d, %d, y, %d, %d)' % (ex(P), ex(Q), ex(Rr), ex(gz), a, b, c, d), val=fl(line))
print(json.dumps(cases))
