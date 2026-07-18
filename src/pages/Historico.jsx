import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/api/gameClient";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Crown, ChevronRight, History, Trash2 } from "lucide-react";
import PullToRefresh from "@/components/PullToRefresh";
import moment from "moment";

export default function Historico() {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const allGames = await db.entities.Game.filter({ status: "finalizado" });
      allGames.sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date));
      setGames(allGames);
      if (allGames.length > 0) {
        const allEntries = await db.entities.RoundEntry.list("-created_date", 2000);
        setEntries(allEntries);
      } else {
        setEntries([]);
      }
    } catch (e) {}
    if (!silent) setLoading(false);
  };

  const clearHistory = async () => {
    setClearing(true);
    try {
      const gameIds = games.map((g) => g.id);
      await db.entities.Game.deleteMany({ status: "finalizado" });
      for (const gid of gameIds) {
        await db.entities.RoundEntry.deleteMany({ game_id: gid });
      }
      setGames([]);
      setEntries([]);
      setConfirmClear(false);
    } catch (e) {}
    setClearing(false);
  };

  const getChampion = (game, gameEntries) => {
    const abandoned = game.abandoned_players || [];
    const active = game.players
      .map((name, index) => {
        if (abandoned.includes(name)) return null;
        const pts = gameEntries
          .filter((e) => e.game_id === game.id && e.player_order === index)
          .reduce((s, e) => s + (e.points || 0), 0);
        return { name, points: pts };
      })
      .filter((p) => p !== null);
    active.sort((a, b) => a.points - b.points);
    return active[0] || null;
  };

  const getRounds = (game, gameEntries) => {
    const nums = gameEntries
      .filter((e) => e.game_id === game.id)
      .map((e) => e.sub_round_number);
    return nums.length > 0 ? Math.max(...nums) : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-800 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 app-pad">
      <div className="max-w-md mx-auto pb-16">
        <PullToRefresh onRefresh={() => loadData(true)}>
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={() => navigate("/")}
              className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">Histórico</h1>
              <p className="text-sm text-slate-400">Partidas finalizadas</p>
            </div>
            {games.length > 0 && (
              <button
                onClick={() => setConfirmClear(true)}
                className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                title="Limpar histórico"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>

          {confirmClear && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-sm text-red-300 font-medium mb-3 text-center">
                Limpar todo o histórico? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => setConfirmClear(false)}
                  variant="outline"
                  disabled={clearing}
                  className="flex-1 border-slate-700 text-slate-400 hover:text-white h-10"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={clearHistory}
                  disabled={clearing}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold h-10"
                >
                  {clearing ? "Limpando..." : "Limpar"}
                </Button>
              </div>
            </div>
          )}

          {games.length === 0 ? (
            <div className="text-center py-20">
              <History className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500">Nenhuma partida finalizada ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {games.map((game) => {
                const champion = getChampion(game, entries);
                const rounds = getRounds(game, entries);
                const abandoned = game.abandoned_players || [];
                return (
                  <button
                    key={game.id}
                    onClick={() => navigate(`/game/${game.id}/placar`)}
                    className="w-full text-left bg-slate-900/50 border border-slate-800 hover:border-amber-500/40 rounded-xl p-4 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                        <Crown className="w-5 h-5 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold truncate">{champion ? champion.name : "—"}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {rounds} rodada{rounds !== 1 ? "s" : ""} · {game.players.length} jogador{game.players.length !== 1 ? "es" : ""}
                          {abandoned.length > 0 && ` · ${abandoned.length} abandonou`}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          {moment(game.updated_date).format("DD/MM/YYYY · HH:mm")}
                        </p>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        {champion && (
                          <span className="text-2xl font-bold text-white tabular-nums">{champion.points}</span>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-500 transition-colors mt-1" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </PullToRefresh>
      </div>
    </div>
  );
}