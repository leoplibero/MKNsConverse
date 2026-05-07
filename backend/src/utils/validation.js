export class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.code = 'VALIDATION_ERROR';
    this.details = details;
  }
}

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function stripControlChars(value) {
  return value.replace(CONTROL_CHARS, '');
}

function normalizeText(value, field, options) {
  const { required, minLength = 0, maxLength } = options;

  if (value === undefined || value === null) {
    if (required) {
      throw new ValidationError(`${field} obrigatorio`, [{ field, rule: 'required' }]);
    }
    return '';
  }

  if (typeof value !== 'string') {
    throw new ValidationError(`${field} deve ser texto`, [{ field, rule: 'string' }]);
  }

  const normalized = stripControlChars(value)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  if (required && normalized.length < minLength) {
    throw new ValidationError(`${field} muito curto`, [{ field, rule: 'minLength', minLength }]);
  }

  if (normalized.length > maxLength) {
    throw new ValidationError(`${field} muito longo`, [{ field, rule: 'maxLength', maxLength }]);
  }

  return normalized;
}

export function validateAnalisePayload(payload, limits = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ValidationError('Corpo JSON invalido', [{ field: 'body', rule: 'object' }]);
  }

  return {
    pessoa: normalizeText(payload.pessoa, 'pessoa', {
      required: false,
      maxLength: limits.maxPessoaChars ?? 80
    }),
    conversa: normalizeText(payload.conversa, 'conversa', {
      required: true,
      minLength: 10,
      maxLength: limits.maxConversaChars ?? 12000
    }),
    contexto: normalizeText(payload.contexto, 'contexto', {
      required: false,
      maxLength: limits.maxContextoChars ?? 2000
    })
  };
}

export function validateSugestoesPayload(payload, limits = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ValidationError('Corpo JSON invalido', [{ field: 'body', rule: 'object' }]);
  }

  return {
    pessoa: normalizeText(payload.pessoa, 'pessoa', {
      required: false,
      maxLength: limits.maxPessoaChars ?? 80
    }),
    conversa: normalizeText(payload.conversa, 'conversa', {
      required: false,
      maxLength: limits.maxConversaChars ?? 12000
    }),
    contexto: normalizeText(payload.contexto, 'contexto', {
      required: false,
      maxLength: limits.maxContextoChars ?? 2000
    })
  };
}

function normalizeEmail(value, field = 'email', required = true) {
  if (value === undefined || value === null) {
    if (required) {
      throw new ValidationError(`${field} obrigatorio`, [{ field, rule: 'required' }]);
    }
    return '';
  }

  if (typeof value !== 'string') {
    throw new ValidationError(`${field} deve ser texto`, [{ field, rule: 'string' }]);
  }

  const normalized = stripControlChars(value).trim().toLowerCase();

  if (required && normalized.length < 6) {
    throw new ValidationError(`${field} invalido`, [{ field, rule: 'email' }]);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new ValidationError(`${field} invalido`, [{ field, rule: 'email' }]);
  }

  return normalized;
}

function normalizePassword(value, field = 'senha', options = {}) {
  const { required = true, minLength = 8, maxLength = 128 } = options;

  if (value === undefined || value === null) {
    if (required) {
      throw new ValidationError(`${field} obrigatoria`, [{ field, rule: 'required' }]);
    }
    return '';
  }

  if (typeof value !== 'string') {
    throw new ValidationError(`${field} deve ser texto`, [{ field, rule: 'string' }]);
  }

  const normalized = stripControlChars(value).trim();

  if (required && normalized.length < minLength) {
    throw new ValidationError(`${field} muito curta`, [{ field, rule: 'minLength', minLength }]);
  }

  if (normalized.length > maxLength) {
    throw new ValidationError(`${field} muito longa`, [{ field, rule: 'maxLength', maxLength }]);
  }

  return normalized;
}

export function validateAuthRegisterPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ValidationError('Corpo JSON invalido', [{ field: 'body', rule: 'object' }]);
  }

  return {
    name: normalizeText(payload.name, 'nome', { required: true, minLength: 2, maxLength: 80 }),
    email: normalizeEmail(payload.email),
    password: normalizePassword(payload.password, 'senha', { minLength: 8 })
  };
}

export function validateAuthLoginPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ValidationError('Corpo JSON invalido', [{ field: 'body', rule: 'object' }]);
  }

  return {
    email: normalizeEmail(payload.email),
    password: normalizePassword(payload.password, 'senha', { minLength: 8 })
  };
}

export function validatePasswordRecoveryRequestPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ValidationError('Corpo JSON invalido', [{ field: 'body', rule: 'object' }]);
  }

  return {
    email: normalizeEmail(payload.email)
  };
}

export function validatePasswordResetPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ValidationError('Corpo JSON invalido', [{ field: 'body', rule: 'object' }]);
  }

  return {
    email: normalizeEmail(payload.email),
    recoveryToken: normalizeText(payload.recoveryToken, 'token de recuperacao', { required: true, minLength: 8, maxLength: 256 }),
    password: normalizePassword(payload.password, 'nova senha', { minLength: 8 })
  };
}

export function promptInjectionScore(text) {
  const patterns = [
    /ignore (as )?(instrucoes|regras|mensagens anteriores)/i,
    /ignore previous instructions/i,
    /system prompt/i,
    /mostre (sua )?(chave|api key|segredo|prompt)/i,
    /reveal (your )?(secret|system|prompt)/i,
    /developer message/i
  ];

  return patterns.reduce((score, pattern) => score + (pattern.test(text) ? 1 : 0), 0);
}
