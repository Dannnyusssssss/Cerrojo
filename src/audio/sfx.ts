/**
 * Efectos sintetizados con WebAudio, sin archivos: osciladores y ruido filtrado con envolventes
 * cortas y suaves (sin ataques bruscos). Cada efecto dura menos de un segundo y sus nodos se
 * desconectan al terminar.
 */
import { Rng } from '../core/rng';
import type { SoundCue } from '../game/signals';

/** Variación del sonido (ruido, punto de inicio, tono de los pasos); no afecta a la partida. */
const variation = new Rng(0x5eed);

/** Un segundo de ruido blanco por contexto, reutilizado por todos los efectos. */
const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

export function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const cached = noiseBuffers.get(ctx);
  if (cached) return cached;
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = variation.next() * 2 - 1;
  noiseBuffers.set(ctx, buffer);
  return buffer;
}

/** Envolvente: sube en 5 ms hasta `peak` y cae de forma exponencial hasta `start + dur`. */
function envelope(
  ctx: BaseAudioContext,
  out: AudioNode,
  start: number,
  dur: number,
  peak: number,
): GainNode {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(peak, start + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  gain.connect(out);
  return gain;
}

interface ToneOptions {
  freq: number;
  /** Frecuencia final (deslizamiento), si cambia. */
  to?: number;
  type?: OscillatorType;
  at?: number;
  dur: number;
  peak: number;
}

function tone(ctx: BaseAudioContext, out: AudioNode, o: ToneOptions): void {
  const start = ctx.currentTime + (o.at ?? 0);
  const osc = ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, start);
  if (o.to !== undefined) osc.frequency.exponentialRampToValueAtTime(o.to, start + o.dur);
  const gain = envelope(ctx, out, start, o.dur, o.peak);
  osc.connect(gain);
  osc.onended = (): void => {
    osc.disconnect();
    gain.disconnect();
  };
  osc.start(start);
  osc.stop(start + o.dur + 0.02);
}

interface NoiseOptions {
  filter: BiquadFilterType;
  freq: number;
  to?: number;
  q?: number;
  at?: number;
  dur: number;
  peak: number;
}

function noise(ctx: BaseAudioContext, out: AudioNode, o: NoiseOptions): void {
  const start = ctx.currentTime + (o.at ?? 0);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = o.filter;
  filter.frequency.setValueAtTime(o.freq, start);
  if (o.to !== undefined) filter.frequency.exponentialRampToValueAtTime(o.to, start + o.dur);
  filter.Q.value = o.q ?? 1;
  const gain = envelope(ctx, out, start, o.dur, o.peak);
  src.connect(filter).connect(gain);
  src.onended = (): void => {
    src.disconnect();
    filter.disconnect();
    gain.disconnect();
  };
  // Cada efecto empieza en un punto distinto del ruido para que no suene idéntico.
  src.start(start, variation.next() * 0.5);
  src.stop(start + o.dur + 0.02);
}

/** Reproduce un efecto en `out` (la salida general, con compresor). */
export function playCue(ctx: BaseAudioContext, out: AudioNode, cue: SoundCue): void {
  switch (cue) {
    case 'step':
      noise(ctx, out, {
        filter: 'lowpass',
        freq: 260 + variation.next() * 80,
        dur: 0.09,
        peak: 0.22,
      });
      break;
    case 'wheel':
      noise(ctx, out, { filter: 'bandpass', freq: 3200, q: 6, dur: 0.03, peak: 0.25 });
      tone(ctx, out, { freq: 1700, type: 'triangle', dur: 0.02, peak: 0.04 });
      break;
    case 'press':
      tone(ctx, out, { freq: 620, to: 300, type: 'triangle', dur: 0.06, peak: 0.2 });
      noise(ctx, out, { filter: 'bandpass', freq: 2000, q: 3, dur: 0.03, peak: 0.12 });
      break;
    case 'place':
      tone(ctx, out, { freq: 230, to: 160, dur: 0.14, peak: 0.3 });
      noise(ctx, out, { filter: 'lowpass', freq: 900, dur: 0.05, peak: 0.12 });
      break;
    case 'pickup':
      tone(ctx, out, { freq: 660, dur: 0.08, peak: 0.12 });
      tone(ctx, out, { freq: 880, at: 0.07, dur: 0.12, peak: 0.12 });
      break;
    case 'open':
      noise(ctx, out, { filter: 'bandpass', freq: 380, to: 900, q: 2, dur: 0.35, peak: 0.1 });
      tone(ctx, out, { freq: 150, to: 120, dur: 0.12, peak: 0.12 });
      break;
    case 'close':
      noise(ctx, out, { filter: 'lowpass', freq: 500, dur: 0.12, peak: 0.12 });
      tone(ctx, out, { freq: 120, to: 80, at: 0.04, dur: 0.14, peak: 0.25 });
      break;
    case 'mechanism':
      tone(ctx, out, { freq: 190, to: 95, type: 'triangle', dur: 0.16, peak: 0.22 });
      noise(ctx, out, { filter: 'bandpass', freq: 2500, q: 5, at: 0.06, dur: 0.03, peak: 0.15 });
      noise(ctx, out, { filter: 'bandpass', freq: 2200, q: 5, at: 0.14, dur: 0.03, peak: 0.12 });
      break;
    case 'wrong':
      // Dos notas graves y suaves: avisa sin sobresaltar.
      tone(ctx, out, { freq: 196, type: 'triangle', dur: 0.14, peak: 0.12 });
      tone(ctx, out, { freq: 165, type: 'triangle', at: 0.13, dur: 0.2, peak: 0.12 });
      break;
    case 'success':
      // Acorde mayor arpegiado (do, mi, sol) con caída larga.
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        tone(ctx, out, { freq, at: i * 0.05, dur: 0.9, peak: 0.1 });
      });
      break;
  }
}
