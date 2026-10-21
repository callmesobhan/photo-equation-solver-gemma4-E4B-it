// Linear programming against scipy.optimize.linprog and brute force.
import { spawnSync } from 'node:child_process';
import { load } from './harness.mjs';
const call = load(process.argv[2]);
const PY = process.env.PY || 'python3';
const r = spawnSync(PY, ['gen_lp.py', process.argv[3] || '1'], { encoding: 'utf8', maxBuffer: 1 << 28 });
if (r.status) { console.log(r.stderr); process.exit(1); }
const tests = JSON.parse(r.stdout);
let bad = 0;
const num = (s) => { const fr = /^(-?\d+)\/(\d+)/.exec(s); if (fr) return Number(fr[1]) / Number(fr[2]); const a = /\(≈ (-?[\d.]+)\)|\(= (-?[\d.]+)\)/.exec(s); if (a) return parseFloat(a[1] || a[2]); return parseFloat(s); };
for (const t of tests) {
  const res = await call({ equation: t.cmd });
  const text = res.result ?? 'ERROR ' + res.error;
  let ok = false;
  if (t.t === 'opt') { const m = /(?:maximum|minimum) value(?: =)? (\S+(?: \([^)]*\))?)/.exec(text); ok = !!m && Math.abs(num(m[1]) - t.v) < 1e-6 * Math.max(1, Math.abs(t.v)); }
  else if (t.t === 'infeasible') ok = /no feasible/.test(text);
  else if (t.t === 'unbounded') ok = /unbounded/.test(text);
  if (!ok) { bad++; if (bad <= 20) console.log('FAIL ' + t.cmd + '\n   want ' + t.t + ' ' + t.v + '\n   got  ' + text.split('\n').slice(0, 4).join(' | ')); }
}
console.log(`${tests.length - bad}/${tests.length} agree with scipy/brute force`);
process.exit(bad ? 1 : 0);
