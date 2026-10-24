/* حسابات المستخدمين (اسم مستخدم + كلمة مرور) — نفس حماية حسابات الإدارة
   (Argon2id + قفل الحساب + منع كشف الوجود)، مع إمكانية ربط محفظة.

   فائدة ربط المحفظة: العنوان المرتبط يصبح هوية المنظّم على السلسلة،
   فيستطيع تغيير محفظة الجهة المستفيدة لحملاته فقط. */

const crypto = require('node:crypto');
const { q, one, run } = require('../db');
const passwords = require('./passwords');
const audit = require('./audit');

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

function findByUsername(username) {
  return one('SELECT * FROM users WHERE username = ?', normalizeUsername(username));
}

function findByWallet(address) {
  if (!address) return null;
  return one('SELECT * FROM users WHERE wallet_address = ?', String(address).toLowerCase());
}

function listUsers(limit = 200) {
  return q(
    `SELECT id, username, display_name, wallet_address, is_active, must_change_password,
            failed_attempts, locked_until, last_login_at, created_at
     FROM users ORDER BY id DESC LIMIT ?`,
    Number(limit)
  );
}

function createUser({ username, password, displayName = '', walletAddress = '' }) {
  const name = normalizeUsername(username);
  if (!/^[a-z0-9._-]{3,40}$/.test(name)) {
    throw new Error('اسم المستخدم يجب أن يكون ٣-٤٠ خانة (حروف صغيرة/أرقام/._-)');
  }
  const policyError = passwords.validatePassword(password, name);
  if (policyError) throw new Error(policyError);
  if (findByUsername(name)) throw new Error('اسم المستخدم مستخدم بالفعل');

  const hash = passwords.hashPassword(password);
  const info = run(
    `INSERT INTO users (username, password_hash, display_name, wallet_address, must_change_password, created_at, updated_at)
     VALUES (?,?,?,?,1,datetime('now'),datetime('now'))`,
    name,
    hash,
    String(displayName || '').trim().slice(0, 80),
    walletAddress ? String(walletAddress).toLowerCase() : ''
  );
  audit.logAction({ actor: name, action: 'user.registered', target: name });
  return one('SELECT * FROM users WHERE id = ?', info.lastInsertRowid);
}

