/* يفحص كل الصفحات في الوضعين (عربي/إنجليزي) ويطبع النصوص العربية المتبقية */
const { chromium } = require('playwright');

const BASE = process.env.BASE || 'http://127.0.0.1:3100';
const PATHS = ['/', '/discover', '/pricing', '/faq', '/how-it-works', '/terms', '/privacy', '/sign-in', '/create', '/collector', '/account'];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  for (const lang of ['ar', 'en']) {
    await ctx.addCookies([{ name: 'hadba_lang', value: lang, url: BASE }]);
    for (const p of PATHS) {
      await page.goto(BASE + p, { waitUntil: 'networkidle' }).catch(() => {});
      const res = await page.evaluate(() => {
        const isAr = () => /[\u0600-\u06FF]/;
        const skip = (el) => el.closest('script, style, code, pre, textarea, .mono, .en-label, [data-no-i18n]');
        const texts = [...document.querySelectorAll('body *')]
          .filter(el => el.children.length === 0 && el.textContent.trim() && isAr().test(el.textContent) && !skip(el))
          .map(el => el.textContent.trim().slice(0, 60));
        const attrs = [];
        for (const el of document.querySelectorAll('[placeholder],[title],[aria-label]')) {
          for (const a of ['placeholder', 'title', 'aria-label']) {
            const v = el.getAttribute(a);
            if (v && isAr().test(v)) attrs.push(`${a}=${v.slice(0, 40)}`);
          }
        }
        return {
          lang: document.documentElement.lang,
          dir: document.documentElement.dir,
          texts: [...new Set(texts)],
          attrs: [...new Set(attrs)],
        };
      });
      const n = res.texts.length + res.attrs.length;
      const mark = n === 0 ? 'OK ' : 'LEFTOVERS(' + n + ')';
      console.log(`[${lang}] ${p.padEnd(16)} ${mark} htmlLang=${res.lang}/${res.dir}`);
      if (n) {
        for (const t of res.texts.slice(0, 8)) console.log('    text: ' + t);
        for (const a of res.attrs.slice(0, 5)) console.log('    attr: ' + a);
      }
    }
  }
  await browser.close();
})();
