# Oracle cases for Fourier series: coefficients by adaptive quadrature (scipy.integrate.quad) for random functions, piecewise definitions,
# |x - c| and the half-range cosine / sine series.
import json, sys, random, math
import numpy as np
from scipy.integrate import quad

seed = int(sys.argv[1]) if len(sys.argv) > 1 else 1
rnd = random.Random(seed)
cases = []
def coefs(pieces, a, b, nmax=4):
    T = b - a; w = 2 * math.pi / T
    def I(fn):
        s = 0.0
        for (f, lo, hi) in pieces:
            s += quad(lambda x: f(x) * fn(x), lo, hi, limit=200, epsabs=1e-13, epsrel=1e-13)[0]
        return s
    mean = I(lambda x: 1.0) / T
    A = [2 / T * I(lambda x, n=n: math.cos(n * w * x)) for n in range(1, nmax + 1)]
    B = [2 / T * I(lambda x, n=n: math.sin(n * w * x)) for n in range(1, nmax + 1)]
    return mean, A, B
def add(cmd, pieces, a, b): 
    mean, A, B = coefs(pieces, a, b)
    cases.append(dict(cmd=cmd, mean=mean, A=A, B=B))
INTERVALS = [('-pi', 'pi', -math.pi, math.pi), ('0', '2*pi', 0, 2 * math.pi), ('-1', '1', -1, 1), ('0', '1', 0, 1), ('-2', '2', -2, 2), ('0', '3', 0, 3), ('-3', '3', -3, 3), ('0', '4', 0, 4)]
for _ in range(14):
    ta, tb, a, b = rnd.choice(INTERVALS)
    c = [rnd.randint(-3, 3) for _ in range(4)]
    deg = rnd.randint(1, 3)
    terms = ['%d*x^%d' % (c[i], i) for i in range(deg + 1) if c[i]]
    if not terms: continue
    f = lambda x, c=c, deg=deg: sum(c[i] * x ** i for i in range(deg + 1))
    add('fourier(%s, x, %s, %s)' % (' + '.join(terms), ta, tb), [(f, a, b)], a, b)
for _ in range(8):
    ta, tb, a, b = rnd.choice(INTERVALS)
    k = rnd.choice([0.5, 1.5, 2.5, 0.25]); kind = rnd.choice(['exp', 'sin', 'cos'])
    f = {'exp': lambda x, k=k: math.exp(k * x), 'sin': lambda x, k=k: math.sin(k * x), 'cos': lambda x, k=k: math.cos(k * x)}[kind]
    add('fourier(%s(%s*x), x, %s, %s)' % (kind, k, ta, tb), [(f, a, b)], a, b)
for _ in range(6):
    ta, tb, a, b = rnd.choice(INTERVALS)
    c = round(rnd.uniform(a + 0.2 * (b - a), b - 0.2 * (b - a)), 1)
    add('fourier(abs(x - %s), x, %s, %s)' % (c, ta, tb), [(lambda x, c=c: abs(x - c), a, b)], a, b)
for _ in range(8):
    ta, tb, a, b = rnd.choice(INTERVALS)
    m = round((a + b) / 2, 3) if rnd.random() < 0.5 else round(a + (b - a) * rnd.choice([0.25, 0.5, 0.75]), 4)
    c1, c2, d = rnd.randint(-3, 3), rnd.randint(-3, 3), rnd.randint(-2, 2)
    f1 = lambda x, c1=c1: c1 + 0.0
    f2 = lambda x, c2=c2, d=d: c2 + d * x
    add('fourier(%s, %s + %s*x, x, %s, %s, %s)' % (c1, c2, d, ta, m, tb), [(f1, a, m), (f2, m, b)], a, b)
for _ in range(8):
    L = rnd.choice([('pi', math.pi), ('1', 1.0), ('2', 2.0), ('3', 3.0)])
    fx = rnd.choice([('x', lambda x: x), ('x^2', lambda x: x * x), ('1', lambda x: 1.0), ('x*(1 - x/%s)' % L[0], lambda x, L=L: x * (1 - x / L[1])), ('sin(x/2)', lambda x: math.sin(x / 2))])
    cos_series = rnd.random() < 0.5
    f = fx[1]
    if cos_series: pieces = [((lambda x, f=f: f(-x)), -L[1], 0.0), (f, 0.0, L[1])]
    else: pieces = [((lambda x, f=f: -f(-x)), -L[1], 0.0), (f, 0.0, L[1])]
    add('%s(%s, x, %s)' % ('fouriercos' if cos_series else 'fouriersin', fx[0], L[0]), pieces, -L[1], L[1])
print(json.dumps(cases))
