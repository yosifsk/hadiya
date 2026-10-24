/* ============================================================
   HADIYA — فحص عناوين المحافظ ومطابقتها للشبكة
   ------------------------------------------------------------
   لماذا هذه الوحدة؟ أكثر أخطاء التبرّع شيوعًا: أن يختار المستخدم
   شبكة BNB/Base ثم يلصق عنوان TRON (TRC20) يبدأ بحرف T — أو العكس.
   الشكلان مختلفان تمامًا، فيمكن كشف الخطأ قبل أي معاملة.

   الأشكال المدعومة:
   • EVM (Ethereum / BNB / Polygon / Base): 0x + 40 خانة hex (+ checksum EIP-55)
   • TRON (TRC20): T + 33 محرف Base58Check (34 محرفًا) — أو الشكل السداسي 0x41…

   لا حضانة أموال: هذه الوحدة لا تلمس المفتاح ولا يرسل أي معاملة.
   ============================================================ */

const { createHash } = require('node:crypto');
const { isAddress: isEvmChecksumAddress, getAddress: toChecksumAddress } = require('viem');
const { getChain } = require('../../config/chains');

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const TRON_BASE58_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
const TRON_HEX_RE = /^(0x)?41[0-9a-fA-F]{40}$/;
const EVM_RE = /^0x[0-9a-fA-F]{40}$/;

function sha256(buf) {
  return createHash('sha256').update(buf).digest();
}

/* ---------- Base58 (بلا اعتماديات خارجية) ---------- */

function base58Decode(str) {
  const value = String(str || '');
  if (!value) return null;
  let num = 0n;
  for (const ch of value) {
    const idx = BASE58_ALPHABET.indexOf(ch);
    if (idx === -1) return null;
    num = num * 58n + BigInt(idx);
  }
  let hex = num.toString(16);
  if (hex.length % 2) hex = `0${hex}`;
  const bytes = Buffer.from(hex, 'hex');
  let zeros = 0;
  while (value[zeros] === '1') zeros += 1;
  return Buffer.concat([Buffer.alloc(zeros), bytes]);
}

function base58Encode(buf) {
  let num = 0n;
  for (const byte of buf) num = num * 256n + BigInt(byte);
  let out = '';
  while (num > 0n) {
    out = BASE58_ALPHABET[Number(num % 58n)] + out;
    num /= 58n;
  }
  let zeros = 0;
  while (buf[zeros] === 0) zeros += 1;
  return '1'.repeat(zeros) + out;
}

/* ---------- TRON ---------- */

/* عنوان TRON صحيح؟ فحص Base58Check كامل (بادئة 0x41 + checksum مزدوج SHA-256) */
function isTronAddress(value) {
  const v = String(value || '').trim();
  if (!TRON_BASE58_RE.test(v)) return false;
  const raw = base58Decode(v);
  if (!raw || raw.length !== 25) return false;
  if (raw[0] !== 0x41) return false;
  const payload = raw.subarray(0, 21);
  const checksum = raw.subarray(21);
  return sha256(sha256(payload)).subarray(0, 4).equals(checksum);
}

/* TRON base58 → الشكل السداسي (41 + 20 بايت) */
function tronBase58ToHex(value) {
  const raw = base58Decode(String(value || '').trim());
  if (!raw || raw.length !== 25) return '';
  return raw.subarray(0, 21).toString('hex');
}

/* TRON hex41 → base58 */
function tronHexToBase58(value) {
  const hex = String(value || '').trim().replace(/^0x/, '').toLowerCase();
  if (!/^41[0-9a-f]{40}$/.test(hex)) return '';
  const payload = Buffer.from(hex, 'hex');
  const checksum = sha256(sha256(payload)).subarray(0, 4);
  return base58Encode(Buffer.concat([payload, checksum]));
}

/* ---------- EVM ---------- */

