/* يستخرج نصوص data-i18n المستخدمة في القوالب مع النص العربي المقابل (لمراجعة التغطية) */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const VIEWS = path.join(ROOT, 'views');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.ejs')) out.push(full);
  }
  return out;
}

const i18nSrc = fs.readFileSync(path.join(ROOT, 'public', 'js', 'i18n.js'), 'utf8');
const enKeys = new Set([...i18nSrc.matchAll(/^\s{4}([a-z0-9_]+)\s*:/gm)].map(m => m[1]));

const used = new Map();
for (const file of walk(VIEWS)) {
  const content = fs.readFileSync(file, 'utf8');
  for (const m of content.matchAll(/data-i18n(?:-placeholder|-title|-aria)?="([^"]+)"[^>]*>([^<]{0,120})</g)) {
    const key = m[1];
    const text = (m[2] || '').replace(/\s+/g, ' ').trim();
    if (!used.has(key)) used.set(key, { text, files: new Set(), en: enKeys.has(key) });
    used.get(key).files.add(path.basename(file));
  }
}

const missing = [...used.entries()].filter(([, v]) => !v.en);
const out = [];
out.push(`TOTAL KEYS: ${used.size}`);
out.push(`MISSING IN EN: ${missing.length}`);
out.push('---');
for (const [key, v] of missing) {
  out.push(`${key} :: ${v.text} :: ${[...v.files].join(',')}`);
}
fs.writeFileSync(path.join(ROOT, 'data', 'i18n-keys.txt'), out.join('\n'), 'utf8');
console.log(out.slice(0, 2).join('\n'));
console.log('details -> data/i18n-keys.txt');
