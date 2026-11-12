/**
 * Panel de huecos en DOM: elegir un bloque y después el hueco. Se maneja con clic, toque, Tab y
 * Enter. Equivocarse solo muestra un mensaje. (Las ruedas están en wheel-panel.ts y los
 * interruptores en sequence-panel.ts.)
 */
import type { ShapeKey } from '../data/shapes';
import { TEXTS } from '../data/texts';
import type { PlaceResult } from '../game/puzzles/placement';
import { button, el, setHidden } from './dom';
import { shapeIcon } from './icons';
import { panelShell, SOLVED_CLOSE_MS } from './panel-shell';

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
