// ======================================================================
// 8b. Literal equations: solve a formula for one of its letters
//     v = u + a t  for t,   A = P e^(r t)  for t,   1/f = 1/u + 1/v  for v ...
// ======================================================================

/** "solve v = u + a*t for t", "solve for t: ...", "make t the subject of ...": the equation text and the letter. */
const TV = '(\u0002?[a-z](?:_\\([0-9a-z]+\\)|_[0-9a-z])?)';
const tvName = (t) => t.replace(/[()]/g, '').replace(/\u0002([a-z])/, (m, l) => l.toUpperCase());
function splitTarget(s) {
  const hit = (m, textIdx, tvIdx) => ({ text: m[textIdx], target: tvName(m[tvIdx]) });
  let m = /^\s*solve\s*\((.*)\)\s*$/.exec(s);
  if (m) {
    const inner = m[1];
    let depth = 0;
    let cut = -1;
    for (let i = 0; i < inner.length; i++) {
      if (inner[i] === '(' || inner[i] === '[') depth++;
      else if (inner[i] === ')' || inner[i] === ']') depth--;
      else if (inner[i] === ',' && depth === 0) cut = i;
    }
    if (cut > 0 && new RegExp('^\\s*' + TV + '\\s*$').test(inner.slice(cut + 1)) && /[=<>]/.test(inner.slice(0, cut))) return { text: inner.slice(0, cut), target: tvName(inner.slice(cut + 1).trim()) };
    return { text: s, target: '' };
  }
  const pats = [
    [new RegExp('^\\s*(?:make|let)\\s+' + TV + '\\s+the\\s+subject(?:\\s+of)?\\s*[:,]?\\s*(.+)$'), 2, 1],
    [new RegExp('^\\s*(?:express|write)\\s+' + TV + '\\s+in\\s+terms\\s+of\\s+[a-z](?:_\\([0-9a-z]+\\)|_[0-9a-z])?(?:\\s*(?:,|and)\\s*[a-z](?:_\\([0-9a-z]+\\))?)*\\s*[:,]?\\s*(?:given\\s+that\\s+|if\\s+|when\\s+)?(.+=.+)$'), 2, 1],
    [new RegExp('^\\s*(?:please\\s+)?(?:solve|find|isolate|rearrange)\\s+for\\s+(?:the\\s+(?:variable|unknown)\\s+)?' + TV + '(?:\\s+in\\s+terms\\s+of\\s+[a-z0-9_(), ]+?)?\\s*(?:[:;,]|\\bin\\b|\\bif\\b|\\bgiven\\b|\\bwhen\\b)?\\s*(.+=.+)$'), 2, 1],
    [new RegExp('^\\s*(?:please\\s+)?(?:solve|rearrange|isolate)\\s+(.+=.+?)\\s*,?\\s+for\\s+(?:the\\s+(?:variable|unknown)\\s+)?' + TV + '\\s*[.?]*$'), 1, 2],
    [new RegExp('^(.+=.+?)\\s*[,;.]?\\s*(?:and\\s+)?(?:please\\s+)?(?:solve|find|isolate|rearrange)\\s+(?:it\\s+|this\\s+)?for\\s+(?:the\\s+(?:variable|unknown)\\s+)?' + TV + '\\s*[.?]*$'), 1, 2],
    [new RegExp('^(.+=.+?)\\s*[,;.]?\\s*(?:solve|find|isolate)\\s+(?:for\\s+)?' + TV + '\\s+in\\s+terms\\s+of\\s+.*$'), 1, 2],
    [new RegExp('^([^;\\n]+=[^;\\n]+?)\\s*[,;.]?\\s+for\\s+(?:the\\s+(?:variable|unknown)\\s+)?' + TV + '\\s*[.?]*$'), 1, 2],
  ];
  for (const [re, ti, vi] of pats) {
    m = re.exec(s);
    if (m && !/\bfor\b/.test(m[ti])) return hit(m, ti, vi);
  }
  return { text: s, target: '' };
}

const dependsOn = (e, v) => !freeOf(e, v);

