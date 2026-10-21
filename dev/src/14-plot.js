// ======================================================================
// 14. Graphs: plot(f, g, x, a, b), plotparam(x(t), y(t), t, a, b), plotpolar(r(t), t, a, b)
//     Drawn on a canvas and returned to the chat as an image; zeros, extrema and the
//     y-intercept are also listed in text.
// ======================================================================
const PLOT_COLORS = ['#1f77b4', '#d62728', '#2ca02c', '#ff7f0e', '#9467bd', '#8c564b'];
const PLOT_W = 640;
const PLOT_H = 480;
const hasCanvas = () => typeof document !== 'undefined' && !!document.createElement;

function niceStep(span, target) {
  const raw = span / target;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p;
}
const tickText = (v, step) => {
  const t = Math.abs(v) < step * 1e-9 ? 0 : v;
  const d = Math.max(0, -Math.floor(Math.log10(step)) + 0);
  return Math.abs(t) >= 1e6 || (Math.abs(t) < 1e-3 && t !== 0) ? t.toExponential(1) : Number(t.toFixed(Math.min(6, d))).toString();
};

/** Polylines (arrays of {x, y} with null gaps) for one curve. */
function sampleCurve(fx, fy, t0, t1, n, ylimit) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = t0 + ((t1 - t0) * i) / n;
    let x;
    let y;
    try {
      x = fx(t);
      y = fy(t);
    } catch (e) {
      x = NaN;
      y = NaN;
    }
    pts.push(isFinite(x) && isFinite(y) && Math.abs(y) < (ylimit || 1e12) ? { x, y, t } : null);
  }
  return pts;
}
function robustYRange(curves) {
  const ys = [];
  curves.forEach((c) => c.forEach((p) => { if (p) ys.push(p.y); }));
  if (!ys.length) return [-1, 1];
  ys.sort((a, b) => a - b);
  const at = (q) => ys[Math.min(ys.length - 1, Math.max(0, Math.floor(q * (ys.length - 1))))];
  let lo = at(0.01);
  let hi = at(0.99);
  const full = ys[ys.length - 1] - ys[0];
  if (full < (hi - lo) * 1.6 + 1e-12) {
    lo = ys[0];
    hi = ys[ys.length - 1];
  }
  if (!(hi > lo)) {
    lo -= 1;
    hi += 1;
  }
  const pad = (hi - lo) * 0.1;
  return [lo - pad, hi + pad];
}

function drawPlot(spec) {
  const { curves, xr, yr, labels, equal } = spec;
  const canvas = document.createElement('canvas');
  canvas.width = PLOT_W;
  canvas.height = PLOT_H;
  const g = canvas.getContext('2d');
  const L = 54;
  const R = 14;
  const T = 14;
  const B = 34;
  let [x0, x1] = xr;
  let [y0, y1] = yr;
  if (equal) {
    const sx = (x1 - x0) / (PLOT_W - L - R);
    const sy = (y1 - y0) / (PLOT_H - T - B);
    const s = Math.max(sx, sy);
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    x0 = cx - (s * (PLOT_W - L - R)) / 2;
    x1 = cx + (s * (PLOT_W - L - R)) / 2;
    y0 = cy - (s * (PLOT_H - T - B)) / 2;
    y1 = cy + (s * (PLOT_H - T - B)) / 2;
  }
  const px = (x) => L + ((x - x0) / (x1 - x0)) * (PLOT_W - L - R);
  const py = (y) => PLOT_H - B - ((y - y0) / (y1 - y0)) * (PLOT_H - T - B);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, PLOT_W, PLOT_H);
  const sxTick = niceStep(x1 - x0, 8);
  const syTick = niceStep(y1 - y0, 6);
  g.font = '12px sans-serif';
  g.lineWidth = 1;
  g.strokeStyle = '#e3e3e3';
  g.fillStyle = '#555555';
  g.textAlign = 'center';
  g.textBaseline = 'top';
  for (let v = Math.ceil(x0 / sxTick) * sxTick; v <= x1 + sxTick * 1e-9; v += sxTick) {
    g.beginPath();
    g.moveTo(px(v), T);
    g.lineTo(px(v), PLOT_H - B);
    g.stroke();
    g.fillText(tickText(v, sxTick), px(v), PLOT_H - B + 6);
  }
  g.textAlign = 'right';
  g.textBaseline = 'middle';
  for (let v = Math.ceil(y0 / syTick) * syTick; v <= y1 + syTick * 1e-9; v += syTick) {
    g.beginPath();
    g.moveTo(L, py(v));
    g.lineTo(PLOT_W - R, py(v));
    g.stroke();
    g.fillText(tickText(v, syTick), L - 6, py(v));
  }
  g.strokeStyle = '#222222';
  g.lineWidth = 1.6;
  const axX = Math.min(Math.max(py(0), T), PLOT_H - B);
  const axY = Math.min(Math.max(px(0), L), PLOT_W - R);
  g.beginPath();
  g.moveTo(L, axX);
  g.lineTo(PLOT_W - R, axX);
  g.moveTo(axY, T);
  g.lineTo(axY, PLOT_H - B);
  g.stroke();
  g.strokeStyle = '#999999';
  g.lineWidth = 1;
  g.strokeRect(L, T, PLOT_W - L - R, PLOT_H - T - B);
  g.save();
  g.beginPath();
  g.rect(L, T, PLOT_W - L - R, PLOT_H - T - B);
  g.clip();
  curves.forEach((pts, k) => {
    g.strokeStyle = PLOT_COLORS[k % PLOT_COLORS.length];
    g.lineWidth = 2.4;
    g.lineJoin = 'round';
    let prev = null;
    g.beginPath();
    pts.forEach((p) => {
      if (!p) {
        prev = null;
        return;
      }
      const X = px(p.x);
      const Y = py(p.y);
      const big = Math.abs(Y) > 1e5;
      if (prev && !big && Math.abs(Y - prev.Y) < (PLOT_H - T - B) * 1.2) g.lineTo(X, Y);
      else if (!big) g.moveTo(X, Y);
      prev = big ? null : { X, Y };
    });
    g.stroke();
  });
  (spec.marks || []).forEach((m) => {
    g.fillStyle = m.color || '#000000';
    g.beginPath();
    g.arc(px(m.x), py(m.y), 4, 0, 2 * Math.PI);
    g.fill();
  });
  g.restore();
  // legend
  g.font = '13px sans-serif';
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  const lw = Math.min(PLOT_W - L - R - 12, 14 + Math.max(...labels.map((s) => g.measureText(s).width)) + 12);
  g.fillStyle = 'rgba(255,255,255,0.88)';
  g.fillRect(L + 6, T + 6, lw, labels.length * 18 + 6);
  labels.forEach((s, k) => {
    g.fillStyle = PLOT_COLORS[k % PLOT_COLORS.length];
    g.fillRect(L + 12, T + 18 + k * 18 - 4, 14, 4);
    g.fillStyle = '#111111';
    g.fillText(s, L + 32, T + 18 + k * 18);
  });
  const url = canvas.toDataURL('image/png');
  return url.slice(url.indexOf(',') + 1);
}

