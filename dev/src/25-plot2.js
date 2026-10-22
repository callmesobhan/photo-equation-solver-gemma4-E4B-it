// ======================================================================
// 25. More graphs: slope fields, scatter plots with a fitted curve, histograms, box plots, shaded normal / t / chi-square curves,
//     implicit curves, regions of inequalities and contour maps.  Every picture comes with the key numbers in text.
// ======================================================================
const PL2_REL = [];
function pl2Window(args, k, what) {
  if (args.length <= k) return { vx: 'x', vy: 'y', xr: [-5, 5], yr: [-5, 5] };
  if (args.length !== k + 6 || args[k].t !== 'var' || args[k + 3].t !== 'var') throw new MathError(what + ': write the window as  x, -3, 3, y, -2, 2  (variable, from, to, variable, from, to)');
  const xr = [numArg(args[k + 1]), numArg(args[k + 2])];
  const yr = [numArg(args[k + 4]), numArg(args[k + 5])];
  if (!(xr[1] > xr[0]) || !(yr[1] > yr[0])) throw new MathError(what + ': each "to" value must be larger than its "from" value');
  return { vx: args[k].name, vy: args[k + 3].name, xr, yr };
}
function pl2Fn(node, vx, vy) {
  const vars = collectVars(node, new Set());
  vars.delete(vx);
  vars.delete(vy);
  if (vars.size) throw new MathError('unknown letter ' + Array.from(vars).join(', ') + ' (only ' + vx + ' and ' + vy + ' may appear)');
  return (x, y) => evalNum(node, { [vx]: x, [vy]: y });
}
const pl2Draw = (out, spec) => finishPlot(out, spec);

/** Marching squares: segments [x1, y1, x2, y2] of the level curve F = level, and the sampled values. */
function pl2Contour(F, xr, yr, nx, ny, level) {
  const dx = (xr[1] - xr[0]) / nx;
  const dy = (yr[1] - yr[0]) / ny;
  const V = [];
  for (let j = 0; j <= ny; j++) {
    const row = [];
    for (let i = 0; i <= nx; i++) {
      let v;
      try {
        v = F(xr[0] + i * dx, yr[0] + j * dy);
      } catch (e) {
        v = NaN;
      }
      row.push(isFinite(v) ? v : NaN);
    }
    V.push(row);
  }
  return { segs: pl2Segments(V, xr, yr, nx, ny, level), V };
}
function pl2Segments(V, xr, yr, nx, ny, level) {
  const dx = (xr[1] - xr[0]) / nx;
  const dy = (yr[1] - yr[0]) / ny;
  const segs = [];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const va = V[j][i];
      const vb = V[j][i + 1];
      const vc = V[j + 1][i + 1];
      const vd = V[j + 1][i];
      if (isNaN(va) || isNaN(vb) || isNaN(vc) || isNaN(vd)) continue;
      if (Math.max(Math.abs(va), Math.abs(vb), Math.abs(vc), Math.abs(vd)) > 1e9) continue;
      const mask = (va > level ? 1 : 0) | (vb > level ? 2 : 0) | (vc > level ? 4 : 0) | (vd > level ? 8 : 0);
      if (mask === 0 || mask === 15) continue;
      const x = xr[0] + i * dx;
      const y = yr[0] + j * dy;
      const edge = [
        () => [x + ((level - va) / (vb - va)) * dx, y],
        () => [x + dx, y + ((level - vb) / (vc - vb)) * dy],
        () => [x + ((level - vd) / (vc - vd)) * dx, y + dy],
        () => [x, y + ((level - va) / (vd - va)) * dy],
      ];
      const add = (p, q) => segs.push(edge[p]().concat(edge[q]()));
      const centreHigh = (va + vb + vc + vd) / 4 > level;
      switch (mask) {
        case 1: case 14: add(3, 0); break;
        case 2: case 13: add(0, 1); break;
        case 3: case 12: add(3, 1); break;
        case 4: case 11: add(1, 2); break;
        case 6: case 9: add(0, 2); break;
        case 7: case 8: add(3, 2); break;
        case 5:
          if (centreHigh) { add(0, 1); add(3, 2); } else { add(3, 0); add(1, 2); }
          break;
        case 10:
          if (centreHigh) { add(3, 0); add(1, 2); } else { add(0, 1); add(3, 2); }
          break;
        default: break;
      }
    }
  }
  return segs;
}
const pl2DrawSegs = (g, px, py, segs, color, width, dash) => {
  g.strokeStyle = color;
  g.lineWidth = width;
  if (dash && g.setLineDash) g.setLineDash(dash);
  g.beginPath();
  segs.forEach((s) => {
    g.moveTo(px(s[0]), py(s[1]));
    g.lineTo(px(s[2]), py(s[3]));
  });
  g.stroke();
  if (dash && g.setLineDash) g.setLineDash([]);
};
/** Values of x in [a, b] where f changes sign (scan + bisection). */
function pl2Roots(f, a, b, n) {
  const roots = [];
  let xp = a;
  let fp;
  try {
    fp = f(a);
  } catch (e) {
    fp = NaN;
  }
  for (let i = 1; i <= n; i++) {
    const x = a + ((b - a) * i) / n;
    let fx;
    try {
      fx = f(x);
    } catch (e) {
      fx = NaN;
    }
    if (isFinite(fp) && isFinite(fx)) {
      if (fp === 0) roots.push(xp);
      else if (fp * fx < 0) {
        let lo = xp;
        let hi = x;
        let flo = fp;
        for (let k = 0; k < 80; k++) {
          const mid = (lo + hi) / 2;
          const fm = f(mid);
          if (flo * fm <= 0) hi = mid;
          else {
            lo = mid;
            flo = fm;
          }
        }
        const r = (lo + hi) / 2;
        if (Math.abs(f(r)) < 1e6) roots.push(r);
      }
    }
    xp = x;
    fp = fx;
  }
  if (isFinite(fp) && fp === 0) roots.push(xp);
  return roots.filter((r, k) => k === 0 || Math.abs(r - roots[k - 1]) > (b - a) * 1e-9);
}

