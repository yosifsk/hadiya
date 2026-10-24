/* دوال مساعدة للعرض (مشتركة بين كل الصفحات) */

const brand = require('../config/brand');
const { getChain } = require('../config/chains');

const CATEGORY_LABELS = {
  medical: { ar: 'صحة وطبية', en: 'Medical' },
  emergency: { ar: 'طوارئ', en: 'Emergency' },
  memorial: { ar: 'تذكّر وميت', en: 'Memorial' },
  education: { ar: 'تعليم', en: 'Education' },
  animal: { ar: 'حيوانات', en: 'Animals' },
  community: { ar: 'مجتمع', en: 'Community' },
  environment: { ar: 'بيئة', en: 'Environment' },
  charity: { ar: 'جهة خيرية', en: 'Nonprofit' },
  faith: { ar: 'دين', en: 'Faith' },
  sports: { ar: 'رياضة', en: 'Sports' },
  travel: { ar: 'سفر', en: 'Travel' },
  creative: { ar: 'إبداع', en: 'Creative' },
};

function usd(value, lang = 'ar') {
  const n = Number(value || 0);
  // نرقام لاتينية دائمًا (أوضح للقراءة العربية) + رمز $ مختصر
  const amount = n.toLocaleString('ar-EG', {
    minimumFractionDigits: 2, maximumFractionDigits: 2, numberingSystem: 'latn',
  });
  return `$${amount}`;
}

function usdShort(value) {
  const n = Number(value || 0);
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function pct(value) {
  return `${Math.round(Number(value || 0))}%`;
}

function shortAddr(addr) {
  const a = String(addr || '');
  if (!a || a.length < 12) return a || '—';
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function explorerBase(chainId) {
  return brand.explorers[Number(chainId)] || '';
}

function explorerTx(chainId, hash) {
  const base = explorerBase(chainId);
  return hash ? `${base}/tx/${hash}` : '';
}

function explorerAddr(chainId, addr) {
  const base = explorerBase(chainId);
  return addr ? `${base}/address/${addr}` : '';
}

function chainName(chainId, lang = 'ar') {
  const c = getChain(chainId);
  if (!c) return `chain ${chainId}`;
  return lang === 'en' ? c.name : (c.nameAr || c.name);
}

function dateAr(value, lang = 'ar') {
  if (!value) return '';
  const d = new Date(String(value).includes('T') ? value : String(value).replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'ar-EG', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function dateTimeAr(value, lang = 'ar') {
  if (!value) return '';
  const d = new Date(String(value).includes('T') ? value : String(value).replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(lang === 'en' ? 'en-GB' : 'ar-EG', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function relativeAr(value, lang = 'ar') {
  if (!value) return '';
  const d = new Date(String(value).includes('T') ? value : String(value).replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return String(value);
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return lang === 'en' ? 'just now' : 'الآن';
  if (mins < 60) return lang === 'en' ? `${mins} min ago` : `قبل ${mins} دقيقة`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return lang === 'en' ? `${hours}h ago` : `قبل ${hours} ساعة`;
  const days = Math.round(hours / 24);
  if (days < 30) return lang === 'en' ? `${days}d ago` : `قبل ${days} يوم`;
  return dateAr(value, lang);
}

function categoryLabel(key, lang = 'ar') {
  const entry = CATEGORY_LABELS[key] || { ar: key, en: key };
  return lang === 'en' ? entry.en : entry.ar;
}

function tokenDecimals(symbol, chainId) {
  const c = getChain(chainId);
  if (!c) return 18;
  if (c.native.symbol === symbol) return c.native.decimals;
  // نقرأ الخانات من إعدادات الشبكة (مُتحقَّق منها على السلسلة) — لا نفترض 6
  const { findToken } = require('../config/chains');
  const token = findToken(chainId, symbol);
  return token && token.decimals ? token.decimals : 18;
}

function formatRaw(raw, symbol, chainId) {
  const decimals = tokenDecimals(symbol, chainId);
  try {
    const value = BigInt(raw);
    const base = 10n ** BigInt(decimals);
    const whole = value / base;
    const frac = (value % base).toString().padStart(decimals, '0').replace(/0+$/, '');
    return frac ? `${whole}.${frac} ${symbol}` : `${whole} ${symbol}`;
  } catch {
    return `${raw} ${symbol}`;
  }
}

function feeLabel(lang = 'ar') {
  const sign = lang === 'en' ? '%' : '٪';
  return `${(brand.platformFeeBps / 100).toFixed(brand.platformFeeBps % 100 === 0 ? 0 : 2)}${sign}`;
}

/* بوابة IPFS لعرض CID */
function ipfsUrl(cid, gateway) {
  if (!cid) return '';
  const gw = gateway || process.env.IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';
  return `${gw}${cid}`;
}

/* محتوى الحملة حسب اللغة (مع الرجوع للعربية إن لم تتوفّر نسخة إنجليزية) */
function localizedCampaign(campaign, lang = 'ar') {
  if (!campaign) return { title: '', subtitle: '', story: '' };
  if (lang === 'en') {
    return {
      title: campaign.title_en || campaign.title,
      subtitle: campaign.subtitle_en || campaign.subtitle,
      story: campaign.story_en || campaign.story,
      translated: Boolean(campaign.title_en || campaign.story_en),
    };
  }
  return {
    title: campaign.title,
    subtitle: campaign.subtitle,
    story: campaign.story,
    translated: Boolean(campaign.title_en || campaign.story_en),
  };
}

function build(lang = 'ar') {
  const fees = require('./lib/fees');
  return {
    brand,
    lang,
    usd: (v) => usd(v, lang),
    usdShort,
    pct,
    shortAddr,
    explorerTx,
    explorerAddr,
    explorerBase,
    chainName: (id) => chainName(id, lang),
    dateAr: (v) => dateAr(v, lang),
    dateTimeAr: (v) => dateTimeAr(v, lang),
    relativeAr: (v) => relativeAr(v, lang),
    categoryLabel: (k) => categoryLabel(k, lang),
    localizedCampaign: (c) => localizedCampaign(c, lang),
    formatRaw,
    feeLabel: () => feeLabel(lang),
    tierLabel: (v) => fees.tierLabel(v, fees.effectiveTiers(), lang),
    ipfsUrl,
    categories: CATEGORY_LABELS,
    json: (v) => JSON.stringify(v),
  };
}

module.exports = { build, CATEGORY_LABELS, localizedCampaign };
