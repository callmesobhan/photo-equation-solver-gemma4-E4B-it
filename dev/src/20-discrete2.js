// ======================================================================
// 20. More discrete mathematics: Euclid's algorithm with Bezout coefficients, continued fractions, Pell equations, Collatz,
//     Egyptian fractions, sums of two squares, Farey sequences, Tower of Hanoi, Josephus, figurate numbers, and linear
//     recurrence relations with closed forms.
// ======================================================================
defCmd('euclid bezout egcdsteps', (n) => {
  const [a0, b0] = ints(n, 2, 2, 'two whole numbers: euclid(252, 105)');
  if (a0 === 0n && b0 === 0n) throw new MathError('gcd(0, 0) is not defined');
  let a = babs(a0);
  let b = babs(b0);
  const out = newOut();
  const rows = [];
  let x = a;
  let y = b;
  while (y !== 0n) {
    const q = x / y;
    const r = x % y;
    rows.push({ x, y, q, r });
    x = y;
    y = r;
  }
  const g = x;
  const [, s0, t0] = egcd(a, b);
  const s = a0 < 0n ? -s0 : s0;
  const t = b0 < 0n ? -t0 : t0;
  out.answer.push('gcd(' + a0 + ', ' + b0 + ') = ' + g);
  out.answer.push('Bézout: ' + g + ' = ' + qParenBig(s) + '·' + a0 + ' + ' + qParenBig(t) + '·' + b0);
  rows.forEach((r) => out.work.push(r.x + ' = ' + r.q + '·' + r.y + ' + ' + r.r));
  out.work.push('lcm(' + a + ', ' + b + ') = ' + (g === 0n ? 0n : (a / g) * b));
  if (g !== 1n) out.work.push('the numbers are not coprime (gcd ≠ 1), so there is no modular inverse of either one modulo the other');
  else if (b !== 0n && a !== 0n) out.work.push('gcd = 1: ' + a + ' has inverse ' + (((s0 % b) + b) % b) + ' modulo ' + b + ' (and ' + b + ' has inverse ' + (((t0 % a) + a) % a) + ' modulo ' + a + ')');
  out.check = s * a0 + t * b0 === g ? 'the Bézout coefficients give back the gcd' : null;
  out.value = { q: new Q(g) };
  return out;
});
const qParenBig = (v) => (v < 0n ? '(' + v + ')' : String(v));

