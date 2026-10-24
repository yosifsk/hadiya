/* المساعد الذكي — يجيب من قاعدة المعرفة (سريع، دقيق، بلا كلفة).
   اختياريًا: إن توفّر LLM_API_KEY في .env، يُستخدم كطبقة ثانية مع تمرير
   قاعدة المعرفة كسياق — والإجابة تُعاد مع روابط مصادر. */

const { FAQ, CATEGORIES, SUGGESTED } = require('./faq');

const AR = 'ar';

/* توحيد الوصول للنص حسب اللغة: العربي في الأعلى، والإنجليزي في en */
function localize(entry, lang = AR) {
  if (lang === 'en') return entry.en || { q: entry.q, a: entry.a };
  return { q: entry.q, a: entry.a };
}

/* تطبيع النص العربي للبحث (باستخدام unicode escapes لتفادي مشاكل الترميز) */
function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '')        // تشكيل
    .replace(/[\u0623\u0625\u0622\u0627]/g, '\u0627') // إ أ آ ا
    .replace(/[\u0649\u064A]/g, '\u064A')            // ى ي
    .replace(/[\u0624\u0626]/g, '\u0621')            // ؤ ئ
    .replace(/\u0629/g, '\u0647')                    // ة ه
    .replace(/[\u061F\u0021.,\u060C\u061B:()"'\-_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP_WORDS = new Set([
  '\u0645\u0646', '\u0627\u0644\u0649', '\u0639\u0644\u0649', '\u0641\u064A', '\u0639\u0646',
  '\u0645\u0627', '\u0647\u0644', '\u0643\u064A\u0641', '\u0627\u0648', '\u062B\u0645', '\u0643\u0644',
  '\u0647\u0630\u0627', '\u0647\u0630\u0647', '\u0627\u0644\u062A\u064A', '\u0643\u0627\u0646', '\u064A\u0643\u0648\u0646',
  '\u0623\u0646\u0627', '\u0623\u0646\u062A', '\u0647\u0648', '\u0647\u064A', '\u0645\u0639', '\u0644\u0648',
  '\u0627\u0646', '\u0644\u0627', '\u0646\u0639\u0645', '\u0633\u0645', '\u0644\u064A',
  // عامي شامي
  '\u0627\u064A\u0634', '\u0648\u0634', '\u0634\u0646\u0648', '\u0634\u0644\u0648\u0646', '\u0643\u064A\u0641\u0647',
  '\u0644\u064A\u0634', '\u0648\u064A\u0646', '\u0645\u062A\u064A', '\u0645\u064A\u0646', '\u0639\u0644\u064A', '\u0628\u0643\u0645',
  '\u0627\u0644\u0644\u064A', '\u0647\u0627\u062F', '\u0647\u0630\u064A', '\u0628\u062A\u0627\u0639', '\u0639\u0646\u062F\u064A',
  '\u0627\u0628\u064A', '\u0627\u0648\u062F', '\u0646\u0641\u0633', '\u063A\u064A\u0631', '\u0628\u0633', '\u062C\u062F\u0627',
  '\u0643\u062A\u064A\u0631', '\u0642\u0644\u064A\u0644', '\u062C\u062F\u064A\u062F', '\u0642\u062F\u064A\u0645',
  'the', 'a', 'an', 'is', 'are', 'to', 'of', 'and', 'in', 'on', 'for', 'how', 'what', 'can', 'i',
  'do', 'my', 'me', 'it', 'that', 'this', 'with',
]);

/* إزالة أدوات التعريف العربية لتحسين المطابقة ("الشبكات" = "شبكات") */
function stem(word) {
  const w = String(word || '');
  if (w.length >= 5 && w.startsWith('ال')) return w.slice(2);
  return w;
}

function tokenize(text) {
  return normalize(text)
    .split(' ')
    .filter(t => t.length > 1 && !STOP_WORDS.has(t))
    .map(stem);
}

/* درجة تطابق بين سؤال المستخدم وبند المعرفة
   - tokens: كلمات السؤال الأصلية (وزن كامل)
   - expanded: كلمات المرادفات (وزن مخفّض) حتى لا تُغرق التوسّعات الترتيب */
function scoreEntry(entry, tokens, lang, expanded = []) {
  if (!tokens.length) return 0;
  const local = localize(entry, lang);
  const q = normalize(local.q);
  const a = normalize(local.a);
  const keywords = (entry.kw || []).map(k => stem(normalize(k)));

  let score = 0;

  for (const token of tokens) {
    for (const kw of keywords) {
      if (kw === token) score += 6;
      else if (kw.includes(token) && token.length >= 3) score += 3;
      else if (token.includes(kw) && kw.length >= 4) score += 2;
    }
  }
  // المرادفات: نصف الوزن
  for (const token of expanded) {
    if (tokens.includes(token)) continue;
    for (const kw of keywords) {
      if (kw === token) score += 3;
      else if (kw.includes(token) && token.length >= 4) score += 1.5;
    }
  }

  const qTokens = new Set(q.split(' ').map(stem));
  const aTokens = new Set(a.split(' ').map(stem));
  for (const token of tokens) {
    if (qTokens.has(token)) score += 4;
    else if (aTokens.has(token)) score += 1;
  }

  const joined = normalize(tokens.join(' '));
  if (joined && q.includes(joined)) score += 12;

  return score;
}

