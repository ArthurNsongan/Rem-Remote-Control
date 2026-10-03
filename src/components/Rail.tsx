import { Link2, MonitorPlay, Settings as SettingsIcon, Users } from "lucide-react";
import { cn } from "@shared/cn";
import type { AppKey } from "../i18n";
import type { Dash, SectionId } from "../lib/dash";

const ITEMS: { id: SectionId; label: AppKey; icon: React.ReactNode }[] = [
  { id: "connexion", label: "nav_connexion", icon: <Link2 className="h-4 w-4" /> },
  { id: "appareils", label: "nav_appareils", icon: <Users className="h-4 w-4" /> },
  { id: "partage", label: "nav_partage", icon: <MonitorPlay className="h-4 w-4" /> },
  { id: "reglages", label: "nav_reglages", icon: <SettingsIcon className="h-4 w-4" /> },
];

/**
 * Rail de navigation.
 *
 * Sous 768 px, seules les icônes restent : la fenêtre descend à 560 px de
 * large, où un rail de 208 px mangerait plus du tiers de la place.
 */
export default function Rail({
  dash,
  active,
  onSelect,
}: {
  dash: Dash;
  active: SectionId;
  onSelect: (id: SectionId) => void;
}) {
  const { t } = dash;

  return (
    <nav className="flex w-14 shrink-0 flex-col gap-1 border-r border-white/[0.08] p-2 md:w-52 md:p-2.5">
      {ITEMS.map(({ id, label, icon }) => {
        const badge = id === "appareils" ? dash.devices.length : 0;
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            title={t(label)}
            className={cn(
              "flex w-full items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors md:justify-start",
              active === id
                ? "bg-primary/[0.18] text-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.35)]"
                : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
            )}
          >
            <span className="shrink-0 opacity-90">{icon}</span>
            <span className="hidden md:block">{t(label)}</span>
            {badge > 0 && (
              <span className="ml-auto hidden rounded-full bg-white/[0.08] px-2 text-[11px] md:block">
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
