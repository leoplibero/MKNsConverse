import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Brain, Check, ChevronRight, Heart, KeyRound, Loader2, LogIn, LogOut, Lock, Mail, MessageCircle, Plus, RefreshCw, Send, ShieldCheck, Trash2, TrendingUp, UserRound, X } from 'lucide-react';
import {
  FLOW_STEPS,
  GIRLS,
  GOLDEN_RULES,
  PSYCHOLOGY_CONCEPTS,
  SCHOOLS,
  TRIGGERS
} from './data/conquista.js';
import mknsLogo from './assets/mkns-logo.png';

const FIXED_TABS = [
  { id: 'fluxo', label: 'Fluxo de conquista' },
  { id: 'gatilhos', label: 'Gatilhos mentais' }
];

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://127.0.0.1:3001/api');
const AUTH_STORAGE_KEY = 'conquista-auth-session';
const AUTH_VALIDATE_INTERVAL_MS = 60_000;

function readStoredSession() {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStoredSession(session) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

function clearStoredSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.error?.message || 'Falha na requisicao.');
    error.status = response.status;
    error.code = payload?.error?.code;
    error.details = payload?.error?.details;
    throw error;
  }

  return payload;
}

function AuthLogoMark() {
  return (
    <div className="auth-logo-frame" aria-label="MKNS" role="img">
      <img className="auth-logo-mark" src={mknsLogo} alt="" draggable="false" />
    </div>
  );
}

function buildGirlTemplate(name, conversation = '') {
  const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;

  return {
    id,
    name,
    conversation,
    currentStep: 1,
    completedSteps: [],
    title: `${name} - onde a conversa esta agora`,
    currentSituation: 'Nova aba criada. Cole a conversa no backend quando for atualizar a analise e mantenha o diagnostico focado no proximo movimento seguro.',
    revealTitle: 'Revelacao que ela fez - use isso',
    revealLabel: 'Ela disse',
    revealQuote: 'Ainda sem revelacao registrada.',
    revealInsight: 'Procure um detalhe emocional, uma rotina, um gosto especifico ou uma contradicao leve para usar como gancho.',
    nextTitle: 'Proximo movimento',
    nextLabel: 'Mensagem sugerida',
    nextMessage: 'Me fala uma coisa: isso e mais um traco seu ou foi so um momento especifico?',
    nextReason: 'A mensagem abre espaco para ela se revelar sem transformar a conversa em entrevista.',
    suggestedMessages: [
      {
        texto: 'Me fala uma coisa: isso e mais um traco seu ou foi so um momento especifico?',
        gatilho_ativo: 'Pergunta aberta',
        quando_usar: 'Quando quiser entender o contexto sem pressionar.'
      }
    ],
    selectedSuggestionIndex: 0,
    activeTriggers: ['Afirmacao + gancho', 'Validacao indireta'],
    envioFeedback: null,
    lastAnalysisAt: null
  };
}

function extractRelevantLine(conversation) {
  return conversation
    .split('\n')
    .map((line) => line.trim().replace(/^[^:]{1,24}:\s*/, ''))
    .filter((line) => line.length >= 10)
    .at(-1)
    ?.slice(0, 240) || 'Ainda sem trecho relevante detectado.';
}

function mapAnalysisToGirl(girl, analysis, conversation) {
  const currentStep = Number(analysis?.etapa_atual?.numero || 1);
  const safeStep = Number.isInteger(currentStep) ? Math.min(Math.max(currentStep, 1), 5) : 1;
  const suggestedMessages = Array.isArray(analysis?.mensagens_sugeridas)
    ? analysis.mensagens_sugeridas.filter((message) => message?.texto)
    : [];
  const firstMessage = suggestedMessages[0];
  const triggers = analysis?.gatilhos_ativos?.map((trigger) => trigger.nome).filter(Boolean) || [];

  return {
    ...girl,
    conversation: '',
    lastSubmittedConversation: conversation,
    currentStep: safeStep,
    completedSteps: Array.isArray(analysis?.etapas_concluidas) ? analysis.etapas_concluidas : [],
    title: `${girl.name} - onde a conversa esta agora`,
    currentSituation: analysis?.diagnostico || girl.currentSituation,
    revealTitle: 'Revelacao que ela fez - use isso',
    revealLabel: 'Trecho analisado',
    revealQuote: analysis?.trecho_relevante || extractRelevantLine(conversation),
    revealInsight: analysis?.revelacao_util || analysis?.leitura_fria || girl.revealInsight,
    nextTitle: `Proximo movimento - ${analysis?.etapa_atual?.nome || 'analise da IA'}`,
    nextLabel: 'Mensagem sugerida pela IA',
    nextReason: firstMessage?.quando_usar || analysis?.proximo_movimento?.motivo || girl.nextReason,
    suggestedMessages: suggestedMessages.length ? suggestedMessages : girl.suggestedMessages,
    selectedSuggestionIndex: 0,
    activeTriggers: triggers.length ? triggers : girl.activeTriggers,
    envioFeedback: analysis?.avaliacao_envio || null,
    lastAnalysisAt: Date.now(),
    analysis
  };
}

