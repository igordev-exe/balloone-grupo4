import { useEffect, useState } from "react";
import { Circle, Gamepad2, Maximize, Minimize, RotateCcw, Undo2 } from "lucide-react";
import { BATTERY_LOW_V, ROUND_SECONDS, SPEED } from "../config";
import type { Robot } from "../hooks/useRobot";
import type { Drive } from "../lib/input";
import type { Settings } from "../lib/settings";
import barcode from "../assets/kit/barcode.png";
import chevrons from "../assets/kit/chevrons.png";
import stripesSq from "../assets/kit/stripes_sq.png";
import { CautionEmblem, CornerSlashes, DangerFrame, HazardLabel, HudBar, KitArt, KitIcon, SegBoxes } from "./Kit";
import { AimOverlay, VideoStage } from "./Video";

function useNow(active: boolean, ms = 250) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [active, ms]);
  return now;
}

const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
const hms = (s: number) => `${pad(s / 3600)}:${pad((s / 60) % 60)}:${pad(s % 60)}`;

/** Queda de conexão: a composição da tela MECH - SCREEN do kit.
 *  Vermelho em tela cheia, quadro [DANGER] com o tempo sem conexão, triângulo de
 *  CAUTION e contadores nos cantos. É o único momento em que a tela inteira fica vermelha. */
function DangerScreen({ robot }: { robot: Robot }) {
  const [lostAt] = useState(() => Date.now());
  const now = useNow(true);
  return (
    <div className="danger-screen" role="alert">
      <CornerSlashes big />
      <div className="danger-center">
        <DangerFrame title="SEM CONEXÃO" time={hms((now - lostAt) / 1000)} />
        <CautionEmblem
          left="ROBÔ PARADO"
          right={
            <>
              FAILSAFE
              <br />
              [ATIVO]
            </>
          }
          marquee="RECONECTANDO A CADA 1 S ·"
        />
      </div>
      <div className="danger-corner left">
        <span className="dmr">
          ◢ [TENTATIVA · QUEDAS · BATERIA]
        </span>
        <SegBoxes
          values={[
            { v: pad(robot.attempts), filled: true },
            { v: pad(robot.reconnects) },
            { v: robot.telem.bat?.toFixed(1).replace(".", ",") ?? "--", filled: true },
          ]}
          label="Tentativas, quedas e bateria"
        />
      </div>
      <div className="danger-corner right">
        <span className="dmr">
          ◢ [ÚLTIMO RTT] <b>:{robot.telem.rtt ?? "--"} MS</b>
        </span>
      </div>
    </div>
  );
}

/** "WARRNING" do Button Pack 03: faixa com triângulos de alerta nas pontas. */
function WarnLabel({ children, tone }: { children: string; tone: "amber" | "grey" }) {
  return (
    <div className={`warn-label tone-${tone}`}>
      <span className="wl-end">
        <KitIcon name="warn" size={22} />
      </span>
      <span className="wl-text">{children}</span>
      <span className="wl-end">
        <KitIcon name="warn" size={22} />
      </span>
    </div>
  );
}

function Warnings({ robot, videoOk, stopped }: { robot: Robot; videoOk: boolean; stopped: boolean }) {
  const bat = robot.telem.bat;
  return (
    <div className="alert-stack" role="status" aria-live="assertive">
      {robot.stale && <WarnLabel tone="amber">SINAL INSTÁVEL</WarnLabel>}
      {bat != null && bat < BATTERY_LOW_V && <WarnLabel tone="amber">{`BATERIA BAIXA · ${bat.toFixed(2).replace(".", ",")} V · VOLTE`}</WarnLabel>}
      {!videoOk && <WarnLabel tone="grey">SEM VÍDEO · REABRINDO</WarnLabel>}
      {stopped && <WarnLabel tone="grey">PARADO</WarnLabel>}
    </div>
  );
}

const MODE_NAME = { precisao: "PRECISÃO", normal: "NORMAL", turbo: "TURBO" } as const;

function KeyHints({ pressed, gamepad }: { pressed: Set<string>; gamepad: boolean }) {
  const k = (label: string, codes: string[], wide = "") => <kbd className={`key ${wide} ${codes.some((c) => pressed.has(c)) ? "active" : ""}`}>{label}</kbd>;
  return (
    <div className="key-hints" aria-label="Comandos do teclado">
      <div className="wasd">
        <div>{k("W", ["KeyW", "ArrowUp"])}</div>
        <div>
          {k("A", ["KeyA", "ArrowLeft"])}
          {k("S", ["KeyS", "ArrowDown"])}
          {k("D", ["KeyD", "ArrowRight"])}
        </div>
      </div>
      <div className="mods">
        <span>{k("SHIFT", ["ShiftLeft", "ShiftRight"], "wide")}TURBO</span>
        <span>{k("Q", ["KeyQ"], "wide")}PRECISÃO</span>
        <span>{k("ESPAÇO", ["Space"], "wide")}PARAR</span>
      </div>
      {gamepad && (
        <div className="gamepad-chip">
          <Gamepad2 size={20} />
          CONTROLE ATIVO
        </div>
      )}
    </div>
  );
}

export type RoundState = { seconds: number; running: boolean; score: number[] };

type Props = {
  robot: Robot;
  settings: Settings;
  drive: Drive;
  pressed: Set<string>;
  gamepad: boolean;
  video: { ok: boolean; markFrame: () => void; markError: () => void };
  round: RoundState;
  setRound: (fn: (r: RoundState) => RoundState) => void;
  recording: boolean;
  toggleRecording: () => void;
  toggleSound: () => void;
  fullscreen: boolean;
  toggleFullscreen: () => void;
  openSettings: () => void;
};

