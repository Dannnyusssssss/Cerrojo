/**
 * Paneles de los puzzles en DOM: cerradura de ruedas y panel de huecos. Se manejan con clic,
 * toque, Tab, flechas y Enter. Equivocarse solo muestra un mensaje.
 */
import type { ShapeKey } from '../data/shapes';
import { TEXTS } from '../data/texts';
import { stepWheel } from '../game/puzzles/code-lock';
import type { PlaceResult } from '../game/puzzles/placement';
import { button, el, setHidden } from './dom';
import { shapeIcon } from './icons';

/** Tiempo que se muestra el mensaje de acierto antes de cerrar el panel. */
export const SOLVED_CLOSE_MS = 900;

function panelShell(
  title: string,
  help: string,
): {
  root: HTMLElement;
  body: HTMLDivElement;
  message: HTMLParagraphElement;
  actions: HTMLDivElement;
} {
  const body = el('div', { className: 'panel-body' });
  const message = el('p', {
    className: 'panel-message',
    attrs: { role: 'status', 'aria-live': 'polite' },
  });
  const actions = el('div', { className: 'menu-buttons' });
  const root = el('section', { className: 'screen puzzle-panel', attrs: { 'aria-label': title } }, [
    el('h2', { className: 'screen-title', text: title }),
    el('p', { className: 'panel-help', text: help }),
    body,
    message,
    actions,
  ]);
  setHidden(root, true);
  return { root, body, message, actions };
}

export interface CodePanelCallbacks {
  /** Prueba el código; devuelve true si abre. */
  onTry(code: readonly number[]): boolean;
  onClose(): void;
  onSolved(): void;
}

export class CodeLockPanel {
  readonly root: HTMLElement;
  private readonly body: HTMLDivElement;
  private readonly message: HTMLParagraphElement;
  private readonly cb: CodePanelCallbacks;
  private digits: number[] = [];
  private values: HTMLDivElement[] = [];
  private solved = false;

