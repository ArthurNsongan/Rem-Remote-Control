import { useRef, useState } from "react";
import {
  MonitorPlay,
  Expand,
  Minimize2,
  MousePointerClick,
  Hand,
} from "lucide-react";
import type { ClientMessage } from "@shared/protocol";
import { Button } from "@shared/ui/button";

type Send = (msg: ClientMessage) => void;

const TAP_MS = 350; // un tap reste un tap même un peu long
const TAP_DIST = 18; // tolérance de bougé (px) avant de considérer un drag
const MOVE_MS = 22; // throttle des déplacements (~45 Hz) pour ne pas saturer le WS

export default function VideoScreen({
  send,
  token,
  enabled,
  available,
}: {
  send: Send;
  token: string;
  enabled: boolean;
  available: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const start = useRef({ x: 0, y: 0, t: 0, moved: false });
  const lastMove = useRef(0);
  const [fs, setFs] = useState(false);

  const norm = (e: React.PointerEvent) => {
    const img = imgRef.current;
    if (!img) return null;
    const r = img.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;
    // l'image est en object-contain : calculer la zone réellement affichée
    // (letterbox) pour un pointage précis.
    const nw = img.naturalWidth || r.width;
    const nh = img.naturalHeight || r.height;
    const scale = Math.min(r.width / nw, r.height / nh);
    const dispW = nw * scale;
    const dispH = nh * scale;
    const offX = r.left + (r.width - dispW) / 2;
    const offY = r.top + (r.height - dispH) / 2;
    return {
      x: Math.min(1, Math.max(0, (e.clientX - offX) / dispW)),
      y: Math.min(1, Math.max(0, (e.clientY - offY) / dispH)),
    };
  };

  const ping = (e: React.PointerEvent) => {
    const ring = ringRef.current;
    const wrap = wrapRef.current;
    if (!ring || !wrap) return;
    const r = wrap.getBoundingClientRect();
    ring.style.left = `${e.clientX - r.left}px`;
    ring.style.top = `${e.clientY - r.top}px`;
    ring.classList.remove("ring-go");
    void ring.offsetWidth;
    ring.classList.add("ring-go");
  };

  const onDown = (e: React.PointerEvent) => {
    if (!enabled) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY, t: Date.now(), moved: false };
    lastMove.current = 0;
    const n = norm(e);
    if (n) send({ type: "mouse_abs", x: n.x, y: n.y }); // place le curseur instantanément
  };

  const onMove = (e: React.PointerEvent) => {
    if (!enabled) return;
    if (
      Math.abs(e.clientX - start.current.x) + Math.abs(e.clientY - start.current.y) >
      TAP_DIST
    )
      start.current.moved = true;
    // throttle : on n'inonde pas le WebSocket (sinon le clic arrive en retard)
    const now = performance.now();
    if (now - lastMove.current < MOVE_MS) return;
    lastMove.current = now;
    const n = norm(e);
    if (n) send({ type: "mouse_abs", x: n.x, y: n.y });
  };

  const onUp = (e: React.PointerEvent) => {
    if (!enabled) return;
    // tap = clic immédiat à l'endroit visé. 2 taps rapprochés = double-clic natif de l'OS.
    if (!start.current.moved && Date.now() - start.current.t < TAP_MS) {
      const n = norm(e);
      if (n) {
        send({ type: "mouse_abs", x: n.x, y: n.y });
        send({ type: "mouse_click", button: "left" });
        ping(e);
      }
    }
  };

  const toggleFs = async () => {
    const el = wrapRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
        setFs(true);
        try {
          // landscape on phones that support it
          await (screen.orientation as any)?.lock?.("landscape");
        } catch {
          /* desktop / unsupported */
        }
      } else {
        await document.exitFullscreen();
        setFs(false);
        try {
          (screen.orientation as any)?.unlock?.();
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={wrapRef}
        className={`video-wrap glass relative ${fs ? "fs" : ""}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
      >
        {enabled && available ? (
          <img
            ref={imgRef}
            src={`/stream?token=${encodeURIComponent(token)}`}
            alt="écran"
            className="block h-full w-full select-none"
            style={{ objectFit: "contain", touchAction: "none" }}
            draggable={false}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
            <MonitorPlay className="h-8 w-8" />
            <span className="font-sans text-sm">
              {available ? "Flux désactivé sur le PC" : "Capture indisponible sur le PC"}
            </span>
            <span className="text-xs text-muted-foreground/70">
              Active « Partage d'écran » dans le dashboard du PC, puis touche l'image pour viser.
            </span>
          </div>
        )}

        <div ref={ringRef} className="tap-ring" />

        {/* fullscreen toggle (floats over the video) */}
        <button
          onClick={toggleFs}
          className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60"
          title={fs ? "Quitter le plein écran" : "Plein écran paysage"}
        >
          {fs ? <Minimize2 className="h-5 w-5" /> : <Expand className="h-5 w-5" />}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <p className="flex flex-1 items-center gap-1.5 font-sans text-xs text-muted-foreground">
          <Hand className="h-4 w-4" /> Touche = viser + clic · glisse = déplacer · double = double-clic
        </p>
        <Button
          variant="glass"
          size="sm"
          disabled={!enabled}
          onPointerDown={() => send({ type: "mouse_click", button: "right" })}
        >
          <MousePointerClick />
          Clic droit
        </Button>
      </div>
    </div>
  );
}
