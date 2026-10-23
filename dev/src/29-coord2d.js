// ======================================================================
// 29. Coordinate geometry in the plane: circles (centre and radius, through three points, from a diameter), lines and circles,
//     two circles, tangents from a point, perpendicular bisectors, parallel and perpendicular lines, intersections and angles,
//     triangle centres, rotations / reflections / translations / dilations, the section formula, collinearity, convex hulls.
//     A point is [x, y], a line is [a, b, c] for ax + by = c (or two points, or the equation itself), a circle is [h, k, r²]
//     (or the equation itself).  Everything is exact: rational coordinates, square roots where the answer needs them.
// ======================================================================
const c2Flat = (v, what) => {
  const a = needMat(v, what);
  return a.length === 1 ? a[0] : a[0].length === 1 ? a.map((r) => r[0]) : null;
};
const c2Pt = (v, what) => {
  const f = c2Flat(v, what);
  if (!f || f.length !== 2) throw new MathError(what + ' needs a point with two numbers, like [1, 2]');
  return f;
};
/** one point or a list of points (an n×2 matrix) */
function c2Pts(v, what) {
  const a = needMat(v, what);
  if (a.length === 1 && a[0].length === 2) return [a[0]];
  if (a[0].length === 1 && a.length === 2) return [[a[0][0], a[1][0]]];
  if (a[0].length === 2) return a;
  throw new MathError(what + ' needs a point [x, y] or a list of points [[x1, y1], [x2, y2], ...]');
}
const c2Eq = (P, Qp) => {
  const a = Qp[1].sub(P[1]);
  const b = P[0].sub(Qp[0]);
  return [a, b, a.mul(P[0]).add(b.mul(P[1]))];
};
function c2Line(v, what) {
  const a = needMat(v, what);
  if (a.length === 1 && a[0].length === 3) {
    if (a[0][0].isZero() && a[0][1].isZero()) throw new MathError('a line needs a or b to be non-zero in ax + by = c');
    return a[0];
  }
  if (a.length === 2 && a[0].length === 2) {
    if (a[0][0].eq(a[1][0]) && a[0][1].eq(a[1][1])) throw new MathError('the two points of a line must be different');
    return c2Eq(a[0], a[1]);
  }
  throw new MathError(what + ' needs a line: its equation (3x + 4y = 12, y = 2x + 1), [a, b, c] for ax + by = c, or two points [[x1, y1], [x2, y2]]');
}
function c2Circle(v, what) {
  const f = c2Flat(v, what);
  if (!f || f.length !== 3 || f[2].sign() <= 0) throw new MathError(what + ' needs a circle: its equation ((x-1)^2 + (y+2)^2 = 25, x^2 + y^2 - 4x = 0) or [h, k, r²]');
  return f;
}
/** integer coefficients with no common factor, first non-zero one positive */
function c2Norm(l) {
  let L = 1n;
  l.forEach((q) => { L = (L * q.d) / bgcd(L, q.d); });
  let ints = l.map((q) => q.n * (L / q.d));
  let g = 0n;
  ints.forEach((v) => { g = bgcd(g, babs(v)); });
  if (g > 1n) ints = ints.map((v) => v / g);
  const first = ints.find((v) => v !== 0n);
  if (first < 0n) ints = ints.map((v) => -v);
  return ints.map((v) => qInt(v));
}
function c2LineText(l) {
  const [a, b, c] = c2Norm(l);
  let s = '';
  [[a, 'x'], [b, 'y']].forEach(([co, nm]) => {
    if (co.isZero()) return;
    const mag = co.sign() < 0 ? co.neg() : co;
    const term = (mag.eq(Q1) ? '' : mag.toString()) + nm;
    s += s ? (co.sign() < 0 ? ' - ' : ' + ') + term : (co.sign() < 0 ? '-' : '') + term;
  });
  return s + ' = ' + c.toString();
}
/** y = m x + n when the line is not vertical */
function c2SlopeText(l) {
  const [a, b, c] = l;
  if (b.isZero()) return 'x = ' + c.div(a).toString();
  const m = a.neg().div(b);
  const n = c.div(b);
  let s = 'y = ';
  if (!m.isZero()) s += m.eq(Q1) ? 'x' : m.eq(qInt(-1)) ? '-x' : m.toString() + 'x';
  if (m.isZero()) s += n.toString();
  else if (!n.isZero()) s += (n.sign() < 0 ? ' - ' : ' + ') + n.abs().toString();
  return s;
}
const c2P = (p) => '(' + p.map((q) => q.toString()).join(', ') + ')';
const c2PS = (p) => ptText(p.map((x) => (x.k ? x : sN(x))));
const c2Sub = (u, v) => [u[0].sub(v[0]), u[1].sub(v[1])];
const c2Dist2 = (u, v) => {
  const d = c2Sub(u, v);
  return d[0].mul(d[0]).add(d[1].mul(d[1]));
};
const c2Sqrt = (q) => symText(simp(sSqrt(sN(q))));
const c2Eval = (l, p) => l[0].mul(p[0]).add(l[1].mul(p[1])).sub(l[2]); // a x + b y - c
const c2Deg = (rad) => fmtNum((rad * 180) / Math.PI) + '°';
const c2Sq = (v, c) => (c.isZero() ? v + '²' : '(' + v + (c.sign() > 0 ? ' - ' + c.toString() : ' + ' + c.neg().toString()) + ')²');
function c2CircleLines(out, h, k, r2) {
  const r = simp(sSqrt(sN(r2)));
  out.answer.push('centre ' + c2P([h, k]) + ',  radius ' + symText(r));
  out.answer.push('equation: ' + c2Sq('x', h) + ' + ' + c2Sq('y', k) + ' = ' + r2.toString());
  const D = h.mul(qInt(-2));
  const E = k.mul(qInt(-2));
  const F = h.mul(h).add(k.mul(k)).sub(r2);
  const term = (co, nm) => (co.isZero() ? '' : (co.sign() < 0 ? ' - ' : ' + ') + (co.abs().eq(Q1) ? '' : co.abs().toString()) + nm);
  const gen = 'x² + y²' + term(D, 'x') + term(E, 'y') + (F.isZero() ? '' : (F.sign() < 0 ? ' - ' : ' + ') + F.abs().toString()) + ' = 0';
  out.work.push('general form: ' + gen);
  out.work.push('area = ' + symText(simp(sMul([S_PI, sN(r2)]))) + ',  circumference = ' + symText(simp(sMul([sI(2), S_PI, r]))));
}

