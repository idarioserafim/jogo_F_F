import { base44 } from "@/api/base44Client";
import { createDeck, shuffleDeck, compareCards } from "./cards";

export function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
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

export function determineTrickWinner(trick, vira) {
  let winner = trick[0].player_order;
  let winnerCard = trick[0].card;
  for (let i = 1; i < trick.length; i++) {
    if (compareCards(trick[i].card, winnerCard, vira) > 0) {
      winner = trick[i].player_order;
      winnerCard = trick[i].card;
    }
  }
  return winner;
}

export function calcCardsPerPlayer(numPlayers) {
  return Math.floor((40 - 1) / numPlayers);
}

export async function dealRound(gameId, game, hostUserId, newSubRound, newPeIndex) {
  const subRound = newSubRound ?? game.current_sub_round;
  const peIndex = newPeIndex ?? game.current_pe_index ?? 0;
  const numPlayers = game.players.length;
  const cardsPerPlayer = calcCardsPerPlayer(numPlayers);

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
  await base44.entities.PlayerHand.bulkCreate(handEntries);

  const tempGame = { ...game, current_pe_index: peIndex };
  const activeOrders = getActivePlayerOrders(tempGame);
  const firstPlayer = activeOrders[0] ?? 0;

  await base44.entities.Game.update(gameId, {
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
  });
}