/* اختبارات المساعد الذكي وقاعدة المعرفة */

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const SUITE = 'assistant';
process.env.DATA_DIR = path.join(__dirname, '..', 'data', 'test', SUITE);
process.env.DB_FILE = path.join(__dirname, '..', 'data', 'test', SUITE, 'test.sqlite');

const assistant = require('../src/lib/assistant');
const { FAQ, SUGGESTED } = require('../src/lib/faq');

test('كل بند في قاعدة المعرفة له نص عربي وإنجليزي', () => {
  assert.ok(FAQ.length >= 30, 'عدد البنود');
  for (const entry of FAQ) {
    assert.ok(entry.q && entry.a, `${entry.id}: ar`);
    assert.ok(entry.en && entry.en.q && entry.en.a, `${entry.id}: en`);
    assert.ok(Array.isArray(entry.kw) && entry.kw.length, `${entry.id}: keywords`);
  }
});

test('لا تكرار في معرّفات البنود', () => {
  const ids = FAQ.map(e => e.id);
  assert.strictEqual(new Set(ids).size, ids.length);
});

test('الأسئلة المقترحة غير فارغة وتغطي مواضيع مختلفة', () => {
  assert.ok(SUGGESTED.length >= 10);
  assert.ok(SUGGESTED.some(q => /رسوم/.test(q)));
  assert.ok(SUGGESTED.some(q => /استرداد/.test(q)));
});

test('المساعد يجيب عن سؤال الرسوم', async () => {
  const r = await assistant.answer('كم رسوم المنصة؟', 'ar');
  assert.strictEqual(r.mode, 'kb');
  assert.ok(r.confidence > 0.5);
  assert.ok(/٩٪|9/.test(r.answer), 'الجواب يذكر النسبة');
  assert.ok(r.sources.length > 0);
});

test('المساعد يجيب عن الاسترداد والاحتيال', async () => {
  const refund = await assistant.answer('هل يمكن استرداد التبرع؟', 'ar');
  assert.strictEqual(refund.mode, 'kb');
  assert.ok(/استرداد/.test(refund.answer));

  const scam = await assistant.answer('كيف احمي نفسي من الاحتيال', 'ar');
  assert.ok(scam.confidence > 0.4);
  assert.ok(/تحقّق|تحقق/.test(scam.answer));
});

test('المساعد يفهم العامية الشامية', async () => {
  const r = await assistant.answer('ايش الشبكات المدعومة؟', 'ar');
  assert.ok(r.confidence > 0.4, `conf=${r.confidence}`);
  assert.ok(/Base|BSC|Polygon|Ethereum/.test(r.answer));
});

test('المساعد يختار الإجابة الإنجليزية عند lang=en', async () => {
  const r = await assistant.answer('how much is the platform fee?', 'en');
  assert.strictEqual(r.mode, 'kb');
  assert.ok(/fee|tier|9%|7%/i.test(r.answer));
});

test('سؤال غير ذي صلة → لا يخترع جوابًا', async () => {
  const r = await assistant.answer('zzzz totally unrelated qqq', 'ar');
  assert.strictEqual(r.mode, 'kb-miss');
  assert.ok(r.answer.length > 20);
  assert.strictEqual(r.confidence, 0);
});

test('سؤال فارغ', async () => {
  const r = await assistant.answer('', 'ar');
  assert.strictEqual(r.mode, 'empty');
});

test('النوايا: تحية وهوية وشكر', async () => {
  const hello = await assistant.answer('مرحبا', 'ar');
  assert.strictEqual(hello.mode, 'intent');
  assert.ok(/أهلًا|أهلاً/.test(hello.answer));

  const who = await assistant.answer('من انت', 'ar');
  assert.strictEqual(who.mode, 'intent');
  assert.ok(/هدية/.test(who.answer));

  const thanks = await assistant.answer('شكرا', 'ar');
  assert.strictEqual(thanks.mode, 'intent');
});

test('المرادفات: «فلوس» توجّه لأسئلة المال', async () => {
  const r = await assistant.answer('وين رايح فلوسي', 'ar');
  assert.notStrictEqual(r.mode, 'kb-miss');
});

test('أسئلة جديدة في قاعدة المعرفة', async () => {
  const cases = [
    ['كيف اسحب الفلوس', /محفظة|سحب|رصيد/],
    ['ما Happen if the transaction is pending', /block|confirm|كتل|تأكيد/],
    ['كيف احذف حسابي', /حذف|حساب/],
    ['كيف اعدل الهدف', /هدف|هدف/],
    ['هل يوجد حد ادنى', /حد أدنى|minimum/],
    ['كيف اروج لحملتي', /رابط|شارك|share/],
  ];
  for (const [q, pattern] of cases) {
    const r = await assistant.answer(q, 'ar');
    assert.notStrictEqual(r.mode, 'kb-miss', `سؤال بلا إجابة: ${q}`);
  }
});

test('الرد غير المتطابق يعرض أقرب المواضيع بدل فراغ', async () => {
  const r = await assistant.answer('qqqq zzzz wwww', 'ar');
  assert.strictEqual(r.mode, 'kb-miss');
  assert.ok(r.answer.length > 40);
});
