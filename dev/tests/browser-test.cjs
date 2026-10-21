// Runs the built skill page in real Chromium, OFFLINE, using the same call sequence as the app
// (AgentChatScreen.kt: load page, wait for ai_edge_gallery_get_result, call it with (JSON-quoted data, secret)).
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const file = path.resolve(process.argv[2]);
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ offline: true });
  const page = await ctx.newPage();
  const requests = [];
  const consoleErrors = [];
  page.on('request', (r) => requests.push(r.url()));
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push('console.error: ' + m.text()); });
  await page.goto('file://' + file);

  // exactly what the app evaluates after the page loaded
  const appCall = (data) => `(async function() {
      var startTs = Date.now();
      while(true) {
        if (typeof ai_edge_gallery_get_result === 'function') { break; }
        await new Promise(resolve=>{ setTimeout(resolve, 100) });
        if (Date.now() - startTs > 10000) { break; }
      }
      var result = await ai_edge_gallery_get_result(${JSON.stringify(data)}, "");
      return result;
  })()`;

  const tests = [
    [{ equation: '2x^2 - 5x + 3 = 0' }, /x = 1\b[\s\S]*x = 3\/2/],
    [{ equation: 'x² − 5x + 6 = 0' }, /x = 2[\s\S]*x = 3/],
    [{ equation: 'x + y = 10; x - y = 2' }, /x = 6, y = 4/],
    [{ equation: 'sin(x) = 1/2' }, /π\/6 \+ 2πk/],
    [{ equation: '√(x+1) = 2' }, /x = 3/],
    [{ equation: '\\frac{x+1}{2} = 3' }, /x = 5/],
    [{ equation: '2x +' }, null],
    [{ problems: ['x+1=2', '3x=9', '2+2'] }, /Problem 3[\s\S]*Answer: 4/],
    [{ equation: 'integrate(x^2*e^x, x)' }, /x² e\^x - 2x e\^x \+ 2e\^x \+ C/],
    [{ equation: '(3+4i)(1-2i)' }, /Answer: 11 - 2i/],
    [{ equation: 'v = u + a*t for t' }, /t = \(v - u\)\/a/],
    [{ equation: 'x^2 + y^2 - 6x + 4y - 12 = 0' }, /center = \(3, -2\),  radius = 5/],
    [{ equation: 'convert 5 km to miles' }, /3\.106856 miles/],
    [{ equation: 'balance C3H8 + O2 -> CO2 + H2O' }, /C3H8 \+ 5O2/],
    [{ equation: 'tcrit(0.95, 10)' }, /2\.2281389/],
    [{ equation: 'help' }, /PHOTO MATH SOLVER/],
  ];
  let bad = 0;
  for (const [data, expect] of tests) {
    const raw = await page.evaluate(appCall(JSON.stringify(data)));
    const out = JSON.parse(raw);
    const text = out.result ?? out.error;
    const ok = expect === null ? out.error !== undefined : expect.test(text);
    if (!ok) bad++;
    console.log((ok ? '✓ ' : '✗ ') + JSON.stringify(data).slice(0, 70) + '  ->  ' + text.split('\n').slice(0, 2).join(' | ').slice(0, 90));
  }
  // graphs come back as a PNG image next to the text
  for (const eq of ['plot(sin(x), x, -2*pi, 2*pi)', 'plotparam(cos(t), sin(t), t, 0, 2*pi)', 'plot y = x^2 - 4']) {
    const out = JSON.parse(await page.evaluate(appCall(JSON.stringify({ equation: eq }))));
    const png = out.image && out.image.base64 && out.image.base64.startsWith('iVBORw0KGgo');
    if (!png || !out.result) bad++;
    console.log((png && out.result ? '✓ ' : '✗ ') + eq + '  ->  image ' + (out.image ? (out.image.base64.length / 1024).toFixed(1) + ' KB base64' : 'MISSING') + (png ? ' (PNG)' : ''));
  }
  // plain-text / odd payloads a weak model might send
  for (const raw of ['3x+5=20', '"3x+5=20"', '{"equation":"3x+5=20","solve_for":"x"}', '{"equations":["x+y=3","x-y=1"]}', '{}', '']) {
    const out = JSON.parse(await page.evaluate(appCall(raw)));
    console.log('  payload ' + JSON.stringify(raw).padEnd(46) + ' -> ' + ((out.result || out.error).split('\n').find((l) => /^Answer|^Could not/.test(l)) || (out.result || out.error)).slice(0, 80));
  }

  const nonLocal = requests.filter((u) => !u.startsWith('file://') && !u.startsWith('data:'));
  console.log('\nnetwork requests (should be none):', nonLocal.length ? nonLocal : 'none');
  console.log('page errors:', consoleErrors.length ? consoleErrors : 'none');
  const html = require('fs').readFileSync(file, 'utf8');
  console.log('file is pure ASCII:', !/[^\x00-\x7f]/.test(html), '| size:', (html.length / 1024).toFixed(1) + ' KB', '| external refs:', (html.match(/(?:src|href)=["']https?:/g) || []).length, '| fetch/XHR/import in code:', /\bfetch\s*\(|XMLHttpRequest|importScripts|\bimport\s*\(/.test(html));
  await browser.close();
  process.exit(bad || nonLocal.length || consoleErrors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
