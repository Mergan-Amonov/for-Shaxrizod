const crypto = require('node:crypto');
const tg = require('./telegram');
const session = require('./session');

const FRESH = `created_at > now() - interval '${tg.LOGIN_TTL_MIN} minutes'`;
const LANGS = ['uz', 'ru', 'en'];

// Bot xabarlari muvaffaqiyatsiz bo'lsa ham saytdagi jarayon to'xtamasin.
function notify(chatId, text, extra = {}) {
  if (!chatId) return Promise.resolve();
  return tg.tgApi('sendMessage', { chat_id: chatId, text, ...extra })
    .catch((err) => console.error(err.message));
}

function host(req) {
  return String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
}

function isHttps(req) {
  return String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
}

function baseUrl(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return `${isHttps(req) ? 'https' : 'http'}://${host(req)}`;
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'no-store');
  if (body === undefined) return res.end();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  // Vercel body ni o'zi o'qib qo'yadi; oddiy Node serverida (testlar) oqimdan o'qiymiz.
  if (req.body !== undefined) {
    if (Buffer.isBuffer(req.body) || typeof req.body === 'string') {
      try { return JSON.parse(String(req.body) || '{}'); } catch { return null; }
    }
    return req.body || {};
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 100 * 1024) return null;
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { return null; }
}

// CSRF: saytdagi POST so'rovlar faqat shu domendan va faqat JSON bo'lib keladi
// (boshqa saytdan JSON yuborish brauzerda preflight talab qiladi va bloklanadi).
function sameOrigin(req) {
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) return false;
  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin') return false;
  const origin = req.headers.origin;
  if (origin) {
    try { if (new URL(origin).host !== host(req)) return false; } catch { return false; }
  }
  return true;
}

function publicUser(u) {
  return u && { id: u.id, name: u.full_name, phone: u.phone, email: u.email || '', lang: u.lang || '' };
}

