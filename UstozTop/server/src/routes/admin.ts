import { Router } from 'express'
import { z } from 'zod'
import { audit } from '../lib/audit.js'
import { badRequest, conflict, forbidden, notFound } from '../lib/http.js'
import { prisma } from '../lib/prisma.js'
import { todayUTC } from '../lib/ranking.js'
import { assertTeacherFree } from '../lib/schedule.js'
import { hashPassword } from '../lib/security.js'
import { studentBoard, teacherCards } from '../lib/stats.js'
import { createTeacherSchema, groupPatchSchema, groupSchema, splitIdentifier, subjectPatchSchema, subjectSchema, teacherPatchSchema, userStatusSchema } from '../lib/validation.js'
import { requireRole } from '../middleware/auth.js'

// Faqat ADMIN roli. Muhim amallar (tasdiqlash, bloklash, o'chirish) audit jurnaliga yoziladi.
export const adminRouter = Router()
adminRouter.use(requireRole('ADMIN'))

adminRouter.get('/stats', async (_req, res) => {
  const [students, teachers, pendingTeachers, subjects, groups, assessments, attendanceTotal, attendancePresent, recentUsers] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.user.count({ where: { role: 'TEACHER', status: 'ACTIVE' } }),
    prisma.user.count({ where: { role: 'TEACHER', status: 'PENDING' } }),
    prisma.subject.count({ where: { active: true } }),
    prisma.group.count({ where: { active: true } }),
    prisma.assessment.count(),
    prisma.attendance.count(),
    prisma.attendance.count({ where: { present: true } }),
    prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, status: true, createdAt: true } }),
  ])
  const since = new Date(todayUTC().getTime() - 6 * 86_400_000)
  const recent = await prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } })
  const perDay = Array.from({ length: 7 }, (_, index) => {
    const key = new Date(since.getTime() + index * 86_400_000).toISOString().slice(0, 10)
    return { date: key, count: recent.filter((item) => item.createdAt.toISOString().slice(0, 10) === key).length }
  })
  res.json({
    students,
    teachers,
    pendingTeachers,
    subjects,
    groups,
    assessments,
    attendancePercent: attendanceTotal ? Math.round((attendancePresent / attendanceTotal) * 100) : 0,
    recentUsers,
    registrationsPerDay: perDay,
  })
})

adminRouter.get('/users', async (req, res) => {
  const { query, role, status } = z.object({ query: z.string().optional(), role: z.enum(['STUDENT', 'TEACHER', 'ADMIN']).optional(), status: z.enum(['ACTIVE', 'PENDING', 'REJECTED', 'BLOCKED']).optional() }).parse(req.query)
  const users = await prisma.user.findMany({
    where: {
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
      ...(query ? { OR: [{ firstName: { contains: query, mode: 'insensitive' } }, { lastName: { contains: query, mode: 'insensitive' } }, { email: { contains: query, mode: 'insensitive' } }, { phone: { contains: query } }] } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, status: true, createdAt: true },
  })
  res.json({ users: users.map((user) => ({ ...user, fullName: `${user.firstName} ${user.lastName}` })) })
})

// Ustozni tasdiqlash/rad etish va akkauntni bloklash/faollashtirish. Admin o'zini bloklay olmaydi.
adminRouter.patch('/users/:id/status', async (req, res) => {
  const data = userStatusSchema.parse(req.body)
  const id = String(req.params.id)
  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) throw notFound('Foydalanuvchi topilmadi.')
  if (target.id === req.user!.id) throw forbidden('O‘z akkauntingiz holatini o‘zgartira olmaysiz.')
  if (target.role === 'ADMIN') throw forbidden('Admin akkauntini bu yerdan boshqarib bo‘lmaydi.')
  if (data.status === 'REJECTED' && target.role !== 'TEACHER') throw badRequest('Faqat ustoz so‘rovini rad etish mumkin.')
  const user = await prisma.user.update({ where: { id }, data: { status: data.status } })
  if (data.status === 'BLOCKED' || data.status === 'REJECTED') await prisma.session.deleteMany({ where: { userId: id } })
  await prisma.notification.create({
    data: {
      userId: id,
      title: data.status === 'ACTIVE' ? 'Akkaunt faollashtirildi' : data.status === 'BLOCKED' ? 'Akkaunt bloklandi' : 'So‘rov rad etildi',
      body: data.status === 'ACTIVE' ? 'Akkauntingiz admin tomonidan tasdiqlandi.' : 'Batafsil ma’lumot uchun administrator bilan bog‘laning.',
    },
  })
  await audit(req.user!.id, `user.status.${data.status.toLowerCase()}`, 'User', id, { from: target.status, to: data.status })
  res.json({ user: { id: user.id, status: user.status } })
})

