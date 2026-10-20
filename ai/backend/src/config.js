import 'dotenv/config'

const DEFAULT_MODEL = 'gemini-3.5-flash'
const FALLBACK_MODELS = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3-flash-preview']

export const config = {
  apiKey: (process.env.GEMINI_API_KEY || '').trim(),
  model: (process.env.GEMINI_MODEL || DEFAULT_MODEL).trim(),
  port: Number(process.env.PORT) || 8787,
  allowedOrigins: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
  ],
  fallbackModels: FALLBACK_MODELS,
  maxMessageLength: 8000,
  maxHistoryMessages: 20,
  requestTimeoutMs: 60000,
}
