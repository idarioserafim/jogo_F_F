import React from "react";
import { Spade } from "lucide-react";
import { suitSymbol } from "@/lib/cards";

export default function CardView({ card, size = "md", disabled, onClick, hidden }) {
  const sizes = {
    sm: "w-10 h-14 text-base",
    md: "w-12 h-16 text-xl",
    lg: "w-16 h-24 text-3xl",
  };
  const sizeClass = sizes[size] || sizes.md;

  if (hidden) {
    return (
      <div className={`${sizeClass} rounded-lg border-2 border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shrink-0`}>
        <Spade className="w-4 h-4 text-slate-600" />
      </div>
    );
  }

  if (!card) {
    return <div className={`${sizeClass} rounded-lg border-2 border-dashed border-slate-800 bg-slate-900/20 shrink-0`} />;
  }

  const isRed = card.suit === "ouro" || card.suit === "copa";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${sizeClass} rounded-lg border-2 flex flex-col items-center justify-center font-bold leading-none shrink-0 transition-all ${
        isRed
          ? "border-red-500/40 text-red-400 bg-gradient-to-br from-red-950 to-red-900/60"
          : "border-slate-600 text-slate-100 bg-gradient-to-br from-slate-800 to-slate-900"
      } ${
        disabled
          ? "opacity-40 cursor-not-allowed"
          : "hover:scale-105 hover:border-amber-500/60 cursor-pointer active:scale-95"
      }`}
    >
      <span>{card.rank}</span>
      <span className="text-lg">{suitSymbol(card.suit)}</span>
    </button>
  );
}