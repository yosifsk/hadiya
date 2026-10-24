/* يولّد public/js/i18n-labels.js من مصدر الحقيقة (config + view-helpers)
   حتى تُطابَق النصوص الديناميكية (فئات/شبكات/هوية) ترجمةً بدقّة دون كتابة يدوية.
   شغّل: node scripts/build-i18n-labels.js */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const chains = require(path.join(ROOT, 'config', 'chains'));
const brand = require(path.join(ROOT, 'config', 'brand'));
const { CATEGORY_LABELS } = require(path.join(ROOT, 'src', 'view-helpers'));

const map = {};

// فئات الحملات
for (const [key, entry] of Object.entries(CATEGORY_LABELS)) {
  if (entry.ar && entry.en && entry.ar !== entry.en) map[entry.ar] = entry.en;
}

// أسماء الشبكات
const CHAINS = chains.CHAINS || chains.chains || {};
for (const chain of Object.values(CHAINS)) {
  if (chain.nameAr && chain.name && chain.nameAr !== chain.name) map[chain.nameAr] = chain.name;
}

// الهوية
if (brand.nameAr && brand.name) map[brand.nameAr] = brand.name;
if (brand.tagline && brand.taglineEn) map[brand.tagline] = brand.taglineEn;

const entries = Object.entries(map)
  .sort((a, b) => a[0].localeCompare(b[0], 'ar'))
  .map(([ar, en]) => `  ${JSON.stringify(ar)}: ${JSON.stringify(en)},`)
  .join('\n');

const out = `/* ============================================================
   HADIYA — مصطلحات ديناميكية (عربي → إنجليزي)
   مُولَّد آليًا من config/chains.js و config/brand.js و view-helpers.
   لا تعدّله يدويًا: عدّل المصدر ثم شغّل: node scripts/build-i18n-labels.js
   ============================================================ */

window.HADIYA_LABELS = {
${entries}
};
`;

const target = path.join(ROOT, 'public', 'js', 'i18n-labels.js');
fs.writeFileSync(target, out, 'utf8');
console.log(`wrote ${target} — ${Object.keys(map).length} entries`);
