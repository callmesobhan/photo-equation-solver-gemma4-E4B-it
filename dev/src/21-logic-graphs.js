// ======================================================================
// 21. Propositional logic (truth tables, tautologies, equivalence, minimal forms) and graph theory
//     (degrees, connectivity, bipartite / Euler tests, shortest paths, minimum spanning tree, maximum flow, colouring, traversal).
// ======================================================================

// ---- logic: the formula travels through the parser as one big number (its characters), because words and symbols such as
//      "p and not q" cannot be read as arithmetic ------------------------------------------------------------------------------------------------
const encodeText = (str) => {
  let hex = '';
  for (const ch of str) hex += ch.codePointAt(0).toString(16).padStart(6, '0');
  return BigInt('0x' + (hex || '0'));
};
const decodeText = (v) => {
  let hex = v.toString(16);
  while (hex.length % 6) hex = '0' + hex;
  let s = '';
  for (let i = 0; i < hex.length; i += 6) s += String.fromCodePoint(parseInt(hex.slice(i, i + 6), 16));
  return s;
};
const LOGIC_WORDS = /\b(?:and|or|not|xor|nand|nor|implies|iff|if|then|true|false|equivalent|to|is)\b/gi;
function looksLikeLogic(t) {
  let u = t.replace(LOGIC_WORDS, ' ');
  u = u.replace(/[∧∨¬⊕↔⇔→⇒⊻⊤⊥&|~!^()\s]|<->|<=>|->|=>|\\(?:land|lor|lnot|neg|oplus|to|implies|iff|leftrightarrow|rightarrow|wedge|vee)/g, ' ');
  u = u.replace(/\bT\b|\bF\b/g, ' ');
  if (/[^A-Za-z\s]/.test(u)) return false;
  if (/[A-Za-z]{2,}/.test(u)) return false;
  return /\b(?:and|or|not|xor|nand|nor|implies|iff)\b|\bequivalent\s+to\b|[∧∨¬⊕↔⇔→⇒⊻]|<->|<=>|->|=>|\\(?:land|lor|lnot|neg)|\bif\b[\s\S]*\bthen\b/i.test(t);
}
/** Called first by normalizeText: "truth table of p and (q or not r)", "p -> q ≡ ~p or q" become logic(<encoded text>). */
function convertLogic(raw) {
  let t = String(raw).trim();
  if (!t || /^\s*(?:help|commands)\b/i.test(t)) return raw;
  let wantTable = false;
  const m = /^\s*(?:please\s+)?(?:(?:make|build|give|find|construct|draw|show)\s+(?:me\s+)?(?:a\s+|the\s+)?)?(?:truth[\s-]*table|is|check|determine|simplify|prove|show)\s*(?:of|for|that|whether|if)?\s*[:]?\s*([\s\S]*?)\s*[?.]?\s*$/i.exec(t);
  if (/truth[\s-]*table/i.test(t)) {
    wantTable = true;
    const body = /truth[\s-]*table\s*(?:of|for)?\s*:?\s*([\s\S]*?)\s*[?.]?\s*$/i.exec(t);
    if (body && body[1]) t = body[1];
    if (/^\(([\s\S]*)\)$/.test(t) && !/\)[\s\S]*\(/.test(t.slice(1, -1).replace(/\([^()]*\)/g, ''))) {
      const inner = t.slice(1, -1);
      let depth = 0;
      let ok = true;
      for (const ch of inner) {
        if (ch === '(') depth++;
        if (ch === ')') depth--;
        if (depth < 0) ok = false;
      }
      if (ok && depth === 0) t = inner;
    }
  } else if (m && m[1] && /tautolog|contradiction|equivalent/i.test(t)) {
    t = t.replace(/\b(?:is|a|an|the|tautology|contradiction|equivalent|\?)\b/gi, ' ').trim();
  }
  const cand = t.replace(/\btruth[\s-]*table\b/gi, '').trim();
  if (!cand) return raw;
  const logic = /^logic\(/i.test(cand) ? false : wantTable || looksLikeLogic(cand.replace(/≡/g, ' equivalent to '));
  if (!logic) return raw;
  return 'logic(' + encodeText(cand) + ')';
}
const LOGIC_OPS = [
  { re: /^(?:↔|⇔|<->|<=>|\biff\b|\bxnor\b|\\leftrightarrow|\\iff)/i, op: 'iff', prec: 1, right: false },
  { re: /^(?:→|⇒|->|=>|\bimplies\b|\\rightarrow|\\to|\\implies)/i, op: 'imp', prec: 2, right: true },
  { re: /^(?:⊕|⊻|\bxor\b|\\oplus)/i, op: 'xor', prec: 3, right: false },
  { re: /^(?:∨|\bor\b|\||\\lor|\\vee)/i, op: 'or', prec: 4, right: false },
  { re: /^(?:\bnor\b)/i, op: 'nor', prec: 4, right: false },
  { re: /^(?:∧|\band\b|&&?|\\land|\\wedge|·)/i, op: 'and', prec: 5, right: false },
  { re: /^(?:\bnand\b)/i, op: 'nand', prec: 5, right: false },
];
function parseLogic(text) {
  const s = text.replace(/\bif\s+(.+?)\s+then\s+/gi, '($1) -> ').replace(/\\([a-z]+)/gi, '\\$1');
  let i = 0;
  const skip = () => {
    while (i < s.length && /\s/.test(s[i])) i++;
  };
  const vars = new Set();
  function peekOp() {
    skip();
    const rest = s.slice(i);
    for (const o of LOGIC_OPS) {
      const m = o.re.exec(rest);
      if (m) return { ...o, len: m[0].length };
    }
    return null;
  }
  function primary() {
    skip();
    const rest = s.slice(i);
    let m;
    if ((m = /^(?:¬|~|!|\bnot\b|\\lnot|\\neg)\s*/i.exec(rest))) {
      i += m[0].length;
      return { t: 'not', a: primary() };
    }
    if (s[i] === '(') {
      i++;
      const e = expr(0);
      skip();
      if (s[i] !== ')') throw new MathError('a bracket is not closed in the logical formula');
      i++;
      return postfix(e);
    }
    if ((m = /^(?:⊤|\btrue\b|\bT\b)/.exec(rest)) && !/^[A-Za-z]{2}/.test(rest.replace(/^T\b/, 'T '))) {
      i += m[0].length;
      return { t: 'const', v: true };
    }
    if ((m = /^(?:⊥|\bfalse\b|\bF\b)/.exec(rest))) {
      i += m[0].length;
      return { t: 'const', v: false };
    }
    if ((m = /^[A-Za-z]/.exec(rest)) && !/^[A-Za-z]{2}/.test(rest)) {
      i += 1;
      vars.add(m[0]);
      return postfix({ t: 'var', name: m[0] });
    }
    throw new MathError('I could not read the logical formula near "' + rest.slice(0, 12) + '"');
  }
  function postfix(e) {
    // p' or p̄ for negation is not supported; a prime after a letter is read as NOT
    if (s[i] === "'") {
      i++;
      return postfix({ t: 'not', a: e });
    }
    return e;
  }
  function expr(minPrec) {
    let left = primary();
    for (;;) {
      const o = peekOp();
      if (!o || o.prec < minPrec) break;
      i += o.len;
      const right = expr(o.right ? o.prec : o.prec + 1);
      left = { t: 'bin', op: o.op, a: left, b: right };
    }
    return left;
  }
  const tree = expr(0);
  skip();
  if (i < s.length) throw new MathError('I could not read the logical formula near "' + s.slice(i, i + 12) + '"');
  return { tree, vars: Array.from(vars).sort() };
}
function evalLogic(n, env) {
  switch (n.t) {
    case 'const': return n.v;
    case 'var': return env[n.name];
    case 'not': return !evalLogic(n.a, env);
    default: {
      const a = evalLogic(n.a, env);
      const b = evalLogic(n.b, env);
      switch (n.op) {
        case 'and': return a && b;
        case 'or': return a || b;
        case 'xor': return a !== b;
        case 'imp': return !a || b;
        case 'iff': return a === b;
        case 'nand': return !(a && b);
        default: return !(a || b); // nor
      }
    }
  }
}
const showLogic = (n, top) => {
  const SYM = { and: '∧', or: '∨', xor: '⊕', imp: '→', iff: '↔', nand: '↑', nor: '↓' };
  if (n.t === 'const') return n.v ? 'T' : 'F';
  if (n.t === 'var') return n.name;
  if (n.t === 'not') return '¬' + (n.a.t === 'bin' ? '(' + showLogic(n.a, true) + ')' : showLogic(n.a, false));
  const t = showLogic(n.a, false) + ' ' + SYM[n.op] + ' ' + showLogic(n.b, false);
  return top ? t : '(' + t + ')';
};
/** Quine–McCluskey: the minimal sum of products for the given minterms. */
function minimalSOP(vars, minterms) {
  const nv = vars.length;
  if (!minterms.length) return 'F';
  if (minterms.length === 1 << nv) return 'T';
  let groups = new Map();
  minterms.forEach((m) => {
    const key = m.toString(2).padStart(nv, '0');
    groups.set(key, { bits: key, covers: new Set([m]) });
  });
  const primes = [];
  let current = Array.from(groups.values());
  while (current.length) {
    const next = new Map();
    const used = new Set();
    for (let i = 0; i < current.length; i++) {
      for (let j = i + 1; j < current.length; j++) {
        const a = current[i].bits;
        const b = current[j].bits;
        let diff = -1;
        let ok = true;
        for (let k = 0; k < nv && ok; k++) {
          if (a[k] !== b[k]) {
            if (a[k] === '-' || b[k] === '-' || diff >= 0) ok = false;
            else diff = k;
          }
        }
        if (ok && diff >= 0) {
          const bits = a.slice(0, diff) + '-' + a.slice(diff + 1);
          const covers = new Set([...current[i].covers, ...current[j].covers]);
          next.set(bits, { bits, covers });
          used.add(i);
          used.add(j);
        }
      }
    }
    current.forEach((c, i) => {
      if (!used.has(i)) primes.push(c);
    });
    current = Array.from(next.values());
  }
  // choose a minimal cover: essential primes first, then the smallest remaining cover by search
  const need = new Set(minterms);
  const chosen = [];
  const coverOf = (p) => minterms.filter((m) => p.covers.has(m));
  minterms.forEach((m) => {
    if (!need.has(m)) return;
    const cands = primes.filter((p) => p.covers.has(m));
    if (cands.length === 1 && !chosen.includes(cands[0])) {
      chosen.push(cands[0]);
      cands[0].covers.forEach((x) => need.delete(x));
    }
  });
  let rest = primes.filter((p) => !chosen.includes(p));
  const remaining = Array.from(need);
  if (remaining.length) {
    let best = null;
    const search = (idx, pick, covered) => {
      if (best && pick.length >= best.length) return;
      if (remaining.every((m) => covered.has(m))) {
        best = pick.slice();
        return;
      }
      if (idx >= rest.length) return;
      const p = rest[idx];
      search(idx + 1, pick.concat([p]), new Set([...covered, ...coverOf(p)]));
      search(idx + 1, pick, covered);
    };
    search(0, [], new Set());
    chosen.push(...(best || rest));
  }
  const term = (p) => {
    const lits = [];
    for (let k = 0; k < nv; k++) if (p.bits[k] !== '-') lits.push(p.bits[k] === '1' ? vars[k] : '¬' + vars[k]);
    return lits.join('') || 'T';
  };
  return chosen.map(term).sort().join(' ∨ ');
}
defCmd('logic truthtable', (n) => {
  needArgs(n, 1, 1, 'a logical formula: write  truth table of p and (q or not r)  or  p -> q  equivalent to  not p or q');
  const raw = decodeText(intArg(n.args[0]));
  const out = newOut();
  const eqParts = raw.split(/\s*(?:≡|\bis\s+equivalent\s+to\b|\bequivalent\s+to\b|\bequivalent\b|\bvs\.?\b)\s*/i).filter(Boolean);
  const formulas = eqParts.map((p) => parseLogic(p.replace(/^[\s:]*(?:is|the|that)\s+/i, '').trim()));
  const vars = Array.from(new Set(formulas.flatMap((f) => f.vars))).sort();
  if (vars.length > 6) throw new MathError('at most 6 variables are supported');
  const rows = [];
  for (let m = 0; m < 1 << vars.length; m++) {
    const env = {};
    vars.forEach((v, i) => { env[v] = Boolean(m & (1 << (vars.length - 1 - i))); });
    rows.push({ m, env, vals: formulas.map((f) => evalLogic(f.tree, env)) });
  }
  const tf = (b) => (b ? 'T' : 'F');
  if (formulas.length === 2) {
    const same = rows.every((r) => r.vals[0] === r.vals[1]);
    out.answer.push(same ? 'equivalent: the two formulas have the same truth value for every assignment' : 'not equivalent: they differ when ' + rows.filter((r) => r.vals[0] !== r.vals[1]).slice(0, 3).map((r) => vars.map((v) => v + '=' + tf(r.env[v])).join(' ')).join(' or '));
    out.work.push(vars.join(' ') + ' | ' + formulas.map((f) => showLogic(f.tree, true)).join(' | '));
    rows.forEach((r) => out.work.push(vars.map((v) => tf(r.env[v])).join(' ') + ' | ' + r.vals.map(tf).join(' | ')));
    return out;
  }
  const f = formulas[0];
  const ones = rows.filter((r) => r.vals[0]);
  const kind = ones.length === rows.length ? 'tautology (always true)' : !ones.length ? 'contradiction (always false)' : 'contingency (sometimes true, sometimes false: true in ' + ones.length + ' of ' + rows.length + ' rows)';
  out.answer.push(showLogic(f.tree, true) + ' is a ' + kind);
  out.work.push(vars.join(' ') + ' | ' + showLogic(f.tree, true));
  rows.forEach((r) => out.work.push(vars.map((v) => tf(r.env[v])).join(' ') + ' | ' + tf(r.vals[0])));
  if (ones.length && ones.length < rows.length) {
    out.work.push('disjunctive normal form (minterms): ' + ones.map((r) => '(' + vars.map((v) => (r.env[v] ? v : '¬' + v)).join('∧') + ')').join(' ∨ '));
    out.work.push('conjunctive normal form (maxterms): ' + rows.filter((r) => !r.vals[0]).map((r) => '(' + vars.map((v) => (r.env[v] ? '¬' + v : v)).join('∨') + ')').join(' ∧ '));
    out.work.push('simplest sum of products (Quine–McCluskey): ' + minimalSOP(vars, ones.map((r) => r.m)));
  }
  return out;
});
COMMANDS.logic.show = (n) => {
  try {
    return 'logic: ' + decodeText(intArg(n.args[0]));
  } catch (e) {
    return 'logic(...)';
  }
};

// ---- graphs -------------------------------------------------------------------------------------------------------------------------------------------------------------------
function graphOf(node, what, directed) {
  if (node.t !== 'list' || !node.items.length) throw new MathError(what + ' needs a list of edges such as [[1,2],[2,3],[1,3]] (or with weights [[1,2,5],[2,3,1]])');
  const label = (it) => {
    if (it.t === 'var') return it.name;
    if (it.t === 'num') return String(it.text || it.v);
    return fmtS(fromAst(it));
  };
  const edges = node.items.map((e) => {
    if (e.t !== 'list' || e.items.length < 2 || e.items.length > 3) throw new MathError('each edge is a list [from, to] or [from, to, weight]');
    return { u: label(e.items[0]), v: label(e.items[1]), w: e.items[2] ? constQ(e.items[2]) : null };
  });
  const names = Array.from(new Set(edges.flatMap((e) => [e.u, e.v])));
  names.sort((a, b) => (isNaN(a) || isNaN(b) ? (a < b ? -1 : a > b ? 1 : 0) : Number(a) - Number(b)));
  if (names.length > 40) throw new MathError('at most 40 vertices are supported');
  return { edges, names, directed: Boolean(directed), weighted: edges.every((e) => e.w !== null) && edges.length > 0 };
}
function neighbours(g) {
  const adj = new Map(g.names.map((v) => [v, []]));
  g.edges.forEach((e) => {
    adj.get(e.u).push({ to: e.v, w: e.w, e });
    if (!g.directed && e.u !== e.v) adj.get(e.v).push({ to: e.u, w: e.w, e });
  });
  return adj;
}
function componentsOf(g) {
  const adj = new Map(g.names.map((v) => [v, new Set()]));
  g.edges.forEach((e) => {
    adj.get(e.u).add(e.v);
    adj.get(e.v).add(e.u);
  });
  const seen = new Set();
  const comps = [];
  g.names.forEach((s) => {
    if (seen.has(s)) return;
    const comp = [];
    const stack = [s];
    seen.add(s);
    while (stack.length) {
      const x = stack.pop();
      comp.push(x);
      adj.get(x).forEach((y) => {
        if (!seen.has(y)) {
          seen.add(y);
          stack.push(y);
        }
      });
    }
    comps.push(comp);
  });
  return comps;
}
function graphCmd(directed) {
  return (n) => {
    needArgs(n, 1, 1, 'a list of edges: graphinfo([[1,2],[2,3],[3,1],[3,4]])');
    const g = graphOf(n.args[0], n.fn, directed);
    const out = newOut();
    const V = g.names.length;
    const E = g.edges.length;
    const deg = new Map(g.names.map((v) => [v, 0]));
    const indeg = new Map(g.names.map((v) => [v, 0]));
    g.edges.forEach((e) => {
      deg.set(e.u, deg.get(e.u) + 1);
      if (g.directed) indeg.set(e.v, indeg.get(e.v) + 1);
      else deg.set(e.v, deg.get(e.v) + 1);
    });
    out.answer.push((g.directed ? 'directed graph' : 'graph') + ' with ' + V + ' vertices and ' + E + ' edges' + (g.weighted ? ' (weighted, total weight ' + sumQ(g.edges.map((e) => e.w)).toString() + ')' : ''));
    if (g.directed) out.answer.push('out-degrees: ' + g.names.map((v) => v + ': ' + deg.get(v)).join(', ') + ';  in-degrees: ' + g.names.map((v) => v + ': ' + indeg.get(v)).join(', '));
    else {
      out.answer.push('degrees: ' + g.names.map((v) => v + ': ' + deg.get(v)).join(', ') + '   (sum = ' + sumNum(Array.from(deg.values())) + ' = 2·' + E + ')');
      const seq = Array.from(deg.values()).sort((a, b) => b - a);
      out.answer.push('degree sequence: ' + seq.join(', '));
    }
    const comps = componentsOf(g);
    out.answer.push(comps.length + ' connected component' + (comps.length === 1 ? '' : 's') + (comps.length > 1 ? ': ' + comps.map((c) => '{' + c.join(', ') + '}').join(' ') : ' (the graph is connected)'));
    if (!g.directed) {
      // bipartite test
      const color = new Map();
      let bip = true;
      const adj = neighbours(g);
      g.names.forEach((s) => {
        if (color.has(s) || !bip) return;
        color.set(s, 0);
        const q = [s];
        while (q.length && bip) {
          const x = q.shift();
          adj.get(x).forEach(({ to }) => {
            if (!color.has(to)) {
              color.set(to, 1 - color.get(x));
              q.push(to);
            } else if (color.get(to) === color.get(x)) bip = false;
          });
        }
      });
      out.work.push(bip ? 'bipartite: yes (parts {' + g.names.filter((v) => color.get(v) === 0).join(', ') + '} and {' + g.names.filter((v) => color.get(v) === 1).join(', ') + '})' : 'bipartite: no (it contains an odd cycle)');
      const odd = g.names.filter((v) => deg.get(v) % 2 === 1);
      if (comps.filter((c) => c.some((v) => deg.get(v) > 0)).length <= 1) {
        out.work.push(odd.length === 0 ? 'Euler circuit: yes (every degree is even)' : odd.length === 2 ? 'Euler path: yes, from ' + odd[0] + ' to ' + odd[1] + ' (exactly two odd vertices); no Euler circuit' : 'Euler path: no (' + odd.length + ' vertices have odd degree)');
      } else out.work.push('Euler path: no (the edges are not all in one component)');
      out.work.push('tree: ' + (comps.length === 1 && E === V - 1 ? 'yes (connected with V − 1 edges)' : 'no') + ';  contains a cycle: ' + (E > V - comps.length ? 'yes' : 'no') + ';  complete: ' + (E === (V * (V - 1)) / 2 && g.edges.every((e) => e.u !== e.v) ? 'yes' : 'no'));
    }
    // adjacency matrix
    if (V <= 12) {
      const idx = new Map(g.names.map((v, i) => [v, i]));
      const A = g.names.map(() => g.names.map(() => 0));
      g.edges.forEach((e) => {
        A[idx.get(e.u)][idx.get(e.v)] += 1;
        if (!g.directed && e.u !== e.v) A[idx.get(e.v)][idx.get(e.u)] += 1;
      });
      out.work.push('adjacency matrix (rows and columns in the order ' + g.names.join(', ') + '): ' + JSON.stringify(A).replace(/"/g, ''));
    }
    return out;
  };
}
const sumNum = (a) => a.reduce((s, v) => s + v, 0);
defCmd('graphinfo graphtheory network', graphCmd(false));
defCmd('digraph directedgraph', graphCmd(true));
defCmd('shortestpath dijkstra', (n) => {
  needArgs(n, 2, 3, 'the edges (with weights), the start vertex and optionally the end vertex: shortestpath([[a,b,4],[a,c,1],[c,b,2]], a, b)');
  const g = graphOf(n.args[0], n.fn, false);
  const label = (node) => (node.t === 'var' ? node.name : node.t === 'num' ? String(node.text || node.v) : fmtS(fromAst(node)));
  const start = label(n.args[1]);
  const goal = n.args[2] ? label(n.args[2]) : null;
  if (!g.names.includes(start) || (goal && !g.names.includes(goal))) throw new MathError('that vertex does not occur in the edge list (vertices: ' + g.names.join(', ') + ')');
  const adj = neighbours(g);
  const dist = new Map(g.names.map((v) => [v, Infinity]));
  const prev = new Map();
  dist.set(start, 0);
  const done = new Set();
  const steps = [];
  for (;;) {
    let best = null;
    g.names.forEach((v) => {
      if (!done.has(v) && dist.get(v) < Infinity && (best === null || dist.get(v) < dist.get(best))) best = v;
    });
    if (best === null) break;
    done.add(best);
    steps.push(best + ' (' + dist.get(best) + ')');
    adj.get(best).forEach(({ to, w }) => {
      const wt = w === null ? 1 : w.toNumber();
      if (wt < 0) throw new MathError('negative weights are not supported');
      if (dist.get(best) + wt < dist.get(to)) {
        dist.set(to, dist.get(best) + wt);
        prev.set(to, best);
      }
    });
  }
  const pathTo = (t) => {
    const p = [t];
    while (prev.has(p[0])) p.unshift(prev.get(p[0]));
    return p;
  };
  const out = newOut();
  if (goal) {
    out.answer.push(dist.get(goal) === Infinity ? 'there is no path from ' + start + ' to ' + goal : 'shortest path ' + pathTo(goal).join(' → ') + ', length ' + fmtNum(dist.get(goal)));
    out.value = { num: dist.get(goal) };
  } else {
    g.names.forEach((v) => out.answer.push(start + ' → ' + v + ': ' + (dist.get(v) === Infinity ? 'unreachable' : fmtNum(dist.get(v)) + '   via ' + pathTo(v).join(' → '))));
  }
  out.work.push("Dijkstra's algorithm" + (g.weighted ? '' : ' (no weights given, so every edge counts 1)') + '; vertices settled in the order ' + steps.join(', '));
  return out;
});
defCmd('mst minimumspanningtree kruskal', (n) => {
  needArgs(n, 1, 1, 'weighted edges: mst([[a,b,4],[a,c,1],[c,b,2]])');
  const g = graphOf(n.args[0], n.fn, false);
  if (!g.weighted) throw new MathError('give a weight for every edge: [from, to, weight]');
  const parent = new Map(g.names.map((v) => [v, v]));
  const find = (x) => {
    while (parent.get(x) !== x) {
      parent.set(x, parent.get(parent.get(x)));
      x = parent.get(x);
    }
    return x;
  };
  const sorted = g.edges.slice().sort((a, b) => a.w.sub(b.w).sign());
  const chosen = [];
  const log = [];
  let total = Q0;
  sorted.forEach((e) => {
    const a = find(e.u);
    const b = find(e.v);
    if (a !== b) {
      parent.set(a, b);
      chosen.push(e);
      total = total.add(e.w);
      log.push(e.u + '–' + e.v + ' (' + e.w.toString() + ') added');
    } else log.push(e.u + '–' + e.v + ' (' + e.w.toString() + ') skipped: it would close a cycle');
  });
  const out = newOut();
  const comps = componentsOf(g).length;
  out.answer.push((comps > 1 ? 'minimum spanning forest' : 'minimum spanning tree') + ': ' + chosen.map((e) => e.u + '–' + e.v + ' (' + e.w.toString() + ')').join(', ') + ';  total weight ' + qText(total));
  out.work.push("Kruskal's algorithm: take the edges by increasing weight, skipping any that closes a cycle");
  log.forEach((l) => out.work.push(l));
  out.value = { q: total };
  return out;
});
defCmd('maxflow maximumflow', (n) => {
  needArgs(n, 3, 3, 'the capacities [[from, to, capacity], ...], the source and the sink: maxflow([[s,a,10],[s,b,5],[a,t,7],[b,t,8]], s, t)');
  const g = graphOf(n.args[0], n.fn, true);
  if (!g.weighted) throw new MathError('give a capacity for every edge: [from, to, capacity]');
  const label = (node) => (node.t === 'var' ? node.name : node.t === 'num' ? String(node.text || node.v) : fmtS(fromAst(node)));
  const s = label(n.args[1]);
  const t = label(n.args[2]);
  if (!g.names.includes(s) || !g.names.includes(t)) throw new MathError('the source and sink must occur in the edge list');
  const cap = new Map();
  const key = (u, v) => u + '\u0000' + v;
  g.edges.forEach((e) => {
    cap.set(key(e.u, e.v), (cap.get(key(e.u, e.v)) || Q0).add(e.w));
    if (!cap.has(key(e.v, e.u))) cap.set(key(e.v, e.u), Q0);
  });
  const nb = new Map(g.names.map((v) => [v, new Set()]));
  cap.forEach((c, k) => {
    const [u, v] = k.split('\u0000');
    nb.get(u).add(v);
  });
  let flow = Q0;
  const paths = [];
  for (let it = 0; it < 500; it++) {
    const prev = new Map([[s, null]]);
    const q = [s];
    while (q.length && !prev.has(t)) {
      const x = q.shift();
      nb.get(x).forEach((y) => {
        if (!prev.has(y) && cap.get(key(x, y)).sign() > 0) {
          prev.set(y, x);
          q.push(y);
        }
      });
    }
    if (!prev.has(t)) break;
    let bott = null;
    for (let v = t; prev.get(v) !== null; v = prev.get(v)) {
      const c = cap.get(key(prev.get(v), v));
      if (bott === null || c.sub(bott).sign() < 0) bott = c;
    }
    const path = [t];
    for (let v = t; prev.get(v) !== null; v = prev.get(v)) {
      cap.set(key(prev.get(v), v), cap.get(key(prev.get(v), v)).sub(bott));
      cap.set(key(v, prev.get(v)), cap.get(key(v, prev.get(v))).add(bott));
      path.unshift(prev.get(v));
    }
    flow = flow.add(bott);
    paths.push(path.join(' → ') + '  (+' + bott.toString() + ')');
  }
  // minimum cut: vertices reachable from s in the residual graph
  const reach = new Set([s]);
  const stack = [s];
  while (stack.length) {
    const x = stack.pop();
    nb.get(x).forEach((y) => {
      if (!reach.has(y) && cap.get(key(x, y)).sign() > 0) {
        reach.add(y);
        stack.push(y);
      }
    });
  }
  const cutEdges = g.edges.filter((e) => reach.has(e.u) && !reach.has(e.v));
  const out = newOut();
  out.answer.push('maximum flow from ' + s + ' to ' + t + ' = ' + qText(flow));
  out.work.push('augmenting paths (Edmonds–Karp): ' + paths.join(';  '));
  out.work.push('minimum cut: S = {' + Array.from(reach).join(', ') + '}, cut edges ' + cutEdges.map((e) => e.u + '→' + e.v + ' (' + e.w.toString() + ')').join(', ') + ', capacity ' + qText(sumQ(cutEdges.map((e) => e.w))) + ' (equal to the flow: max-flow min-cut)');
  out.value = { q: flow };
  return out;
});
defCmd('coloring graphcoloring chromatic', (n) => {
  needArgs(n, 1, 1, 'a list of edges: coloring([[1,2],[2,3],[3,1],[3,4]])');
  const g = graphOf(n.args[0], n.fn, false);
  if (g.names.length > 16) throw new MathError('at most 16 vertices are supported for colouring');
  const idx = new Map(g.names.map((v, i) => [v, i]));
  const V = g.names.length;
  const adj = g.names.map(() => new Set());
  let loop = false;
  g.edges.forEach((e) => {
    if (e.u === e.v) loop = true;
    adj[idx.get(e.u)].add(idx.get(e.v));
    adj[idx.get(e.v)].add(idx.get(e.u));
  });
  if (loop) throw new MathError('a vertex joined to itself cannot be coloured');
  const order = Array.from({ length: V }, (_, i) => i).sort((a, b) => adj[b].size - adj[a].size);
  let found = null;
  for (let k = 1; k <= V && !found; k++) {
    const col = new Array(V).fill(-1);
    const go = (pos, used) => {
      if (pos === V) return true;
      const v = order[pos];
      for (let c = 0; c < Math.min(k, used + 1); c++) {
        if (Array.from(adj[v]).some((u) => col[u] === c)) continue;
        col[v] = c;
        if (go(pos + 1, Math.max(used, c + 1))) return true;
        col[v] = -1;
      }
      return false;
    };
    if (go(0, 0)) found = { k, col: col.slice() };
  }
  const out = newOut();
  out.answer.push('chromatic number χ = ' + found.k);
  for (let c = 0; c < found.k; c++) out.work.push('colour ' + (c + 1) + ': ' + g.names.filter((v, i) => found.col[i] === c).join(', '));
  const clique = (() => {
    let best = 1;
    const rec = (cands, size) => {
      best = Math.max(best, size);
      for (let i = 0; i < cands.length; i++) rec(cands.slice(i + 1).filter((u) => adj[cands[i]].has(u)), size + 1);
    };
    rec(Array.from({ length: V }, (_, i) => i), 0);
    return best;
  })();
  out.work.push('largest clique has ' + clique + ' vertices, so χ ≥ ' + clique + (clique === found.k ? ' (and this colouring achieves it)' : ''));
  out.value = { q: qInt(found.k) };
  return out;
});
defCmd('topsort topologicalsort', (n) => {
  needArgs(n, 1, 1, 'directed edges: topsort([[a,b],[a,c],[b,d],[c,d]])');
  const g = graphOf(n.args[0], n.fn, true);
  const indeg = new Map(g.names.map((v) => [v, 0]));
  g.edges.forEach((e) => indeg.set(e.v, indeg.get(e.v) + 1));
  const q = g.names.filter((v) => indeg.get(v) === 0);
  const order = [];
  while (q.length) {
    const x = q.shift();
    order.push(x);
    g.edges.filter((e) => e.u === x).forEach((e) => {
      indeg.set(e.v, indeg.get(e.v) - 1);
      if (indeg.get(e.v) === 0) q.push(e.v);
    });
  }
  const out = newOut();
  out.answer.push(order.length === g.names.length ? 'topological order: ' + order.join(', ') : 'the graph has a directed cycle, so there is no topological order');
  return out;
});
defCmd('bfs dfs traversal', (n) => {
  needArgs(n, 2, 2, 'the edges and the start vertex: bfs([[1,2],[1,3],[2,4]], 1)');
  const g = graphOf(n.args[0], n.fn, false);
  const label = (node) => (node.t === 'var' ? node.name : node.t === 'num' ? String(node.text || node.v) : fmtS(fromAst(node)));
  const start = label(n.args[1]);
  if (!g.names.includes(start)) throw new MathError('the start vertex does not occur in the edge list');
  const adj = neighbours(g);
  const seen = new Set([start]);
  const order = [];
  if (n.fn === 'dfs') {
    const rec = (v) => {
      order.push(v);
      adj.get(v).map((x) => x.to).sort().forEach((u) => {
        if (!seen.has(u)) {
          seen.add(u);
          rec(u);
        }
      });
    };
    rec(start);
  } else {
    const q = [start];
    while (q.length) {
      const x = q.shift();
      order.push(x);
      adj.get(x).map((e) => e.to).sort().forEach((u) => {
        if (!seen.has(u)) {
          seen.add(u);
          q.push(u);
        }
      });
    }
  }
  const out = newOut();
  out.answer.push((n.fn === 'dfs' ? 'depth-first' : 'breadth-first') + ' order from ' + start + ': ' + order.join(', '));
  out.work.push('neighbours are visited in increasing order');
  return out;
});
