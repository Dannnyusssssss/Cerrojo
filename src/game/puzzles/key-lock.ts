/** Cerradura de llave: se abre usando el objeto correcto sobre su objetivo. */
import type { KeyLockDef } from '../room';

export function keyFits(def: KeyLockDef, item: string): boolean {
  return def.key === item;
}
