import { useEffect, useRef, useState } from "react";
import { DRIVE_KEYS, hasGamepad, isFormTarget } from "../lib/input";

/**
 * Teclado + controle. Corrige dois bugs da versão anterior:
 * - setas e espaço não funcionavam dentro do campo de endereço (preventDefault global);
 * - auto-repetição do teclado gerava dezenas de renderizações por segundo.
 */
export function useInput(onRelease: () => void, onShortcut: (code: string) => void) {
  const keys = useRef(new Set<string>());
  const [pressed, setPressed] = useState<Set<string>>(new Set());
  const [gamepad, setGamepad] = useState(false);
  const release = useRef(onRelease);
  const shortcut = useRef(onShortcut);
  release.current = onRelease;
  shortcut.current = onShortcut;

  useEffect(() => {
    const sync = () => setPressed(new Set(keys.current));
    const down = (e: KeyboardEvent) => {
      if (isFormTarget(e.target)) return;
      if (DRIVE_KEYS.has(e.code)) {
        e.preventDefault();
        if (e.repeat || keys.current.has(e.code)) return;
        keys.current.add(e.code);
        sync();
      } else if (!e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) {
        shortcut.current(e.code);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (DRIVE_KEYS.has(e.code) && !isFormTarget(e.target)) e.preventDefault();
      if (keys.current.delete(e.code)) sync();
    };
    // Janela perdeu o foco (Alt+Tab, notificação): solta tudo e manda parar.
    const lost = () => {
      if (keys.current.size) {
        keys.current.clear();
        sync();
      }
      release.current();
    };
    const vis = () => document.visibilityState === "hidden" && lost();
    const pad = () => setGamepad(hasGamepad());

    addEventListener("keydown", down);
    addEventListener("keyup", up);
    addEventListener("blur", lost);
    document.addEventListener("visibilitychange", vis);
    addEventListener("gamepadconnected", pad);
    addEventListener("gamepaddisconnected", pad);
    pad();
    return () => {
      removeEventListener("keydown", down);
      removeEventListener("keyup", up);
      removeEventListener("blur", lost);
      document.removeEventListener("visibilitychange", vis);
      removeEventListener("gamepadconnected", pad);
      removeEventListener("gamepaddisconnected", pad);
    };
  }, []);

  return { keys, pressed, gamepad };
}
