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

pub fn media(e: &mut Enigo, action: MediaAction) {
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
