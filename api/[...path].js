import { createApp } from '../backend/src/app.js';

if (process.env.VERCEL) {
  process.env.AUTH_STATELESS ||= 'true';
  process.env.AUTH_DB_PATH ||= '/tmp/mkns-auth.json';
  process.env.HISTORY_DB_PATH ||= '/tmp/mkns-history.sqlite';
}

const app = createApp();

export default function handler(req, res) {
  return app(req, res);
}
