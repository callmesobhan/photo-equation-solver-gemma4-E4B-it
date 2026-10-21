// Calculus battery: coverage of integration vs sympy, definite integrals vs scipy, limits and sums vs sympy.
import { spawnSync } from 'node:child_process';
import { load } from './harness.mjs';
const call = load(process.argv[2]);
const PY = process.env.PY || 'python3';

const INTEGRALS = `x^3|(2x+1)^5|1/x|1/(2x+3)|sqrt(x)|x^(2/3)|1/sqrt(x)|3x^2+2x+1|(x+1)(x+2)|x^2*(x+1)^3|(x^2+1)^2
e^x|e^(2x)|e^(-x)|2^x|3^(2x)|x*e^x|x^2*e^x|x^3*e^x|x*e^(2x)|x*e^(x^2)|x^2*e^(x^3)|e^(-x^2)|x*e^(-x^2)|e^(sin(x))*cos(x)|e^(3x+1)
ln(x)|x*ln(x)|x^2*ln(x)|ln(x)^2|ln(x)/x|1/(x*ln(x))|ln(2x+1)|x*ln(x+1)|ln(x^2+1)|sqrt(x)*ln(x)
sin(x)|cos(x)|tan(x)|cot(x)|sec(x)|csc(x)|sin(2x)|cos(3x+1)|sin(x)^2|cos(x)^2|sin(x)^3|cos(x)^3|sin(x)^4|sin(x)^2*cos(x)^2|sin(x)*cos(x)|sin(x)^2*cos(x)|sin(x)*cos(x)^3
tan(x)^2|tan(x)^3|sec(x)^2|sec(x)^3|sec(x)*tan(x)|csc(x)^2|sin(2x)*cos(3x)|sin(x)*sin(3x)|cos(x)*cos(2x)|x*sin(x)|x*cos(x)|x^2*sin(x)|x^2*cos(x)|x*sin(2x)|e^x*sin(x)|e^(2x)*cos(3x)|tan(x)^4|cot(x)^2|sin(x)/cos(x)^2|cos(x)/sin(x)^2
atan(x)|asin(x)|acos(x)|x*atan(x)|x*asin(x)|1/(1+x^2)|1/sqrt(1-x^2)|1/(4+x^2)|1/sqrt(4-x^2)|x/sqrt(1-x^2)|1/(x^2+2x+5)|sinh(x)|cosh(x)|tanh(x)|x*cosh(x)
1/(x^2-1)|1/(x^2-4)|1/(x*(x+1))|(x+1)/(x^2+x+1)|x/(x^2+1)|x^2/(x^2+1)|1/(x^2+x+1)|(3x+2)/(x^2-x-2)|1/(x^3+x)|(x^3+1)/(x^2-1)|1/(x^2*(x+1))|1/(x^2+1)^2|x/(x^2+1)^2|1/((x-1)^2*(x+2))|x^4/(x^2+1)|(2x+3)/(x^2+4x+8)
sqrt(x^2+1)|sqrt(1-x^2)|sqrt(x^2+4x+5)|1/sqrt(x^2+1)|1/sqrt(x^2-1)|x*sqrt(x^2+1)|sqrt(4-x^2)|(x+1)/sqrt(x^2+2x+5)|x/sqrt(x^2+4)|1/(x^2+1)^(3/2)|x^2/sqrt(1-x^2)
sin(x)*e^(cos(x))|x*cos(x^2)|e^x/(1+e^x)|e^x/(1+e^(2x))|cos(sqrt(x))/sqrt(x)|1/(1+sqrt(x))|sqrt(x)*(1+x)|abs(x)|x*abs(x)|x*sqrt(x+1)|x/sqrt(x+1)|1/(x*sqrt(ln(x)))|ln(x)^3|x*ln(x)^2|(ln(x))/(x^2)
sin(2x)/cos(x)|sin(3x)/sin(x)|cos(2x)*cos(x)^2|e^(-2x)*sinh(x)|sinh(x)*cosh(x)|x*sinh(x)|1/cosh(x)|sinh(x)^2|e^x*cosh(x)|1/(x^2-2)|(x+1)/(x^2-2x-1)|1/(x^2+x-1)|(3x+1)/(x^2+x-1)|1/(x^2-3)^2|x/(x^2-2)^2|(x+1)/(1-2x-x^2)`.split(/[\n|]/).map((s) => s.trim()).filter(Boolean);

