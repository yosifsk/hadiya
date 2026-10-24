/* اختبارات: استعادة كلمة المرور · تسجيل جوجل · مستويات الأثر */

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const SUITE = 'authflow';
process.env.DATA_DIR = path.join(__dirname, '..', 'data', 'test', SUITE);
process.env.DB_FILE = path.join(__dirname, '..', 'data', 'test', SUITE, 'test.sqlite');
process.env.PASSWORD_PEPPER = 'test-pepper-fixed';

const users = require('../src/lib/users');
const models = require('../src/models');
const { run, q } = require('../src/db');

const WALLET = '0x1111111111111111111111111111111111111111';
const OLD_PASS = 'Old-Passw0rd!2026';
const NEW_PASS = 'New-Passw0rd!2026';

function freshUser(username) {
  run('DELETE FROM users');
  run('DELETE FROM password_resets');
  return users.createUser({ username, password: OLD_PASS, displayName: 'مستخدم' });
}

/* ============ استعادة كلمة المرور ============ */

test('طلب الاستعادة يُنشئ رمزًا صالحًا', () => {
  const user = freshUser('reset_user');
  const reset = users.createPasswordReset(user.username, '127.0.0.1');
  assert.ok(reset && reset.token);
  assert.strictEqual(reset.token.length, 64);
  const row = users.readPasswordReset(reset.token);
  assert.ok(row);
  assert.strictEqual(row.username, user.username);
});

test('لا تسريب لوجود الحساب (مستخدم غير موجود)', () => {
  const reset = users.createPasswordReset('no_such_user_zzz', '127.0.0.1');
  assert.strictEqual(reset, null); // لا يُنشأ رمز — والاستجابة للزائر واحدة في كل الأحوال
});

test('الرمز أحادي الاستخدام', () => {
  const user = freshUser('reset_once');
  const reset = users.createPasswordReset(user.username, '127.0.0.1');
  assert.strictEqual(users.resetPasswordWithToken(reset.token, NEW_PASS), true);
  assert.throws(
    () => users.resetPasswordWithToken(reset.token, 'Another-Passw0rd!'),
    (err) => err.code === 'INVALID_RESET_TOKEN'
  );
});

test('تغيير كلمة المرور يجعل القديمة غير صالحة والجديدة صالحة', () => {
  const user = freshUser('reset_pw');
  const reset = users.createPasswordReset(user.username, '127.0.0.1');
  users.resetPasswordWithToken(reset.token, NEW_PASS);

  const oldResult = users.verifyLogin(user.username, OLD_PASS);
  assert.strictEqual(oldResult.ok, false);
  const newResult = users.verifyLogin(user.username, NEW_PASS);
  assert.strictEqual(newResult.ok, true);
});

test('تغيير كلمة المرور يُنهي جلسات الحساب', () => {
  const user = freshUser('reset_sessions');
  run('DELETE FROM sessions');
  run(
    "INSERT INTO sessions (token, address, created_at, expires_at) VALUES (?,?,datetime('now'),?)",
    'sess-token-1',
    `user:${user.username}`,
    new Date(Date.now() + 3600_000).toISOString()
  );
  const reset = users.createPasswordReset(user.username, '127.0.0.1');
  users.resetPasswordWithToken(reset.token, NEW_PASS);
  const left = q('SELECT * FROM sessions WHERE address = ?', `user:${user.username}`);
  assert.strictEqual(left.length, 0);
});

test('رمز منتهي الصلاحية يُرفض', () => {
  const user = freshUser('reset_expired');
  const reset = users.createPasswordReset(user.username, '127.0.0.1');
  run("UPDATE password_resets SET expires_at = ? WHERE token = ?", new Date(Date.now() - 1000).toISOString(), reset.token);
  assert.strictEqual(users.readPasswordReset(reset.token), null);
  assert.throws(
    () => users.resetPasswordWithToken(reset.token, NEW_PASS),
    (err) => err.code === 'INVALID_RESET_TOKEN'
  );
});

test('كلمة المرور الجديدة تخضع لسياسة القوة', () => {
  const user = freshUser('reset_policy');
  const reset = users.createPasswordReset(user.username, '127.0.0.1');
  assert.throws(() => users.resetPasswordWithToken(reset.token, '123'), /خانات/);
});

/* ============ تسجيل جوجل ============ */

test('تسجيل جوجل يُنشئ حسابًا مرة واحدة فقط', () => {
  run('DELETE FROM users');
  const first = users.loginWithGoogle({ email: 'person@example.com', sub: 'google-sub-1', name: 'Person' });
  assert.ok(first.username);
  assert.strictEqual(first.email, 'person@example.com');
  assert.strictEqual(first.google_sub, 'google-sub-1');

  const second = users.loginWithGoogle({ email: 'person@example.com', sub: 'google-sub-1' });
  assert.strictEqual(second.id, first.id);
  assert.strictEqual(q('SELECT * FROM users').length, 1);
});

