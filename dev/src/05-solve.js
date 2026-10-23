
// ======================================================================
// 5. Solvers
// ======================================================================
const SCAN_LIMIT = 200;
const SCAN_BUDGET_MS = 2500; // wall-clock cap for numeric scans (phones are slower than desktops)
const MAX_SCAN_ROOTS = 300;
const RF_X = rf([Q0, Q1], [Q1]);
const TRIG = new Set(['sin', 'cos', 'tan', 'cot', 'sec', 'csc']);

const newOut = () => ({ answer: [], work: [], check: null, notes: [] });

function usesTrig(n) {
  if (n.t === 'call') return TRIG.has(n.fn) || n.args.some(usesTrig);
  if (n.t === 'bin') return usesTrig(n.a) || usesTrig(n.b);
  if (n.t === 'neg' || n.t === 'fact' || n.t === 'pct') return usesTrig(n.a);
  return false;
}

// ---- statements -----------------------------------------------------------------
function parseStatement(text) {
  const ops = topLevelRelations(text);
  if (!ops.length) return { kind: 'expr', node: parseExpression(text) };
  const pieces = [];
  let from = 0;
  for (const o of ops) {
    pieces.push(text.slice(from, o.i).trim());
    from = o.i + o.op.length;
  }
  pieces.push(text.slice(from).trim());
  pieces.forEach((p, k) => {
    if (!p) throw new MathError('something is missing ' + (k < ops.length ? 'before' : 'after') + ' "' + ops[Math.min(k, ops.length - 1)].op + '" in "' + text + '"');
  });
  const nodes = pieces.map(parseExpression);
  if (ops.length === 1) {
    return ops[0].op === '=' ? { kind: 'eq', lhs: nodes[0], rhs: nodes[1] }
      : { kind: 'rel', conds: [{ lhs: nodes[0], op: ops[0].op, rhs: nodes[1] }], nodes, ops: ops.map((o) => o.op) };
  }
  const dir = ops.map((o) => o.op[0]);
  if (!ops.every((o) => o.op !== '=' && o.op !== '!=') || dir.some((d) => d !== dir[0])) {
    throw new MathError('cannot read this chain of relations: "' + text + '"');
  }
  const conds = ops.map((o, k) => ({ lhs: nodes[k], op: o.op, rhs: nodes[k + 1] }));
  return { kind: 'rel', conds, nodes, ops: ops.map((o) => o.op) };
}
const REL_SHOW = { '<=': ' ≤ ', '>=': ' ≥ ', '!=': ' ≠ ', '<': ' < ', '>': ' > ', '=': ' = ' };
function showStatement(st) {
  if (st.kind === 'expr') return readAsNode(st.node);
  if (st.kind === 'eq') return showRaw(st.lhs) + ' = ' + showRaw(st.rhs);
  return st.nodes.map(showRaw).reduce((acc, s, k) => acc + (k ? REL_SHOW[st.ops[k - 1]] : '') + s, '');
}

// ---- small helpers ----------------------------------------------------------------
const sortedVars = (set) => Array.from(set).sort();
function rootLine(v, r) {
  let t;
  const d = fmtNum(r.val);
  if (r.text) {
    if (r.q && r.q.isInt()) t = v + ' = ' + r.text;
    else t = v + ' = ' + r.text + ' (' + approxSym(r.val) + ' ' + d + ')';
  } else t = v + ' ≈ ' + d;
  if (r.mult === 2) t += ' (double root)';
  else if (r.mult === 3) t += ' (triple root)';
  else if (r.mult > 3) t += ' (multiplicity ' + r.mult + ')';
  return t;
}
function complexNum(re, im) {
  const a = Math.abs(re) < 1e-12 ? '' : fmtNum(re);
  const b = (Math.abs(im) === 1 ? '' : fmtNum(Math.abs(im))) + 'i';
  if (!a) return (im < 0 ? '-' : '') + b;
  return a + (im < 0 ? ' - ' : ' + ') + b;
}
function complexLine(v, c) {
  const t = c.text ? v + ' = ' + c.text + ' (≈ ' + complexNum(c.re, c.im) + ')' : v + ' ≈ ' + complexNum(c.re, c.im);
  return c.mult > 1 ? t + ' (multiplicity ' + c.mult + ')' : t;
}
function polyIsZeroAt(P, r) {
  if (r.q) return peval(P, r.q).isZero();
  let scale = 0;
  for (let k = 0; k < P.length; k++) scale += Math.abs(P[k].toNumber()) * Math.pow(Math.abs(r.val), k);
  return Math.abs(pevalNum(P, r.val)) <= 1e-9 * Math.max(scale, 1e-300);
}
function listJoin(items) { return items.join(', '); }
const MAX_LISTED = 16;
/** Keep long root lists short: first MAX_LISTED entries plus a count of the rest. */
function capList(items, max) {
  const m = max || MAX_LISTED;
  return items.length <= m ? items : items.slice(0, m).concat(['... and ' + (items.length - m) + ' more']);
}

/** Residual check of real roots against the original statement. */
function residualCheck(lhs, rhs, v, roots) {
  let worst = 0;
  for (const r of roots) {
    const env = { [v]: r.val };
    const l = evalNum(lhs, env);
    const rr = evalNum(rhs, env);
    const err = Math.abs(l - rr) / (1 + Math.abs(l) + Math.abs(rr));
    if (!(err <= 1e-7)) worst = Math.max(worst, isNaN(err) ? Infinity : err);
  }
  return worst === 0;
}

