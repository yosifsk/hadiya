/* طبقة الاتصال بالسلسلة عبر viem.
   - قراءة الأرصدة والمستحقات (التحقق من "كم وصل" فعلًا)
   - التحقق من معاملات التبرع من الـ receipt والـ logs (المصدر الموثوق لل amounts)
   - قراءة أحداث العقد DonationReceived */

const {
  createPublicClient,
  http,
  parseUnits,
  formatUnits,
  getAddress,
  isAddress,
  parseEventLogs,
  keccak256,
  toHex,
} = require('viem');
const { base, baseSepolia, mainnet, polygon, bsc } = require('viem/chains');
const { CHAINS, getChain, rpcUrl, findToken } = require('../../config/chains');

const VIEM_CHAINS = { 1: mainnet, 56: bsc, 137: polygon, 8453: base, 84532: baseSepolia };

const SPLITTER_ABI = [
  {
    type: 'function',
    name: 'donate',
    stateMutability: 'payable',
    inputs: [{ name: 'campaignId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'donateToken',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'campaignId', type: 'uint256' },
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'PLATFORM_FEE_BPS',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'collector',
 stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'createCampaign',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'charity', type: 'address' },
      { name: 'organizer', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'setCharity',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'campaignId', type: 'uint256' },
      { name: 'charity', type: 'address' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'MIN_FEE_BPS',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint16' }],
  },
  {
    type: 'function',
    name: 'MAX_FEE_BPS',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint16' }],
  },
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
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
  {
    type: 'function',
    name: 'campaign',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [
      { name: 'charity', type: 'address' },
      { name: 'organizer', type: 'address' },
      { name: 'active', type: 'bool' },
      { name: 'createdAt', type: 'uint64' },
    ],
  },
  {
    type: 'function',
    name: 'feeFor',
    stateMutability: 'view',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'uint16' }],
  },
  {
    type: 'function',
    name: 'setTiers',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'threshold1', type: 'uint128' },
      { name: 'threshold2', type: 'uint128' },
      { name: 'threshold3', type: 'uint128' },
      { name: 'enabled', type: 'bool' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'tiers',
    stateMutability: 'view',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [
      { name: 'enabled', type: 'bool' },
      { name: 'threshold1', type: 'uint128' },
      { name: 'threshold2', type: 'uint128' },
      { name: 'threshold3', type: 'uint128' },
      { name: 'updatedAt', type: 'uint64' },
    ],
  },
  {
    type: 'event',
    name: 'CampaignCreated',
    inputs: [
      { name: 'campaignId', type: 'uint256', indexed: true },
      { name: 'charity', type: 'address', indexed: true },
    ],
  },
];

const ERC20_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
];

const clients = new Map();
const failures = new Map();

function getClient(chainId) {
  const id = Number(chainId);
  if (clients.has(id)) return clients.get(id);
  const chain = getChain(id);
  if (!chain) throw new Error(`unsupported chain ${chainId}`);
  const viemChain = VIEM_CHAINS[id] || base;
  const client = createPublicClient({
    chain: viemChain,
    transport: http(rpcUrl(chain), { timeout: 12_000, retryCount: 1 }),
  });
  clients.set(id, client);
  return client;
}

const log = (level, message, extra = {}) =>
  console.log(JSON.stringify({ time: new Date().toISOString(), level, message, ...extra }));

async function withTimeout(promise, ms = 12_000) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('rpc timeout')), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function noteFailure(chainId, err) {
  const id = Number(chainId);
  const prev = failures.get(id) || { count: 0, last: null };
  prev.count += 1;
  prev.last = String(err && err.message ? err.message : err);
  failures.set(id, prev);
  if (prev.count === 1 || prev.count % 5 === 0) {
    log('warn', 'rpc error', { chain_id: id, count: prev.count, error: prev.last });
  }
}

function chainHealth() {
  const out = {};
  for (const id of Object.keys(CHAINS)) {
    const f = failures.get(Number(id));
    out[id] = { failures: f ? f.count : 0, last_error: f ? f.last : null };
  }
  return out;
}

async function getNativeBalance(address, chainId) {
  if (!isAddress(address)) throw new Error('invalid address');
  const client = getClient(chainId);
  try {
    const bal = await withTimeout(client.getBalance({ address: getAddress(address) }));
    return { raw: bal.toString(), symbol: getChain(chainId).native.symbol, decimals: 18 };
  } catch (err) {
    noteFailure(chainId, err);
    return null;
  }
}

async function getTokenBalance(address, tokenAddress, chainId) {
  if (!isAddress(address) || !isAddress(tokenAddress)) throw new Error('invalid address');
  const client = getClient(chainId);
  try {
    const bal = await withTimeout(
      client.readContract({
        address: getAddress(tokenAddress),
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [getAddress(address)],
      })
    );
    let decimals = 6;
    try {
      decimals = Number(await withTimeout(client.readContract({ address: getAddress(tokenAddress), abi: ERC20_ABI, functionName: 'decimals' })));
    } catch {
      // fallback: القيمة المعرّفة في الإعدادات (مُتحقَّق منها على السلسلة)
      const known = findToken(chainId, tokenAddress);
      if (known && known.decimals) decimals = known.decimals;
    }
    return { raw: bal.toString(), decimals };
  } catch (err) {
    noteFailure(chainId, err);
    return null;
  }
}

async function getReceipt(hash, chainId) {
  const client = getClient(chainId);
  try {
    const receipt = await withTimeout(client.getTransactionReceipt({ hash }));
    return receipt;
  } catch (err) {
    const msg = String(err && err.message ? err.message : err);
    if (/not found|reverted|TransactionNotFound/i.test(msg)) return null;
    noteFailure(chainId, err);
    return null;
  }
}