// ---- continued fractions and Pell equations ----------------------------------------------------------------------------------------------------------------------
function cfOfRational(p, q) {
  const terms = [];
  let a = p;
  let b = q;
  while (b !== 0n && terms.length < 60) {
    let t = a / b;
    if (a % b !== 0n && (a < 0n) !== (b < 0n)) t -= 1n;
    terms.push(t);
    [a, b] = [b, a - t * b];
  }
  return terms;
}
function cfOfSqrt(d) {
  const a0 = isqrtBig(d);
  if (a0 * a0 === d) return { a0, period: [] };
  let m = 0n;
  let dd = 1n;
  let a = a0;
  const period = [];
  for (let i = 0; i < 2000; i++) {
    m = dd * a - m;
    dd = (d - m * m) / dd;
    a = (a0 + m) / dd;
    period.push(a);
    if (a === 2n * a0) break;
  }
  return { a0, period };
}
function isqrtBig(n) {
  if (n < 2n) return n;
  let x = BigInt(Math.floor(Math.sqrt(Number(n))));
  while (x * x > n) x -= 1n;
  while ((x + 1n) * (x + 1n) <= n) x += 1n;
  return x;
}
function convergentsOf(terms) {
  const out = [];
  let p0 = 1n;
  let q0 = 0n;
  let p1 = terms[0];
  let q1 = 1n;
  out.push([p1, q1]);
  for (let i = 1; i < terms.length; i++) {
    const p2 = terms[i] * p1 + p0;
    const q2 = terms[i] * q1 + q0;
    out.push([p2, q2]);
    [p0, q0, p1, q1] = [p1, q1, p2, q2];
  }
  return out;
}
/** a + b·sqrt(d) with rational a, b and a whole d (not a perfect square), or null. */
function asQuadSurd(S) {
  let a = Q0;
  let b = Q0;
  let d = null;
  const terms = S.k === '+' ? S.a : [S];
  for (const tm of terms) {
    if (tm.k === 'n') {
      a = a.add(tm.q);
      continue;
    }
    const [coef, rest] = splitCoef(tm);
    if (rest && rest.k === '^' && rest.b.k === 'n' && rest.b.q.isInt() && rest.e.k === 'n' && rest.e.q.eq(new Q(1n, 2n))) {
      const dd = rest.b.q.n;
      if (d !== null && d !== dd) return null;
      d = dd;
      b = b.add(coef);
    } else return null;
  }
  return d === null || b.isZero() ? null : { a, b, d };
}
/** Continued fraction of (P + sqrt(D))/Q with Q > 0 and Q | D − P²: the purely periodic tail is detected exactly. */
function cfOfQuadratic(P, D, Q) {
  const r = isqrtBig(D);
  const terms = [];
  const seen = new Map();
  for (let i = 0; i < 400; i++) {
    const key = P + ',' + Q;
    if (seen.has(key)) return { pre: terms.slice(0, seen.get(key)), period: terms.slice(seen.get(key)) };
    seen.set(key, terms.length);
    let a = (P + r) / Q;
    if (P + r < 0n && (P + r) % Q !== 0n) a -= 1n;
    terms.push(a);
    P = a * Q - P;
    Q = (D - P * P) / Q;
  }
  return { pre: terms, period: [] };
}
defCmd('cfrac continuedfraction cf', (n) => {
  needArgs(n, 1, 2, 'a number, fraction or square root, and optionally how many terms: cfrac(355/113), cfrac(sqrt(7)), cfrac((1+sqrt(5))/2), cfrac(pi, 8)');
  const out = newOut();
  const S = fromAst(n.args[0]);
  const want = n.args[1] ? Number(intArg(n.args[1])) : 10;
  if (want < 1 || want > 40) throw new MathError('between 1 and 40 terms are supported');
  const show = (terms) => '[' + terms[0] + '; ' + terms.slice(1).join(', ') + ']';
  if (S.k === 'n') {
    const terms = cfOfRational(S.q.n, S.q.d);
    out.answer.push(fmtS(S) + ' = ' + (terms.length === 1 ? '[' + terms[0] + ']' : show(terms)));
    out.work.push('Euclid\'s algorithm on the numerator and denominator gives the terms');
    const cv = convergentsOf(terms);
    out.work.push('convergents: ' + cv.map(([p, q]) => (q === 1n ? p.toString() : p + '/' + q)).join(', '));
    out.value = { S };
    return out;
  }
  const qs = asQuadSurd(S);
  if (qs && qs.a.add(qs.b.mul(new Q(isqrtBig(qs.d)))).sign() > 0 && qs.b.sign() > 0 && isqrtBig(qs.d) ** 2n !== qs.d) {
    // x = (A + B sqrt(d))/C  ->  (P + sqrt(D))/Q  with Q | D − P²
    const C = qs.a.d * qs.b.d / bgcd(qs.a.d, qs.b.d);
    const A = qs.a.n * (C / qs.a.d);
    const B = qs.b.n * (C / qs.b.d);
    const P = A * C;
    const D = B * B * qs.d * C * C;
    const Q = C * C;
    const { pre, period } = cfOfQuadratic(P, D, Q);
    const head = pre.concat(period);
    let text;
    if (!period.length) text = show(head);
    else if (!pre.length) text = '[(' + period.join(', ') + ') repeating]';
    else text = '[' + pre[0] + (pre.length > 1 ? '; ' + pre.slice(1).join(', ') + ', ' : '; ') + '(' + period.join(', ') + ') repeating]';
    out.answer.push(fmtS(S) + ' = ' + text + '   (' + (period.length ? 'period length ' + period.length : 'terminating') + ')');
    const terms = pre.concat(Array.from({ length: Math.max(want - pre.length, 0) }, (_, i) => period[i % (period.length || 1)])).slice(0, want);
    const cv = convergentsOf(terms);
    out.work.push('convergents: ' + cv.slice(0, 8).map(([p, q]) => p + '/' + q).join(', '));
    return out;
  }
  const v = numS(S, {});
  if (!isFinite(v)) throw new MathError('give a real number');
  // known constants with a closed pattern or tables; otherwise doubles
  let terms;
  const key0 = fmtS(S);
  if (key0 === 'π') terms = [3n, 7n, 15n, 1n, 292n, 1n, 1n, 1n, 2n, 1n, 3n, 1n, 14n, 2n, 1n, 1n, 2n, 2n, 2n, 2n, 1n, 84n];
  else if (key0 === 'e') terms = [2n, 1n, 2n, 1n, 1n, 4n, 1n, 1n, 6n, 1n, 1n, 8n, 1n, 1n, 10n, 1n, 1n, 12n, 1n, 1n, 14n, 1n, 1n, 16n];
  else {
    terms = [];
    let x = v;
    for (let i = 0; i < Math.min(want, 12); i++) {
      const a = Math.floor(x);
      terms.push(BigInt(a));
      const frac = x - a;
      if (frac < 1e-9) break;
      x = 1 / frac;
    }
  }
  terms = terms.slice(0, want);
  out.answer.push(fmtS(S) + ' ≈ ' + show(terms));
  const cv = convergentsOf(terms);
  out.work.push('convergents: ' + cv.slice(0, 10).map(([p, q]) => p + '/' + q + ' (' + fmtNum(Number(p) / Number(q)) + ')').join(', '));
  if (!['π', 'e'].includes(key0)) out.notes.push('The later terms come from a decimal value and may be inaccurate.');
  return out;
});
defCmd('pell pellequation', (n) => {
  needArgs(n, 1, 2, 'd (for x² − d·y² = 1) and optionally ±1: pell(61), pell(13, -1)');
  const d = intArg(n.args[0]);
  const sign = n.args[1] ? intArg(n.args[1]) : 1n;
  if (d < 2n || d > 100000n) throw new MathError('d must be between 2 and 100000');
  if (isqrtBig(d) ** 2n === d) throw new MathError('d is a perfect square, so x² − d·y² = ' + sign + ' has only trivial solutions');
  if (sign !== 1n && sign !== -1n) throw new MathError('the right-hand side must be 1 or -1');
  const { a0, period } = cfOfSqrt(d);
  const L = period.length;
  const out = newOut();
  if (sign === -1n && L % 2 === 0) {
    out.answer.push('x² − ' + d + 'y² = −1 has no integer solutions (the period of √' + d + ' is even)');
    return out;
  }
  const terms = [a0].concat(Array.from({ length: 2 * L + 1 }, (_, i) => period[i % L]));
  const k = sign === 1n ? (L % 2 === 0 ? L : 2 * L) : L;
  const cv = convergentsOf(terms.slice(0, k));
  const [x1, y1] = cv[cv.length - 1];
  out.answer.push('smallest solution: x = ' + x1 + ', y = ' + y1 + '   (' + x1 + '² − ' + d + '·' + y1 + '² = ' + (x1 * x1 - d * y1 * y1) + ')');
  // further solutions (x + y√d)^k
  const fam = [[x1, y1]];
  const [bx, by] = sign === 1n ? [x1, y1] : [x1 * x1 + d * y1 * y1, 2n * x1 * y1];
  let [cx, cy] = [x1, y1];
  const next = [];
  for (let i = 0; i < 3; i++) {
    [cx, cy] = [cx * bx + d * cy * by, cx * by + cy * bx];
    next.push('(' + cx + ', ' + cy + ')');
  }
  void fam;
  out.work.push('period of √' + d + ' = ' + L + ';  the fundamental solution is a convergent of the continued fraction [' + a0 + '; ' + period.join(', ') + ']');
  out.work.push((sign === 1n ? 'more solutions: (x + y√d)ⁿ, e.g. ' : 'solutions of the −1 equation: the odd powers of (x + y√d), e.g. next ') + next.join(', '));
  return out;
});

