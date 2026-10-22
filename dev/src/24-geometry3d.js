// ======================================================================
// 24. Analytic geometry in space: planes, lines, distances, angles, skew lines, triple products, spheres and the classification of
//     quadric surfaces (ellipsoids, hyperboloids, paraboloids, cones, cylinders).  Points, vectors and planes are lists:
//     a point [x, y, z], a plane [a, b, c, d] meaning ax + by + cz = d, a line as a point and a direction.
// ======================================================================
const g3Vec = (v, what) => {
  const a = needMat(v, what);
  const f = a.length === 1 ? a[0] : a[0].length === 1 ? a.map((r) => r[0]) : null;
  if (!f || f.length !== 3) throw new MathError(what + ' needs a point or vector with three numbers, e.g. [1, 2, 3]');
  return f;
};
const g3Plane = (v, what) => {
  const a = needMat(v, what);
  const f = a.length === 1 ? a[0] : a[0].length === 1 ? a.map((r) => r[0]) : null;
  if (!f || f.length !== 4) throw new MathError(what + ' needs a plane written [a, b, c, d] for ax + by + cz = d (or the equation itself, e.g. 2x + 3y - z = 5)');
  if (f[0].isZero() && f[1].isZero() && f[2].isZero()) throw new MathError('a plane needs at least one of a, b, c to be non-zero');
  return f;
};
const g3Cross = (u, v) => [u[1].mul(v[2]).sub(u[2].mul(v[1])), u[2].mul(v[0]).sub(u[0].mul(v[2])), u[0].mul(v[1]).sub(u[1].mul(v[0]))];
const g3Sub = (u, v) => u.map((x, i) => x.sub(v[i]));
const g3Add = (u, v) => u.map((x, i) => x.add(v[i]));
const g3Scale = (u, k) => u.map((x) => x.mul(k));
const g3IsZero = (u) => u.every((x) => x.isZero());
const g3Show = (u) => '(' + u.map((q) => q.toString()).join(', ') + ')';
const g3Len = (u) => symText(simp(sSqrt(sN(dotQ(u, u)))));
const g3Rad = (q) => symText(simp(sSqrt(sN(q))));
const g3Ratio = (num, den2) => symText(simp(sDiv(sN(num), sSqrt(sN(den2)))));
const g3Deg = (rad) => fmtNum((rad * 180) / Math.PI) + '°';
/** Integer, coprime coefficients with the first non-zero one positive. */
function g3NormPlane(p) {
  let L = 1n;
  p.forEach((q) => { L = (L * q.d) / bgcd(L, q.d); });
  let ints = p.map((q) => q.n * (L / q.d));
  let g = 0n;
  ints.forEach((v) => { g = bgcd(g, babs(v)); });
  if (g > 1n) ints = ints.map((v) => v / g);
  const first = ints.find((v) => v !== 0n);
  if (first < 0n) ints = ints.map((v) => -v);
  return ints.map((v) => qInt(v));
}
function g3PlaneText(p) {
  const names = ['x', 'y', 'z'];
  let s = '';
  for (let i = 0; i < 3; i++) {
    const c = p[i];
    if (c.isZero()) continue;
    const mag = c.sign() < 0 ? c.neg() : c;
    const term = (mag.eq(Q1) ? '' : mag.toString()) + names[i];
    s += s ? (c.sign() < 0 ? ' - ' : ' + ') + term : (c.sign() < 0 ? '-' : '') + term;
  }
  return s + ' = ' + p[3].toString();
}
const g3Out = (out) => {
  out.__done = true;
  return mat([[Q0]], { __skip: true });
};
function g3LineLines(out, P, d) {
  const names = ['x', 'y', 'z'];
  out.work.push('vector form: r = ' + g3Show(P) + ' + t·' + g3Show(d));
  const comp = (p, dd) => {
    if (dd.isZero()) return p.toString();
    const tt = (dd.abs().eq(Q1) ? '' : dd.abs().toString()) + 't';
    if (p.isZero()) return (dd.sign() < 0 ? '-' : '') + tt;
    return p.toString() + (dd.sign() < 0 ? ' - ' : ' + ') + tt;
  };
  out.work.push('parametric: ' + names.map((nm, i) => nm + ' = ' + comp(P[i], d[i])).join(',  '));
  const sym = names.map((nm, i) => (d[i].isZero() ? null : (P[i].isZero() ? nm : '(' + nm + (P[i].sign() < 0 ? ' + ' : ' - ') + P[i].abs().toString() + ')') + '/' + (d[i].sign() < 0 ? '(' + d[i].toString() + ')' : d[i].toString()))).filter(Boolean);
  const fixed = names.map((nm, i) => (d[i].isZero() ? nm + ' = ' + P[i].toString() : null)).filter(Boolean);
  out.work.push('symmetric: ' + sym.join(' = ') + (fixed.length ? ',  ' + fixed.join(', ') : ''));
}

