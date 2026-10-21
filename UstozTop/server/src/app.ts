import cookieParser from 'cookie-parser'
import express from 'express'
import helmet from 'helmet'
import { errorHandler } from './lib/http.js'
import { loadUser } from './middleware/auth.js'
import { databaseSession } from './lib/persist.js'
import { adminRouter } from './routes/admin.js'
import { aiRouter } from './routes/ai.js'
import { authRouter } from './routes/auth.js'
import { catalogRouter } from './routes/catalog.js'
import { studentRouter } from './routes/student.js'
import { teacherRouter } from './routes/teacher.js'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1)
  app.use(helmet({ contentSecurityPolicy: false }))
  app.use('/api/chat', express.json({ limit: '9mb' }))
  app.use(express.json({ limit: '100kb' }))
  app.use(cookieParser())

  app.get('/api/status', (_req, res) => {
    res.json({ status: 'ok', service: 'ustoztop-api', time: new Date().toISOString() })
  })

  app.use('/api', aiRouter)
  app.use('/api', databaseSession)
  app.use('/api', loadUser)
  app.use('/api/auth', authRouter)
  app.use('/api/admin', adminRouter)
  app.use('/api/teacher', teacherRouter)
  app.use('/api/student', studentRouter)
  app.use('/api', catalogRouter)

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Endpoint topilmadi.', code: 'NOT_FOUND' })
  })
  app.use(errorHandler)
  return app
}
