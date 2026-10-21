import { createApp } from './app.js'
import { config } from './config.js'
import { prisma } from './lib/prisma.js'

const app = createApp()
const server = app.listen(config.port, () => {
  console.log(`UstozTop API: http://localhost:${config.port}`)
})

const shutdown = async () => {
  server.close()
  await prisma.$disconnect()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
