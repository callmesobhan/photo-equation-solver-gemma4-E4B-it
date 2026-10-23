// ======================================================================
// Answer card: the exact "Read as" and "Answer" lines drawn as a picture. The model's own sentence in the chat can
// copy a digit wrongly; the picture is the solver's result, untouched, and is shown to the user next to it.
// ======================================================================
const CARD_W = 680;
const CARD_MAX_LINES = 22;

/** The Read as / Answer part of one result: everything before Working, Check and Note lines. */
function cardLines(text) {
  const keep = [];
  let skipping = false;
  text.split('\n').forEach((l) => {
    if (/^(?:Working:|Check:|Note:)/.test(l)) skipping = true;
    else if (/^(?:Read as:|Answer:|Problem \d+$|Error:)/.test(l)) skipping = false;
    if (!skipping) keep.push(l);
  });
  return keep.filter((l, i) => l.trim() || (i > 0 && keep[i - 1].trim()));
}

function wrapCardLine(g, line, maxW) {
  const lead = /^\s*/.exec(line)[0];
  const words = line.trim().split(/(\s+)/);
  const rows = [];
  let cur = lead;
  words.forEach((w) => {
    while (g.measureText(w).width > maxW) {
      let k = w.length - 1;
      while (k > 1 && g.measureText(w.slice(0, k)).width > maxW - g.measureText(cur).width) k--;
      rows.push(cur + w.slice(0, k));
      cur = lead;
      w = w.slice(k);
    }
    if (g.measureText(cur + w).width > maxW && cur.trim()) {
      rows.push(cur.replace(/\s+$/, ''));
      cur = lead + (/^\s+$/.test(w) ? '' : w);
    } else cur += w;
  });
  rows.push(cur.replace(/\s+$/, ''));
  return rows;
}

/** Base64 PNG of the Read as / Answer lines, or null when there is no canvas (or nothing worth showing). */
function answerCardImage(text) {
  try {
    const lines = cardLines(text);
    if (!lines.length) return null;
    const canvas = document.createElement('canvas');
    const g0 = canvas.getContext('2d');
    const FONT = '-apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif';
    const PAD = 20;
    const LH = 29;
    g0.font = '20px ' + FONT;
    let rows = [];
    lines.forEach((l) => wrapCardLine(g0, l, CARD_W - 2 * PAD).forEach((r) => rows.push({ t: r, bold: /^(?:Answer|\s{2,}\S)/.test(r) && !/^Read as/.test(r) })));
    if (rows.length > CARD_MAX_LINES) rows = rows.slice(0, CARD_MAX_LINES - 1).concat([{ t: '...', bold: false }]);
    const H = 2 * PAD + 26 + rows.length * LH;
    canvas.width = CARD_W;
    canvas.height = H;
    const g = canvas.getContext('2d');
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, CARD_W, H);
    g.fillStyle = '#e8f0fe';
    g.fillRect(0, 0, CARD_W, 8);
    g.textBaseline = 'alphabetic';
    g.fillStyle = '#5f6368';
    g.font = '14px ' + FONT;
    g.fillText('Exact result from the solver (the chat text may differ)', PAD, PAD + 12);
    let y = PAD + 26 + 22;
    rows.forEach((r) => {
      g.fillStyle = r.bold ? '#0b57d0' : '#202124';
      g.font = (r.bold ? 'bold ' : '') + '20px ' + FONT;
      g.fillText(r.t, PAD, y);
      y += LH;
    });
    const url = canvas.toDataURL('image/png');
    return url.slice(url.indexOf(',') + 1);
  } catch (e) {
    return null;
  }
}
