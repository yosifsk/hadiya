/* أسعار العملات الرقمية بالدولار — مع كاش ومصادر بديلة.
   قاعدة ثابتة: إذا تعذّر جلب السعر نعيد null ولا نخترع أي رقم. */

const CG_IDS = {
  ETH: 'ethereum',
  POL: 'matic-network',
  USDC: 'usd-coin',
  USDT: 'tether',
};

const cache = new Map(); // symbol -> { usd, at }
const TTL_MS = 60_000;

const log = (level, message, extra = {}) =>
  console.log(JSON.stringify({ time: new Date().toISOString(), level, message, ...extra }));

async function fetchJson(url, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { accept: 'application/json', 'user-agent': 'hadiya-web3/1.0' },
    });
    if (!res.ok) throw new Error(`http ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fromCoinGecko(symbols) {
  const ids = symbols.map(s => CG_IDS[s]).filter(Boolean);
  if (!ids.length) return {};
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`;
  const data = await fetchJson(url);
  const out = {};
  for (const symbol of symbols) {
    const id = CG_IDS[symbol];
    if (!id) continue;
    const value = data[id] && data[id].usd;
    if (typeof value === 'number' && value > 0) out[symbol] = value;
  }
  return out;
}

async function fromCoinbase(symbols) {
  const out = {};
  for (const symbol of symbols) {
    try {
      const data = await fetchJson(`https://api.coinbase.com/v2/prices/${symbol}-USD/spot`, 5000);
      const value = parseFloat(data && data.data && data.data.amount);
      if (Number.isFinite(value) && value > 0) out[symbol] = value;
    } catch { /* مصدر بديل */ }
  }
  return out;
}

async function getPrice(symbol) {
  const key = String(symbol || '').toUpperCase();
  if (!key) return null;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.usd;

  let usd = null;
  try {
    const cg = await fromCoinGecko([key]);
    if (cg[key]) usd = cg[key];
  } catch (err) {
    log('warn', 'price source failed', { source: 'coingecko', symbol: key, error: String(err.message || err) });
  }

  if (!usd) {
    try {
      const cb = await fromCoinbase([key]);
      if (cb[key]) usd = cb[key];
    } catch (err) {
      log('warn', 'price source failed', { source: 'coinbase', symbol: key, error: String(err.message || err) });
    }
  }

  if (!usd) {
    const stale = hit && Date.now() - hit.at < 30 * 60_000 ? hit.usd : null;
    return stale; // قيمة قديمة أو null — لا نخترع
  }

  cache.set(key, { usd, at: Date.now() });
  return usd;
}

async function getPrices(symbols) {
  const out = {};
  for (const s of symbols) out[String(s).toUpperCase()] = await getPrice(s);
  return out;
}

/* تحويل مبلغ بالوحدة الأصلية إلى دولار: raw / 10^decimals * price */
function rawToUsd(raw, decimals, priceUsd) {
  if (!priceUsd) return 0;
  try {
    const value = Number(raw) / Math.pow(10, decimals);
    return value * priceUsd;
  } catch {
    return 0;
  }
}

module.exports = { getPrice, getPrices, rawToUsd };
