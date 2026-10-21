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
  const [board, memberships, assessments, attendances] = await Promise.all([
    studentBoard(),
    prisma.groupMembership.findMany({
      where: { studentId },
      include: { group: { include: { subject: true, teacherAssignment: { include: { teacher: { select: { id: true, firstName: true, lastName: true, avatarColor: true } } } } } } },
    }),
    prisma.assessment.findMany({ where: { studentId }, orderBy: { date: 'desc' }, include: { group: { include: { subject: true } } } }),
    prisma.attendance.findMany({ where: { studentId } }),
  ])
  const me = board.find((row) => row.id === studentId)
  const presentCount = attendances.filter((item) => item.present).length
  const avg = (key: 'activityScore' | 'homeworkScore') => (assessments.length ? assessments.reduce((sum, item) => sum + item[key], 0) / assessments.length : 0)
  const today = new Date().getDay()

  const groups = memberships.map(({ group }) => {
    const mine = assessments.filter((item) => item.groupId === group.id)
    const lessonsHeld = attendances.filter((item) => item.groupId === group.id).length
    const teacher = group.teacherAssignment?.teacher
    return {
      id: group.id,
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
      points: me?.points ?? 0,
      rank: me?.rank ?? board.length + 1,
      totalStudents: board.length,
      attendancePercent: percent(presentCount, attendances.length),
      activityPercent: Math.round(avg('activityScore') * 10),
      homeworkPercent: Math.round(avg('homeworkScore') * 10),
      assessmentCount: assessments.length,
    },
    groups,
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
    assessments: assessments.map((item) => ({ id: item.id, date: item.date, subject: item.group.subject.name, group: item.group.name, attendanceScore: item.attendanceScore, activityScore: item.activityScore, homeworkScore: item.homeworkScore, total: item.total, note: item.note })),
    attendances: attendances.map((item) => ({ id: item.id, date: item.date, subject: item.group.subject.name, group: item.group.name, present: item.present })),
  })
})
