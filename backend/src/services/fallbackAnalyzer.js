import { FLUXO_ETAPAS, GATILHOS } from '../data/estrategias.js';
import { promptInjectionScore } from '../utils/validation.js';

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
}

function normalizeForSignals(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function inferEtapa(text) {
  if (includesAny(text, [
    'vamos sair',
    'vamos marcar',
    'marcar um',
    'te encontrar',
    'encontro',
    'tomar um cafe',
    'tomar um caf',
    'cafe com bolo',
    'comer um bolo',
    'como convida',
    'convida pra',
    'convida para',
    'barzinho',
    'qual bairro'
  ])) return 5;
  if (includesAny(text, ['sinto', 'me conta', 'verdade', 'cansada', 'familia', 'sonho'])) return 4;
  if (includesAny(text, ['diferente', 'curioso', 'me convence', 'por que voce'])) return 3;
  if (includesAny(text, ['haha', 'kkk', 'rsrs', 'provoca', 'brincadeira'])) return 2;
  return 1;
}

function buildDiagnostic(etapaNumero, relevantLine) {
  const byEtapa = {
    1: 'A conversa ainda esta em fase inicial. Use observacoes leves e especificas para abrir espaco sem parecer generico.',
    2: 'A conversa esta em clima de humor e provocacao leve. O melhor caminho agora e manter a energia sem explicar demais a propria intencao.',
    3: 'Ela ja deu material para voce qualificar o jeito dela. Use uma afirmacao com gancho para fazer ela se posicionar um pouco mais.',
    4: 'Existe abertura para aprofundar com leitura emocional leve. Priorize escuta ativa, validacao proporcional e continuidade natural.',
    5: 'Ja existe gancho de encontro ou logistica. O proximo passo deve aproximar do fechamento de forma leve, concreta e sem pressao.'
  };

  if (relevantLine && relevantLine !== 'Trecho insuficiente para destacar uma revelacao especifica.') {
    return `${byEtapa[etapaNumero] || byEtapa[1]} Trecho central: "${relevantLine}"`;
  }

  return byEtapa[etapaNumero] || byEtapa[1];
}

function hasBoundarySignal(text) {
  return [
    /\bnao quero\b/i,
    /\bnão quero\b/i,
    /\bpara de\b/i,
    /\bpare\b/i,
    /\bme deixa\b/i,
    /\bdesconfortavel\b/i,
    /\bdesconfortável\b/i,
    /\btenho namorado\b/i,
    /\btenho namorada\b/i,
    /\bnamoro\b/i
  ].some((pattern) => pattern.test(text));
}

function normalizeChatLines(conversa) {
  return conversa
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^\d{1,2}:\d{2}\s?(AM|PM)?$/i.test(line))
    .map((line) => line.replace(/^\d{1,2}:\d{2}\s?(AM|PM)?/i, '').trim())
    .filter(Boolean);
}

function getOtherPersonLines(conversa, personName = '') {
  const normalizedName = personName.trim().toLowerCase();
  const lines = normalizeChatLines(conversa);
  const explicitLines = lines.filter((line) => {
    const lower = line.toLowerCase();
    if (lower.startsWith('you:')) return false;
    if (normalizedName && lower.startsWith(`${normalizedName}:`)) return true;
    return /^[^:]{2,40}:/.test(line);
  });

  const firstYouIndex = lines.findIndex((line) => line.toLowerCase().startsWith('you:'));
  const looseIntroLines = lines.filter((line, index) => {
    const lower = line.toLowerCase();
    return firstYouIndex > 0
      && index < firstYouIndex
      && !lower.startsWith('you:')
      && !/^[^:]{2,40}:/.test(line)
      && line.length >= 10;
  });

  return [...looseIntroLines, ...explicitLines];
}

function getUserLines(conversa) {
  return normalizeChatLines(conversa)
    .filter((line) => line.toLowerCase().startsWith('you:'))
    .map((line) => line.replace(/^you:\s*/i, '').trim())
    .filter(Boolean);
}

