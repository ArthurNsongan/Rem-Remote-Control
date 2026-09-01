import { useRef, useState } from "react";
import {
  MousePointer2,
  MousePointerClick,
  ChevronsUpDown,
  Gauge,
} from "lucide-react";
import type { ClientMessage } from "@shared/protocol";
import { Button } from "@shared/ui/button";
import { Slider } from "@shared/ui/slider";

type Send = (msg: ClientMessage) => void;

const TAP_MS = 220;
const TAP_DIST = 8;
const ACCEL = 0.08; // amplifie les mouvements rapides

export default function Touchpad({ send, fill }: { send: Send; fill?: boolean }) {
  const [sens, setSens] = useState(2.6);
  const sensRef = useRef(2.6);
  sensRef.current = sens;

  const last = useRef<{ x: number; y: number; t: number } | null>(null);
  const start = useRef({ x: 0, y: 0, t: 0, moved: false });

  const onDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    last.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    start.current = { x: e.clientX, y: e.clientY, t: Date.now(), moved: false };
  };

  const onMove = (e: React.PointerEvent) => {
    if (!last.current) return;
    const now = performance.now();
    const rdx = e.clientX - last.current.x;
    const rdy = e.clientY - last.current.y;
    const dt = Math.max(1, now - last.current.t);
    const speed = Math.hypot(rdx, rdy) / dt; // px/ms
    const factor = sensRef.current * (1 + speed * ACCEL * 60);
    last.current = { x: e.clientX, y: e.clientY, t: now };
    if (
      Math.abs(e.clientX - start.current.x) + Math.abs(e.clientY - start.current.y) >
      TAP_DIST
    )
      start.current.moved = true;
    const dx = rdx * factor;
    const dy = rdy * factor;
    if (dx || dy) send({ type: "mouse_move", dx, dy });
  };

  const onUp = () => {
    if (!last.current) return;
    if (!start.current.moved && Date.now() - start.current.t < TAP_MS)
      send({ type: "mouse_click", button: "left" });
    last.current = null;
  };

  const scrollLast = useRef<number | null>(null);
  const onScrollDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    scrollLast.current = e.clientY;
  };
  const onScrollMove = (e: React.PointerEvent) => {
    if (scrollLast.current == null) return;
    const dy = (scrollLast.current - e.clientY) * 0.6;
    scrollLast.current = e.clientY;
    if (dy) send({ type: "mouse_scroll", dy });
  };
  const onScrollUp = () => {
    scrollLast.current = null;
  };

  return (
    <div className={fill ? "flex h-full flex-col gap-3" : "flex flex-col gap-3"}>
      <div className={fill ? "flex min-h-0 flex-1 gap-3" : "flex gap-3"}>
        <div
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onDoubleClick={() => send({ type: "mouse_double", button: "left" })}
          className={
            fill
              ? "glass relative min-h-0 flex-1 touch-none select-none rounded-2xl"
              : "glass relative h-[42vh] min-h-[220px] flex-1 touch-none select-none rounded-2xl"
          }
        >
          <div className="pointer-events-none absolute inset-0 grid-overlay rounded-2xl opacity-30" />
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground/60">
            <MousePointer2 className="h-8 w-8" />
            <span className="font-accent text-xs tracking-widest">
              GLISSE POUR BOUGER · TAP = CLIC
            </span>
          </div>
        </div>
        <div
          onPointerDown={onScrollDown}
          onPointerMove={onScrollMove}
          onPointerUp={onScrollUp}
          className={
            fill
              ? "glass flex w-12 shrink-0 touch-none select-none items-center justify-center rounded-2xl"
              : "glass flex h-[42vh] min-h-[220px] w-12 touch-none select-none items-center justify-center rounded-2xl"
          }
        >
          <ChevronsUpDown className="h-5 w-5 text-muted-foreground/70" />
        </div>
      </div>

      {/* Sensibilité */}
      <div className="glass rounded-2xl p-3.5">
        <div className="mb-2.5 flex items-center justify-between font-accent text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Gauge className="h-4 w-4" /> SENSIBILITÉ
          </span>
          <span className="text-foreground/90">{sens.toFixed(1)}×</span>
        </div>
        <Slider
          min={1}
          max={6}
          step={0.1}
          value={[sens]}
          onValueChange={(v) => setSens(v[0])}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="glass"
          size="lg"
          onPointerDown={() => send({ type: "mouse_click", button: "left" })}
        >
          <MousePointerClick />
          Clic gauche
        </Button>
        <Button
          variant="glass"
          size="lg"
          onPointerDown={() => send({ type: "mouse_click", button: "right" })}
        >
          <MousePointerClick />
          Clic droit
        </Button>
      </div>
    </div>
  );
}