defMat('plane planeinfo', (args, n, out) => {
  let p;
  if (args.length === 1) {
    p = g3Plane(args[0], 'plane');
  } else if (args.length === 2) {
    const P = g3Vec(args[0], 'plane (point)');
    const nv = g3Vec(args[1], 'plane (normal vector)');
    if (g3IsZero(nv)) throw new MathError('the normal vector must not be zero');
    p = nv.concat([dotQ(nv, P)]);
    out.work.push('through ' + g3Show(P) + ' with normal vector ' + g3Show(nv) + ':  n·(X − P) = 0');
  } else if (args.length === 3) {
    const [A, B, C] = args.map((a) => g3Vec(a, 'plane (point)'));
    const nv = g3Cross(g3Sub(B, A), g3Sub(C, A));
    if (g3IsZero(nv)) throw new MathError('the three points lie on one line, so they do not determine a plane');
    p = nv.concat([dotQ(nv, A)]);
    out.work.push('normal vector n = AB × AC = ' + g3Show(nv));
  } else throw new MathError('plane needs three points, a point and a normal vector, or a plane [a, b, c, d]');
  const q = g3NormPlane(p);
  out.answer.push('plane ' + g3PlaneText(q));
  const nv = q.slice(0, 3);
  out.work.push('normal vector ' + g3Show(nv) + ', length ' + g3Len(nv) + ';  distance from the origin ' + g3Ratio(q[3].abs(), dotQ(nv, nv)));
  const names = ['x', 'y', 'z'];
  const ic = names.map((nm, i) => (q[i].isZero() ? null : nm + '-intercept ' + q[3].div(q[i]).toString())).filter(Boolean);
  out.work.push(ic.join(', ') + (ic.length < 3 ? ' (parallel to the axis with no intercept)' : ''));
  if (args.length === 3) {
    const ok = args.every((a) => { const P = g3Vec(a, 'plane'); return dotQ(nv, P).eq(q[3]); });
    out.check = ok ? 'all three points satisfy the equation' : null;
  }
  out.value = { q: q[3] };
  return g3Out(out);
}, [1, 'a plane [a, b, c, d], a point and a normal, or three points']);

defMat('line3d line3', (args, n, out) => {
  const P = g3Vec(args[0], 'line3d');
  const Qp = g3Vec(args[1], 'line3d');
  const d = g3Sub(Qp, P);
  if (g3IsZero(d)) throw new MathError('the two points are the same');
  out.answer.push('direction vector ' + g3Show(d) + ' (length ' + g3Len(d) + ')');
  g3LineLines(out, P, d);
  return g3Out(out);
}, [2, 'two points: line3d([1,2,3], [4,6,3])']);

defMat('pointplane planedist', (args, n, out) => {
  const P = g3Vec(args[0], 'pointplane');
  const p = g3Plane(args[1], 'pointplane');
  const nv = p.slice(0, 3);
  const nn = dotQ(nv, nv);
  const num = dotQ(nv, P).sub(p[3]);
  out.answer.push('distance = ' + g3Ratio(num.sign() < 0 ? num.neg() : num, nn));
  const foot = g3Sub(P, g3Scale(nv, num.div(nn)));
  out.work.push('d = |a·x₀ + b·y₀ + c·z₀ − d| / √(a² + b² + c²) = |' + num.toString() + '| / ' + g3Rad(nn));
  out.work.push('foot of the perpendicular ' + g3Show(foot) + (num.isZero() ? ' (the point lies on the plane)' : ';  the point is on the ' + (num.sign() > 0 ? 'side the normal vector points to' : 'opposite side')));
  out.check = dotQ(nv, foot).eq(p[3]) ? 'the foot lies in the plane' : null;
  return g3Out(out);
}, [2, 'a point and a plane: pointplane([1,2,3], [2,3,-1,5])']);

defMat('pointline3d', (args, n, out) => {
  const P = g3Vec(args[0], 'pointline3d');
  const A = g3Vec(args[1], 'pointline3d');
  const d = g3Vec(args[2], 'pointline3d');
  if (g3IsZero(d)) throw new MathError('the direction vector must not be zero');
  const t = dotQ(g3Sub(P, A), d).div(dotQ(d, d));
  const foot = g3Add(A, g3Scale(d, t));
  const w = g3Sub(P, foot);
  out.answer.push('distance = ' + g3Rad(dotQ(w, w)));
  out.work.push('foot of the perpendicular ' + g3Show(foot) + ' (t = ' + t.toString() + ');  distance = |(P − A) × d| / |d|');
  out.check = dotQ(w, d).isZero() ? 'the connecting vector is perpendicular to the line' : null;
  return g3Out(out);
}, [3, 'a point, a point on the line and the direction: pointline3d([1,2,3], [0,0,0], [1,1,0])']);

