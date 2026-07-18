import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function Resultados() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [game, setGame] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calcDone, setCalcDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const g = await base44.entities.Game.get(gameId);
        if (cancelled) return;
        if (g.status === "palpites") { navigate(`/game/${gameId}/palpites`); return; }
        if (g.status === "mesa") { navigate(`/game/${gameId}/mesa`); return; }
        if (g.status === "finalizado") { navigate(`/game/${gameId}/placar`); return; }
        if (g.status === "aguardando") { navigate(`/game/${gameId}/lobby`); return; }
        setGame(g);
        let allEntries = await base44.entities.RoundEntry.filter({
          game_id: gameId, sub_round_number: g.current_sub_round,
        });
        allEntries.sort((a, b) => a.player_order - b.player_order);

        const needsCalc = allEntries.some((e) => e.resultado === -1 || e.resultado === undefined);
        if (needsCalc) {
          const tricksWon = g.tricks_won || [];
          const updates = allEntries.map((e) => {
            const resultado = tricksWon[e.player_order] || 0;
            const points = resultado === e.palpite ? 0 : 1;
            return { id: e.id, resultado, points };
          });
          await base44.entities.RoundEntry.bulkUpdate(updates);
          allEntries = allEntries.map((e) => {
            const u = updates.find((u) => u.id === e.id);
            return { ...e, resultado: u.resultado, points: u.points };
          });
        }
        if (cancelled) return;
        setEntries(allEntries);
        setCalcDone(true);
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

  const isHost = game.host_user_id === user?.id;

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
          <div>
            <h1 className="text-2xl font-bold text-white">Sub-rodada {game.current_sub_round}</h1>
            <p className="text-sm text-slate-400">Resultados</p>
          </div>
        </div>

        {calcDone && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-4">
            <h2 className="text-white font-bold mb-3 text-center text-base">Resumo da Sub-rodada</h2>
            <div className="space-y-1">
              {entries.map((entry) => {
                const hit = entry.resultado === entry.palpite;
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-2.5 border-b border-slate-800/50 last:border-0"
                  >
                    <span className="text-white text-sm font-medium">{entry.player_name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 tabular-nums">
                        {entry.palpite} → {entry.resultado}
                      </span>
                      <span className={`text-sm font-bold w-20 text-right ${hit ? "text-green-500" : "text-red-400"}`}>
                        {hit ? "Acertou (0)" : "Errou (+1)"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isHost ? (
          <Button
            onClick={() => navigate(`/game/${gameId}/placar`)}
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold h-12 text-base"
          >
            Ver Placar <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <div className="w-full text-center text-slate-400 text-sm py-4 bg-slate-900/30 border border-slate-800 rounded-xl">
            Aguardando o anfitrião...
          </div>
        )}
      </div>
    </div>
  );
}