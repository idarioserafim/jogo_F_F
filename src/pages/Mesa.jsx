import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Crown } from "lucide-react";
import CardView from "@/components/Card";
import { getActivePlayerOrders, determineTrickWinner } from "@/lib/game";
import { calcCardsPerPlayer } from "@/lib/game";
import { sortHand } from "@/lib/cards";

export default function Mesa() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [game, setGame] = useState(null);
  const [hand, setHand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const gameRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const g = await base44.entities.Game.get(gameId);
        if (cancelled) return;
        gameRef.current = g;
        if (g.status === "resultados") { navigate(`/game/${gameId}/resultados`); return; }
        if (g.status === "palpites") { navigate(`/game/${gameId}/palpites`); return; }
        if (g.status === "finalizado") { navigate(`/game/${gameId}/placar`); return; }
        if (g.status === "aguardando") { navigate(`/game/${gameId}/lobby`); return; }
        setGame(g);
        const mySeat = (g.player_user_ids || []).indexOf(user?.id);
        if (mySeat >= 0) {
          const hands = await base44.entities.PlayerHand.filter({
            game_id: gameId, player_user_id: user.id, sub_round_number: g.current_sub_round,
          });
          if (!cancelled && hands.length > 0) setHand(hands[0]);
        }
      } catch (e) {}
      if (!cancelled) setLoading(false);
    };
    load();

    const unsubGame = base44.entities.Game.subscribe(async (event) => {
      if (cancelled || !event.data || event.data.id !== gameId) return;
      const g = event.data;
      gameRef.current = g;
      setGame(g);
      if (g.status === "resultados") { navigate(`/game/${gameId}/resultados`); return; }
      // Refresh hand when trick clears (cards removed)
      const mySeat = (g.player_user_ids || []).indexOf(user?.id);
      if (mySeat >= 0) {
        const hands = await base44.entities.PlayerHand.filter({
          game_id: gameId, player_user_id: user.id, sub_round_number: g.current_sub_round,
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

  const mySeat = (game.player_user_ids || []).indexOf(user?.id);
  const abandoned = game.abandoned_players || [];
  const isPlayer = mySeat >= 0 && !abandoned.includes(game.players[mySeat]);
  const activeOrders = getActivePlayerOrders(game);
  const currentPlayerIndex = game.current_player_index ?? 0;
  const isMyTurn = isPlayer && currentPlayerIndex === mySeat;
  const trick = game.current_trick || [];
  const trickWinner = game.trick_winner ?? -1;
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
      await base44.entities.PlayerHand.update(hand.id, { cards: newCards });
      setHand({ ...hand, cards: newCards });

      const myPos = activeOrders.indexOf(mySeat);
      const isLastPlay = myPos === activeOrders.length - 1;
      const newTrick = [...trick, { player_order: mySeat, card }];

      if (isLastPlay) {
        const winner = determineTrickWinner(newTrick, vira);
        const newTricksWon = tricksWon.map((v, i) => (i === winner ? v + 1 : v));
        const newTrickNumber = trickNumber + 1;
        if (newTrickNumber >= cardsPerPlayer) {
          await base44.entities.Game.update(gameId, {
            current_trick: newTrick,
            tricks_won: newTricksWon,
            trick_number: newTrickNumber,
            trick_winner: winner,
            status: "resultados",
          });
        } else {
          await base44.entities.Game.update(gameId, {
            current_trick: newTrick,
            tricks_won: newTricksWon,
            trick_number: newTrickNumber,
            trick_winner: winner,
          });
          setTimeout(async () => {
            try {
              await base44.entities.Game.update(gameId, {
                current_trick: [],
                trick_winner: -1,
                current_player_index: activeOrders[0],
              });
            } catch (e) {}
          }, 3000);
        }
      } else {
        const nextPlayer = activeOrders[myPos + 1];
        await base44.entities.Game.update(gameId, {
          current_trick: newTrick,
          current_player_index: nextPlayer,
        });
      }
    } catch (e) {}
    setPlaying(false);
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
            <CardView card={vira} size="sm" disabled />
            {(game.deck || []).length > 0 && (
              <div className="flex items-center gap-1 ml-2">
                <span className="text-xs text-slate-500">Morto</span>
                {Array.from({ length: Math.min((game.deck || []).length, 3) }).map((_, i) => (
                  <CardView key={i} hidden size="sm" />
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {activeOrders.map((order) => (
              <div key={order} className="text-center">
                <p className="text-[10px] text-slate-500 truncate max-w-16">{game.players[order]}</p>
                <p className="text-sm font-bold text-amber-500 tabular-nums">{tricksWon[order] || 0}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Current trick */}
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-4 mb-4 min-h-32 flex flex-col items-center justify-center">
          {trickComplete && trickWinner >= 0 ? (
            <div className="text-center">
              <Crown className="w-6 h-6 text-amber-500 mx-auto mb-1" />
              <p className="text-amber-500 font-semibold text-sm">{game.players[trickWinner]} ganhou a vaza!</p>
            </div>
          ) : trick.length === 0 ? (
            <p className="text-slate-600 text-sm">
              {isMyTurn ? "Sua vez — escolha uma carta" : `Vez de ${game.players[currentPlayerIndex]}`}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 justify-center">
              {trick.map((play, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-slate-500">{game.players[play.player_order]}</span>
                  <CardView card={play.card} size="sm" disabled />
                </div>
              ))}
            </div>
          )}
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
      </div>
    </div>
  );
}