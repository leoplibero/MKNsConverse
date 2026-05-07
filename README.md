# MKNS - Sistema de Analise Conversacional

Aplicacao web para analisar conversas, identificar o estagio da interacao e sugerir proximos movimentos com foco em comunicacao respeitosa, contexto, consentimento e seguranca.

## Funcionalidades

- Login, cadastro, validacao de token e logout.
- Recuperacao de senha por token local de desenvolvimento.
- Analise de conversa com IA Anthropic quando `ANTHROPIC_API_KEY` esta configurada.
- Fallback local quando o provedor de IA falha, sem quebrar o fluxo do usuario.
- Historico resumido em SQLite, limitado por configuracao.
- Exclusao permanente do historico de uma conversa.
- Feedback sobre as mensagens enviadas pelo usuario, incluindo erros de ritmo, excesso de mensagens e explicacao de humor.
- Protecoes contra prompt injection, payloads grandes, JSON malformado, CORS indevido e acesso sem token.

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Persistencia local: SQLite e JSON local para autenticacao
- IA: Anthropic Messages API
- Testes: `node:test`
- Seguranca HTTP: `helmet`, CORS restrito, rate limit, validacao de payload e tokens bearer

## Requisitos

- Node.js 22+
- npm
- Chave Anthropic opcional para IA real

## Configuracao

Instale as dependencias:

```bash
npm install
```

Configure o backend:

```bash
copy backend\.env.example backend\.env
```

Preencha pelo menos:

```env
ANTHROPIC_API_KEY=sua_chave_aqui
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Arquivos `.env`, banco local e storage estao ignorados pelo Git.

## Rodar Localmente

Backend:

```bash
npm run dev:backend
```

Frontend:

```bash
npm run dev:frontend
```

URLs padrao:

- Frontend: `http://127.0.0.1:5173`
- Backend: `http://localhost:3001`

## Testes e Auditoria

```bash
npm test
npm run pentest
npm audit --workspaces
npm run build --workspace frontend
```

Coberturas relevantes:

- autenticacao, cadastro, sessao e recuperacao de senha;
- invalidacao de token antigo;
- rotas protegidas rejeitando requisicao sem token;
- rate limit;
- CORS contra origem indevida;
- JSON malformado;
- payload acima do limite;
- prompt injection basico;
- ausencia de vazamento de system prompt, scripts e chaves em respostas.

## Seguranca

Este projeto evita publicar segredos por padrao:

- `backend/.env` e `frontend/.env` estao no `.gitignore`;
- `backend/storage/` esta no `.gitignore`;
- chaves de API nao devem ser commitadas;
- tokens de sessao sao armazenados no backend somente como hash SHA-256;
- senhas sao derivadas com PBKDF2 SHA-512, salt aleatorio e comparacao timing-safe;
- rotas de analise e historico exigem token bearer valido;
- o frontend invalida a sessao quando o token expira ou muda.

Importante: a recuperacao de senha atual e local/dev. Para producao, conecte um provedor de email e nunca exponha tokens de recuperacao na interface.

## Deploy

O backend precisa de um ambiente Node com variaveis de ambiente configuradas. GitHub Pages sozinho nao executa o backend Express. Para producao, use um host como Render, Railway, Fly.io, VPS ou similar para o backend, e Vercel/Netlify/GitHub Pages para o frontend apontando `VITE_API_URL` para a API.

## Licenca

Projeto privado.