// ---- circle: centre and radius, through three points, from a diameter -------------------------------------------------------------
const C2_OLD_CIRCLE = COMMANDS.circle;
defCmd('circle', (n) => {
  if (!n.args.length || !n.args.some((a) => a.t === 'list')) return C2_OLD_CIRCLE(n);
  const out = newOut();
  const args = n.args.map((a, i) => (a.t === 'list' ? evalMat(a) : null));
  let h;
  let k;
  let r2;
  if (n.args.length === 3 && args.every(Boolean)) {
    const [A, B, C] = args.map((a) => c2Pt(a, 'circle'));
    const D = qInt(2).mul(A[0].mul(B[1].sub(C[1])).add(B[0].mul(C[1].sub(A[1]))).add(C[0].mul(A[1].sub(B[1]))));
    if (D.isZero()) throw new MathError('the three points lie on one line, so there is no circle through them');
    const sa = A[0].mul(A[0]).add(A[1].mul(A[1]));
    const sb = B[0].mul(B[0]).add(B[1].mul(B[1]));
    const sc = C[0].mul(C[0]).add(C[1].mul(C[1]));
    h = sa.mul(B[1].sub(C[1])).add(sb.mul(C[1].sub(A[1]))).add(sc.mul(A[1].sub(B[1]))).div(D);
    k = sa.mul(C[0].sub(B[0])).add(sb.mul(A[0].sub(C[0]))).add(sc.mul(B[0].sub(A[0]))).div(D);
    r2 = c2Dist2([h, k], A);
    out.work.push('the centre is on the perpendicular bisectors of the sides: it solves 2(x₂ − x₁)x + 2(y₂ − y₁)y = |P₂|² − |P₁|² for each pair');
    out.check = c2Dist2([h, k], B).eq(r2) && c2Dist2([h, k], C).eq(r2) ? 'all three points are at distance r from the centre' : null;
  } else if (n.args.length === 2 && args[0] && args[1]) {
    const A = c2Pt(args[0], 'circle');
    const B = c2Pt(args[1], 'circle');
    if (A[0].eq(B[0]) && A[1].eq(B[1])) throw new MathError('the two points of a diameter must be different');
    h = A[0].add(B[0]).div(qInt(2));
    k = A[1].add(B[1]).div(qInt(2));
    r2 = c2Dist2(A, B).div(qInt(4));
    out.work.push('the points are the ends of a diameter: centre = midpoint, r = half the distance');
  } else if (n.args.length === 2 && args[0] && !args[1]) {
    const C = c2Pt(args[0], 'circle');
    h = C[0];
    k = C[1];
    try {
      const r = entryQ(n.args[1]);
      r2 = r.mul(r);
    } catch (e) {
      r2 = entryQ(parseExpression('(' + showRaw(n.args[1]) + ')^2'));
    }
    if (r2.sign() <= 0) throw new MathError('the radius must be positive');
  } else throw new MathError('circle([h, k], r) is a circle from centre and radius, circle(P, Q) from a diameter, circle(P, Q, R) through three points; circle(r) is a circle of radius r');
  c2CircleLines(out, h, k, r2);
  out.value = { S: simp(sSqrt(sN(r2))) };
  return out;
}, true);

