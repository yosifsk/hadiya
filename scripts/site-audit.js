/* ============================================================
   HADIYA — تدقيق الموقع آليًا (جودة/سرعة/SEO/إتاحة/أمان)
  Usage: node scripts/site-audit.js [--base http://localhost:3100]
   يطبع تقريرًا مرقّمًا (score) لكل بُعد + قائمة بالأ turbias.
   ============================================================ */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const baseIdx = args.indexOf('--base');
const BASE = baseIdx >= 0 ? args[baseIdx + 1] : 'http://localhost:3100';

const PAGES = ['/', '/discover', '/pricing', '/faq', '/how-it-works', '/terms', '/privacy', '/sign-in', '/create'];

const findings = [];
const note = (sev, area, text) => findings.push({ sev, area, text });

function score(rows) {
  const max = rows.reduce((s, r) => s + r.max, 0);
  const got = rows.reduce((s, r) => s + r.got, 0);
  return Math.round((got / max) * 100);
}

(async () => {
  const dims = {};

  /* ---------- 1) السرعة والحجم ---------- */
  const t0 = Date.now();
  const home = await fetch(BASE + '/');
  const ttfb = Date.now() - t0;
  const homeHtml = await home.text();
  const homeBytes = Buffer.byteLength(homeHtml);

  const assetSizes = [];
  const assetRe = /(?:src|href)="(\/[^"]+\.(?:css|js|woff2|png|jpg|svg))[^"]*"/g;
  for (const m of homeHtml.matchAll(assetRe)) {
    const url = m[1];
    try {
      const r = await fetch(BASE + url);
      const buf = await r.arrayBuffer();
      assetSizes.push({ url, kb: buf.byteLength / 1024, type: r.headers.get('content-type') || '' });
    } catch { /* تجاهل */ }
  }
  const totalKb = assetSizes.reduce((s, a) => s + a.kb, 0);
  const css = assetSizes.filter(a => a.url.endsWith('.css')).reduce((s, a) => s + a.kb, 0);
  const js = assetSizes.filter(a => a.url.endsWith('.js')).reduce((s, a) => s + a.kb, 0);
  const fonts = assetSizes.filter(a => a.url.endsWith('.woff2')).reduce((s, a) => s + a.kb, 0);

  if (totalKb > 600) note('warn', 'أداء', `حجم الصفحة الكامل ${Math.round(totalKb)}KB (الحد الجيد <600KB)`);
  if (js > 250) note('warn', 'أداء', `حجم JavaScript ${Math.round(js)}KB`);
  if (fonts > 200) note('info', 'أداء', `الخطوط ${Math.round(fonts)}KB (محلي — لا اتصال خارجي)`);

  dims.أداء = [
    { max: 25, got: ttfb < 300 ? 25 : ttfb < 800 ? 18 : 10, label: `TTFB ${ttfb}ms` },
    { max: 25, got: homeBytes < 120000 ? 25 : homeBytes < 250000 ? 18 : 10, label: `HTML ${Math.round(homeBytes / 1024)}KB` },
    { max: 25, got: totalKb < 400 ? 25 : totalKb < 700 ? 18 : 10, label: `أصول ${Math.round(totalKb)}KB` },
    { max: 25, got: fonts < 200 ? 25 : 18, label: `خطوط ${Math.round(fonts)}KB` },
  ];

  /* ---------- 2) SEO ---------- */
  const seo = [];
  const has = (re) => re.test(homeHtml);
  seo.push({ max: 20, got: has(/<title>[^<]{10,}<\/title>/) ? 20 : 0, label: 'عنوان الصفحة' });
  seo.push({ max: 20, got: has(/<meta name="description" content="[^"]{50,}"/) ? 20 : 0, label: 'وصف SEO' });
  seo.push({ max: 15, got: has(/property="og:title"/) && has(/property="og:description"/) ? 15 : 0, label: 'Open Graph' });
  seo.push({ max: 15, got: has(/<meta name="viewport"/) ? 15 : 0, label: 'viewport' });
  seo.push({ max: 15, got: has(/<html lang="[a-z]{2}"/) ? 15 : 0, label: 'lang/dir' });
  seo.push({ max: 15, got: has(/rel="canonical"/) ? 15 : 0, label: 'canonical' });

  // sitemap / robots
  let sitemap = false;
  let robots = false;
  try { sitemap = (await fetch(BASE + '/sitemap.xml')).ok; } catch { /* */ }
  try { robots = (await fetch(BASE + '/robots.txt')).ok; } catch { /* */ }
  seo.push({ max: 15, got: sitemap ? 15 : 0, label: 'sitemap.xml' });
  seo.push({ max: 15, got: robots ? 15 : 0, label: 'robots.txt' });

  // العناوين (h1) لكل صفحة + بنية العناوين
  let h1Issues = [];
  for (const p of PAGES) {
    const html = await (await fetch(BASE + p)).text();
    const h1s = (html.match(/<h1[^>]*>/g) || []).length;
    if (h1s !== 1) h1Issues.push(`${p} (h1=${h1s})`);
    if (!/<meta name="description"[^>]{50,}>/.test(html) && p === '/') h1Issues.push(`${p} بلا وصف`);
  }
  if (h1Issues.length) note('warn', 'SEO', `بنية العناوين: ${h1Issues.join('، ')}`);
  if (!sitemap) note('warn', 'SEO', 'لا يوجد sitemap.xml — ضعف في الفهرسة');
  if (!robots) note('warn', 'SEO', 'لا يوجد robots.txt');
  if (!has(/rel="canonical"/)) note('warn', 'SEO', 'لا يوجد canonical — ازدواجية العنوان محتملة');
  dims.SEO = seo;

  /* ---------- 3) الإتاحة (a11y) ---------- */
  const a11y = [];
  const imgs = [...homeHtml.matchAll(/<img[^>]*>/g)].map(m => m[0]);
  const imgsNoAlt = imgs.filter(i => !/alt=/.test(i)).length;
  const inputs = [...homeHtml.matchAll(/<(input|select|textarea)[^>]*>/g)].map(m => m[0]);
  const inputsNoLabel = inputs.filter(i => {
    if (/type="(hidden|submit|button)"/.test(i)) return false;
    if (/aria-label/.test(i)) return false;
    if (/id="[^"]+"/.test(i)) return true; // يفترض وجود <label for>
    return true;
  }).length;
  const labelFor = (homeHtml.match(/<label[^>]*for="/g) || []).length;

  a11y.push({ max: 20, got: imgsNoAlt === 0 ? 20 : Math.max(0, 20 - imgsNoAlt * 5), label: `صور بلا alt: ${imgsNoAlt}` });
  a11y.push({ max: 20, got: inputsNoLabel === 0 ? 20 : Math.max(0, 20 - inputsNoLabel * 4), label: `حقول بلا تسمية: ${inputsNoLabel}` });
  a11y.push({ max: 15, got: has(/skip|تخطَّ|تخطّ/) ? 15 : 0, label: 'رابط التخطّي' });
  a11y.push({ max: 15, got: has(/aria-live|role="(status|log|alert)"/) ? 15 : 0, label: 'مناطق حيّة (aria-live)' });
  a11y.push({ max: 15, got: has(/<main[\s>]/) ? 15 : 0, label: 'عنصر <main>' });
  const cssSrc = fs.existsSync(path.join(ROOT, 'public', 'css', 'app.css'))
    ? fs.readFileSync(path.join(ROOT, 'public', 'css', 'app.css'), 'utf8') : '';
  a11y.push({ max: 15, got: /:focus-visible/.test(cssSrc) ? 15 : 0, label: 'مؤشّرات التركيز (CSS)' });

  if (imgsNoAlt) note('warn', 'إتاحة', `${imgsNoAlt} صورة بلا alt`);
  if (inputsNoLabel) note('warn', 'إتاحة', `${inputsNoLabel} حقل إدخال بلا تسمية`);
  dims.إتاحة = a11y;

  /* ---------- 4) الأمان ---------- */
  const sec = [];
  const headers = home.headers;
  const h = (n) => (headers.get(n) || '').toLowerCase();
  sec.push({ max: 20, got: h('x-content-type-options').includes('nosniff') ? 20 : 0, label: 'nosniff' });
  sec.push({ max: 15, got: h('x-frame-options') ? 15 : 0, label: 'X-Frame-Options' });
  sec.push({ max: 15, got: h('content-security-policy') ? 15 : 0, label: 'CSP' });
  sec.push({ max: 15, got: h('referrer-policy') ? 15 : 0, label: 'Referrer-Policy' });
  const serverSrc = fs.readFileSync(path.join(ROOT, 'src', 'server.js'), 'utf8');
  const hstsInCode = /Strict-Transport-Security/.test(serverSrc);
  const isProd = process.env.NODE_ENV === 'production';
  sec.push({
    max: 15,
    got: h().includes('max-age') || hstsInCode ? 15 : 0,
    label: isProd ? 'HSTS' : 'HSTS (مفعّل في الإنتاج عبر الكود)',
  });
  sec.push({ max: 20, got: h('permissions-policy') ? 20 : 0, label: 'Permissions-Policy' });
  dims.أمان = sec;

  /* ---------- 5) المحتوى والبنية ---------- */
  const content = [];
  const faq = require(path.join(ROOT, 'src', 'lib', 'faq'));
  content.push({ max: 20, got: faq.FAQ.length >= 40 ? 20 : 10, label: `أسئلة FAQ: ${faq.FAQ.length}` });
  content.push({ max: 20, got: faq.FAQ.every(f => f.en && f.en.q) ? 20 : 10, label: 'ترجمة كاملة للأسئلة' });
  const pagesCount = fs.readdirSync(path.join(ROOT, 'views')).filter(f => f.endsWith('.ejs')).length;
  content.push({ max: 20, got: pagesCount >= 15 ? 20 : 12, label: `صفحات: ${pagesCount}` });
  const chains = require(path.join(ROOT, 'config', 'chains'));
  content.push({ max: 20, got: Object.keys(chains.CHAINS).length >= 5 ? 20 : 12, label: `شبكات: ${Object.keys(chains.CHAINS).length}` });
  content.push({ max: 20, got: fs.existsSync(path.join(ROOT, 'docs', 'DEPLOY.md')) ? 20 : 10, label: 'توثيق النشر' });
  dims.محتوى = content;

  /* ---------- 6) المنتج/التحويل (من الكود) ---------- */
  const prod = [];
  const models = require(path.join(ROOT, 'src', 'models'));
  const fees = require(path.join(ROOT, 'src', 'lib', 'fees'));
  prod.push({ max: 20, got: fees.effectiveTiers().length >= 3 ? 20 : 10, label: 'رسوم متدرّجة' });
  const hasSplitter = fs.existsSync(path.join(ROOT, 'contracts', 'DonationSplitter.sol'));
  prod.push({ max: 20, got: hasSplitter ? 20 : 0, label: 'عقد ذري' });
  const hasAddrCheck = fs.existsSync(path.join(ROOT, 'src', 'lib', 'addresses.js'));
  prod.push({ max: 20, got: hasAddrCheck ? 20 : 0, label: 'فحص العناوين' });
  const hasSig = fs.existsSync(path.join(ROOT, 'src', 'lib', 'signature.js'));
  prod.push({ max: 20, got: hasSig ? 20 : 0, label: 'إثبات الملكية' });
  prod.push({ max: 20, got: fs.existsSync(path.join(ROOT, 'src', 'lib', 'assistant.js')) ? 20 : 0, label: 'مساعد ذكي' });
  dims.منتج = prod;

  /* ---------- التقرير ---------- */
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║              HADIYA — تقييم الموقع آليًا                     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  let total = 0;
  const rows = [];
  for (const [dim, list] of Object.entries(dims)) {
    const s = score(list);
    total += s;
    rows.push([dim, s, list]);
  }
  const overall = Math.round(total / rows.length);
  for (const [dim, s, list] of rows) {
    console.log(`\n■ ${dim}: ${s}/100`);
    for (const item of list) {
      const mark = item.got === item.max ? '✔' : item.got > item.max * 0.5 ? '~' : '✖';
      console.log(`   ${mark} ${item.label}  (${item.got}/${item.max})`);
    }
  }

  console.log(`\n${'─'.repeat(62)}\nالتقييم العام: ${overall}/100\n`);

  if (findings.length) {
    console.log('ملاحظات تستحق العمل:');
    for (const f of findings) {
      const icon = f.sev === 'warn' ? '!' : f.sev === 'info' ? '·' : '×';
      console.log(`  ${icon} [${f.area}] ${f.text}`);
    }
  } else {
    console.log('لا ملاحظات عautomatic.');
  }

  const out = { base: BASE, overall, dims: Object.fromEntries(rows.map(([d, s]) => [d, s])), findings };
  fs.writeFileSync(path.join(ROOT, 'data', 'site-audit.json'), JSON.stringify(out, null, 2), 'utf8');
  console.log('\n→ data/site-audit.json');
})();
