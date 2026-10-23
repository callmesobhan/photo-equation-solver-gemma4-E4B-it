// ======================================================================
// 32. Fourier series: fourier(f, x, a, b) for f on (a, b) extended periodically, piecewise definitions
//     fourier(f1, f2, ..., x, b0, b1, ..., bk), and the half-range cosine / sine series on (0, L).
//     The coefficients come from the exact integrator; the general term is shown when its closed form (with sin(n pi) = 0 and
//     cos(n pi) = (-1)^n) agrees with the exact coefficients of the first eight harmonics.
// ======================================================================
const f4Sub = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
const f4Idx = (n) => String(n).split('').map((d) => f4Sub[Number(d)]).join('');
/** exact value of the integral of expr·cos|sin(n w x) over [lo, hi]: through the integrator, as a symbolic expression */
function f4Integral(pieceText, trig, nText, wText, v, loText, hiText) {
  const call = 'integrate((' + pieceText + ')' + (trig ? '*' + trig + '(' + nText + '*(' + wText + ')*' + v + ')' : '') + ', ' + v + ', ' + loText + ', ' + hiText + ')';
  return commandValueS(parseExpression(call));
}
/** sin(p pi n + b) -> sin(b) (-1)^(p n) and cos(p pi n + b) -> cos(b) (-1)^(p n) for whole p: valid because n is an integer */
function f4IntegerN(e, n) {
  const walk = (x) => {
    if (x.k === 'f' && (x.fn === 'sin' || x.fn === 'cos') && x.a.length === 1 && !freeOf(x.a[0], n)) {
      const lin = linearIn_(x.a[0], n);
      if (lin) {
        const ratio = simp(sDiv(lin.a1, S_PI));
        if (ratio.k === 'n' && ratio.q.isInt()) {
          const a0 = simp(lin.a0);
          const sign = Number(ratio.q.n % 2n) === 0 ? S1 : sPow(sI(-1), sV(n));
          if (zeroS(a0)) return x.fn === 'sin' ? S0 : sign;
          return sMul([sFn(x.fn, [a0]), sign]);
        }
      }
    }
    if (x.k === '+' || x.k === '*' || x.k === '^' || x.k === 'f') return mapS(x, walk);
    return x;
  };
  return simp(expandS(walk(e)));
}
function f4SplitAbs(pieces, v) {
  const findAbs = (e) => {
    if (e.k === 'f' && e.fn === 'abs') {
      const lin = linearIn_(e.a[0], v);
      if (lin && lin.a1.k === 'n' && !lin.a1.q.isZero() && freeOf(lin.a0, v)) return e;
    }
    if (e.k === '+' || e.k === '*' || e.k === '^' || e.k === 'f') {
      for (const c of e.k === '^' ? [e.b, e.e] : e.a) {
        const r = findAbs(c);
        if (r) return r;
      }
    }
    return null;
  };
  const replaceAbs = (e, target, sign) => {
    if (e === target) return sign > 0 ? target.a[0] : sNeg(target.a[0]);
    if (e.k === '+' || e.k === '*' || e.k === '^' || e.k === 'f') return mapS(e, (c) => replaceAbs(c, target, sign));
    return e;
  };
  let work = pieces.slice();
  for (let guard = 0; guard < 12; guard++) {
    let changed = false;
    const next = [];
    for (const p of work) {
      const a = findAbs(p.f);
      if (!a) { next.push(p); continue; }
      changed = true;
      const lin = linearIn_(a.a[0], v);
      const z = simp(sDiv(sNeg(lin.a0), lin.a1));
      const zn = numS(z, {});
      const lo = numS(p.lo, {});
      const hi = numS(p.hi, {});
      const at = (x) => numS(subsS(a.a[0], v, sN(qFromLiteral(String(x).replace(/^-/, '')).mul(x < 0 ? qInt(-1) : Q1))), {});
      const sgnOn = (l, h) => (numS(subsS(a.a[0], v, sN(new Q(1n, 1n))), {}) * 0 + (lin.a1.q.sign() > 0 ? ((l + h) / 2 > zn ? 1 : -1) : ((l + h) / 2 > zn ? -1 : 1)));
      void at;
      if (zn > lo + 1e-12 && zn < hi - 1e-12) {
        next.push({ f: simp(replaceAbs(p.f, a, sgnOn(lo, zn))), lo: p.lo, hi: z });
        next.push({ f: simp(replaceAbs(p.f, a, sgnOn(zn, hi))), lo: z, hi: p.hi });
      } else next.push({ f: simp(replaceAbs(p.f, a, sgnOn(lo, hi))), lo: p.lo, hi: p.hi });
    }
    work = next;
    if (!changed) break;
  }
  return work;
}
function f4Series(pieces0, v, out, opts) {
  const pieces = f4SplitAbs(pieces0, v);
  const used = new Set();
  pieces.forEach((p) => varsOfS(p.f).forEach((u) => used.add(u)));
  used.delete(v);
  if (used.size) throw new MathError('f may contain only the variable ' + v + ' (found ' + Array.from(used).join(', ') + ')');
  const idx = ['n', 'k', 'm', 'j'].find((c) => c !== v) || 'n';
  const lo0 = pieces[0].lo;
  const hi1 = pieces[pieces.length - 1].hi;
  const T = simp(sSub(hi1, lo0));
  const Tn = numS(T, {});
  if (!(Tn > 0)) throw new MathError('the interval must have a positive length (a < b)');
  const w = simp(sDiv(sMul([sI(2), S_PI]), T));
  const wText = fmtS(w, true);
  const texts = pieces.map((p) => ({ f: fmtS(p.f, true), lo: fmtS(p.lo, true), hi: fmtS(p.hi, true) }));
  const scale = simp(sDiv(sI(2), T));
  const coef = (trig, nText) => {
    let sum = S0;
    texts.forEach((t) => { sum = sAdd([sum, f4Integral(t.f, trig, nText, wText, v, t.lo, t.hi)]); });
    return simp(expandS(sMul([scale, sum])));
  };
  const a0 = coef(null, '0');
  const N = opts.terms;
  const ev = 8;
  const A = [];
  const B = [];
  for (let k = 1; k <= Math.max(N, ev); k++) {
    A.push(coef('cos', String(k)));
    B.push(coef('sin', String(k)));
  }
  // general terms
  const general = (trig) => {
    try {
      const g = f4IntegerN(simp(expandS(sMul([scale, texts.reduce((s, t) => sAdd([s, f4Integral(t.f, trig, idx, wText, v, t.lo, t.hi)]), S0)]))), idx);
      const list = trig === 'cos' ? A : B;
      for (let k = 1; k <= ev; k++) {
        const gv = numS(subsS(g, idx, sI(k)), {});
        const ex = numS(list[k - 1], {});
        if (!isFinite(gv) || Math.abs(gv - ex) > 1e-9 * (1 + Math.abs(ex))) return null;
      }
      return g;
    } catch (e) {
      if (e instanceof MathError || e instanceof NotAlgebraic) return null;
      throw e;
    }
  };
  const gA = general('cos');
  const gB = general('sin');
  const allZero = (list) => list.every((c) => zeroS(c));
  const evenF = allZero(B);
  const oddF = allZero(A) && zeroS(a0);
  const sym = (x) => (zeroS(x) ? '0' : symText(x));
  const mean = simp(sDiv(a0, sI(2)));
  out.answer.push('a₀/2 = ' + sym(mean) + '   (the average value of f over one period T = ' + symText(T) + ')');
  const sb = (c) => (idx === 'n' ? c + 'ₙ' : c + '_' + idx);
  out.answer.push(gA ? sb('a') + ' = ' + fmtS(gA) : (evenF || !allZero(A) ? 'a₁ = ' + sym(A[0]) + ',  a₂ = ' + sym(A[1]) + ',  a₃ = ' + sym(A[2]) + ',  a₄ = ' + sym(A[3]) + '  (no closed form recognised)' : sb('a') + ' = 0 for every ' + idx));
  out.answer.push(gB ? sb('b') + ' = ' + fmtS(gB) : (!allZero(B) ? 'b₁ = ' + sym(B[0]) + ',  b₂ = ' + sym(B[1]) + ',  b₃ = ' + sym(B[2]) + ',  b₄ = ' + sym(B[3]) + '  (no closed form recognised)' : sb('b') + ' = 0 for every ' + idx));
  // the first harmonics as a sum, in the order of the harmonics
  const X = sV(v);
  const parts = [];
  if (!zeroS(mean)) parts.push(fmtS(mean));
  let shown = 0;
  for (let k = 1; k <= Math.max(N, ev) && shown < N; k++) {
    const ak = A[k - 1];
    const bk = B[k - 1];
    if (zeroS(ak) && zeroS(bk)) continue;
    const arg = simp(sMul([sI(k), w, X]));
    if (!zeroS(ak)) parts.push(fmtS(simp(sMul([ak, sFn('cos', [arg])]))));
    if (!zeroS(bk)) parts.push(fmtS(simp(sMul([bk, sFn('sin', [arg])]))));
    shown++;
  }
  const joined = parts.map((t, i) => (i === 0 ? t : t.startsWith('-') ? ' - ' + t.slice(1) : ' + ' + t)).join('') || '0';
  out.answer.push(shown ? 'f(' + v + ') ~ ' + joined + ' + …   (up to the first ' + shown + ' harmonic' + (shown === 1 ? '' : 's') + ' that ' + (shown === 1 ? 'is' : 'are') + ' not zero)' : 'f(' + v + ') = ' + joined + '   (a constant: there are no harmonics)');
  const rows = [];
  for (let k = 1; k <= Math.min(6, Math.max(N, 4)); k++) rows.push('n = ' + k + ': a = ' + fmtNum(numS(A[k - 1], {})) + ', b = ' + fmtNum(numS(B[k - 1], {})));
  out.work.push('coefficients  aₙ = (2/T)∫ f cos(2πn' + v + '/T) d' + v + ',  bₙ = (2/T)∫ f sin(2πn' + v + '/T) d' + v + ',  a₀ = (2/T)∫ f d' + v + ';  T = ' + symText(T));
  out.work.push('numerical values: ' + rows.join(';  '));
  if (evenF) out.work.push('f is even on the interval, so every bₙ is 0 (a cosine series)');
  if (oddF) out.work.push('f is odd on the interval, so a₀ and every aₙ are 0 (a sine series)');
  if (gA === null && !allZero(A)) out.notes.push('The closed form of aₙ is not shown; the exact values of the first harmonics are in the numerical row.');
  out.notes.push('Where f is continuous the series converges to f; at a jump it converges to the average of the two one-sided limits (Dirichlet).');
  out.value = { S: mean };
  return out;
}
function f4Args(n, what) {
  const pos = n.args.filter((a) => a.t !== 'named');
  const named = new Map(n.args.filter((a) => a.t === 'named').map((a) => [a.name, a.a]));
  const terms = named.has('terms') ? Number(intArg(named.get('terms'))) : 4;
  if (terms < 1 || terms > 12) throw new MathError('terms must be between 1 and 12');
  return { pos, terms };
}
defCmd('fourier fourierseries', (n) => {
  const { pos, terms } = f4Args(n, 'fourier');
  if (pos.length < 4 || pos.length % 2) throw new MathError('fourier(f, x, a, b) expands f on (a, b);  piecewise: fourier(f1, f2, x, b0, b1, b2)  with f1 on (b0, b1) and f2 on (b1, b2);  terms=6 shows more harmonics');
  const k = (pos.length - 2) / 2;
  const v = varOfArg(pos[k]);
  const pieces = [];
  for (let i = 0; i < k; i++) pieces.push({ f: fromAst(pos[i]), lo: fromAst(pos[k + 1 + i]), hi: fromAst(pos[k + 2 + i]) });
  for (let i = 0; i + 1 < pieces.length; i++) if (!(numS(pieces[i].hi, {}) > numS(pieces[i].lo, {}))) throw new MathError('the breakpoints must increase');
  const out = newOut();
  return f4Series(pieces, v, out, { terms });
});
COMMANDS.fourier.show = (n) => {
  const pos = n.args.filter((a) => a.t !== 'named');
  const k = (pos.length - 2) / 2;
  if (pos.length < 4 || pos.length % 2) return showRaw(n);
  return 'Fourier series of ' + (k === 1 ? showRaw(pos[0]) : '{' + pos.slice(0, k).map((a, i) => showRaw(a) + ' on (' + showRaw(pos[k + 1 + i]) + ', ' + showRaw(pos[k + 2 + i]) + ')').join(';  ')) + (k === 1 ? ' on (' + showRaw(pos[2]) + ', ' + showRaw(pos[3]) + ')' : '}');
};
function f4HalfRange(kind) {
  return (n) => {
    const { pos, terms } = f4Args(n, kind);
    if (pos.length !== 3) throw new MathError(kind + '(f, x, L) expands f given on (0, L) as a ' + (kind === 'fouriercos' ? 'cosine' : 'sine') + ' series');
    const v = varOfArg(pos[1]);
    const f = fromAst(pos[0]);
    const L = fromAst(pos[2]);
    if (!(numS(L, {}) > 0)) throw new MathError('L must be positive');
    const mirrored = simp(subsS(f, v, sNeg(sV(v))));
    const left = kind === 'fouriercos' ? mirrored : simp(sNeg(mirrored));
    const out = newOut();
    out.work.push('f is extended to (−L, L) as an ' + (kind === 'fouriercos' ? 'even' : 'odd') + ' function (half-range ' + (kind === 'fouriercos' ? 'cosine' : 'sine') + ' series), L = ' + symText(L));
    return f4Series([{ f: left, lo: simp(sNeg(L)), hi: S0 }, { f, lo: S0, hi: L }], v, out, { terms });
  };
}
defCmd('fouriercos halfrangecos', f4HalfRange('fouriercos'));
defCmd('fouriersin halfrangesin', f4HalfRange('fouriersin'));
