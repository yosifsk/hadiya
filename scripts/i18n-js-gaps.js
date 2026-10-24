/* يستخرج كل العبارات العربية المستخدمة في ملفات JS العامة ويقارنها بالقاموس */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const files = ['admin.js', 'app.js', 'assistant.js', 'theme.js'].map(f => path.join(ROOT, 'public', 'js', f));

const phrasesSrc = fs.readFileSync(path.join(ROOT, 'public', 'js', 'i18n-phrases.js'), 'utf8');
const labelsSrc = fs.readFileSync(path.join(ROOT, 'public', 'js', 'i18n-labels.js'), 'utf8');
const appSrc = fs.readFileSync(path.join(ROOT, 'public', 'js', 'i18n-app.js'), 'utf8');
const known = new Set([
  ...[...phrasesSrc.matchAll(/^\s*'((?:[^'\\]|\\.)*)'\s*:/gm)].map(m => m[1]),
  ...[...labelsSrc.matchAll(/^\s*"((?:[^"\\]|\\.)*)"\s*:/gm)].map(m => m[1]),
  ...[...appSrc.matchAll(/^\s*'((?:[^'\\]|\\.)*)'\s*:/gm)].map(m => m[1]),
]);

const found = new Map();
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const name = path.basename(file);
  // نتجاهل التعليقات (ليست نصوصًا مرئية)
  const code = content
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  // تتابع كلمات عربية نقي (يفصلها مسافة أو نقطتان أو شرطة وسطى أو فاصلة)
  for (const m of code.matchAll(/[\u0600-\u06FF]+(?:[\s:·،]+[\u0600-\u06FF]+)*/g)) {
    const raw = m[0].replace(/\s+/g, ' ').trim();
    if (!raw || raw.length < 2) continue;
    if (!found.has(raw)) found.set(raw, new Set());
    found.get(raw).add(name);
  }
}

const missing = [...found.entries()].filter(([text]) => !known.has(text));
const lines = missing.map(([text, files]) => `${text}\t${[...files].join(',')}`);
fs.writeFileSync(path.join(ROOT, 'data', 'i18n-js-missing.txt'), lines.join('\n'), 'utf8');
console.log(`JS phrases: ${found.size} | missing from dictionary: ${missing.length}`);
