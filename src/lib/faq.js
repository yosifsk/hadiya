/* قاعدة معرفة المنصة (FAQ) — مصدر واحد يغذّي:
   1) صفحة الأسئلة الشائعة  2) المساعد الذكي  3) ردود الموقع
   الإجابات مبنية على سلوك النظام الفعلي — لا وعود غير مطبَّقة. */

const FAQ = [
  // ---------- basics ----------
  {
    id: 'what-is',
    tags: ['basics'],
    q: 'ما هي منصة هدية؟',
    a: 'هدية منصة تبرّع **بالعملات الرقمية**: تنتشر الحملات، يستقبل المتبرّعون التبرع عبر محافظهم، '
      + 'ويصل المبلغ مباشرة إلى محفظة الجهة المستفيدة خلال نفس المعاملة.',
    en: {
      q: 'What is HADIYA?',
      a: 'A crypto donation platform: campaigns are published, donors pay from their own wallet, '
        + 'and the money lands in the beneficiary wallet inside the same transaction.',
    },
    kw: ['ما هي', 'منصة', 'هدية', '.about', 'what'],
  },
  {
    id: 'how-money-flows',
    tags: ['basics', 'money'],
    q: 'كيف يصل المال إلى الجهة المستفيدة؟',
    a: 'عند التبرّع تُستدعى دالة `donate()` في عقد `DonationSplitter`، فينقل العقد **٩١٪** (أو أكثر حسب الشريحة) '
      + 'إلى محفظة الجهة المستفيدة و**٩٪** إلى محفظة المنصة — **في نفس المعاملة**، ولا تُحفظ أي أموال عند المنصة.',
    en: {
      q: 'How does the money reach the beneficiary?',
      a: 'The donor calls donate() on the DonationSplitter contract, which sends 91% (or more by tier) '
        + 'to the beneficiary wallet and 9% to the platform wallet in the same transaction. No funds are held.',
    },
    kw: ['كيف', 'المال', 'يصل', 'الجهة', 'تدفق', 'money', 'flow'],
  },
  {
    id: 'networks',
    tags: ['basics', 'networks'],
    q: 'على أي شبكات أتبرّع؟',
    a: 'Base (الأرخص والأسرع، موصى به)، BNB Smart Chain، Polygon، Ethereum. '
      + 'لكل حملة شبكة واحدة محدّدة — والشبكة معروضة بوضوح في صفحة الحملة قبل الدفع.',
    en: {
      q: 'Which networks can I donate on?',
      a: 'Base (cheapest and fastest, recommended), BNB Smart Chain, Polygon and Ethereum. '
        + 'Each campaign is bound to one network, shown clearly before you pay.',
    },
    kw: ['شبكة', 'شبكات', 'base', 'bsc', 'polygon', 'ethereum', 'network', 'networks', 'مدعومة'],
  },
  {
    id: 'tokens',
    tags: ['basics', 'networks'],
    q: 'ما الرموز المدعومة؟',
    a: 'العملة الأصلية للشبكة (ETH على Base/Ethereum، BNB على BSC، POL على Polygon) '
      + 'بالإضافة إلى USDC و USDT / USDT0. عدد الخانات يُقرأ من كل عقد على السلسلة — لا نفترض قيمًا ثابتة.',
    en: {
      q: 'Which tokens are supported?',
      a: 'The native coin of the network plus USDC and USDT/USDT0. Decimals are read from each token '
        + 'contract on-chain — never assumed.',
    },
    kw: ['رمز', 'رموز', 'عملة', 'usdc', 'usdt', 'eth', 'token', 'tokens', 'مدعومة'],
  },
  {
    id: 'gas',
    tags: ['basics', 'money'],
    q: 'كم تبلغ رسوم الشبكة (gas)؟',
    a: 'على Base و BSC عادةً أقل من ٠٫٠١ دولار. رسوم gas يدفعها المتبرّع **بالإضافة** إلى رسم المنصة، '
      + 'وتختلف حسب ازدحام الشبكة.',
    en: {
      q: 'How much is the gas fee?',
      a: 'On Base and BSC usually under $0.01. Gas is paid by the donor on top of the platform fee '
        + 'and varies with network congestion.',
    },
    kw: ['gas', 'غاز', 'رسوم الشبكة', 'تكلفة'],
  },

  // ---------- fees ----------
  {
    id: 'fee-tier',
    tags: ['fees'],
    q: 'كم رسوم المنصة؟',
    a: 'الرسوم **متدرّجة** حسب قيمة التبرّع: حتى ٢٠٠$ ← ٩٪، فوق ٢٠٠$ حتى ٣٠٠$ ← ٧٪، '
      + 'فوق ٣٠٠$ حتى ٤٠٠$ ← ٥٪، فوق ٤٠٠$ ← ٣٪. تصل ٩١٪ إلى ٩٧٪ للجهة المستفيدة.',
    en: {
      q: 'What is the platform fee?',
      a: 'Tiered: up to $200 → 9%, $200–300 → 7%, $300–400 → 5%, above $400 → 3%. '
        + 'The beneficiary receives 91% to 97%.',
    },
    kw: ['رسوم', 'نسبة', 'المنصة', 'كم', 'fee', '9', '9%', 'عمولة'],
  },
  {
    id: 'fee-enforced',
    tags: ['fees'],
    q: 'هل يمكنه تجاوز الرسوم أو تغييرها؟',
    a: 'لا. حدود الرسوم (٣٪–٩٪) مثبّتة داخل العقد كـ `immutable` عند النشر ولا تتغيّر أبدًا. '
      + 'النسبة تُحتسب داخل العقد من المبلغ نفسه — فلا يمكن للمتبرّع ولا للمنصة تجاوزها.',
    en: {
      q: 'Can anyone bypass or change the fee?',
      a: 'No. The bounds (3%–9%) are immutable in the contract and the rate is computed on-chain from '
        + 'the amount itself — neither the donor nor the platform can go around it.',
    },
    kw: ['تغيير', 'تجاوز', 'خلال', 'modify', 'bypass', 'immutable'],
  },
  {
    id: 'fee-where',
    tags: ['fees'],
    q: 'أين تُدفع رسوم المنصة؟',
    a: 'إلى محفظة المنصة مباشرةً في نفس المعاملة (عنوانها معروض في صفحة الحملة وفي لوحة الكولكتر).',
    en: {
      q: 'Where does the platform fee go?',
      a: 'Straight to the platform wallet inside the same transaction. The address is shown on the '
        + 'campaign page and in the collector dashboard.',
    },
    kw: ['وين', 'أين', 'تذهب', 'محفظة المنصة', 'where'],
  },
  {
    id: 'fee-campaign-free',
    tags: ['fees'],
    q: 'هل إنشاء الحملة مجاني؟',
    a: 'نعم — ٠ دولار لإنشاء الحملة و٠ لتحديثاتك. لا رسوم اشتراك ولا حد لعدد الحملات.',
    en: {
      q: 'Is creating a campaign free?',
      a: 'Yes — $0 to create a campaign and $0 to post updates. No subscription, no campaign limit.',
    },
    kw: ['مجانا', 'إنشاء حملة', 'free', 'تحديثات'],
  },

  // ---------- donating ----------
  {
    id: 'how-to-donate',
    tags: ['donate'],
    q: 'كيف أتبرّع؟',
    a: 'افتح الحملة → «تبرّع الآن» → اختر المبلغ والرمز → اربط محفظتك → راجع المبلغ والعنوان → أكّد المعاملة. '
      + 'تظهر المعاملة في سجل الحملة فور تأكيدها على السلسلة.',
    en: {
      q: 'How do I donate?',
      a: 'Open the campaign → Donate now → pick amount and token → connect your wallet → review amount '
        + 'and address → confirm. The transaction appears in the campaign log once confirmed on-chain.',
    },
    kw: ['كيف', 'تبرع', 'ادفع', 'donate', 'how'],
  },
  {
    id: 'wallet-options',
    tags: ['donate'],
    q: 'لا أملك محفظة متصفح — ماذا أفعل؟',
    a: 'انسخ عنوان الجهة المستفيدة من صفحة الحملة (زر النسخ) وأرسل المبلغ من تطبيق محفظتك كـ transfer عادي. '
      + 'سجّل بعدها hash المعاملة في الموقع ليظهر تبرّعك في سجل الحملة.',
    en: {
      q: 'I have no browser wallet — what now?',
      a: 'Copy the beneficiary address from the campaign page and send the amount from your wallet app '
        + 'as a normal transfer. Then submit the transaction hash on the site so it shows in the log.',
    },
    kw: ['محفظة', 'لا املك', 'انسخ', 'wallet', 'copy', 'address', 'متصفح', 'browser'],
  },
  {
    id: 'approve-step',
    tags: ['donate'],
    q: 'لماذا طلبت الموافقة (approve) على الرموز؟',
    a: 'لأن رموز ERC20 تحتاج إذنًا لعقد المقسّم قبل التحويل. الموافقة تكون **بمقدار التبرّع بالضبط** '
      + 'وليس approve غير محدود. كل خطوة تُعرض لك قبل التأكيد.',
    en: {
      q: 'Why is there an approve step?',
      a: 'ERC20 tokens need a permission for the splitter contract before the transfer. The approval is '
        + 'for the exact donation amount — not an unlimited approval. Every step is shown before you confirm.',
    },
    kw: ['approve', 'موافقة', 'اذن', 'خطوات'],
  },
  {
    id: 'wrong-network',
    tags: ['donate', 'networks'],
    q: 'طلبت مني تغيير الشبكة — ليش؟',
    a: 'لأن كل حملة مرتبطة بشبكة واحدة. إذا كانت محفظتك على شبكة أخرى يطلب الموقع التبديل تلقائيًا قبل الدفع.',
    en: {
      q: 'It asked me to switch networks — why?',
      a: 'Each campaign is bound to one network. If your wallet is on another, the site asks to switch '
        + 'automatically before the payment.',
    },
    kw: ['شبكة', 'تبديل', 'switch', 'network'],
  },
  {
    id: 'donation-visibility',
    tags: ['donate', 'privacy'],
    q: 'هل تبرّعي ظاهر باسم محفظتي؟',
    a: 'نعم، العنوان العام لمحفظتك يظهر في سجل الحملة (وهو معلن على الشبكة أصلًا). '
      + 'يمكنك إخفاء **اسمك** فقط — لكن العنوان يبقى ظاهرًا لأن السلسلة علنية.',
    en: {
      q: 'Is my donation visible with my address?',
      a: 'Yes, your public wallet address shows in the campaign log (it is public on-chain anyway). '
        + 'You can hide your name, but the address stays visible because the chain is transparent.',
    },
    kw: ['ظاهر', 'اسم', 'عنواني', 'مخفي', 'visible', 'private'],
  },
  {
    id: 'donation-amount-limits',
    tags: ['donate'],
    q: 'هل هناك حد أدنى أو أقصى للتبرّع؟',
    a: 'لا حد أدنى في المنصة، لكن blockchain قد تطلب من عقدك حدًا أدنى. الحد الأقصى هو رصيد محفظتك '
      + 'ورصيد العقد (gas).',
    en: {
      q: 'Is there a minimum or maximum donation?',
      a: 'No platform minimum, though a smart contract may impose one. The maximum is your wallet balance '
        + 'and the contract gas allowance.',
    },
    kw: ['حد', 'أدنى', 'أقصى', 'limit', 'minimum'],
  },

  // ---------- refunds / tax ----------
  {
    id: 'refunds',
    tags: ['money', 'safety'],
    q: 'هل يمكن استرداد التبرّع؟',
    a: '**لا يوجد استرداد تلقائي** — مدفوعات العملات الرقمية غير قابلة للعكس. أي استرداد يكون معاملة جديدة '
      + 'من محفظة المنصة أو الجهة المستفيدة ولا يمكن ضمانه. تحقّق من العنوان والمبلغ قبل التأكيد.',
    en: {
      q: 'Can I get a refund?',
      a: 'There is no automatic refund — crypto payments are final. Any refund is a new transaction from '
        + 'the platform or beneficiary wallet and cannot be guaranteed. Verify the address and amount first.',
    },
    kw: ['استرداد', 'استرجاع', 'ارجاع', 'refund', 'money back'],
  },
  {
    id: 'tax',
    tags: ['money'],
    q: 'هل التبرّع بالعملات الرقمية يخضع للضريبة؟',
    a: 'قد يخلق التزامًا ضريبيًا للمتبرّع (أرباح رأسمالية أو دخل) بحسب بلده. المنصة لا تقدّم استشارة ضريبية — '
      + 'راجع مستشارًا في بلدك. ولا تخصم المنصة أي رسوم ضريبية على التبرّع.',
    en: {
      q: 'Are crypto donations taxable?',
      a: 'They may create a tax liability for the donor (capital gains or income) depending on their '
        + 'country. The platform gives no tax advice — consult a local professional.',
    },
    kw: ['ضريبة', 'ضرائب', 'tax', 'جisdiction'],
  },
  {
    id: 'kyc',
    tags: ['safety', 'legal'],
    q: 'هل المنصة تطلب KYC؟',
    a: 'حاليًا **لا** تطبّق KYC ولا فحص قوائم عقوبات. قبل استقبال أموال حقيقية يجب تفعيل ذلك في البلد '
      + 'المعني (الإبلاغ عن تبرعات فوق حدّ معيّن، والتأكد من هوية الجهة المستفيدة).',
    en: {
      q: 'Does the platform require KYC?',
      a: 'Not currently — no KYC and no sanctions screening. Before accepting real funds you must enable '
        + 'whatever your jurisdiction requires (reporting above thresholds, verifying the beneficiary).',
    },
    kw: ['kyc', 'هوية', 'اعرف عميلك', 'aml', 'عقوبات'],
  },

  // ---------- safety ----------
  {
    id: 'scam-warning',
    tags: ['safety'],
    q: 'كيف أحمي نفسي من الاحتيال؟',
    a: 'تحقّق دائمًا من: ① عنوان المحفظة على مستكشف الكتل بنفسك، ② أن الحملة في قائمة المراجعة المعتمدة، '
      + '③ عدم الثقة بطلب تبرّع خارج المنصة. المنصة تمنع وضع عناوين المحافظ داخل نصوص الحملات، '
      + 'ولا يمكن لأحد — حتى المشرف — تغيير محفظة الجهة المستفيدة بعد النشر.',
    en: {
      q: 'How do I protect myself from scams?',
      a: 'Always verify: ① the wallet address on a block explorer yourself, ② that the campaign is in the '
        + 'approved list, ③ that you never leave the platform to pay. Addresses in campaign text are blocked, '
        + 'and nobody — not even the admin — can change a beneficiary wallet after publishing.',
    },
    kw: ['احتيال', 'نصب', 'امان', 'scam', 'fraud', 'safe'],
  },
  {
    id: 'no-wallet-in-text',
    tags: ['safety'],
    q: 'لماذا لا أستطيع وضع عنوان محفظة في وصف الحملة؟',
    a: 'لأن ذلك أسلوب شائع للنصب: يطلب النص من المتبرّع إرسال المال لمحفظة خارج المنصة فيتلقّى النصب ولا تُسجَّل التبرّعات. '
      + 'لذلك يُرفض أي عنوان (0x…) في العنوان أو القصة أو التحديثات، والعنوان الصحيح يوضع في خانته المخصّصة فقط.',
    en: {
      q: 'Why can’t I put a wallet address in the campaign description?',
      a: 'Because that is a common scam pattern: the text asks donors to send money to an off-platform '
        + 'wallet, so the scammer takes it and no donation is recorded. Any 0x… address in the title, '
        + 'story or updates is rejected; the real address goes only in its dedicated field.',
    },
    kw: ['عنوان', 'محفظة', 'الوصف', 'address', 'text', 'قيد'],
  },
  {
    id: 'verify-badge',
    tags: ['safety'],
    q: 'ما الفرق بين «موثّق» و«مصرّح به ذاتيًا»؟',
    a: '«موثّق» تعني أن فريق المنصة راجع مستندات محدّدة (هوية الجهة المستفيدة وبياناتها). '
      + '«مصرّح به ذاتيًا» تعني أن صاحب الحملة قدّم بياناته بنفسه دون مراجعة. التوثيق **ليس** ضمانًا للنتائج.',
    en: {
      q: 'What is the difference between “verified” and “self-declared”?',
      a: 'Verified means the team reviewed specific documents (beneficiary identity and data). '
        + 'Self-declared means the campaign owner submitted their own details without review. '
        + 'Verification is not a guarantee of outcomes.',
    },
    kw: ['موثق', 'موثّق', 'توثيق', 'badge', 'verified'],
  },
  {
    id: 'review-queue',
    tags: ['safety', 'campaign'],
    q: 'لماذا حملتي لا تظهر في القائمة؟',
    a: 'كل حملة جديدة تدخل **قائمة المراجعة** ولا تظهر للعامة ولا تقبل تبرعات حتى يعتمدها فريق المنصة. '
      + 'عادةً خلال ساعات. ستظهر حالة «بانتظار المراجعة» في صفحة حملتك.',
    en: {
      q: 'Why is my campaign not listed yet?',
      a: 'Every new campaign goes into the review queue: it is neither listed publicly nor able to receive '
        + 'donations until the team approves it. Usually within hours. The page shows a "pending review" banner.',
    },
    kw: ['مراجعة', 'قائمة', 'لم تظهر', 'review', 'pending', 'approved'],
  },

  // ---------- creating ----------
  {
    id: 'how-to-create',
    tags: ['campaign'],
    q: 'كيف أنشئ حملة؟',
    a: 'سجّل الدخول (محفظة أو حساب باسم مستخدم + ربط محفظة) → «ابدأ حملة» → املأ العنوان والقصة والهدف '
      + 'ومحفظة الجهة المستفيدة → انشر → تدخل قائمة المراجعة.',
    en: {
      q: 'How do I create a campaign?',
      a: 'Sign in (wallet or username account with a linked wallet) → Start a fundraiser → fill in title, '
        + 'story, goal and the beneficiary wallet → publish → it enters the review queue.',
    },
    kw: ['انشاء حملة', 'ابدأ', 'كيف', 'create', 'campaign'],
  },
  {
    id: 'which-wallet',
    tags: ['campaign', 'safety'],
    q: 'أي محفظة أضع كـ«الجهة المستفيدة»؟',
    a: 'محفظة الجهة التي ستستقبل المال فعلًا (منظمة، مستشفى، أسرة). لا تضع محفظتك الشخصية إن لم تكن أنت المستفيد. '
      + 'العنوان يُعرض علنيًا في صفحة الحملة — تحقّق منه على المستكشف.',
    en: {
      q: 'Which wallet do I put as the beneficiary?',
      a: 'The wallet that will actually receive the money (organisation, hospital, family). Don’t put your '
        + 'personal wallet unless you are the beneficiary. The address is public on the campaign page — '
        + 'verify it on an explorer.',
    },
    kw: ['أي محفظة', 'الجهة المستفيدة', 'beneficiary', 'which wallet'],
  },
  {
    id: 'change-wallet',
    tags: ['campaign', 'safety'],
    q: 'هل يمكن تغيير محفظة الجهة المستفيدة بعد النشر؟',
    a: 'نعم — **أنت فقط** (منظّم الحملة) من محفظتك، س Signature على السلسلة. المشرف نفسه **لا يستطيع** ذلك '
      + 'حتى لو سُرق مفتاحه. تغيير العنوان يبقى مسجّلًا في أحداث العقد.',
    en: {
      q: 'Can I change the beneficiary wallet after publishing?',
      a: 'Yes — only you (the campaign organizer) can, by signing on-chain. Even the admin cannot, even if '
        + 'their key leaks. The change is recorded in the contract events.',
    },
    kw: ['تغيير', 'محفظة', 'الجهة', 'change', 'wallet'],
  },
  {
    id: 'organizer-identity',
    tags: ['campaign'],
    q: 'لماذا أحتاج أربط محفظتي بالحساب؟',
    a: 'لأن العنوان هو **المالك على السلسلة**: به تُسجَّل الحملة وبه يوقّع تغيير محفظة الجهة المستفيدة. '
      + 'الحساب باسم المستخدم просто لتسمية دخولك وإدارة حملاتك.',
    en: {
      q: 'Why do I need to link my wallet?',
      a: 'Because the address is the owner on-chain: the campaign is registered under it and it signs any '
        + 'beneficiary wallet change. The username account is just for signing in and managing campaigns.',
    },
    kw: ['ربط', 'محفظة', 'حساب', 'link', 'wallet'],
  },
  {
    id: 'ipfs',
    tags: ['campaign', 'technical'],
    q: 'هل القصة محفوظة على IPFS؟',
    a: 'اختياري: يمكن تثبيت محتوى الحملة على IPFS فيظهر CID في صفحتها. الميزة أن المحتوى يبقى قابلًا '
      + 'للقراءة من شبكة لا تتحكّم بها المنصة. الـ CID هو بصمة المحتوى — تغيّر المحتوى يعني CID مختلفًا.',
    en: {
      q: 'Is the story stored on IPFS?',
      a: 'Optionally: campaign content can be pinned to IPFS and its CID shown on the page, so it stays '
        + 'readable from a network the platform does not control. The CID is a content fingerprint — '
        + 'changed content means a different CID.',
    },
    kw: ['ipfs', 'cid', 'تخزين', 'محتوى', 'pin'],
  },
  {
    id: 'account-types',
    tags: ['account'],
    q: 'ما طرق الدخول المتاحة؟',
    a: 'ثلاث: ① محفظة (توقيع رسالة، بلا كلمة مرور) ② اسم مستخدم + كلمة مرور ③ لوحة الإدارة (حساب إداري أو مفتاح أو محفظة). '
      + 'الحسابان الأولان للمستخدم، والثالث للمشرف فقط.',
    en: {
      q: 'What sign-in methods are there?',
      a: 'Three: ① wallet (message signature, no password) ② username + password ③ the admin panel (admin '
        + 'account, key, or wallet). The first two are for users, the last is for the platform operator only.',
    },
    kw: ['دخول', 'تسجيل', 'حساب', 'sign in', 'login', 'account'],
  },

  // ---------- technical ----------
  {
    id: 'contract',
    tags: ['technical'],
    q: 'أين العقد الذكي وكيف يعمل؟',
    a: 'عقد `DonationSplitter` مكتوب بـ Solidity ومفتوح المصدر في `contracts/DonationSplitter.sol`. '
      + 'المنصّة لا تحتفظ بأي أموال: الدفعتان (للجهة والمنصة) تنفَّذان في نفس المعاملة داخل العقد.',
    en: {
      q: 'Where is the smart contract and how does it work?',
      a: 'The open-source DonationSplitter contract lives in contracts/DonationSplitter.sol. The platform '
        + 'never custodies funds: both transfers (beneficiary + platform) execute inside one transaction.',
    },
    kw: ['عقد', 'دقيق', 'solidity', 'contract', 'smart'],
  },
  {
    id: 'organizer-only',
    tags: ['technical', 'safety'],
    q: 'ماذا يستطيع المشرف أن يفعل؟',
    a: 'إنشاء الحملات، **إيقافها** (لحماية المتبرّعين من احتيال)، اعتمادها/رفضها، ضبط شرائح الرسوم ضمن '
      + 'الحدود الثابتة، ومراجعة البيانات. **لا يستطيع** تغيير محفظة جهة مستفيدة — أبدًا.',
    en: {
      q: 'What can the admin do?',
      a: 'Create campaigns, pause them (to protect donors from fraud), approve/reject them, set fee tiers '
        + 'within the fixed bounds, and review data. They can never change a beneficiary wallet.',
    },
    kw: ['مدير', 'مشرف', 'صلاحيات', 'admin', 'permissions'],
  },
  {
    id: 'confirmations',
    tags: ['technical'],
    q: 'متى يُعتبر التبرّع مؤكدًا؟',
    a: 'بعد **٥ كتل** تأكيد على الأقل (قابلة للضبط). هذا يحمي السجل من انقلاب السلسلة (reorg). '
      + 'حتى ذلك الحين تظهر حالة «بانتظار التأكيد».',
    en: {
      q: 'When is a donation considered confirmed?',
      a: 'After at least 5 confirmation blocks (configurable) — this protects the log against a chain reorg. '
        + 'Until then the status shows "pending".',
    },
    kw: ['تاكيد', 'كتل', 'confirm', 'reorg', 'blocks'],
  },
  {
    id: 'wrong-amount',
    tags: ['donate', 'safety'],
    q: 'تبرّعت بمبلغ خاطئ — ماذا أفعل؟',
    a: 'المبلغ وصل بالفعل ولا يمكن التراجع عنه. تواصل معنا فورًا عبر الدعم مع رابط المعاملة: '
      + 'قد نتمكن من مطالبة الجهة المستفيدة بردّ المبلغ من محفظتها (بقرارها).',
    en: {
      q: 'I donated the wrong amount — what now?',
      a: 'The transfer is final. Contact support immediately with the transaction link: we may be able to ask '
        + 'the beneficiary to return the amount from their own wallet (at their discretion).',
    },
    kw: ['مبلغ', 'غلط', 'خطأ', 'wrong amount', 'mistake'],
  },
  {
    id: 'no-campaign-found',
    tags: ['basics'],
    q: 'لا أجد الحملة التي أبحث عنها',
    a: 'ابحث بالكلمات المفتاحية في «اكتشف الحملات»، أو جرّب فئة أخرى. الحملات الجديدة غير المعتمدة لا تظهر. '
      + 'إن كنت صاحب الحملة، سجّل الدخول لتظهر في «حسابي».',
    en: {
      q: 'I can’t find the campaign I’m looking for',
      a: 'Search by keywords in Discover, or try another category. Unapproved new campaigns are not listed. '
        + 'If it is yours, sign in and look under My account.',
    },
    kw: ['لا اجد', 'بحث', 'مختفي', 'find', 'search'],
  },
  {
    id: 'donation-receipt',
    tags: ['donate', 'technical'],
    q: 'أين إثبات التبرّع؟',
    a: 'في صفحة الحملة: سجل التبرعات يعرض المبلغ ورابط المعاملة على مستكشف الكتل. '
      + 'هذا رابط مستقل تمامًا — يمكنك التحقق منه بنفسك دون الثقة بالمنصة.',
    en: {
      q: 'Where is the donation receipt?',
      a: 'On the campaign page: the donation log shows the amount and a link to the block explorer. '
        + 'It is an independent link — you can verify it without trusting the platform.',
    },
    kw: ['ايصال', 'اثبات', 'سجل', 'receipt', 'proof'],
  },
  {
    id: 'privacy-data',
    tags: ['privacy'],
    q: 'ما البيانات التي تحفظونها؟',
    a: 'العنوان العام المرتبط بتبرعاتك (وهو معلن على الشبكة)، واسم اختياري ورسالة اختيارية، وسجل تبرعات الحملة. '
      + 'لا نخزّن Seeds ولا مفاتيح خاصة ولا نشارك البيانات مع أطراف ثالثة.',
    en: {
      q: 'What data do you store?',
      a: 'The public address linked to your donations (public on-chain anyway), an optional name and '
        + 'message, and the campaign donation log. No seed phrases, no private keys, no sharing with third parties.',
    },
    kw: ['خصوصية', 'بيانات', 'privacy', 'data', 'تخزين'],
  },
  {
    id: 'support',
    tags: ['basics'],
    q: 'كيف أتواصل مع الدعم؟',
    a: 'راسلنا على <%= supportEmail %> مع رابط المعاملة أو رابط الحملة. '
      + 'نردّ عادةً خلال ٢٤ ساعة، ونتحقق من هوية مرسل الطلب قبل مناقشة تفاصيل التبرّع.',
    en: {
      q: 'How do I contact support?',
      a: 'Email us with the transaction or campaign link. We usually reply within 24 hours and verify the '
        + 'sender’s identity before discussing donation details.',
    },
    kw: ['دعم', 'مساعدة', 'اتصال', 'support', 'contact', 'help'],
  },

  // ---------- محفظة与技术 ----------
  {
    id: 'no-wallet',
    tags: ['donate', 'account'],
    q: 'لا أملك محفظة — كيف أتبرّع؟',
    a: 'تحتاج محفظة رقمية (تطبيق) على أي شبكة مدعومة — أو أرسل المبلغ كـ transfer عادي من محفظة شخص آخر. '
      + 'لا تحتاج محفظة متصفح بالضرورة: انسخ عنوان الجهة المستفيدة وأرسل المبلغ من تطبيقك، ثم سجّل hash المعاملة.',
    en: {
      q: 'I have no wallet — how do I donate?',
      a: 'You need a digital wallet app for any supported network — or send a normal transfer from someone '
        + 'else’s wallet. A browser wallet is optional: copy the beneficiary address, send from your app, '
        + 'then submit the transaction hash.',
    },
    kw: ['محفظة', 'لا املك', 'بدون', 'wallet', 'محفظه'],
  },
  {
    id: 'wallet-not-connected',
    tags: ['donate', 'account'],
    q: 'المتصفح يقول «المحفظة غير متصلة»',
    a: 'افتح تطبيق المحفظة (MetaMask أو ما يماثله) وتأكد أنه متصل بشبكة الحملة. '
      + 'إن رفض المتصفح الاتصال، جرّب متصفحًا آخر أو أرسل المبلغ من تطبيق محفظتك.',
    en: {
      q: 'The browser says “wallet not connected”',
      a: 'Open your wallet extension and make sure it is unlocked and on the campaign’s network. If the browser '
        + 'blocks it, try another browser or send from your wallet app.',
    },
    kw: ['متصل', 'اتصال', 'connect', 'محفظة', 'wallet', 'لا تفتح'],
  },
  {
    id: 'insufficient-funds',
    tags: ['donate'],
    q: 'المعاملة فشلت برصيد غير كافٍ',
    a: 'رصيد محفظتك لا يغطي المبلغ + رسوم gas. زد الرصيد أو انقل مبلغًا أصغر. '
      + 'على Base/BSC التكلفة أقل من ٠٫٠١ دولار عادةً، فالمشكلة غالبًا في حجم المبلغ نفسه.',
    en: {
      q: 'The transaction failed with insufficient funds',
      a: 'Your wallet balance does not cover the amount plus gas. Top up or send a smaller amount. '
        + 'On Base/BSC gas is usually under $0.01, so the amount itself is the issue.',
    },
    kw: ['رصيد', 'كافي', 'نفد', 'insufficient', 'funds', 'balance', 'فشل'],
  },
  {
    id: 'tx-pending',
    tags: ['donate', 'technical'],
    q: 'تبرّعت لكن التبرّع لم يظهر بعد',
    a: 'الحالة تُقرأ من السلسلة، والمعالجة تحتاج **٥ كتل تأكيد** (حوالي ١٥ ثانية على Base). '
      + 'إذا تجاوزت المدة، تأكد من أن الـ hash صحيح وأن المعاملة نجحت في محفظتك (Receiver/Awaiting).',
    en: {
      q: 'I donated but it does not show yet',
      a: 'Status comes from the chain and needs 5 confirmation blocks (about 15 seconds on Base). If it takes '
        + 'longer, check that the hash is correct and the transaction succeeded in your wallet.',
    },
    kw: ['ما ظهر', 'لم يظهر', 'معلق', 'pending', 'تأخر', 'مشكلة', 'دفعت'],
  },
  {
    id: 'approve-failed',
    tags: ['donate'],
    q: 'فشلت خطوة الموافقة (approve)',
    a: 'قد تكون ما زلت تستخدم نفس الرصيد في معاملة أخرى، أو أن المحفظة رفضت الطلب. '
      + 'أعد المحاولة، وتأكد من أن الرصيد يكفي المبلغ + gas.الموافقة تُطلب بمقدار التبرّع بالضبط.',
    en: {
      q: 'The approve step failed',
      a: 'The same balance may be locked in another pending transaction, or the wallet rejected the request. '
        + 'Retry and make sure the balance covers amount + gas. The approval is for the exact donation amount.',
    },
    kw: ['approve', 'موافقة', 'فشل', 'رفض', 'failed', 'اذن'],
  },
  {
    id: 'gas-price',
    tags: ['donate', 'money'],
    q: 'رسوم gas مرتفعة اليوم',
    a: 'الغاز يتذبذب حسب ازدحام الشبكة. اختر شبكة أرخص (Base أو BSC بدل Ethereum) أو انتظر. '
      + 'لا يمكن للمنصة_fix الأسعار — المحفظة هي من تحدّدها وقت التأكيد.',
    en: {
      q: 'Gas is expensive right now',
      a: 'Gas fluctuates with network congestion. Pick a cheaper network (Base or BSC instead of Ethereum) or '
        + 'wait. The platform cannot override the price — your wallet sets it at confirmation time.',
    },
    kw: ['gas', 'غاز', 'expensive', 'غالي', 'سعر', 'price'],
  },
  {
    id: 'donate-from-mobile',
    tags: ['donate'],
    q: 'هل أستطيع التبرّع من الهاتف؟',
    a: 'نعم — الموقع يعمل على الجوال، أو استخدم تطبيق محفظتك مباشرة: انسخ عنوان الجهة المستفيدة '
      + 'وأرسل المبلغ، ثم سجّل الـ hash في الموقع ليظهر تبرّعك في السجل.',
    en: {
      q: 'Can I donate from my phone?',
      a: 'Yes — the site works on mobile, or use your wallet app directly: copy the beneficiary address, '
        + 'send, then submit the hash so the donation shows in the log.',
    },
    kw: ['جوال', 'موبايل', 'هاتف', 'mobile', 'phone', 'تطبيق'],
  },
  {
    id: 'browser-support',
    tags: ['basics'],
    q: 'أي المتصفحات مدعومة؟',
    a: 'أي متصفح حديث يدعم `localStorage` و Web3: Chrome، Edge، Firefox، Brave، Safari. '
      + 'للمحفظة تحتاج إضافة متصفح أو تطبيق جوال.',
    en: {
      q: 'Which browsers are supported?',
      a: 'Any modern browser with localStorage and Web3: Chrome, Edge, Firefox, Brave, Safari. '
        + 'For the wallet you need a browser extension or a mobile app.',
    },
    kw: ['متصفح', 'browser', 'safari', 'chrome', 'firefox', 'متوافق'],
  },

  // ---------- التبرّع deeper ----------
  {
    id: 'donate-to-self',
    tags: ['donate'],
    q: 'هل يمكنني التبرّع لحمالي؟',
    a: 'نعم تقنيًا، لكنه لا يُحتسب كتبرّع toward الهدف الأساسي للمنصة (وما زال يدفع رسوم المنصة). '
      + 'إن أردت دعم حملة تجريبية فاستخدم عنوانًا تجريبيًا في بيئة الاختبار.',
    en: {
      q: 'Can I donate to myself?',
      a: 'Technically yes, but it does not count as a donation toward the campaign goal (and the platform fee '
        + 'still applies). For a dry run, use a test address on the test network.',
    },
    kw: ['نفسي', 'حالي', 'myself', 'self', 'تجريبي', 'test'],
  },
  {
    id: 'who-sees',
    tags: ['donate', 'privacy'],
    q: 'من يرى تبرّعي؟',
    a: 'العنوان العام والنتيجة ظاهران في صفحة الحملة (وهما علنيان على الشبكة). '
      + 'الاسم الذي تكتبه اختياري، ويمكن إخفاؤه. ولا تُشارك بياناتك مع أي طرف ثالث.',
    en: {
      q: 'Who can see my donation?',
      a: 'Your public address and the amount appear on the campaign page (both are public on-chain). '
        + 'The name you type is optional and can be hidden. No data is shared with third parties.',
    },
    kw: ['من يرى', 'شوف', 'يعرف', 'see', 'visible', 'عام', 'public'],
  },
  {
    id: 'how-long-appear',
    tags: ['donate'],
    q: 'كم يستغرق ظهور التبرّع؟',
    a: 'دقائق: ٥ كتل تأكيد + تحديث سجل الصفحة. لو تجاوزت ١٠ دقائق، راجع الدعم مع الـ hash.',
    en: {
      q: 'How long until my donation appears?',
      a: 'Minutes: 5 confirmation blocks plus a log refresh. If it takes more than 10 minutes, contact support '
        + 'with the hash.',
    },
    kw: ['كم يستغرق', 'متى يظهر', 'how long', 'appear', 'وقت'],
  },
  {
    id: 'min-donation',
    tags: ['donate'],
    q: 'هل يوجد حد أدنى للتبرّع؟',
    a: 'لا حد أدنى في المنصة. لكن المبالغ الصغيرة جدًا قد لا تغطي رسوم gas — أي قد تُرفض الشبكة المعاملة. '
      + 'الحد الاقتصادي عادةً بضعة دولارات على Base/BSC.',
    en: {
      q: 'Is there a minimum donation?',
      a: 'No platform minimum. But very small amounts may not cover gas and get rejected by the network. '
        + 'The practical floor is a few dollars on Base/BSC.',
    },
    kw: ['حد ادنى', 'اقبل', 'minimum', 'small', 'صغير'],
  },
  {
    id: 'fee-fixed-or-percent',
    tags: ['fees'],
    q: 'هل الرسوم مبلغ ثابت أم نسبة؟',
    a: '**نسبة** من قيمة التبرّع،而且 **متدرّجة**: كلما زاد المبلغ انخفضت النسبة. لا رسوم ثابتة ولا رسوم اشتراك.',
    en: {
      q: 'Is the fee a fixed amount or a percentage?',
      a: 'A percentage of the donation amount, and it is tiered: the bigger the amount, the lower the rate. '
        + 'No flat fee, no subscription.',
    },
    kw: ['ثابت', 'مبلغ', 'نسبة', 'fixed', 'flat', 'percent', 'اشتراك'],
  },
  {
    id: 'change-fee-tiers',
    tags: ['fees'],
    q: 'هل يمكن للمنصة أن ترفع الرسوم بعد النشر؟',
    a: 'لا يمكن تجاوز الحد الأقصى المعلن (٩٪) لأنه `immutable` داخل العقد. '
      + 'وحدود الشرائح (٢٠٠/٣٠٠/٤٠٠) تُضبط دوريًا فقط ضمن هذا السقف. أي تبرّع تُسجَّل نسبته الفعلية على السلسلة.',
    en: {
      q: 'Can the platform raise the fees later?',
      a: 'The published maximum (9%) cannot be exceeded because it is immutable in the contract. '
        + 'Only the tier thresholds are adjusted periodically, within that ceiling. Every donation records the '
        + 'actual rate applied on-chain.',
    },
    kw: ['ترفع', 'تغيير الرسوم', 'increase', 'raise', 'fees', 'tier', 'شريحة'],
  },
  {
    id: 'why-9-percent',
    tags: ['fees'],
    q: 'لماذا ٩٪ وليس أقل؟',
    a: 'لأن المنصة تغطي تشغيلها ومراجعتها (بما فيها المراجعة اليدوية للحملات) وتكلفة البنية التحتية. '
      + 'كلما زاد تبرّعك انخفضت النسبة (حتى ٣٪)، ولا توجد أي رسوم خفية أخرى غير gas.',
    en: {
      q: 'Why 9% and not less?',
      a: 'It covers operations, including manual campaign review and infrastructure. The bigger your donation, '
        + 'the lower the rate (down to 3%), and there are no hidden fees beyond gas.',
    },
    kw: ['ليش', 'لماذا', 'why', '9', 'نسبة', 'كثير'],
  },
  {
    id: 'usd-currency',
    tags: ['basics', 'money'],
    q: 'لماذا الأهداف بالدولار؟',
    a: 'لأن الدولار هو المرجع المشترك بينщо负重 — الهدف يُعرض بالدولار ويُقارن بمحصّل التبرعات '
      + 'الذي يُحسب بسعر الصرف اللحظي من مصادر عامة.',
    en: {
      q: 'Why are goals in USD?',
      a: 'USD is the common reference: goals are shown in dollars and compared with the raised total, which is '
        + 'computed at the live exchange rate from public sources.',
    },
    kw: ['دولار', 'عملة', 'usd', 'dollar', 'اسعار', 'العملة'],
  },
  {
    id: 'price-source',
    tags: ['money', 'technical'],
    q: 'من أين تأتي أسعار التحويل؟',
    a: 'من مصدرين عامّين مع تبديل تلقائي عند فشل الأول (CoinGecko ثم Coinbase)، مع كاش ٦٠ ثانية. '
      + 'إن تعذّر السعر تُعرض القيمة «غير متاحة» بدل رقم تقديري.',
    en: {
      q: 'Where do the exchange rates come from?',
      a: 'Two public sources with automatic failover (CoinGecko then Coinbase), cached for 60 seconds. '
        + 'If the price is unavailable, the value shows as "unavailable" rather than a made-up number.',
    },
    kw: ['سعر', 'اسعار', 'مصدر', 'price', 'rate', 'coingecko', 'تبديل'],
  },

  // ---------- الحملات ----------
  {
    id: 'edit-campaign',
    tags: ['campaign'],
    q: 'هل يمكنني تعديل الحملة بعد نشرها؟',
    a: 'نعم: العنوان والقصة والهدف والتحديثات (من لوحة الحملة). '
      + '**محفظة الجهة المستفيدة لا تُعدَّل من المنصة** — إن احتجت تغييرها فتوقّعها من محفظتك، '
      + 'والعقد يسمح لمنظّم الحملة وحده.',
    en: {
      q: 'Can I edit my campaign after publishing?',
      a: 'Yes: title, story, goal and updates (from the campaign dashboard). The beneficiary wallet cannot be '
        + 'changed by the platform — if you need to, sign it from your own wallet, which is the only path the '
        + 'contract allows.',
    },
    kw: ['تعديل', 'اعدّل', 'edit', 'تغيير', 'بعد النشر'],
  },
  {
    id: 'change-goal',
    tags: ['campaign'],
    q: 'هل يمكنني تغيير الهدف؟',
    a: 'نعم، من لوحة الحملة. لكن ارفعه بواقعية — الهدف جزء من ثقة المتبرّعين. '
      + 'التبرّعات السابقة تبقى محسوبة كما هي.',
    en: {
      q: 'Can I change the goal?',
      a: 'Yes, from the campaign dashboard — but keep it realistic, since the goal is part of donors’ trust. '
        + 'Previous donations keep counting as they are.',
    },
    kw: ['هدف', 'الهدف', 'goal', 'تغيير', 'رفع', 'increase goal'],
  },
  {
    id: 'delete-campaign',
    tags: ['campaign'],
    q: 'هل يمكنني حذف حملتي؟',
    a: 'نعم، من لوحة الحملة (أو راسل الدعم). **الحذف لا يُرجع أموالًا** — التبرّعات التي وصلت '
      + 'تبقى على الشبكة وتذهب إلى محفظة الجهة المستفيدة.',
    en: {
      q: 'Can I delete my campaign?',
      a: 'Yes, from the dashboard (or contact support). Deleting does not return money: donations already made '
        + 'stay on-chain and go to the beneficiary wallet.',
    },
    kw: ['حذف', 'احذف', 'delete', 'remove', 'شيل'],
  },
  {
    id: 'multiple-campaigns',
    tags: ['campaign'],
    q: 'هل يمكنني إنشاء أكثر من حملة؟',
    a: 'نعم، بعد مراجعة كل حملة من قائمة المراجعة. كل حملة لها محفظتها المستفيدة ورقمها في العقد.',
    en: {
      q: 'Can I create more than one campaign?',
      a: 'Yes, after each campaign passes the review queue. Each campaign has its own beneficiary wallet and '
        + 'its own id in the contract.',
    },
    kw: ['اكثر من حملة', 'حملتين', 'multiple', 'several', 'اكثر'],
  },
  {
    id: 'contact-organizer',
    tags: ['campaign', 'donate'],
    q: 'كيف أوصل إلى منظّم الحملة؟',
    a: 'اكتب رسالة من نافذة التبرّع (تُحفظ في سجل الحملة) أو اترك تعليقًا. '
      + 'لا نشارك بيانات المتبرّعين ولا نوفّر قنوات مباشرة.',
    en: {
      q: 'How do I reach the campaign organizer?',
      a: 'Write a message in the donation window (it is stored in the campaign log) or leave a comment. '
        + 'We do not share donor details or provide direct channels.',
    },
    kw: ['المنظم', 'تواصل', 'اتصال', 'organizer', 'contact', 'رسالة'],
  },
  {
    id: 'withdraw-funds',
    tags: ['campaign', 'money'],
    q: 'كيف يسحب المنظّم الأموال؟',
    a: 'الأموال **تصل مباشرة** إلى محفظة الجهة المستفيدة — لا حاجة لسحب ولا الرصيد محفوظ عند المنصة. '
      + 'المحفظة هي التي تدير التحويل (وتحتاج شبكة ورصيدًا وgas).',
    en: {
      q: 'How does the organizer withdraw the money?',
      a: 'The money lands directly in the beneficiary wallet — there is nothing to withdraw and no balance held '
        + 'by the platform. The wallet manages the transfer (and needs network access, balance and gas).',
    },
    kw: ['سحب', 'اسحب', 'withdraw', 'رصيد', 'تحويل', 'فلوس', 'reach'],
  },
  {
    id: 'report-campaign',
    tags: ['safety'],
    q: 'كيف أبلّغ عن حملة مشبوهة؟',
    a: 'راسل الدعم برابط الحملة ووصف المشكلة. لوحة الكولكتر تستطيع إيقاف الحملة فورًا، '
      + 'والتحقق منها يتم عبر عنوان المحفظة على المستكشف.',
    en: {
      q: 'How do I report a suspicious campaign?',
      a: 'Contact support with the campaign link and what looks wrong. The collector dashboard can pause a '
        + 'campaign immediately, and verification is done through the wallet address on an explorer.',
    },
    kw: ['ابلغ', 'اشك', 'احتيال', 'report', 'suspicious', 'مشبوه'],
  },
  {
    id: 'proof-for-charity',
    tags: ['campaign', 'safety'],
    q: 'كيف أثبت أن الجهة المستفيدة حقيقية؟',
    a: 'اطلب رابط_curve إلى وثائقتها (سجل تجاري/جمعوية/جهة رسمية) — راجعها على مستكشف الكتل. '
      + 'شارة «موثّق» تعني أن فريق المنصة راجع مستندات محدّدة، وليست ضمانًا للنتائج.',
    en: {
      q: 'How do I verify the beneficiary is real?',
      a: 'Ask for links to their documents (registry, association, official body) and check them on a block '
        + 'explorer. The "verified" badge means the team reviewed specific documents, not a guarantee of outcomes.',
    },
    kw: ['اثبت', 'جثه', 'موثوق', 'prove', 'verify', 'real', 'اوراق'],
  },
  {
    id: 'why-review',
    tags: ['safety', 'campaign'],
    q: 'لماذا كل حملة تحتاج مراجعة؟',
    a: 'لأن المنصة لا تطبّق KYC، فالمراجعة اليدوية هي خط الدفاع ضد حملات الاحتيال. '
      + 'الحملات التي تُراجع بسرعة غالبًا تكون سليمة، والمراجعة تحمي المتبرّعين من طلبات النصب.',
    en: {
      q: 'Why does every campaign need review?',
      a: 'Because the platform does not run KYC, manual review is the main defense against scam campaigns. '
        + 'Fast-reviewed campaigns are usually fine, and the queue protects donors.',
    },
    kw: ['ليش مراجعة', 'مراجعه', 'why review', 'قائمة', 'queue'],
  },
  {
    id: 'delete-account',
    tags: ['account', 'privacy'],
    q: 'كيف أحذف حسابي؟',
    a: 'راسل الدعم بطلب الحذف — نحذف حسابك وسجلّك من المنصة. '
      + '**بيانات التبرّع تبقى على الشبكة العامة** ولا يمكن حذفها منها (لأنها ليست أرشيفنا).',
    en: {
      q: 'How do I delete my account?',
      a: 'Contact support with a deletion request — we remove your account and records from the platform. '
        + 'Donation data remains on the public network, where it cannot be deleted (it is not our archive).',
    },
    kw: ['حذف حسابي', 'احذف الحساب', 'delete account', 'remove me'],
  },
  {
    id: 'api-access',
    tags: ['technical'],
    q: 'هل توجد واجهة برمجية (API)؟',
    a: 'نعم: مسارات JSON عامة للقراءة (الحملات، الأسعار، أرصدة المحافظ) + مسارات إدارية محمية. '
      + 'لا يوجد مفتاح API عام حاليًا — راسل الدعم إن احتجت التكامل برمجيًا.',
    en: {
      q: 'Is there an API?',
      a: 'Yes: public read-only JSON endpoints (campaigns, prices, wallet balances) plus protected admin '
        + 'endpoints. There is no public API key today — contact support if you need a programmatic integration.',
    },
    kw: ['api', 'واجهة برمجية', 'تكامل', 'api key', 'مفتاح', 'api key'],
  },
  {
    id: 'notification',
    tags: ['account'],
    q: 'هل تصلني إشعارات عند تبرّع أحد؟',
    a: 'لا إشعارات بريد إلكتروني حاليًا. تابع سجل الحملة من لوحة المنظّم — يُحدَّث فور تأكيد المعاملة.',
    en: {
      q: 'Will I get notified when someone donates?',
      a: 'No email notifications at the moment. Follow the campaign log from the organizer dashboard — it updates '
        + 'as soon as a transaction confirms.',
    },
    kw: ['اشعار', 'تنبيه', 'ايميل', 'بريد', 'notification', 'email', 'alert'],
  },
  {
    id: 'promote-campaign',
    tags: ['campaign'],
    q: 'كيف أروّج لحملتي؟',
    a: 'شارك رابط الحملة (زر «نسخ الرابط») على واتساب وتيليغرام ولينكدإن. '
      + 'الحملات الموثّقة تحصل على أولوية أعلى في نتائج البحث.',
    en: {
      q: 'How do I promote my campaign?',
      a: 'Share the campaign link (the copy-link button) on WhatsApp, Telegram and LinkedIn. '
        + 'Verified campaigns get higher priority in search results.',
    },
    kw: ['روّج', 'ترويج', 'شارك', 'promote', 'share', 'نشر', 'تسويق'],
  },
];

