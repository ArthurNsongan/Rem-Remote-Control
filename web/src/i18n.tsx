import { createContext, createElement, useContext, type ReactNode } from "react";
import { createI18n, type I18n } from "@shared/i18n";

/**
 * Libellés du client (téléphone / tablette / autre PC). Le français fait
 * référence : une clef manquante côté anglais ne compile pas.
 */
const dict = {
  fr: {
    // Modules
    mod_trackpad: "Trackpad",
    mod_keyboard: "Clavier live",
    mod_video: "Écran",
    mod_camera: "Caméra",
    mod_audio_pc: "Audio PC",
    mod_mic: "Micro PC",
    mod_media: "Média",
    mod_system: "Système",

    // En-tête
    connected: "Connecté",
    connecting: "Connexion…",
    disconnected: "Déconnecté",
    logout: "Déconnexion",
    // Dock et feuilles
    nav_more: "Plus",
    sheet_modules: "Modules",
    sheet_settings: "Réglages",
    module_remove: "Retirer",
    no_module: "Aucun module actif",
    no_module_hint: "Touche « Plus » pour en choisir un.",
    set_lang: "Langue",
    set_session: "Session",
    set_since: "Connecté depuis {h}",
    set_logout: "Se déconnecter",

    conn_on_standard: "Connexion standard",
    conn_on_secure: "Connexion chiffrée",
    conn_to_secure: "Passer en connexion chiffrée",
    conn_to_standard: "Revenir à la connexion standard",
    conn_standard_pro: "Connexion immédiate, rien à confirmer.",
    conn_standard_con: "Le trafic n'est pas chiffré sur le réseau.",
    conn_secure_pro: "Tout le trafic est chiffré.",
    conn_secure_con: "Ton navigateur demande de confirmer le certificat du PC, une seule fois.",

    // Appairage
    pair_prompt: "Entre le code PIN affiché sur le PC",
    pair_bad: "Code incorrect, réessaie",
    pair_bad_one: "Code incorrect — 1 tentative restante",
    pair_bad_many: "Code incorrect — {n} tentatives restantes",
    pair_net: "Serveur injoignable",
    pair_locked: "Trop de tentatives — réessaie dans {s}s",
    pair_locked_btn: "Verrouillé {s}s",
    pair_connecting: "Connexion…",
    pair_connect: "Se connecter",

    // Trackpad
    pad_hint: "GLISSE POUR BOUGER · TAP = CLIC",
    sensitivity: "SENSIBILITÉ",
    click_left: "Clic gauche",
    click_right: "Clic droit",

    // Clavier
    live_on: "Clavier actif · tape, ça part en direct",
    live_off: "Touche ici pour activer le clavier du téléphone",
    live_placeholder: "Écris ici… (envoyé en temps réel)",

    // Média
    volume: "VOLUME",

    // Système
    presentation: "PRÉSENTATION",
    slide_prev: "Précédent",
    slide_next: "Suivant",
    power: "ALIMENTATION",
    lock: "Verrouiller",
    sleep: "Veille",
    shutdown: "Éteindre",
    ask_sleep_t: "Mettre en veille ?",
    ask_sleep_d: "Le PC va se mettre en veille.",
    ask_shutdown_t: "Éteindre le PC ?",
    ask_shutdown_d: "Le PC va s'éteindre immédiatement.",
    cancel: "Annuler",
    confirm: "Confirmer",

    // Audio
    audio_mic_title: "Micro du PC",
    audio_sys_title: "Audio du PC",
    audio_unavailable: "Indisponible sur le PC",
    audio_error: "Erreur de flux",
    audio_on: "En écoute… 🔊",
    audio_off: "Touche pour écouter en direct",
    listen: "Écouter",
    stop: "Stop",

    // Caméra
    cam_alt: "caméra",
    cam_title: "Caméra du PC",
    cam_none: "Aucune caméra sur le PC",
    cam_hint: "Démarre pour voir le flux webcam du PC.",
    cam_start: "Démarrer la caméra",
    cam_stop: "Arrêter la caméra",

    // Écran
    screen_alt: "écran",
    screen_off: "Flux désactivé sur le PC",
    screen_na: "Capture indisponible sur le PC",
    screen_hint:
      "Active « Partage d'écran » dans le dashboard du PC, puis touche l'image pour viser.",
    screen_gestures: "Touche = viser + clic · glisse = déplacer · double = double-clic",

    fs_enter: "Plein écran",
    fs_enter_land: "Plein écran paysage",
    fs_exit: "Quitter le plein écran",
  },
  en: {
    mod_trackpad: "Trackpad",
    mod_keyboard: "Live keyboard",
    mod_video: "Screen",
    mod_camera: "Camera",
    mod_audio_pc: "PC audio",
    mod_mic: "PC mic",
    mod_media: "Media",
    mod_system: "System",

    connected: "Connected",
    connecting: "Connecting…",
    disconnected: "Disconnected",
    logout: "Log out",
    nav_more: "More",
    sheet_modules: "Modules",
    sheet_settings: "Settings",
    module_remove: "Remove",
    no_module: "No active module",
    no_module_hint: "Tap “More” to pick one.",
    set_lang: "Language",
    set_session: "Session",
    set_since: "Connected since {h}",
    set_logout: "Log out",

    conn_on_standard: "Standard connection",
    conn_on_secure: "Encrypted connection",
    conn_to_secure: "Switch to an encrypted connection",
    conn_to_standard: "Back to the standard connection",
    conn_standard_pro: "Connects instantly, nothing to confirm.",
    conn_standard_con: "Traffic is not encrypted on the network.",
    conn_secure_pro: "All traffic is encrypted.",
    conn_secure_con: "Your browser asks you to confirm the PC's certificate, once.",

    pair_prompt: "Enter the PIN shown on the PC",
    pair_bad: "Wrong code, try again",
    pair_bad_one: "Wrong code — 1 attempt left",
    pair_bad_many: "Wrong code — {n} attempts left",
    pair_net: "Server unreachable",
    pair_locked: "Too many attempts — try again in {s}s",
    pair_locked_btn: "Locked {s}s",
    pair_connecting: "Connecting…",
    pair_connect: "Connect",

    pad_hint: "DRAG TO MOVE · TAP TO CLICK",
    sensitivity: "SENSITIVITY",
    click_left: "Left click",
    click_right: "Right click",
    live_on: "Keyboard active · type, it goes through live",
    live_off: "Tap here to open your phone's keyboard",
    live_placeholder: "Type here… (sent in real time)",

    volume: "VOLUME",

    presentation: "PRESENTATION",
    slide_prev: "Previous",
    slide_next: "Next",
    power: "POWER",
    lock: "Lock",
    sleep: "Sleep",
    shutdown: "Shut down",
    ask_sleep_t: "Put the PC to sleep?",
    ask_sleep_d: "The PC will go to sleep.",
    ask_shutdown_t: "Shut down the PC?",
    ask_shutdown_d: "The PC will shut down immediately.",
    cancel: "Cancel",
    confirm: "Confirm",

    audio_mic_title: "PC microphone",
    audio_sys_title: "PC audio",
    audio_unavailable: "Unavailable on the PC",
    audio_error: "Stream error",
    audio_on: "Listening… 🔊",
    audio_off: "Tap to listen live",
    listen: "Listen",
    stop: "Stop",

    cam_alt: "camera",
    cam_title: "PC camera",
    cam_none: "No camera on the PC",
    cam_hint: "Start it to see the PC's webcam feed.",
    cam_start: "Start the camera",
    cam_stop: "Stop the camera",

    screen_alt: "screen",
    screen_off: "Stream turned off on the PC",
    screen_na: "Screen capture unavailable on the PC",
    screen_hint:
      "Turn on “Screen sharing” in the PC dashboard, then tap the image to point.",
    screen_gestures: "Tap = point + click · drag = move · double = double-click",

    fs_enter: "Fullscreen",
    fs_enter_land: "Landscape fullscreen",
    fs_exit: "Exit fullscreen",
  },
} as const;

export type ClientKey = keyof (typeof dict)["fr"];
export type ClientI18n = I18n<ClientKey>;

export const useI18n = createI18n<ClientKey>(dict);

// Le contexte évite de faire descendre `t` à travers neuf composants.
const Ctx = createContext<ClientI18n | null>(null);

export function I18nProvider({
  value,
  children,
}: {
  value: ClientI18n;
  children: ReactNode;
}) {
  return createElement(Ctx.Provider, { value }, children);
}

export function useT(): ClientI18n["t"] {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useT must be used inside <I18nProvider>");
  return ctx.t;
}
