import { z } from 'zod'

const name = z.string().trim().min(2, 'Kamida 2 ta belgi kiriting.').max(60, 'Juda uzun.')

export const identifier = z.string().trim().min(3, 'Email yoki telefon kiriting.').max(120).transform((value) => value.toLowerCase())

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const phoneRe = /^\+?\d{9,15}$/

export function splitIdentifier(value: string): { email?: string; phone?: string } {
  const trimmed = value.trim().toLowerCase()
  if (emailRe.test(trimmed)) return { email: trimmed }
  const phone = trimmed.replace(/[\s()-]/g, '')
  if (phoneRe.test(phone)) return { phone: phone.startsWith('+') ? phone : `+${phone}` }
  return {}
}

export const password = z
  .string()
  .min(8, 'Parol kamida 8 ta belgidan iborat bo‘lsin.')
  .max(128)
  .regex(/[A-Za-z]/, 'Parolda kamida bitta harf bo‘lsin.')
  .regex(/\d/, 'Parolda kamida bitta raqam bo‘lsin.')

export const registerSchema = z
  .object({
    firstName: name,
    lastName: name,
    identifier,
    password,
    confirmPassword: z.string(),
    // Ochiq ro'yxatdan faqat o'quvchi o'ta oladi; ustoz hisobini admin yaratadi.
    role: z.literal('STUDENT').default('STUDENT'),
    acceptTerms: z.literal(true, { message: 'Foydalanish shartlariga rozilik bering.' }),
  })
  .refine((data) => data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'Parollar mos kelmadi.' })
  .refine((data) => Object.keys(splitIdentifier(data.identifier)).length > 0, { path: ['identifier'], message: 'To‘g‘ri email yoki telefon raqam kiriting.' })

export const loginSchema = z.object({ identifier, password: z.string().min(1, 'Parolni kiriting.').max(128) })
export const forgotSchema = z.object({ identifier })
export const resetSchema = z.object({ token: z.string().min(10), password })
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1), newPassword: password })

export const profileSchema = z.object({
  firstName: name.optional(),
  lastName: name.optional(),
  grade: z.string().max(20).optional(),
  avatarColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

export const reviewSchema = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().trim().max(500).optional() })

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Sana YYYY-MM-DD ko‘rinishida bo‘lsin.')
export const attendanceSchema = z.object({
  date: dateString,
  records: z.array(z.object({ studentId: z.string(), present: z.boolean() })).min(1).max(200),
})
export const assessmentSchema = z.object({
  date: dateString,
  items: z
    .array(
      z.object({
        studentId: z.string(),
        activityScore: z.number().int().min(0, 'Ball 0 dan kam bo‘lmasin.').max(10, 'Ball 10 dan oshmasin.'),
        homeworkScore: z.number().int().min(0, 'Ball 0 dan kam bo‘lmasin.').max(10, 'Ball 10 dan oshmasin.'),
        note: z.string().trim().max(300).optional(),
      }),
    )
    .min(1)
    .max(200),
})

export const subjectSchema = z.object({
  name: name.max(80),
  category: z.string().trim().min(2).max(60),
  icon: z.string().trim().min(1).max(8).default('✦'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#8b6cff'),
  description: z.string().trim().max(600).default(''),
  totalLessons: z.number().int().min(1).max(200).default(24),
  topics: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  symbols: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
})
export const subjectPatchSchema = subjectSchema.partial().extend({ active: z.boolean().optional() })

export const groupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  subjectId: z.string(),
  lessonTime: z.string().regex(/^\d{2}:\d{2}$/, 'Vaqt SS:DD ko‘rinishida bo‘lsin.').default('14:00'),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1, 'Kamida bitta dars kuni tanlang.').max(7),
  capacity: z.number().int().min(1).max(200).default(20),
  teacherId: z.string().optional(),
})
export const groupPatchSchema = groupSchema.partial().extend({ active: z.boolean().optional() })

export const userStatusSchema = z.object({ status: z.enum(['ACTIVE', 'REJECTED', 'BLOCKED']), confirm: z.literal(true, { message: 'Amalni tasdiqlang.' }) })
export const createTeacherSchema = z.object({
  firstName: name,
  lastName: name,
  identifier,
  password,
  qualification: z.string().trim().max(200).optional(),
  experienceYears: z.number().int().min(0).max(70).optional(),
  subjectIds: z.array(z.string()).max(30).default([]),
})
export const teacherPatchSchema = z.object({
  firstName: name.optional(),
  lastName: name.optional(),
  password: password.optional(),
  qualification: z.string().trim().max(200).optional(),
  experienceYears: z.number().int().min(0).max(70).optional(),
  subjectIds: z.array(z.string()).max(30).optional(),
})
export const teacherProfileSchema = z.object({
  bio: z.string().trim().max(600).optional(),
  qualification: z.string().trim().max(200).optional(),
  experienceYears: z.number().int().min(0).max(70).optional(),
})
