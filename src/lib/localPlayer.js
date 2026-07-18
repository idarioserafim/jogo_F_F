// Identidade local do jogador, usada no lugar da conta/login do Base44.
// Cada navegador recebe um ID único, guardado no localStorage, que passa
// a fazer o papel do antigo "user.id" vindo da autenticação.

const ID_KEY = "fofo_player_id";
const NAME_KEY = "fofo_player_name";

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "p_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
}

export function getPlayerId() {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(ID_KEY);
  if (!id) {
    id = generateId();
    window.localStorage.setItem(ID_KEY, id);
  }
  return id;
}

export function getPlayerName() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(NAME_KEY) || "";
}

export function setPlayerName(name) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NAME_KEY, name || "");
}
