/* اختبار المساعد الذكي + صلاحيات الأدمن الجديدة */
const BASE = 'http://127.0.0.1:3100';

const cookies = new Map();
async function call(path, options = {}) {
  const headers = { 'content-type': 'application/json', ...(options.headers || {}) };
  if (cookies.size) headers.cookie = [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  if (cookies.has('hadba_csrf')) headers['x-csrf-token'] = cookies.get('hadba_csrf');
  const res = await fetch(BASE + path, { ...options, headers });
  for (const c of (res.headers.getSetCookie ? res.headers.getSetCookie() : [])) {
    const [pair] = c.split(';');
    const i = pair.indexOf('=');
    if (i > 0) cookies.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
  }
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 120) }; }
  return { status: res.status, data };
}

(async () => {
  console.log('=== المساعد الذكي ===');
  const questions = [
    'كم رسوم المنصة؟',
    'هل يمكن استرداد التبرع؟',
    'كيف يصل المال للجهة المستفيدة',
    'ايش الشبكات المدعومة؟',
    'كيف احمي نفسي من الاحتيال',
    'ليش ما اقدر احط عنوان محفظة بالوصف',
    'ما الفرق بين موثق ومصرح به ذاتيا',
    'كيف اغير محفظة الجهة المستفيدة',
    'سؤال غريب totally unrelated xyz',
  ];
  for (const q of questions) {
    const r = await call('/api/assistant/ask', { method: 'POST', body: JSON.stringify({ question: q, lang: 'ar' }) });
    const a = r.data.answer ? r.data.answer.replace(/\s+/g, ' ').slice(0, 78) : r.data.error;
    console.log(`  "${q.slice(0, 32)}" → [${r.data.mode || '?'} conf=${r.data.confidence}] ${a}…`);
  }

  const s = await call('/api/assistant/suggestions?lang=ar');
  console.log('  suggestions:', s.data.suggestions.length, '→', s.data.suggestions.slice(0, 3).join(' | '));

  console.log('\n=== دخول الأدمن ===');
  const login = await call('/api/admin/session', { method: 'POST', body: JSON.stringify({ key: 'local-admin-key-change-me' }) });
  console.log('  login:', login.status, login.data.ok ? 'ok' : login.data.error);

  console.log('\n=== صلاحيات جديدة ===');
  // إنشاء حملة للتجربة
  const created = await call('/api/campaigns', {
    method: 'POST',
    body: JSON.stringify({
      title: 'حملة اختبار الصلاحيات',
      story: 'قصة اختبارية.',
      charity_wallet: '0x1111111111111111111111111111111111111111',
      chain_id: 8453,
      goal_usd: 100,
    }),
  });
  const slug = created.data.campaign?.slug;
  console.log('  create campaign:', created.status, slug);

  // تعديل
  const edited = await call(`/api/admin/campaigns/${encodeURIComponent(slug)}/edit`, {
    method: 'POST',
    body: JSON.stringify({ title: 'حملة معدّلة بالاختبار', goal_usd: 250, verification: 'verified' }),
  });
  console.log('  edit campaign:', edited.status, edited.data.ok ? `title=${edited.data.campaign?.title} verified=${edited.data.campaign?.verification}` : edited.data.error);

  // محاولة تغيير محفظة (غير مسجّلة على العقد → مسموحة)
  const walletEdit = await call(`/api/admin/campaigns/${encodeURIComponent(slug)}/edit`, {
    method: 'POST',
    body: JSON.stringify({ charity_wallet: '0x2222222222222222222222222222222222222222' }),
  });
  console.log('  edit charity wallet (not on-chain):', walletEdit.status, walletEdit.data.ok ? 'allowed' : walletEdit.data.error);

  // قائمة المراجعة
  const pending = await call('/api/admin/campaigns?status=pending_review');
  console.log('  pending list:', pending.status, '→', pending.data.campaigns?.length, 'حملة');

  // موافقة
  const approved = await call(`/api/admin/campaigns/${encodeURIComponent(slug)}/status`, {
    method: 'POST',
    body: JSON.stringify({ status: 'active' }),
  });
  console.log('  approve:', approved.status, approved.data.campaign?.status);

  // تصدير
  const csv = await fetch(`${BASE}/api/admin/export/campaigns`, { headers: { cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; ') } });
  const buf = Buffer.from(await csv.arrayBuffer());
  console.log('  export campaigns:', csv.status, `${buf.length} bytes`, '| BOM:', buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF);

  // حذف (بدون سبب → رفض)
  const noReason = await call(`/api/admin/campaigns/${encodeURIComponent(slug)}/delete`, { method: 'POST', body: JSON.stringify({}) });
  console.log('  delete without reason:', noReason.status, noReason.data.error);

  // حذف بسبب
  const deleted = await call(`/api/admin/campaigns/${encodeURIComponent(slug)}/delete`, {
    method: 'POST',
    body: JSON.stringify({ reason: 'اختبارcleanup' }),
  });
  console.log('  delete campaign:', deleted.status, deleted.data.ok ? `removed ${deleted.data.donations_removed} donations` : deleted.data.error);

  // مستخدمون
  const ulist = await call('/api/admin/users');
  console.log('  users list:', ulist.status, '→', ulist.data.users?.length);

  // سجل التدقيق
  const aud = await call('/api/admin/audit?limit=6');
  console.log('  audit tail:', aud.data.actions?.map(a => a.action).join(', '));
})();
