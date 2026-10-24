/* صفحات HTML (تصيير من الخادم) */

const express = require('express');
const { isAddress, getAddress } = require('viem');

const models = require('../models');
const chain = require('../lib/chain');
const price = require('../lib/price');
const auth = require('../lib/auth');
const adminLib = require('../lib/admin');
const validate = require('../lib/validate');
const addresses = require('../lib/addresses');
const signature = require('../lib/signature');
const google = require('../lib/google');
const users = require('../lib/users');
const audit = require('../lib/audit');
const { getSetting, one } = require('../db');
const { listChains, getChain, tokensFor } = require('../../config/chains');
const brand = require('../../config/brand');

const router = express.Router();
const { wrapRouter } = require('../lib/async');

const CATEGORY_ORDER = models.CATEGORY_KEYS;

function currentUser(req) {
  const s = auth.sessionFromRequest(req);
  return s ? s.address : null;
}

/* الهوية الكاملة: محفظة موقّعة أو حساب باسم مستخدم */
function currentIdentity(req) {
  return auth.currentIdentity(req);
}

function isCollector(req) {
  const auth = adminLib.authenticate(req);
  return auth.ok;
}

function hydrate(campaign) {
  const totals = models.campaignTotals(campaign.id);
  const progress = campaign.goal_usd > 0 ? Math.min(100, (totals.totalUsd / campaign.goal_usd) * 100) : 0;
  return {
    campaign,
    totals,
    progress,
    donations: models.listDonations({ campaignId: campaign.id, limit: 30 }),
    updates: models.listUpdates(campaign.id),
    comments: models.listComments(campaign.id),
    chain: getChain(campaign.chain_id),
  };
}

/* ------------------------------------------------------------------ home */

router.get('/', async (req, res) => {
  const rows = models.listCampaigns({ limit: 12, sort: 'recent' });
  const featured = rows.map(r => {
    const t = models.campaignTotals(r.id);
    return {
      ...r,
      raised_usd: t.totalUsd,
      donors: t.donorCount,
      progress: r.goal_usd > 0 ? Math.min(100, (t.totalUsd / r.goal_usd) * 100) : 0,
    };
  });
  const totals = models.platformTotals();
  res.render('home', {
    title: `${brand.nameAr} — ${brand.tagline}`,
    user: currentUser(req),
    featured,
    categories: CATEGORY_ORDER.map(key => ({
      key,
      label: res.locals.helpers.categoryLabel(key),
      count: models.countCampaigns({ category: key }),
    })),
    stats: {
      campaigns: models.countCampaigns({}),
      donations: totals.donations,
      grossUsd: totals.grossUsd,
      charityUsd: totals.charityUsd,
    },
    collectorAddress: getSetting('collector_address', ''),
    chains: listChains(),
  });
});

/* -------------------------------------------------------------- discover */

router.get('/discover', (req, res) => {
  const filters = {
    search: String(req.query.search || '').trim(),
    category: String(req.query.category || '').trim(),
    sort: String(req.query.sort || 'recent'),
  };
  const page = Math.max(1, Number(req.query.page) || 1);
  const perPage = 12;
  const total = models.countCampaigns(filters);
  const rows = models.listCampaigns({ ...filters, limit: perPage, offset: (page - 1) * perPage });
  const campaigns = rows.map(r => {
    const t = models.campaignTotals(r.id);
    return {
      ...r,
      raised_usd: t.totalUsd,
      donors: t.donorCount,
      progress: r.goal_usd > 0 ? Math.min(100, (t.totalUsd / r.goal_usd) * 100) : 0,
    };
  });
  res.render('discover', {
    title: 'اكتشف الحملات — تبرّع بالعملات الرقمية',
    user: currentUser(req),
    campaigns,
    filters,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / perPage)),
    categories: CATEGORY_ORDER.map(key => ({
      key,
      label: res.locals.helpers.categoryLabel(key),
      count: models.countCampaigns({ category: key }),
    })),
  });
});

/* -------------------------------------------------------------- campaign */

