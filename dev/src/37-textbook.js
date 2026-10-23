// ======================================================================
// 37. Textbook calculus and probability helpers
//     linear approximation, the mean value / Rolle / intermediate value theorems, sums of patterned series
//     (1 + 2 + 3 + ... + 100, 1 + 1/2 + 1/4 + ...), means and variances of the standard distributions, conditional probability
// ======================================================================
const tbNum = (S) => numS(S, {});
function tbFinite(S, x, t) {
  const v = evalAt(S, x, t);
  return isFinite(v) && Math.abs(v) < 1e12;
}
/** f and f' finite at 400 sample points strictly inside (a, b) and f finite at both ends. */
function tbSmooth(S, d, x, a, b) {
  if (!tbFinite(S, x, a) || !tbFinite(S, x, b)) return false;
  for (let i = 1; i < 400; i++) {
    const t = a + ((b - a) * i) / 400;
    if (!tbFinite(S, x, t) || !tbFinite(d, x, t)) return false;
  }
  return true;
}
/** (f, [x], a, b, [k]): the function, its variable and the numbers after it. */
function tbArgs(n, lo, hi, usage) {
  needArgs(n, lo, hi, usage);
  const S = fromAst(n.args[0]);
  const hasVar = n.args[1].t === 'var';
  const v = hasVar ? varOfArg(n.args[1]) : singleVarOf(S);
  const nodes = n.args.slice(hasVar ? 2 : 1);
  const rest = nodes.map(geoVal);
  return { S, v, rest, nodes };
}
const tbVal = (S) => symText(simp(S));

defCmd('linapprox linearapprox linearization', (n) => {
  const { S, v, rest, nodes } = tbArgs(n, 2, 4, 'f, the point a (and optionally the x to estimate)');
  if (rest.length < 1 || rest.length > 2) throw new MathError('linapprox(f, x, a) or linapprox(f, x, a, x0)');
  const aS = rest[0];
  const d = diffS(S, v);
  const fa = simp(subsS(S, v, aS));
  const da = simp(subsS(d, v, aS));
  if (!isFinite(tbNum(fa)) || !isFinite(tbNum(da))) throw new MathError('the function or its derivative is not defined at that point');
  const out = newOut();
  const L = expandS(simp(sAdd([fa, sMul([da, sSub(sV(v), aS)])])));
  out.answer.push('L(' + v + ') = ' + fmtS(L));
  out.work.push('L(' + v + ') = f(a) + f\'(a)(' + v + ' − a) with a = ' + fmtS(aS) + ',  f(a) = ' + tbVal(fa) + ',  f\'(a) = ' + tbVal(da));
  if (rest[1]) {
    const x0 = rest[1];
    const x0t = showRaw(nodes[1]);
    const est = simp(subsS(L, v, x0));
    const exact = evalAt(S, v, tbNum(x0));
    out.answer.push('estimate: f(' + x0t + ') ≈ L(' + x0t + ') = ' + tbVal(est));
    if (isFinite(exact)) {
      const err = Math.abs(exact - tbNum(est));
      out.answer.push('actual f(' + x0t + ') = ' + fmtNum(exact) + ',  error ≈ ' + fmtNum(err));
    }
  }
  out.value = { S: L };
  return out;
});

