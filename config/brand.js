/* إعدادات العلامة التجارية — غيّر هذا الملف فقط لتغيير اسم المنصة وشعارها.
   الاسم الافتراضي: هدية / HADIYA (اسم مختلف عن GoFundMe)، والرسم ٩٪ ثابت أيضًا هنا. */

module.exports = {
  // الاسم المعروض (لاتيني + عربي)
  name: 'HADIYA',
  nameAr: 'هدية',
  tagline: 'تبرّع بالعملات الرقمية — المال يوصل مباشرة إلى محفظة الجهة المستفيدة',
  taglineEn: 'Donate with crypto — the money lands directly in the beneficiary wallet',

  // نسبة رسوم المنصة الأساسية (الحد الأقصى): 900 نقطة أساس = 9%
  platformFeeBps: 900,

  // جدول الرسوم المتدرّج حسب قيمة التبرّع بالدولار.
  // كلما زاد التبرّع انخفضت النسبة. الحد الأدنى في العقد هو minFeeBps.
  feeTiers: [
    { maxUsd: 200, bps: 900 },   // حتى ٢٠٠ دولار → ٩٪
    { maxUsd: 300, bps: 700 },   // فوق ٢٠٠ حتى ٣٠٠ → ٧٪
    { maxUsd: 400, bps: 500 },   // فوق ٣٠٠ حتى ٤٠٠ → ٥٪
    { maxUsd: Infinity, bps: 300 }, // فوق ٤٠٠ → ٣٪
  ],

  // الحد الأدنى المسموح به في العقد (٣٪) — يمنع تمرير نسبة صفرية أو خاطئة
  minFeeBps: 300,

  // نموذج الرسوم عند النشر:
  //   'tiered' → ٩٪/٧٪/٥٪/٣٪ حسب المبلغ (الافتراضي)
  //   'flat'   → نسبة ثابتة platformFeeBps لكل تبرّع
  //   'zero'   → ٠٪ (نموذج ه١٠٠٪ يذهب للقضيةه) — انشر العقد بـ min=max=0
  feeMode: 'tiered',

  // العملة المعروضة للأهداف والتقدّم
  displayCurrency: 'USD',

  // روابط قانونية وبلاگ
  supportEmail: 'support@hadiya.example',
  legalEntity: 'HADIYA (Demo entity — replace with your registered company)',
  legalAddress: 'Replace with your registered address',

  // العنوان الافتراضي للـ هكولكتره (محفظة المنصة التي تستقبل ٩٪).
  // يُعاد التحقق منه من قاعدة البيانات (settings.collector_address) عند التشغيل.
  defaultCollectorAddress: '',

  // روابط勘探
  explorers: {
    1: 'https://etherscan.io',
    56: 'https://bscscan.com',
    137: 'https://polygonscan.com',
    8453: 'https://basescan.org',
    84532: 'https://sepolia.basescan.org',
  },

  // رابط صفحة هابدأ حملةه
  createPath: '/create',
};
