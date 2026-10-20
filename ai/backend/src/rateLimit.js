const buckets = new Map()
const WINDOW_MS = 60 * 1000
const MAX_REQUESTS = 20

function keyOf(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown'
}

function cleanup(now) {
  for (const [key, entry] of buckets) {
    if (now - entry.start >= WINDOW_MS) buckets.delete(key)
  }
}

export function rateLimiter(req, res, next) {
  const now = Date.now()
  cleanup(now)

  const key = keyOf(req)
  let entry = buckets.get(key)

  if (!entry || now - entry.start >= WINDOW_MS) {
    entry = { start: now, count: 0 }
    buckets.set(key, entry)
  }

  entry.count += 1

  const remaining = Math.max(0, MAX_REQUESTS - entry.count)
  res.setHeader('X-RateLimit-Limit', String(MAX_REQUESTS))
  res.setHeader('X-RateLimit-Remaining', String(remaining))

  if (entry.count > MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.start + WINDOW_MS - now) / 1000)
    res.setHeader('Retry-After', String(retryAfter))
    return res.status(429).json({
      error: 'So\'rovlar juda ko\'p. Birozdan so\'ng qayta urinib ko\'ring.',
      code: 'RATE_LIMITED',
      retryAfter,
    })
  }

  return next()
}
