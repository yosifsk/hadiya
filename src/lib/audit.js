/* سجل التدقيق — كل إجراء حسّاس يُسجَّل مع الفاعل والوقت وقبل/بعد.
   يقرأ من قاعدة البيانات فقط (لا يُعدَّل ولا يُحذف من الواجهة). */

const { q, run } = require('../db');

function logAction({ actor, action, target = '', before = null, after = null, ip = '', note = '' }) {
  const serialize = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.slice(0, 4000);
    try {
      return JSON.stringify(value).slice(0, 4000);
    } catch {
      return String(value).slice(0, 4000);
    }
  };

  const info = run(
    `INSERT INTO audit_log (actor, action, target, before, after, ip, note)
     VALUES (?,?,?,?,?,?,?)`,
    String(actor || 'unknown').slice(0, 80),
    String(action).slice(0, 80),
    String(target || '').slice(0, 200),
    serialize(before),
    serialize(after),
    String(ip || '').slice(0, 60),
    String(note || '').slice(0, 500)
  );
  return info.lastInsertRowid;
}

function listActions({ limit = 100, action = '' } = {}) {
  if (action) {
    return q('SELECT * FROM audit_log WHERE action = ? ORDER BY id DESC LIMIT ?', action, Number(limit));
  }
  return q('SELECT * FROM audit_log ORDER BY id DESC LIMIT ?', Number(limit));
}

function countActions() {
  const row = q('SELECT COUNT(*) AS n FROM audit_log')[0];
  return row ? row.n : 0;
}

module.exports = { logAction, listActions, countActions };