router.get('/c/:slug', async (req, res, next) => {
  const campaign = models.getCampaignBySlug(req.params.slug);
  if (!campaign) return next();
  const data = hydrate(campaign);
  const prices = await price.getPrices([campaign.token_symbol, 'ETH', 'USDC']);
  const splitterInfo = campaign.splitter_address
    ? await chain.getSplitterInfo(campaign.splitter_address, campaign.chain_id)
    : null;
  const charityBalance = campaign.charity_wallet
    ? await chain.getTokenBalance(campaign.charity_wallet, tokenAddressFor(campaign), campaign.chain_id)
    : null;
  res.render('campaign', {
    title: `${campaign.title} — ${brand.nameAr}`,
    user: currentUser(req),
    ...data,
    prices,
    splitterInfo,
    charityBalance,
    tokens: tokensFor(campaign.chain_id),
    collectorAddress: getSetting('collector_address', ''),
    impactLevels: models.listImpactLevels(campaign.id),
    owner: (campaign.organizer_wallet || '').toLowerCase() === (currentUser(req) || '').toLowerCase(),
    // هل هذا المشاهد هو صاحب الحملة (بلا محفظة موقّعة بعد)؟
    needsSignature: campaign.status === 'awaiting_signature' && (
      !campaign.organizer_wallet || (currentUser(req) || '').toLowerCase() === campaign.organizer_wallet.toLowerCase()
    ),
  });
});

function tokenAddressFor(campaign) {
  const list = tokensFor(campaign.chain_id);
  const token = list.find(t => t.symbol === campaign.token_symbol);
  if (!token) return null;
  return token.isNative ? null : token.address;
}

/* ---------------------------------------------------------------- faq */

router.get('/faq', (req, res) => {
  const { FAQ, CATEGORIES } = require('../lib/faq');
  const lang = res.locals.lang === 'en' ? 'en' : 'ar';
  // أسماء الفئات حسب لغة الواجهة
  const faqCategories = {};
  for (const [key, entry] of Object.entries(CATEGORIES)) {
    faqCategories[key] = (entry && entry[lang]) ? entry[lang] : key;
  }
  res.render('faq', {
    title: lang === 'en' ? `FAQ — ${brand.name}` : `الأسئلة الشائعة — ${brand.nameAr}`,
    user: currentUser(req),
    FAQ,
    CATEGORIES,
    faqCategories,
  });
});

/* ---------------------------------------------------------------- account */

router.get('/account', (req, res) => {
  const identity = currentIdentity(req);
  if (!identity) {
    return res.redirect('/login?next=%2Faccount');
  }
  const address = (identity.address || '').toLowerCase();
  const username = identity.username;

  const allCampaigns = models.listCampaigns({ limit: 500, status: null });
  const myCampaigns = allCampaigns
    .filter(c => {
      const owner = (c.organizer_wallet || '').toLowerCase();
      if (owner && address) return owner === address;
      if (username && (c.organizer_name || '').toLowerCase() === username.toLowerCase()) return true;
      return false;
    })
    .map(c => {
      const t = models.campaignTotals(c.id);
      return { ...c, raised_usd: t.totalUsd, donors: t.donorCount };
    });

  const myDonations = models.listDonations({ status: null, limit: 100 })
    .filter(d => (d.donor_address || '').toLowerCase() === address);

  const myRaised = myCampaigns.reduce((sum, c) => sum + c.raised_usd, 0);

  res.render('account', {
    title: `حسابي — ${brand.nameAr}`,
    user: identity.address || identity.displayName,
    identity,
    myCampaigns,
    myDonations,
    myRaised,
  });
});

/* ------------------------------------------------- حسابات المستخدمين */

router.get('/register', (req, res) => {
  if (currentIdentity(req)) return res.redirect('/account');
  res.render('register', {
    title: `حساب جديد — ${brand.nameAr}`,
    user: null,
    error: null,
    googleClientId: google.isConfigured() ? google.clientId() : '',
  });
});

router.post('/register', (req, res) => {
  const b = req.body || {};
  const username = String(b.username || '').trim();
  const password = String(b.password || '');
  const password2 = String(b.password2 || '');

  const renderError = (error) => res.status(400).render('register', {
    title: `حساب جديد — ${brand.nameAr}`,
    user: null,
    error,
    values: b,
    googleClientId: google.isConfigured() ? google.clientId() : '',
  });

  if (password !== password2) return renderError('كلمتا المرور غير متطابقتين');
  try {
    const user = users.createUser({
      username,
      password,
      displayName: String(b.display_name || '').trim(),
    });
    auth.startUserSession(res, user.username);
    return res.redirect('/account');
  } catch (err) {
    return renderError(String(err.message || err));
  }
});

