import { useEffect, useRef, useState, type ReactNode } from "react";
import { RESOLUTION_PX } from "../config";
import type { Drive } from "../lib/input";
import { streamUrl, type Settings } from "../lib/settings";
import { SimCanvas } from "./SimCanvas";
import { KitArt } from "./Kit";
import targetCorners from "../assets/kit/target_corners.png";
import { RANGE_BRACKET_M, RANGE_BRACKET_PCT } from "../config";

const BLANK = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";

/** Stream MJPEG do CameraWebServer. Detalhes que evitam travar o vídeo:
 *  - o servidor da porta 81 aceita UM cliente por vez, então ao desmontar a tag
 *    a conexão é fechada à força (src vazio); senão a próxima tela fica sem vídeo;
 *  - em erro, tenta de novo a cada 2 s com um parâmetro novo para furar o cache. */
function RealStream({ url, onFrame, onError }: { url: string; onFrame: () => void; onError: () => void }) {
  const img = useRef<HTMLImageElement>(null);
  const [src, setSrc] = useState(() => `${url}?t=${Date.now()}`);
  const retry = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setSrc(`${url}?t=${Date.now()}`);
  }, [url]);

  useEffect(() => {
    const el = img.current;
    const poll = setInterval(() => {
      if (el && el.complete !== false && el.naturalWidth > 1) onFrame();
    }, 400);
    return () => {
      clearInterval(poll);
      clearTimeout(retry.current);
      if (el) el.src = BLANK;
    };
  }, [onFrame]);

  return (
    <img
      ref={img}
      className="feed"
      src={src}
      alt="Vídeo ao vivo da câmera do robô"
      onError={() => {
        onError();
        clearTimeout(retry.current);
        retry.current = setTimeout(() => setSrc(`${url}?t=${Date.now()}`), 2000);
      }}
    />
  );
}

/** Saúde do vídeo: "ok" se chegou quadro nos últimos 1,5 s. */
export function useVideoHealth() {
  const last = useRef(0);
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setOk(performance.now() - last.current < 1500), 300);
    return () => clearInterval(id);
  }, []);
  const markFrame = useRef(() => {
    last.current = performance.now();
  }).current;
  const markError = useRef(() => {
    last.current = 0;
  }).current;
  return { ok, markFrame, markError };
}

type FeedProps = { settings: Settings; live: boolean; onFrame: () => void; onError: () => void; children?: ReactNode };

/** Quadro do vídeo com a proporção real da resolução escolhida. A mira e as
 *  linhas de trajetória ficam dentro dele, então a calibração não muda com a janela. */
export function VideoStage({ settings, live, onFrame, onError, children }: FeedProps) {
  const [w, h] = RESOLUTION_PX[settings.resolution];
  return (
    <div className="stage" style={{ ["--ratio" as string]: `${w} / ${h}`, ["--rw" as string]: w, ["--rh" as string]: h }}>
      {settings.simulate ? (
        <SimCanvas resolution={settings.resolution} delayMs={settings.simVideoDelay} brightness={settings.brightness} frozen={!live} onFrame={onFrame} />
      ) : (
        <RealStream url={streamUrl(settings)} onFrame={onFrame} onError={onError} />
      )}
      {children}
    </div>
  );
}

/** Mira calibrada + linhas de trajetória, como câmera de ré de carro. */
export function AimOverlay({ drive, aimX, aimY }: { drive: Drive; aimX: number; aimY: number }) {
  const moving = drive.y !== 0 || drive.x !== 0;
  const turn = drive.y < 0 ? -drive.x : drive.x;
  // Giro no lugar (só A/D) curva pouco: o robô não anda, só aponta.
  const bend = turn * (drive.y !== 0 ? 16 : 6);
  // As linhas terminam nos cantos de baixo dos colchetes da mira.
  const half = RANGE_BRACKET_PCT / 2;
  const topY = Math.min(94, aimY + half * (4 / 3) + 2);
  const left = `M 30 100 Q ${30 + bend * 0.6} ${(100 + topY) / 2} ${aimX - half + bend} ${topY}`;
  const right = `M 70 100 Q ${70 + bend * 0.6} ${(100 + topY) / 2} ${aimX + half + bend} ${topY}`;
  return (
    <>
      <svg className={`guides ${moving ? "on" : ""} ${drive.y < 0 ? "reverse" : ""}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <path d={left} />
        <path d={right} />
      </svg>
      {/* Mira: o ponto central é onde o balão fica no instante do estouro (calibrado em Ajustes → Mira).
          Os colchetes têm o tamanho de um balão a 1 m: se o balão enche os colchetes, ele está a ~1 m. */}
      <div className={`reticle mode-${drive.mode}`} style={{ left: `${aimX}%`, top: `${aimY}%`, width: `${RANGE_BRACKET_PCT}%` }} role="img" aria-label={`Mira: ponto de estouro; colchetes do tamanho de um balão a ${RANGE_BRACKET_M} m`}>
        <KitArt src={targetCorners} className="reticle-target" />
        <svg className="reticle-center" viewBox="-20 -20 40 40" aria-hidden>
          <path d="M0 -16V-6M0 6V16M-16 0H-6M6 0H16" />
          <circle r="2.4" />
        </svg>
        <span className="reticle-range">{String(RANGE_BRACKET_M).replace(".", ",")} M</span>
      </div>
    </>
  );
}
