/* ============================================================
   HADIYA — رفع المشروع إلى GitHub بدون تثبيت git
   ------------------------------------------------------------
   يستخدم GitHub REST API (Git Data API) لرفع كل الملفات دفعةً واحدة.
   المتطلبات:
     • Personal Access Token بصلاحية: repo (إنشاء مستودع جديد)
     • اسم المستودع + الوصف

   الاستعمال (PowerShell):
     $env:GITHUB_TOKEN="ghp_xxxx"
     $env:GITHUB_REPO="my-name/hadiya"      # اختياري: يُنشئ مستودعًا جديدًا
     node scripts/github-upload.js

   ملاحظات:
     • .env و data/ و node_modules مستثناة (قائمة .gitignore تُطبَّق)
     • الطلبات مُقيّدة بمعدل → تأخير 120ms بين الملفات
   ============================================================ */

const fs = require('fs');
const path = require('path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const API = 'https://api.github.com';

const TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPO || '';           // "user/repo"
const BRANCH = process.env.GITHUB_BRANCH || 'main';

const GREEN = '\u001b[32m';
const YELLOW = '\u001b[33m';
const RED = '\u001b[31m';
const DIM = '\u001b[2m';
const RESET = '\u001b[0m';

if (!TOKEN) {
  console.log(`${RED}✖ GITHUB_TOKEN غير موجود${RESET}`);
  console.log('  أنشئ token: https://github.com/settings/tokens (صلاحيات: repo)');
  console.log('  ثم: $env:GITHUB_TOKEN="ghp_..."');
  process.exit(1);
}

/* ---------- ملفات تُستثنى من الرفع ---------- */
const IGNORE_DIRS = new Set(['node_modules', 'data', '.git', '_backups', 'contracts/build']);
const IGNORE_FILES = new Set(['.env', '.env.local', 'hadba.sqlite', 'hadba.sqlite-wal', 'hadba.sqlite-shm']);

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walk(full, acc);
    } else {
      if (IGNORE_FILES.has(entry.name)) continue;
      if (/\.(sqlite|sqlite-wal|sqlite-shm|zip|log)$/.test(entry.name)) continue;
      if (entry.name === '.env' || entry.name.startsWith('.env.')) continue;
      acc.push(rel);
    }
  }
  return acc;
}

