const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, code = 'UNKNOWN', status = 0) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

async function parseJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function fallbackMessage(status) {
  if (status === 429) return 'So\'rovlar juda ko\'p. Birozdan so\'ng qayta urinib ko\'ring.'
  if (status === 413) return 'Xabar juda uzun.'
  if (status >= 500) return 'Serverda xatolik yuz berdi. Qayta urinib ko\'ring.'
  return 'So\'rovni bajarib bo\'lmadi. Qayta urinib ko\'ring.'
}

export async function sendChat(messages, signal) {
  let response

  try {
    response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw new ApiError(
      'Backend serverga ulanib bo\'lmadi. Server ishlab turganini tekshiring.',
      'NETWORK_ERROR',
      0,
    )
  }

  const data = await parseJson(response)

  if (!response.ok) {
    throw new ApiError(data?.error || fallbackMessage(response.status), data?.code || 'HTTP_ERROR', response.status)
  }

  if (!data?.reply) {
    throw new ApiError('AI bo\'sh javob qaytardi. Qayta urinib ko\'ring.', 'EMPTY_RESPONSE', 502)
  }

  return data
}

export async function checkHealth(signal) {
  try {
    const response = await fetch(`${API_BASE}/health`, { signal })
    if (!response.ok) return null
    return await parseJson(response)
  } catch {
    return null
  }
}
