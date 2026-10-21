// Boshlang'ich ma'lumotlar: birinchi admin (server tomonida yaratiladi) va taqdimot uchun demo ma'lumotlar.
import { prisma } from './jsondb.js'
import * as demoCatalog from './demoCatalog.js'
import bcrypt from 'bcryptjs'

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

const DESCRIPTIONS: Record<string, string> = {
  'Matematika': 'Sonlar, tenglamalar va shakllar olamiga amaliy misollar orqali kirasiz. Har bir mavzu mashq va nazorat bilan mustahkamlanadi.',
  'Ingliz tili': 'Gapirish, tinglash, o‘qish va yozishni birga rivojlantiramiz. Dars davomida jonli suhbat va kundalik lug‘at ustuvor.',
  'Fizika': 'Tabiat qonunlarini tajriba va hisob-kitob bilan tushunasiz: harakatdan elektr va yorug‘likkacha.',
  'O‘zbekiston tarixi': 'Qadimgi davrdan bugungacha bo‘lgan yo‘l: voqealar, shaxslar va ularning bugunga ta’siri.',
  'Kimyo': 'Moddalar va ularning o‘zgarishi: formulalar, reaksiyalar va laboratoriya mantig‘i sodda tilda.',
  'Biologiya': 'Hujayradan ekotizimgacha: tirik tabiat tuzilishi, odam organizmi va irsiyat qonunlari.',
  'Ona tili': 'To‘g‘ri yozish va ravon so‘zlash: imlo, grammatika va matn ustida ishlash.',
  'Adabiyot': 'Mumtoz va zamonaviy asarlarni o‘qish, tahlil qilish va o‘z fikrini asoslashni o‘rganasiz.',
  'Geografiya': 'Xarita, iqlim va mintaqalar: dunyo va O‘zbekiston tabiatini bog‘lab tushunish.',
  'Informatika': 'Algoritmik fikrlash va dasturlash asoslari, ma’lumotlar bilan ishlash va raqamli xavfsizlik.',
  'Rus tili': 'Grammatika va og‘zaki nutq: kundalik muloqot, o‘qish va yozish ko‘nikmalari.',
  'Huquq asoslari': 'Fuqarolik huquq va majburiyatlari, davlat tuzilishi va qonun bilan hayotiy vaziyatlar.',
  'Chizmachilik': 'Shakllarni to‘g‘ri tasvirlash, proyeksiya va texnik chizma o‘qish.',
  'Musiqa madaniyati': 'Ohang, ritm va maqom san’ati: tinglash, tahlil qilish va ijro etish.',
  'Jismoniy tarbiya': 'Salomatlik, chidamlilik va jamoaviy o‘yinlar: to‘g‘ri mashq va sog‘lom odatlar.',
}

// Har bir fan o'z vaqt katagiga ega: hech bir o'quvchi yoki ustozda dars vaqti to'qnashmaydi.
const SLOT_TIMES = ['09:00', '10:30', '12:00', '14:00', '15:30', '17:00', '18:30', '20:00']
const slotFor = (index: number) => ({ lessonTime: SLOT_TIMES[index % SLOT_TIMES.length], daysOfWeek: index < SLOT_TIMES.length ? [1, 3, 5] : [2, 4, 6] })

const REVIEWS = [
  'Murakkab mavzuni oddiy misollar bilan tushuntirib beradi.',
  'Darslar qiziqarli, uyga vazifalar aniq va foydali.',
  'Savol bersam sabr bilan qayta tushuntiradi. Rahmat!',
  'Har darsda amaliy mashqlar ko‘p, natijani sezyapman.',
  'Juda talabchan, lekin shu sabab tez o‘rganyapman.',
  'Dars tempi menga mos, mavzular ketma-ket va tushunarli.',
  'Natijalarni doim izohlab beradi, qayerda xato qilganimni ko‘raman.',
  'Ba’zan dars biroz tez o‘tadi, lekin umuman yaxshi.',
]

// Oxirgi n ta dars sanasi: faqat guruh jadvalidagi hafta kunlariga mos (bugundan oldin).
function lessonDatesFor(daysOfWeek: number[], count: number) {
  const dates: Date[] = []
  const now = new Date()
  for (let back = 1; dates.length < count && back < 60; back += 1) {
    const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - back))
    if (daysOfWeek.includes(date.getUTCDay())) dates.push(date)
  }
  return dates
}

