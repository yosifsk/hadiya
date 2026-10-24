/* يضيف مفاتيح الترجمة لمستويات الأثر */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const ENTRIES = [
  ['مستويات الأثر', 'Impact levels'],
  [
    'اربط كل مبلغ بنتيجة ملموسة («٢٥$ تكفي شهر دواء لمريض»). تظهر هذه البطاقات للزوار، والضغط عليها يحدّد مبلغ التبرّع تلقائيًا.',
    'Link each amount to a concrete outcome ("$25 covers a month of medicine for one patient"). These cards appear to visitors, and clicking one sets the donation amount automatically.',
  ],
  ['+ إضافة مستوى', '+ Add a level'],
  ['اقترح من شرائح الرسوم', 'Suggest from fee tiers'],
  ['مبلغ مستوى الأثر بالدولار', 'Impact amount in USD'],
  ['مثال: تكفي شهر دواء لمريض واحد', 'e.g. covers one month of medicine'],
  ['رسوم المنصة', 'Platform fee'],
  ['+ إضافة مستوى', '+ Add a level'],
];

function insertBefore(file, marker, indent) {
  const p = path.join(ROOT, file);
  const src = fs.readFileSync(p, 'utf8');
  const existing = new Set([
    ...[...src.matchAll(/^\s*'((?:[^'\\]|\\.)*)'\s*:/gm)].map(m => m[1]),
    ...[...src.matchAll(/^\s*"((?:[^"\\]|\\.)*)"\s*:/gm)].map(m => m[1]),
    ...[...src.matchAll(/^\s{4}([a-z0-9_]+)\s*:/gm)].map(m => m[1]),
  ]);
  const fresh = ENTRIES.filter(([k]) => !existing.has(k));
  if (!fresh.length) {
    console.log(`nothing to add to ${file}`);
    return;
  }
  const lines = src.split('\n');
  const idx = lines.findIndex(l => l.trim() === marker);
  if (idx === -1) {
    console.log(`marker missing in ${file}`);
    return;
  }
  lines.splice(idx, 0, ...fresh.map(([ar, en]) => `${indent}${JSON.stringify(ar)}: ${JSON.stringify(en)},`));
  fs.writeFileSync(p, lines.join('\n'), 'utf8');
  console.log(`added ${fresh.length} to ${file}`);
}

insertBefore('public/js/i18n.js', '};', '    ');
insertBefore('public/js/i18n-phrases.js', '};', '  ');
insertBefore('public/js/i18n-app.js', '};', '  ');
