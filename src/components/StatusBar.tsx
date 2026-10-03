import { Power, Wifi } from "lucide-react";
import { Badge } from "@shared/ui/badge";
import { cn } from "@shared/cn";
import type { Dash } from "../lib/dash";

/**
 * Bandeau d'état, visible quelle que soit la section.
 *
 * Le bouton marche/arrêt, l'adresse et le PIN sont ce qu'on regarde le plus
 * souvent : les enterrer derrière un onglet obligerait à naviguer pour la
 * question la plus fréquente.
 */
export default function StatusBar({ dash }: { dash: Dash }) {
  const { t, info, running, busy } = dash;

  return (
    <div className="shrink-0 border-b border-white/[0.08]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-3.5">
        <button
          onClick={dash.toggle}
          disabled={busy}
          title={running ? t("stop") : t("start")}
          className={cn(
            "grid h-12 w-12 shrink-0 place-items-center rounded-2xl border transition-all active:scale-95 disabled:opacity-60",
            running
              ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200 shadow-[0_0_40px_-6px_rgb(52_211_153/0.7)]"
              : "border-white/15 bg-white/[0.05] text-muted-foreground hover:bg-white/[0.09]"
          )}
        >
          <Power className={cn("h-6 w-6", busy && "animate-pulse")} />
        </button>

        <div className="min-w-0">
          <p className="font-semibold leading-tight tracking-tight">
            {running ? t("server_on") : t("server_off")}
          </p>
          <p className="truncate text-[13px] text-muted-foreground">
            {running ? t("server_on_hint") : t("server_off_hint")}
          </p>
        </div>

        {/* Adresse et PIN : de quoi appairer sans changer de section. */}
        {running && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              onClick={dash.copyUrl}
              title={t("copy_url")}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-left transition-colors hover:bg-white/[0.07]"
            >
              <span className="block font-accent text-[10px] tracking-[0.12em] text-muted-foreground">
                {dash.copied ? t("copied") : t("address")}
              </span>
              <span className="block text-sm tabular-nums">
                {dash.shownUrl.replace(/^https?:\/\//, "")}
              </span>
            </button>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5">
              <span className="block font-accent text-[10px] tracking-[0.12em] text-muted-foreground">
                PIN
              </span>
              <span className="block text-sm tabular-nums">{info?.pin}</span>
            </div>
            <Badge variant={dash.devices.length ? "online" : "outline"}>
              <Wifi className="h-3.5 w-3.5" />
              {t("online_n", { n: dash.devices.length })}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
