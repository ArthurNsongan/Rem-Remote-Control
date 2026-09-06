use std::collections::{HashMap, HashSet};
use std::net::IpAddr;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use rand::Rng;
use serde::Serialize;
use tokio::sync::oneshot;

pub const DEFAULT_PORT: u16 = 9847;

/// Échecs d'appairage tolérés par IP avant verrouillage temporaire.
const MAX_PAIR_FAILS: u32 = 5;
/// Durée du verrouillage, et fenêtre de remise à zéro du compteur.
const PAIR_LOCK: Duration = Duration::from_secs(60);

/// Tentatives d'appairage d'une IP donnée.
#[derive(Default)]
struct Attempts {
    fails: u32,
    last_fail: Option<Instant>,
    locked_until: Option<Instant>,
}

/// Résultat d'une tentative d'appairage.
pub enum PairOutcome {
    Ok(String),
    Invalid { remaining: u32 },
    Locked { retry_after: u64 },
}

/// Comparaison à temps constant : évite de fuiter le préfixe correct du PIN
/// via le temps de réponse. La longueur du PIN est fixe et publique.
fn ct_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    a.iter().zip(b).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
}

#[derive(Clone, Serialize)]
pub struct DeviceInfo {
    pub addr: String,
    pub user_agent: String,
    pub connected_at: u64,
}

pub struct Inner {
    pub pin: Mutex<String>,
    pub port: Mutex<u16>,
    pub tokens: Mutex<HashSet<String>>,
    pub devices: Mutex<HashMap<u64, DeviceInfo>>,
    pub running: AtomicBool,
    pub video_enabled: AtomicBool,
    pub captures_allowed: AtomicBool,
    pub cam_active: AtomicU64,
    pub mic_active: AtomicU64,
    pub sys_active: AtomicU64,
    pub shutdown: Mutex<Option<oneshot::Sender<()>>>,
    /// Limitation du brute-force sur /pair, par IP source.
    pair_attempts: Mutex<HashMap<IpAddr, Attempts>>,
    next_id: AtomicU64,
}

#[derive(Clone)]
pub struct Shared(pub Arc<Inner>);

fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

fn gen_pin() -> String {
    let mut rng = rand::thread_rng();
    (0..6).map(|_| rng.gen_range(0..10).to_string()).collect()
}

fn gen_token() -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let mut rng = rand::thread_rng();
    (0..32)
        .map(|_| CHARS[rng.gen_range(0..CHARS.len())] as char)
        .collect()
}

impl Shared {
    pub fn new() -> Self {
        Shared(Arc::new(Inner {
            pin: Mutex::new(gen_pin()),
            port: Mutex::new(DEFAULT_PORT),
            tokens: Mutex::new(HashSet::new()),
            devices: Mutex::new(HashMap::new()),
            running: AtomicBool::new(false),
            video_enabled: AtomicBool::new(false),
            captures_allowed: AtomicBool::new(true),
            cam_active: AtomicU64::new(0),
            mic_active: AtomicU64::new(0),
            sys_active: AtomicU64::new(0),
            shutdown: Mutex::new(None),
            pair_attempts: Mutex::new(HashMap::new()),
            next_id: AtomicU64::new(1),
        }))
    }

    pub fn pin(&self) -> String {
        self.0.pin.lock().unwrap().clone()
    }

    pub fn regenerate_pin(&self) -> String {
        let p = gen_pin();
        *self.0.pin.lock().unwrap() = p.clone();
        // existing sessions stay valid; tokens are independent of the pin
        p
    }

    pub fn port(&self) -> u16 {
        *self.0.port.lock().unwrap()
    }

    pub fn set_port(&self, port: u16) {
        *self.0.port.lock().unwrap() = port;
    }

    pub fn is_running(&self) -> bool {
        self.0.running.load(Ordering::SeqCst)
    }

    pub fn video_enabled(&self) -> bool {
        self.0.video_enabled.load(Ordering::SeqCst)
    }

    pub fn set_video(&self, on: bool) {
        self.0.video_enabled.store(on, Ordering::SeqCst);
    }

    pub fn captures_allowed(&self) -> bool {
        self.0.captures_allowed.load(Ordering::SeqCst)
    }

    pub fn set_captures_allowed(&self, on: bool) {
        self.0.captures_allowed.store(on, Ordering::SeqCst);
    }

    pub fn cam_active(&self) -> bool {
        self.0.cam_active.load(Ordering::SeqCst) > 0
    }
    pub fn mic_active(&self) -> bool {
        self.0.mic_active.load(Ordering::SeqCst) > 0
    }
    pub fn sys_active(&self) -> bool {
        self.0.sys_active.load(Ordering::SeqCst) > 0
    }