// ---- one unknown: exact rational path --------------------------------------------
function solveRationalEquation(f, dom, eq, v, win) {
  const out = newOut();
  const N = f.n;
  const denomRoots = [];
  for (const P of dom.concat(f.d.length > 1 ? [f.d] : [])) {
    for (const r of polyRoots(P).real) {
      if (!denomRoots.some((d) => Math.abs(d.val - r.val) < 1e-9 * (1 + Math.abs(r.val)))) denomRoots.push(r);
    }
  }
  const exclText = denomRoots.map((r) => r.text || fmtNum(r.val));
  if (!N.length) {
    out.answer.push('true for every real ' + v + (exclText.length ? ' except ' + v + ' = ' + listJoin(exclText) : '') + ' (the two sides are identical)');
    return out;
  }
  if (N.length === 1) {
    out.answer.push('no solution');
    out.work.push('after simplifying, both sides differ by a non-zero constant (' + N[0].toString() + '), so they are never equal' + (exclText.length ? ' (excluded values: ' + v + ' = ' + listJoin(exclText) + ')' : ''));
    return out;
  }
  const deg = N.length - 1;
  const kind = f.d.length > 1 || dom.length ? 'equation with a fraction' : deg === 1 ? 'linear equation' : deg === 2 ? 'quadratic equation' : deg === 3 ? 'cubic equation' : 'polynomial equation of degree ' + deg;
  out.work.push('Type: ' + kind);
  out.work.push('Move everything to one side' + (f.d.length > 1 || dom.length ? ' and clear the denominators' : '') + ': ' + polyText(N, v) + ' = 0');
  if (exclText.length) out.work.push('Values that make a denominator zero are not allowed: ' + v + ' ≠ ' + listJoin(exclText));
  const roots = polyRoots(N);
  roots.notes.forEach((n) => out.work.push(n));
  const keep = [];
  const rejected = [];
  for (const r of roots.real) (dom.some((P) => polyIsZeroAt(P, r)) ? rejected : keep).push(r);
  if (win) {
    const eps = 1e-9;
    const inside = (x) => (x > win.lo + eps || (win.loInc && Math.abs(x - win.lo) <= eps)) && (x < win.hi - eps || (win.hiInc && Math.abs(x - win.hi) <= eps));
    const kept = keep.filter((r) => inside(r.val));
    keep.length = 0;
    kept.forEach((r) => keep.push(r));
    const bt = (x) => { const rc = recognize(x); return rc ? rc.text : fmtNum(x); };
    out.notes.push('Only solutions with ' + bt(win.lo) + (win.loInc ? ' ≤ ' : ' < ') + v + (win.hiInc ? ' ≤ ' : ' < ') + bt(win.hi) + ' are listed.');
    if (!keep.length) {
      out.answer.push('no solution in the interval');
      return out;
    }
  }
  if (rejected.length) out.work.push('Rejected (makes a denominator zero): ' + listJoin(rejected.map((r) => v + ' = ' + (r.text || fmtNum(r.val)))));
  if (keep.length) {
    capList(keep.map((r) => rootLine(v, r))).forEach((l) => out.answer.push(l));
    if (roots.complex.length) out.notes.push('There are also ' + roots.complex.length + ' complex (non-real) solutions: ' + listJoin(capList(roots.complex.map((c) => complexLine(v, c)), 6)));
    out.check = residualCheck(eq.lhs, eq.rhs, v, keep)
      ? 'substituting ' + (keep.length > 1 ? 'each solution' : 'the solution') + ' back into the original equation gives equal sides'
      : 'WARNING: a numeric substitution check did not match; treat the result with caution';
  } else if (roots.complex.length) {
    out.answer.push('no real solution');
    capList(roots.complex.map((c) => 'complex: ' + complexLine(v, c)), 8).forEach((l) => out.answer.push(l));
  } else {
    out.answer.push('no solution');
  }
  return out;
}

// ---- one unknown: numeric path (trig, exp, log, roots of x, abs ...) ---------------
function findPeriod(F) {
  const xs = [0.3, 0.7, 1.1, 1.9, 2.3, 3.1, 4.2, 5.0, -1.3];
  for (let k = 12; k >= 1; k--) {
    const P = (2 * Math.PI) / k;
    let ok = 0;
    let bad = false;
    for (const x of xs) {
      const a = F(x);
      const b = F(x + P);
      if (!isFinite(a) || !isFinite(b)) continue;
      if (Math.abs(a - b) > 1e-9 * (1 + Math.abs(a))) {
        bad = true;
        break;
      }
      ok++;
    }
    if (!bad && ok >= 5) return P;
  }
  return 0;
}
function bisect(F, a, b) {
  let fa = F(a);
  for (let i = 0; i < 200; i++) {
    const m = (a + b) / 2;
    const fm = F(m);
    if (fm === 0) return m;
    if ((fa < 0) === (fm < 0)) {
      a = m;
      fa = fm;
    } else b = m;
    if (b - a <= 1e-15 * Math.max(1, Math.abs(a))) break;
  }
  return (a + b) / 2;
}
function minimizeAbs(F, a, b) {
  const g = (Math.sqrt(5) - 1) / 2;
  let c = b - g * (b - a);
  let d = a + g * (b - a);
  let fc = Math.abs(F(c));
  let fd = Math.abs(F(d));
  for (let i = 0; i < 120; i++) {
    if (fc < fd) {
      b = d; d = c; fd = fc;
      c = b - g * (b - a);
      fc = Math.abs(F(c));
    } else {
      a = c; c = d; fc = fd;
      d = a + g * (b - a);
      fd = Math.abs(F(d));
    }
  }
  return (a + b) / 2;
}
function periodText(P) {
  const fr = toFraction(P / Math.PI, 24);
  if (!fr) return fmtNum(P);
  return (fr.p === 1 ? '' : String(fr.p)) + 'π' + (fr.q === 1 ? '' : '/' + fr.q);
}

/** "2\u03c0k", "\u03c0k", "2\u03c0k/3": the step between periodic solutions. */
function periodStep(P) {
  const fr = toFraction(P / Math.PI, 24);
  if (!fr) return fmtNum(P) + 'k';
  return (fr.p === 1 ? '' : String(fr.p)) + '\u03c0k' + (fr.q === 1 ? '' : '/' + fr.q);
}

