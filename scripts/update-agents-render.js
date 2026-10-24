/* يضيف قسم تجهيز النشر إلى AGENTS.md (كتابة UTF-8 آمنة) */
const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'AGENTS.md');
let text = fs.readFileSync(p, 'utf8');

if (text.includes('تجهيز النشر على Render')) {
  console.log('already present');
  process.exit(0);
}

const anchor = '### نسخ احتياطي';
if (!text.includes(anchor)) {
  console.error('anchor not found');
  process.exit(1);
}

const block = [
  '- ✅ **تجهيز النشر على Render**:',
  '  - `Dockerfile` (node:24-slim + tini + healthcheck) + `.dockerignore`',
  '  - `render.yaml` (Blueprint: docker runtime، plan starter، قرص دائم `/var/data` 1GB، env vars)',
  '  - `scripts/render-prep.js` (توليد أسرار + فحص ما قبل النشر + خطوات)',
  '  - `scripts/github-upload.js` (رفع إلى GitHub **بدون git** عبر GitHub API)',
  '  - `scripts/prod-smoke.js` (محاكاة بيئة الإنتاج: ٩/٩ فحوص ناجحة)',
  '  - `docs/DEPLOY.md` § ٨) المسار D — Render',
  '  - ⚠️ **قاعدة البيانات**: SQLite على القرص الدائم ⇒ نسخة واحدة فقط (لا Scaling على Render).',
  '',
].join('\n');

text = text.replace(anchor, block + anchor);
fs.writeFileSync(p, text, 'utf8');
console.log('AGENTS.md updated');
