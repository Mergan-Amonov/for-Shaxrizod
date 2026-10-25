const { Pool, types } = require('pg');

// BIGINT (telegram_id) son bo'lib qaytsin — Telegram ID lari 2^53 dan kichik.
types.setTypeParser(20, (v) => Number(v));

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE,
  full_name   TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  lang        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Telegram bot orqali kirish so'rovlari: sayt token beradi, bot telefonni oladi, foydalanuvchi raqamni tanlaydi.
CREATE TABLE IF NOT EXISTS telegram_logins (
  token       TEXT PRIMARY KEY,
  code        INTEGER NOT NULL,
  options     TEXT NOT NULL,
  lang        TEXT NOT NULL DEFAULT 'uz',
  telegram_id BIGINT,
  chat_id     BIGINT,
  name        TEXT,
  username    TEXT,
  phone       TEXT,
  status      TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'started', 'contact', 'done', 'failed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

function databaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
}

function createDb(connectionString) {
  const pool = new Pool({ connectionString, max: Number(process.env.PG_POOL_MAX) || 2 });
  let migrated = null;
  return {
    one: async (sql, params = []) => (await pool.query(sql, params)).rows[0] || null,
    all: async (sql, params = []) => (await pool.query(sql, params)).rows,
    run: async (sql, params = []) => { await pool.query(sql, params); },
    // Jadvallar birinchi so'rovda yaratiladi (har bir ishga tushgan nusxada bir marta).
    ready() {
      if (!migrated) migrated = pool.query(SCHEMA).catch((err) => { migrated = null; throw err; });
      return migrated;
    },
    end: () => pool.end(),
  };
}

let shared = null;
function getDb() {
  if (!shared && databaseUrl()) shared = createDb(databaseUrl());
  return shared;
}

module.exports = { createDb, getDb, databaseUrl };
