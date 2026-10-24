# AGENTS.md — اقرأ هذا أولًا

> هذا الملف هو **بروتوكول التسليم**: إذا انتهى سياق المودل (token) أثناء العمل،
> اقرأ هذا الملف كاملًا ثم تابع من قسم «المتبقي» — لا تبدأ من الصفر.

---

## ١) ما هذا المشروع

**هدية / HADIYA** — منصة تبرّع بالعملات الرقمية (نسخة وظيفية من GoFundMe) في:
`C:\Users\Eng. Yosif\Desktop\pumpcollector-v3.1-free\crowdfund-web3`

- المعتمد **كله على العملات الرقمية** (لا بطاقات).
- **رسوم متدرّجة**: ٩٪ (≤٢٠٠$) ← ٧٪ (≤٣٠٠$) ← ٥٪ (≤٤٠٠$) ← ٣٪ (أعلى ٤٠٠$).
- **٩١–٩٧٪ تصل مباشرة** لمحفظة الجهة المستفيدة في نفس المعاملة (عقد ذكي).
- **لا حضانة أموال**: المنصة لا تحتفظ بأي رصيد.

---

## ٢) التشغيل السريع

```powershell
cd C:\Users\Eng. Yosif\Desktop\pumpcollector-v3.1-free\crowdfund-web3
npm install
Copy-Item .env.example .env      # القيم المحلية موجودة أصلًا في .env
npm start                        # http://localhost:3100
npm test                         # ٥٩+ اختبارًا
npm run seed                     # ١٢ حملة تجريبية
```

بيانات الأدمن (غيّرها قبل النشر):
```
admin / ooKg3yNs2PHffu8NSnxo
```

---

## ٣) خريطة المشروع

```
config/brand.js        الهوية + الرسوم + جدول feeTiers
config/chains.js       الشبكات والرموز (decimals لكل رمز — لا تفترض 6!)
contracts/DonationSplitter.sol   العقد (تقسيم ذرّي + شرائح + منظّم فقط يغيّر العنوان)
src/db.js              SQLite (node:sqlite) + ترحيلات ensureColumn
src/models.js          استعلامات campaigns/donations/ledger…
src/view-helpers.js    دوال العرض (build(lang) → تواريخ/فئات/عملات + localizedCampaign)
src/lib/               chain, price, fees, auth, accounts, users, admin, audit,
                       validate (منع عناوين المحافظ), passwords (Argon2id), async
src/routes/            api.js · admin.js · assistant.js · pages.js
src/services/          donations.js (تحقق التبرعات على السلسلة)
src/seed.js + seed-en.js  بيانات تجريبية (عربي + إنجليزي)
views/                 قوالب EJS (partials: head/header/footer)
public/js/             app.js · admin.js · i18n.js · i18n-phrases.js · i18n-labels.js ·
                       i18n-app.js · assistant.js · theme.js
public/css/app.css     نظام التصميم + الثيمات + التخصيص
tests/                 platform · security · accounts · users · assistant · theme · i18n
docs/DEPLOY.md         النشر (VPS / Cloudflare Tunnel / pm2)
docs/COMPARISON-CHUFFED.md  مقارنة هندسية مع Chuffed.org (نماذج الرسوم + خريطة الميزات + الأولويات)
```

### بنية الترجمة (i18n) — مهمة قبل أي تعديل
| الملف | الدور |
|---|---|
| `public/js/i18n.js` | المحرّك: `applyLanguage` + `translateTree` + `MutationObserver` + `t()` + حدث `hadiya:lang` |
| `public/js/i18n-phrases.js` | قاموس عبارات القوالب (عربي→إنجليزي) — مولَّد يدويًا/مستخرج |
| `public/js/i18n-labels.js` | **مولَّد آليًا** من `config/` — لا تعدّله يدويًا |
| `public/js/i18n-app.js` | نصوص JavaScript المولّدة (لوحة الإدارة، التبرّع، المظهر) |
| `scripts/build-i18n-labels.js` | يعيد توليد `i18n-labels.js` |
| `scripts/i18n-gaps.js` | نصوص القوالب غير المترجمة |
| `scripts/i18n-js-gaps.js` | نصوص JS غير المترجمة |
| `scripts/i18n-keys.js` | مفاتيح `data-i18n` الناقصة في قاموس EN |
| `scripts/i18n-expressions.js` | نصوص عربية داخل `<%= %>` في القوالب |

