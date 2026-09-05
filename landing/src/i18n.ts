import { useCallback, useState } from "react";

export type Lang = "fr" | "en";

export const dict = {
  fr: {
    nav_features: "Fonctions",
    nav_how: "Comment ça marche",
    nav_github: "GitHub",
    download: "Télécharger",
    download_all: "Télécharger",
    download_sub: "Windows · Linux · macOS — gratuit, sans inscription",
    dl_windows: "Windows",
    dl_macos: "macOS",
    dl_linux: "Linux",
    dl_deb: "Debian / Ubuntu (.deb)",
    dl_all: "Toutes les versions",
    dl_detected: "détecté",

    hero_badge: "Contrôle à distance · réseau local",
    hero_title: "Ton PC, au bout des doigts.",
    hero_sub:
      "Contrôle ton ordinateur depuis ton téléphone, ta tablette ou un autre PC — souris, clavier, média, écran, caméra et audio. Tout reste sur ton réseau local.",
    hero_platform: "Version {v} · 100 % réseau local",
    hero_secondary: "Voir le code",

    features_title: "Tout pour piloter ta machine",
    features_sub: "Un seul appairage par code PIN, puis tout est à portée de main.",

    f_touchpad_t: "Souris & touchpad",
    f_touchpad_d: "Pavé tactile fluide, clic gauche/droit, double-clic, molette et sensibilité réglable.",
    f_keyboard_t: "Clavier temps réel",
    f_keyboard_d: "Tape avec le clavier natif de ton téléphone, envoyé en direct — ou un clavier virtuel dédié.",
    f_screen_t: "Écran tactile",
    f_screen_d: "Vois l'écran du PC et vise au doigt : le curseur va où tu touches. Plein écran paysage.",
    f_media_t: "Média & volume",
    f_media_d: "Play/pause, piste suivante/précédente, volume et muet, directement depuis le mobile.",
    f_capture_t: "Caméra · Micro · Audio",
    f_capture_d: "Regarde la webcam du PC et écoute son micro ou son audio système, en direct sur ton mobile.",
    f_system_t: "Présentation & système",
    f_system_d: "Diapos suivante/précédente, verrouiller, mise en veille et extinction (avec confirmation).",
    f_devices_t: "Multi-appareils",
    f_devices_d: "Téléphone, tablette ou autre ordinateur : n'importe quel navigateur sur le même Wi-Fi.",
    f_secure_t: "Appairage sécurisé",
    f_secure_d: "Code PIN + QR code, jeton de session. Rien ne sort de ton réseau local.",
    f_tray_t: "Discret en arrière-plan",
    f_tray_d: "Ferme la fenêtre : Rem continue dans la barre système, ton mobile reste connecté.",

    how_title: "Trois étapes, c'est parti",
    how_1_t: "Lance Rem sur le PC",
    how_1_d: "Démarre le serveur : un QR code et un code PIN s'affichent.",
    how_2_t: "Scanne le QR",
    how_2_d: "Depuis ton mobile sur le même Wi-Fi, ouvre le lien et entre le PIN.",
    how_3_t: "Contrôle",
    how_3_d: "Souris, clavier, écran, média, caméra… tout répond en direct.",

    footer_tag: "Contrôle à distance local. Rien ne quitte ton réseau.",
    footer_rights: "Tous droits réservés.",
    footer_made: "Windows · Linux · macOS — Tauri + React + Rust",
  },
  en: {
    nav_features: "Features",
    nav_how: "How it works",
    nav_github: "GitHub",
    download: "Download",
    download_all: "Download",
    download_sub: "Windows · Linux · macOS — free, no sign-up",
    dl_windows: "Windows",
    dl_macos: "macOS",
    dl_linux: "Linux",
    dl_deb: "Debian / Ubuntu (.deb)",
    dl_all: "All releases",
    dl_detected: "detected",

    hero_badge: "Remote control · local network",
    hero_title: "Your PC, at your fingertips.",
    hero_sub:
      "Control your computer from your phone, tablet or another PC — mouse, keyboard, media, screen, camera and audio. Everything stays on your local network.",
    hero_platform: "Version {v} · 100% local network",
    hero_secondary: "View the code",

    features_title: "Everything to drive your machine",
    features_sub: "One PIN pairing, then it's all within reach.",

    f_touchpad_t: "Mouse & touchpad",
    f_touchpad_d: "Smooth touchpad, left/right click, double-click, scroll and adjustable sensitivity.",
    f_keyboard_t: "Real-time keyboard",
    f_keyboard_d: "Type with your phone's native keyboard, streamed live — or a dedicated on-screen keyboard.",
    f_screen_t: "Touch the screen",
    f_screen_d: "See the PC screen and aim with your finger: the cursor goes where you touch. Landscape fullscreen.",
    f_media_t: "Media & volume",
    f_media_d: "Play/pause, next/previous track, volume and mute, straight from your phone.",
    f_capture_t: "Camera · Mic · Audio",
    f_capture_d: "Watch the PC webcam and listen to its mic or system audio, live on your phone.",
    f_system_t: "Presentation & system",
    f_system_d: "Next/previous slide, lock, sleep and shut down (with confirmation).",
    f_devices_t: "Any device",
    f_devices_d: "Phone, tablet or another computer: any browser on the same Wi-Fi.",
    f_secure_t: "Secure pairing",
    f_secure_d: "PIN + QR code, session token. Nothing leaves your local network.",
    f_tray_t: "Quiet in the background",
    f_tray_d: "Close the window: Rem keeps running in the tray, your phone stays connected.",

    how_title: "Three steps and you're in",
    how_1_t: "Launch Rem on the PC",
    how_1_d: "Start the server: a QR code and a PIN appear.",
    how_2_t: "Scan the QR",
    how_2_d: "From your phone on the same Wi-Fi, open the link and enter the PIN.",
    how_3_t: "Control",
    how_3_d: "Mouse, keyboard, screen, media, camera… everything responds live.",

    footer_tag: "Local remote control. Nothing leaves your network.",
    footer_rights: "All rights reserved.",
    footer_made: "Windows · Linux · macOS — Tauri + React + Rust",
  },
} as const;

export type Key = keyof (typeof dict)["fr"];

function detect(): Lang {
  const saved = localStorage.getItem("rem_lang") as Lang | null;
  if (saved === "fr" || saved === "en") return saved;
  return navigator.language?.toLowerCase().startsWith("fr") ? "fr" : "en";
}

export function useLang() {
  const [lang, setLangState] = useState<Lang>(detect);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("rem_lang", l);
    document.documentElement.lang = l;
  }, []);
  const t = useCallback(
    (k: Key, vars?: Record<string, string | number>) => {
      let s: string = dict[lang][k] ?? k;
      if (vars) for (const [key, val] of Object.entries(vars)) s = s.replace(`{${key}}`, String(val));
      return s;
    },
    [lang]
  );
  return { lang, setLang, t };
}
