/* مسارات لوحة الإدارة — كل نقطة تتطلّب مصادقة إدارية (مفتاح constant-time أو جلسة محفظة موقّعة)
   والطلبات المُعدِّلة تتطلّب أيضًا رمز CSRF. */

const express = require('express');
const fs = require('fs');
const { isAddress, getAddress, toFunctionSelector, encodeFunctionData, keccak256, toHex } = require('viem');
const addresses = require('../lib/addresses');

const models = require('../models');
const chain = require('../lib/chain');
const admin = require('../lib/admin');
const audit = require('../lib/audit');
const accounts = require('../lib/accounts');
const users = require('../lib/users');
const passwords = require('../lib/passwords');
const fees = require('../lib/fees');
const brand = require('../../config/brand');
const { getSetting, setSetting, q, one, allSettings, DB_FILE, run } = require('../db');
const { wrapRouter } = require('../lib/async');

const router = wrapRouter(express.Router());

/* ===== تسجيل دخول الإدارة (قبل المصادقة) ===== */

const loginAttempts = new Map();

function loginRateLimit(ip) {
  const now = Date.now();
  const rec = loginAttempts.get(ip) || { count: 0, until: now + 15 * 60_000 };
  if (now >= rec.until) {
    rec.count = 0;
    rec.until = now + 15 * 60_000;
  }
  rec.count += 1;
  loginAttempts.set(ip, rec);
  return rec.count <= 8;
}

/* دخول باسم مستخدم وكلمة مرور (Argon2id) */
router.post('/login', (req, res) => {
  const ip = req.ip || 'unknown';
  if (!loginRateLimit(ip)) {
    return res.status(429).json({ ok: false, error: 'محاولات كثيرة — انتظر ١٥ دقيقة' });
  }

  const username = String((req.body || {}).username || '').trim();
  const password = String((req.body || {}).password || '');
  const result = accounts.verifyLogin(username, password);

  if (!result.ok) {
    const message = {
      invalid_credentials: 'اسم المستخدم أو كلمة المرور غير صحيحة',
      disabled: 'هذا الحساب معطّل',
      locked: 'الحساب مقفل مؤقتًا بسبب محاولات فاشلة — حاول بعد قليل',
    }[result.reason] || 'فشل الدخول';
    return res.status(401).json({ ok: false, error: message });
  }

  const csrf = admin.startAccountSession(res, result.account.username);
  res.json({
    ok: true,
    csrf,
    username: result.account.username,
    must_change_password: Boolean(result.account.must_change_password),
  });
});

router.post('/session', (req, res) => {
  const key = String((req.body || {}).key || '').trim();
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const rec = loginAttempts.get(ip) || { count: 0, until: now + 15 * 60_000 };
  if (now < rec.until && rec.count >= 8) {
    return res.status(429).json({ ok: false, error: 'محاولات كثيرة — انتظر ١٥ دقيقة' });
  }
  if (now >= rec.until) {
    rec.count = 0;
    rec.until = now + 15 * 60_000;
  }

  if (!admin.checkAdminKey(key)) {
    rec.count += 1;
    loginAttempts.set(ip, rec);
    audit.logAction({ actor: 'unknown', action: 'security.login_failed', ip, note: 'invalid admin key' });
    return res.status(401).json({ ok: false, error: 'مفتاح غير صالح' });
  }
  loginAttempts.delete(ip);
  const csrf = admin.startAdminSession(res, key);
  audit.logAction({ actor: 'admin-key', action: 'security.login_ok', ip, note: 'admin key accepted' });
  res.json({ ok: true, csrf });
});

/* ===== الحماية: مصادقة + CSRF ===== */

router.use((req, res, next) => {
  const auth = admin.authenticate(req);
  if (!auth.ok) {
    return res.status(401).json({ ok: false, error: 'غير مصرّح — يتطلّب مفتاح إدارة أو جلسة محفظة موقّعة' });
  }
  req.adminActor = auth.actor;
  req.adminMethod = auth.method;

  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (mutating && !admin.checkCsrf(req)) {
    audit.logAction({
      actor: auth.actor,
      action: 'security.csrf_rejected',
      target: req.originalUrl,
      ip: req.ip,
      note: 'missing or invalid CSRF token',
    });
    return res.status(403).json({ ok: false, error: 'رمز CSRF مفقود أو غير صالح' });
  }
  next();
});

function actorOf(req) {
  return req.adminActor || 'unknown';
}

function clientIp(req) {
  return req.ip || '';
}

// ============================================================ نظرة عامة

router.get('/overview', async (req, res) => {
  const totals = models.platformTotals();
  const campaigns = models.listCampaigns({ limit: 500, status: null });
  const pending = campaigns.filter(c => c.status === 'pending_review');

  res.json({
    ok: true,
    actor: actorOf(req),
    method: req.adminMethod,
    brand: brand.name,
    fee_bps_on_chain: await readOnChainBounds(),
    collector_address: getSetting('collector_address', ''),
    admin_addresses: admin.adminAddressesList(),
    campaigns: {
      total: campaigns.length,
      active: campaigns.filter(c => c.status === 'active').length,
      pending_review: pending.length,
      paused: campaigns.filter(c => c.status === 'paused').length,
      closed: campaigns.filter(c => c.status === 'closed').length,
      rejected: campaigns.filter(c => c.status === 'rejected').length,
    },
    donations: {
      confirmed: totals.donations,
      gross_usd: Number(totals.grossUsd.toFixed(2)),
      fee_usd: Number(totals.feeUsd.toFixed(2)),
      charity_usd: Number(totals.charityUsd.toFixed(2)),
      unsettled: totals.unsettledFees,
    },
    audit_entries: audit.countActions(),
    recent_audit: audit.listActions({ limit: 15 }),
  });
});

