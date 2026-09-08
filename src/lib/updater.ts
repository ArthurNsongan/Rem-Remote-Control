import { useCallback, useEffect, useRef, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import { api } from "./tauri";

/** Page de repli quand l'installation en place est impossible. */
const RELEASES_URL = "https://github.com/ArthurNsongan/Rem-Remote-Control/releases/latest";

/** Délai avant la vérification automatique au lancement (laisse l'UI se poser). */
const STARTUP_DELAY = 3_000;
/** Puis une fois par jour tant que l'app tourne (elle vit dans la barre système). */
const INTERVAL = 24 * 60 * 60 * 1000;

export type UpdateStatus =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "uptodate" }
  | { kind: "available"; version: string; notes: string }
  | { kind: "downloading"; version: string; percent: number | null }
  | { kind: "ready"; version: string }
  | { kind: "error"; message: string };

export function useUpdater() {
  const [status, setStatus] = useState<UpdateStatus>({ kind: "idle" });
  const [current, setCurrent] = useState("");
  // Toutes les installations ne savent pas se remplacer elles-mêmes (.deb,
  // bundle macOS non signé) : on propose alors le téléchargement manuel.
  const [canSelf, setCanSelf] = useState(true);
  // L'objet Update porte le handle de téléchargement : on le garde entre
  // la détection et l'installation.
  const pending = useRef<Update | null>(null);

  useEffect(() => {
    getVersion().then(setCurrent).catch(() => {});
    api.canSelfUpdate().then(setCanSelf).catch(() => {});
  }, []);

  const runCheck = useCallback(async (silent: boolean) => {
    // Ne pas écraser un téléchargement en cours par une vérification périodique.
    if (pending.current) return;
    if (!silent) setStatus({ kind: "checking" });
    try {
      const up = await check();
      if (!up) {
        setStatus(silent ? { kind: "idle" } : { kind: "uptodate" });
        return;
      }
      pending.current = up;
      setStatus({ kind: "available", version: up.version, notes: up.body ?? "" });
    } catch (e) {
      // En dev (binaire non empaqueté) ou hors ligne : rien à signaler si
      // la vérification était automatique.
      if (!silent) setStatus({ kind: "error", message: String(e) });
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => runCheck(true), STARTUP_DELAY);
    const i = setInterval(() => runCheck(true), INTERVAL);
    return () => {
      clearTimeout(t);
      clearInterval(i);
    };
  }, [runCheck]);

  const install = useCallback(async () => {
    const up = pending.current;
    if (!up) return;
    setStatus({ kind: "downloading", version: up.version, percent: null });
    let total = 0;
    let got = 0;
    try {
      await up.downloadAndInstall((ev) => {
        switch (ev.event) {
          case "Started":
            total = ev.data.contentLength ?? 0;
            break;
          case "Progress":
            got += ev.data.chunkLength;
            setStatus({
              kind: "downloading",
              version: up.version,
              percent: total ? Math.min(100, Math.round((got / total) * 100)) : null,
            });
            break;
          case "Finished":
            setStatus({ kind: "ready", version: up.version });
            break;
        }
      });
      setStatus({ kind: "ready", version: up.version });
    } catch (e) {
      pending.current = null;
      setStatus({ kind: "error", message: String(e) });
    }
  }, []);

  const restart = useCallback(() => relaunch(), []);
  const openDownload = useCallback(() => openUrl(RELEASES_URL), []);

  return {
    status,
    current,
    canSelf,
    check: () => runCheck(false),
    install,
    restart,
    openDownload,
  };
}
