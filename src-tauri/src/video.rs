// Screen capture → JPEG frames for the v2 video stream.
use image::{codecs::jpeg::JpegEncoder, imageops::FilterType, DynamicImage, ExtendedColorType, RgbaImage};
use xcap::Monitor;

const MAX_W: u32 = 1280;
const QUALITY: u8 = 55;

pub fn available() -> bool {
    Monitor::all().map(|m| !m.is_empty()).unwrap_or(false)
}

fn primary() -> Result<Monitor, String> {
    let mons = Monitor::all().map_err(|e| format!("monitors: {e}"))?;
    mons.iter()
        .find(|m| m.is_primary())
        .cloned()
        .or_else(|| mons.into_iter().next())
        .ok_or_else(|| "no monitor".to_string())
}

pub struct Grabber {
    mon: Monitor,
}

impl Grabber {
    pub fn new() -> Result<Self, String> {
        Ok(Self { mon: primary()? })
    }

    /// Capture one frame and return JPEG bytes.
    pub fn frame(&self) -> Result<Vec<u8>, String> {
        let cap = self.mon.capture_image().map_err(|e| format!("capture: {e}"))?;
        let (w, h) = (cap.width(), cap.height());
        let raw = cap.into_raw(); // RGBA8, version-independent
        let img = RgbaImage::from_raw(w, h, raw).ok_or("bad frame buffer")?;
        let mut dynimg = DynamicImage::ImageRgba8(img);
        if w > MAX_W {
            let nh = (h as u64 * MAX_W as u64 / w as u64) as u32;
            dynimg = dynimg.resize(MAX_W, nh.max(1), FilterType::Triangle);
        }
        let rgb = dynimg.to_rgb8();
        let mut buf = Vec::with_capacity(64 * 1024);
        JpegEncoder::new_with_quality(&mut buf, QUALITY)
            .encode(rgb.as_raw(), rgb.width(), rgb.height(), ExtendedColorType::Rgb8)
            .map_err(|e| format!("jpeg: {e}"))?;
        Ok(buf)
    }
}