/* ===== الرسوم: الحقيقة على السلسلة + الإعداد المطلوب ===== */

async function readOnChainBounds() {
  const chainId = Number(getSetting('splitter_chain_id', '0')) || null;
  const address = getSetting('splitter_address', '');
  if (!address || !chainId) return { deployed: false };
  try {
    const client = chain.getClient(chainId);
    const [min, max, collector] = await Promise.all([
      client.readContract({ address, abi: chain.SPLITTER_ABI, functionName: 'MIN_FEE_BPS' }),
      client.readContract({ address, abi: chain.SPLITTER_ABI, functionName: 'MAX_FEE_BPS' }),
      client.readContract({ address, abi: chain.SPLITTER_ABI, functionName: 'collector' }),
    ]);
    return {
      deployed: true,
      chain_id: chainId,
      address,
      min_bps: Number(min),
      max_bps: Number(max),
      collector,
      immutable: true,
      note: 'MIN/MAXFeeBps مثبّتان (immutable) في العقد — لا يمكن تغييرهما بعد النشر',
    };
  } catch (err) {
    return { deployed: false, error: String(err.message || err) };
  }
}

router.get('/fees', async (req, res) => {
  const onChain = await readOnChainBounds();
  const local = fees.effectiveTiers();
  const pendingRaw = getSetting('fee_tiers_config', '');
  let pending = null;
  if (pendingRaw) {
    try { pending = JSON.parse(pendingRaw); } catch { pending = null; }
  }
  res.json({
    ok: true,
    on_chain: onChain,
    effective: local,
    pending_config: pending,
    source: pendingRaw ? 'db' : 'config/brand.js',
    fee_bps: brand.platformFeeBps,
    min_fee_bps: brand.minFeeBps,
    fee_mode: brand.feeMode,
  });
});

/* تعديل شرائح الرسوم — يُحفظ للإعداد القادم، ولا يجاوز حدود العقد immutable */
router.post('/fees', async (req, res) => {
  const body = req.body || {};

  // استعادة الإعداد الافتراضي (حذف إعداد قاعدة البيانات)
  if (body.reset) {
    const before = getSetting('fee_tiers_config', '');
    run('DELETE FROM settings WHERE key = ?', 'fee_tiers_config');
    audit.logAction({
      actor: actorOf(req),
      action: 'fees.reset',
      before,
      after: 'config/brand.js',
      ip: clientIp(req),
      note: 'reverted to config/brand.js tiers',
    });
    return res.json({ ok: true, tiers: fees.effectiveTiers(), note: 'تمت الاستعادة إلى config/brand.js' });
  }

  const tiers = Array.isArray(body.tiers) ? body.tiers : null;
  if (!tiers || !tiers.length) {
    return res.status(400).json({ ok: false, error: 'tiers مطلوبة' });
  }

  const onChain = await readOnChainBounds();
  const maxBps = onChain.deployed ? onChain.max_bps : brand.platformFeeBps;
  const minBps = onChain.deployed ? onChain.min_bps : brand.minFeeBps;

  const clean = [];
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const bps = Number(tier.bps);
    const maxUsd = tier.maxUsd === null || tier.maxUsd === 'null' ? Infinity : Number(tier.maxUsd);
    if (!Number.isInteger(bps) || bps < minBps || bps > maxBps) {
      return res.status(400).json({
        ok: false,
        error: `النسبة ${bps} خارج النطاق المسموح (${minBps}–${maxBps} نقطة أساس)`,
      });
    }
    // الشريحة بلا حد أقصى مسموحة فقط كآخر شريحة
    if (!Number.isFinite(maxUsd) && i !== tiers.length - 1) {
      return res.status(400).json({ ok: false, error: 'الشريحة الأخيرة فقط يمكن أن تكون بلا حد أقصى' });
    }
    if (Number.isFinite(maxUsd) && maxUsd <= 0) {
      return res.status(400).json({ ok: false, error: 'الحد الأعلى يجب أن يكون أكبر من صفر' });
    }
    clean.push({ maxUsd, bps });
  }
  // يجب أن تنحدر النسب مع زيادة المبلغ
  for (let i = 1; i < clean.length; i++) {
    if (clean[i].bps >= clean[i - 1].bps) {
      return res.status(400).json({ ok: false, error: 'النسب يجب أن تنخفض كلما زاد المبلغ' });
    }
  }

  const before = getSetting('fee_tiers_config', '') || JSON.stringify(fees.effectiveTiers());
  setSetting('fee_tiers_config', JSON.stringify(clean));

  audit.logAction({
    actor: actorOf(req),
    action: 'fees.update',
    target: `chain:${onChain.chain_id || 'n/a'}`,
    before,
    after: JSON.stringify(clean),
    ip: clientIp(req),
    note: onChain.deployed
      ? 'الشرائح الجديدة تُطبَّق عند تشغيل set:tiers؛ العقد الحالي ما زال بالحدود القديمة'
      : 'لا يوجد عقد منشور — القيم تُستخدم في المعاينة فقط',
  });

  res.json({ ok: true, tiers: clean, note: 'حُفظت. شغّل npm run set:tiers لتطبيقها على السلسلة' });
});