function solveNumericEquation(eq, v, win) {
  const out = newOut();
  const env = {};
  const F = (x) => {
    env[v] = x;
    return evalNum(eq.lhs, env) - evalNum(eq.rhs, env);
  };
  const trig = usesTrig(eq.lhs) || usesTrig(eq.rhs);
  let P = trig && !win ? findPeriod(F) : 0;
  const lo = win ? win.lo : P ? 0 : -SCAN_LIMIT;
  const hi = win ? win.hi : P ? P : SCAN_LIMIT;
  const steps = win ? Math.min(160000, Math.max(8000, Math.ceil((hi - lo) * 500))) : P ? 6000 : 80000;
  const h = (hi - lo) / steps;
  const xs = new Array(steps + 1);
  const fs = new Array(steps + 1);
  for (let i = 0; i <= steps; i++) {
    xs[i] = lo + i * h;
    fs[i] = F(xs[i]);
  }
  const tol = (x) => {
    env[v] = x;
    return 1e-9 * (1 + Math.abs(evalNum(eq.lhs, env)) + Math.abs(evalNum(eq.rhs, env)));
  };
  let roots = [];
  const deadline = Date.now() + SCAN_BUDGET_MS;
  let truncated = false;
  let refinements = 0;
  const mid = steps >> 1;
  for (let k = 0; k <= steps; k++) {
    if ((k & 255) === 0 && (roots.length > MAX_SCAN_ROOTS || Date.now() > deadline)) {
      truncated = true;
      break;
    }
    const i = mid + (k & 1 ? (k + 1) >> 1 : -(k >> 1)); // 0, +1, -1, +2, -2 ... around the middle of the window
    if (i < 0 || i > steps) continue;
    const f = fs[i];
    if (!isFinite(f)) continue;
    if (f === 0) {
      roots.push(xs[i]);
      continue;
    }
    if (i < steps && isFinite(fs[i + 1]) && fs[i + 1] !== 0 && (f < 0) !== (fs[i + 1] < 0)) {
      const r = bisect(F, xs[i], xs[i + 1]);
      if (Math.abs(F(r)) <= 1e-6 * (1 + Math.abs(f) + Math.abs(fs[i + 1]))) roots.push(r);
    }
    if (i > 0 && i < steps && isFinite(fs[i - 1]) && isFinite(fs[i + 1]) && (f < 0) === (fs[i - 1] < 0) && (f < 0) === (fs[i + 1] < 0) &&
        Math.abs(f) <= Math.abs(fs[i - 1]) && Math.abs(f) <= Math.abs(fs[i + 1]) &&
        Math.abs(f) < 0.5 * Math.max(Math.abs(fs[i - 1]), Math.abs(fs[i + 1])) && ++refinements <= 400) {
      let m = minimizeAbs(F, xs[i - 1], xs[i + 1]);
      // a touching root is where the slope changes sign: polish it with a bisection on the slope (the minimum itself is only good to about 1e-8)
      const D = (x) => (F(x + 1e-5) - F(x - 1e-5)) / 2e-5;
      const d0 = D(xs[i - 1]);
      const d1 = D(xs[i + 1]);
      if (isFinite(d0) && isFinite(d1) && (d0 < 0) !== (d1 < 0)) {
        const mm = bisect(D, xs[i - 1], xs[i + 1]);
        if (Math.abs(F(mm)) <= Math.abs(F(m)) + 1e-15) m = mm;
      }
      if (Math.abs(F(m)) <= tol(m)) roots.push(m);
    }
  }
  if (fs.every((f) => isFinite(f) && Math.abs(f) < 1e-12)) {
    out.answer.push('true for every ' + v + ' (the two sides are identical)');
    return out;
  }
  if (P) roots = roots.map((r) => ((r % P) + P) % P).map((r) => (P - r < 1e-9 ? 0 : r));
  if (win) {
    // the end points of the interval are tested on their own (the scan only sees sign changes)
    [[win.lo, win.loInc], [win.hi, win.hiInc]].forEach(([e, inc]) => {
      if (inc && Math.abs(F(e)) <= Math.max(tol(e), 1e-11)) roots.push(e);
    });
    roots = roots.filter((r) => (r > win.lo || (win.loInc && Math.abs(r - win.lo) < 1e-9 * (1 + Math.abs(r)))) && (r < win.hi || (win.hiInc && Math.abs(r - win.hi) < 1e-9 * (1 + Math.abs(r)))));
    roots = roots.filter((r) => !(!win.loInc && Math.abs(r - win.lo) < 1e-9) && !(!win.hiInc && Math.abs(r - win.hi) < 1e-9));
  }
  roots.sort((a, b) => a - b);
  const uniq = [];
  for (const r of roots) if (!uniq.length || r - uniq[uniq.length - 1] > 1e-7 * (1 + Math.abs(r))) uniq.push(r);
  out.work.push('Type: equation with ' + (win ? 'an interval for ' + v + (trig ? ' (trigonometric functions)' : '') : trig ? 'trigonometric functions' : 'a non-polynomial expression (root, exponential, logarithm, absolute value ...)') + ' - solved numerically (exact names are shown when they are recognised)');
  // The solution set may repeat faster than the function itself (e.g. sin x = cos x: every pi, not 2 pi).
  if (P && uniq.length) {
    for (let m = 12; m >= 2; m--) {
      const P2 = P / m;
      const closed = uniq.every((r) => uniq.some((s) => {
        const d = Math.abs(((r + P2) % P) - s);
        return Math.min(d, P - d) < 1e-7;
      }));
      if (closed) {
        const base = uniq.filter((r) => r < P2 - 1e-9);
        uniq.length = 0;
        uniq.push(...base);
        P = P2;
        break;
      }
    }
  }
  if (truncated) out.notes.push('The search was stopped early because the function oscillates too fast or has too many solutions, so this answer is incomplete.');
  if (!uniq.length) {
    out.answer.push(truncated ? 'could not find a solution before the search was stopped' : 'no real solution found' + (win ? ' in the interval' : P ? '' : ' between ' + v + ' = -' + SCAN_LIMIT + ' and ' + SCAN_LIMIT));
    return out;
  }
  let total = uniq.length;
  if (total > MAX_LISTED) {
    uniq.sort((a, b) => Math.abs(a) - Math.abs(b));
    uniq.length = MAX_LISTED;
    uniq.sort((a, b) => a - b);
    out.notes.push('Found ' + total + ' solutions; showing the ' + MAX_LISTED + ' closest to 0.');
  }
  for (const r of uniq) {
    const rec = recognize(r);
    const d = fmtNum(r);
    let line;
    if (P) {
      if (!rec) line = v + ' \u2248 ' + d + ' + ' + periodStep(P);
      else if (rec.text === '0') line = v + ' = ' + periodStep(P);
      else line = v + ' = ' + rec.text + ' + ' + periodStep(P);
      if (rec && /\u03c0/.test(rec.text)) {
        const deg = (r * 180) / Math.PI;
        const dfr = toFraction(deg, 6);
        if (dfr) line += '  [' + (dfr.q === 1 ? dfr.p : fmtNum(deg)) + '\u00b0 + ' + (360 / Math.round((2 * Math.PI) / P)) + '\u00b0k]';
      }
    } else {
      line = rec ? (rec.rational && !rec.text.includes('/') ? v + ' = ' + rec.text : v + ' = ' + rec.text + ' (' + approxSym(r) + ' ' + d + ')') : v + ' \u2248 ' + d;
      if (win && rec && /\u03c0/.test(rec.text)) {
        const deg = (r * 180) / Math.PI;
        const dfr = toFraction(deg, 6);
        if (dfr) line += '  [' + (dfr.q === 1 ? dfr.p : fmtNum(deg)) + '\u00b0]';
      }
    }
    out.answer.push(line);
  }
  if (win) {
    const bt = (x) => { const rc = recognize(x); return rc ? rc.text : fmtNum(x); };
    out.notes.push('Solutions with ' + bt(win.lo) + (win.loInc ? ' ≤ ' : ' < ') + v + (win.hiInc ? ' ≤ ' : ' < ') + bt(win.hi) + ' (' + uniq.length + ' found).');
  }
  else if (P) out.notes.push('The equation repeats every ' + periodText(P) + ' (k is any integer). The solutions listed are those in 0 ≤ ' + v + ' < ' + periodText(P) + '.');
  else out.notes.push('Searched for real solutions between ' + v + ' = -' + SCAN_LIMIT + ' and ' + SCAN_LIMIT + '.');
  out.check = uniq.every((r) => Math.abs(F(r)) <= Math.max(tol(r), 1e-7)) ? 'substituting back gives equal sides (to numerical precision)' : null;
  return out;
}

