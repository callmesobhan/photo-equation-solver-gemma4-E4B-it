import fs from 'node:fs';
import vm from 'node:vm';

export function load(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const m = /<script>([\s\S]*)<\/script>/.exec(html);
  if (!m) throw new Error('no <script> in ' + htmlPath);
  const window = {};
  const ctx = vm.createContext({ window, console, Math, JSON, BigInt, Number, String, Array, Object, Set, Map, RegExp, Error, RangeError, isFinite, isNaN, parseInt, parseFloat });
  vm.runInContext(m[1], ctx, { filename: 'index.html' });
  const fn = window['ai_edge_gallery_get_result'];
  if (typeof fn !== 'function') throw new Error('ai_edge_gallery_get_result is not defined');
  return async (data) => JSON.parse(await fn(typeof data === 'string' ? data : JSON.stringify(data)));
}
