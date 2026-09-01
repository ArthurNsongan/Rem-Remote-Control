import { useEffect, useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Power,
  Wifi,
  WifiOff,
  RefreshCw,
  Copy,
  Smartphone,
  Tablet,
  Monitor,
  ShieldCheck,
  Settings as SettingsIcon,
  Check,
  Link2,
} from "lucide-react";
import { api, type ServerInfo, type DeviceInfo } from "./lib/tauri";
import TitleBar from "./components/TitleBar";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
import { Button } from "@shared/ui/button";
import { Badge } from "@shared/ui/badge";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { Switch } from "@shared/ui/switch";
import { MonitorPlay, Camera, Mic, Volume2 } from "lucide-react";
import { cn } from "@shared/cn";

function Backdrop() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 grid-overlay opacity-40" />
      <div className="pointer-events-none absolute -left-32 top-0 h-80 w-80 rounded-full bg-primary/30 blur-[120px] animate-float" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-accent/25 blur-[120px] animate-float [animation-delay:-6s]" />
    </>
  );
}

function deviceIcon(ua: string) {
  const u = ua.toLowerCase();
  if (/mobile|iphone|android/.test(u)) return Smartphone;
  if (/ipad|tablet/.test(u)) return Tablet;
  return Monitor;
}

function timeAgo(unix: number) {
  const s = Math.max(0, Math.floor(Date.now() / 1000 - unix));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  return `${Math.floor(s / 3600)}h`;
}

