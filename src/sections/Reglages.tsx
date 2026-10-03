import { RefreshCw, Settings as SettingsIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { UpdateSettings } from "../components/Updater";
import type { useUpdater } from "../lib/updater";
import type { Dash } from "../lib/dash";

export default function Reglages({
  dash,
  updater,
}: {
  dash: Dash;
  updater: ReturnType<typeof useUpdater>;
}) {
  const { t, running } = dash;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4 text-primary" />
            {t("application")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-2">
          <div className="flex items-end gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="port">{t("port")}</Label>
              <Input
                id="port"
                value={dash.portInput}
                onChange={(e) => dash.setPortInput(e.target.value.replace(/\D/g, ""))}
                disabled={running}
                inputMode="numeric"
              />
            </div>
            <Button variant="outline" onClick={dash.applyPort} disabled={running}>
              {t("apply")}
            </Button>
          </div>
          {running && <p className="text-xs text-muted-foreground">{t("port_locked")}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" />
            {t("updates")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <UpdateSettings up={updater} t={t} />
        </CardContent>
      </Card>
    </div>
  );
}
