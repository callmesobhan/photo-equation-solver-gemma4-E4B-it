// ======================================================================
// 28. Plain-English phrasings of textbook questions ("find the derivative of x^3 + 2x", "area of a circle with radius 3",
//     "gcd of 12 and 18", "mean of 2, 4, 6, 8", "determinant of [[1,2],[3,4]]", "distance between (1,2) and (4,6)" ...)
//     are rewritten into the commands that already exist. Every rule needs the WHOLE line to match, so ordinary
//     equations and expressions are never touched; word operators (plus, squared, square root of ...) are rewritten last.
// ======================================================================
const WORDS_ASK = { v: null }; // labels of the quantity that was asked for (the answer line starting with one is shown first)

// ---- small building blocks --------------------------------------------------------------------------------------------------------
const W_NUM = '[-−]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)(?:\\s*/\\s*\\d+)?';
const W_ATOM = '(?:\\d+(?:\\.\\d+)?|\\.\\d+|π|pi\\b|e\\b|∞|infinity\\b|inf\\b|oo\\b|sqrt\\s*\\([^()]*\\)|√\\s*\\d+|\\([^()]*\\))';
const W_BOUND = '[-−+]?' + W_ATOM + '(?:\\s*[*/^×·]\\s*[-−+]?' + W_ATOM + '|\\s*(?:π|pi\\b|sqrt\\s*\\([^()]*\\)))*';
const W_TERM = '(?:[\\w.]+(?:\\s*\\^\\s*(?:[\\w.]+|\\([^()]*\\)))?|\\([^()]*\\))';
const W_UNIT = '(?:\\s*(?:cm|mm|km|m|in|inch|inches|ft|feet|foot|yd|yards?|mi|miles?|units?|meters?|metres?|centimet(?:er|re)s?|kg|g)\\b)?';
const W_PT = '[\\(\\[<]\\s*(' + W_NUM + ')\\s*,\\s*(' + W_NUM + ')\\s*(?:,\\s*(' + W_NUM + ')\\s*)?[\\)\\]>]';
const wClean = (t) => t.replace(/−/g, '-').replace(/\s+/g, '');
const wNumTxt = (t) => wClean(t);

/** The text of an expression: the leading "f(x) =" / "y =" and a trailing "dx" are dropped. */
function wExpr(e) {
  e = e.trim().replace(/^(?:(?:the|a|an)\s+)?(?:function|expression|polynomial|equation|curve|graph|series|quantity)\s+/i, '');
  if ((e.match(/=/g) || []).length === 1 && !/[<>!]/.test(e)) e = e.replace(/^\s*[a-zA-Z]\s*(?:\(\s*[a-zA-Z]\s*\))?\s*=\s*/, '');
  return e.replace(/\s+(?:completely|fully)$/i, '').replace(/[\s,;]+$/, '');
}
/** word operators inside an expression */
const W_NUMWORDS = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000 };
function wOps(s) {
  const T = '(' + W_TERM + ')';
  if (W_WORDY.test(s)) s = s.replace(/\b(?:(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:[- ](one|two|three|four|five|six|seven|eight|nine))?|(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen))\b/gi, (m, t, u, w) => String(t ? W_NUMWORDS[t.toLowerCase()] + (u ? W_NUMWORDS[u.toLowerCase()] : 0) : W_NUMWORDS[w.toLowerCase()]));
  s = s.replace(/\b(\d+(?:\.\d+)?)\s*per\s*cent\b|\b(\d+(?:\.\d+)?)\s*percent(?:age)?\b/gi, (m, a, b) => (a || b) + '%');
  s = s.replace(new RegExp('\\b(?:(?:the|a|an)\\s+)?square\\s+root\\s+of\\s+' + T, 'gi'), 'sqrt($1)');
  s = s.replace(new RegExp('\\b(?:(?:the|a|an)\\s+)?cube\\s+root\\s+of\\s+' + T, 'gi'), 'cbrt($1)');
  s = s.replace(new RegExp('\\b(?:(?:the|a|an)\\s+)?(\\d+)(?:st|nd|rd|th)\\s+root\\s+of\\s+' + T.replace('(', '('), 'gi'), (m, n, x) => 'root(' + n + ', ' + x + ')');
  s = s.replace(/\b(?:raised\s+)?to\s+the\s+(\d+)(?:st|nd|rd|th)\s+power\b/gi, '^($1)');
  s = s.replace(new RegExp('\\braised\\s+to\\s+(?:(?:the|a|an)\\s+)?(?:power\\s+(?:of\\s+)?)?' + T + '(?:st|nd|rd|th)?(?:\\s+power)?', 'gi'), '^($1)');
  s = s.replace(new RegExp('\\bto\\s+the\\s+(\\d+)(?:st|nd|rd|th)\\s+power', 'gi'), '^($1)');
  s = s.replace(new RegExp('\\bto\\s+the\\s+power\\s+(?:of\\s+)?' + T, 'gi'), '^($1)');
  s = s.replace(new RegExp(T + '\\s+squared\\b', 'gi'), '$1^2').replace(new RegExp(T + '\\s+cubed\\b', 'gi'), '$1^3');
  s = s.replace(/\bnegative\s+(?=[\d(a-z])/gi, '-');
  s = s.replace(/\b(?:(?:the|a|an)\s+)?(sum|product)\s+of\s+(-?\d+(?:\.\d+)?)\s+and\s+(-?\d+(?:\.\d+)?)\b/gi, (m, w, a, b) => '(' + a + (/sum/i.test(w) ? ' + ' : ' * ') + b + ')');
  s = s.replace(/\b(?:(?:the|a|an)\s+)?difference\s+(?:of|between)\s+(-?\d+(?:\.\d+)?)\s+and\s+(-?\d+(?:\.\d+)?)\b/gi, '($1 - $2)');
  s = s.replace(new RegExp('\\btwice\\s+' + T, 'gi'), '2*$1').replace(new RegExp('\\bhalf\\s+(?:of\\s+)?' + T, 'gi'), '($1)/2');
  s = s.replace(/\bplus\b/gi, ' + ').replace(/\bminus\b/gi, ' - ');
  s = s.replace(/\b(?:multiplied\s+by|multiply\s+by|times)\b/gi, ' * ').replace(/\bdivided\s+by\b/gi, ' / ').replace(/\bover\b/gi, ' / ');
  s = s.replace(/\bis\s+(?:greater|more|larger|bigger)\s+than\s+or\s+equal\s+to\b|\bis\s+at\s+least\b|\bat\s+least\b|\bgreater\s+than\s+or\s+equal\s+to\b/gi, ' >= ');
  s = s.replace(/\bis\s+(?:less|smaller|fewer)\s+than\s+or\s+equal\s+to\b|\bis\s+at\s+most\b|\bat\s+most\b|\bless\s+than\s+or\s+equal\s+to\b/gi, ' <= ');
  s = s.replace(/\bis\s+(?:greater|more|larger|bigger)\s+than\b|\bgreater\s+than\b|\bexceeds\b/gi, ' > ').replace(/\bis\s+(?:less|smaller|fewer)\s+than\b|\bless\s+than\b/gi, ' < ');
  s = s.replace(/\bis\s+equal\s+to\b|\bequals\b|\bequal\s+to\b|\bis\s+equal\b/gi, ' = ');
  return s.replace(/\s+/g, ' ').trim();
}
const wE = (e) => wOps(wExpr(e));
/** the variable of an expression: x if present, else the only letter, else x */
function wVarOf(e) {
  const letters = new Set((e.replace(/\b(?:sin|cos|tan|cot|sec|csc|sinh|cosh|tanh|asin|acos|atan|arcsin|arccos|arctan|ln|log|log10|log2|exp|sqrt|cbrt|abs|pi|oo|heaviside|dirac)\b/gi, ' ').match(/(?<![A-Za-z])[a-z](?![A-Za-z])/g) || []));
  if (letters.has('x') || !letters.size) return 'x';
  return letters.size === 1 ? Array.from(letters)[0] : letters.has('t') ? 't' : 'x';
}

/** Peel the clauses ("with respect to t", "from 0 to 1", "at x = 2", "dx") off the end of an expression. */
function wPeel(s) {
  const o = { rest: s.trim(), v: null, lo: null, hi: null, at: null, atVar: null };
  const rxs = [
    ['range', new RegExp('\\s*(?:,\\s*)?(?:from|between|over|on|in)\\s+(?:the\\s+interval\\s+)?(?:[a-z]\\s*=\\s*)?(' + W_BOUND + ')\\s*(?:to|and|through|until|-+>?)\\s*(?:[a-z]\\s*=\\s*)?(' + W_BOUND + ')$', 'i')],
    ['range', new RegExp('\\s*(?:,\\s*)?(?:over|on|in|from)\\s+(?:the\\s+interval\\s+)?[\\[(]\\s*(' + W_BOUND + ')\\s*[,;]\\s*(' + W_BOUND + ')\\s*[\\])]$', 'i')],
    ['at', new RegExp('\\s*(?:,\\s*)?(?:at|when|where|for)\\s+(?:the\\s+point\\s+)?([a-z])\\s*(?:=|equals|is)\\s*(' + W_BOUND + ')$', 'i')],
    ['at', new RegExp('\\s*(?:,\\s*)?at\\s+(?:the\\s+point\\s+)?(' + W_BOUND + ')$', 'i')],
    ['wrt', /\s*(?:,\s*)?(?:with\s+respect\s+to|wrt|w\.r\.t\.?|in\s+terms\s+of|relative\s+to)\s+(?:the\s+variable\s+)?([a-z])$/i],
    ['dx', /^(.*?[^\sA-Za-z])\s*d([a-z])$/],
    ['dx', /^(.*?\S)\s+d([a-z])$/],
  ];
  for (let guard = 0; guard < 6; guard++) {
    let hit = false;
    for (const [kind, rx] of rxs) {
      const m = rx.exec(o.rest);
      if (!m) continue;
      if (kind === 'range' && o.lo == null) { o.lo = m[1]; o.hi = m[2]; o.rest = o.rest.slice(0, m.index); hit = true; break; }
      if (kind === 'at' && o.at == null) {
        o.at = m.length > 2 ? m[2] : m[1];
        o.atVar = m.length > 2 ? m[1] : null;
        o.rest = o.rest.slice(0, m.index);
        hit = true;
        break;
      }
      if (kind === 'wrt' && !o.v) { o.v = m[1]; o.rest = o.rest.slice(0, m.index); hit = true; break; }
      if (kind === 'dx' && !o.v) { o.v = m[2]; o.rest = m[1]; hit = true; break; }
    }
    if (!hit) break;
  }
  o.rest = o.rest.trim();
  return o;
}
const wBound = (b) => wOps(b.replace(/−/g, '-').replace(/\binfinity\b|\binf\b/gi, 'oo').replace(/∞/g, 'oo'));

/** Numbers in "2, 4, 6 and 8" (null when other words are left over). */
function wNums(str) {
  const t = str.replace(/\b(?:the|these|those|following|numbers?|values?|data(?:\s*set)?|set|list|observations?|scores?|items?|sample|population|of|and|are|is|for|given|with)\b|[:;]/gi, ' ').replace(/[\[\]{}()<>]/g, ' ');
  if (/[A-Za-z]/.test(t)) return null;
  const nums = t.match(/[-−]?\d+(?:\.\d+)?(?:e[+-]?\d+)?(?:\s*\/\s*\d+)?/gi);
  if (!nums || t.replace(/[-−]?\d+(?:\.\d+)?(?:e[+-]?\d+)?(?:\s*\/\s*\d+)?/gi, '').replace(/[\s,]+/g, '') !== '') return null;
  return nums.map(wNumTxt);
}
/** [x, y] / [x, y, z] vectors or points written as (x, y), <x, y>, [x, y] in a text. */
function wPoints(str) {
  const pts = [];
  const rx = new RegExp(W_PT, 'g');
  let m;
  while ((m = rx.exec(str))) pts.push([m[1], m[2], m[3]].filter((v) => v != null).map(wNumTxt));
  return pts;
}
const wVec = (p) => '[' + p.join(', ') + ']';
/** exactly one vector in a text: [..] or (..) / <..> */
function wOneVec(str) {
  const br = wBrackets(str);
  if (br.length) return br.length === 1 ? br[0] : null;
  const pts = wPoints(str);
  return pts.length === 1 ? wVec(pts[0]) : null;
}
/** the bracket groups [...] of a text, with nesting (matrices, lists, vectors) */
function wBrackets(str) {
  const out = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '[') { if (depth === 0) start = i; depth++; } else if (str[i] === ']') { depth--; if (depth === 0 && start >= 0) { out.push(str.slice(start, i + 1)); start = -1; } if (depth < 0) depth = 0; }
  }
  return out;
}
/** x, y coefficients of a line a x + b y + c = d written in text: [a, b, c-d] or null */
function wLine2(str) {
  const t = str.replace(/−/g, '-').replace(/\s+/g, '');
  const parts = t.split('=');
  if (parts.length !== 2) return null;
  const co = { x: 0, y: 0, k: 0 };
  const add = (side, sign) => {
    const terms = side.replace(/(?!^)([+-])/g, ' $1').split(' ').filter(Boolean);
    for (const term of terms) {
      const m = /^([+-]?)(\d*\.?\d*(?:\/\d+)?)\*?([xy]?)$/.exec(term);
      if (!m || (!m[2] && !m[3])) return false;
      let c = m[2] === '' ? 1 : m[2].includes('/') ? Number(m[2].split('/')[0]) / Number(m[2].split('/')[1]) : Number(m[2]);
      if (m[1] === '-') c = -c;
      co[m[3] || 'k'] += sign * c;
    }
    return true;
  };
  if (!add(parts[0], 1) || !add(parts[1], -1)) return null;
  if (co.x === 0 && co.y === 0) return null;
  return [co.x, co.y, co.k].map((v) => String(Math.round(v * 1e9) / 1e9));
}

// ---- the commands needed for "at a point" questions ---------------------------------------------------------------------------------
defCmd('evalat', (n) => {
  needArgs(n, 3, 3, 'an expression, the variable and the value');
  const S = fromAst(n.args[0]);
  const v = varOfArg(n.args[1]);
  const val = simp(subsS(S, v, fromAst(n.args[2])));
  const out = newOut();
  out.answer.push(symText(val));
  out.work.push('substitute ' + v + ' = ' + fmtS(fromAst(n.args[2])) + ' into ' + fmtS(S));
  return withValue(out, val);
});
COMMANDS.evalat.show = (n) => showRaw(n.args[0]) + ' at ' + showRaw(n.args[1]) + ' = ' + showRaw(n.args[2]);
defCmd('diffat', (n) => {
  needArgs(n, 3, 4, 'an expression, the variable, the point and optionally the order');
  const S = fromAst(n.args[0]);
  const v = varOfArg(n.args[1]);
  const order = n.args[3] ? Number(intArg(n.args[3])) : 1;
  if (order < 1 || order > 12) throw new MathError('the order of the derivative must be between 1 and 12');
  let d = S;
  for (let i = 0; i < order; i++) d = diffS(d, v);
  const at = fromAst(n.args[2]);
  const val = simp(subsS(d, v, at));
  const out = newOut();
  const prime = order <= 3 ? "′".repeat(order) : '^(' + order + ')';
  out.answer.push('f' + prime + '(' + fmtS(at) + ') = ' + symText(val));
  out.work.push('f(' + v + ') = ' + fmtS(S));
  out.work.push('f' + prime + '(' + v + ') = ' + fmtS(d));
  return withValue(out, val);
});
COMMANDS.diffat.show = (n) => 'd' + (n.args[3] ? '^' + showRaw(n.args[3]) : '') + '/d' + showRaw(n.args[1]) + (n.args[3] ? '^' + showRaw(n.args[3]) : '') + ' [' + showRaw(n.args[0]) + '] at ' + showRaw(n.args[1]) + ' = ' + showRaw(n.args[2]);

