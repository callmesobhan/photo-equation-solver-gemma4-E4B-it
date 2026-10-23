// ======================================================================
// 30. Equilibria and phase portraits:  y' = f(y) (phase line: equilibria, stability, direction of the flow),
//     x' = f(x, y), y' = g(x, y) (equilibria, Jacobian, type of each equilibrium by trace / determinant),
//     and the type of a linear system x' = A x (saddle, node, spiral, centre ...).
// ======================================================================
const phZero = (x, scale) => Math.abs(x) <= 1e-9 * (1 + (scale || 0));
const phSgn = (x, scale) => (phZero(x, scale) ? 0 : x > 0 ? 1 : -1);
const phNum = (x) => (x instanceof Q ? x.toNumber() : x);
const phSq = (v) => v * v;
const phText = (x) => {
  const rec = recognize(x);
  if (!rec) return fmtNum(x);
  return rec.rational && !rec.text.includes('/') ? rec.text : rec.text + ' (' + approxSym(x) + ' ' + fmtNum(x) + ')';
};
/** type of the linear system with matrix [[a, b], [c, d]] (entries: Q or numbers) */
function phClassify(a, b, c, d) {
  const exact = [a, b, c, d].every((v) => v instanceof Q);
  let tr;
  let det;
  let disc;
  if (exact) {
    tr = a.add(d);
    det = a.mul(d).sub(b.mul(c));
    disc = tr.mul(tr).sub(qInt(4).mul(det));
  } else {
    const [A, B, C, D] = [a, b, c, d].map(phNum);
    tr = A + D;
    det = A * D - B * C;
    disc = tr * tr - 4 * det;
  }
  const scale = Math.max(...[a, b, c, d].map((v) => Math.abs(phNum(v))));
  const sg = (x) => (exact ? x.sign() : phSgn(x, scale * scale));
  const sTr = exact ? tr.sign() : phSgn(tr, scale);
  const sDet = sg(det);
  const sDisc = sg(disc);
  let kind;
  let stab;
  if (sDet < 0) { kind = 'saddle point'; stab = 'unstable'; } else if (sDet === 0) {
    kind = sTr === 0 ? 'degenerate: both eigenvalues are 0 (every orbit is a straight line or a point)' : 'degenerate: one eigenvalue is 0, so there is a whole line of equilibria; the other eigenvalue ' + (exact ? tr.toString() : fmtNum(tr)) + (sTr < 0 ? ' attracts' : ' repels') + ' the orbits along the other direction';
    stab = sTr < 0 ? 'stable (not asymptotically)' : 'unstable';
  } else if (sDisc > 0) {
    kind = sTr < 0 ? 'node (sink)' : sTr > 0 ? 'node (source)' : 'saddle';
    stab = sTr < 0 ? 'asymptotically stable' : 'unstable';
  } else if (sDisc === 0) {
    const star = exact ? b.isZero() && c.isZero() : phZero(phNum(b)) && phZero(phNum(c));
    kind = star ? 'star node (a proper node: every direction is an eigen-direction)' : 'degenerate (improper) node, one eigen-direction';
    stab = sTr < 0 ? 'asymptotically stable' : 'unstable';
  } else if (sTr < 0) { kind = 'spiral (sink)'; stab = 'asymptotically stable'; } else if (sTr > 0) { kind = 'spiral (source)'; stab = 'unstable'; } else { kind = 'centre (closed orbits around the origin)'; stab = 'stable (neutrally: orbits neither approach nor leave)'; }
  // eigenvalues
  let eig;
  if (exact) {
    const half = new Q(1n, 2n);
    if (sDisc >= 0) {
      const root = simp(sSqrt(sN(disc)));
      eig = [1, -1].map((s) => symText(simp(sMul([sN(half), sAdd([sN(tr), s > 0 ? root : sNeg(root)])]))));
      if (sDisc === 0) eig = [eig[0] + ' (double)'];
    } else {
      const root = simp(sSqrt(sN(disc.neg())));
      const re = tr.mul(half);
      const im = simp(sMul([sN(half), root]));
      eig = [(re.isZero() ? '' : re.toString() + ' ± ') + (fmtS(im) === '1' ? '' : fmtS(im)) + 'i'].map((t) => t.replace(/^(.*)± i$/, '$1± i'));
    }
  } else if (sDisc >= 0) {
    const r = Math.sqrt(Math.max(disc, 0));
    eig = sDisc === 0 ? [fmtNum(tr / 2) + ' (double)'] : [fmtNum((tr + r) / 2), fmtNum((tr - r) / 2)];
  } else {
    const im = Math.sqrt(-disc) / 2;
    eig = [(phZero(tr) ? '' : fmtNum(tr / 2) + ' ± ') + (fmtNum(im) === '1' ? '' : fmtNum(im)) + 'i'];
  }
  const label = kind + ': ' + stab;
  return { kind, stab, label, tr, det, disc, eig, sDet, sTr, sDisc, exact };
}
const phTrDet = (r) => 'trace = ' + (r.exact ? r.tr.toString() : fmtNum(r.tr)) + ',  determinant = ' + (r.exact ? r.det.toString() : fmtNum(r.det)) + ',  discriminant = ' + (r.exact ? r.disc.toString() : fmtNum(r.disc));

