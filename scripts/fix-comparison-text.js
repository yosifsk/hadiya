/* يصلح المحارف التالفة/الدخيلة في المستند (قائمة استبدال صريحة) */
const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'docs', 'COMPARISON-CHUFFED.md');
let text = fs.readFileSync(target, 'utf8');

const fixes = [
  ['**م\ufffd\ufffdرّجة ذرّياً', '**مدرّجة ذرّياً'],
  ['بال\ufffd\ufffdوقيع', 'بالتوقيع'],
  ['Chuffed\u4eb2\u5207', 'Chuffed'],
  ['خطّ\u73b0\u91d1\u6d41', 'خطّ التدفّق النقدي'],
  ['\u0623\u062f\u0648\u0627\u062a \u062a\u0646\u0634\u064a\u0637_\u0627\u0644\u062a\u0642\u0646\u064a\u0629', 'أدوات تنشيط المنح'],
  ['there usecase', 'حالة استخدام خارجية'],
  ['\u0644\u0627 \u062a\u064f\u062d\u062a\u0627\u062c \u062a\u062c\u0645\u064a\u062f \u0627\u0644\u0645\u0627\u0644', 'لا تجميد المال'],
  ['\u0648\u0644\u0627 \u062a\u062c\u0645\u064a\u062f\u0641\u0648\u0646\u062f', 'ولا تجميد ardدة'],
  ['\u0644\u0627 \u062a\u062c\u0645\u064a\u062f', 'ولا تجميد'],
  ['\u062e\u0631\u0627\u0621 \u0630\u0647\u0627\u0628\u064a', 'خارج الذاكرة'],
  ['\u0645\u062a\u0646\u0648\u0639 \u0645\u0639\u0645\u0627\u0631', 'متنوع معمار'],
  ['\u0645\u062a\u0631\u0627\u062f', 'متدرج'],
  ['\u0645\u0631\u0627\u062c\u0639', 'مراجع'],
  ['\u0635\u0642\u064a', 'رقمي'],
  ['\u0633\u0644\u0645\u0627\u0646\u064a', 'سلمي'],
  ['\u0630\u0647\u0627\u0628\u064a \u0645\u062d\u0631\u0643', 'محرّك'],
];

let applied = 0;
for (const [from, to] of fixes) {
  if (text.includes(from)) {
    text = text.split(from).join(to);
    applied += 1;
  }
}

fs.writeFileSync(target, text, 'utf8');
console.log(`applied ${applied} fixes`);
