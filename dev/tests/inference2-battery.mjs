// Regression inference and rank / exact tests against scipy.stats.
import { spawnSync } from 'node:child_process';
import { load } from './harness.mjs';
const call = load(process.argv[2]);
const PY = process.env.PY || 'python3';
const r = spawnSync(PY, ['gen_inference2.py', process.argv[3] || '1'], { encoding: 'utf8', maxBuffer: 1 << 28 });
if (r.status) { console.log(r.stderr); process.exit(1); }
const cases = JSON.parse(r.stdout);
let bad = 0;
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * (1 + Math.abs(b));
const num = (s) => Number(s.replace('−', '-'));
for (const c of cases) {
  const res = await call({ equation: c.cmd });
  const fail = (why) => { bad++; console.log('FAIL ' + c.cmd.slice(0, 150) + '\n   ' + why + '\n   ' + String(res.result ?? res.error).split('\n').slice(0, 6).join(' | ').slice(0, 500)); };
  if (res.error !== undefined) { fail('error: ' + res.error); continue; }
  const t = res.result;
  const pick = (rx, label) => { const m = rx.exec(t); if (!m) { fail('cannot read ' + label); return null; } return m.slice(1).map(num); };
  const chk = (got, want, label, tol) => { if (got === null) return; if (!near(got, want, tol)) fail(label + ' ' + got + ' vs ' + want); };
  if (c.kind === 'reginf') {
    const sl = pick(/slope: b = (-?[\d.e-]+),  SE = ([\d.e-]+),  t = (-?[\d.e-]+) \(df = \d+\),  p-value \(two-tailed\) = ([\d.e-]+)/, 'slope');
    if (sl) { chk(sl[0], c.slope, 'slope'); chk(sl[1], c.seb, 'SE(b)'); chk(sl[2], c.tb, 't'); chk(sl[3], c.pb, 'p(b)', 1e-5); }
    const ci = pick(/confidence interval for the slope: \((-?[\d.e-]+), (-?[\d.e-]+)\)/, 'CI slope');
    if (ci) { chk(ci[0], c.cib[0], 'CI lo'); chk(ci[1], c.cib[1], 'CI hi'); }
    const ic = pick(/intercept: a = (-?[\d.e-]+),  SE = ([\d.e-]+),  t = (-?[\d.e-]+),  p-value = ([\d.e-]+);  [\d.]+% CI \((-?[\d.e-]+), (-?[\d.e-]+)\)/, 'intercept');
    if (ic) { chk(ic[0], c.a, 'a'); chk(ic[1], c.sea, 'SE(a)'); chk(ic[3], c.pa, 'p(a)', 1e-5); chk(ic[4], c.cia[0], 'CI a lo'); chk(ic[5], c.cia[1], 'CI a hi'); }
    const rr = pick(/r² = ([\d.e-]+),.*residual standard error s = ([\d.e-]+)/, 'r2');
    if (rr) { chk(rr[0], c.r2, 'r2'); chk(rr[1], c.s, 's'); }
    const pr = pick(/ŷ = (-?[\d.e-]+);.*mean response \((-?[\d.e-]+), (-?[\d.e-]+)\);.*new observation \((-?[\d.e-]+), (-?[\d.e-]+)\)/, 'prediction');
    if (pr) { chk(pr[0], c.yh, 'yhat'); chk(pr[1], c.cim[0], 'CIm lo'); chk(pr[2], c.cim[1], 'CIm hi'); chk(pr[3], c.pi[0], 'PI lo'); chk(pr[4], c.pi[1], 'PI hi'); }
  } else if (c.kind === 'mwu') {
    const u = pick(/U₁ = ([\d.]+) \(first sample\),  U₂ = ([\d.]+)/, 'U');
    if (u) { chk(u[0], c.U1, 'U1'); chk(u[1], c.U2, 'U2'); }
    const p = pick(/two-tailed ([\d.e-]+),  first sample larger \(right-tailed\) ([\d.e-]+),  first sample smaller \(left-tailed\) ([\d.e-]+)/, 'p');
    if (p) { chk(p[0], c.p2, 'p2', 1e-5); chk(p[1], c.pr, 'pright', 1e-5); chk(p[2], c.pl, 'pleft', 1e-5); }
    if (c.method === 'exact' ? !/exact distribution/.test(t) : !/normal approximation/.test(t)) fail('method ' + c.method);
  } else if (c.kind === 'wilcoxon') {
    const w = pick(/W⁺ = ([\d.]+),  W⁻ = ([\d.]+)/, 'W');
    if (w) { chk(w[0], c.wp, 'W+'); chk(w[1], c.wm, 'W-'); }
    const p = pick(/two-tailed ([\d.e-]+),  right-tailed \(median > 0\) ([\d.e-]+),  left-tailed \(median < 0\) ([\d.e-]+)/, 'p');
    if (p) { chk(p[0], c.p2, 'p2', 1e-5); chk(p[1], c.pr, 'pright', 1e-5); chk(p[2], c.pl, 'pleft', 1e-5); }
    if (c.method === 'exact' ? !/exact distribution/.test(t) : !/normal approximation/.test(t)) fail('method ' + c.method);
  } else if (c.kind === 'kruskal') {
    const h = pick(/H = ([\d.e-]+) \(df = (\d+)\)\s+p-value = ([\d.e-]+)/, 'H');
    if (h) { chk(h[0], c.H, 'H'); chk(h[1], c.df, 'df'); chk(h[2], c.p, 'p', 1e-5); }
  } else if (c.kind === 'sign') {
    const s = pick(/(\d+) positive and (\d+) negative/, 'counts');
    if (s) { chk(s[0], c.pos, 'pos'); chk(s[1], c.neg, 'neg'); }
    const p = pick(/two-tailed ([\d.e-]+),  right-tailed ([\d.e-]+),  left-tailed ([\d.e-]+)/, 'p');
    if (p) { chk(p[0], c.p2, 'p2', 1e-5); chk(p[1], c.pr, 'pright', 1e-5); chk(p[2], c.pl, 'pleft', 1e-5); }
  } else if (c.kind === 'fisher') {
    const o = /odds ratio = (-?[\d.e-]+|∞|undefined)/.exec(t);
    if (!o) fail('odds');
    else if (c.inf ? o[1] !== '∞' : (c.odds === null ? o[1] !== 'undefined' && o[1] !== '0' : !near(num(o[1]), c.odds))) fail('odds ' + o[1] + ' vs ' + c.odds);
    const p = pick(/two-tailed ([\d.e-]+),  right-tailed \(a larger\) ([\d.e-]+),  left-tailed ([\d.e-]+)/, 'p');
    if (p) { chk(p[0], c.p2, 'p2', 1e-5); chk(p[1], c.pr, 'pright', 1e-5); chk(p[2], c.pl, 'pleft', 1e-5); }
  } else if (c.kind === 'mcnemar') {
    const m = pick(/χ² = ([\d.e-]+) \(df = 1.*p-value = ([\d.e-]+)/, 'chi');
    if (m) { chk(m[0], c.chi, 'chi'); chk(m[1], c.pchi, 'p', 1e-5); }
    const e = pick(/exact binomial p-value = ([\d.e-]+)/, 'exact');
    if (e) chk(e[0], c.pexact, 'exact', 1e-5);
  }
}
console.log(cases.length + ' inference checks, ' + bad + ' WRONG');
process.exit(bad ? 1 : 0);
