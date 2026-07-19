export const SUITS = ["ouro", "espada", "copa", "zap"];
export const RANKS = ["4", "5", "6", "7", "Q", "J", "K", "A", "2", "3"];

const RANK_ORDER = {};
RANKS.forEach((r, i) => { RANK_ORDER[r] = i; });

const SUIT_ORDER = { ouro: 0, espada: 1, copa: 2, zap: 3 };

export function nextRank(rank) {
  const idx = RANK_ORDER[rank];
  return RANKS[(idx + 1) % RANKS.length];
}

export function getManilhaRank(vira) {
  return vira ? nextRank(vira.rank) : null;
}

export function getCardStrength(card, vira) {
  if (!card) return -1;
  const manilhaRank = getManilhaRank(vira);
  if (card.rank === manilhaRank) {
    return 10 + (SUIT_ORDER[card.suit] || 0);
  }
  return RANK_ORDER[card.rank] ?? 0;
}

export function compareCards(cardA, cardB, vira) {
  return getCardStrength(cardA, vira) - getCardStrength(cardB, vira);
}

export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

export function shuffleDeck(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

export function suitSymbol(suit) {
  const map = { ouro: "♦", copa: "♥", espada: "♠", zap: "♣" };
  return map[suit] || "";
}

export function suitName(suit) {
  const map = { ouro: "Ouros", copa: "Copas", espada: "Espada", zap: "Zap" };
  return map[suit] || "";
}

export function sortHand(cards, vira) {
  return [...cards].sort((a, b) => getCardStrength(b, vira) - getCardStrength(a, vira));
}