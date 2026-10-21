import type { Resolution } from "../config";

export type Settings = {
  /** Endereço do robô no modo AP. */
  address: string;
  /** Liga o robô simulado (sem hardware). */
  simulate: boolean;
  /** Caminhos do CameraWebServer e do WebSocket do firmware. */
  streamPort: number;
  wsPort: number;
  wsPath: string;
  // Enviados ao firmware (mensagem cfg)
  channel: number;
  vmax: number; // %
  trimLeft: number; // %
  trimRight: number; // %
  // Câmera (endpoint /control do CameraWebServer)
  resolution: Resolution;
  quality: number; // 10 (melhor) a 63
  brightness: number; // -2..2
  exposure: number; // -2..2
  // Mira calibrada, em % do quadro
  aimX: number;
  aimY: number;
  // Pilotagem
  expo: number; // 0 = linear, 1 = cúbica
  // Tela
  sunMode: boolean;
  sound: boolean;
  /** Latência artificial do vídeo no simulador, para treinar o operador. */
  simVideoDelay: number;
};

export const DEFAULT_SETTINGS: Settings = {
  address: "192.168.4.1",
  simulate: true,
  streamPort: 81,
  wsPort: 80,
  wsPath: "/ws",
  channel: 6,
  vmax: 80,
  trimLeft: 0,
  trimRight: 0,
  resolution: "QVGA",
  quality: 12,
  brightness: 0,
  exposure: 0,
  aimX: 50,
  aimY: 58,
  expo: 0.5,
  sunMode: false,
  sound: true,
  simVideoDelay: 150,
};

const KEY = "balloone-g4-settings-v1";

/** localStorage só guarda conveniências deste notebook. Pode falhar (aba anônima), então tudo tem try/catch. */
export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* sem armazenamento: usa o padrão */
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignora */
  }
}

export const streamUrl = (s: Settings) => `http://${s.address}:${s.streamPort}/stream`;
export const wsUrl = (s: Settings) => `ws://${s.address}${s.wsPort === 80 ? "" : `:${s.wsPort}`}${s.wsPath}`;
export const controlUrl = (s: Settings, variable: string, value: number) => `http://${s.address}/control?var=${variable}&val=${value}`;
