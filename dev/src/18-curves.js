// ======================================================================
// 18. Curves and vector calculus: parametric and polar curves (slope, arc length, area), coordinate systems, velocity,
//     acceleration, curvature, the TNB frame, torsion, line integrals and potential functions.
// ======================================================================
const trigTidy = (e) => {
  const x = simp(expandS(e));
  try {
    return simp(simplifyTrigS(x));
  } catch (err) {
    return x;
  }
};
const vecText = (u) => '[' + u.map((c) => fmtS(simp(c))).join(', ') + ']';
const vDotS = (u, v) => simp(sAdd(u.map((a, i) => sMul([a, v[i]]))));
const vCrossS = (u, v) => [
  simp(sSub(sMul([u[1], v[2]]), sMul([u[2], v[1]]))),
  simp(sSub(sMul([u[2], v[0]]), sMul([u[0], v[2]]))),
  simp(sSub(sMul([u[0], v[1]]), sMul([u[1], v[0]]))),
];
const vDiffS = (u, t) => u.map((a) => simp(diffS(a, t)));
const pad3 = (u) => (u.length === 2 ? u.concat([S0]) : u);
function curveOf(node, what) {
  if (node.t !== 'list' || node.items.length < 2 || node.items.length > 3) throw new MathError(what + ' needs a curve written as [x(t), y(t)] or [x(t), y(t), z(t)]');
  return node.items.map((it) => fromAst(it));
}
function paramVar(comps, hintNode) {
  if (hintNode && hintNode.t === 'var') return hintNode.name;
  const vs = new Set();
  comps.forEach((c) => varsOfS(c).forEach((x) => vs.add(x)));
  if (vs.size === 1) return Array.from(vs)[0];
  if (!vs.size) return 't';
  throw new MathError('say which letter is the parameter (found ' + Array.from(vs).sort().join(', ') + ')');
}
/** sqrt of a sum of squares, with perfect-square factors taken out:  sqrt(4t² + 9t⁴) = |t|·sqrt(4 + 9t²),  sqrt(2 + 2cos t) = 2|cos(t/2)|. */
function sqrtParts(R, v) {
  let e = simp(expandS(R));
  try {
    e = simplifyTrigS(e);
  } catch (err) {
    // keep the expanded form
  }
  e = simp(e);
  const c = v ? polyCoeffsS(e, v) : null;
  if (c && c.length > 1 && c.every((k) => k.k === 'n')) {
    const fp = factorPolyQ(c.map((k) => k.q));
    let outside = [];
    let inside = [];
    fp.factors.forEach(({ ints, mult }) => {
      const P = polyToS(intsToPoly(ints), v);
      if (mult >= 2) outside.push(sPow(P, sI(Math.floor(mult / 2))));
      if (mult % 2) inside.push(P);
    });
    if (outside.length) return { outside: simp(sMul(outside)), inside: simp(sMul([sN(fp.content)].concat(inside))) };
  }
  // half-angle:  A + A cos u = 2A cos²(u/2),  A − A cos u = 2A sin²(u/2)
  const terms = termsOf(e);
  if (terms.length === 2) {
    const [c0, c1] = terms.map((tm) => splitCoef(tm));
    const cosT = [c0, c1].find(([, rest]) => rest && rest.k === 'f' && rest.fn === 'cos');
    const cnst = [c0, c1].find(([, rest]) => rest && rest.k === 'n' && rest.q.eq(Q1));
    const constPart = terms.find((tm) => tm.k === 'n');
    const cosTerm = terms.find((tm) => tm !== constPart);
    if (constPart && cosTerm) {
      const [cc, rest] = splitCoef(cosTerm);
      if (rest && rest.k === 'f' && rest.fn === 'cos' && constPart.q.abs().eq(cc.abs())) {
        const half = sMul([sN(new Q(1n, 2n)), rest.a[0]]);
        const A = constPart.q;
        const same = A.sign() === cc.sign();
        void cosT;
        void cnst;
        return { outside: simp(sFn(same ? 'cos' : 'sin', [half])), inside: simp(sN(A.mul(new Q(2n)).abs())) };
      }
    }
  }
  return { outside: null, inside: e };
}
/** Numeric sign changes of f on [a, b] (zeros of the factor taken out of a square root). */
function signChangePoints(f, a, b) {
  const N = 800;
  const pts = [];
  let xp = a;
  let fp = f(a);
  for (let i = 1; i <= N; i++) {
    const x = a + ((b - a) * i) / N;
    const fx = f(x);
    if (isFinite(fp) && isFinite(fx) && fp * fx < 0) {
      let lo = xp;
      let hi = x;
      const sl = Math.sign(fp);
      for (let it = 0; it < 100; it++) {
        const m = (lo + hi) / 2;
        if (Math.sign(f(m)) === sl) lo = m;
        else hi = m;
      }
      pts.push((lo + hi) / 2);
    }
    xp = x;
    fp = fx;
  }
  return pts;
}
const cutS = (x) => {
  const fr = toFraction(x / Math.PI, 720);
  if (fr && Math.abs(fr.p / fr.q - x / Math.PI) < 1e-12) return simp(sMul([sN(new Q(BigInt(fr.p), BigInt(fr.q))), S_PI]));
  return decimalOrExact(x);
};
/** The definite integral of sqrt(R) over [lo, hi], splitting where the factor taken out of the root changes sign. */
function sqrtIntegral(R, v, lo, hi) {
  const { outside, inside } = sqrtParts(R, v);
  if (lo.inf || hi.inf) return integralValue(sSqrt(outside ? simp(sMul([sq(outside), inside])) : inside), v, lo, hi);
  const a = numS(lo.S, {});
  const b = numS(hi.S, {});
  if (!outside) {
    // no closed form for the root: cut at the zeros of the radicand (kinks of the root) so that the numerical method converges
    const quick = integralValue(sSqrt(inside), v, lo, hi);
    if (!quick.failed) return quick;
    const g = (x) => evalAt(inside, v, x);
    const N = 1000;
    const kinks = [];
    for (let i = 1; i < N; i++) {
      const x = a + ((b - a) * i) / N;
      if (g(x) < 1e-3 * Math.max(...[0, 0.25, 0.5, 0.75, 1].map((q) => Math.abs(g(a + (b - a) * q)))) && g(x) <= g(x - (b - a) / N) && g(x) <= g(x + (b - a) / N)) {
        let l = x - (b - a) / N;
        let h = x + (b - a) / N;
        for (let it = 0; it < 80; it++) {
          const m1 = l + (h - l) / 3;
          const m2 = h - (h - l) / 3;
          if (g(m1) < g(m2)) h = m2;
          else l = m1;
        }
        kinks.push((l + h) / 2);
      }
    }
    const pts = [a].concat(kinks, [b]);
    let total = 0;
    for (let i = 0; i + 1 < pts.length; i++) {
      const piece = integralValue(sSqrt(inside), v, { S: cutS(pts[i]) }, { S: cutS(pts[i + 1]) });
      if (piece.diverges || piece.failed) return piece;
      total += piece.num;
    }
    return { num: total };
  }
  let cuts = [];
  const oc = polyCoeffsS(outside, v);
  if (oc && oc.every((k) => k.k === 'n')) cuts = polyRoots(oc.map((k) => k.q)).real.map((r) => r.val).filter((r) => r > a + 1e-9 && r < b - 1e-9).sort((p, q) => p - q);
  else cuts = signChangePoints((x) => evalAt(outside, v, x), a, b);
  const points = [{ S: lo.S, val: a }].concat(cuts.map((r) => ({ S: cutS(r), val: r })), [{ S: hi.S, val: b }]);
  let total = S0;
  let numTotal = 0;
  let exact = true;
  for (let i = 0; i + 1 < points.length; i++) {
    const mid = (points[i].val + points[i + 1].val) / 2;
    const sign = evalAt(outside, v, mid) < 0 ? -1 : 1;
    const piece = integralValue(simp(sMul([sN(qInt(sign)), outside, sSqrt(inside)])), v, { S: points[i].S }, { S: points[i + 1].S });
    if (piece.diverges || piece.failed) return piece;
    if (piece.S) total = sAdd([total, piece.S]);
    else exact = false;
    numTotal += piece.num;
  }
  return exact ? { S: simp(total), num: numTotal } : { num: numTotal };
}
function outLineFor(label, r, out) {
  out.answer.push(integralLine(label, r));
  if (r.S) out.value = { S: r.S };
  else if (r.num !== undefined) out.value = { num: r.num };
}

