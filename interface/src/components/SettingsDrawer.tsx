import { useEffect, useRef, useState } from "react";
import { Zap } from "lucide-react";
import { HazardLabel, KitIcon } from "./Kit";
import type { Resolution } from "../config";
import type { Settings } from "../lib/settings";

/** Controle deslizante. Fica FORA do componente da gaveta: na versão anterior ele era
 *  declarado dentro dela e perdia o valor a cada atualização da telemetria (1,5 s). */
function Range({ label, value, min, max, step = 1, unit = "", hint, onChange }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; hint?: string; onChange: (v: number) => void }) {
  const show = Number.isInteger(step) ? String(value) : value.toFixed(2).replace(".", ",");
  return (
    <label className="range">
      <span>
        {label}
        <b>
          {value > 0 && min < 0 ? "+" : ""}
          {show}
          {unit}
        </b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
      {hint && <small>{hint}</small>}
    </label>
  );
}

function Toggle({ label, hint, on, onChange }: { label: string; hint?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <input type="checkbox" role="switch" checked={on} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  sendConfig: () => void;
  testDrop: () => void;
  connected: boolean;
};

export function SettingsDrawer({ open, onClose, settings: s, update, sendConfig, testDrop, connected }: Props) {
  const [sent, setSent] = useState(false);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [open, onClose]);

  return (
    <>
      <div className={`drawer-backdrop ${open ? "open" : ""}`} onClick={onClose} />
      <aside ref={panel} tabIndex={-1} className={`settings ${open ? "open" : ""}`} aria-hidden={!open} inert={!open} aria-label="Ajustes">
        <div className="drawer-head">
          <div>
            <p className="dmr">◢ [SISTEMA] <b>:CONFIG</b></p>
            <h2>AJUSTES</h2>
          </div>
          <button className="kbtn icon ghost" aria-label="Fechar ajustes" onClick={onClose}>
            <KitIcon name="close" />
          </button>
        </div>
        <div className="ktoast tone-amber">
          <KitIcon name="warn" size={18} />
          <div>
            <b>Robô parado</b>
            <span>Enquanto esta gaveta está aberta, a interface só manda comando zero.</span>
          </div>
        </div>

        <section>
          <HazardLabel as="h3">CONEXÃO</HazardLabel>
          <Toggle label="Usar o simulador" hint="Sem hardware: robô e câmera simulados" on={s.simulate} onChange={(v) => update({ simulate: v })} />
          <label className="field">
            Porta do vídeo
            <input type="number" value={s.streamPort} onChange={(e) => update({ streamPort: +e.target.value || 81 })} />
          </label>
          <label className="field">
            Porta do WebSocket
            <input type="number" value={s.wsPort} onChange={(e) => update({ wsPort: +e.target.value || 80 })} />
          </label>
          <label className="field">
            Caminho do WebSocket
            <input value={s.wsPath} spellCheck={false} onChange={(e) => update({ wsPath: e.target.value.startsWith("/") ? e.target.value : `/${e.target.value}` })} />
          </label>
          <button className="kbtn row" disabled={!connected} onClick={testDrop}>
            <Zap size={16} />
            TESTAR QUEDA DE CONEXÃO (3 S)
          </button>
          <small className="note">Fecha o WebSocket por 3 s. O robô precisa parar na hora (teste T-05).</small>
        </section>

        <section>
          <HazardLabel as="h3">CÂMERA</HazardLabel>
          <label className="field">
            Resolução
            <select value={s.resolution} onChange={(e) => update({ resolution: e.target.value as Resolution })}>
              <option value="QVGA">QVGA · 320×240</option>
              <option value="HVGA">HVGA · 480×320</option>
              <option value="VGA">VGA · 640×480</option>
            </select>
          </label>
          <Range label="Qualidade JPEG" hint="Menor número = imagem melhor e quadros maiores" value={s.quality} min={10} max={40} onChange={(v) => update({ quality: v })} />
          <Range label="Brilho" value={s.brightness} min={-2} max={2} onChange={(v) => update({ brightness: v })} />
          <Range label="Exposição" hint="Use para sol direto ou sombra" value={s.exposure} min={-2} max={2} onChange={(v) => update({ exposure: v })} />
          {!s.simulate && <small className="note">Aplicado na hora pelo endpoint /control do CameraWebServer.</small>}
          {s.simulate && <Range label="Atraso do vídeo simulado" hint="Treine com a latência que vocês mediram no T-01" value={s.simVideoDelay} min={0} max={400} step={10} unit=" ms" onChange={(v) => update({ simVideoDelay: v })} />}
        </section>

        <section>
          <HazardLabel as="h3">MIRA</HazardLabel>
          <Range label="Horizontal" value={s.aimX} min={20} max={80} unit="%" onChange={(v) => update({ aimX: v })} />
          <Range label="Vertical" value={s.aimY} min={20} max={90} unit="%" hint="Alinhe com a ponta da arma no quadro" onChange={(v) => update({ aimY: v })} />
        </section>

        <section>
          <HazardLabel as="h3">PILOTAGEM</HazardLabel>
          <Range label="Curva do analógico" hint="0 = linear; 1 = suave no centro, forte nas pontas" value={s.expo} min={0} max={1} step={0.05} onChange={(v) => update({ expo: v })} />
        </section>

        <section>
          <HazardLabel as="h3">ROBÔ</HazardLabel>
          <label className="field">
            Canal do Wi-Fi
            <select value={s.channel} onChange={(e) => update({ channel: +e.target.value })}>
              {Array.from({ length: 13 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </label>
          <Range label="Velocidade máxima" hint="Limite do PWM. Bateria 7,4 V com motores de 6 V: até 80%" value={s.vmax} min={30} max={100} unit="%" onChange={(v) => update({ vmax: v })} />
          <Range label="Compensação esquerda" value={s.trimLeft} min={-20} max={20} unit="%" onChange={(v) => update({ trimLeft: v })} />
          <Range label="Compensação direita" hint="Ajuste até o robô andar reto" value={s.trimRight} min={-20} max={20} unit="%" onChange={(v) => update({ trimRight: v })} />
          <button
            className="kbtn solid save"
            disabled={!connected}
            onClick={() => {
              sendConfig();
              setSent(true);
              setTimeout(() => setSent(false), 1600);
            }}
          >
            {sent ? "ENVIADO AO ROBÔ" : "ENVIAR AO ROBÔ"}
          </button>
          <small className="note">Mensagem cfg: proposta, precisa entrar no protocolo.md e no firmware.</small>
        </section>

        <section>
          <HazardLabel as="h3">TELA</HazardLabel>
          <Toggle label="Modo sol" hint="Mais contraste, sem brilhos nem linhas de varredura" on={s.sunMode} onChange={(v) => update({ sunMode: v })} />
          <Toggle label="Alertas sonoros" on={s.sound} onChange={(v) => update({ sound: v })} />
        </section>
      </aside>
    </>
  );
}
