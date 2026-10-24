/* خدمة التبرعات: تسجيل المعاملة، التحقق منها على السلسلة، ومزامنة أحداث العقد.
   المبلغ الموثوق هو ما تقوله السلسلة — لا ما يرسله المتصفح. */

const chain = require('../lib/chain');
const price = require('../lib/price');
const fees = require('../lib/fees');
const models = require('../models');
const { getSetting, setSetting, one, q } = require('../db');
const { getChain, findToken } = require('../../config/chains');
const brand = require('../../config/brand');

const log = (level, message, extra = {}) =>
  console.log(JSON.stringify({ time: new Date().toISOString(), level, message, ...extra }));

const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 20_000);
const SYNC_INTERVAL_MS = Number(process.env.SYNC_INTERVAL_MS || 90_000);
// عمق التأكيد المطلوب قبل اعتماد التبرّع (حماية من انقلاب السلسلة)
const MIN_CONFIRMATIONS = Number(process.env.MIN_CONFIRMATIONS || 5);
// مهلة انتظار المعاملة قبل وسمها فاشلة
const PENDING_EXPIRY_MIN = Number(process.env.PENDING_EXPIRY_MIN || 120);
// أقصى عدد كتل في طلب واحد للسجلات (لتوافق مع حدود RPC العامة)
const LOG_CHUNK_BLOCKS = BigInt(process.env.LOG_CHUNK_BLOCKS || 2000);

function decimalsFor(chainId, tokenSymbol) {
  const token = findToken(chainId, tokenSymbol);
  if (!token) return 18;
  return token.decimals;
}

/* تسجيل تبرّع جديد من المتصفح (المعاملة أُرسلت بالفعل من محفظة المتبرّع). */
async function registerDonation({ campaign, txHash, chainId, tokenSymbol, donorAddress, donorName, message, isAnonymous }) {
  const existing = models.findDonationByTx(txHash);
  if (existing) return existing;

  const donation = models.insertDonation({
    campaign_id: campaign.id,
    donor_address: donorAddress || '',
    donor_name: donorName || '',
    message: message || '',
    is_anonymous: isAnonymous ? 1 : 0,
    chain_id: chainId,
    token_symbol: tokenSymbol,
    amount_raw: '0',
    fee_raw: '0',
    charity_raw: '0',
    usd_value: 0,
    tx_hash: txHash,
    status: 'pending',
    settlement: campaign.splitter_address ? 'splitter' : 'direct',
  });

  // محاولة تحقق فورية (قد تكون المعاملة مؤكَّدة بالفعل)
  await verifyDonation(donation.id).catch(() => {});
  return one('SELECT * FROM donations WHERE id = ?', donation.id);
}

