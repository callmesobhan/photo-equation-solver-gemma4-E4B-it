
// ======================================================================
// 2. Text normalisation, tokenizer, parser, pretty printer
// ======================================================================

const SUPERSCRIPT = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5',
  '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁺': '+', '⁻': '-',
};
const VULGAR = {
  '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4',
  '⅕': '1/5', '⅖': '2/5', '⅗': '3/5', '⅘': '4/5', '⅙': '1/6',
  '⅚': '5/6', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8',
};
const GREEK = {
  'α': 'a', 'β': 'b', 'γ': 'g', 'δ': 'd', 'θ': 't', 'λ': 'l',
  'μ': 'm', 'φ': 'f', 'ω': 'w', 'ρ': 'r', 'σ': 's',
};
const VULGAR_CLASS = '[' + Object.keys(VULGAR).join('') + ']';

/** Index of the bracket matching the one at s[i] (open/close given), or -1. */
function matchBracket(s, i, open, close) {
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === open) depth++;
    else if (s[j] === close && --depth === 0) return j;
  }
  return -1;
}

/** \begin{pmatrix} a & b \\ c & d \end{pmatrix}  ->  [[a,b],[c,d]]   (vmatrix -> det(...)) */
function convertMatrices(s) {
  const build = (body) => {
    const rows = body.split(/\\\\/).map((r) => r.trim()).filter(Boolean)
      .map((r) => '[' + r.split('&').map((c) => c.trim()).join(', ') + ']');
    return '[' + rows.join(', ') + ']';
  };
  s = s.replace(/\\begin\{(p|b|B|v|V|small)?matrix\*?\}([\s\S]*?)\\end\{\1matrix\*?\}/g, (_, kind, body) => {
    const m = build(body);
    return kind === 'v' ? 'det(' + m + ')' : kind === 'V' ? 'norm(' + m + ')' : m;
  });
  return s.replace(/\\begin\{array\}\s*\{[^}]*\}([\s\S]*?)\\end\{array\}/g, (_, body) => build(body));
}

/** [1, 2; 3, 4]  ->  [[1, 2], [3, 4]] */
function convertSemicolonMatrices(s) {
  return s.replace(/\[([^\[\]]*;[^\[\]]*)\]/g, (_, body) =>
    '[' + body.split(';').map((r) => r.trim()).filter(Boolean).map((r) => '[' + r.replace(/\s+/g, ', ').replace(/,\s*,/g, ',') + ']').join(', ') + ']');
}

