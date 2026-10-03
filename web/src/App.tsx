import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Clock,
  Globe,
  Keyboard as KeyboardIcon,
  LogOut,
  Mic,
  MonitorPlay,
  MousePointer2,
  Music,
  Power,
  Settings2,
  Volume2,
  X,
  type LucideIcon,
} from "lucide-react";
import type { ClientMessage } from "@shared/protocol";
import { cn } from "@shared/cn";
import {
  RemSocket,
  isPaired,
  clearToken,
  fetchPublic,
  type ConnState,
  type PublicInfo,
} from "./lib/socket";
import { I18nProvider, useI18n, type ClientI18n, type ClientKey } from "./i18n";
import Pairing from "./components/Pairing";
import Touchpad from "./components/Touchpad";
import LiveKeyboard from "./components/LiveKeyboard";
import Media from "./components/Media";
import SystemPanel from "./components/SystemPanel";
import VideoScreen from "./components/VideoScreen";
import CameraView from "./components/CameraView";
import AudioListen from "./components/AudioListen";
import Dock from "./components/Dock";
import Feuille from "./components/Feuille";

type ModuleId =
  | "video"
  | "trackpad"
  | "keyboard"
  | "media"
  | "camera"
  | "audio_pc"
  | "mic"
  | "system";

// `label` est une clé du dictionnaire, traduite au rendu.
const MODULES: { id: ModuleId; label: ClientKey; Icon: LucideIcon }[] = [
  { id: "video", label: "mod_video", Icon: MonitorPlay },
  { id: "trackpad", label: "mod_trackpad", Icon: MousePointer2 },
  { id: "keyboard", label: "mod_keyboard", Icon: KeyboardIcon },
  { id: "media", label: "mod_media", Icon: Music },
  { id: "camera", label: "mod_camera", Icon: Camera },
  { id: "audio_pc", label: "mod_audio_pc", Icon: Volume2 },
  { id: "mic", label: "mod_mic", Icon: Mic },
  { id: "system", label: "mod_system", Icon: Power },
];

const DEFAULTS: Record<ModuleId, boolean> = {
  video: false,
  trackpad: true,
  keyboard: true,
  media: false,
  camera: false,
  audio_pc: false,
  mic: false,
  system: false,
};

/**
 * Modules qui prennent toute la scène plutôt que de défiler : ils ont une
 * surface de geste, et une surface de geste qui défile est une surface qu'on
 * ne peut pas utiliser.
 */
const PLEIN: ReadonlySet<ModuleId> = new Set<ModuleId>(["video", "trackpad"]);

/** Nombre d'emplacements du dock avant le bouton « Plus ». */
const DOCK_MAX = 4;

/** Quelle feuille est ouverte, s'il y en a une. */
type Feuillet = "modules" | "reglages" | null;

function loadModules(): Record<ModuleId, boolean> {
  try {
    const raw = localStorage.getItem("rem_modules");
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* stockage illisible : on repart des valeurs par défaut */
  }
  return { ...DEFAULTS };
}

/** Racine : fournit la langue à tout l'arbre, écran d'appairage compris. */
export default function App() {
  const i18n = useI18n();
  return (
    <I18nProvider value={i18n}>
      <AppInner i18n={i18n} />
    </I18nProvider>
  );
}

