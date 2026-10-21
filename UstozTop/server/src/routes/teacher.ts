import { Router } from 'express'
import { z } from 'zod'
import { config } from '../config.js'
import { badRequest, forbidden, notFound } from '../lib/http.js'
import { prisma } from '../lib/prisma.js'
import { clampScore, startOfDay, todayUTC } from '../lib/ranking.js'
import { notifyOnce } from '../lib/notify.js'
import { assertStudentFree } from '../lib/schedule.js'
import { studentBoard } from '../lib/stats.js'
import { assessmentSchema, attendanceSchema, splitIdentifier, teacherProfileSchema } from '../lib/validation.js'
import { requireRole } from '../middleware/auth.js'

// Ustoz faqat o'ziga biriktirilgan guruhlarni boshqaradi (har bir so'rovda tekshiriladi).
export const teacherRouter = Router()
teacherRouter.use(requireRole('TEACHER'))

async function ownGroup(teacherId: string, groupId: string) {
  const group = await prisma.group.findFirst({
    where: { id: groupId, teacherAssignment: { teacherId } },
    include: { subject: true, memberships: { include: { student: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarColor: true, studentProfile: true } } } } },
  })
  if (!group) throw forbidden('Bu guruh sizga biriktirilmagan.')
  return group
}

const dateQuery = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() })

teacherRouter.get('/overview', async (req, res) => {
  const teacherId = req.user!.id
  const groups = await prisma.group.findMany({ where: { teacherAssignment: { teacherId }, active: true }, include: { subject: true, _count: { select: { memberships: true } } } })
  const groupIds = groups.map((group) => group.id)
  const [present, total, assessments, review] = await Promise.all([
    prisma.attendance.count({ where: { groupId: { in: groupIds }, present: true } }),
    prisma.attendance.count({ where: { groupId: { in: groupIds } } }),
    prisma.assessment.aggregate({ where: { groupId: { in: groupIds } }, _avg: { total: true }, _count: { _all: true } }),
    prisma.teacherReview.aggregate({ where: { teacherId }, _avg: { rating: true }, _count: { _all: true } }),
  ])
  const today = new Date().getDay()
  const pendingRequests = await prisma.joinRequest.count({ where: { status: 'PENDING', groupId: { in: groupIds } } })
  res.json({
    pendingRequests,
    groupCount: groups.length,
    studentCount: groups.reduce((sum, group) => sum + group._count.memberships, 0),
    attendancePercent: total ? Math.round((present / total) * 100) : 0,
    averageScore: Math.round((assessments._avg.total ?? 0) * 10) / 10,
    assessmentCount: assessments._count._all,
    rating: review._avg.rating ? Math.round(review._avg.rating * 10) / 10 : 0,
    reviewCount: review._count._all,
    todayGroups: groups.filter((group) => group.daysOfWeek.includes(today)).map((group) => ({ id: group.id, memberCount: group._count.memberships, name: group.name, subject: group.subject.name, lessonTime: group.lessonTime })),
  })
})

teacherRouter.get('/groups', async (req, res) => {
  const groups = await prisma.group.findMany({
    where: { teacherAssignment: { teacherId: req.user!.id } },
    include: { subject: true, _count: { select: { memberships: true } } },
    orderBy: { name: 'asc' },
  })
  res.json({
    groups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      active: group.active,
      subject: { id: group.subject.id, name: group.subject.name, color: group.subject.color, icon: group.subject.icon },
      lessonTime: group.lessonTime,
      daysOfWeek: group.daysOfWeek,
      capacity: group.capacity,
      memberCount: group._count.memberships,
    })),
  })
})

teacherRouter.get('/groups/:id', async (req, res) => {
  const group = await ownGroup(req.user!.id, String(req.params.id))
  const board = await studentBoard({ groupId: group.id })
  const byId = new Map(board.map((row) => [row.id, row]))
  res.json({
    group: { id: group.id, name: group.name, subject: group.subject.name, lessonTime: group.lessonTime, daysOfWeek: group.daysOfWeek, capacity: group.capacity },
    students: group.memberships.map(({ student }) => ({
      id: student.id,
      fullName: `${student.firstName} ${student.lastName}`,
      email: student.email,
      phone: student.phone,
      avatarColor: student.avatarColor,
      grade: student.studentProfile?.grade ?? '',
      points: byId.get(student.id)?.points ?? 0,
      rank: byId.get(student.id)?.rank ?? null,
      presentCount: byId.get(student.id)?.presentCount ?? 0,
    })),
  })
})

