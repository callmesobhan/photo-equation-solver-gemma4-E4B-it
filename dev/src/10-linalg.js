
// ======================================================================
// 10. Linear algebra (exact, over the rationals)
//     Matrices are written [[1, 2], [3, 4]]; a flat list [1, 2, 3] is a vector.
// ======================================================================
const MATFN = {};

function entryQ(node) {
  try {
    return rfConstQ(evalRF(node, new Map(), []));
  } catch (e) {
    if (e instanceof NotAlgebraic) throw new MathError('matrix entries must be rational numbers (integers, fractions or decimals)');
    throw e;
  }
}
const mDims = (A) => [A.length, A[0].length];
const mClone = (A) => A.map((r) => r.slice());
const mIdent = (n) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? Q1 : Q0)));
function mAdd(A, B, sign) {
  if (A.length !== B.length || A[0].length !== B[0].length) throw new MathError('the matrices must have the same size to add or subtract them');
  return A.map((r, i) => r.map((v, j) => (sign > 0 ? v.add(B[i][j]) : v.sub(B[i][j]))));
}
function mMul(A, B) {
  if (A[0].length !== B.length) throw new MathError('cannot multiply a ' + A.length + '×' + A[0].length + ' matrix by a ' + B.length + '×' + B[0].length + ' matrix');
  return A.map((r) => B[0].map((_, j) => r.reduce((s, v, k) => s.add(v.mul(B[k][j])), Q0)));
}
const mScale = (A, q) => A.map((r) => r.map((v) => v.mul(q)));
const mT = (A) => A[0].map((_, j) => A.map((r) => r[j]));
const mTrace = (A) => A.reduce((s, r, i) => s.add(r[i]), Q0);
function squareCheck(A, what) {
  if (A.length !== A[0].length) throw new MathError(what + ' needs a square matrix');
}
function mRref(A) {
  const M = mClone(A);
  const rows = M.length;
  const cols = M[0].length;
  const pivots = [];
  let r = 0;
  for (let c = 0; c < cols && r < rows; c++) {
    let p = -1;
    for (let i = r; i < rows; i++) {
      if (!M[i][c].isZero()) {
        p = i;
        break;
      }
    }
    if (p < 0) continue;
    [M[r], M[p]] = [M[p], M[r]];
    const inv = M[r][c].inv();
    M[r] = M[r].map((v) => v.mul(inv));
    for (let i = 0; i < rows; i++) {
      if (i !== r && !M[i][c].isZero()) {
        const f = M[i][c];
        M[i] = M[i].map((v, k) => v.sub(f.mul(M[r][k])));
      }
    }
    pivots.push(c);
    r++;
  }
  return { R: M, pivots };
}
function mDet(A) {
  squareCheck(A, 'the determinant');
  const n = A.length;
  const M = mClone(A);
  let det = Q1;
  for (let c = 0; c < n; c++) {
    let p = -1;
    for (let i = c; i < n; i++) {
      if (!M[i][c].isZero()) {
        p = i;
        break;
      }
    }
    if (p < 0) return Q0;
    if (p !== c) {
      [M[p], M[c]] = [M[c], M[p]];
      det = det.neg();
    }
    det = det.mul(M[c][c]);
    for (let i = c + 1; i < n; i++) {
      if (M[i][c].isZero()) continue;
      const f = M[i][c].div(M[c][c]);
      for (let k = c; k < n; k++) M[i][k] = M[i][k].sub(f.mul(M[c][k]));
    }
  }
  return det;
}
function mInv(A) {
  squareCheck(A, 'the inverse');
  const n = A.length;
  const aug = A.map((r, i) => r.concat(mIdent(n)[i]));
  const { R, pivots } = mRref(aug);
  if (pivots.slice(0, n).some((c, i) => c !== i)) return null;
  return R.map((r) => r.slice(n));
}
function mNullspace(A) {
  const { R, pivots } = mRref(A);
  const cols = A[0].length;
  const free = [];
  for (let c = 0; c < cols; c++) if (!pivots.includes(c)) free.push(c);
  return free.map((f) => {
    const v = new Array(cols).fill(Q0);
    v[f] = Q1;
    pivots.forEach((pc, i) => { v[pc] = R[i][f].neg(); });
    return v;
  });
}
function mPow(A, k) {
  squareCheck(A, 'a matrix power');
  if (k < 0) {
    const I = mInv(A);
    if (!I) throw new MathError('the matrix is singular, so it has no inverse');
    return mPow(I, -k);
  }
  let result = mIdent(A.length);
  let base = A;
  let e = k;
  while (e > 0) {
    if (e & 1) result = mMul(result, base);
    e >>= 1;
    if (e) base = mMul(base, base);
  }
  return result;
}
/** det(lambda I - A) as a monic polynomial (Faddeev-LeVerrier), coefficients low -> high */
function charPoly(A) {
  squareCheck(A, 'the characteristic polynomial');
  const n = A.length;
  const I = mIdent(n);
  let M = A.map((r) => r.map(() => Q0));
  const c = new Array(n + 1).fill(Q0);
  c[n] = Q1;
  for (let k = 1; k <= n; k++) {
    M = mAdd(mMul(A, M), mScale(I, c[n - k + 1]), 1);
    c[n - k] = mTrace(mMul(A, M)).neg().div(qInt(k));
  }
  return c;
}
function primitiveVector(v) {
  let l = 1n;
  for (const c of v) l = (l / bgcd(l, c.d)) * c.d;
  let ints = v.map((c) => c.n * (l / c.d));
  let g = 0n;
  for (const c of ints) g = bgcd(g, c);
  if (g > 1n) ints = ints.map((c) => c / g);
  const first = ints.find((c) => c !== 0n);
  if (first !== undefined && first < 0n) ints = ints.map((c) => -c);
  return ints.map((c) => new Q(c));
}

