/* اختبار سريع لمسار الإنتاج (نفس متغيّرات Render) — يتأكد أن القاعدة تُنشأ في DATA_DIR
   وأن فحص الصحة يعمل. الاستعمال: node scripts/prod-smoke.js */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data', 'prodtest');
const PORT = 3199;
const BASE = `http://127.0.0.1:${PORT}`;

fs.rmSync(DATA_DIR, { recursive: true, force: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

const env = {
  ...process.env,
  NODE_ENV: 'production',
  HOST: '0.0.0.0',
  PORT: String(PORT),
  DATA_DIR,
  DB_FILE: path.join(DATA_DIR, 'hadba.sqlite'),
  SESSION_SECRET: 'prodtest-secret-abcdefghijklmnopqrstuvwxyz-123456',
  PASSWORD_PEPPER: 'prodtest-pepper-1234567890',
  ADMIN_USERNAME: 'admin',
  ADMIN_PASSWORD: 'ProdTest-Pass-2026!',
  ADMIN_MUST_CHANGE: '1',
  GOOGLE_CLIENT_ID: '',
};

const child = spawn(process.execPath, [path.join(ROOT, 'src', 'server.js')], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
child.stdout.on('data', d => { log += d; });
child.stderr.on('data', d => { log += d; });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const results = [];
  const check = (name, ok, detail = '') => {
    results.push({ name, ok, detail });
    console.log(`  ${ok ? '\u001b[32m✔\u001b[0m' : '\u001b[31m✖\u001b[0m'} ${name}${detail ? ` \u001b[2m${detail}\u001b[0m` : ''}`);
  };

  let up = false;
  for (let i = 0; i < 40; i += 1) {
    await sleep(300);
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) { up = true; break; }
    } catch { /* لم يبدأ */ }
  }
  check('الخادم يعمل في وضع الإنتاج', up);
  check('قاعدة البيانات أُنشئت في DATA_DIR', fs.existsSync(path.join(DATA_DIR, 'hadba.sqlite')),
    path.join(DATA_DIR, 'hadba.sqlite'));

  if (up) {
    const health = await (await fetch(`${BASE}/api/health`)).json();
    check('واجهة الصحة تُرجع حالة سليمة', health && health.ok !== false, JSON.stringify(health).slice(0, 90));

    const home = await fetch(`${BASE}/`);
    const html = await home.text();
    check('الصفحة الرئيسية تُخدَم', home.status === 200 && html.includes('HADIYA'));

    const chains = await (await fetch(`${BASE}/api/chains`)).json();
    check('واجهة الشبكات تعمل', Boolean(chains && chains.chains && chains.chains.length >= 5));

    const login = await fetch(`${BASE}/login`);
    check('صفحة الدخول تُخدَم', login.status === 200);

    // ترويسات الأمان في الإنتاج (HSTS مفعّل فقط في الإنتاج ✓)
    const hsts = home.headers.get('strict-transport-security');
    check('HSTS مفعّل في الإنتاج', Boolean(hsts), hsts || 'غائب');
    const perm = home.headers.get('permissions-policy');
    check('Permissions-Policy موجودة', Boolean(perm));

    // الكتابة على القرص الدائم
    const created = await fetch(`${BASE}/api/campaigns`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'حملة اختبار الإنتاج', story: 'وصف', goal_usd: 100,
        charity_wallet: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        chain_id: 1, token_symbol: 'USDC',
      }),
    });
    check('الكتابة في القاعدة تنجح', created.status === 201 || created.status === 200, `status=${created.status}`);
  }

  child.kill('SIGTERM');
  await sleep(600);
  console.log('\n' + (results.every(r => r.ok) ? '\u001b[32m✔ كل فحوص مسار الإنتاج ناجحة\u001b[0m' : '\u001b[31m✖there are failures\u001b[0m'));
  if (!results.every(r => r.ok)) console.log(log.slice(-800));
  process.exit(results.every(r => r.ok) ? 0 : 1);
})();
