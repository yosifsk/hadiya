/* يضيف النص الطويل الناقص من account.ejs إلى القاموس (نصّه مأخوذ حرفيًا من القالب) */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const viewPath = path.join(ROOT, 'views', 'account.ejs');
const dictPath = path.join(ROOT, 'public', 'js', 'i18n-phrases.js');

const view = fs.readFileSync(viewPath, 'utf8');
const EN = '— This makes your address the owner of your campaigns on-chain, and you alone can change the beneficiary wallet. No cost, no transaction: just one message signature.';

// النص الحرفي من القالب
let target = null;
for (const raw of view.match(/>([^<>]{60,300})</g) || []) {
  const t = raw.replace(/^>|<$/g, '').replace(/\s+/g, ' ').trim();
  if (/[\u0600-\u06FF]/.test(t) && /مالك حملاتك/.test(t)) { target = t; break; }
}
if (!target) {
  console.log('the target sentence was not found in account.ejs');
  process.exit(1);
}

let dict = fs.readFileSync(dictPath, 'utf8');
// إزالة أي إدخال سابق لنفس النص
dict = dict.split('\n').filter(line => !line.includes(target.slice(0, 25))).join('\n');

const lines = dict.split('\n');
const end = lines.findIndex(l => l.trim() === '};');
const block = [
  `  ${JSON.stringify(target)}: ${JSON.stringify(EN)},`,
];
lines.splice(end, 0, '  // ===== نصوص طويلة نادرة =====', ...block);
fs.writeFileSync(dictPath, lines.join('\n'), 'utf8');
console.log(`added: ${target.slice(0, 60)}…`);
