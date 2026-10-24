/* طبقة الاستعلامات — تجميع المبالغ يتم في JS بـ BigInt (تجنّبًا لتجاوز حد SQLite INTEGER). */

const { q, one, run } = require('./db');
const { assertNoWalletAddress } = require('./lib/validate');

const CATEGORY_KEYS = [
  'medical',
  'emergency',
  'memorial',
  'education',
  'animal',
  'community',
  'environment',
  'charity',
  'faith',
  'sports',
  'travel',
  'creative',
];

// ------------------------------------------------------------- campaigns

function listCampaigns({ search = '', category = '', sort = 'recent', limit = 24, offset = 0, status = null } = {}) {
  const where = [];
  const params = [];
  if (status) {
    where.push('c.status = ?');
    params.push(status);
  } else {
    where.push("c.status = 'active'"); // العامة: المراجَع فقط
  }
  if (search) {
    where.push('(c.title LIKE ? OR c.subtitle LIKE ? OR c.story LIKE ? OR c.organizer_name LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }
  if (category && category !== 'all') {
    where.push('c.category = ?');
    params.push(category);
  }
  const order =
    sort === 'goal' ? 'c.goal_usd DESC'
      : sort === 'ending' ? 'c.goal_usd - COALESCE(t.total_usd, 0) ASC'
        : 'c.created_at DESC';
  const sql = `
    SELECT c.*, COALESCE(t.total_usd, 0) AS total_usd, COALESCE(t.donor_count, 0) AS donor_count
    FROM campaigns c
    LEFT JOIN (
      SELECT campaign_id,
             SUM(usd_value) AS total_usd,
             COUNT(*) AS donor_count
      FROM donations
      WHERE status = 'confirmed'
      GROUP BY campaign_id
    ) t ON t.campaign_id = c.id
    WHERE ${where.join(' AND ')}
    ORDER BY ${order}
    LIMIT ? OFFSET ?`;
  return q(sql, ...params, Number(limit), Number(offset));
}

function countCampaigns({ search = '', category = '', status = null } = {}) {
  const where = [];
  const params = [];
  if (status) {
    where.push('status = ?');
    params.push(status);
  } else {
    where.push("status = 'active'");
  }
  if (search) {
    where.push('(title LIKE ? OR subtitle LIKE ? OR story LIKE ? OR organizer_name LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }
  if (category && category !== 'all') {
    where.push('category = ?');
    params.push(category);
  }
  const row = one(`SELECT COUNT(*) AS n FROM campaigns WHERE ${where.join(' AND ')}`, ...params);
  return row ? row.n : 0;
}

function getCampaignBySlug(slug) {
  return one('SELECT * FROM campaigns WHERE slug = ?', slug);
}

function getCampaignById(id) {
  return one('SELECT * FROM campaigns WHERE id = ?', Number(id));
}

/* توحيد عنوان المحفظة: EVM → أحرف صغيرة (غير حسّاسة) · TRON → نُبقي الحالة (Base58 حسّاس) */
function normalizeWallet(address) {
  const value = String(address || '').trim();
  if (!value) return '';
  return /^0x[0-9a-fA-F]{40}$/.test(value) ? value.toLowerCase() : value;
}

function createCampaign(data) {
  // منع وضع عناوين المحافظ داخل نصوص الحملة
  assertNoWalletAddress({
    title: data.title,
    subtitle: data.subtitle,
    story: data.story,
  });

  const slug = uniqueSlug(data.slug || data.title);
  const info = run(
    `INSERT INTO campaigns
      (slug, title, subtitle, story, category, goal_usd, cover_url, accent,
       organizer_name, organizer_wallet, charity_wallet, chain_id, token_symbol,
       splitter_address, splitter_campaign_id, verification, country, status,
       title_en, subtitle_en, story_en, delivery_address, delivery_verified)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    slug,
    data.title,
    data.subtitle || '',
    data.story || '',
    data.category || 'community',
    Number(data.goal_usd) || 0,
    data.cover_url || '',
    data.accent || 'emerald',
    data.organizer_name || '',
    (data.organizer_wallet || '').toLowerCase(),
    normalizeWallet(data.charity_wallet),
    Number(data.chain_id) || 8453,
    data.token_symbol || 'USDC',
    data.splitter_address || '',
    data.splitter_campaign_id ?? null,
    data.verification || 'self_declared',
    data.country || '',
    data.status || 'pending_review',
    data.title_en || '',
    data.subtitle_en || '',
    data.story_en || '',
    normalizeWallet(data.delivery_address),
    data.delivery_verified ? 1 : 0
  );
  return getCampaignById(info.lastInsertRowid);
}

/* تحويل مبسّط للعربية إلى حروف لاتينية حتى تكون الروابط قابلة للنسخ والمشاركة */
const TRANSLIT = {
  'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h', 'خ': 'kh',
  'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z',
  'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w',
  'ي': 'y', 'ى': 'a', 'ة': 'h', 'ء': '', 'أ': 'a', 'ؤ': 'u', 'ئ': 'y', 'ـ': '', '،': '', '؛': '',
  '؟': '', '!': '', '.': '', '،': '', 'ـ': '', ' ': '-', '0': '0', '1': '1', '2': '2', '3': '3',
  '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
};

function transliterate(text) {
  return String(text || '')
    .split('')
    .map(ch => (ch in TRANSLIT ? TRANSLIT[ch] : ch))
    .join('')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function uniqueSlug(base) {
  const norm = transliterate(base) || 'campaign';
  let slug = norm.slice(0, 60).replace(/-+$/, '') || 'campaign';
  let i = 2;
  while (one('SELECT id FROM campaigns WHERE slug = ?', slug)) {
    slug = `${norm.slice(0, 56).replace(/-+$/, '')}-${i++}`;
  }
  return slug;
}

function updateCampaign(id, patch) {
  const allowed = [
    'title', 'subtitle', 'story', 'category', 'goal_usd', 'cover_url', 'accent',
    'organizer_name', 'charity_wallet', 'chain_id', 'token_symbol', 'status',
    'splitter_address', 'splitter_campaign_id', 'verification', 'country',
    'organizer_wallet', 'organizer_signature', 'organizer_signed_at',
    'delivery_address', 'delivery_verified',
  ];
  const keys = Object.keys(patch).filter(k => allowed.includes(k));
  if (!keys.length) return getCampaignById(id);
  const set = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => patch[k]);
  run(`UPDATE campaigns SET ${set}, updated_at = datetime('now') WHERE id = ?`, ...values, Number(id));
  return getCampaignById(id);
}

// ------------------------------------------------------------- donations

function listDonations({ campaignId = null, status = 'confirmed', limit = 50 } = {}) {
  const where = [];
  const params = [];
  if (campaignId) {
    where.push('d.campaign_id = ?');
    params.push(Number(campaignId));
  }
  if (status) {
    where.push('d.status = ?');
    params.push(status);
  }
  const sql = `
    SELECT d.*, c.slug, c.title AS campaign_title, c.charity_wallet
    FROM donations d JOIN campaigns c ON c.id = d.campaign_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY d.created_at DESC LIMIT ?`;
  return q(sql, ...params, Number(limit));
}

function findDonationByTx(txHash) {
  return one('SELECT * FROM donations WHERE tx_hash = ?', txHash.toLowerCase());
}

function insertDonation(data) {
  const info = run(
    `INSERT INTO donations
      (campaign_id, donor_address, donor_name, message, is_anonymous, chain_id,
       token_symbol, token_address, amount_raw, fee_raw, charity_raw, usd_value,
       tx_hash, status, settlement, fee_settled, block_number, error_reason, fee_bps, fee_tier)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    data.campaign_id,
    (data.donor_address || '').toLowerCase(),
    data.donor_name || '',
    data.message || '',
    data.is_anonymous ? 1 : 0,
    Number(data.chain_id),
    data.token_symbol,
    data.token_address || '',
    String(data.amount_raw || '0'),
    String(data.fee_raw || '0'),
    String(data.charity_raw || '0'),
    Number(data.usd_value || 0),
    data.tx_hash ? data.tx_hash.toLowerCase() : null,
    data.status || 'pending',
    data.settlement || 'splitter',
    data.fee_settled ? 1 : 0,
    data.block_number ?? null,
    data.error_reason || '',
    data.fee_bps ?? 900,
    data.fee_tier || ''
  );
  return one('SELECT * FROM donations WHERE id = ?', info.lastInsertRowid);
}

function updateDonation(id, patch) {
  const allowed = [
    'donor_address', 'donor_name', 'message', 'is_anonymous', 'amount_raw', 'fee_raw',
    'charity_raw', 'usd_value', 'status', 'settlement', 'fee_settled', 'block_number',
    'error_reason', 'token_symbol', 'token_address', 'confirmed_at',
  ];
  const keys = Object.keys(patch).filter(k => allowed.includes(k));
  if (!keys.length) return;
  const set = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => (patch[k] === null ? null : patch[k]));
  run(`UPDATE donations SET ${set} WHERE id = ?`, ...values, Number(id));
}

function campaignTotals(campaignId) {
  const rows = q(
    `SELECT token_symbol, chain_id, amount_raw, fee_raw, charity_raw, usd_value, fee_bps
     FROM donations WHERE campaign_id = ? AND status = 'confirmed'`,
    Number(campaignId)
  );
  const byToken = new Map();
  let totalUsd = 0;
  let donorCount = 0;
  let feeUsd = 0;
  let charityUsd = 0;
  const tiersUsed = new Map();
  for (const r of rows) {
    const key = `${r.chain_id}:${r.token_symbol}`;
    const cur = byToken.get(key) || {
      chain_id: r.chain_id,
      token_symbol: r.token_symbol,
      gross: 0n,
      fee: 0n,
      charity: 0n,
    };
    cur.gross += BigInt(r.amount_raw);
    cur.fee += BigInt(r.fee_raw);
    cur.charity += BigInt(r.charity_raw);
    byToken.set(key, cur);
    const usd = Number(r.usd_value || 0);
    const bps = Number(r.fee_bps || 900);
    totalUsd += usd;
    feeUsd += usd * (bps / 10000);
    charityUsd += usd * ((10000 - bps) / 10000);
    tiersUsed.set(bps, (tiersUsed.get(bps) || 0) + 1);
    donorCount += 1;
  }
  // تحويل المجاميع إلى نصوص
  for (const cur of byToken.values()) {
    cur.gross = cur.gross.toString();
    cur.fee = cur.fee.toString();
    cur.charity = cur.charity.toString();
  }
  const grossAll = [...byToken.values()].reduce((acc, c) => acc + BigInt(c.gross), 0n);
  return {
    byToken: [...byToken.values()],
    totalUsd,
    donorCount,
    feeUsd,
    charityUsd,
    grossRawAll: grossAll.toString(),
    tiersUsed: [...tiersUsed.entries()].map(([bps, count]) => ({ bps, count })).sort((a, b) => b.bps - a.bps),
  };
}

function platformTotals() {
  const rows = q(
    `SELECT chain_id, token_symbol, amount_raw, fee_raw, charity_raw, usd_value, fee_settled, fee_bps
     FROM donations WHERE status = 'confirmed'`
  );
  const byToken = new Map();
  let grossUsd = 0;
  let feeUsd = 0;
  let charityUsd = 0;
  let unsettledFees = 0;
  let donations = 0;
  const tiersUsed = new Map();
  for (const r of rows) {
    const key = `${r.chain_id}:${r.token_symbol}`;
    const cur = byToken.get(key) || {
      chain_id: r.chain_id,
      token_symbol: r.token_symbol,
      gross: 0n,
      fee: 0n,
      charity: 0n,
      fee_settled: 0,
    };
    cur.gross += BigInt(r.amount_raw);
    cur.fee += BigInt(r.fee_raw);
    cur.charity += BigInt(r.charity_raw);
    if (!r.fee_settled) cur.fee_settled += 1;
    byToken.set(key, cur);
    const usd = Number(r.usd_value || 0);
    const bps = Number(r.fee_bps || 900);
    grossUsd += usd;
    feeUsd += usd * (bps / 10000);
    charityUsd += usd * ((10000 - bps) / 10000);
    if (!r.fee_settled) unsettledFees += 1;
    tiersUsed.set(bps, (tiersUsed.get(bps) || 0) + 1);
    donations += 1;
  }
  for (const cur of byToken.values()) {
    cur.gross = cur.gross.toString();
    cur.fee = cur.fee.toString();
    cur.charity = cur.charity.toString();
  }
  return {
    byToken: [...byToken.values()],
    grossUsd,
    feeUsd,
    charityUsd,
    donations,
    unsettledFees,
    tiersUsed: [...tiersUsed.entries()].map(([bps, count]) => ({ bps, count })).sort((a, b) => b.bps - a.bps),
  };
}

function pendingDonations(limit = 40) {
  return q(
    `SELECT d.*, c.slug, c.charity_wallet, c.splitter_address
     FROM donations d JOIN campaigns c ON c.id = d.campaign_id
     WHERE d.status = 'pending' ORDER BY d.created_at ASC LIMIT ?`,
    Number(limit)
  );
}

// ---------------------------------------------------------------- ledger

function addLedger(entry) {
  run(
    `INSERT INTO ledger (kind, campaign_id, amount_raw, token_symbol, chain_id, tx_hash, note)
     VALUES (?,?,?,?,?,?,?)`,
    entry.kind,
    entry.campaign_id ?? null,
    String(entry.amount_raw || '0'),
    entry.token_symbol,
    Number(entry.chain_id),
    entry.tx_hash || '',
    entry.note || ''
  );
}

function listLedger(limit = 100) {
  return q(
    `SELECT l.*, c.title AS campaign_title, c.slug
     FROM ledger l LEFT JOIN campaigns c ON c.id = l.campaign_id
     ORDER BY l.created_at DESC LIMIT ?`,
    Number(limit)
  );
}

// ------------------------------------------------------- impact levels

/* مستويات الأثر: مبلغ ↔ نتيجة ملموسة. منظّم الحملة يحدّدها وتظهر للزوار. */
function listImpactLevels(campaignId, { includeInactive = false } = {}) {
  return q(
    `SELECT * FROM impact_levels
     WHERE campaign_id = ?${includeInactive ? '' : ' AND is_active = 1'}
     ORDER BY sort_order ASC, amount_usd ASC`,
    Number(campaignId)
  );
}

function addImpactLevel(campaignId, { amount_usd, label = '', label_en = '', sort_order = 0, is_active = 1 }) {
  const amount = Number(amount_usd);
  if (!Number.isFinite(amount) || amount <= 0) {
    const err = new Error('مبلغ مستوى الأثر غير صالح');
    err.code = 'INVALID_AMOUNT';
    throw err;
  }
  if (amount > 1_000_000) {
    const err = new Error('مبلغ مستوى الأثر كبير جدًا');
    err.code = 'INVALID_AMOUNT';
    throw err;
  }
  // لا تُقبل عناوين المحافظ داخل نص الأثر (نفس قاعدة النصوص)
  assertNoWalletAddress({ label, label_en });
  const info = run(
    `INSERT INTO impact_levels (campaign_id, amount_usd, label, label_en, sort_order, is_active)
     VALUES (?,?,?,?,?,?)`,
    Number(campaignId),
    amount,
    String(label || '').trim().slice(0, 200),
    String(label_en || '').trim().slice(0, 200),
    Number(sort_order) || 0,
    is_active ? 1 : 0
  );
  return one('SELECT * FROM impact_levels WHERE id = ?', info.lastInsertRowid);
}

function updateImpactLevel(id, patch) {
  const allowed = ['amount_usd', 'label', 'label_en', 'sort_order', 'is_active'];
  const keys = Object.keys(patch || {}).filter(k => allowed.includes(k));
  if (!keys.length) return one('SELECT * FROM impact_levels WHERE id = ?', Number(id));
  if (keys.includes('amount_usd')) {
    const amount = Number(patch.amount_usd);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
      const err = new Error('مبلغ مستوى الأثر غير صالح');
      err.code = 'INVALID_AMOUNT';
      throw err;
    }
  }
  if (keys.includes('label') || keys.includes('label_en')) {
    assertNoWalletAddress({ label: patch.label, label_en: patch.label_en });
  }
  const set = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => (k === 'amount_usd' ? Number(patch[k]) : patch[k]));
  run(`UPDATE impact_levels SET ${set} WHERE id = ?`, ...values, Number(id));
  return one('SELECT * FROM impact_levels WHERE id = ?', Number(id));
}

function deleteImpactLevel(id) {
  const info = run('DELETE FROM impact_levels WHERE id = ?', Number(id));
  return info.changes > 0;
}

/* يستبدل مستويات الحملة كلها (من نموذج الإنشاء/التحرير) */
function replaceImpactLevels(campaignId, levels = []) {
  run('DELETE FROM impact_levels WHERE campaign_id = ?', Number(campaignId));
  const created = [];
  (levels || []).forEach((l, index) => {
    try {
      created.push(addImpactLevel(campaignId, {
        amount_usd: l.amount_usd,
        label: l.label,
        label_en: l.label_en,
        sort_order: l.sort_order !== undefined ? l.sort_order : index,
        is_active: l.is_active === undefined ? 1 : l.is_active,
      }));
    } catch { /* نتجاهل المستوى غير الصالح بدل إفشال العملية كلها */ }
  });
  return created;
}

// ------------------------------------------------------- updates/comments

function listUpdates(campaignId) {
  return q('SELECT * FROM campaign_updates WHERE campaign_id = ? ORDER BY created_at DESC', Number(campaignId));
}

function addUpdate(campaignId, { title = '', body, author_wallet = '' }) {
  // نفس قاعدة منع عناوين المحافظ داخل نصوص الحملة
  assertNoWalletAddress({ title, body });
  const info = run(
    'INSERT INTO campaign_updates (campaign_id, author_wallet, title, body) VALUES (?,?,?,?)',
    Number(campaignId),
    (author_wallet || '').toLowerCase(),
    title,
    body
  );
  return one('SELECT * FROM campaign_updates WHERE id = ?', info.lastInsertRowid);
}

function listComments(campaignId) {
  return q('SELECT * FROM comments WHERE campaign_id = ? ORDER BY created_at DESC', Number(campaignId));
}

function addComment(campaignId, { body, author_wallet = '', author_name = '' }) {
  // منع وضع عناوين المحافظ في تعليقات الحملة أيضًا
  assertNoWalletAddress({ body, author_name });
  const info = run(
    'INSERT INTO comments (campaign_id, author_wallet, author_name, body) VALUES (?,?,?,?)',
    Number(campaignId),
    (author_wallet || '').toLowerCase(),
    author_name,
    body
  );
  return one('SELECT * FROM comments WHERE id = ?', info.lastInsertRowid);
}

function listCampaignsByStatus(status) {
  return q('SELECT * FROM campaigns WHERE status = ? ORDER BY created_at DESC', status);
}

/* ===== عمليات الحذف (للمشرف فقط — تُستدعى من مسارات الإدارة) ===== */

function deleteCampaign(id) {
  const info = run('DELETE FROM campaigns WHERE id = ?', Number(id));
  return info.changes;
}

function deleteDonation(id) {
  const info = run('DELETE FROM donations WHERE id = ?', Number(id));
  return info.changes;
}

function deleteUpdate(id) {
  const info = run('DELETE FROM campaign_updates WHERE id = ?', Number(id));
  return info.changes;
}

function deleteComment(id) {
  const info = run('DELETE FROM comments WHERE id = ?', Number(id));
  return info.changes;
}

module.exports = {
  CATEGORY_KEYS,
  listCampaigns,
  listCampaignsByStatus,
  deleteCampaign,
  deleteDonation,
  deleteUpdate,
  deleteComment,
  countCampaigns,
  getCampaignBySlug,
  getCampaignById,
  createCampaign,
  updateCampaign,
  uniqueSlug,
  listDonations,
  findDonationByTx,
  insertDonation,
  updateDonation,
  campaignTotals,
  platformTotals,
  pendingDonations,
  addLedger,
  listLedger,
  listUpdates,
  addUpdate,
  listComments,
  addComment,
  listImpactLevels,
  addImpactLevel,
  updateImpactLevel,
  deleteImpactLevel,
  replaceImpactLevels,
};
