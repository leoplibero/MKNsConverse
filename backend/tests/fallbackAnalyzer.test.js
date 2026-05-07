import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFallbackAnalysis } from '../src/services/fallbackAnalyzer.js';

test('fallback nao trata cafe como encontro sem convite claro', () => {
  const result = buildFallbackAnalysis({
    conversa: 'Eu: vi que voce gosta de cafe. Ela: kkk sim, cafe salva meu dia.'
  });

  assert.equal(result.etapa_atual.numero, 2);
});

test('fallback detecta limite e recomenda parar', () => {
  const result = buildFallbackAnalysis({
    conversa: 'Ela: nao quero continuar essa conversa, para por favor.'
  });

  assert.equal(result.etapa_atual.nome, 'Limite detectado');
  assert.match(result.proximo_movimento.descricao, /sem insistir/i);
});

test('fallback nao confunde frase comum com pedido para parar', () => {
  const result = buildFallbackAnalysis({
    conversa: 'Ela: kkk minha cabeca nao para nunca, fico pensando em mil coisas.'
  });

  assert.notEqual(result.etapa_atual.nome, 'Limite detectado');
});

test('fallback interpreta You como usuario e destaca fala da pessoa', () => {
  const result = buildFallbackAnalysis({
    pessoa: 'Carol',
    conversa: `12:18 PM\nCarol: Trabalhar com criancas nao cansa taaaanto.\n6:35 PM\nYou: Entao voce nao dorme, voce desmaia de cansaco\n7:04 PM\nCarol: Estudar e organizar uma mudanca. Tirando isso, realmente estou a merce kk\n7:22 PM\nYou: Tem problema nao, visito no the sims`
  });

  assert.equal(result.trecho_relevante, 'Estudar e organizar uma mudanca. Tirando isso, realmente estou a merce kk');
});

test('fallback usa primeira linha solta como fala dela quando vem antes de You', () => {
  const result = buildFallbackAnalysis({
    pessoa: 'Carol',
    conversa: `Vou so mudar o bairro kkk\n8:36 PMYou: Droga\n8:37 PMCarol: Ue kk`
  });

  assert.equal(result.trecho_relevante, 'Vou so mudar o bairro kkk');
});

test('fallback avalia erros nas mensagens enviadas pelo usuario', () => {
  const result = buildFallbackAnalysis({
    pessoa: 'Carol',
    conversa: `Carol: Vou so mudar o bairro kkk
You: Droga
You: Ja ia ter uma desculpa para conhecer o chile
Carol: Ue kk
You: Relaxa, estou so brincando para descontrair
You: No fim eu preciso medir qual e seu nivel de humor sabe
You: Voce tem uma cara de seria
You: Ja te julgaram dessa forma?`
  });

  assert.match(result.avaliacao_envio.problema_critico, /explicou/i);
  assert.match(result.avaliacao_envio.problema_critico, /mensagens seguidas/i);
  assert.ok(result.avaliacao_envio.mensagens.some((item) => item.tipo === 'erro'));
  assert.match(result.avaliacao_envio.agora_o_que_fazer, /Espera/i);
});

test('fallback cria sugestao contextual para mudanca de bairro', () => {
  const result = buildFallbackAnalysis({
    pessoa: 'Carol',
    conversa: `7:22 PM\nYou: Como convida pra tomar um cafe desse jeito?\n8:04 PM\nCarol: Vou so mudar o bairro kkk`
  });

  assert.equal(result.etapa_atual.numero, 5);
  assert.match(result.mensagens_sugeridas[0].texto, /bairro|passaporte|cafe/i);
  assert.notEqual(result.mensagens_sugeridas[0].texto, 'Voce tem um jeito curioso de falar disso. Aposto que tem uma historia boa por tras.');
});

test('fallback entende convite indireto com bolo como tentativa de fechar', () => {
  const result = buildFallbackAnalysis({
    pessoa: 'Carol',
    conversa: `You: Como convida pra comer um bolo desse jeito?\nCarol: Vou so mudar o bairro kkk`
  });

  assert.equal(result.etapa_atual.nome, 'Fechar');
  assert.match(result.mensagens_sugeridas[0].texto, /cafe|bairro|logisticamente/i);
});

test('fallback gera alternativas extras quando solicitadas', () => {
  const result = buildFallbackAnalysis({
    pessoa: 'Carol',
    contexto: 'Gere novas opcoes diferentes.',
    conversa: `8:04 PM\nCarol: Vou so mudar o bairro kkk`
  });

  assert.ok(result.mensagens_sugeridas.length > 4);
  assert.match(result.mensagens_sugeridas.at(-1).texto, /suspense|estrategia|bairro/i);
});

test('fallback mede etapa usando historico acumulado', () => {
  const result = buildFallbackAnalysis({
    pessoa: 'Carol',
    historico: [
      {
        conversa_salva: 'You: Como convida pra tomar um café, comer um bolo desse jeito?'
      }
    ],
    conversa: 'Carol: Vou so mudar o bairro kkk'
  });

  assert.equal(result.etapa_atual.numero, 5);
});