/** Replace LaTeX constructs (\frac, \sqrt, \cdot, ...) by plain text. */
function convertLatex(s) {
  s = convertMatrices(s);
  s = s.replace(/\\begin\{[a-z*]+\}|\\end\{[a-z*]+\}/gi, '').replace(/\\\\/g, ';');
  for (let guard = 0; guard < 60; guard++) {
    const m = /\\[dt]?frac\s*\{/.exec(s);
    if (!m) break;
    const a0 = m.index + m[0].length - 1;
    const a1 = matchBracket(s, a0, '{', '}');
    const b0 = a1 < 0 ? -1 : s.indexOf('{', a1);
    const b1 = b0 < 0 || s.slice(a1 + 1, b0).trim() ? -1 : matchBracket(s, b0, '{', '}');
    if (b1 < 0) break;
    s = s.slice(0, m.index) + '((' + s.slice(a0 + 1, a1) + ')/(' + s.slice(b0 + 1, b1) + '))' + s.slice(b1 + 1);
  }
  for (let guard = 0; guard < 60; guard++) {
    const m = /\\sqrt\s*(?:\[([^\]]*)\])?\s*\{/.exec(s);
    if (!m) break;
    const a0 = m.index + m[0].length - 1;
    const a1 = matchBracket(s, a0, '{', '}');
    if (a1 < 0) break;
    const inner = s.slice(a0 + 1, a1);
    s = s.slice(0, m.index) + (m[1] ? 'root(' + m[1] + ',' + inner + ')' : 'sqrt(' + inner + ')') + s.slice(a1 + 1);
  }
  for (let guard = 0; guard < 30; guard++) {
    const m = /\\(?:binom|dbinom|tbinom)\s*\{([^{}]*)\}\s*\{([^{}]*)\}/.exec(s);
    if (!m) break;
    s = s.slice(0, m.index) + 'ncr(' + m[1] + ',' + m[2] + ')' + s.slice(m.index + m[0].length);
  }
  for (let guard = 0; guard < 30; guard++) {
    const m = /\\(?:text|mathrm|mathbf|mathit|operatorname|textbf|vec|overrightarrow|boldsymbol)\s*\{([^{}]*)\}/.exec(s);
    if (!m) break;
    s = s.slice(0, m.index) + m[1] + s.slice(m.index + m[0].length);
  }
  return s
    .replace(/\\(?:left|right|big|Big|bigg|Bigg|displaystyle|quad|qquad|,|;|!|:| )/g, ' ')
    .replace(/\\(?:cdot|times|ast)\b/g, '*')
    .replace(/\\div\b/g, '/')
    .replace(/\\(?:leq?|leqslant)\b/g, '<=')
    .replace(/\\(?:geq?|geqslant)\b/g, '>=')
    .replace(/\\(?:neq?)\b/g, '!=')
    .replace(/\\int(?![a-z])/g, '∫')
    .replace(/\\sum(?![a-z])/g, '\u0001S')
    .replace(/\\prod(?![a-z])/g, '\u0001P')
    .replace(/\\infty(?![a-z])/g, ' oo ')
    .replace(/\\(?:to|rightarrow|longrightarrow)(?![a-z])/g, '->')
    .replace(/\\partial(?![a-z])/g, 'd')
    .replace(/\\(?:cdots|ldots|dots)(?![a-z])/g, ' ')
    .replace(/\\[()[\]]/g, ' ')
    .replace(/\\([a-z]+)/gi, '$1')
    .replace(/\$/g, ' ');
}

/** log_b(x) / log_{b}(x) -> log(x,b) */
function convertLogBase(s) {
  for (let guard = 0; guard < 20; guard++) {
    const m = /log_\s*\(?\s*([a-z0-9.]+)\s*\)?\s*/.exec(s);
    if (!m) break;
    let j = m.index + m[0].length;
    let arg;
    if (s[j] === '(') {
      const k = matchBracket(s, j, '(', ')');
      if (k < 0) break;
      arg = s.slice(j + 1, k);
      j = k + 1;
    } else {
      const t = /^-?[a-z0-9.]+/.exec(s.slice(j));
      if (!t) break;
      arg = t[0];
      j += t[0].length;
    }
    s = s.slice(0, m.index) + 'log(' + arg + ',' + m[1] + ')' + s.slice(j);
  }
  return s;
}

/** Character-level clean-up: unicode math, LaTeX, printed notation, abs bars. Keeps ; and newlines. */
function normalizeText(raw) {
  let s = String(raw);
  s = s.replace(/[∑Σ]/g, '\u0001S').replace(/[∏Π]/g, '\u0001P');
  s = s.replace(/[⁰¹²³⁴-⁻]+/g, (m) =>
    '^(' + Array.from(m).map((c) => SUPERSCRIPT[c] || '').join('') + ')');
  s = s.replace(/[₀-₉]+/g, (m) => '_(' + Array.from(m).map((c) => String(c.charCodeAt(0) - 0x2080)).join('') + ')');
  s = s.replace(/‴/g, "'''").replace(/″/g, "''").replace(/′/g, "'");
  s = s.replace(new RegExp('(\\d)\\s*(' + VULGAR_CLASS + ')', 'g'), (_, d, f) => '(' + d + '+' + VULGAR[f] + ')');
  s = s.replace(new RegExp(VULGAR_CLASS, 'g'), (f) => '(' + VULGAR[f] + ')');
  s = s.normalize('NFKC');
  s = s
    .replace(/[−‒–—―﹣]/g, '-')
    .replace(/[×✕✖⨯·⋅∙•∗]/g, '*')
    .replace(/[÷∕⁄]/g, '/')
    .replace(/[≤⩽≦]/g, '<=')
    .replace(/[≥⩾≧]/g, '>=')
    .replace(/≠/g, '!=')
    .replace(/√/g, 'sqrt')
    .replace(/∛/g, 'cbrt')
    .replace(/π/g, 'pi')
    .replace(/∞/g, ' oo ')
    .replace(/∂/g, 'd')
    .replace(/[→⟶↦]/g, '->')
    .replace(/[“”‘’]/g, '')
    .replace(/[αβγδθλμφωρσ]/g, (c) => GREEK[c]);
  s = s.replace(/(\d+(?:\.\d+)?|[a-zA-Z])\s*°/g, '($1*pi/180)').replace(/°/g, '*pi/180');
  if (/[\\$]/.test(s)) s = convertLatex(s);
  s = convertSemicolonMatrices(s);
  // A lone opening brace in front of a system of equations.
  if (/^\s*[{[]/.test(s) && (s.match(/[{[]/g) || []).length > (s.match(/[}\]]/g) || []).length) s = s.replace(/^\s*[{[]/, '');
  s = s.replace(/\{/g, '(').replace(/\}/g, ')');
  s = s.replace(/\*\*/g, '^').replace(/=>/g, '>=').replace(/=</g, '<=').replace(/==/g, '=');
  s = s.replace(/([\d)])[ \t]+[xX][ \t]+([\d(])/g, '$1*$2');
  s = s.replace(/(^|[^\d.\/])(\d+)[ \t]+(\d+)[ \t]*\/[ \t]*(\d+)(?![\d.])/g, '$1($2+$3/$4)');
  s = s.toLowerCase().replace(/%\s*of\s+/g, '% * ');
  s = s.replace(/\binfinity\b|\binf\b/g, 'oo');
  s = convertLogBase(s);
  s = convertNotation(s);
  if ((s.match(/\|/g) || []).length % 2 === 0) {
    let open = true;
    s = s.replace(/\|/g, () => ((open = !open) ? ')' : 'abs('));
  }
  return s;
}

const HAS_REL = /<=|>=|!=|=|<|>/;
const countRel = (p) => (p.match(/<=|>=|!=|=|<|>/g) || []).length;

/** Relation operators at bracket depth 0: [{op, i}] */
function topLevelRelations(text) {
  const ops = [];
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (depth === 0) {
      const two = text.substr(i, 2);
      if (two === '<=' || two === '>=' || two === '!=') {
        ops.push({ op: two, i });
        i++;
      } else if (c === '=' || c === '<' || c === '>') ops.push({ op: c, i });
    }
  }
  return ops;
}

/** Split text at a separator regex, but only outside brackets. */
function splitTopLevel(s, re) {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    if (depth <= 0) {
      const m = re.exec(s.slice(i));
      if (m && m.index === 0 && m[0].length && !(/^[a-z]/.test(m[0]) && i > 0 && /[a-z0-9_]/.test(s[i - 1]))) {
        parts.push(cur);
        cur = '';
        i += m[0].length - 1;
        continue;
      }
    }
    cur += c;
  }
  parts.push(cur);
  return parts;
}

/** Split into separate statements (system of equations / several relations). */
function splitStatements(s) {
  let parts = splitTopLevel(s, /^(?:[;\n\r]+|\band\b|&)/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 1 && topLevelRelations(parts[0]).length >= 2 && parts[0].includes(',')) {
    const trimmed = splitTopLevel(parts[0], /^,/).map((p) => p.trim()).filter(Boolean);
    if (trimmed.length > 1 && trimmed.every((p) => topLevelRelations(p).length > 0)) parts = trimmed;
  }
  return parts;
}

/** Drop a trailing question such as ", find x", "(x = ?)" or ", x = ?". */
function stripAsk(p) {
  p = p.replace(/\s+$/, '');
  p = p.replace(/[,;]?\s*\(\s*[a-z]\s*(?:=\s*\?*|\?+)\s*\)\s*[.?]*$/, '');
  p = p.replace(/[,;.]?\s*(?:and\s+)?(?:find|solve\s+for|determine|calculate|compute|what\s+is)\s+(?:the\s+value\s+of\s+)?[a-z]\s*[?.]*$/, '');
  p = p.replace(/[,;]\s*[a-z]\s*=?\s*\?+$/, '');
  return p;
}

/** Remove "Solve:", numbering, trailing "= ?" etc. from one statement. */
function cleanStatement(p) {
  p = stripAsk(p);
  p = p.replace(/^\s*(?:please\s+)?(?:solve(?:\s+for\s+[a-z])?|find|evaluate|calculate|compute|simplify|what\s+is|answer)\b(?!\()\s*[:,]?\s*/, '');
  p = p.replace(/^\s*(?:\d{1,2}|[a-z])[.)]\s+/, '');
  p = p.replace(/^\s*[a-z][a-z ]*:\s*/, '');
  p = p.replace(/[\s=?_□▢.]+$/, '');
  p = p.replace(/^[\s,]+|[\s,]+$/g, '');
  return p.replace(/\s+/g, ' ').trim();
}

// ---- tokenizer ---------------------------------------------------------------
const FN_NAMES = ['arcsin', 'arccos', 'arctan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'sqrt',
  'cbrt', 'root', 'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'log10', 'log2', 'log', 'ln', 'lg', 'exp',
  'abs', 'floor', 'ceil', 'erf'].sort((a, b) => b.length - a.length);
const FN_ALIAS = { arcsin: 'asin', arccos: 'acos', arctan: 'atan', lg: 'log10' };

/** Command names are only recognised when directly followed by "(" (so "sum" is never s*u*m). */
function commandAt(rest) {
  let best = null;
  for (const name of Object.keys(COMMANDS)) {
    if (rest.startsWith(name) && /^\s*\(/.test(rest.slice(name.length)) && (!best || name.length > best.length)) best = name;
  }
  return best;
}

function tokenize(s) {
  const toks = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ' || c === '\t') {
      i++;
      continue;
    }
    const rest = s.slice(i);
    let tok;
    if (/[0-9.]/.test(c)) {
      const m = /^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/.exec(rest);
      if (!m) throw new MathError('unexpected "' + c + '"');
      tok = { t: 'num', v: m[0] };
      i += m[0].length;
    } else if (/[a-z]/.test(c)) {
      const cmd = commandAt(rest);
      const fn = FN_NAMES.find((f) => rest.startsWith(f));
      if (cmd && (!fn || cmd.length >= fn.length)) {
        tok = { t: 'fn', v: cmd, cmd: true };
        i += cmd.length;
      } else if (fn) {
        tok = { t: 'fn', v: FN_ALIAS[fn] || fn };
        i += fn.length;
      } else if (rest.startsWith('oo')) {
        tok = { t: 'const', v: 'oo' };
        i += 2;
      } else if (rest.startsWith('pi')) {
        tok = { t: 'const', v: 'pi' };
        i += 2;
      } else if (c === 'e') {
        tok = { t: 'const', v: 'e' };
        i++;
      } else {
        tok = { t: 'id', v: c };
        i++;
      }
    } else if ('+-*/^!%'.includes(c)) {
      tok = { t: 'op', v: c };
      i++;
    } else if (c === '(') {
      tok = { t: 'lp', v: c };
      i++;
    } else if (c === ')') {
      tok = { t: 'rp', v: c };
      i++;
    } else if (c === '[') {
      tok = { t: 'lb', v: c };
      i++;
    } else if (c === ']') {
      tok = { t: 'rb', v: c };
      i++;
    } else if (c === ',') {
      tok = { t: 'comma', v: c };
      i++;
    } else if (c === "'") {
      tok = { t: 'prime', v: c };
      i++;
    } else if (c === '=') {
      tok = { t: 'rel', v: c };
      i++;
    } else if (c === '_') {
      i++;
      continue;
    } else {
      throw new MathError('unexpected character "' + c + '"');
    }
    toks.push(tok);
  }
  return toks;
}

// ---- parser (recursive descent) ----------------------------------------------
function parseExpression(src) {
  const toks = tokenize(src);
  let i = 0;
  const peek = () => toks[i];
  const fail = (msg) => {
    throw new MathError(msg + ' in "' + src + '"');
  };
  const isOp = (tk, v) => !!tk && tk.t === 'op' && tk.v === v;
  const startsPrimary = (tk) => !!tk && (tk.t === 'num' || tk.t === 'id' || tk.t === 'const' || tk.t === 'fn' || tk.t === 'lp' || tk.t === 'lb');
  if (!toks.length) fail('nothing to read');

  function expr() {
    let left = term();
    while (isOp(peek(), '+') || isOp(peek(), '-')) {
      const op = toks[i++].v;
      left = { t: 'bin', op, a: left, b: term() };
    }
    return left;
  }
  function term() {
    let left = unary();
    for (;;) {
      const tk = peek();
      if (isOp(tk, '*') || isOp(tk, '/')) {
        i++;
        left = { t: 'bin', op: tk.v, a: left, b: unary() };
      } else if (startsPrimary(tk)) {
        if (tk.t === 'num' && toks[i - 1].t === 'num') fail('two numbers next to each other (' + toks[i - 1].v + ' ' + tk.v + ')');
        left = { t: 'bin', op: '*', a: left, b: unary() };
      } else break;
    }
    return left;
  }
  function unary() {
    if (isOp(peek(), '-')) {
      i++;
      return { t: 'neg', a: unary() };
    }
    if (isOp(peek(), '+')) {
      i++;
      return unary();
    }
    return power();
  }
  function power() {
    const base = postfix();
    if (isOp(peek(), '^')) {
      i++;
      return { t: 'bin', op: '^', a: base, b: powerOperand() };
    }
    return base;
  }
  function powerOperand() {
    if (isOp(peek(), '-')) {
      i++;
      return { t: 'neg', a: powerOperand() };
    }
    if (isOp(peek(), '+')) {
      i++;
      return powerOperand();
    }
    return power();
  }
  function postfix() {
    let a = atom();
    while (isOp(peek(), '!') || isOp(peek(), '%')) {
      a = { t: toks[i].v === '!' ? 'fact' : 'pct', a };
      i++;
    }
    return a;
  }
  /** A call argument: an expression, or  name = expression. */
  function parseArg() {
    const tk = peek();
    if (tk && (tk.t === 'id' || tk.t === 'const') && toks[i + 1] && toks[i + 1].t === 'rel') {
      i += 2;
      return { t: 'named', name: tk.v, a: expr() };
    }
    return expr();
  }
  function atom() {
    const tk = toks[i++];
    if (!tk) fail('the expression ends too early');
    switch (tk.t) {
      case 'num': return { t: 'num', q: qFromLiteral(tk.v), f: Number(tk.v), text: tk.v.replace(/^\./, '0.') };
      case 'id': {
        let order = 0;
        while (peek() && peek().t === 'prime') {
          order++;
          i++;
        }
        return order ? { t: 'dvar', name: tk.v, order } : { t: 'var', name: tk.v };
      }
      case 'const': return { t: 'const', name: tk.v };
      case 'lp': {
        const e = expr();
        if (!peek() || peek().t !== 'rp') fail('missing ")"');
        i++;
        return e;
      }
      case 'lb': {
        const items = [];
        if (peek() && peek().t === 'rb') {
          i++;
          return { t: 'list', items };
        }
        items.push(parseArg());
        while (peek() && peek().t === 'comma') {
          i++;
          items.push(parseArg());
        }
        if (!peek() || peek().t !== 'rb') fail('missing "]"');
        i++;
        return { t: 'list', items };
      }
      case 'fn': return fnCall(tk.v, tk.cmd);
      default: return fail('unexpected "' + tk.v + '"');
    }
  }
  function fnCall(name, isCmd) {
    let exp = null;
    if (isOp(peek(), '^') && !isCmd) {
      i++;
      let neg = false;
      if (isOp(peek(), '-')) {
        i++;
        neg = true;
      } else if (isOp(peek(), '+')) i++;
      exp = atom();
      if (neg) exp = { t: 'neg', a: exp };
    }
    let args;
    if (peek() && peek().t === 'lp') {
      i++;
      args = [];
      if (peek() && peek().t === 'rp') {
        i++;
      } else {
        args.push(parseArg());
        while (peek() && peek().t === 'comma') {
          i++;
          args.push(parseArg());
        }
        if (!peek() || peek().t !== 'rp') fail('missing ")"');
        i++;
      }
    } else {
      args = [bareArg(name)];
    }
    let node = { t: 'call', fn: name, args };
    if (isCmd) node.cmd = true;
    if (exp) {
      if (exp.t === 'neg' && exp.a.t === 'num' && exp.a.text === '1' && ['sin', 'cos', 'tan'].includes(name)) {
        node = { t: 'call', fn: 'a' + name, args };
      } else node = { t: 'bin', op: '^', a: node, b: exp };
    }
    return node;
  }
  /** Argument written without parentheses: sin x, sin 2x, ln x^2, sqrt 5 ... */
  function bareArg(name) {
    let neg = false;
    if (isOp(peek(), '-')) {
      i++;
      neg = true;
    }
    let node = null;
    if (peek() && peek().t === 'num') node = atom();
    const tk = peek();
    if (tk && (tk.t === 'id' || tk.t === 'const' || tk.t === 'lp' || tk.t === 'fn')) {
      let f = atom();
      if (isOp(peek(), '^')) {
        i++;
        f = { t: 'bin', op: '^', a: f, b: powerOperand() };
      }
      node = node ? { t: 'bin', op: '*', a: node, b: f } : f;
    } else if (node && isOp(peek(), '^')) {
      i++;
      node = { t: 'bin', op: '^', a: node, b: powerOperand() };
    }
    if (!node) fail('"' + name + '" needs an argument');
    return neg ? { t: 'neg', a: node } : node;
  }

  const node = expr();
  if (i < toks.length) fail('unexpected "' + toks[i].v + '"');
  return node;
}

/** Variable names used in an expression tree. */
function collectVars(n, set) {
  switch (n.t) {
    case 'var': case 'dvar': set.add(n.name); break;
    case 'neg': case 'fact': case 'pct': case 'named': collectVars(n.a, set); break;
    case 'bin': collectVars(n.a, set); collectVars(n.b, set); break;
    case 'call': n.args.forEach((a) => collectVars(a, set)); break;
    case 'list': n.items.forEach((a) => collectVars(a, set)); break;
    default: break;
  }
  return set;
}
/** Does the tree contain a node of one of the given types? */
function hasNode(n, types) {
  if (types.includes(n.t)) return true;
  switch (n.t) {
    case 'neg': case 'fact': case 'pct': case 'named': return hasNode(n.a, types);
    case 'bin': return hasNode(n.a, types) || hasNode(n.b, types);
    case 'call': return n.args.some((a) => hasNode(a, types));
    case 'list': return n.items.some((a) => hasNode(a, types));
    default: return false;
  }
}
const hasCommand = (n) => (n.t === 'call' && !!n.cmd) || (n.t === 'neg' || n.t === 'fact' || n.t === 'pct' || n.t === 'named' ? hasCommand(n.a)
  : n.t === 'bin' ? hasCommand(n.a) || hasCommand(n.b)
    : n.t === 'call' ? n.args.some(hasCommand)
      : n.t === 'list' ? n.items.some(hasCommand) : false);

// ---- pretty printer (shows the user how the text was read) --------------------
const SUP_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const toSup = (str) => Array.from(str).map((c) => (c === '-' ? '⁻' : SUP_DIGITS[+c])).join('');
const PREC = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 4 };
const precOf = (n) => (n.t === 'bin' ? PREC[n.op] : n.t === 'neg' ? 3 : 6);
function show(n, ctx) {
  const s = showRaw(n);
  return precOf(n) < ctx ? '(' + s + ')' : s;
}
function showRaw(n) {
  switch (n.t) {
    case 'num': return n.text;
    case 'var': return n.name;
    case 'dvar': return n.name + "'".repeat(n.order);
    case 'const': return n.name === 'pi' ? 'π' : n.name === 'oo' ? '∞' : 'e';
    case 'neg': return '-' + show(n.a, n.a.t === 'neg' ? 7 : 3);
    case 'fact': return show(n.a, 6) + '!';
    case 'pct': return show(n.a, 6) + '%';
    case 'call': return showCall(n);
    case 'list': return '[' + n.items.map(showRaw).join(', ') + ']';
    case 'named': return n.name + ' = ' + showRaw(n.a);
    default: break;
  }
  const { op } = n;
  if (op === '+') return show(n.a, 1) + ' + ' + show(n.b, n.b.t === 'neg' ? 7 : 1);
  if (op === '-') return show(n.a, 1) + ' - ' + show(n.b, n.b.t === 'neg' ? 7 : 2);
  if (op === '*') {
    const l = show(n.a, n.a.t === 'bin' && n.a.op === '/' ? 7 : 2);
    const r = show(n.b, n.b.t === 'neg' || (n.b.t === 'bin' && n.b.op === '/') ? 7 : 2);
    const implicit = /[0-9a-zπ)!%⁰-⁹²³¹\]]$/.test(l) && /^[a-zπ√([]/.test(r) && !/^[a-z]{2,}/.test(r) && !(/[a-z]$/.test(l) && /^e(\^|$)/.test(r));
    const spaced = /[0-9a-zπ)!%⁰-⁹²³¹\]]$/.test(l) && (/^[a-z]{2,}/.test(r) || /^e(\^|$)/.test(r));
    return l + (implicit ? '' : spaced ? ' ' : '·') + r;
  }
  if (op === '/') return show(n.a, 2) + '/' + show(n.b, n.b.t === 'neg' ? 7 : 3);
  // power
  const base = show(n.a, 5);
  const e = n.b;
  if (e.t === 'num' && /^\d{1,2}$/.test(e.text)) return base + toSup(e.text);
  if (e.t === 'neg' && e.a.t === 'num' && /^\d{1,2}$/.test(e.a.text)) return base + toSup('-' + e.a.text);
  const es = showRaw(e);
  return base + '^' + (precOf(e) >= 6 && !/\s/.test(es) ? es : '(' + es + ')');
}
function showCall(n) {
  const a = n.args;
  const one = () => (a[0].t === 'num' || a[0].t === 'var' || a[0].t === 'const' ? showRaw(a[0]) : '(' + showRaw(a[0]) + ')');
  if (n.fn === 'sqrt') return '√' + one();
  if (n.fn === 'abs') return '|' + showRaw(a[0]) + '|';
  const names = { asin: 'arcsin', acos: 'arccos', atan: 'arctan', log10: 'log' };
  return (names[n.fn] || n.fn) + '(' + a.map(showRaw).join(', ') + ')';
}
