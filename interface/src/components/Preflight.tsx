import { useEffect, useState } from "react";
import { BATTERY_LOW_V, RTT_LIMIT_MS } from "../config";
import { median, type Robot } from "../hooks/useRobot";
import { unlockAudio } from "../lib/audio";
import type { Settings } from "../lib/settings";
import cube from "../assets/kit/cube.png";
import gauge from "../assets/kit/gauge.png";
import panel from "../assets/kit/panel.png";
import swirl from "../assets/kit/swirl.png";
import triangles from "../assets/kit/triangles.png";
import zigzag from "../assets/kit/zigzag.png";
import { HazardLabel, KitArt, KitIcon, KitTag } from "./Kit";
import { linkLabel } from "./StatusBar";
import { VideoStage } from "./Video";

export type CheckState = "pendente" | "ok" | "falhou";
export type MotorChecks = { left: CheckState; right: CheckState };

type Props = {
  robot: Robot;
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  video: { ok: boolean; markFrame: () => void; markError: () => void };
  motors: MotorChecks;
  setMotors: (m: MotorChecks) => void;
  testMotor: (side: "left" | "right") => void;
  testing: "left" | "right" | null;
  onReady: () => void;
  openSettings: () => void;
};

const TAG = { ok: "cyan", falhou: "red", pendente: "grey" } as const;