**قواعد الترجمة:**
1. المحتوى الذي ينشئه المستخدم (عنوان الحملة/قصتها/اسم المنظّم/التحديثات) → `data-no-i18n`
   (يُعرض بنسخته التي رسمها الخادم: `title_en/subtitle_en/story_en`).
2. نصوص الواجهة المولّدة بـ JS → تُترجم تلقائيًا عبر `MutationObserver` + قاموس `i18n-app.js`.
3. اللغة تُحفظ في كوكي `hadba_lang` (يرسم بها الخادم) + `localStorage` `hadba_lang`.
4. `t()` في JS: مفتاح EN يُرجع الإنجليزية دائمًا، ونص عربي يُترجم فقط في الوضع الإنجليزي.

---

## ٤) 🚨 ثوابت أمنية — لا تُكسر أبدًا

1. **العقد**: `setCharity` مسموح **لمنظّم الحملة فقط** — المشرف لا يستطيع (ولا لو سُرق مفتاحه).
2. **حدود الرسوم** `MIN/MAX_FEE_BPS` **immutable** — لا تتغيّر بعد النشر.
3. **محرّر الرسوم في اللوحة** يرفض أي نسبة خارج حدود العقد (400).
4. **حجب عناوين المحافظ** في نصوص الحملات (الخادم ملزم + تحذير في المتصفح).
5. **كلمات المرور**: Argon2id (64MiB×3) + salt + pepper + قفل ١٥د بعد ٥ محاولات.
6. **مقارنة constant-time** لكل مفتاح إدارة.
7. **CSRF** (double-submit) على كل طلب مُعدِّل في `/api/admin/*`.
8. **nonce** يُستهلك بعد التوقيع (منع إعادة التشغيل).
9. **الكوكيز** HttpOnly + SameSite=Lax + Secure في الإنتاج.
10. **سجل التدقيق** `audit_log` لكل إجراء حسّاس (فاعل + IP + قبل/بعد).
11. **ربط المحفظة بالحساب** يتطلّب توقيعًا صالحًا (وإلا ربط أي أحد محفظة غيره).
12. **لا تحقن SQL**: prepared statements فقط. **لا XSS**: EJS يهرّب + `escapeHtml()` في JS.
13. **الأموال على السلسلة هي الحقيقة**: لا تثق بأي رقم يرسله المتصفح.

---

## ٥) ⚠️ قواعد العمل (تعلّمتُها بالخطأ)

- **لا تستخدم PowerShell لتعديل ملف فيه نص عربي** — أفسدت ملفين (`api.js` و `admin.js`).
  استخدم أدوات التحرير المباشرة أو سكربت Node يكتب بـ `UTF8Encoding(false)`.
- بعد أي تعديل على ملفات الواجهة: `node --check <file>` لكل JS.
- `npm test` قبل Declare anything "done".
- لا تغيّر `data/hadba.sqlite` يدويًا (بيانات تجريبية).

---

## ٦) حالة العمل لحظة التسليم

### منجَز ✅
- ✅ بنية كاملة: حملات، تبرعات على السلسلة، لوحة كولكتر، لوحة إدارة كاملة
  (تعديل/حذف/توثيق/تصدير/مستخدمون/إعدادات/فحص سلامة/تدقيق).
- ✅ حساب إدارة (اسم+كلمة مرور Argon2id) + حسابات مستخدمين + دخول بمحفظة.
- ✅ عقد `DonationSplitter` مع **رسوم متدرّجة** و`feeFor()` و`setTiers`.
- ✅ المساعد الذكي: ٦٦ سؤالًا موثقًا، مرادفات، نوايا (تحية/هوية)، لا يخترع جوابًا.
- ✅ **تخصيص المظهر**: ٤ ثيمات + ٨ ألوان تمييز + لون حر + حجم خط + كثافة (localStorage).
- ✅ خط Cairo مستضاف محليًا (خصوصية + سرعة).
- ✅ `.gitignore` يحمي `.env` و `data/`.
- ✅ `assetV` cache-busting لكل الأصول.
- ✅ **تبديل لغة شامل**: كل الصفحات (رئيسية/اكتشاف/حملة/أسئلة/تسعير/إنشاء/كولكتر/إدارة)
   تُرسم بالإنجليزية بالكامل — لا يبقى نص عربي إلا محتوى المستخدم (بلنسخته الإنجليزية).
   - محرّك i18n: قاموس عبارات + `data-i18n` + `window.t()` + `MutationObserver`
     (يترجم ما يولّده JS) + كوكي `hadba_lang` (الخادم يرسم بنفس اللغة).
   - تواريخ/فئات/شبكات/رسوم/عملات → locale-aware على الخادم (`view-helpers.build(lang)`).
   - محتوى الحملات: `title_en/subtitle_en/story_en` (نموذج إنشاء + ١٢ حملة تجريبية).
