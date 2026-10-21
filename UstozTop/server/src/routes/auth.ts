import { Router } from 'express'
import type { Request, Response } from 'express'
import type { User } from '../lib/types.js'
import rateLimit from 'express-rate-limit'
import { config } from '../config.js'
import { audit } from '../lib/audit.js'
import { conflict, HttpError, unauthorized } from '../lib/http.js'
import { prisma } from '../lib/prisma.js'
import { hashPassword, hashToken, newToken, verifyPassword } from '../lib/security.js'
import { changePasswordSchema, forgotSchema, loginSchema, profileSchema, registerSchema, resetSchema, splitIdentifier } from '../lib/validation.js'
import { requireAuth } from '../middleware/auth.js'

export const authRouter = Router()

export function publicUser(user: User & { studentProfile?: { grade: string | null } | null }) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    avatarColor: user.avatarColor,
    grade: user.studentProfile?.grade ?? '',
    createdAt: user.createdAt,
  }
}

async function startSession(req: Request, res: Response, userId: string) {
  const token = newToken()
  const expiresAt = new Date(Date.now() + config.sessionDays * 86_400_000)
  await prisma.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt, userAgent: req.get('user-agent')?.slice(0, 200) } })
  res.cookie(config.sessionCookie, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    expires: expiresAt,
    path: '/',
  })
}

// Kirish urinishlariga limit: bir IP + login juftligi uchun 15 daqiqada 10 ta xato.
const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}|${String(req.body?.identifier || '').toLowerCase()}`,
  validate: { keyGeneratorIpFallback: false },
  handler: (_req, res) => {
    res.status(429).json({ error: 'Urinishlar juda ko‘p. 15 daqiqadan keyin qayta urinib ko‘ring.', code: 'RATE_LIMITED' })
  },
})

const registerLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Juda ko‘p so‘rov. Birozdan keyin urinib ko‘ring.', code: 'RATE_LIMITED' })
  },
})

authRouter.post('/register', registerLimiter, async (req, res) => {
  const data = registerSchema.parse(req.body)
  const contact = splitIdentifier(data.identifier)
  const existing = await prisma.user.findFirst({ where: { OR: [contact.email ? { email: contact.email } : {}, contact.phone ? { phone: contact.phone } : {}].filter((item) => Object.keys(item).length) } })
  if (existing) throw conflict(contact.email ? 'Bu email bilan akkaunt mavjud.' : 'Bu telefon raqam bilan akkaunt mavjud.')

  const user = await prisma.user.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      ...contact,
      passwordHash: await hashPassword(data.password),
      role: 'STUDENT',
      status: 'ACTIVE',
      studentProfile: { create: {} },
    },
    include: { studentProfile: true },
  })
  await audit(user.id, 'user.register', 'User', user.id, { role: user.role })
  await startSession(req, res, user.id)
  res.status(201).json({ user: publicUser(user) })
})

const DUMMY_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEeO5xZ8l4o7Vh0sZ8o8v9r3WfX9qO9yq6e'

authRouter.post('/login', loginLimiter, async (req, res) => {
  const data = loginSchema.parse(req.body)
  const contact = splitIdentifier(data.identifier)
  const user = contact.email || contact.phone
    ? await prisma.user.findFirst({ where: contact.email ? { email: contact.email } : { phone: contact.phone }, include: { studentProfile: true } })
    : null
  // Foydalanuvchi topilmasa ham hash tekshiriladi (vaqt bo'yicha farqni yashirish uchun).
  const valid = await verifyPassword(data.password, user?.passwordHash ?? DUMMY_HASH)
  if (!user || !valid) throw new HttpError(401, 'Email/telefon yoki parol noto‘g‘ri.', 'INVALID_CREDENTIALS')
  if (user.status === 'BLOCKED') throw new HttpError(403, 'Akkauntingiz bloklangan.', 'BLOCKED')
  await startSession(req, res, user.id)
  await audit(user.id, 'user.login', 'User', user.id)
  res.json({ user: publicUser(user) })
})

authRouter.post('/logout', async (req, res) => {
  if (req.sessionId) await prisma.session.deleteMany({ where: { id: req.sessionId } })
  res.clearCookie(config.sessionCookie, { path: '/' })
  res.json({ ok: true })
})

authRouter.get('/me', async (req, res) => {
  if (!req.user) throw unauthorized()
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user.id }, include: { studentProfile: true } })
  res.json({ user: publicUser(user) })
})

// Parolni tiklash: cheklangan muddatli bir martalik token. Email xizmati ulanmagan,
// shuning uchun development rejimida token javobda va server logida ko'rsatiladi.
authRouter.post('/forgot', registerLimiter, async (req, res) => {
  const data = forgotSchema.parse(req.body)
  const contact = splitIdentifier(data.identifier)
  const user = contact.email || contact.phone ? await prisma.user.findFirst({ where: contact.email ? { email: contact.email } : { phone: contact.phone } }) : null
  let devResetToken: string | undefined
  if (user) {
    const token = newToken()
    await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + config.resetTokenMinutes * 60_000) } })
    await audit(user.id, 'user.password_reset_requested', 'User', user.id)
    if (!config.isProduction) {
      devResetToken = token
      console.log(`[reset] ${user.email || user.phone}: /reset-password?token=${token}`)
    }
  }
  res.json({ ok: true, message: 'Agar akkaunt mavjud bo‘lsa, tiklash ko‘rsatmasi yuboriladi.', devResetToken })
})

authRouter.post('/reset', registerLimiter, async (req, res) => {
  const data = resetSchema.parse(req.body)
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(data.token) } })
  if (!record || record.usedAt || record.expiresAt < new Date()) throw new HttpError(400, 'Tiklash havolasi yaroqsiz yoki muddati tugagan.', 'INVALID_TOKEN')
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(data.password) } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.session.deleteMany({ where: { userId: record.userId } }),
  ])
  await audit(record.userId, 'user.password_reset', 'User', record.userId)
  res.json({ ok: true })
})

authRouter.post('/change-password', requireAuth, async (req, res) => {
  const data = changePasswordSchema.parse(req.body)
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } })
  if (!(await verifyPassword(data.currentPassword, user.passwordHash))) throw new HttpError(400, 'Joriy parol noto‘g‘ri.', 'WRONG_PASSWORD')
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(data.newPassword) } })
  // boshqa qurilmalardagi sessiyalar yopiladi
  await prisma.session.deleteMany({ where: { userId: user.id, NOT: { id: req.sessionId } } })
  await audit(user.id, 'user.password_changed', 'User', user.id)
  res.json({ ok: true })
})

authRouter.patch('/profile', requireAuth, async (req, res) => {
  const data = profileSchema.parse(req.body)
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      ...(data.firstName ? { firstName: data.firstName } : {}),
      ...(data.lastName ? { lastName: data.lastName } : {}),
      ...(data.avatarColor ? { avatarColor: data.avatarColor } : {}),
      ...(data.grade !== undefined && req.user!.role === 'STUDENT' ? { studentProfile: { upsert: { create: { grade: data.grade || null }, update: { grade: data.grade || null } } } } : {}),
    },
    include: { studentProfile: true },
  })
  res.json({ user: publicUser(user) })
})
