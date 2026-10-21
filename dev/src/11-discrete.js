// ======================================================================
// 11. Discrete mathematics: number theory, modular arithmetic, counting,
//     sequences, number bases and sets. Everything is exact (BigInt).
// ======================================================================
const bigCount = (v) => babs(v).toString().length;

/** Long integers are shown in full up to 70 digits, then as a leading part, a magnitude and the last digits. */
function bigText(v) {
  const s = v.toString();
  const t = s[0] === '-' ? s.slice(1) : s;
  if (t.length <= 70) return s;
  return (v < 0n ? '-' : '') + t[0] + '.' + t.slice(1, 9) + '×10^' + (t.length - 1);
}
function intOut(out, v, extra) {
  out.answer.push(bigText(v));
  if (bigCount(v) > 70) out.work.push(bigCount(v) + ' digits; it starts ' + babs(v).toString().slice(0, 30) + '… and ends …' + babs(v).toString().slice(-12));
  if (extra) out.work.push(extra);
  out.value = { q: new Q(v) };
  return out;
}
const boolOut = (out, yes, text) => {
  out.answer.push(text);
  out.value = { q: yes ? Q1 : Q0 };
  return out;
};
const ints = (n, lo, hi, usage) => {
  needArgs(n, lo, hi, usage);
  return n.args.map(intArg);
};
function factorOrFail(v) {
  const f = factorBig(v);
  if (!f) throw new MathError('that number is too large to factor here');
  return f;
}

// ---- primes and divisors -----------------------------------------------------------------------------------------
defCmd('isprime', (n) => {
  const [v] = ints(n, 1, 1, 'one whole number');
  const out = newOut();
  if (v < 2n) return boolOut(out, false, v + ' is not prime');
  if (isProbablePrime(v)) {
    if (v > 3n * 10n ** 24n) out.notes.push('For numbers this large the test is probabilistic (Miller-Rabin); it is virtually certain.');
    return boolOut(out, true, bigText(v) + ' is prime');
  }
  const f = factorBig(v);
  return boolOut(out, false, bigText(v) + ' is not prime' + (f ? ':  ' + factorizationText(f) : ''));
});
function nextPrimeAfter(v) {
  let c = v < 2n ? 2n : v + 1n;
  if (c > 2n && c % 2n === 0n) c++;
  while (!isProbablePrime(c)) c += c === 2n ? 1n : 2n;
  return c;
}
defCmd('nextprime', (n) => {
  const [v] = ints(n, 1, 1, 'one whole number');
  return intOut(newOut(), nextPrimeAfter(v), 'The smallest prime greater than ' + v);
});
defCmd('prevprime', (n) => {
  const [v] = ints(n, 1, 1, 'one whole number');
  if (v <= 2n) throw new MathError('there is no prime below ' + v);
  let c = v - 1n;
  while (!isProbablePrime(c)) c--;
  return intOut(newOut(), c, 'The largest prime smaller than ' + v);
});
function sieve(limit) {
  const flags = new Uint8Array(limit + 1);
  const ps = [];
  for (let i = 2; i <= limit; i++) {
    if (flags[i]) continue;
    ps.push(i);
    for (let j = i * i; j <= limit; j += i) flags[j] = 1;
  }
  return ps;
}
defCmd('primes primelist', (n) => {
  const a = ints(n, 1, 2, 'a limit, or a range from, to');
  const lo = a.length === 2 ? Number(a[0]) : 2;
  const hi = Number(a[a.length - 1]);
  if (hi > 5e6 || lo > hi) throw new MathError('give a range of at most 5,000,000');
  const ps = sieve(hi).filter((p) => p >= lo);
  const out = newOut();
  out.work.push('There are ' + ps.length + ' primes from ' + Math.max(lo, 2) + ' to ' + hi);
  out.answer.push(ps.length > 120 ? ps.slice(0, 60).join(', ') + ', …, ' + ps.slice(-20).join(', ') : ps.join(', '));
  out.value = { q: qInt(ps.length) };
  return out;
});
defCmd('primepi primecount', (n) => {
  const [v] = ints(n, 1, 1, 'one whole number');
  if (v > 5000000n) throw new MathError('the limit must be at most 5,000,000');
  return intOut(newOut(), BigInt(sieve(Number(v)).length), 'the number of primes ≤ ' + v);
});
function divisorList(f) {
  let ds = [1n];
  for (const [p, e] of f) {
    const next = [];
    for (const d of ds) for (let k = 0, pk = 1n; k <= e; k++, pk *= p) next.push(d * pk);
    ds = next;
  }
  return ds.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}
