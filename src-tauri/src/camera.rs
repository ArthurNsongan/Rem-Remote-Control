// Webcam capture → JPEG frames (reuses the MJPEG stream pattern of video.rs).
use image::{codecs::jpeg::JpegEncoder, ExtendedColorType};
use nokhwa::{
    pixel_format::RgbFormat,
    utils::{ApiBackend, CameraIndex, RequestedFormat, RequestedFormatType},
    Camera,
};

const QUALITY: u8 = 60;

pub fn available() -> bool {
    nokhwa::query(ApiBackend::Auto)
        .map(|c| !c.is_empty())
        .unwrap_or(false)
}

pub struct CamGrabber {
    cam: Camera,
}

impl CamGrabber {
    pub fn new() -> Result<Self, String> {
        let fmt = RequestedFormat::new::<RgbFormat>(RequestedFormatType::AbsoluteHighestFrameRate);
        let mut cam =
            Camera::new(CameraIndex::Index(0), fmt).map_err(|e| format!("camera open: {e}"))?;
        cam.open_stream().map_err(|e| format!("camera stream: {e}"))?;
        Ok(Self { cam })
    }

    pub fn frame(&mut self) -> Result<Vec<u8>, String> {
        let f = self.cam.frame().map_err(|e| format!("camera frame: {e}"))?;
        let img = f
            .decode_image::<RgbFormat>()
            .map_err(|e| format!("decode: {e}"))?;
        let (w, h) = (img.width(), img.height());
        let raw = img.into_raw();
        let mut buf = Vec::with_capacity(48 * 1024);
        JpegEncoder::new_with_quality(&mut buf, QUALITY)
            .encode(&raw, w, h, ExtendedColorType::Rgb8)
            .map_err(|e| format!("jpeg: {e}"))?;
        Ok(buf)
    }
}
