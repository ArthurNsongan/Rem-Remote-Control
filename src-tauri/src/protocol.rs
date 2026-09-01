use serde::{Deserialize, Serialize};

// Mirrors shared/protocol.ts — keep in sync.

#[derive(Debug, Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum MouseButton {
    Left,
    Right,
    Middle,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum MediaAction {
    PlayPause,
    Next,
    Prev,
    VolUp,
    VolDown,
    Mute,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SystemAction {
    SlideNext,
    SlidePrev,
    Lock,
    Sleep,
    Shutdown,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum SpecialKey {
    Enter,
    Escape,
    Tab,
    Backspace,
    Delete,
    Space,
    Up,
    Down,
    Left,
    Right,
    Home,
    End,
    PageUp,
    PageDown,
    Win,
    Copy,
    Paste,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ClientMessage {
    Auth { token: String },
    MouseMove { dx: f64, dy: f64 },
    MouseAbs { x: f64, y: f64 },
    MouseClick { button: MouseButton },
    MouseDouble { button: MouseButton },
    MouseDown { button: MouseButton },
    MouseUp { button: MouseButton },
    MouseScroll { dy: f64 },
    Key { key: SpecialKey },
    Text { text: String },
    Media { action: MediaAction },
    System { action: SystemAction },
    Ping,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
#[allow(dead_code)] // Status reserved for future server->client push
pub enum ServerMessage {
    Status { ok: bool },
    Authed,
    Error { msg: String },
    Pong,
}
