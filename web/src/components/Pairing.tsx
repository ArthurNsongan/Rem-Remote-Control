import { useEffect, useRef, useState } from "react";
import { Activity, ShieldCheck, Lock } from "lucide-react";
import { Button } from "@shared/ui/button";
import { pair, PairError } from "../lib/socket";
import { useT, type ClientKey } from "../i18n";

export default function Pairing({ onPaired }: { onPaired: () => void }) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const t = useT();
  // Clef + variables plutôt que du texte figé : le message suit la langue.
  const [error, setError] = useState<{ k: ClientKey; n?: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [lock, setLock] = useState(0);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  // Décompte du verrouillage anti-brute-force renvoyé par le serveur.
  useEffect(() => {
    if (lock <= 0) return;
    const id = setInterval(() => setLock((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [lock > 0]);

  const setDigit = (i: number, v: string) => {
    if (lock > 0) return;
    const c = v.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = c;
    setDigits(next);
    setError(null);
    if (c && i < 5) refs.current[i + 1]?.focus();
    if (next.every((d) => d) && next.join("").length === 6) submit(next.join(""));
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const submit = async (pin: string) => {
    if (lock > 0) return;
    setBusy(true);
    try {
      await pair(pin);
      onPaired();
    } catch (e) {
      const err = e as PairError;
      if (err.kind === "locked") {
        setLock(err.retryAfter);
        setError(null);
      } else if (err.kind === "network") {
        setError({ k: "pair_net" });
      } else if (err.remaining > 1) {
        setError({ k: "pair_bad_many", n: err.remaining });
      } else if (err.remaining === 1) {
        setError({ k: "pair_bad_one" });
      } else {
        setError({ k: "pair_bad" });
      }
      setDigits(Array(6).fill(""));
      refs.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 sm:px-6">
      <div className="pointer-events-none fixed inset-0 grid-overlay opacity-30" />
      <div className="pointer-events-none fixed -top-20 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/30 blur-[120px]" />

      <div className="relative mb-10 flex flex-col items-center gap-3">
        <div className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-primary to-accent shadow-glow-lg">
          <Activity className="h-8 w-8 text-white" />
        </div>
        <h1 className="font-display text-3xl tracking-widest glow-text">REM</h1>
        <p className="font-accent text-xs tracking-[0.3em] text-muted-foreground">
          REMOTE CONTROL
        </p>
      </div>

      <div className="glass-strong relative w-full max-w-sm rounded-3xl p-5 sm:p-7">
        <div className="mb-5 flex items-center gap-2 text-muted-foreground">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span className="font-accent text-sm tracking-wide">
            {t("pair_prompt")}
          </span>
        </div>

        <div className="flex justify-between gap-1.5 sm:gap-2">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              value={d}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              inputMode="numeric"
              maxLength={1}
              disabled={lock > 0}
              className={`aspect-square min-w-0 flex-1 rounded-xl border bg-white/[0.05] text-center font-sans text-xl font-bold backdrop-blur-xl outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/50 ${
                error ? "border-destructive animate-pulse" : "border-white/15"
              } disabled:opacity-40`}
            />
          ))}
        </div>

        {error && !lock && (
          <p className="mt-4 text-center text-sm text-destructive">
            {t(error.k, error.n === undefined ? undefined : { n: error.n })}
          </p>
        )}

        {lock > 0 && (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
            <Lock className="h-4 w-4 shrink-0" />
            <span>{t("pair_locked", { s: lock })}</span>
          </div>
        )}

        <Button
          className="mt-6 w-full"
          size="lg"
          disabled={busy || lock > 0 || digits.join("").length !== 6}
          onClick={() => submit(digits.join(""))}
        >
          {lock > 0
            ? t("pair_locked_btn", { s: lock })
            : busy
              ? t("pair_connecting")
              : t("pair_connect")}
        </Button>
      </div>
    </div>
  );
}
