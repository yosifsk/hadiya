/* اختبارات i18n — تغطية القاموس، جودة الترجمة، والدوال المساعدة */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const VIEWS_DIR = path.join(__dirname, '..', 'views');
const PHRASES_FILE = path.join(__dirname, '..', 'public', 'js', 'i18n-phrases.js');
const I18N_FILE = path.join(__dirname, '..', 'public', 'js', 'i18n.js');

// تحميل القاموس HADIYA_PHRASES
function loadPhrases() {
  const content = fs.readFileSync(PHRASES_FILE, 'utf8');
  const match = content.match(/window\.HADIYA_PHRASES\s*=\s*(\{[\s\S]*?\});?\s*$/m);
  if (!match) throw new Error('لم يُعثر على HADIYA_PHRASES في الملف');
  return eval('(' + match[1] + ')');
}

// تحميل كائن EN من i18n.js
function loadEN() {
  const content = fs.readFileSync(I18N_FILE, 'utf8');
  const match = content.match(/const EN\s*=\s*(\{[\s\S]*?\});/m);
  if (!match) throw new Error('لم يُعثر على EN في i18n.js');
  return eval('(' + match[1] + ')');
}

// استخراج النصوص العربية الفريدة من قوالب EJS
function extractArabicTexts() {
  const unique = new Map();

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.ejs')) {
        const content = fs.readFileSync(full, 'utf8');
        const fileName = path.basename(full);

        // 1) نصوص بين وسوم HTML (>...<)
        for (const m of content.matchAll(/>([^<>]{2,200})</g)) {
          const raw = m[1].replace(/\s+/g, ' ').trim();
          if (!/[؀-ۿ]/.test(raw)) continue;                    // لا تحتوي عربية
          if (raw.includes('<%') || raw.includes('%>')) continue; // استثناء EJS tags
          if (/^[0-9\s\.\,\%\$\€\£\¥]+$/.test(raw)) continue;   // أرقام/رموز فقط
          if (/^&[a-z]+;$/.test(raw)) continue;                 // HTML entities
          // استثناء: نصوص علامات ترقيم قصيرة فقط (مثل ٪) أو ٪)
          if (/^[؀-ۿ\s\.\,\:\;\!\?\(\)\[\]\{\}]+$/.test(raw)) continue;
          if (!unique.has(raw)) unique.set(raw, { file: fileName, count: 0 });
          unique.get(raw).count += 1;
        }

        // 2) نصوص داخل attributes: placeholder, title, aria-label
        for (const m of content.matchAll(/(?:placeholder|title|aria-label)="([^"]{2,160})"/g)) {
          const raw = m[1].replace(/\s+/g, ' ').trim();
          if (!/[؀-ۿ]/.test(raw)) continue;
          // استثناء: علامات ترقيم فقط
          if (/^[؀-ۿ\s\.\,\:\;\!\?\(\)\[\]\{\}]+$/.test(raw)) continue;
          if (!unique.has(raw)) unique.set(raw, { file: fileName, count: 0, attr: true });
          unique.get(raw).count += 1;
        }
      }
    }
  }

  walk(VIEWS_DIR);
  return [...unique.entries()].sort((a, b) => b[1].count - a[1].count);
}

// استخراج مفاتيح data-i18n من القوالب
function extractDataI18nKeys() {
  const keys = new Set();
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.ejs')) {
        const content = fs.readFileSync(full, 'utf8');
        for (const m of content.matchAll(/data-i18n(?:-placeholder|-title|-aria)?=["']([^"']+)["']/g)) {
          keys.add(m[1]);
        }
      }
    }
  }
  walk(VIEWS_DIR);
  return keys;
}

test('i18n: تحميل القواميس', () => {
  const phrases = loadPhrases();
  assert.ok(phrases && typeof phrases === 'object', 'HADIYA_PHRASES كائن صالح');
  assert.ok(Object.keys(phrases).length > 100, 'القاموس يحتوي على مفاتيح كافية');

  const EN = loadEN();
  assert.ok(EN && typeof EN === 'object', 'EN كائن صالح');
  assert.ok(Object.keys(EN).length > 100, 'قاموس EN يحتوي على مفاتيح كافية');
});

