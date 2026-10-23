// Coordinate geometry of the plane against sympy.geometry (circles, tangents, lines, triangle centres, transformations, hulls).
import { spawnSync } from 'node:child_process';
import { load } from './harness.mjs';
const call = load(process.argv[2]);
const PY = process.env.PY || 'python3';
const r = spawnSync(PY, ['gen_coord2d.py', process.argv[3] || '1'], { encoding: 'utf8', maxBuffer: 1 << 28 });
if (r.status) { console.log(r.stderr); process.exit(1); }
const cases = JSON.parse(r.stdout);
let bad = 0;
let total = 0;
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * (1 + Math.abs(b));
const frac = (s) => { const m = /^(-?\d+)(?:\/(\d+))?$/.exec(s.trim()); return m ? Number(m[1]) / Number(m[2] || 1) : NaN; };
/** numeric value of "5/2 (= 2.5)", "2√2 (≈ 2.8284271)", "5", "distance = 6/5 (= 1.2)" */
function val(text) {
  const a = /≈ (-?[\d.]+(?:e[+-]?\d+)?)/.exec(text);
  if (a) return Number(a[1]);
  const m = /(-?\d+(?:\/\d+)?)(?:\s*\(=\s*(-?[\d.]+)\))?\s*$/.exec(text.replace(/\s*\(= ([-\d.]+)\)/, ' (= $1)').trim());
  if (!m) return NaN;
  return m[2] !== undefined ? Number(m[2]) : frac(m[1]);
}
/** all points of a text, in order: rational "(a, b)" or the decimals after "≈" */
function points(text) {
  const out = [];
  const rx = /≈ \((-?[\d.]+(?:e[+-]?\d+)?), (-?[\d.]+(?:e[+-]?\d+)?)\)|\((-?\d+(?:\/\d+)?), (-?\d+(?:\/\d+)?)\)/g;
  let m;
  while ((m = rx.exec(text))) out.push(m[1] !== undefined ? [Number(m[1]), Number(m[2])] : [frac(m[3]), frac(m[4])]);
  return out;
}
function lineCoef(s) {
  const m = /(-?[\dxy +*-]+?) = (-?\d+(?:\/\d+)?)\s*$/.exec(s.trim());
  if (!m) return null;
  const c = { x: 0, y: 0 };
  for (const t of m[1].replace(/ - /g, ' + -').split(' + ')) {
    const mm = /^(-?)(\d*)([xy])$/.exec(t.trim());
    if (!mm) return null;
    c[mm[3]] = (mm[1] ? -1 : 1) * (mm[2] === '' ? 1 : Number(mm[2]));
  }
  return [c.x, c.y, frac(m[2])];
}
const sameSet = (A, B, tol = 1e-6) => A.length === B.length && A.every((p) => B.some((q) => near(p[0], q[0], tol) && near(p[1], q[1], tol)));
for (const c of cases) {
  total++;
  const res = await call({ equation: c.cmd });
  const text = res.result ?? 'ERROR ' + res.error;
  const fail = (why) => { bad++; console.log('FAIL ' + c.cmd + '\n   ' + why + '\n   ' + text.split('\n').slice(0, 9).join(' | ')); };
  if (res.error !== undefined) { fail('error: ' + res.error); continue; }
  const lines = text.split('\n');
  const ai = lines.findIndex((l) => /^Answer:/.test(l));
  const answerLines = lines.slice(ai).filter((l, i) => i === 0 || /^\s/.test(l)).map((l) => l.replace(/^Answer:\s*/, '').trim()).filter(Boolean);
  const answer = answerLines.join('\n');
  const find = (rx) => lines.find((l) => rx.test(l)) || '';
  try {
    if (c.kind === 'circle') {
      const l = answerLines[0];
      const ctr = points(l.replace(/radius.*/, ''))[0];
      const rad = val(l.replace(/^.*radius /, ''));
      if (!ctr || !near(ctr[0], c.c[0]) || !near(ctr[1], c.c[1]) || !near(rad, c.r)) fail('centre/radius ' + JSON.stringify(ctr) + ' ' + rad + ' vs ' + JSON.stringify(c.c) + ' ' + c.r);
    } else if (c.kind === 'linecircle') {
      const cat = /does not meet/.test(answer) ? 'none' : /tangent/.test(answer) ? 'tangent' : /cuts/.test(answer) ? 'secant' : '?';
      if (cat !== c.cat) fail('category ' + cat + ' vs ' + c.cat);
      else if (!sameSet(points(answer), c.pts)) fail('points ' + JSON.stringify(points(answer)) + ' vs ' + JSON.stringify(c.pts));
    } else if (c.kind === 'circlecircle') {
      const a = answerLines[0];
      const cat = /coincide/.test(a) ? 'coincide' : /concentric/.test(a) ? 'concentric' : /apart/.test(a) ? 'apart' : /touch externally/.test(a) ? 'external' : /two points/.test(a) ? 'two' : /touch internally/.test(a) ? 'internal' : /inside/.test(a) ? 'inside' : '?';
      if (cat !== c.cat) fail('category ' + cat + ' vs ' + c.cat);
      else if (['two', 'external', 'internal'].includes(cat) && !sameSet(points(answerLines.slice(1).join(' ')), c.pts)) fail('common points ' + JSON.stringify(points(answer)) + ' vs ' + JSON.stringify(c.pts));
    } else if (c.kind === 'tangent') {
      const a = answerLines[0];
      if (c.cat === 'inside') { if (!/inside the circle/.test(a)) fail('inside'); } else if (c.cat === 'on') {
        const co = lineCoef(a.replace(/^tangent at \([^)]*\): /, ''));
        const [h, k] = c.c;
        const ok = co && Math.abs(co[0] * c.P[0] + co[1] * c.P[1] - co[2]) < 1e-9 && Math.abs(co[0] * (c.P[1] - k) - co[1] * (c.P[0] - h)) < 1e-9;
        if (!ok) fail('tangent at a point of the circle');
      } else {
        const contacts = answerLines.filter((l) => /^point of contact/.test(l)).map((l) => points(l)[0]);
        if (contacts.length !== 2 || contacts.some((T) => !T)) fail('two points of contact expected');
        else {
          const [h, k] = c.c;
          for (const T of contacts) {
            const onC = Math.abs((T[0] - h) ** 2 + (T[1] - k) ** 2 - c.r ** 2) < 1e-5 * (1 + c.r ** 2);
            const orth = Math.abs((T[0] - h) * (T[0] - c.P[0]) + (T[1] - k) * (T[1] - c.P[1])) < 1e-5 * (1 + c.r ** 2);
            if (!onC || !orth) fail('point of contact ' + JSON.stringify(T) + ' is not a tangent point');
          }
        }
      }
    } else if (c.kind === 'perpbis' || c.kind === 'parallel') {
      const co = lineCoef(answerLines[0].replace(/^[^:]*: /, ''));
      if (!co || co.some((v, i) => v !== c.coef[i])) fail('line ' + JSON.stringify(co) + ' vs ' + JSON.stringify(c.coef));
    } else if (c.kind === 'lineint') {
      const a = answerLines[0];
      const cat = /coincide/.test(a) ? 'same' : /parallel/.test(a) ? 'parallel' : /intersection point/.test(a) ? 'point' : '?';
      if (cat !== c.cat) fail('category ' + cat + ' vs ' + c.cat);
      else if (cat === 'point') {
        const p = points(a)[0];
        if (!p || !near(p[0], c.pt[0]) || !near(p[1], c.pt[1])) fail('point ' + JSON.stringify(p));
        const g = /\(acute\) = ([\d.]+)°/.exec(text);
        if (!g || !near(Number(g[1]), c.ang, 1e-5)) fail('angle ' + (g && g[1]) + ' vs ' + c.ang);
      }
    } else if (c.kind === 'pointline') {
      if (!near(val(answerLines[0]), c.dist)) fail('distance ' + val(answerLines[0]) + ' vs ' + c.dist);
      const f = points(find(/foot of the perpendicular/).replace(/;.*/, ''))[0];
      if (!f || !near(f[0], c.foot[0]) || !near(f[1], c.foot[1])) fail('foot ' + JSON.stringify(f));
    } else if (c.kind === 'parlines') {
      if (!near(val(answerLines[0]), c.dist)) fail('distance ' + val(answerLines[0]) + ' vs ' + c.dist);
    } else if (c.kind === 'lineinfo') {
      const co = lineCoef(answerLines[0]);
      if (!co || co.some((v, i) => v !== c.coef[i])) fail('line ' + JSON.stringify(co));
      const m = /slope m = (-?\d+(?:\/\d+)?)/.exec(answer);
      if (c.slope === null ? !/vertical/.test(answer) : !m || !near(frac(m[1]), c.slope)) fail('slope');
    } else if (c.kind === 'triangle') {
      const g = (rx) => { const l = answerLines.find((x) => rx.test(x)) || ''; return l; };
      const G = points(g(/^centroid/))[0]; const H = points(g(/^orthocentre/))[0];
      const O = points(g(/^circumcentre/).replace(/,\s+circumradius.*/, ''))[0];
      const R = val(g(/^circumcentre/).replace(/^.*circumradius R = /, ''));
      const I = points(g(/^incentre/).replace(/,\s+inradius.*/, ''))[0];
      const rr = val(g(/^incentre/).replace(/^.*inradius r = /, ''));
      const ar = /area = (\d+(?:\/\d+)?)/.exec(g(/^area/));
      const per = val(g(/^area/).replace(/^.*perimeter = /, ''));
      const angs = [...g(/angles A/).matchAll(/([ABC]) = ([\d.]+)°/g)].map((m) => Number(m[2])).sort((p, q) => p - q);
      const chk = (name, got, want) => { if (!got || !near(got[0], want[0], 1e-5) || !near(got[1], want[1], 1e-5)) fail(name + ' ' + JSON.stringify(got) + ' vs ' + JSON.stringify(want)); };
      chk('G', G, c.G); chk('O', O, c.O); chk('H', H, c.H); chk('I', I, c.I);
      if (!near(R, c.R, 1e-5)) fail('R ' + R + ' vs ' + c.R);
      if (!near(rr, c.r, 1e-5)) fail('r ' + rr + ' vs ' + c.r);
      if (!ar || !near(frac(ar[1]), c.area)) fail('area');
      if (!near(per, c.per, 1e-5)) fail('perimeter ' + per + ' vs ' + c.per);
      if (angs.length !== 3 || angs.some((v, i) => !near(v, c.angles[i], 1e-5))) fail('angles ' + angs + ' vs ' + c.angles);
    } else if (c.kind === 'transform') {
      const got = answerLines.map((l) => points(l.replace(/^.*→/, ''))[0]);
      if (got.length !== c.img.length || got.some((p, i) => !p || !near(p[0], c.img[i][0], 1e-6) || !near(p[1], c.img[i][1], 1e-6))) fail('image ' + JSON.stringify(got) + ' vs ' + JSON.stringify(c.img));
    } else if (c.kind === 'section') {
      const p = points(answerLines[0].replace(/^.* is /, ''))[0];
      if (!p || !near(p[0], c.pt[0]) || !near(p[1], c.pt[1])) fail('section ' + JSON.stringify(p));
    } else if (c.kind === 'collinear') {
      if (/^yes/.test(answer) !== c.yes) fail('collinear');
    } else if (c.kind === 'hull') {
      const vs = points(answerLines[0]).map((p) => [Math.round(p[0]), Math.round(p[1])]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      if (JSON.stringify(vs) !== JSON.stringify(c.verts)) fail('vertices ' + JSON.stringify(vs) + ' vs ' + JSON.stringify(c.verts));
      const ar = /area = (\d+(?:\/\d+)?)/.exec(find(/perimeter/));
      const per = val(find(/perimeter/).replace(/^.*perimeter = /, '').replace(/,.*$/, ''));
      if (!ar || !near(frac(ar[1]), c.area) || !near(per, c.per, 1e-5)) fail('area/perimeter ' + (ar && ar[1]) + ' ' + per + ' vs ' + c.area + ' ' + c.per);
    }
  } catch (e) {
    fail('exception ' + e.message);
  }
}
console.log(total + ' plane-geometry checks, ' + bad + ' WRONG');
process.exit(bad ? 1 : 0);
