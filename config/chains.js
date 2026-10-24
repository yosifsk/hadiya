/* الشبكات والعملات المدعومة.
   ملاحظة مهمة: عدد الخانات (decimals) يُقرأ من العقد نفسه — لا تفترض!
   مثال: USDT على BSC له 18 خانة بينما على Base له 6.
   للتحقق: npm run verify:tokens */

const CHAINS = {
  1: {
    id: 1,
    key: 'ethereum',
    name: 'Ethereum',
    nameAr: 'إيثيريوم',
    addressFamily: 'evm',
    native: { symbol: 'ETH', decimals: 18 },
    rpcEnv: 'RPC_ETHEREUM',
    rpcDefault: 'https://ethereum-rpc.publicnode.com',
    tokens: {
      USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
      USDT: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
    },
  },
  56: {
    id: 56,
    key: 'bsc',
    name: 'BNB Smart Chain',
    nameAr: 'بينانس (BNB)',
    addressFamily: 'evm',
    native: { symbol: 'BNB', decimals: 18 },
    rpcEnv: 'RPC_BSC',
    rpcDefault: 'https://bsc-dataseed.binance.org',
    tokens: {
      USDT: { address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
      USDC: { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18 },
    },
  },
  137: {
    id: 137,
    key: 'polygon',
    name: 'Polygon',
    nameAr: 'بوليجون',
    addressFamily: 'evm',
    native: { symbol: 'POL', decimals: 18 },
    rpcEnv: 'RPC_POLYGON',
    rpcDefault: 'https://polygon-bor-rpc.publicnode.com',
    tokens: {
      USDC: { address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6 },
      USDT0: { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6 },
    },
  },
  8453: {
    id: 8453,
    key: 'base',
    name: 'Base',
    nameAr: 'بيس',
    addressFamily: 'evm',
    native: { symbol: 'ETH', decimals: 18 },
    rpcEnv: 'RPC_BASE',
    rpcDefault: 'https://mainnet.base.org',
    tokens: {
      USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
      USDT: { address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', decimals: 6 },
    },
  },
  84532: {
    id: 84532,
    key: 'baseSepolia',
    name: 'Base Sepolia',
    nameAr: 'بيس Sepolia (اختبار)',
    addressFamily: 'evm',
    native: { symbol: 'ETH', decimals: 18 },
    rpcEnv: 'RPC_BASE_SEPOLIA',
    rpcDefault: 'https://sepolia.base.org',
    tokens: {
      USDC: { address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', decimals: 6 },
    },
  },

  /* ===== TRON (TRC20) =====
     عنوان ترون: T + 33 محرف Base58Check (34 محرفًا) — وليس 0x…
     الشكل السداسي داخل TVM: 41 + 20 بايت (0x41…) — ونفس العقد بالشكل EVM: 0x…
     chain id هنا هو معرّف TRON EVM-compat (728126428) المستخدم في tronweb/tronbox. */
  728126428: {
    id: 728126428,
    key: 'tron',
    name: 'TRON (TRC20)',
    nameAr: 'ترون (TRC20)',
    addressFamily: 'tron',
    native: { symbol: 'TRX', decimals: 6 },
    rpcEnv: 'RPC_TRON',
    rpcDefault: 'https://api.trongrid.io',
    tokens: {
      USDT: {
        // عقد USDT الرسمي على TRON (متحقَّق منه على السلسلة: نوعه Contract واسمه TetherToken)
        address: '0x41a614f803b6fd780986a42c78ec9c7f77e6ded13c',
        evmAddress: '0xa614f803b6fd780986a42c78ec9c7f77e6ded13c',
        base58: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        decimals: 6,
      },
    },
  },
};

function listChains() {
  return Object.values(CHAINS).map(c => ({
    id: c.id,
    key: c.key,
    name: c.name,
    nameAr: c.nameAr,
    addressFamily: c.addressFamily || 'evm',
    native: c.native.symbol,
    tokens: Object.keys(c.tokens || {}),
    rpcEnv: c.rpcEnv,
  }));
}

function getChain(chainId) {
  return CHAINS[Number(chainId)] || null;
}

function rpcUrl(chain) {
  const fromEnv = process.env[chain.rpcEnv];
  return (fromEnv && fromEnv.trim()) || chain.rpcDefault;
}

/* كل الرموز مدعومة على الشبكة: natives + ERC20 */
function tokensFor(chainId) {
  const chain = getChain(chainId);
  if (!chain) return [];
  const out = [
    {
      symbol: chain.native.symbol,
      name: chain.native.symbol,
      address: null, // native
      decimals: chain.native.decimals,
      isNative: true,
    },
  ];
  for (const [symbol, meta] of Object.entries(chain.tokens)) {
    const entry = typeof meta === 'string' ? { address: meta, decimals: 6 } : meta;
    out.push({
      symbol,
      name: symbol,
      address: entry.address,
      evmAddress: entry.evmAddress || null,
      base58: entry.base58 || null,
      decimals: entry.decimals,
      isNative: false,
    });
  }
  return out;
}

function findToken(chainId, symbolOrAddress) {
  const chain = getChain(chainId);
  if (!chain) return null;
  const key = String(symbolOrAddress || '').trim();
  if (!key) return null;
  const all = tokensFor(chainId);
  const bySymbol = all.find(t => t.symbol.toLowerCase() === key.toLowerCase());
  if (bySymbol) return bySymbol;
  const lower = key.toLowerCase();
  // مطابقة بأي صيغة من صيغ العنوان (0x… / 0x41… / base58)
  return all.find(t => {
    if (!t.address) return false;
    if (t.address.toLowerCase() === lower) return true;
    if (t.evmAddress && t.evmAddress.toLowerCase() === lower) return true;
    if (t.base58 && t.base58.toLowerCase() === lower) return true;
    return false;
  }) || null;
}

/* شبكات منخفضة الغاز — تُعرض أولًا في الواجهة */
const LOW_FEE_CHAINS = [8453, 56, 137];

module.exports = { CHAINS, listChains, getChain, rpcUrl, tokensFor, findToken, LOW_FEE_CHAINS };
