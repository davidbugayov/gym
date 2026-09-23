import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { handleApi } from './api/server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = +(process.env.PORT || 3000);
const HOST = '0.0.0.0';

const app = express();

// 1. Forward all /api/* requests to the Gymly API router
app.use(async (req, res, next) => {
  if (req.url.startsWith('/api/') || req.url === '/api') {
    const handled = await handleApi(req, res);
    if (handled) return;
    if (!res.headersSent) {
      res.status(404).json({ error: 'not found' });
    }
    return;
  }
  next();
});

// 2. Exercise media proxy / redirect to CDN dataset
const CDN_IMG = 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@7455efae41b330c265e7cd4b78dfa848e7ce5ebd/images/';
const CDN_GIF = 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@7455efae41b330c265e7cd4b78dfa848e7ce5ebd/videos/';

app.get('/img/:file', (req, res) => {
  res.redirect(302, CDN_IMG + encodeURIComponent(req.params.file));
});

app.get('/gif/:file', (req, res) => {
  res.redirect(302, CDN_GIF + encodeURIComponent(req.params.file));
});

// 3. Frontend serving
const isProduction = process.env.NODE_ENV === 'production';
const distPath = path.resolve(__dirname, 'dist');

if (isProduction) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // Vite dev server middleware
  const vite = await createViteServer({
    root: path.resolve(__dirname, 'frontend'),
    server: {
      middlewareMode: true,
      hmr: false,
      ws: false,
    },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(PORT, HOST, () => {
  console.log(`Gymly unified server listening on http://${HOST}:${PORT}`);
});
