import { invoke } from "@tauri-apps/api/core";

export interface ServerInfo {
  running: boolean;
  ip: string;
  port: number;
  pin: string;
  url: string;
  video_enabled: boolean;
  video_available: boolean;
  camera_available: boolean;
  audio_available: boolean;
  captures_allowed: boolean;
  cam_active: boolean;
  mic_active: boolean;
  sys_active: boolean;
}

export interface DeviceInfo {
  addr: string;
  user_agent: string;
  connected_at: number; // unix seconds
}

export const api = {
  getServerInfo: () => invoke<ServerInfo>("get_server_info"),
  startServer: () => invoke<ServerInfo>("start_server"),
  stopServer: () => invoke<void>("stop_server"),
  setPort: (port: number) => invoke<ServerInfo>("set_port", { port }),
  regeneratePin: () => invoke<string>("regenerate_pin"),
  setVideo: (enabled: boolean) => invoke<boolean>("set_video", { enabled }),
  setCapturesAllowed: (enabled: boolean) =>
    invoke<boolean>("set_captures_allowed", { enabled }),
  getDevices: () => invoke<DeviceInfo[]>("get_devices"),
};
