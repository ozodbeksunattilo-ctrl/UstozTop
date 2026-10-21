import { Router } from 'express'
import { z } from 'zod'
import { badRequest, conflict, forbidden, notFound } from '../lib/http.js'
import { prisma } from '../lib/prisma.js'
import { localDateKey, notifyOnce } from '../lib/notify.js'
import { shortName } from '../lib/ranking.js'
import { assertStudentFree } from '../lib/schedule.js'
import { studentBoard, teacherCards } from '../lib/stats.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { reviewSchema } from '../lib/validation.js'

// Barcha tizimga kirgan foydalanuvchilar uchun: ustozlar, fanlar, guruhlar, reytinglar.
export const catalogRouter = Router()
catalogRouter.use(requireAuth)

const groupInclude = {
  subject: true,
  teacherAssignment: { include: { teacher: { select: { id: true, firstName: true, lastName: true } } } },
  _count: { select: { memberships: true } },
} as const

catalogRouter.get('/subjects', async (_req, res) => {
  const subjects = await prisma.subject.findMany({ where: { active: true }, orderBy: { name: 'asc' }, include: { _count: { select: { groups: true } } } })
  res.json({ subjects })
})

catalogRouter.get('/teachers', async (req, res) => {
  const { query, subjectId, sort } = z.object({ query: z.string().optional(), subjectId: z.string().optional(), sort: z.enum(['rating', 'name', 'experience']).default('rating') }).parse(req.query)
  const teachers = await teacherCards({ query, subjectId })
  teachers.sort((a, b) => {
    if (sort === 'name') return a.fullName.localeCompare(b.fullName, 'uz')
    if (sort === 'experience') return b.experienceYears - a.experienceYears
    return b.rating - a.rating || b.reviewCount - a.reviewCount || a.fullName.localeCompare(b.fullName, 'uz')
  })
  res.json({ teachers })
})

catalogRouter.get('/teachers/:id', async (req, res) => {
  const [teacher] = await teacherCards({ teacherId: req.params.id })
  if (!teacher) throw notFound('Ustoz topilmadi.')
  const [groups, reviews, myReview] = await Promise.all([
    prisma.group.findMany({ where: { active: true, teacherAssignment: { teacherId: teacher.id } }, include: groupInclude, orderBy: { name: 'asc' } }),
    prisma.teacherReview.findMany({ where: { teacherId: teacher.id }, orderBy: { createdAt: 'desc' }, take: 20, include: { student: { select: { firstName: true, lastName: true } } } }),
    prisma.teacherReview.findUnique({ where: { studentId_teacherId: { studentId: req.user!.id, teacherId: teacher.id } } }),
  ])
  res.json({
    teacher,
    groups: groups.map((group) => formatGroup(group, req.user!.id)),
    reviews: reviews.map((review) => ({ id: review.id, rating: review.rating, comment: review.comment, author: shortName(review.student.firstName, review.student.lastName), createdAt: review.createdAt })),
    myReview: myReview ? { rating: myReview.rating, comment: myReview.comment } : null,
  })
})

// Ustozga baho: faqat o'quvchi, faqat o'zi shu ustozning guruhida o'qigan bo'lsa.
catalogRouter.post('/teachers/:id/reviews', requireRole('STUDENT'), async (req, res) => {
  const data = reviewSchema.parse(req.body)
  const teacherId = String(req.params.id)
  const studied = await prisma.groupMembership.findFirst({ where: { studentId: req.user!.id, group: { teacherAssignment: { teacherId } } } })
  if (!studied) throw forbidden('Ustozga baho berish uchun uning guruhiga a’zo bo‘lishingiz kerak.')
  const review = await prisma.teacherReview.upsert({
    where: { studentId_teacherId: { studentId: req.user!.id, teacherId } },
    create: { studentId: req.user!.id, teacherId, rating: data.rating, comment: data.comment },
    update: { rating: data.rating, comment: data.comment },
  })
  res.status(201).json({ review })
})

type GroupWithRelations = Awaited<ReturnType<typeof prisma.group.findMany<{ include: typeof groupInclude }>>>[number]

