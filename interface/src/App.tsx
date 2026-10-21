import { useCallback, useEffect, useRef, useState } from "react";
import { BATTERY_LOW_V, COMMAND_INTERVAL_MS, FRAMESIZE, MOTOR_TEST_MS, ROUND_SECONDS, SPEED } from "./config";
import { Cockpit, type RoundState } from "./components/Cockpit";
import { Preflight, type MotorChecks } from "./components/Preflight";
import { SettingsDrawer } from "./components/SettingsDrawer";
import { StatusBar, type View } from "./components/StatusBar";
import { Telemetry } from "./components/Telemetry";
import { Toasts, type Toast } from "./components/Toasts";
import { useVideoHealth } from "./components/Video";
import { useInput } from "./hooks/useInput";
import { useRobot } from "./hooks/useRobot";
import { sounds } from "./lib/audio";
import { IDLE, readDrive, type Drive } from "./lib/input";
import { r2 } from "./lib/protocol";
import { controlUrl, loadSettings, saveSettings, type Settings } from "./lib/settings";

const sameDrive = (a: Drive, b: Drive) => a.x === b.x && a.y === b.y && a.v === b.v && a.mode === b.mode && a.stop === b.stop && a.source === b.source;

function stamp() {
  const d = new Date();
  const p = (v: number) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const update = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);
  useEffect(() => saveSettings(settings), [settings]);

  const [view, setView] = useState<View>("preflight");
  const [drawer, setDrawer] = useState(false);
  const robot = useRobot(settings);
  const video = useVideoHealth();
  const [drive, setDrive] = useState<Drive>(IDLE);
  const [motors, setMotors] = useState<MotorChecks>({ left: "pendente", right: "pendente" });
  const [testing, setTesting] = useState<"left" | "right" | null>(null);
  const [round, setRound] = useState<RoundState>({ seconds: ROUND_SECONDS, running: false, score: [] });
  const [fullscreen, setFullscreen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = ++toastId.current;
    setToasts((a) => [...a.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((a) => a.filter((x) => x.id !== id)), 4500);
  }, []);

  const seq = useRef(0);
  const motorTest = useRef<{ side: "left" | "right"; until: number } | null>(null);
  // Só a tela de pilotagem, com a gaveta fechada, move o robô. Nas outras, o laço manda zero.
  const armed = useRef(false);
  armed.current = view === "pilot" && !drawer;
  const expo = useRef(settings.expo);
  expo.current = settings.expo;

  const { send } = robot;
  const sendStop = useCallback(() => {
    send({ t: "c", x: 0, y: 0, v: 0, n: ++seq.current });
    setDrive(IDLE);
  }, [send]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  const input = useInput(sendStop, (code) => {
    if (code === "KeyF" && view === "pilot") toggleFullscreen();
  });

  // Laço de comando a 20 Hz. Manda comando sempre, inclusive zero: o robô só para
  // pelo failsafe de silêncio quando a interface realmente sumiu.
  useEffect(() => {
    if (robot.state !== "conectado") {
      setDrive(IDLE);
      return;
    }
    const id = setInterval(() => {
      let d: Drive = IDLE;
      const mt = motorTest.current;
      if (mt && performance.now() < mt.until) {
        // esquerdo = y + x, direito = y − x: com x = ±y só uma roda gira.
        d = { ...IDLE, y: 0.5, x: mt.side === "left" ? 0.5 : -0.5, v: SPEED.normal };
      } else {
        if (mt) {
          motorTest.current = null;
          setTesting(null);
        }
        if (armed.current) d = readDrive(input.keys.current, expo.current);
      }
      send({ t: "c", x: r2(d.x), y: r2(d.y), v: d.v, n: ++seq.current });
      setDrive((prev) => (sameDrive(prev, d) ? prev : d));
    }, COMMAND_INTERVAL_MS);
    return () => clearInterval(id);
  }, [robot.state, send, input.keys]);

  const testMotor = (side: "left" | "right") => {
    motorTest.current = { side, until: performance.now() + MOTOR_TEST_MS };
    setTesting(side);
  };

  // Troca de robô zera o autoteste dos motores.
  useEffect(() => setMotors({ left: "pendente", right: "pendente" }), [settings.simulate, settings.address]);

  // Alertas sonoros nas transições, não a cada atualização.
  const prevState = useRef(robot.state);
  const batWarned = useRef(false);
  useEffect(() => {
    const was = prevState.current;
    prevState.current = robot.state;
    const back = was !== "conectado" && robot.state === "conectado" && robot.reconnects > 0;
    if (back) toast({ tone: "cyan", title: "Conexão restabelecida", body: "O robô voltou a responder. Confira o vídeo antes de acelerar." });
    if (!settings.sound) return;
    if (was === "conectado" && robot.state !== "conectado") sounds.lost();
    if (back) sounds.back();
  }, [robot.state, robot.reconnects, settings.sound, toast]);
  useEffect(() => {
    if (robot.stale && settings.sound) sounds.warn();
  }, [robot.stale, settings.sound]);
  useEffect(() => {
    const b = robot.telem.bat;
    if (b == null) return;
    if (b < BATTERY_LOW_V && !batWarned.current) {
      batWarned.current = true;
      toast({ tone: "amber", title: "Bateria baixa", body: `${b.toFixed(2).replace(".", ",")} V. Traga o robô de volta e troque a bateria.` });
      if (settings.sound) sounds.warn();
    } else if (b > BATTERY_LOW_V + 0.1) batWarned.current = false;
  }, [robot.telem.bat, settings.sound, toast]);

  // Cronômetro do round
  useEffect(() => {
    if (!round.running) return;
    const id = setInterval(() => {
      setRound((r) => {
        if (r.seconds <= 1) return { ...r, seconds: 0, running: false };
        return { ...r, seconds: r.seconds - 1 };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [round.running]);
  useEffect(() => {
    if (round.seconds === 0 && settings.sound) sounds.warn();
  }, [round.seconds, settings.sound]);

  // Câmera real: aplica só o que mudou, pelo /control do CameraWebServer.
  const camPrev = useRef<Record<string, number>>({});
  useEffect(() => {
    if (settings.simulate) return;
    const wanted: Record<string, number> = {
      framesize: FRAMESIZE[settings.resolution],
      quality: settings.quality,
      brightness: settings.brightness,
      ae_level: settings.exposure,
    };
    const id = setTimeout(() => {
      for (const [k, v] of Object.entries(wanted)) {
        if (camPrev.current[k] === v) continue;
        camPrev.current[k] = v;
        fetch(controlUrl(settings, k, v), { mode: "no-cors" }).catch(() => {
          delete camPrev.current[k];
        });
      }
    }, 300);
    return () => clearTimeout(id);
  }, [settings]);
  useEffect(() => {
    if (robot.state === "conectado" && robot.reconnects === 0) camPrev.current = {};
  }, [robot.state, robot.reconnects]);

  // Tela sem apagar durante a pilotagem (Wake Lock só existe em localhost/HTTPS).
  useEffect(() => {
    if (view !== "pilot") return;
    let lock: { release: () => Promise<void> } | null = null;
    const ask = async () => {
      try {
        lock = await (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request("screen") ?? null;
      } catch {
        lock = null;
      }
    };
    const vis = () => document.visibilityState === "visible" && ask();
    void ask();
    document.addEventListener("visibilitychange", vis);
    return () => {
      document.removeEventListener("visibilitychange", vis);
      void lock?.release().catch(() => {});
    };
  }, [view]);

  useEffect(() => {
    const fs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", fs);
    return () => document.removeEventListener("fullscreenchange", fs);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.sun = settings.sunMode ? "on" : "off";
  }, [settings.sunMode]);

  // Gravação da tela de pilotagem (evidência para o relatório).
  const recorder = useRef<MediaRecorder | null>(null);
  const toggleRecording = async () => {
    if (recorder.current) {
      recorder.current.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false, preferCurrentTab: true } as DisplayMediaStreamOptions);
      const type = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((t) => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        recorder.current = null;
        setRecording(false);
        const url = URL.createObjectURL(new Blob(chunks, { type: "video/webm" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `${stamp()}_pilotagem.webm`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      };
      stream.getVideoTracks()[0]?.addEventListener("ended", () => rec.state !== "inactive" && rec.stop());
      rec.start(1000);
      recorder.current = rec;
      setRecording(true);
    } catch {
      setRecording(false);
    }
  };

  const closeDrawer = useCallback(() => setDrawer(false), []);
  const connected = robot.state === "conectado";

  return (
    <div className={`app-shell view-${view}`}>
      <StatusBar robot={robot} view={view} setView={setView} simulate={settings.simulate} />
      {view === "preflight" && (
        <Preflight robot={robot} settings={settings} update={update} video={video} motors={motors} setMotors={setMotors} testMotor={testMotor} testing={testing} onReady={() => setView("pilot")} openSettings={() => setDrawer(true)} />
      )}
      {view === "pilot" && (
        <Cockpit
          robot={robot}
          settings={settings}
          drive={drive}
          pressed={input.pressed}
          gamepad={input.gamepad}
          video={video}
          round={round}
          setRound={setRound}
          recording={recording}
          toggleRecording={toggleRecording}
          toggleSound={() => update({ sound: !settings.sound })}
          fullscreen={fullscreen}
          toggleFullscreen={toggleFullscreen}
          openSettings={() => setDrawer(true)}
        />
      )}
      {view === "telemetry" && <Telemetry robot={robot} />}
      <SettingsDrawer
        open={drawer}
        onClose={closeDrawer}
        settings={settings}
        update={update}
        connected={connected}
        testDrop={() => robot.drop(3000)}
        sendConfig={() => {
          send({ t: "cfg", ch: settings.channel, vmax: settings.vmax / 100, ke: r2(1 + settings.trimLeft / 100), kd: r2(1 + settings.trimRight / 100) });
          toast({ tone: "grey", title: "Ajustes enviados", body: `Canal ${settings.channel}, velocidade máxima ${settings.vmax}%. O robô não confirma o recebimento.` });
        }}
      />
      <Toasts items={toasts} dismiss={(id) => setToasts((a) => a.filter((x) => x.id !== id))} />
    </div>
  );
}
