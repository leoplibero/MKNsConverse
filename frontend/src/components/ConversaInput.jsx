import { Loader2, Send, ShieldCheck } from 'lucide-react';

const MAX_CONVERSA = 12000;
const MAX_CONTEXTO = 2000;

export default function ConversaInput({
  conversa,
  contexto,
  setConversa,
  setContexto,
  onSubmit,
  loading
}) {
  const disabled = loading || conversa.trim().length < 10 || conversa.length > MAX_CONVERSA || contexto.length > MAX_CONTEXTO;

  return (
    <form className="input-panel" onSubmit={onSubmit}>
      <div className="panel-header">
        <div>
          <h2>Conversa</h2>
          <p>WhatsApp, app de namoro ou DM</p>
        </div>
        <span className="security-badge">
          <ShieldCheck size={16} aria-hidden="true" />
          Limites ativos
        </span>
      </div>

      <label className="field">
        <span>Contexto</span>
        <textarea
          value={contexto}
          onChange={(event) => setContexto(event.target.value)}
          rows={4}
          maxLength={MAX_CONTEXTO}
          placeholder="Nome, perfil, observacoes e objetivo da conversa."
        />
        <small>{contexto.length}/{MAX_CONTEXTO}</small>
      </label>

      <label className="field">
        <span>Conversa colada</span>
        <textarea
          value={conversa}
          onChange={(event) => setConversa(event.target.value)}
          rows={13}
          maxLength={MAX_CONVERSA}
          placeholder="Cole a conversa aqui."
          required
        />
        <small>{conversa.length}/{MAX_CONVERSA}</small>
      </label>

      <button className="primary-button" type="submit" disabled={disabled}>
        {loading ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
        Analisar
      </button>
    </form>
  );
}
