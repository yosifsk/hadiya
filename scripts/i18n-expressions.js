/* يكشف النصوص العربية المضمّنة داخل تعبيرات EJS (<%= ... %>) — لا يراها المستخرِج العادي */
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

const out = [];
for (const file of walk(VIEWS)) {
  const content = fs.readFileSync(file, 'utf8');
  const name = path.basename(file);
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/<%[=-]?\s*([\s\S]*?)\s*%>/g)) {
      const expr = m[1];
      // نصوص عربية داخل القيم النصية
      for (const s of expr.matchAll(/'([^']*)'|"([^"]*)"/g)) {
        const val = s[1] || s[2] || '';
        if (/[\u0600-\u06FF]/.test(val)) {
          out.push(`${name}:${i + 1} :: ${val.trim()}`);
        }
      }
    }
  });
}

fs.writeFileSync(path.join(ROOT, 'data', 'i18n-expr.txt'), out.join('\n'), 'utf8');
console.log(`expressions with Arabic literals: ${out.length}`);
