# Oracle for Laplace transforms: scipy numerical integration of the definition (forward), and
# real-form transform pairs built with sympy (inverse); everything is compared numerically.
import json, random, sys
import sympy as sp
import numpy as np
from scipy import integrate as si
random.seed(int(sys.argv[1]) if len(sys.argv) > 1 else 1)
t, s = sp.symbols('t s', positive=True)
R = random.randint
T = []
def ptxt(e): return str(e).replace('**', '^')
def rterm():
    c = R(-5, 5) or 2
    n = R(0, 3)
    a = R(-3, 3)
    kind = random.choice(['1', 'sin', 'cos', '1'])
    b = R(1, 4)
    f = c * t ** n * sp.exp(a * t)
    base = 1 / (s - a)
    if kind == 'sin': f *= sp.sin(b * t); base = b / ((s - a) ** 2 + b ** 2)
    if kind == 'cos': f *= sp.cos(b * t); base = (s - a) / ((s - a) ** 2 + b ** 2)
    F = c * (-1) ** n * sp.diff(base, s, n)
    return f, F
for _ in range(60):
    parts = [rterm() for _ in range(R(1, 3))]
    f = sum(p[0] for p in parts)
    fl = sp.lambdify(t, f, 'numpy')
    vals = []
    for s0 in (9.5, 12.3, 15.1):
        v = si.quad(lambda x: float(fl(x)) * np.exp(-s0 * x), 0, 80, limit=400)[0]
        vals.append([s0, v])
    T.append(dict(cmd=f'laplace({ptxt(f)}, t, s)', t='laplace', v=vals))
for _ in range(60):
    parts = [rterm() for _ in range(R(1, 2))]
    f = sum(p[0] for p in parts)
    F = sp.together(sum(p[1] for p in parts))
    fl = sp.lambdify(t, f, 'numpy')
    T.append(dict(cmd=f'ilaplace({ptxt(F)}, s, t)', t='ilaplace', v=[[t0, float(fl(t0))] for t0 in (0.3, 0.9, 1.7, 2.4)]))
json.dump(T, sys.stdout)
