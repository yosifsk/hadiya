/* يضيف نصوص القوالب الجديدة إلى قاموس العبارات (يقرأ النص الحرفي من القالب) */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/* نصوص قابلة للتأويل: [الملف, النص العربي, الإنجليزية] */
const ENTRIES = [
  ['views/create.ejs', 'مثال: تكفي شهر دواء لمريض واحد', 'e.g. covers one month of medicine for one patient'],
  ['views/create.ejs', 'EN: covers one month of medicine', 'EN: covers one month of medicine'],
  ['views/forgot-password.ejs', 'اكتب اسم المستخدم وسنرسل لك رابطًا واحدًا لاستعادة كلمة المرور.', 'Enter your username and we will send you a one-time link to reset your password.'],
  ['views/forgot-password.ejs', 'وضع التطوير: لا يوجد خادم بريد مهيّأ، فالرابط مباشر:', 'Development mode: no mailer is configured, so the link is shown here:'],
  ['views/forgot-password.ejs', 'إن كان الحساب موجودًا، فقد أرسلنا إليه رابط استعادة صالحًا لمدة ٣٠ دقيقة. تحقّق من بريدك، وإن لم تجد الرابط اطلب واحدًا جديدًا.', 'If the account exists, we sent it a reset link valid for 30 minutes. Check your inbox — and request a new one if it is not there.'],
  ['views/forgot-password.ejs', 'اكتب اسم المستخدم كما سجّلت به.', 'Enter the username you registered with.'],
  ['views/forgot-password.ejs', 'وضع التطوير:', 'Development mode:'],
  ['views/forgot-password.ejs', 'لا يوجد خادم بريد مهيّأ، فالرابط مباشر:', 'no mailer is configured, so the link is shown here:'],
  ['views/forgot-password.ejs', 'ادخل بتوقيع المحفظة', 'sign in with your wallet'],
  ['views/forgot-password.ejs', 'إن كنت تدخل بمحفظة فقط، لا تحتاج كلمة مرور —', 'If you sign in with a wallet only, you need no password —'],
  ['views/reset-password.ejs', 'كلمة المرور الجديدة تُخزَّن بـ Argon2id، وتُنهى كل جلساتك القديمة.', 'The new password is stored with Argon2id, and all your previous sessions end.'],
  ['views/reset-password.ejs', 'بعد التغيير ستُسجَّل خروجك من كل الأجهزة — سجّل الدخول من جديد.', 'After the change you will be signed out everywhere — sign in again.'],
  ['views/login.ejs', 'حساب المشرف التجريبي — اضغط «تعبئة تلقائية» لتعبئة النموذج.', 'The demo admin account — press “Autofill” to fill the form.'],
  ['views/register.ejs', 'أو سجّل بحساب جوجل', 'Or sign in with your Google account'],
  ['views/login.ejs', 'أو', 'or'],
];

function insertPhrases(file) {
  const p = path.join(ROOT, file);
  const src = fs.readFileSync(p, 'utf8');
  const existing = new Set([
    ...[...src.matchAll(/^\s*'((?:[^'\\]|\\.)*)'\s*:/gm)].map(m => m[1]),
    ...[...src.matchAll(/^\s*"((?:[^"\\]|\\.)*)"\s*:/gm)].map(m => m[1]),
  ]);
  const fresh = ENTRIES.map(([, ar, en]) => [ar, en]).filter(([k]) => !existing.has(k));
  if (!fresh.length) return console.log(`${file}: up to date`);
  const lines = src.split('\n');
  const idx = lines.findIndex(l => l.trim() === '};');
  lines.splice(idx, 0, ...fresh.map(([ar, en]) => `  ${JSON.stringify(ar)}: ${JSON.stringify(en)},`));
  fs.writeFileSync(p, lines.join('\n'), 'utf8');
  console.log(`${file}: +${fresh.length}`);
}

insertPhrases('public/js/i18n-phrases.js');
insertPhrases('public/js/i18n-app.js');