defMat('skewlines linedistance', (args, n, out) => {
  const A = g3Vec(args[0], 'skewlines');
  const d1 = g3Vec(args[1], 'skewlines');
  const B = g3Vec(args[2], 'skewlines');
  const d2 = g3Vec(args[3], 'skewlines');
  if (g3IsZero(d1) || g3IsZero(d2)) throw new MathError('the direction vectors must not be zero');
  const nv = g3Cross(d1, d2);
  const AB = g3Sub(B, A);
  if (g3IsZero(nv)) {
    const c = g3Cross(AB, d1);
    const dist2 = dotQ(c, c).div(dotQ(d1, d1));
    if (dist2.isZero()) out.answer.push('the lines are parallel and coincide');
    else out.answer.push('the lines are parallel, distance = ' + g3Rad(dist2));
    return g3Out(out);
  }
  const nn = dotQ(nv, nv);
  const tri = dotQ(AB, nv);
  const s = dotQ(g3Cross(AB, d2), nv).div(nn);
  const t = dotQ(g3Cross(AB, d1), nv).div(nn);
  const P1 = g3Add(A, g3Scale(d1, s));
  const P2 = g3Add(B, g3Scale(d2, t));
  if (tri.isZero()) {
    out.answer.push('the lines intersect at ' + g3Show(P1));
    out.work.push('parameters s = ' + s.toString() + ' on the first line and t = ' + t.toString() + ' on the second');
  } else {
    out.answer.push('the lines are skew, distance = ' + g3Ratio(tri.sign() < 0 ? tri.neg() : tri, nn));
    out.work.push('d = |(B − A)·(d₁ × d₂)| / |d₁ × d₂|, with d₁ × d₂ = ' + g3Show(nv));
    out.work.push('closest points ' + g3Show(P1) + ' on the first line and ' + g3Show(P2) + ' on the second');
    out.check = dotQ(g3Sub(P2, P1), d1).isZero() && dotQ(g3Sub(P2, P1), d2).isZero() ? 'the segment joining them is perpendicular to both lines' : null;
  }
  return g3Out(out);
}, [4, 'point and direction of each line: skewlines([0,0,0],[1,0,0], [0,1,1],[0,1,0])']);

defMat('lineplane', (args, n, out) => {
  const A = g3Vec(args[0], 'lineplane');
  const d = g3Vec(args[1], 'lineplane');
  const p = g3Plane(args[2], 'lineplane');
  const nv = p.slice(0, 3);
  const nd = dotQ(nv, d);
  const gap = p[3].sub(dotQ(nv, A));
  const sinNum = nd.sign() < 0 ? nd.neg() : nd;
  const ang = Math.asin(Math.min(1, sinNum.toNumber() / Math.sqrt(dotQ(nv, nv).toNumber() * dotQ(d, d).toNumber())));
  if (nd.isZero()) {
    if (gap.isZero()) out.answer.push('the line lies in the plane');
    else out.answer.push('the line is parallel to the plane, distance = ' + g3Ratio(gap.sign() < 0 ? gap.neg() : gap, dotQ(nv, nv)));
    return g3Out(out);
  }
  const t = gap.div(nd);
  const X = g3Add(A, g3Scale(d, t));
  out.answer.push('intersection point ' + g3Show(X) + ' (t = ' + t.toString() + ')');
  out.work.push('substitute the line into the plane: n·(A + t d) = D  gives  t = (D − n·A)/(n·d) = ' + t.toString());
  out.work.push('angle between the line and the plane: sin φ = |n·d| / (|n||d|),  φ = ' + g3Deg(ang));
  out.check = dotQ(nv, X).eq(p[3]) ? 'the point satisfies the plane equation' : null;
  return g3Out(out);
}, [3, 'a point and direction of the line and a plane: lineplane([0,0,0],[1,1,1], [1,2,3,6])']);

