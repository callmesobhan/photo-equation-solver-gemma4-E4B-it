// ======================================================================
// 17. Numerical methods: Euler / Heun / midpoint / Runge-Kutta for y' = f(x, y), Riemann sums, trapezoid / midpoint /
//     Simpson rules with error bounds, bisection / secant / false position / fixed point, interpolation, splines,
//     least-squares polynomial fits, difference tables, numerical derivatives.
//     Steps are carried out in exact rational arithmetic while every number stays rational, else in doubles.
// ======================================================================
const NV_MAXBITS = 600;
const isQv = (v) => v instanceof Q;
const toNumV = (v) => (isQv(v) ? v.toNumber() : v);
const degradeV = (v) => (isQv(v) && bitLen(babs(v.n)) + bitLen(v.d) > NV_MAXBITS ? v.toNumber() : v);
const vAdd = (a, b) => degradeV(isQv(a) && isQv(b) ? a.add(b) : toNumV(a) + toNumV(b));
const vSub = (a, b) => degradeV(isQv(a) && isQv(b) ? a.sub(b) : toNumV(a) - toNumV(b));
const vMul = (a, b) => degradeV(isQv(a) && isQv(b) ? a.mul(b) : toNumV(a) * toNumV(b));
const vDiv = (a, b) => {
  if ((isQv(b) && b.isZero()) || b === 0) throw new MathError('division by zero in the iteration');
  return degradeV(isQv(a) && isQv(b) ? a.div(b) : toNumV(a) / toNumV(b));
};
const vNum = (v) => toNumV(v);
/** A short text for a table cell. */
function vCell(v) {
  if (isQv(v) && v.isInt()) return v.toString();
  const x = vNum(v);
  return fmtNum(x);
}
/** "= p/q (= decimal)" or "≈ decimal" for an answer line (the sign is included). */
function vEq(v) {
  if (isQv(v)) {
    const t = v.toString();
    if (v.isInt()) return '= ' + t;
    if (t.length <= 24) return '= ' + t + ' (' + approxSym(v.toNumber()) + ' ' + fmtNum(v.toNumber()) + ')';
  }
  return '≈ ' + fmtNum(vNum(v));
}
/** f evaluated at the given variable values: exact when everything is rational and the result is a rational number. */
function nvValueAt(S, env) {
  const keys = Object.keys(env);
  if (keys.every((k) => isQv(env[k]))) {
    try {
      const r = simp(subsMany(S, new Map(keys.map((k) => [k, sN(env[k])]))));
      if (r.k === 'n') return r.q;
    } catch (e) {
      if (!(e instanceof MathError) && !(e instanceof NotAlgebraic)) throw e;
    }
  }
  const e2 = {};
  keys.forEach((k) => { e2[k] = vNum(env[k]); });
  const v = numS(S, e2);
  if (!isFinite(v)) throw new MathError('the function is not defined (or too large) at ' + keys.map((k) => k + ' = ' + vCell(env[k])).join(', '));
  return v;
}
/** A number argument: a rational when it is one (so decimals and fractions stay exact), else a double (pi, sqrt(2), ...). */
function valArg(node) {
  try {
    return constQ(node);
  } catch (e) {
    if (!(e instanceof MathError)) throw e;
    return numArg(node);
  }
}
function stepsBetween(a, b, h, what) {
  const span = vSub(b, a);
  const k = vDiv(span, h);
  const kn = vNum(k);
  const r = Math.round(kn);
  if (!isFinite(kn) || r < 1 || Math.abs(kn - r) > 1e-9) throw new MathError(what + ': (end − start)/h must be a whole number of steps (here ' + fmtNum(kn) + ')');
  if (r > 400) throw new MathError('at most 400 steps are supported');
  return r;
}
function listRows(rows, head, tail) {
  if (rows.length <= head + tail + 1) return rows;
  return rows.slice(0, head).concat(['…'], rows.slice(rows.length - tail));
}