// ---- values ----------------------------------------------------------------------------------------------
const mat = (a, extra) => ({ t: 'mat', a, ...extra });
const scal = (q) => ({ t: 'num', q });
const symv = (S) => ({ t: 'sym', S });
function matFromAst(n) {
  if (n.t !== 'list') throw new MathError('a matrix is written like [[1, 2], [3, 4]]');
  const nested = n.items.length > 0 && n.items.every((r) => r.t === 'list');
  if (!nested && n.items.some((r) => r.t === 'list')) throw new MathError('the rows of a matrix must all be lists, e.g. [[1, 2], [3, 4]]');
  const rows = nested ? n.items.map((r) => r.items.map(entryQ)) : [n.items.map(entryQ)];
  if (!rows.length || !rows[0].length) throw new MathError('the matrix is empty');
  if (rows.some((r) => r.length !== rows[0].length)) throw new MathError('all rows of a matrix must have the same length');
  return mat(rows, { vec: !nested });
}
function evalMat(n) {
  switch (n.t) {
    case 'list': return matFromAst(n);
    case 'neg': {
      const v = evalMat(n.a);
      return v.t === 'mat' ? mat(mScale(v.a, qInt(-1)), { vec: v.vec }) : v.t === 'num' ? scal(v.q.neg()) : symv(sNeg(v.S));
    }
    case 'bin': {
      const a = evalMat(n.a);
      const b = evalMat(n.b);
      return matBinary(n.op, a, b, n);
    }
    case 'call':
      if (n.cmd && MATFN[n.fn]) {
        const r = MATFN[n.fn](n.args.map(evalMat), n, null);
        if (r.__skip) throw new MathError('"' + n.fn + '" gives several results, so it cannot be used inside a larger expression');
        return r;
      }
      if (n.cmd) {
        const S = commandValueS(n);
        return S.k === 'n' ? scal(S.q) : symv(S);
      }
      return scalarValue(n);
    default: return scalarValue(n);
  }
}
/** A number (exact rational when it is one, otherwise a symbolic expression such as sqrt(2) or pi). */
function scalarValue(n) {
  try {
    return scal(entryQ(n));
  } catch (e) {
    if (!(e instanceof MathError)) throw e;
    let S;
    try {
      S = fromAst(n);
    } catch (e2) {
      throw e;
    }
    return S.k === 'n' ? scal(S.q) : symv(S);
  }
}
function asCol(v) {
  return v.vec ? mT(v.a) : v.a;
}
function matBinary(op, a, b, node) {
  if ((a.t === 'sym' || b.t === 'sym') && a.t !== 'mat' && b.t !== 'mat') {
    const x = a.t === 'num' ? sN(a.q) : a.S;
    const y = b.t === 'num' ? sN(b.q) : b.S;
    const r = op === '+' ? sAdd([x, y]) : op === '-' ? sSub(x, y) : op === '*' ? sMul([x, y]) : op === '/' ? sDiv(x, y) : sPow(x, y);
    return r.k === 'n' ? scal(r.q) : symv(r);
  }
  if (a.t === 'num' && b.t === 'num') {
    const q = op === '+' ? a.q.add(b.q) : op === '-' ? a.q.sub(b.q) : op === '*' ? a.q.mul(b.q) : op === '/' ? a.q.div(b.q) : a.q.pow(Number(b.q.n));
    return scal(q);
  }
  if (op === '+' || op === '-') {
    if (a.t !== 'mat' || b.t !== 'mat') throw new MathError('a matrix cannot be added to a number');
    return mat(mAdd(a.a, b.a, op === '+' ? 1 : -1), { vec: a.vec && b.vec });
  }
  if (op === '*') {
    if (a.t === 'num') return mat(mScale(b.a, a.q), { vec: b.vec });
    if (b.t === 'num') return mat(mScale(a.a, b.q), { vec: a.vec });
    if (a.vec && b.vec) throw new MathError('use dot(u, v) for the dot product of two vectors');
    if (b.vec) return mat(mMul(a.a, asCol(b)), { col: true });
    if (a.vec) return mat(mMul(asCol(a), b.a));
    return mat(mMul(a.a, b.a));
  }
  if (op === '/') {
    if (b.t !== 'num') throw new MathError('you can only divide a matrix by a number');
    return mat(mScale(a.a, b.q.inv()), { vec: a.vec });
  }
  if (op === '^') {
    if (a.t !== 'mat' || b.t !== 'num' || !b.q.isInt()) throw new MathError('a matrix can only be raised to a whole-number power');
    return mat(mPow(a.a, Number(b.q.n)));
  }
  throw new MathError('unsupported matrix operation');
}

