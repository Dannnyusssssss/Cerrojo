/**
 * Motor de sonido. El contexto de audio se crea solo tras un gesto del jugador (tecla, clic o
 * toque); antes no suena nada. Todo pasa por una ganancia general y un compresor que evita
 * picos. Si el navegador no tiene WebAudio, el juego sigue en silencio.
 */
import { logError } from '../core/errors';
import type { SoundCue } from '../game/signals';
import { Ambient } from './ambient';
import { playCue } from './sfx';

/** Ganancia general con el volumen al máximo: moderada a propósito. */
const MAX_GAIN = 0.5;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambient: Ambient | null = null;
  private volume = 0.6;
  private muted = false;
  /** Ambiente pedido (sala) o null; se aplica en cuanto haya contexto. */
  private ambientRoom: number | null = null;
  private failed = false;

  /** Primer gesto del jugador: crea (o reanuda) el contexto de audio. */
  unlock(): void {
    if (this.failed) return;
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      if (typeof window.AudioContext !== 'function') {
        this.failed = true;
        return;
      }
      const ctx = new window.AudioContext();
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -20;
      compressor.knee.value = 12;
      compressor.ratio.value = 6;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;
      const master = ctx.createGain();
      master.connect(compressor).connect(ctx.destination);
      this.ctx = ctx;
      this.master = master;
      this.applyGain(true);
      this.refreshAmbient();
    } catch (error) {
      this.failed = true;
      logError('audio.init', error);
    }
  }

  /** Volumen (0 a 1) y silencio, ya validados por los ajustes. */
  setVolume(volume: number, muted: boolean): void {
    this.volume = volume;
    this.muted = muted;
    this.applyGain(false);
    this.refreshAmbient();
  }

  private get audible(): boolean {
    return !this.muted && this.volume > 0;
  }

  private applyGain(immediate: boolean): void {
    if (!this.ctx || !this.master) return;
    const target = this.audible ? this.volume * MAX_GAIN : 0;
    const gain = this.master.gain;
    if (immediate) gain.value = target;
    else gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
  }

  play(cue: SoundCue | null): void {
    if (cue === null || !this.ctx || !this.master || !this.audible) return;
    if (this.ctx.state !== 'running') return;
    playCue(this.ctx, this.master, cue);
  }

  /** Ambiente de la sala `room` mientras se juega, o ninguno con null. */
  setAmbient(room: number | null): void {
    if (room === this.ambientRoom) return;
    this.ambientRoom = room;
    this.ambient?.stop();
    this.ambient = null;
    this.refreshAmbient();
  }

  private refreshAmbient(): void {
    const wanted = this.audible ? this.ambientRoom : null;
    if (wanted === null) {
      this.ambient?.stop();
      this.ambient = null;
      return;
    }
    if (this.ambient || !this.ctx || !this.master) return;
    this.ambient = new Ambient(this.ctx, this.master, wanted);
  }
}
