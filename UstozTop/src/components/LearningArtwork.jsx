function LearningArtwork() {
  return (
    <svg className="h-full w-full" viewBox="0 0 640 330" role="img" aria-label="Bilim va ta'lim ramzi">
      <defs>
        <radialGradient id="art-glow">
          <stop offset="0" stopColor="#8f63ff" stopOpacity=".38" />
          <stop offset="1" stopColor="#8f63ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="book-cover" x1="0" x2="1" y1="0" y2="1">
          <stop stopColor="#c4a0ff" />
          <stop offset=".5" stopColor="#7152d9" />
          <stop offset="1" stopColor="#332660" />
        </linearGradient>
        <linearGradient id="book-page" x1="0" x2="0" y1="0" y2="1">
          <stop stopColor="#f5edff" />
          <stop offset="1" stopColor="#a89acb" />
        </linearGradient>
        <filter id="art-blur"><feGaussianBlur stdDeviation="20" /></filter>
      </defs>
      <ellipse cx="320" cy="170" rx="245" ry="125" fill="url(#art-glow)" filter="url(#art-blur)" />
      <ellipse cx="320" cy="170" rx="223" ry="80" fill="none" stroke="#a77aff" strokeOpacity=".68" strokeWidth="1.5" transform="rotate(-13 320 170)" />
      <ellipse cx="320" cy="170" rx="203" ry="68" fill="none" stroke="#55d8e7" strokeOpacity=".7" strokeWidth="1.2" transform="rotate(-13 320 170)" />
      <ellipse cx="320" cy="170" rx="233" ry="91" fill="none" stroke="#d4b1ff" strokeOpacity=".45" strokeWidth="1" transform="rotate(11 320 170)" />
      <g fill="#e5cbff">
        <circle cx="115" cy="120" r="2.2" /><circle cx="475" cy="82" r="2" />
        <circle cx="500" cy="215" r="2.4" /><circle cx="172" cy="251" r="1.8" />
        <circle cx="368" cy="63" r="1.7" /><circle cx="262" cy="271" r="1.5" />
      </g>
      <g transform="translate(320 163) rotate(-8)">
        <path d="M-130-52c39-12 83-2 130 25v126c-45-25-89-35-130-22V-52Z" fill="url(#book-cover)" stroke="#d6b9ff" strokeWidth="2" />
        <path d="M130-52C91-64 47-54 0-27v126c45-25 89-35 130-22V-52Z" fill="url(#book-cover)" stroke="#d6b9ff" strokeWidth="2" />
        <path d="M-118-40c34-8 70 0 106 20v99c-37-18-72-25-106-18v-101Z" fill="url(#book-page)" />
        <path d="M118-40c-34-8-70 0-106 20v99c37-18 72-25 106-18v-101Z" fill="url(#book-page)" />
        <path d="M0-27v126" stroke="#594287" strokeWidth="4" />
        <g stroke="#8374a8" strokeWidth="2" opacity=".7">
          <path d="M-99-20c24-4 48 1 72 12M-99-4c24-4 48 1 72 12M-99 12c24-4 48 1 72 12M-99 28c24-4 48 1 72 12" />
          <path d="M99-20c-24-4-48 1-72 12M99-4c-24-4-48 1-72 12M99 12c-24-4-48 1-72 12M99 28c-24-4-48 1-72 12" />
        </g>
      </g>
      <path d="m517 113 4 10 10 4-10 4-4 10-4-10-10-4 10-4 4-10Z" fill="#a989ff" />
      <path d="m130 195 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" fill="#56d8e7" />
    </svg>
  )
}

export default LearningArtwork