export default function App() {
  const [info, setInfo] = useState<ServerInfo | null>(null);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const [portInput, setPortInput] = useState("9847");
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const i = await api.getServerInfo();
      setInfo(i);
      setPortInput((p) => (document.activeElement?.id === "port" ? p : String(i.port)));
      if (i.running) setDevices(await api.getDevices());
      else setDevices([]);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 1500);
    return () => clearInterval(t);
  }, [refresh]);

  const toggle = async () => {
    setBusy(true);
    try {
      if (info?.running) await api.stopServer();
      else await api.startServer();
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const regen = async () => {
    await api.regeneratePin();
    await refresh();
  };

  const toggleVideo = async (on: boolean) => {
    await api.setVideo(on);
    await refresh();
  };

  const toggleCaptures = async (on: boolean) => {
    await api.setCapturesAllowed(on);
    await refresh();
  };

  const applyPort = async () => {
    const p = parseInt(portInput, 10);
    if (!Number.isFinite(p) || p < 1024 || p > 65535) return;
    await api.setPort(p);
    await refresh();
  };

  const copyUrl = async () => {
    if (!info) return;
    try {
      await navigator.clipboard.writeText(info.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const running = info?.running ?? false;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TitleBar />

      <div className="relative flex-1 overflow-hidden">
        <Backdrop />

        <div className="absolute inset-0 overflow-y-auto overflow-x-hidden">
          <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6">
          {/* Header */}
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-glow">
                <Wifi className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-sans text-xl font-bold tracking-tight">REM</h1>
                <p className="text-xs tracking-wide text-muted-foreground">
                  Remote Control · LAN
                </p>
              </div>
            </div>
            <Badge variant={running ? "online" : "offline"}>
              {running ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {running ? "En ligne" : "Hors ligne"}
            </Badge>
          </header>

          {/* Server control */}
          <Card>
            <CardContent className="flex flex-col items-stretch gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex items-center gap-4">
                <button
                  onClick={toggle}
                  disabled={busy}
                  className={cn(
                    "grid h-14 w-14 shrink-0 place-items-center rounded-2xl border transition-all active:scale-95 disabled:opacity-60",
                    running
                      ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200 shadow-[0_0_40px_-6px_rgb(52_211_153/0.7)]"
                      : "border-white/15 bg-white/[0.05] text-muted-foreground hover:bg-white/[0.09]"
                  )}
                >
                  <Power className={cn("h-7 w-7", busy && "animate-pulse")} />
                </button>
                <div className="min-w-0">
                  <p className="font-semibold tracking-tight">
                    Serveur {running ? "actif" : "arrêté"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {running
                      ? "Les appareils du réseau peuvent se connecter"
                      : "Démarre le serveur pour autoriser les connexions"}
                  </p>
                </div>
              </div>
              <Button
                variant={running ? "destructive" : "default"}
                onClick={toggle}
                disabled={busy}
                className="w-full sm:w-44"
              >
                <Power />
                {running ? "Arrêter" : "Démarrer"}
              </Button>
            </CardContent>
          </Card>

          {/* Connection + PIN/devices */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Connection / QR */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-primary" />
                  Connexion
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4 p-4 pt-2">
                <div
                  className={cn(
                    "rounded-2xl bg-white p-3 transition-opacity",
                    !running && "opacity-30 blur-[2px]"
                  )}
                >
                  <QRCodeSVG
                    value={info?.url || "http://0.0.0.0"}
                    size={150}
                    bgColor="#ffffff"
                    fgColor="#1a0b2e"
                    level="M"
                  />
                </div>
                <div className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                  <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground/90">
                    {info?.url || "—"}
                  </span>
                  <Button variant="ghost" size="icon" onClick={copyUrl} disabled={!running}>
                    {copied ? <Check className="text-emerald-300" /> : <Copy />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* PIN + devices */}
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Code PIN
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-3 p-4 pt-2">
                  <div className="flex min-w-0 flex-1 gap-1.5">
                    {(info?.pin ?? "------").split("").map((d, i) => (
                      <div
                        key={i}
                        className="grid h-12 flex-1 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-xl font-bold text-primary-foreground shadow-glow"
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={regen}
                    title="Régénérer"
                    className="h-12 w-12 shrink-0"
                  >
                    <RefreshCw />
                  </Button>
                </CardContent>
              </Card>

              <Card className="flex-1">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-primary" />
                    Appareils
                    <Badge variant="outline" className="ml-auto">
                      {devices.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 p-4 pt-2">
                  {devices.length === 0 && (
                    <p className="py-3 text-center text-sm text-muted-foreground">
                      Aucun appareil connecté
                    </p>
                  )}
                  {devices.map((d, i) => {
                    const Icon = deviceIcon(d.user_agent);
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                      >
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary-foreground">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{d.addr}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            il y a {timeAgo(d.connected_at)}
                          </p>
                        </div>
                        <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgb(52_211_153)] animate-pulseglow" />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Screen share (video v2) */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center gap-2">
                <MonitorPlay className="h-4 w-4 text-primary" />
                Partage d'écran
                <Badge variant={info?.video_enabled ? "online" : "outline"} className="ml-auto">
                  {info?.video_enabled ? "Actif" : "Inactif"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3 p-4 pt-2">
              <div className="min-w-0">
                <p className="text-sm">Autoriser le flux vidéo (mode custom)</p>
                <p className="text-xs text-muted-foreground">
                  {info?.video_available
                    ? "Le client peut voir l'écran et viser au doigt"
                    : "Capture indisponible sur cette machine"}
                </p>
              </div>
              <Switch
                checked={info?.video_enabled ?? false}
                disabled={!running || !info?.video_available}
                onCheckedChange={toggleVideo}
              />
            </CardContent>
          </Card>

          {/* Captures (caméra / micro / audio) */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" />
                Captures à distance
                <Badge variant={info?.captures_allowed ? "online" : "outline"} className="ml-auto">
                  {info?.captures_allowed ? "Autorisé" : "Bloqué"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm">Autoriser caméra / micro / audio à distance</p>
                  <p className="text-xs text-muted-foreground">
                    Le client peut écouter/voir le PC. Coupe pour tout bloquer.
                  </p>
                </div>
                <Switch
                  checked={info?.captures_allowed ?? false}
                  disabled={!running}
                  onCheckedChange={toggleCaptures}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { on: info?.cam_active, ok: info?.camera_available, Icon: Camera, label: "Caméra" },
                  { on: info?.mic_active, ok: info?.audio_available, Icon: Mic, label: "Micro" },
                  { on: info?.sys_active, ok: info?.audio_available, Icon: Volume2, label: "Audio" },
                ].map(({ on, ok, Icon, label }) => (
                  <div
                    key={label}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-2",
                      on
                        ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                        : "border-white/10 bg-white/[0.03] text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-xs">{label}</span>
                    <span
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        on
                          ? "bg-emerald-400 shadow-[0_0_8px_rgb(52_211_153)] animate-pulseglow"
                          : ok
                            ? "bg-white/25"
                            : "bg-red-500/50"
                      )}
                      title={ok ? (on ? "en direct" : "prêt") : "indisponible"}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-4 w-4 text-primary" />
                Réglages
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 p-4 pt-2 sm:flex-row sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="port">Port du serveur</Label>
                <Input
                  id="port"
                  value={portInput}
                  onChange={(e) => setPortInput(e.target.value.replace(/\D/g, ""))}
                  className="w-full sm:w-40"
                  disabled={running}
                  inputMode="numeric"
                />
              </div>
              <Button
                variant="outline"
                onClick={applyPort}
                disabled={running}
                className="w-full sm:w-32"
              >
                Appliquer
              </Button>
              {running && (
                <p className="text-xs text-muted-foreground sm:ml-auto sm:self-center">
                  Arrête le serveur pour changer le port
                </p>
              )}
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
