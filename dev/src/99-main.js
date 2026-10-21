
// ======================================================================
// 6. Entry point used by AI Edge Gallery:  ai_edge_gallery_get_result(data)
// ======================================================================
const MAX_PROBLEMS = 8;

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
    solveFor = String(obj.solve_for || obj.solveFor || obj.variable || obj.unknown || '').trim().toLowerCase();
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
  const list = problems.map((p) => p.trim()).filter(Boolean);
  if (!list.length) throw new MathError('no equation was given (the "equation" field is empty)');
  if (list.length > MAX_PROBLEMS) throw new MathError('too many problems at once (maximum ' + MAX_PROBLEMS + ')');
  return { problems: list, solveFor };
}

function explain(e) {
  if (e instanceof MathError) return e.message;
  if (e instanceof RangeError) return 'the numbers or expression are too large to handle';
  return 'unexpected failure (' + (e && e.message ? e.message : e) + ')';
}

function run(data) {
  const { problems, solveFor } = parseRequest(data);
  if (problems.length === 1) {
    const { readAs, out } = solveProblem(problems[0], solveFor);
    return renderResult(readAs, out);
  }
  return problems.map((p, i) => {
    try {
      const { readAs, out } = solveProblem(p, solveFor);
      return 'Problem ' + (i + 1) + '\n' + renderResult(readAs, out);
    } catch (e) {
      return 'Problem ' + (i + 1) + '\nRead as: ' + p + '\nError: ' + explain(e);
    }
  }).join('\n\n');
}

const RETRY_HINT = ' Re-read the picture and call the tool again with the math written in plain text (digits, letters, + - * / ^ ( ), sqrt(), pi, =, <, >).';

window['ai_edge_gallery_get_result'] = async (data) => {
  try {
    return JSON.stringify({ result: run(data) });
  } catch (e) {
    if (!(e instanceof MathError)) console.error(e);
    return JSON.stringify({ error: 'Could not solve: ' + explain(e) + '.' + RETRY_HINT });
  }
};
