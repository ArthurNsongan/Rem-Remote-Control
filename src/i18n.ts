import { createI18n, type I18n } from "@shared/i18n";

/**
 * Libellés de l'application hôte. Le français fait référence : toute clef
 * ajoutée ici doit l'être des deux côtés, sinon TypeScript refuse le build.
 */
const dict = {
  fr: {
    subtitle: "Contrôle à distance · LAN",
    online: "En ligne",
    offline: "Hors ligne",

    server_on: "Serveur actif",
    server_off: "Serveur arrêté",
    server_on_hint: "Les appareils du réseau peuvent se connecter",
    server_off_hint: "Démarre le serveur pour autoriser les connexions",
    start: "Démarrer",
    stop: "Arrêter",

    connection: "Connexion",
    pin: "Code PIN",
    regenerate: "Régénérer",
    devices: "Appareils",
    no_device: "Aucun appareil connecté",
    ago: "il y a {t}",

    screen_share: "Partage d'écran",
    active: "Actif",
    inactive: "Inactif",
    video_toggle: "Autoriser le flux vidéo (mode custom)",
    video_yes: "Le client peut voir l'écran et viser au doigt",
    video_no: "Capture indisponible sur cette machine",

    captures: "Captures à distance",
    allowed: "Autorisé",
    blocked: "Bloqué",
    captures_toggle: "Autoriser caméra / micro / audio à distance",
    captures_hint: "Le client peut écouter/voir le PC. Coupe pour tout bloquer.",
    camera: "Caméra",
    mic: "Micro",
    audio: "Audio",
    live: "en direct",
    ready: "prêt",
    unavailable: "indisponible",

    settings: "Réglages",
    port: "Port du serveur",
    apply: "Appliquer",
    port_locked: "Arrête le serveur pour changer le port",

    // Barre de menu
    menu: "Menu",
    reload: "Actualiser",
    source: "Code source",
    about: "À propos de Rem",
    about_body: "REM — Contrôle à distance\nRéseau local · v{v}\nTauri + React",
    quit: "Quitter",
    switch_lang: "English",
    minimize: "Réduire",
    maximize: "Agrandir",
    restore: "Restaurer",
    close_hint: "Fermer (reste actif dans la barre système)",

    // Mises à jour
    up_available: "Version {v} disponible",
    up_installed: "Version {v} installée",
    up_generic: "Mise à jour disponible",
    up_downloading: "Téléchargement…",
    up_downloading_pct: "Téléchargement… {p} %",
    up_restart_hint: "Redémarre Rem pour l'utiliser.",
    up_manual_hint: "Cette installation se met à jour manuellement.",
    up_install: "Mettre à jour",
    up_download: "Télécharger",
    up_restart: "Redémarrer",
    up_version: "Version {v}",
    up_checking: "Recherche en cours…",
    up_uptodate: "Rem est à jour.",
    up_error: "Vérification impossible",
    up_auto: "Mises à jour vérifiées automatiquement",
    up_check: "Rechercher une mise à jour",
  },
  en: {
    subtitle: "Remote control · LAN",
    online: "Online",
    offline: "Offline",

    server_on: "Server running",
    server_off: "Server stopped",
    server_on_hint: "Devices on your network can connect",
    server_off_hint: "Start the server to allow connections",
    start: "Start",
    stop: "Stop",

    connection: "Connection",
    pin: "PIN code",
    regenerate: "Regenerate",
    devices: "Devices",
    no_device: "No device connected",
    ago: "{t} ago",

    screen_share: "Screen sharing",
    active: "On",
    inactive: "Off",
    video_toggle: "Allow the video stream (custom mode)",
    video_yes: "The client can see the screen and point at it",
    video_no: "Screen capture unavailable on this machine",

    captures: "Remote capture",
    allowed: "Allowed",
    blocked: "Blocked",
    captures_toggle: "Allow remote camera / mic / audio",
    captures_hint: "The client can watch and listen to this PC. Turn off to block everything.",
    camera: "Camera",
    mic: "Mic",
    audio: "Audio",
    live: "live",
    ready: "ready",
    unavailable: "unavailable",

    settings: "Settings",
    port: "Server port",
    apply: "Apply",
    port_locked: "Stop the server to change the port",

    menu: "Menu",
    reload: "Reload",
    source: "Source code",
    about: "About Rem",
    about_body: "REM — Remote control\nLocal network · v{v}\nTauri + React",
    quit: "Quit",
    switch_lang: "Français",
    minimize: "Minimize",
    maximize: "Maximize",
    restore: "Restore",
    close_hint: "Close (keeps running in the system tray)",

    up_available: "Version {v} available",
    up_installed: "Version {v} installed",
    up_generic: "Update available",
    up_downloading: "Downloading…",
    up_downloading_pct: "Downloading… {p}%",
    up_restart_hint: "Restart Rem to use it.",
    up_manual_hint: "This install updates manually.",
    up_install: "Update",
    up_download: "Download",
    up_restart: "Restart",
    up_version: "Version {v}",
    up_checking: "Checking…",
    up_uptodate: "Rem is up to date.",
    up_error: "Check failed",
    up_auto: "Updates checked automatically",
    up_check: "Check for updates",
  },
} as const;

export type AppKey = keyof (typeof dict)["fr"];
export type AppI18n = I18n<AppKey>;

export const useI18n = createI18n<AppKey>(dict);
