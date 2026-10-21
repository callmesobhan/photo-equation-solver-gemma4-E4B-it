// The extra statistics commands against scipy.stats / numpy.
import { spawnSync } from 'node:child_process';
import { load } from './harness.mjs';
const call = load(process.argv[2]);
const PY = process.env.PY || 'python3';
const r = spawnSync(PY, ['gen_stats2.py', process.argv[3] || '1'], { encoding: 'utf8', maxBuffer: 1 << 28 });
if (r.status) { console.log(r.stderr); process.exit(1); }
const cases = JSON.parse(r.stdout);
let bad = 0, total = 0;
for (const c of cases) {
  total++;
  const res = await call({ equation: c.cmd });
  const text = res.result ?? 'ERROR ' + res.error;
  const body = text.replace(/^Read as:.*\n/, '');
  const problems = [];
  if (res.error !== undefined) problems.push('error');
  else for (const [re, want] of c.checks) {
    const m = new RegExp(re, 'm').exec(body);
    if (!m) { problems.push('no match for /' + re + '/'); continue; }
    let got;
    if (m[1] !== undefined) got = parseFloat(m[1]);
    else {
      // label only: the number in "(≈ N)" / "(= N)" on the rest of that line, else the number right after the label
      const rest = body.slice(m.index + m[0].length).split('\n')[0];
      const dec = /\((?:≈|=)\s*(-?[0-9.]+(?:e[+-]?\d+)?)\)/.exec(rest);
      const plain = /^\s*(-?[0-9.]+(?:e[+-]?\d+)?)/.exec(rest);
      got = dec ? parseFloat(dec[1]) : plain ? parseFloat(plain[1]) : NaN;
      if (/^-?\d+\/\d+/.test(rest.trim())) { const fr = /^(-?\d+)\/(\d+)/.exec(rest.trim()); if (!dec) got = Number(fr[1]) / Number(fr[2]); }
    }
    if (!(Math.abs(got - want) <= 3e-6 * (1 + Math.abs(want)))) problems.push('/' + re + '/ gave ' + got + ', expected ' + want);
  }
  if (problems.length) { bad++; console.log('FAIL ' + c.cmd + '\n   ' + problems.join('\n   ') + '\n   ' + text.split('\n').slice(0, 6).join(' | ')); }
}
console.log(`${total - bad}/${total} agree with scipy.stats / numpy`);
process.exit(bad ? 1 : 0);
