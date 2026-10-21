import { execSync } from 'node:child_process'

const url = process.env.TEST_DATABASE_URL || 'postgresql://ustoztop:ustoztop@localhost:5433/ustoztop_test?schema=public'

// Test bazasi sxemasini tayyorlaydi (yo'q bo'lsa yaratadi) va faqat admin hisobini seed qiladi.
export default function setup() {
  const env = { ...process.env, DATABASE_URL: url, SEED_DEMO: 'false' }
  execSync('npx prisma db push --skip-generate --accept-data-loss', { env, stdio: 'ignore' })
  execSync('npx tsx prisma/seed.ts', { env, stdio: 'ignore' })
}
