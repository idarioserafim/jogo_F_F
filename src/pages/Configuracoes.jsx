import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, User, Trash2, AlertTriangle, Check } from "lucide-react";
import { getPlayerName, setPlayerName } from "@/lib/localPlayer";

export default function Configuracoes() {
  const navigate = useNavigate();
  const [name, setName] = useState(getPlayerName());
  const [saved, setSaved] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const saveName = () => {
    setPlayerName(name.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const clearDeviceData = () => {
    window.localStorage.removeItem("fofo_player_id");
    window.localStorage.removeItem("fofo_player_name");
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-slate-950 app-pad">
      <div className="max-w-md mx-auto pb-16">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate("/")}
            className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-white">Configurações</h1>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-slate-400" />
              <h2 className="text-white font-semibold text-sm">Seu nome</h2>
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                maxLength={20}
                className="bg-slate-950 border-slate-700 text-white h-11"
              />
              <Button
                onClick={saveName}
                disabled={!name.trim()}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold h-11 shrink-0"
              >
                {saved ? <Check className="w-4 h-4" /> : "Salvar"}
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Esse nome é usado quando você cria ou entra em uma sala.
            </p>
          </div>

          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <h2 className="text-red-300 font-semibold text-sm">Esquecer este dispositivo</h2>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Remove seu nome e identificador salvos neste navegador. Não apaga o histórico de partidas.
            </p>
            {!showConfirm ? (
              <Button
                onClick={() => setShowConfirm(true)}
                variant="outline"
                className="w-full border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300 h-10"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Esquecer Dispositivo
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-red-300 font-medium text-center">
                  Tem certeza? Você vai virar um jogador novo neste navegador.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowConfirm(false)}
                    variant="outline"
                    className="flex-1 border-slate-700 text-slate-400 hover:text-white h-10"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={clearDeviceData}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold h-10"
                  >
                    Sim, esquecer
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
