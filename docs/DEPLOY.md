# نشر المنصة — العناوين والاستضافة

## ١) العناوين المتاحة الآن

| العنوان | لمن يصل | الحالة |
|---|---|---|
| `http://localhost:3100` | جهازك فقط | ✅ يعمل |
| `http://192.168.115.18:3100` | أي جهاز على نفس شبكة الواي‑فاي | ✅ يعمل (الخادم يستمع على `0.0.0.0`) |
| `http://213.244.114.225:3100` | الإنترنت (إذا فتحت البورت عند المزوّد) | ❌ غير مفتوح بعد |

العنوان العام `213.244.114.225` هو عنوان IP ديناميكي لخط DSL/الشركة — يتغيّر مع كل إعادة اتصال،
ولذلك **لا يصلح كنطاق**.

**قبل أي نشر عام**، غيّر هذه القيم في `.env`:
```env
NODE_ENV=production          # يفعّل كوكي Secure + يمنع عرض مفاتيح التطوير
SESSION_SECRET=<32+ حرف عشوائي>
ADMIN_PASSWORD=<كلمة مرور قوية جديدة>
PASSWORD_PEPPER=<pepper عشوائي جديد>
ADMIN_KEY=<مفتاح عشوائي طويل>   # أو احذفه واستخدم حساب فقط
```

---

## ٢) ما تحتاجه استضافة حقيقية

| المتطلب | لماذا |
|---|---|
| عملية Node **دائمة** | التطبيق خادم Node (Express) — لا يعمل كملفات ثابتة |
| قرص **قابل للكتابة** persistently | `data/hadiya.sqlite` (الجلسات، الحسابات، سجل التدقيق) |
| اتصال **خارجي** لـ RPC و CoinGecko | قراءة السلاسل والأسعار |
| HTTPS | كوكيز `Secure` + ثقة المتبرّعين |

---

## ٣) المسار A — Cloudflare Tunnel (مجاني، الأسرع، رابط HTTPS حقيقي)

يعمل من جهازك مباشرة بدون فتح أي بورت.

```powershell
# 1) ثبّت cloudflared
winget install --id Cloudflare.cloudflared

# 2) شغّل نفقًا مؤقتًا (رابط عشوائي)
cloudflared tunnel --url http://localhost:3100
#   → https://xxxx-xxxx.trycloudflare.com
```

للرابط دائم بنطاقك:
```powershell
cloudflared tunnel login
cloudflared tunnel create hadiya
cloudflared tunnel route-dns hadiya donate.example.com
# ثم عدّل config.yml:
#   tunnel: hadiya
#   credentials-file: C:\Users\<you>\.cloudflared\<id>.json
#   ingress:
#     - hostname: donate.example.com
#       service: http://localhost:3100
cloudflared tunnel run hadiya
```

أو كخدمة Windows:
```powershell
cloudflared service install
```

**مهم**: شغّل الخادم كخدمة أيضًا (وإلا تنقطع مع إغلاق النافذة) — انظر المسار C.

---

## ٤) المسار B — VPS + Caddy (نطاق حقيقي، تحكّم كامل)

```bash
# على السيرفر (Ubuntu 24.04)
sudo apt update && sudo apt install -y caddy git curl
sudo useradd -r -m -d /opt/hadiya -s /usr/sbin/nologin hadiya
sudo -u hadiya -H git clone <repo> /opt/hadiya/app
cd /opt/hadiya/app && sudo -u hadiya npm ci --omit=dev
```

**خدمة systemd** (`/etc/systemd/system/hadiya.service`):
```ini
[Unit]
Description=HADIYA crowdfunding platform
After=network.target

[Service]
Type=simple
User=hadiya
WorkingDirectory=/opt/hadiya/app
Environment=NODE_ENV=production
EnvironmentFile=/opt/hadiya/app/.env
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/opt/hadiya/app/data

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now hadiya
```

