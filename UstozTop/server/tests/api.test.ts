// Integratsion testlar: haqiqiy PostgreSQL bazasiga ulanadi (`npm run db:local` va `npm run db:seed` kerak).
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'

const app = createApp()
const stamp = Date.now()
const studentEmail = `test.student.${stamp}@example.com`
const teacherEmail = `test.teacher.${stamp}@example.com`
const password = 'TestPass123'

const agent = () => request.agent(app)

async function login(identifier: string, pass: string) {
  const client = agent()
  const res = await client.post('/api/auth/login').send({ identifier, password: pass })
  return { client, res }
}

let adminAgent: ReturnType<typeof agent>
let teacherId = ''
let subjectId = ''
let otherSubjectId = ''
let studentId = ''
let groupId = ''
let otherGroupId = ''

beforeAll(async () => {
  const admin = await login('admin@ustoztop.uz', 'UstozTopAdmin26!')
  expect(admin.res.status).toBe(200)
  adminAgent = admin.client
})

afterAll(async () => {
  const users = await prisma.user.findMany({ where: { email: { in: [studentEmail, teacherEmail] } }, select: { id: true } })
  const ids = users.map((user) => user.id)
  if (groupId) await prisma.group.deleteMany({ where: { id: { in: [groupId, otherGroupId].filter(Boolean) } } })
  await prisma.subject.deleteMany({ where: { id: { in: [subjectId, otherSubjectId].filter(Boolean) } } })
  await prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } })
  await prisma.user.deleteMany({ where: { id: { in: ids } } })
  await prisma.$disconnect()
})

describe('Register va Login', () => {
  const payload = { firstName: 'Test', lastName: 'Student', identifier: studentEmail, password, confirmPassword: password, role: 'STUDENT', acceptTerms: true }

  it('ADMIN rolini Register orqali tanlab bo‘lmaydi', async () => {
    const res = await agent().post('/api/auth/register').send({ ...payload, identifier: `x${stamp}@example.com`, role: 'ADMIN' })
    expect(res.status).toBe(400)
  })

  it('validatsiya: parollar mos kelmasa va shartlarga rozilik bo‘lmasa rad etadi', async () => {
    expect((await agent().post('/api/auth/register').send({ ...payload, confirmPassword: 'boshqa123' })).status).toBe(400)
    expect((await agent().post('/api/auth/register').send({ ...payload, acceptTerms: false })).status).toBe(400)
    expect((await agent().post('/api/auth/register').send({ ...payload, password: 'qisqa', confirmPassword: 'qisqa' })).status).toBe(400)
  })

  it('o‘quvchi ro‘yxatdan o‘tadi, takroriy email rad etiladi', async () => {
    const res = await agent().post('/api/auth/register').send(payload)
    expect(res.status).toBe(201)
    expect(res.body.user.role).toBe('STUDENT')
    expect(res.body.user.status).toBe('ACTIVE')
    expect(res.body.user.passwordHash).toBeUndefined()
    studentId = res.body.user.id
    expect((await agent().post('/api/auth/register').send(payload)).status).toBe(409)
  })

  it('parol bazada hash ko‘rinishida saqlanadi', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: studentEmail } })
    expect(user.passwordHash).not.toContain(password)
    expect(user.passwordHash.startsWith('$2')).toBe(true)
  })

  it('ustoz o‘zi ro‘yxatdan o‘ta olmaydi (akkauntni faqat admin yaratadi)', async () => {
    const res = await agent().post('/api/auth/register').send({ ...payload, identifier: teacherEmail, role: 'TEACHER' })
    expect(res.status).toBe(400)
    expect(await prisma.user.findUnique({ where: { email: teacherEmail } })).toBeNull()
  })

  it('noto‘g‘ri parol 401 qaytaradi va sessiya cookie\'si httpOnly', async () => {
    expect((await login(studentEmail, 'xato12345')).res.status).toBe(401)
    const ok = await login(studentEmail, password)
    expect(ok.res.status).toBe(200)
    expect(String(ok.res.headers['set-cookie'])).toMatch(/HttpOnly/i)
  })

  it('logout sessiyani yopadi', async () => {
    const { client } = await login(studentEmail, password)
    expect((await client.get('/api/auth/me')).status).toBe(200)
    await client.post('/api/auth/logout')
    expect((await client.get('/api/auth/me')).status).toBe(401)
  })

  it('parolni tiklash: bir martalik token ishlaydi', async () => {
    const forgot = await agent().post('/api/auth/forgot').send({ identifier: studentEmail })
    expect(forgot.status).toBe(200)
    const token = forgot.body.devResetToken as string
    expect(token).toBeTruthy()
    expect((await agent().post('/api/auth/reset').send({ token, password: 'YangiParol1' })).status).toBe(200)
    expect((await agent().post('/api/auth/reset').send({ token, password: 'YangiParol2' })).status).toBe(400)
    expect((await login(studentEmail, 'YangiParol1')).res.status).toBe(200)
    await agent().post('/api/auth/forgot').send({ identifier: 'yoq@example.com' }).expect(200)
  })
})

