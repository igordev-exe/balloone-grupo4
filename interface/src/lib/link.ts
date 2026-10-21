// Camada de transporte. A interface só conversa com a interface `Link`:
// trocar o robô simulado pelo WebSocket real não muda nenhum componente.

import { RECONNECT_DELAY_MS } from "../config";
import { parseIn, type InMsg, type OutMsg } from "./protocol";
import * as sim from "./sim";

export type LinkState = "conectando" | "conectado" | "sem conexão";

export type LinkHandlers = {
  onState: (s: LinkState) => void;
  onMessage: (m: InMsg) => void;
};

export interface Link {
  connect(): void;
  /** Encerra de vez (sem reconectar). */
  dispose(): void;
  send(m: OutMsg): void;
  /** Derruba a conexão por alguns segundos para testar o failsafe (T-05). */
  simulateDrop(ms: number): void;
}

/** Tempo máximo para abrir o socket. Sem isso, um IP fora do ar pode
 *  segurar a tentativa por ~20 s antes de o navegador desistir. */
const OPEN_TIMEOUT_MS = 2500;
/** Se o Wi-Fi engasgar, os comandos se acumulam no buffer e chegam todos de uma vez,
 *  atrasados. Acima deste tamanho a interface pula comandos em vez de enfileirar. */
const MAX_BUFFERED_BYTES = 1024;

export class WsLink implements Link {
  private ws: WebSocket | null = null;
  private retry: ReturnType<typeof setTimeout> | undefined;
  private openTimer: ReturnType<typeof setTimeout> | undefined;
  private disposed = false;
  private holdUntil = 0;

  constructor(private url: string, private h: LinkHandlers) {}

  connect() {
    if (this.disposed) return;
    clearTimeout(this.retry);
    const wait = this.holdUntil - Date.now();
    if (wait > 0) {
      this.retry = setTimeout(() => this.connect(), wait);
      return;
    }
    // Reconexão manual: descarta o socket anterior antes de abrir outro.
    const old = this.ws;
    this.ws = null;
    old?.close();
    this.h.onState("conectando");
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.url);
    } catch {
      this.h.onState("sem conexão");
      this.retry = setTimeout(() => this.connect(), RECONNECT_DELAY_MS);
      return;
    }
    this.ws = ws;
    this.openTimer = setTimeout(() => ws.readyState === WebSocket.CONNECTING && ws.close(), OPEN_TIMEOUT_MS);
    ws.onopen = () => {
      clearTimeout(this.openTimer);
      this.h.onState("conectado");
    };
    ws.onmessage = (e) => {
      const m = parseIn(e.data);
      if (m) this.h.onMessage(m);
    };
    ws.onclose = () => {
      clearTimeout(this.openTimer);
      if (this.ws !== ws) return;
      this.ws = null;
      if (this.disposed) return;
      this.h.onState("sem conexão");
      this.retry = setTimeout(() => this.connect(), RECONNECT_DELAY_MS);
    };
  }

  send(m: OutMsg) {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (m.t === "c" && ws.bufferedAmount > MAX_BUFFERED_BYTES) return;
    ws.send(JSON.stringify(m));
  }

  simulateDrop(ms: number) {
    this.holdUntil = Date.now() + ms;
    this.ws?.close();
  }

  dispose() {
    this.disposed = true;
    clearTimeout(this.retry);
    clearTimeout(this.openTimer);
    const ws = this.ws;
    this.ws = null;
    ws?.close();
  }
}

/** Robô simulado com o mesmo contrato do WebSocket real. */
export class SimLink implements Link {
  private timers: ReturnType<typeof setTimeout>[] = [];
  private status: ReturnType<typeof setInterval> | undefined;
  private up = false;
  private disposed = false;
  private seq = 0;

  constructor(private h: LinkHandlers) {}

  connect() {
    if (this.disposed) return;
    sim.start();
    this.h.onState("conectando");
    this.later(() => {
      this.up = true;
      this.h.onState("conectado");
      clearInterval(this.status);
      this.status = setInterval(() => {
        if (!this.up) return;
        const s = sim.fakeStatus();
        this.h.onMessage({ t: "s", ...s, ok: 1, n: this.seq });
      }, 500);
    }, 450);
  }

  send(m: OutMsg) {
    if (!this.up) return;
    if (m.t === "c") {
      this.seq = m.n;
      sim.command(m.x, m.y, m.v);
    } else if (m.t === "p") {
      if (Math.random() < 0.01) return; // 1% de perda, para o contador não ficar sempre em zero
      const spike = Math.random() < 0.05 ? 120 : 0;
      this.later(() => this.up && this.h.onMessage(m), 28 + Math.random() * 45 + spike);
    } else if (m.t === "cfg") {
      sim.world.cfg = { vmax: m.vmax, ke: m.ke, kd: m.kd };
    }
  }

  simulateDrop(ms: number) {
    if (!this.up) return;
    this.up = false;
    clearInterval(this.status);
    sim.onDisconnect();
    this.h.onState("sem conexão");
    this.later(() => this.connect(), ms);
  }

  dispose() {
    this.disposed = true;
    this.up = false;
    clearInterval(this.status);
    this.timers.forEach(clearTimeout);
    sim.stop();
  }

  private later(fn: () => void, ms: number) {
    this.timers.push(setTimeout(fn, ms));
  }
}
