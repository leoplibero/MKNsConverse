import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AppError } from '../utils/errors.js';
import { ValidationError } from '../utils/validation.js';

const PASSWORD_ITERATIONS = 120000;
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_DIGEST = 'sha512';

function createEmptyStore() {
  return { users: [], sessions: [] };
}

function ensureDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function loadStore(config) {
  try {
    const raw = fs.readFileSync(config.authDbPath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : []
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return createEmptyStore();
    }
    throw new AppError('Nao foi possivel ler o cadastro de autenticacao', 500, 'AUTH_STORAGE_READ_ERROR');
  }
}

function saveStore(config, store) {
  ensureDirectory(config.authDbPath);
  fs.writeFileSync(config.authDbPath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function safePasswordHash(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST).toString('hex');
  return { salt, hash };
}

function timingSafeEqual(expected, received) {
  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(received, 'hex');

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

function verifyPassword(password, record) {
  const { hash } = safePasswordHash(password, record.salt);
  return timingSafeEqual(record.hash, hash);
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function base64UrlJson(value) {
  return base64UrlEncode(JSON.stringify(value));
}

function signTokenPayload(config, encodedPayload) {
  return crypto
    .createHmac('sha256', config.authTokenSecret)
    .update(encodedPayload)
    .digest('base64url');
}

function createStatelessToken(config, user, source = 'login') {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + config.authTokenTtlMs;
  const payload = {
    v: 1,
    source,
    issuedAt,
    expiresAt,
    user: createPublicUser(user)
  };
  const encodedPayload = base64UrlJson(payload);
  const signature = signTokenPayload(config, encodedPayload);

  return {
    user: payload.user,
    token: `session_v1.${encodedPayload}.${signature}`,
    expiresAt
  };
}

function validateStatelessSession(config, token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3 || parts[0] !== 'session_v1') {
    throw new AppError('Sessao expirada ou invalida', 401, 'INVALID_SESSION');
  }

  const [, encodedPayload, signature] = parts;
  const expectedSignature = signTokenPayload(config, encodedPayload);
  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== receivedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
    throw new AppError('Sessao expirada ou invalida', 401, 'INVALID_SESSION');
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    throw new AppError('Sessao expirada ou invalida', 401, 'INVALID_SESSION');
  }

  if (Number(payload.expiresAt) <= Date.now() || !payload.user?.id || !payload.user?.email) {
    throw new AppError('Sessao expirada ou invalida', 401, 'INVALID_SESSION');
  }

  return {
    user: payload.user,
    token,
    expiresAt: payload.expiresAt
  };
}

function createPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  };
}

function pruneExpiredSessions(store, now = Date.now()) {
  store.sessions = store.sessions.filter((session) => Number(session.expiresAt) > now);
}

function pruneExpiredRecoveries(store, now = Date.now()) {
  store.users.forEach((user) => {
    if (user.recovery && Number(user.recovery.expiresAt) <= now) {
      delete user.recovery;
    }
  });
}

function persistStore(config, store) {
  pruneExpiredSessions(store);
  pruneExpiredRecoveries(store);
  saveStore(config, store);
}

function findUser(store, email) {
  return store.users.find((user) => user.email === normalizeEmail(email));
}

function revokeUserSessions(store, userId) {
  store.sessions = store.sessions.filter((session) => session.userId !== userId);
}

function createSession(config, store, user, source = 'login') {
  if (config.statelessAuth) {
    return createStatelessToken(config, user, source);
  }

  revokeUserSessions(store, user.id);

  const token = `session_${crypto.randomBytes(24).toString('hex')}`;
  const issuedAt = Date.now();
  const expiresAt = issuedAt + config.authTokenTtlMs;

  store.sessions.push({
    tokenHash: hashToken(token),
    userId: user.id,
    issuedAt,
    expiresAt,
    source
  });

  persistStore(config, store);

  return {
    user: createPublicUser(user),
    token,
    expiresAt
  };
}

