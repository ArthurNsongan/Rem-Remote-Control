import {
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Volume1,
} from "lucide-react";
import type { ClientMessage } from "@shared/protocol";
import { Button } from "@shared/ui/button";

type Send = (msg: ClientMessage) => void;

export default function Media({ send }: { send: Send }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="glass"
          size="icon-lg"
          onClick={() => send({ type: "media", action: "prev" })}
        >
          <SkipBack />
        </Button>
        <Button
          size="icon-lg"
          className="h-20 w-20 rounded-3xl [&_svg]:size-9"
          onClick={() => send({ type: "media", action: "play_pause" })}
        >
          <Play />
        </Button>
        <Button
          variant="glass"
          size="icon-lg"
          onClick={() => send({ type: "media", action: "next" })}
        >
          <SkipForward />
        </Button>
      </div>

      <div className="space-y-3">
        <p className="text-center font-accent text-xs tracking-widest text-muted-foreground">
          VOLUME
        </p>
        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="glass"
            size="lg"
            onClick={() => send({ type: "media", action: "vol_down" })}
          >
            <Volume1 />−
          </Button>
          <Button
            variant="glass"
            size="lg"
            onClick={() => send({ type: "media", action: "mute" })}
          >
            <VolumeX />
          </Button>
          <Button
            variant="glass"
            size="lg"
            onClick={() => send({ type: "media", action: "vol_up" })}
          >
            <Volume2 />+
          </Button>
        </div>
      </div>
    </div>
  );
}