/* التحقق من تبرّع واحد عبر الـ receipt والأحداث. */
async function verifyDonation(donationId) {
  const donation = one('SELECT * FROM donations WHERE id = ?', Number(donationId));
  if (!donation) return null;
  if (donation.status === 'confirmed') return donation;

  const campaign = models.getCampaignById(donation.campaign_id);
  if (!campaign) return donation;

  const receipt = await chain.getReceipt(donation.tx_hash, donation.chain_id);
  if (!receipt) {
    // انتهاء مهلة المنتظر: لا معاملة خلال المدة المحددة
    const ageMin = (Date.now() - Date.parse(donation.created_at.replace(' ', 'T') + 'Z')) / 60000;
    if (ageMin > PENDING_EXPIRY_MIN) {
      models.updateDonation(donation.id, {
        status: 'failed',
        error_reason: 'transaction not found after expiry window',
      });
      return one('SELECT * FROM donations WHERE id = ?', donation.id);
    }
    return donation; // ما زالت معلّقة
  }

  if (receipt.status !== 'success') {
    models.updateDonation(donation.id, { status: 'failed', error_reason: 'transaction reverted on chain' });
    return one('SELECT * FROM donations WHERE id = ?', donation.id);
  }

  // عمق التأكيد: لا نعتبر التبرّع مؤكدًا قبل عدد من الكتل لتفادي انقلاب السلسلة (reorg)
  const latestBlock = await chain.getBlockNumber(donation.chain_id);
  if (latestBlock && Number(receipt.blockNumber) + MIN_CONFIRMATIONS > latestBlock) {
    return donation; // ننتظر تأكيدات إضافية
  }

  const parsed = await chain.parseDonationReceipt(receipt, {
    splitterAddress: campaign.splitter_address || null,
    charityWallet: campaign.charity_wallet,
  });

  if (!parsed) {
    // غالبًا معاملة approve preparatory أو معاملة لا علاقة لها بتمويل الحملة
    models.updateDonation(donation.id, {
      status: 'failed',
      error_reason: 'no donation transfer found in this transaction',
    });
    return one('SELECT * FROM donations WHERE id = ?', donation.id);
  }

  const decimals = parsed.token
    ? decimalsFor(donation.chain_id, tokenSymbolFromAddress(donation.chain_id, parsed.token) || donation.token_symbol)
    : 18;

  const symbol = parsed.token
    ? tokenSymbolFromAddress(donation.chain_id, parsed.token) || donation.token_symbol
    : (getChain(donation.chain_id) ? getChain(donation.chain_id).native.symbol : donation.token_symbol);

  const usdPrice = await price.getPrice(symbol);
  const grossDecimal = Number(fees.formatUnits(parsed.gross, decimals));
  const usdValue = usdPrice ? grossDecimal * usdPrice : 0;

  // نسبة الرسوم: من العقد في حالة التبرّع عبر المقسّم، ومن جدول الشروح في التحويل المباشر
  let split;
  let feeBps;
  let feeTier = '';
  if (parsed.settlement === 'splitter') {
    split = { gross: parsed.gross, fee: parsed.fee, charity: parsed.toCharity };
    feeBps = Number(parsed.feeBps || brand.platformFeeBps);
  } else {
    feeBps = fees.feeBpsForUsd(usdValue);
    split = fees.splitAmount(parsed.gross, feeBps);
  }
  feeTier = fees.tierLabel(usdValue);

  models.updateDonation(donation.id, {
    donor_address: (parsed.donor || donation.donor_address || '').toLowerCase(),
    token_symbol: symbol,
    token_address: parsed.token || '',
    amount_raw: split.gross,
    fee_raw: split.fee,
    charity_raw: split.charity,
    usd_value: usdValue,
    status: 'confirmed',
    settlement: parsed.settlement,
    fee_settled: parsed.settlement === 'splitter' ? 1 : 0,
    block_number: parsed.blockNumber,
    confirmed_at: new Date().toISOString(),
    error_reason: '',
    fee_bps: feeBps,
    fee_tier: feeTier,
  });

  models.addLedger({
    kind: 'fee',
    campaign_id: donation.campaign_id,
    amount_raw: split.fee,
    token_symbol: symbol,
    chain_id: donation.chain_id,
    tx_hash: donation.tx_hash,
    note: parsed.settlement === 'splitter'
      ? `رسوم ${(feeBps / 100).toFixed(2)}٪ محصّلة داخل معاملة التبرّع`
      : `رسوم ${(feeBps / 100).toFixed(2)}٪ على تحويل مباشر — تحتاج تحصيلًا منفصلًا`,
  });

  log('info', 'donation confirmed', {
    donation_id: donation.id,
    campaign: campaign.slug,
    gross: split.gross,
    fee: split.fee,
    fee_bps: feeBps,
    symbol,
    usd: Number(usdValue.toFixed(2)),
    settlement: parsed.settlement,
  });

  return donation;
}

function tokenSymbolFromAddress(chainId, address) {
  const token = findToken(chainId, address);
  return token ? token.symbol : null;
}

/* مزامنة أحداث DonationReceived من عقد الموزّع.
   تستوعب التبرّعات التي تمّت مباشرة على العقد دون المرور بواجهة الموقع. */
async function syncSplitterEvents() {
  const rows = q(
    `SELECT DISTINCT chain_id, splitter_address FROM campaigns WHERE splitter_address != ''`
  );
  for (const row of rows) {
    const client = chain.getClient(row.chain_id);
    const lastKey = `sync_block:${row.chain_id}:${row.splitter_address.toLowerCase()}`;
    const lastBlock = Number(getSetting(lastKey, '0')) || 0;
    try {
      const latest = await client.getBlockNumber();
      const start = BigInt(lastBlock + 1);
      if (start > latest) continue;

      // نقرأ على دفعات: RPC العامة تضع حدًا لعدد الكتل في طلب واحد
      let cursor = start;
      const end = BigInt(latest);
      while (cursor <= end) {
        const chunkEnd = cursor + LOG_CHUNK_BLOCKS - 1n > end ? end : cursor + LOG_CHUNK_BLOCKS - 1n;
        const logs = await client.getLogs({
          address: row.splitter_address,
          event: {
            type: 'event',
            name: 'DonationReceived',
            inputs: [
              { name: 'campaignId', type: 'uint256', indexed: true },
              { name: 'donor', type: 'address', indexed: true },
              { name: 'charity', type: 'address', indexed: true },
              { name: 'token', type: 'address', indexed: false },
              { name: 'gross', type: 'uint256', indexed: false },
              { name: 'toCharity', type: 'uint256', indexed: false },
              { name: 'fee', type: 'uint256', indexed: false },
              { name: 'feeBps', type: 'uint16', indexed: false },
            ],
          },
          fromBlock: cursor,
          toBlock: chunkEnd,
        });

        await importDonationLogs(logs, row);

        // نثبّت المؤشر بعد كل دفعة حتى لا نفقد التقدم عند أي خطأ
        cursor = chunkEnd + 1n;
        setSetting(lastKey, cursor.toString());
      }
    } catch (err) {
      log('warn', 'splitter sync failed', { chain_id: row.chain_id, error: String(err.message || err) });
    }
  }
}

