/* ============================================================
   HADIYA — تجهيز النشر على Render
   ------------------------------------------------------------
   • يولّد أسرارًا قوية (SESSION_SECRET / PASSWORD_PEPPER) إن لم تكن موجودة
   • يطبع خطوات النشر بالترتيب
   • مع RENDER_API_KEY ينشئ الخدمة فعليًا عبر Render API
   الاستعمال:
     node scripts/render-prep.js                # تحضير + طباعة الخطوات
     node scripts/render-prep.js --deploy       # نشر فعلي (يتطلب RENDER_API_KEY)
     node scripts/render-prep.js --check       # فحص إعدادات ما قبل النشر
   ============================================================ */

const fs = require('fs');
const path = require('path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const DEPLOY = args.includes('--deploy');
const CHECK = args.includes('--check');

const GREEN = '\u001b[32m';
const YELLOW = '\u001b[33m';
const RED = '\u001b[31m';
const DIM = '\u001b[2m';
const RESET = '\u001b[0m';

const ENV_PATH = path.join(ROOT, '.env');
const RENDER_API = 'https://api.render.com/v1';

function readEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

function writeEnv(file, values) {
  let text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  for (const [key, value] of Object.entries(values)) {
    const re = new RegExp(`^\\s*${key}\\s*=.*$`, 'm');
    if (re.test(text)) text = text.replace(re, `${key}=${value}`);
    else text += `\n${key}=${value}\n`;
  }
  fs.writeFileSync(file, text, 'utf8');
}

/* ---------- فحص ما قبل النشر ---------- */

function preflight() {
  const env = readEnv(ENV_PATH);
  const problems = [];
  const warnings = [];

  const required = {
    SESSION_SECRET: 32,
    PASSWORD_PEPPER: 16,
    ADMIN_USERNAME: 3,
    ADMIN_PASSWORD: 12,
  };
  for (const [key, min] of Object.entries(required)) {
    const value = env[key] || '';
    if (!value) problems.push(`${key} غير موجود`);
    else if (value.length < min) problems.push(`${key} قصير (${value.length} < ${min})`);
  }
  if (!env.COLLECTOR_ADDRESS) warnings.push('COLLECTOR_ADDRESS غير مضبوط — محفظة المنصّة لن تظهر');
  if (!env.GOOGLE_CLIENT_ID) warnings.push('GOOGLE_CLIENT_ID غير مضبوط — «تسجيل بجوجل» معطّل (503)');
  if (!fs.existsSync(path.join(ROOT, 'Dockerfile'))) problems.push('Dockerfile مفقود');
  if (!fs.existsSync(path.join(ROOT, 'render.yaml'))) problems.push('render.yaml مفقود');
  if (!fs.existsSync(path.join(ROOT, 'package-lock.json'))) problems.push('package-lock.json مفقود (Dockerfile يحتاج npm ci)');

  // تحقّق من أن الخادم يقرأ PORT وHOST
  const serverSrc = fs.readFileSync(path.join(ROOT, 'src', 'server.js'), 'utf8');
  if (!/process\.env\.PORT/.test(serverSrc)) problems.push('الخادم لا يقرأ process.env.PORT — لن يعمل على Render');
  if (!/0\.0\.0\.0/.test(serverSrc)) warnings.push('HOST لا يشمل 0.0.0.0');

  // تحقّق من مسار قاعدة البيانات
  if (!/DB_FILE/.test(serverSrc) && !/DB_FILE/.test(fs.readFileSync(path.join(ROOT, 'src', 'db.js'), 'utf8'))) {
    problems.push('المسار لا يدعم متغيّر DB_FILE');
  }

  // تنبيه: النظام ملفات Render مؤقّت بدون قرص
  if (!fs.readFileSync(path.join(ROOT, 'render.yaml'), 'utf8').includes('disk:')) {
    warnings.push('render.yaml بلا قرص دائم — ستُفقد البيانات عند كل نشر');
  }

  return { env, problems, warnings };
}

/* ---------- توليد الأسرار ---------- */

function generateSecrets() {
  const env = readEnv(ENV_PATH);
  const generated = {};
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
    generated.SESSION_SECRET = crypto.randomBytes(32).toString('base64url');
  }
  if (!env.PASSWORD_PEPPER || env.PASSWORD_PEPPER.length < 16) {
    generated.PASSWORD_PEPPER = crypto.randomBytes(24).toString('base64url');
  }
  if (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 12) {
    generated.ADMIN_PASSWORD = `Hadiya-${crypto.randomBytes(9).toString('base64url')}!`;
  }
  if (Object.keys(generated).length) writeEnv(ENV_PATH, generated);
  return { env: { ...env, ...generated }, generated };
}

/* ---------- النشر عبر Render API ---------- */

