import { defineConfig } from 'vite'
import { spawn } from 'node:child_process'
import net from 'node:net'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

const AI_PORT = 8787
const API_PORT = 4000
const DB_PORT = 5433

const isPortOpen = (port) => new Promise((resolve) => {
  const socket = net.connect({ port, host: '127.0.0.1' })
  socket.once('connect', () => { socket.destroy(); resolve(true) })
  socket.once('error', () => resolve(false))
  socket.setTimeout(1500, () => { socket.destroy(); resolve(false) })
})

// Dev server bilan birga yordamchi xizmatlarni ishga tushiradi (baza, API, AI).
// Port band bo'lsa — xizmat allaqachon ishlayapti, qayta ishga tushirilmaydi; o'chib qolsa o'zi tiklanadi.
function supervise(server, { name, port, cwd, command, args, after }) {
  let child = null
  let closing = false

  async function start() {
    if (closing || child || await isPortOpen(port)) return
    if (after && !(await isPortOpen(after))) return
    child = spawn(command, args, { cwd: fileURLToPath(new URL(cwd, import.meta.url)), env: process.env, stdio: 'inherit', windowsHide: true, shell: command === 'npx' })
    child.on('error', (error) => server.config.logger.error(`${name} ishga tushmadi: ${error.message}`))
    child.on('exit', () => { child = null })
  }

  start()
  const watchdog = setInterval(start, 8000)
  server.httpServer?.once('close', () => {
    closing = true
    clearInterval(watchdog)
    child?.kill()
  })
}

function servicesPlugin() {
  return {
    name: 'ustoztop-services',
    configureServer(server) {
      supervise(server, { name: 'PostgreSQL', port: DB_PORT, cwd: '../server', command: process.execPath, args: ['node_modules/tsx/dist/cli.mjs', 'scripts/dev-db.ts'] })
      supervise(server, { name: 'UstozTop API', port: API_PORT, cwd: '../server', command: process.execPath, args: ['node_modules/tsx/dist/cli.mjs', 'src/index.ts'], after: DB_PORT })
      supervise(server, { name: 'AI backend', port: AI_PORT, cwd: '../ai/backend', command: process.execPath, args: ['src/index.js'] })
    },
  }
}

export default defineConfig({
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  plugins: [
    tailwindcss(),
    servicesPlugin(),
  ],
  server: {
    fs: {
      allow: ['..'],
    },
    proxy: {
      // AI chat alohida backend (Gemini) orqali; qolgan hamma /api so'rovlar asosiy serverga
      '/api/chat': { target: `http://localhost:${AI_PORT}`, changeOrigin: true },
      '/api/health': { target: `http://localhost:${AI_PORT}`, changeOrigin: true },
      '/api': { target: `http://localhost:${API_PORT}`, changeOrigin: true },
    },
  },
})
