import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Lock,
  Moon,
  Power,
  Presentation,
} from "lucide-react";
import type { ClientMessage, SystemAction } from "@shared/protocol";
import { Button } from "@shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shared/ui/dialog";
import { useT, type ClientKey } from "../i18n";

type Send = (msg: ClientMessage) => void;

const TALL = "h-20 flex-col gap-1.5 [&_svg]:size-6";

export default function SystemPanel({ send }: { send: Send }) {
  const t = useT();
  // On mémorise les clefs, pas le texte : la boîte suit un changement de langue.
  const [confirm, setConfirm] = useState<null | {
    action: SystemAction;
    title: ClientKey;
    desc: ClientKey;
  }>(null);

  const ask = (action: SystemAction, title: ClientKey, desc: ClientKey) =>
    setConfirm({ action, title, desc });

  const doConfirm = () => {
    if (confirm) send({ type: "system", action: confirm.action });
    setConfirm(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-3">
        <p className="flex items-center justify-center gap-2 font-accent text-xs tracking-widest text-muted-foreground">
          <Presentation className="h-4 w-4" /> {t("presentation")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="glass"
            className={TALL}
            onClick={() => send({ type: "system", action: "slide_prev" })}
          >
            <ChevronLeft />
            {t("slide_prev")}
          </Button>
          <Button
            variant="glass"
            className={TALL}
            onClick={() => send({ type: "system", action: "slide_next" })}
          >
            <ChevronRight />
            {t("slide_next")}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-center font-accent text-xs tracking-widest text-muted-foreground">
          {t("power")}
        </p>
        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="glass"
            className={TALL}
            onClick={() => send({ type: "system", action: "lock" })}
          >
            <Lock />
            {t("lock")}
          </Button>
          <Button
            variant="glass"
            className={TALL}
            onClick={() => ask("sleep", "ask_sleep_t", "ask_sleep_d")}
          >
            <Moon />
            {t("sleep")}
          </Button>
          <Button
            variant="destructive"
            className={TALL}
            onClick={() =>
              ask("shutdown", "ask_shutdown_t", "ask_shutdown_d")
            }
          >
            <Power />
            {t("shutdown")}
          </Button>
        </div>
      </div>

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm ? t(confirm.title) : ""}</DialogTitle>
            <DialogDescription>{confirm ? t(confirm.desc) : ""}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              {t("cancel")}
            </Button>
            <Button variant="destructive" onClick={doConfirm}>
              {t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
