/* اختبار تدفّق "إنشاء حملة" → يتطلب حسابًا */
const BASE = 'http://127.0.0.1:3100';

(async () => {
  // 1) بدون جلسة
  let res = await fetch(`${BASE}/create`, { redirect: 'manual' });
  console.log('GET /create (no account) →', res.status, '→', res.headers.get('location'));

  // 2) صفحة الدخول بعد التوجيه
  res = await fetch(`${BASE}/sign-in?next=%2Fcreate&reason=create`, { redirect: 'manual' });
  const html = await res.text();
  console.log('GET /sign-in?next=/create →', res.status,
    '| has next field:', html.includes('data-next'),
    '| title:', (html.match(/<title>(.*?)<\/title>/) || [])[1]);

  // 3) POST /create بدون جلسة
  res = await fetch(`${BASE}/create`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ title: 'حملة اختبار', story: 'قصة', charity_wallet: '0x1111111111111111111111111111111111111111', chain_id: '8453' }).toString(),
  });
  console.log('POST /create (no account) →', res.status, '→', res.headers.get('location'));
})();
