// ======================================================================
// 13a. Geometry: shapes, triangles, coordinates, conic sections
//      Lengths are exact where possible (pi and square roots stay symbolic).
// ======================================================================
const degToRad = (d) => sMul([d, S_PI, sN(new Q(1n, 180n))]);
const radToDeg = (r) => numS(r, {}) * (180 / Math.PI);

/** value of an argument as an exact expression with no unknown letters */
function geoVal(node) {
  const S = fromAst(node);
  if (varsOfS(S).size) throw new MathError('numbers are needed here, not letters');
  return S;
}
function geoArgs(n) {
  const pos = [];
  const named = new Map();
  n.args.forEach((a) => {
    if (a.t === 'named') named.set(a.name, a.a);
    else pos.push(a);
  });
  return { pos, named };
}
const positiveS = (S, what) => {
  if (!(numS(S, {}) > 0)) throw new MathError(what + ' must be positive');
  return S;
};
function line(out, label, S) {
  out.answer.push(label + ' = ' + symText(simp(S)));
}
/** Shape command:  spec.params = names in positional order; spec.alt = {name: (S) => value of the main param}. */
function shapeCmd(names, usage, params, alt, compute, note) {
  defCmd(names, (n) => {
    const { pos, named } = geoArgs(n);
    const vals = {};
    pos.forEach((a, k) => {
      if (k >= params.length) throw new MathError(n.fn + '(' + params.join(', ') + ') takes at most ' + params.length + ' numbers');
      vals[params[k]] = positiveS(geoVal(a), params[k]);
    });
    named.forEach((a, name) => {
      const v = geoVal(a);
      if (params.includes(name)) vals[name] = positiveS(v, name);
      else if (alt && alt[name]) {
        const r = positiveS(alt[name](v), name);
        vals[params[0]] = r;
      } else throw new MathError(n.fn + ': unknown name "' + name + '" (use ' + params.concat(Object.keys(alt || {})).join(', ') + ')');
    });
    params.forEach((p) => {
      if (!vals[p]) throw new MathError(n.fn + ' needs ' + usage);
    });
    const out = newOut();
    compute(vals, out);
    if (note) out.work.push(note);
    return out;
  });
}
const sq = (x) => sPow(x, sI(2));
const cube = (x) => sPow(x, sI(3));
const piTimes = (...f) => sMul([S_PI, ...f]);
const frac = (a, b) => sN(new Q(BigInt(a), BigInt(b)));

