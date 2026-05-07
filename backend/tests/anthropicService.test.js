import assert from 'node:assert/strict';
import test from 'node:test';
import { analisarConversa } from '../src/services/anthropicService.js';

function createConfig() {
  return {
    nodeEnv: 'test',
    forceMock: false,
    anthropicApiKey: 'test-key',
    anthropicModel: 'test-model',
    requestTimeoutMs: 2000
  };
}

test('analisarConversa usa fallback quando provedor externo falha', async () => {
  const result = await analisarConversa({
    pessoa: 'Carol',
    conversa: 'Carol: Vou so mudar o bairro kkk\nYou: Como convida pra tomar um cafe?'
  }, {
    config: createConfig(),
    fetchImpl: async () => new Response(JSON.stringify({ error: { message: 'invalid key' } }), { status: 401 })
  });

  assert.equal(result.etapa_atual.numero, 5);
  assert.doesNotMatch(result.diagnostico, /Anthropic|chave|local ativada/i);
});

test('analisarConversa usa fallback quando resposta da IA nao vem em JSON valido', async () => {
  const result = await analisarConversa({
    pessoa: 'Carol',
    conversa: 'Carol: Ue kkk\nYou: Relaxa, estou brincando para descontrair'
  }, {
    config: createConfig(),
    fetchImpl: async () => new Response(JSON.stringify({
      content: [{ type: 'text', text: 'resposta sem json' }]
    }), { status: 200 })
  });

  assert.equal(result.etapa_atual.numero, 2);
  assert.match(result.diagnostico, /humor|provocacao|energia/i);
});
