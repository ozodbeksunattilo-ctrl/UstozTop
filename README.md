# UstozTop

Ta’lim platformasi: **O‘quvchi**, **Ustoz** va **Admin** rollari, real backend, PostgreSQL, UZ/RU interfeys, Light/Dark Mode va UstozTop AI.

```
UstozTop/   Frontend  — React + Vite + Tailwind (JavaScript)
server/     Backend   — Node.js + Express + TypeScript + Prisma + PostgreSQL + Zod
ai/         AI        — Gemini integratsiyasi (kalit faqat backendda)
```

## Ishga tushirish (birinchi marta)

Kerak: Node.js 20+.

```bash
# 1) Backend: paketlar, baza sxemasi va boshlang'ich ma'lumotlar
cd server
npm install
cp .env.example .env          # Windows: copy .env.example .env
npm run db:local              # 1-terminal: PostgreSQL (embedded) ishga tushadi, to'xtatmang
npm run db:push               # 2-terminal: jadvallarni yaratadi
npm run db:seed               # admin + demo ma'lumotlar

# 2) Frontend
cd ../UstozTop
npm install
npm run dev                   # http://localhost:5173 (band bo'lsa keyingi port)
```

`npm run dev` frontend bilan birga **PostgreSQL**, **API (4000-port)** va **AI backend (8787-port)** ni ham ishga tushiradi
(ular allaqachon ishlayotgan bo‘lsa, qayta ishga tushirilmaydi; o‘chib qolsa o‘zi tiklanadi).

**Docker bilan** (Docker Desktop ishlayotgan bo‘lsa): `cd server && npm run db:up` — PostgreSQL 16, 5433-port.
Docker/WSL bo‘lmasa `npm run db:local` haqiqiy PostgreSQL’ni lokal jarayon sifatida ishga tushiradi (`server/.pgdata`).

AI uchun `ai/backend/.env` ichiga `GEMINI_API_KEY` yozing (qarang: `ai/README.md`). Kalit hech qachon frontendga chiqmaydi.

## Demo akkauntlar (seed)

| Rol | Login | Parol |
| --- | --- | --- |
| Admin | `admin@ustoztop.uz` | `UstozTopAdmin26!` |
| Ustoz | `ustoz@ustoztop.uz` | `UstozTop2026!` |
| O‘quvchi | `aziz@ustoztop.uz` | `Student2026!` |

Admin faqat server tomonida yaratiladi (`ADMIN_EMAIL` / `ADMIN_PASSWORD`, seed). Register formasida Admin rolini tanlab bo‘lmaydi.
Production uchun demo ma’lumotsiz: `SEED_DEMO=false npm run db:seed` va admin parolini `.env` da o‘zgartiring.

## Rollar va yo‘naltirish

Bitta umumiy Register/Login sahifasi. Backend rolni tekshiradi, frontend mos dashboardga yo‘naltiradi:

| Rol | Manzil |
| --- | --- |
| O‘quvchi | `/student/dashboard` |
| Ustoz | `/teacher/dashboard` |
| Admin | `/admin/dashboard` |

- **O‘quvchi:** umumiy dashboard, ustoz qidirish (fan/ism/reyting), fanlar va guruhga qo‘shilish, ustozlar reytingi, mening reytingim, davomat va natijalar, UstozTop AI, profil.
- **Ustoz:** guruhlarim, o‘quvchilar (qidirish, profil), davomat va ball berish, reyting, profil. Faqat o‘ziga biriktirilgan guruhlar.
- **Admin:** foydalanuvchilar, ustoz tasdiqlash/rad etish/bloklash, fanlar, guruhlar (ustoz biriktirish), reytinglar, shubhali baholar, faoliyat (audit) jurnali.
- Ustoz Register qilganda `PENDING` holatida bo‘ladi: admin tasdiqlamaguncha dashboardga kira olmaydi.

## Baholash va reyting qoidalari

