import { useEffect, useState } from "react";

export const REPO = "ArthurNsongan/Rem-Remote-Control";
export const GITHUB_URL = `https://github.com/${REPO}`;
export const RELEASES_URL = `${GITHUB_URL}/releases`;

const API = `https://api.github.com/repos/${REPO}/releases/latest`;
const CACHE_KEY = "rem_release_v1";
const TTL_MS = 60 * 60 * 1000; // 1 h

export interface ReleaseLinks {
  /** Version de la dernière Release (ex. "0.1.7"), null si non résolue. */
  version: string | null;
  win: string;
  mac: string;
  linux: string;
  deb: string;
  /** true tant que l'API n'a pas répondu (les liens pointent alors la page Releases). */
  loading: boolean;
}

/** Repli : la page des Releases ne renvoie jamais 404. */
const FALLBACK: ReleaseLinks = {
  version: null,
  win: RELEASES_URL,
  mac: RELEASES_URL,
  linux: RELEASES_URL,
  deb: RELEASES_URL,
  loading: true,
};

interface Asset {
  name: string;
  browser_download_url: string;
}

function pick(assets: Asset[], re: RegExp): string | undefined {
  return assets.find((a) => re.test(a.name))?.browser_download_url;
}

function readCache(): ReleaseLinks | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { at, data } = JSON.parse(raw) as { at: number; data: ReleaseLinks };
    if (Date.now() - at > TTL_MS) return null;
    return { ...data, loading: false };
  } catch {
    return null;
  }
}

/**
 * Résout les binaires de la dernière Release via l'API GitHub, pour éviter
 * de coder en dur des noms de fichiers versionnés (sinon chaque release
 * casserait les boutons jusqu'au redéploiement de la landing).
 */
export function useLatestRelease(): ReleaseLinks {
  const [state, setState] = useState<ReleaseLinks>(() => readCache() ?? FALLBACK);

  useEffect(() => {
    if (!state.loading) return; // déjà servi par le cache
    let alive = true;

    (async () => {
      try {
        const res = await fetch(API, { headers: { Accept: "application/vnd.github+json" } });
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as { tag_name?: string; assets?: Asset[] };
        const assets = json.assets ?? [];

        const data: ReleaseLinks = {
          version: (json.tag_name ?? "").replace(/^v/, "") || null,
          win: pick(assets, /\.msi$/i) ?? RELEASES_URL,
          mac: pick(assets, /\.dmg$/i) ?? RELEASES_URL,
          linux: pick(assets, /\.AppImage$/i) ?? RELEASES_URL,
          deb: pick(assets, /\.deb$/i) ?? RELEASES_URL,
          loading: false,
        };

        if (!alive) return;
        setState(data);
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
        } catch {
          /* stockage indisponible : sans gravité */
        }
      } catch {
        // API injoignable ou quota atteint : on garde le repli (page Releases)
        if (alive) setState((s) => ({ ...s, loading: false }));
      }
    })();

    return () => {
      alive = false;
    };
  }, [state.loading]);

  return state;
}
