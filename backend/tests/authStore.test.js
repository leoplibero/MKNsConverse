import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  authenticateUser,
  registerUser,
  requestPasswordRecovery,
  resetPassword,
  validateSession
} from '../src/services/authStore.js';

function createConfig() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sistema-conquista-auth-'));
  return {
    authDbPath: path.join(dir, 'auth.json'),
    authTokenTtlMs: 1000 * 60 * 60,
    authTokenSecret: 'test-token-secret',
    statelessAuth: false,
    authRecoveryTtlMs: 1000 * 60 * 30
  };
}

test('autenticacao registra, valida e invalida token antigo ao trocar senha', () => {
  const config = createConfig();

  const registered = registerUser(config, {
    name: 'Leona',
    email: 'leona@example.com',
    password: 'SenhaForte123'
  });

  assert.equal(registered.user.email, 'leona@example.com');
  assert.ok(registered.token);

  const validated = validateSession(config, registered.token);
  assert.equal(validated.user.name, 'Leona');

  const login = authenticateUser(config, {
    email: 'leona@example.com',
    password: 'SenhaForte123'
  });

  assert.notEqual(login.token, registered.token);
  assert.doesNotThrow(() => validateSession(config, login.token));
  assert.throws(() => validateSession(config, registered.token), /invalida|expirada/i);
});

test('recuperacao redefine senha e emite nova sessao', () => {
  const config = createConfig();

  registerUser(config, {
    name: 'Marta',
    email: 'marta@example.com',
    password: 'SenhaForte123'
  });

  const recovery = requestPasswordRecovery(config, { email: 'marta@example.com' });

  assert.ok(recovery.recoveryToken);

  const reset = resetPassword(config, {
    email: 'marta@example.com',
    recoveryToken: recovery.recoveryToken,
    password: 'SenhaNova123'
  });

  assert.ok(reset.token);
  assert.equal(validateSession(config, reset.token).user.email, 'marta@example.com');
  assert.throws(() => authenticateUser(config, {
    email: 'marta@example.com',
    password: 'SenhaForte123'
  }), /invalido/i);
});

test('autenticacao stateless valida token sem compartilhar storage', () => {
  const firstConfig = { ...createConfig(), statelessAuth: true };
  const secondConfig = {
    ...createConfig(),
    statelessAuth: true,
    authTokenSecret: firstConfig.authTokenSecret
  };

  const registered = registerUser(firstConfig, {
    name: 'Vercel',
    email: 'vercel@example.com',
    password: 'SenhaForte123'
  });

  const validated = validateSession(secondConfig, registered.token);

  assert.equal(validated.user.email, 'vercel@example.com');
  assert.equal(validated.user.name, 'Vercel');
});