const DEFINITE = [
  ['x^2', '0', '1'], ['sin(x)', '0', 'pi'], ['e^x', '0', '1'], ['1/x', '1', 'e'], ['e^(-x)', '0', 'oo'], ['x*e^(-x)', '0', 'oo'], ['e^(-x^2)', '-oo', 'oo'],
  ['1/sqrt(x)', '0', '1'], ['ln(x)', '0', '1'], ['1/(1+x^2)', '0', 'oo'], ['abs(x)', '-1', '1'], ['abs(x-1)', '0', '2'], ['sin(x)^2', '0', 'pi/2'], ['1/x^2', '1', 'oo'],
  ['x*ln(x)', '0', '1'], ['atan(x)', '0', '1'], ['tan(x)', '0', 'pi/4'], ['sqrt(1-x^2)', '0', '1'], ['x*sin(x)', '0', 'pi'], ['x*e^x', '0', '1'], ['cos(x)^3', '0', 'pi/2'],
  ['1/(x^2+1)', '-oo', 'oo'], ['x^2*e^(-x)', '0', 'oo'], ['ln(x)/x', '1', 'e'], ['sin(x)*cos(x)', '0', 'pi/2'], ['1/sqrt(1-x^2)', '-1', '1'], ['x/(x^2+1)', '0', '1'],
  ['e^(-x)*sin(x)', '0', 'oo'], ['1/(x^2-1)', '2', '3'], ['sqrt(x)', '0', '4'], ['x^3-x', '-1', '2'], ['sin(x)/x', '0.001', '3'], ['exp(-abs(x))', '-oo', 'oo'],
  ['1/(1+x^4)', '0', 'oo'], ['x^2*sin(x)', '0', 'pi'], ['ln(1+x)', '0', '1'], ['1/(x*ln(x)^2)', '2', 'oo'], ['cos(x)^2', '0', '2*pi'], ['abs(sin(x))', '0', '2*pi'],
  ['1/x', '0', '1'], ['1/x^2', '-1', '1'], ['1/x', '1', 'oo'], ['1/(4*x^2+1)', '0', 'oo'], ['1/(2*x^2+2*x+1)', '-oo', 'oo'], ['x/(2*x^2+3*x+1)', '1', '3'], ['1/(4*x^2-1)', '1', '3'], ['1/(x^2-2)', '2', '5'], ['(3*x+1)/(x^2+x-1)', '1', '2'], ['1/(x^2-2)', '0', '2'], ['x/(1-x-x^2)', '0', '1'], ['1/(x^2-2)^2', '0', '2'],
];
const LIMITS = [
  ['sin(x)/x', '0', '+-'], ['(1-cos(x))/x^2', '0', '+-'], ['(e^x-1)/x', '0', '+-'], ['ln(1+x)/x', '0', '+-'], ['x*ln(x)', '0', '+'], ['(1+1/x)^x', 'oo', '+'],
  ['(1+x)^(1/x)', '0', '+'], ['x^x', '0', '+'], ['(x^2-1)/(x-1)', '1', '+-'], ['(sqrt(x+1)-1)/x', '0', '+-'], ['sqrt(x^2+x)-x', 'oo', '+'], ['(x^2+1)/(2*x^2-3)', 'oo', '+'],
  ['x*e^(-x)', 'oo', '+'], ['ln(x)/x', 'oo', '+'], ['e^x/x^2', 'oo', '+'], ['tan(x)/x', '0', '+-'], ['sin(3x)/sin(5x)', '0', '+-'], ['(x^3-8)/(x-2)', '2', '+-'], ['1/x', '0', '+'], ['1/x', '0', '-'],
  ['atan(x)', 'oo', '+'], ['(1-cos(x))/x', '0', '+-'], ['x*sin(1/x)', '0', '+'], ['(2^x-1)/x', '0', '+-'], ['x^(1/x)', 'oo', '+'], ['(1+2/x)^(3x)', 'oo', '+'], ['(cos(x))^(1/x^2)', '0', '+'],
  ['(x^2-4)/(x^2-5x+6)', '2', '+-'], ['(sin(x)-x)/x^3', '0', '+-'], ['(e^x-1-x)/x^2', '0', '+-'], ['x^2*e^(-x)', 'oo', '+'], ['(3x^2+2x)/(x^2-1)', 'oo', '+'], ['(sqrt(x)-2)/(x-4)', '4', '+-'],
  ['ln(x)', '0', '+'], ['e^(-1/x^2)', '0', '+-'], ['(x-sin(x))/x^3', '0', '+-'], ['x/abs(x)', '0', '+-'], ['1/(x-1)', '1', '+-'], ['(1+1/x)^(2*x)', 'oo', '+'], ['tan(x)', 'pi/2', '-'],
  ['(e^(2x)-1)/(e^x-1)', '0', '+-'], ['x^2/(e^x)', 'oo', '+'], ['sqrt(x^2+1)/x', 'oo', '+'], ['sqrt(x^2+1)/x', '-oo', '+'], ['(1-x)/(1-sqrt(x))', '1', '+-'],
];
const SUMS = [
  ['k', '1', '100'], ['k^2', '1', '20'], ['k^3', '1', '10'], ['1/(k*(k+1))', '1', 'oo'], ['1/k^2', '1', 'oo'], ['1/k^4', '1', 'oo'], ['(1/2)^k', '0', 'oo'], ['2^k', '1', '10'],
  ['k*2^k', '1', '8'], ['1/(k^2-1)', '2', 'oo'], ['1/(4*k^2-1)', '1', 'oo'], ['(1/3)^k', '1', 'oo'], ['k^2+k', '1', '30'], ['1/(k*(k+2))', '1', 'oo'], ['1/(k*(k+1)*(k+2))', '1', 'oo'],
  ['3*(2/3)^k', '0', 'oo'], ['1/((2*k-1)*(2*k+1))', '1', 'oo'], ['1/((3*k-1)*(3*k+2))', '1', 'oo'], ['1/(2*k+1)^2', '0', 'oo'], ['1/(k*(2*k+1))', '1', '30'], ['1/(4*k^2-1)', '1', '50'], ['1/((2*k+1)*(2*k+3))', '0', 'oo'], ['1/(9*k^2-1)', '1', '30'], ['k/((2*k+1)*(2*k+3))', '1', '30'], ['1/(2^k)', '1', '20'], ['(2k+1)', '0', '50'], ['k*(k+1)', '1', '12'], ['1/k', '1', 'oo'], ['2^(-k)*k', '1', 'oo'], ['1/k^3', '1', 'oo'],
];

