import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Link2, Minus, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
import { Button } from "@shared/ui/button";
import { cn } from "@shared/cn";
import type { ConnMode, Dash } from "../lib/dash";

export default function Connexion({ dash }: { dash: Dash }) {
  const { t, info, running, conn } = dash;
  const secure = conn === "secure";

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-4">
          {dash.secureReady && (
            <div className="grid w-full grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
              {(["standard", "secure"] as ConnMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => dash.setConn(m)}
                  className={cn(
                    "rounded-lg py-1.5 text-xs font-medium transition-colors",
                    conn === m
                      ? "bg-primary/85 text-primary-foreground"
                      : "text-muted-foreground hover:bg-white/[0.06]"
                  )}
                >
                  {m === "secure" ? t("conn_secure") : t("conn_standard")}
                </button>
              ))}
            </div>
          )}

          <div
            className={cn(
              "rounded-2xl bg-white p-3 transition-opacity",
              !running && "opacity-30 blur-[2px]"
            )}
          >
            <QRCodeSVG
              value={dash.shownUrl || "http://0.0.0.0"}
              size={168}
              bgColor="#ffffff"
              fgColor="#1a0b2e"
              level="M"
            />
          </div>

          <div className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-sm text-foreground/90">
              {dash.shownUrl || "—"}
            </span>
            <Button variant="ghost" size="icon" onClick={dash.copyUrl} disabled={!running}>
              {dash.copied ? <Check className="text-emerald-300" /> : <Copy />}
            </Button>
          </div>

          {/* Un avantage et un inconvénient pour chaque mode : le choix
              n'a de sens que si les deux faces sont visibles. */}
          <div className="w-full space-y-1.5 text-xs">
            <p className="flex items-start gap-2 text-foreground/80">
              <Plus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
              <span>{secure ? t("conn_secure_pro") : t("conn_standard_pro")}</span>
            </p>
            <p className="flex items-start gap-2 text-muted-foreground">
              <Minus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
              <span>{secure ? t("conn_secure_con") : t("conn_standard_con")}</span>
            </p>
          </div>

          {secure && info?.cert_fingerprint && (
            <details className="w-full text-xs text-muted-foreground">
              <summary className="cursor-pointer select-none">{t("cert_fp")}</summary>
              <code className="mt-1 block break-all font-mono text-[10px] leading-relaxed text-foreground/70">
                {info.cert_fingerprint}
              </code>
            </details>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {t("pin")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-2">
            <div className="flex items-center gap-3">
              <div className="flex min-w-0 flex-1 gap-1.5">
                {(info?.pin ?? "------").split("").map((d, i) => (
                  <div
                    key={i}
                    className="grid h-12 flex-1 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-xl font-bold text-primary-foreground shadow-glow"
                  >
                    {d}
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={dash.regen}
                title={t("regenerate")}
                className="h-12 w-12 shrink-0"
              >
                <RefreshCw />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("pin_regen_d")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              {t("howto")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-2">
            {(["howto_1", "howto_2", "howto_3"] as const).map((k, i) => (
              <p key={k} className="text-sm text-muted-foreground">
                <span className="mr-1.5 font-semibold text-foreground">{i + 1}.</span>
                {t(k)}
              </p>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