// ============================================================ الحملات

router.get('/campaigns', (req, res) => {
  const status = req.query.status ? String(req.query.status) : null;
  const rows = models.listCampaigns({ limit: 500, status });
  res.json({
    ok: true,
    campaigns: rows.map(c => {
      const t = models.campaignTotals(c.id);
      return {
        id: c.id,
        slug: c.slug,
        title: c.title,
        status: c.status,
        category: c.category,
        goal_usd: c.goal_usd,
        charity_wallet: c.charity_wallet,
        organizer_wallet: c.organizer_wallet,
        organizer_name: c.organizer_name,
        chain_id: c.chain_id,
        token_symbol: c.token_symbol,
        splitter_address: c.splitter_address,
        splitter_campaign_id: c.splitter_campaign_id,
        story_cid: c.story_cid,
        verification: c.verification,
        raised_usd: Number(t.totalUsd.toFixed(2)),
        donors: t.donorCount,
        fee_usd: Number(t.feeUsd.toFixed(2)),
        created_at: c.created_at,
      };
    }),
  });
});

router.get('/campaigns/:slug', (req, res) => {
  const campaign = models.getCampaignBySlug(req.params.slug);
  if (!campaign) return res.status(404).json({ ok: false, error: 'campaign not found' });
  const t = models.campaignTotals(campaign.id);
  res.json({
    ok: true,
    campaign,
    totals: {
      raised_usd: Number(t.totalUsd.toFixed(2)),
      fee_usd: Number(t.feeUsd.toFixed(2)),
      charity_usd: Number(t.charityUsd.toFixed(2)),
      donors: t.donorCount,
      tiers_used: t.tiersUsed,
    },
    donations: models.listDonations({ campaignId: campaign.id, status: null, limit: 100 }),
    updates: models.listUpdates(campaign.id),
    comments: models.listComments(campaign.id),
    audit: audit.listActions({ limit: 50 }),
  });
});

const ALLOWED_STATUS = ['active', 'pending_review', 'paused', 'closed', 'rejected', 'awaiting_signature'];

router.post('/campaigns/:slug/status', (req, res) => {
  const campaign = models.getCampaignBySlug(req.params.slug);
  if (!campaign) return res.status(404).json({ ok: false, error: 'campaign not found' });
  const status = String((req.body || {}).status || '');
  if (!ALLOWED_STATUS.includes(status)) return res.status(400).json({ ok: false, error: 'حالة غير معروفة' });

  // الموافقة على حملة بلا إثبات ملكية موقّع → تنتظر توقيع المنظّم (لا تُنشر بعد)
  let finalStatus = status;
  if (status === 'active' && !campaign.organizer_signature) {
    finalStatus = 'awaiting_signature';
  }

  const updated = models.updateCampaign(campaign.id, { status: finalStatus });
  audit.logAction({
    actor: actorOf(req),
    action: `campaign.status.${finalStatus}`,
    target: campaign.slug,
    before: campaign.status,
    after: finalStatus,
    ip: clientIp(req),
    note: String((req.body || {}).note || ''),
  });
  res.json({
    ok: true,
    campaign: { id: updated.id, slug: updated.slug, status: updated.status },
    awaiting_signature: finalStatus === 'awaiting_signature',
  });
});

/* تغيير محفظة الجهة المستفيدة — لا يستطيع المشرف تطبيقه.
   نقوم فقط بتوليد calldata يوقّعه **منظّم الحملة** في محفظته. */
router.get('/campaigns/:slug/charity-change', (req, res) => {
  const campaign = models.getCampaignBySlug(req.params.slug);
  if (!campaign) return res.status(404).json({ ok: false, error: 'campaign not found' });
  const newAddress = String(req.query.new || '').trim();
  // فحص الشبكة: لا نولّد calldata بعنوان لا يطابق شبكة الحملة
  let normalizedAddress;
  try {
    normalizedAddress = addresses.assertAddressForChain(newAddress, campaign.chain_id);
  } catch (err) {
    return res.status(400).json({ ok: false, error: String(err.message || err), code: err.code || 'ADDRESS_INVALID' });
  }
  if (!campaign.splitter_address || !campaign.splitter_campaign_id) {
    return res.status(400).json({ ok: false, error: 'الحملة غير مسجّلة على العقد' });
  }
  const organizer = (campaign.organizer_wallet || '').toLowerCase();
  if (!organizer) {
    return res.status(400).json({ ok: false, error: 'لا يوجد منظّم مسجّل للحملة — لا يمكن تحديد من يوقّع' });
  }

  const selector = toFunctionSelector('setCharity(uint256,address)');
  const data = encodeFunctionData({
    abi: chain.SPLITTER_ABI,
    functionName: 'setCharity',
    args: [BigInt(campaign.splitter_campaign_id), getAddress(normalizedAddress)],
  });

  res.json({
    ok: true,
    note: 'العقد يسمح لمنظّم الحملة فقط بتغيير العنوان — المشرف لا يستطيع (ولا يستطيع حتى لو سُرق مفتاحه).',
    must_be_signed_by: organizer,
    transaction: {
      to: campaign.splitter_address,
      value: '0x0',
      data,
      selector,
    },
    current: campaign.charity_wallet,
    requested: getAddress(newAddress),
  });
});

