import { useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import triangles from "../assets/kit/triangles.png";
import { HazardLabel, KitArt } from "./Kit";
import { BATTERY_LOW_V, RTT_LIMIT_MS } from "../config";
import { median, percentile, type Robot } from "../hooks/useRobot";

type ChartProps = { title: string; note: string; values: (number | null)[]; unit: string; min: number; max: number; decimals?: number; limit?: { v: number; label: string }; tone: "cyan" | "violet" | "amber" | "teal" };

/** Uma série por gráfico (sem eixo duplo), linha de 2 px, linha de limite tracejada e leitura no hover. */
function Chart({ title, note, values, unit, min, max, decimals = 0, limit, tone }: ChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const n = values.length;
  const y = (v: number) => 100 - ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * 100;
  const x = (i: number) => (n <= 1 ? 100 : (i / (n - 1)) * 100);
  const path = values
    .map((v, i) => (v == null ? null : `${x(i).toFixed(2)},${y(v).toFixed(2)}`))
    .filter(Boolean)
    .join(" ");
  const last = [...values].reverse().find((v) => v != null) ?? null;
  const shown = hover != null ? values[hover] : last;
  const fmt = (v: number | null) => (v == null ? "--" : v.toFixed(decimals).replace(".", ","));

  return (
    <article className={`chart tone-${tone}`} data-augmented-ui="tl-clip br-clip border">
      <header>
        <h3>{title}</h3>
        <small>{note}</small>
      </header>
      <div className="readout">
        {fmt(shown)}
        <small>{unit}</small>
        {hover != null && <em>{Math.round((n - 1 - hover) / 2)} s atrás</em>}
      </div>
      <div
        className="plot"
        ref={box}
        onMouseMove={(e) => {
          const r = box.current!.getBoundingClientRect();
          setHover(n ? Math.round(((e.clientX - r.left) / r.width) * (n - 1)) : null);
        }}
        onMouseLeave={() => setHover(null)}
      >
        <span className="axis top">{max}</span>
        <span className="axis bottom">{min}</span>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`${title}: último valor ${fmt(last)} ${unit}`}>
          <path className="grid" d="M0 25H100M0 50H100M0 75H100" />
          {limit && <path className="limit" d={`M0 ${y(limit.v)}H100`} />}
          {path && <polyline className="line" points={path} />}
          {hover != null && <path className="cross" d={`M${x(hover)} 0V100`} />}
        </svg>
        {limit && (
          <span className="limit-label" style={{ top: `${y(limit.v)}%` }}>
            {limit.label}
          </span>
        )}
        {hover != null && values[hover] != null && <i className="hover-dot" style={{ left: `${x(hover)}%`, top: `${y(values[hover]!)}%` }} />}
        {!n && <p className="empty">Sem dados ainda. Conecte o robô.</p>}
      </div>
    </article>
  );
}

const TESTS = [
  { id: "T-08", label: "T-08 · estabilidade 15 min" },
  { id: "T-03", label: "T-03 · RTT" },
  { id: "T-04", label: "T-04 · perda de mensagens" },
  { id: "T-07", label: "T-07 · alcance" },
  { id: "sessao", label: "Sessão livre" },
];

export function Telemetry({ robot }: { robot: Robot }) {
  const [test, setTest] = useState("T-08");
  const rtts = robot.rtts;
  const s = robot.samples;
  const stats = useMemo(() => {
    const fps = s.map((x) => x.fps);
    return {
      med: median(rtts),
      p95: percentile(rtts, 95),
      worst: rtts.length ? Math.max(...rtts) : null,
      fps: fps.length ? fps.reduce((a, b) => a + b, 0) / fps.length : null,
    };
  }, [rtts, s]);
  const rows = robot.session.current;
  const duration = rows.length ? rows[rows.length - 1].t : 0;

  const exportCsv = () => {
    const head = "timestamp,t_s,evento,rtt_ms,fps,bateria_v,rssi_dbm,perda_pct";
    const lines = rows.map((r) => [r.iso, r.t, r.evento, r.rtt ?? "", r.fps ?? "", r.bat ?? "", r.rssi ?? "", r.perda].join(","));
    const now = new Date();
    const pad = (v: number) => String(v).padStart(2, "0");
    const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const name = `${day}_${test}_${test === "sessao" ? "" : "sessao-"}${pad(now.getHours())}${pad(now.getMinutes())}.csv`.replace("__", "_");
    const url = URL.createObjectURL(new Blob([[head, ...lines].join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const ms = (v: number | null) => (v == null ? "--" : Math.round(v));

  return (
    <main className="telemetry">
      <KitArt src={triangles} className="deco tele-triangles" />
      <div className="page-title">
        <div>
          <HazardLabel as="div">SESSÃO ATUAL</HazardLabel>
          <h1 data-text="TELEMETRIA">TELEMETRIA</h1>
          <p>
            Sessão gravada desde que a interface abriu: {Math.floor(duration / 60)} min {Math.round(duration % 60)} s, {rows.length} registros. O robô fica parado nesta tela.
          </p>
        </div>
        <div className="export">
          <select value={test} onChange={(e) => setTest(e.target.value)} aria-label="Teste do CSV">
            {TESTS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <button className="kbtn solid" onClick={exportCsv} disabled={!rows.length}>
            <Download size={16} />
            EXPORTAR CSV
          </button>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat"><small>[RTT MEDIANA]</small><strong>{ms(stats.med)}<em>ms</em></strong></div>
        <div className="stat"><small>[RTT P95]</small><strong>{ms(stats.p95)}<em>ms</em></strong></div>
        <div className="stat"><small>[PIOR RTT]</small><strong>{ms(stats.worst)}<em>ms</em></strong></div>
        <div className="stat"><small>[FPS MÉDIO]</small><strong>{stats.fps == null ? "--" : stats.fps.toFixed(1).replace(".", ",")}<em>fps</em></strong></div>
        <div className="stat"><small>[PERDA DE PINGS]</small><strong>{robot.loss.toFixed(1).replace(".", ",")}<em>%</em></strong></div>
        <div className="stat"><small>[QUEDAS]</small><strong>{robot.reconnects}<em>na sessão</em></strong></div>
      </div>

      <div className="chart-grid">
        <Chart title="Tempo de ida e volta" note="RTT · último minuto" values={rtts} unit="ms" min={0} max={300} tone="cyan" limit={{ v: RTT_LIMIT_MS, label: `limite ${RTT_LIMIT_MS} ms` }} />
        <Chart title="Quadros por segundo" note="FPS do vídeo" values={s.map((x) => x.fps)} unit="fps" min={0} max={30} tone="violet" />
        <Chart title="Tensão da bateria" note="2S Li-ion" values={s.map((x) => x.bat)} unit="V" min={6.4} max={8.6} decimals={2} tone="amber" limit={{ v: BATTERY_LOW_V, label: "baixa 7,2 V" }} />
        <Chart title="Sinal do Wi-Fi" note="RSSI" values={s.map((x) => x.rssi)} unit="dBm" min={-95} max={-30} tone="teal" limit={{ v: -75, label: "fraco −75 dBm" }} />
      </div>
    </main>
  );
}