/** c in (a, b) with f'(c) = target (target is S). */
function tbSolveDerivative(d, v, target, a, b) {
  const roots = realRootsOf(simp(sSub(d, target)), v, a, b).filter((r) => r.val > a + 1e-9 && r.val < b - 1e-9);
  return roots;
}
function tbTheorem(n, rolle) {
  const { S, v, rest } = tbArgs(n, 3, 4, 'f, the variable and the interval a, b');
  if (rest.length !== 2) throw new MathError(n.fn + '(f, x, a, b)');
  const [aS, bS] = rest;
  const a = tbNum(aS);
  const b = tbNum(bS);
  if (!(a < b)) throw new MathError('the interval needs a < b');
  const d = diffS(S, v);
  const out = newOut();
  if (!tbSmooth(S, d, v, a, b)) {
    out.answer.push('the theorem does not apply: f is not continuous on [' + fmtS(aS) + ', ' + fmtS(bS) + '] or not differentiable on (' + fmtS(aS) + ', ' + fmtS(bS) + ')');
    return out;
  }
  const fa = simp(subsS(S, v, aS));
  const fb = simp(subsS(S, v, bS));
  const rate = simp(sDiv(sSub(fb, fa), sSub(bS, aS)));
  out.work.push('f is continuous on [' + fmtS(aS) + ', ' + fmtS(bS) + '] and differentiable on (' + fmtS(aS) + ', ' + fmtS(bS) + ')');
  out.work.push('f(' + fmtS(aS) + ') = ' + tbVal(fa) + ',  f(' + fmtS(bS) + ') = ' + tbVal(fb));
  if (rolle) {
    if (Math.abs(tbNum(fa) - tbNum(fb)) > 1e-12 * (1 + Math.abs(tbNum(fa)))) {
      out.answer.push("Rolle's theorem does not apply: f(a) ≠ f(b)");
      out.notes.push('The mean value theorem still holds: f\'(c) = ' + tbVal(rate) + ' for the values of c below.');
    } else out.answer.push("Rolle's theorem applies: f(a) = f(b) = " + tbVal(fa));
  } else out.answer.push('average rate of change (f(b) − f(a))/(b − a) = ' + tbVal(rate));
  const cs = tbSolveDerivative(d, v, rate, a, b);
  if (!cs.length) out.answer.push('no c in (' + fmtS(aS) + ', ' + fmtS(bS) + ') with f\'(c) = ' + tbVal(rate) + ' was found');
  cs.forEach((c) => out.answer.push('c = ' + bpText(c) + (c.S && c.S.k !== 'n' ? ' (≈ ' + fmtNum(c.val) + ')' : '') + ',  f\'(c) = ' + tbVal(rate)));
  out.work.push("f'(" + v + ') = ' + fmtS(simp(d)) + ',  solved f\'(c) = ' + tbVal(rate));
  return out;
}
defCmd('mvt meanvaluethm', (n) => tbTheorem(n, false));
defCmd('rolle', (n) => tbTheorem(n, true));

defCmd('ivt intermediatevalue', (n) => {
  const { S, v, rest } = tbArgs(n, 3, 5, 'f, the variable, the interval a, b (and optionally the value k)');
  if (rest.length < 2 || rest.length > 3) throw new MathError('ivt(f, x, a, b) or ivt(f, x, a, b, k)');
  const [aS, bS] = rest;
  const k = rest[2] || S0;
  const a = tbNum(aS);
  const b = tbNum(bS);
  if (!(a < b)) throw new MathError('the interval needs a < b');
  const out = newOut();
  const d = diffS(S, v);
  if (!tbSmooth(S, d, v, a, b)) {
    out.answer.push('the theorem does not apply: f is not continuous on [' + fmtS(aS) + ', ' + fmtS(bS) + ']');
    return out;
  }
  const fa = simp(subsS(S, v, aS));
  const fb = simp(subsS(S, v, bS));
  const lo = Math.min(tbNum(fa), tbNum(fb));
  const hi = Math.max(tbNum(fa), tbNum(fb));
  const kv = tbNum(k);
  out.work.push('f is continuous on [' + fmtS(aS) + ', ' + fmtS(bS) + ']');
  out.work.push('f(' + fmtS(aS) + ') = ' + tbVal(fa) + ',  f(' + fmtS(bS) + ') = ' + tbVal(fb));
  if (kv < lo - 1e-12 || kv > hi + 1e-12) {
    out.answer.push(fmtS(k) + ' is not between f(a) and f(b), so the theorem does not guarantee a solution of f(x) = ' + fmtS(k) + ' in the interval');
    return out;
  }
  out.answer.push(fmtS(k) + ' lies between f(a) and f(b), so there is at least one c in [' + fmtS(aS) + ', ' + fmtS(bS) + '] with f(c) = ' + fmtS(k));
  const roots = realRootsOf(simp(sSub(S, k)), v, a, b).filter((r) => r.val >= a - 1e-9 && r.val <= b + 1e-9);
  roots.forEach((c) => out.answer.push('c = ' + bpText(c) + (c.S && c.S.k !== 'n' ? ' (≈ ' + fmtNum(c.val) + ')' : '')));
  return out;
});

const TB_TERMS = ['1/n', '1/n^2', '1/n^3', '1/n^4', '1/(n*(n+1))', '1/(n*(n+2))', '1/(2*n-1)', '1/(2*n-1)^2', '1/(2*n)', '1/(2*n+1)', '(-1)^(n+1)/n', '(-1)^n/n', '(-1)^(n+1)/n^2', '(-1)^(n+1)/(2*n-1)', '(-1)^n/(2*n+1)',
  '1/n!', '(-1)^n/n!', 'n/n!', 'n/2^n', 'n^2/2^n', 'n/3^n', 'n^2', 'n^3', 'n*(n+1)', '2^n/n!'];