// ---- Euler and Runge-Kutta ---------------------------------------------------------------------------------------------------------
const ODE_METHODS = {
  euler: { name: "Euler's method", formula: 'y_(n+1) = y_n + h·f(x_n, y_n)', order: 1 },
  heun: { name: "improved Euler (Heun's) method", formula: 'y_(n+1) = y_n + h/2·(f(x_n, y_n) + f(x_n + h, y_n + h·f(x_n, y_n)))', order: 2 },
  midpoint: { name: 'the midpoint method', formula: 'y_(n+1) = y_n + h·f(x_n + h/2, y_n + h/2·f(x_n, y_n))', order: 2 },
  rk4: { name: 'the classical Runge–Kutta method (RK4)', formula: 'k1 = f(x, y), k2 = f(x + h/2, y + h·k1/2), k3 = f(x + h/2, y + h·k2/2), k4 = f(x + h, y + h·k3);  y_(n+1) = y_n + h/6·(k1 + 2k2 + 2k3 + k4)', order: 4 },
};
function odeVariables(f) {
  const vs = Array.from(varsOfS(f));
  if (vs.length > 2) throw new MathError('f may contain only the independent variable and the unknown function (found ' + vs.sort().join(', ') + ')');
  let X = 'x';
  let Y = 'y';
  if (vs.includes('y')) {
    Y = 'y';
    X = vs.find((v) => v !== 'y') || 'x';
  } else if (vs.length === 2) {
    X = vs.includes('x') ? 'x' : vs.includes('t') ? 't' : vs[0];
    Y = vs.find((v) => v !== X);
  } else if (vs.length === 1) {
    X = vs[0];
  }
  return { X, Y };
}
function odeSolver(method) {
  return (n) => {
    needArgs(n, 5, 5, 'the right-hand side f(x, y) of y\' = f(x, y), x0, y0, the step h and the x to reach, e.g. ' + n.fn + '(x + y, 0, 1, 0.1, 1)');
    const f = fromAst(n.args[0]);
    const { X, Y } = odeVariables(f);
    const x0 = valArg(n.args[1]);
    const y0 = valArg(n.args[2]);
    const h = valArg(n.args[3]);
    const xe = valArg(n.args[4]);
    if (vNum(h) === 0) throw new MathError('the step h must not be 0');
    const steps = stepsBetween(x0, xe, h, n.fn);
    const F = (x, y) => nvValueAt(f, { [X]: x, [Y]: y });
    const two = Q1.add(Q1);
    const half = (v) => vDiv(v, isQv(x0) && isQv(h) ? two : 2);
    let x = x0;
    let y = y0;
    const rows = ['n    ' + X.padEnd(12) + Y + '_n'];
    rows.push('0    ' + vCell(x).padEnd(12) + vCell(y));
    for (let i = 1; i <= steps; i++) {
      let y1;
      if (method === 'euler') y1 = vAdd(y, vMul(h, F(x, y)));
      else if (method === 'heun') {
        const k1 = F(x, y);
        const k2 = F(vAdd(x, h), vAdd(y, vMul(h, k1)));
        y1 = vAdd(y, vMul(half(h), vAdd(k1, k2)));
      } else if (method === 'midpoint') {
        const k1 = F(x, y);
        y1 = vAdd(y, vMul(h, F(vAdd(x, half(h)), vAdd(y, vMul(half(h), k1)))));
      } else {
        const k1 = F(x, y);
        const k2 = F(vAdd(x, half(h)), vAdd(y, vMul(half(h), k1)));
        const k3 = F(vAdd(x, half(h)), vAdd(y, vMul(half(h), k2)));
        const k4 = F(vAdd(x, h), vAdd(y, vMul(h, k3)));
        const six = isQv(h) ? new Q(6n) : 6;
        y1 = vAdd(y, vMul(vDiv(h, six), vAdd(vAdd(k1, vMul(isQv(h) ? two : 2, k2)), vAdd(vMul(isQv(h) ? two : 2, k3), k4))));
      }
      x = steps === i ? xe : vAdd(x, h);
      y = y1;
      if (!isFinite(vNum(y))) throw new MathError('the values grew beyond the range of numbers (the solution may blow up)');
      rows.push(String(i).padEnd(5) + vCell(x).padEnd(12) + vCell(y));
    }
    const out = newOut();
    const M = ODE_METHODS[method];
    out.answer.push(Y + '(' + vCell(xe) + ') ' + vEq(y) + '   (' + steps + ' step' + (steps > 1 ? 's' : '') + ' of ' + M.name + ', h = ' + vCell(h) + ')');
    out.work.push(M.formula);
    listRows(rows, 14, 4).forEach((r) => out.work.push(r));
    if (isQv(y) && !y.isInt()) out.notes.push('The steps were carried out in exact fractions; the decimal is the rounded value.');
    // compare with the exact solution when the equation can be solved in closed form
    if (Y === 'y') {
      try {
        const res = solveProblem("y' = " + fmtS(f, true).replace(/\*\*/g, '^') + ', y(' + vCell(x0) + ') = ' + vCell(y0));
        const line = res.out.answer.find((a) => /^y = /.test(a));
        if (line) {
          const E = fromAst(parseExpression(line.replace(/^y = /, '')));
          const ex = numS(E, { [X]: vNum(xe) });
          if (isFinite(ex)) {
            out.work.push('Exact solution: y = ' + line.replace(/^y = /, '') + '  gives y(' + vCell(xe) + ') = ' + fmtNum(ex) + ';  error of the approximation = ' + fmtNum(Math.abs(ex - vNum(y))));
            out.value = { num: vNum(y) };
          }
        }
      } catch (e) {
        if (!(e instanceof MathError) && !(e instanceof NotAlgebraic) && !(e instanceof RangeError)) throw e;
      }
    }
    if (!out.value) out.value = { num: vNum(y) };
    return out;
  };
}
defCmd('euler eulermethod', odeSolver('euler'));
defCmd('heun improvedeuler', odeSolver('heun'));
defCmd('rk2 midpointmethod', odeSolver('midpoint'));
defCmd('rk4 rungekutta', odeSolver('rk4'));
for (const [nm, label] of [['euler', "Euler's method"], ['heun', "Heun's method"], ['rk2', 'the midpoint method'], ['rk4', 'Runge–Kutta (RK4)']]) {
  COMMANDS[nm].show = (n) => label + " for y' = " + showRaw(n.args[0]) + ', y(' + showRaw(n.args[1]) + ') = ' + showRaw(n.args[2]) + ', h = ' + showRaw(n.args[3]) + ', up to x = ' + showRaw(n.args[4]);
}

