// Analytic geometry in space against sympy.geometry / numpy; quadric surfaces generated from canonical forms by an affine change of variables.
import { spawnSync } from 'node:child_process';
import { load } from './harness.mjs';
const call = load(process.argv[2]);
const PY = process.env.PY || 'python3';
const r = spawnSync(PY, ['gen_geom3d.py', process.argv[3] || '1'], { encoding: 'utf8', maxBuffer: 1 << 28 });
if (r.status) { console.log(r.stderr); process.exit(1); }
const cases = JSON.parse(r.stdout);
let bad = 0, total = 0;
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * (1 + Math.abs(b));
function frac(s) { const m = /^(-?\d+)(?:\/(\d+))?$/.exec(s.trim()); return m ? Number(m[1]) / Number(m[2] || 1) : NaN; }
// numeric value of "distance = 5", "distance = 3/2", "distance = √14/7 (≈ 0.5345)"
function val(text) {
  const a = /≈ (-?[\d.e+-]+)/.exec(text);
  if (a) return Number(a[1]);
  const m = /= (-?\d+(?:\/\d+)?)\s*(?:[^\d/].*)?$/.exec(text);
  return m ? frac(m[1]) : NaN;
}
function triple(s) { const m = /\((-?[\d/]+), (-?[\d/]+), (-?[\d/]+)\)/.exec(s); return m ? [frac(m[1]), frac(m[2]), frac(m[3])] : null; }
function planeCoef(s) {
  const m = /plane (.*) = (-?[\d/]+)/.exec(s);
  if (!m) return null;
  const c = { x: 0, y: 0, z: 0 };
  for (const t of m[1].replace(/ - /g, ' + -').split(' + ')) { const mm = /^(-?)(\d*)([xyz])$/.exec(t.trim()); if (!mm) return null; c[mm[3]] = (mm[1] ? -1 : 1) * (mm[2] === '' ? 1 : Number(mm[2])); }
  return [c.x, c.y, c.z, frac(m[2])];
}
for (const c of cases) {
  total++;
  const res = await call({ equation: c.cmd });
  const text = res.result ?? 'ERROR ' + res.error;
  const fail = (why) => { bad++; console.log('FAIL ' + c.cmd + '\n   ' + why + '\n   ' + text.split('\n').slice(0, 7).join(' | ')); };
  if (res.error !== undefined) { fail('error: ' + res.error); continue; }
  const lines = text.split('\n');
  const answer = lines.slice(lines.findIndex((l) => /^Answer:/.test(l))).filter((l, i) => i === 0 || /^\s/.test(l)).map((l) => l.replace(/^Answer:\s*/, '').trim()).join('\n');
  try {
    if (c.kind === 'plane3') {
      const p = planeCoef(answer);
      if (!p || p.some((v, i) => v !== c.coef[i])) fail('plane ' + JSON.stringify(p) + ' vs ' + JSON.stringify(c.coef));
    } else if (c.kind === 'pointplane') {
      if (!near(val(answer.split('\n')[0]), c.dist)) fail('distance');
      const f = triple(lines.find((l) => /foot of the perpendicular/.test(l)));
      if (!f || f.some((v, i) => !near(v, c.foot[i]))) fail('foot');
    } else if (c.kind === 'pointline') {
      if (!near(val(answer), c.dist)) fail('distance ' + val(answer) + ' vs ' + c.dist);
    } else if (c.kind === 'skew') {
      const a = answer.split('\n')[0];
      const cat = /coincide/.test(a) ? 'coincide' : /parallel/.test(a) ? 'parallel' : /intersect/.test(a) ? 'intersect' : /skew/.test(a) ? 'skew' : '?';
      if (cat !== c.cat) fail('category ' + cat + ' vs ' + c.cat);
      else if ((cat === 'skew' || cat === 'parallel') && !near(val(a), c.dist)) fail('distance ' + val(a) + ' vs ' + c.dist);
    } else if (c.kind === 'lineplane') {
      const a = answer.split('\n')[0];
      if (c.cat === 'point') {
        const pt = triple(a);
        if (!pt || pt.some((v, i) => !near(v, c.pt[i]))) fail('point');
        const g = /φ = ([\d.]+)°/.exec(text);
        if (!g || !near(Number(g[1]), c.ang, 1e-5)) fail('angle');
      } else if (c.cat === 'in' ? !/lies in the plane/.test(a) : !/parallel to the plane/.test(a)) fail('category ' + c.cat);
    } else if (c.kind === 'planeangle') {
      if (c.parallel) { if (!/parallel|coincide/.test(answer)) fail('parallel planes'); }
      else { const g = /= ([\d.]+)°/.exec(answer); if (!g || !near(Number(g[1]), c.ang, 1e-5)) fail('angle'); }
    } else if (c.kind === 'planeint') {
      const m = /through (\([^)]*\)) with direction (\([^)]*\))/.exec(answer);
      const P = triple(m[1]), d = triple(m[2]);
      const cr = [c.dirv[1] * d[2] - c.dirv[2] * d[1], c.dirv[2] * d[0] - c.dirv[0] * d[2], c.dirv[0] * d[1] - c.dirv[1] * d[0]];
      if (cr.some((v) => Math.abs(v) > 1e-9)) fail('direction is not parallel to n1 x n2');
      const on = (pl) => Math.abs(pl[0] * P[0] + pl[1] * P[1] + pl[2] * P[2] - pl[3]) < 1e-9;
      if (!on(c.p1) || !on(c.p2)) fail('point not on both planes');
    } else if (c.kind === 'triple') {
      if (val(answer) !== c.val) fail('value ' + val(answer));
    } else if (c.kind === 'tetra') {
      if (c.val === 0 ? !/= 0/.test(answer) : !near(val(answer), c.val)) fail('volume ' + val(answer) + ' vs ' + c.val);
    } else if (c.kind === 'area3') {
      if (c.val === 0 ? !/= 0/.test(answer) : !near(val(answer), c.val)) fail('area ' + val(answer) + ' vs ' + c.val);
    } else if (c.kind === 'dircos') {
      const as = [...answer.matchAll(/= ([\d.]+)°/g)].map((m) => Number(m[1]));
      if (as.length !== 3 || as.some((v, i) => !near(v, c.angs[i], 1e-5))) fail('angles ' + as + ' vs ' + c.angs);
    } else if (c.kind === 'sphere4' || c.kind === 'sphere2') {
      const m = /centre (\([^)]*\)), radius (.*)$/m.exec(answer.split('\n')[0]);
      const cen = triple(m[1]);
      if (!cen || cen.some((v, i) => !near(v, c.cen[i]))) fail('centre');
      const rad = val('= ' + m[2]);
      if (!near(rad, c.r, 1e-6)) fail('radius ' + rad + ' vs ' + c.r);
    } else if (c.kind === 'quadric') {
      const s = /surface: (.*)/.exec(answer);
      if (!s) { fail('no surface line'); continue; }
      const got = s[1].replace(/ \(.*\)$/, '').replace(/^no real points$/, 'no real points').replace(/^a single plane \(counted twice\)$/, 'a single plane');
      const gotN = s[1].startsWith('no real points') ? 'no real points' : s[1].startsWith('a single plane') ? 'a single plane' : s[1].startsWith('a single point') ? 'a single point' : got;
      if (gotN !== c.want && !(c.want === 'ellipsoid' && gotN === 'sphere')) fail('expected ' + c.want + ', got ' + s[1]);
    }
  } catch (e) { fail('could not read the answer: ' + e.message); }
}
console.log(total + ' space-geometry checks, ' + bad + ' WRONG');
process.exit(bad ? 1 : 0);
