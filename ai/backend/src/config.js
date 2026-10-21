import 'dotenv/config'

// Eng tez model birinchi turadi; sekin yoki band bo'lsa keyingisiga o'tiladi.
const DEFAULT_MODEL = 'gemini-3.5-flash'
const FALLBACK_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-2.5-flash']

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
  maxHistoryMessages: 12,
  maxOutputTokens: 1400,
  requestTimeoutMs: 22000,
}