export function Cockpit(p: Props) {
  const { robot, settings, drive, round, setRound } = p;
  const total = round.score.reduce((a, b) => a + b, 0);
  const live = robot.state === "conectado";
  const speed = drive.stop ? 0 : SPEED[drive.mode];
  return (
    <main className="cockpit">
      <section className={`video-view ${live ? "" : "lost"}`} data-augmented-ui="tl-clip tr-clip br-clip bl-clip border">
        <VideoStage settings={settings} live={live} onFrame={p.video.markFrame} onError={p.video.markError}>
          <div className="stage-frame" aria-hidden />
          <AimOverlay drive={drive} aimX={settings.aimX} aimY={settings.aimY} />
          <KitArt src={chevrons} className={`chev up ${drive.y > 0.05 ? "on" : ""} ${drive.mode === "turbo" ? "turbo" : ""}`} style={{ left: `${settings.aimX}%`, top: `${settings.aimY - 21}%` }} />
          <KitArt src={chevrons} className={`chev down ${drive.y < -0.05 ? "on" : ""}`} style={{ left: `${settings.aimX}%`, top: `${settings.aimY + 21}%` }} />

          <div className={`mode-tag mode-${drive.mode} ${drive.stop ? "stopped" : ""}`}>
            <span className="dmr">
              ◢ [MODO] <b>:{drive.stop ? "PARADO" : MODE_NAME[drive.mode]}</b>
            </span>
            <HudBar label="VEL" value={String(Math.round(speed * 100))} unit="%" pct={speed * 100} />
          </div>

          <div className="live-tag">
            <i className={p.video.ok ? "on" : ""} />
            {settings.simulate ? "SIM" : "CAM"} · {settings.resolution}
          </div>

          <KeyHints pressed={p.pressed} gamepad={p.gamepad} />
          {live && <Warnings robot={robot} videoOk={p.video.ok} stopped={drive.stop} />}
        </VideoStage>
        <CornerSlashes />
        {!live && <DangerScreen robot={robot} />}
      </section>

      <aside className="control-rail">
        <div className="rail-panel timer">
          <HazardLabel as="h3">ROUND</HazardLabel>
          <div className={`timer-digits ${round.seconds <= 60 ? "ending" : ""}`} aria-label={`Tempo restante ${pad(round.seconds / 60)}:${pad(round.seconds % 60)}`}>
            <SegBoxes values={[{ v: pad(round.seconds / 60), filled: true, sub: "MIN" }, { v: pad(round.seconds % 60), sub: "SEG" }]} />
          </div>
          <div className="timer-actions">
            <button className="kbtn solid" onClick={() => setRound((r) => ({ ...r, running: !r.running }))}>
              {round.running ? "PAUSAR" : round.seconds === 0 ? "ENCERRADO" : "INICIAR"}
            </button>
            <button className="kbtn icon ghost" aria-label="Zerar cronômetro" title="Zerar cronômetro" onClick={() => setRound((r) => ({ ...r, seconds: ROUND_SECONDS, running: false }))}>
              <RotateCcw size={18} />
            </button>
          </div>
          <KitArt src={barcode} className="barcode" />
        </div>

        <div className="rail-panel scoreboard">
          <HazardLabel as="h3">PLACAR</HazardLabel>
          <div className="score-total">
            <strong>{String(total).padStart(2, "0")}</strong>
            <span>PTS</span>
            <button className="kbtn icon ghost" aria-label="Desfazer último ponto" title="Desfazer último ponto" disabled={!round.score.length} onClick={() => setRound((r) => ({ ...r, score: r.score.slice(0, -1) }))}>
              <Undo2 size={16} />
            </button>
          </div>
          <div className="score-tiles">
            {[
              { pts: 1, cls: "blue", label: "AZUL" },
              { pts: 2, cls: "red", label: "VERMELHO" },
              { pts: 4, cls: "rival", label: "RIVAL" },
            ].map((b) => (
              <button key={b.pts} className={`score-tile ${b.cls}`} onClick={() => setRound((r) => ({ ...r, score: [...r.score, b.pts] }))}>
                {b.cls === "rival" && <KitArt src={stripesSq} className="tile-stripes" />}
                <span className="dots" aria-hidden>
                  • • •
                </span>
                <i className="ball" />
                <b>+{b.pts}</b>
                <small>{b.label}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="util-grid">
          <button className={`kbtn ghost tile ${p.recording ? "rec" : ""}`} onClick={p.toggleRecording}>
            <Circle size={20} fill={p.recording ? "currentColor" : "none"} />
            {p.recording ? "PARAR" : "GRAVAR"}
          </button>
          <button className={`kbtn ghost tile ${settings.sound ? "" : "off"}`} onClick={p.toggleSound} aria-pressed={settings.sound}>
            <KitIcon name={settings.sound ? "volume" : "mute"} size={22} />
            {settings.sound ? "SOM" : "MUDO"}
          </button>
          <button className="kbtn ghost tile" onClick={p.toggleFullscreen}>
            {p.fullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            {p.fullscreen ? "SAIR" : "TELA [F]"}
          </button>
          <button className="kbtn ghost tile" onClick={p.openSettings}>
            <KitIcon name="settings" size={22} />
            AJUSTES
          </button>
        </div>
      </aside>
    </main>
  );
}
