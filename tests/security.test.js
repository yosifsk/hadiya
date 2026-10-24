/* اختبارات الأمان: المصادقة الإدارية، CSRF، سجل التدقيق، وحدود شرائح الرسوم. */

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

// قاعدة بيانات منفصلة لهذا الملف (الاختبارات تعمل بالتوازي)
const SUITE = 'security';
process.env.DATA_DIR = path.join(__dirname, '..', 'data', 'test', SUITE);
process.env.DB_FILE = path.join(__dirname, '..', 'data', 'test', SUITE, 'test.sqlite');

const admin = require('../src/lib/admin');
const audit = require('../src/lib/audit');
const fees = require('../src/lib/fees');
const { getSetting, setSetting } = require('../src/db');

test('مفتاح الإدارة: يُرفض الفارغ والخاطئ ويُقبل الصحيح', () => {
  process.env.ADMIN_KEY = 'test-admin-key-123456';
  assert.strictEqual(admin.checkAdminKey(''), false);
  assert.strictEqual(admin.checkAdminKey(null), false);
  assert.strictEqual(admin.checkAdminKey('wrong-key'), false);
  assert.strictEqual(admin.checkAdminKey('test-admin-key-123456'), true);
});

test('مفتاح الإدارة: لا يُقبل من البصمة المخزّنة إذا اختلف', () => {
  process.env.ADMIN_KEY = 'test-admin-key-123456';
  setSetting('admin_key_hash', admin.hashKey('different-key'));
  assert.strictEqual(admin.checkAdminKey('different-key'), true);
  assert.strictEqual(admin.checkAdminKey('test-admin-key-123456'), true); // Env ما زال صالحًا
  // حذف بصمة DB
  require('../src/db').run('DELETE FROM settings WHERE key = ?', 'admin_key_hash');
  assert.strictEqual(admin.checkAdminKey('different-key'), false);
});

test('مقارنة constant-time لا تكشف الفرق بالطول', () => {
  const a = admin.hashKey('abc');
  assert.strictEqual(admin.safeEqualHex(a, admin.hashKey('abd')), false);
  assert.strictEqual(admin.safeEqualHex(a, admin.hashKey('abc')), true);
  assert.strictEqual(admin.safeEqualHex(a, 'zz'), false);
});

test('CSRF: يُرفض بدون ترويسة أو بترويسة غير مطابقة', () => {
  const req = { cookies: { hadba_csrf: 'abc123' }, headers: {} };
  assert.strictEqual(admin.checkCsrf(req), false);
  req.headers['x-csrf-token'] = 'different';
  assert.strictEqual(admin.checkCsrf(req), false);
  req.headers['x-csrf-token'] = 'abc123';
  assert.strictEqual(admin.checkCsrf(req), true);
});

test('المصادقة الإدارية: ترفض بدون مفتاح أو جلسة', () => {
  const req = { headers: {}, cookies: {}, query: {} };
  const res = admin.authenticate(req);
  assert.strictEqual(res.ok, false);
  // المفتاح عبر query string غير مقبول (تفادي التسريب في السجلات)
  const req2 = { headers: {}, cookies: {}, query: { key: 'test-admin-key-123456' } };
  assert.strictEqual(admin.authenticate(req2).ok, false);
});

test('المصادقة الإدارية: تقبل المفتاح عبر الترويسة', () => {
  const req = { headers: { 'x-admin-key': 'test-admin-key-123456' }, cookies: {}, query: {} };
  const res = admin.authenticate(req);
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.actor, 'key');
});

test('سجل التدقيق: يسجّل الفاعل والإجراء وقبل/بعد', () => {
  const id = audit.logAction({
    actor: 'tester',
    action: 'fees.update',
    target: 'chain:8453',
    before: { bps: 900 },
    after: { bps: 700 },
    ip: '127.0.0.1',
  });
  assert.ok(id > 0);
  const entry = audit.listActions({ limit: 1 })[0];
  assert.strictEqual(entry.actor, 'tester');
  assert.strictEqual(entry.action, 'fees.update');
  assert.ok(entry.before.includes('900'));
  assert.ok(entry.after.includes('700'));
});

test('عناوين المشرفين: تتحقق من الصيغة وتُخزَّن', () => {
  const list = admin.setAdminAddresses([
    '0x1111111111111111111111111111111111111111',
    'invalid',
    '0x2222222222222222222222222222222222222222',
  ]);
  assert.strictEqual(list.length, 2);
  assert.ok(admin.isAdminAddress('0x1111111111111111111111111111111111111111'));
  assert.ok(!admin.isAdminAddress('0x3333333333333333333333333333333333333333'));
});

test('شرائح الرسوم: إعداد قاعدة البيانات يغلب config/brand.js', () => {
  setSetting('fee_tiers_config', JSON.stringify([
    { maxUsd: 100, bps: 900 },
    { maxUsd: null, bps: 300 },
  ]));
  assert.strictEqual(fees.feeBpsForUsd(50), 900);
  assert.strictEqual(fees.feeBpsForUsd(150), 300);
  // استعادة
  require('../src/db').run('DELETE FROM settings WHERE key = ?', 'fee_tiers_config');
  assert.strictEqual(fees.feeBpsForUsd(50), 900);
  assert.strictEqual(fees.feeBpsForUsd(250), 700);
});
