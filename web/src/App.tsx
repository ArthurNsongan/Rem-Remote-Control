import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Keyboard as KeyboardIcon,
  Music,
  MousePointer2,
  Power,
  LogOut,
  MonitorPlay,
  LayoutGrid,
  Rows3,
  Check,
  Camera,
  Volume2,
  Mic,
} from "lucide-react";
import type { ClientMessage } from "@shared/protocol";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/ui/tabs";
import { Badge } from "@shared/ui/badge";
import { Button } from "@shared/ui/button";
import { cn } from "@shared/cn";
import {
  RemSocket,
  savedToken,
  clearToken,
  fetchPublic,
  type ConnState,
  type PublicInfo,
} from "./lib/socket";
import Pairing from "./components/Pairing";
import Touchpad from "./components/Touchpad";
import Keyboard from "./components/Keyboard";
import LiveKeyboard from "./components/LiveKeyboard";
import Media from "./components/Media";
import SystemPanel from "./components/SystemPanel";
import VideoScreen from "./components/VideoScreen";
import CameraView from "./components/CameraView";
import AudioListen from "./components/AudioListen";

type Mode = "traditional" | "custom";
type ModuleId =
  | "trackpad"
  | "keyboard"
  | "video"
  | "camera"
  | "audio_pc"
  | "mic"
  | "media"
  | "system";

const MODULES: { id: ModuleId; label: string; icon: React.ReactNode }[] = [
  { id: "trackpad", label: "Trackpad", icon: <MousePointer2 className="h-4 w-4" /> },
  { id: "keyboard", label: "Clavier live", icon: <KeyboardIcon className="h-4 w-4" /> },
  { id: "video", label: "Écran", icon: <MonitorPlay className="h-4 w-4" /> },
  { id: "camera", label: "Caméra", icon: <Camera className="h-4 w-4" /> },
  { id: "audio_pc", label: "Audio PC", icon: <Volume2 className="h-4 w-4" /> },
  { id: "mic", label: "Micro PC", icon: <Mic className="h-4 w-4" /> },
  { id: "media", label: "Média", icon: <Music className="h-4 w-4" /> },
  { id: "system", label: "Système", icon: <Power className="h-4 w-4" /> },
];