/* استخراج بيانات التبرع من receipt:
   1) إن كان есть حدث DonationReceived من عقد الموزّع → الأرقام الموثوقة.
   2) وإلا: تحويل مباشر إلى محفظة الجهة المستفيدة → نحسب المبلغ ونُسجّله برسوم غير محصّلة. */
async function parseDonationReceipt(receipt, { splitterAddress, charityWallet }) {
  if (!receipt) return null;

  const donationEvent = {
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
  };

  if (splitterAddress) {
    try {
      const logs = parseEventLogs({
        abi: [donationEvent],
        logs: receipt.logs,
        eventName: 'DonationReceived',
      });
      if (logs.length) {
        const args = logs[0].args;
        return {
          settlement: 'splitter',
          splitterCampaignId: Number(args.campaignId),
          donor: getAddress(args.donor),
          charity: getAddress(args.charity),
          token: args.token === '0x0000000000000000000000000000000000000000' ? null : getAddress(args.token),
          gross: args.gross.toString(),
          toCharity: args.toCharity.toString(),
          fee: args.fee.toString(),
          feeBps: Number(args.feeBps ?? 900),
          blockNumber: Number(receipt.blockNumber),
        };
      }
    } catch { /* fall through to direct detection */ }
  }

  // تحويل مباشر: قيمة المعاملة إلى محفظة الجهة المستفيدة (العملة الأصلية)
  if (charityWallet && isAddress(charityWallet)) {
    const to = receipt.to ? getAddress(receipt.to) : null;
    if (to && to.toLowerCase() === getAddress(charityWallet).toLowerCase() && receipt.value && receipt.value > 0n) {
      return {
        settlement: 'direct',
        splitterCampaignId: null,
        donor: receipt.from ? getAddress(receipt.from) : null,
        charity: getAddress(charityWallet),
        token: null,
        gross: receipt.value.toString(),
        toCharity: receipt.value.toString(),
        fee: '0',
        feeBps: 900,
        blockNumber: Number(receipt.blockNumber),
      };
    }

    // تحويل مباشر بتوكن ERC20: نبحث عن حدث Transfer ووجهته محفظة الجهة المستفيدة
    const transferEvent = {
      type: 'event',
      name: 'Transfer',
      inputs: [
        { name: 'from', type: 'address', indexed: true },
        { name: 'to', type: 'address', indexed: true },
        { name: 'value', type: 'uint256', indexed: false },
      ],
    };
    try {
      const transfers = parseEventLogs({
        abi: [transferEvent],
        logs: receipt.logs,
        eventName: 'Transfer',
      });
      const target = getAddress(charityWallet).toLowerCase();
      const hit = transfers.find(t => {
        const recipient = getAddress(t.args.to).toLowerCase();
        const sender = getAddress(t.args.from).toLowerCase();
        return recipient === target && sender !== target;
      });
      if (hit) {
        return {
          settlement: 'direct',
          splitterCampaignId: null,
          donor: getAddress(hit.args.from),
          charity: getAddress(charityWallet),
          token: getAddress(receipt.to),
          gross: hit.args.value.toString(),
          toCharity: hit.args.value.toString(),
          fee: '0',
          feeBps: 900,
          blockNumber: Number(receipt.blockNumber),
        };
      }
    } catch { /* لا يوجد حدث Transfer */ }
  }
  return null;
}

async function getSplitterCampaigns(splitterAddress, chainId) {
  const client = getClient(chainId);
  const logs = await withTimeout(
    client.getLogs({
      address: getAddress(splitterAddress),
      event: {
        type: 'event',
        name: 'CampaignCreated',
        inputs: [
          { name: 'campaignId', type: 'uint256', indexed: true },
          { name: 'charity', type: 'address', indexed: true },
        ],
      },
      fromBlock: 0n,
      toBlock: 'latest',
    })
  );
  return logs.map(l => ({
    campaignId: Number(l.args.campaignId),
    charity: getAddress(l.args.charity),
  }));
}

async function getSplitterInfo(splitterAddress, chainId) {
  if (!splitterAddress || !isAddress(splitterAddress)) return null;
  const client = getClient(chainId);
  try {
    const [feeBps, collector] = await Promise.all([
      withTimeout(client.readContract({ address: getAddress(splitterAddress), abi: SPLITTER_ABI, functionName: 'PLATFORM_FEE_BPS' })),
      withTimeout(client.readContract({ address: getAddress(splitterAddress), abi: SPLITTER_ABI, functionName: 'collector' })),
    ]);
    const code = await withTimeout(client.getCode({ address: getAddress(splitterAddress) }));
    return {
      feeBps: Number(feeBps),
      collector: getAddress(collector),
      deployed: Boolean(code && code !== '0x'),
    };
  } catch (err) {
    noteFailure(chainId, err);
    return null;
  }
}

async function getBlockNumber(chainId) {
  const client = getClient(chainId);
  try {
    return Number(await withTimeout(client.getBlockNumber()));
  } catch (err) {
    noteFailure(chainId, err);
    return null;
  }
}

/* اختصارات للمتصفح: selectors الدوال المستخدمة في الواجهة */
const SELECTORS = {
  donate: toHex(keccak256('donate(uint256)')).slice(0, 10),
  donateToken: toHex(keccak256('donateToken(uint256,address,uint256)')).slice(0, 10),
  approve: '0x095ea7b3',
};

module.exports = {
  SPLITTER_ABI,
  ERC20_ABI,
  SELECTORS,
  getClient,
  getNativeBalance,
  getTokenBalance,
  getReceipt,
  parseDonationReceipt,
  getSplitterCampaigns,
  getSplitterInfo,
  getBlockNumber,
  chainHealth,
  parseUnits,
  formatUnits,
  getAddress,
  isAddress,
  log,
};