// ---- parametric curves ---------------------------------------------------------------------------------------------------------------------------------------
defCmd('paramdiff parametricdiff dydxparam', (n) => {
  needArgs(n, 3, 4, 'x(t), y(t), the parameter and optionally a value t0: paramdiff(t^2, t^3, t, 2)');
  const xs = fromAst(n.args[0]);
  const ys = fromAst(n.args[1]);
  const t = paramVar([xs, ys], n.args[2]);
  const dx = simp(diffS(xs, t));
  const dy = simp(diffS(ys, t));
  if (isNumVal(dx, 0)) throw new MathError('dx/d' + t + ' is 0, so the curve is a vertical line');
  const slope = simp(sDiv(dy, dx));
  const second = simp(sDiv(simp(diffS(slope, t)), dx));
  const out = newOut();
  out.answer.push('dy/dx = (dy/d' + t + ')/(dx/d' + t + ') = ' + fmtS(slope));
  out.answer.push('d²y/dx² = (d/d' + t + ' (dy/dx))/(dx/d' + t + ') = ' + fmtS(second));
  out.work.push('dx/d' + t + ' = ' + fmtS(dx) + ',  dy/d' + t + ' = ' + fmtS(dy));
  if (n.args[3]) {
    const t0 = geoVal(n.args[3]);
    const at = (e) => simp(subsS(e, t, t0));
    const px = at(xs);
    const py = at(ys);
    const dxv = at(dx);
    if (isNumVal(dxv, 0)) {
      out.answer.push('at ' + t + ' = ' + fmtS(t0) + ': the point is (' + fmtS(px) + ', ' + fmtS(py) + ') and the tangent is vertical (dx/d' + t + ' = 0)');
    } else {
      const m = at(slope);
      out.answer.push('at ' + t + ' = ' + fmtS(t0) + ': the point is (' + fmtS(px) + ', ' + fmtS(py) + '), slope = ' + symText(m) + ', d²y/dx² = ' + symText(at(second)));
      if (m.k === 'n') out.answer.push('tangent line: y = ' + fmtS(simp(expandS(sAdd([sMul([m, sV('x')]), sSub(py, sMul([m, px]))])))));
    }
  }
  // horizontal and vertical tangents
  const zero = (e) => {
    const c = polyCoeffsS(e, t);
    if (!c || !c.every((k) => k.k === 'n') || c.length < 2) return null;
    return polyRoots(c.map((k) => k.q)).real.map((r) => r.text || fmtNum(r.val));
  };
  const hz = zero(dy);
  const vt = zero(dx);
  if (hz && hz.length) out.work.push('horizontal tangents where d' + 'y/d' + t + ' = 0:  ' + t + ' = ' + hz.join(', '));
  if (vt && vt.length) out.work.push('vertical tangents where dx/d' + t + ' = 0:  ' + t + ' = ' + vt.join(', '));
  out.value = { S: slope };
  return out;
});
COMMANDS.paramdiff.show = (n) => 'parametric curve x = ' + showRaw(n.args[0]) + ', y = ' + showRaw(n.args[1]) + (n.args[3] ? ', at ' + showRaw(n.args[2]) + ' = ' + showRaw(n.args[3]) : '');

