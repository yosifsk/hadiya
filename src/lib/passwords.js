/* كلمات المرور — Argon2id (مدمج في Node 24).
   الصيغة المخزّنة (PHC-like):
     $argon2id$m=65536,t=3,p=1$<salt base64>$<hash base64>
   مع "pepper" سري من الخادم (PASSWORD_PEPPER) يُضاف كـ secret — حتى لو سُرقت قاعدة
   البيانات فإن البصمة وحدها لا تكفي لتخمين الكلمة. */

const { argon2Sync, randomBytes, timingSafeEqual, createHmac } = require('node:crypto');

const ALGO = 'argon2id';
const MEMORY = 65536; // 64 MiB
const ITERATIONS = 3;
const PARALLELISM = 1;
const TAG_LENGTH = 32;

/* الـ nonce جزء من حساب Argon2 — يجب أن يكون ثابتًا لكل salt.
   نشتقه من الـ salt عبر HMAC حتى لا نحتاج تخزينه منفصلًا. */
function deriveNonce(salt) {
  return createHmac('sha256', salt).update('hadba/argon2/nonce/v1').digest();
}

function pepper() {
  const p = (process.env.PASSWORD_PEPPER || '').trim();
  return p ? Buffer.from(p, 'utf8') : Buffer.alloc(0);
}

function b64(buf) {
  return Buffer.from(buf).toString('base64').replace(/=+$/, '');
}

function unb64(str) {
  return Buffer.from(str, 'base64');
}

function hashPassword(password) {
  const salt = randomBytes(16);
  const nonce = deriveNonce(salt);
  const secret = pepper();
  const tag = argon2Sync(ALGO, {
    message: String(password),
    nonce,
    salt,
    secret,
    memory: MEMORY,
    iterations: ITERATIONS,
    parallelism: PARALLELISM,
    passes: 1,
    tagLength: TAG_LENGTH,
  });
  return `$${ALGO}$m=${MEMORY},t=${ITERATIONS},p=${PARALLELISM}$${b64(salt)}$${b64(tag)}`;
}

function verifyPassword(password, stored) {
  try {
    const parts = String(stored || '').split('$');
    if (parts.length !== 5 || parts[1] !== ALGO) return false;
    const params = Object.fromEntries(
      parts[2].split(',').map(kv => {
        const [k, v] = kv.split('=');
        return [k, Number(v)];
      })
    );
    const salt = unb64(parts[3]);
    const expected = unb64(parts[4]);
    const tag = argon2Sync(ALGO, {
      message: String(password),
      nonce: deriveNonce(salt),
      salt,
      secret: pepper(),
      memory: params.m || MEMORY,
      iterations: params.t || ITERATIONS,
      parallelism: params.p || PARALLELISM,
      passes: 1,
      tagLength: expected.length,
    });
    return tag.length === expected.length && timingSafeEqual(tag, expected);
  } catch {
    return false;
  }
}

/* بصمة وهمية تُحسب عند عدم وجود الحساب — حتى لا يكشف التوقيت إن كان الاسم موجودًا */
const DUMMY_HASH = hashPassword('dummy-password-for-timing-equalization');

function verifyOrDummy(password, stored) {
  return verifyPassword(password, stored || DUMMY_HASH);
}

/* سياسة كلمة المرور */
function validatePassword(password, username = '') {
  const value = String(password || '');
  if (value.length < 10) return 'كلمة المرور يجب ألا تقل عن ١٠ خانات';
  if (value.length > 200) return 'كلمة المرور طويلة جدًا';
  if (username && value.toLowerCase() === String(username).toLowerCase()) {
    return 'كلمة المرور لا يمكن أن تكون مطابقة لاسم المستخدم';
  }
  const weak = ['password', '123456789', 'qwerty1234', 'admin1234', 'password123'];
  if (weak.includes(value.toLowerCase())) return 'كلمة المرور شائعة جدًا — اختر أخرى';
  if (/^(.)\1+$/.test(value)) return 'كلمة المرور ضعيفة';
  return null;
}

function randomPassword(length = 20) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

module.exports = {
  ALGO,
  MEMORY,
  ITERATIONS,
  hashPassword,
  verifyPassword,
  verifyOrDummy,
  validatePassword,
  randomPassword,
};
