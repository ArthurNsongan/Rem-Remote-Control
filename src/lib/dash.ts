/**
 * Contrat entre `App` et les sections du tableau de bord.
 *
 * L'état et les appels au backend restent dans `App` : les sections ne font
 * que de l'affichage. Un seul objet est passé plutôt qu'une quinzaine de
 * props, et le typage garde le tout vérifiable.
 */
import type { DeviceInfo, ServerInfo } from "./tauri";
import type { AppI18n } from "../i18n";

export type SectionId = "connexion" | "appareils" | "partage" | "reglages";

/** Connexion affichée par le QR code ; les deux sont servies en parallèle. */
export type ConnMode = "standard" | "secure";

export interface Dash {
  t: AppI18n["t"];
  info: ServerInfo | null;
  devices: DeviceInfo[];
  running: boolean;
  busy: boolean;
  copied: boolean;

  conn: ConnMode;
  setConn: (m: ConnMode) => void;
  /** L'écouteur chiffré a-t-il pu se lier ? Sinon on ne propose pas le choix. */
  secureReady: boolean;
  /** URL de la connexion choisie, celle qu'encode le QR code. */
  shownUrl: string;

  portInput: string;
  setPortInput: (v: string) => void;

  /** Démarre ou arrête le serveur. */
  toggle: () => void;
  copyUrl: () => void;
  regen: () => void;
  toggleVideo: (on: boolean) => void;
  toggleCaptures: (on: boolean) => void;
  applyPort: () => void;
}

/** Durée écoulée, en format court. */
export function timeAgo(unix: number) {
  const s = Math.max(0, Math.floor(Date.now() / 1000 - unix));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  return `${Math.floor(s / 3600)}h`;
}
