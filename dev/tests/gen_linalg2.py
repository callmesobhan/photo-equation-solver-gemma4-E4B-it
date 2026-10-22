# Oracle cases for QR, Cholesky, definiteness, pseudoinverse, least squares, SVD and the matrix exponential (numpy / scipy / sympy).
import json, sys, random
import numpy as np
import scipy.linalg as sl
import sympy as sp

seed = int(sys.argv[1]) if len(sys.argv) > 1 else 1
rnd = random.Random(seed)
cases = []
def add(kind, cmd, **kw): cases.append(dict(kind=kind, cmd=cmd, **kw))
def mtxt(M): return '[' + ', '.join('[' + ', '.join(str(int(v)) for v in row) + ']' for row in M) + ']'
def rmat(m, n, lo=-5, hi=5): return [[rnd.randint(lo, hi) for _ in range(n)] for _ in range(m)]

# QR: independent columns
for _ in range(12):
    n = rnd.randint(1, 3); m = rnd.randint(n, 4)
    A = rmat(m, n)
    if np.linalg.matrix_rank(np.array(A, float)) < n: continue
    Qn, Rn = np.linalg.qr(np.array(A, float))
    s = np.sign(np.diag(Rn)); s[s == 0] = 1
    add('qr', 'qr(%s)' % mtxt(A), A=A, R=(Rn * s[:, None]).tolist())
add('qrdep', 'qr(%s)' % mtxt([[1, 2], [2, 4], [3, 6]]))
# Cholesky
for _ in range(10):
    n = rnd.randint(1, 4)
    B = np.array(rmat(n, n, -3, 3))
    A = (B.T @ B + np.eye(n, dtype=int) * rnd.randint(0, 2)).astype(int)
    if np.linalg.matrix_rank(A) < n or np.min(np.linalg.eigvalsh(A.astype(float))) < 1e-9: continue
    add('chol', 'cholesky(%s)' % mtxt(A), A=A.tolist(), G=np.linalg.cholesky(A.astype(float)).tolist())
add('cholbad', 'cholesky(%s)' % mtxt([[1, 2], [2, 1]]))
add('cholbad', 'cholesky(%s)' % mtxt([[1, 2], [3, 4]]))
# definiteness
for _ in range(30):
    n = rnd.randint(1, 4)
    t = rnd.choice(['pd', 'nd', 'psd', 'nsd', 'ind', 'rand'])
    B = np.array(rmat(rnd.randint(1, n), n, -3, 3))
    if t == 'pd': A = B.T @ B + np.eye(n, dtype=int) * rnd.randint(1, 3)
    elif t == 'nd': A = -(B.T @ B + np.eye(n, dtype=int))
    elif t == 'psd': A = B.T @ B
    elif t == 'nsd': A = -(B.T @ B)
    else:
        S = np.array(rmat(n, n, -4, 4)); A = S + S.T
    ev = np.linalg.eigvalsh(A.astype(float))
    pos = int((ev > 1e-8).sum()); neg = int((ev < -1e-8).sum()); zero = n - pos - neg
    kind = 'positive definite' if pos == n else 'negative definite' if neg == n else 'positive semidefinite' if neg == 0 else 'negative semidefinite' if pos == 0 else 'indefinite'
    add('definite', 'definite(%s)' % mtxt(A.tolist()), kindname=kind, pos=int(pos), neg=int(neg), zero=int(zero))
# pseudoinverse
for _ in range(14):
    m, n = rnd.randint(1, 4), rnd.randint(1, 4)
    if rnd.random() < 0.4 and m > 1 and n > 1:
        r = rnd.randint(1, min(m, n) - 1) if min(m, n) > 1 else 1
        A = (np.array(rmat(m, r, -3, 3)) @ np.array(rmat(r, n, -3, 3))).tolist()
    else: A = rmat(m, n, -4, 4)
    add('pinv', 'pinv(%s)' % mtxt(A), P=np.linalg.pinv(np.array(A, float)).tolist())
