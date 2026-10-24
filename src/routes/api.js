/* مسارات API — JSON خالص. كل الأرقام تُقرأ من قاعدة البيانات أو من السلسلة. */

const express = require('express');
const { isAddress, getAddress } = require('viem');
const addresses = require('../lib/addresses');
const signature = require('../lib/signature');
const google = require('../lib/google');
const users = require('../lib/users');
const audit = require('../lib/audit');

const models = require('../models');
const chain = require('../lib/chain');
const price = require('../lib/price');
const fees = require('../lib/fees');
const donations = require('../services/donations');
const auth = require('../lib/auth');
const adminLib = require('../lib/admin');
const validate = require('../lib/validate');
const { one, getSetting } = require('../db');
const { listChains, getChain, tokensFor, findToken } = require('../../config/chains');
const brand = require('../../config/brand');

const router = express.Router();

/* Express 4 لا يلتقط أخطاء handlers غير المتزامنة — نغلّفها. */
const { asyncRoute, wrapRouter } = require('../lib/async');

const TX_RE = /^0x[a-fA-F0-9]{64}$/;

function bad(res, message, code = 400) {
  return res.status(code).json({ ok: false, error: message });
}

/* حد بسيط للطلبات (in-memory) */
const hits = new Map();
function rateLimit(key, max = 30, windowMs = 60_000) {
  const now = Date.now();
  const entry = hits.get(key) || { count: 0, reset: now + windowMs };
  if (now > entry.reset) {
    entry.count = 0;
    entry.reset = now + windowMs;
  }
  entry.count += 1;
  hits.set(key, entry);
  return entry.count <= max;
}

/* صلاحيات المشرف: مفتاح ADMIN_KEY أو عنوان الكولكتر/المالك (بمقارنة constant-time) */
function isAdmin(req) {
  return adminLib.authenticate(req).ok;
}

// ------------------------------------------------------------------ health

router.get('/health', (req, res) => {
  const totals = models.platformTotals();
  res.json({
    ok: true,
    service: 'hadiya-web3',
    brand: brand.name,
    fee_bps: brand.platformFeeBps,
    chain_health: chain.chainHealth(),
    totals: {
      campaigns: models.countCampaigns({}),
      donations_confirmed: totals.donations,
      gross_usd: Number(totals.grossUsd.toFixed(2)),
      platform_fee_usd: Number(totals.feeUsd.toFixed(2)),
      charity_usd: Number(totals.charityUsd.toFixed(2)),
    },
    collector_address: getSetting('collector_address', ''),
    splitter: getSetting('splitter_address', ''),
    time: new Date().toISOString(),
  });
});

// ------------------------------------------------------------------ chains

router.get('/chains', (req, res) => {
  res.json({
    ok: true,
    chains: listChains(),
    tokens: Object.fromEntries(listChains().map(c => [c.id, tokensFor(c.id)])),
    fee_bps: brand.platformFeeBps,
    fee_tiers: brand.feeTiers.map(t => ({ max_usd: t.maxUsd === Infinity ? null : t.maxUsd, bps: t.bps })),
    min_fee_bps: brand.minFeeBps,
  });
});

/* جدول الرسوم المتدرّج + معاينة الرسوم لمبلغ معيّن */
router.get('/fees', async (req, res) => {
  const amount = Number(req.query.amount) || 0;
  const symbol = String(req.query.symbol || 'USDC').toUpperCase();
  const tiers = brand.feeTiers.map((t, index) => ({
    max_usd: t.maxUsd === Infinity ? null : t.maxUsd,
    min_usd: index === 0 ? 0 : brand.feeTiers[index - 1].maxUsd,
    bps: t.bps,
    percent: (t.bps / 100).toFixed(t.bps % 100 === 0 ? 0 : 2) + '%',
    label: fees.tierLabel(t.maxUsd === Infinity ? brand.feeTiers[index - 1].maxUsd + 1 : t.maxUsd),
  }));

  let usdPrice = null;
  try {
    usdPrice = await price.getPrice(symbol);
  } catch { /* السعر غير متاح */ }

  // معاينة بمبلغ رمز
  const preview = fees.splitUsd(amount, brand.feeTiers);
  res.json({
    ok: true,
    tiers,
    min_fee_bps: brand.minFeeBps,
    max_fee_bps: brand.platformFeeBps,
    preview_usd: preview,
    preview_token: {
      symbol,
      amount,
      usd_estimate: usdPrice ? Number((amount * usdPrice).toFixed(2)) : null,
      usd_price: usdPrice,
      bps: fees.feeBpsForUsd(usdPrice ? amount * usdPrice : 0),
    },
  });
});

