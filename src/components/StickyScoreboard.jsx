import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Crown } from "lucide-react";

export default function StickyScoreboard() {
  const location = useLocation();
  const match = location.pathname.match(/^\/game\/([^/]+)/);
  const gameId = match ? match[1] : null;

  const [game, setGame] = useState(null);
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    if (!gameId) {
      setGame(null);
      setEntries([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const g = await base44.entities.Game.get(gameId);
        if (cancelled) return;
        if (!g) {
          setGame(null);
          return;
        }
        setGame(g);
        const all = await base44.entities.RoundEntry.filter({ game_id: gameId });
        if (cancelled) return;
        setEntries(all);
      } catch (e) {
        // ignore
      }
    };
    load();

    const unsubEntries = base44.entities.RoundEntry.subscribe(() => {
      if (cancelled) return;
      base44.entities.RoundEntry
        .filter({ game_id: gameId })
        .then((all) => { if (!cancelled) setEntries(all); })
        .catch(() => {});
    });
    const unsubGame = base44.entities.Game.subscribe((event) => {
      if (cancelled) return;
      if (event.data && event.data.id === gameId) {
        if (event.type === "delete") {
          setGame(null);
        } else {
          setGame(event.data);
        }
      }
    });

    return () => {
      cancelled = true;
      if (typeof unsubEntries === "function") unsubEntries();
      if (typeof unsubGame === "function") unsubGame();
    };
  }, [gameId]);

  if (!game) return null;

  const abandoned = game.abandoned_players || [];
  const standings = game.players.map((name, index) => {
    const playerEntries = entries.filter((e) => e.player_order === index);
    const totalPoints = playerEntries.reduce((sum, e) => sum + (e.points || 0), 0);
    return { name, totalPoints, isAbandoned: abandoned.includes(name) };
  });
  const activePoints = standings.filter((p) => !p.isAbandoned).map((p) => p.totalPoints);
  const minPoints = activePoints.length > 0 ? Math.min(...activePoints) : 0;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="app-pad-sm overflow-x-auto no-scrollbar">
        <div className="flex gap-2 py-2 px-1 min-w-max">
          {standings.map((player, i) => {
            const isLeader = !player.isAbandoned && player.totalPoints === minPoints;
            return (
              <div
                key={i}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm whitespace-nowrap ${
                  player.isAbandoned
                    ? "bg-slate-800/30 border-slate-700/30 opacity-50"
                    : isLeader
                    ? "bg-amber-500/15 border-amber-500/50"
                    : "bg-slate-800/50 border-slate-700"
                }`}
              >
                {isLeader && <Crown className="w-3 h-3 text-amber-500 shrink-0" />}
                <span className={`font-medium truncate max-w-20 ${player.isAbandoned ? "text-slate-500 line-through" : "text-slate-200"}`}>
                  {player.name}
                </span>
                <span className={`font-bold tabular-nums ${player.isAbandoned ? "text-slate-600" : isLeader ? "text-amber-400" : "text-white"}`}>
                  {player.totalPoints}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}