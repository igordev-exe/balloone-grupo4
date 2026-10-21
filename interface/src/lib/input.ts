// Leitura de teclado e controle de videogame, já convertida em comando x/y/v.

import { DEADZONE, PRECISION_TURN, SPEED } from "../config";

export type Mode = "precisao" | "normal" | "turbo";
export type Drive = { x: number; y: number; v: number; mode: Mode; stop: boolean; source: "teclado" | "controle" | null };

export const IDLE: Drive = { x: 0, y: 0, v: SPEED.normal, mode: "normal", stop: false, source: null };

/** Teclas que a interface usa. Só elas recebem preventDefault. */
export const DRIVE_KEYS = new Set([
  "KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
  "Space", "ShiftLeft", "ShiftRight", "KeyQ",
]);

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

/** Curva exponencial: suave perto do centro do analógico, forte nas pontas (Guia, seção 11). */
export function expoCurve(a: number, expo: number) {
  const m = Math.abs(a);
  if (m < DEADZONE) return 0;
  const n = (m - DEADZONE) / (1 - DEADZONE);
  return Math.sign(a) * (expo * n ** 3 + (1 - expo) * n);
}

function firstGamepad(): Gamepad | null {
  try {
    const pads = navigator.getGamepads?.() ?? [];
    for (const p of pads) if (p && p.connected) return p;
  } catch {
    /* Gamepad API bloqueada fora de contexto seguro */
  }
  return null;
}

const pressedBtn = (g: Gamepad, i: number) => !!g.buttons[i] && (g.buttons[i].pressed || g.buttons[i].value > 0.5);

/** Mapeamento padrão (Xbox/PlayStation): analógico esquerdo dirige, RT turbo, LT precisão, B/círculo para. */
export function readDrive(keys: Set<string>, expo: number): Drive {
  const has = (...c: string[]) => c.some((k) => keys.has(k));
  let x = (has("KeyD", "ArrowRight") ? 1 : 0) - (has("KeyA", "ArrowLeft") ? 1 : 0);
  let y = (has("KeyW", "ArrowUp") ? 1 : 0) - (has("KeyS", "ArrowDown") ? 1 : 0);
  let turbo = has("ShiftLeft", "ShiftRight");
  let precision = has("KeyQ");
  let stop = has("Space");
  let source: Drive["source"] = x || y ? "teclado" : null;

  const g = firstGamepad();
  if (g) {
    const gx = expoCurve(g.axes[0] ?? 0, expo);
    const gy = -expoCurve(g.axes[1] ?? 0, expo);
    if (gx || gy) {
      x = gx;
      y = gy;
      source = "controle";
    }
    turbo ||= pressedBtn(g, 7) || pressedBtn(g, 5);
    precision ||= pressedBtn(g, 6) || pressedBtn(g, 4);
    stop ||= pressedBtn(g, 1);
  }

  if (stop) return { x: 0, y: 0, v: 0, mode: "normal", stop: true, source };
  const mode: Mode = precision ? "precisao" : turbo ? "turbo" : "normal";
  if (mode === "precisao") x *= PRECISION_TURN;
  return { x: clamp(x), y: clamp(y), v: SPEED[mode], mode, stop: false, source };
}

export const hasGamepad = () => firstGamepad() !== null;

/** Campos de formulário recebem as teclas normalmente (digitar o IP, mover o cursor). */
export function isFormTarget(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return el.isContentEditable || ["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName);
}