router.get('/prices', async (req, res) => {
  if (!rateLimit(`prices:${req.ip}`, 60, 5 * 60_000)) return bad(res, 'too many requests', 429);
  const symbols = String(req.query.symbols || 'ETH,USDC,USDT,POL').split(',').map(e => e.trim()).filter(Boolean);
  const prices = await price.getPrices(symbols);
  res.json({ ok: true, prices, updated_at: new Date().toISOString() });
});

// -------------------------------------------------------------- campaigns

router.get('/campaigns', (req, res) => {
  const limit = Math.min(100, Number(req.query.limit) || 24);
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const filters = {
    search: String(req.query.search || '').trim(),
    category: String(req.query.category || '').trim(),
    sort: String(req.query.sort || 'recent'),
  };
  const rows = models.listCampaigns({ ...filters, limit, offset });
  const totals = new Map();
  for (const row of rows) {
    const t = models.campaignTotals(row.id);
    totals.set(row.id, t);
  }
  res.json({
    ok: true,
    total: models.countCampaigns(filters),
    campaigns: rows.map(r => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      subtitle: r.subtitle,
      category: r.category,
      goal_usd: r.goal_usd,
      cover_url: r.cover_url,
      accent: r.accent,
      verification: r.verification,
      chain_id: r.chain_id,
      token_symbol: r.token_symbol,
      organizer_name: r.organizer_name,
      charity_wallet: r.charity_wallet,
      raised_usd: totals.get(r.id).totalUsd,
      donors: totals.get(r.id).donorCount,
      progress: r.goal_usd > 0 ? Math.min(100, (totals.get(r.id).totalUsd / r.goal_usd) * 100) : 0,
      created_at: r.created_at,
    })),
  });
});

router.get('/campaigns/:slug', (req, res) => {
  const campaign = models.getCampaignBySlug(req.params.slug);
  if (!campaign) return bad(res, 'campaign not found', 404);
  const totals = models.campaignTotals(campaign.id);
  res.json({
    ok: true,
    campaign: {
      ...campaign,
      raised_usd: totals.totalUsd,
      donors: totals.donorCount,
      fee_usd: totals.feeUsd,
      by_token: totals.byToken,
    },
    donations: models.listDonations({ campaignId: campaign.id, limit: 25 }),
    updates: models.listUpdates(campaign.id),
    comments: models.listComments(campaign.id),
    impact_levels: models.listImpactLevels(campaign.id),
  });
});

/* مستويات الأثر — إضافة/تعديل/حذف (للمنظّم أو للمشرف) */
router.post('/campaigns/:slug/impact-levels', (req, res) => {
  const campaign = models.getCampaignBySlug(req.params.slug);
  if (!campaign) return bad(res, 'campaign not found', 404);
  const b = req.body || {};
  try {
    if (b.id) {
      const updated = models.updateImpactLevel(b.id, {
        amount_usd: b.amount_usd,
        label: b.label,
        label_en: b.label_en,
        sort_order: b.sort_order,
        is_active: b.is_active,
      });
      return res.json({ ok: true, level: updated });
    }
    const created = models.addImpactLevel(campaign.id, {
      amount_usd: b.amount_usd,
      label: b.label,
      label_en: b.label_en,
      sort_order: b.sort_order !== undefined ? b.sort_order : models.listImpactLevels(campaign.id).length,
      is_active: b.is_active,
    });
    return res.json({ ok: true, level: created });
  } catch (err) {
    if (err.code === 'INVALID_AMOUNT') return bad(res, err.message, 400);
    if (err.code === 'WALLET_ADDRESS_NOT_ALLOWED') return bad(res, validate.MESSAGE, 400);
    throw err;
  }
});