function solveOneUnknown(eq, v) {
  const dom = [];
  let f;
  try {
    const env = new Map([[v, RF_X]]);
    f = rfSub(evalRF(eq.lhs, env, dom), evalRF(eq.rhs, env, dom));
  } catch (e) {
    if (e instanceof NotAlgebraic) return solveNumericEquation(eq, v);
    throw e;
  }
  return solveRationalEquation(f, dom, eq, v);
}

// ---- inequalities (one unknown, polynomial / fractional) ----------------------------
function solveInequalities(conds, v) {
  const out = newOut();
  const dom = [];
  const parts = [];
  for (const c of conds) {
    try {
      const env = new Map([[v, RF_X]]);
      parts.push({ f: rfSub(evalRF(c.lhs, env, dom), evalRF(c.rhs, env, dom)), op: c.op });
    } catch (e) {
      if (e instanceof NotAlgebraic) return solveInequalitiesNumeric(conds, v);
      throw e;
    }
  }
  const pts = [];
  const addRoots = (poly, tag, partIdx) => {
    if (poly.length < 2) return;
    for (const r of polyRoots(poly).real) {
      let p = pts.find((q) => Math.abs(q.val - r.val) < 1e-9 * (1 + Math.abs(r.val)));
      if (!p) {
        p = { val: r.val, text: r.text || fmtNum(r.val), approx: !r.text, undef: false, zero: new Set() };
        pts.push(p);
      }
      if (tag === 'undef') p.undef = true;
      else p.zero.add(partIdx);
    }
  };
  parts.forEach((p, k) => {
    addRoots(p.f.n, 'zero', k);
    addRoots(p.f.d, 'undef', k);
  });
  dom.forEach((P) => addRoots(P, 'undef', -1));
  pts.sort((a, b) => a.val - b.val);
  const sat = (s, op) => {
    switch (op) {
      case '<': return s < 0;
      case '>': return s > 0;
      case '<=': return s <= 0;
      case '>=': return s >= 0;
      default: return s !== 0;
    }
  };
  const signAt = (p, t) => Math.sign(pevalNum(p.f.n, t)) * Math.sign(pevalNum(p.f.d, t));
  const regionOk = (t) => parts.every((p) => sat(signAt(p, t), p.op));
  const items = [];
  const testPoints = [];
  if (!pts.length) testPoints.push(0);
  else {
    testPoints.push(pts[0].val - Math.max(1, Math.abs(pts[0].val)));
    for (let i = 0; i + 1 < pts.length; i++) testPoints.push((pts[i].val + pts[i + 1].val) / 2);
    testPoints.push(pts[pts.length - 1].val + Math.max(1, Math.abs(pts[pts.length - 1].val)));
  }
  for (let i = 0; i < testPoints.length; i++) {
    items.push({ kind: 'region', ok: regionOk(testPoints[i]) });
    if (i < pts.length) {
      const p = pts[i];
      const ok = !p.undef && parts.every((part, k) => sat(p.zero.has(k) ? 0 : signAt(part, p.val), part.op));
      items.push({ kind: 'point', ok, p });
    }
  }
  // maximal runs of satisfied items -> intervals
  const intervals = [];
  for (let i = 0; i < items.length; ) {
    if (!items[i].ok) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < items.length && items[j + 1].ok) j++;
    const first = items[i];
    const last = items[j];
    const iv = { lo: null, loIncl: false, hi: null, hiIncl: false };
    if (first.kind === 'point') {
      iv.lo = first.p;
      iv.loIncl = true;
    } else if (i > 0) iv.lo = items[i - 1].p;
    if (last.kind === 'point') {
      iv.hi = last.p;
      iv.hiIncl = true;
    } else if (j + 1 < items.length) iv.hi = items[j + 1].p;
    intervals.push(iv);
    i = j + 1;
  }
  out.work.push('Type: inequality; write it as an expression compared with 0 and find where it changes sign');
  if (pts.length) out.work.push('Critical points (zero or undefined): ' + listJoin(pts.map((p) => v + ' = ' + (p.approx ? '≈' : '') + p.text + (p.undef ? ' (undefined)' : ''))));
  formatIntervals(intervals, v, out);
  return out;
}

