/* اختبارات فحص العناوين: EVM مقابل TRON/TRC20 */

const test = require('node:test');
const assert = require('node:assert/strict');

const addresses = require('../src/lib/addresses');
const validate = require('../src/lib/validate');
const { getChain, tokensFor, listChains } = require('../config/chains');

const EVM = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // USDC على Ethereum
const TRON = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';            // عقد USDT على TRON
const TRON_WALLET = 'TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj';   // عنوان محفظة TRON صالح
const TRON_HEX = '0x41a614f803b6fd780986a42c78ec9c7f77e6ded13c';

const BSC = 56;
const BASE = 8453;
const TRON_ID = 728126428;

test('شبكة TRON موجودة في الإعدادات مع عنوانها الصحيح', () => {
  const chain = getChain(TRON_ID);
  assert.ok(chain, 'TRON موجودة');
  assert.equal(chain.addressFamily, 'tron');
  assert.equal(chain.native.symbol, 'TRX');
  assert.equal(chain.native.decimals, 6);
  const tokens = tokensFor(TRON_ID);
  const usdt = tokens.find(t => t.symbol === 'USDT');
  assert.ok(usdt, 'USDT موجود على TRON');
  assert.equal(usdt.decimals, 6);
  assert.equal(usdt.base58, TRON);
  assert.equal(usdt.address, TRON_HEX);
  // التحويل hex41 ⇄ base58 متسق
  assert.equal(addresses.tronHexToBase58(TRON_HEX), TRON);
  assert.equal(addresses.tronBase58ToHex(TRON), TRON_HEX.replace(/^0x/, ''));
});

test('كل الشبكات الأخرى من عائلة EVM', () => {
  for (const c of listChains()) {
    if (c.id === TRON_ID) continue;
    assert.equal(c.addressFamily, 'evm', `${c.name} من عائلة EVM`);
  }
});

test('كشف عائلة العنوان', () => {
  assert.equal(addresses.detectFamily(EVM), 'evm');
  assert.equal(addresses.detectFamily(EVM.toLowerCase()), 'evm');
  assert.equal(addresses.detectFamily(TRON), 'tron');
  assert.equal(addresses.detectFamily(TRON_WALLET), 'tron');
  assert.equal(addresses.detectFamily(TRON_HEX), 'tron');
  assert.equal(addresses.detectFamily(''), 'empty');
  assert.equal(addresses.detectFamily('0x123'), 'unknown');
});

test('عنوان TRON صحيح: checksum Base58Check', () => {
  assert.equal(addresses.isTronAddress(TRON), true);
  assert.equal(addresses.isTronAddress(TRON_WALLET), true);
  // تغيير حرف واحد يكسر الـchecksum
  const broken = `T${TRON.slice(1, 33)}X`;
  assert.equal(addresses.isTronAddress(broken), false);
  assert.equal(addresses.detectFamily(broken), 'tron-invalid');
});

test('عنوان EVM صحيح: EIP-55', () => {
  assert.equal(addresses.isEvmAddress(EVM), true);
  assert.equal(addresses.isEvmAddress(EVM.toLowerCase()), true);
  assert.equal(addresses.isEvmAddress('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB49'), false);
});

test('TRC20 في خانة BNB → خطأ مطابقة شبكة', () => {
  assert.throws(
    () => addresses.assertAddressForChain(TRON, BSC),
    (err) => {
      assert.equal(err.code, 'ADDRESS_NETWORK_MISMATCH');
      assert.match(err.message, /TRON/);
      assert.match(err.message, /بينانس/);
      return true;
    }
  );
});

test('TRC20 في خانة Base → خطأ مطابقة شبكة', () => {
  assert.throws(
    () => addresses.assertAddressForChain(TRON, BASE),
    (err) => err.code === 'ADDRESS_NETWORK_MISMATCH'
  );
});

test('عنوان EVM في خانة TRON → خطأ مطابقة شبكة', () => {
  assert.throws(
    () => addresses.assertAddressForChain(EVM, TRON_ID),
    (err) => {
      assert.equal(err.code, 'ADDRESS_NETWORK_MISMATCH');
      assert.match(err.message, /EVM/);
      assert.match(err.message, /ترون/);
      return true;
    }
  );
});

test('العنوان الصحيح يُقبل ويُوحَّد', () => {
  assert.equal(addresses.assertAddressForChain(TRON, TRON_ID), TRON);
  assert.equal(addresses.assertAddressForChain(TRON_HEX, TRON_ID), TRON);
  assert.equal(addresses.assertAddressForChain(EVM, BSC), EVM);
  assert.equal(addresses.assertAddressForChain(EVM.toLowerCase(), BASE), EVM);
});

test('عناوين غير صالحة تُرفض برسالة واضحة', () => {
  assert.throws(() => addresses.assertAddressForChain('', BASE), /مطلوب/);
  assert.throws(() => addresses.assertAddressForChain('0x123', BASE), /غير صالح/);
  assert.throws(() => addresses.assertAddressForChain('T123', BASE), /غير صالح/);
  // 34 محرفًا لكن الـchecksum خاطئ → رسالة مخصّصة
  const badChecksum = `T${TRON.slice(1, 33)}X`;
  assert.throws(() => addresses.assertAddressForChain(badChecksum, TRON_ID), /Base58Check/);
});

test('checkAddress يعيد تقريرًا واضحًا (بلا رمي)', () => {
  const bad = addresses.checkAddress(TRON, BSC);
  assert.equal(bad.ok, false);
  assert.equal(bad.code, 'NETWORK_MISMATCH');
  assert.ok(bad.suggestion.some(c => c.id === TRON_ID));

  const good = addresses.checkAddress(TRON, TRON_ID);
  assert.equal(good.ok, true);
  assert.equal(good.code, 'OK');

  const empty = addresses.checkAddress('', TRON_ID);
  assert.equal(empty.code, 'EMPTY');
});

test('منع عناوين TRON داخل نصوص الحملة', () => {
  assert.equal(validate.hasWalletAddress(`العنوان هو ${TRON}`), true);
  assert.equal(validate.hasWalletAddress(`العنوان هو ${TRON_WALLET}`), true);
  assert.equal(validate.hasWalletAddress('حملة banal بلا عناوين'), false);
  // نص لاتيني عشوائي لا يُعتبر عنوانًا
  assert.equal(validate.hasWalletAddress('ThisIsNotAWalletAddressAtAll'), false);
  assert.throws(
    () => validate.assertNoWalletAddress({ story: `خ ${TRON}` }),
    (err) => err.code === 'WALLET_ADDRESS_NOT_ALLOWED'
  );
});

test('قاعدة EVM القديمة ما زالت تعمل', () => {
  assert.equal(validate.hasWalletAddress(`0x${'a'.repeat(40)}`), true);
  assert.equal(validate.hasWalletAddress('0x' + 'b'.repeat(64)), false); // بصمة معاملة مسموحة
});