shapeCmd('circle', 'the radius r', ['r'], {
  d: (v) => sDiv(v, sI(2)),
  C: (v) => sDiv(v, sMul([sI(2), S_PI])),
  A: (v) => sSqrt(sDiv(v, S_PI)),
}, ({ r }, out) => {
  line(out, 'area', piTimes(sq(r)));
  line(out, 'circumference', sMul([sI(2), S_PI, r]));
  line(out, 'diameter', sMul([sI(2), r]));
}, 'A = πr²,  C = 2πr');
shapeCmd('sphere', 'the radius r', ['r'], {
  d: (v) => sDiv(v, sI(2)),
  V: (v) => sPow(sDiv(sMul([sI(3), v]), sMul([sI(4), S_PI])), frac(1, 3)),
  A: (v) => sSqrt(sDiv(v, sMul([sI(4), S_PI]))),
}, ({ r }, out) => {
  line(out, 'volume', sMul([frac(4, 3), S_PI, cube(r)]));
  line(out, 'surface area', sMul([sI(4), S_PI, sq(r)]));
}, 'V = (4/3)πr³,  A = 4πr²');
shapeCmd('cylinder', 'the radius r and the height h', ['r', 'h'], null, ({ r, h }, out) => {
  line(out, 'volume', piTimes(sq(r), h));
  line(out, 'lateral surface', sMul([sI(2), S_PI, r, h]));
  line(out, 'total surface', sMul([sI(2), S_PI, r, sAdd([r, h])]));
}, 'V = πr²h,  lateral = 2πrh,  total = 2πr(r + h)');
shapeCmd('cone', 'the radius r and the height h', ['r', 'h'], null, ({ r, h }, out) => {
  const slant = sSqrt(sAdd([sq(r), sq(h)]));
  line(out, 'volume', sMul([frac(1, 3), S_PI, sq(r), h]));
  line(out, 'slant height', slant);
  line(out, 'lateral surface', sMul([S_PI, r, slant]));
  line(out, 'total surface', sMul([S_PI, r, sAdd([r, slant])]));
}, 'V = (1/3)πr²h,  slant = √(r² + h²)');
shapeCmd('box cuboid', 'the length, width and height', ['l', 'w', 'h'], null, ({ l, w, h }, out) => {
  line(out, 'volume', sMul([l, w, h]));
  line(out, 'surface area', sMul([sI(2), sAdd([sMul([l, w]), sMul([l, h]), sMul([w, h])])]));
  line(out, 'space diagonal', sSqrt(sAdd([sq(l), sq(w), sq(h)])));
});
shapeCmd('cube', 'the side s', ['s'], {
  V: (v) => sPow(v, frac(1, 3)),
}, ({ s }, out) => {
  line(out, 'volume', cube(s));
  line(out, 'surface area', sMul([sI(6), sq(s)]));
  line(out, 'space diagonal', sMul([s, sSqrt(sI(3))]));
});
shapeCmd('pyramid', 'the base area B and the height h', ['B', 'h'], null, ({ B, h }, out) => {
  line(out, 'volume', sMul([frac(1, 3), B, h]));
}, 'V = (1/3)·B·h');
shapeCmd('rectangle', 'the width and height', ['w', 'h'], null, ({ w, h }, out) => {
  line(out, 'area', sMul([w, h]));
  line(out, 'perimeter', sMul([sI(2), sAdd([w, h])]));
  line(out, 'diagonal', sSqrt(sAdd([sq(w), sq(h)])));
});
shapeCmd('square', 'the side s', ['s'], {
  d: (v) => sDiv(v, sSqrt(sI(2))),
  A: (v) => sSqrt(v),
  P: (v) => sDiv(v, sI(4)),
}, ({ s }, out) => {
  line(out, 'area', sq(s));
  line(out, 'perimeter', sMul([sI(4), s]));
  line(out, 'diagonal', sMul([s, sSqrt(sI(2))]));
});
shapeCmd('trapezoid trapezium', 'the two parallel sides a, b and the height h', ['a', 'b', 'h'], null, ({ a, b, h }, out) => {
  line(out, 'area', sMul([frac(1, 2), sAdd([a, b]), h]));
}, 'A = (a + b)/2 · h');
shapeCmd('parallelogram', 'the base and the height', ['b', 'h'], null, ({ b, h }, out) => {
  line(out, 'area', sMul([b, h]));
});
shapeCmd('rhombus', 'the two diagonals p and q', ['p', 'q'], null, ({ p, q }, out) => {
  line(out, 'area', sMul([frac(1, 2), p, q]));
  const side = sSqrt(sAdd([sq(sDiv(p, sI(2))), sq(sDiv(q, sI(2)))]));
  line(out, 'side', side);
  line(out, 'perimeter', sMul([sI(4), side]));
});
shapeCmd('ellipsearea ellipse', 'the semi-axes a and b', ['a', 'b'], null, ({ a, b }, out) => {
  line(out, 'area', piTimes(a, b));
  const A = numS(a, {});
  const B = numS(b, {});
  const h = ((A - B) / (A + B)) ** 2;
  out.answer.push('perimeter ≈ ' + fmtNum(Math.PI * (A + B) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)))) + '  (Ramanujan approximation)');
}, 'A = πab');
shapeCmd('sector', 'the radius r and the angle in degrees', ['r', 'theta'], null, ({ r, theta }, out) => {
  const ang = numS(theta, {}) > 0 && varsOfS(theta).size === 0 && theta.k === 'n' ? degToRad(theta) : theta;
  line(out, 'arc length', sMul([r, ang]));
  line(out, 'sector area', sMul([frac(1, 2), sq(r), ang]));
  out.work.push('angle used: ' + symText(simp(ang)) + ' rad  (a plain number is read as degrees)');
});
defCmd('polygon regularpolygon', (n) => {
  const { pos } = geoArgs(n);
  if (pos.length !== 2) throw new MathError('polygon(n, s) needs the number of sides and the side length');
  const sides = Number(intArg(pos[0]));
  if (sides < 3 || sides > 1000) throw new MathError('a polygon has 3 to 1000 sides');
  const s = positiveS(geoVal(pos[1]), 'the side');
  const out = newOut();
  const ap = numS(s, {}) / (2 * Math.tan(Math.PI / sides));
  const area = (sides * numS(s, {}) * ap) / 2;
  out.answer.push('perimeter = ' + symText(simp(sMul([sI(sides), s]))));
  out.answer.push('area ≈ ' + fmtNum(area));
  out.answer.push('each interior angle = ' + fmtNum(((sides - 2) * 180) / sides) + '°  (sum of interior angles = ' + (sides - 2) * 180 + '°)');
  out.work.push('A = n s² / (4 tan(π/n));  apothem ≈ ' + fmtNum(ap));
  return out;
});
defCmd('hypotenuse', (n) => {
  needArgs(n, 2, 2, 'the two legs');
  const [a, b] = n.args.map(geoVal);
  const out = newOut();
  line(out, 'c', sSqrt(sAdd([sq(a), sq(b)])));
  out.work.push('c = √(a² + b²)');
  return out;
});
defCmd('leg', (n) => {
  needArgs(n, 2, 2, 'the hypotenuse and the other leg');
  const [c, a] = n.args.map(geoVal);
  if (!(numS(c, {}) > numS(a, {}))) throw new MathError('the hypotenuse must be longer than a leg');
  const out = newOut();
  line(out, 'b', sSqrt(sSub(sq(c), sq(a))));
  out.work.push('b = √(c² − a²)');
  return out;
});