// ---- output ---------------------------------------------------------------------------------------------------
function matLines(A, vec) {
  if (vec) return ['[' + A[0].map((q) => q.toString()).join(', ') + ']'];
  const cells = A.map((r) => r.map((q) => q.toString()));
  const w = [];
  for (let j = 0; j < cells[0].length; j++) w.push(Math.max(...cells.map((r) => r[j].length)));
  return cells.map((r) => '[ ' + r.map((c, j) => c.padStart(w[j])).join('  ') + ' ]');
}
function presentValue(v, out) {
  if (v.t === 'mat') {
    const lines = v.col ? matLines(v.a, false) : matLines(v.a, v.vec);
    lines.forEach((l) => out.answer.push(l));
    if (!v.vec && v.a.length === 1 && v.a[0].length === 1) out.value = { q: v.a[0][0] };
  } else if (v.t === 'num') {
    out.answer.push(qLabel(v.q));
    out.value = { q: v.q };
  } else {
    const t = fmtS(v.S);
    const ev = varsOfS(v.S).size ? NaN : numS(v.S, {});
    out.answer.push(/^-?\d+$/.test(t) || !isFinite(ev) ? t : t + ' (' + approxSym(ev) + ' ' + fmtNum(ev) + ')');
    out.value = { S: v.S };
  }
  return out;
}
function defMat(names, fn, hint) {
  names.split(' ').forEach((nm) => {
    MATFN[nm] = fn;
    defCmd(nm, (n) => {
      if (hint && n.args.length < hint[0]) throw new MathError(nm + '(...) needs ' + hint[1]);
      const out = newOut();
      const v = fn(n.args.map(evalMat), n, out);
      return v.__skip ? out : presentValue(v, out);
    });
  });
}
const needMat = (v, what) => {
  if (v.t !== 'mat') throw new MathError(what + ' needs a matrix');
  return v.a;
};
const flat = (v) => {
  if (v.t !== 'mat') throw new MathError('a vector such as [1, 2, 3] is needed here');
  const a = v.a;
  if (a.length === 1) return a[0];
  if (a[0].length === 1) return a.map((r) => r[0]);
  throw new MathError('a vector such as [1, 2, 3] is needed here');
};