/** Interval list -> "x < 2 or x ≥ 5" and "(-∞, 2) ∪ [5, ∞)". Endpoints: {val, text, approx}. */
function formatIntervals(intervals, v, out) {
  const num = (p) => (p.approx ? '≈' : '') + p.text;
  const isPoint = (iv) => iv.lo && iv.hi && Math.abs(iv.lo.val - iv.hi.val) <= 1e-12 * (1 + Math.abs(iv.lo.val));
  if (!intervals.length) {
    out.answer.push('no solution');
    return;
  }
  if (intervals.length === 1 && intervals[0].lo === null && intervals[0].hi === null) {
    out.answer.push('all real numbers');
    return;
  }
  const setText = intervals.map((iv) => {
    if (isPoint(iv)) return '{' + num(iv.lo) + '}';
    return (iv.lo ? (iv.loIncl ? '[' : '(') + num(iv.lo) : '(-∞') + ', ' + (iv.hi ? num(iv.hi) + (iv.hiIncl ? ']' : ')') : '∞)');
  }).join(' ∪ ');
  const condText = intervals.map((iv) => {
    if (isPoint(iv)) return v + ' = ' + num(iv.lo);
    if (!iv.lo) return v + (iv.hiIncl ? ' ≤ ' : ' < ') + num(iv.hi);
    if (!iv.hi) return v + (iv.loIncl ? ' ≥ ' : ' > ') + num(iv.lo);
    return num(iv.lo) + (iv.loIncl ? ' ≤ ' : ' < ') + v + (iv.hiIncl ? ' ≤ ' : ' < ') + num(iv.hi);
  }).join(' or ');
  out.answer.push(condText);
  out.answer.push(v + ' ∈ ' + setText + '  (interval notation)');
}

