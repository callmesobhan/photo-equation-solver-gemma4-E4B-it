// Convergence tests and the radius / interval of convergence against the known behaviour of the standard series families
// (every case's truth comes from theory; a verdict of "could not decide" is allowed, a wrong verdict is not).
import { spawnSync } from 'node:child_process';
import { load } from './harness.mjs';
const call = load(process.argv[2]);
const PY = process.env.PY || 'python3';
const r = spawnSync(PY, ['gen_series.py', process.argv[3] || '1'], { encoding: 'utf8', maxBuffer: 1 << 28 });
if (r.status) { console.log(r.stderr); process.exit(1); }
const cases = JSON.parse(r.stdout);
let bad = 0, total = 0, undecided = 0, decided = 0;
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * (1 + Math.abs(b));
const rootVal = (s) => { // "√3", "3/2", "-1/2", "2"
  const pw = /^(-?)(\d+)\^\(1\/(\d+)\)$/.exec(s.trim());
  if (pw) return (pw[1] ? -1 : 1) * Math.pow(Number(pw[2]), 1 / Number(pw[3]));
  const m = /^(-?)(?:√(\d+)|(\d+)(?:\/(\d+))?)$/.exec(s.trim());
  if (!m) return NaN;
  const sign = m[1] ? -1 : 1;
  return m[2] !== undefined ? sign * Math.sqrt(Number(m[2])) : sign * Number(m[3]) / Number(m[4] || 1);
};
for (const c of cases) {
  total++;
  const res = await call({ equation: c.cmd });
  const text = res.result ?? 'ERROR ' + res.error;
  const fail = (why) => { bad++; console.log('FAIL ' + c.cmd + '\n   ' + why + '\n   ' + text.split('\n').slice(0, 8).join(' | ')); };
  if (res.error !== undefined) {
    if (/undefined at/.test(res.error)) { total--; continue; }
    fail('error: ' + res.error); continue;
  }
  const lines = text.split('\n');
  const answer = lines.slice(lines.findIndex((l) => /^Answer:/.test(l))).filter((l, i) => i === 0 || /^\s/.test(l)).map((l) => l.replace(/^Answer:\s*/, '').trim()).join('\n');
  if (c.kind === 'improper') {
    const a0 = answer.split('\n')[0];
    const got = /^diverges/.test(a0) ? false : /could not be determined/.test(a0) ? null : true;
    if (got === null) { undecided++; continue; }
    decided++;
    if (got !== c.conv) { fail('expected ' + (c.conv ? 'convergent' : 'divergent') + ', got ' + a0); continue; }
    if (c.conv && c.val !== null) {
      const m = /\((?:≈|=) (-?[\d.e+-]+)\)/.exec(a0) || /^(-?[\d.e+-]+)$/.exec(a0.trim()) || /^≈ (-?[\d.e+-]+)/.exec(a0);
      const v = m ? Number(m[1]) : NaN;
      if (!near(v, c.val, 1e-5)) fail('value ' + a0 + ' vs ' + c.val);
    }
  } else if (c.kind === 'conv') {
    const got = /^converges absolutely/.test(answer) ? 'abs' : /^converges conditionally/.test(answer) ? 'cond' : /^diverges/.test(answer) ? 'div' : 'unknown';
    if (got === 'unknown') { undecided++; continue; }
    decided++;
    // a conditionally convergent series that is reported as converging (either way) counts as right only with the right kind
    if (got !== c.expect) fail('expected ' + c.expect + ', got ' + got);
  } else {
    const rr = /radius of convergence R = (∞|[^,]+?)(?: \(≈ [^)]*\))?, centre x = (\S+)/.exec(answer);
    const r0 = /radius of convergence R = (∞|0)(?::|$)/m.exec(answer);
    if (c.R === -1) { if (!/R = ∞/.test(answer)) fail('expected R = infinity'); decided++; continue; }
    if (c.R === 0) { if (!/R = 0/.test(answer)) fail('expected R = 0'); decided++; continue; }
    if (!rr) { if (r0) fail('wrong radius form'); else undecided++; continue; }
    decided++;
    const R = rootVal(rr[1]);
    if (!near(R, c.R, 1e-6)) { fail('R = ' + rr[1] + ' vs ' + c.R); continue; }
    if (c.lc === null) continue;
    const iv = /interval of convergence: ([\[(])(\S+), (\S+)([\])])/.exec(answer);
    if (!iv) { undecided++; continue; }
    const lo = rootVal(iv[2]), hi = rootVal(iv[3]);
    if (!near(lo, c.left, 1e-6) || !near(hi, c.right, 1e-6)) fail('end points ' + lo + ', ' + hi + ' vs ' + c.left + ', ' + c.right);
    else if ((iv[1] === '[') !== c.lc || (iv[4] === ']') !== c.rc) fail('brackets ' + iv[1] + iv[4] + ' vs ' + (c.lc ? '[' : '(') + (c.rc ? ']' : ')'));
  }
}
console.log(total + ' series checks (' + decided + ' decided, ' + undecided + ' politely undecided), ' + bad + ' WRONG');
process.exit(bad ? 1 : 0);