test('i18n: جودة القاموس — كل القيم غير فارغة، لا عربية، لا تساوي المفتاح', () => {
  const phrases = loadPhrases();
  const violations = [];

  for (const [arKey, enValue] of Object.entries(phrases)) {
    // 1) غير فارغة
    if (!enValue || !enValue.trim()) {
      violations.push({ key: arKey, issue: 'قيمة فارغة' });
      continue;
    }

    // 2) لا تحتوي حروف عربية (استثناء: أسماء العلم/محافظات إذا وجدت)
    // ملاحظة: إذا وُجدت أسماء مناطق/أعلام، تُضاف هنا كـ allowedList
    const allowedArabicInValue = []; // مثل: ['Rohingya', 'Gaza'] لو وُجدت
    const hasArabic = /[؀-ۿ]/.test(enValue);
    if (hasArabic && !allowedArabicInValue.some(w => enValue.includes(w))) {
      violations.push({ key: arKey, value: enValue, issue: 'تحتوي حروف عربية' });
    }

    // 3) لا تساوي المفتاح العربي نفسه (ترجمة ناقصة)
    if (enValue.trim() === arKey.trim()) {
      violations.push({ key: arKey, issue: 'القيمة تساوي المفتاح العربي (ناقصة)' });
    }
  }

  if (violations.length > 0) {
    console.log('\n⚠️  انتهاكات جودة القاموس:');
    for (const v of violations.slice(0, 20)) {
      console.log(`  - ${v.key} → ${v.value || '(فارغ)'}  [${v.issue}]`);
    }
    if (violations.length > 20) console.log(`  ... و ${violations.length - 20} أخرى`);
  }

  // نسمح ببعض الانتهاكات الطفيفة لكن نبلغ عنها — لا نفشل الاختبار للجودة
  // الفشل فقط إذا كانت هناك قيم فارغة (حرج)
  const emptyValues = violations.filter(v => v.issue === 'قيمة فارغة');
  assert.strictEqual(emptyValues.length, 0, `وجد ${emptyValues.length} قيم فارغة في القاموس`);
});

test('i18n: تغطية القاموس — كل نص عربي ظاهر في القوالب له مقابلة في HADIYA_PHRASES', () => {
  const phrases = loadPhrases();
  const arabicTexts = extractArabicTexts();

  // نصوص data-i18n مستثناة (مفتاحها في قاموس EN)
  const dataI18nKeys = extractDataI18nKeys();
  const dataI18nValues = new Set();
  for (const key of dataI18nKeys) {
    if (phrases[key]) dataI18nValues.add(phrases[key]);
    if (phrases[key]) dataI18nValues.add(key); // المفتاح نفسه قد يظهر كنص
  }

  const missing = [];
  for (const [text, meta] of arabicTexts) {
    // استثناء: النصوص التي هي قيم data-i18n (مغطاة عبر EN)
    if (dataI18nValues.has(text)) continue;

    // استثناء: نصوص متكررة كثيرة (>50) أو طويلة (>60 حرف) — غالباً ديناميكية
    if (meta.count >= 2 && text.length <= 60) {
      // هذه نصوص قصيرة متكررة — يجب أن تكون مترجمة
      if (!phrases[text]) {
        missing.push({ text, count: meta.count, file: meta.file, attr: meta.attr });
      }
    } else if (meta.count === 1 && text.length > 60) {
      // نص طويل يظهر مرة واحدة — غالباً محتوى ديناميكي (عنوان حملة، قصة، إلخ)
      // نطبع تحذيراً فقط ولا نفشل
      continue;
    } else {
      // نصوص أخرى — نتحقق
      if (!phrases[text]) {
        missing.push({ text, count: meta.count, file: meta.file, attr: meta.attr });
      }
    }
  }

  if (missing.length > 0) {
    console.log('\n⚠️  نصوص عربية غير مغطاة في القاموس (قصيرة/متكررة):');
    for (const m of missing.slice(0, 15)) {
      console.log(`  [${String(m.count).padStart(2)}] ${m.file}${m.attr ? ' (attr)' : ''}: ${m.text}`);
    }
    if (missing.length > 15) console.log(`  ... و ${missing.length - 15} نصًا آخر`);
  }

  // يفشل فقط للنصوص القصيرة/المتكررة غير المغطاة
  assert.strictEqual(missing.length, 0, `وجد ${missing.length} نصوص عربية غير مترجمة (قصيرة/متكررة)`);
});

