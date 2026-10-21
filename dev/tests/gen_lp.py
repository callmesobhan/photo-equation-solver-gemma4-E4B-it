# Oracle for linear programming: scipy.optimize.linprog (HiGHS) and brute force for integer programs.
import json, random, sys, itertools
import numpy as np
from scipy.optimize import linprog
random.seed(int(sys.argv[1]) if len(sys.argv) > 1 else 1)
R = random.randint
T = []
names = 'xyz'
def term(c, v): return '' if c == 0 else (('+ ' if c > 0 else '- ') + (str(abs(c)) if abs(c) != 1 else '') + v)
def lin(cs, first=True):
    s = ' '.join(term(c, v) for c, v in zip(cs, names) if c != 0) or '0'
    return s[2:] if s.startswith('+ ') else s.replace('- ', '-', 1) if s.startswith('- ') else s
for _ in range(60):
    n = R(2, 3)
    m = R(2, 5)
    c = [R(-5, 6) for _ in range(n)]
    if all(v == 0 for v in c): c[0] = 1
    A = [[R(-3, 6) for _ in range(n)] for _ in range(m)]
    b = [R(2, 30) for _ in range(m)]
    ops = [random.choice(['<=', '<=', '<=', '>=']) for _ in range(m)]
    Aub, bub = [], []
    for row, bi, op in zip(A, b, ops):
        if op == '<=': Aub.append(row); bub.append(bi)
        else: Aub.append([-v for v in row]); bub.append(-bi)
    goal = random.choice(['maximize', 'minimize'])
    sign = -1 if goal == 'maximize' else 1
    res = linprog([sign * v for v in c], A_ub=Aub, b_ub=bub, bounds=[(0, None)] * n, method='highs')
    cons = ', '.join(f'{lin(row)} {op} {bi}' for row, bi, op in zip(A, b, ops) if any(row)) + ', ' + ', '.join(names[:n]) + ' >= 0'
    cmd = f'{goal} {lin(c)} subject to {cons}'
    if res.status == 0: T.append(dict(cmd=cmd, t='opt', v=sign * res.fun))
    elif res.status == 2: T.append(dict(cmd=cmd, t='infeasible', v=None))
    elif res.status == 3: T.append(dict(cmd=cmd, t='unbounded', v=None))
# integer programs by brute force
for _ in range(20):
    n = 2
    c = [R(1, 6) for _ in range(n)]
    A = [[R(1, 5) for _ in range(n)] for _ in range(R(2, 3))]
    b = [R(6, 25) for _ in A]
    best = None
    for x in itertools.product(range(0, 26), repeat=n):
        if all(sum(a * xi for a, xi in zip(row, x)) <= bi for row, bi in zip(A, b)):
            v = sum(ci * xi for ci, xi in zip(c, x))
            if best is None or v > best: best = v
    cons = ', '.join(f'{lin(row)} <= {bi}' for row, bi in zip(A, b))
    T.append(dict(cmd=f'maximize {lin(c)} subject to {cons}, x, y >= 0, x and y are integers', t='opt', v=best))
json.dump(T, sys.stdout)
