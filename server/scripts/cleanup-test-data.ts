// Dev bazada testlar qoldirgan yozuvlarni topadi (DRY=false bo'lsa o'chiradi).
import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

const prisma = new PrismaClient()
const apply = process.env.APPLY === 'true'

async function main() {
  const users = await prisma.user.findMany({ where: { OR: [{ email: { startsWith: 'test.' } }, { email: { endsWith: '@example.com' } }] }, select: { id: true, email: true, role: true } })
  const groups = await prisma.group.findMany({ where: { OR: [{ name: { startsWith: 'Test guruh' } }, { name: { startsWith: 'Boshqa guruh' } }, { name: { startsWith: 'Noto‘g‘ri fan' } }] }, select: { id: true, name: true } })
  const subjects = await prisma.subject.findMany({ where: { name: { startsWith: 'Test fan' } }, select: { id: true, name: true } })
  console.log('users', users)
  console.log('groups', groups)
  console.log('subjects', subjects)
  if (!apply) return console.log('Hech narsa o‘chirilmadi (APPLY=true bilan o‘chiriladi).')

  const ids = users.map((user) => user.id)
  await prisma.group.deleteMany({ where: { id: { in: groups.map((group) => group.id) } } })
  await prisma.subject.deleteMany({ where: { id: { in: subjects.map((subject) => subject.id) } } })
  // testlar yaratgan ustozlarga bog'liq audit yozuvlari (actor admin bo'lgani uchun entityId bo'yicha)
  await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: ids } }, { entityId: { in: [...ids, ...groups.map((group) => group.id), ...subjects.map((subject) => subject.id)] } }] } })
  await prisma.user.deleteMany({ where: { id: { in: ids } } })
  // Testlar dev bazaga yozgan, endi egasi o'chirilgan audit yozuvlari
  const logs = await prisma.auditLog.findMany({ where: { action: { in: ['teacher.create', 'group.create', 'teacher.reset_password', 'teacher.update', 'subject.create'] } }, select: { id: true, entity: true, entityId: true } })
  const orphans: string[] = []
  for (const log of logs) {
    const exists = !log.entityId ? true : log.entity === 'User' ? await prisma.user.count({ where: { id: log.entityId } }) : log.entity === 'Group' ? await prisma.group.count({ where: { id: log.entityId } }) : await prisma.subject.count({ where: { id: log.entityId } })
    if (!exists) orphans.push(log.id)
  }
  await prisma.auditLog.deleteMany({ where: { id: { in: orphans } } })
  console.log('Yetim audit yozuvlari o‘chirildi:', orphans.length)
  console.log('Tozalandi.')
}

main().finally(() => prisma.$disconnect())
