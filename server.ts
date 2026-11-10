/**
 * Corper Wee: Full-Stack Express Server with Vite Dev Middlewares
 * Port: 3000
 */
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './server/config/env.js';
import { requestLogger } from './server/middleware/logger.js';
import { errorHandler } from './server/middleware/errorHandler.js';
import { apiRouter } from './server/routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();

  // Middleware
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // Mount API v1 router
  app.use('/api/v1', apiRouter);

  // Root health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Corper Wee Full-Stack Host',
      environment: config.env,
      superadminConfigured: config.superadmin.email,
      timestamp: new Date().toISOString(),
    });
  });

  // Vite Integration: Middleware mode in development, static files in production
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // Centralized Error Handler
  app.use(errorHandler);

  const port = config.port;
  app.listen(port, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`[Corper Wee] Server running at http://0.0.0.0:${port}`);
    console.log(`[Corper Wee] API Root: http://0.0.0.0:${port}/api/v1`);
    console.log(`[Corper Wee] Superadmin: ${config.superadmin.email} (${config.superadmin.stateCode})`);
    console.log(`=======================================================`);
  });
}

startServer().catch((err) => {
  console.error('[Corper Wee] Fatal server startup error:', err);
  process.exit(1);
});