function curveArgs(n, what, usage) {
  // (x, y, t, a, b) or ([x, y(, z)], t, a, b)
  needArgs(n, 4, 5, usage);
  if (n.args[0].t === 'list') {
    needArgs(n, 4, 4, usage);
    return { comps: curveOf(n.args[0], what), t: paramVar(curveOf(n.args[0], what), n.args[1]), a: bnd(n.args[2]), b: bnd(n.args[3]) };
  }
  needArgs(n, 5, 5, usage);
  const comps = [fromAst(n.args[0]), fromAst(n.args[1])];
  return { comps, t: paramVar(comps, n.args[2]), a: bnd(n.args[3]), b: bnd(n.args[4]) };
}
defCmd('paramlength curvelength parametriclength', (n) => {
  const { comps, t, a, b } = curveArgs(n, 'the curve length', 'x(t), y(t), t, a, b  (or [x(t), y(t), z(t)], t, a, b): paramlength(cos(t), sin(t), t, 0, 2*pi)');
  const d = vDiffS(comps, t);
  const R = simp(sAdd(d.map(sq)));
  const out = newOut();
  out.work.push('L = ∫ √((dx/d' + t + ')² + (dy/d' + t + ')²' + (comps.length === 3 ? ' + (dz/d' + t + ')²' : '') + ') d' + t + ' from ' + intLimitsText(a, b) + ',  velocity = ' + vecText(d));
  outLineFor('arc length', sqrtIntegral(R, t, a, b), out);
  return out;
});
defCmd('paramarea areaunderparam', (n) => {
  needArgs(n, 5, 5, 'x(t), y(t), t, a, b: paramarea(t - sin(t), 1 - cos(t), t, 0, 2*pi)');
  const xs = fromAst(n.args[0]);
  const ys = fromAst(n.args[1]);
  const t = paramVar([xs, ys], n.args[2]);
  const out = newOut();
  out.work.push('A = ∫ y·(dx/d' + t + ') d' + t + ' from ' + intLimitsText(bnd(n.args[3]), bnd(n.args[4])) + ',  dx/d' + t + ' = ' + fmtS(simp(diffS(xs, t))));
  outLineFor('area under the curve', integralValue(simp(sMul([ys, diffS(xs, t)])), t, bnd(n.args[3]), bnd(n.args[4])), out);
  out.notes.push('This is the signed area between the curve and the x-axis (negative where the curve runs right-to-left or below the axis).');
  return out;
});