export function registerUser(config, payload) {
  const store = loadStore(config);
  const email = normalizeEmail(payload.email);

  if (findUser(store, email)) {
    throw new ValidationError('Ja existe uma conta com este email', [{ field: 'email', rule: 'unique' }]);
  }

  const passwordRecord = safePasswordHash(payload.password);
  const now = new Date().toISOString();
  const user = {
    id: crypto.randomUUID(),
    name: payload.name,
    email,
    password: passwordRecord,
    createdAt: now,
    updatedAt: now
  };

  store.users.push(user);
  persistStore(config, store);

  return createSession(config, store, user, 'register');
}

export function authenticateUser(config, payload) {
  const store = loadStore(config);
  const user = findUser(store, payload.email);

  if (!user || !verifyPassword(payload.password, user.password)) {
    throw new AppError('Email ou senha invalidos', 401, 'INVALID_CREDENTIALS');
  }

  return createSession(config, store, user, 'login');
}

export function validateSession(config, token) {
  if (config.statelessAuth) {
    return validateStatelessSession(config, token);
  }

  const store = loadStore(config);
  pruneExpiredSessions(store);
  const tokenHash = hashToken(token);
  const session = store.sessions.find((item) => item.tokenHash === tokenHash);

  if (!session) {
    throw new AppError('Sessao expirada ou invalida', 401, 'INVALID_SESSION');
  }

  const user = store.users.find((item) => item.id === session.userId);

  if (!user) {
    throw new AppError('Sessao expirada ou invalida', 401, 'INVALID_SESSION');
  }

  return {
    user: createPublicUser(user),
    token,
    expiresAt: session.expiresAt
  };
}

export function requestPasswordRecovery(config, payload) {
  const store = loadStore(config);
  const user = findUser(store, payload.email);

  if (!user) {
    return {
      message: 'Se o email existir, um codigo de recuperacao foi gerado.',
      recoveryToken: null,
      recoveryExpiresAt: null
    };
  }

  const recoveryToken = `recovery_${crypto.randomBytes(18).toString('hex')}`;
  const recoveryExpiresAt = Date.now() + config.authRecoveryTtlMs;

  user.recovery = {
    tokenHash: hashToken(recoveryToken),
    expiresAt: recoveryExpiresAt,
    issuedAt: Date.now()
  };
  user.updatedAt = new Date().toISOString();

  persistStore(config, store);

  return {
    message: 'Codigo de recuperacao gerado.',
    recoveryToken,
    recoveryExpiresAt
  };
}

export function resetPassword(config, payload) {
  const store = loadStore(config);
  const user = findUser(store, payload.email);

  if (!user || !user.recovery) {
    throw new AppError('Codigo de recuperacao invalido', 401, 'INVALID_RECOVERY_TOKEN');
  }

  if (Number(user.recovery.expiresAt) <= Date.now()) {
    delete user.recovery;
    persistStore(config, store);
    throw new AppError('Codigo de recuperacao expirado', 401, 'INVALID_RECOVERY_TOKEN');
  }

  if (user.recovery.tokenHash !== hashToken(payload.recoveryToken)) {
    throw new AppError('Codigo de recuperacao invalido', 401, 'INVALID_RECOVERY_TOKEN');
  }

  user.password = safePasswordHash(payload.password);
  user.updatedAt = new Date().toISOString();
  delete user.recovery;
  revokeUserSessions(store, user.id);

  persistStore(config, store);

  return createSession(config, store, user, 'password-reset');
}

export function extractBearerToken(req) {
  const header = String(req.headers.authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

export function requireSession(config) {
  return (req, res, next) => {
    try {
      const token = extractBearerToken(req);
      if (!token) {
        throw new AppError('Sessao expirada ou invalida', 401, 'INVALID_SESSION');
      }

      req.session = validateSession(config, token);
      next();
    } catch (error) {
      next(error);
    }
  };
}
