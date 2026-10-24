/* نقطة تشغيل الخادم */

require('dotenv').config();

const path = require('path');
const express = require('express');

const brand = require('../config/brand');
const helpers = require('./view-helpers');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
const assistantRoutes = require('./routes/assistant');
const pageRoutes = require('./routes/pages');
const donations = require('./services/donations');
const adminLib = require('./lib/admin');
const { getSetting } = require('./db');

const PORT = Number(process.env.PORT || 3100);
const HOST = process.env.HOST || '0.0.0.0';
// نسخة الأصول (لتجاوز ذاكرة المتصفح) — تتغيّر مع كل تشغيل
const ASSET_VERSION = Date.now().toString(36);

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(express.urlencoded({ extended: false, limit: '256kb' }));
app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(__dirname, '..', 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
  etag: true,
}));

// كوكيز بلا مكتبة خارجية
app.use((req, res, next) => {
  req.cookies = {};
  const header = req.headers.cookie;
  if (header) {
    for (const part of header.split(';')) {
      const idx = part.indexOf('=');
      if (idx < 0) continue;
      const key = part.slice(0, idx).trim();
      const value = decodeURIComponent(part.slice(idx + 1).trim());
      if (key) req.cookies[key] = value;
    }
  }
  res.cookie = (name, value, opts = {}) => {
    const parts = [`${name}=${encodeURIComponent(value)}`];
    if (opts.maxAge) parts.push(`Max-Age=${Math.floor(opts.maxAge / 1000)}`);
    if (opts.httpOnly) parts.push('HttpOnly');
    if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
    if (opts.secure) parts.push('Secure');
    parts.push(`Path=${opts.path || '/'}`);
    const prev = res.getHeader('Set-Cookie');
    const cookie = parts.join('; ');
    res.setHeader('Set-Cookie', prev ? [].concat(prev, cookie) : cookie);
    return res;
  };
  res.clearCookie = (name) => {
    res.setHeader('Set-Cookie', `${name}=; Max-Age=0; Path=/`);
    return res;
  };
  next();
});

// ترويسات أمان أساسية
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()'
  );
  // HSTS في الإنتاج فقط (لا يُطبَّق على localhost)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "img-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' https://accounts.google.com",
      "connect-src 'self' https://*.coingecko.com https://*.publicnode.com https://*.base.org https://*.coinbase.com https://*.binance.org https://accounts.google.com",
      "form-action 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
    ].join('; ')
  );
  next();
});

app.use((req, res, next) => {
  // لغة الواجهة من كوكي الاختيار (الافتراضي عربي)
  const langCookie = (req.cookies || {}).hadba_lang === 'en' ? 'en' : 'ar';
  res.locals.lang = langCookie;
  res.locals.helpers = helpers.build(langCookie);
  res.locals.brand = brand;
  res.locals.fees = require('./lib/fees');
  res.locals.assetV = ASSET_VERSION;
  res.locals.year = new Date().getFullYear();
  res.locals.path = req.path;
  res.locals.query = req.query;
  res.locals.collectorAddress = getSetting('collector_address', '');
  next();
});

app.use('/api', apiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/', pageRoutes);

/* ===== robots.txt + sitemap.xml (الفهرسة) ===== */

app.get('/robots.txt', (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/admin\nDisallow: /account\nDisallow: /create\nSitemap: ${base}/sitemap.xml\n`
  );
});

app.get('/sitemap.xml', (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  const models = require('./models');
  const staticPaths = [
    '/', '/discover', '/pricing', '/faq', '/how-it-works', '/terms', '/privacy', '/sign-in', '/create',
  ];
  const urls = [
    ...staticPaths.map(p => ({ loc: `${base}${p}`, priority: p === '/' ? '1.0' : '0.8' })),
    ...models.listCampaigns({ limit: 500, status: 'active' }).map(c => ({
      loc: `${base}/c/${encodeURIComponent(c.slug)}`,
      lastmod: (c.updated_at || c.created_at || '').slice(0, 10),
      priority: '0.7',
    })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
    + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
    + urls.map(u => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}`
      + `<changefreq>weekly</changefreq><priority>${u.priority}</priority></url>`).join('\n')
    + `\n</urlset>\n`;
  res.type('application/xml').send(xml);
});

/* لوحة الإدارة — تتطلّب مصادقة إدارية، وتصدر رمز CSRF للجلسة */
app.get('/admin', (req, res) => {
  const auth = adminLib.authenticate(req);
  if (!auth.ok) {
    return res.status(401).render('admin-login', {
      title: `لوحة الإدارة — ${brand.nameAr}`,
      user: null,
      error: null,
    });
  }
  const csrf = adminLib.issueCsrfToken(res);
  res.render('admin', {
    title: `لوحة الإدارة — ${brand.nameAr}`,
    user: auth.actor,
    authMethod: auth.method,
    csrf,
    collectorAddress: getSetting('collector_address', ''),
  });
});

app.use((req, res) => {
  res.status(404).render('404', { title: `غير موجود — ${brand.nameAr}`, user: null });
});

// معالج الأخطاء: لا نكشف تفاصيل داخلية
app.use((err, req, res, next) => {
  console.error(JSON.stringify({
    time: new Date().toISOString(),
    level: 'error',
    message: err.message,
    path: req.path,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  }));
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ ok: false, error: 'internal error' });
  }
  res.status(500).render('error', { title: `خطأ — ${brand.nameAr}`, user: null, message: err.message });
});

if (require.main === module) {
  // حساب الإدارة الافتراضي (من ADMIN_USERNAME / ADMIN_PASSWORD) — يُنشأ مرة واحدة
  try {
    const accounts = require('./lib/accounts');
    const created = accounts.ensureDefaultAccount();
    if (created) {
      console.log(JSON.stringify({
        time: new Date().toISOString(),
        level: 'info',
        message: 'admin account ready',
        username: created.username,
        must_change_password: Boolean(created.must_change_password),
      }));
    }
  } catch (err) {
    console.error(JSON.stringify({ level: 'error', message: 'admin account init failed', error: String(err.message || err) }));
  }

  // لا نُسقط العملية كاملة بسبب خطأ عابر — نسجّله ونكمل
  process.on('unhandledRejection', (err) => {
    console.error(JSON.stringify({
      time: new Date().toISOString(),
      level: 'error',
      message: 'unhandled rejection',
      error: String(err && err.message ? err.message : err),
      stack: err && err.stack,
    }));
  });
  process.on('uncaughtException', (err) => {
    console.error(JSON.stringify({
      time: new Date().toISOString(),
      level: 'error',
      message: 'uncaught exception',
      error: String(err && err.message ? err.message : err),
      stack: err && err.stack,
    }));
  });

  donations.startWorkers();
  app.listen(PORT, HOST, () => {
    console.log(JSON.stringify({
      time: new Date().toISOString(),
      level: 'info',
      message: `${brand.name} listening`,
      url: `http://localhost:${PORT}`,
      fee_bps: brand.platformFeeBps,
    }));
  });
}

module.exports = app;
