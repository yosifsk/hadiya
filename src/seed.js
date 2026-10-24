/* بيانات تجريبية: ١٢ حملة نموذجية بمحتوى أصلي.
   التشغيل: npm run seed  */

const models = require('./models');
const { setSetting, getSetting, one } = require('./db');
const brand = require('../config/brand');
const CAMPAIGNS_EN = require('./seed-en');

const demoAddress = (seed) => {
  const hex = seed.toLowerCase().replace(/[^0-9a-f]/g, '') || '1';
  return '0x' + hex.padEnd(40, hex.slice(-1)).slice(0, 40);
};

const CAMPAIGNS = [
  {
    title: 'علاج طارئ لمريضة سرطان',
    subtitle: 'ثلاث جلسات كيميائية تحتاجها خلال شهر، والمبلغ يصل مباشرة إلى محفظة العائلة.',
    story: `تعالج هذه الحملة أمًا لثلاثة أطفال بعد تشخيص سرطان الثدي.
تحتاج ثلاث جلسات كيميائية متتالية، وكل جلسة تتجاوز أربعمئة دولار، والتأمين لم يغطي بعد.
المبلغ يُحوَّل مباشرة إلى محفظة العائلة التي تدير العلاج، وكل تبرع يظهر في سجل الصفحة مع رابط معاملة يمكن التحقق منه.`,
    category: 'medical',
    goal_usd: 6500,
    accent: 'emerald',
    token_symbol: 'USDC',
    chain_id: 8453,
    organizer_name: 'عائلة الحاج',
    country: 'Somalia',
    charity_wallet: demoAddress('a11ce'),
  },
  {
    title: 'إعادة بناء سقف بيت عائلة نازحة',
    subtitle: 'سقف متهدم بعد المطر، والتبرع يذهب مباشرة إلى حساب مواد البناء.',
    story: `بعد أمطار الشتاء تضرر سقف بيت عائلة نازحة بالكامل.
الفاتورة الأولية للمواد والأجور والحرفيين حوالي أربعة آلاف وثمانمئة دولار.
التبرعات تُجمع على العنوان المعلن أدناه وتُصرف من قبل جمعية محلية، مع نشر صور العمل أسبوعيًا في تحديثات الصفحة.`,
    category: 'community',
    goal_usd: 4800,
    accent: 'amber',
    token_symbol: 'USDC',
    chain_id: 8453,
    organizer_name: 'جمعية الجيران',
    country: 'Jordan',
    charity_wallet: demoAddress('b22cf'),
  },
  {
    title: 'مستلزمات طبية لمركز رعاية المسنّين',
    subtitle: 'أجهزة قياس ضغط وأكسجين محمول لأربعة عشر أسيرًا.',
    story: `يعمل المركز على مدار الساعة في خدمة أربعة عشر مسنًا.
القائمة المطلوبة: أجهزة قياس ضغط، أسطوانات أكسجين محمولة، سماعات فحص، وحقنة أنسولين.
المبالغ تُصرف من محفظة المركز مباشرة مع فاتورة شراء معلنة في التحديثات.`,
    category: 'medical',
    goal_usd: 3200,
    accent: 'blue',
    token_symbol: 'ETH',
    chain_id: 8453,
    organizer_name: 'مركز الرعاية',
    country: 'Egypt',
    charity_wallet: demoAddress('c33d0'),
  },
  {
    title: 'تعليم أربعين طفلًا عن بُعد',
    subtitle: 'أجهزة لوحية ودروس عبر الإنترنت لإتمام المرحلة الأولى.',
    story: `برنامج مسائي لمدة ثمانية أشهر لأربعين طفلًا في منطقة بعيدة عن المدارس.
المطلوب: أربعون جهازًا لوحيًا، واشتراك إنترنت لثمانية أشهر، وكتب مطبوعة.
التوزيع يتم وفق قائمة أعدّها مركز الرعاية.`,
    category: 'education',
    goal_usd: 5200,
    accent: 'blue',
    token_symbol: 'USDC',
    chain_id: 8453,
    organizer_name: 'مؤسسة تعلّم',
    country: 'Palestine',
    charity_wallet: demoAddress('d44e1'),
  },
  {
    title: 'طعام لأسرتين بعد انقطاع الطريق',
    subtitle: 'مؤن شهرية تُشحن مباشرة إلى المستفيدين.',
    story: `انقطع الطريق لثلاثة أسابيع بسبب الأمطار والسيول.
نطلب مؤنًا شهرية لأسرتين: أرز، طحين، زيت، سكر، مصادر بروتين، وخضار مطبوخة.
التوصيل يتم عبر شبكة المتطوعين، وتُوثَّق صور التسليم في التحديثات.`,
    category: 'emergency',
    goal_usd: 2400,
    accent: 'rose',
    token_symbol: 'USDT',
    chain_id: 137,
    organizer_name: 'فريق الإغاثة',
    country: 'Lebanon',
    charity_wallet: demoAddress('e55f2'),
  },
  {
    title: 'إطعام حيوانات ملجأ سايد',
    subtitle: 'طعام وعلاج وحملات تبنٍّ، والتبرع يصل إلى الملجأ مباشرة.',
    story: `في الملجأ مئتا وثمانون حيوانًا.
التبرع يذهب إلى محفظة الملجأ لشراء الطعام والعلاج وإجراءات التعقيم، ويظهر صرف كل دفعة في سجل الصفحة.`,
    category: 'animal',
    goal_usd: 1900,
    accent: 'amber',
    token_symbol: 'USDC',
    chain_id: 8453,
    organizer_name: 'ملجأ الحيوانات',
    country: 'Tunisia',
    charity_wallet: demoAddress('f66a3'),
  },
  {
    title: 'زراعة خمسمائة شتلة على أرض عشبية',
    subtitle: 'أشجار برية ومراقبة نمو لتمد الغابات.',
    story: `مشروع تشريعي لزراعة خمسمائة شتلة على أرض عشبية في ضواحي مدينة كبيرة.
يشمل المشروع أنابيب ريّ وأدوات تتبّع، مع صور شهرية لنمو الأشجار.`,
    category: 'environment',
    goal_usd: 4100,
    accent: 'emerald',
    token_symbol: 'ETH',
    chain_id: 8453,
    organizer_name: 'مبادرة خضراء',
    country: 'Iraq',
    charity_wallet: demoAddress('077b4'),
  },
  {
    title: 'ترميم مقبرة تاريخية',
    subtitle: 'تنظيف وترميم قبر مئوي سنة.',
    story: `مقبرة قديمة تحتاج ترميمًا كاملًا: تنظيف، ترميم الجدران، إضاءة، ولوحات توضيحية.
يعمل فريق الترميم على الموقع، وتُوثَّق مراحل العمل في تحديثات الصفحة.`,
    category: 'faith',
    goal_usd: 5600,
    accent: 'blue',
    token_symbol: 'USDC',
    chain_id: 8453,
    organizer_name: 'هيئة الترميم',
    country: 'Morocco',
    charity_wallet: demoAddress('188c5'),
  },
  {
    title: 'منحة دراسية لطلاب هندسة',
    subtitle: 'رسوم السنة الأولى لستة طلاب متفوقين من الأسر محدودة الدخل.',
    story: `رسوم التسجيل والكتب والإقامة في السكن الجامعي تغطي سنة كاملة لكل طالب.
يُختار ستة طلاب كل عام على أساس المعدل والظرف الاجتماعي.`,
    category: 'education',
    goal_usd: 7400,
    accent: 'emerald',
    token_symbol: 'USDC',
    chain_id: 8453,
    organizer_name: 'صندوق الطلاب',
    country: 'Sudan',
    charity_wallet: demoAddress('299d6'),
  },
  {
    title: 'تأهيل طبي بعد عملية جراحية',
    subtitle: 'جلسات علاج طبيعي لمصابين اثنين.',
    story: `بعد عملية جراحية يحتاج مصابان جلسات علاج طبيعي مكثفة على مدى ثلاثة أشهر.
المبلغ يذهب إلى العيادة التي تنفّذ البرنامج.`,
    category: 'medical',
    goal_usd: 3100,
    accent: 'rose',
    token_symbol: 'USDC',
    chain_id: 8453,
    organizer_name: 'فريق التأهيل',
    country: 'Yemen',
    charity_wallet: demoAddress('3aa07'),
  },
  {
    title: 'فرحة تخرج لأربعة طلاب',
    subtitle: 'رسوم التخرج ومعدات وحفل تكريم.',
    story: `أربعة طلاب يكملون الدراسة بعد سنوات من التوقف للعمل.
المطلوب تغطية رسوم التخرج ومعدات وحفل تكريم بسيط.`,
    category: 'community',
    goal_usd: 1800,
    accent: 'amber',
    token_symbol: 'ETH',
    chain_id: 8453,
    organizer_name: 'أصدقاء الطلاب',
    country: 'Algeria',
    charity_wallet: demoAddress('4bb18'),
  },
  {
    title: 'دعم رواد الأعمال الاجتماعية',
    subtitle: 'منحة صغيرة لثلاثة مشاريع ناشئة مع متابعة.',
    story: `منحة بخمسمائة دولار لكل رائد، مع متابعة لمدة ثلاثة أشهر وإرشاد قانوني.
يُختار المشاركون من المتقدمين عبر إعلان مفتوح.`,
    category: 'community',
    goal_usd: 1500,
    accent: 'blue',
    token_symbol: 'USDC',
    chain_id: 8453,
    organizer_name: 'حاضنة المشاريع',
    country: 'Algeria',
    charity_wallet: demoAddress('5cc29'),
  },
];

