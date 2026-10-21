import bcrypt from 'bcryptjs'
import { createHash, randomBytes } from 'node:crypto'

const ROUNDS = 12

export const hashPassword = (password: string) => bcrypt.hash(password, ROUNDS)
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash)

export function newToken() {
  return randomBytes(32).toString('base64url')
}

// Bazada tokenning o'zi emas, faqat hash'i saqlanadi.
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')
