/* NAQSH — content data. In production this comes from the CMS / PMS API. */
window.NAQSH_DATA = {
  vatRate: 0.12,
  contact: {
    phone: '+998 71 200 36 36',
    phoneHref: 'tel:+998712003636',
    email: 'reservations@naqsh-hotel.uz',
    whatsapp: 'https://wa.me/998712003636',
    telegram: 'https://t.me/naqsh_hotel',
    instagram: 'https://instagram.com/naqsh_hotel',
    address: { uz: 'Toshkent sh., Mirobod tumani, Amir Temur ko‘chasi (manzil aniqlashtiriladi)', ru: 'г. Ташкент, Мирабадский район, ул. Амира Темура (адрес уточняется)', en: 'Amir Temur Street, Mirabad District, Tashkent (address to be confirmed)' },
    mapEmbed: 'https://www.openstreetmap.org/export/embed.html?bbox=69.2655%2C41.2955%2C69.2955%2C41.3135&layer=mapnik&marker=41.3045%2C69.2805',
    mapLink: 'https://www.openstreetmap.org/?mlat=41.3045&mlon=69.2805#map=16/41.3045/69.2805'
  },

  // Prices are per night, VAT (12%) included, breakfast included.
  rooms: [
    {
      id: 'standard', count: 20, price: 880000, area: '18–22', guests: 2, maxChildren: 1,
      img: 'std-1', gallery: ['std-1', 'std-2', 'std-3', 'corridor'],
      name: { uz: 'Standard', ru: 'Стандарт', en: 'Standard' },
      bed: { uz: 'Queen yoki ikki alohida karavot', ru: 'Queen или две раздельные кровати', en: 'Queen or twin beds' },
      short: {
        uz: 'Sokin ranglar, ergonomik ish stoli va aqlli boshqaruvga ega qulay xona — qisqa safar va ish uchun ideal.',
        ru: 'Спокойные тона, эргономичный рабочий стол и умное управление — идеально для коротких поездок и работы.',
        en: 'Calm tones, an ergonomic desk and smart controls — ideal for short stays and business trips.'
      },
      desc: {
        uz: 'Standard xonalar milliy naqsh elementlari bilan bezatilgan bo‘lib, zamonaviy mehmonning barcha asosiy ehtiyojlarini qamrab oladi: yaxshi uyqu uchun ortopedik matras, kuchli Wi‑Fi, smart TV va xona haroratini telefon orqali boshqarish. Elektron qulf va QR-ma’lumotnoma check-in jarayonini tezlashtiradi.',
        ru: 'Номера Стандарт украшены элементами национального орнамента и закрывают все ключевые потребности современного гостя: ортопедический матрас для хорошего сна, быстрый Wi‑Fi, Smart TV и управление климатом со смартфона. Электронный замок и QR‑гид ускоряют заселение.',
        en: 'Standard rooms feature hints of national ornament and cover every essential for the modern guest: an orthopaedic mattress for restful sleep, fast Wi‑Fi, a smart TV and climate control from your phone. An electronic lock and QR guide speed up check-in.'
      },
      amenities: ['wifi', 'tv', 'desk', 'ac', 'shower', 'safe', 'kettle', 'lock']
    },
    {
      id: 'deluxe', count: 10, price: 1080000, area: '22–26', guests: 2, maxChildren: 1,
      img: 'dlx-1', gallery: ['dlx-1', 'dlx-2', 'dlx-3', 'lobby'],
      name: { uz: 'Deluxe', ru: 'Делюкс', en: 'Deluxe' },
      bed: { uz: 'King-size karavot', ru: 'Кровать King-size', en: 'King-size bed' },
      short: {
        uz: 'Kengroq maydon, yaxshiroq manzara va dam olish burchagi — ko‘proq qulaylik istaganlar uchun.',
        ru: 'Больше пространства, лучший вид и зона отдыха — для тех, кто ценит комфорт.',
        en: 'More space, a better view and a lounge corner — for guests who value extra comfort.'
      },
      desc: {
        uz: 'Deluxe xonalar binoning eng yaxshi joylashgan qismida bo‘lib, King-size karavot, kreslo bilan dam olish burchagi va kofe-mashina bilan jihozlangan. Zardo‘zi naqshli to‘qimachilik va mahalliy hunarmandlar ishlari xonaga o‘ziga xos ruh beradi.',
        ru: 'Номера Делюкс расположены в лучшей части здания и оснащены кроватью King-size, зоной отдыха с креслом и кофемашиной. Текстиль с золотым шитьём и работы местных мастеров придают номеру особый характер.',
        en: 'Deluxe rooms sit in the best-positioned part of the building, with a king-size bed, a lounge corner and a coffee machine. Gold-embroidered textiles and works by local artisans give each room its own character.'
      },
      amenities: ['wifi', 'tv', 'desk', 'ac', 'shower', 'safe', 'coffee', 'minibar', 'lock', 'view']
    },
    {
      id: 'family', count: 4, price: 1370000, area: '28–32', guests: 4, maxChildren: 2,
      img: 'fam-1', gallery: ['fam-1', 'fam-2', 'fam-3', 'breakfast'],
      name: { uz: 'Family', ru: 'Семейный', en: 'Family' },
      bed: { uz: 'King-size + 2 ta alohida karavot / divan', ru: 'King-size + 2 отдельные кровати / диван', en: 'King-size + 2 singles / sofa bed' },
      short: {
        uz: '3–4 kishilik keng xona: oila yoki kichik guruh uchun bolalar moslamalari bilan.',
        ru: 'Просторный номер на 3–4 гостей с детскими принадлежностями — для семьи или небольшой группы.',
        en: 'A spacious room for 3–4 guests with child amenities — for families and small groups.'
      },
      desc: {
        uz: 'Family xonalar oilaviy tashrif uchun mo‘ljallangan: alohida uxlash zonalari, bolalar uchun xavfsiz rozetkalar, so‘rov bo‘yicha bepul bolalar karavoti va kursi. Nonushtada bolalar menyusi va allergenlar bo‘yicha aniq ma’lumot taqdim etiladi.',
        ru: 'Семейные номера созданы для поездок с детьми: отдельные спальные зоны, безопасные розетки, бесплатная детская кроватка и стульчик по запросу. На завтраке — детское меню и точная информация об аллергенах.',
        en: 'Family rooms are designed for travelling with children: separate sleeping areas, child-safe sockets, and a free cot and high chair on request. Breakfast includes a kids’ menu and clear allergen information.'
      },
      amenities: ['wifi', 'tv', 'ac', 'shower', 'safe', 'kettle', 'kids', 'lock', 'sofa']
    },
    {
      id: 'heritage-suite', count: 2, price: 1750000, area: '38–42', guests: 3, maxChildren: 1,
      img: 'suite-1', gallery: ['suite-1', 'suite-2', 'suite-3', 'tiles'],
      name: { uz: 'Heritage Suite', ru: 'Heritage Suite', en: 'Heritage Suite' },
      bed: { uz: 'King-size karavot + mehmon zonasi', ru: 'Кровать King-size + гостиная зона', en: 'King-size bed + living area' },
      short: {
        uz: 'Milliy me’morchilik detallari, alohida mehmonxona zonasi va vanna — NAQSHning eng nafis taklifi.',
        ru: 'Детали национальной архитектуры, отдельная гостиная и ванна — самое изысканное предложение NAQSH.',
        en: 'National architectural details, a separate living area and a bathtub — the most refined experience at NAQSH.'
      },
      desc: {
        uz: 'Atigi ikkita Heritage Suite — ganch o‘ymakorligi, suzana va qo‘lda yasalgan kulolchilik buyumlari bilan bezatilgan. Alohida mehmon zonasi, keng ish stoli, vanna va yomg‘ir dushi, premium choy-kofe to‘plami hamda shaxsiy check-in xizmati.',
        ru: 'Всего два Heritage Suite — с резьбой по ганчу, сюзане и керамикой ручной работы. Отдельная гостиная, большой рабочий стол, ванна и тропический душ, премиальный чайно-кофейный набор и персональное заселение.',
        en: 'Just two Heritage Suites — adorned with carved ganch plaster, suzani and handmade ceramics. A separate living area, a large desk, bathtub and rain shower, a premium tea and coffee set and personal check-in.'
      },
      amenities: ['wifi', 'tv', 'desk', 'ac', 'bath', 'safe', 'coffee', 'minibar', 'lock', 'sofa', 'heritage']
    }
  ],

  amenityLabels: {
    wifi: { uz: 'Tezkor Wi‑Fi (100+ Mbit/s)', ru: 'Быстрый Wi‑Fi (100+ Мбит/с)', en: 'Fast Wi‑Fi (100+ Mbps)' },
    tv: { uz: 'Smart TV', ru: 'Smart TV', en: 'Smart TV' },
    desk: { uz: 'Ish stoli va rozetkalar', ru: 'Рабочий стол и розетки', en: 'Work desk & sockets' },
    ac: { uz: 'Aqlli iqlim nazorati', ru: 'Умный климат-контроль', en: 'Smart climate control' },
    shower: { uz: 'Yomg‘ir dushi', ru: 'Тропический душ', en: 'Rain shower' },
    bath: { uz: 'Vanna va yomg‘ir dushi', ru: 'Ванна и тропический душ', en: 'Bathtub & rain shower' },
    safe: { uz: 'Elektron seyf', ru: 'Электронный сейф', en: 'Electronic safe' },
    kettle: { uz: 'Choy va kofe to‘plami', ru: 'Чайный набор', en: 'Tea & coffee set' },
    coffee: { uz: 'Kofe-mashina', ru: 'Кофемашина', en: 'Coffee machine' },
    minibar: { uz: 'Mini-bar', ru: 'Мини-бар', en: 'Minibar' },
    lock: { uz: 'Elektron qulf va QR-ma’lumotnoma', ru: 'Электронный замок и QR‑гид', en: 'E‑lock & QR guide' },
    view: { uz: 'Yaxshiroq manzara', ru: 'Улучшенный вид', en: 'Better view' },
    kids: { uz: 'Bolalar karavoti va kursi (so‘rov bo‘yicha)', ru: 'Детская кроватка и стульчик (по запросу)', en: 'Cot & high chair (on request)' },
    sofa: { uz: 'Dam olish zonasi', ru: 'Зона отдыха', en: 'Lounge area' },
    heritage: { uz: 'Ganch, suzana va kulolchilik dekori', ru: 'Декор: ганч, сюзане, керамика', en: 'Ganch, suzani & ceramic decor' }
  },

  extras: [
    { id: 'transfer', price: 250000, per: 'trip', name: { uz: 'Aeroport transferi (bir tomon)', ru: 'Трансфер из аэропорта (в одну сторону)', en: 'Airport transfer (one way)' } },
    { id: 'early', price: 300000, per: 'stay', name: { uz: 'Erta check-in (08:00 dan)', ru: 'Ранний заезд (с 08:00)', en: 'Early check-in (from 08:00)' } },
    { id: 'cot', price: 0, per: 'stay', name: { uz: 'Bolalar karavoti', ru: 'Детская кроватка', en: 'Baby cot' } }
  ],

  // Managed from the admin panel in production.
  offers: [
    { id: 'early', img: 'suite-2', badge: '−10%',
      title: { uz: 'Erta bron', ru: 'Раннее бронирование', en: 'Early booking' },
      text: { uz: 'Kelishdan 30 kun oldin bron qiling va xona narxida 10% tejang.', ru: 'Забронируйте за 30 дней до заезда и сэкономьте 10%.', en: 'Book 30 days ahead and save 10% on your room.' } },
    { id: 'long', img: 'cowork', badge: '5+',
      title: { uz: 'Uzoq muddatli safar', ru: 'Длительное проживание', en: 'Long stay' },
      text: { uz: '5 kecha va undan ko‘p: bepul kir yuvish va coworking zonasidan cheksiz foydalanish.', ru: 'От 5 ночей: бесплатная прачечная и безлимитный коворкинг.', en: '5+ nights: complimentary laundry and unlimited coworking access.' } },
    { id: 'corp', img: 'lobby', badge: 'B2B',
      title: { uz: 'Korporativ tarif', ru: 'Корпоративный тариф', en: 'Corporate rate' },
      text: { uz: 'Kompaniyalar uchun maxsus narx, elektron hisob-faktura va kechiktirilgan to‘lov.', ru: 'Специальные цены, электронные счета-фактуры и отсрочка платежа для компаний.', en: 'Special rates, e‑invoices and deferred payment for companies.' } }
  ],

  gallery: [
    { img: 'exterior-night', cat: 'exterior' }, { img: 'lobby', cat: 'lobby' }, { img: 'suite-1', cat: 'rooms' },
    { img: 'breakfast', cat: 'dining' }, { img: 'std-1', cat: 'rooms' }, { img: 'tiles', cat: 'heritage' },
    { img: 'cowork', cat: 'common' }, { img: 'dlx-1', cat: 'rooms' }, { img: 'exterior', cat: 'exterior' },
    { img: 'fam-1', cat: 'rooms' }, { img: 'registan', cat: 'heritage' }, { img: 'cafe', cat: 'dining' },
    { img: 'suite-2', cat: 'rooms' }, { img: 'corridor', cat: 'common' }, { img: 'dlx-2', cat: 'rooms' },
    { img: 'std-2', cat: 'rooms' }, { img: 'suite-3', cat: 'rooms' }, { img: 'fam-2', cat: 'rooms' }
  ]
};