defMat('planeangle', (args, n, out) => {
  const p1 = g3Plane(args[0], 'planeangle');
  const p2 = g3Plane(args[1], 'planeangle');
  const n1 = p1.slice(0, 3);
  const n2 = p2.slice(0, 3);
  const dp = dotQ(n1, n2);
  const cr = g3Cross(n1, n2);
  if (g3IsZero(cr)) {
    const same = g3NormPlane(p1).every((q, i) => q.eq(g3NormPlane(p2)[i]));
    out.answer.push(same ? 'the planes coincide' : 'the planes are parallel');
    return g3Out(out);
  }
  const cos = Math.abs(dp.toNumber()) / Math.sqrt(dotQ(n1, n1).toNumber() * dotQ(n2, n2).toNumber());
  const th = Math.acos(Math.min(1, cos));
  const cosS = simp(sDiv(sN(dp.sign() < 0 ? dp.neg() : dp), sSqrt(sN(dotQ(n1, n1).mul(dotQ(n2, n2))))));
  out.answer.push('angle between the planes = ' + g3Deg(th) + (dp.isZero() ? ' (the planes are perpendicular)' : ''));
  out.work.push('cos θ = |n₁·n₂| / (|n₁||n₂|) = ' + fmtS(cosS) + ';  n₁ = ' + g3Show(n1) + ', n₂ = ' + g3Show(n2));
  return g3Out(out);
}, [2, 'two planes: planeangle([1,0,0,0], [1,1,0,0])']);

defMat('planeintersect', (args, n, out) => {
  const p1 = g3Plane(args[0], 'planeintersect');
  const p2 = g3Plane(args[1], 'planeintersect');
  const n1 = p1.slice(0, 3);
  const n2 = p2.slice(0, 3);
  const d = g3Cross(n1, n2);
  if (g3IsZero(d)) {
    const a = g3NormPlane(p1);
    const b = g3NormPlane(p2);
    out.answer.push(a.every((q, i) => q.eq(b[i])) ? 'the planes coincide' : 'the planes are parallel: no common point');
    return g3Out(out);
  }
  // a point of the line: set the coordinate with the largest |d_k| to 0 and solve the remaining 2 x 2 system
  let k = 0;
  d.forEach((q, i) => { if (q.abs().sub(d[k].abs()).sign() > 0) k = i; });
  const [i, j] = [0, 1, 2].filter((x) => x !== k);
  const det = n1[i].mul(n2[j]).sub(n1[j].mul(n2[i]));
  const P = [Q0, Q0, Q0];
  P[i] = p1[3].mul(n2[j]).sub(p2[3].mul(n1[j])).div(det);
  P[j] = n1[i].mul(p2[3]).sub(n2[i].mul(p1[3])).div(det);
  const dv = primitiveVector(d);
  out.answer.push('the planes meet in the line through ' + g3Show(P) + ' with direction ' + g3Show(dv));
  g3LineLines(out, P, dv);
  out.work.push('direction = n₁ × n₂ = ' + g3Show(d));
  out.check = dotQ(n1, P).eq(p1[3]) && dotQ(n2, P).eq(p2[3]) ? 'the point lies in both planes' : null;
  return g3Out(out);
}, [2, 'two planes: planeintersect([1,1,1,3], [1,-1,0,0])']);

defMat('triplescalar tripleproduct parallelepiped', (args, n, out) => {
  const [u, v, w] = args.map((a) => g3Vec(a, 'triplescalar'));
  const t = dotQ(u, g3Cross(v, w));
  out.answer.push('u·(v × w) = ' + t.toString());
  out.work.push('volume of the parallelepiped = |u·(v × w)| = ' + (t.sign() < 0 ? t.neg() : t).toString() + ';  volume of the tetrahedron on them = ' + (t.sign() < 0 ? t.neg() : t).div(qInt(6)).toString());
  out.work.push(t.isZero() ? 'the three vectors are coplanar (linearly dependent)' : 'the three vectors are independent, ' + (t.sign() > 0 ? 'a right-handed' : 'a left-handed') + ' triple');
  out.value = { q: t };
  return g3Out(out);
}, [3, 'three vectors: triplescalar([1,0,0],[0,2,0],[0,0,3])']);

defMat('trianglearea3d', (args, n, out) => {
  const [A, B, C] = args.map((a) => g3Vec(a, 'trianglearea3d'));
  const c = g3Cross(g3Sub(B, A), g3Sub(C, A));
  const area2 = dotQ(c, c);
  out.answer.push('area = ' + (area2.isZero() ? '0 (the points are collinear)' : symText(simp(sDiv(sSqrt(sN(area2)), sI(2))))));
  out.work.push('area = |AB × AC| / 2 with AB × AC = ' + g3Show(c) + ';  sides ' + g3Rad(dotQ(g3Sub(B, A), g3Sub(B, A))) + ', ' + g3Rad(dotQ(g3Sub(C, B), g3Sub(C, B))) + ', ' + g3Rad(dotQ(g3Sub(A, C), g3Sub(A, C))));
  return g3Out(out);
}, [3, 'three points: trianglearea3d([0,0,0],[1,0,0],[0,2,0])']);