function verifyLogin(username, password) {
  const name = normalizeUsername(username);
  const user = findByUsername(name);

  if (!user) {
    passwords.verifyOrDummy(String(password || ''), null);
    return { ok: false, reason: 'invalid_credentials' };
  }
  if (!user.is_active) {
    passwords.verifyOrDummy(String(password || ''), null);
    return { ok: false, reason: 'disabled' };
  }
  if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
    return { ok: false, reason: 'locked', until: user.locked_until };
  }

  const valid = passwords.verifyPassword(String(password || ''), user.password_hash);
  if (!valid) {
    const failed = Number(user.failed_attempts || 0) + 1;
    const lock = failed >= MAX_FAILED
      ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString()
      : null;
    run('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?', failed, lock, user.id);
    audit.logAction({
      actor: name,
      action: 'security.login_failed',
      target: name,
      note: `user account — attempt ${failed}${lock ? ' — locked' : ''}`,
    });
    return { ok: false, reason: 'invalid_credentials', remaining: Math.max(0, MAX_FAILED - failed) };
  }

  run(
    `UPDATE users SET failed_attempts = 0, locked_until = NULL,
       last_login_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
    user.id
  );
  audit.logAction({ actor: name, action: 'security.login_ok', target: name, note: 'user account' });
  return { ok: true, user };
}

function changePassword(username, currentPassword, newPassword) {
  const user = findByUsername(username);
  if (!user) throw new Error('الحساب غير موجود');
  if (!passwords.verifyPassword(String(currentPassword || ''), user.password_hash)) {
    throw new Error('كلمة المرور الحالية غير صحيحة');
  }
  const policyError = passwords.validatePassword(newPassword, user.username);
  if (policyError) throw new Error(policyError);
  run(
    `UPDATE users SET password_hash = ?, must_change_password = 0, failed_attempts = 0,
       locked_until = NULL, updated_at = datetime('now') WHERE id = ?`,
    passwords.hashPassword(newPassword), user.id
  );
  audit.logAction({ actor: user.username, action: 'user.password_changed', target: user.username });
  return true;
}

/* إعادة تعيين إدارية لكلمة المرور (بدون الكلمة الحالية) */
function adminResetPassword(username, newPassword) {
  const user = findByUsername(username);
  if (!user) throw new Error('الحساب غير موجود');
  const policyError = passwords.validatePassword(newPassword, user.username);
  if (policyError) throw new Error(policyError);
  run(
    `UPDATE users SET password_hash = ?, must_change_password = 1, failed_attempts = 0,
       locked_until = NULL, updated_at = datetime('now') WHERE id = ?`,
    passwords.hashPassword(newPassword), user.id
  );
  return findByUsername(user.username);
}

/* ============================================================
   استعادة كلمة المرور (نسيان كلمة السر)
   ------------------------------------------------------------
   - رمز عشوائي 32 بايت، أحادي الاستخدام، صلاحية ٣٠ دقيقة
   - الاستجابة لا تكشف إن كان الحساب موجودًا (لا تسريب لمعلومات)
   - بعد التغيير تُنهى كل جلسات الحساب (إلزام إعادة الدخول)
   ============================================================ */

const RESET_TTL_MIN = 30;

function createPasswordReset(username, ip = '') {
  const user = findByUsername(username);
  // نُرجع دائمًا نجاحًا — لا نكشف وجود الحساب
  if (!user || !user.is_active) return null;
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + RESET_TTL_MIN * 60 * 1000).toISOString();
  // نُبطل الطلبات السابقة أولًا (ثم نُدرج الجديد — لا العكس)
  run(
    "UPDATE password_resets SET used_at = datetime('now') WHERE username = ? AND used_at = ''",
    user.username
  );
  run(
    'INSERT INTO password_resets (token, username, ip, expires_at) VALUES (?,?,?,?)',
    token,
    user.username,
    String(ip || ''),
    expires
  );
  audit.logAction({ actor: user.username, action: 'user.password_reset_requested', target: user.username, ip });
  return { token, expires, username: user.username };
}

function readPasswordReset(token) {
  const value = String(token || '').trim();
  if (!value) return null;
  const row = one('SELECT * FROM password_resets WHERE token = ?', value);
  if (!row) return null;
  if (row.used_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  return row;
}

/* يغيّر كلمة المرور ويبطل الرمز وكل الجلسات */
function resetPasswordWithToken(token, newPassword, ip = '') {
  const row = readPasswordReset(token);
  if (!row) {
    const err = new Error('رابط الاستعادة غير صالح أو منتهي الصلاحية');
    err.code = 'INVALID_RESET_TOKEN';
    throw err;
  }
  const user = findByUsername(row.username);
  if (!user) {
    const err = new Error('رابط الاستعادة غير صالح أو منتهي الصلاحية');
    err.code = 'INVALID_RESET_TOKEN';
    throw err;
  }
  const policyError = passwords.validatePassword(newPassword, user.username);
  if (policyError) throw new Error(policyError);

  run(
    `UPDATE users SET password_hash = ?, must_change_password = 0, failed_attempts = 0,
       locked_until = NULL, updated_at = datetime('now') WHERE id = ?`,
    passwords.hashPassword(newPassword), user.id
  );
  run("UPDATE password_resets SET used_at = datetime('now') WHERE id = ?", row.id);
  // إنهاء كل جلسات الحساب — إجبار إعادة الدخول
  run("DELETE FROM sessions WHERE address = ?", `user:${user.username}`);
  audit.logAction({ actor: user.username, action: 'user.password_reset', target: user.username, ip });
  return true;
}

/* ============================================================
   الدخول بجوجل
   ------------------------------------------------------------
   - يُنشئ حسابًا فقط بعد التحقق من الرمز (iss/aud/exp/توقيع)
   - إن وُجد حساب بنفس البريد يُربط به (يُحدَّث email/google_sub)
   ============================================================ */

function findByEmail(email) {
  const value = String(email || '').trim().toLowerCase();
  if (!value) return null;
  return one('SELECT * FROM users WHERE email = ?', value);
}

function findByGoogleSub(sub) {
  const value = String(sub || '').trim();
  if (!value) return null;
  return one('SELECT * FROM users WHERE google_sub = ?', value);
}

function loginWithGoogle({ email, sub, name = '' }) {
  const mail = String(email || '').trim().toLowerCase();
  if (!mail || !sub) {
    const err = new Error('بيانات الحساب غير مكتملة');
    err.code = 'INVALID_GOOGLE_ACCOUNT';
    throw err;
  }
  let user = findByGoogleSub(sub) || findByEmail(mail);
  if (user) {
    run(
      `UPDATE users SET email = ?, google_sub = ?, updated_at = datetime('now')
       WHERE id = ? AND (google_sub = '' OR google_sub IS NULL)`,
      mail, sub, user.id
    );
    if (!user.email) {
      run('UPDATE users SET email = ? WHERE id = ?', mail, user.id);
    }
    if (!user.is_active) {
      const err = new Error('الحساب معطّل');
      err.code = 'ACCOUNT_DISABLED';
      throw err;
    }
    audit.logAction({ actor: user.username, action: 'user.login_google', target: user.username });
    return findByUsername(user.username);
  }

  // إنشاء حساب جديد باسم مستخدم مبنيّ على البريد
  const base = mail.split('@')[0].replace(/[^a-z0-9._-]/gi, '').toLowerCase().slice(0, 24) || 'user';
  let username = base;
  let n = 1;
  while (findByUsername(username)) {
    username = `${base}${n}`;
    n += 1;
    if (n > 50) {
      const err = new Error('تعذّر إنشاء اسم مستخدم فريد');
      err.code = 'USERNAME_CONFLICT';
      throw err;
    }
  }
  // كلمة مرور عشوائية (لا يُستخدمها الدخول، لكن الحقل NOT NULL) — المستخدم يغيّرها لاحقًا
  const randomPassword = crypto.randomBytes(24).toString('base64url');
  const info = run(
    `INSERT INTO users (username, password_hash, display_name, email, google_sub, must_change_password, created_at, updated_at)
     VALUES (?,?,?,?,?,1,datetime('now'),datetime('now'))`,
    username,
    passwords.hashPassword(randomPassword),
    String(name || mail.split('@')[0]).slice(0, 80),
    mail,
    sub
  );
  audit.logAction({ actor: username, action: 'user.registered_google', target: username });
  return one('SELECT * FROM users WHERE id = ?', info.lastInsertRowid);
}

/* ربط/فك ربط محفظة بالحساب (يتطلّب توقيع من صاحب المحفظة) */function linkWallet(username, address) {
  const user = findByUsername(username);
  if (!user) throw new Error('الحساب غير موجود');
  const addr = String(address || '').toLowerCase();
  const other = findByWallet(addr);
  if (other && other.id !== user.id) {
    throw new Error('هذه المحفظة مرتبطة بحساب آخر');
  }
  run('UPDATE users SET wallet_address = ?, updated_at = datetime(\'now\') WHERE id = ?', addr, user.id);
  audit.logAction({ actor: user.username, action: 'user.wallet_linked', target: addr });
  return findByUsername(user.username);
}

function unlinkWallet(username) {
  const user = findByUsername(username);
  if (!user) throw new Error('الحساب غير موجود');
  run('UPDATE users SET wallet_address = \'\' WHERE id = ?', user.id);
  audit.logAction({ actor: user.username, action: 'user.wallet_unlinked', target: user.username });
  return findByUsername(user.username);
}

function updateProfile(username, { displayName }) {
  const user = findByUsername(username);
  if (!user) throw new Error('الحساب غير موجود');
  run('UPDATE users SET display_name = ?, updated_at = datetime(\'now\') WHERE id = ?',
    String(displayName || '').trim().slice(0, 80), user.id);
  return findByUsername(user.username);
}

module.exports = {
  MAX_FAILED,
  LOCK_MINUTES,
  normalizeUsername,
  findByUsername,
  findByWallet,
  listUsers,
  createUser,
  verifyLogin,
  changePassword,
  adminResetPassword,
  linkWallet,
  unlinkWallet,
  updateProfile,
  createPasswordReset,
  readPasswordReset,
  resetPasswordWithToken,
  findByEmail,
  findByGoogleSub,
  loginWithGoogle,
};
