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

type Send = (msg: ClientMessage) => void;

const TALL = "h-20 flex-col gap-1.5 [&_svg]:size-6";

export default function SystemPanel({ send }: { send: Send }) {
  const [confirm, setConfirm] = useState<null | {
    action: SystemAction;
    title: string;
    desc: string;
  }>(null);

  const ask = (action: SystemAction, title: string, desc: string) =>
    setConfirm({ action, title, desc });

  const doConfirm = () => {
    if (confirm) send({ type: "system", action: confirm.action });
    setConfirm(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-3">
        <p className="flex items-center justify-center gap-2 font-accent text-xs tracking-widest text-muted-foreground">
          <Presentation className="h-4 w-4" /> PRÉSENTATION
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="glass"
            className={TALL}
            onClick={() => send({ type: "system", action: "slide_prev" })}
          >
            <ChevronLeft />
            Précédent
          </Button>
          <Button
            variant="glass"
            className={TALL}
            onClick={() => send({ type: "system", action: "slide_next" })}
          >
            <ChevronRight />
            Suivant
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-center font-accent text-xs tracking-widest text-muted-foreground">
          ALIMENTATION
        </p>
        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="glass"
            className={TALL}
            onClick={() => send({ type: "system", action: "lock" })}
          >
            <Lock />
            Verrouiller
          </Button>
          <Button
            variant="glass"
            className={TALL}
            onClick={() => ask("sleep", "Mettre en veille ?", "Le PC va se mettre en veille.")}
          >
            <Moon />
            Veille
          </Button>
          <Button
            variant="destructive"
            className={TALL}
            onClick={() =>
              ask("shutdown", "Éteindre le PC ?", "Le PC va s'éteindre immédiatement.")
            }
          >
            <Power />
            Éteindre
          </Button>
        </div>
      </div>

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm?.title}</DialogTitle>
            <DialogDescription>{confirm?.desc}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={doConfirm}>
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