// ---- polar curves --------------------------------------------------------------------------------------------------------------------------------------------
function polarArgs(n, usage, lo, hi) {
  needArgs(n, lo, hi, usage);
  const r = fromAst(n.args[0]);
  const t = paramVar([r], n.args[1]);
  return { r, t };
}
defCmd('polararea areapolar', (n) => {
  const { r, t } = polarArgs(n, 'r(θ), the angle variable and the limits a, b: polararea(1 + cos(t), t, 0, 2*pi)', 4, 4);
  const a = bnd(n.args[2]);
  const b = bnd(n.args[3]);
  const out = newOut();
  out.work.push('A = ½ ∫ r² d' + t + ' from ' + intLimitsText(a, b) + ',  r = ' + fmtS(simp(r)));
  outLineFor('area', integralValue(simp(sMul([sN(new Q(1n, 2n)), sq(r)])), t, a, b), out);
  return out;
});
defCmd('polarlength polararclength', (n) => {
  const { r, t } = polarArgs(n, 'r(θ), the angle variable and the limits a, b: polarlength(1 + cos(t), t, 0, 2*pi)', 4, 4);
  const a = bnd(n.args[2]);
  const b = bnd(n.args[3]);
  const R = simp(sAdd([sq(r), sq(diffS(r, t))]));
  const out = newOut();
  out.work.push('L = ∫ √(r² + (dr/d' + t + ')²) d' + t + ' from ' + intLimitsText(a, b) + ',  r² + r\'² = ' + fmtS(R));
  outLineFor('arc length', sqrtIntegral(R, t, a, b), out);
  return out;
});
defCmd('polarslope polardiff', (n) => {
  const { r, t } = polarArgs(n, 'r(θ), the angle variable and optionally θ₀: polarslope(1 + cos(t), t, pi/2)', 2, 3);
  const dr = simp(diffS(r, t));
  const st = sFn('sin', [sV(t)]);
  const ct = sFn('cos', [sV(t)]);
  const num = simp(sAdd([sMul([dr, st]), sMul([r, ct])]));
  const den = simp(sSub(sMul([dr, ct]), sMul([r, st])));
  const out = newOut();
  const tidy = (e) => {
    const x = simp(expandS(e));
    try {
      return simp(simplifyTrigS(x));
    } catch (err) {
      return x;
    }
  };
  out.answer.push('dy/dx = (r\' sin ' + t + ' + r cos ' + t + ')/(r\' cos ' + t + ' − r sin ' + t + ') = ' + fmtS(simp(sDiv(tidy(num), tidy(den)))));
  out.work.push('x = r cos ' + t + ', y = r sin ' + t + ';  r = ' + fmtS(simp(r)) + ',  r\' = ' + fmtS(dr));
  if (n.args[2]) {
    const t0 = geoVal(n.args[2]);
    const at = (e) => simp(subsS(e, t, t0));
    const dv = at(den);
    const px = at(sMul([r, ct]));
    const py = at(sMul([r, st]));
    out.answer.push('at ' + t + ' = ' + fmtS(t0) + ': the point is (' + fmtS(px) + ', ' + fmtS(py) + ')' + (isNumVal(dv, 0) ? (isNumVal(at(num), 0) ? ' (0/0: the slope needs a limit)' : ' and the tangent is vertical') : ', slope = ' + symText(simp(sDiv(at(num), dv)))));
  }
  return out;
});

