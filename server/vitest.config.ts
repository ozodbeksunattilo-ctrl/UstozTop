import { defineConfig } from 'vitest/config'

// Testlar dev bazaga yozmaydi: alohida `ustoztop_test` bazasi ishlatiladi (globalSetup uni yaratadi).
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://ustoztop:ustoztop@localhost:5433/ustoztop_test?schema=public'

export default defineConfig({
  test: {
    env: { DATABASE_URL: TEST_DATABASE_URL },
    globalSetup: ['./tests/globalSetup.ts'],
    fileParallelism: false,
  },
})