// ---- Riemann sums and quadrature rules ----------------------------------------------------------------------------------------------------
const RULE_INFO = {
  trapezoid: { label: 'trapezoid rule T', formula: 'h/2·(f(x₀) + 2f(x₁) + … + 2f(xₙ₋₁) + f(xₙ))', p: 2 },
  midpoint: { label: 'midpoint rule M', formula: 'h·(f(m₁) + … + f(mₙ)) with mᵢ the midpoints of the subintervals', p: 2 },
  simpson: { label: "Simpson's rule S", formula: 'h/3·(f(x₀) + 4f(x₁) + 2f(x₂) + … + 4f(xₙ₋₁) + f(xₙ))', p: 4 },
  left: { label: 'left Riemann sum L', formula: 'h·(f(x₀) + … + f(xₙ₋₁))', p: 1 },
  right: { label: 'right Riemann sum R', formula: 'h·(f(x₁) + … + f(xₙ))', p: 1 },
};
function maxAbsDerivative(S, v, order, a, b) {
  let D = S;
  for (let k = 0; k < order; k++) D = simp(diffS(D, v));
  let m = 0;
  const N = 2000;
  for (let i = 0; i <= N; i++) {
    const t = a + ((b - a) * i) / N;
    const val = Math.abs(evalAt(D, v, t));
    if (isFinite(val)) m = Math.max(m, val);
    else return Infinity;
  }
  return m;
}
function ruleSetup(n, kind) {
  needArgs(n, 4, 5, 'f, the limits a and b and the number of subintervals n: ' + n.fn + '(x^2, 0, 1, 4)');
  const S = fromAst(n.args[0]);
  const v = n.args[4] && n.args[4].t === 'var' ? varOfArg(n.args[4]) : singleVarOf(S);
  const a = valArg(n.args[1]);
  const b = valArg(n.args[2]);
  const nn = Number(intArg(n.args[3]));
  if (nn < 1 || nn > 2000) throw new MathError('n must be between 1 and 2000');
  if (kind === 'simpson' && nn % 2) throw new MathError("Simpson's rule needs an even number of subintervals");
  if (vNum(a) === vNum(b)) throw new MathError('the limits must differ');
  return { S, v, a, b, nn, aS: simp(fromAst(n.args[1])), bS: simp(fromAst(n.args[2])) };
}
function exactIntegral(S, v, a, b, aS, bS) {
  try {
    const F = antiderivative(S, v);
    if (F) {
      const hi = bS || (isQv(b) ? sN(b) : decimalS(b));
      const lo = aS || (isQv(a) ? sN(a) : decimalS(a));
      const val = simp(sSub(subsS(F, v, hi), subsS(F, v, lo)));
      const num = numS(val, {});
      if (isFinite(num)) return { S: val, num };
    }
  } catch (e) {
    if (!(e instanceof MathError) && !(e instanceof NotAlgebraic)) throw e;
  }
  const r = integrateNumeric(S, v, vNum(a), vNum(b));
  return r.ok ? { S: null, num: r.value } : null;
}
function quadRule(kind) {
  return (n) => {
    const { S, v, a, b, nn, aS, bS } = ruleSetup(n, kind);
    const info = RULE_INFO[kind];
    const nq = isQv(a) && isQv(b) ? new Q(BigInt(nn)) : nn;
    const h = vDiv(vSub(b, a), nq);
    const node = (i) => vAdd(a, vMul(h, isQv(h) ? new Q(BigInt(i)) : i));
    const f = (x) => nvValueAt(S, { [v]: x });
    let sum = isQv(h) ? Q0 : 0;
    const rows = ['i    x_i           f(x_i)'];
    const cell = (i, x, fx, tag) => rows.push(String(i).padEnd(5) + vCell(x).padEnd(14) + vCell(fx) + (tag ? '   ' + tag : ''));
    let result;
    if (kind === 'left' || kind === 'right') {
      for (let i = kind === 'left' ? 0 : 1; i <= (kind === 'left' ? nn - 1 : nn); i++) {
        const x = node(i);
        const fx = f(x);
        sum = vAdd(sum, fx);
        cell(i, x, fx);
      }
      result = vMul(h, sum);
    } else if (kind === 'midpoint') {
      const hh = vDiv(h, isQv(h) ? new Q(2n) : 2);
      for (let i = 0; i < nn; i++) {
        const x = vAdd(node(i), hh);
        const fx = f(x);
        sum = vAdd(sum, fx);
        cell(i + 1, x, fx, 'midpoint');
      }
      result = vMul(h, sum);
    } else {
      for (let i = 0; i <= nn; i++) {
        const x = node(i);
        const fx = f(x);
        const w = kind === 'trapezoid' ? (i === 0 || i === nn ? 1 : 2) : i === 0 || i === nn ? 1 : i % 2 ? 4 : 2;
        sum = vAdd(sum, vMul(isQv(h) ? new Q(BigInt(w)) : w, fx));
        cell(i, x, fx, 'weight ' + w);
      }
      result = vMul(vDiv(h, isQv(h) ? new Q(kind === 'trapezoid' ? 2n : 3n) : kind === 'trapezoid' ? 2 : 3), sum);
    }
    const out = newOut();
    out.answer.push(info.label + '_' + nn + ' ' + vEq(result));
    out.work.push('h = (b − a)/n = ' + vCell(h) + ';  ' + info.formula);
    listRows(rows, 12, 3).forEach((r) => out.work.push(r));
    const ex = exactIntegral(S, v, a, b, aS, bS);
    if (ex) {
      out.work.push('Exact value of the integral: ' + (ex.S && fmtS(ex.S) !== fmtNum(ex.num) ? fmtS(ex.S) + ' ≈ ' : '') + fmtNum(ex.num) + ';  error of this approximation = ' + fmtNum(Math.abs(ex.num - vNum(result))));
    }
    if (info.p > 1) {
      const K = maxAbsDerivative(S, v, info.p, vNum(a), vNum(b));
      if (isFinite(K)) {
        const L = vNum(b) - vNum(a);
        const bound = kind === 'simpson' ? (K * L ** 5) / (180 * nn ** 4) : kind === 'trapezoid' ? (K * L ** 3) / (12 * nn * nn) : (K * L ** 3) / (24 * nn * nn);
        out.work.push('Error bound: |E| ≤ K·(b − a)^' + (kind === 'simpson' ? '5/(180n⁴)' : '3/(' + (kind === 'trapezoid' ? '12' : '24') + 'n²)') + ' with K = max|f' + (kind === 'simpson' ? '⁗' : '″') + '| ≈ ' + fmtNum(K) + ' on [a, b]  →  |E| ≤ ' + fmtNum(bound));
      }
    }
    out.value = { num: vNum(result) };
    return out;
  };
}
const trapezoidRule = quadRule('trapezoid');
const geometryTrapezoid = COMMANDS.trapezoid; // trapezoid(a, b, h) is also the area of the shape: four arguments mean the rule
const isRuleCall = (n) => n.args.length >= 4;
const trapezoidBoth = (n) => (isRuleCall(n) ? trapezoidRule(n) : geometryTrapezoid(n));
trapezoidBoth.show = (n) => (!isRuleCall(n) && geometryTrapezoid.show ? geometryTrapezoid.show(n) : n.fn + '(' + n.args.map(showRaw).join(', ') + ')');
defCmd('trapezoid', trapezoidBoth, true);
defCmd('trapezoidal trapezoidrule', trapezoidRule);
defCmd('simpson simpsonrule', quadRule('simpson'));
defCmd('midpointrule', quadRule('midpoint'));
defCmd('leftsum leftriemann', quadRule('left'));
defCmd('rightsum rightriemann', quadRule('right'));
defCmd('riemann riemannsum', (n) => {
  needArgs(n, 4, 4, 'f, a, b and n: riemann(x^2, 0, 2, 4)  (left, right and midpoint sums together)');
  const outs = ['leftsum', 'rightsum', 'midpointrule'].map((nm) => COMMANDS[nm]({ ...n, fn: nm }));
  const out = newOut();
  outs.forEach((o) => out.answer.push(o.answer[0]));
  outs[0].work.forEach((w) => out.work.push(w));
  out.notes.push('For the table of one rule alone use leftsum, rightsum or midpointrule.');
  out.value = outs[1].value;
  return out;
});
function smallestN(kind, nodeArgs) {
  const { S, v, a, b } = (() => {
    needArgs(nodeArgs, 4, 4, 'f, a, b and the allowed error: ' + nodeArgs.fn + '(sin(x), 0, pi, 0.001)');
    const S0 = fromAst(nodeArgs.args[0]);
    return { S: S0, v: singleVarOf(S0), a: valArg(nodeArgs.args[1]), b: valArg(nodeArgs.args[2]) };
  })();
  const tol = numArg(nodeArgs.args[3]);
  if (!(tol > 0)) throw new MathError('the allowed error must be positive');
  const info = RULE_INFO[kind];
  const lo = vNum(a);
  const hi = vNum(b);
  const K = maxAbsDerivative(S, v, info.p, lo, hi);
  if (!isFinite(K)) throw new MathError('the derivative is unbounded on [a, b]');
  const L = hi - lo;
  let need;
  if (kind === 'simpson') need = Math.ceil(((K * L ** 5) / (180 * tol)) ** 0.25);
  else need = Math.ceil(Math.sqrt((K * L ** 3) / ((kind === 'trapezoid' ? 12 : 24) * tol)));
  if (kind === 'simpson' && need % 2) need++;
  need = Math.max(need, kind === 'simpson' ? 2 : 1);
  const out = newOut();
  out.answer.push('n = ' + need + '  (smallest n guaranteed by the error bound for the ' + info.label.replace(/ [A-Z]$/, '') + ')');
  out.work.push('K = max|f' + (kind === 'simpson' ? '⁗' : '″') + '| ≈ ' + fmtNum(K) + ' on [' + fmtNum(lo) + ', ' + fmtNum(hi) + ']');
  out.work.push(kind === 'simpson' ? '|E| ≤ K(b − a)⁵/(180n⁴) < ' + fmtNum(tol) : '|E| ≤ K(b − a)³/(' + (kind === 'trapezoid' ? '12' : '24') + 'n²) < ' + fmtNum(tol));
  out.value = { q: qInt(need) };
  return out;
}
defCmd('trapezoidn ntrapezoid', (n) => smallestN('trapezoid', n));
defCmd('simpsonn nsimpson', (n) => smallestN('simpson', n));
defCmd('midpointn nmidpoint', (n) => smallestN('midpoint', n));

