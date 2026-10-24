/* يفحص ملفًا بحثًا عن محارف CJK أو تالفة (�) */
const fs = require('fs');
const path = require('path');

const file = process.argv[2] || 'docs/COMPARISON-CHUFFED.md';
const text = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const lines = text.split('\n');
let issues = 0;
lines.forEach((line, i) => {
  const bad = [...line].filter(c => {
    const cp = c.codePointAt(0);
    return (cp >= 0x4e00 && cp <= 0x9fff) || cp === 0xfffd || (cp >= 0x3040 && cp <= 0x30ff) || (cp >= 0xac00 && cp <= 0xd7af);
  });
  if (bad.length) {
    issues += 1;
    console.log(`${i + 1}: [${bad.map(c => c.codePointAt(0).toString(16)).join(',')}] ${line.slice(0, 120)}`);
  }
});
console.log(issues ? `lines with issues: ${issues}` : 'clean — no CJK or replacement chars');