// O'quvchini guruhga qo'shish: email yoki telefon bo'yicha (faqat o'z guruhiga).
teacherRouter.post('/groups/:id/students', async (req, res) => {
  const group = await ownGroup(req.user!.id, String(req.params.id))
  const { identifier } = z.object({ identifier: z.string().trim().min(3) }).parse(req.body)
  const contact = splitIdentifier(identifier)
  const student = contact.email || contact.phone ? await prisma.user.findFirst({ where: { role: 'STUDENT', status: 'ACTIVE', ...(contact.email ? { email: contact.email } : { phone: contact.phone }) } }) : null
  if (!student) throw notFound('Bunday o‘quvchi topilmadi.')
  if (group.memberships.some((item) => item.studentId === student.id)) throw badRequest('O‘quvchi allaqachon guruhda.')
  if (group.memberships.length >= group.capacity) throw badRequest('Guruh to‘lgan.')
  await prisma.groupMembership.create({ data: { groupId: group.id, studentId: student.id } })
  await prisma.notification.create({ data: { userId: student.id, title: 'Guruhga qo‘shildingiz', body: `Sizni "${group.name}" guruhiga qo‘shishdi.` } })
  res.status(201).json({ ok: true })
})

teacherRouter.delete('/groups/:id/students/:studentId', async (req, res) => {
  const group = await ownGroup(req.user!.id, String(req.params.id))
  await prisma.groupMembership.deleteMany({ where: { groupId: group.id, studentId: String(req.params.studentId) } })
  res.json({ ok: true })
})

teacherRouter.get('/students', async (req, res) => {
  const { query } = z.object({ query: z.string().optional() }).parse(req.query)
  const memberships = await prisma.groupMembership.findMany({
    where: {
      group: { teacherAssignment: { teacherId: req.user!.id } },
      ...(query ? { student: { OR: [{ firstName: { contains: query, mode: 'insensitive' } }, { lastName: { contains: query, mode: 'insensitive' } }, { email: { contains: query, mode: 'insensitive' } }] } } : {}),
    },
    include: { group: { include: { subject: true } }, student: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarColor: true, studentProfile: true } } },
  })
  res.json({
    students: memberships.map((item) => ({
      key: `${item.groupId}:${item.studentId}`,
      id: item.student.id,
      fullName: `${item.student.firstName} ${item.student.lastName}`,
      email: item.student.email,
      phone: item.student.phone,
      grade: item.student.studentProfile?.grade ?? '',
      groupId: item.groupId,
      group: item.group.name,
      subject: item.group.subject.name,
      lessonTime: item.group.lessonTime,
    })),
  })
})

// O'quvchi profili: faqat ustozning o'z guruhlaridagi natijalar ko'rinadi.
teacherRouter.get('/students/:id', async (req, res) => {
  const studentId = String(req.params.id)
  const shared = await prisma.groupMembership.findMany({ where: { studentId, group: { teacherAssignment: { teacherId: req.user!.id } } }, select: { groupId: true } })
  if (!shared.length) throw forbidden('Bu o‘quvchi sizning guruhingizda emas.')
  const groupIds = shared.map((item) => item.groupId)
  const [student, assessments, attendances] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: studentId }, select: { id: true, firstName: true, lastName: true, email: true, phone: true, studentProfile: true } }),
    prisma.assessment.findMany({ where: { studentId, groupId: { in: groupIds } }, orderBy: { date: 'desc' }, take: 50, include: { group: { include: { subject: true } } } }),
    prisma.attendance.findMany({ where: { studentId, groupId: { in: groupIds } }, orderBy: { date: 'desc' }, take: 50 }),
  ])
  res.json({
    student: { id: student.id, fullName: `${student.firstName} ${student.lastName}`, email: student.email, phone: student.phone, grade: student.studentProfile?.grade ?? '' },
    assessments: assessments.map((item) => ({ id: item.id, date: item.date, subject: item.group.subject.name, attendanceScore: item.attendanceScore, activityScore: item.activityScore, homeworkScore: item.homeworkScore, total: item.total, note: item.note })),
    attendance: { present: attendances.filter((item) => item.present).length, total: attendances.length },
  })
})

teacherRouter.get('/groups/:id/attendance', async (req, res) => {
  const group = await ownGroup(req.user!.id, String(req.params.id))
  const { date } = dateQuery.parse(req.query)
  const day = date ? startOfDay(date) : todayUTC()
  const records = await prisma.attendance.findMany({ where: { groupId: group.id, date: day } })
  res.json({ date: day.toISOString().slice(0, 10), records: records.map((item) => ({ studentId: item.studentId, present: item.present })) })
})