// ---- small number-theoretic curiosities ---------------------------------------------------------------------------------------------------------------------------
defCmd('collatz', (n) => {
  const [start] = ints(n, 1, 1, 'a positive whole number: collatz(27)');
  if (start < 1n || start > 10n ** 15n) throw new MathError('use a positive whole number below 10^15');
  let x = start;
  let steps = 0;
  let peak = x;
  const seq = [x];
  while (x !== 1n && steps < 100000) {
    x = x % 2n === 0n ? x / 2n : 3n * x + 1n;
    steps++;
    if (x > peak) peak = x;
    if (seq.length < 40) seq.push(x);
  }
  const out = newOut();
  out.answer.push(steps + ' steps to reach 1 (peak value ' + peak + ')');
  out.work.push('rule: n → n/2 if n is even, 3n + 1 if n is odd');
  out.work.push('sequence: ' + seq.join(', ') + (steps + 1 > seq.length ? ', …' : ''));
  out.value = { q: qInt(steps) };
  return out;
});
defCmd('egyptian egyptianfraction', (n) => {
  needArgs(n, 1, 1, 'a fraction between 0 and 1 (or any positive fraction): egyptian(4/13)');
  const q = constQ(n.args[0]);
  if (q.sign() <= 0) throw new MathError('give a positive fraction');
  let r = q;
  const parts = [];
  const out = newOut();
  if (r.sub(Q1).sign() >= 0) {
    const w = r.n / r.d;
    parts.push(w.toString());
    r = r.sub(new Q(w));
  }
  let guard = 0;
  while (!r.isZero() && guard++ < 60) {
    const d = (r.d + r.n - 1n) / r.n; // ceil(1/r)
    parts.push('1/' + d);
    r = r.sub(new Q(1n, d));
    if (bitLen(r.d) > 400) throw new MathError('the greedy expansion grows too large');
  }
  out.answer.push(q.toString() + ' = ' + parts.join(' + '));
  out.work.push('greedy algorithm: repeatedly subtract the largest unit fraction 1/⌈1/r⌉');
  return out;
});
defCmd('sum2sq sumoftwosquares', (n) => {
  const [v] = ints(n, 1, 1, 'a whole number: sum2sq(65)');
  if (v < 0n || v > 10n ** 12n) throw new MathError('use a number from 0 to 10^12');
  const reps = [];
  for (let a = 0n; 2n * a * a <= v; a++) {
    const rest = v - a * a;
    const b = isqrtBig(rest);
    if (b * b === rest && b >= a) reps.push([b, a]);
    if (reps.length > 40) break;
  }
  const out = newOut();
  out.answer.push(reps.length ? v + ' = ' + reps.map(([b, a]) => b + '² + ' + a + '²').join(' = ') : v + ' is not a sum of two squares');
  if (!reps.length) {
    const f = factorBig(v);
    if (f) out.work.push('A number is a sum of two squares exactly when every prime ≡ 3 (mod 4) occurs to an even power; here ' + factorizationText(f));
  }
  return out;
});
defCmd('farey fareysequence', (n) => {
  const [m] = ints(n, 1, 1, 'the order n (2 to 20)');
  if (m < 1n || m > 20n) throw new MathError('n must be between 1 and 20');
  const N = Number(m);
  const seq = ['0/1', '1/' + N];
  let [a, b, c, d] = [0, 1, 1, N];
  while (c < N || d > 1) {
    const k = Math.floor((N + b) / d);
    [a, b, c, d] = [c, d, k * c - a, k * d - b];
    if (c === d) {
      seq.push('1/1');
      break;
    }
    seq.push(c + '/' + d);
  }
  const out = newOut();
  const uniq = [];
  const seen = new Set();
  const all = ['0/1'];
  for (let q = 1; q <= N; q++) for (let p = 0; p <= q; p++) if (gcdNum(p, q) === 1) all.push(p + '/' + q);
  all.sort((x, y) => eval(x) - eval(y)); // eslint-disable-line no-eval
  all.forEach((s) => { if (!seen.has(s)) { seen.add(s); uniq.push(s); } });
  void seq;
  out.answer.push('F' + N + ' = ' + uniq.join(', ') + '   (' + uniq.length + ' fractions)');
  out.work.push('all reduced fractions p/q with 0 ≤ p/q ≤ 1 and q ≤ ' + N + '; the length is 1 + φ(1) + … + φ(' + N + ')');
  return out;
});
defCmd('hanoi towerofhanoi', (n) => {
  const [m] = ints(n, 1, 1, 'the number of discs: hanoi(4)');
  if (m < 1n || m > 100000n) throw new MathError('use between 1 and 100000 discs');
  const out = newOut();
  const moves = 2n ** m - 1n;
  out.answer.push('the minimum number of moves is 2^' + m + ' − 1 = ' + bigText(moves));
  if (m <= 4n) {
    const list = [];
    const go = (k, from, to, via) => {
      if (k === 0) return;
      go(k - 1, from, via, to);
      list.push(from + '→' + to);
      go(k - 1, via, to, from);
    };
    go(Number(m), 'A', 'C', 'B');
    out.work.push('moves (pegs A, B, C): ' + list.join(', '));
  }
  out.work.push('T(n) = 2T(n − 1) + 1 with T(0) = 0');
  out.value = { q: new Q(moves) };
  return out;
});
defCmd('josephus', (n) => {
  const [people, k] = ints(n, 2, 2, 'the number of people and the step: josephus(7, 3)');
  if (people < 1n || people > 100000n || k < 1n) throw new MathError('use 1 to 100000 people and a step of at least 1');
  const N = Number(people);
  const K = Number(k);
  const order = [];
  const ring = Array.from({ length: N }, (_, i) => i + 1);
  let idx = 0;
  while (ring.length > 1) {
    idx = (idx + K - 1) % ring.length;
    order.push(ring.splice(idx, 1)[0]);
  }
  const out = newOut();
  out.answer.push('the survivor is person ' + ring[0] + ' (counting from 1)');
  if (N <= 40) out.work.push('elimination order: ' + order.join(', '));
  out.work.push('J(1) = 0, J(n) = (J(n − 1) + k) mod n (0-based)');
  out.value = { q: qInt(ring[0]) };
  return out;
});
defCmd('polygonal figurate triangular', (n) => {
  needArgs(n, 1, 2, 'n (triangular number) or the number of sides s and n: polygonal(5, 10)');
  const s = n.args.length === 2 ? intArg(n.args[0]) : 3n;
  const m = intArg(n.args[n.args.length - 1]);
  if (s < 3n || m < 0n) throw new MathError('s ≥ 3 and n ≥ 0 are needed');
  const val = (m * ((s - 2n) * m - (s - 4n))) / 2n;
  const names = { 3n: 'triangular', 4n: 'square', 5n: 'pentagonal', 6n: 'hexagonal', 7n: 'heptagonal', 8n: 'octagonal' };
  const out = newOut();
  out.answer.push('P(' + s + ', ' + m + ') = ' + val + '   (the ' + m + '-th ' + (names[s] || s + '-gonal') + ' number)');
  out.work.push('P(s, n) = n((s − 2)n − (s − 4))/2;  first terms: ' + Array.from({ length: 8 }, (_, i) => {
    const k = BigInt(i + 1);
    return (k * ((s - 2n) * k - (s - 4n))) / 2n;
  }).join(', '));
  out.value = { q: new Q(val) };
  return out;
});