// ---- shapes ---------------------------------------------------------------------------------------------------------------------------
// canonical parameter names: r d C A V h w l b s a p q theta
const W_PARAM_WORDS = [
  ['r', 'radius|radii|r'], ['d', 'diameter|d'], ['C', 'circumference'], ['A', 'area'], ['V', 'volume'], ['h', 'height|altitude|tall|high|h'],
  ['w', 'width|wide|breadth|w'], ['l', 'length|long|l'], ['b', 'base|b'], ['s', 'sides?(?:\\s+length)?|edges?(?:\\s+length)?|s'],
  ['p', 'diagonal\\s*1|d1|p'], ['q', 'diagonal\\s*2|d2|q'], ['theta', 'angle|central\\s+angle|θ'],
];
/** "radius 3", "radius of 3 cm", "r = 3", "3 cm radius", "height 4" -> {r: '3', h: '4'}; "sides 3, 4 and 5" -> {sides: [...]} */
function wParams(str) {
  const o = {};
  const t = ' ' + str.replace(/−/g, '-') + ' ';
  const num = '(' + W_NUM + ')' + W_UNIT;
  const sidesRx = new RegExp('\\b(?:(?:the|a|an)\\s+)?(sides|legs|bases|diagonals|semi-?(?:axes|axis)|axes|dimensions)\\s*(?:of\\s+|are\\s+|=\\s*|:\\s*|lengths?\\s+)?((?:' + W_NUM + W_UNIT + '\\s*(?:,|and|&)?\\s*){2,4})', 'i');
  let m = sidesRx.exec(t);
  if (m) {
    const nums = m[2].match(new RegExp(W_NUM, 'g'));
    if (nums && nums.length >= 2) o[m[1].toLowerCase().replace(/^semi-?/, 'semi')] = nums.map(wNumTxt);
  }
  const byRx = new RegExp('(' + W_NUM + ')' + W_UNIT + '\\s*(?:by|x|×)\\s*(' + W_NUM + ')' + W_UNIT + '(?:\\s*(?:by|x|×)\\s*(' + W_NUM + ')' + W_UNIT + ')?', 'i');
  m = byRx.exec(t);
  if (m) o.by = [m[1], m[2], m[3]].filter((v) => v != null).map(wNumTxt);
  for (const [key, words] of W_PARAM_WORDS) {
    if (o[key] != null) continue;
    const after = new RegExp('\\b(?:' + words + ')\\b\\s*(?:of\\s+|is\\s+|are\\s+|equals\\s+|=\\s*|:\\s*|\\s)\\s*(?:about\\s+)?' + num, 'i');
    const before = new RegExp(num + '\\s*(?:' + words + ')\\b', 'i');
    const mm = after.exec(t) || before.exec(t);
    if (mm) o[key] = wNumTxt(mm[1]);
  }
  if (/degrees?|°/i.test(str) && o.theta != null) o.thetaDeg = true;
  return o;
}
const W_REG_POLY = { triangle: 3, pentagon: 5, hexagon: 6, heptagon: 7, octagon: 8, nonagon: 9, decagon: 10, dodecagon: 12 };
const W_NOUNS = 'circle|disc|disk|sphere|ball|cylinder|cone|cube|box|cuboid|rectangular\\s+(?:prism|solid|box)|rectangle|square|trapezoid|trapezium|parallelogram|rhombus|ellipse|sector|pyramid|triangle|equilateral\\s+triangle|right(?:-angled)?\\s+triangle|(?:regular\\s+)?(?:pentagon|hexagon|heptagon|octagon|nonagon|decagon|dodecagon)|regular\\s+polygon';
const W_QTY = '(area|perimeter|circumference|diameter|radius|volume|surface\\s+area|total\\s+surface\\s+area|lateral\\s+(?:surface\\s+)?area|diagonal|space\\s+diagonal|slant\\s+height|arc\\s+length|hypotenuse|side|side\\s+length|sector\\s+area|length|height)';
const W_QTY_KEYS = {
  area: ['area', 'sector area'], perimeter: ['perimeter'], circumference: ['circumference'], diameter: ['diameter'], radius: ['radius'],
  volume: ['volume'], 'surface area': ['surface area', 'total surface'], 'total surface area': ['total surface', 'surface area'],
  'lateral area': ['lateral surface'], 'lateral surface area': ['lateral surface'], diagonal: ['diagonal', 'space diagonal'], 'space diagonal': ['space diagonal'],
  'slant height': ['slant height'], 'arc length': ['arc length'], side: ['side'], 'side length': ['side'], hypotenuse: ['hypotenuse', 'c'],
};
const wKey = (q) => q.toLowerCase().replace(/\s+/g, ' ');
function wShape(qty, noun, tail) {
  const q = wKey(qty);
  const nn = noun.toLowerCase().replace(/\s+/g, ' ').replace(/^regular /, '');
  const p = wParams(tail);
  const ask = W_QTY_KEYS[q] || [q];
  const set = (cmd) => { WORDS_ASK.v = ask; return cmd; };
  const rdim = () => (p.r != null ? p.r : p.d != null ? '(' + p.d + ')/2' : null);
  const three = nn === 'sphere' || nn === 'ball';
  if (/^(circle|disc|disk)$/.test(nn)) {
    const arg = p.r != null ? 'r=' + p.r : p.d != null ? 'd=' + p.d : p.C != null ? 'C=' + p.C : p.A != null ? 'A=' + p.A : null;
    return arg ? set('circle(' + arg + ')') : null;
  }
  if (three) {
    const arg = p.r != null ? 'r=' + p.r : p.d != null ? 'd=' + p.d : p.V != null ? 'V=' + p.V : p.A != null ? 'A=' + p.A : null;
    return arg ? set('sphere(' + arg + ')') : null;
  }
  if (nn === 'cylinder') {
    const r = rdim();
    return r && p.h != null ? set('cylinder(' + r + ', ' + p.h + ')') : null;
  }
  if (nn === 'cone') {
    const r = rdim();
    return r && p.h != null ? set('cone(' + r + ', ' + p.h + ')') : null;
  }
  if (nn === 'cube') {
    const arg = p.s != null ? p.s : p.l != null ? p.l : p.V != null ? 'V=' + p.V : null;
    return arg ? set('cube(' + arg + ')') : null;
  }
  if (/^(box|cuboid|rectangular (prism|solid|box))$/.test(nn)) {
    const dims = p.by && p.by.length === 3 ? p.by : p.dimensions && p.dimensions.length === 3 ? p.dimensions : p.l != null && p.w != null && p.h != null ? [p.l, p.w, p.h] : null;
    return dims ? set('box(' + dims.join(', ') + ')') : null;
  }
  if (nn === 'rectangle') {
    const dims = p.by && p.by.length === 2 ? p.by : p.sides && p.sides.length === 2 ? p.sides : p.dimensions && p.dimensions.length === 2 ? p.dimensions : (p.l != null || p.b != null) && (p.w != null || p.h != null) ? [p.l != null ? p.l : p.b, p.w != null ? p.w : p.h] : null;
    return dims ? set('rectangle(' + dims.join(', ') + ')') : null;
  }
  if (nn === 'square') {
    const arg = p.s != null ? p.s : p.l != null ? p.l : p.d != null ? 'd=' + p.d : p.A != null ? 'A=' + p.A : p.sides && p.sides.length ? p.sides[0] : null;
    return arg ? set('square(' + arg + ')') : null;
  }
  if (nn === 'trapezoid' || nn === 'trapezium') {
    const bases = p.bases && p.bases.length === 2 ? p.bases : null;
    return bases && p.h != null ? set('trapezoid(' + bases.join(', ') + ', ' + p.h + ')') : null;
  }
  if (nn === 'parallelogram') {
    const b = p.b != null ? p.b : p.l != null ? p.l : null;
    return b && p.h != null ? set('parallelogram(' + b + ', ' + p.h + ')') : null;
  }
  if (nn === 'rhombus') {
    const dg = p.diagonals && p.diagonals.length === 2 ? p.diagonals : p.p != null && p.q != null ? [p.p, p.q] : null;
    return dg ? set('rhombus(' + dg.join(', ') + ')') : null;
  }
  if (nn === 'ellipse') {
    const ax = p.semiaxes && p.semiaxes.length === 2 ? p.semiaxes : p.semiaxis && p.semiaxis.length === 2 ? p.semiaxis : p.axes && p.axes.length === 2 ? p.axes : null;
    return ax ? set('ellipse(' + ax.join(', ') + ')') : null;
  }
  if (nn === 'sector') {
    return p.r != null && p.theta != null ? set('sector(' + p.r + ', ' + p.theta + ')') : null;
  }
  if (nn === 'pyramid') {
    const B = p.A != null ? p.A : null;
    return B && p.h != null ? set('pyramid(' + B + ', ' + p.h + ')') : null;
  }
  if (/triangle$/.test(nn)) {
    if (/^right/.test(nn) || (p.legs && p.legs.length === 2)) {
      const legs = p.legs && p.legs.length === 2 ? p.legs : null;
      return legs ? set('righttriangle(a=' + legs[0] + ', b=' + legs[1] + ')') : null;
    }
    const sd = p.sides && p.sides.length === 3 ? p.sides : null;
    if (sd && !/^equilateral/.test(nn)) return set('triangle(' + sd.join(', ') + ')');
    if (/^equilateral/.test(nn)) {
      const s = p.s != null ? p.s : sd ? sd[0] : null;
      return s ? set('polygon(3, ' + s + ')') : null;
    }
    if (p.b != null && p.h != null) {
      WORDS_ASK.v = null;
      return '(1/2)*(' + p.b + ')*(' + p.h + ')';
    }
    return null;
  }
  const sides = W_REG_POLY[nn.replace(/^regular /, '')];
  if (sides || nn === 'regular polygon' || nn === 'polygon') {
    const nsides = sides || (/\b(\d+)\s*-?\s*(?:sides|gon)/i.exec(tail) || [])[1];
    const s = p.s != null ? p.s : p.sides && p.sides.length ? p.sides[0] : null;
    return nsides && s ? set('polygon(' + nsides + ', ' + s + ')') : null;
  }
  return null;
}
/** the answer line of the asked quantity first */
function askFirst(out) {
  const keys = WORDS_ASK.v;
  if (!keys || !out || !out.answer || out.answer.length < 2) return;
  for (const k of keys) {
    const i = out.answer.findIndex((a) => a.toLowerCase().startsWith(k));
    if (i > 0) {
      out.answer.unshift(out.answer.splice(i, 1)[0]);
      return;
    }
    if (i === 0) return;
  }
}

