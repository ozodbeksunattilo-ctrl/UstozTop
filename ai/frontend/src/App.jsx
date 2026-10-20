import { useCallback, useEffect, useRef, useState } from 'react'
import ChatHeader from './components/ChatHeader.jsx'
import ChatInput from './components/ChatInput.jsx'
import ChatMessage from './components/ChatMessage.jsx'
import TypingIndicator from './components/TypingIndicator.jsx'
import WelcomeScreen from './components/WelcomeScreen.jsx'
import { checkHealth, sendChat } from './lib/api.js'

const STORAGE_KEY = 'ustoztop_ai_chat_v1'
const MAX_HISTORY = 20

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function loadMessages() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item) => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string')
      .slice(-MAX_HISTORY * 2)
      .map((item) => ({
        id: item.id || uid(),
        role: item.role,
        content: item.content,
        model: item.model,
        time: item.time || Date.now(),
        error: false,
      }))
  } catch {
    return []
  }
}

function App() {
  const [messages, setMessages] = useState(loadMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [backend, setBackend] = useState({ status: 'checking', model: '' })

  const scrollRef = useRef(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    const controller = new AbortController()

    checkHealth(controller.signal).then((data) => {
      if (!data) {
        setBackend({ status: 'offline', model: '' })
      } else if (!data.apiKeyConfigured) {
        setBackend({ status: 'unconfigured', model: data.model || '' })
      } else {
        setBackend({ status: 'online', model: data.model || '' })
      }
    })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    try {
      const persistable = messages
        .filter((message) => !message.error)
        .slice(-MAX_HISTORY * 2)
        .map(({ id, role, content, model, time }) => ({ id, role, content, model, time }))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable))
    } catch {
      /* localStorage to'lgan bo'lishi mumkin - e'tiborsiz qoldiramiz */
    }
  }, [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, loading])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const requestReply = useCallback(async (history) => {
    const controller = new AbortController()
    abortRef.current = controller
    const requestId = ++requestIdRef.current
    setLoading(true)

    try {
      const lastImageIndex = history.findLastIndex((message) => message.role === 'user' && message.image)
      const requestMessages = history.map(({ role, content, image }, index) => ({
        role,
        content,
        ...(index === lastImageIndex && image
          ? { image: { mimeType: image.mimeType, data: image.dataUrl.split(',')[1] } }
          : {}),
      }))
      const data = await sendChat(requestMessages, controller.signal)

      if (requestIdRef.current !== requestId) return

      setMessages((current) => [
        ...current,
        {
          id: uid(),
          role: 'assistant',
          content: data.reply,
          model: data.model,
          time: Date.now(),
          error: false,
        },
      ])
      setBackend({ status: 'online', model: data.model || '' })
    } catch (error) {
      if (error?.name === 'AbortError' || requestIdRef.current !== requestId) return

      setMessages((current) => [
        ...current,
        {
          id: uid(),
          role: 'assistant',
          content: error?.message || 'Kutilmagan xatolik yuz berdi.',
          error: true,
          time: Date.now(),
        },
      ])

      if (error?.code === 'NETWORK_ERROR') setBackend({ status: 'offline', model: '' })
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false)
        abortRef.current = null
      }
    }
  }, [])

  const handleSend = useCallback(
    (text, image) => {
      const trimmed = typeof text === 'string' ? text.trim() : input.trim()
      if ((!trimmed && !image) || loading) return

      const userMessage = { id: uid(), role: 'user', content: trimmed, image, time: Date.now(), error: false }
      const history = [...messages.filter((message) => !message.error), userMessage]

      setMessages(history)
      setInput('')
      inputRef.current?.focus()
      requestReply(history)
    },
    [input, loading, messages, requestReply],
  )

  const handleRetry = useCallback(() => {
    if (loading) return
    const history = messages.filter((message) => !message.error)
    if (!history.length) return
    setMessages(history)
    requestReply(history)
  }, [loading, messages, requestReply])

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    requestIdRef.current += 1
    setLoading(false)
    inputRef.current?.focus()
  }, [])

  const handleClear = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    requestIdRef.current += 1
    setLoading(false)
    setMessages([])
    setInput('')
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    inputRef.current?.focus()
  }, [])

  return (
    <div className="app-bg flex h-dvh flex-col overflow-hidden">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-hidden sm:px-4 sm:py-4 lg:px-6 lg:py-6">
        <div className="glass flex min-h-0 flex-1 flex-col overflow-hidden border-x-0 sm:rounded-3xl sm:border-x sm:shadow-2xl sm:shadow-black/40">
          <ChatHeader
            status={backend.status}
            model={backend.model}
            onClear={handleClear}
            hasMessages={messages.length > 0}
          />

          {backend.status === 'unconfigured' && (
            <div className="border-b border-amber-400/15 bg-amber-400/[0.07] px-4 py-2 text-center text-[11px] text-amber-200/90 sm:text-xs">
              GEMINI_API_KEY sozlanmagan. <code className="rounded bg-black/30 px-1 py-0.5">ai/backend/.env</code> fayliga
              kalitni qo'shib, backendni qayta ishga tushiring.
            </div>
          )}

          <main ref={scrollRef} className="scroll-area min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
            {messages.length === 0 && !loading ? (
              <WelcomeScreen onPick={handleSend} />
            ) : (
              <div className="mx-auto w-full max-w-3xl space-y-5">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    onRetry={message.error ? handleRetry : undefined}
                  />
                ))}
                {loading && <TypingIndicator />}
                <div ref={bottomRef} className="h-px" />
              </div>
            )}
          </main>

          <ChatInput
            value={input}
            onChange={setInput}
            onSend={handleSend}
            onStop={handleStop}
            loading={loading}
            inputRef={inputRef}
          />
        </div>

        <p className="hidden py-2.5 text-center text-[11px] text-[#5f5b76] sm:block">
          Ustoz yordamchi · Gemini AI · Javoblarni tekshirish tavsiya etiladi
        </p>
      </div>
    </div>
  )
}

export default App
