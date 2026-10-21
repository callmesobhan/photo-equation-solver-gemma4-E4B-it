
// ======================================================================
// 90. Routing of command statements (integrate(...), det(...), matrices, ODEs ...)
//     A command handler returns an `out` object; when it yields one value it also sets
//     out.value = {S} | {q} | {num}, so commands can be used inside other expressions.
// ======================================================================

/** How the statement is shown in the "Read as" line. */
function readAsNode(n) {
  const c = n.t === 'call' && n.cmd && COMMANDS[n.fn];
  return c && c.show ? c.show(n) : showRaw(n);
}

function statementHas(st, types) {
  if (st.kind === 'expr') return hasNode(st.node, types);
  if (st.kind === 'eq') return hasNode(st.lhs, types) || hasNode(st.rhs, types);
  return st.nodes.some((x) => hasNode(x, types));
}

function runCommandCall(n) {
  const c = COMMANDS[n.fn];
  if (!c) throw new MathError('unknown command ' + n.fn);
  return c(n);
}

/** A command used inside an expression: its single value as a symbolic expression. */
function commandValueS(n) {
  const out = runCommandCall(n);
  const v = out.value;
  if (!v) throw new MathError('"' + n.fn + '" gives more than one value, so it cannot be used inside an expression');
  if (v.S) return v.S;
  if (v.q) return sN(v.q);
  if (typeof v.num === 'number' && isFinite(v.num)) return sN(qFromLiteral(String(v.num).replace(/^-/, '')).mul(v.num < 0 ? qInt(-1) : Q1));
  throw new MathError('"' + n.fn + '" gives no usable value here');
}

function evalCommandNode(n) {
  if (n.t === 'call' && n.cmd) return runCommandCall(n);
  return matrixExpression(n);
}

/** Replace command calls inside an expression by their values (so equations can contain them). */
function resolveNode(n) {
  switch (n.t) {
    case 'call':
      if (n.cmd) return sAst(commandValueS(n));
      return { ...n, args: n.args.map(resolveNode) };
    case 'neg': case 'fact': case 'pct': return { ...n, a: resolveNode(n.a) };
    case 'bin': return { ...n, a: resolveNode(n.a), b: resolveNode(n.b) };
    default: return n;
  }
}
function resolveCommandsStatement(st) {
  if (st.kind === 'eq' && (hasCommand(st.lhs) || hasCommand(st.rhs))) return { ...st, lhs: resolveNode(st.lhs), rhs: resolveNode(st.rhs) };
  if (st.kind === 'rel' && st.nodes.some(hasCommand)) {
    const nodes = st.nodes.map(resolveNode);
    return { ...st, nodes, conds: st.conds.map((c, k) => ({ ...c, lhs: nodes[k], rhs: nodes[k + 1] })) };
  }
  return st;
}

/** Returns {readAs, out} for statements that are commands / matrix expressions / ODEs, else null. */
function trySpecial(sts, solveFor) {
  if (sts.some((s) => statementHas(s, ['dvar']))) return solveODEStatements(sts);
  if (sts.every((s) => s.kind === 'expr') && sts.some((s) => hasCommand(s.node) || hasNode(s.node, ['list']))) {
    if (sts.length === 1) return { readAs: readAsNode(sts[0].node), out: evalCommandNode(sts[0].node) };
    const out = newOut();
    sts.forEach((st) => {
      const o = evalCommandNode(st.node);
      out.answer.push(readAsNode(st.node) + '  ->  ' + o.answer.join(';  '));
    });
    return { readAs: sts.map((s) => readAsNode(s.node)).join(';  '), out };
  }
  return null;
}
