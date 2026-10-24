/* يضيف الترجمات الناقصة المتبقّية إلى قاموس القوالب (i18n-phrases.js).
   شغّل: node scripts/add-phrase.js <key> <value>  (key/value من JSON.stringify) */
const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'public', 'js', 'i18n-phrases.js');
const src = fs.readFileSync(target, 'utf8');

const entries = [
  [
    '\u2014 \u0628\u0647\u0630\u0627 \u064a\u0635\u0628\u062d \u0639\u0646\u0648\u0627\u0646\u0643 \u0645\u0627\u0644\u0643 \u062d\u0645\u0644\u0627\u062a\u0643 \u0639\u0644\u0649 \u0627\u0644\u0633\u0644\u0633\u0644\u0629\u060c \u0648\u062a\u0633\u062a\u0637\u064a\u0639 \u0648\u062d\u062f\u0643 \u062a\u063a\u064a\u064a\u0631 \u0645\u062d\u0641\u0638\u0629 \u0627\u0644\u062c\u0647\u0629 \u0627\u0644\u0645\u0633\u062a\u0641\u064a\u062f\u0629. \u0644\u0627 \u062a\u0643\u0644\u0641\u0629 \u0648\u0644\u0627 \u0645\u0639\u0627\u0645\u0644\u0629: \u062a\u0648\u0642\u064a\u0639 \u0631\u0633\u0627\u062b\u0629 \u0648\u0627\u062d\u062f\u0629.',
    '— This makes your address the owner of your campaigns on-chain, and you alone can change the beneficiary wallet. No cost, no transaction: just one message signature.',
  ],
  [
    '\u066a)',
    '%)',
  ],
  [
    '\u0645\u0646 \u0643\u0644 \u062a\u0628\u0631\u0651\u0639\u060c \u062a\u064f\u062e\u0635\u0645 \u062f\u0627\u062e\u0644 \u0645\u0639\u0627\u0645\u0644\u0629 \u0648\u0627\u062d\u062f\u0629 \u0639\u0644\u0649 \u0627\u0644\u0633\u0644\u0633\u0644\u0629. \u0644\u0627 \u0631\u0633\u0648\u0645 \u0644\u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062d\u0645\u0644\u0629 \u0648\u0644\u0627 \u0644\u062a\u062d\u062f\u064a\u062b\u0647\u0627. \u0631\u0633\u0648\u0645 \u0627\u0644\u0634\u0628\u0643\u0629 (gas) \u064a\u062a\u062d\u0645\u0651\u0644\u0647\u0627 \u0627\u0644\u0645\u062a\u0628\u0631\u0651\u0639.',
    'From every donation it is deducted inside a single on-chain transaction. No fee to create a campaign or update it. The donor covers the network fee (gas).',
  ],
];

const lines = src.split('\n');
const lastIndex = lines.findIndex(l => l.trim() === '};');
if (lastIndex === -1) {
  console.log('dictionary end not found');
  process.exit(1);
}

const block = [];
for (const [key, value] of entries) {
  block.push(`  ${JSON.stringify(key)}: ${JSON.stringify(value)},`);
}
lines.splice(lastIndex, 0, '  // ===== نصوص طويلة نادرة =====', ...block);
fs.writeFileSync(target, lines.join('\n'), 'utf8');
console.log(`added ${entries.length} entries`);
