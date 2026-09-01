// Audio capture (WASAPI): microphone (default capture device) and system loopback
// (default render device). Produces 16-bit mono PCM frames at 48 kHz.
use std::collections::VecDeque;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{channel, Receiver};
use std::sync::Arc;

use wasapi::{Direction, DeviceEnumerator, SampleType, StreamMode, WaveFormat};

pub const SAMPLE_RATE: u32 = 48000;
const CHANNELS: u32 = 2;

pub struct AudioSource {
    pub rx: Receiver<Vec<i16>>,
    stop: Arc<AtomicBool>,
}

impl Drop for AudioSource {
    fn drop(&mut self) {
        self.stop.store(true, Ordering::SeqCst);
    }
}

pub fn available() -> bool {
    let _ = wasapi::initialize_mta();
    DeviceEnumerator::new()
        .and_then(|e| e.get_default_device(&Direction::Capture))
        .is_ok()
}

/// Start a capture source. `loopback = true` → system playback, else microphone.
pub fn start(loopback: bool) -> AudioSource {
    let (tx, rx) = channel::<Vec<i16>>();
    let stop = Arc::new(AtomicBool::new(false));
    let stop2 = stop.clone();
    std::thread::spawn(move || {
        if let Err(e) = run(loopback, tx, stop2) {
            eprintln!("audio ({}) : {e}", if loopback { "system" } else { "mic" });
        }
    });
    AudioSource { rx, stop }
}

fn run(
    loopback: bool,
    tx: std::sync::mpsc::Sender<Vec<i16>>,
    stop: Arc<AtomicBool>,
) -> Result<(), String> {
    let _ = wasapi::initialize_mta();

    let dir = if loopback {
        Direction::Render // loopback : on capture la sortie
    } else {
        Direction::Capture // micro
    };

    let enumerator = DeviceEnumerator::new().map_err(|e| e.to_string())?;
    let device = enumerator
        .get_default_device(&dir)
        .map_err(|e| e.to_string())?;
    let mut audio_client = device.get_iaudioclient().map_err(|e| e.to_string())?;

    let format = WaveFormat::new(16, 16, &SampleType::Int, SAMPLE_RATE as usize, CHANNELS as usize, None);
    let (_def, min_time) = audio_client.get_device_period().map_err(|e| e.to_string())?;
    let mode = StreamMode::EventsShared {
        autoconvert: true,
        buffer_duration_hns: min_time,
    };
    // pour le loopback, le client de capture s'ouvre sur le device de rendu
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
            // pas d'audio depuis 1 s : on continue (silence) tant que pas stop
            continue;
        }
        let n = q.len() - (q.len() % 4); // 2 ch * 2 octets
        if n == 0 {
            continue;
        }
        let mut out = Vec::with_capacity(n / 4);
        for _ in 0..(n / 4) {
            let l = i16::from_le_bytes([q.pop_front().unwrap(), q.pop_front().unwrap()]);
            let r = i16::from_le_bytes([q.pop_front().unwrap(), q.pop_front().unwrap()]);
            out.push(((l as i32 + r as i32) / 2) as i16);
        }
        if tx.send(out).is_err() {
            break; // client parti
        }
    }
    let _ = audio_client.stop_stream();
    Ok(())
}
