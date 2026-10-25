const { createHandler } = require('./_lib/app');
const { getDb } = require('./_lib/db');

// Barcha /api/* so'rovlari (vercel.json rewrite orqali) shu bitta serverless funksiyaga keladi.
module.exports = createHandler({ getDb });
