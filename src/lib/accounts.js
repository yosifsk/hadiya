/* حسابات الإدارة (اسم مستخدم + كلمة مرور).
   لا يوجد أي حساب نصّي للمتبرّعين — حسابهم هو عنوان محفظتهم (توقيع). */

const { q, one, run, getSetting, setSetting } = require('../db');
const passwords = require('./passwords');
const audit = require('./audit');

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

function findByUsername(username) {
  return one('SELECT * FROM admin_accounts WHERE username = ?', normalizeUsername(username));
}

function listAccounts() {
  return q(
    `SELECT id, username, role, is_active, created_at, updated_at, last_login_at,
            failed_attempts, locked_until, must_change_password
     FROM admin_accounts ORDER BY id`
  );
}

/* إنشاء حساب (أو تحديث كلمة مروره) */
function upsertAccount({ username, password, role = 'admin', isActive = 1, mustChange = 0 }) {
  const name = normalizeUsername(username);
  if (!/^[a-z0-9._-]{3,40}$/.test(name)) {
    throw new Error('اسم المستخدم يجب أن يكون ٣-٤٠ خانة (حروف صغيرة/أرقام/._-)');
  }
  const policyError = passwords.validatePassword(password, name);
  if (policyError) throw new Error(policyError);

  const hash = passwords.hashPassword(password);
  const existing = findByUsername(name);
  if (existing) {
    run(
      `UPDATE admin_accounts
       SET password_hash = ?, role = ?, is_active = ?, must_change_password = ?,
           failed_attempts = 0, locked_until = NULL, updated_at = datetime('now')
       WHERE id = ?`,
      hash, role, isActive ? 1 : 0, mustChange ? 1 : 0, existing.id
    );
  } else {
    run(
      `INSERT INTO admin_accounts (username, password_hash, role, is_active, must_change_password, created_at, updated_at)
       VALUES (?,?,?,?,?,datetime('now'),datetime('now'))`,
      name, hash, role, isActive ? 1 : 0, mustChange ? 1 : 0
    );
  }
  audit.logAction({
    actor: 'system',
    action: existing ? 'account.password_reset' : 'account.created',
    target: name,
    note: `role=${role}`,
  });
  return findByUsername(name);
}

/* التحقّق من الدخول مع قفل الحساب */
function verifyLogin(username, password) {
  const name = normalizeUsername(username);
  const account = findByUsername(name);

  if (!account) {
    // حساب غير موجود: نحسب بصمة وهمية للحفاظ على نفس زمن المعالجة
    passwords.verifyOrDummy(String(password || ''), null);
    return { ok: false, reason: 'invalid_credentials' };
  }

  if (!account.is_active) {
    passwords.verifyOrDummy(String(password || ''), null);
    return { ok: false, reason: 'disabled' };
  }

  if (account.locked_until && new Date(account.locked_until).getTime() > Date.now()) {
    return { ok: false, reason: 'locked', until: account.locked_until };
  }

  const valid = passwords.verifyPassword(String(password || ''), account.password_hash);
  if (!valid) {
    const failed = Number(account.failed_attempts || 0) + 1;
    const lock = failed >= MAX_FAILED
      ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString()
      : null;
    run(
      'UPDATE admin_accounts SET failed_attempts = ?, locked_until = ? WHERE id = ?',
      failed, lock, account.id
    );
    audit.logAction({
      actor: name,
      action: 'security.login_failed',
      target: name,
      note: `attempt ${failed}${lock ? ' — locked' : ''}`,
    });
    return {
      ok: false,
      reason: 'invalid_credentials',
      remaining: Math.max(0, MAX_FAILED - failed),
    };
  }

  run(
    `UPDATE admin_accounts SET failed_attempts = 0, locked_until = NULL,
       last_login_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
    account.id
  );
  audit.logAction({ actor: name, action: 'security.login_ok', target: name });
  return { ok: true, account };
}

function changePassword(username, currentPassword, newPassword) {
  const account = findByUsername(username);
  if (!account) throw new Error('الحساب غير موجود');
  if (!passwords.verifyPassword(String(currentPassword || ''), account.password_hash)) {
    throw new Error('كلمة المرور الحالية غير صحيحة');
  }
  const policyError = passwords.validatePassword(newPassword, account.username);
  if (policyError) throw new Error(policyError);
  run(
    `UPDATE admin_accounts SET password_hash = ?, must_change_password = 0,
       failed_attempts = 0, locked_until = NULL, updated_at = datetime('now') WHERE id = ?`,
    passwords.hashPassword(newPassword), account.id
  );
  audit.logAction({ actor: account.username, action: 'account.password_changed', target: account.username });
  return true;
}

/* إنشاء الحساب الافتراضي من متغيّرات البيئة (مرة واحدة) */
function ensureDefaultAccount() {
  const username = (process.env.ADMIN_USERNAME || '').trim();
  const password = (process.env.ADMIN_PASSWORD || '').trim();
  if (!username || !password) return null;
  if (findByUsername(username)) return findByUsername(username);
  try {
    return upsertAccount({
      username,
      password,
      role: 'admin',
      mustChange: process.env.ADMIN_MUST_CHANGE !== '0' ? 1 : 0,
    });
  } catch (err) {
    console.error(JSON.stringify({
      time: new Date().toISOString(),
      level: 'error',
      message: 'default admin account could not be created',
      error: String(err.message || err),
    }));
    return null;
  }
}

module.exports = {
  MAX_FAILED,
  LOCK_MINUTES,
  normalizeUsername,
  findByUsername,
  listAccounts,
  upsertAccount,
  verifyLogin,
  changePassword,
  ensureDefaultAccount,
};