router.get('/login', (req, res) => {
  if (currentIdentity(req)) return res.redirect('/account');
  res.render('login', {
    title: `تسجيل الدخول — ${brand.nameAr}`,
    user: null,
    error: null,
    notice: req.query.reset === 'ok' ? 'تم تغيير كلمة المرور — سجّل الدخول بكلمة المرور الجديدة.' : null,
    next: safeNext(req.query.next),
    googleClientId: google.isConfigured() ? google.clientId() : '',
    demoUser: process.env.ADMIN_USERNAME || '',
    demoPass: process.env.ADMIN_PASSWORD || '',
  });
});

/* ---------- نسيان كلمة المرور ---------- */

router.get('/forgot-password', (req, res) => {
  if (currentIdentity(req)) return res.redirect('/account');
  res.render('forgot-password', {
    title: `استعادة كلمة المرور — ${brand.nameAr}`,
    user: null,
    error: null,
    sent: false,
    // في التطوير نعرض الرابط مباشرة (لا يوجد خادم بريد مهيّأ)
    devLink: null,
  });
});

router.post('/forgot-password', (req, res) => {
  const username = String((req.body || {}).username || '').trim();
  const reset = users.createPasswordReset(username, req.ip);
  // رسالة واحدة دائمًا — لا نكشف إن كان الحساب موجودًا
  const base = `${req.protocol}://${req.get('host')}`;
  const devLink = reset && process.env.NODE_ENV !== 'production'
    ? `${base}/reset-password?token=${reset.token}`
    : null;
  if (devLink) {
    console.log(JSON.stringify({
      level: 'info',
      message: 'password reset link (no mailer configured)',
      username: reset.username,
      link: devLink,
      expires_at: reset.expires,
    }));
  }
  res.render('forgot-password', {
    title: `استعادة كلمة المرور — ${brand.nameAr}`,
    user: null,
    error: null,
    sent: true,
    devLink,
  });
});

router.get('/reset-password', (req, res) => {
  const token = String(req.query.token || '');
  const row = users.readPasswordReset(token);
  if (!row) {
    return res.status(400).render('error', {
      title: 'خطأ',
      user: null,
      message: 'رابط الاستعادة غير صالح أو منتهي الصلاحية. اطلب رابطًا جديدًا.',
    });
  }
  res.render('reset-password', {
    title: `تعيين كلمة مرور جديدة — ${brand.nameAr}`,
    user: null,
    error: null,
    token,
  });
});

router.post('/reset-password', (req, res) => {
  const b = req.body || {};
  const token = String(b.token || '');
  const password = String(b.password || '');
  const password2 = String(b.password2 || '');
  if (password !== password2) {
    return res.status(400).render('reset-password', {
      title: `تعيين كلمة مرور جديدة — ${brand.nameAr}`,
      user: null,
      error: 'كلمتا المرور غير متطابقتين',
      token,
    });
  }
  try {
    users.resetPasswordWithToken(token, password, req.ip);
    return res.redirect('/login?reset=ok');
  } catch (err) {
    return res.status(400).render('reset-password', {
      title: `تعيين كلمة مرور جديدة — ${brand.nameAr}`,
      user: null,
      error: String(err.message || err),
      token,
    });
  }
});

router.post('/login', (req, res) => {
  const b = req.body || {};
  const result = users.verifyLogin(String(b.username || ''), String(b.password || ''));
  if (!result.ok) {
    const message = {
      invalid_credentials: 'اسم المستخدم أو كلمة المرور غير صحيحة',
      disabled: 'هذا الحساب معطّل',
      locked: 'الحساب مقفل مؤقتًا بسبب محاولات فاشلة — حاول بعد قليل',
    }[result.reason] || 'فشل الدخول';
    return res.status(401).render('login', {
      title: `تسجيل الدخول — ${brand.nameAr}`,
      user: null,
      error: message,
      notice: null,
      values: b,
      next: safeNext(b.next),
      googleClientId: google.isConfigured() ? google.clientId() : '',
      demoUser: process.env.ADMIN_USERNAME || '',
      demoPass: process.env.ADMIN_PASSWORD || '',
    });
  }
  auth.startUserSession(res, result.user.username);
  const next = safeNext(b.next);
  res.redirect(next || '/account');
});

router.post('/logout', (req, res) => {
  auth.endUserSession(req, res);
  const walletSession = auth.sessionFromRequest(req);
  if (walletSession) auth.destroySession(walletSession.token);
  res.redirect('/');
});

