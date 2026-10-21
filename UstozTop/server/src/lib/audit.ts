import type { JsonValue } from './types.js'
import { prisma } from './prisma.js'

export async function audit(actorId: string | null, action: string, entity: string, entityId?: string, meta?: JsonValue) {
  await prisma.auditLog.create({ data: { actorId, action, entity, entityId, meta } })
}