// ---- coordinates ------------------------------------------------------------------------------------------------------------
function pointOf(node, dim) {
  if (node.t !== 'list') throw new MathError('points are written [x, y], e.g. [1, 2]');
  const v = node.items.map(geoVal);
  if (dim && v.length !== dim) throw new MathError('this needs points with ' + dim + ' coordinates');
  return v;
}
const wrapNum = (S) => { const t = exactText(S); return /^-?[0-9a-zA-Zπ.]+$/.test(t) && !t.startsWith('-') ? t : '(' + t + ')'; };
const exactText = (S) => fmtS(simp(S));
function ptText(p) {
  const t = '(' + p.map(exactText).join(', ') + ')';
  return p.some((c) => simp(c).k !== 'n') ? t + ' ≈ (' + p.map((c) => fmtNum(numS(c, {}))).join(', ') + ')' : t;
}
const shiftText = (v, q) => (q.isZero() ? v : v + (q.sign() > 0 ? ' - ' + q.toString() : ' + ' + q.neg().toString()));
const wrapCoef = (q) => (q.isInt() ? q.toString() : '(' + q.toString() + ')');
function twoPoints(n) {
  if (n.args.length === 4 && n.args.every((a) => a.t !== 'list')) return [n.args.slice(0, 2).map(geoVal), n.args.slice(2).map(geoVal)];
  needArgs(n, 2, 2, 'two points, e.g. [1, 2], [4, 6]');
  const p = pointOf(n.args[0]);
  const q = pointOf(n.args[1]);
  if (p.length !== q.length) throw new MathError('the points must have the same number of coordinates');
  return [p, q];
}
defCmd('distance dist', (n) => {
  const [p, q] = twoPoints(n);
  const out = newOut();
  const d = sSqrt(sAdd(p.map((c, k) => sq(sSub(q[k], c)))));
  line(out, 'distance', d);
  out.work.push('d = √(Σ (differences)²) between ' + ptText(p) + ' and ' + ptText(q));
  out.value = { S: simp(d) };
  return out;
});
defCmd('midpoint', (n) => {
  const [p, q] = twoPoints(n);
  const out = newOut();
  out.answer.push('midpoint = ' + ptText(p.map((c, k) => simp(sDiv(sAdd([c, q[k]]), sI(2))))));
  return out;
});
defCmd('slope gradient', (n) => {
  const [p, q] = twoPoints(n);
  if (p.length !== 2) throw new MathError('slope needs 2D points');
  const dx = simp(sSub(q[0], p[0]));
  const dy = simp(sSub(q[1], p[1]));
  const out = newOut();
  if (zeroS(dx)) {
    out.answer.push('slope is undefined (vertical line x = ' + symText(p[0]) + ')');
    return out;
  }
  const m = simp(sDiv(dy, dx));
  line(out, 'slope m', m);
  out.work.push('m = (y₂ − y₁)/(x₂ − x₁) = (' + symText(dy) + ')/(' + symText(dx) + ')');
  out.value = { S: m };
  return out;
});
defCmd('line lineequation', (n) => {
  const [p, q] = twoPoints(n);
  if (p.length !== 2) throw new MathError('line needs 2D points');
  const dx = simp(sSub(q[0], p[0]));
  const dy = simp(sSub(q[1], p[1]));
  const out = newOut();
  if (zeroS(dx) && zeroS(dy)) throw new MathError('the two points are the same');
  if (zeroS(dx)) {
    out.answer.push('x = ' + symText(p[0]));
    return out;
  }
  const m = simp(sDiv(dy, dx));
  const b = simp(sSub(p[1], sMul([m, p[0]])));
  const x = sV('x');
  out.answer.push('y = ' + fmtS(simp(sAdd([sMul([m, x]), b]))));
  out.answer.push('point-slope form: y − ' + wrapNum(p[1]) + ' = ' + wrapNum(m) + '·(x − ' + wrapNum(p[0]) + ')');
  if (m.k === 'n' && b.k === 'n') {
    const lc = [m.q.d, b.q.d].reduce((acc, c) => (acc * c) / bgcd(acc, c), 1n);
    let A = m.q.neg().mul(new Q(lc)).n;
    let B = lc;
    let C = b.q.mul(new Q(lc)).n;
    const g = bgcd(bgcd(A, B), C) || 1n;
    A /= g;
    B /= g;
    C /= g;
    if (A < 0n || (A === 0n && B < 0n)) {
      A = -A;
      B = -B;
      C = -C;
    }
    out.answer.push('standard form: ' + fmtS(expandS(sAdd([sMul([sN(new Q(A)), x]), sMul([sN(new Q(B)), sV('y')])]))) + ' = ' + C);
  }
  return out;
});
defCmd('pointlinedistance distline', (n) => {
  needArgs(n, 5, 5, 'x0, y0 and a, b, c of the line ax + by + c = 0');
  const [x0, y0, a, b, c] = n.args.map(geoVal);
  const num = simp(sAdd([sMul([a, x0]), sMul([b, y0]), c]));
  const d = simp(sDiv(sFn('abs', [num]), sSqrt(sAdd([sq(a), sq(b)]))));
  const out = newOut();
  line(out, 'distance', d);
  out.work.push('d = |a·x₀ + b·y₀ + c| / √(a² + b²)');
  return out;
});
defCmd('polygonarea shoelace', (n) => {
  const pts = n.args.length === 1 && n.args[0].t === 'list' && n.args[0].items.every((x) => x.t === 'list') ? n.args[0].items.map((p) => pointOf(p, 2)) : n.args.map((p) => pointOf(p, 2));
  if (pts.length < 3) throw new MathError('a polygon needs at least 3 points');
  let s = S0;
  pts.forEach((p, k) => {
    const q = pts[(k + 1) % pts.length];
    s = sAdd([s, sSub(sMul([p[0], q[1]]), sMul([q[0], p[1]]))]);
  });
  const area = simp(sMul([frac(1, 2), sFn('abs', [simp(s)])]));
  const out = newOut();
  line(out, 'area', area);
  out.work.push('Shoelace formula: ½|Σ (xᵢ·yᵢ₊₁ − xᵢ₊₁·yᵢ)| over the vertices in order');
  out.value = { S: area };
  return out;
});
defCmd('centroid', (n) => {
  const pts = n.args.length === 1 && n.args[0].t === 'list' && n.args[0].items.every((x) => x.t === 'list') ? n.args[0].items.map((p) => pointOf(p)) : n.args.map((p) => pointOf(p));
  if (pts.length < 2) throw new MathError('give at least two points');
  const d = pts[0].length;
  const c = Array.from({ length: d }, (_, k) => simp(sDiv(sAdd(pts.map((p) => p[k])), sI(pts.length))));
  const out = newOut();
  out.answer.push('centroid = ' + ptText(c));
  return out;
});