defMat('tetrahedron', (args, n, out) => {
  const [A, B, C, D] = args.map((a) => g3Vec(a, 'tetrahedron'));
  const t = dotQ(g3Sub(B, A), g3Cross(g3Sub(C, A), g3Sub(D, A)));
  const vol = (t.sign() < 0 ? t.neg() : t).div(qInt(6));
  out.answer.push(vol.isZero() ? 'volume = 0 (the four points are coplanar)' : 'volume = ' + qLabel(vol));
  out.work.push('V = |AB·(AC × AD)| / 6 = |' + t.toString() + '| / 6');
  out.value = { q: vol };
  return g3Out(out);
}, [4, 'four points: tetrahedron([0,0,0],[1,0,0],[0,1,0],[0,0,1])']);

defMat('dircos directioncosines', (args, n, out) => {
  const v = g3Vec(args[0], 'dircos');
  if (g3IsZero(v)) throw new MathError('the vector must not be zero');
  const L2 = dotQ(v, v);
  const names = ['α', 'β', 'γ'];
  const len = Math.sqrt(L2.toNumber());
  v.forEach((c, i) => {
    out.answer.push('cos ' + names[i] + ' = ' + symText(simp(sDiv(sN(c), sSqrt(sN(L2))))) + ',  ' + names[i] + ' = ' + g3Deg(Math.acos(c.toNumber() / len)));
  });
  out.work.push('direction cosines are the components of v divided by |v| = ' + g3Len(v) + ';  cos²α + cos²β + cos²γ = 1');
  return g3Out(out);
}, [1, 'a vector: dircos([1,2,2])']);

function g3Sphere(args, n, out) {
  let C;
  let r2;
  if (args.length === 2 && args[1].t === 'mat') {
    const A = g3Vec(args[0], 'sphere');
    const B = g3Vec(args[1], 'sphere');
    C = g3Scale(g3Add(A, B), new Q(1n, 2n));
    r2 = dotQ(g3Sub(B, A), g3Sub(B, A)).div(qInt(4));
    out.work.push('diameter from ' + g3Show(A) + ' to ' + g3Show(B) + ': centre = midpoint, radius = half the distance');
  } else if (args.length === 2) {
    C = g3Vec(args[0], 'sphere');
    const rv = args[1];
    const S = rv.t === 'num' ? sN(rv.q) : rv.S;
    const sq = simp(sPow(S, sI(2)));
    if (sq.k !== 'n') throw new MathError('the radius must be a number whose square is rational, e.g. 3 or sqrt(5)');
    r2 = sq.q;
    if (r2.sign() <= 0) throw new MathError('the radius must be positive');
  } else if (args.length === 4) {
    const P = args.map((a) => g3Vec(a, 'sphere'));
    const M = P.map((p) => p.concat([Q1]));
    const rhs = P.map((p) => dotQ(p, p).neg());
    const inv = mInv(M);
    if (!inv) throw new MathError('the four points are coplanar (or three are collinear), so there is no unique sphere through them');
    const sol = mMul(inv, rhs.map((q) => [q])).map((r) => r[0]);
    C = sol.slice(0, 3).map((q) => q.neg().div(qInt(2)));
    r2 = dotQ(C, C).sub(sol[3]);
    out.work.push('x² + y² + z² + Dx + Ey + Fz + G = 0 through the four points gives D, E, F, G = ' + sol.map((q) => q.toString()).join(', '));
  } else throw new MathError('sphere needs a centre and a radius, the two ends of a diameter, or four points');
  const G = dotQ(C, C).sub(r2);
  const lin = C.map((c) => c.mul(qInt(-2)));
  const names = ['x', 'y', 'z'];
  const sq = C.map((c, i) => (c.isZero() ? names[i] + '²' : '(' + names[i] + (c.sign() < 0 ? ' + ' + c.neg().toString() : ' - ' + c.toString()) + ')²'));
  out.answer.push(sq.join(' + ') + ' = ' + r2.toString() + '   (centre ' + g3Show(C) + ', radius ' + g3Rad(r2) + ')');
  const term = (c, nm) => (c.isZero() ? '' : (c.sign() < 0 ? ' - ' : ' + ') + (c.abs().eq(Q1) ? '' : c.abs().toString()) + nm);
  out.work.push('expanded: x² + y² + z²' + term(lin[0], 'x') + term(lin[1], 'y') + term(lin[2], 'z') + (G.isZero() ? '' : (G.sign() < 0 ? ' - ' : ' + ') + G.abs().toString()) + ' = 0');
  out.work.push('volume = (4/3)π r³ = ' + fmtNum((4 / 3) * Math.PI * Math.pow(r2.toNumber(), 1.5)) + ',  surface area = 4π r² = ' + fmtNum(4 * Math.PI * r2.toNumber()));
  return g3Out(out);
}
// sphere(r) is the volume / surface area command of the geometry module; with a point it is the equation of a sphere
const g3OldSphere = COMMANDS.sphere;
defCmd('sphere', (n) => {
  if (n.args.length >= 2 || (n.args[0] && n.args[0].t === 'list')) {
    const out = newOut();
    g3Sphere(n.args.map(evalMat), n, out);
    return out;
  }
  return g3OldSphere(n);
}, true);
COMMANDS.sphere.show = g3OldSphere.show;