/* ربط محفظة بالحساب — يتطلّب توقيع رسالة من صاحب المحفظة (إثبات ملكية) */
router.post('/account/link-wallet', async (req, res) => {
  const identity = currentIdentity(req);
  if (!identity) return res.redirect('/login?next=%2Faccount');
  if (identity.type !== 'username') {
    return res.status(400).render('error', { title: 'خطأ', user: identity.displayName, message: 'الحساب مرتبط بمحفظة بالفعل' });
  }
  const b = req.body || {};
  const address = String(b.address || '').trim();
  const message = String(b.message || '');
  const signatureHex = String(b.signature || '');
  // عند الدخول: نقبل EVM و TRON معًا — لا نربط العنوان بشبكة معيّنة هنا.
  // (مطابقة الشبكة تُفحص عند إنشاء الحملة، حيث الشبكة تكون محدّدة.)
  const family = addresses.detectFamily(address);
  if (family !== 'evm' && family !== 'tron') {
    return res.status(400).render('error', { title: 'خطأ', user: identity.displayName, message: 'صيغة العنوان غير صحيحة — عنوان EVM يبدأ بـ 0x أو عنوان TRON يبدأ بحرف T' });
  }
  if (!message || !signatureHex) {
    return res.status(400).render('error', { title: 'خطأ', user: identity.displayName, message: 'التوقيع مطلوب لربط المحفظة' });
  }
  // إثبات ملكية المحفظة — بدونه يمكن لأي شخص ربط محفظة الآخرين
  let valid = false;
  try {
    valid = await signature.verifyMessageSignature(address, message, signatureHex);
  } catch { valid = false; }
  if (!valid) {
    audit.logAction({
      actor: identity.username,
      action: 'security.link_wallet_rejected',
      target: address,
      ip: req.ip,
      note: 'invalid signature',
    });
    return res.status(400).render('error', { title: 'خطأ', user: identity.displayName, message: 'التوقيع غير صالح — لم يتم الربط' });
  }

  try {
    users.linkWallet(identity.username, family === 'tron' ? address : getAddress(address));
  } catch (err) {
    return res.status(400).render('error', { title: 'خطأ', user: identity.displayName, message: String(err.message || err) });
  }
  res.redirect('/account');
});

/* ---------------------------------------------------------------- create */

// مسار "التالي" بعد تسجيل الدخول — يُقبل فقط المسارات الداخلية (منع open redirect)
function safeNext(value) {
  const raw = String(value || '').trim();
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return '';
  if (!raw.startsWith('/create') && !raw.startsWith('/campaigns') && !raw.startsWith('/discover')) return '';
  return raw;
}

router.get('/create', (req, res) => {
  const identity = currentIdentity(req);
  // إنشاء الحملة يتطلّب هوية + محفظة (المحفظة هي المالك على السلسلة)
  if (!identity) {
    return res.redirect('/login?next=%2Fcreate&reason=create');
  }
  if (!identity.address) {
    // حساب باسم مستخدم بلا محفظة مرتبطة
    return res.redirect('/account?reason=link');
  }
  res.render('create', {
    title: `ابدأ حملة — ${brand.nameAr}`,
    user: identity.address,
    identity,
    categories: CATEGORY_ORDER.map(key => ({ key, label: res.locals.helpers.categoryLabel(key) })),
    chains: listChains(),
  });
});

