
// ======================================================================
// 6. Entry point used by AI Edge Gallery:  ai_edge_gallery_get_result(data)
// ======================================================================
const MAX_PROBLEMS = 8;

const PROBLEM_LABEL = /^\s*(?:\(?[a-z]\)|\(?[ivx]{1,4}\)|\(?\d{1,2}\)|\d{1,2}[.:]\s|(?:problem|question|exercise|example|ex|q|no|task)\s*\.?\s*#?\s*\d+\s*[.:)]|#\d+\s*[.:)]?\s)/i;
/** A photo with a numbered list ("1) ... 2) ...", "(a) ... (b) ...") holds separate problems, unless the lines are the equations of one system. */
function splitLabelled(text) {
  const lines = text.split('\n');
  if (lines.length < 2) return [text];
  const labelled = lines.filter((l) => PROBLEM_LABEL.test(l)).length;
  if (labelled < 2) return [text];
  const parts = [];
  let head = [];
  for (const l of lines) {
    if (PROBLEM_LABEL.test(l)) parts.push([l]);
    else if (parts.length) parts[parts.length - 1].push(l);
    else head.push(l);
  }
  // text before the first label that holds no maths (an instruction such as "Solve the following:") is dropped
  head = head.filter((l) => /[\d=+\-*/^]/.test(l));
  const bodies = parts.map((p) => p.join('\n').trim());
  if (head.length) bodies[0] = head.join('\n') + '\n' + bodies[0];
  const stripped = bodies.map((b) => stripPrintedNoise(b));
  const allEq = stripped.every((b) => /^[^=<>]*=[^=<>]*$/.test(b.replace(/\n/g, ' ')) && !/[A-Za-z]{3}/.test(b.replace(/\b(?:sin|cos|tan|cot|sec|csc|ln|log|exp|sqrt|abs|pi)\b/gi, '')));
  if (allEq) {
    const letters = new Set();
    stripped.forEach((b) => b.replace(/\b(?:sin|cos|tan|cot|sec|csc|ln|log|exp|sqrt|abs|pi)\b/gi, '').replace(/[a-z]/gi, (c) => letters.add(c.toLowerCase())));
    if (letters.size >= stripped.length) return [text];
  }
  return bodies;
}

/** Accepts {"equation": "..."}, {"problems": [...]}, a bare JSON string, or plain text. */
function parseRequest(data) {
  const raw = data === undefined || data === null ? '' : String(data).trim();
  if (!raw) throw new MathError('no equation was given (the "equation" field is empty)');
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch (e) {
    obj = raw;
  }
  const problems = [];
  let solveFor = '';
  const asText = (x) => (x && typeof x === 'object' ? String(x.equation || x.problem || x.text || '') : String(x === undefined || x === null ? '' : x));
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    solveFor = String(obj.solve_for || obj.solveFor || obj.variable || obj.unknown || '').trim();
    if (Array.isArray(obj.problems)) obj.problems.forEach((p) => problems.push(asText(p)));
    else if (Array.isArray(obj.equations)) problems.push(obj.equations.map(asText).join(';'));
    else {
      const keys = ['equation', 'problem', 'expression', 'math', 'text', 'question', 'input', 'equations', 'expressions'];
      const k = keys.find((key) => obj[key] !== undefined && obj[key] !== null && obj[key] !== '');
      if (k) problems.push(asText(obj[k]));
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((p) => problems.push(asText(p)));
  } else {
    problems.push(asText(obj));
  }
  const list = problems.map((p) => p.trim()).filter(Boolean).flatMap(splitLabelled);
  if (!list.length) throw new MathError('no equation was given (the "equation" field is empty)');
  if (list.length > MAX_PROBLEMS) throw new MathError('too many problems at once (maximum ' + MAX_PROBLEMS + ')');
  return { problems: list, solveFor };
}

function explain(e) {
  if (e instanceof MathError) return unmarkLetters(e.message);
  if (e instanceof RangeError) return 'the numbers or expression are too large to handle';
  return 'unexpected failure (' + (e && e.message ? e.message : e) + ')';
}

function run(data) {
  const { problems, solveFor } = parseRequest(data);
  if (problems.length === 1) {
    const help = helpFor(problems[0]);
    if (help) return { text: help, image: null };
    const { readAs, out } = solveProblem(problems[0], solveFor);
    const text = renderResult(readAs, out);
    return { text, image: out.image || answerCardImage(text) };
  }
  let image = null;
  const text = problems.map((p, i) => {
    try {
      const { readAs, out } = solveProblem(p, solveFor);
      if (out.image && !image) image = out.image;
      return 'Problem ' + (i + 1) + '\n' + renderResult(readAs, out);
    } catch (e) {
      return 'Problem ' + (i + 1) + '\nRead as: ' + p + '\nError: ' + explain(e);
    }
  }).join('\n\n');
  return { text, image: image || answerCardImage(text) };
}

const RETRY_HINT = ' Re-read the picture and call the tool again with the math written in plain text (digits, letters, + - * / ^ ( ), sqrt(), pi, =, <, >).';

// a small model that writes its own formulas and sums gets sent to the right help page
const HELP_TOPIC_WORDS = [
  ['finance', /\b(?:bonds?|coupons?|yield|loans?|mortgage|interest|annuit\w*|amortiz\w*|amortis\w*|depreciation|npv|irr|dividends?|principal|payback|invest\w*)\b/i],
  ['chemistry', /\b(?:molar\w*|moles?|reactants?|reagent|stoichiometry|titration|electron configuration)\b|\bpH\b/i],
  ['stats', /\b(?:probability|distribution|binomial|poisson|normal|median|variance|standard deviation|regression|correlation|t-?test|z-?test|chi|hypothesis|confidence|z-?score|sample|percentile|quartile)\b/i],
  ['matrix', /\b(?:matrix|matrices|determinant|eigen\w*|vectors?)\b/i],
  ['geometry', /\b(?:triangle|circle|sphere|polygon|ellipse|parabola|hyperbola|perimeter|radius|cylinder|cone)\b/i],
  ['number', /\b(?:prime|modulo|gcd|lcm|divisors?|permutations?|combinations?|sequence|factorial)\b/i],
  ['calculus', /\b(?:derivative|integral|integrate|limit|differentiate|series|taylor)\b/i],
  ['ode', /\b(?:differential equation|laplace|ode)\b/i],
];
function helpHint(data) {
  let text = '';
  try { text = parseRequest(data).problems.join(' '); } catch (e) { text = String(data); }
  const hit = HELP_TOPIC_WORDS.find(([, rx]) => rx.test(text));
  if (hit) return ' This looks like a ' + hit[0] + ' problem: do not write formulas or sums yourself; call the tool with {"equation": "help ' + hit[0] + '"} and use the command it shows.';
  return ' If you are unsure how to write it, call the tool with {"equation": "help"} for the list of topics.';
}

// Shown in the app's "View Console Logs" (a page, not a test run): the build number first, so a stale install is obvious.
const BUILD = '2026-10-24.1';
function logCall(...parts) {
  if (typeof document === 'undefined') return;
  try { console.log('[photo-equation-solver ' + BUILD + '] ' + parts.join(' | ')); } catch (e) { /* logging never breaks a result */ }
}

window['ai_edge_gallery_get_result'] = async (data) => {
  const t0 = Date.now();
  logCall('call', 'page up ' + (typeof performance !== 'undefined' ? Math.round(performance.now()) : '?') + ' ms', 'in: ' + String(data).slice(0, 300));
  try {
    const r = run(data);
    logCall('ok', (Date.now() - t0) + ' ms', 'text ' + r.text.length + ' chars', r.image ? 'picture yes' : 'picture no');
    return JSON.stringify(r.image ? { result: r.text, image: { base64: r.image } } : { result: r.text });
  } catch (e) {
    if (!(e instanceof MathError)) console.error(e);
    logCall('error', (Date.now() - t0) + ' ms', explain(e).slice(0, 200));
    return JSON.stringify({ error: 'Could not solve: ' + explain(e) + '.' + RETRY_HINT + helpHint(data) });
  }
};
