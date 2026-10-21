# Oracle for the linear-algebra commands: sympy matrices (exact).
import json, random, sys
import sympy as sp
random.seed(int(sys.argv[1]) if len(sys.argv) > 1 else 1)
R = random.randint
T = []
def add(cmd, t, v, **kw): T.append(dict(cmd=cmd, t=t, v=v, **kw))
def mtext(M): return '[' + ', '.join('[' + ', '.join(str(x) for x in M.row(i)) + ']' for i in range(M.rows)) + ']'
def rows(M): return [[str(sp.Rational(x)) for x in M.row(i)] for i in range(M.rows)]
for _ in range(60):
    n = R(2, 4)
    A = sp.Matrix(n, n, lambda i, j: R(-6, 6))
    B = sp.Matrix(n, n, lambda i, j: R(-6, 6))
    add(f'det({mtext(A)})', 'scalar', str(A.det()))
    add(f'trace({mtext(A)})', 'scalar', str(A.trace()))
    add(f'rank({mtext(A)})', 'scalar', str(A.rank()))
    add(f'transpose({mtext(A)})', 'matrix', rows(A.T))
    add(f'{mtext(A)}*{mtext(B)}', 'matrix', rows(A * B))
    add(f'{mtext(A)}+{mtext(B)}', 'matrix', rows(A + B))
    add(f'{mtext(A)}^2', 'matrix', rows(A ** 2))
    if A.det() != 0:
        add(f'inv({mtext(A)})', 'matrix', rows(A.inv()))
        add(f'{mtext(A)}^-1', 'matrix', rows(A.inv()))
        b = sp.Matrix(n, 1, lambda i, j: R(-9, 9))
        x = A.inv() * b
        add(f'linsolve({mtext(A)}, [{", ".join(str(v) for v in b)}])', 'vec', [str(v) for v in x])
    else:
        add(f'inv({mtext(A)})', 'error', 'singular')
    Rr, piv = A.rref()
    add(f'rref({mtext(A)})', 'matrix', rows(Rr))
    ns = A.nullspace()
    add(f'nullspace({mtext(A)})', 'nullspace', [mtext(A), len(ns)])
# rank-deficient and rectangular
for _ in range(25):
    m, n = R(2, 4), R(2, 5)
    A = sp.Matrix(m, n, lambda i, j: R(-3, 3))
    add(f'rank({mtext(A)})', 'scalar', str(A.rank()))
    add(f'rref({mtext(A)})', 'matrix', rows(A.rref()[0]))
    add(f'nullspace({mtext(A)})', 'nullspace', [mtext(A), len(A.nullspace())])
# eigenvalues from similarity transforms
for _ in range(25):
    n = R(2, 3)
    ev = [R(-4, 4) for _ in range(n)]
    P = sp.Matrix(n, n, lambda i, j: R(-2, 2))
    while P.det() not in (1, -1):
        P = sp.Matrix(n, n, lambda i, j: R(-2, 2))
    A = P * sp.diag(*ev) * P.inv()
    add(f'eigen({mtext(A)})', 'eigen', [mtext(A), sorted(ev)])
for _ in range(20):
    u = [R(-5, 5) for _ in range(3)]; v = [R(-5, 5) for _ in range(3)]
    U, V = sp.Matrix(u), sp.Matrix(v)
    add(f'dot({u}, {v})', 'scalar', str(U.dot(V)))
    add(f'cross({u}, {v})', 'vec', [str(x) for x in U.cross(V)])
    add(f'norm({u})', 'num', float(U.norm()))
json.dump(T, sys.stdout)
