/* حساب رسوم المنصة (متدرّجة حسب قيمة التبرّع) وتوزيع المبلغ — كل الحسابات بـ BigInt. */

const BPS = 10000n;
const brand = require('../../config/brand');

function splitAmount(grossRaw, feeBps = 900) {
  const gross = BigInt(grossRaw);
  const fee = (gross * BigInt(feeBps)) / BPS;
  const charity = gross - fee;
  return { gross: gross.toString(), fee: fee.toString(), charity: charity.toString() };
}

/* أعلى شريحة تنطبق على قيمة التبرّع (بالدولار) — الافتراضي هو الجدول الفعّال (DB أو config) */
function tierForUsd(usdAmount, tiers = effectiveTiers()) {
  const value = Number(usdAmount || 0);
  for (const tier of tiers) {
    if (value <= tier.maxUsd) return tier;
  }
  return tiers[tiers.length - 1];
}

/* نسبة الرسوم (نقاط أساس) لمبلغ بالدولار */
function feeBpsForUsd(usdAmount, tiers = effectiveTiers()) {
  return tierForUsd(usdAmount, tiers).bps;
}

/* وصف الشريحة مع نطاقها — بالعربية أو الإنجليزية */
function tierLabel(usdAmount, tiers = effectiveTiers(), lang = 'ar') {
  const index = tiers.findIndex(t => Number(usdAmount || 0) <= t.maxUsd);
  const idx = index === -1 ? tiers.length - 1 : index;
  const tier = tiers[idx];
  const pct = (tier.bps / 100).toFixed(tier.bps % 100 === 0 ? 0 : 2);
  const sign = lang === 'en' ? '%' : '٪';

  if (tiers.length === 1) return `${pct}${sign}`;

  if (idx === 0) {
    return lang === 'en'
      ? `${pct}${sign} (up to $${tier.maxUsd})`
      : `${pct}${sign} (حتى ${tier.maxUsd}$)`;
  }
  const lower = tiers[idx - 1].maxUsd;
  if (tier.maxUsd === Infinity) {
    return lang === 'en'
      ? `${pct}${sign} (over $${lower})`
      : `${pct}${sign} (فوق ${lower}$)`;
  }
  return lang === 'en'
    ? `${pct}${sign} ($${lower} – $${tier.maxUsd})`
    : `${pct}${sign} (${lower}$ – ${tier.maxUsd}$)`;
}

/* تقسيم مبلغ محدّد بالدولار إلى رسوم وصافي */
function splitUsd(usdAmount, tiers = effectiveTiers()) {
  const value = Number(usdAmount || 0);
  const bps = feeBpsForUsd(value, tiers);
  return {
    bps,
    gross: value,
    fee: value * (bps / 10000),
    charity: value * ((10000 - bps) / 10000),
    tier: tierForUsd(value, tiers),
  };
}

function formatUnits(raw, decimals = 18) {
  const value = BigInt(raw);
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const frac = (value % base).toString().padStart(decimals, '0').replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : `${whole}`;
}

function percent(raw, totalRaw) {
  const total = BigInt(totalRaw);
  if (total <= 0n) return 0;
  const pct = (BigInt(raw) * 10000n) / total;
  return Number(pct) / 100;
}

/* جدول الشرائح الفعّال — يُقرأ من قاعدة البيانات (إعداد لوحة الإدارة)
   وي fallback إلى config/brand.js. العقد على السلسلة هو المرجع النهائي دائمًا. */
function effectiveTiers() {
  try {
    const { getSetting } = require('../../src/db');
    const raw = getSetting('fee_tiers_config', '');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        return parsed.map(t => ({
          maxUsd: t.maxUsd === null ? Infinity : Number(t.maxUsd),
          bps: Number(t.bps),
        }));
      }
    }
  } catch { /* fallback */ }
  return brand.feeTiers;
}

module.exports = {
  BPS,
  splitAmount,
  splitUsd,
  tierForUsd,
  feeBpsForUsd,
  tierLabel,
  effectiveTiers,
  formatUnits,
  percent,
};
