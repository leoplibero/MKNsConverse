# Historico de Conversas

Banco escolhido: SQLite.

Motivo:
- simples de configurar;
- nao exige servidor separado;
- funciona bem localmente;
- permite evoluir para mais tabelas ou sincronizacao futura;
- suficiente para armazenar apenas resumos curtos.

## Politica atual

- O sistema salva no maximo 5 resumos.
- Salva apenas os ultimos blocos colados, limitados por tamanho e quantidade.
- Nao salva o contexto inteiro.
- Cada registro guarda apenas:
  - pessoa;
  - bloco de conversa colado;
  - etapa atual;
  - diagnostico resumido;
  - trecho relevante curto;
  - proxima mensagem sugerida;
  - gatilhos ativos;
  - data de criacao.

## Arquivo local

Por padrao:

```txt
backend/storage/history.sqlite
```

Esse diretorio esta no `.gitignore`.
