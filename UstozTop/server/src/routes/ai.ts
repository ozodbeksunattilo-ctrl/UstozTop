import { Router } from 'express'
import { config } from '../ai/config.js'
import { generateReply, hasApiKey, uiErrorMessage } from '../ai/gemini.js'
import { parseMessages } from '../ai/parseMessages.js'
import { rateLimiter } from '../ai/rateLimit.js'

// "Ustoz yordamchi" (Gemini) chat. Ma'lumotlar bazasiga tegmaydi, shuning uchun databaseSession'dan oldin ulanadi.
export const aiRouter = Router()

aiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ustoztop-ai', model: config.model, apiKeyConfigured: hasApiKey(), time: new Date().toISOString() })
})

aiRouter.post('/chat', rateLimiter, async (req, res) => {
  const messages = parseMessages(req.body)
  if (!messages) {
    return res.status(400).json({ error: 'Xabar matnini yoki 5 MB dan kichik JPG, PNG yoki WebP rasm yuboring.', code: 'INVALID_MESSAGE' })
  }
  try {
    const { text, model } = await generateReply(messages)
    return res.json({ reply: text, model })
  } catch (error) {
    const { message, code } = uiErrorMessage(error)
    const status = Number.isInteger((error as { status?: number })?.status) ? (error as { status: number }).status : 500
    console.error(`[chat] ${code}:`, (error as Error)?.message || error)
    return res.status(status).json({ error: message, code })
  }
})
