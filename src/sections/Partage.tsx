import { Camera, Mic, MonitorPlay, Volume2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
import { Badge } from "@shared/ui/badge";
import { Switch } from "@shared/ui/switch";
import { cn } from "@shared/cn";
import type { Dash } from "../lib/dash";

/**
 * Écran et captures réunis : les deux répondent à « qu'est-ce que le téléphone
 * a le droit de voir et d'entendre ». Deux cartes éloignées obligeaient à
 * chercher pour répondre à une seule question de confidentialité.
 */
export default function Partage({ dash }: { dash: Dash }) {
  const { t, info, running } = dash;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2">
            <MonitorPlay className="h-4 w-4 text-primary" />
            {t("screen_share")}
            <Badge variant={info?.video_enabled ? "online" : "outline"} className="ml-auto">
              {info?.video_enabled ? t("active") : t("inactive")}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm">{t("video_toggle")}</p>
              <p className="text-xs text-muted-foreground">
                {info?.video_available ? t("video_yes") : t("video_no")}
              </p>
            </div>
            <Switch
              checked={info?.video_enabled ?? false}
              disabled={!running || !info?.video_available}
              onCheckedChange={dash.toggleVideo}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" />
            {t("captures")}
            <Badge variant={info?.captures_allowed ? "online" : "outline"} className="ml-auto">
              {info?.captures_allowed ? t("allowed") : t("blocked")}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm">{t("captures_toggle")}</p>
              <p className="text-xs text-muted-foreground">{t("captures_hint")}</p>
            </div>
            <Switch
              checked={info?.captures_allowed ?? false}
              disabled={!running}
              onCheckedChange={dash.toggleCaptures}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { on: info?.cam_active, ok: info?.camera_available, Icon: Camera, key: "camera" as const },
              { on: info?.mic_active, ok: info?.audio_available, Icon: Mic, key: "mic" as const },
              { on: info?.sys_active, ok: info?.audio_available, Icon: Volume2, key: "audio" as const },
            ].map(({ on, ok, Icon, key }) => (
              <div
                key={key}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2",
                  on
                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                    : "border-white/10 bg-white/[0.03] text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-xs">{t(key)}</span>
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    on
                      ? "animate-pulseglow bg-emerald-400 shadow-[0_0_8px_rgb(52_211_153)]"
                      : ok
                        ? "bg-white/25"
                        : "bg-red-500/50"
                  )}
                  title={ok ? (on ? t("live") : t("ready")) : t("unavailable")}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