// ---- lines and circles -------------------------------------------------------------------------------------------------------------
/** intersection of the line ax + by = c with the circle (h, k, r²): { kind, pts (S pairs), d2 (squared distance centre-line) } */
function c2LineCircle(l, ci) {
  const [a, b, c] = l;
  const [h, k, r2] = ci;
  const n2 = a.mul(a).add(b.mul(b));
  const e = a.mul(h).add(b.mul(k)).sub(c); // signed numerator of the distance
  const d2 = e.mul(e).div(n2);
  const foot = [h.sub(e.div(n2).mul(a)), k.sub(e.div(n2).mul(b))];
  const t2 = r2.sub(d2).div(n2); // (half chord)² / (a² + b²)
  if (t2.sign() < 0) return { kind: 'none', d2, foot, t2 };
  if (t2.isZero()) return { kind: 'tangent', pts: [[sN(foot[0]), sN(foot[1])]], d2, foot, t2 };
  const s = simp(sSqrt(sN(t2)));
  const pm = (sign) => [simp(sAdd([sN(foot[0]), sign > 0 ? sMul([s, sN(b.neg())]) : sMul([s, sN(b)])])), simp(sAdd([sN(foot[1]), sign > 0 ? sMul([s, sN(a)]) : sMul([s, sN(a.neg())])]))];
  return { kind: 'secant', pts: [pm(1), pm(-1)], d2, foot, t2 };
}
defMat('linecircle', (args, n, out) => {
  const l = c2Line(args[0], 'linecircle');
  const ci = c2Circle(args[1], 'linecircle');
  const r = c2LineCircle(l, ci);
  const dist = c2Sqrt(r.d2);
  if (r.kind === 'none') {
    out.answer.push('the line does not meet the circle');
    out.work.push('distance from the centre to the line = ' + dist + ' > radius ' + c2Sqrt(ci[2]));
  } else if (r.kind === 'tangent') {
    out.answer.push('the line is tangent to the circle at ' + c2PS(r.pts[0]));
    out.work.push('distance from the centre to the line = radius = ' + dist);
  } else {
    out.answer.push('the line cuts the circle at ' + c2PS(r.pts[0]) + ' and ' + c2PS(r.pts[1]));
    const chord = simp(sMul([sI(2), sSqrt(sN(ci[2].sub(r.d2)))]));
    out.work.push('distance from the centre to the line = ' + dist + ' < radius ' + c2Sqrt(ci[2]));
    out.work.push('chord length = ' + symText(chord) + ',  midpoint of the chord ' + c2P(r.foot));
  }
  if (r.pts) {
    const ok = r.pts.every((p) => {
      const x = numS(p[0], {});
      const y = numS(p[1], {});
      return Math.abs(l[0].toNumber() * x + l[1].toNumber() * y - l[2].toNumber()) < 1e-9 * (1 + Math.abs(x) + Math.abs(y)) && Math.abs((x - ci[0].toNumber()) ** 2 + (y - ci[1].toNumber()) ** 2 - ci[2].toNumber()) < 1e-9 * (1 + ci[2].toNumber());
    });
    out.check = ok ? 'the intersection points satisfy both equations' : null;
  }
  return g3Out(out);
}, [2, 'a line and a circle: linecircle(y = x + 1, x^2 + y^2 = 25)']);

defMat('circlecircle', (args, n, out) => {
  const c1 = c2Circle(args[0], 'circlecircle');
  const c2 = c2Circle(args[1], 'circlecircle');
  const d2 = c2Dist2([c1[0], c1[1]], [c2[0], c2[1]]);
  const R1 = c1[2];
  const R2 = c2[2];
  const m = d2.sub(R1).sub(R2);
  const cmp = m.mul(m).sub(qInt(4).mul(R1).mul(R2)); // sign of m² − 4 R1 R2
  const dist = c2Sqrt(d2);
  let rel;
  let tangents;
  if (d2.isZero() && R1.eq(R2)) { rel = 'the circles coincide'; tangents = 'infinitely many common points'; } else if (d2.isZero()) { rel = 'concentric circles (the smaller one lies inside the larger one)'; tangents = 'no common tangent'; } else if (m.sign() > 0 && cmp.sign() > 0) { rel = 'the circles are apart (each outside the other)'; tangents = '4 common tangents'; } else if (m.sign() > 0 && cmp.isZero()) { rel = 'the circles touch externally'; tangents = '3 common tangents'; } else if (cmp.sign() < 0) { rel = 'the circles intersect in two points'; tangents = '2 common tangents'; } else if (cmp.isZero()) { rel = 'the circles touch internally'; tangents = '1 common tangent'; } else { rel = 'one circle lies inside the other without touching'; tangents = 'no common tangent'; }
  out.answer.push(rel);
  out.work.push('distance between the centres = ' + dist + ',  radii ' + c2Sqrt(R1) + ' and ' + c2Sqrt(R2) + ';  ' + tangents);
  if (!(d2.isZero())) {
    const rad = [qInt(2).mul(c2[0].sub(c1[0])), qInt(2).mul(c2[1].sub(c1[1])), c2[0].mul(c2[0]).add(c2[1].mul(c2[1])).sub(R2).sub(c1[0].mul(c1[0]).add(c1[1].mul(c1[1])).sub(R1))];
    out.work.push((cmp.sign() < 0 ? 'radical axis (the common chord): ' : 'radical axis: ') + c2LineText(rad));
    if (cmp.sign() < 0 || cmp.isZero()) {
      const r = c2LineCircle(rad, c1);
      if (r.pts && r.pts.length === 2) out.answer.push('common points ' + c2PS(r.pts[0]) + ' and ' + c2PS(r.pts[1]));
      else if (r.pts) out.answer.push('point of contact ' + c2PS(r.pts[0]));
    }
  }
  return g3Out(out);
}, [2, 'two circles: circlecircle(x^2 + y^2 = 25, (x-3)^2 + y^2 = 16)']);

