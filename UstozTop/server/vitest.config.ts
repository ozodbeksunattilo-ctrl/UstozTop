import { defineConfig } from 'vitest/config'

// Testlar dev ma'lumotlarga tegmaydi: alohida vaqtinchalik JSON fayl ishlatiladi, demo ma'lumotlarsiz (faqat admin).
export default defineConfig({
  test: {
    env: { DB_FILE: 'server/data/test-db.json', SEED_DEMO: 'false', KV_REST_API_URL: '', KV_REST_API_TOKEN: '', UPSTASH_REDIS_REST_URL: '', UPSTASH_REDIS_REST_TOKEN: '' },
    fileParallelism: false,
  },
})