function mergeSuggestions(currentSuggestions = [], newSuggestions = []) {
  const seen = new Set(currentSuggestions.map((message) => message.texto));
  const merged = [...currentSuggestions];

  newSuggestions.forEach((message) => {
    if (message?.texto && !seen.has(message.texto)) {
      seen.add(message.texto);
      merged.push(message);
    }
  });

  return merged.slice(0, 8);
}

async function requestAnalysis(girl, conversation, token) {
  return apiRequest('/analise', {
    method: 'POST',
    token,
    body: JSON.stringify({
      pessoa: girl.name,
      conversa: conversation,
      contexto: `Pessoa analisada: ${girl.name}. Em exportacoes de chat, "You:" sou eu e "${girl.name}:" e a outra pessoa. Linhas com horario sao apenas ordem/timing. Use o fluxo de posicionamento, abordagem pratica e inteligencia conversacional com foco em consentimento, contexto e proximo movimento.`
    })
  });
}

async function requestSuggestions(girl, conversation, token) {
  return apiRequest('/sugestoes', {
    method: 'POST',
    token,
    body: JSON.stringify({
      pessoa: girl.name,
      conversa: conversation,
      contexto: `Pessoa analisada: ${girl.name}. Em exportacoes de chat, "You:" sou eu e "${girl.name}:" e a outra pessoa. Gere novas opcoes concretas e diferentes das sugestoes ja exibidas: ${JSON.stringify(girl.suggestedMessages || [])}`
    })
  });
}

async function requestCloseConversation(girl, token) {
  return apiRequest(`/historico/${encodeURIComponent(girl.name)}`, {
    method: 'DELETE',
    token
  });
}

async function requestLogin(payload) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

async function requestRegister(payload) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