// ---- coordinate systems -------------------------------------------------------------------------------------------------------------------------------------------
function angleText(theta) {
  // radians as a rational multiple of π when it is one
  const fr = toFraction(theta / Math.PI, 360);
  if (fr && Math.abs(fr.p / fr.q - theta / Math.PI) < 1e-12) {
    const q = new Q(BigInt(fr.p), BigInt(fr.q));
    return fmtS(simp(sMul([sN(q), S_PI]))) + ' (' + fmtNum((theta * 180) / Math.PI) + '°)';
  }
  return fmtNum(theta) + ' rad (' + fmtNum((theta * 180) / Math.PI) + '°)';
}
function angleS(theta) {
  const fr = toFraction(theta / Math.PI, 360);
  if (fr && Math.abs(fr.p / fr.q - theta / Math.PI) < 1e-12) return simp(sMul([sN(new Q(BigInt(fr.p), BigInt(fr.q))), S_PI]));
  return decimalS(theta);
}
defCmd('topolar rect2polar cartesiantopolar', (n) => {
  needArgs(n, 2, 2, 'x and y: topolar(1, sqrt(3))');
  const x = geoVal(n.args[0]);
  const y = geoVal(n.args[1]);
  const r = simp(sSqrt(simp(expandS(sAdd([sq(x), sq(y)])))));
  const th = Math.atan2(numS(y, {}), numS(x, {}));
  const out = newOut();
  out.answer.push('r = ' + fmtS(r) + ',  θ = ' + angleText(th));
  if (th < 0) out.work.push('The same point has θ = ' + angleText(th + 2 * Math.PI) + ' (angle measured from 0 to 2π).');
  out.work.push('r = √(x² + y²),  θ = atan2(y, x)');
  out.value = { S: r };
  return out;
});
defCmd('torect polar2rect polartocartesian', (n) => {
  needArgs(n, 2, 2, 'r and θ: torect(2, pi/3)');
  const r = geoVal(n.args[0]);
  const th = geoVal(n.args[1]);
  const out = newOut();
  out.answer.push('(x, y) = (' + fmtS(simp(sMul([r, sFn('cos', [th])]))) + ', ' + fmtS(simp(sMul([r, sFn('sin', [th])]))) + ')');
  out.work.push('x = r cos θ,  y = r sin θ');
  return out;
});
defCmd('tocylindrical cartesiantocylindrical', (n) => {
  needArgs(n, 3, 3, 'x, y, z: tocylindrical(1, 1, 2)');
  const [x, y, z] = n.args.map(geoVal);
  const r = simp(sSqrt(simp(expandS(sAdd([sq(x), sq(y)])))));
  const th = Math.atan2(numS(y, {}), numS(x, {}));
  const out = newOut();
  out.answer.push('(r, θ, z) = (' + fmtS(r) + ', ' + angleText(th) + ', ' + fmtS(z) + ')');
  out.work.push('r = √(x² + y²),  θ = atan2(y, x),  z = z');
  return out;
});
defCmd('fromcylindrical cylindricaltocartesian', (n) => {
  needArgs(n, 3, 3, 'r, θ, z: fromcylindrical(2, pi/6, 1)');
  const [r, th, z] = n.args.map(geoVal);
  const out = newOut();
  out.answer.push('(x, y, z) = (' + fmtS(simp(sMul([r, sFn('cos', [th])]))) + ', ' + fmtS(simp(sMul([r, sFn('sin', [th])]))) + ', ' + fmtS(z) + ')');
  out.work.push('x = r cos θ,  y = r sin θ');
  return out;
});
defCmd('tospherical cartesiantospherical', (n) => {
  needArgs(n, 3, 3, 'x, y, z: tospherical(1, 1, sqrt(2))');
  const [x, y, z] = n.args.map(geoVal);
  const rho = simp(sSqrt(simp(expandS(sAdd([sq(x), sq(y), sq(z)])))));
  const rv = numS(rho, {});
  if (rv === 0) throw new MathError('the origin has no spherical angles');
  const phi = Math.acos(numS(z, {}) / rv);
  const th = Math.atan2(numS(y, {}), numS(x, {}));
  const out = newOut();
  out.answer.push('(ρ, φ, θ) = (' + fmtS(rho) + ', ' + angleText(phi) + ', ' + angleText(th) + ')');
  out.work.push('ρ = √(x² + y² + z²),  φ = arccos(z/ρ) is the angle from the positive z-axis,  θ = atan2(y, x)');
  return out;
});
defCmd('fromspherical sphericaltocartesian', (n) => {
  needArgs(n, 3, 3, 'ρ, φ, θ: fromspherical(2, pi/3, pi/4)');
  const [rho, phi, th] = n.args.map(geoVal);
  const out = newOut();
  const sp = sFn('sin', [phi]);
  out.answer.push('(x, y, z) = (' + fmtS(simp(sMul([rho, sp, sFn('cos', [th])]))) + ', ' + fmtS(simp(sMul([rho, sp, sFn('sin', [th])]))) + ', ' + fmtS(simp(sMul([rho, sFn('cos', [phi])]))) + ')');
  out.work.push('x = ρ sin φ cos θ,  y = ρ sin φ sin θ,  z = ρ cos φ');
  return out;
});

