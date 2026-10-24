/* ينظّف الكتل اليدوية المكرّرة من public/js/i18n-phrases.js
   (المصطلحات الديناميكية صارت في i18n-labels.js المولَّد آليًا).
   شغّل: node scripts/clean-i18n-phrases.js */
const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'public', 'js', 'i18n-phrases.js');
const src = fs.readFileSync(target, 'utf8');
const lines = src.split('\n');

const start = lines.findIndex(l => l.includes('\u062f\u064a\u0646\u0627\u0645\u064a\u0643\u064a'));
if (start === -1) {
  console.log('no dynamic block found — nothing to clean');
  process.exit(0);
}
let end = -1;
for (let i = start; i < lines.length; i++) {
  if (lines[i].includes('\u062a\u0631\u0648\u064a\u0633\u0629')) { end = i; break; }
}
if (end === -1) {
  console.log('no end marker found — nothing to clean');
  process.exit(0);
}
const removed = lines.splice(start, end - start);
fs.writeFileSync(target, lines.join('\n'), 'utf8');
console.log(`removed ${removed.length} lines of hand-written dynamic terms`);
