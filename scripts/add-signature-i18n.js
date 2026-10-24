/* يضيف مفاتيح الترجمة لتدفّق التوقيع (i18n.js + i18n-phrases.js + i18n-app.js) */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const ENTRIES = [
  ['محفظة المنظّم (إثبات الملكية)', 'Organizer wallet (proof of ownership)'],
  ['توقيع وإثبات الملكية', 'Sign & prove ownership'],
  [
    'محفظة المنظّم: وقّع بالعنوان نفسه عند الحفظ. إن لم توقّع الآن، ستُراجع حملتك أولًا ثم نطلب منك التوقيع لإتمام النشر.',
    'Organizer wallet: sign with that same address when saving. If you skip it now, your campaign is reviewed first and we then ask you to sign to complete publishing.',
  ],
  [
    'تمت مراجعة حملتك ووافق عليها فريق المراجعة. بقي خطوة أخيرة: ضع محفظة منظّم الحملة ووقّع بالعنوان نفسه لإتمام النشر.',
    'Your campaign was reviewed and approved. One last step: add the organizer wallet and sign with that address to complete publishing.',
  ],
  [
    'تمت مراجعة هذه الحملة ووافق عليها الفريق، وهي بانتظار توقيع منظّم الحملة لإتمام النشر.',
    'This campaign was reviewed and approved, and is waiting for the organizer signature to complete publishing.',
  ],
  ['توقيع وإرسال للمراجعة', 'Sign & send for review'],
  ['إثبات ملكية محفظة المنظّم', 'Proof of organizer wallet ownership'],
  ['جارٍ فتح المحفظة…', 'Opening your wallet…'],
  ['لا يوجد محفظة في المتصفح', 'No wallet detected in the browser'],
  ['العنوان لا يطابق حساب محفظتك — وقّع بالعنوان نفسه.', 'The address does not match your wallet account — sign with that same address.'],
  ['✔ تم إثبات العنوان بتوقيع صالح.', '✔ The address was proven with a valid signature.'],
  ['فشلت العملية', 'The operation failed'],
  ['توقيع محفظة المنظّم غير صالح — أعد التوقيع من محفظتك ثم احفظ الحملة مجددًا.', 'The organizer wallet signature is invalid — sign again from your wallet and save the campaign.'],
  ['توقيع محفظة المنظّم ناقص — وقّع بالعنوان نفسه ثم احفظ الحملة.', 'The organizer wallet signature is missing — sign with the same address, then save.'],
  ['بانتظار توقيع المنظّم', 'Awaiting organizer signature'],
  ['محفظة المنظّم', 'Organizer wallet'],
];

function insertBefore(file, marker, lines, indent) {
  let src = fs.readFileSync(file, 'utf8');
  const existing = new Set([
    ...[...src.matchAll(/^\s*'((?:[^'\\]|\\.)*)'\s*:/gm)].map(m => m[1]),
    ...[...src.matchAll(/^\s*"((?:[^"\\]|\\.)*)"\s*:/gm)].map(m => m[1]),
    ...[...src.matchAll(/^\s{4}([a-z0-9_]+)\s*:/gm)].map(m => m[1]),
  ]);
  const fresh = ENTRIES.filter(([key]) => !existing.has(key));
  if (!fresh.length) {
    console.log(`nothing to add to ${path.basename(file)}`);
    return false;
  }
  const text = src.split('\n');
  const idx = text.findIndex(l => l.trim() === marker);
  if (idx === -1) {
    console.log(`marker not found in ${path.basename(file)}`);
    return false;
  }
  const block = fresh.map(([ar, en]) => `${indent}${JSON.stringify(ar)}: ${JSON.stringify(en)},`);
  text.splice(idx, 0, ...block);
  fs.writeFileSync(file, text.join('\n'), 'utf8');
  console.log(`added ${fresh.length} entries to ${path.basename(file)}`);
  return true;
}

insertBefore(path.join(ROOT, 'public', 'js', 'i18n.js'), '};', ENTRIES, '    ');
insertBefore(path.join(ROOT, 'public', 'js', 'i18n-phrases.js'), '};', ENTRIES, '  ');
insertBefore(path.join(ROOT, 'public', 'js', 'i18n-app.js'), '};', ENTRIES, '  ');
