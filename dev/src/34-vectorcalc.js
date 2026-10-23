// ======================================================================
// 34. Applications of multiple integrals and vector calculus:  mass / centre of mass / moments of inertia of a lamina or a solid,
//     integrals in polar, cylindrical and spherical coordinates, surface area, flux, Green's, the divergence theorem and Stokes' theorem.
//     Bounds are listed from the OUTER integral to the INNER one; letters are single letters (θ is t, φ is f, ρ is r when typed as Greek).
//     Exact values come from the symbolic integrator; when it cannot find an antiderivative a Gauss-Legendre rule gives a decimal.
// ======================================================================
const vcNodes = {};
function vcGL(n) {
  if (vcNodes[n]) return vcNodes[n];
  const x = [];
  const w = [];
  for (let i = 0; i < n; i++) {
    let z = Math.cos((Math.PI * (i + 0.75)) / (n + 0.5));
    let pp = 0;
    for (let it = 0; it < 100; it++) {
      let p1 = 1;
      let p2 = 0;
      for (let j = 0; j < n; j++) {
        const p3 = p2;
        p2 = p1;
        p1 = ((2 * j + 1) * z * p2 - j * p3) / (j + 1);
      }
      pp = (n * (z * p1 - p2)) / (z * z - 1);
      const z1 = z;
      z = z1 - p1 / pp;
      if (Math.abs(z - z1) < 1e-15) break;
    }
    x.push(z);
    w.push(2 / ((1 - z * z) * pp * pp));
  }
  vcNodes[n] = { x, w };
  return vcNodes[n];
}
/** numerical iterated integral; dims are listed from the outermost integral to the innermost */
function vcNumeric(f, dims) {
  const { x, w } = vcGL(dims.length >= 3 ? 24 : 48);
  const env = {};
  const rec = (k) => {
    if (k === dims.length) return numS(f, env);
    const d = dims[k];
    const a = numS(d.lo, env);
    const b = numS(d.hi, env);
    const half = (b - a) / 2;
    const mid = (a + b) / 2;
    let s = 0;
    for (let i = 0; i < x.length; i++) {
      env[d.v] = mid + half * x[i];
      s += w[i] * rec(k + 1);
    }
    delete env[d.v];
    return s * half;
  };
  return rec(0);
}
/** the iterated integral of f over dims (outermost first): { S, num } when exact, { num } otherwise */
function vcIterated(f, dims) {
  let text = fmtS(f, true);
  for (let i = dims.length - 1; i >= 0; i--) text = 'integrate(' + text + ', ' + dims[i].v + ', ' + fmtS(dims[i].lo, true) + ', ' + fmtS(dims[i].hi, true) + ')';
  try {
    const o = runCommandCall(parseExpression(text));
    if (o.value && o.value.S) return { S: o.value.S, num: numS(o.value.S, {}) };
  } catch (e) {
    if (!(e instanceof MathError) && !(e instanceof NotAlgebraic)) throw e;
  }
  const num = vcNumeric(f, dims);
  if (!isFinite(num)) throw new MathError('the integral could not be evaluated (a singularity inside the region?)');
  return { num };
}
const vcLine = (label, r) => integralLine(label, r).replace(/ = ≈/, ' ≈');
const vcDivide = (a, b) => {
  if (a.S && b.S) {
    const q = simp(sDiv(a.S, b.S));
    return { S: q, num: numS(q, {}) };
  }
  return { num: (a.S ? a.num : a.num) / (b.S ? b.num : b.num) };
};
/** triples (variable, lower, upper) from the arguments, outermost first */
function vcDims(args, start, count, what) {
  const dims = [];
  for (let i = 0; i < count; i++) {
    const a = args.slice(start + 3 * i, start + 3 * i + 3);
    if (a.length < 3) throw new MathError(what + ' needs bounds for ' + count + ' variables: a variable and its two limits each');
    dims.push({ v: varOfArg(a[0]), lo: fromAst(a[1]), hi: fromAst(a[2]) });
  }
  if (new Set(dims.map((d) => d.v)).size !== dims.length) throw new MathError('the variables of the integration must be different letters');
  return dims;
}
const vcRegionText = (dims) => dims.map((d) => fmtS(d.lo) + ' ≤ ' + d.v + ' ≤ ' + fmtS(d.hi)).join(',  ');

