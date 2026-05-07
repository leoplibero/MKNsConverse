import { Trash2 } from 'lucide-react';
import { formatDate } from '../utils/formatters.js';

export default function ConversasSalvas({ items, onSelect, onClear }) {
  return (
    <aside className="history-panel">
      <div className="panel-header compact">
        <div>
          <h2>Historico</h2>
          <p>Resumos salvos</p>
        </div>
        <button type="button" className="icon-button" onClick={onClear} title="Limpar historico" disabled={!items.length}>
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="history-list">
        {items.length ? items.map((item) => (
          <button type="button" className="history-item" key={item.id} onClick={() => onSelect(item)}>
            <span>{formatDate(item.createdAt)}</span>
            <strong>{item.etapa}</strong>
            <p>{item.preview}</p>
          </button>
        )) : (
          <p className="muted">Nada salvo ainda.</p>
        )}
      </div>
    </aside>
  );
}