/** Solutions (as symbolic expressions) of L = R for v when v occurs once; null otherwise. */
function isolateVar(L, R, v, depth) {
  if (depth > 40) return null;
  if (L.k === 'v' && L.name === v) return [R];
  if (!dependsOn(L, v)) return dependsOn(R, v) ? isolateVar(R, L, v, depth + 1) : null;
  if (dependsOn(R, v)) return null;
  switch (L.k) {
    case '+': {
      const dep = L.a.filter((t) => dependsOn(t, v));
      if (dep.length !== 1) return null;
      return isolateVar(dep[0], sSub(R, sAdd(L.a.filter((t) => !dependsOn(t, v)))), v, depth + 1);
    }
    case '*': {
      const dep = L.a.filter((t) => dependsOn(t, v));
      if (dep.length !== 1) return null;
      return isolateVar(dep[0], sDiv(R, sMul(L.a.filter((t) => !dependsOn(t, v)))), v, depth + 1);
    }
    case '^': {
      if (dependsOn(L.e, v)) {
        if (dependsOn(L.b, v)) return null;
        const lnR = sFn('ln', [R]);
        return isolateVar(L.e, isConstE(L.b) ? lnR : sDiv(lnR, sFn('ln', [L.b])), v, depth + 1);
      }
      if (L.e.k !== 'n') {
        return isolateVar(L.b, sPow(R, sDiv(S1, L.e)), v, depth + 1);
      }
      const q = L.e.q;
      const inv = qInt(1).div(q);
      const base = isolateVar(L.b, sPow(R, sN(inv)), v, depth + 1);
      if (!base) return null;
      const evenNumerator = q.n % 2n === 0n;
      return evenNumerator ? base.concat(base.map((b) => sNeg(b))) : base;
    }
    case 'f': {
      const a = L.a[0];
      const INV = { sin: 'asin', cos: 'acos', tan: 'atan', asin: 'sin', acos: 'cos', atan: 'tan', sinh: null, cosh: null };
      if (L.fn === 'ln') return isolateVar(a, sExp(R), v, depth + 1);
      if (L.fn === 'abs') {
        const b = isolateVar(a, R, v, depth + 1);
        const c = isolateVar(a, sNeg(R), v, depth + 1);
        return b && c ? b.concat(c) : null;
      }
      if (INV[L.fn]) return isolateVar(a, sFn(INV[L.fn], [R]), v, depth + 1);
      return null;
    }
    default: return null;
  }
}

/** Multiply by every denominator that contains v, so that v only occurs in a polynomial. */
function clearDenominators(E, v) {
  for (let round = 0; round < 6; round++) {
    const bases = new Map();
    const walk = (e) => {
      if (e.k === '^') {
        if (e.e.k === 'n' && e.e.q.isInt() && e.e.q.sign() < 0 && dependsOn(e.b, v)) {
          const k = key(e.b);
          const need = Number(-e.e.q.n);
          if (!bases.has(k) || bases.get(k).p < need) bases.set(k, { b: e.b, p: need });
        }
        walk(e.b);
        walk(e.e);
      } else if (e.k === '+' || e.k === '*' || e.k === 'f') e.a.forEach(walk);
    };
    walk(E);
    if (!bases.size) return E;
    let mult = S1;
    bases.forEach((x) => { mult = sMul([mult, sPow(x.b, sI(x.p))]); });
    E = expandS(sMul([E, mult]));
  }
  return E;
}

function polynomialSolutions(L, R, v) {
  let E = expandS(sSub(L, R));
  E = clearDenominators(E, v);
  const cs = polyCoeffsS(E, v);
  if (!cs) return null;
  while (cs.length > 1 && cs[cs.length - 1].k === 'n' && cs[cs.length - 1].q.isZero()) cs.pop();
  const deg = cs.length - 1;
  if (deg < 1) return null;
  if (deg === 1) return [simp(sDiv(sNeg(cs[0]), cs[1]))];
  if (deg === 2) {
    const [c, b, a] = cs;
    const disc = expandS(sSub(sMul([b, b]), sMul([sI(4), a, c])));
    const root = sSqrt(disc);
    const two = sMul([sI(2), a]);
    return [simp(sDiv(sAdd([sNeg(b), root]), two)), simp(sDiv(sSub(sNeg(b), root), two))];
  }
  return null;
}

function checkLiteral(L, R, v, sol) {
  const others = Array.from(new Set([...varsOfS(L), ...varsOfS(R), ...varsOfS(sol)])).filter((n) => n !== v);
  const tries = [[1.7, 2.3, 0.9, 3.1, 1.3, 2.9], [2.2, 1.4, 3.3, 0.8, 1.9, 2.6], [0.6, 1.1, 2.4, 1.5, 3.7, 1.2]];
  for (const t of tries) {
    const env = {};
    others.forEach((n, i) => { env[n] = t[i % t.length] + 0.01 * i; });
    try {
      const val = numS(sol, env);
      if (!isFinite(val)) continue;
      const diff = numS(L, { ...env, [v]: val }) - numS(R, { ...env, [v]: val });
      const scale = Math.abs(numS(L, { ...env, [v]: val })) + Math.abs(numS(R, { ...env, [v]: val })) + 1;
      if (isFinite(diff)) return Math.abs(diff) < 1e-7 * scale;
    } catch (e) {
      // try the next set of values
    }
  }
  return null;
}