// ---- triangles --------------------------------------------------------------------------------------------------------------------
const RAD = Math.PI / 180;
const fa = (x) => fmtNum(x);
function triangleReport(t, out, given) {
  const { a, b, c, A, B, C } = t;
  out.answer.push('sides: a = ' + fa(a) + ',  b = ' + fa(b) + ',  c = ' + fa(c));
  out.answer.push('angles: A = ' + fa(A / RAD) + '°,  B = ' + fa(B / RAD) + '°,  C = ' + fa(C / RAD) + '°');
  const s = (a + b + c) / 2;
  const area = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));
  out.answer.push('area ≈ ' + fa(area) + ',  perimeter = ' + fa(a + b + c));
  const big = Math.max(A, B, C);
  const kind = Math.abs(big - Math.PI / 2) < 1e-9 ? 'right' : big > Math.PI / 2 ? 'obtuse' : 'acute';
  const sides = Math.abs(a - b) < 1e-9 * a && Math.abs(b - c) < 1e-9 * a ? 'equilateral' : Math.abs(a - b) < 1e-9 * a || Math.abs(b - c) < 1e-9 * a || Math.abs(a - c) < 1e-9 * a ? 'isosceles' : 'scalene';
  out.work.push('Type: ' + kind + ', ' + sides + ' triangle');
  if (given) out.work.push(given);
  out.work.push('Angle sum check: ' + fa((A + B + C) / RAD) + '°;  area also = ½·a·b·sin C = ' + fa(0.5 * a * b * Math.sin(C)));
}
function trianglesFromParts(P) {
  // P: {a,b,c,A,B,C} with A,B,C in radians; returns a list of full solutions
  const sides = ['a', 'b', 'c'].filter((k) => P[k] !== undefined);
  const angs = ['A', 'B', 'C'].filter((k) => P[k] !== undefined);
  const opp = { a: 'A', b: 'B', c: 'C', A: 'a', B: 'b', C: 'c' };
  if (sides.length + angs.length !== 3) throw new MathError('give exactly three parts of the triangle (for example a=3, b=4, C=60), at least one of them a side');
  if (!sides.length) throw new MathError('three angles do not determine the size of a triangle; give at least one side');
  const full = (a, b, c) => {
    const A = Math.acos(Math.max(-1, Math.min(1, (b * b + c * c - a * a) / (2 * b * c))));
    const B = Math.acos(Math.max(-1, Math.min(1, (a * a + c * c - b * b) / (2 * a * c))));
    return { a, b, c, A, B, C: Math.PI - A - B };
  };
  const tri = (a, b, c) => a + b > c + 1e-12 * c && a + c > b + 1e-12 * b && b + c > a + 1e-12 * a;
  if (sides.length === 3) {
    if (!tri(P.a, P.b, P.c)) throw new MathError('these sides cannot form a triangle (the two shorter ones must add up to more than the longest)');
    return { kind: 'SSS', sols: [full(P.a, P.b, P.c)] };
  }
  if (sides.length === 2 && angs.length === 1) {
    const ang = angs[0];
    const third = ['a', 'b', 'c'].find((k) => !sides.includes(k));
    if (opp[ang] === third) {
      // SAS: the angle lies between the two given sides
      const [x, y] = sides.map((k) => P[k]);
      const z = Math.sqrt(x * x + y * y - 2 * x * y * Math.cos(P[ang]));
      const s3 = { ...P, [third]: z };
      return { kind: 'SAS', sols: [full(s3.a, s3.b, s3.c)] };
    }
    // SSA: the angle is opposite one of the given sides
    const known = opp[ang];
    const other = sides.find((k) => k !== known);
    const sinO = (P[other] * Math.sin(P[ang])) / P[known];
    const sols = [];
    if (sinO > 1 + 1e-12) return { kind: 'SSA', sols: [] };
    const O1 = Math.asin(Math.min(1, sinO));
    for (const O of Math.abs(sinO - 1) < 1e-12 ? [O1] : [O1, Math.PI - O1]) {
      const third2 = Math.PI - P[ang] - O;
      if (third2 <= 1e-12) continue;
      const k = P[known] / Math.sin(P[ang]);
      const T = { ...P };
      T[opp[other]] = O;
      const thirdAngle = ['A', 'B', 'C'].find((q) => T[q] === undefined);
      T[thirdAngle] = third2;
      T[opp[thirdAngle]] = k * Math.sin(third2);
      sols.push(full(T.a, T.b, T.c));
    }
    return { kind: 'SSA', sols };
  }
  // one side, two angles
  const T = { ...P };
  const third = ['A', 'B', 'C'].find((q) => T[q] === undefined);
  T[third] = Math.PI - angs.reduce((s, k) => s + P[k], 0);
  if (T[third] <= 1e-12) throw new MathError('the two angles add up to 180° or more');
  const k = P[sides[0]] / Math.sin(T[opp[sides[0]]]);
  ['a', 'b', 'c'].forEach((q) => { T[q] = k * Math.sin(T[opp[q]]); });
  return { kind: angs.includes(opp[sides[0]]) ? 'AAS' : 'ASA', sols: [full(T.a, T.b, T.c)] };
}
defCmd('triangle solvetriangle', (n) => {
  const { pos, named } = geoArgs(n);
  const P = {};
  if (pos.length === 3 && !named.size) pos.forEach((a, k) => { P['abc'[k]] = numArg(a); });
  else if (pos.length === 2 && !named.size) {
    const out = newOut();
    const [b, h] = pos.map(geoVal);
    line(out, 'area', sMul([frac(1, 2), b, h]));
    out.work.push('Two numbers are read as base and height. For a triangle with sides use triangle(a, b, c); with named parts: triangle(a=3, b=4, C=60).');
    return out;
  } else if (pos.length) throw new MathError('use either triangle(a, b, c) or named parts like triangle(a=3, b=4, C=60)');
  named.forEach((node, name) => {
    if (!/^[abcABC]$/.test(name)) throw new MathError('the parts are a, b, c (sides) and A, B, C (angles in degrees); "' + name + '" is not one of them');
    const S = fromAst(node);
    const hasPi = Array.from([S]).some((e) => key(e).includes('pi'));
    let v = numS(S, {});
    if (!(v > 0)) throw new MathError(name + ' must be positive');
    if (/[ABC]/.test(name)) v = hasPi ? v : v * RAD;
    P[name] = v;
  });
  Object.values(P).forEach((v) => { if (!isFinite(v)) throw new MathError('numbers are needed'); });
  const { kind, sols } = trianglesFromParts(P);
  const out = newOut();
  if (!sols.length) {
    out.answer.push('no triangle exists with these measurements');
    return out;
  }
  sols.forEach((t, k) => {
    if (sols.length > 1) out.answer.push('Solution ' + (k + 1) + ':');
    triangleReport(t, out, k === 0 ? 'Case ' + kind + (kind === 'SSA' ? ' (ambiguous case: ' + sols.length + ' triangle' + (sols.length > 1 ? 's' : '') + ')' : '') : '');
  });
  out.work.push('Used the law of cosines (c² = a² + b² − 2ab cos C) and the law of sines (a/sin A = b/sin B = c/sin C)');
  return out;
});
defCmd('righttriangle rtriangle', (n) => {
  const { pos, named } = geoArgs(n);
  if (pos.length === 2 && !named.size) {
    named.set('a', pos[0]);
    named.set('b', pos[1]);
  } else if (pos.length) throw new MathError('use righttriangle(a=3, b=4)  (legs a, b; hypotenuse c; acute angles A, B in degrees)');
  const P = {};
  named.forEach((node, name) => {
    if (!/^[abcAB]$/.test(name)) throw new MathError('the parts are a, b (legs), c (hypotenuse), A, B (acute angles in degrees)');
    const S = fromAst(node);
    let v = numS(S, {});
    if (/[AB]/.test(name) && !key(S).includes('pi')) v *= RAD;
    P[name] = v;
  });
  if (Object.keys(P).length !== 2) throw new MathError('give exactly two parts of the right triangle (the right angle is C = 90°)');
  const T = { ...P };
  if (T.A !== undefined && T.B === undefined && T.a === undefined && T.b === undefined && T.c === undefined) throw new MathError('give at least one side');
  if (T.A !== undefined) T.B = Math.PI / 2 - T.A;
  else if (T.B !== undefined) T.A = Math.PI / 2 - T.B;
  if (T.a !== undefined && T.b !== undefined) T.c = Math.hypot(T.a, T.b);
  else if (T.c !== undefined && T.a !== undefined) T.b = Math.sqrt(T.c * T.c - T.a * T.a);
  else if (T.c !== undefined && T.b !== undefined) T.a = Math.sqrt(T.c * T.c - T.b * T.b);
  else if (T.c !== undefined && T.A !== undefined) { T.a = T.c * Math.sin(T.A); T.b = T.c * Math.cos(T.A); }
  else if (T.a !== undefined && T.A !== undefined) { T.c = T.a / Math.sin(T.A); T.b = T.a / Math.tan(T.A); }
  else if (T.b !== undefined && T.A !== undefined) { T.c = T.b / Math.cos(T.A); T.a = T.b * Math.tan(T.A); }
  if (T.A === undefined) T.A = Math.atan2(T.a, T.b);
  if (T.B === undefined) T.B = Math.PI / 2 - T.A;
  if (![T.a, T.b, T.c].every((v) => isFinite(v) && v > 0)) throw new MathError('these measurements do not give a right triangle');
  const out = newOut();
  triangleReport({ a: T.a, b: T.b, c: T.c, A: T.A, B: T.B, C: Math.PI / 2 }, out, 'Right angle at C;  c² = a² + b²');
  return out;
});

