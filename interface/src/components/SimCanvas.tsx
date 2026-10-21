import { useEffect, useRef } from "react";
import { BALLOON_DIAMETER_M, CAMERA_FOV_DEG, RESOLUTION_PX, type Resolution } from "../config";
import { poseAt, world } from "../lib/sim";

/** "Câmera" do robô simulado: desenha a arena na resolução real do stream,
 *  no FPS típico de cada resolução e com o atraso configurado.
 *  Geometria: câmera a 23 cm do chão; balão com o centro a 21 cm (suporte de 10 cm + raio).
 *  Assim, no instante do estouro o balão aparece logo abaixo do centro do quadro,
 *  onde fica o ponto de estouro padrão da mira (Ajustes → Mira). */

const FOV = (CAMERA_FOV_DEG * Math.PI) / 180;
const CAM_H = 0.23;
const BALLOON_R = BALLOON_DIAMETER_M / 2;
const BALLOON_Y = 0.21;
const SUPPORT_TOP = 0.1;
const ARENA = 4;
const FPS: Record<Resolution, number> = { QVGA: 24, HVGA: 17, VGA: 11 };

// Cenário fixo por sessão (sementes simples, sem biblioteca).
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const STARS = Array.from({ length: 40 }, () => ({ a: rnd() * Math.PI * 2, e: 0.08 + rnd() * 0.4, s: rnd() }));
const FAR = Array.from({ length: 64 }, (_, i) => ({ a: (i / 64) * Math.PI * 2, w: 0.04 + rnd() * 0.07, h: 0.06 + rnd() * 0.2 }));
const NEAR = Array.from({ length: 40 }, (_, i) => ({
  a: (i / 40) * Math.PI * 2 + rnd() * 0.05,
  w: 0.06 + rnd() * 0.09,
  h: 0.04 + rnd() * 0.13,
  win: rnd(),
  tone: rnd() < 0.5 ? "0,255,255" : rnd() < 0.5 ? "255,90,170" : "255,184,0",
}));
const SHARDS = Array.from({ length: 14 }, () => ({ a: rnd() * Math.PI * 2, v: 0.6 + rnd() * 0.9, r: rnd() * Math.PI }));

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

type Props = { resolution: Resolution; delayMs: number; brightness: number; frozen: boolean; onFrame?: () => void };

