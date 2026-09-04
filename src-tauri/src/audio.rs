//! Capture audio multi-plateforme : micro et son système (loopback).
//! Produit des trames PCM 16 bits mono à 48 kHz, quelle que soit la plateforme.
//!
//! - Windows : WASAPI (loopback natif sur le périphérique de rendu)
//! - Linux   : `parec` (PulseAudio / PipeWire), monitor du sink par défaut
//! - macOS   : non supporté (pas de loopback natif sans pilote tiers)

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{channel, Receiver};
use std::sync::Arc;

pub const SAMPLE_RATE: u32 = 48000;

pub struct AudioSource {
    pub rx: Receiver<Vec<i16>>,
    stop: Arc<AtomicBool>,
}

impl Drop for AudioSource {
    fn drop(&mut self) {
        self.stop.store(true, Ordering::SeqCst);
    }
}

/// Vrai si la capture audio est possible sur cette machine.
pub fn available() -> bool {
    imp::available()
}

/// Démarre une capture. `loopback = true` → son système, sinon micro.
pub fn start(loopback: bool) -> AudioSource {
    let (tx, rx) = channel::<Vec<i16>>();
    let stop = Arc::new(AtomicBool::new(false));
    let stop2 = stop.clone();
    std::thread::spawn(move || {
        if let Err(e) = imp::run(loopback, tx, stop2) {
            eprintln!("audio ({}) : {e}", if loopback { "system" } else { "mic" });
        }
    });
    AudioSource { rx, stop }
}

// ---------------------------------------------------------------- Windows

#[cfg(target_os = "windows")]
mod imp {
    use super::SAMPLE_RATE;
    use std::collections::VecDeque;
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::mpsc::Sender;
    use std::sync::Arc;
    use wasapi::{DeviceEnumerator, Direction, SampleType, StreamMode, WaveFormat};

    const CHANNELS: usize = 2;

    pub fn available() -> bool {
        let _ = wasapi::initialize_mta();
        DeviceEnumerator::new()
            .and_then(|e| e.get_default_device(&Direction::Capture))
            .is_ok()
    }

    pub fn run(
        loopback: bool,
        tx: Sender<Vec<i16>>,
        stop: Arc<AtomicBool>,
    ) -> Result<(), String> {
        let _ = wasapi::initialize_mta();

        // Le loopback s'obtient en ouvrant le périphérique de RENDU en capture.
        let dir = if loopback { Direction::Render } else { Direction::Capture };

        let enumerator = DeviceEnumerator::new().map_err(|e| e.to_string())?;
        let device = enumerator.get_default_device(&dir).map_err(|e| e.to_string())?;
        let mut audio_client = device.get_iaudioclient().map_err(|e| e.to_string())?;

        let format = WaveFormat::new(16, 16, &SampleType::Int, SAMPLE_RATE as usize, CHANNELS, None);
        let (_def, min_time) = audio_client.get_device_period().map_err(|e| e.to_string())?;
        let mode = StreamMode::EventsShared {
            autoconvert: true,
            buffer_duration_hns: min_time,
        };
        audio_client
            .initialize_client(&format, &Direction::Capture, &mode)
            .map_err(|e| e.to_string())?;

        let h_event = audio_client.set_get_eventhandle().map_err(|e| e.to_string())?;
        let capture_client = audio_client.get_audiocaptureclient().map_err(|e| e.to_string())?;
        audio_client.start_stream().map_err(|e| e.to_string())?;

        let mut q: VecDeque<u8> = VecDeque::with_capacity(128 * 1024);
        while !stop.load(Ordering::SeqCst) {
            capture_client
                .read_from_device_to_deque(&mut q)
                .map_err(|e| e.to_string())?;
            if h_event.wait_for_event(1000).is_err() {
                continue; // pas d'audio depuis 1 s
            }
            let n = q.len() - (q.len() % 4); // 2 canaux * 2 octets
            if n == 0 {
                continue;
            }
            let mut out = Vec::with_capacity(n / 4);
            for _ in 0..(n / 4) {
                let l = i16::from_le_bytes([q.pop_front().unwrap(), q.pop_front().unwrap()]);
                let r = i16::from_le_bytes([q.pop_front().unwrap(), q.pop_front().unwrap()]);
                out.push(((l as i32 + r as i32) / 2) as i16); // downmix mono
            }
            if tx.send(out).is_err() {
                break; // client parti
            }
        }
        let _ = audio_client.stop_stream();
        Ok(())
    }
}

// ------------------------------------------------------------------ Linux

#[cfg(target_os = "linux")]
mod imp {
    use super::SAMPLE_RATE;
    use std::io::Read;
    use std::process::{Command, Stdio};
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::mpsc::Sender;
    use std::sync::Arc;

    /// `parec` fait partie de pulseaudio-utils (fonctionne aussi avec pipewire-pulse).
    pub fn available() -> bool {
        Command::new("parec")
            .arg("--version")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
    }

    pub fn run(
        loopback: bool,
        tx: Sender<Vec<i16>>,
        stop: Arc<AtomicBool>,
    ) -> Result<(), String> {
        // @DEFAULT_MONITOR@ = ce que joue le PC ; @DEFAULT_SOURCE@ = micro.
        let device = if loopback { "@DEFAULT_MONITOR@" } else { "@DEFAULT_SOURCE@" };
        let rate = format!("--rate={SAMPLE_RATE}");

        let mut child = Command::new("parec")
            .args(["--format=s16le", &rate, "--channels=1", "--raw", "-d", device])
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|e| format!("parec indisponible ({e}) — installe pulseaudio-utils"))?;

        let mut out = child.stdout.take().ok_or("parec : pas de sortie")?;
        let mut buf = [0u8; 4096];

        while !stop.load(Ordering::SeqCst) {
            match out.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let n = n - (n % 2);
                    let mut samples = Vec::with_capacity(n / 2);
                    for c in buf[..n].chunks_exact(2) {
                        samples.push(i16::from_le_bytes([c[0], c[1]]));
                    }
                    if tx.send(samples).is_err() {
                        break; // client parti
                    }
                }
                Err(e) => {
                    let _ = child.kill();
                    return Err(e.to_string());
                }
            }
        }
        let _ = child.kill();
        let _ = child.wait();
        Ok(())
    }
}

// ------------------------------------------------- macOS / autres systèmes

#[cfg(not(any(target_os = "windows", target_os = "linux")))]
mod imp {
    use std::sync::atomic::AtomicBool;
    use std::sync::mpsc::Sender;
    use std::sync::Arc;

    pub fn available() -> bool {
        false // macOS : pas de loopback système sans pilote tiers (BlackHole, etc.)
    }

    pub fn run(
        _loopback: bool,
        _tx: Sender<Vec<i16>>,
        _stop: Arc<AtomicBool>,
    ) -> Result<(), String> {
        Err("capture audio non supportée sur cette plateforme".into())
    }
}