// ============================================================ فحص قاعدة البيانات

const READABLE_TABLES = ['campaigns', 'donations', 'campaign_updates', 'comments', 'ledger', 'audit_log', 'sessions', 'settings', 'nonces'];

router.get('/db/stats', (req, res) => {
  const tables = READABLE_TABLES.map(name => {
    let count = 0;
    try {
      count = q(`SELECT COUNT(*) AS n FROM ${name}`)[0].n;
    } catch (err) {
      return { name, error: String(err.message || err) };
    }
    let columns = [];
    try {
      columns = q(`PRAGMA table_info(${name})`).map(c => ({ name: c.name, type: c.type, notnull: c.notnull, pk: c.pk }));
    } catch { /* ignore */ }
    return { name, count, columns };
  });

  let sizeBytes = 0;
  try { sizeBytes = fs.statSync(DB_FILE).size; } catch { /* ignore */ }

  let integrity = 'unknown';
  try {
    integrity = q('PRAGMA integrity_check')[0]?.integrity_check || 'unknown';
  } catch (err) {
    integrity = `error: ${String(err.message || err)}`;
  }

  res.json({
    ok: true,
    file: DB_FILE,
    size_bytes: sizeBytes,
    integrity_check: integrity,
    tables,
  });
});

router.get('/db/rows', (req, res) => {
  const table = String(req.query.table || '');
  if (!READABLE_TABLES.includes(table)) {
    return res.status(400).json({ ok: false, error: 'جدول غير مسموح' });
  }
  const limit = Math.min(200, Number(req.query.limit) || 50);
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const search = String(req.query.search || '').trim();

  let rows = [];
  let total = 0;
  try {
    total = q(`SELECT COUNT(*) AS n FROM ${table}`)[0].n;
    if (search) {
      // بحث نصي بسيط على أعمدة النص
      const cols = q(`PRAGMA table_info(${table})`).filter(c => /TEXT/i.test(c.type)).map(c => c.name);
      if (cols.length) {
        const where = cols.map(c => `${c} LIKE ?`).join(' OR ');
        rows = q(`SELECT * FROM ${table} WHERE ${where} ORDER BY rowid DESC LIMIT ? OFFSET ?`,
          ...cols.map(() => `%${search}%`), limit, offset);
      }
    } else {
      rows = q(`SELECT * FROM ${table} ORDER BY rowid DESC LIMIT ? OFFSET ?`, limit, offset);
    }
  } catch (err) {
    return res.status(400).json({ ok: false, error: String(err.message || err) });
  }

  res.json({ ok: true, table, total, limit, offset, rows });
});

/* فحص سلامة البيانات: يعيد حساب كل المجاميع ويقارنها، ويكشف أي تبرّع نسبته
   لا تطابق شريحته (دليل تدخّل) أو مبالغ غير متسقة. */
