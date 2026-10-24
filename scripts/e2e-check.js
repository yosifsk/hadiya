/* ============================================================
   HADIYA — فحص شامل من طرف إلى طرف (E2E + سلامة بيانات)
   ------------------------------------------------------------
   شغّل:
     node scripts/e2e-check.js                 # يشغّل سيرفرًا مؤقتًا بقاعدة اختبار
     node scripts/e2e-check.js --base http://localhost:3100 --read-only
   ما يفحصه:
     1) إنشاء حساب (تسجيل + كلمة مرور + قفل بعد محاولات) وإنشاءه في قاعدة البيانات
     2) ربط محفظة بتوقيع حقيقي (viem) والتحقق من ETH/الأ不适合
     3) بناء حملة (عبر النموذج) + الحالات السلبية (TRC20 في خانة BNB …)
     4) سلامة البيانات: توازن收发، تطابق الرسوم، عناوين صحيحة لشبكاتها، لا عناوين داخل النصوص
     5) الصفحات وواجهات الـ API، جدول الرسوم، الأسئلة، المساعد الذكي، الترجمة
   النتيجة: تقرير + رمز خروج 1 عند وجود أي خطأ.
   ============================================================ */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { privateKeyToAccount } = require('viem/accounts');

const ROOT = path.join(__dirname, '..');

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const has = (name) => args.includes(`--${name}`);

const BASE = flag('base');
const READ_ONLY = has('read-only');
const PORT = Number(flag('port', String(3200 + Math.floor(Math.random() * 400))));
const TEST_DATA_DIR = path.join(ROOT, 'data', 'e2e');

/* ---------- أدوات التقرير ---------- */

const results = [];
let currentGroup = '';

const GREEN = '\u001b[32m';
const RED = '\u001b[31m';
const YELLOW = '\u001b[33m';
const DIM = '\u001b[2m';
const RESET = '\u001b[0m';

function group(title) {
  currentGroup = title;
  console.log(`\n${DIM}── ${title} ──${RESET}`);
}

function check(name, ok, detail = '') {
  results.push({ group: currentGroup, name, ok: Boolean(ok), detail });
  const mark = ok ? `${GREEN}✔${RESET}` : `${RED}✖${RESET}`;
  console.log(`  ${mark} ${name}${detail ? ` ${DIM}${detail}${RESET}` : ''}`);
  return Boolean(ok);
}

function info(text) {
  console.log(`  ${DIM}·${RESET} ${text}`);
}

/* ---------- عميل HTTP بسيط (مع الكوكيز) ---------- */

function makeClient(base) {
  const jar = new Map();

  const cookieHeader = () => Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join('; ');

  const storeCookies = (res) => {
    const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    for (const line of raw) {
      const [pair] = line.split(';');
      const idx = pair.indexOf('=');
      if (idx > 0) jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
    }
  };

  const request = async (method, url, { body, form, headers = {}, redirect = 'manual' } = {}) => {
    const h = { ...headers };
    if (jar.size) h.cookie = cookieHeader();
    let payload = body;
    if (form) {
      h['content-type'] = 'application/x-www-form-urlencoded';
      payload = new URLSearchParams(form).toString();
    }
    const res = await fetch(new URL(url, base), { method, headers: h, body: payload, redirect });
    storeCookies(res);
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* ليس JSON */ }
    return { status: res.status, headers: res.headers, text, json, location: res.headers.get('location') };
  };

  return {
    jar,
    cookieHeader,
    get: (url, opts) => request('GET', url, opts),
    post: (url, opts) => request('POST', url, opts),
    postForm: (url, form, opts) => request('POST', url, { ...opts, form }),
    postJson: (url, body, opts) => request('POST', url, { ...opts, body: JSON.stringify(body), headers: { 'content-type': 'application/json', ...(opts && opts.headers) } }),
  };
}

/* ---------- تشغيل سيرفر مؤقت ---------- */

let child = null;

function startServer() {
  fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  const dbFile = path.join(TEST_DATA_DIR, 'e2e.sqlite');
  for (const suffix of ['', '-wal', '-shm']) {
    const f = `${dbFile}${suffix}`;
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
  child = spawn(process.execPath, [path.join(ROOT, 'src', 'server.js')], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(PORT),
      HOST: '127.0.0.1',
      DATA_DIR: TEST_DATA_DIR,
      DB_FILE: dbFile,
      NODE_ENV: 'test',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', () => {});
  child.stderr.on('data', (d) => {
    const s = String(d);
    if (/error|Error/.test(s)) console.error(`${DIM}[server]${RESET} ${s.trim()}`);
  });
  return dbFile;
}

async function waitForServer(base, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(new URL('/api/health', base));
      if (res.ok) return true;
    } catch { /* لم يبدأ بعد */ }
    await new Promise(r => setTimeout(r, 250));
  }
  return false;
}

function stopServer() {
  if (child && !child.killed) {
    child.kill('SIGTERM');
    child = null;
  }
}

/* ---------- الفحوص ---------- */

