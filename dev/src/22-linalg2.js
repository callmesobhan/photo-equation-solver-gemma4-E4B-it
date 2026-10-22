// ======================================================================
// 22. More linear algebra: QR, Cholesky / LDL^T, definiteness, pseudoinverse, least squares, singular values, matrix exponential.
// ======================================================================
/** Lines of an aligned grid of text cells. */
function la2Grid(cells) {
  const w = [];
  for (let j = 0; j < cells[0].length; j++) w.push(Math.max(...cells.map((r) => r[j].length)));
  return cells.map((r) => '[ ' + r.map((c, j) => c.padStart(w[j])).join('  ') + ' ]');
}
const la2Sym = (S) => fmtS(simp(S));
const la2Num = (S) => numS(simp(S), {});
const la2IsSymmetric = (A) => A.length === A[0].length && A.every((r, i) => r.every((v, j) => v.eq(A[j][i])));
/** Decimal matrix product for the self-checks. */
function la2NumMul(A, B) {
  return A.map((r) => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
}
const la2Close = (A, B, tol) => A.length === B.length && A.every((r, i) => r.every((v, j) => Math.abs(v - B[i][j]) <= tol * (1 + Math.abs(B[i][j]))));
const la2ToNum = (A) => A.map((r) => r.map((q) => q.toNumber()));

defMat('qr qrdecomposition', (args, n, out) => {
  const A = needMat(args[0], 'qr');
  const m = A.length;
  const nc = A[0].length;
  if (nc > m) throw new MathError('qr needs at least as many rows as columns (the columns must be independent)');
  const cols = mT(A);
  const us = [];
  cols.forEach((a, j) => {
    let u = a.slice();
    us.forEach((b) => {
      const k = dotQ(a, b).div(dotQ(b, b));
      u = u.map((x, i) => x.sub(k.mul(b[i])));
    });
    if (u.every((x) => x.isZero())) throw new MathError('the columns are dependent (column ' + (j + 1) + ' is a combination of the earlier ones), so there is no QR factorisation with an invertible R');
    us.push(u);
  });
  const norms = us.map((u) => sSqrt(sN(dotQ(u, u))));
  const Q = mT(us.map((u, j) => u.map((x) => sDiv(sN(x), norms[j]))));
  const R = us.map((u, i) => cols.map((a, j) => (j < i ? sN(Q0) : j === i ? norms[i] : sDiv(sN(dotQ(a, us[i])), norms[i]))));
  out.work.push('Gram-Schmidt on the columns of A: the columns of Q are the normalised vectors, R = Qᵀ A is upper triangular');
  out.answer.push('Q =');
  la2Grid(Q.map((r) => r.map(la2Sym))).forEach((l) => out.answer.push(l));
  out.answer.push('R =');
  la2Grid(R.map((r) => r.map(la2Sym))).forEach((l) => out.answer.push(l));
  const Qn = Q.map((r) => r.map(la2Num));
  const Rn = R.map((r) => r.map(la2Num));
  const ok = la2Close(la2NumMul(Qn, Rn), la2ToNum(A), 1e-9) && la2Close(la2NumMul(mT(Qn), Qn), la2ToNum(mIdent(nc)), 1e-9);
  out.check = ok ? 'Q R = A and QᵀQ = I (checked with decimals)' : null;
  out.__done = true;
  return mat([[Q0]], { __skip: true });
}, [1, 'a matrix with independent columns']);

/** LDL^T of a symmetric matrix without pivoting: returns { L, D } or the index of the first non-positive pivot. */
function la2Ldl(A) {
  const nn = A.length;
  const L = mIdent(nn);
  const D = [];
  for (let j = 0; j < nn; j++) {
    let d = A[j][j];
    for (let k = 0; k < j; k++) d = d.sub(L[j][k].mul(L[j][k]).mul(D[k]));
    if (d.sign() <= 0) return { bad: j, d };
    D.push(d);
    for (let i = j + 1; i < nn; i++) {
      let v = A[i][j];
      for (let k = 0; k < j; k++) v = v.sub(L[i][k].mul(L[j][k]).mul(D[k]));
      L[i][j] = v.div(d);
    }
  }
  return { L, D };
}
defMat('cholesky choleskydecomposition ldl', (args, n, out) => {
  const A = needMat(args[0], 'cholesky');
  squareCheck(A, 'the Cholesky factorisation');
  if (!la2IsSymmetric(A)) throw new MathError('the matrix must be symmetric (equal to its transpose)');
  const r = la2Ldl(A);
  if (r.bad !== undefined) throw new MathError('the matrix is not positive definite (the pivot in position ' + (r.bad + 1) + ' is ' + r.d.toString() + ' ≤ 0), so it has no Cholesky factorisation');
  const { L, D } = r;
  const nn = A.length;
  const sq = D.map((d) => sSqrt(sN(d)));
  const G = L.map((row, i) => row.map((v, j) => (j > i ? sN(Q0) : sMul([sN(v), sq[j]]))));
  out.work.push('A = L D Lᵀ with L unit lower triangular and D = diag(' + D.map((d) => d.toString()).join(', ') + ') (all positive)');
  out.work.push('L =');
  la2Grid(L.map((row) => row.map((q) => q.toString()))).forEach((l) => out.work.push(l));
  out.answer.push('G =');
  la2Grid(G.map((row) => row.map(la2Sym))).forEach((l) => out.answer.push(l));
  out.answer.push('A = G Gᵀ');
  const Gn = G.map((row) => row.map(la2Num));
  out.check = la2Close(la2NumMul(Gn, mT(Gn)), la2ToNum(A), 1e-9) ? 'G Gᵀ = A (checked with decimals)' : null;
  void nn;
  out.__done = true;
  return mat([[Q0]], { __skip: true });
}, [1, 'a symmetric positive definite matrix']);

/** Number of sign changes in a coefficient list, zeros ignored. */
function la2SignChanges(c) {
  let ch = 0;
  let prev = 0;
  c.forEach((q) => {
    const s = q.sign();
    if (s === 0) return;
    if (prev !== 0 && s !== prev) ch++;
    prev = s;
  });
  return ch;
}
defMat('definite posdef positivedefinite definiteness classifymatrix', (args, n, out) => {
  const A = needMat(args[0], 'definite');
  squareCheck(A, 'definiteness');
  if (!la2IsSymmetric(A)) throw new MathError('the matrix must be symmetric to be classified (for xᵀA x only the symmetric part counts: use (A + Aᵀ)/2)');
  const nn = A.length;
  const c = charPoly(A);
  // a real-rooted polynomial has exactly as many positive roots as sign changes of its coefficients (Descartes)
  let zeros = 0;
  while (zeros < nn && c[zeros].isZero()) zeros++;
  const pos = la2SignChanges(c);
  const negC = c.map((q, i) => (i % 2 ? q.neg() : q));
  const neg = la2SignChanges(negC);
  const minors = [];
  for (let k = 1; k <= nn; k++) minors.push(mDet(A.slice(0, k).map((row) => row.slice(0, k))));
  out.work.push('Leading principal minors: ' + minors.map((q) => q.toString()).join(', '));
  out.work.push('Eigenvalues: ' + pos + ' positive, ' + neg + ' negative, ' + zeros + ' zero (counted from the characteristic polynomial, exact)');
  let kind;
  if (pos === nn) kind = 'positive definite (all eigenvalues > 0, xᵀA x > 0 for every x ≠ 0)';
  else if (neg === nn) kind = 'negative definite (all eigenvalues < 0, xᵀA x < 0 for every x ≠ 0)';
  else if (neg === 0) kind = 'positive semidefinite (eigenvalues ≥ 0, with ' + zeros + ' equal to 0)';
  else if (pos === 0) kind = 'negative semidefinite (eigenvalues ≤ 0, with ' + zeros + ' equal to 0)';
  else kind = 'indefinite (it has both positive and negative eigenvalues)';
  out.answer.push('the matrix is ' + kind);
  out.__done = true;
  return mat([[Q0]], { __skip: true });
}, [1, 'a symmetric matrix']);

/** Moore-Penrose pseudoinverse of a rational matrix (exact, from a rank factorisation A = C F). */
function la2Pinv(A) {
  const m = A.length;
  const nc = A[0].length;
  const { R, pivots } = mRref(A);
  const r = pivots.length;
  if (r === 0) return Array.from({ length: nc }, () => new Array(m).fill(Q0));
  const C = A.map((row) => pivots.map((p) => row[p]));
  const F = R.slice(0, r);
  const Ct = mT(C);
  const Ft = mT(F);
  return mMul(mMul(Ft, mInv(mMul(F, Ft))), mMul(mInv(mMul(Ct, C)), Ct));
}
defMat('pinv pseudoinverse moorepenrose', (args, n, out) => {
  const A = needMat(args[0], 'pinv');
  const P = la2Pinv(A);
  const AP = mMul(A, P);
  const PA = mMul(P, A);
  const eq = (X, Y) => X.every((r, i) => r.every((v, j) => v.eq(Y[i][j])));
  const ok = eq(mMul(AP, A), A) && eq(mMul(PA, P), P) && eq(AP, mT(AP)) && eq(PA, mT(PA));
  out.work.push('Moore-Penrose pseudoinverse A⁺ = Fᵀ(F Fᵀ)⁻¹(CᵀC)⁻¹Cᵀ from a rank factorisation A = C F (C = pivot columns of A, F = non-zero rows of rref A); rank ' + mRref(A).pivots.length);
  out.check = ok ? 'A A⁺ A = A, A⁺ A A⁺ = A⁺, and A A⁺, A⁺ A are symmetric' : null;
  return mat(P);
}, [1, 'a matrix']);

defMat('leastsquares lstsq normalequations', (args, n, out) => {
  const A = needMat(args[0], 'leastsquares');
  const b = flat(args[1]);
  const m = A.length;
  const nc = A[0].length;
  if (b.length !== m) throw new MathError('b must have one entry per row of A');
  const rank = mRref(A).pivots.length;
  const At = mT(A);
  const x = mMul(la2Pinv(A), b.map((v) => [v])).map((r) => r[0]);
  const fit = mMul(A, x.map((v) => [v])).map((r) => r[0]);
  const res = b.map((v, i) => v.sub(fit[i]));
  const r2 = res.reduce((s, v) => s.add(v.mul(v)), Q0);
  out.work.push('Normal equations AᵀA x = Aᵀb' + (rank === nc ? ' (AᵀA is invertible: the solution is unique)' : ' (A has rank ' + rank + ' < ' + nc + ' columns: the minimum-norm solution is given, any vector of the null space can be added)'));
  out.answer.push('x̂ = [' + x.map((q) => q.toString()).join(', ') + ']');
  out.answer.push('fitted values A x̂ = [' + fit.map((q) => q.toString()).join(', ') + ']');
  out.answer.push('residual b − A x̂ = [' + res.map((q) => q.toString()).join(', ') + '],  ‖residual‖ = ' + la2Sym(sSqrt(sN(r2))) + ' (squared: ' + r2.toString() + ')');
  const orth = mMul(At, res.map((v) => [v])).every((r) => r[0].isZero());
  out.check = orth ? 'Aᵀ(b − A x̂) = 0: the residual is perpendicular to the columns of A' : null;
  out.__done = true;
  return mat([[Q0]], { __skip: true });
}, [2, 'a matrix A and a vector b']);

// ---- singular values ------------------------------------------------------------------------------------------------------------------
/** One-sided Jacobi SVD of an m x n decimal matrix (m >= n): { U, s, V } with A = U diag(s) V^T, s descending. */
function la2Svd(A0) {
  const m = A0.length;
  const nc = A0[0].length;
  const U = A0.map((r) => r.slice());
  const V = Array.from({ length: nc }, (_, i) => Array.from({ length: nc }, (__, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 60; sweep++) {
    let rotated = false;
    for (let i = 0; i < nc - 1; i++) {
      for (let j = i + 1; j < nc; j++) {
        let al = 0;
        let be = 0;
        let ga = 0;
        for (let k = 0; k < m; k++) {
          al += U[k][i] * U[k][i];
          be += U[k][j] * U[k][j];
          ga += U[k][i] * U[k][j];
        }
        if (Math.abs(ga) <= 1e-15 * Math.sqrt(al * be) || ga === 0) continue;
        rotated = true;
        const zeta = (be - al) / (2 * ga);
        const t = Math.sign(zeta || 1) / (Math.abs(zeta) + Math.sqrt(1 + zeta * zeta));
        const c = 1 / Math.sqrt(1 + t * t);
        const s = c * t;
        for (let k = 0; k < m; k++) {
          const a = U[k][i];
          const b = U[k][j];
          U[k][i] = c * a - s * b;
          U[k][j] = s * a + c * b;
        }
        for (let k = 0; k < nc; k++) {
          const a = V[k][i];
          const b = V[k][j];
          V[k][i] = c * a - s * b;
          V[k][j] = s * a + c * b;
        }
      }
    }
    if (!rotated) break;
  }
  const sv = [];
  for (let j = 0; j < nc; j++) {
    let s2 = 0;
    for (let k = 0; k < m; k++) s2 += U[k][j] * U[k][j];
    sv.push({ s: Math.sqrt(s2), j });
  }
  sv.sort((p, q) => q.s - p.s);
  const smax = sv[0].s;
  const Uo = Array.from({ length: m }, () => []);
  const Vo = Array.from({ length: nc }, () => []);
  const s = [];
  sv.forEach(({ s: sj, j }) => {
    s.push(sj);
    for (let k = 0; k < m; k++) Uo[k].push(sj > 1e-12 * (smax || 1) ? U[k][j] / sj : 0);
    for (let k = 0; k < nc; k++) Vo[k].push(V[k][j]);
  });
  return { U: Uo, s, V: Vo };
}
defMat('svd singularvalues', (args, n, out) => {
  const A = needMat(args[0], 'svd');
  const m = A.length;
  const nc = A[0].length;
  const trans = m < nc;
  const An = la2ToNum(trans ? mT(A) : A);
  const r = la2Svd(An);
  const U = trans ? r.V : r.U;
  const V = trans ? r.U : r.V;
  const k = r.s.length;
  const tol = 1e-10 * (r.s[0] || 1);
  const rank = r.s.filter((s) => s > tol).length;
  // exact values when the eigenvalues of AᵀA can be written down
  const G = trans ? mMul(A, mT(A)) : mMul(mT(A), A);
  const roots = polyRoots(charPoly(G));
  const exact = [];
  roots.real.forEach((rt) => {
    for (let i = 0; i < rt.mult; i++) exact.push({ val: Math.sqrt(Math.max(0, rt.val)), text: rt.q ? la2Sym(sSqrt(sN(rt.q))) : rt.text ? 'sqrt(' + rt.text + ')' : null });
  });
  exact.sort((p, q) => q.val - p.val);
  const useExact = roots.complex.length === 0 && exact.length === k && exact.every((e) => e.text);
  out.work.push('Singular values are the square roots of the eigenvalues of ' + (trans ? 'A Aᵀ' : 'Aᵀ A') + '; rank = number of non-zero singular values');
  r.s.forEach((s, i) => {
    const e = useExact ? exact[i] : null;
    const tx = e && e.text !== fmtNum(s) ? e.text + ' ≈ ' + fmtNum(s) : fmtNum(s);
    out.answer.push('σ' + (i + 1) + ' = ' + (Math.abs(s) < tol ? '0' : tx));
  });
  out.answer.push('rank ' + rank + ',  largest singular value (2-norm) ' + fmtNum(r.s[0]) + (rank === k ? ',  condition number ' + fmtNum(r.s[0] / r.s[k - 1]) : ',  condition number infinite (singular)'));
  const fro = A.reduce((s, row) => row.reduce((t, v) => t.add(v.mul(v)), s), Q0);
  out.work.push('Frobenius norm √(Σ aᵢⱼ²) = ' + la2Sym(sSqrt(sN(fro))) + ' = sqrt(σ₁² + σ₂² + …)');
  const dec = (M) => la2Grid(M.map((row) => row.map((v) => fmtNum(Math.abs(v) < 1e-12 ? 0 : v))));
  out.work.push('U (decimals, ' + m + '×' + k + ') =');
  dec(U).forEach((l) => out.work.push(l));
  out.work.push('V (decimals, ' + nc + '×' + k + ') =');
  dec(V).forEach((l) => out.work.push(l));
  const Rn = la2NumMul(la2NumMul(U, r.s.map((s, i) => r.s.map((_, j) => (i === j ? s : 0)))), mT(V));
  out.check = la2Close(Rn, la2ToNum(A), 1e-8) ? 'U Σ Vᵀ reproduces A (checked with decimals)' : null;
  out.__done = true;
  return mat([[Q0]], { __skip: true });
}, [1, 'a matrix']);

// ---- matrix exponential ------------------------------------------------------------------------------------------------------------------------
/** e^A for a decimal square matrix: Taylor series with scaling and squaring. */
function la2ExpmNum(A) {
  const nn = A.length;
  let norm = 0;
  A.forEach((r) => { norm = Math.max(norm, r.reduce((s, v) => s + Math.abs(v), 0)); });
  let sq = 0;
  while (norm > 0.5) { norm /= 2; sq++; }
  const f = Math.pow(2, -sq);
  const B = A.map((r) => r.map((v) => v * f));
  let term = A.map((r, i) => r.map((_, j) => (i === j ? 1 : 0)));
  let sum = term.map((r) => r.slice());
  for (let k = 1; k < 40; k++) {
    term = la2NumMul(term, B).map((r) => r.map((v) => v / k));
    sum = sum.map((r, i) => r.map((v, j) => v + term[i][j]));
  }
  for (let i = 0; i < sq; i++) sum = la2NumMul(sum, sum);
  void nn;
  return sum;
}
defMat('expm matrixexp matrixexponential', (args, n, out) => {
  const A = needMat(args[0], 'expm');
  squareCheck(A, 'the matrix exponential');
  const nn = A.length;
  if (nn > 6) throw new MathError('expm handles matrices up to 6×6');
  let tS = sN(Q1);
  if (args[1]) {
    if (args[1].t === 'num') tS = sN(args[1].q);
    else if (args[1].t === 'sym') tS = args[1].S;
    else throw new MathError('the second argument of expm is the time t: a number or the letter t');
  }
  const tVars = varsOfS(tS);
  if (tVars.size > 1) throw new MathError('use at most one letter for t');
  const c = charPoly(A);
  const roots = polyRoots(c);
  const rational = roots.complex.length === 0 && roots.real.every((r) => r.q);
  const label = !args[1] ? 'e^A' : tVars.size ? 'e^(A' + Array.from(tVars)[0] + ')' : 'e^(A·' + la2Sym(tS) + ')';
  const tNum = tVars.size ? 0.7 : numS(tS, {});
  const ref = la2ExpmNum(la2ToNum(A).map((r) => r.map((v) => v * tNum)));
  let Ex;
  if (rational) {
    // generalised eigenspaces: S has a basis of ker (A - λI)^m for each eigenvalue; E_λ projects onto its block
    const blocks = [];
    roots.real.forEach((rt) => {
      let M = A.map((row, i) => row.map((v, j) => (i === j ? v.sub(rt.q) : v)));
      let Mp = mIdent(nn);
      for (let i = 0; i < rt.mult; i++) Mp = mMul(Mp, M);
      blocks.push({ lam: rt.q, m: rt.mult, basis: mNullspace(Mp), M });
    });
    const cols = [];
    blocks.forEach((b) => b.basis.forEach((v) => cols.push(v)));
    if (cols.length !== nn) throw new MathError('could not find the generalised eigenvectors');
    const Smat = mT(cols);
    const Sinv = mInv(Smat);
    let at = 0;
    const terms = A.map((row) => row.map(() => []));
    blocks.forEach((b) => {
      const sel = cols.map((_, idx) => (idx >= at && idx < at + b.basis.length ? Q1 : Q0));
      at += b.basis.length;
      const E = mMul(Smat.map((row) => row.map((v, j) => v.mul(sel[j]))), Sinv);
      let Mk = E;
      const ex = sExp(sMul([sN(b.lam), tS]));
      for (let k = 0; k < b.m; k++) {
        const coef = new Q(1n, factorialBig(k));
        for (let i = 0; i < nn; i++) {
          for (let j = 0; j < nn; j++) {
            const v = Mk[i][j].mul(coef);
            if (!v.isZero()) terms[i][j].push(sMul([sN(v), sPow(tS, sI(k)), ex]));
          }
        }
        Mk = mMul(b.M, Mk);
      }
    });
    Ex = terms.map((row) => row.map((ts) => simp(ts.length ? sAdd(ts) : sN(Q0))));
  } else if (nn === 2 && roots.complex.length === 2 && roots.real.length === 0) {
    // complex pair alpha +- i beta: e^(At) = e^(alpha t) (cos(beta t) I + sin(beta t)/beta (A - alpha I))
    const alpha = mTrace(A).div(qInt(2));
    const beta2 = mDet(A).sub(alpha.mul(alpha));
    const beta = sSqrt(sN(beta2));
    const bt = sMul([beta, tS]);
    const ea = sExp(sMul([sN(alpha), tS]));
    const cs = sFn('cos', [bt]);
    const sn = sDiv(sFn('sin', [bt]), beta);
    Ex = A.map((row, i) => row.map((v, j) => simp(sMul([ea, sAdd([i === j ? cs : sN(Q0), sMul([sn, sN(i === j ? v.sub(alpha) : v)])])]))));
    out.work.push('Complex eigenvalues ' + alpha.toString() + ' ± i·' + la2Sym(beta) + ';  e^(At) = e^(αt) (cos(βt) I + sin(βt)/β (A − αI))');
  } else {
    if (tVars.size) throw new MathError('with irrational eigenvalues or a larger matrix with complex eigenvalues expm needs a numeric t (an exact formula is not available here)');
    const num = ref;
    out.work.push('The eigenvalues are not all rational, so the entries are decimals (Taylor series with scaling and squaring)');
    out.answer.push(label + ' =');
    la2Grid(num.map((row) => row.map((v) => fmtNum(v)))).forEach((l) => out.answer.push(l));
    out.__done = true;
    return mat([[Q0]], { __skip: true });
  }
  if (rational) out.work.push('Eigenvalues ' + roots.real.map((r) => r.q.toString() + (r.mult > 1 ? ' (×' + r.mult + ')' : '')).join(', ') + ';  e^(At) = Σ e^(λt) Σₖ tᵏ/k! (A − λI)ᵏ E_λ over the generalised eigenspaces');
  out.answer.push(label + ' =');
  la2Grid(Ex.map((row) => row.map(la2Sym))).forEach((l) => out.answer.push(l));
  const tcheck = tVars.size ? { [Array.from(tVars)[0]]: 0.7 } : {};
  const got = Ex.map((row) => row.map((e) => numS(e, tcheck)));
  out.check = la2Close(got, ref, 1e-8) ? 'agrees with the series e^M = I + M + M²/2! + … evaluated numerically' : null;
  out.__done = true;
  return mat([[Q0]], { __skip: true });
}, [1, 'a square matrix (and optionally t): expm([[1,2],[0,3]], t)']);
function factorialBig(k) {
  let f = 1n;
  for (let i = 2n; i <= BigInt(k); i++) f *= i;
  return f;
}

// ---- Jordan normal form ------------------------------------------------------------------------------------------------------------------------
defMat('jordan jordanform', (args, n, out) => {
  const A = needMat(args[0], 'jordan');
  squareCheck(A, 'the Jordan form');
  const nn = A.length;
  if (nn > 6) throw new MathError('jordan handles matrices up to 6×6');
  const roots = polyRoots(charPoly(A));
  if (roots.complex.length || roots.real.some((r) => !r.q)) throw new MathError('I can build the Jordan form when all eigenvalues are rational');
  const lams = roots.real.slice().sort((p, q) => p.val - q.val);
  const cols = [];
  const diag = [];
  const sup = [];
  const blocksText = [];
  const rankOf = (vs) => mRref(vs).pivots.length;
  lams.forEach((rt) => {
    const N = A.map((row, i) => row.map((v, j) => (i === j ? v.sub(rt.q) : v)));
    const pw = [mIdent(nn)];
    for (let k = 1; k <= rt.mult + 1; k++) pw.push(mMul(pw[k - 1], N));
    const dims = pw.map((P) => nn - mRref(P).pivots.length);
    const atLeast = (k) => dims[k] - dims[k - 1];
    const have = [];
    const sizes = [];
    for (let s = rt.mult; s >= 1; s--) {
      const exactly = atLeast(s) - (s < rt.mult ? atLeast(s + 1) : 0);
      let got = 0;
      for (const cand of mNullspace(pw[s])) {
        if (got >= exactly) break;
        const chain = [];
        let v = primitiveVector(cand);
        for (let j = 0; j < s; j++) {
          chain.unshift(v);
          v = mMul(N, v.map((x) => [x])).map((r) => r[0]);
        }
        if (v.some((x) => !x.isZero())) continue;
        if (rankOf(have.concat(chain)) !== have.length + s) continue;
        chain.forEach((c) => have.push(c));
        sizes.push({ s, chain });
        got++;
      }
      if (got !== exactly) throw new MathError('could not build the Jordan chains for λ = ' + rt.q.toString());
    }
    sizes.forEach(({ s, chain }) => {
      chain.forEach((c, j) => {
        cols.push(c);
        diag.push(rt.q);
        sup.push(j > 0);
      });
      blocksText.push('J' + s + '(' + rt.q.toString() + ')');
    });
  });
  const P = mT(cols);
  const J = Array.from({ length: nn }, (_, i) => Array.from({ length: nn }, (__, j) => (i === j ? diag[i] : j === i + 1 && sup[j] ? Q1 : Q0)));
  const Pinv = mInv(P);
  if (!Pinv) throw new MathError('could not build an invertible P');
  const ok = mMul(mMul(P, J), Pinv).every((r, i) => r.every((v, j) => v.eq(A[i][j])));
  out.work.push('Jordan blocks: ' + blocksText.join(', ') + '  (Jₛ(λ) is an s×s block with λ on the diagonal and 1 above it)');
  out.answer.push('J =');
  matLines(J).forEach((l) => out.answer.push(l));
  out.answer.push('P =  (columns: a chain of generalised eigenvectors for each block)');
  matLines(P).forEach((l) => out.answer.push(l));
  out.answer.push('A = P J P⁻¹');
  out.check = ok ? 'P J P⁻¹ = A (exact)' : null;
  out.__done = true;
  return mat([[Q0]], { __skip: true });
}, [1, 'a square matrix with rational eigenvalues']);
