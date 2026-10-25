# NAQSH Heritage & Smart Hotel — website prototype

Static multilingual (uz / ru / en) frontend prototype: home, rooms, room detail, services, gallery, contacts, policies, booking flow (demo) and guest account (demo).

- No build step — plain HTML/CSS/JS. Deploy the repo root as a static site (Vercel: framework "Other").
- Content and prices: `assets/js/data.js`; UI translations: `assets/js/i18n.js`.
- Availability, payment and sign-in are **demo only**; PMS / Channel Manager, payment gateway and admin CMS come in the backend phase.
- Photos are temporary (Unsplash, Wikimedia Commons).

Local preview: `python -m http.server 8765` → http://localhost:8765

## Telegram bot orqali kirish

Kabinet sahifasida «Telegram orqali kirish»: sayt botga havola beradi → bot telefon raqamini so'raydi va bitta raqam yuboradi → saytda uchta raqamdan mosi bosiladi. Hisob topilmasa — ism va telefon oldindan to'ldirilgan ro'yxatdan o'tish.

- Backend: `api/main.js` (Vercel serverless, barcha `/api/*` shu yerga), kod `api/_lib/`.
- Muhit o'zgaruvchilari: `DATABASE_URL` (Postgres), `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`; ixtiyoriy `SESSION_SECRET`, `PUBLIC_URL`. Tugma faqat ular berilganda ko'rinadi.
- Webhook birinchi «Telegram orqali kirish» bosilganda avtomatik o'rnatiladi (shu botda `getUpdates` ishlatayotgan boshqa dastur to'xtaydi).
- Test: `TEST_DATABASE_URL=postgres://postgres:test@localhost:55432/postgres npm test` (alohida test bazasi, u tozalanadi).
