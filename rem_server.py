#!/usr/bin/env python3
"""
REM — serveur de contrôle à distance (version Python, ultra rapide).

Fait la même chose que l'app Tauri, sans Rust ni compilation :
  - lance un serveur LAN (aiohttp) sur 0.0.0.0:<port>
  - sert l'interface web responsive déjà buildée (web/dist) : touchpad, clavier,
    média/volume, présentation/système — exactement la même UI purple/glass
  - appairage par PIN (POST /pair -> token) + QR code affiché dans le terminal
  - exécute les commandes sur le PC hôte via pyautogui + commandes système

Protocole WebSocket identique à shared/protocol.ts (réutilise le client web tel quel).

Dépendances :
    pip install aiohttp pyautogui qrcode
Lancer :
    python rem_server.py            # port 9847 par défaut
    python rem_server.py --port 8080
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import platform
import random
import secrets
import socket
import subprocess
import sys
import time
from pathlib import Path

try:
    from aiohttp import web, WSMsgType
except ImportError:
    sys.exit("Manque aiohttp -> pip install aiohttp pyautogui qrcode")

try:
    import pyautogui
    pyautogui.FAILSAFE = False
    pyautogui.PAUSE = 0  # zéro latence entre actions = ultra rapide
except ImportError:
    sys.exit("Manque pyautogui -> pip install aiohttp pyautogui qrcode")

IS_WIN = platform.system() == "Windows"
IS_MAC = platform.system() == "Darwin"
WEB_DIST = Path(__file__).parent / "web" / "dist"

# ---------------------------------------------------------------- état partagé

PIN = os.environ.get("REM_PIN") or "".join(random.choice("0123456789") for _ in range(6))
TOKENS: set[str] = set()
DEVICES: dict[int, dict] = {}
_next_id = 0


def lan_ip() -> str:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


# --------------------------------------------------------- mapping des touches

MEDIA = {
    "play_pause": "playpause",
    "next": "nexttrack",
    "prev": "prevtrack",
    "vol_up": "volumeup",
    "vol_down": "volumedown",
    "mute": "volumemute",
}

SPECIAL = {
    "enter": "enter",
    "escape": "esc",
    "tab": "tab",
    "backspace": "backspace",
    "delete": "delete",
    "space": "space",
    "up": "up",
    "down": "down",
    "left": "left",
    "right": "right",
    "home": "home",
    "end": "end",
    "pageup": "pageup",
    "pagedown": "pagedown",
    "win": "win" if IS_WIN else "command",
}


def _power(action: str) -> None:
    """lock / sleep / shutdown — dépend de l'OS."""
    if IS_WIN:
        if action == "lock":
            import ctypes
            ctypes.windll.user32.LockWorkStation()
        elif action == "sleep":
            subprocess.Popen(["rundll32.exe", "powrprof.dll,SetSuspendState", "0,1,0"])
        elif action == "shutdown":
            subprocess.Popen(["shutdown", "/s", "/t", "0"])
    elif IS_MAC:
        cmds = {
            "lock": ["pmset", "displaysleepnow"],
            "sleep": ["pmset", "sleepnow"],
            "shutdown": ["osascript", "-e", 'tell app "System Events" to shut down'],
        }
        subprocess.Popen(cmds[action])
    else:  # linux
        cmds = {
            "lock": ["loginctl", "lock-session"],
            "sleep": ["systemctl", "suspend"],
            "shutdown": ["systemctl", "poweroff"],
        }
        subprocess.Popen(cmds[action])


def execute(cmd: dict) -> None:
    """Applique une commande reçue du client web (appelé dans un thread)."""
    t = cmd.get("type")
    if t == "mouse_move":
        pyautogui.move(int(cmd["dx"]), int(cmd["dy"]))
    elif t == "mouse_click":
        pyautogui.click(button=cmd.get("button", "left"))
    elif t == "mouse_double":
        pyautogui.doubleClick(button=cmd.get("button", "left"))
    elif t == "mouse_down":
        pyautogui.mouseDown(button=cmd.get("button", "left"))
    elif t == "mouse_up":
        pyautogui.mouseUp(button=cmd.get("button", "left"))
    elif t == "mouse_scroll":
        pyautogui.scroll(int(cmd["dy"]))
    elif t == "key":
        k = cmd.get("key")
        if k == "copy":
            pyautogui.hotkey("ctrl", "c")
        elif k == "paste":
            pyautogui.hotkey("ctrl", "v")
        elif k in SPECIAL:
            pyautogui.press(SPECIAL[k])
    elif t == "text":
        pyautogui.write(cmd.get("text", ""), interval=0)
    elif t == "media":
        key = MEDIA.get(cmd.get("action"))
        if key:
            pyautogui.press(key)
    elif t == "system":
        a = cmd.get("action")
        if a == "slide_next":
            pyautogui.press("right")
        elif a == "slide_prev":
            pyautogui.press("left")
        elif a in ("lock", "sleep", "shutdown"):
            _power(a)