function AppInner({ i18n }: { i18n: ClientI18n }) {
  const { t, lang, setLang } = i18n;
  // null = on ne sait pas encore (appel /api/session en cours).
  const [paired, setPaired] = useState<boolean | null>(null);
  const [state, setState] = useState<ConnState>("closed");
  const [modules, setModules] = useState<Record<ModuleId, boolean>>(loadModules);
  const [scene, setScene] = useState<ModuleId | null>(null);
  const [feuille, setFeuille] = useState<Feuillet>(null);
  const [debutSession] = useState(() => new Date());
  const [pub, setPub] = useState<PublicInfo>({
    video: false,
    video_available: false,
    camera_available: false,
    audio_available: false,
    captures_allowed: false,
    secure_available: false,
    secure: false,
  });
  const sockRef = useRef<RemSocket | null>(null);

  // Le jeton étant dans un cookie HttpOnly, seul le serveur peut dire si cet
  // appareil est appairé.
  useEffect(() => {
    let alive = true;
    isPaired().then((ok) => alive && setPaired(ok));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!paired) return;
    const sock = new RemSocket(setState, () => setPaired(false));
    sockRef.current = sock;
    sock.connect();
    return () => sock.close();
  }, [paired]);

  const actifs = useMemo(
    () => MODULES.filter((m) => modules[m.id]).map((m) => m.id),
    [modules]
  );

  // La scène suit toujours un module réellement actif : en retirer un ne doit
  // jamais laisser un écran vide.
  useEffect(() => {
    setScene((s) => (s && actifs.includes(s) ? s : (actifs[0] ?? null)));
  }, [actifs]);

  // Disponibilité des flux, seulement quand un module en dépend.
  useEffect(() => {
    if (!paired) return;
    const needs = modules.video || modules.camera || modules.audio_pc || modules.mic;
    if (!needs) return;
    let alive = true;
    const tick = async () => {
      const p = await fetchPublic();
      if (alive) setPub(p);
    };
    tick();
    const id = setInterval(tick, 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [paired, modules.video, modules.camera, modules.audio_pc, modules.mic]);

  const send = useCallback<(msg: ClientMessage) => void>((msg) => {
    sockRef.current?.send(msg);
  }, []);

  const logout = () => {
    sockRef.current?.close();
    clearToken();
    setFeuille(null);
    setPaired(false);
  };

  const toggleModule = (id: ModuleId) => {
    setModules((m) => {
      const next = { ...m, [id]: !m[id] };
      try {
        localStorage.setItem("rem_modules", JSON.stringify(next));
      } catch {
        /* le choix ne survivra pas au rechargement, sans plus */
      }
      return next;
    });
  };

  /** Depuis la feuille : on active si besoin, et on va sur la scène. */
  const ouvrirModule = (id: ModuleId) => {
    if (!modules[id]) toggleModule(id);
    setScene(id);
    setFeuille(null);
  };

  if (paired === null) return null; // évite un flash de l'écran de code PIN
  if (!paired) return <Pairing onPaired={() => setPaired(true)} />;

  // Le dock montre les premiers modules actifs ; la scène courante y garde
  // toujours sa place, même choisie depuis la feuille.
  const dockIds = (() => {
    const base = actifs.slice(0, DOCK_MAX);
    if (scene && !base.includes(scene)) {
      if (base.length === DOCK_MAX) base[DOCK_MAX - 1] = scene;
      else base.push(scene);
    }
    return base;
  })();
  const dockItems = dockIds.map((id) => {
    const m = MODULES.find((x) => x.id === id)!;
    return { id, label: t(m.label), Icon: m.Icon };
  });

  const etat =
    state === "open" ? t("connected") : state === "connecting" ? t("connecting") : t("disconnected");

  const rendu = (id: ModuleId) => {
    switch (id) {
      case "video":
        return (
          <VideoScreen send={send} enabled={pub.video} available={pub.video_available} fill />
        );
      case "trackpad":
        return <Touchpad send={send} fill />;
      case "keyboard":
        return <LiveKeyboard send={send} />;
      case "media":
        return <Media send={send} />;
      case "camera":
        return <CameraView available={pub.camera_available} />;
      case "audio_pc":
        return <AudioListen src="system" available={pub.audio_available} />;
      case "mic":
        return <AudioListen src="mic" available={pub.audio_available} />;
      case "system":
        return <SystemPanel send={send} />;
    }
  };

  const plein = scene !== null && PLEIN.has(scene);

  return (
    <div className="relative mx-auto flex h-[100dvh] max-w-xl flex-col overflow-hidden">
      <div className="pointer-events-none fixed inset-0 grid-overlay opacity-20" />

      {/* Bandeau d'état : une information, aucune commande sauf l'accès aux
          réglages — le haut de l'écran est hors de portée du pouce. */}
      <div className="absolute inset-x-3 top-3 z-30 flex select-none items-center gap-2 rounded-full border border-white/10 bg-[hsl(var(--background)/0.75)] px-3 py-1.5 font-sans text-xs backdrop-blur-md">
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            state === "open"
              ? "bg-emerald-400 shadow-[0_0_8px_theme(colors.emerald.400)]"
              : state === "connecting"
                ? "bg-amber-400"
                : "bg-red-400"
          )}
        />
        <span className="font-semibold tracking-tight">REM</span>
        <span className="truncate text-muted-foreground">· {etat}</span>
        <button
          onClick={() => setFeuille("reglages")}
          className="ml-auto grid h-6 w-6 place-items-center rounded-full text-muted-foreground"
          title={t("sheet_settings")}
        >
          <Settings2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* La scène : un module, tout le cadre. */}
      <main
        className={cn(
          "relative flex min-h-0 flex-1 flex-col px-3 pb-1 pt-[3.4rem]",
          plein ? "overflow-hidden" : "overflow-y-auto"
        )}
      >
        {scene ? (
          rendu(scene)
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <p className="font-sans text-sm text-muted-foreground">{t("no_module")}</p>
            <p className="text-xs text-muted-foreground/70">{t("no_module_hint")}</p>
          </div>
        )}
      </main>

      <Dock
        items={dockItems}
        actif={scene}
        onPick={(id) => setScene(id as ModuleId)}
        onPlus={() => setFeuille((f) => (f === "modules" ? null : "modules"))}
        plusActif={feuille === "modules"}
        plusLabel={t("nav_more")}
      />

      {feuille === "modules" && (
        <Feuille titre={t("sheet_modules")} onClose={() => setFeuille(null)}>
          <div className="grid grid-cols-4 gap-2">
            {MODULES.map((m) => {
              const on = modules[m.id];
              const Icon = m.Icon;
              return (
                <div key={m.id} className="relative">
                  <button
                    onClick={() => ouvrirModule(m.id)}
                    className={cn(
                      "flex w-full flex-col items-center gap-1.5 rounded-2xl border px-1 pb-2 pt-3 font-sans text-[9.5px] leading-tight transition-all",
                      on
                        ? "border-primary/55 bg-primary/20 text-foreground"
                        : "border-white/10 bg-white/[0.035] text-muted-foreground"
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                    <span className="w-full truncate text-center">{t(m.label)}</span>
                  </button>
                  {on && (
                    <button
                      onClick={() => toggleModule(m.id)}
                      title={t("module_remove")}
                      className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full border border-white/15 bg-card text-muted-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Feuille>
      )}

      {feuille === "reglages" && (
        <Feuille titre={t("sheet_settings")} onClose={() => setFeuille(null)}>
          <Ligne Icon={Globe} texte={t("set_lang")}>
            <button
              onClick={() => setLang(lang === "fr" ? "en" : "fr")}
              className="font-accent text-xs uppercase tracking-wide text-foreground"
            >
              {lang === "fr" ? "Français" : "English"}
            </button>
          </Ligne>

          <Ligne Icon={Clock} texte={t("set_session")}>
            <span className="text-xs text-muted-foreground">
              {t("set_since", {
                h: debutSession.toLocaleTimeString(lang === "fr" ? "fr-FR" : "en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              })}
            </span>
          </Ligne>

          <button
            onClick={logout}
            className="flex w-full items-center gap-3 py-3 font-sans text-sm text-destructive"
          >
            <LogOut className="h-[18px] w-[18px]" />
            {t("set_logout")}
          </button>
        </Feuille>
      )}
    </div>
  );
}

/** Une ligne de réglage : icône, libellé, et la commande à droite. */
function Ligne({
  Icon,
  texte,
  children,
}: {
  Icon: LucideIcon;
  texte: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-white/10 py-3 font-sans text-sm">
      <Icon className="h-[18px] w-[18px] text-muted-foreground" />
      {texte}
      <span className="ml-auto flex items-center">{children}</span>
    </div>
  );
}