defCmd('divisors factors_of', (n) => {
  const [v0] = ints(n, 1, 1, 'one whole number');
  const v = babs(v0);
  if (v === 0n) throw new MathError('0 has infinitely many divisors');
  const f = v === 1n ? new Map() : factorOrFail(v);
  const ds = divisorList(f);
  const out = newOut();
  out.answer.push(ds.length > 150 ? ds.slice(0, 60).join(', ') + ', …, ' + ds.slice(-20).join(', ') : ds.join(', '));
  out.work.push('Prime factorisation: ' + (v === 1n ? '1' : factorizationText(f)));
  out.work.push('Number of divisors: ' + ds.length + ',  sum of divisors: ' + ds.reduce((s, d) => s + d, 0n));
  out.value = { q: qInt(ds.length) };
  return out;
});
function arithFn(name, usage, compute, note) {
  defCmd(name, (n) => {
    const [v] = ints(n, 1, 2, usage);
    if (v < 1n) throw new MathError(n.fn + ' needs a positive whole number');
    const f = v === 1n ? new Map() : factorOrFail(v);
    const extra = n.args[1] ? intArg(n.args[1]) : 1n;
    const res = compute(v, f, extra);
    const out = newOut();
    out.work.push('n = ' + (v === 1n ? '1' : factorizationText(f)) + (note ? ';  ' + note : ''));
    return intOut(out, res);
  });
}
arithFn('totient phi eulerphi', 'one positive whole number', (v, f) => {
  let r = v;
  for (const p of f.keys()) r = (r / p) * (p - 1n);
  return r;
}, 'φ(n) counts the numbers up to n that share no factor with n');
arithFn('numdivisors tau', 'one positive whole number', (v, f) => {
  let r = 1n;
  for (const e of f.values()) r *= BigInt(e + 1);
  return r;
}, 'τ(n) = (e₁+1)(e₂+1)…');
arithFn('sigma sumdivisors', 'one positive whole number (and optionally a power)', (v, f, k) => {
  let r = 1n;
  for (const [p, e] of f) {
    const pk = p ** k;
    let t = 0n;
    for (let i = 0; i <= e; i++) t += pk ** BigInt(i);
    r *= t;
  }
  return r;
}, 'σ(n) is the sum of the divisors');
arithFn('mobius mu', 'one positive whole number', (v, f) => {
  for (const e of f.values()) if (e > 1) return 0n;
  return f.size % 2 ? -1n : 1n;
}, 'μ(n) = 0 when a square divides n, else (−1)^(number of prime factors)');
arithFn('radical rad', 'one positive whole number', (v, f) => {
  let r = 1n;
  for (const p of f.keys()) r *= p;
  return r;
}, 'the product of the distinct primes');
defCmd('digitsum', (n) => {
  const [v] = ints(n, 1, 1, 'one whole number');
  const s = babs(v).toString();
  const out = newOut();
  out.work.push('Digits: ' + s.split('').join(' + '));
  return intOut(out, s.split('').reduce((a, c) => a + BigInt(c), 0n));
});

// ---- modular arithmetic ------------------------------------------------------------------------------------------
const posMod = (a, m) => ((a % m) + m) % m;
defCmd('mod remainder rem', (n) => {
  const [a, m] = ints(n, 2, 2, 'a number and a modulus');
  if (m === 0n) throw new MathError('the modulus cannot be 0');
  const mm = babs(m);
  const r = posMod(a, mm);
  const out = newOut();
  out.work.push(a + ' = ' + (a - r) / mm + '·' + mm + ' + ' + r);
  return intOut(out, r);
});
defCmd('modinv inversemod', (n) => {
  const [a, m] = ints(n, 2, 2, 'a number and a modulus');
  if (m < 2n) throw new MathError('the modulus must be at least 2');
  const inv = modInv(a, m);
  if (inv === null) throw new MathError(a + ' has no inverse mod ' + m + ' because gcd(' + a + ', ' + m + ') = ' + bgcd(a, m) + ' is not 1');
  const out = newOut();
  out.check = a + '·' + inv + ' = ' + a * inv + ' ≡ ' + posMod(a * inv, m) + ' (mod ' + m + ')';
  return intOut(out, inv, 'The number x with ' + a + '·x ≡ 1 (mod ' + m + ')');
});
defCmd('modpow powmod', (n) => {
  const [b, e, m] = ints(n, 3, 3, 'a base, an exponent and a modulus');
  if (m < 1n) throw new MathError('the modulus must be positive');
  if (e < 0n) {
    const inv = modInv(b, m);
    if (inv === null) throw new MathError('the base has no inverse for this modulus');
    return intOut(newOut(), modPow(inv, -e, m), b + '^' + e + ' mod ' + m + ' (square-and-multiply)');
  }
  return intOut(newOut(), modPow(b, e, m), b + '^' + e + ' mod ' + m + ' (square-and-multiply)');
});
function orderMod(a, m) {
  if (bgcd(a, m) !== 1n) throw new MathError(a + ' and ' + m + ' must share no factor to have a multiplicative order');
  if (m === 1n) return 1n;
  const fm = factorOrFail(m);
  let phi = m;
  for (const p of fm.keys()) phi = (phi / p) * (p - 1n);
  let ord = phi;
  const fphi = phi === 1n ? new Map() : factorOrFail(phi);
  for (const p of fphi.keys()) while (ord % p === 0n && modPow(a, ord / p, m) === 1n) ord /= p;
  return ord;
}
defCmd('orderof multorder', (n) => {
  const [a, m] = ints(n, 2, 2, 'a number and a modulus');
  return intOut(newOut(), orderMod(posMod(a, m), m), 'The least k > 0 with ' + a + '^k ≡ 1 (mod ' + m + ')');
});
defCmd('primitiveroot', (n) => {
  const [p] = ints(n, 1, 1, 'a prime');
  if (!isProbablePrime(p)) throw new MathError('primitiveroot needs a prime modulus');
  if (p === 2n) return intOut(newOut(), 1n);
  for (let g = 2n; g < p; g++) if (orderMod(g, p) === p - 1n) return intOut(newOut(), g, 'The smallest generator of the multiplicative group mod ' + p);
  throw new MathError('no primitive root found');
});
defCmd('legendre', (n) => {
  const [a, p] = ints(n, 2, 2, 'a number and an odd prime');
  if (p < 3n || !isProbablePrime(p)) throw new MathError('legendre needs an odd prime');
  const r = modPow(posMod(a, p), (p - 1n) / 2n, p);
  const v = r === 0n ? 0n : r === 1n ? 1n : -1n;
  const out = newOut();
  out.work.push(v === 1n ? a + ' is a square mod ' + p : v === 0n ? p + ' divides ' + a : a + ' is not a square mod ' + p);
  return intOut(out, v);
});