// ---- root finding ------------------------------------------------------------------------------------------------------------------------------
function rootFn(n, argIdx) {
  const S = fromAst(n.args[0]);
  const v = singleVarOf(S);
  return { S, v, f: (x) => evalAt(S, v, x) };
}
defCmd('bisection bisect', (n) => {
  needArgs(n, 3, 4, 'f, the endpoints a and b and optionally the number of steps (or a tolerance below 1): bisection(x^3 - x - 2, 1, 2, 10)');
  const { S, v, f } = rootFn(n);
  let a = numArg(n.args[1]);
  let b = numArg(n.args[2]);
  const lim = n.args[3] ? numArg(n.args[3]) : 1e-6;
  const maxIt = lim >= 1 ? Math.min(100, Math.floor(lim)) : 60;
  const tol = lim >= 1 ? 0 : lim;
  if (a > b) [a, b] = [b, a];
  let fa = f(a);
  const fb = f(b);
  if (!isFinite(fa) || !isFinite(fb)) throw new MathError('f is not defined at an endpoint');
  if (fa * fb > 0) throw new MathError('f(a) and f(b) have the same sign, so bisection cannot start (f(' + fmtNum(a) + ') = ' + fmtNum(fa) + ', f(' + fmtNum(b) + ') = ' + fmtNum(fb) + ')');
  const rows = ['n    a              b              c = (a + b)/2   f(c)'];
  let c = a;
  let it = 0;
  for (; it < maxIt; it++) {
    c = (a + b) / 2;
    const fc = f(c);
    rows.push(String(it + 1).padEnd(5) + fmtNum(a).padEnd(15) + fmtNum(b).padEnd(15) + fmtNum(c).padEnd(16) + fmtNum(fc));
    if (fc === 0) break;
    if (fa * fc < 0) b = c;
    else {
      a = c;
      fa = fc;
    }
    if (tol && (b - a) / 2 < tol) {
      it++;
      break;
    }
  }
  const out = newOut();
  out.answer.push('x ≈ ' + fmtNum(c) + '   (c' + it + ' after ' + it + ' step' + (it === 1 ? '' : 's') + '; the root lies in [' + fmtNum(a) + ', ' + fmtNum(b) + '], so the error is at most ' + fmtNum((b - a) / 2) + ')');
  listRows(rows, 14, 4).forEach((r) => out.work.push(r));
  out.work.push('Each step halves the interval; after n steps the error is at most (b − a)/2ⁿ.');
  out.value = { num: c };
  return out;
});
defCmd('secant secantmethod', (n) => {
  needArgs(n, 3, 4, 'f, two starting values and optionally the number of steps: secant(x^2 - 2, 1, 2, 6)');
  const { f } = rootFn(n);
  let x0 = numArg(n.args[1]);
  let x1 = numArg(n.args[2]);
  const steps = n.args[3] ? Math.min(40, Number(intArg(n.args[3]))) : 8;
  const rows = ['n    x_n              f(x_n)'];
  rows.push('0    ' + fmtNum(x0).padEnd(17) + fmtNum(f(x0)));
  rows.push('1    ' + fmtNum(x1).padEnd(17) + fmtNum(f(x1)));
  for (let k = 2; k <= steps + 1; k++) {
    const f0 = f(x0);
    const f1 = f(x1);
    if (f1 === f0) break;
    const x2 = x1 - (f1 * (x1 - x0)) / (f1 - f0);
    if (!isFinite(x2)) throw new MathError('the iteration left the domain of f');
    x0 = x1;
    x1 = x2;
    rows.push(String(k).padEnd(5) + fmtNum(x1).padEnd(17) + fmtNum(f(x1)));
    if (Math.abs(f(x1)) < 1e-14) break;
  }
  const out = newOut();
  out.answer.push('x ≈ ' + fmtNum(x1));
  out.work.push('x_(n+1) = x_n − f(x_n)(x_n − x_(n−1))/(f(x_n) − f(x_(n−1)))');
  rows.forEach((r) => out.work.push(r));
  out.value = { num: x1 };
  return out;
});
defCmd('falseposition regulafalsi', (n) => {
  needArgs(n, 3, 4, 'f, the endpoints a and b and optionally the number of steps: falseposition(x^3 - 2, 1, 2, 6)');
  const { f } = rootFn(n);
  let a = numArg(n.args[1]);
  let b = numArg(n.args[2]);
  const steps = n.args[3] ? Math.min(60, Number(intArg(n.args[3]))) : 8;
  let fa = f(a);
  let fb = f(b);
  if (fa * fb > 0) throw new MathError('f(a) and f(b) must have opposite signs');
  const rows = ['n    a              b              c               f(c)'];
  let c = a;
  for (let k = 1; k <= steps; k++) {
    c = (a * fb - b * fa) / (fb - fa);
    const fc = f(c);
    rows.push(String(k).padEnd(5) + fmtNum(a).padEnd(15) + fmtNum(b).padEnd(15) + fmtNum(c).padEnd(16) + fmtNum(fc));
    if (fc === 0) break;
    if (fa * fc < 0) {
      b = c;
      fb = fc;
    } else {
      a = c;
      fa = fc;
    }
  }
  const out = newOut();
  out.answer.push('x ≈ ' + fmtNum(c));
  out.work.push('c = (a·f(b) − b·f(a))/(f(b) − f(a));  the sign of f(c) decides which endpoint is replaced');
  rows.forEach((r) => out.work.push(r));
  out.value = { num: c };
  return out;
});
defCmd('fixedpoint fixedpointiteration', (n) => {
  needArgs(n, 2, 3, 'g, a starting value and optionally the number of steps: fixedpoint(cos(x), 1, 10)');
  const S = fromAst(n.args[0]);
  const v = singleVarOf(S);
  let x = numArg(n.args[1]);
  const steps = n.args[2] ? Math.min(60, Number(intArg(n.args[2]))) : 12;
  const rows = ['n    x_n              g(x_n)'];
  let converged = false;
  for (let k = 0; k <= steps; k++) {
    const gx = evalAt(S, v, x);
    rows.push(String(k).padEnd(5) + fmtNum(x).padEnd(17) + fmtNum(gx));
    if (!isFinite(gx)) throw new MathError('the iteration left the domain of g');
    if (Math.abs(gx - x) < 1e-12) {
      converged = true;
      x = gx;
      break;
    }
    x = gx;
    if (Math.abs(x) > 1e12) throw new MathError('the iteration diverges');
  }
  const out = newOut();
  out.answer.push('x ≈ ' + fmtNum(x) + (converged ? '  (converged: x = g(x))' : '  (after ' + steps + ' steps)'));
  out.work.push('x_(n+1) = g(x_n);  g\'(x) = ' + fmtS(simp(diffS(S, v))));
  rows.forEach((r) => out.work.push(r));
  const slope = Math.abs(evalAt(simp(diffS(S, v)), v, x));
  if (isFinite(slope)) out.notes.push('|g\'(x)| at the fixed point is ' + fmtNum(slope) + (slope < 1 ? ' < 1, so the iteration converges there.' : ' ≥ 1, so the iteration is not attracted to this point.'));
  out.value = { num: x };
  return out;
});

