/* يضيف مفاتيح الترجمة العربية/الإنجليزية لعنوان الاستلام (يُطبَّق على i18n.js و i18n-app.js) */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const ENTRIES = [
  ['عنوان الاستلام', 'Delivery address'],
  ['توقيع وإثبات العنوان', 'Sign & prove the address'],
  [
    'العنوان الذي سيصل إليه التبرّع فعليًا (عنوان المستلم أو الجهة المنفّذة). نطلب توقيعًا واحدًا من محفظتك لإثبات ملكيته — بلا توقيع لا يُقبل.',
    'The address where the funds actually land (the recipient or the delivering organisation). We request one signature from your wallet to prove ownership — without it the field is rejected.',
  ],
  [
    'العنوان الذي تصل إليه مبالغ التبرّع. يجب أن يطابق شبكة الحملة: عنوان EVM يبدأ بـ 0x، وعنوان TRON يبدأ بحرف T.',
    'The address where the donation amounts land. It must match the campaign network: an EVM address starts with 0x, a TRON address starts with T.',
  ],
  [
    'عنوان الاستلام لم يُثبت بتوقيع صالح من صاحب العنوان. اطلب التوقيع من محفظتك ثم أعد المحاولة.',
    'The delivery address was not proven by a valid signature from its owner. Request the signature from your wallet and try again.',
  ],
  [
    'صيغة العنوان غير صحيحة — عنوان EVM يبدأ بـ 0x أو عنوان TRON بحرف T.',
    'Invalid address format — an EVM address starts with 0x, a TRON address with T.',
  ],
  ['أدخل عنوان الاستلام أولًا.', 'Enter the delivery address first.'],
  ['العنوان لا يطابق حساب محفظتك — وقّع بالعنوان نفسه.', 'The address does not match your wallet account — sign with that same address.'],
  ['✔ تم إثبات العنوان بتوقيع صالح.', '✔ The address was proven with a valid signature.'],
  ['جارٍ فتح المحفظة…', 'Opening your wallet…'],
];

function insertBefore(file, marker, lines) {
  let src = fs.readFileSync(file, 'utf8');
  const text = src.split('\n');
  const idx = text.findIndex(l => l.trim() === marker);
  if (idx === -1) {
    console.log(`marker not found in ${path.basename(file)}`);
    return false;
  }
  // نتجنّب التكرار
  const existing = new Set(
    [...src.matchAll(/^\s*'((?:[^'\\]|\\.)*)'\s*:/gm)].map(m => m[1])
  );
  const fresh = ENTRIES.filter(([key]) => !existing.has(key));
  if (!fresh.length) {
    console.log(`entries already present in ${path.basename(file)}`);
    return false;
  }
  const block = fresh.map(([ar, en]) => `    ${JSON.stringify(ar)}: ${JSON.stringify(en)},`);
  text.splice(idx, 0, '    // ===== عنوان الاستلام =====', ...block);
  fs.writeFileSync(file, text.join('\n'), 'utf8');
  console.log(`added ${fresh.length} entries to ${path.basename(file)}`);
  return true;
}

insertBefore(path.join(ROOT, 'public', 'js', 'i18n.js'), '};');
insertBefore(path.join(ROOT, 'public', 'js', 'i18n-app.js'), '};');
insertBefore(path.join(ROOT, 'public', 'js', 'i18n-phrases.js'), '};');