function bisectRoot(f, a, b) {
  let fa = f(a);
  for (let i = 0; i < 80; i++) {
    const m = (a + b) / 2;
    const fm = f(m);
    if (fa * fm <= 0) b = m;
    else {
      a = m;
      fa = fm;
    }
  }
  return (a + b) / 2;
}
/** zeros, extrema and the y-intercept of y = f(x) on [a, b] (numbers only; never throws). */
function analyseFunction(f, a, b) {
  const info = { zeros: [], extrema: [], yint: null };
  try {
    const N = 4000;
    const xs = [];
    const ys = [];
    for (let i = 0; i <= N; i++) {
      const x = a + ((b - a) * i) / N;
      let y;
      try {
        y = f(x);
      } catch (e) {
        y = NaN;
      }
      xs.push(x);
      ys.push(isFinite(y) ? y : NaN);
    }
    const scale = Math.max(1e-9, ...ys.filter(isFinite).map(Math.abs).sort((p, q) => p - q).slice(0, Math.max(1, Math.floor(ys.length * 0.98))));
    for (let i = 0; i < N; i++) {
      const y0 = ys[i];
      const y1 = ys[i + 1];
      if (!isFinite(y0) || !isFinite(y1)) continue;
      if (y0 === 0) info.zeros.push(xs[i]);
      else if (y0 * y1 < 0 && Math.abs(y0) + Math.abs(y1) < scale * 3) info.zeros.push(bisectRoot(f, xs[i], xs[i + 1]));
    }
    for (let i = 1; i < N; i++) {
      const d0 = ys[i] - ys[i - 1];
      const d1 = ys[i + 1] - ys[i];
      if (![d0, d1].every(isFinite) || d0 === 0 || d0 * d1 >= 0) continue;
      if (Math.abs(d0) > scale * 0.2 || Math.abs(d1) > scale * 0.2) continue;
      // refine the turning point by golden-section search around xs[i]
      let lo = xs[i - 1];
      let hi = xs[i + 1];
      const sgn = d0 > 0 ? -1 : 1; // maximum -> minimise -f
      const gr = (Math.sqrt(5) - 1) / 2;
      for (let it = 0; it < 70; it++) {
        const c = hi - gr * (hi - lo);
        const d = lo + gr * (hi - lo);
        if (sgn * f(c) < sgn * f(d)) hi = d;
        else lo = c;
      }
      const xm = (lo + hi) / 2;
      info.extrema.push({ x: xm, y: f(xm), max: d0 > 0 });
    }
    if (a <= 0 && b >= 0) {
      const y = f(0);
      if (isFinite(y)) info.yint = y;
    }
  } catch (e) {
    // the text summary is optional
  }
  const span = b - a;
  const clean = (x) => (Math.abs(x) < span * 1e-6 ? 0 : Number(x.toPrecision(7)));
  info.extrema.forEach((e) => {
    if (Math.abs(e.y) < 1e-9 * Math.max(1, ...info.extrema.map((q) => Math.abs(q.y)))) info.zeros.push(e.x); // touches the axis
    e.x = clean(e.x);
    e.y = Math.abs(e.y) < 1e-9 ? 0 : Number(e.y.toPrecision(7));
  });
  info.zeros = info.zeros.sort((p, q) => p - q).map(clean).filter((z, k, arr) => k === 0 || Math.abs(z - arr[k - 1]) > span * 1e-6);
  return info;
}
const dedupeNum = (arr) => arr.filter((z, k) => k === 0 || Math.abs(z - arr[k - 1]) > 1e-7);

