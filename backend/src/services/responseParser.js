import { AppError } from '../utils/errors.js';
import { stripControlChars } from '../utils/validation.js';

const MAX_TEXT = 900;
const MAX_ARRAY = 8;

function trimString(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  return stripControlChars(value).trim().slice(0, MAX_TEXT);
}

function parseJsonText(text) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new AppError('Resposta vazia da IA', 502, 'AI_EMPTY_RESPONSE');
  }

  const clean = text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(clean);
  } catch {
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(clean.slice(start, end + 1));
    }
    throw new AppError('Resposta da IA nao esta em JSON valido', 502, 'AI_INVALID_JSON');
  }
}

function normalizeEtapa(value) {
  const numero = Number(value?.numero);
  const safeNumero = Number.isInteger(numero) && numero >= 1 && numero <= 5 ? numero : 1;

  return {
    numero: safeNumero,
    nome: trimString(value?.nome, 'Abertura'),
    descricao: trimString(value?.descricao, 'Analise inicial da conversa.')
  };
}

function normalizeGatilhos(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_ARRAY).map((item) => ({
    nome: trimString(item?.nome, 'Gatilho'),
    status: trimString(item?.status, 'aplicar com cuidado'),
    descricao: trimString(item?.descricao, '')
  }));
}

function normalizeMensagens(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_ARRAY).map((item) => ({
    texto: trimString(item?.texto, ''),
    gatilho_ativo: trimString(item?.gatilho_ativo, ''),
    quando_usar: trimString(item?.quando_usar, '')
  })).filter((item) => item.texto);
}

function normalizeAvaliacaoEnvio(value) {
  const mensagens = Array.isArray(value?.mensagens)
    ? value.mensagens.slice(0, MAX_ARRAY).map((item) => {
      const tipo = trimString(item?.tipo, 'neutro').toLowerCase();
      return {
        mensagem: trimString(item?.mensagem, ''),
        avaliacao: trimString(item?.avaliacao, ''),
        tipo: ['acerto', 'erro', 'neutro'].includes(tipo) ? tipo : 'neutro'
      };
    }).filter((item) => item.mensagem || item.avaliacao)
    : [];

  return {
    titulo: trimString(value?.titulo, 'Feedback do seu envio'),
    problema_critico: trimString(value?.problema_critico, ''),
    resumo: trimString(value?.resumo, ''),
    mensagens,
    como_deveria_ter_ficado: trimString(value?.como_deveria_ter_ficado, ''),
    agora_o_que_fazer: trimString(value?.agora_o_que_fazer, '')
  };
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_ARRAY).map((item) => trimString(item)).filter(Boolean);
}

export function normalizeAnalysis(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new AppError('Resposta da IA nao e um objeto JSON', 502, 'AI_INVALID_SCHEMA');
  }

  return {
    etapa_atual: normalizeEtapa(raw.etapa_atual),
    etapas_concluidas: Array.isArray(raw.etapas_concluidas)
      ? raw.etapas_concluidas
        .map(Number)
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 5)
        .slice(0, 5)
      : [],
    diagnostico: trimString(raw.diagnostico, 'Conversa recebida e pronta para analise.'),
    gatilhos_ativos: normalizeGatilhos(raw.gatilhos_ativos),
    proximo_movimento: {
      descricao: trimString(raw.proximo_movimento?.descricao, 'Responder com uma afirmacao leve e um gancho.'),
      motivo: trimString(raw.proximo_movimento?.motivo, 'Mantem continuidade sem pressionar.')
    },
    mensagens_sugeridas: normalizeMensagens(raw.mensagens_sugeridas),
    avaliacao_envio: normalizeAvaliacaoEnvio(raw.avaliacao_envio),
    erros_a_evitar: normalizeStringArray(raw.erros_a_evitar),
    leitura_fria: trimString(raw.leitura_fria, 'Ainda ha pouco contexto para uma leitura mais precisa.'),
    trecho_relevante: trimString(raw.trecho_relevante, ''),
    revelacao_util: trimString(raw.revelacao_util, '')
  };
}

export function parseAnthropicAnalysis(text) {
  return normalizeAnalysis(parseJsonText(text));
}