// ---- lamina and solid -------------------------------------------------------------------------------------------------------------------------------------
defCmd('lamina', (n) => {
  needArgs(n, 7, 7, 'the density, then x with its limits and y with its limits (outer first): lamina(1, x, 0, 2, y, 0, x^2)');
  const rho = fromAst(n.args[0]);
  const dims = vcDims(n.args, 1, 2, 'lamina');
  const [X, Y] = [sV(dims[0].v), sV(dims[1].v)];
  const out = newOut();
  const M = vcIterated(rho, dims);
  const Mx = vcIterated(simp(sMul([Y, rho])), dims);
  const My = vcIterated(simp(sMul([X, rho])), dims);
  const Ix = vcIterated(simp(sMul([Y, Y, rho])), dims);
  const Iy = vcIterated(simp(sMul([X, X, rho])), dims);
  out.answer.push(vcLine('mass M = ∬ ρ dA', M));
  const cx = vcDivide(My, M);
  const cy = vcDivide(Mx, M);
  const t = (r) => (r.S ? symText(r.S) : (recognizeLoose(r.num) ? recognizeLoose(r.num).text + ' (≈ ' + fmtNum(r.num) + ')' : '≈ ' + fmtNum(r.num)));
  out.answer.push('centre of mass (x̄, ȳ) = (' + t(cx) + ', ' + t(cy) + ')');
  out.answer.push(vcLine('moment about the x-axis Mₓ = ∬ y ρ dA', Mx));
  out.answer.push(vcLine('moment about the y-axis M_y = ∬ x ρ dA', My));
  const I0 = Ix.S && Iy.S ? { S: simp(sAdd([Ix.S, Iy.S])), num: Ix.num + Iy.num } : { num: Ix.num + Iy.num };
  out.answer.push(vcLine('moments of inertia  Iₓ = ∬ y² ρ dA', Ix));
  out.answer.push(vcLine('                    I_y = ∬ x² ρ dA', Iy));
  out.answer.push(vcLine('                    I₀ = Iₓ + I_y', I0));
  out.work.push('region: ' + vcRegionText(dims) + ';  density ρ = ' + fmtS(rho) + ';  x̄ = M_y/M,  ȳ = Mₓ/M');
  if (!M.S) out.notes.push('No closed form was found, so the values are numerical (Gauss-Legendre).');
  out.value = M.S ? { S: M.S } : { num: M.num };
  return out;
});
defCmd('solid', (n) => {
  needArgs(n, 10, 10, 'the density, then x, y, z with their limits (outer first): solid(1, x, 0, 1, y, 0, 1, z, 0, x + y)');
  const rho = fromAst(n.args[0]);
  const dims = vcDims(n.args, 1, 3, 'solid');
  const [X, Y, Z] = dims.map((d) => sV(d.v));
  const out = newOut();
  const I = (g) => vcIterated(simp(sMul([g, rho])), dims);
  const M = I(S1);
  const Mx = I(X);
  const My = I(Y);
  const Mz = I(Z);
  out.answer.push(vcLine('mass M = ∭ ρ dV', M));
  const t = (r) => (r.S ? symText(r.S) : (recognizeLoose(r.num) ? recognizeLoose(r.num).text + ' (≈ ' + fmtNum(r.num) + ')' : '≈ ' + fmtNum(r.num)));
  out.answer.push('centre of mass (x̄, ȳ, z̄) = (' + t(vcDivide(Mx, M)) + ', ' + t(vcDivide(My, M)) + ', ' + t(vcDivide(Mz, M)) + ')');
  const Ixx = I(simp(sAdd([sMul([Y, Y]), sMul([Z, Z])])));
  const Iyy = I(simp(sAdd([sMul([X, X]), sMul([Z, Z])])));
  const Izz = I(simp(sAdd([sMul([X, X]), sMul([Y, Y])])));
  out.answer.push(vcLine('moments of inertia  Iₓ = ∭ (y² + z²) ρ dV', Ixx));
  out.answer.push(vcLine('                    I_y = ∭ (x² + z²) ρ dV', Iyy));
  out.answer.push(vcLine('                    I_z = ∭ (x² + y²) ρ dV', Izz));
  out.work.push('region: ' + vcRegionText(dims) + ';  density ρ = ' + fmtS(rho));
  if (!M.S) out.notes.push('No closed form was found, so the values are numerical (Gauss-Legendre).');
  out.value = M.S ? { S: M.S } : { num: M.num };
  return out;
});