const job = {
  integrals: INTEGRALS,
  definite: DEFINITE,
  limits: LIMITS.flatMap(([s, pt, d]) => (d === '+-' ? [[s, pt, '+-']] : [[s, pt, d]])),
  sums: SUMS,
};
const oracle = JSON.parse(spawnSync(PY, ['calc_oracle.py'], { input: JSON.stringify(job), encoding: 'utf8', maxBuffer: 1 << 28 }).stdout);

const text = async (eq) => { const r = await call({ equation: eq }); return r.result ?? 'ERROR ' + r.error; };
const num = (t) => {
  const line = (/^Answer: (.*)$/m.exec(t) || [])[1] || '';
  if (/diverge/i.test(line)) return 'div';
  const a = /[≈=] (-?[0-9.]+(?:e[+-]?\d+)?)\)?$/.exec(line) || /\(≈ (-?[0-9.]+(?:e[+-]?\d+)?)\)/.exec(line) || /\(= (-?[0-9.]+(?:e[+-]?\d+)?)\)/.exec(line) || /^≈ (-?[0-9.]+(?:e[+-]?\d+)?)/.exec(line);
  if (a) return parseFloat(a[1]);
  const b = /^(-?\d+)\/(\d+)$/.exec(line.trim());
  if (b) return Number(b[1]) / Number(b[2]);
  const c = /^-?[0-9.]+(?:e[+-]?\d+)?$/.exec(line.trim());
  if (c) return parseFloat(line);
  return null;
};
let bad = 0;
const say = (s) => { bad++; console.log(s); };

