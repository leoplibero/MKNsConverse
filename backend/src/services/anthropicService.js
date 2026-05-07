import { getConfig } from '../config.js';
import { AppError } from '../utils/errors.js';
import { buildFallbackAnalysis } from './fallbackAnalyzer.js';
import { buildSystemPrompt, buildUserPrompt } from './promptBuilder.js';
import { parseAnthropicAnalysis } from './responseParser.js';

function getAnthropicText(data) {
  const textBlock = data?.content?.find((item) => item?.type === 'text' && typeof item.text === 'string');
  if (!textBlock) {
    throw new AppError('Resposta da IA sem bloco de texto', 502, 'AI_MISSING_TEXT');
  }
  return textBlock.text;
}

function buildResilientFallback(payload, reason, config) {
  if (config.nodeEnv !== 'test') {
    console.warn({ code: 'AI_FALLBACK_USED', reason });
  }
  return buildFallbackAnalysis(payload);
}

export async function analisarConversa(payload, options = {}) {
  const config = options.config ?? getConfig();

  if (config.forceMock || !config.anthropicApiKey) {
    return buildFallbackAnalysis(payload);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: config.anthropicModel,
        max_tokens: 2000,
        temperature: 0.4,
        system: buildSystemPrompt(),
        messages: [
          {
            role: 'user',
            content: buildUserPrompt(payload)
          }
        ]
      })
    });

    if (!response.ok) {
      return buildResilientFallback(payload, `upstream_status_${response.status}`, config);
    }

    const data = await response.json();
    return parseAnthropicAnalysis(getAnthropicText(data));
  } catch (error) {
    if (error.name === 'AbortError') {
      return buildResilientFallback(payload, 'timeout', config);
    }
    return buildResilientFallback(payload, error instanceof AppError ? error.code : 'response_error', config);
  } finally {
    clearTimeout(timeout);
  }
}