/** x ≡ a_i (mod m_i): returns [x, M] or null when the system has no solution. */
function crtSolve(rs, ms) {
  let x = 0n;
  let M = 1n;
  for (let i = 0; i < rs.length; i++) {
    const m = ms[i];
    const [g, p] = egcd(M, m);
    const diff = rs[i] - x;
    if (diff % g !== 0n) return null;
    const l = (M / g) * m;
    x = posMod(x + M * posMod((diff / g) * p, m / g), l);
    M = l;
  }
  return [x, M];
}
function listInts(node) {
  if (node.t !== 'list') throw new MathError('a list such as [2, 3] is needed here');
  return node.items.map(intArg);
}
defCmd('crt chineseremainder', (n) => {
  let rs;
  let ms;
  if (n.args.length === 2 && n.args[0].t === 'list') {
    rs = listInts(n.args[0]);
    ms = listInts(n.args[1]);
  } else {
    if (n.args.length < 2 || n.args.length % 2) throw new MathError('crt needs the remainders and the moduli, e.g. crt([2, 3], [3, 5])');
    rs = [];
    ms = [];
    for (let i = 0; i < n.args.length; i += 2) {
      rs.push(intArg(n.args[i]));
      ms.push(intArg(n.args[i + 1]));
    }
  }
  if (rs.length !== ms.length || !rs.length) throw new MathError('give one modulus for every remainder');
  if (ms.some((m) => m < 1n)) throw new MathError('the moduli must be positive');
  const out = newOut();
  const sol = crtSolve(rs.map((r, i) => posMod(r, ms[i])), ms);
  if (!sol) {
    out.answer.push('No solution: the congruences contradict each other');
    return out;
  }
  out.answer.push('x ≡ ' + sol[0] + ' (mod ' + sol[1] + ')');
  out.work.push('System: ' + rs.map((r, i) => 'x ≡ ' + r + ' (mod ' + ms[i] + ')').join(',  '));
  out.check = rs.map((r, i) => sol[0] + ' mod ' + ms[i] + ' = ' + posMod(sol[0], ms[i])).join(', ');
  out.value = { q: new Q(sol[0]) };
  return out;
});

/** A·x ≡ B (mod m) for any polynomial in one variable: exact for linear, by scanning residues otherwise. */
defCmd('congruence solvecongruence', (n) => {
  needArgs(n, 3, 3, 'the left side, the right side and the modulus');
  const m = intArg(n.args[2]);
  if (m < 1n) throw new MathError('the modulus must be positive');
  const S = sSub(fromAst(n.args[0]), fromAst(n.args[1]));
  const vs = Array.from(varsOfS(S));
  const out = newOut();
  if (!vs.length) {
    const ok = S.k === 'n' && S.q.isInt() && S.q.n % m === 0n;
    out.answer.push(ok ? 'True: the two sides are congruent mod ' + m : 'False: the two sides are not congruent mod ' + m);
    return out;
  }
  if (vs.length > 1) throw new MathError('a congruence with one unknown is needed');
  const v = vs[0];
  const r = toRFS(expandS(S), v);
  if (r.d.length > 1) throw new MathError('only polynomial congruences are supported');
  let P = r.n;
  const lcmD = P.reduce((a, c) => (a * c.d) / bgcd(a, c.d), 1n);
  P = P.map((c) => c.mul(new Q(lcmD)));
  if (P.some((c) => !c.isInt())) throw new MathError('the coefficients must be rational numbers');
  const cs = P.map((c) => posMod(c.n, m));
  const deg = P.length - 1;
  if (deg === 1) {
    const a = cs[1];
    const b = posMod(-cs[0], m);
    const g = bgcd(a, m);
    out.work.push(a + '·' + v + ' ≡ ' + b + '  (mod ' + m + '),  gcd(' + a + ', ' + m + ') = ' + g);
    if (b % g !== 0n) {
      out.answer.push('No solution (' + g + ' does not divide ' + b + ')');
      return out;
    }
    const m2 = m / g;
    const inv = modInv((a / g) % m2, m2);
    const x0 = m2 === 1n ? 0n : posMod((b / g) * inv, m2);
    out.answer.push(v + ' ≡ ' + x0 + ' (mod ' + m2 + ')');
    if (g > 1n) out.work.push('There are ' + g + ' solutions mod ' + m + ': ' + Array.from({ length: Number(g > 12n ? 12n : g) }, (_, k) => x0 + BigInt(k) * m2).join(', ') + (g > 12n ? ', …' : ''));
    out.check = a + '·' + x0 + ' = ' + a * x0 + ' ≡ ' + b + ' (mod ' + m + ')';
    return out;
  }
  if (m > 2000000n) throw new MathError('for degree 2 and higher the modulus must be at most 2,000,000');
  const sols = [];
  const mm = Number(m);
  for (let x = 0; x < mm; x++) {
    let acc = 0n;
    const bx = BigInt(x);
    for (let k = cs.length - 1; k >= 0; k--) acc = (acc * bx + cs[k]) % m;
    if (acc === 0n) sols.push(x);
  }
  out.work.push('Checked every residue 0…' + (mm - 1));
  out.answer.push(sols.length ? v + ' ≡ ' + (sols.length > 40 ? sols.slice(0, 40).join(', ') + ', …' : sols.join(', ')) + ' (mod ' + m + ')' : 'No solution mod ' + m);
  return out;
});

