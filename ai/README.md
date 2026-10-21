# UstozTop AI — Ustoz yordamchi

UstozTop ta'lim platformasi uchun **Gemini API** asosida ishlaydigan sun'iy intellekt
o'qituvchi yordamchisi. U o'quvchilarga matematika, ingliz tili, IT, dasturlash va boshqa
fanlardan o'zbek lotin yozuvida, sodda va bosqichma-bosqich javob beradi.

Loyihaning barcha AI bilan bog'liq kodi faqat shu `ai/` papkasi ichida saqlanadi. Mavjud
UstozTop loyihasiga tegilmagan.

## Tuzilma

```text
ai/
├── frontend/    # React + Vite + Tailwind — chat interfeysi (Ustoz yordamchi)
│   └── src/
├── backend/     # Node.js + Express — Gemini API bilan ishlaydigan server
│   └── src/
└── README.md
```

## Texnologiyalar

- **Backend:** Node.js, Express 5, `@google/genai` (rasmiy SDK), `cors`, `dotenv`
- **Frontend:** React 19, Vite, Tailwind CSS 4, `marked` + `dompurify` (markdown)
- **AI model:** `gemini-3.6-flash` (fallback: `gemini-3.5-flash-lite`, `gemini-2.5-flash`)

## Sozlash

### 1. Gemini API kalitini olish

[Google AI Studio](https://aistudio.google.com/apikey) sahifasidan bepul API key oling.

### 2. Backend `.env` fayli

`ai/backend/.env.example` ni nusxalab, `ai/backend/.env` yarating va kalitni yozing:

```bash
cd ai/backend
cp .env.example .env
```

`.env` ichi:

```env
GEMINI_API_KEY=bu_yerga_api_kalitingizni_yozing
GEMINI_MODEL=gemini-3.6-flash
PORT=8787
```

> **Muhim:** API key faqat backendda, `ai/backend/.env` ichida saqlanadi. U frontendga
> hech qachon chiqarilmaydi va `ai/backend/.gitignore` orqali Git'ga yuborilmaydi.

### 3. Dependencylarni o'rnatish

```bash
# Backend
cd ai/backend
npm install

# Frontend (yangi terminal)
cd ai/frontend
npm install
```

### 4. Serverni ishga tushirish

Ikkita alohida terminal oching.

**Terminal 1 — backend:**

```bash
cd ai/backend
npm run dev      # yoki: npm start
```

Server: `http://localhost:8787`

**Terminal 2 — frontend:**

```bash
cd ai/frontend
npm run dev
```

Chat interfeysi: `http://localhost:5174`

Frontend `/api` so'rovlarini Vite proxy orqali backendga (`http://localhost:8787`) yuboradi,
shuning uchun CORS va API key bilan bog'liq muammo bo'lmaydi.

## API endpointlar

| Metod | Yo'l | Tavsif |
| ----- | ---- | ------ |
| `GET` | `/api/health` | Server holati va API key sozlanganini tekshirish |
| `POST` | `/api/chat` | Xabarlar tarixini yuborib, Gemini javobini olish |

**`POST /api/chat` so'rov namunasi:**

```json
{
  "messages": [
    { "role": "user", "content": "JavaScriptni tushuntir" }
  ]
}
```

**Javob:**

```json
{
  "reply": "...",
  "model": "gemini-3.5-flash"
}
```

Xatolik `{ "error": "...", "code": "..." }` ko'rinishida qaytadi.

## Xususiyatlar

- O'zbek tilida salomlashuvchi interfeys va tayyor savollar (JavaScript, matematika, ingliz tili, kod).
- Foydalanuvchi va AI uchun alohida chat bubble.
- Enter — yuborish, Shift + Enter — yangi qator.
- Markdown, kod bloklari va kodni nusxalash tugmasi.
- Javob kutish animatsiyasi (typing indicator).
- Chatni tozalash va xatoda qayta urinish.
- To'liq mobil moslashuv, chat tarixi `localStorage`da saqlanadi.
- Oldingi xabarlar kontekst sifatida Gemini'ga yuboriladi.

## Xatoliklarni boshqarish

Backend quyidagi holatlarni ushlaydi va tushunarli xabar qaytaradi:

- API key yo'q yoki noto'g'ri → `MISSING_API_KEY`, `INVALID_API_KEY`
- Bo'sh yoki juda uzun xabar → `EMPTY_MESSAGE`, `MESSAGE_TOO_LONG`
- Gemini limiti tugashi → `QUOTA_EXCEEDED`
- Internet uzilishi → `NETWORK_ERROR`
- Model mavjud emas / band → `MODEL_NOT_FOUND`, `UNAVAILABLE` (avtomatik zaxira modelga o'tadi)
- So'rovlar soni chegarasi → `RATE_LIMITED` (daqiqada 20 ta so'rov)

## Muammolar va yechimlar

| Muammo | Yechim |
| ------ | ------ |
| "API kaliti sozlanmagan" | `ai/backend/.env` ichiga `GEMINI_API_KEY` qo'shing va backendni qayta ishga tushiring |
| "Model mavjud emas" | `GEMINI_MODEL` ni `gemini-3.6-flash` qilib o'rnating |
| "Tanlangan model ... no longer available" | `.env` dagi modelni `gemini-3.6-flash` qilib yangilang |
| Frontend backendga ulanmayapti | Backend `8787`-portda ishlab turganini tekshiring |
| "So'rovlar juda ko'p" | Bir daqiqa kutib, qayta urinib ko'ring |