function maxConsecutiveUserMessages(conversa) {
  let current = 0;
  let max = 0;

  normalizeChatLines(conversa).forEach((line) => {
    if (line.toLowerCase().startsWith('you:')) {
      current += 1;
      max = Math.max(max, current);
      return;
    }
    current = 0;
  });

  return max;
}

function findUserLine(userLines, patterns) {
  return userLines.find((line) => patterns.some((pattern) => pattern.test(normalizeForSignals(line))));
}

function buildEnvioFeedback(conversa) {
  const userLines = getUserLines(conversa);
  const mensagens = [];
  const explainedJoke = findUserLine(userLines, [/relaxa.*brinc/, /so.*brinc.*descontrair/, /só.*brinc.*descontrair/]);
  const explainedMethod = findUserLine(userLines, [/medir.*nivel.*humor/, /nivel.*humor/, /se ri de qualquer coisa/]);
  const goodChile = findUserLine(userLines, [/chile/, /desculpa.*conhecer/]);
  const goodSerious = findUserLine(userLines, [/cara de seria/, /cara de séria/]);
  const goodHook = findUserLine(userLines, [/ja te julgaram/, /já te julgaram/, /impressao unica/, /impressão única/]);
  const maxUserBurst = maxConsecutiveUserMessages(conversa);

  if (goodChile) {
    mensagens.push({
      mensagem: goodChile,
      avaliacao: 'Boa. Tem humor, intencao implicita e nao pede validacao.',
      tipo: 'acerto'
    });
  }

  if (explainedJoke) {
    mensagens.push({
      mensagem: explainedJoke,
      avaliacao: 'Explicou a brincadeira e tirou forca do humor. Quando voce explica a piada, ela perde impacto.',
      tipo: 'erro'
    });
  }

  if (explainedMethod) {
    mensagens.push({
      mensagem: explainedMethod,
      avaliacao: 'Mostrou o bastidor da estrategia. Isso passa inseguranca e deixa a conversa menos natural.',
      tipo: 'erro'
    });
  }

  if (goodSerious) {
    mensagens.push({
      mensagem: goodSerious,
      avaliacao: 'Boa provocacao se usada sozinha. Funciona porque cria desafio leve sem elogiar aparencia diretamente.',
      tipo: 'acerto'
    });
  }

  if (goodHook) {
    mensagens.push({
      mensagem: goodHook,
      avaliacao: 'Bom gancho. Abre espaco para ela se revelar sem parecer entrevista pesada.',
      tipo: 'acerto'
    });
  }

  const criticalParts = [];
  if (explainedJoke) criticalParts.push('Voce explicou a brincadeira');
  if (explainedMethod) criticalParts.push('voce explicou o que estava tentando medir');
  if (maxUserBurst >= 4) criticalParts.push(`mandou ${maxUserBurst} mensagens seguidas`);

  const hasCritical = criticalParts.length > 0;
  const bestLine = goodChile || goodSerious || goodHook || userLines[0] || '';

  return {
    titulo: hasCritical ? 'Problema critico aqui' : 'Feedback do seu envio',
    problema_critico: hasCritical
      ? `${criticalParts.join(', ')}. Isso quebra ritmo e pode passar inseguranca.`
      : 'Nao apareceu um erro critico no bloco enviado.',
    resumo: hasCritical
      ? 'A ideia boa estava ali, mas voce alongou e explicou demais. Em conversa, uma boa provocacao precisa de espaco para a outra pessoa reagir.'
      : 'O envio esta coerente. Ainda assim, prefira mensagens mais curtas e com um unico gancho por vez.',
    mensagens: mensagens.length ? mensagens.slice(0, 6) : userLines.slice(0, 4).map((line) => ({
      mensagem: line,
      avaliacao: 'Mensagem neutra. Funciona melhor se vier acompanhada de um gancho claro ou observacao especifica.',
      tipo: 'neutro'
    })),
    como_deveria_ter_ficado: bestLine
      ? `"${bestLine}"\n\nPonto final. Deixa ela reagir antes de mandar outra coisa.`
      : 'Uma mensagem curta, contextual e com espaco para ela reagir.',
    agora_o_que_fazer: hasCritical
      ? 'Nao manda mais nada agora. Espera a resposta dela e retoma com uma frase curta baseada no que ela trouxer.'
      : 'Mantenha o ritmo: responda curto, use o detalhe que ela trouxe e evite empilhar perguntas.'
  };
}

