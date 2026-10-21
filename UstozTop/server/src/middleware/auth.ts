import type { NextFunction, Request, Response } from 'express'
import type { Role, User } from '../lib/types.js'
import { config } from '../config.js'
import { forbidden, unauthorized } from '../lib/http.js'
import { prisma } from '../lib/prisma.js'
import { hashToken } from '../lib/security.js'

declare module 'express-serve-static-core' {
  interface Request {
    user?: User
    sessionId?: string
  }
}

// Sessiya cookie orqali tekshiriladi; foydalanuvchi va rol har so'rovda bazadan olinadi.
export async function loadUser(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[config.sessionCookie] as string | undefined
  if (token) {
    const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } })
    if (session && session.expiresAt > new Date()) {
      req.user = session.user
      req.sessionId = session.id
    }
  }
  next()
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) throw unauthorized()
  if (req.user.status === 'BLOCKED') throw forbidden('Akkauntingiz bloklangan.')
  next()
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw unauthorized()
    if (!roles.includes(req.user.role)) throw forbidden()
    if (req.user.status === 'BLOCKED') throw forbidden('Akkauntingiz bloklangan.')
    if (req.user.status !== 'ACTIVE') {
      throw forbidden(req.user.status === 'PENDING' ? 'Akkauntingiz admin tasdig‘ini kutmoqda.' : 'Akkauntingiz tasdiqlanmagan.')
    }
    next()
  }
}