/** Inequalities that are not polynomial/fractional (abs, roots, exp, log ...): scan numerically. */
function solveInequalitiesNumeric(conds, v) {
  const out = newOut();
  if (conds.some((c) => usesTrig(c.lhs) || usesTrig(c.rhs))) {
    throw new MathError('inequalities with trigonometric functions are not supported');
  }
  const env = {};
  // fuzzy: equality is accepted within rounding error (used to decide whether an endpoint is included);
  // exact: plain comparison (used to locate the endpoints as precisely as possible)
  const holds = (x, exact) => {
    env[v] = x;
    for (const c of conds) {
      const l = evalNum(c.lhs, env);
      const r = evalNum(c.rhs, env);
      if (!isFinite(l) || !isFinite(r)) return false;
      const d = l - r;
      const eps = exact ? 0 : 1e-12 * (1 + Math.abs(l) + Math.abs(r));
      let ok;
      switch (c.op) {
        case '<': ok = d < -eps; break;
        case '>': ok = d > eps; break;
        case '<=': ok = d <= eps; break;
        case '>=': ok = d >= -eps; break;
        default: ok = Math.abs(d) > eps;
      }
      if (!ok) return false;
    }
    return true;
  };
  const N = 80000;
  const h = (2 * SCAN_LIMIT) / N;
  const xs = new Array(N + 1);
  const ts = new Array(N + 1);
  for (let i = 0; i <= N; i++) {
    xs[i] = -SCAN_LIMIT + i * h;
    ts[i] = holds(xs[i], true);
  }
  const boundary = (a, b) => {
    const ta = holds(a, true);
    for (let i = 0; i < 200; i++) {
      const m = (a + b) / 2;
      if (holds(m, true) === ta) a = m;
      else b = m;
      if (Math.abs(b - a) <= 1e-15 * Math.max(1, Math.abs(a))) break;
    }
    const x = (a + b) / 2;
    const rec = recognize(x);
    return rec ? { val: rec.val, text: rec.text, approx: false } : { val: x, text: fmtNum(x), approx: true };
  };
  const intervals = [];
  let edgeNote = false;
  let truncated = false;
  const deadline = Date.now() + SCAN_BUDGET_MS;
  for (let i = 0; i <= N; ) {
    if (intervals.length > 100 || Date.now() > deadline) {
      truncated = true;
      break;
    }
    if (!ts[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j < N && ts[j + 1]) j++;
    const iv = { lo: null, loIncl: false, hi: null, hiIncl: false };
    if (i > 0) {
      iv.lo = boundary(xs[i - 1], xs[i]);
      iv.loIncl = holds(iv.lo.val);
    } else edgeNote = true;
    if (j < N) {
      iv.hi = boundary(xs[j], xs[j + 1]);
      iv.hiIncl = holds(iv.hi.val);
    } else edgeNote = true;
    intervals.push(iv);
    i = j + 1;
  }
  out.work.push('Type: inequality with a non-polynomial expression (absolute value, root, exponential, logarithm ...) - solved by scanning for where it changes truth value');
  if (truncated) out.notes.push('The search was stopped early because the solution set has too many pieces, so this answer is incomplete.');
  if (edgeNote) out.notes.push('Assumed the solution set continues beyond ' + v + ' = ±' + SCAN_LIMIT + ' where it reaches that edge.');
  formatIntervals(intervals, v, out);
  return out;
}

// ---- several unknowns: exact linear algebra --------------------------------------------
function affineForm(eq, vars) {
  const dom = [];
  const F = (vals) => {
    const env = new Map(vars.map((name, j) => [name, rfConst(vals[j])]));
    const r = rfSub(evalRF(eq.lhs, env, dom), evalRF(eq.rhs, env, dom));
    return rfConstQ(r);
  };
  try {
    const zero = vars.map(() => Q0);
    const c0 = F(zero);
    const coef = vars.map((_, j) => F(zero.map((z, k) => (k === j ? Q1 : Q0))).sub(c0));
    const tests = [[2, 5, -9, 3], [-1, 4, 7, -6], [13, -2, 1, 8], [-7, -3, 11, 2]];
    for (const t of tests) {
      const pt = vars.map((_, j) => new Q(BigInt(t[j % 4] + j), BigInt(1 + (j % 3))));
      let pred = c0;
      pt.forEach((val, j) => { pred = pred.add(coef[j].mul(val)); });
      if (!F(pt).eq(pred)) return null;
    }
    return { coef, c0 };
  } catch (e) {
    if (e instanceof NotAlgebraic || e instanceof MathError) return null;
    throw e;
  }
}
function linText(c, terms) {
  let out = '';
  const nz = terms.filter((t) => !t[0].isZero());
  if (!c.isZero() || !nz.length) out = c.toString();
  for (const [q, name] of nz) {
    const a = q.abs();
    const mag = a.eq(Q1) ? name : a.isInt() ? a.toString() + name : '(' + a.toString() + ')' + name;
    if (!out) out = (q.sign() < 0 ? '-' : '') + mag;
    else out += (q.sign() < 0 ? ' - ' : ' + ') + mag;
  }
  return out;
}
function rrefQ(rows, ncols) {
  const M = rows.map((r) => r.slice());
  const pivots = [];
  let r = 0;
  for (let c = 0; c < ncols && r < M.length; c++) {
    let p = -1;
    for (let i = r; i < M.length; i++) {
      if (!M[i][c].isZero()) {
        p = i;
        break;
      }
    }
    if (p < 0) continue;
    [M[r], M[p]] = [M[p], M[r]];
    const inv = M[r][c].inv();
    M[r] = M[r].map((x) => x.mul(inv));
    for (let i = 0; i < M.length; i++) {
      if (i !== r && !M[i][c].isZero()) {
        const f = M[i][c];
        M[i] = M[i].map((x, k) => x.sub(f.mul(M[r][k])));
      }
    }
    pivots.push(c);
    r++;
  }
  const inconsistent = M.some((row) => row.slice(0, ncols).every((x) => x.isZero()) && !row[ncols].isZero());
  return { M, pivots, inconsistent };
}
const qLabel = (q) => (q.isInt() ? bigText(q.n) : q.toString() + ' (' + approxSym(q.toNumber()) + ' ' + fmtNum(q.toNumber()) + ')');

function solveLinear(eqs, vars, forms, solveFor) {
  const out = newOut();
  let order = vars.map((_, i) => i);
  if (solveFor && vars.includes(solveFor)) order = [vars.indexOf(solveFor)].concat(order.filter((i) => vars[i] !== solveFor));
  const names = order.map((i) => vars[i]);
  const rows = forms.map((f) => order.map((i) => f.coef[i]).concat([f.c0.neg()]));
  const { M, pivots, inconsistent } = rrefQ(rows, names.length);
  out.work.push('Type: ' + (eqs.length === 1 ? 'linear equation with several unknowns' : 'system of ' + eqs.length + ' linear equations in ' + names.length + ' unknowns'));
  if (inconsistent) {
    out.answer.push('no solution (the equations contradict each other)');
    return out;
  }
  const free = names.map((_, c) => c).filter((c) => !pivots.includes(c));
  if (!free.length) {
    const sol = [];
    pivots.forEach((c, i) => { sol[c] = M[i][names.length]; });
    out.answer.push(names.map((nm, c) => nm + ' = ' + qLabel(sol[c])).join(', '));
    const byName = new Map(names.map((nm, c) => [nm, sol[c]]));
    const okAll = forms.every((f) => {
      let s = f.c0;
      vars.forEach((nm, j) => { s = s.add(f.coef[j].mul(byName.get(nm))); });
      return s.isZero();
    });
    out.check = okAll ? 'substituting the solution into every equation gives equal sides' : null;
    out.work.push('Solved exactly by Gaussian elimination');
    return out;
  }
  if (eqs.length === 1 && !solveFor) {
    // express each unknown with a non-zero coefficient in terms of the others
    vars.forEach((nm, j) => {
      const c = forms[0].coef[j];
      if (c.isZero()) return;
      const terms = vars.map((o, k) => [forms[0].coef[k].neg().div(c), o]).filter((t, k) => k !== j);
      out.answer.push(nm + ' = ' + linText(forms[0].c0.neg().div(c), terms));
    });
    out.notes.push('One equation cannot fix several unknowns; each unknown is given in terms of the others. Add more equations (separated by ";") for numbers.');
    return out;
  }
  const express = (c, i) => names[c] + ' = ' + linText(M[i][names.length], free.map((f) => [M[i][f].neg(), names[f]]));
  if (solveFor && pivots[0] === 0) {
    out.answer.push(express(0, 0));
    out.notes.push(free.map((f) => names[f]).join(', ') + (free.length > 1 ? ' can be any numbers' : ' can be any number') + ' (the equations do not fix ' + (free.length > 1 ? 'them' : 'it') + ').');
    return out;
  }
  pivots.forEach((c, i) => out.answer.push(express(c, i)));
  out.answer.push(free.map((f) => names[f]).join(', ') + (free.length > 1 ? ' can be any numbers' : ' can be any number'));
  out.notes.push('The equations do not determine all unknowns, so there are infinitely many solutions.');
  return out;
}

// ---- several unknowns: nonlinear systems (numeric) --------------------------------------
function solveFloatLinear(A, b) {
  const n = b.length;
  const M = A.map((r, i) => r.concat([b[i]]));
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let i = c + 1; i < n; i++) if (Math.abs(M[i][c]) > Math.abs(M[p][c])) p = i;
    if (Math.abs(M[p][c]) < 1e-14) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let i = c + 1; i < n; i++) {
      const f = M[i][c] / M[c][c];
      for (let k = c; k <= n; k++) M[i][k] -= f * M[c][k];
    }
  }
  const x = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n];
    for (let k = i + 1; k < n; k++) s -= M[i][k] * x[k];
    x[i] = s / M[i][i];
  }
  return x;
}
/** Real solutions of F(x) = 0 (F: array of n numbers -> array of n residuals) by Newton's method from a grid of starting points. */
function newtonSolutions(F, n) {
  const norm = (a) => Math.max(...a.map(Math.abs));
  const grid = n >= 4 ? [-5, -1.5, -0.4, 0.4, 1.5, 5] : n === 3 ? [-6, -2, -0.5, 0.5, 2, 6] : [-10, -5, -2.5, -1, -0.3, 0.3, 1, 2.5, 5, 10];
  const starts = [[]];
  for (let k = 0; k < n; k++) {
    const next = [];
    for (const s of starts) for (const g of grid) next.push(s.concat([g]));
    starts.splice(0, starts.length, ...next);
  }
  const sols = [];
  for (const s0 of starts) {
    let x = s0.slice();
    let fx = F(x);
    if (!fx.every(isFinite)) continue;
    for (let it = 0; it < 80 && norm(fx) > 1e-13; it++) {
      const J = [];
      for (let j = 0; j < n; j++) {
        const h = 1e-6 * Math.max(1, Math.abs(x[j]));
        const xp = x.slice(); xp[j] += h;
        const xm = x.slice(); xm[j] -= h;
        const fp = F(xp);
        const fm = F(xm);
        J.push(fp.map((v, i) => (v - fm[i]) / (2 * h)));
      }
      const A = fx.map((_, i) => J.map((col) => col[i]));
      if (!A.every((r) => r.every(isFinite))) break;
      const d = solveFloatLinear(A, fx.map((v) => -v));
      if (!d) break;
      let t = 1;
      let moved = false;
      for (let ls = 0; ls < 30; ls++) {
        const xn = x.map((v, i) => v + t * d[i]);
        const fn = F(xn);
        if (fn.every(isFinite) && norm(fn) < norm(fx)) {
          x = xn;
          fx = fn;
          moved = true;
          break;
        }
        t /= 2;
      }
      if (!moved) break;
    }
    if (norm(fx) < 1e-9 && x.every((v) => Math.abs(v) < 1e6) && !sols.some((s) => s.every((v, i) => Math.abs(v - x[i]) < 1e-6 * (1 + Math.abs(v))))) sols.push(x);
    if (sols.length >= 12) break;
  }
  sols.sort((a, b) => a[0] - b[0] || (a[1] || 0) - (b[1] || 0));
  return sols;
}
function solveNonlinear(eqs, vars) {
  const out = newOut();
  const n = vars.length;
  if (eqs.length !== n) {
    throw new MathError('there are ' + n + ' unknowns (' + vars.join(', ') + ') but ' + eqs.length + ' equation' + (eqs.length === 1 ? '' : 's') + '; I need the same number of equations as unknowns');
  }
  if (n > 3) throw new MathError('at most 3 unknowns are supported for non-linear systems');
  const env = {};
  const F = (x) => {
    vars.forEach((nm, i) => { env[nm] = x[i]; });
    return eqs.map((e) => evalNum(e.lhs, env) - evalNum(e.rhs, env));
  };
  const sols = newtonSolutions(F, n);
  out.work.push('Type: system of ' + n + ' non-linear equations - solved numerically (Newton’s method from many starting points)');
  if (!sols.length) {
    out.answer.push('no real solution found');
    return out;
  }
  for (const s of sols) out.answer.push(vars.map((nm, i) => nm + ' ' + describeEq(s[i])).join(', '));
  out.notes.push('Only real solutions with |value| ≤ 10 near the search grid are found; there could be others.');
  return out;
}
/** "= 3", "= √2 (≈ 1.4142136)" or "≈ 2.3456" for a floating value. */
function describeEq(x) {
  const rec = recognize(x);
  if (!rec) return '≈ ' + fmtNum(x);
  if (rec.rational && !rec.text.includes('/')) return '= ' + rec.text;
  return '= ' + rec.text + ' (' + approxSym(x) + ' ' + fmtNum(x) + ')';
}

