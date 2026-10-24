/* يضيف aria-live="polite" لعناصر الحالة الديناميكية */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const targets = [
  ['views/create.ejs', 'id="delivery-status"', 'id="delivery-status" role="status" aria-live="polite"'],
  ['views/create.ejs', 'id="organizer-status"', 'id="organizer-status" role="status" aria-live="polite"'],
  ['views/campaign.ejs', 'id="sign-campaign-status"', 'id="sign-campaign-status" role="status" aria-live="polite"'],
  ['views/create.ejs', 'id="wallet-network-hint"', 'id="wallet-network-hint" role="status" aria-live="polite"'],
];

let changed = 0;
for (const [file, from, to] of targets) {
  const p = path.join(ROOT, file);
  const src = fs.readFileSync(p, 'utf8');
  if (!src.includes(from)) {
    console.log(`skip (not found): ${file} ${from}`);
    continue;
  }
  if (src.includes(to)) {
    console.log(`already ok: ${file} ${from}`);
    continue;
  }
  fs.writeFileSync(p, src.split(from).join(to), 'utf8');
  changed += 1;
  console.log(`updated: ${file} ${from}`);
}
console.log(`changed ${changed}`);
