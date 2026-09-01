mod audio;
mod camera;
mod input;
mod protocol;
mod server;
mod state;
mod system;
mod video;

use serde::Serialize;
use state::{DeviceInfo, Shared};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, State, WindowEvent,
};

#[derive(Serialize)]
pub struct ServerInfo {
    running: bool,
    ip: String,
    port: u16,
    pin: String,
    url: String,
    video_enabled: bool,
    video_available: bool,
    camera_available: bool,
    audio_available: bool,
    captures_allowed: bool,
    cam_active: bool,
    mic_active: bool,
    sys_active: bool,
}

fn local_ip() -> String {
    local_ip_address::local_ip()
        .map(|ip| ip.to_string())
        .unwrap_or_else(|_| "127.0.0.1".to_string())
}

fn build_info(shared: &Shared) -> ServerInfo {
    let ip = local_ip();
    let port = shared.port();
    ServerInfo {
        running: shared.is_running(),
        ip: ip.clone(),
        port,
        pin: shared.pin(),
        url: format!("http://{ip}:{port}"),
        video_enabled: shared.video_enabled(),
        video_available: video::available(),
        camera_available: camera::available(),
        audio_available: audio::available(),
        captures_allowed: shared.captures_allowed(),
        cam_active: shared.cam_active(),
        mic_active: shared.mic_active(),
        sys_active: shared.sys_active(),
    }
}

#[tauri::command]
fn get_server_info(shared: State<Shared>) -> ServerInfo {
    build_info(&shared)
}

#[tauri::command]
async fn start_server(shared: State<'_, Shared>) -> Result<ServerInfo, String> {
    if shared.is_running() {
        return Ok(build_info(&shared));
    }
    let port = shared.port();
    server::start(shared.inner().clone(), port).await?;
    Ok(build_info(&shared))
}

#[tauri::command]
fn stop_server(shared: State<Shared>) {
    if let Some(tx) = shared.0.shutdown.lock().unwrap().take() {
        let _ = tx.send(());
    }
    shared
        .0
        .running
        .store(false, std::sync::atomic::Ordering::SeqCst);
    shared.set_video(false);
    shared.clear_sessions();
}

#[tauri::command]
fn set_port(shared: State<Shared>, port: u16) -> Result<ServerInfo, String> {
    if shared.is_running() {
        return Err("stop the server before changing the port".into());
    }
    if port < 1024 {
        return Err("port must be >= 1024".into());
    }
    shared.set_port(port);
    Ok(build_info(&shared))
}

#[tauri::command]
fn regenerate_pin(shared: State<Shared>) -> String {
    shared.regenerate_pin()
}

#[tauri::command]
fn set_video(shared: State<Shared>, enabled: bool) -> bool {
    shared.set_video(enabled);
    shared.video_enabled()
}

#[tauri::command]
fn set_captures_allowed(shared: State<Shared>, enabled: bool) -> bool {
    shared.set_captures_allowed(enabled);
    shared.captures_allowed()
}

#[tauri::command]
fn get_devices(shared: State<Shared>) -> Vec<DeviceInfo> {
    shared.devices()
}

#[tauri::command]
fn quit(app: tauri::AppHandle) {
    app.exit(0);
}

fn show_main(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            app.manage(Shared::new());

            // Icône de barre système (tray) : l'app continue de tourner fenêtre fermée.
            let show_i = MenuItem::with_id(app, "show", "Afficher Rem", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quitter", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Rem — Remote Control")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => show_main(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main(tray.app_handle());
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            // Fermer la fenêtre = la cacher (tray). Le serveur continue.
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_server_info,
            start_server,
            stop_server,
            set_port,
            regenerate_pin,
            set_video,
            set_captures_allowed,
            get_devices,
            quit,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