/** a·x + b·y = c in integers. */
defCmd('diophantine', (n) => {
  needArgs(n, 2, 2, 'the left side and the right side');
  const E = expandS(sSub(fromAst(n.args[0]), fromAst(n.args[1])));
  const vs = Array.from(varsOfS(E)).sort();
  if (vs.length !== 2) throw new MathError('a linear equation in two unknowns is needed, e.g. 3x + 5y = 1');
  const bad = () => new MathError('only linear equations a·x + b·y = c with rational coefficients are supported');
  const cx = polyCoeffsS(E, vs[0]);
  if (!cx || cx.length !== 2) throw bad();
  const cy = polyCoeffsS(cx[0], vs[1]);
  if (!cy || cy.length !== 2 || cx[1].k !== 'n' || cy[0].k !== 'n' || cy[1].k !== 'n') throw bad();
  const a = cx[1].q;
  const b = cy[1].q;
  const c0 = cy[0].q;
  const lcmD = [a, b, c0].reduce((acc, q) => (acc * q.d) / bgcd(acc, q.d), 1n);
  const A = a.mul(new Q(lcmD)).n;
  const B = b.mul(new Q(lcmD)).n;
  const C = c0.mul(new Q(lcmD)).neg().n; // a x + b y = -c0
  const out = newOut();
  const g = bgcd(A, B);
  out.work.push(A + '·' + vs[0] + ' + ' + B + '·' + vs[1] + ' = ' + C + ';  gcd(' + A + ', ' + B + ') = ' + g);
  if (C % g !== 0n) {
    out.answer.push('No integer solutions (' + g + ' does not divide ' + C + ')');
    return out;
  }
  const [, s, t] = egcd(A, B);
  const x0 = s * (C / g);
  const y0 = t * (C / g);
  const bx = B / g;
  const ay = A / g;
  // shift to the representative with the smallest non-negative x
  let k = -(x0 / bx);
  if (x0 + k * bx < 0n) k += 1n;
  if (x0 + k * bx >= babs(bx)) k -= 1n;
  const px = x0 + k * bx;
  const py = y0 - k * ay;
  const sg = (q) => (q < 0n ? '- ' + -q : '+ ' + q);
  out.answer.push(vs[0] + ' = ' + px + ' ' + sg(bx) + '·t,   ' + vs[1] + ' = ' + py + ' ' + sg(-ay) + '·t,   t any integer');
  out.work.push('One solution: ' + vs[0] + ' = ' + px + ', ' + vs[1] + ' = ' + py);
  out.check = A + '·(' + px + ') + ' + B + '·(' + py + ') = ' + (A * px + B * py);
  return out;
});

