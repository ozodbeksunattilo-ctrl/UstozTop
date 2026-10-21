import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { studentBoard } from '../lib/stats.js'
import { requireRole } from '../middleware/auth.js'

// O'quvchi faqat o'zining ma'lumotlarini ko'radi: barcha so'rovlar req.user.id bilan cheklangan.
export const studentRouter = Router()
studentRouter.use(requireRole('STUDENT'))

const percent = (value: number, max: number) => (max ? Math.round((value / max) * 100) : 0)

studentRouter.get('/dashboard', async (req, res) => {
  const studentId = req.user!.id
  const [memberships, assessments, attendances, requests] = await Promise.all([
    prisma.groupMembership.findMany({
      where: { studentId },
      include: { group: { include: { subject: true, teacherAssignment: { include: { teacher: { select: { id: true, firstName: true, lastName: true, avatarColor: true } } } } } } },
    }),
    prisma.assessment.findMany({ where: { studentId }, orderBy: { date: 'desc' }, include: { group: { include: { subject: true } } } }),
    prisma.attendance.findMany({ where: { studentId } }),
    prisma.joinRequest.findMany({ where: { studentId, status: 'PENDING' }, include: { group: { include: { subject: true } } } }),
  ])
  // Reyting har bir fan guruhi ichida alohida hisoblanadi (inglizcha va matematika reytinglari aralashmaydi).
  const boards = new Map<string, any>(await Promise.all(memberships.map(async ({ group }) => [group.id, await studentBoard({ groupId: group.id })] as const)))
  const presentCount = attendances.filter((item) => item.present).length
  const avg = (key: 'activityScore' | 'homeworkScore') => (assessments.length ? assessments.reduce((sum, item) => sum + item[key], 0) / assessments.length : 0)
  const today = new Date().getDay()

  const groups = memberships.map(({ group }) => {
    const mine = assessments.filter((item) => item.groupId === group.id)
    const lessonsHeld = attendances.filter((item) => item.groupId === group.id).length
    const teacher = group.teacherAssignment?.teacher
    const board = boards.get(group.id) ?? []
    const mineRow = board.find((row) => row.id === studentId)
    return {
      id: group.id,
      rank: mineRow?.rank ?? null,
      totalStudents: board.length,
      name: group.name,
      subject: { id: group.subject.id, name: group.subject.name, color: group.subject.color, icon: group.subject.icon, topics: group.subject.topics, symbols: group.subject.symbols, category: group.subject.category },
      teacher: teacher ? { id: teacher.id, fullName: `${teacher.firstName} ${teacher.lastName}`, avatarColor: teacher.avatarColor } : null,
      lessonTime: group.lessonTime,
      daysOfWeek: group.daysOfWeek,
      totalLessons: group.subject.totalLessons,
      lessonsHeld,
      progress: percent(lessonsHeld, group.subject.totalLessons),
      points: mine.reduce((sum, item) => sum + item.total, 0),
      averageScore: mine.length ? Math.round((mine.reduce((sum, item) => sum + item.total, 0) / mine.length) * 10) / 10 : 0,
    }
  })

  res.json({
    stats: {
      points: assessments.reduce((sum, item) => sum + item.total, 0),
      rank: (groups as any[]).reduce<number | null>((best, group) => (group.rank && (best === null || group.rank < best) ? group.rank : best), null),
      totalStudents: groups.reduce((max, group) => Math.max(max, group.totalStudents), 0),
      attendancePercent: percent(presentCount, attendances.length),
      activityPercent: Math.round(avg('activityScore') * 10),
      homeworkPercent: Math.round(avg('homeworkScore') * 10),
      assessmentCount: assessments.length,
    },
    groups,
    pendingRequests: requests.map((item) => ({ id: item.id, groupId: item.groupId, groupName: item.group.name, subject: item.group.subject.name, color: item.group.subject.color, createdAt: item.createdAt })),
    todayLessons: groups.filter((group) => group.daysOfWeek.includes(today)),
    recentResults: assessments.slice(0, 6).map((item) => ({
      id: item.id,
      date: item.date,
      subject: item.group.subject.name,
      color: item.group.subject.color,
      total: item.total,
      max: 30,
      attendanceScore: item.attendanceScore,
      activityScore: item.activityScore,
      homeworkScore: item.homeworkScore,
    })),
  })
})

studentRouter.get('/results', async (req, res) => {
  const studentId = req.user!.id
  const [assessments, attendances] = await Promise.all([
    prisma.assessment.findMany({ where: { studentId }, orderBy: { date: 'desc' }, take: 100, include: { group: { include: { subject: true } } } }),
    prisma.attendance.findMany({ where: { studentId }, orderBy: { date: 'desc' }, take: 100, include: { group: { include: { subject: true } } } }),
  ])
  res.json({
    assessments: assessments.map((item) => ({ id: item.id, date: item.date, subjectId: item.group.subject.id, groupId: item.groupId, subject: item.group.subject.name, group: item.group.name, attendanceScore: item.attendanceScore, activityScore: item.activityScore, homeworkScore: item.homeworkScore, total: item.total, note: item.note })),
    attendances: attendances.map((item) => ({ id: item.id, date: item.date, subjectId: item.group.subject.id, groupId: item.groupId, subject: item.group.subject.name, group: item.group.name, present: item.present })),
  })
})
