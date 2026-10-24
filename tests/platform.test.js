/* اختبارات المنصة — node --test
   تغطي: حساب الرسوم المتدرّجة، الاستعلامات، منع عناوين المحافظ، وقائمة المراجعة. */

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

// قاعدة بيانات منفصلة لهذا الملف (الاختبارات تعمل بالتوازي)
const SUITE = 'platform';
process.env.DATA_DIR = path.join(__dirname, '..', 'data', 'test', SUITE);
process.env.DB_FILE = path.join(__dirname, '..', 'data', 'test', SUITE, 'test.sqlite');

const fees = require('../src/lib/fees');
const validate = require('../src/lib/validate');
const models = require('../src/models');
const auth = require('../src/lib/auth');
const { one } = require('../src/db');
const { findToken, tokensFor } = require('../config/chains');
const brand = require('../config/brand');

test('splitAmount: ٩١٪ للمستفيد و٩٪ للمنصة', () => {
  const split = fees.splitAmount('100000000', brand.platformFeeBps); // 100 USDC (6 decimals)
  assert.strictEqual(split.fee, '9000000');
  assert.strictEqual(split.charity, '91000000');
  assert.strictEqual(BigInt(split.gross), BigInt(split.fee) + BigInt(split.charity));
});

test('splitAmount: لا رسوم على مبلغ ضئيل بلا كسور مفقودة', () => {
  const split = fees.splitAmount('11', brand.platformFeeBps);
  assert.strictEqual(split.fee, '0');
  assert.strictEqual(split.charity, '11');
});

test('formatUnits: تحويل صحيح', () => {
  assert.strictEqual(fees.formatUnits('1000000', 6), '1');
  assert.strictEqual(fees.formatUnits('1500000', 6), '1.5');
  assert.strictEqual(fees.formatUnits('1', 18), '0.000000000000000001');
});

test('percent: نسبة التقدّم', () => {
  assert.strictEqual(fees.percent('500', '1000'), 50);
  assert.strictEqual(fees.percent('5', '0'), 0);
});

test('الرسوم المتدرّجة: كل شريحة تُطبَّق على حدودها', () => {
  assert.strictEqual(fees.feeBpsForUsd(10), 900);
  assert.strictEqual(fees.feeBpsForUsd(200), 900);
  assert.strictEqual(fees.feeBpsForUsd(200.01), 700);
  assert.strictEqual(fees.feeBpsForUsd(300), 700);
  assert.strictEqual(fees.feeBpsForUsd(300.01), 500);
  assert.strictEqual(fees.feeBpsForUsd(400), 500);
  assert.strictEqual(fees.feeBpsForUsd(400.01), 300);
  assert.strictEqual(fees.feeBpsForUsd(100000), 300);
});

test('الرسوم المتدرّجة: لا نسبة أقل من الحد الأدنى', () => {
  assert.ok(fees.feeBpsForUsd(1e9) >= brand.minFeeBps);
  assert.ok(fees.feeBpsForUsd(1) <= brand.platformFeeBps);
});

test('splitUsd: مجموع الرسوم والصافي = الإجمالي', () => {
  for (const amount of [50, 200, 250, 300, 350, 400, 900]) {
    const split = fees.splitUsd(amount);
    assert.ok(Math.abs((split.fee + split.charity) - amount) < 1e-6);
    assert.strictEqual(split.bps, fees.feeBpsForUsd(amount));
  }
});

test('منع عناوين المحافظ داخل نصوص الحملة', () => {
  assert.ok(validate.hasWalletAddress('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'));
  assert.ok(validate.hasWalletAddress('الرجاء التبرع إلى 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 مباشرة'));
  assert.ok(!validate.hasWalletAddress('حملة لترميم مدرسة فيه اطفال'));
  assert.ok(!validate.hasWalletAddress('خصم ٩٪ من كل تبرع generously'));
  // بصمة معاملة (64 خانة) مسموحة — ليست عنوان محفظة
  assert.ok(!validate.hasWalletAddress('المعاملة 0x' + 'ab'.repeat(32) + ' تمّت'));
});

test('إنشاء حملة بعنوان محفظة داخل القصة يُرفض', () => {
  assert.throws(() => models.createCampaign({
    title: 'حملة فيها عنوان',
    story: 'تبرعوا إلى 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    goal_usd: 100,
    charity_wallet: '0x1111111111111111111111111111111111111111',
    chain_id: 8453,
  }), (err) => err.code === 'WALLET_ADDRESS_NOT_ALLOWED');
});

