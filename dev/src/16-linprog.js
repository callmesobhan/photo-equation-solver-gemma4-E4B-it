// ======================================================================
// 16. Linear programming:  "maximize 3x + 2y subject to x + y <= 4, x <= 3, x >= 0, y >= 0"
//     Exact: every vertex of the feasible region is found with rational arithmetic.
//     Add the word "integer(s)" to restrict the variables to whole numbers.
// ======================================================================
const LP_START = /^\s*(?:please\s+)?(maxim(?:ize|ise)|minim(?:ize|ise)|max|min)\b(?!\s*\()\s*:?\s*([\s\S]*)$/;
const LP_BIG = qInt(10).pow(9);

function splitObjective(rest) {
  const m = /(?:\b(?:subject\s+to|such\s+that|where|given|constraints?|under)\b|\bs\.\s?t\.|\bs\/t\b)\s*:?|:/.exec(rest);
  if (m) return [rest.slice(0, m.index), rest.slice(m.index + m[0].length)];
  const parts = rest.split(/[;\n]/);
  if (parts.length > 1) return [parts[0], parts.slice(1).join(';')];
  return null;
}
function lpConstraintTexts(text) {
  let s = text.replace(/\band\b/g, ';');
  // "x, y >= 0" -> "x >= 0; y >= 0"
  s = s.replace(/((?:\u0002?[a-z](?:_\(?\w+\)?)?\s*,\s*)+\u0002?[a-z](?:_\(?\w+\)?)?)\s*(>=|<=|>|<)\s*([^,;\n]+)/g, (m, vars, op, rhs) => vars.split(',').map((v) => v.trim() + ' ' + op + ' ' + rhs.trim()).join('; '));
  return s.split(/[;\n,]/).map((t) => t.trim()).filter(Boolean);
}
const LP_SHOW = { '<=': '≤', '>=': '≥', '<': '<', '>': '>', '=': '=' };

function solveSquare(A, b) {
  const n = A.length;
  const { M, pivots, inconsistent } = rrefQ(A.map((r, i) => r.concat([b[i]])), n);
  if (inconsistent || pivots.length < n) return null;
  return M.map((r) => r[n]);
}
function* combinations_(m, k) {
  const idx = Array.from({ length: k }, (_, i) => i);
  if (k > m) return;
  for (;;) {
    yield idx.slice();
    let i = k - 1;
    while (i >= 0 && idx[i] === m - k + i) i--;
    if (i < 0) return;
    idx[i]++;
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
  }
}
function tryLinearProgram(text) {
  const m0 = LP_START.exec(text);
  if (!m0) return null;
  const goal = /^max/.test(m0[1]) ? 1 : -1;
  const parts = splitObjective(m0[2]);
  if (!parts) return null;
  let objText = parts[0].trim();
  const integerOnly = /\binteger|\bwhole\s+numbers?/.test(text);
  const nonNeg = /non-?\s?negative/.test(text);
  // clauses such as "x and y are integers" are not constraints
  const consClean = parts[1]
    .replace(/(?:[,;]\s*|\band\s+)?(?:\u0002?[a-z]\s*(?:,|\band\b)\s*)*\u0002?[a-z]\s+(?:are|is)\s+(?:all\s+)?(?:non-?\s?negative\s+)?(?:integers?|whole\s+numbers?)\b/g, ' ')
    .replace(/[^;,\n]*\b(?:integers?|whole\s+numbers?|non-?\s?negative)\b[^;,\n]*/g, ' ');
  const consText = lpConstraintTexts(consClean);
  if (!consText.length && !nonNeg) return null;
  // "z = 3x + 2y" -> the expression on the right
  const eqAt = topLevelRelations(objText).find((o) => o.op === '=');
  if (eqAt) objText = objText.slice(eqAt.i + 1);
  objText = cleanStatement(objText);
  let objNode;
  try {
    objNode = parseExpression(objText);
  } catch (e) {
    return null;
  }
  const sts = consText.map((t) => parseStatement(cleanStatement(t)));
  if (sts.some((s) => s.kind === 'expr')) throw new MathError('each constraint needs a relation such as x + y <= 4');
  const vars = new Set();
  collectVars(objNode, vars);
  const conds = [];
  sts.forEach((st) => {
    if (st.kind === 'eq') conds.push({ lhs: st.lhs, op: '=', rhs: st.rhs });
    else st.conds.forEach((c) => conds.push(c));
  });
  conds.forEach((c) => {
    collectVars(c.lhs, vars);
    collectVars(c.rhs, vars);
  });
  const names = sortedVars(vars);
  if (nonNeg) names.forEach((nm) => conds.push({ lhs: { t: 'var', name: nm }, op: '>=', rhs: { t: 'num', q: Q0, f: 0, text: '0' } }));
  if (names.length < 1 || names.length > 4) throw new MathError('linear programs with 1 to 4 variables are supported');
  if (conds.length > 16) throw new MathError('at most 16 constraints are supported');
  const form = (lhs, rhs) => affineForm({ lhs, rhs }, names);
  const obj = form(objNode, { t: 'num', q: Q0, f: 0, text: '0' });
  if (!obj) throw new MathError('the objective must be linear in the variables');
  // constraints as  a·x <= b
  const rows = [];
  const shown = [];
  conds.forEach((c) => {
    const f = form(c.lhs, c.rhs);
    if (!f) throw new MathError('every constraint must be linear: ' + showRaw(c.lhs) + ' ' + c.op + ' ' + showRaw(c.rhs));
    const a = f.coef;
    const b = f.c0.neg();
    const flip = c.op === '>=' || c.op === '>';
    const norm = flip ? a.map((v) => v.neg()) : a;
    const nb = flip ? b.neg() : b;
    rows.push({ a: norm, b: nb });
    if (c.op === '=') rows.push({ a: a.map((v) => v.neg()), b: b.neg() });
    shown.push(showRaw(c.lhs) + ' ' + LP_SHOW[c.op] + ' ' + showRaw(c.rhs));
  });
  const n = names.length;
  const box = [];
  names.forEach((_, j) => {
    const up = names.map((__, k) => (k === j ? Q1 : Q0));
    box.push({ a: up, b: LP_BIG, box: true });
    box.push({ a: up.map((v) => v.neg()), b: LP_BIG, box: true });
  });
  const all = rows.concat(box);
  const feasible = (x) => all.every((r) => r.a.reduce((s, c, j) => s.add(c.mul(x[j])), Q0).sub(r.b).sign() <= 0);
  const verts = [];
  const seen = new Set();
  for (const idx of combinations_(all.length, n)) {
    const x = solveSquare(idx.map((i) => all[i].a), idx.map((i) => all[i].b));
    if (!x || !feasible(x)) continue;
    const key0 = x.map((q) => q.toString()).join('|');
    if (seen.has(key0)) continue;
    seen.add(key0);
    verts.push(x);
  }
  const out = newOut();
  const readAs = (goal > 0 ? 'maximize ' : 'minimize ') + showRaw(objNode) + ' subject to ' + shown.join(';  ');
  const objVal = (x) => obj.coef.reduce((s, c, j) => s.add(c.mul(x[j])), obj.c0);
  const pointText = (x) => '(' + names.map((nm, j) => nm + ' = ' + qText(x[j])).join(', ') + ')';
  if (!verts.length) {
    out.answer.push('no feasible solution: the constraints contradict each other');
    return { readAs, out };
  }
  const onBox = (x) => x.some((q) => q.abs().sub(LP_BIG).sign() >= 0);
  const real = verts.filter((x) => !onBox(x));
  let best = null;
  verts.forEach((x) => {
    const v = objVal(x).mul(qInt(goal));
    if (best === null || v.sub(best).sign() > 0) best = v;
  });
  const optimal = verts.filter((x) => objVal(x).mul(qInt(goal)).eq(best));
  if (optimal.every(onBox)) {
    out.answer.push('unbounded: the objective can be made arbitrarily ' + (goal > 0 ? 'large' : 'small') + ' inside the feasible region');
    return { readAs, out };
  }
  const optimalReal = optimal.filter((x) => !onBox(x));
  if (integerOnly) {
    if (real.length !== verts.length) throw new MathError('integer programming needs a bounded feasible region');
    const lo = names.map((_, j) => floorQ(real.reduce((m, x) => (x[j].sub(m).sign() < 0 ? x[j] : m), real[0][j])));
    const hi = names.map((_, j) => real.reduce((m, x) => (x[j].sub(m).sign() > 0 ? x[j] : m), real[0][j]));
    const spans = names.map((_, j) => Number(floorQ(hi[j]).n - lo[j].n) + 1);
    if (spans.reduce((a, b) => a * b, 1) > 2000000) throw new MathError('the integer search region is too large');
    let bestI = null;
    let bestPts = [];
    const cur = [];
    const rec = (j) => {
      if (j === n) {
        const x = cur.map((v) => qInt(v));
        if (!feasible(x)) return;
        const v = objVal(x).mul(qInt(goal));
        if (bestI === null || v.sub(bestI).sign() > 0) {
          bestI = v;
          bestPts = [x];
        } else if (v.eq(bestI)) bestPts.push(x);
        return;
      }
      for (let v = Number(lo[j].n); v <= Number(floorQ(hi[j]).n); v++) {
        cur[j] = v;
        rec(j + 1);
      }
    };
    rec(0);
    if (!bestPts.length) {
      out.answer.push('no integer point satisfies all the constraints');
      return { readAs, out };
    }
    out.answer.push((goal > 0 ? 'maximum' : 'minimum') + ' value ' + qText(objVal(bestPts[0])) + ' (integer solution) at ' + bestPts.slice(0, 4).map(pointText).join(' or '));
    out.work.push('Without the integer requirement the optimum is ' + qText(objVal(optimalReal[0])) + ' at ' + pointText(optimalReal[0]) + '; the best whole-number point of the region was found by checking every one');
    return { readAs, out };
  }
  out.answer.push((goal > 0 ? 'maximum' : 'minimum') + ' value = ' + qText(objVal(optimalReal[0])) + ' at ' + optimalReal.slice(0, 4).map(pointText).join(' and ') + (optimal.length > 1 ? '  (optimal along a whole edge: every point between these corners' + (optimal.some(onBox) ? ', and along the unbounded edge,' : '') + ' gives the same value)' : ''));
  // vertices listed in order around the region for two variables
  let listed = real;
  if (n === 2 && real.length > 2) {
    const cx = real.reduce((s, x) => s + x[0].toNumber(), 0) / real.length;
    const cy = real.reduce((s, x) => s + x[1].toNumber(), 0) / real.length;
    listed = real.slice().sort((p, q) => Math.atan2(p[1].toNumber() - cy, p[0].toNumber() - cx) - Math.atan2(q[1].toNumber() - cy, q[0].toNumber() - cx));
  }
  if (real.length !== verts.length) out.notes.push('The feasible region is unbounded, but the objective is bounded in this direction.');
  out.work.push('Corner points of the feasible region (objective value in brackets): ' + listed.map((x) => pointText(x) + ' [' + qText(objVal(x)) + ']').join(';  '));
  out.work.push('The optimum of a linear objective lies at a corner point; all corner points were found exactly by solving every pair/triple of constraint boundaries and keeping the feasible ones.');
  return { readAs, out };
}
