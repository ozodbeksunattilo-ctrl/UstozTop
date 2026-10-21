import 'dotenv/config'

const env = process.env

export const config = {
  port: Number(env.PORT) || 4000,
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
