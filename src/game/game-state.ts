/**
 * Estado de una partida en una sala: objetos abiertos o recogidos, inventario, pistas vistas,
 * puzzles resueltos y colocaciones. Toda acción del jugador pasa por aquí. Equivocarse nunca
 * gasta ni pierde nada.
 */
import { Inventory } from './inventory';
import { codeMatches, type ClueContent } from './puzzles/code-lock';
import { keyFits } from './puzzles/key-lock';
import { emptySlots, placementComplete, placeResult, type PlaceResult } from './puzzles/placement';
import type { InteractableDef, PuzzleDef, RoomDef } from './room';
import type { RoomAnswers } from './seeded';

export const INVENTORY_CAPACITY = 8;

export type Outcome =
  | { kind: 'none' }
  | { kind: 'inspect'; id: string }
  | { kind: 'toggled'; id: string; open: boolean }
  | { kind: 'locked'; id: string }
  | { kind: 'panel'; puzzle: string }
  | { kind: 'picked'; id: string; item: string }
  | { kind: 'inventoryFull' }
  | { kind: 'wrongItem'; item: string }
  | { kind: 'unlocked'; id: string; item: string; finished: boolean };

/** Acción que se muestra junto al nombre del objeto señalado. */
export type ActionLabel = 'examine' | 'open' | 'close' | 'take' | 'use' | 'tryCode' | 'place';

export class GameState {
  readonly room: RoomDef;
  readonly answers: RoomAnswers;
  readonly inventory = new Inventory(INVENTORY_CAPACITY);
  private readonly defs = new Map<string, InteractableDef>();
  private readonly puzzles = new Map<string, PuzzleDef>();
  private readonly open = new Set<string>();
  private readonly taken = new Set<string>();
  private readonly seen = new Set<string>();
  private readonly solved = new Set<string>();
  private readonly placements = new Map<string, (string | null)[]>();
  private finishedFlag = false;
  /** Cuenta los cambios de estado (el render y la interfaz se actualizan al verlo cambiar). */
  version = 0;

  constructor(room: RoomDef, answers: RoomAnswers) {
    this.room = room;
    this.answers = answers;
    for (const def of room.interactables) this.defs.set(def.id, def);
    for (const puzzle of room.puzzles) {
      this.puzzles.set(puzzle.id, puzzle);
      if (puzzle.type === 'placement') this.placements.set(puzzle.id, emptySlots(puzzle));
    }
  }

  get finished(): boolean {
    return this.finishedFlag;
  }

  def(id: string): InteractableDef | undefined {
    return this.defs.get(id);
  }

  puzzle(id: string): PuzzleDef | undefined {
    return this.puzzles.get(id);
  }

  isOpen(id: string): boolean {
    return this.open.has(id);
  }

  isTaken(id: string): boolean {
    return this.taken.has(id);
  }

  isSolved(puzzle: string): boolean {
    return this.solved.has(puzzle);
  }

  hasSeen(clue: string): boolean {
    return this.seen.has(clue);
  }

  /** Contenido de una pista, solo si el jugador ya la ha visto. */
  seenClue(clue: string): ClueContent | undefined {
    return this.seen.has(clue) ? this.answers.clues.get(clue) : undefined;
  }

  /** Visible y alcanzable: no recogido, su contenedor abierto y su puzzle de aparición resuelto. */
  isVisible(id: string): boolean {
    const def = this.defs.get(id);
    if (!def || this.taken.has(id)) return false;
    if (def.revealedBy !== undefined && !this.solved.has(def.revealedBy)) return false;
    if (def.insideOf !== undefined) {
      return this.open.has(def.insideOf) && this.isVisible(def.insideOf);
    }
    return true;
  }

  visibleIds(): string[] {
    return this.room.interactables.filter((d) => this.isVisible(d.id)).map((d) => d.id);
  }

  /** True si el objeto tiene una cerradura de llave sin resolver (acepta objetos). */
  acceptsItems(id: string): boolean {
    const lock = this.lockOf(id);
    return lock?.type === 'key-lock' && !this.solved.has(lock.id);
  }

  actionLabel(id: string, selectedItem: string | null): ActionLabel {
    const def = this.defs.get(id);
    if (!def) return 'examine';
    if (selectedItem !== null && this.acceptsItems(id)) return 'use';
    switch (def.behavior) {
      case 'examine':
        return 'examine';
      case 'pickup':
        return 'take';
      case 'panel':
        return 'place';
      case 'toggle': {
        const lock = this.lockOf(id);
        if (lock?.type === 'code-lock' && !this.solved.has(lock.id)) return 'tryCode';
        return this.open.has(id) ? 'close' : 'open';
      }
    }
  }

