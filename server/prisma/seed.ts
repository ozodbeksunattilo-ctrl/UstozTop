// Boshlang'ich ma'lumotlar: birinchi admin (server tomonida yaratiladi) va taqdimot uchun demo ma'lumotlar.
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import 'dotenv/config'

const prisma = new PrismaClient()
const hash = (value: string) => bcrypt.hash(value, 12)

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@ustoztop.uz').toLowerCase()
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'UstozTopAdmin26!'
const TEACHER_PASSWORD = 'UstozTop2026!'
const STUDENT_PASSWORD = 'Student2026!'

function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const TEACHERS = [
  { key: 'sardor-rahimov', first: 'Sardor', last: 'Rahimov', email: 'ustoz@ustoztop.uz', years: 8, color: '#e6a878' },
  { key: 'madina-alieva', first: 'Madina', last: 'Alieva', email: 'madina@ustoztop.uz', years: 6, color: '#c795df' },
  { key: 'dilshod-usmonov', first: 'Dilshod', last: 'Usmonov', email: 'dilshod@ustoztop.uz', years: 10, color: '#70b9d3' },
  { key: 'nigora-karimova', first: 'Nigora', last: 'Karimova', email: 'nigora@ustoztop.uz', years: 7, color: '#6bb99e' },
]

const STUDENTS = [
  ['Aziz', 'Karimov', 'aziz@ustoztop.uz'],
  ['Shahzod', 'Islomov', 'shahzod@ustoztop.uz'],
  ['Malika', 'Ergasheva', 'malika@ustoztop.uz'],
  ['Diyorbek', 'Xasanov', 'diyorbek@ustoztop.uz'],
  ['Sevinch', 'Yuldasheva', 'sevinch@ustoztop.uz'],
  ['Akmal', 'Raximov', 'akmal@ustoztop.uz'],
  ['Zarina', 'Qodirova', 'zarina@ustoztop.uz'],
  ['Javohir', 'Aliyev', 'javohir@ustoztop.uz'],
]

const QUALIFICATION: Record<string, string> = {
  'sardor-rahimov': 'Matematika magistri · Toshkent davlat universiteti',
  'madina-alieva': 'Filologiya magistri · O‘zbekiston davlat jahon tillari universiteti',
  'dilshod-usmonov': 'Fizika o‘qituvchisi · Mirzo Ulug‘bek nomidagi O‘zbekiston Milliy universiteti',
  'nigora-karimova': 'Tarix va ijtimoiy fanlar mutaxassisi · Samarqand davlat universiteti',
}

