import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

function ensureParentDir(dbPath) {
  if (!dbPath || dbPath === ':memory:') return;
  fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
}

function openDatabase(config) {
  const dbPath = config.nodeEnv === 'test' ? ':memory:' : config.historyDbPath;
  ensureParentDir(dbPath);
  const db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversation_summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_name TEXT NOT NULL,
      conversation_fragment TEXT NOT NULL DEFAULT '',
      etapa_numero INTEGER NOT NULL,
      etapa_nome TEXT NOT NULL,
      summary TEXT NOT NULL,
      relevant_excerpt TEXT NOT NULL,
      next_message TEXT NOT NULL,
      active_triggers TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_conversation_summaries_created_at
      ON conversation_summaries(created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_conversation_summaries_person
      ON conversation_summaries(person_name, created_at DESC, id DESC);
  `);
  const columns = db.prepare(`PRAGMA table_info(conversation_summaries)`).all();
  if (!columns.some((column) => column.name === 'conversation_fragment')) {
    db.exec(`ALTER TABLE conversation_summaries ADD COLUMN conversation_fragment TEXT NOT NULL DEFAULT ''`);
  }
  return db;
}

function stringifyTriggers(analysis) {
  const triggers = Array.isArray(analysis?.gatilhos_ativos)
    ? analysis.gatilhos_ativos.map((trigger) => trigger?.nome).filter(Boolean)
    : [];
  return JSON.stringify(triggers.slice(0, 8));
}

export function saveConversationSummary(config, payload, analysis) {
  const db = openDatabase(config);
  try {
    const personName = payload.pessoa || 'Sem nome';
    const firstMessage = Array.isArray(analysis?.mensagens_sugeridas)
      ? analysis.mensagens_sugeridas[0]?.texto
      : '';

    db.prepare(`
      INSERT INTO conversation_summaries (
        person_name,
        conversation_fragment,
        etapa_numero,
        etapa_nome,
        summary,
        relevant_excerpt,
        next_message,
        active_triggers
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      personName,
      String(payload.conversa || '').slice(0, 4000),
      Number(analysis?.etapa_atual?.numero || 1),
      String(analysis?.etapa_atual?.nome || 'Abertura').slice(0, 120),
      String(analysis?.diagnostico || '').slice(0, 900),
      String(analysis?.trecho_relevante || '').slice(0, 500),
      String(firstMessage || analysis?.proximo_movimento?.descricao || '').slice(0, 700),
      stringifyTriggers(analysis)
    );

    db.prepare(`
      DELETE FROM conversation_summaries
      WHERE id NOT IN (
        SELECT id FROM conversation_summaries
        ORDER BY datetime(created_at) DESC, id DESC
        LIMIT ?
      )
    `).run(config.historyLimit);
  } finally {
    db.close();
  }
}

export function listConversationSummaries(config, personName = '', limit = config.historyLimit) {
  const db = openDatabase(config);
  try {
    const rows = personName
      ? db.prepare(`
        SELECT * FROM conversation_summaries
        WHERE person_name = ?
        ORDER BY datetime(created_at) DESC, id DESC
        LIMIT ?
      `).all(personName, limit)
      : db.prepare(`
        SELECT * FROM conversation_summaries
        ORDER BY datetime(created_at) DESC, id DESC
        LIMIT ?
      `).all(limit);

    return rows.map((row) => ({
      id: row.id,
      pessoa: row.person_name,
      conversa_salva: row.conversation_fragment,
      etapa_atual: {
        numero: row.etapa_numero,
        nome: row.etapa_nome
      },
      resumo: row.summary,
      trecho_relevante: row.relevant_excerpt,
      proxima_mensagem: row.next_message,
      gatilhos_ativos: JSON.parse(row.active_triggers || '[]'),
      criado_em: row.created_at
    }));
  } finally {
    db.close();
  }
}

export function deleteConversationSummaries(config, personName) {
  const db = openDatabase(config);
  try {
    const result = db.prepare(`
      DELETE FROM conversation_summaries
      WHERE person_name = ?
    `).run(personName);

    return result.changes;
  } finally {
    db.close();
  }
}
