// Docker/WSL bo'lmagan kompyuterlar uchun: haqiqiy PostgreSQL'ni lokal jarayon sifatida ishga tushiradi.
// Ma'lumotlar server/.pgdata papkasida saqlanadi. Docker ishlatmoqchi bo'lsangiz: `npm run db:up`.
import EmbeddedPostgres from 'embedded-postgres'
import { existsSync } from 'node:fs'
import path from 'node:path'

const dataDir = path.resolve(process.cwd(), '.pgdata')
const port = 5433
const fresh = !existsSync(path.join(dataDir, 'PG_VERSION'))

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'ustoztop',
  password: 'ustoztop',
  port,
  persistent: true,
  initdbFlags: ['--encoding=UTF8', '--locale=C', '--lc-collate=C'],
})

if (fresh) await pg.initialise()
await pg.start()
if (fresh) await pg.createDatabase('ustoztop')

console.log(`PostgreSQL tayyor: postgresql://ustoztop:ustoztop@localhost:${port}/ustoztop`)

const stop = async () => {
  await pg.stop()
  process.exit(0)
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