/* استيراد أحداث DonationReceived المستلمة */
async function importDonationLogs(logs, row) {
  for (const l of logs) {
    const txHash = l.transactionHash;
    if (models.findDonationByTx(txHash)) continue;
    const splitterCampaignId = Number(l.args.campaignId);
    const campaign = one(
      'SELECT * FROM campaigns WHERE chain_id = ? AND splitter_campaign_id = ?',
      row.chain_id,
      splitterCampaignId
    );
    if (!campaign) continue;

    const symbol = l.args.token === '0x0000000000000000000000000000000000000000'
      ? getChain(row.chain_id).native.symbol
      : tokenSymbolFromAddress(row.chain_id, l.args.token) || 'USDC';
    const decimals = decimalsFor(row.chain_id, symbol);
    const usdPrice = await price.getPrice(symbol);
    const grossDecimal = Number(fees.formatUnits(l.args.gross.toString(), decimals));
    const usdValue = usdPrice ? grossDecimal * usdPrice : 0;
    const feeBps = Number(l.args.feeBps ?? brand.platformFeeBps);
    const feeTier = fees.tierLabel(usdValue);

    models.insertDonation({
      campaign_id: campaign.id,
      donor_address: l.args.donor.toLowerCase(),
      donor_name: '',
      message: '',
      is_anonymous: 0,
      chain_id: row.chain_id,
      token_symbol: symbol,
      token_address: l.args.token === '0x0000000000000000000000000000000000000000' ? '' : l.args.token,
      amount_raw: l.args.gross.toString(),
      fee_raw: l.args.fee.toString(),
      charity_raw: l.args.toCharity.toString(),
      usd_value: usdValue,
      tx_hash: txHash,
      status: 'confirmed',
      settlement: 'splitter',
      fee_settled: 1,
      block_number: Number(l.blockNumber),
      fee_bps: feeBps,
      fee_tier: feeTier,
    });

    models.addLedger({
      kind: 'fee',
      campaign_id: campaign.id,
      amount_raw: l.args.fee.toString(),
      token_symbol: symbol,
      chain_id: row.chain_id,
      tx_hash: txHash,
      note: `رسوم ${(feeBps / 100).toFixed(2)}٪ محصّلة داخل معاملة التبرّع (مزامنة تلقائية)`,
    });

    log('info', 'donation imported from chain event', {
      campaign: campaign.slug,
      tx: txHash,
      gross: l.args.gross.toString(),
    });
  }
}

/* حلقة التحقق من التبرعات المعلّقة. */
async function pollPending() {
  const pending = models.pendingDonations(30);
  for (const donation of pending) {
    try {
      await verifyDonation(donation.id);
    } catch (err) {
      log('warn', 'donation verify failed', { donation_id: donation.id, error: String(err.message || err) });
    }
  }
}

let pollTimer = null;
let syncTimer = null;

function startWorkers() {
  if (pollTimer) return;
  pollTimer = setInterval(() => {
    pollPending().catch(() => {});
  }, POLL_INTERVAL_MS);
  syncTimer = setInterval(() => {
    syncSplitterEvents().catch(() => {});
  }, SYNC_INTERVAL_MS);
  pollTimer.unref?.();
  syncTimer.unref?.();
  setTimeout(() => syncSplitterEvents().catch(() => {}), 5_000);
}

function stopWorkers() {
  if (pollTimer) clearInterval(pollTimer);
  if (syncTimer) clearInterval(syncTimer);
  pollTimer = null;
  syncTimer = null;
}

module.exports = {
  registerDonation,
  verifyDonation,
  pollPending,
  syncSplitterEvents,
  startWorkers,
  stopWorkers,
};
