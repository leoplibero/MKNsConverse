import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const DEFAULT_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174', 'http://localhost:5175', 'http://127.0.0.1:5175'];
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseList(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getConfig(overrides = {}) {
  const env = { ...process.env, ...(overrides.env ?? {}) };

  return {
    port: parseNumber(env.PORT, 3001),
    nodeEnv: env.NODE_ENV || 'development',
    anthropicApiKey: env.ANTHROPIC_API_KEY || '',
    anthropicModel: env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
    allowedOrigins: parseList(env.ALLOWED_ORIGINS).length
      ? parseList(env.ALLOWED_ORIGINS)
      : DEFAULT_ORIGINS,
    jsonLimit: env.JSON_LIMIT || '64kb',
    maxConversaChars: parseNumber(env.MAX_CONVERSA_CHARS, 12000),
    maxContextoChars: parseNumber(env.MAX_CONTEXTO_CHARS, 2000),
    maxPessoaChars: parseNumber(env.MAX_PESSOA_CHARS, 80),
    rateLimitWindowMs: parseNumber(env.ANALISE_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    rateLimitMax: parseNumber(env.ANALISE_RATE_LIMIT_MAX, 20),
    requestTimeoutMs: parseNumber(env.REQUEST_TIMEOUT_MS, 20000),
    historyLimit: parseNumber(env.HISTORY_LIMIT, 5),
    historyDbPath: env.HISTORY_DB_PATH || path.resolve(__dirname, '../storage/history.sqlite'),
    authDbPath: env.AUTH_DB_PATH || path.resolve(__dirname, '../storage/auth.json'),
    authTokenTtlMs: parseNumber(env.AUTH_TOKEN_TTL_MS, 1000 * 60 * 60 * 24),
    authRecoveryTtlMs: parseNumber(env.AUTH_RECOVERY_TTL_MS, 1000 * 60 * 30),
    forceMock: env.ANTHROPIC_MOCK === 'true'
  };
}