console.log('== A. indefinite integrals (' + INTEGRALS.length + ')');
let solved = 0, theirs = 0, gaps = [];
for (let i = 0; i < INTEGRALS.length; i++) {
  const t = await text('integrate(' + INTEGRALS[i] + ', x)');
  const ok = /^Answer: .* \+ C/m.test(t);
  if (ok) solved++;
  if (oracle.integrals[i].sympy_solved) { theirs++; if (!ok) gaps.push(INTEGRALS[i]); }
}
console.log(`solved ${solved}/${INTEGRALS.length}; sympy solved ${theirs}; gaps (sympy yes, here no): ${gaps.length ? gaps.join('   ') : 'none'}`);

console.log('\n== B. definite integrals vs scipy');
let okD = 0;
for (let i = 0; i < DEFINITE.length; i++) {
  const [s, a, b] = DEFINITE[i];
  const t = await text(`integrate(${s}, x, ${a}, ${b})`);
  // scipy's adaptive quadrature is inaccurate for this slowly decaying tail; the exact value is 1/ln(2)
  const want = s === '1/(x*ln(x)^2)' && a === '2' && b === 'oo' ? 1 / Math.log(2) : oracle.definite[i].value;
  const got = num(t);
  const good = want === null ? (got === 'div' || got === null) : (typeof got === 'number' && Math.abs(got - want) <= 1e-6 * (1 + Math.abs(want)));
  if (good) okD++; else say(`✗ ∫ ${a}..${b} ${s}:  got ${(/^Answer: (.*)$/m.exec(t) || [, t.slice(0, 80)])[1]}  scipy ${want}`);
}
console.log(`${okD}/${DEFINITE.length} agree`);

console.log('\n== C. limits vs sympy');
let okL = 0, total = 0;
for (let i = 0; i < job.limits.length; i++) {
  const [s, pt, d] = job.limits[i];
  const want = oracle.limits[i].value;
  if (want === 'unknown') continue;
  total++;
  const dirArg = d === '+' ? ', 1' : d === '-' ? ', -1' : '';
  const t = await text(`limit(${s}, x, ${pt}${dirArg})`);
  const line = (/^Answer: (.*)$/m.exec(t) || [])[1] || t.slice(0, 60);
  let got;
  if (/^∞|^inf/.test(line)) got = 'inf'; else if (/^-∞/.test(line)) got = '-inf'; else if (/does not exist/.test(line)) got = 'dne'; else got = num(t);
  const good = typeof want === 'number' ? (typeof got === 'number' && Math.abs(got - want) <= 1e-6 * (1 + Math.abs(want))) : got === want;
  if (good) okL++; else say(`✗ lim ${s} → ${pt}${d === '+-' ? '' : d}:  got ${line}  sympy ${want}`);
}
console.log(`${okL}/${total} agree`);

console.log('\n== D. sums vs sympy');
let okS = 0, totS = 0;
for (let i = 0; i < SUMS.length; i++) {
  const [s, a, b] = SUMS[i];
  const want = oracle.sums[i].value;
  if (want === 'unknown') continue;
  totS++;
  const t = await text(`sum(${s}, k, ${a}, ${b})`);
  const line = (/^Answer: (.*)$/m.exec(t) || [])[1] || t.slice(0, 60);
  const got = /diverge/.test(line) ? 'inf' : num(t);
  const good = typeof want === 'number' ? (typeof got === 'number' && Math.abs(got - want) <= 1e-6 * (1 + Math.abs(want))) : got === want;
  if (good) okS++; else say(`✗ Σ ${a}..${b} ${s}:  got ${line}  sympy ${want}`);
}
console.log(`${okS}/${totS} agree`);
process.exit(bad ? 1 : 0);
