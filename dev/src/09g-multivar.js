// ======================================================================
// 9g. Several variables: gradient, Hessian, Jacobian, divergence, curl, Laplacian,
//     directional derivatives, tangent planes, critical points of f(x, y), Lagrange multipliers.
//     Double and triple integrals are nested integrate(...) calls.
// ======================================================================
function varNames(args) {
  const names = [];
  args.forEach((a) => {
    if (a.t === 'var') names.push(a.name);
    else if (a.t === 'list') a.items.forEach((it) => {
      if (it.t !== 'var') throw new MathError('variables such as [x, y] are needed here');
      names.push(it.name);
    });
  });
  return names;
}
function mvSetup(n, usage) {
  if (n.args.length < 2) throw new MathError(n.fn + ' needs ' + usage);
  const f = fromAst(n.args[0]);
  const names = varNames(n.args.slice(1).filter((a) => a.t === 'var' || (a.t === 'list' && a.items.every((i) => i.t === 'var'))));
  if (!names.length) throw new MathError(n.fn + ' needs the variables, e.g. ' + n.fn + '(f, x, y)');
  return { f, names };
}
const fmtVec = (S) => '[' + S.map((e) => fmtS(simp(e))).join(', ') + ']';
function pointArg(node, dim) {
  if (node.t !== 'list' || node.items.length !== dim) throw new MathError('a point with ' + dim + ' coordinates such as [1, 2] is needed here');
  return node.items.map(geoVal);
}
function atPoint(S, names, pt) {
  const map = new Map(names.map((nm, i) => [nm, pt[i]]));
  return simp(expandS(subsMany(S, map)));
}
defCmd('grad gradient nabla', (n) => {
  const { f, names } = mvSetup(n, 'a function and its variables');
  const out = newOut();
  const g = names.map((v) => simp(diffS(f, v)));
  const ptNode = n.args.find((a) => a.t === 'list' && a.items.some((i) => i.t !== 'var'));
  out.answer.push('∇f = ' + fmtVec(g));
  if (ptNode) {
    const pt = pointArg(ptNode, names.length);
    const gv = g.map((e) => atPoint(e, names, pt));
    out.answer.push('∇f at ' + ptText(pt) + ' = ' + fmtVec(gv) + ',   |∇f| = ' + symText(simp(sSqrt(sAdd(gv.map((e) => sq(e)))))));
  }
  out.work.push('Partial derivatives ' + names.map((v) => '∂f/∂' + v).join(', ') + ' (the other letters are held constant)');
  return out;
});
defCmd('hessian', (n) => {
  const { f, names } = mvSetup(n, 'a function and its variables');
  const H = names.map((a) => names.map((b) => simp(diffS(diffS(f, a), b))));
  const out = newOut();
  const cells = H.map((r) => r.map((e) => fmtS(e)));
  const w = cells[0].map((_, j) => Math.max(...cells.map((r) => r[j].length)));
  cells.forEach((r) => out.answer.push('[ ' + r.map((c, j) => c.padStart(w[j])).join('  ') + ' ]'));
  if (names.length === 2) out.work.push('det H = ' + fmtS(simp(expandS(sSub(sMul([H[0][0], H[1][1]]), sMul([H[0][1], H[1][0]]))))));
  out.work.push('Second partial derivatives ∂²f/∂' + names[0] + '∂' + names[names.length > 1 ? 1 : 0] + ' and so on');
  return out;
});
defCmd('laplacian', (n) => {
  const { f, names } = mvSetup(n, 'a function and its variables');
  const out = newOut();
  out.answer.push('∇²f = ' + fmtS(simp(expandS(sAdd(names.map((v) => diffS(diffS(f, v), v)))))));
  return out;
});
defCmd('jacobian', (n) => {
  if (n.args.length !== 2 || n.args[0].t !== 'list' || n.args[1].t !== 'list') throw new MathError('jacobian([f, g], [x, y]) needs a list of functions and a list of variables');
  const fs = n.args[0].items.map(fromAst);
  const names = varNames([n.args[1]]);
  const J = fs.map((f) => names.map((v) => simp(diffS(f, v))));
  const out = newOut();
  const cells = J.map((r) => r.map((e) => fmtS(e)));
  const w = cells[0].map((_, j) => Math.max(...cells.map((r) => r[j].length)));
  cells.forEach((r) => out.answer.push('[ ' + r.map((c, j) => c.padStart(w[j])).join('  ') + ' ]'));
  if (fs.length === names.length) out.work.push('det J = ' + fmtS(simp(expandS(detS(J)))));
  return out;
});
function detS(M) {
  if (M.length === 1) return M[0][0];
  if (M.length === 2) return sSub(sMul([M[0][0], M[1][1]]), sMul([M[0][1], M[1][0]]));
  return sAdd(M[0].map((e, j) => sMul([sI(j % 2 ? -1 : 1), e, detS(M.slice(1).map((r) => r.filter((_, k) => k !== j)))])));
}
defCmd('divergence div', (n) => {
  if (n.args.length !== 2 || n.args[0].t !== 'list' || n.args[1].t !== 'list') throw new MathError('divergence([P, Q, R], [x, y, z]) needs the field and the variables');
  const F = n.args[0].items.map(fromAst);
  const names = varNames([n.args[1]]);
  if (F.length !== names.length) throw new MathError('the field and the variable list must have the same length');
  const out = newOut();
  out.answer.push('div F = ' + fmtS(simp(expandS(sAdd(F.map((c, i) => diffS(c, names[i])))))));
  return out;
});
defCmd('curl', (n) => {
  if (n.args.length !== 2 || n.args[0].t !== 'list' || n.args[1].t !== 'list') throw new MathError('curl([P, Q, R], [x, y, z]) needs the field and the variables');
  const F = n.args[0].items.map(fromAst);
  const [x, y, z] = varNames([n.args[1]]);
  const d = (e, v) => diffS(e, v);
  const out = newOut();
  if (F.length === 2) {
    out.answer.push('curl F (scalar) = ' + fmtS(simp(expandS(sSub(d(F[1], x), d(F[0], y))))));
    return out;
  }
  if (F.length !== 3 || z === undefined) throw new MathError('curl needs a field with 2 or 3 components');
  out.answer.push('curl F = ' + fmtVec([sSub(d(F[2], y), d(F[1], z)), sSub(d(F[0], z), d(F[2], x)), sSub(d(F[1], x), d(F[0], y))].map((e) => simp(expandS(e)))));
  return out;
});
defCmd('directional directionalderivative', (n) => {
  needArgs(n, 4, 4, 'f, the variables [x, y], the point [a, b] and the direction [u, v]');
  const f = fromAst(n.args[0]);
  const names = varNames([n.args[1]]);
  const pt = pointArg(n.args[2], names.length);
  const dir = pointArg(n.args[3], names.length);
  const len = simp(sSqrt(sAdd(dir.map((c) => sq(c)))));
  if (zeroS(len)) throw new MathError('the direction cannot be the zero vector');
  const g = names.map((v) => atPoint(simp(diffS(f, v)), names, pt));
  const dd = simp(expandS(sDiv(sAdd(g.map((e, i) => sMul([e, dir[i]]))), len)));
  const out = newOut();
  out.answer.push('D_u f = ' + symText(dd));
  out.work.push('∇f at the point = ' + fmtVec(g) + ';  unit direction u = v/|v| with |v| = ' + symText(len) + ';  D_u f = ∇f · u');
  out.value = { S: dd };
  return out;
});
defCmd('tangentplane', (n) => {
  needArgs(n, 5, 5, 'f, x, y, a, b');
  const f = fromAst(n.args[0]);
  const [xn, yn] = [varOfArg(n.args[1]), varOfArg(n.args[2])];
  const a = geoVal(n.args[3]);
  const b = geoVal(n.args[4]);
  const at = (e) => simp(expandS(subsMany(e, new Map([[xn, a], [yn, b]]))));
  const z0 = at(f);
  const fx = at(diffS(f, xn));
  const fy = at(diffS(f, yn));
  const plane = simp(expandS(sAdd([z0, sMul([fx, sSub(sV(xn), a)]), sMul([fy, sSub(sV(yn), b)])])));
  const out = newOut();
  out.answer.push('z = ' + fmtS(plane));
  out.work.push('f = ' + symText(z0) + ',  f_' + xn + ' = ' + symText(fx) + ',  f_' + yn + ' = ' + symText(fy) + ' at (' + fmtS(a) + ', ' + fmtS(b) + ');  z = f + f_' + xn + '(' + xn + ' − a) + f_' + yn + '(' + yn + ' − b)');
  return out;
});