function formatGroup(group: GroupWithRelations, viewerId?: string, joinedIds?: Set<string>, requestedIds?: Set<string>) {
  const teacher = group.teacherAssignment?.teacher
  return {
    id: group.id,
    name: group.name,
    subject: { id: group.subject.id, name: group.subject.name, color: group.subject.color, icon: group.subject.icon },
    teacher: teacher ? { id: teacher.id, fullName: `${teacher.firstName} ${teacher.lastName}` } : null,
    lessonTime: group.lessonTime,
    daysOfWeek: group.daysOfWeek,
    capacity: group.capacity,
    memberCount: group._count.memberships,
    full: group._count.memberships >= group.capacity,
    joined: joinedIds ? joinedIds.has(group.id) : undefined,
    requested: requestedIds ? requestedIds.has(group.id) : undefined,
    membership: joinedIds && requestedIds ? (joinedIds.has(group.id) ? 'member' : requestedIds.has(group.id) ? 'pending' : 'none') : undefined,
    viewerId,
  }
}

catalogRouter.get('/groups', async (req, res) => {
  const { subjectId } = z.object({ subjectId: z.string().optional() }).parse(req.query)
  const [groups, joined, requested] = await Promise.all([
    prisma.group.findMany({ where: { active: true, ...(subjectId ? { subjectId } : {}), subject: { active: true }, teacherAssignment: { teacher: { status: 'ACTIVE' } } }, include: groupInclude, orderBy: [{ subject: { name: 'asc' } }, { name: 'asc' }] }),
    req.user!.role === 'STUDENT' ? prisma.groupMembership.findMany({ where: { studentId: req.user!.id }, select: { groupId: true } }) : Promise.resolve([]),
    req.user!.role === 'STUDENT' ? prisma.joinRequest.findMany({ where: { studentId: req.user!.id, status: 'PENDING' }, select: { groupId: true } }) : Promise.resolve([]),
  ])
  const joinedIds = new Set(joined.map((item) => item.groupId))
  const requestedIds = new Set(requested.map((item) => item.groupId))
  res.json({ groups: groups.filter((group) => group.teacherAssignment).map((group) => ({ ...formatGroup(group, undefined, joinedIds, requestedIds), viewerId: undefined })) })
})

catalogRouter.post('/groups/:id/join', requireRole('STUDENT'), async (req, res) => {
  const groupId = String(req.params.id)
  const group = await prisma.group.findUnique({ where: { id: groupId }, include: { _count: { select: { memberships: true } }, teacherAssignment: { include: { teacher: true } } } })
  if (!group || !group.active) throw notFound('Guruh topilmadi.')
  if (!group.teacherAssignment) throw badRequest('Bu guruhga hali ustoz biriktirilmagan.')
  if (group.teacherAssignment.teacher.status !== 'ACTIVE') throw badRequest('Bu guruh ustozi hozir faol emas, qo‘shilib bo‘lmaydi.')
  const existing = await prisma.groupMembership.findUnique({ where: { groupId_studentId: { groupId, studentId: req.user!.id } } })
  if (existing) throw conflict('Siz bu guruhga allaqachon a’zosiz.')
  if (group._count.memberships >= group.capacity) throw conflict('Guruh to‘lgan.')
  const pending = await prisma.joinRequest.findUnique({ where: { groupId_studentId: { groupId, studentId: req.user!.id } } })
  if (pending?.status === 'PENDING') throw conflict('So‘rovingiz yuborilgan, ustoz javobini kuting.')
  await assertStudentFree(req.user!.id, group, { includePending: true })
  // Guruhga to'g'ridan-to'g'ri qo'shilib bo'lmaydi: so'rov ustozga boradi va u tasdiqlagach o'quvchi qabul qilinadi.
  await prisma.joinRequest.upsert({
    where: { groupId_studentId: { groupId, studentId: req.user!.id } },
    create: { groupId, studentId: req.user!.id },
    update: { status: 'PENDING', decidedAt: null, createdAt: new Date() },
  })
  await prisma.notification.create({ data: { userId: group.teacherAssignment.teacherId, title: 'Yangi qo‘shilish so‘rovi', body: `${req.user!.firstName} ${req.user!.lastName} "${group.name}" guruhiga qo‘shilishni so‘radi. So‘rovlar bo‘limida tasdiqlang.` } })
  res.status(201).json({ ok: true, requested: true })
})

