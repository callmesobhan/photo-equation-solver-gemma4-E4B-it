// ======================================================================
// 39. Numbers: perfect numbers, perfect powers, decimals <-> fractions (also repeating decimals)
// ======================================================================
const nbDivisorSum = (n) => {
  const f = factorBig(n);
  if (!f) throw new MathError('that number is too large to factor here');
  let s = 1n;
  for (const [p, e] of f) s *= (p ** BigInt(e + 1) - 1n) / (p - 1n);
  return s;
};
defCmd('perfect isperfect perfectnumber', (n) => {
  needArgs(n, 1, 1, 'a positive whole number');
  const v = intArg(n.args[0]);
  if (v < 1n) throw new MathError('a positive whole number is needed');
  const out = newOut();
  const sigma = v === 1n ? 1n : nbDivisorSum(v);
  const proper = sigma - v;
  let kind = proper === v ? 'a perfect number' : proper > v ? 'an abundant number' : 'a deficient number';
  if (v === 1n) kind = 'a deficient number';
  let list = '';
  if (v <= 100000n) {
    const ds = [];
    for (let d = 1n; d < v; d++) if (v % d === 0n) ds.push(d);
    list = ds.join(' + ');
  }
  out.answer.push(v + ' is ' + kind + ': the proper divisors ' + (list ? '(' + list + ') ' : '') + 'add up to ' + proper + (proper === v ? '' : proper > v ? ', more than ' + v : ', less than ' + v));
  out.work.push('σ(' + v + ') = ' + sigma + ' (sum of all divisors); the proper divisors exclude ' + v + ' itself');
  out.value = { q: proper === v ? Q1 : Q0 };
  return out;
});
defCmd('perfectsq issq', (n) => {
  needArgs(n, 1, 1, 'a whole number');
  const v = intArg(n.args[0]);
  const out = newOut();
  if (v < 0n) out.answer.push(v + ' is not a perfect square (it is negative)');
  else {
    const r = isqrt(v);
    out.answer.push(r * r === v ? v + ' = ' + r + '² is a perfect square' : v + ' is not a perfect square (' + r + '² = ' + r * r + ' < ' + v + ' < ' + (r + 1n) * (r + 1n) + ' = ' + (r + 1n) + '²)');
    out.value = { q: r * r === v ? Q1 : Q0 };
  }
  return out;
});
defCmd('perfectcb iscb', (n) => {
  needArgs(n, 1, 1, 'a whole number');
  const v = intArg(n.args[0]);
  const out = newOut();
  const neg = v < 0n;
  const a = babs(v);
  const r = iroot(a, 3);
  const yes = r * r * r === a;
  out.answer.push(yes ? v + ' = ' + (neg ? '(-' + r + ')' : r) + '³ is a perfect cube' : v + ' is not a perfect cube (' + r + '³ = ' + r ** 3n + ' and ' + (r + 1n) + '³ = ' + (r + 1n) ** 3n + ' are on either side of ' + a + ')');
  out.value = { q: yes ? Q1 : Q0 };
  return out;
});

