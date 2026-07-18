import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Check, Clock } from "lucide-react";
import CardView from "@/components/Card";
import { getActivePlayerOrders, calcCardsPerPlayer } from "@/lib/game";
import { sortHand } from "@/lib/cards";

export default function Palpites() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [game, setGame] = useState(null);
  const [hand, setHand] = useState(null);
  const [entries, setEntries] = useState([]);
  const [myBet, setMyBet] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const gameRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const g = await base44.entities.Game.get(gameId);
        if (cancelled) return;
        gameRef.current = g;
        if (g.status === "mesa") { navigate(`/game/${gameId}/mesa`); return; }
        if (g.status === "resultados") { navigate(`/game/${gameId}/resultados`); return; }
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
        const allEntries = await base44.entities.RoundEntry.filter({
          game_id: gameId, sub_round_number: g.current_sub_round,
        });
        if (cancelled) return;
        setEntries(allEntries);
        const myEntry = allEntries.find((e) => e.player_order === mySeat);
        if (myEntry) setMyBet(String(myEntry.palpite));
      } catch (e) {}
      if (!cancelled) setLoading(false);
    };
    load();

    const unsubGame = base44.entities.Game.subscribe(async (event) => {
      if (cancelled || !event.data || event.data.id !== gameId) return;
      const g = event.data;
      gameRef.current = g;
      setGame(g);
      if (g.status === "mesa") { navigate(`/game/${gameId}/mesa`); return; }
      const allEntries = await base44.entities.RoundEntry.filter({
        game_id: gameId, sub_round_number: g.current_sub_round,
      });
      if (!cancelled) setEntries(allEntries);
    });
    const unsubEntries = base44.entities.RoundEntry.subscribe(async () => {
      if (cancelled) return;
      const subRound = gameRef.current?.current_sub_round;
      if (subRound == null) return;
      const allEntries = await base44.entities.RoundEntry.filter({
        game_id: gameId, sub_round_number: subRound,
      });
      if (!cancelled) setEntries(allEntries);
    });
    return () => {
      cancelled = true;
      if (typeof unsubGame === "function") unsubGame();
      if (typeof unsubEntries === "function") unsubEntries();
    };
  }, [gameId]);

  // Auto-transition if all bets are in
  useEffect(() => {
    if (game && game.status === "palpites") {
      const active = getActivePlayerOrders(game);
      const allIn = active.every((order) => entries.some((e) => e.player_order === order));
      if (allIn) {
        base44.entities.Game.update(gameId, {
          status: "mesa",
          current_player_index: active[0],
          current_trick: [],
          trick_number: 0,
          trick_winner: -1,
        }).catch(() => {});
      }
    }
  }, [entries, game]);

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
  const activeOrders = getActivePlayerOrders(game);
  const isPlayer = mySeat >= 0 && !abandoned.includes(game.players[mySeat]);
  const myEntry = entries.find((e) => e.player_order === mySeat);
  const hasBet = !!myEntry;
  const peIndex = game.current_pe_index ?? 0;
  const isPe = mySeat === peIndex;
  const cardsPerPlayer = game.cards_per_player || 1;

  const totalBets = entries
    .filter((e) => e.player_order !== peIndex)
    .reduce((s, e) => s + (e.palpite || 0), 0);
  const forbiddenBet = isPe ? cardsPerPlayer - totalBets : null;
  const allBetsIn = activeOrders.every((order) => entries.some((e) => e.player_order === order));

  const submitBet = async () => {
    const bet = Number(myBet);
    if (myBet === "" || isNaN(bet)) return;
    if (isPe && bet === forbiddenBet) return;
    if (bet < 0 || bet > cardsPerPlayer) return;
    setSaving(true);
    try {
      if (myEntry) {
        await base44.entities.RoundEntry.update(myEntry.id, { palpite: bet });
      } else {
        await base44.entities.RoundEntry.create({
          game_id: gameId,
          sub_round_number: game.current_sub_round,
          player_name: game.players[mySeat],
          player_order: mySeat,
          palpite: bet,
          resultado: -1,
          points: 0,
        });
      }
      const allEntries = await base44.entities.RoundEntry.filter({
        game_id: gameId, sub_round_number: game.current_sub_round,
      });
      setEntries(allEntries);
      const allIn = activeOrders.every((order) => allEntries.some((e) => e.player_order === order));
      if (allIn) {
        await base44.entities.Game.update(gameId, {
          status: "mesa",
          current_player_index: activeOrders[0],
          current_trick: [],
          trick_number: 0,
          trick_winner: -1,
        });
      }
    } catch (e) {}
    setSaving(false);
  };

  const vira = game.vira;
  const isMyBetValid = myBet !== "" && !isNaN(Number(myBet)) && Number(myBet) >= 0 && Number(myBet) <= cardsPerPlayer && !(isPe && Number(myBet) === forbiddenBet);

  return (
    <div
      className="min-h-screen bg-slate-950 app-pad"
      style={{ backgroundImage: "radial-gradient(circle at 50% 0%, rgba(245, 158, 11, 0.06), transparent 55%)" }}
    >
      <div className="max-w-md mx-auto pt-10 pb-16">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/")} className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Sub-rodada {game.current_sub_round}</h1>
            <p className="text-sm text-slate-400">{cardsPerPlayer} carta{cardsPerPlayer !== 1 ? "s" : ""} · Faça seu palpite</p>
          </div>
        </div>

        {/* Card count info */}
        <div className="text-center mb-4 text-sm text-slate-400">
          {cardsPerPlayer} carta{cardsPerPlayer !== 1 ? "s" : ""} por jogador
          {(game.deck || []).length > 0 && (
            <span className="text-slate-600"> · {(game.deck || []).length} no morto</span>
          )}
        </div>

        {/* Vira */}
        {vira && (
          <div className="flex items-center justify-center gap-3 mb-6 bg-slate-900/40 border border-slate-800 rounded-xl p-4">
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Vira</p>
            </div>
            <CardView card={vira} size="md" disabled />
          </div>
        )}

        {/* My hand */}
        {isPlayer && hand && (
          <div className="mb-6">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Sua mão</p>
            <div className="flex flex-wrap gap-2 justify-center bg-slate-900/30 rounded-xl p-4 border border-slate-800/50">
              {hand.cards.length > 0 ? (
                sortHand(hand.cards, vira).map((card, i) => (
                  <CardView key={i} card={card} size="md" disabled />
                ))
              ) : (
                <p className="text-slate-600 text-sm py-4">Sem cartas</p>
              )}
            </div>
          </div>
        )}

        {/* My bet */}
        {isPlayer && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-4">
            {hasBet ? (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 text-green-500 font-semibold">
                  <Check className="w-5 h-5" />
                  <span>Seu palpite: {myEntry.palpite}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Aguardando os outros jogadores...</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <span className="text-white font-medium">{game.players[mySeat]}</span>
                    {isPe && (
                      <span className="ml-2 text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full font-bold uppercase">
                        Pé
                      </span>
                    )}
                    {isPe && (
                      <p className="text-xs text-red-400 mt-1">Não pode apostar {forbiddenBet}</p>
                    )}
                  </div>
                  <div className="w-20">
                    <Input
                      type="number"
                      min="0"
                      max={cardsPerPlayer}
                      value={myBet}
                      onChange={(e) => setMyBet(e.target.value)}
                      placeholder="0"
                      className="bg-slate-950 border-slate-700 text-white text-center text-lg font-bold h-11"
                    />
                  </div>
                </div>
                <Button
                  onClick={submitBet}
                  disabled={!isMyBetValid || saving}
                  className="w-full mt-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold h-11"
                >
                  {saving ? "Salvando..." : "Confirmar Palpite"}
                </Button>
              </>
            )}
          </div>
        )}

        {/* Betting status */}
        <div className="space-y-2">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Palpites</p>
          {activeOrders.map((order) => {
            const entry = entries.find((e) => e.player_order === order);
            const name = game.players[order];
            const isCurrentPe = order === peIndex;
            return (
              <div key={order} className="flex items-center gap-3 bg-slate-900/30 border border-slate-800/50 rounded-lg px-3 py-2">
                <span className="flex-1 text-slate-300 text-sm truncate">{name}</span>
                {isCurrentPe && <span className="text-[10px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded font-bold">PÉ</span>}
                {entry ? (
                  <span className="text-green-500 font-bold text-sm tabular-nums">{entry.palpite}</span>
                ) : (
                  <span className="text-slate-600 text-sm flex items-center gap-1"><Clock className="w-3 h-3" /></span>
                )}
              </div>
            );
          })}
        </div>

        {!isPlayer && (
          <p className="text-center text-slate-500 text-sm mt-6">Você é espectador</p>
        )}
      </div>
    </div>
  );
}