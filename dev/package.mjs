// Checks the skill folder the way the Gallery app needs it and writes the zip to import on the phone.
// Usage: node package.mjs <out.zip>
// The zip holds the skill folder at its top with SKILL.md directly inside and scripts/index.html beside it,
// and nothing else (the app copies everything in the folder onto the phone, tests and docs included).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const skillDir = path.join(root, 'photo-equation-solver');
const out = process.argv[2];
if (!out) { console.error('usage: node package.mjs <out.zip>'); process.exit(2); }
const problems = [];
const md = fs.existsSync(path.join(skillDir, 'SKILL.md')) ? fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8') : '';
if (!md) problems.push('SKILL.md is missing directly inside the skill folder');
const fm = /^---\n([\s\S]*?)\n---\n/.exec(md);
const name = fm && /^name:\s*(.+)$/m.exec(fm[1]);
const desc = fm && /^description:\s*(.+)$/m.exec(fm[1]);
if (!fm) problems.push('SKILL.md has no front matter');
if (fm && !name) problems.push('front matter has no name');
if (fm && !desc) problems.push('front matter has no description');
if (name && name[1].trim() !== path.basename(skillDir)) problems.push('folder name "' + path.basename(skillDir) + '" differs from the skill name "' + name[1].trim() + '"');
const script = path.join(skillDir, 'scripts', 'index.html');
if (!fs.existsSync(script)) problems.push('scripts/index.html is missing');
else {
  const html = fs.readFileSync(script, 'utf8');
  if (!/window\['ai_edge_gallery_get_result'\]/.test(html)) problems.push('index.html does not define ai_edge_gallery_get_result');
  if (/(?:src|href)=["']https?:/.test(html)) problems.push('index.html loads something from the web');
}
const shipped = ['SKILL.md', 'scripts/index.html'];
if (md.length > 2500) problems.push('SKILL.md is ' + md.length + ' bytes; the app re-reads it for every question (keep it under about 2500)');
if (problems.length) { problems.forEach((p) => console.log('✗ ' + p)); process.exit(1); }
fs.rmSync(out, { force: true });
execFileSync('zip', ['-q', path.resolve(out), ...shipped.map((f) => 'photo-equation-solver/' + f)], { cwd: root });
const listing = execFileSync('unzip', ['-Z1', path.resolve(out)], { encoding: 'utf8' }).trim().split('\n');
const wrong = listing.filter((f) => !shipped.map((s) => 'photo-equation-solver/' + s).includes(f) && f !== 'photo-equation-solver/' && f !== 'photo-equation-solver/scripts/');
if (wrong.length) { console.log('✗ unexpected entries in the zip: ' + wrong.join(', ')); process.exit(1); }
const build = /const BUILD = '([^']+)'/.exec(fs.readFileSync(script, 'utf8'));
console.log('✓ ' + out + ': ' + shipped.map((f) => f + ' (' + fs.statSync(path.join(skillDir, f)).size + ' bytes)').join(', ') + '; build ' + (build ? build[1] : '?') + '; SKILL.md about ' + Math.round(md.length / 4) + ' tokens by chars/4, description ' + desc[1].length + ' chars');