async function main() {
  // 1) Birinchi admin — faqat server tomonida (oddiy Register orqali admin yaratib bo'lmaydi)
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: { firstName: 'UstozTop', lastName: 'Admin', email: ADMIN_EMAIL, passwordHash: await hash(ADMIN_PASSWORD), role: 'ADMIN', status: 'ACTIVE' },
  })
  console.log(`Admin: ${ADMIN_EMAIL}`)

  if (process.env.SEED_DEMO === 'false') return
  if ((await prisma.subject.count()) > 0) {
    console.log('Demo ma’lumotlar allaqachon mavjud — o‘tkazib yuborildi.')
    return
  }

  // 2) Fanlar (frontend demo katalogidan)
  // @ts-ignore — JS modul
  const data = (await import('./demoCatalog.mjs')) as { subjects: { id: string; name: string; category: string; icon: string; color: string; symbols: string[]; topics: string[]; total: number; teacherId: string }[]; teachers: { id: string; about: string }[] }
  const aboutByKey = new Map(data.teachers.map((teacher) => [teacher.id, teacher.about]))

  const teacherIds = new Map<string, string>()
  const teacherPassword = await hash(TEACHER_PASSWORD)
  for (const teacher of TEACHERS) {
    const user = await prisma.user.create({
      data: {
        firstName: teacher.first,
        lastName: teacher.last,
        email: teacher.email,
        passwordHash: teacherPassword,
        role: 'TEACHER',
        status: 'ACTIVE',
        avatarColor: teacher.color,
        teacherProfile: { create: { bio: aboutByKey.get(teacher.key) ?? '', qualification: QUALIFICATION[teacher.key] ?? '', experienceYears: teacher.years } },
      },
    })
    teacherIds.set(teacher.key, user.id)
  }
  // admin tasdig'ini kutayotgan ustoz (namuna)
  await prisma.user.create({
    data: { firstName: 'Bobur', lastName: 'Tursunov', email: 'bobur@ustoztop.uz', passwordHash: teacherPassword, role: 'TEACHER', status: 'PENDING', teacherProfile: { create: { qualification: 'Informatika bakalavri', experienceYears: 2 } } },
  })

  const times = ['10:00', '14:00', '16:00', '18:00']
  const groups: { id: string; teacherId: string; subjectName: string }[] = []
  for (const [index, subject] of data.subjects.entries()) {
    const created = await prisma.subject.create({
      data: { name: subject.name, category: subject.category, icon: subject.icon, color: subject.color, symbols: subject.symbols, topics: subject.topics, totalLessons: subject.total },
    })
    const teacherId = teacherIds.get(subject.teacherId)!
    const group = await prisma.group.create({
      data: {
        name: `${subject.name} · ${5 + (index % 7)}-sinf`,
        subjectId: created.id,
        lessonTime: times[index % times.length],
        daysOfWeek: index % 2 ? [2, 4, 6] : [1, 3, 5],
        capacity: 20,
        teacherAssignment: { create: { teacherId } },
      },
    })
    groups.push({ id: group.id, teacherId, subjectName: subject.name })
  }

  // 3) Demo o'quvchilar, a'zolik, davomat va baholar
  const studentPassword = await hash(STUDENT_PASSWORD)
  const random = rng(2026)
  const students: string[] = []
  for (const [first, last, email] of STUDENTS) {
    const student = await prisma.user.create({
      data: { firstName: first, lastName: last, email, passwordHash: studentPassword, role: 'STUDENT', status: 'ACTIVE', studentProfile: { create: { grade: `${6 + Math.floor(random() * 4)}-sinf` } } },
    })
    students.push(student.id)
  }

  const today = new Date()
  const lessonDates = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() - (index + 1) * 2))
    return date
  })

  for (const [studentIndex, studentId] of students.entries()) {
    const joined = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].filter((groupIndex) => (groupIndex + studentIndex) % 5 < 3).slice(0, 4)
    for (const groupIndex of joined) {
      const group = groups[groupIndex]
      await prisma.groupMembership.create({ data: { groupId: group.id, studentId } })
      for (const date of lessonDates) {
        const present = random() > 0.15
        await prisma.attendance.create({ data: { groupId: group.id, studentId, date, present, markedById: group.teacherId } })
        const activityScore = present ? 5 + Math.floor(random() * 6) : Math.floor(random() * 4)
        const homeworkScore = 4 + Math.floor(random() * 7)
        const attendanceScore = present ? 10 : 0
        await prisma.assessment.create({
          data: { groupId: group.id, studentId, teacherId: group.teacherId, date, attendanceScore, activityScore, homeworkScore, total: attendanceScore + activityScore + homeworkScore },
        })
      }
    }
  }

  // 4) Ustozlarga baholar
  for (const [studentIndex, studentId] of students.entries()) {
    const memberships = await prisma.groupMembership.findMany({ where: { studentId }, include: { group: { include: { teacherAssignment: true } } } })
    const seen = new Set<string>()
    for (const membership of memberships) {
      const teacherId = membership.group.teacherAssignment?.teacherId
      if (!teacherId || seen.has(teacherId)) continue
      seen.add(teacherId)
      await prisma.teacherReview.create({ data: { studentId, teacherId, rating: 4 + ((studentIndex + seen.size) % 2), comment: 'Tushunarli va qiziqarli dars o‘tadi.' } })
    }
  }
  console.log(`Demo ma’lumotlar yaratildi: ${data.subjects.length} fan, ${groups.length} guruh, ${students.length} o‘quvchi.`)
  console.log(`Ustoz: ustoz@ustoztop.uz / ${TEACHER_PASSWORD} · O‘quvchi: aziz@ustoztop.uz / ${STUDENT_PASSWORD}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
