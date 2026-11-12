/**
 * Panel de ruedas: sirve a la cerradura de números (0 a 9), a los diales con aguja y a la
 * cerradura de símbolos. Cada rueda se gira con sus botones ▲ ▼ o con las flechas; Enter prueba.
 * Las posiciones se recuerdan por puzzle mientras dura la partida.
 */
import type { ShapeKey } from '../data/shapes';
import { TEXTS } from '../data/texts';
import { stepDial } from '../game/puzzles/dial';
import { button, el, setHidden } from './dom';
import { dialIcon, shapeIcon } from './icons';
import { flashRight, flashWrong, handleKey, panelShell, type PanelShell } from './panel-shell';

/** Qué muestra cada rueda. */
export type WheelFace =
  | { kind: 'digit' }
  | { kind: 'dial'; positions: number }
  | { kind: 'symbol'; symbols: readonly ShapeKey[] };

export interface WheelPanelCallbacks {
  /** Prueba la combinación; devuelve true si abre. */
  onTry(values: readonly number[]): boolean;
  onClose(): void;
  onSolved(): void;
  /** Una rueda giró (señal sonora; lo visible es el valor nuevo de la rueda). */
  onTurn(): void;
}

/** Cantidad de valores por los que pasa una rueda. */
export function faceSize(face: WheelFace): number {
  switch (face.kind) {
    case 'digit':
      return 10;
    case 'dial':
      return face.positions;
    case 'symbol':
      return face.symbols.length;
  }
}

/** Texto accesible del valor de una rueda («3», «posición 2», «estrella»). */
export function faceText(face: WheelFace, value: number): string {
  switch (face.kind) {
    case 'digit':
      return String(value);
    case 'dial':
      return TEXTS.dialPanel.position(value + 1);
    case 'symbol': {
      const shape = face.symbols[value];
      return shape === undefined ? '' : TEXTS.shapes[shape];
    }
  }
}

type WheelTexts = (typeof TEXTS)['codePanel' | 'dialPanel' | 'symbolPanel'];

function faceTexts(face: WheelFace): WheelTexts {
  if (face.kind === 'dial') return TEXTS.dialPanel;
  if (face.kind === 'symbol') return TEXTS.symbolPanel;
  return TEXTS.codePanel;
}

export class WheelPanel {
  readonly root: HTMLElement;
  private readonly shell: PanelShell;
  private readonly cb: WheelPanelCallbacks;
  private readonly memory = new Map<string, number[]>();
  private face: WheelFace = { kind: 'digit' };
  private values: number[] = [];
  private cells: HTMLDivElement[] = [];
  private solved = false;

  constructor(callbacks: WheelPanelCallbacks) {
    this.cb = callbacks;
    this.shell = panelShell(TEXTS.codePanel.title, TEXTS.codePanel.help);
    this.root = this.shell.root;
    this.shell.actions.append(
      button(
        TEXTS.codePanel.tryButton,
        () => {
          this.tryValues();
        },
        'btn btn-primary',
      ),
      button(TEXTS.codePanel.close, () => {
        this.cb.onClose();
      }),
    );
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  /** Abre el panel del puzzle `id` con `wheels` ruedas del tipo `face`. */
  open(id: string, wheels: number, face: WheelFace): void {
    this.face = face;
    const remembered = this.memory.get(id);
    this.values =
      remembered?.length === wheels ? remembered : Array.from({ length: wheels }, () => 0);
    this.memory.set(id, this.values);
    const texts = faceTexts(face);
    this.shell.title.textContent = texts.title;
    this.shell.help.textContent = texts.help;
    this.root.setAttribute('aria-label', texts.title);
    this.buildWheels();
    this.solved = false;
    this.shell.message.textContent = '';
    this.root.classList.remove('panel-wrong');
    setHidden(this.root, false);
    this.cells[0]?.focus();
  }

  close(): void {
    setHidden(this.root, true);
  }

  /** Olvida las posiciones recordadas (partida nueva). */
  reset(): void {
    this.memory.clear();
  }

  private buildWheels(): void {
    const texts = faceTexts(this.face);
    const size = faceSize(this.face);
    this.cells = this.values.map((_, i) => {
      const cell = el('div', {
        className: `wheel-value wheel-${this.face.kind}`,
        attrs: {
          role: 'spinbutton',
          tabindex: '0',
          'aria-label': texts.wheel(i + 1),
          'aria-valuemin': '0',
          'aria-valuemax': String(size - 1),
        },
      });
      cell.addEventListener('keydown', (event) => {
        handleKey(event, {
          ArrowUp: () => {
            this.turn(i, 1);
          },
          ArrowDown: () => {
            this.turn(i, -1);
          },
          ArrowLeft: () => this.cells[Math.max(0, i - 1)]?.focus(),
          ArrowRight: () => this.cells[Math.min(this.cells.length - 1, i + 1)]?.focus(),
          Enter: () => {
            this.tryValues();
          },
        });
      });
      this.paint(i, cell);
      return cell;
    });
    const wheels = this.cells.map((cell, i) => {
      const up = button(
        '▲',
        () => {
          this.turn(i, 1);
        },
        'btn wheel-btn',
      );
      const down = button(
        '▼',
        () => {
          this.turn(i, -1);
        },
        'btn wheel-btn',
      );
      up.setAttribute('aria-label', texts.up(i + 1));
      down.setAttribute('aria-label', texts.down(i + 1));
      return el('div', { className: 'wheel' }, [up, cell, down]);
    });
    this.shell.body.replaceChildren(el('div', { className: 'wheels' }, wheels));
  }

  /** Dibuja el valor de una rueda: número, aguja con su número o forma con su nombre. */
  private paint(index: number, cell: HTMLDivElement): void {
    const value = this.values[index] ?? 0;
    const text = faceText(this.face, value);
    cell.setAttribute('aria-valuenow', String(value));
    cell.setAttribute('aria-valuetext', text);
    switch (this.face.kind) {
      case 'digit':
        cell.replaceChildren(document.createTextNode(text));
        break;
      case 'dial':
        cell.replaceChildren(
          dialIcon(value, this.face.positions),
          el('span', { className: 'wheel-caption', text: String(value + 1) }),
        );
        break;
      case 'symbol': {
        const shape = this.face.symbols[value];
        cell.replaceChildren(
          ...(shape === undefined ? [] : [shapeIcon(shape, true)]),
          el('span', { className: 'wheel-caption', text }),
        );
        break;
      }
    }
  }

  private turn(index: number, delta: number): void {
    if (this.solved) return;
    this.values[index] = stepDial(this.values[index] ?? 0, delta, faceSize(this.face));
    const cell = this.cells[index];
    if (cell) this.paint(index, cell);
    this.cb.onTurn();
    this.shell.message.textContent = '';
    this.root.classList.remove('panel-wrong');
  }

  private tryValues(): void {
    if (this.solved) return;
    if (this.cb.onTry(this.values)) {
      this.solved = true;
      this.shell.message.textContent = TEXTS.codePanel.right;
      flashRight(this.root, () => {
        this.cb.onSolved();
      });
      return;
    }
    this.shell.message.textContent = faceTexts(this.face).wrong;
    flashWrong(this.root);
  }
}
