// Peças visuais tiradas do Sci-fi UI Kit (Free) (Community) do Figma.
// Os PNGs em src/assets/kit/ foram recortados do próprio kit; os quadros que precisam
// de texto dinâmico (DANGER, contadores -03, barras do HUD Pack) foram redesenhados em SVG/CSS.

import type { CSSProperties, ReactNode } from "react";
import iconSettings from "../assets/kit/settings.png";
import iconVolume from "../assets/kit/full-volume.png";
import iconMute from "../assets/kit/mute-volume.png";
import iconWarn from "../assets/kit/warning-filled.png";
import iconCheck from "../assets/kit/check.png";
import iconClose from "../assets/kit/close.png";
import iconTower from "../assets/kit/cell-tower-2.png";
import iconRight from "../assets/kit/arrow-right-01.png";
import caution from "../assets/kit/caution.png";

export const KIT_ICONS = {
  settings: iconSettings,
  volume: iconVolume,
  mute: iconMute,
  warn: iconWarn,
  check: iconCheck,
  close: iconClose,
  tower: iconTower,
  right: iconRight,
};

/** Ícone do kit (branco em PNG) usado como máscara: assim ele pega a cor do texto. */
export function KitIcon({ name, size = 20, className = "" }: { name: keyof typeof KIT_ICONS; size?: number; className?: string }) {
  const url = `url(${KIT_ICONS[name]})`;
  return <i aria-hidden className={`kicon ${className}`} style={{ width: size, height: size, WebkitMaskImage: url, maskImage: url } as CSSProperties} />;
}

/** Decoração do kit tingida pela cor atual (máscara). */
export function KitArt({ src, className = "", style }: { src: string; className?: string; style?: CSSProperties }) {
  const url = `url(${src})`;
  return <i aria-hidden className={`kart ${className}`} style={{ WebkitMaskImage: url, maskImage: url, ...style } as CSSProperties} />;
}

/** Rótulo com faixas de risco nos dois lados, como o "<DANGER>" do Button Pack 02. */
export function HazardLabel({ children, tone = "red", as: Tag = "h2" }: { children: ReactNode; tone?: "red" | "amber" | "cyan"; as?: "h2" | "h3" | "div" }) {
  return (
    <Tag className={`hazard-label tone-${tone}`}>
      <span className="hz" aria-hidden />
      <span className="hz-text">&lt;{children}&gt;</span>
      <span className="hz" aria-hidden />
    </Tag>
  );
}

/** Par de traços (branco + vermelho) nos cantos, como na tela MECH - SCREEN. */
export function CornerSlashes({ big = false }: { big?: boolean }) {
  return (
    <div className={`corner-slashes ${big ? "big" : ""}`} aria-hidden>
      <i className="tl" />
      <i className="tr" />
      <i className="bl" />
      <i className="br" />
    </div>
  );
}

/** Contadores em caixas, como o "◂ -03 -03 -03 ▸" do kit. */
export function SegBoxes({ values, label }: { values: { v: string; filled?: boolean; sub?: string }[]; label?: string }) {
  return (
    <div className="seg" role={label ? "group" : undefined} aria-label={label}>
      <span className="seg-arrow">◂</span>
      {values.map((b, i) => (
        <span key={i} className={`seg-box ${b.filled ? "filled" : ""}`}>
          {b.sub && <small>{b.sub}</small>}
          {b.v}
        </span>
      ))}
      <span className="seg-arrow">▸</span>
    </div>
  );
}

/** Barra do HUD Pack v1 ("Charging 84 ⚡"): moldura angulada com preenchimento. */
export function HudBar({ value, label, unit, pct, warn, icon }: { value: string; label: string; unit: string; pct: number; warn?: boolean; icon?: ReactNode }) {
  return (
    <div className={`hud-bar ${warn ? "warn" : ""}`}>
      <span className="hb-fill">
        <i style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
      </span>
      <span className="hb-text">
        {label} <b>{value}</b>
        <em>{unit}</em>
        {icon}
      </span>
    </div>
  );
}

/** Tag do kit: canto com ponto, sublinhado pontilhado e seta. */
export function KitTag({ children, tone, arrow = true }: { children: ReactNode; tone: "cyan" | "amber" | "red" | "grey"; arrow?: boolean }) {
  return (
    <span className={`kit-tag tone-${tone} ${arrow ? "" : "no-arrow"}`}>
      {children}
      {arrow && <KitIcon name="right" size={14} />}
    </span>
  );
}

/** Quadro [DANGER] do kit, redesenhado em SVG para levar texto e cronômetro de verdade. */
export function DangerFrame({ title, time }: { title: string; time: string }) {
  return (
    <div className="danger-frame">
      <div className="df-time">◂ [{time}] ▸</div>
      <svg viewBox="0 0 340 170" aria-hidden>
        <defs>
          <pattern id="df-stripes" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="11" height="22" fill="#5a1717" />
          </pattern>
        </defs>
        <rect x="40" y="0" width="290" height="160" fill="url(#df-stripes)" opacity="0.75" />
        <path d="M6 36 V120 L14 128 V44 Z M334 36 V120 L326 128 V44 Z" fill="#8a8a8a" />
        <path className="df-body" d="M22 18 H48 L60 30 H280 L292 18 H318 V52 L306 64 V100 L318 112 V146 H292 L280 134 H60 L48 146 H22 V112 L34 100 V64 L22 52 Z" />
        <rect x="52" y="44" width="236" height="76" fill="#140606" />
        <path d="M170 56 L196 104 H144 Z" fill="#7a1c1c" opacity="0.9" />
        <path d="M70 152 H270 L262 162 H78 Z" fill="#9a9a9a" opacity="0.8" />
        <text x="41" y="82" className="df-side" transform="rotate(90 41 82)">▲ ERRO ▲</text>
        <path d="M268 4 l14 -14 M284 4 l14 -14" transform="translate(10 14)" stroke="#fff" strokeWidth="4" />
        <path d="M300 4 l14 -14" transform="translate(10 14)" stroke="#ca3535" strokeWidth="4" />
        <path d="M0 0 l16 16 M18 0 l16 16" transform="translate(40 158) scale(.9)" stroke="#fff" strokeWidth="4" />
      </svg>
      <strong className="df-title" data-text={title}>
        [{title}]
      </strong>
    </div>
  );
}

export function CautionEmblem({ left, right, marquee }: { left: ReactNode; right: ReactNode; marquee: string }) {
  return (
    <div className="caution">
      <img src={caution} alt="" />
      <div className="caution-captions">
        <span className="c-left">{left}</span>
        <span className="c-right">{right}</span>
      </div>
      <div className="caution-marquee">
        <span>
          {marquee} {marquee} {marquee} {marquee} {marquee} {marquee}
        </span>
      </div>
    </div>
  );
}