function pickGatilhos(etapaNumero) {
  const namesByEtapa = {
    1: ['Validacao Indireta', 'Loop Aberto'],
    2: ['Push-Pull', 'Desafio'],
    3: ['Desafio', 'Reciprocidade'],
    4: ['Espelhamento', 'Leitura Fria'],
    5: ['Encerrar no Pico', 'Escassez']
  };

  return namesByEtapa[etapaNumero]
    .map((name) => GATILHOS.find((gatilho) => gatilho.nome === name))
    .filter(Boolean)
    .map((gatilho) => ({
      nome: gatilho.nome,
      status: 'ativo',
      descricao: gatilho.descricao
    }));
}

function pickRelevantLine(conversa, personName = '') {
  const candidateLines = getOtherPersonLines(conversa, personName);
  const sourceLines = candidateLines.length ? candidateLines : normalizeChatLines(conversa);
  const line = sourceLines
    .map((line) => line.trim().replace(/^[^:]{1,24}:\s*/, ''))
    .filter((line) => line.length >= 10)
    .at(-1)
    ?.slice(0, 240) || 'Trecho insuficiente para destacar uma revelacao especifica.';

  if (promptInjectionScore(line) > 0) {
    return 'Trecho omitido porque continha instrucao suspeita, nao conteudo de conversa.';
  }

  return line;
}

function historyToConversation(historico = []) {
  if (!Array.isArray(historico)) return '';
  return historico
    .slice()
    .reverse()
    .map((item) => item?.conversa_salva || item?.trecho_relevante || item?.resumo || '')
    .filter(Boolean)
    .join('\n');
}

