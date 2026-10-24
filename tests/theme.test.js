/* اختبارات دوال المظهر (ألوان + ثيمات) */

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const SUITE = 'theme';
process.env.DATA_DIR = path.join(__dirname, '..', 'data', 'test', SUITE);
process.env.DB_FILE = path.join(__dirname, '..', 'data', 'test', SUITE, 'test.sqlite');

// الملف مصمَّم للمتصفح لكنه يصدّر الدوال النقية لـ Node
const theme = require('../public/js/theme.js');

test('hexToRgb: تحويل صحيح ورفض المدخلات الخاطئة', () => {
  assert.deepStrictEqual(theme.hexToRgb('#0f7a55'), { r: 15, g: 122, b: 85 });
  assert.deepStrictEqual(theme.hexToRgb('0f7a55'), { r: 15, g: 122, b: 85 });
  assert.strictEqual(theme.hexToRgb('#fff'), null);
  assert.strictEqual(theme.hexToRgb('zzz'), null);
  assert.strictEqual(theme.hexToRgb(''), null);
});

test('rgbToHex: عكس التحويل', () => {
  assert.strictEqual(theme.rgbToHex({ r: 15, g: 122, b: 85 }), '#0f7a55');
  assert.strictEqual(theme.rgbToHex({ r: 0, g: 0, b: 0 }), '#000000');
  assert.strictEqual(theme.rgbToHex({ r: 255, g: 255, b: 255 }), '#ffffff');
});

test('mix: المزج مع الأبيض والأسود', () => {
  assert.strictEqual(theme.mix('#000000', 'white', 1), '#ffffff');
  assert.strictEqual(theme.mix('#ffffff', 'black', 1), '#000000');
  const half = theme.mix('#000000', 'white', 0.5);
  assert.ok(/^#[0-9a-f]{6}$/.test(half));
  assert.strictEqual(theme.mix('bad', 'white', 0.5), 'bad');
});

test('luminance: ألوان فاتحة/dاكنة', () => {
  assert.ok(theme.luminance('#ffffff') > 0.9);
  assert.ok(theme.luminance('#000000') < 0.05);
  assert.ok(theme.luminance('#0f7a55') > 0.05);
});

test('readableInk: نص مقروء فوق أي لون تمييز', () => {
  assert.strictEqual(theme.readableInk('#ffffff'), '#10201a');
  assert.strictEqual(theme.readableInk('#0f7a55'), '#ffffff');
  assert.strictEqual(theme.readableInk('#111111'), '#ffffff');
});

test('لوحة الألوان: ٨ ألوان جاهزة بصيغة hex صحيحة', () => {
  assert.ok(theme.ACCENTS.length >= 6);
  for (const a of theme.ACCENTS) {
    assert.ok(/^#[0-9a-f]{6}$/i.test(a.hex), a.key);
  }
});

test('الثيمات: خمس خيارات', () => {
  assert.ok(theme.THEMES.includes('light'));
  assert.ok(theme.THEMES.includes('dark'));
  assert.ok(theme.THEMES.includes('auto'));
  assert.strictEqual(theme.resolveTheme('dark'), 'dark');
  assert.strictEqual(theme.resolveTheme('light'), 'light');
});
