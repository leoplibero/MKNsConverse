import { AlertTriangle, Lightbulb, MoveRight, Save } from 'lucide-react';
import FluxoEtapas from './FluxoEtapas.jsx';
import GatilhosCard from './GatilhosCard.jsx';
import MensagensCard from './MensagensCard.jsx';
import { asArray, etapaPercent } from '../utils/formatters.js';

export default function AnalisePainel({ analise, onSave }) {
  const erros = asArray(analise?.erros_a_evitar);

  return (
    <div className="analysis-panel">
      <div className="analysis-header">
        <div>
          <p>Etapa atual</p>
          <h2>{analise?.etapa_atual?.numero}. {analise?.etapa_atual?.nome}</h2>
        </div>
        <button type="button" className="secondary-button" onClick={onSave}>
          <Save size={16} aria-hidden="true" />
          Salvar
        </button>
      </div>

      <div className="progress-track">
        <span style={{ width: etapaPercent(analise?.etapa_atual) }} />
      </div>
      <FluxoEtapas etapaAtual={analise?.etapa_atual} etapasConcluidas={analise?.etapas_concluidas} />

      <section className="result-block">
        <div className="block-title">
          <Lightbulb size={18} aria-hidden="true" />
          <h3>Diagnostico</h3>
        </div>
        <p>{analise?.diagnostico}</p>
        <p className="cold-read">{analise?.leitura_fria}</p>
      </section>

      <GatilhosCard gatilhos={analise?.gatilhos_ativos} />

      <section className="result-block next-move">
        <div className="block-title">
          <MoveRight size={18} aria-hidden="true" />
          <h3>Proximo movimento</h3>
        </div>
        <strong>{analise?.proximo_movimento?.descricao}</strong>
        <p>{analise?.proximo_movimento?.motivo}</p>
      </section>

      <MensagensCard mensagens={analise?.mensagens_sugeridas} />

      <section className="result-block avoid-block">
        <div className="block-title">
          <AlertTriangle size={18} aria-hidden="true" />
          <h3>Erros a evitar</h3>
        </div>
        <ul>
          {erros.map((erro, index) => (
            <li key={`${erro}-${index}`}>{erro}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
