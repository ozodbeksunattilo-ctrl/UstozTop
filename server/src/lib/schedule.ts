import { conflict } from './http.js'
import { prisma } from './prisma.js'

// Dars davomiyligi: shu vaqt ichida boshlangan ikkita dars bir kunda to'qnashgan hisoblanadi.
const LESSON_MINUTES = 60

export interface Slot {
  lessonTime: string
  daysOfWeek: number[]
}

const minutes = (time: string) => {
  const [hours, mins] = time.split(':').map(Number)
  return hours * 60 + mins
}

export function overlaps(a: Slot, b: Slot) {
  return a.daysOfWeek.some((day) => b.daysOfWeek.includes(day)) && Math.abs(minutes(a.lessonTime) - minutes(b.lessonTime)) < LESSON_MINUTES
}

const describe = (group: Slot & { name: string }) => `"${group.name}" (${group.lessonTime})`

// O'quvchi a'zo bo'lgan yoki so'rov yuborgan guruhlar bilan vaqt to'qnashuvi.
export async function assertStudentFree(studentId: string, slot: Slot, options: { ignoreGroupId?: string; includePending?: boolean } = {}) {
  const [memberships, requests] = await Promise.all([
    prisma.groupMembership.findMany({ where: { studentId, group: { active: true } }, include: { group: true } }),
    options.includePending ? prisma.joinRequest.findMany({ where: { studentId, status: 'PENDING', group: { active: true } }, include: { group: true } }) : Promise.resolve([]),
  ])
  const clash = [...memberships.map((item) => item.group), ...requests.map((item) => item.group)].find((group) => group.id !== options.ignoreGroupId && overlaps(group, slot))
  if (clash) throw conflict(`Bu guruh dars vaqti ${describe(clash)} bilan to‘qnashadi.`)
}

// Ustoz bir vaqtda ikkita guruhda dars bera olmaydi.
export async function assertTeacherFree(teacherId: string, slot: Slot, ignoreGroupId?: string) {
  const assignments = await prisma.teacherAssignment.findMany({ where: { teacherId, group: { active: true } }, include: { group: true } })
  const clash = assignments.map((item) => item.group).find((group) => group.id !== ignoreGroupId && overlaps(group, slot))
  if (clash) throw conflict(`Ustozning ${describe(clash)} darsi shu vaqtga to‘g‘ri keladi.`)
}
