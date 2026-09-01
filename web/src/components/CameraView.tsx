import { useRef, useState } from "react";
import { Camera, Expand, Minimize2, Play, Square } from "lucide-react";
import { Button } from "@shared/ui/button";

/** Affiche la webcam du PC (MJPEG). L'ouverture du flux démarre la capture (à distance). */
export default function CameraView({
  token,
  available,
}: {
  token: string;
  available: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  const [fs, setFs] = useState(false);
  const src = on ? `/camera?token=${encodeURIComponent(token)}&t=${Date.now()}` : "";

  const toggleFs = async () => {
    const el = wrapRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
        setFs(true);
        try {
          await (screen.orientation as any)?.lock?.("landscape");
        } catch {
          /* ignore */
        }
      } else {
        await document.exitFullscreen();
        setFs(false);
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div ref={wrapRef} className={`video-wrap glass relative ${fs ? "fs" : ""}`}>
        {on && available ? (
          <img
            src={src}
            alt="caméra"
            className="block h-full w-full select-none"
            style={{ objectFit: "contain" }}
            draggable={false}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
            <Camera className="h-8 w-8" />
            <span className="font-sans text-sm">
              {available ? "Caméra du PC" : "Aucune caméra sur le PC"}
            </span>
            <span className="text-xs text-muted-foreground/70">
              Démarre pour voir le flux webcam du PC.
            </span>
          </div>
        )}
        {on && (
          <button
            onClick={toggleFs}
            className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60"
            title={fs ? "Quitter le plein écran" : "Plein écran"}
          >
            {fs ? <Minimize2 className="h-5 w-5" /> : <Expand className="h-5 w-5" />}
          </button>
        )}
      </div>

      <Button
        variant={on ? "destructive" : "glass"}
        disabled={!available}
        onClick={() => setOn((v) => !v)}
      >
        {on ? <Square /> : <Play />}
        {on ? "Arrêter la caméra" : "Démarrer la caméra"}
      </Button>
    </div>
  );
}
