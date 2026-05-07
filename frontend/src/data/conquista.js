export const FLOW_STEPS = [
  {
    number: 1,
    name: 'Abertura',
    short: 'Observacao afiada, nao elogio generico',
    color: '#8e7cff'
  },
  {
    number: 2,
    name: 'Gerar atracao',
    short: 'Humor, provocacao, push-pull',
    color: '#18b887'
  },
  {
    number: 3,
    name: 'Qualificar',
    short: 'Elogio indireto, ela se revela',
    color: '#f6a928'
  },
  {
    number: 4,
    name: 'Conexao',
    short: 'Leitura fria, espelhamento',
    color: '#3498db'
  },
  {
    number: 5,
    name: 'Fechar',
    short: 'Encontro, numero, continuidade',
    color: '#f05f3b'
  }
];

export const SCHOOLS = [
  {
    initials: 'PO',
    name: 'Posicionamento',
    role: 'posicionamento',
    accent: '#8e7cff',
    description: 'Comportamento antes de frase pronta: abundancia, seguranca para interagir e demonstracao de valor pelo jeito de agir.',
    tags: ['Abundancia', 'Comportamento', 'Autonomia']
  },
  {
    initials: 'AP',
    name: 'Abordagem pratica',
    role: 'abordagem pratica',
    accent: '#18b887',
    description: 'Metodo de campo: abordagem, criacao de atracao, comunicacao efetiva, conforto, infields e calibragem pratica.',
    tags: ['Abordagem', 'Atracao', 'Calibragem']
  },
  {
    initials: 'IC',
    name: 'Inteligencia conversacional',
    role: 'inteligencia conversacional',
    accent: '#f05f3b',
    description: 'Foco em assunto infinito, jogo de texto, humor natural, leitura social e repertorio para a conversa nao morrer.',
    tags: ['Assunto infinito', 'Humor', 'Texto']
  }
];

export const PSYCHOLOGY_CONCEPTS = [
  {
    name: 'Escuta ativa',
    description: 'Responder ao contexto real, demonstrar compreensao emocional e evitar respostas genericas.',
    tags: ['Contexto', 'Compreensao', 'Continuidade']
  },
  {
    name: 'Validacao emocional',
    description: 'Reconhecer sentimentos e perspectivas sem julgamento, exagero artificial ou dramatizacao.',
    tags: ['Empatia', 'Acolhimento', 'Proporcao']
  },
  {
    name: 'Perguntas abertas',
    description: 'Abrir espaco para respostas elaboradas sem transformar a conversa em interrogatorio.',
    tags: ['Curiosidade', 'Gancho', 'Leveza']
  },
  {
    name: 'Rapport',
    description: 'Adaptar tom, ritmo e energia ao contexto da pessoa sem copiar mecanicamente.',
    tags: ['Tom', 'Ritmo', 'Conforto']
  },
  {
    name: 'Reciprocidade gradual',
    description: 'Aumentar intimidade aos poucos, respeitando o nivel de abertura que a conversa permite.',
    tags: ['Equilibrio', 'Tempo', 'Autonomia']
  },
  {
    name: 'Persuasao etica',
    description: 'Usar clareza, confianca e empatia sem gaslighting, coercao ou exploracao de vulnerabilidade.',
    tags: ['Clareza', 'Confianca', 'Consentimento']
  }
];