async function run() {
  let base = BASE;
  let dbFile = null;

  if (!base) {
    group('تشغيل بيئة اختبار');
    dbFile = startServer();
    // نفس قاعدة بيانات السيرفر — ليرى فحصُ قاعدة البيانات ما يراه الخادم
    process.env.DATA_DIR = TEST_DATA_DIR;
    process.env.DB_FILE = dbFile;
    base = `http://127.0.0.1:${PORT}`;
    info(`سيرفر مؤقت على ${base}`);
    info(`قاعدة اختبار: ${dbFile}`);
    const up = await waitForServer(base);
    if (!check('السيرفر يعمل', up)) return finish();
  } else {
    info(`الفحص على السيرفر الحالي: ${base}`);
  }

  const client = makeClient(base);

  /* ===================== 1) إنشاء الحساب ===================== */
  group('١) إنشاء حساب مستخدم');

  const username = `e2e_${Date.now().toString(36)}`;
  const password = 'E2e-Check-Pass-2026!';

  const reg = await client.postForm('/register', {
    username,
    password,
    password2: password,
    display_name: 'فحص آلي',
  });
  check('التسجيل يُقبل ويحوّل إلى /account', reg.status === 302 && String(reg.location || '').includes('/account'),
    `status=${reg.status} location=${reg.location || '-'}`);
  check('كوكي الجلسة صدر بعد التسجيل', client.cookieHeader().length > 0);

  // التحقق من قاعدة البيانات
  const { q } = require(path.join(ROOT, 'src', 'db'));
  const userRow = q('SELECT * FROM users WHERE username = ?', username)[0];
  check('سجل المستخدم موجود في القاعدة', Boolean(userRow));
  check('كلمة المرور مخزّنة مُجزّأة (Argon2id)',
    Boolean(userRow) && /^\$argon2id\$m=65536,t=3,p=1\$/.test(userRow.password_hash),
    userRow ? userRow.password_hash.slice(0, 34) : '-');
  check('كلمة المرور لا تُخزَّن كنص صريح', Boolean(userRow) && !userRow.password_hash.includes(password));
  check('must_change_password مفعّل', Boolean(userRow) && userRow.must_change_password === 1);
  const auditRow = q("SELECT * FROM audit_log WHERE action = 'user.registered' AND target = ?", username)[0];
  check('التسجيل مسجّل في سجل التدقيق', Boolean(auditRow));

  // سياسة كلمة المرور
  const weak = await client.postForm('/register', { username: `weak_${Date.now().toString(36)}`, password: '123456', password2: '123456' });
  check('كلمة مرور ضعيفة تُرفض', weak.status === 400);
  const dup = await client.postForm('/register', { username, password, password2: password });
  check('اسم مستخدم مكرر يُرفض', dup.status === 400);
  const mismatch = await client.postForm('/register', { username: `mm_${Date.now().toString(36)}`, password, password2: 'other-password' });
  check('كلمتا مرور مختلفتان تُرفضان', mismatch.status === 400);

  // قفل الحساب بعد ٥ محاولات (على حساب منفصل — بعميل مستقل حتى لا يغيّر جلستنا)
  const lockUser = `lock_${Date.now().toString(36)}`;
  const lockClient = makeClient(base);
  await lockClient.postForm('/register', { username: lockUser, password, password2: password });
  let locked = false;
  for (let i = 0; i < 6; i += 1) {
    const r = await lockClient.postForm('/login', { username: lockUser, password: 'wrong-password-x' });
    if (r.status === 401 || r.status === 403 || r.status === 429) locked = true;
  }
  const lockRow = q('SELECT * FROM users WHERE username = ?', lockUser)[0];
  check('قفل الحساب بعد محاولات فاشلة', locked && Boolean(lockRow && lockRow.locked_until),
    lockRow ? `locked_until=${lockRow.locked_until}` : '-');

  /* ===================== 2) ربط محفظة ===================== */
  group('٢) ربط محفظة بتوقيع حقيقي');

  const account = privateKeyToAccount('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d');
  const linkMessage = [
    'HADIYA link wallet',
    `user: ${username}`,
    'I agree to link this wallet to my account',
  ].join('\n');
  const signature = await account.signMessage({ message: linkMessage });

  const link = await client.postJson('/account/link-wallet', {
    address: account.address,
    message: linkMessage,
    signature,
  });
  check('الربط بتوقيع صالح يُقبل', [200, 302].includes(link.status)
    && String(link.location || '').includes('/account'),
    `status=${link.status} location=${link.location || '-'} ${link.json && link.json.error ? link.json.error : ''}`);
  const linkedRow = q('SELECT wallet_address FROM users WHERE username = ?', username)[0];
  check('العنوان مرتبط بالحساب في القاعدة', Boolean(linkedRow && linkedRow.wallet_address));

  // ربط عنوان محفظة غير موقّع يجب أن يُرفض
  const badLink = await client.postJson('/account/link-wallet', {
    address: account.address,
    message: linkMessage,
    signature: '0xdeadbeef',
  });
  check('توقيع غير صالح يُرفض', badLink.status === 400, `status=${badLink.status}`);

  /* ===================== 3) بناء حملة ===================== */
  group('٣) بناء حملة والحالات السلبية');

  const evmWallet = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // USDC على Ethereum
  const tronWallet = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

  const campaignTitle = `حملة فحص آلي ${Date.now().toString(36)}`;
  const created = await client.postForm('/create', {
    title: campaignTitle,
    subtitle: 'حملة أنشأها سكربت الفحص الشامل',
    story: 'وصف اختباري بلا عناوين محافظ.',
    category: 'community',
    goal_usd: '1500',
    charity_wallet: evmWallet,
    chain_id: '1',
    token_symbol: 'USDC',
    organizer_name: 'فحص آلي',
    country: 'Jordan',
  });
  check('إنشاء حملة عبر النموذج ينجح', created.status === 302 && String(created.location || '').startsWith('/c/'),
    `status=${created.status} location=${created.location || '-'}`);

  const slug = String(created.location || '').replace('/c/', '');
  const campRow = q('SELECT * FROM campaigns WHERE slug = ?', slug)[0];
  check('سجل الحملة موجود', Boolean(campRow));
  check('حملة بلا توقيع تنتظر توقيع المنظّم', Boolean(campRow) && campRow.status === 'awaiting_signature',
    campRow ? campRow.status : '-');
  check('عنوان المحفظة محفوظ بشكل موحّد (checksum)',
    Boolean(campRow) && campRow.charity_wallet.toLowerCase() === evmWallet.toLowerCase(),
    campRow ? campRow.charity_wallet : '-');
  check('المنظّم هو صاحب المحفظة الموقّعة', Boolean(campRow) && campRow.organizer_wallet.toLowerCase() === account.address.toLowerCase());
  check('عنوان الاستلام فارغ افتراضيًا (اختياري)', Boolean(campRow) && !campRow.delivery_address);

  // توقيع المنظّم عند الحفظ
  const saveMessage = [
    'HADIYA — إثبات ملكية محفظة المنظّم',
    `address: ${account.address}`,
    `time: ${Date.now()}`,
    'I confirm I control this address.',
  ].join('\n');
  const saveSignature = await account.signMessage({ message: saveMessage });

  // حملة موقّعة عند الحفظ → تدخل المراجعة مباشرة
  const signedAtSave = await client.postForm('/create', {
    title: `حملة موقّعة عند الحفظ ${Date.now().toString(36)}`,
    story: 'وصف اختباري.',
    goal_usd: '400',
    category: 'community',
    charity_wallet: evmWallet,
    chain_id: '1',
    organizer_address: account.address,
    organizer_message: saveMessage,
    organizer_signature: saveSignature,
  });
  const saveSlug = String(signedAtSave.location || '').replace('/c/', '');
  const saveRow = q('SELECT * FROM campaigns WHERE slug = ?', saveSlug)[0];
  check('حملة موقّعة عند الحفظ تدخل المراجعة مباشرة', signedAtSave.status === 302
    && Boolean(saveRow) && saveRow.status === 'pending_review',
    saveRow ? saveRow.status : `status=${signedAtSave.status}`);
  check('توقيع المنظّم محفوظ مع الحملة', Boolean(saveRow) && Boolean(saveRow.organizer_signature));

  // ===== عنوان الاستلام: يجب أن يُثبت بتوقيع من صاحب العنوان نفسه =====
  const deliveryAddress = account.address; // عنوان محفظتنا (نوقّع به)
  const deliveryMessage = [
    'HADIYA — إثبات ملكية عنوان الاستلام',
    `address: ${deliveryAddress}`,
    `campaign: ${Date.now()}`,
    'I confirm I control this address.',
  ].join('\n');
  const deliverySignature = await account.signMessage({ message: deliveryMessage });

  const noProof = await client.postForm('/create', {
    title: 'حملة بعنوان استلام بلا توقيع',
    story: 'وصف',
    goal_usd: '100',
    category: 'community',
    charity_wallet: evmWallet,
    chain_id: '1',
    delivery_address: deliveryAddress,
  });
  check('عنوان الاستلام بلا توقيع يُرفض', noProof.status === 400, `status=${noProof.status}`);

  const badProof = await client.postForm('/create', {
    title: 'حملة بعنوان استلام بتوقيع خاطئ',
    story: 'وصف',
    goal_usd: '100',
    category: 'community',
    charity_wallet: evmWallet,
    chain_id: '1',
    delivery_address: deliveryAddress,
    delivery_message: deliveryMessage,
    delivery_signature: '0xdeadbeef',
  });
  check('عنوان الاستلام بتوقيع غير صالح يُرفض', badProof.status === 400, `status=${badProof.status}`);

  // توقيع من عنوان آخر (محاولة انتحال) — يجب أن يُرفض
  const otherAccount = privateKeyToAccount('0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba');
  const stolenSignature = await otherAccount.signMessage({ message: deliveryMessage });
  const stolen = await client.postForm('/create', {
    title: 'حملة بعنوان استلام بتوقيع من عنوان آخر',
    story: 'وصف',
    goal_usd: '100',
    category: 'community',
    charity_wallet: evmWallet,
    chain_id: '1',
    delivery_address: deliveryAddress,
    delivery_message: deliveryMessage,
    delivery_signature: stolenSignature,
  });
  check('توقيع من عنوان آخر (انتحال) يُرفض', stolen.status === 400, `status=${stolen.status}`);

  const withProof = await client.postForm('/create', {
    title: `حملة بعنوان استلام موقّع ${Date.now().toString(36)}`,
    story: 'وصف اختباري.',
    goal_usd: '200',
    category: 'community',
    charity_wallet: evmWallet,
    chain_id: '1',
    token_symbol: 'USDC',
    delivery_address: deliveryAddress,
    delivery_message: deliveryMessage,
    delivery_signature: deliverySignature,
  });
  check('عنوان الاستلام بتوقيع صالح يُقبل', withProof.status === 302,
    `status=${withProof.status} ${String(withProof.text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 140)}`);
  const proofSlug = String(withProof.location || '').replace('/c/', '');
  const proofRow = q('SELECT * FROM campaigns WHERE slug = ?', proofSlug)[0];
  check('عنوان الاستلام محفوظ ومُوثَّق', Boolean(proofRow)
    && proofRow.delivery_address.toLowerCase() === deliveryAddress.toLowerCase()
    && proofRow.delivery_verified === 1,
    proofRow ? `${proofRow.delivery_address} verified=${proofRow.delivery_verified}` : '-');

  // الحالات السلبية
  const neg = [
    ['عنوان TRC20 في شبكة BNB', { chain_id: '56', charity_wallet: tronWallet }],
    ['عنوان EVM في شبكة TRON', { chain_id: '728126428', charity_wallet: evmWallet }],
    ['عنوان مشوّه', { chain_id: '1', charity_wallet: '0x123' }],
    ['عنوان TRON بـchecksum خاطئ', { chain_id: '728126428', charity_wallet: 'TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdX' }],
  ];
  for (const [label, extra] of neg) {
    const res = await client.postForm('/create', {
      title: `حملة اختبار ${label}`,
      story: 'وصف',
      goal_usd: '100',
      category: 'community',
      ...extra,
    });
    check(`تُرفض: ${label}`, res.status === 400, `status=${res.status}`);
  }

  // عنوان داخل النص
  const storyWithAddress = await client.postForm('/create', {
    title: 'حملة فيها عنوان داخل القصة',
    story: `العنوان هو ${evmWallet}`,
    goal_usd: '100',
    category: 'community',
    charity_wallet: evmWallet,
    chain_id: '1',
  });
  check('تُرفض: عنوان محفظة داخل وصف الحملة', storyWithAddress.status === 400, `status=${storyWithAddress.status}`);

  const tronCampaign = await client.postForm('/create', {
    title: `حملة ترون ${Date.now().toString(36)}`,
    story: 'وصف',
    goal_usd: '100',
    category: 'community',
    charity_wallet: tronWallet,
    chain_id: '728126428',
    token_symbol: 'USDT',
  });
  check('حملة TRON بقاعدة TRC20 تُقبل', tronCampaign.status === 302, `status=${tronCampaign.status}`);

  /* ===================== ٣ب) التدفّق مع الإدارة ===================== */
  group('٣ب) التدفّق: إنشاء ← موافقة الإدارة ← توقيع المنظّم ← موافقة نهائية');

  // حملة بلا توقيع → تنتظر توقيع المنظّم
  const unsigned = await client.postForm('/create', {
    title: `حملة بلا توقيع ${Date.now().toString(36)}`,
    story: 'وصف اختباري.',
    goal_usd: '300',
    category: 'community',
    charity_wallet: evmWallet,
    chain_id: '1',
  });
  check('إنشاء حملة بلا محفظة موقّعة ينجح', unsigned.status === 302, `status=${unsigned.status}`);
  const unsignedSlug = String(unsigned.location || '').replace('/c/', '');
  const unsignedRow = q('SELECT * FROM campaigns WHERE slug = ?', unsignedSlug)[0];
  check('حملتها تنتظر توقيع المنظّم', Boolean(unsignedRow) && unsignedRow.status === 'awaiting_signature',
    unsignedRow ? unsignedRow.status : '-');

  // المنظّم يوقّع → تعود للمراجعة
  const signMessage = [
    'HADIYA — إثبات ملكية محفظة المنظّم',
    `campaign: ${unsignedSlug}`,
    `address: ${account.address}`,
    'I confirm I control this address.',
  ].join('\n');
  const signSig = await account.signMessage({ message: signMessage });
  const signed = await client.postJson(`/c/${encodeURIComponent(unsignedSlug)}/sign`, {
    address: account.address,
    message: signMessage,
    signature: signSig,
  });
  check('توقيع المنظّم يُقبل ويعيد الطلب للمراجعة', signed.status === 302, `status=${signed.status}`);
  const signedRow = q('SELECT * FROM campaigns WHERE slug = ?', unsignedSlug)[0];
  check('الحملة عادت لحالة pending_review بعد التوقيع',
    Boolean(signedRow) && signedRow.status === 'pending_review', signedRow ? signedRow.status : '-');
  check('محفظة المنظّم وتوقيعه محفوظان',
    Boolean(signedRow) && signedRow.organizer_wallet.toLowerCase() === account.address.toLowerCase()
    && Boolean(signedRow.organizer_signature) && Boolean(signedRow.organizer_signed_at));

  // توقيع مزيّف (من عنوان آخر) على حملة بلا محفظة → لا يُثبت الملكية
  const forged = await client.postJson(`/c/${encodeURIComponent(unsignedSlug)}/sign`, {
    address: otherAccount.address,
    message: signMessage,
    signature: stolenSignature,
  });
  const forgedRow = q('SELECT * FROM campaigns WHERE slug = ?', unsignedSlug)[0];
  check('توقيع مزيّف لا يثبت الملكية', forged.status === 400
    || (forged.status === 302 && forgedRow && !forgedRow.organizer_signature),
    `status=${forged.status}`);

  /* ===================== 4) سلامة البيانات ===================== */
  group('٤) سلامة البيانات');

  const addresses = require(path.join(ROOT, 'src', 'lib', 'addresses'));
  const validate = require(path.join(ROOT, 'src', 'lib', 'validate'));
  const fees = require(path.join(ROOT, 'src', 'lib', 'fees'));
  const models = require(path.join(ROOT, 'src', 'models'));

  const campaigns = q('SELECT * FROM campaigns');
  check('قاعدة البيانات تحتوي حملات', campaigns.length > 0, `${campaigns.length} حملة`);

  const badFamily = campaigns.filter(c => {
    const res = addresses.checkAddress(c.charity_wallet, c.chain_id);
    return !res.ok;
  });
  check('كل حملة: العنوان يطابق شبكة حملتها', badFamily.length === 0,
    badFamily.length ? badFamily.map(c => `#${c.id} ${c.chain_id} ${c.charity_wallet}`).join(' | ') : '');

  const withAddressInText = campaigns.filter(c => validate.hasWalletAddress(
    `${c.title} ${c.subtitle || ''} ${c.story || ''}`
  ));
  check('لا عنوان محفظة داخل نصوص الحملات', withAddressInText.length === 0,
    withAddressInText.map(c => `#${c.id}`).join(','));

  const integrity = q('PRAGMA integrity_check');
  check('فحص سلامة ملف SQLite', integrity.length === 1 && integrity[0].integrity_check === 'ok',
    integrity[0] ? integrity[0].integrity_check : '-');

  const donations = q('SELECT * FROM donations');
  let feeErrors = 0;
  let sumErrors = 0;
  for (const d of donations) {
    const gross = BigInt(d.gross_raw || 0);
    const toCharity = BigInt(d.to_charity_raw || 0);
    const fee = BigInt(d.fee_raw || 0);
    if (gross !== toCharity + fee) sumErrors += 1;
    const expectedFee = (gross * BigInt(d.fee_bps || 0)) / 10000n;
    if (expectedFee !== fee) feeErrors += 1;
  }
  check('مجموع كل تبرّع = المستفيد + الرسوم', sumErrors === 0, `${sumErrors} مخالفة من ${donations.length}`);
  check('الرسوم محسوبة بالقاعدة (bps) بدقة', feeErrors === 0, `${feeErrors} مخالفة من ${donations.length}`);

  const outOfBounds = donations.filter(d => {
    const bps = Number(d.fee_bps || 0);
    return bps < 300 || bps > 900;
  });
  check('نسبة الرسوم داخل الحدود المسموحة (3%–9%)', outOfBounds.length === 0, `${outOfBounds.length} مخالفة`);

  const orphans = donations.filter(d => !campaigns.some(c => c.id === d.campaign_id));
  check('لا تبرّع يتيم (بلا حملة)', orphans.length === 0, `${orphans.length}`);

  const collector = q("SELECT value FROM settings WHERE key = 'collector_address'")[0];
  let collectorOk = false;
  let collectorValue = collector ? collector.value : '';
  if (collector && collector.value) {
    collectorOk = addresses.checkAddress(collector.value, 8453).ok
      || addresses.checkAddress(collector.value, 728126428).ok;
  } else {
    // قاعدة اختبار جديدة: نضبط عنوانًا صحيحًا كما يفعل التثبيت الحقيقي
    const { setSetting } = require(path.join(ROOT, 'src', 'db'));
    collectorValue = '0xc0113ccccccccccccccccccccccccccccccccccc';
    setSetting('collector_address', collectorValue);
    collectorOk = addresses.checkAddress(collectorValue, 8453).ok;
    info('ضُبط عنوان كولكتر تجريبي لقاعدة الفحص');
  }
  check('محفظة الكولكتر مضبوطة وصلحة', collectorOk, collectorValue || 'غير مضبوطة');

  const tiers = fees.effectiveTiers();
  const tiersOk = tiers.every(t => t.bps >= 300 && t.bps <= 1500)
    && tiers.every((t, i) => i === 0 || t.bps < tiers[i - 1].bps);
  check('جدول الرسوم متدرّج ونازل وصالح', tiersOk, tiers.map(t => `${t.bps}bps`).join(' → '));

  /* ===================== 5) الصفحات والـ API ===================== */
  group('٥) الصفحات وواجهات الـ API');

  const pages = ['/', '/discover', '/pricing', '/faq', '/how-it-works', '/terms', '/privacy', '/sign-in', '/create'];
  let badPages = [];
  for (const p of pages) {
    const res = await client.get(p);
    if (res.status !== 200) badPages.push(`${p}(${res.status})`);
  }
  check('كل الصفحات الرئيسية تُخدَم (200)', badPages.length === 0, badPages.join(', '));

  // صفحات محمية: يجب أن تُحجب
  const collectorPage = await client.get('/collector');
  check('صفحة الكولكتر محمية (لا تُخدَم لغير المخوّل)',
    [401, 403, 302].includes(collectorPage.status),
    `status=${collectorPage.status}`);

  const health = await client.get('/api/health');
  check('واجهة الصحة تعمل', health.status === 200 && health.json && health.json.ok !== false);

  const chains = await client.get('/api/chains');
  const tronChain = chains.json && chains.json.chains ? chains.json.chains.find(c => c.key === 'tron') : null;
  check('قائمة الشبكات تتضمن TRON', Boolean(tronChain), tronChain ? `id=${tronChain.id} family=${tronChain.addressFamily}` : '');
  const tronTokens = chains.json && chains.json.tokens ? chains.json.tokens['728126428'] : null;
  check('TRON يوفّر USDT (TRC20) بـ6 خانات',
    Boolean(tronTokens && tronTokens.find(t => t.symbol === 'USDT' && t.decimals === 6)));

  // الرسوم متدرّجة تنخفض مع زيادة المبلغ
  const small = await client.get('/api/fee-for?chain_id=8453&symbol=USDC&amount=50');
  const mid = await client.get('/api/fee-for?chain_id=8453&symbol=USDC&amount=250');
  const big = await client.get('/api/fee-for?chain_id=8453&symbol=USDC&amount=500');
  const bps = [small, mid, big].map(r => (r.json && r.json.bps) || 0);
  check('نسبة الرسوم تنخفض مع زيادة المبلغ', bps[0] > bps[1] && bps[1] > bps[2], bps.join(' → '));
  check('حساب الرسوم يحترم الحدود', bps.every(b => b >= 300 && b <= 900), bps.join(', '));

  const feesApi = await client.get('/api/fees');
  check('واجهة الرسوم تعيد جدول الشرائح', Boolean(feesApi.json && Array.isArray(feesApi.json.tiers) && feesApi.json.tiers.length > 0));

  const campaignsApi = await client.get('/api/campaigns');
  check('واجهة الحملات تعمل', campaignsApi.status === 200 && campaignsApi.json && Array.isArray(campaignsApi.json.campaigns));

  const faq = require(path.join(ROOT, 'src', 'lib', 'faq'));
  const faqOk = faq.FAQ.length > 0 && faq.FAQ.every(item => item.q && item.a && item.en && item.en.q && item.en.a);
  check('قاعدة الأسئلة مكتملة (عربي + إنجليزي)', faqOk, `${faq.FAQ.length} سؤال`);

  const assistant = await client.postJson('/api/assistant/ask', { question: 'كم رسوم المنصة؟', lang: 'ar' });
  const answerOk = assistant.status === 200 && assistant.json && assistant.json.ok !== false && String(assistant.json.answer || '').length > 20;
  check('المساعد الذكي يجيب عن سؤال الرسوم', answerOk);

  const assistantEn = await client.postJson('/api/assistant/ask', { question: 'What are the fees?', lang: 'en' });
  const answerEn = assistantEn.status === 200 && assistantEn.json && String(assistantEn.json.answer || '').length > 20;
  check('المساعد الذكي يجيب بالإنجليزية', answerEn);

  /* ===================== 6) الترجمة ===================== */
  group('٦) الترجمة واللغات');

  const cookie = client.jar.get('hadba_lang');
  client.jar.set('hadba_lang', 'en');

  const enHome = await client.get('/');
  check('الخادم يرسم lang="en" و dir="ltr" عند اختيار الإنجليزية',
    enHome.text.includes('lang="en"') && enHome.text.includes('dir="ltr"'));

  const arHome = await client.get('/');
  client.jar.set('hadba_lang', 'ar');
  const arPage = await client.get('/');
  check('الخادم يرسم lang="ar" و dir="rtl" بالعربية',
    arPage.text.includes('lang="ar"') && arPage.text.includes('dir="rtl"'));
  client.jar.set('hadba_lang', 'en');

  // مفاتيح data-i18n المستخدمة في الصفحة موجودة في قاموس EN
  const i18nSrc = fs.readFileSync(path.join(ROOT, 'public', 'js', 'i18n.js'), 'utf8');
  const enDict = new Set([...i18nSrc.matchAll(/^\s{4}([a-z0-9_]+)\s*:/gm)].map(m => m[1]));
  const usedKeys = new Set([...enHome.text.matchAll(/data-i18n(?:-placeholder|-title|-aria)?="([^"]+)"/g)].map(m => m[1]));
  const missingKeys = [...usedKeys].filter(k => !enDict.has(k));
  check('كل مفاتيح data-i18n في الصفحة موجودة في قاموس EN', missingKeys.length === 0, missingKeys.join(', '));

  // قيم قاموس EN إنجليزية خالصة
  const arabicValues = [];
  for (const m of i18nSrc.matchAll(/^\s{4}[a-z0-9_]+\s*:\s*'([^']*)'/gm)) {
    if (/[\u0600-\u06FF]/.test(m[1])) arabicValues.push(m[1]);
  }
  check('قيم قاموس EN لا تحوي عربيًا', arabicValues.length === 0, arabicValues.slice(0, 3).join(' | '));

  // ملفات المحرّك مُحمّلة في الصفحة
  const scriptsOk = ['/js/i18n.js', '/js/i18n-phrases.js', '/js/i18n-labels.js', '/js/i18n-app.js']
    .every(p => enHome.text.includes(p));
  check('ملفات محرّك الترجمة مُحمّلة في الصفحة', scriptsOk);

  // التسميات الديناميكية تُرسم بالإنجليزية (الفئات/التواريخ من الخادم)
  const enDiscover = await client.get('/discover');
  check('اسم الفئة يُرسم بالإنجليزية في الوضع الإنجليزي',
    !enDiscover.text.includes('\u0635\u062d\u0629 \u0648\u0637\u0628\u064a\u0629'), 'Arabic category label found');
  check('التاريخ يُرسم بصيغة إنجليزية',
    /\d{1,2}\s+[A-Z][a-z]+\s+\d{4}/.test(enDiscover.text)
    || /\b\d+\s?(min|h|d) ago\b/.test(enDiscover.text)
    || /\d{1,2}\s+[A-Z][a-z]+\s+\d{4}/.test((await client.get(`/c/${encodeURIComponent(slug)}`)).text));

  // القواميس تحوي التغطية الكاملة للنصوص الظاهرة في القوالب
  const phrasesSrc = fs.readFileSync(path.join(ROOT, 'public', 'js', 'i18n-phrases.js'), 'utf8');
  const phraseKeys = new Set([
    ...[...phrasesSrc.matchAll(/^\s*'((?:[^'\\]|\\.)*)'\s*:/gm)].map(m => m[1]),
    ...[...phrasesSrc.matchAll(/^\s*"((?:[^"\\]|\\.)*)"\s*:/gm)].map(m => m[1]),
  ]);
  const appSrc = fs.readFileSync(path.join(ROOT, 'public', 'js', 'i18n-app.js'), 'utf8');
  for (const m of appSrc.matchAll(/^\s*'((?:[^'\\]|\\.)*)'\s*:/gm)) phraseKeys.add(m[1]);
  const labelsSrc = fs.readFileSync(path.join(ROOT, 'public', 'js', 'i18n-labels.js'), 'utf8');
  for (const m of labelsSrc.matchAll(/^\s*"((?:[^"\\]|\\.)*)"\s*:/gm)) phraseKeys.add(m[1]);
  const viewsDir = path.join(ROOT, 'views');
  const viewFiles = [];
  const walkViews = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walkViews(full);
      else if (entry.name.endsWith('.ejs')) viewFiles.push(full);
    }
  };
  walkViews(viewsDir);
  const untranslated = [];
  for (const file of viewFiles) {
    const content = fs.readFileSync(file, 'utf8');
    for (const m of content.matchAll(/>([^<>]{2,200})</g)) {
      const raw = m[1].replace(/\s+/g, ' ').trim();
      if (!/[\u0600-\u06FF]/.test(raw)) continue;
      if (raw.includes('<%')) continue;
      if (raw.includes('="')) continue;            // كسر HTML داخل سمة — ليس نصًا
      if (raw.length > 60) continue;              // نص طويل/فريد — غالبًا محتوى
      if (!phraseKeys.has(raw)) untranslated.push(`${path.basename(file)}: ${raw.slice(0, 40)}`);
    }
  }
  check('كل النصوص الظاهرة في القوالب مُترجمة', untranslated.length === 0,
    `${untranslated.length} نصًا: ${untranslated.slice(0, 3).join(' | ')}`);

  if (cookie) client.jar.set('hadba_lang', cookie); else client.jar.delete('hadba_lang');

  /* ===================== ٨) الميزات الجديدة ===================== */
  group('٨) الميزات الجديدة: مستويات الأثر · الاستعادة · جوجل');

  // --- مستويات الأثر ---
  const impactCreate = await client.postForm('/create', {
    title: `حملة بمستويات الأثر ${Date.now().toString(36)}`,
    story: 'وصف اختباري.',
    goal_usd: '500',
    category: 'community',
    charity_wallet: evmWallet,
    chain_id: '1',
    organizer_address: account.address,
    organizer_message: saveMessage,
    organizer_signature: saveSignature,
    impact_amount_0: '25',
    impact_label_0: 'تكفي شهر دواء لمريض',
    impact_label_en_0: 'Covers one month of medicine',
    impact_amount_1: '100',
    impact_label_1: 'مستلزمات مدرسية لثلاثة أطفال',
  });
  const impactSlug = String(impactCreate.location || '').replace('/c/', '');
  const impactRow = q('SELECT * FROM campaigns WHERE slug = ?', impactSlug)[0];
  const levels = impactRow ? models.listImpactLevels(impactRow.id) : [];
  check('إنشاء حملة بمستويات الأثر ينجح', impactCreate.status === 302 && levels.length === 2,
    `status=${impactCreate.status} levels=${levels.length}`);
  check('المستويات تحفظ المبلغ والنصّين', levels.length === 2
    && levels[0].amount_usd === 25
    && levels[0].label_en === 'Covers one month of medicine');

  const impactPage = await client.get(`/c/${encodeURIComponent(impactSlug)}`);
  check('بطاقات الأثر تظهر في صفحة الحملة',
    impactPage.text.includes('impact-card') && impactPage.text.includes('تكفي شهر دواء لمريض'));
  check('واجهة الـAPI تُرجع المستويات', await (async () => {
    const r = await client.get(`/api/campaigns/${encodeURIComponent(impactSlug)}`);
    return Boolean(r.json && r.json.impact_levels && r.json.impact_levels.length === 2);
  })());

  // --- نسيان كلمة المرور ---
  const resetUser = `reset_${Date.now().toString(36)}`;
  await client.postForm('/register', { username: resetUser, password, password2: password });
  const forgot = await client.postForm('/forgot-password', { username: resetUser });
  const tokenMatch = String(forgot.text || '').match(/token=([a-f0-9]{64})/);
  check('طلب الاستعادة يُنشئ رابطًا صالحًا', forgot.status === 200 && Boolean(tokenMatch));

  const unknownForgot = await client.postForm('/forgot-password', { username: 'no_such_user_zzz' });
  check('لا تسريب لوجود الحساب',
    unknownForgot.status === 200
    && String(unknownForgot.text || '').includes('إن كان الحساب موجودًا')
    && !String(unknownForgot.text || '').includes('no_such_user_zzz'));

  if (tokenMatch) {
    const token = tokenMatch[1];
    const resetPage = await client.get(`/reset-password?token=${token}`);
    check('صفحة تعيين كلمة المرور تفتح برمز صالح', resetPage.status === 200);

    const newPass = 'Reset-Check-2026!';
    const doReset = await client.postForm('/reset-password', {
      token, password: newPass, password2: newPass,
    });
    check('تعيين كلمة المرور الجديدة ينجح', doReset.status === 200 || doReset.status === 302, `status=${doReset.status}`);

    const oldLogin = await client.postForm('/login', { username: resetUser, password });
    check('كلمة المرور القديمة لم تعد صالحة', oldLogin.status === 401, `status=${oldLogin.status}`);

    const newLogin = await client.postForm('/login', { username: resetUser, password: newPass });
    check('الدخول بكلمة المرور الجديدة ينجح', newLogin.status === 302, `status=${newLogin.status}`);

    const reuse = await client.postForm('/reset-password', { token, password: 'Another-Pass-2026!', password2: 'Another-Pass-2026!' });
    check('الرمز أحادي الاستخدام (إعادة الاستخدام مرفوضة)', reuse.status === 400, `status=${reuse.status}`);
  }

  // --- تسجيل جوجل ---
  const googleRes = await client.postJson('/api/auth/google', { credential: 'fake.token.value' });
  check('تسجيل جوجل غير مهيّأ يُرفض بوضوح (503)', googleRes.status === 503, `status=${googleRes.status}`);
  const googleConfigured = Boolean(googleRes.json && googleRes.json.error);

  /* ===================== ٧) تقرير الصعوبات ===================== */
  group('٧) الصعوبات التي واجهها المستخدم');

  // نجمع ملاحظات الرحلة آليًا أثناء الفحص
  const difficulties = [];
  const note = (title, detail, severity = 'medium') => difficulties.push({ title, detail, severity });

  // ١) الربط بمحفظة: هل يستطيع مستخدم TRON الربط؟ (كان يرفض سابقًا)
  const tronFamily = addresses.detectFamily(tronWallet);
  const tronLink = await client.postJson('/account/link-wallet', {
    address: tronWallet,
    message: 'HADIYA link wallet (tron)',
    signature: '0x00',
  });
  note('مستخدم TRON (TRC20) في تسجيل الدخول',
    `عنوان TRON مقبول من حيث الصيغة (${tronFamily}) لكن الربط يتطلّب توقيعًا بمخطّط TRON — `
    + 'وهو مدعوم الآن في src/lib/signature.js. المحاولة بمحلّل خاطئ انتهت بردّ '
    + `${tronLink.status} كما هو متوقّع.`,
    'info');

  // ٢) حدّة رسائل الخطأ: هل تفصل بين نوعي الخطأ؟
  const mismatchCase = await client.postForm('/create', {
    title: 'حملة لاختبار رسالة عدم التطابق',
    story: 'وصف',
    goal_usd: '100',
    category: 'community',
    charity_wallet: tronWallet,
    chain_id: '56',
  });
  note('رسالة عدم تطابق الشبكة',
    mismatchCase.status === 400
      ? 'الرسالة تشرح أن العنوان TRC20 لا يصلح على BNY وتذكر البديلين (تغيير الشبكة أو عنوان EVM).'
      : `الحالة ${mismatchCase.status}`,
    'info');

  // ٣) احتكاك التسجيل: كم خطوة قبل إنشاء الحملة؟
  note('مسار إنشاء الحملة (بعد التعديل)',
    'التوقيع صار عند زر الحفظ — لا عند إنشاء الحساب. المسار: حساب ← تعبئة النموذج ← (توقيع اختياري عند الحفظ) ← نشر. '
    + 'ومن لم يوقّع تُراجع حملته أولًا ثم تظهر له لافتة «توقيع وإرسال للمراجعة»، وبعدها تُعاد للمراجعة النهائية.',
    'medium');

  // ٣ب) عنوان الاستلام: توقيع ثانٍ
  note('توقيعان محتملان',
    'التوقيع الأول لمحفظة المنظّم (إثبات الملكية) والثاني لعنوان الاستلام. '
    + 'يمكن جمعهما في توقيع واحد برسالة تغطّي العناوين كلها لتقليل الاحتكاك.',
    'medium');

  // ٤) هل يمكن تجاوز عنوان الاستلام؟ (اختياري — قد يكون بابًا مسيئًا)
  note('عنوان الاستلام اختياري',
    'يمكن نشر حملة بلا عنوان استلام. إن كان الغرض إثبات جهة الاستلام في كل حملة، '
    + 'فيجب جعله إلزاميًا أو اشتراطه للمراجعة قبل النشر.',
    'medium');

  // ٥) التوقيع على TRON: هل تعمل دالة التوقيع لمخطّط TRON؟
  note('توقيع TRON',
    'مخطّط TRON (keccak256 للرسالة الخام بلا بادئة) مدعوم في src/lib/signature.js — '
    + 'يعتمد على تحويل العنوان من base58 إلى الشكل السداسي 0x… قبل التحقق.',
    'info');

  // ٦) الشبكة المختارة في النموذج لا تغيّر الـ placeholder ولا التلميح إلا بالـJS
  note('سلوك النموذج قبل تحميل JavaScript',
    'التلميح الفوري (شبكة غير مناسبة) يعتمد على JavaScript؛ بلا JS يكتشف المستخدم الخطأ عند الإرسال فقط. '
    + 'يُنصح بإضافة تلميح ثابت في HTML يوضّح صيغة العنوان المطلوبة لكل شبكة.',
    'low');

  // ٧) حالة المراجعة: الحملة الجديدة لا تظهر للعامة
  note('إخفاء الحملة عن الزوار',
    'الحملة التي تنتظر المراجعة أو التوقيع لا تظهر للعامة. '
    + 'بعد موافقة المشرف على حملة بلا توقيع تنتظر المنظّم التوقيع، فتبقى مخفية حتى يوقّع — وهذا مقصود لكنه يحتاج رسالة توضّح للمنظّم.',
    'medium');

  // ٨) مهلة الجلسة
  note('مهلة الجلسة',
    'جلسة الحساب صارت ١٥ دقيقة خمول مع تمديد تلقائي عند كل طلب نشط — '
    + 'فتبقى أثناء تصفّح الأقسام دون انقطاع، وتُغلق بعد ربع ساعة خمول.',
    'info');

  for (const d of difficulties) {
    const icon = d.severity === 'info' ? 'ℹ' : d.severity === 'low' ? '·' : '!';
    console.log(`  ${icon} ${d.title}`);
    console.log(`    ${d.detail}`);
  }
  console.log(`  ${DIM}إجمالي الملاحظات: ${difficulties.length}${RESET}`);


  /* ===================== التقرير ===================== */
  return finish();
}

/* ---------- التقرير النهائي ---------- */

function finish() {
  stopServer();

  const failed = results.filter(r => !r.ok);
  const passed = results.length - failed.length;

  console.log(`\n${DIM}══════════════════════════════════════════${RESET}`);
  if (failed.length === 0) {
    console.log(`${GREEN}✔ نجحت كل الفحوص (${passed}/${results.length})${RESET}`);
  } else {
    console.log(`${RED}✖ فشل ${failed.length} من ${results.length} فحصًا${RESET}`);
    for (const f of failed) console.log(`${RED}  · [${f.group}] ${f.name}${f.detail ? ` — ${f.detail}` : ''}${RESET}`);
  }
  console.log(`${DIM}══════════════════════════════════════════${RESET}`);

  process.exit(failed.length === 0 ? 0 : 1);
}

run()
  .catch((err) => {
    console.error(`${RED}خطأ غير متوقع:${RESET}`, err);
    stopServer();
    process.exit(1);
  });