# least squares
for _ in range(14):
    n = rnd.randint(1, 3); m = rnd.randint(n, 5)
    A = rmat(m, n, -4, 4)
    if rnd.random() < 0.25 and n > 1:
        for row in A: row[-1] = 2 * row[0]
    b = [rnd.randint(-6, 6) for _ in range(m)]
    x, res, rk, sv = np.linalg.lstsq(np.array(A, float), np.array(b, float), rcond=None)
    r = np.array(b, float) - np.array(A, float) @ x
    add('lstsq', 'leastsquares(%s, %s)' % (mtxt(A), '[' + ', '.join(map(str, b)) + ']'), x=x.tolist(), rnorm=float(np.linalg.norm(r)))
# SVD
for _ in range(14):
    m, n = rnd.randint(1, 4), rnd.randint(1, 4)
    if rnd.random() < 0.3 and m > 1 and n > 1:
        r = 1 if min(m, n) == 2 else rnd.randint(1, min(m, n) - 1)
        A = (np.array(rmat(m, r, -3, 3)) @ np.array(rmat(r, n, -3, 3))).tolist()
    else: A = rmat(m, n, -5, 5)
    s = np.linalg.svd(np.array(A, float), compute_uv=False)
    add('svd', 'svd(%s)' % mtxt(A), A=A, s=s.tolist(), rank=int(np.linalg.matrix_rank(np.array(A, float))))
# matrix exponential with numeric t
for _ in range(14):
    n = rnd.randint(2, 3)
    A = rmat(n, n, -2, 2)
    t = rnd.choice([(1, '1'), (2, '2'), (0.5, '1/2'), (-1, '-1'), (3, '3')])
    add('expmnum', 'expm(%s, %s)' % (mtxt(A), t[1]), A=A, t=t[0], exp={'1': sl.expm(np.array(A, float) * t[0]).tolist()})
# exact: rational eigenvalues (triangular, similar to diagonal, Jordan)
for _ in range(16):
    n = rnd.randint(2, 3)
    kind = rnd.choice(['tri', 'sim', 'jordan'])
    if kind == 'tri':
        A = [[rnd.randint(-2, 2) if j >= i else 0 for j in range(n)] for i in range(n)]
    elif kind == 'sim':
        while True:
            P = np.array(rmat(n, n, -2, 2))
            d = round(abs(np.linalg.det(P)))
            if d == 1: break
        D = np.diag([rnd.randint(-2, 2) for _ in range(n)])
        A = (P @ D @ np.round(np.linalg.inv(P)).astype(int)).tolist()
    else:
        lam = rnd.randint(-2, 2)
        A = [[lam if i == j else (1 if j == i + 1 else 0) for j in range(n)] for i in range(n)]
    add('expmsym', 'expm(%s, t)' % mtxt(A), A=A, exp={str(tv): sl.expm(np.array(A, float) * tv).tolist() for tv in (0.37, 1.3)})
# complex pairs, 2x2
for _ in range(10):
    a, b = rnd.randint(-2, 2), rnd.randint(1, 3)
    c = rnd.choice([-1, 1]) * rnd.randint(1, 3)
    A = [[a, b], [-c, a + rnd.randint(-1, 1) * 0]]
    tr, dt = A[0][0] + A[1][1], A[0][0] * A[1][1] - A[0][1] * A[1][0]
    if tr * tr - 4 * dt >= 0: continue
    add('expmsym', 'expm(%s, t)' % mtxt(A), A=A, exp={str(tv): sl.expm(np.array(A, float) * tv).tolist() for tv in (0.37, 1.3)})
# Jordan form: A = P J P^-1 with a unimodular P and random blocks
for _ in range(14):
    n = rnd.randint(2, 4)
    blocks = []; left = n
    while left > 0:
        s = rnd.randint(1, left); blocks.append((rnd.randint(-2, 2), s)); left -= s
    J = np.zeros((n, n), dtype=int); k = 0
    for lam, s in blocks:
        for i in range(s):
            J[k + i, k + i] = lam
            if i + 1 < s: J[k + i, k + i + 1] = 1
        k += s
    while True:
        P = np.array(rmat(n, n, -2, 2))
        if round(abs(np.linalg.det(P))) == 1: break
    A = P @ J @ np.round(np.linalg.inv(P)).astype(int)
    add('jordan', 'jordan(%s)' % mtxt(A.tolist()), A=A.tolist(), blocks=sorted([list(b) for b in blocks]))
print(json.dumps(cases))