teacherRouter.put('/groups/:id/attendance', async (req, res) => {
  const group = await ownGroup(req.user!.id, String(req.params.id))
  const data = attendanceSchema.parse(req.body)
  const memberIds = new Set(group.memberships.map((item) => item.studentId))
  if (data.records.some((record) => !memberIds.has(record.studentId))) throw forbidden('Ro‘yxatda guruhga kirmaydigan o‘quvchi bor.')
  const date = startOfDay(data.date)
  await prisma.$transaction(
    data.records.flatMap((record) => {
      const ops: Promise<unknown>[] = [
        prisma.attendance.upsert({
          where: { groupId_studentId_date: { groupId: group.id, studentId: record.studentId, date } },
          create: { groupId: group.id, studentId: record.studentId, date, present: record.present, markedById: req.user!.id },
          update: { present: record.present, markedById: req.user!.id },
        }),
      ]
      // Davomat belgilanishi bilan o'sha kunga baho yozuvi ham yaratiladi/yangilanadi:
      // keldi = 10 ball, kelmadi = 0. Faollik va topshiriq bali keyin qo'yiladi — ball o'quvchi kabinetida darhol ko'rinadi.
      const attendanceScore = record.present ? config.maxCriterionScore : 0
      ops.push(
        prisma.assessment.upsert({
          where: { groupId_studentId_date: { groupId: group.id, studentId: record.studentId, date } },
          create: { groupId: group.id, studentId: record.studentId, teacherId: req.user!.id, date, attendanceScore, activityScore: 0, homeworkScore: 0, total: attendanceScore },
          update: { attendanceScore, teacherId: req.user!.id },
        }),
      )
      return ops
    }),
  )
  // update total: qatnashish bali o'zgarganda yig'indi ham moslanadi
  const rows = await prisma.assessment.findMany({ where: { groupId: group.id, date, studentId: { in: data.records.map((record) => record.studentId) } } })
  await prisma.$transaction(rows.map((row) => prisma.assessment.update({ where: { id: row.id }, data: { total: row.attendanceScore + row.activityScore + row.homeworkScore } })))
  const absent = data.records.filter((record) => !record.present)
  if (absent.length) {
    await notifyOnce(
      absent.map((record) => ({ userId: record.studentId, title: 'Darsga kelmadingiz', body: `${group.subject.name}: ${data.date} kungi darsda qatnashmagan deb belgilandingiz.`, dedupeKey: `absent:${group.id}:${record.studentId}:${data.date}` })),
    )
  }
  res.json({ ok: true })
})

teacherRouter.get('/groups/:id/assessments', async (req, res) => {
  const group = await ownGroup(req.user!.id, String(req.params.id))
  const { date } = dateQuery.parse(req.query)
  const day = date ? startOfDay(date) : todayUTC()
  const items = await prisma.assessment.findMany({ where: { groupId: group.id, date: day } })
  res.json({ date: day.toISOString().slice(0, 10), items })
})

// Baholash: qatnashish bali davomatdan avtomatik (keldi=10, kelmadi=0), faollik va topshiriq 0..10.
// Har bir yozuvda o'quvchi, ustoz, guruh va vaqt saqlanadi; reyting keyingi so'rovda yangilanadi.
teacherRouter.put('/groups/:id/assessments', async (req, res) => {
  const group = await ownGroup(req.user!.id, String(req.params.id))
  const data = assessmentSchema.parse(req.body)
  const memberIds = new Set(group.memberships.map((item) => item.studentId))
  if (data.items.some((item) => !memberIds.has(item.studentId))) throw forbidden('Ro‘yxatda guruhga kirmaydigan o‘quvchi bor.')
  const date = startOfDay(data.date)
  const attendance = await prisma.attendance.findMany({ where: { groupId: group.id, date } })
  const presentById = new Map(attendance.map((item) => [item.studentId, item.present]))
  await prisma.$transaction(
    data.items.map((item) => {
      const attendanceScore = presentById.get(item.studentId) ? config.maxCriterionScore : 0
      // kelmagan o'quvchi darsda faol bo'la olmaydi: faollik bali 0
      const activityScore = attendanceScore ? clampScore(item.activityScore, config.maxCriterionScore) : 0
      const homeworkScore = clampScore(item.homeworkScore, config.maxCriterionScore)
      const total = attendanceScore + activityScore + homeworkScore
      return prisma.assessment.upsert({
        where: { groupId_studentId_date: { groupId: group.id, studentId: item.studentId, date } },
        create: { groupId: group.id, studentId: item.studentId, teacherId: req.user!.id, date, attendanceScore, activityScore, homeworkScore, total, note: item.note },
        update: { teacherId: req.user!.id, attendanceScore, activityScore, homeworkScore, total, note: item.note },
      })
    }),
  )
  res.json({ ok: true })
})

