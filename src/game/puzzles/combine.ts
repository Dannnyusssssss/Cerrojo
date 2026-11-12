/** Combinar: dos objetos distintos del inventario se unen en uno nuevo, en cualquier orden. */
import type { CombineDef } from '../room';

export function combineMatches(def: CombineDef, a: string, b: string): boolean {
  const [x, y] = def.inputs;
  return a !== b && ((a === x && b === y) || (a === y && b === x));
}
