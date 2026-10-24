/* يتحقق من صحّة بيانات TRON في config/chains.js (قراءة عامة فقط، بلا مفاتيح).
   شغّل: node scripts/verify-tron-usdt.js */
const { keccak256, toHex } = require('viem');
const { getChain, tokensFor } = require('../config/chains');
const addresses = require('../src/lib/addresses');

const sel = (sig) => toHex(keccak256(sig)).slice(0, 10);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const TRON_HEX41 = '41';
const NODE = 'https://api.trongrid.io';

async function getAccount(hex41) {
  const res = await fetch(`${NODE}/wallet/getaccount?address=${hex41}`, { headers: { accept: 'application/json' } });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return null; }
}

(async () => {
  const chain = getChain(728126428);
  if (!chain) throw new Error('TRON غير موجود في config/chains.js');

  const token = tokensFor(728126428).find(t => t.symbol === 'USDT');
  const hex41 = token.address.replace(/^0x/, '');
  const base58 = addresses.tronHexToBase58(hex41);

  console.log('config base58 :', token.base58);
  console.log('derived base58:', base58);
  console.log('match         :', token.base58 === base58);
  console.log('checksum ok   :', addresses.isTronAddress(base58));

  await sleep(500);
  const acc = await getAccount(hex41);
  if (acc) {
    console.log('on-chain type :', acc.type || '(not a contract)');
    const nameHex = acc.account_name || '';
    let name = '';
    try { name = Buffer.from(nameHex, 'hex').toString('utf8'); } catch { name = nameHex; }
    console.log('on-chain name :', name || '(none)');
  } else {
    console.log('on-chain      : تعذّر الاتصال بـ TronGrid');
  }
})();