// ---- counting ---------------------------------------------------------------------------------------------------
const MAX_COUNT_ARG = 20000n;
function bigFactorial(k) {
  let r = 1n;
  for (let i = 2n; i <= k; i++) r *= i;
  return r;
}
function binom(nn, k) {
  if (k < 0n || k > nn) return 0n;
  if (k > nn - k) k = nn - k;
  let r = 1n;
  for (let i = 1n; i <= k; i++) r = (r * (nn - k + i)) / i;
  return r;
}
function nonNeg(v, what) {
  if (v < 0n) throw new MathError(what + ' needs whole numbers that are not negative');
  if (v > MAX_COUNT_ARG) throw new MathError(what + ': the numbers are too large (at most ' + MAX_COUNT_ARG + ')');
  return v;
}
defCmd('factorial', (n) => {
  const [v] = ints(n, 1, 1, 'one whole number');
  nonNeg(v, 'factorial');
  return intOut(newOut(), bigFactorial(v), v + '! = 1·2·…·' + v);
});
defCmd('ncr binomial choose comb combinations', (n) => {
  const [a, k] = ints(n, 2, 2, 'n and k');
  nonNeg(a, 'ncr');
  const out = newOut();
  out.work.push('C(' + a + ', ' + k + ') = ' + a + '! / (' + k + '!·' + (a - k) + '!)  — the number of ways to choose ' + k + ' of ' + a + ' when order does not matter');
  return intOut(out, binom(a, k));
});
defCmd('npr perm permutations', (n) => {
  const [a, k] = ints(n, 2, 2, 'n and k');
  nonNeg(a, 'npr');
  const out = newOut();
  out.work.push('P(' + a + ', ' + k + ') = ' + a + '! / ' + (a - k) + '!  — the number of ordered selections of ' + k + ' from ' + a);
  let r = 0n;
  if (k >= 0n && k <= a) {
    r = 1n;
    for (let i = 0n; i < k; i++) r *= a - i;
  }
  return intOut(out, r);
});
defCmd('multiset combrep', (n) => {
  const [a, k] = ints(n, 2, 2, 'n and k');
  nonNeg(a, 'multiset');
  nonNeg(k, 'multiset');
  const out = newOut();
  out.work.push('Choosing ' + k + ' from ' + a + ' kinds with repetition allowed: C(' + a + ' + ' + k + ' − 1, ' + k + ')');
  return intOut(out, a === 0n ? (k === 0n ? 1n : 0n) : binom(a + k - 1n, k));
});
defCmd('multinomial', (n) => {
  const ks = n.args.length === 1 && n.args[0].t === 'list' ? listInts(n.args[0]) : ints(n, 2, 30, 'the group sizes, e.g. multinomial(2, 3, 1)');
  ks.forEach((k) => nonNeg(k, 'multinomial'));
  const total = ks.reduce((s, k) => s + k, 0n);
  let r = bigFactorial(total);
  ks.forEach((k) => { r /= bigFactorial(k); });
  const out = newOut();
  out.work.push(total + '! / (' + ks.map((k) => k + '!').join('·') + ')  — arrangements of ' + total + ' items in groups of ' + ks.join(', '));
  return intOut(out, r);
});
defCmd('catalan', (n) => {
  const [v] = ints(n, 1, 1, 'one whole number');
  nonNeg(v, 'catalan');
  return intOut(newOut(), binom(2n * v, v) / (v + 1n), 'Cₙ = C(2n, n)/(n + 1) with n = ' + v);
});
function fibPair(k) {
  if (k === 0n) return [0n, 1n];
  const [a, b] = fibPair(k >> 1n);
  const c = a * (2n * b - a);
  const d = a * a + b * b;
  return k & 1n ? [d, c + d] : [c, d];
}
defCmd('fibonacci fib', (n) => {
  const [v] = ints(n, 1, 1, 'one whole number');
  nonNeg(v, 'fibonacci');
  return intOut(newOut(), fibPair(v)[0], 'F₀ = 0, F₁ = 1, Fₙ = Fₙ₋₁ + Fₙ₋₂');
});
defCmd('lucas', (n) => {
  const [v] = ints(n, 1, 1, 'one whole number');
  nonNeg(v, 'lucas');
  const [f, f1] = fibPair(v);
  return intOut(newOut(), 2n * f1 - f, 'L₀ = 2, L₁ = 1, Lₙ = Lₙ₋₁ + Lₙ₋₂');
});
defCmd('derangements subfactorial', (n) => {
  const [v] = ints(n, 1, 1, 'one whole number');
  nonNeg(v, 'derangements');
  let d = 1n;
  for (let i = 1n; i <= v; i++) d = i * d + (i % 2n === 0n ? 1n : -1n);
  return intOut(newOut(), d, 'Arrangements of ' + v + ' items where none stays in its place: Dₙ = n·Dₙ₋₁ + (−1)ⁿ');
});
defCmd('stirling2 stirling', (n) => {
  const [a, k] = ints(n, 2, 2, 'n and k');
  if (a > 400n || k > a || k < 0n) throw new MathError('stirling2(n, k) needs 0 ≤ k ≤ n ≤ 400');
  const N = Number(a);
  const K = Number(k);
  const t = [[1n]];
  for (let i = 1; i <= N; i++) {
    t.push([0n]);
    for (let j = 1; j <= Math.min(i, K); j++) t[i][j] = BigInt(j) * (t[i - 1][j] || 0n) + (t[i - 1][j - 1] || 0n);
  }
  return intOut(newOut(), t[N][K] || 0n, 'Ways to split ' + a + ' items into ' + k + ' non-empty groups');
});
defCmd('stirling1', (n) => {
  const [a, k] = ints(n, 2, 2, 'n and k');
  if (a > 400n || k > a || k < 0n) throw new MathError('stirling1(n, k) needs 0 ≤ k ≤ n ≤ 400');
  const N = Number(a);
  const K = Number(k);
  const t = [[1n]];
  for (let i = 1; i <= N; i++) {
    t.push([0n]);
    for (let j = 1; j <= Math.min(i, K); j++) t[i][j] = BigInt(i - 1) * (t[i - 1][j] || 0n) + (t[i - 1][j - 1] || 0n);
  }
  return intOut(newOut(), t[N][K] || 0n, 'Permutations of ' + a + ' items with ' + k + ' cycles (unsigned)');
});
defCmd('bell', (n) => {
  const [v] = ints(n, 1, 1, 'one whole number');
  if (v < 0n || v > 300n) throw new MathError('bell(n) needs 0 ≤ n ≤ 300');
  let row = [1n];
  for (let i = 1n; i <= v; i++) {
    const next = [row[row.length - 1]];
    for (const x of row) next.push(next[next.length - 1] + x);
    row = next;
  }
  return intOut(newOut(), row[0], 'The number of ways to partition a set of ' + v + ' items');
});
defCmd('partitions partitionnumber', (n) => {
  const [v] = ints(n, 1, 1, 'one whole number');
  if (v < 0n || v > 3000n) throw new MathError('partitions(n) needs 0 ≤ n ≤ 3000');
  const N = Number(v);
  const p = [1n];
  for (let i = 1; i <= N; i++) {
    let s = 0n;
    for (let k = 1; ; k++) {
      const g1 = (k * (3 * k - 1)) / 2;
      if (g1 > i) break;
      const sign = k % 2 ? 1n : -1n;
      s += sign * p[i - g1];
      const g2 = (k * (3 * k + 1)) / 2;
      if (g2 <= i) s += sign * p[i - g2];
    }
    p.push(s);
  }
  return intOut(newOut(), p[N], 'The number of ways to write ' + v + ' as a sum of positive whole numbers, ignoring order');
});

// ---- number bases ---------------------------------------------------------------------------------------------
const BASE_NAMES = { 2: 'binary', 8: 'octal', 16: 'hexadecimal' };
function subscript(num) {
  return String(num).replace(/\d/g, (d) => SUB_DIGITS[+d]);
}
function toBaseCmd(v, b, out) {
  if (b < 2n || b > 36n) throw new MathError('the base must be between 2 and 36');
  const s = v.toString(Number(b)).toUpperCase();
  out.answer.push(s + subscript(b) + (BASE_NAMES[Number(b)] ? '  (' + BASE_NAMES[Number(b)] + ')' : ''));
  out.work.push(v + ' in base ' + b + ' (repeated division by ' + b + ')');
  out.value = { q: new Q(v) };
  return out;
}
defCmd('tobase', (n) => {
  const [v, b] = ints(n, 2, 2, 'a number and a base');
  return toBaseCmd(v, b, newOut());
});
[['binary', 2n], ['octal', 8n], ['hex hexadecimal', 16n]].forEach(([names, b]) => {
  defCmd(names, (n) => {
    const [v] = ints(n, 1, 1, 'one whole number');
    return toBaseCmd(v, b, newOut());
  });
});
defCmd('frombase', (n) => {
  const [digits, b] = ints(n, 2, 2, 'the digits and the base');
  if (b < 2n || b > 10n) throw new MathError('frombase reads digits 0-9, so the base must be from 2 to 10');
  const s = digits.toString();
  let v = 0n;
  for (const c of s) {
    if (BigInt(c) >= b) throw new MathError('the digit ' + c + ' is not allowed in base ' + b);
    v = v * b + BigInt(c);
  }
  const out = newOut();
  out.work.push(s + subscript(b) + ' = ' + s.split('').map((c, i) => c + '·' + b + (s.length - 1 - i > 0 ? toSup(String(s.length - 1 - i)) : '')).join(' + '));
  return intOut(out, v);
});

