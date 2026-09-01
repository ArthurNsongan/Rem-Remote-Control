// AudioWorklet : joue des trames PCM (Float32 mono) reçues via port.postMessage.
class PCMPlayer extends AudioWorkletProcessor {
  constructor() {
    super();
    this.queue = [];
    this.cur = null;
    this.pos = 0;
    this.port.onmessage = (e) => {
      // limite le buffer (~2 s à 48k) pour éviter la dérive de latence
      if (this.queue.length > 100) this.queue.shift();
      this.queue.push(e.data);
    };
  }

  process(_inputs, outputs) {
    const out = outputs[0][0];
    if (!out) return true;
    let i = 0;
    while (i < out.length) {
      if (!this.cur || this.pos >= this.cur.length) {
        this.cur = this.queue.shift() || null;
        this.pos = 0;
        if (!this.cur) {
          while (i < out.length) out[i++] = 0; // underrun -> silence
          break;
        }
      }
      out[i++] = this.cur[this.pos++];
    }
    return true;
  }
}
registerProcessor("pcm-player", PCMPlayer);
