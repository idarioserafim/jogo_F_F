import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Trash2, AlertTriangle, LogIn } from "lucide-react";

export default function Configuracoes() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const deleteAccount = async () => {
    setDeleting(true);
    setError("");
    try {
      await base44.entities.User.delete(user.id);
      logout();
    } catch (e) {
      setError("Não foi possível excluir a conta. Contate o suporte da Base44.");
      setDeleting(false);
    }
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

        {isAuthenticated && user ? (
          <div className="space-y-4">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-slate-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">
                    {user.full_name || user.email}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
              </div>
            </div>

            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <h2 className="text-red-300 font-semibold text-sm">Excluir Conta</h2>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                A exclusão da conta é permanente. Todos os dados associados serão removidos.
              </p>
              {!showConfirm ? (
                <Button
                  onClick={() => setShowConfirm(true)}
                  variant="outline"
                  className="w-full border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300 h-10"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir Minha Conta
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-red-300 font-medium text-center">
                    Tem certeza? Esta ação não pode ser desfeita.
                  </p>
                  {error && (
                    <p className="text-xs text-red-400 text-center">{error}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setShowConfirm(false);
                        setError("");
                      }}
                      variant="outline"
                      disabled={deleting}
                      className="flex-1 border-slate-700 text-slate-400 hover:text-white h-10"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={deleteAccount}
                      disabled={deleting}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold h-10"
                    >
                      {deleting ? "Excluindo..." : "Sim, excluir"}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={() => logout()}
              variant="outline"
              className="w-full border-slate-700 text-slate-400 hover:text-white h-10"
            >
              Sair da Conta
            </Button>
          </div>
        ) : (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center">
            <User className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm mb-4">
              Você não está logado. Faça login para gerenciar sua conta.
            </p>
            <Button
              onClick={() => navigate("/login")}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold h-10"
            >
              <LogIn className="w-4 h-4 mr-2" /> Entrar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}