// ---- slope fields ---------------------------------------------------------------------------------------------------------------------------
function pl2Rk4(f, x0, y0, xEnd, steps) {
  const h = (xEnd - x0) / steps;
  const pts = [{ x: x0, y: y0 }];
  let y = y0;
  for (let k = 0; k < steps; k++) {
    const x = x0 + k * h;
    const k1 = f(x, y);
    const k2 = f(x + h / 2, y + (h / 2) * k1);
    const k3 = f(x + h / 2, y + (h / 2) * k2);
    const k4 = f(x + h, y + h * k3);
    y += (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
    if (!isFinite(y) || Math.abs(y) > 1e8) break;
    pts.push({ x: x0 + (k + 1) * h, y });
  }
  return pts;
}
defCmd('slopefield directionfield', (n) => {
  const args = n.args;
  if (!args.length) throw new MathError('slopefield needs the right-hand side of y\' = f(x, y), e.g. slopefield(x - y, x, -3, 3, y, -3, 3)');
  const hasWin = args.length >= 7 && args[1].t === 'var' && args[4].t === 'var';
  const win = hasWin ? pl2Window(args.slice(0, 7), 1, 'slopefield') : { vx: 'x', vy: 'y', xr: [-5, 5], yr: [-5, 5] };
  const rest = args.slice(hasWin ? 7 : 1);
  if (rest.length % 2) throw new MathError('give the starting points as pairs: slopefield(x - y, x, -3, 3, y, -3, 3, 0, 1)');
  const f = pl2Fn(args[0], win.vx, win.vy);
  const { xr, yr } = win;
  const out = newOut();
  const labels = ["y' = " + showRaw(args[0])];
  out.answer.push('Slope field of ' + labels[0] + ' on x from ' + fmtNum(xr[0]) + ' to ' + fmtNum(xr[1]) + ', y from ' + fmtNum(yr[0]) + ' to ' + fmtNum(yr[1]) + ' (the picture is shown in the chat)');
  const curves = [];
  const labelList = [labels[0]];
  for (let i = 0; i + 1 < rest.length; i += 2) {
    const x0 = numArg(rest[i]);
    const y0 = numArg(rest[i + 1]);
    const right = pl2Rk4(f, x0, y0, xr[1], 800);
    const left = pl2Rk4(f, x0, y0, xr[0], 800).reverse();
    curves.push(left.concat(right.slice(1)));
    labelList.push('through (' + fmtNum(x0) + ', ' + fmtNum(y0) + ')');
    const endR = pl2Rk4(f, x0, y0, xr[1], 4000);
    const endL = pl2Rk4(f, x0, y0, xr[0], 4000);
    const atR = endR[endR.length - 1];
    const atL = endL[endL.length - 1];
    out.work.push('slope at (' + fmtNum(x0) + ', ' + fmtNum(y0) + ') = ' + fmtNum(f(x0, y0)));
    out.work.push('solution through (' + fmtNum(x0) + ', ' + fmtNum(y0) + '): ' + (Math.abs(atR.x - xr[1]) < 1e-9 ? 'y(' + fmtNum(xr[1]) + ') ≈ ' + fmtNum(atR.y) : 'it leaves the window near x = ' + fmtNum(atR.x)) + ';  ' + (Math.abs(atL.x - xr[0]) < 1e-9 ? 'y(' + fmtNum(xr[0]) + ') ≈ ' + fmtNum(atL.y) : 'to the left it leaves the window near x = ' + fmtNum(atL.x)));
  }
  // equilibrium solutions of an autonomous equation y' = f(y)
  const autonomous = !collectVars(args[0], new Set()).has(win.vx);
  if (autonomous) {
    const eq = pl2Roots((y) => f(xr[0], y), yr[0], yr[1], 800);
    out.work.push(eq.length ? 'the equation does not depend on ' + win.vx + ': constant (equilibrium) solutions ' + win.vy + ' = ' + eq.map((r) => fmtNum(Math.abs(r) < 1e-9 ? 0 : r)).join(', ') : 'the equation does not depend on ' + win.vx + ' and has no constant solution in this window');
  }
  const nx = 21;
  const ny = 15;
  const under = (g, px, py) => {
    g.strokeStyle = '#888888';
    g.lineWidth = 1.4;
    const sx = Math.abs(px(1) - px(0));
    const sy = Math.abs(py(1) - py(0));
    const len = Math.min(((PLOT_W - 68) / nx) * 0.42, ((PLOT_H - 48) / ny) * 0.42);
    g.beginPath();
    for (let i = 0; i <= nx; i++) {
      for (let j = 0; j <= ny; j++) {
        const x = xr[0] + ((xr[1] - xr[0]) * i) / nx;
        const y = yr[0] + ((yr[1] - yr[0]) * j) / ny;
        let m;
        try {
          m = f(x, y);
        } catch (e) {
          m = NaN;
        }
        if (!isFinite(m)) continue;
        const vx = sx;
        const vy = -m * sy;
        const L = Math.hypot(vx, vy) || 1;
        const ux = (vx / L) * len;
        const uy = (vy / L) * len;
        g.moveTo(px(x) - ux, py(y) - uy);
        g.lineTo(px(x) + ux, py(y) + uy);
      }
    }
    g.stroke();
  };
  return pl2Draw(out, { curves, xr, yr, labels: curves.length ? labelList : [], labelColors: ['#888888'].concat(curves.map((_, k) => PLOT_COLORS[k % PLOT_COLORS.length])), under });
});

// ---- scatter plots ------------------------------------------------------------------------------------------------------------------------
defCmd('scatter scatterplot', (n) => {
  needArgs(n, 2, 3, 'the x-values and the y-values (and optionally the degree of the fitted polynomial, 0 for none): scatter([1,2,3,4], [2,4,5,8], 1)');
  const { xs, ys } = pointLists(n, 0);
  const deg = n.args[2] ? Number(intArg(n.args[2])) : 1;
  if (deg < 0 || deg > 6 || (deg > 0 && deg >= xs.length)) throw new MathError('the degree must be between 0 (no fit) and ' + Math.min(6, xs.length - 1));
  const out = newOut();
  const px = xs.map((q) => q.toNumber());
  const py2 = ys.map((q) => q.toNumber());
  out.answer.push('Scatter plot of ' + xs.length + ' points' + (deg ? ' with the least-squares ' + (deg === 1 ? 'line' : 'polynomial of degree ' + deg) : '') + ' (the picture is shown in the chat)');
  const curves = [];
  const labels = ['data'];
  const labelColors = ['#d62728'];
  const xmin = Math.min(...px);
  const xmax = Math.max(...px);
  let ymin = Math.min(...py2);
  let ymax = Math.max(...py2);
  if (deg) {
    const size = deg + 1;
    const A = [];
    const b = [];
    for (let i = 0; i < size; i++) {
      A.push([]);
      for (let j = 0; j < size; j++) A[i].push(xs.reduce((s, x) => s.add(x.pow(i + j)), Q0));
      b.push(xs.reduce((s, x, k) => s.add(ys[k].mul(x.pow(i))), Q0));
    }
    const c = solveSquare(A, b);
    if (!c) throw new MathError('there are not enough different x-values for a polynomial of degree ' + deg);
    const mean = ys.reduce((s, y) => s.add(y), Q0).div(qInt(ys.length));
    const sst = ys.reduce((s, y) => s.add(y.sub(mean).mul(y.sub(mean))), Q0);
    const sse = ys.reduce((s, y, k) => s.add(y.sub(peval(c, xs[k])).mul(y.sub(peval(c, xs[k])))), Q0);
    out.answer.push('fit: y = ' + polyText(c, 'x'));
    out.work.push('coefficients (constant term first): ' + c.map((q, i) => 'c' + i + ' = ' + fmtNum(q.toNumber())).join(', '));
    if (!sst.isZero()) {
      const r2 = Q1.sub(sse.div(sst));
      out.work.push('R² = ' + fmtNum(r2.toNumber()) + (deg === 1 ? ';  correlation r = ' + (c[1].sign() < 0 ? '-' : '') + fmtNum(Math.sqrt(Math.max(0, r2.toNumber()))) : ''));
    }
    const span = xmax - xmin || 1;
    const lo = xmin - span * 0.08;
    const hi = xmax + span * 0.08;
    const cn = c.map((q) => q.toNumber());
    const curve = sampleCurve((t) => t, (t) => cn.reduceRight((s, co) => s * t + co, 0), lo, hi, 300);
    curves.push(curve);
    curve.forEach((p) => { if (p) { ymin = Math.min(ymin, p.y); ymax = Math.max(ymax, p.y); } });
    labels.push('fit: y = ' + polyText(c, 'x'));
    labelColors.push(PLOT_COLORS[0]);
  }
  const padx = (xmax - xmin || 1) * 0.1;
  const pady = (ymax - ymin || 1) * 0.1;
  const marks = px.map((x, i) => ({ x, y: py2[i], color: '#d62728' }));
  return pl2Draw(out, { curves, xr: [xmin - padx, xmax + padx], yr: [ymin - pady, ymax + pady], labels, labelColors, marks });
});

// ---- histograms and box plots ----------------------------------------------------------------------------------------------------------------
function pl2Histogram(n, mode) {
  if (!n.args.length || n.args[0].t !== 'list') throw new MathError(n.fn + ' needs a list of data' + (mode === 'bins' ? ' and the number of bins: histbins([2,3,3,4,5,7,8,9], 4)' : ' and optionally the class width (and the first class start): histogram([2,3,3,4,5,7,8,9], 2)'));
  const vs = sortQ(dataOf([n.args[0]], 'histogram'));
  const N = vs.length;
  const lo0 = vs[0];
  const hi0 = vs[N - 1];
  let lo;
  let w;
  let k;
  let lastClosed = false;
  let how;
  if (mode === 'width' && n.args[1]) {
    w = constQ(n.args[1]);
    if (w.sign() <= 0) throw new MathError('the class width must be positive');
    lo = n.args[2] ? constQ(n.args[2]) : floorQ(lo0.div(w)).mul(w);
    if (lo.sub(lo0).sign() > 0) throw new MathError('the first class must start at or below the smallest value');
    k = Number(floorQ(hi0.sub(lo).div(w)).n) + 1;
    how = 'classes of width ' + fmtNum(w.toNumber()) + ' starting at ' + fmtNum(lo.toNumber()) + ', each including its lower limit and excluding its upper limit';
  } else {
    k = mode === 'bins' ? Number(intArg(n.args[1])) : Math.ceil(Math.log2(N)) + 1;
    lo = lo0;
    w = hi0.sub(lo0).div(qInt(Math.max(1, k)));
    if (w.isZero()) {
      w = Q1;
      k = 1;
    }
    lastClosed = true;
    how = mode === 'bins' ? k + ' equal bins from the smallest to the largest value; the last bin includes its upper end' : k + ' equal bins from the smallest to the largest value (Sturges\' rule ⌈log₂ n⌉ + 1); the last bin includes its upper end';
  }
  if (k < 1 || k > 60) throw new MathError('the number of classes must be between 1 and 60');
  const counts = new Array(k).fill(0);
  vs.forEach((v) => {
    let i = Number(floorQ(v.sub(lo).div(w)).n);
    if (i >= k) i = lastClosed ? k - 1 : k - 1;
    counts[i]++;
  });
  const edges = [];
  for (let i = 0; i <= k; i++) edges.push(lo.add(w.mul(qInt(i))));
  const out = newOut();
  out.answer.push('Histogram of ' + N + ' values in ' + k + ' classes of width ' + fmtNum(w.toNumber()) + ': counts ' + counts.join(', ') + ' (the picture is shown in the chat)');
  counts.forEach((c, i) => out.work.push('class ' + (i + 1) + ': [' + fmtNum(edges[i].toNumber()) + ', ' + fmtNum(edges[i + 1].toNumber()) + (lastClosed && i === k - 1 ? ']' : ')') + ' → ' + c + '  (' + fmtNum((c / N) * 100) + ' %)'));
  const best = Math.max(...counts);
  out.work.push('tallest class' + (counts.filter((c) => c === best).length > 1 ? 'es' : '') + ': ' + counts.map((c, i) => (c === best ? i + 1 : 0)).filter(Boolean).join(', ') + ' (' + best + ' values);  ' + how);
  const e = edges.map((q) => q.toNumber());
  const under = (g, px, py) => {
    counts.forEach((c, i) => {
      g.fillStyle = 'rgba(31,119,180,0.75)';
      g.fillRect(px(e[i]), py(c), px(e[i + 1]) - px(e[i]), py(0) - py(c));
      g.strokeStyle = '#ffffff';
      g.lineWidth = 1.5;
      g.strokeRect(px(e[i]), py(c), px(e[i + 1]) - px(e[i]), py(0) - py(c));
    });
  };
  const wn = w.toNumber();
  return pl2Draw(out, { curves: [], xr: [e[0] - wn * 0.3, e[k] + wn * 0.3], yr: [0, best * 1.15 + 0.5], labels: [], under });
}
defCmd('histogram hist', (n) => pl2Histogram(n, 'width'));
defCmd('histbins', (n) => pl2Histogram(n, 'bins'));
defCmd('boxplot boxwhisker', (n) => {
  if (!n.args.length || n.args.some((a) => a.t !== 'list')) throw new MathError('boxplot needs one or more lists of data: boxplot([2,3,3,4,5,7,40]) or boxplot([1,2,3,4], [2,4,6,8])');
  if (n.args.length > 6) throw new MathError('at most 6 data sets');
  const sets = n.args.map((a) => sortQ(dataOf([a], 'boxplot')));
  const out = newOut();
  const info = sets.map((vs, k) => {
    const { q1, q2, q3 } = quartiles(vs);
    const iqr = q3.sub(q1);
    const lof = q1.sub(iqr.mul(new Q(3n, 2n)));
    const hif = q3.add(iqr.mul(new Q(3n, 2n)));
    const inside = vs.filter((v) => v.sub(lof).sign() >= 0 && v.sub(hif).sign() <= 0);
    const outl = vs.filter((v) => v.sub(lof).sign() < 0 || v.sub(hif).sign() > 0);
    const r = { q1, q2, q3, iqr, lof, hif, wlo: inside[0], whi: inside[inside.length - 1], outl, min: vs[0], max: vs[vs.length - 1] };
    out.work.push((sets.length > 1 ? 'data set ' + (k + 1) + ': ' : '') + 'min ' + qText(r.min) + ', Q1 ' + qText(q1) + ', median ' + qText(q2) + ', Q3 ' + qText(q3) + ', max ' + qText(r.max) + ';  IQR ' + qText(iqr) + ';  fences ' + qText(lof) + ' and ' + qText(hif) + ';  whiskers ' + qText(r.wlo) + ' to ' + qText(r.whi) + ';  ' + (outl.length ? 'outliers: ' + outl.map((v) => v.toString()).join(', ') : 'no outliers'));
    return r;
  });
  out.answer.push('Box plot of ' + sets.length + ' data set' + (sets.length > 1 ? 's' : '') + (info.some((r) => r.outl.length) ? ' (outliers marked with dots)' : '') + ' (the picture is shown in the chat)');
  const allV = [];
  info.forEach((r) => { allV.push(r.min.toNumber(), r.max.toNumber()); });
  const lo = Math.min(...allV);
  const hi = Math.max(...allV);
  const pad = (hi - lo || 1) * 0.08;
  const under = (g, px, py) => {
    info.forEach((r, k) => {
      const yc = k + 1;
      const col = PLOT_COLORS[k % PLOT_COLORS.length];
      const q1 = r.q1.toNumber();
      const q3 = r.q3.toNumber();
      g.fillStyle = 'rgba(31,119,180,0.25)';
      g.fillRect(px(q1), py(yc + 0.28), px(q3) - px(q1), py(yc - 0.28) - py(yc + 0.28));
      g.strokeStyle = col;
      g.lineWidth = 2;
      g.strokeRect(px(q1), py(yc + 0.28), px(q3) - px(q1), py(yc - 0.28) - py(yc + 0.28));
      g.beginPath();
      g.moveTo(px(r.q2.toNumber()), py(yc + 0.28));
      g.lineTo(px(r.q2.toNumber()), py(yc - 0.28));
      g.moveTo(px(r.wlo.toNumber()), py(yc));
      g.lineTo(px(q1), py(yc));
      g.moveTo(px(q3), py(yc));
      g.lineTo(px(r.whi.toNumber()), py(yc));
      g.moveTo(px(r.wlo.toNumber()), py(yc + 0.14));
      g.lineTo(px(r.wlo.toNumber()), py(yc - 0.14));
      g.moveTo(px(r.whi.toNumber()), py(yc + 0.14));
      g.lineTo(px(r.whi.toNumber()), py(yc - 0.14));
      g.stroke();
      g.fillStyle = col;
      r.outl.forEach((v) => {
        g.beginPath();
        g.arc(px(v.toNumber()), py(yc), 3.5, 0, 2 * Math.PI);
        g.fill();
      });
    });
  };
  return pl2Draw(out, { curves: [], xr: [lo - pad, hi + pad], yr: [0.4, sets.length + 0.6], labels: sets.length > 1 ? sets.map((_, k) => 'data set ' + (k + 1)) : [], under, hideY: true });
});

// ---- shaded distributions -----------------------------------------------------------------------------------------------------------------
function shadeDistribution(n, name, pdf, cdf, support, label, lo, hi) {
  const a = numArg(n.args[n.args.length - 2]);
  const b = numArg(n.args[n.args.length - 1]);
  if (a > b) throw new MathError('the left end must not exceed the right end');
  const p = cdf(b) - cdf(a);
  const out = newOut();
  const rangeText = a === -Infinity ? 'X < ' + fmtNum(b) : b === Infinity ? 'X > ' + fmtNum(a) : fmtNum(a) + ' < X < ' + fmtNum(b);
  out.answer.push('P(' + rangeText + ') = ' + fmtNum(p) + ' (' + fmtNum(p * 100) + ' %) - the shaded area (the picture is shown in the chat)');
  const lo2 = Math.max(a, lo);
  const hi2 = Math.min(b, hi);
  const curve = sampleCurve((t) => t, pdf, lo, hi, 400);
  const top = Math.max(...curve.filter(Boolean).map((q) => q.y).filter((v) => isFinite(v) && v < 1e6)) * 1.12;
  const under = (g, px, py) => {
    if (!(hi2 > lo2)) return;
    g.fillStyle = 'rgba(214,39,40,0.30)';
    g.beginPath();
    g.moveTo(px(lo2), py(0));
    for (let i = 0; i <= 200; i++) {
      const x = lo2 + ((hi2 - lo2) * i) / 200;
      g.lineTo(px(x), py(Math.min(pdf(x), top * 2)));
    }
    g.lineTo(px(hi2), py(0));
    g.closePath();
    g.fill();
  };
  void support;
  return { out, curve, top, under, labels: [label] };
}
defCmd('normalshade shadenormal', (n) => {
  needArgs(n, 4, 4, 'the mean, the standard deviation and the two ends: normalshade(0, 1, -1.96, 1.96)  (oo for infinity)');
  const mu = numArg(n.args[0]);
  const sd = numArg(n.args[1]);
  if (!(sd > 0)) throw new MathError('the standard deviation must be positive');
  const r = shadeDistribution(n, 'normal', (x) => normPdf((x - mu) / sd) / sd, (x) => normCdf((x - mu) / sd), null, 'Normal(' + fmtNum(mu) + ', ' + fmtNum(sd) + ')', mu - 4.2 * sd, mu + 4.2 * sd);
  const a = numArg(n.args[2]);
  const b = numArg(n.args[3]);
  r.out.work.push('z-scores: ' + (isFinite(a) ? 'z(' + fmtNum(a) + ') = ' + fmtNum((a - mu) / sd) : '−∞') + ' and ' + (isFinite(b) ? 'z(' + fmtNum(b) + ') = ' + fmtNum((b - mu) / sd) : '+∞') + ';  area = Φ(z₂) − Φ(z₁)');
  return pl2Draw(r.out, { curves: [r.curve], xr: [mu - 4.2 * sd, mu + 4.2 * sd], yr: [0, r.top], labels: r.labels, under: r.under });
});
defCmd('tshade shadet', (n) => {
  needArgs(n, 3, 3, 'the degrees of freedom and the two ends: tshade(10, -2.228, 2.228)');
  const df = numArg(n.args[0]);
  if (!(df > 0)) throw new MathError('the degrees of freedom must be positive');
  const r = shadeDistribution(n, 't', (x) => tPdf(x, df), (x) => (x === -Infinity ? 0 : x === Infinity ? 1 : tCdf(x, df)), null, 't(' + fmtNum(df) + ')', -5, 5);
  r.out.work.push('Student t distribution with ' + fmtNum(df) + ' degrees of freedom');
  return pl2Draw(r.out, { curves: [r.curve], xr: [-5, 5], yr: [0, r.top], labels: r.labels, under: r.under });
});
defCmd('chisqshade shadechisq', (n) => {
  needArgs(n, 3, 3, 'the degrees of freedom and the two ends: chisqshade(4, 9.488, oo)');
  const df = numArg(n.args[0]);
  if (!(df > 0)) throw new MathError('the degrees of freedom must be positive');
  const hi = df + 5 * Math.sqrt(2 * df) + 5;
  const r = shadeDistribution(n, 'chisq', (x) => chi2Pdf(x, df), (x) => (x <= 0 ? 0 : x === Infinity ? 1 : chi2Cdf(x, df)), null, 'χ²(' + fmtNum(df) + ')', 0, hi);
  r.out.work.push('chi-square distribution with ' + fmtNum(df) + ' degrees of freedom (only x ≥ 0 has density)');
  return pl2Draw(r.out, { curves: [r.curve], xr: [0, hi], yr: [0, r.top], labels: r.labels, under: r.under });
});

// ---- implicit curves, contour maps and regions --------------------------------------------------------------------------------------
defCmd('plotimplicit implicitplot', (n) => {
  if (!n.args.length) throw new MathError('plotimplicit needs F(x, y) (the curve F = 0) and optionally the window: plotimplicit(x^2 + y^2 - 4, x, -3, 3, y, -3, 3)  or plotimplicit(x^2 + y^2 = 4)');
  const win = pl2Window(n.args, 1, 'plotimplicit');
  const F = pl2Fn(n.args[0], win.vx, win.vy);
  const { xr, yr } = win;
  const { segs } = pl2Contour(F, xr, yr, 200, 150, 0);
  const out = newOut();
  const label = showRaw(n.args[0]) + ' = 0';
  out.answer.push('Curve ' + label + ' on x from ' + fmtNum(xr[0]) + ' to ' + fmtNum(xr[1]) + ', y from ' + fmtNum(yr[0]) + ' to ' + fmtNum(yr[1]) + (segs.length ? '' : '  (no points of the curve in this window)') + ' (the picture is shown in the chat)');
  const xi = pl2Roots((x) => F(x, 0), xr[0], xr[1], 1200).filter((r) => yr[0] <= 0 && yr[1] >= 0);
  const yi = pl2Roots((y) => F(0, y), yr[0], yr[1], 1200).filter((r) => xr[0] <= 0 && xr[1] >= 0);
  const clean = (v) => fmtNum(Math.abs(v) < 1e-9 ? 0 : v);
  const interceptLine = (list, v, other) => (list.length > 200 ? 'the whole ' + v + '-axis is part of the curve (' + other + ' = 0 satisfies the equation for every ' + v + ')' : list.length ? v + '-intercepts: ' + v + ' ≈ ' + list.map(clean).join(', ') : 'no ' + v + '-intercepts in the window');
  out.work.push(interceptLine(xi, win.vx, win.vy));
  out.work.push(interceptLine(yi, win.vy, win.vx));
  const under = (g, px, py) => pl2DrawSegs(g, px, py, segs, PLOT_COLORS[0], 2.6);
  return pl2Draw(out, { curves: [], xr, yr, labels: [label], under, equal: true });
});
defCmd('contour contourplot levelcurves', (n) => {
  if (!n.args.length) throw new MathError('contour needs f(x, y) and optionally the window and the number of levels: contour(x^2 + y^2, x, -3, 3, y, -3, 3)');
  const hasWin = n.args.length >= 7;
  const win = pl2Window(n.args.slice(0, hasWin ? 7 : 1), 1, 'contour');
  const want = n.args[hasWin ? 7 : 1] ? Math.min(14, Math.max(2, Number(intArg(n.args[hasWin ? 7 : 1])))) : 8;
  const F = pl2Fn(n.args[0], win.vx, win.vy);
  const { xr, yr } = win;
  const nx = 120;
  const ny = 90;
  const { V } = pl2Contour(F, xr, yr, nx, ny, 0);
  let mn = Infinity;
  let mx = -Infinity;
  V.forEach((row) => row.forEach((v) => { if (!isNaN(v)) { mn = Math.min(mn, v); mx = Math.max(mx, v); } }));
  if (!(mx > mn)) throw new MathError('the function is constant (or undefined) on this window, so there are no level curves');
  const step = niceStep(mx - mn, want);
  const levels = [];
  for (let v = Math.ceil(mn / step) * step; v <= mx + step * 1e-9; v += step) if (v > mn + step * 1e-9 && v < mx - step * 1e-9) levels.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  const out = newOut();
  out.answer.push('Contour map of ' + showRaw(n.args[0]) + ': ' + levels.length + ' level curves (the picture is shown in the chat)');
  out.work.push('on this window the function ranges from ' + fmtNum(mn) + ' to ' + fmtNum(mx) + ' (sampled on a ' + nx + '×' + ny + ' grid)');
  out.work.push('level curves at ' + levels.map((v) => fmtNum(Number(v.toPrecision(10)))).join(', '));
  const all = levels.map((lv) => ({ lv, segs: pl2Segments(V, xr, yr, nx, ny, lv) }));
  const under = (g, px, py) => {
    all.forEach(({ lv, segs }) => {
      const t = (lv - mn) / (mx - mn);
      pl2DrawSegs(g, px, py, segs, 'rgb(' + Math.round(40 + 190 * t) + ',' + Math.round(80 + 40 * (1 - Math.abs(2 * t - 1))) + ',' + Math.round(220 - 190 * t) + ')', 1.8);
    });
  };
  return pl2Draw(out, { curves: [], xr, yr, labels: [], under });
});
const PL2_OPS = { '<': (v) => v < 0, '<=': (v) => v <= 1e-12, '>': (v) => v > 0, '>=': (v) => v >= -1e-12, '=': (v) => Math.abs(v) < 1e-9, '!=': (v) => Math.abs(v) > 1e-9 };
/** Clip a polygon (exact rational vertices) by a x + b y + c >= 0 (sign = 1) or <= 0 (sign = -1). */
function pl2Clip(poly, a, b, c, sign) {
  const val = (p) => a.mul(p[0]).add(b.mul(p[1])).add(c).mul(qInt(sign));
  const res = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const vp = val(p);
    const vq = val(q);
    if (vp.sign() >= 0) res.push(p);
    if ((vp.sign() > 0 && vq.sign() < 0) || (vp.sign() < 0 && vq.sign() > 0)) {
      const t = vp.div(vp.sub(vq));
      res.push([p[0].add(q[0].sub(p[0]).mul(t)), p[1].add(q[1].sub(p[1]).mul(t))]);
    }
  }
  return res.filter((p, k) => k === 0 || !(p[0].eq(res[k - 1][0]) && p[1].eq(res[k - 1][1]))).filter((p, k, arr) => !(k === arr.length - 1 && arr.length > 1 && p[0].eq(arr[0][0]) && p[1].eq(arr[0][1])));
}
const pl2Area = (poly) => {
  let s = Q0;
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length];
    s = s.add(p[0].mul(q[1]).sub(q[0].mul(p[1])));
  });
  return s.abs().div(qInt(2));
};
function pl2Region(rels, win) {
  let { xr, yr } = win;
  const { vx, vy } = win;
  const fns = rels.map((r) => {
    const F1 = pl2Fn(r.lhs, vx, vy);
    const F2 = pl2Fn(r.rhs, vx, vy);
    return (x, y) => F1(x, y) - F2(x, y);
  });
  const holds = (x, y) => rels.every((r, i) => {
    const v = fns[i](x, y);
    return isFinite(v) && PL2_OPS[r.op](v);
  });
  const out = newOut();
  const shown = rels.map((r) => showRaw(r.lhs) + ' ' + (r.op === '<=' ? '≤' : r.op === '>=' ? '≥' : r.op === '!=' ? '≠' : r.op) + ' ' + showRaw(r.rhs));
  out.answer.push('Region ' + shown.join(' and ') + ' (the picture is shown in the chat)');
  // exact corners when every condition is linear
  const forms = rels.map((r) => affineForm({ lhs: r.lhs, rhs: r.rhs }, [vx, vy]));
  if (forms.every(Boolean)) {
    const rect = (s) => {
      const cx = (xr[0] + xr[1]) / 2;
      const cy = (yr[0] + yr[1]) / 2;
      const hx = ((xr[1] - xr[0]) / 2) * s;
      const hy = ((yr[1] - yr[0]) / 2) * s;
      const q = (v) => new Q(BigInt(Math.round(v * 1e6)), 1000000n);
      return [[q(cx - hx), q(cy - hy)], [q(cx + hx), q(cy - hy)], [q(cx + hx), q(cy + hy)], [q(cx - hx), q(cy + hy)]];
    };
    const clipAll = (s) => {
      let poly = rect(s);
      rels.forEach((r, i) => {
        if (!poly.length || r.op === '!=') return;
        const f = forms[i];
        if (r.op === '=') {
          poly = pl2Clip(pl2Clip(poly, f.coef[0], f.coef[1], f.c0, 1), f.coef[0], f.coef[1], f.c0, -1);
          return;
        }
        poly = pl2Clip(poly, f.coef[0], f.coef[1], f.c0, r.op[0] === '>' ? 1 : -1);
      });
      return poly;
    };
    const small = clipAll(1);
    const big = clipAll(1000);
    if (big.length < 3 || pl2Area(big).isZero()) {
      out.work.push(big.length ? 'the conditions describe a line or a point, not an area' : 'no point satisfies all the conditions: the region is empty');
    } else {
      const onBoundary = (p) => p.some((c) => c.abs().toNumber() > 400 * Math.max(Math.abs(xr[0]), Math.abs(xr[1]), Math.abs(yr[0]), Math.abs(yr[1]), 1));
      const corners = big.filter((p) => !onBoundary(p));
      const bounded = !big.some(onBoundary);
      const cxm = corners.reduce((s, p) => s + p[0].toNumber(), 0) / (corners.length || 1);
      const cym = corners.reduce((s, p) => s + p[1].toNumber(), 0) / (corners.length || 1);
      corners.sort((p, q) => Math.atan2(p[1].toNumber() - cym, p[0].toNumber() - cxm) - Math.atan2(q[1].toNumber() - cym, q[0].toNumber() - cxm));
      out.work.push('corner points: ' + (corners.length ? corners.map((p) => '(' + qText(p[0]) + ', ' + qText(p[1]) + ')').join(', ') : 'none'));
      out.work.push(bounded ? 'the region is bounded, area = ' + qText(pl2Area(big)) : 'the region is unbounded (it continues beyond the window)');
      if (win.auto && bounded && corners.length >= 3) {
        // no window was given: fit it around the region (and the origin, so that the axes show)
        const cx = corners.map((p) => p[0].toNumber()).concat([0]);
        const cy = corners.map((p) => p[1].toNumber()).concat([0]);
        const padX = (Math.max(...cx) - Math.min(...cx)) * 0.15 || 1;
        const padY = (Math.max(...cy) - Math.min(...cy)) * 0.15 || 1;
        xr = [Math.min(...cx) - padX, Math.max(...cx) + padX];
        yr = [Math.min(...cy) - padY, Math.max(...cy) + padY];
      }
      void small;
    }
  } else out.work.push('some boundaries are curves: the picture shows the region; exact corner points are listed only when every boundary is a straight line');
  const nx = 160;
  const ny = 120;
  const dx = (xr[1] - xr[0]) / nx;
  const dy = (yr[1] - yr[0]) / ny;
  const bounds = fns.map((F) => pl2Contour(F, xr, yr, nx, ny, 0).segs);
  const under = (g, px, py) => {
    // the cells are painted opaque on a separate canvas and blended once, so that neighbouring cells leave no seams
    const off = document.createElement('canvas');
    off.width = PLOT_W;
    off.height = PLOT_H;
    const og = off.getContext('2d');
    og.fillStyle = '#1f77b4';
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        if (holds(xr[0] + (i + 0.5) * dx, yr[0] + (j + 0.5) * dy)) og.fillRect(px(xr[0] + i * dx) - 0.5, py(yr[0] + (j + 1) * dy) - 0.5, px(xr[0] + (i + 1) * dx) - px(xr[0] + i * dx) + 1, py(yr[0] + j * dy) - py(yr[0] + (j + 1) * dy) + 1);
      }
    }
    g.save();
    g.globalAlpha = 0.28;
    g.drawImage(off, 0, 0);
    g.restore();
    bounds.forEach((segs, i) => pl2DrawSegs(g, px, py, segs, '#1f4e79', 2.2, rels[i].op === '<' || rels[i].op === '>' ? [7, 5] : null));
  };
  return pl2Draw(out, { curves: [], xr, yr, labels: [], under });
}
defCmd('plotregion region shaderegion feasibleregion', (n) => {
  const args = n.args;
  const hasWin = args.length >= 7 && args[args.length - 6].t === 'var' && args[args.length - 3].t === 'var';
  const nrel = hasWin ? args.length - 6 : args.length;
  if (nrel < 1) throw new MathError('plotregion needs inequalities, e.g. plotregion(y > x^2, x + y < 3, x, -3, 3, y, -3, 5)');
  const win = hasWin ? pl2Window(args, args.length - 6, 'plotregion') : { vx: 'x', vy: 'y', xr: [-6, 6], yr: [-6, 6], auto: true };
  const rels = [];
  for (let i = 0; i < nrel; i++) {
    const idx = Number(intArg(args[i]));
    const text = PL2_REL[idx];
    if (text === undefined) throw new MathError('write each condition as an inequality, e.g. plotregion(y > x^2, x + y < 3)');
    const st = parseStatement(cleanStatement(text));
    if (st.kind === 'rel') st.conds.forEach((c) => rels.push({ lhs: c.lhs, op: c.op, rhs: c.rhs }));
    else if (st.kind === 'eq') rels.push({ lhs: st.lhs, op: '=', rhs: st.rhs });
    else throw new MathError('"' + text + '" is not an inequality');
  }
  return pl2Region(rels, win);
});