- ✅ **الترويسة (الناف بار) متناسقة مع كل الثيمات**: خلفية زجاجية `color-mix` من `--surface`
   (لا أبيض ثابت)، شعار بلون التمييز، ظلّ أزرار `--brand`، تبويب نشط بمؤشّر.
- ✅ **شبكة TRON (TRC20)**: `config/chains.js` ← id `728126428`، USDT بـ٦ خانات
   (عقد USDT الرسمي: `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t` / `0x41a614f8…`).
- ✅ **وحدة فحص العناوين** `src/lib/addresses.js`: كشف EVM ↔ TRON، فحص Base58Check وEIP-55،
   وتحويل base58 ⇄ hex41، ورسائل عربية واضحة عند عدم التطابق (TRC20 في خانة BNB…).
- ✅ **تدفّق التوقيع الجديد**: لا تُشترط محفظة موقّعة لإنشاء الحملة؛ التوقيع يُطلب
   (أ) عند زر الحفظ (اختياري)، أو (ب) بعد موافقة الإدارة → حالة `awaiting_signature`
   → يوقّع المنظّم → تُعاد للمراجعة النهائية. `src/lib/signature.js` يدعم EIP-191 وTRON.
- ✅ **عنوان الاستلام** مع إثبات ملكية بتوقيع (حقول `delivery_address`/`delivery_verified`).
- ✅ **مهلة جلسة الحساب ١٥ دقيقة خمول** مع تمديد تلقائي عند كل طلب نشط
   (`auth.USER_SESSION_IDLE_MS`) — تصفّح الأقسام بلا انقطاع.
- ✅ **سكربت فحص شامل**: `scripts/e2e-check.js` (٧٠ فحصًا: حساب ← ربط ← حملة ← سلامة بيانات ←
   الترجمة + **تقرير الصعوبات**) و`scripts/run-tests.js` (تشغيل الاختبار تلو تلو).
- ✅ **مستويات الأثر (Impact Levels)**: جدول `impact_levels` (مبلغ ↔ نتيجة ملموسة)،
   محرّر في نموذج الإنشاء (مع «اقترح من شرائح الرسوم»)، بطاقات في صفحة الحملة (الضغط يحدّد المبلغ
   وتعرض نسبة الرسوم الفعلية)، وتحرير في لوحة الإدارة.
- ✅ **نسيان كلمة المرور**: `password_resets` (رمز ٣٢ بايت، أحادي الاستخدام، ٣٠ دقيقة)؛
   لا تسريب لوجود الحساب؛ بعد التغيير تُنهى كل الجلسات؛ في التطوير يُطبع الرابط في السجل.
- ✅ **تسجيل الدخول بجوجل**: `src/lib/google.js` — تحقّق RS256 مقابل JWKS الرسمية
   (iss/aud/exp/email_verified) بلا اعتماديات جديدة؛ يُفعَّل بإضافة `GOOGLE_CLIENT_ID` إلى `.env`
   (وإلا فالمسار يعيد 503 بوضوح). الحساب الجديد يُنشأ تلقائيًا، والحساب الحالي يُربط به.
- ✅ **بيانات التجربة**: بطاقة «بيانات التجربة» في صفحة الدخول + زر «تعبئة تلقائية»،
   وزر «توليد كلمة مرور قوية» في صفحة التسجيل.
- ✅ **٩٨ اختبارًا تمر** (`npm test`) — منها `tests/i18n.test.js` و`tests/addresses.test.js`
   و`tests/auth-flow.test.js`.