// ---- sequences ----------------------------------------------------------------------------------------------------
const qList = (qs) => qs.map((q) => q.toString());
const qParen = (q) => (q.isInt() && q.sign() >= 0 ? q.toString() : '(' + q.toString() + ')');
function binomPoly(k) {
  // C(n - 1, k) as a polynomial in n
  let P = [Q1];
  for (let i = 1; i <= k; i++) P = pmul(P, [qInt(-i), Q1]);
  const f = bigFactorial(BigInt(k));
  return P.map((c) => c.div(new Q(f)));
}
function fitSequence(vals) {
  const N = vals.length;
  const rows = [vals];
  while (rows[rows.length - 1].length > 1) {
    const r = rows[rows.length - 1];
    rows.push(r.slice(1).map((v, i) => v.sub(r[i])));
  }
  let deg = -1;
  for (let d = 0; d <= 6 && d + 2 <= N; d++) {
    const row = rows[d];
    if (row.every((v) => v.eq(row[0]))) {
      deg = d;
      break;
    }
  }
  if (deg >= 0) return { kind: 'poly', deg, rows, confirmed: true };
  // geometric
  if (N >= 3 && !vals[0].isZero() && vals.slice(1).every((v, i) => !vals[i].isZero() && v.div(vals[i]).eq(vals[1].div(vals[0])))) {
    return { kind: 'geom', ratio: vals[1].div(vals[0]) };
  }
  // Fibonacci-like and second-order linear recurrences
  if (N >= 4 && vals.slice(2).every((v, i) => v.eq(vals[i].add(vals[i + 1])))) return { kind: 'rec', p: Q1, q: Q1 };
  if (N >= 5) {
    const det = vals[1].mul(vals[1]).sub(vals[0].mul(vals[2]));
    if (!det.isZero()) {
      const p = vals[2].mul(vals[1]).sub(vals[0].mul(vals[3])).div(det);
      const q = vals[1].mul(vals[3]).sub(vals[2].mul(vals[2])).div(det);
      if (vals.slice(2).every((v, i) => v.eq(p.mul(vals[i + 1]).add(q.mul(vals[i]))))) return { kind: 'rec', p, q };
    }
  }
  // few terms: fit the polynomial of lowest degree through all of them
  if (N <= 5) return { kind: 'poly', deg: N - 1, rows, confirmed: false };
  return null;
}
defCmd('sequence nextterm pattern', (n) => {
  if (n.args.length < 3) throw new MathError('sequence needs at least 3 terms, e.g. sequence(2, 6, 12, 20)');
  const vals = n.args.map(constQ);
  const fit = fitSequence(vals);
  const out = newOut();
  if (!fit) {
    out.answer.push('I could not find a pattern in ' + qList(vals).join(', ') + ' (tried polynomial, geometric and linear-recurrence patterns)');
    return out;
  }
  const next = [];
  const N = vals.length;
  let formula = '';
  let kindText = '';
  if (fit.kind === 'poly') {
    let P = [];
    for (let k = 0; k <= fit.deg; k++) {
      const c = fit.rows[k][0];
      P = padd(P, binomPoly(k).map((x) => x.mul(c)));
    }
    P = ptrim(P);
    const at = (m) => peval(P, qInt(m));
    for (let m = N + 1; m <= N + 3; m++) next.push(at(m));
    formula = 'aₙ = ' + (P.length ? polyText(P, 'n') : '0');
    const names = ['constant', 'arithmetic (linear)', 'quadratic', 'cubic', 'quartic', 'quintic', 'degree-6'];
    kindText = names[fit.deg] + ' sequence' + (fit.deg > 0 ? ': the ' + (fit.deg === 1 ? 'differences' : fit.deg === 2 ? 'second differences' : fit.deg === 3 ? 'third differences' : 'differences of order ' + fit.deg) + ' are constant (' + fit.rows[fit.deg][0].toString() + ')' : '');
    if (!fit.confirmed) out.notes.push('With so few terms this is only the simplest polynomial through them; give more terms to confirm the pattern.');
    if (fit.deg === 1) {
      const d = fit.rows[1][0];
      out.work.push('Common difference d = ' + d.toString() + ';  sum of the first n terms: Sₙ = n(2·' + vals[0].toString() + ' + (n − 1)·' + qParen(d) + ')/2');
    }
  } else if (fit.kind === 'geom') {
    const r = fit.ratio;
    for (let m = 0, t = vals[N - 1]; m < 3; m++) {
      t = t.mul(r);
      next.push(t);
    }
    formula = 'aₙ = ' + (vals[0].eq(Q1) ? '' : qParen(vals[0]) + '·') + qParen(r) + '^(n−1)';
    kindText = 'geometric sequence with common ratio r = ' + r.toString();
  } else {
    const { p, q } = fit;
    const seq = vals.slice();
    for (let m = 0; m < 3; m++) seq.push(p.mul(seq[seq.length - 1]).add(q.mul(seq[seq.length - 2])));
    next.push(...seq.slice(N));
    formula = 'aₙ = ' + (p.eq(Q1) ? '' : qParen(p) + '·') + 'aₙ₋₁ + ' + (q.eq(Q1) ? '' : qParen(q) + '·') + 'aₙ₋₂';
    kindText = p.eq(Q1) && q.eq(Q1) ? 'Fibonacci-type sequence (each term is the sum of the two before it)' : 'linear recurrence of order 2';
  }
  out.answer.push('next terms: ' + qList(next).join(', '));
  out.work.unshift('Type: ' + kindText);
  out.work.push('General term: ' + formula);
  out.value = { q: next[0] };
  return out;
});
defCmd('arith arithmetic', (n) => {
  needArgs(n, 3, 3, 'the first term, the common difference and n');
  const [a, d, k] = n.args.map(constQ);
  if (!k.isInt() || k.sign() < 1) throw new MathError('n must be a positive whole number');
  const an = a.add(d.mul(k.sub(Q1)));
  const S = k.mul(a.add(an)).div(qInt(2));
  const out = newOut();
  out.answer.push('aₙ = ' + qLabel(an) + ',   Sₙ = ' + qLabel(S));
  out.work.push('aₙ = a₁ + (n − 1)d = ' + a.toString() + ' + ' + k.sub(Q1).toString() + '·' + qParen(d));
  out.work.push('Sₙ = n(a₁ + aₙ)/2 = ' + k.toString() + '·(' + a.toString() + ' + ' + an.toString() + ')/2');
  out.value = { q: an };
  return out;
});
defCmd('geom geometric', (n) => {
  needArgs(n, 3, 3, 'the first term, the common ratio and n');
  const [a, r, k] = n.args.map(constQ);
  if (!k.isInt() || k.sign() < 1) throw new MathError('n must be a positive whole number');
  if (k.n > 5000n) throw new MathError('n is too large');
  const kk = Number(k.n);
  let rp = Q1;
  for (let i = 0; i < kk - 1; i++) rp = rp.mul(r);
  const an = a.mul(rp);
  const S = r.eq(Q1) ? a.mul(k) : a.mul(Q1.sub(rp.mul(r))).div(Q1.sub(r));
  const out = newOut();
  out.answer.push('aₙ = ' + qLabel(an) + ',   Sₙ = ' + qLabel(S));
  out.work.push('aₙ = a₁·rⁿ⁻¹;  Sₙ = a₁(1 − rⁿ)/(1 − r)');
  const mag = Math.abs(r.toNumber());
  if (mag < 1 && !r.isZero()) out.work.push('Since |r| < 1 the infinite series converges to a₁/(1 − r) = ' + qLabel(a.div(Q1.sub(r))));
  out.value = { q: an };
  return out;
});

