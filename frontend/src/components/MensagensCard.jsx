import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { asArray } from '../utils/formatters.js';

export default function MensagensCard({ mensagens }) {
  const [copied, setCopied] = useState('');
  const items = asArray(mensagens);

  async function copyMessage(text) {
    await navigator.clipboard.writeText(text);
    setCopied(text);
    window.setTimeout(() => setCopied(''), 1400);
  }

  return (
    <section className="result-block">
      <div className="block-title">
        <Copy size={18} aria-hidden="true" />
        <h3>Mensagens sugeridas</h3>
      </div>

      <div className="message-list">
        {items.length ? items.map((mensagem, index) => (
          <article className="message-card" key={`${mensagem.texto}-${index}`}>
            <p>{mensagem.texto}</p>
            <div className="message-meta">
              <span>{mensagem.gatilho_ativo || 'Contexto'}</span>
              <span>{mensagem.quando_usar}</span>
            </div>
            <button type="button" className="icon-button" onClick={() => copyMessage(mensagem.texto)} title="Copiar mensagem">
              {copied === mensagem.texto ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            </button>
          </article>
        )) : (
          <p className="muted">Sem sugestoes retornadas.</p>
        )}
      </div>
    </section>
  );
}
