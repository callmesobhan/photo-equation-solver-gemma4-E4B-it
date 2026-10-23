// Chemistry and finance extras against periodictable / mendeleev data / numpy-financial and plain re-derivations.
import { spawnSync } from 'node:child_process';
import { load } from './harness.mjs';
const call = load(process.argv[2]);
const PY = process.env.PY || 'python3';
const r = spawnSync(PY, ['gen_chemfin.py', process.argv[3] || '1'], { encoding: 'utf8', maxBuffer: 1 << 28 });
if (r.status) { console.log(r.stderr); process.exit(1); }
const cases = JSON.parse(r.stdout);
let bad = 0, total = 0;
const num = (s) => Number(String(s).replace(/,/g, ''));
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * (1 + Math.abs(b));
const SUB = { 0: '⁰', 1: '¹', 2: '²', 3: '³' };
for (const c of cases) {
  total++;
  const res = await call({ equation: c.cmd });
  const text = res.result ?? 'ERROR ' + res.error;
  const fail = (why) => { bad++; console.log('FAIL ' + c.cmd + '\n   ' + why + '\n   ' + text.split('\n').slice(0, 7).join(' | ')); };
  if (res.error !== undefined) { fail('error: ' + res.error); continue; }
  const lines = text.split('\n');
  const answer = lines.filter((l, i) => /^Answer:/.test(l) || (i > lines.findIndex((x) => /^Answer:/.test(x)) && i < lines.findIndex((x) => /^Working:|^Check:|^Note/.test(x)) && /^\s/.test(l))).map((l) => l.replace(/^Answer:\s*/, '').trim()).join('\n');
  const work = lines.filter((l) => /^- /.test(l)).map((l) => l.slice(2));
  try {
    if (c.kind === 'element') {
      const m = /^(\w+) \((\w+)\), atomic number (\d+), atomic mass ([\d.]+) u/.exec(answer);
      if (!m) { fail('cannot read'); continue; }
      if (m[1] !== c.name || m[2] !== c.symbol || Number(m[3]) !== c.z) fail('name/symbol/number');
      else if (!near(Number(m[4]), c.mass, c.z >= 100 ? 5e-2 : 3e-3)) fail('mass ' + m[4] + ' vs ' + c.mass); // superheavy masses depend on the isotope chosen
      const w = /period (\d+), (?:group (\d+)|f-block[^,]*), (\w)-block/.exec(work[0]);
      if (!w) { fail('cannot read period/group'); continue; }
      if (Number(w[1]) !== c.period) fail('period');
      else if (c.group !== null && w[2] !== undefined && Number(w[2]) !== c.group) fail('group ' + w[2] + ' vs ' + c.group);
      else if (c.group !== null && w[2] === undefined) fail('f-block but the oracle has group ' + c.group);
      else if (w[3] !== c.block) fail('block ' + w[3] + ' vs ' + c.block);
    } else if (c.kind === 'econf') {
      const full = /full configuration: (.*?)  \(/.exec(work.join('\n'));
      const occ = {};
      full[1].split(' ').forEach((t) => { occ[t.slice(0, 2)] = Number(t.slice(2)); });
      const want = {}; Object.entries(c.occ).forEach(([k, v]) => { if (v > 0) want[k] = v; });
      const keys = new Set([...Object.keys(occ), ...Object.keys(want)]);
      for (const k of keys) if ((occ[k] || 0) !== (want[k] || 0)) { fail('sub-shell ' + k + ': ' + occ[k] + ' vs ' + want[k]); break; }
      const u = /unpaired electrons: (\d+)/.exec(work.join('\n'));
      if (!u || Number(u[1]) !== c.unpaired) fail('unpaired ' + (u && u[1]) + ' vs ' + c.unpaired);
    } else if (c.kind === 'econfion') {
      const m = /: (.*)$/.exec(answer.split('\n')[0]);
      if (!m || m[1] !== c.want) fail('expected ' + c.want);
    } else if (c.kind === 'empirical') {
      const e = /empirical formula (\w+)/.exec(answer);
      if (!e || e[1] !== c.expected) fail('expected ' + c.expected);
      if (c.molecular) { const mo = /molecular formula (\w+)/.exec(answer); if (!mo || mo[1] !== c.molecular) fail('molecular expected ' + c.molecular); }
    } else if (c.kind === 'limiting') {
      const lim = /limiting reagent: (\S+)/.exec(answer);
      if (!lim || lim[1] !== c.lim) fail('limiting reagent ' + (lim && lim[1]) + ' vs ' + c.lim);
      for (const [p, [mol, g]] of Object.entries(c.yields)) {
        const m = new RegExp('theoretical yield of ' + p.replace(/[()]/g, '\\$&') + ': ([\\d.e+-]+) mol = ([\\d.e+-]+) g').exec(answer);
        if (!m || !near(Number(m[1]), mol, 3e-3) || !near(Number(m[2]), g, 3e-3)) fail('yield of ' + p);
      }
      for (const [f, [mol, g]] of Object.entries(c.left)) {
        const m = new RegExp('excess ' + f.replace(/[()]/g, '\\$&') + ' left over: ([\\d.e+-]+) mol = ([\\d.e+-]+) g').exec(answer);
        if (mol > 1e-9 * 1 && (!m || !near(Number(m[1]), mol, 3e-3, ) || !near(Number(m[2]), g, 3e-3))) fail('excess of ' + f);
      }
    } else if (c.kind === 'stoich') {
      const m = /^([\d.e+-]+) mol of \S+ = ([\d.e+-]+) g/.exec(answer);
      if (!m || !near(Number(m[1]), c.mol, 3e-3) || !near(Number(m[2]), c.g, 3e-3)) fail('amounts');
    } else if (c.kind === 'weakacid' || c.kind === 'weakbase') {
      const p = /pH = ([\d.e+-]+)/.exec(answer); const pc = /percent ionization = ([\d.e+-]+)/.exec(answer);
      if (!p || !near(Number(p[1]), c.ph, 1e-6) || !pc || !near(Number(pc[1]), c.pct, 1e-6)) fail('pH / percent ionization');
    } else if (c.kind === 'buffer') {
      const p = /pH = ([\d.e+-]+)/.exec(answer);
      if (!p || !near(Number(p[1]), c.ph, 1e-6)) fail('pH');
    } else if (['dilution', 'idealgas'].includes(c.kind)) {
      const p = /= ([\d.e+-]+)/.exec(answer.split('\n')[0]);
      if (!p || !near(Number(p[1]), c.val, 1e-6)) fail('value ' + (p && p[1]) + ' vs ' + c.val);
    } else if (c.kind === 'halflife') {
      const f = /fraction remaining = ([\d.e+-]+)/.exec(answer); const a = /amount remaining = ([\d.e+-]+)/.exec(answer);
      if (!f || !near(Number(f[1]), c.frac, 1e-6) || !a || !near(Number(a[1]), c.amount, 1e-6)) fail('fraction / amount');
    } else if (c.kind === 'decaytime') {
      const p = /time = ([\d.e+-]+)/.exec(answer);
      if (!p || !near(Number(p[1]), c.t, 1e-6)) fail('time');
    } else if (c.kind === 'amort') {
      const p = /payment = ([\d,.]+) per period \((\d+) payments\), total interest = ([\d,.]+)/.exec(answer);
      if (!p || Math.abs(num(p[1]) - c.pay) > 0.0051 || Number(p[2]) !== c.N || Math.abs(num(p[3]) - c.total_int) > 0.0051 * c.N / 2 + 0.01) { fail('payment / total interest'); continue; }
      const rows = work.filter((w) => /^\s*\d+\s+[\d,.]+\s+[\d,.]+\s+[\d,.]+\s+[\d,.-]+$/.test(w)).map((w) => w.trim().split(/\s+/).map(num));
      if (rows.length !== c.rows.length) { fail('number of rows ' + rows.length); continue; }
      rows.forEach((rw, i) => {
        const w = c.rows[i];
        if (Math.abs(rw[2] - w[2]) > 0.0051 || Math.abs(rw[3] - w[3]) > 0.0051 || Math.abs(rw[4] - c.bal[i]) > 0.0051) fail('row ' + (i + 1) + ': ' + rw + ' vs ' + w + ' / ' + c.bal[i]);
      });
    } else if (c.kind === 'loanbalance') {
      const p = /= ([\d,.-]+)/.exec(answer);
      if (!p || Math.abs(num(p[1]) - c.bal) > 0.0051) fail('balance ' + (p && p[1]) + ' vs ' + c.bal);
    } else if (c.kind === 'payoff') {
      const p = /number of payments = ([\d.e+-]+)/.exec(answer);
      if (!p || !near(Number(p[1]), c.n, 1e-6)) fail('N ' + (p && p[1]) + ' vs ' + c.n);
    } else if (c.kind === 'bond') {
      const p = /price = ([\d,.]+)/.exec(answer); const cy = /current yield = ([\d.e+-]+)/.exec(answer);
      const du = /Macaulay duration = ([\d.e+-]+) years[\s\S]*modified duration = ([\d.e+-]+)/.exec(answer);
      if (!p || Math.abs(num(p[1]) - c.price) > 0.0051) fail('price ' + (p && p[1]) + ' vs ' + c.price);
      else if (!cy || !near(Number(cy[1]), c.cy, 1e-6)) fail('current yield');
      else if (!du || !near(Number(du[1]), c.mac, 1e-6) || !near(Number(du[2]), c.mod, 1e-6)) fail('durations');
    } else if (['sl', 'ddb', 'syd'].includes(c.kind)) {
      const rows = work.filter((w) => /^\s*\d+\s+[\d,.]+\s+[\d,.]+\s+[\d,.]+$/.test(w)).map((w) => w.trim().split(/\s+/).map(num));
      if (rows.length !== c.dep.length) { fail('rows ' + rows.length); continue; }
      rows.forEach((rw, i) => { if (Math.abs(rw[1] - c.dep[i]) > 0.0051) fail('year ' + (i + 1) + ': ' + rw[1] + ' vs ' + c.dep[i]); });
    } else if (['cagr', 'realrate', 'mirr', 'breakeven'].includes(c.kind)) {
      const p = c.kind === 'breakeven' ? /= ([\d.e+-]+) units/.exec(answer) : /= ([\d.e+-]+)/.exec(answer);
      if (!p || !near(Number(p[1]), c.val, 1e-6)) fail('value ' + (p && p[1]) + ' vs ' + c.val);
    } else if (c.kind === 'rule72') {
      const p = /about ([\d.e+-]+) years.*exactly.* = ([\d.e+-]+) years/.exec(answer);
      if (!p || !near(Number(p[1]), c.approx, 1e-6) || !near(Number(p[2]), c.val, 1e-6)) fail('years');
    } else if (c.kind === 'payback') {
      const p = /= ([\d.e+-]+) periods/.exec(answer);
      if (c.val === null ? !/not paid back/.test(answer) : !p || !near(Number(p[1]), c.val, 1e-6)) fail('payback');
    }
  } catch (e) { fail('could not read the answer: ' + e.message); }
}
console.log(total + ' chemistry / finance checks, ' + bad + ' WRONG');
process.exit(bad ? 1 : 0);
