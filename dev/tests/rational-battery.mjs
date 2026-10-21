// Random rational functions with NON-monic linear and quadratic factors, repeated factors and improper fractions.
//   apart(f)          the printed sum of fractions is evaluated at random points and compared with f
//   integrate(f, x)   the printed antiderivative is differentiated numerically and compared with f
//   ilaplace(F, s)    the printed f(t) is Laplace-transformed numerically and compared with F(s)
// Everything is checked by the independent evaluator in mathexpr.mjs.
//   usage: node rational-battery.mjs <index.html> [seed] [count]
import { load } from './harness.mjs';
import { compile } from './mathexpr.mjs';

const call = load(process.argv[2]);
let seed = Number(process.argv[3] || 1) >>> 0;
const COUNT = Number(process.argv[4] || 120);
function rnd() {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const nz = (a, b) => { let v = 0; while (!v) v = ri(a, b); return v; };
const term = (c, k, v) => (c === 0 ? '' : (c < 0 ? ' - ' : ' + ') + (Math.abs(c) === 1 && k > 0 ? '' : Math.abs(c)) + (k === 0 ? '' : v + (k > 1 ? '^' + k : '')));
const poly = (cs, v) => { // cs low -> high
  let s = '';
  for (let k = cs.length - 1; k >= 0; k--) s += term(cs[k], k, v);
  return s.replace(/^ \+ /, '').replace(/^ - /, '-') || '0';
};
const mulp = (p, q) => { const r = new Array(p.length + q.length - 1).fill(0); p.forEach((a, i) => q.forEach((b, j) => { r[i + j] += a * b; })); return r; };

function randomDenominator(v) {
  const factors = [];
  const n = ri(1, 3);
  for (let i = 0; i < n; i++) {
    if (rnd() < 0.6) factors.push({ p: [nz(-3, 3), nz(-4, 4)], mult: rnd() < 0.2 ? 2 : 1 });
    else {
      const a = nz(1, 4), b = ri(-3, 3);
      let c = ri(1, 5);
      while (b * b - 4 * a * c >= 0 || (a === 1 && false)) c++;
      factors.push({ p: [c, b, a], mult: rnd() < 0.15 ? 2 : 1 });
    }
  }
  let den = [nz(1, 3)];
  let text = '';
  factors.forEach((f) => {
    for (let m = 0; m < f.mult; m++) den = mulp(den, f.p);
    text += '(' + poly(f.p, v) + ')' + (f.mult > 1 ? '^' + f.mult : '');
  });
  const lead = den.length ? 1 : 1;
  return { den, text: (den[0] !== 1 && false ? '' : '') + text, lead };
}
let total = 0, bad = 0, declined = 0;
const report = (kind, input, why, got) => { bad++; console.log('FAIL [' + kind + '] ' + input + '\n   ' + why + '\n   got ' + String(got).split('\n').slice(0, 4).join(' | ')); };
const close = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * (1 + Math.abs(a) + Math.abs(b));

for (let i = 0; i < COUNT; i++) {
  const v = 'x';
  const { den, text } = randomDenominator(v);
  const degD = den.length - 1;
  const degN = rnd() < 0.15 ? degD + ri(0, 1) : ri(0, degD - 1);
  const num = Array.from({ length: degN + 1 }, () => ri(-4, 4));
  if (num.every((c) => c === 0)) num[0] = 1;
  const lead = nz(1, 3);
  const f = '(' + poly(num, v) + ')/(' + (lead === 1 ? '' : lead + '*') + text + ')';
  const fn = compile(f);
  // ---- apart
  {
    total++;
    const r = await call({ equation: 'apart(' + f + ')' });
    if (r.error !== undefined) { declined++; if (process.argv.includes('-v')) console.log('declined [apart] ' + f + '  ' + r.error.slice(0, 80)); }
    else {
      const m = /^Answer: (.*)$/m.exec(r.result);
      try {
        const g = compile(m[1]);
        let okAll = true;
        for (const x of [0.37, 1.91, -2.3, 3.7, -0.83]) {
          const a = fn({ x }), b = g({ x });
          if (isFinite(a) && !close(a, b, 1e-7)) okAll = false;
        }
        if (!okAll) report('apart', f, 'the parts do not add up to the fraction', r.result);
      } catch (e) { report('apart', f, 'cannot read the answer: ' + e.message, r.result); }
    }
  }
  // ---- integrate
  {
    total++;
    const r = await call({ equation: 'integrate(' + f + ', x)' });
    if (r.error !== undefined) { declined++; if (process.argv.includes('-v')) console.log('declined [integrate] ' + f + '  ' + r.error.slice(0, 80)); }
    else {
      const m = /^Answer: (.*) \+ C$/m.exec(r.result);
      try {
        const F = compile(m[1].replace(/\barctan\b/g, 'atan'));
        let okAll = true, checked = 0;
        for (const x of [0.37, 1.91, -2.3, 3.7, -0.83, 5.1]) {
          const h = 1e-4;
          const d = (F({ x: x + h }) - F({ x: x - h })) / (2 * h);
          const a = fn({ x });
          if (!isFinite(d) || !isFinite(a)) continue;
          checked++;
          if (!close(a, d, 1e-4)) okAll = false;
        }
        if (!okAll || checked < 2) report('integrate', f, okAll ? 'could not check' : 'F\' differs from the integrand', r.result);
      } catch (e) { report('integrate', f, 'cannot read the answer: ' + e.message, r.result); }
    }
  }
  // ---- ilaplace (proper fractions only)
  if (degN < degD) {
    total++;
    const s = 's';
    const F = f.replace(/x/g, s);
    const r = await call({ equation: 'ilaplace(' + F + ', s)' });
    if (r.error !== undefined) { declined++; if (process.argv.includes('-v')) console.log('declined [ilaplace] ' + F + '  ' + r.error.slice(0, 80)); }
    else {
      const m = /= (.*)$/m.exec(r.result.split('\n').find((l) => /^Answer:/.test(l)));
      try {
        const ft = compile(m[1]);
        const Fn = compile(F);
        const s0 = 7.3 + rnd() * 3;
        // numerical Laplace transform of f(t) on [0, T] (Simpson), T large enough that e^(-s0 T) is negligible
        const T = 30 / s0, n = 6000, hh = T / n;
        let sum = 0;
        for (let k = 0; k <= n; k++) {
          const t = k * hh;
          const w = k === 0 || k === n ? 1 : k % 2 ? 4 : 2;
          sum += w * ft({ t, x: t }) * Math.exp(-s0 * t);
        }
        sum *= hh / 3;
        const want = Fn({ s: s0 });
        if (isFinite(want) && !close(sum, want, 2e-4)) report('ilaplace', F, 'L{f} = ' + sum + ' but F(' + s0.toFixed(2) + ') = ' + want, r.result);
      } catch (e) { report('ilaplace', F, 'cannot read the answer: ' + e.message, r.result); }
    }
  }
}
console.log(total + ' checks on random rational functions (' + declined + ' politely declined), ' + (total - declined - bad) + ' verified, ' + bad + ' WRONG');
process.exit(bad ? 1 : 0);
