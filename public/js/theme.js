/* ============================================================
   HADIYA — محرّك المظهر والتخصيص
   - ثيمات: فاتح / داكن / رملي / منتصف الليل / تلقائي (حسب النظام)
   - لون تمييز مخصّص (مثل X) + ألوان جاهزة
   - حجم الخط (صغير/عادي/كبير) + الكثافة (مضغوط/مريح)
   - يُحفظ في localStorage ويُطبَّق فورًا قبل الرسم (في <head>)
   ============================================================ */

(() => {
  // يعمل في المتصفح وفي Node (للاختبارات) — الأجزاء المعتمدة على DOM تُتخطّى في Node
  const hasDom = typeof document !== 'undefined' && typeof window !== 'undefined';

  const STORAGE_KEY = 'hadiya_theme';
  let LANG = hasDom && document.documentElement.lang === 'en' ? 'en' : 'ar';

  const T = {
    ar: {
      title: 'تخصيص المظهر',
      theme: 'الثيم',
      accent: 'لون التمييز',
      custom: 'لون مخصّص',
      text: 'حجم الخط',
      density: 'الكثافة',
      reset: 'استعادة الافتراضي',
      themes: { light: 'فاتح', dark: 'داكن', sand: 'رملي', midnight: 'منتصف الليل', auto: 'حسب النظام' },
      textSizes: { sm: 'صغير', md: 'عادي', lg: 'كبير' },
      densities: { compact: 'مضغوط', comfortable: 'مريح' },
      accentName: 'أخضر',
    },
    en: {
      title: 'Customize appearance',
      theme: 'Theme',
      accent: 'Accent color',
      custom: 'Custom color',
      text: 'Text size',
      density: 'Density',
      reset: 'Reset to default',
      themes: { light: 'Light', dark: 'Dark', sand: 'Sand', midnight: 'Midnight', auto: 'System' },
      textSizes: { sm: 'Small', md: 'Default', lg: 'Large' },
      densities: { compact: 'Compact', comfortable: 'Comfortable' },
      accentName: 'Emerald',
    },
  };
  // جدول النصوص حسب اللغة الحالية — يتحدث فورًا مع تبديل اللغة
  const tr = () => T[LANG];

  const THEMES = ['light', 'dark', 'sand', 'midnight', 'auto'];
  const ACCENTS = [
    { key: 'emerald', hex: '#0f7a55', ar: 'أخضر', en: 'Emerald' },
    { key: 'blue', hex: '#1d4ed8', ar: 'أزرق', en: 'Blue' },
    { key: 'violet', hex: '#7c3aed', ar: 'بنفسجي', en: 'Violet' },
    { key: 'rose', hex: '#e11d48', ar: 'وردي', en: 'Rose' },
    { key: 'amber', hex: '#d97706', ar: 'كهرماني', en: 'Amber' },
    { key: 'teal', hex: '#0d9488', ar: 'أزرق مخضر', en: 'Teal' },
    { key: 'crimson', hex: '#dc2626', ar: 'قرمزي', en: 'Crimson' },
    { key: 'indigo', hex: '#4f46e5', ar: 'نيلي', en: 'Indigo' },
  ];
  const TEXT_SIZES = ['sm', 'md', 'lg'];
  const DENSITIES = ['compact', 'comfortable'];

  const DEFAULTS = {
    theme: 'auto',
    accent: 'emerald',
    customAccent: '',
    text: 'md',
    density: 'comfortable',
  };

  /* ---------- دوال ألوان (نقية — قابلة للاختبار) ---------- */

  function hexToRgb(hex) {
    const clean = String(hex || '').replace('#', '').trim();
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    };
  }

  const rgbToHex = ({ r, g, b }) => '#' + [r, g, b]
    .map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
    .join('');

  /* مزج لون مع أبيض/أسود بنسبة (0..1) */
  function mix(hex, target, amount) {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    const t = target === 'white' ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 };
    return rgbToHex({
      r: rgb.r + (t.r - rgb.r) * amount,
      g: rgb.g + (t.g - rgb.g) * amount,
      b: rgb.b + (t.b - rgb.b) * amount,
    });
  }

  /* سطوع نسبي (0..1) */
  function luminance(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0;
    const chan = [rgb.r, rgb.g, rgb.b].map(v => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2];
  }

  /* لون نص مقروء فوق الخلفية */
  function readableInk(hex) {
    return luminance(hex) > 0.55 ? '#10201a' : '#ffffff';
  }

  /* ---------- الحالة ---------- */

  function readPrefs() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULTS };
      const parsed = JSON.parse(raw);
      return {
        theme: THEMES.includes(parsed.theme) ? parsed.theme : DEFAULTS.theme,
        accent: ACCENTS.some(a => a.key === parsed.accent) ? parsed.accent : DEFAULTS.accent,
        customAccent: /^#[0-9a-fA-F]{6}$/.test(parsed.customAccent || '') ? parsed.customAccent : '',
        text: TEXT_SIZES.includes(parsed.text) ? parsed.text : DEFAULTS.text,
        density: DENSITIES.includes(parsed.density) ? parsed.density : DEFAULTS.density,
      };
    } catch {
      return { ...DEFAULTS };
    }
  }

  function savePrefs(prefs) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch { /* تجاهل */ }
  }

  function resolveTheme(theme) {
    if (theme !== 'auto') return theme;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function accentHex(prefs) {
    if (prefs.customAccent) return prefs.customAccent;
    const found = ACCENTS.find(a => a.key === prefs.accent);
    return found ? found.hex : ACCENTS[0].hex;
  }

  /* ---------- التطبيق ---------- */

  function apply(prefs) {
    const root = document.documentElement;
    const theme = resolveTheme(prefs.theme);
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-text', prefs.text);
    root.setAttribute('data-density', prefs.density);

    const brand = accentHex(prefs);
    root.style.setProperty('--brand', brand);
    root.style.setProperty('--brand-ink', mix(brand, 'black', 0.28));
    root.style.setProperty('--brand-soft', mix(brand, theme === 'light' || theme === 'sand' ? 'white' : 'black', theme === 'light' || theme === 'sand' ? 0.86 : 0.72));
    root.style.setProperty('--accent', mix(brand, 'white', 0.55));
    root.style.setProperty('--ring', `0 0 0 3px ${mix(brand, 'white', 0.75)}`);
    root.style.colorScheme = (theme === 'dark' || theme === 'midnight') ? 'dark' : 'light';
  }

  const prefs = readPrefs();
  if (hasDom) {
    apply(prefs);

    // تغيّر نظام التشغيل يحدّث الثيم التلقائي
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const onChange = () => { if (readPrefs().theme === 'auto') apply(readPrefs()); };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
  }

  /* ---------- اللوحة ---------- */

  function buildPanel() {
    const panel = document.createElement('div');
    panel.className = 'theme-panel';
    panel.id = 'theme-panel';
    panel.hidden = true;
    document.body.appendChild(panel);
    return panel;
  }

  function renderPanel(panel) {
    const p = readPrefs();
    const swatch = (hex, active, name) => `
      <button type="button" class="theme-opt ${active ? 'active' : ''}" data-accent="${hex}" title="${name}">
        <span class="theme-swatch" style="background:${hex}"></span>
        ${name}
      </button>`;

    panel.innerHTML = `
      <h4>${tr().title}</h4>

      <div>
        <h4>${tr().theme}</h4>
        <div class="theme-row">
          ${THEMES.map(th => `<button type="button" class="theme-opt ${p.theme === th ? 'active' : ''}" data-theme="${th}">${tr().themes[th]}</button>`).join('')}
        </div>
      </div>

      <div class="divider"></div>

      <div>
        <h4>${tr().accent}</h4>
        <div class="theme-row">
          ${ACCENTS.map(a => swatch(a.hex, p.accent === a.key && !p.customAccent, LANG === 'en' ? a.en : a.ar)).join('')}
        </div>
        <div class="theme-custom" style="margin-top:8px">
          <input type="color" id="custom-accent" value="${p.customAccent || accentHex(p)}">
          <span class="small muted">${tr().custom}</span>
        </div>
      </div>

      <div class="divider"></div>

      <div>
        <h4>${tr().text}</h4>
        <div class="theme-row">
          ${TEXT_SIZES.map(s => `<button type="button" class="theme-opt ${p.text === s ? 'active' : ''}" data-text="${s}">${tr().textSizes[s]}</button>`).join('')}
        </div>
      </div>

      <div>
        <h4>${tr().density}</h4>
        <div class="theme-row">
          ${DENSITIES.map(d => `<button type="button" class="theme-opt ${p.density === d ? 'active' : ''}" data-density="${d}">${tr().densities[d]}</button>`).join('')}
        </div>
      </div>

      <div class="divider"></div>
      <button type="button" class="theme-opt theme-reset" id="theme-reset">↺ ${tr().reset}</button>`;

    // اختيار الثيم
    panel.querySelectorAll('[data-theme]').forEach(btn => {
      btn.addEventListener('click', () => {
        const next = { ...readPrefs(), theme: btn.dataset.theme };
        savePrefs(next);
        apply(next);
        renderPanel(panel);
      });
    });

    // اختيار اللون
    panel.querySelectorAll('[data-accent]').forEach(btn => {
      btn.addEventListener('click', () => {
        const next = { ...readPrefs(), accent: 'custom', customAccent: btn.dataset.accent };
        savePrefs(next);
        apply(next);
        renderPanel(panel);
      });
    });

    const custom = panel.querySelector('#custom-accent');
    if (custom) {
      custom.addEventListener('input', () => {
        const next = { ...readPrefs(), customAccent: custom.value, accent: 'custom' };
        savePrefs(next);
        apply(next);
      });
    }

    // حجم الخط
    panel.querySelectorAll('[data-text]').forEach(btn => {
      btn.addEventListener('click', () => {
        const next = { ...readPrefs(), text: btn.dataset.text };
        savePrefs(next);
        apply(next);
        renderPanel(panel);
      });
    });

    // الكثافة
    panel.querySelectorAll('[data-density]').forEach(btn => {
      btn.addEventListener('click', () => {
        const next = { ...readPrefs(), density: btn.dataset.density };
        savePrefs(next);
        apply(next);
        renderPanel(panel);
      });
    });

    const reset = panel.querySelector('#theme-reset');
    if (reset) {
      reset.addEventListener('click', () => {
        savePrefs({ ...DEFAULTS });
        apply({ ...DEFAULTS });
        renderPanel(panel);
      });
    }
  }

  function init() {
    if (!hasDom) return;
    const panel = buildPanel();
    renderPanel(panel);

    // تبديل اللغة يحدّث نصوص اللوحة فورًا
    document.addEventListener('hadiya:lang', (e) => {
      LANG = (e.detail && e.detail.lang) === 'en' ? 'en' : 'ar';
      if (!panel.hidden) renderPanel(panel);
    });

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-theme-toggle]');
      if (btn) {
        panel.hidden = !panel.hidden;
        if (!panel.hidden) renderPanel(panel);
        return;
      }
      if (!panel.hidden && !e.target.closest('#theme-panel') && !e.target.closest('[data-theme-toggle]')) {
        panel.hidden = true;
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') panel.hidden = true;
    });
  }

  if (hasDom) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  // للتشغيل في Node (اختبارات الدوال النقية)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { hexToRgb, rgbToHex, mix, luminance, readableInk, ACCENTS, THEMES, DEFAULTS, resolveTheme };
  }
})();