// ---- quadric surfaces ------------------------------------------------------------------------------------------------------------------------
/** { pos, neg, zero } eigenvalue signs of a symmetric rational matrix (exact, from the characteristic polynomial). */
function g3Inertia(A) {
  const nn = A.length;
  const c = charPoly(A);
  let zero = 0;
  while (zero < nn && c[zero].isZero()) zero++;
  return { pos: la2SignChanges(c), neg: la2SignChanges(c.map((q, i) => (i % 2 ? q.neg() : q))), zero };
}
/** The quadratic form of lhs - rhs in x, y, z: { A, b, c } with f = v'Av + b.v + c, or null when it is not a polynomial of degree <= 2. */
function surfaceCoefficients(eq) {
  const vars = ['x', 'y', 'z'];
  const dom = [];
  const F = (vals) => {
    const env = new Map(vars.map((name, j) => [name, rfConst(vals[j])]));
    return rfConstQ(rfSub(evalRF(eq.lhs, env, dom), evalRF(eq.rhs, env, dom)));
  };
  const e = (i) => vars.map((_, j) => (i === j ? Q1 : Q0));
  const half = new Q(1n, 2n);
  try {
    const c = F(vars.map(() => Q0));
    const A = [[Q0, Q0, Q0], [Q0, Q0, Q0], [Q0, Q0, Q0]];
    const b = [Q0, Q0, Q0];
    for (let i = 0; i < 3; i++) {
      const fp = F(e(i));
      const fm = F(e(i).map((q) => q.neg()));
      A[i][i] = fp.add(fm).mul(half).sub(c);
      b[i] = fp.sub(fm).mul(half);
    }
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) {
        const ee = e(i).map((q, k) => q.add(e(j)[k]));
        const cross = F(ee).sub(F(e(i))).sub(F(e(j))).add(c);
        A[i][j] = cross.mul(half);
        A[j][i] = A[i][j];
      }
    }
    // verify that the quadratic model reproduces the polynomial (degree <= 2)
    const tests = [[2, 5, -3], [-1, 4, 7], [3, -2, 1], [-5, -3, 6]];
    for (const t of tests) {
      const v = t.map((x, k) => new Q(BigInt(x), BigInt(1 + k)));
      let model = c;
      v.forEach((vi, i) => {
        model = model.add(b[i].mul(vi));
        v.forEach((vj, j) => { model = model.add(A[i][j].mul(vi).mul(vj)); });
      });
      if (!F(v).eq(model)) return null;
    }
    return { A, b, c };
  } catch (err) {
    if (err instanceof NotAlgebraic || err instanceof MathError) return null;
    throw err;
  }
}
/** Classification of  v'Av + b.v + c = 0:  { name, center, detail }  (exact). */
function classifyQuadric(A, b, c) {
  const { pos, neg } = g3Inertia(A);
  const r = pos + neg;
  const half = new Q(1n, 2n);
  const bq = b.map((q) => q.mul(half));
  const res = { rank: r, pos, neg, center: null, std: null };
  if (r === 0) {
    res.name = b.every((q) => q.isZero()) ? (c.isZero() ? 'the whole space' : 'no points') : 'a plane (the equation is linear)';
    return res;
  }
  const diagonal = A.every((row, i) => row.every((v, j) => i === j || v.isZero()));
  if (r === 3) {
    const v0 = mMul(mInv(A), bq.map((q) => [q])).map((row) => row[0].neg());
    const k = c.sub(dotQ(v0, mMul(A, v0.map((q) => [q])).map((row) => row[0])));
    res.center = v0;
    res.k = k;
    const s = k.neg();
    const eff = k.isZero() ? [pos, neg] : s.sign() > 0 ? [pos, neg] : [neg, pos];
    if (k.isZero()) {
      res.name = pos === 3 || neg === 3 ? 'a single point (the centre)' : 'elliptic cone';
    } else if (eff[0] === 3) {
      res.name = A.every((row, i) => row.every((v, j) => (i === j ? v.eq(A[0][0]) : v.isZero()))) ? 'sphere' : 'ellipsoid';
    } else if (eff[0] === 2) res.name = 'hyperboloid of one sheet';
    else if (eff[0] === 1) res.name = 'hyperboloid of two sheets';
    else res.name = 'no real points (an imaginary ellipsoid)';
    if (diagonal) {
      const nm = ['x', 'y', 'z'];
      const shifted = nm.map((v, i) => (v0[i].isZero() ? v : '(' + v + (v0[i].sign() < 0 ? ' + ' + v0[i].neg().toString() : ' - ' + v0[i].toString()) + ')'));
      if (k.isZero()) {
        res.std = A.map((row, i) => row[i]).map((lam, i) => (lam.sign() < 0 ? '- ' : '+ ') + (lam.abs().eq(Q1) ? '' : lam.abs().toString()) + shifted[i] + '²').join(' ').replace(/^\+ /, '') + ' = 0';
      } else {
        res.std = A.map((row, i) => {
          const w = row[i].div(s);
          const den = w.abs().inv();
          return (w.sign() < 0 ? '- ' : '+ ') + shifted[i] + '²' + (den.eq(Q1) ? '' : '/' + den.toString());
        }).join(' ').replace(/^\+ /, '') + ' = 1';
      }
    }
    return res;
  }
  if (r === 2) {
    const nullv = mNullspace(A)[0];
    const bn = dotQ(bq, nullv);
    if (!bn.isZero()) {
      res.name = pos === 1 && neg === 1 ? 'hyperbolic paraboloid' : 'elliptic paraboloid';
      return res;
    }
    // b lies in the range of A: shift to the centre line
    const aug = A.map((row, i) => row.concat([bq[i].neg()]));
    const { R, pivots } = mRref(aug);
    const v0 = [Q0, Q0, Q0];
    pivots.forEach((pc, i) => { v0[pc] = R[i][3]; });
    const k = c.sub(dotQ(v0, mMul(A, v0.map((q) => [q])).map((row) => row[0])));
    const s = k.neg();
    res.k = k;
    if (k.isZero()) res.name = pos === 1 && neg === 1 ? 'a pair of intersecting planes' : 'a line';
    else {
      const eff = s.sign() > 0 ? [pos, neg] : [neg, pos];
      res.name = eff[0] === 2 ? 'elliptic cylinder' : eff[0] === 1 ? 'hyperbolic cylinder' : 'no real points (an imaginary cylinder)';
    }
    return res;
  }
  // rank 1
  const nulls = mNullspace(A);
  const i0 = A.findIndex((row, i) => !row[i].isZero());
  const nu = A[i0];
  const beta = nu[0].isZero() ? (nu[1].isZero() ? bq[2].div(nu[2]) : bq[1].div(nu[1])) : bq[0].div(nu[0]);
  const inRange = bq.every((q, i) => q.eq(beta.mul(nu[i])));
  void nulls;
  if (!inRange) {
    res.name = 'parabolic cylinder';
    return res;
  }
  // f = (1/A_ii) u^2 + 2 beta u + c with u = nu.v
  const lam = A[i0][i0].inv();
  const disc = beta.mul(beta).sub(lam.mul(c));
  res.name = disc.sign() > 0 ? 'a pair of parallel planes' : disc.isZero() ? 'a single plane (counted twice)' : 'no real points';
  return res;
}
defMat('quadric surface sphereinfo', (args, n, out) => {
  const A = needMat(args[0], 'quadric');
  const b = flat(args[1]);
  const c = args[2].t === 'num' ? args[2].q : (() => { throw new MathError('the constant term must be a number'); })();
  if (A.length !== 3 || A[0].length !== 3 || b.length !== 3) throw new MathError('quadric needs a 3×3 symmetric matrix, a vector of three linear coefficients and a constant: quadric([[1,0,0],[0,1,0],[0,0,1]], [-2,4,-6], -11)');
  if (!la2IsSymmetric(A)) throw new MathError('the matrix of the quadratic terms must be symmetric');
  const res = classifyQuadric(A, b, c);
  out.answer.push('surface: ' + res.name);
  if (res.center) out.work.push('centre ' + g3Show(res.center));
  if (res.name === 'sphere') {
    const r2 = res.k.neg().div(A[0][0]);
    out.answer.push('centre ' + g3Show(res.center) + ', radius ' + g3Rad(r2));
  }
  if (res.std) out.work.push('standard form: ' + res.std);
  const e = polyRoots(charPoly(A));
  out.work.push('quadratic part: ' + res.pos + ' positive, ' + res.neg + ' negative and ' + (3 - res.rank) + ' zero eigenvalues' + (e.complex.length === 0 ? ' (λ = ' + e.real.map((r) => r.text + (r.mult > 1 ? '×' + r.mult : '')).join(', ') + ')' : ''));
  return g3Out(out);
}, [3, 'the matrix of the quadratic terms, the linear coefficients and the constant']);
/** Hook for solveProblem: a single equation in exactly x, y, z (a plane or a quadric surface). */
function analyzeSurface(eq, out) {
  const co = surfaceCoefficients(eq);
  if (!co) return false;
  const quad = co.A.some((row) => row.some((v) => !v.isZero()));
  if (!quad) {
    const p = co.b.concat([co.c.neg()]);
    if (co.b.every((q) => q.isZero())) return false;
    out.work.push('Type: linear equation in x, y, z: a plane in space');
    const q = g3NormPlane(p);
    out.answer.push('plane ' + g3PlaneText(q));
    out.work.push('normal vector ' + g3Show(q.slice(0, 3)) + ', length ' + g3Len(q.slice(0, 3)) + ';  distance from the origin ' + g3Ratio(q[3].sign() < 0 ? q[3].neg() : q[3], dotQ(q.slice(0, 3), q.slice(0, 3))));
    const ic = ['x', 'y', 'z'].map((nm, i) => (q[i].isZero() ? null : nm + '-intercept ' + q[3].div(q[i]).toString())).filter(Boolean);
    out.work.push(ic.join(', '));
    const k = q[2].isZero() ? (q[1].isZero() ? 0 : 1) : 2;
    const nm = ['x', 'y', 'z'];
    out.work.push('solved for ' + nm[k] + ': ' + nm[k] + ' = ' + linText(q[3].div(q[k]), [0, 1, 2].filter((i) => i !== k).map((i) => [q[i].neg().div(q[k]), nm[i]])));
    return true;
  }
  const res = classifyQuadric(co.A, co.b, co.c);
  out.work.push('Type: second-degree equation in x, y, z: a quadric surface');
  out.answer.push('surface: ' + res.name);
  if (res.name === 'sphere') out.answer.push('centre ' + g3Show(res.center) + ', radius ' + g3Rad(res.k.neg().div(co.A[0][0])));
  else if (res.center) out.work.push('centre ' + g3Show(res.center));
  if (res.std) out.work.push('standard form: ' + res.std);
  out.work.push('quadratic part: ' + res.pos + ' positive, ' + res.neg + ' negative and ' + (3 - res.rank) + ' zero eigenvalues');
  return true;
}

