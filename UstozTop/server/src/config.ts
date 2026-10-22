// O'zbekiston vaqti: Vercel serverlari UTC'da ishlaydi, shuning uchun sana va hafta kuni (dars jadvali, bugungi darslar, eslatmalar) Toshkent bo'yicha hisoblanadi.
process.env.TZ ||= 'Asia/Tashkent'
import 'dotenv/config'

const env = process.env

export const config = {
  port: Number(env.API_PORT) || 4000, // PORT ataylab o‘qilmaydi: eski .env da AI porti (8787) qolgan bo‘lishi mumkin
  isProduction: env.NODE_ENV === 'production',
  cookieSecure: env.COOKIE_SECURE === 'true',
  sessionDays: Number(env.SESSION_DAYS) || 7,
  sessionCookie: 'ustoztop_sid',
  resetTokenMinutes: 30,
  admin: {
    email: (env.ADMIN_EMAIL || 'admin@ustoztop.uz').toLowerCase(),
    password: env.ADMIN_PASSWORD || 'UstozTopAdmin26!',
  },
  // Ball chegaralari: har bir mezon 0..10, jami 0..30
  maxCriterionScore: 10,
  maxTotalScore: 30,
}
