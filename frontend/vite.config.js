import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function apiPlugin() {
  return {
    name: 'opengym-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/api/health') {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true, users: 0 }))
          return
        }
        if (req.url === '/api/config') {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ invite_only: false }))
          return
        }
        if (req.url === '/api/me') {
          res.statusCode = 401
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'not signed in' }))
          return
        }
        next()
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), apiPlugin()],
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500
  }
})
