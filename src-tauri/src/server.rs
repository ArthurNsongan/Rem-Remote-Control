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
use crate::state::{PairOutcome, Shared};
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

/// Nom du cookie de session pose a l'appairage.
const TOKEN_COOKIE: &str = "rem_token";

/// Extrait le jeton de session du cookie de la requete.
///
/// Les flux `<img>` (MJPEG) ne peuvent pas porter d'en-tete d'autorisation :
/// le jeton passait donc en parametre d'URL, ou il finissait dans
/// l'historique du navigateur, les journaux des proxys traverses et l'en-tete
/// Referer. Un cookie HttpOnly le sort de l'URL et le rend illisible au
/// JavaScript de la page.
fn cookie_token(headers: &axum::http::HeaderMap) -> Option<String> {
    let raw = headers.get(header::COOKIE)?.to_str().ok()?;
    raw.split(';')
        .filter_map(|kv| kv.split_once('='))
        .find(|(k, _)| k.trim() == TOKEN_COOKIE)
        .map(|(_, v)| v.trim().to_string())
}

/// La requete provient-elle d'une page servie par ce meme serveur ?
///
/// Sans cette verification, n'importe quelle page ouverte sur un appareil du
/// reseau peut ouvrir un WebSocket vers Rem (les WebSockets echappent a la
/// same-origin policy). On compare l'origine a l'hote demande. Un `Origin`
/// absent est accepte : les clients non-navigateur n'en envoient pas.
fn same_origin(headers: &axum::http::HeaderMap) -> bool {
    let origin = match headers.get(header::ORIGIN).and_then(|v| v.to_str().ok()) {
        Some(o) => o,
        None => return true,
    };
    let host = match headers.get(header::HOST).and_then(|v| v.to_str().ok()) {
        Some(h) => h,
        None => return false,
    };
    // "http://192.168.1.20:9847" -> "192.168.1.20:9847"
    origin
        .split_once("://")
        .map(|(_, rest)| rest == host)
        .unwrap_or(false)
}

/// Echecs consecutifs tolerees par une boucle de capture avant abandon.
///
/// Quand la capture est structurellement impossible - session Wayland sans
/// portail, binaire lance en root, camera prise par un autre programme - elle
/// echoue a chaque image. Sans plafond, la boucle inonde le journal et occupe
/// un cœur pour rien. On arrete le flux : le client voit la connexion se
/// fermer, ce qui est un signal plus clair qu'une image figee.
const MAX_CAPTURE_FAILS: u32 = 20;

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
        .route("/logout", post(logout))
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

/// Appairage par PIN. Limité par IP : un PIN à 6 chiffres serait sinon
/// brute-forçable en quelques minutes depuis le réseau local.
async fn pair(
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    Json(body): Json<PairBody>,
) -> Response {
    match state.shared.verify_pin(addr.ip(), body.pin.trim()) {
        PairOutcome::Ok(token) => {
            // Le cookie authentifie les flux <img> et le WebSocket audio ; le
            // corps sert au message Auth du WebSocket de controle. Pas de
            // drapeau Secure : le serveur est en HTTP sur le LAN.
            let cookie = format!(
                "{TOKEN_COOKIE}={token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400"
            );
            (
                [(header::SET_COOKIE, cookie)],
                Json(json!({ "token": token })),
            )
                .into_response()
        }
        PairOutcome::Invalid { remaining } => (
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": "invalid_pin", "remaining": remaining })),
        )
            .into_response(),
        PairOutcome::Locked { retry_after } => (
            StatusCode::TOO_MANY_REQUESTS,
            [(header::RETRY_AFTER, retry_after.to_string())],
            Json(json!({ "error": "too_many_attempts", "retry_after": retry_after })),
        )
            .into_response(),
    }
}

/// Ferme la session : revoque le jeton cote serveur et efface le cookie.
///
/// Sans cela, un appareil "deconnecte" cote interface garderait un cookie
/// valide et pourrait continuer a lire les flux.
async fn logout(State(state): State<AppState>, headers: axum::http::HeaderMap) -> Response {
    if let Some(token) = cookie_token(&headers) {
        state.shared.revoke_token(&token);
    }
    let cleared = format!("{TOKEN_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0");
    ([(header::SET_COOKIE, cleared)], Json(json!({ "ok": true }))).into_response()
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    headers: axum::http::HeaderMap,
) -> Response {
    if !same_origin(&headers) {
        return (StatusCode::FORBIDDEN, "bad origin").into_response();
    }
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
    headers: axum::http::HeaderMap,
) -> Response {
    if !cookie_token(&headers).is_some_and(|t| state.shared.check_token(&t)) {
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
        let mut fails = 0u32;
        loop {
            if !shared.is_running() || !shared.captures_allowed() {
                break;
            }
            match grabber.frame() {
                Ok(jpeg) => {
                    fails = 0;
                    if tx.blocking_send(jpeg).is_err() {
                        break;
                    }
                }
                Err(e) => {
                    fails += 1;
                    if fails == 1 {
                        eprintln!("camera frame: {e}");
                    }
                    if fails >= MAX_CAPTURE_FAILS {
                        eprintln!("camera: abandon apres {fails} echecs consecutifs");
                        break;
                    }
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
    headers: axum::http::HeaderMap,
) -> Response {
    if !same_origin(&headers) {
        return (StatusCode::FORBIDDEN, "bad origin").into_response();
    }
    if !cookie_token(&headers).is_some_and(|t| state.shared.check_token(&t)) {
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

/// MJPEG stream (multipart/x-mixed-replace). Authentifie par cookie.
async fn stream(State(state): State<AppState>, headers: axum::http::HeaderMap) -> Response {
    if !cookie_token(&headers).is_some_and(|t| state.shared.check_token(&t)) {
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
        let mut fails = 0u32;
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
                    fails = 0;
                    if tx.blocking_send(jpeg).is_err() {
                        break; // client gone
                    }
                }
                Err(e) => {
                    fails += 1;
                    if fails == 1 {
                        eprintln!("frame: {e}");
                    }
                    if fails >= MAX_CAPTURE_FAILS {
                        eprintln!("capture ecran: abandon apres {fails} echecs consecutifs");
                        break;
                    }
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
