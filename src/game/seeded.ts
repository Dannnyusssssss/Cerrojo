/**
 * Respuestas de una partida, derivadas de la semilla: la respuesta de cada puzzle con ruedas o
 * interruptores y lo que muestran las pistas de la sala. La misma semilla da siempre las mismas
 * respuestas. Cada tipo consume el rng en el orden de los puzzles de la sala, así que añadir
 * tipos nuevos no cambia las respuestas de las salas que no los usan.
 */
import { Rng } from '../core/rng';
import type { ShapeKey } from '../data/shapes';
import type { ClueContent } from './puzzles/clue';
import type { CodeLockDef, DialDef, RoomDef, SequenceDef, SymbolLockDef } from './room';

export interface RoomAnswers {
  clues: ReadonlyMap<string, ClueContent>;
  /**
   * Respuesta de cada puzzle: dígitos (code-lock), posiciones (dial), índices de las formas
   * (symbol-lock) o índices de los interruptores en orden de pulsación (sequence).
   */
  codes: ReadonlyMap<string, readonly number[]>;
}

type Clues = Map<string, ClueContent>;
type Codes = Map<string, readonly number[]>;

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

function generateCodeLock(def: CodeLockDef, rng: Rng, clues: Clues, codes: Codes): void {
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

/** Orden de pulsación: una permutación de los interruptores. */
function generateSequence(def: SequenceDef, rng: Rng, clues: Clues, codes: Codes): void {
  const order = shuffled(
    def.switches.map((_, i) => i),
    rng,
  );
  clues.set(def.orderClue, {
    kind: 'order',
    symbols: order.map((i) => def.switches[i] ?? 'circle'),
  });
  codes.set(def.id, order);
}

/** Posiciones de los diales, nunca 0 (los diales empiezan en 0 y no deben abrir solos). */
function generateDial(def: DialDef, rng: Rng, clues: Clues, codes: Codes): void {
  const positions = Array.from({ length: def.dials }, () => rng.nextInt(1, def.positions - 1));
  clues.set(def.clue, { kind: 'positions', positions });
  codes.set(def.id, positions);
}

/** Formas distintas para cada rueda, tomadas de las de la cerradura. */
function generateSymbolLock(def: SymbolLockDef, rng: Rng, clues: Clues, codes: Codes): void {
  const indices = shuffled(
    def.symbols.map((_, i) => i),
    rng,
  ).slice(0, def.wheels);
  clues.set(def.clue, { kind: 'order', symbols: indices.map((i) => def.symbols[i] ?? 'circle') });
  codes.set(def.id, indices);
}

export function generateAnswers(room: RoomDef, seed: number): RoomAnswers {
  const rng = new Rng(seed);
  const clues = new Map<string, ClueContent>();
  const codes = new Map<string, readonly number[]>();
  for (const puzzle of room.puzzles) {
    switch (puzzle.type) {
      case 'code-lock':
        generateCodeLock(puzzle, rng, clues, codes);
        break;
      case 'sequence':
        generateSequence(puzzle, rng, clues, codes);
        break;
      case 'dial':
        generateDial(puzzle, rng, clues, codes);
        break;
      case 'symbol-lock':
        generateSymbolLock(puzzle, rng, clues, codes);
        break;
      default:
        break;
    }
  }
  return { clues, codes };
}
