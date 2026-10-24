/* يستخرج تفاصيل إخفاقات Lighthouse (تباين/ترتيب العناوين) */
const fs = require('fs');
const path = require('path');

const file = process.argv[2];
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const lhr = data.lhr || data;

for (const id of ['color-contrast', 'heading-order']) {
  const audit = (lhr.audits || {})[id];
  if (!audit) continue;
  console.log(`\n=== ${id}: ${audit.score === 1 ? 'PASS' : 'FAIL'} ===`);
  const items = (audit.details && audit.details.items) || [];
  for (const item of items.slice(0, 12)) {
    const node = item.node || {};
    const snippet = (node.snippet || '').slice(0, 150);
    const selector = node.selector || '';
    const explanation = node.explanation || (item.failureSummary || '').replace(/<[^>]+>/g, '').slice(0, 200);
    console.log(`- ${selector}\n    ${snippet}\n    ${explanation}`);
  }
}
