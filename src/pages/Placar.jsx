import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Trophy, RotateCcw, ArrowRight, ChevronDown, ChevronRight, LogOut, Crown, History } from "lucide-react";
import { dealRound } from "@/lib/game";

export default function Placar() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [game, setGame] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmEnd, setShowConfirmEnd] = useState(false);
  const [expandedRound, setExpandedRound] = useState(null);
  const [ending, setEnding] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const g = await base44.entities.Game.get(gameId);
        if (cancelled) return;
        if (g.status === "palpites") { navigate(`/game/${gameId}/palpites`); return; }
        if (g.status === "mesa") { navigate(`/game/${gameId}/mesa`); return; }
        if (g.status === "aguardando") { navigate(`/game/${gameId}/lobby`); return; }
        setGame(g);
        const allEntries = await base44.entities.RoundEntry.filter({ game_id: gameId });
        if (cancelled) return;
        setEntries(allEntries);
        const lastRound = g.current_sub_round;
        if (lastRound > 0) setExpandedRound(lastRound);
      } catch (e) {}
      if (!cancelled) setLoading(false);
    };
    load();
    const unsub = base44.entities.Game.subscribe((event) => {
      if (cancelled || !event.data || event.data.id !== gameId) return;
      setGame(event.data);
    });
    return () => { cancelled = true; if (typeof unsub === "function") unsub(); };
  }, [gameId]);

  const endGame = async () => {
    setEnding(true);
    try {
      await base44.entities.Game.update(gameId, { status: "finalizado" });
      setGame({ ...game, status: "finalizado" });
      setShowConfirmEnd(false);
    } catch (e) {
      setEnding(false);
    }
  };

  const nextRound = async () => {
    if (!game || !user) return;
    setAdvancing(true);
    try {
      const abandoned = game.abandoned_players || [];
      let nextPe = (game.current_pe_index + 1) % game.players.length;
      let safety = 0;
      while (abandoned.includes(game.players[nextPe]) && safety < game.players.length) {
        nextPe = (nextPe + 1) % game.players.length;
        safety++;
      }
      const newSubRound = game.current_sub_round + 1;
      await dealRound(gameId, game, user.id, newSubRound, nextPe);
      navigate(`/game/${gameId}/palpites`);
    } catch (e) {
      setAdvancing(false);
    }
  };

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

  const abandoned = game.abandoned_players || [];
  const isFinished = game.status === "finalizado";
  const isHost = game.host_user_id === user?.id;

  const standings = game.players.map((name, index) => {
    const playerEntries = entries.filter((e) => e.player_order === index);
    const totalPoints = playerEntries.reduce((sum, e) => sum + (e.points || 0), 0);
    const wins = playerEntries.filter((e) => e.points === 0 && e.resultado !== -1).length;
    const isAbandoned = abandoned.includes(name);
    return { name, index, totalPoints, wins, rounds: playerEntries.length, isAbandoned };
  });

  const activeStandings = standings.filter((p) => !p.isAbandoned).sort((a, b) => a.totalPoints - b.totalPoints);
  const abandonedStandings = standings.filter((p) => p.isAbandoned).sort((a, b) => a.totalPoints - b.totalPoints);
  const sortedStandings = [...activeStandings, ...abandonedStandings];

  const roundNumbers = [...new Set(entries.map((e) => e.sub_round_number))].sort((a, b) => a - b);

  return (
    <div
      className="min-h-screen bg-slate-950 app-pad"
      style={{ backgroundImage: "radial-gradient(circle at 50% 0%, rgba(245, 158, 11, 0.06), transparent 55%)" }}
    >
      <div className="max-w-md mx-auto pt-10 pb-16">
        {isFinished && activeStandings[0] && (
          <div className="mb-6 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-center">
            <Crown className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-slate-400 text-sm mb-1">Campeão</p>
            <p className="text-3xl font-bold text-white">{activeStandings[0].name}</p>
            <p className="text-amber-500 font-semibold mt-1">{activeStandings[0].totalPoints} pontos</p>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Placar Geral</h1>
            <p className="text-sm text-slate-400">
              {roundNumbers.length} rodada{roundNumbers.length !== 1 ? "s" : ""} · Menos pontos vence
            </p>
          </div>
          <button
            onClick={() => navigate("/historico")}
            className="p-2 text-slate-400 hover:text-amber-500 transition-colors"
            title="Ver histórico"
          >
            <History className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 mb-8">
          {sortedStandings.map((player, rank) => {
            const isLeader = rank === 0 && !player.isAbandoned && !isFinished;
            const isChampion = isFinished && rank === 0 && !player.isAbandoned;
            return (
              <div
                key={player.index}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                  player.isAbandoned
                    ? "bg-slate-900/20 border-slate-800/50 opacity-60"
                    : isLeader || isChampion
                    ? "bg-amber-500/10 border-amber-500/50"
                    : "bg-slate-900/50 border-slate-800"
                }`}
              >
                <span
                  className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold shrink-0 ${
                    player.isAbandoned
                      ? "bg-slate-800 text-slate-600"
                      : isLeader || isChampion
                      ? "bg-amber-500 text-slate-950"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {player.isAbandoned ? <LogOut className="w-3 h-3" /> : rank + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-medium truncate ${player.isAbandoned ? "text-slate-500" : "text-white"}`}>
                      {player.name}
                    </span>
                    {player.isAbandoned && (
                      <span className="text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-full shrink-0">
                        abandonou
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{player.wins} acerto{player.wins !== 1 ? "s" : ""}</p>
                </div>
                {(isLeader || isChampion) && <Trophy className="w-4 h-4 text-amber-500 shrink-0" />}
                <span className={`text-2xl font-bold tabular-nums ${player.isAbandoned ? "text-slate-600" : "text-white"}`}>
                  {player.totalPoints}
                </span>
              </div>
            );
          })}
        </div>

        {roundNumbers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">Histórico de Rodadas</h2>
            <div className="space-y-1.5">
              {roundNumbers.map((roundNum) => {
                const roundEntries = entries
                  .filter((e) => e.sub_round_number === roundNum)
                  .sort((a, b) => a.player_order - b.player_order);
                const isExpanded = expandedRound === roundNum;
                return (
                  <div key={roundNum} className="bg-slate-900/30 rounded-xl overflow-hidden border border-slate-800/50">
                    <button
                      onClick={() => setExpandedRound(isExpanded ? null : roundNum)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800/30 transition-colors"
                    >
                      <span className="text-sm font-medium text-slate-300">Sub-rodada {roundNum}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600">
                          {roundEntries.filter((e) => e.points === 0).length} acerto{roundEntries.filter((e) => e.points === 0).length !== 1 ? "s" : ""}
                        </span>
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-600" /> : <ChevronRight className="w-4 h-4 text-slate-600" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-3 space-y-1.5 border-t border-slate-800/50 pt-2">
                        {roundEntries.map((entry) => (
                          <div key={entry.id} className="flex items-center gap-3">
                            <span className="flex-1 text-slate-300 text-sm truncate">{entry.player_name}</span>
                            <span className="text-xs text-slate-500 tabular-nums">
                              palpite {entry.palpite} → fez {entry.resultado === -1 ? "?" : entry.resultado}
                            </span>
                            <span className={`text-sm font-bold w-8 text-right tabular-nums ${entry.points === 0 ? "text-green-500" : "text-red-400"}`}>
                              {entry.points === 0 ? "0" : "+1"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!isFinished ? (
          <>
            {isHost && (
              <Button
                onClick={nextRound}
                disabled={advancing}
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold h-12 text-base"
              >
                {advancing ? "Distribuindo..." : (<span>Próxima Sub-rodada <ArrowRight className="w-4 h-4 ml-2" /></span>)}
              </Button>
            )}
            {isHost && !showConfirmEnd ? (
              <Button
                onClick={() => setShowConfirmEnd(true)}
                variant="outline"
                className="w-full mt-2 border-slate-800 text-slate-500 hover:text-red-400 hover:border-red-400/40 hover:bg-red-400/5 h-11"
              >
                Encerrar Jogo
              </Button>
            ) : isHost && showConfirmEnd ? (
              <div className="mt-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-sm text-red-300 font-medium mb-3 text-center">Tem certeza que deseja encerrar o jogo?</p>
                <div className="flex gap-2">
                  <Button onClick={() => setShowConfirmEnd(false)} variant="outline" className="flex-1 border-slate-700 text-slate-400 hover:text-white h-10">
                    Cancelar
                  </Button>
                  <Button onClick={endGame} disabled={ending} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold h-10">
                    {ending ? "Encerrando..." : "Sim, encerrar"}
                  </Button>
                </div>
              </div>
            ) : null}
            {!isHost && (
              <div className="w-full text-center text-slate-400 text-sm py-4 bg-slate-900/30 border border-slate-800 rounded-xl">
                Aguardando o anfitrião iniciar a próxima rodada...
              </div>
            )}
          </>
        ) : (
          <Button
            onClick={() => navigate("/")}
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold h-12 text-base"
          >
            <RotateCcw className="w-4 h-4 mr-2" /> Novo Jogo
          </Button>
        )}
      </div>
    </div>
  );
}