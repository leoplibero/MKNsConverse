import crypto from 'node:crypto';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { getConfig } from './config.js';
import { authRouter } from './routes/auth.js';
import { analiseRouter } from './routes/analise.js';
import { requireSession } from './services/authStore.js';
import { errorHandler } from './utils/errors.js';

function corsOrigin(config) {
  return (origin, callback) => {
    if (!origin || config.allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  };
}

export function createApp(overrides = {}) {
  const config = getConfig(overrides);
  const app = express();

  app.disable('x-powered-by');

  app.use((req, res, next) => {
    req.id = crypto.randomUUID();
    res.setHeader('X-Request-Id', req.id);
    next();
  });

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));

  app.use(cors({
    origin: corsOrigin(config),
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600
  }));

  app.use(express.json({
    limit: config.jsonLimit,
    strict: true,
    type: 'application/json'
  }));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  const limiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    limit: config.rateLimitMax,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      error: {
        code: 'RATE_LIMITED',
        message: 'Muitas analises em pouco tempo. Tente novamente mais tarde.'
      }
    }
  });

  const authLimiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    limit: Math.max(10, Math.min(config.rateLimitMax, 30)),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      error: {
        code: 'RATE_LIMITED',
        message: 'Muitas tentativas em pouco tempo. Tente novamente mais tarde.'
      }
    }
  });

  app.use('/api/auth', authLimiter, authRouter(config));
  app.use('/api/analise', limiter);
  app.use('/api', requireSession(config), analiseRouter(config));

  app.use((req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Rota nao encontrada',
        requestId: req.id
      }
    });
  });

  app.use(errorHandler(config));

  return app;
}
