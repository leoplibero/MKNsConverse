export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'APP_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function errorHandler(config) {
  return (err, req, res, next) => {
    if (res.headersSent) {
      next(err);
      return;
    }

    const statusCode = err.statusCode || err.status || 500;
    const isClientError = statusCode >= 400 && statusCode < 500;
    const code = err.code || (isClientError ? 'BAD_REQUEST' : 'INTERNAL_ERROR');

    const message = isClientError
      ? err.message
      : 'Erro interno ao processar a analise';

    if (config.nodeEnv !== 'test' && !isClientError) {
      console.error({ code, statusCode, requestId: req.id, error: err.message });
    }

    res.status(statusCode).json({
      error: {
        code,
        message,
        details: err.details ?? undefined,
        requestId: req.id
      }
    });
  };
}
