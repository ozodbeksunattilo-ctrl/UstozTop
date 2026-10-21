// Prisma'ga mos keladigan yengil JSON ma'lumotlar bazasi. Ma'lumotlar xotirada saqlanadi,
// har bir so'rovdan oldin xotiraga yuklanadi va o'zgargan bo'lsa so'rov oxirida saqlanadi (store.ts).
// Model/aloqalar meta-ma'lumoti prisma/schema.prisma dan olinadi (npm run db:meta).
import { randomBytes } from 'node:crypto'
import meta from './schemaMeta.json' with { type: 'json' }

type Row = Record<string, any>
type Any = any

interface FieldMeta {
  type: string
  list: boolean
  optional: boolean
  scalar: boolean
  updatedAt?: boolean
  default?: { fn?: string; value?: unknown }
  relName?: string
  fields?: string[]
  references?: string[]
  onDelete?: string
}
interface ModelMeta {
  fields: Record<string, FieldMeta>
  uniques: string[][]
}

const models = meta as unknown as Record<string, ModelMeta>
const keyOf = (name: string) => name.charAt(0).toLowerCase() + name.slice(1)
const modelByKey = new Map(Object.keys(models).map((name) => [keyOf(name), name]))

let tables: Record<string, Row[]> = {}
let dirty = false

export const store = {
  /** Xotiradagi jadvallarni almashtiradi (JSON dan yuklangandan keyin). */
  load(data: Record<string, Row[]> | null) {
    tables = {}
    for (const name of Object.keys(models)) {
      tables[name] = (data?.[name] ?? []).map((row) => revive(name, row))
    }
    dirty = false
  },
  dump() {
    return tables
  },
  isEmpty() {
    return Object.values(tables).every((rows) => rows.length === 0)
  },
  isDirty: () => dirty,
  clean() {
    dirty = false
  },
}

function revive(model: string, row: Row) {
  const out: Row = { ...row }
  for (const [name, field] of Object.entries(models[model].fields)) {
    if (field.scalar && field.type === 'DateTime' && typeof out[name] === 'string') out[name] = new Date(out[name])
  }
  return out
}

const cuid = () => `c${Date.now().toString(36)}${randomBytes(8).toString('hex')}`

// ---------- aloqalar

interface Relation {
  target: string
  list: boolean
  // child: FK qaysi jadvalda; ownerKey/targetKey: (FK maydoni, ko'rsatilgan maydon)
  owns: boolean
  fk: string
  ref: string
}

const relationCache = new Map<string, Relation>()
function relationOf(model: string, field: string): Relation | null {
  const id = `${model}.${field}`
  if (relationCache.has(id)) return relationCache.get(id)!
  const info = models[model].fields[field]
  if (!info || info.scalar) return null
  let relation: Relation
  if (info.fields) {
    relation = { target: info.type, list: false, owns: true, fk: info.fields[0], ref: info.references![0] }
  } else {
    const inverse = Object.entries(models[info.type].fields).find(([, f]) => !f.scalar && f.type === model && f.fields && (f.relName ?? '') === (info.relName ?? ''))
    if (!inverse) throw new Error(`Teskari aloqa topilmadi: ${id}`)
    relation = { target: info.type, list: info.list, owns: false, fk: inverse[1].fields![0], ref: inverse[1].references![0] }
  }
  relationCache.set(id, relation)
  return relation
}

function related(model: string, row: Row, field: string): Row[] | Row | null {
  const relation = relationOf(model, field)!
  const rows = tables[relation.target]
  if (relation.owns) {
    const value = row[relation.fk]
    return value == null ? null : (rows.find((item) => same(item[relation.ref], value)) ?? null)
  }
  const found = rows.filter((item) => same(item[relation.fk], row[relation.ref]))
  return relation.list ? found : (found[0] ?? null)
}

// ---------- taqqoslash

const same = (a: Any, b: Any) => (a instanceof Date || b instanceof Date ? new Date(a).getTime() === new Date(b).getTime() : a === b)
const comparable = (value: Any) => (value instanceof Date ? value.getTime() : value)