test('حساب باسم مستخدم فقط لا يُربط تلقائيًا (لا بريد ⇒ لا دليل ملكية)', () => {
  run('DELETE FROM users');
  const created = users.createUser({ username: 'linked_user', password: OLD_PASS });
  // لا يوجد بريد على الحساب ⇒ لا يمكن ربطه بجوجل دون إثبات من صاحب الحساب
  const googleUser = users.loginWithGoogle({ email: 'linked@example.com', sub: 'google-sub-2' });
  assert.notStrictEqual(googleUser.id, created.id);
  assert.strictEqual(googleUser.email, 'linked@example.com');
});

test('تسجيل جوجل ببريد مسجّل على حساب يربط به', () => {
  run('DELETE FROM users');
  const created = users.createUser({ username: 'mail_user', password: OLD_PASS });
  run("UPDATE users SET email = 'mail@example.com' WHERE id = ?", created.id);
  const linked = users.loginWithGoogle({ email: 'mail@example.com', sub: 'google-sub-3' });
  assert.strictEqual(linked.id, created.id);
});

/* ============ مستويات الأثر ============ */

test('إضافة مستويات الأثر وقراءتها', () => {
  run('DELETE FROM campaigns');
  run('DELETE FROM impact_levels');
  const campaign = models.createCampaign({
    title: 'حملة مستويات الأثر',
    story: 'وصف',
    charity_wallet: WALLET,
    chain_id: 8453,
  });
  const l1 = models.addImpactLevel(campaign.id, { amount_usd: 25, label: 'تكفي شهر دواء لمريض', label_en: 'Covers a month of medicine' });
  const l2 = models.addImpactLevel(campaign.id, { amount_usd: 100, label: 'مستلزمات مدرسية لثلاثة أطفال' });
  assert.ok(l1.id && l2.id);

  const list = models.listImpactLevels(campaign.id);
  assert.strictEqual(list.length, 2);
  assert.strictEqual(list[0].amount_usd, 25);
  assert.strictEqual(list[0].label_en, 'Covers a month of medicine');
});

test('مبلغ غير صالح يُرفض', () => {
  const campaign = models.createCampaign({ title: 'حملة مبلغ', story: 'x', charity_wallet: WALLET, chain_id: 8453 });
  assert.throws(() => models.addImpactLevel(campaign.id, { amount_usd: 0, label: 'x' }), (err) => err.code === 'INVALID_AMOUNT');
  assert.throws(() => models.addImpactLevel(campaign.id, { amount_usd: -5, label: 'x' }), (err) => err.code === 'INVALID_AMOUNT');
  assert.throws(() => models.addImpactLevel(campaign.id, { amount_usd: 2_000_000, label: 'x' }), (err) => err.code === 'INVALID_AMOUNT');
});

test('عنوان محفظة داخل نصّ الأثر يُرفض', () => {
  const campaign = models.createCampaign({ title: 'حملة عنوان', story: 'x', charity_wallet: WALLET, chain_id: 8453 });
  assert.throws(
    () => models.addImpactLevel(campaign.id, { amount_usd: 25, label: `اكتب على ${WALLET}` }),
    (err) => err.code === 'WALLET_ADDRESS_NOT_ALLOWED'
  );
});

test('تعديل وحذف مستوى الأثر', () => {
  const campaign = models.createCampaign({ title: 'حملة تعديل', story: 'x', charity_wallet: WALLET, chain_id: 8453 });
  const level = models.addImpactLevel(campaign.id, { amount_usd: 50, label: 'قبل' });
  const updated = models.updateImpactLevel(level.id, { amount_usd: 75, label: 'بعد' });
  assert.strictEqual(updated.amount_usd, 75);
  assert.strictEqual(updated.label, 'بعد');
  assert.strictEqual(models.deleteImpactLevel(level.id), true);
  assert.strictEqual(models.listImpactLevels(campaign.id).length, 0);
});

test('replaceImpactLevels يستبدل الكل', () => {
  const campaign = models.createCampaign({ title: 'حملة استبدال', story: 'x', charity_wallet: WALLET, chain_id: 8453 });
  models.addImpactLevel(campaign.id, { amount_usd: 10, label: 'قديم' });
  const created = models.replaceImpactLevels(campaign.id, [
    { amount_usd: 20, label: 'جديد ١' },
    { amount_usd: 30, label: 'جديد ٢', label_en: 'new 2' },
  ]);
  assert.strictEqual(created.length, 2);
  const list = models.listImpactLevels(campaign.id);
  assert.strictEqual(list.length, 2);
  assert.strictEqual(list[0].label, 'جديد ١');
  assert.strictEqual(list[1].label_en, 'new 2');
});