// ---- text pre-pass: equations of planes and surfaces written as arguments ----------------------------------------------------------
function g3SplitArgs(inner) {
  const parts = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(inner.slice(from, i));
      from = i + 1;
    }
  }
  parts.push(inner.slice(from));
  return parts;
}
function convertGeometry3d(s) {
  if (!/=/.test(s) || !/[xyz]/.test(s)) return s;
  const planeCmds = ['plane', 'planeinfo', 'pointplane', 'planedist', 'lineplane', 'planeangle', 'planeintersect'];
  const surfCmds = ['quadric', 'surface', 'sphereinfo', 'sphere'];
  const asPlane = (arg) => {
    if (!/=/.test(arg) || /\[/.test(arg)) return null;
    let st;
    try {
      st = parseStatement(cleanStatement(arg));
    } catch (e) {
      return null;
    }
    if (st.kind !== 'eq') return null;
    const form = affineForm(st, ['x', 'y', 'z']);
    if (!form) return null;
    return '[' + form.coef.map((q) => q.toString()).join(', ') + ', ' + form.c0.neg().toString() + ']';
  };
  s = replaceCalls(s, planeCmds, (name, inner) => {
    const parts = g3SplitArgs(inner);
    let changed = false;
    const conv = parts.map((p) => {
      const r = asPlane(p);
      if (r) changed = true;
      return r || p;
    });
    return changed ? name + '(' + conv.join(',') + ')' : null;
  });
  s = replaceCalls(s, surfCmds, (name, inner) => {
    const parts = g3SplitArgs(inner);
    if (parts.length !== 1 || !/=/.test(parts[0]) || /\[/.test(parts[0])) return null;
    let st;
    try {
      st = parseStatement(cleanStatement(parts[0]));
    } catch (e) {
      return null;
    }
    if (st.kind !== 'eq') return null;
    const co = surfaceCoefficients(st);
    if (!co) throw new MathError('this is not an equation of degree at most 2 in x, y and z');
    return 'quadric([' + co.A.map((row) => '[' + row.map((q) => q.toString()).join(', ') + ']').join(', ') + '], [' + co.b.map((q) => q.toString()).join(', ') + '], ' + co.c.toString() + ')';
  });
  return s;
}