/** { text, start }: a general term (in n) that reproduces the listed terms exactly, else null. */
function tbGuessSeries(t) {
  for (const text of TB_TERMS) {
    let S;
    try {
      S = fromAst(parseExpression(text));
    } catch (e) {
      continue;
    }
    for (const start of [1, 0]) {
      let ok = true;
      for (let i = 0; i < t.length && ok; i++) {
        try {
          const v = numS(S, { n: start + i });
          ok = isFinite(v) && Math.abs(v - t[i].toNumber()) <= 1e-12 * Math.max(1, Math.abs(v));
        } catch (e) {
          ok = false;
        }
      }
      if (ok) return { text, start };
    }
  }
  return null;
}

// ---- sums of patterned series -------------------------------------------------------------------------------------------------
defCmd('seriessum patternsum', (n) => {
  needArgs(n, 1, 2, 'the first terms as a list [a, b, c, ...] and optionally the last term (or oo)');
  const list = n.args[0].t === 'list' ? n.args[0].items : null;
  if (!list || list.length < 2) throw new MathError('give at least the first two terms, e.g. seriessum([1, 2, 3], 100)');
  const t = list.map(constQ);
  const out = newOut();
  const d = t[1].sub(t[0]);
  const isArith = t.every((x, i) => i === 0 || x.sub(t[i - 1]).eq(d));
  const isGeom = !t[0].isZero() && t.every((x, i) => i === 0 || x.div(t[0]).eq(t[1].div(t[0]).pow(i)));
  const lastNode = n.args[1];
  const infinite = lastNode && lastNode.t === 'const' && lastNode.name === 'oo';
  const last = lastNode && !infinite ? constQ(lastNode) : null;
  if (!isArith && !isGeom) {
    const g = tbGuessSeries(t);
    if (!g) throw new MathError('the terms are neither an arithmetic sequence (constant difference) nor a geometric sequence (constant ratio), nor one of the common patterns (1/n, 1/n², 1/n!, n/2ⁿ, alternating ...); write the sum(...) yourself');
    let upper = 'oo';
    if (!infinite) {
      if (last === null) upper = String(g.start + t.length - 1);
      else {
        const S = fromAst(parseExpression(g.text));
        let idx = -1;
        for (let i = g.start; i < g.start + 3000 && idx < 0; i++) {
          const v = numS(S, { n: i });
          if (isFinite(v) && Math.abs(v - last.toNumber()) <= 1e-12 * Math.max(1, Math.abs(v))) idx = i;
        }
        if (idx < 0) throw new MathError('the last term ' + last.toString() + ' is not in the sequence');
        upper = String(idx);
      }
    }
    const res = runCommandCall(parseExpression('sum(' + g.text + ', n, ' + g.start + ', ' + upper + ')'));
    res.work.unshift('General term guessed from the listed terms: ' + g.text + ', n from ' + g.start);
    return res;
  }
  if (isArith) {
    out.work.push('Arithmetic sequence: first term a = ' + t[0].toString() + ', common difference d = ' + d.toString());
    if (infinite) {
      out.answer.push(d.isZero() && t[0].isZero() ? 'sum = 0' : 'the series diverges (the terms do not tend to 0)');
      return out;
    }
    let cnt;
    if (last === null) cnt = BigInt(t.length);
    else {
      if (d.isZero()) throw new MathError('the difference is 0, so the number of terms cannot be found from the last term');
      const m = last.sub(t[0]).div(d).add(Q1);
      if (!m.isInt() || m.sign() <= 0) throw new MathError('the last term ' + last.toString() + ' is not in the sequence');
      cnt = m.n;
    }
    const an = t[0].add(d.mul(new Q(cnt - 1n)));
    const sum = t[0].add(an).mul(new Q(cnt)).div(qInt(2));
    out.work.push('n = ' + cnt + ' terms,  last term aₙ = a + (n − 1)d = ' + an.toString());
    out.work.push('Sₙ = n(a + aₙ)/2');
    out.answer.push('sum = ' + qText(sum));
    out.value = { q: sum };
    return out;
  }
  const r = t[1].div(t[0]);
  out.work.push('Geometric sequence: first term a = ' + t[0].toString() + ', common ratio r = ' + r.toString());
  if (infinite) {
    if (r.abs().cmp(Q1) >= 0) {
      out.answer.push('the series diverges (|r| ≥ 1)');
      return out;
    }
    const sum = t[0].div(Q1.sub(r));
    out.work.push('S = a/(1 − r) because |r| < 1');
    out.answer.push('sum = ' + qText(sum));
    out.value = { q: sum };
    return out;
  }
  let cnt = BigInt(t.length);
  if (last !== null) {
    let cur = t[0];
    cnt = 1n;
    while (cnt < 200n && !cur.eq(last)) {
      cur = cur.mul(r);
      cnt++;
    }
    if (!cur.eq(last)) throw new MathError('the last term ' + last.toString() + ' is not in the sequence');
  }
  const sum = r.eq(Q1) ? t[0].mul(new Q(cnt)) : t[0].mul(Q1.sub(r.pow(Number(cnt)))).div(Q1.sub(r));
  out.work.push('n = ' + cnt + ' terms,  Sₙ = a(1 − rⁿ)/(1 − r)');
  out.answer.push('sum = ' + qText(sum));
  out.value = { q: sum };
  return out;
});