const pl2RegionShow = (n) => {
  const hasWin = n.args.length >= 7 && n.args[n.args.length - 6].t === 'var' && n.args[n.args.length - 3].t === 'var';
  const rels = (hasWin ? n.args.slice(0, -6) : n.args).map((a) => PL2_REL[Number(intArg(a))]);
  return 'region ' + rels.join(' and ').replace(/<=/g, '≤').replace(/>=/g, '≥') + (hasWin ? '  (window ' + n.args.slice(-6).map(showRaw).join(', ') + ')' : '');
};
['plotregion', 'region', 'shaderegion', 'feasibleregion'].forEach((nm) => { COMMANDS[nm].show = pl2RegionShow; });
// ---- text pre-pass: equations as implicit curves, inequalities as regions ------------------------------------------------------------
function convertPlot2(s) {
  // "graph the inequality y > 2x + 1", "shade the region x >= 0, y >= 0, x + y <= 4"
  const w = /^\s*(?:please\s+)?(?:graph|plot|sketch|shade|draw)\s+(?:the\s+)?(?:inequalit(?:y|ies)|region|solution\s+set|system\s+of\s+inequalities)?\s*:?\s*([^()]*?(?:<=|>=|≤|≥|<|>)[^()]*?)\s*$/i.exec(s);
  if (w && !/[A-Za-z]{3,}\s*\(/.test(w[1])) {
    const rels = w[1].split(/\s*(?:,|;|\band\b)\s*/).filter(Boolean);
    if (rels.length && rels.every((r) => /(?:<=|>=|≤|≥|<|>)/.test(r))) {
      s = 'plotregion(' + rels.join(', ') + ')';
    }
  }
  if (!/(plotimplicit|implicitplot|plotregion|shaderegion|feasibleregion|region)\s*\(/i.test(s)) return s;
  s = replaceCalls(s, ['plotimplicit', 'implicitplot'], (name, inner) => {
    const parts = g3SplitArgs(inner);
    const m = /^([^=<>]*[^=<>!])=([^=<>].*|)$/.exec(parts[0]);
    if (!m || /[<>]/.test(parts[0])) return null;
    parts[0] = '(' + m[1] + ') - (' + m[2] + ')';
    return name + '(' + parts.join(',') + ')';
  });
  s = replaceCalls(s, ['plotregion', 'shaderegion', 'feasibleregion', 'region'], (name, inner) => {
    const parts = g3SplitArgs(inner);
    let changed = false;
    const conv = parts.map((p) => {
      if (!/(<=|>=|≤|≥|!=|≠|<|>|=)/.test(p) || /^\s*[A-Za-z]\s*$/.test(p)) return p;
      const text = p.trim().replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/≠/g, '!=');
      PL2_REL.push(text);
      changed = true;
      return String(PL2_REL.length - 1);
    });
    return changed ? name + '(' + conv.join(',') + ')' : null;
  });
  return s;
}
