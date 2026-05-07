export function asArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

export function etapaPercent(etapaAtual) {
  const numero = Number(etapaAtual?.numero || 1);
  const safe = Number.isFinite(numero) ? Math.min(Math.max(numero, 1), 5) : 1;
  return `${(safe / 5) * 100}%`;
}

export function formatDate(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

export function previewText(value, size = 92) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > size ? `${text.slice(0, size - 3)}...` : text;
}
