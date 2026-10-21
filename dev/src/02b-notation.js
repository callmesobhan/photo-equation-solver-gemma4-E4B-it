
// ======================================================================
// 2b. Printed mathematical notation -> command syntax
//     ∫_a^b f dx -> integrate(f, x, a, b)      lim_{x->a} f -> limit(f, x, a)
//     Σ_{k=1}^n f -> sum(f, k, 1, n)           d/dx f -> diff(f, x)      dy/dx -> y'
// ======================================================================

/** Registry of command names (filled by the modules that implement them). */
const COMMANDS = {};
function defCmd(names, fn) {
  names.split(' ').forEach((n) => { COMMANDS[n] = fn; });
}

/** End of an expression that runs to the end of the statement (stops at ; , newline or a relation). */
function endOfExpr(s, from) {
  let depth = 0;
  for (let i = from; i < s.length; i++) {
    const c = s[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') {
      if (depth === 0) return i;
      depth--;
    } else if (depth === 0 && (c === ';' || c === '\n' || c === ',' || c === '=' || c === '<' || c === '>')) return i;
  }
  return s.length;
}

/** Read a sub/superscript starting at s[i] ('_' or '^'): "(...)" group or a simple token. */
function readScript(s, i) {
  let j = i + 1;
  while (s[j] === ' ') j++;
  if (s[j] === '(') {
    const k = matchBracket(s, j, '(', ')');
    if (k < 0) return null;
    return { text: s.slice(j + 1, k).trim(), end: k + 1 };
  }
  const m = /^[+-]?\s*(?:\d+(?:\.\d+)?|oo|pi|[a-z])/.exec(s.slice(j));
  if (!m) return null;
  return { text: m[0].replace(/\s+/g, ''), end: j + m[0].length };
}

