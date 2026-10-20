import { useEffect, useRef, useState } from 'react'
import { CameraIcon, CloseIcon, ImageIcon, SendIcon, StopIcon } from './Icons.jsx'

const MAX_LENGTH = 8000
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default function ChatInput({ value, onChange, onSend, onStop, loading, inputRef }) {
  const innerRef = useRef(null)
  const uploadRef = useRef(null)
  const cameraRef = useRef(null)
  const ref = inputRef || innerRef
  const [image, setImage] = useState(null)
  const [imageError, setImageError] = useState('')

  useEffect(() => {
    const element = ref.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`
  }, [value, ref])

  async function handleImageSelect(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setImageError('JPG, PNG yoki WebP rasm tanlang.')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError('Rasm hajmi 5 MB dan oshmasin.')
      return
    }

    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Rasmni o‘qib bo‘lmadi.'))
        reader.onerror = () => reject(new Error('Rasmni o‘qib bo‘lmadi.'))
        reader.readAsDataURL(file)
      })
      setImage({ dataUrl, mimeType: file.type, name: file.name })
      setImageError('')
    } catch (error) {
      setImageError(error.message || 'Rasmni o‘qib bo‘lmadi.')
    }
  }

  function send() {
    if ((!value.trim() && !image) || loading) return
    onSend(value, image)
    setImage(null)
    setImageError('')
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      send()
    }
  }

  const remaining = MAX_LENGTH - value.length
  const showCounter = remaining <= 500

  return (
    <div className="ai-composer-wrap border-t border-white/[0.07] bg-[#0a0b14]/80 px-3 pb-3 pt-3 backdrop-blur-xl sm:px-5 sm:pb-4">
      <div className="mx-auto max-w-3xl">
        {image && (
          <div className="ai-image-preview">
            <img src={image.dataUrl} alt="Yuklanadigan rasm" />
            <span>{image.name}</span>
            <button type="button" onClick={() => setImage(null)} aria-label="Rasmni olib tashlash"><CloseIcon /></button>
          </div>
        )}
        {imageError && <p className="ai-image-error" role="alert">{imageError}</p>}
        <div className="ai-composer flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.045] p-2 pl-3.5 transition focus-within:border-violet-400/40 focus-within:bg-white/[0.06] focus-within:ring-4 focus-within:ring-violet-500/10">
          <input ref={uploadRef} type="file" accept={ACCEPTED_IMAGE_TYPES.join(',')} onChange={handleImageSelect} className="sr-only" tabIndex={-1} />
          <input ref={cameraRef} type="file" accept={ACCEPTED_IMAGE_TYPES.join(',')} capture="environment" onChange={handleImageSelect} className="sr-only" tabIndex={-1} />
          <button type="button" className="ai-attach-button" title="Rasm yuklash" aria-label="Rasm yuklash" onClick={() => uploadRef.current?.click()} disabled={loading}><ImageIcon /></button>
          <button type="button" className="ai-attach-button ai-camera-button" title="Kamera bilan rasmga olish" aria-label="Kamera bilan rasmga olish" onClick={() => cameraRef.current?.click()} disabled={loading}><CameraIcon /></button>
          <textarea
            ref={ref}
            value={value}
            onChange={(event) => onChange(event.target.value.slice(0, MAX_LENGTH))}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Savolingizni yozing..."
            aria-label="Xabar matni"
            className="max-h-40 min-h-[2.5rem] flex-1 resize-none bg-transparent py-2 text-sm leading-relaxed text-[#f0efff] outline-none placeholder:text-[#7d7897] sm:text-[15px]"
          />

          {loading ? (
            <button
              type="button"
              onClick={onStop}
              title="Javobni to'xtatish"
              aria-label="Javobni to'xtatish"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] text-[#d6d2e8] transition hover:bg-white/[0.12]"
            >
              <StopIcon className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={send}
              disabled={!value.trim() && !image}
              title="Yuborish (Enter)"
              aria-label="Xabarni yuborish"
              className="send-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition"
            >
              <SendIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-[#6f6a8a]">
          <p className="hidden sm:block">
            <kbd className="rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 font-sans text-[10px]">Enter</kbd>
            {' '}— yuborish,{' '}
            <kbd className="rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 font-sans text-[10px]">Shift + Enter</kbd>
            {' '}— yangi qator
          </p>
          <p className="sm:hidden">Enter — yuborish</p>
          {showCounter && <span className="tabular-nums text-amber-300/80">{remaining} belgi qoldi</span>}
        </div>
      </div>
    </div>
  )
}
