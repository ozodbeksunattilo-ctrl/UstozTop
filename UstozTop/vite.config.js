import { defineConfig } from 'vite'
import { spawn } from 'node:child_process'
import net from 'node:net'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

const API_PORT = 4000

const isPortOpen = (port) => new Promise((resolve) => {
  const socket = net.connect({ port, host: '127.0.0.1' })
  socket.once('connect', () => { socket.destroy(); resolve(true) })
  socket.once('error', () => resolve(false))
  socket.setTimeout(1500, () => { socket.destroy(); resolve(false) })
})

// Dev server bilan birga yordamchi xizmatlarni ishga tushiradi (API: JSON baza va AI chat bilan birga).
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
      supervise(server, { name: 'UstozTop API', port: API_PORT, cwd: '.', command: process.execPath, args: ['node_modules/tsx/dist/cli.mjs', 'server/src/index.ts'] })
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
      allow: ['.'],
    },
    proxy: {
      '/api': { target: `http://localhost:${API_PORT}`, changeOrigin: true },
    },
  },
})
