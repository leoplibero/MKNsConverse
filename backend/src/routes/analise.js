import express from 'express';
import { analisarConversa } from '../services/anthropicService.js';
import { requireSession } from '../services/authStore.js';
import { deleteConversationSummaries, listConversationSummaries, saveConversationSummary } from '../services/historyStore.js';
import { asyncHandler } from '../utils/errors.js';
import { validateAnalisePayload, validateSugestoesPayload, ValidationError } from '../utils/validation.js';

export function analiseRouter(config) {
  const router = express.Router();

  router.use(requireSession(config));

  router.post('/analise', asyncHandler(async (req, res) => {
    const payload = validateAnalisePayload(req.body, config);
    const historico = listConversationSummaries(config, payload.pessoa, config.historyLimit);
    const result = await analisarConversa({ ...payload, historico }, { config });
    saveConversationSummary(config, payload, result);
    res.status(200).json(result);
  }));

  router.post('/sugestoes', asyncHandler(async (req, res) => {
    const payload = validateSugestoesPayload(req.body, config);
    const historico = listConversationSummaries(config, payload.pessoa, config.historyLimit);
    if (!payload.conversa && historico.length === 0) {
      throw new ValidationError('Conversa ou historico obrigatorio', [{ field: 'conversa', rule: 'required_without_history' }]);
    }
    const result = await analisarConversa({
      ...payload,
      contexto: `${payload.contexto}\nGere novas mensagens sugeridas diferentes das ja exibidas. Priorize exemplos concretos para o ultimo trecho relevante da outra pessoa.`,
      historico
    }, { config });

    res.status(200).json({
      mensagens_sugeridas: result.mensagens_sugeridas,
      proximo_movimento: result.proximo_movimento,
      trecho_relevante: result.trecho_relevante,
      revelacao_util: result.revelacao_util
    });
  }));

  router.get('/historico', asyncHandler(async (req, res) => {
    const pessoa = typeof req.query.pessoa === 'string' ? req.query.pessoa.trim().slice(0, config.maxPessoaChars) : '';
    res.status(200).json({
      items: listConversationSummaries(config, pessoa, config.historyLimit)
    });
  }));

  router.delete('/historico/:pessoa', asyncHandler(async (req, res) => {
    const pessoa = String(req.params.pessoa || '').trim().slice(0, config.maxPessoaChars);
    if (pessoa.length < 2) {
      throw new ValidationError('Pessoa invalida', [{ field: 'pessoa', rule: 'min_length' }]);
    }

    const deleted = deleteConversationSummaries(config, pessoa);
    res.status(200).json({ deleted });
  }));

  return router;
}
