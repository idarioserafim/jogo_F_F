// Servidor próprio do jogo — substitui o Base44.
// Guarda tudo em memória (sem banco de dados) e sincroniza os jogadores
// em tempo real via Socket.IO. Também serve o front-end (pasta dist/)
// depois do `npm run build`, então em produção é um único serviço.

import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { Server } from "socket.io";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// ---- "Banco de dados" em memória -----------------------------------------
// Cada entidade é um Map<id, record>. Isso substitui as entidades do Base44
// (Game, PlayerHand, RoundEntry). Ao reiniciar o servidor, tudo é perdido —
// o que é intencional (sem banco de dados, conforme combinado).
const db = {
  Game: new Map(),
  PlayerHand: new Map(),
  RoundEntry: new Map(),
};

function matchesQuery(record, query) {
  return Object.entries(query || {}).every(([key, value]) => record[key] === value);
}

function broadcast(entityName, record) {
  io.emit(`entity:${entityName}`, record);
}

function broadcastDelete(entityName, id) {
  io.emit(`entity:${entityName}:deleted`, { id });
}

io.on("connection", (socket) => {
  socket.on("entity:create", (entityName, data, cb) => {
    try {
      const collection = db[entityName];
      const record = { id: randomUUID(), created_date: new Date().toISOString(), ...data };
      collection.set(record.id, record);
      broadcast(entityName, record);
      cb && cb(record);
    } catch (e) {
      cb && cb({ error: String(e) });
    }
  });

  socket.on("entity:bulkCreate", (entityName, dataArray, cb) => {
    try {
      const collection = db[entityName];
      const records = (dataArray || []).map((data) => {
        const record = { id: randomUUID(), created_date: new Date().toISOString(), ...data };
        collection.set(record.id, record);
        return record;
      });
      records.forEach((r) => broadcast(entityName, r));
      cb && cb(records);
    } catch (e) {
      cb && cb({ error: String(e) });
    }
  });

  socket.on("entity:update", (entityName, id, patch, cb) => {
    try {
      const collection = db[entityName];
      const existing = collection.get(id);
      if (!existing) return cb && cb({ error: "not found" });
      const updated = { ...existing, ...patch };
      collection.set(id, updated);
      broadcast(entityName, updated);
      cb && cb(updated);
    } catch (e) {
      cb && cb({ error: String(e) });
    }
  });

  socket.on("entity:bulkUpdate", (entityName, updates, cb) => {
    try {
      const collection = db[entityName];
      const results = (updates || []).map(({ id, ...patch }) => {
        const existing = collection.get(id);
        if (!existing) return null;
        const updated = { ...existing, ...patch };
        collection.set(id, updated);
        broadcast(entityName, updated);
        return updated;
      }).filter(Boolean);
      cb && cb(results);
    } catch (e) {
      cb && cb({ error: String(e) });
    }
  });

  socket.on("entity:get", (entityName, id, cb) => {
    const collection = db[entityName];
    cb && cb(collection.get(id) || null);
  });

  socket.on("entity:filter", (entityName, query, cb) => {
    const collection = db[entityName];
    const results = [...collection.values()].filter((r) => matchesQuery(r, query));
    cb && cb(results);
  });

  socket.on("entity:list", (entityName, sort, limit, cb) => {
    const collection = db[entityName];
    let results = [...collection.values()];
    if (sort) {
      const desc = sort.startsWith("-");
      const field = desc ? sort.slice(1) : sort;
      results.sort((a, b) => {
        if (a[field] === b[field]) return 0;
        return a[field] > b[field] ? 1 : -1;
      });
      if (desc) results.reverse();
    }
    if (limit) results = results.slice(0, limit);
    cb && cb(results);
  });

  socket.on("entity:delete", (entityName, id, cb) => {
    const collection = db[entityName];
    collection.delete(id);
    broadcastDelete(entityName, id);
    cb && cb(true);
  });

  socket.on("entity:deleteMany", (entityName, query, cb) => {
    const collection = db[entityName];
    const toDelete = [...collection.values()].filter((r) => matchesQuery(r, query));
    toDelete.forEach((r) => {
      collection.delete(r.id);
      broadcastDelete(entityName, r.id);
    });
    cb && cb(toDelete.length);
  });
});

// ---- Servir o front-end já compilado (npm run build -> dist/) -----------
const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

server.listen(PORT, () => {
  console.log(`Servidor do Fofó rodando na porta ${PORT}`);
});