defMat('tangentcircle tangentsfrom', (args, n, out) => {
  const ci = c2Circle(args[0], 'tangentcircle');
  const P = c2Pt(args[1], 'tangentcircle');
  const [h, k, r2] = ci;
  const d2 = c2Dist2(P, [h, k]);
  const cmp = d2.sub(r2);
  if (cmp.isZero()) {
    const l = [P[0].sub(h), P[1].sub(k), P[0].sub(h).mul(P[0]).add(P[1].sub(k).mul(P[1]))];
    out.answer.push('tangent at ' + c2P(P) + ': ' + c2LineText(l));
    out.work.push('the tangent is perpendicular to the radius: normal vector = P − centre = ' + c2P(c2Sub(P, [h, k])));
    return g3Out(out);
  }
  if (cmp.sign() < 0) {
    out.answer.push('the point lies inside the circle: there is no tangent through it');
    out.work.push('distance from the centre ' + c2Sqrt(d2) + ' < radius ' + c2Sqrt(r2));
    return g3Out(out);
  }
  // the points of contact lie on the polar line (x0 - h)(x - h) + (y0 - k)(y - k) = r²
  const a = P[0].sub(h);
  const b = P[1].sub(k);
  const polar = [a, b, r2.add(a.mul(h)).add(b.mul(k))];
  const r = c2LineCircle(polar, ci);
  out.work.push('tangent length = ' + c2Sqrt(cmp) + ';  the points of contact lie on the polar line ' + c2LineText(polar));
  r.pts.forEach((T, i) => {
    out.answer.push('point of contact ' + c2PS(T));
    const A = simp(sSub(T[1], sN(P[1])));
    const B = simp(sSub(sN(P[0]), T[0]));
    const C = simp(sAdd([sMul([A, sN(P[0])]), sMul([B, sN(P[1])])]));
    const rat = A.k === 'n' && B.k === 'n' && C.k === 'n';
    if (rat) out.answer.push('tangent ' + (i + 1) + ': ' + c2LineText([A.q, B.q, C.q]));
    else out.answer.push('tangent ' + (i + 1) + ': (' + fmtS(A) + ')x + (' + fmtS(B) + ')y = ' + fmtS(C) + '   (slope ≈ ' + fmtNum(-numS(A, {}) / numS(B, {})) + ')');
  });
  return g3Out(out);
}, [2, 'a circle and a point: tangentcircle(x^2 + y^2 = 25, [7, 1])']);

// ---- lines -------------------------------------------------------------------------------------------------------------------------
defMat('perpbisector', (args, n, out) => {
  const P = c2Pt(args[0], 'perpbisector');
  const Qp = c2Pt(args[1], 'perpbisector');
  if (P[0].eq(Qp[0]) && P[1].eq(Qp[1])) throw new MathError('the two points must be different');
  const M = [P[0].add(Qp[0]).div(qInt(2)), P[1].add(Qp[1]).div(qInt(2))];
  const a = Qp[0].sub(P[0]);
  const b = Qp[1].sub(P[1]);
  const l = [a, b, a.mul(M[0]).add(b.mul(M[1]))];
  out.answer.push('perpendicular bisector: ' + c2LineText(l));
  out.work.push('midpoint ' + c2P(M) + ';  normal vector = Q − P = ' + c2P([a, b]) + ';  ' + c2SlopeText(l));
  out.check = c2Dist2(P, [M[0], M[1]]).eq(c2Dist2(Qp, M)) ? 'the midpoint is on the line and the line is perpendicular to PQ' : null;
  return g3Out(out);
}, [2, 'two points: perpbisector([1,2], [5,6])']);

defMat('parallel', (args, n, out) => {
  const l = c2Line(args[0], 'parallel');
  const P = c2Pt(args[1], 'parallel');
  const m = [l[0], l[1], l[0].mul(P[0]).add(l[1].mul(P[1]))];
  out.answer.push('parallel line through ' + c2P(P) + ': ' + c2LineText(m));
  out.work.push('same normal vector (' + c2P([l[0], l[1]]).slice(1, -1) + ') as ' + c2LineText(l) + ';  ' + c2SlopeText(m));
  const n2 = l[0].mul(l[0]).add(l[1].mul(l[1]));
  const diff = m[2].sub(l[2]);
  out.work.push(diff.isZero() ? 'the point lies on the given line, so the parallel line is that line itself' : 'distance between the two parallel lines = ' + g3Ratio(diff.abs(), n2));
  return g3Out(out);
}, [2, 'a line and a point: parallel(y = 2x + 3, [1, 5])']);

defMat('perpendicular', (args, n, out) => {
  const l = c2Line(args[0], 'perpendicular');
  const P = c2Pt(args[1], 'perpendicular');
  const m = [l[1], l[0].neg(), l[1].mul(P[0]).sub(l[0].mul(P[1]))];
  out.answer.push('perpendicular line through ' + c2P(P) + ': ' + c2LineText(m));
  out.work.push('direction of ' + c2LineText(l) + ' becomes the normal vector;  ' + c2SlopeText(m));
  const n2 = l[0].mul(l[0]).add(l[1].mul(l[1]));
  const e = c2Eval(l, P);
  const foot = [P[0].sub(e.div(n2).mul(l[0])), P[1].sub(e.div(n2).mul(l[1]))];
  out.work.push(e.isZero() ? 'the point lies on the given line (it is the foot of the perpendicular)' : 'foot of the perpendicular on the given line ' + c2P(foot) + ';  distance from the point = ' + g3Ratio(e.abs(), n2));
  out.check = l[0].mul(m[0]).add(l[1].mul(m[1])).isZero() ? 'the normal vectors are orthogonal' : null;
  return g3Out(out);
}, [2, 'a line and a point: perpendicular(y = 2x + 3, [1, 5])']);