router.delete('/campaigns/:slug/impact-levels/:id', (req, res) => {
  const campaign = models.getCampaignBySlug(req.params.slug);
  if (!campaign) return bad(res, 'campaign not found', 404);
  const removed = models.deleteImpactLevel(req.params.id);
  return res.json({ ok: removed });
});

router.post('/campaigns', async (req, res) => {
  if (!rateLimit(`create:${req.ip}`, 10, 10 * 60_000)) return bad(res, 'too many requests', 429);
  const b = req.body || {};
  const title = String(b.title || '').trim();
  if (title.length < 4) return bad(res, 'العنوان قصير جدًا');
  const charity = String(b.charity_wallet || '').trim();
  const chainId = Number(b.chain_id) || 8453;
  if (!getChain(chainId)) return bad(res, 'شبكة غير مدعومة');
  // فحص العنوان: صيغة صحيحة + مناسب للشبكة (يمنع وضع TRC20 مكان BNB والعكس)
  let charityAddress;
  try {
    charityAddress = addresses.assertAddressForChain(charity, chainId);
  } catch (err) {
    return bad(res, String(err.message || err), err.code === 'ADDRESS_NETWORK_MISMATCH' ? 422 : 400);
  }

  // عنوان الاستلام: اختياري، ويُقبل فقط مع توقيع صالح من صاحب العنوان
  let deliveryAddress = '';
  let deliveryVerified = 0;
  const deliveryRaw = String(b.delivery_address || '').trim();
  if (deliveryRaw) {
    try {
      deliveryAddress = addresses.assertAddressForChain(deliveryRaw, chainId);
    } catch (err) {
      return bad(res, `عنوان الاستلام: ${String(err.message || err)}`, 400);
    }
    const proofOk = await signature.verifyMessageSignature(
      deliveryAddress,
      String(b.delivery_message || ''),
      String(b.delivery_signature || '')
    );
    if (!proofOk) {
      return bad(res, 'عنوان الاستلام لم يُثبت بتوقيع صالح من صاحب العنوان.', 400);
    }
    deliveryVerified = 1;
  }

  let campaign;
  try {
    campaign = models.createCampaign({
      title,
      subtitle: String(b.subtitle || '').trim().slice(0, 200),
      story: String(b.story || '').trim().slice(0, 8000),
      category: models.CATEGORY_KEYS.includes(b.category) ? b.category : 'community',
      goal_usd: Number(b.goal_usd) || 0,
      cover_url: String(b.cover_url || '').trim().slice(0, 500),
      accent: String(b.accent || 'emerald').slice(0, 20),
      organizer_name: String(b.organizer_name || '').trim().slice(0, 120),
      organizer_wallet: String(b.organizer_wallet || '').trim(),
      charity_wallet: charityAddress,
      chain_id: chainId,
      token_symbol: String(b.token_symbol || 'USDC').toUpperCase().slice(0, 10),
      verification: 'self_declared',
      country: String(b.country || '').trim().slice(0, 60),
      title_en: String(b.title_en || '').trim().slice(0, 140),
      subtitle_en: String(b.subtitle_en || '').trim().slice(0, 200),
      story_en: String(b.story_en || '').trim().slice(0, 8000),
      delivery_address: deliveryAddress,
      delivery_verified: deliveryVerified,
    });
  } catch (err) {
    if (err.code === 'WALLET_ADDRESS_NOT_ALLOWED') return bad(res, validate.MESSAGE);
    throw err;
  }

  res.status(201).json({ ok: true, campaign: { id: campaign.id, slug: campaign.slug } });
});

// -------------------------------------------------------------- donations

