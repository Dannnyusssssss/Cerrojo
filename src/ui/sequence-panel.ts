/**
 * Panel de interruptores: cada interruptor lleva una forma y un número. Los ya accionados en el
 * intento quedan bajados (borde grueso, flecha ▼ y nombre accesible, no solo color). Las luces
 * solo cuentan cuántos van accionados: no dicen si el orden es bueno, eso se sabe al accionar el
 * último. Si el orden no era el correcto, todo vuelve a su sitio y se puede repetir sin límite.
 */
import type { ShapeKey } from '../data/shapes';
import { TEXTS } from '../data/texts';
import type { PressResult } from '../game/puzzles/sequence';
import { el, setHidden } from './dom';
import { shapeIcon } from './icons';
import { flashRight, flashWrong, panelShell, type PanelShell } from './panel-shell';

export interface SequenceCallbacks {
  onPress(index: number): PressResult;
  /** Interruptores accionados en el intento en curso. */
  pressed(): readonly number[];
  onClose(): void;
  onSolved(): void;
}

export class SequencePanel {
  readonly root: HTMLElement;
  private readonly shell: PanelShell;
  private readonly cb: SequenceCallbacks;
  private switches: readonly ShapeKey[] = [];
  private lights: HTMLSpanElement[] = [];
  private buttons: HTMLButtonElement[] = [];
  private lightsLabel!: HTMLParagraphElement;
  private solved = false;

  constructor(callbacks: SequenceCallbacks) {
    this.cb = callbacks;
    this.shell = panelShell(TEXTS.objects.switchboard, TEXTS.sequencePanel.help);
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

  /** Abre el panel con el nombre del objeto (`title`) y sus interruptores. */
  open(title: string, switches: readonly ShapeKey[]): void {
    this.shell.title.textContent = title;
    this.root.setAttribute('aria-label', title);
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
    this.buttons = this.switches.map((shape, i) => {
      const b = el('button', { className: 'btn switch-btn', attrs: { type: 'button' } }, [
        shapeIcon(shape, true),
        el('span', { className: 'switch-number', text: String(i + 1) }),
      ]);
      b.addEventListener('click', () => {
        this.press(i);
      });
      return b;
    });
    this.shell.body.replaceChildren(
      el('div', { className: 'seq-lights', attrs: { 'aria-hidden': 'true' } }, this.lights),
      this.lightsLabel,
      el('div', { className: 'switches-row' }, this.buttons),
    );
    this.paint();
  }

  /** Refleja qué interruptores están bajados y cuántas luces hay encendidas. */
  private paint(): void {
    const pressed = this.cb.pressed();
    const count = this.solved ? this.switches.length : pressed.length;
    this.lights.forEach((light, i) => {
      const on = i < count;
      light.classList.toggle('seq-light-on', on);
      light.textContent = on ? '●' : '';
    });
    this.lightsLabel.textContent = TEXTS.sequencePanel.lights(count, this.switches.length);
    this.buttons.forEach((b, i) => {
      const down = pressed.includes(i);
      const shape = TEXTS.shapes[this.switches[i] ?? 'circle'];
      b.classList.toggle('switch-down', down);
      b.setAttribute('aria-pressed', String(down));
      b.setAttribute(
        'aria-label',
        down
          ? TEXTS.sequencePanel.switchDown(i + 1, shape)
          : TEXTS.sequencePanel.switchLabel(i + 1, shape),
      );
    });
  }

  private press(index: number): void {
    if (this.solved) return;
    const result = this.cb.onPress(index);
    switch (result) {
      case 'pressed':
        this.shell.message.textContent = TEXTS.sequencePanel.pressed;
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
    this.paint();
  }
}