router.post('/create', async (req, res) => {
  const b = req.body || {};
  const identity = currentIdentity(req);
  if (!identity) {
    return res.redirect('/login?next=%2Fcreate&reason=create');
  }
  const user = identity.address || '';
  const title = String(b.title || '').trim();
  const renderError = (error) => res.status(400).render('create', {
    title: `ابدأ حملة — ${brand.nameAr}`,
    user,
    identity,
    error,
    values: b,
    categories: CATEGORY_ORDER.map(key => ({ key, label: res.locals.helpers.categoryLabel(key) })),
    chains: listChains(),
  });
  if (title.length < 4) return renderError('العنوان قصير جدًا');
  const chainId = Number(b.chain_id) || 8453;
  if (!getChain(chainId)) return renderError('شبكة غير مدعومة');
  // فحص عنوان محفظة الاستلام: الصيغة + توافقها مع شبكة الحملة (EVM ↔ TRON/TRC20)
  let charity;
  try {
    charity = addresses.assertAddressForChain(b.charity_wallet, chainId);
  } catch (err) {
    return renderError(String(err.message || err));
  }

  // عنوان الاستلام: اختياري، وإن وُجد يجب أن يكون صحيح الصيغة ومُثبتًا بتوقيع
  let deliveryAddress = '';
  let deliveryVerified = 0;
  const deliveryRaw = String(b.delivery_address || '').trim();
  if (deliveryRaw) {
    try {
      deliveryAddress = addresses.assertAddressForChain(deliveryRaw, chainId);
    } catch (err) {
      return renderError(`عنوان الاستلام: ${String(err.message || err)}`);
    }
    const proofOk = await signature.verifyMessageSignature(
      deliveryAddress,
      String(b.delivery_message || ''),
      String(b.delivery_signature || '')
    );
    if (!proofOk) {
      return renderError('عنوان الاستلام لم يُثبت بتوقيع صالح من صاحب العنوان. اطلب التوقيع من محفظتك ثم أعد المحاولة.');
    }
    deliveryVerified = 1;
  }

  // إثبات ملكية محفظة المنظّم: اختياري عند الحفظ.
  // إن لم يُقدَّم، تُنشر الحملة للمراجعة وتنتظر توقيع المنظّم بعد موافقة الإدارة.
  let organizerWallet = user;
  let organizerSignature = '';
  const proofAddress = String(b.organizer_address || '').trim();
  const proofMessage = String(b.organizer_message || '');
  const proofSignature = String(b.organizer_signature || '');
  if (proofAddress && proofSignature) {
    const ok = await signature.verifyMessageSignature(proofAddress, proofMessage, proofSignature);
    if (!ok) {
      return renderError('توقيع محفظة المنظّم غير صالح — أعد التوقيع من محفظتك ثم احفظ الحملة مجددًا.');
    }
    organizerWallet = proofAddress;
    organizerSignature = proofSignature;
  } else if (proofAddress || proofSignature) {
    return renderError('توقيع محفظة المنظّم ناقص — وقّع بالعنوان نفسه ثم احفظ الحملة.');
  }
  // إن لم يُقدَّم توقيع → الحملة تنتظر توقيع المنظّم (بعد موافقة الإدارة)
  const initialStatus = organizerSignature ? 'pending_review' : 'awaiting_signature';

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
      organizer_wallet: organizerWallet,
      charity_wallet: charity,
      chain_id: chainId,
      token_symbol: String(b.token_symbol || 'USDC').toUpperCase().slice(0, 10),
      verification: 'self_declared',
      country: String(b.country || '').trim().slice(0, 60),
      status: initialStatus,
      title_en: String(b.title_en || '').trim().slice(0, 140),
      subtitle_en: String(b.subtitle_en || '').trim().slice(0, 200),
      story_en: String(b.story_en || '').trim().slice(0, 8000),
      delivery_address: deliveryAddress,
      delivery_verified: deliveryVerified,
    });
  } catch (err) {
    if (err.code === 'WALLET_ADDRESS_NOT_ALLOWED') {
      return renderError(validate.MESSAGE);
    }
    throw err;
  }
  // حفظ إثبات ملكية المحفظة (إن وُجد)
  if (organizerSignature) {
    models.updateCampaign(campaign.id, {
      organizer_signature: organizerSignature,
      organizer_signed_at: new Date().toISOString(),
    });
  }

  // مستويات الأثر (اختيارية) — تُقرأ من حقول impact_amount_N / impact_label_N / impact_label_en_N
  const impactLevels = [];
  const body = b || {};
  for (const key of Object.keys(body)) {
    const m = /^impact_amount_(\d+)$/.exec(key);
    if (!m) continue;
    const i = m[1];
    const amount = Number(body[key]);
    const label = String(body[`impact_label_${i}`] || '').trim();
    const labelEn = String(body[`impact_label_en_${i}`] || '').trim();
    if (!Number.isFinite(amount) || amount <= 0 || !label) continue;
    impactLevels.push({ amount_usd: amount, label, label_en: labelEn, sort_order: impactLevels.length });
  }
  if (impactLevels.length) {
    try {
      models.replaceImpactLevels(campaign.id, impactLevels);
    } catch { /* لا تُسقط الحملة بسبب مستوى */ }
  }

  res.redirect(`/c/${campaign.slug}`);
});

/* ------------- توقيع محفظة المنظّم (بعد موافقة الإدارة) → إعادة الطلب للمراجعة ------------- */

