/* ============================================================
   HADIYA — المساعد الذكي (عائم في كل الصفحات)
   يجيب من قاعدة المعرفة المحلية؛ اختياريًا يستعمل LLM إن ضُبط LLM_API_KEY
   ============================================================ */

(() => {
  let LANG = document.documentElement.lang === 'en' ? 'en' : 'ar';

  const T = {
    ar: {
      title: 'المساعد الذكي',
      hint: 'اسأل عن الرسوم، الاسترداد، الشبكات، الأمان…',
      send: 'إرسال',
      thinking: 'أبحث…',
      open: 'اسأل المساعد',
      close: 'إغلاق',
      sources: 'مصادر',
      suggestions: 'أسئلة شائعة',
      error: 'تعذّر الاتصال — حاول مرة أخرى.',
    },
    en: {
      title: 'Assistant',
      hint: 'Ask about fees, refunds, networks, safety…',
      send: 'Send',
      thinking: 'Looking…',
      open: 'Ask the assistant',
      close: 'Close',
      sources: 'Sources',
      suggestions: 'Common questions',
      error: 'Connection failed — please retry.',
    },
  };
  // جدول النصوص حسب اللغة الحالية
  const tr = () => T[LANG];

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <button id="asst-toggle" class="asst-toggle" aria-label="${tr().open}" title="${tr().open}">💬</button>
    <div class="asst-panel" id="asst-panel" hidden>
      <div class="asst-head">
        <strong>${tr().title}</strong>
        <button class="asst-close" id="asst-close" aria-label="${tr().close}">✕</button>
      </div>
      <div class="asst-log" id="asst-log" role="log" aria-live="polite" aria-label="محادثة المساعد"></div>
      <div class="asst-sugg" id="asst-sugg"></div>
      <form class="asst-form" id="asst-form">
        <input type="text" id="asst-input" placeholder="${tr().hint}" autocomplete="off">
        <button class="btn btn-primary btn-sm" type="submit">${tr().send}</button>
      </form>
    </div>`;
  document.body.appendChild(wrap);

  const panel = wrap.querySelector('#asst-panel');
  const log = wrap.querySelector('#asst-log');
  const form = wrap.querySelector('#asst-form');
  const input = wrap.querySelector('#asst-input');
  const suggBox = wrap.querySelector('#asst-sugg');

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));

  const mdBold = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  function addMessage(role, html) {
    const el = document.createElement('div');
    el.className = `asst-msg asst-${role}`;
    el.innerHTML = html;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  async function loadSuggestions() {
    try {
      const res = await fetch(`/api/assistant/suggestions?lang=${LANG}`);
      const data = await res.json();
      if (!data.suggestions) return;
      suggBox.innerHTML = '';
      suggBox.insertAdjacentHTML('beforeend', `<div class="asst-sugg-label">${tr().suggestions}</div>`);
      for (const s of data.suggestions.slice(0, 8)) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'asst-chip';
        b.textContent = s;
        b.addEventListener('click', () => {
          input.value = s;
          form.requestSubmit();
        });
        suggBox.appendChild(b);
      }
    } catch { /* تجاهل */ }
  }

  async function ask(question) {
    if (!question.trim()) return;
    addMessage('user', esc(question));
    const thinking = addMessage('bot', `<span class="asst-thinking">${tr().thinking}</span>`);
    try {
      const res = await fetch('/api/assistant/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question, lang: LANG }),
      });
      const data = await res.json();
      thinking.remove();
      if (!res.ok || !data.ok) throw new Error(data.error || tr().error);

      let html = `<div>${mdBold(data.answer)}</div>`;
      if (data.sources && data.sources.length) {
        html += `<div class="asst-sources"><span>${tr().sources}:</span>`;
        for (const s of data.sources) {
          html += `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.q)}</a>`;
        }
        html += '</div>';
      }
      if (data.suggestions && data.suggestions.length) {
        html += '<div class="asst-follow">';
        for (const s of data.suggestions.slice(0, 3)) {
          html += `<button type="button" class="asst-chip" data-q="${esc(s)}">${esc(s)}</button>`;
        }
        html += '</div>';
      }
      addMessage('bot', html);
    } catch (err) {
      thinking.remove();
      addMessage('bot', `<span class="asst-error">${esc(err.message || tr().error)}</span>`);
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    input.value = '';
    ask(q);
  });

  log.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-q]');
    if (chip) {
      input.value = chip.dataset.q;
      form.requestSubmit();
    }
  });

  wrap.querySelector('#asst-toggle').addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open;
    wrap.querySelector('#asst-toggle').setAttribute('aria-expanded', String(open));
    if (open) {
      loadSuggestions();
      if (!log.children.length) {
        addMessage('bot', LANG === 'en'
          ? 'Hi! Ask me anything about donations, fees, refunds, networks or safety.'
          : 'مرحبًا! اسألني عن التبرّع، الرسوم، الاسترداد، الشبكات، أو الأمان.');
      }
      input.focus();
    }
  });

  wrap.querySelector('#asst-close').addEventListener('click', (e) => {
    e.stopPropagation();
    panel.hidden = true;
    wrap.querySelector('#asst-toggle').setAttribute('aria-expanded', 'false');
  });

  // إغلاق بالنقر خارج اللوحة
  document.addEventListener('click', (e) => {
    if (panel.hidden) return;
    if (e.target.closest('#asst-panel') || e.target.closest('#asst-toggle')) return;
    panel.hidden = true;
    wrap.querySelector('#asst-toggle').setAttribute('aria-expanded', 'false');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) {
      panel.hidden = true;
      wrap.querySelector('#asst-toggle').setAttribute('aria-expanded', 'false');
    }
  });

  /* تحديث نصوص اللاجهة فور تبديل اللغة */
  function applyShellLang() {
    const toggle = wrap.querySelector('#asst-toggle');
    toggle.setAttribute('aria-label', tr().open);
    toggle.setAttribute('title', tr().open);
    wrap.querySelector('.asst-head strong').textContent = tr().title;
    wrap.querySelector('#asst-close').setAttribute('aria-label', tr().close);
    input.setAttribute('placeholder', tr().hint);
    form.querySelector('button[type="submit"]').textContent = tr().send;
  }

  document.addEventListener('hadiya:lang', (e) => {
    LANG = (e.detail && e.detail.lang) === 'en' ? 'en' : 'ar';
    applyShellLang();
    loadSuggestions();
  });

  loadSuggestions();
})();