const CATEGORIES = {
  basics: { ar: 'أساسيات', en: 'Basics' },
  donate: { ar: 'التبرّع', en: 'Donating' },
  fees: { ar: 'الرسوم', en: 'Fees' },
  money: { ar: 'المال والضريبة', en: 'Money & tax' },
  safety: { ar: 'الأمان والاحتيال', en: 'Safety & scams' },
  campaign: { ar: 'إنشاء الحملات', en: 'Creating campaigns' },
  account: { ar: 'الحساب والدخول', en: 'Account & sign-in' },
  technical: { ar: 'تقني', en: 'Technical' },
  privacy: { ar: 'الخصوصية', en: 'Privacy' },
  legal: { ar: 'قانوني', en: 'Legal' },
  networks: { ar: 'الشبكات', en: 'Networks' },
};

/* أسئلة مقترحة — أكثر ما يخطر للمستخدم */
const SUGGESTED = [
  'كم رسوم المنصة؟',
  'هل يمكن استرداد التبرّع؟',
  'كيف يصل المال إلى الجهة المستفيدة؟',
  'على أي شبكات أتبرّع؟',
  'كيف أحمي نفسي من الاحتيال؟',
  'لماذا لا أستطيع وضع عنوان محفظة في وصف الحملة؟',
  'ما الفرق بين موثّق ومصرّح به ذاتيًا؟',
  'هل يمكن تغيير محفظة الجهة المستفيدة؟',
  'لماذا حملتي لا تظهر في القائمة؟',
  'هل التبرّع بالعملات الرقمية يخضع للضريبة؟',
  'ما طرق الدخول المتاحة؟',
  'أين إثبات التبرّع؟',
  'كيف أتبرّع لو لا أملك محفظة متصفح؟',
  'هل التبرّع آمن؟',
];

module.exports = { FAQ, CATEGORIES, SUGGESTED };
