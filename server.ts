/**
 * Corper Wee: Full-Stack Express Server with Vite Dev Middlewares & Production Hardening
 * Port: 3000
 */
import express from 'express';
import fs from 'fs';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { config, validateProductionConfig } from './server/config/env.js';
import { requestLogger } from './server/middleware/logger.js';
import { errorHandler } from './server/middleware/errorHandler.js';
import { apiRouter } from './server/routes/api.js';
import { MultiplayerGateway } from './server/multiplayerGateway.js';
import {
  PRIVACY_POLICY,
  TERMS_OF_SERVICE,
  renderLegalDocumentHtml,
} from './server/routes/legalContent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const startupReport = validateProductionConfig();
  for (const warning of startupReport.warnings) {
    console.warn(`[Corper Wee Config Warning] ${warning}`);
  }
  if (!startupReport.valid) {
    for (const err of startupReport.errors) {
      console.error(`[Corper Wee Config Error] ${err}`);
    }
    throw new Error('Invalid production configuration');
  }

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Security headers & production CORS
  app.use((req, res, next) => {
    const origin = req.header('origin');
    if (origin && config.allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Request-Id');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (config.isProduction) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Body parsers & structured logger
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // Mount API v1 router
  app.use('/api/v1', apiRouter);

  // Public Legal Pages (Required for Google Play Store & Android release compliance)
  app.get('/legal/privacy', (_req, res) => {
    res.status(200).type('html').send(renderLegalDocumentHtml(PRIVACY_POLICY));
  });
  app.get('/legal/terms', (_req, res) => {
    res.status(200).type('html').send(renderLegalDocumentHtml(TERMS_OF_SERVICE));
  });

  // Root health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Corper Wee Full-Stack Host',
      environment: config.env,
      version: config.releaseVersion,
      superadminConfigured: config.superadmin.email,
      timestamp: new Date().toISOString(),
    });
  });

  // Vite Integration: Middleware mode in development, static files in production
  const isProd = config.isProduction;
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    // Serve the separate Admin Portal React + TS app at /admin and /admin/*
    app.get(['/admin', '/admin/*'], async (req, res, next) => {
      if (path.extname(req.path)) {
        return next();
      }
      try {
        const adminHtmlPath = path.resolve(__dirname, 'admin.html');
        const rawHtml = fs.readFileSync(adminHtmlPath, 'utf-8');
        const transformed = await vite.transformIndexHtml(req.originalUrl, rawHtml);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(transformed);
      } catch (err) {
        next(err);
      }
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath, { maxAge: '7d', index: false }));
    app.get(['/admin', '/admin/*'], (_req, res) => {
      res.sendFile(path.resolve(distPath, 'admin.html'));
    });
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // Centralized Error Handler
  app.use(errorHandler);

  const port = config.port;
  const httpServer = http.createServer(app);

  // Initialize WebSocket Multiplayer Gateway
  MultiplayerGateway.initialize(httpServer);

  const shutdown = (signal: string) => {
    console.log(`[Corper Wee] Received ${signal}, draining connections cleanly...`);
    MultiplayerGateway.destroy();
    httpServer.close(() => {
      console.log('[Corper Wee] HTTP & WebSocket servers closed cleanly.');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`[Corper Wee] Server running at http://0.0.0.0:${port}`);
    console.log(`[Corper Wee] Admin Portal: http://0.0.0.0:${port}/admin`);
    console.log(`[Corper Wee] API Root: http://0.0.0.0:${port}/api/v1`);
    console.log(`[Corper Wee] WebSocket: ws://0.0.0.0:${port}/ws`);
    console.log(`[Corper Wee] Legal: /legal/privacy | /legal/terms`);
    console.log(`[Corper Wee] Superadmin: ${config.superadmin.email} (${config.superadmin.stateCode})`);
    console.log(`=======================================================`);
  });
}

startServer().catch((err) => {
  console.error('[Corper Wee] Fatal server startup error:', err);
  process.exit(1);
});
