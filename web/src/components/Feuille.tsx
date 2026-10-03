import { useEffect, useRef, useState, type ReactNode } from "react";

/** Glissement vers le bas au-delà duquel la feuille se referme. */
const FERMER_PX = 70;

/**
 * Feuille qui monte du bas de l'écran.
 *
 * Tout ce qui relève du réglage vit ici : profils, modules, préférences. Le
 * client mobile n'a plus de bandeau de configuration permanent — ces choses-là
 * se touchent deux fois par semaine, elles n'ont pas à occuper l'écran en
 * continu.
 */
export default function Feuille({
  titre,
  onClose,
  children,
}: {
  titre: string;
  onClose: () => void;
  children: ReactNode;
}) {
  /** Décalage vertical pendant le glissement de fermeture. */
  const [dy, setDy] = useState(0);
  const debut = useRef<number | null>(null);

  // Échap ferme aussi : la feuille peut s'ouvrir sur une tablette au clavier.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onDown = (e: React.PointerEvent) => {
    debut.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (debut.current === null) return;
    // Vers le haut, la feuille ne bouge pas : elle est déjà en butée.
    setDy(Math.max(0, e.clientY - debut.current));
  };
  const onUp = () => {
    if (dy > FERMER_PX) onClose();
    setDy(0);
    debut.current = null;
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[84dvh] max-w-xl flex-col rounded-t-3xl border-t border-white/15 bg-card px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl"
        style={{
          transform: `translateY(${dy}px)`,
          transition: dy ? "none" : "transform .18s ease-out",
        }}
      >
        {/* La poignée est la zone de préhension : elle déborde en largeur
            pour rester facile à attraper au pouce. */}
        <div
          className="-mx-4 px-4 pb-2 pt-2.5"
          style={{ touchAction: "none" }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <div className="mx-auto h-1 w-24 rounded-full bg-white/25" />
        </div>
        <h2 className="mb-3 mt-1 font-sans text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
          {titre}
        </h2>
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 pb-1">{children}</div>
      </div>
    </>
  );
}
