use std::process::Command;

use crate::protocol::SystemAction;

#[cfg(target_os = "windows")]
fn run(cmd: &str, args: &[&str]) {
    let _ = Command::new(cmd).args(args).spawn();
}

#[cfg(target_os = "windows")]
pub fn lock() {
    run("rundll32.exe", &["user32.dll,LockWorkStation"]);
}

#[cfg(target_os = "windows")]
pub fn sleep() {
    // Note: with hibernation enabled this hibernates instead of sleeping.
    run("rundll32.exe", &["powrprof.dll,SetSuspendState", "0,1,0"]);
}

#[cfg(target_os = "windows")]
pub fn shutdown() {
    run("shutdown", &["/s", "/t", "0"]);
}

// --- non-windows fallbacks (best effort, keeps it compiling cross-platform) ---

#[cfg(target_os = "macos")]
pub fn lock() {
    let _ = Command::new("pmset").arg("displaysleepnow").spawn();
}
#[cfg(target_os = "macos")]
pub fn sleep() {
    let _ = Command::new("pmset").arg("sleepnow").spawn();
}
#[cfg(target_os = "macos")]
pub fn shutdown() {
    let _ = Command::new("osascript")
        .args(["-e", "tell app \"System Events\" to shut down"])
        .spawn();
}

#[cfg(target_os = "linux")]
pub fn lock() {
    let _ = Command::new("loginctl").arg("lock-session").spawn();
}
#[cfg(target_os = "linux")]
pub fn sleep() {
    let _ = Command::new("systemctl").arg("suspend").spawn();
}
#[cfg(target_os = "linux")]
pub fn shutdown() {
    let _ = Command::new("systemctl").arg("poweroff").spawn();
}

pub fn handle(action: SystemAction) -> Option<bool> {
    // Returns Some(true) for slide actions that the caller should route to enigo,
    // Some(false) for slide_prev, None for system power actions handled here.
    match action {
        SystemAction::SlideNext => Some(true),
        SystemAction::SlidePrev => Some(false),
        SystemAction::Lock => {
            lock();
            None
        }
        SystemAction::Sleep => {
            sleep();
            None
        }
        SystemAction::Shutdown => {
            shutdown();
            None
        }
    }
}
