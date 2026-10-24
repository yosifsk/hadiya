/* يضيف/يصحّح مفاتيح الترجمة (EN + العبارات) */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const EN = [
  ['remove', 'Remove'],
  ['discover_title', 'Discover campaigns'],
];

const PHRASES = [
  ['إن كنت تدخل بمحفظة فقط، لا تحتاج كلمة مرور —', 'If you sign in with a wallet only, you need no password —'],
  ['اكتشف الحملات', 'Discover campaigns'],
  ['إزالة', 'Remove'],
];

function insertEn() {
  const p = path.join(ROOT, 'public', 'js', 'i18n.js');
  const src = fs.readFileSync(p, 'utf8');
  const existing = new Set([...src.matchAll(/^\s{4}([a-z0-9_]+)\s*:/gm)].map(m => m[1]));
  const fresh = EN.filter(([k]) => !existing.has(k));
  if (!fresh.length) return console.log('EN up to date');
  const lines = src.split('\n');
  const idx = lines.findIndex(l => l.trim() === '};');
  lines.splice(idx, 0, ...fresh.map(([k, v]) => `    ${k}: ${JSON.stringify(v)},`));
  fs.writeFileSync(p, lines.join('\n'), 'utf8');
  console.log(`EN: +${fresh.length}`);
}

function insertPhrases(file) {
  const p = path.join(ROOT, file);
  const src = fs.readFileSync(p, 'utf8');
  const existing = new Set([
    ...[...src.matchAll(/^\s*'((?:[^'\\]|\\.)*)'\s*:/gm)].map(m => m[1]),
    ...[...src.matchAll(/^\s*"((?:[^"\\]|\\.)*)"\s*:/gm)].map(m => m[1]),
  ]);
  const fresh = PHRASES.filter(([k]) => !existing.has(k));
  if (!fresh.length) return console.log(`${file} up to date`);
  const lines = src.split('\n');
  const idx = lines.findIndex(l => l.trim() === '};');
  lines.splice(idx, 0, ...fresh.map(([ar, en]) => `  ${JSON.stringify(ar)}: ${JSON.stringify(en)},`));
  fs.writeFileSync(p, lines.join('\n'), 'utf8');
  console.log(`${file}: +${fresh.length}`);
}

insertEn();
insertPhrases('public/js/i18n-phrases.js');
insertPhrases('public/js/i18n-app.js');
