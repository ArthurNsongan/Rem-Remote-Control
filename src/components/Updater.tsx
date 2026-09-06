import { ArrowUpCircle, CheckCircle2, Download, RefreshCw, RotateCw, TriangleAlert } from "lucide-react";
import { Button } from "@shared/ui/button";
import { Card, CardContent } from "@shared/ui/card";
import type { useUpdater } from "../lib/updater";

type Updater = ReturnType<typeof useUpdater>;

/** Bandeau visible seulement quand il y a quelque chose à faire ou à attendre. */
export function UpdateBanner({ up }: { up: Updater }) {
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
                ? `Version ${s.version} installée`
                : `Version ${s.version} disponible`}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {s.kind === "downloading"
                ? s.percent === null
                  ? "Téléchargement…"
                  : `Téléchargement… ${s.percent} %`
                : s.kind === "ready"
                  ? "Redémarre Rem pour l'utiliser."
                  : s.notes.split("\n")[0] || "Mise à jour disponible"}
            </p>
          </div>
        </div>

        {s.kind === "available" && (
          <Button onClick={up.install} className="shrink-0 sm:w-44">
            <Download />
            Mettre à jour
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
            Redémarrer
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/** Ligne « version installée + recherche manuelle », dans les réglages. */
export function UpdateSettings({ up }: { up: Updater }) {
  const s = up.status;
  return (
    <div className="flex flex-col gap-2 border-t border-white/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm">Version {up.current || "…"}</p>
        <p className="text-xs text-muted-foreground">
          {s.kind === "checking" && "Recherche en cours…"}
          {s.kind === "uptodate" && "Rem est à jour."}
          {s.kind === "error" && (
            <span className="inline-flex items-center gap-1 text-destructive">
              <TriangleAlert className="h-3 w-3" />
              Vérification impossible
            </span>
          )}
          {s.kind !== "checking" && s.kind !== "uptodate" && s.kind !== "error" && (
            <>Mises à jour vérifiées automatiquement</>
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
        Rechercher une mise à jour
      </Button>
    </div>
  );
}