  /** Interactúa con un objeto visible, con el objeto de inventario seleccionado (o ninguno). */
  interact(id: string, selectedItem: string | null): Outcome {
    const def = this.defs.get(id);
    if (!def || !this.isVisible(id)) return { kind: 'none' };
    switch (def.behavior) {
      case 'examine':
        if (def.clue !== undefined) this.markSeen(def.clue);
        return { kind: 'inspect', id };
      case 'pickup':
        return this.pickUp(def);
      case 'panel':
        return def.puzzle !== undefined ? { kind: 'panel', puzzle: def.puzzle } : { kind: 'none' };
      case 'toggle':
        return this.toggle(def, selectedItem);
    }
  }

  private markSeen(clue: string): void {
    if (!this.seen.has(clue)) {
      this.seen.add(clue);
      this.version += 1;
    }
  }

  private pickUp(def: InteractableDef): Outcome {
    if (def.item === undefined) return { kind: 'none' };
    if (!this.inventory.add(def.item)) return { kind: 'inventoryFull' };
    this.taken.add(def.id);
    this.version += 1;
    return { kind: 'picked', id: def.id, item: def.item };
  }

  private lockOf(id: string): PuzzleDef | undefined {
    const lock = this.defs.get(id)?.lock;
    return lock === undefined ? undefined : this.puzzles.get(lock);
  }

  private toggle(def: InteractableDef, selectedItem: string | null): Outcome {
    const lock = this.lockOf(def.id);
    if (lock && !this.solved.has(lock.id)) {
      if (lock.type === 'code-lock') return { kind: 'panel', puzzle: lock.id };
      if (lock.type === 'key-lock') {
        if (selectedItem === null || !this.inventory.has(selectedItem)) {
          return { kind: 'locked', id: def.id };
        }
        if (!keyFits(lock, selectedItem)) return { kind: 'wrongItem', item: selectedItem };
        this.inventory.remove(selectedItem);
        this.solve(lock);
        return {
          kind: 'unlocked',
          id: def.id,
          item: selectedItem,
          finished: this.finishedFlag,
        };
      }
      return { kind: 'locked', id: def.id };
    }
    if (this.open.has(def.id)) this.open.delete(def.id);
    else this.open.add(def.id);
    this.version += 1;
    return { kind: 'toggled', id: def.id, open: this.open.has(def.id) };
  }

  /** Resolver un puzzle abre su objetivo; el de salida termina la sala. */
  private solve(puzzle: PuzzleDef): void {
    this.solved.add(puzzle.id);
    const target = this.defs.get(puzzle.target);
    if (target?.behavior === 'toggle') this.open.add(target.id);
    if (puzzle.type === 'key-lock' && puzzle.exit === true) this.finishedFlag = true;
    this.version += 1;
  }

  /** Prueba un código en una cerradura de ruedas. Fallar no tiene consecuencias. */
  tryCode(puzzleId: string, attempt: readonly number[]): boolean {
    const puzzle = this.puzzles.get(puzzleId);
    if (puzzle?.type !== 'code-lock' || !this.isVisible(puzzle.target)) return false;
    if (this.solved.has(puzzleId)) return true;
    const answer = this.answers.codes.get(puzzleId);
    if (!answer || !codeMatches(answer, attempt)) return false;
    this.solve(puzzle);
    return true;
  }

  placementSlots(puzzleId: string): readonly (string | null)[] {
    return this.placements.get(puzzleId) ?? [];
  }

  /** Coloca un objeto del inventario en un hueco. Si no encaja, sigue en el inventario. */
  place(puzzleId: string, index: number, item: string): PlaceResult {
    const puzzle = this.puzzles.get(puzzleId);
    const slots = this.placements.get(puzzleId);
    if (puzzle?.type !== 'placement' || !slots || !this.isVisible(puzzle.target)) return 'invalid';
    if (!this.inventory.has(item)) return 'invalid';
    const result = placeResult(puzzle, slots, index, item);
    if (result !== 'placed') return result;
    slots[index] = item;
    this.inventory.remove(item);
    this.version += 1;
    if (placementComplete(puzzle, slots)) this.solve(puzzle);
    return 'placed';
  }
}