async function renderApi(pathname, { method = 'GET', body } = {}) {
  const apiKey = process.env.RENDER_API_KEY;
  const res = await fetch(`${RENDER_API}${pathname}`, {
    method,
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* ليس JSON */ }
  return { status: res.status, json, text };
}

async function deploy(env) {
  const apiKey = process.env.RENDER_API_KEY;
  if (!apiKey) {
    console.log(`${RED}✖ RENDER_API_KEY غير موجود${RESET}`);
    console.log('  احصل على مفتاح من: https://dashboard.render.com/account/api-keys');
    console.log('  ثم: $env:RENDER_API_KEY="rnd_..." ; node scripts/render-prep.js --deploy');
    return 1;
  }

  console.log('… جلب قائمة المستودعات');
  const repos = await renderApi('/repos?limit=100');
  const repoList = (repos.json && repos.json.length) ? repos.json : [];
  if (!repoList.length) {
    console.log(`${YELLOW}لا توجد مستودعات مرتبطة بالمفتاح. اربط المستودع في Render أولًا (New → Blueprint).${RESET}`);
    return 1;
  }
  console.log(`  المستودعات المتاحة: ${repoList.map(r => r.repository?.name || r.name).join(', ')}`);

  console.log('… إنشاء الخدمة (blueprint)');
  const created = await renderApi('/services', {
    method: 'POST',
    body: { blueprintId: process.env.RENDER_BLUEPRINT_ID || '', name: 'hadiya' },
  });
  if (created.status >= 400) {
    console.log(`${RED}✖ فشل الإنشاء (${created.status})${RESET}`);
    console.log(created.text.slice(0, 400));
    return 1;
  }
  const service = created.json;
  console.log(`${GREEN}✔ أُنشئت الخدمة${RESET}: ${service?.service?.name || service?.name || ''}`);
  console.log(`  الرابط: https://dashboard.render.com/services`);
  return 0;
}

/* ---------- الخطوات ---------- */

function printSteps(env) {
  const lines = [
    '',
    `${DIM}══════════════════════════════════════════════════════════${RESET}`,
    '  نشر HADIYA على Render — الخطوات',
    `${DIM}══════════════════════════════════════════════════════════${RESET}`,
    '',
    '١) ارفع المشروع على GitHub (المستودع هو مصدر النشر):',
    '     git init && git add -A && git commit -m "HADIYA"',
    '     git remote add origin git@github.com:<اسمك>/hadiya.git',
    '     git push -u origin main',
    '',
    '٢) في Render:  New  →  Blueprint  →  اختر المستودع  →  Apply',
    '   Render يقرأ render.yaml تلقائيًا (الصورة + القرص + المتغيّرات).',
    '',
    '٣) أدخل القيم التي لم يولّدها Render ( sync: false ):',
    `     ADMIN_USERNAME      = ${env.ADMIN_USERNAME || 'admin'}`,
    `     ADMIN_PASSWORD      = ${env.ADMIN_PASSWORD || '(ولّده: node scripts/render-prep.js)'}`,
    `     COLLECTOR_ADDRESS   = ${env.COLLECTOR_ADDRESS || '(محفظة المنصّة — من لوحة الإدارة)'}`,
    `     OWNER_ADDRESS       = ${env.OWNER_ADDRESS || '(عنوان المشرف)'}`,
    `     GOOGLE_CLIENT_ID    = ${env.GOOGLE_CLIENT_ID || '(اختياري — لتفعيل دخول جوجل)'}`,
    '',
    '٤) بعد أول نشر:',
    '     • افتح /admin وسجّل الدخول بحساب الأدمن',
    '     • تحقّق من «محفظة الكولكتر» في الإعدادات',
    '     • أضف السرّ لكل شبكة: من لوحة الإدارة أو عبر السجل',
    '',
    '٥) ملاحظات مهمة:',
    '     • القرص الدائم (1GB) يُخزّن قاعدة SQLite — لا تحذفه',
    '     • تغيير PASSWORD_PEPPER يُبطل كل كلمات المرور ⇒ خطِّر المستخدمين',
    '     • العقد يُنشر محليًا (npm run deploy:contracts) ثم يُسجَّل عنوانه في اللوحة',
    '     • Render يوقف الخدمة بعد خمول ⇒ أول طلب يبطئ (الحركة الأولى)',
    '',
  ];
  console.log(lines.join('\n'));
}

(async () => {
  console.log('\n=== HADIYA — تجهيز النشر على Render ===\n');

  const { env, problems, warnings } = preflight();

  if (CHECK) {
    console.log('فحص ما قبل النشر:');
    for (const p of problems) console.log(`  ${RED}✖${RESET} ${p}`);
    for (const w of warnings) console.log(`  ${YELLOW}!${RESET} ${w}`);
    if (!problems.length) console.log(`  ${GREEN}✔${RESET} لا توجد مشاكل مانعة`);
    process.exit(problems.length ? 1 : 0);
  }

  const { env: fullEnv, generated } = generateSecrets();
  if (Object.keys(generated).length) {
    console.log(`${GREEN}✔${RESET} وُلّدت أسرار جديدة في .env: ${Object.keys(generated).join(', ')}`);
    for (const [k, v] of Object.entries(generated)) {
      console.log(`   ${k} = ${v}`);
    }
  } else {
    console.log(`${GREEN}✔${RESET} الأسرار موجودة بالفعل في .env`);
  }

  if (problems.length) {
    console.log(`\n${RED}مشاكل يجب إصلاحها قبل النشر:${RESET}`);
    for (const p of problems) console.log(`  ✖ ${p}`);
  }
  for (const w of warnings) console.log(`  ${YELLOW}!${RESET} ${w}`);

  printSteps(fullEnv);

  if (DEPLOY) {
    const code = await deploy(fullEnv);
    process.exit(code);
  }
  process.exit(problems.length ? 1 : 0);
})();