- ✅ **تجهيز النشر على Render**:
  - `Dockerfile` (node:24-slim + tini + healthcheck) + `.dockerignore`
  - `render.yaml` (Blueprint: docker runtime، plan starter، قرص دائم `/var/data` 1GB، env vars)
  - `scripts/render-prep.js` (توليد أسرار + فحص ما قبل النشر + خطوات)
  - `scripts/github-upload.js` (رفع إلى GitHub **بدون git** عبر GitHub API)
  - `scripts/prod-smoke.js` (محاكاة بيئة الإنتاج: ٩/٩ فحوص ناجحة)
  - `docs/DEPLOY.md` § ٨) المسار D — Render
  - ⚠️ **قاعدة البيانات**: SQLite على القرص الدائم ⇒ نسخة واحدة فقط (لا Scaling على Render).
### نسخ احتياطي 📦
- Git غير مثبّت على الجهاز → نسخة مؤرشفة في:
  `C:\Users\Eng. Yosif\Desktop\pumpcollector-v3.1-free\_backups\hadiya-<YYYYMMDD-HHMM>.zip`
  (بدون `node_modules` و `data` و `.env`). أنشئ نسخة بعد كل جولة عمل كبيرة:
  `tar -a -c -f <dest> --exclude=node_modules --exclude=./data --exclude=./.env .`

### متبقٍ 📋
- [ ] **قرار تسعير**: 9٪ للشريحة الأولى أعلى من 4.9٪ عند Chuffed → ضع 5-7٪
      (العقد يسمح: `MIN_FEE_BPS=300`).
- [ ] **إعداد `GOOGLE_CLIENT_ID`** في `.env` لتفعيل «تسجيل الدخول بجوجل»
      (أوّلًا: أضف https://<domain> إلى Authorized JavaScript origins في Google Cloud).
- [ ] **خادم بريد** للاستعادة (حاليًا الرابط يُطبع في السجل/الواجهة في وضع التطوير).
- [ ] تغيير `ADMIN_KEY`/`ADMIN_PASSWORD` قبل النشر + `PASSWORD_PEPPER` جديد.
- [ ] توليد `public/js/i18n-labels.js` بعد أي تعديل في `config/` أو الفئات.
- [ ] عرض حالة التوقيع (موقّع/بانتظار) في جدول لوحة الإدارة.
- [ ] زر «توقيع وإرسال للمراجعة» يظهر للمنظّم في `/account` أيضًا.
- [ ] Regular Giving (تبرّع شهري) — أكبر ميزة ناقصة بعد Chuffed.

---

## ٧) بروتوكول "التوكن خلص" (اقرأه وطبّقه)

إذا انتهى سياقك ولم يكتمل العمل:

1. اقرأ هذا الملف.
2. `cd` إلى مجلد المشروع، شغّل `npm test` → إن فشل، أول ملف فاشل هو نقطة البداية.
3. شغّل `node scripts/i18n-gaps.js` و `node scripts/i18n-js-gaps.js` و `node scripts/i18n-keys.js`
   → تطبع النصوص غير المترجمة (نقاط ب).
4. أكمل من قائمة «متبقٍ» أعلاه.
5. عند الانتهاء: `npm test` + تحديث `README.md` + نسخة احتياطية + لخّص في ١٠ نقاط.

**بديل المودل**: شغّل مودلًا بديلًا بالتوازي مع تمرير هذه الحالة كاملة:
`subagent(agent='general', model='opencode/glm-5.3-flash-free', background=true)`.
(ملاحظة: `deepseek-v4.1-flash-free` اصطدم بـ rate limit مرتين — جرّب مودلًا آخر.)

### ⚠️ أخطاء ارتُكبت في هذه الجلسة (لا تكرّرها)
- `PowerShell` بطيء/معلّق في هذا الجهاز: `Get-NetTCPConnection` و `netstat` علّقَا الـ shell.
  استخدم `Get-Process node` لإيقاف السيرفر، و `Invoke-WebRequest` للفحص.
- الخلط بين `console.log` وترميز الطرفية: النصوص العربية تظهر مشوّهة في مخرجات PowerShell —
  لا تعتمد عليها؛ اقرأ الملفات بـ `read` أو اكتبها إلى ملف UTF-8 واقرأه.
- `edit` قد لا يطابق بعض النصوص العربية (اختلاف ترتيب المحارف) → استخدم نصًا ASCII كمرساة
  (مثل سطر CSS بالإنجليزية) أو سكربت Node يكتب الملف.
