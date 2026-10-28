// Renders the handwritten test equations (see README.md) to out/raw-<id>.png with Chromium.
// Usage: node render.cjs [id-prefix ...]      (needs: playwright, the fonts from get-fonts.sh)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const out = path.join(__dirname, 'out');
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  const p = await b.newPage({ viewport: { width: 1300, height: 900 }, deviceScaleFactor: 2 });
  await p.goto('file://' + path.join(__dirname, 'page.html'));
  for (const f of ['Caveat', 'Kalam', 'PatrickHand', 'IndieFlower']) await p.evaluate((f) => document.fonts.load('40px ' + f), f);
  await p.evaluate(() => document.fonts.ready);
  const ids = await p.evaluate(() => window.ids);
  const only = process.argv.slice(2);
  for (const id of ids) {
    if (only.length && !only.some((o) => id.startsWith(o))) continue;
    await p.evaluate((id) => window.build(id), id);
    await p.waitForTimeout(150);
    await (await p.$('#paper')).screenshot({ path: path.join(out, 'raw-' + id + '.png') });
    console.log('rendered', id);
  }
  await b.close();
})();
