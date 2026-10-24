/* ينظّف التكرار: يحذف من قاموس EN (i18n.js) المفاتيح العربية المكرَّرة
   (هي مكانها الصحيح في قاموس العبارات i18n-phrases.js / i18n-app.js). */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const target = path.join(ROOT, 'public', 'js', 'i18n.js');

const src = fs.readFileSync(target, 'utf8');
const lines = src.split('\n');
const seen = new Set();
const out = [];
let removed = 0;

for (const line of lines) {
  // مفاتيح EN المعرّفة بلا اقتباس: name: '...'
  const unquoted = line.match(/^\s{4}([a-z0-9_]+)\s*:/);
  if (unquoted) {
    seen.add(unquoted[1]);
    out.push(line);
    continue;
  }
  // مفاتيح عربية مقتبسة داخل EN — مكانها قاموس العبارات
  const quoted = line.match(/^\s{4}(?:'([^']+)'|"([^"]+)")\s*:/);
  if (quoted) {
    removed += 1;
    continue;
  }
  out.push(line);
}

fs.writeFileSync(target, out.join('\n'), 'utf8');
console.log(`removed ${removed} duplicated quoted keys from i18n.js`);
