import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spade, Plus, LogIn, History } from "lucide-react";
import { generateRoomCode } from "@/lib/game";

export default function Home() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [name, setName] = useState(user?.full_name || (user?.email ? user.email.split("@")[0] : ""));
  const [code, setCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [showJoin, setShowJoin] = useState(false);

  const createRoom = async () => {
    const playerName = name.trim();
    if (!playerName || !user) return;
    setCreating(true);
    setError("");
    try {
      const roomCode = generateRoomCode();
      const game = await base44.entities.Game.create({
        room_code: roomCode,
        host_user_id: user.id,
        players: [playerName],
        player_user_ids: [user.id],
        abandoned_players: [],
        current_sub_round: 1,
        current_pe_index: 0,
        status: "aguardando",
        cards_per_player: 1,
        tricks_won: [],
      });
      navigate(`/game/${game.id}/lobby`);
    } catch (e) {
      setError("Erro ao criar sala.");
      setCreating(false);
    }
  };

  const joinRoom = async () => {
    const playerName = name.trim();
    const roomCode = code.trim().toUpperCase();
    if (!playerName || !roomCode || !user) return;
    setJoining(true);
    setError("");
    try {
      const games = await base44.entities.Game.filter({ room_code: roomCode });
      if (!games || games.length === 0) {
        setError("Sala não encontrada.");
        setJoining(false);
        return;
      }
      const game = games[0];
      if (game.player_user_ids && game.player_user_ids.includes(user.id)) {
        navigate(`/game/${game.id}/lobby`);
        return;
      }
      if (game.status !== "aguardando") {
        setError("O jogo já começou.");
        setJoining(false);
        return;
      }
      if (game.players.length >= 7) {
        setError("Sala cheia.");
        setJoining(false);
        return;
      }
      await base44.entities.Game.update(game.id, {
        players: [...game.players, playerName],
        player_user_ids: [...(game.player_user_ids || []), user.id],
      });
      navigate(`/game/${game.id}/lobby`);
    } catch (e) {
      setError("Erro ao entrar na sala.");
      setJoining(false);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center app-pad">
        <div className="w-full max-w-md text-center pb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-4">
            <Spade className="w-8 h-8 text-amber-500" fill="currentColor" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Fodinha</h1>
          <p className="text-slate-400 mt-2 mb-8 text-sm">
            Faça login para criar ou entrar em uma sala
          </p>
          <Button
            onClick={() => navigate("/login")}
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold h-12 text-base"
          >
            <LogIn className="w-4 h-4 mr-2" /> Entrar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-slate-950 flex items-center justify-center app-pad"
      style={{ backgroundImage: "radial-gradient(circle at 50% 0%, rgba(245, 158, 11, 0.06), transparent 55%)" }}
    >
      <div className="w-full max-w-md pb-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-4">
            <Spade className="w-8 h-8 text-amber-500" fill="currentColor" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Fodinha</h1>
          <p className="text-slate-400 mt-2 text-sm">Jogue online com seus amigos</p>
        </div>

        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome"
          className="bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-600 h-12"
          maxLength={20}
        />

        <Button
          onClick={createRoom}
          disabled={!name.trim() || creating}
          className="w-full mt-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold h-12 text-base"
        >
          {creating ? "Criando..." : (<><Plus className="w-4 h-4 mr-2" /> Criar Sala</>)}
        </Button>

        {!showJoin ? (
          <button
            onClick={() => setShowJoin(true)}
            className="w-full mt-3 flex items-center justify-center gap-2 text-slate-500 hover:text-amber-500 transition-colors text-sm font-medium"
          >
            <LogIn className="w-4 h-4" /> Entrar com código
          </button>
        ) : (
          <div className="mt-3 space-y-3">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="CÓDIGO"
              className="bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-600 h-12 text-center text-lg font-bold tracking-widest"
              maxLength={4}
            />
            <Button
              onClick={joinRoom}
              disabled={!name.trim() || code.length < 4 || joining}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold h-12"
            >
              {joining ? "Entrando..." : "Entrar na Sala"}
            </Button>
          </div>
        )}

        {error && <p className="text-red-400 text-sm text-center mt-3">{error}</p>}

        <button
          onClick={() => navigate("/historico")}
          className="w-full mt-6 flex items-center justify-center gap-2 text-slate-500 hover:text-amber-500 transition-colors text-sm font-medium"
        >
          <History className="w-4 h-4" /> Histórico de partidas
        </button>
      </div>
    </div>
  );
}