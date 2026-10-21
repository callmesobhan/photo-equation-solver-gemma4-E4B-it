// Feed random token soup to the engine: it must always return valid JSON, quickly, never throw.
import fs from 'node:fs';
import vm from 'node:vm';
const html = fs.readFileSync(process.argv[2], 'utf8');
const m = /<script>([\s\S]*)<\/script>/.exec(html);
const window = {};
vm.runInContext(m[1], vm.createContext({ window, console: { error() {}, log: console.log }, Math, JSON, BigInt, Number, String, Array, Object, Set, Map, RegExp, Error, RangeError, isFinite, isNaN, parseInt, parseFloat }));
const fn = window.ai_edge_gallery_get_result;

let seed = Number(process.argv[3] || 99);
const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
const vocab = ['0', '1', '2', '3', '7', '10', '100', '0.5', '.5', '3.', 'x', 'y', 'z', 'a', 'e', 'pi', 'π', '+', '-', '*', '/', '^', '(', ')', '=', '<', '>', '<=', '>=', '!=', 'sin', 'cos', 'tan', 'ln', 'log', 'sqrt', 'abs', '|', ',', ';', '\n', ' ', '!', '%', '²', '√', '×', '÷', '−', '\\frac{', '}', '{', '$', 'x^2', '1/x', '(x+1)', 'e^x', '2x', 'solve', ':', '°', '&', 'and', '?', '_', 'k', '99999999999', '1e400', '170!', '2^1000', '0^0', '1/0'];
const N = Number(process.argv[4] || 6000);
let bad = 0, slow = 0, errors = 0, results = 0, maxMs = 0, worst = '';
for (let i = 0; i < N; i++) {
  const len = 1 + rnd(18);
  let s = '';
  for (let k = 0; k < len; k++) s += vocab[rnd(vocab.length)] + (rnd(4) === 0 ? ' ' : '');
  fs.writeFileSync(process.env.TMPDIR ? process.env.TMPDIR + '/last_fuzz.txt' : '/tmp/last_fuzz.txt', s);
  const t0 = Date.now();
  let out;
  try {
    out = JSON.parse(await fn(JSON.stringify({ equation: s })));
  } catch (e) {
    bad++; console.log('✗ THREW/INVALID for ' + JSON.stringify(s) + ': ' + e.message); continue;
  }
  const ms = Date.now() - t0;
  if (ms > maxMs) { maxMs = ms; worst = s; }
  if (ms > 1500) { slow++; console.log('slow (' + ms + 'ms): ' + JSON.stringify(s)); }
  if (out.error !== undefined) {
    errors++;
    if (/unexpected failure|undefined|NaN|\[object|TypeError|ReferenceError/.test(out.error)) { bad++; console.log('✗ internal error for ' + JSON.stringify(s) + ': ' + out.error.slice(0, 160)); }
  } else {
    results++;
    if (/NaN|undefined|\[object|Infinity|null/.test(out.result)) { bad++; console.log('✗ garbage in result for ' + JSON.stringify(s) + ':\n' + out.result); }
  }
}
console.log(`${N} inputs: ${results} answered, ${errors} politely rejected, ${bad} bad, ${slow} slow (>1.5s); slowest ${maxMs}ms for ${JSON.stringify(worst)}`);
process.exit(bad ? 1 : 0);