**Caddy** (`/etc/caddy/Caddyfile`) — يوفّر HTTPS تلقائيًا (Let's Encrypt):
```
donate.example.com {
    reverse_proxy 127.0.0.1:3100
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Frame-Options "DENY"
        X-Content-Type-Options "nosniff"
    }
}
```
```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

### نشر العقد على الشبكة الصحيحة
```bash
cd /opt/hadiya/app
npm run compile:contracts
CHAIN_ID=8453 npm run deploy:contracts     # Base mainnet
CHAIN_ID=8453 npm run set:tiers              # ضبط شرائح الرسوم
```
> `set-tiers` يجب إعادة تشغيله دوريًا (كل أسبوعين تقريبًا) لأن عتبات الأصول المتقلّبة
> ثابتة بوحدة الرمز. أو شغّله بأسلوب `--watch` على الخادم.

---

## ٥) المسار C — تشغيل دائم على جهازك (بدون VPS)

**Windows — Task Scheduler:**
```powershell
# شغّل الخادم عند بدء التشغيل
$action  = New-ScheduledTaskAction -Execute "node" -Argument "src/server.js" -WorkingDirectory "C:\path\to\crowdfund-web3"
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
Register-ScheduledTask -TaskName "HADIYA" -Action $action -Trigger $trigger -Settings $settings -User "SYSTEM" -RunLevel Highest
```
أو `pm2`:
```powershell
npm install -g pm2
pm2 start src/server.js --name hadiya --cwd "C:\path\to\crowdfund-web3"
pm2 save && pm2 startup
```

**Linux — systemd:** كما في المسار B.

---

## ٦) قبل ما تفتح الباب — قائمة تحقّق

- [ ] `NODE_ENV=production` في `.env`
- [ ] `SESSION_SECRET` عشوائي (٣٢+ حرف) — **مختلف** عن قيمة التطوير
- [ ] `PASSWORD_PEPPER` عشوائي — **تغييره بعد إنشاء الحساب يُبطل كلمة المرور**
- [ ] `ADMIN_PASSWORD` جديد (غيّره من اللوحة أولًا)
- [ ] `ADMIN_KEY` طويل وعشوائي أو محذوف
- [ ] `.env` و `data/` **خارج** Git (`.gitignore` جاهز ✓)
- [ ] جدار حماية: البورت 3100 داخلي فقط، والوصول الخارجي عبر 80/443 أو النفق
- [ ] نسخ احتياطي: `data/hadiya.sqlite` (يحوي سجل التدقيق والجلسات) + نسخة من `.env`
- [ ] `COLLECTOR_ADDRESS` = محفظتك الحقيقية (استقبل حصة ٩٪)
- [ ] `OWNER_ADDRESS` = محفظتك (تدخل للوحة الإدارة بتوقيعها)
- [ ] مراجعة `/terms` و `/privacy` بمحامٍ قبل استقبال أموال حقيقية
- [ ] تفعيل KYC/AML إن طُلب في بلدك (المشروع لا يطبّقه حاليًا)

---

## ٧) أسماء نطاقات مقترحة

| النطاق | ملاحظة |
|---|---|
| `donate.<اسمك>.com` | واضح ومباشر |
| `give.<اسمك>.com` | قصير وسهل الحفظ |
| `tanafiq.<اسمك>.com` / `zakat.<اسمك>.com` | يوصل بالرسالة (تبرّع) |
| `hadiya.<اسمك>.com` | يطابق اسم المنصة |

> البنية: سجل `Domain` + سجل `A record` يشير إلى عنوان السيرفر، وCaddy يتولّى إصدار شهادة HTTPS تلقائيًا.
> Cloudflare Registrar هو الأرخص — أو `Namecheap` / `Porkbun`.

---

## ٨) المسار D — Render (الأسهل للنشر الدائم)

Render يبني المشروع من GitHub ويشغّله كخدمة ويب دائمة مع HTTPS تلقائي.

### ٨.١) رفع الكود إلى GitHub (بلا git مثبّت)

```powershell
$env:GITHUB_TOKEN="ghp_..."        # من https://github.com/settings/tokens (صلاحية repo)
$env:GITHUB_REPO="اسمك/hadiya"     # سيُنشئ المستودع إن لم يوجد
node scripts/github-upload.js
```
السكربت يرفع كل الملفات دفعةً واحدة عبر GitHub API (يستثني `.env` و`data/` و`node_modules`).

### ٨.٢) إنشاء الخدمة

1. Render → **New** → **Blueprint** → اختر المستودع → **Apply**.
2. Render يقرأ `render.yaml` تلقائيًا: صورة Docker (`Dockerfile`) + قرص دائم + متغيّرات.
3. أدخل القيم التي وُضعت `sync: false`:
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD`
   - `COLLECTOR_ADDRESS` (محفظة المنصّة) / `OWNER_ADDRESS`
   - `GOOGLE_CLIENT_ID` (اختياري — لتفعيل دخول جوجل)

### ٨.٣) ⚠️ قاعدة البيانات والقرص الدائم

| الخطة | نتيجة قاعدة البيانات |
|---|---|
| Free (بلا قرص) | نظام الملفات مؤقّت ⇒ **تُفقد كل البيانات عند كل نشر** ✗ |
| Starter + Disk | القرص الدائم `/var/data` (1GB) ⇒ البيانات تبقى ✓ |

- القرص الدائم في `render.yaml` (mountPath `/var/data`) و`DB_FILE=/var/data/hadba.sqlite`.
- **نسخة واحدة فقط**: SQLite على قرص محلي ⇒ لا تفعّل Scaling (كل نسخة لها نسختها وتتباعد).
- نسخة احتياطية: نزّل `hadba.sqlite` من القرص قبل أي حذف/تغيير خطة.

### ٨.٤) أوامر مفيدة

```powershell
node scripts/render-prep.js --check   # فحص ما قبل النشر
node scripts/render-prep.js            # توليد الأسرار + طباعة الخطوات
node scripts/prod-smoke.js             # محاكاة بيئة الإنتاج محليًا (٩ فحوص)
```

### ٨.٥) بعد أول نشر

1. افتح `/admin` وسجّل الدخول بحساب الأدمن (كلمة المرور من `.env`).
2. اضبط «محفظة الكولكتر» في الإعدادات.
3. سجّل عنوان عقد `DonationSplitter` المنشور لكل شبكة.
4. انشر العقد محليًا: `npm run compile:contracts` ثم `CHAIN_ID=8453 npm run deploy:contracts`.
