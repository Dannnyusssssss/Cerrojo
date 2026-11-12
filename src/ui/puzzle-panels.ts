/**
 * Capa de paneles de puzzle: abre el panel que corresponde a cada tipo y lo conecta con el
 * mundo. Cerrar (con el botón, Esc o al resolver) avisa al controlador.
 */
import type { ItemDef, PuzzleDef } from '../game/room';
import type { World } from '../game/world';
import { el, setHidden } from './dom';
import { piecesInInventory } from './feedback';
import { CodeLockPanel, PlacementPanel } from './lock-panels';

export class PuzzlePanels {
  readonly root: HTMLDivElement;
  private readonly code: CodeLockPanel;
  private readonly placement: PlacementPanel;
  private readonly world: () => World;
  private readonly onClosed: () => void;
  private openPuzzle: string | null = null;

  constructor(world: () => World, items: readonly ItemDef[], onClosed: () => void) {
    this.world = world;
    this.onClosed = onClosed;
    const close = (): void => {
      this.close();
    };
    this.code = new CodeLockPanel({
      onTry: (code) => this.openPuzzle !== null && this.world().tryCode(this.openPuzzle, code),
      onClose: close,
      onSolved: close,
    });
    this.placement = new PlacementPanel({
      onPlace: (slot, item) => this.world().place(this.openPuzzle ?? '', slot, item),
      onClose: close,
      onSolved: close,
      pieces: () => piecesInInventory(this.world().state, items),
      slots: () => this.world().state.placementSlots(this.openPuzzle ?? ''),
      isSolved: () => this.world().state.isSolved(this.openPuzzle ?? ''),
    });
    this.root = el('div', { className: 'menus panel-layer' }, [
      this.code.root,
      this.placement.root,
    ]);
    setHidden(this.root, true);
  }

  get isOpen(): boolean {
    return this.openPuzzle !== null;
  }

  open(puzzle: PuzzleDef, selectedItem: string | null): void {
    this.openPuzzle = puzzle.id;
    setHidden(this.root, false);
    if (puzzle.type === 'code-lock') this.code.open(puzzle.symbols.length);
    else if (puzzle.type === 'placement') {
      this.placement.open(
        puzzle.slots.map((s) => s.shape),
        selectedItem,
      );
    }
  }

  /** Cierra el panel abierto y avisa al controlador. */
  close(): void {
    if (this.openPuzzle === null) return;
    this.hide();
    this.onClosed();
  }

  /** Cierra sin avisar (al volver al inicio o empezar otra partida). */
  hide(): void {
    this.openPuzzle = null;
    this.code.close();
    this.placement.close();
    setHidden(this.root, true);
  }
}
