/** Esquema de los parámetros de depuración de la URL (docs/DEBUG.md). */
import { DEBUG_PARAMS, INPUT_LIMITS } from '../data/config';

export interface DebugParams {
  /** Muestra el overlay de depuración. La partida queda marcada «con ayudas». */
  debug: boolean;
  /** Semilla fija; solo se acepta junto con debug=1. */
  seed: number | null;
}

const SEED_PATTERN = /^[0-9]{1,10}$/;
const MAX_SEED = 0xffffffff;

/**
 * Lee la parte de búsqueda de la URL (por ejemplo `?debug=1&seed=42`). Cualquier valor
 * fuera de la lista blanca se ignora; una búsqueda demasiado larga se ignora entera.
 */
export function parseDebugParams(search: string): DebugParams {
  const none: DebugParams = { debug: false, seed: null };
  if (search.length > INPUT_LIMITS.maxSearchChars) return none;
  const params = new URLSearchParams(search);
  if (params.get(DEBUG_PARAMS.debug) !== '1') return none;
  const rawSeed = params.get(DEBUG_PARAMS.seed);
  let seed: number | null = null;
  if (rawSeed !== null && SEED_PATTERN.test(rawSeed)) {
    const value = Number(rawSeed);
    if (value <= MAX_SEED) seed = value;
  }
  return { debug: true, seed };
}