adminRouter.post('/teachers', async (req, res) => {
  const data = createTeacherSchema.parse(req.body)
  const contact = splitIdentifier(data.identifier)
  if (!contact.email && !contact.phone) throw badRequest('To‘g‘ri email yoki telefon kiriting.')
  const exists = await prisma.user.findFirst({ where: contact.email ? { email: contact.email } : { phone: contact.phone } })
  if (exists) throw conflict('Bu email yoki telefon bilan akkaunt mavjud.')
  const user = await prisma.user.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      ...contact,
      passwordHash: await hashPassword(data.password),
      role: 'TEACHER',
      status: 'ACTIVE',
      teacherProfile: { create: { qualification: data.qualification ?? '', experienceYears: data.experienceYears ?? 0 } },
      teachingSubjects: { create: data.subjectIds.map((subjectId) => ({ subjectId })) },
    },
  })
  await audit(req.user!.id, 'teacher.create', 'User', user.id, { subjects: data.subjectIds.length })
  res.status(201).json({ id: user.id })
})

// Ustozlar ro'yxati: login (email/telefon), qaysi fanlardan dars berishi va guruhlari.
adminRouter.get('/teachers', async (_req, res) => {
  const teachers = await prisma.user.findMany({
    where: { role: 'TEACHER' },
    orderBy: { createdAt: 'desc' },
    include: { teacherProfile: true, teachingSubjects: { include: { subject: true } }, assignments: { include: { group: { include: { subject: true } } } } },
  })
  res.json({
    teachers: teachers.map((teacher) => ({
      id: teacher.id,
      fullName: `${teacher.firstName} ${teacher.lastName}`,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email,
      phone: teacher.phone,
      status: teacher.status,
      qualification: teacher.teacherProfile?.qualification ?? '',
      experienceYears: teacher.teacherProfile?.experienceYears ?? 0,
      subjects: teacher.teachingSubjects.map((item) => ({ id: item.subject.id, name: item.subject.name, color: item.subject.color, icon: item.subject.icon })),
      groupCount: teacher.assignments.length,
    })),
  })
})

// Ustoz ma'lumotlarini, fanlarini o'zgartirish va parolni qayta o'rnatish (admin yangi parolni ustozga yetkazadi).
adminRouter.patch('/teachers/:id', async (req, res) => {
  const { subjectIds, password, qualification, experienceYears, ...names } = teacherPatchSchema.parse(req.body)
  const id = String(req.params.id)
  const teacher = await prisma.user.findFirst({ where: { id, role: 'TEACHER' } })
  if (!teacher) throw notFound('Ustoz topilmadi.')
  if (subjectIds) {
    const found = await prisma.subject.count({ where: { id: { in: subjectIds } } })
    if (found !== new Set(subjectIds).size) throw badRequest('Tanlangan fanlardan biri topilmadi.')
  }
  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: {
        ...names,
        ...(password ? { passwordHash: await hashPassword(password) } : {}),
        teacherProfile: { upsert: { create: { qualification: qualification ?? '', experienceYears: experienceYears ?? 0 }, update: { ...(qualification !== undefined ? { qualification } : {}), ...(experienceYears !== undefined ? { experienceYears } : {}) } } },
      },
    }),
    ...(password ? [prisma.session.deleteMany({ where: { userId: id } })] : []),
    ...(subjectIds ? [prisma.teacherSubject.deleteMany({ where: { teacherId: id } }), prisma.teacherSubject.createMany({ data: [...new Set(subjectIds)].map((subjectId) => ({ teacherId: id, subjectId })) })] : []),
  ])
  await audit(req.user!.id, password ? 'teacher.reset_password' : 'teacher.update', 'User', id)
  res.json({ ok: true })
})

// ---- Fanlar
adminRouter.get('/subjects', async (_req, res) => {
  const subjects = await prisma.subject.findMany({ orderBy: [{ active: 'desc' }, { name: 'asc' }], include: { _count: { select: { groups: true } } } })
  res.json({ subjects })
})

adminRouter.post('/subjects', async (req, res) => {
  const data = subjectSchema.parse(req.body)
  if (await prisma.subject.findUnique({ where: { name: data.name } })) throw conflict('Bunday nomli fan mavjud.')
  const subject = await prisma.subject.create({ data: { ...data, symbols: data.symbols.length ? data.symbols : [data.name, 'Yangi mavzu', 'UstozTop'] } })
  await audit(req.user!.id, 'subject.create', 'Subject', subject.id, { name: subject.name })
  res.status(201).json({ subject })
})

