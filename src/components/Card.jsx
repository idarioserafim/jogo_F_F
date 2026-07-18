import React from "react";
import { suitSymbol } from "@/lib/cards";

const sizes = {
  sm: { className: "w-10 h-14", corner: 9, pip: 13, face: 22 },
  md: { className: "w-12 h-16", corner: 10, pip: 15, face: 26 },
  lg: { className: "w-[4.5rem] h-[6.5rem]", corner: 13, pip: 19, face: 34 },
};

// Layout dos naipes no centro da carta (estilo baralho tradicional),
// em coordenadas de um viewBox 0 0 100 140. `rotate` vira o naipe de
// cabeça para baixo, como nas cartas de verdade.
const PIP_LAYOUTS = {
  2: [{ x: 50, y: 32 }, { x: 50, y: 108, rotate: true }],
  3: [{ x: 50, y: 26 }, { x: 50, y: 70 }, { x: 50, y: 114, rotate: true }],
  4: [
    { x: 32, y: 32 }, { x: 68, y: 32 },
    { x: 32, y: 108, rotate: true }, { x: 68, y: 108, rotate: true },
  ],
  5: [
    { x: 32, y: 30 }, { x: 68, y: 30 },
    { x: 50, y: 70 },
    { x: 32, y: 110, rotate: true }, { x: 68, y: 110, rotate: true },
  ],
  6: [
    { x: 32, y: 26 }, { x: 68, y: 26 },
    { x: 32, y: 70 }, { x: 68, y: 70 },
    { x: 32, y: 114, rotate: true }, { x: 68, y: 114, rotate: true },
  ],
  7: [
    { x: 32, y: 22 }, { x: 68, y: 22 },
    { x: 50, y: 40 },
    { x: 32, y: 70 }, { x: 68, y: 70 },
    { x: 32, y: 118, rotate: true }, { x: 68, y: 118, rotate: true },
  ],
};

const FACE_RANKS = { J: "J", Q: "Q", K: "K" };

function CardBack({ sizeClass }) {
  return (
    <div
      className={`${sizeClass} rounded-lg border-2 border-slate-300 shrink-0 shadow-sm`}
      style={{
        backgroundColor: "#1d4ed8",
        backgroundImage:
          "repeating-linear-gradient(45deg, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.12) 2px, transparent 2px, transparent 8px)," +
          "repeating-linear-gradient(-45deg, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.12) 2px, transparent 2px, transparent 8px)",
      }}
    />
  );
}

function CardEmpty({ sizeClass }) {
  return <div className={`${sizeClass} rounded-lg border-2 border-dashed border-slate-300/40 bg-transparent shrink-0`} />;
}

export default function CardView({ card, size = "md", disabled, onClick, hidden }) {
  const s = sizes[size] || sizes.md;

  if (hidden) return <CardBack sizeClass={s.className} />;
  if (!card) return <CardEmpty sizeClass={s.className} />;

  const isRed = card.suit === "ouro" || card.suit === "copa";
  const colorClass = isRed ? "fill-red-600" : "fill-slate-900";
  const symbol = suitSymbol(card.suit);
  const rank = card.rank;
  const isFace = !!FACE_RANKS[rank];
  const isAce = rank === "A";
  const pips = !isFace && !isAce ? PIP_LAYOUTS[rank] : null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${s.className} rounded-lg border border-slate-300 bg-white shrink-0 relative overflow-hidden transition-all shadow-sm ${
        disabled ? "opacity-50 cursor-not-allowed" : "hover:scale-105 hover:shadow-md hover:-translate-y-0.5 cursor-pointer active:scale-95"
      }`}
    >
      <svg viewBox="0 0 100 140" className="w-full h-full absolute inset-0">
        {/* Índice canto superior-esquerdo */}
        <text x={10} y={s.corner + 8} textAnchor="start" fontSize={s.corner * 1.6} fontWeight="700" className={colorClass}>
          {rank}
        </text>
        <text x={10} y={s.corner * 2 + 12} textAnchor="start" fontSize={s.corner * 1.4} className={colorClass}>
          {symbol}
        </text>

        {/* Índice canto inferior-direito (de cabeça para baixo) */}
        <g transform="rotate(180 90 130)">
          <text x={10} y={s.corner + 8} textAnchor="start" fontSize={s.corner * 1.6} fontWeight="700" className={colorClass}>
            {rank}
          </text>
          <text x={10} y={s.corner * 2 + 12} textAnchor="start" fontSize={s.corner * 1.4} className={colorClass}>
            {symbol}
          </text>
        </g>

        {/* Conteúdo central */}
        {isAce && (
          <text x={50} y={78} textAnchor="middle" dominantBaseline="middle" fontSize={s.face + 14} className={colorClass}>
            {symbol}
          </text>
        )}

        {isFace && (
          <>
            <rect x={22} y={26} width={56} height={88} rx={6} className={isRed ? "fill-none stroke-red-500" : "fill-none stroke-slate-700"} strokeWidth={2} />
            <text x={50} y={78} textAnchor="middle" dominantBaseline="middle" fontSize={s.face} fontWeight="700" className={colorClass}>
              {rank}
            </text>
            <text x={50} y={44} textAnchor="middle" dominantBaseline="middle" fontSize={s.pip} className={colorClass}>
              {symbol}
            </text>
            <g transform="rotate(180 50 70)">
              <text x={50} y={44} textAnchor="middle" dominantBaseline="middle" fontSize={s.pip} className={colorClass}>
                {symbol}
              </text>
            </g>
          </>
        )}

        {pips && pips.map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={s.pip}
            className={colorClass}
            transform={p.rotate ? `rotate(180 ${p.x} ${p.y})` : undefined}
          >
            {symbol}
          </text>
        ))}
      </svg>
    </button>
  );
}