// ---- conic sections -----------------------------------------------------------------------------------------------------------
/** Second-degree equation in x and y:  returns {A,B,C,D,E,F} (rationals) or null. */
function conicCoefficients(L, R) {
  const E = expandS(sSub(fromAst(L), fromAst(R)));
  const vs = varsOfS(E);
  if (vs.size !== 2 || !vs.has('x') || !vs.has('y')) return null;
  const cx = polyCoeffsS(E, 'x');
  if (!cx || cx.length > 3) return null;
  const co = {};
  for (let i = 0; i < cx.length; i++) {
    const cy = polyCoeffsS(cx[i], 'y');
    if (!cy || cy.length > 3 - i) return null;
    if (cy.some((c) => c.k !== 'n')) return null;
    cy.forEach((c, j) => { co[i + ',' + j] = c.q; });
  }
  const g = (i, j) => co[i + ',' + j] || Q0;
  const r = { A: g(2, 0), B: g(1, 1), C: g(0, 2), D: g(1, 0), E: g(0, 1), F: g(0, 0) };
  if (r.A.isZero() && r.B.isZero() && r.C.isZero()) return null;
  return r;
}
const qS = (q) => sN(q);
const showPoint = (px, py) => ptText([px, py]);
function analyzeConic(cf, out) {
  const { A, B, C, D, E, F } = cf;
  const two = qInt(2);
  const four = qInt(4);
  const disc = B.mul(B).sub(four.mul(A).mul(C));
  const polyText2 = fmtS(expandS(sAdd([sMul([qS(A), sq(sV('x'))]), sMul([qS(B), sV('x'), sV('y')]), sMul([qS(C), sq(sV('y'))]), sMul([qS(D), sV('x')]), sMul([qS(E), sV('y')]), qS(F)])));
  out.work.push('General form: ' + polyText2 + ' = 0   (A=' + A + ', B=' + B + ', C=' + C + ', D=' + D + ', E=' + E + ', F=' + F + ')');
  if (!B.isZero()) {
    const kind = disc.sign() < 0 ? 'ellipse (or circle)' : disc.sign() > 0 ? 'hyperbola' : 'parabola';
    out.answer.push('type: ' + kind + ' (rotated: the xy term is present; B² − 4AC = ' + disc + ')');
    const th = 0.5 * Math.atan2(B.toNumber(), A.sub(C).toNumber());
    out.answer.push('rotate the axes by θ = ½·atan2(B, A − C) ≈ ' + fmtNum((th * 180) / Math.PI) + '° to remove the xy term');
    return;
  }
  const sx = (A.isZero() ? null : A);
  const sy = (C.isZero() ? null : C);
  const x = sV('x');
  const y = sV('y');
  if (sx && sy) {
    const h = D.neg().div(two.mul(A));
    const k = E.neg().div(two.mul(C));
    const RHS = A.mul(h).mul(h).add(C.mul(k).mul(k)).sub(F);
    const hk = showPoint(qS(h), qS(k));
    const sqX = sPow(sSub(x, qS(h)), sI(2));
    const sqY = sPow(sSub(y, qS(k)), sI(2));
    if (A.sign() === C.sign()) {
      if (RHS.isZero()) {
        out.answer.push('type: a single point ' + hk);
        return;
      }
      if (RHS.sign() !== A.sign()) {
        out.answer.push('type: no real points (the right-hand side of the standard form would be negative)');
        return;
      }
      const a2 = RHS.div(A);
      const b2 = RHS.div(C);
      const std = fmtS(simp(sAdd([sDiv(sqX, qS(a2)), sDiv(sqY, qS(b2))]))) + ' = 1';
      if (a2.eq(b2)) {
        out.answer.push('type: circle');
        out.answer.push('center = ' + hk + ',  radius = ' + symText(simp(sSqrt(qS(a2)))));
        out.answer.push('standard form: ' + fmtS(simp(sAdd([sqX, sqY]))) + ' = ' + a2.toString());
        out.work.push('Completed the square in x and in y');
        return;
      }
      const horizontal = a2.sub(b2).sign() > 0;
      const big = horizontal ? a2 : b2;
      const small = horizontal ? b2 : a2;
      const cc = big.sub(small);
      out.answer.push('type: ellipse');
      out.answer.push('standard form: ' + std);
      out.answer.push('center = ' + hk + ',  semi-axes: a = ' + symText(simp(sSqrt(qS(big)))) + ' (major), b = ' + symText(simp(sSqrt(qS(small)))) + ' (minor)');
      const cS = simp(sSqrt(qS(cc)));
      out.answer.push('foci = ' + (horizontal ? showPoint(sSub(qS(h), cS), qS(k)) + ' and ' + showPoint(sAdd([qS(h), cS]), qS(k)) : showPoint(qS(h), sSub(qS(k), cS)) + ' and ' + showPoint(qS(h), sAdd([qS(k), cS]))));
      out.answer.push('vertices = ' + (horizontal ? showPoint(sSub(qS(h), sSqrt(qS(big))), qS(k)) + ' and ' + showPoint(sAdd([qS(h), sSqrt(qS(big))]), qS(k)) : showPoint(qS(h), sSub(qS(k), sSqrt(qS(big)))) + ' and ' + showPoint(qS(h), sAdd([qS(k), sSqrt(qS(big))]))));
      out.answer.push('eccentricity e = c/a = ' + symText(simp(sDiv(cS, sSqrt(qS(big))))) + ',  area = ' + symText(simp(sMul([S_PI, sSqrt(qS(big)), sSqrt(qS(small))]))));
      return;
    }
    if (RHS.isZero()) {
      out.answer.push('type: a pair of crossing lines (degenerate hyperbola) through ' + hk);
      return;
    }
    const xFirst = RHS.div(A).sign() > 0;
    const a2 = xFirst ? RHS.div(A) : RHS.div(C);
    const b2 = xFirst ? RHS.div(C).neg() : RHS.div(A).neg();
    const cc = a2.add(b2);
    const aS = simp(sSqrt(qS(a2)));
    const bS = simp(sSqrt(qS(b2)));
    const cS = simp(sSqrt(qS(cc)));
    out.answer.push('type: hyperbola');
    out.answer.push('standard form: ' + (xFirst ? fmtS(simp(sSub(sDiv(sqX, qS(a2)), sDiv(sqY, qS(b2))))) : fmtS(simp(sSub(sDiv(sqY, qS(a2)), sDiv(sqX, qS(b2)))))) + ' = 1');
    out.answer.push('center = ' + hk + ',  a = ' + exactText(aS) + ',  b = ' + exactText(bS) + ',  c = √(a² + b²) = ' + exactText(cS));
    out.answer.push('vertices = ' + (xFirst ? showPoint(sSub(qS(h), aS), qS(k)) + ' and ' + showPoint(sAdd([qS(h), aS]), qS(k)) : showPoint(qS(h), sSub(qS(k), aS)) + ' and ' + showPoint(qS(h), sAdd([qS(k), aS]))));
    out.answer.push('foci = ' + (xFirst ? showPoint(sSub(qS(h), cS), qS(k)) + ' and ' + showPoint(sAdd([qS(h), cS]), qS(k)) : showPoint(qS(h), sSub(qS(k), cS)) + ' and ' + showPoint(qS(h), sAdd([qS(k), cS]))));
    const slope = xFirst ? simp(sDiv(bS, aS)) : simp(sDiv(aS, bS));
    const st = exactText(slope);
    const coefT = /^[0-9]+$/.test(st) ? st : '(' + st + ')';
    out.answer.push('asymptotes: ' + shiftText('y', k) + ' = ±' + (st === '1' ? '' : coefT) + (h.isZero() ? 'x' : '(' + shiftText('x', h) + ')'));
    out.answer.push('eccentricity e = c/a = ' + symText(simp(sDiv(cS, aS))));
    return;
  }
  // parabola: only one variable is squared
  const squared = sx ? 'x' : 'y';
  const aa = sx ? A : C;
  const lin = sx ? E : D; // coefficient of the other variable
  const lin2 = sx ? D : E; // coefficient of the squared variable's linear term
  if (lin.isZero()) {
    // a·u² + lin2·u + F = 0: one or two parallel lines
    const dd = lin2.mul(lin2).sub(four.mul(aa).mul(F));
    out.answer.push('type: parallel lines (degenerate parabola): ' + (dd.sign() < 0 ? 'no real points' : squared + ' = ' + symText(simp(sDiv(sAdd([qS(lin2.neg()), sSqrt(qS(dd))]), qS(two.mul(aa))))) + (dd.isZero() ? '' : ' and ' + squared + ' = ' + symText(simp(sDiv(sSub(qS(lin2.neg()), sSqrt(qS(dd))), qS(two.mul(aa))))))));
    return;
  }
  // a u² + lin2 u + lin w + F = 0, u = squared variable, w = other:  (u - p)² = -(lin/a)(w - q)
  const p = lin2.neg().div(two.mul(aa));
  const w0 = aa.mul(p).mul(p).sub(F).div(lin); // vertex w coordinate:  a p² - F = lin w  =>  w = (a p² − F)/lin
  const four_p = lin.neg().div(aa); // (u-p)² = four_p (w - w0)
  const pp = four_p.div(four);
  const vtx = squared === 'x' ? showPoint(qS(p), qS(w0)) : showPoint(qS(w0), qS(p));
  const focus = squared === 'x' ? showPoint(qS(p), qS(w0.add(pp))) : showPoint(qS(w0.add(pp)), qS(p));
  const dirText = (squared === 'x' ? 'y = ' : 'x = ') + w0.sub(pp).toString();
  const other = squared === 'x' ? 'y' : 'x';
  const uvar = squared;
  out.answer.push('type: parabola (' + (squared === 'x' ? 'opens ' + (four_p.sign() > 0 ? 'upward' : 'downward') : 'opens ' + (four_p.sign() > 0 ? 'to the right' : 'to the left')) + ')');
  const lhsT = p.isZero() ? uvar + '²' : '(' + shiftText(uvar, p) + ')²';
  const rhsT = four_p.eq(Q1) ? shiftText(other, w0) : wrapCoef(four_p) + (w0.isZero() ? other : '(' + shiftText(other, w0) + ')');
  out.answer.push('standard form: ' + lhsT + ' = ' + rhsT);
  out.answer.push('vertex = ' + vtx + ',  focus = ' + focus + ',  directrix: ' + dirText);
  out.answer.push('axis of symmetry: ' + uvar + ' = ' + p.toString() + ',  focal distance p = ' + pp.abs().toString());
}
