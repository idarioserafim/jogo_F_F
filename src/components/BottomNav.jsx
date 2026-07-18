import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, History, Settings } from "lucide-react";

export default function BottomNav() {
  const location = useLocation();
  const pathname = location.pathname;

  const authRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];
  if (authRoutes.some((r) => pathname.startsWith(r))) return null;

  const isGameRoute = pathname.startsWith("/game/");
  const tabs = [
    { to: "/", icon: Home, label: "Início", active: pathname === "/" || isGameRoute },
    { to: "/historico", icon: History, label: "Histórico", active: pathname === "/historico" },
    { to: "/configuracoes", icon: Settings, label: "Config", active: pathname === "/configuracoes" },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="app-pad-sm">
        <div className="flex items-center justify-around py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={`flex flex-col items-center gap-1 px-4 py-1 transition-colors ${
                  tab.active ? "text-amber-500" : "text-slate-500"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}