// Reyting qoidasi (hamma o'quvchiga bir xil):
//  1) umumiy ball (barcha baholar yig'indisi) — kattasi yuqorida;
//  2) teng bo'lsa — kelgan darslar soni ko'proq;
//  3) yana teng bo'lsa — platformaga oldin qo'shilgan;
//  4) yana teng bo'lsa — familiya, keyin ism bo'yicha alifbo tartibi;
//  5) hamma narsa teng bo'lsa — id bo'yicha (natija doim bir xil chiqishi uchun).
export interface RankInput {
  id: string
  firstName: string
  lastName: string
  createdAt: Date
  points: number
  presentCount: number
}

export interface Ranked extends RankInput {
  rank: number
}

export function compareStudents(a: RankInput, b: RankInput): number {
  if (b.points !== a.points) return b.points - a.points
  if (b.presentCount !== a.presentCount) return b.presentCount - a.presentCount
  const byDate = a.createdAt.getTime() - b.createdAt.getTime()
  if (byDate !== 0) return byDate
  return a.lastName.localeCompare(b.lastName, 'uz') || a.firstName.localeCompare(b.firstName, 'uz') || a.id.localeCompare(b.id)
}

export function rankStudents(students: RankInput[]): Ranked[] {
  return [...students].sort(compareStudents).map((student, index) => ({ ...student, rank: index + 1 }))
}

export function shortName(firstName: string, lastName: string) {
  return `${firstName} ${lastName.charAt(0)}.`
}

// Baho jami balli: har bir mezon chegaradan oshmaydi.
export function clampScore(value: number, max: number) {
  return Math.max(0, Math.min(max, Math.round(value)))
}

export function startOfDay(input: string | Date) {
  const date = typeof input === 'string' ? new Date(`${input}T00:00:00.000Z`) : new Date(input)
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export function todayUTC() {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
}
