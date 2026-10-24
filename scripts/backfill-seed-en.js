/* يضيف النسخ الإنجليزية لحملات البيانات التجريبية الموجودة (ترقية بلا فقدان بيانات).
   شغّل: node scripts/backfill-seed-en.js */
const path = require('path');
const ROOT = path.join(__dirname, '..');

const { q, run } = require(path.join(ROOT, 'src', 'db'));
const EN = require(path.join(ROOT, 'src', 'seed-en'));

const rows = q('SELECT id, title FROM campaigns ORDER BY id ASC');
let updated = 0;

rows.forEach((row, index) => {
  const en = EN[index];
  if (!en) return;
  run(
    `UPDATE campaigns SET title_en = ?, subtitle_en = ?, story_en = ?
     WHERE id = ? AND (title_en = '' OR title_en IS NULL)`,
    en.title_en || '', en.subtitle_en || '', en.story_en || '', row.id
  );
  updated += 1;
});

console.log(`campaigns: ${rows.length} | backfilled: ${updated}`);
