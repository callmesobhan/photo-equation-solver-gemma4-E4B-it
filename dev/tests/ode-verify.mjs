// Independent verification of printed ODE answers (shared by ode-battery.mjs and ode-fuzz.mjs).
// An explicit answer  y = ...  is substituted into the equation with numerical derivatives for several values of the
// arbitrary constants; an implicit answer  F(x, y) = C1  is checked by implicit differentiation.
import { compile, compileRelation } from './mathexpr.mjs';

export const D = (f, x, k, h) => {
  if (k === 0) return f(x);
  if (k === 1) return (f(x + h) - f(x - h)) / (2 * h);
  if (k === 2) return (f(x + h) - 2 * f(x) + f(x - h)) / (h * h);
  return (f(x + 2 * h) - 2 * f(x + h) + 2 * f(x - h) - f(x - 2 * h)) / (2 * h ** 3);
};
// derivatives by Richardson extrapolation at two step pairs; a point where they disagree is ill-conditioned and skipped
export function derivs(f, x, order) {
  const h = order >= 3 ? 8e-3 : 4e-3;
  const rich = (k, hh) => (4 * D(f, x, k, hh / 2) - D(f, x, k, hh)) / 3;
  const a = [0, 1, 2, 3].map((k) => (k <= order ? rich(k, h) : 0));
  const b = [0, 1, 2, 3].map((k) => (k <= order ? rich(k, h / 2) : 0));
  for (let k = 0; k <= order; k++) if (!isFinite(b[k]) || !(Math.abs(a[k] - b[k]) < 2e-5 * (1 + Math.abs(b[k])))) return null;
  return b;
}
export const answerLines = (text) => {
  const lines = text.split('\n');
  const i = lines.findIndex((l) => /^Answer:/.test(l));
  if (i < 0) return [];
  const out = [];
  const first = lines[i].replace(/^Answer:\s*/, '');
  if (first) out.push(first);
  for (let j = i + 1; j < lines.length && /^\s+\S/.test(lines[j]); j++) out.push(lines[j].trim());
  return out;
};
const CONSTS = [[0.7, -1.3, 0.4], [-0.5, 0.9, 1.1], [-2.0, 0.3, -0.8], [0.15, 0.6, 0.2], [3.5, 1.7, 2.2], [9.5, -2.7, 4.0]];
const XS = [0.6, 0.9, 1.1, 1.4, 1.7, 2.3];
/** resid(x, y, y', y'', y''') -> number.  Returns null when the answer checks out, else a reason. */
export function verifyODE(text, resid, order, ics) {
  const lines = answerLines(text);
  if (!lines.length) return 'no answer';
  const consts = ics ? [[0, 0, 0]] : CONSTS;
  for (const line of lines) {
    const explicit = /^y\s*=/.test(line);
    try {
      if (explicit) {
        const f0 = compile(line.replace(/^y\s*=/, ''));
        let verified = 0;
        for (const [c1, c2, c3] of consts) {
          const f = (x) => f0({ x, C1: c1, C2: c2, C3: c3 });
          for (const x of XS) {
            const vals = derivs(f, x, order);
            if (!vals) continue;
            const v = resid(x, ...vals);
            if (!isFinite(v)) continue; // overflow / log of 0: not checkable at this point
            const scale = 1 + Math.abs(vals[0]) + Math.abs(vals[order]);
            if (!(Math.abs(v) < 5e-4 * scale)) return 'residual ' + v + ' at x=' + x + ' (C=' + c1 + ',' + c2 + ') for ' + line;
            verified++;
          }
        }
        if (verified < 4) return 'could not verify "' + line + '" at enough points';
        if (ics) for (const [k, p, val] of ics) {
          const f = (x) => f0({ x, C1: 0, C2: 0, C3: 0 });
          const got = D(f, p, k, 1e-3);
          if (!(Math.abs(got - val) < 5e-4 * (1 + Math.abs(val)))) return 'initial condition y^(' + k + ')(' + p + ') = ' + got + ' != ' + val;
        }
      } else {
        if (order !== 1 || ics) return 'implicit answer where an explicit one is expected: ' + line;
        const G = compileRelation(line);
        let verified = 0;
        for (const [x0, y0] of [[0.8, 0.6], [1.3, 1.9], [0.5, 1.2], [2.0, 0.7], [1.1, 0.35], [0.7, 2.4]]) {
          const g0 = G({ x: x0, y: y0, C1: 0 }), g1 = G({ x: x0, y: y0, C1: 1 }), g2 = G({ x: x0, y: y0, C1: 2 });
          if (![g0, g1, g2].every(isFinite) || Math.abs(g2 - 2 * g1 + g0) > 1e-9 * (1 + Math.abs(g0))) continue;
          const C1 = -g0 / (g1 - g0);
          if (!isFinite(C1)) continue;
          const h = 1e-5;
          const Gx = (G({ x: x0 + h, y: y0, C1 }) - G({ x: x0 - h, y: y0, C1 })) / (2 * h);
          const Gy = (G({ x: x0, y: y0 + h, C1 }) - G({ x: x0, y: y0 - h, C1 })) / (2 * h);
          if (!isFinite(Gx) || !isFinite(Gy) || Math.abs(Gy) < 1e-6) continue;
          const slope = -Gx / Gy;
          const r0 = resid(x0, y0, 0), r1 = resid(x0, y0, 1);
          const want = -r0 / (r1 - r0);
          if (!isFinite(want)) continue;
          if (!(Math.abs(slope - want) < 1e-4 * (1 + Math.abs(want)))) return 'implicit slope ' + slope + ' != ' + want + ' at (' + x0 + ', ' + y0 + ') for ' + line;
          verified++;
        }
        if (verified < 3) return 'could not verify implicit answer "' + line + '"';
      }
    } catch (e) { return 'cannot evaluate "' + line + '": ' + e.message; }
  }
  return null;
}