router.post('/c/:slug/sign', async (req, res, next) => {
  const campaign = models.getCampaignBySlug(req.params.slug);
  if (!campaign) return next();
  const identity = currentIdentity(req);
  if (!identity) return res.redirect('/login?next=%2Fc%2F' + encodeURIComponent(campaign.slug));

  const b = req.body || {};
  const address = String(b.address || '').trim();
  const message = String(b.message || '');
  const sig = String(b.signature || '').trim();

  if (!address || !message || !sig) {
    return res.status(400).send('التوقيع مطلوب');
  }
  const ok = await signature.verifyMessageSignature(address, message, sig);
  if (!ok) {
    return res.status(400).send('التوقيع غير صالح — لم يتم الحفظ');
  }

  // المنظّم هو صاحب الجلسة (أو صاحب الحملة نفسه)
  const sessionUser = String(identity.username || '').toLowerCase();
  const ownsByAccount = campaign.organizer_wallet
    && sessionUser
    && String(campaign.organizer_wallet).toLowerCase() === identity.address
    && identity.type === 'username';
  const ownsByWallet = identity.type === 'wallet'
    && String(campaign.organizer_wallet || '').toLowerCase() === identity.address.toLowerCase();
  if (!ownsByAccount && !ownsByWallet) {
    // نسمح لمن لم تُسجَّل حملته (حملة بلا محفظة) بربطها بحسابه
    if (campaign.organizer_wallet) {
      return res.status(403).send('هذه الحملة ليست تخصّك');
    }
    if (identity.type === 'username') {
      try {
        users.linkWallet(identity.username, address);
      } catch { /* تجاهل */ }
    }
  }

  models.updateCampaign(campaign.id, {
    organizer_wallet: address,
    organizer_signature: sig,
    organizer_signed_at: new Date().toISOString(),
    status: 'pending_review',
  });
  res.redirect(`/c/${campaign.slug}`);
});

/* ------------------------------------------------------- organizer panel */

router.get('/campaigns/:slug/dashboard', (req, res, next) => {
  const campaign = models.getCampaignBySlug(req.params.slug);
  if (!campaign) return next();
  const user = currentUser(req);
  const owner = (campaign.organizer_wallet || '').toLowerCase();
  const allowed = (user && owner && user.toLowerCase() === owner) || isCollector(req);
  if (!allowed) return res.status(403).render('forbidden', { title: 'غير مصرّح', user });
  const data = hydrate(campaign);
  res.render('dashboard', {
    title: `لوحة ${campaign.title} — ${brand.nameAr}`,
    user,
    ...data,
    isCollector: isCollector(req),
  });
});

/* ------------------------------------------------------- collector panel */

router.get('/collector', (req, res) => {
  if (!isCollector(req)) {
    return res.status(403).render('forbidden', {
      title: `لوحة الكولكتر — ${brand.nameAr}`,
      user: currentUser(req),
      hint: 'هذه اللوحة مخصّصة لمحفظة الكولكتر (المشرف). سجّل الدخول بنفس العنوان أو استخدم مفتاح المشرف.',
    });
  }
  const totals = models.platformTotals();
  res.render('collector', {
    title: `لوحة الكولكتر — ${brand.nameAr}`,
    user: currentUser(req),
    totals,
    ledger: models.listLedger(100),
    donations: models.listDonations({ status: 'confirmed', limit: 60 }),
    campaigns: models.listCampaigns({ limit: 100 }).map(r => {
      const t = models.campaignTotals(r.id);
      return {
        ...r,
        raised_usd: t.totalUsd,
        donors: t.donorCount,
        fee_usd: t.feeUsd,
        charity_usd: t.charityUsd,
        tiers: t.tiersUsed,
      };
    }),
    collectorAddress: getSetting('collector_address', ''),
    splitterAddress: getSetting('splitter_address', ''),
    chains: listChains(),
  });
});

/* ------------------------------------------------------------- static-ish */

router.get('/pricing', (req, res) => {
  res.render('pricing', { title: `الرسوم — ${brand.nameAr}`, user: currentUser(req) });
});

router.get('/how-it-works', (req, res) => {
  res.render('how-it-works', { title: `كيف تعمل المنصة — ${brand.nameAr}`, user: currentUser(req) });
});

router.get('/terms', (req, res) => {
  res.render('terms', { title: `الشروط — ${brand.nameAr}`, user: currentUser(req) });
});

router.get('/privacy', (req, res) => {
  res.render('privacy', { title: `الخصوصية — ${brand.nameAr}`, user: currentUser(req) });
});

router.get('/sign-in', (req, res) => {
  res.render('sign-in', {
    title: `تسجيل الدخول — ${brand.nameAr}`,
    user: currentUser(req),
    next: safeNext(req.query.next),
    reason: String(req.query.reason || ''),
  });
});

module.exports = wrapRouter(router);
