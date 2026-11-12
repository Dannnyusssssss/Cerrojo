/** Esquema de los parámetros de depuración de la URL (docs/DEBUG.md). */
import { DEBUG_PARAMS, INPUT_LIMITS } from '../data/config';

export interface DebugParams {
  /** Muestra el overlay de depuración. La partida queda marcada «con ayudas». */
  debug: boolean;
  /** Semilla fija; solo se acepta junto con debug=1. */
  seed: number | null;
  /** Sala con la que empezar (índice desde 0); solo junto con debug=1. */
  room: number | null;
}

const SEED_PATTERN = /^[0-9]{1,10}$/;
/** Número de sala visible (1, 2, 3…); el máximo lo decide quien llama según las salas que haya. */
const ROOM_PATTERN = /^[1-9]$/;
const MAX_SEED = 0xffffffff;

/**
 * Lee la parte de búsqueda de la URL (por ejemplo `?debug=1&seed=42&room=2`). Cualquier valor
 * fuera de la lista blanca se ignora; una búsqueda demasiado larga se ignora entera.
 */
export function parseDebugParams(search: string, roomCount: number): DebugParams {
  const none: DebugParams = { debug: false, seed: null, room: null };
  if (search.length > INPUT_LIMITS.maxSearchChars) return none;
  const params = new URLSearchParams(search);
  if (params.get(DEBUG_PARAMS.debug) !== '1') return none;
  const rawSeed = params.get(DEBUG_PARAMS.seed);
  let seed: number | null = null;
  if (rawSeed !== null && SEED_PATTERN.test(rawSeed)) {
    const value = Number(rawSeed);
    if (value <= MAX_SEED) seed = value;
  }
  const rawRoom = params.get(DEBUG_PARAMS.room);
  let room: number | null = null;
  if (rawRoom !== null && ROOM_PATTERN.test(rawRoom) && Number(rawRoom) <= roomCount) {
    room = Number(rawRoom) - 1;
  }
  return { debug: true, seed, room };
}
