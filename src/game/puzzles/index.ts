/**
 * Registro de los tipos de puzzle, en un solo lugar: qué necesita cada uno para poder
 * resolverse (lo usan la validación de salas, el resolvedor y las pistas).
 */
import type { PuzzleDef } from '../room';

export interface PuzzleNeeds {
  /** Objetos de inventario que hay que tener (se gastan al resolverlo). */
  items: string[];
  /** Pistas que hay que haber visto. */
  clues: string[];
}

export function puzzleNeeds(def: PuzzleDef): PuzzleNeeds {
  switch (def.type) {
    case 'key-lock':
      return { items: [def.key], clues: [] };
    case 'code-lock':
      return { items: [], clues: [...def.digitClues.map((d) => d.clue), def.orderClue] };
    case 'placement':
      return { items: def.slots.map((s) => s.item), clues: [] };
    case 'sequence':
      return { items: [], clues: [def.orderClue] };
    case 'dial':
    case 'symbol-lock':
      return { items: [], clues: [def.clue] };
    case 'combine':
      return { items: [...def.inputs], clues: [] };
  }
}

/** Objeto de inventario que entrega un puzzle al resolverse (solo combinar), o null. */
export function puzzleResult(def: PuzzleDef): string | null {
  return def.type === 'combine' ? def.result : null;
}