describe('Rollar va ruxsatlar', () => {
  it('tizimga kirmagan foydalanuvchi himoyalangan API\'ga kira olmaydi', async () => {
    expect((await agent().get('/api/subjects')).status).toBe(401)
    expect((await agent().get('/api/admin/stats')).status).toBe(401)
  })

  it('o‘quvchi admin va ustoz API\'siga kira olmaydi', async () => {
    const { client } = await login(studentEmail, 'YangiParol1')
    expect((await client.get('/api/admin/users')).status).toBe(403)
    expect((await client.get('/api/teacher/groups')).status).toBe(403)
    expect((await client.get('/api/student/dashboard')).status).toBe(200)
  })

  it('admin ustoz hisobini yaratadi (login + parol + fan), ustoz shu login bilan kiradi', async () => {
    // test bazasi bo'sh: kerakli fanlar shu yerda yaratiladi
    const first = await adminAgent.post('/api/admin/subjects').send({ name: `Test fan A ${stamp}`, category: 'Test' })
    const second = await adminAgent.post('/api/admin/subjects').send({ name: `Test fan B ${stamp}`, category: 'Test' })
    expect(first.status).toBe(201)
    subjectId = first.body.subject.id
    otherSubjectId = second.body.subject.id
    const created = await adminAgent.post('/api/admin/teachers').send({ firstName: 'Test', lastName: 'Teacher', identifier: teacherEmail, password, subjectIds: [subjectId] })
    expect(created.status).toBe(201)
    teacherId = created.body.id
    const log = await prisma.auditLog.findFirst({ where: { entityId: teacherId, action: 'teacher.create' } })
    expect(log).toBeTruthy()
    const { client, res } = await login(teacherEmail, password)
    expect(res.status).toBe(200)
    expect((await client.get('/api/teacher/groups')).status).toBe(200)
    const list = await adminAgent.get('/api/admin/teachers')
    expect(list.body.teachers.find((item: { id: string }) => item.id === teacherId).subjects[0].id).toBe(subjectId)
  })

  it('admin ustozning parolini almashtira oladi', async () => {
    expect((await adminAgent.patch(`/api/admin/teachers/${teacherId}`).send({ password: 'YangiUstoz9' })).status).toBe(200)
    expect((await login(teacherEmail, password)).res.status).toBe(401)
    expect((await login(teacherEmail, 'YangiUstoz9')).res.status).toBe(200)
    await adminAgent.patch(`/api/admin/teachers/${teacherId}`).send({ password })
  })
})