// ---- means and variances of the standard distributions -----------------------------------------------------------------
function tbMoments(out, label, mean, variance) {
  out.answer.push(label + ': mean = ' + qText(mean) + ',  variance = ' + qText(variance) + ',  standard deviation = ' + sqrtQText(variance));
  out.value = { q: mean };
  return out;
}
defCmd('diestats fairdie', (n) => {
  needArgs(n, 0, 1, 'the number of faces (6 if omitted)');
  const s = n.args[0] ? constQ(n.args[0]) : qInt(6);
  if (!s.isInt() || s.cmp(qInt(2)) < 0) throw new MathError('a die has a whole number of faces, at least 2');
  const out = newOut();
  out.work.push('Uniform on 1, 2, ..., ' + s + ':  E[X] = (n + 1)/2,  Var(X) = (n² − 1)/12');
  return tbMoments(out, 'fair ' + s + '-sided die', s.add(Q1).div(qInt(2)), s.mul(s).sub(Q1).div(qInt(12)));
});
defCmd('binomstats binomialstats', (n) => {
  needArgs(n, 2, 2, 'n and p');
  const N = constQ(n.args[0]);
  const p = constQ(n.args[1]);
  if (!N.isInt() || N.sign() < 0 || p.sign() < 0 || p.cmp(Q1) > 0) throw new MathError('n must be a whole number and p a probability between 0 and 1');
  const out = newOut();
  out.work.push('Binomial: E[X] = np,  Var(X) = np(1 − p)');
  return tbMoments(out, 'binomial(n = ' + N + ', p = ' + p + ')', N.mul(p), N.mul(p).mul(Q1.sub(p)));
});
defCmd('poissonstats', (n) => {
  needArgs(n, 1, 1, 'the rate λ');
  const l = constQ(n.args[0]);
  if (l.sign() <= 0) throw new MathError('λ must be positive');
  const out = newOut();
  out.work.push('Poisson: E[X] = Var(X) = λ');
  return tbMoments(out, 'Poisson(λ = ' + l + ')', l, l);
});
defCmd('geomstats geometricstats', (n) => {
  needArgs(n, 1, 1, 'the success probability p');
  const p = constQ(n.args[0]);
  if (p.sign() <= 0 || p.cmp(Q1) > 0) throw new MathError('p must be between 0 and 1 (not 0)');
  const out = newOut();
  out.work.push('Geometric (number of trials up to and including the first success): E[X] = 1/p,  Var(X) = (1 − p)/p²');
  return tbMoments(out, 'geometric(p = ' + p + ')', p.inv(), Q1.sub(p).div(p.mul(p)));
});

// ---- conditional probability ------------------------------------------------------------------------------------------------
defCmd('condprob conditional', (n) => {
  needArgs(n, 2, 2, 'P(A and B) and P(B)');
  const pab = constQ(n.args[0]);
  const pb = constQ(n.args[1]);
  if (pb.sign() <= 0) throw new MathError('P(B) must be positive');
  if (pab.sign() < 0 || pab.cmp(pb) > 0) throw new MathError('P(A and B) cannot be negative or larger than P(B)');
  const out = newOut();
  out.work.push('P(A|B) = P(A and B)/P(B)');
  return qvOut(out, pab.div(pb));
});
