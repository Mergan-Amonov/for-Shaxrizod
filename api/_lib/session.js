const crypto = require('node:crypto');

// Imzolangan cookie-sessiya: ma'lumot cookie ichida, HMAC bilan himoyalangan (server xotirasi kerak emas).

const COOKIE = 'naqsh_sid';
const MAX_AGE = 30 * 24 * 3600;

function secret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  // Alohida kalit berilmasa, bot tokenidan hosil qilinadi (u ham sir).
  return crypto.createHash('sha256').update('session:' + (process.env.TELEGRAM_BOT_TOKEN || 'dev-only')).digest('hex');
}

function sign(data) {
  return crypto.createHmac('sha256', secret()).update(data).digest('base64url');
}

function parseCookies(header) {
  const out = {};
  String(header || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function read(req) {
  const raw = parseCookies(req.headers.cookie)[COOKIE];
  if (!raw) return {};
  const [data, mac] = raw.split('.');
  if (!data || !mac) return {};
  const expected = sign(data);
  if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return {};
  try {
    const s = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    return s && typeof s === 'object' ? s : {};
  } catch {
    return {};
  }
}

function write(res, session, secure) {
  const data = Buffer.from(JSON.stringify(session)).toString('base64url');
  const parts = [`${COOKIE}=${data}.${sign(data)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${MAX_AGE}`];
  if (secure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

module.exports = { read, write };
