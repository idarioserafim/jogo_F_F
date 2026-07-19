import React from "react";
import { suitSymbol } from "@/lib/cards";

const sizes = {
  sm: { className: "w-10 h-14", corner: 9, pip: 12, face: 20 },
  md: { className: "w-12 h-16", corner: 10, pip: 14, face: 24 },
  lg: { className: "w-[4.5rem] h-[6.5rem]", corner: 13, pip: 18, face: 32 },
};

// Layout dos naipes no centro da carta (estilo baralho tradicional),
// em coordenadas de um viewBox 0 0 100 140. `rotate` vira o naipe de
// cabeça para baixo, como nas cartas de verdade.
const PIP_LAYOUTS = {
  2: [{ x: 50, y: 34 }, { x: 50, y: 106, rotate: true }],
  3: [{ x: 50, y: 28 }, { x: 50, y: 70 }, { x: 50, y: 112, rotate: true }],
  4: [
    { x: 34, y: 34 }, { x: 66, y: 34 },
    { x: 34, y: 106, rotate: true }, { x: 66, y: 106, rotate: true },
  ],
  5: [
    { x: 34, y: 32 }, { x: 66, y: 32 },
    { x: 50, y: 70 },
    { x: 34, y: 108, rotate: true }, { x: 66, y: 108, rotate: true },
  ],
  6: [
    { x: 34, y: 28 }, { x: 66, y: 28 },
    { x: 34, y: 70 }, { x: 66, y: 70 },
    { x: 34, y: 112, rotate: true }, { x: 66, y: 112, rotate: true },
  ],
  7: [
    { x: 34, y: 24 }, { x: 66, y: 24 },
    { x: 50, y: 42 },
    { x: 34, y: 70 }, { x: 66, y: 70 },
    { x: 34, y: 116, rotate: true }, { x: 66, y: 116, rotate: true },
  ],
};

const FACE_RANKS = { J: "J", Q: "Q", K: "K" };
const RED = "#d21b2c";
const BLACK = "#0b0b0d";

function CardBack({ sizeClass }) {
  return (
    <div
      className={`${sizeClass} rounded-lg border-2 border-slate-200 shrink-0 shadow-sm`}
      style={{
        backgroundColor: "#1d4ed8",
        backgroundImage:
          "repeating-linear-gradient(45deg, rgba(255,255,255,0.14) 0px, rgba(255,255,255,0.14) 2px, transparent 2px, transparent 8px)," +
          "repeating-linear-gradient(-45deg, rgba(255,255,255,0.14) 0px, rgba(255,255,255,0.14) 2px, transparent 2px, transparent 8px)",
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
  const fill = isRed ? RED : BLACK;
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
      // backgroundColor inline garante branco sólido mesmo se algum CSS do
      // app tentar sobrescrever a classe (ex.: cache antigo no celular).
      style={{ backgroundColor: "#ffffff" }}
      className={`${s.className} rounded-lg border border-slate-300 shrink-0 relative overflow-hidden transition-all shadow-md ${
        disabled ? "opacity-50 cursor-not-allowed" : "hover:scale-105 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer active:scale-95"
      }`}
    >
      <svg viewBox="0 0 100 140" className="w-full h-full absolute inset-0" preserveAspectRatio="xMidYMid meet">
        {/* Moldura fina, como nas cartas de baralho de verdade */}
        <rect x={3} y={3} width={94} height={134} rx={7} fill="none" stroke="#d4d4d8" strokeWidth={1.5} />

        {/* Índice canto superior-esquerdo */}
        <text x={11} y={s.corner + 9} textAnchor="start" fontSize={s.corner * 1.7} fontWeight="700" fill={fill}>
          {rank}
        </text>
        <text x={12} y={s.corner * 2 + 13} textAnchor="start" fontSize={s.corner * 1.5} fill={fill}>
          {symbol}
        </text>

        {/* Índice canto inferior-direito (de cabeça para baixo) */}
        <g transform="rotate(180 90 130)">
          <text x={11} y={s.corner + 9} textAnchor="start" fontSize={s.corner * 1.7} fontWeight="700" fill={fill}>
            {rank}
          </text>
          <text x={12} y={s.corner * 2 + 13} textAnchor="start" fontSize={s.corner * 1.5} fill={fill}>
            {symbol}
          </text>
        </g>

        {/* Conteúdo central */}
        {isAce && (
          <text x={50} y={78} textAnchor="middle" dominantBaseline="middle" fontSize={s.face + 16} fill={fill}>
            {symbol}
          </text>
        )}

        {isFace && (
          <>
            <rect x={20} y={16} width={60} height={108} rx={5} fill="none" stroke={fill} strokeWidth={1.5} />
            <rect x={24} y={20} width={52} height={100} rx={3} fill="none" stroke={fill} strokeWidth={0.75} />
            <text x={50} y={70} textAnchor="middle" dominantBaseline="middle" fontSize={s.face + 6} fontWeight="700" fill={fill} fontFamily="Georgia, 'Times New Roman', serif">
              {rank}
            </text>
            <text x={50} y={34} textAnchor="middle" dominantBaseline="middle" fontSize={s.pip} fill={fill}>
              {symbol}
            </text>
            <g transform="rotate(180 50 70)">
              <text x={50} y={34} textAnchor="middle" dominantBaseline="middle" fontSize={s.pip} fill={fill}>
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
            fill={fill}
            transform={p.rotate ? `rotate(180 ${p.x} ${p.y})` : undefined}
          >
            {symbol}
          </text>
        ))}
      </svg>
    </button>
  );
}
