import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

export class HttpError extends Error {
  status: number
  code: string
  details?: unknown

  constructor(status: number, message: string, code = 'ERROR', details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export const badRequest = (message: string, details?: unknown) => new HttpError(400, message, 'BAD_REQUEST', details)
export const unauthorized = (message = 'Tizimga kiring.') => new HttpError(401, message, 'UNAUTHORIZED')
export const forbidden = (message = 'Bu amal uchun ruxsat yo‘q.') => new HttpError(403, message, 'FORBIDDEN')
export const notFound = (message = 'Topilmadi.') => new HttpError(404, message, 'NOT_FOUND')
export const conflict = (message: string) => new HttpError(409, message, 'CONFLICT')

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    const fields: Record<string, string> = {}
    for (const issue of error.issues) fields[issue.path.join('.') || '_'] = issue.message
    const first = error.issues[0]
    res.status(400).json({ error: first?.message || 'Ma’lumotlar noto‘g‘ri.', code: 'VALIDATION', fields })
    return
  }
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message, code: error.code, details: error.details })
    return
  }
  const known = error as { status?: number; type?: string }
  if (known?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'So‘rov formati noto‘g‘ri.', code: 'BAD_JSON' })
    return
  }
  console.error('[server]', error)
  res.status(500).json({ error: 'Serverda xatolik yuz berdi.', code: 'SERVER_ERROR' })
}