  constructor(callbacks: CodePanelCallbacks) {
    this.cb = callbacks;
    const shell = panelShell(TEXTS.codePanel.title, TEXTS.codePanel.help);
    this.root = shell.root;
    this.body = shell.body;
    this.message = shell.message;
    shell.actions.append(
      button(
        TEXTS.codePanel.tryButton,
        () => {
          this.tryCode();
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

  /** Abre el panel con `wheels` ruedas. Las ruedas conservan su posición entre aperturas. */
  open(wheels: number): void {
    if (this.digits.length !== wheels) {
      this.digits = Array.from({ length: wheels }, () => 0);
      this.buildWheels();
    }
    this.solved = false;
    this.message.textContent = '';
    this.root.classList.remove('panel-wrong');
    setHidden(this.root, false);
    this.values[0]?.focus();
  }

  close(): void {
    setHidden(this.root, true);
  }

  private buildWheels(): void {
    this.values = this.digits.map((_, i) => {
      const value = el('div', {
        className: 'wheel-value',
        text: '0',
        attrs: {
          role: 'spinbutton',
          tabindex: '0',
          'aria-label': TEXTS.codePanel.wheel(i + 1),
          'aria-valuemin': '0',
          'aria-valuemax': '9',
          'aria-valuenow': '0',
        },
      });
      value.addEventListener('keydown', (event) => {
        this.onWheelKey(event, i);
      });
      return value;
    });
    const wheels = this.values.map((value, i) =>
      el('div', { className: 'wheel' }, [
        button(
          '▲',
          () => {
            this.turn(i, 1);
          },
          'btn wheel-btn',
        ),
        value,
        button(
          '▼',
          () => {
            this.turn(i, -1);
          },
          'btn wheel-btn',
        ),
      ]),
    );
    wheels.forEach((wheel, i) => {
      const [up, , down] = wheel.querySelectorAll('button');
      up?.setAttribute('aria-label', TEXTS.codePanel.up(i + 1));
      down?.setAttribute('aria-label', TEXTS.codePanel.down(i + 1));
    });
    this.body.replaceChildren(el('div', { className: 'wheels' }, wheels));
  }

  private onWheelKey(event: KeyboardEvent, index: number): void {
    const keys: Record<string, () => void> = {
      ArrowUp: () => {
        this.turn(index, 1);
      },
      ArrowDown: () => {
        this.turn(index, -1);
      },
      ArrowLeft: () => this.values[Math.max(0, index - 1)]?.focus(),
      ArrowRight: () => this.values[Math.min(this.values.length - 1, index + 1)]?.focus(),
      Enter: () => {
        this.tryCode();
      },
    };
    const action = Object.prototype.hasOwnProperty.call(keys, event.key)
      ? keys[event.key]
      : undefined;
    if (!action) return;
    event.preventDefault();
    action();
  }

  private turn(index: number, delta: number): void {
    if (this.solved) return;
    const digit = stepWheel(this.digits[index] ?? 0, delta);
    this.digits[index] = digit;
    const value = this.values[index];
    if (value) {
      value.textContent = String(digit);
      value.setAttribute('aria-valuenow', String(digit));
    }
    this.message.textContent = '';
    this.root.classList.remove('panel-wrong');
  }

  private tryCode(): void {
    if (this.solved) return;
    if (this.cb.onTry(this.digits)) {
      this.solved = true;
      this.message.textContent = TEXTS.codePanel.right;
      this.root.classList.add('panel-right');
      window.setTimeout(() => {
        this.root.classList.remove('panel-right');
        this.cb.onSolved();
      }, SOLVED_CLOSE_MS);
      return;
    }
    this.message.textContent = TEXTS.codePanel.wrong;
    // Se reinicia la clase en el siguiente frame para que la señal se repita en cada intento.
    this.root.classList.remove('panel-wrong');
    window.requestAnimationFrame(() => {
      this.root.classList.add('panel-wrong');
    });
  }
}

export interface Piece {
  id: string;
  name: string;
  shape: ShapeKey;
}

export interface PlacementCallbacks {
  onPlace(slot: number, item: string): PlaceResult;
  onClose(): void;
  onSolved(): void;
  /** Bloques que lleva el jugador ahora mismo. */
  pieces(): Piece[];
  /** Objeto de cada hueco (null si está vacío). */
  slots(): readonly (string | null)[];
  isSolved(): boolean;
}

export class PlacementPanel {
  readonly root: HTMLElement;
  private readonly body: HTMLDivElement;
  private readonly message: HTMLParagraphElement;
  private readonly cb: PlacementCallbacks;
  private shapes: readonly ShapeKey[] = [];
  private chosen: string | null = null;

  constructor(callbacks: PlacementCallbacks) {
    this.cb = callbacks;
    const shell = panelShell(TEXTS.placementPanel.title, TEXTS.placementPanel.help);
    this.root = shell.root;
    this.body = shell.body;
    this.message = shell.message;
    shell.actions.append(
      button(TEXTS.placementPanel.close, () => {
        this.cb.onClose();
      }),
    );
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  /** Abre el panel. `preselected` es el objeto en la mano, si es un bloque. */
  open(shapes: readonly ShapeKey[], preselected: string | null): void {
    this.shapes = shapes;
    this.chosen = this.cb.pieces().some((p) => p.id === preselected) ? preselected : null;
    this.message.textContent = '';
    setHidden(this.root, false);
    this.render();
    this.root.querySelector<HTMLElement>('.piece-btn, .slot-btn')?.focus();
  }

  close(): void {
    setHidden(this.root, true);
  }

  private render(): void {
    const slots = this.cb.slots();
    const pieces = this.cb.pieces();
    const pieceById = new Map(pieces.map((p) => [p.id, p]));
    const slotButtons = this.shapes.map((shape, i) => {
      const filled = slots[i] !== null && slots[i] !== undefined;
      const shapeName = TEXTS.shapes[shape];
      const b = el(
        'button',
        {
          className: filled ? 'btn slot-btn slot-filled' : 'btn slot-btn',
          attrs: {
            type: 'button',
            'aria-label': filled
              ? TEXTS.placementPanel.filled(i + 1, shapeName)
              : TEXTS.placementPanel.slot(i + 1, shapeName),
          },
        },
        [shapeIcon(shape, filled)],
      );
      if (filled) b.setAttribute('aria-disabled', 'true');
      b.addEventListener('click', () => {
        this.placeIn(i);
      });
      return b;
    });
    const pieceButtons = pieces.map((piece) => {
      const isChosen = piece.id === this.chosen;
      const b = el(
        'button',
        {
          className: isChosen ? 'btn piece-btn piece-chosen' : 'btn piece-btn',
          attrs: { type: 'button', 'aria-pressed': String(isChosen) },
        },
        [shapeIcon(piece.shape, true), el('span', { text: piece.name })],
      );
      b.addEventListener('click', () => {
        this.chosen = isChosen ? null : piece.id;
        this.message.textContent = '';
        this.render();
        this.root.querySelector<HTMLElement>('.piece-chosen')?.focus();
      });
      return b;
    });
    if (this.chosen !== null && !pieceById.has(this.chosen)) this.chosen = null;
    this.body.replaceChildren(
      el('div', { className: 'slots-row' }, slotButtons),
      el('h3', { className: 'pieces-title', text: TEXTS.placementPanel.pieces }),
      pieceButtons.length > 0
        ? el('div', { className: 'pieces-row' }, pieceButtons)
        : el('p', { className: 'panel-help', text: TEXTS.placementPanel.noPieces }),
    );
  }

  private placeIn(slot: number): void {
    if (this.cb.isSolved()) return;
    if (this.chosen === null) {
      this.message.textContent = TEXTS.placementPanel.chooseFirst;
      return;
    }
    const result = this.cb.onPlace(slot, this.chosen);
    if (result === 'placed') {
      this.chosen = null;
      this.render();
      if (this.cb.isSolved()) {
        this.message.textContent = TEXTS.placementPanel.solved;
        window.setTimeout(() => {
          this.cb.onSolved();
        }, SOLVED_CLOSE_MS);
      } else {
        this.message.textContent = TEXTS.placementPanel.placed;
        this.root.querySelector<HTMLElement>('.piece-btn, .slot-btn')?.focus();
      }
    } else if (result === 'wrong') {
      this.message.textContent = TEXTS.placementPanel.wrong;
    }
  }
}