# ------------------------------------------------------------------- handlers

async def pair(request: web.Request) -> web.Response:
    body = await request.json()
    if str(body.get("pin", "")).strip() == PIN:
        token = secrets.token_urlsafe(24)
        TOKENS.add(token)
        return web.json_response({"token": token})
    return web.json_response({"error": "invalid_pin"}, status=401)


async def ws_handler(request: web.Request) -> web.WebSocketResponse:
    global _next_id
    ws = web.WebSocketResponse()
    await ws.prepare(request)

    # 1er message = auth
    first = await ws.receive()
    ok = False
    if first.type == WSMsgType.TEXT:
        try:
            msg = json.loads(first.data)
            ok = msg.get("type") == "auth" and msg.get("token") in TOKENS
        except (ValueError, TypeError):
            ok = False
    if not ok:
        await ws.send_json({"type": "error", "msg": "unauthorized"})
        await ws.close()
        return ws

    await ws.send_json({"type": "authed"})
    _next_id += 1
    dev_id = _next_id
    peer = request.remote or "?"
    DEVICES[dev_id] = {
        "addr": peer,
        "user_agent": request.headers.get("User-Agent", "unknown"),
        "connected_at": int(time.time()),
    }
    print(f"  + appareil connecté : {peer}")

    loop = asyncio.get_running_loop()
    try:
        async for m in ws:
            if m.type != WSMsgType.TEXT:
                continue
            try:
                cmd = json.loads(m.data)
            except ValueError:
                continue
            if cmd.get("type") == "ping":
                await ws.send_json({"type": "pong"})
                continue
            # exécution non bloquante pour l'event loop
            await loop.run_in_executor(None, execute, cmd)
    finally:
        DEVICES.pop(dev_id, None)
        print(f"  - appareil déconnecté : {peer}")
    return ws


async def static_handler(request: web.Request) -> web.StreamResponse:
    rel = request.match_info.get("path", "")
    if not rel:
        rel = "index.html"
    target = (WEB_DIST / rel).resolve()
    # empêche le path traversal hors de web/dist
    if WEB_DIST.resolve() not in target.parents and target != WEB_DIST.resolve():
        if not str(target).startswith(str(WEB_DIST.resolve())):
            target = WEB_DIST / "index.html"
    if target.is_file():
        return web.FileResponse(target)
    index = WEB_DIST / "index.html"  # SPA fallback
    if index.is_file():
        return web.FileResponse(index)
    return web.Response(text="web client introuvable — build: pnpm web:build", status=404)


# ----------------------------------------------------------------------- main

def print_banner(url: str) -> None:
    print("\n" + "=" * 48)
    print("   REM · CONTRÔLE À DISTANCE (Python)")
    print("=" * 48)
    print(f"   URL    : {url}")
    print(f"   PIN    : {PIN}")
    print("=" * 48)
    try:
        import qrcode
        qr = qrcode.QRCode(border=1)
        qr.add_data(url)
        qr.make()
        qr.print_ascii(invert=True)
    except ImportError:
        print("   (pip install qrcode pour afficher le QR code)")
    except Exception:
        # console sans support unicode : QR non affichable, l'URL suffit
        print("   (QR non affichable dans ce terminal — utilise l'URL ci-dessus)")
    print(f"   Scanne le QR / ouvre {url} puis entre le PIN {PIN}")
    print("   Ctrl+C pour arrêter.\n")


def main() -> None:
    ap = argparse.ArgumentParser(description="REM serveur de contrôle à distance")
    ap.add_argument("--port", type=int, default=9847)
    ap.add_argument("--host", default="0.0.0.0")
    args = ap.parse_args()

    # console Windows en UTF-8 pour les accents + le QR code
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

    if not (WEB_DIST / "index.html").is_file():
        print("⚠  web/dist absent. Build d'abord :  pnpm install && pnpm web:build")

    app = web.Application()
    app.router.add_post("/pair", pair)
    app.router.add_get("/ws", ws_handler)
    app.router.add_get("/", static_handler)
    app.router.add_get("/{path:.*}", static_handler)

    url = f"http://{lan_ip()}:{args.port}"
    print_banner(url)

    try:
        web.run_app(app, host=args.host, port=args.port, print=None)
    except KeyboardInterrupt:
        print("\nArrêt.")


if __name__ == "__main__":
    main()