function isEvmAddress(value) {
  const v = String(value || '').trim();
  if (!EVM_RE.test(v)) return false;
  // viem: يقبل الأحرف الصغيرة/الكبيرة كليًا، ويتحقق من EIP-55 في الحالة المختلطة
  return isEvmChecksumAddress(v);
}

/* ---------- عائلة العنوان ---------- */

/**
 * 'empty' | 'evm' | 'evm-invalid' | 'tron' | 'tron-invalid' | 'unknown'
 */
function detectFamily(value) {
  const v = String(value || '').trim();
  if (!v) return 'empty';
  if (TRON_BASE58_RE.test(v)) return isTronAddress(v) ? 'tron' : 'tron-invalid';
  if (TRON_HEX_RE.test(v)) return 'tron';
  if (EVM_RE.test(v)) return isEvmAddress(v) ? 'evm' : 'evm-invalid';
  return 'unknown';
}

function isTronFamily(value) {
  const f = detectFamily(value);
  return f === 'tron' || f === 'tron-invalid';
}

/* ---------- الشبكة ---------- */

/* عائلة العناوين التي تستخدمها الشبكة: 'evm' أو 'tron' */
function chainFamily(chainId) {
  const chain = getChain(chainId);
  if (!chain) return null;
  return chain.addressFamily || 'evm';
}

function chainLabel(chainId) {
  const chain = getChain(chainId);
  if (!chain) return `شبكة ${chainId}`;
  return chain.nameAr || chain.name;
}

/* الشبكات التي يصلح لها هذا الشكل من العناوين */
function chainsForFamily(family) {
  const want = family === 'tron' ? 'tron' : 'evm';
  return Object.values(require('../../config/chains').CHAINS)
    .filter(c => (c.addressFamily || 'evm') === want)
    .map(c => ({ id: c.id, name: c.name, nameAr: c.nameAr || c.name }));
}

/* ---------- الرسائل ---------- */

function addressError(message, code = 'ADDRESS_INVALID') {
  const err = new Error(message);
  err.code = code;
  return err;
}

/* ---------- الفحص الأساسي ---------- */

/**
 * يتحقق أن العنوان صحيح_format_ ومناسب للشبكة المختارة.
 * يرمي خطأً واضحًا عند عدم التطابق (مثل TRC20 في خانة BNB).
 * يُرجع العنوان بعد التوحيد (checksum لـ EVM، base58 لـ TRON).
 */
function assertAddressForChain(address, chainId) {
  const value = String(address || '').trim();
  const family = detectFamily(value);
  const want = chainFamily(Number(chainId));

  if (!want) throw addressError('شبكة غير مدعومة');

  if (family === 'empty') {
    throw addressError('عنوان المحفظة مطلوب');
  }
  if (family === 'unknown') {
    throw addressError(
      'العنوان غير صالح. صيغتا العنوان المقبولتان: عنوان EVM يبدأ بـ 0x (40 خانة hex) '
      + 'أو عنوان TRON/TRC20 يبدأ بحرف T (34 محرفًا).'
    );
  }
  if (family === 'tron-invalid') {
    throw addressError(
      'عنوان TRON غير صالح: فشل فحص Base58Check (حرف مكتوب خطأً). '
      + 'انسخ العنوان كاملًا (34 محرفًا يبدأ بحرف T) من محفظتك.'
    );
  }
  if (family === 'evm-invalid') {
    throw addressError(
      'عنوان EVM غير صالح: فشل فحص EIP-55. أعد نسخ العنوان من محفظتك.'
    );
  }

  if (want === 'tron' && family === 'evm') {
    throw addressError(
      `هذا عنوان EVM (0x…) ولا يصلح على ${chainLabel(chainId)}. `
      + 'عناوين TRON تبدأ بحرف T — استخدم عنوان TRON (T…) أو غيّر الشبكة إلى EVM (Base/BNB).',
      'ADDRESS_NETWORK_MISMATCH'
    );
  }
  if (want === 'evm' && family === 'tron') {
    throw addressError(
      `هذا عنوان TRON/TRC20 (يبدأ بحرف T) ولا يصلح على ${chainLabel(chainId)}. `
      + 'اختر شبكة TRON أو استخدم عنوان EVM (0x…).',
      'ADDRESS_NETWORK_MISMATCH'
    );
  }

  return normalizeForChain(value, chainId);
}

