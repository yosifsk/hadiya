/* ============================================================
   HADIYA — التحقق من هوية جوجل (Google Identity Services)
   ------------------------------------------------------------
   يتحقق من رمز الهوية (ID token) الموقّع من جوجل:
   • ي-fetch مفاتيح JWKS الرسمية (مع كاش قصير)
   • يتحقق من توقيع RS256 بنفس node:crypto (بلا اعتماديات جديدة)
   • يتحقق من: iss · aud (GOOGLE_CLIENT_ID) · exp · email_verified
   يُستخدم عند "تسجيل الدخول بجوجل" — لا يُنشئ حسابًا تلقائيًا بلا تحقق.
   ============================================================ */

const crypto = require('node:crypto');

const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
let jwksCache = { at: 0, keys: [] };
const JWKS_TTL_MS = 60 * 60 * 1000;

function clientId() {
  return String(process.env.GOOGLE_CLIENT_ID || '').trim();
}

function isConfigured() {
  return Boolean(clientId());
}

async function getJwks() {
  const now = Date.now();
  if (jwksCache.keys.length && now - jwksCache.at < JWKS_TTL_MS) return jwksCache.keys;
  const res = await fetch(JWKS_URL, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`jwks fetch failed: ${res.status}`);
  const data = await res.json();
  jwksCache = { at: now, keys: Array.isArray(data.keys) ? data.keys : [] };
  return jwksCache.keys;
}

/* فكّ التوقيع Base64URL */
function b64urlToBuffer(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  return Buffer.from(String(str).replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

function decodeSegment(segment) {
  return JSON.parse(b64urlToBuffer(segment).toString('utf8'));
}

/* يبحث عن مفتاح jwk suitable ويبني مفتاح RSA عام */
function publicKeyFromJwk(jwk) {
  return crypto.createPublicKey({ key: jwk, format: 'jwk' });
}

async function verifyIdToken(idToken) {
  const token = String(idToken || '').trim();
  if (!token) return { ok: false, error: 'missing_token' };

  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, error: 'malformed_token' };

  let payload;
  try {
    payload = decodeSegment(parts[1]);
  } catch {
    return { ok: false, error: 'malformed_payload' };
  }
  const header = (() => {
    try { return decodeSegment(parts[0]); } catch { return {}; }
  })();

  // الخوارزمية: RS256 فقط (لا نقبل "none")
  if (header.alg !== 'RS256') return { ok: false, error: 'bad_alg' };

  // المفتاح المناسب حسب kid
  let keys = [];
  try { keys = await getJwks(); } catch { return { ok: false, error: 'jwks_unavailable' }; }
  const jwk = keys.find(k => !header.kid || k.kid === header.kid);
  if (!jwk) return { ok: false, error: 'unknown_key' };

  // التحقق من التوقيع
  const signed = Buffer.from(`${parts[0]}.${parts[1]}`, 'utf8');
  const signature = b64urlToBuffer(parts[2]);
  const ok = crypto.verify(
    'RSA-SHA256',
    signed,
    publicKeyFromJwk(jwk),
    signature
  );
  if (!ok) return { ok: false, error: 'bad_signature' };

  // المطالبات
  const now = Math.floor(Date.now() / 1000);
  if (!ISSUERS.includes(payload.iss)) return { ok: false, error: 'bad_issuer' };
  if (payload.aud !== clientId()) return { ok: false, error: 'bad_audience' };
  if (!payload.exp || payload.exp < now) return { ok: false, error: 'expired' };
  if (payload.email_verified === false || payload.email_verified === 'false') {
    return { ok: false, error: 'email_unverified' };
  }
  if (!payload.email) return { ok: false, error: 'no_email' };

  return {
    ok: true,
    email: String(payload.email).toLowerCase(),
    emailVerified: true,
    sub: String(payload.sub || ''),
    name: String(payload.name || ''),
    picture: String(payload.picture || ''),
  };
}

module.exports = { verifyIdToken, isConfigured, clientId };
