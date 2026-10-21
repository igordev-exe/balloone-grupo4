"""Robô falso: imita a ESP32 do Balloone no protocolo do Guia (seção 5.4).

Serve para testar a interface sem a placa, pelo WebSocket de verdade
(o modo "Simulador" da interface não passa pela rede; este script passa).

    pip install websockets pillow
    python tools/robo_falso.py                # WebSocket em :8080/ws, vídeo em :8081/stream
    python tools/robo_falso.py --perda 0.05 --atraso 40

Na interface: "Robô real", endereço 127.0.0.1, porta do WebSocket 8080, porta do vídeo 8081.

O que ele faz:
  - responde o ping na hora (com --atraso e --perda opcionais, para testar rede ruim);
  - manda status a cada 500 ms (rssi, bat, fps, ok, n);
  - aplica a mistura diferencial e mostra as rodas no terminal;
  - failsafe: para quando a conexão cai e após 500 ms sem comando, e avisa no terminal;
  - conta comandos perdidos pelo número de sequência (n).
"""

import argparse
import asyncio
import io
import json
import random
import time

try:
    from websockets.asyncio.server import serve
except ImportError:  # websockets < 13
    from websockets import serve  # type: ignore

SILENCIO_S = 0.5
DEADZONE = 0.08


def clamp(v, a=-1.0, b=1.0):
    return max(a, min(b, v))


class Robo:
    def __init__(self, args):
        self.args = args
        self.esq = 0.0
        self.dir = 0.0
        self.ultimo_cmd = 0.0
        self.seq = -1
        self.perdidos = 0
        self.bat = 8.2
        self.cfg = {"vmax": 0.8, "ke": 1.0, "kd": 1.0}
        self.ultimo_print = 0.0
        self.cliente = None

    def parar(self, motivo):
        if self.esq or self.dir:
            print(f"\n  FAILSAFE: {motivo} -> motores parados")
        self.esq = self.dir = 0.0

    def comando(self, m):
        n = int(m.get("n", 0))
        if self.seq >= 0 and n > self.seq + 1:
            self.perdidos += n - self.seq - 1
        self.seq = max(self.seq, n)
        self.ultimo_cmd = time.monotonic()
        x = float(m.get("x", 0))
        y = float(m.get("y", 0))
        v = float(m.get("v", 0))
        x = 0 if abs(x) < DEADZONE else x
        y = 0 if abs(y) < DEADZONE else y
        # Mesma mistura do firmware: esquerdo = y + x, direito = y - x
        self.esq = clamp(clamp(y + x) * v * self.cfg["vmax"] * self.cfg["ke"])
        self.dir = clamp(clamp(y - x) * v * self.cfg["vmax"] * self.cfg["kd"])
        agora = time.monotonic()
        if agora - self.ultimo_print > 0.2:
            self.ultimo_print = agora
            print(f"\r  rodas  E {self.esq:+.2f}  D {self.dir:+.2f}   n {n:6d}   perdidos {self.perdidos:4d}   ", end="", flush=True)

    def status(self):
        self.bat = max(6.4, self.bat - 0.0004 - 0.002 * (abs(self.esq) + abs(self.dir)) / 2)
        return {"t": "s", "rssi": random.randint(-62, -44), "bat": round(self.bat, 2), "fps": random.randint(17, 22), "ok": 1 if time.monotonic() - self.ultimo_cmd <= SILENCIO_S else 0, "n": self.seq}


