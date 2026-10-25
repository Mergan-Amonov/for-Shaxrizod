const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.TELEGRAM_BOT_TOKEN = '123:test-token';
process.env.TELEGRAM_BOT_USERNAME = '@naqsh_test_bot';
delete process.env.PUBLIC_URL;
delete process.env.VERCEL_PROJECT_PRODUCTION_URL;

const { createDb } = require('../api/_lib/db');
const { createHandler } = require('../api/_lib/app');
const { webhookSecret } = require('../api/_lib/telegram');

// Testlar alohida Postgres bazasini talab qiladi; u har safar tozalanadi.
// Masalan: TEST_DATABASE_URL=postgres://postgres:test@localhost:55432/postgres npm test
const url = process.env.TEST_DATABASE_URL;
const skip = url ? false : 'TEST_DATABASE_URL berilmagan';

let server;
let base;
let db;
const realFetch = globalThis.fetch;

before(async () => {
  if (skip) return;
  db = createDb(url);
  await db.run('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await db.ready();
  server = http.createServer(createHandler({ getDb: () => db })).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (skip) return;
  server.close();
  await db.end();
});

// Cookie ni eslab qoladigan oddiy brauzer; POST lar sayt kabi JSON va shu domendan.
function client() {
  let cookie = '';
  async function request(method, path, body, headers = {}) {
    const res = await realFetch(base + path, {
      method,
      headers: {
        ...(cookie ? { cookie } : {}),
        ...(body !== undefined ? { 'content-type': 'application/json', origin: base } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const text = await res.text();
    return { status: res.status, json: text ? JSON.parse(text) : null };
  }
  return { get: (p) => request('GET', p), post: (p, b = {}, h) => request('POST', p, b, h) };
}

test('Telegram bot orqali kirish: telefon → uchta raqamdan mosini tanlash', { skip }, async () => {
  // Telegram Bot API chaqiruvlari tarmoqqa chiqmaydi, yozib olinadi.
  const sent = [];
  globalThis.fetch = async (u, opts) => {
    if (String(u).startsWith('https://api.telegram.org/')) {
      sent.push({ method: String(u).split('/').pop(), body: JSON.parse(opts.body) });
      return new Response(JSON.stringify({ ok: true, result: true }));
    }
    return realFetch(u, opts);
  };
  const hook = (message, secret = webhookSecret()) => realFetch(base + '/api/telegram/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': secret },
    body: JSON.stringify({ update_id: 1, message }),
  });
  // Saytda "Telegram orqali kirish" → botda /start va telefon → bot ko'rsatgan raqam va saytdagi variantlar.
  async function begin(c, tgId, phone, lang = 'uz') {
    let r = await c.post('/api/auth/telegram/start', { lang });
    assert.equal(r.status, 200);
    assert.match(r.json.qrSvg, /^<svg/);
    r = await c.get('/api/auth/telegram/status');
    assert.equal(r.json.status, 'new');
    assert.equal(r.json.qrSvg, undefined);
    assert.match((await c.get('/api/auth/telegram/status?qr=1')).json.qrSvg, /^<svg/);
    assert.match(r.json.botLink, /^https:\/\/t\.me\/naqsh_test_bot\?start=/);
    const token = /\?start=([A-Za-z0-9_-]+)/.exec(r.json.botLink)[1];
    const from = { id: tgId, first_name: 'Shaxrizod', last_name: 'Karimov', username: 'shaxrizod' };
    await hook({ from, chat: { id: tgId }, text: `/start ${token}` });
    assert.equal(sent.at(-1).body.reply_markup.keyboard[0][0].request_contact, true);
    assert.equal((await c.get('/api/auth/telegram/status')).json.status, 'started');
    await hook({ from, chat: { id: tgId }, contact: { phone_number: phone, user_id: tgId } });
    const code = Number(/<b>(\d+)<\/b>/.exec(sent.at(-1).body.text)[1]);
    r = await c.get('/api/auth/telegram/status');
    assert.equal(r.json.status, 'contact');
    const shown = r.json.options;
    assert.equal(shown.length, 3);
    assert.equal(new Set(shown).size, 3);
    assert.ok(shown.includes(code));
    return { code, wrong: shown.find((n) => n !== code), from };
  }

  try {
    // Soxta webhook va boshqa saytdan kelgan POST rad etiladi
    assert.equal((await hook({ from: { id: 1 }, chat: { id: 1 }, text: '/start' }, 'soxta')).status, 401);
    assert.equal((await client().post('/api/auth/telegram/start', {}, { origin: 'https://evil.example' })).status, 403);

    // Telefoni bazada bor mehmon: to'g'ri raqam → kiradi va hisobi Telegramga ulanadi
    await db.run("INSERT INTO naqsh_users (full_name, phone, email) VALUES ('Telefonli Mehmon', '+998 90 777 88 99', 'tel@test.uz')");
    const c = client();
    let { code, wrong, from } = await begin(c, 5001, '998907778899', 'ru');
    assert.equal(sent.filter((x) => x.method === 'setWebhook').length, 1);
    assert.match(sent.find((x) => x.body.reply_markup && x.body.reply_markup.keyboard).body.text, /Здравствуйте/);
    // Boshqa odamning kontakti qabul qilinmaydi
    await hook({ from, chat: { id: 5001 }, contact: { phone_number: '998900000000', user_id: 777 } });
    assert.match(sent.at(-1).body.text, /o'zingizning raqamingizni/);
    let r = await c.post('/api/auth/telegram/confirm', { choice: code });
    assert.equal(r.json.result, 'login');
    assert.equal(r.json.user.name, 'Telefonli Mehmon');
    assert.equal((await c.get('/api/auth/me')).json.user.email, 'tel@test.uz');
    assert.equal((await db.one("SELECT telegram_id FROM naqsh_users WHERE email = 'tel@test.uz'")).telegram_id, 5001);
    assert.match(sent.at(-1).body.text, /✅/);
    await c.post('/api/auth/logout');
    assert.equal((await c.get('/api/auth/me')).json.user, null);

    // Noto'g'ri raqam → kirish bekor, qayta tanlab bo'lmaydi
    const bad = client();
    ({ code, wrong } = await begin(bad, 5001, '998907778899'));
    r = await bad.post('/api/auth/telegram/confirm', { choice: wrong });
    assert.equal(r.json.result, 'failed');
    assert.match(sent.at(-1).body.text, /❌/);
    r = await bad.post('/api/auth/telegram/confirm', { choice: code });
    assert.equal(r.json.result, 'expired');
    assert.equal((await bad.get('/api/auth/me')).json.user, null);

    // Hisobi yo'q odam → ro'yxatdan o'tish (ism va telefon to'ldirilgan, parolsiz) → keyin Telegram bilan kiradi
    const fresh = client();
    ({ code } = await begin(fresh, 6002, '+998 93 555 44 33'));
    r = await fresh.post('/api/auth/telegram/confirm', { choice: code });
    assert.equal(r.json.result, 'register');
    assert.deepEqual(r.json.pending, { name: 'Shaxrizod Karimov', phone: '+998935554433' });
    assert.deepEqual((await fresh.get('/api/auth/me')).json.pending, { name: 'Shaxrizod Karimov', phone: '+998935554433' });
    r = await fresh.post('/api/auth/register', { name: '', email: 'yomon' });
    assert.equal(r.status, 400);
    r = await fresh.post('/api/auth/register', { name: 'Shaxrizod Karimov', email: 'sh@test.uz', lang: 'uz' });
    assert.equal(r.status, 200);
    assert.equal(r.json.user.phone, '+998935554433');
    assert.equal((await db.one("SELECT telegram_id FROM naqsh_users WHERE email = 'sh@test.uz'")).telegram_id, 6002);
    await fresh.post('/api/auth/logout');
    ({ code } = await begin(fresh, 6002, '998935554433'));
    r = await fresh.post('/api/auth/telegram/confirm', { choice: code });
    assert.equal(r.json.result, 'login');
    assert.equal(r.json.user.name, 'Shaxrizod Karimov');

    // Ro'yxatdan o'tish Telegram tasdig'isiz mumkin emas
    assert.equal((await client().post('/api/auth/register', { name: 'X' })).status, 400);
  } finally {
    globalThis.fetch = realFetch;
  }
});