router.get('/db/integrity', async (req, res) => {
  const issues = [];
  const donations = q(`SELECT * FROM donations WHERE status = 'confirmed'`);
  const tiers = fees.effectiveTiers();

  let grossUsd = 0;
  let feeUsd = 0;
  let charityUsd = 0;

  for (const d of donations) {
    const gross = BigInt(d.amount_raw || '0');
    const fee = BigInt(d.fee_raw || '0');
    const charity = BigInt(d.charity_raw || '0');

    if (gross !== fee + charity) {
      issues.push({
        type: 'sum_mismatch',
        donation_id: d.id,
        detail: `الإجمالي ${gross} ≠ رسوم ${fee} + صافي ${charity}`,
      });
    }

    // النسبة المطبَّقة يجب أن تطابق الشريحة المحسوبة من قيمة الدولار
    const usd = Number(d.usd_value || 0);
    const expectedBps = fees.feeBpsForUsd(usd, tiers);
    if (usd > 0 && Number(d.fee_bps) !== expectedBps) {
      issues.push({
        type: 'tier_mismatch',
        donation_id: d.id,
        detail: `النسبة المسجّلة ${d.fee_bps} ≠ المتوقّع ${expectedBps} (قيمة ${usd.toFixed(2)}$)`,
        severity: 'warning',
      });
    }

    grossUsd += usd;
    feeUsd += usd * (Number(d.fee_bps || 900) / 10000);
    charityUsd += usd * ((10000 - Number(d.fee_bps || 900)) / 10000);
  }

  // مبالغ معلّقة قديمة
  const stale = q(
    `SELECT COUNT(*) AS n FROM donations WHERE status = 'pending' AND created_at < datetime('now', '-2 hours')`
  )[0].n;

  // حملات بلا محفظة مستفيدة
  const noWallet = q(`SELECT slug FROM campaigns WHERE charity_wallet IS NULL OR charity_wallet = ''`);

  // جلسات منتهية لم تُحذف
  const expiredSessions = q(
    `SELECT COUNT(*) AS n FROM sessions WHERE expires_at < datetime('now')`
  )[0].n;

  /* ===== مطابقة الداتا مع العقد =====
     أي اختلاف بين محفظة الجهة في قاعدة البيانات ومحفظة نفس الحملة على السلسلة
     = تدخّل أو خطأ جسيم. */
  const chainChecks = [];
  const chainId = Number(getSetting('splitter_chain_id', '0')) || null;
  const splitter = getSetting('splitter_address', '');
  if (splitter && chainId) {
    const campaigns = q(
      `SELECT id, slug, title, charity_wallet, organizer_wallet, splitter_campaign_id
       FROM campaigns WHERE chain_id = ? AND splitter_address != '' AND splitter_campaign_id IS NOT NULL`,
      chainId
    );
    try {
      const client = chain.getClient(chainId);
      for (const c of campaigns) {
        let onChain = null;
        try {
          onChain = await client.readContract({
            address: splitter,
            abi: chain.SPLITTER_ABI,
            functionName: 'campaign',
            args: [BigInt(c.splitter_campaign_id)],
          });
        } catch (err) {
          chainChecks.push({
            type: 'chain_read_failed',
            campaign: c.slug,
            detail: String(err.message || err).slice(0, 120),
            severity: 'warning',
          });
          continue;
        }
        const onChainCharity = String(onChain[0]).toLowerCase();
        const dbCharity = String(c.charity_wallet || '').toLowerCase();
        if (onChainCharity !== dbCharity) {
          chainChecks.push({
            type: 'charity_mismatch',
            campaign: c.slug,
            detail: `الداتا: ${dbCharity || '—'} · العقد: ${onChainCharity}`,
            severity: 'critical',
          });
        }
        const onChainOrganizer = String(onChain[1]).toLowerCase();
        const dbOrganizer = String(c.organizer_wallet || '').toLowerCase();
        if (dbOrganizer && onChainOrganizer !== dbOrganizer) {
          chainChecks.push({
            type: 'organizer_mismatch',
            campaign: c.slug,
            detail: `الداتا: ${dbOrganizer} · العقد: ${onChainOrganizer}`,
            severity: 'critical',
          });
        }
      }
    } catch (err) {
      chainChecks.push({
        type: 'chain_unreachable',
        detail: String(err.message || err).slice(0, 160),
        severity: 'warning',
      });
    }
  }

  const allIssues = issues.concat(chainChecks);

  res.json({
    ok: true,
    checked_at: new Date().toISOString(),
    donations_checked: donations.length,
    totals: {
      gross_usd: Number(grossUsd.toFixed(2)),
      fee_usd: Number(feeUsd.toFixed(2)),
      charity_usd: Number(charityUsd.toFixed(2)),
    },
    issues: allIssues,
    issue_count: allIssues.length,
    critical_count: allIssues.filter(i => i.severity === 'critical').length,
    chain_verified: Boolean(splitter && chainId),
    stale_pending: stale,
    campaigns_without_wallet: noWallet.map(c => c.slug),
    expired_sessions: expiredSessions,
  });
});

// ============================================================ التدقيق والجلسات

router.get('/audit', (req, res) => {
  res.json({
    ok: true,
    actions: audit.listActions({ limit: Math.min(500, Number(req.query.limit) || 100) }),
  });
});

router.get('/sessions', (req, res) => {
  res.json({ ok: true, sessions: admin.listSessions(100) });
});

router.post('/sessions/revoke-all', (req, res) => {
  const count = admin.revokeAllSessions();
  audit.logAction({
    actor: actorOf(req),
    action: 'security.sessions.revoke_all',
    ip: clientIp(req),
    note: `revoked ${count} session(s)`,
  });
  res.json({ ok: true, revoked: count });
});

router.post('/admin-key', (req, res) => {
  const newKey = String((req.body || {}).new_key || '').trim();
  try {
    admin.rotateAdminKey(newKey);
  } catch (err) {
    return res.status(400).json({ ok: false, error: String(err.message || err) });
  }
  audit.logAction({
    actor: actorOf(req),
    action: 'admin.key.rotate',
    ip: clientIp(req),
    note: 'admin key rotated (hash only stored)',
  });
  res.json({ ok: true, note: 'تم تدوير المفتاح. ضعه في ADMIN_KEY في .env أيضًا أو احذفه لتفعيل المفتاح الجديد.' });
});

router.post('/admin-addresses', (req, res) => {
  const list = Array.isArray((req.body || {}).addresses) ? req.body.addresses : [];
  const before = admin.adminAddressesList();
  const after = admin.setAdminAddresses(list);
  audit.logAction({
    actor: actorOf(req),
    action: 'admin.addresses.update',
    before: before.join(','),
    after: after.join(','),
    ip: clientIp(req),
  });
  res.json({ ok: true, addresses: after });
});

/* ===== إدارة حسابات الإدارة (اسم مستخدم + كلمة مرور) ===== */

router.get('/accounts', (req, res) => {
  res.json({ ok: true, accounts: accounts.listAccounts() });
});

