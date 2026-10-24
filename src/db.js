/* قاعدة البيانات (SQLite المدمج في Node 24 — بدون أي خدمة خارجية).
   كل المبالغ تُخزَّن بالوحدة الأصلية (wei / 6 decimals) كأرقام نصية،
   والتخزين الصحيح للنص avoids مشاكل الكسور العشرية. */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, 'hadiya.sqlite');

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS campaigns (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  slug                TEXT UNIQUE NOT NULL,
  title               TEXT NOT NULL,
  subtitle            TEXT DEFAULT '',
  story               TEXT DEFAULT '',
  category            TEXT NOT NULL DEFAULT 'community',
  goal_usd            REAL NOT NULL DEFAULT 0,
  cover_url           TEXT DEFAULT '',
  accent              TEXT DEFAULT 'emerald',
  organizer_name      TEXT DEFAULT '',
  organizer_wallet    TEXT DEFAULT '',
  charity_wallet      TEXT NOT NULL DEFAULT '',
  chain_id            INTEGER NOT NULL DEFAULT 8453,
  token_symbol        TEXT NOT NULL DEFAULT 'USDC',
  splitter_address    TEXT DEFAULT '',
  splitter_campaign_id INTEGER,
  status              TEXT NOT NULL DEFAULT 'active',   -- active | pending_review | paused | closed | rejected
  verification        TEXT NOT NULL DEFAULT 'self_declared', -- self_declared | verified
  country             TEXT DEFAULT '',
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS donations (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id    INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  donor_address  TEXT NOT NULL,
  donor_name     TEXT DEFAULT '',
  message        TEXT DEFAULT '',
  is_anonymous   INTEGER NOT NULL DEFAULT 0,
  chain_id       INTEGER NOT NULL,
  token_symbol   TEXT NOT NULL,
  token_address  TEXT DEFAULT '',
  amount_raw     TEXT NOT NULL DEFAULT '0',   -- المبلغ الإجمالي بالوحدة الأصلية
  fee_raw        TEXT NOT NULL DEFAULT '0',   -- حصة المنصة (٩٪)
  charity_raw    TEXT NOT NULL DEFAULT '0',   -- الصافي للجهة المستفيدة (٩١٪)
  usd_value      REAL NOT NULL DEFAULT 0,
  tx_hash        TEXT,
  status         TEXT NOT NULL DEFAULT 'pending', -- pending | confirmed | failed
  settlement     TEXT NOT NULL DEFAULT 'splitter', -- splitter | direct (تحويل مباشر)
  fee_settled    INTEGER NOT NULL DEFAULT 0,  -- هل حُصّلت رسوم المنصة فعليًا؟
  block_number   INTEGER,
  error_reason   TEXT DEFAULT '',
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  confirmed_at   TEXT
);

CREATE TABLE IF NOT EXISTS campaign_updates (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id  INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  author_wallet TEXT DEFAULT '',
  title        TEXT DEFAULT '',
  body         TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS comments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id   INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  author_wallet TEXT DEFAULT '',
  author_name   TEXT DEFAULT '',
  body          TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  address    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS nonces (
  address    TEXT PRIMARY KEY,
  nonce      TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ledger (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  kind         TEXT NOT NULL,            -- fee | refund | sweep
  campaign_id  INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
  amount_raw   TEXT NOT NULL DEFAULT '0',
  token_symbol TEXT NOT NULL,
  chain_id     INTEGER NOT NULL,
  tx_hash      TEXT DEFAULT '',
  note         TEXT DEFAULT '',
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- سجل التدقيق: كل إجراء حسّاس (تغيير رسوم، اعتماد حملة، تدوير مفاتيح)
CREATE TABLE IF NOT EXISTS audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  actor      TEXT NOT NULL,
  action     TEXT NOT NULL,
  target     TEXT DEFAULT '',
  before     TEXT DEFAULT '',
  after      TEXT DEFAULT '',
  ip         TEXT DEFAULT '',
  note       TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- حسابات الإدارة (اسم مستخدم + كلمة مرور بـ Argon2id)
CREATE TABLE IF NOT EXISTS admin_accounts (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  username             TEXT UNIQUE NOT NULL,
  password_hash        TEXT NOT NULL,
  role                 TEXT NOT NULL DEFAULT 'admin',
  is_active            INTEGER NOT NULL DEFAULT 1,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  failed_attempts      INTEGER NOT NULL DEFAULT 0,
  locked_until         TEXT,
  last_login_at        TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

-- حسابات المستخدمين (اسم مستخدم + كلمة مرور) —时可以 ربط محفظة
CREATE TABLE IF NOT EXISTS users (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  username             TEXT UNIQUE NOT NULL,
  password_hash        TEXT NOT NULL,
  display_name         TEXT DEFAULT '',
  wallet_address       TEXT DEFAULT '',
  is_active            INTEGER NOT NULL DEFAULT 1,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  failed_attempts      INTEGER NOT NULL DEFAULT 0,
  locked_until         TEXT,
  last_login_at        TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_donations_campaign ON donations(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_tx ON donations(tx_hash);
CREATE INDEX IF NOT EXISTS idx_updates_campaign ON campaign_updates(campaign_id);CREATE INDEX IF NOT EXISTS idx_comments_campaign ON comments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

/* مستويات الأثر: ربط مبلغ بنتيجة ملموسة ("٢٥$ = دواء شهر لمريض") */
CREATE TABLE IF NOT EXISTS impact_levels (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL,
  amount_usd  REAL NOT NULL,
  label       TEXT NOT NULL DEFAULT '',
  label_en    TEXT DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_impact_campaign ON impact_levels(campaign_id, sort_order);

/* طلبات استعادة كلمة المرور (رمز أحادي الاستخدام + صلاحية ٣٠ دقيقة) */
CREATE TABLE IF NOT EXISTS password_resets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  token       TEXT UNIQUE NOT NULL,
  username    TEXT NOT NULL,
  ip          TEXT DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT NOT NULL,
  used_at     TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_reset_username ON password_resets(username);
`);

/* ترحيلات بسيطة (تُطبَّق مرة واحدة) */
function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

// نسبة الرسوم المطبَّقة فعليًا على التبرّع (نقطة أساس) — ٩٠٠/٧٠٠/٥٠٠/٣٠٠
ensureColumn('donations', 'fee_bps', 'INTEGER NOT NULL DEFAULT 900');
// شريحة الرسوم المطبَّقة (نص للعرض)
ensureColumn('donations', 'fee_tier', "TEXT DEFAULT ''");
// CID للمحتوى على IPFS (القصة) — قراءة مستقلة من شبكة لا تتحكّم بها المنصة
ensureColumn('campaigns', 'story_cid', "TEXT DEFAULT ''");
// CID لصورة الغلاف على IPFS
ensureColumn('campaigns', 'cover_cid', "TEXT DEFAULT ''");
// نسخة إنجليزية اختيارية من محتوى الحملة (تظهر عند اختيار لغة الواجهة الإنجليزية)
ensureColumn('campaigns', 'title_en', "TEXT DEFAULT ''");
ensureColumn('campaigns', 'subtitle_en', "TEXT DEFAULT ''");
ensureColumn('campaigns', 'story_en', "TEXT DEFAULT ''");
// عنوان الاستلام (الجهة التي ستستلم المبلغ/التسليم) — يُوثَّق بتوقيع من صاحب العنوان
ensureColumn('campaigns', 'delivery_address', "TEXT DEFAULT ''");
ensureColumn('campaigns', 'delivery_verified', "INTEGER DEFAULT 0");
// إثبات ملكية محفظة المنظّم (توقيع) — يُطلب عند حفظ الحملة أو بعد موافقة الإدارة
ensureColumn('campaigns', 'organizer_signature', "TEXT DEFAULT ''");
ensureColumn('campaigns', 'organizer_signed_at', "TEXT DEFAULT ''");
// حسابات جوجل: البريد ومعرّف الحساب الفريد
ensureColumn('users', 'email', "TEXT DEFAULT ''");
ensureColumn('users', 'google_sub', "TEXT DEFAULT ''");

// ---------------------------------------------------------------- settings

function getSetting(key, fallback = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

function setSetting(key, value) {
  db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
  ).run(key, String(value));
  return value;
}

function allSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

// ------------------------------------------------------------------ utils

const q = (sql, ...params) => db.prepare(sql).all(...params);
const one = (sql, ...params) => db.prepare(sql).get(...params);
const run = (sql, ...params) => db.prepare(sql).run(...params);

module.exports = {
  db,
  DB_FILE,
  DATA_DIR,
  getSetting,
  setSetting,
  allSettings,
  q,
  one,
  run,
};