async def cliente(ws, robo: Robo, args):
    caminho = getattr(getattr(ws, "request", None), "path", None) or getattr(ws, "path", "?")
    print(f"\n+ interface conectada ({caminho})")
    # Um operador por vez (protocolo.md, seção 2): o cliente mais novo derruba o anterior.
    if robo.cliente is not None and robo.cliente is not ws:
        print("  outro cliente conectou: fechando o anterior")
        await robo.cliente.close()
    robo.cliente = ws
    robo.seq = -1

    async def enviar_status():
        while True:
            await asyncio.sleep(0.5)
            await ws.send(json.dumps(robo.status()))

    async def vigiar_silencio():
        while True:
            await asyncio.sleep(0.05)
            if time.monotonic() - robo.ultimo_cmd > SILENCIO_S:
                robo.parar("500 ms sem comando")

    async def ecoar(m):
        if args.atraso:
            await asyncio.sleep(args.atraso / 1000)
        await ws.send(json.dumps(m))

    tarefas = [asyncio.create_task(enviar_status()), asyncio.create_task(vigiar_silencio())]
    try:
        async for bruto in ws:
            try:
                m = json.loads(bruto)
            except ValueError:
                print(f"\n  mensagem inválida: {bruto!r}")
                continue
            t = m.get("t")
            if t == "c":
                robo.comando(m)
            elif t == "p":
                if random.random() >= args.perda:
                    asyncio.create_task(ecoar(m))
            elif t == "cfg":
                robo.cfg = {"vmax": float(m.get("vmax", 0.8)), "ke": float(m.get("ke", 1)), "kd": float(m.get("kd", 1))}
                print(f"\n  cfg recebida: canal {m.get('ch')}, {robo.cfg}")
    except Exception as e:  # conexão caiu no meio
        print(f"\n  erro: {e}")
    finally:
        for t in tarefas:
            t.cancel()
        if robo.cliente is ws:
            robo.cliente = None
        robo.parar("conexão caiu")
        print("\n- interface desconectada")


async def mjpeg(reader, writer, args):
    """Stream MJPEG simples (como o CameraWebServer), com um relógio em ms no quadro."""
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        writer.close()
        return
    await reader.readuntil(b"\r\n\r\n")
    writer.write(b"HTTP/1.1 200 OK\r\nContent-Type: multipart/x-mixed-replace; boundary=frame\r\nAccess-Control-Allow-Origin: *\r\n\r\n")
    try:
        while True:
            img = Image.new("RGB", (320, 240), (8, 12, 22))
            d = ImageDraw.Draw(img)
            for x in range(0, 320, 20):
                d.line([(x, 0), (x, 240)], fill=(0, 60, 70))
            ms = int(time.time() * 1000) % 100000
            d.text((12, 12), "ROBO FALSO", fill=(0, 240, 255))
            d.text((12, 110), f"{ms:05d} ms", fill=(255, 255, 255))
            buf = io.BytesIO()
            img.save(buf, "JPEG", quality=70)
            jpg = buf.getvalue()
            writer.write(b"--frame\r\nContent-Type: image/jpeg\r\nContent-Length: " + str(len(jpg)).encode() + b"\r\n\r\n" + jpg + b"\r\n")
            await writer.drain()
            await asyncio.sleep(1 / 20)
    except (ConnectionError, asyncio.CancelledError):
        pass
    finally:
        writer.close()


async def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--porta", type=int, default=8080, help="porta do WebSocket (padrão 8080)")
    p.add_argument("--porta-video", type=int, default=8081, help="porta do MJPEG (padrão 8081; 0 desliga)")
    p.add_argument("--perda", type=float, default=0.0, help="fração de pings descartados, ex.: 0.05")
    p.add_argument("--atraso", type=int, default=0, help="atraso extra no eco do ping, em ms")
    args = p.parse_args()
    robo = Robo(args)
    print(f"Robô falso: ws://127.0.0.1:{args.porta}/ws", end="")
    servers = []
    if args.porta_video:
        servers.append(await asyncio.start_server(lambda r, w: mjpeg(r, w, args), "0.0.0.0", args.porta_video))
        print(f"   vídeo: http://127.0.0.1:{args.porta_video}/stream", end="")
    print("\nCtrl+C para sair.")
    async with serve(lambda ws, *rest: cliente(ws, robo, args), "0.0.0.0", args.porta):
        await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nencerrado")
