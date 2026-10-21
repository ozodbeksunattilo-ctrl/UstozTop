// Vercel serverless funksiyasi: butun Express API (npm run build server/dist ga yig'adi). /api/* so'rovlari vercel.json orqali shu yerga keladi.
import { createApp } from '../server/dist/src/app.js'

export default createApp()
