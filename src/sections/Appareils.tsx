import { Monitor, Smartphone, Tablet, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
import { Badge } from "@shared/ui/badge";
import { timeAgo, type Dash } from "../lib/dash";

function deviceIcon(ua: string) {
  const u = ua.toLowerCase();
  if (/mobile|iphone|android/.test(u)) return Smartphone;
  if (/ipad|tablet/.test(u)) return Tablet;
  return Monitor;
}

export default function Appareils({ dash }: { dash: Dash }) {
  const { t, devices } = dash;

  return (
    <Card className="max-w-2xl">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          {t("devices")}
          <Badge variant="outline" className="ml-auto">
            {devices.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-2">
        {devices.length === 0 && (
          <p className="py-3 text-center text-sm text-muted-foreground">{t("no_device")}</p>
        )}
        {devices.map((d, i) => {
          const Icon = deviceIcon(d.user_agent);
          return (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
            >
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary-foreground">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{d.addr}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {t("ago", { t: timeAgo(d.connected_at) })}
                </p>
              </div>
              <span className="h-2 w-2 shrink-0 animate-pulseglow rounded-full bg-emerald-400 shadow-[0_0_10px_rgb(52_211_153)]" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