function buildContextualSuggestions(relevantLine, etapaNumero, wantsMore = false) {
  const lower = relevantLine.toLowerCase();

  if (lower.includes('bairro') || lower.includes('mudan')) {
    const attractionBase = [
      {
        texto: 'Ah, entao o drama internacional era so uma troca de bairro? Eu ja tava quase preparando passaporte e saudade antecipada.',
        gatilho_ativo: 'Push-Pull',
        quando_usar: 'Quando ela reduziu a tensao da mudanca e deixou espaco para humor.'
      },
      {
        texto: 'Menos mal. Entao o cafe com bolo voltou a ser logisticamente possivel... qual bairro ganhou essa responsabilidade?',
        gatilho_ativo: 'Loop Aberto',
        quando_usar: 'Quando voce quer retomar o convite sem pressionar e ainda puxar assunto.'
      },
      {
        texto: 'Voce fala mudanca como se fosse virar personagem internacional, e no fim e so trocar de bairro kkk. Gostei do suspense.',
        gatilho_ativo: 'Validacao Indireta',
        quando_usar: 'Quando o tom ja esta leve e ela respondeu com kkk.'
      },
      {
        texto: 'Entao a missao ficou mais simples: descobrir se o novo bairro tem cafe decente ou se vou ter que salvar essa parte.',
        gatilho_ativo: 'Desafio leve',
        quando_usar: 'Quando quiser transformar o assunto em gancho para encontro sem pedir direto.'
      }
    ];
    const closingBase = [
      attractionBase[1],
      attractionBase[3],
      attractionBase[0],
      attractionBase[2]
    ];
    const base = etapaNumero >= 5 ? closingBase : attractionBase;

    if (!wantsMore) return base;

    return [
      ...base,
      {
        texto: 'Agora ficou bem mais aceitavel. Quase cancelei o cafe com bolo por motivos diplomaticos, mas se e so bairro ainda da jogo.',
        gatilho_ativo: 'Encerrar no pico',
        quando_usar: 'Quando quiser manter o clima leve e deixar abertura para marcar depois.'
      },
      {
        texto: 'Bairro eu consigo negociar. Chile ja exigia visto emocional e planejamento demais pra uma fatia de bolo.',
        gatilho_ativo: 'Humor contextual',
        quando_usar: 'Quando quiser continuar a piada que voce ja criou.'
      },
      {
        texto: 'Entao voce criou suspense so pra eu descobrir que o desafio era urbano, nao internacional. Gostei da estrategia.',
        gatilho_ativo: 'Validacao Indireta',
        quando_usar: 'Quando quiser validar a brincadeira dela e devolver com charme.'
      }
    ];
  }

  if (lower.includes('ferias') || lower.includes('férias') || lower.includes('estudar')) {
    return [
      {
        texto: 'Ferias com estudo e mudanca no pacote... voce chama isso de descanso ou de modo sobrevivencia organizado?',
        gatilho_ativo: 'Leitura Fria',
        quando_usar: 'Quando ela contou planos praticos e o tom permite provocacao leve.'
      },
      {
        texto: 'A merce do destino, mas com lista de tarefas. Isso e muito especifico de quem finge improviso mas ja tem metade planejada.',
        gatilho_ativo: 'Validacao Indireta',
        quando_usar: 'Quando quiser fazer uma leitura com humor sobre o jeito dela.'
      },
      {
        texto: 'Ok, estudar e organizar mudanca. Vou fingir que isso parece ferias de uma pessoa normal.',
        gatilho_ativo: 'Push-Pull',
        quando_usar: 'Quando a conversa esta em clima de brincadeira.'
      }
    ];
  }

  if (lower.includes('cans') || lower.includes('esgot') || lower.includes('dorm')) {
    return [
      {
        texto: 'Voce nao descansa, voce da shutdown no sistema. Isso diz muito sobre uma cabeca que fica ligada ate a bateria acabar.',
        gatilho_ativo: 'Leitura Fria',
        quando_usar: 'Quando ela revelou cansaco, sono ou esgotamento.'
      },
      {
        texto: 'Tem um lado seu que parece tranquilo, mas outro claramente so para quando o corpo obriga.',
        gatilho_ativo: 'Espelhamento emocional',
        quando_usar: 'Quando quiser aprofundar sem parecer diagnostico.'
      },
      {
        texto: 'Dormir por esgotamento e praticamente um esporte radical emocional. Voce sempre foi assim ou e fase?',
        gatilho_ativo: 'Pergunta aberta',
        quando_usar: 'Quando quiser puxar uma resposta mais pessoal com leveza.'
      }
    ];
  }

  if (etapaNumero >= 4) {
    return [
      {
        texto: 'Isso tem mais camada do que parece. O jeito que voce falou entregou mais do que a frase em si.',
        gatilho_ativo: 'Leitura Fria',
        quando_usar: 'Quando a conversa ja tem abertura emocional.'
      },
      {
        texto: 'Curioso isso. Parece pequeno, mas normalmente essas respostas dizem bastante sobre como a pessoa funciona.',
        gatilho_ativo: 'Loop Aberto',
        quando_usar: 'Quando quiser aprofundar sem virar interrogatorio.'
      },
      {
        texto: 'Vou segurar minha teoria por enquanto, mas acho que entendi um padrao seu.',
        gatilho_ativo: 'Misterio',
        quando_usar: 'Quando quiser criar curiosidade com cuidado.'
      }
    ];
  }

  return [
    {
      texto: `Isso de "${relevantLine}" teve um detalhe bom. Parece simples, mas entrega um pouco do seu jeito.`,
      gatilho_ativo: 'Validacao Indireta',
      quando_usar: 'Quando ela trouxe um detalhe pessoal que da para valorizar.'
    },
    {
      texto: 'Ok, essa resposta abriu uma teoria aqui. Ainda nao sei se voce e mais caos organizado ou planejamento disfarçado.',
      gatilho_ativo: 'Leitura Fria',
      quando_usar: 'Quando ela respondeu com humor ou detalhe de rotina.'
    },
    {
      texto: 'Agora fiquei curioso. Isso e mais sobre seu momento atual ou voce sempre foi meio assim?',
      gatilho_ativo: 'Pergunta aberta',
      quando_usar: 'Quando quiser continuidade natural sem empilhar perguntas.'
    }
  ];
}

