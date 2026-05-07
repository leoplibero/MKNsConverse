import { Activity } from 'lucide-react';
import { asArray } from '../utils/formatters.js';

export default function GatilhosCard({ gatilhos }) {
  const items = asArray(gatilhos);

  return (
    <section className="result-block">
      <div className="block-title">
        <Activity size={18} aria-hidden="true" />
        <h3>Gatilhos ativos</h3>
      </div>
      <div className="trigger-grid">
        {items.length ? items.map((gatilho, index) => (
          <article className="trigger-item" key={`${gatilho.nome}-${index}`}>
            <div>
              <strong>{gatilho.nome}</strong>
              <span>{gatilho.status}</span>
            </div>
            <p>{gatilho.descricao}</p>
          </article>
        )) : (
          <p className="muted">Nenhum gatilho recomendado agora.</p>
        )}
      </div>
    </section>
  );
}
