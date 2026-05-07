import { getConfig } from './config.js';
import { createApp } from './app.js';

const config = getConfig();
const app = createApp();

app.listen(config.port, () => {
  console.log(`Backend rodando em http://localhost:${config.port}`);
});