export function buildFallbackAnalysis({ conversa, pessoa = '', contexto = '', historico = [] }) {
  const savedContext = historyToConversation(historico);
  const accumulatedConversation = [savedContext, conversa].filter(Boolean).join('\n');
  const text = normalizeForSignals(accumulatedConversation);
  const etapaNumero = inferEtapa(text);
  const etapa = FLUXO_ETAPAS[etapaNumero - 1];
  const hasLimit = hasBoundarySignal(text);
  const relevantLine = pickRelevantLine(conversa || savedContext, pessoa);
  const wantsMoreSuggestions = /novas|diferentes|opcoes|opções|alternativas/i.test(contexto);

  if (hasLimit) {
    return {
      etapa_atual: {
        numero: 1,
        nome: 'Limite detectado',
        descricao: 'A conversa tem sinal de recusa ou desconforto.'
      },
      etapas_concluidas: [],
      diagnostico: 'Ha indicio de limite ou desconforto. A melhor resposta agora e respeitar o sinal e reduzir pressao.',
      gatilhos_ativos: [],
      proximo_movimento: {
        descricao: 'Responder de forma breve, respeitosa e sem insistir.',
        motivo: 'Consentimento e conforto vem antes de qualquer estrategia.'
      },
      mensagens_sugeridas: [
        {
          texto: 'Tranquilo, entendi. Nao quero te deixar desconfortavel.',
          gatilho_ativo: 'Respeito ao limite',
          quando_usar: 'Quando ela demonstrou recusa, desconforto ou falta de interesse.'
        }
      ],
      erros_a_evitar: ['Insistir', 'Cobrar resposta', 'Tentar reverter uma recusa clara'],
      leitura_fria: 'O sinal mais importante agora nao e psicologico; e de limite.',
      trecho_relevante: relevantLine,
      revelacao_util: 'Use esse trecho apenas para respeitar o limite e encerrar a pressao.'
    };
  }

  const mensagens = buildContextualSuggestions(relevantLine, etapa.numero, wantsMoreSuggestions);

  return {
    etapa_atual: {
      numero: etapa.numero,
      nome: etapa.nome,
      descricao: etapa.descricao
    },
    etapas_concluidas: Array.from({ length: Math.max(0, etapa.numero - 1) }, (_, index) => index + 1),
    diagnostico: buildDiagnostic(etapa.numero, relevantLine),
    gatilhos_ativos: pickGatilhos(etapa.numero),
    proximo_movimento: {
      descricao: mensagens[0]?.texto || 'Use uma afirmacao especifica sobre algo que ela trouxe e termine com um gancho leve.',
      motivo: mensagens[0]?.quando_usar || 'Isso evita interrogatorio, mostra atencao e mantem a conversa aberta.'
    },
    mensagens_sugeridas: mensagens,
    avaliacao_envio: buildEnvioFeedback(conversa),
    erros_a_evitar: [
      'Mandar muitas perguntas seguidas',
      'Elogiar aparencia cedo demais',
      'Forcar intimidade sem sinal de reciprocidade'
    ],
    leitura_fria: 'Ela parece responder melhor quando voce transforma detalhes pequenos em conversa com humor e observacao.',
    trecho_relevante: relevantLine,
    revelacao_util: 'Transforme esse detalhe em uma afirmacao com gancho, sem pressionar nem entrevistar.'
  };
}
