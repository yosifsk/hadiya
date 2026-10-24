/* طبقة الإدارة: التحقق من المفتاح/المحفظة بمقارنة constant-time،
   أدوار المشرف، رموز CSRF، وإدارة الجلسات. */

const crypto = require('crypto');
const { getSetting, setSetting, q, run, one } = require('../db');
const auth = require('./auth');
const audit = require('./audit');
const accounts = require('./accounts');

const CSRF_COOKIE = 'hadba_csrf';

/* ===== مفتاح الإدارة =====
   مصدران: متغيّر البيئة ADMIN_KEY، أو بصمة مخزّنة في قاعدة البيانات (قابلة للتدوير).
   نقارن البصمات (sha256) بمقارنة constant-time حتى لا يكشف التوقيت. */

function hashKey(key) {
  return crypto.createHash('sha256').update(String(key)).digest('hex');
}

function safeEqualHex(a, b) {
  const ba = Buffer.from(String(a), 'hex');
  const bb = Buffer.from(String(b), 'hex');
  if (ba.length !== bb.length || ba.length === 0) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function storedAdminKeyHash() {
  return getSetting('admin_key_hash', '') || '';
}

function checkAdminKey(provided) {
  if (!provided) return false;

  const envKey = (process.env.ADMIN_KEY || '').trim();
  if (envKey) {
    if (safeEqualHex(hashKey(envKey), hashKey(provided))) return true;
  }

  const stored = storedAdminKeyHash();
  if (stored) {
    if (safeEqualHex(stored, hashKey(provided))) return true;
  }
  return false;
}

/* ===== أدوار المشرف =====
   المنصّة: owner_address + collector_address (يُدار من لوحة الإدارة). */

function adminAddresses() {
  const raw = getSetting('admin_addresses', '');
  const list = raw ? raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : [];
  const owner = (getSetting('owner_address', '') || '').toLowerCase();
  const collector = (getSetting('collector_address', '') || '').toLowerCase();
  for (const addr of [owner, collector]) {
    if (addr && !list.includes(addr)) list.push(addr);
  }
  return list;
}

function isAdminAddress(address) {
  if (!address) return false;
  return adminAddresses().includes(String(address).toLowerCase());
}

/* ===== جلسة حساب (اسم مستخدم + كلمة مرور) =====
   تُخزَّن في جدول sessions بعنوان خاص `account:<username>` — نفس آلية الجلسات الآمنة. */

const ACCOUNT_COOKIE = 'hadba_admin_account';
const ACCOUNT_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function startAccountSession(res, username) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + ACCOUNT_SESSION_TTL_MS).toISOString();
  run(
    'INSERT INTO sessions (token, address, created_at, expires_at) VALUES (?, ?, datetime(\'now\'), ?)',
    token,
    `account:${accounts.normalizeUsername(username)}`,
    expires
  );
  res.cookie(ACCOUNT_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ACCOUNT_SESSION_TTL_MS,
  });
  return issueCsrfToken(res);
}

function accountSession(req) {
  const token = (req.cookies || {})[ACCOUNT_COOKIE];
  if (!token) return null;
  const row = one('SELECT address, expires_at FROM sessions WHERE token = ?', token);
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    run('DELETE FROM sessions WHERE token = ?', token);
    return null;
  }
  if (!String(row.address).startsWith('account:')) return null;
  const username = String(row.address).slice('account:'.length);
  const account = accounts.findByUsername(username);
  if (!account || !account.is_active) return null;
  return { username, token };
}

function endAccountSession(req, res) {
  const token = (req.cookies || {})[ACCOUNT_COOKIE];
  if (token) run('DELETE FROM sessions WHERE token = ?', token);
  res.clearCookie(ACCOUNT_COOKIE);
}

/* التحقق الموحّد: مفتاح إدارة، جلسة محفظة موقّعة، أو جلسة حساب (اسم مستخدم/كلمة مرور). */
function authenticate(req) {
  const provided = req.headers['x-admin-key'] || (req.cookies || {}).hadba_admin || '';
  if (checkAdminKey(provided)) {
    return { ok: true, actor: 'key', method: 'admin_key' };
  }

  const accountSessionInfo = accountSession(req);
  if (accountSessionInfo) {
    return { ok: true, actor: accountSessionInfo.username, method: 'password' };
  }

  const session = auth.sessionFromRequest(req);
  if (session && isAdminAddress(session.address)) {
    return { ok: true, actor: session.address, method: 'wallet' };
  }
  return { ok: false, actor: null, method: null };
}

/* ===== تسجيل الدخول =====
   يحوّل المفتاح إلى جلسة كوكي (HttpOnly) — لا يُحفظ المفتاح في المتصفح كما هو. */

function issueCsrfToken(res) {
  const token = crypto.randomBytes(24).toString('hex');
  res.cookie(CSRF_COOKIE, token, { httpOnly: false, sameSite: 'lax', maxAge: 12 * 60 * 60_000 });
  return token;
}

function startAdminSession(res, key) {
  res.cookie('hadba_admin', key, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 12 * 60 * 60_000,
  });
  return issueCsrfToken(res);
}

function checkCsrf(req) {
  const cookie = (req.cookies || {})[CSRF_COOKIE];
  const header = req.headers['x-csrf-token'];
  if (!cookie || !header) return false;
  return safeEqualHex(hashKey(cookie), hashKey(header));
}

/* ===== الجلسات ===== */

function listSessions(limit = 100) {
  return q(
    `SELECT s.address, s.created_at, s.expires_at,
            (SELECT COUNT(*) FROM donations d WHERE d.donor_address = s.address) AS donations
     FROM sessions s ORDER BY s.created_at DESC LIMIT ?`,
    Number(limit)
  );
}

function revokeAllSessions() {
  const info = run('DELETE FROM sessions');
  return info.changes;
}

function revokeSession(token) {
  return run('DELETE FROM sessions WHERE token = ?', token).changes;
}

/* ===== تدوير مفتاح الإدارة ===== */

function rotateAdminKey(newKey) {
  if (!newKey || String(newKey).length < 16) {
    throw new Error('المفتاح الجديد قصير جدًا (١٦ حرفًا على الأقل)');
  }
  setSetting('admin_key_hash', hashKey(newKey));
  audit.logAction({
    actor: 'admin-panel',
    action: 'admin.key.rotate',
    before: storedAdminKeyHash() ? 'sha256:<set>' : null,
    after: 'sha256:<set>',
    note: 'rotated admin key',
  });
  return true;
}

function adminAddressesList() {
  return adminAddresses();
}

function setAdminAddresses(list) {
  const clean = (list || [])
    .map(a => String(a).trim().toLowerCase())
    .filter(a => /^0x[a-f0-9]{40}$/.test(a));
  setSetting('admin_addresses', clean.join(','));
  return clean;
}

module.exports = {
  CSRF_COOKIE,
  ACCOUNT_COOKIE,
  hashKey,
  safeEqualHex,
  checkAdminKey,
  isAdminAddress,
  adminAddresses,
  adminAddressesList,
  setAdminAddresses,
  authenticate,
  issueCsrfToken,
  startAdminSession,
  startAccountSession,
  endAccountSession,
  accountSession,
  checkCsrf,
  listSessions,
  revokeAllSessions,
  revokeSession,
  rotateAdminKey,
};
