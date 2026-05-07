import express from 'express';
import { asyncHandler } from '../utils/errors.js';
import {
  authenticateUser,
  extractBearerToken,
  requestPasswordRecovery,
  resetPassword,
  validateSession,
  registerUser
} from '../services/authStore.js';
import {
  validateAuthLoginPayload,
  validateAuthRegisterPayload,
  validatePasswordRecoveryRequestPayload,
  validatePasswordResetPayload
} from '../utils/validation.js';

export function authRouter(config) {
  const router = express.Router();

  router.post('/register', asyncHandler(async (req, res) => {
    const payload = validateAuthRegisterPayload(req.body);
    const result = registerUser(config, payload);
    res.status(201).json(result);
  }));

  router.post('/login', asyncHandler(async (req, res) => {
    const payload = validateAuthLoginPayload(req.body);
    const result = authenticateUser(config, payload);
    res.status(200).json(result);
  }));

  router.post('/validate', asyncHandler(async (req, res) => {
    const token = extractBearerToken(req) || String(req.body?.token || '').trim();
    const result = validateSession(config, token);
    res.status(200).json(result);
  }));

  router.post('/password-recovery', asyncHandler(async (req, res) => {
    const payload = validatePasswordRecoveryRequestPayload(req.body);
    const result = requestPasswordRecovery(config, payload);
    res.status(200).json(result);
  }));

  router.post('/password-reset', asyncHandler(async (req, res) => {
    const payload = validatePasswordResetPayload(req.body);
    const result = resetPassword(config, payload);
    res.status(200).json(result);
  }));

  return router;
}