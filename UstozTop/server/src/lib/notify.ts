import { prisma } from './prisma.js'

export interface NotificationInput {
  userId: string
  title: string
  body: string
  dedupeKey: string
}

// Bir xil dedupeKey bilan xabarnoma ikki marta yaratilmaydi (masalan, bir kunlik dars eslatmasi).
export async function notifyOnce(items: NotificationInput[]) {
  if (!items.length) return 0
  const existing = await prisma.notification.findMany({ where: { dedupeKey: { in: items.map((item) => item.dedupeKey) } }, select: { dedupeKey: true } })
  const seen = new Set(existing.map((item) => item.dedupeKey))
  const fresh = items.filter((item) => !seen.has(item.dedupeKey))
  if (fresh.length) await prisma.notification.createMany({ data: fresh })
  return fresh.length
}

// Sana kaliti serverning mahalliy vaqti bo'yicha (dars jadvali ham shunday hisoblanadi).
export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