defMat('lineintersect linesintersect', (args, n, out) => {
  const l1 = c2Line(args[0], 'lineintersect');
  const l2 = c2Line(args[1], 'lineintersect');
  const det = l1[0].mul(l2[1]).sub(l2[0].mul(l1[1]));
  if (det.isZero()) {
    const same = l1[0].mul(l2[2]).eq(l2[0].mul(l1[2])) && l1[1].mul(l2[2]).eq(l2[1].mul(l1[2]));
    if (same) out.answer.push('the lines coincide');
    else {
      out.answer.push('the lines are parallel (no intersection)');
      const n2 = l1[0].mul(l1[0]).add(l1[1].mul(l1[1]));
      // bring l2 to the normal vector of l1
      const t = l1[0].isZero() ? l1[1].div(l2[1]) : l1[0].div(l2[0]);
      const diff = l2[2].mul(t).sub(l1[2]);
      out.work.push('distance between the lines = ' + g3Ratio(diff.abs(), n2));
    }
    return g3Out(out);
  }
  const x = l1[2].mul(l2[1]).sub(l2[2].mul(l1[1])).div(det);
  const y = l1[0].mul(l2[2]).sub(l2[0].mul(l1[2])).div(det);
  out.answer.push('intersection point ' + c2P([x, y]));
  const cross = l1[0].mul(l2[1]).sub(l1[1].mul(l2[0]));
  const dot = l1[0].mul(l2[0]).add(l1[1].mul(l2[1]));
  const ang = Math.atan2(Math.abs(cross.toNumber()), Math.abs(dot.toNumber()));
  out.answer.push('angle between the lines (acute) = ' + c2Deg(ang) + (dot.isZero() ? ' (perpendicular)' : ''));
  out.check = c2Eval(l1, [x, y]).isZero() && c2Eval(l2, [x, y]).isZero() ? 'the point satisfies both equations' : null;
  return g3Out(out);
}, [2, 'two lines: lineintersect(y = 2x + 1, x + y = 7)']);

defMat('lineinfo', (args, n, out) => {
  const l = c2Line(args[0], 'lineinfo');
  const [a, b, c] = l;
  out.answer.push(c2LineText(l));
  if (b.isZero()) out.answer.push('vertical line: undefined slope, x-intercept ' + c.div(a).toString());
  else {
    out.answer.push('slope m = ' + a.neg().div(b).toString() + ',  ' + c2SlopeText(l));
    out.work.push('y-intercept ' + c.div(b).toString() + (a.isZero() ? ' (horizontal line, no x-intercept)' : ',  x-intercept ' + c.div(a).toString()));
    const mm = a.neg().div(b).toNumber();
    out.work.push('angle of inclination ' + c2Deg(mm >= 0 ? Math.atan(mm) : Math.atan(mm) + Math.PI));
  }
  out.work.push('normal vector ' + c2P([a, b]) + ',  direction vector ' + c2P([b.neg(), a]) + ',  distance from the origin ' + g3Ratio(c.abs(), a.mul(a).add(b.mul(b))));
  return g3Out(out);
}, [1, 'a line: lineinfo(3x + 4y = 12)']);

defMat('pointline', (args, n, out) => {
  const P = c2Pt(args[0], 'pointline');
  const l = c2Line(args[1], 'pointline');
  const n2 = l[0].mul(l[0]).add(l[1].mul(l[1]));
  const e = c2Eval(l, P);
  const foot = [P[0].sub(e.div(n2).mul(l[0])), P[1].sub(e.div(n2).mul(l[1]))];
  out.answer.push('distance = ' + g3Ratio(e.abs(), n2));
  out.work.push('d = |ax₀ + by₀ − c| / √(a² + b²) = |' + e.toString() + '| / ' + c2Sqrt(n2));
  out.work.push('foot of the perpendicular ' + c2P(foot) + ';  mirror image of the point in the line ' + c2P([foot[0].mul(qInt(2)).sub(P[0]), foot[1].mul(qInt(2)).sub(P[1])]));
  out.check = c2Eval(l, foot).isZero() ? 'the foot lies on the line' : null;
  return g3Out(out);
}, [2, 'a point and a line: pointline([1, 2], 3x + 4y = 5)']);

defMat('parallellines', (args, n, out) => {
  const l1 = c2Line(args[0], 'parallellines');
  const l2 = c2Line(args[1], 'parallellines');
  if (!l1[0].mul(l2[1]).sub(l1[1].mul(l2[0])).isZero()) throw new MathError('the lines are not parallel');
  const t = l1[0].isZero() ? l1[1].div(l2[1]) : l1[0].div(l2[0]);
  const diff = l2[2].mul(t).sub(l1[2]);
  const n2 = l1[0].mul(l1[0]).add(l1[1].mul(l1[1]));
  out.answer.push('distance = ' + g3Ratio(diff.abs(), n2));
  out.work.push('d = |c₁ − c₂| / √(a² + b²) once both equations have the same a and b');
  return g3Out(out);
}, [2, 'two parallel lines: parallellines(3x + 4y = 5, 3x + 4y = 15)']);

