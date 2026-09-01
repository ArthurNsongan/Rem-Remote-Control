import { useState } from "react";
import {
  CornerDownLeft,
  Delete,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Send as SendIcon,
  Clipboard,
  Copy,
} from "lucide-react";
import type { ClientMessage, SpecialKey } from "@shared/protocol";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";

type Send = (msg: ClientMessage) => void;

function KeyBtn({
  k,
  label,
  icon,
  send,
}: {
  k: SpecialKey;
  label?: string;
  icon?: React.ReactNode;
  send: Send;
}) {
  return (
    <Button variant="glass" onPointerDown={() => send({ type: "key", key: k })}>
      {icon}
      {label}
    </Button>
  );
}

export default function Keyboard({ send }: { send: Send }) {
  const [text, setText] = useState("");

  const sendText = () => {
    if (text) {
      send({ type: "text", text });
      setText("");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              sendText();
            }
          }}
          placeholder="Tape du texte à envoyer…"
          autoCapitalize="off"
          autoCorrect="off"
        />
        <Button size="icon" onClick={sendText} disabled={!text} className="shrink-0">
          <SendIcon />
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <KeyBtn k="escape" label="Esc" send={send} />
        <KeyBtn k="tab" label="Tab" send={send} />
        <KeyBtn k="backspace" icon={<Delete />} send={send} />
        <KeyBtn k="enter" icon={<CornerDownLeft />} send={send} />

        <KeyBtn k="copy" label="Copier" icon={<Copy />} send={send} />
        <KeyBtn k="paste" label="Coller" icon={<Clipboard />} send={send} />
        <KeyBtn k="delete" label="Suppr" send={send} />
        <KeyBtn k="space" label="Espace" send={send} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div />
        <KeyBtn k="up" icon={<ArrowUp />} send={send} />
        <div />
        <KeyBtn k="left" icon={<ArrowLeft />} send={send} />
        <KeyBtn k="down" icon={<ArrowDown />} send={send} />
        <KeyBtn k="right" icon={<ArrowRight />} send={send} />
      </div>
    </div>
  );
}