function matchScalar(value: Any, cond: Any): boolean {
  if (cond === null) return value == null
  if (cond instanceof Date || typeof cond !== 'object') return same(value, cond)
  const insensitive = cond.mode === 'insensitive'
  const text = (input: Any) => (insensitive ? String(input).toLowerCase() : String(input))
  for (const [op, expected] of Object.entries(cond)) {
    switch (op) {
      case 'mode':
        break
      case 'equals':
        if (!matchScalar(value, expected)) return false
        break
      case 'not':
        if (matchScalar(value, expected)) return false
        break
      case 'in':
        if (!(expected as Any[]).some((item) => same(value, item))) return false
        break
      case 'notIn':
        if ((expected as Any[]).some((item) => same(value, item))) return false
        break
      case 'contains':
        if (value == null || !text(value).includes(text(expected))) return false
        break
      case 'startsWith':
        if (value == null || !text(value).startsWith(text(expected))) return false
        break
      case 'endsWith':
        if (value == null || !text(value).endsWith(text(expected))) return false
        break
      case 'gt':
        if (value == null || !(comparable(value) > comparable(expected))) return false
        break
      case 'gte':
        if (value == null || !(comparable(value) >= comparable(expected))) return false
        break
      case 'lt':
        if (value == null || !(comparable(value) < comparable(expected))) return false
        break
      case 'lte':
        if (value == null || !(comparable(value) <= comparable(expected))) return false
        break
      default:
        throw new Error(`Qo'llab-quvvatlanmaydigan filtr: ${op}`)
    }
  }
  return true
}

function matches(model: string, row: Row, where?: Any): boolean {
  if (!where) return true
  for (const [key, cond] of Object.entries<Any>(where)) {
    if (cond === undefined) continue
    if (key === 'AND') {
      if (![cond].flat().every((item) => matches(model, row, item))) return false
    } else if (key === 'OR') {
      if (![cond].flat().length || ![cond].flat().some((item) => matches(model, row, item))) return false
    } else if (key === 'NOT') {
      if ([cond].flat().some((item) => matches(model, row, item))) return false
    } else if (models[model].fields[key]) {
      const field = models[model].fields[key]
      if (field.scalar) {
        if (!matchScalar(row[key], cond)) return false
      } else {
        const value = related(model, row, key)
        if (field.list) {
          const list = value as Row[]
          if (cond.some && !list.some((item) => matches(field.type, item, cond.some))) return false
          if (cond.every && !list.every((item) => matches(field.type, item, cond.every))) return false
          if (cond.none && list.some((item) => matches(field.type, item, cond.none))) return false
        } else if (cond === null) {
          if (value) return false
        } else {
          const inner = cond.is ?? cond
          if (!value || !matches(field.type, value as Row, inner)) return false
        }
      }
    } else {
      // birikma unique kaliti: { groupId_studentId: { groupId, studentId } }
      const unique = models[model].uniques.find((fields) => fields.join('_') === key)
      if (!unique) throw new Error(`Noma'lum maydon: ${model}.${key}`)
      if (!matches(model, row, cond)) return false
    }
  }
  return true
}

// ---------- natijani shakllantirish (select / include / _count)

function shape(model: string, row: Row, args: Any = {}): Row {
  const out: Row = {}
  const fields = models[model].fields
  const select = args.select
  if (!select) {
    for (const [name, field] of Object.entries(fields)) if (field.scalar) out[name] = row[name]
  }
  const extras = select ?? args.include ?? {}
  for (const [name, spec] of Object.entries<Any>(extras)) {
    if (!spec) continue
    if (name === '_count') {
      out._count = {}
      for (const relation of Object.keys(spec.select ?? {})) out._count[relation] = ([related(model, row, relation)].flat().filter(Boolean) as Row[]).length
    } else if (fields[name]?.scalar) {
      out[name] = row[name]
    } else {
      const value = related(model, row, name)
      const sub = spec === true ? {} : spec
      const target = fields[name].type
      if (Array.isArray(value)) {
        out[name] = query(target, value, sub).map((item) => shape(target, item, sub))
      } else {
        out[name] = value && matches(target, value, sub.where) ? shape(target, value, sub) : null
      }
    }
  }
  return out
}

function query(model: string, rows: Row[], args: Any = {}): Row[] {
  let result = rows.filter((row) => matches(model, row, args.where))
  const orderBy = [args.orderBy ?? []].flat()
  if (orderBy.length) {
    result = [...result].sort((a, b) => {
      for (const order of orderBy) {
        const [field, dir] = Object.entries<Any>(order)[0]
        const x = comparable(a[field])
        const y = comparable(b[field])
        if (x === y) continue
        if (x == null) return dir === 'desc' ? 1 : -1
        if (y == null) return dir === 'desc' ? -1 : 1
        return (x < y ? -1 : 1) * (dir === 'desc' ? -1 : 1)
      }
      return 0
    })
  }
  if (args.skip) result = result.slice(args.skip)
  if (args.take !== undefined) result = result.slice(0, args.take)
  return result
}

