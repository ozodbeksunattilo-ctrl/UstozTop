import { config } from './config.js'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function hasMatchingImageSignature(mimeType, bytes) {
  if (mimeType === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (mimeType === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  if (mimeType === 'image/webp') return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
  return false
}

export function parseMessages(body) {
  if (!body || typeof body !== 'object' || !Array.isArray(body.messages)) return null
  if (body.messages.length > config.maxHistoryMessages * 2) return null

  const messages = body.messages.map((item) => {
    if (!item || typeof item !== 'object') return null
    const role = item.role === 'assistant' || item.role === 'model' ? 'model' : 'user'
    const content = typeof item.content === 'string' ? item.content.trim() : ''
    let image

    if (item.image !== undefined) {
      if (role !== 'user' || !SUPPORTED_IMAGE_TYPES.has(item.image?.mimeType) || typeof item.image?.data !== 'string') {
        return null
      }

      const encoded = item.image.data
      if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) return null
      const bytes = Buffer.from(encoded, 'base64')
      if (!bytes.length || bytes.length > MAX_IMAGE_BYTES || bytes.toString('base64') !== encoded) return null
      if (!hasMatchingImageSignature(item.image.mimeType, bytes)) return null
      image = { mimeType: item.image.mimeType, data: encoded }
    }

    if (content.length > config.maxMessageLength || (!content && !image)) return null
    return { role, content, ...(image ? { image } : {}) }
  })

  return messages.some((message) => message === null) || messages.length === 0
    ? null
    : messages.slice(-config.maxHistoryMessages)
}
