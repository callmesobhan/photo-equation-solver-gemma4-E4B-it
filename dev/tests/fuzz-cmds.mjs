// Command fuzz: every registered command called with random arguments must answer or reject politely, quickly.
// Needs the build made with --expose (it reads the command names from the page itself).
import fs from 'node:fs';
import vm from 'node:vm';
const html = fs.readFileSync(process.argv[2], 'utf8');
const m = /<script>([\s\S]*)<\/script>/.exec(html);
const window = {};
vm.runInContext(m[1], vm.createContext({ window, console: { error() {}, log: console.log }, Math, JSON, BigInt, Number, String, Array, Object, Set, Map, RegExp, Error, RangeError, isFinite, isNaN, parseInt, parseFloat }));
const fn = window.ai_edge_gallery_get_result;
const names = Object.keys(window.__test.COMMANDS);
let seed = Number(process.argv[3] || 5);
const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
const pick = (a) => a[rnd(a.length)];
const flavors = {
  numbers: ['0', '1', '2', '3', '4', '5', '6', '7', '10', '12', '20', '36', '100', '0.5', '1/2', '0.05', '-1', '-3', '2.5', '1000', '99999', '123456789', '2^64', '5%', 'pi', 'sqrt(2)'],
  lists: ['[1,2]', '[1,2,3]', '[[1,2],[3,4]]', '[[1,2],[2,4]]', '[0,0]', '[2,3,5,7]', '[[1,0],[0,1]]', '[[2,1],[1,3]]', '[[1,2,3],[4,5,6],[7,8,10]]', '[3,1,4,1,5,9,2,6]', '[1,2,3,4,5]', '[[10,20],[30,40]]', '[0.1,0.2,0.3]', '[1,0,2]'],
  exprs: ['x', 'x', 'x', 't', 'k', 'x^2', 'x^2+1', '1/x', 'e^x', 'ln(x)', 'sin(x)', 'x^3-3x', '2x+3', '1/(x^2-1)', 'sqrt(x)', '0', '1', '2', '5', 'oo', '-oo', 'pi', 'x^k', 'cos(x)^2', '(x+1)/(x-1)'],
  named: ['a=3', 'b=4', 'C=90', 'A=30', 'r=2', 'd=10', 'u=0', 'a=9.8', 't=3', 's=20', 'v=10', 'c=5', 'x=1', 'y=2', '3', '4', '5'],
  mixed: ['x', 'y', '1', '2', '3', '[1,2]', '[[1,2],[3,4]]', 'H2O', 'NaCl', 'Fe', '5 km', '0.95', '10%', 'i', '1+i', '3+4i', '2i', 'z'],
};
const flavorNames = Object.keys(flavors);
const N = Number(process.argv[4] || 6000);
const seen = new Map();
let bad = 0, slow = 0, results = 0, errors = 0, maxMs = 0, worst = '';
for (let i = 0; i < N; i++) {
  const name = pick(names);
  const argc = rnd(6);
  const pool = flavors[pick(flavorNames)];
  const args = Array.from({ length: argc }, () => pick(pool));
  const s = name + '(' + args.join(', ') + ')';
  const t0 = Date.now();
  let out;
  try {
    out = JSON.parse(await fn(JSON.stringify({ equation: s })));
  } catch (e) { bad++; console.log('✗ THREW ' + s + ': ' + e.message); continue; }
  const ms = Date.now() - t0;
  if (ms > maxMs) { maxMs = ms; worst = s; }
  if (ms > 3000) { slow++; console.log('slow (' + ms + 'ms): ' + s); }
  if (out.error !== undefined) {
    errors++;
    if (/unexpected failure|NaN|\[object|TypeError|ReferenceError|Infinity/.test(out.error)) { bad++; const c = (seen.get(name) || 0) + 1; seen.set(name, c); if (c <= 2) console.log('✗ internal error for ' + s + ': ' + out.error.slice(0, 200)); }
  } else {
    results++;
    if (/NaN|undefined|\[object|\bnull\b(?!\s+space)/.test(out.result)) { bad++; const c = (seen.get(name) || 0) + 1; seen.set(name, c); if (c <= 2) console.log('✗ garbage in result for ' + s + ':\n' + out.result.slice(0, 300)); }
  }
}
console.log(`${N} command calls: ${results} answered, ${errors} politely rejected, ${bad} bad, ${slow} slow (>3s); slowest ${maxMs}ms for ${worst}`);
process.exit(bad ? 1 : 0);
