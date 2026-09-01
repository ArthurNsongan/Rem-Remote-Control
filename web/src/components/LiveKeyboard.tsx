import { useRef, useState } from "react";
import {
  CornerDownLeft,
  Delete,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Keyboard as KbIcon,
} from "lucide-react";
import type { ClientMessage, SpecialKey } from "@shared/protocol";
import { Button } from "@shared/ui/button";

type Send = (msg: ClientMessage) => void;

/**
 * Real-time keyboard: uses the phone's native keyboard. Every keystroke is
 * streamed to the host immediately (no "send" button). We diff the field value
 * to derive added text and required backspaces.
 */
export default function LiveKeyboard({ send }: { send: Send }) {
  const prev = useRef("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    const before = prev.current;

    // common prefix
    let p = 0;
    const max = Math.min(before.length, next.length);
    while (p < max && before[p] === next[p]) p++;

    const deletions = before.length - p;
    const additions = next.slice(p);

    for (let i = 0; i < deletions; i++) send({ type: "key", key: "backspace" });
    if (additions) {
      // newlines become Enter presses so the host receives real returns
      const parts = additions.split("\n");
      parts.forEach((part, idx) => {
        if (part) send({ type: "text", text: part });
        if (idx < parts.length - 1) send({ type: "key", key: "enter" });
      });
    }
    prev.current = next;

    // keep the buffer from growing unbounded
    if (next.length > 400) {
      prev.current = "";
      e.target.value = "";
    }
  };

  const special = (key: SpecialKey) => send({ type: "key", key });

  return (
    <div className="flex flex-col gap-3">
      <div
        className="glass relative rounded-2xl p-3"
        onClick={() => taRef.current?.focus()}
      >
        <div className="mb-2 flex items-center gap-1.5 font-sans text-xs text-muted-foreground">
          <KbIcon className="h-4 w-4" />
          <span>
            {focused
              ? "Clavier actif · tape, ça part en direct"
              : "Touche ici pour activer le clavier du téléphone"}
          </span>
          <span
            className={`ml-auto h-2 w-2 rounded-full ${
              focused ? "bg-emerald-400 shadow-[0_0_8px_rgb(52_211_153)]" : "bg-white/20"
            }`}
          />
        </div>
        <textarea
          ref={taRef}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          rows={2}
          autoCapitalize="sentences"
          autoCorrect="on"
          className="w-full resize-none rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50"
          placeholder="Écris ici… (envoyé en temps réel)"
        />
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Button variant="glass" onPointerDown={() => special("escape")}>
          Esc
        </Button>
        <Button variant="glass" onPointerDown={() => special("tab")}>
          Tab
        </Button>
        <Button variant="glass" onPointerDown={() => special("backspace")}>
          <Delete />
        </Button>
        <Button variant="glass" onPointerDown={() => special("enter")}>
          <CornerDownLeft />
        </Button>
        <div />
        <Button variant="glass" onPointerDown={() => special("up")}>
          <ArrowUp />
        </Button>
        <div />
        <Button variant="glass" onPointerDown={() => special("left")}>
          <ArrowLeft />
        </Button>
        <Button variant="glass" onPointerDown={() => special("down")}>
          <ArrowDown />
        </Button>
        <Button variant="glass" onPointerDown={() => special("right")}>
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
