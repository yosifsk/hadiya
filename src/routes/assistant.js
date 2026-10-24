/* مسارات المساعد الذكي */

const express = require('express');
const assistant = require('../lib/assistant');
const { FAQ, CATEGORIES, SUGGESTED } = require('../lib/faq');
const { wrapRouter } = require('../lib/async');

const router = wrapRouter(express.Router());

/* تحديد اللغة من الطلب */
function langOf(req) {
  const explicit = String(req.query.lang || (req.body || {}).lang || '').toLowerCase();
  if (explicit.startsWith('en')) return 'en';
  if (explicit.startsWith('ar')) return 'ar';
  const cookie = (req.cookies || {}).hadba_lang;
  if (cookie === 'en') return 'en';
  return 'ar';
}

router.get('/suggestions', (req, res) => {
  const lang = langOf(req);
  const list = lang === 'en'
    ? FAQ.slice(0, 8).map(e => e.en.q).concat(SUGGESTED.slice(0, 4))
    : SUGGESTED;
  res.json({ ok: true, suggestions: [...new Set(list)].slice(0, 12) });
});

router.post('/ask', async (req, res) => {
  const question = String((req.body || {}).question || '').trim();
  if (!question) {
    return res.status(400).json({ ok: false, error: 'اكتب سؤالك' });
  }
  if (question.length > 500) {
    return res.status(400).json({ ok: false, error: 'السؤال طويل جدًا' });
  }
  const lang = langOf(req);
  const result = await assistant.answer(question, lang);
  res.json({ ok: true, ...result, lang });
});

router.get('/all', (req, res) => {
  const lang = langOf(req);
  res.json({
    ok: true,
    categories: CATEGORIES,
    items: FAQ.map(e => {
      const local = assistant.localize(e, lang);
      return { id: e.id, tags: e.tags, q: local.q, a: local.a };
    }),
  });
});

module.exports = router;
