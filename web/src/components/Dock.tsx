import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { cn } from "@shared/cn";

export interface DockItem {
  id: string;
  label: string;
  Icon: LucideIcon;
}

/**
 * Barre de navigation du bas.
 *
 * Elle porte la seule navigation du client : une scène à la fois, et on passe
 * de l'une à l'autre ici. Elle est en bas parce que c'est le seul endroit
 * qu'un pouce atteint sans repositionner la main — le haut de l'écran ne
 * porte plus aucune commande.
 */
export default function Dock({
  items,
  actif,
  onPick,
  onPlus,
  plusActif,
  plusLabel,
}: {
  items: DockItem[];
  actif: string | null;
  onPick: (id: string) => void;
  onPlus: () => void;
  plusActif: boolean;
  plusLabel: string;
}) {
  const classe = (on: boolean) =>
    cn(
      "flex flex-1 select-none flex-col items-center gap-1 rounded-2xl px-1 py-2 font-sans text-[10px] leading-none transition-all",
      on
        ? "bg-gradient-to-b from-primary/35 to-primary/10 text-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/.45)]"
        : "text-muted-foreground"
    );

  return (
    <nav className="relative z-30 mx-2 mb-[max(0.5rem,env(safe-area-inset-bottom))] flex gap-1 rounded-3xl border border-white/10 bg-[hsl(var(--card)/0.85)] p-2 backdrop-blur-xl">
      {items.map((it) => {
        const Icon = it.Icon;
        return (
          <button
            key={it.id}
            onClick={() => onPick(it.id)}
            className={classe(actif === it.id)}
            title={it.label}
          >
            <Icon className="h-5 w-5" />
            <span className="w-full truncate text-center">{it.label}</span>
          </button>
        );
      })}
      <button onClick={onPlus} className={classe(plusActif)} title={plusLabel}>
        <MoreHorizontal className="h-5 w-5" />
        <span className="w-full truncate text-center">{plusLabel}</span>
      </button>
    </nav>
  );
}
