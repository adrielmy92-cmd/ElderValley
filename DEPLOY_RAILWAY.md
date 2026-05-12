# ElderValley no Railway

## Deploy

1. Suba este projeto para um repositorio no GitHub.
2. No Railway, crie um novo projeto e escolha **Deploy from GitHub repo**.
3. Selecione o repositorio do ElderValley.
4. O Railway vai usar `node server.mjs` como comando inicial.
5. Gere um dominio publico na aba **Networking**.
6. Teste:
   - `/health` deve retornar `ok: true`.
   - `/ws` e usado automaticamente pelo multiplayer do jogo.

## Importante

O save atual do modo criativo usa arquivos locais em `.eldervalley-storage`.
No Railway isso funciona para teste rapido, mas pode sumir em redeploy se nao tiver volume persistente.

Para teste de stress inicial, esta ok.
Para producao, o ideal e trocar esse storage por Postgres ou adicionar um Railway Volume.

## Variaveis

O Railway define `PORT` automaticamente. Nao precisa criar essa variavel manualmente.
