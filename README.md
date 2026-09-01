# REM — Remote Laptop Control

App desktop **Tauri + React** qui transforme un PC (Windows) en cible contrôlable
depuis un téléphone, une tablette ou un autre ordinateur, sur le **réseau local**.

L'app desktop affiche un tableau de bord (état serveur, **QR code**, **code PIN**,
appareils connectés) et lance un **serveur web embarqué** qui sert une interface
distante responsive exécutant les commandes sur le PC hôte.

Style : purple · glassmorphism · polices Michroma / Space Grotesk / Orbitron.

## Fonctions (v1)

- **Souris** : touchpad virtuel (déplacement, clic gauche/droit, double-clic, scroll)
- **Clavier** : saisie de texte + touches spéciales, flèches, copier/coller
- **Média & volume** : play/pause, suivant/précédent, volume +/−, muet
- **Présentation & système** : diapo suivante/précédente, verrouiller, veille, éteindre
- **Sécurité** : appairage par PIN + QR code, token de session (LAN uniquement)

## Architecture

```
.                       # app desktop Tauri (panneau de contrôle)
  src/                  # UI React du panneau (webview Tauri)
  web/                  # UI distante responsive (servie sur le LAN)
  shared/               # thème glass/purple, composants UI, types du protocole
  src-tauri/            # Rust : Tauri + serveur axum + enigo + commandes système
```

Le client web (`web/`) est buildé dans `web/dist` puis **embarqué** dans le binaire
Rust (`rust-embed`) et servi par axum. Communication temps réel via WebSocket
(`/ws`), appairage via `POST /pair`.

## Prérequis

- Node + pnpm
- **Rust** (`rustup`) + **MSVC C++ Build Tools** (linker `link.exe`) sur Windows

## Développement

```bash
pnpm install
pnpm tauri dev      # build web/dist, lance l'UI desktop + serveur Rust
```

Depuis le PC : démarrer le serveur dans l'app → un QR code + un PIN s'affichent.
Depuis un téléphone/tablette sur le même Wi-Fi : scanner le QR, entrer le PIN.

> Le client web est embarqué à la compilation. Après modification de `web/`,
> relancer (`pnpm web:build` est exécuté automatiquement par `tauri dev`/`build`).

## Alternative ultra-rapide : serveur Python (sans Rust)

`rem_server.py` fait la même chose que l'app Tauri **sans compilation Rust/MSVC** :
il sert la même interface web (`web/dist`) et exécute les commandes via `pyautogui`.
Protocole WebSocket identique → le client web fonctionne tel quel.

```bash
pnpm install && pnpm web:build        # build l'UI web une fois
pip install -r requirements.txt       # aiohttp + pyautogui + qrcode
python rem_server.py                  # port 9847, affiche URL + PIN + QR
# ou : rem.bat   (installe les deps puis lance, Windows)
```

Options : `--port 8080`, `--host 0.0.0.0`. PIN forçable via `REM_PIN=135790`.
Le terminal affiche l'URL LAN, le PIN et un QR code à scanner.

## Build production (app Tauri)

```bash
pnpm tauri build    # exécutable + installeur Windows
```

## Hors périmètre v1

Mirroring d'écran, transfert de fichiers, comptes/cloud. Cible Windows en priorité
(des fallbacks macOS/Linux best-effort existent pour les actions système).
