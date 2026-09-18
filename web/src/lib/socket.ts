import type { ClientMessage, ServerMessage } from "@shared/protocol";

/**
 * Le jeton de session vit dans un cookie HttpOnly pose par /pair : il est
 * volontairement illisible ici. On interroge donc le serveur pour savoir si
 * l'appareil est deja appaire.
 */
export async function isPaired(): Promise<boolean> {
  try {
    const r = await fetch("/api/session", { cache: "no-store" });
    if (!r.ok) return false;
    return ((await r.json()) as { authed?: boolean }).authed === true;
  } catch {
    return false;
  }
}

function httpBase() {
  return window.location.origin;
}

/**
 * URL de la même page servie par l'autre écouteur.
 *
 * Le port chiffré est celui de la connexion standard plus un ; on le déduit de
 * l'hôte courant plutôt que de le demander au serveur, ce qui fonctionne aussi
 * bien par nom de machine que par adresse IP.
 */
export function otherModeUrl(currentlySecure: boolean): string {
  const port = Number(window.location.port || (currentlySecure ? 443 : 80));
  const target = currentlySecure ? port - 1 : port + 1;
  const proto = currentlySecure ? "http" : "https";
  return `${proto}://${window.location.hostname}:${target}/`;
}

function wsUrl() {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}/ws`;
}

export interface PublicInfo {
  video: boolean;
  video_available: boolean;
  camera_available: boolean;
  audio_available: boolean;
  captures_allowed: boolean;
  /** Le serveur propose-t-il aussi une connexion chiffrée ? */
  secure_available: boolean;
  /** La page courante est-elle servie par l'écouteur chiffré ? */
  secure: boolean;
}

export async function fetchPublic(): Promise<PublicInfo> {
  try {
    const r = await fetch("/api/public", { cache: "no-store" });
    if (!r.ok) throw new Error();
    return (await r.json()) as PublicInfo;
  } catch {
    return {
      video: false,
      video_available: false,
      camera_available: false,
      audio_available: false,
      captures_allowed: false,
      secure_available: false,
      secure: false,
    };
  }
}

/** Revoque la session cote serveur et efface le cookie. */
export async function clearToken() {
  try {
    await fetch("/logout", { method: "POST" });
  } catch {
    // Serveur deja parti : le jeton disparait avec lui.
  }
}

/** Échec d'appairage : PIN faux, ou IP verrouillée après trop de tentatives. */
export class PairError extends Error {
  constructor(
    public kind: "invalid" | "locked" | "network",
    /** Secondes avant de pouvoir réessayer (kind === "locked"). */
    public retryAfter = 0,
    /** Tentatives restantes avant verrouillage (kind === "invalid"). */
    public remaining = 0
  ) {
    super(kind);
  }
}

export async function pair(pin: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${httpBase()}/pair`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
  } catch {
    throw new PairError("network");
  }
  if (res.status === 429) {
    const body = (await res.json().catch(() => ({}))) as { retry_after?: number };
    throw new PairError("locked", body.retry_after ?? 60);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { remaining?: number };
    throw new PairError("invalid", 0, body.remaining ?? 0);
  }
  // Rien a stocker : le cookie pose par la reponse fait foi.
}

export type ConnState = "connecting" | "open" | "closed";

export class RemSocket {
  private ws: WebSocket | null = null;
  private onState: (s: ConnState) => void;
  private onAuthFail?: () => void;
  private closedByUser = false;
  private retry = 0;

  constructor(onState: (s: ConnState) => void, onAuthFail?: () => void) {
    this.onState = onState;
    this.onAuthFail = onAuthFail;
  }

  connect() {
    this.closedByUser = false;
    this.onState("connecting");
    const ws = new WebSocket(wsUrl());
    this.ws = ws;

    // L'authentification a eu lieu a la poignee de main, via le cookie :
    // un upgrade refuse se traduit par une fermeture immediate.
    ws.onopen = () => {
      this.retry = 0;
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as ServerMessage;
        if (msg.type === "authed") this.onState("open");
        if (msg.type === "error") {
          clearToken();
          this.close();
          this.onAuthFail?.();
        }
      } catch {
        /* ignore */
      }
    };
    ws.onclose = () => {
      this.onState("closed");
      if (!this.closedByUser) {
        this.retry = Math.min(this.retry + 1, 5);
        setTimeout(() => this.connect(), this.retry * 600);
      }
    };
    ws.onerror = () => ws.close();
  }

  send(msg: ClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  close() {
    this.closedByUser = true;
    this.ws?.close();
  }
}
