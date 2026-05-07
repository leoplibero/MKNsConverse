import { Check, Circle } from 'lucide-react';

const ETAPAS = ['Abertura', 'Atracao', 'Qualificar', 'Conexao', 'Fechar'];

export default function FluxoEtapas({ etapaAtual, etapasConcluidas = [] }) {
  return (
    <section className="flow-panel" aria-label="Fluxo">
      {ETAPAS.map((nome, index) => {
        const numero = index + 1;
        const done = etapasConcluidas.includes(numero);
        const current = Number(etapaAtual?.numero) === numero;

        return (
          <div className={`flow-step ${done ? 'done' : ''} ${current ? 'current' : ''}`} key={nome}>
            <div className="step-marker">
              {done ? <Check size={16} aria-hidden="true" /> : <Circle size={12} aria-hidden="true" />}
            </div>
            <span>{nome}</span>
          </div>
        );
      })}
    </section>
  );
}
