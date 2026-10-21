import { BATTERY_LOW_V, RTT_LIMIT_MS } from "../config";
import type { Robot } from "../hooks/useRobot";
import { KitIcon, KitTag } from "./Kit";

export type View = "preflight" | "pilot" | "telemetry";

export function linkLabel(robot: Robot) {
  if (robot.state === "conectado") return robot.stale ? "instável" : "conectado";
  if (robot.state === "conectando") return robot.everConnected ? "reconectando" : "conectando";
  return "sem conexão";
}

/** "sem conexão" → "sem-conexao": classe CSS sem acento. */
export const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-");

const fmt = (v: number | null, d = 0) => (v == null ? "--" : v.toFixed(d).replace(".", ","));

function Metric({ label, value, unit, warn, children }: { label: string; value: string; unit: string; warn?: boolean; children?: React.ReactNode }) {
  return (
    <div className={`metric ${warn ? "warn" : ""}`}>
      <small>[{label}]</small>
      <strong>
        {children}
        {value}
        <em>{unit}</em>
      </strong>
    </div>
  );
}

const TONE = { conectado: "cyan", instável: "amber", conectando: "amber", reconectando: "amber", "sem conexão": "red" } as const;

export function StatusBar({ robot, view, setView, simulate }: { robot: Robot; view: View; setView: (v: View) => void; simulate: boolean }) {
  const t = robot.telem;
  const label = linkLabel(robot);
  const batPct = t.bat == null ? 0 : ((t.bat - 6.4) / (8.4 - 6.4)) * 100;
  return (
    <header className="status-bar">
      {/* Moldura do "LOGO" da Navigation Bar do kit, com a trilha de circuito */}
      <div className="brand">
        <svg className="brand-frame" viewBox="0 0 220 64" preserveAspectRatio="none" aria-hidden>
          <path d="M1 22 L14 9 H150 L164 1 H200" />
          <circle cx="203" cy="1.5" r="2.6" />
          <path d="M1 22 V56 H130" />
        </svg>
        <span className="brand-mark" data-augmented-ui="tl-clip br-clip">B4</span>
        <div>
          <b>BALLOONE</b>
          <small>GRUPO 4{simulate ? " · SIMULADOR" : ""}</small>
        </div>
      </div>

      <div className={`link-state ${slug(label)}`} role="status" aria-live="polite">
        <KitTag tone={TONE[label]}>
          <i className="dot" />
          {label.toUpperCase()}
        </KitTag>
      </div>

      <div className={`metrics ${robot.state === "conectado" ? "" : "dim"}`} title={robot.state === "conectado" ? undefined : "Últimos valores recebidos antes da queda"}>
        <Metric label="RTT" value={fmt(t.rtt)} unit="ms" warn={t.rtt != null && t.rtt > RTT_LIMIT_MS} />
        <Metric label="VÍDEO" value={fmt(t.fps)} unit="fps" warn={t.fps != null && t.fps < 10} />
        <Metric label="BATERIA" value={fmt(t.bat, 2)} unit="V" warn={t.bat != null && t.bat < BATTERY_LOW_V}>
          <span className="cells" aria-hidden>
            {Array.from({ length: 8 }, (_, i) => (
              <i key={i} className={i < Math.round((Math.max(0, Math.min(100, batPct)) / 100) * 8) ? "on" : ""} />
            ))}
          </span>
        </Metric>
        <Metric label="WI-FI" value={fmt(t.rssi)} unit="dBm" warn={t.rssi != null && t.rssi < -75}>
          <KitIcon name="tower" size={20} />
        </Metric>
        <Metric label="PERDA" value={fmt(robot.loss)} unit="%" warn={robot.loss > 5} />
      </div>

      {view !== "preflight" && (
        <nav className="app-nav" aria-label="Telas">
          {(
            [
              ["pilot", "PILOTAGEM"],
              ["telemetry", "TELEMETRIA"],
              ["preflight", "AUTOTESTE"],
            ] as const
          ).map(([v, name]) => (
            <button key={v} className={view === v ? "active" : ""} aria-current={view === v ? "page" : undefined} onClick={() => setView(v)}>
              {name}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}