// ---- triangle centres ---------------------------------------------------------------------------------------------------------------
defMat('triangle2d trianglecenters', (args, n, out) => {
  const [A, B, C] = args.slice(0, 3).map((a) => c2Pt(a, 'triangle2d'));
  const cross = B[0].sub(A[0]).mul(C[1].sub(A[1])).sub(B[1].sub(A[1]).mul(C[0].sub(A[0])));
  if (cross.isZero()) throw new MathError('the three points lie on one line: there is no triangle');
  const area = cross.abs().div(qInt(2));
  const a2 = c2Dist2(B, C);
  const b2 = c2Dist2(C, A);
  const c2s = c2Dist2(A, B);
  const side = (q) => simp(sSqrt(sN(q)));
  const sa = side(a2);
  const sb = side(b2);
  const sc = side(c2s);
  out.answer.push('sides a = BC = ' + symText(sa) + ',  b = CA = ' + symText(sb) + ',  c = AB = ' + symText(sc));
  const sorted = [a2, b2, c2s].slice().sort((p, q) => p.sub(q).sign());
  const kind = sorted[0].eq(sorted[2]) ? 'equilateral' : sorted[0].eq(sorted[1]) || sorted[1].eq(sorted[2]) ? 'isosceles' : 'scalene';
  const rt = sorted[2].sub(sorted[0]).sub(sorted[1]);
  out.answer.push('area = ' + area.toString() + (area.isInt() ? '' : ' (= ' + fmtNum(area.toNumber()) + ')') + ',  perimeter = ' + symText(simp(sAdd([sa, sb, sc]))));
  out.answer.push(kind + ', ' + (rt.isZero() ? 'right' : rt.sign() < 0 ? 'acute' : 'obtuse') + ' triangle;  angles A = ' + c2Deg(Math.acos((b2.add(c2s).sub(a2).toNumber()) / (2 * Math.sqrt(b2.toNumber() * c2s.toNumber())))) + ', B = ' + c2Deg(Math.acos((a2.add(c2s).sub(b2).toNumber()) / (2 * Math.sqrt(a2.toNumber() * c2s.toNumber())))) + ', C = ' + c2Deg(Math.acos((a2.add(b2).sub(c2s).toNumber()) / (2 * Math.sqrt(a2.toNumber() * b2.toNumber())))));
  const G = [A[0].add(B[0]).add(C[0]).div(qInt(3)), A[1].add(B[1]).add(C[1]).div(qInt(3))];
  const cc = c2Circle_(A, B, C);
  const O = [cc[0], cc[1]];
  const H = [A[0].add(B[0]).add(C[0]).sub(qInt(2).mul(O[0])), A[1].add(B[1]).add(C[1]).sub(qInt(2).mul(O[1]))];
  out.answer.push('centroid G = ' + c2P(G));
  out.answer.push('circumcentre O = ' + c2P(O) + ',  circumradius R = ' + c2Sqrt(cc[2]));
  out.answer.push('orthocentre H = ' + c2P(H));
  // incentre: weights a, b, c (lengths, possibly irrational)
  const perim = sAdd([sa, sb, sc]);
  const inc = [0, 1].map((i) => simp(sDiv(sAdd([sMul([sa, sN(A[i])]), sMul([sb, sN(B[i])]), sMul([sc, sN(C[i])])]), perim)));
  const inr = simp(sDiv(sN(area), sDiv(perim, sI(2))));
  out.answer.push('incentre I = ' + c2PS(inc) + ',  inradius r = ' + symText(inr));
  const N9 = [O[0].add(H[0]).div(qInt(2)), O[1].add(H[1]).div(qInt(2))];
  out.work.push('nine-point centre ' + c2P(N9) + (kind === 'equilateral' ? ' (G, O, H, I coincide)' : ';  O, G, H lie on the Euler line with OG : GH = 1 : 2'));
  const ok = [[A, B, C], [B, C, A], [C, A, B]].every(([P1, P2, P3]) => H[0].sub(P1[0]).mul(P3[0].sub(P2[0])).add(H[1].sub(P1[1]).mul(P3[1].sub(P2[1]))).isZero());
  out.check = ok && c2Dist2(O, A).eq(c2Dist2(O, B)) && c2Dist2(O, A).eq(c2Dist2(O, C)) ? 'O is equidistant from A, B, C and the altitudes pass through H' : null;
  return g3Out(out);
}, [3, 'three points: triangle2d([0,0], [4,0], [0,3])']);
/** circumcentre and R² of a triangle (rational) */
function c2Circle_(A, B, C) {
  const D = qInt(2).mul(A[0].mul(B[1].sub(C[1])).add(B[0].mul(C[1].sub(A[1]))).add(C[0].mul(A[1].sub(B[1]))));
  const sa = A[0].mul(A[0]).add(A[1].mul(A[1]));
  const sb = B[0].mul(B[0]).add(B[1].mul(B[1]));
  const sc = C[0].mul(C[0]).add(C[1].mul(C[1]));
  const h = sa.mul(B[1].sub(C[1])).add(sb.mul(C[1].sub(A[1]))).add(sc.mul(A[1].sub(B[1]))).div(D);
  const k = sa.mul(C[0].sub(B[0])).add(sb.mul(A[0].sub(C[0]))).add(sc.mul(B[0].sub(A[0]))).div(D);
  return [h, k, c2Dist2([h, k], A)];
}