// ---------- yozish

class DbError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

function uniqueConflict(model: string, row: Row, ignore?: Row) {
  for (const fields of models[model].uniques) {
    if (fields.some((field) => row[field] == null)) continue
    const clash = tables[model].find((item) => item !== ignore && fields.every((field) => same(item[field], row[field])))
    if (clash) throw new DbError('P2002', `Unique constraint failed on ${model}(${fields.join(',')})`)
  }
}

function isRelationInput(model: string, key: string) {
  const field = models[model].fields[key]
  return field && !field.scalar
}

function applyNested(model: string, row: Row, nested: [string, Any][]) {
  for (const [name, input] of nested) {
    const relation = relationOf(model, name)!
    const child = relation.target
    const link = (data: Row) => ({ ...data, [relation.fk]: row[relation.ref] })
    for (const op of Object.keys(input)) {
      const value = input[op]
      if (op === 'create') [value].flat().forEach((data) => insert(child, link(data)))
      else if (op === 'createMany') value.data.forEach((data: Row) => insert(child, link(data)))
      else if (op === 'upsert') {
        const existing = tables[child].find((item) => same(item[relation.fk], row[relation.ref]))
        if (existing) patch(child, existing, value.update)
        else insert(child, link(value.create))
      } else if (op === 'connect') {
        // faqat egasi bo'lgan tomon uchun ishlatilmaydi
        throw new Error('connect qo\'llab-quvvatlanmaydi')
      } else throw new Error(`Qo'llab-quvvatlanmaydigan yozuv: ${op}`)
    }
  }
}

function insert(model: string, data: Row): Row {
  const row: Row = {}
  const nested: [string, Any][] = []
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue
    if (isRelationInput(model, key)) nested.push([key, value])
    else row[key] = value
  }
  const now = new Date()
  for (const [name, field] of Object.entries(models[model].fields)) {
    if (!field.scalar) continue
    if (row[name] === undefined) {
      if (field.default?.fn === 'id') row[name] = cuid()
      else if (field.default?.fn === 'now') row[name] = now
      else if (field.default && 'value' in field.default) row[name] = field.default.value
      else if (field.list) row[name] = []
      else if (field.updatedAt) row[name] = now
      else row[name] = null
    }
    if (field.type === 'DateTime' && typeof row[name] === 'string') row[name] = new Date(row[name])
  }
  uniqueConflict(model, row)
  tables[model].push(row)
  dirty = true
  applyNested(model, row, nested)
  return row
}

function patch(model: string, row: Row, data: Row) {
  const nested: [string, Any][] = []
  const next: Row = { ...row }
  for (const [key, value] of Object.entries<Any>(data)) {
    if (value === undefined) continue
    if (isRelationInput(model, key)) nested.push([key, value])
    else if (value && typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value) && ('set' in value || 'increment' in value)) {
      next[key] = 'set' in value ? value.set : row[key] + value.increment
    } else next[key] = value
  }
  for (const [name, field] of Object.entries(models[model].fields)) if (field.updatedAt) next[name] = new Date()
  uniqueConflict(model, next, row)
  Object.assign(row, next)
  dirty = true
  applyNested(model, row, nested)
  return row
}

function remove(model: string, row: Row) {
  const index = tables[model].indexOf(row)
  if (index < 0) return
  tables[model].splice(index, 1)
  dirty = true
  // onDelete: Cascade / SetNull
  for (const [childName, child] of Object.entries(models)) {
    for (const [field, info] of Object.entries(child.fields)) {
      if (info.scalar || info.type !== model || !info.fields) continue
      const fk = info.fields[0]
      const ref = info.references![0]
      const rows = tables[childName].filter((item) => same(item[fk], row[ref]))
      if (info.onDelete === 'Cascade') rows.forEach((item) => remove(childName, item))
      else if (info.onDelete === 'SetNull') rows.forEach((item) => (item[fk] = null))
      else if (rows.length) throw new DbError('P2003', `Foreign key constraint failed on ${childName}.${field}`)
    }
  }
}

// ---------- jamlama

