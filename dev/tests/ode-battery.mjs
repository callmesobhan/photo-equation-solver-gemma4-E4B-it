// ODE battery: every answer is checked independently by substituting it back into the original equation
// with numerical derivatives (for several values of the arbitrary constants), and initial conditions are checked.
import { load } from './harness.mjs';
import { compile } from './mathexpr.mjs';
import { D, verifyODE } from './ode-verify.mjs';
const call = load(process.argv[2]);
// [input, residual(x, y, y1, y2, y3) written in JS, order, ics?]
const CASES = [
  ["y' = 2y", (x, y, y1) => y1 - 2 * y, 1],
  ["y' + y = x", (x, y, y1) => y1 + y - x, 1],
  ["y' - y/x = x", (x, y, y1) => y1 - y / x - x, 1],
  ["x*y' + y = x^2", (x, y, y1) => x * y1 + y - x * x, 1],
  ["y' + 2*x*y = x", (x, y, y1) => y1 + 2 * x * y - x, 1],
  ["y' = y*sin(x)", (x, y, y1) => y1 - y * Math.sin(x), 1],
  ["y' = x*y", (x, y, y1) => y1 - x * y, 1],
  ["y' = y^2", (x, y, y1) => y1 - y * y, 1],
  ["y' = x/y", (x, y, y1) => y * y1 - x, 1],
  ["y' = (1 + y^2)/(1 + x^2)", (x, y, y1) => y1 - (1 + y * y) / (1 + x * x), 1],
  ["y' = y(1 - y)", (x, y, y1) => y1 - y * (1 - y), 1],
  ["y' + y = y^2", (x, y, y1) => y1 + y - y * y, 1],
  ["y' - y/x = x*y^2", (x, y, y1) => y1 - y / x - x * y * y, 1],
  ["y' + y = x*y^3", (x, y, y1) => y1 + y - x * y ** 3, 1],
  ["y' = (x^2 + y^2)/(x*y)", (x, y, y1) => y1 - (x * x + y * y) / (x * y), 1],
  ["y' = (x + y)/x", (x, y, y1) => y1 - (x + y) / x, 1],
  ["y' = (y/x) + tan(y/x)", (x, y, y1) => y1 - y / x - Math.tan(y / x), 1],
  ["(x + y) dx + (x - y) dy = 0", (x, y, y1) => (x - y) * y1 + (x + y), 1],
  ["2x*y*dx + (x^2 + 1)dy = 0", (x, y, y1) => (x * x + 1) * y1 + 2 * x * y, 1],
  ["(2x*y + 3) dx + (x^2 + 4) dy = 0", (x, y, y1) => (x * x + 4) * y1 + 2 * x * y + 3, 1],
  ["(y*cos(x) + 2) dx + (sin(x) + 3*y^2) dy = 0", (x, y, y1) => (Math.sin(x) + 3 * y * y) * y1 + y * Math.cos(x) + 2, 1],
  ["y'' + y = 0", (x, y, y1, y2) => y2 + y, 2],
  ["y'' - y = 0", (x, y, y1, y2) => y2 - y, 2],
  ["y'' + 4y = 0", (x, y, y1, y2) => y2 + 4 * y, 2],
  ["y'' - 3y' + 2y = 0", (x, y, y1, y2) => y2 - 3 * y1 + 2 * y, 2],
  ["y'' + 2y' + y = 0", (x, y, y1, y2) => y2 + 2 * y1 + y, 2],
  ["y'' + 2y' + 5y = 0", (x, y, y1, y2) => y2 + 2 * y1 + 5 * y, 2],
  ["y'' - 2y' + 2y = 0", (x, y, y1, y2) => y2 - 2 * y1 + 2 * y, 2],
  ["y'' - y' - 6y = 0", (x, y, y1, y2) => y2 - y1 - 6 * y, 2],
  ["y'' + y = x", (x, y, y1, y2) => y2 + y - x, 2],
  ["y'' - y = e^(2x)", (x, y, y1, y2) => y2 - y - Math.exp(2 * x), 2],
  ["y'' + y = sin(x)", (x, y, y1, y2) => y2 + y - Math.sin(x), 2],
  ["y'' + 3y' + 2y = e^(-x)", (x, y, y1, y2) => y2 + 3 * y1 + 2 * y - Math.exp(-x), 2],
  ["y'' - 4y' + 4y = x*e^(2x)", (x, y, y1, y2) => y2 - 4 * y1 + 4 * y - x * Math.exp(2 * x), 2],
  ["y'' + 4y = cos(2x)", (x, y, y1, y2) => y2 + 4 * y - Math.cos(2 * x), 2],
  ["y'' + y = x^2 + 1", (x, y, y1, y2) => y2 + y - x * x - 1, 2],
  ["y'' + y = tan(x)", (x, y, y1, y2) => y2 + y - Math.tan(x), 2],
  ["y'' + y = sec(x)", (x, y, y1, y2) => y2 + y - 1 / Math.cos(x), 2],
  ["y'' + 4y = tan(2x)", (x, y, y1, y2) => y2 + 4 * y - Math.tan(2 * x), 2],
  ["y'' - 2y' + y = e^x/x", (x, y, y1, y2) => y2 - 2 * y1 + y - Math.exp(x) / x, 2],
  ["y'' + 2y' + y = e^(-x) ln(x)", (x, y, y1, y2) => y2 + 2 * y1 + y - Math.exp(-x) * Math.log(x), 2],
  ["y'' - y = 1/(1 + e^x)", (x, y, y1, y2) => y2 - y - 1 / (1 + Math.exp(x)), 2],
  ["x^2*y'' - 2*x*y' + 2*y = 0", (x, y, y1, y2) => x * x * y2 - 2 * x * y1 + 2 * y, 2],
  ["x^2*y'' + x*y' - y = 0", (x, y, y1, y2) => x * x * y2 + x * y1 - y, 2],
  ["x^2*y'' + x*y' + y = 0", (x, y, y1, y2) => x * x * y2 + x * y1 + y, 2],
  ["x^2*y'' - 3*x*y' + 4*y = 0", (x, y, y1, y2) => x * x * y2 - 3 * x * y1 + 4 * y, 2],
  ["x^2*y'' + x*y' + y = ln(x)", (x, y, y1, y2) => x * x * y2 + x * y1 + y - Math.log(x), 2],
  ["y' = (x - y)/(x + y)", (x, y, y1) => (x + y) * y1 - (x - y), 1],
  ["y' = (2*x*y)/(x^2 - y^2)", (x, y, y1) => (x * x - y * y) * y1 - 2 * x * y, 1],
  ["y' = y/x + x*cos(x)", (x, y, y1) => y1 - y / x - x * Math.cos(x), 1],
  ["y' + 2y = e^(-x)", (x, y, y1) => y1 + 2 * y - Math.exp(-x), 1],
  ["y' + y*tan(x) = sin(2x)", (x, y, y1) => y1 + y * Math.tan(x) - Math.sin(2 * x), 1],
  ["(2xy + 3)dx + (x^2 - 1)dy = 0", (x, y, y1) => (x * x - 1) * y1 + 2 * x * y + 3, 1],
  ["(3x^2 + y)dx + (x + 2y)dy = 0", (x, y, y1) => (x + 2 * y) * y1 + 3 * x * x + y, 1],
  ["(y^2 + 2x)dx + 2xy dy = 0", (x, y, y1) => 2 * x * y * y1 + y * y + 2 * x, 1],
  ["y' = y(2 - y)", (x, y, y1) => y1 - y * (2 - y), 1],
  ["dy/dx = y^2 - 1", (x, y, y1) => y1 - y * y + 1, 1],
  ["y' = (1 + y)/(1 + x)", (x, y, y1) => y1 - (1 + y) / (1 + x), 1],
  ["y' = e^(x - y)", (x, y, y1) => y1 - Math.exp(x - y), 1],
  ["y' = x^2*y^2", (x, y, y1) => y1 - x * x * y * y, 1],
  ["x*y' = y + x^2*e^x", (x, y, y1) => x * y1 - y - x * x * Math.exp(x), 1],
  ["y'' + 2y' + 2y = e^(-x)*cos(x)", (x, y, y1, y2) => y2 + 2 * y1 + 2 * y - Math.exp(-x) * Math.cos(x), 2],
  ["y'' - 2y' + y = e^x", (x, y, y1, y2) => y2 - 2 * y1 + y - Math.exp(x), 2],
  ["y'' + y' = x", (x, y, y1, y2) => y2 + y1 - x, 2],
  ["y'' - 4y = sinh(x)", (x, y, y1, y2) => y2 - 4 * y - Math.sinh(x), 2],
  ["y''' - 3y'' + 3y' - y = 0", (x, y, y1, y2, y3) => y3 - 3 * y2 + 3 * y1 - y, 3],
  ["y'' + 9y = 9*sec(3x)", (x, y, y1, y2) => y2 + 9 * y - 9 / Math.cos(3 * x), 2],
  ["x^2*y'' + 3*x*y' + y = 0", (x, y, y1, y2) => x * x * y2 + 3 * x * y1 + y, 2],
  ["x^2*y'' + 5*x*y' + 4*y = x^2", (x, y, y1, y2) => x * x * y2 + 5 * x * y1 + 4 * y - x * x, 2],
  ["y''' - y = 0", (x, y, y1, y2, y3) => y3 - y, 3],
  ["y''' - 6y'' + 11y' - 6y = 0", (x, y, y1, y2, y3) => y3 - 6 * y2 + 11 * y1 - 6 * y, 3],
  ["y''' + y' = 0", (x, y, y1, y2, y3) => y3 + y1, 3],
];
// with initial conditions: [input, residual, order, [[order, point, value], ...]]
const IC_CASES = [
  ["y' = 2y, y(0) = 3", (x, y, y1) => y1 - 2 * y, 1, [[0, 0, 3]]],
  ["y' + y = x, y(0) = 1", (x, y, y1) => y1 + y - x, 1, [[0, 0, 1]]],
  ["y' = x*y, y(1) = 2", (x, y, y1) => y1 - x * y, 1, [[0, 1, 2]]],
  ["y' = x*y/(1 + x^2), y(0) = 2", (x, y, y1) => y1 - x * y / (1 + x * x), 1, [[0, 0, 2]]],
  ["y'' + y = 0, y(0) = 1, y'(0) = 2", (x, y, y1, y2) => y2 + y, 2, [[0, 0, 1], [1, 0, 2]]],
  ["y'' - 3y' + 2y = 0, y(0) = 1, y'(0) = 0", (x, y, y1, y2) => y2 - 3 * y1 + 2 * y, 2, [[0, 0, 1], [1, 0, 0]]],
  ["y'' + 2y' + 5y = 0, y(0) = 0, y'(0) = 1", (x, y, y1, y2) => y2 + 2 * y1 + 5 * y, 2, [[0, 0, 0], [1, 0, 1]]],
  ["y'' + y = x, y(0) = 0, y'(0) = 0", (x, y, y1, y2) => y2 + y - x, 2, [[0, 0, 0], [1, 0, 0]]],
  ["y'' - y = e^x, y(0) = 1, y'(0) = 0", (x, y, y1, y2) => y2 - y - Math.exp(x), 2, [[0, 0, 1], [1, 0, 0]]],
  ["x^2*y'' - 2*x*y' + 2*y = 0, y(1) = 1, y'(1) = 0", (x, y, y1, y2) => x * x * y2 - 2 * x * y1 + 2 * y, 2, [[0, 1, 1], [1, 1, 0]]],
];