router.post('/donations', async (req, res) => {
  if (!rateLimit(`donate:${req.ip}`, 30, 5 * 60_000)) return bad(res, 'too many requests', 429);
  const b = req.body || {};
  const txHash = String(b.tx_hash || '').trim();
  if (!TX_RE.test(txHash)) return bad(res, 'hash التبرّع غير صالح');

  const campaign = b.campaign_slug
    ? models.getCampaignBySlug(String(b.campaign_slug))
    : models.getCampaignById(Number(b.campaign_id));
  if (!campaign) return bad(res, 'campaign not found', 404);

  const chainId = Number(b.chain_id) || campaign.chain_id;
  if (!getChain(chainId)) return bad(res, 'شبكة غير مدعومة');
  if (chainId !== Number(campaign.chain_id)) return bad(res, 'الشبكة لا تطابق الحملة');

  const existing = models.findDonationByTx(txHash);
  if (existing) return res.json({ ok: true, donation: existing, duplicate: true });

  const donor = String(b.donor_address || '').trim();
  const donation = await donations.registerDonation({
    campaign,
    txHash: txHash.toLowerCase(),
    chainId,
    tokenSymbol: String(b.token_symbol || campaign.token_symbol).toUpperCase(),
    donorAddress: isAddress(donor) ? getAddress(donor) : '',
    donorName: String(b.donor_name || '').trim().slice(0, 80),
    message: String(b.message || '').trim().slice(0, 500),
    isAnonymous: Boolean(b.is_anonymous),
  });

  res.status(201).json({ ok: true, donation });
});

router.get('/donations/:id', async (req, res) => {
  let donation = one('SELECT * FROM donations WHERE id = ?', Number(req.params.id));
  if (!donation) return bad(res, 'donation not found', 404);
  if (donation.status === 'pending') {
    await donations.verifyDonation(donation.id).catch(() => {});
    donation = one('SELECT * FROM donations WHERE id = ?', Number(req.params.id));
  }
  res.json({ ok: true, donation });
});

/* متابعة حالة تبرّع(tx hash) — يستعمله المتصفح بعد إرسال المعاملة */
router.get('/donations/by-tx/:hash', async (req, res) => {
  const hash = String(req.params.hash || '').toLowerCase();
  let donation = models.findDonationByTx(hash);
  if (!donation) return bad(res, 'donation not found', 404);
  if (donation.status === 'pending') {
    await donations.verifyDonation(donation.id).catch(() => {});
    donation = models.findDonationByTx(hash);
  }
  res.json({ ok: true, donation });
});

// -------------------------------------------------------------- collector

router.get('/collector/summary', (req, res) => {
  if (!rateLimit(`collector-sum:${req.ip}`, 30, 5 * 60_000)) return bad(res, 'too many requests', 429);
  const totals = models.platformTotals();
  const collectorAddress = getSetting('collector_address', '');
  res.json({
    ok: true,
    collector_address: collectorAddress,
    splitter_address: getSetting('splitter_address', ''),
    fee_bps: brand.platformFeeBps,
    totals: {
      gross_usd: Number(totals.grossUsd.toFixed(2)),
      fee_usd: Number(totals.feeUsd.toFixed(2)),
      charity_usd: Number(totals.charityUsd.toFixed(2)),
      donations: totals.donations,
      unsettled_fee_donations: totals.unsettledFees,
    },
    by_token: totals.byToken,
    ledger: models.listLedger(50),
  });
});

/* أرصدة محفظة الكولكتر على كل شبكة (قراءة مباشرة من السلسلة) */
router.get('/collector/balances', async (req, res) => {
  if (!rateLimit(`collector-bal:${req.ip}`, 20, 5 * 60_000)) return bad(res, 'too many requests', 429);
  const collectorAddress = getSetting('collector_address', '');
  if (!collectorAddress) return res.json({ ok: true, balances: [], note: 'collector address not configured' });
  const out = [];
  for (const c of listChains()) {
    const native = await chain.getNativeBalance(collectorAddress, c.id);
    out.push({ chain_id: c.id, chain: c.name, symbol: native ? native.symbol : c.native, raw: native ? native.raw : null });
    for (const t of tokensFor(c.id).filter(x => !x.isNative)) {
      const bal = await chain.getTokenBalance(collectorAddress, t.address, c.id);
      out.push({ chain_id: c.id, chain: c.name, symbol: t.symbol, raw: bal ? bal.raw : null });
    }
  }
  res.json({ ok: true, collector_address: collectorAddress, balances: out });
});

