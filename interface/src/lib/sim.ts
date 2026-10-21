// Robô simulado: física simples de tração diferencial, com o mesmo failsafe do
// firmware (para em 500 ms sem comando e na hora em que a conexão cai).
// Serve para treinar o operador e testar a interface sem hardware.

import { BALLOON_DIAMETER_M, ROBOT_SILENCE_STOP_MS, DEADZONE, type Resolution } from "../config";

export type Balloon = { x: number; z: number; color: "azul" | "vermelho"; poppedAt: number };
type Pose = { t: number; x: number; z: number; h: number };

const ARENA = 4; // metade do lado, em metros
const TOP_SPEED = 1.0; // m/s com PWM máximo
const TURN_RATE = 2.4; // rad/s com uma roda em +1 e a outra em -1
const RAMP_PER_S = 5; // 10% a cada 20 ms, igual ao Guia

const clamp = (v: number, a = -1, b = 1) => Math.max(a, Math.min(b, v));
const rand = (a: number, b: number) => a + Math.random() * (b - a);

function spawnBalloon(color: Balloon["color"]): Balloon {
  return { x: rand(-ARENA + 0.5, ARENA - 0.5), z: rand(-ARENA + 0.5, ARENA - 0.5), color, poppedAt: 0 };
}

export const world = {
  pose: { x: 0, z: -2.5, h: 0 },
  wheels: { l: 0, r: 0 },
  target: { l: 0, r: 0 },
  lastCmd: 0,
  bat: 8.2,
  cfg: { vmax: 0.8, ke: 1, kd: 1 },
  resolution: "QVGA" as Resolution,
  history: [] as Pose[],
  balloons: [
    { x: 0.2, z: -1.2, color: "vermelho", poppedAt: 0 },
    { x: -0.9, z: -0.4, color: "azul", poppedAt: 0 },
    { x: 1.1, z: 0.3, color: "azul", poppedAt: 0 },
    { x: -1.6, z: 1.4, color: "vermelho", poppedAt: 0 },
    { x: 1.8, z: 2.2, color: "azul", poppedAt: 0 },
    { x: -0.3, z: 2.9, color: "azul", poppedAt: 0 },
  ] as Balloon[],
  /** Robô adversário: anda em círculo levando o próprio balão vermelho (vale 4). */
  rival: { x: 0, z: 0, h: 0, t: 0, poppedAt: 0 },
  timer: 0 as unknown as ReturnType<typeof setInterval>,
  running: false,
};

/** Mesmo cálculo que o firmware deve fazer em motores.cpp. */
export function command(x: number, y: number, v: number) {
  world.lastCmd = performance.now();
  const dz = (a: number) => (Math.abs(a) < DEADZONE ? 0 : a);
  const l = clamp(dz(y) + dz(x)) * v * world.cfg.vmax * world.cfg.ke;
  const r = clamp(dz(y) - dz(x)) * v * world.cfg.vmax * world.cfg.kd;
  world.target = { l: clamp(l), r: clamp(r) };
}

/** Camada 2 do failsafe: conexão caiu, para na hora. */
export function onDisconnect() {
  world.target = { l: 0, r: 0 };
  world.wheels = { l: 0, r: 0 };
}

function step(dt: number) {
  const now = performance.now();
  // Camada 3 do failsafe: silêncio.
  if (now - world.lastCmd > ROBOT_SILENCE_STOP_MS) world.target = { l: 0, r: 0 };
  const ramp = (cur: number, tgt: number) => cur + clamp(tgt - cur, -RAMP_PER_S * dt, RAMP_PER_S * dt);
  world.wheels.l = ramp(world.wheels.l, world.target.l);
  world.wheels.r = ramp(world.wheels.r, world.target.r);
  const { l, r } = world.wheels;
  const p = world.pose;
  const v = ((l + r) / 2) * TOP_SPEED;
  p.h += ((l - r) / 2) * TURN_RATE * dt;
  p.x = clamp(p.x + Math.sin(p.h) * v * dt, -ARENA, ARENA);
  p.z = clamp(p.z + Math.cos(p.h) * v * dt, -ARENA, ARENA);
  world.bat = Math.max(6.4, world.bat - dt * (0.0003 + 0.0015 * ((Math.abs(l) + Math.abs(r)) / 2)));

  // Estouro: balão logo à frente da ponta da arma.
  const fx = Math.sin(p.h), fz = Math.cos(p.h);
  for (const b of world.balloons) {
    if (b.poppedAt) {
      if (now - b.poppedAt > 6000) Object.assign(b, spawnBalloon(b.color));
      continue;
    }
    const dx = b.x - p.x, dz = b.z - p.z;
    const zc = dx * fx + dz * fz;
    const xc = dx * fz - dz * fx;
    if (zc > 0.02 && zc < 0.26 && Math.abs(xc) < BALLOON_DIAMETER_M / 2) b.poppedAt = now;
  }

  // Adversário: círculo de 2,2 m em volta do centro, meia volta a cada ~25 s.
  const rv = world.rival;
  rv.t += dt;
  const ang = rv.t * 0.12;
  rv.x = Math.cos(ang) * 2.2;
  rv.z = Math.sin(ang) * 2.2 + 0.6;
  rv.h = -ang;
  if (rv.poppedAt && now - rv.poppedAt > 8000) rv.poppedAt = 0;
  if (!rv.poppedAt) {
    const dx = rv.x - p.x, dz = rv.z - p.z;
    const zc = dx * fx + dz * fz;
    const xc = dx * fz - dz * fx;
    if (zc > 0.02 && zc < 0.3 && Math.abs(xc) < BALLOON_DIAMETER_M / 2) rv.poppedAt = now;
  }

  world.history.push({ t: now, x: p.x, z: p.z, h: p.h });
  while (world.history.length && now - world.history[0].t > 2000) world.history.shift();
}

export function start() {
  if (world.running) return;
  world.running = true;
  let last = performance.now();
  world.timer = setInterval(() => {
    const now = performance.now();
    step(Math.min(0.05, (now - last) / 1000));
    last = now;
  }, 20);
}

export function stop() {
  clearInterval(world.timer);
  world.running = false;
  onDisconnect();
}

/** Pose de alguns milissegundos atrás: é assim que o simulador imita a latência do vídeo. */
export function poseAt(delayMs: number): Pose {
  const t = performance.now() - delayMs;
  const h = world.history;
  for (let i = h.length - 1; i >= 0; i--) if (h[i].t <= t) return h[i];
  return h[0] ?? { t, ...world.pose };
}

/** Telemetria inventada, mas coerente: sinal cai com a distância, FPS depende da resolução. */
export function fakeStatus() {
  const d = Math.hypot(world.pose.x, world.pose.z + 4.5);
  const rssi = Math.round(-38 - 18 * Math.log10(1 + d) + rand(-3, 3));
  const base = { QVGA: 24, HVGA: 17, VGA: 11 }[world.resolution];
  const fps = Math.max(4, Math.round(base + rand(-2, 1.5) - Math.max(0, -60 - rssi) * 0.4));
  return { rssi, fps, bat: Math.round(world.bat * 100) / 100 };
}
