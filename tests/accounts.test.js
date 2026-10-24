/* اختبارات حسابات الإدارة وكلمات المرور (Argon2id). */

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

// قاعدة بيانات منفصلة لهذا الملف (الاختبارات تعمل بالتوازي)
const SUITE = 'accounts';
process.env.DATA_DIR = path.join(__dirname, '..', 'data', 'test', SUITE);
process.env.DB_FILE = path.join(__dirname, '..', 'data', 'test', SUITE, 'test.sqlite');
process.env.PASSWORD_PEPPER = 'test-pepper-fixed';

const passwords = require('../src/lib/passwords');
const accounts = require('../src/lib/accounts');
const { run } = require('../src/db');

test('Argon2id: التجزئة والتحقق يعملان', () => {
  const hash = passwords.hashPassword('Str0ngPassw0rd!');
  assert.ok(hash.startsWith('$argon2id$m=65536,t=3,p=1$'));
  assert.strictEqual(passwords.verifyPassword('Str0ngPassw0rd!', hash), true);
  assert.strictEqual(passwords.verifyPassword('wrong-password', hash), false);
});

test('Argon2id: كل كلمة مرور تحصل على salt مختلف', () => {
  const a = passwords.hashPassword('SamePassword123!');
  const b = passwords.hashPassword('SamePassword123!');
  assert.notStrictEqual(a, b);
  assert.strictEqual(passwords.verifyPassword('SamePassword123!', a), true);
  assert.strictEqual(passwords.verifyPassword('SamePassword123!', b), true);
});

test('Argon2id: بصمة تالفة تُرفض بدل أن ترمي خطأ', () => {
  assert.strictEqual(passwords.verifyPassword('x', 'garbage'), false);
  assert.strictEqual(passwords.verifyPassword('x', ''), false);
  assert.strictEqual(passwords.verifyPassword('x', null), false);
});

test('سياسة كلمة المرور', () => {
  assert.ok(passwords.validatePassword('short'));
  assert.ok(passwords.validatePassword('password123'));
  assert.ok(passwords.validatePassword('admin1234'));
  assert.strictEqual(passwords.validatePassword('A-very-Strong-Pass-2026'), null);
  assert.ok(passwords.validatePassword('sameasuser1', 'sameasuser1')); // مطابقة لاسم المستخدم
  assert.strictEqual(passwords.validatePassword('SameAsUser1!', 'sameasuser1'), null);
});

test('توليد كلمة مرور قوية', () => {
  const pw = passwords.randomPassword(20);
  assert.strictEqual(pw.length, 20);
  assert.notStrictEqual(pw, passwords.randomPassword(20));
  assert.strictEqual(passwords.validatePassword(pw), null);
});

test('الحساب: إنشاء ودخول بكلمة مرور صحيحة', () => {
  run('DELETE FROM admin_accounts');
  accounts.upsertAccount({ username: 'tester', password: 'Str0ngPassw0rd!', role: 'admin' });
  const ok = accounts.verifyLogin('tester', 'Str0ngPassw0rd!');
  assert.strictEqual(ok.ok, true);
  assert.strictEqual(ok.account.username, 'tester');
});

test('الحساب: دخول خاطئ يُحسب ويُقفل بعد ٥ محاولات', () => {
  run('DELETE FROM admin_accounts');
  accounts.upsertAccount({ username: 'lockme', password: 'Str0ngPassw0rd!' });
  for (let i = 1; i <= 5; i++) {
    const res = accounts.verifyLogin('lockme', `bad-${i}`);
    assert.strictEqual(res.ok, false);
  }
  const locked = accounts.verifyLogin('lockme', 'Str0ngPassw0rd!');
  assert.strictEqual(locked.ok, false);
  assert.strictEqual(locked.reason, 'locked');
});

test('الحساب: اسم مستخدم غير موجود يعطي نفس الرسالة (لا كشف وجود الحساب)', () => {
  const res = accounts.verifyLogin('ghost-user', 'whatever');
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.reason, 'invalid_credentials');
});

test('الحساب: تغيير كلمة المرور يتطلب الكلمة الحالية', () => {
  run('DELETE FROM admin_accounts');
  accounts.upsertAccount({ username: 'changer', password: 'Str0ngPassw0rd!' });
  assert.throws(() => accounts.changePassword('changer', 'wrong', 'An0therStr0ng!'), /غير صحيحة/);
  assert.strictEqual(accounts.changePassword('changer', 'Str0ngPassw0rd!', 'An0therStr0ng!'), true);
  assert.strictEqual(accounts.verifyLogin('changer', 'An0therStr0ng!').ok, true);
  assert.strictEqual(accounts.verifyLogin('changer', 'Str0ngPassw0rd!').ok, false);
});
