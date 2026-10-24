/* استخراج النصوص العربية الفريدة من القوالب — لبناء قاموس الترجمة */

const fs = require('fs');
const path = require('path');

const VIEWS = path.join(__dirname, '..', 'views');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.ejs')) out.push(full);
  }
  return out;
}

const unique = new Map();

for (const file of walk(VIEWS)) {
  const content = fs.readFileSync(file, 'utf8');
  // نص بين وسوم
  for (const m of content.matchAll(/>([^<>]{2,200})</g)) {
    const raw = m[1].replace(/\s+/g, ' ').trim();
    if (!/[؀-ۿ]/.test(raw)) continue;
    if (raw.includes('<%')) continue;
    if (!unique.has(raw)) unique.set(raw, { file: path.basename(file), count: 0 });
    unique.get(raw).count += 1;
  }
  // نصوص داخل attributes
  for (const m of content.matchAll(/(?:placeholder|title|aria-label)="([^"]{2,160})"/g)) {
    const raw = m[1].replace(/\s+/g, ' ').trim();
    if (!/[؀-ۿ]/.test(raw)) continue;
    if (!unique.has(raw)) unique.set(raw, { file: path.basename(file), count: 0, attr: true });
    unique.get(raw).count += 1;
  }
}

const items = [...unique.entries()].sort((a, b) => b[1].count - a[1].count);
console.log(`UNIQUE: ${items.length}`);
const out = [];
for (const [text, meta] of items) {
  out.push({ text, count: meta.count, file: meta.file, attr: !!meta.attr });
}
fs.writeFileSync(path.join(__dirname, '..', 'data', 'i18n-extract.json'), JSON.stringify(out, null, 2), 'utf8');
for (const item of out) {
  console.log(`${String(item.count).padStart(2)} | ${item.attr ? 'ATTR' : 'TEXT'} | ${item.file.padEnd(18)} | ${item.text}`);
}