/* ---------- واجهة GitHub ---------- */
async function gh(pathname, { method = 'GET', body, raw = false } = {}) {
  const res = await fetch(`${API}${pathname}`, {
    method,
    headers: {
      authorization: `Bearer ${TOKEN}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'content-type': 'application/json',
      'user-agent': 'hadiya-uploader',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (raw) return { status: res.status, text: await res.text() };
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* ليس JSON */ }
  return { status: res.status, json, text };
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log('\n=== HADIYA — الرفع إلى GitHub ===\n');

  const me = await gh('/user');
  if (me.status !== 200) {
    console.log(`${RED}✖ فشل التحقق من التوكن (${me.status})${RESET}`);
    console.log(me.text.slice(0, 300));
    process.exit(1);
  }
  const login = me.json.login;
  console.log(`${GREEN}✔${RESET} متصل باسم: ${login}`);

  const repoName = REPO.includes('/') ? REPO.split('/')[1] : (REPO || 'hadiya');
  const owner = REPO.includes('/') ? REPO.split('/')[0] : login;

  // ١) هل المستودع موجود؟
  let repoInfo = await gh(`/repos/${owner}/${repoName}`);
  if (repoInfo.status === 404) {
    console.log(`… إنشاء المستودع: ${owner}/${repoName}`);
    const created = await gh('/user/repos', {
      method: 'POST',
      body: {
        name: repoName,
        description: 'HADIYA — منصة تبرّع بالعملات الرقمية (GoFundMe web3)',
        private: false,
        auto_init: false,
      },
    });
    if (created.status >= 400) {
      console.log(`${RED}✖ فشل إنشاء المستودع (${created.status})${RESET}`);
      console.log(created.text.slice(0, 400));
      process.exit(1);
    }
    repoInfo = created;
    console.log(`${GREEN}✔${RESET} أُنشئ المستودع: ${created.json.html_url}`);
  } else {
    console.log(`${GREEN}✔${RESET} المستودع موجود: ${repoInfo.json.html_url}`);
  }

  // تهيئة المستودع الفارغ إن لزم الأمر (بعض النسخ تتطلب commit أولي)
  const init = await gh(`/repos/${owner}/${repoName}/contents/README.md`, {
    method: 'PUT',
    body: { message: 'init', content: Buffer.from('# HADIYA\n').toString('base64') },
  });
  await sleep(500);

  // ٢) بناء الشجرة (blob) لكل ملف
  const files = walk(ROOT).sort();
  console.log(`${DIM}   الملفات: ${files.length}${RESET}`);
  const tree = [];
  for (const rel of files) {
    const raw = fs.readFileSync(path.join(ROOT, rel));
    const content = raw.toString('base64');
    const blob = await gh(`/repos/${owner}/${repoName}/git/blobs`, {
      method: 'POST',
      body: { content, encoding: 'base64' },
    });
    if (blob.status >= 400) {
      console.log(`${RED}✖ فشل رفع blob: ${rel}${RESET}`);
      console.log(blob.text.slice(0, 300));
      process.exit(1);
    }
    tree.push({ path: rel, mode: '100644', type: 'blob', sha: blob.json.sha });
    process.stdout.write('.');
    await sleep(80); // احترام حدّ المعدّل
  }
  console.log('\n');

  // ٣) إنشاء شجرة فرعية
  const treeRes = await gh(`/repos/${owner}/${repoName}/git/trees`, {
    method: 'POST',
    body: { tree },
  });
  if (treeRes.status >= 400) {
    console.log(`${RED}✖ فشل إنشاء الشجرة${RESET}`);
    console.log(treeRes.text.slice(0, 400));
    process.exit(1);
  }

  // ٤) هل الفرع موجود؟ (لتجنّب التعارض)
  let baseCommit = null;
  const branchInfo = await gh(`/repos/${owner}/${repoName}/git/ref/heads/${BRANCH}`);
  if (branchInfo.status === 200) {
    const head = await gh(`/repos/${owner}/${repoName}/git/commits/${branchInfo.json.object.sha}`);
    baseCommit = head.json;
  }

  // ٥) إنشاء commit
  const commitRes = await gh(`/repos/${owner}/${repoName}/git/commits`, {
    method: 'POST',
    body: {
      message: 'HADIYA — منصة تبرّع بالعملات الرقمية',
      tree: treeRes.json.sha,
      parents: baseCommit ? [baseCommit.sha] : [],
      author: { name: login, email: `${login}@users.noreply.github.com` },
    },
  });
  if (commitRes.status >= 400) {
    console.log(`${RED}✖ فشل إنشاء الـ commit${RESET}`);
    console.log(commitRes.text.slice(0, 400));
    process.exit(1);
  }
  const commitSha = commitRes.json.sha;

  // ٦) تحديث الفرع
  const refRes = await gh(`/repos/${owner}/${repoName}/git/refs/heads/${BRANCH}`, {
    method: 'PATCH',
    body: { sha: commitSha, force: true },
  });
  if (refRes.status >= 400) {
    const create = await gh(`/repos/${owner}/${repoName}/git/refs`, {
      method: 'POST',
      body: { ref: `refs/heads/${BRANCH}`, sha: commitSha },
    });
    if (create.status >= 400) {
      console.log(`${RED}✖ فشل تحديث الفرع${RESET}`);
      console.log(create.text.slice(0, 400));
      process.exit(1);
    }
  }

  console.log(`${GREEN}✔${RESET} الرفع مكتمل`);
  console.log(`  المستودع: ${repoInfo.json ? repoInfo.json.html_url : `https://github.com/${owner}/${repoName}`}`);
  console.log(`  الفرع:   ${BRANCH}  (commit ${commitSha.slice(0, 7)})`);
  console.log('');
  console.log('  الخطوة التالية على Render:');
  console.log('   New  →  Blueprint  →  اختر المستودع  →  Apply');
  console.log('   Render سيقرأ render.yaml تلقائيًا.');
  console.log('');
  console.log('  ⚠️ الملف .env لم يُرفع (أسرار) — أدخل القيم في Render يدويًا:');
  console.log('     ADMIN_USERNAME / ADMIN_PASSWORD / COLLECTOR_ADDRESS / OWNER_ADDRESS / GOOGLE_CLIENT_ID');
  process.exit(0);
})().catch(err => {
  console.log(`${RED}✖ خطأ: ${err.message}${RESET}`);
  process.exit(1);
});
