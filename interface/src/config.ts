// Constantes da estação de controle. Tudo que for ajuste fino de pilotagem
// ou de protocolo fica aqui, num lugar só, para ficar fácil de defender no PC.

/** Intervalo do laço de comandos. 50 ms = 20 Hz: dentro da janela de 500 ms
 *  do failsafe cabem 10 reenvios, então perder alguns pacotes não para o robô. */
export const COMMAND_INTERVAL_MS = 50;
/** Ping de RTT, 1 por segundo (Guia, seção 5.4). */
export const PING_INTERVAL_MS = 1000;
/** Reconexão automática do WebSocket (Guia, seção 6.3). */
export const RECONNECT_DELAY_MS = 1000;
/** Sem nenhuma mensagem do robô por este tempo, o link é considerado instável. */
export const STALE_AFTER_MS = 1200;
/** Failsafe do lado do robô (camada 3). O simulador imita o mesmo valor. */
export const ROBOT_SILENCE_STOP_MS = 500;

/** Limites usados no autoteste e nos alertas. */
export const BATTERY_LOW_V = 7.2;
export const RTT_LIMIT_MS = 150;

/** Velocidade enviada no campo v, por modo. */
export const SPEED = { precisao: 0.3, normal: 0.6, turbo: 1 } as const;
/** No modo precisão, a curva também cai pela metade (Guia, seção 11). */
export const PRECISION_TURN = 0.5;
/** Zona morta do analógico. */
export const DEADZONE = 0.08;

/** Duração do pulso de cada motor no autoteste. */
export const MOTOR_TEST_MS = 500;

/** Valores de framesize do esp32-camera (sensor.h). Conferir com a versão da biblioteca. */
export const FRAMESIZE = { QVGA: 5, HVGA: 7, VGA: 8 } as const;
export type Resolution = keyof typeof FRAMESIZE;
export const RESOLUTION_PX: Record<Resolution, [number, number]> = {
  QVGA: [320, 240],
  HVGA: [480, 320],
  VGA: [640, 480],
};

export const ROUND_SECONDS = 15 * 60;

/** Diâmetro do balão. O edital só diz "mesmo padrão e tamanho": medir o balão real e ajustar. */
export const BALLOON_DIAMETER_M = 0.22;
/** Campo de visão horizontal da OV2640 com a lente padrão (aproximado). */
export const CAMERA_FOV_DEG = 62;
/** Os colchetes da mira têm o tamanho de um balão a esta distância. */
export const RANGE_BRACKET_M = 1;
/** Largura dos colchetes em % do quadro: diâmetro ÷ largura que a câmera enxerga a essa distância. */
export const RANGE_BRACKET_PCT = (BALLOON_DIAMETER_M / (2 * RANGE_BRACKET_M * Math.tan((CAMERA_FOV_DEG * Math.PI) / 360))) * 100;
