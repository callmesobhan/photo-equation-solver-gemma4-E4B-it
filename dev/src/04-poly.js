
// ======================================================================
// 4. Polynomial roots: exact where possible (rational roots, quadratics),
//    numeric (Aberth) otherwise.
// ======================================================================

/** Q[] -> BigInt[] (low -> high), primitive, positive leading coefficient. */
function toIntPoly(P) {
  let l = 1n;
  for (const c of P) l = (l / bgcd(l, c.d)) * c.d;
  let ints = P.map((c) => c.n * (l / c.d));
  let g = 0n;
  for (const c of ints) g = bgcd(g, c);
  if (g > 1n) ints = ints.map((c) => c / g);
  if (ints[ints.length - 1] < 0n) ints = ints.map((c) => -c);
  return ints;
}
const intsToPoly = (ints) => ints.map((c) => new Q(c));

function divisorsOf(n) {
  if (n > 1000000000000n) return null;
  const m = Number(n);
  const lo = [];
  const hi = [];
  for (let d = 1; d * d <= m; d++) {
    if (m % d === 0) {
      lo.push(d);
      if (d * d !== m) hi.push(m / d);
    }
  }
  return lo.concat(hi.reverse());
}
const gcdNum = (a, b) => {
  while (b) [a, b] = [b, a % b];
  return a;
};

function evalHomog(a, p, q) {
  const n = a.length - 1;
  const qpow = [1n];
  for (let i = 1; i <= n; i++) qpow.push(qpow[i - 1] * q);
  let r = 0n;
  let pp = 1n;
  for (let k = 0; k <= n; k++) {
    r += a[k] * pp * qpow[n - k];
    pp *= p;
  }
  return r;
}

/** Rational root theorem. Returns a Q root of the integer polynomial or null. */
function findRationalRoot(ints) {
  const n = ints.length - 1;
  const ps = divisorsOf(babs(ints[0]));
  const qs = divisorsOf(babs(ints[n]));
  if (!ps || !qs || ps.length * qs.length > 300000) return null;
  const af = ints.map(Number);
  const usable = af.every(isFinite);
  for (const q of qs) {
    for (const p of ps) {
      if (gcdNum(p, q) !== 1) continue;
      for (const sgn of [1, -1]) {
        const x = (sgn * p) / q;
        if (usable) {
          let f = 0;
          let scale = 0;
          for (let k = n; k >= 0; k--) {
            f = f * x + af[k];
            scale = scale * Math.abs(x) + Math.abs(af[k]);
          }
          if (Math.abs(f) > 1e-6 * scale) continue;
        }
        if (evalHomog(ints, BigInt(sgn * p), BigInt(q)) === 0n) return new Q(BigInt(sgn * p), BigInt(q));
      }
    }
  }
  return null;
}

// ---- complex helpers for Aberth iteration -----------------------------------------
const cadd = (a, b) => [a[0] + b[0], a[1] + b[1]];
const csub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cdiv = (a, b) => {
  const d = b[0] * b[0] + b[1] * b[1];
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
};
const cabs = (a) => Math.hypot(a[0], a[1]);

/** All complex roots of an integer polynomial (low -> high), degree >= 1. */
function numericPolyRoots(ints) {
  const n = ints.length - 1;
  const lead = Number(ints[n]);
  const a = ints.map((c) => Number(c) / lead);
  if (!a.every(isFinite)) throw new MathError('coefficients are too large for a numeric solution');
  let R = 0;
  for (let k = 0; k < n; k++) R = Math.max(R, Math.pow(Math.abs(a[k]), 1 / (n - k)));
  R = Math.max(R, 1e-3);
  const z = [];
  for (let k = 0; k < n; k++) {
    const ang = (2 * Math.PI * k) / n + 0.7;
    z.push([R * Math.cos(ang), R * Math.sin(ang)]);
  }
  const evalPD = (x) => {
    let p = [a[n], 0];
    let dp = [0, 0];
    for (let k = n - 1; k >= 0; k--) {
      dp = cadd(cmul(dp, x), p);
      p = cadd(cmul(p, x), [a[k], 0]);
    }
    return [p, dp];
  };
  for (let iter = 0; iter < 500; iter++) {
    let maxStep = 0;
    for (let k = 0; k < n; k++) {
      const [p, dp] = evalPD(z[k]);
      if (p[0] === 0 && p[1] === 0) continue;
      let ratio;
      if (dp[0] === 0 && dp[1] === 0) ratio = [1e-6, 1e-6];
      else ratio = cdiv(p, dp);
      let s = [0, 0];
      for (let j = 0; j < n; j++) {
        if (j !== k) s = cadd(s, cdiv([1, 0], csub(z[k], z[j])));
      }
      const w = cdiv(ratio, csub([1, 0], cmul(ratio, s)));
      z[k] = csub(z[k], w);
      maxStep = Math.max(maxStep, cabs(w) / (1 + cabs(z[k])));
    }
    if (maxStep < 1e-15) break;
  }
  return z;
}