/* إنشاء حساب جديد أو توليد كلمة مرور */
router.post('/accounts', (req, res) => {
  const body = req.body || {};
  const username = String(body.username || '').trim();
  const password = String(body.password || '').trim();
  const generate = Boolean(body.generate);

  let finalPassword = password;
  if (generate) finalPassword = passwords.randomPassword(20);
  if (!finalPassword) {
    return res.status(400).json({ ok: false, error: 'كلمة المرور مطلوبة أو استخدم generate=true' });
  }

  try {
    const account = accounts.upsertAccount({
      username,
      password: finalPassword,
      role: String(body.role || 'admin'),
      isActive: body.is_active === false ? 0 : 1,
      mustChange: 1,
    });
    res.status(201).json({
      ok: true,
      account: { id: account.id, username: account.username, role: account.role },
      // تُعرض كلمة المرور مرة واحدة فقط عند التوليد
      generated_password: generate ? finalPassword : undefined,
      note: 'كلمة المرور يجب تغييرها عند أول دخول',
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: String(err.message || err) });
  }
});

/* تغيير كلمة مرور الحساب الحالي */
router.post('/account/password', (req, res) => {
  const body = req.body || {};
  const session = admin.accountSession(req);
  const username = session ? session.username : actorOf(req);

  const current = String(body.current_password || '');
  const next = String(body.new_password || '');

  try {
    if (session) {
      accounts.changePassword(username, current, next);
    } else {
      // دخول بالمفتاح: نتحقق من كلمة المرور الحالية للحساب المطلوب تغييرها
      const target = String(body.username || username).trim();
      const account = accounts.findByUsername(target);
      if (!account) return res.status(404).json({ ok: false, error: 'الحساب غير موجود' });
      accounts.changePassword(target, current, next);
    }
    res.json({ ok: true, note: 'تم تغيير كلمة المرور' });
  } catch (err) {
    res.status(400).json({ ok: false, error: String(err.message || err) });
  }
});

/* تعطيل/تفعيل حساب */
router.post('/accounts/:username/toggle', (req, res) => {
  const username = String(req.params.username || '').trim();
  const account = accounts.findByUsername(username);
  if (!account) return res.status(404).json({ ok: false, error: 'الحساب غير موجود' });
  const nextActive = account.is_active ? 0 : 1;
  require('../db').run(
    'UPDATE admin_accounts SET is_active = ?, updated_at = datetime(\'now\') WHERE id = ?',
    nextActive, account.id
  );
  audit.logAction({
    actor: actorOf(req),
    action: nextActive ? 'account.enabled' : 'account.disabled',
    target: username,
    before: String(account.is_active),
    after: String(nextActive),
    ip: clientIp(req),
  });
  res.json({ ok: true, is_active: nextActive });
});

/* توليد كلمة مرور قوية للعرض */
router.get('/password-generator', (req, res) => {
  res.json({ ok: true, password: passwords.randomPassword(Number(req.query.length) || 20) });
});

/* ===== إدارة الحملات: تعديل / حذف / تحقق / إيقاف ===== */

router.get('/campaigns/:slug', (req, res) => {
  const campaign = models.getCampaignBySlug(req.params.slug);
  if (!campaign) return res.status(404).json({ ok: false, error: 'campaign not found' });
  const t = models.campaignTotals(campaign.id);
  res.json({
    ok: true,
    campaign,
    totals: {
      raised_usd: Number(t.totalUsd.toFixed(2)),
      fee_usd: Number(t.feeUsd.toFixed(2)),
      charity_usd: Number(t.charityUsd.toFixed(2)),
      donors: t.donorCount,
      tiers_used: t.tiersUsed,
    },
    donations: models.listDonations({ campaignId: campaign.id, status: null, limit: 100 }),
    updates: models.listUpdates(campaign.id),
    comments: models.listComments(campaign.id),
    impact_levels: models.listImpactLevels(campaign.id, { includeInactive: true }),
    audit: audit.listActions({ limit: 50 }),
  });
});

