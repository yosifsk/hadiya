/* يضيف مفتاح ترجمة زر القائمة */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const p = path.join(ROOT, 'public', 'js', 'i18n.js');
const src = fs.readFileSync(p, 'utf8');
if (/^\s{4}menu_label\s*:/m.test(src)) {
  console.log('menu_label exists');
  process.exit(0);
}
const lines = src.split('\n');
const idx = lines.findIndex(l => l.trim() === '};');
lines.splice(idx, 0, '    menu_label: "Menu",');
fs.writeFileSync(p, lines.join('\n'), 'utf8');
console.log('added menu_label');