function seed() {
  const existing = one('SELECT COUNT(*) AS n FROM campaigns');
  if (existing && existing.n > 0) {
    console.log(JSON.stringify({ level: 'info', message: 'database already has campaigns - skipped', count: existing.n }));
    return;
  }

  const created = CAMPAIGNS.map((c, index) => {
    const en = CAMPAIGNS_EN[index] || {};
    const campaign = models.createCampaign({
      title: c.title,
      subtitle: c.subtitle,
      story: c.story,
      title_en: en.title_en || '',
      subtitle_en: en.subtitle_en || '',
      story_en: en.story_en || '',
      category: c.category,
      goal_usd: c.goal_usd,
      cover_url: '',
      accent: c.accent,
      organizer_name: c.organizer_name,
      organizer_wallet: demoAddress(`org${index}`),
      charity_wallet: c.charity_wallet,
      chain_id: c.chain_id,
      token_symbol: c.token_symbol,
      verification: index % 4 === 0 ? 'verified' : 'self_declared',
      country: c.country,
      status: 'active',
    });
    models.addUpdate(campaign.id, {
      title: 'انطلاق الحملة',
      body: 'بدأنا هذه الحملة بعد تواصل مباشر مع الجهة المستفيدة. كل تبرع يُحوَّل إلى محفظة الجهة مباشرة عبر عقد المقسّم، وستتم إضافة تحديثات دورية هنا.',
    });
    return campaign;
  });

  if (!getSetting('collector_address')) {
    setSetting('collector_address', demoAddress('c0113c'));
  }
  if (!getSetting('owner_address')) {
    setSetting('owner_address', demoAddress('0ff1e'));
  }

  console.log(JSON.stringify({
    level: 'info',
    message: 'seeded campaigns',
    count: created.length,
    brand: brand.name,
    collector_address: getSetting('collector_address'),
  }));
}

if (require.main === module) {
  seed();
}

module.exports = { seed };
