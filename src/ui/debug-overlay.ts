/**
 * Overlay de depuración (FPS, llamadas de dibujo, recursos de GPU, semilla y posición).
 * Solo con ?debug=1.
 */
import { TEXTS } from '../data/texts';
import { el } from './dom';

export class DebugOverlay {
  readonly root: HTMLDivElement;
  private readonly fpsLine: HTMLDivElement;
  private readonly callsLine: HTMLDivElement;
  private readonly memoryLine: HTMLDivElement;
  private readonly seedLine: HTMLDivElement;
  private readonly poseLine: HTMLDivElement;
  private frames = 0;
  private elapsed = 0;

  constructor(seed: number) {
    this.fpsLine = el('div');
    this.callsLine = el('div');
    this.memoryLine = el('div', { className: 'debug-memory' });
    this.seedLine = el('div');
    this.poseLine = el('div', { className: 'debug-pose' });
    this.root = el('div', { className: 'debug-overlay', attrs: { 'aria-hidden': 'true' } }, [
      el('div', { text: TEXTS.debug.withAids }),
      this.fpsLine,
      this.callsLine,
      this.memoryLine,
      this.seedLine,
      this.poseLine,
    ]);
    this.setSeed(seed);
  }

  /** Semilla de la partida en curso (cambia con «Repetir»). */
  setSeed(seed: number): void {
    this.seedLine.textContent = `${TEXTS.debug.seed}: ${seed}`;
  }

  /** Posición y rumbo del jugador (para probar recorridos). */
  setPose(x: number, z: number, yaw: number, pitch: number): void {
    const deg = (r: number): string => ((r * 180) / Math.PI).toFixed(0);
    this.poseLine.textContent = TEXTS.debug.pose(x.toFixed(2), z.toFixed(2), deg(yaw), deg(pitch));
  }

  update(dt: number, drawCalls: number, gpu: { geometries: number; textures: number }): void {
    this.frames += 1;
    this.elapsed += dt;
    if (this.elapsed < 0.5) return;
    const fps = Math.round(this.frames / this.elapsed);
    this.fpsLine.textContent = `${TEXTS.debug.fps}: ${fps}`;
    this.callsLine.textContent = `${TEXTS.debug.drawCalls}: ${drawCalls}`;
    this.memoryLine.textContent = TEXTS.debug.memory(gpu.geometries, gpu.textures);
    this.frames = 0;
    this.elapsed = 0;
  }
}