/* رصيد محفظة الجهة المستفيدة (لإظهار "كم وصل" فعليًا) */
router.get('/wallet/:chainId/:address', async (req, res) => {
  if (!rateLimit(`wallet:${req.ip}`, 40, 5 * 60_000)) return bad(res, 'too many requests', 429);
  const chainId = Number(req.params.chainId);
  const address = req.params.address;
  if (!getChain(chainId)) return bad(res, 'شبكة غير مدعومة');
  if (!isAddress(address)) return bad(res, 'عنوان غير صالح');
  const native = await chain.getNativeBalance(address, chainId);
  const tokens = [];
  for (const t of tokensFor(chainId).filter(x => !x.isNative)) {
    const bal = await chain.getTokenBalance(address, t.address, chainId);
    tokens.push({ symbol: t.symbol, raw: bal ? bal.raw : null, decimals: t.decimals });
  }
  res.json({ ok: true, chain_id: chainId, address, native: native ? native.raw : null, tokens });
});

// ----------------------------------------------------------- contract info

router.get('/contracts/:chainId', (req, res) => {
  const chainId = Number(req.params.chainId);
  const c = getChain(chainId);
  if (!c) return bad(res, 'شبكة غير مدعومة');
  const splitter = getSetting(`splitter_address:${chainId}`, '');
  res.json({
    ok: true,
    chain_id: chainId,
    chain: c.name,
    splitter_address: splitter,
    selectors: chain.SELECTORS,
    tokens: tokensFor(chainId),
    fee_bps: brand.platformFeeBps,
  });
});

// ------------------------------------------------------------------- auth

router.get('/auth/nonce', (req, res) => {
  const address = String(req.query.address || '').trim();
  if (!isAddress(address)) return bad(res, 'عنوان غير صالح');
  const nonce = auth.createNonce(getAddress(address));
  res.json({ ok: true, nonce, message: buildSignMessage(address, nonce) });
});

function buildSignMessage(address, nonce) {
  return [
    `${brand.name} — تسجيل الدخول`,
    '',
    `العنوان: ${address}`,
    `رمز التحقق: ${nonce}`,
    '',
    'بالتوقيع أنت توافق على استخدام هذا العنوان فقط لأغراض الحساب في هذه المنصة.',
  ].join('\n');
}

router.post('/auth/verify', async (req, res) => {
  if (!rateLimit(`auth:${req.ip}`, 20, 5 * 60_000)) return bad(res, 'too many requests', 429);
  const { address, message, signature } = req.body || {};
  if (!isAddress(address) || !message || !signature) return bad(res, 'بيانات ناقصة');
  const addr = getAddress(address);
  const nonce = auth.readNonce(addr);
  if (!nonce) return bad(res, 'لا يوجد رمز تحقق — اطلب رمزًا جديدًا');
  if (!message.includes(nonce)) return bad(res, 'رمز تحقق غير مطابق');
  const ok = await auth.verifySignature(addr, message, signature);
  if (!ok) return bad(res, 'التوقيع غير صالح');
  // استهلاك الـ nonce — لا يمكن إعادة استخدام نفس التوقيع
  if (!auth.consumeNonce(addr, nonce)) return bad(res, 'رمز التحقق استُخدم أو انتهى — اطلب رمزًا جديدًا');
  const session = auth.createSession(addr);
  auth.setSessionCookie(res, session.token);
  res.json({ ok: true, address: addr });
});

router.post('/auth/logout', (req, res) => {
  const e = auth.sessionFromRequest(req);
  if (e) auth.destroySession(e.token);
  auth.clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/session', (req, res) => {
  const e = auth.sessionFromRequest(req);
  res.json({ ok: true, address: e ? e.address : null });
});

/* ---------- تسجيل الدخول بجوجل (Google Identity) ---------- */

