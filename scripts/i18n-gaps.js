/* كشف النصوص العربية غير المترجمة: يقارن نصوص القوالب بقاموس العبارات */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const VIEWS = path.join(ROOT, 'views');
const PHRASES = path.join(ROOT, 'public', 'js', 'i18n-phrases.js');
const I18N = path.join(ROOT, 'public', 'js', 'i18n.js');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.ejs')) out.push(full);
  }
  return out;
}

/* استخراج مفاتيح القواميس (ملفات متعددة) */
function keysOf(file) {
  const src = fs.readFileSync(file, 'utf8');
  const keys = new Set();
  for (const m of src.matchAll(/^\s*'((?:[^'\\]|\\.)*)'\s*:/gm)) keys.add(m[1]);
  for (const m of src.matchAll(/^\s*"((?:[^"\\]|\\.)*)"\s*:/gm)) keys.add(m[1]);
  return keys;
}

const phrases = new Set([
  ...keysOf(PHRASES),
  ...keysOf(path.join(ROOT, 'public', 'js', 'i18n-app.js')),
  ...keysOf(path.join(ROOT, 'public', 'js', 'i18n-labels.js')),
]);

/* استخراج مفاتيح EN من i18n.js */
function enKeys() {
  const src = fs.readFileSync(I18N, 'utf8');
  const keys = new Set();
  for (const m of src.matchAll(/^\s{4}([a-z0-9_]+)\s*:/gm)) keys.add(m[1]);
  return keys;
}

const en = enKeys();

const unique = new Map();
for (const file of walk(VIEWS)) {
  const content = fs.readFileSync(file, 'utf8');
  const name = path.basename(file);
  for (const m of content.matchAll(/>([^<>]{2,200})</g)) {
    const raw = m[1].replace(/\s+/g, ' ').trim();
    if (!/[؀-ۿ]/.test(raw)) continue;
    if (raw.includes('<%')) continue;
    if (!unique.has(raw)) unique.set(raw, { file: name, count: 0, attr: false });
    unique.get(raw).count += 1;
  }
  for (const m of content.matchAll(/(?:placeholder|title|aria-label)="([^"]{2,160})"/g)) {
    const raw = m[1].replace(/\s+/g, ' ').trim();
    if (!/[؀-ۿ]/.test(raw)) continue;
    if (!unique.has(raw)) unique.set(raw, { file: name, count: 0, attr: true });
    unique.get(raw).count += 1;
  }
}

const missing = [];
const covered = [];
for (const [text, meta] of unique) {
  if (phrases.has(text)) { covered.push(text); continue; }
  missing.push({ text, ...meta });
}
missing.sort((a, b) => b.count - a.count || a.text.localeCompare(b.text));

console.log(`TOTAL UNIQUE : ${unique.size}`);
console.log(`COVERED      : ${covered.length}`);
console.log(`MISSING      : ${missing.length}`);
console.log('---');
for (const m of missing) {
  console.log(`${String(m.count).padStart(2)} | ${m.attr ? 'ATTR' : 'TEXT'} | ${m.file.padEnd(18)} | ${m.text}`);
}
fs.writeFileSync(path.join(ROOT, 'data', 'i18n-missing.json'), JSON.stringify(missing, null, 2), 'utf8');
