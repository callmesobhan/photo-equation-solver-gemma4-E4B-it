// The documentation must not lie: every example in SKILL.md runs without error, and every command the page
// knows is mentioned in its built-in help (so the model can always find the syntax).
import fs from 'node:fs';
import vm from 'node:vm';
import { load } from './harness.mjs';
const page = process.argv[2];
const skill = fs.readFileSync(process.argv[3], 'utf8');
const call = load(page);
let bad = 0;
const examples = [...skill.matchAll(/data: `(\{.*?\})`/g)].map((m) => m[1]);
for (const ex of examples) {
  const r = await call(ex);
  if (r.error !== undefined) { bad++; console.log('✗ SKILL.md example fails: ' + ex + '\n    ' + r.error); }
}
console.log(examples.length + ' SKILL.md examples run');
// every table command that is written with concrete arguments
const cmds = [...skill.matchAll(/`([a-z]+\([^`]*\d[^`]*\))`/g)].map((m) => m[1]).filter((c) => !/\b[a-z]\b, [a-z]\b/.test(c) && !/\(f,|\(A,|\(a, b\)|\.\.\./.test(c));
for (const c of cmds) {
  const r = await call({ equation: c });
  if (r.error !== undefined) { bad++; console.log('✗ SKILL.md command fails: ' + c + '\n    ' + r.error); }
}
console.log(cmds.length + ' SKILL.md table commands with concrete arguments run');
// help coverage (needs the --expose build)
const html = fs.readFileSync(page, 'utf8');
const m = /<script>([\s\S]*)<\/script>/.exec(html);
const window = {};
vm.runInContext(m[1], vm.createContext({ window, console, Math, JSON, BigInt, Number, String, Array, Object, Set, Map, RegExp, Error, RangeError, isFinite, isNaN, parseInt, parseFloat }));
if (window.__test) {
  const helpAll = Object.values(window.__test.HELP).join('\n').toLowerCase();
  const missing = Object.keys(window.__test.COMMANDS).filter((n) => !new RegExp('(^|[^a-z0-9_])' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z0-9_]|$)').test(helpAll));
  // aliases are allowed to be undocumented as long as a documented name resolves to the same handler
  const undocumented = missing.filter((n) => !Object.keys(window.__test.COMMANDS).some((o) => o !== n && window.__test.COMMANDS[o] === window.__test.COMMANDS[n] && !missing.includes(o)));
  if (undocumented.length) { bad++; console.log('✗ commands missing from the built-in help: ' + undocumented.join(', ')); }
  else console.log('every command (or one of its aliases) appears in the built-in help');
}
// every phrase quoted in "help words" must be understood
{
  const words = (await call({ equation: 'help words' })).result;
  const phrases = [...words.matchAll(/"([^"]+)"/g)].map((x) => x[1]).filter((p) => !/\.\.\./.test(p) && /[a-z]{3}/.test(p));
  for (const p of phrases) {
    const r = await call({ equation: p });
    if (r.error !== undefined) { bad++; console.log('✗ "help words" phrase fails: ' + p + '\n    ' + r.error); }
  }
  console.log(phrases.length + ' phrases quoted in "help words" run');
}
process.exit(bad ? 1 : 0);
