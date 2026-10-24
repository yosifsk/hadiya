/* ============================================================
   HADIYA — التحقق من التوقيع وإثبات ملكية العنوان
   ------------------------------------------------------------
   يدعم مخطّطين:
   • EVM  : EIP-191 (personal_sign) — \x19Ethereum Signed Message:\n
   • TRON : keccak256(رسالة خام) بلا بادئة (ما تفعله TronLink/TronWave)
   تُستخدم لإثبات ملكية عنوان الاستلام ولربط المحفظة بالحساب.
   ============================================================ */

const { keccak256, toBytes, verifyHash, verifyMessage, getAddress, isAddress } = require('viem');
const addresses = require('./addresses');

/* يحوّل عنوان TRON (base58 أو hex41) إلى صيغة EVM-like للتحقق من التوقيع */
function tronAddressToBytes20(address) {
  const hex = addresses.tronBase58ToHex(address);
  if (!hex) return null;
  // 41 + 20 بايت → نأخذ الـ20 بايت الأخيرة (كما في TVM)
  return `0x${hex.slice(2)}`;
}

/* يحوّل عنوان TRON إلى شكل EVM (0x + 40 خانة) للتحقق */
function tronToEvmHex(address) {
  const hex = addresses.tronBase58ToHex(address);
  if (!hex) return null;
  return `0x${hex.slice(2)}`;
}

/**
 * يتحقق من توقيع رسالة لعنوان معيّن.
 * @returns {Promise<boolean>}
 */
async function verifyMessageSignature(address, message, signature) {
  const value = String(address || '').trim();
  const text = String(message || '');
  const sig = String(signature || '').trim();
  if (!value || !text || !sig) return false;

  const family = addresses.detectFamily(value);

  // عنوان TRON
  if (family === 'tron' || family === 'tron-invalid') {
    const evmHex = tronToEvmHex(value);
    if (!evmHex) return false;
    try {
      // مخطّط TRON: keccak256 للرسالة الخام (بلا بادئة EIP-191)
      return await verifyHash({
        address: evmHex,
        hash: keccak256(toBytes(text)),
        signature: sig,
      });
    } catch {
      return false;
    }
  }

  // عنوان EVM
  if (family !== 'evm') return false;
  try {
    return await verifyMessage({
      address: getAddress(value),
      message: text,
      signature: sig,
    });
  } catch {
    return false;
  }
}

module.exports = { verifyMessageSignature, tronAddressToBytes20, tronToEvmHex };
