// JSON ma'lumotlar bazasini saqlash: Vercel'da Upstash Redis (KV_REST_API_*), lokalda server/data/db.json fayli.
// Har bir so'rov navbat bilan ishlaydi: yuklash -> bajarish -> o'zgargan bo'lsa saqlash.
import type { NextFunction, Request, Response } from 'express'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { store } from './jsondb.js'
import { seedDatabase } from './seed.js'

const KEY = 'ustoztop:db'
// Upstash integratsiyasi o'zgaruvchilarni KV_*, UPSTASH_REDIS_* yoki o'zingiz bergan prefiks (masalan STORAGE_*) bilan qo'shishi mumkin.
function kvEnv(suffix: string, exclude?: RegExp) {
  const key = Object.keys(process.env).find((name) => name.endsWith(suffix) && !(exclude && exclude.test(name)) && process.env[name])
  return key ? process.env[key] : undefined
}
const kvUrl = () => kvEnv('REST_API_URL') || kvEnv('REDIS_REST_URL')
const kvToken = () => kvEnv('REST_API_TOKEN', /READ_ONLY/) || kvEnv('REDIS_REST_TOKEN', /READ_ONLY/)
const filePath = () => resolve(process.env.DB_FILE || 'server/data/db.json')

async function kv(command: unknown[]) {
  const response = await fetch(kvUrl()!, { method: 'POST', headers: { Authorization: `Bearer ${kvToken()}` }, body: JSON.stringify(command) })
  const data = (await response.json()) as { result?: unknown; error?: string }
  if (!response.ok || data.error) throw new Error(`Upstash: ${data.error ?? response.status}`)
  return data.result
}

async function readRaw(): Promise<string | null> {
  if (kvUrl() && kvToken()) return ((await kv(['GET', KEY])) as string | null) ?? null
  try {
    return await readFile(filePath(), 'utf8')
  } catch {
    return null
  }
}

async function writeRaw(json: string) {
  if (kvUrl() && kvToken()) {
    await kv(['SET', KEY, json])
    return
  }
  const file = filePath()
  await mkdir(dirname(file), { recursive: true })
  await writeFile(`${file}.tmp`, json)
  await rename(`${file}.tmp`, file)
}

export async function loadDatabase() {
  const raw = await readRaw()
  store.load(raw ? JSON.parse(raw) : null)
  if (store.isEmpty()) {
    // birinchi ishga tushirish: admin va demo ma'lumotlar
    await seedDatabase({ demo: process.env.SEED_DEMO !== 'false' })
  }
}

export async function saveDatabase() {
  if (!store.isDirty()) return
  await writeRaw(JSON.stringify(store.dump()))
  store.clean()
}

let queue: Promise<void> = Promise.resolve()

export function databaseSession(_req: Request, res: Response, next: NextFunction) {
  // Vercel'da fayl tizimi faqat o'qish uchun: Upstash Redis ulanmagan bo'lsa ma'lumot saqlanmaydi, shuning uchun aniq xabar beriladi.
  if (process.env.VERCEL && !(kvUrl() && kvToken())) {
    res.status(503).json({ error: 'Ma‘lumotlar bazasi ulanmagan: Vercel loyihasida Storage → Upstash Redis ni ulang va qayta deploy qiling.', code: 'DB_NOT_CONFIGURED' })
    return
  }
  const previous = queue
  let release!: () => void
  queue = new Promise<void>((resolveQueue) => (release = resolveQueue))
  let released = false
  const done = () => {
    if (!released) {
      released = true
      release()
    }
  }
  res.on('close', done)

  previous
    .then(async () => {
      await loadDatabase()
      // javob yuborilishidan oldin o'zgarishlar saqlanadi (serverless funksiya javobdan keyin to'xtab qolishi mumkin)
      const end = res.end.bind(res) as (...args: unknown[]) => Response
      res.end = ((...args: unknown[]) => {
        saveDatabase().then(
          () => end(...args),
          (error) => {
            console.error('[db] saqlab bo‘lmadi:', error)
            end(...args)
          },
        )
        return res
      }) as Response['end']
      next()
    })
    .catch((error) => {
      done()
      next(error)
    })
}