// ---- motion along a curve: velocity, acceleration, curvature, TNB frame ---------------------------------------------------------------------------------------------
function speedS(d, t) {
  const { outside, inside } = sqrtParts(simp(sAdd(d.map(sq))), t);
  return outside ? simp(sMul([sFn('abs', [outside]), sSqrt(inside)])) : simp(sSqrt(inside));
}
const atT = (e, t, t0) => simp(subsS(e, t, t0));
defCmd('velocity acceleration speed motion', (n) => {
  needArgs(n, 2, 3, 'the position [x(t), y(t), z(t)], the time variable and optionally t0: velocity([t, t^2, t^3], t, 1)');
  const r = curveOf(n.args[0], 'velocity');
  const t = paramVar(r, n.args[1]);
  const v = vDiffS(r, t);
  const a = vDiffS(v, t);
  const sp = speedS(v, t);
  const out = newOut();
  out.answer.push('velocity v = r\' = ' + vecText(v));
  out.answer.push('acceleration a = r\'\' = ' + vecText(a));
  out.answer.push('speed |v| = ' + fmtS(sp));
  if (n.args[2]) {
    const t0 = geoVal(n.args[2]);
    const vv = v.map((c) => atT(c, t, t0));
    const aa = a.map((c) => atT(c, t, t0));
    out.work.push('at ' + t + ' = ' + fmtS(t0) + ':  position ' + vecText(r.map((c) => atT(c, t, t0))) + ',  v = ' + vecText(vv) + ',  a = ' + vecText(aa) + ',  speed = ' + symText(atT(sp, t, t0)));
    const s0 = atT(sp, t, t0);
    if (!isNumVal(s0, 0)) out.work.push('unit tangent T = ' + vecText(vv.map((c) => simp(sDiv(c, s0)))));
    const at = simp(sDiv(vDotS(vv, aa), s0));
    if (!isNumVal(s0, 0)) out.work.push('tangential acceleration a_T = (v·a)/|v| = ' + symText(at));
  }
  out.value = { S: sp };
  return out;
});
function curvatureFor(r, t) {
  const r3 = pad3(r);
  const v = vDiffS(r3, t);
  const a = vDiffS(v, t);
  const cr = vCrossS(v, a);
  const num = speedS(cr, t);
  const sv = speedS(v, t);
  return { kappa: simp(sDiv(num, sPow(sv, sI(3)))), v, a, cr, sv };
}
defCmd('curvature', (n) => {
  needArgs(n, 2, 3, 'a curve [x(t), y(t)] or [x(t), y(t), z(t)], or a function f, the variable and optionally a value: curvature(x^2, x, 1)');
  const out = newOut();
  if (n.args[0].t === 'list') {
    const r = curveOf(n.args[0], 'curvature');
    const t = paramVar(r, n.args[1]);
    const { kappa } = curvatureFor(r, t);
    out.answer.push('κ = |r\' × r\'\'|/|r\'|³ = ' + fmtS(kappa));
    if (n.args[2]) {
      const t0 = geoVal(n.args[2]);
      const k0 = atT(kappa, t, t0);
      out.answer.push('at ' + t + ' = ' + fmtS(t0) + ': κ = ' + symText(k0) + (isNumVal(k0, 0) ? '' : ',  radius of curvature R = 1/κ = ' + symText(simp(sPow(k0, SM1)))));
    }
    out.value = { S: kappa };
    return out;
  }
  const f = fromAst(n.args[0]);
  const x = n.args[1].t === 'var' ? varOfArg(n.args[1]) : singleVarOf(f);
  const d1 = simp(diffS(f, x));
  const d2 = simp(diffS(d1, x));
  const kappa = simp(sDiv(sFn('abs', [d2]), sPow(simp(sAdd([S1, sq(d1)])), new Q(3n, 2n) && sN(new Q(3n, 2n)))));
  out.answer.push('κ = |f″|/(1 + f′²)^(3/2) = ' + fmtS(kappa));
  out.work.push('f′ = ' + fmtS(d1) + ',  f″ = ' + fmtS(d2));
  const at = n.args[2] ? geoVal(n.args[2]) : null;
  if (at) {
    const k0 = simp(subsS(kappa, x, at));
    out.answer.push('at ' + x + ' = ' + fmtS(at) + ': κ = ' + symText(k0) + (isNumVal(k0, 0) ? '' : ',  radius of curvature R = 1/κ = ' + symText(simp(sPow(k0, SM1)))));
  }
  out.value = { S: kappa };
  return out;
});
defCmd('tnb frenet frenetframe', (n) => {
  needArgs(n, 2, 3, 'the curve [x(t), y(t), z(t)], the parameter and optionally t0: tnb([cos(t), sin(t), t], t, 0)');
  const r = pad3(curveOf(n.args[0], 'tnb'));
  const t = paramVar(r, n.args[1]);
  const { kappa, v, a, cr, sv } = curvatureFor(r, t);
  const jerk = vDiffS(a, t);
  const crn = speedS(cr, t);
  const tau = trigTidy(simp(sDiv(vDotS(cr, jerk), simp(sMul([crn, crn])))));
  const out = newOut();
  const unit = (u, len) => u.map((c) => simp(sDiv(c, len)));
  const T = unit(v, sv).map(trigTidy);
  const B = unit(cr, crn).map(trigTidy);
  const N = vCrossS(B, T).map(trigTidy);
  const symbolic = () => {
    out.work.push('formulas: T = ' + vecText(T) + ';  N = ' + vecText(N) + ';  B = ' + vecText(B) + ';  κ = ' + fmtS(kappa) + ';  τ = ' + fmtS(tau));
  };
  if (n.args[2]) {
    const t0 = geoVal(n.args[2]);
    const g = (u) => u.map((c) => atT(c, t, t0));
    out.answer.push('at ' + t + ' = ' + fmtS(t0) + ':');
    out.answer.push('T = ' + vecText(g(T)));
    out.answer.push('N = ' + vecText(g(N)));
    out.answer.push('B = ' + vecText(g(B)));
    out.answer.push('curvature κ = ' + symText(atT(kappa, t, t0)) + ',  torsion τ = ' + symText(atT(tau, t, t0)));
    if ((vecText(T) + vecText(N) + vecText(B)).length < 400) symbolic();
  } else {
    out.answer.push('T = ' + vecText(T));
    out.answer.push('N = ' + vecText(N));
    out.answer.push('B = ' + vecText(B));
    out.answer.push('curvature κ = ' + fmtS(kappa) + ',  torsion τ = ' + fmtS(tau));
  }
  out.work.push('T = r\'/|r\'|,  B = (r\' × r\'\')/|r\' × r\'\'|,  N = B × T,  κ = |r\' × r\'\'|/|r\'|³,  τ = (r\' × r\'\')·r\'\'\'/|r\' × r\'\'|²');
  return out;
});

