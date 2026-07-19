import React, { useEffect } from "react";
import { LogOut } from "lucide-react";

// Aviso simples que aparece no topo da tela por alguns segundos e some
// sozinho — usado para avisar quando alguém sai da sala.
export default function LeaveToast({ message, onDone }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onDone && onDone(), 4000);
    return () => clearTimeout(t);
  }, [message]);

  if (!message) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 max-w-[92vw]">
      <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 text-slate-200 text-sm px-4 py-2.5 rounded-full shadow-lg">
        <LogOut className="w-4 h-4 text-red-400 shrink-0" />
        <span className="truncate">{message}</span>
      </div>
    </div>
  );
}
