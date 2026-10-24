/* فحص سريع: أي إجابة يُعيدها المساعد لكل سؤال (وهل هو البند الصحيح) */
const assistant = require('../src/lib/assistant');

const CASES = [
  ['كيف اسحب الفلوس من الحملة؟', 'withdraw-funds'],
  ['ليش ما اقدر احط عنوان محفظة بالوصف؟', 'no-wallet-in-text'],
  ['كم رسوم المنصة؟', 'fee-tier'],
  ['هل يمكن استرداد التبرع؟', 'refunds'],
  ['ايش الشبكات المدعومة؟', 'networks'],
  ['كيف احمي نفسي من الاحتيال', 'scam-warning'],
  ['ما الفرق بين موثق ومصرح به ذاتيا', 'verify-badge'],
  ['كيف اغير محفظة الجهة المستفيدة', 'change-wallet'],
  ['لماذا حملتي لا تظهر في القائمة؟', 'review-queue'],
  ['هل التبرع بالعملات الرقمية يخضع للضريبة؟', 'tax'],
  ['ما طرق الدخول المتاحة؟', 'account-types'],
  ['أين اثبات التبرع؟', 'donation-receipt'],
  ['كيف اتبرع لو لا املك محفظة متصفح؟', 'wallet-options'],
  ['كيف احذف حسابي؟', 'delete-account'],
  ['كيف اعدل الهدف؟', 'change-goal'],
  ['هل يوجد حد ادنى للتبرع؟', 'min-donation'],
  ['تبرعت ولم يظهر', 'tx-pending'],
  ['المعاملة فشلت برصيد غير كافٍ', 'insufficient-funds'],
  ['كيف ابعث رسالة للمنظم؟', 'contact-organizer'],
  ['هل يوجد واجهة برمجية API؟', 'api-access'],
];

(async () => {
  let ok = 0;
  const failures = [];
  for (const [q, expectedId] of CASES) {
    const r = await assistant.answer(q, 'ar');
    const topId = r.sources[0]?.id || null;
    const hit = topId === expectedId;
    if (hit) ok += 1;
    else failures.push(`[${expectedId}] got=${topId} conf=${r.confidence} q="${q}"`);
    console.log(`${hit ? 'OK  ' : 'FAIL'} ${q} -> ${topId} (expected ${expectedId}) conf=${r.confidence} mode=${r.mode}`);
  }
  console.log(`\nACCURACY: ${ok}/${CASES.length}`);
  if (failures.length) {
    console.log('FAILURES:');
    for (const f of failures) console.log('  ' + f);
  }
})();