// ---- linear recurrences ---------------------------------------------------------------------------------------------------------------------------------------------------
const REC_NAME = /^([A-Za-z])_(n|nm\d+|np\d+)$/;
function recOffset(name) {
  const m = REC_NAME.exec(name);
  if (!m) return null;
  return m[2] === 'n' ? 0 : m[2].startsWith('nm') ? -Number(m[2].slice(2)) : Number(m[2].slice(2));
}
/** Rewrites  a_n, a_{n-1}, a(n+2), a_(n-1) ...  as a_(n), a_(nm1), a_(np2) (ids the tokenizer understands) when the text is a recurrence. */
function convertRecurrenceText(s) {
  const re = /(^|[^A-Za-z_])([A-Za-z])\s*(?:_\s*\{?\(?\s*n\s*(?:([+-])\s*(\d+))?\s*\)?\}?|\(\s*n\s*(?:([+-])\s*(\d+))?\s*\))/g;
  const letters = new Set();
  let any = false;
  const t = s.replace(re, (m, pre, L, sg1, d1, sg2, d2) => {
    const sg = sg1 || sg2;
    const d = d1 || d2;
    letters.add(L);
    if (sg) any = true;
    return pre + L + '_(' + (!sg ? 'n' : sg === '-' ? 'nm' + d : 'np' + d) + ')';
  });
  if (!letters.size || !/=/.test(t)) return s;
  if (!any && !/[A-Za-z]_\(n\)\s*=[^=]*[A-Za-z]_\(n/.test(t)) {
    // a_n = 3n + 1 is a formula for the sequence, not a recurrence: leave it to the ordinary solver
    return s;
  }
  // initial values  a_0 = 1  /  a(0) = 1  /  a_{1}
  let u = t;
  letters.forEach((L) => {
    u = u.replace(new RegExp('(^|[^A-Za-z_])' + L + '\\s*(?:_\\s*\\{?\\(?\\s*(\\d+)\\s*\\)?\\}?|\\(\\s*(\\d+)\\s*\\))(?!\\w)', 'g'), (m, pre, a, b) => pre + L + '_(' + (a || b) + ')');
  });
  return u;
}
function recShow(name) {
  const m = REC_NAME.exec(name);
  if (!m) return name;
  return m[1] + '(' + (m[2] === 'n' ? 'n' : m[2].startsWith('nm') ? 'n−' + m[2].slice(2) : 'n+' + m[2].slice(2)) + ')';
}
function tryRecurrence(sts) {
  const names = new Set();
  sts.forEach((st) => {
    const vs = new Set();
    if (st.kind === 'eq') {
      collectVars(st.lhs, vs);
      collectVars(st.rhs, vs);
    }
    vs.forEach((v) => {
      if (REC_NAME.test(v)) names.add(v);
    });
  });
  if (!names.size) return null;
  const letter = REC_NAME.exec(Array.from(names)[0])[1];
  const recs = [];
  const inits = new Map();
  for (const st of sts) {
    if (st.kind !== 'eq') throw new MathError('a recurrence is written with "=", for example a_n = 2a_(n-1) + 1');
    const vs = new Set();
    collectVars(st.lhs, vs);
    collectVars(st.rhs, vs);
    const hasRec = Array.from(vs).some((v) => REC_NAME.test(v));
    if (hasRec) recs.push(st);
    else {
      // a_0 = 1
      const idx = Array.from(vs).filter((v) => new RegExp('^' + letter + '_\\d+$').test(v));
      const full = simp(sSub(fromAst(st.lhs), fromAst(st.rhs)));
      if (idx.length === 1 && varsOfS(full).size === 1) {
        const coef = simp(diffS(full, idx[0]));
        const rest = simp(subsS(full, idx[0], S0));
        if (coef.k !== 'n' || rest.k !== 'n') throw new MathError('initial values must be numbers, such as a_0 = 1');
        inits.set(Number(idx[0].split('_')[1]), rest.q.neg().div(coef.q));
      } else throw new MathError('I did not understand the statement "' + showStatement(st) + '"');
    }
  }
  if (recs.length !== 1) throw new MathError('give exactly one recurrence relation');
  const full = simp(expandS(sSub(fromAst(recs[0].lhs), fromAst(recs[0].rhs))));
  const ids = Array.from(varsOfS(full)).filter((v) => REC_NAME.test(v));
  const offs = ids.map(recOffset);
  const top = Math.max(...offs);
  const low = Math.min(...offs);
  const order = top - low;
  if (order < 1) throw new MathError('the recurrence must link a term to earlier terms, such as a_n = 2a_(n−1) + 1');
  if (order > 6) throw new MathError('recurrences of order up to 6 are supported');
  const topId = ids[offs.indexOf(top)];
  const topCoef = simp(diffS(full, topId));
  if (topCoef.k !== 'n' || topCoef.q.isZero()) throw new MathError('the coefficients of the earlier terms must be numbers (constant coefficients)');
  const cs = []; // a_n = c1 a_(n-1) + ... + ck a_(n-k) + f(n)
  for (let j = 1; j <= order; j++) {
    const id = ids[offs.indexOf(top - j)];
    if (id === undefined) {
      cs.push(Q0);
      continue;
    }
    const co = simp(diffS(full, id));
    if (co.k !== 'n') throw new MathError('the coefficients of the earlier terms must be numbers (constant coefficients)');
    cs.push(co.q.neg().div(topCoef.q));
  }
  const zero = new Map(ids.map((v) => [v, S0]));
  const nS = sV('n');
  // the forcing term, with n shifted so that the top term is a_n
  let f = simp(sNeg(sDiv(subsMany(full, zero), topCoef)));
  if (top !== 0) f = simp(subsS(f, 'n', sSub(nS, sI(top))));
  if (varsOfS(f).size && !(varsOfS(f).size === 1 && varsOfS(f).has('n'))) throw new MathError('the extra terms may depend on n only');
  // initial values: consecutive indices
  const idxs = Array.from(inits.keys()).sort((p, q) => p - q);
  const start = idxs.length ? idxs[0] : 0;
  if (idxs.length < order) throw new MathError('this recurrence has order ' + order + ': give ' + order + ' initial values such as a_0 = 1' + (order > 1 ? ', a_1 = 2' : ''));
  for (let i = 0; i < order; i++) if (!inits.has(start + i)) throw new MathError('the initial values must be consecutive (a_' + start + ', a_' + (start + 1) + ', …)');
  const readAs = sts.map((st) => (st.kind === 'eq' ? showStatement(st) : '')).join(';  ').replace(new RegExp(letter + '_(n[mp]?\\d*)', 'g'), (m) => recShow(m));
  // the closed form is built for n = 0, 1, …: run the recurrence backwards from the given values when they start later
  const full0 = new Map(inits);
  for (let m = start - 1; m >= 0; m--) {
    let v = full0.get(m + order);
    for (let j = 1; j < order; j++) v = v.sub(cs[j - 1].mul(full0.get(m + order - j)));
    const fv = simp(subsS(f, 'n', sI(m + order)));
    if (fv.k !== 'n') throw new MathError('the extra term must be rational for integer n');
    full0.set(m, v.sub(fv.q).div(cs[order - 1]));
  }
  return { readAs: readAs.replace(/[A-Za-z]_(\d+)/g, (m, d) => letter + '_' + d), out: solveLinearRecurrence(cs, f, full0, 0, letter, null, start) };
}
function recValues(cs, f, inits, start, upTo) {
  const vals = new Map(inits);
  for (let m = start + cs.length; m <= upTo; m++) {
    let v = Q0;
    cs.forEach((c, j) => {
      v = v.add(c.mul(vals.get(m - 1 - j)));
    });
    const fv = simp(subsS(f, 'n', sI(m)));
    if (fv.k !== 'n') throw new MathError('the extra term must be a rational number for every n');
    vals.set(m, v.add(fv.q));
  }
  return vals;
}
function solveLinearRecurrence(cs, f, inits, start, letter, target, listFrom) {
  const k = cs.length;
  const out = newOut();
  const nS = sV('n');
  const nm = (t) => letter + '(' + t + ')';
  const terms = [];
  cs.forEach((c, j) => {
    if (!c.isZero()) terms.push('(' + c.toString() + ')·' + nm('n−' + (j + 1)));
  });
  out.work.push('Type: linear recurrence of order ' + k + ' with constant coefficients:  ' + nm('n') + ' = ' + terms.join(' + ') + (isNumVal(f, 0) ? '' : ' + ' + fmtS(f)));
  // characteristic roots: λ^k = c1 λ^(k-1) + ... + ck
  const charQ = [];
  for (let j = k; j >= 1; j--) charQ.push(cs[j - 1].neg());
  charQ.push(Q1);
  const roots = charRootsS(charQ);
  out.work.push('Characteristic equation: ' + polyText(charQ, 'r') + ' = 0   (roots: ' + roots.map((r) => (r.im ? fmtS(r.re) + ' ± ' + fmtS(r.im) + 'i' : fmtS(r.re)) + (r.mult > 1 ? ' (×' + r.mult + ')' : '')).join(', ') + ')');
  // homogeneous basis (functions of n)
  const basis = [];
  roots.forEach((r) => {
    if (!r.im) {
      for (let j = 0; j < r.mult; j++) basis.push(simp(sMul([sPow(nS, sI(j)), sPow(r.re, nS)])));
    } else {
      const rho2 = simp(expandS(sAdd([sq(r.re), sq(r.im)])));
      const rho = simp(sSqrt(rho2));
      const alpha = numS(r.re, {});
      const beta = numS(r.im, {});
      const theta = Math.atan2(beta, alpha);
      const fr = toFraction(theta / Math.PI, 360);
      const thS = fr && Math.abs(fr.p / fr.q - theta / Math.PI) < 1e-12 ? simp(sMul([sN(new Q(BigInt(fr.p), BigInt(fr.q))), S_PI])) : sFn('atan', [simp(sDiv(r.im, r.re))]);
      const th = fr && Math.abs(fr.p / fr.q - theta / Math.PI) < 1e-12 ? thS : alpha < 0 ? simp(sAdd([thS, S_PI])) : thS;
      for (let j = 0; j < r.mult; j++) {
        const base = sMul([sPow(nS, sI(j)), sPow(rho, nS)]);
        basis.push(simp(sMul([base, sFn('cos', [sMul([nS, th])])])));
        basis.push(simp(sMul([base, sFn('sin', [sMul([nS, th])])])));
      }
    }
  });
  if (basis.length !== k) throw new MathError('I could not find all the roots of the characteristic equation exactly');
  // particular solution by undetermined coefficients: terms c·n^d·b^n (b rational)
  let part = S0;
  if (!isNumVal(f, 0)) {
    const groups = new Map(); // base string -> {b: Q, deg}
    const fTerms = termsOf(expandS(f));
    for (const tm of fTerms) {
      let deg = 0;
      let b = Q1;
      const factors = tm.k === '*' ? tm.a : [tm];
      for (const fac of factors) {
        if (fac.k === 'n') continue;
        if (fac.k === 'v' && fac.name === 'n') deg += 1;
        else if (fac.k === '^' && fac.b.k === 'v' && fac.b.name === 'n' && fac.e.k === 'n' && fac.e.q.isInt() && fac.e.q.sign() > 0) deg += Number(fac.e.q.n);
        else if (fac.k === '^' && fac.b.k === 'n' && fac.e.k === 'v' && fac.e.name === 'n') b = b.mul(fac.b.q);
        else if (fac.k === '^' && fac.b.k === 'n' && fac.e.k === '+' && fac.e.a.some((x) => x.k === 'v' && x.name === 'n')) {
          // b^(n + c)
          const sh = simp(subsS(fac.e, 'n', S0));
          if (sh.k !== 'n' || !sh.q.isInt()) throw new MathError('unsupported extra term');
          b = b.mul(fac.b.q).mul(fac.b.q.pow(Number(sh.q.n)));
        } else throw new MathError('the extra term may contain polynomials in n and powers b^n only');
      }
      const key0 = b.toString();
      const g = groups.get(key0) || { b, deg: 0 };
      g.deg = Math.max(g.deg, deg);
      groups.set(key0, g);
    }
    const unknowns = [];
    groups.forEach((g) => {
      let mult = 0;
      roots.forEach((r) => {
        if (!r.im && r.re.k === 'n' && r.re.q.eq(g.b)) mult = r.mult;
      });
      for (let j = 0; j <= g.deg; j++) unknowns.push({ b: g.b, pow: j + mult });
    });
    const basisAt = (u, m) => {
      const bn = m >= 0 ? u.b.pow(m) : u.b.inv().pow(-m);
      return bn.mul(new Q(BigInt(m)).pow(u.pow));
    };
    const rows = [];
    const rhs = [];
    for (let m = k; m < k + unknowns.length + 3; m++) {
      rows.push(unknowns.map((u) => {
        let v = basisAt(u, m);
        for (let j = 1; j <= k; j++) v = v.sub(cs[j - 1].mul(basisAt(u, m - j)));
        return v;
      }));
      const fv = simp(subsS(f, 'n', sI(m)));
      if (fv.k !== 'n') throw new MathError('the extra term must be rational for integer n');
      rhs.push(fv.q);
    }
    const { M, pivots, inconsistent } = rrefQ(rows.map((r, i) => r.concat([rhs[i]])), unknowns.length);
    if (inconsistent || pivots.length < unknowns.length) throw new MathError('I could not find a particular solution for this extra term');
    const coef = new Array(unknowns.length).fill(Q0);
    pivots.forEach((c, i) => { coef[c] = M[i][unknowns.length]; });
    part = simp(sAdd(unknowns.map((u, i) => sMul([sN(coef[i]), sPow(nS, sI(u.pow)), sPow(sN(u.b), nS)]))));
    out.work.push('Particular solution (undetermined coefficients): ' + fmtS(part));
  }
  // constants from the initial values
  const consts = basis.map((_, i) => 'C' + (i + 1));
  const rowsS = [];
  const rhsS = [];
  for (let i = 0; i < k; i++) {
    const m = start + i;
    rowsS.push(basis.map((b) => simp(expandS(subsS(b, 'n', sI(m))))));
    rhsS.push(simp(sSub(sN(inits.get(m)), subsS(part, 'n', sI(m)))));
  }
  const sol = solveLinearS(rowsS, rhsS);
  if (!sol) throw new MathError('the initial values do not determine the constants');
  let closed = part;
  basis.forEach((b, i) => { closed = sAdd([closed, sMul([sol[i], b])]); });
  closed = simp(expandS(closed));
  void consts;
  out.answer.push(nm('n') + ' = ' + fmtS(closed));
  // check against the recurrence itself
  const last = start + 14;
  const vals = recValues(cs, f, inits, start, last);
  let ok = true;
  for (let m = start; m <= last && ok; m++) {
    const cv = numS(subsS(closed, 'n', sI(m)), {});
    const rv = vals.get(m).toNumber();
    if (!(Math.abs(cv - rv) <= 1e-6 * (1 + Math.abs(rv)))) ok = false;
  }
  out.check = ok ? 'the formula reproduces the terms ' + letter + '(' + start + ') … ' + letter + '(' + last + ') computed from the recurrence' : null;
  if (!ok) out.notes.push('The automatic check of the closed form did not pass; please verify it.');
  const shown = [];
  const from = listFrom === undefined ? start : listFrom;
  for (let m = from; m < from + 10; m++) shown.push(vals.get(m).toString());
  out.work.push('first terms (n = ' + from + ', ' + (from + 1) + ', …): ' + shown.join(', '));
  if (target !== null) {
    const tv = recValues(cs, f, inits, start, target).get(target);
    out.answer.push(letter + '(' + target + ') = ' + qText(tv));
    out.value = { q: tv };
  }
  return out;
}
defCmd('linrec recurrence', (n) => {
  needArgs(n, 3, 4, 'the coefficients [c1, c2, ...] of a(n) = c1·a(n−1) + c2·a(n−2) + …, the extra term f(n) (0 if none), the initial values [a0, a1, ...] and optionally a target index: linrec([1, 1], 0, [0, 1], 10)');
  if (n.args[0].t !== 'list' || n.args[2].t !== 'list') throw new MathError('the coefficients and the initial values are lists in square brackets');
  const cs = dataOf([n.args[0]], 'linrec');
  const inits = dataOf([n.args[2]], 'linrec');
  if (cs.length < 1 || cs.length > 6) throw new MathError('order 1 to 6 is supported');
  if (inits.length !== cs.length) throw new MathError('give ' + cs.length + ' initial values for a recurrence of order ' + cs.length);
  if (cs[cs.length - 1].isZero()) throw new MathError('the last coefficient must not be 0 (that would lower the order)');
  const f = simp(fromAst(n.args[1]));
  const vs = varsOfS(f);
  if (vs.size && !(vs.size === 1 && vs.has('n'))) throw new MathError('the extra term f(n) may use the letter n only');
  const map = new Map(inits.map((v, i) => [i, v]));
  return solveLinearRecurrence(cs, f, map, 0, 'a', n.args[3] ? Number(intArg(n.args[3])) : null);
});