defMat('classify phasetype', (args, n, out) => {
  const A = needMat(args[0], 'classify');
  if (A.length !== A[0].length || A.length < 2 || A.length > 3) throw new MathError('classify needs a 2×2 (or 3×3) matrix A of the system x\' = A x');
  if (A.length === 3) {
    const rts = polyRoots(charPoly(A));
    const reals = rts.real.map((r) => r.val);
    const cx = rts.complex.map((z) => z.re);
    const all = reals.concat(cx);
    const eigs = rts.real.map((r) => (r.text || fmtNum(r.val))).concat(rts.complex.filter((z) => z.im > 0).map((z) => fmtNum(z.re) + ' ± ' + fmtNum(Math.abs(z.im)) + 'i'));
    const mx = Math.max(...all);
    const mn = Math.min(...all);
    out.answer.push('eigenvalues ' + eigs.join(', '));
    out.answer.push(mx < -1e-9 ? 'asymptotically stable (every eigenvalue has a negative real part): the origin is a sink' : mn > 1e-9 ? 'unstable (every eigenvalue has a positive real part): the origin is a source' : all.some((x) => x > 1e-9) && all.some((x) => x < -1e-9) ? 'unstable saddle (eigenvalues of both signs)' : all.some((x) => x > 1e-9) ? 'unstable' : 'neutral: an eigenvalue has real part 0 (stability depends on the Jordan blocks)');
    return g3Out(out);
  }
  const r = phClassify(A[0][0], A[0][1], A[1][0], A[1][1]);
  out.answer.push(r.label);
  out.answer.push('eigenvalues ' + r.eig.join(', '));
  out.work.push(phTrDet(r) + '   (det < 0: saddle;  det > 0 and trace² − 4det > 0: node;  < 0: spiral;  trace = 0: centre)');
  return g3Out(out);
}, [1, 'a matrix: classify([[3,1],[1,3]])']);

