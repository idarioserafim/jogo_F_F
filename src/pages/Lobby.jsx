import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "@/api/gameClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Copy, Check, Users, Play } from "lucide-react";
import { dealRound, leaveLobby, calcCardsPerPlayer, findRemovedLobbyPlayers } from "@/lib/game";
import { getPlayerId } from "@/lib/localPlayer";
import LeaveToast from "@/components/LeaveToast";

export default function Lobby() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const playerId = getPlayerId();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [cardsWarning, setCardsWarning] = useState("");
  const [leaveToast, setLeaveToast] = useState("");
  const gameRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const g = await db.entities.Game.get(gameId);
        if (cancelled) return;
        if (g.status !== "aguardando") {
          navigate(`/game/${gameId}/${g.status}`);
          return;
        }
        gameRef.current = g;
        setGame(g);
      } catch (e) {}
      if (!cancelled) setLoading(false);
    };
    load();
    const unsub = db.entities.Game.subscribe((event) => {
      if (cancelled || !event.data || event.data.id !== gameId) return;
      const removed = findRemovedLobbyPlayers(gameRef.current, event.data);
      if (removed.length > 0) {
        setLeaveToast(`${removed.join(", ")} saiu da sala.`);
      }
      gameRef.current = event.data;
      setGame(event.data);
      if (event.data.status !== "aguardando") {
        navigate(`/game/${gameId}/${event.data.status}`);
      }
    });
    return () => { cancelled = true; if (typeof unsub === "function") unsub(); };
  }, [gameId]);

  const isHost = game && game.host_user_id === playerId;

  // Se a quantidade de jogadores mudar (alguém entrou/saiu) e o valor
  // escolhido de cartas por rodada não couber mais, ajusta sozinho e avisa.
  useEffect(() => {
    if (!game || !isHost) return;
    const max = calcCardsPerPlayer(game.players.length);
    if (game.cards_per_player && game.cards_per_player > max) {
      db.entities.Game.update(gameId, { cards_per_player: max }).catch(() => {});
      setCardsWarning(`A quantidade de jogadores mudou — o máximo agora é ${max} carta${max !== 1 ? "s" : ""}. Ajustei automaticamente.`);
    }
  }, [game?.players?.length, isHost]);

  const copyCode = () => {
    if (navigator.clipboard && game) {
      navigator.clipboard.writeText(game.room_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const startGame = async () => {
    if (!game) return;
    setStarting(true);
    try {
      await dealRound(gameId, game, playerId);
    } catch (e) {
      setStarting(false);
    }
  };

  const leaveRoom = async () => {
    if (!game) return;
    setLeaving(true);
    try {
      await leaveLobby(gameId, game, playerId);
    } catch (e) {}
    navigate("/");
  };

  const changeCardsPerPlayer = async (delta) => {
    if (!game) return;
    const max = calcCardsPerPlayer(game.players.length);
    const current = game.cards_per_player || max;
    let next = current + delta;
    let warning = "";
    if (next > max) {
      next = max;
      warning = `O máximo com ${game.players.length} jogador${game.players.length !== 1 ? "es" : ""} é ${max} carta${max !== 1 ? "s" : ""}.`;
    } else if (next < 1) {
      next = 1;
      warning = "O mínimo é 1 carta.";
    }
    setCardsWarning(warning);
    try {
      await db.entities.Game.update(gameId, { cards_per_player: next });
    } catch (e) {}
  };

  const setCardsPerPlayerValue = async (raw) => {
    if (!game) return;
    const max = calcCardsPerPlayer(game.players.length);
    let next = parseInt(raw, 10);
    let warning = "";
    if (isNaN(next)) return;
    if (next > max) {
      warning = `O máximo com ${game.players.length} jogador${game.players.length !== 1 ? "es" : ""} é ${max} carta${max !== 1 ? "s" : ""}. Ajustei pra ${max}.`;
      next = max;
    } else if (next < 1) {
      warning = "O mínimo é 1 carta. Ajustei pra 1.";
      next = 1;
    }
    setCardsWarning(warning);
    try {
      await db.entities.Game.update(gameId, { cards_per_player: next });
    } catch (e) {}
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
        <p className="text-slate-400">Sala não encontrada.</p>
        <Button onClick={() => navigate("/")} variant="outline" className="border-slate-800 text-slate-300">Voltar</Button>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-slate-950 app-pad"
      style={{ backgroundImage: "radial-gradient(circle at 50% 0%, rgba(245, 158, 11, 0.06), transparent 55%)" }}
    >
      <LeaveToast message={leaveToast} onDone={() => setLeaveToast("")} />
      <div className="max-w-md mx-auto pt-10 pb-16">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate("/")} className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-white">Sala de Espera</h1>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-6 text-center">
          <p className="text-sm text-slate-400 mb-2">Código da Sala</p>
          <button onClick={copyCode} className="text-4xl font-bold text-amber-500 tracking-[0.3em] mb-2 hover:opacity-80 transition-opacity">
            {game.room_code}
          </button>
          <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
            {copied ? (<><Check className="w-3 h-3" /> Copiado!</>) : (<><Copy className="w-3 h-3" /> Toque para copiar</>)}
          </p>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Jogadores ({game.players.length})
            </h2>
          </div>
          <div className="space-y-2">
            {game.players.map((name, i) => (
              <div key={i} className="flex items-center gap-3 bg-slate-900/50 border border-slate-800 rounded-xl p-3">
                <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold text-sm shrink-0">
                  {i + 1}
                </div>
                <span className="text-white font-medium flex-1 truncate">{name}</span>
                {(game.player_user_ids || [])[i] === game.host_user_id && (
                  <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full font-bold uppercase shrink-0">
                    Anfitrião
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6 bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Cartas por rodada</p>
          {isHost ? (
            <>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => changeCardsPerPlayer(-1)}
                  className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-white text-xl font-bold flex items-center justify-center transition-colors shrink-0"
                >
                  −
                </button>
                <Input
                  type="number"
                  min={1}
                  max={calcCardsPerPlayer(game.players.length)}
                  value={game.cards_per_player || calcCardsPerPlayer(game.players.length)}
                  onChange={(e) => setCardsPerPlayerValue(e.target.value)}
                  className="w-16 text-3xl font-bold text-amber-500 text-center tabular-nums bg-slate-950 border-slate-700 h-12"
                />
                <button
                  onClick={() => changeCardsPerPlayer(1)}
                  className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-white text-xl font-bold flex items-center justify-center transition-colors shrink-0"
                >
                  +
                </button>
              </div>
              <p className="text-xs text-slate-500 text-center mt-2">
                Máximo com {game.players.length} jogador{game.players.length !== 1 ? "es" : ""}: {calcCardsPerPlayer(game.players.length)}
              </p>
              {cardsWarning && (
                <p className="text-xs text-amber-400 text-center mt-2">{cardsWarning}</p>
              )}
            </>
          ) : (
            <p className="text-2xl font-bold text-amber-500 text-center">
              {game.cards_per_player || calcCardsPerPlayer(game.players.length)}
            </p>
          )}
        </div>

        {isHost ? (
          <>
            <Button
              onClick={startGame}
              disabled={game.players.length < 2 || starting}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold h-12 text-base"
            >
              <Play className="w-4 h-4 mr-2" /> {starting ? "Iniciando..." : "Iniciar Jogo"}
            </Button>
            {game.players.length < 2 && (
              <p className="text-xs text-slate-500 text-center mt-3">Mínimo de 2 jogadores</p>
            )}
          </>
        ) : (
          <div className="w-full text-center text-slate-400 text-sm py-4 bg-slate-900/30 border border-slate-800 rounded-xl">
            Aguardando o anfitrião iniciar o jogo...
          </div>
        )}

        <button
          onClick={leaveRoom}
          disabled={leaving}
          className="w-full mt-3 text-center text-slate-500 hover:text-red-400 text-sm py-2 transition-colors"
        >
          {leaving ? "Saindo..." : "Sair da sala"}
        </button>
      </div>
    </div>
  );
}