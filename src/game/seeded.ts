/**
 * Respuestas de una partida, derivadas de la semilla: el código de cada cerradura de ruedas y lo
 * que muestran las pistas de la sala. La misma semilla da siempre las mismas respuestas.
 */
import { Rng } from '../core/rng';
import type { ShapeKey } from '../data/shapes';
import type { ClueContent } from './puzzles/code-lock';
import type { CodeLockDef, RoomDef } from './room';

export interface RoomAnswers {
  clues: ReadonlyMap<string, ClueContent>;
  codes: ReadonlyMap<string, readonly number[]>;
}

/** Baraja una copia con Fisher-Yates usando el rng de la partida. */
function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = rng.nextInt(0, i);
    const a = copy[i] as T;
    copy[i] = copy[j] as T;
    copy[j] = a;
  }
  return copy;
}

function generateCodeLock(
  def: CodeLockDef,
  rng: Rng,
  clues: Map<string, ClueContent>,
  codes: Map<string, readonly number[]>,
): void {
  const digits = new Map<ShapeKey, number>();
  for (const { symbol, clue } of def.digitClues) {
    const digit = rng.nextInt(0, 9);
    digits.set(symbol, digit);
    clues.set(clue, { kind: 'symbolDigit', symbol, digit });
  }
  const order = shuffled(def.symbols, rng);
  clues.set(def.orderClue, { kind: 'order', symbols: order });
  codes.set(
    def.id,
    order.map((symbol) => digits.get(symbol) ?? 0),
  );
}

export function generateAnswers(room: RoomDef, seed: number): RoomAnswers {
  const rng = new Rng(seed);
  const clues = new Map<string, ClueContent>();
  const codes = new Map<string, readonly number[]>();
  for (const puzzle of room.puzzles) {
    if (puzzle.type === 'code-lock') generateCodeLock(puzzle, rng, clues, codes);
  }
  return { clues, codes };
}