function plotArgs(n, minArgs) {
  if (n.args.length < minArgs) throw new MathError(n.fn + ' needs more arguments');
  return n.args;
}
function rangeFrom(args, k) {
  // args[k] is the variable, args[k+1], args[k+2] are the limits
  const lo = numArg(args[k + 1]);
  const hi = numArg(args[k + 2]);
  if (!(hi > lo)) throw new MathError('the right end of the range must be larger than the left end');
  return [lo, hi];
}
const finishPlot = (out, spec, labelText) => {
  if (hasCanvas()) {
    try {
      out.image = drawPlot(spec);
    } catch (e) {
      out.notes.push('The picture could not be drawn on this device; the text above still lists the key points.');
    }
  } else out.notes.push('(no drawing surface available in this environment)');
  return out;
};
defCmd('plot graph', (n) => {
  let args = n.args.slice();
  let v = null;
  let range = [-10, 10];
  if (args.length >= 3 && args[args.length - 3].t === 'var' && ['num', 'neg', 'bin', 'const', 'call'].includes(args[args.length - 2].t)) {
    v = args[args.length - 3].name;
    range = rangeFrom(args, args.length - 3);
    args = args.slice(0, -3);
  } else if (args.length >= 2 && args[args.length - 1].t === 'var' && args.length > 1) {
    v = args[args.length - 1].name;
    args = args.slice(0, -1);
  }
  if (!args.length) throw new MathError('plot needs at least one function, e.g. plot(sin(x), x, -6.28, 6.28)');
  if (args.length > 6) throw new MathError('at most 6 functions per graph');
  if (!v) {
    const vars = new Set();
    args.forEach((a) => collectVars(a, vars));
    if (vars.size > 1) throw new MathError('plot: several letters (' + sortedVars(vars).join(', ') + '); say which is the variable, e.g. plot(' + showRaw(args[0]) + ', x, -5, 5)');
    v = vars.size ? Array.from(vars)[0] : 'x';
  }
  const fns = args.map((a) => {
    const node = a.t === 'named' ? a.a : a;
    const vars = collectVars(node, new Set());
    vars.delete(v);
    if (vars.size) throw new MathError('plot: unknown letter ' + Array.from(vars).join(', ') + ' (only ' + v + ' may appear)');
    return (x) => evalNum(node, { [v]: x });
  });
  const labels = args.map((a) => 'y = ' + showRaw(a.t === 'named' ? a.a : a));
  const curves = fns.map((f) => sampleCurve((t) => t, f, range[0], range[1], 900));
  const yr = robustYRange(curves);
  const out = newOut();
  out.answer.push('Graph of ' + labels.join(',  ') + '  for ' + v + ' from ' + fmtNum(range[0]) + ' to ' + fmtNum(range[1]) + ' (the picture is shown in the chat)');
  const marks = [];
  fns.forEach((f, k) => {
    const info = analyseFunction(f, range[0], range[1]);
    const z = dedupeNum(info.zeros);
    const pre = args.length > 1 ? labels[k] + ': ' : '';
    if (z.length) out.work.push(pre + 'zeros (x-intercepts) at ' + v + ' ≈ ' + z.slice(0, 8).map(fmtNum).join(', ') + (z.length > 8 ? ', …' : ''));
    else out.work.push(pre + 'no zeros in this range');
    if (info.yint !== null) out.work.push(pre + 'y-intercept: ' + fmtNum(info.yint));
    info.extrema.slice(0, 6).forEach((e) => out.work.push(pre + (e.max ? 'local maximum' : 'local minimum') + ' near (' + fmtNum(e.x) + ', ' + fmtNum(e.y) + ')'));
    if (args.length === 1) {
      z.slice(0, 8).forEach((x) => marks.push({ x, y: 0, color: '#000000' }));
      info.extrema.slice(0, 6).forEach((e) => marks.push({ x: e.x, y: e.y, color: e.max ? '#d62728' : '#2ca02c' }));
    }
  });
  return finishPlot(out, { curves, xr: range, yr, labels, marks });
});
COMMANDS.plot.show = (n) => 'graph of ' + n.args.map(showRaw).join(', ');
defCmd('plotparam parametric', (n) => {
  const args = plotArgs(n, 5);
  if (args.length !== 5 || args[2].t !== 'var') throw new MathError('plotparam(x(t), y(t), t, from, to)  - for example plotparam(cos(t), sin(t), t, 0, 2*pi)');
  const v = args[2].name;
  const range = rangeFrom(args, 2);
  const mk = (node) => {
    const vars = collectVars(node, new Set());
    vars.delete(v);
    if (vars.size) throw new MathError('only ' + v + ' may appear');
    return (t) => evalNum(node, { [v]: t });
  };
  const fx = mk(args[0]);
  const fy = mk(args[1]);
  const curve = sampleCurve(fx, fy, range[0], range[1], 1200);
  const xs = curve.filter(Boolean).map((p) => p.x);
  if (!xs.length) throw new MathError('nothing to draw in this range');
  const ys = curve.filter(Boolean).map((p) => p.y);
  const pad = (a, b) => (b > a ? (b - a) * 0.08 : 1);
  const xr = [Math.min(...xs) - pad(Math.min(...xs), Math.max(...xs)), Math.max(...xs) + pad(Math.min(...xs), Math.max(...xs))];
  const yr = [Math.min(...ys) - pad(Math.min(...ys), Math.max(...ys)), Math.max(...ys) + pad(Math.min(...ys), Math.max(...ys))];
  const out = newOut();
  const labels = ['x = ' + showRaw(args[0]) + ',  y = ' + showRaw(args[1])];
  out.answer.push('Parametric curve ' + labels[0] + '  for ' + v + ' from ' + fmtNum(range[0]) + ' to ' + fmtNum(range[1]) + ' (the picture is shown in the chat)');
  out.work.push('x ranges over [' + fmtNum(Math.min(...xs)) + ', ' + fmtNum(Math.max(...xs)) + '],  y over [' + fmtNum(Math.min(...ys)) + ', ' + fmtNum(Math.max(...ys)) + ']');
  return finishPlot(out, { curves: [curve], xr, yr, labels, equal: true });
});
defCmd('plotpolar', (n) => {
  const args = plotArgs(n, 4);
  if (args.length !== 4 || args[1].t !== 'var') throw new MathError('plotpolar(r(t), t, from, to)  - for example plotpolar(1 + cos(t), t, 0, 2*pi)');
  const v = args[1].name;
  const range = rangeFrom(args, 1);
  const vars = collectVars(args[0], new Set());
  vars.delete(v);
  if (vars.size) throw new MathError('only ' + v + ' may appear');
  const fr = (t) => evalNum(args[0], { [v]: t });
  const curve = sampleCurve((t) => fr(t) * Math.cos(t), (t) => fr(t) * Math.sin(t), range[0], range[1], 1600);
  const pts = curve.filter(Boolean);
  if (!pts.length) throw new MathError('nothing to draw in this range');
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const m = Math.max(...xs.map(Math.abs), ...ys.map(Math.abs)) * 1.1 || 1;
  const out = newOut();
  const labels = ['r = ' + showRaw(args[0])];
  out.answer.push('Polar curve ' + labels[0] + '  for ' + v + ' from ' + fmtNum(range[0]) + ' to ' + fmtNum(range[1]) + ' (the picture is shown in the chat)');
  out.work.push('largest distance from the origin ≈ ' + fmtNum(Math.max(...pts.map((p) => Math.hypot(p.x, p.y)))));
  return finishPlot(out, { curves: [curve], xr: [-m, m], yr: [-m, m], labels, equal: true });
});

/** "plot y = x^2", "graph f(x) = sin(x) from -5 to 5" -> plot(...) */
function convertPlotWords(s) {
  const m = /^\s*(?:please\s+)?(?:plot|graph|sketch|draw)\s+(?:the\s+)?(?:graph\s+of\s+|function\s+|curve\s+)?(?:y|f\s*\(\s*x\s*\)|g\s*\(\s*x\s*\))\s*=\s*([^;\n]+?)(?:\s+(?:from|for|on|over)\s+(?:x\s*=\s*)?(-?[0-9.]+(?:\s*\*?\s*pi)?)\s+(?:to|and|-)\s+(-?[0-9.]+(?:\s*\*?\s*pi)?))?\s*$/i.exec(s);
  if (!m) return s;
  return 'plot(' + m[1] + (m[2] ? ', x, ' + m[2] + ', ' + m[3] : '') + ')';
}