// ---- commands -----------------------------------------------------------------------------------------------------
defMat('det determinant', (args, n, out) => {
  const A = needMat(args[0], 'det');
  if (out) out.work.push('Type: determinant of a ' + A.length + '×' + A[0].length + ' matrix (exact, by elimination)');
  return scal(mDet(A));
}, [1, 'a square matrix']);
defMat('inv inverse', (args, n, out) => {
  const A = needMat(args[0], 'inv');
  squareCheck(A, 'the inverse');
  const I = mInv(A);
  if (!I) {
    throw new MathError('the matrix is singular (its determinant is 0), so it has no inverse');
  }
  if (out) {
    out.work.push('det = ' + mDet(A).toString());
    out.check = 'A × A⁻¹ = I';
  }
  return mat(I);
}, [1, 'a square matrix']);
defMat('transpose', (args) => {
  const v = args[0];
  const A = needMat(v, 'transpose');
  return mat(mT(A));
}, [1, 'a matrix']);
defMat('trace', (args) => scal(mTrace(needMat(args[0], 'trace'))), [1, 'a square matrix']);
defMat('rank', (args) => scal(qInt(mRref(needMat(args[0], 'rank')).pivots.length)), [1, 'a matrix']);
defMat('rref', (args, n, out) => {
  const { R, pivots } = mRref(needMat(args[0], 'rref'));
  if (out) out.work.push('Pivot columns: ' + pivots.map((c) => c + 1).join(', ') + '  (rank ' + pivots.length + ')');
  return mat(R);
}, [1, 'a matrix']);
defMat('nullspace kernel', (args, n, out) => {
  const A = needMat(args[0], 'nullspace');
  const basis = mNullspace(A);
  if (!basis.length) {
    if (out) out.work.push('Only the zero vector solves A x = 0');
    return mat([new Array(A[0].length).fill(Q0)], { vec: true });
  }
  if (out) out.work.push('Basis of the null space (' + basis.length + ' vector' + (basis.length > 1 ? 's' : '') + '), one per line');
  const outLines = basis.map((v) => '[' + primitiveVector(v).map((q) => q.toString()).join(', ') + ']');
  if (out) {
    out.answer.push(...outLines);
    out.__done = true;
  }
  return mat([[Q0]], { __skip: true });
}, [1, 'a matrix']);
defMat('colspace columnspace', (args, n, out) => {
  const A = needMat(args[0], 'colspace');
  const { pivots } = mRref(A);
  if (out) {
    out.work.push('The pivot columns of A are a basis of the column space (rank ' + pivots.length + ')');
    out.answer.push(...pivots.map((c) => '[' + A.map((r) => r[c].toString()).join(', ') + ']'));
    out.__done = true;
  }
  return mat([[Q0]], { __skip: true });
}, [1, 'a matrix']);
defMat('charpoly', (args, n, out) => {
  const A = needMat(args[0], 'charpoly');
  return symv(polyToS(charPoly(A), 'λ'));
}, [1, 'a square matrix']);
defMat('eigen eigenvalues eigenvectors eig', (args, n, out) => {
  const A = needMat(args[0], 'eigen');
  squareCheck(A, 'eigenvalues');
  const c = charPoly(A);
  const roots = polyRoots(c);
  out.work.push('Characteristic polynomial: ' + polyText(c, 'λ') + ' = 0');
  out.work.push('Eigenvalues λ with multiplicity, and a basis of eigenvectors for each');
  let total = 0;
  for (const r of roots.real) {
    let vecs;
    if (r.q) {
      const B = A.map((row, i) => row.map((v, j) => (i === j ? v.sub(r.q) : v)));
      vecs = mNullspace(B).map((v) => '[' + primitiveVector(v).map((q) => q.toString()).join(', ') + ']');
      total += vecs.length;
    } else {
      vecs = numericEigenvector(A, r.val);
    }
    out.answer.push('λ = ' + (r.text ? r.text + (r.q && r.q.isInt() ? '' : ' (≈ ' + fmtNum(r.val) + ')') : '≈ ' + fmtNum(r.val)) + (r.mult > 1 ? '  (multiplicity ' + r.mult + ')' : '') + ':  ' + vecs.join(', '));
  }
  for (const z of roots.complex.filter((w) => w.im > 0)) {
    const approx = complexNum(z.re, z.im);
    out.answer.push('λ = ' + (z.text ? z.text.replace(/\s+/g, '') === approx.replace(/\s+/g, '') ? z.text : z.text + ' (≈ ' + approx + ')' : '≈ ' + approx) + ' and its conjugate' + ((z.mult || 1) > 1 ? '  (multiplicity ' + z.mult + ')' : ''));
  }
  const allRational = roots.complex.length === 0 && roots.real.every((r) => r.q);
  if (allRational) {
    out.notes.push(total === A.length ? 'The matrix is diagonalizable (A = P D P⁻¹ with the eigenvectors as the columns of P).' : 'The matrix is not diagonalizable (not enough independent eigenvectors).');
  } else if (roots.real.some((r) => !r.q)) out.notes.push('Eigenvectors for irrational eigenvalues are given as decimals.');
  out.__done = true;
  return mat([[Q0]], { __skip: true });
}, [1, 'a square matrix']);
function numericEigenvector(A, lam) {
  const n = A.length;
  const M = A.map((row, i) => row.map((v, j) => v.toNumber() - (i === j ? lam : 0)));
  // find a null vector by Gaussian elimination with full pivoting tolerance
  const rowsN = M.map((r) => r.slice());
  const piv = [];
  let r = 0;
  for (let c = 0; c < n && r < n; c++) {
    let p = r;
    for (let i = r; i < n; i++) if (Math.abs(rowsN[i][c]) > Math.abs(rowsN[p][c])) p = i;
    if (Math.abs(rowsN[p][c]) < 1e-9) continue;
    [rowsN[r], rowsN[p]] = [rowsN[p], rowsN[r]];
    const d = rowsN[r][c];
    rowsN[r] = rowsN[r].map((v) => v / d);
    for (let i = 0; i < n; i++) if (i !== r) {
      const f = rowsN[i][c];
      rowsN[i] = rowsN[i].map((v, k) => v - f * rowsN[r][k]);
    }
    piv.push(c);
    r++;
  }
  const free = [];
  for (let c = 0; c < n; c++) if (!piv.includes(c)) free.push(c);
  return free.map((f) => {
    const v = new Array(n).fill(0);
    v[f] = 1;
    piv.forEach((pc, i) => { v[pc] = -rowsN[i][f]; });
    return '[' + v.map((x) => fmtNum(Math.abs(x) < 1e-12 ? 0 : x)).join(', ') + ']';
  });
}
defMat('diagonalize', (args, n, out) => {
  const A = needMat(args[0], 'diagonalize');
  squareCheck(A, 'diagonalization');
  const c = charPoly(A);
  const roots = polyRoots(c);
  if (roots.complex.length || roots.real.some((r) => !r.q)) throw new MathError('I can diagonalize matrices whose eigenvalues are all rational');
  const cols = [];
  const diag = [];
  for (const r of roots.real) {
    const B = A.map((row, i) => row.map((v, j) => (i === j ? v.sub(r.q) : v)));
    for (const v of mNullspace(B)) {
      cols.push(primitiveVector(v));
      diag.push(r.q);
    }
  }
  if (cols.length !== A.length) throw new MathError('this matrix is not diagonalizable (it does not have enough independent eigenvectors)');
  const P = mT(cols);
  const D = A.map((_, i) => A.map((__, j) => (i === j ? diag[i] : Q0)));
  out.answer.push('P =');
  matLines(P).forEach((l) => out.answer.push(l));
  out.answer.push('D =');
  matLines(D).forEach((l) => out.answer.push(l));
  const ok = mMul(mMul(P, D), mInv(P)).every((r, i) => r.every((v, j) => v.eq(A[i][j])));
  out.check = ok ? 'P D P⁻¹ = A' : null;
  out.__done = true;
  return mat([[Q0]], { __skip: true });
}, [1, 'a square matrix']);
defMat('lu', (args, n, out) => {
  const A = needMat(args[0], 'lu');
  squareCheck(A, 'the LU factorisation');
  const nn = A.length;
  const U = mClone(A);
  const L = mIdent(nn);
  const Pm = mIdent(nn);
  for (let c = 0; c < nn; c++) {
    let p = -1;
    for (let i = c; i < nn; i++) {
      if (!U[i][c].isZero()) {
        p = i;
        break;
      }
    }
    if (p < 0) continue;
    if (p !== c) {
      [U[p], U[c]] = [U[c], U[p]];
      [Pm[p], Pm[c]] = [Pm[c], Pm[p]];
      for (let k = 0; k < c; k++) [L[p][k], L[c][k]] = [L[c][k], L[p][k]];
    }
    for (let i = c + 1; i < nn; i++) {
      const f = U[i][c].div(U[c][c]);
      L[i][c] = f;
      for (let k = c; k < nn; k++) U[i][k] = U[i][k].sub(f.mul(U[c][k]));
    }
  }
  out.answer.push('P =');
  matLines(Pm).forEach((l) => out.answer.push(l));
  out.answer.push('L =');
  matLines(L).forEach((l) => out.answer.push(l));
  out.answer.push('U =');
  matLines(U).forEach((l) => out.answer.push(l));
  out.check = mMul(Pm, A).every((r, i) => r.every((v, j) => v.eq(mMul(L, U)[i][j]))) ? 'P A = L U' : null;
  out.__done = true;
  return mat([[Q0]], { __skip: true });
}, [1, 'a square matrix']);
defMat('linsolve', (args, n, out) => {
  const A = needMat(args[0], 'linsolve');
  const b = flat(args[1]);
  if (b.length !== A.length) throw new MathError('b must have one entry per row of A');
  const aug = A.map((r, i) => r.concat([b[i]]));
  const { R, pivots } = mRref(aug);
  const nv = A[0].length;
  if (pivots.includes(nv)) {
    out.answer.push('no solution (the system is inconsistent)');
  } else if (pivots.length === nv) {
    out.answer.push('x = [' + pivots.map((c, i) => R[i][nv].toString()).join(', ') + ']');
    out.check = 'A x = b';
  } else {
    const free = [];
    for (let c = 0; c < nv; c++) if (!pivots.includes(c)) free.push(c);
    const names = A[0].map((_, j) => 'x' + (j + 1));
    pivots.forEach((pc, i) => {
      out.answer.push(names[pc] + ' = ' + linText(R[i][nv], free.map((f) => [R[i][f].neg(), names[f]])));
    });
    out.answer.push(free.map((f) => names[f]).join(', ') + ' can be any number' + (free.length > 1 ? 's' : ''));
  }
  out.__done = true;
  return mat([[Q0]], { __skip: true });
}, [2, 'a matrix A and a vector b']);
// ---- vectors -------------------------------------------------------------------------------------------------------
const dotQ = (u, v) => {
  if (u.length !== v.length) throw new MathError('the vectors must have the same length');
  return u.reduce((s, a, i) => s.add(a.mul(v[i])), Q0);
};
defMat('dot', (args) => scal(dotQ(flat(args[0]), flat(args[1]))), [2, 'two vectors']);
defMat('cross', (args) => {
  const u = flat(args[0]);
  const v = flat(args[1]);
  if (u.length !== 3 || v.length !== 3) throw new MathError('the cross product needs two vectors with 3 entries');
  return mat([[u[1].mul(v[2]).sub(u[2].mul(v[1])), u[2].mul(v[0]).sub(u[0].mul(v[2])), u[0].mul(v[1]).sub(u[1].mul(v[0]))]], { vec: true });
}, [2, 'two vectors with 3 entries']);
defMat('norm magnitude length', (args) => {
  const u = flat(args[0]);
  return symv(sSqrt(sN(dotQ(u, u))));
}, [1, 'a vector']);
defMat('angle', (args, n, out) => {
  const u = flat(args[0]);
  const v = flat(args[1]);
  const d = dotQ(u, v);
  const nu = sSqrt(sN(dotQ(u, u)));
  const nv = sSqrt(sN(dotQ(v, v)));
  const c = simp(sDiv(sN(d), sMul([nu, nv])));
  const theta = sFn('acos', [c]);
  const deg = (numS(theta, {}) * 180) / Math.PI;
  if (out) out.work.push('cos θ = (u·v)/(|u||v|) = ' + fmtS(c) + '   (θ ≈ ' + fmtNum(deg) + '°)');
  return symv(theta);
}, [2, 'two vectors']);
defMat('proj projection', (args) => {
  const u = flat(args[0]);
  const v = flat(args[1]);
  const k = dotQ(u, v).div(dotQ(v, v));
  return mat([v.map((x) => x.mul(k))], { vec: true });
}, [2, 'two vectors (projection of the first onto the second)']);
defMat('unit normalize', (args, n, out) => {
  const u = flat(args[0]);
  const nrm = sSqrt(sN(dotQ(u, u)));
  const parts = u.map((x) => simp(sDiv(sN(x), nrm)));
  out.answer.push('[' + parts.map((p) => fmtS(p)).join(', ') + ']');
  out.__done = true;
  return mat([[Q0]], { __skip: true });
}, [1, 'a vector']);

/** Matrix arithmetic written directly:  A*B,  A^-1,  2A + B ... */
function matrixExpression(n) {
  const out = newOut();
  const v = evalMat(n);
  if (v.t === 'mat' || hasNode(n, ['list'])) out.work.push('Type: matrix arithmetic (exact)');
  return presentValue(v, out);
}
