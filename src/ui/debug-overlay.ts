/** Overlay de depuración (FPS, llamadas de dibujo, semilla). Solo con ?debug=1. */
import { TEXTS } from '../data/texts';
import { el } from './dom';

export class DebugOverlay {
  readonly root: HTMLDivElement;
  private readonly fpsLine: HTMLDivElement;
  private readonly callsLine: HTMLDivElement;
  private frames = 0;
  private elapsed = 0;

  constructor(seed: number) {
    this.fpsLine = el('div');
    this.callsLine = el('div');
    this.root = el('div', { className: 'debug-overlay', attrs: { 'aria-hidden': 'true' } }, [
      el('div', { text: TEXTS.debug.withAids }),
      this.fpsLine,
      this.callsLine,
      el('div', { text: `${TEXTS.debug.seed}: ${seed}` }),
    ]);
  }

  update(dt: number, drawCalls: number): void {
    this.frames += 1;
    this.elapsed += dt;
    if (this.elapsed < 0.5) return;
    const fps = Math.round(this.frames / this.elapsed);
    this.fpsLine.textContent = `${TEXTS.debug.fps}: ${fps}`;
    this.callsLine.textContent = `${TEXTS.debug.drawCalls}: ${drawCalls}`;
    this.frames = 0;
    this.elapsed = 0;
  }
}