// ---- line integrals, potential functions ----------------------------------------------------------------------------------------------------------------------------
function fieldVars(dim) {
  return ['x', 'y', 'z'].slice(0, dim);
}
defCmd('lineintegral lineint pathintegral', (n) => {
  needArgs(n, 5, 5, 'the field [P, Q] or [P, Q, R] (or a scalar function), the curve [x(t), y(t)], the parameter and the limits: lineintegral([y, x], [cos(t), sin(t)], t, 0, pi)');
  const r = curveOf(n.args[1], 'lineintegral');
  const t = paramVar(r, n.args[2]);
  const names = fieldVars(r.length);
  const sub = new Map(names.map((nm, i) => [nm, r[i]]));
  const v = vDiffS(r, t);
  const a = bnd(n.args[3]);
  const b = bnd(n.args[4]);
  const out = newOut();
  let integrand;
  if (n.args[0].t === 'list') {
    const F = n.args[0].items.map((it) => fromAst(it));
    if (F.length !== r.length) throw new MathError('the field and the curve must have the same number of components');
    const Fr = F.map((c) => simp(subsMany(c, sub)));
    integrand = vDotS(Fr, v);
    out.work.push('∫ F·dr = ∫ F(r(' + t + '))·r\'(' + t + ') d' + t + ' from ' + intLimitsText(a, b) + ';  r\' = ' + vecText(v) + ',  F(r(' + t + ')) = ' + vecText(Fr));
    outLineFor('∫ F·dr', integralValue(simp(expandS(integrand)), t, a, b), out);
  } else {
    const f = simp(subsMany(fromAst(n.args[0]), sub));
    const sp = speedS(v, t);
    out.work.push('∫ f ds = ∫ f(r(' + t + '))·|r\'(' + t + ')| d' + t + ' from ' + intLimitsText(a, b) + ';  |r\'| = ' + fmtS(sp));
    const R = simp(sMul([sq(f), simp(sAdd(v.map(sq)))]));
    // sqrt(f² · |r'|²) would lose the sign of f, so integrate f·|r'| directly
    outLineFor('∫ f ds', integralValue(simp(sMul([f, sp])), t, a, b), out);
    void R;
  }
  return out;
});
defCmd('potential potentialfunction conservative', (n) => {
  needArgs(n, 1, 1, 'a vector field [P, Q] or [P, Q, R]: potential([2*x*y, x^2 + 3])');
  if (n.args[0].t !== 'list' || n.args[0].items.length < 2 || n.args[0].items.length > 3) throw new MathError('give the field as [P, Q] or [P, Q, R]');
  const F = n.args[0].items.map((it) => fromAst(it));
  const names = fieldVars(F.length);
  const out = newOut();
  // curl-free test
  for (let i = 0; i < F.length; i++) {
    for (let j = i + 1; j < F.length; j++) {
      const d1 = simp(expandS(diffS(F[i], names[j])));
      const d2 = simp(expandS(diffS(F[j], names[i])));
      if (!sameFunction(d1, d2)) {
        out.answer.push('not conservative: ∂' + 'PQR'[i] + '/∂' + names[j] + ' = ' + fmtS(d1) + ' but ∂' + 'PQR'[j] + '/∂' + names[i] + ' = ' + fmtS(d2));
        out.work.push('A conservative field must satisfy ∂P/∂y = ∂Q/∂x (and the same for the other pairs).');
        return out;
      }
    }
  }
  // integrate component by component
  let f = antiderivative(F[0], names[0]);
  if (!f) throw new MathError('I could not integrate P with respect to x');
  for (let i = 1; i < F.length; i++) {
    const rest = simp(sSub(F[i], diffS(f, names[i])));
    if (varsOfS(rest).has(names[0]) || (i === 2 && varsOfS(rest).has(names[1]))) throw new MathError('the field does not have a potential I can build');
    if (isNumVal(simp(expandS(rest)), 0)) continue;
    const g = antiderivative(rest, names[i]);
    if (!g) throw new MathError('I could not integrate component ' + (i + 1));
    f = sAdd([f, g]);
  }
  f = simp(expandS(f));
  out.answer.push('f = ' + fmtS(f) + ' + C   (∇f = F)');
  out.work.push('curl F = 0, so F is conservative: f_x = P gives f = ∫P dx + g(y, z), then g is found from the other components');
  const okAll = F.every((c, i) => sameFunction(simp(diffS(f, names[i])), c));
  out.check = okAll ? 'the gradient of f equals F' : null;
  out.notes.push('For a conservative field the line integral from A to B is f(B) − f(A), whatever the path.');
  out.value = { S: f };
  return out;
});