adminRouter.patch('/subjects/:id', async (req, res) => {
  const data = subjectPatchSchema.parse(req.body)
  const id = String(req.params.id)
  if (!(await prisma.subject.findUnique({ where: { id } }))) throw notFound('Fan topilmadi.')
  if (data.name && (await prisma.subject.findFirst({ where: { name: data.name, NOT: { id } } }))) throw conflict('Bunday nomli fan mavjud.')
  const subject = await prisma.subject.update({ where: { id }, data })
  await audit(req.user!.id, data.active === false ? 'subject.deactivate' : 'subject.update', 'Subject', id)
  res.json({ subject })
})

// ---- Guruhlar
const adminGroupInclude = {
  subject: true,
  teacherAssignment: { include: { teacher: { select: { id: true, firstName: true, lastName: true, status: true } } } },
  _count: { select: { memberships: true } },
} as const

adminRouter.get('/groups', async (_req, res) => {
  const groups = await prisma.group.findMany({ include: adminGroupInclude, orderBy: [{ active: 'desc' }, { name: 'asc' }] })
  res.json({
    groups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      active: group.active,
      subject: { id: group.subject.id, name: group.subject.name, color: group.subject.color, icon: group.subject.icon },
      teacher: group.teacherAssignment ? { id: group.teacherAssignment.teacher.id, status: group.teacherAssignment.teacher.status, fullName: `${group.teacherAssignment.teacher.firstName} ${group.teacherAssignment.teacher.lastName}` } : null,
      lessonTime: group.lessonTime,
      daysOfWeek: group.daysOfWeek,
      capacity: group.capacity,
      memberCount: group._count.memberships,
    })),
  })
})

// Ustozga fanlar biriktirilgan bo'lsa, guruh faqat shu fanlardan biri bo'yicha bo'lishi mumkin.
async function assertActiveTeacher(teacherId: string, subjectId?: string) {
  const teacher = await prisma.user.findFirst({ where: { id: teacherId, role: 'TEACHER', status: 'ACTIVE' }, include: { teachingSubjects: true } })
  if (!teacher) throw badRequest('Faol ustoz topilmadi.')
  if (subjectId && teacher.teachingSubjects.length && !teacher.teachingSubjects.some((item) => item.subjectId === subjectId)) {
    throw badRequest('Bu ustoz tanlangan fandan dars bermaydi. Avval Ustozlar bo‘limida fanni biriktiring.')
  }
}

adminRouter.post('/groups', async (req, res) => {
  const { teacherId, ...data } = groupSchema.parse(req.body)
  if (!(await prisma.subject.findFirst({ where: { id: data.subjectId, active: true } }))) throw badRequest('Fan topilmadi yoki faol emas.')
  if (teacherId) {
    await assertActiveTeacher(teacherId, data.subjectId)
    await assertTeacherFree(teacherId, data)
  }
  const group = await prisma.group.create({ data: { ...data, ...(teacherId ? { teacherAssignment: { create: { teacherId } } } : {}) } })
  await audit(req.user!.id, 'group.create', 'Group', group.id, { name: group.name, teacherId: teacherId ?? null })
  res.status(201).json({ id: group.id })
})

adminRouter.patch('/groups/:id', async (req, res) => {
  const { teacherId, ...data } = groupPatchSchema.parse(req.body)
  const id = String(req.params.id)
  const existing = await prisma.group.findUnique({ where: { id } })
  if (!existing) throw notFound('Guruh topilmadi.')
  if (teacherId) await assertActiveTeacher(teacherId, data.subjectId ?? existing.subjectId)
  const currentTeacher = teacherId ?? (await prisma.teacherAssignment.findUnique({ where: { groupId: id } }))?.teacherId
  if (currentTeacher && (teacherId || data.lessonTime || data.daysOfWeek)) await assertTeacherFree(currentTeacher, { lessonTime: data.lessonTime ?? existing.lessonTime, daysOfWeek: data.daysOfWeek ?? existing.daysOfWeek }, id)
  await prisma.group.update({ where: { id }, data })
  if (teacherId) {
    await prisma.teacherAssignment.upsert({ where: { groupId: id }, create: { groupId: id, teacherId }, update: { teacherId, assignedAt: new Date() } })
  }
  await audit(req.user!.id, data.active === false ? 'group.deactivate' : 'group.update', 'Group', id, teacherId ? { teacherId } : undefined)
  res.json({ ok: true })
})

