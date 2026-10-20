import { GoogleGenAI } from '@google/genai'
import { config } from './config.js'

const SYSTEM_INSTRUCTION = `Siz "Ustoz yordamchi" - UstozTop ta'lim platformasining AI o'qituvchi yordamchisisiz.

Vazifangiz:
- O'quvchilarga matematika, ingliz tili, informatika (IT), dasturlash va boshqa maktab fanlaridan yordam berish.
- Javoblarni asosan o'zbek lotin yozuvida, sodda va tushunarli tilda yozish.
- Tushuntirishni bosqichma-bosqich (1, 2, 3 ...) berish va misollar keltirish.
- Kod misollarini markdown kod bloki (uchta teskari apostrof) ichida yozish va tilini ko'rsatish.
- Formulalarni ham markdown yoki kod bloki ko'rinishida aniq yozish.
- O'quvchini rag'batlantirish, xatosini muloyim tuzatish.
- Foydalanuvchi rasm yuborsa, undagi masala yoki matnni ko'rib tahlil qiling va yechimini tushuntiring.
- Rasm xira yoki o'qib bo'lmaydigan bo'lsa, taxmin qilmasdan aniqroq surat so'rang.

Qoidalar:
- Faqat o'quv va ta'limga oid mavzularda yordam bering.
- Noto'g'ri, xavfli yoki noqonuniy so'rovlarga yordam bermang, muloyim rad eting.
- Mavzuga oid bo'lmagan savolda qisqa javob berib, o'quv mavzusiga qaytishni taklif qiling.
- Javobni keraksiz uzun qilmang, lekin savolga to'liq javob bering.
- Suhbat tarixini hisobga olib, kontekstni davom ettiring.`

let client = null
let clientKey = null

function getClient() {
  if (!config.apiKey) return null
  if (!client || clientKey !== config.apiKey) {
    client = new GoogleGenAI({ apiKey: config.apiKey })
    clientKey = config.apiKey
  }
  return client
}

export function hasApiKey() {
  return Boolean(config.apiKey)
}

export class ChatError extends Error {
  constructor(message, status = 500, code = 'CHAT_ERROR') {
    super(message)
    this.status = status
    this.code = code
  }
}

function normalizeRole(role) {
  return role === 'assistant' || role === 'model' ? 'model' : 'user'
}

export function buildContents(messages) {
  return messages
    .filter((message) => message && (typeof message.content === 'string' && message.content.trim() || message.image))
    .slice(-config.maxHistoryMessages)
    .map((message) => ({
      role: normalizeRole(message.role),
      parts: [
        ...(typeof message.content === 'string' && message.content.trim()
          ? [{ text: message.content.trim().slice(0, config.maxMessageLength) }]
          : []),
        ...(message.image
          ? [{ inlineData: { mimeType: message.image.mimeType, data: message.image.data } }]
          : []),
      ],
    }))
}

function withTimeout(promise, ms) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new ChatError('Gemini javobi juda sekin keldi. Qayta urinib ko\'ring.', 504, 'TIMEOUT'))
    }, ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

function classifyError(error) {
  if (error instanceof ChatError) return error

  const status = error?.status ?? error?.statusCode ?? error?.code
  const raw = String(error?.message || '')

  if (/API key|API_KEY_INVALID|permission|unauthenticated/i.test(raw) || status === 401 || status === 403) {
    return new ChatError(
      'Gemini API kaliti yaroqsiz yoki ruxsat yo\'q. ai/backend/.env faylidagi GEMINI_API_KEY ni tekshiring.',
      502,
      'INVALID_API_KEY',
    )
  }

  if (/quota|RESOURCE_EXHAUSTED|rate limit/i.test(raw) || status === 429) {
    return new ChatError(
      'Gemini bepul limiti tugagan bo\'lishi mumkin. Birozdan so\'ng qayta urinib ko\'ring.',
      429,
      'QUOTA_EXCEEDED',
    )
  }

  if (/fetch failed|ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|network|socket hang up/i.test(raw)) {
    return new ChatError(
      'Internet aloqasi yo\'q yoki Gemini serveriga ulanib bo\'lmadi. Ulanishni tekshiring.',
      503,
      'NETWORK_ERROR',
    )
  }

  if (status === 404 || /not found|not supported|no longer available/i.test(raw)) {
    return new ChatError(
      'Tanlangan Gemini modeli mavjud emas. ai/backend/.env ichidagi GEMINI_MODEL ni tekshiring.',
      502,
      'MODEL_NOT_FOUND',
    )
  }

  if (status === 503 || /UNAVAILABLE|high demand|overloaded|try again later/i.test(raw)) {
    return new ChatError(
      'Gemini serveri hozir band. Birozdan so\'ng qayta urinib ko\'ring.',
      503,
      'UNAVAILABLE',
    )
  }

  if (status === 400) {
    return new ChatError('So\'rov formati noto\'g\'ri. Xabar matnini o\'zgartirib qayta urinib ko\'ring.', 400, 'BAD_REQUEST')
  }

  return new ChatError('Kutilmagan xatolik yuz berdi. Birozdan so\'ng qayta urinib ko\'ring.', 500, 'UPSTREAM_ERROR')
}

async function generateWithModel(ai, model, contents) {
  const response = await withTimeout(
    ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    }),
    config.requestTimeoutMs,
  )

  return typeof response?.text === 'string' ? response.text.trim() : ''
}

export async function generateReply(messages) {
  const ai = getClient()

  if (!ai) {
    throw new ChatError(
      'GEMINI_API_KEY sozlanmagan. ai/backend/.env fayliga API kalitini qo\'shing.',
      503,
      'MISSING_API_KEY',
    )
  }

  const contents = buildContents(messages)
  if (contents.length === 0) {
    throw new ChatError('Bo\'sh xabar yuborildi. Savolingizni yozing.', 400, 'EMPTY_MESSAGE')
  }

  const models = [...new Set([config.model, ...config.fallbackModels])]
  const retryable = new Set(['MODEL_NOT_FOUND', 'UNAVAILABLE', 'QUOTA_EXCEEDED', 'UPSTREAM_ERROR'])
  let lastError = null

  for (const model of models) {
    try {
      const text = await generateWithModel(ai, model, contents)
      if (!text) {
        throw new ChatError('Gemini bo\'sh javob qaytardi. Savolni boshqacha yozib ko\'ring.', 502, 'EMPTY_RESPONSE')
      }
      return { text, model }
    } catch (error) {
      lastError = classifyError(error)
      if (retryable.has(lastError.code)) continue
      throw lastError
    }
  }

  throw lastError ?? new ChatError('Javob olinmadi. Qayta urinib ko\'ring.', 500, 'UPSTREAM_ERROR')
}

export function uiErrorMessage(error) {
  return error instanceof ChatError
    ? { message: error.message, code: error.code }
    : { message: 'Kutilmagan xatolik yuz berdi.', code: 'UNKNOWN' }
}
