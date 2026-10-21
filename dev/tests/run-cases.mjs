import { load } from './harness.mjs';
import { CASES } from './cases.mjs';
const call = load(process.argv[2]);
let pass = 0, fail = 0;
const verbose = process.argv.includes('-v');
for (const [input, expect, opts = {}] of CASES) {
  if (opts.skip) continue;
  const payload = opts.solve_for ? { equation: input, solve_for: opts.solve_for } : { equation: input };
  const t0 = Date.now();
  const r = await call(payload);
  const ms = Date.now() - t0;
  const text = r.result ?? r.error ?? '';
  let ok = true; const why = [];
  if (opts.err) { if (r.error === undefined) { ok = false; why.push('expected an error'); } }
  else {
    if (r.error !== undefined) { ok = false; why.push('error: ' + r.error); }
    for (const e of expect) if (!text.includes(e)) { ok = false; why.push('missing "' + e + '"'); }
    for (const n of opts.not || []) if (text.includes(n)) { ok = false; why.push('unexpected "' + n + '"'); }
  }
  if (ms > 1500) { why.push('slow ' + ms + 'ms'); }
  if (ok) pass++; else { fail++; console.log('✗ ' + JSON.stringify(input) + (opts.solve_for ? ' [solve_for ' + opts.solve_for + ']' : '') + '\n    ' + why.join('; ') + '\n' + text.split('\n').map((l) => '    | ' + l).join('\n')); }
  if (verbose && ok) console.log('✓ ' + JSON.stringify(input) + ' (' + ms + 'ms)');
}
console.log(`\n${pass} passed, ${fail} failed, ${pass + fail} total`);
process.exit(fail ? 1 : 0);