describe('Guruh, davomat, baholash va reyting', () => {
  it('admin fan/guruh yaratadi va ustozga biriktiradi', async () => {
    const created = await adminAgent.post('/api/admin/groups').send({ name: `Test guruh ${stamp}`, subjectId, lessonTime: '15:00', daysOfWeek: [1, 3], capacity: 5, teacherId })
    expect(created.status).toBe(201)
    groupId = created.body.id
    const other = await adminAgent.post('/api/admin/groups').send({ name: `Boshqa guruh ${stamp}`, subjectId, daysOfWeek: [2] })
    otherGroupId = other.body.id
    // ustoz dars bermaydigan fan bo'yicha guruhga biriktirib bo'lmaydi
    const wrong = await adminAgent.post('/api/admin/groups').send({ name: `Noto‘g‘ri fan ${stamp}`, subjectId: otherSubjectId, daysOfWeek: [2], teacherId })
    expect(wrong.status).toBe(400)
  })

  it('o‘quvchi so‘rov yuboradi, ustoz tasdiqlagach guruhga qo‘shiladi', async () => {
    const { client } = await login(studentEmail, 'YangiParol1')
    expect((await client.post(`/api/groups/${groupId}/join`)).status).toBe(201)
    expect((await client.post(`/api/groups/${groupId}/join`)).status).toBe(409)
    // tasdiqlanmaguncha a'zo emas
    expect((await client.get('/api/student/dashboard')).body.groups.some((group: { id: string }) => group.id === groupId)).toBe(false)

    const teacher = (await login(teacherEmail, password)).client
    const pending = await teacher.get('/api/teacher/join-requests')
    const request = pending.body.requests.find((item: { student: { id: string } }) => item.student.id === studentId)
    expect(request).toBeTruthy()
    expect((await teacher.post(`/api/teacher/join-requests/${request.id}/approve`)).status).toBe(200)
    expect((await teacher.post(`/api/teacher/join-requests/${request.id}/approve`)).status).toBe(400)
    expect((await client.get('/api/student/dashboard')).body.groups.some((group: { id: string }) => group.id === groupId)).toBe(true)
    const notes = await client.get('/api/notifications')
    expect(notes.body.notifications.some((item: { title: string }) => item.title.includes('tasdiqlandi'))).toBe(true)
  })

  it('ustoz faqat o‘z guruhini boshqaradi', async () => {
    const { client } = await login(teacherEmail, password)
    expect((await client.get(`/api/teacher/groups/${groupId}`)).status).toBe(200)
    expect((await client.get(`/api/teacher/groups/${otherGroupId}`)).status).toBe(403)
    const date = new Date().toISOString().slice(0, 10)
    expect((await client.put(`/api/teacher/groups/${otherGroupId}/attendance`).send({ date, records: [{ studentId, present: true }] })).status).toBe(403)
  })

  it('davomat + baho saqlanadi; ball chegaradan oshsa rad etiladi; reyting yangilanadi', async () => {
    const { client } = await login(teacherEmail, password)
    const date = new Date().toISOString().slice(0, 10)
    expect((await client.put(`/api/teacher/groups/${groupId}/attendance`).send({ date, records: [{ studentId, present: true }] })).status).toBe(200)
    expect((await client.put(`/api/teacher/groups/${groupId}/assessments`).send({ date, items: [{ studentId, activityScore: 11, homeworkScore: 5 }] })).status).toBe(400)
    expect((await client.put(`/api/teacher/groups/${groupId}/assessments`).send({ date, items: [{ studentId, activityScore: 8, homeworkScore: 6 }] })).status).toBe(200)

    // davomat belgilanishi bilan ball darhol yoziladi (faollik/topshiriq keyinroq qo'yiladi)
    const student0 = (await login(studentEmail, 'YangiParol1')).client
    const results = await student0.get('/api/student/results')
    expect(results.body.assessments.length).toBeGreaterThan(0)
    const saved = await prisma.assessment.findFirstOrThrow({ where: { groupId, studentId } })
    expect(saved.attendanceScore).toBe(10)
    expect(saved.total).toBe(24)
    expect(saved.teacherId).toBe(teacherId)

    const student = (await login(studentEmail, 'YangiParol1')).client
    const board = await student.get(`/api/ratings/students?groupId=${groupId}`)
    expect(board.status).toBe(200)
    expect(board.body.me.points).toBe(24)
    expect(board.body.me.rank).toBe(1)

    // ball o'zgarsa reyting avtomatik o'zgaradi
    await client.put(`/api/teacher/groups/${groupId}/attendance`).send({ date, records: [{ studentId, present: false }] })
    const after = await student.get(`/api/ratings/students?groupId=${groupId}`)
    expect(after.body.me.points).toBe(14)

    // o'quvchi umumiy reytingni ko'rmaydi: guruh berilmasa ham faqat o'z guruhi reytingi qaytadi
    const own = await student.get('/api/ratings/students')
    expect(own.body.groupId).toBe(groupId)
  })

  it('o‘quvchi o‘z natijalarini ko‘radi, ustozga baho beradi', async () => {
    const student = (await login(studentEmail, 'YangiParol1')).client
    const dashboard = await student.get('/api/student/dashboard')
    expect(dashboard.body.groups.some((group: { id: string }) => group.id === groupId)).toBe(true)
    expect((await student.post(`/api/teachers/${teacherId}/reviews`).send({ rating: 5, comment: 'Zo‘r' })).status).toBe(201)
    expect((await student.post(`/api/teachers/${teacherId}/reviews`).send({ rating: 9 })).status).toBe(400)
    const search = await student.get('/api/teachers?query=Test&sort=rating')
    expect(search.body.teachers.find((item: { id: string }) => item.id === teacherId).rating).toBe(5)
  })
})