/* توحيد صيغة العنوان حسب عائلة الشبكة */
function normalizeForChain(address, chainId) {
  const value = String(address || '').trim();
  if (chainFamily(Number(chainId)) === 'tron') {
    if (TRON_HEX_RE.test(value)) return tronHexToBase58(value);
    return value;
  }
  return toChecksumAddress(value);
}

/**
 * فحص غير مُلزم: يعيد { ok, code, message, family, suggestion }.
 * يُستخدم في اللوحة (تقرير) وفي الواجهة (تلميح فوري).
 */
function checkAddress(address, chainId) {
  const value = String(address || '').trim();
  const family = detectFamily(value);
  const want = chainFamily(Number(chainId));
  const base = { family, chain_id: Number(chainId), ok: false, code: null, message: '', suggestion: null };

  if (!value) return { ...base, code: 'EMPTY', message: 'العنوان مطلوب' };
  if (family === 'unknown') {
    return { ...base, code: 'INVALID', message: 'صيغة العنوان غير معروفة —Expected 0x… أو T…' };
  }
  if (family === 'tron-invalid') {
    return { ...base, code: 'CHECKSUM', message: 'فشل فحص Base58Check — أعد نسخ عنوان TRON كاملًا' };
  }
  if (family === 'evm-invalid') {
    return { ...base, code: 'CHECKSUM', message: 'فشل فحص EIP-55 — أعد نسخ عنوان EVM من محفظتك' };
  }
  if (want === 'tron' && family === 'evm') {
    return {
      ...base,
      code: 'NETWORK_MISMATCH',
      message: `عنوان EVM (0x…) — لا يصلح على ${chainLabel(chainId)}. استخدم عنوان TRON (T…).`,
      suggestion: chainsForFamily('tron'),
    };
  }
  if (want === 'evm' && family === 'tron') {
    return {
      ...base,
      code: 'NETWORK_MISMATCH',
      message: `عنوان TRON/TRC20 (T…) — لا يصلح على ${chainLabel(chainId)}. اختر TRON أو استخدم عنوان EVM (0x…).`,
      suggestion: chainsForFamily('tron'),
    };
  }
  return {
    ...base,
    ok: true,
    code: 'OK',
    message: family === 'tron'
      ? `عنوان TRON صالح (${value})`
      : `عنوان EVM صالح على ${chainLabel(chainId)}`,
    // على شبكات EVM نفس العنوان صالح — تنبيه معلوماتي
    note: family === 'evm'
      ? 'العنوان نفسه صالح على كل شبكات EVM — تأكد أن الجهة المستفيدة تملك نفس العنوان على هذه الشبكة.'
      : null,
  };
}

/* هل يحتوي نصّ ما على عنوان TRON؟ (لمنع العناوين داخل وصف الحملة) */
function findTronAddresses(text) {
  const value = String(text || '');
  const hits = new Set();
  for (const m of value.matchAll(/\bT[1-9A-HJ-NP-Za-km-z]{33}\b/g)) {
    if (isTronAddress(m[0])) hits.add(m[0]);
  }
  return [...hits];
}

module.exports = {
  detectFamily,
  isEvmAddress,
  isTronAddress,
  isTronFamily,
  chainFamily,
  chainLabel,
  chainsForFamily,
  assertAddressForChain,
  normalizeForChain,
  checkAddress,
  findTronAddresses,
  base58Decode,
  base58Encode,
  tronBase58ToHex,
  tronHexToBase58,
};