export function SimCanvas({ resolution, delayMs, brightness, frozen, onFrame }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const props = useRef({ delayMs, brightness, frozen, onFrame });
  props.current = { delayMs, brightness, frozen, onFrame };

  useEffect(() => {
    const canvas = ref.current!;
    const [W, H] = RESOLUTION_PX[resolution];
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    const focal = W / 2 / Math.tan(FOV / 2);
    const horizon = H * 0.46;
    const u = W / 320;
    let raf = 0;
    let last = 0;

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const p = props.current;
      if (p.frozen || now - last < 1000 / FPS[resolution]) return;
      last = now;
      const pose = poseAt(p.delayMs);
      const fx = Math.sin(pose.h), fz = Math.cos(pose.h);
      const toCam = (x: number, z: number) => {
        const dx = x - pose.x, dz = z - pose.z;
        return { zc: dx * fx + dz * fz, xc: dx * fz - dz * fx };
      };
      const proj = (xc: number, zc: number, y: number) => ({ sx: W / 2 + (xc / zc) * focal, sy: horizon + ((CAM_H - y) / zc) * focal });
      const azimuthX = (a: number) => {
        const d = Math.atan2(Math.sin(a - pose.h), Math.cos(a - pose.h));
        return Math.abs(d) > FOV * 0.9 ? null : W / 2 + Math.tan(d) * focal;
      };
      const fog = (zc: number) => clamp01((zc - 2.5) / 6) * 0.75;


      // ── Céu, estrelas e prédios ao longe ──
      const sky = ctx.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, "#030209");
      sky.addColorStop(0.65, "#120a22");
      sky.addColorStop(1, "#2b1036");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, horizon);
      for (const s of STARS) {
        const x = azimuthX(s.a);
        if (x == null) continue;
        ctx.fillStyle = `rgba(255,255,255,${0.25 + s.s * 0.45})`;
        ctx.fillRect(x, horizon * (1 - s.e * 2), u * (s.s > 0.8 ? 1.5 : 1), u);
      }
      for (const b of FAR) {
        const x = azimuthX(b.a);
        if (x == null) continue;
        ctx.fillStyle = "#170e29";
        ctx.fillRect(x - (b.w * focal) / 2, horizon - b.h * H, b.w * focal, b.h * H);
      }
      for (const b of NEAR) {
        const x = azimuthX(b.a);
        if (x == null) continue;
        const bw = b.w * focal, bh = b.h * H, left = x - bw / 2, top = horizon - bh;
        ctx.fillStyle = "#0b0716";
        ctx.fillRect(left, top, bw, bh);
        // janelas acesas
        ctx.fillStyle = `rgba(${b.tone},0.75)`;
        const step = 4 * u;
        for (let wy = top + step; wy < horizon - step; wy += step * 1.4) {
          for (let wx = left + step * 0.6; wx < left + bw - step * 0.6; wx += step) {
            if (((wx * 7 + wy * 13 + b.win * 97) | 0) % 5 === 0) ctx.fillRect(wx, wy, u, u);
          }
        }
        ctx.fillStyle = `rgba(${b.tone},0.9)`;
        ctx.fillRect(left, top, bw, Math.max(1, u));
      }
      // brilho no horizonte
      const glow = ctx.createLinearGradient(0, horizon - H * 0.14, 0, horizon + H * 0.05);
      glow.addColorStop(0, "rgba(255,40,140,0)");
      glow.addColorStop(0.75, "rgba(255,60,150,0.28)");
      glow.addColorStop(1, "rgba(255,60,150,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, horizon - H * 0.14, W, H * 0.19);

      // ── Chão ──
      const ground = ctx.createLinearGradient(0, horizon, 0, H);
      ground.addColorStop(0, "#1b1029");
      ground.addColorStop(0.35, "#120f1c");
      ground.addColorStop(1, "#0b0b10");
      ctx.fillStyle = ground;
      ctx.fillRect(0, horizon, W, H - horizon);

      // Linha 3D no chão: um traço só, com gradiente que some na névoa ao longe.
      const line = (x1: number, z1: number, x2: number, z2: number, rgb: string, alpha: number, width: number) => {
        const pts: { sx: number; sy: number; zc: number }[] = [];
        for (let i = 0; i <= 16; i++) {
          const t = i / 16;
          const c = toCam(x1 + (x2 - x1) * t, z1 + (z2 - z1) * t);
          if (c.zc < 0.06) {
            if (pts.length) break;
            continue;
          }
          pts.push({ ...proj(c.xc, c.zc, 0), zc: c.zc });
        }
        if (pts.length < 2) return;
        const a0 = pts[0], a1 = pts[pts.length - 1];
        const g = ctx.createLinearGradient(a0.sx, a0.sy, a1.sx, a1.sy);
        g.addColorStop(0, `rgba(${rgb},${alpha * (1 - fog(a0.zc))})`);
        g.addColorStop(1, `rgba(${rgb},${alpha * (1 - fog(a1.zc))})`);
        ctx.strokeStyle = g;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(a0.sx, a0.sy);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].sx, pts[i].sy);
        ctx.stroke();
      };
      for (let k = -8; k <= 8; k++) {
        const major = k % 2 === 0;
        line(k * 0.5, -ARENA, k * 0.5, ARENA, "0,255,255", major ? 0.32 : 0.13, u * (major ? 1 : 0.7));
        line(-ARENA, k * 0.5, ARENA, k * 0.5, "0,255,255", major ? 0.32 : 0.13, u * (major ? 1 : 0.7));
      }

      // Mureta da arena com faixas de risco
      const wall = (x1: number, z1: number, x2: number, z2: number) => {
        const n = 32;
        for (let i = 0; i < n; i++) {
          const a = toCam(x1 + ((x2 - x1) * i) / n, z1 + ((z2 - z1) * i) / n);
          const b = toCam(x1 + ((x2 - x1) * (i + 1)) / n, z1 + ((z2 - z1) * (i + 1)) / n);
          if (a.zc < 0.1 || b.zc < 0.1) continue;
          const a0 = proj(a.xc, a.zc, 0), a1 = proj(a.xc, a.zc, 0.07), b0 = proj(b.xc, b.zc, 0), b1 = proj(b.xc, b.zc, 0.07);
          const f = 1 - fog((a.zc + b.zc) / 2);
          ctx.fillStyle = i % 2 ? `rgba(202,53,53,${0.75 * f})` : `rgba(20,10,14,${0.85 * f})`;
          ctx.beginPath();
          ctx.moveTo(a0.sx, a0.sy);
          ctx.lineTo(b0.sx, b0.sy);
          ctx.lineTo(b1.sx, b1.sy);
          ctx.lineTo(a1.sx, a1.sy);
          ctx.fill();
          ctx.strokeStyle = `rgba(255,107,154,${0.9 * f})`;
          ctx.lineWidth = u;
          ctx.beginPath();
          ctx.moveTo(a1.sx, a1.sy);
          ctx.lineTo(b1.sx, b1.sy);
          ctx.stroke();
        }
      };
      wall(-ARENA, -ARENA, ARENA, -ARENA);
      wall(ARENA, -ARENA, ARENA, ARENA);
      wall(ARENA, ARENA, -ARENA, ARENA);
      wall(-ARENA, ARENA, -ARENA, -ARENA);

      // névoa baixa no horizonte
      const haze = ctx.createLinearGradient(0, horizon, 0, horizon + H * 0.16);
      haze.addColorStop(0, "rgba(43,16,54,0.85)");
      haze.addColorStop(1, "rgba(43,16,54,0)");
      ctx.fillStyle = haze;
      ctx.fillRect(0, horizon, W, H * 0.16);

      // ── Objetos: balões da arena e o adversário, do mais longe para o mais perto ──
      const t = performance.now();
      type Obj = { zc: number; xc: number; draw: (xc: number, zc: number) => void };
      const objs: Obj[] = [];
      for (const b of world.balloons) {
        const c = toCam(b.x, b.z);
        if (c.zc > 0.08) objs.push({ ...c, draw: (xc, zc) => drawBalloonOnSupport(xc, zc, b.color, b.poppedAt) });
      }
      const rv = world.rival;
      const rc = toCam(rv.x, rv.z);
      if (rc.zc > 0.12) objs.push({ ...rc, draw: (xc, zc) => drawRival(xc, zc, rv.poppedAt) });
      objs.sort((a, b) => b.zc - a.zc);

      function shadow(xc: number, zc: number, r: number) {
        const g = proj(xc, zc, 0);
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.beginPath();
        ctx.ellipse(g.sx, g.sy, r, r * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      function balloon(xc: number, zc: number, color: "azul" | "vermelho", poppedAt: number, y = BALLOON_Y) {
        const c = proj(xc, zc, y);
        const r = (BALLOON_R / zc) * focal;
        if (c.sx < -r * 2 || c.sx > W + r * 2) return;
        if (poppedAt) {
          const age = (t - poppedAt) / 1000;
          if (age > 0.7) return;
          if (age < 0.12) {
            ctx.strokeStyle = `rgba(255,255,255,${1 - age / 0.12})`;
            ctx.lineWidth = 2 * u;
            ctx.beginPath();
            ctx.arc(c.sx, c.sy, r * (1 + age * 6), 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.fillStyle = color === "azul" ? "#3b86ff" : "#ff3b4e";
          for (const s of SHARDS) {
            const d = r * (0.4 + s.v * age * 4);
            const sx = c.sx + Math.cos(s.a) * d;
            const sy = c.sy + Math.sin(s.a) * d + age * age * 400 * u * (r / 40);
            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(s.r + age * 8);
            ctx.globalAlpha = 1 - age / 0.7;
            ctx.fillRect(-r * 0.12, -r * 0.05, r * 0.24, r * 0.1);
            ctx.restore();
          }
          ctx.globalAlpha = 1;
          return;
        }
        const g = ctx.createRadialGradient(c.sx - r * 0.35, c.sy - r * 0.4, r * 0.05, c.sx, c.sy, r * 1.05);
        if (color === "azul") {
          g.addColorStop(0, "#cfe3ff");
          g.addColorStop(0.35, "#4d92ff");
          g.addColorStop(1, "#0b2f8a");
        } else {
          g.addColorStop(0, "#ffd0d5");
          g.addColorStop(0.35, "#ff3b4e");
          g.addColorStop(1, "#7a0717");
        }
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(c.sx, c.sy, r * 0.93, r, 0, 0, Math.PI * 2);
        ctx.fill();
        // nó
        ctx.beginPath();
        ctx.moveTo(c.sx - r * 0.1, c.sy + r * 1.08);
        ctx.lineTo(c.sx + r * 0.1, c.sy + r * 1.08);
        ctx.lineTo(c.sx, c.sy + r * 0.95);
        ctx.fill();
        // brilho especular
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.beginPath();
        ctx.ellipse(c.sx - r * 0.38, c.sy - r * 0.45, r * 0.16, r * 0.24, -0.6, 0, Math.PI * 2);
        ctx.fill();
      }

      function drawBalloonOnSupport(xc: number, zc: number, color: "azul" | "vermelho", poppedAt: number) {
        const r = (BALLOON_R / zc) * focal;
        ctx.globalAlpha = 1 - fog(zc);
        shadow(xc, zc, r * 0.8);
        // suporte: base e haste até o nó
        const base = proj(xc, zc, 0), top = proj(xc, zc, SUPPORT_TOP);
        ctx.fillStyle = "#2a2d36";
        ctx.beginPath();
        ctx.ellipse(base.sx, base.sy, r * 0.45, r * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#7d8494";
        ctx.lineWidth = Math.max(1, r * 0.09);
        ctx.beginPath();
        ctx.moveTo(base.sx, base.sy);
        ctx.lineTo(top.sx, top.sy);
        ctx.stroke();
        balloon(xc, zc, color, poppedAt);
        ctx.globalAlpha = 1;
      }

      function drawRival(xc: number, zc: number, poppedAt: number) {
        const k = focal / zc;
        const bw = 0.2 * k, bh = 0.09 * k;
        const g = proj(xc, zc, 0);
        if (g.sx < -bw || g.sx > W + bw) return;
        ctx.globalAlpha = 1 - fog(zc);
        shadow(xc, zc, bw * 0.6);
        // rodas
        ctx.fillStyle = "#08080a";
        ctx.fillRect(g.sx - bw * 0.55, g.sy - bh * 0.55, bw * 0.16, bh * 0.55);
        ctx.fillRect(g.sx + bw * 0.39, g.sy - bh * 0.55, bw * 0.16, bh * 0.55);
        // chassi
        const body = ctx.createLinearGradient(0, g.sy - bh * 1.15, 0, g.sy - bh * 0.15);
        body.addColorStop(0, "#3a3f4a");
        body.addColorStop(1, "#15171c");
        ctx.fillStyle = body;
        ctx.fillRect(g.sx - bw / 2, g.sy - bh * 1.15, bw, bh);
        // faixa de LED e mecanismo frontal
        ctx.fillStyle = "#00ffff";
        ctx.fillRect(g.sx - bw * 0.4, g.sy - bh * 0.7, bw * 0.8, Math.max(1, bh * 0.08));
        ctx.fillStyle = "#ff2a3d";
        ctx.fillRect(g.sx - bw * 0.46, g.sy - bh * 1.05, bw * 0.08, bh * 0.12);
        ctx.fillRect(g.sx + bw * 0.38, g.sy - bh * 1.05, bw * 0.08, bh * 0.12);
        // suporte do balão
        const s0 = proj(xc, zc, 0.09), s1 = proj(xc, zc, SUPPORT_TOP);
        ctx.strokeStyle = "#7d8494";
        ctx.lineWidth = Math.max(1, k * 0.008);
        ctx.beginPath();
        ctx.moveTo(s0.sx, s0.sy);
        ctx.lineTo(s1.sx, s1.sy);
        ctx.stroke();
        balloon(xc, zc, "vermelho", poppedAt);
        ctx.globalAlpha = 1;
      }

      for (const o of objs) o.draw(o.xc, o.zc);

      // ── Frente do próprio robô: borda do chassi e a ponta do mecanismo ──
      const ch = H * 0.07;
      ctx.fillStyle = "#101114";
      ctx.beginPath();
      ctx.moveTo(0, H);
      ctx.lineTo(W * 0.1, H - ch);
      ctx.lineTo(W * 0.9, H - ch);
      ctx.lineTo(W, H);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.rect(W * 0.1, H - ch, W * 0.8, ch * 0.28);
      ctx.clip();
      for (let x = W * 0.1 - ch; x < W * 0.9; x += 8 * u) {
        ctx.fillStyle = "#ca3535";
        ctx.beginPath();
        ctx.moveTo(x, H - ch + ch * 0.28);
        ctx.lineTo(x + 4 * u, H - ch);
        ctx.lineTo(x + 8 * u, H - ch);
        ctx.lineTo(x + 4 * u, H - ch + ch * 0.28);
        ctx.fill();
      }
      ctx.restore();
      const spike = ctx.createLinearGradient(W / 2 - 10 * u, 0, W / 2 + 10 * u, 0);
      spike.addColorStop(0, "#2b2e36");
      spike.addColorStop(0.5, "#c9d1d9");
      spike.addColorStop(1, "#2b2e36");
      ctx.fillStyle = spike;
      ctx.beginPath();
      ctx.moveTo(W / 2 - 9 * u, H - ch * 0.6);
      ctx.lineTo(W / 2, H * 0.8);
      ctx.lineTo(W / 2 + 9 * u, H - ch * 0.6);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillRect(W / 2 - u * 0.5, H * 0.8, u, 2 * u);

      p.onFrame?.();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [resolution]);

  return <canvas ref={ref} className="feed" style={{ filter: brightness ? `brightness(${1 + brightness * 0.18})` : undefined }} aria-label="Câmera do robô simulado" />;
}
