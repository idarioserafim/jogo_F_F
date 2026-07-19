import { db } from "@/api/gameClient";
import { createDeck, shuffleDeck, compareCards, getCardStrength } from "./cards";

// Compara o game antigo com o novo e retorna nomes que acabaram de ser
// marcados como "abandonou" (usado pra mostrar um aviso de saída).
export function findNewlyAbandoned(oldGame, newGame) {
  if (!oldGame || !newGame) return [];
  const before = oldGame.abandoned_players || [];
  const after = newGame.abandoned_players || [];
  return after.filter((name) => !before.includes(name));
}

// Compara a lista de jogadores da sala de espera antes/depois e retorna
// nomes que saíram (removidos de vez, já que ainda não começou o jogo).
export function findRemovedLobbyPlayers(oldGame, newGame) {
  if (!oldGame || !newGame) return [];
  const before = oldGame.players || [];
  const after = newGame.players || [];
  return before.filter((name) => !after.includes(name));
}

export function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Escolhe o próximo anfitrião entre os jogadores ainda ativos (não
// abandonados), na ordem dos assentos. Retorna null se não sobrar ninguém.
function pickNextHost(game, leavingSeat, newAbandoned) {
  const ids = game.player_user_ids || [];
  for (let i = 1; i <= game.players.length; i++) {
    const idx = (leavingSeat + i) % game.players.length;
    if (idx === leavingSeat) continue;
    if (!newAbandoned.includes(game.players[idx]) && ids[idx]) {
      return ids[idx];
    }
  }
  return null;
}

// Sair de uma sala ainda na sala de espera (antes do jogo começar): como
// ninguém ainda tem mão/palpite registrado, o jogador é removido de vez das
// listas, em vez de só marcado como "abandonou".
export async function leaveLobby(gameId, game, playerId) {
  const seat = (game.player_user_ids || []).indexOf(playerId);
  if (seat < 0) return;

  const newPlayers = game.players.filter((_, i) => i !== seat);
  const newIds = (game.player_user_ids || []).filter((_, i) => i !== seat);
  const patch = { players: newPlayers, player_user_ids: newIds };

  if (game.host_user_id === playerId) {
    patch.host_user_id = newIds[0] || null;
  }

  await db.entities.Game.update(gameId, patch);
}

// Sair de uma partida já em andamento: mantém o nome do jogador no placar
// (marcado como "abandonou"), transfere a responsabilidade de anfitrião se
// necessário, e — se era a vez dele jogar uma carta na mesa — passa a vez
// para o próximo jogador ativo.
export async function leaveGame(gameId, game, playerId) {
  const seat = (game.player_user_ids || []).indexOf(playerId);
  if (seat < 0) return;
  const name = game.players[seat];
  const abandoned = game.abandoned_players || [];
  if (abandoned.includes(name)) return;
  const newAbandoned = [...abandoned, name];
  const patch = { abandoned_players: newAbandoned };

  if (game.host_user_id === playerId) {
    patch.host_user_id = pickNextHost(game, seat, newAbandoned);
  }

  if (game.status === "mesa" && (game.current_player_index ?? -1) === seat) {
    const oldActiveOrders = getActivePlayerOrders(game);
    const oldTrickOrder = getTrickPlayOrder(game, oldActiveOrders);
    const myPos = oldTrickOrder.indexOf(seat);
    if (myPos >= 0 && oldTrickOrder.length > 1) {
      for (let i = 1; i <= oldTrickOrder.length; i++) {
        const candidate = oldTrickOrder[(myPos + i) % oldTrickOrder.length];
        if (candidate !== seat && !newAbandoned.includes(game.players[candidate])) {
          patch.current_player_index = candidate;
          break;
        }
      }
    }
  }

  await db.entities.Game.update(gameId, patch);
}

export function getActivePlayerOrders(game) {
  const abandoned = game.abandoned_players || [];
  const peIndex = game.current_pe_index ?? 0;
  const orders = [];
  for (let i = 1; i <= game.players.length; i++) {
    const idx = (peIndex + i) % game.players.length;
    if (!abandoned.includes(game.players[idx])) {
      orders.push(idx);
    }
  }
  return orders;
}

// A ordem fixa (getActivePlayerOrders) sempre começa depois do "pé" e não
// muda durante a mão — mas quem LIDERA cada vaza pode mudar (quem ganhou a
// vaza anterior, ou quem empatou primeiro, sai jogando na próxima). Esta
// função gira a ordem fixa para começar em quem está liderando a vaza atual,
// pra saber corretamente quem joga em seguida e quem fecha a vaza.
export function getTrickPlayOrder(game, activeOrders) {
  const trick = game.current_trick || [];
  const leaderSeat = trick.length > 0 ? trick[0].player_order : (game.current_player_index ?? activeOrders[0]);
  const leaderPos = activeOrders.indexOf(leaderSeat);
  if (leaderPos === -1) return activeOrders;
  return [...activeOrders.slice(leaderPos), ...activeOrders.slice(0, leaderPos)];
}

// Retorna o resultado de uma vaza.
// - Se um jogador venceu: { winner: <player_order>, tie: false }
// - Se empatou (duas ou mais cartas de maior força iguais, ninguém bateu):
//   { winner: null, tie: true, firstTied: <player_order de quem empatou primeiro>, tiedCards: [...] }
export function determineTrickWinner(trick, vira) {
  let maxStrength = -1;
  for (const play of trick) {
    const s = getCardStrength(play.card, vira);
    if (s > maxStrength) maxStrength = s;
  }
  const topPlays = trick.filter((play) => getCardStrength(play.card, vira) === maxStrength);

  if (topPlays.length > 1) {
    // topPlays[0] é quem jogou a carta mais forte primeiro (o "líder"),
    // topPlays[1] é quem empatou essa carta pela primeira vez — é ele quem
    // sai jogando na próxima vaza, e não quem liderou originalmente.
    return {
      winner: null,
      tie: true,
      firstTied: topPlays[1].player_order,
      tiedCards: topPlays.map((p) => p.card),
    };
  }
  return { winner: topPlays[0].player_order, tie: false };
}

export function calcCardsPerPlayer(numPlayers) {
  return Math.floor((40 - 1) / numPlayers);
}

// Decide quantas cartas por jogador usar nesta mão: respeita o valor
// escolhido pelo anfitrião (game.cards_per_player), desde que seja válido
// pra quantidade atual de jogadores; senão, usa o máximo possível.
export function resolveCardsPerPlayer(game) {
  const max = calcCardsPerPlayer(game.players.length);
  const requested = game.cards_per_player;
  if (requested && requested >= 1 && requested <= max) return requested;
  return max;
}

export async function dealRound(gameId, game, hostUserId, newSubRound, newPeIndex) {
  const subRound = newSubRound ?? game.current_sub_round;
  const peIndex = newPeIndex ?? game.current_pe_index ?? 0;
  const numPlayers = game.players.length;
  const cardsPerPlayer = resolveCardsPerPlayer(game);

  let deck = shuffleDeck(createDeck());
  const hands = game.players.map(() => []);
  for (let c = 0; c < cardsPerPlayer; c++) {
    for (let p = 0; p < numPlayers; p++) {
      hands[p].push(deck.pop());
    }
  }
  const vira = deck.pop();

  const handEntries = game.players.map((name, i) => ({
    game_id: gameId,
    player_order: i,
    player_user_id: (game.player_user_ids || [])[i] || "",
    player_name: name,
    cards: hands[i],
    sub_round_number: subRound,
    host_user_id: hostUserId,
  }));
  await db.entities.PlayerHand.bulkCreate(handEntries);

  const tempGame = { ...game, current_pe_index: peIndex };
  const activeOrders = getActivePlayerOrders(tempGame);
  const firstPlayer = activeOrders[0] ?? 0;

  await db.entities.Game.update(gameId, {
    status: "palpites",
    current_sub_round: subRound,
    current_pe_index: peIndex,
    cards_per_player: cardsPerPlayer,
    vira,
    deck,
    current_trick: [],
    trick_number: 0,
    current_player_index: firstPlayer,
    tricks_won: game.players.map(() => 0),
    trick_winner: -1,
    trick_tied: false,
    dead_pile: [],
  });
}