/* يستبدل أسماء فئات الأسئلة الثنائية اللغة في src/lib/faq.js
   (تصبح { ar, en } بدل نص عربي واحد) — وتشغيله مرة واحدة فقط. */
const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'lib', 'faq.js');
let src = fs.readFileSync(target, 'utf8');

const EN = {
  basics: 'Basics',
  donate: 'Donating',
  fees: 'Fees',
  money: 'Money & tax',
  safety: 'Safety & scams',
  campaign: 'Creating campaigns',
  account: 'Account & sign-in',
  technical: 'Technical',
  privacy: 'Privacy',
  legal: 'Legal',
};

const lines = src.split('\n');
let inCategories = false;
let changed = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (/^const CATEGORIES\s*=\s*\{/.test(line)) { inCategories = true; continue; }
  if (inCategories && /^\};/.test(line)) { inCategories = false; continue; }
  if (!inCategories) continue;
  const m = line.match(/^(\s*)([a-z]+):\s*'([^']*)',\s*$/);
  if (!m) continue;
  const [, indent, key, ar] = m;
  const en = EN[key];
  if (!en) continue;
  lines[i] = `${indent}${key}: { ar: '${ar}', en: '${en}' },`;
  changed += 1;
}

fs.writeFileSync(target, lines.join('\n'), 'utf8');
console.log(`converted ${changed} category labels to bilingual`);
