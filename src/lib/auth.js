/* تسجيل الدخول بتوقيع المحفظة (SIWE مبسّط) + جلسات موقّعة.
   لا كلمات مرور ولا حفظ مفاتيح خاصة على الخادم. */

const crypto = require('crypto');
const { verifyMessage, getAddress, isAddress } = require('viem');
const { getSetting, setSetting, run, one, q } = require('../db');

const SESSION_COOKIE = 'hadba_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function sessionSecret() {
  let secret = process.env.SESSION_SECRET;
  if (!secret) {
    secret = getSetting('session_secret');
    if (!secret) {
      secret = crypto.randomBytes(32).toString('hex');
      setSetting('session_secret', secret);
    }
  }
  return secret;
}

function randomNonce() {
  return crypto.randomBytes(16).toString('hex');
}

function createNonce(address) {
  const nonce = randomNonce();
  run(
    `INSERT INTO nonces (address, nonce, created_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(address) DO UPDATE SET nonce = excluded.nonce, created_at = datetime('now')`,
    address.toLowerCase(),
    nonce
  );
  return nonce;
}

function readNonce(address) {
  const row = one('SELECT nonce FROM nonces WHERE address = ?', address.toLowerCase());
  return row ? row.nonce : null;
}

/* استهلاك الـ nonce بعد استخدامه — يمنع إعادة تشغيل رسالة موقّعة */
function consumeNonce(address, nonce) {
  const row = one('SELECT nonce FROM nonces WHERE address = ?', address.toLowerCase());
  if (!row || row.nonce !== nonce) return false;
  run('DELETE FROM nonces WHERE address = ?', address.toLowerCase());
  return true;
}

function signSession(address) {
  const payload = `${address.toLowerCase()}.${Date.now()}.${randomNonce()}`;
  const mac = crypto.createHmac('sha256', sessionSecret()).update(payload).digest('hex');
  return `${payload}.${mac}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 4) return null;
  const [address, issuedAt, nonce, mac] = parts;
  const payload = `${address}.${issuedAt}.${nonce}`;
  const expected = crypto.createHmac('sha256', sessionSecret()).update(payload).digest('hex');
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (!isAddress(address)) return null;
  return getAddress(address);
}

function createSession(address) {
  const token = signSession(address);
  const expires = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  run(
    'INSERT INTO sessions (token, address, created_at, expires_at) VALUES (?, ?, datetime(\'now\'), ?)',
    token,
    address.toLowerCase(),
    expires
  );
  return { token, expires };
}

function destroySession(token) {
  if (token) run('DELETE FROM sessions WHERE token = ?', token);
}

function sessionFromRequest(req) {
  const raw = req.cookies ? req.cookies[SESSION_COOKIE] : null;
  const token = raw || req.headers['x-session-token'];
  if (!token) return null;
  const address = verifySessionToken(token);
  if (!address) return null;
  const row = one('SELECT expires_at FROM sessions WHERE token = ?', token);
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    destroySession(token);
    return null;
  }
  return { address, token };
}

function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_MS,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE);
}

async function verifySignature(address, message, signature) {
  if (!isAddress(address) || !signature) return false;
  try {
    return await verifyMessage({
      address: getAddress(address),
      message,
      signature,
    });
  } catch {
    return false;
  }
}

function listSessions() {
  return q('SELECT address, created_at, expires_at FROM sessions ORDER BY created_at DESC LIMIT 50');
}

/* ===== جلسة حساب مستخدم (اسم مستخدم + كلمة مرور) ===== */

const USER_COOKIE = 'hadba_user';

/* مهلة الخمول: ١٥ دقيقة — تُمدَّد تلقائيًا مع كل طلب نشط،
   فيبقى المستخدم مسجّلًا أثناء تصفّح أقسام الموقع دون انقطاع. */
const USER_SESSION_IDLE_MS = 15 * 60 * 1000;

function startUserSession(res, username) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + USER_SESSION_IDLE_MS).toISOString();
  run(
    'INSERT INTO sessions (token, address, created_at, expires_at) VALUES (?, ?, datetime(\'now\'), ?)',
    token,
    `user:${String(username).toLowerCase()}`,
    expires
  );
  res.cookie(USER_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: USER_SESSION_IDLE_MS,
  });
  return token;
}

/* تمديد الجلسة (idle timeout) — يُستدعى عند كل طلب مصادَق */
function refreshUserSession(res, token) {
  if (!res || !token) return;
  const expires = new Date(Date.now() + USER_SESSION_IDLE_MS).toISOString();
  run('UPDATE sessions SET expires_at = ? WHERE token = ?', expires, token);
  res.cookie(USER_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: USER_SESSION_IDLE_MS,
  });
}

function userSession(req, res) {
  const token = (req.cookies || {})[USER_COOKIE];
  if (!token) return null;
  const row = one('SELECT address, expires_at FROM sessions WHERE token = ?', token);
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    run('DELETE FROM sessions WHERE token = ?', token);
    return null;
  }
  if (!String(row.address).startsWith('user:')) return null;
  // تصفّح نشط → مدّد المهلة ١٥ دقيقة أخرى
  refreshUserSession(res, token);
  return { username: String(row.address).slice('user:'.length), token };
}

function endUserSession(req, res) {
  const token = (req.cookies || {})[USER_COOKIE];
  if (token) run('DELETE FROM sessions WHERE token = ?', token);
  res.clearCookie(USER_COOKIE);
}

/* الهوية الحالية: جلسة محفظة موقّعة أو حساب باسم مستخدم */
function currentIdentity(req, res) {
  const walletSession = sessionFromRequest(req);
  if (walletSession) {
    return {
      type: 'wallet',
      address: walletSession.address,
      username: null,
      displayName: walletSession.address,
    };
  }
  const userSessionInfo = userSession(req, res);
  if (userSessionInfo) {
    const users = require('./users');
    const user = users.findByUsername(userSessionInfo.username);
    if (user && user.is_active) {
      return {
        type: 'username',
        address: user.wallet_address || null,
        username: user.username,
        displayName: user.display_name || user.username,
        user,
      };
    }
  }
  return null;
}

module.exports = {
  SESSION_COOKIE,
  USER_COOKIE,
  USER_SESSION_IDLE_MS,
  createNonce,
  readNonce,
  consumeNonce,
  verifySignature,
  createSession,
  destroySession,
  sessionFromRequest,
  setSessionCookie,
  clearSessionCookie,
  verifySessionToken,
  listSessions,
  startUserSession,
  userSession,
  endUserSession,
  currentIdentity,
};