export const TRIGGERS = [
  {
    name: 'Escassez',
    description: 'Nao estar sempre disponivel. Ela percebe que pode perder sua atencao.',
    color: '#8e7cff'
  },
  {
    name: 'Desafio',
    description: 'Ela precisa se revelar. Inverta a posicao padrao sem pressionar.',
    color: '#18b887'
  },
  {
    name: 'Loop aberto',
    description: 'Deixar algo sem fechar. O cerebro fica querendo continuidade.',
    color: '#f05f3b'
  },
  {
    name: 'Push-pull',
    description: 'Aproxima e afasta com leveza. Cria tensao emocional e interesse.',
    color: '#f6a928'
  },
  {
    name: 'Reciprocidade',
    description: 'Quando ela se abre, voce tambem se abre um pouco.',
    color: '#3498db'
  },
  {
    name: 'Misterio',
    description: 'Revelar-se pouco a pouco. O que nao e dito ativa curiosidade.',
    color: '#8e7cff'
  },
  {
    name: 'Validacao indireta',
    description: 'Elogio nao obvio. Ela sente que voce realmente percebeu algo.',
    color: '#18b887'
  },
  {
    name: 'Espelhamento',
    description: 'Usar vocabulario, ritmo e tema dela para criar rapport natural.',
    color: '#f05f3b'
  },
  {
    name: 'Encerrar no pico',
    description: 'Sair quando esta bom. A conversa fica com gosto de continuacao.',
    color: '#f6a928'
  },
  {
    name: 'Leitura fria',
    description: 'Hipotese respeitosa sobre ela. Cria sensacao de ser entendida.',
    color: '#3498db'
  }
];

export const GOLDEN_RULES = [
  'Toda mensagem boa termina com ela precisando se revelar um pouco.',
  'Afirmacao + gancho. Nunca so afirmar. Nunca so perguntar.',
  'Use o que ela ja te deu no perfil. Mostra que voce presta atencao de verdade.',
  'Sair no pico vale mais que 10 mensagens medianas. Encerra quando esta bom.',
  'Se ela demonstrar limite, recusa ou desconforto, pare de insistir.'
];

export const GIRLS = [
  {
    id: 'arii',
    name: 'Arii',
    conversation: '',
    currentStep: 2,
    completedSteps: [1],
    title: 'Arii - onde a conversa esta agora',
    currentSituation: 'Abertura boa com tema visual do perfil. Ela respondeu com humor e aceitou a brincadeira, entao existe espaco para gerar atracao sem acelerar demais.',
    revealTitle: 'Gancho que ela deu - use isso',
    revealLabel: 'Ela sinalizou',
    revealQuote: 'Sereia que ensina crianca a ler? Isso nao estava no meu manual.',
    revealInsight: 'O tema mistura fantasia, humor e identidade. E uma ponte natural para provocacao leve e qualificacao nao fisica.',
    nextTitle: 'Proximo movimento - provocacao calibrada',
    nextLabel: 'Mensagem sugerida',
    nextMessage: 'Ta bom, vou dar o beneficio da duvida... mas sereia alfabetizadora e uma combinacao perigosamente especifica.',
    nextReason: 'Ela pode rir, defender a propria vibe e entregar mais material. Gatilhos de push-pull e desafio ativados.',
    activeTriggers: ['Push-pull', 'Desafio leve', 'Validacao indireta']
  },
  {
    id: 'carol',
    name: 'Carol',
    conversation: '',
    currentStep: 4,
    completedSteps: [1, 2, 3],
    title: 'Carol - onde a conversa esta agora',
    currentSituation: 'Conversa mais avancada. Ela ja revelou algo importante: gosto de dormir por esgotamento, seja mental ou fisico. Humor ja estabelecido. Conexao emocional sendo construida.',
    revealTitle: 'Revelacao que ela fez - use isso',
    revealLabel: 'Ela disse',
    revealQuote: 'Gosto de dormir por esgotamento, seja mental ou fisico. E meio nao saudavel.',
    revealInsight: 'Pessoa de mente agitada. Nao desliga facilmente. Essa e uma leitura fria pronta para ser usada.',
    nextTitle: 'Proximo movimento - leitura fria',
    nextLabel: 'Mensagem sugerida',
    nextMessage: 'Dormir por esgotamento e sinal classico de quem nao sabe descansar de verdade... sua cabeca nunca desliga no automatico ne?',
    nextReason: 'Ela vai confirmar ou se defender. Dos dois jeitos, fala mais sobre si. Gatilho de esse cara me entende ativado.',
    activeTriggers: ['Leitura fria pronta', 'Validacao indireta', 'Espelhamento emocional']
  }
];