/* مرادفات وتوسعات تُحسّن المطابقة (عامي + مصطلحات) */
const SYNONYMS = {
  'فلوس': ['مال', 'يصل', 'تذهب', 'ذهب'],
  'استرجاع': ['استرداد', 'ارجاع'],
  'شو': [], 'ايش': [], 'وش': [],
  'دفع': ['ادفع', 'تسديد', 'تبرع'],
  'مصاريف': ['رسوم', 'عمولة', 'fee', 'fees'],
  'ضريبه': ['ضريبة', 'ضرائب', 'tax'],
  'امن': ['احتيال', 'نصب', 'scam', 'safe'],
  'مستفيد': ['الجهة المستفيدة', 'beneficiary'],
  'منظم': ['منظم الحملة', 'organizer'],
  'ايميل': ['بريد', 'email'],
  'بينك': ['بنك', 'bank'],
  'كرد': ['كارد', 'فيزا', 'card', 'credit'],
};

function expandTokens(tokens) {
  const out = new Set(tokens);
  for (const token of tokens) {
    const extra = SYNONYMS[token];
    if (extra) for (const e of extra) out.add(stem(normalize(e)));
    for (const [key, values] of Object.entries(SYNONYMS)) {
      if (key.length < 4 || !values.length) continue;
      if (token !== key && token.startsWith(key)) {
        for (const e of values) out.add(stem(normalize(e)));
      }
    }
  }
  return [...out];
}

/* نوايا خاصة تُجاب قبل المطابقة العامة */
function detectIntent(question, lang) {
  const q = normalize(question);
  const words = q.split(' ').filter(Boolean);

  const isGreeting = words.some(w => ['مرحبا', 'السلام', 'هلا', 'اهلا', 'هاي', 'صباح', 'مساء', 'hi', 'hello', 'hey'].includes(w));
  const isIdentity = q.includes('من انت') || q.includes('شو بتعرف') || q.includes('شو تعرف')
    || q.includes('ماذا تعرف') || q.includes('who are you') || q.includes('what can you do');
  const isThanks = words.some(w => ['شكرا', 'شكر', 'مشكور', 'thanks', 'thank'].includes(w));

  if (isGreeting) {
    return lang === 'en'
      ? {
        answer: 'Hello! I can answer questions about donations, fees, refunds, networks, safety and campaigns. '
          + 'Ask me anything — I answer strictly from the platform documentation.',
        mode: 'intent',
      }
      : {
        answer: 'أهلًا! أقدر أجاوب عن التبرّع والرسوم والاسترداد والشبكات والأمان وإنشاء الحملات. '
          + 'اسألني ما شئت — أجيب من توثيق المنصة نفسه.',
        mode: 'intent',
      };
  }
  if (isIdentity) {
    return lang === 'en'
      ? {
        answer: 'I am the support assistant of HADIYA — a crypto donation platform. I answer from the '
          + 'platform knowledge base (fees, refunds, networks, safety, campaigns, privacy). '
          + 'I never invent an answer: if it is not documented, I point you to support.',
        mode: 'intent',
      }
      : {
        answer: 'أنا مساعد دعم منصة **هدية** لتبرّع بالعملات الرقمية. أجيب من قاعدة معرفة المنصة '
          + '(الرسوم، الاسترداد، الشبكات، الأمان، الحملات، الخصوصية). '
          + 'لا أخترع جوابًا: إن لم يكن موثّقًا فوجّهك للدعم.',
        mode: 'intent',
      };
  }
  if (isThanks) {
    return lang === 'en'
      ? { answer: 'You are welcome! If anything else comes up, ask me anytime.', mode: 'intent' }
      : { answer: 'العفو! إن احتجت أي شيء آخر اسألني في أي وقت.', mode: 'intent' };
  }
  return null;
}

