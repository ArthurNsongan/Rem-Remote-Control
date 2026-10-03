import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type DeviceInfo, type ServerInfo } from "./lib/tauri";
import { useUpdater } from "./lib/updater";
import type { ConnMode, Dash, SectionId } from "./lib/dash";
import { useI18n, type AppKey } from "./i18n";
import TitleBar from "./components/TitleBar";
import StatusBar from "./components/StatusBar";
import Rail from "./components/Rail";
import { UpdateBanner } from "./components/Updater";
import Connexion from "./sections/Connexion";
import Appareils from "./sections/Appareils";
import Partage from "./sections/Partage";
import Reglages from "./sections/Reglages";

function Backdrop() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 grid-overlay opacity-40" />
      <div className="pointer-events-none absolute -left-32 top-0 h-80 w-80 rounded-full bg-primary/30 blur-[120px] animate-float" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-accent/25 blur-[120px] animate-float [animation-delay:-6s]" />
    </>
  );
}

/** Titre et sous-titre de chaque section, en clés de traduction. */
const PAGES: Record<SectionId, { title: AppKey; sub: AppKey }> = {
  connexion: { title: "nav_connexion", sub: "page_connexion_d" },
  appareils: { title: "nav_appareils", sub: "page_appareils_d" },
  partage: { title: "nav_partage", sub: "page_partage_d" },
  reglages: { title: "nav_reglages", sub: "page_reglages_d" },
};

export default function App() {
  const i18n = useI18n();
  const { t } = i18n;
  const updater = useUpdater();
  const [section, setSection] = useState<SectionId>("connexion");

  const [info, setInfo] = useState<ServerInfo | null>(null);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const [portInput, setPortInput] = useState("9847");
  const [copied, setCopied] = useState(false);
  // Les deux connexions sont servies en parallèle ; ceci ne choisit que celle
  // qu'affiche le QR code.
  const [conn, setConn] = useState<ConnMode>("standard");

  const refresh = useCallback(async () => {
    try {
      const i = await api.getServerInfo();
      setInfo(i);
      setPortInput((p) => (document.activeElement?.id === "port" ? p : String(i.port)));
      setDevices(i.running ? await api.getDevices() : []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 1500);
    return () => clearInterval(id);
  }, [refresh]);

  // Un seul objet plutôt qu'une quinzaine de props : les sections ne font que
  // de l'affichage, tout l'état et les appels restent ici.
  const dash = useMemo<Dash>(() => {
    const running = info?.running ?? false;
    // La connexion chiffrée n'est proposée que si son écouteur a pu se lier.
    const secureReady = !!info?.secure_url;
    const shownUrl = conn === "secure" && secureReady ? info!.secure_url : info?.url || "";

    return {
      t,
      info,
      devices,
      running,
      busy,
      copied,
      conn,
      setConn,
      secureReady,
      shownUrl,
      portInput,
      setPortInput,

      toggle: async () => {
        setBusy(true);
        try {
          if (running) await api.stopServer();
          else await api.startServer();
          await refresh();
        } finally {
          setBusy(false);
        }
      },

      copyUrl: async () => {
        if (!shownUrl) return;
        try {
          await navigator.clipboard.writeText(shownUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* ignore */
        }
      },

      regen: async () => {
        await api.regeneratePin();
        await refresh();
      },

      toggleVideo: async (on: boolean) => {
        await api.setVideo(on);
        await refresh();
      },

      toggleCaptures: async (on: boolean) => {
        await api.setCapturesAllowed(on);
        await refresh();
      },

      applyPort: async () => {
        const p = parseInt(portInput, 10);
        if (!Number.isFinite(p) || p < 1024 || p > 65535) return;
        await api.setPort(p);
        await refresh();
      },
    };
  }, [t, info, devices, busy, copied, conn, portInput, refresh]);

  const page = PAGES[section];

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TitleBar i18n={i18n} />
      <StatusBar dash={dash} />

      <div className="relative flex min-h-0 flex-1">
        <Backdrop />
        <Rail dash={dash} active={section} onSelect={setSection} />

        <main className="relative min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-5">
          {/* `empty:` : la bannière ne rend rien quand il n'y a pas de mise à jour. */}
          <div className="mb-4 empty:hidden">
            <UpdateBanner up={updater} t={t} />
          </div>

          <h2 className="mt-1 font-display text-[13px] tracking-[0.12em]">{t(page.title)}</h2>
          <p className="mb-4 text-[13px] text-muted-foreground">{t(page.sub)}</p>

          {section === "connexion" && <Connexion dash={dash} />}
          {section === "appareils" && <Appareils dash={dash} />}
          {section === "partage" && <Partage dash={dash} />}
          {section === "reglages" && <Reglages dash={dash} updater={updater} />}
        </main>
      </div>
    </div>
  );
}