// ---- the rules --------------------------------------------------------------------------------------------------------------------------
const W_LEAD = /^\s*(?:please\s+|pls\s+|kindly\s+)?(?:(?:can|could|would|will)\s+you\s+(?:please\s+)?)?(?:help\s+me\s+(?:to\s+)?)?(?:tell\s+me\s+)?(?:i\s+(?:want|need)\s+(?:to\s+)?)?(?:(?:find|calculate|calc|compute|determine|evaluate|work\s+out|get|give\s+me|show\s+me|what\s*(?:'s|is|are)|whats|how\s+(?:much|many)\s+is|how\s+(?:long|far|big|tall|wide|large)\s+(?:is|are))\s+(?:me\s+)?)?(?:(?:the|a|an)\s+)?(?:value\s+of\s+)?/i;
const W_ORD = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6 };
const wOrd = (t) => (t == null || t === '' ? 1 : W_ORD[t.toLowerCase()] || parseInt(t, 10));
const wCall = (name, ...args) => name + '(' + args.filter((a) => a != null).join(', ') + ')';
const W_LIST_OF = (words) => new RegExp('^(?:(?:the|a|an)\\s+)?(?:(sample|population)\\s+)?(?:' + words + ')\\s+(?:of|for|in)\\s+(.+)$', 'i');

const W_STAT = [
  ['mean|average|avg|arithmetic\\s+mean', 'mean'], ['median', 'median'], ['mode', 'mode'], ['(?:sample\\s+)?variance', 'variance'], ['standard\\s+deviation|std\\.?\\s*dev(?:iation)?|sd|stdev', 'stdev'],
  ['range', 'datarange'], ['quartiles', 'quartiles'], ['iqr|interquartile\\s+range', 'iqr'], ['five[- ]number\\s+summary', 'fivenum'], ['(?:summary|descriptive)\\s+statistics|summary', 'summary'],
  ['geometric\\s+mean', 'geomean'], ['harmonic\\s+mean', 'harmean'], ['rms|root\\s+mean\\s+square', 'rms'], ['z-?scores?', 'zscores'], ['outliers', 'outliers'],
  ['skewness', 'skewness'], ['kurtosis', 'kurtosis'], ['coefficient\\s+of\\s+variation', 'cv'], ['mean\\s+absolute\\s+deviation|mad', 'mad'],
  ['max(?:imum)?|largest|greatest|biggest|highest', 'max'], ['min(?:imum)?|smallest|least|lowest', 'min'],
];

/** One line, whole-line patterns. Returns the replacement text or null. */
function wRules(s) {
  let m;
  const T = (x) => x.replace(/^\s*(?:(?:the|a|an)\s+)?/i, '');

  // ---- equation with an interval for the unknown
  if (/[<>≤≥]|\[|\(/.test(s) && /=/.test(s) && !/\b(?:fourier|series|integral|integrate|derivative|limit|laplace|average|area|volume|length|taylor|maclaurin|sum|plot|graph|domain|tangent)\b/i.test(s)) {
    const win = wWindow(s.replace(/^solve\s+(?:the\s+equation\s+)?/i, ''));
    if (win) return win;
  }
  // ---- identities: "verify sin(x)^2 + cos(x)^2 = 1"
  if ((m = /^(?:verify|prove|show|check|confirm|demonstrate)(?:\s+(?:that|the\s+identity|the\s+trig(?:onometric)?\s+identity|whether))*\s+(.+=.+)$/i.exec(s)) && !/[<>]/.test(m[1])) return wOps(m[1]);
  if ((m = /^is\s+(.+=.+?)\s+an?\s+identity$/i.exec(s))) return wOps(m[1]);
  // ---- "if EQ, find x" and "x if EQ"
  if ((m = /^(?:if|given(?:\s+that)?|suppose(?:\s+that)?|let)\s+(.+?)\s*[,;]?\s*(?:then\s+)?(?:find|what\s+is|what\s+are|solve\s+for|determine|calculate|compute)\s+(?:the\s+value\s+of\s+)?[a-z]$/i.exec(s))) return wOps(m[1]);
  if ((m = /^(?:what\s+is\s+)?(?:the\s+value\s+of\s+)?[a-z]\s+(?:if|when|given(?:\s+that)?|such\s+that|where)\s+(.+)$/i.exec(s)) && /[=<>]|equals|less|greater/i.test(m[1])) return wOps(m[1]);
  if ((m = /^for\s+what\s+(?:values?\s+of\s+)?[a-z]\s+(?:is|does|do|are)\s+(.+)$/i.exec(s)) && /[=<>]|equals|less|greater/i.test(m[1])) return wOps(m[1].replace(/\s+true$/i, ''));
  if ((m = /^solve\s+(?:(?:the|a|an)\s+)?(?:equation|inequality|system(?:\s+of\s+equations)?)\s*[:,]?\s*(.+)$/i.exec(s))) return wOps(m[1]);

  // ---- function definitions: "f(x) = x^2 + 1, find f(3)"
  if (/^(?:let\s+)?[a-z]\(\s*[a-z]\s*\)\s*=/i.test(s)) {
    const r = wFunctions(s);
    if (r) return r;
  }

  // ---- the value of an expression at a point: "evaluate x^2 + 1 at x = 3"
  if ((m = new RegExp('^(.+?)\\s+(?:at|when|for|if|where|with)\\s+(?:the\\s+point\\s+)?([a-z])\\s*(?:=|equals|is)\\s*(' + W_BOUND + ')$', 'i').exec(s)) && /[a-z]/i.test(m[1]) && !/=/.test(m[1]) && !/\b(?:derivative|integral|limit|tangent|slope|differentiate|integrate|sum|product|series|area|volume|probability|roots?|zeros|solve|find|solution)\b/i.test(m[1])) {
    return wCall('evalat', wE(m[1].replace(/^(?:the\s+)?(?:value|result|answer)\s+of\s+/i, '')), m[2].toLowerCase(), wBound(m[3]));
  }

  // ---- derivatives
  if ((m = /^d\s*(?:\^\s*(\d)\s*)?\/\s*d\s*([a-z])\s*(?:\^\s*\d\s*)?(?:of\s+)(.+)$/i.exec(s))) {
    return wCall('diff', wE(m[3]), m[2].toLowerCase(), m[1] && m[1] !== '1' ? m[1] : null);
  }
  if ((m = /^(?:(?:the|a|an)\s+)?(?:(\d+)(?:st|nd|rd|th)|(first|second|third|fourth|fifth|sixth)|n-?th)?\s*(?:derivative|differentiation)\s+(?:of|for)\s+(.+)$/i.exec(s))) {
    const pe = wPeel(m[3]);
    const n = wOrd(m[1] || m[2]);
    const f = wE(pe.rest);
    if (pe.at != null) return wCall('diffat', f, pe.atVar || pe.v || 'x', wBound(pe.at), n > 1 ? n : null);
    return wCall('diff', f, n > 1 ? pe.v || wVarOf(f) : pe.v, n > 1 ? n : null);
  }
  if ((m = /^(?:differentiate|derive)\s+(?:(?:the|a|an)\s+)?(?:function\s+)?(.+)$/i.exec(s))) {
    const pe = wPeel(m[1]);
    const f = wE(pe.rest);
    if (pe.at != null) return wCall('diffat', f, pe.atVar || pe.v || 'x', wBound(pe.at));
    return wCall('diff', f, pe.v);
  }
  if ((m = /^(?:(?:the|a|an)\s+)?(?:equation\s+of\s+the\s+)?(?:tangent|tangent\s+line)\s+(?:line\s+)?(?:to|of|for)\s+(?!(?:(?:the|a|an)\s+)?circle)(.+)$/i.exec(s))) {
    const pe = wPeel(m[1]);
    const pts = wPoints(pe.rest);
    if (pe.at != null) return wCall('tangent', wE(pe.rest), pe.atVar || 'x', wBound(pe.at));
    const mm = /^(.*?)\s+at\s+(?:the\s+point\s+)?[\(\[]\s*(.+?)\s*,\s*.+[\)\]]$/i.exec(pe.rest);
    if (mm) return wCall('tangent', wE(mm[1]), 'x', wBound(mm[2]));
  }
  if ((m = /^(?:(?:the|a|an)\s+)?slope\s+of\s+(?:(?:the|a|an)\s+)?(?:tangent(?:\s+line)?\s+to\s+)?(?:(?:the|a|an)\s+)?(?:curve|graph|function)?\s*(.+?)\s+at\s+(?:x\s*=\s*)?(.+)$/i.exec(s)) && !wPoints(m[1]).length) {
    return wCall('diffat', wE(m[1]), 'x', wBound(m[2]));
  }

  // ---- integrals
  if ((m = /^(?:(?:the|a|an)\s+)?(?:definite\s+|indefinite\s+)?(?:integral|antiderivative|primitive)\s+(?:of|for)\s+(.+)$/i.exec(s)) || (m = /^integrate\s+(.+)$/i.exec(s))) {
    const pe = wPeel(m[1]);
    const f = wE(pe.rest);
    if (pe.lo != null) return wCall('integrate', f, pe.v, wBound(pe.lo), wBound(pe.hi));
    return wCall('integrate', f, pe.v);
  }
  if ((m = /^(?:(?:the|a|an)\s+)?(?:total\s+)?area\s+(?:under|below|beneath)\s+(?:(?:the|a|an)\s+)?(?:curve|graph|function)?\s*(.+)$/i.exec(s))) {
    const pe = wPeel(m[1]);
    if (pe.lo != null) return wCall('areabetween', wE(pe.rest), '0', pe.v || 'x', wBound(pe.lo), wBound(pe.hi));
  }
  if ((m = /^(?:(?:the|a|an)\s+)?area\s+(?:enclosed\s+|bounded\s+)?between\s+(?:(?:the|a|an)\s+)?(?:curves?|graphs?|functions?|lines?)?\s*(.+?)\s+and\s+(?!\s*$)(.+)$/i.exec(s)) && !/^[\[(]?\s*-?\d/.test(m[2])) {
    const pe = wPeel(m[2]);
    const f = wE(m[1]);
    const g = wE(pe.rest);
    return pe.lo != null ? wCall('areabetween', f, g, pe.v || 'x', wBound(pe.lo), wBound(pe.hi)) : wCall('areabetween', f, g, pe.v || 'x');
  }
  if ((m = /^(?:(?:the|a|an)\s+)?(?:average|mean)\s+value\s+of\s+(.+)$/i.exec(s))) {
    const pe = wPeel(m[1]);
    if (pe.lo != null) return wCall('avgvalue', wE(pe.rest), pe.v || 'x', wBound(pe.lo), wBound(pe.hi));
  }
  if ((m = /^(?:(?:the|a|an)\s+)?(?:arc\s*length|length)\s+of\s+(?:(?:the|a|an)\s+)?(?:curve|graph|arc)?\s*(.+)$/i.exec(s)) && !/\b(?:rectangle|circle|line\s+segment|segment|side|vector)\b/i.test(m[1])) {
    const pe = wPeel(m[1]);
    if (pe.lo != null && /[a-z]/i.test(pe.rest)) return wCall('arclength', wE(pe.rest), pe.v || 'x', wBound(pe.lo), wBound(pe.hi));
  }
  if ((m = /^(?:(?:the|a|an)\s+)?volume\s+of\s+(?:(?:the|a|an)\s+)?(?:solid\s+)?(?:generated|formed|obtained|produced)?\s*(?:by\s+)?(?:revolving|rotating|rotation\s+of|revolution\s+of)\s+(?:(?:the|a|an)\s+)?(?:curve|region|graph)?\s*(?:under\s+)?(.+?)\s+(?:about|around)\s+the\s+([xy])-?\s*axis\s*(.*)$/i.exec(s))) {
    const pe = wPeel((m[3] ? m[3] : '') || '');
    const pe2 = pe.lo != null ? pe : wPeel(m[1]);
    const f = wE(pe.lo != null ? m[1] : pe2.rest);
    if (pe2.lo != null) return m[2].toLowerCase() === 'x' ? wCall('volumerev', f, pe2.v || 'x', wBound(pe2.lo), wBound(pe2.hi)) : wCall('shells', f, pe2.v || 'x', wBound(pe2.lo), wBound(pe2.hi));
  }

  // ---- limits
  if ((m = /^(?:(?:the|a|an)\s+)?(?:two-sided\s+)?limit\s+(?:of\s+)?(.+?)\s+as\s+([a-z])\s*(?:approaches|tends\s+to|goes\s+to|->|→|⟶|→|approach|tend\s+to)\s*(.+)$/i.exec(s)) || (m = /^(?:(?:the|a|an)\s+)?limit\s+as\s+([a-z])\s*(?:approaches|tends\s+to|goes\s+to|->|→|⟶|approach|tend\s+to)\s*(.+?)\s+of\s+(.+)$/i.exec(s))) {
    const first = /^[a-z]$/i.test(m[1]) && m.length === 4 && !/^[a-z]$/i.test(m[2]);
    const expr = first ? m[3] : m[1];
    const v = first ? m[1] : m[2];
    let tail = first ? m[2] : m[3];
    let side = null;
    tail = tail.replace(/\s*(?:from\s+(?:(?:the|a|an)\s+)?(left|right|above|below|positive\s+side|negative\s+side)|\^?\s*([+\-−]))\s*$/i, (mm, w, sg) => {
      if (w) side = /right|above|positive/i.test(w) ? 1 : -1;
      else if (sg) side = sg === '+' ? 1 : -1;
      return '';
    });
    const sideWord = /\s*\(?\s*from\s+(?:(?:the|a|an)\s+)?(left|right|above|below)\s*\)?\s*$/i.exec(tail);
    if (sideWord) { side = /right|above/i.test(sideWord[1]) ? 1 : -1; tail = tail.slice(0, sideWord.index); }
    const sup = /^(.*?)\s*(?:\^\s*\(?\s*([+\-−])\s*\)?|([⁺⁻]))$/.exec(tail);
    if (sup) { side = (sup[2] || sup[3]) === '+' || sup[3] === '⁺' ? 1 : -1; tail = sup[1]; }
    const to = wBound(tail.replace(/\s+/g, ' ').trim());
    return wCall('limit', wE(expr), v.toLowerCase(), to, side);
  }

  // ---- series
  if ((m = /^(?:(?:the|a|an)\s+)?(taylor|maclaurin)\s+(?:series|polynomial|expansion)\s+(?:of|for)\s+(.+)$/i.exec(s))) {
    let rest = m[2];
    let center = /maclaurin/i.test(m[1]) ? '0' : null;
    let order = null;
    let g = true;
    while (g) {
      g = false;
      let mm;
      if ((mm = /\s*,?\s*(?:about|around|centered\s+(?:at|about)|centred\s+(?:at|about)|at|near)\s+(?:[a-z]\s*=\s*)?(.+?)$/i.exec(rest)) && !/\b(?:up|to|order|degree|terms)\b/i.test(mm[1])) { center = wBound(mm[1]); rest = rest.slice(0, mm.index); g = true; continue; }
      if ((mm = /\s*,?\s*(?:up\s+to|to|through|of)\s+(?:(?:the|a|an)\s+)?(?:order|degree)\s+(\d+)$/i.exec(rest)) || (mm = /\s*,?\s*(?:up\s+to|to|through)\s+(?:(?:the|a|an)\s+)?(\d+)(?:st|nd|rd|th)\s+(?:order|degree|power)(?:\s+term)?$/i.exec(rest)) || (mm = /\s*,?\s*(?:up\s+to|to|through)\s+(?:x\^|degree\s+|order\s+)(\d+)$/i.exec(rest))) { order = mm[1]; rest = rest.slice(0, mm.index); g = true; continue; }
      if ((mm = /\s*,?\s*(?:with|using|first)\s+(\d+)\s+terms?$/i.exec(rest))) { order = String(Number(mm[1]) - 1); rest = rest.slice(0, mm.index); g = true; continue; }
    }
    return wCall('taylor', wE(rest), 'x', center || '0', order || '5');
  }
  if ((m = /^(?:(?:the|a|an)\s+)?sum\s+of\s+(?:(?:the|a|an)\s+)?first\s+(\d+|n)\s+(positive\s+)?(integers|natural\s+numbers|whole\s+numbers|counting\s+numbers|odd\s+(?:positive\s+)?numbers|odd\s+integers|even\s+(?:positive\s+)?numbers|even\s+integers|squares|perfect\s+squares|cubes|perfect\s+cubes)$/i.exec(s))) {
    const kind = m[3].toLowerCase();
    const body = /odd/.test(kind) ? '2*k-1' : /even/.test(kind) ? '2*k' : /square/.test(kind) ? 'k^2' : /cube/.test(kind) ? 'k^3' : 'k';
    return wCall('sum', body, 'k', '1', m[1]);
  }
  if ((m = /^(?:(?:the|a|an)\s+)?(sum|product)\s+of\s+(.+?)\s+(?:for|where|with)\s+([a-z])\s*(?:=|from)\s*(.+?)\s+(?:to|through|up\s+to|until)\s+(.+)$/i.exec(s)) || (m = /^(?:(?:the|a|an)\s+)?(sum|product)\s+of\s+(.+?)\s+from\s+([a-z])\s*=\s*(.+?)\s+(?:to|through|up\s+to)\s+(.+)$/i.exec(s))) {
    return wCall(m[1].toLowerCase(), wE(m[2]), m[3].toLowerCase(), wBound(m[4]), wBound(m[5]));
  }

  // ---- algebra
  if ((m = /^(?:factor|factori[sz]e|factoring)\s+(?:(?:the|a|an)\s+)?(?:polynomial\s+|expression\s+|number\s+)?(.+)$/i.exec(s)) || (m = /^(?:(?:the|a|an)\s+)?(?:prime\s+)?factori[sz]ation\s+of\s+(.+)$/i.exec(s))) return wCall('factor', wE(m[1]));
  if ((m = /^(?:(?:the|a|an)\s+)?prime\s+factors\s+of\s+(.+)$/i.exec(s))) return wCall('factor', wE(m[1]));
  // radicals and trigonometry: rationalise, denest, sum / multiple-angle formulas, product-to-sum, power reduction
  if ((m = /^(?:rationali[sz]e|rationali[sz]ing|denest|radsimp)\s*(?:the\s+)?(?:denominator\s*)?(?:of\s+)?[:,]?\s*(.+)$/i.exec(s)) && !/^[:,]/.test(m[1])) return wCall('rationalize', wE(m[1]));
  if ((m = /^(?:remove|get\s+rid\s+of|eliminate)\s+(?:the\s+)?(?:square\s+)?roots?\s+(?:from|in)\s+(?:the\s+)?denominator\s+(?:of\s+)?(.+)$/i.exec(s))) return wCall('rationalize', wE(m[1]));
  if ((m = /^(?:use\s+)?(?:the\s+)?(?:sum|difference|angle[- ]sum|angle[- ]addition|double[- ]angle|triple[- ]angle|multiple[- ]angle)(?:\s+and\s+(?:difference|double[- ]angle))?\s+(?:formulas?|identit(?:y|ies))\s+(?:to\s+)?(?:expand|evaluate|simplify|find|write|rewrite|compute)\s+(.+)$/i.exec(s))) return wCall('trigexpand', wE(m[1]));
  if ((m = /^(?:the\s+)?(?:(?:angle[- ])?(?:sum|difference|addition)|double[- ]angle|triple[- ]angle|multiple[- ]angle)\s+(?:formulas?|identit(?:y|ies))\s+(?:for|of)\s+(.+)$/i.exec(s))) return wCall('trigexpand', wE(m[1]));
  if ((m = /^(?:express|write|rewrite)\s+(.+?)\s+(?:in\s+terms\s+of|using)\s+(?:only\s+)?(?:(?:sin|cos|tan|sine|cosine|tangent)\b.*|(?:single|simple|the\s+single)\s+angles?)$/i.exec(s)) && !/multiple/i.test(s)) return wCall('trigexpand', wE(m[1]));
  if ((m = /^(?:express|write|rewrite|convert)\s+(.+?)\s+(?:as|into)\s+(?:a\s+)?(?:sum|sums|linear\s+combination)(?:\s+of\s+(?:sines?|cosines?|sines?\s+and\s+cosines?|cosines?\s+and\s+sines?|trig\w*\s+functions?)(?:\s+of\s+(?:multiple\s+)?angles?)?)?$/i.exec(s))) return wCall('tosum', wE(m[1]));
  if ((m = /^(?:express|write|rewrite)\s+(.+?)\s+in\s+terms\s+of\s+(?:the\s+)?(?:multiple|first[- ]power|single)\s+angles?$/i.exec(s))) return wCall('tosum', wE(m[1]));
  if ((m = /^(?:use\s+)?(?:the\s+)?(?:product[- ]to[- ]sum|power[- ]reduc(?:tion|ing|e)|reduc(?:e|ing)\s+(?:the\s+)?powers?(?:\s+of)?|sum[- ]to[- ]product)(?:\s+(?:formulas?|identit(?:y|ies)))?\s*(?:to\s+(?:write|express|rewrite|simplify|find|evaluate))?\s*(?:of\s+|for\s+)?[:,]?\s*(.+)$/i.exec(s)) && !/^[:,]/.test(m[1])) return wCall('tosum', wE(m[1]));
  if ((m = /^expand\s+(?:(?:the|a|an)\s+)?(?:expression\s+|product\s+)?(.+)$/i.exec(s))) return wCall('expand', wE(m[1]));
  if ((m = /^simplify\s+(?:(?:the|a|an)\s+)?(?:(?:radical|surd|root|trig(?:onometric)?|rational|fractional|algebraic|fraction)\s+)?(?:expression\s+)?(.+)$/i.exec(s)) && !/^(?:$)/.test(m[1])) return wCall('simplify', wE(m[1]));
  if ((m = /^(?:(?:the|a|an)\s+)?partial\s+fractions?(?:\s+decomposition)?\s+(?:of|for)\s+(.+)$/i.exec(s)) || (m = /^decompose\s+(.+?)\s+into\s+partial\s+fractions$/i.exec(s))) return wCall('apart', wE(m[1]));
  if ((m = /^(?:(?:the|a|an)\s+)?(?:real\s+)?(?:roots|zeros|zeroes|solutions|x-?intercepts)\s+of\s+(?:(?:the|a|an)\s+)?(?:polynomial\s+|function\s+|equation\s+)?(.+)$/i.exec(s))) {
    const e = wExpr(m[1]);
    return /=/.test(e) ? wOps(e) : wOps(e) + ' = 0';
  }
  if ((m = /^(?:(?:the|a|an)\s+)?(?:critical\s+points|stationary\s+points|turning\s+points|extrema|extreme\s+values|local\s+(?:maxima|minima|extrema)|local\s+maxima\s+and\s+minima|maxima\s+and\s+minima|maximum\s+and\s+minimum)\s+of\s+(.+)$/i.exec(s)) && !/['′]\s*=|\bd[a-z]\s*\/\s*d[a-z]/.test(m[1])) {
    const pe = wPeel(m[1]);
    return pe.lo != null ? wCall('critical', wE(pe.rest), pe.v || 'x', wBound(pe.lo), wBound(pe.hi)) : wCall('critical', wE(pe.rest), pe.v);
  }
  if ((m = /^(?:(?:the|a|an)\s+)?(?:inflection\s+points|points\s+of\s+inflection)\s+of\s+(.+)$/i.exec(s))) return wCall('inflection', wE(m[1]));
  if ((m = /^(?:(?:the|a|an)\s+)?domain\s+(?:and\s+range\s+)?of\s+(.+)$/i.exec(s))) return wCall('domain', wE(m[1]));
  if ((m = /^(?:(?:the|a|an)\s+)?(?:inverse\s+function|inverse)\s+of\s+(?:the\s+function\s+)?([a-z]\s*\(\s*[a-z]\s*\)\s*=.+|y\s*=.+)$/i.exec(s))) return wCall('inversefunction', wE(m[1]));
  if ((m = /^(?:study|analy[sz]e|investigate|sketch)\s+(?:(?:the|a|an)\s+)?(?:function|curve|graph\s+of)?\s*(.+)$/i.exec(s)) && /[a-z]/i.test(m[1]) && /[x]/i.test(m[1]) && !/\bplot\b/i.test(s)) return wCall('analyze', wE(m[1]));
  if ((m = /^(?:(?:the|a|an)\s+)?(?:laplace\s+transform)\s+of\s+(.+)$/i.exec(s))) return wCall('laplace', wE(m[1]));
  if ((m = /^(?:(?:the|a|an)\s+)?inverse\s+laplace(?:\s+transform)?\s+of\s+(.+)$/i.exec(s))) return wCall('ilaplace', wE(m[1]));
  if ((m = /^(?:(?:the|a|an)\s+)?(vertex|focus|foci|directrix|axis\s+of\s+symmetry|center|centre|radius|asymptotes|eccentricity|major\s+axis|minor\s+axis|equation|properties)(?:\s*,?\s*(?:and\s+)?(?:vertex|focus|foci|directrix|axis\s+of\s+symmetry|center|centre|radius|asymptotes|eccentricity))*\s+of\s+(?:(?:the|a|an)\s+)?(?:parabola|circle|ellipse|hyperbola|conic(?:\s+section)?)\s*(?:with\s+equation|given\s+by|:|,)?\s*(.+=.+)$/i.exec(s))) return wOps(m[2]);

  // ---- number theory and counting
  if ((m = /^(?:(?:the|a|an)\s+)?(?:greatest\s+common\s+(?:divisor|factor)|highest\s+common\s+factor|hcf|gcd|gcf)\s+(?:of|for)\s+(.+)$/i.exec(s))) {
    const nums = wNums(m[1]);
    return nums ? wCall('gcd', ...nums) : wCall('gcd', ...m[1].split(/\s*(?:,|\band\b)\s*/).map(wE).filter(Boolean));
  }
  if ((m = /^(?:(?:the|a|an)\s+)?(?:least\s+common\s+multiple|lowest\s+common\s+multiple|lcm)\s+(?:of|for)\s+(.+)$/i.exec(s))) {
    const nums = wNums(m[1]);
    return nums ? wCall('lcm', ...nums) : wCall('lcm', ...m[1].split(/\s*(?:,|\band\b)\s*/).map(wE).filter(Boolean));
  }
  if ((m = /^is\s+(\d[\d,]*)\s+(?:a\s+)?prime(?:\s+number)?$/i.exec(s))) return wCall('isprime', m[1].replace(/,/g, ''));
  if ((m = /^is\s+(\d[\d,]*)\s+(?:a\s+)?composite(?:\s+number)?$/i.exec(s))) return wCall('isprime', m[1].replace(/,/g, ''));
  if ((m = /^(?:(?:the|a|an)\s+)?(?:factors|divisors)\s+of\s+(\d+)$/i.exec(s))) return wCall('divisors', m[1]);
  if ((m = /^(?:(?:the|a|an)\s+)?(next|smallest)\s+prime\s+(?:number\s+)?(?:after|greater\s+than|larger\s+than|above|following)\s+(\d+)$/i.exec(s))) return wCall('nextprime', m[2]);
  if ((m = /^(?:(?:the|a|an)\s+)?(?:previous|largest)\s+prime\s+(?:number\s+)?(?:before|less\s+than|smaller\s+than|below)\s+(\d+)$/i.exec(s))) return wCall('prevprime', m[1]);
  if ((m = /^(?:all\s+)?(?:(?:the|a|an)\s+)?primes?\s+(?:numbers?\s+)?(?:between\s+(\d+)\s+and\s+(\d+)|up\s+to\s+(\d+)|less\s+than\s+(\d+)|below\s+(\d+))$/i.exec(s))) return wCall('primes', m[1] || '2', m[2] || m[3] || m[4] || m[5]);
  if ((m = /^how\s+many\s+primes\s+(?:are\s+there\s+)?(?:up\s+to|less\s+than|below|under|are\s+less\s+than|are\s+below)\s+(\d+)$/i.exec(s))) return wCall('primepi', m[1]);
  if ((m = /^(?:(?:the|a|an)\s+)?(?:remainder\s+(?:when|of|if)\s+)?(\d+)\s+(?:is\s+)?(?:divided\s+by|%|mod(?:ulo)?)\s+(\d+)(?:\s+remainder)?$/i.exec(s)) && /remainder|mod/i.test(s)) return wCall('mod', m[1], m[2]);
  if ((m = /^(?:(?:the|a|an)\s+)?(?:remainder\s+(?:when|of|if|after)\s+)(\d+)\s+(?:is\s+)?(?:divided\s+by|÷|\/)\s+(\d+)$/i.exec(s))) return wCall('mod', m[1], m[2]);
  if ((m = /^(?:(?:the|a|an)\s+)?(\d+)\s*(?:st|nd|rd|th)?\s+fibonacci(?:\s+number)?$/i.exec(s)) || (m = /^fibonacci(?:\s+number)?\s+(?:number\s+)?(\d+)$/i.exec(s))) return wCall('fibonacci', m[1]);
  if ((m = /^(?:(?:the|a|an)\s+)?(\d+)\s*(?:st|nd|rd|th)?\s+lucas(?:\s+number)?$/i.exec(s))) return wCall('lucas', m[1]);
  if ((m = /^(\d+)\s*(?:!|factorial)$/i.exec(s)) || (m = /^factorial\s+of\s+(\d+)$/i.exec(s))) return wCall('factorial', m[1]);
  if ((m = /^(?:(?:the|a|an)\s+)?(?:number\s+of\s+)?(?:ways\s+to\s+choose|combinations\s+of|ways\s+of\s+choosing|ways\s+to\s+select)\s+(\d+)\s+(?:items?\s+|objects?\s+|things?\s+|people\s+|students?\s+)?(?:from|out\s+of|of)\s+(?:a\s+(?:set|group)\s+of\s+)?(\d+)(?:\s+\w+)?$/i.exec(s))) return wCall('ncr', m[2], m[1]);
  if ((m = /^(?:(?:the|a|an)\s+)?(?:number\s+of\s+)?combinations\s+of\s+(\d+)\s+(?:items?\s+|objects?\s+|things?\s+)?taken\s+(\d+)\s+at\s+a\s+time$/i.exec(s))) return wCall('ncr', m[1], m[2]);
  if ((m = /^(?:(?:the|a|an)\s+)?(?:number\s+of\s+)?permutations\s+of\s+(\d+)\s+(?:items?\s+|objects?\s+|things?\s+)?taken\s+(\d+)\s+at\s+a\s+time$/i.exec(s)) || (m = /^(?:(?:the|a|an)\s+)?(?:number\s+of\s+)?(?:ways\s+to\s+arrange|arrangements\s+of)\s+(\d+)\s+(?:items?\s+|objects?\s+|things?\s+)?(?:taken\s+|chosen\s+from\s+)?(\d+)$/i.exec(s))) return wCall('npr', m[1], m[2]);
  if ((m = /^(?:(?:the|a|an)\s+)?(?:number\s+of\s+)?(?:ways\s+to\s+arrange|ways\s+of\s+arranging|arrangements\s+of|permutations\s+of)\s+(\d+)\s+(?:distinct\s+|different\s+)?(?:items?|objects?|things?|people|books|students?|letters?|digits?)(?:\s+in\s+a\s+(?:row|line))?$/i.exec(s))) return wCall('factorial', m[1]);
  if ((m = /^(?:(?:the|a|an)\s+)?(?:number\s+of\s+)?(?:distinct\s+)?(?:permutations|arrangements|anagrams|rearrangements)\s+of\s+(?:(?:the|a|an)\s+)?(?:letters\s+(?:in|of)\s+)?(?:the\s+word\s+)?["']?([A-Za-z]{3,})["']?$/i.exec(s))) return 'anagrams of ' + m[1].toUpperCase();
  if ((m = /^(?:convert\s+)?(\d+)\s+(?:to|in|into|as)\s+(binary|octal|hex(?:adecimal)?|base\s*(\d+))$/i.exec(s)) && !/^\d+\s+(?:in)\s+base/i.test(s)) return wCall('tobase', m[1], /binary/i.test(m[2]) ? '2' : /octal/i.test(m[2]) ? '8' : /hex/i.test(m[2]) ? '16' : m[3]);
  if ((m = /^(?:convert\s+)?(?:(?:the|a|an)\s+)?(?:binary|base\s*2)\s+(?:number\s+)?([01]+)\s+(?:to|in|into)\s+(?:decimal|base\s*10)$/i.exec(s))) return wCall('frombase', m[1], '2');
  if ((m = /^(?:convert\s+)?(?:(?:the|a|an)\s+)?(?:hex(?:adecimal)?|base\s*16)\s+(?:number\s+)?([0-9a-f]+)\s+(?:to|in|into)\s+(?:decimal|base\s*10)$/i.exec(s))) return wCall('frombase', m[1], '16');
  if ((m = /^(?:convert\s+)?(?:(?:the|a|an)\s+)?(?:octal|base\s*8)\s+(?:number\s+)?([0-7]+)\s+(?:to|in|into)\s+(?:decimal|base\s*10)$/i.exec(s))) return wCall('frombase', m[1], '8');
  if ((m = /^(?:(?:the|a|an)\s+)?sum\s+of\s+(?:(?:the|a|an)\s+)?digits\s+of\s+(\d+)$/i.exec(s))) return wCall('digitsum', m[1]);
  if ((m = /^(?:(?:the|a|an)\s+)?(?:euler'?s?\s+)?(?:totient|phi)\s+of\s+(\d+)$/i.exec(s))) return wCall('totient', m[1]);
  if ((m = /^(?:(?:the|a|an)\s+)?number\s+of\s+divisors\s+of\s+(\d+)$/i.exec(s))) return wCall('numdivisors', m[1]);
  if ((m = /^(?:(?:the|a|an)\s+)?(?:log|logarithm)\s+(?:to\s+)?(?:(?:the|a|an)\s+)?base\s+(\w+(?:\.\d+)?)\s+of\s+(.+)$/i.exec(s))) return wCall('log', wE(m[2]), wE(m[1]));
  if ((m = /^(?:(?:the|a|an)\s+)?(?:natural\s+(?:log|logarithm)|ln)\s+of\s+(.+)$/i.exec(s))) return wCall('ln', wE(m[1]));
  if ((m = /^(?:(?:the|a|an)\s+)?(?:common\s+(?:log|logarithm)|log10|log\s*base\s*10)\s+of\s+(.+)$/i.exec(s))) return wCall('log10', wE(m[1]));
  if ((m = /^(?:(?:the|a|an)\s+)?(?:percent(?:age)?\s+(?:change|increase|decrease)|%\s*change)\s+(?:from|between)\s+(-?[\d.,]+)\s+(?:to|and)\s+(-?[\d.,]+)$/i.exec(s))) return wCall('pctchange', m[1].replace(/,/g, ''), m[2].replace(/,/g, ''));
  if ((m = /^what\s+percent(?:age)?\s+of\s+([\d.,]+)\s+is\s+([\d.,]+)$/i.exec(s))) return wCall('pctof', m[2].replace(/,/g, ''), m[1].replace(/,/g, ''));
  if ((m = /^([\d.,]+)\s+is\s+what\s+percent(?:age)?\s+of\s+([\d.,]+)$/i.exec(s))) return wCall('pctof', m[1].replace(/,/g, ''), m[2].replace(/,/g, ''));
  if ((m = /^(increase|decrease|reduce|raise|discount|mark(?:\s+up|\s+down))\s+\$?([\d.,]+)\s+by\s+([\d.]+)\s*(?:%|percent)$/i.exec(s))) return '(' + m[2].replace(/,/g, '') + ') * (1 ' + (/increase|raise|up/i.test(m[1]) ? '+' : '-') + ' ' + m[3] + '/100)';
  if ((m = /^(?:(?:the|a|an)\s+)?(?:price|cost|total|amount)\s+(?:of\s+\$?([\d.,]+)\s+)?after\s+(?:a\s+)?([\d.]+)\s*(?:%|percent)\s+(discount|increase|markup|tax|tip)(?:\s+(?:on|of)\s+\$?([\d.,]+))?$/i.exec(s))) {
    const base = (m[1] || m[4] || '').replace(/,/g, '');
    return base ? '(' + base + ') * (1 ' + (/discount/i.test(m[3]) ? '-' : '+') + ' ' + m[2] + '/100)' : null;
  }
  if ((m = /^(?:(?:the|a|an)\s+)?ratio\s+of\s+(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)(?:\s+to\s+(\d+(?:\.\d+)?))?$/i.exec(s))) return wCall('ratio', m[1], m[2], m[3]);

  // ---- equilibria and phase portraits: "equilibrium points of y' = y(1 - y)", "classify the equilibria of x' = ..., y' = ..."
  if ((m = /^(?:(?:classify|determine|find|analy[sz]e|identify)\s+)?(?:the\s+)?(?:(?:equilibri(?:um|a)|(?:fixed|critical|stationary)\s+(?:points?|solutions?|values?|states?))(?:\s+(?:points?|solutions?|values?|states?))?|stability|phase\s+(?:line|portrait|plane)|type|nature)(?:\s+and\s+(?:their\s+)?(?:stability|classification|types?))?(?:\s+of\s+(?:the\s+)?(?:equilibri\w+|fixed\s+points?|critical\s+points?|origin))?\s+(?:of|for|in)\s+(?:the\s+)?(?:autonomous\s+)?(?:differential\s+equation|equation|ode|system(?:\s+of\s+(?:differential\s+)?equations)?|model|linear\s+system)?\s*:?\s*(.+)$/i.exec(s))) {
    const ds = wDerivs(m[1]);
    if (ds && ds.length === 1) return wCall('equilibria', wOps(ds[0].rhs), ds[0].v);
    if (ds && ds.length === 2) return wCall('phaseplane', wOps(ds[0].rhs), wOps(ds[1].rhs), ds[0].v, ds[1].v);
  }

  // ---- plane geometry: circles, lines, tangents, transformations
  const eqsOf = (str) => str.split(/\s+and\s+|\s*;\s*|\s*,\s+(?=[a-z0-9(-])/i).map((t) => t.replace(/^(?:the\s+)?(?:lines?|circles?)\s+/i, '').trim()).filter(Boolean);
  if ((m = /^(?:the\s+)?(?:equation\s+of\s+)?(?:the\s+)?circle\s+(?:passing\s+)?through\s+(?:the\s+)?(?:points?\s+)?(.+)$/i.exec(s))) {
    const pts = wPoints(m[1]);
    if (pts.length === 3 && pts.every((p) => p.length === 2)) return wCall('circle', ...pts.map(wVec));
  }
  if ((m = /^(?:the\s+)?(?:equation\s+of\s+)?(?:the\s+)?circle\s+(?:with|having|of|whose)\s+(?:the\s+)?(?:diameter\s+)?(?:endpoints?|ends?|segment\s+joining|diameter\s+joining|diameter\s+with\s+endpoints|diameter)\s+(?:at\s+|of\s+)?(?:the\s+)?(?:points?\s+)?(.+)$/i.exec(s))) {
    const pts = wPoints(m[1]);
    if (pts.length === 2 && pts.every((p) => p.length === 2)) return wCall('circle', ...pts.map(wVec));
  }
  if ((m = /^(?:the\s+)?(?:equation\s+of\s+)?(?:the\s+)?circle\s+(?:with|having|of)\s+(?:its\s+)?cent(?:er|re)\s+(?:at\s+)?(.+?)\s*(?:,|and|with)\s*(?:a\s+|the\s+)?radius\s+(?:of\s+|=\s*)?(\d+(?:\.\d+)?(?:\/\d+)?)$/i.exec(s))) {
    const pts = wPoints(m[1]);
    if (pts.length === 1 && pts[0].length === 2) return wCall('circle', wVec(pts[0]), m[2]);
  }
  if ((m = /^(?:the\s+)?(?:equation\s+of\s+)?(?:the\s+)?perpendicular\s+bisector\s+of\s+(?:the\s+)?(?:line\s+)?(?:segment\s+)?(?:joining\s+|connecting\s+|from\s+|with\s+endpoints\s+)?(?:the\s+)?(?:points?\s+)?(.+)$/i.exec(s))) {
    const pts = wPoints(m[1]);
    if (pts.length === 2 && pts.every((p) => p.length === 2)) return wCall('perpbisector', ...pts.map(wVec));
  }
  if ((m = /^(?:the\s+)?(?:equation\s+of\s+)?(?:the\s+)?line\s+(?:passing\s+)?through\s+(?:the\s+)?(?:point\s+)?(.+?)\s+(?:and\s+)?(parallel|perpendicular)\s+to\s+(?:the\s+)?(?:line\s+)?(.+=.+)$/i.exec(s))) {
    const pts = wPoints(m[1]);
    if (pts.length === 1 && pts[0].length === 2) return wCall(m[2].toLowerCase() === 'parallel' ? 'parallel' : 'perpendicular', wOps(m[3]), wVec(pts[0]));
  }
  if ((m = /^(?:the\s+)?(?:intersection|intersection\s+point|point\s+of\s+intersection)\s+of\s+(?:the\s+)?lines?\s+(.+)$/i.exec(s)) || (m = /^where\s+do\s+(?:the\s+)?lines?\s+(.+?)\s+(?:meet|intersect|cross)$/i.exec(s))) {
    const eq = eqsOf(m[1]);
    if (eq.length === 2 && eq.every((e) => /=/.test(e))) return wCall('lineintersect', wOps(eq[0]), wOps(eq[1]));
  }
  if ((m = /^(?:the\s+)?angle\s+between\s+(?:the\s+)?lines?\s+(.+)$/i.exec(s))) {
    const eq = eqsOf(m[1]);
    if (eq.length === 2 && eq.every((e) => /=/.test(e))) return wCall('lineintersect', wOps(eq[0]), wOps(eq[1]));
  }
  if ((m = /^(?:the\s+)?distance\s+between\s+(?:the\s+)?parallel\s+lines\s+(.+)$/i.exec(s))) {
    const eq = eqsOf(m[1]);
    if (eq.length === 2 && eq.every((e) => /=/.test(e))) return wCall('parallellines', wOps(eq[0]), wOps(eq[1]));
  }
  if ((m = /^(?:the\s+)?(?:slope|intercepts?|slope\s+and\s+intercepts?|gradient)\s+of\s+(?:the\s+)?line\s+(.+=.+)$/i.exec(s))) return wCall('lineinfo', wOps(m[1]));
  if ((m = /^(?:the\s+)?(?:intersection|intersection\s+points?|points?\s+of\s+intersection)\s+of\s+(?:the\s+)?line\s+(.+=.+?)\s+(?:and|with)\s+(?:the\s+)?circle\s+(.+=.+)$/i.exec(s)) || (m = /^where\s+does\s+(?:the\s+)?line\s+(.+=.+?)\s+(?:meet|intersect|cross)\s+(?:the\s+)?circle\s+(.+=.+)$/i.exec(s))) return wCall('linecircle', wOps(m[1]), wOps(m[2]));
  if ((m = /^(?:the\s+)?(?:intersection|intersection\s+points?|points?\s+of\s+intersection)\s+of\s+(?:the\s+)?circles?\s+(.+)$/i.exec(s)) || (m = /^where\s+do\s+(?:the\s+)?circles?\s+(.+?)\s+(?:meet|intersect|cross)$/i.exec(s))) {
    const eq = eqsOf(m[1]);
    if (eq.length === 2 && eq.every((e) => /=/.test(e))) return wCall('circlecircle', wOps(eq[0]), wOps(eq[1]));
  }
  if ((m = /^(?:the\s+)?tangents?(?:\s+lines?)?\s+(?:drawn\s+)?from\s+(?:the\s+)?(?:point\s+)?(.+?)\s+to\s+(?:the\s+)?circle\s+(.+=.+)$/i.exec(s))) {
    const pts = wPoints(m[1]);
    if (pts.length === 1 && pts[0].length === 2) return wCall('tangentcircle', wOps(m[2]), wVec(pts[0]));
  }
  if ((m = /^(?:the\s+)?(?:equation\s+of\s+the\s+)?tangent(?:\s+line)?\s+to\s+(?:the\s+)?circle\s+(.+=.+?)\s+at\s+(?:the\s+)?(?:point\s+)?(.+)$/i.exec(s))) {
    const pts = wPoints(m[2]);
    if (pts.length === 1 && pts[0].length === 2) return wCall('tangentcircle', wOps(m[1]), wVec(pts[0]));
  }
  if ((m = /^(?:the\s+)?(?:reflection|mirror\s+image)\s+of\s+(?:the\s+)?(?:point\s+)?(.+?)\s+(?:in|across|about|over|on)\s+(?:the\s+)?(?:line\s+)?(.+)$/i.exec(s)) || (m = /^reflect\s+(?:the\s+)?(?:point\s+)?(.+?)\s+(?:in|across|about|over|on)\s+(?:the\s+)?(?:line\s+)?(.+)$/i.exec(s))) {
    const pts = wPoints(m[1]);
    let l = m[2].trim();
    if (/^x-?\s*axis$/i.test(l)) l = 'y = 0';
    else if (/^y-?\s*axis$/i.test(l)) l = 'x = 0';
    if (pts.length === 1 && pts[0].length === 2 && /=/.test(l)) return wCall('reflect', wVec(pts[0]), wOps(l));
  }
  if ((m = /^(?:rotate|rotation\s+of)\s+(?:the\s+)?(?:point\s+)?(.+?)\s+(?:by|through)\s+(-?[\d.]+)\s*(?:degrees?|°)\s*(?:counter-?clockwise|anticlockwise|ccw)?\s*(?:about|around|from|at)?\s*(?:the\s+)?(?:point\s+)?(origin|.*)$/i.exec(s))) {
    const pts = wPoints(m[1]);
    const cen = /origin|^$/i.test(m[3]) ? [] : wPoints(m[3]);
    let ang = m[2];
    if (/(?<![a-z])clockwise/i.test(s) && !/counter|anti/i.test(s)) ang = String(-Number(ang));
    if (pts.length === 1 && pts[0].length === 2 && (!cen.length || cen[0].length === 2)) return wCall('rotate', wVec(pts[0]), ang, cen.length ? wVec(cen[0]) : null);
  }
  if ((m = /^(?:translate|shift|move)\s+(?:the\s+)?(?:point\s+)?(.+?)\s+by\s+(?:the\s+)?(?:vector\s+)?(.+)$/i.exec(s))) {
    const a = wPoints(m[1]);
    const b = wPoints(m[2]);
    if (a.length === 1 && b.length === 1 && a[0].length === 2 && b[0].length === 2) return wCall('translate', wVec(a[0]), wVec(b[0]));
  }
  if ((m = /^(?:dilate|enlarge|scale)\s+(?:the\s+)?(?:point\s+)?(.+?)\s+by\s+(?:a\s+)?(?:scale\s+)?(?:factor\s+)?(?:of\s+)?(-?\d+(?:\.\d+)?)\s*(?:about|around|from|with\s+centre\s+|with\s+center\s+)?\s*(?:the\s+)?(?:point\s+|centre\s+|center\s+)?(origin|.*)$/i.exec(s))) {
    const a = wPoints(m[1]);
    const cen = /origin|^$/i.test(m[3]) ? [] : wPoints(m[3]);
    if (a.length === 1 && a[0].length === 2 && (!cen.length || cen[0].length === 2)) return wCall('dilate', wVec(a[0]), m[2], cen.length ? wVec(cen[0]) : null);
  }
  if ((m = /^(?:the\s+)?(?:point\s+)?(?:which\s+)?divid(?:es|ing)\s+(?:the\s+)?(?:line\s+)?(?:segment\s+)?(?:joining\s+)?(?:the\s+points?\s+)?(.+?)\s+(internally|externally)?\s*in\s+the\s+ratio\s+(\d+)\s*:\s*(\d+)$/i.exec(s))) {
    const pts = wPoints(m[1]);
    if (pts.length === 2 && pts.every((p) => p.length === 2)) return wCall('section', wVec(pts[0]), wVec(pts[1]), m[3], /extern/i.test(m[2] || '') ? '-' + m[4] : m[4]);
  }
  if ((m = /^(?:are|is)\s+(?:the\s+)?(?:points?\s+)?(.+?)\s+collinear$/i.exec(s))) {
    const pts = wPoints(m[1]);
    if (pts.length >= 3 && pts.every((p) => p.length === 2)) return wCall('collinear', ...pts.map(wVec));
  }
  if ((m = /^(?:the\s+)?convex\s+hull\s+of\s+(?:the\s+)?(?:points?\s+)?(.+)$/i.exec(s))) {
    const pts = wPoints(m[1]);
    if (pts.length >= 3 && pts.every((p) => p.length === 2)) return wCall('hull', ...pts.map(wVec));
  }
  if ((m = /^(?:the\s+)?(circum-?cent(?:er|re)|circumradius|in-?cent(?:er|re)|inradius|ortho-?cent(?:er|re)|nine-point\s+cent(?:er|re)|angles|sides)\s+(?:and\s+\w+\s+)?of\s+(?:the\s+)?triangle\s+(?:with\s+)?(?:vertices|corners|points)?\s*(?:at\s+|are\s+|:)?\s*(.+)$/i.exec(s))) {
    const pts = wPoints(m[2]);
    if (pts.length === 3 && pts.every((p) => p.length === 2)) {
      const q = m[1].toLowerCase().replace(/-/g, '');
      WORDS_ASK.v = /circumrad/.test(q) ? ['circumcentre'] : /circum/.test(q) ? ['circumcentre'] : /inrad|incent/.test(q) ? ['incentre'] : /ortho/.test(q) ? ['orthocentre'] : /angles/.test(q) ? ['scalene', 'isosceles', 'equilateral'] : ['sides'];
      return wCall('triangle2d', ...pts.map(wVec));
    }
  }

  // ---- geometry: shapes
  if ((m = new RegExp('^(?:a\\s+|an\\s+|the\\s+)?(' + W_NOUNS + ')\\s+(?:with|of|having|whose|that\\s+has|has|:)\\s*(.+)$', 'i').exec(s))) {
    const r = wShape('area', m[1], m[2]);
    if (r) { WORDS_ASK.v = null; return r; }
  }
  if ((m = /^(?:(?:the|a|an)\s+)?hypotenuse\s+of\s+(?:a\s+|the\s+)?right(?:-angled)?\s+triangle\s+(?:with\s+)?(?:legs|sides)\s*(?:of\s+|are\s+)?(.+)$/i.exec(s))) {
    const nums = wNums(m[1]);
    if (nums && nums.length === 2) return wCall('hypotenuse', ...nums);
  }
  if ((m = /^(?:(?:the|a|an)\s+)?(?:missing\s+|other\s+|unknown\s+)?(?:leg|side)\s+of\s+(?:a\s+|the\s+)?right(?:-angled)?\s+triangle\s+(?:with\s+)?hypotenuse\s*(?:of\s+|=\s*)?(\d+(?:\.\d+)?)\s+and\s+(?:one\s+|the\s+other\s+)?(?:leg|side)\s*(?:of\s+|=\s*)?(\d+(?:\.\d+)?)$/i.exec(s))) return wCall('leg', m[1], m[2]);

  if ((m = new RegExp('^(?:(?:the|a|an)\\s+)?' + W_QTY + '\\s+(?:of|for|in)\\s+(?:a\\s+|an\\s+|the\\s+|one\\s+)?(?:[a-z-]+\\s+){0,2}?(' + W_NOUNS + ')\\s*(?:with|of|that\\s+has|having|whose|has|where|if|given|and|:|,|-)?\\s*(.*)$', 'i').exec(s))) {
    const r = wShape(m[1], m[2], m[3]);
    if (r) return r;
  }
  if ((m = new RegExp('^(?:(?:the|a|an)\\s+)?' + W_QTY + '\\s+(?:of|for)\\s+(?:a\\s+|an\\s+|the\\s+)?(' + W_NOUNS + ')\\s+(.*)$', 'i').exec(s))) {
    const r = wShape(m[1], m[2], m[3]);
    if (r) return r;
  }
  if ((m = new RegExp('^(?:a|an|the)\\s+(' + W_NOUNS + ')\\s+(?:has|with|having|of|whose)\\s+(.*?)[,;]?\\s*(?:what|find|calculate)\\s+(?:is\\s+)?(?:(?:the|a|an)\\s+)?' + W_QTY + '$', 'i').exec(s))) {
    const r = wShape(m[3], m[1], m[2]);
    if (r) return r;
  }
  // ---- geometry: coordinates
  if ((m = /^(?:(?:the|a|an)\s+)?distance\s+(?:between|from)\s+(?:(?:the|a|an)\s+)?(?:points?\s+)?(.+?)\s+(?:and|to)\s+(?:(?:the|a|an)\s+)?(?:points?\s+)?(.+)$/i.exec(s))) {
    const a = wPoints(m[1]);
    const b = wPoints(m[2]);
    if (a.length === 1 && b.length === 1 && a[0].length === b[0].length) return wCall('distance', wVec(a[0]), wVec(b[0]));
    const pl = wPoints(m[1]);
    const co = wLine2(m[2].replace(/^(?:(?:the|a|an)\s+)?line\s*/i, ''));
    if (pl.length === 1 && pl[0].length === 2 && co) return wCall('pointlinedistance', pl[0][0], pl[0][1], co[0], co[1], co[2]);
  }
  if ((m = /^(?:(?:the|a|an)\s+)?distance\s+from\s+(?:(?:the|a|an)\s+)?(?:point\s+)?(.+?)\s+to\s+(?:(?:the|a|an)\s+)?line\s+(.+)$/i.exec(s))) {
    const pl = wPoints(m[1]);
    const co = wLine2(m[2]);
    if (pl.length === 1 && pl[0].length === 2 && co) return wCall('pointlinedistance', pl[0][0], pl[0][1], co[0], co[1], co[2]);
  }
  if ((m = /^(?:(?:the|a|an)\s+)?mid-?point\s+(?:of|between)\s+(?:(?:the|a|an)\s+)?(?:line\s+)?(?:segment\s+)?(?:joining\s+|with\s+endpoints\s+|connecting\s+|from\s+)?(?:(?:the|a|an)\s+)?(?:points?\s+)?(.+)$/i.exec(s))) {
    const pts = wPoints(m[1]);
    if (pts.length === 2 && pts[0].length === pts[1].length) return wCall('midpoint', wVec(pts[0]), wVec(pts[1]));
  }
  if ((m = /^(?:(?:the|a|an)\s+)?(?:slope|gradient)\s+(?:of\s+(?:(?:the|a|an)\s+)?line\s+)?(?:through|between|joining|connecting|passing\s+through|containing)\s+(?:(?:the|a|an)\s+)?(?:points?\s+)?(.+)$/i.exec(s)) || (m = /^(?:(?:the|a|an)\s+)?(?:slope|gradient)\s+of\s+(?:(?:the|a|an)\s+)?(?:line\s+)?(?:segment\s+)?(?:from\s+)?(.+)$/i.exec(s))) {
    const pts = wPoints(m[1]);
    if (pts.length === 2 && pts[0].length === 2 && pts[1].length === 2) return wCall('slope', wVec(pts[0]), wVec(pts[1]));
  }
  if ((m = /^(?:(?:the|a|an)\s+)?(?:equation\s+of\s+)?(?:(?:the|a|an)\s+)?line\s+(?:through|passing\s+through|joining|connecting|containing|between)\s+(?:(?:the|a|an)\s+)?(?:points?\s+)?(.+)$/i.exec(s))) {
    const pts = wPoints(m[1]);
    if (pts.length === 2 && pts[0].length === 2 && pts[1].length === 2) return wCall('line', wVec(pts[0]), wVec(pts[1]));
  }
  if ((m = /^(?:(?:the|a|an)\s+)?area\s+of\s+(?:(?:the|a|an)\s+)?(?:triangle|polygon|quadrilateral|pentagon|hexagon|region)\s+(?:with\s+|having\s+|whose\s+)?(?:vertices|corners|points)\s*(?:at\s+|of\s+|are\s+|:)?\s*(.+)$/i.exec(s))) {
    const pts = wPoints(m[1]);
    if (pts.length >= 3 && pts.every((p) => p.length === 2)) return wCall('polygonarea', ...pts.map(wVec));
  }
  if ((m = /^(?:(?:the|a|an)\s+)?(centroid|center\s+of\s+mass)\s+of\s+(?:(?:the|a|an)\s+)?(?:triangle|polygon)\s+(?:with\s+)?(?:vertices|points)?\s*(?:at\s+|of\s+|are\s+|:)?\s*(.+)$/i.exec(s))) {
    const pts = wPoints(m[2]);
    if (pts.length >= 3) return wCall('centroid', ...pts.map(wVec));
  }

  // ---- linear algebra
  const MAT = '(?:(?:the|a|an)\\s+)?(?:matrix\\s+)?(?:[A-Z]\\s*=\\s*)?';
  const mk = (words, cmd) => {
    const mm = new RegExp('^(?:(?:the|a|an)\\s+)?(?:' + words + ')\\s+of\\s+' + MAT + '(.+)$', 'i').exec(s);
    if (!mm) return null;
    const br = wBrackets(mm[1]);
    if (br.length === 1 && mm[1].replace(br[0], '').replace(/[\s.,]/g, '') === '') return wCall(cmd, br[0]);
    if (/;/.test(mm[1]) && /^\[.*\]$/.test(mm[1].trim())) return wCall(cmd, mm[1].trim());
    return null;
  };
  const MATS = [['nullity|dimension\\s+of\\s+(?:the\\s+)?(?:null\\s*space|kernel)', 'nullity'], ['(?:a\\s+)?basis\\s+(?:for|of)\\s+(?:the\\s+)?(?:column\\s+space|range|image)', 'colspace'], ['(?:a\\s+)?basis\\s+(?:for|of)\\s+(?:the\\s+)?(?:null\\s*space|kernel)', 'nullspace'], ['determinant|det', 'det'], ['inverse', 'inv'], ['transpose', 'transpose'], ['trace', 'trace'], ['rank', 'rank'], ['(?:reduced\\s+)?row\\s+echelon\\s+form|rref', 'rref'], ['eigenvalues\\s+and\\s+eigenvectors|eigenvectors\\s+and\\s+eigenvalues|eigenvalues|eigenvectors|eigen\\s*system', 'eigen'],
    ['characteristic\\s+polynomial', 'charpoly'], ['null\\s*space|kernel', 'nullspace'], ['column\\s+space', 'colspace'], ['lu\\s+(?:decomposition|factori[sz]ation)', 'lu'], ['qr\\s+(?:decomposition|factori[sz]ation)', 'qr'],
    ['singular\\s+values?(?:\\s+decomposition)?|svd', 'svd'], ['diagonali[sz]ation', 'diagonalize'], ['cholesky\\s+(?:decomposition|factori[sz]ation)', 'cholesky'], ['pseudo-?inverse', 'pinv'], ['matrix\\s+exponential', 'expm'], ['jordan\\s+(?:normal\\s+)?form', 'jordan']];
  for (const [words, cmd] of MATS) {
    const r = mk(words, cmd);
    if (r) return r;
  }
  if ((m = /^(?:diagonali[sz]e|invert|transpose)\s+(?:(?:the|a|an)\s+)?(?:matrix\s+)?(\[.*\])$/i.exec(s))) return wCall(/^diag/i.test(s) ? 'diagonalize' : /^inv/i.test(s) ? 'inv' : 'transpose', m[1]);
  if ((m = /^(?:is\s+)?(?:(?:the|a|an)\s+)?(?:matrix\s+)?(\[.*\])\s+(?:positive\s+definite|invertible|singular|diagonali[sz]able)$/i.exec(s))) return /definite/i.test(s) ? wCall('definite', m[1]) : /diagonali/i.test(s) ? wCall('diagonalize', m[1]) : wCall('det', m[1]);
  if ((m = /^(?:solve\s+)?(?:(?:the|a|an)\s+)?(?:linear\s+)?system\s+(?:with\s+)?(?:coefficient\s+)?matrix\s+(\[\[.*\]\])\s+(?:and\s+(?:right[- ]hand\s+side|constants?|vector)|=|\*\s*x\s*=)\s*(\[.*\])$/i.exec(s))) return wCall('linsolve', m[1], m[2]);
  if ((m = /^(?:are|is)\s+(?:the\s+)?(?:vectors?\s+)?(.+?)\s+linearly\s+(independent|dependent)$/i.exec(s)) || (m = /^(?:the\s+)?linear\s+(independence|dependence)\s+of\s+(?:the\s+)?(?:vectors?\s+)?(.+)$/i.exec(s)) && (m = [m[0], m[2], m[1]])) {
    const vs = wBrackets(m[1]).length ? wBrackets(m[1]) : wPoints(m[1]).map(wVec);
    if (vs.length >= 1) return wCall('independent', ...vs);
  }
  if ((m = /^(?:is|does)\s+(?:the\s+)?(?:vector\s+)?(\[[^\[\]]*\]|\([^()]*\)|<[^<>]*>)\s+(?:in|lie\s+in|belong\s+to)\s+(?:the\s+)?span\s+of\s+(?:the\s+)?(?:vectors?\s+)?(.+)$/i.exec(s)) || (m = /^(?:can|could)\s+(?:the\s+)?(?:vector\s+)?(\[[^\[\]]*\]|\([^()]*\)|<[^<>]*>)\s+be\s+(?:written|expressed)\s+as\s+a\s+linear\s+combination\s+of\s+(?:the\s+)?(?:vectors?\s+)?(.+)$/i.exec(s))) {
    const t = wBrackets(m[1]).length ? wBrackets(m[1])[0] : wPoints(m[1]).map(wVec)[0];
    const gens = wBrackets(m[2]).length ? wBrackets(m[2]) : wPoints(m[2]).map(wVec);
    if (t && gens.length) return wCall('inspan', t, ...gens);
  }
  const vecs = (rest) => {
    const br = wBrackets(rest);
    if (br.length === 2) return br;
    const pts = wPoints(rest);
    if (pts.length === 2 && pts[0].length === pts[1].length) return pts.map(wVec);
    return null;
  };
  if ((m = /^(?:(?:the|a|an)\s+)?(dot|inner|scalar)\s+product\s+of\s+(?:(?:the|a|an)\s+)?(?:vectors?\s+)?(.+)$/i.exec(s))) {
    const v = vecs(m[2]);
    if (v) return wCall('dot', ...v);
  }
  if ((m = /^(?:(?:the|a|an)\s+)?(?:cross|vector)\s+product\s+of\s+(?:(?:the|a|an)\s+)?(?:vectors?\s+)?(.+)$/i.exec(s))) {
    const v = vecs(m[1]);
    if (v) return wCall('cross', ...v);
  }
  if ((m = /^(?:(?:the|a|an)\s+)?(?:angle)\s+between\s+(?:(?:the|a|an)\s+)?(?:vectors?\s+)?(.+)$/i.exec(s))) {
    const v = vecs(m[1]);
    if (v) return wCall('angle', ...v);
  }
  if ((m = /^(?:(?:the|a|an)\s+)?(?:vector\s+)?(?:projection)\s+of\s+(?:(?:the|a|an)\s+)?(?:vector\s+)?(.+?)\s+(?:onto|on\s+to|on)\s+(?:(?:the|a|an)\s+)?(?:vector\s+)?(.+)$/i.exec(s))) {
    const a = wOneVec(m[1]);
    const b = wOneVec(m[2]);
    if (a && b) return wCall('proj', a, b);
  }
  if ((m = /^(?:(?:the|a|an)\s+)?(?:magnitude|length|norm)\s+of\s+(?:(?:the|a|an)\s+)?(?:vector\s+)?(.+)$/i.exec(s))) {
    const a = wOneVec(m[1]);
    if (a) return wCall('norm', a);
  }
  if ((m = /^(?:(?:the|a|an)\s+)?unit\s+vector\s+(?:in\s+the\s+direction\s+of|of|along|parallel\s+to)\s+(?:(?:the|a|an)\s+)?(?:vector\s+)?(.+)$/i.exec(s))) {
    const a = wOneVec(m[1]);
    if (a) return wCall('unit', a);
  }

  // ---- statistics
  for (const [words, cmd] of W_STAT) {
    if ((m = W_LIST_OF(words).exec(s))) {
      const nums = wNums(m[2]);
      if (!nums || nums.length < (cmd === 'stdev' || cmd === 'variance' ? 2 : 1)) continue;
      let name = cmd;
      if (m[1] && m[1].toLowerCase() === 'population') name = cmd === 'stdev' ? 'popstdev' : cmd === 'variance' ? 'popvariance' : cmd;
      return wCall(name, ...nums);
    }
  }
  if ((m = /^(?:(?:the|a|an)\s+)?(?:sum|total)\s+of\s+(.+)$/i.exec(s))) {
    const nums = wNums(m[1]);
    if (nums && nums.length >= 2) return nums.join(' + ');
  }
  if ((m = /^(?:(?:the|a|an)\s+)?product\s+of\s+(.+)$/i.exec(s))) {
    const nums = wNums(m[1]);
    if (nums && nums.length >= 2) return nums.map((x) => '(' + x + ')').join(' * ');
  }
  if ((m = /^(?:(?:the|a|an)\s+)?(correlation|covariance|spearman(?:\s+correlation)?|kendall(?:\s+tau)?)(?:\s+coefficient)?\s+(?:of|between|for)\s+(.+)$/i.exec(s)) && wBrackets(m[2]).length === 2) return wCall(/corr/i.test(m[1]) ? 'correlation' : /cov/i.test(m[1]) ? 'covariance' : /spear/i.test(m[1]) ? 'spearman' : 'kendall', ...wBrackets(m[2]));
  if ((m = /^(?:(?:the|a|an)\s+)?(?:linear\s+regression|regression\s+line|line\s+of\s+best\s+fit|least[- ]squares\s+line)\s+(?:of|for|to|through)?\s*(.+)$/i.exec(s)) && wBrackets(m[1]).length === 2) return wCall('linreg', ...wBrackets(m[1]));
  if ((m = /^(?:(?:the|a|an)\s+)?z-?score\s+(?:of|for)\s+(-?[\d.]+)\s*,?\s*(?:with|given|when|if|where)?\s*(?:a\s+)?mean\s*(?:of|=)?\s*(-?[\d.]+)\s*(?:,|and)?\s*(?:a\s+)?(?:standard\s+deviation|sd|std)\s*(?:of|=)?\s*([\d.]+)$/i.exec(s))) return wCall('zscore', m[1], m[2], m[3]);
  if ((m = /^(?:(?:the|a|an)\s+)?probability\s+(?:of\s+)?(?:getting\s+|obtaining\s+|having\s+|seeing\s+)?(exactly|at\s+least|at\s+most|more\s+than|fewer\s+than|less\s+than)?\s*(\d+)\s+(?:heads?|tails?|successes?|hits?|sixes|\w+s?)\s+(?:in|out\s+of|from|when)\s+(?:flipping\s+|tossing\s+|rolling\s+)?(?:a\s+(?:fair\s+)?coin\s+)?(\d+)\s*(?:coin\s+|die\s+|dice\s+)?(?:times?|trials?|tosses|flips|attempts|tries|rolls)?(?:\s+of\s+a\s+(?:fair\s+)?coin)?(?:\s+(?:with|if|when|where|and)\s+(?:(?:the|a|an)\s+)?(?:success\s+)?probability\s*(?:of\s+success\s*)?(?:is\s+|of\s+|=\s*)?(0?\.\d+|\d+\/\d+|\d+%))?$/i.exec(s))) {
    const k = m[2];
    const n = m[3];
    const p = m[4] ? (m[4].endsWith('%') ? '(' + m[4].slice(0, -1) + '/100)' : m[4]) : '1/2';
    const how = (m[1] || 'exactly').toLowerCase().replace(/\s+/g, ' ');
    if (how === 'exactly') return wCall('binompdf', n, p, k);
    if (how === 'at most') return wCall('binomcdf', n, p, k);
    if (how === 'at least') return wCall('binomcdf', n, p, k, n);
    if (how === 'more than') return Number(k) + 1 > Number(n) ? null : wCall('binomcdf', n, p, String(Number(k) + 1), n);
    return Number(k) - 1 < 0 ? null : wCall('binomcdf', n, p, String(Number(k) - 1));
  }
  if ((m = /^(?:x\s*(?:~|follows|is)\s*)?bin(?:omial)?\s*\(\s*(?:n\s*=\s*)?(\d+)\s*,\s*(?:p\s*=\s*)?([\d./]+)\s*\)\s*[,;:.]?\s*(?:find\s+|calculate\s+)?P\s*\(\s*X\s*(=|<=|>=|<|>|≤|≥)\s*(\d+)\s*\)$/i.exec(s))) {
    const [, n, p, op, k] = m;
    const K = Number(k);
    if (op === '=') return wCall('binompdf', n, p, k);
    if (op === '<=' || op === '≤') return wCall('binomcdf', n, p, k);
    if (op === '<') return K === 0 ? null : wCall('binomcdf', n, p, String(K - 1));
    if (op === '>=' || op === '≥') return wCall('binomcdf', n, p, k, n);
    return K + 1 > Number(n) ? null : wCall('binomcdf', n, p, String(K + 1), n);
  }
  if ((m = /^(?:x\s*(?:~|follows|is)\s*)?(?:a\s+)?normal(?:ly\s+distributed)?(?:\s+(?:distribution|random\s+variable|variable))?\s+with\s+(?:a\s+)?mean\s*(?:of|=)?\s*(-?[\d.]+)\s*(?:,|and)?\s*(?:a\s+)?(?:standard\s+deviation|sd|sigma|σ)\s*(?:of|=)?\s*([\d.]+)\s*[,;:.]?\s*(?:find\s+|calculate\s+|what\s+is\s+)?(?:(?:the|a|an)\s+)?(?:probability\s+(?:that\s+)?)?(?:P\s*\(\s*)?(?:X|x)\s*(<=|>=|<|>|≤|≥|is\s+(?:less|greater|more|fewer)\s+than|is\s+(?:above|below)|between)\s*(-?[\d.]+)(?:\s*(?:and|,)\s*(-?[\d.]+))?\s*\)?$/i.exec(s))) {
    const [, mu, sd, op, a, b] = m;
    if (/between/i.test(op) && b != null) return wCall('normalcdf', a, b, mu, sd);
    if (/<|less|below|fewer|≤/i.test(op)) return wCall('normalcdf', '-oo', a, mu, sd);
    return wCall('normalcdf', a, 'oo', mu, sd);
  }

  // ---- rank / exact tests, regression inference
  const lists = (str) => wBrackets(str).filter((b) => !/^\[\s*\[/.test(b));
  if ((m = /^(?:the\s+)?(?:mann[- ]whitney(?:\s+u)?|wilcoxon\s+rank[- ]sum)(?:\s+test)?\s+(?:of|for|on|with|between)\s+(.+)$/i.exec(s))) {
    const L = lists(m[1]);
    if (L.length === 2) return wCall('mannwhitney', L[0], L[1]);
  }
  if ((m = /^(?:the\s+)?wilcoxon(?:\s+signed[- ]rank)?(?:\s+test)?\s+(?:of|for|on|with|between)\s+(.+)$/i.exec(s))) {
    const L = lists(m[1]);
    if (L.length === 2) return wCall('wilcoxon', L[0], L[1]);
    if (L.length === 1) return wCall('wilcoxon', L[0]);
  }
  if ((m = /^(?:the\s+)?kruskal[- ]wallis(?:\s+(?:h\s+)?test)?\s+(?:of|for|on|with|between)\s+(.+)$/i.exec(s))) {
    const L = lists(m[1]);
    if (L.length >= 2) return wCall('kruskalwallis', ...L);
  }
  if ((m = /^(?:the\s+)?sign\s+test\s+(?:of|for|on|with)\s+(.+?)(?:\s+(?:against|versus|vs\.?|with\s+median|median)\s+(-?[\d.]+))?$/i.exec(s))) {
    const L = lists(m[1]);
    if (L.length === 2) return wCall('signtest', L[0], L[1]);
    if (L.length === 1 && m[2]) return wCall('signtest', L[0], m[2]);
  }
  if ((m = /^(?:the\s+)?fisher'?s?(?:\s+exact)?(?:\s+test)?\s+(?:of|for|on|with)\s+(?:the\s+)?(?:table\s+)?(\[\s*\[.*\]\s*\])$/i.exec(s))) return wCall('fisherexact', m[1]);
  if ((m = /^(?:the\s+)?mcnemar'?s?(?:\s+test)?\s+(?:of|for|on|with)\s+(?:the\s+)?(?:table\s+)?(\[\s*\[.*\]\s*\])$/i.exec(s))) return wCall('mcnemar', m[1]);
  if ((m = /^(?:(?:test|inference|confidence\s+interval|t[- ]test)\s+(?:for|of|on)\s+)?(?:the\s+)?(?:slope|regression\s+(?:slope|inference)|slope\s+of\s+(?:the\s+)?regression\s+line)\s+(?:of|for|on|with|between)\s+(.+)$/i.exec(s)) || (m = /^regression\s+(?:inference|analysis|test)\s+(?:of|for|on|with|between)\s+(.+)$/i.exec(s))) {
    const L = lists(m[1]);
    if (L.length === 2) return wCall('reginf', L[0], L[1]);
  }

  // ---- Fourier series
  if ((m = /^(?:the\s+)?(?:(half[- ]range)\s+)?fourier\s+(sine|cosine|)\s*(?:series|expansion)(?:\s+(?:expansion|representation))?\s+(?:of|for)\s+(.+)$/i.exec(s)) || (m = /^(?:the\s+)?(half[- ]range)\s+()?(sine|cosine)\s+(?:series|expansion)\s+(?:of|for)\s+(.+)$/i.exec(s)) && (m = [m[0], m[1], m[3], m[4]])) {
    const pe = wPeel(m[3]);
    const f = wE(pe.rest);
    const kind = m[2].toLowerCase();
    if (pe.lo != null) {
      const v = pe.v || wVarOf(f);
      if (kind) return wCall(kind === 'sine' ? 'fouriersin' : 'fouriercos', f, v, wBound(pe.hi));
      return wCall('fourier', f, v, wBound(pe.lo), wBound(pe.hi));
    }
  }

  // ---- precalculus helpers
  if ((m = /^(?:the\s+)?(?:amplitude|period|phase\s+shift|frequency|vertical\s+shift|midline)(?:\s*,?\s*(?:and\s+)?(?:amplitude|period|phase\s+shift|frequency|vertical\s+shift|midline))*\s+of\s+(?:the\s+)?(?:function\s+)?(.+)$/i.exec(s)) && /\b(?:sin|cos|tan|cot|sec|csc)\b/i.test(m[1])) return wCall('sinusoid', wE(m[1]));
  if ((m = /^(?:the\s+)?(?:rational|possible\s+rational)\s+(?:zeros|roots)(?:\s+and\s+(?:zeros|roots))?\s+(?:of|for)\s+(.+)$/i.exec(s))) return wCall('ratroots', wE(m[1]));
  if ((m = /^(?:the\s+)?end\s+behaviou?r\s+of\s+(?:the\s+)?(?:function\s+|polynomial\s+)?(.+)$/i.exec(s))) return wCall('endbehavior', wE(m[1]));
  if ((m = /^(?:the\s+)?range\s+of\s+(?:the\s+)?(?:function\s+)?(.+)$/i.exec(s)) && /[a-z]/i.test(m[1]) && !wNums(m[1])) return wCall('rangeof', wE(m[1]));
  if ((m = /^(?:the\s+)?domain\s+and\s+range\s+of\s+(?:the\s+)?(?:function\s+)?(.+)$/i.exec(s))) return wCall('rangeof', wE(m[1]));
  if ((m = /^(?:is|determine\s+whether|determine\s+if|check\s+whether|decide\s+whether)\s+(?:the\s+function\s+)?(.+?)\s+(?:is\s+)?even,?\s+(?:or\s+)?odd(?:,?\s+or\s+neither)?$/i.exec(s)) || (m = /^(?:the\s+)?(?:symmetry|parity)\s+of\s+(?:the\s+)?(?:function\s+)?(.+)$/i.exec(s))) return wCall('evenodd', wE(m[1]));
  if ((m = /^(?:the\s+)?(constant\s+term|coefficient\s+of\s+([a-z])(?:\^(\d+)|\s*\^\s*\(\s*(\d+)\s*\))?)\s+(?:in|of)\s+(?:the\s+)?(?:expansion\s+of\s+)?(.+)$/i.exec(s))) {
    const v = m[2] ? m[2].toLowerCase() : wVarOf(m[5]);
    return wCall('coeff', wE(m[5]), v, m[2] ? (m[3] || m[4] || '1') : '0');
  }
  if ((m = /^(?:the\s+)?(?:remainder\s+(?:when|of|if|after)\s+)(.+?)\s+(?:is\s+)?divided\s+by\s+(.+)$/i.exec(s)) && /[a-z]/i.test(m[1])) return wCall('divide', wE(m[1]), wE(m[2]));
  if ((m = /^divide\s+(.+?)\s+by\s+(.+)$/i.exec(s)) && /[a-z]/i.test(m[1])) return wCall('divide', wE(m[1]), wE(m[2]));
  if ((m = /^(?:the\s+)?exact\s+value\s+of\s+(.+)$/i.exec(s))) return wE(m[1].replace(/(\d+(?:\.\d+)?)\s*degrees?\b/gi, '$1°'));
  if ((m = /^(.+?)\s+in\s+degrees$/i.exec(s)) && /\b(?:arcsin|arccos|arctan|asin|acos|atan|inverse)/i.test(m[1])) return '(' + wE(m[1]) + ')*180/pi';
  if ((m = /^(?:the\s+)?(\d+)(?:st|nd|rd|th)\s+term\s+of\s+(?:the\s+)?(arithmetic|geometric)\s+(?:sequence|progression|series)\s*:?\s*(.+)$/i.exec(s)) || (m = /^(?:the\s+)?sum\s+of\s+(?:the\s+)?first\s+(\d+)\s+terms\s+of\s+(?:the\s+)?(arithmetic|geometric)\s+(?:sequence|progression|series)\s*:?\s*(.+)$/i.exec(s))) {
    const nums = wNums(m[3].replace(/\.\.\.|…/g, ''));
    if (nums && nums.length >= 2) return /arith/i.test(m[2]) ? wCall('arith', nums[0], '(' + nums[1] + ') - (' + nums[0] + ')', m[1]) : wCall('geom', nums[0], '(' + nums[1] + ')/(' + nums[0] + ')', m[1]);
  }
  if ((m = /^(?:the\s+)?sum\s+of\s+(?:the\s+)?infinite\s+geometric\s+(?:series|sequence)\s*:?\s*(.+)$/i.exec(s))) {
    const nums = wNums(m[1].replace(/\.\.\.|…/g, ''));
    if (nums && nums.length >= 2) return wCall('geom', nums[0], '(' + nums[1] + ')/(' + nums[0] + ')', '5');
  }
  if ((m = /^(?:solve\s+)?(?:the\s+)?(?:triangle|law\s+of\s+(?:sines|cosines))\s*(?:with|where|given|:|,)?\s*(.+)$/i.exec(s))) {
    const params = [...m[1].matchAll(/\b([abcABC])\s*=\s*(\d+(?:\.\d+)?)/g)].map((x) => x[1] + '=' + x[2]);
    if (params.length >= 3 && new Set(params.map((x) => x[0])).size === params.length) return wCall('triangle', ...params);
  }
  if ((m = /^(?:find\s+)?(?:the\s+)?(?:composition|compose)\s+(?:of\s+)?(?:the\s+functions\s+)?([a-z])\s*\(\s*x\s*\)\s*=\s*(.+?)\s+(?:and|with)\s+([a-z])\s*\(\s*x\s*\)\s*=\s*(.+)$/i.exec(s))) return wCall('compose', wE(m[2]), wE(m[4]), 'x');
  // ---- cards, bags of balls, dice
  const CARDS = { hearts: 13, heart: 13, spades: 13, spade: 13, clubs: 13, club: 13, diamonds: 13, diamond: 13, 'red cards': 26, 'red card': 26, 'black cards': 26, 'black card': 26, aces: 4, ace: 4, kings: 4, king: 4, queens: 4, queen: 4, jacks: 4, jack: 4, 'face cards': 12, 'face card': 12 };
  const NUMW = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
  const cnt = (t) => (/^\d+$/.test(t) ? Number(t) : NUMW[t.toLowerCase()]);
  if ((m = /^(?:the\s+)?probability\s+(?:of|that)\s+(?:you\s+)?(?:drawing|getting|picking|selecting|choosing|being\s+dealt|draw|get)\s+(a|an|one|two|three|four|five|six|\d+)\s+(hearts?|spades?|clubs?|diamonds?|red\s+cards?|black\s+cards?|aces?|kings?|queens?|jacks?|face\s+cards?)(?:\s+(?:in|from|out\s+of)\s+(a|one|two|three|four|five|six|\d+)\s+(?:draws?|cards?|picks?))?(?:\s+(?:in|from|out\s+of|of)\s+(?:a\s+)?(?:standard\s+|regular\s+)?(?:52[- ]card\s+)?(?:deck|pack)(?:\s+of\s+cards)?)?(?:\s+without\s+replacement)?$/i.exec(s))) {
    const K = CARDS[m[2].toLowerCase().replace(/\s+/g, ' ')];
    const k = cnt(m[1]);
    const nn = m[3] ? cnt(m[3]) : k;
    if (K && k != null && nn != null && /deck|pack|cards?|standard/i.test(s)) return wCall('hyperpdf', '52', K, nn, k);
  }
  if ((m = /^(?:(?:a|an|the)\s+)?(?:(?:bag|box|jar|urn|bowl|basket)\s+(?:contains|has|holds|with|is\s+filled\s+with)\s+)?(\d+\s+[a-z]+.*?)[.;,]?\s*(?:what\s+is\s+)?(?:the\s+)?probability\s+(?:of|that)\s+(?:you\s+)?(?:drawing|getting|picking|selecting|choosing|draw|get)\s+(a|an|one|two|three|four|five|six|\d+)\s+(\w+?)(?:s)?(?:\s+(?:ball|marble|bead|candy|candie|sock|chip|card|coin)s?)?(?:\s+(?:in|from|out\s+of)\s+(a|one|two|three|four|five|six|\d+)\s+(?:draws?|picks?|tries|balls?|marbles?))?(\s+with(?:out)?\s+replacement)?$/i.exec(s))) {
    const items = [...m[1].matchAll(/(\d+)\s+([a-z]+?)(?:s)?\b(?!\s*(?:balls?|marbles?|beads?)\s+and)/gi)].filter((x) => !/^(?:balls?|marbles?|beads?|candies|candy|socks?|chips?|cards?|coins?|and|in|total)$/i.test(x[2]));
    const total = items.reduce((t, x) => t + Number(x[1]), 0);
    const want = items.find((x) => x[2].toLowerCase() === m[3].toLowerCase().replace(/s$/, ''));
    const k = cnt(m[2]);
    const nn = m[4] ? cnt(m[4]) : k;
    if (want && total && k != null && nn != null && nn >= k) {
      const withRepl = /with\s+replacement/i.test(m[5] || '') && !/without/i.test(m[5] || '');
      return withRepl ? wCall('binompdf', nn, Number(want[1]) + '/' + total, k) : wCall('hyperpdf', total, want[1], nn, k);
    }
  }
  if ((m = /^(?:the\s+)?probability\s+(?:of\s+)?(?:rolling|getting|throwing|obtaining)\s+(?:a\s+)?(?:total|sum)\s+of\s+(\d+)\s+(?:with|on|when\s+rolling|when\s+throwing|using)\s+(two|three|four|\d+)\s+(?:fair\s+|six-sided\s+|standard\s+)*dice$/i.exec(s))) return wCall('dice', cnt(m[2]), 6, m[1]);

  // ---- finance
  const money = (t) => t.replace(/[$,]/g, '');
  if ((m = /^(?:(?:the|a|an)\s+)?(compound|simple)\s+interest\s+(?:on|for|of)\s+\$?\s*([\d,.]+)\s+(?:at|with|and|of)\s+(?:an?\s+(?:annual\s+)?(?:interest\s+)?rate\s+of\s+)?([\d.]+)\s*(?:%|percent)(?:\s+(?:per\s+year|annually|a\s+year|per\s+annum|p\.?a\.?))?\s*(?:,\s*)?(?:for|over)\s+([\d.]+)\s*(years?|months?)(?:\s*,?\s*(?:compounded\s+)?(annually|yearly|semi-?annually|quarterly|monthly|weekly|daily|\d+\s+times\s+(?:a|per)\s+year))?$/i.exec(s))) {
    const years = /month/i.test(m[5]) ? '(' + m[4] + '/12)' : m[4];
    const freq = m[6] ? ({ annually: 1, yearly: 1, semiannually: 2, 'semi-annually': 2, quarterly: 4, monthly: 12, weekly: 52, daily: 365 }[m[6].toLowerCase()] || (/^\d+/.exec(m[6]) || [1])[0]) : null;
    return /simple/i.test(m[1]) ? wCall('simpleinterest', money(m[2]), m[3] + '%', years) : wCall('compound', money(m[2]), m[3] + '%', years, freq);
  }
  if ((m = /^(?:(?:the|a|an)\s+)?(?:monthly\s+)?(?:payment|mortgage\s+payment|loan\s+payment)\s+(?:on|for)\s+(?:a\s+|an\s+)?\$?\s*([\d,.]+)\s+(?:loan|mortgage|debt)?\s*(?:at|with|and|of)\s+(?:an?\s+(?:annual\s+)?(?:interest\s+)?rate\s+of\s+)?([\d.]+)\s*(?:%|percent)(?:\s+(?:per\s+year|annually|a\s+year|apr))?\s*(?:,\s*)?(?:for|over)\s+([\d.]+)\s*years?$/i.exec(s))) return wCall('loan', money(m[1]), m[2] + '%', m[3]);
  if ((m = /^(?:(?:the|a|an)\s+)?(?:time|how\s+long)\s+(?:does\s+it\s+take\s+)?(?:for\s+(?:money|an\s+investment)\s+)?to\s+double\s+at\s+([\d.]+)\s*(?:%|percent)(?:\s+(?:interest|per\s+year|annually))?$/i.exec(s))) return wCall('doubletime', m[1] + '%');

  return null;
}

/** "f(x) = x^2 + 1, g(x) = 2x; find f(g(3))": the definitions are substituted into the question. */
function wFunctions(s) {
  const defs = new Map();
  const rx = /(?:^|[,;]|\band\b|\bwith\b|\blet\b|\bgiven\b)\s*(?:let\s+)?([a-z])\s*\(\s*([a-z])\s*\)\s*=\s*([^,;]+?)(?=\.(?:\s|$)|\s*(?:[,;]|\band\b|\bfind\b|\bevaluate\b|\bcompute\b|\bcalculate\b|\bwhat\b|\bdetermine\b|$))/gi;
  let m;
  let last = 0;
  while ((m = rx.exec(s))) {
    defs.set(m[1].toLowerCase(), { v: m[2].toLowerCase(), e: m[3].trim() });
    last = rx.lastIndex;
  }
  if (!defs.size) return null;
  let q = s.slice(last).replace(/^[\s,;.]*(?:and\s+)?(?:then\s+)?(?:find|evaluate|compute|calculate|what\s+is|what's|determine|get)?\s*(?:the\s+value\s+of\s+)?/i, '').trim();
  if (!q || !new RegExp('\\b[' + Array.from(defs.keys()).join('') + ']\\s*\\(', 'i').test(q)) return null;
  const callRx = new RegExp('(?<![A-Za-z])([' + Array.from(defs.keys()).join('') + '])\\s*\\(', 'g');
  for (let guard = 0; guard < 12; guard++) {
    const mm = callRx.exec(q);
    if (!mm) break;
    const open = mm.index + mm[0].length - 1;
    const close = matchBracket(q, open, '(', ')');
    if (close < 0) return null;
    const def = defs.get(mm[1].toLowerCase());
    const arg = q.slice(open + 1, close);
    const body = def.e.replace(new RegExp('(?<![A-Za-z])' + def.v + '(?![A-Za-z])', 'g'), '(' + arg + ')');
    q = q.slice(0, mm.index) + '(' + body + ')' + q.slice(close + 1);
    callRx.lastIndex = 0;
  }
  return q;
}

const W_WORDY = /\b(?:plus|minus|times|multiplied|divided|over|squared|cubed|power|root|equals?|percent|per\s*cent|less\s+than|greater\s+than|at\s+least|at\s+most|twice|half|negative|sum\s+of|product\s+of|difference)\b/i;
function convertWordLine(line) {
  const s0 = line.trim().replace(/\s+/g, ' ');
  if (s0.length < 4 || s0.length > 400 || !/[A-Za-z]{3}|\b(?:of|on|in)\b/.test(s0)) return line;
  const s = s0.replace(/\s*[?!]+$/, '').replace(/\s*\.$/, '');
  const lead = s.replace(W_LEAD, '');
  WORDS_ASK.v = null;
  let hit = null;
  try {
    hit = wRules(lead);
    if (hit == null && lead !== s) hit = wRules(s);
  } catch (e) {
    hit = null;
  }
  if (hit != null) return hit;
  WORDS_ASK.v = null;
  if (W_WORDY.test(lead)) {
    const t = wOps(lead);
    if (t !== lead) return t;
  }
  return line;
}
function convertWords(raw) {
  if (!/[A-Za-z]{3}|\b(?:of|on|in)\b/.test(raw)) return raw;
  return raw.split('\n').map(convertWordLine).join('\n');
}

/** Words of problem statements that can never be part of an equation: they would be read as products of letters. */
const ENGLISH_WORDS = new Set(('of is the and for are was were will would can could how why who whom what when where which while that this these those then than there their them they with without from into onto over under about around between after before during since until because '
  + 'find solve evaluate calculate compute determine simplify show tell give please help answer result value values equal equals plus minus times divided multiplied squared cubed power root square cube fraction fractions radical radicals surd surds rationalize rationalise denominator numerator denest identity formula formulas terms multiple angle angles sum product reduction expand '
  + 'positive negative integer integers real number numbers function expression equation equations inequality problem question given following true false have has does did not each every some any all both either '
  + 'area volume length width height radius diameter perimeter circumference triangle circle rectangle sphere cylinder derivative integral limit approaches respect interval point points line slope distance '
  + 'probability chance prime factor factors remainder divisible greater less least most larger smaller exactly approximately roughly total sum product average mean median mode').split(' '));

/** One equation in one unknown plus bounds on that unknown ("sin(x) = 1/2, 0 <= x <= 2pi"): solve inside the interval. */
function tryWindowedEquation(sts) {
  const eqs = sts.filter((s) => s.kind === 'eq');
  const rels = sts.filter((s) => s.kind === 'rel');
  if (eqs.length !== 1 || !rels.length || eqs.length + rels.length !== sts.length) return null;
  const vars = new Set();
  collectVars(eqs[0].lhs, vars);
  collectVars(eqs[0].rhs, vars);
  if (vars.size !== 1) return null;
  const v = Array.from(vars)[0];
  let lo = -Infinity;
  let hi = Infinity;
  let loInc = true;
  let hiInc = true;
  for (const st of rels) {
    for (const c of st.conds) {
      const lv = c.lhs.t === 'var' && c.lhs.name === v;
      const rv = c.rhs.t === 'var' && c.rhs.name === v;
      if (lv === rv) return null;
      const other = lv ? c.rhs : c.lhs;
      const ov = new Set();
      collectVars(other, ov);
      if (ov.size) return null;
      const val = evalNum(other, {});
      if (!isFinite(val)) return null;
      // normalise to "v op val"
      const flip = { '<': '>', '>': '<', '<=': '>=', '>=': '<=', '!=': '!=', '=': '=' };
      const op = lv ? c.op : flip[c.op];
      if (op === '<' || op === '<=') { if (val < hi || (val === hi && op === '<')) { hi = val; hiInc = op === '<='; } } else if (op === '>' || op === '>=') { if (val > lo || (val === lo && op === '>')) { lo = val; loInc = op === '>='; } } else return null;
    }
  }
  if (!isFinite(lo) || !isFinite(hi) || lo > hi) return null;
  const win = { lo, hi, loInc, hiInc };
  try {
    const dom = [];
    const f = rfSub(evalRF(eqs[0].lhs, new Map([[v, RF_X]]), dom), evalRF(eqs[0].rhs, new Map([[v, RF_X]]), dom));
    return solveRationalEquation(f, dom, eqs[0], v, win);
  } catch (e) {
    if (!(e instanceof NotAlgebraic)) throw e;
  }
  return solveNumericEquation(eqs[0], v, win);
}
/** "sin(x) = 1/2 for 0 <= x <= 2pi", "cos(x) = 0.5 on [0, 2pi]", "x^2 = 2, x in (0, 3)" -> the equation and the bounds as two statements */
function wWindow(line) {
  let m;
  const brk = '([\\[(])\\s*(' + W_BOUND + ')\\s*[,;]\\s*(' + W_BOUND + ')\\s*([\\])])\\s*$';
  if ((m = new RegExp('^(.+=[^<>]*?)\\s*(?:,|;|\\bfor\\b|\\bwhere\\b|\\bwith\\b|\\bwhen\\b|\\bon\\b|\\bin\\b)\\s*(?:the\\s+interval\\s+)?(?:([a-z])\\s*(?:in|∈)\\s*)?' + brk, 'i').exec(line)) && !/[<>]/.test(m[1])) {
    const v = m[2] || (/(?<![A-Za-z])([a-z])(?![A-Za-z])/i.exec(m[1].replace(/\b(?:sin|cos|tan|cot|sec|csc|ln|log|exp|sqrt|abs|pi)\b/gi, '')) || [])[1];
    if (!v) return null;
    return m[1].trim() + '; ' + m[4] + ' ' + (m[3] === '[' ? '<=' : '<') + ' ' + v + ' ' + (m[6] === ']' ? '<=' : '<') + ' ' + m[5];
  }
  if ((m = /^(.+?=[^<>≤≥]*?)\s*(?:,|;|\bfor\b|\bwhere\b|\bwith\b|\bwhen\b|\bon\b|\bin\b|\bif\b)\s*(?:the\s+interval\s+)?(.*[<>≤≥].*)$/i.exec(line)) && !/[<>≤≥]/.test(m[1]) && !/=/.test(m[2].replace(/[<>!]=/g, ''))) return m[1].trim() + '; ' + m[2].trim();
  return null;
}

/** "x' = 3x + y; y' = x + 3y", "dy/dt = y(1 - y)": the dependent letters and their right-hand sides, or null */
function wDerivs(text) {
  const parts = text.split(/\s*;\s*|\n|\s+and\s+|\s*,\s*(?=[a-z]\s*'|d[a-z]\s*\/)/i).map((t) => t.trim()).filter(Boolean);
  const out = [];
  for (const p of parts) {
    const m = /^([a-z])\s*['′]\s*(?:\(\s*[a-z]\s*\))?\s*=\s*(.+)$/i.exec(p) || /^d\s*([a-z])\s*\/\s*d\s*[a-z]\s*=\s*(.+)$/i.exec(p);
    if (!m) return null;
    out.push({ v: m[1].toLowerCase(), rhs: m[2].trim() });
  }
  return out.length ? out : null;
}
