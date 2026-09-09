import type { ClientMessage, ServerMessage } from "@shared/protocol";

const TOKEN_KEY = "rem_token";

function httpBase() {
  return window.location.origin;
}

function wsUrl() {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}/ws`;
}

export function savedToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export interface PublicInfo {
  video: boolean;
  video_available: boolean;
  camera_available: boolean;
  audio_available: boolean;
  captures_allowed: boolean;
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
    };
  }
}

/**
 * Ferme la session des deux cotes : le serveur revoque le jeton et efface le
 * cookie. Sans l'appel reseau, l'appareil resterait autorise a lire les flux
 * malgre une deconnexion apparente dans l'interface.
 */
export async function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
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

export async function pair(pin: string): Promise<string> {
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
  const data = (await res.json()) as { token: string };
  localStorage.setItem(TOKEN_KEY, data.token);
  return data.token;
}

export type ConnState = "connecting" | "open" | "closed";

export class RemSocket {
  private ws: WebSocket | null = null;
  private token: string;
  private onState: (s: ConnState) => void;
  private onAuthFail?: () => void;
  private closedByUser = false;
  private retry = 0;

  constructor(
    token: string,
    onState: (s: ConnState) => void,
    onAuthFail?: () => void
  ) {
    this.token = token;
    this.onState = onState;
    this.onAuthFail = onAuthFail;
  }

  connect() {
    this.closedByUser = false;
    this.onState("connecting");
    const ws = new WebSocket(wsUrl());
    this.ws = ws;

    ws.onopen = () => {
      this.retry = 0;
      ws.send(JSON.stringify({ type: "auth", token: this.token }));
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