adminRouter.put('/groups/:id/teacher', async (req, res) => {
  const { teacherId } = z.object({ teacherId: z.string().nullable() }).parse(req.body)
  const id = String(req.params.id)
  const target = await prisma.group.findUnique({ where: { id } })
  if (!target) throw notFound('Guruh topilmadi.')
  if (teacherId) {
    await assertActiveTeacher(teacherId, target.subjectId)
    await assertTeacherFree(teacherId, target, id)
    await prisma.teacherAssignment.upsert({ where: { groupId: id }, create: { groupId: id, teacherId }, update: { teacherId, assignedAt: new Date() } })
  } else {
    await prisma.teacherAssignment.deleteMany({ where: { groupId: id } })
  }
  await audit(req.user!.id, 'group.assign_teacher', 'Group', id, { teacherId })
  res.json({ ok: true })
})

// ---- Reyting va shubhali baholar
adminRouter.get('/ratings', async (_req, res) => {
  const [students, teachers] = await Promise.all([studentBoard(), teacherCards({ includeInactive: false })])
  teachers.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
  res.json({
    students: students.slice(0, 50).map((student) => ({ rank: student.rank, id: student.id, name: `${student.firstName} ${student.lastName}`, points: student.points, presentCount: student.presentCount })),
    teachers: teachers.map((teacher, index) => ({ rank: index + 1, ...teacher })),
  })
})

// Shubhali baho qoidalari:
//  1) o'quvchi kelmagan (qatnashish bali 0), lekin faollik+topshiriq >= 18;
//  2) bir kunda guruhdagi (kamida 3 ta) barcha o'quvchiga to'liq 30 ball qo'yilgan.
adminRouter.get('/suspicious', async (_req, res) => {
  const [absentHigh, perfect] = await Promise.all([
    prisma.assessment.findMany({
      where: { attendanceScore: 0 },
      orderBy: { date: 'desc' },
      take: 300,
      include: { student: { select: { firstName: true, lastName: true } }, teacher: { select: { firstName: true, lastName: true } }, group: true },
    }),
    prisma.assessment.groupBy({ by: ['groupId', 'date', 'teacherId'], where: { total: 30 }, _count: { _all: true }, having: { studentId: { _count: { gte: 3 } } } }),
  ])
  const groups = await prisma.group.findMany({ where: { id: { in: perfect.map((item) => item.groupId) } }, include: { _count: { select: { memberships: true } } } })
  const groupById = new Map<string, any>(groups.map((group) => [group.id, group]))
  const teachers = await prisma.user.findMany({ where: { id: { in: perfect.map((item) => item.teacherId) } }, select: { id: true, firstName: true, lastName: true } })
  const teacherById = new Map<string, any>(teachers.map((teacher) => [teacher.id, teacher]))
  res.json({
    items: [
      ...absentHigh
        .filter((item) => item.activityScore + item.homeworkScore >= 18)
        .slice(0, 50)
        .map((item) => ({ id: item.id, reason: 'Kelmagan o‘quvchiga yuqori ball qo‘yilgan', date: item.date, student: `${item.student.firstName} ${item.student.lastName}`, teacher: `${item.teacher.firstName} ${item.teacher.lastName}`, group: item.group.name, total: item.total })),
      ...perfect
        .filter((item) => item._count._all >= (groupById.get(item.groupId)?._count.memberships ?? 0) && item._count._all >= 3)
        .map((item) => ({ id: `${item.groupId}-${item.date.toISOString()}`, reason: 'Guruhdagi barcha o‘quvchiga to‘liq ball qo‘yilgan', date: item.date, student: `${item._count._all} ta o‘quvchi`, teacher: teacherById.has(item.teacherId) ? `${teacherById.get(item.teacherId)!.firstName} ${teacherById.get(item.teacherId)!.lastName}` : '', group: groupById.get(item.groupId)?.name ?? '', total: 30 })),
    ],
  })
})

adminRouter.get('/audit', async (req, res) => {
  const { limit } = z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) }).parse(req.query)
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: limit, include: { actor: { select: { firstName: true, lastName: true, role: true } } } })
  res.json({ logs: logs.map((log) => ({ id: log.id, action: log.action, entity: log.entity, entityId: log.entityId, meta: log.meta, createdAt: log.createdAt, actor: log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : 'Tizim', actorRole: log.actor?.role ?? null })) })
})
