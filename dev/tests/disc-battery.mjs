// Discrete-math and statistics battery: every command checked against sympy / scipy / numpy / Fractions.
import { spawnSync } from 'node:child_process';
import { load } from './harness.mjs';
const call = load(process.argv[2]);
const PY = process.env.PY || 'python3';
const seed = process.argv[3] || '7';
const r = spawnSync(PY, ['gen_disc.py', seed], { encoding: 'utf8', maxBuffer: 1 << 28 });
if (r.status) { console.log(r.stderr); process.exit(1); }
const tests = JSON.parse(r.stdout);
let bad = 0;
const num = (s) => parseFloat(s.replace(/×10\^/, 'e'));
const lastNumber = (line) => {
  const approx = /\((?:≈|=) (-?[0-9.]+(?:e[+-]?\d+)?)\)/.exec(line);
  if (approx) return parseFloat(approx[1]);
  const after = line.includes('=') ? line.slice(line.lastIndexOf('=') + 1) : line;
  const m = after.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/g);
  return m ? parseFloat(m[m.length - 1]) : NaN;
};
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
for (const t of tests) {
  const res = await call({ equation: t.cmd });
  const text = res.result ?? 'ERROR ' + res.error;
  const ans = (text.match(/^Answer:\s*([\s\S]*?)(?:\n(?:Working|Check|Note|Read as)|$)/m) || [])[1] || '';
  const firstLine = ans.split('\n')[0].trim();
  let ok = false;
  if (t.t === 'int') ok = firstLine === t.v || (/×10\^/.test(firstLine) && Math.abs(num(firstLine) / Number(t.v) - 1) < 1e-7);
  else if (t.t === 'has') ok = ans.includes(t.v);
  else if (t.t === 'frac') {
    const m = /^(-?\d+)(?:\/(\d+))?/.exec(firstLine);
    const w = /^(-?\d+)(?:\/(\d+))?$/.exec(t.v);
    ok = !!m && !!w && BigInt(m[1]) * BigInt(w[2] || 1) === BigInt(w[1]) * BigInt(m[2] || 1);
  } else if (t.t === 'num') {
    let line = firstLine;
    if (t.which === 'Prediction') line = (/Prediction at x = [\d.-]+: y = (.*)/.exec(text) || [])[1] || '';
    else if (t.which === 'two-tailed') line = (/two-tailed (-?[0-9.e+-]+)/.exec(text) || [])[1] || '';
    else if (t.which === 'p-value') line = (/p-value[^=]*= (-?[0-9.e+-]+)/.exec(text) || [])[1] || '';
    else if (t.which === 'density') line = (/= (-?[0-9.e+-]+)$/.exec(firstLine) || [])[1] || firstLine;
    const got = lastNumber(line);
    ok = Math.abs(got - t.v) <= t.tol * Math.max(1, Math.abs(t.v)) + 1e-12;
  } else if (t.t === 'seq') {
    const m = /next terms: (.*)/.exec(ans);
    ok = !!m && m[1].split(',').map((s) => Number(s.trim())).join(',') === t.v.join(',');
  } else if (t.t === 'interval') {
    const m = /\((-?[0-9.e+-]+), (-?[0-9.e+-]+)\)/.exec(ans);
    ok = !!m && Math.abs(Number(m[1]) - t.v[0]) < 1e-5 * Math.max(1, Math.abs(t.v[0])) && Math.abs(Number(m[2]) - t.v[1]) < 1e-5 * Math.max(1, Math.abs(t.v[1]));
  } else if (t.t === 'dioph') {
    const [a, b, c, g] = t.v;
    if (c % g !== 0) ok = /No integer solutions/.test(ans);
    else {
      const m = /One solution: x = (-?\d+), y = (-?\d+)/.exec(text);
      ok = !!m && a * Number(m[1]) + b * Number(m[2]) === c && /t any integer/.test(ans);
    }
  }
  if (!ok) { bad++; if (bad <= 40) console.log('FAIL ' + t.cmd + '\n   want ' + JSON.stringify(t.v) + '\n   got  ' + text.split('\n').slice(0, 4).join(' | ')); }
}
console.log(`${tests.length - bad}/${tests.length} agree with the oracles`);
process.exit(bad ? 1 : 0);