teacherRouter.get('/ratings', async (req, res) => {
  const groups = await prisma.group.findMany({ where: { teacherAssignment: { teacherId: req.user!.id } }, include: { subject: true }, orderBy: { name: 'asc' } })
  const boards = await Promise.all(
    groups.map(async (group) => ({
      groupId: group.id,
      group: group.name,
      subject: group.subject.name,
      students: (await studentBoard({ groupId: group.id })).map((student) => ({ rank: student.rank, id: student.id, name: `${student.firstName} ${student.lastName}`, points: student.points, presentCount: student.presentCount })),
    })),
  )
  res.json({ boards })
})

// ---- Guruhga qo'shilish so'rovlari: o'quvchi so'raydi, ustoz tasdiqlaydi yoki rad etadi.
teacherRouter.get('/join-requests', async (req, res) => {
  const requests = await prisma.joinRequest.findMany({
    where: { status: 'PENDING', group: { teacherAssignment: { teacherId: req.user!.id } } },
    orderBy: { createdAt: 'asc' },
    include: { group: { include: { subject: true, _count: { select: { memberships: true } } } }, student: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarColor: true, studentProfile: true } } },
  })
  res.json({
    requests: requests.map((item) => ({
      id: item.id,
      createdAt: item.createdAt,
      student: { id: item.student.id, fullName: `${item.student.firstName} ${item.student.lastName}`, email: item.student.email, phone: item.student.phone, avatarColor: item.student.avatarColor, grade: item.student.studentProfile?.grade ?? '' },
      group: { id: item.group.id, name: item.group.name, subject: item.group.subject.name, color: item.group.subject.color, memberCount: item.group._count.memberships, capacity: item.group.capacity },
    })),
  })
})

teacherRouter.post('/join-requests/:id/:decision', async (req, res) => {
  const decision = z.enum(['approve', 'reject']).parse(req.params.decision)
  const request = await prisma.joinRequest.findFirst({
    where: { id: String(req.params.id), group: { teacherAssignment: { teacherId: req.user!.id } } },
    include: { group: { include: { subject: true, _count: { select: { memberships: true } } } } },
  })
  if (!request) throw notFound('So‘rov topilmadi.')
  if (request.status !== 'PENDING') throw badRequest('Bu so‘rov allaqachon ko‘rib chiqilgan.')
  if (decision === 'approve') {
    if (request.group._count.memberships >= request.group.capacity) throw badRequest('Guruh to‘lgan.')
    await assertStudentFree(request.studentId, request.group, { ignoreGroupId: request.groupId })
    await prisma.$transaction([
      prisma.groupMembership.upsert({ where: { groupId_studentId: { groupId: request.groupId, studentId: request.studentId } }, create: { groupId: request.groupId, studentId: request.studentId }, update: {} }),
      prisma.joinRequest.update({ where: { id: request.id }, data: { status: 'APPROVED', decidedAt: new Date() } }),
      prisma.notification.create({ data: { userId: request.studentId, title: 'So‘rovingiz tasdiqlandi', body: `"${request.group.name}" guruhiga qabul qilindingiz. Darslar ${request.group.lessonTime} da boshlanadi.` } }),
    ])
  } else {
    await prisma.$transaction([
      prisma.joinRequest.update({ where: { id: request.id }, data: { status: 'REJECTED', decidedAt: new Date() } }),
      prisma.notification.create({ data: { userId: request.studentId, title: 'So‘rov rad etildi', body: `"${request.group.name}" guruhiga qo‘shilish so‘rovingiz ustoz tomonidan rad etildi.` } }),
    ])
  }
  res.json({ ok: true })
})

teacherRouter.patch('/profile', async (req, res) => {
  const data = teacherProfileSchema.parse(req.body)
  const profile = await prisma.teacherProfile.upsert({ where: { userId: req.user!.id }, create: { userId: req.user!.id, ...data }, update: data })
  res.json({ profile })
})

teacherRouter.get('/profile', async (req, res) => {
  const [profile, subjects] = await Promise.all([
    prisma.teacherProfile.findUnique({ where: { userId: req.user!.id } }),
    prisma.teacherSubject.findMany({ where: { teacherId: req.user!.id }, include: { subject: true } }),
  ])
  res.json({ profile, subjects: subjects.map((item) => ({ id: item.subject.id, name: item.subject.name, color: item.subject.color, icon: item.subject.icon })) })
})
