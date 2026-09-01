import { useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  Menu as MenuIcon,
  Minus,
  Square,
  Copy as RestoreIcon,
  X,
  Activity,
  RefreshCw,
  Github,
  Info,
  Power,
  ChevronRight,
} from "lucide-react";
import { cn } from "@shared/cn";

const appWindow = getCurrentWindow();

type Item =
  | { kind: "sep" }
  | { kind: "item"; icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean };

export default function TitleBar() {
  const [open, setOpen] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    appWindow.isMaximized().then(setMaximized).catch(() => {});
    const un = appWindow.onResized(() => {
      appWindow.isMaximized().then(setMaximized).catch(() => {});
    });
    return () => {
      un.then((f) => f());
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const items: Item[] = [
    {
      kind: "item",
      icon: <RefreshCw />,
      label: "Actualiser",
      onClick: () => location.reload(),
    },
    {
      kind: "item",
      icon: <Github />,
      label: "Code source",
      onClick: () => openUrl("https://github.com/").catch(() => {}),
    },
    {
      kind: "item",
      icon: <Info />,
      label: "À propos de Rem",
      onClick: () =>
        alert("REM — Remote Control\nContrôle LAN · v0.1.0\nTauri + React"),
    },
    { kind: "sep" },
    {
      kind: "item",
      icon: <Power />,
      label: "Quitter",
      danger: true,
      onClick: () => invoke("quit"),
    },
  ];

  return (
    <div
      data-tauri-drag-region
      className="relative z-50 flex h-11 shrink-0 items-center justify-between border-b border-white/10 bg-black/30 px-2 backdrop-blur-2xl"
    >
      {/* Left: menu + brand */}
      <div className="flex items-center gap-1.5">
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className={cn(
              "grid h-8 w-9 place-items-center rounded-lg text-foreground/80 transition-colors hover:bg-white/10",
              open && "bg-white/10 text-foreground"
            )}
            title="Menu"
          >
            <MenuIcon className="h-4 w-4" />
          </button>

          {open && (
            <div className="absolute left-0 top-10 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#140a22]/95 p-1.5 shadow-2xl backdrop-blur-2xl">
              {items.map((it, i) =>
                it.kind === "sep" ? (
                  <div key={i} className="my-1 h-px bg-white/10" />
                ) : (
                  <button
                    key={i}
                    onClick={() => {
                      setOpen(false);
                      it.onClick();
                    }}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      it.danger
                        ? "text-red-300 hover:bg-red-500/15"
                        : "text-foreground/85 hover:bg-white/10"
                    )}
                  >
                    <span className="grid h-4 w-4 place-items-center [&_svg]:h-4 [&_svg]:w-4 opacity-80">
                      {it.icon}
                    </span>
                    <span className="flex-1 font-accent tracking-wide">{it.label}</span>
                    <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-50" />
                  </button>
                )
              )}
            </div>
          )}
        </div>

        <div
          data-tauri-drag-region
          className="flex select-none items-center gap-2 pl-1"
        >
          <div className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-primary to-accent">
            <Activity className="pointer-events-none h-3.5 w-3.5 text-white" />
          </div>
          <span className="pointer-events-none font-display text-xs tracking-[0.25em] text-foreground/90">
            REM
          </span>
        </div>
      </div>

      {/* draggable spacer */}
      <div data-tauri-drag-region className="h-full flex-1" />

      {/* Right: window controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => appWindow.minimize()}
          className="grid h-8 w-10 place-items-center rounded-lg text-foreground/70 transition-colors hover:bg-white/10"
          title="Réduire"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          onClick={() => appWindow.toggleMaximize()}
          className="grid h-8 w-10 place-items-center rounded-lg text-foreground/70 transition-colors hover:bg-white/10"
          title={maximized ? "Restaurer" : "Agrandir"}
        >
          {maximized ? (
            <RestoreIcon className="h-3.5 w-3.5" />
          ) : (
            <Square className="h-3 w-3" />
          )}
        </button>
        <button
          onClick={() => appWindow.close()}
          className="grid h-8 w-10 place-items-center rounded-lg text-foreground/70 transition-colors hover:bg-red-500/80 hover:text-white"
          title="Fermer (reste actif dans la barre système)"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
