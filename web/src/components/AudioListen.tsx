import { useRef, useState } from "react";
import { Play, Square, Volume2, Mic } from "lucide-react";
import { Button } from "@shared/ui/button";

/**
 * Écoute en direct l'audio du PC (système ou micro) via WebSocket PCM.
 * Utilise ScriptProcessorNode (et non AudioWorklet) car le client tourne sur
 * http://<ip-lan> = contexte NON sécurisé, où AudioWorklet est indisponible.
 */
export default function AudioListen({
  src,
  token,
  available,
}: {
  src: "system" | "mic";
  token: string;
  available: boolean;
}) {
  const [on, setOn] = useState(false);
  const [err, setErr] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodeRef = useRef<ScriptProcessorNode | null>(null);
  const queueRef = useRef<Float32Array[]>([]);
  const curRef = useRef<{ buf: Float32Array; pos: number } | null>(null);

  const isMic = src === "mic";
  const title = isMic ? "Micro du PC" : "Audio du PC";
  const Icon = isMic ? Mic : Volume2;

  const stop = () => {
    setOn(false);
    wsRef.current?.close();
    wsRef.current = null;
    nodeRef.current?.disconnect();
    nodeRef.current = null;
    queueRef.current = [];
    curRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
  };

  const start = async () => {
    setErr(false);
    setOn(true);
    try {
      const Ctx: typeof AudioContext =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx({ sampleRate: 48000 });
      // ScriptProcessor : dispo en contexte non sécurisé (http LAN)
      const node = ctx.createScriptProcessor(2048, 0, 1);
      node.onaudioprocess = (e: AudioProcessingEvent) => {
        const out = e.outputBuffer.getChannelData(0);
        let i = 0;
        const q = queueRef.current;
        while (i < out.length) {
          let cur = curRef.current;
          if (!cur || cur.pos >= cur.buf.length) {
            const next = q.shift();
            if (!next) {
              while (i < out.length) out[i++] = 0; // underrun
              break;
            }
            cur = { buf: next, pos: 0 };
            curRef.current = cur;
          }
          out[i++] = cur.buf[cur.pos++];
        }
      };
      node.connect(ctx.destination);
      await ctx.resume();
      ctxRef.current = ctx;
      nodeRef.current = node;

      const proto = location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(
        `${proto}://${location.host}/audio?token=${encodeURIComponent(token)}&src=${src}`
      );
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onmessage = (ev) => {
        if (typeof ev.data === "string") return; // meta : ignoré (rate fixe 48k)
        const i16 = new Int16Array(ev.data as ArrayBuffer);
        const f32 = new Float32Array(i16.length);
        for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 32768;
        const q = queueRef.current;
        if (q.length > 60) q.shift(); // borne la latence (~2,5 s max)
        q.push(f32);
      };
      ws.onerror = () => {
        setErr(true);
        stop();
      };
      ws.onclose = () => {
        if (wsRef.current) stop();
      };
    } catch {
      setErr(true);
      stop();
    }
  };

  return (
    <div className="glass flex items-center gap-3 rounded-2xl p-3.5">
      <div
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
          on ? "bg-primary/25 text-primary-foreground" : "bg-white/[0.05] text-muted-foreground"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-sans text-sm">{title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {!available
            ? "Indisponible sur le PC"
            : err
              ? "Erreur de flux"
              : on
                ? "En écoute… 🔊"
                : "Touche pour écouter en direct"}
        </p>
      </div>
      <Button
        variant={on ? "destructive" : "glass"}
        size="sm"
        disabled={!available}
        onClick={on ? stop : start}
      >
        {on ? <Square /> : <Play />}
        {on ? "Stop" : "Écouter"}
      </Button>
    </div>
  );
}