// ---- interpolation, splines, least squares, difference tables ----------------------------------------------------------------------------------
function pointLists(n, from) {
  const take = (node) => {
    if (node.t !== 'list') throw new MathError('a list such as [1, 2, 3] is needed here');
    return node.items.map(constQ);
  };
  const xs = take(n.args[from]);
  const ys = take(n.args[from + 1]);
  if (xs.length !== ys.length) throw new MathError('the two lists must have the same length');
  if (xs.length < 2) throw new MathError('at least two points are needed');
  if (xs.length > 25) throw new MathError('at most 25 points are supported');
  return { xs, ys };
}
function polyMulLinear(p, root) {
  // p(x) * (x - root)
  const r = new Array(p.length + 1).fill(Q0);
  p.forEach((c, i) => {
    r[i + 1] = r[i + 1].add(c);
    r[i] = r[i].sub(c.mul(root));
  });
  return r;
}
defCmd('interpolate lagrange_interp interpolation newtoninterp', (n) => {
  needArgs(n, 2, 3, 'the x-values, the y-values and optionally a point: interpolate([0, 1, 2], [1, 3, 7], 1.5)');
  const { xs, ys } = pointLists(n, 0);
  for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) if (xs[i].eq(xs[j])) throw new MathError('the x-values must be different');
  const m = xs.length;
  // Newton divided differences
  const table = [ys.slice()];
  for (let k = 1; k < m; k++) {
    const prev = table[k - 1];
    table.push(prev.slice(0, m - k).map((_, i) => prev[i + 1].sub(prev[i]).div(xs[i + k].sub(xs[i]))));
  }
  const coef = table.map((col) => col[0]);
  // expand the Newton form
  let basis = [Q1];
  let poly = [Q0];
  coef.forEach((c, k) => {
    poly = padd(poly, basis.map((b) => b.mul(c)));
    if (k < m - 1) basis = polyMulLinear(basis, xs[k]);
  });
  poly = ptrim(poly);
  const out = newOut();
  out.answer.push('P(x) = ' + polyText(poly, 'x') + '   (the polynomial of degree ≤ ' + (m - 1) + ' through the ' + m + ' points)');
  const newtonTerms = coef.map((c, k) => (k === 0 ? c.toString() : '(' + c.toString() + ')' + xs.slice(0, k).map((xk) => '(x ' + (xk.sign() < 0 ? '+ ' + xk.abs().toString() : xk.isZero() ? '' : '- ' + xk.toString()) + ')').join('').replace('(x )', 'x')));
  out.work.push('Newton form: P(x) = ' + newtonTerms.join(' + '));
  out.work.push('Divided differences f[x₀], f[x₀,x₁], … : ' + coef.map((c) => c.toString()).join(',  '));
  if (n.args[2]) {
    const x0 = constQ(n.args[2]);
    const val = peval(poly, x0);
    out.answer.push('P(' + x0.toString() + ') = ' + qText(val));
    out.value = { q: val };
  } else out.value = { S: polyToS(poly, 'x') };
  const ok = xs.every((xv, i) => peval(poly, xv).eq(ys[i]));
  out.check = ok ? 'P(xᵢ) = yᵢ at every given point' : null;
  return out;
});
defCmd('polyfit polynomialfit leastsquarespoly', (n) => {
  needArgs(n, 3, 4, 'the x-values, the y-values, the degree and optionally a point: polyfit([0,1,2,3], [1,2,5,10], 2)');
  const { xs, ys } = pointLists(n, 0);
  const deg = Number(intArg(n.args[2]));
  if (deg < 0 || deg > 8 || deg >= xs.length) throw new MathError('the degree must be between 0 and ' + Math.min(8, xs.length - 1));
  const size = deg + 1;
  const A = [];
  const b = [];
  for (let i = 0; i < size; i++) {
    A.push([]);
    for (let j = 0; j < size; j++) A[i].push(xs.reduce((s, x) => s.add(x.pow(i + j)), Q0));
    b.push(xs.reduce((s, x, k) => s.add(ys[k].mul(x.pow(i))), Q0));
  }
  const c = solveSquare(A, b);
  if (!c) throw new MathError('the normal equations are singular (not enough different x-values for this degree)');
  const resid = ys.map((y, k) => y.sub(peval(c, xs[k])));
  const sse = resid.reduce((s, r) => s.add(r.mul(r)), Q0);
  const mean = ys.reduce((s, y) => s.add(y), Q0).div(new Q(BigInt(ys.length)));
  const sst = ys.reduce((s, y) => s.add(y.sub(mean).mul(y.sub(mean))), Q0);
  const out = newOut();
  out.answer.push('y = ' + polyText(c, 'x'));
  out.work.push('Normal equations (VᵀV)c = Vᵀy with V the Vandermonde matrix, solved exactly');
  out.work.push('sum of squared residuals = ' + qText(sse) + (sst.isZero() ? '' : ';  R² = ' + qText(Q1.sub(sse.div(sst)))));
  if (n.args[3]) {
    const x0 = constQ(n.args[3]);
    out.answer.push('y(' + x0.toString() + ') ≈ ' + qText(peval(c, x0)));
  }
  out.value = { S: polyToS(c, 'x') };
  return out;
});
defCmd('difftable differences finitedifferences', (n) => {
  needArgs(n, 1, 1, 'a list of values: difftable([1, 4, 9, 16, 25])');
  if (n.args[0].t !== 'list') throw new MathError('a list such as [1, 4, 9, 16] is needed');
  let row = n.args[0].items.map(constQ);
  if (row.length < 2 || row.length > 25) throw new MathError('give between 2 and 25 values');
  const out = newOut();
  const rows = [row.map((q) => q.toString()).join(', ')];
  let order = 0;
  while (row.length > 1) {
    row = row.slice(1).map((v, i) => v.sub(row[i]));
    order++;
    rows.push(row.map((q) => q.toString()).join(', '));
    if (row.every((q) => q.eq(row[0]))) break;
  }
  const constant = row.length > 0 && row.every((q) => q.eq(row[0]));
  out.answer.push(constant && row.length > 1 ? 'the differences of order ' + order + ' are constant (' + row[0].toString() + '): the values follow a polynomial of degree ' + order : 'no constant difference was reached with these ' + rows[0].split(',').length + ' values');
  rows.forEach((r, i) => out.work.push((i === 0 ? 'values: ' : 'Δ' + (i > 1 ? toSup(String(i)) : '') + ':  ') + r));
  return out;
});
defCmd('spline cubicspline naturalspline', (n) => {
  needArgs(n, 2, 3, 'the x-values, the y-values and optionally a point: spline([0,1,2,3], [1,2,0,2], 1.5)');
  const { xs, ys } = pointLists(n, 0);
  const m = xs.length;
  for (let i = 1; i < m; i++) if (xs[i].sub(xs[i - 1]).sign() <= 0) throw new MathError('the x-values must be strictly increasing');
  if (m < 3) throw new MathError('a cubic spline needs at least three points');
  const h = xs.slice(1).map((x, i) => x.sub(xs[i]));
  // second derivatives M_i, natural ends M_0 = M_(m-1) = 0
  const interior = m - 2;
  const A = [];
  const rhs = [];
  for (let i = 1; i <= interior; i++) {
    const row = new Array(interior).fill(Q0);
    if (i > 1) row[i - 2] = h[i - 1];
    row[i - 1] = h[i - 1].add(h[i]).mul(new Q(2n));
    if (i < interior) row[i] = h[i];
    A.push(row);
    rhs.push(ys[i + 1].sub(ys[i]).div(h[i]).sub(ys[i].sub(ys[i - 1]).div(h[i - 1])).mul(new Q(6n)));
  }
  const Mint = solveSquare(A, rhs);
  if (!Mint) throw new MathError('the spline system is singular');
  const M = [Q0].concat(Mint, [Q0]);
  const out = newOut();
  const shiftText = (x) => (x.isZero() ? 'x' : '(x ' + (x.sign() < 0 ? '+ ' + x.abs().toString() : '- ' + x.toString()) + ')');
  const pieces = [];
  for (let i = 0; i < m - 1; i++) {
    const a = ys[i];
    const b = ys[i + 1].sub(ys[i]).div(h[i]).sub(h[i].mul(M[i + 1].add(M[i].mul(new Q(2n)))).div(new Q(6n)));
    const c = M[i].div(new Q(2n));
    const d = M[i + 1].sub(M[i]).div(h[i].mul(new Q(6n)));
    pieces.push({ a, b, c, d, x0: xs[i], x1: xs[i + 1] });
    const t = shiftText(xs[i]);
    const parts = [a.isZero() ? '' : a.toString()];
    [[b, t], [c, t + '²'], [d, t + '³']].forEach(([co, tx]) => {
      if (!co.isZero()) parts.push((co.eq(Q1) ? '' : co.eq(qInt(-1)) ? '-' : '(' + co.toString() + ')') + tx);
    });
    out.answer.push('S' + (i + 1) + '(x) = ' + (parts.filter(Boolean).join(' + ').replace(/\+ -/g, '- ') || '0') + '    for ' + xs[i].toString() + ' ≤ x ≤ ' + xs[i + 1].toString());
  }
  out.work.push('Natural cubic spline: continuous with continuous first and second derivatives, and S″ = 0 at both ends');
  if (n.args[2]) {
    const x0 = constQ(n.args[2]);
    const p = pieces.find((pc) => x0.sub(pc.x0).sign() >= 0 && pc.x1.sub(x0).sign() >= 0);
    if (!p) throw new MathError('the point lies outside the data range');
    const t = x0.sub(p.x0);
    const val = p.a.add(p.b.mul(t)).add(p.c.mul(t.mul(t))).add(p.d.mul(t.mul(t).mul(t)));
    out.answer.push('S(' + x0.toString() + ') = ' + qText(val));
    out.value = { q: val };
  }
  return out;
});
defCmd('numdiff numericaldifferentiation finitedifference', (n) => {
  needArgs(n, 2, 3, 'f, the point and optionally the step h: numdiff(sin(x), 1, 0.1)');
  const S = fromAst(n.args[0]);
  const v = singleVarOf(S);
  const x0 = numArg(n.args[1]);
  const h = n.args[2] ? numArg(n.args[2]) : 0.1;
  if (!(h > 0)) throw new MathError('the step h must be positive');
  const f = (x) => evalAt(S, v, x);
  const exact = evalAt(simp(diffS(S, v)), v, x0);
  const fwd = (f(x0 + h) - f(x0)) / h;
  const bwd = (f(x0) - f(x0 - h)) / h;
  const ctr = (f(x0 + h) - f(x0 - h)) / (2 * h);
  const five = (-f(x0 + 2 * h) + 8 * f(x0 + h) - 8 * f(x0 - h) + f(x0 - 2 * h)) / (12 * h);
  const second = (f(x0 + h) - 2 * f(x0) + f(x0 - h)) / (h * h);
  const exact2 = evalAt(simp(diffS(diffS(S, v), v)), v, x0);
  const out = newOut();
  out.answer.push("central difference: f'(" + fmtNum(x0) + ') ≈ ' + fmtNum(ctr) + '   (exact ' + fmtNum(exact) + ', error ' + fmtNum(Math.abs(ctr - exact)) + ')');
  out.work.push('forward  (f(x+h) − f(x))/h = ' + fmtNum(fwd) + ',  error ' + fmtNum(Math.abs(fwd - exact)));
  out.work.push('backward (f(x) − f(x−h))/h = ' + fmtNum(bwd) + ',  error ' + fmtNum(Math.abs(bwd - exact)));
  out.work.push('central  (f(x+h) − f(x−h))/(2h) = ' + fmtNum(ctr) + ',  error ' + fmtNum(Math.abs(ctr - exact)));
  out.work.push('five-point  (−f(x+2h) + 8f(x+h) − 8f(x−h) + f(x−2h))/(12h) = ' + fmtNum(five) + ',  error ' + fmtNum(Math.abs(five - exact)));
  out.work.push("second derivative (f(x+h) − 2f(x) + f(x−h))/h² = " + fmtNum(second) + ' (exact ' + fmtNum(exact2) + ')');
  out.value = { num: ctr };
  return out;
});