export function Preflight({ robot, settings, update, video, motors, setMotors, testMotor, testing, onReady, openSettings }: Props) {
  const [address, setAddress] = useState(settings.address);
  useEffect(() => setAddress(settings.address), [settings.address]);

  const connected = robot.state === "conectado" && !robot.stale;
  const rtt = median(robot.rtts.slice(-5));
  const bat = robot.telem.bat;
  const auto = (ok: boolean | null): CheckState => (ok == null ? "pendente" : ok ? "ok" : "falhou");

  const rows: { label: string; state: CheckState; detail: string; motor?: "left" | "right" }[] = [
    { label: "Vídeo recebido", state: video.ok ? "ok" : "pendente", detail: video.ok ? `quadros chegando em ${settings.resolution}` : "aguardando quadros" },
    { label: "Comandos respondendo", state: connected ? "ok" : robot.everConnected ? "falhou" : "pendente", detail: linkLabel(robot) },
    { label: "Motor esquerdo", state: motors.left, detail: "gira só a roda esquerda por 0,5 s", motor: "left" },
    { label: "Motor direito", state: motors.right, detail: "gira só a roda direita por 0,5 s", motor: "right" },
    { label: `Bateria acima de ${String(BATTERY_LOW_V).replace(".", ",")} V`, state: bat == null && robot.samples.length ? "ok" : auto(bat == null ? null : bat >= BATTERY_LOW_V), detail: bat == null ? (robot.samples.length ? "robô sem sensor de bateria: confira com o multímetro" : "sem leitura") : `${bat.toFixed(2).replace(".", ",")} V agora` },
    { label: `RTT abaixo de ${RTT_LIMIT_MS} ms`, state: auto(rtt == null ? null : rtt <= RTT_LIMIT_MS), detail: rtt == null ? "sem leitura" : `${Math.round(rtt)} ms, mediana de 5 pings` },
  ];
  const okCount = rows.filter((r) => r.state === "ok").length;
  const allOk = okCount === rows.length;

  const connect = () => {
    unlockAudio();
    const a = address.trim();
    if (a && a !== settings.address) update({ address: a });
    else robot.reconnect();
  };

  return (
    <main className="preflight">
      <section className="preflight-card">
        <header className="preflight-head">
          <span className="brand-mark large" data-augmented-ui="tl-clip br-clip">B4</span>
          <div>
            <p>[ESTAÇÃO DE CONTROLE] :G4</p>
            <h1 data-text="BALLOONE">BALLOONE</h1>
          </div>
          <button className="kbtn icon ghost head-settings" title="Ajustes" aria-label="Ajustes" onClick={openSettings}>
            <KitIcon name="settings" />
          </button>
        </header>

        <HazardLabel>CONEXÃO</HazardLabel>
        <div className="switcher" role="radiogroup" aria-label="Fonte do robô">
          {(
            [
              [false, "ROBÔ REAL"],
              [true, "SIMULADOR"],
            ] as const
          ).map(([sim, name]) => (
            <button
              key={name}
              role="radio"
              aria-checked={settings.simulate === sim}
              className={settings.simulate === sim ? "on" : ""}
              onClick={() => {
                unlockAudio();
                update({ simulate: sim });
              }}
            >
              {name}
            </button>
          ))}
        </div>

        {settings.simulate ? (
          <p className="hint">O simulador responde como a ESP32, com o mesmo protocolo e o mesmo failsafe. Serve para treinar o operador e testar a interface sem hardware.</p>
        ) : (
          <div className="kfield">
            {location.protocol === "https:" && (
              <div className="ktoast tone-amber https-warn">
                <KitIcon name="warn" size={18} />
                <div>
                  <b>Aberta pelo link, a interface não alcança o robô</b>
                  <span>O navegador bloqueia uma página HTTPS de falar com o robô, que usa HTTP. Para pilotar, rode a interface no notebook (localhost). Por este link, use o Simulador.</span>
                </div>
              </div>
            )}
            <label htmlFor="addr">
              Endereço do robô<sup>*</sup>
            </label>
            <div className="connect-row">
              <div className="kinput">
                <KitIcon name="tower" />
                <input id="addr" value={address} spellCheck={false} inputMode="decimal" onChange={(e) => setAddress(e.target.value)} onKeyDown={(e) => e.key === "Enter" && connect()} />
              </div>
              <button className="kbtn solid" onClick={connect}>
                {robot.everConnected ? "RECONECTAR" : "CONECTAR"}
              </button>
            </div>
            <small>
              Conecte o notebook à rede do robô antes. Vídeo em :{settings.streamPort}/stream, comandos em :{settings.wsPort}
              {settings.wsPath} (porta e caminho em Ajustes).
            </small>
          </div>
        )}

        <HazardLabel>AUTOTESTE</HazardLabel>
        <div className="check-summary">
          <span>
            {okCount}/{rows.length}
          </span>
          VERIFICAÇÕES OK
          <i className="cells" aria-hidden>
            {rows.map((r) => (
              <b key={r.label} className={r.state} />
            ))}
          </i>
        </div>
        <ul className="checklist">
          {rows.map((r) => (
            <li key={r.label} className={`check-row ${r.state}`}>
              <span className="kcheck" aria-hidden>
                <i />
              </span>
              <div className="check-text">
                <b>{r.label}</b>
                <small>{r.detail}</small>
              </div>
              {r.motor ? (
                <div className="motor-actions">
                  <button className="kbtn ghost" disabled={!connected || testing !== null} onClick={() => testMotor(r.motor!)}>
                    {testing === r.motor ? "GIRANDO…" : "GIRAR"}
                  </button>
                  <button className={`kbtn icon ghost ${r.state === "ok" ? "on" : ""}`} aria-label="Girou" onClick={() => setMotors({ ...motors, [r.motor!]: "ok" })}>
                    <KitIcon name="check" size={18} />
                  </button>
                  <button className={`kbtn icon ghost ${r.state === "falhou" ? "on bad" : ""}`} aria-label="Não girou" onClick={() => setMotors({ ...motors, [r.motor!]: "falhou" })}>
                    <KitIcon name="close" size={18} />
                  </button>
                </div>
              ) : (
                <KitTag tone={TAG[r.state]} arrow={false}>{r.state.toUpperCase()}</KitTag>
              )}
            </li>
          ))}
        </ul>

        <div className="ready-dock">
        <button className="ready" disabled={!allOk} onClick={onReady}>
          <span>{allOk ? "COMEÇAR A PILOTAR" : "CONCLUA O AUTOTESTE"}</span>
          <b aria-hidden>›››</b>
        </button>
        {!allOk && robot.state === "conectado" && (
          <button className="skip" onClick={onReady}>
            Pilotar mesmo assim
          </button>
        )}
        </div>
      </section>

      <aside className="preflight-aside">
        <KitArt src={cube} className="deco cube" />
        <KitArt src={triangles} className="deco triangles" />
        <KitArt src={zigzag} className="deco zigzag" />
        <div className="preview-wrap">
          <div className="preview-label">
            <span className="dmr">
              ◢ [CÂMERA] <b>:{settings.simulate ? "SIMULADOR" : `${settings.address}:${settings.streamPort}`}</b>
            </span>
            <img src={gauge} alt="" className="gauge" />
          </div>
          <div className="preview">
            <svg className="folder-frame" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
              <path d="M1.5 3 L3 1 H56 L61 6 H97 L99 9 V99 H3 L1 97 Z" />
              <path className="ticks" d="M58 2 l2 -1.5 M61 2 l2 -1.5 M64 2 l2 -1.5" />
            </svg>
            <div className="preview-inner">
              <VideoStage settings={settings} live={robot.state === "conectado"} onFrame={video.markFrame} onError={video.markError} />
              {!video.ok && (
                <div className="preview-empty">
                  <KitArt src={swirl} className="swirl" />
                  <span>AGUARDANDO VÍDEO</span>
                </div>
              )}
            </div>
          </div>
          <KitArt src={panel} className="deco panel" />
        </div>
        <p className="safety">
          <KitIcon name="warn" size={20} />O robô para sozinho em três casos: ao ligar, quando a conexão cai e depois de 500 ms sem comando.
        </p>
      </aside>
    </main>
  );
}
