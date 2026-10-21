import type { Prisma } from '@prisma/client'
import { prisma } from './prisma.js'

export async function audit(actorId: string | null, action: string, entity: string, entityId?: string, meta?: Prisma.InputJsonValue) {
  await prisma.auditLog.create({ data: { actorId, action, entity, entityId, meta } })
}