function loadModules(): Record<ModuleId, boolean> {
  const defaults: Record<ModuleId, boolean> = {
    trackpad: true,
    keyboard: true,
    video: false,
    camera: false,
    audio_pc: false,
    mic: false,
    media: false,
    system: false,
  };
  try {
    const raw = localStorage.getItem("rem_modules");
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return defaults;
}

export default function App() {
  const [token, setToken] = useState<string | null>(savedToken());
  const [state, setState] = useState<ConnState>("closed");
  const [mode, setMode] = useState<Mode>(
    (localStorage.getItem("rem_mode") as Mode) || "traditional"
  );
  const [modules, setModules] = useState<Record<ModuleId, boolean>>(loadModules);
  const [pub, setPub] = useState<PublicInfo>({ video: false, video_available: false });
  const sockRef = useRef<RemSocket | null>(null);

  useEffect(() => {
    if (!token) return;
    const sock = new RemSocket(token, setState, () => setToken(null));
    sockRef.current = sock;
    sock.connect();
    return () => sock.close();
  }, [token]);

  // poll video availability when relevant
  useEffect(() => {
    if (!token) return;
    const needs =
      mode === "custom" &&
      (modules.video || modules.camera || modules.audio_pc || modules.mic);
    if (!needs) return;
    let alive = true;
    const tick = async () => {
      const p = await fetchPublic();
      if (alive) setPub(p);
    };
    tick();
    const t = setInterval(tick, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [token, mode, modules.video, modules.camera, modules.audio_pc, modules.mic]);

  const send = useCallback<(msg: ClientMessage) => void>((msg) => {
    sockRef.current?.send(msg);
  }, []);

  const logout = () => {
    sockRef.current?.close();
    clearToken();
    setToken(null);
  };

  const setModeP = (m: Mode) => {
    setMode(m);
    localStorage.setItem("rem_mode", m);
  };

  const toggleModule = (id: ModuleId) => {
    setModules((m) => {
      const next = { ...m, [id]: !m[id] };
      localStorage.setItem("rem_modules", JSON.stringify(next));
      return next;
    });
  };

  const statusBadge = useMemo(() => {
    if (state === "open") return <Badge variant="online">Connecté</Badge>;
    if (state === "connecting") return <Badge variant="default">Connexion…</Badge>;
    return <Badge variant="offline">Déconnecté</Badge>;
  }, [state]);

  if (!token) return <Pairing onPaired={() => setToken(savedToken())} />;

  const activeModules = MODULES.filter((m) => modules[m.id]);
  const tok = savedToken() || "";
  // le trackpad ne remplit l'écran que s'il n'y a pas de gros module visuel
  const fillTrackpad = !modules.video && !modules.camera;

  return (
    <div className="relative mx-auto flex h-[100dvh] max-w-xl flex-col overflow-hidden px-4 py-4">
      <div className="pointer-events-none fixed inset-0 grid-overlay opacity-20" />

      {/* Header */}
      <header className="relative mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-glow">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <h1 className="font-sans text-lg font-bold tracking-tight">REM</h1>
        </div>
        <div className="flex items-center gap-2">
          {statusBadge}
          <Button variant="ghost" size="icon" onClick={logout} title="Déconnexion">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Mode switch */}
      <div className="relative mb-3 grid grid-cols-2 gap-1.5 rounded-2xl glass p-1.5">
        <button
          onClick={() => setModeP("traditional")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl py-2 font-sans text-sm font-medium transition-all",
            mode === "traditional"
              ? "bg-primary/90 text-primary-foreground shadow-glow"
              : "text-muted-foreground"
          )}
        >
          <Rows3 className="h-4 w-4" /> Traditionnel
        </button>
        <button
          onClick={() => setModeP("custom")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl py-2 font-sans text-sm font-medium transition-all",
            mode === "custom"
              ? "bg-primary/90 text-primary-foreground shadow-glow"
              : "text-muted-foreground"
          )}
        >
          <LayoutGrid className="h-4 w-4" /> Custom
        </button>
      </div>

      {mode === "traditional" ? (
        <Tabs defaultValue="touchpad" className="relative flex min-h-0 flex-1 flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="touchpad">
              <MousePointer2 className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="keyboard">
              <KeyboardIcon className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="media">
              <Music className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="system">
              <Power className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <TabsContent value="touchpad">
              <Touchpad send={send} />
            </TabsContent>
            <TabsContent value="keyboard">
              <Keyboard send={send} />
            </TabsContent>
            <TabsContent value="media">
              <Media send={send} />
            </TabsContent>
            <TabsContent value="system">
              <SystemPanel send={send} />
            </TabsContent>
          </div>
        </Tabs>
      ) : (
        <div className="relative flex min-h-0 flex-1 flex-col">
          {/* module picker */}
          <div className="mb-3 flex flex-wrap gap-2">
            {MODULES.map((m) => (
              <button
                key={m.id}
                onClick={() => toggleModule(m.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-sans text-xs transition-all",
                  modules[m.id]
                    ? "border-primary/40 bg-primary/20 text-primary-foreground"
                    : "border-white/10 bg-white/[0.03] text-muted-foreground"
                )}
              >
                {modules[m.id] ? <Check className="h-3.5 w-3.5" /> : m.icon}
                {m.label}
              </button>
            ))}
          </div>

          {/* assembled modules */}
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-2">
            {activeModules.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Choisis au moins un module ci-dessus
              </p>
            )}
            {modules.video && (
              <VideoScreen
                send={send}
                token={tok}
                enabled={pub.video}
                available={pub.video_available}
              />
            )}
            {modules.camera && (
              <CameraView token={tok} available={pub.camera_available} />
            )}
            {modules.audio_pc && (
              <AudioListen src="system" token={tok} available={pub.audio_available} />
            )}
            {modules.mic && (
              <AudioListen src="mic" token={tok} available={pub.audio_available} />
            )}
            {modules.trackpad && (
              <div className={fillTrackpad ? "min-h-0 flex-1" : ""}>
                <Touchpad send={send} fill={fillTrackpad} />
              </div>
            )}
            {modules.keyboard && <LiveKeyboard send={send} />}
            {modules.media && <Media send={send} />}
            {modules.system && <SystemPanel send={send} />}
          </div>
        </div>
      )}
    </div>
  );
}
