// Contrato de mensagens entre interface e robô (Guia, seção 5.4).
// Se mudar aqui, mude também em docs/protocolo.md e no firmware.

/** interface → robô, a cada COMMAND_INTERVAL_MS */
export type CommandMsg = { t: "c"; x: number; y: number; v: number; n: number };
/** interface → robô, a cada 1 s. O robô devolve a mesma mensagem na hora. */
export type PingMsg = { t: "p"; n: number; ts: number };
/** interface → robô, ao clicar em "Enviar ao robô". PROPOSTA: ainda não está no protocolo.md. */
export type ConfigMsg = { t: "cfg"; ch: number; vmax: number; ke: number; kd: number };
/** robô → interface, a cada ~500 ms. bat = 0 significa "sem sensor de bateria" (vira null aqui). */
export type StatusMsg = { t: "s"; rssi: number; bat: number | null; fps: number; ok: number; n: number };

export type OutMsg = CommandMsg | PingMsg | ConfigMsg;
export type InMsg = StatusMsg | PingMsg;

/** Valida o JSON recebido. Mensagem malformada é descartada, nunca derruba a interface. */
export function parseIn(raw: unknown): InMsg | null {
  if (typeof raw !== "string") return null;
  let m: Record<string, unknown>;
  try {
    m = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!m || typeof m !== "object") return null;
  const num = (k: string) => typeof m[k] === "number" && Number.isFinite(m[k]);
  if (m.t === "p" && num("n") && num("ts")) return m as PingMsg;
  if (m.t === "s" && num("rssi") && num("bat") && num("fps")) {
    return { t: "s", rssi: m.rssi as number, bat: (m.bat as number) > 0 ? (m.bat as number) : null, fps: m.fps as number, ok: num("ok") ? (m.ok as number) : 1, n: num("n") ? (m.n as number) : 0 };
  }
  return null;
}

/** Arredonda para 2 casas: mensagem menor e mais fácil de ler no monitor serial. */
export const r2 = (v: number) => Math.round(v * 100) / 100;