// ---- sets -------------------------------------------------------------------------------------------------------
function setOf(node) {
  if (node.t !== 'list') throw new MathError('sets are written as lists, e.g. [1, 2, 3]');
  const seen = new Map();
  node.items.forEach((it) => {
    let key;
    try {
      key = constQ(it).toString();
    } catch (e) {
      key = showRaw(it);
    }
    if (!seen.has(key)) seen.set(key, key);
  });
  return seen;
}
const setText = (m) => '{' + Array.from(m.keys()).sort((a, b) => (isNaN(+a) || isNaN(+b) ? (a < b ? -1 : 1) : +a - +b)).join(', ') + '}';
function setCmd(names, label, combine) {
  defCmd(names, (n) => {
    needArgs(n, 2, 2, 'two sets, e.g. ' + n.fn + '([1, 2, 3], [2, 3, 4])');
    const A = setOf(n.args[0]);
    const B = setOf(n.args[1]);
    const R = new Map();
    combine(A, B, R);
    const out = newOut();
    out.answer.push(setText(R) + '   (' + R.size + ' element' + (R.size === 1 ? '' : 's') + ')');
    out.work.push('A = ' + setText(A) + ',  B = ' + setText(B) + ';  ' + label);
    out.value = { q: qInt(R.size) };
    return out;
  });
}
setCmd('union', 'A ∪ B: everything in A or B', (A, B, R) => { A.forEach((v, k) => R.set(k, v)); B.forEach((v, k) => R.set(k, v)); });
setCmd('intersection intersect', 'A ∩ B: elements in both', (A, B, R) => { A.forEach((v, k) => B.has(k) && R.set(k, v)); });
setCmd('setdiff setminus', 'A \\ B: elements of A that are not in B', (A, B, R) => { A.forEach((v, k) => !B.has(k) && R.set(k, v)); });
setCmd('symdiff', 'A △ B: elements in exactly one of them', (A, B, R) => { A.forEach((v, k) => !B.has(k) && R.set(k, v)); B.forEach((v, k) => !A.has(k) && R.set(k, v)); });
defCmd('powerset subsets', (n) => {
  needArgs(n, 1, 1, 'a set or its size');
  const out = newOut();
  const sz = n.args[0].t === 'list' ? BigInt(setOf(n.args[0]).size) : intArg(n.args[0]);
  if (sz < 0n || sz > 5000n) throw new MathError('the size must be between 0 and 5000');
  out.work.push('A set with ' + sz + ' elements has 2^' + sz + ' subsets');
  return intOut(out, 2n ** sz);
});

