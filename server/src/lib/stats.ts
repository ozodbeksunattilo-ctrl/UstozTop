import { prisma } from './prisma.js'
import { rankStudents, type Ranked } from './ranking.js'

// Reyting har safar bazadagi baholar va davomatdan hisoblanadi (alohida saqlanadigan nusxa yo'q),
// shuning uchun ball o'zgarganda reyting avtomatik yangilanadi.
export async function studentBoard(options: { groupId?: string; studentIds?: string[] } = {}): Promise<Ranked[]> {
  const { groupId, studentIds } = options
  const students = await prisma.user.findMany({
    where: {
      role: 'STUDENT',
      status: 'ACTIVE',
      ...(groupId ? { memberships: { some: { groupId } } } : {}),
      ...(studentIds ? { id: { in: studentIds } } : {}),
    },
    select: { id: true, firstName: true, lastName: true, createdAt: true },
  })
  const ids = students.map((student) => student.id)
  const [sums, presents] = await Promise.all([
    prisma.assessment.groupBy({ by: ['studentId'], where: { studentId: { in: ids }, ...(groupId ? { groupId } : {}) }, _sum: { total: true } }),
    prisma.attendance.groupBy({ by: ['studentId'], where: { studentId: { in: ids }, present: true, ...(groupId ? { groupId } : {}) }, _count: { _all: true } }),
  ])
  const pointsById = new Map(sums.map((row) => [row.studentId, row._sum.total ?? 0]))
  const presentById = new Map(presents.map((row) => [row.studentId, row._count._all]))
  return rankStudents(
    students.map((student) => ({
      ...student,
      points: pointsById.get(student.id) ?? 0,
      presentCount: presentById.get(student.id) ?? 0,
    })),
  )
}

export interface TeacherCard {
  id: string
  firstName: string
  lastName: string
  fullName: string
  avatarColor: string | null
  qualification: string
  experienceYears: number
  bio: string
  rating: number
  reviewCount: number
  subjects: { id: string; name: string; color: string; icon: string }[]
  groupCount: number
  studentCount: number
}

export async function teacherCards(filter: { query?: string; subjectId?: string; teacherId?: string; includeInactive?: boolean } = {}): Promise<TeacherCard[]> {
  const query = filter.query?.trim()
  const teachers = await prisma.user.findMany({
    where: {
      role: 'TEACHER',
      status: filter.includeInactive ? undefined : 'ACTIVE',
      ...(filter.teacherId ? { id: filter.teacherId } : {}),
      ...(query ? { OR: [{ firstName: { contains: query, mode: 'insensitive' } }, { lastName: { contains: query, mode: 'insensitive' } }] } : {}),
      ...(filter.subjectId ? { assignments: { some: { group: { subjectId: filter.subjectId, active: true } } } } : {}),
    },
    include: {
      teacherProfile: true,
      assignments: { include: { group: { include: { subject: true, _count: { select: { memberships: true } } } } } },
    },
  })
  const reviews = await prisma.teacherReview.groupBy({ by: ['teacherId'], where: { teacherId: { in: teachers.map((teacher) => teacher.id) } }, _avg: { rating: true }, _count: { _all: true } })
  const reviewById = new Map(reviews.map((row) => [row.teacherId, row]))
  return teachers.map((teacher) => {
    const activeGroups = teacher.assignments.map((item) => item.group).filter((group) => group.active)
    const subjects = new Map(activeGroups.map((group) => [group.subject.id, { id: group.subject.id, name: group.subject.name, color: group.subject.color, icon: group.subject.icon }]))
    const review = reviewById.get(teacher.id)
    return {
      id: teacher.id,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      fullName: `${teacher.firstName} ${teacher.lastName}`,
      avatarColor: teacher.avatarColor,
      qualification: teacher.teacherProfile?.qualification ?? '',
      experienceYears: teacher.teacherProfile?.experienceYears ?? 0,
      bio: teacher.teacherProfile?.bio ?? '',
      rating: review?._avg.rating ? Math.round(review._avg.rating * 10) / 10 : 0,
      reviewCount: review?._count._all ?? 0,
      subjects: [...subjects.values()],
      groupCount: activeGroups.length,
      studentCount: activeGroups.reduce((sum, group) => sum + group._count.memberships, 0),
    }
  })
}