// ---- plain evaluation ------------------------------------------------------------------
function evaluateExpression(node) {
  const out = newOut();
  const vars = collectVars(node, new Set());
  if (vars.size > 1) throw new MathError('this is an expression with several unknowns (' + sortedVars(vars).join(', ') + '), not an equation; write "= something" or give the other equations');
  if (vars.size === 1) {
    const v = sortedVars(vars)[0];
    try {
      const r = evalRF(node, new Map([[v, RF_X]]), []);
      out.work.push('Type: expression with one unknown, simplified (no equation to solve)');
      out.answer.push(r.d.length === 1 ? polyText(r.n, v) : '(' + polyText(r.n, v) + ')/(' + polyText(r.d, v) + ')');
      return out;
    } catch (e) {
      if (e instanceof NotAlgebraic) throw new MathError('this expression contains the unknown ' + v + ' but no "="; I cannot simplify it. Write the full equation');
      throw e;
    }
  }
  out.work.push('Type: arithmetic');
  try {
    const q = rfConstQ(evalRF(node, new Map(), []));
    out.answer.push(qLabel(q));
    return out;
  } catch (e) {
    if (!(e instanceof NotAlgebraic)) throw e;
  }
  try {
    const S = fromAst(node);
    const ev = varsOfS(S).size ? NaN : numS(S, {});
    if (isFinite(ev)) {
      out.answer.push(symText(S));
      return out;
    }
  } catch (e) {
    if (!(e instanceof MathError)) throw e;
  }
  const val = evalNum(node, {});
  if (!isFinite(val)) throw new MathError('the result is undefined or not a real number');
  out.answer.push(describeNumber(val));
  return out;
}

function compareConstants(lhs, op, rhs) {
  const num = (n) => {
    const x = evalNum(n, {});
    if (!isFinite(x)) throw new MathError('a side of the statement is undefined or not a real number');
    return x;
  };
  let l;
  let r;
  try {
    const dom = [];
    const a = rfConstQ(evalRF(lhs, new Map(), dom));
    const b = rfConstQ(evalRF(rhs, new Map(), dom));
    const c = a.cmp(b);
    l = a.toNumber();
    r = b.toNumber();
    return { holds: { '=': c === 0, '<': c < 0, '>': c > 0, '<=': c <= 0, '>=': c >= 0, '!=': c !== 0 }[op], l, r };
  } catch (e) {
    if (!(e instanceof NotAlgebraic)) throw e;
  }
  l = num(lhs);
  r = num(rhs);
  const eq = Math.abs(l - r) <= 1e-12 * (1 + Math.abs(l) + Math.abs(r));
  return { holds: { '=': eq, '<': !eq && l < r, '>': !eq && l > r, '<=': eq || l < r, '>=': eq || l > r, '!=': !eq }[op], l, r };
}

