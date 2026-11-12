/**
 * Panel de interruptores: cada interruptor lleva una forma y un número. Una fila de luces
 * muestra cuántos van bien seguidos; cada luz encendida está rellena y marcada con ✓ (no solo
 * color). Equivocarse apaga las luces y se puede volver a empezar sin límite.
 */
import type { ShapeKey } from '../data/shapes';
import { TEXTS } from '../data/texts';
import type { PressResult } from '../game/puzzles/sequence';
import { el, setHidden } from './dom';
import { shapeIcon } from './icons';
import { flashRight, flashWrong, panelShell, type PanelShell } from './panel-shell';

export interface SequenceCallbacks {
  onPress(index: number): PressResult;
  /** Interruptores accionados bien seguidos. */
  progress(): number;
  onClose(): void;
  onSolved(): void;
}

export class SequencePanel {
  readonly root: HTMLElement;
  private readonly shell: PanelShell;
  private readonly cb: SequenceCallbacks;
  private switches: readonly ShapeKey[] = [];
  private lights: HTMLSpanElement[] = [];
  private lightsLabel!: HTMLParagraphElement;
  private solved = false;

  constructor(callbacks: SequenceCallbacks) {
    this.cb = callbacks;
    this.shell = panelShell(TEXTS.sequencePanel.title, TEXTS.sequencePanel.help);
    this.root = this.shell.root;
    const close = el('button', {
      className: 'btn',
      text: TEXTS.sequencePanel.close,
      attrs: { type: 'button' },
    });
    close.addEventListener('click', () => {
      this.cb.onClose();
    });
    this.shell.actions.append(close);
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  open(switches: readonly ShapeKey[]): void {
    this.switches = switches;
    this.solved = false;
    this.shell.message.textContent = '';
    this.root.classList.remove('panel-wrong');
    this.build();
    setHidden(this.root, false);
    this.root.querySelector<HTMLElement>('.switch-btn')?.focus();
  }

  close(): void {
    setHidden(this.root, true);
  }

  private build(): void {
    this.lights = this.switches.map(() => el('span', { className: 'seq-light' }));
    this.lightsLabel = el('p', { className: 'seq-count' });
    const buttons = this.switches.map((shape, i) => {
      const b = el(
        'button',
        {
          className: 'btn switch-btn',
          attrs: {
            type: 'button',
            'aria-label': TEXTS.sequencePanel.switchLabel(i + 1, TEXTS.shapes[shape]),
          },
        },
        [shapeIcon(shape, true), el('span', { className: 'switch-number', text: String(i + 1) })],
      );
      b.addEventListener('click', () => {
        this.press(i);
      });
      return b;
    });
    this.shell.body.replaceChildren(
      el('div', { className: 'seq-lights', attrs: { 'aria-hidden': 'true' } }, this.lights),
      this.lightsLabel,
      el('div', { className: 'switches-row' }, buttons),
    );
    this.paintLights();
  }

  private paintLights(): void {
    const lit = this.cb.progress();
    this.lights.forEach((light, i) => {
      const on = i < lit;
      light.classList.toggle('seq-light-on', on);
      light.textContent = on ? '✓' : '';
    });
    this.lightsLabel.textContent = TEXTS.sequencePanel.lights(lit, this.switches.length);
  }

  private press(index: number): void {
    if (this.solved) return;
    const result = this.cb.onPress(index);
    this.paintLights();
    switch (result) {
      case 'right':
        this.shell.message.textContent = TEXTS.sequencePanel.right;
        this.root.classList.remove('panel-wrong');
        break;
      case 'wrong':
        this.shell.message.textContent = TEXTS.sequencePanel.wrong;
        flashWrong(this.root);
        break;
      case 'solved':
        this.solved = true;
        this.shell.message.textContent = TEXTS.sequencePanel.solved;
        flashRight(this.root, () => {
          this.cb.onSolved();
        });
        break;
      case 'invalid':
        break;
    }
  }
}
