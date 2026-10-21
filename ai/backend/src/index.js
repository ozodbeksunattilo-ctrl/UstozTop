import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { generateReply, hasApiKey, uiErrorMessage } from './gemini.js'
import { parseMessages } from './parseMessages.js'
import { rateLimiter } from './rateLimit.js'

const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/

const app = express()

app.disable('x-powered-by')
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.allowedOrigins.includes(origin) || LOCAL_ORIGIN.test(origin)) return callback(null, true)
      return callback(null, false)
    },
  }),
)
app.use(express.json({ limit: '9mb' }))

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ustoztop-ai-backend',
    model: config.model,
    apiKeyConfigured: hasApiKey(),
    time: new Date().toISOString(),
  })
})

app.post('/api/chat', rateLimiter, async (req, res) => {
  const messages = parseMessages(req.body)

  if (!messages) {
    return res.status(400).json({
      error: 'Xabar matnini yoki 5 MB dan kichik JPG, PNG yoki WebP rasm yuboring.',
      code: 'INVALID_MESSAGE',
    })
  }

  try {
    const { text, model } = await generateReply(messages)
    return res.json({ reply: text, model })
  } catch (error) {
    const { message, code } = uiErrorMessage(error)
    const status = Number.isInteger(error?.status) ? error.status : 500
    console.error(`[chat] ${code}:`, error?.message || error)
    return res.status(status).json({ error: message, code })
  }
})

app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint topilmadi.', code: 'NOT_FOUND' })
})

app.use((error, _req, res, _next) => {
  console.error('[server]', error?.message || error)
  const status = error?.type === 'entity.too.large' ? 413 : 500
  res.status(status).json({
    error: status === 413 ? 'So\'rov hajmi juda katta.' : 'Serverda xatolik yuz berdi.',
    code: status === 413 ? 'PAYLOAD_TOO_LARGE' : 'SERVER_ERROR',
  })
})

app.listen(config.port, () => {
  console.log(`Ustoz yordamchi backend: http://localhost:${config.port}`)
  console.log(`Model: ${config.model}`)
  console.log(
    hasApiKey()
      ? 'AI kaliti aniqlandi.'
      : 'DIQQAT: AI kaliti topilmadi. ai/backend/.env faylini to\'ldiring.',
  )
})
