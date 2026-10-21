// Alertas sonoros gerados na hora (sem arquivos): o operador está olhando o vídeo,
// então a queda de conexão precisa chegar também pelo ouvido.

let ctx: AudioContext | null = null;

/** O navegador só libera áudio depois de um clique. Chame isto em um onClick. */
export function unlockAudio() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    ctx = null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "square", gain = 0.08) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = ctx.currentTime + start;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sounds = {
  /** Conexão caiu: dois bipes descendo. */
  lost() {
    tone(880, 0, 0.16);
    tone(440, 0.2, 0.28);
  },
  /** Conexão voltou: dois bipes subindo, mais baixos. */
  back() {
    tone(660, 0, 0.09, "triangle", 0.06);
    tone(990, 0.11, 0.12, "triangle", 0.06);
  },
  /** Bateria baixa ou sinal instável: bipe triplo. */
  warn() {
    [0, 0.14, 0.28].forEach((s) => tone(1200, s, 0.08, "square", 0.05));
  },
};