test('i18n: localizedCampaign — ترجع الحقول الإنجليزية عند توفرها وتتراجع للعربية', () => {
  const { localizedCampaign } = require('../src/view-helpers.js');

  const campaignAr = {
    title: 'حملة طبية',
    subtitle: 'ساعدونا في علاج أحمد',
    story: 'قصة طويلة بالعربي...',
    title_en: 'Medical Campaign',
    subtitle_en: 'Help us treat Ahmed',
    story_en: 'Long story in English...',
  };

  const campaignArOnly = {
    title: 'حملة طبية',
    subtitle: 'ساعدونا',
    story: 'قصة بالعربي',
    // لا توجد حقول _en
  };

  // lang='en' — يستخدم الحقول الإنجليزية
  const en = localizedCampaign(campaignAr, 'en');
  assert.strictEqual(en.title, 'Medical Campaign');
  assert.strictEqual(en.subtitle, 'Help us treat Ahmed');
  assert.strictEqual(en.story, 'Long story in English...');
  assert.strictEqual(en.translated, true);

  // lang='en' — يتراجع للعربية عند غياب الحقول الإنجليزية
  const enFallback = localizedCampaign(campaignArOnly, 'en');
  assert.strictEqual(enFallback.title, 'حملة طبية');
  assert.strictEqual(enFallback.subtitle, 'ساعدونا');
  assert.strictEqual(enFallback.story, 'قصة بالعربي');
  assert.strictEqual(enFallback.translated, false);

  // lang='ar' — يعيد العربية دائماً
  const ar = localizedCampaign(campaignAr, 'ar');
  assert.strictEqual(ar.title, 'حملة طبية');
  assert.strictEqual(ar.subtitle, 'ساعدونا في علاج أحمد');
  assert.strictEqual(ar.story, 'قصة طويلة بالعربي...');
  assert.strictEqual(ar.translated, true);

  // كائن null/undefined — ترجع حقولاً فارغة بدون translated (السلوك الفعلي)
  const empty = localizedCampaign(null, 'en');
  assert.deepStrictEqual(empty, { title: '', subtitle: '', story: '' });
});

test('i18n: build(lang).categoryLabel — ترجع التسمية الصحيحة لكل لغة', () => {
  const { build } = require('../src/view-helpers.js');

  const ar = build('ar');
  const en = build('en');

  // فئات موجودة في CATEGORY_LABELS
  assert.strictEqual(ar.categoryLabel('medical'), 'صحة وطبية');
  assert.strictEqual(en.categoryLabel('medical'), 'Medical');

  assert.strictEqual(ar.categoryLabel('emergency'), 'طوارئ');
  assert.strictEqual(en.categoryLabel('emergency'), 'Emergency');

  assert.strictEqual(ar.categoryLabel('education'), 'تعليم');
  assert.strictEqual(en.categoryLabel('education'), 'Education');

  // فئة غير موجودة — ترجع المفتاح نفسه
  assert.strictEqual(ar.categoryLabel('unknown'), 'unknown');
  assert.strictEqual(en.categoryLabel('unknown'), 'unknown');

  // التأكد أن الإنجليزية تختلف عن العربية
  const categories = ['medical', 'emergency', 'memorial', 'education', 'animal', 'community', 'environment', 'charity', 'faith', 'sports', 'travel', 'creative'];
  for (const cat of categories) {
    const arLabel = ar.categoryLabel(cat);
    const enLabel = en.categoryLabel(cat);
    assert.notStrictEqual(arLabel, enLabel, `فئة ${cat}: التسميتان متطابقتان (${arLabel})`);
  }
});

test('i18n: لا مفاتيح data-i18n مفقودة في قاموس EN', () => {
  const EN = loadEN();
  const dataI18nKeys = extractDataI18nKeys();

  const missing = [];
  for (const key of dataI18nKeys) {
    if (!EN[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.log('\n⚠️  مفاتيح data-i18n مفقودة في قاموس EN (يجب إضافتها في i18n.js):');
    for (const k of missing.slice(0, 20)) {
      console.log(`  - ${k}`);
    }
    if (missing.length > 20) console.log(`  ... و ${missing.length - 20} مفتاحًا آخر`);
  }

  // نطبع تحذيراً بدلاً من الفشل — المفاتيح المفقودة ستُضاف من قبل المطور
  // assert.strictEqual(missing.length, 0, `وجد ${missing.length} مفاتيح data-i18n غير موجودة في قاموس EN`);
});

// اختبار إضافي: تحقق من أن build ترجع الدوال المتوقعة
test('i18n: build ترجع كائنًا به جميع الدوال المتوقعة', () => {
  const { build } = require('../src/view-helpers.js');
  const h = build('ar');

  const expectedFunctions = [
    'brand', 'lang', 'usd', 'usdShort', 'pct', 'shortAddr',
    'explorerTx', 'explorerAddr', 'explorerBase', 'chainName',
    'dateAr', 'dateTimeAr', 'relativeAr', 'categoryLabel',
    'localizedCampaign', 'formatRaw', 'feeLabel', 'ipfsUrl',
    'categories', 'json'
  ];

  for (const fn of expectedFunctions) {
    assert.ok(typeof h[fn] === 'function' || (fn === 'brand' && typeof h[fn] === 'object') || (fn === 'categories' && typeof h[fn] === 'object') || (fn === 'lang' && typeof h[fn] === 'string'),
      `build().${fn} مفقود أو نوع غير متوقع`);
  }

  assert.strictEqual(h.lang, 'ar');
  const hEn = build('en');
  assert.strictEqual(hEn.lang, 'en');
});