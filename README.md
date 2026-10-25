# NAQSH Heritage & Smart Hotel — website prototype

Static multilingual (uz / ru / en) frontend prototype: home, rooms, room detail, services, gallery, contacts, policies, booking flow (demo) and guest account (demo).

- No build step — plain HTML/CSS/JS. Deploy the repo root as a static site (Vercel: framework "Other").
- Content and prices: `assets/js/data.js`; UI translations: `assets/js/i18n.js`.
- Availability, payment and sign-in are **demo only**; PMS / Channel Manager, payment gateway and admin CMS come in the backend phase.
- Photos are temporary (Unsplash, Wikimedia Commons).

Local preview: `python -m http.server 8765` → http://localhost:8765
