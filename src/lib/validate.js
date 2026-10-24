/* تحقق من محتوى الحملات: منع وضع عناوين المحافظ داخل النصوص.
   القاعدة: لا يُقبل أي عنوان EVM (0x + 40 خانة) ولا أي عنوان TRON/TRC20 (T + 33)
   في عنوان الحملة أو سطرها أو قصتها أو تحديثاتها.
   ملاحظة: بصمة معاملة (0x + 64 خانة) مسموحة لأنها ليست عنوان محفظة. */

const addresses = require('./addresses');

const EVM_ADDRESS = /0x[a-fA-F0-9]{40}(?![a-fA-F0-9])/g;
const EVM_TRUNCATED = /0x[a-fA-F0-9]{20,39}(?![a-fA-F0-9])/g;
const ENS_LIKE = /\b[a-z0-9-]+\.(eth|xyz|crypto)\b/gi;
/* عناوين TRON: T + 33 محرف Base58 — نتحقق من الـchecksum قبل اعتبارها عنوانًا */
const TRON_CANDIDATE = /\bT[1-9A-HJ-NP-Za-km-z]{33}\b/g;

function findWalletAddresses(text) {
  const value = String(text || '');
  const hits = new Set();

  for (const m of value.matchAll(EVM_ADDRESS)) hits.add(m[0]);
  for (const m of value.matchAll(EVM_TRUNCATED)) hits.add(m[0]);
  for (const m of value.matchAll(ENS_LIKE)) hits.add(m[0]);
  for (const m of value.matchAll(TRON_CANDIDATE)) {
    // نتحقق من صحة العنوان (Base58Check) حتى لا نرفض نصًا عربيًا عاديًا
    if (addresses.isTronAddress(m[0])) hits.add(m[0]);
  }

  return [...hits];
}

function hasWalletAddress(text) {
  return findWalletAddresses(text).length > 0;
}

const MESSAGE = 'لا يمكن وضع عناوين المحافظ داخل نص الحملة. '
  + 'اكتب العنوان في خانة «محفظة الجهة المستفيدة» فقط — '
  + 'وحقول العنوان والقصة والتحديثات مخصّصة للوصف النصي.';

/* يتحقق من مجموعة حقول نصية ويرمي خطأً موحّدًا إن وُجد عنوان */
function assertNoWalletAddress(fields) {
  for (const [field, value] of Object.entries(fields || {})) {
    if (value && hasWalletAddress(value)) {
      const err = new Error(MESSAGE);
      err.code = 'WALLET_ADDRESS_NOT_ALLOWED';
      err.field = field;
      throw err;
    }
  }
  return true;
}

module.exports = { findWalletAddresses, hasWalletAddress, assertNoWalletAddress, MESSAGE };
