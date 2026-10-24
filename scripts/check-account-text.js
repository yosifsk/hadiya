/* يطابق نصوص account.ejs مع القاموس ويطبع المفقود */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const view = fs.readFileSync(path.join(ROOT, 'views', 'account.ejs'), 'utf8');
const ph = fs.readFileSync(path.join(ROOT, 'public', 'js', 'i18n-phrases.js'), 'utf8');
const app = fs.readFileSync(path.join(ROOT, 'public', 'js', 'i18n-app.js'), 'utf8');

const keys = new Set();
for (const src of [ph, app]) {
  for (const m of src.matchAll(/^\s*'((?:[^'\\]|\\.)*)'\s*:/gm)) keys.add(m[1]);
  for (const m of src.matchAll(/^\s*"((?:[^"\\]|\\.)*)"\s*:/gm)) keys.add(m[1]);
}

for (const raw of view.match(/>([^<>]{20,300})</g) || []) {
  const t = raw.replace(/^>|<$/g, '').replace(/\s+/g, ' ').trim();
  if (!/[\u0600-\u06FF]/.test(t)) continue;
  if (t.includes('<%')) continue;
  console.log(`${keys.has(t) ? 'IN  ' : 'MISS'} :: ${t.slice(0, 90)}`);
}