// ---- transformations ----------------------------------------------------------------------------------------------------------------
const c2Out = (out, pts, images, plain) => {
  images.forEach((p, i) => out.answer.push((pts.length > 1 ? 'point ' + (i + 1) + ': ' + c2P(pts[i]) + ' → ' : 'image: ') + c2PS(p)));
  return plain ? out : g3Out(out);
};
defCmd('rotate', (n) => {
  if (n.args.length < 2 || n.args.length > 3) throw new MathError('rotate(point, angle) or rotate(point, angle, centre): the angle is in degrees (or an expression with pi in radians), counter-clockwise');
  const out = newOut();
  const pts = c2Pts(evalMat(n.args[0]), 'rotate');
  const C = n.args[2] ? c2Pt(evalMat(n.args[2]), 'rotate') : [Q0, Q0];
  const node = n.args[1];
  const S = fromAst(node);
  const inRad = varsOfS(S).size === 0 && /pi|π|rad/i.test(showRaw(node));
  const th = inRad ? S : degToRad(S);
  const cs = simp(sFn('cos', [th]));
  const sn = simp(sFn('sin', [th]));
  out.work.push('rotation by ' + symText(simp(S)) + (inRad ? ' rad' : '°') + ' about ' + c2P(C) + ':  x′ = cx + (x − cx)cos θ − (y − cy)sin θ,  y′ = cy + (x − cx)sin θ + (y − cy)cos θ');
  const images = pts.map((P) => {
    const dx = sN(P[0].sub(C[0]));
    const dy = sN(P[1].sub(C[1]));
    return [simp(expandS(sAdd([sN(C[0]), sMul([dx, cs]), sNeg(sMul([dy, sn]))]))), simp(expandS(sAdd([sN(C[1]), sMul([dx, sn]), sMul([dy, cs])])))];
  });
  return c2Out(out, pts, images, true);
});
defMat('reflect', (args, n, out) => {
  const pts = c2Pts(args[0], 'reflect');
  const l = c2Line(args[1], 'reflect');
  const n2 = l[0].mul(l[0]).add(l[1].mul(l[1]));
  out.work.push('reflection in the line ' + c2LineText(l) + ':  P′ = P − 2(ax + by − c)/(a² + b²)·(a, b)');
  const images = pts.map((P) => {
    const t = c2Eval(l, P).mul(qInt(2)).div(n2);
    return [sN(P[0].sub(t.mul(l[0]))), sN(P[1].sub(t.mul(l[1])))];
  });
  return c2Out(out, pts, images);
}, [2, 'a point (or points) and a line: reflect([1, 2], y = x)']);
defMat('translate', (args, n, out) => {
  const pts = c2Pts(args[0], 'translate');
  const v = c2Pt(args[1], 'translate');
  out.work.push('translation by the vector ' + c2P(v) + ':  P′ = P + v');
  return c2Out(out, pts, pts.map((P) => [sN(P[0].add(v[0])), sN(P[1].add(v[1]))]));
}, [2, 'a point (or points) and a vector: translate([1, 2], [3, -1])']);
defMat('dilate', (args, n, out) => {
  const pts = c2Pts(args[0], 'dilate');
  const kk = args[1].t === 'num' ? args[1].q : (() => { throw new MathError('dilate needs a scale factor: dilate([1, 2], 3) or dilate([1, 2], 3, [4, 4])'); })();
  const C = args[2] ? c2Pt(args[2], 'dilate') : [Q0, Q0];
  out.work.push('dilation with factor ' + kk.toString() + ' about ' + c2P(C) + ':  P′ = C + k(P − C)' + (kk.sign() < 0 ? ' (the image is turned through 180°)' : ''));
  return c2Out(out, pts, pts.map((P) => [sN(C[0].add(kk.mul(P[0].sub(C[0])))), sN(C[1].add(kk.mul(P[1].sub(C[1]))))]));
}, [2, 'a point (or points), a factor and optionally a centre: dilate([1, 2], 3)']);

// ---- the section formula, collinearity, convex hull -------------------------------------------------------------------------------------
defMat('section', (args, n, out) => {
  const P = c2Pt(args[0], 'section');
  const Qp = c2Pt(args[1], 'section');
  const m = args[2].t === 'num' ? args[2].q : null;
  const nn = args[3].t === 'num' ? args[3].q : null;
  if (!m || !nn) throw new MathError('section(P, Q, m, n) needs the ratio m, n as numbers');
  const s = m.add(nn);
  if (s.isZero()) throw new MathError('m + n must not be 0 (a ratio of 1 : −1 has no point)');
  const R = [nn.mul(P[0]).add(m.mul(Qp[0])).div(s), nn.mul(P[1]).add(m.mul(Qp[1])).div(s)];
  const external = m.sign() * nn.sign() < 0;
  out.answer.push('the point dividing PQ ' + (external ? 'externally' : 'internally') + ' in the ratio ' + m.toString() + ' : ' + nn.toString() + ' is ' + c2P(R));
  out.work.push('R = (n·P + m·Q)/(m + n)' + (external ? '  (a negative ratio means external division)' : ''));
  return g3Out(out);
}, [4, 'two points and a ratio: section([1, 2], [7, 8], 2, 1)']);

defMat('collinear', (args, n, out) => {
  const pts = args.length === 1 ? c2Pts(args[0], 'collinear') : args.map((a) => c2Pt(a, 'collinear'));
  if (pts.length < 3) throw new MathError('collinear needs at least three points');
  let first = null;
  for (let i = 1; i < pts.length && !first; i++) if (!(pts[i][0].eq(pts[0][0]) && pts[i][1].eq(pts[0][1]))) first = pts[i];
  if (!first) { out.answer.push('all points coincide'); return g3Out(out); }
  const l = c2Eq(pts[0], first);
  const off = pts.filter((P) => !c2Eval(l, P).isZero());
  if (!off.length) {
    out.answer.push('yes, the points are collinear');
    out.work.push('they lie on the line ' + c2LineText(l));
  } else {
    out.answer.push('no, the points are not collinear');
    const P = off[0];
    const area = first[0].sub(pts[0][0]).mul(P[1].sub(pts[0][1])).sub(first[1].sub(pts[0][1]).mul(P[0].sub(pts[0][0]))).abs().div(qInt(2));
    out.work.push('the triangle ' + c2P(pts[0]) + ', ' + c2P(first) + ', ' + c2P(P) + ' has area ' + area.toString() + ' ≠ 0');
  }
  return g3Out(out);
}, [3, 'three or more points: collinear([0,0], [1,2], [3,6])']);

