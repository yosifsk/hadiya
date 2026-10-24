/* اختبار تدفّق حسابات المستخدمين: تسجيل → دخول → إنشاء حملة (يتطلّب محفظة) */
const BASE = 'http://127.0.0.1:3100';

function readCookie(res) {
  const list = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  return list.map(c => c.split(';')[0]).join('; ');
}

async function flow() {
  // 1) صفحة التسجيل
  let res = await fetch(`${BASE}/register`, { redirect: 'manual' });
  const html = await res.text();
  console.log('GET /register →', res.status,
    '| has username field:', html.includes('name="username"'),
    '| has password field:', html.includes('name="password"'));

  // 2) إنشاء حساب
  const form = new URLSearchParams({
    username: 'tester_demo',
    display_name: 'مجرّب',
    password: 'Str0ngPassw0rd!',
    password2: 'Str0ngPassw0rd!',
  });
  res = await fetch(`${BASE}/register`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const cookie = readCookie(res);
  console.log('POST /register →', res.status, '→', res.headers.get('location'),
    '| session cookie:', cookie ? 'set' : 'missing');

  // 3) صفحة الحساب بالحساب الجديد
  res = await fetch(`${BASE}/account`, { headers: { cookie }, redirect: 'manual' });
  const accountHtml = await res.text();
  console.log('GET /account (user session) →', res.status,
    '| shows username:', accountHtml.includes('tester_demo'),
    '| asks to link wallet:', accountHtml.includes('link-wallet-btn'));

  // 4) إنشاء حملة بلا محفظة مرتبطة → يوجّه للربط
  res = await fetch(`${BASE}/create`, { headers: { cookie }, redirect: 'manual' });
  console.log('GET /create (no wallet linked) →', res.status, '→', res.headers.get('location'));

  // 5) دخول خاطئ
  res = await fetch(`${BASE}/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: 'tester_demo', password: 'wrong' }).toString(),
  });
  console.log('POST /login (wrong password) →', res.status);

  // 6) دخول صحيح
  res = await fetch(`${BASE}/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: 'tester_demo', password: 'Str0ngPassw0rd!' }).toString(),
  });
  console.log('POST /login (correct) →', res.status, '→', res.headers.get('location'));

  // 7) ربط محفظة بتوقيع غير صالح → يجب أن يُرفض
  res = await fetch(`${BASE}/account/link-wallet`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({
      address: '0x1111111111111111111111111111111111111111',
      message: 'ربط المحفظة',
      signature: '0xdeadbeef',
    }),
  });
  console.log('POST /account/link-wallet (bad signature) →', res.status, '(يجب أن يكون 400)');

  // 8) الخروج
  res = await fetch(`${BASE}/logout`, { method: 'POST', redirect: 'manual', headers: { cookie } });
  console.log('POST /logout →', res.status, '→', res.headers.get('location'));
}

flow();