// ---- critical points of f(x, y) and Lagrange multipliers -----------------------------------------------------
function definiteness(Hn) {
  // leading principal minors of a symmetric matrix (numbers)
  const minors = [];
  for (let k = 1; k <= Hn.length; k++) minors.push(detNum(Hn.slice(0, k).map((r) => r.slice(0, k))));
  if (minors.every((m) => m > 1e-9)) return 'local minimum';
  if (minors.every((m, i) => (i % 2 === 0 ? m < -1e-9 : m > 1e-9))) return 'local maximum';
  if (minors.some((m) => Math.abs(m) <= 1e-9)) return 'inconclusive (the second-derivative test fails: determinant 0)';
  return 'saddle point';
}
function detNum(M) {
  if (M.length === 1) return M[0][0];
  if (M.length === 2) return M[0][0] * M[1][1] - M[0][1] * M[1][0];
  return M[0].reduce((s, e, j) => s + (j % 2 ? -1 : 1) * e * detNum(M.slice(1).map((r) => r.filter((_, k) => k !== j))), 0);
}
function multiCritical(n) {
  const f = fromAst(n.args[0]);
  const names = varNames(n.args.slice(1).filter((a) => a.t === 'var'));
  if (names.length < 2 || names.length > 3) throw new MathError('critical points of functions of 2 or 3 variables are supported');
  const g = names.map((v) => simp(diffS(f, v)));
  const H = names.map((a, i) => names.map((b) => diffS(g[i], b)));
  const F = (x) => {
    const env = {};
    names.forEach((nm, i) => { env[nm] = x[i]; });
    return g.map((e) => {
      try {
        return numS(e, env);
      } catch (e2) {
        return NaN;
      }
    });
  };
  const sols = newtonSolutions(F, names.length);
  const out = newOut();
  out.work.push('∇f = ' + fmtVec(g) + ' = 0 solved numerically (Newton from many starting points); then the second-derivative test with the Hessian');
  if (!sols.length) {
    out.answer.push('no critical points found');
    return out;
  }
  sols.forEach((s) => {
    const env = {};
    names.forEach((nm, i) => { env[nm] = s[i]; });
    const fv = numS(f, env);
    const Hn = H.map((r) => r.map((e) => numS(e, env)));
    let kind = definiteness(Hn);
    if (names.length === 2) {
      const D = Hn[0][0] * Hn[1][1] - Hn[0][1] * Hn[1][0];
      kind = D > 1e-9 ? (Hn[0][0] > 0 ? 'local minimum' : 'local maximum') : D < -1e-9 ? 'saddle point' : 'inconclusive (D = 0)';
    }
    out.answer.push('(' + names.map((nm, i) => nm + ' ' + describeEq(s[i])).join(', ') + '):  f ' + describeEq(fv) + ',  ' + kind);
  });
  out.notes.push('Critical points are found numerically near the origin (|coordinate| ≤ 10); there could be others far away.');
  return out;
}
defCmd('lagrange lagrangemultipliers', (n) => {
  needArgs(n, 4, 6, 'f, the constraint g (and its value c), and the variables: lagrange(f, g, c, x, y)');
  const f = fromAst(n.args[0]);
  const gS = fromAst(n.args[1]);
  let c = S0;
  let rest = n.args.slice(2);
  if (rest[0].t !== 'var') {
    c = geoVal(rest[0]);
    rest = rest.slice(1);
  }
  const names = varNames(rest);
  if (names.length < 2 || names.length > 3) throw new MathError('give two or three variables');
  const gc = simp(sSub(gS, c));
  const lam = '$lam';
  const fg = names.map((v) => simp(diffS(f, v)));
  const gg = names.map((v) => simp(diffS(gc, v)));
  const eqs = fg.map((e, i) => sSub(e, sMul([sV(lam), gg[i]]))).concat([gc]);
  const F = (x) => {
    const env = {};
    names.forEach((nm, i) => { env[nm] = x[i]; });
    env[lam] = x[names.length];
    return eqs.map((e) => {
      try {
        return numS(e, env);
      } catch (e2) {
        return NaN;
      }
    });
  };
  const sols = newtonSolutions(F, names.length + 1);
  const out = newOut();
  out.work.push('Solve ∇f = λ∇g together with g = ' + symText(c) + ':  ' + names.map((v, i) => '∂f/∂' + v + ' = λ·∂g/∂' + v).join(', '));
  if (!sols.length) {
    out.answer.push('no solution of the Lagrange conditions found');
    return out;
  }
  const rows = sols.map((s) => {
    const env = {};
    names.forEach((nm, i) => { env[nm] = s[i]; });
    return { s, fv: numS(f, env) };
  }).sort((a, b) => a.fv - b.fv);
  rows.forEach((r) => out.answer.push('(' + names.map((nm, i) => nm + ' ' + describeEq(r.s[i])).join(', ') + '):  f ' + describeEq(r.fv) + ',  λ = ' + fmtNum(r.s[names.length])));
  if (rows.length > 1) {
    out.answer.push('largest value of f on the constraint: ' + describeNumber(rows[rows.length - 1].fv) + ';  smallest: ' + describeNumber(rows[0].fv));
    out.notes.push('These are the candidates found; if the constraint curve is not closed and bounded, the largest/smallest of them need not be a true maximum/minimum.');
  } else out.notes.push('Only one candidate was found; check whether it is a maximum or a minimum (e.g. compare with a nearby point of the constraint).');
  return out;
});