router.post('/auth/google', async (req, res) => {
  if (!rateLimit(`google:${req.ip}`, 10, 10 * 60_000)) return bad(res, 'too many requests', 429);
  if (!google.isConfigured()) return bad(res, 'تسجيل جوجل غير مهيّأ على هذا الخادم', 503);
  const credential = String((req.body || {}).credential || '');
  const verified = await google.verifyIdToken(credential).catch(() => ({ ok: false, error: 'verify_failed' }));
  if (!verified.ok) {
    audit.logAction({ actor: 'google', action: 'security.google_login_rejected', ip: req.ip, note: verified.error });
    return bad(res, 'تعذّر التحقق من حساب جوجل', 401);
  }
  try {
    // إن كان المستخدم مسجّلًا بالفعل → نربط حساب جوجل بحسابه الحالي
    const identity = auth.currentIdentity(req, res);
    if (identity && identity.type === 'username') {
      const current = users.findByUsername(identity.username);
      if (current) {
        run(
          'UPDATE users SET email = ?, google_sub = ?, updated_at = datetime(\'now\') WHERE id = ?',
          verified.email, verified.sub, current.id
        );
        audit.logAction({ actor: current.username, action: 'user.google_linked', target: current.username, ip: req.ip });
        res.json({ ok: true, username: current.username, linked: true });
        return;
      }
    }
    const user = users.loginWithGoogle({
      email: verified.email,
      sub: verified.sub,
      name: verified.name,
    });
    auth.startUserSession(res, user.username);
    res.json({ ok: true, username: user.username });
  } catch (err) {
    if (err.code === 'ACCOUNT_DISABLED') return bad(res, 'الحساب معطّل', 403);
    return bad(res, String(err.message || err), 400);
  }
});

// ------------------------------------------------- comments & updates (API)

router.post('/campaigns/:slug/comments', (req, res) => {
  if (!rateLimit(`comment:${req.ip}`, 20, 5 * 60_000)) return bad(res, 'too many requests', 429);
  const campaign = models.getCampaignBySlug(req.params.slug);
  if (!campaign) return bad(res, 'campaign not found', 404);
  const body = String((req.body || {}).body || '').trim();
  if (body.length < 2) return bad(res, 'التعليق فارغ');
  const e = auth.sessionFromRequest(req);
  let comment;
  try {
    comment = models.addComment(campaign.id, {
      body: body.slice(0, 1000),
      author_wallet: e ? e.address : '',
      author_name: String((req.body || {}).author_name || '').trim().slice(0, 60),
    });
  } catch (err) {
    if (err.code === 'WALLET_ADDRESS_NOT_ALLOWED') return bad(res, validate.MESSAGE);
    throw err;
  }
  res.status(201).json({ ok: true, comment });
});

router.post('/campaigns/:slug/updates', (req, res) => {
  const campaign = models.getCampaignBySlug(req.params.slug);
  if (!campaign) return bad(res, 'campaign not found', 404);
  const e = auth.sessionFromRequest(req);
  if (!e) return bad(res, 'يجب تسجيل الدخول', 401);
  const owner = (campaign.organizer_wallet || '').toLowerCase();
  if (owner && owner !== e.address.toLowerCase()) return bad(res, 'هذه الحملة ليست لك', 403);
  const body = String((req.body || {}).body || '').trim();
  if (body.length < 2) return bad(res, 'النص فارغ');
  let update;
  try {
    update = models.addUpdate(campaign.id, {
      title: String((req.body || {}).title || '').trim().slice(0, 120),
      body: body.slice(0, 4000),
      author_wallet: e.address,
    });
  } catch (err) {
    if (err.code === 'WALLET_ADDRESS_NOT_ALLOWED') return bad(res, validate.MESSAGE);
    throw err;
  }
  res.status(201).json({ ok: true, update });
});

/* نسبة الرسوم الفعلية لمبلغ على رمز معيّن:
   تُقرأ من العقد مباشرة إن كان منشورًا (المصدر الموثوق)، وإلا تُحسب من جدول الشروح. */
