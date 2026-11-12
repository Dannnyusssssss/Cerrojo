/**
 * Registro de los tipos de puzzle, en un solo lugar: qué necesita cada uno para poder
 * resolverse (lo usan la validación de salas y el resolvedor).
 */
import type { PuzzleDef } from '../room';

export interface PuzzleNeeds {
  /** Objetos de inventario que hay que tener. */
  items: string[];
  /** Pistas que hay que haber visto. */
  clues: string[];
}

export const PUZZLE_TYPES = {
  'key-lock': {
    needs: (def: PuzzleDef & { type: 'key-lock' }): PuzzleNeeds => ({
      items: [def.key],
      clues: [],
    }),
  },
  'code-lock': {
    needs: (def: PuzzleDef & { type: 'code-lock' }): PuzzleNeeds => ({
      items: [],
      clues: [...def.digitClues.map((d) => d.clue), def.orderClue],
    }),
  },
  placement: {
    needs: (def: PuzzleDef & { type: 'placement' }): PuzzleNeeds => ({
      items: def.slots.map((s) => s.item),
      clues: [],
    }),
  },
} as const;

export function puzzleNeeds(def: PuzzleDef): PuzzleNeeds {
  switch (def.type) {
    case 'key-lock':
      return PUZZLE_TYPES['key-lock'].needs(def);
    case 'code-lock':
      return PUZZLE_TYPES['code-lock'].needs(def);
    case 'placement':
      return PUZZLE_TYPES.placement.needs(def);
  }
}