// ---- decimals and fractions ----------------------------------------------------------------------------------------------
function nbMixed(q) {
  if (q.isInt() || babs(q.n) < q.d) return null;
  const w = q.n / q.d;
  const r = babs(q.n % q.d);
  return w + ' ' + r + '/' + q.d;
}
defCmd('tofraction asfraction decimaltofraction', (n) => {
  needArgs(n, 1, 1, 'a decimal number');
  const q = constQ(n.args[0]);
  const out = newOut();
  out.answer.push(q.toString() + (q.isInt() ? '' : '   (' + decimalOrInt(q.d <= 10n ** 15n ? q : q) + ')'));
  const mx = nbMixed(q);
  if (mx) out.answer.push('as a mixed number: ' + mx);
  out.value = { q };
  return out;
});
/** exact expansion by long division: { ip, pre, rep } (digit arrays) */
function nbExpansion(q) {
  const ip = babs(q.n) / q.d;
  let rem = babs(q.n) % q.d;
  const digits = [];
  const seen = new Map();
  while (rem !== 0n && !seen.has(rem.toString()) && digits.length < 3000) {
    seen.set(rem.toString(), digits.length);
    rem *= 10n;
    digits.push(rem / q.d);
    rem %= q.d;
  }
  if (rem === 0n) return { ip, pre: digits, rep: [] };
  if (!seen.has(rem.toString())) return { ip, pre: digits, rep: null };
  const st = seen.get(rem.toString());
  return { ip, pre: digits.slice(0, st), rep: digits.slice(st) };
}
defCmd('todecimal asdecimal fractiontodecimal', (n) => {
  needArgs(n, 1, 1, 'a fraction');
  const out = newOut();
  let q;
  try {
    q = constQ(n.args[0]);
  } catch (e) {
    const v = numS(fromAst(n.args[0]), {});
    if (!isFinite(v)) throw new MathError('a finite number is needed');
    out.answer.push('≈ ' + fmtNum(v));
    out.notes.push('That number is not a fraction, so its decimal expansion never ends or repeats.');
    return out;
  }
  const { ip, pre, rep } = nbExpansion(q);
  const sign = q.sign() < 0 ? '-' : '';
  if (rep === null) {
    out.answer.push(sign + ip + '.' + pre.slice(0, 40).join('') + '…  (the repeating block is longer than 3000 digits)');
  } else if (!rep.length) {
    out.answer.push(sign + ip + (pre.length ? '.' + pre.join('') : '') + (pre.length ? '' : '  (a whole number)'));
  } else {
    const shown = rep.length > 12 ? rep.slice(0, 12).join('') + '…' : rep.join('');
    const approx = sign + ip + '.' + pre.join('') + (rep.length <= 6 ? rep.join('').repeat(Math.max(2, Math.ceil(6 / rep.length))) : rep.slice(0, 12).join('')) + '…';
    out.answer.push(sign + ip + '.' + pre.join('') + '(' + shown + ')' + '   i.e. ' + approx + '   (repeating block "' + shown + '", ' + rep.length + ' digit' + (rep.length === 1 ? '' : 's') + ')');
  }
  out.work.push('Long division of ' + babs(q.n) + ' by ' + q.d + ': the expansion ' + (rep && rep.length ? 'repeats because a remainder came back' : 'ends when the remainder is 0'));
  out.value = { q };
  return out;
});
/** repeatdec(integer part, non-repeating digits as an integer, how many of them, repeating block as an integer, its length) */
defCmd('repeatdec repeatingdecimal', (n) => {
  needArgs(n, 5, 5, 'the integer part, the non-repeating digits, their count, the repeating block and its length');
  const [ip, pre, k, blk, L] = n.args.map(intArg);
  if (k < 0n || L < 1n || k > 60n || L > 60n) throw new MathError('too many digits');
  const tenK = 10n ** k;
  const value = new Q(ip).add(new Q(pre, tenK)).add(new Q(blk, (10n ** L - 1n) * tenK));
  const out = newOut();
  out.answer.push(value.toString() + (value.isInt() ? '' : '   (' + fmtNum(value.toNumber()) + ')'));
  out.work.push('x = 0.' + (k ? pre.toString().padStart(Number(k), '0') : '') + '(' + blk.toString().padStart(Number(L), '0') + '): multiply by 10^' + (k + L) + ' and by 10^' + k + ', subtract, and divide by ' + (10n ** (k + L) - 10n ** k));
  out.value = { q: value };
  return out;
});

// ---- the n-th term of a pattern ---------------------------------------------------------------------------------------------
defCmd('nthterm', (n) => {
  needArgs(n, 2, 2, 'the first terms as a list and the position n');
  if (n.args[0].t !== 'list' || n.args[0].items.length < 3) throw new MathError('give at least three terms as a list, e.g. nthterm([5, 8, 11], 20)');
  const vals = n.args[0].items.map(constQ);
  const k = Number(intArg(n.args[1]));
  if (k < 1 || k > 100000) throw new MathError('n must be between 1 and 100000');
  const out = runCommandCall({ t: 'call', fn: 'sequence', args: n.args[0].items });
  const fit = fitSequence(vals);
  if (!fit) return out;
  let term;
  if (fit.kind === 'poly') {
    let P = [];
    for (let d = 0; d <= fit.deg; d++) P = padd(P, binomPoly(d).map((x) => x.mul(fit.rows[d][0])));
    term = peval(ptrim(P), qInt(k));
  } else if (fit.kind === 'geom') term = vals[0].mul(fit.ratio.pow(k - 1));
  else {
    const seq = vals.slice();
    while (seq.length < k) seq.push(fit.p.mul(seq[seq.length - 1]).add(fit.q.mul(seq[seq.length - 2])));
    term = seq[k - 1];
  }
  out.answer = ['a' + String(k).split('').map((d) => '₀₁₂₃₄₅₆₇₈₉'[+d]).join('') + ' = ' + qText(term), out.answer[0]];
  out.value = { q: term };
  return out;
});
