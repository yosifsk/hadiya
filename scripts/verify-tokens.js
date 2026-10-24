/* التحقق من عناوين الرموز على السلسلة: symbol / decimals / هل هي عقود ERC20 فعلًا.
   التشغيل: npm run verify:tokens */

require('dotenv').config();

const { createPublicClient, http } = require('viem');
const { base, baseSepolia, mainnet, polygon } = require('viem/chains');
const { CHAINS, listChains, rpcUrl, tokensFor } = require('../config/chains');

const VIEM_CHAINS = { 1: mainnet, 137: polygon, 8453: base, 84532: baseSepolia };
const ERC20_ABI = [
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
];

async function main() {
  for (const c of listChains()) {
    const chain = CHAINS[c.id];
    const client = createPublicClient({ chain: VIEM_CHAINS[c.id] || base, transport: http(rpcUrl(chain), { timeout: 12_000 }) });
    console.log(`\n=== ${chain.name} (${c.id}) ===`);
    for (const token of tokensFor(c.id)) {
      if (token.isNative) {
        console.log(`  ${token.symbol.padEnd(6)} native (decimals ${token.decimals})`);
        continue;
      }
      try {
        const [symbol, decimals] = await Promise.all([
          client.readContract({ address: token.address, abi: ERC20_ABI, functionName: 'symbol' }),
          client.readContract({ address: token.address, abi: ERC20_ABI, functionName: 'decimals' }),
        ]);
        const ok = symbol.toUpperCase() === token.symbol.toUpperCase();
        console.log(`  ${token.symbol.padEnd(6)} ${token.address} → symbol=${symbol} decimals=${decimals} ${ok ? '✔' : '⚠ رمز مختلف عن المتوقع'}`);
        if (decimals !== token.decimals) {
          console.log(`     ⚠ config/chains.js يقول decimals=${token.decimals} بينما العقد يقول ${decimals}`);
        }
      } catch (err) {
        console.log(`  ${token.symbol.padEnd(6)} ${token.address} → ⚠ فشل القراءة: ${String(err.message || err).slice(0, 90)}`);
      }
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