- Har bir dars uchun uchta mezon: **qatnashish** (keldi = 10, kelmadi = 0, davomatdan avtomatik), **faollik** 0–10, **topshiriq** 0–10 → jami 0–30. Chegaradan oshgan ball serverda rad etiladi.
- Har bir baho yozuvida o‘quvchi, ustoz, guruh va sana saqlanadi (`Assessment`). Davomat o‘zgarsa, shu kunning bahosi qayta hisoblanadi.
- Reyting bazadagi baholar va davomatdan har so‘rovda hisoblanadi, shuning uchun ball o‘zgarishi reytingni avtomatik yangilaydi.
- Teng ballarda tartib (hamma o‘quvchiga bir xil): 1) umumiy ball, 2) kelgan darslar soni, 3) oldin ro‘yxatdan o‘tgan, 4) familiya/ism alifbo tartibi, 5) id.
- O‘quvchilar bir-birining to‘liq ismini ko‘rmaydi (“Ali V.”).
- Shubhali baho qoidalari: kelmagan o‘quvchiga faollik+topshiriq ≥ 18; bir kunda guruhdagi barcha (≥3) o‘quvchiga to‘liq 30 ball.

## Xavfsizlik

- Parollar `bcrypt` (12 raund) bilan hash qilinadi; parol hech qachon javobda qaytarilmaydi.
- Sessiya: tasodifiy token, bazada faqat hash’i; `HttpOnly` + `SameSite=Lax` cookie (productionda `COOKIE_SECURE=true`).
- Rol va resurs ruxsatlari har so‘rovda backendda tekshiriladi (o‘quvchi — faqat o‘zi; ustoz — faqat o‘z guruhlari; admin — `ADMIN`).
- Login: 15 daqiqada 10 ta xato urinishdan keyin bloklanadi (IP + login). Registratsiya/tiklashga ham limit bor.
- Zod validatsiya, `helmet`, takroriy email/telefon rad etiladi.
- Parolni tiklash: 30 daqiqalik, bir martalik token (bazada hash). Email xizmati ulanmagan: development rejimida token javobda va server logida ko‘rinadi, productionda ko‘rsatilmaydi — SMTP/SMS ulash kerak.
- Muhim admin amallari (tasdiqlash, rad etish, bloklash, fan/guruh o‘zgartirish) tasdiqlash oynasi orqali bajariladi va `AuditLog` ga yoziladi.

## Testlar

```bash
cd server
npm run test        # birlik (reyting) + integratsion (haqiqiy PostgreSQL) testlar
npm run typecheck
```

Integratsion testlar Register/Login, rol ruxsatlari, ustoz tasdig‘i, guruh, davomat, baho chegaralari va reyting yangilanishini tekshiradi
(ular vaqtincha test foydalanuvchilar yaratadi va tozalaydi). Frontend: `cd UstozTop && npm run lint && npm run build`.

## Deploy

1. Boshqariladigan PostgreSQL oling; `DATABASE_URL` ni `server/.env` ga yozing.
2. `cd server && npm ci && npx prisma db push && SEED_DEMO=false npm run db:seed && npm run build && npm start` (`NODE_ENV=production`, `COOKIE_SECURE=true`, kuchli `ADMIN_PASSWORD`).
3. Frontend: `cd UstozTop && npm ci && npm run build`; `dist/` ni statik hostingga qo‘ying va `/api` so‘rovlarini backendga yo‘naltiring (bir domen — cookie uchun eng oson).
4. AI backend (`ai/backend`) alohida ishlaydi; `/api/chat` va `/api/health` ni unga yo‘naltiring.
5. HTTPS majburiy (cookie `Secure`). Email/SMS (parolni tiklash) uchun provayder ulang.

## Hozircha qamrab olinmagan

- AI suhbat tarixi bazada saqlanmaydi (`AIConversation`/`AIMessage` jadvallari tayyor, ulanmagan); AI limitlari admin tomonidan sozlanmaydi.
- Frontend JavaScript’da (backend TypeScript’da).
- Interfeys UZ (lotin/kirill) va RU to‘liq; EN faqat eski bo‘limlarda tarjima qilingan.
- Parolni tiklash xabarnomasi (email/SMS) ulanmagan.
