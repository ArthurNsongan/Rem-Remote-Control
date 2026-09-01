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

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function pair(pin: string): Promise<string> {
  const res = await fetch(`${httpBase()}/pair`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  if (!res.ok) throw new Error("invalid_pin");
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
