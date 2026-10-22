// The numbers printed next to the new pictures (slope fields, fits, histograms, box plots, shaded areas, implicit curves, contour maps,
// regions) against numpy / scipy / exact fractions, plus the geometry of the marching-squares curves (needs the --expose build).
import fs from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { load } from './harness.mjs';
import { compile } from './mathexpr.mjs';
const page = process.argv[2];
const call = load(page);
const m0 = /<script>([\s\S]*)<\/script>/.exec(fs.readFileSync(page, 'utf8'));
const win0 = {};
vm.runInContext(m0[1], vm.createContext({ window: win0, console, Math, JSON, BigInt, Number, String, Array, Object, Set, Map, RegExp, Error, RangeError, isFinite, isNaN, parseInt, parseFloat }));
const T = win0.__test;
if (!T) { console.log('needs the --expose build'); process.exit(2); }
const PY = process.env.PY || 'python3';
const r = spawnSync(PY, ['gen_plot2.py', process.argv[3] || '1'], { encoding: 'utf8', maxBuffer: 1 << 28 });
if (r.status) { console.log(r.stderr); process.exit(1); }
const cases = JSON.parse(r.stdout);
let bad = 0, total = 0;
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * (1 + Math.abs(b));
const frac = (s) => { const m = /^(-?\d+)(?:\/(\d+))?(?: \((?:=|≈) (-?[\d.]+)\))?$/.exec(s.trim()); return m ? Number(m[1]) / Number(m[2] || 1) : NaN; };
for (const c of cases) {
  total++;
  const res = await call({ equation: c.cmd });
  const text = res.result ?? 'ERROR ' + res.error;
  const fail = (why) => { bad++; console.log('FAIL ' + c.cmd + '\n   ' + why + '\n   ' + text.split('\n').slice(0, 8).join(' | ')); };
  if (res.error !== undefined) { fail('error: ' + res.error); continue; }
  const lines = text.split('\n');
  const work = lines.filter((l) => /^- /.test(l)).map((l) => l.slice(2));
  const answer = lines.slice(lines.findIndex((l) => /^Answer:/.test(l))).filter((l, i) => i === 0 || /^\s/.test(l)).map((l) => l.replace(/^Answer:\s*/, '').trim()).join('\n');
  try {
    if (c.kind === 'slope') {
      c.pts.forEach((p) => {
        const sl = work.find((w) => w.startsWith('slope at (' + p.x0 + ', ' + p.y0 + ')'));
        if (!sl || !near(Number(sl.split('= ').pop()), p.slope, 1e-7)) fail('slope at (' + p.x0 + ', ' + p.y0 + ')');
        const so = work.find((w) => w.startsWith('solution through (' + p.x0 + ', ' + p.y0 + ')'));
        const ys = so && [...so.matchAll(/y\((-?\d+)\) ≈ (-?[\d.e+-]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
        if (!so || !ys || ys.length !== 2) fail('solution endpoints: ' + so);
        else ys.forEach(([x, v]) => { const want = x === c.b ? p.right : p.left; if (!near(v, want, 1e-6)) fail('y(' + x + ') = ' + v + ' vs ' + want); });
      });
      const e = work.find((w) => /constant \(equilibrium\) solutions|no constant solution/.test(w));
      if (c.auto) {
        const got = e && /solutions y = (.*)$/.exec(e) ? /solutions y = (.*)$/.exec(e)[1].split(', ').map(Number) : [];
        if (got.length !== c.eq.length || got.some((v, i) => !near(v, c.eq[i], 1e-6))) fail('equilibria ' + got + ' vs ' + c.eq);
      } else if (e) fail('claims an autonomous equation');
    } else if (c.kind === 'scatter') {
      const co = work.find((w) => /^coefficients/.test(w));
      const got = [...co.matchAll(/c\d = (-?[\d.e+-]+)/g)].map((m) => Number(m[1]));
      if (got.length !== c.co.length || got.some((v, i) => !near(v, c.co[i], 1e-6))) fail('coefficients ' + got + ' vs ' + c.co);
      const rr = work.find((w) => /^R²/.test(w));
      if (c.r2 !== null) {
        const r2 = Number(/R² = (-?[\d.e+-]+)/.exec(rr)[1]);
        if (!near(r2, c.r2, 1e-6)) fail('R² ' + r2 + ' vs ' + c.r2);
        if (c.deg === 1) { const rv = Number(/correlation r = (-?[\d.e+-]+)/.exec(rr)[1]); if (!near(rv, c.r, 1e-6)) fail('r'); }
      }
    } else if (c.kind === 'hist') {
      const m = /counts ([\d, ]+)/.exec(answer);
      const counts = m[1].split(', ').map(Number);
      if (JSON.stringify(counts) !== JSON.stringify(c.counts)) fail('counts ' + counts + ' vs ' + c.counts);
      if (counts.reduce((a, b) => a + b, 0) !== c.n) fail('total');
    } else if (c.kind === 'box') {
      const w = work[0];
      const q = /Q1 (\S+)(?: \(= [^)]*\))?, median (\S+)(?: \(= [^)]*\))?, Q3 (\S+)/.exec(w);
      const num = (s) => frac(s);
      const qs = /Q1 ([\d/.-]+)(?: \(= ([\d.-]+)\))?, median ([\d/.-]+)(?: \(= ([\d.-]+)\))?, Q3 ([\d/.-]+)(?: \(= ([\d.-]+)\))?/.exec(w);
      const val = (a, b) => (b !== undefined ? Number(b) : num(a));
      if (!qs || !near(val(qs[1], qs[2]), c.q[0]) || !near(val(qs[3], qs[4]), c.q[1]) || !near(val(qs[5], qs[6]), c.q[2])) fail('quartiles');
      const wh = /whiskers (-?\d+) to (-?\d+)/.exec(w);
      if (!wh || Number(wh[1]) !== c.whisk[0] || Number(wh[2]) !== c.whisk[1]) fail('whiskers');
      const ol = /outliers: ([\d, -]+)/.exec(w);
      const gotO = ol ? ol[1].split(', ').map(Number) : [];
      if (JSON.stringify(gotO) !== JSON.stringify(c.outl)) fail('outliers ' + gotO + ' vs ' + c.outl);
      void q;
    } else if (c.kind === 'shade') {
      const p = Number(/ = (-?[\d.e+-]+) \(/.exec(answer)[1]);
      if (!near(p, c.p, 1e-6)) fail('probability ' + p + ' vs ' + c.p);
    } else if (c.kind === 'implicit') {
      const xi = work.find((w) => /^x-intercepts/.test(w));
      const gx = xi && /≈ (.*)$/.exec(xi) ? /≈ (.*)$/.exec(xi)[1].split(', ').map(Number) : [];
      const yi = work.find((w) => /^y-intercepts/.test(w));
      const gy = yi && /≈ (.*)$/.exec(yi) ? /≈ (.*)$/.exec(yi)[1].split(', ').map(Number) : [];
      const same = (a, b) => a.length === b.length && a.every((v, i) => near(v, b[i], 1e-6));
      if (!same(gx.sort((p, q) => p - q), c.xi)) fail('x-intercepts ' + gx + ' vs ' + c.xi);
      if (!same(gy.sort((p, q) => p - q), c.yi)) fail('y-intercepts ' + gy + ' vs ' + c.yi);
      // geometry of the marching squares curve
      const F = compile(c.expr);
      const f = (x, y) => F({ x, y });
      const [a, b, cc, d] = c.win;
      const { segs } = T.pl2Contour(f, [a, b], [cc, d], 200, 150, 0);
      const h = Math.max((b - a) / 200, (d - cc) / 150);
      let worst = 0;
      segs.forEach((s) => [[s[0], s[1]], [s[2], s[3]]].forEach(([x, y]) => {
        const gx2 = (f(x + 1e-5, y) - f(x - 1e-5, y)) / 2e-5, gy2 = (f(x, y + 1e-5) - f(x, y - 1e-5)) / 2e-5;
        const dist = Math.abs(f(x, y)) / (Math.hypot(gx2, gy2) || 1);
        if (dist > worst) worst = dist;
      }));
      if (worst > 0.15 * h) fail('curve points are up to ' + worst + ' from the curve (cell size ' + h + ')');
      if (c.xi.length + c.yi.length > 0 && !segs.length) fail('no curve segments although the curve crosses the window');
    } else if (c.kind === 'contour') {
      const rg = work.find((w) => /ranges from/.test(w));
      const mm = /ranges from (-?[\d.e+-]+) to (-?[\d.e+-]+)/.exec(rg);
      if (!near(Number(mm[1]), c.mn, 1e-6) || !near(Number(mm[2]), c.mx, 1e-6)) fail('range ' + mm[1] + '..' + mm[2] + ' vs ' + c.mn + '..' + c.mx);
      const lv = work.find((w) => /^level curves at/.test(w));
      const levels = lv.replace('level curves at ', '').split(', ').map(Number);
      const step = levels.length > 1 ? levels[1] - levels[0] : 1;
      if (levels.some((v, i) => i && !near(v - levels[i - 1], step, 1e-6))) fail('levels are not equally spaced');
      if (levels.some((v) => v <= c.mn || v >= c.mx)) fail('a level lies outside the range of the function');
      if (levels.length < 3) fail('only ' + levels.length + ' levels');
    } else if (c.kind === 'region') {
      const cp = work.find((w) => /^corner points/.test(w));
      const pts = [...cp.matchAll(/\((-?\d+(?:\/\d+)?(?: \((?:=|≈) -?[\d.]+\))?), (-?\d+(?:\/\d+)?(?: \((?:=|≈) -?[\d.]+\))?)\)/g)].map((m) => [frac(m[1]), frac(m[2])]);
      const want = c.verts;
      pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
      if (pts.length !== want.length || pts.some((p, i) => !near(p[0], want[i][0], 1e-9) || !near(p[1], want[i][1], 1e-9))) fail('corner points ' + JSON.stringify(pts) + ' vs ' + JSON.stringify(want));
      const bd = work.find((w) => /bounded/.test(w));
      if (/is bounded/.test(bd) !== c.bounded) fail('boundedness');
      else if (c.bounded) { const ar = /area = (-?\d+(?:\/\d+)?)(?: \((?:=|≈) ([\d.]+)\))?/.exec(bd); const av = frac(ar[1]); if (!near(av, c.area, 1e-9)) fail('area ' + av + ' vs ' + c.area); }
    }
  } catch (e) { fail('could not read the answer: ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
}
console.log(total + ' plot-extras checks, ' + bad + ' WRONG');
process.exit(bad ? 1 : 0);