function createHandler({ getDb }) {
  // Telegram webhooki: sessiya va CSRF tekshiruvisiz, o'z sirli sarlavhasi bilan.
  async function webhook(req, res) {
    const secret = String(req.headers['x-telegram-bot-api-secret-token'] || '');
    const expected = tg.webhookSecret();
    if (!tg.botToken() || secret.length !== expected.length ||
        !crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(expected))) {
      return send(res, 401);
    }
    const db = getDb();
    if (!db) return send(res, 503);
    await db.ready();
    const update = await readJson(req);
    const msg = update && update.message;
    if (!msg || !msg.from || !msg.chat) return send(res, 200);
    const chatId = msg.chat.id;
    const start = /^\/start(?:\s+([A-Za-z0-9_-]{16,64}))?$/.exec((msg.text || '').trim());

    if (start && start[1]) {
      const name = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ').slice(0, 120);
      const row = await db.one(`UPDATE telegram_logins
        SET telegram_id = $2, chat_id = $3, name = $4, username = $5, status = 'started'
        WHERE token = $1 AND status IN ('new', 'started') AND ${FRESH} RETURNING lang`,
      [start[1], msg.from.id, chatId, name, msg.from.username || null]);
      if (!row) {
        await notify(chatId, tg.text('expired'));
      } else {
        await notify(chatId, tg.text('hello', row.lang), {
          reply_markup: {
            keyboard: [[{ text: tg.text('button', row.lang), request_contact: true }]],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        });
      }
    } else if (msg.contact) {
      if (msg.contact.user_id !== msg.from.id) {
        await notify(chatId, tg.text('ownNumber'));
      } else {
        const row = await db.one(`UPDATE telegram_logins SET phone = $2, status = 'contact'
          WHERE token = (SELECT token FROM telegram_logins
                         WHERE telegram_id = $1 AND status = 'started' AND ${FRESH}
                         ORDER BY created_at DESC LIMIT 1)
          RETURNING code, lang`, [msg.from.id, String(msg.contact.phone_number || '').slice(0, 40)]);
        if (!row) {
          await notify(chatId, tg.text('notFound'), { reply_markup: { remove_keyboard: true } });
        } else {
          await notify(chatId, `${tg.text('code', row.lang)}\n\n<b>${row.code}</b>`,
            { parse_mode: 'HTML', reply_markup: { remove_keyboard: true } });
        }
      }
    } else {
      await notify(chatId, tg.text('idle'));
    }
    send(res, 200);
  }

  // Saytdagi qadamlar: so'rov yaratish → kutish (bot havolasi) → uchta raqamdan birini tanlash.
  async function site(req, res, path) {
    const db = getDb();
    const sess = session.read(req);
    const save = () => session.write(res, sess, isHttps(req));
    const current = async () => (sess.tgLogin && db
      ? db.one(`SELECT * FROM telegram_logins WHERE token = $1 AND ${FRESH}`, [sess.tgLogin])
      : null);
    if (db) await db.ready();

    if (req.method === 'GET' && path === '/api/auth/me') {
      const user = sess.userId && db ? await db.one('SELECT * FROM users WHERE id = $1', [sess.userId]) : null;
      return send(res, 200, {
        telegram: tg.enabled() && Boolean(db),
        user: publicUser(user),
        pending: sess.tg ? { name: sess.tg.name, phone: sess.tg.phone } : null,
        tgLogin: Boolean(sess.tgLogin),
      });
    }

    if (req.method === 'GET' && path === '/api/auth/telegram/status') {
      const row = await current();
      const status = row ? row.status : 'expired';
      const body = { status };
      if (status === 'new' || status === 'started') body.botLink = `https://t.me/${tg.botUsername()}?start=${row.token}`;
      if (status === 'contact') body.options = row.options.split(',').map(Number);
      return send(res, 200, body);
    }

    if (req.method !== 'POST') return send(res, 404, { error: 'not_found' });
    if (!sameOrigin(req)) return send(res, 403, { error: 'csrf' });
    const body = (await readJson(req)) || {};

    if (path === '/api/auth/logout') {
      session.write(res, {}, isHttps(req));
      return send(res, 200, { ok: true });
    }

    if (path === '/api/auth/telegram/start') {
      if (!tg.enabled() || !db) return send(res, 404, { error: 'disabled' });
      try {
        await tg.ensureWebhook(baseUrl(req));
      } catch (err) {
        console.error(err.message);
        return send(res, 502, { error: 'telegram' });
      }
      await db.run("DELETE FROM telegram_logins WHERE created_at < now() - interval '1 day'");
      const token = crypto.randomBytes(18).toString('base64url');
      const { code, options } = tg.codeOptions();
      const lang = LANGS.includes(body.lang) ? body.lang : 'uz';
      await db.run('INSERT INTO telegram_logins (token, code, options, lang) VALUES ($1, $2, $3, $4)',
        [token, code, options.join(','), lang]);
      sess.tgLogin = token;
      save();
      return send(res, 200, { ok: true, botLink: `https://t.me/${tg.botUsername()}?start=${token}` });
    }

    if (path === '/api/auth/telegram/confirm') {
      const row = await current();
      sess.tgLogin = null;
      if (!row || row.status !== 'contact') {
        save();
        return send(res, 200, { result: 'expired' });
      }
      const ok = Number.parseInt(body.choice, 10) === row.code;
      const done = await db.one("UPDATE telegram_logins SET status = $2 WHERE token = $1 AND status = 'contact' RETURNING token",
        [row.token, ok ? 'done' : 'failed']);
      if (!ok || !done) {
        save();
        await notify(row.chat_id, tg.text('wrong', row.lang));
        return send(res, 200, { result: 'failed' });
      }

      let user = await db.one('SELECT * FROM users WHERE telegram_id = $1', [row.telegram_id]);
      const key = tg.phoneKey(row.phone);
      if (!user && key.length === 9) {
        // Telegram tasdiqlagan raqam bilan bitta hisob mos kelsa, hisob shu Telegramga ulanadi.
        const matches = await db.all(`SELECT * FROM users
          WHERE telegram_id IS NULL AND right(regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), 9) = $1`, [key]);
        if (matches.length === 1) {
          user = await db.one('UPDATE users SET telegram_id = $1 WHERE id = $2 RETURNING *', [row.telegram_id, matches[0].id]);
        }
      }

      if (user) {
        await notify(row.chat_id, tg.text('success', row.lang));
        sess.tg = null;
        sess.userId = user.id;
        save();
        return send(res, 200, { result: 'login', user: publicUser(user) });
      }
      await notify(row.chat_id, tg.text('register', row.lang));
      sess.tg = {
        id: Number(row.telegram_id),
        name: row.name || '',
        username: row.username,
        phone: '+' + String(row.phone).replace(/\D/g, ''),
      };
      save();
      return send(res, 200, { result: 'register', pending: { name: sess.tg.name, phone: sess.tg.phone } });
    }

    // Telegram tasdiqlagan, lekin hisobi yo'q mehmon: ism va telefon oldindan to'ldirilgan, parol shart emas.
    if (path === '/api/auth/register') {
      if (!sess.tg || !db) return send(res, 400, { error: 'no_telegram' });
      const name = String(body.name || '').trim().slice(0, 120);
      const email = String(body.email || '').trim().slice(0, 160);
      const errors = {};
      if (!name) errors.name = 'required';
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'invalid';
      if (Object.keys(errors).length) return send(res, 400, { error: 'invalid', fields: errors });
      const lang = LANGS.includes(body.lang) ? body.lang : null;
      let user = await db.one(`INSERT INTO users (telegram_id, full_name, phone, email, lang) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (telegram_id) DO NOTHING RETURNING *`, [sess.tg.id, name, sess.tg.phone, email || null, lang]);
      if (!user) user = await db.one('SELECT * FROM users WHERE telegram_id = $1', [sess.tg.id]);
      sess.tg = null;
      sess.userId = user.id;
      save();
      return send(res, 200, { user: publicUser(user) });
    }

    return send(res, 404, { error: 'not_found' });
  }

  return async function handler(req, res) {
    try {
      const url = new URL(req.url, 'http://localhost');
      // vercel.json barcha /api/* so'rovlarini shu funksiyaga ?route=... bilan yo'naltiradi.
      const route = url.searchParams.get('route');
      const path = route ? '/api/' + route.replace(/^\/+|\/+$/g, '') : url.pathname.replace(/\/+$/, '');
      if (path === '/api/telegram/webhook' && req.method === 'POST') return await webhook(req, res);
      if (path.startsWith('/api/auth/')) return await site(req, res, path);
      return send(res, 404, { error: 'not_found' });
    } catch (err) {
      console.error(err);
      if (!res.headersSent) send(res, 500, { error: 'server' });
      else res.end();
    }
  };
}

module.exports = { createHandler };
