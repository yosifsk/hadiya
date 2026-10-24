/* ============================================================
   HADIYA — لوحة الإدارة (واجهة)
   ============================================================ */

(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const csrf = () => {
    const match = document.cookie.match(/(?:^|;\s*)hadba_csrf=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  };

  const api = async (url, options = {}) => {
    const res = await fetch(url, {
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': csrf(),
        ...(options.headers || {}),
      },
      ...options,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const data = await res.json().catch(() => ({ ok: false, error: 'invalid json' }));
    if (!res.ok || data.ok === false) throw new Error(data.error || `http ${res.status}`);
    return data;
  };

  const esc = (text) => String(text ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));

  const money = (n) => `$${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  const pct = (bps) => `${(Number(bps || 0) / 100).toFixed(Number(bps) % 100 === 0 ? 0 : 2)}%`;
  const short = (a) => (a && a.length > 14 ? `${a.slice(0, 8)}…${a.slice(-6)}` : (a || '—'));

  /* ترجمة نصّ عربي حسب لغة الواجهة (يعمل بلا i18n.js أيضًا) */
  const t = (text) => {
    const i18n = window.HadiyaI18n;
    if (!i18n) return text;
    return i18n.t(text);
  };

  /* ------------------------------------------------------- تبويبات اللوحة */

  $$('.tab[data-atab]').forEach(tab => {
    tab.addEventListener('click', () => {
      const group = tab.closest('[role=tablist]') || document;
      $$('.tab[data-atab]', group).forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const name = tab.dataset.atab;
      $$('.atab-panel').forEach(panel => { panel.hidden = panel.dataset.atab !== name; });
      if (name === 'review') loadReviews();
      if (name === 'db') loadDbStats();
      if (name === 'audit') loadAudit();
      if (name === 'security') { loadSessions(); loadAccounts(); loadUsers(); loadSettings(); }
    });
  });

  /* تبويبات صفحة الدخول */
  $$('.tab[data-ltab]').forEach(tab => {
    tab.addEventListener('click', () => {
      const group = tab.closest('[role=tablist]') || document;
      $$('.tab[data-ltab]', group).forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const name = tab.dataset.ltab;
      $$('.ltab-panel').forEach(panel => { panel.hidden = panel.dataset.ltab !== name; });
    });
  });

  /* ------------------------------------------------------- نظرة عامة */

  async function loadOverview() {
    try {
      const data = await api('/api/admin/overview');
      const c = data.campaigns;
      const d = data.donations;
      $('#admin-kpis').innerHTML = `
        <div class="kpi"><div class="label">الحملات</div><div class="value">${c.total}</div>
          <div class="sub">${c.active} نشطة · ${c.pending_review} بانتظار المراجعة</div></div>
        <div class="kpi accent"><div class="label">المحصّل</div><div class="value">${money(d.gross_usd)}</div>
          <div class="sub">رسوم المنصة ${money(d.fee_usd)}</div></div>
        <div class="kpi"><div class="label">صافي المستفيدين</div><div class="value">${money(d.charity_usd)}</div>
          <div class="sub">${d.confirmed} تبرّع مؤكد</div></div>
        <div class="kpi"><div class="label">إجراءات التدقيق</div><div class="value">${data.audit_entries}</div>
          <div class="sub">مسجّلة في السجل</div></div>`;

      const oc = data.fee_bps_on_chain || {};
      $('#admin-onchain').innerHTML = oc.deployed
        ? `<div class="mono small">${esc(oc.address)}</div>
           <div class="small muted" style="margin-top:6px">الشبكة: ${oc.chain_id} · الحد الأدنى ${pct(oc.min_bps)} · الحد الأقصى ${pct(oc.max_bps)}</div>
           <div class="small muted">محفظة الكولكتر في العقد: <span class="mono">${esc(short(oc.collector))}</span></div>`
        : '<div class="muted small">لا يوجد عقد منشور بعد — انشر العقد بـ npm run deploy:contracts</div>';

      $('#admin-campaigns-count').innerHTML = `
        <div class="small">نشطة: <strong>${c.active}</strong></div>
        <div class="small">بانتظار المراجعة: <strong>${c.pending_review}</strong></div>
        <div class="small">موقوفة: <strong>${c.paused}</strong> · مغلقة: <strong>${c.closed}</strong> · مرفوضة: <strong>${c.rejected}</strong></div>`;

      $('#admin-donations-count').innerHTML = `
        <div class="small">مؤكدة: <strong>${d.confirmed}</strong></div>
        <div class="small">رسوم غير محصّلة: <strong>${d.unsettled}</strong></div>
        <div class="small muted">محفظة الكولكتر: <span class="mono">${esc(short(data.collector_address))}</span></div>`;
    } catch (err) {
      $('#admin-kpis').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
    }
  }

  /* ------------------------------------------------------- الرسوم */

  let feeTiers = [];

  async function loadFees() {
    try {
      const data = await api('/api/admin/fees');
      const oc = data.on_chain || {};
      $('#fee-onchain').innerHTML = oc.deployed
        ? `<div class="mono small">${esc(oc.address)}</div>
           <div class="small" style="margin-top:6px">الحد الأدنى: <strong>${pct(oc.min_bps)}</strong> · الحد الأقصى: <strong>${pct(oc.max_bps)}</strong></div>
           <div class="small muted">${esc(oc.note || '')}</div>`
        : '<div class="muted small">لا يوجد عقد منشور — لا حدود immutable بعد.</div>';

      feeTiers = (data.pending_config || data.effective || []).map(t => ({
        maxUsd: t.maxUsd === null || t.maxUsd === undefined ? null : Number(t.maxUsd),
        bps: Number(t.bps),
      }));

      renderFeeEditor(oc);
      renderEffective(data.effective || []);
      $('#fee-pending').innerHTML = data.pending_config
        ? '<span class="badge badge-pending">يوجد إعداد محفوظ لم يُطبَّق بعد على السلسلة</span>'
        : '<span class="badge badge-confirmed">الإعداد الحالي مطبَّق</span>';
    } catch (err) {
      $('#fee-onchain').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
    }
  }

  function renderEffective(tiers) {
    $('#fee-effective').innerHTML = tiers.map((t, i) => {
      const prev = i > 0 ? tiers[i - 1].maxUsd : 0;
      const range = t.maxUsd === null || t.maxUsd === undefined
        ? `فوق $${prev}`
        : (i === 0 ? `حتى $${t.maxUsd}` : `$${prev} – $${t.maxUsd}`);
      return `<div class="small">${esc(range)} → <strong>${pct(t.bps)}</strong></div>`;
    }).join('');
  }

  function renderFeeEditor(oc) {
    const min = oc.deployed ? oc.min_bps : 0;
    const max = oc.deployed ? oc.max_bps : 1500;
    $('#fee-editor').innerHTML = feeTiers.map((t, i) => `
      <div class="row" style="margin-bottom:8px">
        <div class="field" style="margin:0">
          <label>الحد الأعلى (دولار) ${i === feeTiers.length - 1 ? '— اتركه فارغًا للنهائي' : ''}</label>
          <input type="number" data-tier-max="${i}" value="${t.maxUsd ?? ''}" placeholder="مثال: 200" min="0" step="1">
        </div>
        <div class="field" style="margin:0">
          <label>نسبة الرسوم (نقطة أساس: 900 = ٩٪)</label>
          <input type="number" data-tier-bps="${i}" value="${t.bps}" min="${min}" max="${max}" step="1">
        </div>
      </div>`).join('') + `<p class="small muted">النطاق المسموح على هذه الشبكة: ${min} – ${max} نقطة أساس.</p>`;
  }

  function collectTiers() {
    const out = [];
    const rows = $$('[data-tier-bps]');
    for (const input of rows) {
      const i = input.dataset.tierBps;
      const maxInput = $(`[data-tier-max="${i}"]`);
      const maxVal = maxInput.value.trim();
      out.push({
        maxUsd: maxVal === '' ? null : Number(maxVal),
        bps: Number(input.value),
      });
    }
    return out;
  }

  $('#fee-save')?.addEventListener('click', async () => {
    const status = $('#fee-status');
    try {
      const data = await api('/api/admin/fees', { method: 'POST', body: { tiers: collectTiers() } });
      status.innerHTML = '<span class="badge badge-confirmed">✔ حُفظ</span>';
      feeTiers = data.tiers;
      await loadFees();
    } catch (err) {
      status.innerHTML = `<span class="badge badge-failed">${esc(err.message)}</span>`;
    }
  });

  $('#fee-reset')?.addEventListener('click', async () => {
    const status = $('#fee-status');
    try {
      await api('/api/admin/fees', { method: 'POST', body: { reset: true } });
      status.innerHTML = '<span class="badge badge-confirmed">✔ تمت الاستعادة</span>';
      await loadFees();
    } catch (err) {
      status.innerHTML = `<span class="badge badge-failed">${esc(err.message)}</span>`;
    }
  });

  /* ------------------------------------------------------- المراجعة */

  async function loadReviews() {
    const rows = $('#review-rows');
    if (!rows) return;
    try {
      const status = $('#review-status').value;
      const search = $('#review-search').value.trim();
      const data = await api(`/api/admin/campaigns${status ? `?status=${status}` : ''}`);
      const list = data.campaigns.filter(c => !search || c.title.includes(search) || c.slug.includes(search));
      if (!list.length) {
        rows.innerHTML = '<tr><td colspan="6" class="muted">لا توجد حملات مطابقة.</td></tr>';
        return;
      }
      rows.innerHTML = list.map(c => `
        <tr>
          <td><a href="/c/${encodeURIComponent(c.slug)}" target="_blank">${esc(c.title)}</a><br>
              <span class="small muted mono">${esc(c.slug)}</span></td>
          <td><span class="badge ${c.status === 'active' ? 'badge-confirmed' : 'badge-pending'}">${esc(c.status)}</span></td>
          <td class="mono small">${esc(c.charity_wallet)}</td>
          <td class="mono small">${esc(short(c.organizer_wallet))}</td>
          <td class="mono small">${money(c.raised_usd)}</td>
          <td>
            ${c.status !== 'active' ? `<button class="btn btn-primary btn-sm" data-approve="${esc(c.slug)}">موافقة</button>` : ''}
            ${c.status !== 'rejected' ? `<button class="btn btn-outline btn-sm" data-reject="${esc(c.slug)}">رفض</button>` : ''}
            ${c.status !== 'paused' && c.status !== 'active' ? `<button class="btn btn-outline btn-sm" data-pause="${esc(c.slug)}">إيقاف</button>` : ''}
            <button class="btn btn-ghost btn-sm" data-inspect="${esc(c.slug)}">تفاصيل</button>
            <button class="btn btn-ghost btn-sm" data-edit="${esc(c.slug)}">تعديل</button>
            <button class="btn btn-ghost btn-sm" data-verify="${esc(c.slug)}" data-verified="${c.verification === 'verified' ? '0' : '1'}">${c.verification === 'verified' ? 'إلغاء التوثيق' : 'توثيق'}</button>
            <button class="btn btn-ghost btn-sm" data-delete="${esc(c.slug)}" style="color:var(--danger)">حذف</button>
          </td>
        </tr>`).join('');
    } catch (err) {
      rows.innerHTML = `<tr><td colspan="6" class="muted">${esc(err.message)}</td></tr>`;
    }
  }

  document.addEventListener('click', async (e) => {
    const approve = e.target.closest('[data-approve]');
    const reject = e.target.closest('[data-reject]');
    const pause = e.target.closest('[data-pause]');
    const inspect = e.target.closest('[data-inspect]');
    const editBtn = e.target.closest('[data-edit]');
    const verifyBtn = e.target.closest('[data-verify]');
    const deleteBtn = e.target.closest('[data-delete]');

    const setStatus = async (slug, status) => {
      await api(`/api/admin/campaigns/${encodeURIComponent(slug)}/status`, { method: 'POST', body: { status } });
      await loadReviews();
      await loadOverview();
    };

    try {
      if (approve) return await setStatus(approve.dataset.approve, 'active');
      if (reject) return await setStatus(reject.dataset.reject, 'rejected');
      if (pause) return await setStatus(pause.dataset.pause, 'paused');

      if (verifyBtn) {
        const verification = verifyBtn.dataset.verified === '1' ? 'verified' : 'self_declared';
        await api(`/api/admin/campaigns/${encodeURIComponent(verifyBtn.dataset.verify)}/edit`, {
          method: 'POST',
          body: { verification },
        });
        await loadReviews();
        return;
      }

      if (deleteBtn) {
        const slug = deleteBtn.dataset.delete;
        const reason = window.prompt(t('حذف الحملة') + ` "${slug}" ` + t('نهائيًا مع سجل تبرعاتها') + `\n` + t('سبب الحذف') + ` (${t('مطلوب ويُسجَّل')}):`);
        if (!reason) return;
        if (!window.confirm(t('تأكيد الحذف النهائي؟ لا يمكن التراجع'))) return;
        const res = await api(`/api/admin/campaigns/${encodeURIComponent(slug)}/delete`, {
          method: 'POST',
          body: { reason },
        });
        window.alert(`${t('تم الحذف')}: ${res.deleted} (${res.donations_removed} ${t('تبرّع')})`);
        await loadReviews();
        await loadOverview();
        return;
      }

      if (editBtn) {
        const slug = editBtn.dataset.edit;
        const data = await api(`/api/admin/campaigns/${encodeURIComponent(slug)}`);
        const c = data.campaign;
        $('#review-detail').innerHTML = `
          <div class="panel">
            <h3>تعديل الحملة</h3>
            <div class="field">
              <label>العنوان</label>
              <input type="text" id="ed-title" value="${esc(c.title)}">
            </div>
            <div class="field">
              <label>السطر الوصفي</label>
              <input type="text" id="ed-subtitle" value="${esc(c.subtitle || '')}">
            </div>
            <div class="field">
              <label>الهدف (دولار)</label>
              <input type="number" id="ed-goal" value="${Number(c.goal_usd || 0)}">
            </div>
            <div class="field">
              <label>القصة</label>
              <textarea id="ed-story" rows="6">${esc(c.story || '')}</textarea>
            </div>
            <div class="field">
              <label>مستويات الأثر</label>
              <div class="hint">اربط كل مبلغ بنتيجة ملموسة — تظهر هذه البطاقات للزوار.</div>
              <div id="ed-impact" class="impact-editor">
                ${(data.impact_levels || []).map((l, i) => `
                  <div class="impact-row" data-index="${i}">
                    <input type="number" data-impact="amount" min="1" step="1" value="${Number(l.amount_usd || 0)}" placeholder="25">
                    <input type="text" data-impact="label" maxlength="200" value="${esc(l.label || '')}" placeholder="تكفي شهر دواء لمريض">
                    <input type="text" data-impact="label_en" maxlength="200" value="${esc(l.label_en || '')}" placeholder="EN">
                    <button type="button" class="btn btn-ghost btn-sm" data-impact-remove>✕</button>
                  </div>`).join('')}
              </div>
              <div class="row-flex" style="margin-top:8px;gap:8px">
                <button type="button" class="btn btn-outline btn-sm" id="ed-impact-add">+ إضافة مستوى</button>
              </div>
            </div>
            <div class="row">
              <div class="field">
                <label>محفظة الجهة المستفيدة</label>
                <input type="text" id="ed-wallet" class="mono" value="${esc(c.charity_wallet)}" ${c.splitter_address ? 'disabled' : ''}>
                <div class="hint">${c.splitter_address
                  ? 'مقفلة: الحملة مسجّلة على العقد والتغيير يوقّعه المنظّم فقط'
                  : 'مسموح لأن الحملة غير مسجّلة على العقد'}</div>
              </div>
              <div class="field">
                <label>الحالة</label>
                <select id="ed-status">
                  <option value="active" ${c.status === 'active' ? 'selected' : ''}>نشطة</option>
                  <option value="pending_review" ${c.status === 'pending_review' ? 'selected' : ''}>بانتظار المراجعة</option>
                  <option value="paused" ${c.status === 'paused' ? 'selected' : ''}>موقوفة</option>
                  <option value="closed" ${c.status === 'closed' ? 'selected' : ''}>مغلقة</option>
                  <option value="rejected" ${c.status === 'rejected' ? 'selected' : ''}>مرفوضة</option>
                </select>
              </div>
            </div>
            <div class="row-flex">
              <button class="btn btn-primary btn-sm" id="ed-save" data-slug="${esc(slug)}">حفظ التعديلات</button>
              <button class="btn btn-outline btn-sm" id="ed-cancel">إلغاء</button>
              <span id="ed-status-msg" class="small"></span>
            </div>
          </div>`;
        $('#ed-save').addEventListener('click', async () => {
          const payload = {
            title: $('#ed-title').value,
            subtitle: $('#ed-subtitle').value,
            story: $('#ed-story').value,
            goal_usd: Number($('#ed-goal').value),
            charity_wallet: $('#ed-wallet').value,
            status: $('#ed-status').value,
          };
          // مستويات الأثر
          const impactLevels = [];
          $$('#ed-impact .impact-row').forEach((row) => {
            const amount = Number(row.querySelector('[data-impact="amount"]').value);
            const label = row.querySelector('[data-impact="label"]').value.trim();
            const labelEn = row.querySelector('[data-impact="label_en"]').value.trim();
            if (amount > 0 && label) impactLevels.push({ amount_usd: amount, label, label_en: labelEn });
          });
          if (impactLevels.length) payload.impact_levels = impactLevels;
          try {
            await api(`/api/admin/campaigns/${encodeURIComponent(slug)}/edit`, { method: 'POST', body: payload });
            await api(`/api/admin/campaigns/${encodeURIComponent(slug)}/status`, { method: 'POST', body: { status: payload.status } });
            $('#ed-status-msg').innerHTML = '<span class="badge badge-confirmed">✔ حُفظ</span>';
            await loadReviews();
          } catch (err) {
            $('#ed-status-msg').innerHTML = `<span class="badge badge-failed">${esc(err.message)}</span>`;
          }
        });
        $('#ed-cancel').addEventListener('click', () => { $('#review-detail').innerHTML = ''; });
        return;
      }

      if (inspect) {
        const data = await api(`/api/admin/campaigns/${encodeURIComponent(inspect.dataset.inspect)}`);
        const c = data.campaign;
        const d = data.totals;
        $('#review-detail').innerHTML = `
          <div class="panel">
            <h3>${esc(c.title)}</h3>
            <div class="small">
              <div>محفظة المستفيد: <span class="mono">${esc(c.charity_wallet)}</span></div>
              <div>المنظّم: <span class="mono">${esc(c.organizer_wallet || '—')}</span></div>
              <div>العقد: <span class="mono">${esc(c.splitter_address || '—')}</span> · رقم الحملة: ${esc(c.splitter_campaign_id ?? '—')}</div>
              <div>IPFS CID: <span class="mono">${esc(c.story_cid || '—')}</span></div>
              <div>المحصّل: ${money(d.raised_usd)} · رسوم: ${money(d.fee_usd)} · صافي: ${money(d.charity_usd)} · تبرعات: ${d.donors}</div>
              <div>الشرائح المستخدمة: ${d.tiers_used.map(t => `${pct(t.bps)} × ${t.count}`).join('، ') || '—'}</div>
            </div>
            <div class="alert alert-info" style="margin-top:12px">
              تغيير محفظة المستفيد يتم من محفظة <strong>المنظّم</strong> فقط — العقد يرفض أي محاولة من المشرف.
              <div class="field" style="margin-top:10px">
                <input type="text" id="new-charity-input" placeholder="0x… العنوان الجديد (اختياري)">
                <button class="btn btn-outline btn-sm" id="gen-charity-change" style="margin-top:8px">توليد معاملة يوقّعها المنظّم</button>
              </div>
              <pre id="charity-change-out" class="mono small" style="white-space:pre-wrap"></pre>
            </div>
          </div>`;
      }
    } catch (err) {
      alert(err.message);
    }
  });

  document.addEventListener('click', async (e) => {
    if (!e.target.closest('#gen-charity-change')) return;
    const slug = $('#review-detail a')?.getAttribute('href')?.split('/').pop();
    const newAddr = $('#new-charity-input').value.trim();
    if (!slug || !newAddr) return;
    try {
      const data = await api(`/api/admin/campaigns/${encodeURIComponent(slug)}/charity-change?new=${encodeURIComponent(newAddr)}`);
      $('#charity-change-out').textContent = [
        '。注意 — يجب أن يوقّعها: ' + data.must_be_signed_by,
        '',
        'to:   ' + data.transaction.to,
        'value:' + data.transaction.value,
        'data: ' + data.transaction.data,
        '',
        data.note,
      ].join('\n');
    } catch (err) {
      $('#charity-change-out').textContent = 'خطأ: ' + err.message;
    }
  });

  /* ------------------------------------------------------- قاعدة البيانات */

  async function loadDbStats() {
    try {
      const data = await api('/api/admin/db/stats');
      $('#db-stats').innerHTML = `
        <div class="mono small">${esc(data.file)}</div>
        <div class="small">الحجم: ${(data.size_bytes / 1024).toFixed(1)} KB · فحص السلامة: <strong>${esc(data.integrity_check)}</strong></div>`;
      const select = $('#db-table');
      if (!select.options.length) {
        select.innerHTML = data.tables.map(t => `<option value="${esc(t.name)}">${esc(t.name)} (${t.count})</option>`).join('');
      }
      loadRows();
    } catch (err) {
      $('#db-stats').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
    }
  }

  async function loadRows() {
    const table = $('#db-table').value;
    const search = $('#db-search').value.trim();
    try {
      const data = await api(`/api/admin/db/rows?table=${encodeURIComponent(table)}&limit=50${search ? `&search=${encodeURIComponent(search)}` : ''}`);
      if (!data.rows.length) {
        $('#db-rows').innerHTML = '<tr><td class="muted">لا توجد صفوف.</td></tr>';
        return;
      }
      const cols = Object.keys(data.rows[0]);
      $('#db-rows').innerHTML = data.rows.map(row => `
        <tr>${cols.map(c => `<td class="mono small">${esc(String(row[c] ?? '').slice(0, 120))}</td>`).join('')}</tr>`).join('');
    } catch (err) {
      $('#db-rows').innerHTML = `<tr><td class="muted">${esc(err.message)}</td></tr>`;
    }
  }

  $('#db-load')?.addEventListener('click', loadRows);
  $('#db-table')?.addEventListener('change', loadRows);

  /* ------------------------------------------------------- فحص السلامة */

  $('#integrity-run')?.addEventListener('click', async () => {
    const out = $('#integrity-result');
    out.innerHTML = '<span class="muted small">جارٍ الفحص…</span>';
    try {
      const data = await api('/api/admin/db/integrity');
      const issues = data.issues.length
        ? `<div class="table-wrap"><table><thead><tr><th>النوع</th><th>التفاصيل</th></tr></thead><tbody>${
            data.issues.map(i => `<tr><td class="mono small">${esc(i.type)}</td><td class="small">${esc(i.detail)}</td></tr>`).join('')
          }</tbody></table></div>`
        : '<div class="alert alert-ok">لا توجد مشاكل — كل المبالغ متسقة والنسب مطابقة للشرائح.</div>';
      out.innerHTML = `
        <div class="kpi-grid">
          <div class="kpi"><div class="label">تبرعات مفحوصة</div><div class="value">${data.donations_checked}</div></div>
          <div class="kpi"><div class="label">مشاكل</div><div class="value">${data.issue_count}</div>
            <div class="sub">حرجة: ${data.critical_count}</div></div>
          <div class="kpi"><div class="label">إجمالي محسوب</div><div class="value">${money(data.totals.gross_usd)}</div>
            <div class="sub">رسوم ${money(data.totals.fee_usd)} · صافي ${money(data.totals.charity_usd)}</div></div>
          <div class="kpi"><div class="label">معلّق قديم</div><div class="value">${data.stale_pending}</div>
            <div class="sub">حملات بلا محفظة: ${data.campaigns_without_wallet.length}</div></div>
        </div>${issues}`;
    } catch (err) {
      out.innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
    }
  });

  /* ------------------------------------------------------- التدقيق */

  async function loadAudit() {
    try {
      const data = await api('/api/admin/audit?limit=150');
      $('#audit-rows').innerHTML = data.actions.map(a => `
        <tr>
          <td class="small muted">${esc(a.created_at)}</td>
          <td class="mono small">${esc(a.actor)}</td>
          <td class="mono small">${esc(a.action)}</td>
          <td class="small">${esc(a.target)}</td>
          <td class="mono small muted">${esc(a.ip)}</td>
        </tr>`).join('') || '<tr><td colspan="5" class="muted">السجل فارغ.</td></tr>';
    } catch (err) {
      $('#audit-rows').innerHTML = `<tr><td colspan="5" class="muted">${esc(err.message)}</td></tr>`;
    }
  }

  /* ------------------------------------------------------- الأمان */

  async function loadSessions() {
    try {
      const data = await api('/api/admin/sessions');
      $('#sessions-list').innerHTML = data.sessions.map(s => `
        <div class="small" style="border-bottom:1px solid var(--line);padding:6px 0">
          <span class="mono">${esc(short(s.address))}</span>
          <span class="muted">· ${esc(s.created_at)} · ${s.donations} تبرّع</span>
        </div>`).join('') || '<span class="muted small">لا توجد جلسات.</span>';
    } catch (err) {
      $('#sessions-list').innerHTML = `<span class="muted small">${esc(err.message)}</span>`;
    }
  }

  async function loadAccounts() {
    const box = $('#accounts-list');
    if (!box) return;
    try {
      const data = await api('/api/admin/accounts');
      box.innerHTML = data.accounts.map(a => `
        <div class="small" style="border-bottom:1px solid var(--line);padding:6px 0;display:flex;justify-content:space-between;gap:8px">
          <span>
            <span class="mono">${esc(a.username)}</span>
            ${a.is_active ? '' : '<span class="badge badge-failed">معطّل</span>'}
            ${a.must_change_password ? '<span class="badge badge-pending">تغيير مطلوب</span>' : ''}
            <span class="muted">· آخر دخول: ${esc(a.last_login_at || '—')}</span>
            ${a.failed_attempts ? `<span class="muted">· فشل ${a.failed_attempts}</span>` : ''}
          </span>
          <button class="btn btn-ghost btn-sm" data-toggle-account="${esc(a.username)}">${a.is_active ? 'تعطيل' : 'تفعيل'}</button>
        </div>`).join('') || '<span class="muted small">لا توجد حسابات.</span>';
    } catch (err) {
      box.innerHTML = `<span class="muted small">${esc(err.message)}</span>`;
    }
  }

  /* المستخدمون العاديون */
  async function loadUsers() {
    const box = $('#users-list');
    if (!box) return;
    try {
      const data = await api('/api/admin/users');
      box.innerHTML = data.users.map(u => `
        <div class="small" style="border-bottom:1px solid var(--line);padding:6px 0;display:flex;justify-content:space-between;gap:8px">
          <span>
            <span class="mono">${esc(u.username)}</span>
            ${u.display_name ? `<span class="muted">· ${esc(u.display_name)}</span>` : ''}
            ${u.wallet_address ? `<span class="badge badge-chain">${esc(short(u.wallet_address))}</span>` : '<span class="badge badge-pending">بلا محفظة</span>'}
            ${u.is_active ? '' : '<span class="badge badge-failed">معطّل</span>'}
          </span>
          <span>
            <button class="btn btn-ghost btn-sm" data-toggle-user="${esc(u.username)}">${u.is_active ? 'تعطيل' : 'تفعيل'}</button>
            <button class="btn btn-ghost btn-sm" data-reset-user="${esc(u.username)}">كلمة مرور جديدة</button>
          </span>
        </div>`).join('') || '<span class="muted small">لا يوجد مستخدمون.</span>';
    } catch (err) {
      box.innerHTML = `<span class="muted small">${esc(err.message)}</span>`;
    }
  }

  document.addEventListener('click', async (e) => {
    const toggleUser = e.target.closest('[data-toggle-user]');
    const resetUser = e.target.closest('[data-reset-user]');
    try {
      if (toggleUser) {
        await api(`/api/admin/users/${encodeURIComponent(toggleUser.dataset.toggleUser)}/toggle`, { method: 'POST', body: {} });
        await loadUsers();
        return;
      }
      if (resetUser) {
        if (!window.confirm(t('توليد كلمة مرور جديدة لهذا المستخدم؟'))) return;
        const res = await api(`/api/admin/users/${encodeURIComponent(resetUser.dataset.resetUser)}/reset-password`, { method: 'POST', body: {} });
        window.alert(`${t('كلمة المرور الجديدة')} (${t('تظهر مرة واحدة')}):\n${res.generated_password}`);
        await loadUsers();
      }
    } catch (err) {
      alert(err.message);
    }
  });

  /* إعدادات المنصة */
  async function loadSettings() {
    const collector = $('#set-collector');
    if (!collector) return;
    try {
      const data = await api('/api/admin/settings');
      collector.value = data.collector_address || '';
      const owner = $('#set-owner');
      if (owner) owner.value = data.owner_address || '';
    } catch (err) {
      const status = $('#settings-status');
      if (status) status.textContent = err.message;
    }
  }

  $('#save-settings')?.addEventListener('click', async () => {
    const status = $('#settings-status');
    try {
      await api('/api/admin/settings', {
        method: 'POST',
        body: {
          collector_address: $('#set-collector').value.trim(),
          owner_address: $('#set-owner').value.trim(),
        },
      });
      status.innerHTML = '<span class="badge badge-confirmed">✔ حُفظ</span>';
      await loadSettings();
    } catch (err) {
      status.innerHTML = `<span class="badge badge-failed">${esc(err.message)}</span>`;
    }
  });

  $('#create-account')?.addEventListener('click', async () => {
    const username = $('#new-account-name').value.trim();
    const out = $('#new-account-result');
    if (!username) return;
    try {
      const data = await api('/api/admin/accounts', {
        method: 'POST',
        body: { username, generate: true },
      });
      out.innerHTML = `<div class="alert alert-ok">اسم المستخدم: <span class="mono">${esc(data.account.username)}</span><br>
        كلمة المرور (تظهر مرة واحدة فقط): <span class="mono">${esc(data.generated_password)}</span></div>`;
      $('#new-account-name').value = '';
      await loadAccounts();
    } catch (err) {
      out.innerHTML = `<span class="badge badge-failed">${esc(err.message)}</span>`;
    }
  });

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-toggle-account]');
    if (!btn) return;
    try {
      await api(`/api/admin/accounts/${encodeURIComponent(btn.dataset.toggleAccount)}/toggle`, { method: 'POST', body: {} });
      await loadAccounts();
    } catch (err) { alert(err.message); }
  });

  $('#change-password')?.addEventListener('click', async () => {
    const current = $('#current-password').value;
    const next = $('#new-password').value;
    const status = $('#change-password-status');
    try {
      await api('/api/admin/account/password', {
        method: 'POST',
        body: { current_password: current, new_password: next },
      });
      status.innerHTML = '<span class="badge badge-confirmed">✔ تم التغيير</span>';
      $('#current-password').value = '';
      $('#new-password').value = '';
    } catch (err) {
      status.innerHTML = `<span class="badge badge-failed">${esc(err.message)}</span>`;
    }
  });

  $('#sessions-refresh')?.addEventListener('click', loadSessions);
  $('#sessions-revoke')?.addEventListener('click', async () => {
    if (!confirm(`${t('سيُلغى كل الجلسات النشطة')}. ${t('متابعة؟')}`)) return;
    try {
      await api('/api/admin/sessions/revoke-all', { method: 'POST', body: {} });
      await loadSessions();
    } catch (err) { alert(err.message); }
  });

  $('#rotate-key')?.addEventListener('click', async () => {
    const value = $('#new-admin-key').value.trim();
    const status = $('#rotate-status');
    try {
      await api('/api/admin/admin-key', { method: 'POST', body: { new_key: value } });
      status.innerHTML = '<span class="badge badge-confirmed">✔ تدوير</span>';
      $('#new-admin-key').value = '';
    } catch (err) {
      status.innerHTML = `<span class="badge badge-failed">${esc(err.message)}</span>`;
    }
  });

  $('#save-addresses')?.addEventListener('click', async () => {
    const raw = $('#admin-addresses').value;
    const list = raw.split(/[\s,]+/).filter(Boolean);
    const status = $('#addresses-status');
    try {
      const data = await api('/api/admin/admin-addresses', { method: 'POST', body: { addresses: list } });
      status.innerHTML = `<span class="badge badge-confirmed">✔ حُفظ (${data.addresses.length})</span>`;
    } catch (err) {
      status.innerHTML = `<span class="badge badge-failed">${esc(err.message)}</span>`;
    }
  });

  $('[data-admin-reload]')?.addEventListener('click', () => location.reload());

  /* ------------------------------------------------------- تسجيل دخول الإدارة */

  const accountLoginBtn = $('#btn-login-account');
  if (accountLoginBtn) {
    accountLoginBtn.addEventListener('click', async () => {
      const status = $('#login-account-status');
      const username = $('#login-username').value.trim();
      const password = $('#login-password').value;
      if (!username || !password) {
        status.innerHTML = '<span class="badge badge-failed">أدخل اسم المستخدم وكلمة المرور</span>';
        return;
      }
      status.innerHTML = '<span class="badge badge-pending">جارٍ التحقق…</span>';
      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok || data.ok === false) throw new Error(data.error || 'فشل الدخول');
        status.innerHTML = '<span class="badge badge-confirmed">✔ تم الدخول</span>';
        setTimeout(() => location.assign('/admin'), 500);
      } catch (err) {
        status.innerHTML = `<span class="badge badge-failed">${esc(err.message)}</span>`;
      }
    });
  }

  const loginBtn = $('#admin-login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      const status = $('#admin-login-status');
      const key = $('#admin-key-input').value.trim();
      if (!key) return;
      status.innerHTML = '<span class="badge badge-pending">جارٍ التحقق…</span>';
      try {
        const res = await fetch('/api/admin/session', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ key }),
        });
        const data = await res.json();
        if (!res.ok || data.ok === false) throw new Error(data.error || 'فشل الدخول');
        status.innerHTML = '<span class="badge badge-confirmed">✔ تم الدخول</span>';
        setTimeout(() => location.assign('/admin'), 500);
      } catch (err) {
        status.innerHTML = `<span class="badge badge-failed">${esc(err.message)}</span>`;
      }
    });
  }

  /* ------------------------------------------------------- تشغيل */

  if ($('#admin-kpis')) {
    loadOverview();
    loadFees();
  }
})();
