import { useRef, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function readError(response) {
  try {
    const body = await response.json();
    return body?.error?.message || 'Nao foi possivel analisar a conversa.';
  } catch {
    return 'Nao foi possivel analisar a conversa.';
  }
}

export default function useAnalise() {
  const [analise, setAnalise] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef(null);

  async function analisar(conversa, contexto) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/analise`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversa, contexto })
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const data = await response.json();
      setAnalise(data);
      return data;
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Erro inesperado.');
      }
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { analise, loading, error, analisar, setAnalise };
}