defMat('hull convexhull', (args, n, out) => {
  const pts = args.length === 1 ? c2Pts(args[0], 'hull') : args.map((a) => c2Pt(a, 'hull'));
  if (pts.length < 3) throw new MathError('hull needs at least three points');
  const sorted = pts.slice().sort((p, q) => p[0].sub(q[0]).sign() || p[1].sub(q[1]).sign());
  const uniq = sorted.filter((p, i) => i === 0 || !(p[0].eq(sorted[i - 1][0]) && p[1].eq(sorted[i - 1][1])));
  const crs = (o, a, b) => a[0].sub(o[0]).mul(b[1].sub(o[1])).sub(a[1].sub(o[1]).mul(b[0].sub(o[0])));
  const half = (arr) => {
    const h = [];
    arr.forEach((p) => {
      while (h.length >= 2 && crs(h[h.length - 2], h[h.length - 1], p).sign() <= 0) h.pop();
      h.push(p);
    });
    h.pop();
    return h;
  };
  const hull = half(uniq).concat(half(uniq.slice().reverse()));
  if (hull.length < 3) {
    out.answer.push('the points are collinear: the hull is the segment from ' + c2P(uniq[0]) + ' to ' + c2P(uniq[uniq.length - 1]));
    return g3Out(out);
  }
  out.answer.push('vertices of the convex hull (counter-clockwise): ' + hull.map(c2P).join(', '));
  let area = Q0;
  let per = S0;
  hull.forEach((p, i) => {
    const q = hull[(i + 1) % hull.length];
    area = area.add(p[0].mul(q[1]).sub(q[0].mul(p[1])));
    per = sAdd([per, simp(sSqrt(sN(c2Dist2(p, q))))]);
  });
  out.work.push('area = ' + area.abs().div(qInt(2)).toString() + ',  perimeter = ' + symText(simp(per)) + ',  ' + hull.length + ' of the ' + uniq.length + ' points are vertices');
  return g3Out(out);
}, [3, 'points: hull([0,0], [4,0], [4,3], [1,1], [0,3])']);

// ---- text pre-pass: equations inside the arguments become [a, b, c] (lines) and [h, k, r²] (circles) -----------------------------------------
const C2_KINDS = {
  linecircle: ['line', 'circle'], circlecircle: ['circle', 'circle'], tangentcircle: ['circle', null], tangentsfrom: ['circle', null],
  parallel: ['line', null], perpendicular: ['line', null], lineinfo: ['line'],
  parallellines: ['line', 'line'], lineintersect: ['line', 'line'], linesintersect: ['line', 'line'], pointline: [null, 'line'], reflect: [null, 'line'],
};
/** "Read as" shows the lines and circles as the equations they stand for */
Object.keys(C2_KINDS).forEach((name) => {
  const base = COMMANDS[name];
  if (!base) return;
  base.show = (n) => name + '(' + n.args.map((a, i) => {
    const kind = C2_KINDS[name][Math.min(i, C2_KINDS[name].length - 1)];
    try {
      if (kind === 'line' && a.t === 'list') {
        const v = c2Flat(evalMat(a), name);
        if (v && v.length === 3) return c2LineText(v);
      }
      if (kind === 'circle' && a.t === 'list') {
        const v = c2Flat(evalMat(a), name);
        if (v && v.length === 3) return c2Sq('x', v[0]) + ' + ' + c2Sq('y', v[1]) + ' = ' + v[2].toString();
      }
    } catch (e) {
      // show the raw text
    }
    return showRaw(a);
  }).join(', ') + ')';
});
function convertCoord2d(s) {
  if (!/=/.test(s) || !/[xy]/.test(s)) return s;
  const asLine = (arg) => {
    if (!/=/.test(arg) || /\[/.test(arg)) return null;
    let st;
    try {
      st = parseStatement(cleanStatement(arg));
    } catch (e) {
      return null;
    }
    if (st.kind !== 'eq') return null;
    const f = affineForm(st, ['x', 'y']);
    if (!f || (f.coef[0].isZero() && f.coef[1].isZero())) return null;
    return '[' + f.coef[0].toString() + ', ' + f.coef[1].toString() + ', ' + f.c0.neg().toString() + ']';
  };
  const asCircle = (arg) => {
    if (!/=/.test(arg) || /\[/.test(arg)) return null;
    let st;
    try {
      st = parseStatement(cleanStatement(arg));
    } catch (e) {
      return null;
    }
    if (st.kind !== 'eq') return null;
    let co;
    try {
      co = conicCoefficients(st.lhs, st.rhs);
    } catch (e) {
      return null;
    }
    if (!co || !co.B.isZero() || co.A.isZero() || !co.A.eq(co.C)) return null;
    const h = co.D.neg().div(qInt(2).mul(co.A));
    const k = co.E.neg().div(qInt(2).mul(co.A));
    const r2 = h.mul(h).add(k.mul(k)).sub(co.F.div(co.A));
    if (r2.sign() <= 0) throw new MathError('this equation has no real circle (r² = ' + r2.toString() + ')');
    return '[' + h.toString() + ', ' + k.toString() + ', ' + r2.toString() + ']';
  };
  const handle = (kinds) => (name, inner) => {
    const parts = g3SplitArgs(inner);
    let changed = false;
    const conv = parts.map((p, i) => {
      const kind = kinds[Math.min(i, kinds.length - 1)];
      if (!kind) return p;
      const r = kind === 'line' ? asLine(p) : asCircle(p);
      if (r) changed = true;
      return r || p;
    });
    return changed ? name + '(' + conv.join(',') + ')' : null;
  };
  Object.keys(C2_KINDS).forEach((name) => { s = replaceCalls(s, [name], handle(C2_KINDS[name])); });
  return s;
}