let bad = 0, total = 0;
const fail = (input, why, text) => { bad++; console.log('FAIL ' + input + '\n   ' + why + '\n   got ' + text.split('\n').slice(0, 6).join(' | ')); };
async function check(input, resid, order, ics) {
  total++;
  const r = await call({ equation: input });
  const text = r.result ?? 'ERROR ' + r.error;
  const why = verifyODE(text, resid, order, ics);
  if (why) fail(input, why, text);
}
for (const [i, r, o] of CASES) await check(i, r, o, null);
for (const [i, r, o, ics] of IC_CASES) await check(i, r, o, ics);
// systems
const SYS = [
  ["x' = 3x + y; y' = x + 3y", [(x, y, x1, y1) => x1 - (3 * x + y), (x, y, x1, y1) => y1 - (x + 3 * y)], null],
  ["x' = x - 2y; y' = x + y; x(0) = 1, y(0) = 0", [(x, y, x1, y1) => x1 - (x - 2 * y), (x, y, x1, y1) => y1 - (x + y)], [[0, 0, 1], [1, 0, 0]]],
  ["x' = 3x - y; y' = x + y; x(0) = 1, y(0) = 2", [(x, y, x1, y1) => x1 - (3 * x - y), (x, y, x1, y1) => y1 - (x + y)], [[0, 0, 1], [1, 0, 2]]],
  ["x' = y; y' = -x", [(x, y, x1, y1) => x1 - y, (x, y, x1, y1) => y1 + x], null],
  ["x' = 2x + y; y' = 2y", [(x, y, x1, y1) => x1 - (2 * x + y), (x, y, x1, y1) => y1 - 2 * y], null],
  ["x' = 4x - 2y; y' = x + y; x(0) = 2, y(0) = 1", [(x, y, x1, y1) => x1 - (4 * x - 2 * y), (x, y, x1, y1) => y1 - (x + y)], [[0, 0, 2], [1, 0, 1]]],
  ["x' = -x + 2y; y' = -2x - y", [(x, y, x1, y1) => x1 - (-x + 2 * y), (x, y, x1, y1) => y1 - (-2 * x - y)], null],
  ["x' = 2x + y; y' = 2y; x(0) = 1, y(0) = 3", [(x, y, x1, y1) => x1 - (2 * x + y), (x, y, x1, y1) => y1 - 2 * y], [[0, 0, 1], [1, 0, 3]]],
  ["x' = 3x - y; y' = x + y", [(x, y, x1, y1) => x1 - (3 * x - y), (x, y, x1, y1) => y1 - (x + y)], null],
  ["x' = 5x + 3y; y' = -3x - y", [(x, y, x1, y1) => x1 - (5 * x + 3 * y), (x, y, x1, y1) => y1 - (-3 * x - y)], null],
  ["x' = x + 2y; y' = 2x + y; x(0) = 3, y(0) = 1", [(x, y, x1, y1) => x1 - (x + 2 * y), (x, y, x1, y1) => y1 - (2 * x + y)], [[0, 0, 3], [1, 0, 1]]],
  ["x' = y; y' = -4x; x(0) = 1, y(0) = 0", [(x, y, x1, y1) => x1 - y, (x, y, x1, y1) => y1 + 4 * x], [[0, 0, 1], [1, 0, 0]]],
];
for (const [input, [r1, r2], ics] of SYS) {
  total++;
  const res = await call({ equation: input });
  const text = res.result ?? 'ERROR ' + res.error;
  const mx = /x\(t\) = (.*)/.exec(text), my = /y\(t\) = (.*)/.exec(text);
  let ok = false, why = 'no solution lines';
  if (mx && my) {
    try {
      const fx0 = compile(mx[1]), fy0 = compile(my[1]);
      ok = true; why = '';
      const consts = ics ? [[0, 0, 0]] : [[0.7, -1.3, 0], [-0.5, 0.9, 0]];
      for (const [c1, c2] of consts) {
        const fx = (t) => fx0({ t, C1: c1, C2: c2, C3: 0 }), fy = (t) => fy0({ t, C1: c1, C2: c2, C3: 0 });
        for (const t of [0.2, 0.7, 1.4]) { const v1 = r1(fx(t), fy(t), D(fx, t, 1, 1e-4), D(fy, t, 1, 1e-4)), v2 = r2(fx(t), fy(t), D(fx, t, 1, 1e-4), D(fy, t, 1, 1e-4)); if (Math.abs(v1) > 5e-4 * (1 + Math.abs(fx(t))) || Math.abs(v2) > 5e-4 * (1 + Math.abs(fy(t)))) { ok = false; why = 'residual ' + v1 + ', ' + v2; } }
      }
      if (ics) { const fx = (t) => fx0({ t, C1: 0, C2: 0, C3: 0 }), fy = (t) => fy0({ t, C1: 0, C2: 0, C3: 0 }); if (Math.abs(fx(0) - ics[0][2]) > 1e-6 || Math.abs(fy(0) - ics[1][2]) > 1e-6) { ok = false; why = 'initial conditions'; } }
    } catch (e) { ok = false; why = 'cannot evaluate: ' + e.message; }
  }
  if (!ok) fail(input, why, text);
}
console.log(`${total - bad}/${total} ODE answers verified by substitution`);
process.exit(bad ? 1 : 0);
