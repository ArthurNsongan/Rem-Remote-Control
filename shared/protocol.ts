// Shared WebSocket protocol between web client and Rust server.
// Keep in sync with src-tauri/src/protocol.rs

export type MouseButton = "left" | "right" | "middle";

export type MediaAction =
  | "play_pause"
  | "next"
  | "prev"
  | "vol_up"
  | "vol_down"
  | "mute";

export type SystemAction =
  | "slide_next"
  | "slide_prev"
  | "lock"
  | "sleep"
  | "shutdown";

// Special (non-text) keys the keyboard panel can send.
export type SpecialKey =
  | "enter"
  | "escape"
  | "tab"
  | "backspace"
  | "delete"
  | "space"
  | "up"
  | "down"
  | "left"
  | "right"
  | "home"
  | "end"
  | "pageup"
  | "pagedown"
  | "win"
  | "copy"
  | "paste";

export type ClientMessage =
  | { type: "auth"; token: string }
  | { type: "mouse_move"; dx: number; dy: number }
  | { type: "mouse_abs"; x: number; y: number }
  | { type: "mouse_click"; button: MouseButton }
  | { type: "mouse_double"; button: MouseButton }
  | { type: "mouse_down"; button: MouseButton }
  | { type: "mouse_up"; button: MouseButton }
  | { type: "mouse_scroll"; dy: number }
  | { type: "key"; key: SpecialKey }
  | { type: "text"; text: string }
  | { type: "media"; action: MediaAction }
  | { type: "system"; action: SystemAction }
  | { type: "ping" };

export type ServerMessage =
  | { type: "status"; ok: boolean }
  | { type: "authed" }
  | { type: "error"; msg: string }
  | { type: "pong" };

export interface PairResponse {
  token: string;
}