/* تعديل بيانات الحملة. محفظة الجهة المستفيدة مقفلة إن كانت الحملة مسجّلة على العقد. */
router.post('/campaigns/:slug/edit', (req, res) => {
  const campaign = models.getCampaignBySlug(req.params.slug);
  if (!campaign) return res.status(404).json({ ok: false, error: 'campaign not found' });
  const b = req.body || {};

  const patch = {};
  if (typeof b.title === 'string' && b.title.trim().length >= 4) patch.title = b.title.trim().slice(0, 140);
  if (typeof b.subtitle === 'string') patch.subtitle = b.subtitle.slice(0, 200);
  if (typeof b.story === 'string') patch.story = b.story.slice(0, 8000);
  if (typeof b.category === 'string') patch.category = b.category;
  if (b.goal_usd !== undefined) patch.goal_usd = Math.max(0, Number(b.goal_usd) || 0);
  if (typeof b.cover_url === 'string') patch.cover_url = b.cover_url.slice(0, 500);
  if (typeof b.accent === 'string') patch.accent = b.accent.slice(0, 20);
  if (typeof b.organizer_name === 'string') patch.organizer_name = b.organizer_name.slice(0, 120);
  if (typeof b.country === 'string') patch.country = b.country.slice(0, 60);
  if (typeof b.verification === 'string' && ['verified', 'self_declared'].includes(b.verification)) {
    patch.verification = b.verification;
  }

  // محفظة المستفيد: مسموح فقط إن لم تكن الحملة مسجّلة على العقد
  const onChain = Boolean(campaign.splitter_address && campaign.splitter_campaign_id);
  if (typeof b.charity_wallet === 'string' && b.charity_wallet.trim()) {
    if (onChain) {
      return res.status(409).json({
        ok: false,
        error: 'محفظة الجهة المستفيدة مقفلة: الحملة مسجّلة على العقد، والتغيير يوقّعه المنظّم فقط',
      });
    }
    if (!isAddress(b.charity_wallet)) {
      return res.status(400).json({ ok: false, error: 'عنوان محفظة غير صالح' });
    }
    patch.charity_wallet = b.charity_wallet.toLowerCase();
  }

  try {
    const updated = models.updateCampaign(campaign.id, patch);

    // مستويات الأثر: استبدال كامل إن وُجدت في الطلب
    if (Array.isArray(b.impact_levels)) {
      const levels = b.impact_levels
        .filter(l => l && Number(l.amount_usd) > 0 && String(l.label || '').trim())
        .map((l, i) => ({
          amount_usd: Number(l.amount_usd),
          label: String(l.label || '').trim().slice(0, 200),
          label_en: String(l.label_en || '').trim().slice(0, 200),
          sort_order: i,
          is_active: l.is_active === undefined ? 1 : l.is_active,
        }));
      models.replaceImpactLevels(campaign.id, levels);
      audit.logAction({
        actor: actorOf(req),
        action: 'campaign.impact_levels_updated',
        target: campaign.slug,
        after: { count: levels.length },
        ip: clientIp(req),
      });
    }

    audit.logAction({
      actor: actorOf(req),
      action: 'campaign.edited',
      target: campaign.slug,
      before: Object.fromEntries(Object.keys(patch).map(k => [k, campaign[k]])),
      after: patch,
      ip: clientIp(req),
      note: onChain ? 'charity wallet locked (on-chain)' : '',
    });
    res.json({ ok: true, campaign: updated });
  } catch (err) {
    if (err.code === 'WALLET_ADDRESS_NOT_ALLOWED') return res.status(400).json({ ok: false, error: validate.MESSAGE });
    throw err;
  }
});

/* حذف حملة (مع سجل تبرعاتها وتحديثاتها) */
router.post('/campaigns/:slug/delete', (req, res) => {
  const campaign = models.getCampaignBySlug(req.params.slug);
  if (!campaign) return res.status(404).json({ ok: false, error: 'campaign not found' });

  const b = req.body || {};
  const reason = String(b.reason || '').trim();
  if (!reason) return res.status(400).json({ ok: false, error: 'سبب الحذف مطلوب (يُسجَّل في سجل التدقيق)' });

  const donations = models.listDonations({ campaignId: campaign.id, status: null, limit: 1000 });
  const totalRaised = donations
    .filter(d => d.status === 'confirmed')
    .reduce((sum, d) => sum + Number(d.usd_value || 0), 0);

  models.deleteCampaign(campaign.id);
  audit.logAction({
    actor: actorOf(req),
    action: 'campaign.deleted',
    target: campaign.slug,
    before: {
      title: campaign.title,
      charity_wallet: campaign.charity_wallet,
      status: campaign.status,
      donations: donations.length,
      raised_usd: Number(totalRaised.toFixed(2)),
    },
    after: null,
    ip: clientIp(req),
    note: reason,
  });
  res.json({ ok: true, deleted: campaign.slug, donations_removed: donations.length });
});

/* اعتماد/رفض مجموعة حملات دفعة واحدة */
router.post('/campaigns/bulk-status', (req, res) => {
  const slugs = Array.isArray((req.body || {}).slugs) ? req.body.slugs : [];
  const status = String((req.body || {}).status || '');
  if (!slugs.length) return res.status(400).json({ ok: false, error: 'لا توجد حملات' });
  if (!['active', 'rejected', 'paused'].includes(status)) return res.status(400).json({ ok: false, error: 'حالة غير معروفة' });

  const changed = [];
  for (const slug of slugs) {
    const campaign = models.getCampaignBySlug(String(slug));
    if (!campaign) continue;
    models.updateCampaign(campaign.id, { status });
    audit.logAction({
      actor: actorOf(req),
      action: `campaign.status.${status}`,
      target: campaign.slug,
      before: campaign.status,
      after: status,
      ip: clientIp(req),
      note: 'bulk action',
    });
    changed.push(campaign.slug);
  }
  res.json({ ok: true, changed: changed.length, slugs: changed });
});

/* حذف تبرّع مسجّل (حالات احتيال/تداخل) */
router.post('/donations/:id/delete', (req, res) => {
  const donation = one('SELECT * FROM donations WHERE id = ?', Number(req.params.id));
  if (!donation) return res.status(404).json({ ok: false, error: 'donation not found' });
  const reason = String((req.body || {}).reason || '').trim();
  if (!reason) return res.status(400).json({ ok: false, error: 'سبب الحذف مطلوب' });

  models.deleteDonation(donation.id);
  audit.logAction({
    actor: actorOf(req),
    action: 'donation.deleted',
    target: donation.tx_hash || String(donation.id),
    before: {
      amount_raw: donation.amount_raw,
      symbol: donation.token_symbol,
      usd: donation.usd_value,
      donor: donation.donor_address,
    },
    after: null,
    ip: clientIp(req),
    note: reason,
  });
  res.json({ ok: true, deleted: donation.id });
});