// ---- driver for one problem -----------------------------------------------------------
function solveProblem(text, solveFor) {
  let norm = normalizeText(text);
  const sp = splitTarget(norm);
  if (sp.target) {
    norm = sp.text;
    solveFor = solveFor || sp.target;
  }
  const lp = tryLinearProgram(norm);
  if (lp) return lp;
  const parts = splitStatements(stripAsk(norm)).map(cleanStatement).filter(Boolean);
  if (!parts.length) throw new MathError('no math was found in the input');
  let sts = parts.map(parseStatement);
  const cxResult = tryComplex(sts, false);
  if (cxResult) return cxResult;
  const special = trySpecial(sts, solveFor);
  if (special) return special;
  sts = sts.map(resolveCommandsStatement);
  const readAs = sts.map(showStatement).join(';  ');
  const windowed = tryWindowedEquation(sts);
  if (windowed) return { readAs, out: windowed };
  const kinds = new Set(sts.map((s) => s.kind));
  if (kinds.size > 1) throw new MathError('equations, inequalities and plain expressions cannot be mixed in one problem; send them as separate problems');
  let out;
  const kind = sts[0].kind;
  if (kind === 'expr') {
    try {
      if (sts.length > 1) {
        out = newOut();
        sts.forEach((st) => {
          const o = evaluateExpression(st.node);
          out.answer.push(showRaw(st.node) + ' = ' + o.answer[0]);
        });
      } else out = evaluateExpression(sts[0].node);
    } catch (e) {
      if (!(e instanceof MathError) || !/not a real number|undefined/.test(e.message)) throw e;
      let alt = null;
      try {
        alt = tryComplex(sts, true);
      } catch (e2) {
        alt = null;
      }
      if (!alt) throw e;
      return alt;
    }
  } else if (kind === 'rel') {
    const conds = [];
    sts.forEach((s) => conds.push(...s.conds));
    const vars = new Set();
    conds.forEach((c) => { collectVars(c.lhs, vars); collectVars(c.rhs, vars); });
    if (vars.size === 0) {
      out = newOut();
      const res = conds.map((c) => compareConstants(c.lhs, c.op, c.rhs));
      const all = res.every((r) => r.holds);
      out.answer.push(all ? 'True' : 'False');
      out.work.push('Left side = ' + fmtNum(res[0].l) + ', right side = ' + fmtNum(res[0].r));
    } else if (vars.size === 1) {
      out = solveInequalities(conds, sortedVars(vars)[0]);
    } else if (sortedVars(vars).join('') === 'xy' && !solveFor) {
      out = pl2Region(conds.map((c) => ({ lhs: c.lhs, op: c.op, rhs: c.rhs })), { vx: 'x', vy: 'y', xr: [-6, 6], yr: [-6, 6], auto: true });
    } else {
      throw new MathError('inequalities with several unknowns (' + sortedVars(vars).join(', ') + ') are not supported');
    }
  } else {
    const eqs = sts;
    const vars = new Set();
    eqs.forEach((e) => { collectVars(e.lhs, vars); collectVars(e.rhs, vars); });
    const names = sortedVars(vars);
    if (solveFor && !names.includes(solveFor)) solveFor = names.find((n) => n.toLowerCase() === String(solveFor).toLowerCase()) || solveFor;
    if (names.length === 0) {
      out = newOut();
      const res = eqs.map((e) => compareConstants(e.lhs, '=', e.rhs));
      const all = res.every((r) => r.holds);
      out.answer.push(all ? 'True: both sides are equal (' + fmtNum(res[0].l) + ')' : 'False: ' + fmtNum(res[0].l) + ' ≠ ' + fmtNum(res[0].r));
    } else if (names.length === 1 && eqs.length === 1) {
      out = solveOneUnknown(eqs[0], names[0]);
    } else if (names.length === 2 && eqs.length === 1 && !solveFor && conicCoefficients(eqs[0].lhs, eqs[0].rhs)) {
      out = newOut();
      out.work.push('Type: conic section (second-degree equation in x and y)');
      analyzeConic(conicCoefficients(eqs[0].lhs, eqs[0].rhs), out);
    } else if (names.length === 3 && eqs.length === 1 && !solveFor && names.join('') === 'xyz' && (out = newOut()) && analyzeSurface(eqs[0], out)) {
      // a plane or a quadric surface: the analysis is already in out
    } else if (names.length >= 2 && eqs.length === 1 && !affineForm(eqs[0], names)) {
      out = solveLiteralEquation(eqs[0], names, solveFor);
    } else {
      const forms = eqs.map((e) => affineForm(e, names));
      if (forms.every(Boolean)) out = solveLinear(eqs, names, forms, solveFor);
      else if (names.length === 1) {
        // several equations in one unknown: solve the first, keep solutions that satisfy the rest
        out = solveOneUnknown(eqs[0], names[0]);
        out.notes.push('Only the first equation was solved; check the solutions against the others.');
      } else out = solveNonlinear(eqs, names);
    }
    if (!out) throw new MathError('could not solve this');
  }
  return { readAs, out };
}

function renderResult(readAs, out) {
  askFirst(out);
  const lines = ['Read as: ' + readAs];
  if (out.answer.length === 1) lines.push('Answer: ' + out.answer[0]);
  else {
    lines.push('Answer:');
    out.answer.forEach((a) => lines.push('  ' + a));
  }
  if (out.work.length) {
    lines.push('Working:');
    out.work.forEach((w) => lines.push('- ' + w));
  }
  if (out.check) lines.push('Check: ' + out.check);
  out.notes.forEach((n) => lines.push('Note: ' + n));
  return lines.join('\n');
}