test('createCampaign + campaignTotals + donation lifecycle', () => {
  const campaign = models.createCampaign({
    title: 'حملة اختبار وحدة',
    subtitle: 'اختبار',
    story: 'قصة اختبارية',
    category: 'community',
    goal_usd: 1000,
    charity_wallet: '0x1111111111111111111111111111111111111111',
    chain_id: 8453,
    token_symbol: 'USDC',
    status: 'active',
  });
  assert.ok(campaign.id > 0);
  assert.ok(campaign.slug.length > 0);

  const empty = models.campaignTotals(campaign.id);
  assert.strictEqual(empty.totalUsd, 0);
  assert.strictEqual(empty.donorCount, 0);

  const donation = models.insertDonation({
    campaign_id: campaign.id,
    donor_address: '0x2222222222222222222222222222222222222222',
    token_symbol: 'USDC',
    chain_id: 8453,
    amount_raw: '1000000',
    fee_raw: '90000',
    charity_raw: '910000',
    usd_value: 1,
    tx_hash: '0x' + 'ab'.repeat(32),
    status: 'confirmed',
    settlement: 'splitter',
    fee_settled: 1,
    fee_bps: 900,
  });
  assert.ok(donation.id > 0);

  const totals = models.campaignTotals(campaign.id);
  assert.strictEqual(totals.totalUsd, 1);
  assert.strictEqual(totals.donorCount, 1);
  assert.strictEqual(totals.byToken[0].fee, '90000');
  assert.strictEqual(totals.byToken[0].charity, '910000');

  const platform = models.platformTotals();
  assert.ok(platform.grossUsd >= 1);
  assert.ok(platform.feeUsd > 0);
  assert.ok(platform.charityUsd > 0);

  const found = models.findDonationByTx('0x' + 'ab'.repeat(32));
  assert.ok(found);
  assert.strictEqual(found.status, 'confirmed');
});

test('قائمة المراجعة: الحملات الجديدة لا تظهر للعامة قبل الموافقة', () => {
  const pending = models.createCampaign({
    title: 'حملة تنتظر المراجعة',
    story: 'قصة',
    goal_usd: 100,
    charity_wallet: '0x2222222222222222222222222222222222222222',
    chain_id: 8453,
  });
  assert.strictEqual(pending.status, 'pending_review');

  const publicList = models.listCampaigns({ limit: 100 });
  assert.ok(!publicList.some(c => c.id === pending.id));

  const queue = models.listCampaignsByStatus('pending_review');
  assert.ok(queue.some(c => c.id === pending.id));

  models.updateCampaign(pending.id, { status: 'active' });
  assert.ok(models.listCampaigns({ limit: 100 }).some(c => c.id === pending.id));
});

test('تحديثات وتعليقات الحملة', () => {
  const campaign = models.createCampaign({
    title: 'حملة للتحديثات والتعليقات',
    story: 'قصة',
    goal_usd: 100,
    charity_wallet: '0x4444444444444444444444444444444444444444',
    chain_id: 8453,
    status: 'active',
  });
  models.addUpdate(campaign.id, { title: 'تحديث', body: 'نص التحديث' });
  models.addComment(campaign.id, { body: 'تعليق تجريبي', author_name: 'مختبِر' });
  assert.ok(models.listUpdates(campaign.id).length >= 1);
  assert.ok(models.listComments(campaign.id).length >= 1);
});

test('رمز التحقق يُستهلك بعد الاستخدام (منع إعادة تشغيل التوقيع)', () => {
  const address = '0x3333333333333333333333333333333333333333';
  const nonce = auth.createNonce(address);
  assert.strictEqual(auth.readNonce(address), nonce);
  assert.strictEqual(auth.consumeNonce(address, nonce), true);
  assert.strictEqual(auth.consumeNonce(address, nonce), false);
  assert.strictEqual(auth.readNonce(address), null);
});

test('سلامة رموز الشبكات', () => {
  const base = tokensFor(8453);
  const usdc = base.find(t => t.symbol === 'USDC');
  assert.ok(usdc && usdc.address.startsWith('0x'));
  assert.strictEqual(findToken(8453, 'USDC').address, usdc.address);
  assert.strictEqual(findToken(8453, 'ETH').isNative, true);
  assert.strictEqual(findToken(9999, 'USDC'), null);
});

test('عدد الخانات مقيّد لكل رمز (USDT على BSC = 18 وليس 6)', () => {
  // خطأ تاريخي: افتراض 6 لكل ERC20 يجعل التبرّع خاطئًا بمعامل 10^12
  assert.strictEqual(findToken(56, 'USDT').decimals, 18);
  assert.strictEqual(findToken(56, 'USDC').decimals, 18);
  assert.strictEqual(findToken(8453, 'USDT').decimals, 6);
  assert.strictEqual(findToken(8453, 'USDC').decimals, 6);
  assert.strictEqual(findToken(137, 'USDC').decimals, 6);
  assert.strictEqual(findToken(8453, 'ETH').decimals, 18);
});

test('سلامة قاعدة البيانات: campaign موجود', () => {
  const row = one('SELECT COUNT(*) AS n FROM campaigns');
  assert.ok(row.n > 0);
});
