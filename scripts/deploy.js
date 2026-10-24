/* نشر عقد DonationSplitter على شبكة EVM.
 *
 *   1) انسخ .env.example إلى .env وضع PRIVATE_KEY و COLLECTOR_ADDRESS
 *   2) npm run compile:contracts
 *   3) npm run deploy:contracts            (Base Sepolia افتراضيًا)
 *   4) CHAIN_ID=8453 npm run deploy:contracts  (Base mainnet)
 *
 * يُخزَّن عنوان العقد في قاعدة البيانات (settings) ويصلح تلقائيًا للصفحات. */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { createWalletClient, createPublicClient, http, parseAbi } = require('viem');
const { base, baseSepolia, mainnet, polygon, bsc } = require('viem/chains');

const { setSetting, getSetting } = require('../src/db');
const { CHAINS, getChain, rpcUrl } = require('../config/chains');
const brand = require('../config/brand');

const VIEM_CHAINS = { 1: mainnet, 56: bsc, 137: polygon, 8453: base, 84532: baseSepolia };

const log = (level, message, extra = {}) =>
  console.log(JSON.stringify({ time: new Date().toISOString(), level, message, ...extra }));

async function main() {
  const chainId = Number(process.env.CHAIN_ID || 84532);
  const chain = getChain(chainId);
  if (!chain) throw new Error(`unsupported CHAIN_ID ${chainId}`);

  const privateKey = (process.env.PRIVATE_KEY || '').trim();
  if (!privateKey) throw new Error('PRIVATE_KEY is missing in .env');
  const collector = (process.env.COLLECTOR_ADDRESS || getSetting('collector_address', '')).trim();
  if (!collector) throw new Error('COLLECTOR_ADDRESS is missing in .env');

  const artifactPath = path.join(__dirname, '..', 'contracts', 'build', 'DonationSplitter.json');
  if (!fs.existsSync(artifactPath)) {
    throw new Error('contract artifact not found — run: npm run compile:contracts');
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  const viemChain = VIEM_CHAINS[chainId] || baseSepolia;
  const transport = http(rpcUrl(chain));
  const walletClient = createWalletClient({ chain: viemChain, transport });
  const publicClient = createPublicClient({ chain: viemChain, transport });
  const account = walletClient.accountFromPrivateKey(privateKey);

  log('info', 'deploying contract', {
    chain: chain.name,
    chain_id: chainId,
    deployer: account.address,
    collector,
    fee_bps: 900,
  });

  // حدود الرسوم حسب النموذج المختار في config/brand.js
  const feeBounds = {
    tiered: { min: brand.minFeeBps, max: brand.platformFeeBps },
    flat: { min: brand.platformFeeBps, max: brand.platformFeeBps },
    zero: { min: 0, max: 0 },
  }[brand.feeMode] || { min: brand.minFeeBps, max: brand.platformFeeBps };

  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [collector, feeBounds.min, feeBounds.max],
    chain: viemChain,
    account,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const address = receipt.contractAddress;
  if (!address) throw new Error('deployment failed: no contract address');

  setSetting(`splitter_address:${chainId}`, address);
  setSetting('splitter_address', address);
  setSetting('splitter_chain_id', String(chainId));
  setSetting('splitter_fee_bounds', JSON.stringify(feeBounds));

  log('info', 'contract deployed', { address, tx: hash, chain: chain.name, fee_bounds: feeBounds });

  // ربط الحملات الموجودة بالعقد
  const models = require('../src/models');
  const { q } = require('../src/db');
  const rows = q('SELECT id, slug, title, charity_wallet, chain_id FROM campaigns WHERE chain_id = ?', chainId);
  const abi = parseAbi([
    'function createCampaign(address charity, address organizer) external returns (uint256 id)',
    'function nextCampaignId() view returns (uint256)',
  ]);

  for (const row of rows) {
    try {
      const id = await publicClient.readContract({ address, abi, functionName: 'nextCampaignId' });
      const organizer = row.organizer_wallet || collector;
      const txHash = await walletClient.writeContract({
        address,
        abi,
        functionName: 'createCampaign',
        args: [row.charity_wallet, organizer],
        chain: viemChain,
        account,
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      models.updateCampaign(row.id, {
        splitter_address: address,
        splitter_campaign_id: Number(id),
      });
      log('info', 'campaign registered on-chain', {
        slug: row.slug,
        splitter_campaign_id: Number(id),
        organizer,
      });
    } catch (err) {
      log('warn', 'campaign registration failed', { slug: row.slug, error: String(err.message || err) });
    }
  }

  console.log('\n=== تم النشر ===');
  console.log(`العنوان: ${address}`);
  console.log(`الشبكة:  ${chain.name} (${chainId})`);
  console.log(`المستكشف: ${require('../config/brand').explorers[chainId]}/address/${address}`);
}

main().catch((err) => {
  log('error', 'deploy failed', { error: String(err.message || err) });
  process.exit(1);
});
