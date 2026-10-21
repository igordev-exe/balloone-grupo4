import { useCallback, useEffect, useRef, useState } from "react";
import { PING_INTERVAL_MS, STALE_AFTER_MS } from "../config";
import { SimLink, WsLink, type Link, type LinkState } from "../lib/link";
import type { InMsg, OutMsg } from "../lib/protocol";
import { wsUrl, type Settings } from "../lib/settings";
import { world } from "../lib/sim";

export type Telemetry = { rtt: number | null; fps: number | null; bat: number | null; rssi: number | null };
export type Sample = { t: number; rtt: number | null; fps: number; bat: number | null; rssi: number };
export type SessionRow = { iso: string; t: number; evento: string; rtt: number | null; fps: number | null; bat: number | null; rssi: number | null; perda: number };

const EMPTY: Telemetry = { rtt: null, fps: null, bat: null, rssi: null };
const HISTORY = 120; // 60 s de status a 2 por segundo
const PING_WINDOW = 30;
const PING_LOST_AFTER_MS = 2000;

export function median(a: number[]) {
  if (!a.length) return null;
  const s = [...a].sort((p, q) => p - q);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
export function percentile(a: number[], p: number) {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}

export function useRobot(settings: Settings) {
  const [state, setState] = useState<LinkState>("sem conexão");
  const [stale, setStale] = useState(false);
  const [telem, setTelem] = useState<Telemetry>(EMPTY);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [rtts, setRtts] = useState<number[]>([]);
  const [reconnects, setReconnects] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [loss, setLoss] = useState(0);
  const [everConnected, setEverConnected] = useState(false);

  const link = useRef<Link | null>(null);
  const stateRef = useRef<LinkState>("sem conexão");
  const lastMsgAt = useRef(0);
  const lastRtt = useRef<number | null>(null);
  const pingSeq = useRef(0);
  const pending = useRef(new Map<number, number>());
  const pingOutcomes = useRef<boolean[]>([]);
  const session = useRef<SessionRow[]>([]);
  const t0 = useRef(performance.now());

  const log = useCallback((evento: string, t: Partial<Telemetry> = {}) => {
    if (session.current.length > 50000) session.current.shift();
    session.current.push({
      iso: new Date().toISOString(),
      t: Math.round(performance.now() - t0.current) / 1000,
      evento,
      rtt: t.rtt ?? null,
      fps: t.fps ?? null,
      bat: t.bat ?? null,
      rssi: t.rssi ?? null,
      perda: Math.round(lossNow() * 10) / 10,
    });
  }, []);

  function lossNow() {
    const o = pingOutcomes.current;
    return o.length ? (100 * o.filter((ok) => !ok).length) / o.length : 0;
  }
  function recordPing(ok: boolean) {
    pingOutcomes.current.push(ok);
    if (pingOutcomes.current.length > PING_WINDOW) pingOutcomes.current.shift();
    setLoss(lossNow());
  }

  const onMessage = useCallback((m: InMsg) => {
    lastMsgAt.current = performance.now();
    if (m.t === "p") {
      if (!pending.current.has(m.n)) return; // eco atrasado de um ping já dado como perdido
      pending.current.delete(m.n);
      const rtt = Math.max(0, Date.now() - m.ts);
      lastRtt.current = rtt;
      setTelem((t) => ({ ...t, rtt }));
      setRtts((a) => [...a, rtt].slice(-HISTORY));
      recordPing(true);
      return;
    }
    const next = { rtt: lastRtt.current, fps: m.fps, bat: m.bat, rssi: m.rssi };
    setTelem(next);
    setSamples((a) => [...a, { t: Date.now(), ...next }].slice(-HISTORY));
    log("status", next);
  }, [log]);

  const onState = useCallback((s: LinkState) => {
    const prev = stateRef.current;
    stateRef.current = s;
    setState(s);
    if (s === "conectado") {
      lastMsgAt.current = performance.now();
      setEverConnected(true);
      setAttempts(0);
      log("conectado");
    } else if (s === "conectando") {
      setAttempts((n) => n + 1);
    } else if (prev === "conectado") {
      setReconnects((n) => n + 1);
      pending.current.clear();
      log("queda");
    }
  }, [log]);

  // Abre o link certo (simulado ou real) e fecha ao trocar de endereço.
  useEffect(() => {
    const h = { onState, onMessage };
    const l: Link = settings.simulate ? new SimLink(h) : new WsLink(wsUrl(settings), h);
    link.current = l;
    setTelem(EMPTY);
    lastRtt.current = null;
    l.connect();
    return () => {
      l.dispose();
      if (link.current === l) link.current = null;
      stateRef.current = "sem conexão";
      setState("sem conexão");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.simulate, settings.address, settings.wsPort, settings.wsPath, onState, onMessage]);

  useEffect(() => {
    world.resolution = settings.resolution;
  }, [settings.resolution]);

  // Ping de RTT e detecção de link instável.
  useEffect(() => {
    if (state !== "conectado") {
      setStale(false);
      return;
    }
    const ping = setInterval(() => {
      const now = Date.now();
      for (const [n, ts] of pending.current) {
        if (now - ts > PING_LOST_AFTER_MS) {
          pending.current.delete(n);
          recordPing(false);
        }
      }
      const n = ++pingSeq.current;
      pending.current.set(n, now);
      link.current?.send({ t: "p", n, ts: now });
    }, PING_INTERVAL_MS);
    const watch = setInterval(() => {
      setStale(performance.now() - lastMsgAt.current > STALE_AFTER_MS);
    }, 250);
    return () => {
      clearInterval(ping);
      clearInterval(watch);
    };
  }, [state]);

  const send = useCallback((m: OutMsg) => link.current?.send(m), []);
  const drop = useCallback((ms: number) => link.current?.simulateDrop(ms), []);
  const reconnect = useCallback(() => link.current?.connect(), []);

  return { state, stale, telem, samples, rtts, reconnects, attempts, loss, everConnected, session, send, drop, reconnect };
}

export type Robot = ReturnType<typeof useRobot>;
