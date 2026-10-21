// Concatenates src/*.js into one self-contained index.html (no external resources).
// All non-ASCII characters are written as \uXXXX escapes so the file is pure ASCII and
// renders identically no matter which charset the host assumes.
// Usage: node build.mjs [output index.html] [--expose]
// Default output: ../photo-equation-solver/scripts/index.html
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : path.join(here, '..', 'photo-equation-solver', 'scripts', 'index.html');
const expose = process.argv.includes('--expose');

const srcDir = path.join(here, 'src');
const parts = fs.readdirSync(srcDir).filter((f) => f.endsWith('.js')).sort();
let body = parts.map((f) => fs.readFileSync(path.join(srcDir, f), 'utf8').trimEnd()).join('\n');
body = body.replace(/[^\x00-\x7e]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
if (/[^\x00-\x7e]/.test(body.replace(/\\u[0-9a-f]{4}/g, ''))) throw new Error('non-ASCII left over');

// For the tests only (--expose): export every top-level function / class / const of the page.
const names = [...body.matchAll(/^(?:async\s+)?(?:function\s*\*?|class|const|let)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
const seen = new Map();
for (const f of parts) {
  const text = fs.readFileSync(path.join(srcDir, f), 'utf8');
  for (const m of text.matchAll(/^(?:async\s+)?(?:function\s*\*?|class|const|let)\s+([A-Za-z_$][\w$]*)/gm)) {
    if (seen.has(m[1])) throw new Error('duplicate top-level name "' + m[1] + '" in ' + f + ' (first in ' + seen.get(m[1]) + ')');
    seen.set(m[1], f);
  }
}
const testHook = expose ? '\nwindow.__test = { ' + [...new Set(names)].join(', ') + ' };' : '';

const html = `<!--
  Photo Equation Solver - AI Edge Gallery skill script.
  Fully self-contained: no network access, no external libraries.
  The model reads the equation from the photo; this page does the maths exactly.
-->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Photo Equation Solver</title>
  </head>
  <body>
    <script>
(function () {
'use strict';
${body}${testHook}
})();
    </script>
  </body>
</html>
`;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('wrote', out, (html.length / 1024).toFixed(1) + ' KB');
