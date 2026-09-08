import { ArrowUpCircle, CheckCircle2, Download, RefreshCw, RotateCw, TriangleAlert } from "lucide-react";
import { Button } from "@shared/ui/button";
import { Card, CardContent } from "@shared/ui/card";
import type { useUpdater } from "../lib/updater";
import type { AppI18n } from "../i18n";

type Updater = ReturnType<typeof useUpdater>;
type T = AppI18n["t"];

/** Bandeau visible seulement quand il y a quelque chose à faire ou à attendre. */
export function UpdateBanner({ up, t }: { up: Updater; t: T }) {
  const s = up.status;
  if (s.kind !== "available" && s.kind !== "downloading" && s.kind !== "ready") return null;

  return (
    <Card className="border-primary/40 bg-primary/[0.07]">
      <CardContent className="flex flex-col items-stretch gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-glow">
            {s.kind === "ready" ? (
              <CheckCircle2 className="h-5 w-5 text-white" />
            ) : (
              <ArrowUpCircle className="h-5 w-5 text-white" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {s.kind === "ready"
                ? t("up_installed", { v: s.version })
                : t("up_available", { v: s.version })}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {s.kind === "downloading"
                ? s.percent === null
                  ? t("up_downloading")
                  : t("up_downloading_pct", { p: s.percent })
                : s.kind === "ready"
                  ? t("up_restart_hint")
                  : !up.canSelf
                    ? t("up_manual_hint")
                    : s.notes.split("\n")[0] || t("up_generic")}
            </p>
          </div>
        </div>

        {/* Une installation .deb ou un bundle macOS non signé ne peut pas se
            remplacer : on renvoie alors vers la page de téléchargement. */}
        {s.kind === "available" && (
          <Button
            onClick={up.canSelf ? up.install : up.openDownload}
            className="shrink-0 sm:w-44"
          >
            <Download />
            {up.canSelf ? t("up_install") : t("up_download")}
          </Button>
        )}
        {s.kind === "downloading" && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10 sm:w-44">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-[width]"
              style={{ width: s.percent === null ? "100%" : `${s.percent}%` }}
            />
          </div>
        )}
        {s.kind === "ready" && (
          <Button onClick={up.restart} className="shrink-0 sm:w-44">
            <RotateCw />
            {t("up_restart")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/** Ligne « version installée + recherche manuelle », dans les réglages. */
export function UpdateSettings({ up, t }: { up: Updater; t: T }) {
  const s = up.status;
  return (
    <div className="flex flex-col gap-2 border-t border-white/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm">{t("up_version", { v: up.current || "…" })}</p>
        <p className="text-xs text-muted-foreground">
          {s.kind === "checking" && t("up_checking")}
          {s.kind === "uptodate" && t("up_uptodate")}
          {s.kind === "error" && (
            <span className="inline-flex items-center gap-1 text-destructive">
              <TriangleAlert className="h-3 w-3" />
              {t("up_error")}
            </span>
          )}
          {s.kind !== "checking" && s.kind !== "uptodate" && s.kind !== "error" && (
            <>{up.canSelf ? t("up_auto") : t("up_manual_hint")}</>
          )}
        </p>
      </div>
      <Button
        variant="outline"
        onClick={up.check}
        disabled={s.kind === "checking" || s.kind === "downloading"}
        className="w-full sm:w-56"
      >
        <RefreshCw className={s.kind === "checking" ? "animate-spin" : undefined} />
        {t("up_check")}
      </Button>
    </div>
  );
}