async function requestPasswordRecovery(payload) {
  return apiRequest('/auth/password-recovery', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

async function requestPasswordReset(payload) {
  return apiRequest('/auth/password-reset', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

async function validateSession(token) {
  return apiRequest('/auth/validate', {
    method: 'POST',
    token,
    body: JSON.stringify({ token })
  });
}

function AuthScreen({ busy, error, onLogin, onRegister, onRequestRecovery, onResetPassword }) {
  const [mode, setMode] = useState('login');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [issuedRecoveryToken, setIssuedRecoveryToken] = useState('');

  async function submitLogin(event) {
    event.preventDefault();
    setLoading(true);
    setNotice('');

    try {
      await onLogin({ email: loginEmail, password: loginPassword });
    } catch (authError) {
      setNotice(authError.message || 'Nao foi possivel entrar.');
    } finally {
      setLoading(false);
    }
  }

  async function submitRegister(event) {
    event.preventDefault();
    setLoading(true);
    setNotice('');

    try {
      await onRegister({ name: registerName, email: registerEmail, password: registerPassword });
    } catch (authError) {
      setNotice(authError.message || 'Nao foi possivel criar a conta.');
    } finally {
      setLoading(false);
    }
  }

  async function requestRecovery(event) {
    event.preventDefault();
    setLoading(true);
    setNotice('');

    try {
      const result = await onRequestRecovery({ email: recoveryEmail });
      setIssuedRecoveryToken(result.recoveryToken || '');
      setNotice(result.message || 'Codigo de recuperacao gerado.');
    } catch (authError) {
      setNotice(authError.message || 'Nao foi possivel gerar o codigo de recuperacao.');
    } finally {
      setLoading(false);
    }
  }

  async function submitRecovery(event) {
    event.preventDefault();
    setLoading(true);
    setNotice('');

    try {
      await onResetPassword({
        email: recoveryEmail,
        recoveryToken,
        password: recoveryPassword
      });
    } catch (authError) {
      setNotice(authError.message || 'Nao foi possivel redefinir a senha.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-hero">
        <div className="auth-hero-logo">
          <AuthLogoMark />
          <div className="auth-hero-tagline">Conecte. Entenda. Conquiste.</div>
          <p className="auth-hero-description">O sistema que potencializa sua comunicação e transforma suas conexões.</p>
        </div>
        
        <div className="auth-hero-benefits">
          <div className="auth-benefit">
            <MessageCircle size={24} aria-hidden="true" />
            <span>Melhore suas<br />conversas</span>
          </div>
          <div className="auth-benefit">
            <Brain size={24} aria-hidden="true" />
            <span>Entenda a<br />mente feminina</span>
          </div>
          <div className="auth-benefit">
            <Heart size={24} aria-hidden="true" />
            <span>Crie conexão<br />de verdade</span>
          </div>
          <div className="auth-benefit">
            <TrendingUp size={24} aria-hidden="true" />
            <span>Mais confiança,<br />melhores resultados</span>
          </div>
        </div>

        <p className="auth-hero-motto">COMUNICAÇÃO INTELIGENTE. CONEXÕES REAIS.</p>
      </section>

      <section className="auth-card">
        <div className="auth-tabs">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Entrar</button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Cadastrar</button>
          <button type="button" className={mode === 'recover' ? 'active' : ''} onClick={() => setMode('recover')}>Recuperar senha</button>
        </div>

        {(error || notice) ? <div className="auth-message">{error || notice}</div> : null}
        {busy ? <div className="auth-message">Validando sessao...</div> : null}

        {mode === 'login' ? (
          <form className="auth-form" onSubmit={submitLogin}>
            <label>
              <span><Mail size={14} aria-hidden="true" /> Email</span>
              <input type="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} placeholder="voce@exemplo.com" autoComplete="email" />
            </label>
            <label>
              <span><Lock size={14} aria-hidden="true" /> Senha</span>
              <input type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} placeholder="Sua senha" autoComplete="current-password" />
            </label>
            <button type="submit" className="auth-submit" disabled={loading}><LogIn size={16} aria-hidden="true" /> Entrar</button>
          </form>
        ) : null}

        {mode === 'register' ? (
          <form className="auth-form" onSubmit={submitRegister}>
            <label>
              <span><UserRound size={14} aria-hidden="true" /> Nome</span>
              <input type="text" value={registerName} onChange={(event) => setRegisterName(event.target.value)} placeholder="Seu nome" autoComplete="name" />
            </label>
            <label>
              <span><Mail size={14} aria-hidden="true" /> Email</span>
              <input type="email" value={registerEmail} onChange={(event) => setRegisterEmail(event.target.value)} placeholder="voce@exemplo.com" autoComplete="email" />
            </label>
            <label>
              <span><Lock size={14} aria-hidden="true" /> Senha</span>
              <input type="password" value={registerPassword} onChange={(event) => setRegisterPassword(event.target.value)} placeholder="Crie uma senha forte" autoComplete="new-password" />
            </label>
            <button type="submit" className="auth-submit" disabled={loading}><UserRound size={16} aria-hidden="true" /> Criar conta</button>
          </form>
        ) : null}

        {mode === 'recover' ? (
          <div className="auth-recovery-stack">
            <form className="auth-form" onSubmit={issuedRecoveryToken ? submitRecovery : requestRecovery}>
              <label>
                <span><Mail size={14} aria-hidden="true" /> Email</span>
                <input type="email" value={recoveryEmail} onChange={(event) => setRecoveryEmail(event.target.value)} placeholder="voce@exemplo.com" autoComplete="email" />
              </label>

              {issuedRecoveryToken ? (
                <>
                  <label>
                    <span><KeyRound size={14} aria-hidden="true" /> Codigo recebido</span>
                    <input type="text" value={recoveryToken} onChange={(event) => setRecoveryToken(event.target.value)} placeholder="Cole o codigo que voce recebeu" autoComplete="one-time-code" />
                  </label>
                  <label>
                    <span><Lock size={14} aria-hidden="true" /> Nova senha</span>
                    <input type="password" value={recoveryPassword} onChange={(event) => setRecoveryPassword(event.target.value)} placeholder="Nova senha" autoComplete="new-password" />
                  </label>
                  <button type="submit" className="auth-submit" disabled={loading}><KeyRound size={16} aria-hidden="true" /> Redefinir senha</button>
                </>
              ) : (
                <button type="submit" className="auth-submit" disabled={loading}><KeyRound size={16} aria-hidden="true" /> Gerar codigo</button>
              )}
            </form>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function Tabs({ activeTab, girls, onChange, onCreateConversation }) {
  return (
    <div className="navigation-stack">
      <nav className="tabs context-tabs" aria-label="Contexto do sistema">
        {FIXED_TABS.map((tab) => (
          <button
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section className="conversation-nav" aria-labelledby="conversation-tabs-title">
        <h2 id="conversation-tabs-title">Conversas</h2>
        <nav className="tabs conversation-tabs" aria-label="Conversas">
          <button
            className="add-button conversation-add-button"
            type="button"
            title="Criar conversa nova"
            onClick={onCreateConversation}
          >
            <Plus size={18} aria-hidden="true" />
          </button>
          {girls.map((girl) => (
            <button
              className={`tab-button ${activeTab === girl.id ? 'active' : ''}`}
              key={girl.id}
              type="button"
              onClick={() => onChange(girl.id)}
            >
              {girl.name}
            </button>
          ))}
        </nav>
      </section>
    </div>
  );
}

function FlowRoadmap({ compact = false }) {
  return (
    <div className={compact ? 'girl-flow' : 'method-flow'}>
      {FLOW_STEPS.map((step, index) => (
        <div className="flow-pair" key={step.number}>
          <article className="method-step" style={{ '--accent': step.color }}>
            <span>{compact ? (step.number <= 3 ? <Check size={15} aria-hidden="true" /> : step.number) : `Etapa ${step.number}`}</span>
            <strong>{step.name}</strong>
            {!compact ? <p>{step.short}</p> : null}
          </article>
          {index < FLOW_STEPS.length - 1 ? <ChevronRight className="flow-arrow" size={22} aria-hidden="true" /> : null}
        </div>
      ))}
    </div>
  );
}

function MethodTab() {
  return (
    <section className="tab-page">
      <header className="section-heading">
        <p>Metodo unificado - posicionamento + abordagem pratica + inteligencia conversacional</p>
      </header>

      <FlowRoadmap />

      <h2>O que cada escola contribui</h2>
      <div className="school-list">
        {SCHOOLS.map((school) => (
          <article className="school-card" key={school.name}>
            <div className="school-avatar" style={{ '--accent': school.accent }}>{school.initials}</div>
            <div>
              <h3>{school.name}</h3>
              <p>{school.description}</p>
              <div className="pill-row">
                {school.tags.map((tag) => (
                  <span className="pill" key={tag}>{tag}</span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>

      <h2>Base psicologica aplicada</h2>
      <div className="psychology-grid">
        {PSYCHOLOGY_CONCEPTS.map((concept) => (
          <article className="psychology-card" key={concept.name}>
            <h3>{concept.name}</h3>
            <p>{concept.description}</p>
            <div className="pill-row">
              {concept.tags.map((tag) => (
                <span className="pill" key={tag}>{tag}</span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function TriggerTab() {
  return (
    <section className="tab-page">
      <h2>10 gatilhos principais aplicados a conversa</h2>
      <div className="trigger-grid">
        {TRIGGERS.map((trigger) => (
          <article className="trigger-card" key={trigger.name} style={{ '--accent': trigger.color }}>
            <strong>{trigger.name}</strong>
            <p>{trigger.description}</p>
          </article>
        ))}
      </div>

      <h2>Regras de ouro da conversa</h2>
      <div className="rule-list">
        {GOLDEN_RULES.map((rule) => (
          <article className="rule-card" key={rule}>{rule}</article>
        ))}
      </div>
    </section>
  );
}

function GirlProgress({ girl }) {
  return (
    <div className="girl-progress">
      {FLOW_STEPS.map((step, index) => {
        const done = girl.completedSteps.includes(step.number);
        const current = girl.currentStep === step.number;

        return (
          <div className="progress-pair" key={step.number}>
            <div className={`progress-step ${done ? 'done' : ''} ${current ? 'current' : ''}`}>
              <span>{done ? <Check size={15} aria-hidden="true" /> : step.number}</span>
              <strong>{step.name}</strong>
            </div>
            {index < FLOW_STEPS.length - 1 ? <ChevronRight className="progress-arrow" size={26} aria-hidden="true" /> : null}
          </div>
        );
      })}
    </div>
  );
}

function InfoCard({ title, children, highlight = false, critical = false }) {
  return (
    <article className={`info-card ${highlight ? 'highlight' : ''} ${critical ? 'critical' : ''}`}>
      <h3>{title}</h3>
      {children}
    </article>
  );
}

function ChatAnalyzer({ girl, loading, error, onConversationChange, onAnalyze }) {
  const isInvalid = girl.conversation.trim().length < 10;

  return (
    <article className="chat-card">
      <div className="chat-header">
        <div>
          <h3>Chat para analise</h3>
          <p>Cole o ultimo bloco da conversa. Depois da validacao, ele e salvo no historico e o campo limpa.</p>
        </div>
        <span>{girl.conversation.length}/12000</span>
      </div>
      <textarea
        value={girl.conversation}
        onChange={(event) => onConversationChange(girl.id, event.target.value)}
        maxLength={12000}
        rows={8}
        placeholder={`Cole aqui a conversa com ${girl.name}.`}
      />
      {error ? (
        <div className="inline-error">
          <AlertTriangle size={16} aria-hidden="true" />
          {error}
        </div>
      ) : null}
      <button className="analyze-button" type="button" disabled={loading || isInvalid} onClick={() => onAnalyze(girl.id)}>
        {loading ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <Send size={17} aria-hidden="true" />}
        Validar pela IA
      </button>
    </article>
  );
}

function SuggestionPanel({ girl, loadingSuggestion, onCycleSuggestion, onMoreSuggestions }) {
  const suggestions = girl.suggestedMessages?.length
    ? girl.suggestedMessages
    : [{ texto: girl.nextMessage, gatilho_ativo: 'Contexto', quando_usar: girl.nextReason }];
  const selectedIndex = Math.min(girl.selectedSuggestionIndex || 0, suggestions.length - 1);
  const selected = suggestions[selectedIndex];

  return (
    <InfoCard title={girl.nextTitle}>
      <div className="quote-box">
        <span>{girl.nextLabel} {suggestions.length > 1 ? `${selectedIndex + 1}/${suggestions.length}` : ''}</span>
        <strong>{selected?.texto || girl.nextMessage}</strong>
      </div>
      <p>{selected?.quando_usar || girl.nextReason}</p>
      <div className="suggestion-actions">
        <button className="ghost-button" type="button" onClick={() => onCycleSuggestion(girl.id)} disabled={suggestions.length < 2}>
          <RefreshCw size={16} aria-hidden="true" />
          Trocar sugestao
        </button>
        <button className="analyze-button" type="button" onClick={() => onMoreSuggestions(girl.id)} disabled={loadingSuggestion || (girl.conversation.trim().length < 10 && !girl.lastAnalysisAt)}>
          {loadingSuggestion ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
          Adicionar outra
        </button>
      </div>
    </InfoCard>
  );
}

function SubmissionFeedback({ feedback }) {
  if (!feedback) return null;
  const items = Array.isArray(feedback.mensagens) ? feedback.mensagens : [];

  return (
    <InfoCard title={feedback.titulo || 'Feedback do seu envio'} critical>
      {feedback.problema_critico ? <p className="critical-text">{feedback.problema_critico}</p> : null}
      {feedback.resumo ? <p>{feedback.resumo}</p> : null}

      {items.length ? (
        <div className="feedback-list">
          {items.map((item, index) => (
            <div className={`feedback-row ${item.tipo || 'neutro'}`} key={`${item.mensagem}-${index}`}>
              <span>{item.tipo === 'acerto' ? 'OK' : item.tipo === 'erro' ? 'ERRO' : 'NEUTRO'}</span>
              <strong>{item.mensagem}</strong>
              <p>{item.avaliacao}</p>
            </div>
          ))}
        </div>
      ) : null}

      {feedback.como_deveria_ter_ficado ? (
        <div className="quote-box">
          <span>Como deveria ter ficado</span>
          <strong>{feedback.como_deveria_ter_ficado}</strong>
        </div>
      ) : null}

      {feedback.agora_o_que_fazer ? <p className="next-action-text">{feedback.agora_o_que_fazer}</p> : null}
    </InfoCard>
  );
}

function GirlTab({
  girl,
  loading,
  loadingSuggestion,
  error,
  onConversationChange,
  onAnalyze,
  onCycleSuggestion,
  onMoreSuggestions,
  onRequestClose
}) {
  return (
    <section className="tab-page girl-page">
      <div className="girl-title-row">
        <h2>{girl.title}</h2>
        <button className="danger-ghost-button" type="button" onClick={() => onRequestClose(girl.id)}>
          <Trash2 size={16} aria-hidden="true" />
          Fechar conversa
        </button>
      </div>
      <GirlProgress girl={girl} />

      <ChatAnalyzer
        girl={girl}
        loading={loading}
        error={error}
        onConversationChange={onConversationChange}
        onAnalyze={onAnalyze}
      />

      <InfoCard title="Situacao atual" highlight>
        <p>{girl.currentSituation}</p>
      </InfoCard>

      <SubmissionFeedback feedback={girl.envioFeedback} />

      <InfoCard title={girl.revealTitle}>
        <div className="quote-box">
          <span>{girl.revealLabel}</span>
          <strong>{girl.revealQuote}</strong>
        </div>
        <p>{girl.revealInsight}</p>
      </InfoCard>

      <SuggestionPanel
        girl={girl}
        loadingSuggestion={loadingSuggestion}
        onCycleSuggestion={onCycleSuggestion}
        onMoreSuggestions={onMoreSuggestions}
      />

      <InfoCard title="Gatilhos ativos nessa conversa">
        <div className="pill-row">
          {girl.activeTriggers.map((trigger) => (
            <span className="pill" key={trigger}>{trigger}</span>
          ))}
        </div>
      </InfoCard>
    </section>
  );
}

function CloseConversationModal({ girl, loading, error, onCancel, onConfirm }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="close-conversation-title">
        <div className="modal-header">
          <div>
            <h2 id="close-conversation-title">Fechar conversa</h2>
            <p>Isso apaga o historico salvo dessa interacao e reseta a aba para comecar outra.</p>
          </div>
          <button className="icon-button" type="button" onClick={onCancel} title="Fechar" disabled={loading}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="warning-box">
          <AlertTriangle size={18} aria-hidden="true" />
          <p>
            O historico de <strong>{girl.name}</strong> sera apagado permanentemente do banco de dados.
            Essa acao nao pode ser desfeita.
          </p>
        </div>

        {error ? (
          <div className="inline-error">
            <AlertTriangle size={16} aria-hidden="true" />
            {error}
          </div>
        ) : null}

        <div className="modal-actions">
          <button className="ghost-button" type="button" onClick={onCancel} disabled={loading}>Cancelar</button>
          <button className="danger-button" type="button" onClick={onConfirm} disabled={loading}>
            {loading ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <Trash2 size={17} aria-hidden="true" />}
            Apagar permanentemente
          </button>
        </div>
      </div>
    </div>
  );
}

function AddGirlModal({ loading, error, onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [conversation, setConversation] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({ name: name.trim(), conversation: conversation.trim() });
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal-card" onSubmit={handleSubmit}>
        <div className="modal-header">
          <div>
            <h2>Nova garota</h2>
            <p>Cria a aba e ja envia a conversa para a IA.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} title="Fechar">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <label className="modal-field">
          <span>Nome</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex: Julia" autoFocus />
        </label>

        <label className="modal-field">
          <span>Conversa que teve</span>
          <textarea
            value={conversation}
            onChange={(event) => setConversation(event.target.value)}
            maxLength={12000}
            rows={8}
            placeholder="Cole a conversa aqui."
          />
        </label>

        {error ? (
          <div className="inline-error">
            <AlertTriangle size={16} aria-hidden="true" />
            {error}
          </div>
        ) : null}

        <div className="modal-actions">
          <button className="ghost-button" type="button" onClick={onClose}>Cancelar</button>
          <button className="analyze-button" type="submit" disabled={loading || name.trim().length < 2 || conversation.trim().length < 10}>
            {loading ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />}
            Criar e analisar
          </button>
        </div>
      </form>
    </div>
  );
}

function MainDashboard({ session, onSignOut }) {
  const [activeTab, setActiveTab] = useState('fluxo');
  const [girls, setGirls] = useState(GIRLS);
  const [loadingByGirl, setLoadingByGirl] = useState({});
  const [suggestionLoadingByGirl, setSuggestionLoadingByGirl] = useState({});
  const [errorByGirl, setErrorByGirl] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [closeModalGirlId, setCloseModalGirlId] = useState('');
  const [closeLoading, setCloseLoading] = useState(false);
  const [closeError, setCloseError] = useState('');
  const activeGirl = useMemo(() => girls.find((girl) => girl.id === activeTab), [activeTab, girls]);
  const closeModalGirl = useMemo(() => girls.find((girl) => girl.id === closeModalGirlId), [closeModalGirlId, girls]);

  useEffect(() => {
    let active = true;

    async function verifyCurrentSession() {
      try {
        await validateSession(session.token);
      } catch (authError) {
        if (active && authError.status === 401) {
          onSignOut('Sua sessao expirou ou o token mudou.');
        }
      }
    }

    verifyCurrentSession();

    const interval = window.setInterval(verifyCurrentSession, AUTH_VALIDATE_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [activeTab, onSignOut, session.token]);

  useEffect(() => {
    function handleStorage(event) {
      if (event.key !== AUTH_STORAGE_KEY) return;

      if (!event.newValue) {
        onSignOut('Sua sessao foi removida em outra aba.');
        return;
      }

      try {
        const nextSession = JSON.parse(event.newValue);
        if (!nextSession?.token || nextSession.token !== session.token) {
          onSignOut('Seu token foi alterado.');
        }
      } catch {
        onSignOut('Sua sessao ficou invalida.');
      }
    }

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [onSignOut, session.token]);

  function updateGirl(id, updater) {
    setGirls((current) => current.map((girl) => (girl.id === id ? updater(girl) : girl)));
  }

  function handleConversationChange(id, conversation) {
    updateGirl(id, (girl) => ({ ...girl, conversation }));
  }

  async function analyzeGirl(id) {
    const girl = girls.find((item) => item.id === id);
    if (!girl) return null;

    const conversation = girl.conversation.trim();
    if (conversation.length < 10) {
      setErrorByGirl((current) => ({ ...current, [id]: 'Cole uma conversa com pelo menos 10 caracteres.' }));
      return null;
    }

    setLoadingByGirl((current) => ({ ...current, [id]: true }));
    setErrorByGirl((current) => ({ ...current, [id]: '' }));

    try {
      const analysis = await requestAnalysis(girl, conversation, session.token);
      updateGirl(id, (currentGirl) => mapAnalysisToGirl(currentGirl, analysis, conversation));
      return analysis;
    } catch (error) {
      setErrorByGirl((current) => ({ ...current, [id]: error.message || 'Erro ao validar conversa.' }));
      return null;
    } finally {
      setLoadingByGirl((current) => ({ ...current, [id]: false }));
    }
  }

  function cycleSuggestion(id) {
    updateGirl(id, (girl) => {
      const total = girl.suggestedMessages?.length || 0;
      if (total < 2) return girl;
      return {
        ...girl,
        selectedSuggestionIndex: ((girl.selectedSuggestionIndex || 0) + 1) % total
      };
    });
  }

async function addMoreSuggestions(id) {
    const girl = girls.find((item) => item.id === id);
    if (!girl) return;

    const conversation = girl.conversation.trim();
    if (conversation.length < 10 && !girl.lastAnalysisAt) {
      setErrorByGirl((current) => ({ ...current, [id]: 'Valide pelo menos um bloco de conversa antes de pedir outra sugestao.' }));
      return;
    }

    setSuggestionLoadingByGirl((current) => ({ ...current, [id]: true }));
    setErrorByGirl((current) => ({ ...current, [id]: '' }));

    try {
      const result = await requestSuggestions(girl, conversation, session.token);
      const newSuggestions = result.mensagens_sugeridas || [];
      updateGirl(id, (currentGirl) => {
        const previousLength = currentGirl.suggestedMessages?.length || 0;
        const merged = mergeSuggestions(currentGirl.suggestedMessages, newSuggestions);
        return {
          ...currentGirl,
          suggestedMessages: merged,
          selectedSuggestionIndex: Math.min(previousLength, merged.length - 1),
          revealQuote: result.trecho_relevante || currentGirl.revealQuote,
          revealInsight: result.revelacao_util || currentGirl.revealInsight
        };
      });
    } catch (error) {
      setErrorByGirl((current) => ({ ...current, [id]: error.message || 'Erro ao gerar sugestao.' }));
    } finally {
      setSuggestionLoadingByGirl((current) => ({ ...current, [id]: false }));
    }
  }

  async function handleCreateGirl({ name, conversation }) {
    if (name.length < 2 || conversation.length < 10) {
      setModalError('Informe nome e conversa com pelo menos 10 caracteres.');
      return;
    }

    const newGirl = buildGirlTemplate(name, conversation);
    setModalLoading(true);
    setModalError('');
    setGirls((current) => [...current, newGirl]);
    setActiveTab(newGirl.id);

    try {
      const analysis = await requestAnalysis(newGirl, conversation, session.token);
      updateGirl(newGirl.id, (girl) => mapAnalysisToGirl(girl, analysis, conversation));
      setModalOpen(false);
    } catch (error) {
      setModalError(error.message || 'A aba foi criada, mas a analise falhou.');
      setErrorByGirl((current) => ({ ...current, [newGirl.id]: error.message || 'Erro ao validar conversa.' }));
      setModalOpen(false);
    } finally {
      setModalLoading(false);
    }
  }

  async function closeConversation() {
    if (!closeModalGirl) return;

    setCloseLoading(true);
    setCloseError('');

    try {
      await requestCloseConversation(closeModalGirl, session.token);
      updateGirl(closeModalGirl.id, (girl) => ({
        ...buildGirlTemplate(girl.name),
        id: girl.id,
        name: girl.name,
        title: `${girl.name} - onde a conversa esta agora`,
        currentSituation: 'Conversa fechada. O historico salvo dessa interacao foi apagado. Cole um novo bloco para iniciar outra analise.'
      }));
      setErrorByGirl((current) => ({ ...current, [closeModalGirl.id]: '' }));
      setCloseModalGirlId('');
    } catch (error) {
      setCloseError(error.message || 'Nao foi possivel apagar essa conversa.');
    } finally {
      setCloseLoading(false);
    }
  }

  return (
    <main className="dark-shell">
      <header className="app-header">
        <div>
          <p>Sistema de ajuda para paquera e conversacao</p>
          <h1>Conquista por contexto</h1>
        </div>
        <div className="header-actions">
          <span className="secure-chip"><ShieldCheck size={16} aria-hidden="true" /> Limites e consentimento</span>
          <button className="logout-button" type="button" onClick={() => onSignOut('Sessao encerrada manualmente.')}>
            <LogOut size={16} aria-hidden="true" /> Sair
          </button>
        </div>
      </header>

      <Tabs
        activeTab={activeTab}
        girls={girls}
        onChange={setActiveTab}
        onCreateConversation={() => {
          setModalError('');
          setModalOpen(true);
        }}
      />

      {activeTab === 'fluxo' ? <MethodTab /> : null}
      {activeTab === 'gatilhos' ? <TriggerTab /> : null}
      {activeGirl ? (
        <GirlTab
          girl={activeGirl}
          loading={Boolean(loadingByGirl[activeGirl.id])}
          loadingSuggestion={Boolean(suggestionLoadingByGirl[activeGirl.id])}
          error={errorByGirl[activeGirl.id]}
          onConversationChange={handleConversationChange}
          onAnalyze={analyzeGirl}
          onCycleSuggestion={cycleSuggestion}
          onMoreSuggestions={addMoreSuggestions}
          onRequestClose={(id) => {
            setCloseError('');
            setCloseModalGirlId(id);
          }}
        />
      ) : null}
      {modalOpen ? (
        <AddGirlModal
          loading={modalLoading}
          error={modalError}
          onClose={() => {
            setModalError('');
            setModalOpen(false);
          }}
          onSubmit={handleCreateGirl}
        />
      ) : null}
      {closeModalGirl ? (
        <CloseConversationModal
          girl={closeModalGirl}
          loading={closeLoading}
          error={closeError}
          onCancel={() => {
            if (!closeLoading) {
              setCloseError('');
              setCloseModalGirlId('');
            }
          }}
          onConfirm={closeConversation}
        />
      ) : null}
    </main>
  );
}

export default function App() {
  const [authState, setAuthState] = useState({ status: 'checking', session: null, error: '' });

  useEffect(() => {
    let cancelled = false;
    const storedSession = readStoredSession();

    async function bootstrap() {
      if (!storedSession?.token) {
        if (!cancelled) {
          setAuthState({ status: 'signed-out', session: null, error: '' });
        }
        return;
      }

      try {
        const validated = await validateSession(storedSession.token);
        if (!cancelled) {
          const nextSession = { ...validated, token: storedSession.token };
          saveStoredSession(nextSession);
          setAuthState({ status: 'signed-in', session: nextSession, error: '' });
        }
      } catch (authError) {
        clearStoredSession();
        if (!cancelled) {
          setAuthState({ status: 'signed-out', session: null, error: authError.message || 'Sessao invalida.' });
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleStorage(event) {
      if (event.key !== AUTH_STORAGE_KEY) return;

      if (!event.newValue) {
        setAuthState({ status: 'signed-out', session: null, error: '' });
        return;
      }

      try {
        const nextSession = JSON.parse(event.newValue);
        if (nextSession?.token) {
          setAuthState({ status: 'signed-in', session: nextSession, error: '' });
        }
      } catch {
        setAuthState({ status: 'signed-out', session: null, error: '' });
      }
    }

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  async function handleLogin(credentials) {
    const session = await requestLogin(credentials);
    const nextSession = { ...session, token: session.token };
    saveStoredSession(nextSession);
    setAuthState({ status: 'signed-in', session: nextSession, error: '' });
    return nextSession;
  }

  async function handleRegister(credentials) {
    const session = await requestRegister(credentials);
    const nextSession = { ...session, token: session.token };
    saveStoredSession(nextSession);
    setAuthState({ status: 'signed-in', session: nextSession, error: '' });
    return nextSession;
  }

  async function handleRequestRecovery(payload) {
    return requestPasswordRecovery(payload);
  }

  async function handleResetPassword(payload) {
    const session = await requestPasswordReset(payload);
    const nextSession = { ...session, token: session.token };
    saveStoredSession(nextSession);
    setAuthState({ status: 'signed-in', session: nextSession, error: '' });
    return nextSession;
  }

  function handleSignOut(errorMessage = '') {
    clearStoredSession();
    setAuthState({ status: 'signed-out', session: null, error: errorMessage });
  }

  if (authState.status === 'checking') {
    return (
      <main className="auth-shell">
        <section className="auth-card auth-loading-card">
          <Loader2 className="spin" size={20} aria-hidden="true" />
          <p>Validando sessao...</p>
        </section>
      </main>
    );
  }

  if (!authState.session) {
    return (
      <AuthScreen
        busy={false}
        error={authState.error}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onRequestRecovery={handleRequestRecovery}
        onResetPassword={handleResetPassword}
      />
    );
  }

  return <MainDashboard session={authState.session} onSignOut={handleSignOut} />;
}
