/* ============================================================
   HADIYA — قاموس عبارات (عربي → إنجليزي)
   يطبّقه محرّك i18n.js تلقائيًا على أي نصّ يطابق تمامًا،
   فيتغيّر كل نص الواجهة عند تبديل اللغة دون تعديل القوالب.
   ============================================================ */

window.HADIYA_PHRASES = {
  // ===== ترويسة وتذييل =====
  'الحملة': 'Campaign',
  'التاريخ': 'Date',
  'تحديث': 'Refresh',
  'الرسوم': 'Fees',
  'الهدف': 'Goal',
  'يصل إلى الجهة المستفيدة': 'Goes to the beneficiary',
  'رسوم المنصة': 'Platform fee',
  'بانتظار المراجعة': 'Pending review',
  'الحالة': 'Status',
  'اسم المستخدم': 'Username',
  'دخول': 'Sign in',
  'حفظ': 'Save',
  'جارٍ التحميل…': 'Loading…',
  'الشبكة': 'Network',
  'سياسة الخصوصية': 'Privacy policy',
  'العودة للرئيسية': 'Back to home',
  'ابدأ حملة': 'Start a fundraiser',
  'نشطة': 'Active',
  'المحصّل': 'Raised',
  'إجراءات': 'Actions',
  'لوحة الحملة': 'Campaign dashboard',
  'المبلغ': 'Amount',
  'كلمة المرور': 'Password',
  'حساب جديد': 'New account',
  'المبلغ الإجمالي': 'Gross amount',
  'لوحة الكولكتر': 'Collector dashboard',
  'اكتشف الحملات': 'Discover campaigns',
  'حسابي': 'My account',
  'هويتك على المنصة': 'Your identity on the platform',
  'حملاتي': 'My campaigns',
  'المتبرّعون': 'Donors',
  'مرفوضة': 'Rejected',
  'المعاملة': 'Transaction',
  'مؤكد': 'Confirmed',
  'بانتظار التأكيد': 'Pending confirmation',
  'فشل': 'Failed',
  'مفتاح الإدارة': 'Admin key',
  'دخول بتوقيع المحفظة': 'Sign in with wallet',
  'فحص السلامة': 'Integrity check',
  'الكل': 'All',
  'محفظة الكولكتر': 'Collector wallet',
  'القصة': 'Story',
  'الشفافية': 'Transparency',
  'نشر': 'Publish',
  'محفظة الجهة المستفيدة (تستقبل ٩١٪)': 'Beneficiary wallet (receives 91%)',
  'رقم الحملة داخل العقد': 'Campaign id inside the contract',
  'تبرّع': 'Donate',
  'مموّل': 'funded',
  'عدد التبرعات': 'Donation count',
  'طريقة التحويل': 'Settlement method',
  'العملة': 'Currency',
  'رسوم المنصة (٩٪)': 'Platform fee (9%)',
  'تبرّع مؤكد': 'Confirmed donation',
  'رسوم المنصة (متدرّجة حتى ٩٪)': 'Platform fee (tiered, up to 9%)',
  'لا توجد بيانات بعد.': 'No data yet.',
  'الإجمالي': 'Total',
  'رسوم ٩٪': '9% fee',
  'صافي ٩١٪': 'Net 91%',
  'الأسئلة الشائعة': 'Frequently asked questions',
  '٩١٪': '91%',
  '٩٪': '9%',
  'كيف تعمل المنصة': 'How the platform works',
  'كيف تعمل': 'How it works',
  'الشروط والأحكام': 'Terms and conditions',
  'حتى $': 'up to $',
  'فوق $': 'above $',
  'الشروط': 'Terms',
  'أنشئ حسابك': 'Create your account',
  'الخصوصية': 'Privacy',
  'الصفحة غير موجودة.': 'Page not found.',
  'محفظة': 'wallet',
  'خروج': 'Log out',
  'اربط محفظتك': 'Link your wallet',
  'ربط محفظة': 'Link a wallet',
  'اربط': 'Link',
  'محفظتك مرتبطة بهذا الحساب:': 'Your wallet is linked to this account:',
  '— وهي مالك حملاتك على السلسلة.': ' — it owns your campaigns on-chain.',
  'هذا العنوان هو حسابك: به تملك حملاتك، وبه يوقّع تغيير محفظة الجهة المستفيدة (لا يستطيع غيرك ذلك)، وبه تظهر تبرعاتك. لا توجد كلمة مرور ولا بريد — فقط محفظة.':
    'This address is your account: it owns your campaigns, it signs any change of the beneficiary wallet (nobody else can), and it shows your donations. No password, no email — just a wallet.',
  'المحصّل في حملاتي': 'Raised in my campaigns',
  'تبرّع مني': 'My donations',
  'الحملات الموثّقة': 'Verified campaigns',
  'لا توجد حملات بعد. ابدأ أول حملة — تُرسل إلى قائمة المراجعة ثم تُنشر.':
    'No campaigns yet. Start the first one — it goes to the review queue, then gets published.',
  'تبرّعاتي': 'My donations',
  'لم تتبرّع بعد عبر هذه المنصة.': 'You have not donated through this platform yet.',
  'دخول المشرف': 'Admin sign-in',
  'اللوحة محميّة بثلاث طرق: حساب باسم مستخدم وكلمة مرور، أو مفتاح إدارة، أو توقيع محفظة موقّعة.':
    'The panel is protected three ways: an account with username and password, an admin key, or a signed wallet.',
  'حساب (اسم مستخدم + كلمة مرور)': 'Account (username + password)',
  'توقيع المحفظة': 'Wallet signature',
  'المفتاح يُقارن بمقارنة constant-time. بعد الدخول يُحفظ في كوكي HttpOnly ويُحذف من العنوان.':
    'The key is compared in constant time. After sign-in it is stored in an HttpOnly cookie and removed from the URL.',
  'سجّل الدخول بتوقيع محفظتك من': 'Sign in with your wallet from',
  'صفحة الدخول': 'the sign-in page',
  'إذا كان عنوانك ضمن قائمة المشرفين. التوقيع لا يكلّف أي رسوم ولا يغيّر أي رصيد.':
    'if your address is on the admin list. The signature costs no fees and changes no balance.',
  'لا ترسل المفتاح أو كلمة المرور عبر رابط أو رسالة. كل محاولة دخول أو إجراء إداري يُسجَّل في سجل التدقيق.':
    'Never send the key or password through a link or a message. Every sign-in attempt and admin action is written to the audit log.',

  // ===== لوحة الإدارة =====
  'لوحة الإدارة': 'Admin panel',
  'مسجّل الدخول كـ': 'Signed in as',
  'كل إجراء حسّاس هنا يُسجَّل في سجل التدقيق. تغيير محفظة الجهة المستفيدة **غير ممكن من هنا** — يجب أن يوقّعه **منظّم الحملة** في محفظته (العقد يفرض ذلك على مستوى السلسلة).':
    'Every sensitive action here is written to the audit log. Changing a beneficiary wallet is NOT possible from here — the campaign organizer must sign it in their own wallet (the contract enforces this on-chain).',
  'نظرة عامة': 'Overview',
  'مراجعة الحملات': 'Review campaigns',
  'قاعدة البيانات': 'Database',
  'سجل التدقيق': 'Audit log',
  'الأمان': 'Security',
  'العقد على السلسلة': 'On-chain contract',
  'الحملات': 'Campaigns',
  'التبرعات': 'Donations',
  'الحدود على السلسلة (immutable)': 'On-chain bounds (immutable)',
  'الشرائح الفعّالة الآن': 'Effective tiers now',
  'تطبيق على السلسلة': 'Apply on-chain',
  'الشرائح على السلسلة تُضبط في وحدة الرمز عبر': 'On-chain tiers are set in token units via',
  '. بعد الحفظ شغّل:': '. After saving run:',
  'تعديل شرائح الرسوم': 'Edit fee tiers',
  'استعادة الافتراضي': 'Reset to default',
  'لا يمكن تجاوز حدود العقد (min/max immutable). تغيير الشرائح يتطلّب تشغيل':
    'You cannot exceed the contract bounds (min/max immutable). Changing tiers requires running',
  'بعد الحفظ.': 'after saving.',
  'موقوفة': 'Paused',
  'مغلقة': 'Closed',
  'محفظة المستفيد': 'Beneficiary wallet',
  'المنظّم': 'Organizer',
  'إحصاءات القاعدة': 'Database stats',
  'تحميل': 'Load',
  'تصدير CSV': 'Export CSV',
  'تشغيل الفحص': 'Run check',
  'الوقت': 'Time',
  'الفاعل': 'Actor',
  'الإجراء': 'Action',
  'الجلسات النشطة': 'Active sessions',
  'إلغاء كل الجلسات': 'Revoke all sessions',
  'تدوير مفتاح الإدارة': 'Rotate admin key',
  'مفتاح جديد (١٦ حرفًا على الأقل)': 'New key (at least 16 characters)',
  'تدوير': 'Rotate',
  'حسابات الإدارة': 'Admin accounts',
  'إنشاء + توليد كلمة مرور': 'Create + generate password',
  'تغيير كلمة مرور حسابي': 'Change my password',
  'كلمة المرور الحالية': 'Current password',
  'كلمة المرور الجديدة': 'New password',
  'المستخدمون': 'Users',
  'إعدادات المنصة': 'Platform settings',
  'مثبّتة (immutable) داخل العقد — تغييرها هنا لا يغيّر العقد.':
    'Frozen (immutable) inside the contract — changing it here does not change the contract.',
  'عنوان المشرف': 'Owner address',
  'محافظ المشرفين': 'Admin addresses',
  'قائمة العناوين (مفصولة بفواصل)': 'Address list (comma separated)',
  'هذه العناوين وحدها تستطيع الدخول بلوحة الإدارة بتوقيع المحفظة، حتى لو سُرق مفتاح الإدارة.':
    'Only these addresses can sign in with a wallet, even if the admin key leaks.',

  // ===== صفحة الحملة =====
  'هذه الحملة قيد المراجعة ولم تُنشر بعد للعامة. تظهر للمتابعين الموقّعين فقط.':
    'This campaign is under review and is not published to the public yet.',
  'رُفضت هذه الحملة من قبل فريق المراجعة.': 'This campaign was rejected by the review team.',
  'أُغلقت هذه الحملة — لم تعد تقبل تبرعات.': 'This campaign is closed and no longer accepts donations.',
  'موثّقة': 'Verified',
  'مصرّح به ذاتيًا': 'Self-declared',
  'ينظّم الحملة': 'Organizes the campaign',
  'التحديثات': 'Updates',
  'التعليقات': 'Comments',
  'نسخة من هذه القصة محفوظة على IPFS — يمكن قراءتها حتى لو تغيّر الموقع:':
    'A copy of this story is pinned on IPFS — it stays readable even if the site changes:',
  'لا توجد تحديثات بعد.': 'No updates yet.',
  'لا توجد تعليقات بعد — كن أول الداعمين.': 'No comments yet — be the first supporter.',
  'أين تذهب أموالك': 'Where your money goes',
  'كل تبرّع يمرّ بمعاملة واحدة على الشبكة؛ ولا يمرّ أي مبلغ في حساب المنصة.':
    'Every donation is one on-chain transaction; no funds ever sit in a platform account.',
  'رسوم المنصة ٩٪ تُثبَّت داخل العقد ولا يمكن تغييرها بعد النشر.':
    'The 9% fee is frozen inside the contract and cannot be changed after deployment.',
  'قيمة المنصة محفوظة في متغيّر': 'The platform wallet is an immutable variable',
  'داخل العقد.': ' inside the contract.',
  'كل تبرّع يولّد حدثًا علنيًا يمكن لأي شخص مراجعته على المستكشف.':
    'Every donation emits a public event anyone can check on an explorer.',
  'عرض على المستكشف': 'View on explorer',
  'محفظة الكولكتر (تستقبل ٩٪)': 'Collector wallet (receives 9%)',
  'عقد المقسّم (DonationSplitter)': 'Splitter contract (DonationSplitter)',
  'رسوم العقد على السلسلة': 'Contract fee on-chain',
  'محفظة الكولكتر في العقد': 'Collector in contract',
  'الرصيد الفعلي في محفظة الجهة المستفيدة': 'Actual balance in the beneficiary wallet',
  'الرصيد لا يعزل تبرعات هذه الحملة عن أرصدة سابقة — راجع سجل التبرعات أدناه.':
    'The balance does not isolate this campaign from older funds — check the donation log below.',
  'آخر التبرعات': 'Recent donations',
  'لا توجد تبرعات مؤكدة بعد. كن أول الداعمين.': 'No confirmed donations yet. Be the first supporter.',
  'السعر بالدولار غير متاح الآن — راجع المبالغ الأصلية بالأسفل':
    'USD price unavailable right now — check the raw amounts below',
  'مجمّع من': 'Raised from',
  'تبرّع الآن': 'Donate now',
  'الحملة مغلقة': 'Campaign closed',
  'رسوم المنصة (أقصى نسبة)': 'Platform fee (max rate)',
  'الرسوم متدرّجة تنخفض مع زيادة المبلغ': 'Tiered fees — the rate drops as the amount grows',
  '٩٪ ← ٧٪ ← ٥٪ ← ٣٪': '9% → 7% → 5% → 3%',
  'تُخصم داخل نفس المعاملة على السلسلة — لا تُدفع من حسابك لاحقًا.':
    'Deducted inside the same on-chain transaction — it is never charged later from your account.',
  'حدود الشرائح محفوظة داخل العقد بوحدة الرمز وقت ضبطها؛ فهي مطابقة للدولار مع USDC، وقيمتها بالدولار قد تنزلق مع تغيّر سعر الأصول المتقلّبة (يُعاد ضبطها دوريًا).':
    'Tier thresholds are stored in the contract in token units at the time they were set. They track USD exactly for USDC, and may drift with the price of volatile assets (refreshed periodically).',
  'الرموز المدعومة': 'Supported tokens',
  'يتم الدفع على شبكة': 'Payment happens on the network',
  'وتُحوَّل مباشرة إلى محفظة الجهة المستفيدة.': ' and is sent straight to the beneficiary wallet.',
  'معلومات الحملة': 'Campaign facts',
  'أُنشئت': 'Created',
  'مشاركة': 'Share',
  'نسخ الرابط': 'Copy link',
  'نسخ رابط الصفحة': 'Copy page URL',
  'تبرّع بالحملة': 'Donate to this campaign',
  'اختر المبلغ': 'Choose an amount',
  'يصل إلى المحفظة': 'Lands in the wallet',
  'اسمك (يظهر للداعمين)': 'Your name (shown to supporters)',
  'رسالة للمطمئنين (اختياري)': 'Message (optional)',
  'أخفِ اسمي (يظهر "داعم مجهول")': 'Hide my name (shown as "anonymous supporter")',
  'ادفع الآن': 'Pay now',
  '⚠️ مدفوعات العملات الرقمية غير قابلة للاسترداد. تحقّق من العنوان والمبلغ قبل التأكيد.':
    '⚠️ Crypto payments cannot be refunded. Verify the address and amount before confirming.',

  // ===== لوحة الكولكتر =====
  'كل ما وصل إلى المنصة والجوهات المستفيدة — من السلسلة مباشرة':
    'Everything that reached the platform and the beneficiaries — read straight from the chain',
  'إجمالي ما وصل (كل الحملات)': 'Total raised (all campaigns)',
  'محصّلة داخل معاملة التبرّع': 'Collected inside the donation transaction',
  'صافي الجوهات المستفيدة (٩١٪)': 'Net to beneficiaries (91%)',
  'ذهب مباشرة إلى المحافظ': 'Went directly to the wallets',
  'رسوم غير محصّلة': 'Unsettled fees',
  'تبرعات مباشرة تحتاج تحصيلًا': 'Direct donations that need collecting',
  'هذه هي المحفظة التي يستقبل العقد فيها حصة ٩٪. العنوان مثبّت داخل العقد ولا يمكن تغييره.':
    'This is the wallet the contract sends the 9% to. The address is frozen inside the contract and cannot be changed.',
  'عقد المقسّم': 'Splitter contract',
  'منشور على: Base / Base Sepolia. نسبة الرسوم ثابتة (900 bps = ٩٪) بعد النشر.':
    'Deployed on: Base / Base Sepolia. The fee rate is fixed (900 bps = 9%) after deployment.',
  'الأرصدة الحيّة': 'Live balances',
  'جارٍ القراءة من السلسلة…': 'Reading from the chain…',
  'توزيع التبرعات على الشرائح': 'Donations by fee tier',
  'نسبة الرسوم': 'Fee rate',
  'قائمة المراجعة': 'Review queue',
  'محفظة الجهة المستفيدة': 'Beneficiary wallet',
  'المحصّل حسب الرمز': 'Raised by token',
  'الرمز': 'Token',
  'حسب الحملة': 'By campaign',
  'دفتر المنصة': 'Platform ledger',
  'النوع': 'Type',
  'ملاحظة': 'Note',
  'لا توجد حركات بعد.': 'No movements yet.',

  // ===== إنشاء حملة =====
  'ابدأ حملة تبرّع': 'Start a fundraiser',
  'لا تحتاج محفظة من طرفنا — المال يذهب من محفظة المتبرّع مباشرة إلى محفظة الجهة المستفيدة. ستحتاج عنوان محفظة الجهة المستفيدة حتى يصلك المال.':
    'You do not need a wallet with us — the money goes from the donor wallet directly to the beneficiary wallet. You will need the beneficiary wallet address so the money reaches you.',
  'منظّم الحملة (مالكها على السلسلة):': 'Campaign organizer (its owner on-chain):',
  '— بهذا العنوان وحده تستطيع لاحقًا تغيير محفظة الجهة المستفيدة.':
    '— with this address alone you can later change the beneficiary wallet.',
  'عنوان الحملة': 'Campaign title',
  'سطر واحد يشرح الحالة': 'One line describing the situation',
  'الوصف نصّي فقط: لا يمكن وضع أي عنوان محفظة (0x…) في العنوان أو السطر أو القصة. عنوان المحفظة يُكتب في خانتها أدناه.':
    'Text only: no wallet address (0x…) may appear in the title, subtitle or story. The wallet address goes in its own field below.',
  'الهدف بالدولار': 'Goal in USD',
  'الفئة': 'Category',
  'الرمز المفضّل': 'Preferred token',
  'عنوان EVM صحيح (0x… 40 خانة). كل مبلغ يتبرّع به يصل إلى هذا العنوان مباشرة.':
    'A valid EVM address (0x… 40 chars). Every donation amount lands directly on this address.',
  'اسم المنظّم': 'Organizer name',
  'الدولة': 'Country',
  'رابط صورة الغلاف (اختياري)': 'Cover image URL (optional)',
  'لون شريط التقدّم': 'Progress bar color',
  'أخضر': 'Green',
  'كهرماني': 'Amber',
  'أزرق': 'Blue',
  'وردي': 'Rose',
  'كل حملة جديدة تُرسل إلى قائمة المراجعة، ولا تظهر للعامة ولا تقبل تبرعات إلا بعد موافقة فريق المنصة. التوثيق الكامل (شارة «موثّق») يتطلّب مراجعة مستندية إضافية.':
    'Every new campaign goes to the review queue and is neither listed publicly nor able to receive donations until the platform team approves it. Full verification (the "verified" badge) needs an extra document review.',
  'يُمنع وضع أي عنوان محفظة داخل نص الحملة (العنوان أو السطر أو القصة أو التحديثات). العنوان يُوضع في خانة «محفظة الجهة المستفيدة» أدناه فقط، ويظهر للجميع في صفحة الحملة للتحقق.':
    'Putting any wallet address inside the campaign text (title, subtitle, story or updates) is not allowed. The address belongs only in the beneficiary wallet field below, where everyone can verify it on the campaign page.',
  'انشر الحملة': 'Publish campaign',

  // ===== لوحة المنظّم =====
  'عرض الصفحة العامة': 'View public page',
  'المحصّل (مؤكد)': 'Raised (confirmed)',
  'تُحصل في نفس معاملة التبرّع': 'Collected inside the donation transaction',
  'الصافي للجهة المستفيدة': 'Net to beneficiary',
  'استقبل أموالك هنا': 'Funds land here',
  'جارٍ قراءة الرصيد…': 'Reading balance…',
  'تحويل عبر العقد الذكي': 'Transfer through the smart contract',
  'التحويل مباشر إلى محفظة الجهة المستفيدة. رسوم المنصة ٩٪ تُسجَّل كـ«غير محصّلة» وتُحصَّل من المنصة على المنصة.':
    'The transfer goes straight to the beneficiary wallet. The 9% platform fee is recorded as "unsettled" and must be collected separately.',
  'أضف تحديثًا': 'Post an update',
  'سجل التبرعات': 'Donation log',
  'لا توجد تبرعات بعد.': 'No donations yet.',
  'الداعم': 'Donor',
  'الصافي': 'Net',
  'النسبة': 'Rate',

  // ===== اكتشاف =====
  'كل الفئات': 'All categories',
  'الأحدث': 'Newest',
  'الأعلى هدفًا': 'Largest goal',
  'الأقرب للهدف': 'Closest to goal',
  'بحث': 'Search',
  'نتيجة': 'results',
  'لا توجد حملات مطابقة. جرّب فئة أخرى أو ابدأ حملتك بنفسك.':
    'No matching campaigns. Try another category or start your own.',
  'تبرّعات': 'donations',
  'هدف': 'goal',

  // ===== الرئيسية =====
  'تبرّع بالعملات الرقمية': 'Crypto donations',
  'كل تبرّع يذهب إلى محفظة الجهة المستفيدة مباشرة': 'Every donation goes straight to the beneficiary wallet',
  'منصة تبرّع مبنية على(blockchain): اختر الحملة، اربط محفظتك، وادفع بـ ETH أو USDC. المقسّم الذكي يحوّل':
    'A blockchain donation platform: pick a campaign, connect your wallet, and pay with ETH or USDC. The smart splitter sends',
  'إلى الجهة المستفيدة و': ' to the beneficiary and',
  'إلى المنصة داخل نفس المعاملة.': ' to the platform in the same transaction.',
  'ابدأ حملتك': 'Start your campaign',
  'إجمالي ما وصل': 'Total raised',
  'حملة نشطة': 'Active campaigns',
  'كيف يُقسَّم كل تبرّع': 'How each donation is split',
  'الرسوم متدرّجة: كلما زاد المبلغ انخفضت النسبة': 'Tiered fees: the bigger the amount, the lower the rate',
  'إلى محفظة الجهة المستفيدة': ' to the beneficiary wallet',
  'مجموع ما يصل فعليًا': 'Total delivered',
  'حتى $200 → 9%': 'up to $200 → 9%',
  'الحساب يتم داخل عقد': 'The split happens inside the open-source',
  'المفتوح المصدر؛ لا تلمس أموالك إلا محفظة المتبرّع ومحفظتا الجهة المستفيدة والمنصة.':
    ' contract; your funds only ever touch your wallet, the beneficiary wallet and the platform wallet.',
  'التفاصيل التقنية': 'Technical details',
  'جدول الرسوم': 'Fee table',
  'حملات تحتاج دعمك': 'Campaigns that need support',
  'آخر الحملات المنشورة — كل الأرقام مؤكَّدة من السلسلة':
    'Recently published — every number confirmed on-chain',
  'عرض الكل': 'View all',
  'لا توجد حملات بعد. ابدأ أول حملة الآن.': 'No campaigns yet. Start the first one now.',
  'من': 'of',
  'تصفّح حسب الفئة': 'Browse by category',
  'اختر القطاع الأقرب لقضيتك': 'Pick the sector closest to your cause',
  'ثلاث خطوات واضحة، وكل خطوة قابلة للتحقق على السلسلة': 'Three clear steps, each verifiable on-chain',
  'الشرح الكامل': 'Full guide',
  'اختر الحملة': 'Choose a campaign',
  'تصفّح حسب الفئة واقرأ القصة. كل حملة تعرض محفظة الجهة المستفيدة وعنوانها على الشبكة — افحصها قبل أن تتبرّع.':
    'Browse by category and read the story. Every campaign shows the beneficiary wallet and its network — check it before you donate.',
  'اربط محفظتك وادفع': 'Connect and pay',
  'ادفع بـ ETH أو USDC. للعملات التي تحتاج موافقة، خطوة approve منفصلة قبل التحويل — كل شيء ظاهر لك قبل التأكيد.':
    'Pay with ETH or USDC. Tokens that need approval take one extra approve step — everything is shown before you confirm.',
  'تابع ما يصل': 'Track what arrives',
  'بعد التأكيد على السلسلة تظهر المعاملة في صفحة الحملة ولوحة الكولكتر، مع رابط مستكشف مستقل يمكن التحقق منه بنفسك.':
    'Once confirmed on-chain, the transaction appears on the campaign page and the collector dashboard, with an independent explorer link.',
  'مفتاحك لا يغادر جهازك': 'Your key never leaves your device',
  'نطلب توقيع رسالة واحدة فقط لتسجيل الدخول. لا نطلب أي Seeds ولا نخزّن أي مفاتيح خاصة على الخادم.':
    'We ask for a single message signature to sign in. We never ask for seeds and never store private keys.',
  'الأرقام من السلسلة': 'Numbers come from the chain',
  'المبالغ تُقرأ من أحداث العقد بعد تأكيد المعاملة، لا من أرقام يرسلها المتصفح.':
    'Amounts are read from contract events after confirmation, never from numbers sent by the browser.',
  'إثبات تبرّع': 'Donation receipts',
  'لكل تبرّع رابط معاملة ورابط محفظة — يمكن لأي جهة تحقق مستقلة المطابقة.':
    'Every donation has a transaction link and a wallet link — anyone can verify independently.',

  // ===== كيف تعمل =====
  'المنصة لا تحتفظ بأي أموال بين التبرعات. كل تبرّع معاملة مستقلة على الشبكة.':
    'The platform holds no funds between donations. Every donation is a separate on-chain transaction.',
  '1. اختر الحملة': '1. Choose the campaign',
  'كل صفحة حملة تعرض عنوان محفظة الجهة المستفيدة، الشبكة، الرموز المدعومة، وهل الحملة موثّقة أو مصرّح بها ذاتيًا. تحقّق من العنوان على المستكشف قبل أي دفعة.':
    'Every campaign page shows the beneficiary wallet address, the network, the supported tokens, and whether the campaign is verified or self-declared. Check the address on an explorer before paying.',
  '2. اربط المحفظة': '2. Connect the wallet',
  'المتصفح يطلب توقيع رسالة واحدة عند تسجيل الدخول (لا معاملة ولا خصم). إن لم يكن لديك محفظة، يمكنك إرسال المبلغ مباشرة إلى عنوان المحفظة من تطبيق محفظتك.':
    'The browser requests one message signature at sign-in (no transaction, no charge). Without a wallet, you can send the amount directly to the address from your wallet app.',
  '3. ادفع': '3. Pay',
  'للعملات التي تتطلب موافقة (approve) تكون هناك خطوة إضافية قبل التحويل — يظهر المبلغ والعنوان قبل أي تأكيد على محفظتك.':
    'Tokens that require approval (approve) add one extra step before the transfer — the amount and address are shown before you confirm in your wallet.',
  '4. يُقسَّم المبلغ على السلسلة': '4. The amount is split on-chain',
  'يستدعي المتبرّع دالة': 'The donor calls',
  'في عقد': ' in the',
  '، فينقل العقد ٩١٪ لمحفظة الجهة المستفيدة و٩٪ لمحفظة المنصة في نفس المعاملة.':
    ' contract, which moves 91% to the beneficiary wallet and 9% to the platform wallet in the same transaction.',
  '5. يتحدّث السجل': '5. The log updates',
  'يرصد الخادم حدث': 'The server watches the',
  'بعد تأكيد الكتلة، ويحدّث صفحة الحملة ولوحة الكولكتر — والأرقام لا تأتي من المتصفح.':
    ' event after the block confirms, and updates the campaign page and collector dashboard — the numbers never come from the browser.',
  '6. تحقّق بنفسك': '6. Verify it yourself',
  'كل تبرّع له رابط معاملة ورابط محفظة على مستكشف الكتل. راجعها مستقلًا عن المنصة في أي وقت.':
    'Every donation has a transaction link and a wallet link on a block explorer. Check them independently of the platform at any time.',
  'العقد الذكي': 'The smart contract',
  'محدوديات يجب أن تعرفها': 'Limits you should know',
  'لا يوجد استرداد تلقائي: مدفوعات العملات الرقمية نهائية.': 'No automatic refunds: crypto payments are final.',
  'الأسعار بالدولار تقديرية وتُحدَّث من مصادر عامة؛ قد يختلف وقت التنفيذ.':
    'USD values are estimates refreshed from public sources and may differ at execution time.',
  'التبرّع بالعملات الرقمية قد يخلق التزامًا ضريبيًا للمتبرّع بحسب بلده.':
    'Crypto donations may create a tax liability for the donor depending on their country.',
  'حالة "موثّق" تُمنح بعد مراجعة مستندية من فريق المنصة، وليست تلقائية.':
    'The "verified" badge is granted after a document review by the platform team, not automatically.',
  'لا تحجز المنصة أي مبلغ نيابة عنك ولا تحتفظ بأموالك.':
    'The platform never holds funds on your behalf.',

  // ===== تسجيل الدخول =====
  'تسجيل الدخول': 'Sign in',
  'ادخل باسم المستخدم وكلمة المرور، أو استخدم محفظتك بلا كلمة مرور.':
    'Enter your username and password, or use your wallet with no password.',
  'بالمحفظة': 'With a wallet',
  'وقّع رسالة فقط — لا معاملة ولا رسوم. عنوانك يصبح هويتك على المنصة.':
    'Sign one message — no transaction, no fees. Your address becomes your identity on the platform.',
  'أنشئ حسابًا باسم مستخدم وكلمة مرور، واربط محفظتك لاحقًا لتدير حملاتك.':
    'Create a username and password, then link a wallet to manage your campaigns.',
  'إنشاء حساب': 'Create account',
  'مشرف المنصة؟ لوحة الإدارة لها دخول خاص على': 'Platform admin? The admin panel has its own sign-in at',
  '(اسم مستخدم إداري أو مفتاح أو توقيع محفظة).': ' (admin account, key, or wallet signature).',

  // ===== التذييل =====
  'منصة تبرّع بالعملات الرقمية. كل تبرّع يُقسَّم على السلسلة داخل معاملة واحدة:':
    'A crypto donation platform. Every donation is split on-chain inside one transaction:',
  'لمحفظة الجهة المستفيدة و': ' to the beneficiary wallet and',
  'لمحفظة المنصة.': ' to the platform wallet.',
  'لا نضمن استرداد المبالغ: مدفوعات العملات الرقمية غير قابلة للعكس.':
    'We cannot guarantee refunds: crypto payments are irreversible.',
  'المنصة': 'Platform',
  'الدعم': 'Support',
  'محفظة الكولكتر:': 'Collector wallet:',
  'الأسعار بالدولار وتُحدَّث من مصادر عامة. رسوم المنصة': 'USD prices are refreshed from public sources. Platform fee',

  // ===== الأسعار =====
  'رسوم واحدة متدرّجة على كل تبرّع، ولا رسوم لإنشاء الحملة ولا لتحديثها.':
    'One tiered fee per donation, and no fee to create a campaign or post updates.',
  'رسوم إنشاء حملة': 'Campaign creation fee',
  'بلا حدود وبدون بريد إلكتروني': 'Unlimited, no email needed',
  'رسوم التحديثات': 'Updates fee',
  'انشر ما تشاء': 'Post as much as you want',
  'رسوم المعاملة': 'Transaction fee',
  'أقصى نسبة — وتتناقص كلما زاد المبلغ': 'Maximum rate — it drops as the amount grows',
  'الرسوم المتدرّجة حسب قيمة التبرّع': 'Tiered fees by donation amount',
  'كلما زاد مبلغ التبرّع انخفضت نسبة الرسوم تلقائيًا. النسبة تُطبَّق داخل العقد على السلسلة ولا يستطيع المتبرّع ولا المنصة تجاوزها.':
    'The bigger the donation, the lower the fee rate — automatically. The rate is enforced inside the contract on-chain, and neither the donor nor the platform can go around it.',
  'الشريحة': 'Tier',
  'قيمة التبرّع': 'Donation amount',
  'العتبات تُضبط داخل العقد بالوحدة الأصلية لكل رمز، وتُحدَّث دوريًا تلقائيًا حسب سعر الصرف. الحد الأدنى للرسوم ٣٪ ولا يمكن سداد أقل منه.':
    'Thresholds are set inside the contract in token units and refreshed with the exchange rate. The minimum fee is 3% and cannot go below it.',
  'احسبها بنفسك': 'Do the math',
  'مبلغ التبرّع (دولار)': 'Donation amount (USD)',
  'مقارنة سريعة': 'Quick comparison',
  'رسوم الشبكة (gas) يدفعها المتبرّع إضافة إلى رسم المنصة، وتختلف حسب الشبكة وحالة الازدحام. كما أن مدفوعات العملات الرقمية غير قابلة للاسترداد — اقرأ':
    'Network gas is paid by the donor on top of the platform fee, and varies with congestion. Crypto payments are also irreversible — read the',
  'قبل التبرّع.': 'before donating.',

  // ===== الخصوصية =====
  'ما الذي نجمعه': 'What we collect',
  'العنوان العام لمحفظتك (يرتبط بجلسة الحساب وبتبرعاتك)': 'Your public wallet address (linked to your session and donations)',
  'اسم اختياري ورسالة اختيارية ترسلهما مع التبرّع': 'An optional name and message you send with a donation',
  'سجل تبرعات الحملة (معاملة، رمز، مبلغ، وقت) — وهو معلن على السلسلة أصلًا':
    'The campaign donation log (transaction, token, amount, time) — already public on-chain',
  'رمز تحقق موقّع لكل جلسة دخول (صالح حتى انتهاء الجلسة)': 'A signed nonce per session (valid until the session expires)',
  'ما الذي لا نجمعه': 'What we do not collect',
  'لا نطلب Seeds ولا نخزّن مفاتيح خاصة ولا نشغّل خدمة محفظة.':
    'We never ask for seed phrases, never store private keys and never run a custodial wallet service.',
  'لا نرسل بريدًا تسويقيًا ولا نشارك بياناتك مع أطراف ثالثة.':
    'We send no marketing email and share no data with third parties.',
  'لا نحتفظ بأموال — لا توجد أرصدة داخلية على المنصة.': 'We hold no funds — there are no internal balances on the platform.',
  'ملفات الارتباط': 'Cookies',
  'نستخدم كوكي واحدة للجلسة (HttpOnly + SameSite=Lax) وlocalStorage لتفضيل اللغة فقط.':
    'We use one session cookie (HttpOnly + SameSite=Lax) plus localStorage for the language preference only.',
  'حقوقك': 'Your rights',
  'يمكنك طلب حذف حسابك وسجلك من': 'You can request deletion of your account and records from',
  '. ملاحظة: بيانات التبرع موجودة أصلًا على الشبكة العامة ولا يمكن حذفها من هناك.':
    '. Note: donation data already lives on the public network and cannot be deleted from there.',

  // ===== التسجيل =====
  'حساب باسم مستخدم وكلمة مرور. يمكنك لاحقًا ربط محفظتك ليصبح عنوانك هو مالك حملاتك على السلسلة.':
    'An account with a username and password. You can link a wallet later — then your address owns your campaigns on-chain.',
  'حروف صغيرة وأرقام و . _ - فقط (٣ خانات على الأقل).': 'Lowercase letters, digits, . _ - only (at least 3 characters).',
  'الاسم الظاهر (اختياري)': 'Display name (optional)',
  '١٠ خانات على الأقل. تُخزَّن بـ Argon2id — لا نحفظ كلمة المرور نفسها أبدًا.':
    'At least 10 characters. Stored with Argon2id — we never keep the password itself.',
  'تأكيد كلمة المرور': 'Confirm password',
  'إنشاء الحساب': 'Create the account',
  'لديك حساب بالفعل؟': 'Already have an account?',
  'سجّل الدخول': 'Sign in',
  '— أو': '— or',
  'استخدم محفظتك مباشرة': 'use your wallet directly',
  'بلا كلمة مرور.': 'with no password.',

  // ===== التوقيع بالمحفظة =====
  'لإنشاء حملة تحتاج حسابًا — وهي خطوة واحدة: وقّع رسالة من محفظتك. بعدها تُكمل مباشرة.':
    'Creating a campaign needs an account — one step: sign a message with your wallet, then you continue right where you were.',
  'حسابك في هذه المنصة هو **عنوان محفظتك** — لا كلمة مرور ولا بريد إلكتروني ولا Seeds. نطلب توقيع رسالة واحدة فقط، ولا تُرسل أي معاملة ولا يُخصم أي مبلغ.':
    'Your account on this platform IS your wallet address — no password, no email, no seed phrase. We ask for a single message signature; nothing is sent and nothing is charged.',
  'عنوان المحفظة': 'Wallet address',
  'سيطلب متصفحك توقيع رسالة — لن يتم إرسال أي معاملة ولا خصم أي مبلغ.':
    'Your browser will ask you to sign a message — no transaction is sent and nothing is charged.',
  'قراءة العنوان من المحفظة': 'Read address from wallet',
  'توقيع وإنشاء الحساب': 'Sign and create account',
  'بعد التوقيع ستعود تلقائيًا إلى الصفحة التي طلبتها.':
    'After signing you will return automatically to the page you requested.',
  'لماذا لا كلمة مرور؟': 'Why no password?',
  'كلمة المرور تُخزَّن وتُسرق وتُعاد استخدامها. التوقيع بالمحفظة لا يمكن نسخه ولا يُستخدم في مكان آخر — لهذا لا نحفظ أي سر منك على الإطلاق.':
    'Passwords get stored, stolen and reused. A wallet signature cannot be copied or used elsewhere — so we never store any secret of yours.',
  'ماذا يعني ذلك لك؟': 'What does this mean for you?',
  'يصبح عنوانك هو هويتك: هو من يملك الحملة، ومن يوقّع تغيير محفظة الجهة المستفيدة، ومن يظهر في سجل التبرعات باسمك.':
    'Your address becomes your identity: it owns your campaign, it signs any beneficiary wallet change, and it appears in the donation log under your name.',
  'عنوانك عام على الشبكة أصلًا. نحتفظ به فقط لربطك بحملاتك وتبرعاتك — ولا نشاركه مع أحد.':
    'Your address is public on the network anyway. We keep it only to link you to your campaigns and donations, and we share it with nobody.',
  'باستخدام المنصة أنت توافق على': 'By using the platform you agree to the',
  'و': ' and the',

  // ===== الشروط =====
  'آخر تحديث:': 'Last updated:',
  'طبيعة الخدمة': 'Nature of the service',
  'توفّر المنصة أدوات لعرض حملات التبرّع وربطها بمدفوعات العملات الرقمية على شبكات EVM. المنصة لا تتحكّم في الأموال ولا تنفّذها نيابة عنك ولا تحتفظ بأموال المتبرّعين أو المستفيدين.':
    'The platform provides tools to publish fundraising campaigns and connect them to crypto payments on EVM networks. It does not control or execute funds on your behalf and never holds donor or beneficiary funds.',
  'عدم قابلية الاسترداد': 'Irreversibility',
  'مدفوعات العملات الرقمية غير قابلة للعكس. أي استرداد يتم كعملية جديدة من محفظة المنصة أو الجهة المستفيدة ولا يمكن ضمانه. يُنصح بالتحقق من العنوان والمبلغ قبل التأكيد.':
    'Crypto payments are irreversible. Any refund is a new transaction from the platform or beneficiary wallet and cannot be guaranteed. Verify the address and amount before confirming.',
  'المحتوى والحملات': 'Content and campaigns',
  'منشئو الحملات مسؤولون عن دقة معلوماتهم. حالة "موثّق" تعني أن فريق المنصة راجع مستندات محدّدة فقط، ولا تعني ضمان النتيجة أو التدقيق المالي. يجوز للمنصة إيقاف حملة مخالفة.':
    'Campaign creators are responsible for the accuracy of their information. The "verified" status means the team reviewed specific documents only; it is not a guarantee of outcomes or a financial audit. Campaigns that violate the rules may be suspended.',
  'التزامات المتبرّع': 'Donor responsibilities',
  'أنت مسؤول عن عنوان المحفظة الذي تقدّمه وعن رصيدك وعن المعاملات التي توقّعها. لا تتحمّل المنصة مسؤولية خسارة كلمات المرور أو الأجهزة أو التطبيقات التي لا تتحكّم فيها.':
    'You are responsible for the wallet address you submit, your balance and the transactions you sign. The platform is not liable for lost passwords, devices or apps it does not control.',
  'نخزّن العناوين العامة المرتبطة بتبرعاتك وسجل التبرعات لأغراض عرض سجل الحملة. التفاصيل في':
    'We store the public addresses linked to your donations and the donation log to display the campaign record. Details in the',
  'القانون': 'Law',
  'تخضع هذه الشروط لقانون': 'These terms are governed by the law of',
  '. تذكّر أن استخدام عملات رقمية قد يخضع لقواعد الضرائب أو مكافحة غسل الأموال في بلدك — راجع مستشارًا مختصًا.':
    '. Remember that using crypto may be subject to tax or anti-money-laundering rules in your country — consult a professional.',

  // ===== صفحات بسيطة =====
  'حدث خطأ غير متوقع. تم تسجيله في السجل.': 'Something went wrong. It has been logged.',
  'أكثر ما يسأل عنه المستخدمون — وكل جواب مبنيّ على سلوك النظام الفعلي.':
    'What users ask most — every answer reflects how the system actually behaves.',
  'لا توجد نتائج مطابقة.': 'No matching results.',
  'لم تجد جوابك؟ اسأل المساعد الذكي في أسفل الصفحة، أو راسل الدعم على':
    'Did not find your answer? Ask the assistant at the bottom of the page, or contact support at',
  'هذه الصفحة مخصّصة لمسؤول محدّد.': 'This page is restricted to a specific administrator.',
  'تخطَّ إلى المحتوى': 'Skip to content',
  'الأسئلة': 'FAQ',
  'ابحث عن حملة…': 'Search campaigns…',
  'ابحث عن حملة': 'Search campaigns',
  'اللغة / Language': 'Language / Language',
  'تخصيص المظهر / Appearance': 'Customize appearance / Appearance',
  'تخصيص المظهر': 'Customize appearance',

  'نسخة إنجليزية (اختياري)': 'English version (optional)',
  'تظهر للزوار الذين يختارون لغة الواجهة الإنجليزية. إن تُركت فارغة تُعرض النسخة العربية.':
    'Shown to visitors who pick the English interface. If left empty, the Arabic version is shown.',
  'العنوان بالإنجليزية': 'Title in English',
  'السطر الوصفي بالإنجليزية': 'One-line description in English',
  'القصة بالإنجليزية': 'Story in English',

  // ===== search =====
  'بحث بالعنوان…': 'Search by title…',
  'بحث نصي…': 'Text search…',
  'لم تُراجع جهة المستفيدة بعد': 'The beneficiary has not been reviewed yet',
  'اكتب تعليقًا داعمًا…': 'Write a supportive comment…',
  'اسمك (اختياري)': 'Your name (optional)',
  'مبلغ آخر': 'Another amount',
  'اختياري': 'optional',
  'لا تترك بيانات حساسة': 'Do not leave sensitive data',
  'نسخ': 'copy',
  'عنوان التحديث (اختياري)': 'Update title (optional)',
  'ما الجديد؟': "What's new?",
  'ابحث بالعنوان أو اسم الجهة…': 'Search by title or organization…',
  'ابحث في الأسئلة…': 'Search the questions…',
  'اشرح الحاجة، من سيستفيد، وكيف سيُصرف المبلغ.': 'Explain the need, who benefits, and how the money will be used.',
  'أحمد': 'Ahmed',
  // ===== نصوص طويلة نادرة =====
  "٪)": "%)",
  "من كل تبرّع، تُخصم داخل معاملة واحدة على السلسلة. لا رسوم لإنشاء الحملة ولا لتحديثها. رسوم الشبكة (gas) يتحمّلها المتبرّع.": "From every donation it is deducted inside a single on-chain transaction. No fee to create a campaign or update it. The donor covers the network fee (gas).",
  // ===== نصوص طويلة نادرة =====
  "— بهذا يصبح عنوانك مالك حملاتك على السلسلة، وتستطيع وحدك تغيير محفظة الجهة المستفيدة. لا تكلفة ولا معاملة: توقيع رسالة واحدة.": "— This makes your address the owner of your campaigns on-chain, and you alone can change the beneficiary wallet. No cost, no transaction: just one message signature.",
    // ===== عنوان الاستلام =====
    "عنوان الاستلام": "Delivery address",
    "توقيع وإثبات العنوان": "Sign & prove the address",
    "العنوان الذي سيصل إليه التبرّع فعليًا (عنوان المستلم أو الجهة المنفّذة). نطلب توقيعًا واحدًا من محفظتك لإثبات ملكيته — بلا توقيع لا يُقبل.": "The address where the funds actually land (the recipient or the delivering organisation). We request one signature from your wallet to prove ownership — without it the field is rejected.",
    "العنوان الذي تصل إليه مبالغ التبرّع. يجب أن يطابق شبكة الحملة: عنوان EVM يبدأ بـ 0x، وعنوان TRON يبدأ بحرف T.": "The address where the donation amounts land. It must match the campaign network: an EVM address starts with 0x, a TRON address starts with T.",
    "عنوان الاستلام لم يُثبت بتوقيع صالح من صاحب العنوان. اطلب التوقيع من محفظتك ثم أعد المحاولة.": "The delivery address was not proven by a valid signature from its owner. Request the signature from your wallet and try again.",
    "صيغة العنوان غير صحيحة — عنوان EVM يبدأ بـ 0x أو عنوان TRON بحرف T.": "Invalid address format — an EVM address starts with 0x, a TRON address with T.",
    "أدخل عنوان الاستلام أولًا.": "Enter the delivery address first.",
    "العنوان لا يطابق حساب محفظتك — وقّع بالعنوان نفسه.": "The address does not match your wallet account — sign with that same address.",
    "✔ تم إثبات العنوان بتوقيع صالح.": "✔ The address was proven with a valid signature.",
    "جارٍ فتح المحفظة…": "Opening your wallet…",
  "محفظة المنظّم (إثبات الملكية)": "Organizer wallet (proof of ownership)",
  "توقيع وإثبات الملكية": "Sign & prove ownership",
  "محفظة المنظّم: وقّع بالعنوان نفسه عند الحفظ. إن لم توقّع الآن، ستُراجع حملتك أولًا ثم نطلب منك التوقيع لإتمام النشر.": "Organizer wallet: sign with that same address when saving. If you skip it now, your campaign is reviewed first and we then ask you to sign to complete publishing.",
  "تمت مراجعة حملتك ووافق عليها فريق المراجعة. بقي خطوة أخيرة: ضع محفظة منظّم الحملة ووقّع بالعنوان نفسه لإتمام النشر.": "Your campaign was reviewed and approved. One last step: add the organizer wallet and sign with that address to complete publishing.",
  "تمت مراجعة هذه الحملة ووافق عليها الفريق، وهي بانتظار توقيع منظّم الحملة لإتمام النشر.": "This campaign was reviewed and approved, and is waiting for the organizer signature to complete publishing.",
  "توقيع وإرسال للمراجعة": "Sign & send for review",
  "إثبات ملكية محفظة المنظّم": "Proof of organizer wallet ownership",
  "لا يوجد محفظة في المتصفح": "No wallet detected in the browser",
  "فشلت العملية": "The operation failed",
  "توقيع محفظة المنظّم غير صالح — أعد التوقيع من محفظتك ثم احفظ الحملة مجددًا.": "The organizer wallet signature is invalid — sign again from your wallet and save the campaign.",
  "توقيع محفظة المنظّم ناقص — وقّع بالعنوان نفسه ثم احفظ الحملة.": "The organizer wallet signature is missing — sign with the same address, then save.",
  "بانتظار توقيع المنظّم": "Awaiting organizer signature",
  "محفظة المنظّم": "Organizer wallet",
  "مستويات الأثر": "Impact levels",
  "اربط كل مبلغ بنتيجة ملموسة («٢٥$ تكفي شهر دواء لمريض»). تظهر هذه البطاقات للزوار، والضغط عليها يحدّد مبلغ التبرّع تلقائيًا.": "Link each amount to a concrete outcome (\"$25 covers a month of medicine for one patient\"). These cards appear to visitors, and clicking one sets the donation amount automatically.",
  "+ إضافة مستوى": "+ Add a level",
  "اقترح من شرائح الرسوم": "Suggest from fee tiers",
  "مبلغ مستوى الأثر بالدولار": "Impact amount in USD",
  "مثال: تكفي شهر دواء لمريض واحد": "e.g. covers one month of medicine",
  "+ إضافة مستوى": "+ Add a level",
  "نسيت كلمة المرور؟": "Forgot your password?",
  "أدخل اسم المستخدم وسنرسل لك رابطًا واحدًا لاستعادة كلمة المرور.": "Enter your username and we will send you a one-time link to reset your password.",
  "إرسال رابط الاستعادة": "Send the reset link",
  "إن كان الحساب موجودًا، فقد أرسلنا إليه رابط استعادة صالحًا لمدة ٣٠ دقيقة. تحقّق من بريدك، وإن لم تجد الرابط اطلب واحدًا جديدًا.": "If the account exists, we sent it a reset link valid for 30 minutes. Check your inbox — and request a new one if it is not there.",
  "اكتب اسم المستخدم كما سجّلت به.": "Enter the username you registered with.",
  "طلب رابط جديد": "Request a new link",
  "إن كنت تدخل بمحفظة فقط، لا تحتاج كلمة مرور — ": "If you sign in with a wallet only, you need no password — ",
  "رجوع لتسجيل الدخول": "Back to sign in",
  "تعيين كلمة مرور جديدة": "Set a new password",
  "كلمة المرور الجديدة تُخزَّن بـ Argon2id، وتُنهى كل جلساتك القديمة.": "The new password is stored with Argon2id, and all your previous sessions end.",
  "بعد التغيير ستُسجَّل خروجك من كل الأجهزة — سجّل الدخول من جديد.": "After the change you will be signed out everywhere — sign in again.",
  "حفظ كلمة المرور": "Save the new password",
  "بيانات التجربة": "Demo credentials",
  "حساب المشرف التجريبي — اضغط «تعبئة تلقائية» لتعبئة النموذج.": "The demo admin account — press “Autofill” to fill the form.",
  "تعبئة تلقائية": "Autofill",
  "توليد كلمة مرور قوية": "Generate a strong password",
  "أو سجّل بحساب جوجل": "Or sign in with your Google account",
  "تعذّر تسجيل الدخول بجوجل": "Google sign-in failed",
  "تسجيل جوجل غير مهيّأ على هذا الخادم": "Google sign-in is not configured on this server",
  "تعذّر التحقق من حساب جوجل": "Could not verify the Google account",
  "تعذّر الاتصال بالخادم": "Could not reach the server",
  "إن كنت تدخل بمحفظة فقط، لا تحتاج كلمة مرور —": "If you sign in with a wallet only, you need no password —",
  "إزالة": "Remove",
  "EN: covers one month of medicine": "EN: covers one month of medicine",
  "اكتب اسم المستخدم وسنرسل لك رابطًا واحدًا لاستعادة كلمة المرور.": "Enter your username and we will send you a one-time link to reset your password.",
  "وضع التطوير: لا يوجد خادم بريد مهيّأ، فالرابط مباشر:": "Development mode: no mailer is configured, so the link is shown here:",
  "وضع التطوير:": "Development mode:",
  "لا يوجد خادم بريد مهيّأ، فالرابط مباشر:": "no mailer is configured, so the link is shown here:",
  "ادخل بتوقيع المحفظة": "sign in with your wallet",
  "أو": "or",
};
