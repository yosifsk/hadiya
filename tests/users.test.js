/* اختبارات حسابات المستخدمين (اسم مستخدم + كلمة مرور + ربط محفظة). */

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const SUITE = 'users';
process.env.DATA_DIR = path.join(__dirname, '..', 'data', 'test', SUITE);
process.env.DB_FILE = path.join(__dirname, '..', 'data', 'test', SUITE, 'test.sqlite');
process.env.PASSWORD_PEPPER = 'test-pepper-fixed';

const users = require('../src/lib/users');
const { run } = require('../src/db');

const WALLET = '0x1111111111111111111111111111111111111111';
const WALLET2 = '0x2222222222222222222222222222222222222222';

test('إنشاء حساب مستخدم', () => {
  run('DELETE FROM users');
  const user = users.createUser({
    username: 'ahmad_2026',
    password: 'Str0ngPassw0rd!',
    displayName: 'أحمد',
  });
  assert.strictEqual(user.username, 'ahmad_2026');
  assert.strictEqual(user.display_name, 'أحمد');
  assert.strictEqual(user.wallet_address, '');
  assert.strictEqual(user.must_change_password, 1);
});

test('اسم مستخدم مكرر يُرفض', () => {
  assert.throws(() => users.createUser({ username: 'ahmad_2026', password: 'Str0ngPassw0rd!' }), /مستخدم بالفعل/);
});

test('صيغة اسم المستخدم', () => {
  assert.throws(() => users.createUser({ username: 'ab', password: 'Str0ngPassw0rd!' }));
  assert.throws(() => users.createUser({ username: 'Bad Name!', password: 'Str0ngPassw0rd!' }));
});

test('دخول بكلمة مرور صحيحة وخاطئة', () => {
  const ok = users.verifyLogin('ahmad_2026', 'Str0ngPassw0rd!');
  assert.strictEqual(ok.ok, true);
  const bad = users.verifyLogin('ahmad_2026', 'wrong-pass');
  assert.strictEqual(bad.ok, false);
  assert.strictEqual(bad.reason, 'invalid_credentials');
});

test('قفل الحساب بعد ٥ محاولات', () => {
  run('DELETE FROM users');
  users.createUser({ username: 'lockme', password: 'Str0ngPassw0rd!' });
  for (let i = 0; i < 5; i++) users.verifyLogin('lockme', `bad-${i}`);
  const locked = users.verifyLogin('lockme', 'Str0ngPassw0rd!');
  assert.strictEqual(locked.ok, false);
  assert.strictEqual(locked.reason, 'locked');
});

test('ربط محفظة بالحساب', () => {
  run('DELETE FROM users');
  users.createUser({ username: 'linker', password: 'Str0ngPassw0rd!' });
  const linked = users.linkWallet('linker', WALLET);
  assert.strictEqual(linked.wallet_address, WALLET);
  assert.strictEqual(users.findByWallet(WALLET).username, 'linker');
});

test('لا يمكن ربط نفس المحفظة بحسابين', () => {
  users.createUser({ username: 'other', password: 'Str0ngPassw0rd!' });
  assert.throws(() => users.linkWallet('other', WALLET), /حساب آخر/);
});

test('فك ربط المحفظة', () => {
  const user = users.unlinkWallet('linker');
  assert.strictEqual(user.wallet_address, '');
  assert.ok(!users.findByWallet(WALLET));
});

test('تغيير كلمة المرور للمستخدم', () => {
  run('DELETE FROM users');
  users.createUser({ username: 'changer', password: 'Str0ngPassw0rd!' });
  assert.throws(() => users.changePassword('changer', 'wrong', 'An0therStr0ng!'), /غير صحيحة/);
  assert.strictEqual(users.changePassword('changer', 'Str0ngPassw0rd!', 'An0therStr0ng!'), true);
  assert.strictEqual(users.verifyLogin('changer', 'An0therStr0ng!').ok, true);
});