// ---- text patterns: mod, congruences, bases, choose -----------------------------------------------------------------
/** Called by normalizeText: turns "17 mod 5", "3x ≡ 4 (mod 7)", "255 to binary", "5 choose 2" into commands. */
function convertDiscrete(s) {
  if (!/mod|≡|equiv|binary|octal|hex|base|choose|0[xbo][0-9a-f]|integer|diophant|\bc\(|\bp\(|\d[cp]\d|_|anagram|arrang|permut/i.test(s)) return s;
  s = convertWordCounting(s);
  s = s.replace(/\\equiv/g, '≡').replace(/\\pmod\s*\{([^{}]*)\}/g, ' mod $1').replace(/\\bmod/g, ' mod ').replace(/\\pmod\s*(\d+)/g, ' mod $1');
  // congruences  L ≡ R (mod m)
  s = s.replace(/([^\n;,≡]+?)\s*(?:≡|\bcongruent\s+to\b)\s*([^\n;,≡]+?)\s*[(,]?\s*(?:\bmod\b|\bmodulo\b)\s*(\d+)\s*\)?/gi, (m, l, r, mod) => {
    l = l.replace(/^[\s:]*(?:(?:solve|find|and|the|system|of|congruences?|such\s+that)\b[\s:]*)+/i, '');
    return 'congruence(' + l.trim() + ', ' + r.trim() + ', ' + mod + ')';
  });
  // a system x ≡ a (mod m), x ≡ b (mod n) ...  ->  crt
  const sys = [];
  s.replace(/congruence\(\s*([a-z])\s*,\s*(-?\d+)\s*,\s*(\d+)\s*\)/gi, (m, v, a, mo) => { sys.push({ v, a, mo, m }); return m; });
  if (sys.length >= 2 && sys.every((t) => t.v === sys[0].v)) {
    const first = s.indexOf(sys[0].m);
    const lastT = sys[sys.length - 1].m;
    const last = s.lastIndexOf(lastT) + lastT.length;
    s = s.slice(0, first) + 'crt([' + sys.map((t) => t.a).join(', ') + '], [' + sys.map((t) => t.mo).join(', ') + '])' + s.slice(last);
  }
  // integer solutions of a linear equation
  s = s.replace(/(?:integer\s+solutions?\s+(?:of|to|for)|diophantine(?:\s+equation)?|solve\s+in\s+(?:the\s+)?integers?)\s*[:]?\s*([^=;\n]+?)\s*=\s*([^;\n]+?)\s*(?:\bin\s+(?:the\s+)?integers?)?\s*$/gim, 'diophantine($1, $2)');
  s = s.replace(/(^|[;\n])\s*(?:find\s+|solve\s+)?([^=;\n]+?)\s*=\s*([^;\n]+?)\s*,?\s*\b(?:in|over)\s+(?:the\s+)?(?:integers|whole numbers|z)\b/gi, '$1diophantine($2, $3)');
  // a mod m
  s = s.replace(/(-?\d+|\([^()]+\))\s+mod\s+(\d+)/gi, 'mod($1, $2)');
  // choose / permute
  s = s.replace(/(\d+)\s*choose\s*(\d+)/gi, 'ncr($1, $2)');
  s = s.replace(/\b(?:c|ncr)\(\s*(\d+)\s*,\s*(\d+)\s*\)/gi, 'ncr($1, $2)');
  s = s.replace(/\b(?:p|npr)\(\s*(\d+)\s*,\s*(\d+)\s*\)/gi, 'npr($1, $2)');
  s = s.replace(/(^|[^a-z0-9_.])(\d+)([cp])(\d+)(?![a-z0-9_.])/gi, (m, pre, a, f, b) => pre + (f.toLowerCase() === 'c' ? 'ncr(' : 'npr(') + a + ', ' + b + ')');
  // number bases
  s = s.replace(/(^|[^a-z0-9_.])0x([0-9a-f]+)\b/gi, (m, pre, h) => pre + BigInt('0x' + h).toString());
  s = s.replace(/(^|[^a-z0-9_.])0b([01]+)\b/gi, (m, pre, h) => pre + BigInt('0b' + h).toString());
  s = s.replace(/(^|[^a-z0-9_.])0o([0-7]+)\b/gi, (m, pre, h) => pre + BigInt('0o' + h).toString());
  s = s.replace(/\(\s*([0-9a-z]+)\s*\)\s*_\s*[({]?\s*(\d{1,2})\s*[)}]?/gi, (m, d, b) => (/^[0-9]+$/.test(d) ? 'frombase(' + d + ', ' + b + ')' : String(parseBase(d, +b))));
  s = s.replace(/(^|[^a-z0-9_.])(\d+)\s*_\s*[({]?\s*(\d{1,2})\s*[)}]?(?![\d.])/gi, (m, pre, d, b) => pre + 'frombase(' + d + ', ' + b + ')');
  s = s.replace(/(?:convert\s+)?(\d+)\s*(?:in|to|into|as)\s+(binary|octal|hexadecimal|hex)\b/gi, (m, v, name) => (/^b/i.test(name) ? 'binary(' : /^o/i.test(name) ? 'octal(' : 'hex(') + v + ')');
  s = s.replace(/(?:convert\s+)?(\d+)\s*(?:to|in|into)\s+base\s+(\d{1,2})\b/gi, 'tobase($1, $2)');
  s = s.replace(/\b(binary|octal|hexadecimal|hex)\s+(?:of|for)\s+(\d+)/gi, (m, name, v) => (/^b/i.test(name) ? 'binary(' : /^o/i.test(name) ? 'octal(' : 'hex(') + v + ')');
  s = s.replace(/(\d+)\s*base\s*(\d{1,2})\b/gi, 'frombase($1, $2)');
  return s;
}
function parseBase(digits, b) {
  let v = 0n;
  for (const c of digits.toLowerCase()) {
    const d = parseInt(c, 36);
    if (isNaN(d) || d >= b) throw new MathError('the digit ' + c + ' is not allowed in base ' + b);
    v = v * BigInt(b) + BigInt(d);
  }
  return v;
}
