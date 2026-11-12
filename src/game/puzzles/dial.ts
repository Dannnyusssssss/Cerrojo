/** Diales con aguja: cada uno se orienta a una de `positions` posiciones (0 es arriba). */
import type { DialDef } from '../room';
import type { KnownClue } from './clue';

/** Gira un dial `delta` posiciones, dando la vuelta en ambos sentidos. */
export function stepDial(position: number, delta: number, positions: number): number {
  return (((position + delta) % positions) + positions) % positions;
}

/** Posiciones de los diales según la pista, o null si falta o no encaja con los diales. */
export function positionsFromClue(def: DialDef, known: KnownClue): number[] | null {
  const content = known(def.clue);
  if (content?.kind !== 'positions' || content.positions.length !== def.dials) return null;
  const valid = content.positions.every((p) => Number.isInteger(p) && p >= 0 && p < def.positions);
  return valid ? [...content.positions] : null;
}