    /// RAII-style activity counter guard for a capture kind.
    pub fn cam_guard(&self) -> ActiveGuard {
        ActiveGuard::new(self.0.clone(), Kind::Cam)
    }
    pub fn mic_guard(&self) -> ActiveGuard {
        ActiveGuard::new(self.0.clone(), Kind::Mic)
    }
    pub fn sys_guard(&self) -> ActiveGuard {
        ActiveGuard::new(self.0.clone(), Kind::Sys)
    }

    /// Vérifie le PIN pour une IP donnée, en limitant le brute-force.
    ///
    /// Un PIN à 6 chiffres ne fait que 10^6 combinaisons : sans limite, il se
    /// parcourt en quelques minutes sur un réseau local. Après MAX_PAIR_FAILS
    /// échecs, l'IP est verrouillée PAIR_LOCK secondes, ce qui ramène le temps
    /// d'exploration à plusieurs mois.
    pub fn verify_pin(&self, ip: IpAddr, candidate: &str) -> PairOutcome {
        let now = Instant::now();
        let mut map = self.0.pair_attempts.lock().unwrap();

        // Purge des IP inactives : la table ne doit pas croître indéfiniment.
        map.retain(|_, a| {
            a.locked_until.is_some_and(|t| t > now)
                || a.last_fail.is_some_and(|t| now.duration_since(t) < PAIR_LOCK)
        });

        let entry = map.entry(ip).or_default();

        if let Some(until) = entry.locked_until {
            if until > now {
                return PairOutcome::Locked {
                    retry_after: (until - now).as_secs() + 1,
                };
            }
            *entry = Attempts::default(); // verrou expiré
        }
        // Fenêtre glissante : on repart de zéro après une période sans échec.
        if entry.last_fail.is_some_and(|t| now.duration_since(t) >= PAIR_LOCK) {
            *entry = Attempts::default();
        }

        let expected = self.0.pin.lock().unwrap().clone();
        if ct_eq(candidate.as_bytes(), expected.as_bytes()) {
            *entry = Attempts::default();
            drop(map);
            let token = gen_token();
            self.0.tokens.lock().unwrap().insert(token.clone());
            return PairOutcome::Ok(token);
        }

        entry.fails += 1;
        entry.last_fail = Some(now);
        if entry.fails >= MAX_PAIR_FAILS {
            entry.locked_until = Some(now + PAIR_LOCK);
            eprintln!("appairage verrouille pour {ip} ({MAX_PAIR_FAILS} echecs)");
            return PairOutcome::Locked {
                retry_after: PAIR_LOCK.as_secs(),
            };
        }
        PairOutcome::Invalid {
            remaining: MAX_PAIR_FAILS - entry.fails,
        }
    }

    pub fn check_token(&self, token: &str) -> bool {
        self.0.tokens.lock().unwrap().contains(token)
    }

    pub fn add_device(&self, addr: String, user_agent: String) -> u64 {
        let id = self.0.next_id.fetch_add(1, Ordering::SeqCst);
        self.0.devices.lock().unwrap().insert(
            id,
            DeviceInfo {
                addr,
                user_agent,
                connected_at: now(),
            },
        );
        id
    }

    pub fn remove_device(&self, id: u64) {
        self.0.devices.lock().unwrap().remove(&id);
    }

    pub fn devices(&self) -> Vec<DeviceInfo> {
        self.0.devices.lock().unwrap().values().cloned().collect()
    }

    pub fn clear_sessions(&self) {
        self.0.tokens.lock().unwrap().clear();
        self.0.devices.lock().unwrap().clear();
    }
}

pub enum Kind {
    Cam,
    Mic,
    Sys,
}

/// Increments an activity counter on creation, decrements on drop (host indicator).
pub struct ActiveGuard {
    inner: Arc<Inner>,
    kind: Kind,
}

impl ActiveGuard {
    fn new(inner: Arc<Inner>, kind: Kind) -> Self {
        match kind {
            Kind::Cam => inner.cam_active.fetch_add(1, Ordering::SeqCst),
            Kind::Mic => inner.mic_active.fetch_add(1, Ordering::SeqCst),
            Kind::Sys => inner.sys_active.fetch_add(1, Ordering::SeqCst),
        };
        ActiveGuard { inner, kind }
    }
}

impl Drop for ActiveGuard {
    fn drop(&mut self) {
        match self.kind {
            Kind::Cam => self.inner.cam_active.fetch_sub(1, Ordering::SeqCst),
            Kind::Mic => self.inner.mic_active.fetch_sub(1, Ordering::SeqCst),
            Kind::Sys => self.inner.sys_active.fetch_sub(1, Ordering::SeqCst),
        };
    }
}
