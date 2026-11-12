/**
 * Capa de paneles de puzzle: abre el panel que corresponde a cada tipo y lo conecta con el
 * mundo. Cerrar (con el botón, Esc o al resolver) avisa al controlador.
 */
import { TEXTS } from '../data/texts';
import type { ItemDef, PuzzleDef } from '../game/room';
import type { World } from '../game/world';
import { el, setHidden } from './dom';
import { piecesInInventory } from './feedback';
import { PlacementPanel } from './lock-panels';
import { SequencePanel } from './sequence-panel';
import { WheelPanel } from './wheel-panel';

export class PuzzlePanels {
  readonly root: HTMLDivElement;
  private readonly wheels: WheelPanel;
  private readonly placement: PlacementPanel;
  private readonly sequence: SequencePanel;
  private readonly world: () => World;
  private readonly onClosed: () => void;
  private items: readonly ItemDef[];
  private openPuzzle: string | null = null;

  constructor(
    world: () => World,
    items: readonly ItemDef[],
    onClosed: () => void,
    onWheelTurn: () => void,
  ) {
    this.world = world;
    this.items = items;
    this.onClosed = onClosed;
    const close = (): void => {
      this.close();
    };
    this.wheels = new WheelPanel({
      onTry: (values) => this.openPuzzle !== null && this.world().tryCode(this.openPuzzle, values),
      onClose: close,
      onSolved: close,
      onTurn: onWheelTurn,
    });
    this.placement = new PlacementPanel({
      onPlace: (slot, item) => this.world().place(this.openPuzzle ?? '', slot, item),
      onClose: close,
      onSolved: close,
      pieces: () => piecesInInventory(this.world().state, this.items),
      slots: () => this.world().state.placementSlots(this.openPuzzle ?? ''),
      isSolved: () => this.world().state.isSolved(this.openPuzzle ?? ''),
    });
    this.sequence = new SequencePanel({
      onPress: (index) => this.world().pressSwitch(this.openPuzzle ?? '', index),
      pressed: () => this.world().state.pressedSwitches(this.openPuzzle ?? ''),
      onClose: close,
      onSolved: close,
    });
    this.root = el('div', { className: 'menus panel-layer' }, [
      this.wheels.root,
      this.placement.root,
      this.sequence.root,
    ]);
    setHidden(this.root, true);
  }

  get isOpen(): boolean {
    return this.openPuzzle !== null;
  }

  /** Partida nueva (quizá en otra sala): olvida las ruedas y usa los objetos de esa sala. */
  reset(items: readonly ItemDef[]): void {
    this.items = items;
    this.wheels.reset();
    this.hide();
  }

  open(puzzle: PuzzleDef, selectedItem: string | null): void {
    this.openPuzzle = puzzle.id;
    setHidden(this.root, false);
    switch (puzzle.type) {
      case 'code-lock':
        this.wheels.open(puzzle.id, puzzle.symbols.length, { kind: 'digit' });
        break;
      case 'dial':
        this.wheels.open(puzzle.id, puzzle.dials, { kind: 'dial', positions: puzzle.positions });
        break;
      case 'symbol-lock':
        this.wheels.open(puzzle.id, puzzle.wheels, { kind: 'symbol', symbols: puzzle.symbols });
        break;
      case 'placement':
        this.placement.open(
          this.targetName(puzzle.target),
          puzzle.slots.map((s) => s.shape),
          selectedItem,
        );
        break;
      case 'sequence':
        this.sequence.open(this.targetName(puzzle.target), puzzle.switches);
        break;
      case 'key-lock':
      case 'combine':
        // No tienen panel: se resuelven usando objetos.
        this.openPuzzle = null;
        setHidden(this.root, true);
        break;
    }
  }

  /** Nombre visible del objeto sobre el que está el puzzle (título del panel). */
  private targetName(target: string): string {
    const def = this.world().state.def(target);
    return def ? TEXTS.objects[def.nameKey] : TEXTS.objects.slotPanel;
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
    this.wheels.close();
    this.placement.close();
    this.sequence.close();
    setHidden(this.root, true);
  }
}
