// prisma/schema.prisma dan jsondb uchun meta-ma'lumot (src/lib/schemaMeta.json) yaratadi: npm run db:meta
import { readFileSync, writeFileSync } from 'node:fs'

const source = readFileSync(new URL('../prisma/schema.prisma', import.meta.url), 'utf8')
const SCALARS = new Set(['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json'])
const enums = new Set([...source.matchAll(/^enum\s+(\w+)/gm)].map((match) => match[1]))
const models: Record<string, any> = {}

for (const block of source.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
  const [, name, body] = block
  const fields: Record<string, any> = {}
  const uniques: string[][] = []
  for (const raw of body.split('\n')) {
    const line = raw.replace(/\/\/.*$/, '').trim()
    if (!line) continue
    const model = line.match(/^@@(id|unique)\(\[([^\]]+)\]/)
    if (model) {
      uniques.push(model[2].split(',').map((item) => item.trim()))
      continue
    }
    if (line.startsWith('@@')) continue
    const match = line.match(/^(\w+)\s+(\w+)(\[\])?(\?)?\s*(.*)$/)
    if (!match) continue
    const [, field, type, list, optional, attrs] = match
    const scalar = SCALARS.has(type) || enums.has(type)
    const info: any = { type, list: Boolean(list), optional: Boolean(optional), scalar }
    if (scalar) {
      if (/@id\b/.test(attrs)) uniques.push([field])
      else if (/@unique\b/.test(attrs)) uniques.push([field])
      if (/@updatedAt/.test(attrs)) info.updatedAt = true
      const def = attrs.match(/@default\(([^)]*\)?)\)/)
      if (def) {
        const value = def[1]
        if (/^(cuid|uuid)\(/.test(value)) info.default = { fn: 'id' }
        else if (value === 'now()') info.default = { fn: 'now' }
        else if (/^"/.test(value)) info.default = { value: JSON.parse(value) }
        else if (value === 'true' || value === 'false') info.default = { value: value === 'true' }
        else if (!Number.isNaN(Number(value))) info.default = { value: Number(value) }
        else info.default = { value }
      }
    } else {
      const relation = attrs.match(/@relation\(([^)]*)\)/)
      if (relation) {
        const args = relation[1]
        const named = args.match(/^\s*"(\w+)"/)
        if (named) info.relName = named[1]
        const fieldsArg = args.match(/fields:\s*\[([^\]]+)\]/)
        const refsArg = args.match(/references:\s*\[([^\]]+)\]/)
        if (fieldsArg && refsArg) {
          info.fields = fieldsArg[1].split(',').map((item) => item.trim())
          info.references = refsArg[1].split(',').map((item) => item.trim())
        }
        const del = args.match(/onDelete:\s*(\w+)/)
        if (del) info.onDelete = del[1]
      }
    }
    fields[field] = info
  }
  models[name] = { fields, uniques }
}

writeFileSync(new URL('../src/lib/schemaMeta.json', import.meta.url), `${JSON.stringify(models, null, 2)}\n`)
console.log(`schemaMeta.json: ${Object.keys(models).length} ta model`)