// ---- polar, cylindrical, spherical coordinates -------------------------------------------------------------------------------------------------------
function vcCoord(kind, dims) {
  const [a, b, c] = dims.map((d) => sV(d.v));
  if (kind === 'polar') return { map: new Map([['x', sMul([b, sFn('cos', [a])])], ['y', sMul([b, sFn('sin', [a])])]]), jac: b, label: 'x = r cos θ, y = r sin θ, dA = r dr dθ' };
  if (kind === 'cyl') return { map: new Map([['x', sMul([b, sFn('cos', [a])])], ['y', sMul([b, sFn('sin', [a])])]]), jac: b, label: 'x = r cos θ, y = r sin θ, dV = r dz dr dθ' };
  // spherical: a = θ, b = φ, c = ρ
  return {
    map: new Map([['x', sMul([c, sFn('sin', [b]), sFn('cos', [a])])], ['y', sMul([c, sFn('sin', [b]), sFn('sin', [a])])], ['z', sMul([c, sFn('cos', [b])])]]),
    jac: sMul([c, c, sFn('sin', [b])]),
    label: 'x = ρ sin φ cos θ, y = ρ sin φ sin θ, z = ρ cos φ, dV = ρ² sin φ dρ dφ dθ',
  };
}
function vcCoordCmd(kind, count, usage, order) {
  return (n) => {
    needArgs(n, 1 + 3 * count, 1 + 3 * count, usage);
    const f = fromAst(n.args[0]);
    const dims = vcDims(n.args, 1, count, kind);
    const co = vcCoord(kind, dims);
    const names = dims.map((d) => d.v);
    const inner = simp(subsMany(f, new Map(Array.from(co.map).filter(([k]) => !names.includes(k)))));
    const integrand = simp(expandS(sMul([inner, co.jac])));
    const out = newOut();
    out.work.push('order of the variables: ' + order + ';  ' + co.label);
    out.work.push('region: ' + vcRegionText(dims) + ';  integrand f·Jacobian = ' + fmtS(integrand));
    const r = vcIterated(integrand, dims);
    out.answer.push(vcLine(kind === 'polar' ? '∬ f dA' : '∭ f dV', r));
    if (!r.S) out.notes.push('No closed form was found, so the value is numerical (Gauss-Legendre).');
    out.value = r.S ? { S: r.S } : { num: r.num };
    return out;
  };
}
defCmd('polarint polardouble', vcCoordCmd('polar', 2, 'f, then θ with its limits and r with its limits (outer first): polarint(r^2, t, 0, 2*pi, r, 0, 1)   (x and y in f are replaced by r cos θ and r sin θ)', 'θ (outer), r (inner)'));
defCmd('cylint cylindricalint', vcCoordCmd('cyl', 3, 'f, then θ, r and z with their limits (outer first): cylint(z, t, 0, 2*pi, r, 0, 1, z, 0, 2)', 'θ, r, z (z innermost)'));
defCmd('sphint sphericalint', vcCoordCmd('sph', 3, 'f, then θ, φ and ρ with their limits (outer first): sphint(1, t, 0, 2*pi, f, 0, pi, r, 0, 1)', 'θ (azimuth), φ (from the z-axis), ρ (radius)'));