/** Find "dx" (the differential) at bracket depth 0, starting at `from`. */
function findDifferential(s, from) {
  let depth = 0;
  for (let i = from; i < s.length; i++) {
    const c = s[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (depth === 0 && c === 'd' && (i === from || !/[a-z]/.test(s[i - 1]))) {
      const m = /^d\s*([a-z])(?![a-z0-9_(])/.exec(s.slice(i));
      if (m) return { idx: i, end: i + m[0].length, v: m[1] };
    }
  }
  return null;
}

function convertIntegrals(s) {
  for (let guard = 0; guard < 12; guard++) {
    const i = s.indexOf('∫');
    if (i < 0) break;
    let j = i + 1;
    let lo = null;
    let hi = null;
    for (let k = 0; k < 2; k++) {
      while (s[j] === ' ') j++;
      if (s[j] === '_' || s[j] === '^') {
        const r = readScript(s, j);
        if (!r) break;
        if (s[j] === '_') lo = r.text;
        else hi = r.text;
        j = r.end;
      } else break;
    }
    const d = findDifferential(s, j);
    if (!d) throw new MathError('I could not find the "dx" that ends the integral');
    const body = s.slice(j, d.idx).trim() || '1';
    const args = [body, d.v];
    if (lo !== null && hi !== null) args.push(lo, hi);
    s = s.slice(0, i) + ' integrate(' + args.join(', ') + ') ' + s.slice(d.end);
  }
  return s;
}

function convertSums(s) {
  for (let guard = 0; guard < 8; guard++) {
    const m = /\u0001([sp])/.exec(s);
    if (!m) break;
    let j = m.index + 2;
    let lo = null;
    let hi = null;
    for (let k = 0; k < 2; k++) {
      while (s[j] === ' ') j++;
      if (s[j] === '_' || s[j] === '^') {
        const r = readScript(s, j);
        if (!r) break;
        if (s[j] === '_') lo = r.text;
        else hi = r.text;
        j = r.end;
      } else break;
    }
    const lm = lo === null ? null : /^([a-z])\s*=\s*(.+)$/.exec(lo);
    if (!lm || hi === null) throw new MathError('a sum or product needs bounds such as k=1 and n');
    const end = endOfExpr(s, j);
    const body = s.slice(j, end).trim();
    s = s.slice(0, m.index) + ' ' + (m[1] === 's' ? 'sum' : 'product') + '(' + [body, lm[1], lm[2], hi].join(', ') + ') ' + s.slice(end);
  }
  return s;
}

function convertLimits(s) {
  for (let guard = 0; guard < 6; guard++) {
    const m = /\blim(?![a-z])\s*/.exec(s);
    if (!m) break;
    let j = m.index + m[0].length;
    let spec;
    if (s[j] === '_') {
      const r = readScript(s, j);
      if (!r) break;
      spec = r.text;
      j = r.end;
    } else if (s[j] === '(') {
      const k = matchBracket(s, j, '(', ')');
      if (k < 0) break;
      spec = s.slice(j + 1, k);
      j = k + 1;
    } else {
      const mm = /^([a-z])\s*(?:->|to)\s*[^\s,;=<>]+/.exec(s.slice(j));
      if (!mm) break;
      spec = mm[0];
      j += mm[0].length;
    }
    const sm = /^\s*([a-z])\s*(?:->|to)\s*(.+?)\s*$/.exec(spec);
    if (!sm) break;
    let val = sm[2];
    let dir = '';
    const dm = /^(.*?)\s*(?:\^\s*\(?\s*([+-])\s*\)?|([+-]))$/.exec(val);
    if (dm && /^(?:[+-]?(?:\d+(?:\.\d+)?|oo|pi)|[a-z])$/.test(dm[1].trim())) {
      val = dm[1].trim();
      dir = dm[2] || dm[3];
    }
    const end = endOfExpr(s, j);
    const body = s.slice(j, end).trim();
    if (!body) throw new MathError('there is nothing after "lim ..."');
    s = s.slice(0, m.index) + ' limit(' + [body, sm[1], val].concat(dir ? [dir === '+' ? '1' : '-1'] : []).join(', ') + ') ' + s.slice(end);
  }
  return s;
}

function convertDerivatives(s) {
  // tidy the LaTeX shapes ((d^2 y)/(dx^2)) -> d2y/dx2 style first
  s = s.replace(/d\^\(\s*(\d)\s*\)/g, 'd^$1');
  s = s.replace(/\(\(\s*(d(?:\^\d)?\s*[a-z]?)\s*\)\s*\/\s*\(\s*(d\s*[a-z](?:\^\d)?)\s*\)\)/g, (_, a, b) => a.replace(/\s+/g, '') + '/' + b.replace(/\s+/g, ''));
  // ratio form  dy/dx, d^2y/dx^2  ->  y' , y''
  s = s.replace(/\bd(?:\^(\d))?([a-z])\s*\/\s*d([a-z])(?:\^(\d))?(?![a-z0-9])/g, (_, n1, y, x, n2) => {
    return y + "'".repeat(Number(n1 || n2 || 1));
  });
  // operator form  d/dx f , d^2/dx^2 (f)
  for (let guard = 0; guard < 8; guard++) {
    const m = /\bd(?:\^(\d))?\s*\/\s*d([a-z])(?:\^(\d))?(?![a-z0-9])\s*/.exec(s);
    if (!m) break;
    const n = Number(m[1] || m[3] || 1);
    let j = m.index + m[0].length;
    let operand;
    let end;
    if (s[j] === '(' || s[j] === '[') {
      const open = s[j];
      const k = matchBracket(s, j, open, open === '(' ? ')' : ']');
      if (k < 0) break;
      operand = s.slice(j + 1, k);
      end = k + 1;
    } else {
      end = endOfExpr(s, j);
      operand = s.slice(j, end).trim();
    }
    if (!operand) break;
    s = s.slice(0, m.index) + ' diff(' + operand + ', ' + m[2] + (n > 1 ? ', ' + n : '') + ') ' + s.slice(end);
  }
  return s;
}

function convertNotation(s) {
  if (s.indexOf('∫') >= 0) s = convertIntegrals(s);
  if (s.indexOf('\u0001') >= 0) s = convertSums(s);
  if (/\blim(?![a-z])/.test(s)) s = convertLimits(s);
  if (/\bd(?:\^\d)?[a-z]?\s*\/\s*d[a-z]/.test(s) || /\(\(\s*d/.test(s)) s = convertDerivatives(s);
  return s;
}

/** Scalar value of a command used inside a number expression (filled in by the command modules). */
function commandNumber(n, env) {
  const c = COMMANDS[n.fn];
  if (!c || !c.num) throw new MathError('"' + n.fn + '" does not give a single number here');
  return c.num(n, env);
}
