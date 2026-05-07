import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { deleteConversationSummaries, listConversationSummaries, saveConversationSummary } from '../src/services/historyStore.js';

function createConfig() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sistema-conquista-history-'));
  return {
    nodeEnv: 'development',
    historyDbPath: path.join(dir, 'history.sqlite'),
    historyLimit: 5
  };
}

function analysis(index) {
  return {
    etapa_atual: { numero: 2, nome: 'Gerar Atracao' },
    diagnostico: `Resumo seguro ${index}`,
    trecho_relevante: `Trecho curto ${index}`,
    proximo_movimento: { descricao: `Movimento ${index}` },
    mensagens_sugeridas: [{ texto: `Mensagem ${index}` }],
    gatilhos_ativos: [{ nome: 'Rapport' }]
  };
}

test('historico salva apenas resumo e respeita limite configurado', () => {
  const config = createConfig();

  for (let index = 1; index <= 7; index += 1) {
    saveConversationSummary(config, {
      pessoa: 'Carol',
      conversa: `BLOCO DE CONVERSA SALVO ${index}`
    }, analysis(index));
  }

  const items = listConversationSummaries(config);

  assert.equal(items.length, 5);
  assert.equal(items[0].resumo, 'Resumo seguro 7');
  assert.equal(items[4].resumo, 'Resumo seguro 3');
  assert.equal(items[0].conversa_salva, 'BLOCO DE CONVERSA SALVO 7');
  assert.equal(JSON.stringify(items).includes('contexto completo'), false);
});

test('historico apaga permanentemente uma conversa por pessoa', () => {
  const config = createConfig();

  saveConversationSummary(config, {
    pessoa: 'Carol',
    conversa: 'Bloco salvo da Carol'
  }, analysis(1));
  saveConversationSummary(config, {
    pessoa: 'Arii',
    conversa: 'Bloco salvo da Arii'
  }, analysis(2));

  const deleted = deleteConversationSummaries(config, 'Carol');

  assert.equal(deleted, 1);
  assert.equal(listConversationSummaries(config, 'Carol').length, 0);
  assert.equal(listConversationSummaries(config, 'Arii').length, 1);
});
