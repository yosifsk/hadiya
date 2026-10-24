/* ضبط عتبات الرسوم المتدرّجة داخل عقد DonationSplitter.
 *
 *   npm run set:tiers                 (Base Sepolia افتراضيًا)
 *   CHAIN_ID=8453 npm run set:tiers   (Base mainnet)
 *
 * العتبات تُحسب بالدولار وتُخزَّن بالوحدة الأصلية للرمز:
 *   حتى ٢٠٠ دولار → ٩٪ ، فوق ٢٠٠ → ٧٪ ، فوق ٣٠٠ → ٥٪ ، فوق ٤٠٠ → ٣٪
 * ملاحظة: للأokens المتقلّبة (ETH/POL) تُحسب العتبات من السعر الحالي،
 * لذا يجب إعادة تشغيل هذا السكربت دوريًا (كل بضعة أسابيع) لتحديثها. */

require('dotenv').config();

const { createWalletClient, createPublicClient, http, parseAbi, parseUnits } = require('viem');
const { base, baseSepolia, mainnet, polygon, bsc } = require('viem/chains');

const { getSetting, setSetting } = require('../src/db');
const { getChain, rpcUrl, tokensFor } = require('../config/chains');
const price = require('../src/lib/price');
const brand = require('../config/brand');

const VIEM_CHAINS = { 1: mainnet, 56: bsc, 137: polygon, 8453: base, 84532: baseSepolia };

const log = (level, message, extra = {}) =>
  console.log(JSON.stringify({ time: new Date().toISOString(), level, message, ...extra }));

const abi = parseAbi([
  'function setTiers(address token, uint128 threshold1, uint128 threshold2, uint128 threshold3, bool enabled)',
  'function tiers(address token) view returns (bool enabled, uint128 threshold1, uint128 threshold2, uint128 threshold3, uint64 updatedAt)',
]);

async function main() {
  const chainId = Number(process.env.CHAIN_ID || 84532);
  const chain = getChain(chainId);
  if (!chain) throw new Error(`unsupported CHAIN_ID ${chainId}`);

  const splitter = getSetting(`splitter_address:${chainId}`, '') || getSetting('splitter_address', '');
  if (!splitter) throw new Error('splitter address not found — deploy the contract first');

  const privateKey = (process.env.PRIVATE_KEY || '').trim();
  if (!privateKey) throw new Error('PRIVATE_KEY is missing in .env');

  const viemChain = VIEM_CHAINS[chainId] || baseSepolia;
  const transport = http(rpcUrl(chain));
  const walletClient = createWalletClient({ chain: viemChain, transport });
  const publicClient = createPublicClient({ chain: viemChain, transport });
  const account = walletClient.accountFromPrivateKey(privateKey);

  const thresholds = brand.feeTiers.filter(t => t.maxUsd !== Infinity).map(t => t.maxUsd);
  const [t1, t2, t3] = thresholds;

  await applyTiers({ walletClient, publicClient, account, viemChain, splitter, chain, chainId, t1, t2, t3 });

  // وضع المراقبة: تحديث دوري للعتبات (مهم للأصول المتقلّبة مثل ETH)
  if (process.argv.includes('--watch')) {
    const everyMin = Number(process.env.TIERS_WATCH_MIN || 60 * 24 * 6); // افتراضيًا كل ٦ أيام
    log('info', 'watch mode enabled', { every_min: everyMin });
    setInterval(async () => {
      try {
        await applyTiers({ walletClient, publicClient, account, viemChain, splitter, chain, chainId, t1, t2, t3 });
      } catch (err) {
        log('warn', 'watch refresh failed', { error: String(err.message || err) });
      }
    }, everyMin * 60_000).unref?.();
  }
}

async function applyTiers({ walletClient, publicClient, account, viemChain, splitter, chain, chainId, t1, t2, t3 }) {
  for (const token of tokensFor(chainId)) {
    const usdPrice = await price.getPrice(token.symbol);
    if (!usdPrice) {
      log('warn', 'price unavailable — skipping token', { symbol: token.symbol });
      continue;
    }
    const raw = (usdValue) => parseUnits((usdValue / usdPrice).toFixed(token.decimals), token.decimals);
    const th1 = raw(t1);
    const th2 = raw(t2);
    const th3 = raw(t3);

    const txHash = await walletClient.writeContract({
      address: splitter,
      abi,
      functionName: 'setTiers',
      args: [token.address || '0x0000000000000000000000000000000000000000', th1, th2, th3, true],
      chain: viemChain,
      account,
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    // نحفظ العتبات وسعر المرجع محليًا لعرضها بشفافية في الواجهة
    setSetting(`tiers:${chainId}:${token.symbol}`, JSON.stringify({
      thresholds_raw: [th1.toString(), th2.toString(), th3.toString()],
      reference_price_usd: usdPrice,
      updated_at: new Date().toISOString(),
      chain_id: chainId,
      symbol: token.symbol,
    }));

    log('info', 'tiers updated', {
      chain: chain.name,
      symbol: token.symbol,
      price_usd: usdPrice,
      thresholds_raw: [th1.toString(), th2.toString(), th3.toString()],
      tx: txHash,
    });
  }

  console.log('\n=== تم ضبط الشرائح ===');
  console.log(`العقد: ${splitter} على ${chain.name}`);
  console.log(`الشرائح: حتى ${t1}$ → 9% ، فوق ${t1}$ → 7% ، فوق ${t2}$ → 5% ، فوق ${t3}$ → 3%`);
}

main().catch((err) => {
  log('error', 'set tiers failed', { error: String(err.message || err) });
  process.exit(1);
});