// ---- surfaces: area, flux, Stokes -----------------------------------------------------------------------------------------------------------------------
const vcCross = (a, b) => [simp(expandS(sSub(sMul([a[1], b[2]]), sMul([a[2], b[1]])))), simp(expandS(sSub(sMul([a[2], b[0]]), sMul([a[0], b[2]])))), simp(expandS(sSub(sMul([a[0], b[1]]), sMul([a[1], b[0]]))))];
/** the surface of a command: a graph z = f(x, y) (the variables x, y) or a parametrisation [X(u,v), Y(u,v), Z(u,v)] */
function vcSurface(node, dims) {
  if (node.t === 'list') {
    if (node.items.length !== 3) throw new MathError('a parametrised surface is written [x(u,v), y(u,v), z(u,v)]');
    return node.items.map((it) => fromAst(it));
  }
  const f = fromAst(node);
  return [sV(dims[0].v), sV(dims[1].v), f];
}
function vcNormal(r, dims) {
  const ru = vDiffS(r, dims[0].v);
  const rv = vDiffS(r, dims[1].v);
  return vcCross(ru, rv);
}
defCmd('surfacearea surfarea', (n) => {
  needArgs(n, 7, 7, 'z = f(x, y): surfacearea(x^2 + y^2, x, 0, 1, y, 0, 1);   parametric: surfacearea([cos(u), sin(u), v], u, 0, 2*pi, v, 0, 1)   (limits outer first)');
  const dims = vcDims(n.args, 1, 2, 'surfacearea');
  const r = vcSurface(n.args[0], dims);
  const N = vcNormal(r, dims);
  const mag2 = simp(expandS(sAdd(N.map((c) => sMul([c, c])))));
  const mag = simp(sSqrt(mag2));
  const out = newOut();
  out.work.push('surface ' + (n.args[0].t === 'list' ? 'r(' + dims[0].v + ', ' + dims[1].v + ') = ' + vecText(r) : 'z = ' + fmtS(r[2])) + ';  normal r_' + dims[0].v + ' × r_' + dims[1].v + ' = ' + vecText(N) + ';  dS = |r_' + dims[0].v + ' × r_' + dims[1].v + '| d' + dims[0].v + ' d' + dims[1].v + ' with |…| = ' + fmtS(mag));
  const res = vcIterated(mag, dims);
  out.answer.push(vcLine('surface area', res));
  if (!res.S) out.notes.push('No closed form was found, so the value is numerical (Gauss-Legendre).');
  out.value = res.S ? { S: res.S } : { num: res.num };
  return out;
});
defCmd('flux surfaceintegral', (n) => {
  needArgs(n, 8, 9, 'the field [P, Q, R], the surface, then the limits (outer first): flux([x, y, z], [sin(f)*cos(t), sin(f)*sin(t), cos(f)], f, 0, pi, t, 0, 2*pi);  the normal is r_u × r_v for the parameters in the order listed (a graph z = f(x, y) with x first points up); a last argument -1 reverses it');
  if (n.args[0].t !== 'list' || n.args[0].items.length !== 3) throw new MathError('the field must be written [P, Q, R]');
  const dims = vcDims(n.args, 2, 2, 'flux');
  const F = n.args[0].items.map(fromAst);
  const r = vcSurface(n.args[1], dims);
  let N = vcNormal(r, dims);
  if (n.args[8] && constQ(n.args[8]).sign() < 0) N = N.map((c) => simp(sNeg(c)));
  const sub = new Map([['x', r[0]], ['y', r[1]], ['z', r[2]]]);
  const Fr = F.map((c) => simp(subsMany(c, sub)));
  const integrand = simp(expandS(sAdd(Fr.map((c, i) => sMul([c, N[i]])))));
  const out = newOut();
  out.work.push('flux = ∬ F·(r_' + dims[0].v + ' × r_' + dims[1].v + ') d' + dims[0].v + ' d' + dims[1].v + ';  F(r) = ' + vecText(Fr) + ',  r_' + dims[0].v + ' × r_' + dims[1].v + ' = ' + vecText(N) + ';  integrand ' + fmtS(integrand));
  const res = vcIterated(integrand, dims);
  out.answer.push(vcLine('flux ∬ F·dS', res));
  out.notes.push('The orientation is the one of r_' + dims[0].v + ' × r_' + dims[1].v + ' (outward for the usual sphere parametrisation, upward for a graph); reverse the sign for the other side.');
  out.value = res.S ? { S: res.S } : { num: res.num };
  return out;
});
defCmd('green greenstheorem', (n) => {
  needArgs(n, 8, 8, 'P, Q, then x with its limits and y with its limits (outer first): green(-y, x, x, -1, 1, y, -sqrt(1 - x^2), sqrt(1 - x^2))');
  const P = fromAst(n.args[0]);
  const Q = fromAst(n.args[1]);
  const dims = vcDims(n.args, 2, 2, 'green');
  const integrand = simp(expandS(sSub(diffS(Q, dims[0].v), diffS(P, dims[1].v))));
  const out = newOut();
  out.work.push('Green\'s theorem (counter-clockwise boundary): ∮ P dx + Q dy = ∬ (∂Q/∂x − ∂P/∂y) dA;  ∂Q/∂x − ∂P/∂y = ' + fmtS(integrand) + ';  region ' + vcRegionText(dims));
  const res = vcIterated(integrand, dims);
  out.answer.push(vcLine('∮ P dx + Q dy', res));
  out.value = res.S ? { S: res.S } : { num: res.num };
  return out;
});
defCmd('divtheorem divergencetheorem gauss', (n) => {
  needArgs(n, 10, 10, 'the field [P, Q, R], then x, y, z with their limits (outer first): divtheorem([x, y, z], x, 0, 1, y, 0, 1, z, 0, 1)');
  if (n.args[0].t !== 'list' || n.args[0].items.length !== 3) throw new MathError('the field must be written [P, Q, R]');
  const F = n.args[0].items.map(fromAst);
  const dims = vcDims(n.args, 1, 3, 'divtheorem');
  const div = simp(expandS(sAdd(F.map((c, i) => diffS(c, dims[i].v)))));
  const out = newOut();
  out.work.push('divergence theorem: the outward flux through the closed surface = ∭ div F dV;  div F = ' + fmtS(div) + ';  region ' + vcRegionText(dims) + '  (the letters of F are matched with the variables in the order x, y, z as listed)');
  const res = vcIterated(div, dims);
  out.answer.push(vcLine('outward flux ∯ F·dS', res));
  out.value = res.S ? { S: res.S } : { num: res.num };
  return out;
});
defCmd('stokes stokestheorem', (n) => {
  needArgs(n, 8, 9, 'the field [P, Q, R], the surface [x(u,v), y(u,v), z(u,v)] or a graph z = f(x, y), then the limits (outer first): stokes([-y, x, 0], [r*cos(t), r*sin(t), 1 - r^2], r, 0, 1, t, 0, 2*pi);  the normal is r_u × r_v for the parameters in the order listed; a last argument -1 reverses it');
  if (n.args[0].t !== 'list' || n.args[0].items.length !== 3) throw new MathError('the field must be written [P, Q, R]');
  const F = n.args[0].items.map(fromAst);
  const dims = vcDims(n.args, 2, 2, 'stokes');
  const r = vcSurface(n.args[1], dims);
  const d = (e, v) => diffS(e, v);
  const curl = [sSub(d(F[2], 'y'), d(F[1], 'z')), sSub(d(F[0], 'z'), d(F[2], 'x')), sSub(d(F[1], 'x'), d(F[0], 'y'))].map((e) => simp(expandS(e)));
  let N = vcNormal(r, dims);
  if (n.args[8] && constQ(n.args[8]).sign() < 0) N = N.map((c) => simp(sNeg(c)));
  const sub = new Map([['x', r[0]], ['y', r[1]], ['z', r[2]]]);
  const cs = curl.map((c) => simp(subsMany(c, sub)));
  const integrand = simp(expandS(sAdd(cs.map((c, i) => sMul([c, N[i]])))));
  const out = newOut();
  out.work.push('Stokes\' theorem: ∮ F·dr = ∬ curl F · (r_' + dims[0].v + ' × r_' + dims[1].v + ') d' + dims[0].v + ' d' + dims[1].v + ';  curl F = ' + vecText(curl) + ',  r_' + dims[0].v + ' × r_' + dims[1].v + ' = ' + vecText(N));
  const res = vcIterated(integrand, dims);
  out.answer.push(vcLine('circulation ∮ F·dr = ∬ curl F·dS', res));
  out.notes.push('The boundary is traversed counter-clockwise when seen from the side the normal r_' + dims[0].v + ' × r_' + dims[1].v + ' points to.');
  out.value = res.S ? { S: res.S } : { num: res.num };
  return out;
});
