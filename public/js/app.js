/* ============================================================
   HADIYA — سكربت الواجهة
   محفظة EIP-1193 + تدفّق التبرّع + التحديثات اللحظية
   ============================================================ */

(() => {
  const api = async (url, options = {}) => {
    const res = await fetch(url, {
      headers: { 'content-type': 'application/json' },
      ...options,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const data = await res.json().catch(() => ({ ok: false, error: 'invalid json' }));
    if (!res.ok || data.ok === false) throw new Error(data.error || `http ${res.status}`);
    return data;
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ترجمة نصّ عربي حسب لغة الواجهة (يعمل بلا i18n.js أيضًا) */
  const tr = (text) => {
    const i18n = window.HadiyaI18n;
    if (!i18n) return text;
    return i18n.t(text);
  };

  /* علامة النسبة: ٪ بالعربية و % بالإنجليزية */
  const pctSign = () => (document.documentElement.lang === 'en' ? '%' : '٪');

  /* ------------------------------------------------------- أدوات الترميز */

  const padHex = (hex, bytes) => hex.replace(/^0x/, '').padStart(bytes * 2, '0');

  function encodeUint256(value) {
    return padHex(BigInt(value).toString(16), 32);
  }

  function encodeAddress(address) {
    return padHex(address.toLowerCase().replace(/^0x/, ''), 20);
  }

  const toHex = (value) => `0x${BigInt(value).toString(16)}`;

  function parseUnits(amount, decimals) {
    const [whole, frac = ''] = String(amount).split('.');
    const padded = (frac + '0'.repeat(decimals)).slice(0, decimals);
    return BigInt(`${whole || 0}${padded}` || '0');
  }

  /* ------------------------------------------------------- المحفظة */

  const wallet = {
    get provider() {
      return window.ethereum || null;
    },
    async accounts() {
      if (!this.provider) throw new Error('لا يوجد محفظة في المتصفح. استخدم زر النسخ لإرسال المبلغ من تطبيق محفظتك.');
      const accounts = await this.provider.request({ method: 'eth_requestAccounts' });
      return accounts || [];
    },
    async chainId() {
      if (!this.provider) return null;
      return await this.provider.request({ method: 'eth_chainId' });
    },
    async switchChain(chainId) {
      if (!this.provider) throw new Error('لا يمكن تبديل الشبكة بدون محفظة متصفح.');
      await this.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: toHex(chainId) }],
      });
    },
    async sendTransaction(tx) {
      if (!this.provider) throw new Error('لا يوجد محفظة في المتصفح.');
      return await this.provider.request({ method: 'eth_sendTransaction', params: [tx] });
    },
    async sign(message, address) {
      if (!this.provider) throw new Error('لا يوجد محفظة في المتصفح.');
      return await this.provider.request({
        method: 'personal_sign',
        params: [message, address],
      });
    },
    async receipt(hash) {
      if (!this.provider) return null;
      return await this.provider.request({ method: 'eth_getTransactionReceipt', params: [hash] });
    },
  };

  const shorten = (h) => (h ? `${h.slice(0, 8)}…${h.slice(-6)}` : '—');

  /* ------------------------------------------------------- نسخ */

  document.addEventListener('click', async (event) => {
    // نسخ رابط الصفحة
    if (event.target.closest('[data-copy-page]')) {
      try {
        await navigator.clipboard.writeText(location.href);
        const btn = event.target.closest('[data-copy-page]');
        const original = btn.textContent;
        btn.textContent = '✔';
        setTimeout(() => { btn.textContent = original; }, 1200);
      } catch {
        window.prompt('انسخ:', location.href);
      }
      return;
    }

    // إعادة تحميل
    if (event.target.closest('[data-reload]')) {
      location.reload();
      return;
    }

    const btn = event.target.closest('[data-copy]');
    if (!btn) return;
    const value = btn.getAttribute('data-copy');
    try {
      await navigator.clipboard.writeText(value);
      const original = btn.textContent;
      btn.textContent = '✔';
      setTimeout(() => { btn.textContent = original; }, 1200);
    } catch {
      window.prompt('انسخ:', value);
    }
  });

  /* إرسال تلقائي للنماذج عند تغيير القوائم */
  document.addEventListener('change', (event) => {
    const el = event.target.closest('[data-autosubmit]');
    if (el && el.form) el.form.submit();
  });

  /* إخفاء الصور المعطوبة (بدون معالجات inline) */
  document.addEventListener('error', (event) => {
    const target = event.target;
    if (target && target.tagName === 'IMG') target.style.display = 'none';
  }, true);

  /* ------------------------------------------------------- التبويبات */

  $$('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const group = tab.closest('[role=tablist]') || document;
      $$('.tab', group).forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const name = tab.dataset.tab;
      $$('.tab-panel').forEach(panel => {
        panel.hidden = panel.dataset.panel !== name;
      });
    });
  });

  /* ------------------------------------------------------- الظهور بالتمرير */

  const observer = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 })
    : null;

  $$('.reveal').forEach(el => { if (observer) observer.observe(el); else el.classList.add('visible'); });

  /* ------------------------------------------------------- نافذة التبرّع */

  const modal = $('#donate-modal');
  const flow = $('#donate-flow');
  const result = $('#donate-result');
  let state = { amount: '25', symbol: 'USDC', address: '', native: true, decimals: 18 };

  const openModal = () => {
    if (!modal) return;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    updatePreview();
  };
  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  };

  $$('[data-open-donate]').forEach(btn => btn.addEventListener('click', openModal));
  $$('[data-close-donate]').forEach(btn => btn.addEventListener('click', closeModal));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  if (flow) {
    const chainId = Number(flow.dataset.chain);
    const splitter = flow.dataset.splitter || '';
    const splitterId = flow.dataset.splitter ? Number(flow.dataset.splitterId) : null;
    const charity = flow.dataset.charity;
    const slug = flow.dataset.slug;

    const tokenButtons = $$('#token-grid .token-opt');
    tokenButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        tokenButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.symbol = btn.dataset.symbol;
        state.address = btn.dataset.address || '';
        state.native = btn.dataset.native === '1';
        state.decimals = Number(btn.dataset.decimals || 18);
        updatePreview();
      });
      if (btn.classList.contains('active')) {
        state.symbol = btn.dataset.symbol;
        state.address = btn.dataset.address || '';
        state.native = btn.dataset.native === '1';
        state.decimals = Number(btn.dataset.decimals || 18);
      }
    });

    const amountInput = $('#donate-amount');
    const impactCards = $$('.impact-card');
    const amountButtons = $$('.amount-opt');

    const setAmount = (value, source) => {
      amountInput.value = value;
      state.amount = value;
      amountButtons.forEach(b => b.classList.toggle('active', b.dataset.amount === String(value)));
      impactCards.forEach(c => c.classList.toggle('active', c.dataset.amount === String(value)));
      if (source && source.dataset) source.classList.add('active');
      updatePreview();
    };

    amountButtons.forEach(btn => {
      btn.addEventListener('click', () => setAmount(btn.dataset.amount, btn));
    });
    impactCards.forEach(card => {
      card.addEventListener('click', () => setAmount(card.dataset.amount, card));
    });
    amountInput.addEventListener('input', () => {
      amountButtons.forEach(b => b.classList.remove('active'));
      impactCards.forEach(c => c.classList.remove('active'));
      state.amount = amountInput.value;
      updatePreview();
    });

    // نسبة الرسوم لكل مستوى أثر (تُجلب من الخادم — المصدر الموثوق)
    if (impactCards.length) {
      const amounts = [...new Set(impactCards.map(c => c.dataset.amount))].filter(Boolean);
      Promise.all(amounts.map(async (amount) => {
        try {
          const data = await api(`/api/fee-for?chain_id=${encodeURIComponent(state.chainId || 8453)}&symbol=${encodeURIComponent(state.symbol || 'USDC')}&amount=${encodeURIComponent(amount)}`);
          if (!data || typeof data.bps !== 'number') return null;
          return { amount, bps: data.bps };
        } catch { return null; }
      })).then(results => {
        for (const r of results.filter(Boolean)) {
          const el = document.querySelector(`[data-fee-for="${r.amount}"]`);
          if (!el) continue;
          const sign = pctSign();
          const pct = (r.bps / 100).toFixed(r.bps % 100 === 0 ? 0 : 2);
          el.textContent = `${tr('رسوم المنصة')} ${pct}${sign}`;
        }
      }).catch(() => {});
    }

    let priceCache = null;
    async function usdPrice(symbol) {
      if (!priceCache) {
        try {
          priceCache = await api('/api/prices?symbols=' + encodeURIComponent(symbol));
        } catch { priceCache = { prices: {} }; }
      }
      return priceCache.prices[symbol] || null;
    }

    /* نسبة الرسوم الفعلية: من العقد إن كان منشورًا، وإلا من جدول الشرائح */
    let tierCache = null;
    async function feeFor(amount) {
      try {
        const data = await api(`/api/fee-for?chain_id=${chainId}&symbol=${encodeURIComponent(state.symbol)}&amount=${amount}`);
        return data;
      } catch {
        if (!tierCache) {
          try { tierCache = await api('/api/fees'); } catch { tierCache = null; }
        }
        const bps = 900;
        return { bps, fee: amount * (bps / 10000), to_charity: amount * ((10000 - bps) / 10000), source: 'fallback' };
      }
    }

    async function updatePreview() {
      const amount = Number(state.amount || 0);
      const quote = await feeFor(amount);
      const bps = quote.bps || 900;
      const fee = quote.fee ?? amount * (bps / 10000);
      const net = quote.to_charity ?? amount - fee;
      const sign = pctSign();
      $('#fp-gross').textContent = `${amount.toFixed(2)} ${state.symbol}`;
      $('#fp-fee').textContent = `${fee.toFixed(4)} ${state.symbol} (${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}${sign})`;
      $('#fp-charity').textContent = `${net.toFixed(4)} ${state.symbol}`;
      $('#fp-wallet').textContent = charity ? `${shorten(charity)}` : '—';
      const price = await usdPrice(state.symbol);
      $('#fp-usd').textContent = price
        ? `≈ ${(amount * price).toFixed(2)} USD — ${tr('سعر')} ${state.symbol} ${tr('الحالي')}`
        : `${tr('السعر بالدولار غير متاح الآن')} (${tr('لا نعرض أرقامًا تقديرية')}).`;
      const tierNote = $('#fp-tier');
      if (tierNote) {
        tierNote.textContent = quote.usd_estimate
          ? `${tr('نسبة الرسوم المتدرّجة')}: ${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}${sign} (${tr('قيمة التبرّع')} ≈ ${quote.usd_estimate} USD). ${tr('كلما زاد المبلغ انخفضت النسبة')}.`
          : `${tr('نسبة الرسوم المتدرّجة')}: ${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}${sign}. ${tr('كلما زاد المبلغ انخفضت النسبة')}.`;
      }
    }

    async function waitReceipt(hash, timeoutMs = 120000) {
      const started = Date.now();
      while (Date.now() - started < timeoutMs) {
        const receipt = await wallet.receipt(hash);
        if (receipt) return receipt;
        await new Promise(r => setTimeout(r, 3000));
      }
      throw new Error('انتهت مهلة انتظار تأكيد المعاملة.');
    }

    async function ensureChain() {
      const current = await wallet.chainId();
      if (current && Number(current) !== chainId) {
        await wallet.switchChain(chainId);
      }
    }

    async function donate() {
      const status = $('#donate-status');
      const submit = $('#donate-submit');
      const amount = Number(state.amount || 0);
      if (!amount || amount <= 0) {
        status.innerHTML = '<span class="badge badge-failed">أدخل مبلغًا صحيحًا</span>';
        return;
      }
      status.innerHTML = '<span class="badge badge-pending">جارٍ تنفيذ المعاملة…</span>';
      submit.disabled = true;

      try {
        const accounts = await wallet.accounts();
        const from = accounts[0];
        await ensureChain();

        const raw = parseUnits(amount.toFixed(state.decimals), state.decimals);
        let txHash = null;

        if (splitter && splitterId !== null) {
          if (state.native) {
            const selector = await fetchSelector('donate');
            txHash = await wallet.sendTransaction({
              from,
              to: splitter,
              value: toHex(raw),
              data: selector + encodeUint256(splitterId),
            });
          } else {
            status.innerHTML = '<span class="badge badge-pending">الخطوة 1/2: الموافقة على الرمز…</span>';
            const approveSelector = '0x095ea7b3';
            const approveHash = await wallet.sendTransaction({
              from,
              to: state.address,
              data: approveSelector + encodeAddress(splitter) + encodeUint256(raw),
            });
            await waitReceipt(approveHash);
            status.innerHTML = '<span class="badge badge-pending">الخطوة 2/2: إرسال التبرّع…</span>';
            const selector = await fetchSelector('donateToken');
            txHash = await wallet.sendTransaction({
              from,
              to: splitter,
              data: selector + encodeUint256(splitterId) + encodeAddress(state.address) + encodeUint256(raw),
            });
          }
        } else {
          // لا يوجد عقد مقسّم منشور: تحويل مباشر إلى محفظة الجهة المستفيدة
          if (state.native) {
            txHash = await wallet.sendTransaction({ from, to: charity, value: toHex(raw) });
          } else {
            const selector = '0xa9059cbb';
            txHash = await wallet.sendTransaction({
              from,
              to: state.address,
              data: selector + encodeAddress(charity) + encodeUint256(raw),
            });
          }
        }

        status.innerHTML = `<span class="badge badge-pending">أُرسلت المعاملة — جارٍ التحقق على السلسلة…</span>`;

        const registered = await api('/api/donations', {
          method: 'POST',
          body: {
            tx_hash: txHash,
            campaign_slug: slug,
            chain_id: chainId,
            token_symbol: state.symbol,
            donor_address: from,
            donor_name: $('#donate-name').value.trim(),
            message: $('#donate-message').value.trim(),
            is_anonymous: $('#donate-anonymous').checked,
          },
        });

        let donation = registered.donation;
        for (let i = 0; i < 20 && donation && donation.status === 'pending'; i++) {
          await new Promise(r => setTimeout(r, 4000));
          const check = await api('/api/donations/by-tx/' + txHash);
          donation = check.donation;
        }

        showResult(donation, txHash, chainId);
      } catch (err) {
        status.innerHTML = `<span class="badge badge-failed">${escapeHtml(err.message || 'فشلت العملية')}</span>`;
        submit.disabled = false;
      }
    }

    async function fetchSelector(name) {
      try {
        const data = await api(`/api/contracts/${chainId}`);
        return data.selectors[name];
      } catch {
        return name === 'donate' ? '0x' : '0x';
      }
    }

    function showResult(donation, txHash, chainIdValue) {
      flow.hidden = true;
      result.hidden = false;
      const ok = donation && donation.status === 'confirmed';
      const explorer = `${flow.dataset.explorer || 'https://basescan.org'}/tx/${txHash}`;
      result.innerHTML = `
        <div class="stack" style="margin-top:14px">
          <div class="badge ${ok ? 'badge-confirmed' : 'badge-pending'}">${ok ? '✔ تم تأكيد التبرّع على السلسلة' : '⏳ المعاملة أُرسلت — لم تتأكد بعد'}</div>
          ${donation && donation.amount_raw && donation.amount_raw !== '0' ? `
            <div class="fee-preview">
              <div class="line"><span>المبلغ الإجمالي</span><span class="mono">${donation.amount_raw}</span></div>
              <div class="line"><span>رسوم المنصة</span><span class="mono">${donation.fee_raw}</span></div>
              <div class="line total"><span>يصل إلى الجهة المستفيدة</span><span class="mono">${donation.charity_raw}</span></div>
            </div>` : ''}
          <a class="btn btn-outline btn-block" href="${explorer}" target="_blank" rel="noopener">عرض المعاملة على المستكشف ↗</a>
          <button class="btn btn-ghost btn-block" id="donate-again">تبرّع مرة أخرى</button>
        </div>`;
      $('#donate-again').addEventListener('click', () => {
        result.hidden = true;
        flow.hidden = false;
        $('#donate-status').innerHTML = '';
        $('#donate-submit').disabled = false;
      });
    }

    $('#donate-submit').addEventListener('click', donate);
    updatePreview();
  }

  /* ------------------------------------------------------- تسجيل الدخول */

  const signinAddress = $('#signin-address');
  if (signinAddress) {
    $('#btn-read-address').addEventListener('click', async () => {
      const status = $('#signin-status');
      try {
        const accounts = await wallet.accounts();
        signinAddress.value = accounts[0];
        status.innerHTML = '<span class="badge badge-confirmed">تم قراءة العنوان</span>';
      } catch (err) {
        status.innerHTML = `<span class="badge badge-failed">${escapeHtml(err.message)}</span>`;
      }
    });

    $('#btn-signin').addEventListener('click', async () => {
      const status = $('#signin-status');
      const address = signinAddress.value.trim();
      if (!address) {
        status.innerHTML = '<span class="badge badge-failed">أدخل العنوان</span>';
        return;
      }
      try {
        const nonceData = await api('/api/auth/nonce?address=' + encodeURIComponent(address));
        const signature = await wallet.sign(nonceData.message, address);
        await api('/api/auth/verify', {
          method: 'POST',
          body: { address, message: nonceData.message, signature },
        });
        status.innerHTML = '<span class="badge badge-confirmed">✔ تم إنشاء الحساب</span>';
        const next = document.querySelector('#signin-page')?.dataset.next || '';
        setTimeout(() => location.assign(next || '/'), 700);
      } catch (err) {
        status.innerHTML = `<span class="badge badge-failed">${escapeHtml(err.message)}</span>`;
      }
    });
  }

  /* ------------------------------------------------------- التعليقات */

  const commentForm = $('#comment-form');
  if (commentForm) {
    commentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = $('#comment-status');
      const body = commentForm.body.value.trim();
      if (!body) return;
      try {
        const slug = window.location.pathname.split('/')[2];
        await api(`/api/campaigns/${slug}/comments`, {
          method: 'POST',
          body: { body, author_name: commentForm.author_name.value.trim() },
        });
        location.reload();
      } catch (err) {
        status.textContent = err.message;
      }
    });
  }

  /* ------------------------------------------------------- التحديثات */

  const updateForm = $('#update-form');
  if (updateForm) {
    updateForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = $('#update-status');
      try {
        await api(`/api/campaigns/${window.location.pathname.split('/')[2]}/updates`, {
          method: 'POST',
          body: { title: updateForm.title.value, body: updateForm.body.value },
        });
        location.reload();
      } catch (err) {
        status.textContent = err.message;
      }
    });
  }

  /* ------------------------------------------------------- الأرصدة الحيّة */

  async function loadBalance(el) {
    const chainId = el.dataset.chain;
    const address = el.dataset.address;
    const token = el.dataset.token;
    try {
      const data = await api(`/api/wallet/${chainId}/${address}`);
      const found = (data.tokens || []).find(t => t.symbol === token);
      const raw = found ? found.raw : data.native;
      if (!raw) {
        el.textContent = 'تعذّر قراءة الرصيد الآن.';
        return;
      }
      const decimals = found ? 6 : 18;
      const value = Number(raw) / Math.pow(10, decimals);
      el.textContent = `${value.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${token} على الشبكة`;
    } catch {
      el.textContent = 'تعذّر قراءة الرصيد الآن.';
    }
  }

  $$('#live-balance, #dash-balance').forEach(el => { if (el.dataset.address) loadBalance(el); });

  const balancesBox = $('#collector-balances');
  if (balancesBox) {
    api('/api/collector/balances')
      .then(data => {
        if (!data.balances || !data.balances.length) {
          balancesBox.textContent = 'لم تُضبط محفظة الكولكتر بعد.';
          return;
        }
        balancesBox.innerHTML = data.balances.map(b => {
          if (!b.raw) return '';
          const decimals = b.symbol === 'ETH' || b.symbol === 'POL' ? 18 : 6;
          const value = Number(b.raw) / Math.pow(10, decimals);
          return `<div class="spread"><span>${b.symbol} · ${b.chain}</span><span class="mono">${value.toLocaleString('en-US', { maximumFractionDigits: 6 })}</span></div>`;
        }).join('') || 'لا توجد أرصدة.';
      })
      .catch(() => { balancesBox.textContent = 'تعذّر قراءة الأرصدة الآن.'; });
  }

  /* ------------------------------------------------------- قائمة الجوال */

  const navToggle = $('#nav-toggle');
  const siteNav = $('#site-nav');
  const siteHeader = document.querySelector('.site-header');
  if (navToggle && siteNav) {
    const setMenu = (open) => {
      navToggle.setAttribute('aria-expanded', String(open));
      siteNav.classList.toggle('open', open);
      if (siteHeader) siteHeader.classList.toggle('menu-open', open);
    };
    navToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      setMenu(navToggle.getAttribute('aria-expanded') !== 'true');
    });
    // إغلاق بالنقر خارج القائمة
    document.addEventListener('click', (e) => {
      if (!siteNav.classList.contains('open')) return;
      if (e.target.closest('#site-nav') || e.target.closest('#nav-toggle')) return;
      setMenu(false);
    });
    // إغلاق بمفتاح Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && siteNav.classList.contains('open')) {
        setMenu(false);
        navToggle.focus();
      }
    });
    // عند العودة لعرض كبير تُغلق اللوحة
    window.addEventListener('resize', () => {
      if (window.innerWidth > 960) setMenu(false);
    });
  }

  /* ------------------------------------------------------- منع عناوين المحافظ في نصوص الحملة */

  const storyField = $('#story-field');
  if (storyField) {
    const form = storyField.closest('form');
    const warning = $('#wallet-warning');
    const ADDRESS_RE = /0x[a-fA-F0-9]{6,}/g;
    /* عناوين TRON/TRC20: T + 33 محرف Base58 (نكتفي بالشكل في الواجهة؛
       الخادم يتحقق من الـchecksum بشكل ملزم) */
    const TRON_RE = /\bT[1-9A-HJ-NP-Za-km-z]{33}\b/g;
    const check = () => {
      const fields = ['title', 'subtitle', 'story'];
      const found = [];
      for (const name of fields) {
        const input = form.querySelector(`[name="${name}"]`);
        if (!input) continue;
        const matches = String(input.value || '').match(ADDRESS_RE);
        if (matches) found.push(...matches);
        const tron = String(input.value || '').match(TRON_RE);
        if (tron) found.push(...tron);
      }
      if (found.length) {
        warning.hidden = false;
        warning.textContent = `لا يمكن نشر وصف يحتوي على عنوان محفظة (${found[0]}). انقل العنوان إلى خانة «محفظة الجهة المستفيدة».`;
      } else {
        warning.hidden = true;
        warning.textContent = '';
      }
      return found.length === 0;
    };
    form.addEventListener('input', check);
    form.addEventListener('submit', (e) => {
      if (!check()) {
        e.preventDefault();
        warning.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  /* ------------------------------------- فحص عنوان المحفظة مقابل الشبكة المختارة */

  const walletInput = $('[name="charity_wallet"]');
  const chainSelect = $('[name="chain_id"]');
  if (walletInput && chainSelect) {
    const hint = $('#wallet-network-hint');
    const EVM_RE = /^0x[a-fA-F0-9]{40}$/;
    const TRON_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
    const TRON_HEX_RE = /^(0x)?41[a-fA-F0-9]{40}$/;
    const CHAIN_NAMES = {
      1: 'إيثيريوم', 56: 'بينانس (BNB)', 137: 'بوليجون',
      8453: 'بيس', 84532: 'بيس Sepolia', 728126428: 'ترون (TRC20)',
    };

    const checkWallet = () => {
      const value = String(walletInput.value || '').trim();
      const chainId = Number(chainSelect.value);
      const chainName = CHAIN_NAMES[chainId] || 'الشبكة المختارة';
      const isTron = TRON_RE.test(value) || TRON_HEX_RE.test(value);
      const isEvm = EVM_RE.test(value);
      let message = '';
      let bad = false;

      if (value && isTron && chainId !== 728126428) {
        bad = true;
        message = `⚠️ هذا عنوان TRON/TRC20 (يبدأ بحرف T) ولا يصلح على ${chainName}. اختر «ترون (TRC20)» أو استخدم عنوان EVM (0x…).`;
      } else if (value && isEvm && chainId === 728126428) {
        bad = true;
        message = '⚠️ هذا عنوان EVM (0x…) ولا يصلح على ترون. استخدم عنوان TRON (يبدأ بحرف T) أو اختر شبكة EVM.';
      } else if (value && isTron) {
        message = '✓ عنوان TRON صالح — تذكير: انسخ العنوان كاملًا (34 محرفًا).';
      } else if (value && isEvm) {
        message = `✓ عنوان EVM صالح — نفس العنوان صالح على كل شبكات EVM، تأكد أن الجهة تملكه على ${chainName}.`;
      }

      if (hint) {
        hint.textContent = message;
        hint.hidden = !message;
        hint.className = bad ? 'alert alert-error' : 'hint';
      }
      return !bad;
    };

    walletInput.addEventListener('input', checkWallet);
    chainSelect.addEventListener('change', checkWallet);
    checkWallet();

    /* الرموز المتاحة تختلف حسب الشبكة (USDT على ترون، لا USDG مثلًا) */
    const tokenSelect = $('#token-select');
    if (tokenSelect) {
      const syncTokens = () => {
        const option = chainSelect.selectedOptions[0];
        const allowed = String((option && option.dataset.tokens) || '').split(',').filter(Boolean);
        const native = option && option.dataset.family === 'tron' ? 'TRX' : null;
        const list = native ? [native, ...allowed] : allowed;
        const current = tokenSelect.value;
        for (const opt of tokenSelect.options) {
          opt.hidden = list.length ? !list.includes(opt.value) : false;
          opt.disabled = opt.hidden;
        }
        if (list.length && !list.includes(current)) tokenSelect.value = list[0];
      };
      chainSelect.addEventListener('change', syncTokens);
      syncTokens();
    }
  }

  /* ------------------------- محرّر مستويات الأثر (في نموذج الإنشاء) ------------------------- */

  const impactBox = $('#impact-levels');
  if (impactBox) {
    const addBtn = $('#impact-add');
    const suggestBtn = $('#impact-suggest');
    const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch]));

    const rowHtml = (i) => `
      <div class="impact-row" data-index="${i}">
        <input type="number" name="impact_amount_${i}" min="1" step="1" placeholder="25" aria-label="amount">
        <input type="text" name="impact_label_${i}" maxlength="200" placeholder="" aria-label="impact">
        <input type="text" name="impact_label_en_${i}" maxlength="200" placeholder="EN" aria-label="impact en">
        <button type="button" class="btn btn-ghost btn-sm impact-remove">✕</button>
      </div>`;

    const reindex = () => {
      $$('.impact-row', impactBox).forEach((row, i) => {
        row.dataset.index = i;
        const [amount, label, labelEn] = ['amount', 'label', 'label_en'].map((k, n) => row.querySelector(`[name="impact_${k}_${row.dataset.index}"]`) || row.children[n]);
        if (amount) amount.name = `impact_amount_${i}`;
        if (label) label.name = `impact_label_${i}`;
        if (labelEn) labelEn.name = `impact_label_en_${i}`;
      });
    };

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const i = impactBox.querySelectorAll('.impact-row').length;
        impactBox.insertAdjacentHTML('beforeend', rowHtml(i));
        reindex();
      });
    }

    if (suggestBtn) {
      suggestBtn.addEventListener('click', async () => {
        suggestBtn.disabled = true;
        try {
          const res = await fetch('/api/fees');
          const data = await res.json().catch(() => ({}));
          const tiers = (data.tiers || []).map(t => (t.max_usd === null ? 500 : t.max_usd));
          const amounts = [...new Set(tiers)].filter(v => v > 0).sort((a, b) => a - b).slice(0, 4);
          for (const amount of amounts) {
            const i = impactBox.querySelectorAll('.impact-row').length;
            impactBox.insertAdjacentHTML('beforeend', rowHtml(i));
            const row = impactBox.querySelector(`.impact-row[data-index="${i}"]`);
            const input = row.querySelector(`[name="impact_amount_${i}"]`);
            if (input) input.value = amount;
          }
          reindex();
        } catch { /* تجاهل */ }
        suggestBtn.disabled = false;
      });
    }

    impactBox.addEventListener('click', (e) => {
      const btn = e.target.closest('.impact-remove');
      if (!btn) return;
      const row = btn.closest('.impact-row');
      if (row) row.remove();
      reindex();
    });
  }

  /* ------------------------- توقيع محفظة المنظّم (حفظ الحملة أو بعد الموافقة) ------------------------- */

  const signCampaignBtn = $('#sign-campaign');
  if (signCampaignBtn) {
    const statusEl = $('#sign-campaign-status');
    const slug = signCampaignBtn.dataset.slug;
    signCampaignBtn.addEventListener('click', async () => {
      const setStatus = (text, ok) => {
        if (!statusEl) return;
        statusEl.textContent = text;
        statusEl.style.color = ok ? 'var(--brand)' : 'var(--danger)';
      };
      setStatus(tr('جارٍ فتح المحفظة…'), true);
      try {
        const accounts = await wallet.accounts();
        const from = accounts[0];
        if (!from) throw new Error(tr('لا يوجد محفظة في المتصفح'));
        const message = [
          'HADIYA — إثبات ملكية محفظة المنظّم',
          `campaign: ${slug}`,
          `address: ${from}`,
          'I confirm I control this address.',
        ].join('\n');
        const signature = await wallet.sign(message, from);
        const res = await fetch(`/c/${encodeURIComponent(slug)}/sign`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ address: from, message, signature }),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text.slice(0, 120) || tr('فشلت العملية'));
        }
        location.reload();
      } catch (err) {
        setStatus(String(err && err.message ? err.message : err), false);
      }
    });
  }
  /* ------------------------- توقيع محفظة المنظّم داخل نموذج الإنشاء ------------------------- */

  const signOrganizerBtn = $('#sign-organizer');
  if (signOrganizerBtn) {
    const addressField = $('#organizer-address');
    const messageField = $('#organizer-message');
    const signatureField = $('#organizer-signature');
    const statusField = $('#organizer-status');

    const setStatus = (text, ok) => {
      if (!statusField) return;
      statusField.textContent = text;
      statusField.style.color = ok ? 'var(--brand)' : 'var(--danger)';
    };

    signOrganizerBtn.addEventListener('click', async () => {
      setStatus(tr('جارٍ فتح المحفظة…'), true);
      try {
        const accounts = await wallet.accounts();
        const from = accounts[0];
        if (!from) throw new Error(tr('لا يوجد محفظة في المتصفح'));
        const typed = String((addressField && addressField.value) || '').trim();
        if (typed && typed.toLowerCase() !== from.toLowerCase()) {
          throw new Error(tr('العنوان لا يطابق حساب محفظتك — وقّع بالعنوان نفسه.'));
        }
        if (addressField) addressField.value = from;
        const message = [
          'HADIYA — إثبات ملكية محفظة المنظّم',
          `address: ${from}`,
          `time: ${Date.now()}`,
          'I confirm I control this address.',
        ].join('\n');
        const signature = await wallet.sign(message, from);
        if (messageField) messageField.value = message;
        if (signatureField) signatureField.value = signature;
        setStatus(tr('✔ تم إثبات العنوان بتوقيع صالح.'), true);
      } catch (err) {
        setStatus(String(err && err.message ? err.message : err), false);
      }
    });
  }

  /* ------------------------- توقيع عنوان الاستلام (إثبات الملكية) ------------------------- */

  const signBtn = $('#sign-delivery');
  if (signBtn) {
    const addressField = $('#delivery-address');
    const messageField = $('#delivery-message');
    const signatureField = $('#delivery-signature');
    const statusField = $('#delivery-status');

    const setStatus = (text, ok) => {
      if (!statusField) return;
      statusField.textContent = text;
      statusField.className = ok ? 'small' : 'small muted';
      statusField.style.color = ok ? 'var(--brand)' : 'var(--danger)';
    };

    signBtn.addEventListener('click', async () => {
      const address = String((addressField && addressField.value) || '').trim();
      if (!address) {
        setStatus('أدخل عنوان الاستلام أولًا.', false);
        return;
      }
      // نفس قواعد الشبكة المستخدمة في الخادم
      const isTron = /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address) || /^(0x)?41[0-9a-fA-F]{40}$/i.test(address);
      const isEvm = /^0x[0-9a-fA-F]{40}$/.test(address);
      if (!isTron && !isEvm) {
        setStatus('صيغة العنوان غير صحيحة — عنوان EVM يبدأ بـ 0x أو عنوان TRON بحرف T.', false);
        return;
      }

      setStatus('جارٍ فتح المحفظة…', true);
      try {
        const accounts = await wallet.accounts();
        const from = accounts[0];
        if (!from) throw new Error('لم تُرجع المحفظة أي حساب.');

        // يجب أن يوقّع صاحب العنوان نفسه
        const same = isEvm
          ? from.toLowerCase() === address.toLowerCase()
          : true; // عنوان TRON: نتحقق من التوقيع في الخادم
        if (!same) {
          setStatus('العنوان لا يطابق حساب محفظتك — وقّع بالعنوان نفسه.', false);
          return;
        }

        const message = [
          'HADIYA — إثبات ملكية عنوان الاستلام',
          `address: ${address}`,
          `campaign: ${new Date().toISOString()}`,
          'I confirm I control this address.',
        ].join('\n');

        const signature = await wallet.sign(message, from);
        if (messageField) messageField.value = message;
        if (signatureField) signatureField.value = signature;
        setStatus('✔ تم إثبات العنوان بتوقيع صالح.', true);
      } catch (err) {
        setStatus(String(err && err.message ? err.message : err), false);
      }
    });
  }

  /* ------------------------------------------------------- قائمة المراجعة (المشرف) */

  const pendingRows = $('#pending-rows');
  if (pendingRows) {
    const loadPending = async () => {
      try {
        const data = await api('/api/campaigns-pending');
        if (!data.campaigns.length) {
          pendingRows.innerHTML = '<tr><td colspan="5" class="muted">لا توجد حملات بانتظار المراجعة.</td></tr>';
          return;
        }
        pendingRows.innerHTML = data.campaigns.map(c => `
          <tr>
            <td><a href="/c/${encodeURIComponent(c.slug)}">${escapeHtml(c.title)}</a></td>
            <td class="mono">${escapeHtml(c.charity_wallet)}</td>
            <td class="mono">$${Number(c.goal_usd || 0).toLocaleString()}</td>
            <td class="small muted">${escapeHtml(new Date(c.created_at).toLocaleDateString('en-GB'))}</td>
            <td>
              <button class="btn btn-primary btn-sm" data-review="${encodeURIComponent(c.slug)}" data-status="active">موافقة</button>
              <button class="btn btn-outline btn-sm" data-review="${encodeURIComponent(c.slug)}" data-status="rejected">رفض</button>
            </td>
          </tr>`).join('');
      } catch (err) {
        pendingRows.innerHTML = `<tr><td colspan="5" class="muted">${escapeHtml(err.message)}</td></tr>`;
      }
    };
    loadPending();
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-review]');
      if (!btn) return;
      btn.disabled = true;
      try {
        await api(`/api/campaigns/${btn.dataset.review}/status`, {
          method: 'POST',
          body: { status: btn.dataset.status },
        });
        await loadPending();
      } catch (err) {
        alert(err.message);
        btn.disabled = false;
      }
    });
  }

  /* ------------------------------------------------------- ربط محفظة بالحساب */

  const linkBtn = $('#link-wallet-btn');
  if (linkBtn) {
    linkBtn.addEventListener('click', async () => {
      const status = $('#link-wallet-status');
      const address = $('#link-wallet-address').value.trim();
      if (!address) {
        status.innerHTML = '<span class="badge badge-failed">أدخل عنوان المحفظة</span>';
        return;
      }
      try {
        const accounts = await wallet.accounts();
        const from = accounts[0];
        const message = [
          'ربط المحفظة بحسابي على ' + document.title.split('—')[0].trim(),
          '',
          'العنوان: ' + from,
          'الحساب: ' + (status.dataset.username || ''),
          '',
          'بتوقيعي هذا أوافق على ربط هذه المحفظة بحسابي.',
        ].join('\n');
        const signature = await wallet.sign(message, from);
        const res = await fetch('/account/link-wallet', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ address: from, message, signature }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.ok === false) throw new Error(data.error || 'فشل الربط');
        location.reload();
      } catch (err) {
        status.innerHTML = `<span class="badge badge-failed">${escapeHtml(err.message)}</span>`;
      }
    });
  }

  /* ------------------------------------------------------- بحث الأسئلة الشائعة */

  const faqSearch = $('#faq-search');
  if (faqSearch) {
    const items = $$('#faq-list .panel');
    const empty = $('#faq-empty');
    const filters = $('#faq-filters');
    let activeTag = '';

    // أزرار الفئات من البيانات المتاحة في الصفحة
    const tags = new Set();
    items.forEach(el => (el.dataset.tags || '').split(' ').filter(Boolean).forEach(t => tags.add(t)));
    let catLabels = {};
    try { catLabels = JSON.parse((filters && filters.dataset.categories) || '{}'); } catch { catLabels = {}; }
    if (filters) {
      filters.insertAdjacentHTML('beforeend', `<button type="button" class="chip active" data-tag="">${tr('الكل')}</button>`);
      for (const tag of tags) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip';
        b.dataset.tag = tag;
        b.textContent = catLabels[tag] || tag;
        b.addEventListener('click', () => {
          activeTag = activeTag === tag ? '' : tag;
          $$('.chip', filters).forEach(c => c.classList.toggle('active', (c.dataset.tag || '') === activeTag));
          apply();
        });
        filters.appendChild(b);
      }
    }

    const apply = () => {
      const q = faqSearch.value.trim().toLowerCase();
      let visible = 0;
      items.forEach(el => {
        const matchText = !q || (el.dataset.q || '').toLowerCase().includes(q) || el.innerText.toLowerCase().includes(q);
        const matchTag = !activeTag || (el.dataset.tags || '').split(' ').includes(activeTag);
        const show = matchText && matchTag;
        el.hidden = !show;
        if (show) visible += 1;
      });
      if (empty) empty.hidden = visible > 0;
    };

    faqSearch.addEventListener('input', apply);
  }

  /* ------------------------------------------------------- حاسبة الرسوم */

  const calcAmount = $('#calc-amount');
  if (calcAmount) {
    let tiers = null;
    const loadTiers = async () => {
      if (!tiers) {
        try {
          const data = await api('/api/fees');
          tiers = data.tiers || [];
        } catch { tiers = []; }
      }
      return tiers;
    };
    const bpsFor = (usd) => {
      for (const tier of tiers) {
        if (tier.max_usd === null || usd <= tier.max_usd) return tier.bps;
      }
      return tiers.length ? tiers[tiers.length - 1].bps : 900;
    };
    const update = async () => {
      const v = Number(calcAmount.value || 0);
      await loadTiers();
      const bps = bpsFor(v);
      $('#calc-gross').textContent = `$${v.toFixed(2)}`;
      $('#calc-fee').textContent = `$${(v * bps / 10000).toFixed(2)} (${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}${pctSign()})`;
      $('#calc-net').textContent = `$${(v * (10000 - bps) / 10000).toFixed(2)}`;
      const tierNote = $('#calc-tier');
      if (tierNote) {
        const next = tiers.find(t => t.max_usd !== null && v <= t.max_usd);
        const sign = pctSign();
        tierNote.textContent = next && next.max_usd
          ? `${tr('الشريحة الحالية')} ${(next.bps / 100).toFixed(0)}${sign} — ${tr('وعند تجاوز')} $${next.max_usd} ${tr('تنخفض إلى')} ${(tiers.find(t => t.max_usd !== null && t.max_usd > next.max_usd)?.bps || 0) / 100}${sign}.`
          : tr('أقصى شريحة مطبّقة');
      }
    };
    calcAmount.addEventListener('input', update);
    update();
  }

  /* ------------------------------------------------------- مساعدات */

  function escapeHtml(text) {
    return String(text || '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch]));
  }

  window.HadiyaApp = { api, wallet, parseUnits, encodeUint256, encodeAddress };
})();
