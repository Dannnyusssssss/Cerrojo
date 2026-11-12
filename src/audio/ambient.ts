/**
 * Ambiente suave de cada sala: ruido muy filtrado (como aire en una habitación) y un zumbido
 * grave apenas audible. Entra y sale con rampas lentas para que no haya cortes ni picos.
 */
import { noiseBuffer } from './sfx';

/** Nota grave de cada sala (estudio, taller, observatorio), en Hz. */
const ROOM_BASE = [110, 98, 82.41];
const FADE_IN = 1.5;
const FADE_OUT = 0.6;

export class Ambient {
  private readonly ctx: AudioContext;
  private readonly gain: GainNode;
  private readonly sources: AudioScheduledSourceNode[] = [];
  private readonly nodes: AudioNode[] = [];
  private stopped = false;

  constructor(ctx: AudioContext, out: AudioNode, room: number) {
    this.ctx = ctx;
    this.gain = ctx.createGain();
    this.gain.gain.value = 0.0001;
    this.gain.connect(out);

    const air = ctx.createBufferSource();
    air.buffer = noiseBuffer(ctx);
    air.loop = true;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 320;
    const airGain = ctx.createGain();
    airGain.gain.value = 0.5;
    air.connect(lowpass).connect(airGain).connect(this.gain);
    this.sources.push(air);
    this.nodes.push(lowpass, airGain);

    const base = ROOM_BASE[room] ?? 110;
    for (const detune of [-4, 5]) {
      const osc = ctx.createOscillator();
      osc.frequency.value = base;
      osc.detune.value = detune;
      const hum = ctx.createGain();
      hum.gain.value = 0.18;
      osc.connect(hum).connect(this.gain);
      this.sources.push(osc);
      this.nodes.push(hum);
    }
    for (const source of this.sources) source.start();
    const now = ctx.currentTime;
    this.gain.gain.setValueAtTime(0.0001, now);
    this.gain.gain.exponentialRampToValueAtTime(0.06, now + FADE_IN);
  }

  /** Baja el volumen y libera los nodos al terminar. */
  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    const now = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(Math.max(this.gain.gain.value, 0.0001), now);
    this.gain.gain.exponentialRampToValueAtTime(0.0001, now + FADE_OUT);
    for (const source of this.sources) {
      source.onended = (): void => {
        source.disconnect();
      };
      source.stop(now + FADE_OUT + 0.05);
    }
    window.setTimeout(
      () => {
        for (const node of this.nodes) node.disconnect();
        this.gain.disconnect();
      },
      (FADE_OUT + 0.2) * 1000,
    );
  }
}
