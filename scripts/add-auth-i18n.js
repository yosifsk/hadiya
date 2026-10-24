/* يضيف مفاتيح الترجمة لواجهات الدخول/الاستعادة/جوجل */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const EN_ENTRIES = [
  ['forgot_title', 'Forgot your password?'],
  ['forgot_lead', 'Enter your username and we will send you a one-time link to reset your password.'],
  ['forgot_submit', 'Send the reset link'],
  ['forgot_sent', 'If the account exists, we sent it a reset link valid for 30 minutes. Check your inbox — and request a new one if it is not there.'],
  ['forgot_hint', 'Enter the username you registered with.'],
  ['forgot_again', 'Request a new link'],
  ['forgot_wallet_note', 'If you sign in with a wallet only, you need no password — '],
  ['forgot_link', 'Forgot password?'],
  ['back_to_login', 'Back to sign in'],
  ['reset_title', 'Set a new password'],
  ['reset_lead', 'The new password is stored with Argon2id, and all your previous sessions end.'],
  ['reset_note', 'After the change you will be signed out everywhere — sign in again.'],
  ['save_new_password', 'Save the new password'],
  ['demo_data', 'Demo credentials'],
  ['demo_data_hint', 'The demo admin account — press “Autofill” to fill the form.'],
  ['fill', 'Autofill'],
  ['generate_password', 'Generate a strong password'],
  ['or_separator', 'or'],
  ['register_google', 'Or sign in with your Google account'],
  ['login_admin_note', 'Platform admin? The admin panel has its own sign-in on '],
];

const PHRASE_ENTRIES = [
  ['نسيت كلمة المرور؟', 'Forgot your password?'],
  ['أدخل اسم المستخدم وسنرسل لك رابطًا واحدًا لاستعادة كلمة المرور.', 'Enter your username and we will send you a one-time link to reset your password.'],
  ['إرسال رابط الاستعادة', 'Send the reset link'],
  ['إن كان الحساب موجودًا، فقد أرسلنا إليه رابط استعادة صالحًا لمدة ٣٠ دقيقة. تحقّق من بريدك، وإن لم تجد الرابط اطلب واحدًا جديدًا.', 'If the account exists, we sent it a reset link valid for 30 minutes. Check your inbox — and request a new one if it is not there.'],
  ['اكتب اسم المستخدم كما سجّلت به.', 'Enter the username you registered with.'],
  ['طلب رابط جديد', 'Request a new link'],
  ['إن كنت تدخل بمحفظة فقط، لا تحتاج كلمة مرور — ', 'If you sign in with a wallet only, you need no password — '],
  ['رجوع لتسجيل الدخول', 'Back to sign in'],
  ['تعيين كلمة مرور جديدة', 'Set a new password'],
  ['كلمة المرور الجديدة تُخزَّن بـ Argon2id، وتُنهى كل جلساتك القديمة.', 'The new password is stored with Argon2id, and all your previous sessions end.'],
  ['بعد التغيير ستُسجَّل خروجك من كل الأجهزة — سجّل الدخول من جديد.', 'After the change you will be signed out everywhere — sign in again.'],
  ['حفظ كلمة المرور', 'Save the new password'],
  ['بيانات التجربة', 'Demo credentials'],
  ['حساب المشرف التجريبي — اضغط «تعبئة تلقائية» لتعبئة النموذج.', 'The demo admin account — press “Autofill” to fill the form.'],
  ['تعبئة تلقائية', 'Autofill'],
  ['توليد كلمة مرور قوية', 'Generate a strong password'],
  ['أو سجّل بحساب جوجل', 'Or sign in with your Google account'],
  ['تعذّر تسجيل الدخول بجوجل', 'Google sign-in failed'],
  ['تسجيل جوجل غير مهيّأ على هذا الخادم', 'Google sign-in is not configured on this server'],
  ['تعذّر التحقق من حساب جوجل', 'Could not verify the Google account'],
  ['تعذّر الاتصال بالخادم', 'Could not reach the server'],
];

function insertEn(file) {
  const p = path.join(ROOT, file);
  const src = fs.readFileSync(p, 'utf8');
  const existing = new Set([...src.matchAll(/^\s{4}([a-z0-9_]+)\s*:/gm)].map(m => m[1]));
  const fresh = EN_ENTRIES.filter(([k]) => !existing.has(k));
  if (!fresh.length) {
    console.log(`nothing to add to ${file}`);
    return;
  }
  const lines = src.split('\n');
  const idx = lines.findIndex(l => l.trim() === '};');
  lines.splice(idx, 0, ...fresh.map(([k, v]) => `    ${k}: ${JSON.stringify(v)},`));
  fs.writeFileSync(p, lines.join('\n'), 'utf8');
  console.log(`added ${fresh.length} EN keys to ${file}`);
}

function insertPhrases(file) {
  const p = path.join(ROOT, file);
  const src = fs.readFileSync(p, 'utf8');
  const existing = new Set([
    ...[...src.matchAll(/^\s*'((?:[^'\\]|\\.)*)'\s*:/gm)].map(m => m[1]),
    ...[...src.matchAll(/^\s*"((?:[^"\\]|\\.)*)"\s*:/gm)].map(m => m[1]),
  ]);
  const fresh = PHRASE_ENTRIES.filter(([k]) => !existing.has(k));
  if (!fresh.length) {
    console.log(`nothing to add to ${file}`);
    return;
  }
  const lines = src.split('\n');
  const idx = lines.findIndex(l => l.trim() === '};');
  lines.splice(idx, 0, ...fresh.map(([ar, en]) => `  ${JSON.stringify(ar)}: ${JSON.stringify(en)},`));
  fs.writeFileSync(p, lines.join('\n'), 'utf8');
  console.log(`added ${fresh.length} phrases to ${file}`);
}

insertEn('public/js/i18n.js');
insertPhrases('public/js/i18n-phrases.js');
insertPhrases('public/js/i18n-app.js');
