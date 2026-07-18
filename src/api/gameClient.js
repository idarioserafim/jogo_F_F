// Cliente do "banco de dados" próprio do jogo — substitui o @base44/sdk.
// Fala com o server.js via Socket.IO. A forma de usar (db.entities.Game.create,
// .update, .filter, .subscribe, etc.) é igual à do Base44, então as páginas
// do jogo não precisam saber que o backend mudou.

import { io } from "socket.io-client";

// Em desenvolvimento (npm run dev), o front roda no Vite (porta 5173) e o
// servidor roda separado (node server.js, porta 3001). Em produção, os dois
// são servidos juntos pelo mesmo serviço, então usamos a própria origem.
const SERVER_URL = import.meta.env.DEV
  ? (import.meta.env.VITE_SERVER_URL || "http://localhost:3001")
  : window.location.origin;

const socket = io(SERVER_URL, {
  transports: ["websocket", "polling"],
});

function call(event, ...args) {
  return new Promise((resolve, reject) => {
    socket.emit(event, ...args, (result) => {
      if (result && result.error) reject(new Error(result.error));
      else resolve(result);
    });
  });
}

function makeEntityClient(entityName) {
  return {
    create: (data) => call("entity:create", entityName, data),
    bulkCreate: (dataArray) => call("entity:bulkCreate", entityName, dataArray),
    update: (id, patch) => call("entity:update", entityName, id, patch),
    bulkUpdate: (updates) => call("entity:bulkUpdate", entityName, updates),
    get: (id) => call("entity:get", entityName, id),
    filter: (query) => call("entity:filter", entityName, query || {}),
    list: (sort, limit) => call("entity:list", entityName, sort, limit),
    delete: (id) => call("entity:delete", entityName, id),
    deleteMany: (query) => call("entity:deleteMany", entityName, query || {}),
    // Mesma assinatura do Base44: subscribe(callback) recebe { data, type }
    // toda vez que um registro dessa entidade é criado, atualizado ou apagado.
    subscribe: (callback) => {
      const onChange = (record) => callback({ data: record, type: "update" });
      const onDelete = ({ id }) => callback({ data: { id }, type: "delete" });
      socket.on(`entity:${entityName}`, onChange);
      socket.on(`entity:${entityName}:deleted`, onDelete);
      return () => {
        socket.off(`entity:${entityName}`, onChange);
        socket.off(`entity:${entityName}:deleted`, onDelete);
      };
    },
  };
}

export const db = {
  entities: {
    Game: makeEntityClient("Game"),
    PlayerHand: makeEntityClient("PlayerHand"),
    RoundEntry: makeEntityClient("RoundEntry"),
  },
};
