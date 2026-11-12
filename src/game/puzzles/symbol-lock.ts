/**
 * Cerradura de símbolos: ruedas que pasan por formas. La respuesta se guarda como el índice de
 * la forma de cada rueda dentro de `symbols`.
 */
import type { SymbolLockDef } from '../room';
import type { KnownClue } from './clue';

/** Índices de las formas según la pista, o null si falta o nombra una forma que no está. */
export function symbolsFromClue(def: SymbolLockDef, known: KnownClue): number[] | null {
  const content = known(def.clue);
  if (content?.kind !== 'order' || content.symbols.length !== def.wheels) return null;
  const indices = content.symbols.map((symbol) => def.symbols.indexOf(symbol));
  return indices.some((i) => i < 0) ? null : indices;
}