function bestMatches(question, lang = AR, limit = 3) {
  const raw = tokenize(question);
  if (!raw.length) return [];
  const tokens = raw;
  const expanded = expandTokens(raw);
  const scored = FAQ
    .map(entry => ({ entry, score: scoreEntry(entry, tokens, lang, expanded) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const seen = new Set();
  const out = [];
  for (const s of scored) {
    if (seen.has(s.entry.id)) continue;
    seen.add(s.entry.id);
    out.push(s);
    if (out.length >= limit) break;
  }
  return out;
}

/* رد احتياطي بدون أي LLM — يعرض أقرب المواضيع بدل رسالة عامة */
function fallbackAnswer(lang = AR, hints = []) {
  const topicLinks = hints.slice(0, 4).map(h => `- ${h}`).join('\n');
  if (lang === 'en') {
    return {
      answer: 'I could not find a confident answer in the knowledge base.'
        + (topicLinks ? `\n\nClosest topics:\n${topicLinks}` : '')
        + '\n\nYou can browse the full FAQ or contact support directly.',
      sources: [],
      suggestions: SUGGESTED.slice(0, 4),
    };
  }
  return {
    answer: 'لم أجد جوابًا مطمئنًا في قاعدة المعرفة.'
      + (topicLinks ? `\n\nأقرب المواضيع:\n${topicLinks}` : '')
      + '\n\nتصفّح الأسئلة الشائعة كاملة، أو تواصل مع الدعم مباشرة وسنجيبك بالتفصيل.',
    sources: [],
    suggestions: SUGGESTED.slice(0, 4),
  };
}

/* طبقة LLM اختيارية (OpenAI-compatible) */
async function askLlm(question, context, lang) {
  const apiKey = (process.env.LLM_API_KEY || '').trim();
  if (!apiKey) return null;
  const base = (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = (process.env.LLM_MODEL || 'gpt-4o-mini').trim();

  const system = lang === 'en'
    ? 'You are the support assistant of a crypto donation platform. Answer ONLY from the provided context. '
      + 'If the context does not contain the answer, say you do not know and point to support. '
      + 'Never invent fees, refunds, addresses, or policy. Be concise (max 90 words).'
    : 'أنت مساعد دعم منصة تبرّع بالعملات الرقمية. أجب من السياق المعطى فقط. '
      + 'إذا لم يوجد الجواب في السياق، قل ذلك ووجّه للدعم. لا تخترع أي رسوم أو استرجاع أو عناوين. '
      + 'أجب باختصار (٩٠ كلمة كحد أقصى).';

  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: `CONTEXT:\n${context}\n\nQUESTION: ${question}` },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    return typeof text === 'string' && text.trim() ? text.trim() : null;
  } catch {
    return null;
  }
}

function buildContext(matches, lang) {
  return matches
    .map(m => {
      const local = localize(m.entry, lang);
      return `- Q: ${local.q}\n  A: ${local.a}`;
    })
    .join('\n');
}

/**
 * سؤال → جواب
 * @returns {Promise<{answer, sources, suggestions, confidence, mode}>}
 */
async function answer(question, lang = AR) {
  const text = String(question || '').trim();
  if (!text) return { ...fallbackAnswer(lang), confidence: 0, mode: 'empty' };

  // نوايا خاصة (تحية، تعريف، شكر) قبل المطابقة
  const intent = detectIntent(text, lang);
  if (intent) {
    return {
      ...intent,
      sources: [],
      suggestions: SUGGESTED.slice(0, 4),
      confidence: 1,
    };
  }

  const matches = bestMatches(text, lang, 3);

  if (!matches.length) {
    const llm = await askLlm(text, buildContext(FAQ.slice(0, 8).map(e => ({ entry: e })), lang), lang);
    if (llm) {
      return {
        answer: llm,
        sources: FAQ.slice(0, 8).map(e => ({
          id: e.id, q: localize(e, lang).q, url: `/faq#${e.id}`,
        })),
        suggestions: SUGGESTED.slice(0, 4),
        confidence: 0.4,
        mode: 'llm',
      };
    }
    // لا مطابقة: نعرض أقرب المواضيع من قاعدة المعرفة
    const hints = FAQ.slice(0, 5).map(e => localize(e, lang).q);
    return { ...fallbackAnswer(lang, hints), confidence: 0, mode: 'kb-miss' };
  }

  const top = matches[0];
  const confidence = Math.min(1, top.score / 22);

  if (confidence >= 0.35) {
    return {
      answer: localize(top.entry, lang).a,
      sources: matches.map(m => ({
        id: m.entry.id, q: localize(m.entry, lang).q, url: `/faq#${m.entry.id}`,
      })),
      suggestions: matches.slice(1).map(m => localize(m.entry, lang).q).concat(SUGGESTED.slice(0, 2)).slice(0, 4),
      confidence: Number(confidence.toFixed(2)),
      mode: 'kb',
    };
  }

  const llm = await askLlm(text, buildContext(matches, lang), lang);
  if (llm) {
    return {
      answer: llm,
      sources: matches.map(m => ({
        id: m.entry.id, q: localize(m.entry, lang).q, url: `/faq#${m.entry.id}`,
      })),
      suggestions: SUGGESTED.slice(0, 4),
      confidence: Number(confidence.toFixed(2)),
      mode: 'llm',
    };
  }

  const topAnswer = localize(top.entry, lang).a;
  return {
    answer: `${topAnswer}\n\n${lang === 'en'
      ? 'If this does not answer your question, contact support.'
      : 'إن لم يكن هذا جواب سؤالك بالضبط، تواصل مع الدعم.'}`,
    sources: matches.map(m => ({
      id: m.entry.id, q: localize(m.entry, lang).q, url: `/faq#${m.entry.id}`,
    })),
    suggestions: matches.slice(1).map(m => localize(m.entry, lang).q).slice(0, 4),
    confidence: Number(confidence.toFixed(2)),
    mode: 'kb-weak',
  };
}

module.exports = {
  answer,
  bestMatches,
  tokenize,
  localize,
  detectIntent,
  expandTokens,
  SYNONYMS,
  SUGGESTED,
  CATEGORIES,
  FAQ,
};
