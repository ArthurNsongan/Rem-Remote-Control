import {
  Download,
  Github,
  MousePointer2,
  Keyboard,
  MonitorPlay,
  Music,
  Camera,
  Power,
  Smartphone,
  ShieldCheck,
  PanelsTopLeft,
  Wifi,
  QrCode,
  Hand,
} from "lucide-react";
import { Button } from "@shared/ui/button";
import { Card, CardContent } from "@shared/ui/card";
import { Badge } from "@shared/ui/badge";
import { cn } from "@shared/cn";
import { useLang, type Key } from "./i18n";

const VERSION = "0.1.0";
const GITHUB_URL = "https://github.com/ArthurNsongan/Rem-Remote-Control";
// URL stable : pointe toujours vers le .msi de la dernière Release GitHub.
const DOWNLOAD_URL = `${GITHUB_URL}/releases/latest/download/Rem_0.1.0_x64_en-US.msi`;

function Backdrop() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 grid-overlay opacity-30" />
      <div className="pointer-events-none fixed -left-40 -top-20 h-[28rem] w-[28rem] rounded-full bg-primary/30 blur-[140px] animate-float" />
      <div className="pointer-events-none fixed -right-32 top-1/3 h-[26rem] w-[26rem] rounded-full bg-accent/25 blur-[140px] animate-float [animation-delay:-6s]" />
      <div className="pointer-events-none fixed bottom-0 left-1/2 h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-primary/20 blur-[140px]" />
    </>
  );
}

export default function App() {
  const { lang, setLang, t } = useLang();

  const features: { icon: React.ReactNode; t: Key; d: Key }[] = [
    { icon: <MousePointer2 />, t: "f_touchpad_t", d: "f_touchpad_d" },
    { icon: <Keyboard />, t: "f_keyboard_t", d: "f_keyboard_d" },
    { icon: <MonitorPlay />, t: "f_screen_t", d: "f_screen_d" },
    { icon: <Music />, t: "f_media_t", d: "f_media_d" },
    { icon: <Camera />, t: "f_capture_t", d: "f_capture_d" },
    { icon: <Power />, t: "f_system_t", d: "f_system_d" },
    { icon: <Smartphone />, t: "f_devices_t", d: "f_devices_d" },
    { icon: <ShieldCheck />, t: "f_secure_t", d: "f_secure_d" },
    { icon: <PanelsTopLeft />, t: "f_tray_t", d: "f_tray_d" },
  ];

  const steps: { icon: React.ReactNode; t: Key; d: Key }[] = [
    { icon: <MonitorPlay />, t: "how_1_t", d: "how_1_d" },
    { icon: <QrCode />, t: "how_2_t", d: "how_2_d" },
    { icon: <Hand />, t: "how_3_t", d: "how_3_d" },
  ];

  return (
    <div className="relative min-h-screen">
      <Backdrop />

      {/* NAV */}
      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <a href="#top" className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-glow">
            <Wifi className="h-5 w-5 text-white" />
          </div>
          <span className="font-sans text-lg font-bold tracking-tight">REM</span>
        </a>

        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#features" className="transition-colors hover:text-foreground">
            {t("nav_features")}
          </a>
          <a href="#how" className="transition-colors hover:text-foreground">
            {t("nav_how")}
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <Github className="h-4 w-4" /> {t("nav_github")}
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex overflow-hidden rounded-full border border-white/15 text-xs font-medium">
            {(["fr", "en"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={cn(
                  "px-3 py-1.5 uppercase transition-colors",
                  lang === l ? "bg-primary/90 text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section id="top" className="relative z-10 mx-auto max-w-6xl px-5 pb-8 pt-10 text-center sm:px-8 sm:pt-20">
        <Badge variant="online" className="mx-auto mb-6 w-fit">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {t("hero_badge")}
        </Badge>

        <h1 className="mx-auto max-w-3xl text-4xl leading-tight glow-text sm:text-6xl">
          {t("hero_title")}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
          {t("hero_sub")}
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <a href={DOWNLOAD_URL} download>
              <Download />
              {t("download_win")}
            </a>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer">
              <Github />
              {t("hero_secondary")}
            </a>
          </Button>
        </div>
        <p className="mt-4 font-accent text-xs tracking-wide text-muted-foreground">
          {t("download_sub")} · {t("hero_platform", { v: VERSION })}
        </p>

        {/* mockup band */}
        <div className="relative mx-auto mt-14 max-w-4xl">
          <div className="glass-strong rounded-3xl p-3 sm:p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {steps.map((s, i) => (
                <div key={i} className="glass flex items-center gap-3 rounded-2xl p-4 text-left">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-white [&_svg]:h-5 [&_svg]:w-5">
                    {s.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="font-accent text-[10px] tracking-widest text-muted-foreground">
                      0{i + 1}
                    </p>
                    <p className="truncate text-sm font-semibold">{t(s.t)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative z-10 mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="mb-10 text-center">
          <h2 className="text-2xl glow-text sm:text-4xl">{t("features_title")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{t("features_sub")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Card key={i} className="transition-transform hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-glow [&_svg]:h-6 [&_svg]:w-6">
                  {f.icon}
                </div>
                <h3 className="mb-1.5 text-lg font-semibold tracking-tight">{t(f.t)}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{t(f.d)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="relative z-10 mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <h2 className="mb-10 text-center text-2xl glow-text sm:text-4xl">{t("how_title")}</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={i} className="glass-panel relative p-6">
              <span className="absolute right-5 top-4 font-accent text-4xl font-bold text-primary/25">
                {i + 1}
              </span>
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary-foreground [&_svg]:h-6 [&_svg]:w-6">
                {s.icon}
              </div>
              <h3 className="mb-1.5 text-lg font-semibold tracking-tight">{t(s.t)}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{t(s.d)}</p>
            </div>
          ))}
        </div>

        {/* download CTA */}
        <div className="mt-14 flex flex-col items-center gap-4 rounded-3xl glass-strong px-6 py-10 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-glow">
            <Download className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-2xl glow-text">{t("download")}</h2>
          <p className="text-sm text-muted-foreground">{t("download_sub")}</p>
          <Button asChild size="lg">
            <a href={DOWNLOAD_URL} download>
              <Download />
              {t("download_win")}
            </a>
          </Button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-5 py-8 text-center sm:px-8">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <Wifi className="h-4 w-4 text-white" />
            </div>
            <span className="font-sans font-bold tracking-tight">REM</span>
          </div>
          <p className="text-xs text-muted-foreground">{t("footer_tag")}</p>
          <p className="font-accent text-[11px] tracking-wide text-muted-foreground/60">
            © {new Date().getFullYear()} REM · {t("footer_rights")} · {t("footer_made")}
          </p>
        </div>
      </footer>
    </div>
  );
}
