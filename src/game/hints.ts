/**
 * Pistas en tres niveles (orientación, pista concreta, solución). El juego elige el puzzle
 * disponible más próximo a resolverse según el grafo de dependencias: solo cuenta lo que el
 * jugador ya puede alcanzar sin resolver otro puzzle, y entre eso, lo que tiene más avanzado.
 */
import type { GameState } from './game-state';
import { puzzleNeeds } from './puzzles';
import { puzzleTarget, type InteractableDef, type PuzzleDef } from './room';

export const HINT_LEVELS = 3;

/**
 * Niveles de pista vistos por puzzle y total de pistas usadas. Cada nivel nuevo cuenta una vez;
 * releer un nivel ya visto no cuenta.
 */
export class HintLedger {
  private readonly levels = new Map<string, number>();
  private usedCount = 0;

  get used(): number {
    return this.usedCount;
  }

  /** Niveles ya vistos de un puzzle (0 a 3). */
  seen(puzzleId: string): number {
    return this.levels.get(puzzleId) ?? 0;
  }

  /** Siguiente nivel que se vería (1 a 3), o null si ya se vieron los tres. */
  next(puzzleId: string): number | null {
    const level = this.seen(puzzleId) + 1;
    return level <= HINT_LEVELS ? level : null;
  }

  /** Muestra el siguiente nivel y lo cuenta. Devuelve el nivel, o null si no quedaban. */
  reveal(puzzleId: string): number | null {
    const level = this.next(puzzleId);
    if (level === null) return null;
    this.levels.set(puzzleId, level);
    this.usedCount += 1;
    return level;
  }
}

/** Contenedor que se puede abrir ya: sin cerradura o con la cerradura resuelta. */
function openable(state: GameState, def: InteractableDef): boolean {
  return def.behavior === 'toggle' && (def.lock === undefined || state.isSolved(def.lock));
}

/**
 * True si el jugador puede llegar al objeto sin resolver ningún puzzle más: no recogido, ya
 * aparecido y, si está dentro de algo, ese contenedor abierto o abrible.
 */
export function canReach(state: GameState, id: string): boolean {
  const def = state.def(id);
  if (!def || state.isTaken(id)) return false;
  if (def.revealedBy !== undefined && !state.isSolved(def.revealedBy)) return false;
  if (def.insideOf === undefined) return true;
  const box = state.def(def.insideOf);
  if (!box || !canReach(state, box.id)) return false;
  return state.isOpen(box.id) || openable(state, box);
}

/** True si el objeto de inventario se tiene o se puede conseguir sin resolver otro puzzle. */
function canGetItem(state: GameState, item: string, depth = 0): boolean {
  if (state.inventory.has(item)) return true;
  if (depth > state.room.puzzles.length) return false;
  const pickup = state.room.interactables.some(
    (d) => d.behavior === 'pickup' && d.item === item && canReach(state, d.id),
  );
  if (pickup) return true;
  // Un objeto que sale de combinar otros dos cuenta si los dos se pueden conseguir.
  return state.room.puzzles.some(
    (p) =>
      p.type === 'combine' &&
      p.result === item &&
      !state.isSolved(p.id) &&
      p.inputs.every((input) => canGetItem(state, input, depth + 1)),
  );
}

/** True si la pista ya se vio o está en un objeto que se puede alcanzar. */
function canGetClue(state: GameState, clue: string): boolean {
  if (state.hasSeen(clue)) return true;
  return state.room.interactables.some(
    (d) => d.behavior === 'examine' && d.clue === clue && canReach(state, d.id),
  );
}

export interface HintCandidate {
  puzzle: PuzzleDef;
  /** Parte de lo necesario que el jugador ya tiene (0 a 1). */
  progress: number;
}

/** Lo que pide un puzzle y lo que ya tiene el jugador, o null si algo aún no se alcanza. */
function measure(state: GameState, puzzle: PuzzleDef): HintCandidate | null {
  const target = puzzleTarget(puzzle);
  if (target !== undefined && !canReach(state, target)) return null;
  const needs = puzzleNeeds(puzzle);
  let have = 0;
  let total = 0;
  const slots = puzzle.type === 'placement' ? state.placementSlots(puzzle.id) : [];
  for (const [index, item] of needs.items.entries()) {
    total += 1;
    // Una pieza ya colocada en su hueco cuenta como conseguida.
    if (slots[index] === item || state.inventory.has(item)) have += 1;
    else if (!canGetItem(state, item)) return null;
  }
  for (const clue of needs.clues) {
    total += 1;
    if (state.hasSeen(clue)) have += 1;
    else if (!canGetClue(state, clue)) return null;
  }
  return { puzzle, progress: total === 0 ? 1 : have / total };
}

/**
 * Puzzles sin resolver que el jugador puede resolver ya (todo lo que piden está a su alcance),
 * del más avanzado al menos; a igual avance, en el orden de la sala.
 */
export function hintCandidates(state: GameState): HintCandidate[] {
  const list: HintCandidate[] = [];
  for (const puzzle of state.room.puzzles) {
    if (state.isSolved(puzzle.id)) continue;
    const candidate = measure(state, puzzle);
    if (candidate) list.push(candidate);
  }
  // sort es estable: a igual avance se conserva el orden de la sala.
  return list.sort((a, b) => b.progress - a.progress);
}

/** Puzzle del que se da la pista, o null si la sala ya está resuelta. */
export function chooseHintPuzzle(state: GameState): PuzzleDef | null {
  const best = hintCandidates(state)[0];
  if (best) return best.puzzle;
  // Red de seguridad (no debería pasar en una sala válida): el primero sin resolver.
  return state.room.puzzles.find((p) => !state.isSolved(p.id)) ?? null;
}
