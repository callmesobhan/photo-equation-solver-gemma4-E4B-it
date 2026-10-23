// Precalculus helpers against closed formulas and sympy: sinusoids, independence / span / nullity, rational zeros, end behaviour,
// even / odd, coefficients and the range of a function.
import { spawnSync } from 'node:child_process';
import { load } from './harness.mjs';
const call = load(process.argv[2]);
const PY = process.env.PY || 'python3';
const r = spawnSync(PY, ['gen_precalc.py', process.argv[3] || '1'], { encoding: 'utf8', maxBuffer: 1 << 28 });
if (r.status) { console.log(r.stderr); process.exit(1); }
const cases = JSON.parse(r.stdout);
let bad = 0;
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * (1 + Math.abs(b));
/** numeric value of "3", "-1/2", "√2", "2√3/3", "3π/2", "π", "1/e", "ln(2)", "≈0.5", "∞" */
function evalText(t) {
  t = t.trim().replace(/−/g, '-');
  if (t === '∞') return Infinity;
  if (t === '-∞') return -Infinity;
  if (t.startsWith('≈')) return Number(t.slice(1));
  let s = t.replace(/√(\d+(?:\/\d+)?)/g, 'Math.sqrt($1)').replace(/√\(([^)]*)\)/g, 'Math.sqrt($1)').replace(/ln\(/g, 'Math.log(').replace(/π/g, 'Math.PI').replace(/\be\b/g, 'Math.E');
  s = s.replace(/(\d|\))(Math)/g, '$1*$2').replace(/(Math\.PI|Math\.E)(\d)/g, '$1*$2');
  s = s.replace(/(\)|\d)(\()/g, '$1*$2');
  try { return Function('"use strict"; return (' + s + ')')(); } catch (e) { return NaN; }
}
const fracVal = (s) => evalText(s.replace(/\s*\(.*$/, ''));
/** the number at the start of a text such as "1/2 (= 0.5) (to the right)", "-2π/3 (≈ -2.0943951) (to the left)", "π (≈ 3.1415927)" */
function lead(s) {
  s = s.trim();
  const ap = /^[^(]*?\((?:≈|=) (-?[\d.]+(?:e[+-]?\d+)?)\)/.exec(s);
  if (ap) return Number(ap[1]);
  return evalText(s.replace(/\s*\(.*$/, '').replace(/[,;].*$/, ''));
}
for (const c of cases) {
  const res = await call({ equation: c.cmd });
  const fail = (why) => { bad++; console.log('FAIL ' + c.cmd.slice(0, 160) + '\n   ' + why + '\n   ' + String(res.result ?? res.error).split('\n').slice(0, 7).join(' | ').slice(0, 500)); };
  if (res.error !== undefined) { fail('error: ' + res.error); continue; }
  const t = res.result;
  const grab = (rx, label) => { const m = rx.exec(t); if (!m) { fail('cannot read ' + label); return null; } return m; };
  const chk = (got, want, label) => { if (typeof got !== 'number' || isNaN(got) || !near(got, want)) fail(label + ' ' + got + ' vs ' + want); };
  if (c.kind === 'sinusoid') {
    const take = (rx, label) => { const m = rx.exec(t); if (!m) { fail('cannot read ' + label); return NaN; } return lead(m[1]); };
    if (c.fn !== 'tan') {
      chk(take(/amplitude \|A\| = ([^\n]*)/, 'amplitude'), c.amp, 'amplitude');
      chk(take(/period = 2π\/\|B\| = ([^\n]*?),\s+frequency/, 'period'), c.period, 'period');
      chk(take(/phase shift = −C\/B = ([^\n]*)/, 'shift'), c.shift, 'phase shift');
      chk(take(/vertical shift D = ([^,\n]*)/, 'D'), c.D, 'D');
      chk(take(/maximum = ([^\n]*?),\s+minimum/, 'max'), c.D + c.amp, 'max');
      chk(take(/minimum = ([^\n]*?),\s+range/, 'min'), c.D - c.amp, 'min');
    } else {
      chk(take(/period = π\/\|B\| = ([^\n]*)/, 'period'), c.period, 'period');
      chk(take(/phase shift = −C\/B = ([^\n]*?),\s+vertical/, 'shift'), c.shift, 'phase shift');
    }
  } else if (c.kind === 'indep') {
    const ind = /^Answer: linearly independent/m.test(t);
    if (ind !== c.indep) fail('independence ' + ind + ' vs ' + c.indep);
  } else if (c.kind === 'span') {
    const inn = /is in the span/.test(t);
    if (inn !== c.inspan) fail('membership ' + inn + ' vs ' + c.inspan);
    else if (inn) {
      const m = /v = (.*)\n/.exec(t);
      if (!m) { fail('no combination'); }
      else {
        const sum = new Array(c.target.length).fill(0);
        for (const term of m[1].split(' + ')) {
          const mm = /^\(?(-?\d+(?:\/\d+)?)\)?·u([₀-₉]+)$/.exec(term.trim());
          if (!mm) { fail('cannot parse term ' + term); break; }
          const idx = Number([...mm[2]].map((ch) => ch.charCodeAt(0) - 0x2080).join('')) - 1;
          const co = evalText(mm[1]);
          c.gens[idx].forEach((v, i) => { sum[i] += co * v; });
        }
        if (sum.some((v, i) => !near(v, c.target[i]))) fail('combination ' + JSON.stringify(sum) + ' vs ' + JSON.stringify(c.target));
      }
    }
  } else if (c.kind === 'nullity') {
    const m = grab(/nullity = (\d+),\s+rank = (\d+)/, 'nullity'); if (m) { chk(Number(m[1]), c.nullity, 'nullity'); chk(Number(m[2]), c.rank, 'rank'); }
  } else if (c.kind === 'ratroots') {
    const m = /rational zeros: ([^\n]*)/.exec(t);
    const got = m ? m[1].replace(/ \(multiplicity \d+\)/g, '').split(', ').map(evalText).sort((a, b) => a - b) : [];
    if (!m && c.roots.length) fail('no rational zeros reported');
    else if (got.length !== c.roots.length || got.some((g, i) => !near(g, c.roots[i]))) fail('zeros ' + JSON.stringify(got) + ' vs ' + JSON.stringify(c.roots));
  } else if (c.kind === 'endbeh') {
    const conv = (s) => { const m = /f\(x\) → ([^\n]*)/.exec(s); if (!m) return null; const w = m[1].trim(); return /^∞/.test(w) ? 'inf' : /^-∞/.test(w) ? '-inf' : lead(w.replace(/\s+\(horizontal.*$/, '')); };
    const lines = t.split('\n');
    const pl = conv(lines.find((l) => /as x → ∞/.test(l)) || '');
    const mi = conv(lines.find((l) => /as x → −∞/.test(l)) || '');
    const same = (g, w) => (typeof w === 'string' ? g === w : typeof g === 'number' && near(g, w));
    if (!same(pl, c.plus) || !same(mi, c.minus)) fail('limits ' + pl + ', ' + mi + ' vs ' + c.plus + ', ' + c.minus);
  } else if (c.kind === 'parity') {
    const par = /^Answer: even/m.test(t) ? 'even' : /^Answer: odd/m.test(t) ? 'odd' : /neither/.test(t) ? 'neither' : '?';
    if (par !== c.par) fail('parity ' + par + ' vs ' + c.par);
  } else if (c.kind === 'coeff') {
    const m = grab(/= (-?\d+)\n/, 'coefficient'); if (m) chk(Number(m[1]), c.value, 'coefficient');
  } else if (c.kind === 'range') {
    const m = grab(/range: ([^\n]*)/, 'range');
    if (m) {
      const parts = m[1].split(' ∪ ').map((p) => {
        if (/^\{/.test(p)) { const v = evalText(p.slice(1, -1)); return { lo: v, hi: v, loO: false, hiO: false }; }
        const mm = /^([\[(])(.*), (.*)([\])])$/.exec(p);
        return mm ? { lo: evalText(mm[2]), hi: evalText(mm[3]), loO: mm[1] === '(', hiO: mm[4] === ')' } : null;
      });
      const want = c.ranges.map((r) => ({ lo: r.lo === 'inf' ? Infinity : r.lo === '-inf' ? -Infinity : r.lo, hi: r.hi === 'inf' ? Infinity : r.hi === '-inf' ? -Infinity : r.hi, loO: r.lo_o, hiO: r.hi_o }));
      const eqv = (a, b) => a === b || (isFinite(a) && isFinite(b) && near(a, b, 1e-6));
      if (parts.some((p) => !p) || parts.length !== want.length || parts.some((p, i) => !eqv(p.lo, want[i].lo) || !eqv(p.hi, want[i].hi) || (isFinite(want[i].lo) && p.loO !== want[i].loO) || (isFinite(want[i].hi) && p.hiO !== want[i].hiO))) fail('range ' + m[1] + ' vs ' + JSON.stringify(want));
    }
  }
}
console.log(cases.length + ' precalculus checks, ' + bad + ' WRONG');
process.exit(bad ? 1 : 0);
