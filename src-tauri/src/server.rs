use std::net::SocketAddr;

use std::collections::HashMap;

use axum::{
    body::Body,
    extract::{
        connect_info::ConnectInfo,
        ws::{Message, WebSocket, WebSocketUpgrade},
        Query, State,
    },
    http::{header, StatusCode, Uri},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use enigo::{Direction, Enigo};
use futures_util::stream::StreamExt;
use rust_embed::RustEmbed;
use serde::Deserialize;
use serde_json::json;
use tokio::sync::{mpsc, oneshot};

use crate::input;
use crate::protocol::{ClientMessage, ServerMessage};
use crate::state::Shared;
use crate::{audio, camera, video};

#[derive(RustEmbed)]
#[folder = "../web/dist"]
struct WebAssets;

#[derive(Clone)]
struct AppState {
    shared: Shared,
    // enigo::Enigo is not Send/Sync, so input runs on a dedicated thread fed by
    // this channel. The sender is Send + Sync + Clone, which axum's state requires.
    input_tx: mpsc::UnboundedSender<ClientMessage>,
}

#[derive(Deserialize)]
struct PairBody {
    pin: String,
}

/// Applies one input command on the host (runs on the input worker thread).
fn apply(e: &mut Enigo, cmd: ClientMessage) {
    match cmd {
        ClientMessage::MouseMove { dx, dy } => input::mouse_move(e, dx, dy),
        ClientMessage::MouseAbs { x, y } => input::mouse_abs(e, x, y),
        ClientMessage::MouseClick { button } => input::mouse_button(e, button, Direction::Click),
        ClientMessage::MouseDouble { button } => input::mouse_double(e, button),
        ClientMessage::MouseDown { button } => input::mouse_button(e, button, Direction::Press),
        ClientMessage::MouseUp { button } => input::mouse_button(e, button, Direction::Release),
        ClientMessage::MouseScroll { dy } => input::mouse_scroll(e, dy),
        ClientMessage::Key { key } => input::special_key(e, key),
        ClientMessage::Text { text } => input::type_text(e, &text),
        ClientMessage::Media { action } => input::media(e, action),
        ClientMessage::System { action } => match crate::system::handle(action) {
            Some(next) => input::slide(e, next),
            None => {}
        },
        ClientMessage::Auth { .. } | ClientMessage::Ping => {}
    }
}

/// Starts the axum server on 0.0.0.0:port. Returns once bound (or with an error).
pub async fn start(shared: Shared, port: u16) -> Result<(), String> {
    // Verify enigo can init before binding, then hand a fresh instance to the worker.
    input::new_enigo()?;

    let (input_tx, mut input_rx) = mpsc::unbounded_channel::<ClientMessage>();
    std::thread::spawn(move || {
        let mut e = match input::new_enigo() {
            Ok(e) => e,
            Err(err) => {
                eprintln!("input worker: {err}");
                return;
            }
        };
        while let Some(cmd) = input_rx.blocking_recv() {
            apply(&mut e, cmd);
        }
    });

    let state = AppState {
        shared: shared.clone(),
        input_tx,
    };

    let app = Router::new()
        .route("/pair", post(pair))
        .route("/ws", get(ws_handler))
        .route("/api/public", get(api_public))
        .route("/stream", get(stream))
        .route("/camera", get(camera_stream))
        .route("/audio", get(audio_ws))
        .fallback(static_handler)
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .map_err(|e| format!("bind {addr}: {e}"))?;

    let (tx, rx) = oneshot::channel::<()>();
    *shared.0.shutdown.lock().unwrap() = Some(tx);
    shared
        .0
        .running
        .store(true, std::sync::atomic::Ordering::SeqCst);

    let shared_for_task = shared.clone();
    tokio::spawn(async move {
        let server = axum::serve(
            listener,
            app.into_make_service_with_connect_info::<SocketAddr>(),
        )
        .with_graceful_shutdown(async {
            let _ = rx.await;
        });
        if let Err(e) = server.await {
            eprintln!("server error: {e}");
        }
        shared_for_task
            .0
            .running
            .store(false, std::sync::atomic::Ordering::SeqCst);
        shared_for_task.clear_sessions();
    });

    Ok(())
}

async fn pair(State(state): State<AppState>, Json(body): Json<PairBody>) -> Response {
    match state.shared.verify_pin(body.pin.trim()) {
        Some(token) => Json(json!({ "token": token })).into_response(),
        None => (
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": "invalid_pin" })),
        )
            .into_response(),
    }
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    headers: axum::http::HeaderMap,
) -> Response {
    let ua = headers
        .get(header::USER_AGENT)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown")
        .to_string();
    ws.on_upgrade(move |socket| handle_socket(socket, state, addr, ua))
}

async fn handle_socket(mut socket: WebSocket, state: AppState, addr: SocketAddr, ua: String) {
    // First message must authenticate.
    let authed = match socket.next().await {
        Some(Ok(Message::Text(txt))) => match serde_json::from_str::<ClientMessage>(&txt) {
            Ok(ClientMessage::Auth { token }) => state.shared.check_token(&token),
            _ => false,
        },
        _ => false,
    };

    if !authed {
        let _ = socket
            .send(Message::Text(
                serde_json::to_string(&ServerMessage::Error {
                    msg: "unauthorized".into(),
                })
                .unwrap(),
            ))
            .await;
        return;
    }

    let _ = socket
        .send(Message::Text(
            serde_json::to_string(&ServerMessage::Authed).unwrap(),
        ))
        .await;

    let device_id = state.shared.add_device(addr.ip().to_string(), ua);

    while let Some(Ok(msg)) = socket.next().await {
        match msg {
            Message::Text(txt) => {
                if let Ok(cmd) = serde_json::from_str::<ClientMessage>(&txt) {
                    if matches!(cmd, ClientMessage::Ping) {
                        let _ = socket
                            .send(Message::Text(
                                serde_json::to_string(&ServerMessage::Pong).unwrap(),
                            ))
                            .await;
                        continue;
                    }
                    let _ = state.input_tx.send(cmd);
                }
            }
            Message::Close(_) => break,
            _ => {}
        }
    }

    state.shared.remove_device(device_id);
}

// --- video v2 ---

async fn api_public(State(state): State<AppState>) -> Response {
    Json(json!({
        "video": state.shared.video_enabled() && video::available(),
        "video_available": video::available(),
        "camera_available": camera::available(),
        "audio_available": audio::available(),
        "captures_allowed": state.shared.captures_allowed(),
    }))
    .into_response()
}

/// Webcam MJPEG stream (remote-activated: opening this starts capture).
async fn camera_stream(
    State(state): State<AppState>,
    Query(q): Query<HashMap<String, String>>,
) -> Response {
    let token = q.get("token").cloned().unwrap_or_default();
    if !state.shared.check_token(&token) {
        return (StatusCode::UNAUTHORIZED, "unauthorized").into_response();
    }
    if !state.shared.captures_allowed() {
        return (StatusCode::FORBIDDEN, "captures disabled on host").into_response();
    }
    if !camera::available() {
        return (StatusCode::SERVICE_UNAVAILABLE, "no camera").into_response();
    }

    let (tx, rx) = mpsc::channel::<Vec<u8>>(2);
    let shared = state.shared.clone();
    std::thread::spawn(move || {
        let _guard = shared.cam_guard();
        let mut grabber = match camera::CamGrabber::new() {
            Ok(g) => g,
            Err(e) => {
                eprintln!("camera: {e}");
                return;
            }
        };
        loop {
            if !shared.is_running() || !shared.captures_allowed() {
                break;
            }
            match grabber.frame() {
                Ok(jpeg) => {
                    if tx.blocking_send(jpeg).is_err() {
                        break;
                    }
                }
                Err(e) => {
                    eprintln!("camera frame: {e}");
                    std::thread::sleep(std::time::Duration::from_millis(300));
                }
            }
            std::thread::sleep(std::time::Duration::from_millis(80)); // ~12 fps
        }
    });

    let stream = futures_util::stream::unfold(rx, |mut rx| async move {
        let jpeg = rx.recv().await?;
        let mut chunk = Vec::with_capacity(jpeg.len() + 64);
        chunk.extend_from_slice(b"--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ");
        chunk.extend_from_slice(jpeg.len().to_string().as_bytes());
        chunk.extend_from_slice(b"\r\n\r\n");
        chunk.extend_from_slice(&jpeg);
        chunk.extend_from_slice(b"\r\n");
        Some((Ok::<Vec<u8>, std::io::Error>(chunk), rx))
    });

    Response::builder()
        .status(StatusCode::OK)
        .header(
            header::CONTENT_TYPE,
            "multipart/x-mixed-replace; boundary=frame",
        )
        .header(header::CACHE_CONTROL, "no-cache, no-store, must-revalidate")
        .body(Body::from_stream(stream))
        .unwrap()
}

/// Audio WebSocket: PCM i16 mono frames. ?src=mic|system (default mic).
async fn audio_ws(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    Query(q): Query<HashMap<String, String>>,
) -> Response {
    let token = q.get("token").cloned().unwrap_or_default();
    if !state.shared.check_token(&token) {
        return (StatusCode::UNAUTHORIZED, "unauthorized").into_response();
    }
    if !state.shared.captures_allowed() {
        return (StatusCode::FORBIDDEN, "captures disabled on host").into_response();
    }
    let loopback = q.get("src").map(|s| s == "system").unwrap_or(false);
    ws.on_upgrade(move |socket| audio_socket(socket, state.shared.clone(), loopback))
}

async fn audio_socket(mut socket: WebSocket, shared: Shared, loopback: bool) {
    let _guard = if loopback {
        shared.sys_guard()
    } else {
        shared.mic_guard()
    };

    // meta first
    let meta = json!({
        "type": "audio_meta",
        "sample_rate": audio::SAMPLE_RATE,
        "channels": 1
    });
    if socket
        .send(Message::Text(meta.to_string()))
        .await
        .is_err()
    {
        return;
    }

    let source = audio::start(loopback);
    loop {
        if !shared.is_running() || !shared.captures_allowed() {
            break;
        }
        match source.rx.try_recv() {
            Ok(samples) => {
                let mut bytes = Vec::with_capacity(samples.len() * 2);
                for s in samples {
                    bytes.extend_from_slice(&s.to_le_bytes());
                }
                if socket.send(Message::Binary(bytes)).await.is_err() {
                    break;
                }
            }
            Err(std::sync::mpsc::TryRecvError::Empty) => {
                tokio::time::sleep(std::time::Duration::from_millis(8)).await;
            }
            Err(std::sync::mpsc::TryRecvError::Disconnected) => break,
        }
    }
    // source dropped here -> capture thread stops
}

// --- static web client serving (embedded) ---

/// MJPEG stream (multipart/x-mixed-replace). Token passed as ?token= query.
async fn stream(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> Response {
    let token = q.get("token").cloned().unwrap_or_default();
    if !state.shared.check_token(&token) {
        return (StatusCode::UNAUTHORIZED, "unauthorized").into_response();
    }
    if !video::available() {
        return (StatusCode::SERVICE_UNAVAILABLE, "capture unavailable").into_response();
    }

    // Frames captured on a dedicated thread (xcap Grabber not held across await).
    let (tx, rx) = mpsc::channel::<Vec<u8>>(2);
    let shared = state.shared.clone();
    std::thread::spawn(move || {
        let grabber = match video::Grabber::new() {
            Ok(g) => g,
            Err(e) => {
                eprintln!("grabber: {e}");
                return;
            }
        };
        loop {
            if !shared.is_running() {
                break;
            }
            if !shared.video_enabled() {
                std::thread::sleep(std::time::Duration::from_millis(200));
                continue;
            }
            match grabber.frame() {
                Ok(jpeg) => {
                    if tx.blocking_send(jpeg).is_err() {
                        break; // client gone
                    }
                }
                Err(e) => {
                    eprintln!("frame: {e}");
                    std::thread::sleep(std::time::Duration::from_millis(300));
                }
            }
            std::thread::sleep(std::time::Duration::from_millis(50)); // ~20 fps
        }
    });

    let stream = futures_util::stream::unfold(rx, |mut rx| async move {
        let jpeg = rx.recv().await?;
        let mut chunk = Vec::with_capacity(jpeg.len() + 64);
        chunk.extend_from_slice(b"--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ");
        chunk.extend_from_slice(jpeg.len().to_string().as_bytes());
        chunk.extend_from_slice(b"\r\n\r\n");
        chunk.extend_from_slice(&jpeg);
        chunk.extend_from_slice(b"\r\n");
        Some((Ok::<Vec<u8>, std::io::Error>(chunk), rx))
    });

    Response::builder()
        .status(StatusCode::OK)
        .header(
            header::CONTENT_TYPE,
            "multipart/x-mixed-replace; boundary=frame",
        )
        .header(header::CACHE_CONTROL, "no-cache, no-store, must-revalidate")
        .body(Body::from_stream(stream))
        .unwrap()
}

// --- static web client serving (embedded) ---

async fn static_handler(uri: Uri) -> Response {
    let path = uri.path().trim_start_matches('/');
    let path = if path.is_empty() { "index.html" } else { path };

    match WebAssets::get(path) {
        Some(content) => {
            let mime = mime_guess::from_path(path).first_or_octet_stream();
            (
                [(header::CONTENT_TYPE, mime.as_ref())],
                content.data.into_owned(),
            )
                .into_response()
        }
        None => {
            // SPA fallback
            match WebAssets::get("index.html") {
                Some(content) => (
                    [(header::CONTENT_TYPE, "text/html")],
                    content.data.into_owned(),
                )
                    .into_response(),
                None => (StatusCode::NOT_FOUND, "web client not built").into_response(),
            }
        }
    }
}