catalogRouter.delete('/groups/:id/join', requireRole('STUDENT'), async (req, res) => {
  // a'zolikdan chiqish yoki yuborilgan so'rovni bekor qilish
  await prisma.groupMembership.deleteMany({ where: { groupId: String(req.params.id), studentId: req.user!.id } })
  await prisma.joinRequest.deleteMany({ where: { groupId: String(req.params.id), studentId: req.user!.id, status: 'PENDING' } })
  res.json({ ok: true })
})

// Reytinglar: o'quvchilar umumiy yoki guruh bo'yicha; ustozlar baholar bo'yicha.
catalogRouter.get('/ratings/students', async (req, res) => {
  let { groupId } = z.object({ groupId: z.string().optional() }).parse(req.query)
  const user = req.user!
  if (user.role === 'STUDENT') {
    // O'quvchi umumiy reytingni ko'rmaydi: har bir fan guruhi uchun alohida, faqat a'zo bo'lgan guruhlari.
    const memberships = await prisma.groupMembership.findMany({ where: { studentId: user.id }, select: { groupId: true }, orderBy: { joinedAt: 'asc' } })
    if (!memberships.length) {
      res.json({ total: 0, students: [], me: null, groupId: null })
      return
    }
    if (!groupId || !memberships.some((item) => item.groupId === groupId)) groupId = memberships[0].groupId
  }
  if (groupId) {
    // guruh reytingini faqat uning a'zosi, shu guruh ustozi yoki admin ko'ra oladi
    const allowed =
      user.role === 'ADMIN' ||
      (user.role === 'STUDENT' && (await prisma.groupMembership.findUnique({ where: { groupId_studentId: { groupId, studentId: user.id } } }))) ||
      (user.role === 'TEACHER' && (await prisma.teacherAssignment.findFirst({ where: { groupId, teacherId: user.id } })))
    if (!allowed) throw forbidden()
  }
  const board = await studentBoard({ groupId })
  const rows = board.map((student) => ({
    rank: student.rank,
    id: student.id,
    // o'quvchilar bir-birining to'liq ismini ko'rmaydi: "Ali V."
    name: user.role === 'STUDENT' && student.id !== user.id ? shortName(student.firstName, student.lastName) : `${student.firstName} ${student.lastName}`,
    points: student.points,
    presentCount: student.presentCount,
    me: student.id === user.id,
  }))
  res.json({ total: rows.length, students: rows.slice(0, 50), me: rows.find((row) => row.me) ?? null, groupId: groupId ?? null })
})

catalogRouter.get('/ratings/teachers', async (_req, res) => {
  const teachers = await teacherCards()
  teachers.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount || a.fullName.localeCompare(b.fullName, 'uz'))
  res.json({ teachers: teachers.map((teacher, index) => ({ rank: index + 1, ...teacher })) })
})

// Bugun dars bo'lgan guruhlar uchun o'quvchiga eslatma (kuniga bir marta): masalan, bugun ingliz tili darsi bo'lsa — xabarnoma keladi.
async function ensureLessonReminders(studentId: string) {
  const now = new Date()
  const today = now.getDay()
  const key = localDateKey(now)
  const memberships = await prisma.groupMembership.findMany({
    where: { studentId, group: { active: true } },
    include: { group: { include: { subject: true, teacherAssignment: { include: { teacher: { select: { firstName: true, lastName: true } } } } } } },
  })
  await notifyOnce(
    memberships
      .filter(({ group }) => group.daysOfWeek.includes(today))
      .map(({ group }) => ({
        userId: studentId,
        title: `Bugun ${group.subject.name} darsi bor`,
        body: `Soat ${group.lessonTime} da "${group.name}" darsi${group.teacherAssignment ? ` — ustoz ${group.teacherAssignment.teacher.firstName} ${group.teacherAssignment.teacher.lastName}` : ''}. Tayyorlaning!`,
        dedupeKey: `lesson:${group.id}:${studentId}:${key}`,
      })),
  )
}

catalogRouter.get('/notifications', async (req, res) => {
  if (req.user!.role === 'STUDENT') await ensureLessonReminders(req.user!.id)
  const notifications = await prisma.notification.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 30 })
  res.json({ notifications, unread: notifications.filter((item) => !item.read).length })
})

catalogRouter.post('/notifications/read', async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user!.id, read: false }, data: { read: true } })
  res.json({ ok: true })
})
