// Extra discrete mathematics against sympy / networkx / brute force.
import { spawnSync } from 'node:child_process';
import { load } from './harness.mjs';
import { compile } from './mathexpr.mjs';
const call = load(process.argv[2]);
const PY = process.env.PY || 'python3';
const r = spawnSync(PY, ['gen_discrete2.py', process.argv[3] || '1'], { encoding: 'utf8', maxBuffer: 1 << 28 });
if (r.status) { console.log(r.stderr); process.exit(1); }
const cases = JSON.parse(r.stdout);
let bad = 0, total = 0;
const nums = (s) => (s.match(/-?\d+/g) || []).map(Number);
for (const c of cases) {
  total++;
  const res = await call({ equation: c.cmd });
  const text = res.result ?? 'ERROR ' + res.error;
  const fail = (why) => { bad++; console.log('FAIL ' + c.cmd + '\n   ' + why + '\n   ' + text.split('\n').slice(0, 6).join(' | ')); };
  if (res.error !== undefined) {
    if (c.kind === 'rec' && /exactly|could not find|particular/.test(res.error)) { total--; continue; } // polite decline
    fail('error: ' + res.error); continue;
  }
  const ans = text.split('\n').filter((l) => /^Answer:/.test(l) || /^\s+\S/.test(l)).map((l) => l.replace(/^Answer:\s*/, '').trim());
  const first = ans[0] || '';
  if (c.kind === 'euclid') {
    const g = /gcd\([^)]*\) = (\d+)/.exec(text); const bz = /(\d+) = \(?(-?\d+)\)?·(\d+) \+ \(?(-?\d+)\)?·(\d+)/.exec(text);
    if (!g || Number(g[1]) !== c.g) fail('gcd');
    else if (!bz || Number(bz[2]) * Number(bz[3]) + Number(bz[4]) * Number(bz[5]) !== c.g) fail('Bezout identity does not hold');
  } else if (c.kind === 'cfrac') {
    const t = nums(first.replace(/^[^=]*=/, ''));
    if (JSON.stringify(t) !== JSON.stringify(c.terms)) fail('terms ' + t + ' vs ' + c.terms);
  } else if (c.kind === 'cfsqrt') {
    const m = /\[(\d+); \(([\d, ]+)\) repeating\]/.exec(first);
    if (!m || Number(m[1]) !== c.a0 || JSON.stringify(nums(m[2])) !== JSON.stringify(c.period)) fail('period');
  } else if (c.kind === 'pell') {
    const m = /x = (\d+), y = (\d+)/.exec(first);
    if (!m || BigInt(m[1]) !== BigInt(c.x) || BigInt(m[2]) !== BigInt(c.y)) fail('solution');
  } else if (c.kind === 'pellneg') {
    const m = /x = (\d+), y = (\d+)/.exec(first);
    if (c.solvable ? !m || BigInt(m[1]) !== BigInt(c.x) || BigInt(m[2]) !== BigInt(c.y) : !/no integer solutions/.test(first)) fail('solution');
  } else if (c.kind === 'collatz') {
    const m = /(\d+) steps.*peak value (\d+)/.exec(first);
    if (!m || Number(m[1]) !== c.steps || Number(m[2]) !== c.peak) fail('steps/peak');
  } else if (c.kind === 'egyptian') {
    const parts = first.replace(/^[^=]*=/, '').split('+').map((s) => s.trim());
    const [pn, pd] = c.value.split('/').map(BigInt);
    let num = 0n, den = 1n;
    parts.forEach((p) => { const [a, b] = p.includes('/') ? p.split('/').map(BigInt) : [BigInt(p), 1n]; num = num * b + a * den; den *= b; });
    const gcd = (x, y) => (y ? gcd(y, x % y) : x);
    const g = gcd(num, den); num /= g; den /= g;
    const want = c.value.includes('/') ? [pn, pd] : [pn, 1n];
    if (num !== want[0] || den !== want[1]) fail('the unit fractions do not add up');
  } else if (c.kind === 'sum2sq') {
    const k = (first.match(/²/g) || []).length / 2;
    if (c.count === 0 ? !/not a sum/.test(first) : k !== c.count) fail('number of representations');
  } else if (c.kind === 'farey') {
    const m = /\((\d+) fractions\)/.exec(first);
    if (!m || Number(m[1]) !== c.length) fail('length');
  } else if (c.kind === 'josephus') {
    if (!new RegExp('person ' + c.survivor + '\\b').test(first)) fail('survivor');
  } else if (c.kind === 'polygonal') {
    if (!new RegExp('= ' + c.value + '\\b').test(first)) fail('value');
  } else if (c.kind === 'rec') {
    const m = /^a\(n\) = (.*)$/m.exec(text.split('\n').find((l) => /^Answer:/.test(l)).replace(/^Answer: /, ''));
    let f;
    try { f = compile(m[1]); } catch (e) { fail('cannot read the formula: ' + e.message); continue; }
    let okAll = true;
    for (let n = 0; n < c.seq.length && n < 16; n++) {
      const v = f({ n });
      if (!(Math.abs(v - c.seq[n]) <= 1e-6 * (1 + Math.abs(c.seq[n])))) { okAll = false; fail('a(' + n + ') gives ' + v + ' but the recurrence gives ' + c.seq[n]); break; }
    }
  } else if (c.kind === 'logic') {
    const want = c.rows.every(Boolean) ? 'tautology' : c.rows.some(Boolean) ? 'contingency' : 'contradiction';
    if (!first.includes(want)) fail('classification, expected ' + want);
    const k = /true in (\d+) of (\d+)/.exec(first);
    if (want === 'contingency' && (!k || Number(k[1]) !== c.rows.filter(Boolean).length)) fail('number of true rows');
    // rows of the table
    const tableRows = text.split('\n').filter((l) => /^- [TF]( [TF])* \| [TF]$/.test(l)).map((l) => l.endsWith('T'));
    if (JSON.stringify(tableRows) !== JSON.stringify(c.rows)) fail('table rows');
    const sopLine = text.split('\n').find((l) => /simplest sum of products/.test(l));
    if (want === 'contingency') {
      if (!sopLine) { fail('no minimal form'); continue; }
      const sop = sopLine.replace(/^.*\): /, '');
      const terms = sop.split('∨').map((t) => t.trim());
      let lits = 0;
      const vs = c.vars;
      const evalSop = (bits) => terms.some((t) => { const L = Array.from(t.replace(/\s/g, '')); let ok = true; for (let i = 0; i < L.length; i++) { const neg = L[i] === '¬'; const v = neg ? L[++i] : L[i]; const val = bits[vs.indexOf(v)]; if (neg ? val : !val) ok = false; } return ok; });
      terms.forEach((t) => { lits += (t.match(/[a-z]/g) || []).length; });
      let good = true;
      for (let m = 0; m < c.rows.length; m++) { const bits = vs.map((_, i) => Boolean(m & (1 << (vs.length - 1 - i)))); if (evalSop(bits) !== c.rows[m]) good = false; }
      if (!good) fail('the minimal form is not equivalent to the formula: ' + sop);
      else if (c.soplits !== null && lits > c.soplits) fail('the minimal form has ' + lits + ' literals, sympy finds ' + c.soplits + ': ' + sop);
    }
  } else if (c.kind === 'equiv') {
    if (/not equivalent/.test(first) === c.same) fail('equivalence verdict');
  } else if (c.kind === 'graph') {
    const dm = /degrees: (.*?)\s{3}/.exec(text) || /degrees: (.*)$/m.exec(text);
    const degs = (dm ? dm[1] : '').split(',').map((s) => Number(s.split(':')[1]));
    if (JSON.stringify(degs) !== JSON.stringify(c.degrees)) fail('degrees ' + degs + ' vs ' + c.degrees);
    const cm = /(\d+) connected component/.exec(text);
    if (!cm || Number(cm[1]) !== c.comps) fail('components');
    if (/bipartite: yes/.test(text) !== c.bip) fail('bipartite');
    const eu = /Euler circuit: yes/.test(text) ? 'circuit' : /Euler path: yes/.test(text) ? 'path' : 'none';
    if (eu !== c.euler) fail('Euler: ' + eu + ' vs ' + c.euler);
  } else if (c.kind === 'dijkstra') {
    const m = /length (\d+)/.exec(first);
    if (!m || Number(m[1]) !== c.length) fail('length');
  } else if (c.kind === 'mst') {
    const m = /total weight (\d+)/.exec(first);
    if (!m || Number(m[1]) !== c.weight) fail('weight');
  } else if (c.kind === 'maxflow') {
    const m = /= (\d+)$/.exec(first);
    if (!m || Number(m[1]) !== c.value) fail('flow');
  } else if (c.kind === 'coloring') {
    const m = /χ = (\d+)/.exec(first);
    if (!m || Number(m[1]) !== c.chi) fail('chromatic number');
  } else if (c.kind === 'topsort') {
    const order = first.replace(/^[^:]*:\s*/, '').split(',').map((s) => Number(s.trim()));
    const pos = new Map(order.map((v, i) => [v, i]));
    if (!c.edges.every(([u, v]) => pos.get(u) < pos.get(v))) fail('not a topological order');
  }
}
console.log(`${total - bad}/${total} agree with sympy / networkx / brute force`);
process.exit(bad ? 1 : 0);
