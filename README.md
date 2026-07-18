# Fofó

Jogo de cartas online (Fodinha) — sala com código, palpites, mesa e placar,
para jogar com a família pelo navegador.

Projeto independente: **não usa Base44** nem nenhum serviço externo. O
próprio servidor Node guarda o estado das partidas em memória e sincroniza
os jogadores em tempo real via Socket.IO.

## Rodar localmente

```bash
npm install
npm run dev
```

Isso sobe o front-end (Vite, porta 5173) e o servidor do jogo (porta 3001)
juntos. Abra a URL que o Vite mostrar no terminal (geralmente
`http://localhost:5173`).

## Build de produção

```bash
npm install
npm run build
npm start
```

`npm start` roda `node server.js`, que serve tanto os arquivos estáticos
gerados em `dist/` quanto a conexão Socket.IO — tudo em um único processo,
na porta definida por `process.env.PORT` (ou 3001 se não definida).

## Deploy (Render, por exemplo)

Um único serviço do tipo **Web Service (Node)**:

- Build Command: `npm install && npm run build`
- Start Command: `npm start`

Não é preciso configurar nenhuma variável de ambiente.

## Como funciona

- `server.js`: servidor Express + Socket.IO. Guarda as partidas (`Game`),
  as mãos dos jogadores (`PlayerHand`) e os palpites/resultados
  (`RoundEntry`) em memória, e avisa todos os jogadores conectados sempre
  que algo muda.
- `src/api/gameClient.js`: cliente usado pelas páginas do jogo para criar,
  atualizar, buscar e "escutar" mudanças nessas entidades — a mesma
  interface que era usada com o Base44, agora falando com o servidor
  próprio.

Como não há banco de dados, o histórico de partidas existe apenas enquanto
o servidor estiver no ar; se ele reiniciar, o histórico é perdido.