/* حذف/تعديل تحديث أو تعليق */
router.post('/content/:kind/:id/delete', (req, res) => {
  const kind = String(req.params.kind);
  const id = Number(req.params.id);
  const reason = String((req.body || {}).reason || '').trim();
  if (!reason) return res.status(400).json({ ok: false, error: 'سبب الحذف مطلوب' });

  let removed = 0;
  if (kind === 'update') removed = models.deleteUpdate(id);
  else if (kind === 'comment') removed = models.deleteComment(id);
  else return res.status(400).json({ ok: false, error: 'نوع غير معروف' });

  if (!removed) return res.status(404).json({ ok: false, error: 'العنصر غير موجود' });
  audit.logAction({
    actor: actorOf(req),
    action: `content.${kind}.deleted`,
    target: String(id),
    before: null,
    after: null,
    ip: clientIp(req),
    note: reason,
  });
  res.json({ ok: true, deleted: id });
});

/* ===== إدارة المستخدمين ===== */

router.get('/users', (req, res) => {
  res.json({ ok: true, users: users.listUsers(300) });
});

router.post('/users/:username/toggle', (req, res) => {
  const username = String(req.params.username || '').trim();
  const user = users.findByUsername(username);
  if (!user) return res.status(404).json({ ok: false, error: 'الحساب غير موجود' });
  const nextActive = user.is_active ? 0 : 1;
  require('../db').run(
    'UPDATE users SET is_active = ?, updated_at = datetime(\'now\') WHERE id = ?',
    nextActive, user.id
  );
  audit.logAction({
    actor: actorOf(req),
    action: nextActive ? 'user.enabled' : 'user.disabled',
    target: username,
    before: String(user.is_active),
    after: String(nextActive),
    ip: clientIp(req),
  });
  res.json({ ok: true, is_active: nextActive });
});

router.post('/users/:username/reset-password', (req, res) => {
  const username = String(req.params.username || '').trim();
  const user = users.findByUsername(username);
  if (!user) return res.status(404).json({ ok: false, error: 'الحساب غير موجود' });
  // إعادة تعيين إدارية مباشرة (بدون كلمة المرور الحالية) — مسموحة للمشرف
  const newPassword = passwords.randomPassword(20);
  users.adminResetPassword(username, newPassword);
  audit.logAction({
    actor: actorOf(req),
    action: 'user.password_reset',
    target: username,
    ip: clientIp(req),
  });
  res.json({ ok: true, generated_password: newPassword, note: 'كلمة المرور الجديدة تظهر مرة واحدة' });
});

/* ===== إعدادات المنصة ===== */

router.get('/settings', (req, res) => {
  const settings = allSettings();
  delete settings.session_secret;
  delete settings.admin_key_hash;
  res.json({
    ok: true,
    settings,
    collector_address: settings.collector_address || '',
    owner_address: settings.owner_address || '',
    admin_addresses: admin.adminAddressesList(),
    warning: 'محفظة الكولكتر مثبّتة (immutable) داخل العقد — تغييرها في الإعدادات لا يغيّر العقد',
  });
});

router.post('/settings', (req, res) => {
  const b = req.body || {};
  const allowed = ['collector_address', 'owner_address', 'fee_tiers_config'];
  const changed = {};
  for (const key of allowed) {
    if (typeof b[key] !== 'string') continue;
    let value = b[key].trim();
    if (key.endsWith('_address')) {
      if (!isAddress(value)) return res.status(400).json({ ok: false, error: `عنوان غير صالح: ${key}` });
      value = value.toLowerCase();
    }
    if (key === 'fee_tiers_config') {
      try { JSON.parse(value); } catch { return res.status(400).json({ ok: false, error: 'JSON غير صالح' }); }
    }
    const before = getSetting(key, '');
    if (before !== value) {
      setSetting(key, value);
      changed[key] = { before, after: value };
    }
  }
  if (Object.keys(changed).length) {
    audit.logAction({
      actor: actorOf(req),
      action: 'settings.update',
      target: Object.keys(changed).join(','),
      before: changed,
      after: changed,
      ip: clientIp(req),
    });
  }
  res.json({ ok: true, changed: Object.keys(changed).length });
});

/* ===== تصدير البيانات ===== */

router.get('/export/:table', (req, res) => {
  const table = String(req.params.table || '');
  if (!['campaigns', 'donations', 'ledger', 'audit_log', 'users', 'admin_accounts'].includes(table)) {
    return res.status(400).json({ ok: false, error: 'جدول غير مسموح' });
  }
  const rows = q(`SELECT * FROM ${table}`);
  if (table === 'admin_accounts') {
    for (const r of rows) delete r.password_hash;
  }
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const csv = [headers.join(',')].concat(
    rows.map(r => headers.map(h => {
      const v = String(r[h] ?? '').replace(/"/g, '""');
      return /[",\n]/.test(v) ? `"${v}"` : v;
    }).join(','))
  ).join('\n');

  audit.logAction({ actor: actorOf(req), action: 'data.exported', target: table, ip: clientIp(req) });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="hadiya-${table}.csv"`);
  res.send('﻿' + csv); // BOM حتى تفتح إكسل بالعربية صحيحة
});

module.exports = router;