router.get('/fee-for', async (req, res) => {
  const chainId = Number(req.query.chain_id) || 8453;
  const symbol = String(req.query.symbol || 'USDC').toUpperCase();
  const amount = Number(req.query.amount) || 0;
  const token = findToken(chainId, symbol);
  if (!token) return bad(res, 'رمز غير مدعوم على هذه الشبكة');

  const decimals = token.decimals;
  const raw = BigInt(Math.round(amount * Math.pow(10, decimals)));
  const splitter = getSetting(`splitter_address:${chainId}`, '');
  const tiersMeta = readTiersMeta(chainId, symbol);

  if (splitter) {
    try {
      const client = chain.getClient(chainId);
      const bps = Number(await client.readContract({
        address: splitter,
        abi: chain.SPLITTER_ABI,
        functionName: 'feeFor',
        args: [token.address || '0x0000000000000000000000000000000000000000', raw],
      }));
      return res.json({
        ok: true,
        source: 'contract',
        chain_id: chainId,
        symbol,
        amount,
        bps,
        fee: Number((amount * (bps / 10000)).toFixed(6)),
        to_charity: Number((amount * ((10000 - bps) / 10000)).toFixed(6)),
        tiers_meta: tiersMeta,
      });
    } catch (err) {
      // نُكمل بالحساب المحلي ونذكر المصدر
    }
  }

  let usdPrice = null;
  try { usdPrice = await price.getPrice(symbol); } catch { /* لا سعر */ }
  const usdValue = usdPrice ? amount * usdPrice : 0;
  const bps = fees.feeBpsForUsd(usdValue);
  res.json({
    ok: true,
    source: 'tiers',
    chain_id: chainId,
    symbol,
    amount,
    usd_estimate: usdPrice ? Number(usdValue.toFixed(2)) : null,
    bps,
    fee: Number((amount * (bps / 10000)).toFixed(6)),
    to_charity: Number((amount * ((10000 - bps) / 10000)).toFixed(6)),
    tiers_meta: tiersMeta,
  });
});

/* بيانات الشرائح المخزّنة محليًا (سعر المرجع وقت الضبط) — للشفافية */
function readTiersMeta(chainId, symbol) {
  const raw = getSetting(`tiers:${chainId}:${symbol}`, '');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return {
      reference_price_usd: parsed.reference_price_usd,
      updated_at: parsed.updated_at,
      // تنبيه: العتبات ثابتة بالوحدة الأصلية، فقد تنزلق قيمتها بالدولار مع تغيّر السعر
      note: 'thresholds are fixed in token units at the reference price',
    };
  } catch {
    return null;
  }
}

/* إدارة حالة الحملة (مراجعة/إيقاف) — للمشرف فقط */
router.post('/campaigns/:slug/status', (req, res) => {
  if (!isAdmin(req)) return bad(res, 'غير مصرّح', 403);
  if (!adminLib.checkCsrf(req)) return bad(res, 'رمز CSRF مفقود أو غير صالح', 403);
  const campaign = models.getCampaignBySlug(req.params.slug);
  if (!campaign) return bad(res, 'campaign not found', 404);
  const status = String((req.body || {}).status || '');
  const allowed = ['active', 'pending_review', 'paused', 'closed', 'rejected'];
  if (!allowed.includes(status)) return bad(res, 'حالة غير معروفة');
  const updated = models.updateCampaign(campaign.id, { status });
  res.json({ ok: true, campaign: { id: updated.id, slug: updated.slug, status: updated.status } });
});

/* قوائم المراجعة للمشرف */
router.get('/campaigns-pending', (req, res) => {
  if (!isAdmin(req)) return bad(res, 'غير مصرّح', 403);
  res.json({
    ok: true,
    campaigns: models.listCampaignsByStatus('pending_review').map(c => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      subtitle: c.subtitle,
      story: c.story,
      category: c.category,
      goal_usd: c.goal_usd,
      charity_wallet: c.charity_wallet,
      chain_id: c.chain_id,
      organizer_name: c.organizer_name,
      created_at: c.created_at,
    })),
  });
});

/* حاسبة الرسوم للصفحة العامة */
router.get('/fee-calc', (req, res) => {
  const amount = Number(req.query.amount) || 0;
  const split = fees.splitUsd(amount, brand.feeTiers);
  res.json({
    ok: true,
    gross: Number(amount),
    fee_bps: split.bps,
    fee: Number(split.fee.toFixed(4)),
    to_charity: Number(split.charity.toFixed(4)),
    tier: split.tier.bps,
  });
});

module.exports = wrapRouter(router);
