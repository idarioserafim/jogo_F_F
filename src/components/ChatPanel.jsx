import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { chat } from "@/api/gameClient";
import { getPlayerId, getPlayerName } from "@/lib/localPlayer";

export default function ChatPanel({ gameId }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [unread, setUnread] = useState(0);
  const listRef = useRef(null);
  const playerId = getPlayerId();
  const playerName = getPlayerName();

  useEffect(() => {
    if (!gameId) return;
    let cancelled = false;
    chat.join(gameId);
    chat.history(gameId).then((history) => {
      if (!cancelled) setMessages(history || []);
    }).catch(() => {});

    const unsub = chat.subscribe((entry) => {
      if (cancelled) return;
      setMessages((prev) => [...prev, entry]);
      setUnread((u) => (open ? 0 : u + 1));
    });
    return () => { cancelled = true; if (typeof unsub === "function") unsub(); };
  }, [gameId]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [open, messages]);

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed || !gameId) return;
    setText("");
    try {
      await chat.send(gameId, playerId, playerName || "Jogador", trimmed);
    } catch (e) {}
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-lg flex items-center justify-center transition-transform active:scale-95"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-36 right-4 z-40 w-72 max-w-[85vw] h-96 max-h-[60vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/80">
            <p className="text-sm font-semibold text-white">Chat da sala</p>
          </div>
          <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
            {messages.length === 0 && (
              <p className="text-slate-600 text-xs text-center mt-4">Nenhuma mensagem ainda.</p>
            )}
            {messages.map((m) => {
              const mine = m.playerId === playerId;
              return (
                <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                  {!mine && <span className="text-[10px] text-slate-500 px-1">{m.playerName}</span>}
                  <div
                    className={`px-3 py-1.5 rounded-2xl text-sm max-w-[85%] break-words ${
                      mine ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-200"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-2 border-t border-slate-800 flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
              placeholder="Digite algo..."
              maxLength={300}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-full px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-amber-500"
            />
            <button
              onClick={sendMessage}
              disabled={!text.trim()}
              className="w-9 h-9 shrink-0 rounded-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
