/* اختبار سريع للوحة الإدارة من جهة العميل (بدون تشويش الترميز العربي) */
const BASE = process.env.BASE || 'http://127.0.0.1:3100';
const KEY = process.env.ADMIN_KEY || 'local-admin-key-change-me';

const cookies = new Map();

async function call(path, options = {}) {
  const headers = { 'content-type': 'application/json', ...(options.headers || {}) };
  if (cookies.size) {
    headers.cookie = [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }
  if (cookies.has('hadba_csrf')) headers['x-csrf-token'] = cookies.get('hadba_csrf');
  const res = await fetch(BASE + path, { ...options, headers });
  const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const c of setCookie) {
    const [pair] = c.split(';');
    const idx = pair.indexOf('=');
    if (idx < 0) continue;
    cookies.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
  }
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 200) }; }
  return { status: res.status, data };
}

(async () => {
  let r = await call('/api/admin/session', { method: 'POST', body: JSON.stringify({ key: KEY }) });
  console.log('login:', r.status, r.data.ok ? 'ok' : r.data.error);

  r = await call('/api/admin/overview');
  console.log('overview:', r.status, `actor=${r.data.actor}`, `campaigns=${r.data.campaigns?.total}`, `pending=${r.data.campaigns?.pending_review}`, `audit=${r.data.audit_entries}`);

  const tiers = [
    { maxUsd: 200, bps: 900 },
    { maxUsd: 300, bps: 700 },
    { maxUsd: 400, bps: 500 },
    { maxUsd: null, bps: 300 },
  ];
  r = await call('/api/admin/fees', { method: 'POST', body: JSON.stringify({ tiers }) });
  console.log('fees update:', r.status, r.data.ok ? `saved ${r.data.tiers.length} tiers` : r.data.error);

  r = await call('/api/admin/fees');
  console.log('fees get:', r.status, `source=${r.data.source}`, `effective=${r.data.effective?.length}`, `pending=${r.data.pending_config?.length}`);

  r = await call('/api/admin/fees', { method: 'POST', body: JSON.stringify({ tiers: [{ maxUsd: 100, bps: 1500 }] }) });
  console.log('fees over-max:', r.status, r.data.error || 'ALLOWED (bad)');

  r = await call('/api/admin/fees', { method: 'POST', body: JSON.stringify({ tiers: [{ maxUsd: 100, bps: 300 }, { maxUsd: 200, bps: 500 }] }) });
  console.log('fees not-decreasing:', r.status, r.data.error || 'ALLOWED (bad)');

  r = await call('/api/admin/db/stats');
  console.log('db stats:', r.status, `tables=${r.data.tables?.length}`, `integrity=${r.data.integrity_check}`);

  r = await call('/api/admin/db/rows?table=donations&limit=5');
  console.log('db rows:', r.status, `table=${r.data.table}`, `total=${r.data.total}`);

  r = await call('/api/admin/db/rows?table=sqlite_master');
  console.log('db rows (blocked table):', r.status, r.data.error || 'ALLOWED (bad)');

  r = await call('/api/admin/db/integrity');
  console.log('integrity:', r.status, `checked=${r.data.donations_checked}`, `issues=${r.data.issue_count}`, `gross=${r.data.totals?.gross_usd}`);

  r = await call('/api/admin/audit?limit=5');
  console.log('audit:', r.status, `entries=${r.data.actions?.length}`, (r.data.actions || []).slice(0, 3).map(a => a.action).join(', '));

  r = await call('/api/admin/campaigns?status=active');
  console.log('campaigns:', r.status, `count=${r.data.campaigns?.length}`);

  const first = r.data.campaigns?.[0];
  if (first) {
    r = await call(`/api/admin/campaigns/${encodeURIComponent(first.slug)}`);
    console.log('campaign detail:', r.status, `donations=${r.data.donations?.length}`, `updates=${r.data.updates?.length}`);
  }

  r = await call('/api/admin/sessions');
  console.log('sessions:', r.status, `count=${r.data.sessions?.length}`);
})();
