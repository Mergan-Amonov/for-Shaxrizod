const crypto = require('node:crypto');

// Telegram bot orqali kirish: sayt havola beradi, bot telefon raqamini so'raydi va bitta raqam ko'rsatadi,
// foydalanuvchi saytdagi uchta raqamdan mosini bosadi.

const LOGIN_TTL_MIN = 10;

function botToken() {
  return process.env.TELEGRAM_BOT_TOKEN || '';
}

function botUsername() {
  return (process.env.TELEGRAM_BOT_USERNAME || '').trim().replace(/^@/, '');
}

function enabled() {
  return Boolean(botToken() && botUsername());
}

async function tgApi(method, payload) {
  const res = await fetch(`https://api.telegram.org/bot${botToken()}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) throw new Error(`Telegram ${method}: ${data.description || res.status}`);
  return data.result;
}

// Webhook so'rovlari haqiqatan Telegramdan kelganini tekshirish uchun (X-Telegram-Bot-Api-Secret-Token).
function webhookSecret() {
  return crypto.createHash('sha256').update('webhook:' + botToken()).digest('hex');
}

// Har bir ishga tushgan nusxa webhookni bir marta o'rnatadi (setWebhook takroriy chaqiruvga chidamli).
let webhookPromise = null;
function ensureWebhook(baseUrl) {
  if (!webhookPromise) {
    webhookPromise = tgApi('setWebhook', {
      url: `${baseUrl}/api/telegram/webhook`,
      secret_token: webhookSecret(),
      allowed_updates: ['message'],
    }).catch((err) => {
      webhookPromise = null;
      throw err;
    });
  }
  return webhookPromise;
}

// To'g'ri raqam va saytda ko'rsatiladigan uchta turli ikki xonali raqam (aralash tartibda).
function codeOptions() {
  const set = new Set();
  while (set.size < 3) set.add(crypto.randomInt(10, 100));
  const options = [...set];
  const code = options[0];
  for (let i = options.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { code, options };
}

// Telefonlarni solishtirish uchun oxirgi 9 raqam (+998 va bo'shliqlarsiz).
function phoneKey(phone) {
  return String(phone || '').replace(/\D/g, '').slice(-9);
}

// Bot xabarlari saytda tanlangan tilda.
const TEXTS = {
  hello: {
    uz: 'Assalomu alaykum! NAQSH saytiga kirish uchun pastdagi tugma orqali telefon raqamingizni yuboring.',
    ru: 'Здравствуйте! Чтобы войти на сайт NAQSH, отправьте свой номер телефона кнопкой ниже.',
    en: 'Hello! To sign in to the NAQSH website, share your phone number using the button below.',
  },
  button: { uz: '📱 Telefon raqamni yuborish', ru: '📱 Отправить номер телефона', en: '📱 Share phone number' },
  expired: {
    uz: 'Havola eskirgan. Saytda «Telegram orqali kirish» tugmasini qaytadan bosing.',
    ru: 'Ссылка устарела. Нажмите «Войти через Telegram» на сайте ещё раз.',
    en: 'This link has expired. Press “Sign in with Telegram” on the website again.',
  },
  ownNumber: {
    uz: "Iltimos, pastdagi tugma orqali o'zingizning raqamingizni yuboring.",
    ru: 'Пожалуйста, отправьте свой собственный номер кнопкой ниже.',
    en: 'Please share your own number using the button below.',
  },
  notFound: {
    uz: "Kirish so'rovi topilmadi yoki eskirgan. Saytda «Telegram orqali kirish» tugmasini qaytadan bosing.",
    ru: 'Запрос на вход не найден или устарел. Нажмите «Войти через Telegram» на сайте ещё раз.',
    en: 'Sign-in request not found or expired. Press “Sign in with Telegram” on the website again.',
  },
  code: { uz: 'Saytda shu raqamni bosing:', ru: 'Нажмите на сайте это число:', en: 'Tap this number on the website:' },
  idle: {
    uz: "Saytga kirish uchun saytdagi «Telegram orqali kirish» tugmasini bosing.",
    ru: 'Чтобы войти, нажмите «Войти через Telegram» на сайте.',
    en: 'To sign in, press “Sign in with Telegram” on the website.',
  },
  wrong: {
    uz: "❌ Saytda noto'g'ri raqam tanlandi. Kirish uchun saytda qaytadan urinib ko'ring.",
    ru: '❌ На сайте выбрано неверное число. Попробуйте войти ещё раз.',
    en: '❌ The wrong number was chosen on the website. Please try signing in again.',
  },
  success: { uz: '✅ Saytga kirdingiz.', ru: '✅ Вы вошли на сайт.', en: '✅ You are signed in.' },
  register: {
    uz: "✅ Raqam tasdiqlandi. Saytda ro'yxatdan o'tishni yakunlang.",
    ru: '✅ Номер подтверждён. Завершите регистрацию на сайте.',
    en: '✅ Number confirmed. Please finish registration on the website.',
  },
};
function text(key, lang) {
  const t = TEXTS[key];
  return t[lang] || t.uz;
}

module.exports = { LOGIN_TTL_MIN, botToken, botUsername, enabled, tgApi, webhookSecret, ensureWebhook, codeOptions, phoneKey, text };