/** Text for (a + b*sqrt(r)) / c style quadratic roots. imag => b*sqrt(-r). */
function quadRootText(a, b, r, c, imag) {
  const ab = babs(b);
  let sq;
  if (imag) sq = (ab === 1n ? '' : String(ab)) + 'i' + (r === 1n ? '' : '√' + r);
  else sq = (ab === 1n ? '' : String(ab)) + '√' + r;
  let num;
  if (a === 0n) num = (b < 0n ? '-' : '') + sq;
  else num = a + (b < 0n ? ' - ' : ' + ') + sq;
  if (c === 1n) return num;
  return a === 0n ? num + '/' + c : '(' + num + ')/' + c;
}

/**
 * Roots of a polynomial with rational coefficients.
 * Returns { real: [{val, text, q, mult}], complex: [{re, im, text}], notes: [] }.
 */
function polyRoots(P) {
  const notes = [];
  const real = [];
  const complex = [];
  const addRational = (q, mult) => {
    const ex = real.find((r) => r.q && r.q.eq(q));
    if (ex) ex.mult += mult;
    else real.push({ val: q.toNumber(), text: q.toString(), q, mult });
  };
  let ints = toIntPoly(P);
  let zeros = 0;
  while (ints.length > 1 && ints[0] === 0n) {
    ints = ints.slice(1);
    zeros++;
  }
  if (zeros) addRational(Q0, zeros);
  let rationalFound = 0;
  while (ints.length - 1 >= 3) {
    const r = findRationalRoot(ints);
    if (!r) break;
    addRational(r, 1);
    rationalFound++;
    const quo = pdivmod(intsToPoly(ints), [r.n === 0n ? Q0 : new Q(-r.n), new Q(r.d)]);
    ints = toIntPoly(quo[0]);
  }
  if (rationalFound) notes.push('rational roots found with the rational root theorem: ' + real.filter((r) => r.q).map((r) => r.text).join(', '));
  const deg = ints.length - 1;
  if (deg === 1) {
    addRational(new Q(-ints[0], ints[1]), 1);
  } else if (deg === 2) {
    const [C, B, A] = ints;
    const D = B * B - 4n * A * C;
    if (D === 0n) {
      addRational(new Q(-B, 2n * A), 2);
    } else if (D > 0n && isqrt(D) ** 2n === D) {
      const sq = isqrt(D);
      addRational(new Q(-B + sq, 2n * A), 1);
      addRational(new Q(-B - sq, 2n * A), 1);
    } else {
      const { s, r } = simplifySqrt(babs(D));
      const g = bgcd(bgcd(babs(B), s), 2n * A);
      const a = -B / g;
      const b = s / g;
      const c = (2n * A) / g;
      const sqrtD = Math.sqrt(Number(babs(D)));
      if (D > 0n) {
        for (const sg of [1n, -1n]) {
          const val = (Number(-B) + Number(sg) * sqrtD) / Number(2n * A);
          real.push({ val, text: quadRootText(a, sg * b, r, c, false), q: null, mult: 1 });
        }
      } else {
        for (const sg of [1n, -1n]) {
          complex.push({
            re: Number(-B) / Number(2n * A),
            im: (Number(sg) * sqrtD) / Number(2n * A),
            text: quadRootText(a, sg * b, r, c, true),
            mult: 1,
          });
        }
      }
    }
    notes.push('quadratic part: a=' + A + ', b=' + B + ', c=' + C + ', discriminant D = b² - 4ac = ' + D);
  } else if (deg >= 3) {
    const zs = numericPolyRoots(ints);
    const used = new Array(zs.length).fill(false);
    for (let i = 0; i < zs.length; i++) {
      if (used[i]) continue;
      let sr = zs[i][0];
      let si = zs[i][1];
      let cnt = 1;
      used[i] = true;
      for (let j = i + 1; j < zs.length; j++) {
        if (!used[j] && cabs(csub(zs[i], zs[j])) < 1e-5 * (1 + cabs(zs[i]))) {
          used[j] = true;
          sr += zs[j][0];
          si += zs[j][1];
          cnt++;
        }
      }
      const re = sr / cnt;
      const im = si / cnt;
      if (Math.abs(im) < 1e-8 * (1 + Math.abs(re))) {
        const rec = recognize(re);
        real.push({ val: re, text: rec ? rec.text : null, q: null, mult: cnt });
      } else {
        complex.push({ re, im, text: null, mult: cnt });
      }
    }
    notes.push('degree ' + deg + ' factor without simple exact roots: solved numerically');
  }
  real.sort((x, y) => x.val - y.val);
  complex.sort((x, y) => x.re - y.re || x.im - y.im);
  return { real, complex, notes };
}
