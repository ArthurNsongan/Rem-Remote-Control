use enigo::{
    Axis, Button, Coordinate, Direction, Enigo, Key, Keyboard, Mouse, Settings,
};

use crate::protocol::{MediaAction, MouseButton, SpecialKey};

pub fn new_enigo() -> Result<Enigo, String> {
    Enigo::new(&Settings::default()).map_err(|e| format!("enigo init: {e}"))
}

fn btn(b: MouseButton) -> Button {
    match b {
        MouseButton::Left => Button::Left,
        MouseButton::Right => Button::Right,
        MouseButton::Middle => Button::Middle,
    }
}

pub fn mouse_move(e: &mut Enigo, dx: f64, dy: f64) {
    let _ = e.move_mouse(dx.round() as i32, dy.round() as i32, Coordinate::Rel);
}

/// Absolute move from normalized (0..1) coordinates over the main display.
pub fn mouse_abs(e: &mut Enigo, nx: f64, ny: f64) {
    if let Ok((w, h)) = e.main_display() {
        let x = (nx.clamp(0.0, 1.0) * w as f64).round() as i32;
        let y = (ny.clamp(0.0, 1.0) * h as f64).round() as i32;
        let _ = e.move_mouse(x, y, Coordinate::Abs);
    }
}

pub fn mouse_button(e: &mut Enigo, b: MouseButton, dir: Direction) {
    let _ = e.button(btn(b), dir);
}

pub fn mouse_double(e: &mut Enigo, b: MouseButton) {
    let _ = e.button(btn(b), Direction::Click);
    let _ = e.button(btn(b), Direction::Click);
}

pub fn mouse_scroll(e: &mut Enigo, dy: f64) {
    // positive dy = scroll down
    let amount = dy.round() as i32;
    if amount != 0 {
        let _ = e.scroll(amount, Axis::Vertical);
    }
}

pub fn type_text(e: &mut Enigo, text: &str) {
    let _ = e.text(text);
}

pub fn special_key(e: &mut Enigo, key: SpecialKey) {
    match key {
        SpecialKey::Copy => combo(e, Key::Control, Key::Unicode('c')),
        SpecialKey::Paste => combo(e, Key::Control, Key::Unicode('v')),
        other => {
            if let Some(k) = map_key(other) {
                let _ = e.key(k, Direction::Click);
            }
        }
    }
}

fn combo(e: &mut Enigo, modifier: Key, key: Key) {
    let _ = e.key(modifier, Direction::Press);
    let _ = e.key(key, Direction::Click);
    let _ = e.key(modifier, Direction::Release);
}

fn map_key(key: SpecialKey) -> Option<Key> {
    Some(match key {
        SpecialKey::Enter => Key::Return,
        SpecialKey::Escape => Key::Escape,
        SpecialKey::Tab => Key::Tab,
        SpecialKey::Backspace => Key::Backspace,
        SpecialKey::Delete => Key::Delete,
        SpecialKey::Space => Key::Space,
        SpecialKey::Up => Key::UpArrow,
        SpecialKey::Down => Key::DownArrow,
        SpecialKey::Left => Key::LeftArrow,
        SpecialKey::Right => Key::RightArrow,
        SpecialKey::Home => Key::Home,
        SpecialKey::End => Key::End,
        SpecialKey::PageUp => Key::PageUp,
        SpecialKey::PageDown => Key::PageDown,
        SpecialKey::Win => Key::Meta,
        SpecialKey::Copy | SpecialKey::Paste => return None,
    })
}

/// Volume sous Linux : on agit sur le mixeur au lieu de simuler une touche.
///
/// Les touches XF86Audio* ne font rien par elles-memes : c'est l'environnement
/// de bureau qui les intercepte. Un evenement synthetique n'est pas toujours vu
/// par ce raccourci global - en particulier sur Wayland, ou il passe par le
/// portail - et le keysym peut meme etre absent de la disposition active.
/// pactl / wpctl, eux, parlent directement au serveur de son.
#[cfg(target_os = "linux")]
mod linux_volume {
    use std::process::{Command, Stdio};
    use std::sync::OnceLock;

    use crate::protocol::MediaAction;

    const STEP: &str = "5";

    #[derive(Clone, Copy)]
    enum Tool {
        /// PulseAudio, et PipeWire via pipewire-pulse : le plus repandu.
        Pactl,
        /// PipeWire natif (wireplumber), si pactl est absent.
        Wpctl,
    }

    fn run(bin: &str, args: &[&str]) -> bool {
        Command::new(bin)
            .args(args)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
    }

    /// Detecte l'outil disponible une seule fois : sonder a chaque appui
    /// couterait un lancement de processus par clic.
    fn tool() -> Option<Tool> {
        static TOOL: OnceLock<Option<Tool>> = OnceLock::new();
        *TOOL.get_or_init(|| {
            if run("pactl", &["--version"]) {
                Some(Tool::Pactl)
            } else if run("wpctl", &["--version"]) {
                Some(Tool::Wpctl)
            } else {
                eprintln!("volume : ni pactl ni wpctl trouve, repli sur les touches media");
                None
            }
        })
    }

    /// Applique l'action. `false` = non gerable ici, l'appelant simule la touche.
    pub fn handle(action: MediaAction) -> bool {
        let Some(tool) = tool() else { return false };
        match (tool, action) {
            (Tool::Pactl, MediaAction::VolUp) => run(
                "pactl",
                &["set-sink-volume", "@DEFAULT_SINK@", &format!("+{STEP}%")],
            ),
            (Tool::Pactl, MediaAction::VolDown) => run(
                "pactl",
                &["set-sink-volume", "@DEFAULT_SINK@", &format!("-{STEP}%")],
            ),
            (Tool::Pactl, MediaAction::Mute) => {
                run("pactl", &["set-sink-mute", "@DEFAULT_SINK@", "toggle"])
            }
            (Tool::Wpctl, MediaAction::VolUp) => run(
                "wpctl",
                &["set-volume", "@DEFAULT_AUDIO_SINK@", &format!("{STEP}%+")],
            ),
            (Tool::Wpctl, MediaAction::VolDown) => run(
                "wpctl",
                &["set-volume", "@DEFAULT_AUDIO_SINK@", &format!("{STEP}%-")],
            ),
            (Tool::Wpctl, MediaAction::Mute) => {
                run("wpctl", &["set-mute", "@DEFAULT_AUDIO_SINK@", "toggle"])
            }
            // Lecture / piste suivante : ce sont des commandes MPRIS, pas du
            // mixage. On laisse la simulation de touches s'en charger.
            _ => false,
        }
    }
}

pub fn media(e: &mut Enigo, action: MediaAction) {
    #[cfg(target_os = "linux")]
    if linux_volume::handle(action) {
        return;
    }

    let key = match action {
        MediaAction::PlayPause => Key::MediaPlayPause,
        MediaAction::Next => Key::MediaNextTrack,
        MediaAction::Prev => Key::MediaPrevTrack,
        MediaAction::VolUp => Key::VolumeUp,
        MediaAction::VolDown => Key::VolumeDown,
        MediaAction::Mute => Key::VolumeMute,
    };
    let _ = e.key(key, Direction::Click);
}

pub fn slide(e: &mut Enigo, next: bool) {
    let key = if next { Key::RightArrow } else { Key::LeftArrow };
    let _ = e.key(key, Direction::Click);
}