function aggregateRows(rows: Row[], args: Any) {
  const out: Row = {}
  const values = (field: string) => rows.map((row) => row[field]).filter((value) => value != null) as number[]
  if (args._count) {
    out._count = {}
    for (const field of Object.keys(args._count)) out._count[field === '_all' || (field as Any) === true ? '_all' : field] = field === '_all' ? rows.length : values(field).length
  }
  if (args._sum) {
    out._sum = {}
    for (const field of Object.keys(args._sum)) out._sum[field] = rows.length && values(field).length ? values(field).reduce((a, b) => a + b, 0) : null
  }
  if (args._avg) {
    out._avg = {}
    for (const field of Object.keys(args._avg)) out._avg[field] = values(field).length ? values(field).reduce((a, b) => a + b, 0) / values(field).length : null
  }
  return out
}

// ---------- model API

function delegate(model: string) {
  const all = () => tables[model]
  const find = (where?: Any) => all().filter((row) => matches(model, row, where))
  const one = (where?: Any) => all().find((row) => matches(model, row, where)) ?? null
  const result = (row: Row | null, args?: Any) => (row ? shape(model, row, args) : null)

  return {
    findMany: async (args: Any = {}) => query(model, all(), args).map((row) => shape(model, row, args)),
    findFirst: async (args: Any = {}) => result(query(model, all(), { ...args, take: 1 })[0] ?? null, args),
    findUnique: async (args: Any) => result(one(args.where), args),
    findUniqueOrThrow: async (args: Any) => {
      const row = one(args.where)
      if (!row) throw new DbError('P2025', `${model} topilmadi`)
      return shape(model, row, args)
    },
    findFirstOrThrow: async (args: Any) => {
      const row = query(model, all(), { ...args, take: 1 })[0]
      if (!row) throw new DbError('P2025', `${model} topilmadi`)
      return shape(model, row, args)
    },
    count: async (args: Any = {}) => find(args.where).length,
    create: async (args: Any) => shape(model, insert(model, args.data), args),
    createMany: async (args: Any) => {
      let count = 0
      for (const data of [args.data].flat()) {
        try {
          insert(model, data)
          count += 1
        } catch (error) {
          if (!(args.skipDuplicates && (error as DbError).code === 'P2002')) throw error
        }
      }
      return { count }
    },
    update: async (args: Any) => {
      const row = one(args.where)
      if (!row) throw new DbError('P2025', `${model} topilmadi`)
      return shape(model, patch(model, row, args.data), args)
    },
    updateMany: async (args: Any) => {
      const rows = find(args.where)
      rows.forEach((row) => patch(model, row, args.data))
      return { count: rows.length }
    },
    upsert: async (args: Any) => {
      const row = one(args.where)
      return shape(model, row ? patch(model, row, args.update) : insert(model, args.create), args)
    },
    delete: async (args: Any) => {
      const row = one(args.where)
      if (!row) throw new DbError('P2025', `${model} topilmadi`)
      remove(model, row)
      return shape(model, row, args)
    },
    deleteMany: async (args: Any = {}) => {
      const rows = find(args.where)
      rows.forEach((row) => remove(model, row))
      return { count: rows.length }
    },
    aggregate: async (args: Any = {}) => aggregateRows(find(args.where), args),
    groupBy: async (args: Any) => {
      const groups = new Map<string, Row[]>()
      for (const row of find(args.where)) {
        const key = JSON.stringify(args.by.map((field: string) => comparable(row[field])))
        groups.set(key, [...(groups.get(key) ?? []), row])
      }
      const out: Row[] = []
      for (const rows of groups.values()) {
        const entry: Row = { ...Object.fromEntries(args.by.map((field: string) => [field, rows[0][field]])), ...aggregateRows(rows, args) }
        const having = args.having
          ? Object.entries<Any>(args.having).every(([field, aggs]) =>
              Object.entries<Any>(aggs).every(([agg, cond]) => {
                const rowsWith = rows.filter((row) => row[field] != null)
                const value = agg === '_count' ? rowsWith.length : (aggregateRows(rows, { [agg]: { [field]: true } })[agg] as Row)[field]
                return matchScalar(value, cond)
              }),
            )
          : true
        if (having) out.push(entry)
      }
      return out
    },
  }
}

const delegates = new Map<string, ReturnType<typeof delegate>>()

export const prisma: Any = new Proxy(
  {
    $transaction: async (operations: Any) => (typeof operations === 'function' ? operations(prisma) : Promise.all(operations)),
    $disconnect: async () => {},
  },
  {
    get(target: Any, property: string) {
      if (property in target) return target[property]
      const model = modelByKey.get(property)
      if (!model) return undefined
      if (!delegates.has(model)) delegates.set(model, delegate(model))
      return delegates.get(model)
    },
  },
)