/** Sums of fractions become one fraction:  1/(1/a + 1/b)  ->  a·b/(a + b). */
function togetherDeep(e) {
  const hasFrac = (x) => (x.k === '^' && x.e.k === 'n' && x.e.q.isInt() && x.e.q.sign() < 0 && x.b.k !== 'n') || ((x.k === '+' || x.k === '*' || x.k === 'f') && x.a.some(hasFrac)) || (x.k === '^' && (hasFrac(x.b) || hasFrac(x.e)));
  const go = (x) => {
    const y = mapS(x, go);
    if (y.k !== '+' || !y.a.some(hasFrac)) return y;
    const bases = new Map();
    const collect = (t) => {
      (t.k === '*' ? t.a : [t]).forEach((f) => {
        if (f.k === '^' && f.e.k === 'n' && f.e.q.isInt() && f.e.q.sign() < 0 && f.b.k !== 'n') {
          const k = key(f.b);
          const need = Number(-f.e.q.n);
          if (!bases.has(k) || bases.get(k).p < need) bases.set(k, { b: f.b, p: need });
        }
      });
    };
    y.a.forEach(collect);
    let D = S1;
    bases.forEach((z) => { D = sMul([D, sPow(z.b, sI(z.p))]); });
    return sDiv(expandS(sMul([y, D])), D);
  };
  return go(e);
}
function solveLiteralFor(L, R, v) {
  let sols = isolateVar(L, R, v, 0);
  if (!sols) sols = polynomialSolutions(L, R, v);
  if (!sols) return null;
  return sols.map((s) => {
    const plain = simp(s);
    try {
      const tog = simp(togetherDeep(plain));
      return fmtS(tog).length <= fmtS(plain).length * 1.3 ? tog : plain;
    } catch (e) {
      return plain;
    }
  });
}

function solveLiteralEquation(st, names, target) {
  const L = fromAst(st.lhs);
  const R = fromAst(st.rhs);
  const out = newOut();
  const used = varsOfS(expandS(sSub(L, R)));
  if (names.some((n) => !used.has(n))) throw new MathError('there are ' + names.length + ' unknowns (' + names.join(', ') + ') but 1 equation; I need the same number of equations as unknowns');
  const want = target && names.includes(target) ? [target] : names;
  if (target && !names.includes(target)) throw new MathError('the equation has no letter "' + target + '" (it has ' + names.join(', ') + ')');
  let any = false;
  for (const v of want) {
    let sols = null;
    try {
      sols = solveLiteralFor(L, R, v);
    } catch (e) {
      if (!(e instanceof MathError) && !(e instanceof NotAlgebraic)) throw e;
    }
    if (!sols || !sols.length) {
      if (want.length === 1) throw new MathError('I could not solve for ' + v + ' (it must appear to the 1st or 2nd power, or only once)');
      continue;
    }
    any = true;
    const seen = new Set();
    const unique = sols.filter((s) => (seen.has(key(s)) ? false : seen.add(key(s))));
    let allOk = true;
    for (const s of unique) {
      out.answer.push(v + ' = ' + fmtS(s));
      if (checkLiteral(L, R, v, s) === false) allOk = false;
    }
    if (want.length === 1) {
      const ok = unique.map((s) => checkLiteral(L, R, v, s));
      if (ok.every((x) => x === true)) out.check = 'substituting back into ' + showRaw(st.lhs) + ' = ' + showRaw(st.rhs) + ' gives 0 = 0 (tested with sample numbers for the other letters)';
      else if (!allOk) out.notes.push('Some of these may not satisfy the equation for every value of the other letters (check the domain).');
    }
  }
  if (!any) throw new MathError('I could not solve this for any single letter');
  if (want.length === 1) out.work.push('Type: solving a formula for ' + want[0] + ' (the other letters are treated as constants)');
  else out.work.push('Type: formula with several letters; solved for each letter in turn (say which one you want with solve_for)');
  return out;
}
