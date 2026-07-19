import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "@/api/gameClient";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Crown } from "lucide-react";
import CardView from "@/components/Card";
import { getActivePlayerOrders, getTrickPlayOrder, determineTrickWinner, leaveGame } from "@/lib/game";
import { calcCardsPerPlayer } from "@/lib/game";
import { sortHand } from "@/lib/cards";
import { getPlayerId } from "@/lib/localPlayer";

export default function Mesa() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const playerId = getPlayerId();
  const [game, setGame] = useState(null);
  const [hand, setHand] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const gameRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const g = await db.entities.Game.get(gameId);
        if (cancelled) return;
        gameRef.current = g;
        if (g.status === "resultados") { navigate(`/game/${gameId}/resultados`); return; }
        if (g.status === "palpites") { navigate(`/game/${gameId}/palpites`); return; }
        if (g.status === "finalizado") { navigate(`/game/${gameId}/placar`); return; }
        if (g.status === "aguardando") { navigate(`/game/${gameId}/lobby`); return; }
        setGame(g);
        const mySeat = (g.player_user_ids || []).indexOf(playerId);
        if (mySeat >= 0) {
          const hands = await db.entities.PlayerHand.filter({
            game_id: gameId, player_user_id: playerId, sub_round_number: g.current_sub_round,
          });
          if (!cancelled && hands.length > 0) setHand(hands[0]);
        }
        const allEntries = await db.entities.RoundEntry.filter({
          game_id: gameId, sub_round_number: g.current_sub_round,
        });
        if (!cancelled) setEntries(allEntries);
      } catch (e) {}
      if (!cancelled) setLoading(false);
    };
    load();

    const unsubGame = db.entities.Game.subscribe(async (event) => {
      if (cancelled || !event.data || event.data.id !== gameId) return;
      const g = event.data;
      gameRef.current = g;
      setGame(g);
      if (g.status === "resultados") { navigate(`/game/${gameId}/resultados`); return; }
      // Refresh hand when trick clears (cards removed)
      const mySeat = (g.player_user_ids || []).indexOf(playerId);
      if (mySeat >= 0) {
        const hands = await db.entities.PlayerHand.filter({
          game_id: gameId, player_user_id: playerId, sub_round_number: g.current_sub_round,
        });
        if (!cancelled && hands.length > 0) setHand(hands[0]);
      }
    });
    return () => { cancelled = true; if (typeof unsubGame === "function") unsubGame(); };
  }, [gameId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-800 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }
  if (!game) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-slate-400">Jogo não encontrado.</p>
        <Button onClick={() => navigate("/")} variant="outline" className="border-slate-800 text-slate-300">Voltar</Button>
      </div>
    );
  }

  const mySeat = (game.player_user_ids || []).indexOf(playerId);
  const abandoned = game.abandoned_players || [];
  const isPlayer = mySeat >= 0 && !abandoned.includes(game.players[mySeat]);
  const activeOrders = getActivePlayerOrders(game);
  const currentPlayerIndex = game.current_player_index ?? 0;
  const isMyTurn = isPlayer && currentPlayerIndex === mySeat;
  const trick = game.current_trick || [];
  const trickWinner = game.trick_winner ?? -1;
  const trickTied = game.trick_tied ?? false;
  const deadPile = game.dead_pile || [];
  const tricksWon = game.tricks_won || [];
  const vira = game.vira;
  const trickNumber = game.trick_number || 0;
  const cardsPerPlayer = game.cards_per_player || 1;
  const trickComplete = trick.length >= activeOrders.length;

  const playCard = async (card) => {
    if (!isMyTurn || !hand || playing || trickComplete) return;
    const cardIndex = hand.cards.findIndex((c) => c.rank === card.rank && c.suit === card.suit);
    if (cardIndex < 0) return;
    const newCards = hand.cards.filter((_, i) => i !== cardIndex);
    setPlaying(true);
    try {
      await db.entities.PlayerHand.update(hand.id, { cards: newCards });
      setHand({ ...hand, cards: newCards });

      const trickOrder = getTrickPlayOrder(game, activeOrders);
      const myPos = trickOrder.indexOf(mySeat);
      const isLastPlay = myPos === trickOrder.length - 1;
      const newTrick = [...trick, { player_order: mySeat, card }];

      if (isLastPlay) {
        const result = determineTrickWinner(newTrick, vira);
        const newTrickNumber = trickNumber + 1;
        const isHandOver = newTrickNumber >= cardsPerPlayer;

        if (result.tie) {
          // Empate: ninguém ganha a vaza, as cartas vão pro morto e
          // quem empatou primeiro é quem sai jogando na próxima vaza.
          const newDeadPile = [...(game.dead_pile || []), ...newTrick.map((p) => p.card)];
          if (isHandOver) {
            await db.entities.Game.update(gameId, {
              current_trick: newTrick,
              trick_number: newTrickNumber,
              trick_winner: -1,
              trick_tied: true,
              dead_pile: newDeadPile,
              status: "resultados",
            });
          } else {
            await db.entities.Game.update(gameId, {
              current_trick: newTrick,
              trick_number: newTrickNumber,
              trick_winner: -1,
              trick_tied: true,
              dead_pile: newDeadPile,
            });
            setTimeout(async () => {
              try {
                await db.entities.Game.update(gameId, {
                  current_trick: [],
                  trick_winner: -1,
                  trick_tied: false,
                  current_player_index: result.firstTied,
                });
              } catch (e) {}
            }, 3000);
          }
        } else {
          const winner = result.winner;
          const newTricksWon = tricksWon.map((v, i) => (i === winner ? v + 1 : v));
          if (isHandOver) {
            await db.entities.Game.update(gameId, {
              current_trick: newTrick,
              tricks_won: newTricksWon,
              trick_number: newTrickNumber,
              trick_winner: winner,
              trick_tied: false,
              status: "resultados",
            });
          } else {
            await db.entities.Game.update(gameId, {
              current_trick: newTrick,
              tricks_won: newTricksWon,
              trick_number: newTrickNumber,
              trick_winner: winner,
              trick_tied: false,
            });
            setTimeout(async () => {
              try {
                await db.entities.Game.update(gameId, {
                  current_trick: [],
                  trick_winner: -1,
                  current_player_index: winner,
                });
              } catch (e) {}
            }, 3000);
          }
        }
      } else {
        const nextPlayer = trickOrder[myPos + 1];
        await db.entities.Game.update(gameId, {
          current_trick: newTrick,
          current_player_index: nextPlayer,
        });
      }
    } catch (e) {}
    setPlaying(false);
  };

  const leaveRoom = async () => {
    setLeaving(true);
    try {
      await leaveGame(gameId, game, playerId);
    } catch (e) {}
    navigate("/");
  };

  return (
    <div
      className="min-h-screen bg-slate-950 app-pad"
      style={{ backgroundImage: "radial-gradient(circle at 50% 0%, rgba(245, 158, 11, 0.06), transparent 55%)" }}
    >
      <div className="max-w-md mx-auto pt-10 pb-20">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/")} className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Mesa · Sub-rodada {game.current_sub_round}</h1>
            <p className="text-sm text-slate-400">Vaza {Math.min(trickNumber + 1, cardsPerPlayer)}/{cardsPerPlayer}</p>
          </div>
        </div>

        {/* Vira + morto + tricks won */}
        <div className="flex items-center justify-between mb-4 bg-slate-900/40 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Vira</span>
            <CardView card={vira} size="md" disabled />
            {((game.deck || []).length > 0 || deadPile.length > 0) && (
              <div className="flex items-center gap-1 ml-2">
                <span className="text-xs text-slate-500">Morto{deadPile.length > 0 ? ` (${deadPile.length})` : ""}</span>
                {Array.from({ length: Math.min((game.deck || []).length + deadPile.length, 3) }).map((_, i) => (
                  <CardView key={i} hidden size="sm" />
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {activeOrders.map((order) => {
              const entry = entries.find((e) => e.player_order === order);
              return (
                <div key={order} className="text-center">
                  <p className="text-[10px] text-slate-500 truncate max-w-16">{game.players[order]}</p>
                  <p className="text-sm font-bold text-amber-500 tabular-nums">
                    {tricksWon[order] || 0}
                    <span className="text-slate-600">/{entry ? entry.palpite : "?"}</span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current trick — cada jogador tem um lugar fixo, que só se preenche
            quando ele joga. Assim o layout não pula/embaralha a cada jogada. */}
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-4 mb-4">
          {trickComplete && (
            <div className="text-center mb-3 pb-3 border-b border-slate-800/50">
              {trickTied ? (
                <>
                  <p className="text-slate-300 font-semibold text-sm">Empate! As cartas foram para o morto.</p>
                  <p className="text-slate-500 text-xs mt-1">Ninguém perde ponto nesta vaza.</p>
                </>
              ) : trickWinner >= 0 ? (
                <>
                  <Crown className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                  <p className="text-amber-500 font-semibold text-sm">{game.players[trickWinner]} ganhou a vaza!</p>
                </>
              ) : null}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 justify-items-center">
            {activeOrders.map((order) => {
              const play = trick.find((p) => p.player_order === order);
              const isNext = !trickComplete && order === currentPlayerIndex;
              return (
                <div key={order} className="flex flex-col items-center gap-1">
                  <span className={`text-xs truncate max-w-[4.5rem] ${isNext ? "text-amber-500 font-semibold" : "text-slate-500"}`}>
                    {game.players[order]}
                  </span>
                  {play ? (
                    <CardView card={play.card} size="lg" disabled />
                  ) : (
                    <div
                      className={`w-[4.5rem] h-[6.5rem] rounded-lg border-2 border-dashed flex items-center justify-center ${
                        isNext ? "border-amber-500/50" : "border-slate-800"
                      }`}
                    >
                      {isNext && <span className="text-amber-500/70 text-lg">…</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Whose turn indicator */}
        {!trickComplete && (
          <div className="mb-4 text-center">
            {isMyTurn ? (
              <span className="inline-block bg-amber-500 text-slate-950 px-4 py-1.5 rounded-full text-sm font-bold">
                Sua vez!
              </span>
            ) : (
              <span className="text-slate-500 text-sm">Aguardando {game.players[currentPlayerIndex]}...</span>
            )}
          </div>
        )}

        {/* My hand */}
        {isPlayer && hand && (
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Sua mão</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {sortHand(hand.cards, vira).map((card) => (
                <CardView
                  key={`${card.rank}-${card.suit}`}
                  card={card}
                  size="lg"
                  disabled={!isMyTurn || playing || trickComplete}
                  onClick={() => playCard(card)}
                />
              ))}
            </div>
          </div>
        )}

        {!isPlayer && (
          <p className="text-center text-slate-500 text-sm">Você é espectador</p>
        )}

        {isPlayer && (
          <button
            onClick={leaveRoom}
            disabled={leaving}
            className="w-full mt-6 text-center text-slate-500 hover:text-red-400 text-sm py-2 transition-colors"
          >
            {leaving ? "Saindo..." : "Sair da sala"}
          </button>
        )}
      </div>
    </div>
  );
}