// Mavjud ma'lumotlarni yangilaydi: fan tavsifi va ustoz-fan bog'lanishi (guruhlariga qarab). Qayta ishga tushirish xavfsiz.
async function backfill() {
  // demo ustozlar faol; tasdiq kutuvchi namuna ustoz (endi ustoz o'zi ro'yxatdan o'tmaydi) olib tashlanadi
  await prisma.user.updateMany({ where: { email: { in: TEACHERS.map((teacher) => teacher.email) } }, data: { status: 'ACTIVE' } })
  await prisma.user.deleteMany({ where: { email: 'bobur@ustoztop.uz', status: 'PENDING' } })
  const catalog = demoCatalog as unknown as { subjects: { name: string; symbols: string[] }[] }
  for (const [index, item] of catalog.subjects.entries()) {
    await prisma.subject.updateMany({ where: { name: item.name }, data: { symbols: item.symbols } })
    const slot = slotFor(index)
    const group = await prisma.group.findFirst({ where: { subject: { name: item.name }, name: { startsWith: `${item.name} · ` } }, orderBy: { createdAt: 'asc' } })
    if (group) await prisma.group.update({ where: { id: group.id }, data: { ...slot, name: `${item.name} · ${slot.lessonTime} guruhi` } })
  }
  for (const [name, description] of Object.entries(DESCRIPTIONS)) {
    await prisma.subject.updateMany({ where: { name, description: '' }, data: { description } })
  }
  const assignments = await prisma.teacherAssignment.findMany({ include: { group: { select: { subjectId: true } } } })
  await prisma.teacherSubject.createMany({ data: assignments.map((item) => ({ teacherId: item.teacherId, subjectId: item.group.subjectId })), skipDuplicates: true })
}

export async function seedDatabase({ demo = true }: { demo?: boolean } = {}) {
  // 1) Birinchi admin — faqat server tomonida (oddiy Register orqali admin yaratib bo'lmaydi)
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: { firstName: 'UstozTop', lastName: 'Admin', email: ADMIN_EMAIL, passwordHash: await hash(ADMIN_PASSWORD), role: 'ADMIN', status: 'ACTIVE' },
  })
  console.log(`Admin: ${ADMIN_EMAIL}`)

  if (!demo) return
  if ((await prisma.subject.count()) > 0) {
    await backfill()
    console.log('Demo ma’lumotlar allaqachon mavjud — fan tavsiflari va ustoz fanlari yangilandi.')
    return
  }

  // 2) Fanlar (frontend demo katalogidan)
  const data = demoCatalog as unknown as { subjects: { id: string; name: string; category: string; icon: string; color: string; symbols: string[]; topics: string[]; total: number; teacherId: string }[]; teachers: { id: string; about: string }[] }
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

  const groups: { id: string; teacherId: string; subjectName: string; daysOfWeek: number[] }[] = []
  for (const [index, subject] of data.subjects.entries()) {
    const created = await prisma.subject.create({
      data: { name: subject.name, category: subject.category, icon: subject.icon, color: subject.color, symbols: subject.symbols, topics: subject.topics, totalLessons: subject.total },
    })
    const teacherId = teacherIds.get(subject.teacherId)!
    const slot = slotFor(index)
    const group = await prisma.group.create({
      data: {
        name: `${subject.name} · ${slot.lessonTime} guruhi`,
        subjectId: created.id,
        ...slot,
        capacity: 20,
        teacherAssignment: { create: { teacherId } },
      },
    })
    groups.push({ id: group.id, teacherId, subjectName: subject.name, daysOfWeek: group.daysOfWeek })
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

  for (const [studentIndex, studentId] of students.entries()) {
    const joined = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].filter((groupIndex) => (groupIndex + studentIndex) % 5 < 3).slice(0, 4)
    for (const groupIndex of joined) {
      const group = groups[groupIndex]
      await prisma.groupMembership.create({ data: { groupId: group.id, studentId } })
      for (const date of lessonDatesFor(group.daysOfWeek, 6)) {
        const present = random() > 0.15
        await prisma.attendance.create({ data: { groupId: group.id, studentId, date, present, markedById: group.teacherId } })
        // kelmagan o'quvchiga faollik bali qo'yilmaydi
        const activityScore = present ? 5 + Math.floor(random() * 6) : 0
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
      await prisma.teacherReview.create({ data: { studentId, teacherId, rating: 4 + ((studentIndex + seen.size) % 2), comment: REVIEWS[(studentIndex + seen.size) % REVIEWS.length] } })
    }
  }
  await backfill()
  console.log(`Demo ma’lumotlar yaratildi: ${data.subjects.length} fan, ${groups.length} guruh, ${students.length} o‘quvchi.`)
  console.log(`Ustoz: ustoz@ustoztop.uz / ${TEACHER_PASSWORD} · O‘quvchi: aziz@ustoztop.uz / ${STUDENT_PASSWORD}`)
}