// ---- y' = f(y): phase line --------------------------------------------------------------------------------------------------------------
/** real zeros of f(v) with their exact text where known: [{val, text}] */
function phRoots1(S, v) {
  const node = parseExpression(fmtS(S, true));
  try {
    const dom = [];
    const rf = evalRF(node, new Map([[v, RF_X]]), dom);
    if (!rf.n.length) return { identical: true, roots: [] };
    const bad = [];
    for (const P of dom.concat(rf.d.length > 1 ? [rf.d] : [])) polyRoots(P).real.forEach((r) => bad.push(r.val));
    const rr = polyRoots(rf.n).real.filter((r) => !bad.some((b) => Math.abs(b - r.val) < 1e-9)).map((r) => ({ val: r.val, text: r.text }));
    return { roots: rr };
  } catch (e) {
    if (!(e instanceof NotAlgebraic)) throw e;
  }
  const F = (x) => numS(S, { [v]: x });
  const lo = -10;
  const hi = 10;
  const steps = 20000;
  const h = (hi - lo) / steps;
  const roots = [];
  let prev = F(lo);
  for (let i = 1; i <= steps; i++) {
    const x = lo + i * h;
    const f = F(x);
    if (isFinite(prev) && isFinite(f)) {
      if (f === 0) roots.push(x);
      else if (prev !== 0 && (prev < 0) !== (f < 0)) roots.push(bisect(F, x - h, x));
    }
    prev = f;
  }
  // touching roots
  for (let i = 1; i < steps; i++) {
    const x = lo + i * h;
    const a = F(x - h);
    const b = F(x);
    const c = F(x + h);
    if ([a, b, c].every(isFinite) && (a < 0) === (b < 0) && (b < 0) === (c < 0) && Math.abs(b) <= Math.abs(a) && Math.abs(b) <= Math.abs(c) && Math.abs(b) < 0.5 * Math.max(Math.abs(a), Math.abs(c))) {
      let m = minimizeAbs(F, x - h, x + h);
      const D = (t) => (F(t + 1e-5) - F(t - 1e-5)) / 2e-5;
      if ((D(x - h) < 0) !== (D(x + h) < 0)) m = bisect(D, x - h, x + h);
      if (Math.abs(F(m)) < 1e-9 && !roots.some((r) => Math.abs(r - m) < 1e-6)) roots.push(m);
    }
  }
  roots.sort((p, q) => p - q);
  const uniq = roots.filter((r, i) => i === 0 || r - roots[i - 1] > 1e-7);
  return { roots: uniq.map((val) => ({ val, text: null })) };
}
defCmd('equilibria phaseline fixedpoints', (n) => {
  needArgs(n, 1, 2, 'f(y) for y\' = f(y), and optionally the variable: equilibria(y*(1-y), y)');
  const out = newOut();
  const S = fromAst(n.args[0]);
  const vs = Array.from(varsOfS(S));
  const v = n.args[1] ? varOfArg(n.args[1]) : vs.length === 1 ? vs[0] : vs.includes('y') ? 'y' : null;
  if (!v) throw new MathError('say which letter is the unknown function: equilibria(f, y)');
  if (vs.some((u) => u !== v)) throw new MathError('the right-hand side must depend on ' + v + ' only (an autonomous equation ' + v + '\' = f(' + v + ')); other letters: ' + vs.filter((u) => u !== v).join(', '));
  const { roots, identical } = phRoots1(S, v);
  if (identical) {
    out.answer.push('f is identically 0: every value is an equilibrium');
    return out;
  }
  const dS = diffS(S, v);
  const F = (x) => numS(S, { [v]: x });
  const Fp = (x) => numS(dS, { [v]: x });
  out.work.push(v + '\' = ' + fmtS(S) + ';  equilibria are the solutions of f(' + v + ') = 0;  f′(' + v + ') = ' + fmtS(dS));
  if (!roots.length) {
    out.answer.push('no equilibrium: ' + v + '\' never vanishes, so every solution is ' + (F(0) > 0 ? 'increasing' : 'decreasing') + ' for all t');
    return out;
  }
  const eqs = roots.map((r) => r.val);
  roots.forEach((r, i) => {
    const gapL = i > 0 ? (eqs[i] - eqs[i - 1]) / 2 : 1;
    const gapR = i < eqs.length - 1 ? (eqs[i + 1] - eqs[i]) / 2 : 1;
    const dl = Math.min(0.05, gapL * 0.5);
    const dr = Math.min(0.05, gapR * 0.5);
    const left = Math.sign(F(r.val - dl));
    const right = Math.sign(F(r.val + dr));
    const slope = Fp(r.val);
    let kind;
    if (left > 0 && right < 0) kind = 'stable (sink): solutions nearby approach it';
    else if (left < 0 && right > 0) kind = 'unstable (source): solutions nearby move away';
    else if (left === right && left !== 0) kind = 'semi-stable: ' + (left > 0 ? 'solutions below approach it, those above move away' : 'solutions above approach it, those below move away');
    else kind = 'sign of f could not be decided';
    out.answer.push(v + ' = ' + (r.text && !/\//.test(r.text) ? r.text : phText(r.val)) + ': ' + kind + (phZero(slope) ? '   (f′ = 0 there)' : '   (f′ = ' + fmtNum(slope) + ')'));
  });
  // the phase line
  const cut = [-Infinity].concat(eqs, [Infinity]);
  const parts = [];
  for (let i = 0; i < cut.length - 1; i++) {
    const a = cut[i];
    const b = cut[i + 1];
    const mid = a === -Infinity ? b - 1 : b === Infinity ? a + 1 : (a + b) / 2;
    const f = F(mid);
    parts.push('(' + (a === -Infinity ? '-∞' : phText(a).replace(/ \(.*$/, '')) + ', ' + (b === Infinity ? '∞' : phText(b).replace(/ \(.*$/, '')) + '): ' + v + '′ ' + (f > 0 ? '> 0, ' + v + ' increases ↑' : '< 0, ' + v + ' decreases ↓'));
  }
  out.work.push('phase line:  ' + parts.join(';  '));
  out.check = 'the sign of f on each interval and at both sides of every equilibrium decides the type';
  return out;
});

/** Real zeros of F = (f, g) in [-10, 10]^2 by Newton's method from a dense grid of starting points */
function phEquilibria(F) {
  const norm = (a) => Math.max(Math.abs(a[0]), Math.abs(a[1]));
  const sols = [];
  const grid = [];
  for (let i = -10; i <= 10; i += 0.75) grid.push(i + 0.0137);
  for (const gx of grid) {
    for (const gy of grid) {
      let x = [gx, gy];
      let fx = F(x);
      if (!fx.every(isFinite)) continue;
      for (let it = 0; it < 60 && norm(fx) > 1e-14; it++) {
        const h = 1e-6;
        const fpx = F([x[0] + h, x[1]]);
        const fmx = F([x[0] - h, x[1]]);
        const fpy = F([x[0], x[1] + h]);
        const fmy = F([x[0], x[1] - h]);
        const J = [[(fpx[0] - fmx[0]) / (2 * h), (fpy[0] - fmy[0]) / (2 * h)], [(fpx[1] - fmx[1]) / (2 * h), (fpy[1] - fmy[1]) / (2 * h)]];
        if (!J.every((r) => r.every(isFinite))) break;
        const det = J[0][0] * J[1][1] - J[0][1] * J[1][0];
        let d;
        if (Math.abs(det) > 1e-12) d = [(-fx[0] * J[1][1] + fx[1] * J[0][1]) / det, (-fx[1] * J[0][0] + fx[0] * J[1][0]) / det];
        else d = [-fx[0] * 0.5, -fx[1] * 0.5];
        let t = 1;
        let moved = false;
        for (let ls = 0; ls < 30; ls++) {
          const xn = [x[0] + t * d[0], x[1] + t * d[1]];
          const fn = F(xn);
          if (fn.every(isFinite) && norm(fn) < norm(fx)) { x = xn; fx = fn; moved = true; break; }
          t /= 2;
        }
        if (!moved) break;
      }
      if (norm(fx) < 1e-9 && Math.abs(x[0]) <= 10.0001 && Math.abs(x[1]) <= 10.0001 && !sols.some((q) => Math.abs(q[0] - x[0]) < 1e-5 * (1 + Math.abs(x[0])) && Math.abs(q[1] - x[1]) < 1e-5 * (1 + Math.abs(x[1])))) sols.push(x);
    }
  }
  sols.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  return sols;
}

// ---- x' = f(x, y), y' = g(x, y) -------------------------------------------------------------------------------------------------------------
defCmd('phaseplane linearize', (n) => {
  needArgs(n, 2, 4, 'x\' = f(x, y) and y\' = g(x, y): phaseplane(x*(1-y), y*(x-1), x, y)');
  const out = newOut();
  const f = fromAst(n.args[0]);
  const g = fromAst(n.args[1]);
  const names = n.args[2] && n.args[3] ? [varOfArg(n.args[2]), varOfArg(n.args[3])] : ['x', 'y'];
  const [vx, vy] = names;
  const extra = Array.from(new Set([...varsOfS(f), ...varsOfS(g)])).filter((u) => u !== vx && u !== vy);
  if (extra.length) throw new MathError('the right-hand sides may contain only ' + vx + ' and ' + vy + ' (an autonomous system); found ' + extra.join(', '));
  const fx = diffS(f, vx);
  const fy = diffS(f, vy);
  const gx = diffS(g, vx);
  const gy = diffS(g, vy);
  out.work.push(vx + '\' = ' + fmtS(f) + ',  ' + vy + '\' = ' + fmtS(g));
  out.work.push('Jacobian J = [[' + [fx, fy].map((e) => fmtS(e)).join(', ') + '], [' + [gx, gy].map((e) => fmtS(e)).join(', ') + ']]');
  const F = (p) => [numS(f, { [vx]: p[0], [vy]: p[1] }), numS(g, { [vx]: p[0], [vy]: p[1] })];
  let sols = phEquilibria(F);
  if (!sols.length) {
    out.answer.push('no equilibrium found (f = g = 0 has no real solution with |value| ≤ 10)');
    return out;
  }
  // Newton's method converges slowly at a singular Jacobian: snap to the nearest simple value (small fraction or multiple of π) if it is still an equilibrium
  const polishTo = (v) => {
    for (let q = 1; q <= 12; q++) {
      const p = Math.round(v * q);
      if (Math.abs(v - p / q) < 2e-6 * (1 + Math.abs(v))) return p / q;
    }
    for (let q = 1; q <= 6; q++) {
      const p = Math.round((v * q) / Math.PI);
      if (p !== 0 && Math.abs(v - (p * Math.PI) / q) < 2e-6 * (1 + Math.abs(v))) return (p * Math.PI) / q;
    }
    return v;
  };
  // a curve of equilibria (non-isolated): the dense search lands on many points of it, all with a singular Jacobian
  const detAt = (p) => {
    const env = { [vx]: p[0], [vy]: p[1] };
    return numS(fx, env) * numS(gy, env) - numS(fy, env) * numS(gx, env);
  };
  const singular = sols.filter((p) => Math.abs(detAt(p)) < 1e-6);
  let curve = null;
  if (singular.length >= 4) {
    const A = singular[0];
    const B = singular[singular.length - 1];
    const dx = B[0] - A[0];
    const dy = B[1] - A[1];
    const collinear = singular.every((p) => Math.abs((p[0] - A[0]) * dy - (p[1] - A[1]) * dx) < 1e-5 * (1 + Math.hypot(dx, dy)));
    curve = collinear ? { line: [dy, -dx, dy * A[0] - dx * A[1]] } : {};
    const keep = sols.filter((p) => !singular.includes(p));
    sols.length = 0;
    keep.forEach((p) => sols.push(p));
    if (collinear) {
      const nrm = Math.hypot(dy, dx);
      const co = [dy / nrm, -dx / nrm, (dy * A[0] - dx * A[1]) / nrm];
      const sgn = Math.abs(co[0]) > 1e-9 ? Math.sign(co[0]) : Math.sign(co[1]);
      const base = Math.min(...co.slice(0, 2).map(Math.abs).filter((v) => v > 1e-9));
      let tt = co.map((v) => (v * sgn) / base);
      for (let m = 1; m <= 12; m++) {
        if (tt.every((v) => Math.abs(v * m - Math.round(v * m)) < 1e-6 * (1 + Math.abs(v * m)))) { tt = tt.map((v) => Math.round(v * m)); break; }
      }
      if (tt.every((v) => Math.abs(v - Math.round(v)) > 1e-9)) tt = tt.map((v) => polishTo(v));
      const term = (c, nm) => (phZero(c) ? '' : (c < 0 ? ' - ' : ' + ') + (Math.abs(Math.abs(c) - 1) < 1e-12 ? '' : phText(Math.abs(c)).replace(/ \(.*$/, '')) + nm);
      let eq = (term(tt[0], vx) + term(tt[1], vy)).replace(/^ \+ /, '').replace(/^ - /, '-');
      eq += ' = ' + phText(tt[2]).replace(/ \(.*$/, '');
      out.answer.push('a whole line of equilibria (non-isolated): ' + eq + ' — every point of it is an equilibrium; the Jacobian is singular along it, so linearization does not classify them');
    } else out.answer.push('a curve of equilibria (non-isolated): the Jacobian is singular along it, so linearization does not classify them');
  }
  if (sols.length > 30) sols = sols.slice(0, 30);
  sols.forEach((s0) => {
    let s = s0.map(polishTo);
    const fv = F(s);
    if (!(Math.abs(fv[0]) < 1e-9 && Math.abs(fv[1]) < 1e-9)) s = s0; // the rounded point is not an equilibrium after all
    const env = { [vx]: s[0], [vy]: s[1] };
    const J = [fx, fy, gx, gy].map((e) => numS(e, env));
    const r = phClassify(...J.map((x) => (phZero(x) ? 0 : x)));
    const where = '(' + vx + ', ' + vy + ') = (' + phText(s[0]) + ', ' + phText(s[1]) + ')';
    let tag = r.label;
    if (r.sDet > 0 && r.sTr === 0 && r.sDisc < 0) tag = 'linearization is a centre: the nonlinear system may have a centre or a (weak) spiral — not decided by the Jacobian';
    else if (r.sDet === 0 || (r.sDisc === 0 && r.sDet > 0)) tag += ' (borderline case: the linearization may not decide the nonlinear behaviour)';
    out.answer.push(where + ': ' + tag);
    out.work.push(where + ':  J = [[' + J.slice(0, 2).map(fmtNum).join(', ') + '], [' + J.slice(2).map(fmtNum).join(', ') + ']],  ' + phTrDet(r) + ',  eigenvalues ' + r.eig.join(', '));
  });
  out.notes.push('Only real equilibria with |value| ≤ 10 near the search grid are found; the type comes from the eigenvalues of the Jacobian (linearization).');
  return out;
});

// ---- the "phase portrait" line of a solved linear system -----------------------------------------------------------------------------------------
function phPortraitNote(M) {
  if (M.length !== 2) return null;
  const r = phClassify(M[0][0], M[0][1], M[1][0], M[1][1]);
  return 'Phase portrait: the origin is a ' + r.label;
}
