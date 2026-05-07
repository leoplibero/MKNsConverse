import assert from 'node:assert/strict';
import test from 'node:test';
import { parseAnthropicAnalysis } from '../src/services/responseParser.js';

const valid = {
  etapa_atual: { numero: 2, nome: 'Gerar Atracao', descricao: 'Humor leve' },
  etapas_concluidas: [1],
  diagnostico: 'Ela respondeu com humor.',
  gatilhos_ativos: [{ nome: 'Push-Pull', status: 'ativo', descricao: 'usar leve' }],
  proximo_movimento: { descricao: 'provocar com cuidado', motivo: 'ela engajou' },
  mensagens_sugeridas: [{ texto: 'Mensagem segura', gatilho_ativo: 'Push-Pull', quando_usar: 'agora' }],
  avaliacao_envio: {
    titulo: 'Problema critico aqui',
    problema_critico: 'Voce explicou a piada.',
    resumo: 'Mandou mensagens demais.',
    mensagens: [{ mensagem: 'Relaxa, estou brincando', avaliacao: 'Matou a piada.', tipo: 'erro' }],
    como_deveria_ter_ficado: 'Droga... ja ia ter desculpa para o Chile.',
    agora_o_que_fazer: 'Espera a resposta.'
  },
  erros_a_evitar: ['insistir'],
  leitura_fria: 'Ela parece curiosa.'
};

test('parseAnthropicAnalysis aceita JSON puro e markdown fence', () => {
  assert.equal(parseAnthropicAnalysis(JSON.stringify(valid)).etapa_atual.numero, 2);
  assert.equal(parseAnthropicAnalysis(`\`\`\`json\n${JSON.stringify(valid)}\n\`\`\``).etapa_atual.nome, 'Gerar Atracao');
});

test('parseAnthropicAnalysis normaliza schema e limita arrays', () => {
  const parsed = parseAnthropicAnalysis(JSON.stringify({
    ...valid,
    etapa_atual: { numero: 99, nome: 'x', descricao: 'y' },
    erros_a_evitar: Array.from({ length: 20 }, (_, index) => `erro ${index}`)
  }));

  assert.equal(parsed.etapa_atual.numero, 1);
  assert.equal(parsed.erros_a_evitar.length, 8);
});

test('parseAnthropicAnalysis normaliza avaliacao do envio', () => {
  const parsed = parseAnthropicAnalysis(JSON.stringify({
    ...valid,
    avaliacao_envio: {
      ...valid.avaliacao_envio,
      mensagens: [
        { mensagem: 'boa', avaliacao: 'funcionou', tipo: 'acerto' },
        { mensagem: 'ruim', avaliacao: 'quebrou ritmo', tipo: 'grave' }
      ]
    }
  }));

  assert.equal(parsed.avaliacao_envio.titulo, 'Problema critico aqui');
  assert.equal(parsed.avaliacao_envio.mensagens[0].tipo, 'acerto');
  assert.equal(parsed.avaliacao_envio.mensagens[1].tipo, 'neutro');
});

test('parseAnthropicAnalysis rejeita JSON invalido', () => {
  assert.throws(
    () => parseAnthropicAnalysis('nao sou json'),
    /JSON valido/
  );
});
